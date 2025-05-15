const GiangVien = require('../models/giangvienModel');
const TaiKhoan = require('../models/taikhoanModels');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/errorAsync');

exports.getAllGiangVien = catchAsync(async (req, res, next) => {
  if (req.account.vaiTro === 'Cán bộ khoa') {
    req.query.khoa = req.user.khoa._id;
  }

  let taiKhoanIds = null;

  // Nếu có lọc theo trạng thái tài khoản
  if (req.query.trangThai !== undefined && req.query.trangThai !== 'all') {
    const trangThaiBool = req.query.trangThai === 'true';
    const taiKhoans = await TaiKhoan.find({ trangThai: trangThaiBool }).select(
      '_id',
    );
    taiKhoanIds = taiKhoans.map((tk) => tk._id);
  }

  let query = GiangVien.find();

  // Áp điều kiện lọc tài khoản nếu cần
  if (taiKhoanIds) {
    query = query.where('taiKhoan').in(taiKhoanIds);
  }

  const features = new APIFeatures(query, req.query, ['ten', 'soDienThoai'])
    .filter(['trangThai'])
    .sort()
    .limitFields()
    .pagination();

  const allGiangVien = await features.query;

  let totalCount;
  if (taiKhoanIds) {
    totalCount = await GiangVien.countDocuments({
      ...features.query._conditions,
      taiKhoan: { $in: taiKhoanIds },
    });
  } else {
    totalCount = await GiangVien.countDocuments(features.query._conditions);
  }

  res.status(200).json({
    status: 'success',
    data: {
      allGiangVien,
      totalCount,
    },
  });
});

exports.getGiangVien = catchAsync(async (req, res, next) => {
  // console.log(req.user);
  const filter = req.params.id;
  if (req.account.vaiTro === 'Giảng viên' && filter !== req.user._id.toString())
    return next(
      new AppError('Giảng viên chỉ có quyền truy cập thông tin của mình', 403),
    );
  if (req.account.vaiTro === 'Sinh viên')
    return next(
      new AppError(
        'Sinh viên không có quyền truy cập thông tin giảng viên',
        403,
      ),
    );
  const giangVien = await GiangVien.findById(filter);
  const taiKhoan = await TaiKhoan.findById(giangVien.taiKhoan._id).select(
    '+trangThai',
  );
  if (
    giangVien.taiKhoan.trangThai === false &&
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
    giangVien.khoa._id.toString() !== req.user.khoa._id.toString()
  ) {
    return next(
      new AppError(
        'Bạn chỉ có quyền truy cập thông tin giảng viên của khoa mình',
      ),
      403,
    );
  }
  res.status(200).json({
    status: 'success',
    data: {
      giangVien,
      taiKhoan,
    },
  });
});

exports.getDsGiangVien = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(GiangVien.find(), req.query, [
    'ten',
    'soDienThoai',
  ])
    .filter(['trangThai'])
    .sort()
    .limitFields()
    .pagination();

  const dsGiangVien = await features.query;
  const totalCount = await GiangVien.countDocuments(features.query._conditions);
  res.status(200).json({
    status: 'success',
    data: {
      dsGiangVien,
      totalCount,
    },
  });
});
