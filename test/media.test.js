const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const { Media, inspect, validateMetadata } = require("../src/media");
const { database, server } = require("./helpers.cjs");

async function image(format = "png", width = 16, height = 16) {
  return sharp({ create: { width, height, channels: 3, background: "#c0a040" } })[format]().toBuffer();
}

test("image uploads normalize locally without FFmpeg and replace/delete owned media", async (t) => {
  const { store, dir } = database(t);
  const media = new Media(dir, store, { ffmpeg: path.join(dir, "absent"), ffprobe: path.join(dir, "absent") });
  assert.equal(media.status().ready, true);
  assert.equal(media.status().videoReady, false);
  const p = await media.replace("template-ceo", await image("jpeg"), "image/jpeg", true);
  assert.equal(p.media_mime, "image/png");
  const old = path.join(media.dir, `${p.media_id}.png`);
  assert.equal((await sharp(old).metadata()).format, "png");
  const next = await media.replace("template-ceo", await image(), "image/png", true);
  assert.equal(fs.existsSync(old), false);
  assert.notEqual(next.media_id, p.media_id);
  assert.equal(fs.readdirSync(media.dir).length, 1);
  media.delete("template-ceo");
  assert.equal(fs.readdirSync(media.dir).length, 0);
  assert.equal(store.profile("template-ceo").media_id, null);
});

test("rights, signatures, format, size and decoded dimensions are enforced", async (t) => {
  const { store, dir } = database(t);
  const media = new Media(dir, store);
  await assert.rejects(media.replace("template-ceo", await image(), "image/png", false), { code: "RIGHTS_REQUIRED" });
  assert.throws(() => inspect(Buffer.from("<svg/>"), "image/png"), { code: "MEDIA_TYPE" });
  const huge = Buffer.alloc(12 * 1024 * 1024 + 1);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(huge);
  assert.throws(() => inspect(huge, "image/png"), { code: "MEDIA_TOO_LARGE" });
  await assert.rejects(media.replace("template-ceo", await image("png", 2049, 1), "image/png", true), { code: "MEDIA_INVALID" });
  await assert.rejects(media.replace("template-ceo", Buffer.from([255, 216, 255, 0]), "image/jpeg", true), { code: "MEDIA_INVALID" });
  assert.equal(fs.readdirSync(media.dir).length, 0);
});

test("missing video tools fail explicitly and startup cleans only unreferenced app files", async (t) => {
  const { store, dir } = database(t);
  const media = new Media(dir, store, { ffmpeg: path.join(dir, "missing"), ffprobe: path.join(dir, "missing") });
  const mp4 = Buffer.from([0, 0, 0, 20, ...Buffer.from("ftypisom")]);
  await assert.rejects(media.replace("template-ceo", mp4, "video/mp4", true), { code: "MEDIA_TOOLS_MISSING" });
  const p = await media.replace("template-ceo", await image(), "image/png", true);
  const stale = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.input";
  fs.writeFileSync(path.join(media.dir, stale), "interrupted upload");
  fs.writeFileSync(path.join(media.dir, "not-an-app-file.txt"), "leave alone");
  new Media(dir, store);
  assert.equal(fs.existsSync(path.join(media.dir, stale)), false);
  assert.equal(fs.existsSync(path.join(media.dir, `${p.media_id}.png`)), true);
  assert.equal(fs.existsSync(path.join(media.dir, "not-an-app-file.txt")), true);
});

test("video metadata requires bounded H.264 MP4 and valid duration", () => {
  const info = { streams: [{ codec_type: "video", codec_name: "h264", width: 1920, height: 1080 }], format: { format_name: "mov,mp4,m4a,3gp,3g2,mj2", duration: "15" } };
  validateMetadata(info, true);
  for (const duration of ["", "NaN", "16", "-1"]) {
    assert.throws(() => validateMetadata({ ...info, format: { ...info.format, duration } }, true), { code: "MEDIA_DURATION" });
  }
  assert.throws(() => validateMetadata({ ...info, streams: [{ ...info.streams[0], width: 1921 }] }, true), { code: "MEDIA_DIMENSIONS" });
  assert.throws(() => validateMetadata({ ...info, streams: [{ ...info.streams[0], codec_name: "hevc" }] }, true), { code: "MEDIA_DIMENSIONS" });
});

test("video conversion is local, bounded, removes audio, and uses generated paths", async (t) => {
  const { store, dir } = database(t);
  const calls = [];
  const media = new Media(dir, store, {
    ffmpeg: process.execPath, ffprobe: process.execPath,
    execute: async (exe, args) => {
      calls.push(args);
      if (args.includes("-show_streams")) return JSON.stringify({ streams: [{ codec_type: "video", codec_name: "h264", width: 320, height: 240 }], format: { format_name: "mov,mp4", duration: "1" } });
      fs.writeFileSync(args.at(-1), "test-only fake normalized output");
      return "";
    }
  });
  const mp4 = Buffer.from([0, 0, 0, 20, ...Buffer.from("ftypisom")]);
  await media.replace("template-ceo", mp4, "video/mp4", true);
  assert.ok(calls[1].includes("-an"));
  assert.ok(calls[1].includes("-map_metadata"));
  assert.ok(calls[1].includes("15"));
  assert.ok(calls[1].includes("file,pipe"));
  assert.equal(store.profile("template-ceo").media_mime, "video/mp4");
});

test("authenticated upload/read/delete, rights check, and MIME rejection", async (t) => {
  const s = await server(t, { media: (dir, store) => new Media(dir, store) });
  const url = "/api/profiles/template-ceo/media";
  const png = await image();
  const upload = { method: "PUT", body: png, headers: { "Content-Type": "image/png", "X-AXES-Rights": "confirmed" } };
  assert.equal((await s.request(url, upload)).status, 401);
  await s.pair();
  assert.equal((await s.request(url, { ...upload, headers: { "Content-Type": "image/png" } })).status, 400);
  assert.equal((await s.request(url, upload)).status, 200);
  const served = await s.request(url);
  assert.equal(served.headers.get("content-type"), "image/png");
  assert.equal(served.headers.get("cache-control"), "no-store");
  assert.ok((await served.arrayBuffer()).byteLength > 0);
  assert.equal((await s.request(url, { ...upload, headers: { ...upload.headers, "Content-Type": "image/svg+xml" } })).status, 415);
  assert.equal((await s.request(url, { method: "DELETE", body: "{}" })).status, 204);
  assert.equal((await s.request(url)).status, 404);
});
