const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const {
  getAllTaiKhoan,
  getTaiKhoan,
  deleteTaiKhoan,
  updateTaiKhoan,
} = require('../controllers/taiKhoanController');

const router = express.Router();

router.use(protect);
router.use(restrictTo('Admin'));
router.route('/').get(getAllTaiKhoan).delete(deleteTaiKhoan);
router.route('/:id').get(getTaiKhoan).patch(updateTaiKhoan);
module.exports = router;
