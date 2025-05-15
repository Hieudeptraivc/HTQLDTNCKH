const express = require('express');
const { protect, getUsers } = require('../controllers/authController');
const { getAllDeTaiCapTruong } = require('../controllers/deTaiController');

const router = express.Router();
router.use(protect);

router.route('/').get(getUsers, getAllDeTaiCapTruong);
module.exports = router;
