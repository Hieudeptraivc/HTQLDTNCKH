const BaoCao = require('../models/baocaoModel');
const BaoCaoTienDo = require('../models/baocaotiendoModel');
const DeTai = require('../models/detaiModels');
const LichSuDeTai = require('../models/lichsudetaiModel');
const NhanXet = require('../models/nhanxetModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const { checkAccess } = require('../utils/checkAccess');
const catchAsync = require('../utils/errorAsync');
const { deleteFromGridFS } = require('../utils/uploadGridFs');
const { compareChanges, formatChanges } = require('../utils/compareChanges');

exports.createDeTai = catchAsync(async (req, res, next) => {
  if (
    req.account.vaiTro === 'Cán bộ khoa' &&
    req.user.khoa._id.toString() !== req.body.khoa
  )
    return next(
      new AppError(
        'Đường dẫn này chỉ dùng để đăng kí đề tài trong khoa của bạn',
      ),
      400,
    );
  if (req.account.vaiTro !== 'Cán bộ khoa' && req.body.trangThaiDuyet)
    return next(
      new AppError('Đường dẫn này chỉ dùng cho sinh viên để đăng kí đề tài'),
      400,
    );
  if (req.account.vaiTro === 'Sinh viên') {
    if (
      !req.body.sinhVien.some(
        (sv) => sv.sinhVienId === req.account.nguoiDung.toString(),
      )
    )
      return next(
        new AppError(
          'Không thể tạo vì bạn chưa nhập thông tin của mình hoặc không tham gia đề tài',
        ),
      );
    req.body.giangVien = undefined;
    req.body.trangThai = 'Chưa triển khai';
  }
  // console.log(req.account.nguoiDung);
  const newDeTai = await DeTai.create({
    ...req.body,
  });
  res.status(201).json({
    status: 'success',
    data: {
      deTai: newDeTai,
    },
  });
});

exports.getAllDeTai = catchAsync(async (req, res, next) => {
  // console.log(req.user);
  if (req.account.vaiTro === 'Cán bộ khoa') {
    req.query.khoa = req.user.khoa;
  }
  //|| 'Giảng viên'
  if (req.account.vaiTro === 'Sinh viên') {
    req.query['sinhVien.sinhVienId'] = req.user._id;
  }
  if (req.account.vaiTro === 'Giảng viên') {
    req.query['giangVien.giangVienId'] = req.user._id;
  }

  const features = new APIFeatures(DeTai.find().lean(), req.query, ['ten'])
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const allDeTai = await features.query;
  const totalCount = await DeTai.countDocuments(features.query._conditions);
  res.status(200).json({
    status: 'success',
    data: {
      allDeTai,
      totalCount,
    },
  });
});

exports.getAllDeTaiCapTruong = catchAsync(async (req, res, next) => {
  // console.log(req.user);
  if (req.account.vaiTro === 'Cán bộ khoa') {
    req.query.khoa = req.user.khoa;
  }

  const features = new APIFeatures(
    DeTai.find({ deTaiCap: 'Đề tài cấp trường' }).lean(),
    req.query,
    ['ten'],
  )
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const allDeTaiCapTruong = await features.query;
  const totalCount = await DeTai.countDocuments(features.query._conditions);
  res.status(200).json({
    status: 'success',
    data: {
      allDeTaiCapTruong,
      totalCount,
    },
  });
});

exports.getDeTai = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findById(req.params.id).populate('baoCaoTienDo');
  // console.log(deTai.giangVien);
  if (!deTai) return next(new AppError('Đề tài không tồn tại', 404));

  checkAccess(deTai, req.account, req.user);

  res.status(200).json({
    status: 'success',
    data: { deTai },
  });
});

