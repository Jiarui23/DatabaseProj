const express = require('express');
const router = express.Router();
const { listAnime, getAnimeById } = require('../controllers/animeController');

router.get('/anime', listAnime);
router.get('/anime/:id', getAnimeById);

module.exports = router;
