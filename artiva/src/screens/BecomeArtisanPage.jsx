import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useApp } from '../context/AppContext';
import { TradeServicesMap } from '../services/api';
import { Wrench, ShieldCheck, DollarSign, Award, ArrowRight, CheckCircle2, FileText, Camera } from 'lucide-react';

export function BecomeArtisanPage() {
  const { navigateTo } = useApp();

  const benefits = [
    { title: 'More Local Job Requests', desc: 'Get matched directly with clients needing repair work in your area.' },
    { title: 'No Upfront Membership Fee', desc: 'Joining Artiva is free. You only pay a 10% commission on completed jobs.' },
    { title: 'Protected Escrow Payouts', desc: 'No chasing payments. Job funds are secured before you start work.' },
    { title: 'Build Your Verified Reputation', desc: 'Earn 5-star client ratings and NIN verification badges to win more jobs.' },
  ];

  const requirements = [
    { icon: <ShieldCheck className="w-5 h-5 text-[#16858F]" />, title: 'National Identification Number (NIN)', desc: '11-digit NIN for background identity verification.' },
    { icon: <FileText className="w-5 h-5 text-[#16858F]" />, title: 'Valid Photo ID', desc: 'Government driver license, voter card, or international passport.' },
    { icon: <Camera className="w-5 h-5 text-[#16858F]" />, title: 'Portfolio Photos', desc: '2-3 photos showing your recent completed craft projects.' }
  ];

  const handleStartSignup = () => {
    navigateTo('artisan_signup');
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Navbar activeTab="become" />

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-splash-radial text-white py-16 px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="max-w-4xl mx-auto space-y-3">
            <h1 className="text-2xl sm:text-5xl font-extrabold font-['Outfit'] tracking-tight">
              Get More Jobs. Build Your Reputation. Grow Your Business.
            </h1>
            <p className="text-xs sm:text-base text-slate-200 max-w-xl mx-auto leading-relaxed">
              Join Abuja's trusted network of verified artisans. Receive direct job requests with guaranteed escrow payouts.
            </p>

            <div className="pt-4">
              <button
                onClick={handleStartSignup}
                className="px-8 py-4 bg-[#FAB804] hover:bg-[#FDC80B] text-[#0E3B40] font-extrabold text-base rounded-2xl inline-flex items-center gap-2 shadow-gold-glow transition-all btn-press touch-target"
              >
                <Wrench className="w-5 h-5 stroke-[2.5]" />
                <span>Become an Artisan</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </section>

        {/* CORE BENEFITS */}
        <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold font-['Outfit'] text-[#0E3B40]">
              Why Skilled Artisans Join Artiva
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">Transparent commission and secured payments.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((b, i) => (
              <div key={i} className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-card space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#16858F]" />
                  <h3 className="font-bold text-[#0E3B40] text-base font-['Outfit']">{b.title}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-7">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* LOCKED 6 TRADE CATEGORIES */}
        <section className="py-12 bg-white border-y border-slate-200/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-3xl font-extrabold font-['Outfit'] text-[#0E3B40]">
                Supported Trade Categories
              </h2>
              <p className="text-xs text-slate-500">Select your specialization during registration</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.keys(TradeServicesMap).map((trade) => (
                <div key={trade} className="p-4 bg-[#F4F8F8] rounded-2xl border border-slate-200/80 text-center space-y-1">
                  <span className="text-xs font-bold text-[#0E3B40]">{trade}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT YOU'LL NEED PREPARATION */}
        <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-3xl font-extrabold font-['Outfit'] text-[#0E3B40]">
              What You'll Need to Get Started
            </h2>
            <p className="text-xs text-slate-500">Prepare these 3 items for verification review.</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
            {requirements.map((req, i) => (
              <div key={i} className="flex items-start gap-3.5 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="p-2 bg-[#E8F5F6] rounded-xl flex-shrink-0">{req.icon}</div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#0E3B40] font-['Outfit']">{req.title}</h4>
                  <p className="text-xs text-slate-500">{req.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA BUTTON */}
          <div className="text-center pt-4">
            <button
              onClick={handleStartSignup}
              className="px-8 py-4 bg-[#16858F] hover:bg-[#0E5C63] text-white font-extrabold text-base rounded-2xl inline-flex items-center gap-2 shadow-sm btn-press touch-target"
            >
              <span>Start Artisan Signup Flow</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
