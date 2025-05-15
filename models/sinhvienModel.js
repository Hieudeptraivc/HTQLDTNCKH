const mongoose = require('mongoose');
const validator = require('validator');

const sinhVienSchema = new mongoose.Schema(
  {
    ten: {
      type: String,
      required: [true, 'Trường tên sinh viên không được để trống'],
      trim: true,
    },
    mssv: {
      type: String,
      required: [true, 'Mã số sinh viên không được để trống'],
      unique: [true, 'Mã số sinh viên đã tồn tại'],
    },
    mssvSort: {
      type: Number,
    },
    lop: {
      type: String,
      required: [true, 'Trường lớp không được để trống'],
    },
    ngaySinh: {
      type: Date,
      required: [true, 'Trường ngày sinh không được để trống'],
      validate: [validator.isDate, 'Ngày sinh không hợp lệ'],
    },
    soDienThoai: {
      type: String,
      required: [true, 'Trường số điện thoại không được để trống'],
      validate: [validator.isMobilePhone, 'Số điện thoại không hợp lệ'],
    },
    hocLuc: {
      type: String,
      enum: {
        values: ['Giỏi', 'Khá', 'Trung bình', 'Yếu', 'Xuất sắc'],
        message:
          'Trường học lực chỉ bao gồm: Giỏi, Khá, Trung bình, Yếu, Xuất sắc',
      },
      default: 'Khá',
      require: [true, 'Trường học lực không được để trống'],
    },
    chungMinhHocLuc: String,
    avatar: { type: String, default: 'default.jpg' },

    ngayTao: {
      type: Date,
      default: Date.now,
    },
    khoa: {
      type: mongoose.Schema.ObjectId,
      ref: 'Khoa',
    },
    taiKhoan: {
      type: mongoose.Schema.ObjectId,
      ref: 'TaiKhoan',
      unique: [true, 'Tài khoản đã tồn tại'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

sinhVienSchema.pre(/^find/, function (next) {
  this.populate([
    { path: 'khoa', select: 'ten' },
    { path: 'taiKhoan', select: 'trangThai _id email ngayTao' },
  ]);
  next();
});

const SinhVien = mongoose.model('SinhVien', sinhVienSchema);
module.exports = SinhVien;
