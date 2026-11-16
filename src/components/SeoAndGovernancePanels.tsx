import { useState, type FormEvent } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  FlaskConical,
  Globe,
  Lock,
  Scale,
  Search,
  ShieldAlert,
} from 'lucide-react';
import {
  buildDefaultProductRegulatoryMatrixEntry,
} from '../core/compliance/governanceDefaults.ts';
import { GERMAN_KEYWORD_FRAMEWORK } from '../core/seo/seoEngine.ts';
import type { AppRole, Locale } from '../core/domain/compliance.ts';
import type {
  ComplianceOverviewResponse,
  PageRoute,
  SeoPageConfigDto,
} from '../types/peptivora.ts';

interface SeoAndBlogPanelProps {
  locale: Locale;
  overview: ComplianceOverviewResponse;
  canEditContent: boolean;
  onSaveSeoPage: (payload: SeoPageConfigDto) => Promise<void>;
  onSaveSeoIntegrations: (payload: Record<string, unknown>) => Promise<void>;
  onSaveBlogPost: (payload: Record<string, unknown>) => Promise<void>;
  onFeedback: (msg: { type: 'ok' | 'err'; text: string } | null) => void;
}

export function SeoAndBlogAdminPanel({
  locale,
  overview,
  canEditContent,
  onSaveSeoPage,
  onSaveSeoIntegrations,
  onSaveBlogPost,
  onFeedback,
}: SeoAndBlogPanelProps) {
  const isDe = locale === 'de';
  const [subTab, setSubTab] = useState<'onpage' | 'keywords' | 'blogcms' | 'reporting'>('onpage');

  // On-Page SEO form
  const [selectedRoute, setSelectedRoute] = useState<PageRoute>(
    overview.seoPages[0]?.route ?? 'home'
  );
  const currentSeo =
    overview.seoPages.find((p) => p.route === selectedRoute) ?? overview.seoPages[0];
  const [seoForm, setSeoForm] = useState<SeoPageConfigDto>(currentSeo);

  function selectSeoRoute(nextRoute: PageRoute) {
    setSelectedRoute(nextRoute);
    const found = overview.seoPages.find((p) => p.route === nextRoute);
    if (found) setSeoForm(found);
  }

  // Blog CMS form
  const [editPostId, setEditPostId] = useState<number | undefined>(overview.blogPosts[0]?.id);
  const firstPost = overview.blogPosts[0];
  const [blogSlug, setBlogSlug] = useState(firstPost?.slug ?? 'peptid-analytik-leitfaden');
  const [blogCatId, setBlogCatId] = useState<number>(
    firstPost?.categoryId ?? overview.blogCategories[0]?.id ?? 1
  );
  const [blogAuthorId, setBlogAuthorId] = useState<number>(
    firstPost?.authorId ?? overview.authors[0]?.id ?? 1
  );
  const [blogTitleDe, setBlogTitleDe] = useState(firstPost?.titleDe ?? '');
  const [blogTitleEn, setBlogTitleEn] = useState(firstPost?.titleEn ?? '');
  const [blogExcerptDe, setBlogExcerptDe] = useState(firstPost?.excerptDe ?? '');
  const [blogExcerptEn, setBlogExcerptEn] = useState(firstPost?.excerptEn ?? '');
  const [blogBodyDe, setBlogBodyDe] = useState(firstPost?.bodyDe ?? '');
  const [blogBodyEn, setBlogBodyEn] = useState(firstPost?.bodyEn ?? '');
  const [blogImage, setBlogImage] = useState(
    firstPost?.imageUrl ?? '/src/assets/images/qa_analytical_hplc_1794861151090.jpg'
  );
  const [blogTags, setBlogTags] = useState((firstPost?.tags ?? ['Peptidanalytik']).join(', '));
  const [blogRefs, setBlogRefs] = useState(firstPost?.referencesText ?? '');
  const [blogReviewStatus, setBlogReviewStatus] = useState<'draft' | 'peer_reviewed' | 'published'>(
    firstPost?.editorialReviewStatus ?? 'published'
  );
  const [blogPublished, setBlogPublished] = useState<boolean>(firstPost?.isPublished ?? true);
  const [blogPublishDate, setBlogPublishDate] = useState<string>(
    (firstPost?.publishedAt ?? new Date().toISOString()).slice(0, 10)
  );
  const [blogSeoTitleDe, setBlogSeoTitleDe] = useState(firstPost?.seoTitleDe ?? '');
  const [blogSeoTitleEn, setBlogSeoTitleEn] = useState(firstPost?.seoTitleEn ?? '');
  const [blogSeoDescDe, setBlogSeoDescDe] = useState(firstPost?.seoDescriptionDe ?? '');
  const [blogSeoDescEn, setBlogSeoDescEn] = useState(firstPost?.seoDescriptionEn ?? '');

  // Google Integrations & SEO Reporting state
  const [gscCode, setGscCode] = useState(overview.seoIntegrations.searchConsoleVerificationMeta);
  const [ga4Id, setGa4Id] = useState(overview.seoIntegrations.ga4MeasurementId);
  const [gtmId, setGtmId] = useState(overview.seoIntegrations.gtmContainerId);
  const [gbpName, setGbpName] = useState(overview.seoIntegrations.googleBusinessProfileName);
  const [mcEnabled, setMcEnabled] = useState(overview.seoIntegrations.merchantCenterEnabled);
  const [mcNote, setMcNote] = useState(overview.seoIntegrations.merchantCenterEligibilityNote);
  const [consentReq, setConsentReq] = useState(overview.seoIntegrations.analyticsRequiresConsent);
  const [indexedPages, setIndexedPages] = useState(
    overview.seoIntegrations.reportedMetrics.indexedPagesCount
  );
  const [organicClicks, setOrganicClicks] = useState(
    overview.seoIntegrations.reportedMetrics.organicClicks28d
  );
  const [impressions, setImpressions] = useState(
    overview.seoIntegrations.reportedMetrics.searchImpressions28d
  );
  const [ctrPercent, setCtrPercent] = useState(overview.seoIntegrations.reportedMetrics.ctrPercent);
  const [topLanding, setTopLanding] = useState(
    overview.seoIntegrations.reportedMetrics.topLandingPage
  );
  const [syncNote, setSyncNote] = useState(overview.seoIntegrations.reportedMetrics.lastSyncedNote);

  async function runWrapped(fn: () => Promise<void>, okText: string) {
    onFeedback(null);
    try {
      await fn();
      onFeedback({ type: 'ok', text: okText });
    } catch (err) {
      onFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Action failed.' });
    }
  }

  function loadPostIntoEditor(postId?: number) {
    if (!postId) {
      setEditPostId(undefined);
      setBlogSlug('');
      setBlogTitleDe('');
      setBlogTitleEn('');
      setBlogExcerptDe('');
      setBlogExcerptEn('');
      setBlogBodyDe('');
      setBlogBodyEn('');
      setBlogTags('Peptidwissenschaft, Analytik');
      setBlogRefs('European Pharmacopoeia (Ph. Eur.); ICH Q2(R1).');
      setBlogReviewStatus('draft');
      setBlogPublished(false);
      setBlogPublishDate(new Date().toISOString().slice(0, 10));
      setBlogSeoTitleDe('');
      setBlogSeoTitleEn('');
      setBlogSeoDescDe('');
      setBlogSeoDescEn('');
      return;
    }
    const p = overview.blogPosts.find((b) => b.id === postId);
    if (!p) return;
    setEditPostId(p.id);
    setBlogSlug(p.slug);
    setBlogCatId(p.categoryId);
    setBlogAuthorId(p.authorId);
    setBlogTitleDe(p.titleDe);
    setBlogTitleEn(p.titleEn);
    setBlogExcerptDe(p.excerptDe);
    setBlogExcerptEn(p.excerptEn);
    setBlogBodyDe(p.bodyDe);
    setBlogBodyEn(p.bodyEn);
    setBlogImage(p.imageUrl ?? '');
    setBlogTags((p.tags ?? []).join(', '));
    setBlogRefs(p.referencesText ?? '');
    setBlogReviewStatus(p.editorialReviewStatus ?? 'published');
    setBlogPublished(p.isPublished ?? true);
    setBlogPublishDate((p.publishedAt || new Date().toISOString()).slice(0, 10));
    setBlogSeoTitleDe(p.seoTitleDe ?? '');
    setBlogSeoTitleEn(p.seoTitleEn ?? '');
    setBlogSeoDescDe(p.seoDescriptionDe ?? '');
    setBlogSeoDescEn(p.seoDescriptionEn ?? '');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['onpage', isDe ? 'On-Page SEO & Schema' : 'On-Page SEO & Schema'],
            ['keywords', isDe ? 'Keyword-Matrix (DE)' : 'German Keyword Intent'],
            ['blogcms', isDe ? 'Fachblog-Redaktionssystem' : 'Educational Blog CMS'],
            ['reporting', isDe ? 'Google & SEO-Reporting' : 'Google Integrations & Reporting'],
          ] as [typeof subTab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSubTab(k)}
            className={`px-3.5 py-2 text-xs font-medium rounded-sm border cursor-pointer ${
              subTab === k
                ? 'bg-scientific text-white border-scientific'
                : 'bg-white text-navy border-silver hover:bg-lightgrey'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'onpage' && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void runWrapped(
              () => onSaveSeoPage(seoForm),
              `SEO metadata updated for route '${seoForm.route}'.`
            );
          }}
          className="bg-white border border-silver rounded-sm p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-display font-bold text-navy">
              <Search className="w-4 h-4 text-scientific" />
              <span>{isDe ? 'On-Page SEO-Editor (SSR & Client Sync)' : 'On-Page SEO Editor'}</span>
            </div>
            <select
              value={selectedRoute}
              onChange={(e) => selectSeoRoute(e.target.value as PageRoute)}
              className="px-3 py-1.5 text-xs border border-silver rounded-sm bg-white font-mono"
            >
              {overview.seoPages.map((p) => (
                <option key={p.route} value={p.route}>
                  /{p.route}/ ({p.robotsDirective})
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">
                SEO Title DE ({seoForm.seoTitleDe.length}/60 recommended)
              </span>
              <input
                type="text"
                required
                value={seoForm.seoTitleDe}
                onChange={(e) => setSeoForm({ ...seoForm, seoTitleDe: e.target.value })}
                className="w-full px-3 py-2 border border-silver rounded-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">
                SEO Title EN ({seoForm.seoTitleEn.length}/60 recommended)
              </span>
              <input
                type="text"
                required
                value={seoForm.seoTitleEn}
                onChange={(e) => setSeoForm({ ...seoForm, seoTitleEn: e.target.value })}
                className="w-full px-3 py-2 border border-silver rounded-sm"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">
                Meta Description DE ({seoForm.metaDescriptionDe.length}/160)
              </span>
              <textarea
                rows={2}
                required
                value={seoForm.metaDescriptionDe}
                onChange={(e) => setSeoForm({ ...seoForm, metaDescriptionDe: e.target.value })}
                className="w-full px-3 py-2 border border-silver rounded-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">
                Meta Description EN ({seoForm.metaDescriptionEn.length}/160)
              </span>
              <textarea
                rows={2}
                required
                value={seoForm.metaDescriptionEn}
                onChange={(e) => setSeoForm({ ...seoForm, metaDescriptionEn: e.target.value })}
                className="w-full px-3 py-2 border border-silver rounded-sm"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">Focus Keyword (DE)</span>
              <input
                type="text"
                value={seoForm.focusKeywordDe}
                onChange={(e) => setSeoForm({ ...seoForm, focusKeywordDe: e.target.value })}
                className="w-full px-3 py-2 border border-silver rounded-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">Canonical URL Override</span>
              <input
                type="text"
                value={seoForm.canonicalUrl}
                onChange={(e) => setSeoForm({ ...seoForm, canonicalUrl: e.target.value })}
                className="w-full px-3 py-2 border border-silver rounded-sm font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">Indexing Directive</span>
              <select
                value={seoForm.robotsDirective}
                onChange={(e) =>
                  setSeoForm({
                    ...seoForm,
                    robotsDirective: e.target.value as 'index, follow' | 'noindex, nofollow',
                  })
                }
                className="w-full px-3 py-2 border border-silver rounded-sm bg-white font-mono"
              >
                <option value="index, follow">index, follow</option>
                <option value="noindex, nofollow">noindex, nofollow</option>
              </select>
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <label className="space-y-1 sm:col-span-2">
              <span className="font-mono text-charcoal/75">Supporting Keywords</span>
              <input
                type="text"
                value={seoForm.supportingKeywords}
                onChange={(e) => setSeoForm({ ...seoForm, supportingKeywords: e.target.value })}
                className="w-full px-3 py-2 border border-silver rounded-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">Schema.org Type</span>
              <input
                type="text"
                value={seoForm.schemaType}
                onChange={(e) => setSeoForm({ ...seoForm, schemaType: e.target.value })}
                className="w-full px-3 py-2 border border-silver rounded-sm font-mono"
              />
            </label>
          </div>

          <label className="block space-y-1 text-xs">
            <span className="font-mono text-charcoal/75">Social Sharing OG/Twitter Image Path or URL</span>
            <input
              type="text"
              value={seoForm.socialImageUrl}
              onChange={(e) => setSeoForm({ ...seoForm, socialImageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-silver rounded-sm font-mono"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-silver">
            <div className="flex gap-3 text-xs font-mono text-scientific">
              <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="hover:underline">
                /sitemap.xml ↗
              </a>
              <a href="/robots.txt" target="_blank" rel="noreferrer" className="hover:underline">
                /robots.txt ↗
              </a>
            </div>
            {canEditContent && (
              <button
                type="submit"
                className="px-5 py-2 bg-navy text-white text-xs font-semibold rounded-sm cursor-pointer"
              >
                Save On-Page SEO Configuration
              </button>
            )}
          </div>
        </form>
      )}

      {subTab === 'keywords' && (
        <div className="bg-white border border-silver rounded-sm p-6 space-y-4">
          <div className="flex items-center gap-2 font-display font-bold text-navy">
            <Globe className="w-4 h-4 text-scientific" />
            <span>German Search Intent & Keyword Architecture</span>
          </div>
          <p className="text-xs text-charcoal/75">
            Strict editorial rule: Research-Only pages never target medical treatment, prescription
            dosage, or human self-administration queries.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {GERMAN_KEYWORD_FRAMEWORK.map((cluster) => (
              <div key={cluster.id} className="border border-silver rounded-sm p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-navy text-sm">{cluster.primaryKeywordDe}</span>
                  <span className="font-mono uppercase px-2 py-0.5 bg-lightgrey border border-silver rounded-sm">
                    /{cluster.targetRoute}/ · {cluster.searchIntent}
                  </span>
                </div>
                <div className="text-charcoal/80">
                  Supporting: {cluster.supportingKeywordsDe.join(' · ')}
                </div>
                <div className="text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-sm">
                  Guardrail: {cluster.excludedTermsWarning}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'blogcms' && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void runWrapped(
              () =>
                onSaveBlogPost({
                  id: editPostId,
                  slug: blogSlug,
                  categoryId: blogCatId,
                  authorId: blogAuthorId,
                  titleDe: blogTitleDe,
                  titleEn: blogTitleEn,
                  excerptDe: blogExcerptDe,
                  excerptEn: blogExcerptEn,
                  bodyDe: blogBodyDe,
                  bodyEn: blogBodyEn,
                  imageUrl: blogImage,
                  isPublished: blogPublished,
                  publishedAt: blogPublishDate ? new Date(blogPublishDate).toISOString() : undefined,
                  tags: blogTags
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                  referencesText: blogRefs,
                  editorialReviewStatus: blogReviewStatus,
                  seoTitleDe: blogSeoTitleDe,
                  seoTitleEn: blogSeoTitleEn,
                  seoDescriptionDe: blogSeoDescDe,
                  seoDescriptionEn: blogSeoDescEn,
                }),
              `Blog article '${blogSlug}' saved.`
            );
          }}
          className="bg-white border border-silver rounded-sm p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-display font-bold text-navy">
              <BookOpen className="w-4 h-4 text-scientific" />
              <span>Educational Blog CMS & Editorial Review</span>
            </div>
            <div className="flex gap-2">
              <select
                value={editPostId ?? ''}
                onChange={(e) =>
                  loadPostIntoEditor(e.target.value ? Number(e.target.value) : undefined)
                }
                className="px-3 py-1.5 text-xs border border-silver rounded-sm bg-white"
              >
                <option value="">+ New Scientific Article</option>
                {overview.blogPosts.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} · {p.slug} ({p.isPublished ? 'published' : 'draft'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3 text-xs">
            <input
              type="text"
              required
              value={blogSlug}
              onChange={(e) => setBlogSlug(e.target.value)}
              placeholder="article-url-slug"
              className="px-3 py-2 border border-silver rounded-sm font-mono"
            />
            <select
              value={blogCatId}
              onChange={(e) => setBlogCatId(Number(e.target.value))}
              className="px-3 py-2 border border-silver rounded-sm bg-white"
            >
              {overview.blogCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameDe}
                </option>
              ))}
            </select>
            <select
              value={blogAuthorId}
              onChange={(e) => setBlogAuthorId(Number(e.target.value))}
              className="px-3 py-2 border border-silver rounded-sm bg-white"
            >
              {overview.authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.roleEn})
                </option>
              ))}
            </select>
            <input
              type="date"
              value={blogPublishDate}
              onChange={(e) => setBlogPublishDate(e.target.value)}
              className="px-3 py-2 border border-silver rounded-sm font-mono"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <input
              type="text"
              required
              value={blogTitleDe}
              onChange={(e) => setBlogTitleDe(e.target.value)}
              placeholder="Titel (Deutsch)"
              className="px-3 py-2 border border-silver rounded-sm"
            />
            <input
              type="text"
              required
              value={blogTitleEn}
              onChange={(e) => setBlogTitleEn(e.target.value)}
              placeholder="Title (English)"
              className="px-3 py-2 border border-silver rounded-sm"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <textarea
              rows={2}
              required
              value={blogExcerptDe}
              onChange={(e) => setBlogExcerptDe(e.target.value)}
              placeholder="Kurzfassung / Excerpt (Deutsch)"
              className="px-3 py-2 border border-silver rounded-sm"
            />
            <textarea
              rows={2}
              required
              value={blogExcerptEn}
              onChange={(e) => setBlogExcerptEn(e.target.value)}
              placeholder="Excerpt (English)"
              className="px-3 py-2 border border-silver rounded-sm"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <textarea
              rows={5}
              required
              value={blogBodyDe}
              onChange={(e) => setBlogBodyDe(e.target.value)}
              placeholder="Fachbeitrag Volltext (Deutsch)"
              className="px-3 py-2 border border-silver rounded-sm"
            />
            <textarea
              rows={5}
              required
              value={blogBodyEn}
              onChange={(e) => setBlogBodyEn(e.target.value)}
              placeholder="Article Body (English)"
              className="px-3 py-2 border border-silver rounded-sm"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <input
              type="text"
              value={blogTags}
              onChange={(e) => setBlogTags(e.target.value)}
              placeholder="Tags comma-separated"
              className="px-3 py-2 border border-silver rounded-sm"
            />
            <input
              type="text"
              value={blogImage}
              onChange={(e) => setBlogImage(e.target.value)}
              placeholder="Header Image URL or asset path"
              className="px-3 py-2 border border-silver rounded-sm font-mono"
            />
            <select
              value={blogReviewStatus}
              onChange={(e) =>
                setBlogReviewStatus(e.target.value as 'draft' | 'peer_reviewed' | 'published')
              }
              className="px-3 py-2 border border-silver rounded-sm bg-white"
            >
              <option value="draft">Editorial Review: Draft</option>
              <option value="peer_reviewed">Editorial Review: Peer Reviewed</option>
              <option value="published">Editorial Review: Published</option>
            </select>
          </div>

          <textarea
            rows={2}
            value={blogRefs}
            onChange={(e) => setBlogRefs(e.target.value)}
            placeholder="Scientific Sources & Peer-Reviewed Citations (Ph. Eur., ICH Q2, etc.)"
            className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
          />

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <input
              type="text"
              value={blogSeoTitleDe}
              onChange={(e) => setBlogSeoTitleDe(e.target.value)}
              placeholder="Blog SEO Title DE"
              className="px-3 py-2 border border-silver rounded-sm"
            />
            <input
              type="text"
              value={blogSeoTitleEn}
              onChange={(e) => setBlogSeoTitleEn(e.target.value)}
              placeholder="Blog SEO Title EN"
              className="px-3 py-2 border border-silver rounded-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-navy">
              <input
                type="checkbox"
                checked={blogPublished}
                onChange={(e) => setBlogPublished(e.target.checked)}
              />
              <span>Publish article publicly (when scheduled date &lt;= today)</span>
            </label>
            {canEditContent && (
              <button
                type="submit"
                className="px-5 py-2 bg-scientific text-white text-xs font-semibold rounded-sm cursor-pointer"
              >
                Save Blog Article & Metadata
              </button>
            )}
          </div>
        </form>
      )}

      {subTab === 'reporting' && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void runWrapped(
              () =>
                onSaveSeoIntegrations({
                  searchConsoleVerificationMeta: gscCode,
                  ga4MeasurementId: ga4Id,
                  gtmContainerId: gtmId,
                  googleBusinessProfileName: gbpName,
                  merchantCenterEnabled: mcEnabled,
                  merchantCenterEligibilityNote: mcNote,
                  analyticsRequiresConsent: consentReq,
                  reportedMetrics: {
                    indexedPagesCount: Number(indexedPages),
                    organicClicks28d: Number(organicClicks),
                    searchImpressions28d: Number(impressions),
                    ctrPercent: Number(ctrPercent),
                    topLandingPage: topLanding,
                    lastSyncedNote: syncNote,
                  },
                }),
              'Google integrations & SEO reporting telemetry saved.'
            );
          }}
          className="bg-white border border-silver rounded-sm p-6 space-y-5"
        >
          <div className="flex items-center gap-2 font-display font-bold text-navy">
            <BarChart3 className="w-4 h-4 text-scientific" />
            <span>Google Search Console, GA4/GTM & Search Visibility Metrics</span>
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-200 text-navy text-xs rounded-sm">
            Honest Search Disclosure: PEPTIVORA never guarantees Google ranking positions. Metrics
            below reflect verified Search Console telemetry when configured, and analytics tags
            strictly honor user cookie consent (TTDSG / GDPR).
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-lightgrey border border-silver rounded-sm">
              <div className="font-mono text-charcoal/70">Indexed Pages</div>
              <div className="font-mono text-xl font-bold text-navy mt-1">{indexedPages}</div>
            </div>
            <div className="p-3 bg-lightgrey border border-silver rounded-sm">
              <div className="font-mono text-charcoal/70">Organic Clicks (28d)</div>
              <div className="font-mono text-xl font-bold text-navy mt-1">{organicClicks}</div>
            </div>
            <div className="p-3 bg-lightgrey border border-silver rounded-sm">
              <div className="font-mono text-charcoal/70">Impressions (28d)</div>
              <div className="font-mono text-xl font-bold text-navy mt-1">{impressions}</div>
            </div>
            <div className="p-3 bg-lightgrey border border-silver rounded-sm">
              <div className="font-mono text-charcoal/70">Average CTR</div>
              <div className="font-mono text-xl font-bold text-navy mt-1">{ctrPercent}%</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">Search Console Verification Token</span>
              <input
                type="text"
                value={gscCode}
                onChange={(e) => setGscCode(e.target.value)}
                placeholder="google-site-verification content value"
                className="w-full px-3 py-2 border border-silver rounded-sm font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">Google Analytics 4 ID (Consent-Gated)</span>
              <input
                type="text"
                value={ga4Id}
                onChange={(e) => setGa4Id(e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-3 py-2 border border-silver rounded-sm font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">Google Tag Manager ID (Consent-Gated)</span>
              <input
                type="text"
                value={gtmId}
                onChange={(e) => setGtmId(e.target.value)}
                placeholder="GTM-XXXXXXX"
                className="w-full px-3 py-2 border border-silver rounded-sm font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="font-mono text-charcoal/75">Google Business Profile Label</span>
              <input
                type="text"
                value={gbpName}
                onChange={(e) => setGbpName(e.target.value)}
                placeholder="Optional verified German laboratory office listing"
                className="w-full px-3 py-2 border border-silver rounded-sm"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-4 gap-3 text-xs">
            <label className="space-y-1">
              <span>Indexed Pages</span>
              <input
                type="number"
                min={0}
                value={indexedPages}
                onChange={(e) => setIndexedPages(Number(e.target.value))}
                className="w-full px-3 py-2 border border-silver rounded-sm font-mono"
              />
            </label>
            <label className="space-y-1">
              <span>Organic Clicks (28d)</span>
              <input
                type="number"
                min={0}
                value={organicClicks}
                onChange={(e) => setOrganicClicks(Number(e.target.value))}
                className="w-full px-3 py-2 border border-silver rounded-sm font-mono"
              />
            </label>
            <label className="space-y-1">
              <span>Impressions (28d)</span>
              <input
                type="number"
                min={0}
                value={impressions}
                onChange={(e) => setImpressions(Number(e.target.value))}
                className="w-full px-3 py-2 border border-silver rounded-sm font-mono"
              />
            </label>
            <label className="space-y-1">
              <span>CTR (%)</span>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={ctrPercent}
                onChange={(e) => setCtrPercent(Number(e.target.value))}
                className="w-full px-3 py-2 border border-silver rounded-sm font-mono"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <input
              type="text"
              value={topLanding}
              onChange={(e) => setTopLanding(e.target.value)}
              placeholder="Top Landing Page (e.g. /de/katalog/)"
              className="px-3 py-2 border border-silver rounded-sm font-mono"
            />
            <input
              type="text"
              value={syncNote}
              onChange={(e) => setSyncNote(e.target.value)}
              placeholder="Search Console / GA4 reporting note"
              className="px-3 py-2 border border-silver rounded-sm"
            />
          </div>

          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 font-medium text-navy">
              <input
                type="checkbox"
                checked={consentReq}
                onChange={(e) => setConsentReq(e.target.checked)}
              />
              <span>Require explicit TTDSG/GDPR cookie consent before firing GA4/GTM tags</span>
            </label>
            <label className="flex items-center gap-2 font-medium text-navy">
              <input
                type="checkbox"
                checked={mcEnabled}
                onChange={(e) => setMcEnabled(e.target.checked)}
              />
              <span>
                Google Merchant Center Feed Enabled (Strictly subject to Google Healthcare/Lab Supply policy)
              </span>
            </label>
            <input
              type="text"
              value={mcNote}
              onChange={(e) => setMcNote(e.target.value)}
              className="w-full px-3 py-2 border border-silver rounded-sm"
            />
          </div>

          {canEditContent && (
            <button
              type="submit"
              className="px-5 py-2 bg-navy text-white text-xs font-semibold rounded-sm cursor-pointer"
            >
              Save Integrations & Metrics
            </button>
          )}
        </form>
      )}
    </div>
  );
}

interface GovernancePanelProps {
  locale: Locale;
  currentRole: AppRole;
  overview: ComplianceOverviewResponse;
  onSaveBusinessProfile: (payload: Record<string, unknown>) => Promise<void>;
  onSaveEuPharmacyLogo: (payload: Record<string, unknown>) => Promise<void>;
  onSaveLegalDocs: (payload: Record<string, unknown>) => Promise<void>;
  onSaveProductMatrix: (payload: Record<string, unknown>) => Promise<void>;
  onSaveProductionChecklist: (payload: Record<string, unknown>) => Promise<void>;
  onFeedback: (msg: { type: 'ok' | 'err'; text: string } | null) => void;
}

export function GermanComplianceGovernancePanel({
  locale,
  currentRole,
  overview,
  onSaveBusinessProfile,
  onSaveEuPharmacyLogo,
  onSaveLegalDocs,
  onSaveProductMatrix,
  onSaveProductionChecklist,
  onFeedback,
}: GovernancePanelProps) {
  const isDe = locale === 'de';
  const canReview = ['regulatory_reviewer', 'super_administrator'].includes(currentRole);
  const canManageMatrix = ['regulatory_reviewer', 'product_manager', 'super_administrator'].includes(
    currentRole
  );

  const [subTab, setSubTab] = useState<'business' | 'safety' | 'legal' | 'launch'>('business');

  // Business Profile
  const [bp, setBp] = useState(overview.businessProfile);
  // EU Logo
  const [euLogo, setEuLogo] = useState(overview.euPharmacyLogo);
  // Legal Docs
  const [legalDocs, setLegalDocs] = useState(overview.legalDocuments);
  // Product Regulatory + REACH/CLP Matrix
  const [matrixProdId, setMatrixProdId] = useState<number>(overview.products[0]?.id ?? 1);
  const currentMatrix =
    overview.productRegulatoryMatrix.find((m) => m.productId === matrixProdId) ??
    buildDefaultProductRegulatoryMatrixEntry(matrixProdId);
  const [matrixForm, setMatrixForm] = useState(currentMatrix);
  // Production Checklist
  const [checklist, setChecklist] = useState(overview.productionChecklist);

  async function runWrapped(fn: () => Promise<void>, okText: string) {
    onFeedback(null);
    try {
      await fn();
      onFeedback({ type: 'ok', text: okText });
    } catch (err) {
      onFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Governance update failed.' });
    }
  }

  function selectMatrixProduct(id: number) {
    setMatrixProdId(id);
    const existing =
      overview.productRegulatoryMatrix.find((m) => m.productId === id) ??
      buildDefaultProductRegulatoryMatrixEntry(id);
    setMatrixForm(existing);
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 rounded-sm text-xs flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
        <span>
          <strong>Regulatory Disclaimer:</strong> This console provides technical compliance controls,
          fail-closed authorization gates, and audit logging. It does not constitute legal advice.
          Obtain qualified German pharmaceutical & chemical regulatory counsel prior to live launch.
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['business', 'A/D. Business Profile & EU Logo'],
            ['safety', 'B/G. Product Regulatory & REACH/CLP Safety'],
            ['legal', 'E. German/EN Legal Documents'],
            ['launch', 'H. Production Launch Checklist'],
          ] as [typeof subTab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSubTab(k)}
            className={`px-3.5 py-2 text-xs font-medium rounded-sm border cursor-pointer ${
              subTab === k
                ? 'bg-scientific text-white border-scientific'
                : 'bg-white text-navy border-silver hover:bg-lightgrey'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'business' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void runWrapped(
                () => onSaveBusinessProfile({ ...bp }),
                'Business verification profile updated.'
              );
            }}
            className="lg:col-span-7 bg-white border border-silver rounded-sm p-6 space-y-3"
          >
            <div className="flex items-center gap-2 font-display font-bold text-navy">
              <Building2 className="w-4 h-4 text-scientific" />
              <span>German Business Verification Profile (Never Fabricate Registrations)</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                value={bp.legalEntityName}
                onChange={(e) => setBp({ ...bp, legalEntityName: e.target.value })}
                placeholder="Registered Legal Entity (e.g. Example GmbH — leave blank until incorporated)"
                className="px-3 py-2 border border-silver rounded-sm"
              />
              <input
                type="text"
                value={bp.commercialRegisterInfo}
                onChange={(e) => setBp({ ...bp, commercialRegisterInfo: e.target.value })}
                placeholder="Handelsregister / HRB Info"
                className="px-3 py-2 border border-silver rounded-sm"
              />
              <input
                type="text"
                value={bp.taxVatInfo}
                onChange={(e) => setBp({ ...bp, taxVatInfo: e.target.value })}
                placeholder="Tax ID / USt-IdNr."
                className="px-3 py-2 border border-silver rounded-sm"
              />
              <input
                type="text"
                value={bp.responsiblePerson}
                onChange={(e) => setBp({ ...bp, responsiblePerson: e.target.value })}
                placeholder="Responsible Qualified Person(s)"
                className="px-3 py-2 border border-silver rounded-sm"
              />
            </div>
            <input
              type="text"
              value={bp.germanRegisteredAddress}
              onChange={(e) => setBp({ ...bp, germanRegisteredAddress: e.target.value })}
              placeholder="German Registered Business Address"
              className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
            />
            <textarea
              rows={2}
              value={bp.relevantLicenses}
              onChange={(e) => setBp({ ...bp, relevantLicenses: e.target.value })}
              placeholder="Relevant Statutory Licenses (leave empty until granted)"
              className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
            />
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                value={bp.authorizedOperatingLocations}
                onChange={(e) => setBp({ ...bp, authorizedOperatingLocations: e.target.value })}
                placeholder="Authorized Operating / Warehouse Locations"
                className="px-3 py-2 border border-silver rounded-sm"
              />
              <input
                type="text"
                value={bp.regulatoryContacts}
                onChange={(e) => setBp({ ...bp, regulatoryContacts: e.target.value })}
                placeholder="Regulatory Affairs / QPPV Contacts"
                className="px-3 py-2 border border-silver rounded-sm"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <select
                value={bp.verificationStatus}
                onChange={(e) =>
                  setBp({
                    ...bp,
                    verificationStatus: e.target.value as
                      | 'pending_documentation'
                      | 'verified'
                      | 'incomplete',
                  })
                }
                className="px-3 py-2 text-xs border border-silver rounded-sm bg-white font-mono"
              >
                <option value="pending_documentation">pending_documentation</option>
                <option value="incomplete">incomplete</option>
                <option value="verified">verified</option>
              </select>
              {canReview && (
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy text-white text-xs font-semibold rounded-sm cursor-pointer"
                >
                  Save Business Profile
                </button>
              )}
            </div>
          </form>

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void runWrapped(
                () => onSaveEuPharmacyLogo({ ...euLogo }),
                'EU Online Pharmacy Logo configuration updated.'
              );
            }}
            className="lg:col-span-5 bg-white border border-silver rounded-sm p-6 space-y-3 h-fit"
          >
            <div className="flex items-center gap-2 font-display font-bold text-navy">
              <Lock className="w-4 h-4 text-scientific" />
              <span>EU Online Pharmacy Logo (§ 11a ApoG)</span>
            </div>
            <p className="text-xs text-charcoal/75">
              Fail-closed: Remains disabled by default. Server refuses activation unless all 4 German
              pharmaceutical statutory prerequisites and an official HTTPS authority register URL are
              verified.
            </p>
            <label className="flex items-center gap-2 text-xs font-medium text-navy">
              <input
                type="checkbox"
                checked={euLogo.enabled}
                onChange={(e) => setEuLogo({ ...euLogo, enabled: e.target.checked })}
              />
              <span>Enable EU Common Logo Display</span>
            </label>
            <input
              type="text"
              value={euLogo.authorizedOperatorName}
              onChange={(e) => setEuLogo({ ...euLogo, authorizedOperatorName: e.target.value })}
              placeholder="Authorized Licensed Pharmacy Operator Name"
              className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
            />
            <input
              type="url"
              value={euLogo.authorityRegisterUrl}
              onChange={(e) => setEuLogo({ ...euLogo, authorityRegisterUrl: e.target.value })}
              placeholder="https://versandhandel.dimdi.de/... (Genuine Register Entry)"
              className="w-full px-3 py-2 text-xs border border-silver rounded-sm font-mono"
            />
            <input
              type="text"
              value={isDe ? euLogo.displayNoteDe : euLogo.displayNoteEn}
              onChange={(e) =>
                setEuLogo(
                  isDe
                    ? { ...euLogo, displayNoteDe: e.target.value }
                    : { ...euLogo, displayNoteEn: e.target.value }
                )
              }
              className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
            />
            {canReview && (
              <button
                type="submit"
                className="px-4 py-2 bg-navy text-white text-xs font-semibold rounded-sm cursor-pointer"
              >
                Save EU Logo Configuration
              </button>
            )}
          </form>
        </div>
      )}

      {subTab === 'safety' && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void runWrapped(
              () => onSaveProductMatrix({ ...matrixForm }),
              `Product #${matrixForm.productId} regulatory & chemical safety matrix saved.`
            );
          }}
          className="bg-white border border-silver rounded-sm p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-display font-bold text-navy">
              <FlaskConical className="w-4 h-4 text-scientific" />
              <span>Product-by-Product Regulatory & REACH/CLP Safety Assessment</span>
            </div>
            <select
              value={matrixProdId}
              onChange={(e) => selectMatrixProduct(Number(e.target.value))}
              className="px-3 py-1.5 text-xs border border-silver rounded-sm bg-white font-mono"
            >
              {overview.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} · {isDe ? p.nameDe : p.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <input
              type="text"
              value={matrixForm.productIdentityNote}
              onChange={(e) => setMatrixForm({ ...matrixForm, productIdentityNote: e.target.value })}
              placeholder="Product Identity & Analytical Purity Basis"
              className="px-3 py-2 border border-silver rounded-sm"
            />
            <input
              type="text"
              value={matrixForm.compositionNote}
              onChange={(e) => setMatrixForm({ ...matrixForm, compositionNote: e.target.value })}
              placeholder="Composition / Counter-Ion / Salt Form"
              className="px-3 py-2 border border-silver rounded-sm"
            />
            <input
              type="text"
              value={matrixForm.intendedUseNote}
              onChange={(e) => setMatrixForm({ ...matrixForm, intendedUseNote: e.target.value })}
              placeholder="Objective Intended Use & Exclusion of Human Use"
              className="px-3 py-2 border border-silver rounded-sm"
            />
            <input
              type="text"
              value={matrixForm.actualCustomerSegment}
              onChange={(e) =>
                setMatrixForm({ ...matrixForm, actualCustomerSegment: e.target.value })
              }
              placeholder="Actual Vetted Customer Segment"
              className="px-3 py-2 border border-silver rounded-sm"
            />
            <input
              type="text"
              value={matrixForm.applicableLegislation}
              onChange={(e) =>
                setMatrixForm({ ...matrixForm, applicableLegislation: e.target.value })
              }
              placeholder="Applicable DE / EU Legislation (AMG, HWG, ChemG, REACH, CLP)"
              className="px-3 py-2 border border-silver rounded-sm"
            />
            <select
              value={matrixForm.medicinalClassificationRisk}
              onChange={(e) =>
                setMatrixForm({
                  ...matrixForm,
                  medicinalClassificationRisk: e.target.value as
                    | 'under_assessment'
                    | 'non_medicinal_ruo_verified'
                    | 'medicinal_requires_amg',
                })
              }
              className="px-3 py-2 border border-silver rounded-sm bg-white font-mono"
            >
              <option value="under_assessment">under_assessment (Blocked from Sale)</option>
              <option value="non_medicinal_ruo_verified">non_medicinal_ruo_verified</option>
              <option value="medicinal_requires_amg">medicinal_requires_amg (Pharma Only)</option>
            </select>
          </div>

          <div className="border-t border-silver pt-3 space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-navy">
              <input
                type="checkbox"
                checked={matrixForm.reachApplicable}
                onChange={(e) => setMatrixForm({ ...matrixForm, reachApplicable: e.target.checked })}
              />
              <span>REACH Registration / Art. 31 SDS Obligations Applicable to this Substance</span>
            </label>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <input
                type="text"
                value={matrixForm.clpClassification}
                onChange={(e) => setMatrixForm({ ...matrixForm, clpClassification: e.target.value })}
                placeholder="CLP / GHS Classification"
                className="px-3 py-2 border border-silver rounded-sm"
              />
              <input
                type="text"
                value={matrixForm.clpHazardStatements}
                onChange={(e) =>
                  setMatrixForm({ ...matrixForm, clpHazardStatements: e.target.value })
                }
                placeholder="H-Statements / Pictograms (if applicable)"
                className="px-3 py-2 border border-silver rounded-sm"
              />
              <input
                type="text"
                value={matrixForm.sdsDocumentRef}
                onChange={(e) => setMatrixForm({ ...matrixForm, sdsDocumentRef: e.target.value })}
                placeholder="Linked SDS Reference / Version"
                className="px-3 py-2 border border-silver rounded-sm font-mono"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                value={matrixForm.transportRequirements}
                onChange={(e) =>
                  setMatrixForm({ ...matrixForm, transportRequirements: e.target.value })
                }
                placeholder="Packaging & Cold-Chain / ADR Transport Rule"
                className="px-3 py-2 border border-silver rounded-sm"
              />
              <input
                type="text"
                value={matrixForm.traceabilityBatchRule}
                onChange={(e) =>
                  setMatrixForm({ ...matrixForm, traceabilityBatchRule: e.target.value })
                }
                placeholder="Batch Traceability Requirement"
                className="px-3 py-2 border border-silver rounded-sm"
              />
            </div>
            <textarea
              rows={2}
              value={matrixForm.reviewerLegalAssessment}
              onChange={(e) =>
                setMatrixForm({ ...matrixForm, reviewerLegalAssessment: e.target.value })
              }
              placeholder="Qualified Regulatory Reviewer Assessment Summary"
              className="w-full px-3 py-2 text-xs border border-silver rounded-sm"
            />
          </div>

          {canManageMatrix && (
            <button
              type="submit"
              className="px-5 py-2 bg-scientific text-white text-xs font-semibold rounded-sm cursor-pointer"
            >
              Record Regulatory & Chemical Safety Determination
            </button>
          )}
        </form>
      )}

      {subTab === 'legal' && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void runWrapped(
              () => onSaveLegalDocs({ ...legalDocs }),
              'Legal disclosure texts updated.'
            );
          }}
          className="bg-white border border-silver rounded-sm p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-display font-bold text-navy">
              <Scale className="w-4 h-4 text-scientific" />
              <span>Editable German / English Legal Documents</span>
            </div>
            <select
              value={legalDocs.reviewStatus}
              onChange={(e) =>
                setLegalDocs({
                  ...legalDocs,
                  reviewStatus: e.target.value as 'draft_template' | 'counsel_reviewed',
                })
              }
              className="px-3 py-1.5 text-xs border border-silver rounded-sm bg-white font-mono"
            >
              <option value="draft_template">Status: Draft Template (Not Counsel Reviewed)</option>
              <option value="counsel_reviewed">Status: Legal Counsel Reviewed</option>
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            {(
              [
                ['impressumDe', 'Impressum (DE)'],
                ['impressumEn', 'Legal Notice (EN)'],
                ['privacyDe', 'Datenschutzerklärung (DE)'],
                ['privacyEn', 'Privacy Policy (EN)'],
                ['termsDe', 'AGB (DE)'],
                ['termsEn', 'Terms & Conditions (EN)'],
                ['withdrawalDe', 'Widerrufsbelehrung (DE)'],
                ['withdrawalEn', 'Withdrawal Disclosure (EN)'],
                ['shippingDe', 'Versandbedingungen (DE)'],
                ['shippingEn', 'Shipping Policy (EN)'],
                ['returnsDe', 'Rückgabe & Erstattung (DE)'],
                ['returnsEn', 'Returns & Refunds (EN)'],
                ['cookiePolicyDe', 'Cookie-Richtlinie (DE)'],
                ['cookiePolicyEn', 'Cookie Policy (EN)'],
                ['productSafetyDe', 'Produktsicherheit (DE)'],
                ['productSafetyEn', 'Product Safety Disclosure (EN)'],
              ] as [keyof typeof legalDocs, string][]
            ).map(([fieldKey, label]) => (
              <label key={fieldKey} className="space-y-1">
                <span className="font-mono text-charcoal/75">{label}</span>
                <textarea
                  rows={2}
                  required
                  value={String(legalDocs[fieldKey])}
                  onChange={(e) => setLegalDocs({ ...legalDocs, [fieldKey]: e.target.value })}
                  className="w-full px-3 py-2 border border-silver rounded-sm"
                />
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="px-5 py-2 bg-navy text-white text-xs font-semibold rounded-sm cursor-pointer"
          >
            Save Legal Disclosures
          </button>
        </form>
      )}

      {subTab === 'launch' && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void runWrapped(
              () => onSaveProductionChecklist({ ...checklist }),
              'Production launch readiness checklist updated.'
            );
          }}
          className="bg-white border border-silver rounded-sm p-6 space-y-4"
        >
          <div className="flex items-center gap-2 font-display font-bold text-navy">
            <Activity className="w-4 h-4 text-scientific" />
            <span>Fail-Closed Production Launch Checklist</span>
          </div>
          <p className="text-xs text-charcoal/75">
            Commercial deployment does not automatically authorize production transactions. All
            prerequisite verification boxes must be independently confirmed before authorizing
            production operations.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {(
              [
                ['developmentComplete', '1. Development Complete'],
                ['testingComplete', '2. Automated QA Testing Passed'],
                ['databaseReady', '3. PostgreSQL Schema & Migrations Ready'],
                ['securityReviewed', '4. Security & RBAC Reviewed'],
                ['seoReady', '5. Technical SEO & Sitemap Ready'],
                ['businessDocsReady', '6. Verified German Business Documentation'],
                ['regulatoryApprovalReady', '7. Regulatory Counsel Sign-Off Complete'],
                ['paymentProviderApproved', '8. Payment Provider Approved Model'],
                ['productionAuthorized', '9. Production Launch Authorized'],
              ] as [keyof typeof checklist, string][]
            ).map(([key, label]) => (
              <label
                key={key}
                className={`flex items-center justify-between gap-2 p-3 rounded-sm border cursor-pointer ${
                  checklist[key]
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-lightgrey border-silver text-navy'
                }`}
              >
                <span className="font-medium">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(checklist[key])}
                  onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-silver">
            <div className="inline-flex items-center gap-2 text-xs font-mono">
              <CheckCircle2
                className={`w-4 h-4 ${
                  checklist.productionAuthorized ? 'text-emerald-700' : 'text-amber-700'
                }`}
              />
              <span>
                Status:{' '}
                {checklist.productionAuthorized
                  ? 'PRODUCTION AUTHORIZED'
                  : 'PRE-LAUNCH GOVERNANCE MODE'}
              </span>
            </div>
            {canReview && (
              <button
                type="submit"
                className="px-5 py-2 bg-navy text-white text-xs font-semibold rounded-sm cursor-pointer"
              >
                Enforce Launch Checklist
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
