import KanalAtlasApp from "@/components/KanalAtlasApp";
import { dataset, evaluationPoints, GRID_SPACING_M } from "@/lib/data";
import { EVIDENCE, STATUS_HELP, STATUS_LABEL } from "@/lib/evidence";
import { formatMeters } from "@/lib/insights";
import { LIMITATIONS, METHOD_TEXT } from "@/lib/report";
import { activeFacilities, evaluateScenario } from "@/lib/scenario";
import type { VerificationStatus } from "@/lib/types";

// Baseline numbers for the intro are computed from the dataset at build time, not typed in.
const baseline = evaluateScenario({
  points: evaluationPoints,
  facilities: dataset.facilities,
  category: "swimming",
  scope: "core",
  hypotheticals: [],
  thresholdM: 1000,
});
const baselineAll = evaluateScenario({
  points: evaluationPoints,
  facilities: dataset.facilities,
  category: "swimming",
  scope: "all",
  hypotheticals: [],
  thresholdM: 1000,
});
const swimCore = activeFacilities(dataset.facilities, "swimming", "core").length;
const swimAll = activeFacilities(dataset.facilities, "swimming", "all").length;
const parksCore = activeFacilities(dataset.facilities, "park", "core").length;
const ev = Object.fromEntries(EVIDENCE.map((e) => [e.id, e]));

const STATUS_STYLE: Record<VerificationStatus, string> = {
  VERIFIED: "bg-data text-white",
  MAPPED: "bg-data-soft text-data border border-data/40",
  REQUIRES_CONFIRMATION: "bg-white text-alert border border-alert/50",
  HYPOTHETICAL: "bg-hypo text-white",
};

