-- PEPTIVORA PostgreSQL / Supabase Migration 0001
-- Complete 32-Table Relational Architecture with Regulatory Classification & Division Isolation

BEGIN;

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  organization_name TEXT,
  organization_type TEXT,
  vat_id TEXT,
  kyb_status TEXT NOT NULL DEFAULT 'unverified' CHECK (kyb_status IN ('unverified','pending_review','verified','rejected','revoked')),
  preferred_locale TEXT NOT NULL DEFAULT 'de' CHECK (preferred_locale IN ('de','en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN (
    'super_administrator','product_manager','regulatory_reviewer','order_manager','content_manager','customer_support','customer'
  )),
  granted_by_uid TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_uid, role)
);

CREATE TABLE IF NOT EXISTS divisions (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug IN ('research','pharmaceutical')),
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_de TEXT NOT NULL,
  description_en TEXT NOT NULL,
  catalog_visible BOOLEAN NOT NULL DEFAULT false,
  transactions_enabled BOOLEAN NOT NULL DEFAULT false,
  pharmacy_license_verified BOOLEAN NOT NULL DEFAULT false,
  distribution_arrangement_verified BOOLEAN NOT NULL DEFAULT false,
  product_authorization_verified BOOLEAN NOT NULL DEFAULT false,
  dispensing_workflow_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by_uid TEXT,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_pharma_lock CHECK (
    slug <> 'pharmaceutical' OR transactions_enabled = false OR (
      pharmacy_license_verified = true AND
      distribution_arrangement_verified = true AND
      product_authorization_verified = true AND
      dispensing_workflow_verified = true AND
      verified_by_uid IS NOT NULL
    )
  )
);

CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_de TEXT,
  description_en TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'DE',
  gmp_status_note TEXT,
  contact_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_classifications (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code IN (
    'research_use_only','authorized_otc_medicinal','authorized_prescription_medicinal','other_regulated'
  )),
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  requires_pharmacy_authorization BOOLEAN NOT NULL DEFAULT false,
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
  manufacturer_ruo_labeled BOOLEAN NOT NULL DEFAULT false,
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
  price_permitted BOOLEAN NOT NULL DEFAULT false,
  price_net_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_net_cents >= 0),
  vat_rate_bps INTEGER NOT NULL DEFAULT 1900,
  currency TEXT NOT NULL DEFAULT 'EUR',
  stock_status TEXT NOT NULL DEFAULT 'out_of_stock',
  publication_status TEXT NOT NULL DEFAULT 'unpublished' CHECK (publication_status IN ('unpublished','published','archived')),
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN (
    'draft','submitted_for_review','under_regulatory_review','approved','rejected','suspended','expired'
  )),
  is_demonstration_record BOOLEAN NOT NULL DEFAULT true,
  created_by_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_publish_requires_approved CHECK (
    publication_status <> 'published' OR approval_status = 'approved'
  )
);

CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  label_de TEXT NOT NULL,
  label_en TEXT NOT NULL,
  pack_size TEXT NOT NULL,
  price_net_cents INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  amg_screened BOOLEAN NOT NULL DEFAULT false,
  hwg_screened BOOLEAN NOT NULL DEFAULT false,
  chemg_screened BOOLEAN NOT NULL DEFAULT false,
  ruo_independently_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_reviewer_separation CHECK (reviewer_uid IS NULL OR reviewer_uid <> submitted_by_uid)
);

CREATE TABLE IF NOT EXISTS approval_history (
  id SERIAL PRIMARY KEY,
  regulatory_approval_id INTEGER NOT NULL REFERENCES regulatory_approvals(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  actor_uid TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  batch_number TEXT NOT NULL,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  expires_at TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  reference_id TEXT,
  actor_uid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description_de TEXT NOT NULL,
  description_en TEXT NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 50),
  min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  division_id INTEGER NOT NULL REFERENCES divisions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_uid, division_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  sku_snapshot TEXT NOT NULL,
  name_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shipping_method_id INTEGER NOT NULL REFERENCES shipping_methods(id),
  carrier TEXT NOT NULL,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'preparing',
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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
  is_published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL DEFAULT 'de',
  consent_recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consent_records (
  id SERIAL PRIMARY KEY,
  visitor_session_id TEXT NOT NULL,
  user_uid TEXT,
  essential_cookies BOOLEAN NOT NULL DEFAULT true,
  functional_cookies BOOLEAN NOT NULL DEFAULT false,
  analytics_cookies BOOLEAN NOT NULL DEFAULT false,
  policy_version TEXT NOT NULL DEFAULT '2026.1',
  locale TEXT NOT NULL DEFAULT 'de',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
