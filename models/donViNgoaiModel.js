// const mongoose = require('mongoose');
// const validator = require('validator');

// const donViNgoaiSchema = new mongoose.Schema(
//   {
//     ten: {
//       type: String,
//       required: [true, 'Trường tên sinh viên không được để trống'],
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: [true, 'Trường ngày sinh không được để trổng'],
//       validate: [validator.isEmail, 'Email không hợp lệ'],
//     },
//     soDienThoai: {
//       type: String,
//       required: [true, 'Trường số điện thoại không được để trổng'],
//       validate: [validator.isMobilePhone, 'Số điện thoại không hợp lệ'],
//     },
//     ngayTao: {
//       type: Date,
//       default: Date.now(),
//     },
//   },
//   {
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
//   },
// );

// const DonViNgoai = mongoose.model('DonViNgoai', donViNgoaiSchema);
// module.exports = DonViNgoai;
