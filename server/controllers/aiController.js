const db = require('../config/db');
const aiEngine = require('../utils/fallbackAI');

// POST /api/ai/billing-summary
exports.getBillingSummary = async (req, res) => {
  const { clientId } = req.body;

  let targetClientId = clientId;
  if (req.user.role === 'client') {
    targetClientId = req.user.clientId;
  }

  if (!targetClientId) {
    return res.status(400).json({ message: 'Please specify clientId' });
  }

  try {
    let clientName = '';
    let bookings = [];
    let invoices = [];
    let payments = [];

    if (db.isMock()) {
      const data = db.mock.load();
      const client = data.corporate_clients.find(c => c.id === parseInt(targetClientId));
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }

      clientName = client.company_name;
      bookings = data.bookings.filter(b => b.client_id === client.id && b.status === 'completed');
      invoices = data.invoices.filter(i => i.client_id === client.id);
      payments = data.payments.filter(p => p.client_id === client.id && p.status === 'success');
    } else {
      // MySQL Mode
      const [clients] = await db.getPool().execute('SELECT company_name FROM corporate_clients WHERE id = ?', [targetClientId]);
      if (clients.length === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }

      clientName = clients[0].company_name;

      const [bRes] = await db.getPool().execute('SELECT * FROM bookings WHERE client_id = ? AND status = "completed"', [targetClientId]);
      bookings = bRes;

      const [iRes] = await db.getPool().execute('SELECT * FROM invoices WHERE client_id = ?', [targetClientId]);
      invoices = iRes;

      const [pRes] = await db.getPool().execute('SELECT * FROM payments WHERE client_id = ? AND status = "success"', [targetClientId]);
      payments = pRes;
    }

    // Generate insights using AI utility (Gemini with rule fallback)
    const insights = await aiEngine.generateInsights(bookings, invoices, payments, clientName);

    return res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Server error generating AI insights', error: error.message });
  }
};
