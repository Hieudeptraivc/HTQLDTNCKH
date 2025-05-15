const TaiKhoan = require('../models/taikhoanModels');
const AppError = require('./appError');

exports.validateAndGetTaiKhoan = async function (taiKhoanId, session = null) {
  // console.log(taiKhoanId);
  // Truyền session vào truy vấn nếu có
  const findOptions = session ? { session } : {};
  const account = await TaiKhoan.findById(taiKhoanId, null, findOptions);

  if (!account) {
    throw new AppError('Tài khoản không tồn tại!', 400);
  }
  if (account.nguoiDung) {
    throw new AppError(
      'Tài khoản này đã được liên kết với người dùng khác!',
      400,
    );
  }
  return account;
};
