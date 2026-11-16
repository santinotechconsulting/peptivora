import { useEffect } from 'react';
import { ArrowRight, Minus, Plus, Trash2, X } from 'lucide-react';
import { formatEuroCents, type Locale } from '../core/domain/compliance.ts';
import { getCopy } from '../i18n/translations.ts';
import type { CartItem, PageRoute } from '../types/peptivora.ts';

interface CartDrawerProps {
  open: boolean;
  locale: Locale;
  cart: CartItem[];
  onClose: () => void;
  onUpdateQty: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
  onNavigate: (route: PageRoute) => void;
}

export function CartDrawer({
  open,
  locale,
  cart,
  onClose,
  onUpdateQty,
  onRemove,
  onNavigate,
}: CartDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  const t = getCopy(locale);

  const subtotalNetCents = cart.reduce(
    (sum, item) =>
      sum + (item.variant?.priceNetCents ?? item.product.priceNetCents) * item.quantity,
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-navy/45"
      role="dialog"
      aria-modal="true"
      aria-label={t.cart.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white h-full flex flex-col border-l border-silver shadow-2xl">
        <div className="px-5 sm:px-6 py-4 border-b border-silver flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-navy">{t.cart.title}</h2>
            <p className="text-[11px] text-charcoal/70">{t.cart.divisionRule}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-charcoal/70 hover:text-navy cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {cart.length === 0 ? (
            <p className="text-sm text-charcoal/75">{t.cart.empty}</p>
          ) : (
            cart.map((item) => {
              const name = locale === 'de' ? item.product.nameDe : item.product.nameEn;
              const unitNet = item.variant?.priceNetCents ?? item.product.priceNetCents;
              return (
                <div
                  key={item.product.id}
                  className="p-4 border border-silver rounded-sm flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-mono text-[11px] text-scientific">{item.product.sku}</div>
                    <div className="font-medium text-sm text-navy truncate">{name}</div>
                    <div className="font-mono text-xs text-charcoal/80">
                      {formatEuroCents(unitNet, locale)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={locale === 'de' ? 'Menge verringern' : 'Decrease quantity'}
                      onClick={() => onUpdateQty(item.product.id, -1)}
                      className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center border border-silver rounded-sm hover:bg-lightgrey cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-xs w-6 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={locale === 'de' ? 'Menge erhöhen' : 'Increase quantity'}
                      onClick={() => onUpdateQty(item.product.id, 1)}
                      className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center border border-silver rounded-sm hover:bg-lightgrey cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={locale === 'de' ? 'Entfernen' : 'Remove'}
                      onClick={() => onRemove(item.product.id)}
                      className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center text-charcoal/60 hover:text-red-700 cursor-pointer ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-5 sm:p-6 border-t border-silver bg-lightgrey space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-charcoal/80">{t.cart.subtotalNet}</span>
            <span className="font-mono font-bold text-navy">
              {formatEuroCents(subtotalNetCents, locale)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('cart');
              }}
              className="min-h-[44px] py-2.5 border border-navy text-navy text-xs font-semibold rounded-sm hover:bg-white cursor-pointer"
            >
              {t.cart.title}
            </button>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => {
                onClose();
                onNavigate('checkout');
              }}
              className="min-h-[44px] py-2.5 bg-scientific text-white text-xs font-semibold rounded-sm hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>{t.nav.checkout}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
