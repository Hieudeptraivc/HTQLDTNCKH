const LinhVuc = require('../models/linhVucModels');
const {
  createOne,
  updateOne,
  deleteOne,
  getOne,
  getDsOne,
  getAllOne,
} = require('./handlerKhoaAndLinhVuc');

exports.createLinhVuc = createOne(LinhVuc);
exports.updateLinhVuc = updateOne(LinhVuc);
exports.deleteLinhVuc = deleteOne(LinhVuc);
exports.getLinhVuc = getOne(LinhVuc);
exports.getDsLinhVuc = getDsOne(LinhVuc);
exports.getAllLinhVuc = getAllOne(LinhVuc);
