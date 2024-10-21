const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  length: { type: Number, required: true },
  width: { type: Number, required: true },
  weight: { type: Number, required: true },
  height: { type: Number, required: true },
  category: {
    level1: { type: String, required: true },
  },
});

const shipSchema = new mongoose.Schema({
  payment_type_id: { type: Number, required: true },
  note: { type: String, required: true },
  required_note: { type: String, required: true },
  return_phone: { type: String, required: true },
  return_address: { type: String, required: true },
  return_district_id: { type: Number, required: false }, // Optional
  return_ward_code: { type: String, required: false }, // Optional
  client_order_code: { type: String, required: false }, // Optional
  from_name: { type: String, required: true },
  from_phone: { type: String, required: true },
  from_address: { type: String, required: true },
  from_ward_name: { type: String, required: true },
  from_district_name: { type: String, required: true },
  from_province_name: { type: String, required: true },
  to_name: { type: String, required: true },
  to_phone: { type: String, required: true },
  to_address: { type: String, required: true },
  to_ward_name: { type: String, required: true },
  to_district_name: { type: String, required: true },
  to_province_name: { type: String, required: true },
  cod_amount: { type: Number, required: true },
  content: { type: String, required: true },
  weight: { type: Number, required: true },
  length: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  cod_failed_amount: { type: Number, required: true },
  pick_station_id: { type: Number, required: true },
  deliver_station_id: { type: Number, required: false }, // Optional
  insurance_value: { type: Number, required: true },
  service_id: { type: Number, required: true },
  service_type_id: { type: Number, required: true },
  coupon: { type: String, required: false }, // Optional
  pickup_time: { type: Number, required: true }, // Unix timestamp
  pick_shift: [{ type: Number, required: true }],
  items: [itemSchema], // Array of items
});

const Ship = mongoose.model("Ship", shipSchema);

module.exports = Ship;
