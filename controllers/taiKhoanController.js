const CanBoKhoa = require('../models/canbokhoaModel');
const DeTai = require('../models/detaiModels');
const GiangVien = require('../models/giangvienModel');
const SinhVien = require('../models/sinhvienModel');
const TaiKhoan = require('../models/taikhoanModels');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/errorAsync');

exports.getAllTaiKhoan = catchAsync(async (req, res, next) => {
  const baseQuery = TaiKhoan.find({ vaiTro: { $ne: 'Admin' } })
    .select('+trangThai')
    .lean();

  const features = new APIFeatures(baseQuery, req.query, [
    'tenDangNhap',
    'email',
  ])
    .filter(['khoa'])
    .sort()
    .limitFields();

  let allDsTaiKhoan = await features.query;

  allDsTaiKhoan = await Promise.all(
    allDsTaiKhoan.map(async (tk) => {
      let nguoiDung = null;
      if (tk.vaiTro === 'Giảng viên') {
        nguoiDung = await GiangVien.findOne({ taiKhoan: tk._id }).lean();
      } else if (tk.vaiTro === 'Sinh viên') {
        nguoiDung = await SinhVien.findOne({ taiKhoan: tk._id }).lean();
      } else if (tk.vaiTro === 'Cán bộ khoa') {
        nguoiDung = await CanBoKhoa.findOne({ taiKhoan: tk._id }).lean();
      }

      return {
        ...tk,
        nguoiDung: nguoiDung || null,
      };
    }),
  );

  // Lọc theo khoa nếu có
  let filteredDsTaiKhoan = allDsTaiKhoan;
  if (req.query.khoa) {
    filteredDsTaiKhoan = allDsTaiKhoan.filter(
      (tk) => tk.nguoiDung?.khoa?._id?.toString() === req.query.khoa,
    );
  }
  const totalCount = filteredDsTaiKhoan.length;
  let paginatedData = filteredDsTaiKhoan;
  if (req.query.page || req.query.limit) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;
    const end = page * limit;

    paginatedData = filteredDsTaiKhoan.slice(start, end);
  }
  res.status(200).json({
    status: 'success',
    data: {
      allTaiKhoan: paginatedData,
      totalCount,
    },
  });
});

exports.getTaiKhoan = catchAsync(async (req, res, next) => {
  const account = await TaiKhoan.findById(req.params.id)
    .select('+trangThai')
    .lean();
  let nguoiDung = null;
  if (account.vaiTro === 'Giảng viên') {
    nguoiDung = await GiangVien.findOne({ taiKhoan: account._id }).lean();
  } else if (account.vaiTro === 'Sinh viên') {
    nguoiDung = await SinhVien.findOne({ taiKhoan: account._id }).lean();
  } else if (account.vaiTro === 'Cán bộ khoa') {
    nguoiDung = await CanBoKhoa.findOne({ taiKhoan: account._id }).lean();
  }
  const taiKhoan = { ...account, nguoiDung: nguoiDung || null };

  res.status(200).json({
    status: 'success',
    data: {
      taiKhoan,
    },
  });
});
exports.updateTaiKhoan = catchAsync(async (req, res, next) => {
  // Tìm tài khoản theo ID
  let account = await TaiKhoan.findById(req.params.id);
  if (!account) {
    return next(new AppError('Không tìm thấy tài khoản thuộc về ID này', 404));
  }

  // Kiểm tra và cập nhật dữ liệu
  if (
    req.body.email &&
    (account.vaiTro === 'Cán bộ khoa' || account.vaiTro === 'Giảng viên')
  ) {
    account.email = req.body.email;
    account.tenDangNhap = req.body.email;
  }
  if (req.body.tenDangNhap && account.vaiTro === 'Sinh viên') {
    account.email = req.body.email;
    account.tenDangNhap = req.body.tenDangNhap;
  }
  if (req.body.matKhauMoi && req.body.matKhauMoiXacNhan) {
    if (req.body.matKhauMoi !== req.body.matKhauMoiXacNhan) {
      return next(
        new AppError('Mật khẩu mới và xác nhận mật khẩu không khớp', 400),
      );
    }
    account.matKhau = req.body.matKhauMoi;
    account.matKhauXacNhan = req.body.matKhauMoiXacNhan;
  }

  // Lưu tài khoản để chạy hook pre-save
  await account.save({ validateModifiedOnly: true });

  // Tìm người dùng theo vai trò
  let nguoiDung;
  switch (account.vaiTro) {
    case 'Sinh viên':
      nguoiDung = await SinhVien.findById(account.nguoiDung);
      break;
    case 'Giảng viên':
      nguoiDung = await GiangVien.findById(account.nguoiDung);
      break;
    case 'Cán bộ khoa':
      nguoiDung = await CanBoKhoa.findById(account.nguoiDung);
      break;
    default:
      return next(new AppError('Vai trò không hợp lệ', 400));
  }

  // Trả về kết quả
  res.status(200).json({
    status: 'success',
    data: {
      taiKhoan: account,
      nguoiDung,
    },
  });
});
exports.deleteTaiKhoan = catchAsync(async (req, res, next) => {
  const account = await TaiKhoan.findById(req.body.taiKhoan_Id);
  if (!account) {
    return next(new AppError('Không tìm thấy tài khoản', 404));
  }

  let nguoiDung = null;
  let loaiQuery = null;

  if (account.vaiTro === 'Giảng viên') {
    nguoiDung = await GiangVien.findOne({ taiKhoan: account._id });
    if (nguoiDung) loaiQuery = { 'giangVien.giangVienId': nguoiDung._id };
  } else if (account.vaiTro === 'Sinh viên') {
    nguoiDung = await SinhVien.findOne({ taiKhoan: account._id });
    if (nguoiDung) loaiQuery = { 'sinhVien.sinhVienId': nguoiDung._id };
  } else if (account.vaiTro === 'Cán bộ khoa') {
    nguoiDung = await CanBoKhoa.findOne({ taiKhoan: account._id });
  }
  // console.log(nguoiDung);
  if (loaiQuery) {
    const deTai = await DeTai.findOne(loaiQuery);
    if (deTai) {
      return next(
        new AppError(
          `Không thể xóa vì đang tham gia đề tài: ${deTai.ten}`,
          403,
        ),
      );
    }
  }

  // Xóa người dùng tương ứng nếu có
  if (nguoiDung) {
    await nguoiDung.deleteOne();
  }

  // Xóa tài khoản
  await account.deleteOne();

  res.status(200).json({
    status: 'success',
    data: null,
  });
});
