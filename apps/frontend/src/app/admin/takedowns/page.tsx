'use client';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { takedownsApi } from '@/lib/api';

const FILTERS = ['pending_admin_review', 'approved', 'filed', 'rejected'];

export default function AdminTakedownsPage() {
  const [takedowns, setTakedowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_admin_review');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await takedownsApi.listAll(filter);
      setTakedowns(res.data);
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try { await takedownsApi.approve(id, notes[id]); await load(); } catch {} finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try { await takedownsApi.reject(id, notes[id]); await load(); } catch {} finally { setActionLoading(null); }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d96858', marginBottom: '10px', opacity: 0.8 }}>
          Admin
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '42px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
          Takedown queue.
        </h1>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.4)', marginTop: '10px' }}>
          Review and approve requests before they are filed.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid rgba(237,229,207,0.07)', marginBottom: '32px', marginTop: '32px' }}>
        {FILTERS.map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
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
              }}
            >
              {s.replace(/_/g, ' ')}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(237,229,207,0.25)' }}>
          Loading...
        </div>
      ) : takedowns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '56px', opacity: 0.12, lineHeight: 1, marginBottom: '16px' }}>◇</div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)' }}>
            No {filter.replace(/_/g, ' ')} requests
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(237,229,207,0.07)' }}>
          {takedowns.map((td) => (
            <div key={td.id} style={{ background: '#0d1614', padding: '24px 28px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', fontWeight: 600, color: '#ede5cf', textTransform: 'capitalize' }}>
                  {td.type} takedown
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {td.user?.email && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.3)', letterSpacing: '0.08em' }}>
                      {td.user.email}
                    </span>
                  )}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.25)', letterSpacing: '0.08em' }}>
                    {new Date(td.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Match info */}
              {td.match?.foundImage && (
                <div style={{ background: 'rgba(237,229,207,0.03)', border: '1px solid rgba(237,229,207,0.07)', padding: '14px 18px', marginBottom: '20px' }}>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)', marginBottom: '8px' }}>
                    Found image
                  </p>
                  {td.match.foundImage.pageUrl && (
                    <a
                      href={td.match.foundImage.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#8fc832', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px', letterSpacing: '0.05em' }}
                    >
                      ↗ {td.match.foundImage.pageUrl}
                    </a>
                  )}
                  {td.match.similarityScore != null && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.28)', letterSpacing: '0.08em' }}>
                      {(td.match.similarityScore * 100).toFixed(1)}% similarity
                    </span>
                  )}
                </div>
              )}

              {/* Admin action area */}
              {td.status === 'pending_admin_review' && (
                <div>
                  <textarea
                    placeholder="Optional note for the user..."
                    value={notes[td.id] || ''}
                    onChange={(e) => setNotes({ ...notes, [td.id]: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(13,22,20,0.7)',
                      border: '1px solid rgba(237,229,207,0.1)',
                      color: '#ede5cf',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '13px',
                      padding: '12px 14px',
                      resize: 'none',
                      height: '72px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      marginBottom: '14px',
                      display: 'block',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(143,200,50,0.4)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(237,229,207,0.1)')}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleApprove(td.id)}
                      disabled={actionLoading === td.id}
                      style={{ background: '#8fc832', color: '#0d1614', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: '11px 20px', border: 'none', cursor: actionLoading === td.id ? 'not-allowed' : 'pointer', opacity: actionLoading === td.id ? 0.5 : 1 }}
                    >
                      Approve & file
                    </button>
                    <button
                      onClick={() => handleReject(td.id)}
                      disabled={actionLoading === td.id}
                      style={{ background: 'transparent', color: 'rgba(237,229,207,0.45)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '11px 20px', border: '1px solid rgba(237,229,207,0.12)', cursor: actionLoading === td.id ? 'not-allowed' : 'pointer', opacity: actionLoading === td.id ? 0.5 : 1 }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
