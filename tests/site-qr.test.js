const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { createEnv } = require("./helpers");

describe("normalizePublicUrl", () => {
  test("empty values become empty string", () => {
    const { api } = createEnv();
    assert.equal(api.normalizePublicUrl(""), "");
    assert.equal(api.normalizePublicUrl(null), "");
    assert.equal(api.normalizePublicUrl("   "), "");
  });

  test("prepends https when scheme missing, keeps http when present", () => {
    const { api } = createEnv();
    assert.equal(api.normalizePublicUrl("example.com"), "https://example.com/");
    assert.equal(api.normalizePublicUrl("http://example.com"), "http://example.com/");
  });

  test("collapses multiple trailing slashes into one", () => {
    const { api } = createEnv();
    assert.equal(api.normalizePublicUrl("https://example.com/a///"), "https://example.com/a/");
  });
});

describe("getSiteHomeUrl", () => {
  test("window.SITE_CONFIG.publicUrl has top priority", () => {
    const env = createEnv();
    env.sandbox.SITE_CONFIG = { publicUrl: "https://configured.com/path//" };
    assert.equal(api_homeUrl(env), "https://configured.com/path/");
  });

  test("falls back to CMS site.publicUrl", () => {
    const env = createEnv();
    env.api.CMS.data = { site: { publicUrl: "cms.example.com/shop/" } };
    assert.equal(api_homeUrl(env), "https://cms.example.com/shop/");
  });

  test("localhost without config uses canonical GitHub Pages URL", () => {
    const env = createEnv({ location: { hostname: "localhost", origin: "http://localhost:8080" } });
    assert.equal(
      api_homeUrl(env),
      "https://charlie4399828-cpu.github.io/changlong-web/"
    );
  });

  test("production host uses current origin", () => {
    const env = createEnv({
      location: { hostname: "charlie4399828-cpu.github.io", origin: "https://charlie4399828-cpu.github.io" }
    });
    assert.equal(api_homeUrl(env), "https://charlie4399828-cpu.github.io/");
  });
});

function api_homeUrl(env) {
  return env.api.getSiteHomeUrl();
}
