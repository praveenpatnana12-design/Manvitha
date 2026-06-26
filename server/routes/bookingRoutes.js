const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// All authenticated users can view bookings (controller filters by client if logged in as client)
router.get('/', bookingController.getBookings);

// Only Admins or Accounts can register new trips, vehicles, or drivers
router.post('/', roleMiddleware(['admin', 'accounts']), bookingController.createBooking);
router.get('/vehicles', roleMiddleware(['admin', 'accounts']), bookingController.getVehicles);
router.get('/drivers', roleMiddleware(['admin', 'accounts']), bookingController.getDrivers);

module.exports = router;
