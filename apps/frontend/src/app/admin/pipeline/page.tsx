'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminApi } from '@/lib/api';

interface StepState {
  loading: boolean;
  result: string | null;
  error: string | null;
}

const INITIAL: StepState = { loading: false, result: null, error: null };

export default function AdminPipelinePage() {
  const [discover, setDiscover] = useState<StepState>(INITIAL);
  const [crawl, setCrawl] = useState<StepState>(INITIAL);
  const [match, setMatch] = useState<StepState>(INITIAL);

  async function handleDiscover() {
    setDiscover({ loading: true, result: null, error: null });
    try {
      const res = await adminApi.triggerDiscover();
      const { queued, queries } = res.data;
      setDiscover({ loading: false, result: `Queued ${queued} search queries from profiles`, error: null });
    } catch (err: any) {
      setDiscover({ loading: false, result: null, error: err.response?.data?.message || 'Failed' });
    }
  }

  async function handleCrawl() {
    setCrawl({ loading: true, result: null, error: null });
    try {
      const res = await adminApi.triggerCrawl();
      setCrawl({ loading: false, result: `Queued crawl jobs for ${res.data.queued} active URLs`, error: null });
    } catch (err: any) {
      setCrawl({ loading: false, result: null, error: err.response?.data?.message || 'Failed' });
    }
  }

  async function handleMatch() {
    setMatch({ loading: true, result: null, error: null });
    try {
      const res = await adminApi.triggerMatch();
      setMatch({ loading: false, result: `Match batch queued for ${res.data.batchDate}`, error: null });
    } catch (err: any) {
      setMatch({ loading: false, result: null, error: err.response?.data?.message || 'Failed' });
    }
  }

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d96858', marginBottom: '10px', opacity: 0.8 }}>
          Admin
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '42px', fontWeight: 700, color: '#ede5cf', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
          Pipeline.
        </h1>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.4)', marginTop: '10px' }}>
          Manually trigger each stage of the detection pipeline.
        </p>
      </div>

      {/* Pipeline diagram */}
      <div style={{ background: 'rgba(27,52,34,0.25)', border: '1px solid rgba(237,229,207,0.08)', padding: '20px 24px', marginTop: '32px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { label: 'Discover', desc: 'keyword search' },
            { label: 'Crawl URLs', desc: 'find images' },
            { label: 'Scan images', desc: 'extract faces' },
            { label: 'Match', desc: 'compare embeddings' },
          ].map((step, i) => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ background: 'rgba(143,200,50,0.08)', border: '1px solid rgba(143,200,50,0.2)', padding: '10px 16px' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8fc832', opacity: 0.7 }}>
                  {i + 1}.
                </span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 500, color: '#ede5cf', marginLeft: '8px' }}>
                  {step.label}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'rgba(237,229,207,0.3)', marginLeft: '8px', letterSpacing: '0.06em' }}>
                  {step.desc}
                </span>
              </div>
              {i < 3 && (
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px', color: 'rgba(143,200,50,0.3)' }}>→</span>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(237,229,207,0.2)', marginTop: '14px' }}>
          Discovery searches for profile names + sport. Found URLs appear in URL Ranking for review. Scanning is automatic.
        </p>
      </div>

      {/* Step cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(237,229,207,0.07)' }}>
        {/* Discover */}
        <div style={{ background: '#0d1614', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', color: '#8fc832', opacity: 0.7 }}>01</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 700, color: '#ede5cf', lineHeight: 1 }}>
                  Keyword discovery
                </span>
              </div>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.4)', lineHeight: 1.5, maxWidth: '500px' }}>
                Searches the web for each profile using their name + sport as keywords. Discovered URLs land in the <strong style={{ color: 'rgba(237,229,207,0.55)', fontWeight: 500 }}>URL Ranking → Pending</strong> tab where you approve or reject them.
              </p>
              {discover.result && (
                <div style={{ background: 'rgba(143,200,50,0.08)', border: '1px solid rgba(143,200,50,0.2)', color: '#8fc832', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', padding: '10px 14px', marginTop: '16px', letterSpacing: '0.04em' }}>
                  {discover.result}
                </div>
              )}
              {discover.error && (
                <div style={{ background: 'rgba(217,104,88,0.1)', border: '1px solid rgba(217,104,88,0.2)', color: '#d96858', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', padding: '10px 14px', marginTop: '16px', letterSpacing: '0.04em' }}>
                  {discover.error}
                </div>
              )}
            </div>
            <button
              onClick={handleDiscover}
              disabled={discover.loading}
              style={{ background: '#e89828', color: '#0d1614', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: '12px 22px', border: 'none', cursor: discover.loading ? 'not-allowed' : 'pointer', opacity: discover.loading ? 0.6 : 1, flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              {discover.loading ? 'Queuing...' : '▶ Discover URLs'}
            </button>
          </div>
        </div>

        {/* Crawl */}
        <div style={{ background: '#0d1614', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', color: '#8fc832', opacity: 0.7 }}>02</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 700, color: '#ede5cf', lineHeight: 1 }}>
                  Crawl target URLs
                </span>
              </div>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.4)', lineHeight: 1.5, maxWidth: '500px' }}>
                Queues a crawl job for every active target URL. The crawling service visits each page, finds images, downloads them, and queues each for face scanning.
              </p>
              {crawl.result && (
                <div style={{ background: 'rgba(143,200,50,0.08)', border: '1px solid rgba(143,200,50,0.2)', color: '#8fc832', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', padding: '10px 14px', marginTop: '16px', letterSpacing: '0.04em' }}>
                  {crawl.result}
                </div>
              )}
              {crawl.error && (
                <div style={{ background: 'rgba(217,104,88,0.1)', border: '1px solid rgba(217,104,88,0.2)', color: '#d96858', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', padding: '10px 14px', marginTop: '16px', letterSpacing: '0.04em' }}>
                  {crawl.error}
                </div>
              )}
            </div>
            <button
              onClick={handleCrawl}
              disabled={crawl.loading}
              style={{ background: '#8fc832', color: '#0d1614', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: '12px 22px', border: 'none', cursor: crawl.loading ? 'not-allowed' : 'pointer', opacity: crawl.loading ? 0.6 : 1, flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              {crawl.loading ? 'Queuing...' : '▶ Run crawl'}
            </button>
          </div>
        </div>

        {/* Scan info */}
        <div style={{ background: '#0d1614', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', color: '#8fc832', opacity: 0.7 }}>03</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 700, color: '#ede5cf', lineHeight: 1 }}>
              Scan for faces
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(143,200,50,0.5)', background: 'rgba(143,200,50,0.08)', padding: '3px 8px', border: '1px solid rgba(143,200,50,0.15)' }}>
              automatic
            </span>
          </div>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.4)', lineHeight: 1.5, maxWidth: '500px' }}>
            Happens automatically — the scanning service picks up images from the scan queue and runs InsightFace to extract face embeddings. No manual trigger needed.
          </p>
        </div>

        {/* Match */}
        <div style={{ background: '#0d1614', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', color: '#8fc832', opacity: 0.7 }}>04</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 700, color: '#ede5cf', lineHeight: 1 }}>
                  Match against profiles
                </span>
              </div>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 300, color: 'rgba(237,229,207,0.4)', lineHeight: 1.5, maxWidth: '500px' }}>
                Compares every found image embedding against every reference photo embedding using cosine similarity. Creates match records for any hits above the threshold.
              </p>
              {match.result && (
                <div style={{ background: 'rgba(143,200,50,0.08)', border: '1px solid rgba(143,200,50,0.2)', color: '#8fc832', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', padding: '10px 14px', marginTop: '16px', letterSpacing: '0.04em' }}>
                  {match.result}
                </div>
              )}
              {match.error && (
                <div style={{ background: 'rgba(217,104,88,0.1)', border: '1px solid rgba(217,104,88,0.2)', color: '#d96858', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', padding: '10px 14px', marginTop: '16px', letterSpacing: '0.04em' }}>
                  {match.error}
                </div>
              )}
            </div>
            <button
              onClick={handleMatch}
              disabled={match.loading}
              style={{ background: '#8fc832', color: '#0d1614', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500, padding: '12px 22px', border: 'none', cursor: match.loading ? 'not-allowed' : 'pointer', opacity: match.loading ? 0.6 : 1, flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              {match.loading ? 'Queuing...' : '▶ Run match'}
            </button>
          </div>
        </div>
      </div>

      {/* Queue dashboard link */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <a
          href="http://localhost:4000/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8fc832', textDecoration: 'none', opacity: 0.7 }}
        >
          ↗ open bull board queue dashboard
        </a>
      </div>
    </DashboardLayout>
  );
}
