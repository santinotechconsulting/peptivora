import type {
  BusinessComplianceProfileDto,
  EuPharmacyLogoConfigDto,
  LegalDocumentsConfigDto,
  ProductRegulatoryMatrixEntryDto,
  ProductionReadinessChecklistDto,
  SeoIntegrationsConfigDto,
} from '../../types/peptivora.ts';

export const DEFAULT_BUSINESS_PROFILE: BusinessComplianceProfileDto = {
  legalEntityName: '',
  germanRegisteredAddress: '',
  commercialRegisterInfo: '',
  taxVatInfo: '',
  responsiblePerson: '',
  relevantLicenses: '',
  authorizedOperatingLocations: '',
  regulatoryContacts: '',
  verificationStatus: 'pending_documentation',
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_EU_PHARMACY_LOGO_CONFIG: EuPharmacyLogoConfigDto = {
  enabled: false,
  authorityRegisterUrl: '',
  authorizedOperatorName: '',
  displayNoteDe:
    'Deaktiviert bis zur nachgewiesenen Berechtigung nach § 11a ApoG / EU-Versandhandelsregister.',
  displayNoteEn:
    'Disabled until genuine authorization under German mail-order pharmacy law and EU common logo register is verified.',
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_LEGAL_DOCUMENTS: LegalDocumentsConfigDto = {
  reviewStatus: 'draft_template',
  impressumDe:
    'Demonstrations- und Governance-Plattform PEPTIVORA Deutschland. Keine Veröffentlichung erfundener HRB- oder USt-IdNr.-Angaben vor behördlicher Unternehmensgründung.',
  impressumEn:
    'PEPTIVORA Germany demonstration and governance architecture. No fabricated commercial registration or tax numbers are displayed prior to verified incorporation.',
  privacyDe:
    'DSGVO-konforme Verarbeitung über Firebase Authentication und Cloud SQL (europe-west2). Betroffenenrechte nach Art. 15–17 DSGVO über das Kundenkonto abrufbar.',
  privacyEn:
    'GDPR-aligned processing via Firebase Authentication and Cloud SQL (europe-west2). Data subject export and erasure workflows available in Customer Account.',
  termsDe:
    'B2B-Forschungsbeschränkung gemäß § 1: Lieferung im Forschungsbereich ausschließlich an KYB-geprüfte Institutionen; striktes Verbot jeglicher Human- oder Tieranwendung.',
  termsEn:
    'Institutional B2B restriction: Research Division supply strictly limited to KYB-verified laboratories; human or veterinary administration is strictly prohibited.',
  withdrawalDe:
    'Widerrufsbelehrung (B2B-Hinweis): Verträge im Forschungsbereich werden ausschließlich mit Unternehmern im Sinne des § 14 BGB geschlossen.',
  withdrawalEn:
    'Right of withdrawal disclosure: Research Division transactions are strictly concluded with institutional and commercial entities (§ 14 BGB).',
  shippingDe:
    'Temperaturgeführter Kurierversand innerhalb Deutschlands und ausgewählter EU-Forschungseinrichtungen nach positivem Compliance-Precheck.',
  shippingEn:
    'Temperature-controlled courier dispatch within Germany and vetted EU research facilities following positive compliance re-verification.',
  returnsDe:
    'Rückgaben lyophilisierter Referenzmaterialien bedürfen aufgrund der Kühlkette einer vorherigen Qualitätssicherungs-Freigabe.',
  returnsEn:
    'Returns of temperature-sensitive reference peptides require prior Quality Assurance authorization.',
  cookiePolicyDe:
    'Notwendige Cookies sichern Sitzung und Bereichstrennung. Optionale Analytik und Google-Tags werden nur nach ausdrücklicher Einwilligung aktiviert.',
  cookiePolicyEn:
    'Essential cookies protect session and division segregation. Optional analytics and Google tags execute strictly after explicit consent.',
  productSafetyDe:
    'Produkt- und Chemikaliensicherheit gemäß individueller Einstufung (REACH, CLP/GHS, Sicherheitsdatenblatt nach Art. 31 REACH).',
  productSafetyEn:
    'Chemical and product safety obligations applied individually according to actual product classification (REACH, CLP/GHS, Art. 31 SDS).',
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_SEO_INTEGRATIONS: SeoIntegrationsConfigDto = {
  searchConsoleVerificationMeta: '',
  ga4MeasurementId: '',
  gtmContainerId: '',
  googleBusinessProfileName: '',
  merchantCenterEnabled: false,
  merchantCenterEligibilityNote:
    'Disabled by default: Research-Use-Only peptides and restricted pharmaceutical items are subject to strict Google Merchant Center policies.',
  analyticsRequiresConsent: true,
  reportedMetrics: {
    indexedPagesCount: 0,
    organicClicks28d: 0,
    searchImpressions28d: 0,
    ctrPercent: 0,
    topLandingPage: '/de/katalog/',
    lastSyncedNote: 'No external Search Console feed connected yet (no synthetic ranking claims).',
  },
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_PRODUCTION_CHECKLIST: ProductionReadinessChecklistDto = {
  developmentComplete: true,
  testingComplete: false,
  databaseReady: true,
  securityReviewed: true,
  seoReady: true,
  businessDocsReady: false,
  regulatoryApprovalReady: false,
  paymentProviderApproved: true,
  productionAuthorized: false,
  updatedAt: new Date(0).toISOString(),
};

export function buildDefaultProductRegulatoryMatrixEntry(
  productId: number
): ProductRegulatoryMatrixEntryDto {
  return {
    productId,
    productIdentityNote: '',
    compositionNote: '',
    intendedUseNote: '',
    actualCustomerSegment: 'KYB-verified universities & analytical laboratories',
    productPresentationNote: 'Neutral analytical reference labelling; zero therapeutic claims',
    manufacturerDocStatus: 'Pending verification against SHA-256 CoA / SDS',
    applicableLegislation: 'Case-by-case review under AMG / HWG / ChemG / REACH / CLP',
    medicinalClassificationRisk: 'under_assessment',
    reachApplicable: false,
    clpClassification: 'Not classified / under individual review',
    clpHazardStatements: '',
    sdsDocumentRef: '',
    transportRequirements: 'Insulated cold-chain / dry-ice courier per stability spec',
    traceabilityBatchRule: 'Lot number + expiry logged on every inventory movement',
    reviewerLegalAssessment: '',
    updatedAt: new Date(0).toISOString(),
  };
}
