import type { Locale } from '../domain/compliance.ts';
import type {
  BlogPostDto,
  PageRoute,
  ProductDto,
  SeoPageConfigDto,
} from '../../types/peptivora.ts';

export interface BreadcrumbItem {
  labelDe: string;
  labelEn: string;
  route: PageRoute;
  url: string;
}

export const FAQ_ITEMS_BILINGUAL: Record<Locale, { q: string; a: string }[]> = {
  de: [
    {
      q: 'Macht ein Herstellerhinweis „Research Use Only (RUO)“ ein Produkt automatisch verkehrsfähig?',
      a: 'Nein. Nach deutschem und europäischem Recht richtet sich die Einstufung nach objektiven Stoffeigenschaften und Zweckbestimmung (u. a. AMG, HWG, ChemG). Jedes Produkt bei PEPTIVORA wird vor Veröffentlichung unabhängig klassifiziert und freigegeben.',
    },
    {
      q: 'Warum sind Bestellungen im Pharmazeutischen Bereich derzeit deaktiviert?',
      a: 'Arzneimittel dürfen nur über verifizierte Apothekenbetriebe (§ 1 ApoG), autorisierte Großhändler (§ 52a AMG), zugelassene Produkte und geprüfte Abgabeprozesse bereitgestellt werden. Solange diese vier Nachweise nicht im System verifiziert sind, bleibt die Transaktionsschnittstelle gesperrt.',
    },
    {
      q: 'Handelt es sich bei PV-DEM-101 bis PV-DEM-103 um reale Produkte?',
      a: 'Nein. Diese Einträge sind ausdrücklich als fiktive Demonstrationsdatensätze gekennzeichnet, um Katalogfilter, Varianten, SHA-256-Dokumentenbindung, USt.-Rechnungen und Freigabesperren realistisch vorzuführen.',
    },
    {
      q: 'Wie erhalten akkreditierte Forschungseinrichtungen Zugriff auf Bestellungen und Dokumente?',
      a: 'Nach der Anmeldung über Google können Institutionen im Kundenkonto ihr KYB-Dossier (Einrichtungsname, Typ, USt-IdNr.) zur Prüfung durch einen Compliance-Prüfer einreichen. Nach Freigabe stehen Forschungsbestellungen (mit RUO-Erklärung) und Dokumenten-Downloads offen.',
    },
  ],
  en: [
    {
      q: 'Does a manufacturer "Research Use Only (RUO)" label exempt a product from medicinal law?',
      a: 'No. Under German and EU law, classification depends on objective substance properties, presentation, and statutory frameworks (AMG, HWG, ChemG). Every listing on PEPTIVORA requires independent pre-publication review.',
    },
    {
      q: 'Why are Pharmaceutical Division transactions currently locked?',
      a: 'Medicinal products require independent verification of German pharmacy licensing (§ 1 ApoG), § 52a AMG wholesale arrangements, valid product authorization, and compliant dispensing workflows. Until all four pillars are verified, checkout remains disabled server-side.',
    },
    {
      q: 'Are PV-DEM-101 through PV-DEM-103 real commercial compounds?',
      a: 'No. All seeded products are explicitly marked as fictional demonstration records illustrating catalog filtering, variants, SHA-256 vault documents, VAT invoices, and expiry gating.',
    },
    {
      q: 'How do accredited research institutions enable ordering and document downloads?',
      a: 'After signing in with Google, submit your institutional KYB dossier in the Customer Account section. Once verified by a Regulatory Reviewer, Research checkout (with mandatory non-human-use attestation) and Vault downloads are unlocked.',
    },
  ],
};

export interface KeywordCluster {
  id: string;
  primaryKeywordDe: string;
  searchIntent: 'informational' | 'commercial_b2b' | 'navigational' | 'compliance';
  targetRoute: PageRoute;
  supportingKeywordsDe: string[];
  excludedTermsWarning: string;
}

