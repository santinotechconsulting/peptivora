import crypto from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  addresses,
  approvalHistory,
  auditLogs,
  authors,
  blogCategories,
  blogPosts,
  cartItems,
  carts,
  consentRecords,
  contactMessages,
  coupons,
  divisions,
  inventory,
  inventoryMovements,
  invoices,
  newsletterSubscribers,
  orderItems,
  orders,
  paymentTransactions,
  productCategories,
  productClassifications,
  productDocuments,
  productImages,
  products,
  productVariants,
  profiles,
  regulatoryApprovals,
  shipments,
  shippingMethods,
  siteSettings,
  suppliers,
  userRoles,
} from './schema.ts';
import {
  calculateGermanVat,
  canTransactDivision,
  detectProhibitedMedicinalClaims,
  hasAllPharmaceuticalPrerequisites,
  isProductAvailableForPublicCatalog,
  type AppRole,
  type DivisionState,
  type ProductClassificationCode,
} from '../core/domain/compliance.ts';
import { validateRestrictedPharmaceuticalDispensing } from '../core/domain/pharmacy.ts';
import {
  authorizeDivisionPayment,
  listPublicPaymentProviders,
  processDivisionRefund,
} from '../core/payments/paymentGateway.ts';
import { DEFAULT_SEO_PAGES } from '../core/seo/seoEngine.ts';
import {
  DEFAULT_BUSINESS_PROFILE,
  DEFAULT_EU_PHARMACY_LOGO_CONFIG,
  DEFAULT_LEGAL_DOCUMENTS,
  DEFAULT_PRODUCTION_CHECKLIST,
  DEFAULT_SEO_INTEGRATIONS,
} from '../core/compliance/governanceDefaults.ts';
import type {
  BusinessComplianceProfileDto,
  EuPharmacyLogoConfigDto,
  LegalDocumentsConfigDto,
  ProductRegulatoryMatrixEntryDto,
  ProductionReadinessChecklistDto,
  SeoIntegrationsConfigDto,
  SeoPageConfigDto,
} from '../types/peptivora.ts';

async function getSiteSettingJson<T>(key: string, fallback: T): Promise<T> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  if (rows.length === 0) return fallback;
  try {
    return JSON.parse(rows[0].valueJson) as T;
  } catch {
    return fallback;
  }
}

async function upsertSiteSettingJson<T>(key: string, value: T): Promise<T> {
  const serialized = JSON.stringify(value);
  await db
    .insert(siteSettings)
    .values({ key, valueJson: serialized, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { valueJson: serialized, updatedAt: new Date() },
    });
  return value;
}

export class DomainPolicyError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const ROLE_PRECEDENCE: AppRole[] = [
  'super_administrator',
  'regulatory_reviewer',
  'product_manager',
  'order_manager',
  'content_manager',
  'customer_support',
  'customer',
];

let seedPromise: Promise<void> | null = null;

