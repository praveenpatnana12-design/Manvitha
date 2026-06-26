import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { FileDown, Calendar, Search, Percent, Calculator, FileSpreadsheet } from 'lucide-react';
import Toast from '../components/Toast';

const GST = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const fetchGSTData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/invoices');
      setInvoices(response.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch invoice tax records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGSTData();
  }, []);

  // Filter based on dates
  const filteredInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.invoice_date);
    if (startDate && invDate < new Date(startDate)) return false;
    if (endDate && invDate > new Date(endDate)) return false;
    return true;
  });

  // Aggregated totals
  const totalTaxable = filteredInvoices.reduce((sum, i) => sum + parseFloat(i.taxable_amount), 0);
  const totalCGST = filteredInvoices.reduce((sum, i) => sum + parseFloat(i.cgst), 0);
  const totalSGST = filteredInvoices.reduce((sum, i) => sum + parseFloat(i.sgst), 0);
  const totalIGST = filteredInvoices.reduce((sum, i) => sum + parseFloat(i.igst), 0);
  const totalGSTAmount = filteredInvoices.reduce((sum, i) => sum + parseFloat(i.total_gst), 0);
  const grandTotal = filteredInvoices.reduce((sum, i) => sum + parseFloat(i.total_amount), 0);

  const formatINR = (val) => {
    return 'INR ' + parseFloat(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const downloadGstReport = () => {
    // Generate CSV on the client side directly
    const headers = ['Invoice Number', 'Company Name', 'GSTIN', 'Invoice Date', 'Taxable Amount (INR)', 'CGST (2.5%)', 'SGST (2.5%)', 'IGST (5%)', 'Total GST (5%)', 'Grand Total (INR)', 'Status'];
    const rows = filteredInvoices.map(i => [
      i.invoice_number,
      i.company_name || 'Own Profile',
      i.gst_number || '29AABCM1029D1Z0',
      new Date(i.invoice_date).toLocaleDateString('en-IN'),
      parseFloat(i.taxable_amount).toFixed(2),
      parseFloat(i.cgst).toFixed(2),
      parseFloat(i.sgst).toFixed(2),
      parseFloat(i.igst).toFixed(2),
      parseFloat(i.total_gst).toFixed(2),
      parseFloat(i.total_amount).toFixed(2),
      i.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gst_tax_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('GST spreadsheet report downloaded successfully!', 'success');
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
            GST Tax Breakdown
          </h2>
          <p className="text-xs text-slate-500">
            Generate and export GST reports compliant with CGST, SGST, and IGST breakdowns
          </p>
        </div>
        <button
          onClick={downloadGstReport}
          disabled={filteredInvoices.length === 0}
          className="btn-primary flex items-center justify-center gap-1.5 self-start text-xs font-semibold"
        >
          <FileSpreadsheet size={16} /> Export GST Report
        </button>
      </div>

      {/* Date Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500 shrink-0">Period:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-input text-xs py-1.5"
            placeholder="Start Date"
          />
          <span className="text-xs text-slate-450">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="form-input text-xs py-1.5"
            placeholder="End Date"
          />
        </div>
        {(startDate || endDate) && (
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* GST Breakdown Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Taxable Amount */}
        <div className="p-4.5 bg-white rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taxable Subtotal</p>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-2 truncate" title={formatINR(totalTaxable)}>
            {formatINR(totalTaxable)}
          </h3>
          <span className="text-[9px] font-semibold text-slate-400">Total base cost</span>
        </div>

        {/* CGST */}
        <div className="p-4.5 bg-white rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CGST (2.5%)</p>
          <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-100 mt-2 truncate" title={formatINR(totalCGST)}>
            {formatINR(totalCGST)}
          </h3>
          <span className="text-[9px] font-semibold text-slate-400">Intrastate Central Tax</span>
        </div>

        {/* SGST */}
        <div className="p-4.5 bg-white rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SGST (2.5%)</p>
          <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-100 mt-2 truncate" title={formatINR(totalSGST)}>
            {formatINR(totalSGST)}
          </h3>
          <span className="text-[9px] font-semibold text-slate-400">Intrastate State Tax</span>
        </div>

        {/* IGST */}
        <div className="p-4.5 bg-white rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IGST (5%)</p>
          <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-100 mt-2 truncate" title={formatINR(totalIGST)}>
            {formatINR(totalIGST)}
          </h3>
          <span className="text-[9px] font-semibold text-slate-400">Interstate Unified Tax</span>
        </div>

        {/* Total GST */}
        <div className="p-4.5 bg-brand-50/40 rounded-2xl border border-brand-200/30 shadow-sm dark:bg-brand-950/10 dark:border-brand-900/30">
          <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Total GST (5%)</p>
          <h3 className="text-lg font-extrabold text-brand-600 dark:text-brand-400 mt-2 truncate" title={formatINR(totalGSTAmount)}>
            {formatINR(totalGSTAmount)}
          </h3>
          <span className="text-[9px] font-semibold text-slate-400">Combined Tax Volume</span>
        </div>

      </div>

      {/* GST Report Table card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-850">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-20 text-center text-slate-400 italic text-xs">
            No invoice records found in this range to break down GST.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/40 dark:bg-slate-950/20 dark:border-slate-850">
                  <th className="px-6 py-4">Invoice Number</th>
                  <th className="px-6 py-4">Client / GSTIN</th>
                  <th className="px-6 py-4">Invoice Date</th>
                  <th className="px-6 py-4 text-right">Taxable base</th>
                  <th className="px-6 py-4 text-right">CGST</th>
                  <th className="px-6 py-4 text-right">SGST</th>
                  <th className="px-6 py-4 text-right">IGST</th>
                  <th className="px-6 py-4 text-right">Total GST</th>
                  <th className="px-6 py-4 text-right">Invoice Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/40 transition-colors dark:hover:bg-slate-800/10">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{inv.invoice_number}</td>
                    
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-350">{inv.company_name || 'Own Profile'}</p>
                      <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">{inv.gst_number || '29AABCM1029D1Z0'}</p>
                    </td>

                    <td className="px-6 py-4 text-slate-500">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>

                    <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-350">
                      {parseFloat(inv.taxable_amount).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-slate-650 dark:text-slate-350">
                      {inv.cgst > 0 ? parseFloat(inv.cgst).toFixed(2) : '-'}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-slate-650 dark:text-slate-350">
                      {inv.sgst > 0 ? parseFloat(inv.sgst).toFixed(2) : '-'}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-slate-650 dark:text-slate-350">
                      {inv.igst > 0 ? parseFloat(inv.igst).toFixed(2) : '-'}
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-brand-600 dark:text-brand-400 font-mono">
                      {parseFloat(inv.total_gst).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-right font-extrabold text-slate-800 dark:text-slate-200 font-mono">
                      {parseFloat(inv.total_amount).toFixed(2)}
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

export default GST;
