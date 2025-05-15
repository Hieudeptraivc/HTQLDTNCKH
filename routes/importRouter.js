const express = require('express');
const importController = require('../controllers/importController');
const {
  protect,
  restrictTo,
  getUsers,
} = require('../controllers/authController');

const router = express.Router();
router.use(protect);
router.use(restrictTo('Cán bộ khoa'), getUsers);
router.post(
  '/gv-sv',
  importController.uploadFile,
  importController.importUsers,
);

module.exports = router;
