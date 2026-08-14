import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Lock, CheckCircle2, UserCheck, Wrench, ArrowRight } from 'lucide-react';

export function HowItWorksPage() {
  const { navigateTo } = useApp();
  const [activeTab, setActiveTab] = useState('client'); // 'client' | 'artisan'

  const clientSteps = [
    { num: 1, title: 'Create / Post a Job', desc: 'Describe your repair issue, trade category, location, and urgency level.' },
    { num: 2, title: 'Receive Matched Artisans', desc: 'Review proximity-ranked verified local artisans with NIN checkmarks.' },
    { num: 3, title: 'Agree on the Job', desc: 'Review artisan profiles, services, and estimated match fee.' },
    { num: 4, title: 'Payment Secured via Escrow', desc: 'Your match fee is held in escrow. Funds remain locked until work completes.' },
    { num: 5, title: 'Artisan Completes Work', desc: 'Artisan arrives on site, performs the service, and coordinates in-app.' },
    { num: 6, title: 'Client Approves Completion', desc: 'Inspect the finished work in your home or premises and tap Confirm.' },
    { num: 7, title: 'Payment Released', desc: 'Funds are safely transferred to the artisan upon your confirmation.' },
  ];

  const artisanSteps = [
    { num: 1, title: 'Create an Artisan Account', desc: 'Sign up with your phone number and specify your core trade.' },
    { num: 2, title: 'Complete NIN Verification', desc: 'Provide your 11-digit NIN and work portfolio photos for admin review.' },
    { num: 3, title: 'Build Your Profile', desc: 'Select specific service chips and set your availability in Abuja.' },
    { num: 4, title: 'Receive Job Opportunities', desc: 'Get matched directly with client job requests in your local area.' },
    { num: 5, title: 'Accept & Agree on Job', desc: 'Confirm availability and communicate with the client inside the app.' },
    { num: 6, title: 'Complete the Work', desc: 'Deliver quality craftsmanship on site.' },
    { num: 7, title: 'Receive Guaranteed Payout', desc: 'Once the client confirms completion, funds are released directly to your account.' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Navbar activeTab="how" />

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-splash-radial text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="max-w-4xl mx-auto space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold font-['Outfit']">
              How Artiva Works
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto">
              A transparent marketplace built on NIN identity checks and pay-per-job escrow protection.
            </p>
          </div>
        </section>

        {/* DUAL JOURNEY TABS */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          
          <div className="flex justify-center">
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1">
              <button
                onClick={() => setActiveTab('client')}
                className={`px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'client'
                    ? 'bg-[#16858F] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For Clients
              </button>
              <button
                onClick={() => setActiveTab('artisan')}
                className={`px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'artisan'
                    ? 'bg-[#16858F] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For Artisans
              </button>
            </div>
          </div>

          {/* STEP LIST */}
          <div className="space-y-4 max-w-3xl mx-auto">
            {(activeTab === 'client' ? clientSteps : artisanSteps).map((s) => (
              <div key={s.num} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#E8F5F6] text-[#16858F] font-extrabold text-sm flex items-center justify-center flex-shrink-0">
                  {s.num}
                </div>
                <div>
                  <h3 className="font-bold text-[#0E3B40] text-base font-['Outfit']">{s.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ESCROW EXPLANATION DEEP DIVE */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card max-w-3xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0E3B40] font-['Outfit']">
                  Pay-Per-Job Escrow Protection
                </h3>
                <p className="text-xs text-slate-500">No deposit risk. No payment disputes.</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              When you hire an artisan on Artiva, your payment is reserved specifically for that individual job order. Funds are held in a secure escrow account and are only transferred to the artisan after you inspect and approve the completed job in your app.
            </p>
          </div>

          {/* CTA */}
          <div className="text-center pt-4">
            <button
              onClick={() => navigateTo(activeTab === 'client' ? 'find_artisans' : 'become_artisan')}
              className="px-8 py-4 bg-[#FAB804] hover:bg-[#FDC80B] text-[#0E3B40] font-extrabold text-sm rounded-2xl inline-flex items-center gap-2 shadow-gold-glow transition-all btn-press touch-target"
            >
              <span>{activeTab === 'client' ? 'Find an Artisan Now' : 'Join as an Artisan'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

        </section>
      </main>

      <Footer />
    </div>
  );
}
