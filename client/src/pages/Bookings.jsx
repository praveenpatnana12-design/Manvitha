import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { Plus, Search, Calendar, MapPin, Navigation, Car, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const Bookings = () => {
  const { user } = useAuth();
  const isAdminOrAccounts = user.role === 'admin' || user.role === 'accounts';

  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Form Fields
  const [formClientId, setFormClientId] = useState('');
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formDriverId, setFormDriverId] = useState('');
  const [formTripDate, setFormTripDate] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formDistance, setFormDistance] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formToll, setFormToll] = useState('0');
  const [formOther, setFormOther] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedClientFilter) {
        params.clientId = selectedClientFilter;
      }
      const response = await api.get('/api/bookings', { params });
      setBookings(response.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch bookings history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    if (!isAdminOrAccounts) return;
    try {
      const [cRes, vRes, dRes] = await Promise.all([
        api.get('/api/clients'),
        api.get('/api/bookings/vehicles'),
        api.get('/api/bookings/drivers')
      ]);
      setClients(cRes.data);
      setVehicles(vRes.data);
      setDrivers(dRes.data);
    } catch (err) {
      console.error('Failed to fetch modal dropdowns:', err);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedClientFilter]);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!formClientId || !formVehicleId || !formDriverId || !formTripDate || !formSource || !formDestination || !formDistance || !formRate) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/bookings', {
        client_id: formClientId,
        vehicle_id: formVehicleId,
        driver_id: formDriverId,
        trip_date: formTripDate,
        source: formSource,
        destination: formDestination,
        distance_km: parseFloat(formDistance),
        rate_per_km: parseFloat(formRate),
        toll_charges: parseFloat(formToll || 0),
        other_charges: parseFloat(formOther || 0)
      });

      showToast('New trip booking logged successfully!', 'success');
      setIsModalOpen(false);
      
      // Reset Form
      setFormClientId('');
      setFormVehicleId('');
      setFormDriverId('');
      setFormTripDate('');
      setFormSource('');
      setFormDestination('');
      setFormDistance('');
      setFormRate('');
      setFormToll('0');
      setFormOther('0');

      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to log booking.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter local results based on text query
  const filteredBookings = bookings.filter(b => 
    b.source.toLowerCase().includes(search.toLowerCase()) ||
    b.destination.toLowerCase().includes(search.toLowerCase()) ||
    (b.company_name && b.company_name.toLowerCase().includes(search.toLowerCase())) ||
    (b.registration_number && b.registration_number.toLowerCase().includes(search.toLowerCase())) ||
    (b.driver_name && b.driver_name.toLowerCase().includes(search.toLowerCase()))
  );

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
      
      {/* Toast popup */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />

      {/* Header plate */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            {isAdminOrAccounts ? 'Trips & Bookings Ledger' : 'Your Trip Usage History'}
          </h2>
          <p className="text-xs text-slate-500">
            {isAdminOrAccounts ? 'Log completed bookings, assign fleet drivers, and compute trip billing' : 'Verify route distances, check vehicle assignments, and track billing details'}
          </p>
        </div>
        
        {isAdminOrAccounts && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center justify-center gap-1.5 self-start text-xs font-semibold"
          >
            <Plus size={16} /> Log Booking
          </button>
        )}
      </div>

      {/* Filters & Searches */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm dark:bg-slate-900 dark:border-slate-850">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by source, destination, driver, vehicle..."
            className="form-input pl-9.5 text-xs py-2"
          />
        </div>

        {/* Admin only filter by client dropdown */}
        {isAdminOrAccounts && (
          <div className="w-full md:w-56">
            <select
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              className="form-input text-xs py-2 cursor-pointer"
            >
              <option value="">All Corporate Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-4 ml-auto text-xs font-semibold text-slate-500 shrink-0">
          <span>Trips Listed: {filteredBookings.length}</span>
        </div>
      </div>

      {/* Bookings Table card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-850">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-20 text-center text-slate-400 italic text-xs">
            No completed trip bookings logged in this scope.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/40 dark:bg-slate-950/20 dark:border-slate-850">
                  {isAdminOrAccounts && <th className="px-6 py-4">Corporate Client</th>}
                  <th className="px-6 py-4">Trip Date & Time</th>
                  <th className="px-6 py-4">Route Details</th>
                  <th className="px-6 py-4">Vehicle Details</th>
                  <th className="px-6 py-4">Driver Assigned</th>
                  <th className="px-6 py-4 text-right">Distance & Rates</th>
                  <th className="px-6 py-4 text-right">Trip Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/40 transition-colors dark:hover:bg-slate-800/10">
                    
                    {isAdminOrAccounts && (
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                        {b.company_name}
                      </td>
                    )}
                    
                    <td className="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">
                      {formatDate(b.trip_date)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-0.5 max-w-xs">
                        <p className="flex items-center gap-1 text-slate-700 dark:text-slate-350">
                          <MapPin size={12} className="text-brand-500 shrink-0" />
                          <span className="truncate" title={b.source}>{b.source}</span>
                        </p>
                        <p className="flex items-center gap-1 text-slate-500">
                          <Navigation size={12} className="text-emerald-500 shrink-0" />
                          <span className="truncate" title={b.destination}>{b.destination}</span>
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{b.registration_number}</p>
                        <p className="text-[10px] text-slate-400">{b.vehicle_model}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      <p className="font-medium text-slate-700 dark:text-slate-350">{b.driver_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{b.driver_phone}</p>
                    </td>

                    <td className="px-6 py-4 text-right font-mono">
                      <p className="text-slate-700 dark:text-slate-350">{parseFloat(b.distance_km).toFixed(1)} km</p>
                      <p className="text-[10px] text-slate-400">@ INR {parseFloat(b.rate_per_km).toFixed(2)}/km</p>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          INR {parseFloat(b.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          GST 5%: INR {parseFloat(b.gst_amount).toFixed(2)}
                        </p>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Booking Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Completed Booking Trip"
      >
        <form onSubmit={handleCreateBooking} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Client selection */}
            <div>
              <label className="form-label">Corporate Client *</label>
              <select
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
                className="form-input text-xs py-2.5 cursor-pointer"
                required
              >
                <option value="">Select Corporate Account</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            {/* Trip Date */}
            <div>
              <label className="form-label">Trip Date & Time *</label>
              <input
                type="datetime-local"
                value={formTripDate}
                onChange={(e) => setFormTripDate(e.target.value)}
                className="form-input text-xs py-2"
                required
              />
            </div>

            {/* Vehicle Selection */}
            <div>
              <label className="form-label">Assign Vehicle *</label>
              <select
                value={formVehicleId}
                onChange={(e) => setFormVehicleId(e.target.value)}
                className="form-input text-xs py-2.5 cursor-pointer"
                required
              >
                <option value="">Select Fleet Vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registration_number} ({v.model})</option>
                ))}
              </select>
            </div>

            {/* Driver Selection */}
            <div>
              <label className="form-label">Assign Driver *</label>
              <select
                value={formDriverId}
                onChange={(e) => setFormDriverId(e.target.value)}
                className="form-input text-xs py-2.5 cursor-pointer"
                required
              >
                <option value="">Select active Driver</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                ))}
              </select>
            </div>

            {/* Source Route */}
            <div>
              <label className="form-label">Source / Pick-up Location *</label>
              <input
                type="text"
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                placeholder="e.g. E-City Campus"
                className="form-input text-xs"
                required
              />
            </div>

            {/* Destination Route */}
            <div>
              <label className="form-label">Destination / Drop-off Location *</label>
              <input
                type="text"
                value={formDestination}
                onChange={(e) => setFormDestination(e.target.value)}
                placeholder="e.g. Bangalore Airport"
                className="form-input text-xs"
                required
              />
            </div>

            {/* Distance */}
            <div>
              <label className="form-label">Distance (km) *</label>
              <input
                type="number"
                step="0.1"
                value={formDistance}
                onChange={(e) => setFormDistance(e.target.value)}
                placeholder="e.g. 52.5"
                className="form-input text-xs"
                required
              />
            </div>

            {/* Rate/km */}
            <div>
              <label className="form-label">Rate per km (INR) *</label>
              <input
                type="number"
                step="0.1"
                value={formRate}
                onChange={(e) => setFormRate(e.target.value)}
                placeholder="e.g. 15.00"
                className="form-input text-xs"
                required
              />
            </div>

            {/* Toll */}
            <div>
              <label className="form-label">Toll Charges (INR)</label>
              <input
                type="number"
                value={formToll}
                onChange={(e) => setFormToll(e.target.value)}
                placeholder="0"
                className="form-input text-xs"
              />
            </div>

            {/* Other */}
            <div>
              <label className="form-label">Other/Parking Charges (INR)</label>
              <input
                type="number"
                value={formOther}
                onChange={(e) => setFormOther(e.target.value)}
                placeholder="0"
                className="form-input text-xs"
              />
            </div>

          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-250/25 text-amber-800 text-[11px] flex gap-2 items-start dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              Billing totals will auto-calculate on submission. The platform adds a standard 5% transport GST to the taxable sum (taxable sum = distance &times; rate + tolls + other charges).
            </p>
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
              <Car size={14} /> {isSubmitting ? 'Logging...' : 'Log Trip Entry'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Bookings;
