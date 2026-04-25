const express = require('express');

const {
  getReservations,
  getReservation,
  addReservation,
  updateReservation,
  deleteReservation,
  confirmReservation,
  permanentlyDeleteReservation // 👈 NEW
} = require('../controllers/reservations');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

// =====================================================
// 🔥 PERMANENT DELETE (IMPORTANT: put BEFORE /:id)
// =====================================================
router.delete(
  '/:id/permanent',
  protect,
  authorize('admin', 'user'),
  permanentlyDeleteReservation
);
router.get('/reservation/:reservationId', protect, getPaymentByReservation);
// =====================================================
// GET all / POST create
// =====================================================
router.route('/')
  .get(protect, getReservations)
  .post(protect, authorize('admin', 'user'), addReservation);

// =====================================================
// GET / PUT / DELETE (cancel)
// =====================================================
router.route('/:id')
  .get(protect, getReservation)
  .put(protect, authorize('admin', 'user'), updateReservation)
  .delete(protect, authorize('admin', 'user'), deleteReservation);

// =====================================================
// ADMIN CONFIRM
// =====================================================
router.put(
  '/:id/confirm',
  protect,
  authorize('admin'),
  confirmReservation
);

module.exports = router;