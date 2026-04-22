const express = require('express');
const router  = express.Router();

const {
    createPayment,
    confirmPayment,
    failPayment,
    confirmQrPayment,
    confirmCashPayment,
    getPendingCashPayments,
    getPayment,
    getPaymentsByUser,
    updatePaymentMethod,
    uploadQrCode,
    uploadQrMiddleware,
    getQrCodeInfo,
    adminUpdatePaymentMethod,
    adminCancelPayment
} = require('../controllers/payments');

const { protect, authorize } = require('../middleware/auth');

// -------------------------------------------------------
// US2-1  Core payment
// -------------------------------------------------------
router.post('/',                  protect, createPayment);
router.put('/:id/confirm',        protect, confirmPayment);
router.put('/:id/fail',           protect, failPayment);
router.put('/:id/method',        protect, updatePaymentMethod);

// -------------------------------------------------------
// US2-2  QR payment (using QrCode)
// -------------------------------------------------------
router.put('/:id/confirm-qr',       protect, confirmQrPayment);

// -------------------------------------------------------
// US2-3  Cash payment
// -------------------------------------------------------
router.put('/:id/confirm-cash',   protect, confirmCashPayment);
router.get('/pending-cash',       protect, getPendingCashPayments);

// -------------------------------------------------------
// User payments (fetch all payment records for a user, sorted by date desc)
// Keep before the generic :id route to avoid route collision
// -------------------------------------------------------
router.get('/user/:id',           protect, getPaymentsByUser);

// -------------------------------------------------------
// US2-7 Admin QR code management
// -------------------------------------------------------
router.post('/admin/qr-code',      protect, authorize('admin'), uploadQrMiddleware, uploadQrCode);
router.get('/admin/qr-code/info',  protect, authorize('admin'), getQrCodeInfo);

router.put('/admin/:id/method',  protect, authorize('admin'), adminUpdatePaymentMethod);
router.put('/admin/:id/cancel',  protect, authorize('admin'), adminCancelPayment);

// -------------------------------------------------------
// Generic  (keep :id routes LAST to avoid swallowing static paths)
// -------------------------------------------------------
router.get('/:id',                protect, getPayment);

module.exports = router;