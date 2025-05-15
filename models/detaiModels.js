const mongoose = require('mongoose');
const slugify = require('slugify');
const { validateDeTai } = require('../utils/validateDeTai');

const deTaiSchema = mongoose.Schema(
  {
    ten: {
      type: String,
      required: [true, 'Trường tên đề tài không được để trống'],
      trim: true,
    },
    slug: String,
    trangThai: {
      type: String,
      enum: {
        values: ['Chưa triển khai', 'Đang triển khai', 'Hoàn thành', 'Hủy bỏ'],
        message:
          'Trạng thái của đề tài chỉ bao gồm: Chưa triển khai, Đang triển khai, Hòan thành, Hủy bỏ',
      },
      default: 'Chưa triển khai',
      required: [true, 'Trạng thái không được để trống'],
    },
    deTaiCap: {
      type: String,
      enum: {
        values: ['Đề tài cấp trường', 'Đề tài cấp khoa'],
        message:
          'Đề tài chỉ bao gồm 2 loại: Đề tài cấp trường, Đề tài cấp khoa',
      },
      default: 'Đề tài cấp khoa',
      required: [true, 'Đề tài không được để trống'],
    },
    trangThaiDuyet: {
      type: String,
      enum: {
        values: ['Đang chờ duyệt', 'Đã duyệt', 'Từ chối'],
        message:
          'Trạng thái duyệt chỉ bao gồm: Đang chờ duyệt, Đã duyệt, Từ chối',
      },
      default: 'Đang chờ duyệt',
      required: [true, 'Trạng thái duyệt không được trống'],
    },
    tinhCapThiet: {
      type: String,
      trim: true,
    },
    mucTieu: {
      type: String,
      trim: true,
    },
    noiDungChinh: {
      type: String,
      trim: true,
    },
    ngayTao: {
      type: Date,
      default: Date.now,
    },
    ngayChinhSuaCuoi: Date,
    linhVuc: { type: mongoose.Schema.ObjectId, ref: 'LinhVuc' },
    khoa: { type: mongoose.Schema.ObjectId, ref: 'Khoa' },
    sinhVien: {
      type: [
        {
          sinhVienId: { type: mongoose.Schema.ObjectId, ref: 'SinhVien' },
          vaiTro: {
            type: String,
            enum: {
              values: ['Trưởng nhóm', 'Thành viên'],
              message:
                'Mỗi sinh viên chỉ bao gồm 1 vai trò trong: Trưởng nhóm, Thành viên',
            },
            required: [true, 'Sinh viên phải có vai trò'],
          },
        },
      ],
      require: [true, 'Đề tài phải có sinh viên tham gia'],
      validate: {
        validator: function (v) {
          return v.length <= 5;
        },
        message: 'Mỗi đề tài chỉ tối đa 5 sinh viên',
      },
    },
    // donViNgoai: {
    //   type: [
    //     {
    //       donViNgoaiId: { type: mongoose.Schema.ObjectId, ref: 'DonViNgoai' },
    //       vaiTro: {
    //         type: String,
    //         default: 'Thành viên',
    //       },
    //     },
    //   ],
    //   default: null,
    // },
    giangVienMongMuon: {
      type: [
        {
          giangVienMongMuonId: {
            type: mongoose.Schema.ObjectId,
            ref: 'GiangVien',
          },
          vaiTro: {
            type: String,
            enum: {
              values: [
                'Giảng viên hướng dẫn chính',
                'Giảng viên hướng dẫn phụ',
              ],
              message:
                'Mỗi giảng viên chỉ bao gồm 1 vai trò trong: Giảng viên hướng dẫn chính, Giảng viên hướng dẫn phụ',
            },
            required: [true, 'Giảng viên phải có vai trò'],
          },
        },
      ],
      validate: {
        validator: function (v) {
          return v.length <= 2;
        },
        message: 'Mỗi đề tài chỉ tối đa 2 giảng viên hướng dẫn',
      },
    },
    giangVien: {
      type: [
        {
          giangVienId: {
            type: mongoose.Schema.ObjectId,
            ref: 'GiangVien',
          },
          vaiTro: {
            type: String,
            enum: {
              values: [
                'Giảng viên hướng dẫn chính',
                'Giảng viên hướng dẫn phụ',
              ],
              message:
                'Mỗi giảng viên chỉ bao gồm 1 vai trò trong: Giảng viên hướng dẫn chính, Giảng viên hướng dẫn phụ',
            },
            required: [true, 'Giảng viên phải có vai trò'],
          },
        },
      ],
      validate: {
        validator: function (v) {
          return v.length <= 2;
        },
        message: 'Mỗi đề tài chỉ tối đa 2 giảng viên hướng dẫn',
      },
    },
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);

// Thêm validator để giới hạn tổng số thành viên (sinhVien + donViNgoai) không vượt quá 5
deTaiSchema.pre('save', function (next) {
  const totalMembers =
    (this.sinhVien?.length || 0) + (this.donViNgoai?.length || 0);
  if (totalMembers > 5) {
    return next(
      new Error(
        'Tổng số thành viên (sinh viên và đơn vị ngoài) không được vượt quá 5',
      ),
    );
  }
  next();
});

// Virtual populate cho báo cáo tiến độ
deTaiSchema.virtual('baoCaoTienDo', {
  ref: 'BaoCaoTienDo',
  foreignField: 'deTai',
  localField: '_id',
});

// Tạo slug từ tên đề tài
deTaiSchema.pre('save', function (next) {
  this.slug = slugify(this.ten, { lower: true });
  next();
});

// Validate đề tài (từ hàm validateDeTai đã định nghĩa)
deTaiSchema.pre('save', validateDeTai);

// Populate các trường liên quan
deTaiSchema.pre(/^find/, function (next) {
  this.populate([
    {
      path: 'sinhVien.sinhVienId',
      select: '-__v -soDienThoai -hocLuc -chungMinhHocLuc -taiKhoan -ngaySinh',
    },
    // {
    //   path: 'donViNgoai.donViNgoaiId',
    //   select: 'soDienThoai email ten',
    // },
    {
      path: 'giangVien.giangVienId',
      select: '-ngaySinh -taiKhoan -soDienThoai -__v',
    },
    {
      path: 'giangVienMongMuon.giangVienMongMuonId',
      select: '-ngaySinh -taiKhoan -soDienThoai -__v',
    },
    { path: 'khoa', select: 'ten' },

    { path: 'linhVuc', select: 'ten' },
  ]);
  next();
});

const DeTai = mongoose.model('DeTai', deTaiSchema);
module.exports = DeTai;
