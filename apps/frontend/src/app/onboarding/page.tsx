'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { photosApi } from '@/lib/api';
import { getUser } from '@/lib/auth';

const MAX_PHOTOS = 10;

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const user = getUser();

  const loadPhotos = useCallback(async () => {
    try {
      const res = await photosApi.list();
      setPhotos(res.data);
    } catch {}
  }, []);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    setError('');
    try {
      await Promise.all(toUpload.map((f) => photosApi.upload(f)));
      await loadPhotos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const count = photos.length;
  const slots = Array.from({ length: MAX_PHOTOS });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d1614', color: '#ede5cf', position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: '60vw', height: '60vw', top: '-15%', right: '-10%', background: 'radial-gradient(ellipse, #1b3422 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', width: '45vw', height: '45vw', bottom: '-5%', left: '-10%', background: 'radial-gradient(ellipse, #3d6b38 0%, transparent 65%)', filter: 'blur(55px)', opacity: 0.65 }} />
        <div style={{ position: 'absolute', width: '30vw', height: '30vw', top: '40%', left: '30%', background: 'radial-gradient(ellipse, #7b6898 0%, transparent 65%)', filter: 'blur(70px)', opacity: 0.2 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)', backgroundSize: '4px 4px', opacity: 0.1 }} />
      </div>

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 48px', borderBottom: '1px solid rgba(237,229,207,0.06)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '21px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.01em' }}>
            med<span style={{ color: '#8fc832', fontStyle: 'italic' }}>usa</span>
          </span>
        </Link>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(237,229,207,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Skip for now →
        </button>
      </nav>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '760px', margin: '0 auto', padding: '64px 48px 80px' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
          <div style={{ width: '20px', height: '2px', background: '#8fc832' }} />
          <div style={{ width: '20px', height: '2px', background: '#8fc832' }} />
          <div style={{ width: '20px', height: '2px', background: 'rgba(237,229,207,0.15)' }} />
        </div>

        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#8fc832', marginBottom: '14px', opacity: 0.9 }}>
          Step 2 of 3 — Build your profile
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(38px, 5vw, 58px)', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.02em', lineHeight: 0.95, marginBottom: '20px' }}>
          Upload photos<br />
          <em style={{ color: '#8fc832' }}>of yourself.</em>
        </h1>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 300, color: 'rgba(237,229,207,0.55)', lineHeight: 1.75, marginBottom: '12px', maxWidth: '520px' }}>
          Upload <strong style={{ color: 'rgba(237,229,207,0.8)', fontWeight: 500 }}>7–10 photos</strong> for the best results. These are used to build your facial recognition profile so we can find unauthorized uses of your image.
        </p>

        {/* Key instruction callout */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'rgba(143,200,50,0.06)', border: '1px solid rgba(143,200,50,0.2)', padding: '16px 20px', marginBottom: '40px', maxWidth: '560px' }}>
          <span style={{ color: '#8fc832', fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>◆</span>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8fc832', marginBottom: '6px' }}>
              Important
            </p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.6)', lineHeight: 1.7, margin: 0 }}>
              Use photos that are <strong style={{ color: 'rgba(237,229,207,0.85)', fontWeight: 500 }}>already publicly available online</strong> — profile pictures, press photos, social media posts, headshots. These help us recognize your face in the wild.
            </p>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(237,229,207,0.4)' }}>
            {count} / {MAX_PHOTOS} photos uploaded
          </span>
          {count >= 7 && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8fc832' }}>
              ✓ Good to go
            </span>
          )}
          {count > 0 && count < 7 && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', color: '#e89828' }}>
              {7 - count} more recommended
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: '2px', background: 'rgba(237,229,207,0.08)', marginBottom: '24px' }}>
          <div style={{ height: '100%', background: count >= 7 ? '#8fc832' : '#e89828', width: `${(count / MAX_PHOTOS) * 100}%`, transition: 'width 0.4s ease' }} />
        </div>

        {/* Photo grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '32px' }}>
          {slots.map((_, i) => {
            const photo = photos[i];
            return (
              <div
                key={i}
                onClick={() => !photo && !uploading && count < MAX_PHOTOS && fileInputRef.current?.click()}
                style={{
                  aspectRatio: '1',
                  background: photo ? 'rgba(27,52,34,0.7)' : 'rgba(237,229,207,0.03)',
                  border: photo ? '1px solid rgba(143,200,50,0.2)' : '1px dashed rgba(237,229,207,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: photo ? 'default' : (count < MAX_PHOTOS ? 'pointer' : 'default'),
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => { if (!photo && count < MAX_PHOTOS) (e.currentTarget.style.borderColor = 'rgba(143,200,50,0.4)'); }}
                onMouseLeave={(e) => { if (!photo) (e.currentTarget.style.borderColor = 'rgba(237,229,207,0.1)'); }}
              >
                {photo ? (
                  <>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', letterSpacing: '0.1em', color: 'rgba(237,229,207,0.3)', textAlign: 'center', padding: '4px' }}>
                        {photo.originalName?.split('.')[0]?.slice(0, 10) || 'photo'}
                      </span>
                    </div>
                    <div style={{ position: 'absolute', top: '6px', right: '6px', width: '16px', height: '16px', background: '#8fc832', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '8px', color: '#0d1614', lineHeight: 1 }}>✓</span>
                    </div>
                  </>
                ) : (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '16px', color: 'rgba(237,229,207,0.12)' }}>+</span>
                )}
              </div>
            );
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={handleUpload}
        />

        {error && (
          <div style={{ background: 'rgba(217,104,88,0.12)', border: '1px solid rgba(217,104,88,0.25)', color: '#d96858', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', padding: '12px 14px', marginBottom: '24px', letterSpacing: '0.04em' }}>
            {error}
          </div>
        )}

        {/* Upload + proceed actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {count < MAX_PHOTOS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ background: 'transparent', color: 'rgba(237,229,207,0.6)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '12px 22px', border: '1px solid rgba(237,229,207,0.15)', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1 }}
            >
              {uploading ? 'Uploading...' : count === 0 ? 'Upload photos' : 'Upload more'}
            </button>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            disabled={uploading}
            style={{ background: count >= 1 ? '#8fc832' : 'rgba(143,200,50,0.25)', color: count >= 1 ? '#0d1614' : 'rgba(13,22,20,0.6)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: '12px 24px', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1 }}
          >
            {count === 0 ? 'Skip for now →' : count < 7 ? 'Continue anyway →' : 'Go to dashboard →'}
          </button>
        </div>

        {count === 0 && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(237,229,207,0.22)', marginTop: '16px' }}>
            You can always upload photos later from your dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