export async function ensureBaselineSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        const existingDivs = await db.select().from(divisions);
        if (existingDivs.length > 0) return;

        // 1. Divisions
        const insertedDivs = await db
          .insert(divisions)
          .values([
            {
              slug: 'research',
              nameDe: 'Geschäftsbereich Forschung',
              nameEn: 'Research Division',
              descriptionDe:
                'Akkreditierte Labor- und In-vitro-Referenzmaterialien unter verbindlicher Nicht-Humananwendungs-Dokumentation.',
              descriptionEn:
                'Accredited laboratory and in-vitro reference materials governed by mandatory non-human-use documentation.',
              catalogVisible: true,
              transactionsEnabled: true,
              notes: 'Research Division active for KYB-verified institutions.',
            },
            {
              slug: 'pharmaceutical',
              nameDe: 'Pharmazeutischer Bereich',
              nameEn: 'Pharmaceutical Division',
              descriptionDe:
                'Regulierte Arzneimittel und Abgabeprozesse ausschließlich über behördlich autorisierte Apotheken und Großhändler (§ 52a AMG).',
              descriptionEn:
                'Regulated medicinal products and dispensing strictly restricted to licensed pharmacies and § 52a AMG wholesalers.',
              catalogVisible: true,
              transactionsEnabled: false,
              notes:
                'Transactions permanently disabled until German pharmacy, § 52a AMG wholesale, product authorization, and dispensing workflow are verified.',
            },
          ])
          .returning();

        const researchDiv = insertedDivs.find((d) => d.slug === 'research')!;
        const pharmaDiv = insertedDivs.find((d) => d.slug === 'pharmaceutical')!;

        // 2. Classifications
        const insertedClasses = await db
          .insert(productClassifications)
          .values([
            {
              code: 'research_use_only',
              nameDe: 'Nur für Forschungszwecke (RUO)',
              nameEn: 'Research-Use-Only (RUO)',
              requiresPrescription: false,
              requiresPharmacyAuthorization: false,
              legalNotesDe: 'Keine Anwendung am Menschen oder Tier; kein Arzneimittel.',
              legalNotesEn: 'Not for human or veterinary use; not a medicinal product.',
            },
            {
              code: 'authorized_otc_medicinal',
              nameDe: 'Zugelassenes nicht-verschreibungspflichtiges Arzneimittel',
              nameEn: 'Authorized Non-Prescription Medicinal Product',
              requiresPrescription: false,
              requiresPharmacyAuthorization: true,
              legalNotesDe: 'Abgabe ausschließlich durch zugelassene Apotheken.',
              legalNotesEn: 'Dispensing strictly via licensed pharmacies.',
            },
            {
              code: 'authorized_prescription_medicinal',
              nameDe: 'Zugelassenes verschreibungspflichtiges Arzneimittel',
              nameEn: 'Authorized Prescription Medicinal Product',
              requiresPrescription: true,
              requiresPharmacyAuthorization: true,
              legalNotesDe: 'HWG § 10 Werbeverbot gegenüber Laien; Verschreibungspflicht.',
              legalNotesEn: 'HWG § 10 consumer advertising prohibition; prescription mandatory.',
            },
            {
              code: 'other_regulated',
              nameDe: 'Sonstige regulierte Kategorie (Einzelprüfung)',
              nameEn: 'Other Regulated Category (Case Review)',
              requiresPrescription: false,
              requiresPharmacyAuthorization: false,
              legalNotesDe: 'Erfordert individuelle Einordnung nach AMG, ChemG, REACH.',
              legalNotesEn: 'Requires bespoke determination under AMG, ChemG, REACH.',
            },
          ])
          .returning();

        const ruoClass = insertedClasses.find((c) => c.code === 'research_use_only')!;
        const rxClass = insertedClasses.find((c) => c.code === 'authorized_prescription_medicinal')!;
        const otherClass = insertedClasses.find((c) => c.code === 'other_regulated')!;

        // 3. Categories
        const insertedCats = await db
          .insert(productCategories)
          .values([
            {
              divisionId: researchDiv.id,
              slug: 'synthetic-reference-peptides',
              nameDe: 'Synthetische Referenzpeptide (Demo)',
              nameEn: 'Synthetic Reference Peptides (Demo)',
              descriptionDe: 'Fiktive Demonstrations-Referenzsubstanzen für In-vitro-Analytik.',
              descriptionEn: 'Fictional demonstration reference materials for in-vitro analytics.',
            },
            {
              divisionId: researchDiv.id,
              slug: 'analytical-calibration-kits',
              nameDe: 'Analytische Kalibrierstandards (Demo)',
              nameEn: 'Analytical Calibration Standards (Demo)',
              descriptionDe: 'Fiktive Labor-Kalibrierkits für Methodenvalidierung.',
              descriptionEn: 'Fictional laboratory calibration kits for method validation.',
            },
            {
              divisionId: pharmaDiv.id,
              slug: 'regulated-medicinal-dossiers',
              nameDe: 'Regulierte Arzneimittel-Dossiers (Gesperrt)',
              nameEn: 'Regulated Medicinal Dossiers (Locked)',
              descriptionDe: 'Platzhalter ohne aktive Abgabefreigabe.',
              descriptionEn: 'Placeholder records without active dispensing authorization.',
            },
          ])
          .returning();

        const catPeptides = insertedCats[0];
        const catKits = insertedCats[1];
        const catPharma = insertedCats[2];

        // 4. Suppliers (clearly fictional demonstration entities)
        const insertedSuppliers = await db
          .insert(suppliers)
          .values([
            {
              name: 'PEPTIVORA Demo Synthesis Unit (Fictional Reference)',
              countryCode: 'DE',
              gmpStatusNote: 'Fictional demonstration supplier record — no real certification implied.',
              contactEmail: 'quality-demo@peptivora.example',
            },
          ])
          .returning();
        const demoSupplier = insertedSuppliers[0];

        // 5. Products (100% Fictional Demonstration Records)
        const insertedProducts = await db
          .insert(products)
          .values([
            {
              sku: 'PV-DEM-101',
              slug: 'peptivora-demo-peptide-alpha-7',
              divisionId: researchDiv.id,
              categoryId: catPeptides.id,
              classificationId: ruoClass.id,
              supplierId: demoSupplier.id,
              manufacturerName: 'PEPTIVORA Demo Synthesis Unit (Fictional)',
              manufacturerRuoLabeled: true,
              nameDe: 'Demo-Peptid Alpha-7 (Fiktive Referenzsubstanz, 10 mg)',
              nameEn: 'Demo-Peptide Alpha-7 (Fictional Reference Material, 10 mg)',
              descriptionDe:
                'Fiktiver Demonstrationsdatensatz für ein lyophilisiertes Labor-Referenzpeptid zur Veranschaulichung der zweisprachigen Produktarchitektur.',
              descriptionEn:
                'Fictional demonstration record representing a lyophilized laboratory reference peptide to illustrate bilingual catalog architecture.',
              technicalSummaryDe:
                'Dieses fiktive Referenzmodell dient ausschließlich der Systemdemonstration. Alle Labor- und Chargenzertifikate müssen vor produktiver Nutzung real im Dokumenten-Tresor hochgeladen und unabhängig verifiziert werden.',
              technicalSummaryEn:
                'This fictional reference model is provided strictly for platform demonstration. Real laboratory batch documentation must be uploaded and independently verified in the Document Vault prior to live use.',
              regulatoryNoticeDe:
                'Fiktiver Demo-Datensatz · Nur für akkreditierte Laborforschung (RUO). Kein Arzneimittel.',
              regulatoryNoticeEn:
                'Fictional Demo Record · For accredited laboratory research only (RUO). Not a medicinal product.',
              casNumber: '00000-00-1 (DEMO)',
              molecularFormula: 'C48H72N12O14 (Demo)',
              molecularWeight: '1041.18 g/mol',
              sequence: 'Demo-Gly-Ala-Val-Leu-Pro-Ser-Lys',
              storageCondition: '-20 °C, lyophilized',
              pricePermitted: true,
              priceNetCents: 5400,
              vatRateBps: 1900,
              stockStatus: 'in_stock',
              publicationStatus: 'published',
              approvalStatus: 'approved',
              isDemonstrationRecord: true,
              createdByUid: 'system-seed',
            },
            {
              sku: 'PV-DEM-102',
              slug: 'peptivora-demo-standard-beta-12',
              divisionId: researchDiv.id,
              categoryId: catKits.id,
              classificationId: ruoClass.id,
              supplierId: demoSupplier.id,
              manufacturerName: 'PEPTIVORA Demo Synthesis Unit (Fictional)',
              manufacturerRuoLabeled: true,
              nameDe: 'Demo-Standard Beta-12 (Fiktives Analytik-Kit, 3 × 5 mg)',
              nameEn: 'Demo-Standard Beta-12 (Fictional Analytical Kit, 3 × 5 mg)',
              descriptionDe:
                'Fiktives Mehrfach-Referenzkit zur Abbildung von Kühlketten-Varianten, Chargenrückverfolgung und SHA-256-Dokumentenbindung.',
              descriptionEn:
                'Fictional multi-vial reference kit demonstrating cold-chain variants, batch traceability, and SHA-256 document linkage.',
              technicalSummaryDe:
                'Konzipiert für sequenzielle Laboransätze im Demonstrationsbetrieb. Kein reales Arzneimittel oder Handelsprodukt.',
              technicalSummaryEn:
                'Configured for sequential laboratory demonstration workflows. Not a real medicinal or commercial substance.',
              regulatoryNoticeDe:
                'Fiktiver Demo-Datensatz · Ausschließlich In-vitro-/Laborforschung.',
              regulatoryNoticeEn:
                'Fictional Demo Record · Strictly in-vitro/laboratory research.',
              casNumber: '00000-00-2 (DEMO)',
              molecularFormula: 'C36H58N10O12 (Demo)',
              molecularWeight: '822.91 g/mol',
              sequence: 'Demo-Ala-Glu-Asp-Gly-Ser',
              storageCondition: '2–8 °C, cold-chain',
              pricePermitted: true,
              priceNetCents: 8800,
              vatRateBps: 1900,
              stockStatus: 'in_stock',
              publicationStatus: 'published',
              approvalStatus: 'approved',
              isDemonstrationRecord: true,
              createdByUid: 'system-seed',
            },
            {
              sku: 'PV-DEM-103',
              slug: 'peptivora-demo-matrix-gamma-4',
              divisionId: researchDiv.id,
              categoryId: catKits.id,
              classificationId: ruoClass.id,
              supplierId: demoSupplier.id,
              manufacturerName: 'PEPTIVORA Demo Synthesis Unit (Fictional)',
              manufacturerRuoLabeled: true,
              nameDe: 'Demo-Matrix Gamma-4 (Fiktive Kalibrierlösung, 25 ml)',
              nameEn: 'Demo-Matrix Gamma-4 (Fictional Calibration Solution, 25 ml)',
              descriptionDe:
                'Fiktives Puffer- und Kalibriermedium für chromatographische Methoden-Demonstrationen.',
              descriptionEn:
                'Fictional buffer and calibration matrix for chromatographic method demonstrations.',
              technicalSummaryDe:
                'Demonstrations-Referenzlösung ohne pharmakologische Wirkstoffe.',
              technicalSummaryEn:
                'Demonstration reference solution containing no pharmacological active ingredients.',
              regulatoryNoticeDe:
                'Fiktiver Demo-Datensatz · Nur für analytische Laborabläufe.',
              regulatoryNoticeEn:
                'Fictional Demo Record · Analytical laboratory workflows only.',
              casNumber: '00000-00-3 (DEMO)',
              molecularFormula: 'C12H24N2O6 (Demo)',
              molecularWeight: '292.33 g/mol',
              sequence: 'Calibration Matrix Buffer',
              storageCondition: '2–8 °C, light-protected',
              pricePermitted: true,
              priceNetCents: 4200,
              vatRateBps: 1900,
              stockStatus: 'in_stock',
              publicationStatus: 'published',
              approvalStatus: 'approved',
              isDemonstrationRecord: true,
              createdByUid: 'system-seed',
            },
            {
              sku: 'PV-REV-201',
              slug: 'peptivora-demo-candidate-delta-9',
              divisionId: researchDiv.id,
              categoryId: catPeptides.id,
              classificationId: otherClass.id,
              supplierId: demoSupplier.id,
              manufacturerName: 'PEPTIVORA Demo Synthesis Unit (Fictional)',
              manufacturerRuoLabeled: true,
              nameDe: 'Demo-Kandidat Delta-9 (Prüfung ausstehend)',
              nameEn: 'Demo-Candidate Delta-9 (Under Regulatory Review)',
              descriptionDe:
                'Fiktives Prüfmuster mit Hersteller-RUO-Hinweis, jedoch bewusst gesperrt bis zur unabhängigen AMG-Prüfung.',
              descriptionEn:
                'Fictional review candidate carrying a manufacturer RUO label, intentionally held from publication pending independent AMG review.',
              regulatoryNoticeDe: 'Unveröffentlicht · Regulatorische Prüfung ausstehend.',
              regulatoryNoticeEn: 'Unpublished · Pending regulatory review.',
              storageCondition: '-20 °C, lyophilized',
              pricePermitted: false,
              priceNetCents: 0,
              stockStatus: 'gated',
              publicationStatus: 'unpublished',
              approvalStatus: 'under_regulatory_review',
              isDemonstrationRecord: true,
              createdByUid: 'system-seed',
            },
            {
              sku: 'PV-EXP-202',
              slug: 'peptivora-demo-expired-epsilon-3',
              divisionId: researchDiv.id,
              categoryId: catPeptides.id,
              classificationId: ruoClass.id,
              supplierId: demoSupplier.id,
              manufacturerName: 'PEPTIVORA Demo Synthesis Unit (Fictional)',
              manufacturerRuoLabeled: true,
              nameDe: 'Demo-Charge Epsilon-3 (Freigabe abgelaufen)',
              nameEn: 'Demo-Lot Epsilon-3 (Approval Expired)',
              descriptionDe:
                'Fiktiver Datensatz zur Demonstration der automatischen Verkaufssperre bei abgelaufener Genehmigung.',
              descriptionEn:
                'Fictional record demonstrating automatic unavailability when regulatory approval has expired.',
              regulatoryNoticeDe: 'Abgelaufene Freigabe · Automatisch nicht verkaufsfähig.',
              regulatoryNoticeEn: 'Expired approval · Automatically unavailable for sale.',
              storageCondition: '-20 °C, lyophilized',
              pricePermitted: false,
              priceNetCents: 0,
              stockStatus: 'out_of_stock',
              publicationStatus: 'unpublished',
              approvalStatus: 'expired',
              isDemonstrationRecord: true,
              createdByUid: 'system-seed',
            },
            {
              sku: 'PV-PHM-301',
              slug: 'peptivora-demo-medicinal-omega-rx',
              divisionId: pharmaDiv.id,
              categoryId: catPharma.id,
              classificationId: rxClass.id,
              supplierId: demoSupplier.id,
              manufacturerName: 'Licensed Partner Placeholder (Unverified)',
              manufacturerRuoLabeled: false,
              nameDe: 'Demo-Arzneimittel-Dossier Omega-RX (Abgabe gesperrt)',
              nameEn: 'Demo Medicinal Dossier Omega-RX (Dispensing Locked)',
              descriptionDe:
                'Fiktiver Platzhalter für den pharmazeutischen Bereich. Listung, Werbung und Verkauf bleiben deaktiviert.',
              descriptionEn:
                'Fictional placeholder for the Pharmaceutical Division. Listing, promotion, and dispensing remain disabled.',
              regulatoryNoticeDe: 'Pharmazeutische Abgabe technisch und rechtlich gesperrt.',
              regulatoryNoticeEn: 'Pharmaceutical dispensing technically and legally locked.',
              storageCondition: '2–8 °C, GDP cold-chain',
              pricePermitted: false,
              priceNetCents: 0,
              stockStatus: 'gated',
              publicationStatus: 'unpublished',
              approvalStatus: 'suspended',
              isDemonstrationRecord: true,
              createdByUid: 'system-seed',
            },
          ])
          .returning();

        const p1 = insertedProducts[0];
        const p2 = insertedProducts[1];
        const p3 = insertedProducts[2];
        const p4 = insertedProducts[3];
        const p5 = insertedProducts[4];
        const p6 = insertedProducts[5];

        // 6. Product Images
        await db.insert(productImages).values([
          {
            productId: p1.id,
            imageUrl: '/src/assets/images/product_lyophilized_vial_1794861146550.jpg',
            altDe: 'Fiktives lyophilisiertes Peptid-Referenzvial Alpha-7',
            altEn: 'Fictional lyophilized peptide reference vial Alpha-7',
            sortOrder: 0,
          },
          {
            productId: p2.id,
            imageUrl: '/src/assets/images/product_peptide_kit_1794861146728.jpg',
            altDe: 'Fiktives Kühlketten-Analytik-Kit Beta-12',
            altEn: 'Fictional cold-chain analytical kit Beta-12',
            sortOrder: 0,
          },
          {
            productId: p3.id,
            imageUrl: '/src/assets/images/knowledge_molecular_bench_1794861846484.jpg',
            altDe: 'Fiktive Kalibrierlösung Gamma-4 im Labor',
            altEn: 'Fictional calibration solution Gamma-4 in laboratory',
            sortOrder: 0,
          },
          {
            productId: p6.id,
            imageUrl: '/src/assets/images/pharma_gmp_vault_1794861155822.jpg',
            altDe: 'Pharmazeutische Reinraum-Schleuse',
            altEn: 'Pharmaceutical cleanroom airlock',
            sortOrder: 0,
          },
        ]);

        // 7. Variants & Inventory
        const insertedVars = await db
          .insert(productVariants)
          .values([
            {
              productId: p1.id,
              sku: 'PV-DEM-101-10MG',
              labelDe: '10 mg Einzelfläschchen (Demo)',
              labelEn: '10 mg Single Vial (Demo)',
              packSize: '1 × 10 mg',
              priceNetCents: 5400,
            },
            {
              productId: p2.id,
              sku: 'PV-DEM-102-3X5MG',
              labelDe: '3 × 5 mg Analytik-Set (Demo)',
              labelEn: '3 × 5 mg Analytical Set (Demo)',
              packSize: '3 × 5 mg',
              priceNetCents: 8800,
            },
            {
              productId: p3.id,
              sku: 'PV-DEM-103-25ML',
              labelDe: '25 ml Kalibrierflasche (Demo)',
              labelEn: '25 ml Calibration Bottle (Demo)',
              packSize: '1 × 25 ml',
              priceNetCents: 4200,
            },
          ])
          .returning();

        await db.insert(inventory).values([
          {
            productId: p1.id,
            variantId: insertedVars[0].id,
            batchNumber: 'DEMO-LOT-2026-A1',
            quantityOnHand: 30,
            reservedQuantity: 0,
            expiresAt: '2028-12-31',
          },
          {
            productId: p2.id,
            variantId: insertedVars[1].id,
            batchNumber: 'DEMO-LOT-2026-B2',
            quantityOnHand: 18,
            reservedQuantity: 0,
            expiresAt: '2028-12-31',
          },
          {
            productId: p3.id,
            variantId: insertedVars[2].id,
            batchNumber: 'DEMO-LOT-2026-G3',
            quantityOnHand: 25,
            reservedQuantity: 0,
            expiresAt: '2028-12-31',
          },
        ]);

        // 8. Regulatory Approvals (Active non-expired for p1..p3, Pending for p4, Expired for p5, Suspended for p6)
        const futureExpiry = new Date('2028-12-31T23:59:59Z');
        const pastExpiry = new Date('2025-12-31T23:59:59Z');

        const approvals = await db
          .insert(regulatoryApprovals)
          .values([
            {
              productId: p1.id,
              submittedByUid: 'system-seed',
              reviewerUid: 'compliance-seed-reviewer',
              reviewDate: new Date(),
              status: 'approved',
              supportingEvidence: 'Fictional demonstration dossier — approved solely as UI demo record.',
              jurisdiction: 'DE / EU',
              expiresAt: futureExpiry,
              approvalScope: 'Fictional Research Division Demo Listing',
              amgScreened: true,
              hwgScreened: true,
              chemgScreened: true,
              ruoIndependentlyVerified: true,
            },
            {
              productId: p2.id,
              submittedByUid: 'system-seed',
              reviewerUid: 'compliance-seed-reviewer',
              reviewDate: new Date(),
              status: 'approved',
              supportingEvidence: 'Fictional demonstration dossier — approved solely as UI demo record.',
              jurisdiction: 'DE / EU',
              expiresAt: futureExpiry,
              approvalScope: 'Fictional Research Division Demo Listing',
              amgScreened: true,
              hwgScreened: true,
              chemgScreened: true,
              ruoIndependentlyVerified: true,
            },
            {
              productId: p3.id,
              submittedByUid: 'system-seed',
              reviewerUid: 'compliance-seed-reviewer',
              reviewDate: new Date(),
              status: 'approved',
              supportingEvidence: 'Fictional demonstration dossier — approved solely as UI demo record.',
              jurisdiction: 'DE / EU',
              expiresAt: futureExpiry,
              approvalScope: 'Fictional Research Division Demo Listing',
              amgScreened: true,
              hwgScreened: true,
              chemgScreened: true,
              ruoIndependentlyVerified: true,
            },
            {
              productId: p4.id,
              submittedByUid: 'system-seed',
              status: 'under_regulatory_review',
              supportingEvidence: 'Manufacturer RUO claim present; independent AMG § 2 evaluation pending.',
              jurisdiction: 'DE / EU',
              approvalScope: 'Pending Classification',
            },
            {
              productId: p5.id,
              submittedByUid: 'system-seed',
              reviewerUid: 'compliance-seed-reviewer',
              reviewDate: pastExpiry,
              status: 'expired',
              supportingEvidence: 'Demonstration record showing automatic exclusion once expiry passes.',
              jurisdiction: 'DE / EU',
              expiresAt: pastExpiry,
              approvalScope: 'Expired Demo Scope',
              amgScreened: true,
              hwgScreened: true,
              chemgScreened: true,
              ruoIndependentlyVerified: true,
            },
            {
              productId: p6.id,
              submittedByUid: 'system-seed',
              reviewerUid: 'compliance-seed-reviewer',
              reviewDate: new Date(),
              status: 'suspended',
              supportingEvidence: 'Pharmaceutical dispensing disabled until German pharmacy & AMG § 52a verifications.',
              jurisdiction: 'DE',
              approvalScope: 'Pharmaceutical Gate Suspended',
            },
          ])
          .returning();

        await db.insert(approvalHistory).values(
          approvals.map((a) => ({
            regulatoryApprovalId: a.id,
            productId: a.productId,
            actorUid: 'system-seed',
            previousStatus: 'draft',
            nextStatus: a.status,
            notes: a.supportingEvidence,
          }))
        );

        // 9. Shipping methods & Coupons
        await db.insert(shippingMethods).values([
          {
            code: 'cold-chain-de',
            nameDe: 'Kühlketten-Kurier Deutschland (2–8 °C / -20 °C)',
            nameEn: 'Cold-Chain Courier Germany (2–8 °C / -20 °C)',
            descriptionDe: 'Temperaturüberwachter Laborversand innerhalb Deutschlands.',
            descriptionEn: 'Temperature-monitored laboratory dispatch within Germany.',
            priceNetCents: 1490,
            estimatedDays: '1–2 Werktage / business days',
          },
          {
            code: 'express-eu-lab',
            nameDe: 'EU-Labor-Express (Temperaturgeführt)',
            nameEn: 'EU Laboratory Express (Temperature-Controlled)',
            descriptionDe: 'Isolierter Expressversand an akkreditierte EU-Forschungseinrichtungen.',
            descriptionEn: 'Insulated express delivery to accredited EU research facilities.',
            priceNetCents: 2900,
            estimatedDays: '2–3 Werktage / business days',
          },
        ]);

        await db.insert(coupons).values([
          {
            code: 'DEMO-LAB-10',
            descriptionDe: '10 % Demonstrationsrabatt für verifizierte Forschungseinrichtungen',
            descriptionEn: '10% demonstration discount for verified research institutions',
            discountPercent: 10,
            minSubtotalCents: 5000,
            isActive: true,
          },
        ]);

        // 10. Editorial Authors, Blog Categories & Bilingual Articles
        const insertedAuthors = await db
          .insert(authors)
          .values([
            {
              name: 'Dr. rer. nat. Hannah Lindner (Fictional Editorial Persona)',
              roleDe: 'Leitung Analytische Qualitätssicherung',
              roleEn: 'Head of Analytical Quality Assurance',
              bioDe: 'Fokus auf chromatographische Reinheitsdokumentation und Lyophilisationsstabilität.',
              bioEn: 'Focus on chromatographic purity documentation and lyophilization stability.',
            },
            {
              name: 'RA Markus Weber (Fictional Editorial Persona)',
              roleDe: 'Regulatory Affairs & AMG/HWG Governance',
              roleEn: 'Regulatory Affairs & AMG/HWG Governance',
              bioDe: 'Spezialisiert auf Abgrenzungsfragen zwischen Forschungsreagenzien und Arzneimitteln in Deutschland.',
              bioEn: 'Specialized in statutory boundaries between research reagents and medicinal products in Germany.',
            },
          ])
          .returning();

        const insertedBlogCats = await db
          .insert(blogCategories)
          .values([
            {
              slug: 'regulatory-governance',
              nameDe: 'Regulatorik & Compliance',
              nameEn: 'Regulatory & Compliance',
            },
            {
              slug: 'analytical-science',
              nameDe: 'Analytische Wissenschaft',
              nameEn: 'Analytical Science',
            },
          ])
          .returning();

        await db.insert(blogPosts).values([
          {
            slug: 'amg-boundary-and-ruo-governance',
            categoryId: insertedBlogCats[0].id,
            authorId: insertedAuthors[1].id,
            titleDe: 'Warum eine RUO-Kennzeichnung keine automatische AMG-Ausnahme begründet',
            titleEn: 'Why an RUO Label Never Establishes an Automatic AMG Exemption',
            excerptDe:
              'Ein Überblick über die Abgrenzung zwischen Forschungsreagenzien und Funktions- bzw. Präsentationsarzneimitteln nach deutschem Recht.',
            excerptEn:
              'An overview of distinguishing research reagents from medicinal products by function or presentation under German law.',
            bodyDe:
              'Im deutschen und europäischen Arzneimittelrecht entscheidet nicht allein ein vom Hersteller angebrachter Hinweis wie „Research Use Only“. Maßgeblich sind objektive Stoffeigenschaften, Zweckbestimmung, Darreichungsform und die Einhaltung von AMG, HWG sowie ChemG/REACH. Aus diesem Grund verlangt PEPTIVORA vor jeder Veröffentlichung eine dokumentierte, vom Produktmanagement getrennte Compliance-Prüfung.',
            bodyEn:
              'Under German and European medicinal product law, a manufacturer label such as "Research Use Only" is never determinative on its own. Objective pharmacological properties, intended presentation, and compliance with AMG, HWG, and ChemG/REACH govern classification. Consequently, PEPTIVORA mandates an independent compliance review separated from product management before any listing goes live.',
            imageUrl: '/src/assets/images/quality_hplc_lab_1794861843624.jpg',
          },
          {
            slug: 'cold-chain-lyophilization-handling',
            categoryId: insertedBlogCats[1].id,
            authorId: insertedAuthors[0].id,
            titleDe: 'Kühlketten-Integrität und Lyophilisation bei Peptid-Referenzstandards',
            titleEn: 'Cold-Chain Integrity and Lyophilization for Peptide Reference Standards',
            excerptDe:
              'Wesentliche Lagerparameter (-20 °C vs. 2–8 °C) zur Minimierung von Hydrolyse und Oxidation im Laborbetrieb.',
            excerptEn:
              'Essential storage parameters (-20 °C vs. 2–8 °C) to minimize hydrolysis and oxidation in laboratory workflows.',
            bodyDe:
              'Lyophilisierte Peptid-Referenzmaterialien weisen unter Feuchtigkeitsausschluss bei -20 °C eine deutlich reduzierte Deamidierungs- und Oxidationsrate auf. Jede Charge in der PEPTIVORA-Architektur wird mit expliziten Lagerhinweisen, Verfallsdatum und kryptographisch gehashter Chargendokumentation (SHA-256) verknüpft.',
            bodyEn:
              'Lyophilized peptide reference materials exhibit markedly lower deamidation and oxidation rates when kept desiccated at -20 °C. Every batch inside the PEPTIVORA architecture is linked to explicit storage conditions, expiry tracking, and SHA-256 checksummed documentation.',
            imageUrl: '/src/assets/images/knowledge_molecular_bench_1794861846484.jpg',
          },
        ]);

        // 11. Site Settings & Initial Audit Entry
        await db.insert(siteSettings).values([
          {
            key: 'platform_governance',
            valueJson: JSON.stringify({
              primaryLocale: 'de',
              supportedLocales: ['de', 'en'],
              pharmaceuticalTransactionsEnabled: false,
            }),
          },
        ]);

        await db.insert(auditLogs).values({
          actorUid: 'system',
          actorRole: 'system',
          action: 'INITIALIZE_32_TABLE_ARCHITECTURE',
          entityType: 'divisions',
          entityId: 'pharmaceutical',
          newStateJson: JSON.stringify({
            fictionalDemoMode: true,
            pharmaceuticalTransactionsEnabled: false,
          }),
          reason:
            'Seeded strictly fictional demonstration catalog with Pharmaceutical transactions locked.',
        });
      } catch (error) {
        seedPromise = null;
        console.error('Baseline seed failed:', error);
        throw new Error('Failed to initialize PEPTIVORA database.', { cause: error });
      }
    })();
  }
  await seedPromise;
}

