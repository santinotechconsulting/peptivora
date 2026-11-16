import { z } from 'zod';

export const appRoleSchema = z.enum([
  'super_administrator',
  'product_manager',
  'regulatory_reviewer',
  'order_manager',
  'content_manager',
  'customer_support',
  'customer',
]);

export const divisionSlugSchema = z.enum(['research', 'pharmaceutical']);

export const classificationCodeSchema = z.enum([
  'research_use_only',
  'authorized_otc_medicinal',
  'authorized_prescription_medicinal',
  'other_regulated',
]);

export const approvalStatusSchema = z.enum([
  'draft',
  'submitted_for_review',
  'under_regulatory_review',
  'approved',
  'rejected',
  'suspended',
  'expired',
]);

export const createProductSchema = z.object({
  sku: z.string().trim().min(3).max(40).regex(/^[A-Z0-9\-]+$/),
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9\-]+$/),
  divisionId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  classificationId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  manufacturerName: z.string().trim().min(2).max(160),
  manufacturerRuoLabeled: z.boolean().default(false),
  nameDe: z.string().trim().min(2).max(180),
  nameEn: z.string().trim().min(2).max(180),
  descriptionDe: z.string().trim().min(10).max(1200),
  descriptionEn: z.string().trim().min(10).max(1200),
  technicalSummaryDe: z.string().trim().max(2500).optional().or(z.literal('')),
  technicalSummaryEn: z.string().trim().max(2500).optional().or(z.literal('')),
  regulatoryNoticeDe: z.string().trim().min(10).max(600),
  regulatoryNoticeEn: z.string().trim().min(10).max(600),
  casNumber: z.string().trim().max(40).optional().or(z.literal('')),
  molecularFormula: z.string().trim().max(80).optional().or(z.literal('')),
  molecularWeight: z.string().trim().max(40).optional().or(z.literal('')),
  sequence: z.string().trim().max(240).optional().or(z.literal('')),
  storageCondition: z.string().trim().min(2).max(120),
  pricePermitted: z.boolean().default(false),
  priceNetCents: z.number().int().min(0).max(50_000_00),
});

export const updateProductSchema = z.object({
  divisionId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive(),
  manufacturerName: z.string().trim().min(2).max(160),
  nameDe: z.string().trim().min(2).max(180),
  nameEn: z.string().trim().min(2).max(180),
  descriptionDe: z.string().trim().min(10).max(1200),
  descriptionEn: z.string().trim().min(10).max(1200),
  technicalSummaryDe: z.string().trim().max(2500).optional().or(z.literal('')),
  technicalSummaryEn: z.string().trim().max(2500).optional().or(z.literal('')),
  regulatoryNoticeDe: z.string().trim().min(10).max(600),
  regulatoryNoticeEn: z.string().trim().min(10).max(600),
  casNumber: z.string().trim().max(40).optional().or(z.literal('')),
  molecularFormula: z.string().trim().max(80).optional().or(z.literal('')),
  molecularWeight: z.string().trim().max(40).optional().or(z.literal('')),
  sequence: z.string().trim().max(240).optional().or(z.literal('')),
  storageCondition: z.string().trim().min(2).max(120),
  pricePermitted: z.boolean(),
  priceNetCents: z.number().int().min(0).max(50_000_00),
});

export const addProductImageSchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .min(5)
    .max(1_800_000)
    .refine(
      (val) =>
        val.startsWith('/src/assets/images/') ||
        val.startsWith('https://') ||
        val.startsWith('data:image/png;base64,') ||
        val.startsWith('data:image/jpeg;base64,') ||
        val.startsWith('data:image/webp;base64,'),
      { message: 'Image must be an approved asset path, HTTPS URL, or PNG/JPEG/WEBP data URL.' }
    ),
  altDe: z.string().trim().min(2).max(180),
  altEn: z.string().trim().min(2).max(180),
  sortOrder: z.number().int().min(0).max(100).default(0),
});

export const adjustInventorySchema = z.object({
  batchNumber: z.string().trim().min(2).max(60),
  quantityOnHand: z.number().int().min(0).max(100_000),
  expiresAt: z.string().trim().max(40).optional().or(z.literal('')),
  stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'gated']),
  reason: z.string().trim().min(3).max(400),
});

