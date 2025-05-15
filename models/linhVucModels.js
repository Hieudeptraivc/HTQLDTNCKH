const mongoose = require('mongoose');

const linhVucSchema = mongoose.Schema(
  {
    ten: {
      type: String,
      // enum: {
      //   values: [
      //     'Khoa học tự nhiên',
      //     'Khoa học kỹ thuật & công nghệ',
      //     'Khoa học y dược',
      //     'Khoa học nông nghiệp',
      //     'Khoa học xã hội',
      //     'Khoa học nhân văn',
      //   ],
      //   message:
      //     'Lĩnh vực nghiên cứu chỉ bao gồm: Khoa học tự nhiên, Khoa học kỹ thuật & công nghệ, Khoa học y dược, Khoa học nông nghiệp, Khoa học xã hội, Khoa học nhân văn',
      // },
      unique: [true, 'Tên lĩnh vực đã tồn tại'],
      required: [true, 'Trường tên lĩnh vực không được để trống'],
    },
    moTa: {
      type: String,
      trim: true,
    },
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);
linhVucSchema.virtual('deTai', {
  ref: 'DeTai',
  foreignField: 'linhVuc',
  localField: '_id',
});
const LinhVuc = mongoose.model('LinhVuc', linhVucSchema);
module.exports = LinhVuc;
