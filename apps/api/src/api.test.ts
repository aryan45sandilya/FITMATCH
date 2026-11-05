import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createPglite, setDb, type Database } from "./db/index.js";
import { migrate } from "./db/migrate.js";
import { seed } from "./db/seed.js";
import { INSUFFICIENT_MESSAGE } from "./engine/types.js";

let db: Database;
const app = createApp();
const ADMIN = { email: "admin@test.local", password: "admin-test-pass-1" };

beforeAll(async () => {
  db = await createPglite();
  setDb(db);
  await migrate(db, () => {});
  await seed(db, { adminEmail: ADMIN.email, adminPassword: ADMIN.password, log: () => {} });
});
afterAll(async () => {
  await db.close();
  setDb(undefined);
});

const measurements = { chest: 100, shoulder: 45, neck: 39.5, sleeve: 85, waist: 84, hip: 100, thigh: 58, inseam: 80, arm_length: 62 };

async function signup(email = `u${Math.random().toString(36).slice(2)}@test.local`) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/signup").send({ fullName: "Avery Tester", email, password: "correct-horse-9" });
  expect(res.status).toBe(201);
  return { agent, res, email };
}

describe("auth", () => {
  it("signs up, reads the session, logs out", async () => {
    const { agent, res } = await signup();
    expect(res.body.user.fullName).toBe("Avery Tester");
    expect(res.body.user.emailVerified).toBe(false);
    expect(res.body.devVerificationUrl).toMatch(/verify-email\?token=/);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/fm_session=.*HttpOnly/i);
    expect((await agent.get("/api/auth/me")).body.user.email).toMatch(/@test.local/);
    await agent.post("/api/auth/logout");
    expect((await agent.get("/api/auth/me")).body.user).toBeNull();
  });

  it("verifies email with a single-use token", async () => {
    const { agent, res } = await signup();
    const token = new URL(res.body.devVerificationUrl).searchParams.get("token");
    expect((await agent.post("/api/auth/verify-email").send({ token })).status).toBe(200);
    expect((await agent.get("/api/auth/me")).body.user.emailVerified).toBe(true);
    expect((await agent.post("/api/auth/verify-email").send({ token })).status).toBe(400);
  });

  it("rejects weak passwords and duplicate emails", async () => {
    const weak = await request(app).post("/api/auth/signup").send({ fullName: "A", email: "weak@test.local", password: "short" });
    expect(weak.status).toBe(422);
    expect(weak.body.error.details.password).toBeTruthy();
    const { email } = await signup();
    const dup = await request(app).post("/api/auth/signup").send({ fullName: "B", email: email.toUpperCase(), password: "correct-horse-9" });
    expect(dup.status).toBe(409);
  });

  it("logs in with correct credentials only", async () => {
    const { email } = await signup();
    expect((await request(app).post("/api/auth/login").send({ email, password: "wrong-password-1" })).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email, password: "correct-horse-9" })).status).toBe(200);
  });

  it("resets a password and revokes old sessions", async () => {
    const { agent, email } = await signup();
    const forgot = await request(app).post("/api/auth/forgot-password").send({ email });
    const token = new URL(forgot.body.devResetUrl).searchParams.get("token");
    const reset = await request(app).post("/api/auth/reset-password").send({ token, password: "brand-new-pass-2" });
    expect(reset.status).toBe(200);
    expect((await agent.get("/api/auth/me")).body.user).toBeNull();
    expect((await request(app).post("/api/auth/login").send({ email, password: "brand-new-pass-2" })).status).toBe(200);
    // unknown email gets the same response shape
    expect((await request(app).post("/api/auth/forgot-password").send({ email: "nobody@test.local" })).body.ok).toBe(true);
  });

  it("blocks cross-origin writes", async () => {
    const res = await request(app).post("/api/auth/login").set("Origin", "https://evil.example").send({ email: "a@b.co", password: "x" });
    expect(res.status).toBe(403);
  });
});

