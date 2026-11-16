import { useState, type FormEvent } from 'react';
import {
  Bell,
  Building2,
  Download,
  FileText,
  LifeBuoy,
  LogIn,
  LogOut,
  MapPin,
  Package,
  Printer,
  RotateCcw,
  ShieldAlert,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { formatEuroCents, formatGermanDate, type Locale } from '../core/domain/compliance.ts';
import { getCopy } from '../i18n/translations.ts';
import type {
  AddressDto,
  ContactMessageDto,
  CustomerNotificationDto,
  OrderDto,
  ProfileDto,
} from '../types/peptivora.ts';

interface AccountKybViewProps {
  locale: Locale;
  isSignedIn: boolean;
  email: string | null;
  primaryRole: string | null;
  profile: ProfileDto | null;
  addresses: AddressDto[];
  orders: OrderDto[];
  notifications: CustomerNotificationDto[];
  supportTickets: ContactMessageDto[];
  onSignInGoogle: () => Promise<void>;
  onSignInEmail: (email: string, password: string) => Promise<void>;
  onRegisterEmail: (email: string, password: string, displayName: string) => Promise<void>;
  onRecoverPassword: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateProfile: (payload: {
    displayName: string;
    phone: string;
    preferredLocale: 'de' | 'en';
  }) => Promise<void>;
  onSubmitKyb: (payload: {
    organizationName: string;
    organizationType: string;
    vatId: string;
    phone: string;
  }) => Promise<void>;
  onAddAddress: (payload: {
    label: string;
    recipientName: string;
    streetLine: string;
    postalCode: string;
    city: string;
    countryCode: string;
  }) => Promise<void>;
  onDeleteAddress: (id: number) => Promise<void>;
  onCancelOrder: (orderId: number, reason: string) => Promise<void>;
  onRequestRefund: (orderId: number, reason: string) => Promise<void>;
  onSubmitSupportTicket: (payload: { topic: string; message: string }) => Promise<void>;
  onExportGdprData: () => Promise<void>;
  onEraseGdprData: (confirmPhrase: string) => Promise<void>;
}

export function AccountKybView({
  locale,
  isSignedIn,
  email,
  primaryRole,
  profile,
  addresses,
  orders,
  notifications,
  supportTickets,
  onSignInGoogle,
  onSignInEmail,
  onRegisterEmail,
  onRecoverPassword,
  onSignOut,
  onUpdateProfile,
  onSubmitKyb,
  onAddAddress,
  onDeleteAddress,
  onCancelOrder,
  onRequestRefund,
  onSubmitSupportTicket,
  onExportGdprData,
  onEraseGdprData,
}: AccountKybViewProps) {
  const t = getCopy(locale);
  const isDe = locale === 'de';

  // Auth panel state
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'reset'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authName, setAuthName] = useState('');
  const [authMsg, setAuthMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Dashboard tabs
  const [dashTab, setDashTab] = useState<'orders' | 'profile' | 'addresses' | 'support' | 'notifications'>(
    'orders'
  );

  // Profile / KYB
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [profilePhone, setProfilePhone] = useState(profile?.phone ?? '');
  const [prefLocale, setPrefLocale] = useState<'de' | 'en'>(profile?.preferredLocale ?? locale);
  const [orgName, setOrgName] = useState(profile?.organizationName ?? '');
  const [orgType, setOrgType] = useState(profile?.organizationType ?? 'research_institute');
  const [vatId, setVatId] = useState(profile?.vatId ?? '');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Address form
  const [addrLabel, setAddrLabel] = useState('Labor-Eingang');
  const [recipientName, setRecipientName] = useState(profile?.organizationName ?? '');
  const [gdprConfirm, setGdprConfirm] = useState('');
  const [streetLine, setStreetLine] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [countryCode, setCountryCode] = useState('DE');

  // Support ticket
  const [supportTopic, setSupportTopic] = useState('Order & Cold-Chain Support');
  const [supportMsg, setSupportMsg] = useState('');

  // Order action / invoice modal
  const [invoiceOrder, setInvoiceOrder] = useState<OrderDto | null>(null);
  const [actionOrderId, setActionOrderId] = useState<number | null>(null);
  const [actionMode, setActionMode] = useState<'cancel' | 'refund' | null>(null);
  const [actionReason, setActionReason] = useState('');

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthMsg(null);
    try {
      if (authTab === 'login') {
        await onSignInEmail(authEmail, authPass);
      } else if (authTab === 'register') {
        await onRegisterEmail(authEmail, authPass, authName);
      } else {
        await onRecoverPassword(authEmail);
        setAuthMsg({
          type: 'ok',
          text: isDe
            ? 'E-Mail zur Passwort-Wiederherstellung wurde versendet.'
            : 'Password recovery email dispatched.',
        });
      }
    } catch (err) {
      setAuthMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Authentication failed.',
      });
    } finally {
      setAuthBusy(false);
    }
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 space-y-6">
        <div className="bg-white border border-silver rounded-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold text-navy">{t.account.title}</h1>
            <p className="text-sm text-charcoal/80">{t.account.subtitle}</p>
          </div>

          <div className="flex border-b border-silver text-xs font-semibold">
            {(
              [
                ['login', isDe ? 'Anmelden' : 'Login'],
                ['register', isDe ? 'Registrieren' : 'Register'],
                ['reset', isDe ? 'Passwort vergessen' : 'Password Recovery'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setAuthTab(key);
                  setAuthMsg(null);
                }}
                className={`px-4 py-2.5 border-b-2 cursor-pointer ${
                  authTab === key
                    ? 'border-scientific text-scientific'
                    : 'border-transparent text-charcoal/70 hover:text-navy'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {authTab === 'register' && (
              <input
                type="text"
                required
                minLength={2}
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                placeholder={isDe ? 'Name / Ansprechperson' : 'Full Name / Contact'}
                className="w-full px-3.5 py-2.5 text-sm border border-silver rounded-sm"
              />
            )}
            <input
              type="email"
              required
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder={isDe ? 'Geschäftliche E-Mail-Adresse' : 'Institutional Email'}
              className="w-full px-3.5 py-2.5 text-sm border border-silver rounded-sm"
            />
            {authTab !== 'reset' && (
              <input
                type="password"
                required
                minLength={6}
                value={authPass}
                onChange={(e) => setAuthPass(e.target.value)}
                placeholder={isDe ? 'Passwort (mind. 6 Zeichen)' : 'Password (min. 6 characters)'}
                className="w-full px-3.5 py-2.5 text-sm border border-silver rounded-sm"
              />
            )}

            {authMsg && (
              <div
                className={`p-3 text-xs rounded-sm border ${
                  authMsg.type === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {authMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className="w-full py-2.5 bg-navy text-white text-sm font-semibold rounded-sm hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              {authTab === 'login'
                ? isDe
                  ? 'Mit E-Mail anmelden'
                  : 'Sign In with Email'
                : authTab === 'register'
                  ? isDe
                    ? 'Konto registrieren'
                    : 'Create Account'
                  : isDe
                    ? 'Wiederherstellungs-Link senden'
                    : 'Send Password Reset Email'}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-silver" />
            <span className="flex-shrink mx-3 text-[11px] font-mono uppercase text-charcoal/60">
              {isDe ? 'oder' : 'or'}
            </span>
            <div className="flex-grow border-t border-silver" />
          </div>

          <button
            type="button"
            onClick={() => void onSignInGoogle()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-scientific text-white text-sm font-semibold rounded-sm hover:bg-blue-700 cursor-pointer"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>{t.nav.signIn}</span>
          </button>
        </div>
      </div>
    );
  }

  async function runFeedback(fn: () => Promise<void>, okText: string) {
    setFeedback(null);
    try {
      await fn();
      setFeedback({ type: 'ok', text: okText });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Operation failed.' });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header Summary Card */}
      <div className="bg-white border border-silver rounded-sm p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-navy">{t.account.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-charcoal/80">
            <span>{email}</span>
            <span>·</span>
            <span>
              {t.account.roleLabel}: <strong className="text-navy">{primaryRole}</strong>
            </span>
            <span>·</span>
            <span>
              {t.account.kybStatusLabel}:{' '}
              <strong className="text-scientific uppercase">
                {profile?.kybStatus ?? 'unverified'}
              </strong>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-silver rounded-sm text-xs font-medium text-navy hover:bg-lightgrey cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.nav.signOut}</span>
        </button>
      </div>

      {/* Dashboard Tab Bar */}
      <div className="flex flex-nowrap sm:flex-wrap gap-2 border-b border-silver pb-3 overflow-x-auto no-scrollbar">
        {(
          [
            ['orders', isDe ? `Bestellungen (${orders.length})` : `Orders (${orders.length})`, Package],
            ['profile', isDe ? 'Profil & KYB' : 'Profile & KYB', User],
            ['addresses', isDe ? `Adressen (${addresses.length})` : `Addresses (${addresses.length})`, MapPin],
            ['notifications', isDe ? `Benachrichtigungen (${notifications.length})` : `Notifications (${notifications.length})`, Bell],
            ['support', isDe ? 'Kundensupport' : 'Customer Support', LifeBuoy],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setDashTab(key)}
            className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold rounded-sm border whitespace-nowrap shrink-0 cursor-pointer ${
              dashTab === key
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-navy border-silver hover:bg-lightgrey'
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-sm border text-sm ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Orders Tab */}
      {dashTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white border border-silver rounded-sm p-8 text-sm text-charcoal/70">
              {t.account.noOrders}
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-silver rounded-sm p-6 space-y-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-silver/60 pb-3">
                  <div>
                    <div className="font-mono font-bold text-navy text-base">
                      {order.orderNumber}
                    </div>
                    <div className="font-mono text-xs text-charcoal/70">
                      {formatGermanDate(order.createdAt, locale)} · Status:{' '}
                      <strong className="text-scientific uppercase">{order.status}</strong>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-lg text-navy">
                    {formatEuroCents(order.totalGrossCents, locale)}
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-lightgrey rounded-sm border border-silver/60 space-y-1">
                    <div className="font-mono uppercase text-charcoal/60">
                      {isDe ? 'Zahlung' : 'Payment'}
                    </div>
                    <div className="font-medium text-navy">
                      {order.paymentTransaction?.provider ?? 'peptivora-sepa-invoice'}
                    </div>
                    <div className="font-mono text-charcoal/80">
                      {order.paymentTransaction?.status ?? 'pending_settlement'}{' '}
                      {order.paymentTransaction?.externalRef
                        ? `(${order.paymentTransaction.externalRef})`
                        : ''}
                    </div>
                  </div>

                  <div className="p-3 bg-lightgrey rounded-sm border border-silver/60 space-y-1">
                    <div className="font-mono uppercase text-charcoal/60">
                      {isDe ? 'Versand & Tracking' : 'Fulfilment & Tracking'}
                    </div>
                    <div className="font-medium text-navy">
                      {order.shipment?.carrier ?? 'Cold-Chain Courier'}
                    </div>
                    <div className="font-mono text-charcoal/80">
                      {order.shipment?.status ?? 'preparing'}
                      {order.shipment?.trackingNumber
                        ? ` · Tracking: ${order.shipment.trackingNumber}`
                        : ''}
                    </div>
                  </div>

                  <div className="p-3 bg-lightgrey rounded-sm border border-silver/60 space-y-1">
                    <div className="font-mono uppercase text-charcoal/60">
                      {isDe ? 'Rechnung' : 'Invoice'}
                    </div>
                    <div className="font-mono font-medium text-navy">
                      {order.invoice?.invoiceNumber ?? '—'}
                    </div>
                    {order.invoice && (
                      <button
                        type="button"
                        onClick={() => setInvoiceOrder(order)}
                        className="inline-flex items-center gap-1 text-scientific hover:underline font-medium cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{isDe ? 'Rechnung anzeigen' : 'View Invoice'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {order.items.length > 0 && (
                  <div className="text-xs border-t border-silver/50 pt-3 space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between font-mono text-charcoal/85">
                        <span>
                          {item.quantity}× {item.skuSnapshot} — {item.nameSnapshot}
                        </span>
                        <span>{formatEuroCents(item.unitNetCents * item.quantity, locale)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {['recorded_awaiting_settlement', 'authorized_for_fulfilment', 'compliance_hold'].includes(
                    order.status
                  ) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionOrderId(order.id);
                        setActionMode('cancel');
                        setActionReason('');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-800 text-xs font-medium rounded-sm hover:bg-red-50 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{isDe ? 'Stornieren' : 'Cancel Order'}</span>
                    </button>
                  )}

                  {!['cancelled', 'refunded', 'refund_requested'].includes(order.status) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionOrderId(order.id);
                        setActionMode('refund');
                        setActionReason('');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-silver text-navy text-xs font-medium rounded-sm hover:bg-lightgrey cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isDe ? 'Erstattung anfragen' : 'Request Refund'}</span>
                    </button>
                  )}
                </div>

                {actionOrderId === order.id && actionMode && (
                  <div className="p-3 bg-lightgrey border border-silver rounded-sm space-y-2">
                    <div className="text-xs font-semibold text-navy">
                      {actionMode === 'cancel'
                        ? isDe
                          ? 'Grund für Stornierung:'
                          : 'Reason for cancellation:'
                        : isDe
                          ? 'Grund für Erstattungsantrag:'
                          : 'Reason for refund request:'}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        minLength={5}
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-silver rounded-sm bg-white"
                        placeholder={isDe ? 'Mind. 5 Zeichen…' : 'Minimum 5 characters…'}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          void runFeedback(async () => {
                            if (actionMode === 'cancel') {
                              await onCancelOrder(order.id, actionReason);
                            } else {
                              await onRequestRefund(order.id, actionReason);
                            }
                            setActionOrderId(null);
                            setActionMode(null);
                          }, 'Order request recorded.')
                        }
                        className="px-3 py-1.5 bg-navy text-white text-xs rounded-sm cursor-pointer"
                      >
                        {isDe ? 'Bestätigen' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionOrderId(null);
                          setActionMode(null);
                        }}
                        className="px-3 py-1.5 border border-silver text-xs rounded-sm cursor-pointer"
                      >
                        {t.common.close}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Profile & KYB Tab */}
      {dashTab === 'profile' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runFeedback(
                () =>
                  onUpdateProfile({
                    displayName,
                    phone: profilePhone,
                    preferredLocale: prefLocale,
                  }),
                isDe ? 'Kontoprofil aktualisiert.' : 'Account profile updated.'
              );
            }}
            className="bg-white border border-silver rounded-sm p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-navy">
              {isDe ? 'Persönliche Profilangaben' : 'Profile Settings'}
            </h2>
            <input
              type="text"
              required
              minLength={2}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={isDe ? 'Anzeigename' : 'Display Name'}
              className="w-full px-3.5 py-2.5 text-sm border border-silver rounded-sm"
            />
            <input
              type="text"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder={t.account.phone}
              className="w-full px-3.5 py-2.5 text-sm border border-silver rounded-sm"
            />
            <select
              value={prefLocale}
              onChange={(e) => setPrefLocale(e.target.value as 'de' | 'en')}
              className="w-full px-3.5 py-2.5 text-sm border border-silver rounded-sm bg-white"
            >
              <option value="de">Deutsch (DE)</option>
              <option value="en">English (EN)</option>
            </select>
            <button
              type="submit"
              className="px-5 py-2.5 bg-navy text-white text-sm font-medium rounded-sm hover:bg-slate-800 cursor-pointer"
            >
              {isDe ? 'Profil speichern' : 'Save Profile'}
            </button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runFeedback(
                () =>
                  onSubmitKyb({
                    organizationName: orgName,
                    organizationType: orgType,
                    vatId,
                    phone: profilePhone,
                  }),
                isDe
                  ? 'KYB-Dossier eingereicht (Status: Prüfung ausstehend).'
                  : 'KYB dossier submitted (pending review).'
              );
            }}
            className="bg-white border border-silver rounded-sm p-6 space-y-4"
          >
            <div className="flex items-center gap-2 font-display text-lg font-bold text-navy">
              <Building2 className="w-5 h-5 text-scientific" aria-hidden="true" />
              <span>{isDe ? 'Organisations- & KYB-Nachweis' : 'Institutional KYB Verification'}</span>
            </div>
            <input
              type="text"
              required
              minLength={2}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={t.account.orgName}
              className="w-full px-3.5 py-2.5 text-sm border border-silver rounded-sm"
            />
            <select
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-silver rounded-sm bg-white"
            >
              <option value="university">University / Universität</option>
              <option value="research_institute">Research Institute / Forschungsinstitut</option>
              <option value="biotech_company">Biotech Company / Biotechnologie-Unternehmen</option>
              <option value="licensed_pharmacy">Licensed Pharmacy / Öffentliche Apotheke</option>
              <option value="pharmaceutical_wholesaler">
                § 52a AMG Wholesaler / Pharmagroßhandel
              </option>
            </select>
            <input
              type="text"
              value={vatId}
              onChange={(e) => setVatId(e.target.value.toUpperCase())}
              placeholder={t.account.vatId}
              className="w-full px-3.5 py-2.5 text-sm border border-silver rounded-sm font-mono"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-scientific text-white text-sm font-medium rounded-sm hover:bg-blue-700 cursor-pointer"
            >
              {t.account.submitKyb}
            </button>
          </form>

          {/* GDPR Art. 15 Export & Art. 17 Anonymization Controls */}
          <div className="lg:col-span-2 bg-white border border-silver rounded-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-navy">
                  {isDe
                    ? 'DSGVO-Datenschutz & Betroffenenrechte (Art. 15–17)'
                    : 'GDPR Data Protection & Privacy Rights (Art. 15–17)'}
                </h2>
                <p className="text-xs text-charcoal/75 mt-1">
                  {isDe
                    ? 'Exportieren Sie Ihre gespeicherten Daten als JSON oder beantragen Sie die Anonymisierung unter Wahrung gesetzlicher GoBD-Aufbewahrungsfristen.'
                    : 'Download a portable archive of your personal records or request GDPR erasure/anonymization subject to German statutory tax invoice retention (§ 147 AO).'}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void runFeedback(
                    () => onExportGdprData(),
                    isDe ? 'DSGVO-Datenexport heruntergeladen.' : 'GDPR personal data archive downloaded.'
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2 border border-navy text-navy text-xs font-semibold rounded-sm hover:bg-lightgrey cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isDe ? 'Meine Daten exportieren (Art. 15 DSGVO)' : 'Export My Data (Art. 15 GDPR)'}</span>
              </button>
            </div>

            <div className="border-t border-silver pt-4 flex flex-wrap items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
              <input
                type="text"
                value={gdprConfirm}
                onChange={(e) => setGdprConfirm(e.target.value)}
                placeholder="Type ERASE MY PERSONAL DATA"
                className="px-3 py-1.5 text-xs border border-silver rounded-sm font-mono w-64"
              />
              <button
                type="button"
                disabled={gdprConfirm !== 'ERASE MY PERSONAL DATA'}
                onClick={() =>
                  void runFeedback(async () => {
                    await onEraseGdprData(gdprConfirm);
                    setGdprConfirm('');
                  }, isDe ? 'Kontodaten anonymisiert.' : 'Personal data anonymized under GDPR Art. 17.')
                }
                className="px-4 py-2 bg-red-800 text-white text-xs font-semibold rounded-sm disabled:opacity-40 cursor-pointer"
              >
                {isDe ? 'Personenbezogene Daten löschen / anonymisieren' : 'Erase Personal Data (Art. 17)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Addresses Tab */}
      {dashTab === 'addresses' && (
        <div className="bg-white border border-silver rounded-sm p-6 space-y-5 max-w-3xl">
          <h2 className="font-display text-lg font-bold text-navy">{t.account.addressesTitle}</h2>
          {addresses.length > 0 && (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-3 border border-silver rounded-sm bg-lightgrey flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-navy">
                      {addr.label} · {addr.recipientName}
                    </div>
                    <div className="text-charcoal/80">
                      {addr.streetLine}, {addr.postalCode} {addr.city}, {addr.countryCode}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void runFeedback(() => onDeleteAddress(addr.id), 'Address deleted.')
                    }
                    className="p-1.5 text-charcoal/60 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runFeedback(async () => {
                await onAddAddress({
                  label: addrLabel,
                  recipientName,
                  streetLine,
                  postalCode,
                  city,
                  countryCode: countryCode.toUpperCase(),
                });
                setStreetLine('');
                setPostalCode('');
                setCity('');
              }, 'Address saved.');
            }}
            className="space-y-3 border-t border-silver pt-4"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={addrLabel}
                onChange={(e) => setAddrLabel(e.target.value)}
                placeholder={isDe ? 'Bezeichnung' : 'Label'}
                className="px-3 py-2 text-sm border border-silver rounded-sm"
              />
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder={isDe ? 'Empfänger' : 'Recipient'}
                className="px-3 py-2 text-sm border border-silver rounded-sm"
              />
            </div>
            <input
              type="text"
              required
              value={streetLine}
              onChange={(e) => setStreetLine(e.target.value)}
              placeholder={isDe ? 'Straße & Hausnummer' : 'Street & Number'}
              className="w-full px-3 py-2 text-sm border border-silver rounded-sm"
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder={isDe ? 'PLZ' : 'Postal Code'}
                className="px-3 py-2 text-sm border border-silver rounded-sm"
              />
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={isDe ? 'Stadt' : 'City'}
                className="px-3 py-2 text-sm border border-silver rounded-sm"
              />
              <input
                type="text"
                required
                maxLength={2}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                className="px-3 py-2 text-sm border border-silver rounded-sm font-mono uppercase"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-navy text-white text-xs font-semibold rounded-sm cursor-pointer"
            >
              {t.account.addAddress}
            </button>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {dashTab === 'notifications' && (
        <div className="bg-white border border-silver rounded-sm divide-y divide-silver">
          {notifications.length === 0 ? (
            <div className="p-6 text-sm text-charcoal/70">
              {isDe ? 'Keine Kontobenachrichtigungen vorhanden.' : 'No notifications recorded yet.'}
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="p-4 flex flex-wrap justify-between gap-2 text-xs">
                <div>
                  <span className="font-mono font-semibold text-scientific">{n.action}</span>{' '}
                  <span className="font-mono text-charcoal/70">({n.entityId})</span>
                  <p className="text-navy mt-1">{n.message}</p>
                </div>
                <span className="font-mono text-charcoal/60">
                  {formatGermanDate(n.createdAt, locale)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Support Tab */}
      {dashTab === 'support' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runFeedback(async () => {
                await onSubmitSupportTicket({ topic: supportTopic, message: supportMsg });
                setSupportMsg('');
              }, isDe ? 'Support-Ticket übermittelt.' : 'Support ticket submitted.');
            }}
            className="bg-white border border-silver rounded-sm p-6 space-y-4 h-fit"
          >
            <h2 className="font-display text-lg font-bold text-navy">
              {isDe ? 'Kundensupport kontaktieren' : 'Submit Customer Support Request'}
            </h2>
            <select
              value={supportTopic}
              onChange={(e) => setSupportTopic(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-silver rounded-sm bg-white"
            >
              <option value="Order & Cold-Chain Support">Order & Cold-Chain Support</option>
              <option value="Invoice & German VAT Question">Invoice & German VAT Question</option>
              <option value="KYB & Document Vault Access">KYB & Document Vault Access</option>
            </select>
            <textarea
              required
              minLength={10}
              rows={4}
              value={supportMsg}
              onChange={(e) => setSupportMsg(e.target.value)}
              placeholder={
                isDe
                  ? 'Nennen Sie Ihre Bestellnummer (z. B. PEP-2026-...) und Ihr Anliegen…'
                  : 'Include your order number (e.g. PEP-2026-...) and question…'
              }
              className="w-full px-3 py-2 text-sm border border-silver rounded-sm"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-scientific text-white text-sm font-medium rounded-sm cursor-pointer"
            >
              {isDe ? 'Support-Anfrage senden' : 'Send Support Ticket'}
            </button>
          </form>

          <div className="bg-white border border-silver rounded-sm p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-navy">
              {isDe ? 'Ihre bisherigen Support-Anfragen' : 'Your Support History'}
            </h2>
            {supportTickets.length === 0 ? (
              <p className="text-sm text-charcoal/70">
                {isDe ? 'Keine Support-Nachrichten vorhanden.' : 'No support tickets logged yet.'}
              </p>
            ) : (
              <div className="divide-y divide-silver text-xs">
                {supportTickets.map((st) => (
                  <div key={st.id} className="py-3 space-y-1">
                    <div className="font-semibold text-navy">
                      {st.topic} · <span className="font-mono">{st.status}</span>
                    </div>
                    <p className="text-charcoal/80">{st.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable German VAT Invoice Modal */}
      {invoiceOrder && invoiceOrder.invoice && (
        <div className="fixed inset-0 z-50 bg-navy/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white border border-navy rounded-sm max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-silver pb-4">
              <div>
                <div className="font-display text-xl font-bold text-navy">PEPTIVORA</div>
                <div className="font-mono text-xs text-scientific">
                  {invoiceOrder.invoice.invoiceNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceOrder(null)}
                className="p-1 text-charcoal/70 hover:text-navy cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-mono uppercase text-charcoal/60">
                  {isDe ? 'Rechnungsempfänger' : 'Billed To'}
                </div>
                <div className="font-semibold text-navy mt-1">{invoiceOrder.billingName}</div>
                <div className="text-charcoal/80">{invoiceOrder.billingAddress}</div>
                {invoiceOrder.billingVatId && (
                  <div className="font-mono text-charcoal/80 mt-0.5">
                    USt-IdNr.: {invoiceOrder.billingVatId}
                  </div>
                )}
              </div>
              <div className="sm:text-right font-mono space-y-1">
                <div>Order: {invoiceOrder.orderNumber}</div>
                <div>Date: {formatGermanDate(invoiceOrder.invoice.issuedAt, locale)}</div>
                <div>Currency: EUR</div>
              </div>
            </div>

            <div className="border-y border-silver py-3 text-xs space-y-1.5">
              {invoiceOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between font-mono">
                  <span>
                    {item.quantity}× {item.skuSnapshot} ({item.nameSnapshot})
                  </span>
                  <span>{formatEuroCents(item.unitNetCents * item.quantity, locale)}</span>
                </div>
              ))}
            </div>

            <dl className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <dt>{isDe ? 'Netto inkl. Versand' : 'Net incl. Shipping'}</dt>
                <dd>{formatEuroCents(invoiceOrder.invoice.subtotalNetCents, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>19 % MwSt. / German VAT</dt>
                <dd>{formatEuroCents(invoiceOrder.invoice.vatCents, locale)}</dd>
              </div>
              <div className="flex justify-between font-bold text-sm text-navy border-t border-silver pt-2">
                <dt>{isDe ? 'Rechnungsbetrag Brutto' : 'Total Gross'}</dt>
                <dd>{formatEuroCents(invoiceOrder.invoice.totalGrossCents, locale)}</dd>
              </div>
            </dl>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-navy text-navy text-xs font-medium rounded-sm hover:bg-lightgrey cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isDe ? 'Drucken / PDF' : 'Print / PDF'}</span>
              </button>
              <button
                type="button"
                onClick={() => setInvoiceOrder(null)}
                className="px-4 py-2 bg-navy text-white text-xs font-medium rounded-sm cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
