const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { createEnv, plain } = require("./helpers");

describe("localStorage site data", () => {
  test("persist -> load round trip keeps JSON shape", () => {
    const env = createEnv();
    assert.equal(env.api.loadSiteData(), null);

    const payload = { site: { name: "茶舍" }, _cmsUpdatedAt: 42 };
    env.api.persistSiteData(payload);

    const loaded = env.api.loadSiteData();
    assert.deepEqual(plain(loaded), payload);
    assert.notEqual(env.api.getCMSVersion(), "0");
  });

  test("corrupt JSON returns null instead of throwing", () => {
    const env = createEnv();
    env.sandbox.localStorage.setItem("changlong_site_data", "{not-json");
    assert.equal(env.api.loadSiteData(), null);
  });

  test("clearSiteData removes the record", () => {
    const env = createEnv();
    env.api.persistSiteData({ site: {} });
    env.api.clearSiteData();
    assert.equal(env.api.loadSiteData(), null);
  });
});

describe("IndexedDB media store", () => {
  test("save -> get -> list -> delete full lifecycle", async () => {
    const env = createEnv();
    const file = { name: "tea.jpg", type: "image/jpeg", size: 1234 };

    const id = await env.api.saveMediaFile(file);
    assert.match(id, /^media_\d+_[a-z0-9]{6}$/);

    const record = await env.api.getMediaRecord(id);
    assert.equal(record.name, "tea.jpg");
    assert.equal(record.type, "image/jpeg");
    assert.equal(record.size, 1234);
    assert.equal(typeof record.createdAt, "number");

    const all = await env.api.listAllMedia();
    assert.equal(all.length, 1);

    await env.api.deleteMediaFile(id);
    assert.equal(await env.api.getMediaRecord(id), null);
    assert.equal((await env.api.listAllMedia()).length, 0);
  });

  test("get missing media returns null", async () => {
    const env = createEnv();
    assert.equal(await env.api.getMediaRecord("media_missing"), null);
  });
});
