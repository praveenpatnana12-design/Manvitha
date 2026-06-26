import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { Bell, Sun, Moon, Menu, User, Check } from 'lucide-react';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Apply dark mode theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Fetch notifications from dashboard API on load and periodically
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/dashboard');
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // 30s polling
      return () => clearInterval(interval);
    }
  }, [user]);

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleMarkAsRead = async (notifId) => {
    try {
      // Optimistic state update
      setNotifications(notifications.filter(n => n.id !== notifId));
      
      // Attempt backend API call (handled gracefully in backend or mock)
      // For simplicity, we can do a mock post if needed
      // api.put(`/api/dashboard/notifications/${notifId}/read`);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-850">
      {/* Left section: Mobile menu and brand title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-slate-500 rounded-lg hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-sans tracking-wide leading-none">
            Billing Portal
          </h2>
          <span className="text-[10px] text-slate-400 font-medium">Manivtha Tours & Travels</span>
        </div>
      </div>

      {/* Right section: Control buttons, notification, theme, and profile */}
      <div className="flex items-center gap-3">
        
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 rounded-xl hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowProfileDropdown(false);
            }}
            className="relative p-2 text-slate-500 rounded-xl hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white animate-pulse">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-3.5 w-80 origin-top-right rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl ring-1 ring-black/5 focus:outline-none dark:border-slate-850 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-150 px-3 pb-2 dark:border-slate-850">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Alerts & Notifications</span>
                <span className="text-[10px] font-medium text-slate-400">{notifications.length} Unread</span>
              </div>
              <div className="mt-1.5 max-h-60 overflow-y-auto space-y-1">
                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-450 italic dark:text-slate-500">
                    No new alerts
                  </p>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className="group flex gap-2.5 items-start p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border border-transparent hover:border-slate-200/40"
                    >
                      <div className="h-2 w-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] leading-normal text-slate-600 dark:text-slate-300">
                          {notif.message}
                        </p>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {new Date(notif.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-1 text-slate-400 hover:text-emerald-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                        title="Dismiss"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotifDropdown(false);
            }}
            className="flex items-center gap-2.5 p-1 text-slate-600 rounded-xl hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <div className="flex items-center justify-center h-8.5 w-8.5 rounded-full bg-gradient-to-tr from-brand-600 to-brand-500 text-white font-bold text-xs shadow-sm">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left md:block pr-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {user.username}
              </p>
              <p className="text-[9px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wide">
                {user.role}
              </p>
            </div>
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-3.5 w-52 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-850 dark:bg-slate-900">
              <div className="px-3.5 py-2.5 border-b border-slate-150 dark:border-slate-850">
                <p className="text-xs text-slate-400">Signed in as</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 mt-1 text-xs text-red-500 hover:bg-red-50 rounded-xl transition-colors dark:hover:bg-red-950/20 font-semibold"
              >
                Logout Account
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
