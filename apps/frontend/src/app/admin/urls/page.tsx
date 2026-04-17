'use client';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { urlsApi } from '@/lib/api';

const PLATFORMS = ['reddit', 'pinterest', 'instagram', 'generic_explicit', 'athlete_specific'];

const PLATFORM_COLORS: Record<string, string> = {
  reddit: '#ff4500',
  pinterest: '#e60023',
  instagram: '#c13584',
  generic_explicit: '#d96858',
  athlete_specific: '#8fc832',
};

type Tab = 'all' | 'pending' | 'active' | 'inactive';

interface TargetUrl {
  id: string;
  url: string;
  platform: string;
  label: string | null;
  isActive: boolean;
  mlScore: number | null;
  mlLabel: string | null;
  priority: number | null;
  autoDiscovered: boolean;
  lastCrawledAt: string | null;
  createdAt: string;
}

function PriorityPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (p: number | null) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          title={`Priority ${n}`}
          onClick={() => onChange(value === n ? null : n)}
          style={{
            width: '18px',
            height: '18px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontSize: '14px',
            lineHeight: 1,
            opacity: value !== null && n <= value ? 1 : 0.2,
            color: value !== null && n <= value ? '#e89828' : '#ede5cf',
            transition: 'opacity 0.1s',
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.2)', letterSpacing: '0.08em' }}>
        unscored
      </span>
    );
  }
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? '#8fc832' : pct >= 40 ? '#e89828' : '#d96858';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '56px', height: '3px', background: 'rgba(237,229,207,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color, letterSpacing: '0.06em', minWidth: '28px' }}>
        {pct}%
      </span>
    </div>
  );
}

