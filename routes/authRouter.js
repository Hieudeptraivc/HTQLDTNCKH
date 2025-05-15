const express = require('express');
const {
  createAccount,
  createSinhVien,
  createGiangVien,
  createCanBoKhoa,
  login,
  restrictTo,
  forgotPassword,
  protect,
  resetPassword,
  updatePassword,
  updateSinhVien,
  updateGiangVien,
  updateCanBoKhoa,
  deleteAccountByMe,
  getUsers,

  deleteSinhVien,
  deleteGiangVien,
  getMe,
  deleteCanBoKhoa,
  logout,
  activeTaiKhoan,
  disableTaiKhoan,
  updateAdmin,
} = require('../controllers/authController');
const { checkKhoa } = require('../utils/checkKhoa');
const {
  uploadUserPhoto,
  resizeUserPhoto,
} = require('../utils/uploadUserPhoto');

const router = express.Router();

router.route('/login').post(login);
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password/:token').patch(resetPassword);

router.use(protect);
router.get('/logout', logout);
router.route('/me').get(getUsers, getMe);
router
  .route('/create-user/sinh-vien')
  .post(
    restrictTo('Admin', 'Cán bộ khoa'),
    checkKhoa('SinhVien'),
    createSinhVien,
  );
router
  .route('/create-user/giang-vien')
  .post(
    restrictTo('Admin', 'Cán bộ khoa'),
    checkKhoa('GiangVien'),
    createGiangVien,
  );
router
  .route('/create-user/can-bo-khoa')
  .post(restrictTo('Admin'), createCanBoKhoa);
// router
//   .route('/create-user/sinh-vien-khac')
//   .post(restrictTo('Sinh viên'), getUsers, createSinhVienNgoaiTruong);
router
  .route('/create-user/can-bo-khoa')
  .post(restrictTo('Admin'), createCanBoKhoa);
router.route('/update-my-password').patch(updatePassword);
router
  .route('/update-sinh-vien')
  .patch(
    checkKhoa('SinhVien'),
    uploadUserPhoto,
    resizeUserPhoto,
    updateSinhVien,
  );
router
  .route('/update-giang-vien')
  .patch(
    checkKhoa('GiangVien'),
    uploadUserPhoto,
    resizeUserPhoto,
    updateGiangVien,
  );
router
  .route('/update-can-bo-khoa')
  .patch(
    restrictTo('Admin', 'Cán bộ khoa'),
    uploadUserPhoto,
    resizeUserPhoto,
    updateCanBoKhoa,
  );
router
  .route('/delete-user/sinh-vien')
  .delete(
    restrictTo('Admin', 'Cán bộ khoa'),
    checkKhoa('SinhVien'),
    deleteSinhVien,
  );
router
  .route('/delete-user/giang-vien')
  .delete(
    restrictTo('Admin', 'Cán bộ khoa'),
    checkKhoa('GiangVien'),
    deleteGiangVien,
  );
router
  .route('/delete-user/can-bo-khoa')
  .delete(restrictTo('Admin'), deleteCanBoKhoa);
router
  .route('/delete-me')
  .delete(restrictTo('Sinh viên', 'Giảng viên'), getUsers, deleteAccountByMe);
router.route('/signup').post(restrictTo('Admin', 'Cán bộ khoa'), createAccount);
router.patch(
  '/active-tai-khoan',
  restrictTo('Admin', 'Cán bộ khoa'),
  activeTaiKhoan,
);
router.patch(
  '/disable-tai-khoan',
  restrictTo('Admin', 'Cán bộ khoa'),
  disableTaiKhoan,
);
router.patch(
  '/update-admin',
  restrictTo('Admin'),
  uploadUserPhoto,
  resizeUserPhoto,
  updateAdmin,
);
module.exports = router;
