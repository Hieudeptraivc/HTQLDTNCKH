const mongoose = require('mongoose');
const slugify = require('slugify');
const { updateStatus } = require('../utils/updateTrangThaiBCTD');

const baoCaoTienDoSchema = mongoose.Schema(
  {
    ten: {
      type: String,
      required: [true, 'Trường tên tiến độ báo cáo đề tài không được để trống'],
      trim: true,
    },
    slug: String,
    trangThai: {
      type: String,
      enum: {
        values: ['Đã mở', 'Đã đóng'],
        message: 'Trạng thái của tiến độ báo cáo chỉ bao gồm: Đã mở, đã đóng',
      },
      default: 'Đã mở',
      required: [true, 'Trạng thái không được để trống'],
    },
    loaiBaoCao: {
      type: String,
      enum: {
        values: ['Sơ bộ', 'Chi tiết', 'Cuối cùng'],
        message: 'Loại tiến độ báo cáo chỉ bao gồm: Sơ bộ, Chi tiết, Cuối cùng',
      },
      default: 'Sơ bộ',
      required: [true, 'Loại tiến độ báo cáo không được trống'],
    },
    ghiChu: {
      type: String,
      trim: true,
    },
    lanThu: {
      type: Number,
    },
    noiDungChinh: {
      type: String,
      trim: true,
    },
    ngayTao: {
      type: Date,
      default: Date.now,
    },
    hanNop: {
      type: Date,
      required: [true, 'Tiến độ báo cáo cần thời hạn nộp'],
      validate: {
        validator: function (value) {
          return value > Date.now();
        },
        message: 'Hạn nộp phải lớn hơn ngày hiện tại',
      },
    },
    ngayChinhSuaCuoi: Date,
    nguoiThayDoiCuoi: {
      type: mongoose.Schema.ObjectId,
      ref: 'CanBoKhoa',
      require: [true, 'Tiến độ thay đổi cần biết ai là người sửa'],
    },
    deTai: {
      type: mongoose.Schema.ObjectId,
      ref: 'DeTai',
      require: [true, 'Báo cáo đề tài phải được liên kết đến đề tài'],
    },
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);
baoCaoTienDoSchema.virtual('baoCao', {
  ref: 'BaoCao',
  foreignField: 'baoCaoTienDo',
  localField: '_id',
});
baoCaoTienDoSchema.pre('save', function (next) {
  this.slug = slugify(this.ten, { lower: true });
  next();
});

const oneDayInMs = 24 * 60 * 60 * 1000;

baoCaoTienDoSchema.statics.updateStatus = async function () {
  const now = Date.now();
  await this.updateMany(
    { hanNop: { $lt: new Date(now - oneDayInMs) }, trangThai: 'Đã mở' },
    { trangThai: 'Đã đóng' },
  );
};

// baoCaoTienDoSchema.pre(/^find/, function (next) {
//   this.populate([{ path: 'deTai', select: '_id ten khoa sinhVien giangVien' }]);
//   next();
// });
const BaoCaoTienDo = mongoose.model('BaoCaoTienDo', baoCaoTienDoSchema);
module.exports = BaoCaoTienDo;
