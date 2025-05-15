const BaoCao = require('../models/baocaoModel');
const BaoCaoTienDo = require('../models/baocaotiendoModel');
const DeTai = require('../models/detaiModels');
const NhanXet = require('../models/nhanxetModel');
const APIAggregateFeatures = require('../utils/apiAggregateFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/errorAsync');
const { getDeTaiFilterByRole } = require('../utils/getDeTaiFilterByRole');
const {
  uploadToGridFS,
  deleteFromGridFS,
  getFileReadStream,
  getFileMetadata,
} = require('../utils/uploadGridFS');
const path = require('path');

exports.createBaoCao = catchAsync(async (req, res, next) => {
  if (!req.body.baoCaoTienDo) req.body.baoCaoTienDo = req.params.id;

  const baoCaoTienDo = await BaoCaoTienDo.findById(
    req.body.baoCaoTienDo,
  ).populate({ path: 'deTai' });
  if (!baoCaoTienDo) {
    return next(
      new AppError('Không tìm thấy báo cáo tiến độ để gắn với báo cáo', 404),
    );
  }
  if (baoCaoTienDo?.trangThai === 'Đã đóng') {
    return next(
      new AppError(
        'Đã qua hạn nộp, báo cáo tiến độ đã đóng. Không thể nộp báo cáo!',
      ),
    );
  }
  const allowedUser = baoCaoTienDo.deTai.sinhVien.find(
    (sv) => sv.vaiTro === 'Trưởng nhóm',
  ).sinhVienId;
  if (allowedUser._id.toString() !== req.user._id.toString()) {
    return next(
      new AppError('Chỉ có nhóm trưởng của đề tài mới có thể nộp báo cáo', 403),
    );
  }

  req.body.sinhVien = req.user._id;

  // 👇 Xử lý file nếu có
  if (req.file) {
    const originalName = path.basename(req.file.originalname);
    const safeName = originalName.replace(/\s+/g, '_'); // thay khoảng trắng = dấu _
    const timestamp = Date.now();
    const filename = `${timestamp}_${safeName}`; // thêm timestamp để tránh trùng

    const fileId = await uploadToGridFS(
      req.file.buffer,
      filename,
      req.file.mimetype,
    );
    req.body.fileBaoCao = fileId;
  }

  const newBaoCao = await BaoCao.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      newBaoCao,
      baoCaoTienDo,
    },
  });
});

exports.getAllBaoCao = catchAsync(async (req, res, next) => {
  const filter = await getDeTaiFilterByRole(req);

  if (!filter) {
    return res.status(200).json({
      status: 'success',
      data: {
        allBaoCao: [],
        totalCount: 0,
      },
    });
  }

  // Khởi tạo pipeline ban đầu
  const basePipeline = [
    {
      $lookup: {
        from: 'baocaotiendos',
        localField: 'baoCaoTienDo',
        foreignField: '_id',
        as: 'baoCaoTienDo',
      },
    },
    { $unwind: '$baoCaoTienDo' },
    {
      $match: {
        'baoCaoTienDo.deTai': { $in: filter },
      },
    },
    {
      $lookup: {
        from: 'detais',
        localField: 'baoCaoTienDo.deTai',
        foreignField: '_id',
        as: 'baoCaoTienDo.deTai',
      },
    },
    { $unwind: '$baoCaoTienDo.deTai' },
    {
      $lookup: {
        from: 'sinhviens',
        localField: 'sinhVien',
        foreignField: '_id',
        as: 'sinhVien',
      },
    },
    { $unwind: { path: '$sinhVien', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        ten: 1,
        slug: 1,
        fileBaoCao: 1,
        ngayTao: 1,
        ngayChinhSuaCuoi: 1,
        sinhVien: {
          _id: 1,
          ten: 1,
          email: 1,
        },
        baoCaoTienDo: {
          ten: '$baoCaoTienDo.ten',
          trangThai: '$baoCaoTienDo.trangThai',
          loaiBaoCao: '$baoCaoTienDo.loaiBaoCao',
          lanThu: '$baoCaoTienDo.lanThu',
          deTai: {
            ten: '$baoCaoTienDo.deTai.ten',
            _id: '$baoCaoTienDo.deTai._id',
          },
        },
      },
    },
  ];

  // Clone pipeline đã lọc + sort nhưng chưa phân trang
  const filteredFeatures = new APIAggregateFeatures(
    [...basePipeline],
    req.query,
    ['ten', 'baoCaoTienDo.deTai.ten', 'sinhVien.ten'],
  )
    .filter()
    .sort()
    .limitFields();

  const filterAndSortPipeline = [...filteredFeatures.pipeline];

  // Tạo pipeline có phân trang
  const paginatedFeatures = new APIAggregateFeatures(
    [...filterAndSortPipeline],
    req.query,
  ).pagination();
  const paginatedPipeline = [...paginatedFeatures.pipeline];

  // Tạo pipeline tổng hợp cuối cùng với facet
  const finalPipeline = [
    {
      $facet: {
        data: paginatedPipeline,
        totalCount: [...filterAndSortPipeline, { $count: 'count' }],
      },
    },
    {
      $project: {
        data: 1,
        totalCount: {
          $cond: [
            { $gt: [{ $size: '$totalCount' }, 0] },
            { $arrayElemAt: ['$totalCount.count', 0] },
            0,
          ],
        },
      },
    },
  ];

  const result = await BaoCao.aggregate(finalPipeline);

  res.status(200).json({
    status: 'success',
    data: {
      allBaoCao: result[0].data,
      totalCount: result[0].totalCount,
    },
  });
});