export async function writeAuditLog(params: {
  actorUid: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: unknown;
  newState?: unknown;
  reason?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      actorUid: params.actorUid,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      previousStateJson: params.previousState ? JSON.stringify(params.previousState) : null,
      newStateJson: params.newState ? JSON.stringify(params.newState) : null,
      reason: params.reason ?? null,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    throw new Error('Failed to record audit entry.', { cause: error });
  }
}

export async function getOrCreateProfileWithRoles(
  uid: string,
  email: string,
  displayName: string | null,
  emailVerified: boolean
) {
  try {
    await ensureBaselineSeeded();

    await db
      .insert(profiles)
      .values({
        uid,
        email,
        displayName,
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: {
          email,
          displayName,
          updatedAt: new Date(),
        },
      });

    let roleRows = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userUid, uid));

    if (roleRows.length === 0) {
      const adminRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userRoles)
        .where(eq(userRoles.role, 'super_administrator'));

      const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
      const shouldBootstrap =
        emailVerified &&
        ((bootstrapEmail && email.toLowerCase() === bootstrapEmail) ||
          (adminRows[0]?.count ?? 0) === 0);

      const initialRole: AppRole = shouldBootstrap ? 'super_administrator' : 'customer';

      roleRows = await db
        .insert(userRoles)
        .values({
          userUid: uid,
          role: initialRole,
          grantedByUid: shouldBootstrap ? 'system-bootstrap' : uid,
        })
        .returning();

      if (shouldBootstrap) {
        await writeAuditLog({
          actorUid: uid,
          actorRole: initialRole,
          action: 'BOOTSTRAP_SUPER_ADMINISTRATOR',
          entityType: 'user_roles',
          entityId: uid,
          newState: { role: initialRole, email },
          reason: 'Initial verified account assigned super_administrator.',
        });
      }
    }

    const profileRow = (
      await db.select().from(profiles).where(eq(profiles.uid, uid)).limit(1)
    )[0];

    const roles = roleRows.map((r) => r.role as AppRole);
    const primaryRole =
      ROLE_PRECEDENCE.find((r) => roles.includes(r)) ?? 'customer';

    return {
      uid: profileRow.uid,
      email: profileRow.email,
      displayName: profileRow.displayName,
      kybStatus: profileRow.kybStatus,
      preferredLocale: profileRow.preferredLocale,
      roles,
      primaryRole,
    };
  } catch (error) {
    console.error('Database query failed in getOrCreateProfileWithRoles:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function getPublicCatalogData(divisionSlug?: string) {
  try {
    await ensureBaselineSeeded();

    const allDivisions = await db.select().from(divisions).orderBy(divisions.id);
    const visibleDivisions = new Map(
      allDivisions.filter((d) => d.catalogVisible).map((d) => [d.id, d])
    );

    const allCategories = await db.select().from(productCategories).orderBy(productCategories.id);
    const allClassifications = await db.select().from(productClassifications);
    const allSuppliers = await db.select().from(suppliers);
    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.publicationStatus, 'published'))
      .orderBy(products.id);

    const allApprovals = await db
      .select()
      .from(regulatoryApprovals)
      .orderBy(desc(regulatoryApprovals.createdAt));

    const allImages = await db.select().from(productImages).orderBy(productImages.sortOrder);
    const allVariants = await db.select().from(productVariants);
    const allInventory = await db.select().from(inventory);
    const allDocs = await db
      .select({
        id: productDocuments.id,
        productId: productDocuments.productId,
        docType: productDocuments.docType,
        title: productDocuments.title,
        fileName: productDocuments.fileName,
        sha256Hash: productDocuments.sha256Hash,
        verificationStatus: productDocuments.verificationStatus,
        createdAt: productDocuments.createdAt,
      })
      .from(productDocuments);

    const activeShipping = await db
      .select()
      .from(shippingMethods)
      .where(eq(shippingMethods.isActive, true));

    const approvedPublishedProducts = allProducts
      .filter((p) => {
        const div = visibleDivisions.get(p.divisionId);
        if (!div) return false;
        if (divisionSlug && div.slug !== divisionSlug) return false;

        const latestApproval = allApprovals.find((a) => a.productId === p.id);
        if (!latestApproval || latestApproval.status !== 'approved') return false;

        return isProductAvailableForPublicCatalog({
          publicationStatus: p.publicationStatus,
          approvalStatus: p.approvalStatus,
          latestApprovalExpiresAt: latestApproval.expiresAt,
        });
      })
      .map((p) => {
        const div = allDivisions.find((d) => d.id === p.divisionId)!;
        const cat = allCategories.find((c) => c.id === p.categoryId)!;
        const cls = allClassifications.find((c) => c.id === p.classificationId)!;
        const sup = allSuppliers.find((s) => s.id === p.supplierId)!;
        const approval = allApprovals.find((a) => a.productId === p.id)!;

        return {
          ...p,
          divisionSlug: div.slug,
          divisionNameDe: div.nameDe,
          divisionNameEn: div.nameEn,
          categorySlug: cat.slug,
          categoryNameDe: cat.nameDe,
          categoryNameEn: cat.nameEn,
          classificationCode: cls.code,
          classificationNameDe: cls.nameDe,
          classificationNameEn: cls.nameEn,
          supplierName: sup.name,
          approvalExpiresAt: approval.expiresAt,
          approvalJurisdiction: approval.jurisdiction,
          images: allImages.filter((i) => i.productId === p.id),
          variants: allVariants.filter((v) => v.productId === p.id),
          inventory: allInventory.filter((inv) => inv.productId === p.id),
          documents: allDocs.filter((d) => d.productId === p.id),
        };
      });

    const [
      seoPages,
      seoIntegrations,
      euPharmacyLogo,
      legalDocuments,
      businessProfile,
    ] = await Promise.all([
      getSiteSettingJson<SeoPageConfigDto[]>('seo_pages_config', DEFAULT_SEO_PAGES),
      getSiteSettingJson<SeoIntegrationsConfigDto>('seo_integrations_config', DEFAULT_SEO_INTEGRATIONS),
      getSiteSettingJson<EuPharmacyLogoConfigDto>('compliance_eu_pharmacy_logo', DEFAULT_EU_PHARMACY_LOGO_CONFIG),
      getSiteSettingJson<LegalDocumentsConfigDto>('compliance_legal_documents', DEFAULT_LEGAL_DOCUMENTS),
      getSiteSettingJson<BusinessComplianceProfileDto>('compliance_business_profile', DEFAULT_BUSINESS_PROFILE),
    ]);

    return {
      divisions: allDivisions,
      categories: allCategories,
      classifications: allClassifications,
      shippingMethods: activeShipping,
      paymentProviders: listPublicPaymentProviders(),
      products: approvedPublishedProducts,
      governance: {
        seoPages,
        seoIntegrations,
        euPharmacyLogo,
        legalDocuments,
        businessProfile,
      },
    };
  } catch (error) {
    console.error('Database query failed in getPublicCatalogData:', error);
    throw new Error('Failed to load catalog.', { cause: error });
  }
}

interface BlogEditorialMeta {
  tags: string[];
  referencesText: string;
  editorialReviewStatus: 'draft' | 'peer_reviewed' | 'published';
  seoTitleDe: string;
  seoTitleEn: string;
  seoDescriptionDe: string;
  seoDescriptionEn: string;
  updatedAt: string;
}

export async function getPublicBlogData(includeDrafts = false) {
  try {
    await ensureBaselineSeeded();
    const [cats, auths, allPosts, editorialMetaMap] = await Promise.all([
      db.select().from(blogCategories),
      db.select().from(authors),
      includeDrafts
        ? db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt))
        : db
            .select()
            .from(blogPosts)
            .where(eq(blogPosts.isPublished, true))
            .orderBy(desc(blogPosts.publishedAt)),
      getSiteSettingJson<Record<string, BlogEditorialMeta>>('blog_editorial_meta', {}),
    ]);

    const nowMs = Date.now();
    const visiblePosts = includeDrafts
      ? allPosts
      : allPosts.filter((p) => new Date(p.publishedAt).getTime() <= nowMs);

    return {
      categories: cats,
      authors: auths,
      posts: visiblePosts.map((post) => {
        const meta = editorialMetaMap[post.slug];
        return {
          ...post,
          tags: meta?.tags ?? ['Peptidanalytik', 'Qualitätskontrolle'],
          referencesText:
            meta?.referencesText ??
            'European Pharmacopoeia (Ph. Eur.) General Chapters; ICH Q2(R1) Validation of Analytical Procedures.',
          editorialReviewStatus: meta?.editorialReviewStatus ?? 'published',
          seoTitleDe: meta?.seoTitleDe ?? '',
          seoTitleEn: meta?.seoTitleEn ?? '',
          seoDescriptionDe: meta?.seoDescriptionDe ?? '',
          seoDescriptionEn: meta?.seoDescriptionEn ?? '',
          updatedAt: meta?.updatedAt ?? post.publishedAt.toISOString(),
          category: cats.find((c) => c.id === post.categoryId),
          author: auths.find((a) => a.id === post.authorId),
        };
      }),
    };
  } catch (error) {
    console.error('Database query failed in getPublicBlogData:', error);
    throw new Error('Failed to load blog content.', { cause: error });
  }
}

export async function recordContactMessage(input: {
  senderName: string;
  senderEmail: string;
  organization?: string;
  topic: string;
  message: string;
  locale: 'de' | 'en';
}) {
  try {
    const inserted = await db
      .insert(contactMessages)
      .values({
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        organization: input.organization || null,
        topic: input.topic,
        message: input.message,
        locale: input.locale,
      })
      .returning();

    await writeAuditLog({
      actorUid: null,
      actorRole: 'public_visitor',
      action: 'SUBMIT_CONTACT_MESSAGE',
      entityType: 'contact_messages',
      entityId: String(inserted[0].id),
      reason: `Contact inquiry received under topic '${input.topic}'.`,
    });

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in recordContactMessage:', error);
    throw new Error('Failed to record contact inquiry.', { cause: error });
  }
}

