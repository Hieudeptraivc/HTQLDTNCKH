const express = require('express');
const {
  getDsGiangVien,
  getGiangVien,
} = require('../controllers/giangVienController');
const {
  protect,
  restrictTo,
  getUsers,
} = require('../controllers/authController');
const { getAllGiangVien } = require('../controllers/giangVienController');

const router = express.Router();

router.use(protect);
router.route('/dsgv').get(getDsGiangVien);
router
  .route('/')
  .get(restrictTo('Admin', 'Cán bộ khoa'), getUsers, getAllGiangVien);
router
  .route('/:id')
  .get(
    restrictTo('Giảng viên', 'Cán bộ khoa', 'Admin'),
    getUsers,
    getGiangVien,
  );
module.exports = router;
