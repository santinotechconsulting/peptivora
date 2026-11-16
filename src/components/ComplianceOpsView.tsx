import { useState, type FormEvent } from 'react';
import {
  Ban,
  CheckCircle2,
  Edit3,
  Eye,
  FileUp,
  History,
  ImagePlus,
  Lock,
  PackageCheck,
  ShieldCheck,
  UserCog,
  Warehouse,
  X,
} from 'lucide-react';
import {
  formatEuroCents,
  formatGermanDate,
  type AppRole,
  type ApprovalStatus,
  type Locale,
} from '../core/domain/compliance.ts';
import type {
  AdminProductRowDto,
  ComplianceOverviewResponse,
  SeoPageConfigDto,
} from '../types/peptivora.ts';
import {
  GermanComplianceGovernancePanel,
  SeoAndBlogAdminPanel,
} from './SeoAndGovernancePanels.tsx';

interface ComplianceOpsViewProps {
  locale: Locale;
  currentRole: AppRole;
  overview: ComplianceOverviewResponse | null;
  onCreateProduct: (payload: Record<string, unknown>) => Promise<void>;
  onUpdateProduct: (productId: number, payload: Record<string, unknown>) => Promise<void>;
  onAddProductImage: (productId: number, payload: Record<string, unknown>) => Promise<void>;
  onAdjustInventory: (productId: number, payload: Record<string, unknown>) => Promise<void>;
  onSuspendProduct: (productId: number, reason: string) => Promise<void>;
  onSubmitApproval: (payload: Record<string, unknown>) => Promise<void>;
  onDecideApproval: (payload: Record<string, unknown>) => Promise<void>;
  onReviewKyb: (uid: string, status: 'verified' | 'rejected' | 'revoked', notes: string) => Promise<void>;
  onUpdatePharmaGate: (payload: Record<string, unknown>) => Promise<void>;
  onUploadDocument: (payload: Record<string, unknown>) => Promise<void>;
  onVerifyDocument: (docId: number, status: 'verified' | 'rejected' | 'revoked') => Promise<void>;
  onAssignRole: (targetUid: string, role: AppRole) => Promise<void>;
  onFulfilOrder: (orderId: number, payload: Record<string, unknown>) => Promise<void>;
  onUpdatePaymentStatus: (orderId: number, payload: Record<string, unknown>) => Promise<void>;
  onDecideRefund: (orderId: number, decision: 'approved' | 'rejected', notes: string) => Promise<void>;
  onSaveSeoPage: (payload: SeoPageConfigDto) => Promise<void>;
  onSaveSeoIntegrations: (payload: Record<string, unknown>) => Promise<void>;
  onSaveBlogPost: (payload: Record<string, unknown>) => Promise<void>;
  onSaveBusinessProfile: (payload: Record<string, unknown>) => Promise<void>;
  onSaveEuPharmacyLogo: (payload: Record<string, unknown>) => Promise<void>;
  onSaveLegalDocs: (payload: Record<string, unknown>) => Promise<void>;
  onSaveProductMatrix: (payload: Record<string, unknown>) => Promise<void>;
  onSaveProductionChecklist: (payload: Record<string, unknown>) => Promise<void>;
}

const ALL_ROLES: AppRole[] = [
  'super_administrator',
  'product_manager',
  'regulatory_reviewer',
  'order_manager',
  'content_manager',
  'customer_support',
  'customer',
];