exports.updateDeTai = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findById(req.params.id);

  if (!deTai)
    return next(new AppError('Đề tài không tồn tại trong hệ thống'), 404);

  // Kiểm tra quyền cập nhật
  if (
    deTai.trangThai === 'Hủy bỏ' &&
    req.account.vaiTro === ('Sinh viên' || 'Giảng viên')
  ) {
    return next(
      new AppError(
        'Sinh viên không được cập nhật đề tài đã bị hủy bỏ trong hệ thống. Vui lòng liên hệ cán bộ khoa.',
      ),
      404,
    );
  }

  if (req.user.khoa._id.toString() !== deTai.khoa._id.toString())
    return next(new AppError('Bạn không có quyền để cập nhật đề tài này'));

  if (req.account.vaiTro === 'Sinh viên' && deTai.trangThaiDuyet === 'Đã duyệt')
    return next(
      new AppError('Sinh viên không thể cập nhật được đề tài đã được duyệt'),
    );

  if (
    req.account.vaiTro === 'Sinh viên' &&
    deTai.sinhVien.find(
      (sv) => sv.sinhVienId._id.toString() === req.user._id.toString(),
    ).vaiTro !== 'Trưởng nhóm'
  )
    return next(
      new AppError(
        'Sinh viên không thể cập nhật được đề tài mình không làm trưởng nhóm',
      ),
    );

  // Lưu trữ dữ liệu cũ trước khi cập nhật
  const duLieuCu = deTai.toObject();

  // Loại bỏ các trường không cần thiết khi lưu lịch sử
  delete duLieuCu._id;
  delete duLieuCu.__v;
  delete duLieuCu.baoCaoTienDo;

  // Xác định loại người dùng
  let loaiNguoiDung;
  switch (req.account.vaiTro) {
    case 'Sinh viên':
      loaiNguoiDung = 'SinhVien';
      break;
    case 'Giảng viên':
      loaiNguoiDung = 'GiangVien';
      break;
    case 'Cán bộ khoa':
      loaiNguoiDung = 'CanBoKhoa';
      break;
    default:
      loaiNguoiDung = 'SinhVien';
  }

  // Lưu lịch sử thay đổi
  await LichSuDeTai.create({
    deTai: deTai._id,
    duLieuCu,
    nguoiThayDoi: req.account.nguoiDung,
    loaiNguoiDung,
    thoiGianThayDoi: Date.now(),
    ghiChu: req.body.ghiChuLichSu || 'Cập nhật đề tài',
  });

  // Xóa trường ghiChuLichSu khỏi req.body để không lưu vào đề tài
  delete req.body.ghiChuLichSu;

  // Nếu là sinh viên, giữ nguyên một số trường
  if (req.account.vaiTro === 'Sinh viên') {
    req.body.trangThai = deTai.trangThai;
    req.body.trangThaiDuyet = deTai.trangThaiDuyet;
    req.body.giangVien = deTai.giangVien;
  }

  req.body.ngayChinhSuaCuoi = Date.now();

  delete req.body.__v;

  // Cập nhật đề tài
  Object.assign(deTai, req.body);
  const updatedDeTai = await deTai.save({
    validateModifiedOnly: true,
    new: true,
  });

  res.status(201).json({
    status: 'success',
    data: { deTai: updatedDeTai },
  });
});

exports.getLichSuDeTai = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findById(req.params.id);

  if (!deTai)
    return next(new AppError('Đề tài không tồn tại trong hệ thống'), 404);

  // Kiểm tra quyền truy cập
  checkAccess(deTai, req.account, req.user);

  // Lấy lịch sử chỉnh sửa của đề tài
  const lichSuDeTai = await LichSuDeTai.find({ deTai: deTai._id }).sort(
    '-thoiGianThayDoi',
  );

  res.status(200).json({
    status: 'success',
    results: lichSuDeTai.length,
    data: {
      lichSuDeTai,
    },
  });
});

