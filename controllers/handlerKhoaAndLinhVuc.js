const CanBoKhoa = require('../models/canbokhoaModel');
const DeTai = require('../models/detaiModels');
const GiangVien = require('../models/giangvienModel');
const SinhVien = require('../models/sinhvienModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/errorAsync');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    let queryField = null;
    if (Model.modelName === 'Khoa') {
      queryField = 'khoa';
    } else if (Model.modelName === 'LinhVuc') {
      queryField = 'linhVuc';
    }
    if (queryField) {
      const countDeTai = await DeTai.countDocuments({
        [queryField]: req.params.id,
      });
      const countSinhVien = await SinhVien.countDocuments({
        [queryField]: req.params.id,
      });
      const countCanBoKhoa = await CanBoKhoa.countDocuments({
        [queryField]: req.params.id,
      });
      const countGiangVien = await GiangVien.countDocuments({
        [queryField]: req.params.id,
      });
      if (
        countDeTai > 0 ||
        countGiangVien > 0 ||
        countSinhVien > 0 ||
        countCanBoKhoa > 0
      ) {
        return next(
          new AppError(
            'Dữ liệu tồn tại trong liên quan đến dữ liệu khác nên không thể xóa',
            409,
          ),
        );
      }
    }
    const deletedOne = await Model.findByIdAndDelete(req.params.id);
    if (!deletedOne)
      return next(new AppError('Không tồn tại dữ liệu theo ID này', 404));
    res.status(200).json({
      status: 'success',
      data: null,
    });
  });
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    if (
      req.account.vaiTro === 'Cán bộ khoa' &&
      req.user.khoa._id.toString() !== req.params.id
    )
      return next(
        new AppError(
          'Cán bộ khoa chỉ có quyền cập nhật dữ liệu của khoa mình',
          403,
        ),
      );
    let populate = null;
    if (Model.modelName === 'Khoa') {
      populate = [
        { path: 'giangVien', select: '_id' },
        { path: 'sinhVien', select: '_id' },
        { path: 'canBoKhoa', select: '_id' },
      ];
    } else if (Model.modelName === 'LinhVuc') {
      populate = [{ path: 'deTai', select: '+trangThaiDuyet' }];
    }
    const updatedOne = await Model.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).populate(populate);
    if (!updatedOne)
      return next(new AppError('Không tồn tại dữ liệu theo ID này', 404));
    res.status(200).json({
      status: 'success',
      data: {
        data: updatedOne,
      },
    });
  });
exports.getOne = (Model) =>
  catchAsync(async (req, res, next) => {
    let populate = null;
    if (Model.modelName === 'Khoa') {
      populate = [
        { path: 'giangVien', select: '_id' },
        { path: 'sinhVien', select: '_id' },
        { path: 'canBoKhoa', select: '_id' },
      ];
    } else if (Model.modelName === 'LinhVuc') {
      populate = [{ path: 'deTai', select: '+trangThaiDuyet' }];
    }
    const one = await Model.findById(req.params.id).populate(populate);
    if (!one)
      return next(new AppError('Không tồn tại dữ liệu theo ID này', 404));
    res.status(200).json({
      status: 'success',
      data: {
        data: one,
      },
    });
  });
exports.getDsOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const ds = await Model.find().select('ten _id');
    res.status(200).json({
      status: 'success',
      data: {
        data: ds,
      },
    });
  });
exports.getAllOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    let populate = null;
    if (Model.modelName === 'Khoa') {
      populate = [
        { path: 'giangVien', select: '_id' },
        { path: 'sinhVien', select: '_id' },
        { path: 'canBoKhoa', select: '_id' },
      ];
    } else if (Model.modelName === 'LinhVuc') {
      populate = [{ path: 'deTai', select: '_id' }];
    }
    const total = await Model.countDocuments(); // tổng số bản ghi
    const all = await Model.find().populate(populate).skip(skip).limit(limit);

    res.status(200).json({
      status: 'success',
      data: {
        all,
        total,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newOne = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        data: newOne,
      },
    });
  });
