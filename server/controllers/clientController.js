const bcrypt = require('bcryptjs');
const db = require('../config/db');

// List all corporate clients
exports.getClients = async (req, res) => {
  try {
    if (db.isMock()) {
      const data = db.mock.load();
      return res.json(data.corporate_clients);
    } else {
      const [clients] = await db.getPool().execute(
        'SELECT c.*, u.username, u.email as user_email FROM corporate_clients c JOIN users u ON c.user_id = u.id'
      );
      return res.json(clients);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a corporate client (and automatically create their portal login)
exports.createClient = async (req, res) => {
  const { company_name, gst_number, contact_person, email, phone, address, credit_limit, username, password } = req.body;

  if (!company_name || !gst_number || !contact_person || !email || !phone || !address || !username || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (db.isMock()) {
      const data = db.mock.load();

      // Check if trying to overwrite a default user
      const defaultUsernames = ['admin', 'accounts', 'infosys_billing', 'wipro_billing'];
      const defaultEmails = ['admin@manvithatours.com', 'accounts@manvithatours.com', 'billing@infosys.com', 'billing@wipro.com'];

      if (defaultUsernames.includes(username) || defaultEmails.includes(email)) {
        return res.status(400).json({ message: 'Username or email already exists for a portal user' });
      }

      // If it exists but is not a default user, remove them to allow clean re-registration
      const existingUserIndex = data.users.findIndex(u => u.username === username || u.email === email);
      if (existingUserIndex !== -1) {
        const extUserId = data.users[existingUserIndex].id;
        // Delete user
        data.users.splice(existingUserIndex, 1);
        // Delete client
        data.corporate_clients = data.corporate_clients.filter(c => c.user_id !== extUserId);
      }

      const nextUserId = Math.max(...data.users.map(u => u.id), 0) + 1;
      const newUser = {
        id: nextUserId,
        username,
        email,
        password_hash: passwordHash,
        role: 'client',
        created_at: new Date()
      };
      
      const nextClientId = Math.max(...data.corporate_clients.map(c => c.id), 0) + 1;
      const newClient = {
        id: nextClientId,
        user_id: nextUserId,
        company_name,
        gst_number,
        contact_person,
        email,
        phone,
        address,
        credit_limit: parseFloat(credit_limit || 100000.00),
        created_at: new Date()
      };

      data.users.push(newUser);
      data.corporate_clients.push(newClient);
      
      db.mock.save(data);

      return res.status(201).json({
        message: 'Corporate client and portal credentials created successfully',
        client: newClient
      });
    } else {
      // MySQL Transaction mode
      const connection = await db.getPool().getConnection();
      try {
        await connection.beginTransaction();

        // Check if trying to overwrite a default user
        const defaultUsernames = ['admin', 'accounts', 'infosys_billing', 'wipro_billing'];
        const defaultEmails = ['admin@manvithatours.com', 'accounts@manvithatours.com', 'billing@infosys.com', 'billing@wipro.com'];

        if (defaultUsernames.includes(username) || defaultEmails.includes(email)) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ message: 'Username or email already exists for a portal user' });
        }

        // If a non-default user exists, delete them first to allow clean re-registration
        const [existing] = await connection.execute(
          'SELECT id FROM users WHERE username = ? OR email = ?',
          [username, email]
        );
        if (existing.length > 0) {
          const extUserId = existing[0].id;
          // Delete from users (corporate_clients will be deleted automatically due to ON DELETE CASCADE)
          await connection.execute('DELETE FROM users WHERE id = ?', [extUserId]);
        }

        // Insert user
        const [userResult] = await connection.execute(
          'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, "client")',
          [username, email, passwordHash]
        );
        const userId = userResult.insertId;

        // Insert corporate client
        const [clientResult] = await connection.execute(
          'INSERT INTO corporate_clients (user_id, company_name, gst_number, contact_person, email, phone, address, credit_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, company_name, gst_number, contact_person, email, phone, address, parseFloat(credit_limit || 100000.00)]
        );

        await connection.commit();
        connection.release();

        return res.status(201).json({
          message: 'Corporate client and portal credentials created successfully',
          client: {
            id: clientResult.insertId,
            user_id: userId,
            company_name,
            gst_number,
            contact_person,
            email,
            phone,
            address,
            credit_limit
          }
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

// Update client details
exports.updateClient = async (req, res) => {
  const { id } = req.params;
  const { company_name, gst_number, contact_person, email, phone, address, credit_limit } = req.body;

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      const clientIdx = data.corporate_clients.findIndex(c => c.id === parseInt(id));

      if (clientIdx === -1) {
        return res.status(404).json({ message: 'Client not found' });
      }

      const updated = {
        ...data.corporate_clients[clientIdx],
        company_name: company_name || data.corporate_clients[clientIdx].company_name,
        gst_number: gst_number || data.corporate_clients[clientIdx].gst_number,
        contact_person: contact_person || data.corporate_clients[clientIdx].contact_person,
        email: email || data.corporate_clients[clientIdx].email,
        phone: phone || data.corporate_clients[clientIdx].phone,
        address: address || data.corporate_clients[clientIdx].address,
        credit_limit: credit_limit !== undefined ? parseFloat(credit_limit) : data.corporate_clients[clientIdx].credit_limit,
        updated_at: new Date()
      };

      data.corporate_clients[clientIdx] = updated;
      db.mock.save(data);

      return res.json({ message: 'Client updated successfully', client: updated });
    } else {
      const [existing] = await db.getPool().execute(
        'SELECT * FROM corporate_clients WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }

      const client = existing[0];

      await db.getPool().execute(
        'UPDATE corporate_clients SET company_name = ?, gst_number = ?, contact_person = ?, email = ?, phone = ?, address = ?, credit_limit = ? WHERE id = ?',
        [
          company_name || client.company_name,
          gst_number || client.gst_number,
          contact_person || client.contact_person,
          email || client.email,
          phone || client.phone,
          address || client.address,
          credit_limit !== undefined ? parseFloat(credit_limit) : client.credit_limit,
          id
        ]
      );

      return res.json({ message: 'Client updated successfully' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
