const DeTai = require('../models/detaiModels');

exports.getDeTaiFilterByRole = async (req) => {
  switch (req.account.vaiTro) {
    case 'Cán bộ khoa': {
      const dtIds = await DeTai.find({ khoa: req.user.khoa._id }).select('_id');
      return dtIds.map((d) => d._id);
    }
    case 'Sinh viên': {
      const dtIds = await DeTai.find({
        'sinhVien.sinhVienId': req.user._id,
      }).select('_id');
      return dtIds.map((d) => d._id);
    }
    case 'Giảng viên': {
      const dtIds = await DeTai.find({
        'giangVien.giangVienId': req.user._id,
      }).select('_id');
      return dtIds.map((d) => d._id);
    }
    default:
      return null;
  }
};
