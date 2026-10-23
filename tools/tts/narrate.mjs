/**
 * Batch narration with Kokoro (open-source TTS, Apache-2.0) and hand-set
 * Turkish pronunciations for place names (espeak would anglicise them).
 *   node narrate.mjs jobs.json      jobs: [{ out, text }]  → 24 kHz WAVs
 * Env: VOICE (default am_michael), SPEED (default 0.95)
 */
import fs from "node:fs";

// espeak-ng's WebAssembly build reads process.argv as its own CLI arguments,
// so capture ours and clear them before loading it.
const ARGS = process.argv.slice(2);
const IS_MAIN = import.meta.url === `file://${process.argv[1]}`;
process.argv = process.argv.slice(0, 2);
// kokoro-js keeps its phonemiser private; expose it via a copy placed next to
// the original module (so its relative paths to voice files still work).
const dist = new URL("./node_modules/kokoro-js/dist/", import.meta.url);
const patched = new URL("kokoro-patched.js", dist);
if (!fs.existsSync(patched)) {
  fs.writeFileSync(patched, fs.readFileSync(new URL("kokoro.js", dist), "utf8") + "\nexport { m as __phonemize };\n");
}
const { KokoroTTS, __phonemize } = await import(patched.href);

// IPA in Kokoro's symbol set. Possessive 's is appended as "z".
export const PRONUNCIATIONS = {
  KanalAtlas: "kɑnˈɑːl ˈɑːtlɑs",
  Adana: "ˈɑːdɑːnɑ",
  Seyhan: "sˈeɪhɑːn",
  Gazipaşa: "ɡˈɑːzipɑːʃɑ",
  Türkiye: "tˈʊɹkijeɪ",
};
const NAME_RE = new RegExp(`\\b(${Object.keys(PRONUNCIATIONS).join("|")})('s)?(?![\\p{L}])`, "gu");

/** Phonemise a plain segment; punctuation-only segments pass through unchanged. */
async function segment(t) {
  if (!/\p{L}|\d/u.test(t)) return t;
  const lead = t.match(/^[\s,.;:!?—–-]*/)[0];
  const trail = t.match(/[\s,.;:!?—–-]*$/)[0];
  const core = t.slice(lead.length, t.length - trail.length);
  return lead + (await __phonemize(core + (/[.!?]$/.test(trail.trim()) ? trail.trim() : ""), "a")) + trail.replace(/[.!?]/g, "");
}

export async function toPhonemes(text) {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(NAME_RE)) {
    out += await segment(text.slice(last, m.index));
    out += " " + PRONUNCIATIONS[m[1]] + (m[2] ? "z" : "") + " ";
    last = m.index + m[0].length;
  }
  out += await segment(text.slice(last));
  return out.replace(/\s+/g, " ").replace(/ ([,.;:!?])/g, "$1").trim();
}

if (IS_MAIN) {
  const voice = process.env.VOICE ?? "am_michael";
  const speed = Number(process.env.SPEED ?? 0.95);
  const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
  const jobs = JSON.parse(fs.readFileSync(ARGS[0], "utf8"));
  for (const j of jobs) {
    const phonemes = await toPhonemes(j.text);
    const { input_ids } = tts.tokenizer(phonemes, { truncation: true });
    const audio = await tts.generate_from_ids(input_ids, { voice, speed });
    await audio.save(j.out);
    console.log(`saved ${j.out} :: ${phonemes}`);
  }
}
