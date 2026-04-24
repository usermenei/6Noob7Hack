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
    userCancelPayment,
    uploadQrCode,
    uploadQrMiddleware,
    getQrCode,
    getQrCodeBySpace,
    adminUpdatePaymentMethod,
    adminCancelPayment
} = require('../controllers/payments');

const { protect, authorize } = require('../middleware/auth');

// -------------------------------------------------------
// US2-1  Core payment
// -------------------------------------------------------
router.post('/',                  protect, createPayment);      // Select medthod: qr, cash
router.put('/:id/confirm',        protect, confirmPayment);     // Payment success
router.put('/:id/fail',           protect, failPayment);        // Payment failed

// -------------------------------------------------------
// US2-2  QR payment (using QrCode)
// -------------------------------------------------------
router.put('/:id/confirm-qr',       protect, confirmQrPayment); // User click confirm paid button
router.get('/:id/qr-code',   protect, getQrCode);        // Get Qr code for a payment (user & admin can see)

// Admin: get QR by coworking space id
router.get('/admin/qr-code/:spaceId', protect, authorize('admin'), getQrCodeBySpace);

// -------------------------------------------------------
// US2-3  Cash payment
// -------------------------------------------------------
router.put('/:id/confirm-cash',   protect, authorize('admin'), confirmCashPayment);         // Admin confirm cash payment
router.get('/pending-cash',       protect, authorize('admin'), getPendingCashPayments);     // Admin view pending cash payments

// -------------------------------------------------------
// US2-5  User change payment method
// -------------------------------------------------------
router.put('/:id/method',        protect, updatePaymentMethod); // User changes payment method

// -------------------------------------------------------
// US2-6  User cancel payment
// -------------------------------------------------------
router.put('/:id/cancel', protect, userCancelPayment);

// -------------------------------------------------------
// US2-7 Admin manage Co-working space's Qr code
// -------------------------------------------------------
router.post('/admin/qr-code',      protect, authorize('admin'), uploadQrMiddleware, uploadQrCode);


// -------------------------------------------------------
// US2-8 Admin update user's payment method
// -------------------------------------------------------
router.put('/admin/:id/method',  protect, authorize('admin'), adminUpdatePaymentMethod);

// -------------------------------------------------------
// US2-9 Admin cancel user's payment
// -------------------------------------------------------
router.put('/admin/:id/cancel',  protect, authorize('admin'), adminCancelPayment);

// -------------------------------------------------------
// US2-4 User payments history
// (fetch ALL PAYMENTS records for a user, sorted by date desc)
// -------------------------------------------------------
router.get('/user/:id',           protect, getPaymentsByUser);

// -------------------------------------------------------
// US2-4 User payment details
// (Only 1 payment)
// Generic  (keep :id routes LAST to avoid swallowing static paths)
// -------------------------------------------------------
router.get('/:id',                protect, getPayment);

module.exports = router;