const mongoose = require('mongoose');

const nhanXetSchema = new mongoose.Schema(
  {
    tieuDe: {
      type: String,
      required: [true, 'Nhận xét phải kèm theo tiêu đề'],
    },
    noiDung: {
      type: String,
      required: [true, 'Nội dung nhận xét không được để trống'],
      trim: true,
    },
    ngayTao: {
      type: Date,
      default: Date.now,
    },
    ngayChinhSuaCuoi: Date,
    giangVien: {
      type: mongoose.Schema.ObjectId,
      ref: 'GiangVien',
      required: true,
    },
    baoCao: {
      type: mongoose.Schema.ObjectId,
      ref: 'BaoCao',
      required: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Middleware tự động populate thông tin giảng viên khi truy vấn
nhanXetSchema.pre(/^find/, function (next) {
  this.populate([
    {
      path: 'giangVien',
      select: 'ten email soDienThoai avatar',
    },
    { path: 'baoCao' },
  ]);
  next();
});

const NhanXet = mongoose.model('NhanXet', nhanXetSchema);
module.exports = NhanXet;
