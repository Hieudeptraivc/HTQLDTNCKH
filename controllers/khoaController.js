const Khoa = require('../models/khoaModel');

const {
  deleteOne,
  updateOne,
  getOne,
  getDsOne,
  getAllOne,
  createOne,
} = require('./handlerKhoaAndLinhVuc');

exports.createKhoa = createOne(Khoa);
exports.getAllKhoa = getAllOne(Khoa);
exports.getKhoa = getOne(Khoa);
exports.getDsKhoa = getDsOne(Khoa);
exports.updateKhoa = updateOne(Khoa);
exports.deleteKhoa = deleteOne(Khoa);
