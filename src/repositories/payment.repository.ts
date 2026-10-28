import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import {
  Payment,
  PaymentInsert,
  Repayment,
  RepaymentInsert,
} from 'src/drizzle/schema';
import { and, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { nextDocumentCode } from 'src/shared/helpers/document-code';

type Executor = NodePgDatabase<typeof schema>;

/** «Վճարումներ» / «Վճարումներ գնորդին» / «Մարումներ» list filters. */
export type MoneyListOptions = {
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  managerId?: number;
  salesZoneId?: number;
  clientId?: number;
  // «Գնորդի խումբ»
  clientGroupId?: number;
  kind?: string;
  // «Մարման աղբյուր»
  source?: string;
};

export type PaymentRow = Payment & {
  managerCode: string | null;
  managerName: string | null;
  clientCode: string | null;
  clientName: string | null;
  clientGroupName: string | null;
  salesZoneName: string | null;
};

export type RepaymentRow = Repayment & {
  clientCode: string | null;
  clientName: string | null;
  clientGroupName: string | null;
};

@Injectable()
export class PaymentRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private paymentQuery(executor: Executor = this.db) {
    return executor
      .select({
        id: schema.payments.id,
        code: schema.payments.code,
        kind: schema.payments.kind,
        documentDate: schema.payments.documentDate,
        managerId: schema.payments.managerId,
        salesZoneId: schema.payments.salesZoneId,
        clientId: schema.payments.clientId,
        paymentType: schema.payments.paymentType,
        amount: schema.payments.amount,
        note: schema.payments.note,
        externalStatus: schema.payments.externalStatus,
        tenantId: schema.payments.tenantId,
        createdAt: schema.payments.createdAt,
        updatedAt: schema.payments.updatedAt,
        managerCode: schema.managers.code,
        managerName: schema.managers.name,
        clientCode: schema.clients.code,
        clientName: schema.clients.name,
        clientGroupName: schema.clientGroups.name,
        salesZoneName: schema.salesZones.name,
      })
      .from(schema.payments)
      .leftJoin(
        schema.managers,
        eq(schema.payments.managerId, schema.managers.id),
      )
      .leftJoin(schema.clients, eq(schema.payments.clientId, schema.clients.id))
      .leftJoin(
        schema.clientGroups,
        eq(schema.clients.clientGroupId, schema.clientGroups.id),
      )
      .leftJoin(
        schema.salesZones,
        eq(schema.payments.salesZoneId, schema.salesZones.id),
      );
  }

  async findPayments(
    tenantId: number,
    options: MoneyListOptions,
  ): Promise<PaymentRow[]> {
    const {
      searchTerm,
      dateFrom,
      dateTo,
      managerId,
      salesZoneId,
      clientId,
      clientGroupId,
      kind,
    } = options;
    return this.paymentQuery()
      .where(
        and(
          eq(schema.payments.tenantId, tenantId),
          kind ? eq(schema.payments.kind, kind) : undefined,
          dateFrom ? gte(schema.payments.documentDate, dateFrom) : undefined,
          dateTo ? lte(schema.payments.documentDate, dateTo) : undefined,
          managerId ? eq(schema.payments.managerId, managerId) : undefined,
          salesZoneId
            ? eq(schema.payments.salesZoneId, salesZoneId)
            : undefined,
          clientId ? eq(schema.payments.clientId, clientId) : undefined,
          clientGroupId
            ? eq(schema.clients.clientGroupId, clientGroupId)
            : undefined,
          searchTerm
            ? or(
                ilike(schema.payments.code, `%${searchTerm}%`),
                ilike(schema.clients.name, `%${searchTerm}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(schema.payments.documentDate), desc(schema.payments.id));
  }

  async findPayment(id: number, tx?: Executor): Promise<PaymentRow> {
    const rows = await this.paymentQuery(tx).where(eq(schema.payments.id, id));
    return rows[0];
  }

  nextPaymentCode(tenantId: number, tx?: Executor) {
    return nextDocumentCode(
      tx ?? this.db,
      schema.payments,
      schema.payments.code,
      schema.payments.tenantId,
      tenantId,
    );
  }

  async insertPayment(data: PaymentInsert, tx: Executor): Promise<Payment> {
    const rows = await tx.insert(schema.payments).values(data).returning();
    return rows[0];
  }

  async deletePayment(id: number, tx: Executor): Promise<void> {
    await tx.delete(schema.payments).where(eq(schema.payments.id, id));
  }

  async findRepayments(
    tenantId: number,
    options: MoneyListOptions,
  ): Promise<RepaymentRow[]> {
    const { searchTerm, dateFrom, dateTo, clientId, clientGroupId, source } =
      options;
    return this.repaymentQuery()
      .where(
        and(
          eq(schema.repayments.tenantId, tenantId),
          dateFrom ? gte(schema.repayments.documentDate, dateFrom) : undefined,
          dateTo ? lte(schema.repayments.documentDate, dateTo) : undefined,
          clientId ? eq(schema.repayments.clientId, clientId) : undefined,
          clientGroupId
            ? eq(schema.clients.clientGroupId, clientGroupId)
            : undefined,
          source ? eq(schema.repayments.source, source) : undefined,
          searchTerm
            ? or(
                ilike(schema.repayments.code, `%${searchTerm}%`),
                ilike(schema.clients.name, `%${searchTerm}%`),
              )
            : undefined,
        ),
      )
      .orderBy(
        desc(schema.repayments.documentDate),
        desc(schema.repayments.id),
      );
  }

  private repaymentQuery(executor: Executor = this.db) {
    return executor
      .select({
        id: schema.repayments.id,
        code: schema.repayments.code,
        documentDate: schema.repayments.documentDate,
        clientId: schema.repayments.clientId,
        source: schema.repayments.source,
        amount: schema.repayments.amount,
        note: schema.repayments.note,
        tenantId: schema.repayments.tenantId,
        createdAt: schema.repayments.createdAt,
        updatedAt: schema.repayments.updatedAt,
        clientCode: schema.clients.code,
        clientName: schema.clients.name,
        clientGroupName: schema.clientGroups.name,
      })
      .from(schema.repayments)
      .leftJoin(
        schema.clients,
        eq(schema.repayments.clientId, schema.clients.id),
      )
      .leftJoin(
        schema.clientGroups,
        eq(schema.clients.clientGroupId, schema.clientGroups.id),
      );
  }

  async findRepayment(id: number): Promise<RepaymentRow> {
    const rows = await this.repaymentQuery().where(
      eq(schema.repayments.id, id),
    );
    return rows[0];
  }

  nextRepaymentCode(tenantId: number, tx?: Executor) {
    return nextDocumentCode(
      tx ?? this.db,
      schema.repayments,
      schema.repayments.code,
      schema.repayments.tenantId,
      tenantId,
    );
  }

  async insertRepayment(
    data: RepaymentInsert,
    tx: Executor,
  ): Promise<Repayment> {
    const rows = await tx.insert(schema.repayments).values(data).returning();
    return rows[0];
  }

  async updateRepayment(
    id: number,
    data: Partial<RepaymentInsert>,
    tx: Executor,
  ): Promise<void> {
    await tx
      .update(schema.repayments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.repayments.id, id));
  }

  async deleteRepayment(id: number, tx: Executor): Promise<void> {
    await tx.delete(schema.repayments).where(eq(schema.repayments.id, id));
  }

  async transaction<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
    return this.db.transaction(fn as any) as Promise<T>;
  }

  /** Balance entries this payment posted, for reversing it. */
  async balanceEntriesFor(paymentId: number, tx: Executor) {
    return tx
      .select()
      .from(schema.balanceEntries)
      .where(eq(schema.balanceEntries.paymentId, paymentId));
  }
}