export const GERMAN_KEYWORD_FRAMEWORK: KeywordCluster[] = [
  {
    id: 'kw-peptidwissenschaft',
    primaryKeywordDe: 'Peptidwissenschaft Deutschland',
    searchIntent: 'informational',
    targetRoute: 'home',
    supportingKeywordsDe: [
      'Biotechnologie Plattform',
      'Peptidforschung B2B',
      'Transparenz Laborqualität',
    ],
    excludedTermsWarning: 'Keine Heil-, Therapie- oder Arzneimittelversprechen.',
  },
  {
    id: 'kw-peptidanalytik',
    primaryKeywordDe: 'Peptidanalytik und Qualitätskontrolle',
    searchIntent: 'informational',
    targetRoute: 'quality',
    supportingKeywordsDe: [
      'HPLC Reinheitsprüfung Peptide',
      'Massenspektrometrie CoA',
      'Wissenschaftliche Dokumentation',
    ],
    excludedTermsWarning: 'Nur analytische Prüfparameter, keine klinische Indikation.',
  },
  {
    id: 'kw-laborbedarf',
    primaryKeywordDe: 'Forschungspeptide Laborbedarf',
    searchIntent: 'commercial_b2b',
    targetRoute: 'research',
    supportingKeywordsDe: [
      'Peptidforschung In-vitro',
      'Referenzmaterialien Labor',
      'Biotechnologische Forschung',
    ],
    excludedTermsWarning: 'Keine Keywords zu Selbstanwendung, Dosierung oder Humantherapie.',
  },
  {
    id: 'kw-katalog',
    primaryKeywordDe: 'Peptid Katalog Forschungsmaterialien',
    searchIntent: 'commercial_b2b',
    targetRoute: 'catalogue',
    supportingKeywordsDe: [
      'Lyophilisierte Referenzpeptide',
      'Sicherheitsdatenblatt SDB',
      'Chargenrückverfolgbarkeit',
    ],
    excludedTermsWarning: 'Kein Rezept- oder Verbrauchermarketing für RUO-Einträge.',
  },
  {
    id: 'kw-wissen',
    primaryKeywordDe: 'Wissenschaftliche Dokumentation Peptide',
    searchIntent: 'informational',
    targetRoute: 'knowledge',
    supportingKeywordsDe: [
      'AMG HWG ChemG Abgrenzung',
      'Stabilität und Lagerung',
      'REACH CLP Laborpflichten',
    ],
    excludedTermsWarning: 'Streng wissenschaftlich-regulatorischer Informationsauftrag.',
  },
  {
    id: 'kw-pharma',
    primaryKeywordDe: 'Regulierte Arzneimittel-Compliance Deutschland',
    searchIntent: 'compliance',
    targetRoute: 'pharmaceutical',
    supportingKeywordsDe: [
      'Apothekenbetriebserlaubnis Prüfung',
      'Paragraph 52a AMG Großhandel',
      'Versandhandelserlaubnis Register',
    ],
    excludedTermsWarning: 'Kein Endverbraucher-Abverkauf ohne verifizierte Zulassung.',
  },
];

export const ROUTE_PATH_MAP: Record<PageRoute, { de: string; en: string; indexable: boolean }> = {
  home: { de: '/de/', en: '/en/', indexable: true },
  about: { de: '/de/unternehmen/', en: '/en/about/', indexable: true },
  research: { de: '/de/forschung/', en: '/en/research/', indexable: true },
  pharmaceutical: { de: '/de/pharma/', en: '/en/pharmaceutical/', indexable: true },
  catalogue: { de: '/de/katalog/', en: '/en/catalogue/', indexable: true },
  product: { de: '/de/produkt/', en: '/en/product/', indexable: true },
  quality: { de: '/de/qualitaet/', en: '/en/quality/', indexable: true },
  knowledge: { de: '/de/wissen/', en: '/en/knowledge/', indexable: true },
  blog: { de: '/de/blog/', en: '/en/blog/', indexable: true },
  faq: { de: '/de/faq/', en: '/en/faq/', indexable: true },
  contact: { de: '/de/kontakt/', en: '/en/contact/', indexable: true },
  account: { de: '/de/konto/', en: '/en/account/', indexable: false },
  cart: { de: '/de/warenkorb/', en: '/en/cart/', indexable: false },
  checkout: { de: '/de/kasse/', en: '/en/checkout/', indexable: false },
  privacy: { de: '/de/datenschutz/', en: '/en/privacy/', indexable: true },
  terms: { de: '/de/agb/', en: '/en/terms/', indexable: true },
  impressum: { de: '/de/impressum/', en: '/en/impressum/', indexable: true },
  cookies: { de: '/de/cookies/', en: '/en/cookies/', indexable: false },
  compliance: { de: '/de/compliance/', en: '/en/compliance/', indexable: false },
};

