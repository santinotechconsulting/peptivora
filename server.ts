import fs from 'node:fs/promises';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  addCustomerAddress,
  addProductImageRecord,
  adjustProductInventory,
  assignUserRole,
  cancelCustomerOrder,
  createDivisionOrder,
  createProductDraft,
  decideOrderRefund,
  decideProductApproval,
  deleteCustomerAddress,
  DomainPolicyError,
  eraseCustomerPersonalData,
  executeRestrictedPharmaceuticalDispensing,
  exportCustomerPersonalData,
  fulfilDivisionOrder,
  getAuthorizedDocumentForDownload,
  getComplianceOverview,
  getCustomerAccountContext,
  getPublicBlogData,
  getPublicCatalogData,
  recordContactMessage,
  recordCookieConsent,
  requestOrderRefund,
  reviewCustomerKyb,
  submitCustomerKyb,
  submitProductApproval,
  subscribeNewsletter,
  suspendProductListing,
  updateBusinessComplianceProfile,
  updateCustomerProfile,
  updateEuPharmacyLogoConfig,
  updateLegalDocumentsConfig,
  updateOrderPaymentStatus,
  updatePharmaceuticalDivisionGate,
  updateProductionChecklist,
  updateProductMetadata,
  updateProductRegulatoryMatrix,
  updateSeoIntegrationsConfig,
  updateSeoPageConfig,
  uploadProductDocument,
  upsertBlogPostWithMetadata,
  validateCoupon,
  verifyProductDocument,
} from './src/db/repository.ts';
import {
  addProductImageSchema,
  addressSchema,
  adjustInventorySchema,
  blogPostUpsertSchema,
  businessProfileUpdateSchema,
  cancelOrderSchema,
  consentRecordSchema,
  contactMessageSchema,
  createOrderSchema,
  createProductSchema,
  decideApprovalSchema,
  decideRefundSchema,
  euPharmacyLogoUpdateSchema,
  fulfilOrderSchema,
  gdprEraseSchema,
  kybProfileSchema,
  legalDocumentsUpdateSchema,
  newsletterSchema,
  pharmaceuticalDispenseSchema,
  pharmaGateUpdateSchema,
  productionChecklistUpdateSchema,
  productRegulatoryMatrixUpdateSchema,
  refundRequestSchema,
  reviewKybSchema,
  seoIntegrationsUpdateSchema,
  seoPageUpdateSchema,
  submitApprovalSchema,
  suspendProductSchema,
  updatePaymentStatusSchema,
  updateProductSchema,
  updateProfileSchema,
  updateUserRoleSchema,
  uploadDocumentSchema,
  verifyDocumentSchema,
} from './src/core/validation/schemas.ts';
import { listPublicPaymentProviders } from './src/core/payments/paymentGateway.ts';
import {
  buildPageSeoSnapshot,
  buildRobotsTxt,
  buildXmlSitemap,
  parsePathToRoute,
} from './src/core/seo/seoEngine.ts';
import type { BlogPostDto, PageRoute, ProductDto } from './src/types/peptivora.ts';
import { optionalAuth, requireAuth, requireRole, type AuthRequest } from './src/middleware/auth.ts';
import {
  applySecurityHeaders,
  createRateLimiter,
  csrfOriginGuard,
} from './src/middleware/security.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveRequestBaseUrl(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;
  if (configured && configured.startsWith('http')) {
    return configured.replace(/\/+$/, '');
  }
  const proto =
    typeof req.headers['x-forwarded-proto'] === 'string'
      ? req.headers['x-forwarded-proto'].split(',')[0].trim()
      : req.protocol || 'http';
  const host = req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

