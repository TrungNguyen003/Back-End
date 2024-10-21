const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema đặt lịch spa thú cưng
const petSpaBookingSchema = new Schema({
  petName: {
    type: String,
    required: true,
    trim: true
  },
  petType: {
    type: String,
    required: true,
    enum: ['Chó', 'Mèo', 'Khác'],  // Giới hạn lựa chọn loại thú cưng
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,  // Liên kết với bảng người dùng nếu có
    ref: 'User',
    required: true
  },
  // Mảng các dịch vụ bao gồm cả tên và giá
  selectedServices: [{
    serviceName: {
      type: String,
      enum: ['Tắm', 'Cắt tỉa', 'Làm móng', 'massage', 'Vệ sinh tai'],
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }],
  bookingDate: {
    type: Date,
    required: true
  },
  additionalNotes: {
    type: String,
    trim: true,
    maxlength: 500  // Giới hạn số ký tự ghi chú
  },
  bookingStatus: {
    type: String,
    enum: ['chưa giải quyết', 'confirmed', 'canceled'],
    default: 'chưa giải quyết'
  },
  createdAt: {
    type: Date,
    default: Date.now  // Ngày tạo lịch
  }
});

// Tạo model từ schema
const PetSpaBooking = mongoose.model('PetSpaBooking', petSpaBookingSchema);

module.exports = PetSpaBooking;
