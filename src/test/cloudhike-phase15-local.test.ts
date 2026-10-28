/**
 * @vitest-environment node
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { withAuthorizedCloudhikeTransaction } from "@/lib/cloudhike/authorized-transaction";
import {
  searchCloudhikeMarketplaceProducts,
  searchCloudhikeMarketplaceServices,
} from "@/lib/cloudhike/marketplace-search";
import { sessionFromClerkAuth } from "@/lib/cloudhike/verified-clerk-session";
import { wgs84Direct } from "@/lib/geospatial/wgs84-distance";

const { Pool } = pg;
const local = localPostgres();
const DATABASE = "cloudhike_phase15";
const LUANDA = { latitude: -8.8383, longitude: 13.2344 };
const CATEGORY_A = "11111111-1111-4111-8111-111111111111";
const CATEGORY_B = "22222222-2222-4222-8222-222222222222";
const PROVINCE_LUA = "33333333-3333-4333-8333-333333333333";
const PROVINCE_HUA = "44444444-4444-4444-8444-444444444444";
const MUNICIPALITY = "55555555-5555-4555-8555-555555555555";
const PRODUCT_RELATION = "public.phase15_product_candidates";
const SERVICE_RELATION = "public.phase15_service_candidates";

const ownerPassword = randomBytes(18).toString("hex");
const runtimePassword = randomBytes(18).toString("hex");
const bypassPassword = randomBytes(18).toString("hex");

let ownerPool: pg.Pool;
let runtimePool: pg.Pool;
let bypassPool: pg.Pool;
let productCount = 0;

describe.skipIf(!local)("phase 1.5 local disposable postgres", () => {
  beforeAll(async () => {
    const boundary = wgs84Direct(LUANDA, 0, 50_000);
    const far = wgs84Direct(LUANDA, 0, 210_000);
    psql("postgres", `
      DROP DATABASE IF EXISTS ${DATABASE} WITH (FORCE);
      DROP ROLE IF EXISTS cloudhike_bypass;
      DROP ROLE IF EXISTS cloudhike_runtime;
      DROP ROLE IF EXISTS cloudhike_table_owner;
      CREATE ROLE cloudhike_table_owner LOGIN PASSWORD '${ownerPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      CREATE ROLE cloudhike_runtime LOGIN PASSWORD '${runtimePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      CREATE ROLE cloudhike_bypass LOGIN PASSWORD '${bypassPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
      CREATE DATABASE ${DATABASE} OWNER cloudhike_table_owner;
    `);
    psql(DATABASE, `
      CREATE TABLE public.private_notes (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        owner_clerk_id text NOT NULL,
        body text NOT NULL
      );
      ALTER TABLE public.private_notes OWNER TO cloudhike_table_owner;

      CREATE FUNCTION public.current_clerk_user_id()
      RETURNS text
      LANGUAGE plpgsql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        RETURN NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '');
      EXCEPTION
        WHEN OTHERS THEN
          RETURN NULL;
      END;
      $$;
      ALTER FUNCTION public.current_clerk_user_id() OWNER TO cloudhike_table_owner;
      REVOKE ALL ON FUNCTION public.current_clerk_user_id() FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION public.current_clerk_user_id() TO cloudhike_runtime;

      ALTER TABLE public.private_notes ENABLE ROW LEVEL SECURITY;
      CREATE POLICY notes_own ON public.private_notes
        FOR ALL
        USING (owner_clerk_id = public.current_clerk_user_id())
        WITH CHECK (owner_clerk_id = public.current_clerk_user_id());
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_notes TO cloudhike_runtime;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cloudhike_runtime;
      GRANT SELECT ON public.private_notes TO cloudhike_bypass;

      CREATE TABLE public.phase15_product_candidates (
        id text PRIMARY KEY,
        title text,
        description text,
        seller_name text,
        status text NOT NULL,
        seller_status text NOT NULL,
        category_id uuid,
        province_id uuid,
        municipality_id uuid,
        availability_status text,
        price numeric,
        latitude numeric,
        longitude numeric,
        selling_radius_km numeric,
        is_featured boolean,
        created_at timestamptz NOT NULL
      );
      CREATE TABLE public.phase15_service_candidates (
        id text PRIMARY KEY,
        title text,
        short_description text,
        description text,
        provider_name text,
        status text NOT NULL,
        provider_status text NOT NULL,
        category_id uuid,
        province_id uuid,
        municipality_id uuid,
        pricing_type text,
        price numeric,
        latitude numeric,
        longitude numeric,
        service_radius_km numeric,
        is_featured boolean,
        created_at timestamptz NOT NULL,
        provider_rating numeric
      );
      ALTER TABLE public.phase15_product_candidates OWNER TO cloudhike_table_owner;
      ALTER TABLE public.phase15_service_candidates OWNER TO cloudhike_table_owner;
      GRANT SELECT ON public.phase15_product_candidates, public.phase15_service_candidates TO cloudhike_runtime;
    `);

    ownerPool = new Pool(connection("cloudhike_table_owner", ownerPassword));
    runtimePool = new Pool({ ...connection("cloudhike_runtime", runtimePassword), max: 1 });
    bypassPool = new Pool(connection("cloudhike_bypass", bypassPassword));

    await ownerPool.query(
      `INSERT INTO public.private_notes (owner_clerk_id, body) VALUES ('user_a', 'a-secret'), ('user_b', 'b-secret')`,
    );
    await ownerPool.query(`ALTER TABLE public.private_notes FORCE ROW LEVEL SECURITY`);

    const products = [
      row("bread", "pães frescos", null, "loja", { price: 10, createdAt: "2026-01-03T00:00:00Z", categoryId: CATEGORY_A, municipalityId: MUNICIPALITY }),
      row("seed", "sementes certificadas", "lote de semente", "loja", { price: 20, categoryId: CATEGORY_B }),
      row("truck", "caminhões de entrega", null, "loja", { price: 30 }),
      row("training", "ações de formação", null, "loja", { price: 12 }),
      row("draft", "pão caseiro", null, "loja", { price: 1, status: "draft" }),
      row("hidden-seller", "pão do mercado", null, "loja", { price: 1, sellerStatus: "inactive" }),
      row("huambo", "pão do huambo", null, "loja", { price: 4, provinceId: PROVINCE_HUA, createdAt: "2026-01-02T00:00:00Z" }),
      row("cheap", "milho seco", null, "loja", { price: 5, createdAt: "2026-03-01T00:00:00Z" }),
      row("mid", "milho branco", null, "loja", { price: 15, createdAt: "2026-03-02T00:00:00Z" }),
      row("dear", "milho amarelo", null, "loja", { price: 40, createdAt: "2026-03-03T00:00:00Z" }),
      row("blank", "milho", null, "loja", { price: null, createdAt: "2026-03-04T00:00:00Z" }),
      row("tie-a", "igualdade", null, "loja", { price: 7, createdAt: "2026-02-01T00:00:00Z" }),
      row("tie-b", "igualdade", null, "loja", { price: 7, createdAt: "2026-02-01T00:00:00Z" }),
      row("close", "pão da cidade", null, "loja", { price: 9, createdAt: "2026-01-01T00:00:00Z" }),
      row("boundary-bread", "pães frescos do campo", null, "campo", { price: 9, createdAt: "2026-01-04T00:00:00Z", latitude: boundary.latitude, longitude: boundary.longitude }),
      row("far-bread", "pão distante", null, "loja", { price: 1, createdAt: "2026-01-05T00:00:00Z", latitude: far.latitude, longitude: far.longitude, radiusKm: 1 }),
      row("zzz-cheap", "outro", null, "loja", { price: 0 }),
      row("desc-only", "outro", "pães frescos", "loja", { price: 6 }),
      row("published-row", "publicado", null, "loja", { price: 8, status: "published" }),
      row("reserva", "reserva especial", null, "loja", { price: 11, availability: "out_of_stock" }),
    ];
    productCount = products.length;
    for (const product of products) {
      await ownerPool.query(
        `INSERT INTO public.phase15_product_candidates (
          id, title, description, seller_name, status, seller_status, category_id, province_id, municipality_id,
          availability_status, price, latitude, longitude, selling_radius_km, is_featured, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        product,
      );
    }

    const services = [
      ["svc-desc", "outro", "nada", "pães frescos", "loja", "active", "active", null, null, null, "fixed", 10, LUANDA.latitude, LUANDA.longitude, 50, false, "2026-04-01T00:00:00Z", 4],
      ["svc-bread", "pães frescos", "padaria", null, "loja", "active", "active", null, null, null, "fixed", 10, LUANDA.latitude, LUANDA.longitude, 50, false, "2026-04-02T00:00:00Z", 4],
      ["svc-draft", "pães frescos", null, null, "loja", "draft", "active", null, null, null, "fixed", 10, LUANDA.latitude, LUANDA.longitude, 50, false, "2026-04-03T00:00:00Z", 5],
      ["svc-high", "consultoria de campo", null, null, "loja", "active", "active", null, null, null, "hourly", 30, LUANDA.latitude, LUANDA.longitude, 50, false, "2026-04-04T00:00:00Z", 5],
      ["svc-low", "consultoria de solo", null, null, "loja", "active", "active", null, null, null, "fixed", 20, LUANDA.latitude, LUANDA.longitude, 50, false, "2026-04-04T00:00:00Z", 4],
      ["svc-none", "consultoria inicial", null, null, "loja", "active", "active", null, null, null, "fixed", 20, LUANDA.latitude, LUANDA.longitude, 50, false, "2026-04-04T00:00:00Z", null],
    ];
    for (const service of services) {
      await ownerPool.query(
        `INSERT INTO public.phase15_service_candidates (
          id, title, short_description, description, provider_name, status, provider_status, category_id, province_id,
          municipality_id, pricing_type, price, latitude, longitude, service_radius_km, is_featured, created_at, provider_rating
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        service,
      );
    }
  }, 60_000);

  afterAll(async () => {
    await ownerPool?.end();
    await runtimePool?.end();
    await bypassPool?.end();
    psql("postgres", `
      DROP DATABASE IF EXISTS ${DATABASE} WITH (FORCE);
      DROP ROLE IF EXISTS cloudhike_bypass;
      DROP ROLE IF EXISTS cloudhike_runtime;
      DROP ROLE IF EXISTS cloudhike_table_owner;
    `);
  });

  it("keeps pães for pão through full text when ILIKE does not match", async () => {
    const flags = await ownerPool.query<{ fts: boolean; ilike: boolean }>(`
      SELECT
        to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(seller_name, ''))
          @@ plainto_tsquery('portuguese', 'pão') AS fts,
        title ILIKE '%' || 'pão' || '%' AS ilike
      FROM public.phase15_product_candidates
      WHERE id = 'bread'
    `);
    expect(flags.rows[0]).toEqual({ fts: true, ilike: false });
    const page = await searchProducts({ query: "pão", limit: 100 });
    expect(page.rows.map((item) => item.id)).toContain("bread");
    expect(page.textPredicate).toBe("portuguese-fts-or-ilike");
  });

  it("matches sementes de milho through the semente lexeme and drops caminhão", async () => {
    const seed = await searchProducts({ query: "semente", limit: 100 });
    expect(seed.rows.map((item) => item.id)).toContain("seed");
    const truckFlags = await ownerPool.query<{ fts: boolean; ilike: boolean }>(`
      SELECT
        to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(seller_name, ''))
          @@ plainto_tsquery('portuguese', 'caminhão') AS fts,
        coalesce(title, '') ILIKE '%' || 'caminhão' || '%' AS ilike
      FROM public.phase15_product_candidates
      WHERE id = 'truck'
    `);
    expect(truckFlags.rows[0]).toEqual({ fts: false, ilike: false });
    const truck = await searchProducts({ query: "caminhão", limit: 100 });
    expect(truck.candidateCount).toBe(0);
    expect(truck.rows).toEqual([]);
  });

  it("keeps ações through the ILIKE fallback and keeps description ILIKE for products only", async () => {
    const training = await ownerPool.query<{ fts: boolean; ilike: boolean }>(`
      SELECT
        to_tsvector('portuguese', title) @@ plainto_tsquery('portuguese', 'ação') AS fts,
        title ILIKE '%' || 'ação' || '%' AS ilike
      FROM public.phase15_product_candidates
      WHERE id = 'training'
    `);
    expect(training.rows[0]).toEqual({ fts: false, ilike: true });
    const products = await searchProducts({ query: "ação", limit: 100 });
    expect(products.rows.map((item) => item.id)).toContain("training");

    const productAes = await searchProducts({ query: "ães", limit: 100 });
    expect(productAes.rows.map((item) => item.id)).toContain("desc-only");
    const serviceAes = await searchServices({ query: "ães", limit: 100 });
    expect(serviceAes.rows.map((item) => item.id)).not.toContain("svc-desc");
    const serviceBread = await searchServices({ query: "pão", limit: 100 });
    expect(serviceBread.rows.map((item) => item.id).sort()).toEqual(["svc-bread", "svc-desc"]);
  });

  it("applies text before pagination and keeps the price null order", async () => {
    const first = await searchProducts({ query: "milho", sortBy: "price_asc", limit: 2, offset: 0 });
    const second = await searchProducts({ query: "milho", sortBy: "price_asc", limit: 2, offset: 2 });
    const third = await searchProducts({ query: "milho", sortBy: "price_asc", limit: 2, offset: 4 });
    expect(first.totalCount).toBe(4);
    expect(first.candidateCount).toBe(4);
    expect(first.rows.map((item) => item.id)).toEqual(["cheap", "mid"]);
    expect(second.rows.map((item) => item.id)).toEqual(["dear", "blank"]);
    expect(third.rows).toEqual([]);
    const collected = [...first.rows, ...second.rows, ...third.rows].map((item) => item.id);
    expect(new Set(collected).size).toBe(collected.length);

    const decoy = await searchProducts({ query: "pão", sortBy: "price_asc", limit: 1, offset: 0 });
    expect(decoy.rows.map((item) => item.id)).toEqual(["far-bread"]);
    expect(decoy.totalCount).toBeGreaterThan(1);
    expect(decoy.rows.map((item) => item.id)).not.toContain("zzz-cheap");
  });

  it("filters status, category, province, municipality, availability, and price before the page", async () => {
    const open = await searchProducts({ query: null, limit: 100 });
    const blank = await searchProducts({ query: "", limit: 100 });
    expect(open.candidateCount).toBe(blank.candidateCount);
    expect(open.rows.map((item) => item.id)).not.toContain("draft");
    expect(open.rows.map((item) => item.id)).not.toContain("hidden-seller");
    expect(open.rows.map((item) => item.id)).toContain("published-row");

    const spaced = await searchProducts({ query: " ", limit: 100 });
    expect(spaced.rows.map((item) => item.id)).toContain("bread");
    expect(spaced.rows.map((item) => item.id)).not.toContain("blank");

    const category = await searchProducts({ query: "pão", categoryId: CATEGORY_A, limit: 100 });
    expect(category.rows.map((item) => item.id)).toEqual(["bread"]);
    const province = await searchProducts({ query: "pão", provinceId: PROVINCE_HUA, limit: 100 });
    expect(province.rows.map((item) => item.id)).toEqual(["huambo"]);
    const municipality = await searchProducts({ query: "pão", municipalityId: MUNICIPALITY, limit: 100 });
    expect(municipality.rows.map((item) => item.id)).toEqual(["bread"]);
    const stock = await searchProducts({ availabilityStatus: "out_of_stock", limit: 100 });
    expect(stock.rows.map((item) => item.id)).toEqual(["reserva"]);
    const prices = await searchProducts({ query: "milho", minPrice: 10, maxPrice: 20, limit: 100 });
    expect(prices.rows.map((item) => item.id)).toEqual(["mid"]);
  });

  it("pages a fixed catalogue without duplicates and breaks ties by id", async () => {
    const first = await searchProducts({ query: "igual", sortBy: "relevance", limit: 1, offset: 0 });
    const second = await searchProducts({ query: "igual", sortBy: "relevance", limit: 1, offset: 1 });
    expect(first.totalCount).toBe(2);
    expect(first.rows.map((item) => item.id)).toEqual(["tie-a"]);
    expect(second.rows.map((item) => item.id)).toEqual(["tie-b"]);
    expect(first.rows[0]?.id).not.toBe(second.rows[0]?.id);
  });

  it("keeps the seller-radius boundary inside a 10 km buyer search", async () => {
    const page = await searchProducts({
      query: "pão",
      latitude: LUANDA.latitude,
      longitude: LUANDA.longitude,
      radiusKm: 10,
      sortBy: "distance",
      limit: 10,
      offset: 0,
    });
    expect(page.candidateCount).toBe(6);
    expect(page.totalCount).toBe(5);
    expect(page.rows.map((item) => item.id)).toEqual(["bread", "huambo", "close", "desc-only", "boundary-bread"]);
    expect(page.rows.map((item) => item.id)).not.toContain("far-bread");
    expect(page.spatialPredicateApplied).toBe(true);
  });

  it("leaves the candidate table intact when search text looks like SQL", async () => {
    const query = "pão'; DROP TABLE public.phase15_product_candidates; --";
    const page = await searchProducts({ query, limit: 20 });
    expect(page.candidateCount).toBe(0);
    await expect(searchProducts({ categoryId: "not-a-uuid" })).rejects.toThrow(/uuid/i);
    const left = await ownerPool.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.phase15_product_candidates`);
    expect(left.rows[0]?.n).toBe(productCount);
  });

  it("sorts services by rating with nulls last and filters pricing type", async () => {
    const rating = await searchServices({ query: "consultoria", sortBy: "rating", limit: 10 });
    expect(rating.rows.map((item) => item.id)).toEqual(["svc-high", "svc-low", "svc-none"]);
    expect(rating.totalCount).toBe(3);
    const hourly = await searchServices({ query: "consultoria", pricingType: "hourly", limit: 10 });
    expect(hourly.rows.map((item) => item.id)).toEqual(["svc-high"]);
  });

  it("denies an unauthenticated runtime read and a forged insert", async () => {
    const bare = await runtimePool.connect();
    try {
      const hidden = await bare.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.private_notes`);
      expect(hidden.rows[0]?.n).toBe(0);
      await expect(
        bare.query(`INSERT INTO public.private_notes (owner_clerk_id, body) VALUES ('user_a', 'no-session')`),
      ).rejects.toThrow(/row-level security|policy/i);
    } finally {
      bare.release();
    }
    const still = await ownerPool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public.private_notes WHERE body = 'no-session'`,
    );
    expect(still.rows[0]?.n).toBe(0);
  });

  it("fails closed for empty, malformed, and service-role-only claims", async () => {
    const bare = await runtimePool.connect();
    try {
      await bare.query("BEGIN");
      for (const claims of ["not-json", "{}", '{"sub":""}', '{"role":"service_role"}']) {
        await bare.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
        const subject = await bare.query<{ id: string | null }>(`SELECT public.current_clerk_user_id() AS id`);
        const visible = await bare.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.private_notes`);
        expect(subject.rows[0]?.id ?? null).toBeNull();
        expect(visible.rows[0]?.n).toBe(0);
      }
      await bare.query("ROLLBACK");
    } finally {
      bare.release();
    }
  });

  it("isolates user A from user B and does not leak claims to the next checkout", async () => {
    const sessionA = sessionFromClerkAuth({ userId: "user_a" });
    const sessionB = sessionFromClerkAuth({ userId: "user_b" });
    const seenByA = await withAuthorizedCloudhikeTransaction(runtimePool, sessionA, async (client) => {
      const rows = await client.query<{ body: string }>(`SELECT body FROM public.private_notes ORDER BY body`);
      return rows.rows.map((item) => item.body);
    });
    expect(seenByA).toEqual(["a-secret"]);
    await expect(
      withAuthorizedCloudhikeTransaction(runtimePool, sessionA, async (client) => {
        await client.query(`INSERT INTO public.private_notes (owner_clerk_id, body) VALUES ('user_b', 'forged')`);
      }),
    ).rejects.toThrow(/row-level security|policy/i);

    const seenByB = await withAuthorizedCloudhikeTransaction(runtimePool, sessionB, async (client) => {
      const updated = await client.query(`UPDATE public.private_notes SET body = 'changed' WHERE owner_clerk_id = 'user_a' RETURNING id`);
      const deleted = await client.query(`DELETE FROM public.private_notes WHERE owner_clerk_id = 'user_a' RETURNING id`);
      const rows = await client.query<{ owner_clerk_id: string }>(`SELECT owner_clerk_id FROM public.private_notes`);
      expect(updated.rows).toEqual([]);
      expect(deleted.rows).toEqual([]);
      return rows.rows.map((item) => item.owner_clerk_id);
    });
    expect(seenByB).toEqual(["user_b"]);

    const ownerView = psql(DATABASE, `SELECT owner_clerk_id || ':' || body FROM public.private_notes ORDER BY owner_clerk_id`);
    expect(ownerView.trim().split("\n")).toEqual(["user_a:a-secret", "user_b:b-secret"]);

    const bare = await runtimePool.connect();
    try {
      const claims = await bare.query<{ claims: string }>(`SELECT current_setting('request.jwt.claims', true) AS claims`);
      const visible = await bare.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.private_notes`);
      expect(claims.rows[0]?.claims ?? "").toBe("");
      expect(visible.rows[0]?.n).toBe(0);
    } finally {
      bare.release();
    }
  });

  it("rolls back a runtime write when a later statement fails and does not retry as owner", async () => {
    await expect(
      withAuthorizedCloudhikeTransaction(runtimePool, sessionFromClerkAuth({ userId: "user_a" }), async (client) => {
        await client.query(`INSERT INTO public.private_notes (owner_clerk_id, body) VALUES ('user_a', 'temporary')`);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const left = await ownerPool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public.private_notes WHERE body = 'temporary'`,
    );
    expect(left.rows[0]?.n).toBe(0);
    await expect(
      withAuthorizedCloudhikeTransaction(ownerPool, sessionFromClerkAuth({ userId: "user_a" }), async () => "owner-work"),
    ).rejects.toMatchObject({ code: "privileged-connection" });
  });

  it("shows table-owner bypass, then FORCE, and blocks runtime DDL", async () => {
    await ownerPool.query(`ALTER TABLE public.private_notes NO FORCE ROW LEVEL SECURITY`);
    try {
      await ownerPool.query(`SELECT set_config('request.jwt.claims', $1, false)`, ['{"sub":"user_a","role":"authenticated"}']);
      const bypassed = await ownerPool.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.private_notes`);
      expect(bypassed.rows[0]?.n).toBe(2);
      await ownerPool.query(`ALTER TABLE public.private_notes FORCE ROW LEVEL SECURITY`);
      const forced = await ownerPool.query<{ body: string }>(`SELECT body FROM public.private_notes`);
      expect(forced.rows.map((item: { body: string }) => item.body)).toEqual(["a-secret"]);
    } finally {
      await ownerPool.query(`RESET request.jwt.claims`);
    }

    const bypassedRole = await bypassPool.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.private_notes`);
    expect(bypassedRole.rows[0]?.n).toBe(2);
    const superuser = psql(DATABASE, `SELECT count(*)::int FROM public.private_notes`);
    expect(superuser.trim()).toBe("2");

    const bare = await runtimePool.connect();
    try {
      const who = await bare.query<{ u: string }>(`SELECT current_user AS u`);
      expect(who.rows[0]?.u).toBe("cloudhike_runtime");
      await expect(bare.query(`CREATE TABLE public.phase15_denied (id integer)`)).rejects.toThrow(/permission denied/i);
      await expect(bare.query(`ALTER TABLE public.private_notes ADD COLUMN extra text`)).rejects.toThrow(/must be owner|permission denied/i);
      await bare.query(`GRANT INSERT ON public.phase15_product_candidates TO cloudhike_bypass`).catch((error: unknown) => error);
      const granted = await bare.query<{ can_insert: boolean }>(
        `SELECT has_table_privilege('cloudhike_bypass', 'public.phase15_product_candidates', 'INSERT') AS can_insert`,
      );
      // PostgreSQL may return a GRANT command tag without adding a privilege the role cannot grant.
      expect(granted.rows[0]?.can_insert).toBe(false);
      await expect(bare.query(`CREATE ROLE phase15_should_not_exist`)).rejects.toThrow(/permission denied/i);
    } finally {
      bare.release();
    }
    const attributes = await ownerPool.query<{ rolsuper: boolean; rolbypassrls: boolean; rolcreaterole: boolean }>(
      `SELECT rolsuper, rolbypassrls, rolcreaterole FROM pg_roles WHERE rolname = 'cloudhike_runtime'`,
    );
    expect(attributes.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false, rolcreaterole: false });
  });
});

function searchProducts(input: Parameters<typeof searchCloudhikeMarketplaceProducts>[1]) {
  return searchCloudhikeMarketplaceProducts({ query: (text, values) => runtimePool.query(text, values as never[]) }, input, PRODUCT_RELATION);
}

function searchServices(input: Parameters<typeof searchCloudhikeMarketplaceServices>[1]) {
  return searchCloudhikeMarketplaceServices({ query: (text, values) => runtimePool.query(text, values as never[]) }, input, SERVICE_RELATION);
}

function connection(user: string, password: string): pg.PoolConfig {
  return {
    host: "127.0.0.1",
    port: 5432,
    database: DATABASE,
    user,
    password,
    max: 1,
  };
}

function row(
  id: string,
  title: string,
  description: string | null,
  sellerName: string,
  extra: {
    price: number | null;
    createdAt?: string;
    status?: string;
    sellerStatus?: string;
    categoryId?: string | null;
    provinceId?: string;
    municipalityId?: string | null;
    availability?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  },
): unknown[] {
  return [
    id,
    title,
    description,
    sellerName,
    extra.status ?? "active",
    extra.sellerStatus ?? "active",
    extra.categoryId ?? null,
    extra.provinceId ?? PROVINCE_LUA,
    extra.municipalityId ?? null,
    extra.availability ?? "in_stock",
    extra.price,
    extra.latitude ?? LUANDA.latitude,
    extra.longitude ?? LUANDA.longitude,
    extra.radiusKm ?? 50,
    false,
    extra.createdAt ?? "2026-01-01T00:00:00Z",
  ];
}

function localPostgres(): boolean {
  try {
    const output = execFileSync("sudo", ["-u", "postgres", "psql", "-d", "postgres", "-tAc", "SELECT inet_server_addr() IS NULL"], {
      encoding: "utf8",
    });
    return output.trim() === "t";
  } catch {
    return false;
  }
}

function psql(database: string, sql: string): string {
  return execFileSync("sudo", ["-u", "postgres", "psql", "-d", database, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-t", "-A"], {
    encoding: "utf8",
    input: sql,
  });
}