function StatusBadge({ s }: { s: VerificationStatus }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${STATUS_STYLE[s]}`}>
      {STATUS_LABEL[s]}
    </span>
  );
}

function CanalIllustration() {
  // Original abstract illustration: a canal line, sample points and one hypothetical site.
  const pts = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) pts.push([40 + c * 40, 40 + r * 40]);
  return (
    <svg viewBox="0 0 400 200" className="h-auto w-full" role="img" aria-label="Kanal hattı, örnek noktalar ve varsayımsal bir tesisi gösteren soyut çizim">
      <rect width="400" height="200" rx="16" fill="#eef0ea" />
      <path d="M0 118 C 80 100, 140 128, 210 112 S 330 92, 400 104" fill="none" stroke="#1d6fa5" strokeWidth="9" strokeLinecap="round" opacity="0.85" />
      {pts.map(([x, y], i) => {
        const d = Math.hypot(x - 300, y - 80);
        const near = d < 85;
        return <circle key={i} cx={x} cy={y} r="4.5" fill={near ? "#f59e0b" : i % 5 === 0 ? "#0f766e" : "#fff"} stroke={near ? "#b45309" : "#3d4f6b"} strokeWidth="1.5" />;
      })}
      <rect x="66" y="66" width="14" height="14" rx="3" fill="#0f766e" stroke="#fff" strokeWidth="2" />
      <circle cx="300" cy="80" r="85" fill="#b45309" fillOpacity="0.06" stroke="#b45309" strokeDasharray="5 5" />
      <rect x="291" y="71" width="18" height="18" rx="3" transform="rotate(45 300 80)" fill="#b45309" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <a href="#analiz" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-white">
        Doğrudan haritaya geç
      </a>
      <header className="sticky top-0 z-[1500] border-b border-line bg-paper/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6" aria-label="Ana gezinme">
          <a href="#" className="flex items-center gap-2 font-bold">
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
              <rect width="26" height="26" rx="6" fill="#0f2340" />
              <path d="M3 16 C 8 12, 12 18, 17 14 S 23 11, 23 11" stroke="#5fb3e6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <rect x="15" y="5" width="6" height="6" rx="1" transform="rotate(45 18 8)" fill="#f59e0b" />
            </svg>
            KanalAtlas
          </a>
          <ul className="hidden items-center gap-5 text-sm font-medium md:flex">
            <li><a href="#sorun" className="hover:text-data">Sorun</a></li>
            <li><a href="#analiz" className="hover:text-data">Harita ve senaryo</a></li>
            <li><a href="#oncelikler" className="hover:text-data">Öncelikler</a></li>
            <li><a href="#rapor" className="hover:text-data">Rapor</a></li>
            <li><a href="#yontem" className="hover:text-data">Yöntem ve kaynaklar</a></li>
            <li><a href="#english" className="hover:text-data" lang="en">English</a></li>
          </ul>
          <a href="#analiz" className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white md:hidden">Haritayı aç</a>
        </nav>
      </header>

      <main id="icerik">
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <p className="text-sm font-semibold text-data">Adana · Seyhan ilçesi · açık kaynak prototip</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Mahalleni keşfet.
              <br />
              İhtiyaçları gör.
              <br />
              <span className="text-hypo">Geleceği birlikte düşün.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              Adana’da açık sulama kanalları mahallelerin içinden geçiyor ve yaz sıcağında serinleme ihtiyacı gerçek. KanalAtlas,
              bir kanal koridorunda <strong>haritalanmış yüzme tesislerine ve parklara ne kadar uzak olunduğunu</strong> ölçer,
              önerilen yeni bir tesisin bu tabloyu nasıl değiştireceğini hesaplar ve sonucu kaynaklarıyla birlikte bir planlama
              raporuna dönüştürür.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#analiz" className="rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft">Haritayı ve senaryoyu aç</a>
              <a href="#yontem" className="rounded-lg border border-line bg-white px-5 py-3 font-semibold hover:border-ink-soft">Nasıl hesaplıyoruz?</a>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <CanalIllustration />
            <p className="mt-3 text-xs text-muted">Soyut çizim; gerçek harita aşağıdaki analiz bölümündedir.</p>
          </div>
        </section>

        {/* Problem & evidence */}
        <section id="sorun" aria-labelledby="sorun-baslik" className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <h2 id="sorun-baslik" className="text-2xl font-bold sm:text-3xl">Belgelenmiş bir yerel sorun, dağınık bir bilgi</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-line bg-card p-5">
              <StatusBadge s="VERIFIED" />
              <h3 className="mt-2 font-semibold">Kanallar ve boğulma kaygısı resmi belgede</h3>
              <p className="mt-2 text-sm text-ink-soft">
                Büyükşehir Belediye Meclisi’nin 12 Haziran 2026 kararı, ücretsiz yüzme eğitiminin amaçları arasında yaz
                sıcaklarında <em>sulama kanalları</em> gibi güvensiz alanlarda yaşanabilecek boğulmaları önlemeyi açıkça sayıyor.
              </p>
              <a href={ev["abb-meclis-2026-183"].url} className="mt-3 inline-block text-xs underline" target="_blank" rel="noreferrer">Meclis kararları, Haziran 2026 (s. 74–75)</a>
            </article>
            <article className="rounded-xl border border-line bg-card p-5">
              <StatusBadge s="VERIFIED" />
              <h3 className="mt-2 font-semibold">Yüzme olanakları var, ama nerede?</h3>
              <p className="mt-2 text-sm text-ink-soft">
                Belediye 2025 yazında 10 ilçede 26 yarı olimpik havuzda yaklaşık 10.000 çocuğa ücretsiz yüzme eğitimi verdiğini
                duyurdu. Bu havuzların konum listesi duyuruda yer almıyor; mahalle düzeyinde erişimi görmek zor.
              </p>
              <a href={ev["abb-haber-2025-yuzme"].url} className="mt-3 inline-block text-xs underline" target="_blank" rel="noreferrer">Adana Büyükşehir Belediyesi, 21.07.2025</a>
            </article>
            <article className="rounded-xl border border-line bg-card p-5">
              <StatusBadge s="VERIFIED" />
              <h3 className="mt-2 font-semibold">Kanal koridorlarının geleceği değişiyor</h3>
              <p className="mt-2 text-sm text-ink-soft">
                Tarım ve Orman Bakanlığı Adana birimi, kapalı basınçlı sulamaya geçişin başladığını ve şehir merkezinden geçen açık
                kanalların devre dışı bırakılacağını duyurdu. Hangi kesitin ne zaman kapanacağı açıklanmadı.
              </p>
              <a href={ev["tarim-2025-basincli"].url} className="mt-3 inline-block text-xs underline" target="_blank" rel="noreferrer">T.C. Tarım ve Orman Bakanlığı, 10.09.2025</a>
            </article>
          </div>

          <div className="mt-6 grid gap-6 rounded-2xl border border-line bg-white p-6 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-data">Bu çalışma alanında, veriden hesaplanan başlangıç</p>
              <p className="mt-2 text-4xl font-bold tabular">
                {baseline.before.withinCount} <span className="text-xl font-medium text-muted">/ {baseline.before.pointCount}</span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                örnek harita noktası, adı veya yüzme etiketi olan {swimCore} haritalanmış yüzme tesisinden birine {formatMeters(1000)} kuş
                uçuşu mesafede. İsimsiz havuzlar da sayılırsa ({swimAll} kayıt) bu sayı {baselineAll.before.withinCount} oluyor — sonucun hangi
                veriye güvendiğinize ne kadar bağlı olduğu da bir bulgu.
              </p>
              <p className="mt-3 text-xs text-muted">
                {evaluationPoints.length} nokta, {GRID_SPACING_M} m ızgarayla örneklenmiştir; nüfusu temsil etmez. Kaynak: OpenStreetMap, çekim {dataset.extractedAt.slice(0, 10)}.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Normal bir haritadan farkı ne?</h3>
              <ul className="mt-2 space-y-2 text-sm text-ink-soft">
                <li><strong className="text-ink">Ölçer, sadece göstermez:</strong> Her örnek nokta için en yakın tesise mesafeyi hesaplar ve eşik içinde kalanları sayar.</li>
                <li><strong className="text-ink">“Ya şöyle olsaydı?” sorusunu yanıtlar:</strong> Önerilen bir tesisi sürükledikçe kaç noktanın kazanç sağladığını anında yeniden hesaplar ve A/B konumlarını aynı yöntemle karşılaştırır.</li>
                <li><strong className="text-ink">Veriye ne kadar güvenildiğini açıkça söyler:</strong> Her tesisin kaynağı ve doğrulama durumu görünür; isimsiz veya özel havuzlar ayrı tutulur.</li>
                <li><strong className="text-ink">Paylaşılabilir kanıt üretir:</strong> Sonuçları, yöntem ve sınırlılıklarla birlikte Türkçe PDF rapora çevirir.</li>
              </ul>
            </div>
          </div>
        </section>

        <KanalAtlasApp />

        {/* Method, sources, limitations */}
        <section id="yontem" aria-labelledby="yontem-baslik" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-data">Şeffaflık</p>
          <h2 id="yontem-baslik" className="mt-1 text-2xl font-bold sm:text-3xl">Yöntem, kaynaklar ve sınırlılıklar</h2>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-card p-5">
              <h3 className="font-semibold">Nasıl hesaplıyoruz?</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
                {METHOD_TEXT.map((m) => <li key={m}>{m}</li>)}
              </ol>
              <div className="mt-4 rounded-lg bg-paper p-3 font-mono text-xs leading-relaxed text-ink">
                d = 2R · asin(√(sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)))
                <br />R = 6.371.008,8 m · φ enlem, λ boylam (radyan)
              </div>
              <p className="mt-3 text-xs text-muted">
                Hesaplama kodu: <code>src/lib/scenario.ts</code> ve <code>src/lib/geo.ts</code> — elle hesaplanmış beklenen değerlerle birim
                testleri vardır. Ayrıntı: <code>docs/SCENARIO_METHOD.md</code>.
              </p>
            </div>
            <div className="rounded-xl border border-alert/30 bg-card p-5">
              <h3 className="font-semibold">Bu araç neyi söylemez?</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">
                {LIMITATIONS.map((l) => <li key={l}>{l}</li>)}
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-line bg-card p-5">
            <h3 className="font-semibold">Durum etiketleri</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(STATUS_LABEL) as VerificationStatus[]).map((s) => (
                <div key={s}>
                  <dt><StatusBadge s={s} /></dt>
                  <dd className="mt-1 text-ink-soft">{STATUS_HELP[s]}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-6 rounded-xl border border-line bg-card p-5">
            <h3 className="font-semibold">Kaynak defteri</h3>
            <ul className="mt-3 space-y-4">
              {EVIDENCE.map((e) => (
                <li key={e.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge s={e.status} />
                    <span className="text-sm font-medium">{e.publisher}</span>
                    <span className="text-xs text-muted">{e.date}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{e.claim}</p>
                  <p className="mt-1 text-xs text-muted">Kapsam: {e.scope}</p>
                  <a href={e.url} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-xs underline">{e.url}</a>
                </li>
              ))}
              <li className="border-t border-line pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge s="MAPPED" />
                  <span className="text-sm font-medium">OpenStreetMap katkıcıları — kanal, park ve havuz geometrileri</span>
                  <span className="text-xs text-muted">çekim {dataset.extractedAt}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {dataset.canals.length} kanal segmenti, {dataset.facilities.length} tesis kaydı ({dataset.stats.mergedDuplicates} çakışan kayıt birleştirildi),{" "}
                  {dataset.neighbourhoods.length} mahalle etiketi. Analizde varsayılan olarak {swimCore} yüzme tesisi ve {parksCore} park kullanılır.
                </p>
                <a href={dataset.source.url} className="mt-1 inline-block text-xs underline" target="_blank" rel="noreferrer">{dataset.source.license}</a>
              </li>
            </ul>
          </div>
        </section>

        {/* English summary */}
        <section id="english" lang="en" aria-labelledby="en-baslik" className="border-t border-line bg-card">
          <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
            <h2 id="en-baslik" className="text-2xl font-bold">In English: what KanalAtlas is</h2>
            <p className="mt-3 text-ink-soft">
              Open irrigation canals run through residential neighbourhoods of Adana, Türkiye. In a June 2026 decision, the
              metropolitan council listed preventing drownings in unsafe places such as irrigation canals among the reasons for its
              free summer swimming lessons, and the Ministry of Agriculture has announced that open canals through the city centre
              will be replaced by closed, pressurised pipes.
            </p>
            <p className="mt-3 text-ink-soft">
              KanalAtlas is a working prototype for one study area — the open canal corridor in central Seyhan. Using OpenStreetMap
              data extracted once, it samples {evaluationPoints.length} map locations on a {GRID_SPACING_M} m grid and computes the
              straight-line (Haversine) distance from each to the nearest mapped swimming facility or park. Users can drop and drag up
              to three hypothetical facilities; the metrics (points within a threshold, mean/median distance, canal-belt subset) are
              recomputed on every move, saved scenarios are compared using identical settings, and the result can be exported as a
              Turkish planning-brief PDF.
            </p>
            <p className="mt-3 text-ink-soft">
              It does <strong>not</strong> measure walking distance, represent population, predict drowning risk, or assess land
              availability or feasibility. Mapped facilities are labelled “MAPPED” because their operating status and public access are
              not verified.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-8 text-xs text-muted sm:px-6">
          <p>
            KanalAtlas — Neighborhood Hacks 2026 için geliştirilmiş açık kaynak prototip. Resmi bir kurumla bağlantısı yoktur.
          </p>
          <p>
            Harita verisi © OpenStreetMap katkıcıları (ODbL). Altlık harita karoları: OpenStreetMap Vakfı tile sunucusu. Bu proje yapay zekâ destekli kodlama araçlarıyla
            geliştirilmiştir; ayrıntılar depodaki <code>submission/AI_DISCLOSURE.md</code> dosyasındadır.
          </p>
        </div>
      </footer>
    </>
  );
}
