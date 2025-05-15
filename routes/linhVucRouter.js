const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const {
  createLinhVuc,
  getAllLinhVuc,
  getDsLinhVuc,
  getLinhVuc,
  deleteLinhVuc,
  updateLinhVuc,
} = require('../controllers/linhVucController');

const router = express.Router();
router.use(protect);
router.route('/dslv').get(getDsLinhVuc);

router.use(restrictTo('Admin'));
router.route('/').post(createLinhVuc).get(getAllLinhVuc);
router.route('/:id').get(getLinhVuc).delete(deleteLinhVuc).patch(updateLinhVuc);

module.exports = router;
