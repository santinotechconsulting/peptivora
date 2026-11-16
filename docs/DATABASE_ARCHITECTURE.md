# PEPTIVORA Database Architecture & Security Documentation

## 1. Overview
The PEPTIVORA database enforces strict domain segregation between the **Research Division** and the **Pharmaceutical Division** across **32 normalized PostgreSQL tables**. Every product requires explicit classification (`product_classifications`), an independent regulatory approval (`regulatory_approvals`), and active, non-expired status before publication (`publication_status = 'published'`).

## 2. Table Inventory (32 Modules)
- **Identity & RBAC:** `profiles`, `user_roles`, `addresses`, `consent_records`
- **Divisions & Catalog:** `divisions`, `product_categories`, `product_classifications`, `suppliers`, `products`, `product_variants`, `product_images`, `product_documents`
- **Regulatory Approval Engine:** `regulatory_approvals`, `approval_history`
- **Inventory & Supply Chain:** `inventory`, `inventory_movements`, `shipping_methods`, `shipments`
- **Commerce & Fiscal:** `carts`, `cart_items`, `coupons`, `orders`, `order_items`, `payment_transactions`, `invoices`
- **Editorial & Engagement:** `blog_categories`, `authors`, `blog_posts`, `contact_messages`, `newsletter_subscribers`
- **Governance:** `audit_logs`, `site_settings`

## 3. Controlled Product Classifications
1. `research_use_only` — Research-use-only reference materials for accredited institutions.
2. `authorized_otc_medicinal` — Authorized non-prescription medicinal products (blocked unless pharmacy & product authorizations verified).
3. `authorized_prescription_medicinal` — Authorized prescription medicinal products (blocked unless pharmacy, § 52a AMG, Zulassung, and dispensing workflow verified).
4. `other_regulated` — Other regulated substances requiring bespoke regulatory determination.

Products are **never** auto-classified from their name or description. A manufacturer RUO label does not confer an exemption under the German Medicinal Products Act (AMG).

## 4. Approval Lifecycle & Automatic Unavailability
Statuses: `draft` → `submitted_for_review` → `under_regulatory_review` → `approved` | `rejected` | `suspended` | `expired`.

Any product whose latest `regulatory_approvals` record is `expired`, `suspended`, `rejected`, missing, or past `expires_at` is **automatically excluded** from public catalog queries and blocked at checkout.

## 5. Role-Based Access Control (7 Roles)
- `super_administrator` — System-wide governance, role assignment, audit access.
- `product_manager` — Draft product & variant creation, review submission (cannot self-approve).
- `regulatory_reviewer` — AMG/HWG/ChemG screening, approval/rejection/suspension, document verification.
- `order_manager` — Order fulfillment, shipments, and inventory adjustments.
- `content_manager` — Bilingual blog posts, authors, and categories.
- `customer_support` — Contact message triage and customer order inquiries.
- `customer` — Default authenticated role; can manage own profile, addresses, KYB, carts, and orders. Users cannot elevate their own privileges.
