const mongoose = require('mongoose');
const validator = require('validator');

const giangVienSchema = new mongoose.Schema(
  {
    ten: {
      type: String,
      required: [true, 'Trường tên giảng viên không được để trống'],
      trim: true,
    },
    ngaySinh: {
      type: Date,
      required: [true, 'Trường ngày sinh không được để trổng'],
      validate: [validator.isDate, 'Ngày sinh không hợp lệ'],
    },
    soDienThoai: {
      type: String,
      required: [true, 'Trường số điện thoại không được để trổng'],
      validate: [validator.isMobilePhone, 'Số điện thoại không hợp lệ'],
    },
    hocVi: {
      type: String,
      enum: {
        values: [
          'Tú tài',
          'Cử nhân',
          'Thạc sĩ',
          'Tiến sĩ',
          'Phó giáo sư-Tiến sĩ',
          'Giáo sư-Tiến sĩ',
        ],
        message:
          'Học vị duyệt bao gồm: Tú tài, Cử nhân, Thạc sĩ, Tiến sĩ, Phó giáo sư-Tiến sĩ, Giáo sư-Tiến sĩ',
      },
      default: 'Thạc sĩ',
      required: [true, 'Học vị của giảng viên không được trống'],
    },
    avatar: { type: String, default: 'default.jpg' },
    ngayTao: Date,
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

giangVienSchema.pre(/^find/, function (next) {
  this.populate([
    { path: 'khoa', select: 'ten' },
    { path: 'taiKhoan', select: 'trangThai _id email ngayTao' },
  ]);
  next();
});
const GiangVien = mongoose.model('GiangVien', giangVienSchema);
module.exports = GiangVien;