exports.getChiTietThayDoi = catchAsync(async (req, res, next) => {
  const { lichSuId } = req.params;

  // Tìm bản ghi lịch sử
  const lichSu = await LichSuDeTai.findById(lichSuId);
  if (!lichSu) {
    return next(new AppError('Không tìm thấy lịch sử chỉnh sửa này', 404));
  }

  // Lấy thông tin đề tài
  const deTai = await DeTai.findById(lichSu.deTai);
  if (!deTai) {
    return next(new AppError('Đề tài liên quan không còn tồn tại', 404));
  }

  // Kiểm tra quyền truy cập
  checkAccess(deTai, req.account, req.user);

  // Tìm bản ghi lịch sử kế tiếp để lấy dữ liệu mới, hoặc sử dụng dữ liệu hiện tại của đề tài
  const nextLichSu = await LichSuDeTai.findOne({
    deTai: deTai._id,
    thoiGianThayDoi: { $gt: lichSu.thoiGianThayDoi },
  }).sort('thoiGianThayDoi');

  let duLieuMoi;
  if (nextLichSu) {
    // Nếu có bản ghi lịch sử tiếp theo, sử dụng dữ liệu cũ của bản ghi đó làm dữ liệu mới
    duLieuMoi = nextLichSu.duLieuCu;
  } else {
    // Nếu không có bản ghi tiếp theo, sử dụng dữ liệu hiện tại của đề tài
    duLieuMoi = deTai.toObject();
    delete duLieuMoi._id;
    delete duLieuMoi.__v;
    delete duLieuMoi.baoCaoTienDo;
  }

  // So sánh thay đổi giữa hai phiên bản

  const changes = compareChanges(lichSu.duLieuCu, duLieuMoi);
  const formattedChanges = formatChanges(changes);

  res.status(200).json({
    status: 'success',
    data: {
      thayDoi: formattedChanges,
      duLieuCu: lichSu.duLieuCu,
      duLieuMoi,
    },
  });
});
exports.disableDeTai = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findById(req.params.id);

  if (!deTai) {
    return next(new AppError('Không tìm thấy đề tài thuộc về ID này', 404));
  }
  if (deTai.khoa._id.toString() !== req.user.khoa._id.toString()) {
    return next(
      new AppError(
        'Bạn chỉ có thể vô hiệu hóa đề tài thuộc khoa của mình',
        403,
      ),
    );
  }

  // Lưu trữ dữ liệu cũ trước khi vô hiệu hóa
  const duLieuCu = deTai.toObject();
  delete duLieuCu._id;
  delete duLieuCu.__v;
  delete duLieuCu.baoCaoTienDo;

  // Lưu lịch sử thay đổi
  await LichSuDeTai.create({
    deTai: deTai._id,
    duLieuCu,
    nguoiThayDoi: req.account.nguoiDung,
    loaiNguoiDung: 'CanBoKhoa',
    thoiGianThayDoi: Date.now(),
    ghiChu: 'Vô hiệu hóa đề tài',
  });

  deTai.trangThai = 'Hủy bỏ';
  const disableDeTai = await deTai.save({ validateModifiedOnly: true });
  res.status(201).json({
    status: 'success',
    data: { deTai: disableDeTai },
  });
});

exports.acceptDeTai = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findById(req.params.id);

  if (!deTai) {
    return next(new AppError('Không tìm thấy đề tài thuộc về ID này', 404));
  }

  if (deTai.giangVien.length <= 0) {
    return next(
      new AppError('Đề tài cần phải có giảng viên chính thức trước khi duyệt'),
    );
  }

  if (deTai.khoa._id.toString() !== req.user.khoa._id.toString()) {
    return next(
      new AppError('Cán bộ khoa chỉ được duyệt đề tài của khoa mình', 403),
    );
  }

  // Lưu trữ dữ liệu cũ trước khi duyệt
  const duLieuCu = deTai.toObject();
  delete duLieuCu._id;
  delete duLieuCu.__v;
  delete duLieuCu.baoCaoTienDo;

  // Lưu lịch sử thay đổi
  await LichSuDeTai.create({
    deTai: deTai._id,
    duLieuCu,
    nguoiThayDoi: req.account.nguoiDung,
    loaiNguoiDung: 'CanBoKhoa',
    thoiGianThayDoi: Date.now(),
    ghiChu: 'Duyệt đề tài',
  });

  const updatedDeTai = await DeTai.findByIdAndUpdate(deTai._id, {
    trangThaiDuyet: 'Đã duyệt',
    trangThai: 'Đang triển khai',
  });

  // Tự động tạo báo cáo tiến độ khi duyệt đề tài
  const ngayDuyet = new Date();
  const hanNop = new Date(ngayDuyet);
  hanNop.setFullYear(hanNop.getFullYear() + 1); // Thêm 1 năm cho hạn nộp

  const newBaoCaoTienDo = await BaoCaoTienDo.create({
    ten: `Báo cáo cuối cùng`,
    trangThai: 'Đã mở',
    loaiBaoCao: 'Cuối cùng',
    ghiChu: 'Không',
    lanThu: '1',
    noiDungChinh: 'Không',
    hanNop: hanNop,
    deTai: deTai._id,
    nguoiThayDoiCuoi: req.user._id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      updatedDeTai,
      baoCaoTienDo: newBaoCaoTienDo,
    },
  });
});