export async function subscribeNewsletter(email: string, locale: 'de' | 'en') {
  try {
    const normalized = email.trim().toLowerCase();
    const inserted = await db
      .insert(newsletterSubscribers)
      .values({
        email: normalized,
        locale,
        status: 'subscribed',
      })
      .onConflictDoUpdate({
        target: newsletterSubscribers.email,
        set: { locale, status: 'subscribed', consentRecordedAt: new Date() },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in subscribeNewsletter:', error);
    throw new Error('Failed to subscribe to newsletter.', { cause: error });
  }
}

export async function recordCookieConsent(params: {
  visitorSessionId: string;
  userUid: string | null;
  essentialCookies: boolean;
  functionalCookies: boolean;
  analyticsCookies: boolean;
  locale: 'de' | 'en';
}) {
  try {
    const inserted = await db.insert(consentRecords).values(params).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in recordCookieConsent:', error);
    throw new Error('Failed to save cookie consent record.', { cause: error });
  }
}

export async function validateCoupon(code: string, subtotalNetCents: number) {
  try {
    const rows = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.code, code.trim().toUpperCase()), eq(coupons.isActive, true)))
      .limit(1);

    if (rows.length === 0) {
      throw new DomainPolicyError('Coupon code not found or inactive.', 404);
    }
    const coupon = rows[0];
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= Date.now()) {
      throw new DomainPolicyError('Coupon code has expired.', 400);
    }
    if (subtotalNetCents < coupon.minSubtotalCents) {
      throw new DomainPolicyError('Order subtotal does not meet minimum requirement for this coupon.', 400);
    }
    return coupon;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in validateCoupon:', error);
    throw new Error('Failed to validate coupon.', { cause: error });
  }
}

export async function getCustomerAccountContext(uid: string) {
  try {
    await ensureBaselineSeeded();
    const [
      profileRows,
      roleRows,
      addrRows,
      orderRows,
      invoiceRows,
      shipmentRows,
      paymentRows,
      recentAuditRows,
    ] = await Promise.all([
      db.select().from(profiles).where(eq(profiles.uid, uid)).limit(1),
      db.select().from(userRoles).where(eq(userRoles.userUid, uid)),
      db.select().from(addresses).where(eq(addresses.userUid, uid)).orderBy(desc(addresses.createdAt)),
      db.select().from(orders).where(eq(orders.userUid, uid)).orderBy(desc(orders.createdAt)),
      db.select().from(invoices),
      db.select().from(shipments),
      db.select().from(paymentTransactions),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100),
    ]);

    const profile = profileRows[0] ?? null;
    const itemRows = orderRows.length > 0 ? await db.select().from(orderItems) : [];
    const orderNumberSet = new Set(orderRows.map((o) => o.orderNumber));

    const supportRows = profile?.email
      ? await db
          .select()
          .from(contactMessages)
          .where(eq(contactMessages.senderEmail, profile.email))
          .orderBy(desc(contactMessages.createdAt))
      : [];

    const notifications = recentAuditRows
      .filter((log) => log.entityId === uid || orderNumberSet.has(log.entityId))
      .slice(0, 20)
      .map((log) => ({
        id: log.id,
        action: log.action,
        entityId: log.entityId,
        message: log.reason || log.action,
        createdAt: log.createdAt,
      }));

    return {
      profile,
      roles: roleRows.map((r) => r.role as AppRole),
      addresses: addrRows,
      supportTickets: supportRows,
      notifications,
      orders: orderRows.map((o) => ({
        ...o,
        items: itemRows.filter((i) => i.orderId === o.id),
        invoice: invoiceRows.find((inv) => inv.orderId === o.id) ?? null,
        shipment: shipmentRows.find((s) => s.orderId === o.id) ?? null,
        paymentTransaction: paymentRows.find((p) => p.orderId === o.id) ?? null,
      })),
    };
  } catch (error) {
    console.error('Database query failed in getCustomerAccountContext:', error);
    throw new Error('Failed to load customer account.', { cause: error });
  }
}

export async function updateCustomerProfile(
  uid: string,
  actorRole: string,
  input: { displayName: string; phone?: string; preferredLocale: 'de' | 'en' }
) {
  try {
    const [updated] = await db
      .update(profiles)
      .set({
        displayName: input.displayName,
        phone: input.phone || null,
        preferredLocale: input.preferredLocale,
        updatedAt: new Date(),
      })
      .where(eq(profiles.uid, uid))
      .returning();

    await writeAuditLog({
      actorUid: uid,
      actorRole,
      action: 'UPDATE_CUSTOMER_PROFILE',
      entityType: 'profiles',
      entityId: uid,
      newState: input,
      reason: 'Customer updated account profile details.',
    });
    return updated;
  } catch (error) {
    console.error('Database query failed in updateCustomerProfile:', error);
    throw new Error('Failed to update profile.', { cause: error });
  }
}

export async function submitCustomerKyb(
  uid: string,
  actorRole: string,
  input: {
    organizationName: string;
    organizationType: string;
    vatId?: string;
    phone?: string;
  }
) {
  try {
    const updated = await db
      .update(profiles)
      .set({
        organizationName: input.organizationName,
        organizationType: input.organizationType,
        vatId: input.vatId || null,
        phone: input.phone || null,
        kybStatus: 'pending_review',
        updatedAt: new Date(),
      })
      .where(eq(profiles.uid, uid))
      .returning();

    await writeAuditLog({
      actorUid: uid,
      actorRole,
      action: 'SUBMIT_KYB_PROFILE',
      entityType: 'profiles',
      entityId: uid,
      newState: {
        organizationName: input.organizationName,
        organizationType: input.organizationType,
        kybStatus: 'pending_review',
      },
      reason: 'Customer submitted institutional KYB verification details.',
    });

    return updated[0];
  } catch (error) {
    console.error('Database query failed in submitCustomerKyb:', error);
    throw new Error('Failed to submit KYB profile.', { cause: error });
  }
}

export async function addCustomerAddress(
  uid: string,
  input: {
    label: string;
    recipientName: string;
    streetLine: string;
    postalCode: string;
    city: string;
    countryCode: string;
    isDefault: boolean;
  }
) {
  try {
    const inserted = await db
      .insert(addresses)
      .values({ userUid: uid, ...input })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in addCustomerAddress:', error);
    throw new Error('Failed to save address.', { cause: error });
  }
}

export async function deleteCustomerAddress(uid: string, addressId: number) {
  try {
    await db
      .delete(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userUid, uid)));
  } catch (error) {
    console.error('Database query failed in deleteCustomerAddress:', error);
    throw new Error('Failed to remove address.', { cause: error });
  }
}

