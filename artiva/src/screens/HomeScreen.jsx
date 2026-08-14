import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { HeroBrandMark } from '../components/HeroBrandMark';
import { useApp } from '../context/AppContext';
import { ArrowRight, FilePenLine, HardHat, LockKeyhole, ShieldCheck, Tag, UsersRound } from 'lucide-react';

export function HomeScreen() {
  const { navigateTo } = useApp();

  return (
    <div className="artiva-dark-canvas min-h-screen flex flex-col justify-between text-[#e0e2e4] relative">
      <Navbar activeTab="home" />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16 sm:pt-20 lg:pt-24 lg:pb-20 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          
          {/* Left Content */}
          <div className="w-full lg:w-1/2 space-y-8 z-10">
            <div className="space-y-4">
              <p className="text-[#16D4C6] font-semibold text-[11px] sm:text-[13px] tracking-wide uppercase">
                Abuja’s trusted home-repair marketplace
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-[50px] font-extrabold font-sans tracking-tight leading-[1.1] text-white">
                Get quality work<br />
                done by <span className="text-[#16858F]">trusted<br />artisans.</span>
              </h1>
            </div>
            
            <p className="text-lg text-muted max-w-lg leading-relaxed">
              Artiva connects you with verified, skilled, and reliable artisans for any job — fast, secure, and hassle-free.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                onClick={() => navigateTo('find_artisans')}
                className="w-full sm:w-[211px] h-[44px] bg-[#16858F] hover:bg-[#0E5C63] text-white font-normal text-[15px] rounded-lg flex items-center justify-center gap-2 transition-all btn-press"
              >
                <span>Find an Artisan</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigateTo('become_artisan')}
                className="w-full sm:w-[194px] h-[44px] bg-transparent hover:bg-white/5 border border-[#F5B700] text-[#F5B700] font-normal text-[15px] rounded-lg flex items-center justify-center gap-2 transition-all btn-press"
              >
                <HardHat className="w-4 h-4 text-[#F5B700]" />
                <span>I'm an Artisan</span>
              </button>
            </div>

            {/* Trust Tags */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-5 pt-5">
              <div className="flex items-start gap-3">
                <ShieldCheck aria-hidden="true" className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#16D4C6]" strokeWidth={1.75} />
                <div className="text-left">
                  <h4 className="text-[13px] font-semibold text-white">Verified Artisans</h4>
                  <p className="text-[11px] text-muted">Background checked</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-[#2b3340]"></div>
              <div className="flex items-start gap-3">
                <LockKeyhole aria-hidden="true" className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#16D4C6]" strokeWidth={1.75} />
                <div className="text-left">
                  <h4 className="text-[13px] font-semibold text-white">Secure Payments</h4>
                  <p className="text-[11px] text-muted">Escrow protected</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-[#2b3340]"></div>
              <div className="flex items-start gap-3">
                <Tag aria-hidden="true" className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#16D4C6]" strokeWidth={1.75} />
                <div className="text-left">
                  <h4 className="text-[13px] font-semibold text-white">Fair Pricing</h4>
                  <p className="text-[11px] text-muted">No hidden fees</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Image (Complex Orbit Layout) */}
          <div className="w-full lg:w-1/2 relative flex justify-center lg:justify-end items-center z-0 min-h-[300px] sm:min-h-[390px] lg:min-h-[470px] mt-4 lg:mt-0">
            <HeroBrandMark />
          </div>
        </section>

        {/* HOW ARTIVA WORKS */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-[23px] font-bold font-sans text-[#e0e2e4]">How Artiva Works</h2>
            <p className="text-[13px] text-muted">Getting your job done is simple in just 3 easy steps.</p>
          </div>

          <div className="relative">
            {/* Dashed line connecting steps (desktop only) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left relative z-10 max-w-4xl mx-auto">
              
              {/* Step 1 */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                <div className="w-[50px] h-[50px] rounded-xl border border-[#16858F] bg-dark-surface flex items-center justify-center flex-shrink-0">
                  <FilePenLine aria-hidden="true" strokeWidth={1.75} className="w-6 h-6 text-[#16D4C6]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-[#16858F] flex items-center justify-center text-[10px] font-bold text-white">1</span>
                    <h3 className="text-[14px] font-bold text-white">Post a Job</h3>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">
                    Tell us what you need and when.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                <div className="w-[50px] h-[50px] rounded-xl border border-[#16858F] bg-dark-surface flex items-center justify-center flex-shrink-0">
                  <UsersRound aria-hidden="true" strokeWidth={1.75} className="w-6 h-6 text-[#16D4C6]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-[#16858F] flex items-center justify-center text-[10px] font-bold text-white">2</span>
                    <h3 className="text-[14px] font-bold text-white">Get Matched</h3>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">
                    We connect you with verified artisans near you.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                <div className="w-[50px] h-[50px] rounded-xl border border-[#16858F] bg-dark-surface flex items-center justify-center flex-shrink-0">
                  <ShieldCheck aria-hidden="true" strokeWidth={1.75} className="w-6 h-6 text-[#16D4C6]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-[#16858F] flex items-center justify-center text-[10px] font-bold text-white">3</span>
                    <h3 className="text-[14px] font-bold text-white">Job Done</h3>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">
                    Approve the work and pay only when you're satisfied.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Escrow Banner */}
          <div className="mt-12 mx-auto w-full max-w-[676px] min-h-[57px] bg-dark-surface border border-[#16858F] rounded-[6px] p-4 flex items-center justify-center gap-4 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center flex-shrink-0">
              <LockKeyhole aria-hidden="true" strokeWidth={1.75} className="w-4 h-4 text-[#16D4C6]" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[13px] text-muted">
                <span className="text-[#c9cbcf] font-semibold block sm:inline mr-1">Your payment is held securely in escrow.</span>
                Pay only when the job is done to your satisfaction.
              </p>
            </div>
          </div>
        </section>

        {/* ARTISAN PROMO SECTION */}
        <section className="w-full bg-dark-surface border-t border-b border-[#16858F]/30 py-24 px-4 sm:px-6 lg:px-8 text-center mt-12">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold font-sans text-white">
              For skilled hands
            </h2>
            <p className="text-[15px] text-muted leading-relaxed">
              Turn your next job into a trusted opportunity. Join a network of verified professionals and grow your business with Artiva.
            </p>
            <div className="pt-4">
              <button
                onClick={() => navigateTo('become_artisan')}
                className="px-8 py-3 bg-[#16858F] hover:bg-[#0E5C63] text-white font-medium rounded-lg transition-all btn-press"
              >
                Become an Artisan
              </button>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
