import { useState } from 'react';
import { CheckCircle2, Cookie, ExternalLink, FileText, Lock, Shield } from 'lucide-react';
import type { Locale } from '../../core/domain/compliance.ts';
import type { PublicGovernanceSummaryDto } from '../../types/peptivora.ts';

export function EuPharmacyLogoNotice({
  locale,
  governance,
  pharmaPrerequisitesMet,
}: {
  locale: Locale;
  governance?: PublicGovernanceSummaryDto | null;
  pharmaPrerequisitesMet: boolean;
}) {
  const isDe = locale === 'de';
  const cfg = governance?.euPharmacyLogo;
  const active =
    Boolean(cfg?.enabled) &&
    pharmaPrerequisitesMet &&
    Boolean(cfg?.authorityRegisterUrl?.startsWith('https://'));

  if (!active) {
    return (
      <div className="bg-lightgrey border border-silver rounded-sm p-5 flex items-start justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="font-mono uppercase font-bold text-navy flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span>
              {isDe
                ? 'EU-Sicherheitslogo (Versandapotheken-Register § 11a ApoG) — Deaktiviert'
                : 'EU Common Online Pharmacy Logo — Disabled by Default'}
            </span>
          </div>
          <p className="text-charcoal/80">
            {cfg
              ? isDe
                ? cfg.displayNoteDe
                : cfg.displayNoteEn
              : isDe
                ? 'Bleibt deaktiviert, bis eine gültige Versandhandelserlaubnis und ein amtlicher Registereintrag vorliegen.'
                : 'Remains disabled until a genuine German mail-order pharmacy authorization and official authority register link are verified.'}
          </p>
        </div>
        <span className="font-mono uppercase px-2 py-1 border border-silver bg-white rounded-sm shrink-0">
          {isDe ? 'Inaktiv' : 'Disabled'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-emerald-50 border border-emerald-300 rounded-sm p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
      <div className="space-y-1">
        <div className="font-mono uppercase font-bold text-emerald-900">
          {isDe
            ? 'Verifizierter EU-Versandapotheken-Nachweis'
            : 'Verified EU Common Online Pharmacy Register Entry'}
        </div>
        <div className="text-emerald-950 font-semibold">{cfg?.authorizedOperatorName}</div>
      </div>
      <a
        href={cfg?.authorityRegisterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 text-white rounded-sm font-medium hover:bg-emerald-900"
      >
        <span>{isDe ? 'Amtlichen Registereintrag prüfen' : 'Verify Authority Register'}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

export function ImpressumPage({
  locale,
  governance,
}: {
  locale: Locale;
  governance?: PublicGovernanceSummaryDto | null;
}) {
  const isDe = locale === 'de';
  const bp = governance?.businessProfile;
  const docs = governance?.legalDocuments;
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="space-y-2">
        <div className="font-mono text-xs uppercase tracking-widest text-scientific">
          § 5 DDG · LEGAL NOTICE
        </div>
        <h1 className="font-display text-3xl font-bold text-navy">
          {isDe ? 'Impressum (Rechtliche Angaben)' : 'German Legal Notice (Impressum)'}
        </h1>
      </div>

      <div className="bg-white border border-silver rounded-sm p-6 sm:p-8 space-y-5 text-sm text-charcoal/85 leading-relaxed">
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 rounded-sm text-xs">
          {docs
            ? isDe
              ? docs.impressumDe
              : docs.impressumEn
            : isDe
              ? 'Hinweis zur Plattform-Transparenz: Es werden ausdrücklich keine erfundenen Handelsregisternummern (HRB), Umsatzsteuer-Identifikationsnummern oder behördlichen Erlaubnisurkunden angegeben.'
              : 'Platform Transparency Notice: No fabricated commercial registry numbers (HRB), VAT IDs, or statutory licensing numbers are presented.'}
        </div>

        <dl className="grid sm:grid-cols-2 gap-4 text-xs border-t border-silver pt-4">
          <div>
            <dt className="font-mono uppercase text-charcoal/60">
              {isDe ? 'Unternehmen / Rechtsträger' : 'Registered Legal Entity'}
            </dt>
            <dd className="text-navy font-medium mt-1">
              {bp?.legalEntityName || (isDe ? 'Nicht hinterlegt (Vor-Launch)' : 'Not configured (Pre-Launch)')}
            </dd>
          </div>
          <div>
            <dt className="font-mono uppercase text-charcoal/60">
              {isDe ? 'Deutsche Geschäftsadresse' : 'German Registered Address'}
            </dt>
            <dd className="text-navy font-medium mt-1">
              {bp?.germanRegisteredAddress || (isDe ? 'Nicht hinterlegt' : 'Not configured')}
            </dd>
          </div>
          <div>
            <dt className="font-mono uppercase text-charcoal/60">Handelsregister / HRB</dt>
            <dd className="text-navy font-mono mt-1">
              {bp?.commercialRegisterInfo || '—'}
            </dd>
          </div>
          <div>
            <dt className="font-mono uppercase text-charcoal/60">USt-IdNr. / Tax ID</dt>
            <dd className="text-navy font-mono mt-1">{bp?.taxVatInfo || '—'}</dd>
          </div>
          <div>
            <dt className="font-mono uppercase text-charcoal/60">
              {isDe ? 'Verantwortliche Person' : 'Responsible Officer'}
            </dt>
            <dd className="text-navy mt-1">{bp?.responsiblePerson || '—'}</dd>
          </div>
          <div>
            <dt className="font-mono uppercase text-charcoal/60">
              {isDe ? 'Regulatorische Ansprechpartner' : 'Regulatory Contacts'}
            </dt>
            <dd className="text-navy mt-1">{bp?.regulatoryContacts || 'Via Contact Page'}</dd>
          </div>
        </dl>

        <section className="space-y-1 border-t border-silver pt-4">
          <h2 className="font-display font-bold text-navy text-base">
            {isDe ? 'Regulatorischer Abgrenzungshinweis (AMG / HWG / ChemG)' : 'Regulatory Boundary Notice (AMG / HWG / ChemG)'}
          </h2>
          <p>
            {isDe
              ? 'Der Pharmazeutische Bereich ist technisch und rechtlich gesperrt, solange keine unabhängige behördliche Prüfung von Apothekenbetriebserlaubnis, § 52a AMG-Großhandelserlaubnis, Produktzulassung und Abgabe-Workflow dokumentiert ist.'
              : 'The Pharmaceutical Division remains technically and legally locked unless independent verification of German pharmacy license, § 52a AMG wholesale authorization, marketing authorization, and dispensing workflow is documented.'}
          </p>
        </section>
      </div>
    </div>
  );
}

export function PrivacyPage({
  locale,
  governance,
}: {
  locale: Locale;
  governance?: PublicGovernanceSummaryDto | null;
}) {
  const isDe = locale === 'de';
  const docs = governance?.legalDocuments;
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-scientific">
          <Shield className="w-4 h-4" aria-hidden="true" />
          <span>DSGVO / GDPR</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-navy">
          {isDe ? 'Datenschutzerklärung' : 'Privacy Policy'}
        </h1>
      </div>

      <div className="bg-white border border-silver rounded-sm p-6 sm:p-8 space-y-5 text-sm text-charcoal/85 leading-relaxed">
        {docs && (
          <div className="p-4 bg-lightgrey border border-silver rounded-sm text-xs space-y-1">
            <div className="font-mono uppercase text-scientific">
              {docs.reviewStatus === 'counsel_reviewed'
                ? 'Legal Counsel Reviewed'
                : 'Governance Template — Obtain Legal Review Prior to Launch'}
            </div>
            <p className="text-navy">{isDe ? docs.privacyDe : docs.privacyEn}</p>
          </div>
        )}
        <section className="space-y-1.5">
          <h2 className="font-display font-bold text-navy text-base">
            {isDe ? '1. Authentifizierung & Kontoprofile' : '1. Authentication & Account Profiles'}
          </h2>
          <p>
            {isDe
              ? 'Die Anmeldung erfolgt über Firebase Authentication. Ihr Nutzerprofil, Ihre institutionellen KYB-Angaben, Lieferanschriften sowie Bestell- und Einwilligungsdatensätze werden in Cloud SQL (PostgreSQL, Region europe-west2) verarbeitet.'
              : 'Authentication uses Firebase Authentication. Your profile, institutional KYB details, laboratory addresses, orders, and consent logs are stored in Cloud SQL (PostgreSQL, europe-west2).'}
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-display font-bold text-navy text-base">
            {isDe ? '2. Betroffenenrechte (Art. 15–17 DSGVO)' : '2. GDPR Rights (Access, Correction & Erasure)'}
          </h2>
          <p>
            {isDe
              ? 'Im Kundenkonto stehen Exportfunktionen (Art. 15 DSGVO) sowie die Daten-Anonymisierung (Art. 17 DSGVO) unter Wahrung gesetzlicher steuerlicher Aufbewahrungspflichten zur Verfügung.'
              : 'Data export (Art. 15 GDPR) and personal data anonymization (Art. 17 GDPR) are available directly inside the Customer Account dashboard.'}
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-display font-bold text-navy text-base">
            {isDe ? '3. Einwilligungsmanagement' : '3. Consent Management'}
          </h2>
          <p>
            {docs ? (isDe ? docs.cookiePolicyDe : docs.cookiePolicyEn) : ''}
          </p>
        </section>
      </div>
    </div>
  );
}

export function TermsPage({
  locale,
  governance,
}: {
  locale: Locale;
  governance?: PublicGovernanceSummaryDto | null;
}) {
  const isDe = locale === 'de';
  const docs = governance?.legalDocuments;
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-scientific">
          <FileText className="w-4 h-4" aria-hidden="true" />
          <span>{isDe ? 'GESCHÄFTSBEDINGUNGEN & VERSAND' : 'TERMS, SHIPPING & SAFETY'}</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-navy">
          {isDe
            ? 'AGB, Versand-, Rückgabe- & Produktsicherheitsbedingungen'
            : 'General Terms, Shipping, Returns & Product Safety'}
        </h1>
      </div>

      <div className="bg-white border border-silver rounded-sm p-6 sm:p-8 space-y-5 text-sm text-charcoal/85 leading-relaxed">
        <section className="space-y-1.5">
          <h2 className="font-display font-bold text-navy text-base">
            {isDe ? '§ 1 AGB & B2B-Forschungsbeschränkung' : '§ 1 Institutional Terms & RUO Scope'}
          </h2>
          <p>{docs ? (isDe ? docs.termsDe : docs.termsEn) : ''}</p>
        </section>
        <section className="space-y-1.5 border-t border-silver pt-4">
          <h2 className="font-display font-bold text-navy text-base">
            {isDe ? '§ 2 Widerrufshinweis' : '§ 2 Withdrawal Notice'}
          </h2>
          <p>{docs ? (isDe ? docs.withdrawalDe : docs.withdrawalEn) : ''}</p>
        </section>
        <section className="space-y-1.5 border-t border-silver pt-4">
          <h2 className="font-display font-bold text-navy text-base">
            {isDe ? '§ 3 Versandbedingungen' : '§ 3 Shipping Policy'}
          </h2>
          <p>{docs ? (isDe ? docs.shippingDe : docs.shippingEn) : ''}</p>
        </section>
        <section className="space-y-1.5 border-t border-silver pt-4">
          <h2 className="font-display font-bold text-navy text-base">
            {isDe ? '§ 4 Rückgabe & Erstattung' : '§ 4 Returns & Refunds'}
          </h2>
          <p>{docs ? (isDe ? docs.returnsDe : docs.returnsEn) : ''}</p>
        </section>
        <section className="space-y-1.5 border-t border-silver pt-4">
          <h2 className="font-display font-bold text-navy text-base">
            {isDe ? '§ 5 Produkt- und Chemikaliensicherheit (REACH / CLP)' : '§ 5 Product & Chemical Safety (REACH / CLP)'}
          </h2>
          <p>{docs ? (isDe ? docs.productSafetyDe : docs.productSafetyEn) : ''}</p>
        </section>
      </div>
    </div>
  );
}

export function CookiePreferencesPage({
  locale,
  functionalCookies,
  analyticsCookies,
  onSavePreferences,
}: {
  locale: Locale;
  functionalCookies: boolean;
  analyticsCookies: boolean;
  onSavePreferences: (prefs: { functional: boolean; analytics: boolean }) => Promise<void>;
}) {
  const isDe = locale === 'de';
  const [functional, setFunctional] = useState(functionalCookies);
  const [analytics, setAnalytics] = useState(analyticsCookies);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  async function handleSave(nextFunctional: boolean, nextAnalytics: boolean) {
    setSaving(true);
    setSavedBanner(false);
    try {
      await onSavePreferences({ functional: nextFunctional, analytics: nextAnalytics });
      setSavedBanner(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-scientific">
          <Cookie className="w-4 h-4" aria-hidden="true" />
          <span>TTDSG / GDPR CONSENT</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-navy">
          {isDe ? 'Cookie- & Einwilligungseinstellungen' : 'Cookie Preferences'}
        </h1>
      </div>

      <div className="bg-white border border-silver rounded-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-silver/60 pb-4">
          <div>
            <h2 className="font-display font-bold text-navy">
              {isDe ? 'Technisch notwendige Cookies' : 'Strictly Necessary Cookies'}
            </h2>
            <p className="text-sm text-charcoal/80 mt-1">
              {isDe
                ? 'Erforderlich für Sitzungsschutz, Warenkorb-Bereichstrennung und Sprachwahl.'
                : 'Required for session security, division-isolated cart state, and locale selection.'}
            </p>
          </div>
          <span className="font-mono text-xs uppercase px-2.5 py-1 bg-lightgrey border border-silver rounded-sm text-navy shrink-0">
            {isDe ? 'Immer aktiv' : 'Always Active'}
          </span>
        </div>

        <label className="flex items-start justify-between gap-4 border-b border-silver/60 pb-4 cursor-pointer">
          <div>
            <span className="font-display font-bold text-navy block">
              {isDe ? 'Funktionale Präferenzen' : 'Functional Preferences'}
            </span>
            <span className="text-sm text-charcoal/80 mt-1 block">
              {isDe
                ? 'Speichert Katalogfilter und bevorzugte Gebindeauswahl lokal.'
                : 'Retains catalog filter settings and preferred pack-size selections locally.'}
            </span>
          </div>
          <input
            type="checkbox"
            checked={functional}
            onChange={(e) => setFunctional(e.target.checked)}
            className="mt-1 h-4 w-4 accent-scientific"
          />
        </label>

        <label className="flex items-start justify-between gap-4 pb-2 cursor-pointer">
          <div>
            <span className="font-display font-bold text-navy block">
              {isDe ? 'Aggregierte Plattform-Analytik' : 'Aggregate Platform Analytics'}
            </span>
            <span className="text-sm text-charcoal/80 mt-1 block">
              {isDe
                ? 'Hilft bei der anonymisierten Auswertung der Dokumentationsnutzung.'
                : 'Assists with anonymized evaluation of documentation usage.'}
            </span>
          </div>
          <input
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
            className="mt-1 h-4 w-4 accent-scientific"
          />
        </label>

        {savedBanner && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-sm text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>
              {isDe
                ? 'Einwilligungsdatensatz in PostgreSQL (consent_records) gespeichert.'
                : 'Consent preference saved to PostgreSQL (consent_records).'}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(functional, analytics)}
            className="px-5 py-2.5 bg-scientific text-white text-sm font-medium rounded-sm hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
          >
            {isDe ? 'Auswahl speichern' : 'Save Preferences'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setFunctional(true);
              setAnalytics(true);
              void handleSave(true, true);
            }}
            className="px-5 py-2.5 border border-navy text-navy text-sm font-medium rounded-sm hover:bg-lightgrey cursor-pointer"
          >
            {isDe ? 'Alle akzeptieren' : 'Accept All'}
          </button>
        </div>
      </div>
    </div>
  );
}
