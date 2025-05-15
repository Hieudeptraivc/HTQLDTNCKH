const BaoCao = require('../models/baocaoModel');
const BaoCaoTienDo = require('../models/baocaotiendoModel');
const DeTai = require('../models/detaiModels');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/errorAsync');
const { getDeTaiFilterByRole } = require('../utils/getDeTaiFilterByRole');
const { getFileMetadata } = require('../utils/uploadGridFs');

exports.createBaoCaoTienDo = catchAsync(async (req, res, next) => {
  if (!req.body.deTai) req.body.deTai = req.params.id;
  const deTai = await DeTai.findById(req.body.deTai);
  if (!deTai)
    return next(new AppError('Không tìm thấy đề tài gắn với ID này', 404));
  //   console.log(deTai.khoa._id, req.user.khoa._id, deTai.trangThaiDuyet);
  if (req.user.khoa._id.toString() !== deTai.khoa._id.toString())
    return next(
      new AppError(
        'Bạn chỉ có quyền tạo báo cáo tiến độ đề tài cho khoa của mình',
        403,
      ),
    );
  if (deTai.trangThaiDuyet !== 'Đã duyệt')
    return next(
      new AppError(
        'Chỉ có thể tạo các báo cáo tiến độ cho đề tài đã được duyệt',
        400,
      ),
    );

  const newBaoCaoTienDo = await BaoCaoTienDo.create({
    ...req.body,
    nguoiThayDoiCuoi: req.user._id,
  });
  res.status(200).json({
    status: 'success',
    data: {
      baoCaoTienDo: newBaoCaoTienDo,
      deTai,
    },
  });
});

exports.getAllBaoCaoTienDo = catchAsync(async (req, res, next) => {
  let filter;
  if (req.params.id) {
    filter = req.params.id;
  } else {
    filter = await getDeTaiFilterByRole(req);
  }
  if (!filter) {
    return res.status(200).json({
      status: 'success',
      data: {
        baoCaoTienDo: [],
      },
    });
  }
  const features = new APIFeatures(
    BaoCaoTienDo.find({
      deTai: { $in: filter },
    }).populate('baoCao'),
    req.query,
    ['ten'],
  )
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const allBaoCaoTienDo = await features.query;
  const totalCount = await BaoCaoTienDo.countDocuments({
    ...features.query._conditions,
    deTai: { $in: filter },
  });
  res.status(200).json({
    status: 'success',
    data: {
      allBaoCaoTienDo,
      totalCount,
    },
  });
});

exports.getBaoCaoTienDo = catchAsync(async (req, res, next) => {
  const baoCaoTienDo = await BaoCaoTienDo.findById(req.params.id).populate([
    {
      path: 'deTai',
    },
    { path: 'baoCao', select: '-baoCaoTienDo' },
  ]);
  if (!baoCaoTienDo) {
    return next(new AppError('Không tìm thấy báo cáo tiến độ', 404));
  }

  const filter = await getDeTaiFilterByRole(req);
  //   console.log(filter);
  if (req.account.vaiTro !== 'Admin') {
    const allowedDeTaiIds = filter.map((id) => id.toString()) || [];
    const currentDeTaiId = baoCaoTienDo.deTai._id.toString();
    //   console.log(
    //     allowedDeTaiIds,
    //     currentDeTaiId,
    //     !allowedDeTaiIds.includes(currentDeTaiId),
    //   );
    if (filter && !allowedDeTaiIds.includes(currentDeTaiId)) {
      return next(
        new AppError('Bạn không có quyền truy cập báo cáo tiến độ này', 403),
      );
    }
  }
  let fileInfo = null;
  if (baoCaoTienDo.baoCao.length > 0) {
    fileInfo = await getFileMetadata(baoCaoTienDo.baoCao[0].fileBaoCao);
  }
  res.status(200).json({
    status: 'success',
    data: {
      baoCaoTienDo,
      fileInfo,
    },
  });
});

exports.updateBaoCaoTienDo = catchAsync(async (req, res, next) => {
  const baoCaoTienDo = await BaoCaoTienDo.findById(req.params.id).populate({
    path: 'deTai',
  });
  if (!baoCaoTienDo) {
    return next(
      new AppError('Không tìm thấy báo cáo tiến độ theo ID này', 404),
    );
  }
  if (baoCaoTienDo.deTai.khoa._id.toString() !== req.user.khoa._id.toString()) {
    return next(
      new AppError('Bạn không có quyền cập nhật báo cáo tiến độ này', 403),
    );
  }
  req.body.deTai = baoCaoTienDo.deTai;
  req.body.ngayTao = baoCaoTienDo.ngayTao;
  Object.assign(baoCaoTienDo, req.body);
  baoCaoTienDo.nguoiThayDoiCuoi = req.user._id;
  baoCaoTienDo.ngayChinhSuaCuoi = Date.now();
  await baoCaoTienDo.save({ validateModifiedOnly: true });
  res.status(200).json({
    status: 'success',
    data: {
      baoCaoTienDo,
    },
  });
});

exports.deleteBaoCaoTienDo = catchAsync(async (req, res, next) => {
  const baoCaoTienDo = await BaoCaoTienDo.findById(req.params.id).populate({
    path: 'deTai',
  });
  if (!baoCaoTienDo) {
    return next(
      new AppError('Không tìm thấy báo cáo tiến độ theo ID này', 404),
    );
  }
  if (baoCaoTienDo.deTai.khoa._id.toString() !== req.user.khoa._id.toString()) {
    return next(
      new AppError('Bạn chỉ có quyền xóa báo cáo tiến độ ở khoa của mình', 403),
    );
  }
  const baoCao = await BaoCao.findOne({ baoCaoTienDo });
  if (baoCao) {
    return next(
      new AppError(
        'Không thể xóa báo cáo tiến độ đã chứa báo cáo của sinh viên',
        400,
      ),
    );
  }
  await baoCaoTienDo.deleteOne();
  res.status(204).json({
    status: 'success',
    data: null,
  });
});