describe("measurement profile → recommendation journey", () => {
  it("requires auth for private data", async () => {
    expect((await request(app).get("/api/profiles")).status).toBe(401);
    expect((await request(app).get("/api/me/dashboard")).status).toBe(401);
  });

  it("validates measurement ranges", async () => {
    const { agent } = await signup();
    const res = await agent.post("/api/profiles").send({ heightCm: 180, measurements: { chest: 20 } });
    expect(res.status).toBe(422);
    expect(res.body.error.details["measurements.chest"]).toMatch(/between 60 and 170/);
  });

  it("creates a profile, gets product and brand recommendations, compares brands, leaves feedback", async () => {
    const { agent } = await signup();
    const created = await agent.post("/api/profiles").send({ name: "Everyday", heightCm: 180, weightKg: 76, measurements, fitPreference: "regular" });
    expect(created.status).toBe(201);
    expect(created.body.profile.isPrimary).toBe(true);
    expect(created.body.profile.measurements.chest).toBe(100);

    // H&M has a real (sourced) India chart, which beats the product's demo garment data.
    const product = await agent.post("/api/recommendations").send({ productSlug: "hm-regular-fit-cotton-tee" });
    expect(product.status).toBe(200);
    expect(product.body.result.status).toBe("ok");
    expect(product.body.result.basis).toBe("body_chart");
    expect(product.body.result.isDemoData).toBe(false);
    expect(product.body.market).toBe("IN");

    // Uniqlo has no sourced chart, so the product's (demo) garment data is used.
    const garment = await agent.post("/api/recommendations").send({ productSlug: "uniqlo-supima-crew-tee" });
    expect(garment.body.result.basis).toBe("garment");
    expect(garment.body.result.isDemoData).toBe(true);

    const brand = await agent.post("/api/recommendations").send({ brandSlug: "levis", categorySlug: "jeans" });
    expect(brand.body.result.status).toBe("ok");
    expect(brand.body.result.basis).toBe("body_chart");

    // Nike's joggers have no garment data but Nike publishes a bottoms chart, so they now get a real result.
    const joggers = await agent.post("/api/recommendations").send({ productSlug: "nike-tech-knit-joggers" });
    expect(joggers.body.result.status).toBe("ok");
    expect(joggers.body.result.isDemoData).toBe(false);

    // Zara publishes no general chart and has no shorts data at all: no guessing.
    const none = await agent.post("/api/recommendations").send({ brandSlug: "zara", categorySlug: "shorts" });
    expect(none.body.result.status).toBe("insufficient_data");
    expect(none.body.result.message).toBe(INSUFFICIENT_MESSAGE);

    const compare = await agent.post("/api/compare").send({ categorySlug: "t-shirts" });
    expect(compare.status).toBe(200);
    const sizes = Object.fromEntries(compare.body.rows.map((r: { brand: { slug: string }; result: { recommendedSize: string } }) => [r.brand.slug, r.result.recommendedSize]));
    expect(Object.keys(sizes)).toEqual(expect.arrayContaining(["hm", "zara", "uniqlo", "nike"]));
    expect(sizes.hm).toBe("M");

    const reference = await agent.post("/api/compare").send({ categorySlug: "t-shirts", reference: { brandSlug: "hm", size: "M" } });
    expect(reference.body.referenceNote).toMatch(/H&M size M/);
    expect(reference.body.rows[0].result.confidenceReasons.join(" ")).toMatch(/estimates/);

    const fb = await agent.post("/api/me/feedback").send({
      recommendationId: product.body.recommendationId, purchasedSize: "M", overallFit: "slightly_tight", lengthFit: "right", shoulderFit: "comfortable", wouldBuySameSize: false,
    });
    expect(fb.status).toBe(201);

    // The user's own feedback nudges their next H&M T-shirt recommendation.
    const again = await agent.post("/api/recommendations").send({ productSlug: "hm-regular-fit-cotton-tee" });
    expect(again.body.result.adjustments.join(" ")).toMatch(/felt tight/);

    const dash = await agent.get("/api/me/dashboard");
    expect(dash.body.primaryProfile.name).toBe("Everyday");
    expect(dash.body.recentRecommendations.length).toBeGreaterThanOrEqual(3);
    expect(dash.body.recentBrands.length).toBeGreaterThan(0);
    expect(dash.body.recentFeedback).toHaveLength(1);
  });

  it("asks for missing measurements instead of guessing", async () => {
    const { agent } = await signup();
    await agent.post("/api/profiles").send({ heightCm: 175, measurements: { chest: 98 } });
    const res = await agent.post("/api/recommendations").send({ brandSlug: "hm", categorySlug: "shirts" });
    expect(res.body.result.status).toBe("missing_measurements");
    expect(res.body.result.missing).toEqual(["neck"]);
  });

  it("lists products with per-user recommendations and saves products", async () => {
    const { agent } = await signup();
    await agent.post("/api/profiles").send({ heightCm: 180, measurements });
    const list = await agent.get("/api/products?category=t-shirts&sort=fit");
    expect(list.status).toBe(200);
    expect(list.body.products.length).toBeGreaterThan(3);
    expect(list.body.products[0].recommendation.status).toBe("ok");
    const id = list.body.products[0].id;
    await agent.put(`/api/me/saved/${id}`);
    expect((await agent.get("/api/me/saved")).body.products[0].id).toBe(id);
    await agent.delete(`/api/me/saved/${id}`);
    expect((await agent.get("/api/me/saved")).body.products).toHaveLength(0);
  });

  it("serves public catalogue data without auth", async () => {
    const detail = await request(app).get("/api/products/levis-original-straight-jeans");
    expect(detail.status).toBe(200);
    expect(detail.body.recommendation).toBeNull();
    expect(detail.body.garment.sizes.length).toBeGreaterThan(3);
    expect(detail.body.chart.isDemo).toBe(false);
    expect(detail.body.chart.market).toBe("UK_EU"); // Levi's publishes no India chart
    expect(detail.body.chart.sourceUrl.startsWith("https://www.levi.com/")).toBe(true);
    const brands = await request(app).get("/api/brands");
    expect(brands.body.brands).toHaveLength(10);
  });
});

