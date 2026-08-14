import React from 'react';
import { useApp } from '../context/AppContext';
import { WifiOff, RefreshCw } from 'lucide-react';

export function OfflineBanner({ onRetry }) {
  const { isOffline, setIsOffline, showToast } = useApp();

  if (!isOffline) return null;

  const handleRetry = () => {
    setIsOffline(false);
    showToast('Reconnected! Retrying request...', 'success');
    if (onRetry) onRetry();
  };

  return (
    <div className="bg-red-600 text-white px-4 py-3 shadow-md animate-slide-up">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <WifiOff className="w-5 h-5 flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-xs font-bold leading-tight uppercase tracking-wider text-red-100">
              Network Connection Interrupted
            </p>
            <p className="text-xs text-white/90">
              Retrying over Life Camp 3G mobile data...
            </p>
          </div>
        </div>

        <button
          onClick={handleRetry}
          className="px-3 py-1.5 bg-white text-red-700 text-xs font-bold rounded-lg hover:bg-red-50 flex items-center gap-1.5 transition-all btn-press shadow-sm flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    </div>
  );
}
