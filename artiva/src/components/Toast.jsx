import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast() {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-[#16858F] flex-shrink-0" />,
  };

  const bgStyles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    info: 'bg-[#E8F5F6] border-[#16858F]/30 text-[#0E3B40]',
  };

  return (
    <div className="fixed bottom-5 left-4 right-4 z-50 max-w-md mx-auto animate-slide-up pointer-events-none">
      <div className={`p-3.5 rounded-xl border shadow-lg flex items-center justify-between gap-3 pointer-events-auto ${bgStyles[toast.type] || bgStyles.info}`}>
        <div className="flex items-center gap-2.5">
          {icons[toast.type] || icons.info}
          <p className="text-sm font-medium leading-snug">
            {toast.message}
          </p>
        </div>
      </div>
    </div>
  );
}
