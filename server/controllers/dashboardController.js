const db = require('../config/db');
const aiEngine = require('../utils/fallbackAI');

// GET /api/dashboard
exports.getDashboardMetrics = async (req, res) => {
  const isClient = req.user.role === 'client';
  const clientId = isClient ? req.user.clientId : null;

  try {
    let bookings = [];
    let invoices = [];
    let payments = [];
    let notifications = [];
    let clientName = 'All Corporate Accounts';

    if (db.isMock()) {
      const data = db.mock.load();
      
      // Filter based on client or show all for admin/accounts
      if (isClient) {
        const client = data.corporate_clients.find(c => c.id === clientId);
        if (client) clientName = client.company_name;

        bookings = data.bookings.filter(b => b.client_id === clientId);
        invoices = data.invoices.filter(i => i.client_id === clientId);
        payments = data.payments.filter(p => p.client_id === clientId);
      } else {
        bookings = [...data.bookings];
        invoices = [...data.invoices];
        payments = [...data.payments];
      }

      notifications = data.notifications
        .filter(n => n.user_id === req.user.id && !n.is_read)
        .slice(0, 5);
    } else {
      // MySQL Mode
      if (isClient) {
        const [clients] = await db.getPool().execute('SELECT company_name FROM corporate_clients WHERE id = ?', [clientId]);
        if (clients.length > 0) clientName = clients[0].company_name;

        const [bRes] = await db.getPool().execute('SELECT * FROM bookings WHERE client_id = ?', [clientId]);
        bookings = bRes;

        const [iRes] = await db.getPool().execute('SELECT * FROM invoices WHERE client_id = ?', [clientId]);
        invoices = iRes;

        const [pRes] = await db.getPool().execute('SELECT * FROM payments WHERE client_id = ?', [clientId]);
        payments = pRes;
      } else {
        const [bRes] = await db.getPool().execute('SELECT * FROM bookings');
        bookings = bRes;

        const [iRes] = await db.getPool().execute('SELECT * FROM invoices');
        invoices = iRes;

        const [pRes] = await db.getPool().execute('SELECT * FROM payments');
        payments = pRes;
      }

      const [nRes] = await db.getPool().execute(
        'SELECT * FROM notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC LIMIT 5',
        [req.user.id]
      );
      notifications = nRes;
    }

    // 1. Calculate Dashboard Metrics
    const completedTrips = bookings.filter(b => b.status === 'completed');
    const totalTripsCount = completedTrips.length;
    
    // Revenue counts (total invoiced)
    const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);
    const totalInvoicesCount = invoices.length;
    const totalGST = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_gst), 0);
    
    // Paid vs Outstanding
    const paidPayments = payments.filter(p => p.status === 'success').reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const pendingPayments = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((sum, i) => sum + parseFloat(i.total_amount), 0);

    // 2. Chart: Monthly Usage and Revenue (Past 6 months trend)
    // We group bookings/invoices by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize past 6 months structure
    const monthlyTrends = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      monthlyTrends[key] = { monthName: key, trips: 0, revenue: 0, monthNum: d.getMonth(), year: d.getFullYear() };
    }

    completedTrips.forEach(b => {
      const bDate = new Date(b.trip_date);
      const key = `${months[bDate.getMonth()]} ${bDate.getFullYear()}`;
      if (monthlyTrends[key]) {
        monthlyTrends[key].trips++;
      }
    });

    invoices.forEach(inv => {
      const invDate = new Date(inv.invoice_date);
      const key = `${months[invDate.getMonth()]} ${invDate.getFullYear()}`;
      if (monthlyTrends[key]) {
        monthlyTrends[key].revenue += parseFloat(inv.total_amount);
      }
    });

    const chartsData = {
      labels: Object.keys(monthlyTrends),
      tripsData: Object.values(monthlyTrends).map(t => t.trips),
      revenueData: Object.values(monthlyTrends).map(t => t.revenue)
    };

    // 3. Chart: Payment Status counts
    const paidInvoicesCount = invoices.filter(i => i.status === 'paid').length;
    const pendingInvoicesCount = invoices.filter(i => i.status === 'pending').length;
    const overdueInvoicesCount = invoices.filter(i => i.status === 'overdue').length;

    const paymentStatusChart = {
      labels: ['Paid', 'Pending', 'Overdue'],
      data: [paidInvoicesCount, pendingInvoicesCount, overdueInvoicesCount]
    };

    // 4. Generate direct AI insights summary for display in dashboard
    let billingInsights = null;
    if (isClient && completedTrips.length > 0) {
      billingInsights = await aiEngine.generateInsights(completedTrips, invoices, payments, clientName);
    } else {
      // General stats summary for Admins
      billingInsights = {
        billingSummary: `Platform running smoothly. Currently servicing ${isClient ? 1 : 'multiple'} corporate clients with ${completedTrips.length} active bookings registered. Total gross revenue generated INR ${totalRevenue.toLocaleString('en-IN')}.`,
        spendingAnalysis: `Average invoice amount is INR ${(totalInvoicesCount > 0 ? totalRevenue / totalInvoicesCount : 0).toFixed(2)}.`,
        frequentRoutes: ['Check Client Portals for route specifics'],
        delayedPaymentAlerts: [pendingPayments > 0 ? `Total outstanding balance is INR ${pendingPayments.toLocaleString('en-IN')}` : 'No overdue accounts.'],
        costOptimization: ['Verify fleet usage distributions to optimize corporate rates.']
      };
    }

    return res.json({
      metrics: {
        totalTrips: totalTripsCount,
        totalRevenue,
        totalInvoices: totalInvoicesCount,
        totalGST,
        pendingPayments,
        paidPayments
      },
      charts: {
        monthlyTrends: chartsData,
        paymentStatus: paymentStatusChart
      },
      notifications,
      insights: billingInsights
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error compiling dashboard', error: error.message });
  }
};
