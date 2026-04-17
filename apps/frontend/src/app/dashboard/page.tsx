'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { matchesApi, photosApi } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ photos: 0, pendingMatches: 0, confirmedMatches: 0, takedowns: 0 });

  useEffect(() => {
    Promise.all([
      photosApi.list(),
      matchesApi.list('pending_review'),
      matchesApi.list('confirmed'),
    ]).then(([photos, pending, confirmed]) => {
      setStats({
        photos: photos.data.length,
        pendingMatches: pending.data.length,
        confirmedMatches: confirmed.data.length,
        takedowns: 0,
      });
    }).catch(() => {});
  }, []);

  const statCards = [
    { label: 'Protected photos', value: stats.photos, color: '#8fc832', desc: 'Reference images uploaded' },
    { label: 'Pending review', value: stats.pendingMatches, color: '#e89828', desc: 'Matches awaiting your decision' },
    { label: 'Confirmed matches', value: stats.confirmedMatches, color: '#d96858', desc: 'Verified unauthorized uses' },
    { label: 'Takedowns filed', value: stats.takedowns, color: '#b8a8cc', desc: 'Active removal requests' },
  ];

  const steps = [
    { n: '01', title: 'Upload photos', desc: 'Add clear, front-facing reference photos. More photos improve accuracy.', color: '#8fc832' },
    { n: '02', title: 'Daily scanning', desc: 'We scan thousands of URLs using facial recognition and perceptual hashing.', color: '#b8a8cc' },
    { n: '03', title: 'You verify', desc: 'Review every match and confirm it is you before any action is taken.', color: '#e89828' },
    { n: '04', title: 'Takedowns', desc: 'Request platform reports or DMCA notices — we file after admin review.', color: '#d96858' },
  ];

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '48px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.35)', marginBottom: '10px' }}>
          Overview
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '42px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
          Your dashboard.
        </h1>
      </div>

      {/* Profile completion nudge */}
      {stats.photos < 7 && (
        <div style={{ background: 'rgba(232,152,40,0.07)', border: '1px solid rgba(232,152,40,0.2)', padding: '20px 24px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#e89828', marginBottom: '6px' }}>
              {stats.photos === 0 ? 'Profile incomplete' : `${stats.photos} / 10 photos — more recommended`}
            </p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.5)', lineHeight: 1.6, margin: 0 }}>
              {stats.photos === 0
                ? 'You haven\'t uploaded any reference photos yet. Upload 7–10 photos to activate face scanning.'
                : 'Upload more photos for better recognition accuracy. 7–10 photos is recommended.'}
            </p>
          </div>
          <Link
            href="/onboarding"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0d1614', background: '#e89828', padding: '10px 18px', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {stats.photos === 0 ? 'Complete profile →' : 'Add more photos →'}
          </Link>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(237,229,207,0.07)', marginBottom: '52px' }}>
        {statCards.map(({ label, value, color, desc }) => (
          <div key={label} style={{ background: '#0d1614', padding: '28px 24px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '44px', fontWeight: 700, color, lineHeight: 1, marginBottom: '8px' }}>
              {value}
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 500, color: '#ede5cf', marginBottom: '4px' }}>
              {label}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.08em', color: 'rgba(237,229,207,0.28)', lineHeight: 1.5 }}>
              {desc}
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.35)', marginBottom: '24px' }}>
          How it works
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(237,229,207,0.07)' }}>
          {steps.map(({ n, title, desc, color }) => (
            <div key={n} style={{ background: '#0d1614', padding: '28px 28px', display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color, letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>{n}</span>
                <div style={{ width: '18px', height: '2px', background: color, opacity: 0.7 }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', fontWeight: 600, color: '#ede5cf', marginBottom: '6px' }}>
                  {title}
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.45)', lineHeight: 1.65 }}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
