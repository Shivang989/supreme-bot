export interface D1RestConfig {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

interface CloudflareD1QueryResponse<T = Record<string, unknown>> {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  result?: Array<{
    results: T[];
    success: boolean;
    meta?: {
      changed_db?: boolean;
      changes?: number;
      duration?: number;
      last_row_id?: number;
      rows_read?: number;
      rows_written?: number;
      size_after?: number;
    };
  }>;
}

export function createD1RestAdapter(config: D1RestConfig): D1Database {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;

  async function executeQuery<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<{
    results: T[];
    success: boolean;
    meta: Record<string, any>;
  }> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`D1 REST HTTP ${response.status}: ${errorBody || response.statusText}`);
    }

    const data = (await response.json()) as CloudflareD1QueryResponse<T>;

    if (!data.success || !data.result || data.result.length === 0) {
      const errMsg = data.errors?.map((e) => e.message).join("; ") || "Unknown D1 REST query error";
      throw new Error(`D1 Query Failed: ${errMsg}`);
    }

    const firstResult = data.result[0];
    return {
      results: firstResult.results || [],
      success: firstResult.success ?? true,
      meta: firstResult.meta || { changes: 0, rows_written: 0, rows_read: 0 },
    };
  }

  function createStatement(sql: string, boundParams: unknown[] = []): D1PreparedStatement {
    const stmt: any = {
      bind(...values: unknown[]): D1PreparedStatement {
        return createStatement(sql, values);
      },

      async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
        const res = await executeQuery<T>(sql, boundParams);
        if (!res.results || res.results.length === 0) return null;
        const row = res.results[0];
        if (colName) {
          return ((row as Record<string, unknown>)[colName] as T) ?? null;
        }
        return row;
      },

      async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const res = await executeQuery<T>(sql, boundParams);
        return {
          results: res.results,
          success: true,
          meta: res.meta as any,
        };
      },

      async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const res = await executeQuery<T>(sql, boundParams);
        return {
          results: res.results,
          success: true,
          meta: res.meta as any,
        };
      },

      async raw<T = unknown[]>(): Promise<T[]> {
        const res = await executeQuery<Record<string, unknown>>(sql, boundParams);
        return res.results.map((row) => Object.values(row) as unknown as T);
      },
    };

    return stmt as D1PreparedStatement;
  }

  const dbAdapter: any = {
    prepare(query: string): D1PreparedStatement {
      return createStatement(query, []);
    },

    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        results.push(await stmt.run<T>());
      }
      return results;
    },

    async exec(query: string): Promise<D1ExecResult> {
      const res = await executeQuery(query, []);
      return {
        count: 1,
        duration: res.meta?.duration ?? 0,
      };
    },

    async dump(): Promise<ArrayBuffer> {
      throw new Error("D1 dump() is not supported over REST adapter.");
    },
  };

  return dbAdapter as D1Database;
}
