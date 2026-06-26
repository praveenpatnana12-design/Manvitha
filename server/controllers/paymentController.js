const db = require('../config/db');

// List all payments
exports.getPayments = async (req, res) => {
  const { clientId } = req.query;

  let filterClientId = clientId;
  if (req.user.role === 'client') {
    filterClientId = req.user.clientId;
  }

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      let filtered = [...data.payments];

      if (filterClientId) {
        filtered = filtered.filter(p => p.client_id === parseInt(filterClientId));
      }

      // Attach client company names and invoice reference numbers
      const result = filtered.map(p => {
        const client = data.corporate_clients.find(c => c.id === p.client_id) || {};
        const invoice = data.invoices.find(i => i.id === p.invoice_id) || {};
        return {
          ...p,
          company_name: client.company_name,
          invoice_number: invoice.invoice_number || 'N/A'
        };
      });

      result.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
      return res.json(result);
    } else {
      // MySQL Mode
      let queryStr = `
        SELECT p.*, c.company_name, i.invoice_number
        FROM payments p
        JOIN corporate_clients c ON p.client_id = c.id
        LEFT JOIN invoices i ON p.invoice_id = i.id
        WHERE 1=1
      `;
      const params = [];

      if (filterClientId) {
        queryStr += ' AND p.client_id = ?';
        params.push(filterClientId);
      }

      queryStr += ' ORDER BY p.payment_date DESC';

      const [payments] = await db.getPool().execute(queryStr, params);
      return res.json(payments);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Record a payment (and automatically mark the linked invoice as paid)
exports.recordPayment = async (req, res) => {
  const { invoice_id, client_id, amount, payment_method, transaction_reference } = req.body;

  if (!client_id || !amount || !payment_method || !transaction_reference) {
    return res.status(400).json({ message: 'Please provide client_id, amount, payment_method, and transaction_reference' });
  }

  try {
    const payAmount = parseFloat(amount);
    const date = new Date();

    if (db.isMock()) {
      const data = db.mock.load();
      
      const newPayment = {
        id: data.payments.length + 1,
        invoice_id: invoice_id ? parseInt(invoice_id) : null,
        client_id: parseInt(client_id),
        amount: payAmount,
        payment_date: date,
        payment_method,
        transaction_reference,
        status: 'success',
        created_at: date
      };

      data.payments.push(newPayment);

      // If an invoice_id was specified, mark it as paid
      if (invoice_id) {
        const invIdx = data.invoices.findIndex(i => i.id === parseInt(invoice_id));
        if (invIdx !== -1) {
          data.invoices[invIdx].status = 'paid';
          
          // Send notification
          const client = data.corporate_clients.find(c => c.id === parseInt(client_id));
          if (client) {
            data.notifications.push({
              id: data.notifications.length + 1,
              user_id: client.user_id,
              type: 'invoice',
              message: `Payment received for Invoice ${data.invoices[invIdx].invoice_number}. Thank you!`,
              is_read: false,
              created_at: new Date()
            });
          }
        }
      }

      db.mock.save(data);

      return res.status(201).json({ message: 'Payment recorded successfully', payment: newPayment });
    } else {
      // MySQL Transaction mode
      const connection = await db.getPool().getConnection();
      try {
        await connection.beginTransaction();

        // 1. Insert payment record
        const [paymentResult] = await connection.execute(
          `INSERT INTO payments 
           (invoice_id, client_id, amount, payment_date, payment_method, transaction_reference, status) 
           VALUES (?, ?, ?, ?, ?, ?, 'success')`,
          [invoice_id || null, client_id, payAmount, date, payment_method, transaction_reference]
        );

        // 2. Mark invoice as paid
        if (invoice_id) {
          await connection.execute(
            'UPDATE invoices SET status = "paid" WHERE id = ?',
            [invoice_id]
          );

          // Get invoice number and client user_id
          const [invoices] = await connection.execute(
            'SELECT i.invoice_number, c.user_id FROM invoices i JOIN corporate_clients c ON i.client_id = c.id WHERE i.id = ?',
            [invoice_id]
          );

          if (invoices.length > 0) {
            const invoice = invoices[0];
            // Send system notification
            await connection.execute(
              'INSERT INTO notifications (user_id, type, message) VALUES (?, "invoice", ?)',
              [invoice.user_id, `Payment received for Invoice ${invoice.invoice_number}. Thank you!`]
            );
          }
        }

        await connection.commit();
        connection.release();

        return res.status(201).json({ 
          message: 'Payment recorded successfully', 
          paymentId: paymentResult.insertId 
        });
      } catch (err) {
        await connection.rollback();
        connection.release();
        throw err;
      }
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
