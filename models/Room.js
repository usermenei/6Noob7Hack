const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  coworkingSpace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CoworkingSpace',
    required: true
  },

  // ✅ ADD THIS
  picture: {
    type: String,
    default: null
  },

  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active'
  }
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);