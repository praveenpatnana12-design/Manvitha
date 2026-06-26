const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('../config/db');
const pdfGen = require('../utils/pdfGenerator');
const csvGen = require('../utils/csvGenerator');
const emailService = require('../utils/emailService');

// Helper to determine GST split
const calculateGSTSplit = (gstNumber, taxableAmount) => {
  const isIntrastate = gstNumber && gstNumber.startsWith('29'); // 29 is Karnataka
  const totalGst = taxableAmount * 0.05; // 5% standard rate

  if (isIntrastate) {
    return {
      cgst: totalGst / 2,
      sgst: totalGst / 2,
      igst: 0,
      totalGst
    };
  } else {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalGst,
      totalGst
    };
  }
};

// List all invoices
exports.getInvoices = async (req, res) => {
  const { clientId, status } = req.query;

  let filterClientId = clientId;
  if (req.user.role === 'client') {
    filterClientId = req.user.clientId;
  }

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      let filtered = [...data.invoices];

      if (filterClientId) {
        filtered = filtered.filter(i => i.client_id === parseInt(filterClientId));
      }
      if (status) {
        filtered = filtered.filter(i => i.status === status);
      }

      // Attach client company names
      const result = filtered.map(i => {
        const client = data.corporate_clients.find(c => c.id === i.client_id) || {};
        return {
          ...i,
          company_name: client.company_name,
          gst_number: client.gst_number
        };
      });

      result.sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date));
      return res.json(result);
    } else {
      // MySQL Mode
      let queryStr = `
        SELECT i.*, c.company_name, c.gst_number
        FROM invoices i
        JOIN corporate_clients c ON i.client_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (filterClientId) {
        queryStr += ' AND i.client_id = ?';
        params.push(filterClientId);
      }
      if (status) {
        queryStr += ' AND i.status = ?';
        params.push(status);
      }

      queryStr += ' ORDER BY i.invoice_date DESC';

      const [invoices] = await db.getPool().execute(queryStr, params);
      return res.json(invoices);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get invoice by ID with its list of bookings
exports.getInvoiceById = async (req, res) => {
  const { id } = req.params;

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      const invoice = data.invoices.find(i => i.id === parseInt(id));

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      // Client isolation check
      if (req.user.role === 'client' && invoice.client_id !== req.user.clientId) {
        return res.status(403).json({ message: 'Unauthorized access to invoice' });
      }

      const client = data.corporate_clients.find(c => c.id === invoice.client_id);
      
      // Pull bookings associated in the month of this invoice (mock assumption)
      const invDate = new Date(invoice.invoice_date);
      const startOfMonth = new Date(invDate.getFullYear(), invDate.getMonth(), 1);
      const endOfMonth = new Date(invDate.getFullYear(), invDate.getMonth() + 1, 0, 23, 59, 59);

      const bookings = data.bookings.filter(b => 
        b.client_id === invoice.client_id &&
        new Date(b.trip_date) >= startOfMonth &&
        new Date(b.trip_date) <= endOfMonth &&
        b.status === 'completed'
      );

      return res.json({ invoice, client, bookings });
    } else {
      // MySQL Mode
      const [invoices] = await db.getPool().execute(
        `SELECT i.*, c.company_name, c.gst_number, c.contact_person, c.email, c.phone, c.address 
         FROM invoices i 
         JOIN corporate_clients c ON i.client_id = c.id 
         WHERE i.id = ?`,
        [id]
      );

      if (invoices.length === 0) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      const invoice = invoices[0];
      if (req.user.role === 'client' && invoice.client_id !== req.user.clientId) {
        return res.status(403).json({ message: 'Unauthorized access to invoice' });
      }

      // Extract client info
      const client = {
        id: invoice.client_id,
        company_name: invoice.company_name,
        gst_number: invoice.gst_number,
        contact_person: invoice.contact_person,
        email: invoice.email,
        phone: invoice.phone,
        address: invoice.address
      };

      // Pull bookings in the invoice month
      const invDate = new Date(invoice.invoice_date);
      const startOfMonth = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
      const endOfMonth = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}-${new Date(invDate.getFullYear(), invDate.getMonth() + 1, 0).getDate()} 23:59:59`;

      const [bookings] = await db.getPool().execute(
        `SELECT b.*, v.registration_number, v.model as vehicle_model, d.name as driver_name 
         FROM bookings b
         JOIN vehicles v ON b.vehicle_id = v.id
         JOIN drivers d ON b.driver_id = d.id
         WHERE b.client_id = ? AND b.trip_date BETWEEN ? AND ? AND b.status = "completed"`,
        [invoice.client_id, startOfMonth, endOfMonth]
      );

      return res.json({ invoice, client, bookings });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate a new invoice
exports.generateInvoice = async (req, res) => {
  const { client_id, invoice_date, due_date } = req.body;

  if (!client_id || !invoice_date || !due_date) {
    return res.status(400).json({ message: 'Please provide client_id, invoice_date, and due_date' });
  }

  try {
    const invDateObj = new Date(invoice_date);
    const startOfMonth = new Date(invDateObj.getFullYear(), invDateObj.getMonth(), 1);
    const endOfMonth = new Date(invDateObj.getFullYear(), invDateObj.getMonth() + 1, 0, 23, 59, 59);

    if (db.isMock()) {
      const data = db.mock.load();
      const client = data.corporate_clients.find(c => c.id === parseInt(client_id));

      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }

      // 1. Gather bookings
      const bookings = data.bookings.filter(b => 
        b.client_id === client.id &&
        new Date(b.trip_date) >= startOfMonth &&
        new Date(b.trip_date) <= endOfMonth &&
        b.status === 'completed'
      );

      if (bookings.length === 0) {
        return res.status(400).json({ message: 'No completed trips found for this client in the selected billing cycle.' });
      }

      // 2. Calculations
      const taxable_amount = bookings.reduce((sum, b) => sum + (parseFloat(b.subtotal) + parseFloat(b.toll_charges) + parseFloat(b.other_charges)), 0);
      const gstSplit = calculateGSTSplit(client.gst_number, taxable_amount);
      const total_amount = taxable_amount + gstSplit.totalGst;

      // 3. Create Invoice Record
      const nextId = data.invoices.length + 1;
      const invoiceNumber = `INV-${invDateObj.getFullYear()}-${String(invDateObj.getMonth() + 1).padStart(2, '0')}-${String(nextId).padStart(3, '0')}`;
      
      const relativePdfPath = `/invoices/${invoiceNumber}.pdf`;
      const absolutePdfPath = process.env.VERCEL 
        ? path.join(os.tmpdir(), `${invoiceNumber}.pdf`)
        : path.join(__dirname, '..', 'public', 'invoices', `${invoiceNumber}.pdf`);

      const newInvoice = {
        id: nextId,
        invoice_number: invoiceNumber,
        client_id: client.id,
        invoice_date: new Date(invoice_date),
        due_date: new Date(due_date),
        taxable_amount,
        cgst: gstSplit.cgst,
        sgst: gstSplit.sgst,
        igst: gstSplit.igst,
        total_gst: gstSplit.totalGst,
        total_amount,
        status: 'pending',
        pdf_path: relativePdfPath,
        created_at: new Date()
      };

      // 4. Generate PDF
      await pdfGen.generateInvoicePDF(newInvoice, client, bookings, absolutePdfPath);

      data.invoices.push(newInvoice);

      // Create Notification for the client user
      const clientUser = data.users.find(u => u.id === client.user_id);
      if (clientUser) {
        data.notifications.push({
          id: data.notifications.length + 1,
          user_id: clientUser.id,
          type: 'invoice',
          message: `New Invoice ${invoiceNumber} of INR ${total_amount.toFixed(2)} generated for May/June billing cycle. Due date: ${due_date}.`,
          is_read: false,
          created_at: new Date()
        });
      }

      db.mock.save(data);

      // 5. Trigger Email Notification (Non-blocking)
      emailService.sendEmail({
        to: client.email,
        subject: `New Invoice Generated - ${invoiceNumber} | Manivtha Tours & Travels`,
        text: `Dear ${client.contact_person},\n\nWe have generated invoice ${invoiceNumber} for your corporate account usage.\nTotal Amount Due: INR ${total_amount.toFixed(2)}\nDue Date: ${due_date}\n\nYou can log in to the portal to view the breakdown and download the statement.\n\nBest regards,\nAccounts Team\nManivtha Tours & Travels`,
        html: `<h3>Dear ${client.contact_person},</h3><p>We have generated invoice <strong>${invoiceNumber}</strong> for your corporate account usage.</p><p><strong>Total Amount Due:</strong> INR ${total_amount.toFixed(2)}<br/><strong>Due Date:</strong> ${due_date}</p><p>Please log in to the portal to view details and download reports.</p><p>Best regards,<br/>Accounts Team<br/>Manivtha Tours & Travels</p>`
      });

      return res.status(201).json({ message: 'Invoice generated successfully', invoice: newInvoice });
    } else {
      // MySQL Mode
      const [clients] = await db.getPool().execute(
        'SELECT * FROM corporate_clients WHERE id = ?',
        [client_id]
      );

      if (clients.length === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }

      const client = clients[0];

      // Gather bookings
      const startOfMonthStr = `${invDateObj.getFullYear()}-${String(invDateObj.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
      const endOfMonthStr = `${invDateObj.getFullYear()}-${String(invDateObj.getMonth() + 1).padStart(2, '0')}-${new Date(invDateObj.getFullYear(), invDateObj.getMonth() + 1, 0).getDate()} 23:59:59`;

      const [bookings] = await db.getPool().execute(
        'SELECT * FROM bookings WHERE client_id = ? AND trip_date BETWEEN ? AND ? AND status = "completed"',
        [client.id, startOfMonthStr, endOfMonthStr]
      );

      if (bookings.length === 0) {
        return res.status(400).json({ message: 'No completed trips found for this client in the selected billing cycle.' });
      }

      const taxable_amount = bookings.reduce((sum, b) => sum + (parseFloat(b.subtotal) + parseFloat(b.toll_charges) + parseFloat(b.other_charges)), 0);
      const gstSplit = calculateGSTSplit(client.gst_number, taxable_amount);
      const total_amount = taxable_amount + gstSplit.totalGst;

      // Create Invoice Number
      const [invCount] = await db.getPool().execute('SELECT COUNT(*) as count FROM invoices');
      const count = invCount[0].count + 1;
      const invoiceNumber = `INV-${invDateObj.getFullYear()}-${String(invDateObj.getMonth() + 1).padStart(2, '0')}-${String(count).padStart(3, '0')}`;

      const relativePdfPath = `/invoices/${invoiceNumber}.pdf`;
      const absolutePdfPath = process.env.VERCEL 
        ? path.join(os.tmpdir(), `${invoiceNumber}.pdf`)
        : path.join(__dirname, '..', 'public', 'invoices', `${invoiceNumber}.pdf`);

      const newInvoice = {
        invoice_number: invoiceNumber,
        client_id: client.id,
        invoice_date: invoice_date,
        due_date: due_date,
        taxable_amount,
        cgst: gstSplit.cgst,
        sgst: gstSplit.sgst,
        igst: gstSplit.igst,
        total_gst: gstSplit.totalGst,
        total_amount,
        status: 'pending',
        pdf_path: relativePdfPath
      };

      // Write to SQL
      const [insertResult] = await db.getPool().execute(
        `INSERT INTO invoices 
         (invoice_number, client_id, invoice_date, due_date, taxable_amount, cgst, sgst, igst, total_gst, total_amount, status, pdf_path) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceNumber, client.id, invoice_date, due_date, taxable_amount, 
          gstSplit.cgst, gstSplit.sgst, gstSplit.igst, gstSplit.totalGst, total_amount, 'pending', relativePdfPath
        ]
      );

      newInvoice.id = insertResult.insertId;

      // Generate PDF file
      await pdfGen.generateInvoicePDF(newInvoice, client, bookings, absolutePdfPath);

      // Create Notification
      await db.getPool().execute(
        'INSERT INTO notifications (user_id, type, message) VALUES (?, "invoice", ?)',
        [client.user_id, `New Invoice ${invoiceNumber} of INR ${total_amount.toFixed(2)} generated. Due date: ${due_date}.`]
      );

      // Trigger Email Alert
      emailService.sendEmail({
        to: client.email,
        subject: `New Invoice Generated - ${invoiceNumber} | Manivtha Tours & Travels`,
        text: `Dear ${client.contact_person},\n\nWe have generated invoice ${invoiceNumber} for your corporate account usage.\nTotal Amount Due: INR ${total_amount.toFixed(2)}\nDue Date: ${due_date}\n\nYou can log in to the portal to view the breakdown and download the statement.\n\nBest regards,\nAccounts Team\nManivtha Tours & Travels`,
        html: `<h3>Dear ${client.contact_person},</h3><p>We have generated invoice <strong>${invoiceNumber}</strong> for your corporate account usage.</p><p><strong>Total Amount Due:</strong> INR ${total_amount.toFixed(2)}<br/><strong>Due Date:</strong> ${due_date}</p><p>Please log in to the portal to view details and download reports.</p><p>Best regards,<br/>Accounts Team<br/>Manivtha Tours & Travels</p>`
      });

      return res.status(201).json({ message: 'Invoice generated successfully', invoice: newInvoice });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update invoice status (e.g. mark as paid)
exports.updateInvoice = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Please specify status' });
  }

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      const invoiceIdx = data.invoices.findIndex(i => i.id === parseInt(id));

      if (invoiceIdx === -1) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      data.invoices[invoiceIdx].status = status;
      db.mock.save(data);

      return res.json({ message: 'Invoice status updated successfully', invoice: data.invoices[invoiceIdx] });
    } else {
      const [existing] = await db.getPool().execute(
        'SELECT * FROM invoices WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      await db.getPool().execute(
        'UPDATE invoices SET status = ? WHERE id = ?',
        [status, id]
      );

      return res.json({ message: 'Invoice status updated successfully' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Stream Invoice PDF File
exports.downloadInvoicePDF = async (req, res) => {
  const { id } = req.params;

  try {
    let invoice = null;
    let client = null;
    let bookings = [];

    if (db.isMock()) {
      const data = db.mock.load();
      invoice = data.invoices.find(i => i.id === parseInt(id));
      if (invoice) {
        client = data.corporate_clients.find(c => c.id === invoice.client_id);
        const invDate = new Date(invoice.invoice_date);
        const startOfMonth = new Date(invDate.getFullYear(), invDate.getMonth(), 1);
        const endOfMonth = new Date(invDate.getFullYear(), invDate.getMonth() + 1, 0, 23, 59, 59);

        bookings = data.bookings.filter(b => 
          b.client_id === invoice.client_id &&
          new Date(b.trip_date) >= startOfMonth &&
          new Date(b.trip_date) <= endOfMonth &&
          b.status === 'completed'
        );
      }
    } else {
      const [invoices] = await db.getPool().execute(
        'SELECT * FROM invoices WHERE id = ?',
        [id]
      );
      if (invoices.length > 0) {
        invoice = invoices[0];
        const [clients] = await db.getPool().execute(
          'SELECT * FROM corporate_clients WHERE id = ?',
          [invoice.client_id]
        );
        client = clients[0];
        
        const invDate = new Date(invoice.invoice_date);
        const startOfMonthStr = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
        const endOfMonthStr = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}-${new Date(invDate.getFullYear(), invDate.getMonth() + 1, 0).getDate()} 23:59:59`;

        const [results] = await db.getPool().execute(
          'SELECT * FROM bookings WHERE client_id = ? AND trip_date BETWEEN ? AND ? AND status = "completed"',
          [invoice.client_id, startOfMonthStr, endOfMonthStr]
        );
        bookings = results;
      }
    }

    if (!invoice || !client) {
      return res.status(404).json({ message: 'Invoice or client details not found' });
    }

    // Client isolation check
    if (req.user.role === 'client' && invoice.client_id !== req.user.clientId) {
      return res.status(403).json({ message: 'Unauthorized access to invoice PDF' });
    }

    const invoiceNumber = invoice.invoice_number;
    const tempPdfPath = process.env.VERCEL
      ? path.join(os.tmpdir(), `${invoiceNumber}.pdf`)
      : path.join(__dirname, '..', 'public', 'invoices', `${invoiceNumber}.pdf`);

    // Ensure generated
    await pdfGen.generateInvoicePDF(invoice, client, bookings, tempPdfPath);

    if (fs.existsSync(tempPdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
      return fs.createReadStream(tempPdfPath).pipe(res);
    } else {
      return res.status(500).json({ message: 'Failed to generate PDF file' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Download Invoice CSV
exports.downloadInvoiceCSV = async (req, res) => {
  const { id } = req.params;

  try {
    let invoice = null;
    let bookings = [];

    if (db.isMock()) {
      const data = db.mock.load();
      invoice = data.invoices.find(i => i.id === parseInt(id));
      if (invoice) {
        const invDate = new Date(invoice.invoice_date);
        const startOfMonth = new Date(invDate.getFullYear(), invDate.getMonth(), 1);
        const endOfMonth = new Date(invDate.getFullYear(), invDate.getMonth() + 1, 0, 23, 59, 59);

        bookings = data.bookings.filter(b => 
          b.client_id === invoice.client_id &&
          new Date(b.trip_date) >= startOfMonth &&
          new Date(b.trip_date) <= endOfMonth &&
          b.status === 'completed'
        );
      }
    } else {
      const [invoices] = await db.getPool().execute('SELECT * FROM invoices WHERE id = ?', [id]);
      if (invoices.length > 0) {
        invoice = invoices[0];
        const invDate = new Date(invoice.invoice_date);
        const startOfMonthStr = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
        const endOfMonthStr = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}-${new Date(invDate.getFullYear(), invDate.getMonth() + 1, 0).getDate()} 23:59:59`;

        const [results] = await db.getPool().execute(
          'SELECT * FROM bookings WHERE client_id = ? AND trip_date BETWEEN ? AND ? AND status = "completed"',
          [invoice.client_id, startOfMonthStr, endOfMonthStr]
        );
        bookings = results;
      }
    }

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user.role === 'client' && invoice.client_id !== req.user.clientId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const headers = ['Trip Date', 'Source', 'Destination', 'Distance (km)', 'Rate/km', 'Toll Charges', 'Other Charges', 'Subtotal', 'GST Amount', 'Total Amount'];
    const keys = ['trip_date', 'source', 'destination', 'distance_km', 'rate_per_km', 'toll_charges', 'other_charges', 'subtotal', 'gst_amount', 'total_amount'];
    
    const csvContent = csvGen.generateCSV(headers, bookings, keys);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}_trips.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
