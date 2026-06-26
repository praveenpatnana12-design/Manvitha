const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'mock_db.json');

// Initial seed data
const getInitialData = () => {
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('password123', salt);
  const accountsPasswordHash = bcrypt.hashSync('password123', salt);
  const clientPasswordHash = bcrypt.hashSync('password123', salt);

  const users = [
    { id: 1, username: 'admin', email: 'admin@manvithatours.com', password_hash: adminPasswordHash, role: 'admin', created_at: new Date() },
    { id: 2, username: 'accounts', email: 'accounts@manvithatours.com', password_hash: accountsPasswordHash, role: 'accounts', created_at: new Date() },
    { id: 3, username: 'infosys_billing', email: 'billing@infosys.com', password_hash: clientPasswordHash, role: 'client', created_at: new Date() },
    { id: 4, username: 'wipro_billing', email: 'billing@wipro.com', password_hash: clientPasswordHash, role: 'client', created_at: new Date() }
  ];

  const corporate_clients = [
    {
      id: 1,
      user_id: 3,
      company_name: 'Infosys Limited',
      gst_number: '29AAACI4350Q1ZS',
      contact_person: 'Sudha Murthy',
      email: 'billing@infosys.com',
      phone: '+91 80 2852 0261',
      address: 'Plot No. 44, Electronics City, Hosur Road, Bangalore, Karnataka - 560100',
      credit_limit: 500000.00,
      created_at: new Date()
    },
    {
      id: 2,
      user_id: 4,
      company_name: 'Wipro Technologies',
      gst_number: '29AAACW8382R2ZT',
      contact_person: 'Azim Premji',
      email: 'billing@wipro.com',
      phone: '+91 80 2844 0011',
      address: 'Doddakannelli, Sarjapur Road, Bangalore, Karnataka - 560035',
      credit_limit: 300000.00,
      created_at: new Date()
    }
  ];

  const vehicles = [
    { id: 1, registration_number: 'KA-01-MJ-5582', model: 'Maruti Suzuki Dzire', type: 'Sedan', created_at: new Date() },
    { id: 2, registration_number: 'KA-03-MM-7410', model: 'Toyota Innova Crysta', type: 'SUV', created_at: new Date() },
    { id: 3, registration_number: 'KA-51-MD-9912', model: 'Force Traveller (17 Str)', type: 'Traveller', created_at: new Date() },
    { id: 4, registration_number: 'KA-04-MQ-2244', model: 'Ashok Leyland Coach', type: 'Bus', created_at: new Date() }
  ];

  const drivers = [
    { id: 1, name: 'Ramesh Kumar', phone: '+91 98765 43210', license_number: 'DL-1420180029312', status: 'active', created_at: new Date() },
    { id: 2, name: 'Suresh Patil', phone: '+91 98654 32109', license_number: 'KA-0320150098412', status: 'active', created_at: new Date() },
    { id: 3, name: 'Mahesh Gowda', phone: '+91 97543 21098', license_number: 'KA-5120190012345', status: 'active', created_at: new Date() },
    { id: 4, name: 'Anil Singh', phone: '+91 96432 10987', license_number: 'HR-2620120054321', status: 'active', created_at: new Date() }
  ];

  // Past 2 months of bookings
  const bookings = [
    // Infosys Bookings
    {
      id: 1, client_id: 1, vehicle_id: 1, driver_id: 1,
      trip_date: new Date('2026-05-02T08:00:00Z'),
      source: 'Infosys E-City Campus', destination: 'Kempegowda International Airport',
      distance_km: 52.50, rate_per_km: 15.00, toll_charges: 120.00, other_charges: 50.00,
      subtotal: 787.50, gst_amount: 47.88, total_amount: 1005.38, status: 'completed', created_at: new Date('2026-05-02T12:00:00Z')
    },
    {
      id: 2, client_id: 1, vehicle_id: 2, driver_id: 2,
      trip_date: new Date('2026-05-10T09:30:00Z'),
      source: 'Infosys E-City Campus', destination: 'Taj West End, Race Course Road',
      distance_km: 22.00, rate_per_km: 22.00, toll_charges: 0.00, other_charges: 100.00,
      subtotal: 484.00, gst_amount: 29.20, total_amount: 613.20, status: 'completed', created_at: new Date('2026-05-10T14:00:00Z')
    },
    {
      id: 3, client_id: 1, vehicle_id: 3, driver_id: 3,
      trip_date: new Date('2026-05-15T06:00:00Z'),
      source: 'Infosys E-City Campus', destination: 'Nandi Hills Outing',
      distance_km: 140.00, rate_per_km: 28.00, toll_charges: 250.00, other_charges: 200.00,
      subtotal: 3920.00, gst_amount: 218.50, total_amount: 4588.50, status: 'completed', created_at: new Date('2026-05-15T18:00:00Z')
    },
    // Wipro Bookings
    {
      id: 4, client_id: 2, vehicle_id: 1, driver_id: 1,
      trip_date: new Date('2026-05-04T07:15:00Z'),
      source: 'Wipro Sarjapur Office', destination: 'Kempegowda International Airport',
      distance_km: 48.00, rate_per_km: 15.00, toll_charges: 120.00, other_charges: 0.00,
      subtotal: 720.00, gst_amount: 42.00, total_amount: 882.00, status: 'completed', created_at: new Date('2026-05-04T11:00:00Z')
    },
    {
      id: 5, client_id: 2, vehicle_id: 4, driver_id: 4,
      trip_date: new Date('2026-05-22T08:00:00Z'),
      source: 'Wipro Sarjapur Office', destination: 'Mysore Corporate Center',
      distance_km: 150.00, rate_per_km: 45.00, toll_charges: 300.00, other_charges: 500.00,
      subtotal: 6750.00, gst_amount: 377.50, total_amount: 7927.50, status: 'completed', created_at: new Date('2026-05-22T19:00:00Z')
    },
    // June Bookings (Current Month)
    {
      id: 6, client_id: 1, vehicle_id: 2, driver_id: 2,
      trip_date: new Date('2026-06-02T10:00:00Z'),
      source: 'Infosys E-City Campus', destination: 'Whitefield ITPL',
      distance_km: 30.00, rate_per_km: 22.00, toll_charges: 0.00, other_charges: 0.00,
      subtotal: 660.00, gst_amount: 33.00, total_amount: 693.00, status: 'completed', created_at: new Date('2026-06-02T13:00:00Z')
    },
    {
      id: 7, client_id: 1, vehicle_id: 1, driver_id: 1,
      trip_date: new Date('2026-06-08T09:00:00Z'),
      source: 'Infosys E-City Campus', destination: 'Kempegowda International Airport',
      distance_km: 52.50, rate_per_km: 15.00, toll_charges: 120.00, other_charges: 0.00,
      subtotal: 787.50, gst_amount: 45.38, total_amount: 952.88, status: 'completed', created_at: new Date('2026-06-08T12:00:00Z')
    },
    {
      id: 8, client_id: 2, vehicle_id: 2, driver_id: 3,
      trip_date: new Date('2026-06-12T14:00:00Z'),
      source: 'Wipro Sarjapur Office', destination: 'Electronic City Phase 2',
      distance_km: 18.00, rate_per_km: 22.00, toll_charges: 0.00, other_charges: 0.00,
      subtotal: 396.00, gst_amount: 19.80, total_amount: 415.80, status: 'completed', created_at: new Date('2026-06-12T16:00:00Z')
    }
  ];

  const invoices = [
    // May Invoices (already generated)
    {
      id: 1,
      invoice_number: 'INV-2026-001',
      client_id: 1,
      invoice_date: new Date('2026-05-31'),
      due_date: new Date('2026-06-15'),
      taxable_amount: 5191.50,
      cgst: 147.79,
      sgst: 147.79,
      igst: 0.00,
      total_gst: 295.58,
      total_amount: 5487.08,
      status: 'paid',
      pdf_path: '/invoices/INV-2026-001.pdf',
      created_at: new Date('2026-05-31T23:59:59Z')
    },
    {
      id: 2,
      invoice_number: 'INV-2026-002',
      client_id: 2,
      invoice_date: new Date('2026-05-31'),
      due_date: new Date('2026-06-15'),
      taxable_amount: 7470.00,
      cgst: 209.75,
      sgst: 209.75,
      igst: 0.00,
      total_gst: 419.50,
      total_amount: 8809.50,
      status: 'pending',
      pdf_path: '/invoices/INV-2026-002.pdf',
      created_at: new Date('2026-05-31T23:59:59Z')
    }
  ];

  const payments = [
    {
      id: 1,
      invoice_id: 1,
      client_id: 1,
      amount: 5487.08,
      payment_date: new Date('2026-06-10T11:00:00Z'),
      payment_method: 'NEFT',
      transaction_reference: 'N36512398412',
      status: 'success',
      created_at: new Date('2026-06-10T11:00:00Z')
    }
  ];

  const statements = [
    {
      id: 1,
      statement_number: 'STMT-2026-05-01',
      client_id: 1,
      start_date: new Date('2026-05-01'),
      end_date: new Date('2026-05-31'),
      total_bookings: 3,
      total_invoiced: 5487.08,
      total_paid: 5487.08,
      outstanding_amount: 0.00,
      status: 'sent',
      created_at: new Date('2026-06-01T08:00:00Z')
    },
    {
      id: 2,
      statement_number: 'STMT-2026-05-02',
      client_id: 2,
      start_date: new Date('2026-05-01'),
      end_date: new Date('2026-05-31'),
      total_bookings: 2,
      total_invoiced: 8809.50,
      total_paid: 0.00,
      outstanding_amount: 8809.50,
      status: 'sent',
      created_at: new Date('2026-06-01T08:00:00Z')
    }
  ];

  const support_tickets = [
    {
      id: 1,
      client_id: 1,
      subject: 'GST breakdown discrepancy on INV-2026-001',
      description: 'The GST taxable amount on the PDF seems to have a discrepancy of Rs 10 compared to our internal logs. Please check the rate calculations for the trip on May 15th.',
      priority: 'medium',
      status: 'closed',
      created_at: new Date('2026-06-02T10:00:00Z'),
      updated_at: new Date('2026-06-03T14:30:00Z')
    },
    {
      id: 2,
      client_id: 2,
      subject: 'Request to update corporate billing address',
      description: 'We have updated our head office billing address. Can you please update this in your system so it reflects on future invoices? The new address is Wipro Campus, Tower 3, Sarjapur, Bangalore 560035.',
      priority: 'low',
      status: 'open',
      created_at: new Date('2026-06-14T09:15:00Z'),
      updated_at: new Date('2026-06-14T09:15:00Z')
    }
  ];

  const ticket_replies = [
    {
      id: 1,
      ticket_id: 1,
      user_id: 3, // corporate client
      message: 'Initial report: Please verify the trip on May 15th. Our accounts team flags a minor discrepancy.',
      created_at: new Date('2026-06-02T10:00:00Z')
    },
    {
      id: 2,
      ticket_id: 1,
      user_id: 2, // accounts team
      message: 'Hello Sudha, we reviewed the booking. The discrepancy was due to an additional toll charges calculation error which was corrected. The final invoice has been updated. Thanks!',
      created_at: new Date('2026-06-03T14:00:00Z')
    },
    {
      id: 3,
      ticket_id: 1,
      user_id: 3, // corporate client
      message: 'Looks correct now. Marking this ticket as closed. Thank you.',
      created_at: new Date('2026-06-03T14:30:00Z')
    }
  ];

  const notifications = [
    { id: 1, user_id: 3, type: 'invoice', message: 'Invoice INV-2026-001 for May has been generated.', is_read: true, created_at: new Date('2026-06-01T00:00:00Z') },
    { id: 2, user_id: 4, type: 'invoice', message: 'Invoice INV-2026-002 for May has been generated. Due date is June 15th.', is_read: false, created_at: new Date('2026-06-01T00:00:00Z') },
    { id: 3, user_id: 4, type: 'payment_due', message: 'Reminder: Invoice INV-2026-002 is past its due date (June 15th). Outstanding: Rs. 8,809.50', is_read: false, created_at: new Date('2026-06-16T09:00:00Z') }
  ];

  const audit_logs = [
    { id: 1, user_id: 1, action: 'User login: admin', ip_address: '127.0.0.1', created_at: new Date() }
  ];

  return {
    users,
    corporate_clients,
    vehicles,
    drivers,
    bookings,
    invoices,
    payments,
    statements,
    support_tickets,
    ticket_replies,
    notifications,
    audit_logs
  };
};

// Ensure JSON file exists and load it
const loadDb = () => {
  if (!fs.existsSync(dbPath)) {
    const initial = getInitialData();
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading mock DB file. Reinitializing...', err);
    const initial = getInitialData();
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
};

const saveDb = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
};

module.exports = {
  load: loadDb,
  save: saveDb,
  init: () => { loadDb(); console.log('Mock JSON database initialized at ' + dbPath); }
};
