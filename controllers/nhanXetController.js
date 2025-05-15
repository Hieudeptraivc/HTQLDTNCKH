const NhanXet = require('../models/nhanxetModel');
const AppError = require('../utils/appError');
const { checkAccessToBaoCao } = require('../utils/checkAccessToBaoCao');
const catchAsync = require('../utils/errorAsync');

exports.createNhanXet = catchAsync(async (req, res, next) => {
  if (req.params.baoCaoId) req.body.baoCao = req.params.baoCaoId;

  await checkAccessToBaoCao(req, req.body.baoCao);
  req.body.giangVien = req.user._id;
  let newNhanXet = await NhanXet.create(req.body);
  newNhanXet = await NhanXet.findById(newNhanXet._id);
  res.status(201).json({
    status: 'success',
    data: {
      nhanXet: newNhanXet,
    },
  });
});

exports.getAllNhanXet = catchAsync(async (req, res, next) => {
  if (!req.params.baoCaoId) {
    return next(
      new AppError('Không tìm thấy báo cáo vì không có địa chỉ ID ', 404),
    );
  }
  await checkAccessToBaoCao(req, req.params.baoCaoId);
  const allNhanXet = await NhanXet.find({ baoCao: req.params.baoCaoId });
  res.status(200).json({
    status: 'success',
    data: {
      nhanXet: allNhanXet,
    },
  });
});
exports.getNhanXet = catchAsync(async (req, res, next) => {
  let bcId;
  let nxId;
  if (req.params.nhanXetId) nxId = req.params.nhanXetId;

  const nhanXet = await NhanXet.findById(nxId);

  bcId = nhanXet.baoCao._id.toString();

  if (req.params.baoCaoId) {
    bcId = req.params.baoCaoId;
    if (nhanXet.baoCao._id.toString() !== bcId) {
      return next(
        new AppError(
          'Địa chỉ ID báo cáo không phù hợp hoặc không chứa nhận xét này',
          404,
        ),
      );
    }
  }
  await checkAccessToBaoCao(req, bcId);
  res.status(200).json({
    status: 'success',
    data: {
      nhanXet,
    },
  });
});
exports.updateNhanXet = catchAsync(async (req, res, next) => {
  let bcId;
  let nxId;
  if (req.params.nhanXetId) nxId = req.params.nhanXetId;

  const nhanXet = await NhanXet.findById(nxId);

  bcId = nhanXet.baoCao._id.toString();

  if (req.params.baoCaoId) {
    bcId = req.params.baoCaoId;
    if (nhanXet.baoCao._id.toString() !== bcId) {
      return next(
        new AppError(
          'Địa chỉ ID báo cáo không phù hợp hoặc không chứa nhận xét này',
          404,
        ),
      );
    }
  }
  await checkAccessToBaoCao(req, bcId);
  nhanXet.giangVien = req.user._id;
  nhanXet.tieuDe = req.body.tieuDe;
  nhanXet.noiDung = req.body.noiDung;
  nhanXet.ngayChinhSuaCuoi = Date.now();
  //   console.log(nhanXet);
  await nhanXet.save({ validateModifiedOnly: true });

  res.status(201).json({
    status: 'success',
    data: {
      nhanXet,
    },
  });
});
exports.deleteNhanXet = catchAsync(async (req, res, next) => {
  let bcId;
  let nxId;
  if (req.params.nhanXetId) nxId = req.params.nhanXetId;

  const nhanXet = await NhanXet.findById(nxId);

  bcId = nhanXet.baoCao._id.toString();

  if (req.params.baoCaoId) {
    bcId = req.params.baoCaoId;
    if (nhanXet.baoCao._id.toString() !== bcId) {
      return next(
        new AppError(
          'Địa chỉ ID báo cáo không phù hợp hoặc không chứa nhận xét này',
          404,
        ),
      );
    }
  }
  if (nhanXet.giangVien._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Bạn không có quyền xóa nhận xét này', 403));
  }
  await nhanXet.deleteOne();
  res.status(201).json({
    status: 'success',
    data: null,
  });
});
