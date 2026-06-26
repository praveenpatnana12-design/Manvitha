const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Helper to generate JWT
const generateToken = (user, clientId = null) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      role: user.role,
      clientId: clientId 
    },
    process.env.JWT_SECRET || 'manvitha_secret_key_2026_jwt',
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Register User
exports.register = async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (db.isMock()) {
      const data = db.mock.load();
      
      // Check if user exists
      if (data.users.find(u => u.username === username || u.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const newUser = {
        id: data.users.length + 1,
        username,
        email,
        password_hash: passwordHash,
        role,
        created_at: new Date()
      };
      
      data.users.push(newUser);
      db.mock.save(data);

      return res.status(201).json({
        message: 'User registered successfully',
        user: { id: newUser.id, username, email, role }
      });
    } else {
      // MySQL Mode
      // Check if user exists
      const [existingUsers] = await db.getPool().execute(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const [result] = await db.getPool().execute(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, passwordHash, role]
      );

      return res.status(201).json({
        message: 'User registered successfully',
        user: { id: result.insertId, username, email, role }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login User
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please enter username and password' });
  }

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      const user = data.users.find(u => u.username === username);

      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // If user is client, fetch their client profile id
      let clientId = null;
      if (user.role === 'client') {
        const client = data.corporate_clients.find(c => c.user_id === user.id);
        if (client) {
          clientId = client.id;
        }
      }

      const token = generateToken(user, clientId);
      return res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role, clientId }
      });
    } else {
      // MySQL Mode
      const [users] = await db.getPool().execute(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (users.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const user = users[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      let clientId = null;
      if (user.role === 'client') {
        const [clients] = await db.getPool().execute(
          'SELECT id FROM corporate_clients WHERE user_id = ?',
          [user.id]
        );
        if (clients.length > 0) {
          clientId = clients[0].id;
        }
      }

      const token = generateToken(user, clientId);
      return res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role, clientId }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get profile
exports.getMe = async (req, res) => {
  try {
    if (db.isMock()) {
      const data = db.mock.load();
      const user = data.users.find(u => u.id === req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      let clientId = null;
      if (user.role === 'client') {
        const client = data.corporate_clients.find(c => c.user_id === user.id);
        if (client) clientId = client.id;
      }

      return res.json({ id: user.id, username: user.username, email: user.email, role: user.role, clientId });
    } else {
      const [users] = await db.getPool().execute(
        'SELECT id, username, email, role FROM users WHERE id = ?',
        [req.user.id]
      );
      if (users.length === 0) return res.status(404).json({ message: 'User not found' });
      
      const user = users[0];
      let clientId = null;
      if (user.role === 'client') {
        const [clients] = await db.getPool().execute(
          'SELECT id FROM corporate_clients WHERE user_id = ?',
          [user.id]
        );
        if (clients.length > 0) {
          clientId = clients[0].id;
        }
      }

      return res.json({ ...user, clientId });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
