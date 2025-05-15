const express = require('express');
const {
  createDeTai,
  getDeTai,
  getAllDeTai,
  updateDeTai,
  disableDeTai,
  deleteDeTai,
  acceptDeTai,
  rejectDeTai,
  getLichSuDeTai,
  getChiTietThayDoi,

  reStartStatusDeTai,
  updateCapTruongDeTai,
  updateCapKhoaDeTai,
} = require('../controllers/deTaiController');
const baoCaoTienDoRouter = require('./baoCaoTienDoRouter');
const {
  protect,
  restrictTo,
  getUsers,
} = require('../controllers/authController');

const router = express.Router();
router.use(protect);
router.route('/lich-su/:id').get(getUsers, getLichSuDeTai);

router.route('/lich-su/chi-tiet/:lichSuId').get(getUsers, getChiTietThayDoi);
router.use('/:id/bao-cao-tien-do', baoCaoTienDoRouter);
router.patch('/:id/accept', restrictTo('Cán bộ khoa'), getUsers, acceptDeTai);
router.patch('/:id/reject', restrictTo('Cán bộ khoa'), getUsers, rejectDeTai);
router.patch(
  '/:id/restart',
  restrictTo('Cán bộ khoa'),
  getUsers,
  reStartStatusDeTai,
);
router.patch(
  '/:id/cap-truong',
  restrictTo('Cán bộ khoa'),
  getUsers,
  updateCapTruongDeTai,
);
router.patch(
  '/:id/cap-khoa',
  restrictTo('Cán bộ khoa'),
  getUsers,
  updateCapKhoaDeTai,
);
router
  .route('/')
  .post(restrictTo('Sinh viên', 'Cán bộ khoa'), getUsers, createDeTai)
  .get(getUsers, getAllDeTai);
router
  .route('/:id')
  .get(getUsers, getDeTai)
  .patch(restrictTo('Cán bộ khoa', 'Sinh viên'), getUsers, updateDeTai)
  .delete(restrictTo('Cán bộ khoa'), getUsers, deleteDeTai);
router
  .route('/:id/disable')
  .patch(restrictTo('Cán bộ khoa'), getUsers, disableDeTai);

module.exports = router;
