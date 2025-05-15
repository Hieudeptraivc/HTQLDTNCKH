const { promisify } = require('util');
const crypto = require('crypto');
const SinhVien = require('../models/sinhvienModel');
const GiangVien = require('../models/giangvienModel');
const CanBoKhoa = require('../models/canbokhoaModel');
const Admin = require('../models/adminModel');
const TaiKhoan = require('../models/taikhoanModels');
const catchAsync = require('../utils/errorAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const { validateAndGetTaiKhoan } = require('../utils/validateUser');
const DeTai = require('../models/detaiModels');
const emailService = require('../utils/emailService');
const withTransaction = require('../utils/withTransaction');
// Hàm chuyển ngày sinh sang chuỗi mật khẩu: 'ddmmyyyy'
function formatNgaySinh(ngaySinhStr) {
  if (!ngaySinhStr) return;
  const [year, month, day] = ngaySinhStr.split('-');
  return `${day}${month}${year}`;
}
const signToken = (id, vaiTroTK) =>
  jwt.sign({ id, vaiTroTK }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
const createSendToken = (account, statusCode, res) => {
  const token = signToken(account._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: true, // Bắt buộc khi SameSite=None
    sameSite: 'None',
  };
  res.cookie('jwt', token, cookieOptions);
  account.matKhau = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      taiKhoan: account,
    },
  });
};

const filterObj = (obj, ...allowedfFields) => {
  const newObject = {};
  Object.keys(obj).forEach((el) => {
    if (allowedfFields.includes(el)) newObject[el] = obj[el];
  });
  return newObject;
};
exports.createAccount = catchAsync(async (req, res, next) => {
  const newAccount = await TaiKhoan.create(req.body);
  newAccount.matKhau = undefined;
  res.status(201).json({
    status: 'success',
    data: {
      taiKhoan: newAccount,
    },
  });
});
exports.createAccount = catchAsync(async (req, res, next) => {
  const newAccount = await TaiKhoan.create(req.body);
  newAccount.matKhau = undefined;
  res.status(201).json({
    status: 'success',
    data: {
      taiKhoan: newAccount,
    },
  });
});

