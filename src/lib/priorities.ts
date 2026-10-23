/**
 * Local-only "Mahallen için ne önemli?" priorities. Nothing is sent to a
 * server; values live in this browser (localStorage) and in the user's PDF.
 */
export const PRIORITY_OPTIONS = [
  { value: "public-pool", label: "Halka açık, ücretsiz veya düşük ücretli yüzme imkânı", en: "Public, free or low-cost swimming" },
  { value: "shaded-park", label: "Gölgeli park ve dinlenme alanı", en: "Shaded park and rest area" },
  { value: "water-play", label: "Çocuklar için güvenli su oyun alanı (fıskiye / splash alanı)", en: "Safe water-play area for children (splash pad)" },
  { value: "canal-safety", label: "Kanal kenarında güvenlik önlemleri ve bilgilendirme", en: "Safety measures and information along the canal" },
  { value: "swim-lessons", label: "Mahalleye yakın yüzme kursu kontenjanı", en: "Swimming-lesson places close to the neighbourhood" },
  { value: "other", label: "Diğer", en: "Other" },
] as const;

export const BARRIER_OPTIONS = [
  { value: "distance", label: "Uzaklık / ulaşım zorluğu", en: "Distance / hard to get there" },
  { value: "cost", label: "Ücret", en: "Cost" },
  { value: "capacity", label: "Kontenjan veya açılış saatleri", en: "Limited places or opening hours" },
  { value: "information", label: "Nerede ne olduğuna dair bilgi eksikliği", en: "Not knowing what is where" },
  { value: "accessibility", label: "Engelli erişimine uygun olmaması", en: "Not accessible for disabled people" },
  { value: "shade-heat", label: "Gölge eksikliği / aşırı sıcak", en: "Lack of shade / extreme heat" },
  { value: "safety-concern", label: "Güvenlik kaygısı", en: "Safety concerns" },
] as const;

export const NOTE_MAX = 500;
export const STORAGE_KEY = "kanalatlas.priorities.v1";

export interface Priorities {
  neighbourhood: string;
  priority: string;
  barriers: string[];
  note: string;
  savedAt: string | null;
}

export const EMPTY_PRIORITIES: Priorities = { neighbourhood: "", priority: "", barriers: [], note: "", savedAt: null };

const validPriority = new Set<string>(PRIORITY_OPTIONS.map((o) => o.value));
const validBarrier = new Set<string>(BARRIER_OPTIONS.map((o) => o.value));

/** Rough patterns for personal data the form asks people not to enter. */
const PHONE_RE = /(\+?90[\s-]?)?0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;

export type PriorityErrors = Partial<Record<keyof Priorities, string>>;

export function validatePriorities(p: Priorities, lang: "en" | "tr" = "tr"): PriorityErrors {
  const en = lang === "en";
  const e: PriorityErrors = {};
  if (!p.priority || !validPriority.has(p.priority)) e.priority = en ? "Please choose a priority." : "Lütfen bir öncelik seçin.";
  if (p.barriers.some((b) => !validBarrier.has(b))) e.barriers = en ? "Invalid choice." : "Geçersiz seçim.";
  if (p.note.length > NOTE_MAX)
    e.note = en ? `The note can be at most ${NOTE_MAX} characters (currently ${p.note.length}).` : `Not en fazla ${NOTE_MAX} karakter olabilir (şu an ${p.note.length}).`;
  else if (PHONE_RE.test(p.note) || EMAIL_RE.test(p.note))
    e.note = en
      ? "The note seems to contain a phone number or email address. Please do not include personal contact details."
      : "Notta telefon numarası veya e-posta adresi var gibi görünüyor. Lütfen kişisel iletişim bilgisi yazmayın.";
  return e;
}

/** Parse untrusted stored JSON back into a safe Priorities object. */
export function parseStoredPriorities(raw: string | null): Priorities | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<Priorities>;
    return {
      neighbourhood: typeof o.neighbourhood === "string" ? o.neighbourhood.slice(0, 80) : "",
      priority: typeof o.priority === "string" && validPriority.has(o.priority) ? o.priority : "",
      barriers: Array.isArray(o.barriers) ? o.barriers.filter((b): b is string => typeof b === "string" && validBarrier.has(b)) : [],
      note: typeof o.note === "string" ? o.note.slice(0, NOTE_MAX) : "",
      savedAt: typeof o.savedAt === "string" ? o.savedAt : null,
    };
  } catch {
    return null;
  }
}

export const priorityLabel = (v: string, lang: "en" | "tr" = "tr") => {
  const o = PRIORITY_OPTIONS.find((x) => x.value === v);
  return o ? (lang === "en" ? o.en : o.label) : v;
};
export const barrierLabel = (v: string, lang: "en" | "tr" = "tr") => {
  const o = BARRIER_OPTIONS.find((x) => x.value === v);
  return o ? (lang === "en" ? o.en : o.label) : v;
};
