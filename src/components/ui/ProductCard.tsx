import { ArrowUpRight, FileCheck2, Lock, Plus } from 'lucide-react';
import {
  formatEuroCents,
  isProductAvailableForPublicCatalog,
  type Locale,
} from '../../core/domain/compliance.ts';
import { buildPathForRoute } from '../../core/seo/seoEngine.ts';
import { getCopy } from '../../i18n/translations.ts';
import type { ProductDto } from '../../types/peptivora.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface ProductCardProps {
  product: ProductDto;
  locale: Locale;
  divisionTransactionsEnabled: boolean;
  onSelectProduct: (product: ProductDto) => void;
  onAddToCart: (product: ProductDto) => void;
}

export function ProductCard({
  product,
  locale,
  divisionTransactionsEnabled,
  onSelectProduct,
  onAddToCart,
}: ProductCardProps) {
  const t = getCopy(locale);
  const name = locale === 'de' ? product.nameDe : product.nameEn;
  const description = locale === 'de' ? product.descriptionDe : product.descriptionEn;
  const categoryName = locale === 'de' ? product.categoryNameDe : product.categoryNameEn;
  const className = locale === 'de' ? product.classificationNameDe : product.classificationNameEn;
  const notice = locale === 'de' ? product.regulatoryNoticeDe : product.regulatoryNoticeEn;
  const primaryImage = product.images[0];
  const productHref = buildPathForRoute('product', locale, product.slug);

  const availableForCatalog = isProductAvailableForPublicCatalog({
    publicationStatus: product.publicationStatus,
    approvalStatus: product.approvalStatus,
    latestApprovalExpiresAt: product.approvalExpiresAt,
  });

  if (!availableForCatalog) {
    return null;
  }

  const batchQty = product.inventory.reduce((sum, inv) => sum + inv.quantityOnHand, 0);
  const isOrderable =
    divisionTransactionsEnabled &&
    product.divisionSlug === 'research' &&
    product.pricePermitted &&
    product.stockStatus === 'in_stock' &&
    batchQty > 0;

  return (
    <article className="group surface-card flex flex-col justify-between bg-white border border-silver/75 rounded-sm overflow-hidden h-full">
      <div>
        <a
          href={productHref}
          onClick={(e) => {
            if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
              e.preventDefault();
              onSelectProduct(product);
            }
          }}
          className="block w-full text-left relative aspect-[4/3] bg-lightgrey overflow-hidden border-b border-silver/50 focus-visible:outline-2 focus-visible:outline-scientific"
        >
          <ResilientImage
            src={primaryImage?.imageUrl ?? null}
            alt={locale === 'de' ? primaryImage?.altDe ?? name : primaryImage?.altEn ?? name}
            width={640}
            height={480}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="absolute top-3 left-3 bg-navy/90 backdrop-blur-[2px] text-white px-2.5 py-1 rounded-sm font-mono text-[10px] tracking-wider uppercase">
            {product.sku}
          </div>
          {product.isDemonstrationRecord && (
            <div className="absolute bottom-3 left-3 bg-white/95 border border-silver px-2 py-0.5 rounded-sm font-mono text-[10px] tracking-wide uppercase text-navy">
              {t.common.fictionalTag}
            </div>
          )}
        </a>

        <div className="p-4 sm:p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-scientific mb-1.5">
            {categoryName}
          </div>

          <h3 className="font-display text-lg font-semibold text-navy leading-snug mb-2">
            <a
              href={productHref}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  onSelectProduct(product);
                }
              }}
              className="text-left hover:text-scientific transition-colors focus-visible:outline-2 focus-visible:outline-scientific"
            >
              {name}
            </a>
          </h3>

          <p className="text-sm text-charcoal/80 leading-relaxed line-clamp-2 mb-4">{description}</p>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-b border-silver/50 py-3 text-xs">
            <div>
              <dt className="text-charcoal/60 uppercase tracking-wider text-[10px] font-mono">
                {locale === 'de' ? 'Klassifikation' : 'Classification'}
              </dt>
              <dd className="font-medium text-navy mt-0.5 leading-snug">{className}</dd>
            </div>
            <div>
              <dt className="text-charcoal/60 uppercase tracking-wider text-[10px] font-mono">
                {locale === 'de' ? 'Verfügbarkeit' : 'Availability'}
              </dt>
              <dd className="font-mono text-navy mt-0.5 tabular-nums">
                {product.stockStatus === 'in_stock' && batchQty > 0
                  ? `${t.catalogue.available} (${batchQty})`
                  : product.stockStatus === 'gated'
                    ? t.catalogue.gated
                    : t.catalogue.outOfStock}
              </dd>
            </div>
            <div className="col-span-2 flex items-center justify-between pt-1">
              <span className="inline-flex items-center gap-1.5 text-charcoal/75">
                <FileCheck2 className="w-3.5 h-3.5 text-scientific" aria-hidden="true" />
                <span>
                  {t.catalogue.docsCount}:{' '}
                  <strong className="font-mono tabular-nums">{product.documents.length}</strong>
                </span>
              </span>
              <span className="font-mono text-[11px] text-charcoal/70">{product.storageCondition}</span>
            </div>
          </dl>

          <p className="mt-3 text-[11px] leading-snug text-charcoal/75 bg-lightgrey px-3 py-2 rounded-sm border border-silver/50">
            {notice}
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          {product.pricePermitted ? (
            <div>
              <div className="font-mono text-lg font-semibold text-navy tabular-nums">
                {formatEuroCents(product.priceNetCents, locale)}
              </div>
              <div className="text-[11px] text-charcoal/65">{t.catalogue.priceOnApproved}</div>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal/70">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.catalogue.priceRestricted}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={productHref}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                onSelectProduct(product);
              }
            }}
            className="btn-precision inline-flex items-center gap-1 min-h-[40px] px-3.5 py-2 text-xs font-medium border border-silver rounded-sm text-navy hover:bg-lightgrey hover:border-navy/40 cursor-pointer"
          >
            <span>{t.catalogue.viewDetails}</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </a>

          {isOrderable && (
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              aria-label={`${t.catalogue.addToCart}: ${name}`}
              className="btn-precision inline-flex items-center gap-1 min-h-[40px] px-3.5 py-2 text-xs font-medium bg-scientific text-white rounded-sm hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{locale === 'de' ? 'Warenkorb' : 'Add'}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
