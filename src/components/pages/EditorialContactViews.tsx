import { useMemo, useState, type FormEvent } from 'react';
import { BookOpen, Mail, Send } from 'lucide-react';
import { formatGermanDate, type Locale } from '../../core/domain/compliance.ts';
import { getCopy } from '../../i18n/translations.ts';
import type { BlogCategoryDto, BlogPostDto } from '../../types/peptivora.ts';
import { ResilientImage } from '../ui/ResilientImage.tsx';

export function BlogPage({
  locale,
  categories,
  posts,
  initialPostSlug,
  onActivePostChange,
}: {
  locale: Locale;
  categories: BlogCategoryDto[];
  posts: BlogPostDto[];
  initialPostSlug?: string | null;
  onActivePostChange?: (post: BlogPostDto | null) => void;
}) {
  const isDe = locale === 'de';
  const [selectedCatSlug, setSelectedCatSlug] = useState<string>('all');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialPostSlug ?? null);

  const activePost = useMemo(
    () => (selectedSlug ? posts.find((p) => p.slug === selectedSlug) ?? null : null),
    [posts, selectedSlug]
  );

  const filteredPosts = useMemo(() => {
    if (selectedCatSlug === 'all') return posts;
    return posts.filter((p) => p.category?.slug === selectedCatSlug);
  }, [posts, selectedCatSlug]);

  if (activePost) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <button
          type="button"
          onClick={() => {
            setSelectedSlug(null);
            onActivePostChange?.(null);
          }}
          className="text-sm font-medium text-scientific hover:underline cursor-pointer"
        >
          ← {isDe ? 'Alle Fachbeiträge' : 'All Blog Articles'}
        </button>

        <article className="bg-white border border-silver rounded-sm overflow-hidden">
          {activePost.imageUrl && (
            <div className="aspect-[16/7] bg-lightgrey border-b border-silver">
              <ResilientImage
                src={activePost.imageUrl}
                alt={isDe ? activePost.titleDe : activePost.titleEn}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-8 space-y-5">
            <div className="font-mono text-xs uppercase tracking-wider text-scientific flex flex-wrap items-center gap-2">
              <span>{(isDe ? activePost.category?.nameDe : activePost.category?.nameEn) ?? ''}</span>
              <span>· {formatGermanDate(activePost.publishedAt, locale)}</span>
              {activePost.updatedAt && (
                <span>
                  · {isDe ? 'Aktualisiert:' : 'Updated:'} {formatGermanDate(activePost.updatedAt, locale)}
                </span>
              )}
              {activePost.editorialReviewStatus && (
                <span className="px-2 py-0.5 bg-lightgrey border border-silver rounded-sm text-navy">
                  {activePost.editorialReviewStatus}
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl font-bold text-navy leading-tight">
              {isDe ? activePost.titleDe : activePost.titleEn}
            </h1>
            {activePost.author && (
              <div className="text-xs text-charcoal/75 border-y border-silver/60 py-3 space-y-1">
                <div>
                  <span className="font-semibold text-navy">{activePost.author.name}</span> —{' '}
                  {isDe ? activePost.author.roleDe : activePost.author.roleEn}
                </div>
                {(isDe ? activePost.author.bioDe : activePost.author.bioEn) && (
                  <p className="text-charcoal/65">
                    {isDe ? activePost.author.bioDe : activePost.author.bioEn}
                  </p>
                )}
              </div>
            )}
            <p className="text-base text-charcoal/90 leading-relaxed whitespace-pre-line">
              {isDe ? activePost.bodyDe : activePost.bodyEn}
            </p>
            {(activePost.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-silver/60">
                {(activePost.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[11px] px-2.5 py-1 bg-lightgrey border border-silver rounded-sm text-navy"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {activePost.referencesText && (
              <div className="p-4 bg-lightgrey border border-silver rounded-sm text-xs space-y-1">
                <div className="font-mono uppercase font-bold text-navy">
                  {isDe ? 'Quellen & Referenzen' : 'Scientific Sources & References'}
                </div>
                <p className="text-charcoal/80 whitespace-pre-line">{activePost.referencesText}</p>
              </div>
            )}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-scientific">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>{isDe ? 'FACHBEITRÄGE & ANALYTIK' : 'SCIENTIFIC BLOG'}</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-navy">
            {isDe ? 'Wissenschaftliche & regulatorische Beiträge' : 'Scientific & Regulatory Journal'}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCatSlug('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm border cursor-pointer ${
              selectedCatSlug === 'all'
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-navy border-silver hover:bg-lightgrey'
            }`}
          >
            {isDe ? 'Alle Themen' : 'All Topics'}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCatSlug(cat.slug)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm border cursor-pointer ${
                selectedCatSlug === cat.slug
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-navy border-silver hover:bg-lightgrey'
              }`}
            >
              {isDe ? cat.nameDe : cat.nameEn}
            </button>
          ))}
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="bg-white border border-silver rounded-sm p-8 text-sm text-charcoal/75">
          {isDe ? 'Keine Beiträge in dieser Kategorie gefunden.' : 'No posts found in this category.'}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white border border-silver rounded-sm overflow-hidden flex flex-col justify-between"
            >
              <div>
                {post.imageUrl && (
                  <div className="aspect-[16/9] bg-lightgrey border-b border-silver">
                    <ResilientImage
                      src={post.imageUrl}
                      alt={isDe ? post.titleDe : post.titleEn}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6 space-y-3">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-scientific">
                    {(isDe ? post.category?.nameDe : post.category?.nameEn) ?? ''} ·{' '}
                    {formatGermanDate(post.publishedAt, locale)}
                  </div>
                  <h2 className="font-display text-xl font-bold text-navy leading-snug">
                    {isDe ? post.titleDe : post.titleEn}
                  </h2>
                  <p className="text-sm text-charcoal/80 leading-relaxed">
                    {isDe ? post.excerptDe : post.excerptEn}
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 flex items-center justify-between border-t border-silver/50 pt-4 text-xs">
                <span className="text-charcoal/70">{post.author?.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlug(post.slug);
                    onActivePostChange?.(post);
                  }}
                  className="font-semibold text-scientific hover:underline cursor-pointer"
                >
                  {isDe ? 'Beitrag öffnen →' : 'Read full article →'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContactPage({ locale }: { locale: Locale }) {
  const t = getCopy(locale);
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [topic, setTopic] = useState('KYB & Institutional Access');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName,
          senderEmail,
          organization,
          topic,
          message,
          locale,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Submission failed');
      }
      setStatusMessage({ type: 'ok', text: t.contact.success });
      setSenderName('');
      setSenderEmail('');
      setOrganization('');
      setMessage('');
    } catch (err) {
      setStatusMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Contact inquiry failed',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-scientific">
          <Mail className="w-4 h-4" aria-hidden="true" />
          <span>{t.nav.contact}</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-navy">{t.contact.title}</h1>
        <p className="text-sm text-charcoal/80 leading-relaxed">{t.contact.subtitle}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-silver rounded-sm p-6 sm:p-8 space-y-5"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-navy">{t.contact.name} *</span>
            <input
              type="text"
              required
              minLength={2}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-silver rounded-sm bg-white text-navy"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-navy">{t.contact.email} *</span>
            <input
              type="email"
              required
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-silver rounded-sm bg-white text-navy"
            />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-navy">{t.contact.organization}</span>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-silver rounded-sm bg-white text-navy"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-navy">{t.contact.topic} *</span>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-silver rounded-sm bg-white text-navy"
            >
              <option value="KYB & Institutional Access">KYB & Institutional Access</option>
              <option value="Research Documentation & Vault">
                Research Documentation & Vault
              </option>
              <option value="Pharmaceutical Governance & Licensing">
                Pharmaceutical Governance & Licensing
              </option>
              <option value="General Inquiry">General Inquiry</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-navy">{t.contact.message} *</span>
          <textarea
            required
            minLength={10}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-silver rounded-sm bg-white text-navy"
          />
        </label>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-sm border text-sm ${
              statusMessage.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-scientific text-white text-sm font-semibold rounded-sm hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span>{t.contact.send}</span>
        </button>
      </form>
    </div>
  );
}