exports.createSinhVien = catchAsync(async (req, res, next) => {
  const {
    ten,
    mssv,
    email,
    soDienThoai,
    lop,
    khoa,
    hocLuc,
    ngaySinh,
    chungMinhHocLuc,
  } = req.body;

  // Validate dữ liệu sinh viên trước khi bắt đầu transaction
  // Tạo đối tượng sinh viên tạm thời mà không có mssvSort trước
  const sinhVienTemp = new SinhVien({
    ten,
    soDienThoai,
    lop,
    hocLuc,
    khoa,
    mssv,
    ngaySinh,
    chungMinhHocLuc,
  });

  // Kiểm tra validate model SinhVien trước
  const validateError = sinhVienTemp.validateSync();
  if (validateError) {
    console.log(validateError.errors.message);
    return next(
      new AppError(
        Object.values(validateError.errors)
          .map((err) => err.message)
          .join(', '),
        400,
      ),
    );
  }

  // Validate email và tên đăng nhập trước khi tạo tài khoản
  // const existingAccount = await TaiKhoan.findOne({
  //   $or: [{ email: email }, { tenDangNhap: mssv }],
  // });

  // if (existingAccount) {
  //   return next(
  //     new AppError(
  //       'Email hoặc mã số sinh viên đã được sử dụng cho tài khoản khác',
  //       400,
  //     ),
  //   );
  // }

  // Validate mssv đã tồn tại chưa
  const existingSinhVien = await SinhVien.findOne({ mssv });
  if (existingSinhVien) {
    return next(new AppError('Mã số sinh viên đã tồn tại trong hệ thống', 400));
  }

  // Nếu validation đã thành công, tiếp tục với transaction
  const result = await withTransaction(async (session) => {
    // 1. Tạo tài khoản tương ứng
    const tenDangNhap = mssv;
    const matKhau = formatNgaySinh(ngaySinh); // ví dụ: 29/06/2003 => '29062003'

    const newAccount = await TaiKhoan.create(
      [
        {
          tenDangNhap,
          email,
          matKhau,
          matKhauXacNhan: matKhau,
          vaiTro: 'Sinh viên',
        },
      ],
      { session },
    );

    if (!newAccount || newAccount.length === 0) {
      throw new AppError('Lỗi xảy ra khi tạo tài khoản', 401);
    }

    // Truyền session vào đây
    const account = await validateAndGetTaiKhoan(newAccount[0]._id, session);

    // 2. Tạo sinh viên - Chỉ thêm mssvSort nếu mssv tồn tại và hợp lệ
    const sinhVienData = {
      ten,
      soDienThoai,
      lop,
      hocLuc,
      khoa,
      mssv,
      ngaySinh,
      chungMinhHocLuc,
      ngayTao: account.ngayTao,
      taiKhoan: account._id,
    };

    // Chỉ thêm mssvSort nếu mssv hợp lệ
    if (mssv && !isNaN(parseInt(mssv, 10))) {
      sinhVienData.mssvSort = parseInt(mssv, 10);
    }

    const newSinhVien = await SinhVien.create([sinhVienData], { session });

    if (!newSinhVien || newSinhVien.length === 0) {
      throw new AppError('Lỗi xảy ra khi tạo sinh viên', 401);
    }

    // 3. Gán sinh viên cho tài khoản
    account.nguoiDung = newSinhVien[0]._id;
    await account.save({ session, validateModifiedOnly: true });

    account.matKhau = undefined; // ẩn mật khẩu

    return {
      sinhVien: newSinhVien[0],
      taiKhoan: account,
    };
  });

  res.status(201).json({
    status: 'success',
    data: result,
  });
});

