import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Lock,
  Minus,
  Plus,
  ShieldAlert,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import {
  calculateGermanVat,
  formatEuroCents,
  type Locale,
} from '../../core/domain/compliance.ts';
import { getCopy } from '../../i18n/translations.ts';
import type {
  AddressDto,
  CartItem,
  CouponDto,
  OrderDto,
  PageRoute,
  PaymentProviderDescriptorDto,
  ProfileDto,
  ShippingMethodDto,
} from '../../types/peptivora.ts';
import { ResilientImage } from '../ui/ResilientImage.tsx';

export function CartPage({
  locale,
  cart,
  onUpdateQty,
  onRemove,
  onNavigate,
}: {
  locale: Locale;
  cart: CartItem[];
  onUpdateQty: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
  onNavigate: (r: PageRoute) => void;
}) {
  const t = getCopy(locale);
  const subtotalNetCents = cart.reduce(
    (sum, item) =>
      sum + (item.variant?.priceNetCents ?? item.product.priceNetCents) * item.quantity,
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-navy">{t.cart.title}</h1>
        <span className="font-mono text-xs uppercase px-2.5 py-1 bg-lightgrey border border-silver rounded-sm text-navy">
          {t.cart.divisionRule}
        </span>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white border border-silver rounded-sm p-10 text-center space-y-4">
          <ShoppingCart className="w-8 h-8 text-charcoal/40 mx-auto" aria-hidden="true" />
          <p className="text-sm text-charcoal/80">{t.cart.empty}</p>
          <button
            type="button"
            onClick={() => onNavigate('catalogue')}
            className="px-5 py-2.5 bg-scientific text-white text-sm font-medium rounded-sm hover:bg-blue-700 cursor-pointer"
          >
            {t.cart.browseCatalogue}
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white border border-silver rounded-sm divide-y divide-silver">
            {cart.map((item) => {
              const unitNet = item.variant?.priceNetCents ?? item.product.priceNetCents;
              const name = locale === 'de' ? item.product.nameDe : item.product.nameEn;
              return (
                <div key={item.product.id} className="p-5 flex gap-4 items-center">
                  <div className="w-20 h-16 bg-lightgrey border border-silver rounded-sm overflow-hidden shrink-0">
                    <ResilientImage
                      src={item.product.images[0]?.imageUrl ?? null}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] text-scientific">{item.product.sku}</div>
                    <h2 className="font-display font-semibold text-navy truncate">{name}</h2>
                    {item.variant && (
                      <div className="text-xs text-charcoal/70">
                        {locale === 'de' ? item.variant.labelDe : item.variant.labelEn}
                      </div>
                    )}
                    <div className="font-mono text-xs text-charcoal/80 mt-1">
                      {formatEuroCents(unitNet, locale)} · {t.cart.unitPrice}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 border border-silver rounded-sm px-1.5 py-1">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.product.id, -1)}
                      aria-label="Decrease quantity"
                      className="p-1 hover:bg-lightgrey rounded-sm cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-xs w-6 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.product.id, 1)}
                      aria-label="Increase quantity"
                      className="p-1 hover:bg-lightgrey rounded-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.product.id)}
                    aria-label={t.cart.remove}
                    className="p-2 text-charcoal/60 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-4 bg-white border border-silver rounded-sm p-6 space-y-4 h-fit">
            <div className="flex items-center justify-between text-sm">
              <span className="text-charcoal/80">{t.cart.subtotalNet}</span>
              <span className="font-mono font-bold text-navy text-lg">
                {formatEuroCents(subtotalNetCents, locale)}
              </span>
            </div>
            <p className="text-xs text-charcoal/65">
              {locale === 'de'
                ? 'Zzgl. Kühlkettenversand und 19 % gesetzlicher USt. in der Kasse.'
                : 'Plus cold-chain shipping and 19% German VAT calculated at checkout.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('checkout')}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-scientific text-white text-sm font-semibold rounded-sm hover:bg-blue-700 cursor-pointer"
            >
              <span>{t.cart.proceedCheckout}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CheckoutPage({
  locale,
  cart,
  shippingMethods,
  paymentProviders,
  isSignedIn,
  isStaff,
  profile,
  addresses,
  onNavigate,
  onSubmitOrder,
}: {
  locale: Locale;
  cart: CartItem[];
  shippingMethods: ShippingMethodDto[];
  paymentProviders: PaymentProviderDescriptorDto[];
  isSignedIn: boolean;
  isStaff: boolean;
  profile: ProfileDto | null;
  addresses: AddressDto[];
  onNavigate: (r: PageRoute) => void;
  onSubmitOrder: (payload: {
    divisionSlug: 'research';
    shippingMethodId: number;
    shippingAddressId?: number | null;
    couponCode?: string;
    paymentProvider: string;
    paymentToken?: string;
    items: { productId: number; quantity: number }[];
    ruoNonHumanUseAttested: boolean;
    billingName: string;
    billingVatId?: string;
    billingAddress: string;
  }) => Promise<OrderDto>;
}) {
  const t = getCopy(locale);
  const isDe = locale === 'de';
  const [selectedShipId, setSelectedShipId] = useState<number>(shippingMethods[0]?.id ?? 1);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(addresses[0]?.id ?? null);
  const [billingName, setBillingName] = useState(
    profile?.organizationName || profile?.displayName || ''
  );
  const [billingVatId, setBillingVatId] = useState(profile?.vatId || '');
  const [billingAddress, setBillingAddress] = useState(() => {
    const def = addresses[0];
    return def ? `${def.streetLine}, ${def.postalCode} ${def.city}, ${def.countryCode}` : '';
  });

  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    paymentProviders[0]?.id ?? 'peptivora-sepa-invoice'
  );
  const [paymentToken, setPaymentToken] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponDto | null>(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [attested, setAttested] = useState(false);
  const [orderReviewed, setOrderReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<OrderDto | null>(null);

  const subtotalNetCents = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + (item.variant?.priceNetCents ?? item.product.priceNetCents) * item.quantity,
        0
      ),
    [cart]
  );

  const selectedShipping =
    shippingMethods.find((s) => s.id === selectedShipId) ?? shippingMethods[0];
  const shippingNetCents = selectedShipping?.priceNetCents ?? 0;
  const discountNetCents = appliedCoupon
    ? Math.round((subtotalNetCents * appliedCoupon.discountPercent) / 100)
    : 0;
  const discountedSubtotal = Math.max(0, subtotalNetCents - discountNetCents);
  const vatTotals = calculateGermanVat(discountedSubtotal + shippingNetCents, 1, 1900);

  const selectedProvider = paymentProviders.find((p) => p.id === selectedProviderId);
  const kybEligible = isStaff || profile?.kybStatus === 'verified';

  async function handleValidateCoupon() {
    setCouponMessage('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput, subtotalNetCents }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAppliedCoupon(null);
        setCouponMessage(json.error || 'Coupon invalid');
        return;
      }
      setAppliedCoupon(json.coupon);
      setCouponMessage(
        `${json.coupon.code}: -${json.coupon.discountPercent}% (${
          isDe ? json.coupon.descriptionDe : json.coupon.descriptionEn
        })`
      );
    } catch {
      setCouponMessage('Coupon check failed.');
    }
  }

  async function handleOrderSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const order = await onSubmitOrder({
        divisionSlug: 'research',
        shippingMethodId: selectedShipId,
        shippingAddressId: selectedAddressId,
        couponCode: appliedCoupon?.code || '',
        paymentProvider: selectedProviderId,
        paymentToken: paymentToken.trim() || undefined,
        items: cart.map((c) => ({ productId: c.product.id, quantity: c.quantity })),
        ruoNonHumanUseAttested: attested,
        billingName,
        billingVatId,
        billingAddress,
      });
      setCreatedOrder(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (createdOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white border border-emerald-300 rounded-sm p-8 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-display text-xl font-bold">
            <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
            <span>{t.checkout.orderSuccess}</span>
          </div>
          <div className="font-mono text-sm text-navy">
            {createdOrder.orderNumber} · {formatEuroCents(createdOrder.totalGrossCents, locale)} ·{' '}
            {createdOrder.status}
          </div>
          <p className="text-xs text-charcoal/75">
            {isDe
              ? 'Ihre deutsche USt.-Rechnung und der Zahlungs- sowie Versandstatus stehen sofort im Kundenkonto bereit.'
              : 'Your German VAT invoice, payment reference, and shipment status are immediately available in your Customer Account.'}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('account')}
              className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-sm cursor-pointer"
            >
              {t.nav.account}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('catalogue')}
              className="px-4 py-2 border border-silver text-navy text-sm font-medium rounded-sm cursor-pointer"
            >
              {t.nav.catalogue}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <h1 className="font-display text-3xl font-bold text-navy">{t.checkout.title}</h1>

      {cart.length === 0 ? (
        <div className="bg-white border border-silver rounded-sm p-8 space-y-4">
          <p className="text-sm text-charcoal/80">{t.cart.empty}</p>
          <button
            type="button"
            onClick={() => onNavigate('catalogue')}
            className="px-4 py-2 bg-scientific text-white text-sm rounded-sm cursor-pointer"
          >
            {t.cart.browseCatalogue}
          </button>
        </div>
      ) : !isSignedIn ? (
        <div className="bg-white border border-silver rounded-sm p-8 space-y-4">
          <p className="text-sm text-navy font-medium">{t.checkout.signInPrompt}</p>
          <button
            type="button"
            onClick={() => onNavigate('account')}
            className="px-5 py-2.5 bg-scientific text-white text-sm font-semibold rounded-sm cursor-pointer"
          >
            {t.nav.account}
          </button>
        </div>
      ) : !kybEligible ? (
        <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-sm p-6 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span>{t.checkout.kybRequired}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('account')}
            className="px-4 py-2 bg-navy text-white text-xs font-medium rounded-sm cursor-pointer"
          >
            {t.checkout.goToAccount}
          </button>
        </div>
      ) : (
        <form onSubmit={handleOrderSubmit} className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Shipping */}
            <section className="bg-white border border-silver rounded-sm p-6 space-y-3">
              <h2 className="font-display font-bold text-navy">{t.checkout.shippingTitle}</h2>
              <div className="space-y-2">
                {shippingMethods.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-start justify-between gap-4 p-3.5 rounded-sm border cursor-pointer ${
                      selectedShipId === m.id
                        ? 'border-scientific bg-blue-50/50'
                        : 'border-silver bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="shippingMethod"
                        checked={selectedShipId === m.id}
                        onChange={() => setSelectedShipId(m.id)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <div className="font-semibold text-navy">
                          {isDe ? m.nameDe : m.nameEn}
                        </div>
                        <div className="text-xs text-charcoal/70">{m.estimatedDays}</div>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold text-navy">
                      {formatEuroCents(m.priceNetCents, locale)}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* 2. Billing & Address */}
            <section className="bg-white border border-silver rounded-sm p-6 space-y-4">
              <h2 className="font-display font-bold text-navy">{t.checkout.addressTitle}</h2>
              {addresses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {addresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        setBillingName(addr.recipientName);
                        setBillingAddress(
                          `${addr.streetLine}, ${addr.postalCode} ${addr.city}, ${addr.countryCode}`
                        );
                      }}
                      className={`text-xs px-3 py-1.5 border rounded-sm cursor-pointer ${
                        selectedAddressId === addr.id
                          ? 'border-scientific bg-blue-50 text-navy'
                          : 'border-silver bg-lightgrey hover:bg-slate-200'
                      }`}
                    >
                      {addr.label}: {addr.postalCode} {addr.city}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  minLength={2}
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  placeholder={t.account.orgName}
                  className="px-3.5 py-2.5 text-sm border border-silver rounded-sm"
                />
                <input
                  type="text"
                  value={billingVatId}
                  onChange={(e) => setBillingVatId(e.target.value)}
                  placeholder={t.account.vatId}
                  className="px-3.5 py-2.5 text-sm border border-silver rounded-sm"
                />
              </div>
              <textarea
                required
                minLength={8}
                rows={2}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder={
                  isDe
                    ? 'Straße, Hausnummer, PLZ, Ort, Land'
                    : 'Street, Postal Code, City, Country'
                }
                className="w-full px-3.5 py-2.5 text-sm border border-silver rounded-sm"
              />
            </section>

            {/* 3. Abstract Payment Provider Layer (Zero Card/CVV storage) */}
            <section className="bg-white border border-silver rounded-sm p-6 space-y-3">
              <div className="flex items-center gap-2 font-display font-bold text-navy">
                <CreditCard className="w-4 h-4 text-scientific" aria-hidden="true" />
                <span>
                  {isDe
                    ? '3. Genehmigte Zahlungsabwicklung (Token- & Rechnungsarchitektur)'
                    : '3. Approved Payment Channel (Tokenized / Invoice Layer)'}
                </span>
              </div>
              <p className="text-xs text-charcoal/70 leading-relaxed">
                {isDe
                  ? 'PEPTIVORA integriert ausschließlich Anbieter mit ausdrücklicher Freigabe für das B2B-Forschungsmodell. Kreditkartennummern oder CVV werden niemals erfasst oder gespeichert.'
                  : 'PEPTIVORA only activates payment providers that have expressly approved the B2B research model. Card numbers or CVV values are never collected or stored.'}
              </p>
              <div className="space-y-2">
                {paymentProviders.map((prov) => (
                  <label
                    key={prov.id}
                    className={`flex items-start justify-between gap-3 p-3 rounded-sm border cursor-pointer ${
                      selectedProviderId === prov.id
                        ? 'border-scientific bg-blue-50/50'
                        : 'border-silver bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 text-xs">
                      <input
                        type="radio"
                        name="paymentProvider"
                        checked={selectedProviderId === prov.id}
                        onChange={() => setSelectedProviderId(prov.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-semibold text-navy">
                          {isDe ? prov.nameDe : prov.nameEn}
                        </div>
                        <div className="text-charcoal/75 mt-0.5">
                          {isDe ? prov.notesDe : prov.notesEn}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm border shrink-0 ${
                        prov.expresslyApprovedForPeptides
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}
                    >
                      {prov.expresslyApprovedForPeptides
                        ? isDe
                          ? 'Freigegeben'
                          : 'Approved'
                        : isDe
                          ? 'Gesperrt'
                          : 'Blocked'}
                    </span>
                  </label>
                ))}
              </div>
              {selectedProvider?.method === 'vetted_b2b_token' &&
                selectedProvider.expresslyApprovedForPeptides && (
                  <input
                    type="text"
                    required
                    value={paymentToken}
                    onChange={(e) => setPaymentToken(e.target.value)}
                    placeholder="Opaque clearing token (e.g. tok_eu_research_2026)"
                    className="w-full px-3.5 py-2 text-xs border border-silver rounded-sm font-mono"
                  />
                )}
            </section>

            {/* 4. Coupon */}
            <section className="bg-white border border-silver rounded-sm p-6 space-y-3">
              <h2 className="font-display font-bold text-navy">{t.checkout.couponTitle}</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="DEMO-LAB-10"
                  className="flex-1 px-3.5 py-2 text-sm border border-silver rounded-sm font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={() => void handleValidateCoupon()}
                  className="px-4 py-2 border border-navy text-navy text-sm font-medium rounded-sm hover:bg-lightgrey cursor-pointer"
                >
                  {t.checkout.applyCoupon}
                </button>
              </div>
              {couponMessage && <p className="text-xs text-navy font-mono">{couponMessage}</p>}
            </section>

            {/* 5. RUO Attestation & Order Review */}
            <section className="bg-white border border-silver rounded-sm p-6 space-y-3">
              <h2 className="font-display font-bold text-navy">{t.checkout.attestationTitle}</h2>
              <label className="flex items-start gap-3 text-sm text-charcoal/85 leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-scientific"
                />
                <span>{t.checkout.attestationText}</span>
              </label>
              <label className="flex items-start gap-3 text-xs text-navy font-medium pt-2 border-t border-silver/50 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={orderReviewed}
                  onChange={(e) => setOrderReviewed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-scientific"
                />
                <span>
                  {isDe
                    ? 'Bestellprüfung abgeschlossen: Ich habe Positionen, Kühlkettenversand, Netto-/Bruttowerte und Rechnungsanschrift geprüft.'
                    : 'Order Review Confirmed: I have reviewed all line items, cold-chain shipping, VAT totals, and billing details.'}
                </span>
              </label>
            </section>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white border border-silver rounded-sm p-6 space-y-4 sticky top-24">
              <h2 className="font-display text-lg font-bold text-navy">
                {t.checkout.summaryTitle}
              </h2>

              <div className="divide-y divide-silver/60 border-b border-silver pb-3 text-xs">
                {cart.map((item) => (
                  <div key={item.product.id} className="py-2 flex justify-between gap-2">
                    <span className="text-navy">
                      <strong className="font-mono">{item.quantity}×</strong>{' '}
                      {isDe ? item.product.nameDe : item.product.nameEn}
                    </span>
                    <span className="font-mono text-navy shrink-0">
                      {formatEuroCents(
                        (item.variant?.priceNetCents ?? item.product.priceNetCents) * item.quantity,
                        locale
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <dl className="space-y-2.5 text-sm border-b border-silver pb-4">
                <div className="flex justify-between">
                  <dt className="text-charcoal/75">{t.cart.subtotalNet}</dt>
                  <dd className="font-mono text-navy">{formatEuroCents(subtotalNetCents, locale)}</dd>
                </div>
                {discountNetCents > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <dt>{t.checkout.discount}</dt>
                    <dd className="font-mono">-{formatEuroCents(discountNetCents, locale)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-charcoal/75">{t.checkout.shipping}</dt>
                  <dd className="font-mono text-navy">{formatEuroCents(shippingNetCents, locale)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-charcoal/75">{t.checkout.vat}</dt>
                  <dd className="font-mono text-navy">{formatEuroCents(vatTotals.vatCents, locale)}</dd>
                </div>
              </dl>
              <div className="flex justify-between text-base font-bold text-navy">
                <span>{t.checkout.totalGross}</span>
                <span className="font-mono text-xl">{formatEuroCents(vatTotals.grossCents, locale)}</span>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded-sm flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !attested || !orderReviewed}
                className="w-full py-3 bg-scientific text-white text-sm font-semibold rounded-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {t.checkout.placeOrder}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
