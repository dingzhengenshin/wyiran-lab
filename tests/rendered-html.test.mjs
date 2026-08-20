import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("build contains the naiwa 3D experience", async () => {
  const html = await readFile(new URL("../dist/client/index.html", import.meta.url), "utf8");
  assert.match(html, /<title>naiwa · 云端奶蛙<\/title>/);
  assert.match(html, /lang="zh-CN"/);
  assert.match(html, /a frog above the clouds/);
  assert.match(html, /id="canvas-container"/);
  assert.match(html, /theme-color" content="#a8d8f0"/);
});

test("build includes the layered splat scene manifest", async () => {
  const raw = await readFile(new URL("../dist/client/scene-meta.json", import.meta.url), "utf8");
  const meta = JSON.parse(raw);
  assert.deepEqual(meta.scenes.map((scene) => scene.id), [
    "clouds-a",
    "clouds-b",
    "subject-cloud-v3",
  ]);
  assert.equal(meta.scenes[2].ply, "subject-cloud-v3.ksplat");
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
            ? new Response("naiwa", { status: 200, headers: { "content-type": "text/html" } })
            : new Response("Not found", { status: 404 });
        },
      },
    },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(seen, ["/lab", "/index.html"]);
});
