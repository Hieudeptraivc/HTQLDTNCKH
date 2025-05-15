const mongoose = require('mongoose');

const lichSuDeTaiSchema = mongoose.Schema(
  {
    deTai: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeTai',
      required: [true, 'Lịch sử chỉnh sửa phải thuộc về một đề tài'],
    },
    duLieuCu: {
      type: Object,
      required: [true, 'Dữ liệu cũ không được để trống'],
    },
    nguoiThayDoi: {
      type: mongoose.Schema.ObjectId,
      refPath: 'loaiNguoiDung',
      required: [true, 'Lịch sử chỉnh sửa phải có người thay đổi'],
    },
    loaiNguoiDung: {
      type: String,
      required: true,
      enum: ['SinhVien', 'GiangVien', 'CanBoKhoa'],
    },
    thoiGianThayDoi: {
      type: Date,
      default: Date.now,
    },
    ghiChu: {
      type: String,
      default: 'Không có ghi chú',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Populate các trường tham chiếu
lichSuDeTaiSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'nguoiThayDoi',
    select: 'ten email',
  });
  next();
});

const LichSuDeTai = mongoose.model('LichSuDeTai', lichSuDeTaiSchema);
module.exports = LichSuDeTai;
