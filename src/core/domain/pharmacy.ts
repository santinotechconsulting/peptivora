import {
  canTransactDivision,
  hasAllPharmaceuticalPrerequisites,
  type DivisionState,
  type ProductClassificationCode,
} from './compliance.ts';

export interface PrescriptionValidationInput {
  division: DivisionState;
  classificationCode: ProductClassificationCode;
  prescriptionReference: string;
  prescriberLanr: string;
  issueDateIso: string;
  pharmacistLicenseId: string;
  dispensingPharmacyName: string;
}

export function validateRestrictedPharmaceuticalDispensing(
  input: PrescriptionValidationInput
): { ok: true; protocolCode: string } | { ok: false; reason: string } {
  if (!hasAllPharmaceuticalPrerequisites(input.division) || !canTransactDivision(input.division)) {
    return {
      ok: false,
      reason:
        'Pharmaceutical Division workflow is disabled until all four German statutory authorizations (Apothekenbetriebserlaubnis, § 52a AMG wholesale, product authorization, and dispensing workflow) are verified.',
    };
  }

  if (
    input.classificationCode !== 'authorized_prescription_medicinal' &&
    input.classificationCode !== 'authorized_otc_medicinal'
  ) {
    return {
      ok: false,
      reason:
        'Only verified authorized medicinal products may enter the restricted Pharmaceutical dispensing workflow.',
    };
  }

  if (input.classificationCode === 'authorized_prescription_medicinal') {
    if (!input.prescriptionReference.trim() || input.prescriptionReference.trim().length < 6) {
      return {
        ok: false,
        reason: 'Valid prescription reference (§ 48 AMG) is mandatory for prescription products.',
      };
    }
    if (!/^\d{9}$/.test(input.prescriberLanr.trim())) {
      return {
        ok: false,
        reason: 'A valid 9-digit German prescriber LANR is required for prescription validation.',
      };
    }
    const issued = new Date(input.issueDateIso);
    if (Number.isNaN(issued.getTime()) || issued.getTime() > Date.now()) {
      return {
        ok: false,
        reason: 'Prescription issue date is invalid.',
      };
    }
  }

  if (!input.pharmacistLicenseId.trim() || !input.dispensingPharmacyName.trim()) {
    return {
      ok: false,
      reason:
        'Licensed pharmacist Approbation/license ID and dispensing pharmacy verification are strictly required.',
    };
  }

  return {
    ok: true,
    protocolCode: `RX-${Date.now().toString(36).toUpperCase()}`,
  };
}
