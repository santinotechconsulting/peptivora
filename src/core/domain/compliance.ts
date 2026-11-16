export type Locale = 'de' | 'en';

export type DivisionSlug = 'research' | 'pharmaceutical';

export type AppRole =
  | 'super_administrator'
  | 'product_manager'
  | 'regulatory_reviewer'
  | 'order_manager'
  | 'content_manager'
  | 'customer_support'
  | 'customer';

export type ProductClassificationCode =
  | 'research_use_only'
  | 'authorized_otc_medicinal'
  | 'authorized_prescription_medicinal'
  | 'other_regulated';

export type ApprovalStatus =
  | 'draft'
  | 'submitted_for_review'
  | 'under_regulatory_review'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'expired';

export type PublicationStatus = 'unpublished' | 'published' | 'archived';

export type KybStatus =
  | 'unverified'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'revoked';

export interface DivisionState {
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
  verifiedAt: string | Date | null;
  notes: string | null;
}

const MEDICINAL_CLAIM_TERMS = [
  'cures',
  'treats',
  'therapeutic',
  'diagnoses',
  'clinical treatment',
  'medical therapy',
  'human injection',
  'injectable therapy',
  'heilmittel',
  'therapeutisch',
  'behandelt',
  'heilt',
  'arzneiwirkung',
  'humananwendung geeignet',
];

/**
 * Regulatory Invariant:
 * Research-only product pages must NEVER contain medicinal or therapeutic claims.
 */
export function detectProhibitedMedicinalClaims(texts: (string | null | undefined)[]): string | null {
  const combined = texts
    .filter((t): t is string => Boolean(t))
    .join(' ')
    .toLowerCase();
  for (const term of MEDICINAL_CLAIM_TERMS) {
    if (combined.includes(term)) {
      return term;
    }
  }
  return null;
}

/**
 * Regulatory Invariant:
 * Products are NEVER automatically classified based on name or description,
 * and a manufacturer "Research Use Only" label never grants legal exemption.
 */
export function isProductAvailableForPublicCatalog(params: {
  publicationStatus: string;
  approvalStatus: string;
  latestApprovalExpiresAt?: string | Date | null;
}): boolean {
  if (params.publicationStatus !== 'published') return false;
  if (params.approvalStatus !== 'approved') return false;
  if (params.latestApprovalExpiresAt) {
    const exp = new Date(params.latestApprovalExpiresAt);
    if (exp.getTime() <= Date.now()) {
      return false;
    }
  }
  return true;
}

export function hasAllPharmaceuticalPrerequisites(
  division: Pick<
    DivisionState,
    | 'pharmacyLicenseVerified'
    | 'distributionArrangementVerified'
    | 'productAuthorizationVerified'
    | 'dispensingWorkflowVerified'
  >
): boolean {
  return Boolean(
    division.pharmacyLicenseVerified &&
      division.distributionArrangementVerified &&
      division.productAuthorizationVerified &&
      division.dispensingWorkflowVerified
  );
}

export function canTransactDivision(division: DivisionState): boolean {
  if (!division.transactionsEnabled) return false;
  if (division.slug === 'pharmaceutical') {
    return hasAllPharmaceuticalPrerequisites(division) && Boolean(division.verifiedByUid);
  }
  return division.slug === 'research';
}

export function calculateGermanVat(
  unitNetCents: number,
  quantity: number,
  vatRateBps: number
): { netCents: number; vatCents: number; grossCents: number } {
  const netCents = unitNetCents * quantity;
  const vatCents = Math.round((netCents * vatRateBps) / 10000);
  return {
    netCents,
    vatCents,
    grossCents: netCents + vatCents,
  };
}

export function formatEuroCents(cents: number, locale: Locale = 'de'): string {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export function formatGermanDate(dateInput: string | Date, locale: Locale = 'de'): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
