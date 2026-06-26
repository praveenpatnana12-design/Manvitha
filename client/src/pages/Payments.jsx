import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { CreditCard, Search, Calendar, CheckCircle, Download, FileText } from 'lucide-react';
import Toast from '../components/Toast';

const Payments = () => {
  const { user } = useAuth();
  const isAdminOrAccounts = user.role === 'admin' || user.role === 'accounts';

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/payments');
      setPayments(response.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch payment transaction logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Filter based on search query
  const filteredPayments = payments.filter(p => 
    p.transaction_reference.toLowerCase().includes(search.toLowerCase()) ||
    p.payment_method.toLowerCase().includes(search.toLowerCase()) ||
    (p.company_name && p.company_name.toLowerCase().includes(search.toLowerCase())) ||
    (p.invoice_number && p.invoice_number.toLowerCase().includes(search.toLowerCase()))
  );

  const formatINR = (val) => {
    return 'INR ' + parseFloat(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2
    });
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Payment Logs & Receipts
          </h2>
          <p className="text-xs text-slate-500">
            Audit collection histories, NEFT/IMPS bank reference keys, and verify invoice balances
          </p>
        </div>
      </div>

      {/* Searches and stats */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ref number, payment method, company..."
            className="form-input pl-9.5 text-xs py-2"
          />
        </div>
        <div className="flex gap-4 ml-auto text-xs font-semibold text-slate-500 shrink-0">
          <span>Total Transactions: {filteredPayments.length}</span>
        </div>
      </div>

      {/* Payments table card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-850">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-20 text-center text-slate-400 italic text-xs">
            No transaction receipts logged under this category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/40 dark:bg-slate-950/20 dark:border-slate-850">
                  <th className="px-6 py-4">Receipt reference</th>
                  {isAdminOrAccounts && <th className="px-6 py-4">Client Company</th>}
                  <th className="px-6 py-4">Invoice Ref</th>
                  <th className="px-6 py-4">Payment Date & Time</th>
                  <th className="px-6 py-4">Settlement Mode</th>
                  <th className="px-6 py-4 text-right">Amount Settle</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/40 transition-colors dark:hover:bg-slate-800/10">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl dark:bg-emerald-950/20 dark:text-emerald-400">
                          <CreditCard size={15} />
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{p.transaction_reference}</span>
                      </div>
                    </td>
                    
                    {isAdminOrAccounts && (
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                        {p.company_name}
                      </td>
                    )}

                    <td className="px-6 py-4 font-bold text-slate-500 font-mono flex items-center gap-1.5 mt-2.5">
                      <FileText size={13} className="text-slate-405" /> {p.invoice_number}
                    </td>

                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{p.payment_method}</td>
                    
                    <td className="px-6 py-4 text-right font-extrabold text-slate-800 dark:text-slate-200 font-mono">
                      {formatINR(p.amount)}
                    </td>

                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle size={12} /> Success
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Payments;