export function ComplianceOpsView({
  locale,
  currentRole,
  overview,
  onCreateProduct,
  onUpdateProduct,
  onAddProductImage,
  onAdjustInventory,
  onSuspendProduct,
  onSubmitApproval,
  onDecideApproval,
  onReviewKyb,
  onUpdatePharmaGate,
  onUploadDocument,
  onVerifyDocument,
  onAssignRole,
  onFulfilOrder,
  onUpdatePaymentStatus,
  onDecideRefund,
  onSaveSeoPage,
  onSaveSeoIntegrations,
  onSaveBlogPost,
  onSaveBusinessProfile,
  onSaveEuPharmacyLogo,
  onSaveLegalDocs,
  onSaveProductMatrix,
  onSaveProductionChecklist,
}: ComplianceOpsViewProps) {
  const isDe = locale === 'de';
  const [tab, setTab] = useState<
    | 'products'
    | 'approvals'
    | 'orders'
    | 'pharma'
    | 'vault'
    | 'kyb'
    | 'seo'
    | 'governance'
    | 'inbox'
    | 'audit'
  >('products');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Create Product Draft state
  const [sku, setSku] = useState('PV-DEM-404');
  const [slug, setSlug] = useState('peptivora-demo-zeta-404');
  const [newDivId, setNewDivId] = useState<number>(overview?.divisions[0]?.id ?? 1);
  const [newCatId, setNewCatId] = useState<number>(overview?.categories[0]?.id ?? 1);
  const [newClassId, setNewClassId] = useState<number>(overview?.classifications[0]?.id ?? 1);
  const [nameDe, setNameDe] = useState('Demo-Kandidat Zeta-404 (Entwurf)');
  const [nameEn, setNameEn] = useState('Demo-Candidate Zeta-404 (Draft)');
  const [ruoLabeled, setRuoLabeled] = useState(true);
  const [priceCents, setPriceCents] = useState(6500);

  // Selected Product for Edit / Images / Inventory / Preview / History
  const [selectedProdId, setSelectedProdId] = useState<number>(overview?.products[0]?.id ?? 1);
  const selectedProd = overview?.products.find((p) => p.id === selectedProdId) ?? overview?.products[0];
  const [previewProduct, setPreviewProduct] = useState<AdminProductRowDto | null>(null);

  // Edit product form state synced via select button
  const [editCatId, setEditCatId] = useState<number>(selectedProd?.categoryId ?? 1);
  const [editManufacturer, setEditManufacturer] = useState(selectedProd?.manufacturerName ?? '');
  const [editNameDe, setEditNameDe] = useState(selectedProd?.nameDe ?? '');
  const [editNameEn, setEditNameEn] = useState(selectedProd?.nameEn ?? '');
  const [editDescDe, setEditDescDe] = useState(selectedProd?.descriptionDe ?? '');
  const [editDescEn, setEditDescEn] = useState(selectedProd?.descriptionEn ?? '');
  const [editCas, setEditCas] = useState(selectedProd?.casNumber ?? '');
  const [editStorage, setEditStorage] = useState(selectedProd?.storageCondition ?? '-20 °C, lyophilized');
  const [editPricePermitted, setEditPricePermitted] = useState(Boolean(selectedProd?.pricePermitted));
  const [editPriceCents, setEditPriceCents] = useState(selectedProd?.priceNetCents ?? 0);

  // Image upload state
  const [imgUrl, setImgUrl] = useState('/src/assets/images/product_lyophilized_vial_1794861146550.jpg');
  const [imgAltDe, setImgAltDe] = useState('Labor-Produktansicht');
  const [imgAltEn, setImgAltEn] = useState('Laboratory Product View');

  // Inventory adjustment state
  const currentInv = overview?.inventory.find((i) => i.productId === selectedProd?.id);
  const [invBatch, setInvBatch] = useState(currentInv?.batchNumber ?? 'DEMO-LOT-2026');
  const [invQty, setInvQty] = useState<number>(currentInv?.quantityOnHand ?? 20);
  const [invStockStatus, setInvStockStatus] = useState(selectedProd?.stockStatus ?? 'in_stock');
  const [invReason, setInvReason] = useState('Routine batch reconciliation');

  // Approval Decision state
  const [decisionProdId, setDecisionProdId] = useState<number>(overview?.products[0]?.id ?? 1);
  const [decisionStatus, setDecisionStatus] = useState<ApprovalStatus>('approved');
  const [decisionExpiry, setDecisionExpiry] = useState('2028-12-31T23:59:59Z');
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [amgScreened, setAmgScreened] = useState(true);
  const [hwgScreened, setHwgScreened] = useState(true);
  const [chemgScreened, setChemgScreened] = useState(true);
  const [ruoVerified, setRuoVerified] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState('Independent statutory dossier verified.');

  // Pharma Gate state
  const pharmaDiv = overview?.divisions.find((d) => d.slug === 'pharmaceutical');
  const [pharmaLicense, setPharmaLicense] = useState(Boolean(pharmaDiv?.pharmacyLicenseVerified));
  const [pharmaDist, setPharmaDist] = useState(Boolean(pharmaDiv?.distributionArrangementVerified));
  const [pharmaAuth, setPharmaAuth] = useState(Boolean(pharmaDiv?.productAuthorizationVerified));
  const [pharmaDispense, setPharmaDispense] = useState(Boolean(pharmaDiv?.dispensingWorkflowVerified));
  const [pharmaTxEnabled, setPharmaTxEnabled] = useState(Boolean(pharmaDiv?.transactionsEnabled));
  const [pharmaNotes, setPharmaNotes] = useState(pharmaDiv?.notes ?? 'Regulatory audit lock maintained.');

  // Vault Document upload
  const [docProductId, setDocProductId] = useState<number>(overview?.products[0]?.id ?? 1);
  const [docType, setDocType] = useState<'coa' | 'sds' | 'technical_dossier' | 'regulatory_evidence'>('coa');
  const [docTitle, setDocTitle] = useState('Demo Analytical Reference Sheet');
  const [docFileName, setDocFileName] = useState('demo-coa.txt');
  const [docMime, setDocMime] = useState<'text/plain' | 'application/pdf'>('text/plain');
  const [docContentText, setDocContentText] = useState('PEPTIVORA Fictional Demo Analytical Sheet — Placeholder');

  // Order management inline state
  const [trackingByOrder, setTrackingByOrder] = useState<Record<number, string>>({});

  if (!overview) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-charcoal/75">
        {isDe ? 'Lade Compliance- & Produktverwaltung…' : 'Loading compliance & product administration…'}
      </div>
    );
  }

  const canManageProducts = ['product_manager', 'super_administrator'].includes(currentRole);
  const canReview = ['regulatory_reviewer', 'super_administrator'].includes(currentRole);
  const canManageOrders = ['order_manager', 'super_administrator'].includes(currentRole);
  const isSuperAdmin = currentRole === 'super_administrator';

  function loadProductIntoEditor(p: AdminProductRowDto) {
    setSelectedProdId(p.id);
    setEditCatId(p.categoryId);
    setEditManufacturer(p.manufacturerName);
    setEditNameDe(p.nameDe);
    setEditNameEn(p.nameEn);
    setEditDescDe(p.descriptionDe);
    setEditDescEn(p.descriptionEn);
    setEditCas(p.casNumber ?? '');
    setEditStorage(p.storageCondition);
    setEditPricePermitted(p.pricePermitted);
    setEditPriceCents(p.priceNetCents);
    const inv = overview?.inventory.find((i) => i.productId === p.id);
    setInvBatch(inv?.batchNumber ?? `LOT-${p.sku}`);
    setInvQty(inv?.quantityOnHand ?? 0);
    setInvStockStatus(p.stockStatus);
  }

  async function runAction(fn: () => Promise<void>, successText: string) {
    setFeedback(null);
    try {
      await fn();
      setFeedback({ type: 'ok', text: successText });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Action failed' });
    }
  }

  function handleCreateDraft(e: FormEvent) {
    e.preventDefault();
    if (!overview) return;
    const sup = overview.suppliers[0];
    void runAction(
      () =>
        onCreateProduct({
          sku,
          slug,
          divisionId: newDivId,
          categoryId: newCatId,
          classificationId: newClassId,
          supplierId: sup.id,
          manufacturerName: 'PEPTIVORA Demo Synthesis Unit (Fictional)',
          manufacturerRuoLabeled: ruoLabeled,
          nameDe,
          nameEn,
          descriptionDe: 'Entwurf eines fiktiven Labor-Referenzmusters zur Compliance-Prüfung.',
          descriptionEn: 'Draft fictional laboratory reference sample awaiting compliance review.',
          regulatoryNoticeDe: 'Unveröffentlichter Entwurf — Prüfung erforderlich.',
          regulatoryNoticeEn: 'Unpublished draft — compliance review required.',
          storageCondition: '-20 °C, lyophilized',
          pricePermitted: true,
          priceNetCents: Number(priceCents),
        }),
      `Draft ${sku} created (unpublished).`
    );
  }

  function handleSaveProductEdit(e: FormEvent) {
    e.preventDefault();
    if (!selectedProd) return;
    void runAction(
      () =>
        onUpdateProduct(selectedProd.id, {
          categoryId: editCatId,
          manufacturerName: editManufacturer,
          nameDe: editNameDe,
          nameEn: editNameEn,
          descriptionDe: editDescDe,
          descriptionEn: editDescEn,
          regulatoryNoticeDe: selectedProd.regulatoryNoticeDe,
          regulatoryNoticeEn: selectedProd.regulatoryNoticeEn,
          casNumber: editCas,
          storageCondition: editStorage,
          pricePermitted: editPricePermitted,
          priceNetCents: Number(editPriceCents),
        }),
      `Updated product ${selectedProd.sku}.`
    );
  }

  function handleImageFileSelect(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImgUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleUploadDoc(e: FormEvent) {
    e.preventDefault();
    const base64 = btoa(unescape(encodeURIComponent(docContentText)));
    void runAction(
      () =>
        onUploadDocument({
          productId: docProductId,
          docType,
          title: docTitle,
          fileName: docFileName,
          mimeType: docMime,
          contentBase64: base64,
        }),
      `Document ${docFileName} hashed (SHA-256) and stored pending verification.`
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="bg-navy text-white rounded-sm p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-blue-300">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>PRODUCT MANAGEMENT & REGULATORY GOVERNANCE</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">
            {isDe
              ? 'Produktverwaltung, Freigabe & Bestell-Revalidierung'
              : 'Product Administration, Approval & Order Governance'}
          </h1>
        </div>
        <div className="font-mono text-xs px-3 py-1.5 rounded-sm border border-white/25 bg-white/10">
          Role: {currentRole}
        </div>
      </div>

      {/* Compliance Status Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {[
          ['Approved SKUs', overview.products.filter((p) => p.approvalStatus === 'approved').length, 'text-emerald-800'],
          [
            'Pending Review',
            overview.products.filter((p) =>
              ['draft', 'submitted_for_review', 'under_regulatory_review'].includes(p.approvalStatus)
            ).length,
            'text-amber-800',
          ],
          [
            'Rejected / Expired',
            overview.products.filter((p) => ['rejected', 'expired'].includes(p.approvalStatus)).length,
            'text-red-800',
          ],
          [
            'Suspended',
            overview.products.filter((p) => p.approvalStatus === 'suspended').length,
            'text-red-900',
          ],
          [
            'Business Profile',
            overview.businessProfile.verificationStatus === 'verified' ? 'Verified' : 'Incomplete',
            overview.businessProfile.verificationStatus === 'verified'
              ? 'text-emerald-800'
              : 'text-amber-800',
          ],
          [
            'Prod Launch',
            overview.productionChecklist.productionAuthorized ? 'Authorized' : 'Pre-Launch',
            overview.productionChecklist.productionAuthorized ? 'text-emerald-800' : 'text-navy',
          ],
        ].map(([label, val, tone]) => (
          <div key={String(label)} className="bg-white border border-silver rounded-sm p-3">
            <div className="font-mono text-[10px] uppercase text-charcoal/65">{label}</div>
            <div className={`font-mono text-lg font-bold mt-0.5 ${tone}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Console Tab Bar */}
      <div className="flex flex-nowrap sm:flex-wrap gap-2 border-b border-silver pb-3 overflow-x-auto no-scrollbar">
        {[
          ['products', isDe ? 'Produktverwaltung' : 'Products & Preview'],
          ['approvals', isDe ? 'Freigaben' : 'Approvals'],
          ['orders', isDe ? 'Bestellungen' : 'Orders'],
          ['pharma', isDe ? 'Pharmazie-Gate' : 'Pharma Gate'],
          ['vault', isDe ? 'SHA-256 Tresor' : 'Document Vault'],
          ['kyb', isDe ? 'KYB & Rollen' : 'KYB & RBAC'],
          ['seo', isDe ? 'SEO & Blog-CMS' : 'SEO & Blog CMS'],
          ['governance', isDe ? 'DE-Compliance & Launch' : 'DE Governance & Launch'],
          ['inbox', isDe ? 'Posteingang' : 'Inbox'],
          ['audit', 'Audit Logs'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as typeof tab)}
            className={`min-h-[40px] px-3 py-2 text-xs font-semibold rounded-sm border whitespace-nowrap shrink-0 cursor-pointer ${
              tab === key
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-navy border-silver hover:bg-lightgrey'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-sm border text-sm ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* TAB 1: Product Management, Edit, Images, Inventory, Suspend, Preview */}
      {tab === 'products' && (
        <div className="space-y-8">
          <div className="bg-white border border-silver rounded-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-lightgrey border-b border-silver font-mono uppercase text-charcoal/70">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Division</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver">
                {overview.products.map((p) => {
                  const div = overview.divisions.find((d) => d.id === p.divisionId);
                  const inv = overview.inventory.find((i) => i.productId === p.id);
                  return (
                    <tr key={p.id}>
                      <td className="p-3 font-mono font-semibold text-navy">{p.sku}</td>
                      <td className="p-3 text-navy">{isDe ? p.nameDe : p.nameEn}</td>
                      <td className="p-3 font-mono">{div?.slug}</td>
                      <td className="p-3 font-mono">
                        {p.stockStatus} ({inv?.quantityOnHand ?? 0})
                      </td>
                      <td className="p-3 font-mono">
                        {p.approvalStatus} / {p.publicationStatus}
                      </td>
                      <td className="p-3 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewProduct(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-navy text-navy rounded-sm hover:bg-lightgrey cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isDe ? 'Vorschau' : 'Preview'}</span>
                        </button>
                        {canManageProducts && (
                          <button
                            type="button"
                            onClick={() => loadProductIntoEditor(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-scientific text-white rounded-sm cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{isDe ? 'Bearbeiten' : 'Edit'}</span>
                          </button>
                        )}
                        {(canManageProducts || canReview) && p.approvalStatus !== 'suspended' && (
                          <button
                            type="button"
                            onClick={() =>
                              void runAction(
                                () =>
                                  onSuspendProduct(
                                    p.id,
                                    'Listing suspended via Product Governance Console.'
                                  ),
                                `Listing ${p.sku} suspended & unpublished.`
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 border border-red-300 text-red-800 rounded-sm hover:bg-red-50 cursor-pointer"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Suspend</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Edit Selected Product + Images + Inventory */}
            {selectedProd && canManageProducts && (
              <div className="space-y-6">
                <form
                  onSubmit={handleSaveProductEdit}
                  className="bg-white border border-silver rounded-sm p-6 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-display font-bold text-navy">
                      {isDe ? `Produkt bearbeiten: ${selectedProd.sku}` : `Edit Product: ${selectedProd.sku}`}
                    </h2>
                    <span className="font-mono text-[11px] text-charcoal/70">
                      Same-Division Categories Only
                    </span>
                  </div>
                  <select
                    value={editCatId}
                    onChange={(e) => setEditCatId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-silver rounded-sm bg-white"
                  >
                    {overview.categories
                      .filter((c) => c.divisionId === selectedProd.divisionId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {isDe ? c.nameDe : c.nameEn}
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={editManufacturer}
                    onChange={(e) => setEditManufacturer(e.target.value)}
                    placeholder="Manufacturer"
                    className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={editNameDe}
                      onChange={(e) => setEditNameDe(e.target.value)}
                      placeholder="Name (DE)"
                      className="px-3 py-2 text-xs border border-silver rounded-sm"
                    />
                    <input
                      type="text"
                      required
                      value={editNameEn}
                      onChange={(e) => setEditNameEn(e.target.value)}
                      placeholder="Name (EN)"
                      className="px-3 py-2 text-xs border border-silver rounded-sm"
                    />
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={editDescDe}
                    onChange={(e) => setEditDescDe(e.target.value)}
                    placeholder="Description (DE)"
                    className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
                  />
                  <textarea
                    rows={2}
                    required
                    value={editDescEn}
                    onChange={(e) => setEditDescEn(e.target.value)}
                    placeholder="Description (EN)"
                    className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editCas}
                      onChange={(e) => setEditCas(e.target.value)}
                      placeholder="CAS Number"
                      className="px-3 py-2 text-xs border border-silver rounded-sm font-mono"
                    />
                    <input
                      type="text"
                      required
                      value={editStorage}
                      onChange={(e) => setEditStorage(e.target.value)}
                      placeholder="Storage Condition"
                      className="px-3 py-2 text-xs border border-silver rounded-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={editPricePermitted}
                        onChange={(e) => setEditPricePermitted(e.target.checked)}
                      />
                      <span>Price Display Permitted</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editPriceCents}
                      onChange={(e) => setEditPriceCents(Number(e.target.value))}
                      className="w-32 px-3 py-2 text-xs border border-silver rounded-sm font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-scientific text-white text-xs font-semibold rounded-sm cursor-pointer"
                  >
                    Save Product Changes
                  </button>
                </form>

                {/* Upload Product Image */}
                <div className="bg-white border border-silver rounded-sm p-6 space-y-3">
                  <div className="flex items-center gap-2 font-display font-bold text-navy text-sm">
                    <ImagePlus className="w-4 h-4 text-scientific" />
                    <span>Attach Product Image ({selectedProd.sku})</span>
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleImageFileSelect(e.target.files?.[0])}
                    className="text-xs"
                  />
                  <input
                    type="text"
                    value={imgUrl}
                    onChange={(e) => setImgUrl(e.target.value)}
                    placeholder="Image URL or uploaded data URL"
                    className="w-full px-3 py-2 text-xs border border-silver rounded-sm font-mono"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={imgAltDe}
                      onChange={(e) => setImgAltDe(e.target.value)}
                      placeholder="Alt Text (DE)"
                      className="px-3 py-2 text-xs border border-silver rounded-sm"
                    />
                    <input
                      type="text"
                      value={imgAltEn}
                      onChange={(e) => setImgAltEn(e.target.value)}
                      placeholder="Alt Text (EN)"
                      className="px-3 py-2 text-xs border border-silver rounded-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void runAction(
                        () =>
                          onAddProductImage(selectedProd.id, {
                            imageUrl: imgUrl,
                            altDe: imgAltDe,
                            altEn: imgAltEn,
                            sortOrder: 1,
                          }),
                        `Image attached to ${selectedProd.sku}.`
                      )
                    }
                    className="px-4 py-2 bg-navy text-white text-xs font-semibold rounded-sm cursor-pointer"
                  >
                    Save Product Image
                  </button>
                </div>
              </div>
            )}

            {/* Create New Draft + Adjust Inventory */}
            <div className="space-y-6">
              {canManageProducts && (
                <form
                  onSubmit={handleCreateDraft}
                  className="bg-white border border-silver rounded-sm p-6 space-y-3"
                >
                  <h2 className="font-display font-bold text-navy">
                    {isDe ? 'Neuen Produktentwurf anlegen' : 'Add New Product Draft (Unpublished)'}
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      placeholder="SKU"
                      className="px-3 py-2 text-xs border border-silver rounded-sm font-mono"
                    />
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                      placeholder="slug"
                      className="px-3 py-2 text-xs border border-silver rounded-sm font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={newDivId}
                      onChange={(e) => setNewDivId(Number(e.target.value))}
                      className="px-2 py-2 text-xs border border-silver rounded-sm bg-white"
                    >
                      {overview.divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.slug}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newCatId}
                      onChange={(e) => setNewCatId(Number(e.target.value))}
                      className="px-2 py-2 text-xs border border-silver rounded-sm bg-white"
                    >
                      {overview.categories
                        .filter((c) => c.divisionId === newDivId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {isDe ? c.nameDe : c.nameEn}
                          </option>
                        ))}
                    </select>
                    <select
                      value={newClassId}
                      onChange={(e) => setNewClassId(Number(e.target.value))}
                      className="px-2 py-2 text-xs border border-silver rounded-sm bg-white"
                    >
                      {overview.classifications.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    value={nameDe}
                    onChange={(e) => setNameDe(e.target.value)}
                    placeholder="Name (DE)"
                    className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
                  />
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Name (EN)"
                    className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={ruoLabeled}
                        onChange={(e) => setRuoLabeled(e.target.checked)}
                      />
                      <span>Manufacturer RUO Labeled</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={priceCents}
                      onChange={(e) => setPriceCents(Number(e.target.value))}
                      className="w-32 px-3 py-2 text-xs border border-silver rounded-sm font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-navy text-white text-xs font-semibold rounded-sm cursor-pointer"
                  >
                    Create Unpublished Draft
                  </button>
                </form>
              )}

              {selectedProd && (canManageProducts || canManageOrders) && (
                <div className="bg-white border border-silver rounded-sm p-6 space-y-3">
                  <div className="flex items-center gap-2 font-display font-bold text-navy text-sm">
                    <Warehouse className="w-4 h-4 text-scientific" />
                    <span>Inventory & Batch Control ({selectedProd.sku})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={invBatch}
                      onChange={(e) => setInvBatch(e.target.value)}
                      placeholder="Batch Lot"
                      className="px-3 py-2 text-xs border border-silver rounded-sm font-mono"
                    />
                    <input
                      type="number"
                      min={0}
                      value={invQty}
                      onChange={(e) => setInvQty(Number(e.target.value))}
                      className="px-3 py-2 text-xs border border-silver rounded-sm font-mono"
                    />
                    <select
                      value={invStockStatus}
                      onChange={(e) => setInvStockStatus(e.target.value)}
                      className="px-2 py-2 text-xs border border-silver rounded-sm bg-white"
                    >
                      <option value="in_stock">in_stock</option>
                      <option value="low_stock">low_stock</option>
                      <option value="out_of_stock">out_of_stock</option>
                      <option value="gated">gated</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={invReason}
                    onChange={(e) => setInvReason(e.target.value)}
                    placeholder="Adjustment Reason"
                    className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      void runAction(
                        () =>
                          onAdjustInventory(selectedProd.id, {
                            batchNumber: invBatch,
                            quantityOnHand: Number(invQty),
                            stockStatus: invStockStatus,
                            reason: invReason,
                          }),
                        `Inventory updated for ${selectedProd.sku}.`
                      )
                    }
                    className="px-4 py-2 border border-navy text-navy text-xs font-semibold rounded-sm hover:bg-lightgrey cursor-pointer"
                  >
                    Record Inventory Adjustment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Regulatory Approvals & Approval History Timeline */}
      {tab === 'approvals' && (
        <div className="space-y-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white border border-silver rounded-sm p-6 space-y-3">
              <h2 className="font-display font-bold text-navy">
                {isDe ? 'Zur Compliance-Prüfung einreichen' : 'Submit Product for Compliance Review'}
              </h2>
              <div className="divide-y divide-silver text-xs">
                {overview.products.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-navy">{p.sku}</span> ·{' '}
                      <span>{p.approvalStatus}</span>
                    </div>
                    <div className="flex gap-2">
                      {canManageProducts && (
                        <button
                          type="button"
                          onClick={() =>
                            void runAction(
                              () =>
                                onSubmitApproval({
                                  productId: p.id,
                                  supportingEvidence:
                                    'Submitted for independent AMG/HWG/ChemG screening.',
                                  jurisdiction: 'DE / EU',
                                  approvalScope: 'Research Division Listing',
                                }),
                              `${p.sku} submitted for regulatory review.`
                            )
                          }
                          className="px-2.5 py-1 border border-silver rounded-sm hover:bg-lightgrey cursor-pointer"
                        >
                          Submit Review
                        </button>
                      )}
                      {canReview && (
                        <button
                          type="button"
                          onClick={() => setDecisionProdId(p.id)}
                          className="px-2.5 py-1 bg-scientific text-white rounded-sm cursor-pointer"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {canReview && (
              <div className="bg-white border border-silver rounded-sm p-6 space-y-3">
                <h2 className="font-display font-bold text-navy">
                  {isDe
                    ? 'Regulatorische Freigabe-Entscheidung (4-Augen-Prinzip)'
                    : 'Regulatory Approval Decision (Four-Eyes Enforced)'}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={decisionProdId}
                    onChange={(e) => setDecisionProdId(Number(e.target.value))}
                    className="px-3 py-2 text-xs border border-silver rounded-sm bg-white"
                  >
                    {overview.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} ({p.approvalStatus})
                      </option>
                    ))}
                  </select>
                  <select
                    value={decisionStatus}
                    onChange={(e) => setDecisionStatus(e.target.value as ApprovalStatus)}
                    className="px-3 py-2 text-xs border border-silver rounded-sm bg-white"
                  >
                    <option value="approved">approved</option>
                    <option value="under_regulatory_review">under_regulatory_review</option>
                    <option value="rejected">rejected</option>
                    <option value="suspended">suspended</option>
                    <option value="expired">expired</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={decisionExpiry}
                  onChange={(e) => setDecisionExpiry(e.target.value)}
                  placeholder="Expires At (ISO-8601)"
                  className="w-full px-3 py-2 text-xs border border-silver rounded-sm font-mono"
                />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={amgScreened}
                      onChange={(e) => setAmgScreened(e.target.checked)}
                    />
                    <span>AMG Screened</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hwgScreened}
                      onChange={(e) => setHwgScreened(e.target.checked)}
                    />
                    <span>HWG Screened</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={chemgScreened}
                      onChange={(e) => setChemgScreened(e.target.checked)}
                    />
                    <span>ChemG Screened</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ruoVerified}
                      onChange={(e) => setRuoVerified(e.target.checked)}
                    />
                    <span>RUO Independently Verified</span>
                  </label>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={publishImmediately}
                    onChange={(e) => setPublishImmediately(e.target.checked)}
                  />
                  <span>Publish if approved & non-expired</span>
                </label>
                <input
                  type="text"
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    void runAction(
                      () =>
                        onDecideApproval({
                          productId: decisionProdId,
                          status: decisionStatus,
                          supportingEvidence: decisionNotes,
                          jurisdiction: 'DE / EU',
                          approvalScope: 'Division Compliance Decision',
                          expiresAt: decisionExpiry,
                          amgScreened,
                          hwgScreened,
                          chemgScreened,
                          ruoIndependentlyVerified: ruoVerified,
                          publishImmediately,
                          notes: decisionNotes,
                        }),
                      'Regulatory approval decision recorded.'
                    )
                  }
                  className="px-4 py-2 bg-scientific text-white text-xs font-semibold rounded-sm cursor-pointer"
                >
                  Record Compliance Decision
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-silver rounded-sm p-6 space-y-3">
            <div className="flex items-center gap-2 font-display font-bold text-navy text-sm">
              <History className="w-4 h-4 text-scientific" />
              <span>Approval History Audit Trail</span>
            </div>
            <div className="divide-y divide-silver text-xs">
              {overview.approvalHistory.map((hist) => {
                const prod = overview.products.find((p) => p.id === hist.productId);
                return (
                  <div key={hist.id} className="py-2.5 flex flex-wrap justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-navy">{prod?.sku ?? hist.productId}</span>{' '}
                      <span className="font-mono text-scientific">
                        {hist.previousStatus ?? 'init'} → {hist.nextStatus}
                      </span>
                      <p className="text-charcoal/80 mt-0.5">{hist.notes}</p>
                    </div>
                    <span className="font-mono text-charcoal/65">
                      {formatGermanDate(hist.createdAt, locale)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Order Operations, Pre-Fulfilment Revalidation, Tracking, Payment Status & Refunds */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {overview.orders.length === 0 ? (
            <div className="bg-white border border-silver rounded-sm p-8 text-sm text-charcoal/70">
              No orders recorded yet.
            </div>
          ) : (
            overview.orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-silver rounded-sm p-5 space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-silver/60 pb-2">
                  <div className="font-mono font-bold text-navy text-sm">
                    {order.orderNumber} · {order.billingName} ·{' '}
                    {formatEuroCents(order.totalGrossCents, locale)}
                  </div>
                  <div className="font-mono">
                    Order: <strong className="text-scientific">{order.status}</strong> · Payment:{' '}
                    <strong>{order.paymentTransaction?.status ?? 'pending'}</strong>
                  </div>
                </div>

                {canManageOrders && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={trackingByOrder[order.id] ?? order.shipment?.trackingNumber ?? ''}
                      onChange={(e) =>
                        setTrackingByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      placeholder="Tracking Number (e.g. DHL-CC-9981)"
                      className="px-2.5 py-1.5 border border-silver rounded-sm font-mono w-56"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void runAction(
                          () =>
                            onFulfilOrder(order.id, {
                              status: 'shipped',
                              carrier: order.shipment?.carrier ?? 'Cold-Chain Courier DE',
                              trackingNumber: trackingByOrder[order.id] || 'DHL-CC-DEMO',
                              notes: 'Revalidated product approval and KYB prior to dispatch.',
                            }),
                          `Order ${order.orderNumber} revalidated and marked shipped.`
                        )
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-navy text-white rounded-sm cursor-pointer"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Revalidate & Ship</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void runAction(
                          () =>
                            onUpdatePaymentStatus(order.id, {
                              status: 'settled',
                              notes: 'SEPA bank settlement confirmed.',
                            }),
                          `Payment settled for ${order.orderNumber}.`
                        )
                      }
                      className="px-3 py-1.5 border border-emerald-300 text-emerald-900 rounded-sm hover:bg-emerald-50 cursor-pointer"
                    >
                      Mark Payment Settled
                    </button>

                    {order.status === 'refund_requested' && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            void runAction(
                              () =>
                                onDecideRefund(
                                  order.id,
                                  'approved',
                                  'Approved via Order Operations Console.'
                                ),
                              `Refund approved for ${order.orderNumber}.`
                            )
                          }
                          className="px-3 py-1.5 bg-emerald-700 text-white rounded-sm cursor-pointer"
                        >
                          Approve Refund
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void runAction(
                              () =>
                                onDecideRefund(
                                  order.id,
                                  'rejected',
                                  'Refund rejected after inspection.'
                                ),
                              `Refund rejected for ${order.orderNumber}.`
                            )
                          }
                          className="px-3 py-1.5 border border-red-300 text-red-800 rounded-sm cursor-pointer"
                        >
                          Reject Refund
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'pharma' && (
        <div className="bg-white border border-silver rounded-sm p-6 space-y-4 max-w-3xl">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-navy">
            <Lock className="w-5 h-5 text-scientific" aria-hidden="true" />
            <span>Pharmaceutical Division Statutory Gate</span>
          </div>
          <div className="space-y-2 text-sm">
            {[
              ['pharmacyLicenseVerified', 'German Pharmacy Operating License (§ 1 ApoG)', pharmaLicense, setPharmaLicense],
              ['distributionArrangementVerified', '§ 52a AMG Wholesale & Distribution Arrangement', pharmaDist, setPharmaDist],
              ['productAuthorizationVerified', 'Medicinal Product Marketing Authorization', pharmaAuth, setPharmaAuth],
              ['dispensingWorkflowVerified', 'Prescription & Dispensing Workflow Verified', pharmaDispense, setPharmaDispense],
              ['transactionsEnabled', 'Enable Pharmaceutical Checkout Transactions', pharmaTxEnabled, setPharmaTxEnabled],
            ].map(([key, label, val, setter]) => (
              <label key={String(key)} className="flex items-center gap-3 p-2.5 border border-silver rounded-sm">
                <input
                  type="checkbox"
                  checked={Boolean(val)}
                  onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                />
                <span className="text-navy font-medium">{String(label)}</span>
              </label>
            ))}
          </div>
          <input
            type="text"
            value={pharmaNotes}
            onChange={(e) => setPharmaNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-silver rounded-sm"
          />
          {canReview && (
            <button
              type="button"
              onClick={() =>
                void runAction(
                  () =>
                    onUpdatePharmaGate({
                      catalogVisible: true,
                      transactionsEnabled: pharmaTxEnabled,
                      pharmacyLicenseVerified: pharmaLicense,
                      distributionArrangementVerified: pharmaDist,
                      productAuthorizationVerified: pharmaAuth,
                      dispensingWorkflowVerified: pharmaDispense,
                      notes: pharmaNotes,
                    }),
                  'Pharmaceutical gate configuration updated.'
                )
              }
              className="px-5 py-2.5 bg-navy text-white text-sm font-medium rounded-sm cursor-pointer"
            >
              Enforce Gate Update
            </button>
          )}
        </div>
      )}

      {tab === 'vault' && (
        <div className="grid lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleUploadDoc}
            className="lg:col-span-5 bg-white border border-silver rounded-sm p-6 space-y-3 h-fit"
          >
            <div className="flex items-center gap-2 font-display font-bold text-navy">
              <FileUp className="w-4 h-4 text-scientific" />
              <span>Upload SHA-256 Document</span>
            </div>
            <select
              value={docProductId}
              onChange={(e) => setDocProductId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-silver rounded-sm bg-white"
            >
              {overview.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as typeof docType)}
                className="px-3 py-2 text-xs border border-silver rounded-sm bg-white"
              >
                <option value="coa">coa</option>
                <option value="sds">sds</option>
                <option value="technical_dossier">technical_dossier</option>
                <option value="regulatory_evidence">regulatory_evidence</option>
              </select>
              <select
                value={docMime}
                onChange={(e) => setDocMime(e.target.value as typeof docMime)}
                className="px-3 py-2 text-xs border border-silver rounded-sm bg-white"
              >
                <option value="text/plain">text/plain</option>
                <option value="application/pdf">application/pdf</option>
              </select>
            </div>
            <input
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
            />
            <input
              type="text"
              required
              value={docFileName}
              onChange={(e) => setDocFileName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-silver rounded-sm font-mono"
            />
            <textarea
              rows={4}
              value={docContentText}
              onChange={(e) => setDocContentText(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-silver rounded-sm font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-scientific text-white text-xs font-semibold rounded-sm cursor-pointer"
            >
              Store & Hash Document
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-silver rounded-sm divide-y divide-silver">
            {overview.documents.length === 0 ? (
              <div className="p-6 text-sm text-charcoal/70">No documents uploaded yet.</div>
            ) : (
              overview.documents.map((doc) => (
                <div key={doc.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="font-semibold text-navy">
                      {doc.title} ({doc.docType})
                    </div>
                    <div className="font-mono text-charcoal/65 truncate">
                      SHA-256: {doc.sha256Hash}
                    </div>
                    <div className="font-mono uppercase text-scientific">
                      {doc.verificationStatus}
                    </div>
                  </div>
                  {canReview && doc.verificationStatus === 'pending_review' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            () => onVerifyDocument(doc.id, 'verified'),
                            `Document #${doc.id} verified.`
                          )
                        }
                        className="px-3 py-1 bg-emerald-700 text-white rounded-sm cursor-pointer"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            () => onVerifyDocument(doc.id, 'rejected'),
                            `Document #${doc.id} rejected.`
                          )
                        }
                        className="px-3 py-1 border border-red-300 text-red-800 rounded-sm cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'kyb' && (
        <div className="bg-white border border-silver rounded-sm divide-y divide-silver">
          {overview.profiles.map((prof) => (
            <div
              key={prof.uid}
              className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="font-semibold text-navy">
                  {prof.organizationName || prof.displayName || prof.email}{' '}
                  <span className="font-mono text-charcoal/70">({prof.email})</span>
                </div>
                <div className="font-mono text-charcoal/70">
                  KYB: <strong className="text-navy">{prof.kybStatus}</strong> · Roles:{' '}
                  {(prof.roles ?? []).join(', ')}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canReview && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        void runAction(
                          () => onReviewKyb(prof.uid, 'verified', 'Institutional KYB approved.'),
                          `KYB verified for ${prof.email}`
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 text-white rounded-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify KYB</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void runAction(
                          () => onReviewKyb(prof.uid, 'rejected', 'Insufficient documentation.'),
                          `KYB rejected for ${prof.email}`
                        )
                      }
                      className="px-2.5 py-1 border border-red-300 text-red-800 rounded-sm cursor-pointer"
                    >
                      Reject
                    </button>
                  </>
                )}
                {isSuperAdmin && (
                  <div className="inline-flex items-center gap-1">
                    <UserCog className="w-3.5 h-3.5 text-navy" />
                    <select
                      value={prof.roles?.[0] ?? 'customer'}
                      onChange={(e) =>
                        void runAction(
                          () => onAssignRole(prof.uid, e.target.value as AppRole),
                          `Assigned ${e.target.value} to ${prof.email}`
                        )
                      }
                      className="px-2 py-1 border border-silver rounded-sm bg-white font-mono"
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'seo' && (
        <SeoAndBlogAdminPanel
          locale={locale}
          overview={overview}
          canEditContent={['content_manager', 'regulatory_reviewer', 'super_administrator'].includes(
            currentRole
          )}
          onSaveSeoPage={onSaveSeoPage}
          onSaveSeoIntegrations={onSaveSeoIntegrations}
          onSaveBlogPost={onSaveBlogPost}
          onFeedback={setFeedback}
        />
      )}

      {tab === 'governance' && (
        <GermanComplianceGovernancePanel
          locale={locale}
          currentRole={currentRole}
          overview={overview}
          onSaveBusinessProfile={onSaveBusinessProfile}
          onSaveEuPharmacyLogo={onSaveEuPharmacyLogo}
          onSaveLegalDocs={onSaveLegalDocs}
          onSaveProductMatrix={onSaveProductMatrix}
          onSaveProductionChecklist={onSaveProductionChecklist}
          onFeedback={setFeedback}
        />
      )}

      {tab === 'inbox' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white border border-silver rounded-sm p-5 space-y-3">
            <h2 className="font-display font-bold text-navy">
              Contact Messages ({overview.contactMessages.length})
            </h2>
            <div className="divide-y divide-silver text-xs">
              {overview.contactMessages.map((msg) => (
                <div key={msg.id} className="py-3 space-y-1">
                  <div className="font-semibold text-navy">
                    {msg.senderName} ({msg.senderEmail}) · {msg.topic}
                  </div>
                  <p className="text-charcoal/80">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-silver rounded-sm p-5 space-y-3">
            <h2 className="font-display font-bold text-navy">
              Newsletter Subscribers ({overview.newsletterSubscribers.length})
            </h2>
            <div className="divide-y divide-silver text-xs font-mono">
              {overview.newsletterSubscribers.map((sub) => (
                <div key={sub.id} className="py-2 flex justify-between">
                  <span>{sub.email}</span>
                  <span>
                    {sub.locale} · {formatGermanDate(sub.consentRecordedAt, locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white border border-silver rounded-sm divide-y divide-silver text-xs">
          {overview.auditLogs.map((log) => (
            <div key={log.id} className="p-3.5 flex flex-wrap justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-navy">{log.action}</span>{' '}
                <span className="font-mono text-charcoal/70">
                  [{log.entityType}:{log.entityId}]
                </span>
                {log.reason && <p className="text-charcoal/80 mt-0.5">{log.reason}</p>}
              </div>
              <div className="font-mono text-charcoal/65">
                {log.actorRole} · {formatGermanDate(log.createdAt, locale)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pre-Publication Preview Mode Modal */}
      {previewProduct && (
        <div
          className="fixed inset-0 z-50 bg-navy/55 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border-2 border-scientific rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-silver pb-3">
              <div className="font-mono text-xs uppercase text-scientific font-bold">
                PRE-PUBLICATION ADMIN PREVIEW · {previewProduct.approvalStatus} /{' '}
                {previewProduct.publicationStatus}
              </div>
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="p-1 text-charcoal/70 hover:text-navy cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <div className="font-mono text-xs text-charcoal/70">{previewProduct.sku}</div>
              <h3 className="font-display text-2xl font-bold text-navy">
                {isDe ? previewProduct.nameDe : previewProduct.nameEn}
              </h3>
              <p className="text-sm text-charcoal/85">
                {isDe ? previewProduct.descriptionDe : previewProduct.descriptionEn}
              </p>
              <div className="p-3 bg-lightgrey border border-silver rounded-sm text-xs">
                {isDe ? previewProduct.regulatoryNoticeDe : previewProduct.regulatoryNoticeEn}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs border-t border-silver pt-3">
                <div>
                  <dt className="text-charcoal/60 font-mono">Manufacturer</dt>
                  <dd className="font-medium text-navy">{previewProduct.manufacturerName}</dd>
                </div>
                <div>
                  <dt className="text-charcoal/60 font-mono">Storage</dt>
                  <dd className="font-medium text-navy">{previewProduct.storageCondition}</dd>
                </div>
                <div>
                  <dt className="text-charcoal/60 font-mono">Price</dt>
                  <dd className="font-mono font-semibold text-navy">
                    {previewProduct.pricePermitted
                      ? formatEuroCents(previewProduct.priceNetCents, locale)
                      : 'Restricted'}
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal/60 font-mono">Documents Linked</dt>
                  <dd className="font-mono text-navy">
                    {overview.documents.filter((d) => d.productId === previewProduct.id).length}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
