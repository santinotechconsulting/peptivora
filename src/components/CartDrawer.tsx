import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatEuroCents, type Locale } from '../core/domain/compliance.ts';
import { getCopy } from '../i18n/translations.ts';
import type { CartItem, PageRoute } from '../types/peptivora.ts';
import { PRECISION_EASE } from './ui/MotionPrimitives.tsx';

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

  const t = getCopy(locale);

  const subtotalNetCents = cart.reduce(
    (sum, item) =>
      sum + (item.variant?.priceNetCents ?? item.product.priceNetCents) * item.quantity,
    0
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cart-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: PRECISION_EASE }}
          className="fixed inset-0 z-50 flex justify-end bg-navy/45 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label={t.cart.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="cart-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.24, ease: PRECISION_EASE }}
            className="w-full max-w-md bg-white h-full flex flex-col border-l border-silver shadow-2xl"
          >
            <div className="px-5 sm:px-6 py-4 border-b border-silver flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-navy">{t.cart.title}</h2>
                <p className="text-[11px] text-charcoal/70">{t.cart.divisionRule}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.common.close}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-sm text-charcoal/70 hover:text-navy hover:bg-lightgrey transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
              {cart.length === 0 ? (
                <div className="py-10 text-center space-y-2.5 text-charcoal/70">
                  <ShoppingBag className="w-7 h-7 mx-auto text-silver" aria-hidden="true" />
                  <p className="text-sm">{t.cart.empty}</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {cart.map((item) => {
                    const name = locale === 'de' ? item.product.nameDe : item.product.nameEn;
                    const unitNet = item.variant?.priceNetCents ?? item.product.priceNetCents;
                    return (
                      <motion.div
                        key={item.product.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{ duration: 0.18, ease: PRECISION_EASE }}
                        className="p-4 border border-silver rounded-sm flex items-start justify-between gap-3 bg-white hover:border-navy/30 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="font-mono text-[11px] text-scientific">{item.product.sku}</div>
                          <div className="font-medium text-sm text-navy truncate">{name}</div>
                          <div className="font-mono text-xs text-charcoal/80 tabular-nums">
                            {formatEuroCents(unitNet, locale)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label={locale === 'de' ? 'Menge verringern' : 'Decrease quantity'}
                            onClick={() => onUpdateQty(item.product.id, -1)}
                            className="btn-precision min-w-[38px] min-h-[38px] inline-flex items-center justify-center border border-silver rounded-sm hover:bg-lightgrey cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-xs w-6 text-center tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={locale === 'de' ? 'Menge erhöhen' : 'Increase quantity'}
                            onClick={() => onUpdateQty(item.product.id, 1)}
                            className="btn-precision min-w-[38px] min-h-[38px] inline-flex items-center justify-center border border-silver rounded-sm hover:bg-lightgrey cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={locale === 'de' ? 'Entfernen' : 'Remove'}
                            onClick={() => onRemove(item.product.id)}
                            className="btn-precision min-w-[38px] min-h-[38px] inline-flex items-center justify-center text-charcoal/60 hover:text-red-700 hover:bg-red-50 rounded-sm cursor-pointer ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            <div className="p-5 sm:p-6 border-t border-silver bg-lightgrey space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal/80">{t.cart.subtotalNet}</span>
                <span className="font-mono font-bold text-navy tabular-nums">
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
                  className="btn-precision min-h-[44px] py-2.5 border border-navy text-navy text-xs font-semibold rounded-sm hover:bg-white cursor-pointer"
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
                  className="btn-precision min-h-[44px] py-2.5 bg-scientific text-white text-xs font-semibold rounded-sm hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>{t.nav.checkout}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
