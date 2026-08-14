import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useApp } from '../context/AppContext';
import { ApiService, TradeServicesMap, LifeCampLocations } from '../services/api';
import { ArtisanCard } from '../components/ArtisanCard';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Search, MapPin, Filter, Wrench, ShieldCheck, RefreshCw } from 'lucide-react';

export function FindArtisansPage() {
  const { navigateTo } = useApp();

  const [selectedTrade, setSelectedTrade] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);

  const trades = ['All', ...Object.keys(TradeServicesMap)];
  const locations = ['All', ...LifeCampLocations];

  useEffect(() => {
    handleSearch();
  }, [selectedTrade, selectedLocation, availableOnly]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const filter = {};
      if (selectedTrade !== 'All') filter.trade = selectedTrade;
      if (availableOnly) filter.available = true;

      let list = await ApiService.getArtisans(filter);
      
      if (selectedLocation !== 'All') {
        list = list.filter(a => a.location.toLowerCase().includes(selectedLocation.toLowerCase()));
      }

      setArtisans(list);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error(err);
    }
  };

  const handleSelectArtisan = (artisan) => {
    // Navigate directly into post job or chat flow with this artisan
    navigateTo('post_job', { initialTrade: artisan.trade });
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Navbar activeTab="find" />

      <main className="flex-1">
        {/* HERO HEADER */}
        <section className="bg-splash-radial text-white py-12 px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="max-w-4xl mx-auto space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold font-['Outfit']">
              Find a trusted artisan for your job.
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto">
              Search verified local plumbers, electricians, and technicians in Abuja by trade and area.
            </p>
          </div>
        </section>

        {/* SEARCH AND FILTERS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-card space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Trade Filter */}
              <div>
                <label className="block text-xs font-bold text-[#0E3B40] uppercase tracking-wider mb-1.5">
                  Trade Category
                </label>
                <select
                  value={selectedTrade}
                  onChange={(e) => setSelectedTrade(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-[#0E3B40] focus:border-[#16858F] focus:outline-none"
                >
                  {trades.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-xs font-bold text-[#0E3B40] uppercase tracking-wider mb-1.5">
                  Location Area
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-[#0E3B40] focus:border-[#16858F] focus:outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Availability & Search Trigger */}
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setAvailableOnly(!availableOnly)}
                  className={`flex-1 py-3 px-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    availableOnly
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <span>{availableOnly ? '✓ Available Now' : 'Show All'}</span>
                </button>

                <button
                  onClick={handleSearch}
                  className="px-5 py-3 bg-[#16858F] hover:bg-[#0E5C63] text-white font-bold text-xs rounded-2xl flex items-center gap-1.5 shadow-sm btn-press"
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* RESULTS GRID */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0E3B40] font-['Outfit']">
              Verified Artisans ({artisans.length})
            </h2>
            <span className="text-xs text-slate-400 font-medium">NIN Identity Checked</span>
          </div>

          {loading ? (
            <SkeletonLoader type="card" count={6} />
          ) : artisans.length === 0 ? (
            /* EMPTY STATE */
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm max-w-md mx-auto">
              <Wrench className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0E3B40]">No matching artisans found</h3>
                <p className="text-xs text-slate-500">Try selecting "All" categories or expanding your location search.</p>
              </div>
              <button
                onClick={() => { setSelectedTrade('All'); setSelectedLocation('All'); setAvailableOnly(false); }}
                className="px-4 py-2.5 bg-[#16858F] text-white text-xs font-bold rounded-xl btn-press"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {artisans.map((artisan) => (
                <ArtisanCard
                  key={artisan.uid}
                  artisan={artisan}
                  onSelect={handleSelectArtisan}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
