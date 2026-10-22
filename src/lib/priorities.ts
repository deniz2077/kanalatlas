/**
 * Local-only "Mahallen için ne önemli?" priorities. Nothing is sent to a
 * server; values live in this browser (localStorage) and in the user's PDF.
 */
export const PRIORITY_OPTIONS = [
  { value: "public-pool", label: "Halka açık, ücretsiz veya düşük ücretli yüzme imkânı" },
  { value: "shaded-park", label: "Gölgeli park ve dinlenme alanı" },
  { value: "water-play", label: "Çocuklar için güvenli su oyun alanı (fıskiye / splash alanı)" },
  { value: "canal-safety", label: "Kanal kenarında güvenlik önlemleri ve bilgilendirme" },
  { value: "swim-lessons", label: "Mahalleye yakın yüzme kursu kontenjanı" },
  { value: "other", label: "Diğer" },
] as const;

export const BARRIER_OPTIONS = [
  { value: "distance", label: "Uzaklık / ulaşım zorluğu" },
  { value: "cost", label: "Ücret" },
  { value: "capacity", label: "Kontenjan veya açılış saatleri" },
  { value: "information", label: "Nerede ne olduğuna dair bilgi eksikliği" },
  { value: "accessibility", label: "Engelli erişimine uygun olmaması" },
  { value: "shade-heat", label: "Gölge eksikliği / aşırı sıcak" },
  { value: "safety-concern", label: "Güvenlik kaygısı" },
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

export function validatePriorities(p: Priorities): PriorityErrors {
  const e: PriorityErrors = {};
  if (!p.priority || !validPriority.has(p.priority)) e.priority = "Lütfen bir öncelik seçin.";
  if (p.barriers.some((b) => !validBarrier.has(b))) e.barriers = "Geçersiz seçim.";
  if (p.note.length > NOTE_MAX) e.note = `Not en fazla ${NOTE_MAX} karakter olabilir (şu an ${p.note.length}).`;
  else if (PHONE_RE.test(p.note) || EMAIL_RE.test(p.note))
    e.note = "Notta telefon numarası veya e-posta adresi var gibi görünüyor. Lütfen kişisel iletişim bilgisi yazmayın.";
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

export const priorityLabel = (v: string) => PRIORITY_OPTIONS.find((o) => o.value === v)?.label ?? v;
export const barrierLabel = (v: string) => BARRIER_OPTIONS.find((o) => o.value === v)?.label ?? v;