export const DEFAULT_SEO_PAGES: SeoPageConfigDto[] = [
  {
    route: 'home',
    seoTitleDe: 'PEPTIVORA – Präzisions-Peptidwissenschaft Deutschland',
    seoTitleEn: 'PEPTIVORA – Precision Peptide Science Germany',
    metaDescriptionDe:
      'PEPTIVORA: Deutsche Biotechnologie-Plattform für geprüfte Forschungspeptide, Peptidanalytik und regulatorische Compliance.',
    metaDescriptionEn:
      'PEPTIVORA: German biotechnology platform for vetted research peptides, analytical documentation, and strict regulatory separation.',
    canonicalUrl: '/de/',
    focusKeywordDe: 'Peptidwissenschaft Deutschland',
    focusKeywordEn: 'Peptide Science Germany',
    supportingKeywords: 'Biotechnologie, Peptidforschung, Qualitätskontrolle, Laborbedarf',
    socialImageUrl: '/src/assets/images/hero_peptide_laboratory_1794861142758.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'Organization',
  },
  {
    route: 'about',
    seoTitleDe: 'Über PEPTIVORA – Biotechnologie & Governance',
    seoTitleEn: 'About PEPTIVORA – Biotechnology & Governance',
    metaDescriptionDe:
      'Erfahren Sie mehr über die regulatorische Governance, Qualitätsarchitektur und Bereichstrennung bei PEPTIVORA in Deutschland.',
    metaDescriptionEn:
      'Learn about PEPTIVORA governance, quality standards, and separated Research and Pharmaceutical divisions in Germany.',
    canonicalUrl: '/de/unternehmen/',
    focusKeywordDe: 'Biotechnologische Forschung Governance',
    focusKeywordEn: 'Biotechnology Governance Germany',
    supportingKeywords: 'PEPTIVORA, Unternehmensstruktur, Regulatorik',
    socialImageUrl: '/src/assets/images/hero_peptide_laboratory_1794861142758.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'WebPage',
  },
  {
    route: 'research',
    seoTitleDe: 'Geschäftsbereich Forschung – Geprüfte Laborpeptide',
    seoTitleEn: 'Research Division – Vetted Laboratory Peptides',
    metaDescriptionDe:
      'Akkreditierte Forschungspeptide und In-vitro-Referenzmaterialien für Labore und Institute mit transparenter Prüfdokumentation.',
    metaDescriptionEn:
      'Vetted research-use-only peptide reference materials for verified academic and commercial laboratories.',
    canonicalUrl: '/de/forschung/',
    focusKeywordDe: 'Forschungspeptide Laborbedarf',
    focusKeywordEn: 'Research Peptides Laboratory Supply',
    supportingKeywords: 'Peptidforschung, In-vitro Analytik, KYB Laborzugang',
    socialImageUrl: '/src/assets/images/product_lyophilized_vial_1794861146550.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'CollectionPage',
  },
  {
    route: 'pharmaceutical',
    seoTitleDe: 'Pharmazeutischer Bereich – AMG & Apotheken-Gate',
    seoTitleEn: 'Pharmaceutical Division – AMG & Pharmacy Gate',
    metaDescriptionDe:
      'Regulierte Arzneimittel-Governance bei PEPTIVORA: dauerhaft gesperrt bis zur unabhängigen Prüfung deutscher Erlaubnisse.',
    metaDescriptionEn:
      'Regulated pharmaceutical compliance gate at PEPTIVORA: locked until independent verification of German authorizations.',
    canonicalUrl: '/de/pharma/',
    focusKeywordDe: 'Regulierte Arzneimittel-Compliance Deutschland',
    focusKeywordEn: 'Pharmaceutical Compliance Gate Germany',
    supportingKeywords: 'Apothekenbetriebserlaubnis, AMG, Abgabesicherheit',
    socialImageUrl: '/src/assets/images/pharma_gmp_vault_1794861155822.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'WebPage',
  },
  {
    route: 'catalogue',
    seoTitleDe: 'Produktkatalog – Geprüfte Peptid-Referenzmaterialien',
    seoTitleEn: 'Product Catalogue – Approved Peptide Materials',
    metaDescriptionDe:
      'Durchsuchen Sie freigegebene Forschungspeptide mit vollständiger Chargendokumentation, SDB-Verifikation und Spezifikationen.',
    metaDescriptionEn:
      'Browse approved peptide reference materials with verified documentation, technical specifications, and batch tracking.',
    canonicalUrl: '/de/katalog/',
    focusKeywordDe: 'Peptid Katalog Forschungsmaterialien',
    focusKeywordEn: 'Peptide Catalogue Research Materials',
    supportingKeywords: 'Laborbedarf, Peptidanalytik, Referenzstandards',
    socialImageUrl: '/src/assets/images/product_lyophilized_vial_1794861146550.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'CollectionPage',
  },
  {
    route: 'quality',
    seoTitleDe: 'Qualitätssicherung & Peptidanalytik – PEPTIVORA',
    seoTitleEn: 'Quality Assurance & Peptide Analytics – PEPTIVORA',
    metaDescriptionDe:
      'Analytische Qualitätskontrolle, HPLC-Reinheitsstandards, Massenspektrometrie und SHA-256 Dokumentenprüfung im Überblick.',
    metaDescriptionEn:
      'Analytical quality control, HPLC purity checks, mass spectrometry standards, and SHA-256 document verification.',
    canonicalUrl: '/de/qualitaet/',
    focusKeywordDe: 'Peptidanalytik und Qualitätskontrolle',
    focusKeywordEn: 'Peptide Analytics and Quality Control',
    supportingKeywords: 'Qualitätskontrolle, Analysenzertifikat, SHA-256 Dokumentation',
    socialImageUrl: '/src/assets/images/qa_analytical_hplc_1794861151090.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'WebPage',
  },
  {
    route: 'knowledge',
    seoTitleDe: 'Wissenszentrum – Wissenschaftliche Peptiddokumentation',
    seoTitleEn: 'Knowledge Centre – Scientific Peptide Documentation',
    metaDescriptionDe:
      'Leitfäden zu Peptidstabilität, analytischer Verifikation und deutschem Chemikalien- sowie Arzneimittelrecht (AMG/HWG/ChemG).',
    metaDescriptionEn:
      'Technical guides on peptide stability, analytical verification, and German regulatory frameworks (AMG/HWG/ChemG).',
    canonicalUrl: '/de/wissen/',
    focusKeywordDe: 'Wissenschaftliche Dokumentation Peptide',
    focusKeywordEn: 'Scientific Peptide Documentation',
    supportingKeywords: 'REACH, CLP, Lagerung, Peptidwissenschaft',
    socialImageUrl: '/src/assets/images/hero_peptide_laboratory_1794861142758.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'WebPage',
  },
  {
    route: 'blog',
    seoTitleDe: 'Fachblog – Peptidforschung & Analytik | PEPTIVORA',
    seoTitleEn: 'Scientific Blog – Peptide Research & Analytics',
    metaDescriptionDe:
      'Wissenschaftliche und regulatorische Fachbeiträge zu Peptidanalytik, Qualitätskontrolle und Laborsicherheit in Deutschland.',
    metaDescriptionEn:
      'Original scientific and regulatory articles covering peptide analytics, quality control, and laboratory safety in Germany.',
    canonicalUrl: '/de/blog/',
    focusKeywordDe: 'Peptidforschung Fachblog',
    focusKeywordEn: 'Peptide Research Scientific Blog',
    supportingKeywords: 'Peptidwissenschaft, Biotechnologie, Methodenvalidierung',
    socialImageUrl: '/src/assets/images/qa_analytical_hplc_1794861151090.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'Blog',
  },
  {
    route: 'faq',
    seoTitleDe: 'Häufige Fragen (FAQ) – Katalog, KYB & Compliance',
    seoTitleEn: 'Frequently Asked Questions – Catalogue & Compliance',
    metaDescriptionDe:
      'Antworten auf häufige Fragen zu institutioneller KYB-Verifizierung, RUO-Anforderungen und pharmazeutischen Sperren.',
    metaDescriptionEn:
      'Answers regarding institutional KYB onboarding, RUO compliance boundaries, and pharmaceutical restrictions.',
    canonicalUrl: '/de/faq/',
    focusKeywordDe: 'Peptidforschung FAQ Compliance',
    focusKeywordEn: 'Peptide Compliance FAQ',
    supportingKeywords: 'KYB Prüfung, Laboranforderungen, Versandbedingungen',
    socialImageUrl: '/src/assets/images/hero_peptide_laboratory_1794861142758.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'FAQPage',
  },
  {
    route: 'contact',
    seoTitleDe: 'Kontakt – Institutioneller Labor- & Compliance-Service',
    seoTitleEn: 'Contact – Institutional Lab & Compliance Desk',
    metaDescriptionDe:
      'Kontaktieren Sie PEPTIVORA für institutionelle KYB-Anfragen, technische Labordokumentation oder Compliance-Rückfragen.',
    metaDescriptionEn:
      'Contact PEPTIVORA for institutional KYB onboarding, analytical documentation requests, or regulatory compliance inquiries.',
    canonicalUrl: '/de/kontakt/',
    focusKeywordDe: 'PEPTIVORA Kontakt Deutschland',
    focusKeywordEn: 'PEPTIVORA Contact Germany',
    supportingKeywords: 'Biotechnologie Support, Laboranfrage, Compliance Kontakt',
    socialImageUrl: '/src/assets/images/hero_peptide_laboratory_1794861142758.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'ContactPage',
  },
  {
    route: 'impressum',
    seoTitleDe: 'Impressum – Rechtliche Hinweise | PEPTIVORA',
    seoTitleEn: 'Legal Notice (Impressum) – PEPTIVORA',
    metaDescriptionDe: 'Rechtliche Anbieterkennzeichnung und Compliance-Transparenzhinweise gemäß § 5 DDG.',
    metaDescriptionEn: 'German statutory legal notice and regulatory transparency disclosures.',
    canonicalUrl: '/de/impressum/',
    focusKeywordDe: 'PEPTIVORA Impressum',
    focusKeywordEn: 'PEPTIVORA Impressum',
    supportingKeywords: 'Rechtliche Angaben, Compliance Transparenz',
    socialImageUrl: '/src/assets/images/hero_peptide_laboratory_1794861142758.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'WebPage',
  },
  {
    route: 'privacy',
    seoTitleDe: 'Datenschutzerklärung (DSGVO) – PEPTIVORA',
    seoTitleEn: 'Privacy Policy (GDPR) – PEPTIVORA',
    metaDescriptionDe: 'Informationen zur DSGVO-konformen Datenverarbeitung, Audit-Protokollen und Einwilligungsverwaltung.',
    metaDescriptionEn: 'Information on GDPR data processing, audit logs, and user privacy rights.',
    canonicalUrl: '/de/datenschutz/',
    focusKeywordDe: 'Datenschutzerklärung DSGVO Biotechnologie',
    focusKeywordEn: 'GDPR Privacy Policy Biotechnology',
    supportingKeywords: 'DSGVO, Betroffenenrechte, Datensicherheit',
    socialImageUrl: '/src/assets/images/hero_peptide_laboratory_1794861142758.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'WebPage',
  },
  {
    route: 'terms',
    seoTitleDe: 'AGB & Compliance-Bedingungen – PEPTIVORA',
    seoTitleEn: 'Terms & Compliance Conditions – PEPTIVORA',
    metaDescriptionDe: 'Allgemeine Geschäfts- und Compliance-Bedingungen für akkreditierte Forschungseinrichtungen in Deutschland.',
    metaDescriptionEn: 'General terms and compliance rules for verified institutional research accounts.',
    canonicalUrl: '/de/agb/',
    focusKeywordDe: 'AGB B2B Laborbedarf Deutschland',
    focusKeywordEn: 'B2B Laboratory Terms Germany',
    supportingKeywords: 'B2B Konditionen, Nicht-Humananwendung',
    socialImageUrl: '/src/assets/images/hero_peptide_laboratory_1794861142758.jpg',
    robotsDirective: 'index, follow',
    schemaType: 'WebPage',
  },
  {
    route: 'compliance',
    seoTitleDe: 'Interne Compliance & Produktverwaltung – PEPTIVORA',
    seoTitleEn: 'Internal Compliance & Operations – PEPTIVORA',
    metaDescriptionDe: 'Geschütztes Governance- und Verwaltungsportal (nicht indexiert).',
    metaDescriptionEn: 'Protected governance and administration portal (noindex).',
    canonicalUrl: '/de/compliance/',
    focusKeywordDe: 'Compliance Governance',
    focusKeywordEn: 'Compliance Governance',
    supportingKeywords: 'Audit, RBAC, SEO',
    socialImageUrl: '/src/assets/images/hero_peptide_laboratory_1794861142758.jpg',
    robotsDirective: 'noindex, nofollow',
    schemaType: 'WebPage',
  },
];

