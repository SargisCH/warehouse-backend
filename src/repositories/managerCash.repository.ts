import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { fromMinor, toMinor, today } from 'src/shared/helpers/money';

type CashEntry = {
  id: string;
  managerId: number;
  kind: 'OPENING' | 'RECEIPT';
  documentDate?: string;
  amount: string;
  note?: string;
};

function cashMovements(tenantId: number, managerId?: number) {
  return sql`
    WITH cash_managers AS (
      SELECT id, code, name, cash_tracking_started_at
      FROM managers
      WHERE tenant_id = ${tenantId}
        ${managerId === undefined ? sql`` : sql`AND id = ${managerId}`}
    ), movements AS (
      SELECT s.manager_id, s.document_date, s.paid_amount AS amount
      FROM sales s JOIN cash_managers m ON m.id = s.manager_id
      WHERE s.tenant_id = ${tenantId} AND NOT s.is_return
        AND s.cash_collected_by_manager AND s.paid_amount > 0
        AND s.created_at >= m.cash_tracking_started_at
      UNION ALL
      SELECT p.manager_id, p.document_date,
        CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END
      FROM payments p JOIN cash_managers m ON m.id = p.manager_id
      WHERE p.tenant_id = ${tenantId} AND p.payment_type = 'CASH'
        AND p.kind IN ('IN', 'REFUND')
        AND p.created_at >= m.cash_tracking_started_at
        AND p.document_date >= (m.cash_tracking_started_at AT TIME ZONE 'UTC')::date
      UNION ALL
      SELECT e.manager_id, e.document_date,
        CASE WHEN e.kind = 'RECEIPT' THEN -e.amount ELSE e.amount END
      FROM manager_cash_entries e JOIN cash_managers m ON m.id = e.manager_id
    )
  `;
}

// Cash sources may be corrected only while the recorded handovers remain covered.
export async function assertCashHandoversCovered(
  tx: NodePgDatabase<typeof schema>,
  tenantId: number,
  managerId: number,
  documentDate: string,
) {
  const { rows } = await tx.execute(sql`
    ${cashMovements(tenantId, managerId)}
    , daily AS (
      SELECT document_date, sum(amount) AS change
      FROM movements GROUP BY document_date
    ), running AS (
      SELECT document_date, sum(change) OVER (ORDER BY document_date) AS balance
      FROM daily
    )
    SELECT 1 FROM running r
    WHERE r.balance < 0 AND r.document_date >= ${documentDate}::date
      AND EXISTS (
        SELECT 1 FROM manager_cash_entries e
        WHERE e.manager_id = ${managerId} AND e.kind = 'RECEIPT'
          AND e.document_date = r.document_date
      )
    LIMIT 1
  `);
  if (rows.length) {
    throw new ConflictException(
      'This cash collection has already been handed over',
    );
  }
}

export async function lockManagerCash(
  tx: NodePgDatabase<typeof schema>,
  tenantId: number,
  managerId: number,
) {
  const { managers: m } = schema;
  const [manager] = await tx
    .select({ startedAt: m.cashTrackingStartedAt })
    .from(m)
    .where(and(eq(m.id, managerId), eq(m.tenantId, tenantId)))
    .for('update');
  return manager;
}

@Injectable()
export class ManagerCashRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async balances(tenantId: number, date: string) {
    const { rows } = await this.db.execute(sql`
      ${cashMovements(tenantId)}
      SELECT m.id AS "managerId", m.code AS "managerCode", m.name AS "managerName",
        coalesce(sum(v.amount), 0)::numeric(30,2) AS balance
      FROM cash_managers m
      LEFT JOIN movements v ON v.manager_id = m.id AND v.document_date <= ${date}::date
      WHERE (m.cash_tracking_started_at AT TIME ZONE 'UTC')::date <= ${date}::date
      GROUP BY m.id, m.code, m.name
      ORDER BY m.code
    `);
    return rows;
  }

  async history(tenantId: number) {
    const { managerCashEntries: e, managers: m } = schema;
    return this.db
      .select({
        id: e.id,
        managerId: e.managerId,
        managerCode: m.code,
        managerName: m.name,
        kind: e.kind,
        documentDate: e.documentDate,
        amount: e.amount,
        note: e.note,
      })
      .from(e)
      .innerJoin(m, eq(m.id, e.managerId))
      .where(eq(m.tenantId, tenantId))
      .orderBy(desc(e.documentDate), desc(e.createdAt), desc(e.id));
  }

  async create(tenantId: number, actorId: string, entry: CashEntry) {
    const { managerCashEntries: e } = schema;
    const amount = fromMinor(toMinor(entry.amount));
    const note = entry.note?.trim() || null;

    return this.db.transaction(async (tx) => {
      // Serialize opening and handover writes per manager, including retries.
      const manager = await lockManagerCash(tx, tenantId, entry.managerId);
      if (!manager) throw new NotFoundException('MANAGER_NOT_FOUND');

      const start = manager.startedAt.toISOString().slice(0, 10);
      const documentDate =
        entry.kind === 'OPENING' ? start : entry.documentDate;
      if (!documentDate || documentDate < start || documentDate > today()) {
        throw new BadRequestException('INVALID_CASH_DATE');
      }

      const [previous] = await tx
        .select()
        .from(e)
        .where(and(eq(e.id, entry.id), eq(e.managerId, entry.managerId)));
      if (previous) {
        if (
          previous.kind === entry.kind &&
          previous.amount === amount &&
          previous.note === note &&
          previous.documentDate === documentDate
        ) {
          return previous;
        }
        throw new ConflictException('CASH_REQUEST_CONFLICT');
      }

      if (entry.kind === 'OPENING') {
        const [priorEntry] = await tx
          .select({ id: e.id })
          .from(e)
          .where(eq(e.managerId, entry.managerId))
          .limit(1);
        if (priorEntry) throw new ConflictException('OPENING_ALREADY_CLOSED');
      } else {
        if (toMinor(amount) <= 0n) {
          throw new BadRequestException('INVALID_CASH_AMOUNT');
        }
        // A backdated receipt must also fit every subsequent trading day's balance.
        const { rows } = await tx.execute<{ available: string }>(sql`
          ${cashMovements(tenantId, entry.managerId)}
          , daily AS (
            SELECT greatest(document_date, ${documentDate}::date) AS day,
              sum(amount) AS change
            FROM movements
            WHERE document_date <= ${today()}::date
            GROUP BY 1
            UNION ALL SELECT ${documentDate}::date, 0
          ), running AS (
            SELECT sum(sum(change)) OVER (ORDER BY day) AS balance
            FROM daily GROUP BY day
          )
          SELECT min(balance)::text AS available FROM running
        `);
        if (toMinor(amount) > toMinor(rows[0].available)) {
          throw new BadRequestException('INSUFFICIENT_MANAGER_CASH');
        }
      }

      const [created] = await tx
        .insert(e)
        .values({
          id: entry.id,
          managerId: entry.managerId,
          kind: entry.kind,
          documentDate,
          amount,
          note,
          createdBy: actorId,
        })
        .onConflictDoNothing()
        .returning();
      if (!created) throw new ConflictException('CASH_REQUEST_CONFLICT');
      return created;
    });
  }
}
