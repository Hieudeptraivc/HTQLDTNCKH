const multer = require('multer');
const dayjs = require('dayjs');
const XLSX = require('xlsx');
const fs = require('fs');
const validator = require('validator');
const catchAsync = require('../utils/errorAsync');
const AppError = require('../utils/appError');
const TaiKhoan = require('../models/taikhoanModels');
const { validateAndGetTaiKhoan } = require('../utils/validateUser');
const GiangVien = require('../models/giangvienModel');
const SinhVien = require('../models/sinhvienModel');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);
// Multer config upload file
const upload = multer({ dest: 'uploads/' });
exports.uploadFile = upload.single('file');

// Convert Excel date serial number -> JS date string
const excelDateToJS = (serial) => {
  if (!serial && serial !== 0) return null;

  // Chuyển đổi đúng từ số serial Excel sang date JavaScript
  const excelEpoch = new Date(1899, 11, 30); // Excel epoch start (Dec 30, 1899)
  const days = typeof serial === 'string' ? parseInt(serial, 10) : serial;
  const msPerDay = 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + days * msPerDay);

  // Trả về đối tượng Date thay vì chuỗi
  return date;
};

const formatNgaySinh = (ngaySinh) => {
  if (!ngaySinh && ngaySinh !== 0) {
    throw new Error('Ngày sinh không được để trống');
  }

  let dateObj;

  if (typeof ngaySinh === 'number') {
    // Số serial Excel
    dateObj = excelDateToJS(ngaySinh);
  } else if (typeof ngaySinh === 'string') {
    // Chuỗi ISO hay dạng ngày thông thường
    const parsed = dayjs(
      ngaySinh,
      ['YYYY-MM-DD', 'DD/MM/YYYY', 'D/M/YYYY', 'MM/DD/YYYY', 'M/D/YYYY'],
      true,
    );

    if (!parsed.isValid()) {
      // Thử parse theo ISO nếu bị lỗi
      const isoParsed = dayjs(ngaySinh);
      if (!isoParsed.isValid()) {
        throw new Error(`Ngày sinh dạng chuỗi không hợp lệ: ${ngaySinh}`);
      }
      dateObj = isoParsed.toDate();
    } else {
      dateObj = parsed.toDate();
    }
  } else if (ngaySinh instanceof Date) {
    dateObj = ngaySinh;
  } else {
    throw new Error(
      `Định dạng ngày sinh không được hỗ trợ: ${typeof ngaySinh}`,
    );
  }
  dateObj.setDate(dateObj.getDate() + 1);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  const formattedDate = {
    matKhau: `${day}${month}${year}`,
    ngaySinh: new Date(dateObj),
  };
  return formattedDate;
};

