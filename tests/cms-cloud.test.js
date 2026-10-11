const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { createEnv } = require("./helpers");

const CLOUD = {
  supabaseUrl: "https://testref.supabase.co",
  supabaseAnonKey: "sb_publishable_unit",
  saveFunctionUrl: "https://testref.supabase.co/functions/v1/save-site",
  storageBucket: "changlong-cms",
  defaultEditPassword: "763560"
};

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}

describe("CMSCloud config", () => {
  test("getConfig strips /rest/v1 suffix and trailing slash", () => {
    const { api } = createEnv({
      cloud: { ...CLOUD, supabaseUrl: "https://testref.supabase.co/rest/v1/" }
    });
    assert.equal(api.CMSCloud.getConfig().supabaseUrl, "https://testref.supabase.co");
  });

  test("getConfig trims key values", () => {
    const { api } = createEnv({
      cloud: { ...CLOUD, supabaseAnonKey: "  key123  ", storageBucket: " bucket-x " }
    });
    const cfg = api.CMSCloud.getConfig();
    assert.equal(cfg.supabaseAnonKey, "key123");
    assert.equal(cfg.storageBucket, "bucket-x");
  });

  test("isEnabled only true when url and key both present", () => {
    const on = createEnv({ cloud: CLOUD });
    assert.equal(on.api.CMSCloud.isEnabled(), true);
    const off = createEnv({ cloud: { ...CLOUD, supabaseAnonKey: "" } });
    assert.equal(off.api.CMSCloud.isEnabled(), false);
  });

  test("authHeaders carries apikey and Bearer", () => {
    const { api } = createEnv({ cloud: CLOUD });
    const h = api.CMSCloud.authHeaders(api.CMSCloud.getConfig());
    assert.equal(h.apikey, "sb_publishable_unit");
    assert.equal(h.Authorization, "Bearer sb_publishable_unit");
  });
});

describe("CMSCloud content helpers", () => {
  test("hasContent ignores empty and timestamp-only objects", () => {
    const { api } = createEnv();
    assert.equal(api.CMSCloud.hasContent(null), false);
    assert.equal(api.CMSCloud.hasContent({}), false);
    assert.equal(api.CMSCloud.hasContent({ _cmsUpdatedAt: 123 }), false);
    assert.equal(api.CMSCloud.hasContent({ site: {} }), true);
  });

  test("pickNewer uses _cmsUpdatedAt with sensible fallbacks", () => {
    const { api } = createEnv();
    const local = { site: { a: 1 }, _cmsUpdatedAt: 200 };
    const remote = { site: { a: 2 }, _cmsUpdatedAt: 100 };
    assert.equal(api.CMSCloud.pickNewer(local, remote), local);
    assert.equal(api.CMSCloud.pickNewer(local, { ...remote, _cmsUpdatedAt: 300 }).site.a, 2);
    assert.equal(api.CMSCloud.pickNewer(null, remote), remote);
    assert.equal(api.CMSCloud.pickNewer(local, null), local);
    // remote has no real content -> keep local
    assert.equal(api.CMSCloud.pickNewer(local, { _cmsUpdatedAt: 999 }), local);
    // local has no content but remote does -> take remote
    assert.equal(
      api.CMSCloud.pickNewer({ _cmsUpdatedAt: 1 }, { site: {}, _cmsUpdatedAt: 0 }).site !== undefined,
      true
    );
  });

  test("applyRemoteMeta parses ISO updated_at into epoch ms", () => {
    const { api } = createEnv();
    const data = { site: {} };
    const out = api.CMSCloud.applyRemoteMeta(data, "2026-06-21T08:47:02.000Z");
    assert.equal(out._cmsUpdatedAt, Date.parse("2026-06-21T08:47:02.000Z"));
  });

  test("collectMediaRefs finds nested media_ ids in arrays/objects", () => {
    const { api } = createEnv();
    const refs = new Set();
    api.CMSCloud.collectMediaRefs({
      a: "media_1_a",
      b: ["x", { c: "media_2_b" }, [{ d: "media_1_a" }]],
      e: "not-a-media"
    }, refs);
    assert.equal(refs.size, 2);
    assert.ok(refs.has("media_1_a"));
    assert.ok(refs.has("media_2_b"));
  });

  test("replaceMediaRefs rewrites nested strings but keeps others", () => {
    const { api } = createEnv();
    const data = { a: ["media_1", { b: "media_2", c: "keep" }] };
    const map = new Map([["media_1", "https://x/1.jpg"], ["media_2", "https://x/2.png"]]);
    api.CMSCloud.replaceMediaRefs(data, map);
    assert.equal(data.a[0], "https://x/1.jpg");
    assert.equal(data.a[1].b, "https://x/2.png");
    assert.equal(data.a[1].c, "keep");
  });
});

