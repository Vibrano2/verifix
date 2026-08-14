import React from 'react';
import { ArtivaLogo } from './ArtivaLogo';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Wifi, WifiOff, LogOut, ShieldCheck, User } from 'lucide-react';

export function Header({ title, backTo, showLogo = true }) {
  const { currentScreen, navigateTo, userRole, currentUser, logout, isOffline, setIsOffline } = useApp();

  const canGoBack = backTo || (currentScreen !== 'onboarding' && currentScreen !== 'client_dash' && currentScreen !== 'artisan_dash');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-sm transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Left Section: Back button or Logo */}
        <div className="flex items-center gap-3 min-w-0">
          {canGoBack ? (
            <button
              onClick={() => {
                if (backTo) navigateTo(backTo);
                else if (userRole === 'artisan') navigateTo('artisan_dash');
                else navigateTo('client_dash');
              }}
              className="touch-target rounded-full p-2 text-[#0E3B40] hover:bg-slate-100 btn-press"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : null}

          {showLogo ? (
            <div 
              className="cursor-pointer"
              onClick={() => {
                if (userRole === 'artisan') navigateTo('artisan_dash');
                else if (userRole === 'client') navigateTo('client_dash');
                else navigateTo('onboarding');
              }}
            >
              <ArtivaLogo size="sm" showWordmark={true} />
            </div>
          ) : title ? (
            <h1 className="text-lg font-bold text-[#0E3B40] font-['Outfit'] truncate">
              {title}
            </h1>
          ) : null}
        </div>

        {/* Right Section: Controls & Status Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Offline simulator toggle button */}
          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border transition-colors btn-press ${
              isOffline 
                ? 'bg-red-50 text-red-700 border-red-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
            title="Toggle Network Status (Simulate intermittent 3G connection)"
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isOffline ? 'Offline' : 'Online'}</span>
          </button>

          {/* Role Indicator Badge */}
          {currentUser && (
            <div className="flex items-center gap-1.5 pl-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                userRole === 'admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : userRole === 'artisan'
                  ? 'bg-[#E8F5F6] text-[#16858F]'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {userRole}
              </span>

              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-full hover:bg-slate-100 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
