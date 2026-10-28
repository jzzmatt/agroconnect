declare module "pg" {
  interface QueryResult<T extends Record<string, unknown> = Record<string, unknown>> {
    rows: T[];
  }

  interface PoolClient {
    query<T extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      values?: readonly unknown[],
    ): Promise<QueryResult<T>>;
    release(error?: Error | boolean): void;
  }

  interface PoolConfig {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    max?: number;
  }

  class Pool {
    constructor(config?: PoolConfig);
    query<T extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      values?: readonly unknown[],
    ): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }

  export { Pool, PoolClient, PoolConfig, QueryResult };
  export default pg;

  namespace pg {
    export { Pool, PoolClient, PoolConfig, QueryResult };
  }
}
