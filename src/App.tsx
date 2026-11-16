import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { ChevronRight, Menu, ShieldCheck, ShoppingCart, X } from 'lucide-react';
import type { AppRole, Locale } from './core/domain/compliance.ts';
import {
  buildBreadcrumbs,
  buildPageSeoSnapshot,
  buildPathForRoute,
  DEFAULT_SEO_PAGES,
  parsePathToRoute,
} from './core/seo/seoEngine.ts';
import { getCopy } from './i18n/translations.ts';
import {
  auth,
  recoverPassword,
  registerWithEmailPassword,
  signInWithEmailPassword,
  signInWithGoogle,
  signOutUser,
} from './lib/firebase.ts';
import type {
  BlogPostDto,
  CartItem,
  ComplianceOverviewResponse,
  CustomerAccountResponse,
  OrderDto,
  PageRoute,
  ProductDto,
  ProductVariantDto,
  PublicBlogResponse,
  PublicCatalogResponse,
} from './types/peptivora.ts';
import { AccountKybView } from './components/AccountKybView.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { ComplianceOpsView } from './components/ComplianceOpsView.tsx';
import {
  CataloguePage,
  PharmaceuticalDivisionPage,
  ProductDetailPage,
  ResearchDivisionPage,
} from './components/pages/CatalogueViews.tsx';
import { CartPage, CheckoutPage } from './components/pages/CommerceViews.tsx';
import { BlogPage, ContactPage } from './components/pages/EditorialContactViews.tsx';
import { HomePage } from './components/pages/HomePage.tsx';
import {
  AboutPage,
  FaqPage,
  KnowledgePage,
  QualityPage,
} from './components/pages/InformationalPages.tsx';
import {
  CookiePreferencesPage,
  ImpressumPage,
  PrivacyPage,
  TermsPage,
} from './components/pages/LegalPages.tsx';

const STAFF_ROLES: AppRole[] = [
  'super_administrator',
  'regulatory_reviewer',
  'product_manager',
  'order_manager',
  'content_manager',
  'customer_support',
];

