const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  id: { type: String, required: true },
  detail: { type: String, required: true }, // Số nhà, tên đường...
  ward: String,
  district: String,
  city: String,
}, { _id: false }); // không tạo _id phụ trong từng address

const profileSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  phone: String,
  gender: String,
  birthDate: Date,
  addresses: [addressSchema],
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
