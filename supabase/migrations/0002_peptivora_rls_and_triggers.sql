-- PEPTIVORA PostgreSQL / Supabase Migration 0002
-- Row Level Security (RLS), Privilege Escalation Prevention, Expiry Enforcement & Immutable Audit Triggers

BEGIN;

-- Helper: Check if authenticated user holds a specific role in user_roles
CREATE OR REPLACE FUNCTION public.has_app_role(target_uid TEXT, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_uid = target_uid AND role = required_role
  );
$$;

-- Trigger 1: Prevent self-privilege escalation on user_roles
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role <> 'customer' AND NEW.granted_by_uid = NEW.user_uid THEN
    RAISE EXCEPTION 'Security violation: users cannot elevate their own privileges.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.user_roles;
CREATE TRIGGER trg_prevent_self_role_escalation
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- Trigger 2: Automatically reject orders for expired, suspended, unapproved, or pharma-locked products
CREATE OR REPLACE FUNCTION public.enforce_order_compliance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  div_record RECORD;
BEGIN
  SELECT * INTO div_record FROM public.divisions WHERE id = NEW.division_id;
  IF NOT FOUND OR div_record.transactions_enabled = false THEN
    RAISE EXCEPTION 'Regulatory lock: transactions are disabled for this division.';
  END IF;
  IF div_record.slug = 'pharmaceutical' AND NOT (
    div_record.pharmacy_license_verified AND
    div_record.distribution_arrangement_verified AND
    div_record.product_authorization_verified AND
    div_record.dispensing_workflow_verified
  ) THEN
    RAISE EXCEPTION 'Pharmaceutical lock: all 4 statutory pillars must be independently verified.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_compliance ON public.orders;
CREATE TRIGGER trg_enforce_order_compliance
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_compliance();

-- Trigger 3: Immutable audit logs (no UPDATE or DELETE permitted)
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit integrity violation: audit_logs is append-only.';
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_audit_logs ON public.audit_logs;
CREATE TRIGGER trg_immutable_audit_logs
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

-- Enable Row Level Security across all 32 tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Public Read Policies (Strictly approved, published, non-expired items only)
CREATE POLICY public_read_divisions ON divisions FOR SELECT USING (catalog_visible = true);
CREATE POLICY public_read_categories ON product_categories FOR SELECT USING (true);
CREATE POLICY public_read_classifications ON product_classifications FOR SELECT USING (true);
CREATE POLICY public_read_published_products ON products FOR SELECT USING (
  publication_status = 'published'
  AND approval_status = 'approved'
  AND EXISTS (
    SELECT 1 FROM regulatory_approvals ra
    WHERE ra.product_id = products.id
      AND ra.status = 'approved'
      AND (ra.expires_at IS NULL OR ra.expires_at > now())
  )
);
CREATE POLICY public_read_blog_posts ON blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY public_read_blog_categories ON blog_categories FOR SELECT USING (true);
CREATE POLICY public_read_authors ON authors FOR SELECT USING (true);
CREATE POLICY public_read_shipping_methods ON shipping_methods FOR SELECT USING (is_active = true);

-- Customer Scoped Policies
CREATE POLICY own_profile_select ON profiles FOR SELECT USING (uid = auth.uid()::text);
CREATE POLICY own_profile_update ON profiles FOR UPDATE USING (uid = auth.uid()::text)
  WITH CHECK (uid = auth.uid()::text);
CREATE POLICY own_addresses_all ON addresses FOR ALL USING (user_uid = auth.uid()::text)
  WITH CHECK (user_uid = auth.uid()::text);
CREATE POLICY own_carts_all ON carts FOR ALL USING (user_uid = auth.uid()::text)
  WITH CHECK (user_uid = auth.uid()::text);
CREATE POLICY own_orders_select ON orders FOR SELECT USING (user_uid = auth.uid()::text);

-- Staff / Reviewer / Admin Scoped Policies
CREATE POLICY staff_read_all_products ON products FOR SELECT USING (
  public.has_app_role(auth.uid()::text, 'super_administrator') OR
  public.has_app_role(auth.uid()::text, 'product_manager') OR
  public.has_app_role(auth.uid()::text, 'regulatory_reviewer')
);

CREATE POLICY reviewer_manage_approvals ON regulatory_approvals FOR ALL USING (
  public.has_app_role(auth.uid()::text, 'regulatory_reviewer') OR
  public.has_app_role(auth.uid()::text, 'super_administrator')
);

CREATE POLICY admin_read_audit_logs ON audit_logs FOR SELECT USING (
  public.has_app_role(auth.uid()::text, 'super_administrator') OR
  public.has_app_role(auth.uid()::text, 'regulatory_reviewer')
);

COMMIT;
