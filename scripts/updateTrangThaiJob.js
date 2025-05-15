const cron = require('node-cron');
const BaoCaoTienDo = require('../models/baocaotiendoModel');

module.exports = function startUpdateTrangThaiJob() {
  cron.schedule('0 0 * * *', async () => {
    // console.log('Đang cập nhật trạng thái báo cáo tiến độ...');
    await BaoCaoTienDo.updateStatus();
  });
};
