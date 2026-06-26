import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900',
    error: 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900',
    info: 'bg-brand-50 border-brand-200 dark:bg-brand-950/40 dark:border-brand-900',
  };

  const textColors = {
    success: 'text-emerald-800 dark:text-emerald-400',
    error: 'text-rose-800 dark:text-rose-400',
    info: 'text-brand-850 dark:text-brand-400',
  };

  const icons = {
    success: <CheckCircle size={18} className="text-emerald-500 shrink-0" />,
    error: <AlertCircle size={18} className="text-rose-500 shrink-0" />,
    info: <Info size={18} className="text-brand-500 shrink-0" />,
  };

  if (!message) return null;

  return (
    <div className="fixed top-5 right-5 z-[60] animate-slide-down">
      <div className={`flex items-center gap-3.5 px-4.5 py-3 border rounded-2xl shadow-lg backdrop-blur-md max-w-sm ${bgColors[type]}`}>
        {icons[type]}
        <div className={`text-xs font-semibold ${textColors[type]}`}>
          {message}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-200/50 rounded-lg transition-colors text-slate-400 hover:text-slate-600 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