export function parsePathToRoute(pathname: string): {
  locale: Locale;
  route: PageRoute;
  productSlug?: string;
  blogSlug?: string;
} {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') {
    return { locale: 'de', route: 'home' };
  }

  const parts = clean.split('/').filter(Boolean);
  const maybeLocale = parts[0] === 'en' ? 'en' : parts[0] === 'de' ? 'de' : null;
  if (!maybeLocale) {
    return { locale: 'de', route: 'home' };
  }
  const locale: Locale = maybeLocale;
  const seg1 = parts[1] ?? '';
  const seg2 = parts[2] ? decodeURIComponent(parts[2]) : undefined;

  if (!seg1) return { locale, route: 'home' };
  if (seg1 === 'unternehmen' || seg1 === 'about') return { locale, route: 'about' };
  if (seg1 === 'forschung' || seg1 === 'research') return { locale, route: 'research' };
  if (seg1 === 'pharma' || seg1 === 'pharmaceutical') return { locale, route: 'pharmaceutical' };
  if (seg1 === 'katalog' || seg1 === 'catalogue') return { locale, route: 'catalogue' };
  if (seg1 === 'produkt' || seg1 === 'product') {
    return { locale, route: seg2 ? 'product' : 'catalogue', productSlug: seg2 };
  }
  if (seg1 === 'qualitaet' || seg1 === 'quality') return { locale, route: 'quality' };
  if (seg1 === 'wissen' || seg1 === 'knowledge') return { locale, route: 'knowledge' };
  if (seg1 === 'blog') return { locale, route: 'blog', blogSlug: seg2 };
  if (seg1 === 'faq') return { locale, route: 'faq' };
  if (seg1 === 'kontakt' || seg1 === 'contact') return { locale, route: 'contact' };
  if (seg1 === 'konto' || seg1 === 'account') return { locale, route: 'account' };
  if (seg1 === 'warenkorb' || seg1 === 'cart') return { locale, route: 'cart' };
  if (seg1 === 'kasse' || seg1 === 'checkout') return { locale, route: 'checkout' };
  if (seg1 === 'datenschutz' || seg1 === 'privacy') return { locale, route: 'privacy' };
  if (seg1 === 'agb' || seg1 === 'terms') return { locale, route: 'terms' };
  if (seg1 === 'impressum') return { locale, route: 'impressum' };
  if (seg1 === 'cookies') return { locale, route: 'cookies' };
  if (seg1 === 'compliance') return { locale, route: 'compliance' };

  return { locale, route: 'home' };
}

