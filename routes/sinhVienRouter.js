const express = require('express');
const {
  getAllSinhVien,
  getSinhVien,
  getDsSinhVien,
} = require('../controllers/sinhVienController');
const {
  protect,
  restrictTo,
  getUsers,
} = require('../controllers/authController');

const router = express.Router();

router.use(protect);
router
  .route('/')
  .get(restrictTo('Admin', 'Cán bộ khoa'), getUsers, getAllSinhVien);
router.route('/dssv').get(getDsSinhVien);
router
  .route('/:id')
  .get(restrictTo('Sinh viên', 'Cán bộ khoa', 'Admin'), getUsers, getSinhVien);
module.exports = router;
