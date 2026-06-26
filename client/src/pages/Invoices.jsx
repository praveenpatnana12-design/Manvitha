import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { Plus, Search, FileText, Download, CreditCard, ExternalLink, Calendar, AlertCircle } from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const Invoices = () => {
  const { user } = useAuth();
  const isAdminOrAccounts = user.role === 'admin' || user.role === 'accounts';

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Modal Control
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Form Fields: Invoice Generation
  const [formClientId, setFormClientId] = useState('');
  const [formInvoiceDate, setFormInvoiceDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields: Payment simulation
  const [payMethod, setPayMethod] = useState('NEFT');
  const [payRef, setPayRef] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await api.get('/api/invoices', { params });
      setInvoices(response.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch invoice ledger.', 'error');
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
    fetchInvoices();
  }, [statusFilter]);

  useEffect(() => {
    fetchClients();
  }, []);

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!formClientId || !formInvoiceDate || !formDueDate) {
      showToast('Please specify all details.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/invoices', {
        client_id: formClientId,
        invoice_date: formInvoiceDate,
        due_date: formDueDate
      });

      showToast('Monthly Invoice generated, PDF compiled, and email sent!', 'success');
      setIsGenModalOpen(false);
      setFormClientId('');
      setFormInvoiceDate('');
      setFormDueDate('');
      fetchInvoices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Invoice generation failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPreview = async (invoiceId) => {
    try {
      const response = await api.get(`/api/invoices/${invoiceId}`);
      setSelectedInvoiceData(response.data);
      setIsPreviewModalOpen(true);
    } catch (err) {
      showToast('Failed to load invoice preview details.', 'error');
    }
  };

  const handleSimulatePayment = async (e) => {
    e.preventDefault();
    if (!payRef) {
      showToast('Please enter the transaction reference number.', 'error');
      return;
    }

    setIsPaying(true);
    try {
      await api.post('/api/payments', {
        invoice_id: selectedInvoiceData.invoice.id,
        client_id: selectedInvoiceData.invoice.client_id,
        amount: selectedInvoiceData.invoice.total_amount,
        payment_method: payMethod,
        transaction_reference: payRef
      });

      showToast('Simulated payment processed! Invoice marked as paid.', 'success');
      setIsPayModalOpen(false);
      setIsPreviewModalOpen(false);
      fetchInvoices();
    } catch (err) {
      showToast('Payment processing failed.', 'error');
    } finally {
      setIsPaying(false);
    }
  };

  const downloadPDF = (id, invoiceNum) => {
    // Standard download trigger in new tab
    const token = localStorage.getItem('token');
    window.open(`/api/invoices/${id}/pdf?token=${token}`, '_blank');
  };

  const downloadCSV = (id, invoiceNum) => {
    const token = localStorage.getItem('token');
    window.open(`/api/invoices/${id}/csv?token=${token}`, '_blank');
  };

  const getStatusBadge = (status) => {
    if (status === 'paid') return <span className="badge-paid">Paid</span>;
    if (status === 'pending') return <span className="badge-pending">Pending</span>;
    return <span className="badge-overdue">Overdue</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Toast popup */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Invoice Summaries
          </h2>
          <p className="text-xs text-slate-500">
            {isAdminOrAccounts ? 'Draft and issue billing statements, process collections, and audit corporate logistics taxes' : 'Track account statements, audit trip taxes, and settle balances'}
          </p>
        </div>
        
        {isAdminOrAccounts && (
          <button
            onClick={() => setIsGenModalOpen(true)}
            className="btn-primary flex items-center justify-center gap-1.5 self-start text-xs font-semibold"
          >
            <Plus size={16} /> Generate Invoice
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
        <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl dark:bg-slate-950/40 w-full md:w-auto">
          {['all', 'paid', 'pending', 'overdue'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 md:flex-initial text-xs px-3.5 py-1.5 rounded-lg font-bold capitalize transition-all ${
                statusFilter === status 
                  ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="flex gap-4 ml-auto text-xs font-semibold text-slate-500 shrink-0">
          <span>Invoices: {invoices.length}</span>
        </div>
      </div>

      {/* Invoice list card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-850">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-20 text-center text-slate-400 italic text-xs">
            No invoices drafted under this category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/40 dark:bg-slate-950/20 dark:border-slate-850">
                  <th className="px-6 py-4">Invoice Number</th>
                  {isAdminOrAccounts && <th className="px-6 py-4">Client Company</th>}
                  <th className="px-6 py-4">Invoice Date</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4 text-right">Taxable base</th>
                  <th className="px-6 py-4 text-right">GST (5%)</th>
                  <th className="px-6 py-4 text-right">Total Due</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/40 transition-colors dark:hover:bg-slate-800/10">
                    
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleOpenPreview(inv.id)}
                        className="flex items-center gap-2 font-bold text-brand-600 hover:text-brand-700 outline-none text-left"
                      >
                        <FileText size={15} /> {inv.invoice_number}
                      </button>
                    </td>

                    {isAdminOrAccounts && (
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                        {inv.company_name}
                      </td>
                    )}

                    <td className="px-6 py-4 text-slate-500">{formatDate(inv.invoice_date)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(inv.due_date)}</td>

                    <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-350">
                      INR {parseFloat(inv.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-slate-650 dark:text-slate-350">
                      INR {parseFloat(inv.total_gst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-200 font-mono">
                      INR {parseFloat(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => downloadPDF(inv.id, inv.invoice_number)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenPreview(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="View Details"
                        >
                          <ExternalLink size={14} />
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

      {/* Generate Invoice Modal */}
      <Modal
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
        title="Generate Monthly Invoice"
      >
        <form onSubmit={handleGenerateInvoice} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Client selection */}
            <div className="md:col-span-2">
              <label className="form-label">Select Corporate Client *</label>
              <select
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
                className="form-input text-xs py-2.5 cursor-pointer"
                required
              >
                <option value="">Choose Client Profile</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name} (GSTIN: {c.gst_number})</option>
                ))}
              </select>
            </div>

            {/* Invoicing Cycle Month */}
            <div>
              <label className="form-label">Billing Date *</label>
              <input
                type="date"
                value={formInvoiceDate}
                onChange={(e) => setFormInvoiceDate(e.target.value)}
                className="form-input text-xs py-2"
                required
              />
            </div>

            {/* Payment Due Date */}
            <div>
              <label className="form-label">Payment Due Date *</label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="form-input text-xs py-2"
                required
              />
            </div>

          </div>

          <div className="p-3.5 bg-brand-50 border border-brand-200/40 rounded-xl text-brand-850 text-[11px] flex gap-2 items-start dark:bg-brand-950/20 dark:border-brand-900/30 dark:text-brand-400">
            <Calendar size={15} className="shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              Generating this invoice will compile all completed booking trips logged for this client in the selected month, build the PDF file, save it to the system ledger, create a portal alert, and dispatch an email reminder.
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
              <FileText size={14} /> {isSubmitting ? 'Generating...' : 'Compile Invoices'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Invoice Detail Preview Modal */}
      {selectedInvoiceData && (
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title={`Invoice Preview: ${selectedInvoiceData.invoice.invoice_number}`}
        >
          <div className="space-y-6">
            
            {/* Header breakdown */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200/40 dark:border-slate-800/50">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bill To:</p>
                <h4 className="text-sm font-extrabold text-slate-850 dark:text-slate-100">{selectedInvoiceData.client.company_name}</h4>
                <p className="text-xs text-slate-500 mt-1 font-mono">{selectedInvoiceData.client.gst_number}</p>
                <p className="text-xs text-slate-500">{selectedInvoiceData.client.address}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Invoice parameters:</p>
                <p className="text-xs text-slate-600 dark:text-slate-350 mt-1"><strong>Invoice Date:</strong> {formatDate(selectedInvoiceData.invoice.invoice_date)}</p>
                <p className="text-xs text-slate-600 dark:text-slate-350"><strong>Due Date:</strong> {formatDate(selectedInvoiceData.invoice.due_date)}</p>
                <p className="text-xs mt-1"><strong>Status:</strong> {getStatusBadge(selectedInvoiceData.invoice.status)}</p>
              </div>
            </div>

            {/* Bookings inside */}
            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Bookings</h5>
              <div className="max-h-48 overflow-y-auto border border-slate-200/40 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-450 border-b border-slate-200/40 dark:bg-slate-950/20 dark:border-slate-850">
                      <th className="px-4 py-2">Trip Date</th>
                      <th className="px-4 py-2">Route</th>
                      <th className="px-4 py-2">Vehicle</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {selectedInvoiceData.bookings.map(b => (
                      <tr key={b.id}>
                        <td className="px-4 py-2.5 text-slate-500">{new Date(b.trip_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{b.source.split(' ')[0]} ➔ {b.destination.split(' ')[0]}</td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono">{b.registration_number}</td>
                        <td className="px-4 py-2.5 text-right font-semibold font-mono text-slate-700 dark:text-slate-350">INR {parseFloat(b.total_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial summaries */}
            <div className="p-4 bg-slate-50 border border-slate-200/40 rounded-2xl flex flex-col items-end gap-2 dark:bg-slate-950/40">
              <div className="flex justify-between w-64 text-xs">
                <span className="text-slate-500 font-medium">Taxable Subtotal:</span>
                <span className="font-semibold font-mono text-slate-700 dark:text-slate-300">INR {parseFloat(selectedInvoiceData.invoice.taxable_amount).toFixed(2)}</span>
              </div>
              {selectedInvoiceData.invoice.cgst > 0 && (
                <div className="flex justify-between w-64 text-xs">
                  <span className="text-slate-500 font-medium">CGST (2.5%):</span>
                  <span className="font-semibold font-mono text-slate-750 dark:text-slate-300">INR {parseFloat(selectedInvoiceData.invoice.cgst).toFixed(2)}</span>
                </div>
              )}
              {selectedInvoiceData.invoice.sgst > 0 && (
                <div className="flex justify-between w-64 text-xs">
                  <span className="text-slate-500 font-medium">SGST (2.5%):</span>
                  <span className="font-semibold font-mono text-slate-750 dark:text-slate-300">INR {parseFloat(selectedInvoiceData.invoice.sgst).toFixed(2)}</span>
                </div>
              )}
              {selectedInvoiceData.invoice.igst > 0 && (
                <div className="flex justify-between w-64 text-xs">
                  <span className="text-slate-500 font-medium">IGST (5.0%):</span>
                  <span className="font-semibold font-mono text-slate-750 dark:text-slate-300">INR {parseFloat(selectedInvoiceData.invoice.igst).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between w-64 text-xs font-bold text-slate-600 border-t border-slate-250/30 pt-2 dark:text-slate-400">
                <span>Total GST (5.0%):</span>
                <span className="font-mono">INR {parseFloat(selectedInvoiceData.invoice.total_gst).toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-64 text-sm font-extrabold text-brand-600 border-t border-brand-200/50 pt-2 dark:text-brand-400">
                <span>Grand Total:</span>
                <span className="font-mono">INR {parseFloat(selectedInvoiceData.invoice.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 justify-end border-t border-slate-200/50 pt-4 mt-6 dark:border-slate-800/50">
              <button
                onClick={() => downloadCSV(selectedInvoiceData.invoice.id, selectedInvoiceData.invoice.invoice_number)}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                onClick={() => downloadPDF(selectedInvoiceData.invoice.id, selectedInvoiceData.invoice.invoice_number)}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Download size={14} /> Export PDF
              </button>

              {/* Pay invoice button */}
              {selectedInvoiceData.invoice.status !== 'paid' && (
                <button
                  onClick={() => setIsPayModalOpen(true)}
                  className="btn-success text-xs flex items-center gap-1.5"
                >
                  <CreditCard size={14} /> Settle Invoice
                </button>
              )}
            </div>

          </div>
        </Modal>
      )}

      {/* Settle Payment Modal */}
      {selectedInvoiceData && (
        <Modal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          title="Simulate Bank Payment Settlement"
        >
          <form onSubmit={handleSimulatePayment} className="space-y-6">
            <div className="p-4 bg-slate-50 border border-slate-200/40 rounded-2xl dark:bg-slate-950/40 text-xs space-y-1.5">
              <p className="text-slate-500">You are initiating payment settlement for:</p>
              <p><strong>Invoice Number:</strong> {selectedInvoiceData.invoice.invoice_number}</p>
              <p><strong>Payee Company:</strong> {selectedInvoiceData.client.company_name}</p>
              <p className="text-brand-600 font-extrabold"><strong>Grand Total:</strong> INR {parseFloat(selectedInvoiceData.invoice.total_amount).toFixed(2)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label">Payment Mode *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="form-input text-xs py-2.5 cursor-pointer"
                >
                  <option value="NEFT">NEFT (National Electronic Funds Transfer)</option>
                  <option value="IMPS">IMPS (Immediate Payment Service)</option>
                  <option value="UPI">UPI (Unified Payments Interface)</option>
                  <option value="Card">Corporate Credit Card</option>
                </select>
              </div>

              <div>
                <label className="form-label">Transaction Reference Number / UTR *</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. N135218584821 or UPI932085"
                  className="form-input text-xs"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-250/20 text-emerald-800 text-[10px] flex gap-2 items-start dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">
                This simulated transaction updates the database ledger instantly, changes the invoice status to PAID, and registers an audit payment record.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end border-t border-slate-200/50 pt-4 mt-6 dark:border-slate-800/50">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPaying}
                className="btn-success text-xs flex items-center gap-1.5"
              >
                <CreditCard size={14} /> {isPaying ? 'Processing...' : 'Settle Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default Invoices;
