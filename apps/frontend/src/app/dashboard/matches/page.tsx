'use client';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { matchesApi } from '@/lib/api';

const FILTERS = ['pending_review', 'confirmed', 'rejected', 'takedown_requested'];

const CONFIDENCE = (score: number) =>
  score >= 0.55
    ? { label: 'High confidence', color: '#d96858' }
    : { label: 'Possible match', color: '#e89828' };

export default function MatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_review');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [takedownModal, setTakedownModal] = useState<{ matchId: string } | null>(null);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await matchesApi.list(filter);
      setMatches(res.data);
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  const handleConfirm = async (id: string) => {
    setActionLoading(id);
    try { await matchesApi.confirm(id); await loadMatches(); } catch {} finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try { await matchesApi.reject(id); await loadMatches(); } catch {} finally { setActionLoading(null); }
  };

  const handleTakedown = async (matchId: string, type: 'platform' | 'dmca') => {
    setActionLoading(matchId);
    try { await matchesApi.requestTakedown(matchId, type); setTakedownModal(null); await loadMatches(); } catch {} finally { setActionLoading(null); }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.35)', marginBottom: '10px' }}>
          Facial recognition results
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '42px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
          Matches.
        </h1>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '32px', borderBottom: '1px solid rgba(237,229,207,0.07)', paddingBottom: '0' }}>
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
      ) : matches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '56px', opacity: 0.12, lineHeight: 1, marginBottom: '16px' }}>◇</div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)' }}>
            No {filter.replace(/_/g, ' ')} matches
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(237,229,207,0.07)' }}>
          {matches.map((match) => {
            const conf = CONFIDENCE(match.similarityScore);
            return (
              <div key={match.id} style={{ background: '#0d1614', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '28px' }}>
                {/* Images */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '72px', height: '72px', background: 'rgba(27,52,34,0.6)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {match.refImageUrl
                        ? <img src={match.refImageUrl} alt="Your photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', color: 'rgba(237,229,207,0.2)' }}>ref</span>
                      }
                    </div>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', letterSpacing: '0.1em', color: 'rgba(237,229,207,0.25)', marginTop: '6px' }}>your photo</p>
                  </div>
                  <span style={{ color: 'rgba(237,229,207,0.2)', fontSize: '18px' }}>→</span>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '72px', height: '72px', background: 'rgba(27,52,34,0.6)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {match.foundImageUrl
                        ? <img src={match.foundImageUrl} alt="Found online" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', color: 'rgba(237,229,207,0.2)' }}>found</span>
                      }
                    </div>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', letterSpacing: '0.1em', color: 'rgba(237,229,207,0.25)', marginTop: '6px' }}>found online</p>
                  </div>
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: conf.color }}>
                      {conf.label}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.3)', letterSpacing: '0.08em' }}>
                      {(match.similarityScore * 100).toFixed(1)}% similarity
                    </span>
                  </div>
                  {match.foundImage?.pageUrl && (
                    <a
                      href={match.foundImage.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#8fc832', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px', marginBottom: '8px', letterSpacing: '0.05em' }}
                    >
                      ↗ {match.foundImage.pageUrl}
                    </a>
                  )}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.22)', letterSpacing: '0.08em' }}>
                    Found {new Date(match.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, alignItems: 'flex-end' }}>
                  {match.status === 'pending_review' && (
                    <>
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)', marginBottom: '4px', textAlign: 'right' }}>
                        Is this you?
                      </p>
                      <button
                        onClick={() => handleConfirm(match.id)}
                        disabled={actionLoading === match.id}
                        style={{ background: '#d96858', color: '#ede5cf', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '9px 16px', border: 'none', cursor: actionLoading === match.id ? 'not-allowed' : 'pointer', opacity: actionLoading === match.id ? 0.5 : 1 }}
                      >
                        Yes, it's me
                      </button>
                      <button
                        onClick={() => handleReject(match.id)}
                        disabled={actionLoading === match.id}
                        style={{ background: 'transparent', color: 'rgba(237,229,207,0.45)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '9px 16px', border: '1px solid rgba(237,229,207,0.12)', cursor: actionLoading === match.id ? 'not-allowed' : 'pointer', opacity: actionLoading === match.id ? 0.5 : 1 }}
                      >
                        Not me
                      </button>
                    </>
                  )}
                  {match.status === 'confirmed' && (
                    <button
                      onClick={() => setTakedownModal({ matchId: match.id })}
                      style={{ background: '#8fc832', color: '#0d1614', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '9px 16px', border: 'none', cursor: 'pointer' }}
                    >
                      Request takedown
                    </button>
                  )}
                  {match.status === 'takedown_requested' && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#b8a8cc' }}>
                      Takedown requested
                    </span>
                  )}
                  {match.status === 'rejected' && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.25)' }}>
                      Dismissed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Takedown modal */}
      {takedownModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,22,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <div style={{ background: '#0d1614', border: '1px solid rgba(237,229,207,0.1)', padding: '40px', maxWidth: '380px', width: '100%' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.01em', marginBottom: '8px', lineHeight: 1 }}>
              Request takedown.
            </h2>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.45)', marginBottom: '28px', lineHeight: 1.65 }}>
              Choose the type of takedown. Both require admin review before we file anything.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(237,229,207,0.07)', marginBottom: '16px' }}>
              <button
                onClick={() => handleTakedown(takedownModal.matchId, 'platform')}
                disabled={!!actionLoading}
                style={{ background: '#0d1614', border: 'none', padding: '20px 22px', textAlign: 'left', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1 }}
              >
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', fontWeight: 600, color: '#ede5cf', marginBottom: '4px' }}>Platform report</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(237,229,207,0.35)' }}>Report directly to Reddit, Pinterest, etc.</div>
              </button>
              <button
                onClick={() => handleTakedown(takedownModal.matchId, 'dmca')}
                disabled={!!actionLoading}
                style={{ background: '#0d1614', border: 'none', padding: '20px 22px', textAlign: 'left', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1 }}
              >
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', fontWeight: 600, color: '#ede5cf', marginBottom: '4px' }}>DMCA notice</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(237,229,207,0.35)' }}>Send a formal notice to the site operator.</div>
              </button>
            </div>
            <button
              onClick={() => setTakedownModal(null)}
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', padding: '8px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