export function buildPathForRoute(route: PageRoute, locale: Locale, slug?: string): string {
  const base = ROUTE_PATH_MAP[route]?.[locale] ?? (locale === 'de' ? '/de/' : '/en/');
  if (route === 'product' && slug) {
    return `${base}${encodeURIComponent(slug)}`;
  }
  if (route === 'blog' && slug) {
    return `${base}${encodeURIComponent(slug)}`;
  }
  return base;
}

export function buildBreadcrumbs(
  route: PageRoute,
  locale: Locale,
  baseUrl: string,
  extraTitle?: string
): BreadcrumbItem[] {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const crumbs: BreadcrumbItem[] = [
    {
      labelDe: 'Startseite',
      labelEn: 'Home',
      route: 'home',
      url: `${cleanBase}${buildPathForRoute('home', locale)}`,
    },
  ];
  if (route === 'home') return crumbs;

  const labelMap: Record<PageRoute, { de: string; en: string }> = {
    home: { de: 'Startseite', en: 'Home' },
    about: { de: 'Unternehmen', en: 'About PEPTIVORA' },
    research: { de: 'Forschung', en: 'Research Division' },
    pharmaceutical: { de: 'Pharma-Compliance', en: 'Pharmaceutical Division' },
    catalogue: { de: 'Produktkatalog', en: 'Product Catalogue' },
    product: { de: 'Produktkatalog', en: 'Product Catalogue' },
    quality: { de: 'Qualitätssicherung', en: 'Quality Assurance' },
    knowledge: { de: 'Wissenszentrum', en: 'Knowledge Centre' },
    blog: { de: 'Fachblog', en: 'Blog' },
    faq: { de: 'FAQ', en: 'FAQ' },
    contact: { de: 'Kontakt', en: 'Contact' },
    account: { de: 'Kundenkonto', en: 'Account' },
    cart: { de: 'Warenkorb', en: 'Cart' },
    checkout: { de: 'Kasse', en: 'Checkout' },
    privacy: { de: 'Datenschutz', en: 'Privacy Policy' },
    terms: { de: 'AGB', en: 'Terms' },
    impressum: { de: 'Impressum', en: 'Impressum' },
    cookies: { de: 'Cookie-Einstellungen', en: 'Cookie Preferences' },
    compliance: { de: 'Compliance & Admin', en: 'Compliance Console' },
  };

  if (route === 'product') {
    crumbs.push({
      labelDe: labelMap.catalogue.de,
      labelEn: labelMap.catalogue.en,
      route: 'catalogue',
      url: `${cleanBase}${buildPathForRoute('catalogue', locale)}`,
    });
    if (extraTitle) {
      crumbs.push({
        labelDe: extraTitle,
        labelEn: extraTitle,
        route: 'product',
        url: `${cleanBase}${buildPathForRoute('product', locale)}`,
      });
    }
    return crumbs;
  }

  if (route === 'blog' && extraTitle) {
    crumbs.push({
      labelDe: labelMap.blog.de,
      labelEn: labelMap.blog.en,
      route: 'blog',
      url: `${cleanBase}${buildPathForRoute('blog', locale)}`,
    });
    crumbs.push({
      labelDe: extraTitle,
      labelEn: extraTitle,
      route: 'blog',
      url: `${cleanBase}${buildPathForRoute('blog', locale)}`,
    });
    return crumbs;
  }

  crumbs.push({
    labelDe: labelMap[route].de,
    labelEn: labelMap[route].en,
    route,
    url: `${cleanBase}${buildPathForRoute(route, locale)}`,
  });
  return crumbs;
}

