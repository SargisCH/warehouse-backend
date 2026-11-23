import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { fromMinor, toMinor, today } from 'src/shared/helpers/money';
import {
  AssetEntryDto,
  CompanyCashEntryDto,
  CreateAssetDto,
} from './companyAssets.dto';

const {
  companyAssets: assets,
  companyAssetEntries: entries,
  tenant: tenants,
  companyCashEntries: cashEntries,
} = schema;

@Injectable()
export class CompanyAssetsService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  list(tenantId: number) {
    return this.db
      .select({
        id: assets.id,
        name: assets.name,
        condition: assets.condition,
        acquiredOn: assets.acquiredOn,
        purchasePrice: assets.purchasePrice,
        sold: sql<boolean>`exists (
        select 1 from ${entries} where ${entries.assetId} = ${assets.id} and ${entries.kind} = 'SALE'
      )`,
      })
      .from(assets)
      .where(eq(assets.tenantId, tenantId))
      .orderBy(desc(assets.acquiredOn), desc(assets.createdAt));
  }

  async details(tenantId: number, assetId: string) {
    const asset = await this.getAsset(this.db, tenantId, assetId);
    const history = await this.db
      .select()
      .from(entries)
      .where(eq(entries.assetId, assetId))
      .orderBy(desc(entries.documentDate), desc(entries.createdAt));
    const totalSpent = history.reduce(
      (sum, entry) =>
        entry.kind === 'REPAIR' ? sum + toMinor(entry.amount) : sum,
      toMinor(asset.purchasePrice),
    );
    return { ...asset, history, totalSpent: fromMinor(totalSpent) };
  }

  async create(tenantId: number, userId: string, dto: CreateAssetDto) {
    await this.validateDate(tenantId, dto.date, dto.affectsCash);
    const amount = fromMinor(toMinor(dto.amount));
    const description = dto.description?.trim() || null;
    const name = dto.name.trim();
    const [asset] = await this.db
      .insert(assets)
      .values({
        id: dto.id,
        tenantId,
        name,
        description,
        condition: dto.condition,
        acquiredOn: dto.date,
        purchasePrice: amount,
        paidFromCash: dto.affectsCash,
        createdBy: userId,
      })
      .onConflictDoNothing()
      .returning();
    if (asset) return asset;

    const [previous] = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.id, dto.id), eq(assets.tenantId, tenantId)));
    if (
      previous &&
      previous.name === name &&
      previous.description === description &&
      previous.condition === dto.condition &&
      previous.acquiredOn === dto.date &&
      previous.purchasePrice === amount &&
      previous.paidFromCash === dto.affectsCash
    ) {
      return previous;
    }
    throw new ConflictException('ASSET_REQUEST_CONFLICT');
  }

  async addEntry(
    tenantId: number,
    userId: string,
    assetId: string,
    dto: AssetEntryDto,
  ) {
    const minor = toMinor(dto.amount);
    if (minor <= 0n) throw new BadRequestException('ASSET_INVALID_AMOUNT');
    const amount = fromMinor(minor);
    const description = dto.description.trim();
    await this.validateDate(tenantId, dto.date, dto.affectsCash);

    return this.db.transaction(async (tx) => {
      const asset = await this.getAsset(tx, tenantId, assetId, true);
      if (dto.date < asset.acquiredOn)
        throw new BadRequestException('ASSET_INVALID_DATE');
      const [previous] = await tx
        .select()
        .from(entries)
        .where(and(eq(entries.id, dto.id), eq(entries.assetId, assetId)));
      if (previous) {
        if (
          previous.kind === dto.kind &&
          previous.amount === amount &&
          previous.description === description &&
          previous.documentDate === dto.date &&
          previous.affectsCash === dto.affectsCash
        )
          return previous;
        throw new ConflictException('ASSET_REQUEST_CONFLICT');
      }

      // Locking the asset serializes repairs, refunds and disposal.
      const [sale] = await tx
        .select({ id: entries.id })
        .from(entries)
        .where(and(eq(entries.assetId, assetId), eq(entries.kind, 'SALE')));
      if (sale) throw new ConflictException('ASSET_ALREADY_SOLD');
      if (dto.kind === 'SALE') {
        const [laterEntry] = await tx
          .select({ id: entries.id })
          .from(entries)
          .where(
            and(
              eq(entries.assetId, assetId),
              sql`${entries.documentDate} > ${dto.date}`,
            ),
          )
          .limit(1);
        if (laterEntry) throw new BadRequestException('ASSET_INVALID_DATE');
      }

      const [entry] = await tx
        .insert(entries)
        .values({
          id: dto.id,
          assetId,
          kind: dto.kind,
          description,
          documentDate: dto.date,
          amount,
          affectsCash: dto.affectsCash,
          createdBy: userId,
        })
        .onConflictDoNothing()
        .returning();
      if (!entry) throw new ConflictException('ASSET_REQUEST_CONFLICT');
      return entry;
    });
  }

  private async getAsset(
    db: NodePgDatabase<typeof schema>,
    tenantId: number,
    id: string,
    lock = false,
  ) {
    const query = db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)));
    const [asset] = await (lock ? query.for('update') : query);
    if (!asset) throw new NotFoundException('ASSET_NOT_FOUND');
    return asset;
  }

  private cashMovements(tenantId: number, date: string) {
    // Manager collections enter company cash when handed over.
    return sql`
      WITH company AS (
        SELECT id, company_cash_started_at AS started_at, company_cash_opening AS opening,
          (company_cash_started_at AT TIME ZONE 'UTC')::date AS start_date
        FROM tenants WHERE id = ${tenantId}
      ), movements AS (
        SELECT r.amount, r.document_date, r.created_at, 'MANAGER_RECEIPT'::text AS kind,
          r.id::text AS id, NULL::text AS description, r.note AS comment,
          NULL::uuid AS return_of, false AS returned
        FROM manager_cash_entries r JOIN managers m ON m.id = r.manager_id
        JOIN company c ON c.id = m.tenant_id
        WHERE r.kind = 'RECEIPT' AND r.created_at >= c.started_at
        UNION ALL
        SELECT s.paid_amount, s.document_date, s.created_at, 'SALE', s.id::text, s.code, s.note, NULL, false
        FROM sales s JOIN company c ON c.id = s.tenant_id
        WHERE s.payment_type = 'CASH' AND NOT s.cash_collected_by_manager AND NOT s.is_return
          AND s.created_at >= c.started_at
        UNION ALL
        SELECT CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END,
          p.document_date, p.created_at, CASE WHEN p.kind = 'REFUND' THEN 'PAYMENT_REFUND' ELSE 'PAYMENT' END,
          p.id::text, p.code, p.note, NULL, false
        FROM payments p JOIN company c ON c.id = p.tenant_id
        WHERE p.payment_type = 'CASH' AND p.manager_id IS NULL AND p.kind IN ('IN', 'REFUND')
          AND p.created_at >= c.started_at
        UNION ALL
        SELECT -a.purchase_price, a.acquired_on, a.created_at, 'ASSET_PURCHASE', a.id::text, a.name, a.description, NULL, false
        FROM company_assets a JOIN company c ON c.id = a.tenant_id
        WHERE a.paid_from_cash
        UNION ALL
        SELECT CASE WHEN e.kind = 'REPAIR' THEN -e.amount ELSE e.amount END,
          e.document_date, e.created_at, 'ASSET_' || e.kind, e.id::text, e.description, NULL, NULL, false
        FROM company_asset_entries e JOIN company_assets a ON a.id = e.asset_id
        JOIN company c ON c.id = a.tenant_id
        WHERE e.affects_cash
        UNION ALL
        SELECT CASE WHEN e.return_of IS NULL THEN -e.amount ELSE e.amount END,
          e.document_date, e.created_at,
          CASE WHEN e.return_of IS NULL THEN 'WITHDRAWAL' ELSE 'RETURN' END,
          e.id::text, e.description, e.comment, e.return_of,
          EXISTS (
            SELECT 1 FROM company_cash_entries r
            WHERE r.return_of = e.id AND r.tenant_id = e.tenant_id
          )
        FROM company_cash_entries e JOIN company c ON c.id = e.tenant_id
      ), current_movements AS (
        SELECT m.* FROM movements m CROSS JOIN company c
        WHERE m.document_date BETWEEN c.start_date AND ${date}::date
      )
    `;
  }

  async cashHistory(tenantId: number) {
    const { rows } = await this.db.execute(sql`
      ${this.cashMovements(tenantId, today())}
      SELECT id, kind, document_date::text AS "documentDate", amount::text AS amount,
        description, comment, return_of AS "returnOf", returned
      FROM current_movements
      WHERE amount <> 0
      ORDER BY document_date DESC, created_at DESC, kind, id
    `);
    return rows;
  }

  async cashBalance(tenantId: number, db = this.db, date = today()) {
    const { rows } = await db.execute<{
      trackingDate: string;
      opening: string | null;
      balance: string;
    }>(sql`
      ${this.cashMovements(tenantId, date)}
      SELECT c.start_date::text AS "trackingDate", c.opening::text AS opening,
        (coalesce(c.opening, 0) + coalesce((
          SELECT sum(amount) FROM current_movements
        ), 0))::numeric(30,2)::text AS balance
      FROM company c
    `);
    if (!rows[0]) throw new NotFoundException('COMPANY_NOT_FOUND');
    return rows[0];
  }

  async addCashEntry(
    tenantId: number,
    userId: string,
    dto: CompanyCashEntryDto,
  ) {
    const minor = toMinor(dto.amount);
    if (minor <= 0n) throw new BadRequestException('ASSET_INVALID_AMOUNT');
    const amount = fromMinor(minor);
    const description = dto.description.trim();
    const comment = dto.comment.trim();
    const returnOf = dto.returnOf ?? null;

    return this.db.transaction(async (tx) => {
      // Serialize manual movements for the same company, including repeated requests.
      const [company] = await tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for('no key update');
      if (!company) throw new NotFoundException('COMPANY_NOT_FOUND');

      const [previous] = await tx
        .select()
        .from(cashEntries)
        .where(
          and(eq(cashEntries.tenantId, tenantId), eq(cashEntries.id, dto.id)),
        );
      if (previous) {
        if (
          previous.amount === amount &&
          previous.description === description &&
          previous.comment === comment &&
          previous.returnOf === returnOf
        )
          return previous;
        throw new ConflictException('COMPANY_CASH_REQUEST_CONFLICT');
      }

      const date = today();
      if (returnOf) {
        const [original] = await tx
          .select()
          .from(cashEntries)
          .where(
            and(
              eq(cashEntries.tenantId, tenantId),
              eq(cashEntries.id, returnOf),
              isNull(cashEntries.returnOf),
            ),
          );
        if (!original)
          throw new NotFoundException('COMPANY_CASH_WITHDRAWAL_NOT_FOUND');
        if (original.amount !== amount) {
          throw new BadRequestException('ASSET_INVALID_AMOUNT');
        }
      } else {
        const cash = await this.cashBalance(tenantId, tx, date);
        if (minor > toMinor(cash.balance)) {
          throw new BadRequestException('COMPANY_CASH_INSUFFICIENT');
        }
      }

      const [entry] = await tx
        .insert(cashEntries)
        .values({
          id: dto.id,
          tenantId,
          documentDate: date,
          amount,
          description,
          comment,
          returnOf,
          createdBy: userId,
        })
        .onConflictDoNothing()
        .returning();
      if (!entry) {
        throw new ConflictException(
          returnOf
            ? 'COMPANY_CASH_RETURN_CONFLICT'
            : 'COMPANY_CASH_REQUEST_CONFLICT',
        );
      }
      return entry;
    });
  }

  async setOpening(tenantId: number, value: string) {
    const amount = fromMinor(toMinor(value));
    const [updated] = await this.db
      .update(tenants)
      .set({ companyCashOpening: amount })
      .where(and(eq(tenants.id, tenantId), isNull(tenants.companyCashOpening)))
      .returning({ id: tenants.id });
    const balance = await this.cashBalance(tenantId);
    if (!updated && balance.opening !== amount)
      throw new ConflictException('ASSET_OPENING_ALREADY_SET');
    return balance;
  }

  private async validateDate(
    tenantId: number,
    date: string,
    affectsCash: boolean,
  ) {
    const [company] = await this.db
      .select({ start: tenants.companyCashStartedAt })
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    if (!company) throw new NotFoundException('COMPANY_NOT_FOUND');
    if (
      date > today() ||
      (affectsCash && date < company.start.toISOString().slice(0, 10))
    ) {
      throw new BadRequestException('ASSET_INVALID_DATE');
    }
  }
}
