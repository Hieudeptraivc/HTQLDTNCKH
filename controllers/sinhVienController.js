const GiangVien = require('../models/giangvienModel');
const SinhVien = require('../models/sinhvienModel');
const TaiKhoan = require('../models/taikhoanModels');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/errorAsync');

exports.getAllSinhVien = catchAsync(async (req, res, next) => {
  if (req.account.vaiTro === 'Cán bộ khoa') {
    req.query.khoa = req.user.khoa._id;
  }
  let taiKhoanIds = null;

  if (req.query.trangThai !== undefined && req.query.trangThai !== 'all') {
    const trangThaiBool = req.query.trangThai === 'true';
    const taiKhoans = await TaiKhoan.find({ trangThai: trangThaiBool }).select(
      '_id',
    );
    taiKhoanIds = taiKhoans.map((tk) => tk._id);
  }

  let query = SinhVien.find();

  if (taiKhoanIds) {
    query = query.where('taiKhoan').in(taiKhoanIds);
  }

  const features = new APIFeatures(query, req.query, [
    'ten',
    'mssv',
    'soDienThoai',
  ])
    .filter(['trangThai'])
    .sort()
    .limitFields()
    .pagination();
  const allSinhVien = await features.query;

  let totalCount;
  if (taiKhoanIds) {
    totalCount = await SinhVien.countDocuments({
      ...features.query._conditions,
      taiKhoan: { $in: taiKhoanIds },
    });
  } else {
    totalCount = await SinhVien.countDocuments(features.query._conditions);
  }
  res.status(200).json({
    status: 'success',
    data: {
      allSinhVien,
      totalCount,
    },
  });
});

exports.getSinhVien = catchAsync(async (req, res, next) => {
  // console.log(req.user);
  const filter = req.params.id;
  if (req.account.vaiTro === 'Sinh viên' && filter !== req.user._id.toString())
    return next(
      new AppError('Sinh viên chỉ có quyền truy cập thông tin của mình', 403),
    );
  if (req.account.vaiTro === 'Giảng viên')
    return next(
      new AppError(
        'Giảng viên không có quyền truy cập thông tin sinh viên',
        403,
      ),
    );
  const sinhVien = await SinhVien.findById(filter);
  const taiKhoan = await TaiKhoan.findById(sinhVien.taiKhoan._id).select(
    '+trangThai',
  );
  if (
    sinhVien.taiKhoan.trangThai === false &&
    req.account.vaiTro !== ('Cán bộ khoa' || 'Admin')
  ) {
    return next(
      new AppError(
        'Tài khoản hiện tại của người dùng đã bị vô hiệu hóa hoặc người dùng đã bị xóa',
      ),
    );
  }
  if (
    req.account.vaiTro === 'Cán bộ khoa' &&
    sinhVien.khoa._id.toString() !== req.user.khoa._id.toString()
  ) {
    return next(
      new AppError(
        'Bạn chỉ có quyền truy cập thông tin sinh viên của khoa mình',
      ),
      403,
    );
  }
  res.status(200).json({
    status: 'success',
    data: {
      sinhVien,
      taiKhoan,
    },
  });
});

exports.getDsSinhVien = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(SinhVien.find(), req.query, ['ten', 'mssv'])
    .filter(['trangThai'])
    .sort()
    .limitFields()
    .pagination();
  const dsSinhVien = await features.query;
  const totalCount = await SinhVien.countDocuments(features.query._conditions);
  res.status(200).json({
    status: 'success',
    data: {
      dsSinhVien,
      totalCount,
    },
  });
});
