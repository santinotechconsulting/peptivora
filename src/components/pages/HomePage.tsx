import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  FlaskConical,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { formatGermanDate, type Locale } from '../../core/domain/compliance.ts';
import { getCopy } from '../../i18n/translations.ts';
import type {
  BlogPostDto,
  DivisionDto,
  PageRoute,
  ProductDto,
} from '../../types/peptivora.ts';
import {
  PRECISION_EASE,
  RevealSection,
  StaggerRevealGrid,
  StaggerRevealItem,
} from '../ui/MotionPrimitives.tsx';
import { ProductCard } from '../ui/ProductCard.tsx';
import { ResilientImage } from '../ui/ResilientImage.tsx';

interface HomePageProps {
  locale: Locale;
  divisions: DivisionDto[];
  products: ProductDto[];
  blogPosts: BlogPostDto[];
  onNavigate: (route: PageRoute) => void;
  onSelectProduct: (product: ProductDto) => void;
  onAddToCart: (product: ProductDto) => void;
}

export function HomePage({
  locale,
  divisions,
  products,
  blogPosts,
  onNavigate,
  onSelectProduct,
  onAddToCart,
}: HomePageProps) {
  const t = getCopy(locale);
  const researchDiv = divisions.find((d) => d.slug === 'research');
  const pharmaDiv = divisions.find((d) => d.slug === 'pharmaceutical');

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [newsletterError, setNewsletterError] = useState('');

  async function handleNewsletterSubmit(e: FormEvent) {
    e.preventDefault();
    setNewsletterStatus('submitting');
    setNewsletterError('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, locale }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed');
      }
      setNewsletterStatus('done');
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterStatus('error');
      setNewsletterError(err instanceof Error ? err.message : 'Subscription failed');
    }
  }

  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="relative bg-lab-grid-dark text-white overflow-hidden border-b border-navy/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20 grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: PRECISION_EASE }}
            className="lg:col-span-7 space-y-5 sm:space-y-6"
          >
            <div className="font-mono text-[11px] sm:text-xs tracking-[0.18em] uppercase text-blue-300">
              {t.home.eyebrow}
            </div>
            <h1 className="font-display text-3xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.08] text-white">
              {t.home.headline}
            </h1>
            <p className="text-sm sm:text-lg text-slate-200 max-w-2xl leading-relaxed">
              {t.home.supporting}
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('research')}
                className="btn-precision group inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 bg-scientific hover:bg-blue-500 text-white text-sm font-semibold rounded-sm shadow-sm cursor-pointer"
              >
                <span>{t.home.ctaPrimary}</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('quality')}
                className="btn-precision inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-semibold rounded-sm cursor-pointer"
              >
                <span>{t.home.ctaSecondary}</span>
              </button>
            </div>
            <div className="pt-4 border-t border-white/15 text-xs text-slate-300 leading-relaxed max-w-2xl">
              {t.brand.demoNotice}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.38, delay: 0.08, ease: PRECISION_EASE }}
            className="lg:col-span-5"
          >
            <div className="group relative aspect-[16/10] lg:aspect-[4/3] rounded-sm overflow-hidden border border-white/20 bg-navy/60 shadow-2xl">
              <ResilientImage
                src="/src/assets/images/hero_biotech_lab_1794861146394.jpg"
                alt={
                  locale === 'de'
                    ? 'PEPTIVORA Biotechnologie-Labor'
                    : 'PEPTIVORA Biotechnology Laboratory'
                }
                priority
                width={960}
                height={720}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Brand Introduction */}
      <section className="bg-white border-b border-silver/60 py-14 sm:py-16">
        <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-5">
            <div className="font-mono text-xs uppercase tracking-widest text-scientific mb-2">
              {t.home.introEyebrow}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy leading-tight">
              {t.home.introTitle}
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-4">
            <p className="text-base text-charcoal/85 leading-relaxed">{t.home.introBody}</p>
            <div className="flex flex-wrap gap-6 pt-2 text-sm">
              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="group font-semibold text-scientific hover:underline inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{t.nav.about}</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('faq')}
                className="group font-semibold text-navy hover:text-scientific inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>{t.nav.faq}</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* Two Divisions Overview */}
      <section className="bg-lab-grid-light border-b border-silver/60 py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy mb-8">
              {t.home.divisionsTitle}
            </h2>
          </RevealSection>
          <StaggerRevealGrid className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Research Division Card */}
            <StaggerRevealItem>
              <div className="surface-card h-full bg-white border border-silver/80 rounded-sm p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-scientific">
                      <FlaskConical className="w-4 h-4" aria-hidden="true" />
                      {locale === 'de' ? 'Bereich 01 · Forschung' : 'Division 01 · Research'}
                    </span>
                    <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded-sm border border-emerald-300 bg-emerald-50 text-emerald-900">
                      {researchDiv?.transactionsEnabled
                        ? locale === 'de'
                          ? 'KYB-Bestellung aktiv'
                          : 'KYB Ordering Active'
                        : locale === 'de'
                          ? 'Gesperrt'
                          : 'Locked'}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-navy mb-3">
                    {locale === 'de'
                      ? researchDiv?.nameDe ?? 'Geschäftsbereich Forschung'
                      : researchDiv?.nameEn ?? 'Research Division'}
                  </h3>
                  <p className="text-sm text-charcoal/80 leading-relaxed mb-6">
                    {locale === 'de' ? researchDiv?.descriptionDe : researchDiv?.descriptionEn}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('research')}
                  className="btn-precision group inline-flex items-center justify-between w-full min-h-[44px] px-4 py-3 bg-navy text-white text-sm font-medium rounded-sm hover:bg-slate-800 cursor-pointer"
                >
                  <span>{locale === 'de' ? 'Forschungsbereich öffnen' : 'Open Research Division'}</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </StaggerRevealItem>

            {/* Pharmaceutical Division Card */}
            <StaggerRevealItem>
              <div className="surface-card h-full bg-white border border-silver/80 rounded-sm p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-charcoal/70">
                      <Lock className="w-4 h-4" aria-hidden="true" />
                      {locale === 'de' ? 'Bereich 02 · Pharmazie' : 'Division 02 · Pharmaceutical'}
                    </span>
                    <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded-sm border border-amber-300 bg-amber-50 text-amber-900">
                      {pharmaDiv?.transactionsEnabled
                        ? t.pharma.unlockedBadge
                        : t.pharma.lockedBadge}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-navy mb-3">
                    {locale === 'de'
                      ? pharmaDiv?.nameDe ?? 'Pharmazeutischer Bereich'
                      : pharmaDiv?.nameEn ?? 'Pharmaceutical Division'}
                  </h3>
                  <p className="text-sm text-charcoal/80 leading-relaxed mb-6">
                    {locale === 'de' ? pharmaDiv?.descriptionDe : pharmaDiv?.descriptionEn}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('pharmaceutical')}
                  className="btn-precision group inline-flex items-center justify-between w-full min-h-[44px] px-4 py-3 border border-navy text-navy text-sm font-medium rounded-sm hover:bg-lightgrey cursor-pointer"
                >
                  <span>
                    {locale === 'de' ? 'Regulatorischen Status prüfen' : 'Inspect Regulatory Gate'}
                  </span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </StaggerRevealItem>
          </StaggerRevealGrid>
        </div>
      </section>

      {/* Featured Approved Offerings */}
      <section className="bg-white border-b border-silver/60 py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy">
                {t.home.featuredTitle}
              </h2>
              <p className="text-sm text-charcoal/75 mt-1.5 max-w-2xl">{t.home.featuredSub}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('catalogue')}
              className="group inline-flex items-center gap-2 text-sm font-semibold text-scientific hover:underline cursor-pointer shrink-0"
            >
              <span>{t.nav.catalogue}</span>
              <ArrowRight
                className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </RevealSection>

          <StaggerRevealGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 3).map((product) => (
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
        </div>
      </section>

      {/* Quality Assurance & Scientific Documentation Split */}
      <section className="bg-lightgrey border-b border-silver/60 py-14 sm:py-16">
        <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          <div className="group aspect-[16/10] rounded-sm overflow-hidden border border-silver bg-white shadow-sm">
            <ResilientImage
              src="/src/assets/images/quality_hplc_lab_1794861843624.jpg"
              alt={
                locale === 'de'
                  ? 'Analytisches HPLC-Qualitätslabor'
                  : 'Analytical HPLC Quality Laboratory'
              }
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          </div>
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-scientific">
              <FileCheck2 className="w-4 h-4" aria-hidden="true" />
              <span>{t.nav.quality}</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy">
              {t.home.qaPreviewTitle}
            </h2>
            <p className="text-sm sm:text-base text-charcoal/85 leading-relaxed">
              {t.home.qaPreviewBody}
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('quality')}
                className="btn-precision min-h-[44px] px-5 py-2.5 bg-navy text-white text-sm font-medium rounded-sm hover:bg-slate-800 cursor-pointer"
              >
                {t.nav.quality}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('knowledge')}
                className="btn-precision min-h-[44px] px-5 py-2.5 bg-white border border-silver text-navy text-sm font-medium rounded-sm hover:bg-slate-50 inline-flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-scientific" aria-hidden="true" />
                <span>{t.home.docsPreviewTitle}</span>
              </button>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* Educational Articles & Company Credibility */}
      <section className="bg-white border-b border-silver/60 py-14 sm:py-16">
        <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 lg:gap-12">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-navy">{t.home.articlesTitle}</h2>
              <button
                type="button"
                onClick={() => onNavigate('blog')}
                className="text-sm font-semibold text-scientific hover:underline cursor-pointer"
              >
                {t.nav.blog} →
              </button>
            </div>
            <div className="space-y-4">
              {blogPosts.slice(0, 2).map((post) => (
                <article
                  key={post.id}
                  className="surface-card p-5 bg-lightgrey border border-silver/70 rounded-sm flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-charcoal/65 mb-1">
                      {(locale === 'de' ? post.category?.nameDe : post.category?.nameEn) ?? ''} ·{' '}
                      {formatGermanDate(post.publishedAt, locale)}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-navy">
                      {locale === 'de' ? post.titleDe : post.titleEn}
                    </h3>
                    <p className="text-sm text-charcoal/80 mt-1.5 leading-relaxed">
                      {locale === 'de' ? post.excerptDe : post.excerptEn}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('blog')}
                    className="self-start text-xs font-semibold text-scientific hover:underline cursor-pointer"
                  >
                    {locale === 'de' ? 'Fachbeitrag lesen' : 'Read article'} →
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-lab-grid-dark text-white p-6 sm:p-8 rounded-sm space-y-5 border border-navy">
            <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-blue-300">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Governance</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">{t.home.credibilityTitle}</h2>
            <ul className="space-y-3 text-sm text-slate-200 leading-relaxed">
              {t.home.credibilityPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </RevealSection>
      </section>

      {/* Newsletter & Contact CTA */}
      <section className="bg-lightgrey py-14 sm:py-16">
        <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="surface-card bg-white border border-silver rounded-sm p-6 sm:p-8 space-y-4">
            <h2 className="font-display text-xl font-bold text-navy">{t.home.newsletterTitle}</h2>
            <p className="text-sm text-charcoal/80">{t.home.newsletterSub}</p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder={t.home.newsletterPlaceholder}
                aria-label={t.home.newsletterPlaceholder}
                className="flex-1 min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-silver rounded-sm bg-white text-navy focus-visible:outline-2 focus-visible:outline-scientific"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'submitting'}
                className="btn-precision min-h-[44px] px-5 py-2.5 bg-scientific text-white text-sm font-medium rounded-sm hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {t.home.newsletterSubmit}
              </button>
            </form>
            {newsletterStatus === 'done' && (
              <p className="animate-pv-fade-up text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-sm">
                {t.home.newsletterSuccess}
              </p>
            )}
            {newsletterStatus === 'error' && (
              <p className="animate-pv-fade-up text-xs font-medium text-red-800 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">
                {newsletterError}
              </p>
            )}
          </div>

          <div className="surface-card bg-navy text-white rounded-sm p-6 sm:p-8 flex flex-col justify-between space-y-4 border border-navy">
            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold text-white">{t.home.contactCtaTitle}</h2>
              <p className="text-sm text-slate-200 leading-relaxed">{t.home.contactCtaBody}</p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="btn-precision group inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 bg-white text-navy text-sm font-semibold rounded-sm hover:bg-slate-100 cursor-pointer"
              >
                <span>{t.home.contactCtaButton}</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </RevealSection>
      </section>
    </div>
  );
}
