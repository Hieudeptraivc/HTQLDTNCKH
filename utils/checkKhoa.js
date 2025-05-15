const SinhVien = require('../models/sinhvienModel');
const GiangVien = require('../models/giangvienModel');
const AppError = require('./appError');
const catchAsync = require('./errorAsync');
const CanBoKhoa = require('../models/canbokhoaModel');

exports.checkKhoa = (model) =>
  catchAsync(async (req, res, next) => {
    if (req.account.vaiTro !== 'Cán bộ khoa') {
      return next(); // Nếu không phải Cán bộ khoa, bỏ qua middleware
    }
    const canBoKhoa = await CanBoKhoa.findById(req.account.nguoiDung);
    const { khoa, sinhVien_Id, giangVien_Id } = req.body;
    let entity;

    // Nếu tạo mới hoặc cập nhật, phải kiểm tra khoa
    if (khoa && khoa !== canBoKhoa.khoa._id.toString()) {
      return next(
        new AppError(
          'Bạn chỉ có thể tạo mới và quản lý sinh viên, giảng viên thuộc khoa của bạn',
          403,
        ),
      );
    }
    if (sinhVien_Id || giangVien_Id) {
      // Nếu cập nhật sinh viên hoặc giảng viên, kiểm tra xem họ có thuộc khoa của cán bộ khoa không
      if (model === 'SinhVien' && sinhVien_Id) {
        entity = await SinhVien.findById(sinhVien_Id);
        req.sinhVien = entity;
      } else if (model === 'GiangVien' && giangVien_Id) {
        entity = await GiangVien.findById(giangVien_Id);
        req.giangVien = entity;
      }
      if (!entity) {
        return next(
          new AppError('Sinh viên hoặc giảng viên không tồn tại', 404),
        );
      }
      if (!entity.khoa) {
        return next();
      }
      if (
        entity &&
        entity.khoa._id.toString() !== canBoKhoa.khoa._id.toString()
      ) {
        return next(
          new AppError('Bạn không có quyền quản lý người dùng này', 403),
        );
      }
    }
    next();
  });