export const suspendProductSchema = z.object({
  reason: z.string().trim().min(5).max(800),
});

export const submitApprovalSchema = z.object({
  productId: z.number().int().positive(),
  supportingEvidence: z.string().trim().min(10).max(2000),
  jurisdiction: z.string().trim().min(2).max(80).default('DE / EU'),
  approvalScope: z.string().trim().min(5).max(300),
});

export const decideApprovalSchema = z.object({
  productId: z.number().int().positive(),
  status: approvalStatusSchema,
  supportingEvidence: z.string().trim().min(10).max(2000),
  jurisdiction: z.string().trim().min(2).max(80),
  approvalScope: z.string().trim().min(5).max(300),
  expiresAt: z.string().trim().optional().or(z.literal('')),
  amgScreened: z.boolean(),
  hwgScreened: z.boolean(),
  chemgScreened: z.boolean(),
  ruoIndependentlyVerified: z.boolean(),
  publishImmediately: z.boolean().default(false),
  notes: z.string().trim().min(5).max(1000),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  preferredLocale: z.enum(['de', 'en']).default('de'),
});

export const kybProfileSchema = z.object({
  organizationName: z.string().trim().min(2).max(180),
  organizationType: z.enum([
    'university',
    'research_institute',
    'biotech_company',
    'licensed_pharmacy',
    'pharmaceutical_wholesaler',
  ]),
  vatId: z
    .string()
    .trim()
    .max(32)
    .regex(/^([A-Z]{2}[A-Z0-9]{2,14})?$/)
    .optional()
    .or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
});

export const reviewKybSchema = z.object({
  kybStatus: z.enum(['verified', 'rejected', 'revoked']),
  notes: z.string().trim().min(5).max(1000),
});

export const addressSchema = z.object({
  label: z.string().trim().min(2).max(80),
  recipientName: z.string().trim().min(2).max(160),
  streetLine: z.string().trim().min(3).max(200),
  postalCode: z.string().trim().min(3).max(20),
  city: z.string().trim().min(2).max(120),
  countryCode: z.string().trim().length(2).toUpperCase().default('DE'),
  isDefault: z.boolean().default(false),
});

export const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().nullable().optional(),
  quantity: z.number().int().min(1).max(50),
});

export const createOrderSchema = z.object({
  divisionSlug: divisionSlugSchema,
  shippingMethodId: z.number().int().positive(),
  shippingAddressId: z.number().int().positive().nullable().optional(),
  couponCode: z.string().trim().max(40).optional().or(z.literal('')),
  paymentProvider: z.string().trim().min(3).max(80).default('peptivora-sepa-invoice'),
  paymentToken: z.string().trim().max(120).optional().or(z.literal('')),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .min(1)
    .max(25),
  ruoNonHumanUseAttested: z.boolean(),
  billingName: z.string().trim().min(2).max(180),
  billingVatId: z.string().trim().max(32).optional().or(z.literal('')),
  billingAddress: z.string().trim().min(8).max(400),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const refundRequestSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const decideRefundSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  notes: z.string().trim().min(5).max(500),
});

export const fulfilOrderSchema = z.object({
  status: z.enum(['processing', 'fulfilled', 'shipped', 'delivered']),
  carrier: z.string().trim().min(2).max(120),
  trackingNumber: z.string().trim().max(80).optional().or(z.literal('')),
  notes: z.string().trim().min(3).max(500),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['pending_settlement', 'authorized', 'settled', 'failed', 'voided']),
  externalRef: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().min(3).max(500),
});

export const pharmaceuticalDispenseSchema = z.object({
  productId: z.number().int().positive(),
  prescriptionReference: z.string().trim().max(100).default(''),
  prescriberLanr: z.string().trim().max(20).default(''),
  issueDateIso: z.string().trim().max(40).default(''),
  pharmacistLicenseId: z.string().trim().min(3).max(80),
  dispensingPharmacyName: z.string().trim().min(3).max(160),
});