/////
exports.createGiangVien = catchAsync(async (req, res, next) => {
  const { ten, email, soDienThoai, ngaySinh, hocVi, khoa } = req.body;

  // Validate dữ liệu giảng viên trước khi bắt đầu transaction
  const giangVienTemp = new GiangVien({
    ten,
    soDienThoai,
    ngaySinh,
    hocVi,
    khoa,
  });

  // Kiểm tra validate model GiangVien trước
  const validateError = giangVienTemp.validateSync();
  if (validateError) {
    return next(
      new AppError(
        Object.values(validateError.errors)
          .map((err) => err.message)
          .join(', '),
        400,
      ),
    );
  }

  // Kiểm tra email đã tồn tại chưa
  const existingAccount = await TaiKhoan.findOne({ email });
  if (existingAccount) {
    return next(new AppError('Email đã được sử dụng', 400));
  }

  // Nếu validation đã thành công, tiếp tục với transaction
  const result = await withTransaction(async (session) => {
    // 1. Tạo tài khoản tương ứng
    const tenDangNhap = email;
    const matKhau = formatNgaySinh(ngaySinh);

    const newAccount = await TaiKhoan.create(
      [
        {
          tenDangNhap,
          email,
          matKhau,
          matKhauXacNhan: matKhau,
          vaiTro: 'Giảng viên',
        },
      ],
      { session },
    );

    if (!newAccount || newAccount.length === 0) {
      throw new AppError('Lỗi xảy ra khi tạo tài khoản', 401);
    }

    // Truyền session vào đây
    const account = await validateAndGetTaiKhoan(newAccount[0]._id, session);

    // 2. Tạo giảng viên
    const newGiangVien = await GiangVien.create(
      [
        {
          ten,
          soDienThoai,
          ngaySinh,
          hocVi,
          khoa,
          ngayTao: account.ngayTao,
          taiKhoan: account._id,
        },
      ],
      { session },
    );

    if (!newGiangVien || newGiangVien.length === 0) {
      throw new AppError('Lỗi xảy ra khi tạo giảng viên', 401);
    }

    // 3. Gán giảng viên cho tài khoản
    account.nguoiDung = newGiangVien[0]._id;
    await account.save({ session, validateModifiedOnly: true });

    account.matKhau = undefined; // ẩn mật khẩu khi trả về

    return {
      giangVien: newGiangVien[0],
      taiKhoan: account,
    };
  });

  res.status(201).json({
    status: 'success',
    data: result,
  });
});
//////
exports.createCanBoKhoa = catchAsync(async (req, res, next) => {
  const { ten, email, soDienThoai, ngaySinh, khoa } = req.body;

  // Validate dữ liệu cán bộ khoa trước khi bắt đầu transaction
  const canBoTemp = new CanBoKhoa({
    ten,
    soDienThoai,
    ngaySinh,
    khoa,
  });

  // Kiểm tra validate model CanBoKhoa trước
  const validateError = canBoTemp.validateSync();
  if (validateError) {
    return next(
      new AppError(
        Object.values(validateError.errors)
          .map((err) => err.message)
          .join(', '),
        400,
      ),
    );
  }

  // Kiểm tra email đã tồn tại chưa
  const existingAccount = await TaiKhoan.findOne({ email });
  if (existingAccount) {
    return next(new AppError('Email đã được sử dụng', 400));
  }

  // Nếu validation đã thành công, tiếp tục với transaction
  const result = await withTransaction(async (session) => {
    // 1. Tạo tài khoản tương ứng
    const tenDangNhap = email;
    const matKhau = formatNgaySinh(ngaySinh);

    const newAccount = await TaiKhoan.create(
      [
        {
          tenDangNhap,
          email,
          matKhau,
          matKhauXacNhan: matKhau,
          vaiTro: 'Cán bộ khoa',
        },
      ],
      { session },
    );

    if (!newAccount || newAccount.length === 0) {
      throw new AppError('Lỗi xảy ra khi tạo tài khoản', 401);
    }

    // Truyền session vào đây
    const account = await validateAndGetTaiKhoan(newAccount[0]._id, session);

    // 2. Tạo cán bộ khoa
    const newCanBo = await CanBoKhoa.create(
      [
        {
          ten,
          soDienThoai,
          ngaySinh,
          khoa,
          ngayTao: account.ngayTao,
          taiKhoan: account._id,
        },
      ],
      { session },
    );

    if (!newCanBo || newCanBo.length === 0) {
      throw new AppError('Lỗi xảy ra khi tạo cán bộ khoa', 401);
    }

    // 3. Gán cán bộ khoa cho tài khoản
    account.nguoiDung = newCanBo[0]._id;
    await account.save({ session, validateModifiedOnly: true });

    account.matKhau = undefined; // ẩn mật khẩu khi trả về

    return {
      canBoKhoa: newCanBo[0],
      taiKhoan: account,
    };
  });

  res.status(201).json({
    status: 'success',
    data: result,
  });
});
////
exports.login = catchAsync(async (req, res, next) => {
  const { tenDangNhap, matKhau } = req.body;

  if (!tenDangNhap || !matKhau)
    return next(
      new AppError('Tên đăng nhập hoặc mật khẩu không được để trống'),
    );

  const account = await TaiKhoan.findOne({
    tenDangNhap: tenDangNhap.trim().toLowerCase(),
  }).select('+matKhau +trangThai');
  if (!account) {
    return next(
      new AppError('Tài khoản không tồn tại.Vui lòng đăng kí tài khoản.', 404),
    );
  }
  if (account?.trangThai === false) {
    return next(
      new AppError(
        'Tài khoản đã bị xóa hoặc vô hiệu hóa hãy liên hệ cán bộ khoa để kích hoạt lại tài khoản',
        404,
      ),
    );
  }

  if (!account || !(await account.correctPassword(account.matKhau, matKhau))) {
    return next(new AppError('Tên đăng nhập hoặc mật khẩu không đúng'));
  }
  createSendToken(account, 200, res);
});

