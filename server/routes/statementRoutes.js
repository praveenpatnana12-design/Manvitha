const express = require('express');
const router = express.Router();
const statementController = require('../controllers/statementController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Open view & download for all relevant entities
router.get('/', statementController.getStatements);
router.get('/:id/pdf', statementController.downloadStatementPDF);
router.get('/:id/csv', statementController.downloadStatementCSV);

// Generation locked to admin & accounts
router.post('/generate', roleMiddleware(['admin', 'accounts']), statementController.generateStatement);

module.exports = router;
