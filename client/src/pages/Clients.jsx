import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { Plus, Search, Building2, UserPlus, CreditCard, ShieldAlert } from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Form Fields
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/clients');
      setClients(response.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch corporate accounts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!companyName || !gstNumber || !contactPerson || !email || !phone || !address || !username || !password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    
    if (gstNumber.length !== 15) {
      showToast('GSTIN must be exactly 15 characters.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/clients', {
        company_name: companyName,
        gst_number: gstNumber.toUpperCase(),
        contact_person: contactPerson,
        email,
        phone,
        address,
        credit_limit: creditLimit ? parseFloat(creditLimit) : 100000,
        username,
        password
      });

      showToast('Client and portal credentials registered successfully!', 'success');
      setIsModalOpen(false);
      
      // Reset form
      setCompanyName('');
      setGstNumber('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCreditLimit('');
      setUsername('');
      setPassword('');

      fetchClients();
    } catch (error) {
      showToast(error.response?.data?.message || 'Error registering client.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter clients based on search query
  const filteredClients = clients.filter(c => 
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.gst_number.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person.toLowerCase().includes(search.toLowerCase())
  );

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
            Corporate Client Profiles
          </h2>
          <p className="text-xs text-slate-500">Manage client details, credit parameters, and portal logins</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-1.5 self-start text-xs font-semibold"
        >
          <Plus size={16} /> Register Client
        </button>
      </div>

      {/* Search Filter and Metrics */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, GST, contact..."
            className="form-input pl-9.5 text-xs py-2"
          />
        </div>
        <div className="flex gap-4 ml-auto text-xs font-semibold text-slate-500 shrink-0">
          <span>Active Accounts: {clients.length}</span>
        </div>
      </div>

      {/* Clients Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-850">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-20 text-center text-slate-400 italic text-xs">
            No corporate accounts found matching the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/40 dark:bg-slate-950/20 dark:border-slate-850">
                  <th className="px-6 py-4">Client Company</th>
                  <th className="px-6 py-4">GST Number</th>
                  <th className="px-6 py-4">Contact Key</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4 text-right">Credit Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/40 transition-colors dark:hover:bg-slate-800/10">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-50 text-brand-600 rounded-xl dark:bg-brand-950/20 dark:text-brand-400">
                          <Building2 size={16} />
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{client.company_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-500 uppercase">{client.gst_number}</td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-350">{client.contact_person}</td>
                    <td className="px-6 py-4 text-slate-500">{client.email}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{client.phone}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                      INR {parseFloat(client.credit_limit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Corporate Client"
      >
        <form onSubmit={handleCreateClient} className="space-y-6" autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Section 1: Company Profile */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 dark:border-slate-800">
                Company Details
              </h4>
            </div>

            <div>
              <label className="form-label">Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Infosys Limited"
                className="form-input text-xs"
                required
              />
            </div>

            <div>
              <label className="form-label">GST Number (GSTIN) *</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="e.g. 29AAACI4350Q1ZS"
                maxLength={15}
                className="form-input text-xs uppercase font-mono"
                required
              />
            </div>

            <div>
              <label className="form-label">Contact Person Name *</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Sudha Murthy"
                className="form-input text-xs"
                required
              />
            </div>

            <div>
              <label className="form-label">Credit Limit (INR) *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs font-bold">
                  INR
                </span>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="100000"
                  className="form-input text-xs pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. billing@infosys.com"
                className="form-input text-xs"
                required
              />
            </div>

            <div>
              <label className="form-label">Phone Number *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 80 2852 0261"
                className="form-input text-xs"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Billing Address *</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete billing address"
                className="form-input text-xs h-20 resize-none"
                required
              />
            </div>

            {/* Section 2: Portal Credentials */}
            <div className="space-y-4 md:col-span-2 mt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 dark:border-slate-800">
                Portal Login Credentials
              </h4>
            </div>

            <div>
              <label className="form-label">Desired Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. infosys_billing"
                className="form-input text-xs"
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label className="form-label">Portal Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input text-xs"
                autoComplete="new-password"
                required
              />
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end border-t border-slate-200/50 pt-4 mt-6 dark:border-slate-800/50">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <UserPlus size={14} /> {isSubmitting ? 'Registering...' : 'Register Client Account'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Clients;
