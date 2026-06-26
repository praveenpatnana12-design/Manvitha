-- Corporate Account Billing & Monthly Statement Portal
-- Database Schema for Manivtha Tours & Travels

CREATE DATABASE IF NOT EXISTS manvitha_billing;
USE manvitha_billing;

-- Drop tables if they exist (reverse order of dependencies)
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS ticket_replies;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS statements;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS corporate_clients;
DROP TABLE IF EXISTS users;

-- Users Table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'accounts', 'client') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_username (username),
  INDEX idx_users_role (role)
);

-- Corporate Clients Profile
CREATE TABLE corporate_clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  company_name VARCHAR(150) NOT NULL,
  gst_number VARCHAR(15) NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  credit_limit DECIMAL(12,2) DEFAULT 100000.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_clients_company (company_name),
  INDEX idx_clients_user (user_id)
);

-- Vehicles Table
CREATE TABLE vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  registration_number VARCHAR(20) NOT NULL UNIQUE,
  model VARCHAR(50) NOT NULL,
  type ENUM('Sedan', 'SUV', 'Traveller', 'Bus') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers Table
CREATE TABLE drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  license_number VARCHAR(50) NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings / Trips Table
CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  driver_id INT NOT NULL,
  trip_date DATETIME NOT NULL,
  source VARCHAR(150) NOT NULL,
  destination VARCHAR(150) NOT NULL,
  distance_km DECIMAL(8,2) NOT NULL,
  rate_per_km DECIMAL(6,2) NOT NULL,
  toll_charges DECIMAL(8,2) DEFAULT 0.00,
  other_charges DECIMAL(8,2) DEFAULT 0.00,
  subtotal DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('completed', 'cancelled', 'pending') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES corporate_clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT,
  INDEX idx_bookings_client (client_id),
  INDEX idx_bookings_date (trip_date)
);

-- Invoices Table
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  client_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  taxable_amount DECIMAL(12,2) NOT NULL,
  cgst DECIMAL(10,2) NOT NULL,
  sgst DECIMAL(10,2) NOT NULL,
  igst DECIMAL(10,2) NOT NULL,
  total_gst DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status ENUM('paid', 'pending', 'overdue') DEFAULT 'pending',
  pdf_path VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES corporate_clients(id) ON DELETE RESTRICT,
  INDEX idx_invoices_client (client_id),
  INDEX idx_invoices_number (invoice_number),
  INDEX idx_invoices_status (status)
);

-- Payments Table
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT DEFAULT NULL,
  client_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATETIME NOT NULL,
  payment_method ENUM('NEFT', 'IMPS', 'Card', 'Cash', 'UPI') NOT NULL,
  transaction_reference VARCHAR(100) DEFAULT NULL,
  status ENUM('success', 'pending', 'failed') DEFAULT 'success',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES corporate_clients(id) ON DELETE RESTRICT,
  INDEX idx_payments_client (client_id),
  INDEX idx_payments_invoice (invoice_id)
);

-- Statements Table
CREATE TABLE statements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  statement_number VARCHAR(50) NOT NULL UNIQUE,
  client_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_bookings INT DEFAULT 0,
  total_invoiced DECIMAL(12,2) DEFAULT 0.00,
  total_paid DECIMAL(12,2) DEFAULT 0.00,
  outstanding_amount DECIMAL(12,2) DEFAULT 0.00,
  status ENUM('sent', 'draft') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES corporate_clients(id) ON DELETE CASCADE,
  INDEX idx_statements_client (client_id),
  INDEX idx_statements_number (statement_number)
);

-- Support Tickets Table
CREATE TABLE support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  subject VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES corporate_clients(id) ON DELETE CASCADE,
  INDEX idx_tickets_client (client_id),
  INDEX idx_tickets_status (status)
);

-- Ticket Replies Table
CREATE TABLE ticket_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('invoice', 'statement', 'payment_due', 'ticket') NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_unread (user_id, is_read)
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  action VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
