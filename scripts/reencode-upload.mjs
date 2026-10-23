// Re-encodes the small upload copy from the last recording's frames (test-results/demo-tmp) without re-recording.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodeMp4 } from "./encode-mp4.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = path.join(root, "test-results/demo-tmp");
const { endTime, frames } = JSON.parse(fs.readFileSync(path.join(tmpDir, "timeline.json"), "utf8"));
const outPath = path.join(root, "submission/video/kanalatlas-demo-upload.mp4");
const info = await encodeMp4({ framesDir: path.join(tmpDir, "frames"), frames, outPath, endTime, audioPath: path.join(tmpDir, "narration.raw"), fps: 24, bitrate: 160_000, audioBitrate: 48_000, keyFrameSeconds: 10 });
console.log(`→ ${path.relative(root, outPath)} ${info.seconds.toFixed(1)} s, ${(info.bytes / 1e6).toFixed(1)} MB`);
