const mongoose = require('mongoose');
const slugify = require('slugify');

const baoCaoSchema = mongoose.Schema(
  {
    ten: {
      type: String,
      required: [true, 'Trường tên báo cáo đề tài không được để trống'],
      trim: true,
    },
    slug: String,
    fileBaoCao: {
      type: String,
      required: [true, 'Không được để trống file báo cáo'],
    },
    ngayTao: {
      type: Date,
      default: Date.now,
    },
    ngayChinhSuaCuoi: Date,
    sinhVien: { type: mongoose.Schema.ObjectId, ref: 'SinhVien' },
    baoCaoTienDo: {
      type: mongoose.Schema.ObjectId,
      ref: 'BaoCaoTienDo',
      unique: [true, 'Mỗi tiến độ báo cáo chỉ có một báo cáo'],
      required: [true, 'Mỗi báo cáo phải thuộc về một tiến độ báo cáo'],
    },
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);

baoCaoSchema.pre('save', function (next) {
  this.slug = slugify(this.ten, { lower: true });
  next();
});
baoCaoSchema.virtual('nhanXet', {
  ref: 'NhanXet',
  foreignField: 'baoCao',
  localField: '_id',
});
baoCaoSchema.pre(/^find/, function (next) {
  this.populate([
    {
      path: 'baoCaoTienDo',
      select: '-ghiChu -noiDungChinh -ngayTao -hanNop -id',
    },
    {
      path: 'sinhVien',
      select: '-ngaySinh -soDienThoai -hocLuc -chungMinhHocLuc -taiKhoan',
    },
  ]);
  next();
});
const BaoCao = mongoose.model('BaoCao', baoCaoSchema);
module.exports = BaoCao;
