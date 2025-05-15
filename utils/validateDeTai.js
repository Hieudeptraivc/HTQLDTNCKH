const GiangVien = require('../models/giangvienModel');
const SinhVien = require('../models/sinhvienModel');
const AppError = require('../utils/appError');

const countRoles = (arr, role) => arr.filter((el) => el.vaiTro === role).length;

const checkUniqueRoles = (arr, idField, errorMessage) => {
  const idSet = new Set();

  arr.forEach((item) => {
    const id = item[idField].toString();
    if (idSet.has(id)) {
      throw new AppError(errorMessage, 400);
    }
    idSet.add(id);
  });
};

exports.validateDeTai = async function (next) {
  try {
    // Kiểm tra trùng lặp giảng viên mong muốn & giảng viên hướng dẫn
    checkUniqueRoles(
      this.sinhVien,
      'sinhVienId',
      'Mỗi sinh viên chỉ xuất hiện một lần với một vai trò duy nhất',
    );
    checkUniqueRoles(
      this.giangVienMongMuon,
      'giangVienMongMuonId',
      'Mỗi giảng viên mong muốn chỉ xuất hiện một lần với một vai trò duy nhất',
    );
    checkUniqueRoles(
      this.giangVien,
      'giangVienId',
      'Mỗi giảng viên chỉ xuất hiện một lần với một vai trò duy nhất',
    );

    // Kiểm tra số lượng trưởng nhóm & giảng viên hướng dẫn chính
    if (countRoles(this.sinhVien, 'Trưởng nhóm') < 1) {
      return next(
        new AppError('Mỗi đề tài phải có trưởng nhóm chịu trách nhiệm'),
      );
    }
    if (countRoles(this.sinhVien, 'Trưởng nhóm') > 1) {
      return next(new AppError('Mỗi đề tài chỉ có 1 trưởng nhóm', 400));
    }

    if (countRoles(this.giangVienMongMuon, 'Giảng viên hướng dẫn chính') > 1) {
      return next(
        new AppError('Mỗi đề tài chỉ có 1 giảng viên hướng dẫn chính', 400),
      );
    }

    if (countRoles(this.giangVien, 'Giảng viên hướng dẫn chính') > 1) {
      return next(
        new AppError('Mỗi đề tài chỉ có 1 giảng viên hướng dẫn chính', 400),
      );
    }

    // Lấy danh sách giảng viên hướng dẫn chính & trưởng nhóm sinh viên từ DB
    // console.log(this.sinhVien, this.giangVien);
    const truongNhomIds = this.sinhVien.find(
      (sv) => sv.vaiTro === 'Trưởng nhóm',
    ).sinhVienId;
    const gvChinhIds = [...this.giangVienMongMuon, ...this.giangVien]
      .filter((gv) => gv.vaiTro === 'Giảng viên hướng dẫn chính')
      .map((gv) =>
        gv.giangVienMongMuonId ? gv.giangVienMongMuonId : gv.giangVienId,
      );
    // console.log(gvChinhIds);
    // console.log(truongNhomIds);
    const [giangVienList, sinhVienList] = await Promise.all([
      GiangVien.find({ _id: { $in: gvChinhIds } }, 'khoa'),
      SinhVien.find({ _id: { $in: truongNhomIds } }, 'khoa'),
    ]);
    // console.log(giangVienList, sinhVienList);

    // Kiểm tra xem giảng viên & trưởng nhóm có cùng khoa với đề tài không

    const isInvalidKhoa =
      giangVienList.some(
        (gv) => gv.khoa && gv.khoa._id.toString() !== this.khoa._id.toString(),
      ) ||
      sinhVienList.some(
        (sv) => sv.khoa && sv.khoa._id.toString() !== this.khoa._id.toString(),
      );
    // console.log(isInvalidKhoa);
    if (isInvalidKhoa) {
      return next(
        new AppError(
          'Trưởng nhóm & giảng viên hướng dẫn chính phải cùng khoa với đề tài',
          400,
        ),
      );
    }

    next();
  } catch (err) {
    return next(new AppError(err.message, err.statusCode));
  }
};
