import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { Sparkles, RefreshCw, Compass, ShieldAlert, BadgePercent, CheckCircle, TrendingUp, Lightbulb } from 'lucide-react';
import Toast from '../components/Toast';

const AIInsights = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const fetchInsights = async () => {
    setLoading(true);
    try {
      // Backend automatically maps logged-in client ID via session token
      const response = await api.post('/api/ai/billing-summary', {});
      setInsights(response.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch AI insights.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-brand-650 animate-spin" />
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-6">
      
      {/* Toast Notice */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans flex items-center gap-2">
            <Sparkles className="text-brand-500 shrink-0" /> AI Travel & Billing Insights
          </h2>
          <p className="text-xs text-slate-500">
            Intelligent travel behavior analysis, route audits, cost-cutting suggestions, and late invoice triggers
          </p>
        </div>
        <button
          onClick={fetchInsights}
          className="flex items-center gap-1.5 self-start px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors shrink-0 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-850"
        >
          <RefreshCw size={12} /> Re-run Analytics
        </button>
      </div>

      {/* Main Analysis Banner */}
      <div className="p-6 bg-gradient-to-r from-brand-950 via-slate-900 to-brand-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold bg-brand-500/30 text-white px-2 py-0.5 rounded uppercase tracking-wider">
              Executive Briefing
            </span>
            <span className="text-[9px] font-semibold text-brand-300">
              Generated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          <h3 className="text-base md:text-lg font-bold text-brand-200">
            Billing Behavior Summary
          </h3>

          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            {insights.billingSummary}
          </p>

          <div className="h-px bg-white/10" />

          <div className="flex gap-2 items-center text-xs text-slate-450 font-bold">
            <TrendingUp size={16} className="text-emerald-500" />
            <span>Travel Behaviors:</span>
            <p className="text-slate-300 font-medium">{insights.spendingAnalysis}</p>
          </div>
        </div>
      </div>

      {/* Detailed Cards: Routes, Optimizations, Overdues */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Frequent Routes card */}
        <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm dark:bg-slate-900 dark:border-slate-850 space-y-4">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
            <Compass size={18} className="text-slate-500" />
            High Frequency Routes
          </h4>
          <div className="space-y-3">
            {insights.frequentRoutes.map((route, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200/30 rounded-xl dark:bg-slate-950/40">
                <span className="text-[9px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wide block mb-1">Rank #{idx + 1}</span>
                <p className="text-xs font-semibold text-slate-750 dark:text-slate-300">
                  {route}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Optimization Suggestions card */}
        <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm dark:bg-slate-900 dark:border-slate-850 space-y-4 md:col-span-2">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
            <Lightbulb size={18} className="text-brand-500" />
            Cost Optimization Recommendations
          </h4>
          <div className="space-y-3">
            {insights.costOptimization.map((sug, idx) => (
              <div key={idx} className="p-3.5 bg-brand-50/40 border border-brand-200/40 rounded-2xl flex gap-3 items-start dark:bg-brand-950/10 dark:border-brand-900/30">
                <BadgePercent size={18} className="text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-brand-900 dark:text-brand-300">Optimization opportunity #{idx + 1}</p>
                  <p className="text-xs text-slate-650 dark:text-slate-350 mt-1 leading-relaxed font-medium">
                    {sug}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Overdue alert display if any */}
          {insights.delayedPaymentAlerts && insights.delayedPaymentAlerts.length > 0 && insights.delayedPaymentAlerts[0] !== 'No delayed payments found.' && (
            <div className="p-4.5 bg-red-50/40 border border-red-200/40 rounded-2xl flex gap-3 items-start dark:bg-red-950/10 dark:border-red-900/30">
              <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-900 dark:text-red-300">Outstanding billing alerts</p>
                <ul className="list-disc list-inside mt-1 text-xs text-red-650 dark:text-red-400 font-semibold space-y-1">
                  {insights.delayedPaymentAlerts.map((alert, idx) => (
                    <li key={idx}>{alert}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default AIInsights;
