const BaoCao = require('../models/baocaoModel');
const AppError = require('./appError');
const { getDeTaiFilterByRole } = require('./getDeTaiFilterByRole');

exports.checkAccessToBaoCao = async (req, baoCaoId) => {
  const baoCao = await BaoCao.findById(baoCaoId);
  if (!baoCao || !baoCao.baoCaoTienDo)
    throw new AppError('Không tìm thấy báo cáo hoặc báo cáo không hợp lệ', 404);

  const filter = await getDeTaiFilterByRole(req);
  const allowedDeTaiIds = filter.map((id) => id.toString()) || [];
  const currentDeTaiId = baoCao.baoCaoTienDo.deTai._id.toString();

  if (filter && !allowedDeTaiIds.includes(currentDeTaiId)) {
    throw new AppError(
      'Bạn không có quyền truy cập nhận xét trong báo cáo này',
      403,
    );
  }

  return baoCao; // Trả về báo cáo để dùng tiếp
};
