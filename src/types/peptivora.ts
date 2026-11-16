import type {
  AppRole,
  ApprovalStatus,
  DivisionSlug,
  KybStatus,
  ProductClassificationCode,
  PublicationStatus,
} from '../core/domain/compliance.ts';

export type PageRoute =
  | 'home'
  | 'about'
  | 'research'
  | 'pharmaceutical'
  | 'catalogue'
  | 'product'
  | 'quality'
  | 'knowledge'
  | 'blog'
  | 'faq'
  | 'contact'
  | 'account'
  | 'cart'
  | 'checkout'
  | 'privacy'
  | 'terms'
  | 'impressum'
  | 'cookies'
  | 'compliance';

export interface DivisionDto {
  id: number;
  slug: DivisionSlug;
  nameDe: string;
  nameEn: string;
  descriptionDe: string;
  descriptionEn: string;
  catalogVisible: boolean;
  transactionsEnabled: boolean;
  pharmacyLicenseVerified: boolean;
  distributionArrangementVerified: boolean;
  productAuthorizationVerified: boolean;
  dispensingWorkflowVerified: boolean;
  verifiedByUid: string | null;
  verifiedAt: string | null;
  notes: string | null;
}

export interface ProductCategoryDto {
  id: number;
  divisionId: number;
  slug: string;
  nameDe: string;
  nameEn: string;
  descriptionDe: string | null;
  descriptionEn: string | null;
}

export interface ProductClassificationDto {
  id: number;
  code: ProductClassificationCode;
  nameDe: string;
  nameEn: string;
  requiresPrescription: boolean;
  requiresPharmacyAuthorization: boolean;
  legalNotesDe: string | null;
  legalNotesEn: string | null;
}

export interface SupplierDto {
  id: number;
  name: string;
  countryCode: string;
  gmpStatusNote: string | null;
  contactEmail: string | null;
}

export interface ProductImageDto {
  id: number;
  productId: number;
  imageUrl: string;
  altDe: string;
  altEn: string;
  sortOrder: number;
}

export interface ProductVariantDto {
  id: number;
  productId: number;
  sku: string;
  labelDe: string;
  labelEn: string;
  packSize: string;
  priceNetCents: number;
}

export interface InventoryDto {
  id: number;
  productId: number;
  variantId: number | null;
  batchNumber: string;
  quantityOnHand: number;
  reservedQuantity: number;
  expiresAt: string | null;
}

