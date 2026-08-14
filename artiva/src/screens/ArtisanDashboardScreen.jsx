import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { OfflineBanner } from '../components/OfflineBanner';
import { Lock, DollarSign, Award, Star, ShieldCheck, Power, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';

export function ArtisanDashboardScreen({ artisanId }) {
  const { navigateTo, currentUser, showToast } = useApp();
  const targetUid = artisanId || currentUser?.uid || 'artisan_001';

  const [stats, setStats] = useState(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, [targetUid]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getArtisanDashboard(targetUid);
      setStats(data);

      const allJobs = JSON.parse(localStorage.getItem('artiva_jobs') || '[]');
      setJobs(allJobs);

      setLoading(false);
    } catch (err) {
      setLoading(false);
      showToast('Error loading artisan dashboard: ' + err.message, 'error');
    }
  };

  const handleToggleAvailability = async () => {
    const newStatus = !available;
    setAvailable(newStatus);
    try {
      await ApiService.updateAvailability(targetUid, newStatus);
      showToast(newStatus ? 'You are now ONLINE & taking jobs!' : 'Status set to Offline', newStatus ? 'success' : 'info');
    } catch (err) {
      setAvailable(!newStatus);
      showToast('Failed to update availability', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] pb-12">
      <Header title="Artisan Dashboard" />
      <OfflineBanner onRetry={loadDashboard} />

      <main className="max-w-md mx-auto px-4 py-4 space-y-5 animate-fade-in">
        
        {/* Status Card & Availability Toggle */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-[#0E3B40] text-base font-['Outfit']">
                {currentUser?.first_name || 'Sunday'} {currentUser?.last_name || 'Okafor'}
              </h2>
              <span className="p-0.5 bg-[#16858F] text-white rounded-full" title="Verified Artisan">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            </div>

            <p className="text-xs text-[#16858F] font-semibold">Plumbing Specialist • Life Camp</p>
          </div>

          {/* Availability Toggle Button */}
          <button
            onClick={handleToggleAvailability}
            className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all btn-press shadow-sm ${
              available
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${available ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>{available ? 'Available' : 'Offline'}</span>
          </button>
        </div>

        {/* Financial Summary Metrics Grid */}
        {loading ? (
          <SkeletonLoader type="metrics" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Held in Escrow */}
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 shadow-sm space-y-1">
              <div className="flex items-center gap-1 text-xs font-bold text-amber-900 uppercase">
                <Lock className="w-3.5 h-3.5" />
                <span>Held in Escrow</span>
              </div>
              <p className="text-xl font-extrabold text-amber-950 font-['Outfit']">
                ₦{(stats?.held_total || 5000).toLocaleString()}
              </p>
              <p className="text-[10px] text-amber-800 font-medium">Releases on client confirmation</p>
            </div>

            {/* Released Earnings */}
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200/80 shadow-sm space-y-1">
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-900 uppercase">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Released Total</span>
              </div>
              <p className="text-xl font-extrabold text-emerald-950 font-['Outfit']">
                ₦{(stats?.released_total || 45000).toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-800 font-medium">Direct bank payout</p>
            </div>

            {/* Completed Jobs */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <div className="flex items-center gap-1 text-xs font-bold text-[#0E3B40] uppercase">
                <Award className="w-3.5 h-3.5 text-[#16858F]" />
                <span>Jobs Done</span>
              </div>
              <p className="text-xl font-extrabold text-[#0E3B40] font-['Outfit']">
                {stats?.completed_jobs || 48}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">Verified completed</p>
            </div>

            {/* Reputation Score */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <div className="flex items-center gap-1 text-xs font-bold text-[#0E3B40] uppercase">
                <Star className="w-3.5 h-3.5 fill-[#FAB804] text-[#D59F0F]" />
                <span>Rating</span>
              </div>
              <p className="text-xl font-extrabold text-[#0E3B40] font-['Outfit']">
                {stats?.reputation_score || 4.9} ★
              </p>
              <p className="text-[10px] text-slate-400 font-medium">Client satisfaction score</p>
            </div>
          </div>
        )}

        {/* Incoming Active Jobs / Inbox */}
        <div className="space-y-3">
          <h3 className="font-bold text-[#0E3B40] text-sm font-['Outfit']">
            Active Client Matches & Messages
          </h3>

          <div className="space-y-2.5">
            {jobs.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                No active job requests yet. Keep your status Online to receive incoming requests!
              </div>
            ) : (
              jobs.map((j) => (
                <div
                  key={j.job_id}
                  onClick={() => navigateTo('chat', { job: j, matchId: `match_${j.job_id}_artisan_001` })}
                  className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 cursor-pointer hover:border-[#16858F] transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#0E3B40]">{j.trade} Request</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                        ₦{(j.budget || 5000).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">{j.description}</p>
                    <p className="text-[11px] text-[#16858F] font-semibold mt-0.5">📍 {j.location}</p>
                  </div>

                  <button className="px-3 py-2 bg-[#16858F] text-white text-xs font-bold rounded-xl flex items-center gap-1 flex-shrink-0 btn-press">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
