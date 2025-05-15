const ThongBao = require('../models/thongBaoModels');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/errorAsync');

// Tạo mới thông báo
exports.createThongBao = catchAsync(async (req, res, next) => {
  const { message, sinhViens, giangViens, canBoKhoas, admins } = req.body;

  const thongBao = await ThongBao.create({
    message,
    sinhViens,
    giangViens,
    canBoKhoas,
    admins,
  });
  if (!thongBao) return next(new AppError('Lỗi khi tạo thông báo !!!', 400));
  res.status(201).json({
    status: 'success',
    data: {
      thongBao,
    },
  });
});

// Lấy thông báo theo vai trò và ID người dùng
exports.getThongBaosForUser = catchAsync(async (req, res, next) => {
  const { _id } = req.user;
  const { vaiTro } = req.account;
  let filter = {};
  switch (vaiTro) {
    case 'Sinh viên':
      filter = { sinhViens: _id };
      break;
    case 'Giảng viên':
      filter = { giangViens: _id };
      break;
    case 'Cán bộ khoa':
      filter = { canBoKhoas: _id };
      break;
    case 'Admin':
      filter = { admins: _id };
      break;
    default:
      return next(new AppError('Vai trò hoặc người dùng không hợp lệ', 404));
  }

  const thongBaos = await ThongBao.find(filter).sort({ createdAt: -1 });
  res.status(200).json({
    status: 'success',
    data: {
      thongBaos,
    },
  });
});

// Đánh dấu đã đọc
exports.markAsRead = catchAsync(async (req, res, next) => {
  const { _id } = req.user;
  const { vaiTro } = req.account;
  if (!req.body.thongBao_Id)
    return next(new AppError('Chưa có thông báo ID', 404));
  let updateField = null;
  switch (vaiTro) {
    case 'Sinh viên':
      updateField = { $addToSet: { readBySinhViens: _id } };
      break;
    case 'Giảng viên':
      updateField = { $addToSet: { readByGiangViens: _id } };
      break;
    case 'Cán bộ khoa':
      updateField = { $addToSet: { readByCanBoKhoas: _id } };
      break;
    case 'Admin':
      updateField = { $addToSet: { readByAdmins: _id } };
      break;
    default:
      return next(new AppError('Vai trò hoặc người dùng không hợp lệ', 404));
  }
  const updatedThongBao = await ThongBao.findByIdAndUpdate(
    req.body.thongBao_Id,
    updateField,
  );

  res.status(201).json({
    status: 'success',
    data: {
      thongBao: updatedThongBao,
    },
  });
});
