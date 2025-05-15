const CanBoKhoa = require('../models/canbokhoaModel');
const TaiKhoan = require('../models/taikhoanModels');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/errorAsync');

exports.getAllCanBoKhoa = catchAsync(async (req, res, next) => {
  let taiKhoanIds = null;

  // Nếu có lọc theo trạng thái tài khoản
  if (req.query.trangThai !== undefined && req.query.trangThai !== 'all') {
    const trangThaiBool = req.query.trangThai === 'true';
    const taiKhoans = await TaiKhoan.find({ trangThai: trangThaiBool }).select(
      '_id',
    );
    taiKhoanIds = taiKhoans.map((tk) => tk._id);
  }

  let query = CanBoKhoa.find();

  // Áp điều kiện lọc tài khoản nếu cần
  if (taiKhoanIds) {
    query = query.where('taiKhoan').in(taiKhoanIds);
  }

  const features = new APIFeatures(query, req.query, ['ten', 'soDienThoai'])
    .filter(['trangThai'])
    .sort()
    .limitFields()
    .pagination();

  const allCanBoKhoa = await features.query;
  // console.log(allCanBoKhoa);
  let totalCount;
  if (taiKhoanIds) {
    totalCount = await CanBoKhoa.countDocuments({
      ...features.query._conditions,
      taiKhoan: { $in: taiKhoanIds },
    });
  } else {
    totalCount = await CanBoKhoa.countDocuments(features.query._conditions);
  }

  res.status(200).json({
    status: 'success',
    data: {
      allCanBoKhoa,
      totalCount,
    },
  });
});

exports.getCanBoKhoa = catchAsync(async (req, res, next) => {
  // console.log(req.user)
  const canBoKhoa = await CanBoKhoa.findById(req.params.id);
  if (!canBoKhoa) {
    return next(new AppError('ID cán bộ khoa không hợp lệ', 404));
  }
  const taiKhoan = await TaiKhoan.findById(canBoKhoa.taiKhoan._id).select(
    '+trangThai',
  );
  // console.log(taiKhoan);
  if (!taiKhoan) {
    return next(new AppError('ID tài khoản cán bộ khoa không hợp lệ', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      canBoKhoa,
      taiKhoan,
    },
  });
});

exports.getIdCanBoKhoa = catchAsync(async (req, res, next) => {
  let allCanBoKhoa;
  if (req.account.vaiTro !== 'Admin') {
    allCanBoKhoa = await CanBoKhoa.find({ khoa: req.user.khoa }).select('_id');
  } else {
    allCanBoKhoa = await CanBoKhoa.find().select('_id');
  }
  allCanBoKhoa = allCanBoKhoa.map((cbk) => cbk._id);
  res.status(200).json({
    status: 'success',
    data: {
      allCanBoKhoa,
    },
  });
});