export async function createDivisionOrder(
  userUid: string,
  userRolesList: AppRole[],
  input: {
    divisionSlug: 'research' | 'pharmaceutical';
    shippingMethodId: number;
    shippingAddressId?: number | null;
    couponCode?: string;
    paymentProvider?: string;
    paymentToken?: string;
    items: { productId: number; quantity: number }[];
    ruoNonHumanUseAttested: boolean;
    billingName: string;
    billingVatId?: string;
    billingAddress: string;
  }
) {
  try {
    await ensureBaselineSeeded();

    const divRows = await db
      .select()
      .from(divisions)
      .where(eq(divisions.slug, input.divisionSlug))
      .limit(1);
    if (divRows.length === 0) {
      throw new DomainPolicyError('Division not found.', 404);
    }
    const divisionRow = divRows[0];

    const divState: DivisionState = {
      id: divisionRow.id,
      slug: divisionRow.slug as 'research' | 'pharmaceutical',
      nameDe: divisionRow.nameDe,
      nameEn: divisionRow.nameEn,
      descriptionDe: divisionRow.descriptionDe,
      descriptionEn: divisionRow.descriptionEn,
      catalogVisible: divisionRow.catalogVisible,
      transactionsEnabled: divisionRow.transactionsEnabled,
      pharmacyLicenseVerified: divisionRow.pharmacyLicenseVerified,
      distributionArrangementVerified: divisionRow.distributionArrangementVerified,
      productAuthorizationVerified: divisionRow.productAuthorizationVerified,
      dispensingWorkflowVerified: divisionRow.dispensingWorkflowVerified,
      verifiedByUid: divisionRow.verifiedByUid,
      verifiedAt: divisionRow.verifiedAt,
      notes: divisionRow.notes,
    };

    if (!canTransactDivision(divState)) {
      throw new DomainPolicyError(
        'Regulatory gate locked: transactions for this division are legally disabled.',
        403
      );
    }

    const profileRows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.uid, userUid))
      .limit(1);
    const profile = profileRows[0];
    const isStaff = userRolesList.some((r) =>
      ['super_administrator', 'regulatory_reviewer'].includes(r)
    );
    if (!isStaff && profile?.kybStatus !== 'verified') {
      throw new DomainPolicyError(
        'Institutional KYB verification must be approved before placing a Research order.',
        403
      );
    }

    if (input.divisionSlug === 'research' && !input.ruoNonHumanUseAttested) {
      throw new DomainPolicyError(
        'Mandatory Research-Use-Only non-human-use attestation is required.',
        400
      );
    }

    const shipRows = await db
      .select()
      .from(shippingMethods)
      .where(and(eq(shippingMethods.id, input.shippingMethodId), eq(shippingMethods.isActive, true)))
      .limit(1);
    if (shipRows.length === 0) {
      throw new DomainPolicyError('Selected shipping method is unavailable.', 400);
    }
    const shippingMethod = shipRows[0];

    return await db.transaction(async (tx) => {
      let subtotalNetCents = 0;
      const lineSnapshots: {
        productId: number;
        skuSnapshot: string;
        nameSnapshot: string;
        quantity: number;
        unitNetCents: number;
        vatRateBps: number;
      }[] = [];

      for (const reqItem of input.items) {
        const prodRows = await tx
          .select()
          .from(products)
          .where(eq(products.id, reqItem.productId))
          .limit(1);
        if (prodRows.length === 0) {
          throw new DomainPolicyError(`Product #${reqItem.productId} not found.`, 404);
        }
        const prod = prodRows[0];

        if (prod.divisionId !== divisionRow.id) {
          throw new DomainPolicyError(
            `Division isolation violation: ${prod.sku} belongs to a different division.`,
            400
          );
        }

        const latestApproval = (
          await tx
            .select()
            .from(regulatoryApprovals)
            .where(eq(regulatoryApprovals.productId, prod.id))
            .orderBy(desc(regulatoryApprovals.createdAt))
            .limit(1)
        )[0];

        if (
          !latestApproval ||
          latestApproval.status !== 'approved' ||
          !isProductAvailableForPublicCatalog({
            publicationStatus: prod.publicationStatus,
            approvalStatus: prod.approvalStatus,
            latestApprovalExpiresAt: latestApproval.expiresAt,
          }) ||
          !prod.pricePermitted
        ) {
          throw new DomainPolicyError(
            `Product ${prod.sku} lacks active, non-expired regulatory approval and cannot be transacted.`,
            403
          );
        }

        const invRows = await tx
          .select()
          .from(inventory)
          .where(eq(inventory.productId, prod.id))
          .limit(1);
        if (invRows.length === 0 || invRows[0].quantityOnHand < reqItem.quantity) {
          throw new DomainPolicyError(`Insufficient batch stock for ${prod.sku}.`, 409);
        }

        await tx
          .update(inventory)
          .set({
            quantityOnHand: invRows[0].quantityOnHand - reqItem.quantity,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, invRows[0].id));

        await tx.insert(inventoryMovements).values({
          inventoryId: invRows[0].id,
          movementType: 'order_dispatch',
          quantityDelta: -reqItem.quantity,
          actorUid: userUid,
        });

        subtotalNetCents += prod.priceNetCents * reqItem.quantity;
        lineSnapshots.push({
          productId: prod.id,
          skuSnapshot: prod.sku,
          nameSnapshot: prod.nameDe,
          quantity: reqItem.quantity,
          unitNetCents: prod.priceNetCents,
          vatRateBps: prod.vatRateBps,
        });
      }

      let couponId: number | null = null;
      let discountNetCents = 0;
      if (input.couponCode && input.couponCode.trim().length > 0) {
        const coupon = await validateCoupon(input.couponCode, subtotalNetCents);
        couponId = coupon.id;
        discountNetCents = Math.round((subtotalNetCents * coupon.discountPercent) / 100);
      }

      const discountedSubtotal = Math.max(0, subtotalNetCents - discountNetCents);
      const vatCalc = calculateGermanVat(
        discountedSubtotal + shippingMethod.priceNetCents,
        1,
        1900
      );

      const allClasses = await tx.select().from(productClassifications);
      const itemClassCodes: ProductClassificationCode[] = [];
      for (const reqItem of input.items) {
        const prod = (await tx.select().from(products).where(eq(products.id, reqItem.productId)).limit(1))[0];
        const cls = allClasses.find((c) => c.id === prod.classificationId);
        if (cls) itemClassCodes.push(cls.code as ProductClassificationCode);
      }

      let paymentAuth;
      try {
        paymentAuth = await authorizeDivisionPayment({
          providerId: input.paymentProvider || 'peptivora-sepa-invoice',
          divisionSlug: input.divisionSlug,
          classificationCodes: itemClassCodes,
          amountGrossCents: vatCalc.grossCents,
          currency: 'EUR',
          paymentToken: input.paymentToken,
          kybVerified: profile?.kybStatus === 'verified',
          isStaffOverride: isStaff,
        });
      } catch (payErr) {
        throw new DomainPolicyError(
          payErr instanceof Error ? payErr.message : 'Payment provider authorization failed.',
          403
        );
      }

      const orderNumber = `PEP-${new Date().getFullYear()}-${crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;

      const [insertedOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userUid,
          divisionId: divisionRow.id,
          shippingMethodId: shippingMethod.id,
          couponId,
          shippingAddressId: input.shippingAddressId ?? null,
          status:
            paymentAuth.status === 'authorized'
              ? 'authorized_for_fulfilment'
              : 'recorded_awaiting_settlement',
          ruoNonHumanUseAttestedAt: input.ruoNonHumanUseAttested ? new Date() : null,
          subtotalNetCents,
          discountNetCents,
          shippingNetCents: shippingMethod.priceNetCents,
          vatCents: vatCalc.vatCents,
          totalGrossCents: vatCalc.grossCents,
          currency: 'EUR',
          billingName: input.billingName,
          billingVatId: input.billingVatId || null,
          billingAddress: input.billingAddress,
          complianceSnapshotJson: JSON.stringify({
            division: input.divisionSlug,
            ruoNonHumanUseAttested: input.ruoNonHumanUseAttested,
            kybStatus: profile?.kybStatus ?? 'staff',
            paymentProvider: paymentAuth.providerId,
            capturedAt: new Date().toISOString(),
          }),
        })
        .returning();

      await tx.insert(orderItems).values(
        lineSnapshots.map((item) => ({
          orderId: insertedOrder.id,
          ...item,
        }))
      );

      await tx.insert(paymentTransactions).values({
        orderId: insertedOrder.id,
        provider: paymentAuth.providerId,
        method: paymentAuth.method,
        amountGrossCents: vatCalc.grossCents,
        currency: 'EUR',
        status: paymentAuth.status,
        externalRef: paymentAuth.externalRef,
      });

      await tx.insert(invoices).values({
        orderId: insertedOrder.id,
        invoiceNumber: `INV-${orderNumber}`,
        subtotalNetCents: discountedSubtotal + shippingMethod.priceNetCents,
        vatCents: vatCalc.vatCents,
        totalGrossCents: vatCalc.grossCents,
        currency: 'EUR',
      });

      await tx.insert(shipments).values({
        orderId: insertedOrder.id,
        shippingMethodId: shippingMethod.id,
        carrier: shippingMethod.nameEn,
        status: 'preparing',
      });

      // Clear user cart for this division if present
      const userCart = await tx
        .select()
        .from(carts)
        .where(and(eq(carts.userUid, userUid), eq(carts.divisionId, divisionRow.id)))
        .limit(1);
      if (userCart.length > 0) {
        await tx.delete(cartItems).where(eq(cartItems.cartId, userCart[0].id));
      }

      await tx.insert(auditLogs).values({
        actorUid: userUid,
        actorRole: userRolesList[0] ?? 'customer',
        action: 'CREATE_ORDER_AND_INVOICE',
        entityType: 'orders',
        entityId: insertedOrder.orderNumber,
        newStateJson: JSON.stringify({
          totalGrossCents: vatCalc.grossCents,
          itemCount: lineSnapshots.length,
        }),
        reason: 'Research division order recorded with German VAT invoice and attestation.',
      });

      return { ...insertedOrder, items: lineSnapshots };
    });
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in createDivisionOrder:', error);
    throw new Error('Failed to create order.', { cause: error });
  }
}

export async function getComplianceOverview() {
  try {
    await ensureBaselineSeeded();
    const [
      allDivs,
      allCats,
      allClasses,
      allSuppliers,
      allProducts,
      allImages,
      allInventory,
      allApprovals,
      allHistory,
      allDocs,
      allProfiles,
      allRoles,
      allOrders,
      allOrderItems,
      allPayments,
      allShipments,
      allInvoices,
      allContacts,
      allSubscribers,
      allAuditLogs,
    ] = await Promise.all([
      db.select().from(divisions).orderBy(divisions.id),
      db.select().from(productCategories),
      db.select().from(productClassifications),
      db.select().from(suppliers),
      db.select().from(products).orderBy(desc(products.updatedAt)),
      db.select().from(productImages).orderBy(productImages.sortOrder),
      db.select().from(inventory),
      db.select().from(regulatoryApprovals).orderBy(desc(regulatoryApprovals.createdAt)),
      db.select().from(approvalHistory).orderBy(desc(approvalHistory.createdAt)).limit(60),
      db
        .select({
          id: productDocuments.id,
          productId: productDocuments.productId,
          docType: productDocuments.docType,
          title: productDocuments.title,
          fileName: productDocuments.fileName,
          mimeType: productDocuments.mimeType,
          fileSizeBytes: productDocuments.fileSizeBytes,
          sha256Hash: productDocuments.sha256Hash,
          verificationStatus: productDocuments.verificationStatus,
          uploadedByUid: productDocuments.uploadedByUid,
          verifiedByUid: productDocuments.verifiedByUid,
          verifiedAt: productDocuments.verifiedAt,
          createdAt: productDocuments.createdAt,
        })
        .from(productDocuments)
        .orderBy(desc(productDocuments.createdAt)),
      db.select().from(profiles).orderBy(desc(profiles.createdAt)),
      db.select().from(userRoles),
      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(40),
      db.select().from(orderItems),
      db.select().from(paymentTransactions),
      db.select().from(shipments),
      db.select().from(invoices),
      db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(40),
      db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.consentRecordedAt)).limit(40),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(80),
    ]);

    const [
      blogData,
      seoPages,
      seoIntegrations,
      businessProfile,
      euPharmacyLogo,
      legalDocuments,
      productRegulatoryMatrix,
      productionChecklist,
    ] = await Promise.all([
      getPublicBlogData(true),
      getSiteSettingJson<SeoPageConfigDto[]>('seo_pages_config', DEFAULT_SEO_PAGES),
      getSiteSettingJson<SeoIntegrationsConfigDto>('seo_integrations_config', DEFAULT_SEO_INTEGRATIONS),
      getSiteSettingJson<BusinessComplianceProfileDto>('compliance_business_profile', DEFAULT_BUSINESS_PROFILE),
      getSiteSettingJson<EuPharmacyLogoConfigDto>('compliance_eu_pharmacy_logo', DEFAULT_EU_PHARMACY_LOGO_CONFIG),
      getSiteSettingJson<LegalDocumentsConfigDto>('compliance_legal_documents', DEFAULT_LEGAL_DOCUMENTS),
      getSiteSettingJson<ProductRegulatoryMatrixEntryDto[]>('compliance_product_matrix', []),
      getSiteSettingJson<ProductionReadinessChecklistDto>('production_readiness_checklist', DEFAULT_PRODUCTION_CHECKLIST),
    ]);

    return {
      divisions: allDivs,
      categories: allCats,
      classifications: allClasses,
      suppliers: allSuppliers,
      products: allProducts,
      images: allImages,
      inventory: allInventory,
      approvals: allApprovals,
      approvalHistory: allHistory,
      documents: allDocs,
      profiles: allProfiles.map((p) => ({
        ...p,
        roles: allRoles.filter((r) => r.userUid === p.uid).map((r) => r.role as AppRole),
      })),
      orders: allOrders.map((o) => ({
        ...o,
        items: allOrderItems.filter((i) => i.orderId === o.id),
        paymentTransaction: allPayments.find((p) => p.orderId === o.id) ?? null,
        shipment: allShipments.find((s) => s.orderId === o.id) ?? null,
        invoice: allInvoices.find((inv) => inv.orderId === o.id) ?? null,
      })),
      contactMessages: allContacts,
      newsletterSubscribers: allSubscribers,
      auditLogs: allAuditLogs,
      blogPosts: blogData.posts,
      blogCategories: blogData.categories,
      authors: blogData.authors,
      seoPages,
      seoIntegrations,
      businessProfile,
      euPharmacyLogo,
      legalDocuments,
      productRegulatoryMatrix,
      productionChecklist,
    };
  } catch (error) {
    console.error('Database query failed in getComplianceOverview:', error);
    throw new Error('Failed to load compliance overview.', { cause: error });
  }
}

export async function createProductDraft(
  actorUid: string,
  actorRole: string,
  input: {
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
    technicalSummaryDe?: string;
    technicalSummaryEn?: string;
    regulatoryNoticeDe: string;
    regulatoryNoticeEn: string;
    casNumber?: string;
    molecularFormula?: string;
    molecularWeight?: string;
    sequence?: string;
    storageCondition: string;
    pricePermitted: boolean;
    priceNetCents: number;
  }
) {
  try {
    const [divRow] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, input.divisionId))
      .limit(1);
    const [catRow] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, input.categoryId))
      .limit(1);
    if (!divRow || !catRow || catRow.divisionId !== divRow.id) {
      throw new DomainPolicyError(
        'Division isolation error: Category does not belong to the selected division.',
        400
      );
    }

    if (divRow.slug === 'research') {
      const claim = detectProhibitedMedicinalClaims([
        input.nameDe,
        input.nameEn,
        input.descriptionDe,
        input.descriptionEn,
        input.technicalSummaryDe,
        input.technicalSummaryEn,
      ]);
      if (claim) {
        throw new DomainPolicyError(
          `Prohibited medicinal claim detected ('${claim}') on Research-Use-Only draft.`,
          400
        );
      }
    }

    const [inserted] = await db
      .insert(products)
      .values({
        ...input,
        technicalSummaryDe: input.technicalSummaryDe || null,
        technicalSummaryEn: input.technicalSummaryEn || null,
        casNumber: input.casNumber || null,
        molecularFormula: input.molecularFormula || null,
        molecularWeight: input.molecularWeight || null,
        sequence: input.sequence || null,
        stockStatus: 'in_stock',
        publicationStatus: 'unpublished',
        approvalStatus: 'draft',
        isDemonstrationRecord: true,
        createdByUid: actorUid,
      })
      .returning();

    await db.insert(productImages).values({
      productId: inserted.id,
      imageUrl: '/src/assets/images/product_lyophilized_vial_1794861146550.jpg',
      altDe: inserted.nameDe,
      altEn: inserted.nameEn,
      sortOrder: 0,
    });

    await db.insert(inventory).values({
      productId: inserted.id,
      batchNumber: `LOT-${inserted.sku}-01`,
      quantityOnHand: 20,
      reservedQuantity: 0,
    });

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'CREATE_PRODUCT_DRAFT',
      entityType: 'products',
      entityId: String(inserted.id),
      newState: { sku: inserted.sku, approvalStatus: 'draft', publicationStatus: 'unpublished' },
      reason: 'Created unpublished draft product.',
    });

    return inserted;
  } catch (error) {
    console.error('Database query failed in createProductDraft:', error);
    throw new Error('Failed to create product draft.', { cause: error });
  }
}

export async function submitProductApproval(
  actorUid: string,
  actorRole: string,
  input: {
    productId: number;
    supportingEvidence: string;
    jurisdiction: string;
    approvalScope: string;
  }
) {
  try {
    const prodRows = await db
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);
    if (prodRows.length === 0) {
      throw new DomainPolicyError('Product not found.', 404);
    }

    const [updatedProd] = await db
      .update(products)
      .set({
        approvalStatus: 'under_regulatory_review',
        publicationStatus: 'unpublished',
        updatedAt: new Date(),
      })
      .where(eq(products.id, input.productId))
      .returning();

    const [approval] = await db
      .insert(regulatoryApprovals)
      .values({
        productId: input.productId,
        submittedByUid: actorUid,
        status: 'under_regulatory_review',
        supportingEvidence: input.supportingEvidence,
        jurisdiction: input.jurisdiction,
        approvalScope: input.approvalScope,
      })
      .returning();

    await db.insert(approvalHistory).values({
      regulatoryApprovalId: approval.id,
      productId: input.productId,
      actorUid,
      previousStatus: prodRows[0].approvalStatus,
      nextStatus: 'under_regulatory_review',
      notes: input.supportingEvidence,
    });

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'SUBMIT_REGULATORY_REVIEW',
      entityType: 'products',
      entityId: String(input.productId),
      newState: { approvalStatus: 'under_regulatory_review' },
      reason: input.supportingEvidence,
    });

    return { product: updatedProd, approval };
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in submitProductApproval:', error);
    throw new Error('Failed to submit product for regulatory review.', { cause: error });
  }
}

export async function decideProductApproval(
  reviewerUid: string,
  reviewerRole: string,
  input: {
    productId: number;
    status: 'draft' | 'submitted_for_review' | 'under_regulatory_review' | 'approved' | 'rejected' | 'suspended' | 'expired';
    supportingEvidence: string;
    jurisdiction: string;
    approvalScope: string;
    expiresAt?: string;
    amgScreened: boolean;
    hwgScreened: boolean;
    chemgScreened: boolean;
    ruoIndependentlyVerified: boolean;
    publishImmediately: boolean;
    notes: string;
  }
) {
  try {
    const prodRows = await db
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);
    if (prodRows.length === 0) {
      throw new DomainPolicyError('Product not found.', 404);
    }
    const prod = prodRows[0];

    const latestApproval = (
      await db
        .select()
        .from(regulatoryApprovals)
        .where(eq(regulatoryApprovals.productId, prod.id))
        .orderBy(desc(regulatoryApprovals.createdAt))
        .limit(1)
    )[0];

    const submitter = latestApproval?.submittedByUid ?? prod.createdByUid;
    if (input.status === 'approved' && submitter === reviewerUid) {
      throw new DomainPolicyError(
        'Separation of duties violation: submitter cannot self-approve a regulatory review.',
        403
      );
    }

    if (input.status === 'approved') {
      if (!input.amgScreened || !input.hwgScreened || !input.chemgScreened) {
        throw new DomainPolicyError(
          'AMG, HWG, and ChemG screenings must all be verified before approval.',
          400
        );
      }
      if (prod.manufacturerRuoLabeled && !input.ruoIndependentlyVerified) {
        throw new DomainPolicyError(
          'Manufacturer RUO label is not an automatic exemption; independent verification required.',
          400
        );
      }
    }

    const expiryDate = input.expiresAt ? new Date(input.expiresAt) : null;
    const isExpired = expiryDate !== null && expiryDate.getTime() <= Date.now();
    const effectiveStatus = isExpired ? 'expired' : input.status;
    const publishState =
      effectiveStatus === 'approved' && input.publishImmediately
        ? 'published'
        : 'unpublished';

    const [updatedProd] = await db
      .update(products)
      .set({
        approvalStatus: effectiveStatus,
        publicationStatus: publishState,
        updatedAt: new Date(),
      })
      .where(eq(products.id, prod.id))
      .returning();

    const [approval] = await db
      .insert(regulatoryApprovals)
      .values({
        productId: prod.id,
        submittedByUid: submitter,
        reviewerUid,
        reviewDate: new Date(),
        status: effectiveStatus,
        supportingEvidence: input.supportingEvidence,
        jurisdiction: input.jurisdiction,
        expiresAt: expiryDate,
        approvalScope: input.approvalScope,
        amgScreened: input.amgScreened,
        hwgScreened: input.hwgScreened,
        chemgScreened: input.chemgScreened,
        ruoIndependentlyVerified: input.ruoIndependentlyVerified,
      })
      .returning();

    await db.insert(approvalHistory).values({
      regulatoryApprovalId: approval.id,
      productId: prod.id,
      actorUid: reviewerUid,
      previousStatus: prod.approvalStatus,
      nextStatus: effectiveStatus,
      notes: input.notes,
    });

    await writeAuditLog({
      actorUid: reviewerUid,
      actorRole: reviewerRole,
      action: 'DECIDE_REGULATORY_APPROVAL',
      entityType: 'products',
      entityId: String(prod.id),
      previousState: { approvalStatus: prod.approvalStatus, publicationStatus: prod.publicationStatus },
      newState: { approvalStatus: effectiveStatus, publicationStatus: publishState },
      reason: input.notes,
    });

    return { product: updatedProd, approval };
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in decideProductApproval:', error);
    throw new Error('Failed to record approval decision.', { cause: error });
  }
}

export async function reviewCustomerKyb(
  reviewerUid: string,
  reviewerRole: string,
  targetUid: string,
  input: { kybStatus: 'verified' | 'rejected' | 'revoked'; notes: string }
) {
  try {
    const existing = await db
      .select()
      .from(profiles)
      .where(eq(profiles.uid, targetUid))
      .limit(1);
    if (existing.length === 0) {
      throw new DomainPolicyError('Profile not found.', 404);
    }

    const [updated] = await db
      .update(profiles)
      .set({ kybStatus: input.kybStatus, updatedAt: new Date() })
      .where(eq(profiles.uid, targetUid))
      .returning();

    await writeAuditLog({
      actorUid: reviewerUid,
      actorRole: reviewerRole,
      action: 'REVIEW_CUSTOMER_KYB',
      entityType: 'profiles',
      entityId: targetUid,
      previousState: { kybStatus: existing[0].kybStatus },
      newState: { kybStatus: input.kybStatus },
      reason: input.notes,
    });

    return updated;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in reviewCustomerKyb:', error);
    throw new Error('Failed to review customer KYB.', { cause: error });
  }
}

export async function updatePharmaceuticalDivisionGate(
  reviewerUid: string,
  reviewerRole: string,
  input: {
    catalogVisible: boolean;
    transactionsEnabled: boolean;
    pharmacyLicenseVerified: boolean;
    distributionArrangementVerified: boolean;
    productAuthorizationVerified: boolean;
    dispensingWorkflowVerified: boolean;
    notes: string;
  }
) {
  try {
    if (
      input.transactionsEnabled &&
      !hasAllPharmaceuticalPrerequisites({
        pharmacyLicenseVerified: input.pharmacyLicenseVerified,
        distributionArrangementVerified: input.distributionArrangementVerified,
        productAuthorizationVerified: input.productAuthorizationVerified,
        dispensingWorkflowVerified: input.dispensingWorkflowVerified,
      })
    ) {
      throw new DomainPolicyError(
        'Pharmaceutical transactions cannot be enabled until all four German statutory prerequisites are independently verified.',
        403
      );
    }

    const [updated] = await db
      .update(divisions)
      .set({
        catalogVisible: input.catalogVisible,
        transactionsEnabled: input.transactionsEnabled,
        pharmacyLicenseVerified: input.pharmacyLicenseVerified,
        distributionArrangementVerified: input.distributionArrangementVerified,
        productAuthorizationVerified: input.productAuthorizationVerified,
        dispensingWorkflowVerified: input.dispensingWorkflowVerified,
        verifiedByUid: reviewerUid,
        verifiedAt: new Date(),
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(divisions.slug, 'pharmaceutical'))
      .returning();

    await writeAuditLog({
      actorUid: reviewerUid,
      actorRole: reviewerRole,
      action: 'UPDATE_PHARMACEUTICAL_GATE',
      entityType: 'divisions',
      entityId: 'pharmaceutical',
      newState: input,
      reason: input.notes,
    });

    return updated;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in updatePharmaceuticalDivisionGate:', error);
    throw new Error('Failed to update pharmaceutical gate.', { cause: error });
  }
}

export async function uploadProductDocument(
  actorUid: string,
  actorRole: string,
  input: {
    productId?: number | null;
    docType: string;
    title: string;
    fileName: string;
    mimeType: string;
    contentBase64: string;
  }
) {
  try {
    const cleanBase64 = input.contentBase64.includes(',')
      ? input.contentBase64.split(',')[1]
      : input.contentBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');
    if (buffer.length === 0 || buffer.length > 1_500_000) {
      throw new DomainPolicyError('Document payload must be between 1 byte and 1.5 MB.', 400);
    }

    const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

    const [inserted] = await db
      .insert(productDocuments)
      .values({
        productId: input.productId ?? null,
        docType: input.docType,
        title: input.title,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: buffer.length,
        sha256Hash,
        contentBase64: cleanBase64,
        verificationStatus: 'pending_review',
        uploadedByUid: actorUid,
      })
      .returning({
        id: productDocuments.id,
        productId: productDocuments.productId,
        docType: productDocuments.docType,
        title: productDocuments.title,
        fileName: productDocuments.fileName,
        sha256Hash: productDocuments.sha256Hash,
        verificationStatus: productDocuments.verificationStatus,
        createdAt: productDocuments.createdAt,
      });

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'UPLOAD_PRODUCT_DOCUMENT',
      entityType: 'product_documents',
      entityId: String(inserted.id),
      newState: { docType: input.docType, sha256Hash },
      reason: `Stored ${input.fileName} pending compliance verification.`,
    });

    return inserted;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in uploadProductDocument:', error);
    throw new Error('Failed to store document.', { cause: error });
  }
}

export async function verifyProductDocument(
  reviewerUid: string,
  reviewerRole: string,
  docId: number,
  status: 'verified' | 'rejected' | 'revoked'
) {
  try {
    const rows = await db
      .select()
      .from(productDocuments)
      .where(eq(productDocuments.id, docId))
      .limit(1);
    if (rows.length === 0) {
      throw new DomainPolicyError('Document not found.', 404);
    }
    if (status === 'verified' && rows[0].uploadedByUid === reviewerUid) {
      throw new DomainPolicyError(
        'Separation of duties violation: uploader cannot self-verify document.',
        403
      );
    }

    const [updated] = await db
      .update(productDocuments)
      .set({
        verificationStatus: status,
        verifiedByUid: reviewerUid,
        verifiedAt: new Date(),
      })
      .where(eq(productDocuments.id, docId))
      .returning({
        id: productDocuments.id,
        verificationStatus: productDocuments.verificationStatus,
      });

    await writeAuditLog({
      actorUid: reviewerUid,
      actorRole: reviewerRole,
      action: 'VERIFY_PRODUCT_DOCUMENT',
      entityType: 'product_documents',
      entityId: String(docId),
      newState: { verificationStatus: status },
      reason: `Document #${docId} marked ${status}.`,
    });

    return updated;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in verifyProductDocument:', error);
    throw new Error('Failed to verify document.', { cause: error });
  }
}

