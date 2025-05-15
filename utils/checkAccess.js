const AppError = require('./appError');

exports.checkAccess = (deTai, account, user) => {
  if (
    account.vaiTro === 'Cán bộ khoa' &&
    user.khoa._id.toString() !== deTai.khoa._id.toString()
  ) {
    throw new AppError('Bạn không có quyền truy cập đề tài này', 403);
  }
  if (account.vaiTro === 'Sinh viên') {
    const isSinhVien = deTai.sinhVien.some(
      (sv) => sv.sinhVienId._id.toString() === account.nguoiDung.toString(),
    );
    if (!isSinhVien) {
      throw new AppError(
        'Bạn không có quyền truy cập đề tài mình không tham gia',
        403,
      );
    }
  }
  if (account.vaiTro === 'Giảng viên') {
    const isGiangVien = deTai.giangVien.some(
      (gv) => gv.giangVienId._id.toString() === account.nguoiDung.toString(),
    );
    if (!isGiangVien) {
      throw new AppError(
        'Bạn không có quyền truy cập đề tài mình không hướng dẫn',
        403,
      );
    }
  }
};
