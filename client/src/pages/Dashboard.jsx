import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { 
  TrendingUp, 
  Calendar, 
  FileText, 
  Percent, 
  ShieldAlert, 
  CheckCircle,
  Sparkles,
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import Toast from '../components/Toast';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/dashboard');
      setData(response.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch dashboard metrics. Running in offline mode.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-brand-650 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { metrics, charts, insights, notifications } = data;

  // Formatting helper
  const formatINR = (value) => {
    return 'INR ' + parseFloat(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // 1. Chart Config: Revenue & Trips Line/Bar Combo
  const revenueChartConfig = {
    labels: charts.monthlyTrends.labels,
    datasets: [
      {
        type: 'line',
        label: 'Monthly Invoiced Revenue (INR)',
        borderColor: '#0c7bf0',
        borderWidth: 2,
        fill: false,
        tension: 0.35,
        data: charts.monthlyTrends.revenueData,
        yAxisID: 'y-revenue',
      },
      {
        type: 'bar',
        label: 'Monthly Trips Volume',
        backgroundColor: '#bae0fd',
        hoverBackgroundColor: '#7cc2fc',
        data: charts.monthlyTrends.tripsData,
        yAxisID: 'y-trips',
        borderRadius: 6,
      }
    ]
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          font: { size: 11, family: 'Inter' }
        }
      }
    },
    scales: {
      'y-revenue': {
        type: 'linear',
        position: 'left',
        grid: { drawOnChartArea: true, color: '#cbd5e120' },
        ticks: { font: { size: 10 } }
      },
      'y-trips': {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { stepSize: 1, font: { size: 10 } }
      },
      x: {
        grid: { drawOnChartArea: false },
        ticks: { font: { size: 10 } }
      }
    }
  };

  // 2. Chart Config: Invoices Payment Status Doughnut
  const paymentStatusChartConfig = {
    labels: charts.paymentStatus.labels,
    datasets: [
      {
        data: charts.paymentStatus.data,
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        hoverOffset: 6,
        borderWidth: 0,
      }
    ]
  };

  const paymentStatusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 8,
          usePointStyle: true,
          font: { size: 11, family: 'Inter' }
        }
      }
    },
    cutout: '70%'
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notice */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />

      {/* Welcome & AI Insight banner */}
      <div className="p-6 bg-gradient-to-r from-brand-950 via-slate-900 to-brand-900 rounded-3xl text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight font-sans">
              Welcome, {user.username}!
            </h2>
            <p className="text-xs text-brand-200">
              Here is your logistics and billing summary overview for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.
            </p>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 self-start px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs transition-colors shrink-0"
          >
            <RefreshCw size={12} /> Sync Metrics
          </button>
        </div>

        {/* AI Quick Banner summary */}
        {insights?.billingSummary && (
          <div className="mt-5 p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-3 items-start backdrop-blur-sm">
            <div className="p-1.5 bg-brand-500/20 text-brand-300 rounded-lg shrink-0 mt-0.5 animate-pulse">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-300 flex items-center gap-1">
                AI Billing Insight 
                <span className="text-[9px] font-medium bg-brand-500/25 px-1.5 py-0.2 rounded text-white shrink-0">
                  {insights.provider === 'gemini-ai' ? 'Gemini AI' : 'Rule Engine'}
                </span>
              </p>
              <p className="text-xs text-slate-200 mt-1 leading-normal font-medium">
                {insights.billingSummary}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Trips */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-200 dark:bg-slate-900 dark:border-slate-850">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Trips</span>
            <span className="p-1.5 bg-brand-50 text-brand-600 rounded-lg dark:bg-brand-950/20 dark:text-brand-400"><Calendar size={14} /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalTrips}</h3>
            <span className="text-[9px] font-bold text-emerald-500 tracking-wider">Completed</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-200 dark:bg-slate-900 dark:border-slate-850">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue billed</span>
            <span className="p-1.5 bg-brand-50 text-brand-600 rounded-lg dark:bg-brand-950/20 dark:text-brand-400"><TrendingUp size={14} /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 truncate" title={formatINR(metrics.totalRevenue)}>{formatINR(metrics.totalRevenue)}</h3>
            <span className="text-[9px] font-bold text-slate-400">Total ledger invoicing</span>
          </div>
        </div>

        {/* Total Invoices */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-200 dark:bg-slate-900 dark:border-slate-850">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoices</span>
            <span className="p-1.5 bg-brand-50 text-brand-600 rounded-lg dark:bg-brand-950/20 dark:text-brand-400"><FileText size={14} /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalInvoices}</h3>
            <span className="text-[9px] font-bold text-slate-400">Statements cycles</span>
          </div>
        </div>

        {/* GST collected */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-200 dark:bg-slate-900 dark:border-slate-850">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GST Amount</span>
            <span className="p-1.5 bg-brand-50 text-brand-600 rounded-lg dark:bg-brand-950/20 dark:text-brand-400"><Percent size={14} /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 truncate" title={formatINR(metrics.totalGST)}>{formatINR(metrics.totalGST)}</h3>
            <span className="text-[9px] font-bold text-slate-400">Tax break 5%</span>
          </div>
        </div>

        {/* Paid amount */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-200 dark:bg-slate-900 dark:border-slate-850">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid Amount</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg dark:bg-emerald-950/20 dark:text-emerald-400"><CheckCircle size={14} /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 truncate" title={formatINR(metrics.paidPayments)}>{formatINR(metrics.paidPayments)}</h3>
            <span className="text-[9px] font-bold text-emerald-500">Processed success</span>
          </div>
        </div>

        {/* Pending balance */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-200 dark:bg-slate-900 dark:border-slate-850">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</span>
            <span className="p-1.5 bg-red-50 text-red-650 rounded-lg dark:bg-red-950/20 dark:text-red-400"><ShieldAlert size={14} /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-extrabold text-red-650 dark:text-red-400 truncate" title={formatINR(metrics.pendingPayments)}>{formatINR(metrics.pendingPayments)}</h3>
            <span className="text-[9px] font-bold text-red-500">Overdue aging</span>
          </div>
        </div>
      </div>

      {/* Charts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Combined Line/Bar revenue trend */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-700 mb-4 dark:text-slate-300">Revenue & Bookings Trend</h3>
          <div className="h-64 relative">
            <Line data={revenueChartConfig} options={revenueChartOptions} />
          </div>
        </div>

        {/* Right: Doughnut payment ratio */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <h3 className="text-sm font-bold text-slate-700 mb-4 dark:text-slate-300">Invoice Status Ratio</h3>
          <div className="h-64 relative flex flex-col items-center justify-center">
            {charts.paymentStatus.data.reduce((a, b) => a + b, 0) === 0 ? (
              <p className="text-xs text-slate-400 italic">No invoices drafted yet</p>
            ) : (
              <Doughnut data={paymentStatusChartConfig} options={paymentStatusChartOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom panels: Alerts feed & AI insights lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: System Alert Logs Feed */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 dark:text-slate-300">
            <Clock size={16} className="text-slate-450" />
            Recent Account Alerts
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 italic">
                No recent invoice alerts or payment logs found.
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="p-3 bg-slate-50 border border-slate-250/20 rounded-xl flex gap-3 items-start dark:bg-slate-950/40">
                  <div className="h-2 w-2 rounded-full bg-brand-500 mt-1.5 shrink-0 animate-ping" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-normal">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {new Date(notif.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: AI Cost Optimization Advices */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 dark:text-slate-300">
            <Sparkles size={16} className="text-brand-500" />
            Cost Optimizations & Audits
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            
            {/* Optimization cards */}
            {insights?.costOptimization && insights.costOptimization.map((sug, idx) => (
              <div key={idx} className="p-3 bg-brand-50/40 border border-brand-200/40 rounded-xl flex gap-2.5 items-start dark:bg-brand-950/10 dark:border-brand-900/30">
                <CheckCircle size={14} className="text-brand-500 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                  {sug}
                </p>
              </div>
            ))}

            {/* Overdue alerts */}
            {insights?.delayedPaymentAlerts && insights.delayedPaymentAlerts.map((alert, idx) => {
              if (alert.includes('overdue') || alert.includes('delayed')) {
                return (
                  <div key={idx} className="p-3 bg-red-50/40 border border-red-200/40 rounded-xl flex gap-2.5 items-start dark:bg-red-950/10 dark:border-red-900/30">
                    <ShieldAlert size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-650 dark:text-red-400 leading-relaxed font-semibold">
                      {alert}
                    </p>
                  </div>
                );
              }
              return null;
            })}

            {/* frequent routes info */}
            {insights?.frequentRoutes && insights.frequentRoutes.length > 0 && insights.frequentRoutes[0] !== 'No trips recorded in this period' && (
              <div className="p-3.5 bg-slate-50 border border-slate-200/35 rounded-xl dark:bg-slate-950/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">High Frequency Routes</span>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-650 dark:text-slate-350 list-disc list-inside">
                  {insights.frequentRoutes.map((route, idx) => (
                    <li key={idx} className="font-medium">{route}</li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
