const express = require('express');
const router = express.Router();
const { autocomplete } = require('../controllers/autocompleteController');

router.get('/anime/autocomplete', autocomplete);

module.exports = router;