describe("markets", () => {
  it("uses each market's own published chart and labels fallbacks", async () => {
    const { agent } = await signup();
    await agent.post("/api/profiles").send({ heightCm: 180, measurements });

    const india = await agent.post("/api/recommendations").send({ brandSlug: "hm", categorySlug: "t-shirts" });
    expect(india.body.chart.market).toBe("IN");
    expect(india.body.chart.isDemo).toBe(false);

    await agent.patch("/api/auth/account").send({ market: "US" });
    const us = await agent.post("/api/recommendations").send({ brandSlug: "hm", categorySlug: "t-shirts" });
    expect(us.body.market).toBe("US");
    expect(us.body.chart.market).toBe("US");
    // US chart: M covers chest 94–102 cm, so a 100 cm chest is comfortably M.
    expect(us.body.result.recommendedSize).toBe("M");

    await agent.patch("/api/auth/account").send({ market: "IN" });
    const levis = await agent.post("/api/recommendations").send({ brandSlug: "levis", categorySlug: "jeans" });
    expect(levis.body.chart.market).toBe("UK_EU");
    expect(levis.body.result.confidenceReasons.join(" ")).toMatch(/UK & Europe chart.*no India chart/);
  });

  it("compares brands for an explicitly chosen market", async () => {
    const { agent } = await signup();
    await agent.post("/api/profiles").send({ heightCm: 180, measurements });
    const res = await agent.post("/api/compare").send({ categorySlug: "t-shirts", market: "UK_EU" });
    expect(res.body.market).toBe("UK_EU");
    const nike = res.body.rows.find((r: { brand: { slug: string } }) => r.brand.slug === "nike");
    expect(nike.chart.market).toBe("UK_EU");
    expect(nike.chart.isDemo).toBe(false);
    // Zara publishes no general chart anywhere, so it stays on clearly-labelled demo data.
    const zara = res.body.rows.find((r: { brand: { slug: string } }) => r.brand.slug === "zara");
    expect(zara.chart.isDemo).toBe(true);
  });

  it("lists brands for a category with the chart each market would use (size finder brand step)", async () => {
    const res = await request(app).get("/api/categories/t-shirts/brands?market=IN");
    expect(res.status).toBe(200);
    const by = Object.fromEntries(res.body.brands.map((b: { slug: string; chartMarket: string; chartIsSourced: boolean }) => [b.slug, b]));
    expect(by.hm.chartMarket).toBe("IN");
    expect(by.hm.chartIsSourced).toBe(true);
    expect(by.levis.chartMarket).toBe("UK_EU");
    expect(by.zara.chartIsSourced).toBe(false);
  });

  it("prices products in the shopper's market currency", async () => {
    const get = (m: string) => request(app).get(`/api/products?market=${m}&search=Regular Fit Cotton`).then((r) => r.body);
    const [india, us, uk] = await Promise.all([get("IN"), get("US"), get("UK_EU")]);
    expect(india.products[0]).toMatchObject({ currency: "INR", price: 799 });
    expect(us.products[0]).toMatchObject({ currency: "USD", price: 12.99 });
    expect(uk.products[0]).toMatchObject({ currency: "GBP", price: 9.99 });
    expect(india.priceRange.currency).toBe("INR");
    // Price filters apply in the market's currency
    const cheap = await request(app).get("/api/products?market=IN&maxPrice=900");
    expect(cheap.body.products.every((p: { price: number; currency: string }) => p.currency === "INR" && p.price <= 900)).toBe(true);
  });

  it("lets admins set a real price for one market", async () => {
    const admin = request.agent(app);
    await admin.post("/api/auth/login").send(ADMIN);
    const list = await admin.get("/api/admin/products?search=Regular Fit Cotton T-shirt");
    const id = list.body.products[0].id;
    expect((await admin.put(`/api/admin/products/${id}/prices`).send({ prices: { IN: { amount: 899, currency: "INR" } } })).status).toBe(200);
    const detail = await admin.get(`/api/admin/products/${id}`);
    expect(detail.body.prices.find((p: { market: string }) => p.market === "IN")).toMatchObject({ amount: 899, isDemo: false });
    const shopper = await request(app).get("/api/products/hm-regular-fit-cotton-tee?market=IN");
    expect(shopper.body.product.price).toBe(899);
  });

  it("stores the market chosen at sign-up", async () => {
    const res = await request(app).post("/api/auth/signup").send({ fullName: "Sam", email: `m${Date.now()}@test.local`, password: "correct-horse-9", market: "UK_EU" });
    expect(res.body.user.market).toBe("UK_EU");
  });
});

