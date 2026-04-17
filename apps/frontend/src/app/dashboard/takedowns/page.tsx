'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { takedownsApi } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_admin_review: { label: 'Pending review',  color: '#e89828' },
  approved:             { label: 'Approved',         color: '#8fc832' },
  rejected:             { label: 'Rejected',         color: '#d96858' },
  filed:                { label: 'Filed',            color: '#b8a8cc' },
  completed:            { label: 'Completed',        color: '#8fc832' },
  failed:               { label: 'Failed',           color: '#d96858' },
};

export default function TakedownsPage() {
  const [takedowns, setTakedowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    takedownsApi.listMine().then((res) => setTakedowns(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '48px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.35)', marginBottom: '10px' }}>
          Removal requests
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '42px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
          Takedowns.
        </h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(237,229,207,0.25)' }}>
          Loading...
        </div>
      ) : takedowns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '56px', opacity: 0.12, lineHeight: 1, marginBottom: '16px' }}>◇</div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)', marginBottom: '8px' }}>
            No takedown requests yet
          </p>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', color: 'rgba(237,229,207,0.25)', fontWeight: 300 }}>
            Confirm a match, then request a takedown to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(237,229,207,0.07)' }}>
          {takedowns.map((td) => {
            const cfg = STATUS_CONFIG[td.status] || STATUS_CONFIG.pending_admin_review;
            return (
              <div key={td.id} style={{ background: '#0d1614', padding: '24px 28px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)' }}>
                      {td.type} takedown
                    </span>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.25)', letterSpacing: '0.08em' }}>
                    {new Date(td.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {td.match?.foundImage?.pageUrl && (
                  <a
                    href={td.match.foundImage.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#8fc832', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '16px', letterSpacing: '0.05em' }}
                  >
                    ↗ {td.match.foundImage.pageUrl}
                  </a>
                )}

                {td.adminNotes && (
                  <div style={{ background: 'rgba(237,229,207,0.04)', border: '1px solid rgba(237,229,207,0.07)', padding: '12px 16px', marginBottom: '16px' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)', marginRight: '10px' }}>
                      Admin note
                    </span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', color: 'rgba(237,229,207,0.5)', fontWeight: 300 }}>
                      {td.adminNotes}
                    </span>
                  </div>
                )}

                {/* Timeline */}
                {td.events?.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(237,229,207,0.07)', paddingTop: '16px' }}>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.25)', marginBottom: '10px' }}>
                      Timeline
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {td.events.map((ev: any) => (
                        <div key={ev.id} style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.22)', letterSpacing: '0.08em', flexShrink: 0 }}>
                            {new Date(ev.createdAt).toLocaleDateString()}
                          </span>
                          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', color: 'rgba(237,229,207,0.45)', fontWeight: 300, textTransform: 'capitalize' }}>
                            {ev.eventType.replace(/_/g, ' ')}
                            {ev.notes && <span style={{ color: 'rgba(237,229,207,0.28)' }}> — {ev.notes}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