describe("CMSCloud storage naming", () => {
  test("extFromMime maps known types and falls back to name extension", () => {
    const { api } = createEnv();
    assert.equal(api.CMSCloud.extFromMime("image/jpeg"), "jpg");
    assert.equal(api.CMSCloud.extFromMime("image/svg+xml"), "svg");
    assert.equal(api.CMSCloud.extFromMime("video/webm"), "webm");
    assert.equal(api.CMSCloud.extFromMime("application/octet-stream", "photo.PNG"), "png");
    assert.equal(api.CMSCloud.extFromMime("application/octet-stream", "weird-toolongext"), "bin");
  });

  test("storageObjectBase sanitizes illegal characters", () => {
    const { api } = createEnv();
    assert.equal(
      api.CMSCloud.storageObjectBase("media_1781/../x a"),
      "media/media_1781____x_a"
    );
  });

  test("publicStorageUrl builds public object URL", () => {
    const { api } = createEnv({ cloud: CLOUD });
    const url = api.CMSCloud.publicStorageUrl(api.CMSCloud.getConfig(), "media/m1.jpg");
    assert.equal(
      url,
      "https://testref.supabase.co/storage/v1/object/public/changlong-cms/media/m1.jpg"
    );
  });
});

describe("CMSCloud fetchRemote", () => {
  test("success: returns row content with remote timestamp", async () => {
    const env = createEnv({
      cloud: CLOUD,
      fetchImpl: async (url) => {
        assert.match(String(url), /\/rest\/v1\/site_content\?id=eq\.1/);
        return jsonResponse([{ content: { site: { name: "云端茶舍" } }, updated_at: "2026-06-21T08:47:02.000Z" }]);
      }
    });
    const data = await env.api.CMSCloud.fetchRemote();
    assert.equal(data.site.name, "云端茶舍");
    assert.equal(data._cmsUpdatedAt, Date.parse("2026-06-21T08:47:02.000Z"));
  });

  test("non-ok REST response falls back to static JSON", async () => {
    let called = 0;
    const env = createEnv({
      cloud: CLOUD,
      fetchImpl: async (url) => {
        called += 1;
        if (String(url).includes("/rest/v1/")) return jsonResponse(null, false, 503);
        if (String(url).includes("site-data.json")) {
          return jsonResponse({ site: { name: "静态兜底" } });
        }
        return jsonResponse(null, false, 404);
      }
    });
    const data = await env.api.CMSCloud.fetchRemote();
    assert.equal(data.site.name, "静态兜底");
    assert.ok(called >= 2);
  });

  test("empty remote content falls back", async () => {
    const env = createEnv({
      cloud: CLOUD,
      fetchImpl: async (url) => {
        if (String(url).includes("/rest/v1/")) return jsonResponse([{ content: {}, updated_at: null }]);
        return jsonResponse({ site: { name: "静态" } });
      }
    });
    const data = await env.api.CMSCloud.fetchRemote();
    assert.equal(data.site.name, "静态");
  });

  test("network error falls back instead of throwing", async () => {
    const env = createEnv({
      cloud: CLOUD,
      fetchImpl: async () => { throw new TypeError("fetch failed"); }
    });
    const data = await env.api.CMSCloud.fetchRemote();
    assert.equal(data, null); // static file also unavailable -> null, no throw
  });

  test("cloud disabled -> static fallback directly", async () => {
    const env = createEnv({
      cloud: { ...CLOUD, supabaseUrl: "", supabaseAnonKey: "" },
      fetchImpl: async () => jsonResponse({ site: { name: "离线数据" } })
    });
    const data = await env.api.CMSCloud.fetchRemote();
    assert.equal(data.site.name, "离线数据");
  });
});

describe("CMSCloud storage URL resolution", () => {
  test("tries extensions in order and caches hit", async () => {
    const env = createEnv({
      cloud: CLOUD,
      fetchImpl: async (url, options) => {
        assert.equal(options.method, "HEAD");
        return String(url).endsWith(".png")
          ? { ok: true, status: 200 }
          : { ok: false, status: 400 };
      }
    });
    const url1 = await env.api.CMSCloud.resolveStorageUrl("media_abc");
    assert.match(url1, /\/media\/media_abc\.png$/);
    const probesBefore = env.fetchCalls.length;
    const url2 = await env.api.CMSCloud.resolveStorageUrl("media_abc");
    assert.equal(url2, url1);
    assert.equal(env.fetchCalls.length, probesBefore, "cache should avoid refetch");
  });

  test("non-media ids resolve to empty string", async () => {
    const env = createEnv({ cloud: CLOUD });
    assert.equal(await env.api.CMSCloud.resolveStorageUrl("assets/logo.svg"), "");
  });
});

describe("CMSCloud save API", () => {
  test("callSaveApi posts JSON and parses response", async () => {
    const env = createEnv({
      cloud: CLOUD,
      fetchImpl: async (url, options) => {
        assert.equal(url, CLOUD.saveFunctionUrl);
        assert.equal(options.method, "POST");
        const body = JSON.parse(options.body);
        assert.equal(body.action, "verify");
        return jsonResponse({ ok: true });
      }
    });
    const result = await env.api.CMSCloud.callSaveApi({ action: "verify" });
    assert.equal(result.ok, true);
    assert.deepEqual(result.body, { ok: true });
  });
});
