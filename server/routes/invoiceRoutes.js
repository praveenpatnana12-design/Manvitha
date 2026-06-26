const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Open to all roles (clients isolated inside the controller)
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.get('/:id/pdf', invoiceController.downloadInvoicePDF);
router.get('/:id/csv', invoiceController.downloadInvoiceCSV);

// Restricted to Billing Admin/Accounts
router.post('/', roleMiddleware(['admin', 'accounts']), invoiceController.generateInvoice);
router.put('/:id', roleMiddleware(['admin', 'accounts']), invoiceController.updateInvoice);

module.exports = router;