exports.rejectDeTai = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findById(req.params.id);
  if (!deTai) {
    return next(new AppError('Không tìm thấy đề tài thuộc về ID này', 404));
  }
  if (deTai.khoa._id.toString() !== req.user.khoa._id.toString()) {
    return next(
      new AppError('Cán bộ khoa chỉ được duyệt đề tài của khoa mình', 403),
    );
  }

  // Lưu trữ dữ liệu cũ trước khi từ chối
  const duLieuCu = deTai.toObject();
  delete duLieuCu._id;
  delete duLieuCu.__v;
  delete duLieuCu.baoCaoTienDo;

  // Lưu lịch sử thay đổi
  await LichSuDeTai.create({
    deTai: deTai._id,
    duLieuCu,
    nguoiThayDoi: req.account.nguoiDung,
    loaiNguoiDung: 'CanBoKhoa',
    thoiGianThayDoi: Date.now(),
    ghiChu: 'Từ chối đề tài',
  });

  const rejectDeTai = await DeTai.findByIdAndUpdate(deTai._id, {
    trangThaiDuyet: 'Từ chối',
  });
  res.status(201).json({
    status: 'success',
    data: {
      rejectDeTai,
    },
  });
});

exports.reStartStatusDeTai = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findById(req.params.id);
  if (!deTai) {
    return next(new AppError('Không tìm thấy đề tài thuộc về ID này', 404));
  }
  if (deTai.khoa._id.toString() !== req.user.khoa._id.toString()) {
    return next(
      new AppError('Cán bộ khoa chỉ được duyệt đề tài của khoa mình', 403),
    );
  }

  // Lưu trữ dữ liệu cũ trước khi từ chối
  const duLieuCu = deTai.toObject();
  delete duLieuCu._id;
  delete duLieuCu.__v;
  delete duLieuCu.baoCaoTienDo;

  // Lưu lịch sử thay đổi
  await LichSuDeTai.create({
    deTai: deTai._id,
    duLieuCu,
    nguoiThayDoi: req.account.nguoiDung,
    loaiNguoiDung: 'CanBoKhoa',
    thoiGianThayDoi: Date.now(),
    ghiChu: 'Cập nhật lại trạng thái duyệt đề tài ',
  });

  const restartDeTai = await DeTai.findByIdAndUpdate(deTai._id, {
    trangThaiDuyet: 'Đang chờ duyệt',
    trangThai: 'Chưa triển khai',
  });
  res.status(201).json({
    status: 'success',
    data: {
      restartDeTai,
    },
  });
});

