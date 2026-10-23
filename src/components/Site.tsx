"use client";

/** Page shell: header with language toggle, intro, problem, the app, method, footer. */
import KanalAtlasApp from "@/components/KanalAtlasApp";
import { LangProvider, useLang } from "@/components/LangContext";
import { dataset, evaluationPoints, GRID_SPACING_M } from "@/lib/data";
import { EVIDENCE } from "@/lib/evidence";
import { fmtMeters } from "@/lib/i18n";
import { LIMITATIONS_BY, METHOD_BY } from "@/lib/report";
import type { VerificationStatus } from "@/lib/types";

export interface BaselineFacts {
  within: number;
  points: number;
  allWithin: number;
  swimCore: number;
  swimAll: number;
  parksCore: number;
}

const STATUS_STYLE: Record<VerificationStatus, string> = {
  VERIFIED: "bg-data text-white",
  MAPPED: "bg-data-soft text-data border border-data/40",
  REQUIRES_CONFIRMATION: "bg-white text-alert border border-alert/50",
  HYPOTHETICAL: "bg-hypo text-white",
};

function StatusBadge({ s }: { s: VerificationStatus }) {
  const { t } = useLang();
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${STATUS_STYLE[s]}`}>{t.status[s]}</span>;
}

function CanalIllustration({ label }: { label: string }) {
  // Original abstract illustration: a canal line, sample points and one hypothetical site.
  const pts: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) pts.push([40 + c * 40, 40 + r * 40]);
  return (
    <svg viewBox="0 0 400 200" className="h-auto w-full" role="img" aria-label={label}>
      <rect width="400" height="200" rx="16" fill="#eef0ea" />
      <path d="M0 118 C 80 100, 140 128, 210 112 S 330 92, 400 104" fill="none" stroke="#1d6fa5" strokeWidth="9" strokeLinecap="round" opacity="0.85" />
      {pts.map(([x, y], i) => {
        const near = Math.hypot(x - 300, y - 80) < 85;
        return <circle key={i} cx={x} cy={y} r="4.5" fill={near ? "#f59e0b" : i % 5 === 0 ? "#0f766e" : "#fff"} stroke={near ? "#b45309" : "#3d4f6b"} strokeWidth="1.5" />;
      })}
      <rect x="66" y="66" width="14" height="14" rx="3" fill="#0f766e" stroke="#fff" strokeWidth="2" />
      <circle cx="300" cy="80" r="85" fill="#b45309" fillOpacity="0.06" stroke="#b45309" strokeDasharray="5 5" />
      <rect x="291" y="71" width="18" height="18" rx="3" transform="rotate(45 300 80)" fill="#b45309" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

function Header() {
  const { lang, t, setLang } = useLang();
  return (
    <header className="sticky top-0 z-[1500] border-b border-line bg-paper/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6" aria-label={t.navLabel}>
        <a href="#" className="flex items-center gap-2 font-bold">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <rect width="26" height="26" rx="6" fill="#0f2340" />
            <path d="M3 16 C 8 12, 12 18, 17 14 S 23 11, 23 11" stroke="#5fb3e6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <rect x="15" y="5" width="6" height="6" rx="1" transform="rotate(45 18 8)" fill="#f59e0b" />
          </svg>
          KanalAtlas
        </a>
        <div className="flex items-center gap-4">
          <ul className="hidden items-center gap-5 text-sm font-medium lg:flex">
            <li><a href="#sorun" className="hover:text-data">{t.nav.problem}</a></li>
            <li><a href="#analiz" className="hover:text-data">{t.nav.map}</a></li>
            <li><a href="#oncelikler" className="hover:text-data">{t.nav.priorities}</a></li>
            <li><a href="#rapor" className="hover:text-data">{t.nav.report}</a></li>
            <li><a href="#yontem" className="hover:text-data">{t.nav.method}</a></li>
          </ul>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "tr" : "en")}
            className="min-h-9 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:border-ink-soft"
            aria-label={t.langSwitchLabel}
            lang={lang === "en" ? "tr" : "en"}
            data-testid="lang-toggle"
          >
            {t.langSwitch}
          </button>
          <a href="#analiz" className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white lg:hidden">
            {t.openMap}
          </a>
        </div>
      </nav>
    </header>
  );
}

function Content({ facts }: { facts: BaselineFacts }) {
  const { lang, t } = useLang();
  const ev = Object.fromEntries(EVIDENCE.map((e) => [e.id, e]));
  const cardLinks = [ev["abb-meclis-2026-183"].url, ev["abb-haber-2025-yuzme"].url, ev["tarim-2025-basincli"].url];
  return (
    <>
      <a href="#analiz" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-white">
        {t.skipToMap}
      </a>
      <Header />
      <main id="icerik">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-16">
          <div>
            <p className="text-sm font-semibold text-data">{t.heroKicker}</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {t.heroTitle[0]}
              <br />
              {t.heroTitle[1]}
              <br />
              <span className="text-hypo">{t.heroTitle[2]}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">{t.heroText}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#analiz" className="rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft">{t.heroCta}</a>
              <a href="#yontem" className="rounded-lg border border-line bg-white px-5 py-3 font-semibold hover:border-ink-soft">{t.heroCta2}</a>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <CanalIllustration label={t.illustrationLabel} />
            <p className="mt-3 text-xs text-muted">{t.illustrationNote}</p>
          </div>
        </section>

        <section id="sorun" aria-labelledby="sorun-baslik" className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <h2 id="sorun-baslik" className="text-2xl font-bold sm:text-3xl">{t.problemTitle}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {t.cards.map((c, i) => (
              <article key={c.title} className="rounded-xl border border-line bg-card p-5">
                <StatusBadge s="VERIFIED" />
                <h3 className="mt-2 font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{c.text}</p>
                <a href={cardLinks[i]} className="mt-3 inline-block text-xs underline" target="_blank" rel="noreferrer">{c.link}</a>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 rounded-2xl border border-line bg-white p-6 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-data">{t.baselineKicker}</p>
              <p className="mt-2 text-4xl font-bold tabular">
                {facts.within} <span className="text-xl font-medium text-muted">/ {facts.points}</span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">{t.baselineText(facts.swimCore, facts.swimAll, facts.allWithin, fmtMeters(1000, lang))}</p>
              <p className="mt-3 text-xs text-muted">{t.baselineNote(evaluationPoints.length, GRID_SPACING_M, dataset.extractedAt.slice(0, 10))}</p>
            </div>
            <div>
              <h3 className="font-semibold">{t.diffTitle}</h3>
              <ul className="mt-2 space-y-2 text-sm text-ink-soft">
                {t.diffs.map(([a, b]) => (
                  <li key={a}>
                    <strong className="text-ink">{a}</strong> {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <KanalAtlasApp />

        <section id="yontem" aria-labelledby="yontem-baslik" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-data">{t.methodKicker}</p>
          <h2 id="yontem-baslik" className="mt-1 text-2xl font-bold sm:text-3xl">{t.methodTitle}</h2>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-card p-5">
              <h3 className="font-semibold">{t.howTitle}</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
                {METHOD_BY[lang].map((m) => <li key={m}>{m}</li>)}
              </ol>
              <div className="mt-4 rounded-lg bg-paper p-3 font-mono text-xs leading-relaxed text-ink">
                d = 2R · asin(√(sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)))
                <br />
                {t.formulaNote}
              </div>
              <p className="mt-3 text-xs text-muted">{t.codeNote}</p>
            </div>
            <div className="rounded-xl border border-alert/30 bg-card p-5">
              <h3 className="font-semibold">{t.notTitle}</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">
                {LIMITATIONS_BY[lang].map((l) => <li key={l}>{l}</li>)}
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-line bg-card p-5">
            <h3 className="font-semibold">{t.statusTitle}</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(t.status) as VerificationStatus[]).map((s) => (
                <div key={s}>
                  <dt><StatusBadge s={s} /></dt>
                  <dd className="mt-1 text-ink-soft">{t.statusHelp[s]}</dd>
                </div>
              ))}
            </dl>
          </div>

          <details className="mt-6 rounded-xl border border-line bg-card p-5" open>
            <summary className="cursor-pointer font-semibold">{t.ledgerTitle}</summary>
            <ul className="mt-3 space-y-4">
              {EVIDENCE.map((e) => (
                <li key={e.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge s={e.status} />
                    <span className="text-sm font-medium">{e.publisher}</span>
                    <span className="text-xs text-muted">{e.date}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{lang === "tr" ? e.claim : e.claimEn}</p>
                  <p className="mt-1 text-xs text-muted">{t.scopeWord} {lang === "tr" ? e.scope : e.scopeEn}</p>
                  <a href={e.url} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-xs underline">{e.url}</a>
                </li>
              ))}
              <li className="border-t border-line pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge s="MAPPED" />
                  <span className="text-sm font-medium">{t.osmLedger}</span>
                  <span className="text-xs text-muted">{t.osmLedgerDate(dataset.extractedAt)}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {t.osmLedgerText(dataset.canals.length, dataset.facilities.length, dataset.stats.mergedDuplicates, dataset.neighbourhoods.length, facts.swimCore, facts.parksCore)}
                </p>
                <a href={dataset.source.url} className="mt-1 inline-block text-xs underline" target="_blank" rel="noreferrer">{dataset.source.license}</a>
              </li>
            </ul>
          </details>
        </section>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-8 text-xs text-muted sm:px-6">
          <p>{t.footer1}</p>
          <p>{t.footer2}</p>
        </div>
      </footer>
    </>
  );
}

export default function Site({ facts }: { facts: BaselineFacts }) {
  return (
    <LangProvider>
      <Content facts={facts} />
    </LangProvider>
  );
}
