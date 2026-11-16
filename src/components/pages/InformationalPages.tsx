import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  FileCheck2,
  FlaskConical,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import type { Locale } from '../../core/domain/compliance.ts';
import { FAQ_ITEMS_BILINGUAL } from '../../core/seo/seoEngine.ts';
import type { PageRoute } from '../../types/peptivora.ts';
import {
  PRECISION_EASE,
  RevealSection,
  StaggerRevealGrid,
  StaggerRevealItem,
} from '../ui/MotionPrimitives.tsx';
import { ResilientImage } from '../ui/ResilientImage.tsx';

export function AboutPage({
  locale,
  onNavigate,
}: {
  locale: Locale;
  onNavigate: (r: PageRoute) => void;
}) {
  const isDe = locale === 'de';
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-10 sm:space-y-12">
      <RevealSection className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center bg-white border border-silver rounded-sm p-6 sm:p-10 shadow-xs">
        <div className="lg:col-span-7 space-y-4">
          <div className="font-mono text-xs uppercase tracking-widest text-scientific">
            {isDe ? 'ÜBER PEPTIVORA' : 'ABOUT PEPTIVORA'}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy">
            {isDe
              ? 'Verantwortungsvolle Peptid-Infrastruktur aus Deutschland.'
              : 'Responsible peptide infrastructure built in Germany.'}
          </h1>
          <p className="text-base text-charcoal/85 leading-relaxed">
            {isDe
              ? 'PEPTIVORA verbindet analytische Präzision mit einer kompromisslosen regulatorischen Architektur. Unser System trennt wissenschaftliche Referenzmaterialien für akkreditierte Laborforschung strikt von regulierten Arzneimittelabläufen.'
              : 'PEPTIVORA combines analytical precision with uncompromising regulatory architecture. Our platform enforces strict isolation between accredited laboratory research materials and regulated medicinal supply workflows.'}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('quality')}
              className="btn-precision min-h-[44px] px-5 py-2.5 bg-navy text-white text-sm font-medium rounded-sm hover:bg-slate-800 cursor-pointer"
            >
              {isDe ? 'Qualitätssicherung ansehen' : 'Explore Quality Assurance'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="btn-precision min-h-[44px] px-5 py-2.5 border border-silver text-navy text-sm font-medium rounded-sm hover:bg-lightgrey cursor-pointer"
            >
              {isDe ? 'Kontakt aufnehmen' : 'Contact Us'}
            </button>
          </div>
        </div>
        <div className="group lg:col-span-5 aspect-[4/3] rounded-sm overflow-hidden border border-silver">
          <ResilientImage
            src="/src/assets/images/hero_biotech_lab_1794861146394.jpg"
            alt="PEPTIVORA Biotechnology Facility"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </div>
      </RevealSection>

      <StaggerRevealGrid className="grid md:grid-cols-3 gap-6">
        <StaggerRevealItem>
          <div className="surface-card h-full bg-white border border-silver rounded-sm p-6 space-y-2.5">
            <Scale className="w-5 h-5 text-scientific" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-navy">
              {isDe ? 'Keine automatische RUO-Ausnahme' : 'No Automatic RUO Exemption'}
            </h2>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              {isDe
                ? 'Ein Herstellerhinweis „Research Use Only“ begründet rechtlich keine Befreiung vom Arzneimittelgesetz (AMG). Jede Listung erfordert eine unabhängige Einzelfallprüfung.'
                : 'A manufacturer "Research Use Only" designation never establishes statutory exemption under German medicinal law (AMG). Every product undergoes independent pre-publication assessment.'}
            </p>
          </div>
        </StaggerRevealItem>

        <StaggerRevealItem>
          <div className="surface-card h-full bg-white border border-silver rounded-sm p-6 space-y-2.5">
            <ShieldCheck className="w-5 h-5 text-scientific" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-navy">
              {isDe ? 'Vier-Augen-Prinzip in PostgreSQL' : 'Database-Backed Four-Eyes Governance'}
            </h2>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              {isDe
                ? 'Produktmanagement, Compliance-Prüfung, Bestellabwicklung und Redaktion sind rollenbasiert getrennt und über unveränderliche Audit-Logs nachvollziehbar.'
                : 'Product management, regulatory review, order dispatch, and editorial publishing are separated by RBAC roles and recorded inside immutable audit trails.'}
            </p>
          </div>
        </StaggerRevealItem>

        <StaggerRevealItem>
          <div className="surface-card h-full bg-white border border-silver rounded-sm p-6 space-y-2.5">
            <FlaskConical className="w-5 h-5 text-scientific" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-navy">
              {isDe ? 'Transparente Demonstrationsdaten' : 'Transparent Demonstration Records'}
            </h2>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              {isDe
                ? 'PEPTIVORA erfindet keine behördlichen Zulassungen, Handelsregisternummern oder Laborwerte. Aktuelle Katalogeinträge sind klar als fiktive Demo-Datensätze markiert.'
                : 'PEPTIVORA never fabricates regulatory authorizations, commercial registry numbers, or laboratory results. Seeded catalog records are explicitly marked as fictional demos.'}
            </p>
          </div>
        </StaggerRevealItem>
      </StaggerRevealGrid>
    </div>
  );
}

