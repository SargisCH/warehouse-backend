import { Injectable, Inject } from '@nestjs/common';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { SQL, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

/** The filter panel shared by «Վաճառքների վերլուծություն» and «համեմատական». */
export type SalesReportFilters = {
  productIds?: number[];
  productGroupIds?: number[];
  clientIds?: number[];
  clientGroupIds?: number[];
  managerIds?: number[];
  // «Վաճառքի գոտի» - as stamped on the sale.
  salesZoneIds?: number[];
  // «Գնորդի վաճառքի գոտի»
  clientSalesZoneIds?: number[];
  delivererIds?: number[];
  paymentTypes?: string[];
  // «Գտնվելու վայր»
  location?: string;
  // «Արտադրող»
  manufacturers?: string[];
  // «Գործողություն»: SALE, RETURN or both.
  operations?: string[];
  // «Փաստաթղթի խումբ»
  documentIds?: number[];
};

/** «Խմբավորել ըստ» - the dimensions the comparison can be broken down by. */
export const GROUP_DIMENSIONS = {
  product: {
    id: sql`p.id`,
    label: sql`p.sku || ' ' || coalesce(p.name, '')`,
  },
  productGroup: { id: sql`pg.id`, label: sql`pg.name` },
  client: { id: sql`c.id`, label: sql`c.code || ' ' || c.name` },
  clientGroup: { id: sql`cg.id`, label: sql`cg.name` },
  manager: { id: sql`m.id`, label: sql`m.code || ' ' || m.name` },
  deliverer: { id: sql`d.id`, label: sql`d.code || ' ' || d.name` },
  salesZone: { id: sql`z.id`, label: sql`z.name` },
  location: { id: sql`c.address`, label: sql`c.address` },
  manufacturer: { id: sql`p.manufacturer`, label: sql`p.manufacturer` },
  documentGroup: { id: sql`doc.id`, label: sql`doc.name` },
} as const;

export type GroupDimension = keyof typeof GROUP_DIMENSIONS;

// «Ցույց տալ»: quantity or money, returns counted against sales.
export const MEASURES = {
  quantity: sql`CASE WHEN s.is_return THEN -si.quantity ELSE si.quantity END`,
  amount: sql`CASE WHEN s.is_return THEN -si.amount ELSE si.amount END`,
} as const;

export type Measure = keyof typeof MEASURES;

const inList = (column: SQL, values?: Array<number | string>) =>
  values?.length
    ? sql`${column} IN (${sql.join(
        values.map((v) => sql`${v}`),
        sql`, `,
      )})`
    : undefined;

/**
 * Sale lines as reports read them. With `explodeKits` («Կոմպլեկտներն ըստ
 * բաղադրիչների») a kit line becomes one line per component: quantity times
 * the component's quantity in the kit, and the kit's amount shared out in
 * proportion to those quantities.
 */
const lineSource = (explodeKits: boolean) =>
  explodeKits
    ? sql`(
        SELECT si.id, si.sale_id, si.product_id, si.quantity, si.price, si.amount
        FROM sale_items si
        WHERE NOT EXISTS (SELECT 1 FROM ingredients i WHERE i.product_id = si.product_id)
        UNION ALL
        SELECT si.id, si.sale_id, i.ingredient_id,
               si.quantity * i.quantity, NULL,
               si.amount * i.quantity / kit.total
        FROM sale_items si
        JOIN ingredients i ON i.product_id = si.product_id
        JOIN (SELECT product_id, sum(quantity) AS total
              FROM ingredients GROUP BY product_id) kit
          ON kit.product_id = si.product_id
      ) si`
    : sql`sale_items si`;

// Every sales line with everything a report may filter or group on.
const saleLines = (explodeKits = false) => sql`
  FROM ${lineSource(explodeKits)}
  JOIN sales s ON s.id = si.sale_id
  JOIN products p ON p.id = si.product_id
  LEFT JOIN units u ON u.id = p.unit_id
  LEFT JOIN product_groups pg ON pg.id = p.group_id
  LEFT JOIN clients c ON c.id = s.client_id
  LEFT JOIN client_groups cg ON cg.id = c.client_group_id
  LEFT JOIN managers m ON m.id = s.manager_id
  LEFT JOIN managers d ON d.id = s.deliverer_id
  LEFT JOIN sales_zones z ON z.id = s.sales_zone_id
  LEFT JOIN documents doc ON doc.id = s.document_id
`;

// A balance movement's date is its document's, not when it was typed in.
const ENTRY_DATE = sql`coalesce(bs.document_date, bp.document_date, b.created_at::date)`;
const BALANCE_ENTRIES = sql`
  FROM balance_entries b
  LEFT JOIN sales bs ON bs.id = b.sale_id
  LEFT JOIN payments bp ON bp.id = b.payment_id
`;

@Injectable()
export class ReportRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private saleFilters(tenantId: number, f: SalesReportFilters): SQL {
    const conditions = [
      sql`s.tenant_id = ${tenantId}`,
      inList(sql`si.product_id`, f.productIds),
      inList(sql`p.group_id`, f.productGroupIds),
      inList(sql`s.client_id`, f.clientIds),
      inList(sql`c.client_group_id`, f.clientGroupIds),
      inList(sql`s.manager_id`, f.managerIds),
      inList(sql`s.sales_zone_id`, f.salesZoneIds),
      inList(sql`c.sales_zone_id`, f.clientSalesZoneIds),
      inList(sql`s.deliverer_id`, f.delivererIds),
      inList(sql`s.payment_type`, f.paymentTypes),
      f.location ? sql`c.address ILIKE ${`%${f.location}%`}` : undefined,
      inList(sql`p.manufacturer`, f.manufacturers),
      inList(sql`s.document_id`, f.documentIds),
      // Both operations, or neither, means no filter.
      f.operations?.length === 1
        ? sql`s.is_return = ${f.operations[0] === 'RETURN'}`
        : undefined,
    ].filter(Boolean);
    return sql.join(conditions, sql` AND `);
  }

  /** «Վաճառքների վերլուծություն»: who bought how much of what, line by line. */
  async salesAnalysis(
    tenantId: number,
    dateFrom: string,
    dateTo: string,
    filters: SalesReportFilters,
  ) {
    const rows = await this.db.execute(sql`
      SELECT s.id AS "saleId", s.code, s.document_date AS "documentDate",
             s.is_return AS "isReturn",
             p.id AS "productId", p.sku AS "productCode", p.name AS "productName",
             pg.name AS "productGroupName", u.name AS "unitName",
             ${MEASURES.quantity}::numeric(14,3) AS quantity,
             si.price,
             ${MEASURES.amount}::numeric(14,2) AS amount,
             c.code AS "clientCode", c.name AS "clientName",
             cg.name AS "clientGroupName", c.address AS "clientAddress",
             m.code AS "managerCode", m.name AS "managerName",
             d.code AS "delivererCode", d.name AS "delivererName",
             z.name AS "salesZoneName", s.payment_type AS "paymentType",
             p.manufacturer, doc.name AS "documentName"
      ${saleLines()}
      WHERE ${this.saleFilters(tenantId, filters)}
        AND s.document_date BETWEEN ${dateFrom} AND ${dateTo}
      ORDER BY s.document_date, s.code, si.id
    `);
    return rows.rows;
  }

  /**
   * «Վաճառքների համեմատական»: one row per combination of the chosen
   * dimensions, one column per period and measure.
   */
  async salesComparison(
    tenantId: number,
    periods: Array<{ from: string; to: string }>,
    groupBy: GroupDimension[],
    measures: Measure[],
    filters: SalesReportFilters,
    includeZeroRows: boolean,
    // «Տողել ըստ»: by the grouping labels, or by the first value, largest first.
    sortBy: 'label' | 'value' = 'label',
    explodeKits = false,
  ) {
    const keys = groupBy.flatMap((dimension) => [
      sql`${GROUP_DIMENSIONS[dimension].id} AS ${sql.identifier(
        `${dimension}Id`,
      )}`,
      sql`${GROUP_DIMENSIONS[dimension].label} AS ${sql.identifier(
        `${dimension}Name`,
      )}`,
    ]);
    const groupColumns = groupBy.flatMap((dimension) => [
      GROUP_DIMENSIONS[dimension].id,
      GROUP_DIMENSIONS[dimension].label,
    ]);
    const values = periods.flatMap((period, index) =>
      measures.map(
        (measure) =>
          sql`coalesce(sum(${
            MEASURES[measure]
          }) FILTER (WHERE s.document_date BETWEEN ${period.from} AND ${
            period.to
          }), 0)::${
            // Split kit amounts carry long fractions; round like any column.
            measure === 'quantity' ? sql`numeric(14,3)` : sql`numeric(14,2)`
          } AS ${sql.identifier(`${measure}${index + 1}`)}`,
      ),
    );
    const anyPeriod = sql.join(
      periods.map(
        (period) =>
          sql`s.document_date BETWEEN ${period.from} AND ${period.to}`,
      ),
      sql` OR `,
    );
    const nonZero = sql.join(
      periods.flatMap((period) =>
        measures.map(
          (measure) =>
            sql`coalesce(sum(${MEASURES[measure]}) FILTER (WHERE s.document_date BETWEEN ${period.from} AND ${period.to}), 0) <> 0`,
        ),
      ),
      sql` OR `,
    );

    const rows = await this.db.execute(sql`
      SELECT ${sql.join([...keys, ...values], sql`, `)}
      ${saleLines(explodeKits)}
      WHERE ${this.saleFilters(tenantId, filters)} AND (${anyPeriod})
      GROUP BY ${sql.join(groupColumns, sql`, `)}
      ${includeZeroRows ? sql`` : sql`HAVING ${nonZero}`}
      ORDER BY ${
        sortBy === 'value'
          ? sql`${sql.identifier(`${measures[0]}1`)} DESC`
          : sql.join(
              groupBy.map((dimension) => GROUP_DIMENSIONS[dimension].label),
              sql`, `,
            )
      }
    `);
    return rows.rows;
  }

  /** «Ըստ գնորդի քաղվածք»: opening balance, every movement, closing balance. */
  async clientStatement(clientId: number, dateFrom: string, dateTo: string) {
    const opening = await this.db.execute<{ total: string }>(sql`
      SELECT coalesce(sum(b.amount), 0)::numeric(14,2) AS total
      ${BALANCE_ENTRIES}
      WHERE b.client_id = ${clientId} AND ${ENTRY_DATE} < ${dateFrom}
    `);
    const movements = await this.db.execute(sql`
      SELECT b.id, b.kind, b.amount, b.note, ${ENTRY_DATE} AS "entryDate",
             bs.code AS "saleCode", bs.is_return AS "isReturn",
             bp.code AS "paymentCode"
      ${BALANCE_ENTRIES}
      WHERE b.client_id = ${clientId}
        AND ${ENTRY_DATE} BETWEEN ${dateFrom} AND ${dateTo}
      ORDER BY ${ENTRY_DATE}, b.id
    `);
    return {
      opening: String(opening.rows[0]?.total ?? '0.00'),
      movements: movements.rows,
    };
  }

  /** «Ըստ գնորդի մնացորդներ» as of a date, one row per buyer. */
  async clientBalances(
    tenantId: number,
    date: string,
    filters: {
      clientGroupId?: number;
      managerId?: number;
      salesZoneId?: number;
    },
  ) {
    const rows = await this.db.execute(sql`
      SELECT c.id AS "clientId", c.code AS "clientCode", c.name AS "clientName",
             cg.name AS "clientGroupName", m.code AS "managerCode",
             m.name AS "managerName", z.name AS "salesZoneName",
             bal.balance
      FROM (
        SELECT b.client_id, sum(b.amount)::numeric(14,2) AS balance
        ${BALANCE_ENTRIES}
        WHERE b.tenant_id = ${tenantId} AND ${ENTRY_DATE} <= ${date}
        GROUP BY b.client_id
      ) bal
      JOIN clients c ON c.id = bal.client_id
      LEFT JOIN client_groups cg ON cg.id = c.client_group_id
      LEFT JOIN managers m ON m.id = c.manager_id
      LEFT JOIN sales_zones z ON z.id = c.sales_zone_id
      WHERE bal.balance <> 0
        ${
          filters.clientGroupId
            ? sql`AND c.client_group_id = ${filters.clientGroupId}`
            : sql``
        }
        ${
          filters.managerId
            ? sql`AND c.manager_id = ${filters.managerId}`
            : sql``
        }
        ${
          filters.salesZoneId
            ? sql`AND c.sales_zone_id = ${filters.salesZoneId}`
            : sql``
        }
      ORDER BY c.code
    `);
    return rows.rows;
  }

  /**
   * «Ըստ մենեջերի մնացորդներ»: what each agent's buyers owe in total, as of a
   * date. Buyers with no agent are grouped under a null row.
   */
  async managerBalances(tenantId: number, date: string) {
    const rows = await this.db.execute(sql`
      SELECT m.id AS "managerId", m.code AS "managerCode", m.name AS "managerName",
             sum(b.amount)::numeric(14,2) AS balance
      ${BALANCE_ENTRIES}
      JOIN clients c ON c.id = b.client_id
      LEFT JOIN managers m ON m.id = c.manager_id
      WHERE b.tenant_id = ${tenantId} AND ${ENTRY_DATE} <= ${date}
      GROUP BY m.id, m.code, m.name
      HAVING sum(b.amount) <> 0
      ORDER BY m.code NULLS LAST
    `);
    return rows.rows;
  }

  /** «Ըստ մենեջերի ապրանքի մնացորդ»: what each deliverer's van holds. */
  async managerStock(
    tenantId: number,
    filters: { managerId?: number; productGroupId?: number },
  ) {
    const rows = await this.db.execute(sql`
      SELECT m.id AS "managerId", m.code AS "managerCode", m.name AS "managerName",
             p.id AS "productId", p.sku AS "productCode", p.name AS "productName",
             u.name AS "unitName", pg.name AS "productGroupName", ms.quantity
      FROM manager_stock ms
      JOIN managers m ON m.id = ms.manager_id
      JOIN products p ON p.id = ms.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN product_groups pg ON pg.id = p.group_id
      WHERE m.tenant_id = ${tenantId} AND ms.quantity <> 0
        ${filters.managerId ? sql`AND m.id = ${filters.managerId}` : sql``}
        ${
          filters.productGroupId
            ? sql`AND p.group_id = ${filters.productGroupId}`
            : sql``
        }
      ORDER BY m.code, p.sku
    `);
    return rows.rows;
  }
}
