const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('../config/db');
const pdfGen = require('../utils/pdfGenerator');
const csvGen = require('../utils/csvGenerator');
const emailService = require('../utils/emailService');

// Get all statements
exports.getStatements = async (req, res) => {
  const { clientId } = req.query;

  let filterClientId = clientId;
  if (req.user.role === 'client') {
    filterClientId = req.user.clientId;
  }

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      let filtered = [...data.statements];

      if (filterClientId) {
        filtered = filtered.filter(s => s.client_id === parseInt(filterClientId));
      }

      // Attach client company names
      const result = filtered.map(s => {
        const client = data.corporate_clients.find(c => c.id === s.client_id) || {};
        return {
          ...s,
          company_name: client.company_name,
          gst_number: client.gst_number
        };
      });

      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json(result);
    } else {
      // MySQL Mode
      let queryStr = `
        SELECT s.*, c.company_name, c.gst_number
        FROM statements s
        JOIN corporate_clients c ON s.client_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (filterClientId) {
        queryStr += ' AND s.client_id = ?';
        params.push(filterClientId);
      }

      queryStr += ' ORDER BY s.created_at DESC';

      const [statements] = await db.getPool().execute(queryStr, params);
      return res.json(statements);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate statement for a client in a period
exports.generateStatement = async (req, res) => {
  const { client_id, start_date, end_date } = req.body;

  if (!client_id || !start_date || !end_date) {
    return res.status(400).json({ message: 'Please provide client_id, start_date, and end_date' });
  }

  try {
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (db.isMock()) {
      const data = db.mock.load();
      const client = data.corporate_clients.find(c => c.id === parseInt(client_id));

      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }

      // Gather bookings in range
      const bookings = data.bookings.filter(b => 
        b.client_id === client.id &&
        new Date(b.trip_date) >= startDateObj &&
        new Date(b.trip_date) <= endDateObj &&
        b.status === 'completed'
      );

      // Gather invoices in range
      const invoices = data.invoices.filter(i => 
        i.client_id === client.id &&
        new Date(i.invoice_date) >= startDateObj &&
        new Date(i.invoice_date) <= endDateObj
      );

      // Gather payments in range
      const payments = data.payments.filter(p => 
        p.client_id === client.id &&
        new Date(p.payment_date) >= startDateObj &&
        new Date(p.payment_date) <= endDateObj &&
        p.status === 'success'
      );

      const totalBookings = bookings.length;
      const totalInvoiced = invoices.reduce((sum, i) => sum + parseFloat(i.total_amount), 0);
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const outstandingAmount = Math.max(0, totalInvoiced - totalPaid);

      const nextId = data.statements.length + 1;
      const statementNumber = `STMT-${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, '0')}-${String(nextId).padStart(3, '0')}`;
      
      const newStatement = {
        id: nextId,
        statement_number: statementNumber,
        client_id: client.id,
        start_date: startDateObj,
        end_date: endDateObj,
        total_bookings: totalBookings,
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        outstanding_amount: outstandingAmount,
        status: 'sent',
        created_at: new Date()
      };

      const absolutePdfPath = process.env.VERCEL 
        ? path.join(os.tmpdir(), `${statementNumber}.pdf`)
        : path.join(__dirname, '..', 'public', 'statements', `${statementNumber}.pdf`);

      // Generate PDF
      await pdfGen.generateStatementPDF(newStatement, client, invoices, payments, absolutePdfPath);

      data.statements.push(newStatement);

      // Create Notification for the client user
      const clientUser = data.users.find(u => u.id === client.user_id);
      if (clientUser) {
        data.notifications.push({
          id: data.notifications.length + 1,
          user_id: clientUser.id,
          type: 'statement',
          message: `Your consolidated Account Statement ${statementNumber} is ready for download. Period: ${start_date} to ${end_date}.`,
          is_read: false,
          created_at: new Date()
        });
      }

      db.mock.save(data);

      // Send email
      emailService.sendEmail({
        to: client.email,
        subject: `Monthly Account Statement Available - ${statementNumber} | Manivtha Tours & Travels`,
        text: `Dear ${client.contact_person},\n\nWe have generated your consolidated account statement for the period ${start_date} to ${end_date}.\nStatement Number: ${statementNumber}\nTotal Invoiced: INR ${totalInvoiced.toFixed(2)}\nOutstanding Balance: INR ${outstandingAmount.toFixed(2)}\n\nPlease log in to the portal to view and download the full reports.\n\nBest regards,\nAccounts Team\nManivtha Tours & Travels`,
        html: `<h3>Dear ${client.contact_person},</h3><p>Your consolidated account statement has been generated for the period <strong>${start_date} to ${end_date}</strong>.</p><p><strong>Statement Number:</strong> ${statementNumber}<br/><strong>Outstanding Balance:</strong> INR ${outstandingAmount.toFixed(2)}</p><p>Please log in to the portal to view and download reports.</p><p>Best regards,<br/>Accounts Team<br/>Manivtha Tours & Travels</p>`
      });

      return res.status(201).json({ message: 'Statement generated successfully', statement: newStatement });
    } else {
      // MySQL Mode
      const [clients] = await db.getPool().execute('SELECT * FROM corporate_clients WHERE id = ?', [client_id]);
      if (clients.length === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }
      const client = clients[0];

      const startDateStr = start_date + ' 00:00:00';
      const endDateStr = end_date + ' 23:59:59';

      // 1. Gather bookings
      const [bookings] = await db.getPool().execute(
        'SELECT * FROM bookings WHERE client_id = ? AND trip_date BETWEEN ? AND ? AND status = "completed"',
        [client.id, startDateStr, endDateStr]
      );

      // 2. Gather invoices
      const [invoices] = await db.getPool().execute(
        'SELECT * FROM invoices WHERE client_id = ? AND invoice_date BETWEEN ? AND ?',
        [client.id, start_date, end_date]
      );

      // 3. Gather payments
      const [payments] = await db.getPool().execute(
        'SELECT * FROM payments WHERE client_id = ? AND payment_date BETWEEN ? AND ? AND status = "success"',
        [client.id, startDateStr, endDateStr]
      );

      const totalBookings = bookings.length;
      const totalInvoiced = invoices.reduce((sum, i) => sum + parseFloat(i.total_amount), 0);
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const outstandingAmount = Math.max(0, totalInvoiced - totalPaid);

      // Create Statement Number
      const [stmtCount] = await db.getPool().execute('SELECT COUNT(*) as count FROM statements');
      const count = stmtCount[0].count + 1;
      const statementNumber = `STMT-${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, '0')}-${String(count).padStart(3, '0')}`;
      
      const relativePdfPath = `/statements/${statementNumber}.pdf`;
      const absolutePdfPath = process.env.VERCEL 
        ? path.join(os.tmpdir(), `${statementNumber}.pdf`)
        : path.join(__dirname, '..', 'public', 'statements', `${statementNumber}.pdf`);

      const [insertResult] = await db.getPool().execute(
        `INSERT INTO statements 
         (statement_number, client_id, start_date, end_date, total_bookings, total_invoiced, total_paid, outstanding_amount, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
        [statementNumber, client.id, start_date, end_date, totalBookings, totalInvoiced, totalPaid, outstandingAmount]
      );

      const statement = {
        id: insertResult.insertId,
        statement_number: statementNumber,
        client_id: client.id,
        start_date,
        end_date,
        total_bookings: totalBookings,
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        outstanding_amount: outstandingAmount,
        status: 'sent'
      };

      // Generate PDF file
      await pdfGen.generateStatementPDF(statement, client, invoices, payments, absolutePdfPath);

      // Create Notification
      await db.getPool().execute(
        'INSERT INTO notifications (user_id, type, message) VALUES (?, "statement", ?)',
        [client.user_id, `Account Statement ${statementNumber} is ready. Period: ${start_date} to ${end_date}.`]
      );

      // Trigger Email Alert
      emailService.sendEmail({
        to: client.email,
        subject: `Monthly Account Statement Available - ${statementNumber} | Manivtha Tours & Travels`,
        text: `Dear ${client.contact_person},\n\nWe have generated your consolidated account statement for the period ${start_date} to ${end_date}.\nStatement Number: ${statementNumber}\nTotal Invoiced: INR ${totalInvoiced.toFixed(2)}\nOutstanding Balance: INR ${outstandingAmount.toFixed(2)}\n\nPlease log in to the portal to view and download the full reports.\n\nBest regards,\nAccounts Team\nManivtha Tours & Travels`,
        html: `<h3>Dear ${client.contact_person},</h3><p>Your consolidated account statement has been generated for the period <strong>${start_date} to ${end_date}</strong>.</p><p><strong>Statement Number:</strong> ${statementNumber}<br/><strong>Outstanding Balance:</strong> INR ${outstandingAmount.toFixed(2)}</p><p>Please log in to the portal to view details and download reports.</p><p>Best regards,<br/>Accounts Team<br/>Manivtha Tours & Travels</p>`
      });

      return res.status(201).json({ message: 'Statement generated successfully', statement });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Stream Statement PDF