describe("admin", () => {
  it("is forbidden to regular users", async () => {
    const { agent } = await signup();
    expect((await agent.get("/api/admin/overview")).status).toBe(403);
  });

  it("manages charts with provenance and refuses to verify demo data", async () => {
    const agent = request.agent(app);
    expect((await agent.post("/api/auth/login").send(ADMIN)).status).toBe(200);
    const overview = await agent.get("/api/admin/overview");
    expect(overview.body.counts.brands).toBe(10);

    const charts = await agent.get("/api/admin/charts");
    const demo = charts.body.charts.find((c: { isDemo: boolean }) => c.isDemo);
    const refuse = await agent.post(`/api/admin/charts/${demo.id}/verification`).send({ status: "verified" });
    expect(refuse.status).toBe(422);

    const brands = await agent.get("/api/admin/brands");
    const brandId = brands.body.brands[0].id;
    const cats = await agent.get("/api/admin/categories");
    const created = await agent.post("/api/admin/charts").send({
      brandId, categoryId: cats.body.categories[0].id, audience: "unisex", name: "Sourced test chart",
      source: "Brand size guide page", sourceUrl: "https://example.com/size-guide", collectedAt: "2026-11-01",
      sizes: [{ label: "S", points: { chest: { min: 88, max: 95 } } }, { label: "M", points: { chest: { min: 96, max: 103 } } }],
    });
    expect(created.status).toBe(201);
    const verify = await agent.post(`/api/admin/charts/${created.body.id}/verification`).send({ status: "verified" });
    expect(verify.status).toBe(200);
    const after = await agent.get(`/api/admin/charts/${created.body.id}`);
    expect(after.body.chart.verification).toBe("verified");

    // Editing the numbers resets verification.
    await agent.put(`/api/admin/charts/${created.body.id}`).send({
      brandId, categoryId: cats.body.categories[0].id, audience: "unisex", name: "Sourced test chart",
      source: "Brand size guide page", sourceUrl: "https://example.com/size-guide", collectedAt: "2026-11-02",
      sizes: [{ label: "M", points: { chest: { min: 97, max: 104 } } }],
    });
    expect((await agent.get(`/api/admin/charts/${created.body.id}`)).body.chart.verification).toBe("unverified");
  });

  it("replaces product garment measurements with provenance", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send(ADMIN);
    const list = await agent.get("/api/admin/products?search=Joggers");
    const id = list.body.products[0].id;
    const res = await agent.put(`/api/admin/products/${id}/sizes`).send({
      source: "Measured in store, flat", collectedAt: "2026-11-03", verification: "pending",
      sizes: [
        { label: "S", measurements: { waist: 76, hip: 98, thigh: 60, inseam: 76 } },
        { label: "M", measurements: { waist: 82, hip: 104, thigh: 63, inseam: 77 } },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.garment.verification).toBe("pending");
    expect(res.body.garment.sizes).toHaveLength(2);
  });
});
