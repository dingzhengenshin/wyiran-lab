import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("build contains WYIRAN LAB metadata and Vue entry", async () => {
  const html = await readFile(new URL("../dist/client/index.html", import.meta.url), "utf8");
  assert.match(html, /<title>WYIRAN LAB/);
  assert.match(html, /lang="zh-CN"/);
  assert.match(html, /让复杂隐于无形，让体验自然发生/);
  assert.match(html, /theme-color" content="#f5f7fa"/);
  assert.match(html, /id="app"/);
  assert.doesNotMatch(html, /情侣|王者荣耀|原神/);
});

test("worker falls back to the SPA shell for navigation requests", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const seen = [];
  const response = await worker.fetch(
    new Request("https://wyiranw.xyz/lab", { headers: { accept: "text/html" } }),
    {
      ASSETS: {
        async fetch(request) {
          const path = new URL(request.url).pathname;
          seen.push(path);
          return path === "/index.html"
            ? new Response("WYIRAN LAB", { status: 200, headers: { "content-type": "text/html" } })
            : new Response("Not found", { status: 404 });
        },
      },
    },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(seen, ["/lab", "/index.html"]);
});