function escapeHtmlAttr(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '3mb' }));
  app.use(applySecurityHeaders);
  app.use('/api', csrfOriginGuard);

  const publicFormLimiter = createRateLimiter({
    keyPrefix: 'public-form',
    windowMs: 60_000,
    maxRequests: 25,
  });
  const orderLimiter = createRateLimiter({
    keyPrefix: 'order-checkout',
    windowMs: 60_000,
    maxRequests: 15,
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'peptivora' });
  });

  app.get('/robots.txt', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buildRobotsTxt(resolveRequestBaseUrl(req)));
  });

  app.get('/sitemap.xml', async (req: Request, res: Response) => {
    try {
      const [catalog, blog] = await Promise.all([getPublicCatalogData(), getPublicBlogData()]);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800');
      res.send(
        buildXmlSitemap(
          resolveRequestBaseUrl(req),
          catalog.products as unknown as ProductDto[],
          blog.posts as unknown as BlogPostDto[]
        )
      );
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Public Catalog, Payment Providers & Editorial Content
  app.get('/api/catalog', async (req: Request, res: Response) => {
    try {
      const division =
        req.query.division === 'research' || req.query.division === 'pharmaceutical'
          ? req.query.division
          : undefined;
      const data = await getPublicCatalogData(division);
      res.json(data);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get('/api/payments/providers', (_req: Request, res: Response) => {
    res.json({ providers: listPublicPaymentProviders() });
  });

  app.get('/api/blog', async (_req: Request, res: Response) => {
    try {
      const data = await getPublicBlogData();
      res.json(data);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Public Engagement Forms (Rate-Limited)
  app.post('/api/contact', publicFormLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = contactMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid contact form submission.', issues: parsed.error.issues });
        return;
      }
      const record = await recordContactMessage(parsed.data);
      res.status(201).json({ message: record });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post('/api/newsletter', publicFormLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = newsletterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid email address.', issues: parsed.error.issues });
        return;
      }
      const subscriber = await subscribeNewsletter(parsed.data.email, parsed.data.locale);
      res.status(201).json({ subscriber });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post('/api/consent', optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = consentRecordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid consent preferences.' });
        return;
      }
      const record = await recordCookieConsent({
        ...parsed.data,
        userUid: req.dbUser?.uid ?? null,
      });
      res.status(201).json({ consent: record });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post('/api/coupons/validate', publicFormLimiter, async (req: Request, res: Response) => {
    try {
      const code = typeof req.body?.code === 'string' ? req.body.code : '';
      const subtotalNetCents = Number(req.body?.subtotalNetCents ?? 0);
      const coupon = await validateCoupon(code, subtotalNetCents);
      res.json({ coupon });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Customer Account, Profile, KYB, Addresses & Orders
  app.get('/api/me', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const context = await getCustomerAccountContext(req.dbUser!.uid);
      res.json({
        ...context,
        primaryRole: req.dbUser!.primaryRole,
      });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.patch('/api/me/profile', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid profile payload.', issues: parsed.error.issues });
        return;
      }
      const profile = await updateCustomerProfile(
        req.dbUser!.uid,
        req.dbUser!.primaryRole,
        parsed.data
      );
      res.json({ profile });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post('/api/me/kyb', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = kybProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid KYB dossier.', issues: parsed.error.issues });
        return;
      }
      const profile = await submitCustomerKyb(
        req.dbUser!.uid,
        req.dbUser!.primaryRole,
        parsed.data
      );
      res.json({ profile });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post('/api/me/addresses', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = addressSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid address payload.', issues: parsed.error.issues });
        return;
      }
      const address = await addCustomerAddress(req.dbUser!.uid, parsed.data);
      res.status(201).json({ address });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.delete('/api/me/addresses/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid address ID.' });
        return;
      }
      await deleteCustomerAddress(req.dbUser!.uid, id);
      res.json({ ok: true });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get('/api/me/export', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const payload = await exportCustomerPersonalData(req.dbUser!.uid);
      res.setHeader('Content-Disposition', 'attachment; filename="peptivora-gdpr-data-export.json"');
      res.json(payload);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post('/api/me/gdpr-erase', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = gdprEraseSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Confirmation phrase 'ERASE MY PERSONAL DATA' is required.",
        });
        return;
      }
      const result = await eraseCustomerPersonalData(req.dbUser!.uid);
      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post('/api/orders', requireAuth, orderLimiter, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid order payload.', issues: parsed.error.issues });
        return;
      }
      const order = await createDivisionOrder(
        req.dbUser!.uid,
        req.dbUser!.roles,
        parsed.data
      );
      res.status(201).json({ order });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post('/api/orders/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const orderId = Number(req.params.id);
      const parsed = cancelOrderSchema.safeParse(req.body);
      if (!Number.isInteger(orderId) || !parsed.success) {
        res.status(400).json({ error: 'Invalid cancellation request.' });
        return;
      }
      const order = await cancelCustomerOrder(
        req.dbUser!.uid,
        req.dbUser!.roles,
        orderId,
        parsed.data.reason
      );
      res.json({ order });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post('/api/orders/:id/refund-request', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const orderId = Number(req.params.id);
      const parsed = refundRequestSchema.safeParse(req.body);
      if (!Number.isInteger(orderId) || !parsed.success) {
        res.status(400).json({ error: 'Invalid refund request.' });
        return;
      }
      const order = await requestOrderRefund(
        req.dbUser!.uid,
        req.dbUser!.roles,
        orderId,
        parsed.data.reason
      );
      res.json({ order });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post(
    '/api/orders/:id/refund-decide',
    requireAuth,
    requireRole(['order_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const orderId = Number(req.params.id);
        const parsed = decideRefundSchema.safeParse(req.body);
        if (!Number.isInteger(orderId) || !parsed.success) {
          res.status(400).json({ error: 'Invalid refund decision payload.' });
          return;
        }
        const order = await decideOrderRefund(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          orderId,
          parsed.data.decision,
          parsed.data.notes
        );
        res.json({ order });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/orders/:id/fulfil',
    requireAuth,
    requireRole(['order_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const orderId = Number(req.params.id);
        const parsed = fulfilOrderSchema.safeParse(req.body);
        if (!Number.isInteger(orderId) || !parsed.success) {
          res.status(400).json({ error: 'Invalid fulfilment payload.' });
          return;
        }
        const order = await fulfilDivisionOrder(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          orderId,
          parsed.data
        );
        res.json({ order });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/orders/:id/payment-status',
    requireAuth,
    requireRole(['order_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const orderId = Number(req.params.id);
        const parsed = updatePaymentStatusSchema.safeParse(req.body);
        if (!Number.isInteger(orderId) || !parsed.success) {
          res.status(400).json({ error: 'Invalid payment status payload.' });
          return;
        }
        const payment = await updateOrderPaymentStatus(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          orderId,
          parsed.data
        );
        res.json({ payment });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  // Restricted Pharmaceutical Prescription & Pharmacist Dispensing Workflow
  app.post('/api/pharmaceutical/dispense', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = pharmaceuticalDispenseSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid dispensing payload.', issues: parsed.error.issues });
        return;
      }
      const result = await executeRestrictedPharmaceuticalDispensing(
        req.dbUser!.uid,
        req.dbUser!.primaryRole,
        parsed.data
      );
      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Document Vault
  app.post(
    '/api/documents',
    requireAuth,
    requireRole(['product_manager', 'regulatory_reviewer', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = uploadDocumentSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid document payload.', issues: parsed.error.issues });
          return;
        }
        const doc = await uploadProductDocument(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.status(201).json({ document: doc });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/documents/:id/verify',
    requireAuth,
    requireRole(['regulatory_reviewer', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const docId = Number(req.params.id);
        const parsed = verifyDocumentSchema.safeParse(req.body);
        if (!Number.isInteger(docId) || !parsed.success) {
          res.status(400).json({ error: 'Invalid document verification payload.' });
          return;
        }
        const updated = await verifyProductDocument(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          docId,
          parsed.data.verificationStatus
        );
        res.json({ document: updated });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.get('/api/documents/:id/download', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const docId = Number(req.params.id);
      if (!Number.isInteger(docId) || docId <= 0) {
        res.status(400).json({ error: 'Invalid document ID.' });
        return;
      }
      const doc = await getAuthorizedDocumentForDownload(
        docId,
        req.dbUser!.uid,
        req.dbUser!.roles
      );
      const buffer = Buffer.from(doc.contentBase64, 'base64');
      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName.replace(/"/g, '')}"`);
      res.setHeader('X-Content-SHA256', doc.sha256Hash);
      res.send(buffer);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Compliance & Product Management Console
  app.get(
    '/api/compliance/overview',
    requireAuth,
    requireRole([
      'super_administrator',
      'product_manager',
      'regulatory_reviewer',
      'order_manager',
      'content_manager',
      'customer_support',
    ]),
    async (_req: AuthRequest, res: Response) => {
      try {
        const data = await getComplianceOverview();
        res.json(data);
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/products',
    requireAuth,
    requireRole(['product_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = createProductSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid product draft payload.', issues: parsed.error.issues });
          return;
        }
        const product = await createProductDraft(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.status(201).json({ product });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.patch(
    '/api/compliance/products/:id',
    requireAuth,
    requireRole(['product_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const productId = Number(req.params.id);
        if (!Number.isInteger(productId) || productId <= 0) {
          res.status(400).json({ error: 'Invalid product ID.' });
          return;
        }
        const parsed = updateProductSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid product update payload.', issues: parsed.error.issues });
          return;
        }
        const product = await updateProductMetadata(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          productId,
          parsed.data
        );
        res.json({ product });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/products/:id/images',
    requireAuth,
    requireRole(['product_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const productId = Number(req.params.id);
        if (!Number.isInteger(productId) || productId <= 0) {
          res.status(400).json({ error: 'Invalid product ID.' });
          return;
        }
        const parsed = addProductImageSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid image payload.', issues: parsed.error.issues });
          return;
        }
        const image = await addProductImageRecord(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          productId,
          parsed.data
        );
        res.status(201).json({ image });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/products/:id/inventory',
    requireAuth,
    requireRole(['product_manager', 'order_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const productId = Number(req.params.id);
        if (!Number.isInteger(productId) || productId <= 0) {
          res.status(400).json({ error: 'Invalid product ID.' });
          return;
        }
        const parsed = adjustInventorySchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid inventory adjustment.', issues: parsed.error.issues });
          return;
        }
        const product = await adjustProductInventory(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          productId,
          parsed.data
        );
        res.json({ product });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/products/:id/suspend',
    requireAuth,
    requireRole(['product_manager', 'regulatory_reviewer', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const productId = Number(req.params.id);
        const parsed = suspendProductSchema.safeParse(req.body);
        if (!Number.isInteger(productId) || !parsed.success) {
          res.status(400).json({ error: 'Suspension reason is required.' });
          return;
        }
        const product = await suspendProductListing(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          productId,
          parsed.data.reason
        );
        res.json({ product });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/approvals/submit',
    requireAuth,
    requireRole(['product_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = submitApprovalSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid submission payload.', issues: parsed.error.issues });
          return;
        }
        const result = await submitProductApproval(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.json(result);
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/approvals/decide',
    requireAuth,
    requireRole(['regulatory_reviewer', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = decideApprovalSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid approval decision payload.', issues: parsed.error.issues });
          return;
        }
        const result = await decideProductApproval(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.json(result);
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/kyb/:uid/review',
    requireAuth,
    requireRole(['regulatory_reviewer', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = reviewKybSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid KYB review payload.' });
          return;
        }
        const profile = await reviewCustomerKyb(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          String(req.params.uid),
          parsed.data
        );
        res.json({ profile });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/pharma-gate',
    requireAuth,
    requireRole(['regulatory_reviewer', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = pharmaGateUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid pharmaceutical gate payload.', issues: parsed.error.issues });
          return;
        }
        const division = await updatePharmaceuticalDivisionGate(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.json({ division });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/admin/users/role',
    requireAuth,
    requireRole(['super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = updateUserRoleSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid role update payload.', issues: parsed.error.issues });
          return;
        }
        const updated = await assignUserRole(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data.targetUid,
          parsed.data.role
        );
        res.json({ userRole: updated });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  // SEO, Blog CMS & Comprehensive German Governance APIs
  app.post(
    '/api/compliance/seo/page',
    requireAuth,
    requireRole(['content_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = seoPageUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid SEO page payload.', issues: parsed.error.issues });
          return;
        }
        const seoPages = await updateSeoPageConfig(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          { ...parsed.data, route: parsed.data.route as PageRoute }
        );
        res.json({ seoPages });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/seo/integrations',
    requireAuth,
    requireRole(['content_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = seoIntegrationsUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid SEO integrations payload.', issues: parsed.error.issues });
          return;
        }
        const seoIntegrations = await updateSeoIntegrationsConfig(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.json({ seoIntegrations });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/blog',
    requireAuth,
    requireRole(['content_manager', 'regulatory_reviewer', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = blogPostUpsertSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid blog article payload.', issues: parsed.error.issues });
          return;
        }
        const post = await upsertBlogPostWithMetadata(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.status(201).json({ post });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/business-profile',
    requireAuth,
    requireRole(['regulatory_reviewer', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = businessProfileUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid business verification dossier.', issues: parsed.error.issues });
          return;
        }
        const businessProfile = await updateBusinessComplianceProfile(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.json({ businessProfile });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/eu-pharmacy-logo',
    requireAuth,
    requireRole(['regulatory_reviewer', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = euPharmacyLogoUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid EU Pharmacy Logo configuration.', issues: parsed.error.issues });
          return;
        }
        const euPharmacyLogo = await updateEuPharmacyLogoConfig(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.json({ euPharmacyLogo });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/legal-documents',
    requireAuth,
    requireRole(['regulatory_reviewer', 'content_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = legalDocumentsUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid legal documents payload.', issues: parsed.error.issues });
          return;
        }
        const legalDocuments = await updateLegalDocumentsConfig(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.json({ legalDocuments });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/product-regulatory-matrix',
    requireAuth,
    requireRole(['regulatory_reviewer', 'product_manager', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = productRegulatoryMatrixUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid product regulatory safety assessment.', issues: parsed.error.issues });
          return;
        }
        const productRegulatoryMatrix = await updateProductRegulatoryMatrix(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.json({ productRegulatoryMatrix });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  app.post(
    '/api/compliance/production-checklist',
    requireAuth,
    requireRole(['regulatory_reviewer', 'super_administrator']),
    async (req: AuthRequest, res: Response) => {
      try {
        const parsed = productionChecklistUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid production checklist payload.', issues: parsed.error.issues });
          return;
        }
        const productionChecklist = await updateProductionChecklist(
          req.dbUser!.uid,
          req.dbUser!.primaryRole,
          parsed.data
        );
        res.json({ productionChecklist });
      } catch (error) {
        handleApiError(res, error);
      }
    }
  );

  const renderSsrHtml = async (req: Request, rawTemplate: string): Promise<string> => {
    try {
      const [catalog, blog] = await Promise.all([getPublicCatalogData(), getPublicBlogData()]);
      const parsedRoute = parsePathToRoute(req.path);
      const baseUrl = resolveRequestBaseUrl(req);
      const matchedProduct = parsedRoute.productSlug
        ? (catalog.products.find((p) => p.slug === parsedRoute.productSlug) as unknown as
            | ProductDto
            | undefined)
        : undefined;
      const matchedPost = parsedRoute.blogSlug
        ? (blog.posts.find((p) => p.slug === parsedRoute.blogSlug) as unknown as
            | BlogPostDto
            | undefined)
        : undefined;

      const seo = buildPageSeoSnapshot({
        baseUrl,
        locale: parsedRoute.locale,
        route: parsedRoute.route,
        seoPages: catalog.governance?.seoPages ?? [],
        product: matchedProduct,
        blogPost: matchedPost,
        products: catalog.products as unknown as ProductDto[],
        blogPosts: blog.posts as unknown as BlogPostDto[],
      });

      const gscTag = catalog.governance?.seoIntegrations?.searchConsoleVerificationMeta
        ? `<meta name="google-site-verification" content="${escapeHtmlAttr(
            catalog.governance.seoIntegrations.searchConsoleVerificationMeta
          )}" />`
        : '';

      const headMeta = `
    <title>${escapeHtmlAttr(seo.title)}</title>
    <meta name="description" content="${escapeHtmlAttr(seo.description)}" />
    <meta name="robots" content="${escapeHtmlAttr(seo.robots)}" />
    <link rel="canonical" href="${escapeHtmlAttr(seo.canonicalUrl)}" />
    <link rel="alternate" hreflang="de-DE" href="${escapeHtmlAttr(seo.hreflangDe)}" />
    <link rel="alternate" hreflang="en-GB" href="${escapeHtmlAttr(seo.hreflangEn)}" />
    <link rel="alternate" hreflang="x-default" href="${escapeHtmlAttr(seo.hreflangDe)}" />
    <meta property="og:type" content="${escapeHtmlAttr(seo.ogType)}" />
    <meta property="og:site_name" content="PEPTIVORA" />
    <meta property="og:locale" content="${parsedRoute.locale === 'de' ? 'de_DE' : 'en_GB'}" />
    <meta property="og:url" content="${escapeHtmlAttr(seo.canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtmlAttr(seo.title)}" />
    <meta property="og:description" content="${escapeHtmlAttr(seo.description)}" />
    <meta property="og:image" content="${escapeHtmlAttr(seo.ogImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtmlAttr(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtmlAttr(seo.description)}" />
    <meta name="twitter:image" content="${escapeHtmlAttr(seo.ogImage)}" />
    ${gscTag}
    ${seo.jsonLdSchemas
      .map(
        (schema) =>
          `<script type="application/ld+json" data-peptivora-ld="true">${JSON.stringify(schema)}</script>`
      )
      .join('\n    ')}`;

      const isDe = parsedRoute.locale === 'de';
      const approvedList = (catalog.products as unknown as ProductDto[]).filter(
        (p) => p.publicationStatus === 'published' && p.approvalStatus === 'approved'
      );
      const navLinksHtml = (
        [
          ['research', isDe ? 'Forschung' : 'Research'],
          ['pharmaceutical', isDe ? 'Pharmazie' : 'Pharmaceutical'],
          ['catalogue', isDe ? 'Produktkatalog' : 'Catalogue'],
          ['quality', isDe ? 'Qualitätssicherung' : 'Quality'],
          ['knowledge', isDe ? 'Wissenszentrum' : 'Knowledge'],
          ['blog', 'Blog'],
          ['faq', 'FAQ'],
          ['impressum', 'Impressum'],
        ] as [PageRoute, string][]
      )
        .map(
          ([r, label]) =>
            `<a href="${escapeHtmlAttr(
              `${baseUrl}/${parsedRoute.locale}/${r === 'research' ? (isDe ? 'forschung' : 'research') : r === 'pharmaceutical' ? (isDe ? 'pharma' : 'pharmaceutical') : r === 'catalogue' ? (isDe ? 'katalog' : 'catalogue') : r === 'quality' ? (isDe ? 'qualitaet' : 'quality') : r === 'knowledge' ? (isDe ? 'wissen' : 'knowledge') : r}/`
            )}">${escapeHtmlAttr(label)}</a>`
        )
        .join(' · ');

      const productListHtml = approvedList
        .map(
          (p) =>
            `<li><a href="${escapeHtmlAttr(
              `${baseUrl}/${parsedRoute.locale}/${isDe ? 'produkt' : 'product'}/${encodeURIComponent(p.slug)}`
            )}">${escapeHtmlAttr(isDe ? p.nameDe : p.nameEn)} (${escapeHtmlAttr(p.sku)})</a></li>`
        )
        .join('');

      const blogListHtml = (blog.posts as unknown as BlogPostDto[])
        .slice(0, 6)
        .map(
          (post) =>
            `<li><a href="${escapeHtmlAttr(
              `${baseUrl}/${parsedRoute.locale}/blog/${encodeURIComponent(post.slug)}`
            )}">${escapeHtmlAttr(isDe ? post.titleDe : post.titleEn)}</a></li>`
        )
        .join('');

      const ssrSemanticSnapshot = `<div id="root"><main data-ssr-crawler="true" class="max-w-5xl mx-auto px-4 py-10 space-y-6"><header><a href="${escapeHtmlAttr(
        `${baseUrl}/${parsedRoute.locale}/`
      )}"><strong>PEPTIVORA</strong></a><nav aria-label="Primary Navigation">${navLinksHtml}</nav></header><nav aria-label="Breadcrumb">${seo.breadcrumbs
        .map(
          (b) =>
            `<a href="${escapeHtmlAttr(b.url)}">${escapeHtmlAttr(
              isDe ? b.labelDe : b.labelEn
            )}</a>`
        )
        .join(' / ')}</nav><h1>${escapeHtmlAttr(seo.ssrHeadline)}</h1><p>${escapeHtmlAttr(
        seo.ssrSummary
      )}</p>${productListHtml ? `<section><ul>${productListHtml}</ul></section>` : ''}${
        blogListHtml ? `<section><ul>${blogListHtml}</ul></section>` : ''
      }</main></div>`;

      return rawTemplate
        .replace(/<html lang="[^"]*">/, `<html lang="${parsedRoute.locale}">`)
        .replace(
          /<!-- SEO_HEAD_START -->[\s\S]*?<!-- SEO_HEAD_END -->/,
          `<!-- SEO_HEAD_START -->${headMeta}\n    <!-- SEO_HEAD_END -->`
        )
        .replace('<div id="root"></div>', ssrSemanticSnapshot);
    } catch {
      return rawTemplate;
    }
  };

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        next();
        return;
      }
      try {
        const rawHtml = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        const ssrHtml = await renderSsrHtml(req, transformed);
        res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').end(ssrHtml);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { index: false, maxAge: '7d' }));
    app.get('*', async (req: Request, res: Response) => {
      try {
        const builtHtml = await fs.readFile(path.join(distPath, 'index.html'), 'utf-8');
        const ssrHtml = await renderSsrHtml(req, builtHtml);
        res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').end(ssrHtml);
      } catch {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PEPTIVORA server listening on http://0.0.0.0:${PORT}`);
  });
}

function handleApiError(res: Response, error: unknown) {
  if (error instanceof DomainPolicyError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error('Unhandled API error:', error);
  res.status(500).json({
    error: error instanceof Error ? error.message : 'Internal server error.',
  });
}

startServer().catch((err) => {
  console.error('Failed to start PEPTIVORA server:', err);
  process.exit(1);
});
