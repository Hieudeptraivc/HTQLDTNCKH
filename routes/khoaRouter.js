const express = require('express');
const {
  createKhoa,
  getAllKhoa,
  getKhoa,
  getDsKhoa,
  updateKhoa,
  deleteKhoa,
} = require('../controllers/khoaController');
const {
  protect,
  getUsers,
  restrictTo,
} = require('../controllers/authController');

const router = express.Router();
router.use(protect);
router
  .route('/')
  .post(restrictTo('Admin'), createKhoa)
  .get(restrictTo('Admin'), getAllKhoa);
router.route('/dsk').get(getDsKhoa);
router
  .route('/:id')
  .get(restrictTo('Admin'), getUsers, getKhoa)
  .patch(restrictTo('Admin'), getUsers, updateKhoa)
  .delete(restrictTo('Admin'), deleteKhoa);
module.exports = router;
