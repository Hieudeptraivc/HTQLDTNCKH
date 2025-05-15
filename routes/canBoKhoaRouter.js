const express = require('express');

const {
  protect,
  restrictTo,
  getUsers,
} = require('../controllers/authController');
const {
  getAllCanBoKhoa,
  getCanBoKhoa,
  getIdCanBoKhoa,
} = require('../controllers/canBoKhoaController');

const router = express.Router();

router.use(protect);
router.get('/dscbk', getUsers, getIdCanBoKhoa);
router.use(restrictTo('Admin'));
router.route('/').get(getUsers, getAllCanBoKhoa);
router.route('/:id').get(getUsers, getCanBoKhoa);
module.exports = router;
