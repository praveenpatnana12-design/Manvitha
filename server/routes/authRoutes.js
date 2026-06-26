const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public route
router.post('/login', authController.login);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);

// Only Admins or Accounts team can register new users/clients
router.post('/register', authMiddleware, roleMiddleware(['admin', 'accounts']), authController.register);

module.exports = router;