export const uploadDocumentSchema = z.object({
  productId: z.number().int().positive().nullable().optional(),
  docType: z.enum(['coa', 'sds', 'technical_dossier', 'regulatory_evidence']),
  title: z.string().trim().min(3).max(160),
  fileName: z.string().trim().min(3).max(160),
  mimeType: z.enum(['application/pdf', 'text/plain', 'text/csv', 'image/png', 'image/jpeg']),
  contentBase64: z.string().min(8).max(2_000_000),
});

export const verifyDocumentSchema = z.object({
  verificationStatus: z.enum(['verified', 'rejected', 'revoked']),
});

export const pharmaGateUpdateSchema = z.object({
  catalogVisible: z.boolean(),
  transactionsEnabled: z.boolean(),
  pharmacyLicenseVerified: z.boolean(),
  distributionArrangementVerified: z.boolean(),
  productAuthorizationVerified: z.boolean(),
  dispensingWorkflowVerified: z.boolean(),
  notes: z.string().trim().min(5).max(1000),
});

export const contactMessageSchema = z.object({
  senderName: z.string().trim().min(2).max(120),
  senderEmail: z.string().trim().email().max(160),
  organization: z.string().trim().max(160).optional().or(z.literal('')),
  topic: z.string().trim().min(2).max(80),
  message: z.string().trim().min(10).max(3000),
  locale: z.enum(['de', 'en']).default('de'),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email().max(160),
  locale: z.enum(['de', 'en']).default('de'),
});

export const consentRecordSchema = z.object({
  visitorSessionId: z.string().trim().min(4).max(128),
  essentialCookies: z.literal(true),
  functionalCookies: z.boolean(),
  analyticsCookies: z.boolean(),
  locale: z.enum(['de', 'en']).default('de'),
});

export const updateUserRoleSchema = z.object({
  targetUid: z.string().trim().min(3).max(128),
  role: appRoleSchema,
});

export const seoPageUpdateSchema = z.object({
  route: z.string().trim().min(2).max(40),
  seoTitleDe: z.string().trim().min(5).max(120),
  seoTitleEn: z.string().trim().min(5).max(120),
  metaDescriptionDe: z.string().trim().min(10).max(320),
  metaDescriptionEn: z.string().trim().min(10).max(320),
  canonicalUrl: z.string().trim().max(300),
  focusKeywordDe: z.string().trim().max(120),
  focusKeywordEn: z.string().trim().max(120),
  supportingKeywords: z.string().trim().max(400),
  socialImageUrl: z.string().trim().max(500),
  robotsDirective: z.enum(['index, follow', 'noindex, nofollow']),
  schemaType: z.string().trim().min(2).max(60),
});

export const seoIntegrationsUpdateSchema = z.object({
  searchConsoleVerificationMeta: z.string().trim().max(200),
  ga4MeasurementId: z.string().trim().max(40),
  gtmContainerId: z.string().trim().max(40),
  googleBusinessProfileName: z.string().trim().max(200),
  merchantCenterEnabled: z.boolean(),
  merchantCenterEligibilityNote: z.string().trim().max(600),
  analyticsRequiresConsent: z.boolean(),
  reportedMetrics: z.object({
    indexedPagesCount: z.number().int().min(0).max(100_000),
    organicClicks28d: z.number().int().min(0).max(10_000_000),
    searchImpressions28d: z.number().int().min(0).max(100_000_000),
    ctrPercent: z.number().min(0).max(100),
    topLandingPage: z.string().trim().max(200),
    lastSyncedNote: z.string().trim().max(300),
  }),
});

export const blogPostUpsertSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9\-]+$/),
  categoryId: z.number().int().positive(),
  authorId: z.number().int().positive(),
  titleDe: z.string().trim().min(5).max(200),
  titleEn: z.string().trim().min(5).max(200),
  excerptDe: z.string().trim().min(10).max(500),
  excerptEn: z.string().trim().min(10).max(500),
  bodyDe: z.string().trim().min(20).max(25000),
  bodyEn: z.string().trim().min(20).max(25000),
  imageUrl: z.string().trim().max(1_800_000).optional().or(z.literal('')),
  isPublished: z.boolean(),
  publishedAt: z.string().trim().max(60).optional().or(z.literal('')),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  referencesText: z.string().trim().max(4000).default(''),
  editorialReviewStatus: z.enum(['draft', 'peer_reviewed', 'published']).default('draft'),
  seoTitleDe: z.string().trim().max(120).default(''),
  seoTitleEn: z.string().trim().max(120).default(''),
  seoDescriptionDe: z.string().trim().max(320).default(''),
  seoDescriptionEn: z.string().trim().max(320).default(''),
});

