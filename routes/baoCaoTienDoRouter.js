const express = require('express');
const {
  protect,
  getUsers,
  restrictTo,
} = require('../controllers/authController');
const {
  createBaoCaoTienDo,
  getAllBaoCaoTienDo,
  getBaoCaoTienDo,
  updateBaoCaoTienDo,
  deleteBaoCaoTienDo,
} = require('../controllers/baoCaoTienDoController');
const baoCaoRouter = require('./baoCaoRouter');

const router = express.Router({ mergeParams: true });
router.use('/:id/bao-cao', baoCaoRouter);
router.use(protect);

router
  .route('/')
  .post(restrictTo('Cán bộ khoa'), getUsers, createBaoCaoTienDo)
  .get(getUsers, getAllBaoCaoTienDo);
router
  .route('/:id')
  .get(getUsers, getBaoCaoTienDo)
  .patch(restrictTo('Cán bộ khoa'), getUsers, updateBaoCaoTienDo)
  .delete(restrictTo('Cán bộ khoa'), getUsers, deleteBaoCaoTienDo);
module.exports = router;