exports.getBaoCao = catchAsync(async (req, res, next) => {
  let baoCao;
  const { id: baoCaoTienDoId, baoCaoId } = req.params;
  if (baoCaoTienDoId || (baoCaoTienDoId && baoCaoId)) {
    baoCao = await BaoCao.findOne({ baoCaoTienDo: baoCaoTienDoId })
      .populate('nhanXet')
      .lean()
      .select('tieuDe noiDung giangVien ngayTao');
  } else if (!baoCaoTienDoId && baoCaoId) {
    baoCao = await BaoCao.findById(baoCaoId).populate('nhanXet');
  }
  if (!baoCao) {
    return next(
      new AppError('Không tìm thấy báo cáo thuộc về địa chỉ ID này', 404),
    );
  }
  const filter = await getDeTaiFilterByRole(req);
  //   console.log(filter);
  if (req.account.vaiTro !== 'Admin') {
    const allowedDeTaiIds = filter.map((id) => id.toString()) || [];
    const currentDeTaiId = baoCao.baoCaoTienDo.deTai.toString();
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
  if (baoCao.fileBaoCao) {
    fileInfo = await getFileMetadata(baoCao.fileBaoCao);
  }
  res.status(200).json({
    status: 'success',
    data: {
      baoCao,
      fileInfo,
    },
  });
});

exports.updateBaoCao = catchAsync(async (req, res, next) => {
  console.log(req.file); // Kiểm tra xem file đã được nhận chưa
  const { id: baoCaoTienDoId, baoCaoId } = req.params;
  let updateBaoCao;

  if (baoCaoTienDoId || (baoCaoTienDoId && baoCaoId)) {
    updateBaoCao = await BaoCao.findOne({ baoCaoTienDo: baoCaoTienDoId });
  } else if (!baoCaoTienDoId && baoCaoId) {
    updateBaoCao = await BaoCao.findById(baoCaoId);
  }
  if (updateBaoCao?.baoCaoTienDo.trangThai === 'Đã đóng') {
    return next(
      new AppError('Báo cáo tiến độ đã đóng không thể cập nhật báo cáo!'),
    );
  }
  if (!updateBaoCao) {
    return next(new AppError('Không tìm thấy báo cáo để cập nhật', 404));
  }

  // Kiểm tra quyền chỉnh sửa
  if (updateBaoCao.sinhVien._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Bạn không có quyền chỉnh sửa báo cáo này', 403));
  }

  // Nếu có file mới, xóa file cũ khỏi GridFS
  if (req.file && updateBaoCao.fileBaoCao) {
    await deleteFromGridFS(updateBaoCao.fileBaoCao);
  }

  // Nếu có file mới, upload và thay thế file cũ
  if (req.file) {
    const originalName = path.basename(req.file.originalname);
    const safeName = originalName.replace(/\s+/g, '_');
    const timestamp = Date.now();
    const filename = `${timestamp}_${safeName}`;

    try {
      const fileId = await uploadToGridFS(
        req.file.buffer,
        filename,
        req.file.mimetype,
      );
      updateBaoCao.fileBaoCao = fileId;
    } catch (error) {
      return next(new AppError('Lỗi khi upload file lên GridFS', 500));
    }
  }

  updateBaoCao.ten = req.body.ten;
  updateBaoCao.ngayChinhSuaCuoi = Date.now();

  // Lưu lại thay đổi
  await updateBaoCao.save({ validateModifiedOnly: true });
  const thanhVien = await DeTai.findById(updateBaoCao?.baoCaoTienDo.deTai)
    .select('sinhVien giangVien ten')
    .lean();
  res.status(200).json({
    status: 'success',
    data: { updateBaoCao, thanhVien },
  });
});

exports.deleteBaoCao = catchAsync(async (req, res, next) => {
  let baoCao;
  const { id: baoCaoTienDoId, baoCaoId } = req.params;
  if (baoCaoTienDoId || (baoCaoTienDoId && baoCaoId)) {
    baoCao = await BaoCao.findOne({
      baoCaoTienDo: baoCaoTienDoId,
    });
  } else if (!baoCaoTienDoId && baoCaoId) {
    baoCao = await BaoCao.findById(baoCaoId);
  }
  if (!baoCao) {
    if (!baoCao) {
      return next(
        new AppError('Không tìm thấy báo cáo thuộc về địa chỉ ID này', 404),
      );
    }
  }

  if (
    req.account.vaiTro === 'Sinh viên' &&
    baoCao.baoCaoTienDo.trangThai === 'Đã đóng'
  ) {
    return next(
      new AppError(
        'Sinh viên không được xóa báo cáo của báo cáo tiến độ đã đóng',
        403,
      ),
    );
  }
  if (
    req.account.vaiTro === 'Sinh viên' &&
    baoCao.sinhVien._id.toString() !== req.user._id.toString()
  ) {
    return next(
      new AppError('Chỉ có nhóm trưởng của đề tài mới có thể xóa báo cáo', 403),
    );
  }
  if (req.user.khoa._id.toString() !== baoCao.sinhVien.khoa._id.toString()) {
    return next(
      new AppError(
        'Cán bộ khoa chỉ xóa báo cáo thuộc đề tài khoa mình quản lý',
        403,
      ),
    );
  }
  await NhanXet.deleteMany({ baoCao: baoCao._id });
  if (baoCao.fileBaoCao) {
    await deleteFromGridFS(baoCao.fileBaoCao);
  }
  await baoCao.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getBaoCaoFile = catchAsync(async (req, res, next) => {
  const { baoCaoId } = req.params;
  const baoCao = await BaoCao.findById(baoCaoId).populate('baoCaoTienDo');
  if (!baoCao) {
    return next(new AppError('Không tìm thấy báo cáo', 404));
  }
  if (req.account.vaiTro !== 'Admin') {
    const filter = await getDeTaiFilterByRole(req);
    const allowedDeTaiIds = filter.map((id) => id.toString()) || [];
    const currentDeTaiId = baoCao.baoCaoTienDo.deTai.toString();
    if (filter && !allowedDeTaiIds.includes(currentDeTaiId)) {
      return next(new AppError('Bạn không có quyền truy cập file này', 403));
    }
  }

  const fileId = baoCao.fileBaoCao;
  if (!fileId) {
    return next(new AppError('Báo cáo chưa có file đính kèm', 404));
  }

  try {
    const { stream, contentType, filename } = await getFileReadStream(fileId); // Nhận stream và contentType từ getFileReadStream

    res.set('Content-Type', contentType); // Set lại contentType
    res.set(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

    stream.pipe(res); // Dùng stream để trả về file cho client
  } catch (err) {
    return next(new AppError(err.message, 404)); // Trả về lỗi nếu không tìm thấy file
  }
});

exports.taiBaoCaoFile = catchAsync(async (req, res, next) => {
  const { baoCaoId } = req.params;
  const baoCao = await BaoCao.findById(baoCaoId).populate('baoCaoTienDo');
  if (!baoCao) {
    return next(new AppError('Không tìm thấy báo cáo', 404));
  }
  try {
    const { stream, contentType, filename } = await getFileReadStream(
      baoCao.fileBaoCao,
    );
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(
        filename,
      )}`,
    });
    stream.pipe(res); // gửi file về client
  } catch (err) {
    return next(new AppError(err.message || 'Không thể tải file', 404));
  }
});