function getSessionId(): string {
  try {
    const existing = localStorage.getItem('peptivora_visitor_session');
    if (existing) return existing;
    const generated = `pv-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    localStorage.setItem('peptivora_visitor_session', generated);
    return generated;
  } catch {
    return `pv-session-${Date.now()}`;
  }
}

export default function App() {
  const initialParsed = useMemo(() => {
    if (typeof window === 'undefined') {
      return { locale: 'de' as Locale, route: 'home' as PageRoute };
    }
    return parsePathToRoute(window.location.pathname);
  }, []);

  const [locale, setLocale] = useState<Locale>(initialParsed.locale);
  const [route, setRoute] = useState<PageRoute>(initialParsed.route);
  const [urlProductSlug, setUrlProductSlug] = useState<string | undefined>(initialParsed.productSlug);
  const [urlBlogSlug, setUrlBlogSlug] = useState<string | undefined>(initialParsed.blogSlug);
  const [urlSearchQuery, setUrlSearchQuery] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') ?? '';
  });
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);

  const [catalog, setCatalog] = useState<PublicCatalogResponse | null>(null);
  const [blog, setBlog] = useState<PublicBlogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [account, setAccount] = useState<CustomerAccountResponse | null>(null);
  const [compliance, setCompliance] = useState<ComplianceOverviewResponse | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [consentRecorded, setConsentRecorded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('peptivora_consent_saved') === 'true';
    } catch {
      return false;
    }
  });
  const [functionalCookies, setFunctionalCookies] = useState(true);
  const [analyticsCookies, setAnalyticsCookies] = useState(false);

  const t = getCopy(locale);

  const pushRouteUrl = useCallback(
    (nextRoute: PageRoute, nextLocale: Locale, slug?: string) => {
      if (typeof window === 'undefined') return;
      const targetPath = buildPathForRoute(nextRoute, nextLocale, slug);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ route: nextRoute, locale: nextLocale, slug }, '', targetPath);
      }
    },
    []
  );

  const navigate = useCallback(
    (nextRoute: PageRoute) => {
      setRoute(nextRoute);
      setMobileMenuOpen(false);
      if (nextRoute !== 'product') setUrlProductSlug(undefined);
      if (nextRoute !== 'blog') setUrlBlogSlug(undefined);
      if (nextRoute !== 'catalogue') setUrlSearchQuery('');
      const slug =
        nextRoute === 'product' ? selectedProduct?.slug ?? urlProductSlug : undefined;
      pushRouteUrl(nextRoute, locale, slug);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [locale, pushRouteUrl, selectedProduct?.slug, urlProductSlug]
  );

  const handleRouteAnchorClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, nextRoute: PageRoute) => {
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        navigate(nextRoute);
      }
    },
    [navigate]
  );

  const switchLocale = useCallback(
    (nextLocale: Locale) => {
      setLocale(nextLocale);
      setMobileMenuOpen(false);
      const slug =
        route === 'product'
          ? selectedProduct?.slug ?? urlProductSlug
          : route === 'blog'
            ? urlBlogSlug
            : undefined;
      pushRouteUrl(route, nextLocale, slug);
    },
    [pushRouteUrl, route, selectedProduct?.slug, urlBlogSlug, urlProductSlug]
  );

  useEffect(() => {
    const onPopState = () => {
      const parsed = parsePathToRoute(window.location.pathname);
      setLocale(parsed.locale);
      setRoute(parsed.route);
      setUrlProductSlug(parsed.productSlug);
      setUrlBlogSlug(parsed.blogSlug);
      setUrlSearchQuery(new URLSearchParams(window.location.search).get('q') ?? '');
      setMobileMenuOpen(false);
      if (!parsed.productSlug) {
        setSelectedProduct(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const loadPublicData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [catRes, blogRes] = await Promise.all([fetch('/api/catalog'), fetch('/api/blog')]);
      if (!catRes.ok) throw new Error('Failed to load product catalog.');
      if (!blogRes.ok) throw new Error('Failed to load blog posts.');
      const [catJson, blogJson] = await Promise.all([catRes.json(), blogRes.json()]);
      setCatalog(catJson);
      setBlog(blogJson);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to reach PEPTIVORA API.');
    } finally {
      setLoading(false);
    }
  }, []);

  const authFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
      if (!firebaseUser) {
        throw new Error('Authentication required.');
      }
      const token = await firebaseUser.getIdToken();
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${token}`);
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(input, { ...init, headers });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        if (contentType.includes('application/json')) {
          const json = await res.json();
          throw new Error(json.error || 'Request failed');
        }
        throw new Error('Request failed');
      }
      return res;
    },
    [firebaseUser]
  );

  const loadAuthenticatedContext = useCallback(
    async (user: User | null) => {
      if (!user) {
        setAccount(null);
        setCompliance(null);
        return;
      }
      try {
        const token = await user.getIdToken();
        const meRes = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) return;
        const meJson = (await meRes.json()) as CustomerAccountResponse;
        setAccount(meJson);

        if (STAFF_ROLES.includes(meJson.primaryRole)) {
          const compRes = await fetch('/api/compliance/overview', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (compRes.ok) {
            setCompliance(await compRes.json());
          }
        }
      } catch {
        // Keep unauthenticated state clean
      }
    },
    []
  );

  useEffect(() => {
    void loadPublicData();
  }, [loadPublicData]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      void loadAuthenticatedContext(user);
    });
    return () => unsub();
  }, [loadAuthenticatedContext]);

  const researchDiv = catalog?.divisions.find((d) => d.slug === 'research');
  const isStaff = Boolean(account && STAFF_ROLES.includes(account.primaryRole));
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const resolvedProduct = useMemo(() => {
    if (selectedProduct) return selectedProduct;
    if (urlProductSlug && catalog) {
      return catalog.products.find((p) => p.slug === urlProductSlug) ?? null;
    }
    return null;
  }, [catalog, selectedProduct, urlProductSlug]);

  const resolvedBlogPost = useMemo(() => {
    if (urlBlogSlug && blog) {
      return blog.posts.find((p) => p.slug === urlBlogSlug) ?? null;
    }
    return null;
  }, [blog, urlBlogSlug]);

  const breadcrumbs = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://peptivora.de';
    const extraTitle =
      route === 'product' && resolvedProduct
        ? locale === 'de'
          ? resolvedProduct.nameDe
          : resolvedProduct.nameEn
        : route === 'blog' && resolvedBlogPost
          ? locale === 'de'
            ? resolvedBlogPost.titleDe
            : resolvedBlogPost.titleEn
          : undefined;
    return buildBreadcrumbs(route, locale, baseUrl, extraTitle);
  }, [locale, resolvedBlogPost, resolvedProduct, route]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const baseUrl = window.location.origin;
    const snapshot = buildPageSeoSnapshot({
      baseUrl,
      locale,
      route,
      seoPages: catalog?.governance?.seoPages ?? DEFAULT_SEO_PAGES,
      product: resolvedProduct,
      blogPost: resolvedBlogPost,
      products: catalog?.products,
      blogPosts: blog?.posts,
    });
    document.documentElement.lang = locale;
    document.title = snapshot.title;

    const upsertMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const upsertLink = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]`;
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        if (hreflang) el.setAttribute('hreflang', hreflang);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    upsertMeta('name', 'description', snapshot.description);
    upsertMeta('name', 'robots', snapshot.robots);
    upsertMeta('property', 'og:title', snapshot.title);
    upsertMeta('property', 'og:description', snapshot.description);
    upsertMeta('property', 'og:url', snapshot.canonicalUrl);
    upsertMeta('property', 'og:type', snapshot.ogType);
    upsertMeta('property', 'og:image', snapshot.ogImage);
    upsertMeta('name', 'twitter:title', snapshot.title);
    upsertMeta('name', 'twitter:description', snapshot.description);

    upsertLink('canonical', snapshot.canonicalUrl);
    upsertLink('alternate', snapshot.hreflangDe, 'de-DE');
    upsertLink('alternate', snapshot.hreflangEn, 'en-GB');
    upsertLink('alternate', snapshot.hreflangDe, 'x-default');

    document.head
      .querySelectorAll('script[type="application/ld+json"][data-peptivora-ld="true"]')
      .forEach((node) => node.remove());

    for (const schema of snapshot.jsonLdSchemas) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-peptivora-ld', 'true');
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }
  }, [
    blog?.posts,
    catalog?.governance?.seoPages,
    catalog?.products,
    locale,
    resolvedBlogPost,
    resolvedProduct,
    route,
  ]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const cfg = catalog?.governance?.seoIntegrations;
    const existingGa = document.getElementById('peptivora-ga4-script');
    if (!analyticsCookies && (cfg?.analyticsRequiresConsent ?? true)) {
      existingGa?.remove();
      return;
    }
    const gaId = cfg?.ga4MeasurementId?.trim();
    if (gaId && /^G-[A-Z0-9]+$/i.test(gaId) && !existingGa) {
      const script = document.createElement('script');
      script.id = 'peptivora-ga4-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
      document.head.appendChild(script);
    }
  }, [analyticsCookies, catalog?.governance?.seoIntegrations]);

  function handleSelectProduct(product: ProductDto) {
    setSelectedProduct(product);
    setUrlProductSlug(product.slug);
    setRoute('product');
    setMobileMenuOpen(false);
    pushRouteUrl('product', locale, product.slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleActivePostChange(post: BlogPostDto | null) {
    setUrlBlogSlug(post?.slug);
    pushRouteUrl('blog', locale, post?.slug);
  }

  function handleAddToCart(product: ProductDto, variant?: ProductVariantDto | null) {
    if (product.divisionSlug !== 'research' || !product.pricePermitted) return;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx
            ? { ...item, variant: variant ?? item.variant, quantity: Math.min(50, item.quantity + 1) }
            : item
        );
      }
      return [...prev, { product, variant: variant ?? product.variants[0] ?? null, quantity: 1 }];
    });
    setCartDrawerOpen(true);
  }

  function handleUpdateCartQty(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, Math.min(50, item.quantity + delta)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function handleRemoveFromCart(productId: number) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  async function handleDownloadDocument(docId: number, fileName: string) {
    const res = await authFetch(`/api/documents/${docId}/download`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleSaveCookies(prefs: { functional: boolean; analytics: boolean }) {
    setFunctionalCookies(prefs.functional);
    setAnalyticsCookies(prefs.analytics);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (firebaseUser) {
      headers.Authorization = `Bearer ${await firebaseUser.getIdToken()}`;
    }
    await fetch('/api/consent', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        visitorSessionId: getSessionId(),
        essentialCookies: true,
        functionalCookies: prefs.functional,
        analyticsCookies: prefs.analytics,
        locale,
      }),
    });
    try {
      localStorage.setItem('peptivora_consent_saved', 'true');
    } catch {
      // ignore
    }
    setConsentRecorded(true);
  }

  async function refreshAll() {
    await Promise.all([loadPublicData(), loadAuthenticatedContext(firebaseUser)]);
  }

  return (
    <div className="min-h-screen flex flex-col bg-lightgrey text-charcoal font-sans">
      {/* Sticky Top Header — Clean Responsive 3 Zones */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-silver">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a
            href={buildPathForRoute('home', locale)}
            onClick={(e) => handleRouteAnchorClick(e, 'home')}
            className="font-display text-xl font-bold tracking-tight text-navy whitespace-nowrap shrink-0"
          >
            PEPTIVORA
          </a>

          <nav
            aria-label={locale === 'de' ? 'Hauptnavigation' : 'Primary Navigation'}
            className="hidden md:flex items-center gap-6 text-sm font-medium text-navy"
          >
            {(
              [
                ['research', t.nav.research],
                ['pharmaceutical', t.nav.pharmaceutical],
                ['catalogue', t.nav.catalogue],
                ['quality', t.nav.quality],
                ['knowledge', t.nav.knowledge],
              ] as [PageRoute, string][]
            ).map(([r, label]) => (
              <a
                key={r}
                href={buildPathForRoute(r, locale)}
                onClick={(e) => handleRouteAnchorClick(e, r)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  route === r
                    ? 'border-scientific text-scientific'
                    : 'border-transparent hover:text-scientific'
                }`}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              aria-label={`${t.nav.cart} (${cartCount})`}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 min-h-[44px] bg-navy text-white text-xs font-semibold rounded-sm hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              <span className="hidden xs:inline">{t.nav.cart}</span>
              <span className="font-mono">({cartCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={locale === 'de' ? 'Menü öffnen' : 'Open menu'}
              className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] border border-silver rounded-sm text-navy hover:bg-lightgrey cursor-pointer"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Inline Sub-Bar (Desktop Only — Mobile uses Drawer) */}
      <div className="hidden md:block bg-navy text-slate-200 border-b border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {(
              [
                ['about', t.nav.about],
                ['blog', t.nav.blog],
                ['faq', t.nav.faq],
                ['contact', t.nav.contact],
              ] as [PageRoute, string][]
            ).map(([r, label]) => (
              <a
                key={r}
                href={buildPathForRoute(r, locale)}
                onClick={(e) => handleRouteAnchorClick(e, r)}
                className={`hover:text-white transition-colors ${
                  route === r ? 'text-white font-semibold underline' : 'text-slate-300'
                }`}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div
              role="group"
              aria-label="Language"
              className="inline-flex items-center border border-white/25 rounded-sm overflow-hidden font-mono"
            >
              <button
                type="button"
                onClick={() => switchLocale('de')}
                className={`px-2 py-0.5 cursor-pointer ${
                  locale === 'de' ? 'bg-scientific text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                DE
              </button>
              <button
                type="button"
                onClick={() => switchLocale('en')}
                className={`px-2 py-0.5 cursor-pointer ${
                  locale === 'en' ? 'bg-scientific text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <a
              href={buildPathForRoute('account', locale)}
              onClick={(e) => handleRouteAnchorClick(e, 'account')}
              className={`hover:text-white ${
                route === 'account' ? 'text-white font-semibold underline' : ''
              }`}
            >
              {firebaseUser ? firebaseUser.email : t.nav.account}
            </a>

            {isStaff && (
              <a
                href={buildPathForRoute('compliance', locale)}
                onClick={(e) => handleRouteAnchorClick(e, 'compliance')}
                className="inline-flex items-center gap-1 text-blue-300 hover:text-white font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.nav.compliance}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Slide-Out Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex justify-end bg-navy/60 backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={locale === 'de' ? 'Mobile Navigation' : 'Mobile Navigation'}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs h-full bg-white shadow-2xl border-l border-silver overflow-y-auto flex flex-col justify-between"
          >
            <div className="p-5 space-y-6">
              <div className="flex items-center justify-between border-b border-silver pb-3">
                <span className="font-display text-lg font-bold text-navy">PEPTIVORA</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={locale === 'de' ? 'Menü schließen' : 'Close menu'}
                  className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] border border-silver rounded-sm text-navy hover:bg-lightgrey cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-charcoal/70">
                  {locale === 'de' ? 'Sprache' : 'Language'}
                </span>
                <div
                  role="group"
                  aria-label="Language"
                  className="inline-flex items-center border border-silver rounded-sm overflow-hidden font-mono text-xs"
                >
                  <button
                    type="button"
                    onClick={() => switchLocale('de')}
                    className={`min-w-[44px] min-h-[40px] cursor-pointer ${
                      locale === 'de' ? 'bg-navy text-white font-semibold' : 'bg-white text-navy'
                    }`}
                  >
                    DE
                  </button>
                  <button
                    type="button"
                    onClick={() => switchLocale('en')}
                    className={`min-w-[44px] min-h-[40px] cursor-pointer ${
                      locale === 'en' ? 'bg-navy text-white font-semibold' : 'bg-white text-navy'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              <nav
                aria-label={locale === 'de' ? 'Mobile Seitenlinks' : 'Mobile page links'}
                className="space-y-4"
              >
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-charcoal/60 mb-1.5">
                    {locale === 'de' ? 'Bereiche & Katalog' : 'Divisions & Catalogue'}
                  </div>
                  <div className="space-y-1">
                    {(
                      [
                        ['home', locale === 'de' ? 'Startseite' : 'Home'],
                        ['research', t.nav.research],
                        ['pharmaceutical', t.nav.pharmaceutical],
                        ['catalogue', t.nav.catalogue],
                        ['quality', t.nav.quality],
                        ['knowledge', t.nav.knowledge],
                      ] as [PageRoute, string][]
                    ).map(([r, label]) => (
                      <a
                        key={r}
                        href={buildPathForRoute(r, locale)}
                        onClick={(e) => handleRouteAnchorClick(e, r)}
                        className={`flex items-center min-h-[44px] px-3 rounded-sm text-sm font-medium ${
                          route === r
                            ? 'bg-scientific/10 text-scientific font-semibold'
                            : 'text-navy hover:bg-lightgrey'
                        }`}
                      >
                        {label}
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-charcoal/60 mb-1.5">
                    {locale === 'de' ? 'Unternehmen & Service' : 'Company & Support'}
                  </div>
                  <div className="space-y-1">
                    {(
                      [
                        ['about', t.nav.about],
                        ['blog', t.nav.blog],
                        ['faq', t.nav.faq],
                        ['contact', t.nav.contact],
                        ['account', firebaseUser ? firebaseUser.email || t.nav.account : t.nav.account],
                      ] as [PageRoute, string][]
                    ).map(([r, label]) => (
                      <a
                        key={r}
                        href={buildPathForRoute(r, locale)}
                        onClick={(e) => handleRouteAnchorClick(e, r)}
                        className={`flex items-center min-h-[44px] px-3 rounded-sm text-sm font-medium ${
                          route === r
                            ? 'bg-scientific/10 text-scientific font-semibold'
                            : 'text-navy hover:bg-lightgrey'
                        }`}
                      >
                        <span className="truncate">{label}</span>
                      </a>
                    ))}

                    {isStaff && (
                      <a
                        href={buildPathForRoute('compliance', locale)}
                        onClick={(e) => handleRouteAnchorClick(e, 'compliance')}
                        className="flex items-center gap-2 min-h-[44px] px-3 rounded-sm text-sm font-semibold text-scientific bg-blue-50"
                      >
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        <span>{t.nav.compliance}</span>
                      </a>
                    )}
                  </div>
                </div>
              </nav>
            </div>

            <div className="p-4 border-t border-silver bg-lightgrey text-[11px] text-charcoal/70 space-y-2">
              <div className="flex flex-wrap gap-3">
                <a
                  href={buildPathForRoute('impressum', locale)}
                  onClick={(e) => handleRouteAnchorClick(e, 'impressum')}
                  className="hover:text-navy underline"
                >
                  {t.nav.impressum}
                </a>
                <a
                  href={buildPathForRoute('privacy', locale)}
                  onClick={(e) => handleRouteAnchorClick(e, 'privacy')}
                  className="hover:text-navy underline"
                >
                  {t.nav.privacy}
                </a>
                <a
                  href={buildPathForRoute('terms', locale)}
                  onClick={(e) => handleRouteAnchorClick(e, 'terms')}
                  className="hover:text-navy underline"
                >
                  {t.nav.terms}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Semantic Breadcrumb Bar on Inner Routes */}
      {route !== 'home' && breadcrumbs.length > 1 && (
        <nav
          aria-label="Breadcrumb"
          className="bg-white border-b border-silver/70 text-[11px] text-charcoal/70"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center gap-1.5 font-mono">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={`${crumb.route}-${idx}`} className="inline-flex items-center gap-1.5">
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-silver" aria-hidden="true" />}
                  {isLast ? (
                    <span className="text-navy font-semibold">
                      {locale === 'de' ? crumb.labelDe : crumb.labelEn}
                    </span>
                  ) : (
                    <a
                      href={buildPathForRoute(crumb.route, locale)}
                      onClick={(e) => handleRouteAnchorClick(e, crumb.route)}
                      className="hover:text-scientific hover:underline"
                    >
                      {locale === 'de' ? crumb.labelDe : crumb.labelEn}
                    </a>
                  )}
                </span>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {loading && !catalog ? (
          <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm text-charcoal/75">
            {t.common.loading}
          </div>
        ) : loadError ? (
          <div className="max-w-3xl mx-auto px-4 py-16">
            <div className="bg-white border border-red-300 text-red-900 p-6 rounded-sm space-y-3">
              <div className="font-semibold">{loadError}</div>
              <button
                type="button"
                onClick={() => void loadPublicData()}
                className="px-4 py-2 bg-navy text-white text-xs rounded-sm cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {route === 'home' && catalog && (
              <HomePage
                locale={locale}
                divisions={catalog.divisions}
                products={catalog.products}
                blogPosts={blog?.posts ?? []}
                onNavigate={navigate}
                onSelectProduct={handleSelectProduct}
                onAddToCart={(p) => handleAddToCart(p)}
              />
            )}

            {route === 'about' && <AboutPage locale={locale} onNavigate={navigate} />}

            {route === 'research' && catalog && (
              <ResearchDivisionPage
                locale={locale}
                divisions={catalog.divisions}
                products={catalog.products}
                onSelectProduct={handleSelectProduct}
                onAddToCart={(p) => handleAddToCart(p)}
                onNavigate={navigate}
              />
            )}

            {route === 'pharmaceutical' && catalog && (
              <PharmaceuticalDivisionPage
                locale={locale}
                divisions={catalog.divisions}
                governance={catalog.governance}
                isSignedIn={Boolean(firebaseUser)}
                onNavigate={navigate}
                onValidateDispense={async (payload) => {
                  const res = await authFetch('/api/pharmaceutical/dispense', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  return res.json();
                }}
              />
            )}

            {route === 'catalogue' && catalog && (
              <CataloguePage
                locale={locale}
                divisions={catalog.divisions}
                categories={catalog.categories}
                classifications={catalog.classifications}
                products={catalog.products}
                initialQuery={urlSearchQuery}
                onSelectProduct={handleSelectProduct}
                onAddToCart={(p) => handleAddToCart(p)}
              />
            )}

            {route === 'product' && (
              <ProductDetailPage
                locale={locale}
                product={resolvedProduct}
                divisionTransactionsEnabled={Boolean(researchDiv?.transactionsEnabled)}
                isSignedIn={Boolean(firebaseUser)}
                onBack={() => navigate('catalogue')}
                onAddToCart={handleAddToCart}
                onDownloadDocument={handleDownloadDocument}
              />
            )}

            {route === 'quality' && <QualityPage locale={locale} onNavigate={navigate} />}
            {route === 'knowledge' && <KnowledgePage locale={locale} onNavigate={navigate} />}
            {route === 'faq' && <FaqPage locale={locale} onNavigate={navigate} />}

            {route === 'blog' && (
              <BlogPage
                locale={locale}
                categories={blog?.categories ?? []}
                posts={blog?.posts ?? []}
                initialPostSlug={urlBlogSlug}
                onActivePostChange={handleActivePostChange}
              />
            )}

            {route === 'contact' && <ContactPage locale={locale} />}

            {route === 'account' && (
              <AccountKybView
                locale={locale}
                isSignedIn={Boolean(firebaseUser)}
                email={firebaseUser?.email ?? null}
                primaryRole={account?.primaryRole ?? null}
                profile={account?.profile ?? null}
                addresses={account?.addresses ?? []}
                orders={account?.orders ?? []}
                notifications={account?.notifications ?? []}
                supportTickets={account?.supportTickets ?? []}
                onSignInGoogle={async () => {
                  await signInWithGoogle();
                }}
                onSignInEmail={async (emailInput, passwordInput) => {
                  await signInWithEmailPassword(emailInput, passwordInput);
                }}
                onRegisterEmail={async (emailInput, passwordInput, displayNameInput) => {
                  await registerWithEmailPassword(emailInput, passwordInput, displayNameInput);
                }}
                onRecoverPassword={async (emailInput) => {
                  await recoverPassword(emailInput);
                }}
                onSignOut={async () => {
                  await signOutUser();
                }}
                onUpdateProfile={async (payload) => {
                  await authFetch('/api/me/profile', {
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onSubmitKyb={async (payload) => {
                  await authFetch('/api/me/kyb', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onAddAddress={async (payload) => {
                  await authFetch('/api/me/addresses', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onDeleteAddress={async (id) => {
                  await authFetch(`/api/me/addresses/${id}`, { method: 'DELETE' });
                  await refreshAll();
                }}
                onCancelOrder={async (orderId, reason) => {
                  await authFetch(`/api/orders/${orderId}/cancel`, {
                    method: 'POST',
                    body: JSON.stringify({ reason }),
                  });
                  await refreshAll();
                }}
                onRequestRefund={async (orderId, reason) => {
                  await authFetch(`/api/orders/${orderId}/refund-request`, {
                    method: 'POST',
                    body: JSON.stringify({ reason }),
                  });
                  await refreshAll();
                }}
                onSubmitSupportTicket={async (payload) => {
                  await authFetch('/api/contact', {
                    method: 'POST',
                    body: JSON.stringify({
                      senderName:
                        account?.profile?.displayName ||
                        firebaseUser?.displayName ||
                        firebaseUser?.email ||
                        'PEPTIVORA Customer',
                      senderEmail: firebaseUser?.email || '',
                      organization: account?.profile?.organizationName || '',
                      topic: payload.topic,
                      message: payload.message,
                      locale,
                    }),
                  });
                  await refreshAll();
                }}
                onExportGdprData={async () => {
                  const res = await authFetch('/api/me/export');
                  const json = await res.json();
                  const blob = new Blob([JSON.stringify(json, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'peptivora-gdpr-data-export.json';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                }}
                onEraseGdprData={async (confirmPhrase) => {
                  await authFetch('/api/me/gdpr-erase', {
                    method: 'POST',
                    body: JSON.stringify({ confirmPhrase }),
                  });
                  await refreshAll();
                }}
              />
            )}

            {route === 'cart' && (
              <CartPage
                locale={locale}
                cart={cart}
                onUpdateQty={handleUpdateCartQty}
                onRemove={handleRemoveFromCart}
                onNavigate={navigate}
              />
            )}

            {route === 'checkout' && catalog && (
              <CheckoutPage
                locale={locale}
                cart={cart}
                shippingMethods={catalog.shippingMethods}
                paymentProviders={catalog.paymentProviders}
                isSignedIn={Boolean(firebaseUser)}
                isStaff={isStaff}
                profile={account?.profile ?? null}
                addresses={account?.addresses ?? []}
                onNavigate={navigate}
                onSubmitOrder={async (payload) => {
                  const res = await authFetch('/api/orders', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  const json = (await res.json()) as { order: OrderDto };
                  setCart([]);
                  await refreshAll();
                  return json.order;
                }}
              />
            )}

            {route === 'privacy' && (
              <PrivacyPage locale={locale} governance={catalog?.governance} />
            )}
            {route === 'terms' && (
              <TermsPage locale={locale} governance={catalog?.governance} />
            )}
            {route === 'impressum' && (
              <ImpressumPage locale={locale} governance={catalog?.governance} />
            )}

            {route === 'cookies' && (
              <CookiePreferencesPage
                locale={locale}
                functionalCookies={functionalCookies}
                analyticsCookies={analyticsCookies}
                onSavePreferences={handleSaveCookies}
              />
            )}

            {route === 'compliance' && isStaff && account && (
              <ComplianceOpsView
                locale={locale}
                currentRole={account.primaryRole}
                overview={compliance}
                onCreateProduct={async (payload) => {
                  await authFetch('/api/compliance/products', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onUpdateProduct={async (productId, payload) => {
                  await authFetch(`/api/compliance/products/${productId}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onAddProductImage={async (productId, payload) => {
                  await authFetch(`/api/compliance/products/${productId}/images`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onAdjustInventory={async (productId, payload) => {
                  await authFetch(`/api/compliance/products/${productId}/inventory`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onSuspendProduct={async (productId, reason) => {
                  await authFetch(`/api/compliance/products/${productId}/suspend`, {
                    method: 'POST',
                    body: JSON.stringify({ reason }),
                  });
                  await refreshAll();
                }}
                onSubmitApproval={async (payload) => {
                  await authFetch('/api/compliance/approvals/submit', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onDecideApproval={async (payload) => {
                  await authFetch('/api/compliance/approvals/decide', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onReviewKyb={async (uid, kybStatus, notes) => {
                  await authFetch(`/api/compliance/kyb/${uid}/review`, {
                    method: 'POST',
                    body: JSON.stringify({ kybStatus, notes }),
                  });
                  await refreshAll();
                }}
                onUpdatePharmaGate={async (payload) => {
                  await authFetch('/api/compliance/pharma-gate', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onUploadDocument={async (payload) => {
                  await authFetch('/api/documents', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onVerifyDocument={async (docId, verificationStatus) => {
                  await authFetch(`/api/documents/${docId}/verify`, {
                    method: 'POST',
                    body: JSON.stringify({ verificationStatus }),
                  });
                  await refreshAll();
                }}
                onAssignRole={async (targetUid, role) => {
                  await authFetch('/api/admin/users/role', {
                    method: 'POST',
                    body: JSON.stringify({ targetUid, role }),
                  });
                  await refreshAll();
                }}
                onFulfilOrder={async (orderId, payload) => {
                  await authFetch(`/api/orders/${orderId}/fulfil`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onUpdatePaymentStatus={async (orderId, payload) => {
                  await authFetch(`/api/orders/${orderId}/payment-status`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onDecideRefund={async (orderId, decision, notes) => {
                  await authFetch(`/api/orders/${orderId}/refund-decide`, {
                    method: 'POST',
                    body: JSON.stringify({ decision, notes }),
                  });
                  await refreshAll();
                }}
                onSaveSeoPage={async (payload) => {
                  await authFetch('/api/compliance/seo/page', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onSaveSeoIntegrations={async (payload) => {
                  await authFetch('/api/compliance/seo/integrations', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onSaveBlogPost={async (payload) => {
                  await authFetch('/api/compliance/blog', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onSaveBusinessProfile={async (payload) => {
                  await authFetch('/api/compliance/business-profile', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onSaveEuPharmacyLogo={async (payload) => {
                  await authFetch('/api/compliance/eu-pharmacy-logo', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onSaveLegalDocs={async (payload) => {
                  await authFetch('/api/compliance/legal-documents', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onSaveProductMatrix={async (payload) => {
                  await authFetch('/api/compliance/product-regulatory-matrix', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
                onSaveProductionChecklist={async (payload) => {
                  await authFetch('/api/compliance/production-checklist', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshAll();
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Comprehensive 4-Column Footer linking all 18 Website Pages */}
      <footer className="bg-navy text-slate-300 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
          <div className="space-y-3">
            <div className="font-display text-lg font-bold text-white">PEPTIVORA</div>
            <p className="text-slate-400 leading-relaxed">{t.brand.tagline}</p>
            <p className="font-mono text-[11px] text-slate-400">{t.brand.country}</p>
          </div>

          <div className="space-y-2">
            <div className="font-mono uppercase tracking-wider text-white font-semibold mb-3">
              {locale === 'de' ? 'Bereiche & Katalog' : 'Divisions & Catalogue'}
            </div>
            {(
              [
                ['research', t.nav.research],
                ['pharmaceutical', t.nav.pharmaceutical],
                ['catalogue', t.nav.catalogue],
                ['cart', t.nav.cart],
                ['checkout', t.nav.checkout],
              ] as [PageRoute, string][]
            ).map(([r, label]) => (
              <a
                key={r}
                href={buildPathForRoute(r, locale)}
                onClick={(e) => handleRouteAnchorClick(e, r)}
                className="block py-0.5 hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="space-y-2">
            <div className="font-mono uppercase tracking-wider text-white font-semibold mb-3">
              {locale === 'de' ? 'Wissenschaft & Unternehmen' : 'Science & Company'}
            </div>
            {(
              [
                ['about', t.nav.about],
                ['quality', t.nav.quality],
                ['knowledge', t.nav.knowledge],
                ['blog', t.nav.blog],
                ['faq', t.nav.faq],
                ['contact', t.nav.contact],
                ['account', t.nav.account],
              ] as [PageRoute, string][]
            ).map(([r, label]) => (
              <a
                key={r}
                href={buildPathForRoute(r, locale)}
                onClick={(e) => handleRouteAnchorClick(e, r)}
                className="block py-0.5 hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="space-y-2">
            <div className="font-mono uppercase tracking-wider text-white font-semibold mb-3">
              {locale === 'de' ? 'Rechtliches & Einwilligung' : 'Legal & Consent'}
            </div>
            {(
              [
                ['impressum', t.nav.impressum],
                ['privacy', t.nav.privacy],
                ['terms', t.nav.terms],
                ['cookies', t.nav.cookies],
              ] as [PageRoute, string][]
            ).map(([r, label]) => (
              <a
                key={r}
                href={buildPathForRoute(r, locale)}
                onClick={(e) => handleRouteAnchorClick(e, r)}
                className="block py-0.5 hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="border-t border-white/10 py-4 px-4 sm:px-6 lg:px-8 text-[11px] text-slate-400 text-center">
          {t.brand.demoNotice}
        </div>
      </footer>

      {/* Cookie Consent Bar (dismissible & persisted to consent_records) */}
      {!consentRecorded && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-40 bg-white border border-navy shadow-xl rounded-sm p-4 space-y-3">
          <div className="text-xs text-navy leading-relaxed">
            {locale === 'de'
              ? 'PEPTIVORA verwendet notwendige Cookies für Sprachwahl und Bereichstrennung. Optionale Einstellungen lassen sich jederzeit anpassen.'
              : 'PEPTIVORA uses essential cookies for locale and division isolation. Optional preferences may be adjusted anytime.'}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSaveCookies({ functional: true, analytics: true })}
              className="px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-sm cursor-pointer"
            >
              {locale === 'de' ? 'Alle akzeptieren' : 'Accept All'}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveCookies({ functional: false, analytics: false })}
              className="px-3 py-1.5 border border-silver text-navy text-xs font-medium rounded-sm cursor-pointer"
            >
              {locale === 'de' ? 'Nur Notwendige' : 'Essential Only'}
            </button>
            <button
              type="button"
              onClick={() => navigate('cookies')}
              className="px-3 py-1.5 text-xs font-medium text-scientific hover:underline cursor-pointer"
            >
              {t.nav.cookies}
            </button>
          </div>
        </div>
      )}

      <CartDrawer
        open={cartDrawerOpen}
        locale={locale}
        cart={cart}
        onClose={() => setCartDrawerOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemove={handleRemoveFromCart}
        onNavigate={navigate}
      />
    </div>
  );
}