export function QualityPage({
  locale,
  onNavigate,
}: {
  locale: Locale;
  onNavigate: (r: PageRoute) => void;
}) {
  const isDe = locale === 'de';
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-10">
      <RevealSection className="bg-lab-grid-dark text-white rounded-sm p-6 sm:p-10 grid lg:grid-cols-12 gap-8 items-center border border-navy">
        <div className="lg:col-span-7 space-y-4">
          <div className="font-mono text-xs uppercase tracking-widest text-blue-300">
            {isDe ? 'QUALITÄTSSICHERUNG & GOVERNANCE' : 'QUALITY ASSURANCE & GOVERNANCE'}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">
            {isDe
              ? 'Lückenlose Dokumentenintegrität und Freigabekontrolle.'
              : 'End-to-end document integrity and release governance.'}
          </h1>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            {isDe
              ? 'Jedes Sicherheitsdatenblatt (SDS), Analysenzertifikat (CoA) und regulatorische Dossier durchläuft einen technischen Prüfprozess inklusive SHA-256-Prüfsumme, bevor verifizierte Institutionen Zugriff erhalten.'
              : 'Every Safety Data Sheet (SDS), Certificate of Analysis (CoA), and regulatory dossier undergoes verification with SHA-256 cryptographic checksums before KYB-verified institutions can download files.'}
          </p>
        </div>
        <div className="group lg:col-span-5 aspect-[16/10] rounded-sm overflow-hidden border border-white/20 shadow-xl">
          <ResilientImage
            src="/src/assets/images/quality_hplc_lab_1794861843624.jpg"
            alt={isDe ? 'Analytisches Chromatographie-Labor' : 'Analytical Chromatography Laboratory'}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </div>
      </RevealSection>

      <StaggerRevealGrid className="grid md:grid-cols-2 gap-6">
        {[
          {
            title: isDe ? '1. SHA-256-Dokumenten-Tresor' : '1. SHA-256 Document Vault',
            body: isDe
              ? 'Hochgeladene Dateien werden serverseitig gehasht. Nachträgliche Manipulationen werden durch den Prüfvergleich sofort erkannt; der Uploader darf ein Dokument niemals selbst als verifiziert markieren.'
              : 'Uploaded files are hashed server-side on ingest. Uploaders are barred from self-verifying documents prior to KYB-authorized download access.',
          },
          {
            title: isDe ? '2. Verfallsdatum & automatische Sperre' : '2. Approval Expiry & Auto-Suspension',
            body: isDe
              ? 'Freigaben besitzen ein Ablaufdatum (expires_at). Überschreitet ein Eintrag das Datum oder steht auf „ausgesetzt“ / „abgelaufen“, blendet das System ihn im Katalog automatisch aus.'
              : 'Approvals track explicit expiry timestamps (expires_at). Once expired or suspended, the public catalog and checkout engines automatically exclude the SKU.',
          },
          {
            title: isDe ? '3. Institutionelle KYB-Prüfung' : '3. Institutional KYB Onboarding',
            body: isDe
              ? 'Nur Universitäten, Forschungsinstitute und verifizierte Unternehmen mit freigegebenem KYB-Dossier und verbindlicher Nicht-Humananwendungs-Erklärung können Forschungsbestellungen übermitteln.'
              : 'Only universities, research institutes, and vetted biotech institutions with approved KYB status and mandatory non-human-use attestation may submit Research orders.',
          },
          {
            title: isDe ? '4. Keine erfundenen Zertifikate' : '4. Zero Fabricated Certifications',
            body: isDe
              ? 'Sofern keine realen Laborzertifikate im Tresor vorliegen, weist PEPTIVORA ausdrücklich auf den Demonstrationsstatus hin und stellt keine simulierten ISO- oder GMP-Zertifikatsnummern dar.'
              : 'Where real batch certificates have not yet been uploaded to the Vault, PEPTIVORA explicitly indicates demonstration status rather than rendering fabricated ISO or GMP numbers.',
          },
        ].map((card) => (
          <StaggerRevealItem key={card.title}>
            <div className="surface-card h-full bg-white border border-silver rounded-sm p-6 space-y-2">
              <FileCheck2 className="w-5 h-5 text-scientific" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-navy">{card.title}</h2>
              <p className="text-sm text-charcoal/80 leading-relaxed">{card.body}</p>
            </div>
          </StaggerRevealItem>
        ))}
      </StaggerRevealGrid>

      <RevealSection className="surface-card bg-white border border-silver rounded-sm p-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-charcoal/85">
          {isDe
            ? 'Entdecken Sie weiterführende Methodikartikel im Wissenschaftlichen Wissenszentrum.'
            : 'Explore analytical methodology guides inside the Scientific Knowledge Centre.'}
        </p>
        <button
          type="button"
          onClick={() => onNavigate('knowledge')}
          className="btn-precision group inline-flex items-center gap-2 min-h-[44px] px-4 py-2 bg-scientific text-white text-sm font-medium rounded-sm hover:bg-blue-700 cursor-pointer"
        >
          <span>{isDe ? 'Zum Wissenszentrum' : 'Open Knowledge Centre'}</span>
          <ArrowRight
            className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </button>
      </RevealSection>
    </div>
  );
}

