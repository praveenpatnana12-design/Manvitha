# Corporate Account Billing & Monthly Statement Portal
### Developed for **Manivtha Tours & Travels**

A full-stack, enterprise-grade billing and trip statement portal built to automate logistics billing, GST calculations, statement distributions, support ticket threads, and provide AI-generated travel and cost insights. It eliminates manual WhatsApp and spreadsheet tracking.

---

## 🚀 Key Features

* **Role-Based Access Control**: Separate interfaces and permissions for **Admin**, **Accounts Team**, and **Corporate Clients**.
* **Trip & Booking Ledger**: Centralized log of completed passenger trips including routes, distances, vehicle details, driver assignments, and automated billing.
* **Automated GST Invoicing**: Auto-generates billing invoices for a client's monthly usage. Calculates 5% transport GST and splits it dynamically into CGST & SGST (Intra-state central/state tax) or IGST (Inter-state unified tax) based on regional GSTIN parameters.
* **Consolidated Statement Generator**: Collates a month's bookings, invoices, and payments into a single, cohesive account statement ledger.
* **Flexible PDF & CSV Exports**: Streams transactional datasets as standard CSV files and formats professional invoice/statement receipts as corporate PDF files.
* **Simulated NEFT/UPI Checkout**: Enables clients to pay pending invoices on-portal through a simulated bank transfer form that logs transaction reference numbers.
* **Threaded Support System**: Multi-user query discussion thread where clients can dispute invoice charges and accounts personnel can reply and change ticket states.
* **AI Billing Insights**: Integrates with Google Gemini AI to analyze corporate trip patterns, detect invoice delays, and offer fleet consolidation recommendations (with a smart rule-based analytics engine fallback).
* **Dual Database Modes**: Automatically tests for local MySQL services on startup. If unavailable, it falls back to a persistent JSON-based mock database file, remaining 100% operational out of the box.

---

## 📁 Project Directory Structure

```
manvitha/
├── client/                 # React.js Frontend (Vite)
│   ├── src/
│   │   ├── components/     # Sidebar, Navbar, Modal overlays, Toast alerts
│   │   ├── context/        # Session AuthContext & Axios configurations
│   │   ├── pages/          # Login, Dashboards, Trips, Invoices, GST, Support, AI
│   │   ├── index.css       # Tailwind base directives & custom themes
│   │   ├── main.jsx        # App mount tree
│   │   └── App.jsx         # Layouts, client routes, and session guards
│   ├── tailwind.config.js  # Styling definitions
│   └── package.json        # Frontend libraries
│
├── server/                 # Node.js & Express.js Backend API
│   ├── config/             # DB pools, schema seeder, mock JSON managers
│   ├── controllers/        # Business controllers executing SQL/Mock commands
│   ├── middleware/         # Session verify, role verify, error handler
│   ├── routes/             # Express API sub-routing paths
│   ├── utils/              # PDF generator, CSV parser, Nodemailer, AI engine
│   ├── public/             # Static storage for compiled PDFs
│   ├── test-api.js         # Integration test suite
│   └── package.json        # Backend libraries
│
└── database/               # Database resources
    ├── schema.sql          # Full normalised MySQL relational schema
    └── seed.js             # Seed script to initialize local databases
```

---

## 🛠️ Technical Specifications & Setup

### ⚡ Single Command Startup (Recommended)
You can set up and run both the frontend React client and the backend Express API server concurrently from the root folder in one go:

1. **Install all dependencies** (for both client and server):
   ```bash
   npm run install-all
   ```
2. **Start both servers simultaneously**:
   ```bash
   npm start
   ```

---

### Manual Setup (Alternative)

### Requirements
* **Node.js**: `v18.0.0` or higher
* **MySQL**: (Optional) Standard local server

### 1. Backend Server Setup
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. The dependencies are pre-installed. To manually verify or re-install:
   ```bash
   npm install
   ```
