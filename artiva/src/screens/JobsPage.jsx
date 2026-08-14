import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useApp } from '../context/AppContext';
import { TradeServicesMap } from '../services/api';
import { MapPin, Clock, DollarSign, Wrench, ShieldCheck, ChevronRight, Filter } from 'lucide-react';

export function JobsPage() {
  const { navigateTo } = useApp();

  const [selectedTrade, setSelectedTrade] = useState('All');
  const [jobsList, setJobsList] = useState([]);

  // Mock public job board data (hiding all sensitive client details)
  const samplePublicJobs = [
    {
      job_id: 'public_job_001',
      title: 'Kitchen Sink Leak & Pipe Repair',
      trade: 'Plumbing',
      location: 'Brains & Hammers Estate, Life Camp',
      urgency: 'Today',
      budget: '₦5,000 - ₦8,000',
      description: 'Water leaking underneath the kitchen sink cabinet. Requires replacement of PVC joint pipe.',
      relative_time: '15 mins ago'
    },
    {
      job_id: 'public_job_002',
      title: 'Inverter Battery & Changeover Wiring',
      trade: 'Electrical',
      location: 'Minister\'s Hill, Life Camp',
      urgency: 'Today',
      budget: '₦12,000 - ₦15,000',
      description: 'Connect 3.5kVA solar inverter system with automatic changeover switch.',
      relative_time: '1 hour ago'
    },
    {
      job_id: 'public_job_003',
      title: 'Split AC Gas Top-up & Servicing',
      trade: 'AC Repair',
      location: '1st Avenue, Life Camp',
      urgency: 'This Week',
      budget: '₦8,000 - ₦10,000',
      description: 'Living room split AC unit blowing warm air. Gas pressure check and coil washing needed.',
      relative_time: '3 hours ago'
    },
    {
      job_id: 'public_job_004',
      title: 'Wardrobe Cabinet Hinge Replacement',
      trade: 'Carpentry',
      location: 'Dape District, Life Camp',
      urgency: 'Flexible',
      budget: '₦4,000 - ₦6,000',
      description: 'Fix loose cabinet doors in master bedroom and replace 4 hydraulic hinges.',
      relative_time: '5 hours ago'
    },
    {
      job_id: 'public_job_005',
      title: 'Soundproof Generator Engine Servicing',
      trade: 'Generators',
      location: 'Gwarinpa Expressway Axis, Life Camp',
      urgency: 'Today',
      budget: '₦7,000 - ₦10,000',
      description: 'Change engine oil, clean carburetor, and replace spark plug on Mikano generator.',
      relative_time: '6 hours ago'
    }
  ];

  const trades = ['All', ...Object.keys(TradeServicesMap)];

  const filteredJobs = selectedTrade === 'All'
    ? samplePublicJobs
    : samplePublicJobs.filter(j => j.trade.toLowerCase() === selectedTrade.toLowerCase());

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Navbar activeTab="jobs" />

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-splash-radial text-white py-12 px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="max-w-4xl mx-auto space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold font-['Outfit']">
              Available Opportunities Board
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto">
              Discover active job requests posted by verified clients across Abuja estates.
            </p>
          </div>
        </section>

        {/* FILTER BAR */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-card flex items-center justify-between gap-4 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0E3B40] uppercase flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#16858F]" /> Trade:
              </span>
              {trades.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTrade(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedTrade === t
                      ? 'bg-[#16858F] text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* JOB CARDS LIST */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0E3B40] font-['Outfit']">
              Active Job Postings ({filteredJobs.length})
            </h2>
            <span className="text-xs text-slate-400 font-medium">🔒 Client Contact Protected</span>
          </div>

          <div className="space-y-3.5">
            {filteredJobs.map((job) => (
              <div
                key={job.job_id}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#E8F5F6] text-[#16858F] text-[11px] font-extrabold rounded-md uppercase">
                        {job.trade}
                      </span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {job.relative_time}
                      </span>
                    </div>

                    <h3 className="font-bold text-[#0E3B40] text-base font-['Outfit'] mt-1.5">
                      {job.title}
                    </h3>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex-shrink-0 ${
                    job.urgency === 'Today' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {job.urgency}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  "{job.description}"
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#16858F]" />
                      {job.location}
                    </span>
                    <span>•</span>
                    <span className="font-extrabold text-[#0E3B40]">
                      Budget: {job.budget}
                    </span>
                  </div>

                  <button
                    onClick={() => navigateTo('become_artisan')}
                    className="px-4 py-2 bg-[#16858F] hover:bg-[#0E5C63] text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm btn-press touch-target"
                  >
                    <span>View & Apply</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
