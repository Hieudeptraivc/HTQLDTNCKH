const mongoose = require('mongoose');
const slugify = require('slugify');

const khoaSchema = new mongoose.Schema(
  {
    ten: {
      type: String,
      required: [true, 'Trường tên khoa không được để trống'],
      unique: [true, 'Tên khoa đã có trước đó '],
      trim: true,
      maxLength: [50, 'Tên khoa không được vượt quá 50 kí tự'],
      minLength: [4, 'Tên khoa không được ít hơn 4 kí tự'],
    },
    slug: String,
    moTa: {
      type: String,
      trim: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
khoaSchema.virtual('giangVien', {
  ref: 'GiangVien',
  foreignField: 'khoa',
  localField: '_id',
});
khoaSchema.virtual('canBoKhoa', {
  ref: 'CanBoKhoa',
  foreignField: 'khoa',
  localField: '_id',
});
khoaSchema.virtual('sinhVien', {
  ref: 'SinhVien',
  foreignField: 'khoa',
  localField: '_id',
});
khoaSchema.pre('save', function (next) {
  this.slug = slugify(this.ten, { lower: true });
  next();
});

const Khoa = mongoose.model('Khoa', khoaSchema);

module.exports = Khoa;
