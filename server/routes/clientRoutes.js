const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Only Admins or Accounts team can view/manage corporate client profiles
router.get('/', roleMiddleware(['admin', 'accounts']), clientController.getClients);
router.post('/', roleMiddleware(['admin', 'accounts']), clientController.createClient);
router.put('/:id', roleMiddleware(['admin', 'accounts']), clientController.updateClient);

module.exports = router;
