const express = require('express');
const router = express.Router();

const {
  createRoom,
  getRooms,
  getRoomAvailability,
  updateRoom,
  deleteRoom
} = require('../controllers/rooms');

// ✅ import BOTH protect + authorize
const { protect, authorize } = require('../middleware/auth');

// 🔥 IMPORTANT: put this BEFORE /:id
router.get('/availability', getRoomAvailability);

// =====================================================
// GET all rooms / CREATE room
// =====================================================
router.route('/')
  .get(getRooms)
  .post(protect, authorize('admin'), createRoom);

// =====================================================
// UPDATE / DELETE room (ADMIN ONLY)
// =====================================================
router.route('/:id')
  .put(protect, authorize('admin'), updateRoom)
  .delete(protect, authorize('admin'), deleteRoom);

module.exports = router;