export default function AdminUrlsPage() {
  const [urls, setUrls] = useState<TargetUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'mlScore' | 'priority'>('priority');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ url: '', platform: 'reddit', label: '' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = tab === 'pending'
        ? await urlsApi.pendingReview()
        : await urlsApi.list();
      setUrls(res.data);
    } catch {
      setUrls([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = urls.filter((u) => {
    if (tab === 'active') return u.isActive;
    if (tab === 'inactive') return !u.isActive;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'mlScore') {
      return (b.mlScore ?? -1) - (a.mlScore ?? -1);
    }
    if (sortBy === 'priority') {
      // prioritised first (5 → 1), then unranked, sorted by mlScore within each group
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pb !== pa) return pb - pa;
      return (b.mlScore ?? -1) - (a.mlScore ?? -1);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const stats = {
    total: urls.length,
    active: urls.filter((u) => u.isActive).length,
    pending: urls.filter((u) => u.autoDiscovered && !u.isActive).length,
    ranked: urls.filter((u) => u.priority !== null).length,
  };

  async function handleToggle(id: string) {
    setActionLoading(id);
    try { await urlsApi.toggle(id); await load(); } catch {} finally { setActionLoading(null); }
  }

  async function handleLabel(id: string, isGood: boolean) {
    setActionLoading(id + '-label');
    try { await urlsApi.label(id, isGood); await load(); } catch {} finally { setActionLoading(null); }
  }

  async function handlePriority(id: string, priority: number | null) {
    setUrls((prev) => prev.map((u) => u.id === id ? { ...u, priority } : u));
    try { await urlsApi.setPriority(id, priority); } catch { await load(); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this URL from the crawl list?')) return;
    setActionLoading(id + '-del');
    try { await urlsApi.remove(id); await load(); } catch {} finally { setActionLoading(null); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await urlsApi.create({ url: addForm.url, platform: addForm.platform, label: addForm.label || undefined });
      setAddForm({ url: '', platform: 'reddit', label: '' });
      setShowAdd(false);
      await load();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to add URL');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDiscover() {
    setDiscoverLoading(true);
    try { await urlsApi.triggerDiscover('known_domains'); } catch {} finally { setDiscoverLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(13,22,20,0.7)',
    border: '1px solid rgba(237,229,207,0.1)',
    color: '#ede5cf',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '13px',
    padding: '9px 12px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d96858', marginBottom: '10px', opacity: 0.8 }}>
          Admin
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '42px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
              URL ranking.
            </h1>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.4)', marginTop: '10px' }}>
              Manage and prioritise crawl targets for the ML pipeline.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDiscover}
              disabled={discoverLoading}
              style={{ background: 'transparent', color: 'rgba(237,229,207,0.55)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '10px 18px', border: '1px solid rgba(237,229,207,0.15)', cursor: discoverLoading ? 'not-allowed' : 'pointer', opacity: discoverLoading ? 0.5 : 1 }}
            >
              {discoverLoading ? 'queued...' : '↺ discover'}
            </button>
            <button
              onClick={() => setShowAdd((v) => !v)}
              style={{ background: '#8fc832', color: '#0d1614', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: '10px 18px', border: 'none', cursor: 'pointer' }}
            >
              + add url
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(237,229,207,0.07)', marginTop: '32px', marginBottom: '32px' }}>
        {[
          { label: 'Total URLs', value: stats.total, color: '#ede5cf' },
          { label: 'Active', value: stats.active, color: '#8fc832' },
          { label: 'Pending review', value: stats.pending, color: '#e89828' },
          { label: 'Ranked', value: stats.ranked, color: '#b8a8cc' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#0d1614', padding: '20px 24px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: '6px' }}>
              {s.value}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Add URL form */}
      {showAdd && (
        <form onSubmit={handleAdd} style={{ background: 'rgba(27,52,34,0.35)', border: '1px solid rgba(237,229,207,0.08)', padding: '24px', marginBottom: '24px' }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.4)', marginBottom: '16px' }}>
            Add target URL
          </p>
          {addError && (
            <div style={{ background: 'rgba(217,104,88,0.1)', border: '1px solid rgba(217,104,88,0.2)', color: '#d96858', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', padding: '10px 12px', marginBottom: '16px', letterSpacing: '0.04em' }}>
              {addError}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'end' }}>
            <div>
              <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.35)', display: 'block', marginBottom: '6px' }}>URL</label>
              <input
                type="url"
                required
                value={addForm.url}
                onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
                placeholder="https://..."
                style={{ ...inputStyle, width: '100%' }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(143,200,50,0.4)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(237,229,207,0.1)')}
              />
            </div>
            <div>
              <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.35)', display: 'block', marginBottom: '6px' }}>Platform</label>
              <select
                value={addForm.platform}
                onChange={(e) => setAddForm({ ...addForm, platform: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={addLoading}
                style={{ background: '#8fc832', color: '#0d1614', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: '9px 16px', border: 'none', cursor: addLoading ? 'not-allowed' : 'pointer', opacity: addLoading ? 0.6 : 1, whiteSpace: 'nowrap' }}
              >
                {addLoading ? 'Adding...' : 'Add →'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setAddError(''); }}
                style={{ background: 'transparent', color: 'rgba(237,229,207,0.4)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '9px 14px', border: '1px solid rgba(237,229,207,0.1)', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tabs + sort */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(237,229,207,0.07)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          {(['all', 'pending', 'active', 'inactive'] as Tab[]).map((t) => {
            const active = tab === t;
            const badge = t === 'pending' ? stats.pending : undefined;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '9px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: active ? '#8fc832' : 'rgba(237,229,207,0.35)',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${active ? '#8fc832' : 'transparent'}`,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  marginBottom: '-1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {t}
                {badge !== undefined && badge > 0 && (
                  <span style={{ background: '#e89828', color: '#0d1614', fontSize: '8px', fontWeight: 700, padding: '1px 5px', borderRadius: '10px' }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.25)' }}>sort</span>
          {(['priority', 'mlScore', 'createdAt'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '9px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: sortBy === s ? '#ede5cf' : 'rgba(237,229,207,0.25)',
                background: sortBy === s ? 'rgba(237,229,207,0.07)' : 'none',
                border: '1px solid',
                borderColor: sortBy === s ? 'rgba(237,229,207,0.15)' : 'transparent',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              {s === 'createdAt' ? 'newest' : s === 'mlScore' ? 'ml score' : 'priority'}
            </button>
          ))}
        </div>
      </div>

      {/* URL list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(237,229,207,0.25)' }}>
          Loading...
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '56px', opacity: 0.12, lineHeight: 1, marginBottom: '16px' }}>◇</div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)' }}>
            No URLs in this view
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(237,229,207,0.07)' }}>
          {sorted.map((u) => {
            const platformColor = PLATFORM_COLORS[u.platform] ?? 'rgba(237,229,207,0.3)';
            const busy = actionLoading === u.id || actionLoading === u.id + '-label' || actionLoading === u.id + '-del';
            return (
              <div
                key={u.id}
                style={{
                  background: '#0d1614',
                  padding: '18px 24px',
                  opacity: busy ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                  borderLeft: u.priority ? `2px solid #e89828` : '2px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  {/* Left: priority + status */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '60px', paddingTop: '2px' }}>
                    <PriorityPicker value={u.priority} onChange={(p) => handlePriority(u.id, p)} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: u.isActive ? '#8fc832' : 'rgba(237,229,207,0.15)' }} />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', letterSpacing: '0.1em', color: u.isActive ? '#8fc832' : 'rgba(237,229,207,0.25)', textTransform: 'uppercase' }}>
                        {u.isActive ? 'active' : 'inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: platformColor, background: `${platformColor}18`, padding: '2px 7px', border: `1px solid ${platformColor}30` }}>
                        {u.platform.replace(/_/g, ' ')}
                      </span>
                      {u.autoDiscovered && (
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#e89828', opacity: 0.8 }}>
                          auto-discovered
                        </span>
                      )}
                      {u.mlLabel && (
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', letterSpacing: '0.1em', color: u.mlLabel === 'positive' ? '#8fc832' : '#d96858', textTransform: 'uppercase', opacity: 0.8 }}>
                          {u.mlLabel}
                        </span>
                      )}
                    </div>
                    <a
                      href={u.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', color: '#ede5cf', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}
                    >
                      {u.url}
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                      <ScoreBar score={u.mlScore} />
                      {u.lastCrawledAt && (
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.2)', letterSpacing: '0.06em' }}>
                          crawled {new Date(u.lastCrawledAt).toLocaleDateString()}
                        </span>
                      )}
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.15)', letterSpacing: '0.06em' }}>
                        added {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {u.autoDiscovered && !u.mlLabel && (
                      <>
                        <button
                          onClick={() => handleLabel(u.id, true)}
                          disabled={busy}
                          title="Approve — mark as positive training data"
                          style={{ background: 'rgba(143,200,50,0.1)', color: '#8fc832', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '7px 12px', border: '1px solid rgba(143,200,50,0.25)', cursor: busy ? 'not-allowed' : 'pointer' }}
                        >
                          ✓ approve
                        </button>
                        <button
                          onClick={() => handleLabel(u.id, false)}
                          disabled={busy}
                          title="Reject — mark as negative training data"
                          style={{ background: 'rgba(217,104,88,0.08)', color: '#d96858', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '7px 12px', border: '1px solid rgba(217,104,88,0.2)', cursor: busy ? 'not-allowed' : 'pointer' }}
                        >
                          ✗ reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleToggle(u.id)}
                      disabled={busy}
                      title={u.isActive ? 'Pause crawling' : 'Resume crawling'}
                      style={{ background: 'transparent', color: u.isActive ? 'rgba(237,229,207,0.35)' : 'rgba(143,200,50,0.5)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '7px 12px', border: '1px solid rgba(237,229,207,0.1)', cursor: busy ? 'not-allowed' : 'pointer' }}
                    >
                      {u.isActive ? 'pause' : 'resume'}
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={busy}
                      title="Delete URL"
                      style={{ background: 'transparent', color: 'rgba(217,104,88,0.4)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', padding: '7px 10px', border: '1px solid rgba(217,104,88,0.15)', cursor: busy ? 'not-allowed' : 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