export interface ProductDocumentDto {
  id: number;
  productId: number | null;
  docType: string;
  title: string;
  fileName: string;
  mimeType?: string;
  fileSizeBytes?: number;
  sha256Hash: string;
  verificationStatus: 'pending_review' | 'verified' | 'rejected' | 'revoked';
  uploadedByUid?: string | null;
  verifiedByUid?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface ProductDto {
  id: number;
  sku: string;
  slug: string;
  divisionId: number;
  categoryId: number;
  classificationId: number;
  supplierId: number;
  manufacturerName: string;
  manufacturerRuoLabeled: boolean;
  nameDe: string;
  nameEn: string;
  descriptionDe: string;
  descriptionEn: string;
  technicalSummaryDe: string | null;
  technicalSummaryEn: string | null;
  regulatoryNoticeDe: string;
  regulatoryNoticeEn: string;
  casNumber: string | null;
  molecularFormula: string | null;
  molecularWeight: string | null;
  sequence: string | null;
  storageCondition: string;
  pricePermitted: boolean;
  priceNetCents: number;
  currency: string;
  vatRateBps: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'gated';
  publicationStatus: PublicationStatus;
  approvalStatus: ApprovalStatus;
  isDemonstrationRecord: boolean;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
  divisionSlug: DivisionSlug;
  divisionNameDe: string;
  divisionNameEn: string;
  categorySlug: string;
  categoryNameDe: string;
  categoryNameEn: string;
  classificationCode: ProductClassificationCode;
  classificationNameDe: string;
  classificationNameEn: string;
  supplierName: string;
  approvalExpiresAt: string | null;
  approvalJurisdiction: string;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
  inventory: InventoryDto[];
  documents: ProductDocumentDto[];
}

export interface ShippingMethodDto {
  id: number;
  code: string;
  nameDe: string;
  nameEn: string;
  descriptionDe: string | null;
  descriptionEn: string | null;
  priceNetCents: number;
  estimatedDays: string;
  isActive: boolean;
}

export interface PaymentProviderDescriptorDto {
  id: string;
  nameDe: string;
  nameEn: string;
  method: 'sepa_invoice' | 'vetted_b2b_token';
  expresslyApprovedForPeptides: boolean;
  approvedDivisions: DivisionSlug[];
  approvedClassifications: ProductClassificationCode[];
  requiresKybVerified: boolean;
  notesDe: string;
  notesEn: string;
}

export interface CouponDto {
  id: number;
  code: string;
  descriptionDe: string;
  descriptionEn: string;
  discountPercent: number;
  minSubtotalCents: number;
  expiresAt: string | null;
  isActive: boolean;
}

export interface PublicCatalogResponse {
  divisions: DivisionDto[];
  categories: ProductCategoryDto[];
  classifications: ProductClassificationDto[];
  shippingMethods: ShippingMethodDto[];
  paymentProviders: PaymentProviderDescriptorDto[];
  products: ProductDto[];
  governance?: PublicGovernanceSummaryDto;
}

export interface BlogCategoryDto {
  id: number;
  slug: string;
  nameDe: string;
  nameEn: string;
}

export interface AuthorDto {
  id: number;
  name: string;
  roleDe: string;
  roleEn: string;
  bioDe: string | null;
  bioEn: string | null;
}

export interface BlogPostDto {
  id: number;
  slug: string;
  categoryId: number;
  authorId: number;
  titleDe: string;
  titleEn: string;
  excerptDe: string;
  excerptEn: string;
  bodyDe: string;
  bodyEn: string;
  imageUrl: string | null;
  isPublished?: boolean;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  referencesText?: string;
  editorialReviewStatus?: 'draft' | 'peer_reviewed' | 'published';
  seoTitleDe?: string;
  seoTitleEn?: string;
  seoDescriptionDe?: string;
  seoDescriptionEn?: string;
  category?: BlogCategoryDto;
  author?: AuthorDto;
}

export interface PublicBlogResponse {
  categories: BlogCategoryDto[];
  authors: AuthorDto[];
  posts: BlogPostDto[];
}

export interface ProfileDto {
  uid: string;
  email: string;
  displayName: string | null;
  organizationName: string | null;
  organizationType: string | null;
  vatId: string | null;
  phone: string | null;
  kybStatus: KybStatus;
  preferredLocale: 'de' | 'en';
  createdAt: string;
  updatedAt: string;
  roles?: AppRole[];
}

export interface AddressDto {
  id: number;
  userUid: string;
  label: string;
  recipientName: string;
  streetLine: string;
  postalCode: string;
  city: string;
  countryCode: string;
  isDefault: boolean;
  createdAt: string;
}

export interface OrderItemDto {
  id: number;
  orderId: number;
  productId: number;
  skuSnapshot: string;
  nameSnapshot: string;
  quantity: number;
  unitNetCents: number;
  vatRateBps: number;
}

export interface InvoiceDto {
  id: number;
  orderId: number;
  invoiceNumber: string;
  issuedAt: string;
  subtotalNetCents: number;
  vatCents: number;
  totalGrossCents: number;
  currency: string;
  status?: string;
}

export interface ShipmentDto {
  id: number;
  orderId: number;
  shippingMethodId: number | null;
  carrier: string;
  trackingNumber: string | null;
  status: string;
  shippedAt?: string | null;
  createdAt?: string;
}

export interface PaymentTransactionDto {
  id: number;
  orderId: number;
  provider: string;
  method: string;
  amountGrossCents: number;
  currency: string;
  status: string;
  externalRef: string | null;
  createdAt: string;
}

export interface OrderDto {
  id: number;
  orderNumber: string;
  userUid: string;
  divisionId: number;
  shippingMethodId: number | null;
  status: string;
  ruoNonHumanUseAttestedAt: string | null;
  subtotalNetCents: number;
  discountNetCents: number;
  shippingNetCents: number;
  vatCents: number;
  totalGrossCents: number;
  currency: string;
  billingName: string;
  billingVatId: string | null;
  billingAddress: string;
  createdAt: string;
  items: OrderItemDto[];
  invoice: InvoiceDto | null;
  shipment: ShipmentDto | null;
  paymentTransaction: PaymentTransactionDto | null;
}

export interface CustomerNotificationDto {
  id: number;
  action: string;
  entityId: string;
  message: string;
  createdAt: string;
}

export interface CustomerAccountResponse {
  profile: ProfileDto | null;
  roles: AppRole[];
  primaryRole: AppRole;
  addresses: AddressDto[];
  supportTickets: ContactMessageDto[];
  notifications: CustomerNotificationDto[];
  orders: OrderDto[];
}

export interface RegulatoryApprovalDto {
  id: number;
  productId: number;
  submittedByUid: string;
  reviewerUid: string | null;
  reviewDate: string | null;
  status: ApprovalStatus;
  supportingEvidence: string;
  jurisdiction: string;
  expiresAt: string | null;
  approvalScope: string;
  amgScreened: boolean;
  hwgScreened: boolean;
  chemgScreened: boolean;
  ruoIndependentlyVerified: boolean;
  createdAt: string;
}

export interface ApprovalHistoryDto {
  id: number;
  regulatoryApprovalId: number;
  productId: number;
  actorUid: string;
  previousStatus: string | null;
  nextStatus: string;
  notes: string;
  createdAt: string;
}

export interface ContactMessageDto {
  id: number;
  senderName: string;
  senderEmail: string;
  organization: string | null;
  topic: string;
  message: string;
  locale: string;
  status: string;
  createdAt: string;
}

export interface NewsletterSubscriberDto {
  id: number;
  email: string;
  locale: string;
  status: string;
  consentRecordedAt: string;
}

export interface AuditLogDto {
  id: number;
  actorUid: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousStateJson: string | null;
  newStateJson: string | null;
  reason: string | null;
  createdAt: string;
}

export interface AdminProductRowDto {
  id: number;
  sku: string;
  slug: string;
  divisionId: number;
  categoryId: number;
  classificationId: number;
  supplierId: number;
  manufacturerName: string;
  manufacturerRuoLabeled: boolean;
  nameDe: string;
  nameEn: string;
  descriptionDe: string;
  descriptionEn: string;
  technicalSummaryDe: string | null;
  technicalSummaryEn: string | null;
  regulatoryNoticeDe: string;
  regulatoryNoticeEn: string;
  casNumber: string | null;
  molecularFormula: string | null;
  molecularWeight: string | null;
  sequence: string | null;
  storageCondition: string;
  pricePermitted: boolean;
  priceNetCents: number;
  stockStatus: string;
  publicationStatus: PublicationStatus;
  approvalStatus: ApprovalStatus;
  isDemonstrationRecord: boolean;
  createdByUid: string;
  updatedAt: string;
}

export interface SeoPageConfigDto {
  route: PageRoute;
  seoTitleDe: string;
  seoTitleEn: string;
  metaDescriptionDe: string;
  metaDescriptionEn: string;
  canonicalUrl: string;
  focusKeywordDe: string;
  focusKeywordEn: string;
  supportingKeywords: string;
  socialImageUrl: string;
  robotsDirective: 'index, follow' | 'noindex, nofollow';
  schemaType: string;
}

export interface SeoIntegrationsConfigDto {
  searchConsoleVerificationMeta: string;
  ga4MeasurementId: string;
  gtmContainerId: string;
  googleBusinessProfileName: string;
  merchantCenterEnabled: boolean;
  merchantCenterEligibilityNote: string;
  analyticsRequiresConsent: boolean;
  reportedMetrics: {
    indexedPagesCount: number;
    organicClicks28d: number;
    searchImpressions28d: number;
    ctrPercent: number;
    topLandingPage: string;
    lastSyncedNote: string;
  };
  updatedAt: string;
}

export interface BusinessComplianceProfileDto {
  legalEntityName: string;
  germanRegisteredAddress: string;
  commercialRegisterInfo: string;
  taxVatInfo: string;
  responsiblePerson: string;
  relevantLicenses: string;
  authorizedOperatingLocations: string;
  regulatoryContacts: string;
  verificationStatus: 'pending_documentation' | 'verified' | 'incomplete';
  updatedAt: string;
}

export interface EuPharmacyLogoConfigDto {
  enabled: boolean;
  authorityRegisterUrl: string;
  authorizedOperatorName: string;
  displayNoteDe: string;
  displayNoteEn: string;
  updatedAt: string;
}

export interface LegalDocumentsConfigDto {
  reviewStatus: 'draft_template' | 'counsel_reviewed';
  impressumDe: string;
  impressumEn: string;
  privacyDe: string;
  privacyEn: string;
  termsDe: string;
  termsEn: string;
  withdrawalDe: string;
  withdrawalEn: string;
  shippingDe: string;
  shippingEn: string;
  returnsDe: string;
  returnsEn: string;
  cookiePolicyDe: string;
  cookiePolicyEn: string;
  productSafetyDe: string;
  productSafetyEn: string;
  updatedAt: string;
}

export interface ProductRegulatoryMatrixEntryDto {
  productId: number;
  productIdentityNote: string;
  compositionNote: string;
  intendedUseNote: string;
  actualCustomerSegment: string;
  productPresentationNote: string;
  manufacturerDocStatus: string;
  applicableLegislation: string;
  medicinalClassificationRisk: 'under_assessment' | 'non_medicinal_ruo_verified' | 'medicinal_requires_amg';
  reachApplicable: boolean;
  clpClassification: string;
  clpHazardStatements: string;
  sdsDocumentRef: string;
  transportRequirements: string;
  traceabilityBatchRule: string;
  reviewerLegalAssessment: string;
  updatedAt: string;
}

export interface ProductionReadinessChecklistDto {
  developmentComplete: boolean;
  testingComplete: boolean;
  databaseReady: boolean;
  securityReviewed: boolean;
  seoReady: boolean;
  businessDocsReady: boolean;
  regulatoryApprovalReady: boolean;
  paymentProviderApproved: boolean;
  productionAuthorized: boolean;
  updatedAt: string;
}

export interface PublicGovernanceSummaryDto {
  seoPages: SeoPageConfigDto[];
  seoIntegrations: SeoIntegrationsConfigDto;
  euPharmacyLogo: EuPharmacyLogoConfigDto;
  legalDocuments: LegalDocumentsConfigDto;
  businessProfile: BusinessComplianceProfileDto;
}

export interface ComplianceOverviewResponse {
  divisions: DivisionDto[];
  categories: ProductCategoryDto[];
  classifications: ProductClassificationDto[];
  suppliers: SupplierDto[];
  products: AdminProductRowDto[];
  images: ProductImageDto[];
  inventory: InventoryDto[];
  approvals: RegulatoryApprovalDto[];
  approvalHistory: ApprovalHistoryDto[];
  documents: ProductDocumentDto[];
  profiles: ProfileDto[];
  orders: OrderDto[];
  contactMessages: ContactMessageDto[];
  newsletterSubscribers: NewsletterSubscriberDto[];
  auditLogs: AuditLogDto[];
  blogPosts: BlogPostDto[];
  blogCategories: BlogCategoryDto[];
  authors: AuthorDto[];
  seoPages: SeoPageConfigDto[];
  seoIntegrations: SeoIntegrationsConfigDto;
  businessProfile: BusinessComplianceProfileDto;
  euPharmacyLogo: EuPharmacyLogoConfigDto;
  legalDocuments: LegalDocumentsConfigDto;
  productRegulatoryMatrix: ProductRegulatoryMatrixEntryDto[];
  productionChecklist: ProductionReadinessChecklistDto;
}

export interface CartItem {
  product: ProductDto;
  variant?: ProductVariantDto | null;
  quantity: number;
}
