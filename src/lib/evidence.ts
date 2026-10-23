/**
 * Source ledger shared by the landing page, the methodology section and the PDF.
 * Mirrors docs/EVIDENCE.md — update both together.
 */
import type { VerificationStatus } from "./types";

export interface EvidenceItem {
  id: string;
  status: VerificationStatus;
  /** What the source supports, in Turkish, without extrapolation. */
  claim: string;
  claimEn: string;
  publisher: string;
  date: string;
  url: string;
  scope: string;
  scopeEn: string;
}

export const EVIDENCE: EvidenceItem[] = [
  {
    id: "abb-meclis-2026-183",
    status: "VERIFIED",
    claim:
      "Adana Büyükşehir Belediye Meclisi, “Yüzme Bilmeyen Çocuk Kalmasın” kapsamında spor kulüpleriyle protokolü kabul etti; gerekçede yaz sıcaklarında sulama kanalları gibi havuz dışı güvensiz alanlarda meydana gelebilecek boğulmaların önlenmesi amacı açıkça yazıyor.",
    claimEn:
      "Adana Metropolitan Council approved a swimming-lesson partnership with sports clubs; its stated rationale explicitly names drowning in unsafe places such as irrigation canals during hot summers.",
    publisher: "Adana Büyükşehir Belediye Meclisi, karar sayı 67597785-105.04/183",
    date: "12.06.2026",
    url: "https://www.adana.bel.tr/panel/uploads/mecliskararlari_v/files/2026-haziran-ayi-pdf.pdf",
    scope: "Belediye geneli; Temmuz–Ağustos eğitim dönemi. Belgede boğulma sayısı verilmiyor.",
    scopeEn: "City-wide; July–August lesson period. The document gives no drowning figures.",
  },
  {
    id: "abb-haber-2025-yuzme",
    status: "VERIFIED",
    claim:
      "2025 yazında belediye, 10 ilçede 26 yarı olimpik havuzda 6–14 yaş arası yaklaşık 10.000 çocuğa ücretsiz yüzme eğitimi verdiğini ve amacın yaz aylarında artan boğulma vakalarını azaltmak olduğunu duyurdu.",
    claimEn:
      "In summer 2025 the municipality reported free swimming lessons for about 10,000 children aged 6–14 in 26 semi-Olympic pools across 10 districts, aiming to reduce summer drownings.",
    publisher: "Adana Büyükşehir Belediyesi haber sayfası",
    date: "21.07.2025",
    url: "https://www.adana.bel.tr/tr/haber/27-bin-684-cocuga-ucretsiz-spor-egitimi-veriliyor",
    scope: "2025 Temmuz–Ağustos programı. Havuzların adresleri bu sayfada listelenmiyor; 2026 durumu ayrıca doğrulanmalı.",
    scopeEn: "July–August 2025 programme. Pool addresses are not listed on the page; 2026 availability must be checked separately.",
  },
  {
    id: "tarim-2025-basincli",
    status: "VERIFIED",
    claim:
      "Tarım ve Orman Bakanlığı Adana birimi, açık sulama kanallarından kapalı basınçlı borulu sisteme geçişin başladığını; şehir merkezinden geçen açık kanalların devre dışı bırakılacağını ve bütçenin yaklaşık 100 milyar TL olduğunu duyurdu.",
    claimEn:
      "The Ministry of Agriculture's Adana unit announced the start of a transition from open canals to closed pressurised pipes, including decommissioning open canals through the city centre (approx. 100 billion TL budget).",
    publisher: "T.C. Tarım ve Orman Bakanlığı — Adana Zirai Üretim İşletmesi Tarımsal Yayım ve Hizmetiçi Eğitim Merkezi",
    date: "10.09.2025",
    url: "https://egitim.tarimorman.gov.tr/adana/Haber/1162/Adana-Tariminda-Yeni-Donem-Basliyor-Acik-Sulama-Kanallari-Tarihe-Karisiyor-Kapali-Basincli-Sulama-Sistemine-Geciliyor",
    scope: "Takvim, aşamalar ve hangi kanal kesitlerinin ne zaman kapanacağı belirtilmiyor. Bu çalışma alanındaki kanalın kapanacağı doğrulanmadı.",
    scopeEn: "No timeline, phases or list of canal sections. Closure of the canal in this study area is not verified.",
  },
  {
    id: "abb-meclis-2026-181",
    status: "VERIFIED",
    claim:
      "Aynı oturumda, Büyükşehir Belediyesine ait Seyhan–Gürselpaşa Mahallesi'ndeki yüzme havuzu ve müştemilatının 10 yıl süreyle kiralanması kabul edildi.",
    claimEn:
      "In the same session the council approved a 10-year lease of the municipality-owned swimming pool in Gürselpaşa, Seyhan.",
    publisher: "Adana Büyükşehir Belediye Meclisi, karar sayı 67597785-105.04/181",
    date: "12.06.2026",
    url: "https://www.adana.bel.tr/panel/uploads/mecliskararlari_v/files/2026-haziran-ayi-pdf.pdf",
    scope: "Havuzun tam konumu ve hangi OSM kaydına karşılık geldiği doğrulanmadı; kiralama sonrası kamuya açıklık koşulları bilinmiyor.",
    scopeEn: "The pool's exact location and matching OSM record are not verified; public-access terms after the lease are unknown.",
  },
  {
    id: "yerel-basin-2026-denetim",
    status: "REQUIRES_CONFIRMATION",
    claim:
      "Yerel basın, Temmuz 2026'da Yüreğir'de polisin sulama kanallarında yüzenleri sudan çıkarıp uyardığını ve 7 kişiye toplam 25.942 TL idari para cezası kesildiğini aktardı. Haberde geçen “bu yıl 14 kişi hayatını kaybetti” ifadesi için kaynak belirtilmiyor.",
    claimEn:
      "Local press reported a July 2026 police inspection at irrigation canals in Yüreğir (7 people fined). The article's figure of 14 deaths this year is unattributed, so KanalAtlas does not use it.",
    publisher: "Yeni Birlik Gazetesi (yerel basın)",
    date: "25.07.2026",
    url: "https://www.gazetebirlik.com/yerel-haberler/adanada-sulama-kanallarinda-denetim-7-kisiye-25-bin-tl-ceza-kesildi/1049295",
    scope: "Tek bir haber; ölüm sayısı resmi kaynakla doğrulanmadı ve uygulamada kullanılmıyor.",
    scopeEn: "A single news item; the death figure is not confirmed by an official source and is not used in the app.",
  },
];

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  VERIFIED: "DOĞRULANMIŞ",
  MAPPED: "HARİTALANMIŞ",
  REQUIRES_CONFIRMATION: "DOĞRULAMA GEREKİYOR",
  HYPOTHETICAL: "VARSAYIMSAL",
};

export const STATUS_HELP: Record<VerificationStatus, string> = {
  VERIFIED: "İlgili resmi/özgün bir kaynakta belgelenmiş.",
  MAPPED: "OpenStreetMap'te var; çalışma durumu ve halka açıklığı doğrulanmadı.",
  REQUIRES_CONFIRMATION: "Belirsiz, çelişkili veya güncelliği şüpheli.",
  HYPOTHETICAL: "Kullanıcının eklediği senaryo; gerçek bir tesis değil.",
};