export async function getAuthorizedDocumentForDownload(
  docId: number,
  userUid: string,
  userRolesList: AppRole[]
) {
  try {
    const rows = await db
      .select()
      .from(productDocuments)
      .where(eq(productDocuments.id, docId))
      .limit(1);
    if (rows.length === 0) {
      throw new DomainPolicyError('Document not found.', 404);
    }
    const doc = rows[0];
    const isStaff = userRolesList.some((r) =>
      ['super_administrator', 'regulatory_reviewer', 'product_manager'].includes(r)
    );
    if (!isStaff && doc.uploadedByUid !== userUid) {
      const profile = (
        await db.select().from(profiles).where(eq(profiles.uid, userUid)).limit(1)
      )[0];
      if (doc.verificationStatus !== 'verified' || profile?.kybStatus !== 'verified') {
        throw new DomainPolicyError(
          'Forbidden: Verified institutional KYB or compliance privileges required.',
          403
        );
      }
    }
    return doc;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in getAuthorizedDocumentForDownload:', error);
    throw new Error('Failed to load document.', { cause: error });
  }
}

export async function assignUserRole(
  actorUid: string,
  actorRole: string,
  targetUid: string,
  nextRole: AppRole
) {
  try {
    if (targetUid === actorUid && nextRole !== 'super_administrator') {
      throw new DomainPolicyError('Cannot strip own super_administrator privilege.', 400);
    }
    const target = await db
      .select()
      .from(profiles)
      .where(eq(profiles.uid, targetUid))
      .limit(1);
    if (target.length === 0) {
      throw new DomainPolicyError('Target profile not found.', 404);
    }

    await db.delete(userRoles).where(eq(userRoles.userUid, targetUid));
    const [inserted] = await db
      .insert(userRoles)
      .values({
        userUid: targetUid,
        role: nextRole,
        grantedByUid: actorUid,
      })
      .returning();

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'ASSIGN_USER_ROLE',
      entityType: 'user_roles',
      entityId: targetUid,
      newState: { role: nextRole },
      reason: `Role updated by ${actorRole}.`,
    });

    return inserted;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in assignUserRole:', error);
    throw new Error('Failed to assign role.', { cause: error });
  }
}

export async function updateProductMetadata(
  actorUid: string,
  actorRole: string,
  productId: number,
  input: {
    divisionId?: number;
    categoryId: number;
    manufacturerName: string;
    nameDe: string;
    nameEn: string;
    descriptionDe: string;
    descriptionEn: string;
    technicalSummaryDe?: string;
    technicalSummaryEn?: string;
    regulatoryNoticeDe: string;
    regulatoryNoticeEn: string;
    casNumber?: string;
    molecularFormula?: string;
    molecularWeight?: string;
    sequence?: string;
    storageCondition: string;
    pricePermitted: boolean;
    priceNetCents: number;
  }
) {
  try {
    const existingRows = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (existingRows.length === 0) {
      throw new DomainPolicyError('Product not found.', 404);
    }
    const existing = existingRows[0];

    // Regulatory guard: Never convert Research <-> Pharmaceutical by divisionId or categoryId reassignment
    if (input.divisionId && input.divisionId !== existing.divisionId) {
      throw new DomainPolicyError(
        'Regulatory lock: A product cannot be converted between Research and Pharmaceutical divisions.',
        403
      );
    }

    const catRow = (
      await db
        .select()
        .from(productCategories)
        .where(eq(productCategories.id, input.categoryId))
        .limit(1)
    )[0];
    if (!catRow || catRow.divisionId !== existing.divisionId) {
      throw new DomainPolicyError(
        'Division isolation violation: Category change cannot move a research product into a medicinal category.',
        403
      );
    }

    const divRow = (
      await db.select().from(divisions).where(eq(divisions.id, existing.divisionId)).limit(1)
    )[0];
    if (divRow?.slug === 'research') {
      const claim = detectProhibitedMedicinalClaims([
        input.nameDe,
        input.nameEn,
        input.descriptionDe,
        input.descriptionEn,
        input.technicalSummaryDe,
        input.technicalSummaryEn,
      ]);
      if (claim) {
        throw new DomainPolicyError(
          `Medicinal claims ('${claim}') are strictly prohibited on Research-Use-Only product pages.`,
          400
        );
      }
    }

    const [updated] = await db
      .update(products)
      .set({
        categoryId: input.categoryId,
        manufacturerName: input.manufacturerName,
        nameDe: input.nameDe,
        nameEn: input.nameEn,
        descriptionDe: input.descriptionDe,
        descriptionEn: input.descriptionEn,
        technicalSummaryDe: input.technicalSummaryDe || null,
        technicalSummaryEn: input.technicalSummaryEn || null,
        regulatoryNoticeDe: input.regulatoryNoticeDe,
        regulatoryNoticeEn: input.regulatoryNoticeEn,
        casNumber: input.casNumber || null,
        molecularFormula: input.molecularFormula || null,
        molecularWeight: input.molecularWeight || null,
        sequence: input.sequence || null,
        storageCondition: input.storageCondition,
        pricePermitted: input.pricePermitted,
        priceNetCents: input.priceNetCents,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'UPDATE_PRODUCT_METADATA',
      entityType: 'products',
      entityId: String(productId),
      previousState: { nameDe: existing.nameDe, priceNetCents: existing.priceNetCents, categoryId: existing.categoryId },
      newState: { nameDe: updated.nameDe, priceNetCents: updated.priceNetCents, categoryId: updated.categoryId },
      reason: 'Updated product metadata and specifications.',
    });

    return updated;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in updateProductMetadata:', error);
    throw new Error('Failed to update product.', { cause: error });
  }
}

export async function addProductImageRecord(
  actorUid: string,
  actorRole: string,
  productId: number,
  input: { imageUrl: string; altDe: string; altEn: string; sortOrder: number }
) {
  try {
    const [inserted] = await db
      .insert(productImages)
      .values({ productId, ...input })
      .returning();

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'ADD_PRODUCT_IMAGE',
      entityType: 'product_images',
      entityId: String(inserted.id),
      newState: { productId, altEn: input.altEn },
      reason: 'Attached product image.',
    });
    return inserted;
  } catch (error) {
    console.error('Database query failed in addProductImageRecord:', error);
    throw new Error('Failed to add product image.', { cause: error });
  }
}

