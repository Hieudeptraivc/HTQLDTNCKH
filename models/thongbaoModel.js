// const mongoose = require('mongoose');

// const thongBaoSchema = mongoose.Schema({
//   tieuDe: {
//     type: String,
//     required: [true, 'Tiêu đề thông báo không được để trống'],
//   },
//   loaiThongBao: {
//     type: String,
//     enum: ['Tự động', 'Thủ công'],
//     default: 'Tự động',
//   },
//   noiDung: {
//     type: String,
//     trim: true,
//     reuired: [true, 'Thông báo cần phải có nội dung'],
//   },
//   nguoiTao: {
//     type: mongoose.Schema.ObjectId,
//     required: [true, 'Thông báo cần phải có người tạo'],
//   },
//   ngayTao: {
//     type: Date,
//     default: Date.now(),
//   },
//   ngayChinhSuaCuoi: Date,
//   deTai: {
//     type: mongoose.Schema.ObjectId,
//     ref: 'DeTai',
//   },
// });

// const ThongBao = mongoose.model('ThongBao', thongBaoSchema);
// module.exports = ThongBao;
