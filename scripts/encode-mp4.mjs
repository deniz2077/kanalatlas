/**
 * Encodes screencast frames (JPEGs + timestamps) into an H.264 MP4 using the
 * browser's own WebCodecs encoder and the mp4-muxer library. Frames are
 * resampled to a constant frame rate (the latest captured frame is held until
 * the next one arrives), so timing matches what happened on screen.
 *
 *   import { encodeMp4 } from "./encode-mp4.mjs";
 *   await encodeMp4({ framesDir, frames: [{ file, t }], outPath });
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

// endTime: video length in seconds. Screencasts only emit frames when the screen changes,
// so the last frame is held until endTime (e.g. a static end card).
export async function encodeMp4({ framesDir, frames, outPath, fps = 30, bitrate = 6_000_000, endTime }) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out = [];
  await page.exposeBinding("__out", (_src, b64) => out.push(Buffer.from(b64, "base64")));
  await page.exposeBinding("__log", (_src, msg) => console.log("[encode]", msg));
  await page.route("http://localhost:7/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>enc</title>" });
    if (url.pathname === "/muxer.js")
      return route.fulfill({ contentType: "text/javascript", path: path.join(root, "node_modules/mp4-muxer/build/mp4-muxer.js") });
    if (url.pathname === "/index.json") return route.fulfill({ contentType: "application/json", body: JSON.stringify(frames.map((f) => f.t)) });
    const m = url.pathname.match(/^\/frame\/(\d+)$/);
    if (m) return route.fulfill({ contentType: "image/jpeg", path: path.join(framesDir, frames[Number(m[1])].file) });
    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto("http://localhost:7/");
  await page.addScriptTag({ url: "http://localhost:7/muxer.js" });
  const result = await page.evaluate(
    async ({ fps, bitrate, endTime }) => {
      const times = await (await fetch("/index.json")).json();
      const load = async (i) => createImageBitmap(await (await fetch(`/frame/${i}`)).blob());
      let bmp = await load(0);
      const width = bmp.width - (bmp.width % 2);
      const height = bmp.height - (bmp.height % 2);
      const config = { codec: "avc1.640028", width, height, bitrate, framerate: fps, avc: { format: "avc" } };
      const support = await VideoEncoder.isConfigSupported(config);
      if (!support.supported) throw new Error("H.264 encoder config not supported: " + JSON.stringify(config));
      const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
      const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width, height, frameRate: fps }, fastStart: "in-memory" });
      let failure = null;
      const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (failure = String(e)) });
      encoder.configure(config);
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      const end = Math.max(endTime ?? 0, times[times.length - 1] + 1);
      let current = 0;
      let n = 0;
      for (; n / fps <= end; n++) {
        const t = n / fps;
        let next = current;
        while (next + 1 < times.length && times[next + 1] <= t) next++;
        if (next !== current) {
          bmp.close();
          bmp = await load(next);
          current = next;
        }
        ctx.drawImage(bmp, 0, 0, width, height);
        const frame = new VideoFrame(canvas, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / fps) });
        encoder.encode(frame, { keyFrame: n % (fps * 2) === 0 });
        frame.close();
        while (encoder.encodeQueueSize > 20) await new Promise((r) => setTimeout(r, 2));
        if (failure) throw new Error(failure);
        if (n % (fps * 30) === 0) await window.__log(`${Math.round(t)}s / ${Math.round(end)}s`);
      }
      await encoder.flush();
      muxer.finalize();
      const buf = new Uint8Array(muxer.target.buffer);
      for (let i = 0; i < buf.length; i += 4 * 1024 * 1024) {
        const part = buf.subarray(i, i + 4 * 1024 * 1024);
        let bin = "";
        for (let j = 0; j < part.length; j += 0x8000) bin += String.fromCharCode(...part.subarray(j, j + 0x8000));
        await window.__out(btoa(bin));
      }
      return { width, height, frames: n, seconds: n / fps, bytes: buf.length };
    },
    { fps, bitrate, endTime },
  );
  await browser.close();
  fs.writeFileSync(outPath, Buffer.concat(out));
  return result;
}
