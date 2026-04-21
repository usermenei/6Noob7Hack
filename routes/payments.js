const express = require('express');
const router  = express.Router();

const {
    createPayment,
    confirmPayment,
    failPayment,
    generateQr,
    confirmQrPayment,
    verifyQr,
    getQrStatus,
    confirmCashPayment,
    getPendingCashPayments,
    getPayment,
    getPaymentsByUser,
    updatePaymentMethod
} = require('../controllers/payments');

const { protect } = require('../middleware/auth');

// -------------------------------------------------------
// US2-1  Core payment
// -------------------------------------------------------
router.post('/',                  protect, createPayment);
router.put('/:id/confirm',        protect, confirmPayment);
router.put('/:id/fail',           protect, failPayment);
router.put('/:id/method',        protect, updatePaymentMethod);

// -------------------------------------------------------
// US2-2  QR payment
// -------------------------------------------------------
router.post('/verify-qr',         protect, verifyQr);            // verify QR without confirming  <-- NEW
router.post('/:id/qr',            protect, generateQr);
router.put('/:id/confirm-qr',     protect, confirmQrPayment);
router.get('/:id/qr-status',      protect, getQrStatus);

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
// Generic  (keep :id routes LAST to avoid swallowing static paths)
// -------------------------------------------------------
router.get('/:id',                protect, getPayment);

module.exports = router;