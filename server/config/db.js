const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const mockDb = require('./mockDb');

dotenv.config();

let pool = null;
let isMock = false;

const testConnection = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'manvitha_billing',
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Test the connection
    const connection = await pool.getConnection();
    console.log('MySQL Database connected successfully.');
    connection.release();
    isMock = false;
  } catch (error) {
    console.log('Database Connection Status: Running in Mock JSON database mode.');
    pool = null;
    isMock = true;
    mockDb.init();
  }
};

// Immediately invoke connection test
testConnection();

module.exports = {
  getPool: () => pool,
  isMock: () => isMock,
  mock: mockDb,
  // Executed if in MySQL mode
  query: async (sql, params) => {
    if (isMock) {
      throw new Error('Query executed in MySQL mode while running in Mock fallback.');
    }
    const [results] = await pool.execute(sql, params);
    return results;
  }
};
