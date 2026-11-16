import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateGermanVat,
  canTransactDivision,
  detectProhibitedMedicinalClaims,
  hasAllPharmaceuticalPrerequisites,
  isProductAvailableForPublicCatalog,
} from '../src/core/domain/compliance.ts';
import {
  DEFAULT_BUSINESS_PROFILE,
  DEFAULT_EU_PHARMACY_LOGO_CONFIG,
  DEFAULT_PRODUCTION_CHECKLIST,
} from '../src/core/compliance/governanceDefaults.ts';
import {
  buildBreadcrumbs,
  buildPageSeoSnapshot,
  buildPathForRoute,
  buildRobotsTxt,
  buildXmlSitemap,
  DEFAULT_SEO_PAGES,
  parsePathToRoute,
} from '../src/core/seo/seoEngine.ts';
import {
  euPharmacyLogoUpdateSchema,
  gdprEraseSchema,
  productionChecklistUpdateSchema,
} from '../src/core/validation/schemas.ts';
import {
  applySecurityHeaders,
  createRateLimiter,
  csrfOriginGuard,
  sanitizePlainText,
} from '../src/middleware/security.ts';
import type { BlogPostDto, ProductDto } from '../src/types/peptivora.ts';

function makeMockProduct(overrides: Partial<ProductDto> = {}): ProductDto {
  return {
    id: 1,
    sku: 'PEP-RES-101',
    slug: 'lyophilized-reference-peptide-alpha',
    divisionId: 1,
    divisionSlug: 'research',
    categoryId: 1,
    categorySlug: 'research-peptides',
    categoryNameDe: 'Forschungspeptide',
    categoryNameEn: 'Research Peptides',
    classificationId: 1,
    classificationCode: 'research_use_only',
    classificationNameDe: 'Nur für Forschungszwecke (RUO)',
    classificationNameEn: 'Research Use Only (RUO)',
    supplierId: 1,
    manufacturerName: 'PEPTIVORA Analytics Demo Lab',
    manufacturerRuoLabeled: true,
    nameDe: 'Referenzpeptid Alpha-101',
    nameEn: 'Reference Peptide Alpha-101',
    descriptionDe: 'Hochreines analytisches Peptid-Referenzmaterial für In-vitro-Analytik.',
    descriptionEn: 'High-purity analytical peptide reference material for in-vitro assays.',
    technicalSummaryDe: 'HPLC >= 98%',
    technicalSummaryEn: 'HPLC >= 98%',
    regulatoryNoticeDe: 'Nur für Labor- und Forschungszwecke.',
    regulatoryNoticeEn: 'Strictly for laboratory research use only.',
    casNumber: null,
    molecularFormula: 'C20H34N6O5',
    molecularWeight: '438.52 g/mol',
    sequence: 'Gly-Ala-Val-Leu',
    storageCondition: '-20 °C, lyophilized',
    pricePermitted: true,
    priceNetCents: 12000,
    vatRateBps: 1900,
    currency: 'EUR',
    stockStatus: 'in_stock',
    publicationStatus: 'published',
    approvalStatus: 'approved',
    isDemonstrationRecord: true,
    createdByUid: 'staff-pm-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    divisionNameDe: 'Forschung',
    divisionNameEn: 'Research',
    supplierName: 'PEPTIVORA Analytics Demo Lab',
    approvalExpiresAt: '2027-01-01T00:00:00.000Z',
    approvalJurisdiction: 'DE / EU',
    images: [],
    variants: [],
    inventory: [],
    documents: [],
    ...overrides,
  };
}

test('1. Regulatory Guardrail: blocks medicinal and therapeutic claims on RUO text', () => {
  assert.equal(detectProhibitedMedicinalClaims(['Lyophilized HPLC analytical peptide']), null);
  assert.ok(
    detectProhibitedMedicinalClaims(['This peptide cures chronic inflammation']),
    'Must flag English therapeutic claims'
  );
  assert.ok(
    detectProhibitedMedicinalClaims(['Therapeutisch als Heilmittel gegen Beschwerden']),
    'Must flag German medicinal claims'
  );
});

test('2. Regulatory Guardrail: draft, suspended, and expired approvals never enter public catalog', () => {
  assert.equal(
    isProductAvailableForPublicCatalog({
      publicationStatus: 'published',
      approvalStatus: 'approved',
      latestApprovalExpiresAt: new Date(Date.now() + 86_400_000),
    }),
    true
  );
  assert.equal(
    isProductAvailableForPublicCatalog({
      publicationStatus: 'unpublished',
      approvalStatus: 'approved',
    }),
    false
  );
  assert.equal(
    isProductAvailableForPublicCatalog({
      publicationStatus: 'published',
      approvalStatus: 'suspended',
    }),
    false
  );
  assert.equal(
    isProductAvailableForPublicCatalog({
      publicationStatus: 'published',
      approvalStatus: 'approved',
      latestApprovalExpiresAt: new Date(Date.now() - 86_400_000),
    }),
    false
  );
});

