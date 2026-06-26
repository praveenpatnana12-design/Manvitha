const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure directory exists
const ensureDirectoryExistence = (filePath) => {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
};

const formatCurrency = (num) => {
  return 'INR ' + parseFloat(num).toFixed(2);
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Generates an Invoice PDF
 */
const generateInvoicePDF = (invoice, client, bookings, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      ensureDirectoryExistence(outputPath);
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // --- Header ---
      doc.fillColor('#074087')
         .fontSize(20)
         .text('MANIVTHA TOURS & TRAVELS', 50, 50, { bold: true });
      
      doc.fillColor('#334155')
         .fontSize(9)
         .text('Corporate Office: #12, 1st Cross, Electronic City Phase 1, Bangalore - 560100', 50, 75)
         .text('Email: booking@manvithatours.com | Phone: +91 98765 43210', 50, 88)
         .text('GSTIN: 29AABCM1029D1Z0', 50, 101);

      doc.fillColor('#0f172a')
         .fontSize(24)
         .text('INVOICE', 400, 50, { align: 'right' });

      doc.fontSize(9)
         .text(`Invoice No: ${invoice.invoice_number}`, 400, 80, { align: 'right' })
         .text(`Date: ${formatDate(invoice.invoice_date)}`, 400, 93, { align: 'right' })
         .text(`Due Date: ${formatDate(invoice.due_date)}`, 400, 106, { align: 'right' })
         .text(`Status: ${invoice.status.toUpperCase()}`, 400, 119, { align: 'right' });

      // Draw horizontal divider
      doc.moveTo(50, 140).lineTo(550, 140).strokeColor('#cbd5e1').stroke();

      // --- Client Details ---
      doc.fillColor('#074087').fontSize(12).text('BILL TO:', 50, 160, { bold: true });
      doc.fillColor('#0f172a').fontSize(10)
         .text(client.company_name, 50, 178, { bold: true })
         .text(`GSTIN: ${client.gst_number}`, 50, 192)
         .text(`Contact: ${client.contact_person} (${client.phone})`, 50, 206)
         .text(client.address, 50, 220, { width: 250 });

      // --- Trip Summary Section ---
      doc.fillColor('#074087').fontSize(12).text('TRIP LISTING', 50, 275, { bold: true });

      // Table Header
      let y = 300;
      doc.rect(50, y, 500, 20).fill('#cbd5e1');
      doc.fillColor('#1e293b').fontSize(8)
         .text('Trip Date', 55, y + 6, { bold: true })
         .text('Source -> Destination', 120, y + 6, { bold: true })
         .text('Dist (km)', 280, y + 6, { align: 'right', bold: true })
         .text('Rate/km', 330, y + 6, { align: 'right', bold: true })
         .text('Toll/Other', 390, y + 6, { align: 'right', bold: true })
         .text('Subtotal', 450, y + 6, { align: 'right', bold: true })
         .text('Total', 500, y + 6, { align: 'right', bold: true });

      // Table Rows
      y += 20;
      doc.fillColor('#334155');
      bookings.forEach((booking, idx) => {
        // Alternating row background
        if (idx % 2 === 1) {
          doc.rect(50, y, 500, 20).fill('#f8fafc');
        }
        
        doc.fillColor('#334155').fontSize(7.5)
           .text(formatDate(booking.trip_date), 55, y + 6)
           .text(`${booking.source.substring(0, 18)} -> ${booking.destination.substring(0, 18)}`, 120, y + 6)
           .text(parseFloat(booking.distance_km).toFixed(1), 280, y + 6, { align: 'right', width: 40 })
           .text(parseFloat(booking.rate_per_km).toFixed(2), 330, y + 6, { align: 'right', width: 40 })
           .text(formatCurrency(parseFloat(booking.toll_charges) + parseFloat(booking.other_charges)), 380, y + 6, { align: 'right', width: 50 })
           .text(formatCurrency(booking.subtotal), 440, y + 6, { align: 'right', width: 50 })
           .text(formatCurrency(booking.total_amount), 495, y + 6, { align: 'right', width: 50 });
        y += 20;

        // Page breaks check (for long lists of bookings)
        if (y > 700 && idx < bookings.length - 1) {
          doc.addPage();
          y = 50;
          // Re-draw headers
          doc.rect(50, y, 500, 20).fill('#cbd5e1');
          doc.fillColor('#1e293b').fontSize(8)
             .text('Trip Date', 55, y + 6, { bold: true })
             .text('Source -> Destination', 120, y + 6, { bold: true })
             .text('Dist (km)', 280, y + 6, { align: 'right', bold: true })
             .text('Rate/km', 330, y + 6, { align: 'right', bold: true })
             .text('Toll/Other', 390, y + 6, { align: 'right', bold: true })
             .text('Subtotal', 450, y + 6, { align: 'right', bold: true })
             .text('Total', 500, y + 6, { align: 'right', bold: true });
          y += 20;
        }
      });

      // Add lines
      y += 10;
      doc.moveTo(50, y).lineTo(550, y).strokeColor('#cbd5e1').stroke();
      y += 10;

      // --- Financial Breakdown ---
      doc.fillColor('#0f172a').fontSize(9)
         .text('Taxable Amount:', 350, y)
         .text(formatCurrency(invoice.taxable_amount), 450, y, { align: 'right', width: 95 });
      y += 15;

      doc.text(`CGST (2.5%):`, 350, y)
         .text(formatCurrency(invoice.cgst), 450, y, { align: 'right', width: 95 });
      y += 15;

      doc.text(`SGST (2.5%):`, 350, y)
         .text(formatCurrency(invoice.sgst), 450, y, { align: 'right', width: 95 });
      y += 15;

      if (invoice.igst > 0) {
        doc.text(`IGST (5%):`, 350, y)
           .text(formatCurrency(invoice.igst), 450, y, { align: 'right', width: 95 });
        y += 15;
      }

      doc.fillColor('#074087').fontSize(11)
         .text('Total GST (5%):', 350, y, { bold: true })
         .text(formatCurrency(invoice.total_gst), 450, y, { align: 'right', width: 95, bold: true });
      y += 18;

      doc.rect(345, y - 4, 205, 22).strokeColor('#074087').stroke();
      doc.fillColor('#074087').fontSize(12)
         .text('Total Amount Due:', 350, y, { bold: true })
         .text(formatCurrency(invoice.total_amount), 450, y, { align: 'right', width: 95, bold: true });

      // --- Footer / Bank terms ---
      y += 45;
      doc.fillColor('#334155').fontSize(8)
         .text('Payment Terms & Bank Details:', 50, y, { bold: true })
         .text('Please transfer payments within 15 days of invoice date via NEFT/IMPS.', 50, y + 15)
         .text('Bank Name: HDFC Bank Ltd | Account No: 50200021359482', 50, y + 27)
         .text('IFSC Code: HDFC0000140 | Branch: Electronic City, Bangalore', 50, y + 39)
         .text('Note: This is a computer-generated invoice and does not require a physical signature.', 50, y + 60, { italic: true, align: 'center', width: 500 });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generates a Consolidated Statement PDF
 */
const generateStatementPDF = (statement, client, invoices, payments, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      ensureDirectoryExistence(outputPath);
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // --- Header ---
      doc.fillColor('#074087')
         .fontSize(20)
         .text('MANIVTHA TOURS & TRAVELS', 50, 50, { bold: true });
      
      doc.fillColor('#334155')
         .fontSize(9)
         .text('Corporate Office: #12, 1st Cross, Electronic City Phase 1, Bangalore - 560100', 50, 75)
         .text('Email: billing@manvithatours.com | Phone: +91 98765 43210', 50, 88);

      doc.fillColor('#0f172a')
         .fontSize(20)
         .text('ACCOUNT STATEMENT', 350, 50, { align: 'right' });

      doc.fontSize(9)
         .text(`Statement No: ${statement.statement_number}`, 350, 80, { align: 'right' })
         .text(`Period: ${formatDate(statement.start_date)} - ${formatDate(statement.end_date)}`, 350, 93, { align: 'right' })
         .text(`Generated: ${formatDate(new Date())}`, 350, 106, { align: 'right' });

      // Draw horizontal divider
      doc.moveTo(50, 130).lineTo(550, 130).strokeColor('#cbd5e1').stroke();

      // --- Client Details ---
      doc.fillColor('#074087').fontSize(11).text('STATEMENT FOR:', 50, 150, { bold: true });
      doc.fillColor('#0f172a').fontSize(10)
         .text(client.company_name, 50, 165, { bold: true })
         .text(`GSTIN: ${client.gst_number}`, 50, 178)
         .text(`Contact: ${client.contact_person} (${client.phone})`, 50, 191)
         .text(client.address, 50, 204, { width: 250 });

      // --- Statement Summary Block ---
      let y = 150;
      doc.rect(345, y, 205, 90).fill('#f1f5f9');
      doc.fillColor('#074087').fontSize(9)
         .text('STATEMENT SUMMARY', 355, y + 8, { bold: true })
         .fillColor('#334155')
         .text(`Total Trips: ${statement.total_bookings}`, 355, y + 25)
         .text(`Total Invoiced: ${formatCurrency(statement.total_invoiced)}`, 355, y + 40)
         .text(`Total Paid: ${formatCurrency(statement.total_paid)}`, 355, y + 55)
         .fillColor('#b91c1c').text(`Outstanding Balance: ${formatCurrency(statement.outstanding_amount)}`, 355, y + 70, { bold: true });

      // --- Invoice History Table ---
      y = 265;
      doc.fillColor('#074087').fontSize(11).text('INVOICES IN THIS PERIOD', 50, y, { bold: true });
      y += 20;

      // Table Header
      doc.rect(50, y, 500, 20).fill('#cbd5e1');
      doc.fillColor('#1e293b').fontSize(8.5)
         .text('Invoice No', 55, y + 6, { bold: true })
         .text('Inv Date', 140, y + 6, { bold: true })
         .text('Due Date', 220, y + 6, { bold: true })
         .text('Inv Amount', 300, y + 6, { align: 'right', bold: true })
         .text('Paid Amount', 380, y + 6, { align: 'right', bold: true })
         .text('Balance', 460, y + 6, { align: 'right', bold: true })
         .text('Status', 510, y + 6, { align: 'right', bold: true });

      y += 20;
      doc.fillColor('#334155');
      invoices.forEach((inv, idx) => {
        if (idx % 2 === 1) {
          doc.rect(50, y, 500, 20).fill('#f8fafc');
        }
        const balance = parseFloat(inv.total_amount) - (inv.status === 'paid' ? parseFloat(inv.total_amount) : 0); // basic logic
        doc.fillColor('#334155').fontSize(8)
           .text(inv.invoice_number, 55, y + 6)
           .text(formatDate(inv.invoice_date), 140, y + 6)
           .text(formatDate(inv.due_date), 220, y + 6)
           .text(formatCurrency(inv.total_amount), 280, y + 6, { align: 'right', width: 70 })
           .text(formatCurrency(inv.status === 'paid' ? inv.total_amount : 0.00), 360, y + 6, { align: 'right', width: 70 })
           .text(formatCurrency(inv.status === 'paid' ? 0.00 : inv.total_amount), 440, y + 6, { align: 'right', width: 70 })
           .text(inv.status.toUpperCase(), 500, y + 6, { align: 'right', width: 45 });
        y += 20;
      });

      // --- Payment History Table ---
      y += 20;
      doc.fillColor('#074087').fontSize(11).text('PAYMENTS RECEIVED IN THIS PERIOD', 50, y, { bold: true });
      y += 20;

      // Table Header
      doc.rect(50, y, 500, 20).fill('#cbd5e1');
      doc.fillColor('#1e293b').fontSize(8.5)
         .text('Payment Date', 55, y + 6, { bold: true })
         .text('Reference No', 140, y + 6, { bold: true })
         .text('Method', 280, y + 6, { bold: true })
         .text('Inv Number Ref', 380, y + 6, { bold: true })
         .text('Amount Received', 450, y + 6, { align: 'right', bold: true });

      y += 20;
      doc.fillColor('#334155');
      if (payments.length === 0) {
        doc.fontSize(8.5).text('No payments recorded in this period.', 55, y + 6, { italic: true });
        y += 20;
      } else {
        payments.forEach((payment, idx) => {
          if (idx % 2 === 1) {
            doc.rect(50, y, 500, 20).fill('#f8fafc');
          }
          doc.fillColor('#334155').fontSize(8)
             .text(formatDate(payment.payment_date), 55, y + 6)
             .text(payment.transaction_reference || 'N/A', 140, y + 6)
             .text(payment.payment_method, 280, y + 6)
             .text(payment.invoice_number || `Inv ID: ${payment.invoice_id}` || 'General Ledger', 380, y + 6)
             .text(formatCurrency(payment.amount), 450, y + 6, { align: 'right', width: 90 });
          y += 20;
        });
      }

      // Divider
      y += 15;
      doc.moveTo(50, y).lineTo(550, y).strokeColor('#cbd5e1').stroke();
      y += 10;

      doc.fillColor('#334155').fontSize(8.5)
         .text('Thank you for choosing Manivtha Tours & Travels. For billing queries, please raise a ticket via the support portal or call accounts at +91 98765 43210 ext 3.', 50, y, { italic: true, align: 'center', width: 500 });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoicePDF,
  generateStatementPDF
};
