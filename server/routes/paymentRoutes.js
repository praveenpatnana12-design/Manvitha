const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// All roles can list and post payments
router.get('/', paymentController.getPayments);
router.post('/', paymentController.recordPayment);

module.exports = router;
