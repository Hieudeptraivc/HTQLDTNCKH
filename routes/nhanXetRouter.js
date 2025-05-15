const express = require('express');
const {
  protect,
  restrictTo,
  getUsers,
} = require('../controllers/authController');
const {
  createNhanXet,
  getAllNhanXet,
  getNhanXet,
  updateNhanXet,
  deleteNhanXet,
} = require('../controllers/nhanXetController');

const router = express.Router({ mergeParams: true });

router.use(protect);

router
  .route('/')
  .post(restrictTo('Giảng viên'), getUsers, createNhanXet)
  .get(restrictTo('Giảng viên', 'Sinh viên'), getUsers, getAllNhanXet);

router
  .route('/:nhanXetId')
  .get(restrictTo('Giảng viên', 'Sinh viên'), getUsers, getNhanXet)
  .patch(restrictTo('Giảng viên'), getUsers, updateNhanXet)
  .delete(restrictTo('Giảng viên'), getUsers, deleteNhanXet);

module.exports = router;
