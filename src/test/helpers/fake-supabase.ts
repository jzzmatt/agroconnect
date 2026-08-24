/**
 * Minimal in-memory stand-in for the subset of the supabase-js query builder
 * the media services use (eq/neq/in/order/single/maybeSingle/insert/update/
 * delete). This is test-only scaffolding — production code always talks to
 * the real Supabase client via @/lib/media/db; nothing here is durable state
 * for the app itself.
 */

type Row = Record<string, unknown>;
type Filter = { col: string; op: "eq" | "neq" | "in"; val: unknown };

function matchesFilters(row: Row, filters: Filter[]): boolean {
  return filters.every((f) => {
    const value = row[f.col];
    if (f.op === "eq") return value === f.val;
    if (f.op === "neq") return value !== f.val;
    if (f.op === "in") return Array.isArray(f.val) && f.val.includes(value);
    return true;
  });
}

class FakeQuery<T extends Row = Row> implements PromiseLike<{ data: unknown; error: null }> {
  private filters: Filter[] = [];
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private wantsSingle = false;
  private wantsMaybe = false;
  private orderCol: string | null = null;
  private orderAsc = true;

  constructor(private table: T[]) {}

  select(_columns?: string) {
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  neq(col: string, val: unknown) {
    this.filters.push({ col, op: "neq", val });
    return this;
  }

  in(col: string, val: unknown[]) {
    this.filters.push({ col, op: "in", val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(_n: number) {
    return this;
  }

  single() {
    this.wantsSingle = true;
    return this;
  }

  maybeSingle() {
    this.wantsMaybe = true;
    return this;
  }

  insert(row: Row | Row[]) {
    this.mode = "insert";
    this.payload = row;
    return this;
  }

  update(patch: Row) {
    this.mode = "update";
    this.payload = patch;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  private execute(): { data: unknown; error: null } {
    if (this.mode === "insert") {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload as Row]).map((r) => ({ ...r }));
      this.table.push(...(rows as T[]));
      const data = this.wantsSingle || this.wantsMaybe || !Array.isArray(this.payload) ? rows[0] : rows;
      return { data, error: null };
    }
    if (this.mode === "update") {
      const matched = this.table.filter((r) => matchesFilters(r, this.filters));
      matched.forEach((r) => Object.assign(r, this.payload));
      const data = this.wantsSingle || this.wantsMaybe ? matched[0] ?? null : matched;
      return { data, error: null };
    }
    if (this.mode === "delete") {
      const remaining = this.table.filter((r) => !matchesFilters(r, this.filters));
      this.table.length = 0;
      this.table.push(...remaining);
      return { data: null, error: null };
    }

    let rows = this.table.filter((r) => matchesFilters(r, this.filters));
    if (this.orderCol) {
      const col = this.orderCol;
      rows = [...rows].sort((a, b) => {
        const av = a[col] as unknown;
        const bv = b[col] as unknown;
        if (av === bv) return 0;
        const cmp = av! > bv! ? 1 : -1;
        return this.orderAsc ? cmp : -cmp;
      });
    }
    if (this.wantsSingle || this.wantsMaybe) {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export function createFakeSupabaseClient(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) {
    tables[name] = rows.map((r) => ({ ...r }));
  }
  return {
    __tables: tables,
    from(table: string) {
      if (!tables[table]) tables[table] = [];
      return new FakeQuery(tables[table]);
    },
  };
}

export type FakeSupabaseClient = ReturnType<typeof createFakeSupabaseClient>;
