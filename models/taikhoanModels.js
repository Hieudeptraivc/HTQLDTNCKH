const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const taiKhoanSchema = mongoose.Schema(
  {
    tenDangNhap: {
      type: String,
      required: [true, 'Trường tên tài khoản không được để trống'],
      unique: [true, 'Tên đăng nhập đã tồn tại'],
      lowercase: true,
    },
    matKhau: {
      type: String,
      required: [true, 'Trường mật khẩu không được để trống'],
      minLength: [8, 'Mật khẩu không được ít hơn 8 kí tự'],
      select: false,
    },
    email: {
      type: String,
      required: [true, 'Trường email không được để trống'],
      unique: [true, 'Email đã tồn tại'],
      lowercase: true,
      validate: [validator.isEmail, 'Email không hợp lệ'],
    },

    vaiTro: {
      type: String,
      enum: {
        values: ['Sinh viên', 'Giảng viên', 'Cán bộ khoa'],
        message:
          'Trường vai trò chỉ bao gồm: Sinh viên, Giảng viên, Cán bộ khoa',
      },
      default: 'Sinh viên',
      required: [true, 'Trường vai trò không được để trống'],
    },
    matKhauXacNhan: {
      type: String,
      required: [true, 'Trường xác nhận mật khẩu không được để trống'],
      validate: {
        // Chỉ hoạt động khi lưu hoặc tạo, khi cập nhật thì phải làm cách khác
        validator: function (el) {
          return el === this.matKhau;
        },
        message: 'Mật khẩu không giống nhau',
      },
    },
    nguoiDung: {
      type: mongoose.Schema.ObjectId,
      unique: true,
      sparse: true,
    },
    ngayTao: {
      type: Date,
      default: Date.now,
    },
    trangThai: {
      type: Boolean,
      default: true,
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);
taiKhoanSchema.pre('save', async function (next) {
  if (!this.isModified('matKhau')) return next();

  this.matKhau = await bcrypt.hash(this.matKhau, 14);

  this.matKhauXacNhan = undefined;
  next();
});

taiKhoanSchema.pre('save', function (next) {
  if (!this.isModified('matKhau') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// taiKhoanSchema.pre(/^find/, function (next) {
//   this.find({ trangThai: { $ne: false } });
//   next();
// });

taiKhoanSchema.methods.correctPassword = async (
  accountPassword,
  candidatePassword,
) => await bcrypt.compare(candidatePassword, accountPassword);

taiKhoanSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

taiKhoanSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(64).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const TaiKhoan = mongoose.model('TaiKhoan', taiKhoanSchema);
module.exports = TaiKhoan;