test('3. Pharmaceutical Division Gate remains strictly fail-closed until all 4 statutory pillars verify', () => {
  const baseDiv = {
    id: 2,
    slug: 'pharmaceutical' as const,
    nameDe: 'Pharmazie',
    nameEn: 'Pharmaceutical',
    descriptionDe: 'Pharma',
    descriptionEn: 'Pharma',
    catalogVisible: false,
    transactionsEnabled: true,
    pharmacyLicenseVerified: true,
    distributionArrangementVerified: true,
    productAuthorizationVerified: true,
    dispensingWorkflowVerified: false,
    verifiedByUid: 'rev-1',
    verifiedAt: new Date(),
    notes: null,
  };

  assert.equal(hasAllPharmaceuticalPrerequisites(baseDiv), false);
  assert.equal(canTransactDivision(baseDiv), false);

  const unlockedDiv = { ...baseDiv, dispensingWorkflowVerified: true };
  assert.equal(hasAllPharmaceuticalPrerequisites(unlockedDiv), true);
  assert.equal(canTransactDivision(unlockedDiv), true);
});

test('4. Commerce Math: German 19% VAT calculation rounds accurately in EUR cents', () => {
  const vat = calculateGermanVat(10000, 2, 1900);
  assert.equal(vat.netCents, 20000);
  assert.equal(vat.vatCents, 3800);
  assert.equal(vat.grossCents, 23800);
});

test('5. SEO URL Architecture: clean DE/EN paths and deep product/blog slug parsing', () => {
  assert.deepEqual(parsePathToRoute('/de/'), { locale: 'de', route: 'home' });
  assert.deepEqual(parsePathToRoute('/en/catalogue/'), { locale: 'en', route: 'catalogue' });
  assert.deepEqual(parsePathToRoute('/de/produkt/pep-alpha-1'), {
    locale: 'de',
    route: 'product',
    productSlug: 'pep-alpha-1',
  });
  assert.deepEqual(parsePathToRoute('/en/blog/peptide-hplc-qc'), {
    locale: 'en',
    route: 'blog',
    blogSlug: 'peptide-hplc-qc',
  });
  assert.equal(buildPathForRoute('impressum', 'de'), '/de/impressum/');
  assert.equal(buildPathForRoute('product', 'en', 'pep-alpha-1'), '/en/product/pep-alpha-1');

  const crumbs = buildBreadcrumbs('product', 'de', 'https://peptivora.de', 'Referenzpeptid');
  assert.equal(crumbs.length, 3);
  assert.equal(crumbs[1].route, 'catalogue');
});