exports.deleteDeTai = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findById(req.params.id).populate('baoCaoTienDo');
  if (!deTai) {
    return next(new AppError('Không tìm thấy đề tài thuộc về ID này', 404));
  }
  if (deTai.trangThaiDuyet !== 'Từ chối') {
    return next(
      new AppError('Cán bộ khoa chỉ được xóa đề tài bị từ chối', 403),
    );
  }
  if (deTai.khoa._id.toString() !== req.user.khoa._id.toString()) {
    return next(
      new AppError('Cán bộ khoa chỉ được xóa đề tài của khoa mình', 403),
    );
  }

  // Xóa tất cả lịch sử chỉnh sửa của đề tài
  await LichSuDeTai.deleteMany({ deTai: deTai._id });

  await Promise.all(
    deTai.baoCaoTienDo.map(async (bctd) => {
      const baoCao = await BaoCao.findOne({ baoCaoTienDo: bctd._id });
      if (baoCao) {
        if (baoCao.fileBaoCao) {
          await deleteFromGridFS(baoCao.fileBaoCao);
        }
        await Promise.all([
          NhanXet.deleteMany({ baoCao: baoCao._id }),
          baoCao.deleteOne(),
        ]);
      }
      await BaoCaoTienDo.findByIdAndDelete(bctd._id);
    }),
  );

  await deTai.deleteOne();
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateCapTruongDeTai = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findById(req.params.id);
  if (!deTai) {
    return next(new AppError('Không tìm thấy đề tài thuộc về ID này', 404));
  }
  if (deTai.khoa._id.toString() !== req.user.khoa._id.toString()) {
    return next(
      new AppError('Cán bộ khoa chỉ được đề xuất đề tài của khoa mình', 403),
    );
  }
  if (deTai.trangThaiDuyet !== 'Đã duyệt' || deTai.trangThai !== 'Hoàn thành') {
    return next(
      new AppError(
        'Cán bộ khoa chỉ đề xuất đề tài được duyệt và đã hoàn thành lên cấp trường',
        400,
      ),
    );
  }
  // Lưu trữ dữ liệu cũ trước khi từ chối
  const duLieuCu = deTai.toObject();
  delete duLieuCu._id;
  delete duLieuCu.__v;
  delete duLieuCu.baoCaoTienDo;

  // Lưu lịch sử thay đổi
  await LichSuDeTai.create({
    deTai: deTai._id,
    duLieuCu,
    nguoiThayDoi: req.account.nguoiDung,
    loaiNguoiDung: 'CanBoKhoa',
    thoiGianThayDoi: Date.now(),
    ghiChu: 'Cập nhật lại cấp đề tài, đề xuất đề tài lên cấp trường',
  });

  const capTruongDeTai = await DeTai.findByIdAndUpdate(deTai._id, {
    deTaiCap: 'Đề tài cấp trường',
  });
  res.status(201).json({
    status: 'success',
    data: {
      capTruongDeTai,
    },
  });
});

exports.updateCapKhoaDeTai = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findById(req.params.id);
  if (!deTai) {
    return next(new AppError('Không tìm thấy đề tài thuộc về ID này', 404));
  }
  if (deTai.khoa._id.toString() !== req.user.khoa._id.toString()) {
    return next(
      new AppError('Cán bộ khoa chỉ được đề xuất đề tài của khoa mình', 403),
    );
  }
  if (deTai.deTaiCap !== 'Đề tài cấp trường') {
    return next(
      new AppError('Cán bộ khoa chỉ hủy đề xuất đề tài cấp trường', 400),
    );
  }
  // Lưu trữ dữ liệu cũ trước khi từ chối
  const duLieuCu = deTai.toObject();
  delete duLieuCu._id;
  delete duLieuCu.__v;
  delete duLieuCu.baoCaoTienDo;

  // Lưu lịch sử thay đổi
  await LichSuDeTai.create({
    deTai: deTai._id,
    duLieuCu,
    nguoiThayDoi: req.account.nguoiDung,
    loaiNguoiDung: 'CanBoKhoa',
    thoiGianThayDoi: Date.now(),
    ghiChu: 'Cập nhật lại cấp đề tài, hủy bỏ đề xuất đề tài lên cấp trường',
  });

  const capKhoaDeTai = await DeTai.findByIdAndUpdate(deTai._id, {
    deTaiCap: 'Đề tài cấp khoa',
  });
  res.status(201).json({
    status: 'success',
    data: {
      capKhoaDeTai,
    },
  });
});
