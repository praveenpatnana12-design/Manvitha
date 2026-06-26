const db = require('../config/db');

// Get all bookings (with optional filters: client, date range, status)
exports.getBookings = async (req, res) => {
  const { clientId, startDate, endDate, status } = req.query;

  // Enforce client isolation
  let filterClientId = clientId;
  if (req.user.role === 'client') {
    filterClientId = req.user.clientId;
  }

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      let filtered = [...data.bookings];

      if (filterClientId) {
        filtered = filtered.filter(b => b.client_id === parseInt(filterClientId));
      }
      if (startDate) {
        filtered = filtered.filter(b => new Date(b.trip_date) >= new Date(startDate));
      }
      if (endDate) {
        filtered = filtered.filter(b => new Date(b.trip_date) <= new Date(endDate));
      }
      if (status) {
        filtered = filtered.filter(b => b.status === status);
      }

      // Attach client, vehicle, driver names for detailed view
      const result = filtered.map(b => {
        const client = data.corporate_clients.find(c => c.id === b.client_id) || {};
        const vehicle = data.vehicles.find(v => v.id === b.vehicle_id) || {};
        const driver = data.drivers.find(d => d.id === b.driver_id) || {};
        
        return {
          ...b,
          company_name: client.company_name,
          registration_number: vehicle.registration_number,
          vehicle_model: vehicle.model,
          driver_name: driver.name,
          driver_phone: driver.phone
        };
      });

      // Sort by trip_date descending
      result.sort((a, b) => new Date(b.trip_date) - new Date(a.trip_date));

      return res.json(result);
    } else {
      // MySQL Mode
      let queryStr = `
        SELECT b.*, c.company_name, v.registration_number, v.model as vehicle_model, d.name as driver_name, d.phone as driver_phone
        FROM bookings b
        JOIN corporate_clients c ON b.client_id = c.id
        JOIN vehicles v ON b.vehicle_id = v.id
        JOIN drivers d ON b.driver_id = d.id
        WHERE 1=1
      `;
      const params = [];

      if (filterClientId) {
        queryStr += ' AND b.client_id = ?';
        params.push(filterClientId);
      }
      if (startDate) {
        queryStr += ' AND b.trip_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        queryStr += ' AND b.trip_date <= ?';
        params.push(endDate);
      }
      if (status) {
        queryStr += ' AND b.status = ?';
        params.push(status);
      }

      queryStr += ' ORDER BY b.trip_date DESC';

      const [bookings] = await db.getPool().execute(queryStr, params);
      return res.json(bookings);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a booking
exports.createBooking = async (req, res) => {
  const { client_id, vehicle_id, driver_id, trip_date, source, destination, distance_km, rate_per_km, toll_charges, other_charges, status } = req.body;

  if (!client_id || !vehicle_id || !driver_id || !trip_date || !source || !destination || !distance_km || !rate_per_km) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  const dist = parseFloat(distance_km);
  const rate = parseFloat(rate_per_km);
  const toll = parseFloat(toll_charges || 0);
  const other = parseFloat(other_charges || 0);
  
  // Calculate pricing
  const subtotal = dist * rate;
  const taxable_amount = subtotal + toll + other;
  const gst_amount = taxable_amount * 0.05; // 5% standard GST for transport service
  const total_amount = taxable_amount + gst_amount;

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      
      const newBooking = {
        id: data.bookings.length + 1,
        client_id: parseInt(client_id),
        vehicle_id: parseInt(vehicle_id),
        driver_id: parseInt(driver_id),
        trip_date: new Date(trip_date),
        source,
        destination,
        distance_km: dist,
        rate_per_km: rate,
        toll_charges: toll,
        other_charges: other,
        subtotal,
        gst_amount,
        total_amount,
        status: status || 'completed',
        created_at: new Date()
      };

      data.bookings.push(newBooking);
      db.mock.save(data);

      return res.status(201).json({ message: 'Booking created successfully', booking: newBooking });
    } else {
      const [result] = await db.getPool().execute(
        `INSERT INTO bookings 
         (client_id, vehicle_id, driver_id, trip_date, source, destination, distance_km, rate_per_km, toll_charges, other_charges, subtotal, gst_amount, total_amount, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          client_id, vehicle_id, driver_id, trip_date, source, destination, 
          dist, rate, toll, other, subtotal, gst_amount, total_amount, status || 'completed'
        ]
      );

      return res.status(201).json({ 
        message: 'Booking created successfully', 
        bookingId: result.insertId 
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Fetch vehicles list (to populate selection lists)
exports.getVehicles = async (req, res) => {
  try {
    if (db.isMock()) {
      const data = db.mock.load();
      return res.json(data.vehicles);
    } else {
      const [vehicles] = await db.getPool().execute('SELECT * FROM vehicles');
      return res.json(vehicles);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Fetch drivers list
exports.getDrivers = async (req, res) => {
  try {
    if (db.isMock()) {
      const data = db.mock.load();
      return res.json(data.drivers.filter(d => d.status === 'active'));
    } else {
      const [drivers] = await db.getPool().execute('SELECT * FROM drivers WHERE status = "active"');
      return res.json(drivers);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