export async function adjustProductInventory(
  actorUid: string,
  actorRole: string,
  productId: number,
  input: {
    batchNumber: string;
    quantityOnHand: number;
    expiresAt?: string;
    stockStatus: string;
    reason: string;
  }
) {
  try {
    const invRows = await db
      .select()
      .from(inventory)
      .where(eq(inventory.productId, productId))
      .limit(1);

    let invId: number;
    let delta = input.quantityOnHand;

    if (invRows.length > 0) {
      invId = invRows[0].id;
      delta = input.quantityOnHand - invRows[0].quantityOnHand;
      await db
        .update(inventory)
        .set({
          batchNumber: input.batchNumber,
          quantityOnHand: input.quantityOnHand,
          expiresAt: input.expiresAt || null,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, invId));
    } else {
      const [insertedInv] = await db
        .insert(inventory)
        .values({
          productId,
          batchNumber: input.batchNumber,
          quantityOnHand: input.quantityOnHand,
          reservedQuantity: 0,
          expiresAt: input.expiresAt || null,
        })
        .returning();
      invId = insertedInv.id;
    }

    await db.insert(inventoryMovements).values({
      inventoryId: invId,
      movementType: 'manual_adjustment',
      quantityDelta: delta,
      actorUid,
    });

    const [updatedProd] = await db
      .update(products)
      .set({ stockStatus: input.stockStatus, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'ADJUST_PRODUCT_INVENTORY',
      entityType: 'inventory',
      entityId: String(productId),
      newState: { batchNumber: input.batchNumber, quantityOnHand: input.quantityOnHand, stockStatus: input.stockStatus },
      reason: input.reason,
    });

    return updatedProd;
  } catch (error) {
    console.error('Database query failed in adjustProductInventory:', error);
    throw new Error('Failed to adjust inventory.', { cause: error });
  }
}

export async function suspendProductListing(
  actorUid: string,
  actorRole: string,
  productId: number,
  reason: string
) {
  try {
    const prod = (await db.select().from(products).where(eq(products.id, productId)).limit(1))[0];
    if (!prod) throw new DomainPolicyError('Product not found.', 404);

    const [updated] = await db
      .update(products)
      .set({
        approvalStatus: 'suspended',
        publicationStatus: 'unpublished',
        stockStatus: 'gated',
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    const latestApp = (
      await db
        .select()
        .from(regulatoryApprovals)
        .where(eq(regulatoryApprovals.productId, productId))
        .orderBy(desc(regulatoryApprovals.createdAt))
        .limit(1)
    )[0];

    if (latestApp) {
      await db.insert(approvalHistory).values({
        regulatoryApprovalId: latestApp.id,
        productId,
        actorUid,
        previousStatus: prod.approvalStatus,
        nextStatus: 'suspended',
        notes: reason,
      });
    }

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'SUSPEND_PRODUCT_LISTING',
      entityType: 'products',
      entityId: String(productId),
      previousState: { approvalStatus: prod.approvalStatus, publicationStatus: prod.publicationStatus },
      newState: { approvalStatus: 'suspended', publicationStatus: 'unpublished' },
      reason,
    });

    return updated;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in suspendProductListing:', error);
    throw new Error('Failed to suspend product.', { cause: error });
  }
}

export async function cancelCustomerOrder(
  actorUid: string,
  roles: AppRole[],
  orderId: number,
  reason: string
) {
  try {
    const isOrderManager = roles.some((r) => ['order_manager', 'super_administrator'].includes(r));
    const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    if (!order) throw new DomainPolicyError('Order not found.', 404);
    if (!isOrderManager && order.userUid !== actorUid) {
      throw new DomainPolicyError('Forbidden: cannot cancel another customer order.', 403);
    }
    if (!['recorded_awaiting_settlement', 'authorized_for_fulfilment', 'compliance_hold'].includes(order.status)) {
      throw new DomainPolicyError(
        `Order in status '${order.status}' can no longer be cancelled directly; submit a refund request instead.`,
        409
      );
    }

    return await db.transaction(async (tx) => {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const item of items) {
        const inv = (await tx.select().from(inventory).where(eq(inventory.productId, item.productId)).limit(1))[0];
        if (inv) {
          await tx
            .update(inventory)
            .set({ quantityOnHand: inv.quantityOnHand + item.quantity, updatedAt: new Date() })
            .where(eq(inventory.id, inv.id));
          await tx.insert(inventoryMovements).values({
            inventoryId: inv.id,
            movementType: 'order_cancellation',
            quantityDelta: item.quantity,
            referenceId: order.orderNumber,
            actorUid,
          });
        }
      }

      const [updated] = await tx
        .update(orders)
        .set({ status: 'cancelled' })
        .where(eq(orders.id, order.id))
        .returning();

      await tx.update(shipments).set({ status: 'cancelled' }).where(eq(shipments.orderId, order.id));
      await tx
        .update(paymentTransactions)
        .set({ status: 'voided' })
        .where(eq(paymentTransactions.orderId, order.id));

      await tx.insert(auditLogs).values({
        actorUid,
        actorRole: roles[0] ?? 'customer',
        action: 'ORDER_CANCELLED',
        entityType: 'orders',
        entityId: order.orderNumber,
        previousStateJson: JSON.stringify({ status: order.status }),
        newStateJson: JSON.stringify({ status: 'cancelled' }),
        reason: `Order ${order.orderNumber} cancelled (${reason}). Inventory restocked.`,
      });

      return updated;
    });
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in cancelCustomerOrder:', error);
    throw new Error('Failed to cancel order.', { cause: error });
  }
}

export async function requestOrderRefund(
  actorUid: string,
  roles: AppRole[],
  orderId: number,
  reason: string
) {
  try {
    const isOrderManager = roles.some((r) => ['order_manager', 'super_administrator'].includes(r));
    const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    if (!order) throw new DomainPolicyError('Order not found.', 404);
    if (!isOrderManager && order.userUid !== actorUid) {
      throw new DomainPolicyError('Forbidden.', 403);
    }
    if (order.status === 'cancelled' || order.status === 'refunded') {
      throw new DomainPolicyError(`Order is already ${order.status}.`, 409);
    }

    const [updated] = await db
      .update(orders)
      .set({ status: 'refund_requested' })
      .where(eq(orders.id, order.id))
      .returning();

    await writeAuditLog({
      actorUid,
      actorRole: roles[0] ?? 'customer',
      action: 'ORDER_REFUND_REQUESTED',
      entityType: 'orders',
      entityId: order.orderNumber,
      previousState: { status: order.status },
      newState: { status: 'refund_requested' },
      reason: `Refund requested for ${order.orderNumber}: ${reason}`,
    });

    return updated;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in requestOrderRefund:', error);
    throw new Error('Failed to request refund.', { cause: error });
  }
}

export async function decideOrderRefund(
  actorUid: string,
  actorRole: string,
  orderId: number,
  decision: 'approved' | 'rejected',
  notes: string
) {
  try {
    const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    if (!order) throw new DomainPolicyError('Order not found.', 404);

    const payment = (
      await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.orderId, order.id))
        .limit(1)
    )[0];

    let nextOrderStatus = 'refund_rejected';
    if (decision === 'approved') {
      const rfResult = await processDivisionRefund({
        providerId: payment?.provider ?? 'peptivora-sepa-invoice',
        externalRef: payment?.externalRef ?? null,
        amountGrossCents: order.totalGrossCents,
        reason: notes,
      });
      nextOrderStatus = 'refunded';
      if (payment) {
        await db
          .update(paymentTransactions)
          .set({ status: rfResult.status, externalRef: rfResult.refundRef })
          .where(eq(paymentTransactions.id, payment.id));
      }
    }

    const [updated] = await db
      .update(orders)
      .set({ status: nextOrderStatus })
      .where(eq(orders.id, order.id))
      .returning();

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'ORDER_REFUND_DECISION',
      entityType: 'orders',
      entityId: order.orderNumber,
      newState: { status: nextOrderStatus },
      reason: `Refund ${decision} for ${order.orderNumber}: ${notes}`,
    });

    return updated;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in decideOrderRefund:', error);
    throw new Error('Failed to process refund decision.', { cause: error });
  }
}

/**
 * Revalidates product approval, inventory, division gate, and customer KYB eligibility
 * IMMEDIATELY BEFORE order fulfilment.
 */
export async function fulfilDivisionOrder(
  actorUid: string,
  actorRole: string,
  orderId: number,
  input: {
    status: 'processing' | 'fulfilled' | 'shipped' | 'delivered';
    carrier: string;
    trackingNumber?: string;
    notes: string;
  }
) {
  try {
    const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    if (!order) throw new DomainPolicyError('Order not found.', 404);
    if (['cancelled', 'refunded'].includes(order.status)) {
      throw new DomainPolicyError(`Cannot fulfil an order in status '${order.status}'.`, 409);
    }

    // 1. Revalidate division gate
    const divRow = (
      await db.select().from(divisions).where(eq(divisions.id, order.divisionId)).limit(1)
    )[0];
    if (!divRow || !canTransactDivision(divRow as unknown as DivisionState)) {
      await db.update(orders).set({ status: 'compliance_hold' }).where(eq(orders.id, order.id));
      await writeAuditLog({
        actorUid,
        actorRole,
        action: 'FULFILMENT_BLOCKED_DIVISION_GATE',
        entityType: 'orders',
        entityId: order.orderNumber,
        reason: 'Pre-fulfilment revalidation failed: Division gate disabled.',
      });
      throw new DomainPolicyError('Fulfilment blocked: Division transaction gate is disabled.', 403);
    }

    // 2. Revalidate customer eligibility (KYB must still be verified, unless customer holds staff override role)
    const custProfile = (
      await db.select().from(profiles).where(eq(profiles.uid, order.userUid)).limit(1)
    )[0];
    const custRoles = await db.select().from(userRoles).where(eq(userRoles.userUid, order.userUid));
    const isStaffCust = custRoles.some((r) =>
      ['super_administrator', 'regulatory_reviewer'].includes(r.role)
    );
    if (!isStaffCust && custProfile?.kybStatus !== 'verified') {
      await db.update(orders).set({ status: 'compliance_hold' }).where(eq(orders.id, order.id));
      await writeAuditLog({
        actorUid,
        actorRole,
        action: 'FULFILMENT_BLOCKED_KYB',
        entityType: 'orders',
        entityId: order.orderNumber,
        reason: `Pre-fulfilment revalidation failed: Customer KYB status is '${custProfile?.kybStatus ?? 'missing'}'.`,
      });
      throw new DomainPolicyError(
        'Fulfilment blocked: Customer KYB verification is no longer verified.',
        403
      );
    }

    // 3. Revalidate every ordered product's current approval, publication & non-expiry status
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    for (const item of items) {
      const prod = (
        await db.select().from(products).where(eq(products.id, item.productId)).limit(1)
      )[0];
      const latestApp = (
        await db
          .select()
          .from(regulatoryApprovals)
          .where(eq(regulatoryApprovals.productId, item.productId))
          .orderBy(desc(regulatoryApprovals.createdAt))
          .limit(1)
      )[0];

      if (
        !prod ||
        !latestApp ||
        latestApp.status !== 'approved' ||
        !isProductAvailableForPublicCatalog({
          publicationStatus: prod.publicationStatus,
          approvalStatus: prod.approvalStatus,
          latestApprovalExpiresAt: latestApp.expiresAt,
        })
      ) {
        await db.update(orders).set({ status: 'compliance_hold' }).where(eq(orders.id, order.id));
        await writeAuditLog({
          actorUid,
          actorRole,
          action: 'FULFILMENT_BLOCKED_PRODUCT_APPROVAL',
          entityType: 'orders',
          entityId: order.orderNumber,
          reason: `Pre-fulfilment revalidation blocked: ${item.skuSnapshot} approval status is '${prod?.approvalStatus ?? 'missing'}'.`,
        });
        throw new DomainPolicyError(
          `Fulfilment blocked: Product ${item.skuSnapshot} failed pre-fulfilment approval revalidation.`,
          409
        );
      }
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({ status: input.status })
      .where(eq(orders.id, order.id))
      .returning();

    await db
      .update(shipments)
      .set({
        carrier: input.carrier,
        trackingNumber: input.trackingNumber || null,
        status: input.status === 'shipped' || input.status === 'delivered' ? input.status : 'preparing',
        shippedAt: input.status === 'shipped' ? new Date() : null,
      })
      .where(eq(shipments.orderId, order.id));

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'ORDER_FULFILMENT_UPDATED',
      entityType: 'orders',
      entityId: order.orderNumber,
      newState: { status: input.status, carrier: input.carrier, trackingNumber: input.trackingNumber },
      reason: `Order ${order.orderNumber} updated to '${input.status}' (${input.notes}) after pre-fulfilment compliance revalidation.`,
    });

    return updatedOrder;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in fulfilDivisionOrder:', error);
    throw new Error('Failed to update fulfilment status.', { cause: error });
  }
}

export async function updateOrderPaymentStatus(
  actorUid: string,
  actorRole: string,
  orderId: number,
  input: { status: string; externalRef?: string; notes: string }
) {
  try {
    const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    if (!order) throw new DomainPolicyError('Order not found.', 404);

    const [updated] = await db
      .update(paymentTransactions)
      .set({
        status: input.status,
        ...(input.externalRef ? { externalRef: input.externalRef } : {}),
      })
      .where(eq(paymentTransactions.orderId, order.id))
      .returning();

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'PAYMENT_STATUS_UPDATED',
      entityType: 'orders',
      entityId: order.orderNumber,
      newState: { paymentStatus: input.status },
      reason: `Payment status updated to '${input.status}': ${input.notes}`,
    });

    return updated;
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in updateOrderPaymentStatus:', error);
    throw new Error('Failed to update payment status.', { cause: error });
  }
}

