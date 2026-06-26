const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const seed = async () => {
  console.log('Starting MySQL database seeding process...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    // Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Creating database and tables...');
    await connection.query(schemaSql);
    console.log('Database schema created successfully.');

    // Switch to database
    await connection.query(`USE ${process.env.DB_NAME || 'manvitha_billing'}`);

    // Generate password hashes
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('password123', salt);
    const accountsPasswordHash = await bcrypt.hash('password123', salt);
    const clientPasswordHash = await bcrypt.hash('password123', salt);

    console.log('Inserting seed data...');

    // 1. Users
    const users = [
      ['admin', 'admin@manvithatours.com', adminPasswordHash, 'admin'],
      ['accounts', 'accounts@manvithatours.com', accountsPasswordHash, 'accounts'],
      ['infosys_billing', 'billing@infosys.com', clientPasswordHash, 'client'],
      ['wipro_billing', 'billing@wipro.com', clientPasswordHash, 'client']
    ];
    await connection.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ?',
      [users]
    );

    // 2. Corporate Clients
    const corporate_clients = [
      [3, 'Infosys Limited', '29AAACI4350Q1ZS', 'Sudha Murthy', 'billing@infosys.com', '+91 80 2852 0261', 'Plot No. 44, Electronics City, Hosur Road, Bangalore, Karnataka - 560100', 500000.00],
      [4, 'Wipro Technologies', '29AAACW8382R2ZT', 'Azim Premji', 'billing@wipro.com', '+91 80 2844 0011', 'Doddakannelli, Sarjapur Road, Bangalore, Karnataka - 560035', 300000.00]
    ];
    await connection.query(
      'INSERT INTO corporate_clients (user_id, company_name, gst_number, contact_person, email, phone, address, credit_limit) VALUES ?',
      [corporate_clients]
    );

    // 3. Vehicles
    const vehicles = [
      ['KA-01-MJ-5582', 'Maruti Suzuki Dzire', 'Sedan'],
      ['KA-03-MM-7410', 'Toyota Innova Crysta', 'SUV'],
      ['KA-51-MD-9912', 'Force Traveller (17 Str)', 'Traveller'],
      ['KA-04-MQ-2244', 'Ashok Leyland Coach', 'Bus']
    ];
    await connection.query(
      'INSERT INTO vehicles (registration_number, model, type) VALUES ?',
      [vehicles]
    );

    // 4. Drivers
    const drivers = [
      ['Ramesh Kumar', '+91 98765 43210', 'DL-1420180029312', 'active'],
      ['Suresh Patil', '+91 98654 32109', 'KA-0320150098412', 'active'],
      ['Mahesh Gowda', '+91 97543 21098', 'KA-5120190012345', 'active'],
      ['Anil Singh', '+91 96432 10987', 'HR-2620120054321', 'active']
    ];
    await connection.query(
      'INSERT INTO drivers (name, phone, license_number, status) VALUES ?',
      [drivers]
    );

    // 5. Bookings
    const bookings = [
      [1, 1, 1, '2026-05-02 08:00:00', 'Infosys E-City Campus', 'Kempegowda International Airport', 52.50, 15.00, 120.00, 50.00, 787.50, 47.88, 1005.38, 'completed'],
      [1, 2, 2, '2026-05-10 09:30:00', 'Infosys E-City Campus', 'Taj West End, Race Course Road', 22.00, 22.00, 0.00, 100.00, 484.00, 29.20, 613.20, 'completed'],
      [1, 3, 3, '2026-05-15 06:00:00', 'Infosys E-City Campus', 'Nandi Hills Outing', 140.00, 28.00, 250.00, 200.00, 3920.00, 218.50, 4588.50, 'completed'],
      [2, 1, 1, '2026-05-04 07:15:00', 'Wipro Sarjapur Office', 'Kempegowda International Airport', 48.00, 15.00, 120.00, 0.00, 720.00, 42.00, 882.00, 'completed'],
      [2, 4, 4, '2026-05-22 08:00:00', 'Wipro Sarjapur Office', 'Mysore Corporate Center', 150.00, 45.00, 300.00, 500.00, 6750.00, 377.50, 7927.50, 'completed'],
      [1, 2, 2, '2026-06-02 10:00:00', 'Infosys E-City Campus', 'Whitefield ITPL', 30.00, 22.00, 0.00, 0.00, 660.00, 33.00, 693.00, 'completed'],
      [1, 1, 1, '2026-06-08 09:00:00', 'Infosys E-City Campus', 'Kempegowda International Airport', 52.50, 15.00, 120.00, 0.00, 787.50, 45.38, 952.88, 'completed'],
      [2, 2, 3, '2026-06-12 14:00:00', 'Wipro Sarjapur Office', 'Electronic City Phase 2', 18.00, 22.00, 0.00, 0.00, 396.00, 19.80, 415.80, 'completed']
    ];
    await connection.query(
      'INSERT INTO bookings (client_id, vehicle_id, driver_id, trip_date, source, destination, distance_km, rate_per_km, toll_charges, other_charges, subtotal, gst_amount, total_amount, status) VALUES ?',
      [bookings]
    );

    // 6. Invoices
    const invoices = [
      ['INV-2026-001', 1, '2026-05-31', '2026-06-15', 5191.50, 147.79, 147.79, 0.00, 295.58, 5487.08, 'paid', '/invoices/INV-2026-001.pdf'],
      ['INV-2026-002', 2, '2026-05-31', '2026-06-15', 7470.00, 209.75, 209.75, 0.00, 419.50, 8809.50, 'pending', '/invoices/INV-2026-002.pdf']
    ];
    await connection.query(
      'INSERT INTO invoices (invoice_number, client_id, invoice_date, due_date, taxable_amount, cgst, sgst, igst, total_gst, total_amount, status, pdf_path) VALUES ?',
      [invoices]
    );

    // 7. Payments
    const payments = [
      [1, 1, 5487.08, '2026-06-10 11:00:00', 'NEFT', 'N36512398412', 'success']
    ];
    await connection.query(
      'INSERT INTO payments (invoice_id, client_id, amount, payment_date, payment_method, transaction_reference, status) VALUES ?',
      [payments]
    );

    // 8. Statements
    const statements = [
      ['STMT-2026-05-01', 1, '2026-05-01', '2026-05-31', 3, 5487.08, 5487.08, 0.00, 'sent'],
      ['STMT-2026-05-02', 2, '2026-05-01', '2026-05-31', 2, 8809.50, 0.00, 8809.50, 'sent']
    ];
    await connection.query(
      'INSERT INTO statements (statement_number, client_id, start_date, end_date, total_bookings, total_invoiced, total_paid, outstanding_amount, status) VALUES ?',
      [statements]
    );

    // 9. Support Tickets
    const support_tickets = [
      [1, 'GST breakdown discrepancy on INV-2026-001', 'The GST taxable amount on the PDF seems to have a discrepancy of Rs 10 compared to our internal logs. Please check the rate calculations for the trip on May 15th.', 'medium', 'closed'],
      [2, 'Request to update corporate billing address', 'We have updated our head office billing address. Can you please update this in your system so it reflects on future invoices? The new address is Wipro Campus, Tower 3, Sarjapur, Bangalore 560035.', 'low', 'open']
    ];
    await connection.query(
      'INSERT INTO support_tickets (client_id, subject, description, priority, status) VALUES ?',
      [support_tickets]
    );

    // 10. Support Ticket Replies
    const ticket_replies = [
      [1, 3, 'Initial report: Please verify the trip on May 15th. Our accounts team flags a minor discrepancy.'],
      [1, 2, 'Hello Sudha, we reviewed the booking. The discrepancy was due to an additional toll charges calculation error which was corrected. The final invoice has been updated. Thanks!'],
      [1, 3, 'Looks correct now. Marking this ticket as closed. Thank you.']
    ];
    await connection.query(
      'INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES ?',
      [ticket_replies]
    );

    // 11. Notifications
    const notifications = [
      [3, 'invoice', 'Invoice INV-2026-001 for May has been generated.', 1],
      [4, 'invoice', 'Invoice INV-2026-002 for May has been generated. Due date is June 15th.', 0],
      [4, 'payment_due', 'Reminder: Invoice INV-2026-002 is past its due date (June 15th). Outstanding: Rs. 8,809.50', 0]
    ];
    await connection.query(
      'INSERT INTO notifications (user_id, type, message, is_read) VALUES ?',
      [notifications]
    );

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await connection.end();
  }
};

seed();
