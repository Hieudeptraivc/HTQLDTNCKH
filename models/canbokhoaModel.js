const mongoose = require('mongoose');
const validator = require('validator');

const canBoKhoaSchema = new mongoose.Schema(
  {
    ten: {
      type: String,
      required: [true, 'Trường tên cán bộ khoa không được để trống'],
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

canBoKhoaSchema.pre(/^find/, function (next) {
  this.populate([
    { path: 'khoa', select: 'ten' },
    { path: 'taiKhoan', select: 'trangThai _id email ngayTao' },
  ]);
  next();
});
const CanBoKhoa = mongoose.model('CanBoKhoa', canBoKhoaSchema);
module.exports = CanBoKhoa;
