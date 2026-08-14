import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { ApiService, TradeServicesMap, LifeCampLocations } from '../services/api';
import { ArtisanCard } from '../components/ArtisanCard';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { OfflineBanner } from '../components/OfflineBanner';
import { Search, Plus, MapPin, Wrench, ShieldCheck, Zap, ChevronRight, MessageSquare, CheckCircle, Clock } from 'lucide-react';

export function ClientDashboardScreen() {
  const { navigateTo, currentUser, showToast } = useApp();
  const [selectedTrade, setSelectedTrade] = useState('All');
  const [artisans, setArtisans] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const trades = ['All', ...Object.keys(TradeServicesMap)];

  useEffect(() => {
    loadDashboardData();
  }, [selectedTrade]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const filter = selectedTrade !== 'All' ? { trade: selectedTrade } : {};
      const list = await ApiService.getArtisans(filter);
      setArtisans(list);

      // Load user jobs from localStorage
      const storedJobs = JSON.parse(localStorage.getItem('artiva_jobs') || '[]');
      setActiveJobs(storedJobs);

      setLoading(false);
    } catch (err) {
      setLoading(false);
      showToast('Error loading artisans list: ' + err.message, 'error');
    }
  };

  const handleTradeSelect = (trade) => {
    setSelectedTrade(trade);
  };

  const handleStartPostJob = (trade = 'Plumbing') => {
    navigateTo('post_job', { initialTrade: trade });
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] pb-24">
      <Header />
      <OfflineBanner onRetry={loadDashboardData} />

      <main className="max-w-md mx-auto px-4 py-4 space-y-5 animate-fade-in">
        {/* Welcome Greeting Banner */}
        <div className="bg-primary-gradient text-white p-5 rounded-3xl shadow-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-1 text-xs font-semibold text-[#16D4C6] uppercase tracking-wider mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>Life Camp, Abuja</span>
          </div>

          <h2 className="text-2xl font-extrabold font-['Outfit'] leading-tight">
            Hi, {currentUser?.first_name || 'Client'}! 👋
          </h2>
          <p className="text-xs text-slate-200 mt-1 leading-relaxed">
            Connect with NIN-verified local artisans with protected escrow payments.
          </p>

          <button
            onClick={() => handleStartPostJob('Plumbing')}
            className="mt-4 px-4 py-3 bg-[#FAB804] hover:bg-[#FDC80B] text-[#0E3B40] font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-gold-glow transition-all btn-press touch-target"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Post a Job (Under 60 Secs)</span>
          </button>
        </div>

        {/* Active Jobs Section (If any exist) */}
        {activeJobs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0E3B40] text-sm font-['Outfit'] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#16858F]" />
                Your Recent Jobs
              </h3>
            </div>

            <div className="space-y-2.5">
              {activeJobs.slice(0, 2).map((job) => (
                <div 
                  key={job.job_id} 
                  className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 cursor-pointer hover:border-[#16858F] transition-all"
                  onClick={() => {
                    if (job.status === 'matched') {
                      navigateTo('chat', { job, matchId: `match_${job.job_id}_${job.matched_artisan_id}` });
                    } else {
                      navigateTo('match_list', { job });
                    }
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#0E3B40]">{job.trade} Repair</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        job.status === 'complete' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{job.description}</p>
                  </div>

                  <button className="px-3 py-1.5 bg-[#E8F5F6] text-[#16858F] text-xs font-bold rounded-xl flex items-center gap-1 flex-shrink-0">
                    <span>View</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trade Category Quick Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#0E3B40] text-sm font-['Outfit']">
              Select Trade Category
            </h3>
            <span className="text-xs text-slate-400 font-medium">Life Camp Verified</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {trades.map((t) => (
              <button
                key={t}
                onClick={() => handleTradeSelect(t)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all btn-press ${
                  selectedTrade === t
                    ? 'bg-[#16858F] text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Available Artisans Directory List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#0E3B40] text-base font-['Outfit']">
              Verified Artisans Nearby
            </h3>
            <span className="text-xs font-semibold text-[#16858F]">
              {artisans.length} Available
            </span>
          </div>

          {loading ? (
            <SkeletonLoader type="card" count={3} />
          ) : artisans.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
              <Wrench className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-[#0E3B40]">No artisans found for {selectedTrade}</h4>
              <p className="text-xs text-slate-500">Post a custom job request to get notified when an artisan opens availability.</p>
              <button
                onClick={() => handleStartPostJob(selectedTrade === 'All' ? 'Plumbing' : selectedTrade)}
                className="px-4 py-2.5 bg-[#16858F] text-white text-xs font-bold rounded-xl"
              >
                Post Job Request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {artisans.map((artisan) => (
                <ArtisanCard
                  key={artisan.uid}
                  artisan={artisan}
                  onSelect={() => handleStartPostJob(artisan.trade)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
