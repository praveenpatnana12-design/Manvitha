import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Building2, 
  CalendarRange, 
  FileText, 
  Percent, 
  CreditCard, 
  BookOpen, 
  HelpCircle, 
  Sparkles, 
  LogOut,
  Car
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAdminOrAccounts = user.role === 'admin' || user.role === 'accounts';

  // Navigation Links based on Role
  const navItems = isAdminOrAccounts 
    ? [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/clients', label: 'Corporate Clients', icon: Building2 },
        { path: '/bookings', label: 'Trips & Bookings', icon: CalendarRange },
        { path: '/invoices', label: 'Invoices', icon: FileText },
        { path: '/gst', label: 'GST Module', icon: Percent },
        { path: '/payments', label: 'Payments', icon: CreditCard },
        { path: '/statements', label: 'Statements', icon: BookOpen },
        { path: '/tickets', label: 'Support Tickets', icon: HelpCircle },
      ]
    : [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/bookings', label: 'Trip Usage', icon: CalendarRange },
        { path: '/invoices', label: 'Invoice Summary', icon: FileText },
        { path: '/gst', label: 'GST Summary', icon: Percent },
        { path: '/payments', label: 'Payment Tracker', icon: CreditCard },
        { path: '/statements', label: 'Statements', icon: BookOpen },
        { path: '/tickets', label: 'Support Queries', icon: HelpCircle },
        { path: '/ai-insights', label: 'AI Billing Insights', icon: Sparkles },
      ];

  const activeClass = "flex items-center gap-3 px-4 py-3 bg-brand-50 text-brand-600 font-semibold rounded-xl transition-all duration-200 border-l-4 border-brand-600 dark:bg-brand-950/20 dark:text-brand-400";
  const inactiveClass = "flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all duration-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100";

  return (
    <>
      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Sidebar */}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-200/60 transition-transform duration-300 lg:translate-x-0 lg:static dark:bg-slate-900 dark:border-slate-850 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200/60 dark:border-slate-850">
          <div className="p-2.5 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-xl text-white shadow-md shadow-brand-200 dark:shadow-none">
            <Car size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-wide dark:text-slate-100 font-sans leading-none">
              MANIVTHA
            </h1>
            <span className="text-[10px] font-bold text-brand-600 tracking-wider dark:text-brand-400">
              TOURS & TRAVELS
            </span>
          </div>
        </div>

        {/* User Info Capsule */}
        <div className="mx-4 my-5 p-3.5 bg-slate-50 border border-slate-200/30 rounded-2xl dark:bg-slate-950/40">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logged in as</p>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{user.username}</p>
          <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-brand-100 text-brand-700 mt-1 dark:bg-brand-950/30 dark:text-brand-400">
            {user.role}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => isActive ? activeClass : inactiveClass}
                onClick={() => {
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
              >
                <Icon size={18} className="shrink-0" />
                <span className="text-sm tracking-wide">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-850">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 font-semibold dark:hover:bg-red-950/20"
          >
            <LogOut size={18} className="shrink-0" />
            <span className="text-sm tracking-wide">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