export function KnowledgePage({
  locale,
  onNavigate,
}: {
  locale: Locale;
  onNavigate: (r: PageRoute) => void;
}) {
  const isDe = locale === 'de';
  const guides = [
    {
      code: 'DOC-STD-01',
      title: isDe
        ? 'Abgrenzung: Forschungsreagenzien (RUO) vs. Arzneimittel nach § 2 AMG'
        : 'Statutory Distinction: Research Reagents (RUO) vs. Medicinal Products (§ 2 AMG)',
      summary: isDe
        ? 'Darstellung der objektiven Kriterien für Funktions- und Präsentationsarzneimittel, des Werbeverbots (§ 10 HWG) sowie der ChemG/REACH-Informationspflichten.'
        : 'Breakdown of objective criteria governing medicinal presentation and function, consumer advertising bans (§ 10 HWG), and ChemG/REACH obligations.',
    },
    {
      code: 'DOC-STD-02',
      title: isDe
        ? 'Lagerstabilität, Lyophilisation und Kühlketten-Dokumentation'
        : 'Storage Stability, Lyophilization & Cold-Chain Documentation',
      summary: isDe
        ? 'Leitfaden zu Temperaturzonen (-20 °C vs. 2–8 °C), Lichtschutz, Rekonstitutionshinweisen für In-vitro-Assays und lückenloser Chargenrückverfolgung.'
        : 'Guidance on temperature regimes (-20 °C vs. 2–8 °C), desiccation, in-vitro analytical handling, and batch-level inventory movements.',
    },
    {
      code: 'DOC-STD-03',
      title: isDe
        ? 'Anforderungen an institutionelle KYB-Dossiers und Umsatzsteuer-ID'
        : 'Institutional KYB Dossier & EU VAT Verification Standards',
      summary: isDe
        ? 'Welche Nachweise deutsche und europäische Forschungseinrichtungen für den Zugang zu geschützten Dokumenten und Forschungsbestellungen benötigen.'
        : 'Documentation required from German and European research institutions to access protected Vault records and Research checkout.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-10">
      <RevealSection className="grid lg:grid-cols-12 gap-8 items-center bg-white border border-silver rounded-sm p-6 sm:p-8 shadow-xs">
        <div className="lg:col-span-7 space-y-3">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-scientific">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>{isDe ? 'WISSENSZENTRUM' : 'SCIENTIFIC KNOWLEDGE CENTRE'}</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-navy">
            {isDe
              ? 'Wissenschaftliche Dokumentation & regulatorische Leitlinien.'
              : 'Scientific documentation & regulatory guidance.'}
          </h1>
          <p className="text-sm sm:text-base text-charcoal/80 leading-relaxed">
            {isDe
              ? 'Sachliche Referenzen für Laborleitungen, Compliance-Beauftragte und Qualitätsmanagement-Teams in Deutschland und der EU.'
              : 'Structured technical references for laboratory directors, compliance officers, and quality assurance teams across Germany and the EU.'}
          </p>
        </div>
        <div className="group lg:col-span-5 aspect-[4/3] rounded-sm overflow-hidden border border-silver">
          <ResilientImage
            src="/src/assets/images/knowledge_molecular_bench_1794861846484.jpg"
            alt={isDe ? 'Wissenschaftlicher Arbeitsplatz' : 'Scientific Analytical Bench'}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </div>
      </RevealSection>

      <StaggerRevealGrid className="grid md:grid-cols-3 gap-6">
        {guides.map((g) => (
          <StaggerRevealItem key={g.code}>
            <article className="surface-card h-full bg-white border border-silver rounded-sm p-6 flex flex-col justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-scientific mb-2">{g.code}</div>
                <h2 className="font-display text-lg font-bold text-navy leading-snug mb-2">
                  {g.title}
                </h2>
                <p className="text-sm text-charcoal/80 leading-relaxed">{g.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('blog')}
                className="self-start text-xs font-semibold text-scientific hover:underline cursor-pointer"
              >
                {isDe ? 'Vertiefende Beiträge im Blog →' : 'Read extended articles in Blog →'}
              </button>
            </article>
          </StaggerRevealItem>
        ))}
      </StaggerRevealGrid>
    </div>
  );
}

export function FaqPage({
  locale,
  onNavigate,
}: {
  locale: Locale;
  onNavigate: (r: PageRoute) => void;
}) {
  const isDe = locale === 'de';
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const items = FAQ_ITEMS_BILINGUAL[locale];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8">
      <div className="space-y-2">
        <div className="font-mono text-xs uppercase tracking-widest text-scientific">FAQ</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy">
          {isDe ? 'Häufig gestellte Fragen' : 'Frequently Asked Questions'}
        </h1>
      </div>

      <div className="divide-y divide-silver border border-silver bg-white rounded-sm shadow-xs overflow-hidden">
        {items.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={item.q}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full min-h-[52px] px-4 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between gap-4 hover:bg-lightgrey/60 transition-colors cursor-pointer"
              >
                <span className="font-display font-semibold text-sm sm:text-base text-navy">
                  {item.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-charcoal/70 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-scientific' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: PRECISION_EASE }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-6 pb-5 text-sm text-charcoal/85 leading-relaxed">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="surface-card text-sm text-charcoal/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-silver rounded-sm p-5">
        <span>{isDe ? 'Weitere Fragen zur Compliance?' : 'Additional compliance questions?'}</span>
        <button
          type="button"
          onClick={() => onNavigate('contact')}
          className="font-semibold text-scientific hover:underline text-left sm:text-right py-1 cursor-pointer"
        >
          {isDe ? 'Zum Kontaktformular →' : 'Open Contact Form →'}
        </button>
      </div>
    </div>
  );
}
