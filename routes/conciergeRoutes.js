const express = require('express');
const router = express.Router();
const { getConciergeResponse } = require('../controllers/conciergeController');

router.post('/query', getConciergeResponse);

module.exports = router;