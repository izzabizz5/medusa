'use client';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { matchesApi } from '@/lib/api';
import { CheckCircle, XCircle, ExternalLink, AlertTriangle } from 'lucide-react';

const CONFIDENCE_LABEL = (score: number) => {
  if (score >= 0.55) return { label: 'High confidence', color: 'text-red-600 bg-red-50' };
  return { label: 'Possible match', color: 'text-yellow-700 bg-yellow-50' };
};

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
    try {
      await matchesApi.confirm(id);
      await loadMatches();
    } catch {} finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await matchesApi.reject(id);
      await loadMatches();
    } catch {} finally { setActionLoading(null); }
  };

  const handleTakedown = async (matchId: string, type: 'platform' | 'dmca') => {
    setActionLoading(matchId);
    try {
      await matchesApi.requestTakedown(matchId, type);
      setTakedownModal(null);
      await loadMatches();
    } catch {} finally { setActionLoading(null); }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Matches</h1>

      <div className="flex gap-2 mb-6">
        {['pending_review', 'confirmed', 'rejected', 'takedown_requested'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === s ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No {filter.replace(/_/g, ' ')} matches</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const conf = CONFIDENCE_LABEL(match.similarityScore);
            return (
              <div key={match.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start gap-4">
                  {/* Side by side images */}
                  <div className="flex gap-3">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                        {match.refImageUrl && (
                          <img src={match.refImageUrl} alt="Your photo" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Your photo</p>
                    </div>
                    <div className="flex items-center text-gray-300 text-lg">→</div>
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                        {match.foundImageUrl && (
                          <img src={match.foundImageUrl} alt="Found online" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Found online</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${conf.color}`}>
                        {conf.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {(match.similarityScore * 100).toFixed(1)}% similarity
                      </span>
                    </div>

                    {match.foundImage?.pageUrl && (
                      <a href={match.foundImage.pageUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary-600 hover:underline mb-3 truncate max-w-xs">
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        {match.foundImage.pageUrl}
                      </a>
                    )}

                    <p className="text-xs text-gray-400">Found {new Date(match.createdAt).toLocaleDateString()}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {match.status === 'pending_review' && (
                      <>
                        <div className="text-xs text-gray-500 font-medium mb-1">Is this you?</div>
                        <button onClick={() => handleConfirm(match.id)}
                          disabled={actionLoading === match.id}
                          className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Yes, it's me
                        </button>
                        <button onClick={() => handleReject(match.id)}
                          disabled={actionLoading === match.id}
                          className="flex items-center gap-1.5 bg-white border text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
                          <XCircle className="w-3.5 h-3.5" />
                          Not me
                        </button>
                      </>
                    )}

                    {match.status === 'confirmed' && (
                      <button onClick={() => setTakedownModal({ matchId: match.id })}
                        className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700">
                        Request takedown
                      </button>
                    )}

                    {match.status === 'takedown_requested' && (
                      <span className="text-xs text-primary-600 font-medium">Takedown requested</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Takedown type modal */}
      {takedownModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-bold text-lg mb-2">Request takedown</h2>
            <p className="text-sm text-gray-600 mb-5">
              Choose the type of takedown. Both require admin review before we file anything.
            </p>
            <div className="space-y-3">
              <button onClick={() => handleTakedown(takedownModal.matchId, 'platform')}
                disabled={!!actionLoading}
                className="w-full border rounded-xl p-4 text-left hover:bg-gray-50 disabled:opacity-50">
                <div className="font-medium text-sm">Platform report</div>
                <div className="text-xs text-gray-500 mt-0.5">Report directly to the platform (Reddit, Pinterest, etc.)</div>
              </button>
              <button onClick={() => handleTakedown(takedownModal.matchId, 'dmca')}
                disabled={!!actionLoading}
                className="w-full border rounded-xl p-4 text-left hover:bg-gray-50 disabled:opacity-50">
                <div className="font-medium text-sm">DMCA notice</div>
                <div className="text-xs text-gray-500 mt-0.5">Send a formal DMCA takedown to the site operator</div>
              </button>
            </div>
            <button onClick={() => setTakedownModal(null)}
              className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
