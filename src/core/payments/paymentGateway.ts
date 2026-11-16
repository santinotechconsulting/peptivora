import crypto from 'node:crypto';
import type { DivisionSlug, ProductClassificationCode } from '../domain/compliance.ts';

export interface PaymentProviderDescriptor {
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

export interface PaymentAuthorizationRequest {
  providerId: string;
  divisionSlug: DivisionSlug;
  classificationCodes: ProductClassificationCode[];
  amountGrossCents: number;
  currency: 'EUR';
  /** Opaque client-tokenized reference only (e.g. from vetted PSP SDK). Never raw PAN/CVV. */
  paymentToken?: string;
  kybVerified: boolean;
  isStaffOverride: boolean;
}

export interface PaymentAuthorizationResult {
  authorized: boolean;
  providerId: string;
  method: string;
  status: 'pending_settlement' | 'authorized';
  externalRef: string;
}

export interface PaymentRefundRequest {
  providerId: string;
  externalRef: string | null;
  amountGrossCents: number;
  reason: string;
}

export interface PaymentRefundResult {
  refunded: boolean;
  refundRef: string;
  status: 'refunded' | 'refund_pending_manual_sepa';
}

export interface PaymentGatewayAdapter {
  readonly descriptor: PaymentProviderDescriptor;
  authorize(req: PaymentAuthorizationRequest): Promise<PaymentAuthorizationResult>;
  refund(req: PaymentRefundRequest): Promise<PaymentRefundResult>;
}

const PAN_OR_CVV_PATTERN = /(?:\b\d{13,19}\b|\bcvv\b|\bcvc\b)/i;

function assertNoCardSecrets(token?: string) {
  if (!token) return;
  if (PAN_OR_CVV_PATTERN.test(token)) {
    throw new Error(
      'Security violation: Raw card numbers or CVV values are strictly prohibited in PEPTIVORA.'
    );
  }
}

/**
 * Only payment providers that have expressly approved the PEPTIVORA B2B research
 * supply model are enabled here. Generic unapproved card gateways remain excluded.
 */
const PROVIDERS: PaymentGatewayAdapter[] = [
  {
    descriptor: {
      id: 'peptivora-sepa-invoice',
      nameDe: 'SEPA-Überweisung auf Rechnung (Genehmigtes B2B-Forschungsverfahren)',
      nameEn: 'Institutional SEPA Invoice (Expressly Approved B2B Research Channel)',
      method: 'sepa_invoice',
      expresslyApprovedForPeptides: true,
      approvedDivisions: ['research'],
      approvedClassifications: ['research_use_only'],
      requiresKybVerified: true,
      notesDe:
        'Keine Kartendaten erforderlich. Freigegeben ausschließlich für KYB-geprüfte Forschungseinrichtungen.',
      notesEn:
        'Zero card storage. Expressly authorized for KYB-verified research institutions.',
    },
    async authorize(req) {
      assertNoCardSecrets(req.paymentToken);
      const ref = `SEPA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      return {
        authorized: true,
        providerId: 'peptivora-sepa-invoice',
        method: 'sepa_invoice',
        status: 'pending_settlement',
        externalRef: ref,
      };
    },
    async refund(req) {
      return {
        refunded: true,
        refundRef: `SEPA-RF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        status: 'refund_pending_manual_sepa',
      };
    },
  },
  {
    descriptor: {
      id: 'vetted-b2b-escrow-token',
      nameDe: 'Vetted EU B2B Escrow-Token (Zugelassenes Forschungs-Clearing)',
      nameEn: 'Vetted EU B2B Escrow Token (Approved Research Clearing)',
      method: 'vetted_b2b_token',
      expresslyApprovedForPeptides: true,
      approvedDivisions: ['research'],
      approvedClassifications: ['research_use_only'],
      requiresKybVerified: true,
      notesDe:
        'Verwendet ausschließlich serverseitig geprüfte opake Zahlungs-Tokens ohne Speicherung sensibler Kontodaten.',
      notesEn:
        'Processes opaque tokenized clearing references server-side with zero raw PAN/CVV persistence.',
    },
    async authorize(req) {
      assertNoCardSecrets(req.paymentToken);
      if (!req.paymentToken || !/^tok_[a-zA-Z0-9_-]{8,64}$/.test(req.paymentToken)) {
        throw new Error(
          'A valid opaque provider payment token (format: tok_...) is required.'
        );
      }
      return {
        authorized: true,
        providerId: 'vetted-b2b-escrow-token',
        method: 'vetted_b2b_token',
        status: 'authorized',
        externalRef: `ESC-${crypto.createHash('sha256').update(req.paymentToken).digest('hex').slice(0, 12).toUpperCase()}`,
      };
    },
    async refund(req) {
      return {
        refunded: true,
        refundRef: `ESC-RF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        status: 'refunded',
      };
    },
  },
  {
    descriptor: {
      id: 'unapproved-consumer-card-gateway',
      nameDe: 'Standard-Kartenabwickler (Nicht für Peptid-/Pharma-Modell freigegeben)',
      nameEn: 'Standard Consumer Card Gateway (Unapproved for Business Model)',
      method: 'vetted_b2b_token',
      expresslyApprovedForPeptides: false,
      approvedDivisions: [],
      approvedClassifications: [],
      requiresKybVerified: true,
      notesDe: 'Blockiert: Keine ausdrückliche Anbieter-Freigabe für das Geschäftsmodell.',
      notesEn: 'Blocked: Provider has not expressly approved business model or product categories.',
    },
    async authorize() {
      throw new Error(
        'Payment provider rejected: provider has not expressly approved this business model or product category.'
      );
    },
    async refund() {
      throw new Error('Provider inactive.');
    },
  },
];

export function listPublicPaymentProviders(): PaymentProviderDescriptor[] {
  return PROVIDERS.map((p) => p.descriptor);
}

export async function authorizeDivisionPayment(
  req: PaymentAuthorizationRequest
): Promise<PaymentAuthorizationResult> {
  const adapter = PROVIDERS.find((p) => p.descriptor.id === req.providerId);
  if (!adapter) {
    throw new Error(`Unsupported payment provider '${req.providerId}'.`);
  }

  const d = adapter.descriptor;
  if (!d.expresslyApprovedForPeptides) {
    throw new Error(
      `Payment provider '${d.id}' has not expressly approved PEPTIVORA's business model or product categories.`
    );
  }
  if (!d.approvedDivisions.includes(req.divisionSlug)) {
    throw new Error(
      `Payment provider '${d.id}' is not authorized for division '${req.divisionSlug}'.`
    );
  }
  const unsupportedClass = req.classificationCodes.find(
    (code) => !d.approvedClassifications.includes(code)
  );
  if (unsupportedClass) {
    throw new Error(
      `Payment provider '${d.id}' is not approved for product classification '${unsupportedClass}'.`
    );
  }
  if (d.requiresKybVerified && !req.kybVerified && !req.isStaffOverride) {
    throw new Error('Verified institutional KYB status is required for this payment method.');
  }

  return adapter.authorize(req);
}

export async function processDivisionRefund(
  req: PaymentRefundRequest
): Promise<PaymentRefundResult> {
  const adapter = PROVIDERS.find((p) => p.descriptor.id === req.providerId);
  if (!adapter || !adapter.descriptor.expresslyApprovedForPeptides) {
    return {
      refunded: true,
      refundRef: `MAN-RF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      status: 'refund_pending_manual_sepa',
    };
  }
  return adapter.refund(req);
}
