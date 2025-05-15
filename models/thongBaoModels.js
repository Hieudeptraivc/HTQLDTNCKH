const mongoose = require('mongoose');

const thongBaoSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    sinhViens: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SinhVien',
      },
    ],
    giangViens: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GiangVien',
      },
    ],
    canBoKhoas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CanBoKhoa',
      },
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    readBySinhViens: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SinhVien',
      },
    ],
    readByGiangViens: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GiangVien',
      },
    ],
    readByCanBoKhoas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CanBoKhoa',
      },
    ],
    readByAdmins: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  {
    timestamps: true,
  },
);

const ThongBao = mongoose.model('ThongBao', thongBaoSchema);

module.exports = ThongBao;
