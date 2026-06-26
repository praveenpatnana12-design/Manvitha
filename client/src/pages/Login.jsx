import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Car, Lock, User, AlertCircle, Info } from 'lucide-react';
import Toast from '../components/Toast';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('Please enter both username and password.', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (result.success) {
      showToast('Logged in successfully! Redirecting...', 'success');
      setTimeout(() => navigate('/'), 1000);
    } else {
      showToast(result.message || 'Login failed.', 'error');
    }
  };

  const handleForgotPassword = () => {
    showToast('Password reset link sent to your registered email! Check server console log.', 'info');
  };

  return (
    <div className="flex min-h-screen bg-slate-900 font-sans">
      
      {/* Toast popup */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />

      {/* Left Panel: Hero Graphic */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-brand-950 via-slate-950 to-brand-900 border-r border-slate-850">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-500 rounded-xl text-white">
            <Car size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide leading-none">
              MANIVTHA
            </h1>
            <span className="text-[10px] font-bold text-brand-400 tracking-wider">
              TOURS & TRAVELS
            </span>
          </div>
        </div>

        <div className="space-y-6 max-w-lg my-auto">
          <h2 className="text-4xl font-extrabold text-white tracking-tight leading-[115%] font-sans">
            Corporate Account Billing & Monthly Statement Portal
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Eliminate manual tracking. Log in to access monthly bookings statistics, print GST-breakdown invoices, download consolidated account ledgers, and manage payments effortlessly.
          </p>
          <div className="flex items-center gap-4 py-2 border-t border-slate-800">
            <div className="text-center">
              <p className="text-xl font-bold text-white">100%</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Automated</p>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-white">5%</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">GST Compliant</p>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-white">Real-Time</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Insights</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Manivtha Tours & Travels. All rights reserved.
        </p>
      </div>

      {/* Right Panel: Login Form Card */}
      <div className="flex items-center justify-center w-full lg:w-1/2 p-6 bg-slate-950">
        <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-850 rounded-3xl shadow-2xl">
          <div className="mb-8">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-brand-500/10 text-brand-400 mb-4 lg:hidden">
              <Car size={26} />
            </div>
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-xs text-slate-400 mt-1.5">Sign in to your corporate billing account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or client_name"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-650 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all duration-150 text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-650 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all duration-150 text-sm"
                />
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center w-full py-3 mt-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold rounded-xl hover:from-brand-700 hover:to-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all shadow-lg shadow-brand-950/40 disabled:opacity-50 disabled:pointer-events-none text-sm"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>

          {/* Quick login info for developers */}
          <div className="mt-8 p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl">
            <div className="flex gap-2 items-start text-[11px] text-slate-400">
              <Info size={14} className="text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-350">Quick Dev Accounts (Password: password123):</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Admin: <code className="bg-slate-900 text-brand-400 px-1 py-0.2 rounded text-[10px]">admin</code></li>
                  <li>Accounts Team: <code className="bg-slate-900 text-brand-400 px-1 py-0.2 rounded text-[10px]">accounts</code></li>
                  <li>Corporate Client: <code className="bg-slate-900 text-brand-400 px-1 py-0.2 rounded text-[10px]">infosys_billing</code></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;