exports.importUsers = catchAsync(async (req, res, next) => {
  const { userType } = req.body;
  if (!['giangvien', 'sinhvien'].includes(userType)) {
    return next(new AppError('Loại người dùng không hợp lệ', 400));
  }

  if (!req.user.khoa) {
    return next(new AppError('Bạn chưa được gán khoa để import', 400));
  }

  const workbook = XLSX.readFile(req.file.path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rowsAsArray = XLSX.utils.sheet_to_json(sheet, { raw: true, header: 1 });
  const rows = rowsAsArray;
  const headers = rows[0];
  const headerMap = {};

  headers.forEach((header, index) => {
    const headerLower = header.toLowerCase();
    if (headerLower === 'ten') headerMap.ten = index;
    else if (headerLower === 'mssv') headerMap.mssv = index;
    else if (headerLower === 'email') headerMap.email = index;
    else if (headerLower === 'sodienthoai') headerMap.soDienThoai = index;
    else if (headerLower === 'lop') headerMap.lop = index;
    else if (headerLower === 'hocluc') headerMap.hocLuc = index;
    else if (headerLower === 'ngaysinh') headerMap.ngaySinh = index;
    else if (headerLower === 'hocvi') headerMap.hocVi = index;
  });

  const createdList = [];
  const errorList = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    if (!row || row.length === 0 || !row[headerMap.ten]) continue;

    try {
      const rawNgaySinh = row[headerMap.ngaySinh];

      const userData = {
        ten: row[headerMap.ten],
        email: row[headerMap.email],
        soDienThoai: row[headerMap.soDienThoai]?.toString(),
        ngaySinh: rawNgaySinh,
      };

      let taiKhoanCreated = null;

      if (userType === 'giangvien') {
        userData.hocVi = row[headerMap.hocVi];

        if (!userData.email || !validator.isEmail(userData.email)) {
          errorList.push({
            row: i + 1,
            error: 'Email không hợp lệ hoặc thiếu',
            userData,
          });
          continue;
        }

        const existingAccount = await TaiKhoan.findOne({
          email: userData.email,
        });
        if (existingAccount) {
          errorList.push({
            row: i + 1,
            error: 'Tài khoản đã tồn tại cho email',
            userData,
          });
          continue;
        }

        const { matKhau, ngaySinh } = formatNgaySinh(userData.ngaySinh);

        try {
          // Tạo tài khoản trước
          taiKhoanCreated = await TaiKhoan.create({
            tenDangNhap: userData.email,
            email: userData.email,
            matKhau,
            matKhauXacNhan: matKhau,
            vaiTro: 'Giảng viên',
          });

          // Tạo giảng viên
          const account = await validateAndGetTaiKhoan(taiKhoanCreated._id);

          const newGiangVien = await GiangVien.create({
            ten: userData.ten,
            soDienThoai: userData.soDienThoai,
            ngaySinh,
            hocVi: userData.hocVi,
            khoa: req.user.khoa,
            ngayTao: account.ngayTao,
            taiKhoan: account._id,
          });

          // Cập nhật liên kết tài khoản - giảng viên
          account.nguoiDung = newGiangVien._id;
          await account.save({ validateModifiedOnly: true });

          createdList.push({ giangVien: newGiangVien, taiKhoan: account });
        } catch (err) {
          // Nếu lỗi khi tạo giảng viên, xóa tài khoản đã tạo
          if (taiKhoanCreated) {
            await TaiKhoan.findByIdAndDelete(taiKhoanCreated._id);
          }

          throw err; // Ném lỗi để xử lý ở catch bên ngoài
        }
      }

      if (userType === 'sinhvien') {
        userData.mssv = row[headerMap.mssv]?.toString();
        userData.lop = row[headerMap.lop];
        userData.hocLuc = row[headerMap.hocLuc];

        if (!userData.mssv) {
          errorList.push({
            row: i + 1,
            error: 'Thiếu mã số sinh viên (mssv)',
            userData,
          });
          continue;
        }

        // 👇 Thêm kiểm tra mssv có hoàn toàn là số không
        if (!validator.isNumeric(userData.mssv)) {
          errorList.push({
            row: i + 1,
            error: 'Mã số sinh viên phải là số',
            userData,
          });
          continue;
        }

        if (!userData.email || !validator.isEmail(userData.email)) {
          errorList.push({
            row: i + 1,
            error: 'Email không hợp lệ hoặc thiếu',
            userData,
          });
          continue;
        }

        const existingAccount = await TaiKhoan.findOne({
          tenDangNhap: userData.mssv,
        });
        if (existingAccount) {
          errorList.push({
            row: i + 1,
            error: 'Tài khoản đã tồn tại cho mssv',
            userData,
          });
          continue;
        }

        let matKhau, ngaySinh;
        try {
          ({ matKhau, ngaySinh } = formatNgaySinh(userData.ngaySinh));
        } catch (err) {
          errorList.push({
            row: i + 1,
            error: `Lỗi xử lý ngày sinh: ${err.message}`,
            userData,
          });
          continue;
        }

        try {
          // Tạo tài khoản trước
          taiKhoanCreated = await TaiKhoan.create({
            tenDangNhap: userData.mssv,
            email: userData.email,
            matKhau,
            matKhauXacNhan: matKhau,
            vaiTro: 'Sinh viên',
          });

          // Tạo sinh viên
          const account = await validateAndGetTaiKhoan(taiKhoanCreated._id);

          const newSinhVien = await SinhVien.create({
            ten: userData.ten,
            soDienThoai: userData.soDienThoai,
            lop: userData.lop,
            hocLuc: userData.hocLuc,
            khoa: req.user.khoa,
            mssv: userData.mssv,
            ngaySinh,
            ngayTao: account.ngayTao,
            mssvSort: parseInt(userData.mssv, 10),
            taiKhoan: account._id,
          });

          // Cập nhật liên kết tài khoản - sinh viên
          account.nguoiDung = newSinhVien._id;
          await account.save({ validateModifiedOnly: true });

          createdList.push({ sinhVien: newSinhVien, taiKhoan: account });
        } catch (err) {
          // Nếu lỗi khi tạo sinh viên, xóa tài khoản đã tạo
          if (taiKhoanCreated) {
            await TaiKhoan.findByIdAndDelete(taiKhoanCreated._id);
          }

          throw err; // Ném lỗi để xử lý ở catch bên ngoài
        }
      }
    } catch (err) {
      errorList.push({
        row: i + 1,
        error: err.message,
        userData: row,
      });
    }
  }

  fs.unlinkSync(req.file.path);

  res.status(201).json({
    status: 'success',
    results: createdList.length,
    created: createdList,
    errors: errorList,
  });
});
