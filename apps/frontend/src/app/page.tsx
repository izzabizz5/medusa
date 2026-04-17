'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getUser, AuthUser } from '@/lib/auth';

export default function HomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => { setUser(getUser()); }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden', backgroundColor: '#0d1614', color: '#ede5cf' }}>

      {/* ── BACKGROUND: Flower gradient blobs + bitmap dither ────────── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        {/* Gradient blobs — mimic the organic, blurry flower gradients image */}
        <div style={{ position: 'absolute', width: '75vw', height: '75vw', top: '-25%', right: '-20%', background: 'radial-gradient(ellipse, #1b3422 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', width: '55vw', height: '55vw', top: '5%', left: '-15%', background: 'radial-gradient(ellipse, #3d6b38 0%, transparent 65%)', filter: 'blur(50px)', opacity: 0.85 }} />
        <div style={{ position: 'absolute', width: '45vw', height: '45vw', top: '25%', right: '5%', background: 'radial-gradient(ellipse, #7b6898 0%, transparent 65%)', filter: 'blur(65px)', opacity: 0.5 }} />
        <div style={{ position: 'absolute', width: '40vw', height: '40vw', bottom: '5%', left: '15%', background: 'radial-gradient(ellipse, #8fc832 0%, transparent 65%)', filter: 'blur(55px)', opacity: 0.3 }} />
        <div style={{ position: 'absolute', width: '35vw', height: '35vw', top: '55%', left: '38%', background: 'radial-gradient(ellipse, #d96858 0%, transparent 65%)', filter: 'blur(65px)', opacity: 0.25 }} />
        <div style={{ position: 'absolute', width: '50vw', height: '50vw', bottom: '-10%', right: '-5%', background: 'radial-gradient(ellipse, #b8a8cc 0%, transparent 65%)', filter: 'blur(70px)', opacity: 0.22 }} />
        <div style={{ position: 'absolute', width: '30vw', height: '30vw', top: '68%', left: '-5%', background: 'radial-gradient(ellipse, #e89828 0%, transparent 65%)', filter: 'blur(50px)', opacity: 0.18 }} />
        <div style={{ position: 'absolute', width: '20vw', height: '20vw', top: '40%', left: '60%', background: 'radial-gradient(ellipse, #f0c040 0%, transparent 65%)', filter: 'blur(45px)', opacity: 0.12 }} />

        {/* Bitmap dither layer — dot matrix over gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)',
          backgroundSize: '4px 4px',
          opacity: 0.14,
        }} />
        {/* Second pass offset dither — creates ordered dither look */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '8px 8px',
          backgroundPosition: '4px 4px',
          opacity: 0.1,
        }} />
        {/* Scan line texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
          opacity: 0.6,
        }} />
        {/* Film grain */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.035,
          mixBlendMode: 'overlay',
        }} />
      </div>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav style={{ position: 'relative', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 48px' }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '21px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          med<span style={{ color: '#8fc832', fontStyle: 'italic' }}>usa</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          {user ? (
            <>
              <Link href="/dashboard" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.45)', textDecoration: 'none' }}>
                Dashboard
              </Link>
              <Link href="/dashboard" title={user.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', background: '#8fc832', textDecoration: 'none', flexShrink: 0 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 700, color: '#0d1614', letterSpacing: 0, lineHeight: 1 }}>
                  {(user.fullName || user.email).charAt(0).toUpperCase()}
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.45)', textDecoration: 'none', transition: 'color 0.15s' }}>
                Log in
              </Link>
              <Link href="/auth/register" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0d1614', background: '#8fc832', padding: '10px 20px', textDecoration: 'none', display: 'inline-block' }}>
                Get started →
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 10, padding: '48px 48px 80px', overflow: 'hidden' }}>

        {/* Organic blob shapes cutting through the headline (Mental Health Coalition style) */}
        <div style={{ position: 'absolute', width: '38vw', height: '14vw', top: '10vw', left: '12vw', background: '#d96858', borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%', opacity: 0.72, filter: 'blur(3px)', zIndex: 2, mixBlendMode: 'screen', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '24vw', height: '11vw', top: '21vw', left: '30vw', background: '#8fc832', borderRadius: '60% 40% 30% 70% / 50% 60% 40% 50%', opacity: 0.55, filter: 'blur(2px)', zIndex: 2, mixBlendMode: 'screen', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '20vw', height: '10vw', top: '33vw', left: '8vw', background: '#b8a8cc', borderRadius: '50% 50% 40% 60% / 60% 40% 60% 40%', opacity: 0.5, filter: 'blur(3px)', zIndex: 2, mixBlendMode: 'screen', pointerEvents: 'none' }} />

        {/* Right-column descriptor text (floats independently — NASA style) */}
        <div style={{ position: 'absolute', right: '48px', top: '60px', width: '220px', zIndex: 15 }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#8fc832', marginBottom: '10px', opacity: 0.9 }}>Image protection</p>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.55)', lineHeight: 1.75 }}>
            Medusa scans the web for unauthorized use of your photos — DMCA notices and platform takedowns on your behalf, automatically.
          </p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.2)', marginTop: '20px' }}>
            Since 2025
          </p>
        </div>

        {/* Main headline — massive, stacked, bleeding (NASA style) */}
        <div style={{ position: 'relative', zIndex: 3 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, lineHeight: 0.88, letterSpacing: '-0.03em', margin: 0 }}>
            <div style={{ fontSize: 'clamp(72px, 14.5vw, 196px)', color: '#ede5cf' }}>YOUR</div>
            <div style={{ fontSize: 'clamp(72px, 14.5vw, 196px)', fontStyle: 'italic', color: '#ddb8b8', marginLeft: '3.5vw' }}>IMAGE.</div>
            <div style={{ fontSize: 'clamp(72px, 14.5vw, 196px)', color: '#ede5cf', marginLeft: '1vw' }}>YOUR</div>
            <div style={{ fontSize: 'clamp(72px, 14.5vw, 196px)', fontStyle: 'italic', color: '#8fc832' }}>CONTROL.</div>
          </h1>
        </div>

        {/* CTA row */}
        <div style={{ marginTop: '52px', display: 'flex', alignItems: 'center', gap: '28px', position: 'relative', zIndex: 5 }}>
          <Link href="/auth/register" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0d1614', background: '#8fc832', padding: '14px 30px', textDecoration: 'none', display: 'inline-block', fontWeight: 500 }}>
            Protect my photos →
          </Link>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'rgba(237,229,207,0.3)', letterSpacing: '0.15em' }}>
            Free to start. No credit card.
          </span>
        </div>
      </section>

      {/* ── TICKER STRIP ─────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', padding: '13px 0' }}>
        <div style={{ display: 'flex', gap: '64px', animation: 'ticker 28s linear infinite', whiteSpace: 'nowrap', width: 'max-content' }}>
          {[
            { text: 'Upload & Protect', color: '#ede5cf' },
            { text: '◆', color: '#8fc832' },
            { text: 'Daily Scanning', color: '#b8a8cc' },
            { text: '◆', color: '#d96858' },
            { text: 'You Verify', color: '#ede5cf' },
            { text: '◆', color: '#e89828' },
            { text: 'Automated Takedowns', color: '#8fc832' },
            { text: '◆', color: '#b8a8cc' },
            { text: 'DMCA Notices', color: '#ede5cf' },
            { text: '◆', color: '#8fc832' },
            { text: 'Upload & Protect', color: '#ede5cf' },
            { text: '◆', color: '#8fc832' },
            { text: 'Daily Scanning', color: '#b8a8cc' },
            { text: '◆', color: '#d96858' },
            { text: 'You Verify', color: '#ede5cf' },
            { text: '◆', color: '#e89828' },
            { text: 'Automated Takedowns', color: '#8fc832' },
            { text: '◆', color: '#b8a8cc' },
            { text: 'DMCA Notices', color: '#ede5cf' },
            { text: '◆', color: '#8fc832' },
          ].map((item, i) => (
            <span key={i} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: item.color, opacity: item.text === '◆' ? 0.9 : 0.55 }}>
              {item.text}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {[
          { val: '10k+', label: 'URLs scanned daily', color: '#8fc832' },
          { val: '< 24h', label: 'Time to first match', color: '#b8a8cc' },
          { val: '100%', label: 'Creator-approved actions', color: '#e89828' },
        ].map(({ val, label, color }, i) => (
          <div key={i} style={{ padding: '44px 48px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(36px, 4.5vw, 60px)', fontWeight: 700, color, lineHeight: 1, marginBottom: '10px' }}>{val}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.35)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 10, padding: '100px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '80px', maxWidth: '1100px' }}>

          {/* Left: section heading */}
          <div style={{ paddingTop: '4px' }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#b8a8cc', marginBottom: '20px', opacity: 0.8 }}>Process</p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(44px, 4.8vw, 68px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: '#ede5cf' }}>
              How it<br/><em style={{ color: '#8fc832' }}>works.</em>
            </h2>
            {/* Decorative vertical line with color stops */}
            <div style={{ marginTop: '48px', width: '2px', height: '160px', background: 'linear-gradient(180deg, #8fc832 0%, #b8a8cc 40%, #d96858 70%, #e89828 100%)', opacity: 0.5 }} />
          </div>

          {/* Right: editorial table of steps */}
          <div>
            {[
              { n: '01', title: 'Upload & protect', desc: 'Upload your reference photos once. We extract a unique signature from your face and image metadata.', color: '#8fc832', accent: '#b8e040' },
              { n: '02', title: 'Daily scanning', desc: 'We scan thousands of URLs daily using facial recognition and perceptual hashing to find matches.', color: '#b8a8cc', accent: '#7b6898' },
              { n: '03', title: 'You verify', desc: 'Review every match. Confirm it\'s actually yours before any action is taken on your behalf.', color: '#e89828', accent: '#f0c040' },
              { n: '04', title: 'Automated takedowns', desc: 'We file DMCA notices and platform takedowns after your approval — no lawyers required.', color: '#d96858', accent: '#ddb8b8' },
            ].map(({ n, title, desc, color, accent }) => (
              <div key={n} style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: '20px', padding: '30px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'start' }}>
                <div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color, letterSpacing: '0.1em', display: 'block', marginBottom: '8px', opacity: 0.95 }}>{n}</span>
                  {/* Color chip */}
                  <div style={{ width: '20px', height: '3px', background: `linear-gradient(90deg, ${color}, ${accent})`, opacity: 0.8 }} />
                </div>
                <div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 600, color: '#ede5cf', marginBottom: '8px', letterSpacing: '0.01em' }}>{title}</h3>
                  <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(221,184,184,0.65)', lineHeight: 1.75 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA BLOCK ───────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 10, padding: '110px 48px 120px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Subtle bloom behind CTA text */}
        <div style={{ position: 'absolute', width: '60vw', height: '40vw', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(ellipse, #1b3422 0%, transparent 70%)', filter: 'blur(60px)', opacity: 0.7, pointerEvents: 'none' }} />
        <p style={{ position: 'relative', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#b8a8cc', marginBottom: '24px', opacity: 0.8 }}>Your work. Your rights.</p>
        <h2 style={{ position: 'relative', fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(44px, 7vw, 92px)', fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.025em', color: '#ede5cf', marginBottom: '44px' }}>
          Start protecting<br/><em style={{ color: '#8fc832' }}>your work.</em>
        </h2>
        <Link href="/auth/register" style={{ position: 'relative', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0d1614', background: '#8fc832', padding: '16px 36px', textDecoration: 'none', display: 'inline-block' }}>
          Get started for free →
        </Link>
        <p style={{ position: 'relative', marginTop: '18px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'rgba(237,229,207,0.2)', letterSpacing: '0.15em' }}>
          Free plan available. No credit card required.
        </p>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{ position: 'relative', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '19px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.01em' }}>
          med<span style={{ color: '#8fc832', fontStyle: 'italic' }}>usa</span>
        </span>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          {['Privacy', 'Terms', 'Contact'].map(item => (
            <span key={item} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.25)', cursor: 'pointer' }}>{item}</span>
          ))}
        </div>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.2)' }}>© 2025 Medusa</span>
      </footer>

      <style jsx>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