export const businessProfileUpdateSchema = z.object({
  legalEntityName: z.string().trim().max(240),
  germanRegisteredAddress: z.string().trim().max(400),
  commercialRegisterInfo: z.string().trim().max(240),
  taxVatInfo: z.string().trim().max(200),
  responsiblePerson: z.string().trim().max(200),
  relevantLicenses: z.string().trim().max(600),
  authorizedOperatingLocations: z.string().trim().max(400),
  regulatoryContacts: z.string().trim().max(400),
  verificationStatus: z.enum(['pending_documentation', 'verified', 'incomplete']),
});

export const euPharmacyLogoUpdateSchema = z.object({
  enabled: z.boolean(),
  authorityRegisterUrl: z
    .string()
    .trim()
    .max(400)
    .refine((val) => val === '' || val.startsWith('https://'), {
      message: 'Authority register URL must start with https://.',
    }),
  authorizedOperatorName: z.string().trim().max(200),
  displayNoteDe: z.string().trim().max(400),
  displayNoteEn: z.string().trim().max(400),
});

export const legalDocumentsUpdateSchema = z.object({
  reviewStatus: z.enum(['draft_template', 'counsel_reviewed']),
  impressumDe: z.string().trim().min(10).max(8000),
  impressumEn: z.string().trim().min(10).max(8000),
  privacyDe: z.string().trim().min(10).max(8000),
  privacyEn: z.string().trim().min(10).max(8000),
  termsDe: z.string().trim().min(10).max(8000),
  termsEn: z.string().trim().min(10).max(8000),
  withdrawalDe: z.string().trim().min(10).max(8000),
  withdrawalEn: z.string().trim().min(10).max(8000),
  shippingDe: z.string().trim().min(10).max(8000),
  shippingEn: z.string().trim().min(10).max(8000),
  returnsDe: z.string().trim().min(10).max(8000),
  returnsEn: z.string().trim().min(10).max(8000),
  cookiePolicyDe: z.string().trim().min(10).max(8000),
  cookiePolicyEn: z.string().trim().min(10).max(8000),
  productSafetyDe: z.string().trim().min(10).max(8000),
  productSafetyEn: z.string().trim().min(10).max(8000),
});

export const productRegulatoryMatrixUpdateSchema = z.object({
  productId: z.number().int().positive(),
  productIdentityNote: z.string().trim().max(600),
  compositionNote: z.string().trim().max(600),
  intendedUseNote: z.string().trim().max(600),
  actualCustomerSegment: z.string().trim().max(300),
  productPresentationNote: z.string().trim().max(400),
  manufacturerDocStatus: z.string().trim().max(400),
  applicableLegislation: z.string().trim().max(500),
  medicinalClassificationRisk: z.enum([
    'under_assessment',
    'non_medicinal_ruo_verified',
    'medicinal_requires_amg',
  ]),
  reachApplicable: z.boolean(),
  clpClassification: z.string().trim().max(300),
  clpHazardStatements: z.string().trim().max(400),
  sdsDocumentRef: z.string().trim().max(200),
  transportRequirements: z.string().trim().max(400),
  traceabilityBatchRule: z.string().trim().max(300),
  reviewerLegalAssessment: z.string().trim().max(1500),
});

export const productionChecklistUpdateSchema = z.object({
  developmentComplete: z.boolean(),
  testingComplete: z.boolean(),
  databaseReady: z.boolean(),
  securityReviewed: z.boolean(),
  seoReady: z.boolean(),
  businessDocsReady: z.boolean(),
  regulatoryApprovalReady: z.boolean(),
  paymentProviderApproved: z.boolean(),
  productionAuthorized: z.boolean(),
});

export const gdprEraseSchema = z.object({
  confirmPhrase: z.literal('ERASE MY PERSONAL DATA'),
});

