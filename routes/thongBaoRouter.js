const express = require('express');
const { protect, getUsers } = require('../controllers/authController');
const {
  createThongBao,
  getThongBaosForUser,
  markAsRead,
} = require('../controllers/thongBaoController');

const router = express.Router();

router.use(protect);

router.route('/').post(createThongBao).get(getUsers, getThongBaosForUser);

// Đánh dấu thông báo đã đọc
router.patch('/read', getUsers, markAsRead);

module.exports = router;
