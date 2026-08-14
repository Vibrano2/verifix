import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import { ArtisanCard } from '../components/ArtisanCard';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { OfflineBanner } from '../components/OfflineBanner';
import { ShieldCheck, MapPin, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';

export function MatchListScreen({ job }) {
  const { navigateTo, activeJob, showToast } = useApp();
  const targetJob = job || activeJob;

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, [targetJob?.job_id]);

  const fetchMatches = async () => {
    if (!targetJob?.job_id) return;
    setLoading(true);

    try {
      const res = await ApiService.getJobMatches(targetJob.job_id);
      setMatches(res);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      showToast('Failed to fetch matched artisans: ' + err.message, 'error');
    }
  };

  const handleSelectArtisan = (artisan) => {
    // Proceed to Paystack Escrow Checkout Modal
    navigateTo('checkout', { job: targetJob, artisan });
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] pb-12">
      <Header title={`Matched ${targetJob?.trade || 'Artisans'}`} backTo="client_dash" />
      <OfflineBanner onRetry={fetchMatches} />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Job Summary Banner */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#16858F] font-bold">
              <MapPin className="w-3.5 h-3.5" />
              <span>{targetJob?.location || 'Life Camp, Abuja'}</span>
            </div>
            <p className="text-xs font-semibold text-[#0E3B40] mt-0.5 line-clamp-1">
              "{targetJob?.description || 'Trade job request'}"
            </p>
          </div>
          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-extrabold rounded-full flex-shrink-0">
            {targetJob?.urgency || 'Today'}
          </span>
        </div>

        {/* Header section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0E3B40] font-['Outfit']">
              Ranked Verified Matches
            </h2>
            <p className="text-xs text-slate-500">Sorted by proximity in Life Camp & reputation</p>
          </div>

          <button
            onClick={fetchMatches}
            className="p-2 text-slate-500 hover:text-[#16858F] rounded-full hover:bg-slate-100"
            title="Refresh Matches"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Match List Content */}
        {loading ? (
          <SkeletonLoader type="card" count={3} />
        ) : matches.length === 0 ? (
          /* EMPTY STATE SCREEN (Explicit Inclusion) */
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#0E3B40] font-['Outfit']">
                No Verified Artisans Available Right Now
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                We currently don't have an available {targetJob?.trade} artisan within immediate radius in Life Camp.
              </p>
            </div>

            <div className="pt-2 space-y-2 max-w-xs mx-auto">
              <button
                onClick={() => navigateTo('post_job', { initialTrade: targetJob?.trade })}
                className="w-full py-3 bg-[#16858F] text-white text-xs font-bold rounded-xl shadow-sm btn-press"
              >
                Modify Job Details / Expand Radius
              </button>
              <button
                onClick={() => navigateTo('client_dash')}
                className="w-full py-2.5 text-xs text-slate-600 font-semibold hover:underline"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 animate-fade-in">
            {matches.map((artisan, index) => (
              <div key={artisan.uid} className="relative">
                {index === 0 && (
                  <span className="absolute -top-2.5 left-4 z-10 bg-[#FAB804] text-[#0E3B40] text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm border border-[#D59F0F]">
                    Best Match Choice
                  </span>
                )}
                <ArtisanCard
                  artisan={artisan}
                  onSelect={handleSelectArtisan}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
