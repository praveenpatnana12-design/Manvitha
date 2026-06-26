const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup static files directories for generated files
const publicDir = path.join(__dirname, 'public');
const invoicesDir = path.join(publicDir, 'invoices');
const statementsDir = path.join(publicDir, 'statements');

if (!process.env.VERCEL) {
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }
  if (!fs.existsSync(statementsDir)) {
    fs.mkdirSync(statementsDir, { recursive: true });
  }
}

// Serve public directory statically
app.use(express.static(publicDir));

// Import routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const clientRoutes = require('./routes/clientRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const statementRoutes = require('./routes/statementRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/ai', aiRoutes);

// Health check API
app.get('/api/health', (req, res) => {
  const dbStatus = require('./config/db').isMock() ? 'mock-mode' : 'mysql-mode';
  res.json({
    status: 'healthy',
    message: 'Corporate Account Billing Portal API is running.',
    database: dbStatus,
    timestamp: new Date()
  });
});

// Serve frontend built React assets if they exist
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  
  // React Router fallback for deep routing links
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Manivtha Tours & Travels Portal API' });
  });
}

// Error handling middleware
app.use(errorHandler);

// Listen
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;
