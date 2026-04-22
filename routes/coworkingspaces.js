const express = require('express');
const router = express.Router();

const {
  getCoworkingspaces,
  getCoworkingspace,
  createCoworkingspace,
  updateCoworkingspace,
  deleteCoworkingspace,
  updateCoworkingspacePhoto
} = require('../controllers/coworkingspaces');

const { getQrCode } = require('../controllers/payments');

const { getRoomsByCoworking, getRoomByCoworking } = require('../controllers/rooms');

const { protect } = require('../middleware/auth');

router.route('/')
  .get(getCoworkingspaces)
  .post(protect, createCoworkingspace);

router.route('/:id')
  .get(getCoworkingspace)
  .put(protect, updateCoworkingspace)
  .delete(protect, deleteCoworkingspace);

router.route('/:id/photo')
  .put(protect, updateCoworkingspacePhoto);

// ✅ Nested room routes
router.get('/:coworkingId/rooms', getRoomsByCoworking);
router.get('/:coworkingId/rooms/:roomId', getRoomByCoworking);

router.get('/:coworkingId/qr-code', protect, getQrCode);

module.exports = router;