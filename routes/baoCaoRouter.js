const express = require('express');
const {
  protect,
  restrictTo,
  getUsers,
} = require('../controllers/authController');
const {
  createBaoCao,
  getAllBaoCao,
  getBaoCao,
  updateBaoCao,
  deleteBaoCao,
  getBaoCaoFile,
  taiBaoCaoFile,
} = require('../controllers/baoCaoController');
const nhanXetRouter = require('./nhanXetRouter');

const { upload } = require('../utils/uploadGridFS');

const router = express.Router({ mergeParams: true });
router.use('/:baoCaoId/nhan-xet/', nhanXetRouter);
router.use(protect);
router
  .route('/')
  .post(
    restrictTo('Sinh viên'),
    getUsers,
    upload.single('fileBaoCao'),
    createBaoCao,
  )
  .get(getUsers, getAllBaoCao);
router
  .route('/:baoCaoId')

  .get(getUsers, getBaoCao)
  .patch(
    restrictTo('Sinh viên'),
    getUsers,
    upload.single('fileBaoCao'),
    updateBaoCao,
  )
  .delete(restrictTo('Sinh viên', 'Cán bộ khoa'), getUsers, deleteBaoCao);
router.get('/:baoCaoId/file', getUsers, getBaoCaoFile);
router.get('/:baoCaoId/download-file', getUsers, taiBaoCaoFile);
module.exports = router;