export interface ComputedPageSeo {
  title: string;
  description: string;
  canonicalUrl: string;
  hreflangDe: string;
  hreflangEn: string;
  robots: string;
  ogType: string;
  ogImage: string;
  breadcrumbs: BreadcrumbItem[];
  jsonLdSchemas: Record<string, unknown>[];
  ssrHeadline: string;
  ssrSummary: string;
}

export function buildPageSeoSnapshot(params: {
  baseUrl: string;
  locale: Locale;
  route: PageRoute;
  seoPages: SeoPageConfigDto[];
  product?: ProductDto | null;
  blogPost?: BlogPostDto | null;
  products?: ProductDto[];
  blogPosts?: BlogPostDto[];
}): ComputedPageSeo {
  const cleanBase = params.baseUrl.replace(/\/+$/, '');
  const isDe = params.locale === 'de';
  const slug =
    params.route === 'product'
      ? params.product?.slug
      : params.route === 'blog'
        ? params.blogPost?.slug
        : undefined;

  const dePath = buildPathForRoute(params.route, 'de', slug);
  const enPath = buildPathForRoute(params.route, 'en', slug);
  const currentPath = isDe ? dePath : enPath;

  const pageCfg =
    params.seoPages.find((p) => p.route === params.route) ??
    DEFAULT_SEO_PAGES.find((p) => p.route === params.route) ??
    DEFAULT_SEO_PAGES[0];

  const defaultCanonical = `${cleanBase}${currentPath}`;
  let title = isDe ? pageCfg.seoTitleDe : pageCfg.seoTitleEn;
  let description = isDe ? pageCfg.metaDescriptionDe : pageCfg.metaDescriptionEn;
  let robots =
    pageCfg.robotsDirective ||
    (ROUTE_PATH_MAP[params.route]?.indexable ? 'index, follow' : 'noindex, nofollow');
  let ogType = 'website';
  let ogImage = pageCfg.socialImageUrl.startsWith('http')
    ? pageCfg.socialImageUrl
    : `${cleanBase}${pageCfg.socialImageUrl}`;
  let ssrHeadline = title;
  let ssrSummary = description;

  if (params.route === 'product' && params.product) {
    const p = params.product;
    const pName = isDe ? p.nameDe : p.nameEn;
    title = `${pName} (${p.sku}) – PEPTIVORA`;
    description = (isDe ? p.descriptionDe : p.descriptionEn).slice(0, 158);
    ssrHeadline = pName;
    ssrSummary = isDe ? p.descriptionDe : p.descriptionEn;
    if (p.images[0]?.imageUrl) {
      ogImage = p.images[0].imageUrl.startsWith('http')
        ? p.images[0].imageUrl
        : `${cleanBase}${p.images[0].imageUrl}`;
    }
    const eligibleToIndex = p.publicationStatus === 'published' && p.approvalStatus === 'approved';
    robots = eligibleToIndex ? 'index, follow' : 'noindex, nofollow';
  } else if (params.route === 'blog' && params.blogPost) {
    const post = params.blogPost;
    const postTitle = isDe ? post.titleDe : post.titleEn;
    title = isDe
      ? (post.seoTitleDe || `${postTitle} | PEPTIVORA Blog`).slice(0, 70)
      : (post.seoTitleEn || `${postTitle} | PEPTIVORA Blog`).slice(0, 70);
    description = isDe
      ? post.seoDescriptionDe || post.excerptDe
      : post.seoDescriptionEn || post.excerptEn;
    ogType = 'article';
    ssrHeadline = postTitle;
    ssrSummary = isDe ? post.excerptDe : post.excerptEn;
    if (post.imageUrl) {
      ogImage = post.imageUrl.startsWith('http') ? post.imageUrl : `${cleanBase}${post.imageUrl}`;
    }
  }

  const breadcrumbs = buildBreadcrumbs(
    params.route,
    params.locale,
    cleanBase,
    params.product
      ? isDe
        ? params.product.nameDe
        : params.product.nameEn
      : params.blogPost
        ? isDe
          ? params.blogPost.titleDe
          : params.blogPost.titleEn
        : undefined
  );

  const searchTarget = `${cleanBase}${buildPathForRoute('catalogue', params.locale)}?q={search_term_string}`;

  const jsonLdSchemas: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'PEPTIVORA',
      url: cleanBase,
      slogan: 'Precision Science. Trusted Quality.',
      areaServed: 'DE',
      availableLanguage: ['de', 'en'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'PEPTIVORA',
      url: cleanBase,
      inLanguage: isDe ? 'de-DE' : 'en-GB',
      potentialAction: {
        '@type': 'SearchAction',
        target: searchTarget,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((b, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: isDe ? b.labelDe : b.labelEn,
        item: b.url,
      })),
    },
  ];

  // Product + Offer ONLY when approved, published, price permitted, and RUO research division
  if (params.route === 'product' && params.product) {
    const p = params.product;
    if (p.publicationStatus === 'published' && p.approvalStatus === 'approved') {
      const productNode: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: isDe ? p.nameDe : p.nameEn,
        sku: p.sku,
        description: isDe ? p.descriptionDe : p.descriptionEn,
        brand: {
          '@type': 'Brand',
          name: p.manufacturerName,
        },
        category: isDe ? p.categoryNameDe : p.categoryNameEn,
      };
      if (p.images[0]?.imageUrl) {
        productNode.image = ogImage;
      }
      if (p.divisionSlug === 'research' && p.pricePermitted && p.priceNetCents > 0) {
        productNode.offers = {
          '@type': 'Offer',
          url: defaultCanonical,
          priceCurrency: p.currency || 'EUR',
          price: (p.priceNetCents / 100).toFixed(2),
          availability:
            p.stockStatus === 'in_stock' || p.stockStatus === 'low_stock'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
        };
      }
      jsonLdSchemas.push(productNode);
    }
  }

  // Catalogue CollectionPage + ItemList
  if (params.route === 'catalogue' && (params.products?.length ?? 0) > 0) {
    const eligibleProducts = (params.products ?? []).filter(
      (p) => p.publicationStatus === 'published' && p.approvalStatus === 'approved'
    );
    if (eligibleProducts.length > 0) {
      jsonLdSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url: defaultCanonical,
        inLanguage: isDe ? 'de-DE' : 'en-GB',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: eligibleProducts.length,
          itemListElement: eligibleProducts.map((p, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: isDe ? p.nameDe : p.nameEn,
            url: `${cleanBase}${buildPathForRoute('product', params.locale, p.slug)}`,
          })),
        },
      });
    }
  }

  // FAQPage structured data matching live bilingual FAQ items
  if (params.route === 'faq') {
    const faqList = FAQ_ITEMS_BILINGUAL[params.locale];
    jsonLdSchemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqList.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    });
  }

  if (params.route === 'blog' && params.blogPost) {
    const post = params.blogPost;
    const nowIso = new Date().toISOString();
    jsonLdSchemas.push({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: isDe ? post.titleDe : post.titleEn,
      description: isDe ? post.excerptDe : post.excerptEn,
      datePublished: toIsoDateString(post.publishedAt, nowIso),
      dateModified: toIsoDateString(post.updatedAt ?? post.publishedAt, nowIso),
      inLanguage: isDe ? 'de-DE' : 'en-GB',
      author: post.author
        ? {
            '@type': 'Person',
            name: post.author.name,
            jobTitle: isDe ? post.author.roleDe : post.author.roleEn,
          }
        : undefined,
      publisher: {
        '@type': 'Organization',
        name: 'PEPTIVORA',
      },
      mainEntityOfPage: defaultCanonical,
    });
  } else if (params.route === 'blog' && (params.blogPosts?.length ?? 0) > 0) {
    const nowIso = new Date().toISOString();
    jsonLdSchemas.push({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: title,
      description,
      url: defaultCanonical,
      inLanguage: isDe ? 'de-DE' : 'en-GB',
      blogPost: (params.blogPosts ?? []).slice(0, 10).map((post) => ({
        '@type': 'BlogPosting',
        headline: isDe ? post.titleDe : post.titleEn,
        url: `${cleanBase}${buildPathForRoute('blog', params.locale, post.slug)}`,
        datePublished: toIsoDateString(post.publishedAt, nowIso),
      })),
    });
  }

  return {
    title,
    description,
    canonicalUrl:
      pageCfg.canonicalUrl && pageCfg.canonicalUrl.startsWith('https://')
        ? pageCfg.canonicalUrl
        : defaultCanonical,
    hreflangDe: `${cleanBase}${dePath}`,
    hreflangEn: `${cleanBase}${enPath}`,
    robots,
    ogType,
    ogImage,
    breadcrumbs,
    jsonLdSchemas,
    ssrHeadline,
    ssrSummary,
  };
}

