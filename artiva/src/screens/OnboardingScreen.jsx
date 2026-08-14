import React, { useState } from 'react';
import { ArtivaLogo } from '../components/ArtivaLogo';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Lock, MessageSquare, ArrowRight, UserCheck, Wrench, ShieldAlert } from 'lucide-react';

export function OnboardingScreen() {
  const { navigateTo, setUserRole } = useApp();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      icon: <ShieldCheck className="w-12 h-12 text-[#FAB804]" />,
      title: "Verified Life Camp Artisans",
      desc: "Every artisan undergoes NIN identity verification and skill checks before entering your home."
    },
    {
      icon: <Lock className="w-12 h-12 text-[#FAB804]" />,
      title: "Protected Escrow Payments",
      desc: "Your match fee and job funds are held securely until you confirm the job is 100% completed."
    },
    {
      icon: <MessageSquare className="w-12 h-12 text-[#FAB804]" />,
      title: "Direct In-App Communication",
      desc: "Chat instantly with your matched artisan inside Artiva. No external phone numbers needed."
    }
  ];

  const handleStartClient = () => {
    setUserRole('client');
    navigateTo('auth', { role: 'client' });
  };

  const handleStartArtisan = () => {
    setUserRole('artisan');
    navigateTo('artisan_signup');
  };

  const handleStartAdmin = () => {
    setUserRole('admin');
    navigateTo('admin_queue');
  };

  return (
    <div className="min-h-screen bg-splash-radial text-white flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Background Decorative Circles */}
      <div className="absolute top-[-10%] right-[-10%] w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 rounded-full bg-[#16858F]/20 blur-3xl pointer-events-none" />

      {/* Top Header Logo */}
      <div className="pt-6 flex flex-col items-center text-center z-10 animate-fade-in">
        <ArtivaLogo size="xl" showWordmark={true} showTagline={true} />
        <p className="text-xs font-semibold text-slate-300 tracking-wider uppercase mt-3 bg-white/10 px-3 py-1 rounded-full border border-white/10">
          Life Camp, Abuja • Verified Artisan Marketplace
        </p>
      </div>

      {/* Center Value Props Carousel */}
      <div className="my-auto py-8 z-10 max-w-sm mx-auto w-full text-center">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/15 shadow-2xl transition-all">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
            {slides[activeSlide].icon}
          </div>
          <h2 className="text-xl font-bold font-['Outfit'] text-white mb-2">
            {slides[activeSlide].title}
          </h2>
          <p className="text-sm text-slate-200 leading-relaxed min-h-[48px]">
            {slides[activeSlide].desc}
          </p>

          {/* Pagination Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeSlide === i ? 'w-8 bg-[#FAB804]' : 'w-2 bg-white/30'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA Buttons (Client vs Artisan vs Admin) */}
      <div className="w-full max-w-sm mx-auto space-y-3 z-10 pb-4 animate-slide-up">
        <button
          onClick={handleStartClient}
          className="w-full py-4 bg-[#FAB804] hover:bg-[#FDC80B] text-[#0E3B40] font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 shadow-gold-glow transition-all btn-press touch-target"
        >
          <UserCheck className="w-5 h-5 stroke-[2.5]" />
          <span>Find an Artisan in Life Camp</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button
          onClick={handleStartArtisan}
          className="w-full py-3.5 bg-white/15 hover:bg-white/20 text-white font-bold text-sm rounded-2xl border border-white/25 flex items-center justify-center gap-2 backdrop-blur-sm transition-all btn-press touch-target"
        >
          <Wrench className="w-4 h-4 text-[#16D4C6]" />
          <span>Join as Verified Artisan (NIN Required)</span>
        </button>

        {/* Demo Admin Console Shortcut */}
        <button
          onClick={handleStartAdmin}
          className="w-full py-2 text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1 opacity-80 hover:opacity-100"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-purple-300" />
          <span>Admin Verification Queue Demo</span>
        </button>
      </div>
    </div>
  );
}
