import {
  CloudhikeAuthorizationError,
  claimsForVerifiedSession,
  type VerifiedClerkSession,
} from "./verified-clerk-session";

/**
 * Transaction-local Clerk claims for a CloudHike runtime connection.
 *
 * The claims value is `set_config('request.jwt.claims', $1, true)`. The third
 * argument makes it local to this transaction. The connection is reset before
 * it returns to a pool. This module is not used by the Supabase clients.
 */

export interface CloudhikeStatementClient {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
}

export interface CloudhikeConnection extends CloudhikeStatementClient {
  release(error?: Error | boolean): void;
}

export interface CloudhikePool {
  connect(): Promise<CloudhikeConnection>;
}

const CLAIMS_MUTATION = /\b(set_config|set)\b/i;

export async function withAuthorizedCloudhikeTransaction<T>(
  pool: CloudhikePool,
  session: VerifiedClerkSession,
  work: (client: CloudhikeStatementClient) => Promise<T>,
): Promise<T> {
  const claims = claimsForVerifiedSession(session);
  const client = await pool.connect();
  let released = false;
  const release = (error?: Error | boolean) => {
    if (released) return;
    released = true;
    client.release(error);
  };

  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await assertRuntimeConnection(client);
    const result = await work(guardClaims(client));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      release(error instanceof Error ? error : new Error("rollback failed"));
    }
    throw error;
  } finally {
    if (!released) {
      try {
        await client.query("RESET request.jwt.claims");
        release();
      } catch (resetError) {
        release(resetError instanceof Error ? resetError : new Error("reset claims failed"));
      }
    }
  }
}

async function assertRuntimeConnection(client: CloudhikeStatementClient): Promise<void> {
  const result = await client.query<{
    rolsuper: boolean;
    rolbypassrls: boolean;
    owns_database: boolean;
    owns_public_table: boolean;
  }>(`
    SELECT
      r.rolsuper,
      r.rolbypassrls,
      (d.datdba = r.oid) AS owns_database,
      EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relowner = r.oid
      ) AS owns_public_table
    FROM pg_roles r
    JOIN pg_database d ON d.datname = current_database()
    WHERE r.rolname = current_user
  `);
  const role = result.rows[0];
  if (!role || role.rolsuper || role.rolbypassrls || role.owns_database || role.owns_public_table) {
    throw new CloudhikeAuthorizationError("privileged-connection");
  }
}

function guardClaims(client: CloudhikeStatementClient): CloudhikeStatementClient {
  return {
    query(text, values) {
      if (mutatesClaims(text, values)) {
        throw new CloudhikeAuthorizationError("unverified");
      }
      return client.query(text, values);
    },
  };
}

function mutatesClaims(text: string, values: readonly unknown[] | undefined): boolean {
  if (!CLAIMS_MUTATION.test(text)) return false;
  const haystack = `${text}\n${(values ?? []).map((value) => String(value)).join("\n")}`;
  return /request\.jwt\.claims/i.test(haystack);
}
