import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. profiles
export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  phone: text('phone'),
  organizationName: text('organization_name'),
  organizationType: text('organization_type'),
  vatId: text('vat_id'),
  kybStatus: text('kyb_status').notNull().default('unverified'),
  preferredLocale: text('preferred_locale').notNull().default('de'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. user_roles
export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => profiles.uid, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull().default('customer'),
  grantedByUid: text('granted_by_uid'),
  grantedAt: timestamp('granted_at').defaultNow().notNull(),
});

// 3. divisions
export const divisions = pgTable('divisions', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameDe: text('name_de').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionDe: text('description_de').notNull(),
  descriptionEn: text('description_en').notNull(),
  catalogVisible: boolean('catalog_visible').notNull().default(false),
  transactionsEnabled: boolean('transactions_enabled').notNull().default(false),
  pharmacyLicenseVerified: boolean('pharmacy_license_verified').notNull().default(false),
  distributionArrangementVerified: boolean('distribution_arrangement_verified').notNull().default(false),
  productAuthorizationVerified: boolean('product_authorization_verified').notNull().default(false),
  dispensingWorkflowVerified: boolean('dispensing_workflow_verified').notNull().default(false),
  verifiedByUid: text('verified_by_uid'),
  verifiedAt: timestamp('verified_at'),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. product_categories
export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  divisionId: integer('division_id')
    .references(() => divisions.id, { onDelete: 'cascade' })
    .notNull(),
  slug: text('slug').notNull().unique(),
  nameDe: text('name_de').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionDe: text('description_de'),
  descriptionEn: text('description_en'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. suppliers
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  countryCode: text('country_code').notNull().default('DE'),
  gmpStatusNote: text('gmp_status_note'),
  contactEmail: text('contact_email'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. product_classifications
export const productClassifications = pgTable('product_classifications', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  nameDe: text('name_de').notNull(),
  nameEn: text('name_en').notNull(),
  requiresPrescription: boolean('requires_prescription').notNull().default(false),
  requiresPharmacyAuthorization: boolean('requires_pharmacy_authorization').notNull().default(false),
  legalNotesDe: text('legal_notes_de').notNull(),
  legalNotesEn: text('legal_notes_en').notNull(),
});

// 5. products
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  slug: text('slug').notNull().unique(),
  divisionId: integer('division_id')
    .references(() => divisions.id)
    .notNull(),
  categoryId: integer('category_id')
    .references(() => productCategories.id)
    .notNull(),
  classificationId: integer('classification_id')
    .references(() => productClassifications.id)
    .notNull(),
  supplierId: integer('supplier_id')
    .references(() => suppliers.id)
    .notNull(),
  manufacturerName: text('manufacturer_name').notNull(),
  manufacturerRuoLabeled: boolean('manufacturer_ruo_labeled').notNull().default(false),
  nameDe: text('name_de').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionDe: text('description_de').notNull(),
  descriptionEn: text('description_en').notNull(),
  technicalSummaryDe: text('technical_summary_de'),
  technicalSummaryEn: text('technical_summary_en'),
  regulatoryNoticeDe: text('regulatory_notice_de').notNull(),
  regulatoryNoticeEn: text('regulatory_notice_en').notNull(),
  casNumber: text('cas_number'),
  molecularFormula: text('molecular_formula'),
  molecularWeight: text('molecular_weight'),
  sequence: text('sequence'),
  storageCondition: text('storage_condition').notNull().default('-20 °C, lyophilized'),
  pricePermitted: boolean('price_permitted').notNull().default(false),
  priceNetCents: integer('price_net_cents').notNull().default(0),
  vatRateBps: integer('vat_rate_bps').notNull().default(1900),
  currency: text('currency').notNull().default('EUR'),
  stockStatus: text('stock_status').notNull().default('out_of_stock'),
  publicationStatus: text('publication_status').notNull().default('unpublished'),
  approvalStatus: text('approval_status').notNull().default('draft'),
  isDemonstrationRecord: boolean('is_demonstration_record').notNull().default(true),
  createdByUid: text('created_by_uid').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. product_variants
export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  sku: text('sku').notNull().unique(),
  labelDe: text('label_de').notNull(),
  labelEn: text('label_en').notNull(),
  packSize: text('pack_size').notNull(),
  priceNetCents: integer('price_net_cents').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

// 7. product_images
export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  imageUrl: text('image_url').notNull(),
  altDe: text('alt_de').notNull(),
  altEn: text('alt_en').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// 8. product_documents
export const productDocuments = pgTable('product_documents', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }),
  docType: text('doc_type').notNull(),
  title: text('title').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  sha256Hash: text('sha256_hash').notNull(),
  contentBase64: text('content_base64').notNull(),
  verificationStatus: text('verification_status').notNull().default('pending_review'),
  uploadedByUid: text('uploaded_by_uid').notNull(),
  verifiedByUid: text('verified_by_uid'),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. regulatory_approvals
export const regulatoryApprovals = pgTable('regulatory_approvals', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  submittedByUid: text('submitted_by_uid').notNull(),
  reviewerUid: text('reviewer_uid'),
  reviewDate: timestamp('review_date'),
  status: text('status').notNull().default('draft'),
  supportingEvidence: text('supporting_evidence').notNull(),
  jurisdiction: text('jurisdiction').notNull().default('DE / EU'),
  expiresAt: timestamp('expires_at'),
  approvalScope: text('approval_scope').notNull(),
  amgScreened: boolean('amg_screened').notNull().default(false),
  hwgScreened: boolean('hwg_screened').notNull().default(false),
  chemgScreened: boolean('chemg_screened').notNull().default(false),
  ruoIndependentlyVerified: boolean('ruo_independently_verified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. approval_history
export const approvalHistory = pgTable('approval_history', {
  id: serial('id').primaryKey(),
  regulatoryApprovalId: integer('regulatory_approval_id')
    .references(() => regulatoryApprovals.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  actorUid: text('actor_uid').notNull(),
  previousStatus: text('previous_status'),
  nextStatus: text('next_status').notNull(),
  notes: text('notes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. inventory
export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  batchNumber: text('batch_number').notNull(),
  quantityOnHand: integer('quantity_on_hand').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  expiresAt: text('expires_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 14. inventory_movements
export const inventoryMovements = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  inventoryId: integer('inventory_id')
    .references(() => inventory.id, { onDelete: 'cascade' })
    .notNull(),
  movementType: text('movement_type').notNull(),
  quantityDelta: integer('quantity_delta').notNull(),
  referenceId: text('reference_id'),
  actorUid: text('actor_uid'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 22. addresses
export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => profiles.uid, { onDelete: 'cascade' })
    .notNull(),
  label: text('label').notNull(),
  recipientName: text('recipient_name').notNull(),
  streetLine: text('street_line').notNull(),
  postalCode: text('postal_code').notNull(),
  city: text('city').notNull(),
  countryCode: text('country_code').notNull().default('DE'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 20. shipping_methods
export const shippingMethods = pgTable('shipping_methods', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  nameDe: text('name_de').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionDe: text('description_de').notNull(),
  descriptionEn: text('description_en').notNull(),
  priceNetCents: integer('price_net_cents').notNull(),
  vatRateBps: integer('vat_rate_bps').notNull().default(1900),
  estimatedDays: text('estimated_days').notNull(),
  isActive: boolean('is_active').notNull().default(true),
});

// 24. coupons
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  descriptionDe: text('description_de').notNull(),
  descriptionEn: text('description_en').notNull(),
  discountPercent: integer('discount_percent').notNull(),
  minSubtotalCents: integer('min_subtotal_cents').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
});

// 15. carts
export const carts = pgTable('carts', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => profiles.uid, { onDelete: 'cascade' })
    .notNull(),
  divisionId: integer('division_id')
    .references(() => divisions.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 16. cart_items
export const cartItems = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  cartId: integer('cart_id')
    .references(() => carts.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull().default(1),
});

// 17. orders
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userUid: text('user_uid')
    .references(() => profiles.uid)
    .notNull(),
  divisionId: integer('division_id')
    .references(() => divisions.id)
    .notNull(),
  shippingMethodId: integer('shipping_method_id').references(() => shippingMethods.id),
  couponId: integer('coupon_id').references(() => coupons.id),
  shippingAddressId: integer('shipping_address_id').references(() => addresses.id),
  status: text('status').notNull().default('recorded'),
  ruoNonHumanUseAttestedAt: timestamp('ruo_non_human_use_attested_at'),
  subtotalNetCents: integer('subtotal_net_cents').notNull(),
  discountNetCents: integer('discount_net_cents').notNull().default(0),
  shippingNetCents: integer('shipping_net_cents').notNull(),
  vatCents: integer('vat_cents').notNull(),
  totalGrossCents: integer('total_gross_cents').notNull(),
  currency: text('currency').notNull().default('EUR'),
  billingName: text('billing_name').notNull(),
  billingVatId: text('billing_vat_id'),
  billingAddress: text('billing_address').notNull(),
  complianceSnapshotJson: text('compliance_snapshot_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 18. order_items
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  skuSnapshot: text('sku_snapshot').notNull(),
  nameSnapshot: text('name_snapshot').notNull(),
  quantity: integer('quantity').notNull(),
  unitNetCents: integer('unit_net_cents').notNull(),
  vatRateBps: integer('vat_rate_bps').notNull(),
});

// 19. payment_transactions
export const paymentTransactions = pgTable('payment_transactions', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  provider: text('provider').notNull(),
  method: text('method').notNull(),
  amountGrossCents: integer('amount_gross_cents').notNull(),
  currency: text('currency').notNull().default('EUR'),
  status: text('status').notNull().default('pending_settlement'),
  externalRef: text('external_ref'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 21. shipments
export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  shippingMethodId: integer('shipping_method_id')
    .references(() => shippingMethods.id)
    .notNull(),
  carrier: text('carrier').notNull().default('Cold-Chain Courier DE'),
  trackingNumber: text('tracking_number'),
  status: text('status').notNull().default('preparing'),
  shippedAt: timestamp('shipped_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 23. invoices
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  subtotalNetCents: integer('subtotal_net_cents').notNull(),
  vatCents: integer('vat_cents').notNull(),
  totalGrossCents: integer('total_gross_cents').notNull(),
  currency: text('currency').notNull().default('EUR'),
  status: text('status').notNull().default('issued'),
});

// 26. blog_categories
export const blogCategories = pgTable('blog_categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameDe: text('name_de').notNull(),
  nameEn: text('name_en').notNull(),
});

// 27. authors
export const authors = pgTable('authors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  roleDe: text('role_de').notNull(),
  roleEn: text('role_en').notNull(),
  bioDe: text('bio_de').notNull(),
  bioEn: text('bio_en').notNull(),
});

// 25. blog_posts
export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  categoryId: integer('category_id')
    .references(() => blogCategories.id)
    .notNull(),
  authorId: integer('author_id')
    .references(() => authors.id)
    .notNull(),
  titleDe: text('title_de').notNull(),
  titleEn: text('title_en').notNull(),
  excerptDe: text('excerpt_de').notNull(),
  excerptEn: text('excerpt_en').notNull(),
  bodyDe: text('body_de').notNull(),
  bodyEn: text('body_en').notNull(),
  imageUrl: text('image_url'),
  isPublished: boolean('is_published').notNull().default(true),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
});

// 28. contact_messages
export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  senderName: text('sender_name').notNull(),
  senderEmail: text('sender_email').notNull(),
  organization: text('organization'),
  topic: text('topic').notNull(),
  message: text('message').notNull(),
  locale: text('locale').notNull().default('de'),
  status: text('status').notNull().default('received'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 29. newsletter_subscribers
export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  locale: text('locale').notNull().default('de'),
  consentRecordedAt: timestamp('consent_recorded_at').defaultNow().notNull(),
  status: text('status').notNull().default('subscribed'),
});

// 30. audit_logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid'),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  previousStateJson: text('previous_state_json'),
  newStateJson: text('new_state_json'),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 31. site_settings
export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 32. consent_records
export const consentRecords = pgTable('consent_records', {
  id: serial('id').primaryKey(),
  visitorSessionId: text('visitor_session_id').notNull(),
  userUid: text('user_uid'),
  essentialCookies: boolean('essential_cookies').notNull().default(true),
  functionalCookies: boolean('functional_cookies').notNull().default(false),
  analyticsCookies: boolean('analytics_cookies').notNull().default(false),
  policyVersion: text('policy_version').notNull().default('2026.1'),
  locale: text('locale').notNull().default('de'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});
