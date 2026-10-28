import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { CreditAllocationInsert } from 'src/drizzle/schema';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

type Executor = NodePgDatabase<typeof schema>;

/** A sale the buyer still owes on - «Մարման ենթակա փաստաթղթեր». */
export type OpenSale = {
  id: number;
  code: string;
  documentDate: string;
  // documentDate plus the buyer's «Վճարման ուշացման օրեր».
  dueDate: string;
  isOverdue: boolean;
  totalAmount: string;
  outstanding: string;
};

/** A payment or return whose value has not all been applied yet. */
export type CreditSource = {
  kind: 'PAYMENT' | 'RETURN';
  id: number;
  code: string;
  documentDate: string;
  amount: string;
  unused: string;
};

export type AllocationRow = {
  id: number;
  amount: string;
  repaymentId: number | null;
  sourcePaymentId: number | null;
  sourceReturnId: number | null;
  targetSaleId: number | null;
  targetRefundId: number | null;
  // The document on the other side, whichever it is.
  saleCode: string | null;
  saleDate: string | null;
  saleTotal: string | null;
  sourceCode: string | null;
  sourceDate: string | null;
};

@Injectable()
export class CreditRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * The buyer's sales that still carry debt, oldest first - the order a payment
   * pays them off in. What is owed is the total, less what was paid at the
   * counter, less everything allocated to it since.
   */
  async openSales(clientId: number, tx?: Executor): Promise<OpenSale[]> {
    const executor = tx ?? this.db;
    const rows = await executor.execute<OpenSale>(sql`
      SELECT s.id, s.code, s.document_date AS "documentDate",
             to_char(s.document_date + c.payment_term_days, 'YYYY-MM-DD')
               AS "dueDate",
             (s.document_date + c.payment_term_days < current_date)
               AS "isOverdue",
             s.total_amount AS "totalAmount",
             (s.total_amount - s.paid_amount
               - coalesce((SELECT sum(a.amount) FROM credit_allocations a
                           WHERE a.target_sale_id = s.id), 0))::numeric(14,2)
               AS outstanding
      FROM sales s
      JOIN clients c ON c.id = s.client_id
      WHERE s.client_id = ${clientId} AND s.is_return = false
        AND s.total_amount - s.paid_amount
          - coalesce((SELECT sum(a.amount) FROM credit_allocations a
                      WHERE a.target_sale_id = s.id), 0) > 0
      ORDER BY s.document_date, s.id
    `);
    return rows.rows.map((row) => ({
      ...row,
      outstanding: String(row.outstanding),
    }));
  }

  /**
   * Payments in and returns whose value is not yet spent on a sale or refund:
   * the buyer's «կանխավճար» and unused «վերադարձ», oldest first.
   */
  async creditSources(
    clientId: number,
    kind?: 'PAYMENT' | 'RETURN',
    tx?: Executor,
  ): Promise<CreditSource[]> {
    const executor = tx ?? this.db;
    const rows = await executor.execute<CreditSource>(sql`
      SELECT * FROM (
        SELECT 'PAYMENT' AS kind, p.id, p.code, p.document_date AS "documentDate",
               p.amount,
               (p.amount - coalesce((SELECT sum(a.amount) FROM credit_allocations a
                                     WHERE a.source_payment_id = p.id), 0))::numeric(14,2)
                 AS unused
        FROM payments p
        WHERE p.client_id = ${clientId} AND p.kind = 'IN'
        UNION ALL
        SELECT 'RETURN' AS kind, s.id, s.code, s.document_date AS "documentDate",
               s.total_amount AS amount,
               (s.total_amount - coalesce((SELECT sum(a.amount) FROM credit_allocations a
                                           WHERE a.source_return_id = s.id), 0))::numeric(14,2)
                 AS unused
        FROM sales s
        WHERE s.client_id = ${clientId} AND s.is_return = true
      ) sources
      WHERE unused > 0 ${kind ? sql`AND kind = ${kind}` : sql``}
      ORDER BY "documentDate", id
    `);
    return rows.rows.map((row) => ({
      ...row,
      amount: String(row.amount),
      unused: String(row.unused),
    }));
  }

  async insert(rows: CreditAllocationInsert[], tx: Executor): Promise<void> {
    if (!rows.length) return;
    await tx.insert(schema.creditAllocations).values(rows);
  }

  /** Every allocation touching a document, with the document on the far side. */
  async allocationsFor(
    link:
      | { sourcePaymentId: number }
      | { sourceReturnId: number }
      | { targetSaleId: number }
      | { targetRefundId: number }
      | { repaymentId: number },
    tx?: Executor,
  ): Promise<AllocationRow[]> {
    const executor = tx ?? this.db;
    const [column, id] = Object.entries(link)[0];
    const columnSql = {
      sourcePaymentId: sql`a.source_payment_id`,
      sourceReturnId: sql`a.source_return_id`,
      targetSaleId: sql`a.target_sale_id`,
      targetRefundId: sql`a.target_refund_id`,
      repaymentId: sql`a.repayment_id`,
    }[column];
    const rows = await executor.execute<AllocationRow>(sql`
      SELECT a.id, a.amount, a.repayment_id AS "repaymentId",
             a.source_payment_id AS "sourcePaymentId",
             a.source_return_id AS "sourceReturnId",
             a.target_sale_id AS "targetSaleId",
             a.target_refund_id AS "targetRefundId",
             ts.code AS "saleCode", ts.document_date AS "saleDate",
             ts.total_amount AS "saleTotal",
             coalesce(sp.code, sr.code) AS "sourceCode",
             coalesce(sp.document_date, sr.document_date) AS "sourceDate"
      FROM credit_allocations a
      LEFT JOIN sales ts ON ts.id = a.target_sale_id
      LEFT JOIN payments sp ON sp.id = a.source_payment_id
      LEFT JOIN sales sr ON sr.id = a.source_return_id
      WHERE ${columnSql} = ${id}
      ORDER BY a.id
    `);
    return rows.rows;
  }

  /**
   * Whether some other document - a «մարում» or a refund - has spent part of
   * this source. Removing the source would then pull credit out from under it.
   */
  async isSpentElsewhere(
    source: { paymentId: number } | { returnId: number },
    tx?: Executor,
  ): Promise<boolean> {
    const executor = tx ?? this.db;
    const condition =
      'paymentId' in source
        ? sql`source_payment_id = ${source.paymentId}`
        : sql`source_return_id = ${source.returnId}`;
    const rows = await executor.execute(sql`
      SELECT 1 FROM credit_allocations
      WHERE ${condition}
        AND (repayment_id IS NOT NULL OR target_refund_id IS NOT NULL)
      LIMIT 1
    `);
    return rows.rows.length > 0;
  }

  /**
   * A sale about to be removed takes its allocations with it (they cascade).
   * Those made by a «մարում» are subtracted from it first, and a repayment left
   * with nothing is removed, so no repayment claims money it no longer moved.
   */
  async releaseRepaymentsOnSale(saleId: number, tx: Executor): Promise<void> {
    await tx.execute(sql`
      UPDATE repayments r
      SET amount = r.amount - freed.total, updated_at = now()
      FROM (
        SELECT repayment_id, sum(amount) AS total
        FROM credit_allocations
        WHERE target_sale_id = ${saleId} AND repayment_id IS NOT NULL
        GROUP BY repayment_id
      ) freed
      WHERE r.id = freed.repayment_id
    `);
    await tx.execute(sql`
      DELETE FROM credit_allocations
      WHERE target_sale_id = ${saleId} AND repayment_id IS NOT NULL
    `);
    await tx.execute(sql`DELETE FROM repayments WHERE amount <= 0`);
  }

  /** How much of each sale is settled beyond the counter, for list columns. */
  async settledBySale(saleIds: number[]): Promise<Map<number, string>> {
    if (!saleIds.length) return new Map();
    const rows = await this.db.execute<{ sale_id: number; total: string }>(sql`
      SELECT target_sale_id AS sale_id, sum(amount) AS total
      FROM credit_allocations
      WHERE target_sale_id IN (${sql.join(
        saleIds.map((id) => sql`${id}`),
        sql`, `,
      )})
      GROUP BY target_sale_id
    `);
    return new Map(
      rows.rows.map((row) => [Number(row.sale_id), String(row.total)]),
    );
  }
}
