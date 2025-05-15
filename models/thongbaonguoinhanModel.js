// // Model ThongBaoNguoiNhan
// const mongoose = require('mongoose');

// const thongBaoNguoiNhanSchema = new mongoose.Schema({
//   thongBao: {
//     type: mongoose.Schema.ObjectId,
//     ref: 'ThongBao',
//     required: [true, 'Thông báo không được để trống'],
//   },
//   nguoiNhan: {
//     type: mongoose.Schema.ObjectId,
//     required: [true, 'Thông báo phải có người nhận'],
//   },
//   loaiNguoiNhan: {
//     type: String,
//     enum: ['Sinh viên', 'Giảng viên', 'Cán bộ khoa'],
//     required: [true, 'Thông báo phải có loại người nhận'],
//   },
//   noiDung: {
//     type: String,
//     trim: true,
//   },
//   daDoc: {
//     type: Boolean,
//     default: false,
//   },
//   ngayTao: {
//     type: Date,
//     default: Date.now(),
//   },
//   thoiGianDoc: Date,
// });

// const ThongBaoNguoiNhan = mongoose.model(
//   'ThongBaoNguoiNhan',
//   thongBaoNguoiNhanSchema,
// );
// module.exports = ThongBaoNguoiNhan;