3. Environment Configuration:
   Verify the configuration variables inside `server/.env`.
   * **Database**: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`.
   * **JWT Session Key**: `JWT_SECRET` (used to sign user tokens).
   * **AI Keys**: `GEMINI_API_KEY` (highly recommended to enable AI deep summaries; falls back to rule analytics if blank).
4. Run Backend Server:
   ```bash
   npm run dev
   ```
   The backend boots on **`http://localhost:5000`**.

### 2. Frontend Client Setup
1. Navigate to the client folder:
   ```bash
   cd client
   ```
2. To manually install frontend components:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Run Development Server:
   ```bash
   npm run dev
   ```
   The dev server launches on **`http://localhost:3000`** with a hot-proxy forwarding `/api` queries to the backend.

### 3. Database Initialisation (MySQL Mode)
If you have a local MySQL instance running, configure details in `server/.env` and execute the schema initialization seeder:
```bash
node database/seed.js
```
*If MySQL is not active, the backend server will print a warning on launch and automatically run on the persistent mock file `server/mock_db.json`. Any records created or altered will persist in this file.*

---

## 🧪 Running Integration Tests

To run the automated suite testing endpoints, auth sessions, me queries, dashboards, and booking lists:
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Trigger the tests:
   ```bash
   npm test
   ```
   This spins up the test suite on port `5051` and runs standard validation checks.

---

## 🔑 Demo Account Credentials

Use these credentials to test role layouts in the Login page:

| Username | Password | User Role | Description |
| :--- | :--- | :--- | :--- |
| `admin` | `password123` | **Admin** | Full system administration, client registrations |
| `accounts` | `password123` | **Accounts Team** | Log bookings, compile invoices & statements, answer tickets |
| `infosys_billing` | `password123` | **Corporate Client** | Settle invoices, download PDF statements, raise tickets, view AI metrics |

---

## 📘 Core API Documentation

### Authentication Routing
* `POST /api/auth/login` - Authenticates credentials, returns JWT token.
* `POST /api/auth/register` - Creates user portal account. (Admin/Accounts role only).
* `GET /api/auth/me` - Validates session token, returns profile scope.

### Dashboard Operations
* `GET /api/dashboard` - Compiles total trip quantities, ledger balances, GST tax sums, notifications feed, and AI brief summaries.

### Corporate Accounts
* `GET /api/clients` - Fetches the client list. (Admin/Accounts only).
* `POST /api/clients` - Registers a corporate account and spawns linked portal credentials in one transaction.

### Trip Bookings
* `GET /api/bookings` - Fetches booking lists (date range & client parameters).
* `POST /api/bookings` - Schedules a passenger trip. Auto-calculates tax totals.

### Invoice Management
* `GET /api/invoices` - Lists invoices.
* `GET /api/invoices/:id` - Detailed invoice summary containing booking rows.
* `POST /api/invoices` - Aggregates uninvoiced monthly bookings into a new PDF Invoice document.
* `GET /api/invoices/:id/pdf` - Streams compiled PDF file.
* `GET /api/invoices/:id/csv` - Streams bookings breakdown as a CSV spreadsheet.

### Payment Settle
* `GET /api/payments` - Lists payment history.
* `POST /api/payments` - Settle pending invoices. Marks invoice as PAID.

### Consolidated Statements
* `GET /api/statements` - List compiled statement history.
* `POST /api/statements/generate` - Summarizes bookings, invoices, and payments in a PDF file statement.
* `GET /api/statements/:id/pdf` - Download consolidated PDF.
* `GET /api/statements/:id/csv` - Download period invoice list as CSV.

### Threaded Support Tickets
* `GET /api/tickets` - List ticket queues.
* `GET /api/tickets/:id` - Detail ticket conversation replies thread.
* `POST /api/tickets` - Opens support ticket query.
* `POST /api/tickets/:id/reply` - Appends a conversation reply. Can toggle status values.

### AI Billing Insights
* `POST /api/ai/billing-summary` - Computes travel averages, airport run rankings, overdue reminders, and cost-reduction opportunities.