export function buildRobotsTxt(baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /de/',
    'Allow: /en/',
    'Disallow: /api/',
    'Disallow: /de/compliance/',
    'Disallow: /en/compliance/',
    'Disallow: /de/konto/',
    'Disallow: /en/account/',
    'Disallow: /de/warenkorb/',
    'Disallow: /en/cart/',
    'Disallow: /de/kasse/',
    'Disallow: /en/checkout/',
    '',
    `Sitemap: ${cleanBase}/sitemap.xml`,
    '',
  ].join('\n');
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDateString(
  val: string | Date | null | undefined,
  fallback: string
): string {
  if (!val) return fallback;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

export function buildXmlSitemap(
  baseUrl: string,
  approvedProducts: ProductDto[],
  publishedPosts: BlogPostDto[]
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const nowIso = new Date().toISOString();
  const entries: string[] = [];

  const pushBilingualUrl = (dePath: string, enPath: string, lastmod: string, priority: string) => {
    const deUrl = `${cleanBase}${dePath}`;
    const enUrl = `${cleanBase}${enPath}`;
    for (const loc of [deUrl, enUrl]) {
      entries.push(
        `  <url>\n` +
          `    <loc>${escapeXml(loc)}</loc>\n` +
          `    <xhtml:link rel="alternate" hreflang="de-DE" href="${escapeXml(deUrl)}" />\n` +
          `    <xhtml:link rel="alternate" hreflang="en-GB" href="${escapeXml(enUrl)}" />\n` +
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(deUrl)}" />\n` +
          `    <lastmod>${escapeXml(lastmod)}</lastmod>\n` +
          `    <priority>${priority}</priority>\n` +
          `  </url>`
      );
    }
  };

  for (const [routeKey, cfg] of Object.entries(ROUTE_PATH_MAP)) {
    if (!cfg.indexable || routeKey === 'product') continue;
    pushBilingualUrl(cfg.de, cfg.en, nowIso, routeKey === 'home' ? '1.0' : '0.8');
  }

  for (const product of approvedProducts) {
    if (product.publicationStatus !== 'published' || product.approvalStatus !== 'approved') continue;
    pushBilingualUrl(
      buildPathForRoute('product', 'de', product.slug),
      buildPathForRoute('product', 'en', product.slug),
      toIsoDateString(product.updatedAt, nowIso),
      '0.9'
    );
  }

  for (const post of publishedPosts) {
    pushBilingualUrl(
      buildPathForRoute('blog', 'de', post.slug),
      buildPathForRoute('blog', 'en', post.slug),
      toIsoDateString(post.updatedAt ?? post.publishedAt, nowIso),
      '0.7'
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    entries.join('\n') +
    `\n</urlset>\n`
  );
}
