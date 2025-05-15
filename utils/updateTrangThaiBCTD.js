const cron = require('node-cron');
const BaoCaoTienDo = require('../models/baocaotiendoModel');

module.exports = function startUpdateTrangThaiJob() {
  cron.schedule('0 0 * * *', async () => {
    await BaoCaoTienDo.updateStatus();
  });
};