// exports.logout =
// exports.isLoggedIn = catchAsync(async (req, res, next) => {
//   if (req.cookies.jwt) {
//     const decoded = await promisify(jwt.verify)(
//       req.cookies.jwt,
//       process.env.JWT_SECRET,
//     );

//     const currentAccount = await TaiKhoan.findById(decoded.id);
//     if (!currentAccount) {
//       return next();
//     }

//     if (currentAccount.changedPasswordAfter(decoded.iat)) {
//       return next();
//     }

//     // GRANT ACCESS TO PROTECTED ROUTE
//     req.account = currentAccount;

//     next();
//   }
// });
exports.logout = catchAsync((req, res, next) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: true, // Bắt buộc khi SameSite=None
    sameSite: 'None',
  });
  res.status(200).json({ status: 'success' });
});
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError(
        'Bạn chưa đăng nhập. Vui lòng đăng nhập để có quyền truy cập.',
        407,
      ),
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentAccount = await TaiKhoan.findById(decoded.id);
  if (!currentAccount) {
    return next(
      new AppError('Tài khoản thuộc về token này không còn tồn tại.', 401),
    );
  }

  if (currentAccount.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'Tài khoản đã được đổi mật khẩu. Vui lòng đăng nhập lại!',
        401,
      ),
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.account = currentAccount;
  next();
});

exports.getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: { acc: req.account, user: req.user },
  });
});

exports.restrictTo =
  (...vaiTro) =>
  (req, res, next) => {
    if (!vaiTro.includes(req.account.vaiTro)) {
      return next(
        new AppError('Bạn không có quyền để thực hiện hành động này', 403),
      );
    }
    next();
  };
