const express = require('express');
const router = express.Router();
const { listAnime, getAnimeById, listGenresForAnime } = require('../controllers/animeController');

router.get('/anime', listAnime);
router.get('/anime/:id', getAnimeById);
router.get('/anime/:id/genres', listGenresForAnime);

module.exports = router;
