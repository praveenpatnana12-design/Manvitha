import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { Plus, BookOpen, Calendar, Download, Search, Sparkles, FileSpreadsheet } from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const Statements = () => {
  const { user } = useAuth();
  const isAdminOrAccounts = user.role === 'admin' || user.role === 'accounts';

  const [statements, setStatements] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Modal control
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formClientId, setFormClientId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const fetchStatements = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/statements');
      setStatements(response.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch account statements.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!isAdminOrAccounts) return;
    try {
      const response = await api.get('/api/clients');
      setClients(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatements();
    fetchClients();
  }, []);

  const handleGenerateStatement = async (e) => {
    e.preventDefault();
    if (!formClientId || !formStartDate || !formEndDate) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/statements/generate', {
        client_id: formClientId,
        start_date: formStartDate,
        end_date: formEndDate
      });

      showToast('Consolidated Statement compiled, PDF written, and email dispatched!', 'success');
      setIsGenModalOpen(false);
      setFormClientId('');
      setFormStartDate('');
      setFormEndDate('');
      fetchStatements();
    } catch (err) {
      showToast(err.response?.data?.message || 'Statement compilation failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadPDF = (id) => {
    const token = localStorage.getItem('token');
    window.open(`/api/statements/${id}/pdf?token=${token}`, '_blank');
  };

  const downloadCSV = (id) => {
    const token = localStorage.getItem('token');
    window.open(`/api/statements/${id}/csv?token=${token}`, '_blank');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
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
            Consolidated Account Statements
          </h2>
          <p className="text-xs text-slate-500">
            View monthly logs of total bookings, accumulated invoices, payment histories, and outstanding aging ledgers
          </p>
        </div>
        
        {isAdminOrAccounts && (
          <button
            onClick={() => setIsGenModalOpen(true)}
            className="btn-primary flex items-center justify-center gap-1.5 self-start text-xs font-semibold"
          >
            <Plus size={16} /> Compile Statement
          </button>
        )}
      </div>

      {/* Statement list card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-850">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
          </div>
        ) : statements.length === 0 ? (
          <div className="py-20 text-center text-slate-400 italic text-xs">
            No account statements generated for this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/40 dark:bg-slate-950/20 dark:border-slate-850">
                  <th className="px-6 py-4">Statement Number</th>
                  {isAdminOrAccounts && <th className="px-6 py-4">Client Company</th>}
                  <th className="px-6 py-4">Statement Period</th>
                  <th className="px-6 py-4 text-center">Trips Included</th>
                  <th className="px-6 py-4 text-right">Total Invoiced</th>
                  <th className="px-6 py-4 text-right">Total Paid</th>
                  <th className="px-6 py-4 text-right">Outstanding Balance</th>
                  <th className="px-6 py-4 text-center">Export Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {statements.map((stmt) => (
                  <tr key={stmt.id} className="hover:bg-slate-50/40 transition-colors dark:hover:bg-slate-800/10">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mt-1 border-none">
                      <BookOpen size={15} className="text-brand-500 shrink-0" /> {stmt.statement_number}
                    </td>

                    {isAdminOrAccounts && (
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                        {stmt.company_name}
                      </td>
                    )}

                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {formatDate(stmt.start_date)} ➔ {formatDate(stmt.end_date)}
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300 font-mono">
                      {stmt.total_bookings}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-slate-650 dark:text-slate-350">
                      INR {parseFloat(stmt.total_invoiced).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      INR {parseFloat(stmt.total_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-6 py-4 text-right font-extrabold text-red-650 dark:text-red-400 font-mono">
                      INR {parseFloat(stmt.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => downloadCSV(stmt.id)}
                          className="btn-secondary text-[10px] px-2 py-1.5 flex items-center gap-1"
                          title="Download CSV Ledger"
                        >
                          <FileSpreadsheet size={12} /> CSV
                        </button>
                        <button
                          onClick={() => downloadPDF(stmt.id)}
                          className="btn-primary text-[10px] px-2 py-1.5 flex items-center gap-1"
                          title="Download PDF statement"
                        >
                          <Download size={12} /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compile Statement Modal */}
      <Modal
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
        title="Compile Consolidated Account Statement"
      >
        <form onSubmit={handleGenerateStatement} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Client selection */}
            <div className="md:col-span-2">
              <label className="form-label">Choose Corporate Client *</label>
              <select
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
                className="form-input text-xs py-2.5 cursor-pointer"
                required
              >
                <option value="">Select Corporate Account</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name} (GSTIN: {c.gst_number})</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="form-label">Period Start Date *</label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="form-input text-xs py-2"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label className="form-label">Period End Date *</label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="form-input text-xs py-2"
                required
              />
            </div>

          </div>

          <div className="p-3.5 bg-brand-50 border border-brand-200/40 rounded-xl text-brand-850 text-[11px] flex gap-2 items-start dark:bg-brand-950/20 dark:border-brand-900/30 dark:text-brand-400">
            <Sparkles size={15} className="shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              Compiling the statement will parse all invoices and payments settled in this period for the selected client, compute outstanding balances, write the PDF layout, log dashboard alerts, and dispatch an email update.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end border-t border-slate-200/50 pt-4 mt-6 dark:border-slate-800/50">
            <button
              type="button"
              onClick={() => setIsGenModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <BookOpen size={14} /> {isSubmitting ? 'Compiling...' : 'Compile Statement'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Statements;