test('6. SEO Structured Data & XML Sitemap: excludes unapproved products & checkout; never fabricates reviews', () => {
  const approvedResearch = makeMockProduct();
  const unapprovedDraft = makeMockProduct({
    id: 2,
    slug: 'unapproved-draft-item',
    approvalStatus: 'draft',
    publicationStatus: 'unpublished',
  });
  const pharmaNoPrice = makeMockProduct({
    id: 3,
    slug: 'pharma-gated-item',
    divisionSlug: 'pharmaceutical',
    pricePermitted: false,
  });

  const post: BlogPostDto = {
    id: 1,
    slug: 'hplc-analytik',
    categoryId: 1,
    authorId: 1,
    titleDe: 'HPLC Peptidanalytik',
    titleEn: 'HPLC Peptide Analytics',
    excerptDe: 'Grundlagen der Reinheitsprüfung.',
    excerptEn: 'Fundamentals of purity testing.',
    bodyDe: 'Volltext Analytik.',
    bodyEn: 'Full analytical text.',
    imageUrl: null,
    publishedAt: '2026-01-10T00:00:00.000Z',
  };

  const xml = buildXmlSitemap(
    'https://peptivora.de',
    [approvedResearch, unapprovedDraft],
    [post]
  );
  assert.ok(xml.includes('/de/produkt/lyophilized-reference-peptide-alpha'));
  assert.ok(!xml.includes('unapproved-draft-item'));
  assert.ok(!xml.includes('/de/kasse/'));
  assert.ok(!xml.includes('/de/compliance/'));

  const robots = buildRobotsTxt('https://peptivora.de');
  assert.ok(robots.includes('Disallow: /api/'));
  assert.ok(robots.includes('Disallow: /de/kasse/'));
  assert.ok(robots.includes('Sitemap: https://peptivora.de/sitemap.xml'));

  const researchSnap = buildPageSeoSnapshot({
    baseUrl: 'https://peptivora.de',
    locale: 'de',
    route: 'product',
    seoPages: DEFAULT_SEO_PAGES,
    product: approvedResearch,
  });
  const productLd = researchSnap.jsonLdSchemas.find((s) => s['@type'] === 'Product');
  assert.ok(productLd);
  assert.ok(productLd.offers, 'Approved RUO item with pricePermitted emits Offer schema');
  assert.equal(productLd.aggregateRating, undefined, 'Never fabricate aggregateRating');

  const pharmaSnap = buildPageSeoSnapshot({
    baseUrl: 'https://peptivora.de',
    locale: 'de',
    route: 'product',
    seoPages: DEFAULT_SEO_PAGES,
    product: pharmaNoPrice,
  });
  const pharmaLd = pharmaSnap.jsonLdSchemas.find((s) => s['@type'] === 'Product');
  assert.equal(pharmaLd?.offers, undefined, 'Non-permitted items must never emit Offer schema');

  const websiteLd = researchSnap.jsonLdSchemas.find((s) => s['@type'] === 'WebSite') as
    | { potentialAction?: { '@type'?: string; target?: string } }
    | undefined;
  assert.equal(websiteLd?.potentialAction?.['@type'], 'SearchAction');
  assert.ok(websiteLd?.potentialAction?.target?.includes('?q={search_term_string}'));

  const faqSnap = buildPageSeoSnapshot({
    baseUrl: 'https://peptivora.de',
    locale: 'de',
    route: 'faq',
    seoPages: DEFAULT_SEO_PAGES,
  });
  const faqLd = faqSnap.jsonLdSchemas.find((s) => s['@type'] === 'FAQPage') as
    | { mainEntity?: unknown[] }
    | undefined;
  assert.ok(faqLd && Array.isArray(faqLd.mainEntity) && faqLd.mainEntity.length >= 4);

  const catSnap = buildPageSeoSnapshot({
    baseUrl: 'https://peptivora.de',
    locale: 'en',
    route: 'catalogue',
    seoPages: DEFAULT_SEO_PAGES,
    products: [approvedResearch, unapprovedDraft],
  });
  const catLd = catSnap.jsonLdSchemas.find((s) => s['@type'] === 'CollectionPage') as
    | { mainEntity?: { '@type'?: string; numberOfItems?: number } }
    | undefined;
  assert.equal(catLd?.mainEntity?.['@type'], 'ItemList');
  assert.equal(catLd?.mainEntity?.numberOfItems, 1, 'CollectionPage excludes unapproved drafts');
});

test('7. Governance Fail-Closed Defaults & GDPR Validation', () => {
  assert.equal(DEFAULT_BUSINESS_PROFILE.verificationStatus, 'pending_documentation');
  assert.equal(DEFAULT_EU_PHARMACY_LOGO_CONFIG.enabled, false);
  assert.equal(DEFAULT_PRODUCTION_CHECKLIST.productionAuthorized, false);

  const badLogo = euPharmacyLogoUpdateSchema.safeParse({
    enabled: true,
    authorityRegisterUrl: 'http://insecure.example/register',
    authorizedOperatorName: 'Test Apotheke',
    displayNoteDe: 'Test Hinweis DE',
    displayNoteEn: 'Test Note EN',
  });
  assert.equal(badLogo.success, false, 'EU Pharmacy Logo must reject non-HTTPS register URLs');

  const badGdpr = gdprEraseSchema.safeParse({ confirmPhrase: 'delete me' });
  assert.equal(badGdpr.success, false, 'GDPR Art. 17 erasure requires exact confirmation phrase');

  const goodChecklist = productionChecklistUpdateSchema.safeParse(DEFAULT_PRODUCTION_CHECKLIST);
  assert.equal(goodChecklist.success, true);
});