exports.downloadStatementPDF = async (req, res) => {
  const { id } = req.params;

  try {
    let statement = null;
    let client = null;
    let invoices = [];
    let payments = [];

    if (db.isMock()) {
      const data = db.mock.load();
      statement = data.statements.find(s => s.id === parseInt(id));
      if (statement) {
        client = data.corporate_clients.find(c => c.id === statement.client_id);
        const start = new Date(statement.start_date);
        const end = new Date(statement.end_date);

        invoices = data.invoices.filter(i => 
          i.client_id === statement.client_id &&
          new Date(i.invoice_date) >= start &&
          new Date(i.invoice_date) <= end
        );

        payments = data.payments.filter(p => 
          p.client_id === statement.client_id &&
          new Date(p.payment_date) >= start &&
          new Date(p.payment_date) <= end &&
          p.status === 'success'
        );
      }
    } else {
      const [stmts] = await db.getPool().execute('SELECT * FROM statements WHERE id = ?', [id]);
      if (stmts.length > 0) {
        statement = stmts[0];
        const [clients] = await db.getPool().execute('SELECT * FROM corporate_clients WHERE id = ?', [statement.client_id]);
        client = clients[0];

        const [invs] = await db.getPool().execute(
          'SELECT * FROM invoices WHERE client_id = ? AND invoice_date BETWEEN ? AND ?',
          [statement.client_id, statement.start_date, statement.end_date]
        );
        invoices = invs;

        const startStr = statement.start_date + ' 00:00:00';
        const endStr = statement.end_date + ' 23:59:59';
        const [pays] = await db.getPool().execute(
          'SELECT p.*, i.invoice_number FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id WHERE p.client_id = ? AND p.payment_date BETWEEN ? AND ? AND p.status = "success"',
          [statement.client_id, startStr, endStr]
        );
        payments = pays;
      }
    }

    if (!statement || !client) {
      return res.status(404).json({ message: 'Statement not found' });
    }

    if (req.user.role === 'client' && statement.client_id !== req.user.clientId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const statementNumber = statement.statement_number;
    const absolutePdfPath = process.env.VERCEL 
      ? path.join(os.tmpdir(), `${statementNumber}.pdf`)
      : path.join(__dirname, '..', 'public', 'statements', `${statementNumber}.pdf`);

    await pdfGen.generateStatementPDF(statement, client, invoices, payments, absolutePdfPath);

    if (fs.existsSync(absolutePdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${statementNumber}.pdf"`);
      return fs.createReadStream(absolutePdfPath).pipe(res);
    } else {
      return res.status(500).json({ message: 'Failed to stream PDF statement' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Stream Statement CSV containing summary + invoices
exports.downloadStatementCSV = async (req, res) => {
  const { id } = req.params;

  try {
    let statement = null;
    let invoices = [];

    if (db.isMock()) {
      const data = db.mock.load();
      statement = data.statements.find(s => s.id === parseInt(id));
      if (statement) {
        const start = new Date(statement.start_date);
        const end = new Date(statement.end_date);
        invoices = data.invoices.filter(i => 
          i.client_id === statement.client_id &&
          new Date(i.invoice_date) >= start &&
          new Date(i.invoice_date) <= end
        );
      }
    } else {
      const [stmts] = await db.getPool().execute('SELECT * FROM statements WHERE id = ?', [id]);
      if (stmts.length > 0) {
        statement = stmts[0];
        const [invs] = await db.getPool().execute(
          'SELECT * FROM invoices WHERE client_id = ? AND invoice_date BETWEEN ? AND ?',
          [statement.client_id, statement.start_date, statement.end_date]
        );
        invoices = invs;
      }
    }

    if (!statement) {
      return res.status(404).json({ message: 'Statement not found' });
    }

    if (req.user.role === 'client' && statement.client_id !== req.user.clientId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const headers = ['Invoice Number', 'Invoice Date', 'Due Date', 'Taxable Amount', 'Total GST', 'Total Amount', 'Status'];
    const keys = ['invoice_number', 'invoice_date', 'due_date', 'taxable_amount', 'total_gst', 'total_amount', 'status'];

    const csvContent = csvGen.generateCSV(headers, invoices, keys);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${statement.statement_number}_ledger.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
