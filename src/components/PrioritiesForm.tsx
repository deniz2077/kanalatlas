"use client";

import { useState } from "react";
import {
  BARRIER_OPTIONS,
  EMPTY_PRIORITIES,
  NOTE_MAX,
  PRIORITY_OPTIONS,
  STORAGE_KEY,
  validatePriorities,
  type Priorities,
  type PriorityErrors,
} from "@/lib/priorities";

interface Props {
  value: Priorities;
  onChange: (p: Priorities) => void;
  neighbourhoods: string[];
}

/** Local-only personal priorities. Nothing leaves the browser. */
export default function PrioritiesForm({ value, onChange, neighbourhoods }: Props) {
  const [draft, setDraft] = useState<Priorities>(value);
  const [errors, setErrors] = useState<PriorityErrors>({});
  const [status, setStatus] = useState<string>("");
  const [lastValue, setLastValue] = useState(value);
  // Sync when the stored value loads after mount.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validatePriorities(draft);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setStatus("");
      return;
    }
    const p = { ...draft, note: draft.note.trim(), savedAt: new Date().toISOString() };
    onChange(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      setStatus("Kaydedildi. Bu tercihler yalnızca bu tarayıcıda saklanır ve PDF raporuna eklenir.");
    } catch {
      setStatus("Kaydedildi (bu oturum için). Tarayıcı depolaması kullanılamadığından sayfa yenilenince silinecek.");
    }
  };

  const clear = () => {
    setDraft(EMPTY_PRIORITIES);
    onChange(EMPTY_PRIORITIES);
    setErrors({});
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setStatus("Tercihleriniz bu tarayıcıdan silindi.");
  };

  const download = () => {
    const blob = new Blob([JSON.stringify({ tur: "KanalAtlas kişisel öncelikler (anket sonucu değildir)", ...value }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kanalatlas-onceliklerim.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-data">Kişisel girdi</p>
        <h2 id="oncelik-baslik" className="mt-1 text-2xl font-bold sm:text-3xl">
          Mahallen İçin Ne Önemli?
        </h2>
        <p className="mt-3 text-ink-soft">
          Kendi önceliklerinizi seçin; bunlar raporunuza <strong>“Kullanıcının seçtiği öncelikler”</strong> başlığıyla eklenir.
        </p>
        <div className="mt-4 rounded-xl border border-data/30 bg-data-soft p-4 text-sm text-ink">
          <p className="font-semibold">Bu bir anket veya oylama değildir.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Yanıtlarınız hiçbir sunucuya gönderilmez; yalnızca bu tarayıcıda (localStorage) saklanır.</li>
            <li>Başkalarının yanıtlarını göremezsiniz; toplam katılım sayısı yoktur.</li>
            <li>Ad, adres, telefon, yaş gibi kişisel bilgi istemiyoruz. Lütfen nota da yazmayın.</li>
            <li>İstediğiniz zaman silebilir veya JSON dosyası olarak indirebilirsiniz.</li>
          </ul>
        </div>
      </div>

      <form onSubmit={save} noValidate className="space-y-5 rounded-xl border border-line bg-card p-5" aria-describedby="oncelik-durum">
        <div>
          <label htmlFor="mahalle" className="text-sm font-medium">
            Hangi mahalleyi düşünüyorsunuz? <span className="font-normal text-muted">(isteğe bağlı)</span>
          </label>
          <select
            id="mahalle"
            value={draft.neighbourhood}
            onChange={(e) => setDraft({ ...draft, neighbourhood: e.target.value })}
            className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-paper px-3 text-sm"
          >
            <option value="">Belirtmek istemiyorum</option>
            {neighbourhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value="Çalışma alanı dışında">Çalışma alanı dışında bir yer</option>
          </select>
        </div>

        <fieldset aria-describedby={errors.priority ? "err-priority" : undefined}>
          <legend className="text-sm font-medium">
            Hangi iyileştirmeye öncelik verirdiniz? <span className="text-alert">*</span>
          </legend>
          <div className="mt-2 grid gap-2">
            {PRIORITY_OPTIONS.map((o) => (
              <label key={o.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-paper px-3 text-sm has-[:checked]:border-ink has-[:checked]:bg-white">
                <input
                  type="radio"
                  name="priority"
                  value={o.value}
                  checked={draft.priority === o.value}
                  onChange={() => setDraft({ ...draft, priority: o.value })}
                  className="h-4 w-4"
                />
                {o.label}
              </label>
            ))}
          </div>
          {errors.priority && (
            <p id="err-priority" role="alert" className="mt-1 text-sm text-alert">
              {errors.priority}
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">
            Mevcut olanakları kullanmayı ne zorlaştırıyor? <span className="font-normal text-muted">(birden fazla seçilebilir)</span>
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {BARRIER_OPTIONS.map((o) => (
              <label key={o.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-paper px-3 text-sm has-[:checked]:border-ink has-[:checked]:bg-white">
                <input
                  type="checkbox"
                  checked={draft.barriers.includes(o.value)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      barriers: e.target.checked ? [...draft.barriers, o.value] : draft.barriers.filter((b) => b !== o.value),
                    })
                  }
                  className="h-4 w-4"
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="not" className="text-sm font-medium">
            Planlamacıların dikkate almasını istediğiniz başka bir şey var mı? <span className="font-normal text-muted">(isteğe bağlı)</span>
          </label>
          <textarea
            id="not"
            rows={3}
            maxLength={NOTE_MAX + 50}
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            aria-describedby="not-yardim"
            aria-invalid={!!errors.note}
            className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
          <p id="not-yardim" className={`mt-1 text-xs ${draft.note.length > NOTE_MAX ? "text-alert" : "text-muted"}`}>
            {draft.note.length}/{NOTE_MAX} karakter. Kişisel bilgi yazmayın.
          </p>
          {errors.note && (
            <p role="alert" className="mt-1 text-sm text-alert">
              {errors.note}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="min-h-11 rounded-lg bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-soft">
            Önceliklerimi kaydet
          </button>
          <button type="button" onClick={download} disabled={!value.priority} className="min-h-11 rounded-lg border border-line bg-white px-4 text-sm font-medium hover:border-ink-soft disabled:opacity-50">
            JSON olarak indir
          </button>
          <button type="button" onClick={clear} className="min-h-11 rounded-lg px-4 text-sm font-medium text-alert underline">
            Sil
          </button>
        </div>
        <p id="oncelik-durum" role="status" className="text-sm text-data" data-testid="priorities-status">
          {status}
        </p>
      </form>
    </div>
  );
}
