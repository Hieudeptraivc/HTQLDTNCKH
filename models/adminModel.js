const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  ten: String,
  mota: String,
  avatar: { type: String, default: 'default.jpg' },
});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
