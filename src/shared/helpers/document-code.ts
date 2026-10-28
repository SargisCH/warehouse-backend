import { SQL, eq, sql } from 'drizzle-orm';
import { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const UNIQUE_VIOLATION = '23505';
const CODE_RETRIES = 5;

/** The next «Փաստաթղթի N» for a tenant: the highest numeric code plus one. */
export async function nextDocumentCode(
  db: NodePgDatabase<any>,
  table: PgTable,
  code: PgColumn,
  tenantId: PgColumn,
  tenant: number,
  where?: SQL,
): Promise<string> {
  const result = await db
    .select({
      highest: sql<number>`coalesce(max(nullif(regexp_replace(${code}, '\\D', '', 'g'), '')::int), 0)`,
    })
    .from(table)
    .where(where ?? eq(tenantId, tenant));
  const next = Number(result[0]?.highest ?? 0) + 1;
  return String(next).padStart(6, '0');
}

/**
 * Runs `insert` with a freshly numbered code, retrying when a concurrent
 * document took the same number first. The unique index is the real gate.
 *
 * Each attempt runs in a savepoint: a failed INSERT aborts the surrounding
 * Postgres transaction, so without one the retry could never succeed.
 */
export async function withDocumentCode<T>(
  tx: NodePgDatabase<any>,
  nextCode: () => Promise<string>,
  constraint: string,
  insert: (code: string) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const code = await nextCode();
    try {
      return await tx.transaction(() => insert(code));
    } catch (e) {
      const isDuplicateCode =
        (e?.cause?.code ?? e?.code) === UNIQUE_VIOLATION &&
        String(e?.cause?.constraint ?? e?.constraint) === constraint;
      if (!isDuplicateCode || attempt === CODE_RETRIES - 1) throw e;
    }
  }
}