exports.getUsers = catchAsync(async (req, res, next) => {
  if (!req.account) {
    return next(new AppError('Bạn chưa đăng nhập. Vui lòng đăng nhập!', 401));
  }
  if (req.account.vaiTro === 'Admin') {
    req.user = await Admin.findById(req.account.nguoiDung);
    return next();
  }

  const { vaiTro, nguoiDung } = req.account;
  let user;

  if (vaiTro === 'Sinh viên') {
    user = await SinhVien.findById(nguoiDung);
  } else if (vaiTro === 'Cán bộ khoa') {
    user = await CanBoKhoa.findById(nguoiDung);
  } else if (vaiTro === 'Giảng viên') {
    user = await GiangVien.findById(nguoiDung);
  } else {
    return next(
      new AppError('Vai trò không hợp lệ. Vui lòng kiểm tra lại!', 400),
    );
  }
  if (!user) {
    return next(
      new AppError(`${vaiTro} không tồn tại. Vui lòng kiểm tra lại!`, 404),
    );
  }
  // console.log(user);
  req.user = user;

  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const account = await TaiKhoan.findOne({
    email: req.body.email,
    vaiTro: { $ne: 'Admin' },
  });

  if (!account) {
    return next(
      new AppError('Không có tài khoản nào tồn tại với địa chỉ email này'),
    );
  }

  const resetToken = account.createPasswordResetToken();
  await account.save({ validateModifiedOnly: true });

  try {
    const resetURL = `${req.protocol}s://${process.env.FRONT_END_HOST}/reset-password/${resetToken}`;
    await emailService.sendPasswordResetEmail({
      email: account.email,
      resetURL,
      next,
    });

    res.status(200).json({
      status: 'success',
      message:
        'Link đặt lại mật khẩu đã được gửi tới email!. Vui lòng kiểm tra hộp thư đến (rác) của bạn.',
    });
  } catch (err) {
    account.passwordResetToken = undefined;
    account.passwordResetExpires = undefined;
    await account.save({ validateModifiedOnly: true });

    return next(new AppError('Gửi email thất bại. Hãy thử lại sau!'), 500);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const account = await TaiKhoan.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!account)
    return next(
      new AppError(
        'Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ hoặc đã hết hạn sử dụng',
      ),
    );
  account.matKhau = req.body.matKhau;
  account.matKhauXacNhan = req.body.matKhauXacNhan;
  account.passwordResetToken = undefined;
  account.passwordResetExpires = undefined;
  await account.save({ validateModifiedOnly: true });
  createSendToken(account, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const account = await TaiKhoan.findById(req.account._id).select('+matKhau');
  if (
    !(await account.correctPassword(account.matKhau, req.body.matKhauHienTai))
  )
    return next(new AppError('Mật khẩu hiện tại không chính xác'), 401);

  account.matKhau = req.body.matKhauMoi;
  account.matKhauXacNhan = req.body.matKhauMoiXacNhan;
  await account.save({ validateModifiedOnly: true });

  createSendToken(account, 200, res);
});

exports.updateSinhVien = catchAsync(async (req, res, next) => {
  if (req.body.taiKhoan)
    return next(
      new AppError('Đường dẫn này chỉ dùng để update thông tin cá nhân', 400),
    );
  let filteredBody = filterObj(req.body, 'ten', 'soDienThoai', 'ngaySinh');
  let sinhVienId;
  if (req.account.vaiTro === 'Admin' || req.account.vaiTro === 'Cán bộ khoa') {
    filteredBody = filterObj(
      req.body,
      'ngaySinh',
      'ten',
      'lop',
      'soDienThoai',
      'hocLuc',
      'chungMinhHocLuc',
    );
    sinhVienId = req.body.sinhVien_Id;
    if (!sinhVienId) return next(new AppError('Hãy nhập ID của sinh viên'));
  }
  if (req.file) filteredBody.avatar = req.file.filename;

  let updatedSinhVien = await SinhVien.findByIdAndUpdate(
    sinhVienId || req.account.nguoiDung,
    filteredBody,
    { new: true, runValidators: true },
  );

  if (
    req.body.email &&
    (req.account.vaiTro === 'Admin' || req.account.vaiTro === 'Cán bộ khoa')
  ) {
    const updatedTaiKhoan = await TaiKhoan.findByIdAndUpdate(
      updatedSinhVien.taiKhoan._id,
      { email: req.body.email },
      {
        new: true,
        runValidators: true,
      },
    );
    if (!updatedTaiKhoan) {
      return next(
        new AppError(
          'Không tìm thấy tài khoản của sinh viên hoặc sinh viên không có tài khoản',
          404,
        ),
      );
    }
  }
  updatedSinhVien = await SinhVien.findById(updatedSinhVien._id);
  res.status(200).json({
    status: 'success',
    data: {
      sinhVien: updatedSinhVien,
    },
  });
});

exports.updateGiangVien = catchAsync(async (req, res, next) => {
  if (req.body.taiKhoan)
    return next(
      new AppError('Đường dẫn này chỉ dùng để cập nhật thông tin cá nhân', 400),
    );

  let filteredBody = filterObj(req.body, 'ten', 'soDienThoai', 'ngaySinh');

  let giangVienId;

  if (req.account.vaiTro === 'Admin' || req.account.vaiTro === 'Cán bộ khoa') {
    filteredBody = filterObj(req.body, 'ten', 'soDienThoai', 'hocVi');
    giangVienId = req.body.giangVien_Id;
    if (!giangVienId) return next(new AppError('Hãy nhập ID của giảng viên'));
  }
  if (req.file) filteredBody.avatar = req.file.filename;
  let updatedGiangVien = await GiangVien.findByIdAndUpdate(
    giangVienId || req.account.nguoiDung,
    filteredBody,
    { new: true, runValidators: true },
  );

  // Nếu có cập nhật email và có quyền
  if (
    req.body.email &&
    (req.account.vaiTro === 'Admin' || req.account.vaiTro === 'Cán bộ khoa')
  ) {
    const updatedTaiKhoan = await TaiKhoan.findByIdAndUpdate(
      updatedGiangVien.taiKhoan._id,
      { email: req.body.email },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedTaiKhoan) {
      return next(
        new AppError(
          'Không tìm thấy tài khoản của giảng viên hoặc giảng viên không có tài khoản',
          404,
        ),
      );
    }
  }

  // Lấy lại giảng viên sau khi cập nhật hoàn tất
  updatedGiangVien = await GiangVien.findById(updatedGiangVien._id);

  res.status(200).json({
    status: 'success',
    data: {
      giangVien: updatedGiangVien,
    },
  });
});

exports.updateCanBoKhoa = catchAsync(async (req, res, next) => {
  if (req.body.taiKhoan)
    return next(
      new AppError('Đường dẫn này chỉ dùng để cập nhật thông tin cá nhân'),
    );
  let filteredBody = filterObj(req.body, 'ten', 'soDienThoai', 'ngaySinh');
  let canBoKhoaId;

  if (req.account.vaiTro === 'Admin') {
    filteredBody = filterObj(
      req.body,
      'ten',
      'soDienThoai',
      'khoa',
      'ngaySinh',
    );
    canBoKhoaId = req.body.canBoKhoa_Id;
    if (!canBoKhoaId) return next(new AppError('Hãy nhập ID của cán bộ khoa'));
  }
  if (req.file) filteredBody.avatar = req.file.filename;
  const updatedCanBoKhoa = await CanBoKhoa.findByIdAndUpdate(
    canBoKhoaId || req.account.nguoiDung,
    filteredBody,
    { new: true, runValidators: true },
  );
  res.status(200).json({
    status: 'success',
    data: {
      canBoKhoa: updatedCanBoKhoa,
    },
  });
});

exports.deleteAccountByMe = catchAsync(async (req, res, next) => {
  let filter;
  if (!req.account.id)
    return next(
      new AppError('Bạn chưa đăng nhập. Vui lòng đăng nhập để xóa tài khoản'),
    );
  if (req.account.vaiTro === 'Sinh viên') {
    filter = { 'sinhVien.sinhVienId': req.user._id };
  } else if (req.account.vaiTro === 'Giảng viên') {
    filter = { 'giangVien.giangVienId': req.user._id };
  }
  const deTai = await DeTai.findOne(filter);
  // console.log(deTai);
  if (deTai) {
    return next(
      new AppError(
        `Không thể vô hiệu hóa tài khoản vì bạn đang tham gia đề tài ${deTai.ten}`,
        403,
      ),
    );
  }
  const taiKhoan = await TaiKhoan.findByIdAndUpdate(req.account.id, {
    trangThai: false,
  });
  let nguoiDung;
  switch (taiKhoan.vaiTro) {
    case 'Sinh viên':
      nguoiDung = await SinhVien.findById(taiKhoan.nguoiDung);
      break;
    case 'Giảng viên':
      nguoiDung = await GiangVien.findById(taiKhoan.nguoiDung);
      break;
    default:
      return next(new AppError('Vai trò không hợp lệ', 400));
  }
  res.clearCookie('jwt');
  res.status(200).json({
    status: 'success',
    data: { nguoiDung },
  });
});
exports.deleteSinhVien = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findOne({
    'sinhVien.sinhVienId': req.sinhVien._id,
  });
  if (deTai) {
    return next(
      new AppError(
        `Không thể xóa sinh viên bởi vì đang tham gia đề tài ${deTai.ten}`,
        403,
      ),
    );
  }
  await SinhVien.findByIdAndDelete(req.sinhVien._id);
  if (req.sinhVien.taiKhoan) {
    await TaiKhoan.findByIdAndDelete(req.sinhVien.taiKhoan);
  }
  res.status(200).json({
    status: 'success',
    data: {
      data: null,
    },
  });
});
exports.deleteGiangVien = catchAsync(async (req, res, next) => {
  const deTai = await DeTai.findOne({
    'giangVien.giangVienId': req.giangVien._id,
  });
  if (deTai) {
    return next(
      new AppError(
        `Không thể xóa giảng viên bởi vì đang tham gia hướng dẫn đề tài ${deTai.ten}`,
        403,
      ),
    );
  }
  await GiangVien.findByIdAndDelete(req.giangVien._id);
  if (req.giangVien.taiKhoan) {
    await TaiKhoan.findByIdAndDelete(req.giangVien.taiKhoan);
  }
  res.status(200).json({
    status: 'success',
    data: {
      data: null,
    },
  });
});
exports.deleteCanBoKhoa = catchAsync(async (req, res, next) => {
  const canBoKhoa = await CanBoKhoa.findByIdAndDelete(req.body.canBoKhoa_Id);
  if (!canBoKhoa)
    return next(
      new AppError('Không tìm thấy cán bộ khoa thuộc về ID này', 404),
    );
  if (canBoKhoa.taiKhoan) {
    await TaiKhoan.findByIdAndDelete(canBoKhoa.taiKhoan._id);
  }
  res.status(200).json({
    status: 'success',
    data: {
      data: null,
    },
  });
});
exports.activeTaiKhoan = catchAsync(async (req, res, next) => {
  const taiKhoan = await TaiKhoan.findByIdAndUpdate(req.body.taiKhoan_Id, {
    trangThai: true,
  }).select('+trangThai');
  if (!taiKhoan) {
    return next(new AppError('Không tìm thấy tài khoản thuộc về ID này', 404));
  }
  let nguoiDung;
  switch (taiKhoan.vaiTro) {
    case 'Sinh viên':
      nguoiDung = await SinhVien.findById(taiKhoan.nguoiDung);
      break;
    case 'Giảng viên':
      nguoiDung = await GiangVien.findById(taiKhoan.nguoiDung);
      break;
    case 'Cán bộ khoa':
      nguoiDung = await CanBoKhoa.findById(taiKhoan.nguoiDung);
      break;
    default:
      return next(new AppError('Vai trò không hợp lệ', 400));
  }
  // console.log(taiKhoan, nguoiDung);
  res.status(201).json({
    status: 'success',
    data: {
      taiKhoan,
      nguoiDung,
    },
  });
});
exports.disableTaiKhoan = catchAsync(async (req, res, next) => {
  const taiKhoan = await TaiKhoan.findByIdAndUpdate(req.body.taiKhoan_Id, {
    trangThai: false,
  }).select('+trangThai');
  if (!taiKhoan) {
    return next(new AppError('Không tìm thấy tài khoản thuộc về ID này', 404));
  }
  let nguoiDung;
  switch (taiKhoan.vaiTro) {
    case 'Sinh viên':
      nguoiDung = await SinhVien.findById(taiKhoan.nguoiDung);
      break;
    case 'Giảng viên':
      nguoiDung = await GiangVien.findById(taiKhoan.nguoiDung);
      break;
    case 'Cán bộ khoa':
      nguoiDung = await CanBoKhoa.findById(taiKhoan.nguoiDung);
      break;
    default:
      return next(new AppError('Vai trò không hợp lệ', 400));
  }
  res.status(201).json({
    status: 'success',
    data: {
      taiKhoan,
      nguoiDung,
    },
  });
});
exports.updateAdmin = catchAsync(async (req, res, next) => {
  if (req.body.taiKhoan)
    return next(
      new AppError('Đường dẫn này chỉ dùng để cập nhật thông tin cá nhân'),
    );
  let filteredBody = filterObj(req.body, 'ten', 'mota');
  if (req.file) filteredBody.avatar = req.file.filename;
  const updatedAdmin = await Admin.findByIdAndUpdate(
    req.account.nguoiDung,
    filteredBody,
    { new: true, runValidators: true },
  );
  res.status(200).json({
    status: 'success',
    data: {
      admin: updatedAdmin,
    },
  });
});
