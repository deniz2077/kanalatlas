// Batch text-to-speech with Kokoro (open-source, Apache-2.0).
//   node speak.mjs <voice> <out.wav> "text"            single line
//   node speak.mjs --batch <jobs.json>                   [{ voice, out, text }]
import fs from "node:fs";
import { KokoroTTS } from "kokoro-js";

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
const jobs = process.argv[2] === "--batch"
  ? JSON.parse(fs.readFileSync(process.argv[3], "utf8"))
  : [{ voice: process.argv[2], out: process.argv[3], text: process.argv[4] }];
for (const j of jobs) {
  const audio = await tts.generate(j.text, { voice: j.voice, speed: j.speed ?? 1 });
  await audio.save(j.out);
  console.log(`saved ${j.out}`);
}
