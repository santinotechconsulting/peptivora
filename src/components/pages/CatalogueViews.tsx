import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FlaskConical,
  Lock,
  Plus,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import {
  formatEuroCents,
  formatGermanDate,
  hasAllPharmaceuticalPrerequisites,
  type Locale,
} from '../../core/domain/compliance.ts';
import { getCopy } from '../../i18n/translations.ts';
import type {
  DivisionDto,
  PageRoute,
  ProductCategoryDto,
  ProductClassificationDto,
  ProductDto,
  ProductVariantDto,
  PublicGovernanceSummaryDto,
} from '../../types/peptivora.ts';
import { AnimatePresence, motion } from 'motion/react';
import { ProductCard } from '../ui/ProductCard.tsx';
import {
  PRECISION_EASE,
  StaggerRevealGrid,
  StaggerRevealItem,
} from '../ui/MotionPrimitives.tsx';
import { ResilientImage } from '../ui/ResilientImage.tsx';
import { EuPharmacyLogoNotice } from './LegalPages.tsx';

type SortOption = 'default' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'newest';

export function CataloguePage({
  locale,
  divisions,
  categories,
  classifications,
  products,
  initialDivision = 'all',
  initialQuery = '',
  onSelectProduct,
  onAddToCart,
}: {
  locale: Locale;
  divisions: DivisionDto[];
  categories: ProductCategoryDto[];
  classifications: ProductClassificationDto[];
  products: ProductDto[];
  initialDivision?: 'all' | 'research' | 'pharmaceutical';
  initialQuery?: string;
  onSelectProduct: (p: ProductDto) => void;
  onAddToCart: (p: ProductDto) => void;
}) {
  const t = getCopy(locale);
  const isDe = locale === 'de';
  const [query, setQuery] = useState(initialQuery);
  const [divisionFilter, setDivisionFilter] = useState<string>(initialDivision);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [pageSize, setPageSize] = useState<number>(6);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);

  const activeFilterCount =
    (divisionFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (classFilter !== 'all' ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (sortBy !== 'default' ? 1 : 0);

  const researchDiv = divisions.find((d) => d.slug === 'research');

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => {
      if (divisionFilter !== 'all' && p.divisionSlug !== divisionFilter) return false;
      if (categoryFilter !== 'all' && p.categorySlug !== categoryFilter) return false;
      if (classFilter !== 'all' && p.classificationCode !== classFilter) return false;
      if (inStockOnly) {
        const qty = p.inventory.reduce((s, i) => s + i.quantityOnHand, 0);
        if (p.stockStatus !== 'in_stock' || qty <= 0) return false;
      }
      if (!q) return true;
      return (
        p.sku.toLowerCase().includes(q) ||
        p.nameDe.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        (p.casNumber ?? '').toLowerCase().includes(q) ||
        (p.sequence ?? '').toLowerCase().includes(q)
      );
    });

    const sorted = [...list];
    if (sortBy === 'name_asc') {
      sorted.sort((a, b) =>
        (isDe ? a.nameDe : a.nameEn).localeCompare(isDe ? b.nameDe : b.nameEn)
      );
    } else if (sortBy === 'name_desc') {
      sorted.sort((a, b) =>
        (isDe ? b.nameDe : b.nameEn).localeCompare(isDe ? a.nameDe : a.nameEn)
      );
    } else if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.priceNetCents - b.priceNetCents);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.priceNetCents - a.priceNetCents);
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return sorted;
  }, [products, query, divisionFilter, categoryFilter, classFilter, inStockOnly, sortBy, isDe]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, divisionFilter, categoryFilter, classFilter, inStockOnly, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredAndSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2 max-w-3xl">
        <div className="font-mono text-xs uppercase tracking-widest text-scientific">
          {t.brand.name} · {t.nav.catalogue}
        </div>
        <h1 className="font-display text-3xl font-bold text-navy">{t.catalogue.title}</h1>
        <p className="text-sm text-charcoal/80 leading-relaxed">{t.catalogue.subtitle}</p>
      </div>

      {/* Filter, Search, Sort & Page Size Toolbar */}
      <div className="bg-white border border-silver rounded-sm p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2 sm:hidden">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-charcoal/50 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.catalogue.searchPlaceholder}
              aria-label={t.catalogue.searchPlaceholder}
              className="w-full min-h-[44px] pl-9 pr-3 py-2 text-base border border-silver rounded-sm bg-white text-navy focus-visible:outline-2 focus-visible:outline-scientific"
            />
          </div>
          <button
            type="button"
            aria-expanded={mobileFiltersOpen}
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="min-h-[44px] px-3 py-2 border border-silver rounded-sm bg-lightgrey text-navy text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-scientific" aria-hidden="true" />
            <span>{isDe ? 'Filter' : 'Filter'}</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 bg-scientific text-white rounded-sm font-mono text-[10px]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div
          className={`${
            mobileFiltersOpen ? 'grid' : 'hidden'
          } sm:grid sm:grid-cols-2 lg:grid-cols-6 gap-3 items-center`}
        >
          <div className="hidden sm:block relative lg:col-span-2">
            <Search
              className="w-4 h-4 text-charcoal/50 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.catalogue.searchPlaceholder}
              aria-label={t.catalogue.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-sm border border-silver rounded-sm bg-white text-navy focus-visible:outline-2 focus-visible:outline-scientific"
            />
          </div>

          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            aria-label={t.catalogue.allDivisions}
            className="min-h-[44px] sm:min-h-0 px-3 py-2 text-base sm:text-sm border border-silver rounded-sm bg-white text-navy"
          >
            <option value="all">{t.catalogue.allDivisions}</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.slug}>
                {isDe ? d.nameDe : d.nameEn}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label={t.catalogue.allCategories}
            className="min-h-[44px] sm:min-h-0 px-3 py-2 text-base sm:text-sm border border-silver rounded-sm bg-white text-navy"
          >
            <option value="all">{t.catalogue.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {isDe ? c.nameDe : c.nameEn}
              </option>
            ))}
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label={t.catalogue.allClassifications}
            className="min-h-[44px] sm:min-h-0 px-3 py-2 text-base sm:text-sm border border-silver rounded-sm bg-white text-navy"
          >
            <option value="all">{t.catalogue.allClassifications}</option>
            {classifications.map((cls) => (
              <option key={cls.id} value={cls.code}>
                {isDe ? cls.nameDe : cls.nameEn}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label={isDe ? 'Sortierung' : 'Sort by'}
            className="min-h-[44px] sm:min-h-0 px-3 py-2 text-base sm:text-sm border border-silver rounded-sm bg-white text-navy"
          >
            <option value="default">{isDe ? 'Sortierung: Standard' : 'Sort: Featured'}</option>
            <option value="name_asc">{isDe ? 'Name (A–Z)' : 'Name (A–Z)'}</option>
            <option value="name_desc">{isDe ? 'Name (Z–A)' : 'Name (Z–A)'}</option>
            <option value="price_asc">{isDe ? 'Preis aufsteigend' : 'Price: Low to High'}</option>
            <option value="price_desc">{isDe ? 'Preis absteigend' : 'Price: High to Low'}</option>
            <option value="newest">{isDe ? 'Zuletzt geprüft' : 'Recently Updated'}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-silver/50 text-xs">
          <label className="inline-flex items-center gap-2 min-h-[36px] font-medium text-navy cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="w-4 h-4 rounded-sm border-silver text-scientific"
            />
            <span>{t.catalogue.inStockOnly}</span>
          </label>

          <div className="flex items-center gap-3 text-charcoal/80">
            <span className="font-mono">
              {filteredAndSorted.length} {isDe ? 'Einträge' : 'results'}
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label={isDe ? 'Einträge pro Seite' : 'Items per page'}
              className="px-2 py-1 border border-silver rounded-sm bg-white font-mono text-xs"
            >
              <option value={3}>3 / {isDe ? 'Seite' : 'page'}</option>
              <option value={6}>6 / {isDe ? 'Seite' : 'page'}</option>
              <option value={12}>12 / {isDe ? 'Seite' : 'page'}</option>
            </select>
          </div>
        </div>
      </div>

      {paginatedProducts.length === 0 ? (
        <div className="bg-white border border-silver rounded-sm p-10 text-center text-sm text-charcoal/75">
          {t.catalogue.empty}
        </div>
      ) : (
        <>
        <AnimatePresence initial={false}>
          <motion.div
            key={`${safePage}-${divisionFilter}-${categoryFilter}-${classFilter}-${inStockOnly}-${sortBy}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: PRECISION_EASE }}
          >
            <StaggerRevealGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProducts.map((product) => (
                <StaggerRevealItem key={product.id} className="h-full">
                  <ProductCard
                    product={product}
                    locale={locale}
                    divisionTransactionsEnabled={Boolean(researchDiv?.transactionsEnabled)}
                    onSelectProduct={onSelectProduct}
                    onAddToCart={onAddToCart}
                  />
                </StaggerRevealItem>
              ))}
            </StaggerRevealGrid>
          </motion.div>
        </AnimatePresence>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between bg-white border border-silver rounded-sm px-4 py-3 text-xs">
            <span className="font-mono text-charcoal/75">
              {isDe ? 'Seite' : 'Page'} {safePage} / {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-silver rounded-sm disabled:opacity-40 hover:bg-lightgrey cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{isDe ? 'Zurück' : 'Prev'}</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-2.5 py-1.5 font-mono rounded-sm border cursor-pointer ${
                    pageNum === safePage
                      ? 'bg-navy text-white border-navy'
                      : 'border-silver bg-white text-navy hover:bg-lightgrey'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-silver rounded-sm disabled:opacity-40 hover:bg-lightgrey cursor-pointer"
              >
                <span>{isDe ? 'Weiter' : 'Next'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ResearchDivisionPage({
  locale,
  divisions,
  products,
  onSelectProduct,
  onAddToCart,
  onNavigate,
}: {
  locale: Locale;
  divisions: DivisionDto[];
  products: ProductDto[];
  onSelectProduct: (p: ProductDto) => void;
  onAddToCart: (p: ProductDto) => void;
  onNavigate: (r: PageRoute) => void;
}) {
  const isDe = locale === 'de';
  const researchDiv = divisions.find((d) => d.slug === 'research');
  const researchProducts = products.filter((p) => p.divisionSlug === 'research');

  const [enqName, setEnqName] = useState('');
  const [enqEmail, setEnqEmail] = useState('');
  const [enqOrg, setEnqOrg] = useState('');
  const [enqSku, setEnqSku] = useState(researchProducts[0]?.sku ?? '');
  const [enqMsg, setEnqMsg] = useState('');
  const [enqStatus, setEnqStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  async function submitResearchEnquiry(e: FormEvent) {
    e.preventDefault();
    setEnqStatus('idle');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: enqName,
          senderEmail: enqEmail,
          organization: enqOrg,
          topic: `Research Institutional Enquiry (${enqSku || 'General'})`,
          message: enqMsg,
          locale,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setEnqStatus('ok');
      setEnqMsg('');
    } catch {
      setEnqStatus('err');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="bg-white border border-silver rounded-sm p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-scientific">
            <FlaskConical className="w-4 h-4" aria-hidden="true" />
            <span>{isDe ? 'GESCHÄFTSBEREICH FORSCHUNG (RUO)' : 'RESEARCH DIVISION (RUO)'}</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-navy">
            {isDe ? researchDiv?.nameDe : researchDiv?.nameEn}
          </h1>
          <p className="text-sm sm:text-base text-charcoal/85 leading-relaxed">
            {isDe ? researchDiv?.descriptionDe : researchDiv?.descriptionEn}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('account')}
          className="px-5 py-3 bg-navy text-white text-sm font-medium rounded-sm hover:bg-slate-800 shrink-0 cursor-pointer"
        >
          {isDe ? 'Institutionelles KYB einreichen' : 'Submit Institutional KYB'}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {researchProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            locale={locale}
            divisionTransactionsEnabled={Boolean(researchDiv?.transactionsEnabled)}
            onSelectProduct={onSelectProduct}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>

      {/* Institutional Research Enquiry Form */}
      <form
        onSubmit={submitResearchEnquiry}
        className="bg-white border border-silver rounded-sm p-6 sm:p-8 space-y-4"
      >
        <h2 className="font-display text-xl font-bold text-navy">
          {isDe
            ? 'Institutionelle Labor- & Dokumentationsanfrage (Forschungsbereich)'
            : 'Institutional Laboratory & Documentation Enquiry'}
        </h2>
        <div className="grid sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            value={enqName}
            onChange={(e) => setEnqName(e.target.value)}
            placeholder={isDe ? 'Ihr Name' : 'Your Name'}
            className="px-3 py-2 text-sm border border-silver rounded-sm"
          />
          <input
            type="email"
            required
            value={enqEmail}
            onChange={(e) => setEnqEmail(e.target.value)}
            placeholder={isDe ? 'Instituts-E-Mail' : 'Institutional Email'}
            className="px-3 py-2 text-sm border border-silver rounded-sm"
          />
          <input
            type="text"
            value={enqOrg}
            onChange={(e) => setEnqOrg(e.target.value)}
            placeholder={isDe ? 'Institut / Universität' : 'Institute / University'}
            className="px-3 py-2 text-sm border border-silver rounded-sm"
          />
          <select
            value={enqSku}
            onChange={(e) => setEnqSku(e.target.value)}
            className="px-3 py-2 text-sm border border-silver rounded-sm bg-white font-mono"
          >
            {researchProducts.map((p) => (
              <option key={p.id} value={p.sku}>
                {p.sku}
              </option>
            ))}
          </select>
        </div>
        <textarea
          required
          minLength={10}
          rows={3}
          value={enqMsg}
          onChange={(e) => setEnqMsg(e.target.value)}
          placeholder={
            isDe
              ? 'Beschreiben Sie Ihr In-vitro-/Analyseziel oder Ihren Dokumentationsbedarf…'
              : 'Describe your in-vitro/analytical workflow or documentation requirements…'
          }
          className="w-full px-3 py-2 text-sm border border-silver rounded-sm"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-scientific text-white text-sm font-medium rounded-sm hover:bg-blue-700 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isDe ? 'Forschungsanfrage senden' : 'Submit Research Enquiry'}</span>
          </button>
          {enqStatus === 'ok' && (
            <span className="text-xs font-medium text-emerald-800">
              {isDe ? 'Anfrage protokolliert.' : 'Enquiry logged.'}
            </span>
          )}
          {enqStatus === 'err' && (
            <span className="text-xs font-medium text-red-800">
              {isDe ? 'Bitte prüfen Sie Ihre Eingaben.' : 'Please verify your inputs.'}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

export function PharmaceuticalDivisionPage({
  locale,
  divisions,
  governance,
  isSignedIn,
  onNavigate,
  onValidateDispense,
}: {
  locale: Locale;
  divisions: DivisionDto[];
  governance?: PublicGovernanceSummaryDto | null;
  isSignedIn: boolean;
  onNavigate: (r: PageRoute) => void;
  onValidateDispense: (payload: {
    productId: number;
    prescriptionReference: string;
    prescriberLanr: string;
    issueDateIso: string;
    pharmacistLicenseId: string;
    dispensingPharmacyName: string;
  }) => Promise<{ protocolCode: string; productSku: string }>;
}) {
  const t = getCopy(locale);
  const isDe = locale === 'de';
  const pharmaDiv = divisions.find((d) => d.slug === 'pharmaceutical');
  const allMet = pharmaDiv ? hasAllPharmaceuticalPrerequisites(pharmaDiv) : false;
  const workflowUnlocked = Boolean(pharmaDiv?.transactionsEnabled && allMet);

  const [rxRef, setRxRef] = useState('');
  const [lanr, setLanr] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [pharmacistId, setPharmacistId] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [rxFeedback, setRxFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function handleDispenseTest(e: FormEvent) {
    e.preventDefault();
    setRxFeedback(null);
    try {
      const res = await onValidateDispense({
        productId: 6,
        prescriptionReference: rxRef,
        prescriberLanr: lanr,
        issueDateIso: issueDate,
        pharmacistLicenseId: pharmacistId,
        dispensingPharmacyName: pharmacyName,
      });
      setRxFeedback({
        type: 'ok',
        text: `Dispensing protocol validated: ${res.protocolCode}`,
      });
    } catch (err) {
      setRxFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Restricted dispensing blocked.',
      });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="bg-navy text-white rounded-sm p-8 sm:p-10 grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase px-2.5 py-1 rounded-sm border border-amber-400/50 bg-amber-400/10 text-amber-200">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {workflowUnlocked ? t.pharma.unlockedBadge : t.pharma.lockedBadge}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">{t.pharma.title}</h1>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">{t.pharma.subtitle}</p>
        </div>
        <div className="lg:col-span-5 aspect-[4/3] rounded-sm overflow-hidden border border-white/15">
          <ResilientImage
            src="/src/assets/images/pharma_gmp_vault_1794861155822.jpg"
            alt={isDe ? 'Pharmazeutischer Sicherheitsbereich' : 'Pharmaceutical Cleanroom'}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-sm p-5 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm leading-relaxed">{t.pharma.disabledBanner}</p>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-navy">{t.pharma.checklistTitle}</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {t.pharma.pillars.map((pillar) => {
            const verified = Boolean(
              pharmaDiv && pharmaDiv[pillar.key as keyof DivisionDto] === true
            );
            return (
              <div
                key={pillar.key}
                className="bg-white border border-silver rounded-sm p-6 flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <h3 className="font-display font-bold text-navy">{pillar.title}</h3>
                  <p className="text-sm text-charcoal/80 leading-relaxed">{pillar.desc}</p>
                </div>
                <span
                  className={`font-mono text-[11px] uppercase px-2 py-1 rounded-sm border shrink-0 ${
                    verified
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-slate-100 border-silver text-charcoal/75'
                  }`}
                >
                  {verified ? t.common.verified : t.common.pending}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <EuPharmacyLogoNotice
        locale={locale}
        governance={governance}
        pharmaPrerequisitesMet={allMet}
      />

      {/* Restricted Prescription & Pharmacist Dispensing Gate */}
      <form
        onSubmit={handleDispenseTest}
        className="bg-white border border-silver rounded-sm p-6 sm:p-8 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-navy">
            {isDe
              ? 'Eingeschränkter Rezept- & Apotheken-Abgabe-Workflow (§ 48 AMG)'
              : 'Restricted Prescription & Pharmacist Dispensing Workflow (§ 48 AMG)'}
          </h2>
          <span className="font-mono text-[11px] uppercase px-2 py-1 rounded-sm border border-silver bg-lightgrey">
            {workflowUnlocked
              ? isDe
                ? 'Freigegeben'
                : 'Authorized'
              : isDe
                ? 'Serverseitig deaktiviert'
                : 'Server-Locked'}
          </span>
        </div>
        <p className="text-xs text-charcoal/75 leading-relaxed">
          {isDe
            ? 'Normale Kundenkassen können diesen Prozess niemals umgehen. Solange die vier gesetzlichen Voraussetzungen in Deutschland nicht verifiziert sind, lehnt der Server jede Rezeptprüfung ab.'
            : 'Standard customer checkout can never bypass this workflow. While any of the four German statutory prerequisites remain unverified, the server blocks all dispensing attempts.'}
        </p>

        <fieldset disabled={!workflowUnlocked || !isSignedIn} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 disabled:opacity-60">
          <input
            type="text"
            value={rxRef}
            onChange={(e) => setRxRef(e.target.value)}
            placeholder={isDe ? 'Rezept-Referenz / eRezept-ID' : 'Prescription / eRezept Reference'}
            className="px-3 py-2 text-sm border border-silver rounded-sm"
          />
          <input
            type="text"
            value={lanr}
            onChange={(e) => setLanr(e.target.value)}
            placeholder={isDe ? '9-stellige Arzt-LANR' : '9-digit Prescriber LANR'}
            className="px-3 py-2 text-sm border border-silver rounded-sm font-mono"
          />
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            aria-label="Prescription Issue Date"
            className="px-3 py-2 text-sm border border-silver rounded-sm"
          />
          <input
            type="text"
            value={pharmacistId}
            onChange={(e) => setPharmacistId(e.target.value)}
            placeholder={isDe ? 'Apotheker-Approbation / ID' : 'Pharmacist License ID'}
            className="px-3 py-2 text-sm border border-silver rounded-sm"
          />
          <input
            type="text"
            value={pharmacyName}
            onChange={(e) => setPharmacyName(e.target.value)}
            placeholder={isDe ? 'Abgebende Apotheke (§ 1 ApoG)' : 'Dispensing Pharmacy Name'}
            className="px-3 py-2 text-sm border border-silver rounded-sm sm:col-span-2"
          />
        </fieldset>

        {rxFeedback && (
          <div
            className={`p-3 text-xs rounded-sm border ${
              rxFeedback.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {rxFeedback.text}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            disabled={!workflowUnlocked || !isSignedIn}
            className="px-5 py-2.5 bg-navy text-white text-xs font-semibold rounded-sm disabled:opacity-45 cursor-pointer"
          >
            {isDe ? 'Rezept & Apothekenabgabe prüfen' : 'Validate Prescription & Dispensing'}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="px-4 py-2 border border-navy text-navy text-xs font-medium rounded-sm hover:bg-lightgrey cursor-pointer"
          >
            {isDe ? 'Apotheken- & Behördenkontakt' : 'Pharmacy Licensing Inquiry'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProductDetailPage({
  locale,
  product,
  divisionTransactionsEnabled,
  isSignedIn,
  onBack,
  onAddToCart,
  onDownloadDocument,
}: {
  locale: Locale;
  product: ProductDto | null;
  divisionTransactionsEnabled: boolean;
  isSignedIn: boolean;
  onBack: () => void;
  onAddToCart: (p: ProductDto, variant?: ProductVariantDto | null) => void;
  onDownloadDocument: (docId: number, fileName: string) => Promise<void>;
}) {
  const t = getCopy(locale);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    product?.variants[0]?.id ?? null
  );
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [docError, setDocError] = useState('');

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-charcoal/80">
          {locale === 'de' ? 'Kein Produkt ausgewählt.' : 'No product selected.'}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-navy text-white text-sm rounded-sm cursor-pointer"
        >
          {t.productDetail.backToCatalogue}
        </button>
      </div>
    );
  }

  const name = locale === 'de' ? product.nameDe : product.nameEn;
  const description = locale === 'de' ? product.descriptionDe : product.descriptionEn;
  const technical =
    locale === 'de' ? product.technicalSummaryDe : product.technicalSummaryEn;
  const notice = locale === 'de' ? product.regulatoryNoticeDe : product.regulatoryNoticeEn;
  const className = locale === 'de' ? product.classificationNameDe : product.classificationNameEn;
  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0] ?? null;

  const activePrice = selectedVariant?.priceNetCents ?? product.priceNetCents;
  const totalQty = product.inventory.reduce((s, inv) => s + inv.quantityOnHand, 0);
  const orderable =
    divisionTransactionsEnabled &&
    product.divisionSlug === 'research' &&
    product.pricePermitted &&
    product.stockStatus === 'in_stock' &&
    totalQty > 0;

  const activeImage = product.images[activeImageIdx] ?? product.images[0];

  async function triggerDownload(docId: number, fileName: string) {
    setDocError('');
    try {
      await onDownloadDocument(docId, fileName);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Download failed');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:py-10 space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 min-h-[40px] text-sm font-medium text-navy hover:text-scientific cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>{t.productDetail.backToCatalogue}</span>
      </button>

      {product.isDemonstrationRecord && (
        <div className="bg-blue-50 border border-blue-200 text-navy px-4 py-3 rounded-sm text-xs font-medium">
          {t.productDetail.demoBanner}
        </div>
      )}

      <div className="bg-white border border-silver rounded-sm p-6 sm:p-10 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-4">
          <div className="aspect-[4/3] bg-lightgrey border border-silver rounded-sm overflow-hidden">
            <ResilientImage
              src={activeImage?.imageUrl ?? null}
              alt={locale === 'de' ? activeImage?.altDe ?? name : activeImage?.altEn ?? name}
              className="w-full h-full object-cover"
            />
          </div>

          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-[4/3] rounded-sm overflow-hidden border cursor-pointer ${
                    idx === activeImageIdx ? 'border-scientific ring-2 ring-scientific/30' : 'border-silver'
                  }`}
                >
                  <ResilientImage
                    src={img.imageUrl}
                    alt={locale === 'de' ? img.altDe : img.altEn}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="bg-lightgrey border border-silver/70 rounded-sm p-4 text-xs text-charcoal/85 leading-relaxed">
            {notice}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-scientific mb-1.5">
              {product.sku} · {locale === 'de' ? product.categoryNameDe : product.categoryNameEn}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy">{name}</h1>
            <p className="text-sm sm:text-base text-charcoal/85 leading-relaxed mt-3">
              {description}
            </p>
            {technical && (
              <p className="text-sm text-charcoal/75 leading-relaxed mt-2">{technical}</p>
            )}
          </div>

          {product.variants.length > 0 && (
            <div className="space-y-2">
              <div className="font-mono text-xs uppercase tracking-wider text-charcoal/70">
                {t.productDetail.variants}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-sm border cursor-pointer ${
                      selectedVariant?.id === variant.id
                        ? 'border-scientific bg-blue-50 text-navy'
                        : 'border-silver bg-white text-charcoal hover:bg-lightgrey'
                    }`}
                  >
                    {locale === 'de' ? variant.labelDe : variant.labelEn}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-5 bg-lightgrey border border-silver rounded-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              {product.pricePermitted ? (
                <>
                  <div className="font-mono text-2xl font-bold text-navy tabular-nums">
                    {formatEuroCents(activePrice, locale)}
                  </div>
                  <div className="text-xs text-charcoal/70">{t.catalogue.priceOnApproved}</div>
                </>
              ) : (
                <div className="inline-flex items-center gap-2 text-sm font-medium text-charcoal/80">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  <span>{t.catalogue.priceRestricted}</span>
                </div>
              )}
            </div>

            {orderable && (
              <button
                type="button"
                onClick={() => onAddToCart(product, selectedVariant)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-scientific text-white text-sm font-semibold rounded-sm hover:bg-blue-700 cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{t.catalogue.addToCart}</span>
              </button>
            )}
          </div>

          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 border-t border-silver pt-5 text-sm">
            {[
              [t.productDetail.classification, className],
              [t.productDetail.manufacturer, product.manufacturerName],
              [t.productDetail.cas, product.casNumber || '—'],
              [t.productDetail.formula, product.molecularFormula || '—'],
              [t.productDetail.weight, product.molecularWeight || '—'],
              [t.productDetail.storage, product.storageCondition],
              [
                t.productDetail.batch,
                product.inventory[0]?.batchNumber
                  ? `${product.inventory[0].batchNumber} (${totalQty})`
                  : '—',
              ],
              [
                t.productDetail.expiry,
                product.approvalExpiresAt
                  ? formatGermanDate(product.approvalExpiresAt, locale)
                  : '—',
              ],
            ].map(([label, val]) => (
              <div key={String(label)} className="border-b border-silver/50 pb-2">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-charcoal/60">
                  {label}
                </dt>
                <dd className="text-navy font-medium mt-0.5 break-words">{val}</dd>
              </div>
            ))}
            {product.sequence && (
              <div className="sm:col-span-2 border-b border-silver/50 pb-2">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-charcoal/60">
                  {t.productDetail.sequence}
                </dt>
                <dd className="font-mono text-xs text-navy mt-0.5 break-all">{product.sequence}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Linked Documentation Vault Section */}
      <section className="bg-white border border-silver rounded-sm p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-navy">
            {t.productDetail.documentsTitle}
          </h2>
          {!isSignedIn && (
            <span className="text-xs text-charcoal/75">{t.productDetail.signInForDocs}</span>
          )}
        </div>

        {docError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded-sm">
            {docError}
          </div>
        )}

        {product.documents.length === 0 ? (
          <p className="text-sm text-charcoal/70">{t.productDetail.noDocs}</p>
        ) : (
          <div className="divide-y divide-silver border border-silver rounded-sm">
            {product.documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex flex-wrap items-center justify-between gap-4 text-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-scientific" aria-hidden="true" />
                    <span className="font-semibold text-navy">{doc.title}</span>
                    <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded-sm border border-silver bg-lightgrey">
                      {doc.docType}
                    </span>
                    {doc.verificationStatus === 'verified' && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        {t.common.verified}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-charcoal/65 break-all">
                    SHA-256: {doc.sha256Hash}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => triggerDownload(doc.id, doc.fileName)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-silver rounded-sm text-xs font-medium text-navy hover:bg-lightgrey cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.productDetail.downloadDoc}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sticky Mobile Action Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-silver px-4 py-3 shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0">
          {product.pricePermitted ? (
            <>
              <div className="font-mono text-lg font-bold text-navy tabular-nums">
                {formatEuroCents(activePrice, locale)}
              </div>
              <div className="text-[11px] text-charcoal/70 truncate">
                {selectedVariant
                  ? locale === 'de'
                    ? selectedVariant.labelDe
                    : selectedVariant.labelEn
                  : t.catalogue.priceOnApproved}
              </div>
            </>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal/80">
              <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{t.catalogue.priceRestricted}</span>
            </div>
          )}
        </div>
        {orderable && (
          <button
            type="button"
            onClick={() => onAddToCart(product, selectedVariant)}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 bg-scientific text-white text-xs font-semibold rounded-sm hover:bg-blue-700 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{t.catalogue.addToCart}</span>
          </button>
        )}
      </div>
    </div>
  );
}
