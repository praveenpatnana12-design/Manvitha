import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Page Imports
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Bookings from './pages/Bookings';
import Invoices from './pages/Invoices';
import GST from './pages/GST';
import Payments from './pages/Payments';
import Statements from './pages/Statements';
import Tickets from './pages/Tickets';
import AIInsights from './pages/AIInsights';

// Route protection component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
        </div>
        <p className="mt-4 text-xs font-bold text-slate-400 tracking-wider uppercase animate-pulse">
          Validating Portal Session...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Navigation Sidebar Drawer */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content Pane */}
      <div className="relative flex flex-col flex-1 overflow-y-auto">
        <Navbar toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            
            {/* Bookings, Invoices, GST, Payments, Statements, Tickets are accessible to all authenticated roles */}
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/gst" element={<GST />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/statements" element={<Statements />} />
            <Route path="/tickets" element={<Tickets />} />
            
            {/* Admin & Accounts Only */}
            <Route 
              path="/clients" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <Clients />
                </ProtectedRoute>
              } 
            />
            
            {/* Client Only */}
            <Route 
              path="/ai-insights" 
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <AIInsights />
                </ProtectedRoute>
              } 
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
