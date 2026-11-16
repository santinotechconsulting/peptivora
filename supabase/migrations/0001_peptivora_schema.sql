-- ============================================================================
-- PEPTIVORA PostgreSQL & Supabase Row-Level Security Schema (32 Tables)
-- ============================================================================
-- Portable reference migration aligned 1:1 with src/db/schema.ts.
-- Strict Regulatory Architecture:
--   * Separate Research & Pharmaceutical Divisions
--   * Pharmaceutical transactions remain locked until 4 prerequisites verify
--   * Regulatory approval workflow with separation of duties & immutable audit logs
--   * Row-Level Security (RLS) enforced on user-owned & compliance-restricted tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  organization_name TEXT,
  organization_type TEXT,
  vat_id TEXT,
  kyb_status TEXT NOT NULL DEFAULT 'unverified',
  preferred_locale TEXT NOT NULL DEFAULT 'de',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'customer',
  granted_by_uid TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS divisions (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_de TEXT NOT NULL,
  description_en TEXT NOT NULL,
  catalog_visible BOOLEAN NOT NULL DEFAULT FALSE,
  transactions_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  pharmacy_license_verified BOOLEAN NOT NULL DEFAULT FALSE,
  distribution_arrangement_verified BOOLEAN NOT NULL DEFAULT FALSE,
  product_authorization_verified BOOLEAN NOT NULL DEFAULT FALSE,
  dispensing_workflow_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by_uid TEXT,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_de TEXT,
  description_en TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'DE',
  gmp_status_note TEXT,
  contact_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_classifications (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
  requires_pharmacy_authorization BOOLEAN NOT NULL DEFAULT FALSE,
  legal_notes_de TEXT NOT NULL,
  legal_notes_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  division_id INTEGER NOT NULL REFERENCES divisions(id),
  category_id INTEGER NOT NULL REFERENCES product_categories(id),
  classification_id INTEGER NOT NULL REFERENCES product_classifications(id),
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  manufacturer_name TEXT NOT NULL,
  manufacturer_ruo_labeled BOOLEAN NOT NULL DEFAULT FALSE,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_de TEXT NOT NULL,
  description_en TEXT NOT NULL,
  technical_summary_de TEXT,
  technical_summary_en TEXT,
  regulatory_notice_de TEXT NOT NULL,
  regulatory_notice_en TEXT NOT NULL,
  cas_number TEXT,
  molecular_formula TEXT,
  molecular_weight TEXT,
  sequence TEXT,
  storage_condition TEXT NOT NULL DEFAULT '-20 °C, lyophilized',
  price_permitted BOOLEAN NOT NULL DEFAULT FALSE,
  price_net_cents INTEGER NOT NULL DEFAULT 0,
  vat_rate_bps INTEGER NOT NULL DEFAULT 1900,
  currency TEXT NOT NULL DEFAULT 'EUR',
  stock_status TEXT NOT NULL DEFAULT 'out_of_stock',
  publication_status TEXT NOT NULL DEFAULT 'unpublished',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  is_demonstration_record BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  label_de TEXT NOT NULL,
  label_en TEXT NOT NULL,
  pack_size TEXT NOT NULL,
  price_net_cents INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_de TEXT NOT NULL,
  alt_en TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_documents (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  sha256_hash TEXT NOT NULL,
  content_base64 TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending_review',
  uploaded_by_uid TEXT NOT NULL,
  verified_by_uid TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regulatory_approvals (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  submitted_by_uid TEXT NOT NULL,
  reviewer_uid TEXT,
  review_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  supporting_evidence TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'DE / EU',
  expires_at TIMESTAMPTZ,
  approval_scope TEXT NOT NULL,
  amg_screened BOOLEAN NOT NULL DEFAULT FALSE,
  hwg_screened BOOLEAN NOT NULL DEFAULT FALSE,
  chemg_screened BOOLEAN NOT NULL DEFAULT FALSE,
  ruo_independently_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_history (
  id SERIAL PRIMARY KEY,
  regulatory_approval_id INTEGER NOT NULL REFERENCES regulatory_approvals(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  actor_uid TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  batch_number TEXT NOT NULL,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  reference_id TEXT,
  actor_uid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  label TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  street_line TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'DE',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_methods (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_de TEXT NOT NULL,
  description_en TEXT NOT NULL,
  price_net_cents INTEGER NOT NULL,
  vat_rate_bps INTEGER NOT NULL DEFAULT 1900,
  estimated_days TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description_de TEXT NOT NULL,
  description_en TEXT NOT NULL,
  discount_percent INTEGER NOT NULL,
  min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  division_id INTEGER NOT NULL REFERENCES divisions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_uid TEXT NOT NULL REFERENCES profiles(uid),
  division_id INTEGER NOT NULL REFERENCES divisions(id),
  shipping_method_id INTEGER REFERENCES shipping_methods(id),
  coupon_id INTEGER REFERENCES coupons(id),
  shipping_address_id INTEGER REFERENCES addresses(id),
  status TEXT NOT NULL DEFAULT 'recorded',
  ruo_non_human_use_attested_at TIMESTAMPTZ,
  subtotal_net_cents INTEGER NOT NULL,
  discount_net_cents INTEGER NOT NULL DEFAULT 0,
  shipping_net_cents INTEGER NOT NULL,
  vat_cents INTEGER NOT NULL,
  total_gross_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  billing_name TEXT NOT NULL,
  billing_vat_id TEXT,
  billing_address TEXT NOT NULL,
  compliance_snapshot_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  sku_snapshot TEXT NOT NULL,
  name_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_net_cents INTEGER NOT NULL,
  vat_rate_bps INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  method TEXT NOT NULL,
  amount_gross_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending_settlement',
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shipping_method_id INTEGER NOT NULL REFERENCES shipping_methods(id),
  carrier TEXT NOT NULL DEFAULT 'Cold-Chain Courier DE',
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'preparing',
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtotal_net_cents INTEGER NOT NULL,
  vat_cents INTEGER NOT NULL,
  total_gross_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'issued'
);

CREATE TABLE IF NOT EXISTS blog_categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS authors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role_de TEXT NOT NULL,
  role_en TEXT NOT NULL,
  bio_de TEXT NOT NULL,
  bio_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES blog_categories(id),
  author_id INTEGER NOT NULL REFERENCES authors(id),
  title_de TEXT NOT NULL,
  title_en TEXT NOT NULL,
  excerpt_de TEXT NOT NULL,
  excerpt_en TEXT NOT NULL,
  body_de TEXT NOT NULL,
  body_en TEXT NOT NULL,
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  organization TEXT,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'de',
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL DEFAULT 'de',
  consent_recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'subscribed'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_uid TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_state_json TEXT,
  new_state_json TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_records (
  id SERIAL PRIMARY KEY,
  visitor_session_id TEXT NOT NULL,
  user_uid TEXT,
  essential_cookies BOOLEAN NOT NULL DEFAULT TRUE,
  functional_cookies BOOLEAN NOT NULL DEFAULT FALSE,
  analytics_cookies BOOLEAN NOT NULL DEFAULT FALSE,
  policy_version TEXT NOT NULL DEFAULT '2026.1',
  locale TEXT NOT NULL DEFAULT 'de',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PostgreSQL / Supabase Row-Level Security (RLS) Helpers & Policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.peptivora_is_staff(target_uid TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_uid = target_uid
      AND ur.role IN (
        'super_administrator',
        'regulatory_reviewer',
        'product_manager',
        'order_manager',
        'content_manager',
        'customer_support'
      )
  );
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Example RLS Policies (for Supabase Auth JWT sub / current_setting('request.jwt.claim.sub', true))
CREATE POLICY profiles_self_or_staff ON profiles
  FOR ALL USING (
    uid = current_setting('request.jwt.claim.sub', TRUE)
    OR public.peptivora_is_staff(current_setting('request.jwt.claim.sub', TRUE))
  );

CREATE POLICY addresses_self_access ON addresses
  FOR ALL USING (
    user_uid = current_setting('request.jwt.claim.sub', TRUE)
    OR public.peptivora_is_staff(current_setting('request.jwt.claim.sub', TRUE))
  );

CREATE POLICY orders_self_or_staff ON orders
  FOR SELECT USING (
    user_uid = current_setting('request.jwt.claim.sub', TRUE)
    OR public.peptivora_is_staff(current_setting('request.jwt.claim.sub', TRUE))
  );

CREATE POLICY products_public_approved_only ON products
  FOR SELECT USING (
    (publication_status = 'published' AND approval_status = 'approved')
    OR public.peptivora_is_staff(current_setting('request.jwt.claim.sub', TRUE))
  );

CREATE POLICY audit_logs_staff_read_only ON audit_logs
  FOR SELECT USING (
    public.peptivora_is_staff(current_setting('request.jwt.claim.sub', TRUE))
  );

CREATE POLICY site_settings_public_or_staff ON site_settings
  FOR SELECT USING (
    key NOT IN ('business_compliance_profile')
    OR public.peptivora_is_staff(current_setting('request.jwt.claim.sub', TRUE))
  );
