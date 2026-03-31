'use client';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { takedownsApi } from '@/lib/api';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';

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
    try {
      await takedownsApi.approve(id, notes[id]);
      await load();
    } catch {} finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await takedownsApi.reject(id, notes[id]);
      await load();
    } catch {} finally { setActionLoading(null); }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-2">Admin — Takedown Queue</h1>
      <p className="text-sm text-gray-500 mb-6">Review and approve takedown requests before they are filed.</p>

      <div className="flex gap-2 mb-6">
        {['pending_admin_review', 'approved', 'filed', 'rejected'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === s ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600'}`}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : takedowns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No {filter.replace(/_/g, ' ')} requests</div>
      ) : (
        <div className="space-y-4">
          {takedowns.map((td) => (
            <div key={td.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium capitalize">{td.type} takedown</div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{td.user?.email}</span>
                  <span className="text-xs text-gray-400">{new Date(td.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Match preview */}
              {td.match?.foundImage && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 mb-1">Found image</p>
                    {td.match.foundImage.pageUrl && (
                      <a href={td.match.foundImage.pageUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary-600 hover:underline truncate">
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        {td.match.foundImage.pageUrl}
                      </a>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Similarity: {(td.match.similarityScore * 100)?.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              {td.status === 'pending_admin_review' && (
                <div className="space-y-3">
                  <textarea
                    placeholder="Optional notes for the user..."
                    value={notes[td.id] || ''}
                    onChange={(e) => setNotes({ ...notes, [td.id]: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(td.id)} disabled={actionLoading === td.id}
                      className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                      <CheckCircle className="w-4 h-4" />
                      Approve & file
                    </button>
                    <button onClick={() => handleReject(td.id)} disabled={actionLoading === td.id}
                      className="flex items-center gap-1.5 bg-white border text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                      <XCircle className="w-4 h-4" />
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