export async function executeRestrictedPharmaceuticalDispensing(
  actorUid: string,
  actorRole: string,
  input: {
    productId: number;
    prescriptionReference: string;
    prescriberLanr: string;
    issueDateIso: string;
    pharmacistLicenseId: string;
    dispensingPharmacyName: string;
  }
) {
  try {
    const divRow = (
      await db.select().from(divisions).where(eq(divisions.slug, 'pharmaceutical')).limit(1)
    )[0];
    if (!divRow) throw new DomainPolicyError('Pharmaceutical division not configured.', 404);

    const prod = (
      await db.select().from(products).where(eq(products.id, input.productId)).limit(1)
    )[0];
    if (!prod) throw new DomainPolicyError('Product not found.', 404);

    const cls = (
      await db
        .select()
        .from(productClassifications)
        .where(eq(productClassifications.id, prod.classificationId))
        .limit(1)
    )[0];

    const check = validateRestrictedPharmaceuticalDispensing({
      division: divRow as unknown as DivisionState,
      classificationCode: (cls?.code ?? 'other_regulated') as ProductClassificationCode,
      prescriptionReference: input.prescriptionReference,
      prescriberLanr: input.prescriberLanr,
      issueDateIso: input.issueDateIso,
      pharmacistLicenseId: input.pharmacistLicenseId,
      dispensingPharmacyName: input.dispensingPharmacyName,
    });

    if (!check.ok) {
      await writeAuditLog({
        actorUid,
        actorRole,
        action: 'PHARMACEUTICAL_DISPENSING_BLOCKED',
        entityType: 'products',
        entityId: prod.sku,
        reason: check.reason,
      });
      throw new DomainPolicyError(check.reason, 403);
    }

    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'PHARMACEUTICAL_PRESCRIPTION_VALIDATED',
      entityType: 'products',
      entityId: prod.sku,
      newState: { protocolCode: check.protocolCode, pharmacy: input.dispensingPharmacyName },
      reason: 'Licensed pharmacist dispensing workflow validated.',
    });

    return { protocolCode: check.protocolCode, productSku: prod.sku };
  } catch (error) {
    if (error instanceof DomainPolicyError) throw error;
    console.error('Database query failed in executeRestrictedPharmaceuticalDispensing:', error);
    throw new Error('Pharmaceutical dispensing check failed.', { cause: error });
  }
}

export async function updateSeoPageConfig(
  actorUid: string,
  actorRole: string,
  input: SeoPageConfigDto
) {
  const existing = await getSiteSettingJson<SeoPageConfigDto[]>('seo_pages_config', DEFAULT_SEO_PAGES);
  const idx = existing.findIndex((p) => p.route === input.route);
  const next = idx >= 0 ? existing.map((p, i) => (i === idx ? input : p)) : [...existing, input];
  await upsertSiteSettingJson('seo_pages_config', next);
  await writeAuditLog({
    actorUid,
    actorRole,
    action: 'UPDATE_SEO_PAGE_CONFIG',
    entityType: 'site_settings',
    entityId: `seo:${input.route}`,
    newState: { robotsDirective: input.robotsDirective, focusKeywordDe: input.focusKeywordDe },
    reason: `Updated SEO metadata for route '${input.route}'.`,
  });
  return next;
}

export async function updateSeoIntegrationsConfig(
  actorUid: string,
  actorRole: string,
  input: Omit<SeoIntegrationsConfigDto, 'updatedAt'>
) {
  const saved: SeoIntegrationsConfigDto = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await upsertSiteSettingJson('seo_integrations_config', saved);
  await writeAuditLog({
    actorUid,
    actorRole,
    action: 'UPDATE_SEO_INTEGRATIONS',
    entityType: 'site_settings',
    entityId: 'seo_integrations_config',
    newState: {
      ga4: Boolean(saved.ga4MeasurementId),
      gtm: Boolean(saved.gtmContainerId),
      merchantCenterEnabled: saved.merchantCenterEnabled,
    },
    reason: 'Updated Google SEO integrations & search visibility telemetry.',
  });
  return saved;
}

export async function upsertBlogPostWithMetadata(
  actorUid: string,
  actorRole: string,
  input: {
    id?: number;
    slug: string;
    categoryId: number;
    authorId: number;
    titleDe: string;
    titleEn: string;
    excerptDe: string;
    excerptEn: string;
    bodyDe: string;
    bodyEn: string;
    imageUrl?: string;
    isPublished: boolean;
    publishedAt?: string;
    tags: string[];
    referencesText: string;
    editorialReviewStatus: 'draft' | 'peer_reviewed' | 'published';
    seoTitleDe: string;
    seoTitleEn: string;
    seoDescriptionDe: string;
    seoDescriptionEn: string;
  }
) {
  const claim = detectProhibitedMedicinalClaims([
    input.titleDe,
    input.titleEn,
    input.excerptDe,
    input.excerptEn,
    input.bodyDe,
    input.bodyEn,
  ]);
  if (claim) {
    throw new DomainPolicyError(
      `Editorial compliance block: Prohibited medicinal claim ('${claim}') detected in blog article.`,
      400
    );
  }

  const pubDate = input.publishedAt ? new Date(input.publishedAt) : new Date();
  let savedPost;
  if (input.id) {
    const [updated] = await db
      .update(blogPosts)
      .set({
        slug: input.slug,
        categoryId: input.categoryId,
        authorId: input.authorId,
        titleDe: input.titleDe,
        titleEn: input.titleEn,
        excerptDe: input.excerptDe,
        excerptEn: input.excerptEn,
        bodyDe: input.bodyDe,
        bodyEn: input.bodyEn,
        imageUrl: input.imageUrl || null,
        isPublished: input.isPublished,
        publishedAt: pubDate,
      })
      .where(eq(blogPosts.id, input.id))
      .returning();
    if (!updated) throw new DomainPolicyError('Blog post not found.', 404);
    savedPost = updated;
  } else {
    const [inserted] = await db
      .insert(blogPosts)
      .values({
        slug: input.slug,
        categoryId: input.categoryId,
        authorId: input.authorId,
        titleDe: input.titleDe,
        titleEn: input.titleEn,
        excerptDe: input.excerptDe,
        excerptEn: input.excerptEn,
        bodyDe: input.bodyDe,
        bodyEn: input.bodyEn,
        imageUrl: input.imageUrl || null,
        isPublished: input.isPublished,
        publishedAt: pubDate,
      })
      .returning();
    savedPost = inserted;
  }

  const metaMap = await getSiteSettingJson<Record<string, BlogEditorialMeta>>(
    'blog_editorial_meta',
    {}
  );
  metaMap[savedPost.slug] = {
    tags: input.tags,
    referencesText: input.referencesText,
    editorialReviewStatus: input.editorialReviewStatus,
    seoTitleDe: input.seoTitleDe,
    seoTitleEn: input.seoTitleEn,
    seoDescriptionDe: input.seoDescriptionDe,
    seoDescriptionEn: input.seoDescriptionEn,
    updatedAt: new Date().toISOString(),
  };
  await upsertSiteSettingJson('blog_editorial_meta', metaMap);

  await writeAuditLog({
    actorUid,
    actorRole,
    action: input.id ? 'UPDATE_BLOG_ARTICLE' : 'CREATE_BLOG_ARTICLE',
    entityType: 'blog_posts',
    entityId: savedPost.slug,
    newState: { isPublished: savedPost.isPublished, editorialReviewStatus: input.editorialReviewStatus },
    reason: `Blog article '${savedPost.slug}' saved with editorial metadata.`,
  });

  return savedPost;
}

export async function updateBusinessComplianceProfile(
  actorUid: string,
  actorRole: string,
  input: Omit<BusinessComplianceProfileDto, 'updatedAt'>
) {
  const saved: BusinessComplianceProfileDto = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await upsertSiteSettingJson('compliance_business_profile', saved);
  await writeAuditLog({
    actorUid,
    actorRole,
    action: 'UPDATE_BUSINESS_COMPLIANCE_PROFILE',
    entityType: 'site_settings',
    entityId: 'compliance_business_profile',
    newState: { verificationStatus: saved.verificationStatus, legalEntityName: saved.legalEntityName },
    reason: 'Updated German business entity verification dossier.',
  });
  return saved;
}

export async function updateEuPharmacyLogoConfig(
  actorUid: string,
  actorRole: string,
  input: Omit<EuPharmacyLogoConfigDto, 'updatedAt'>
) {
  const pharmaDiv = (
    await db.select().from(divisions).where(eq(divisions.slug, 'pharmaceutical')).limit(1)
  )[0];
  if (input.enabled) {
    if (!pharmaDiv || !hasAllPharmaceuticalPrerequisites(pharmaDiv as unknown as DivisionState)) {
      throw new DomainPolicyError(
        'Fail-closed policy: EU Online Pharmacy Logo cannot be enabled until all 4 German pharmaceutical statutory prerequisites are verified.',
        403
      );
    }
    if (
      !input.authorityRegisterUrl.startsWith('https://') ||
      input.authorizedOperatorName.trim().length < 3
    ) {
      throw new DomainPolicyError(
        'Genuine HTTPS competent-authority register URL and authorized operator name are required to enable the EU Online Pharmacy Logo.',
        400
      );
    }
  }
  const saved: EuPharmacyLogoConfigDto = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await upsertSiteSettingJson('compliance_eu_pharmacy_logo', saved);
  await writeAuditLog({
    actorUid,
    actorRole,
    action: 'UPDATE_EU_PHARMACY_LOGO',
    entityType: 'site_settings',
    entityId: 'compliance_eu_pharmacy_logo',
    newState: { enabled: saved.enabled, authorizedOperatorName: saved.authorizedOperatorName },
    reason: saved.enabled
      ? 'EU Online Pharmacy Logo module enabled with verified authority link.'
      : 'EU Online Pharmacy Logo module kept disabled.',
  });
  return saved;
}

export async function updateLegalDocumentsConfig(
  actorUid: string,
  actorRole: string,
  input: Omit<LegalDocumentsConfigDto, 'updatedAt'>
) {
  const saved: LegalDocumentsConfigDto = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await upsertSiteSettingJson('compliance_legal_documents', saved);
  await writeAuditLog({
    actorUid,
    actorRole,
    action: 'UPDATE_LEGAL_DOCUMENTS',
    entityType: 'site_settings',
    entityId: 'compliance_legal_documents',
    newState: { reviewStatus: saved.reviewStatus },
    reason: 'Updated German/English website legal notice and compliance disclosures.',
  });
  return saved;
}

export async function updateProductRegulatoryMatrix(
  actorUid: string,
  actorRole: string,
  input: Omit<ProductRegulatoryMatrixEntryDto, 'updatedAt'>
) {
  const existing = await getSiteSettingJson<ProductRegulatoryMatrixEntryDto[]>(
    'compliance_product_matrix',
    []
  );
  const entry: ProductRegulatoryMatrixEntryDto = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  const idx = existing.findIndex((e) => e.productId === input.productId);
  const next = idx >= 0 ? existing.map((e, i) => (i === idx ? entry : e)) : [...existing, entry];
  await upsertSiteSettingJson('compliance_product_matrix', next);
  await writeAuditLog({
    actorUid,
    actorRole,
    action: 'UPDATE_PRODUCT_REGULATORY_SAFETY_MATRIX',
    entityType: 'products',
    entityId: String(input.productId),
    newState: {
      reachApplicable: entry.reachApplicable,
      medicinalClassificationRisk: entry.medicinalClassificationRisk,
    },
    reason: `Recorded product-level regulatory/REACH/CLP assessment for product #${input.productId}.`,
  });
  return next;
}

export async function updateProductionChecklist(
  actorUid: string,
  actorRole: string,
  input: Omit<ProductionReadinessChecklistDto, 'updatedAt'>
) {
  if (
    input.productionAuthorized &&
    (!input.testingComplete ||
      !input.databaseReady ||
      !input.securityReviewed ||
      !input.businessDocsReady ||
      !input.regulatoryApprovalReady ||
      !input.paymentProviderApproved)
  ) {
    throw new DomainPolicyError(
      'Fail-closed launch gate: Production authorization cannot be activated while Testing, Database, Security, Business Docs, Regulatory Approval, or Payment Approval remain incomplete.',
      403
    );
  }
  const saved: ProductionReadinessChecklistDto = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await upsertSiteSettingJson('production_readiness_checklist', saved);
  await writeAuditLog({
    actorUid,
    actorRole,
    action: 'UPDATE_PRODUCTION_CHECKLIST',
    entityType: 'site_settings',
    entityId: 'production_readiness_checklist',
    newState: saved,
    reason: 'Updated production readiness checklist gate statuses.',
  });
  return saved;
}

export async function exportCustomerPersonalData(userUid: string) {
  const context = await getCustomerAccountContext(userUid);
  const consents = await db
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.userUid, userUid))
    .orderBy(desc(consentRecords.recordedAt));

  await writeAuditLog({
    actorUid: userUid,
    actorRole: 'customer',
    action: 'GDPR_DATA_EXPORT_ART15',
    entityType: 'profiles',
    entityId: userUid,
    reason: 'Customer exported personal data archive (Art. 15 DSGVO).',
  });

  return {
    exportedAt: new Date().toISOString(),
    gdprBasis: 'Art. 15 DSGVO / GDPR Right of Access',
    retentionNoticeDe:
      'Handels- und steuerrechtliche Belege (Rechnungen/Bestellungen) unterliegen den gesetzlichen Aufbewahrungsfristen (§ 147 AO / § 257 HGB).',
    profile: context.profile,
    addresses: context.addresses,
    orders: context.orders,
    supportTickets: context.supportTickets,
    consents,
  };
}

export async function eraseCustomerPersonalData(userUid: string) {
  const existingProfile = (
    await db.select().from(profiles).where(eq(profiles.uid, userUid)).limit(1)
  )[0];
  if (!existingProfile) {
    throw new DomainPolicyError('Profile not found.', 404);
  }

  await db.transaction(async (tx) => {
    await tx.delete(addresses).where(eq(addresses.userUid, userUid));
    await tx
      .update(profiles)
      .set({
        email: `anonymized-${userUid.slice(0, 8)}@redacted.peptivora.invalid`,
        displayName: 'GDPR Deleted Account',
        phone: null,
        organizationName: null,
        vatId: null,
        kybStatus: 'revoked',
        updatedAt: new Date(),
      })
      .where(eq(profiles.uid, userUid));

    await tx
      .update(contactMessages)
      .set({
        senderName: 'GDPR Anonymized',
        senderEmail: `redacted@peptivora.invalid`,
        organization: null,
      })
      .where(eq(contactMessages.senderEmail, existingProfile.email));

    await tx.insert(auditLogs).values({
      actorUid: userUid,
      actorRole: 'customer',
      action: 'GDPR_ERASURE_ART17',
      entityType: 'profiles',
      entityId: userUid,
      reason:
        'Customer triggered Art. 17 DSGVO erasure: personal profile, phone, addresses, and inquiry PII anonymized while retaining statutory GoBD tax invoice numbers.',
    });
  });

  return { ok: true, anonymizedAt: new Date().toISOString() };
}