test('8. Security Middleware: XSS escaping, CSRF Origin rejection, security headers, and rate limiter', () => {
  assert.equal(
    sanitizePlainText('<script>alert(1)</script>'),
    '&lt;script&gt;alert(1)&lt;/script&gt;'
  );

  // Security headers check
  const headers: Record<string, string> = {};
  const fakeRes = {
    statusCode: 200,
    setHeader: (k: string, v: string) => {
      headers[k.toLowerCase()] = v;
    },
    status: function (code: number) {
      this.statusCode = code;
      return this;
    },
    json: function (body: unknown) {
      (this as { body?: unknown }).body = body;
      return this;
    },
  };

  let nextCalled = false;
  applySecurityHeaders({ path: '/api/catalog' } as never, fakeRes as never, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.equal(headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(headers['x-robots-tag'], 'noindex, nofollow');

  // CSRF guard rejects mismatched origin on POST
  const csrfRes = { ...fakeRes, statusCode: 200 };
  let csrfNext = false;
  csrfOriginGuard(
    {
      method: 'POST',
      headers: { origin: 'https://evil.example', host: 'peptivora.de' },
    } as never,
    csrfRes as never,
    () => {
      csrfNext = true;
    }
  );
  assert.equal(csrfNext, false);
  assert.equal(csrfRes.statusCode, 403);

  // Rate limiter blocks request #3 when maxRequests is 2
  const limiter = createRateLimiter({ keyPrefix: 'test-unit', windowMs: 60_000, maxRequests: 2 });
  let allowed = 0;
  for (let i = 0; i < 3; i++) {
    const r = { ...fakeRes, statusCode: 200 };
    limiter(
      { headers: {}, socket: { remoteAddress: '127.0.0.99' } } as never,
      r as never,
      () => {
        allowed += 1;
      }
    );
    if (i === 2) assert.equal(r.statusCode, 429);
  }
  assert.equal(allowed, 2);
});

test('9. Live Server Integration: SSR DE/EN, Sitemap, Robots, Catalog API & Fail-Closed Auth/CSRF', async () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthRes.status, 200);
  const health = (await healthRes.json()) as { status: string };
  assert.equal(health.status, 'ok');

  // SSR DE homepage check
  const deHtml = await (await fetch(`${baseUrl}/de/`)).text();
  assert.ok(deHtml.includes('<html lang="de">'), 'SSR sets German html lang');
  assert.ok(deHtml.includes('viewport-fit=cover'), 'Mobile-first viewport meta includes viewport-fit=cover');
  assert.ok(deHtml.includes('application/ld+json'), 'SSR embeds Schema.org JSON-LD');
  assert.ok(deHtml.includes('SearchAction'), 'SSR WebSite JSON-LD includes SearchAction');
  assert.ok(deHtml.includes('hreflang="en-GB"'), 'SSR includes hreflang alternates');
  assert.ok(deHtml.includes('data-ssr-crawler="true"'), 'SSR renders visible semantic crawler shell inside #root');
  assert.ok(!deHtml.includes('left:-9999px'), 'SSR avoids offscreen hidden SEO divs');

  // SSR DE FAQ check
  const deFaqHtml = await (await fetch(`${baseUrl}/de/faq/`)).text();
  assert.ok(deFaqHtml.includes('"@type":"FAQPage"'), 'SSR FAQ route embeds FAQPage JSON-LD');

  // SSR EN catalogue check
  const enCatHtml = await (await fetch(`${baseUrl}/en/catalogue/`)).text();
  assert.ok(enCatHtml.includes('<html lang="en">'), 'SSR sets English html lang');
  assert.ok(enCatHtml.includes('"@type":"CollectionPage"'), 'SSR catalogue embeds CollectionPage JSON-LD');

  // XML Sitemap & Robots.txt
  const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemapRes.status, 200);
  const sitemapText = await sitemapRes.text();
  assert.ok(sitemapText.includes('<urlset'));
  assert.ok(!sitemapText.includes('/de/kasse/'));

  const robotsRes = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(robotsRes.status, 200);
  const robotsText = await robotsRes.text();
  assert.ok(robotsText.includes('Disallow: /api/'));

  // Public Catalog & Blog check
  const catalogRes = await fetch(`${baseUrl}/api/catalog`);
  assert.equal(catalogRes.status, 200);
  const catalogJson = (await catalogRes.json()) as {
    divisions: { slug: string; transactionsEnabled: boolean }[];
    governance?: { euPharmacyLogo?: { enabled: boolean } };
  };
  const pharma = catalogJson.divisions.find((d) => d.slug === 'pharmaceutical');
  assert.equal(pharma?.transactionsEnabled, false, 'Pharmaceutical transactions locked on server');
  assert.equal(
    catalogJson.governance?.euPharmacyLogo?.enabled,
    false,
    'EU Pharmacy Logo disabled by default'
  );

  // Protected endpoints must reject unauthenticated requests (401)
  const unauthCompliance = await fetch(`${baseUrl}/api/compliance/overview`);
  assert.equal(unauthCompliance.status, 401);

  const unauthExport = await fetch(`${baseUrl}/api/me/export`);
  assert.equal(unauthExport.status, 401);

  // Cross-origin POST rejected by CSRF guard (403)
  const csrfPost = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://malicious.example',
    },
    body: JSON.stringify({}),
  });
  assert.equal(csrfPost.status, 403);
});
