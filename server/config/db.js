const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const mockDb = require('./mockDb');

dotenv.config();

let pool = null;
let isMock = true;

const testConnection = async () => {
  const hasDbConfig = process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME;
  
  if (!hasDbConfig) {
    console.log('Database Connection Status: Running in Mock JSON database mode (No config).');
    pool = null;
    isMock = true;
    mockDb.init();
    return;
  }

  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
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
