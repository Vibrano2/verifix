import React, { useState } from 'react';
import { ArtivaLogo } from './ArtivaLogo';
import { useApp } from '../context/AppContext';
import { Menu, X, Smartphone } from 'lucide-react';

export function Navbar({ activeTab = 'home' }) {
  const { navigateTo, currentUser, logout, userRole } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: 'Home', screen: 'home' },
    { id: 'find', label: 'Find Artisans', screen: 'find_artisans' },
    { id: 'how', label: 'How It Works', screen: 'how_it_works' },
    { id: 'become', label: 'Become an Artisan', screen: 'become_artisan' },
    { id: 'jobs', label: 'Jobs', screen: 'jobs_board' },
    { id: 'about', label: 'About Us', screen: 'about_us' },
  ];

  const handleNavClick = (screen) => {
    setMobileMenuOpen(false);
    if (screen === 'home') {
      if (userRole === 'artisan') navigateTo('artisan_dash');
      else if (currentUser) navigateTo('client_dash');
      else navigateTo('home');
    } else {
      navigateTo(screen);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-dark-bg text-[#E5E7EB] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between gap-4 border-b border-white/10">
        
        {/* Brand Logo */}
        <div 
          className="cursor-pointer flex items-center gap-2 flex-shrink-0"
          onClick={() => handleNavClick('home')}
        >
          <ArtivaLogo size="md" showWordmark={true} />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.screen)}
                className={`text-[12px] transition-all btn-press py-1 ${
                  isActive
                    ? 'text-[#16858F] font-bold underline underline-offset-4'
                    : 'text-[#E5E7EB] font-normal hover:text-white'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Header Action Buttons */}
        <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateTo(userRole === 'artisan' ? 'artisan_dash' : 'client_dash')}
                className="px-4 py-2 bg-[#00A3C4] text-white text-xs font-bold rounded-xl hover:bg-cyan-500 transition-all btn-press"
              >
                Dashboard ({userRole})
              </button>
              <button
                onClick={logout}
                className="text-xs text-slate-300 hover:text-white underline font-medium"
              >
                Log Out
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => navigateTo('login')}
                className="h-[44px] px-6 border border-[#E5E7EB] bg-transparent hover:bg-white/5 text-[#E5E7EB] text-[15px] font-normal rounded-lg flex items-center justify-center transition-all btn-press"
              >
                Log in
              </button>
              <button
                onClick={() => navigateTo('signup')}
                className="h-[44px] px-6 bg-[#16858F] hover:bg-[#0E5C63] text-white text-[15px] font-normal rounded-lg flex items-center justify-center transition-all btn-press"
              >
                Sign up
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-white hover:bg-white/10 rounded-xl transition-colors btn-press"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0E3B40] border-b border-white/10 px-4 pt-3 pb-6 space-y-3 animate-slide-up">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.screen)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === link.id ? 'bg-[#16858F] text-white' : 'text-slate-200 hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            {!currentUser ? (
              <>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigateTo('login'); }}
                  className="w-full py-3 border border-white/30 text-white font-bold text-sm rounded-xl text-center"
                >
                  Log in
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigateTo('signup'); }}
                  className="w-full py-3 bg-[#16858F] text-white font-extrabold text-sm rounded-xl text-center shadow-md"
                >
                  Sign up
                </button>
              </>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); navigateTo(userRole === 'artisan' ? 'artisan_dash' : 'client_dash'); }}
                className="w-full py-3 bg-[#16858F] text-white font-extrabold text-sm rounded-xl text-center"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
