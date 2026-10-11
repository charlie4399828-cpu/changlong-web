const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const { createEnv, plain } = require("./helpers");

let env;
before(() => { env = createEnv(); });

describe("CMS.buildDefaultData", () => {
  test("contains all six content sections", () => {
    const d = env.api.CMS.buildDefaultData();
    for (const key of ["site", "carousel", "about", "productsSection", "products", "contact"]) {
      assert.ok(d[key], `missing section: ${key}`);
    }
  });

  test("has 3 default carousel slides and contact cards", () => {
    const d = env.api.CMS.buildDefaultData();
    assert.equal(d.carousel.slides.length, 3);
    assert.equal(d.contact.cards.length, 2);
    assert.equal(d.contact.cards[0].phone, "13769148246");
  });

  test("product categories always have seasonal/hot/all", () => {
    const d = env.api.CMS.buildDefaultData();
    assert.deepEqual(Object.keys(d.products).sort(), ["all", "hot", "seasonal"]);
  });
});

describe("CMS.deepMerge", () => {
  test("nested objects merge, arrays replaced wholesale", () => {
    const { CMS } = env.api;
    const out = CMS.deepMerge(
      { a: { x: 1, y: 2 }, list: [1, 2] },
      { a: { y: 9, z: 3 }, list: [9] }
    );
    assert.deepEqual(plain(out.a), { x: 1, y: 9, z: 3 });
    assert.deepEqual(plain(out.list), [9]);
  });

  test("does not mutate the defaults object", () => {
    const { CMS } = env.api;
    const defaults = { a: { x: 1 } };
    CMS.deepMerge(defaults, { a: { x: 2 } });
    assert.equal(defaults.a.x, 1);
  });

  test("null/empty source is safe", () => {
    const { CMS } = env.api;
    assert.deepEqual(plain(CMS.deepMerge({ a: 1 }, null)), { a: 1 });
  });
});

describe("CMS product merging", () => {
  test("saved product overlays default by id and fills gallery/media", () => {
    const { CMS } = env.api;
    const defaults = {
      seasonal: [{ id: "tea-1", name: "龙井", desc: "默认描述", media: "assets/a.jpg", gallery: ["g1"] }]
    };
    const saved = {
      seasonal: [{ id: "tea-1", name: "明前龙井", price: "188" }]
    };
    const out = CMS.mergeProductCategories(defaults, saved);
    assert.equal(out.seasonal.length, 1);
    assert.equal(out.seasonal[0].name, "明前龙井");
    assert.equal(out.seasonal[0].desc, "默认描述", "default-only field retained");
    assert.equal(out.seasonal[0].price, "188");
    assert.deepEqual(plain(out.seasonal[0].gallery), ["g1"]);
  });

  test("unknown saved product still gets normalized fields", () => {
    const { CMS } = env.api;
    const out = CMS.mergeProductCategories({ seasonal: [] }, { seasonal: [{ id: "new", name: "新茶" }] });
    assert.equal(out.seasonal[0].media, "");
    assert.equal(out.seasonal[0].mediaType, "placeholder");
    assert.deepEqual(plain(out.seasonal[0].gallery), []);
  });
});

describe("CMS contact normalization", () => {
  test("empty cards array rebuilds founder card from legacy fields", () => {
    const { CMS } = env.api;
    CMS.data = { contact: { cards: [], name: "掌柜", phone: "13900000000", bio: "茶人" } };
    CMS.normalizeContact();
    assert.equal(CMS.data.contact.cards.length, 1);
    assert.equal(CMS.data.contact.cards[0].name, "掌柜");
    assert.equal(CMS.data.contact.cards[0].phone, "13900000000");
    assert.deepEqual(plain(CMS.data.contact.cards[0].story.paragraphs), []);
  });

  test("existing cards get story defaults", () => {
    const { CMS } = env.api;
    CMS.data = { contact: { cards: [{ id: "store", name: "门店" }] } };
    CMS.normalizeContact();
    assert.equal(CMS.data.contact.cards[0].story.title, "我的故事");
    assert.deepEqual(plain(CMS.data.contact.cards[0].story.images), []);
  });
});

describe("CMS product modules + lookups", () => {
  test("missing modules section restores defaults", () => {
    const { CMS } = env.api;
    CMS.data = { productsSection: {}, products: {} };
    const mods = CMS.getProductModules();
    assert.deepEqual(plain(mods.map(m => m.key)), ["seasonal", "hot"]);
    assert.equal(CMS.data.productsSection.allLabel, "全部商品");
  });

  test("getProductById dedupes across categories", () => {
    const { CMS } = env.api;
    CMS.data = {
      productsSection: { modules: [{ key: "seasonal", label: "当季" }] },
      products: {
        seasonal: [{ id: "p1", name: "A", gallery: [] }],
        hot: [{ id: "p1", name: "A 重复" }, { id: "p2", name: "B" }],
        all: []
      }
    };
    assert.equal(CMS.getProductById("p1").name, "A");
    assert.equal(CMS.getProductById("p2").name, "B");
    assert.equal(CMS.getProductById("nope"), null);
  });
});

describe("CMS.init cloud/local selection", () => {
  test("remote newer wins and is cached to localStorage", async () => {
    const remoteEnv = createEnv({
      fetchImpl: async (url) => {
        if (String(url).includes("/rest/v1/")) {
          return {
            ok: true,
            status: 200,
            json: async () => [{
              updated_at: "2099-01-01T00:00:00.000Z",
              content: { site: { name: "云端最新" } }
            }]
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      }
    });
    const data = await remoteEnv.api.CMS.init();
    assert.equal(data.site.name, "云端最新");
    const cached = JSON.parse(remoteEnv.sandbox.localStorage.getItem("changlong_site_data"));
    assert.equal(cached.site.name, "云端最新");
  });

  test("local newer content is kept over older cloud snapshot", async () => {
    const localEnv = createEnv({
      fetchImpl: async (url) => {
        if (String(url).includes("/rest/v1/")) {
          return {
            ok: true,
            json: async () => [{
              updated_at: "2000-01-01T00:00:00.000Z",
              content: { site: { name: "云端很旧" } }
            }]
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      }
    });
    const localData = localEnv.api.CMS.buildDefaultData();
    localData.site.name = "本机最新";
    localData._cmsUpdatedAt = Date.parse("2099-06-01T00:00:00.000Z");
    localEnv.api.persistSiteData(localData);

    const data = await localEnv.api.CMS.init();
    assert.equal(data.site.name, "本机最新");
  });

  test("cloud unavailable still renders defaults without throwing", async () => {
    const offlineEnv = createEnv({ fetchImpl: async () => { throw new Error("network down"); } });
    const data = await offlineEnv.api.CMS.init();
    assert.equal(data.site.name, "昌隆茶舍");
  });
});

describe("CMS.save local persistence", () => {
  test("save with syncCloud=false persists immediately and bumps version", async () => {
    const saveEnv = createEnv({ fetchImpl: async () => { throw new Error("must not call network"); } });
    await saveEnv.api.CMS.init();
    saveEnv.api.CMS.data.site.name = "保存测试";
    await saveEnv.api.CMS.save([], { syncCloud: false });

    const stored = JSON.parse(saveEnv.sandbox.localStorage.getItem("changlong_site_data"));
    assert.equal(stored.site.name, "保存测试");
    assert.equal(typeof stored._cmsUpdatedAt, "number");
    assert.notEqual(saveEnv.api.getCMSVersion(), "0");
  });
});
