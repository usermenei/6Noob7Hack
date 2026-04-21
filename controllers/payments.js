// controllers/paymentController.js

const Payment     = require('../models/Payment');
const Reservation = require('../models/Reservation');
const QrCode      = require('../models/QrCode');
const Room        = require('../models/Room');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');


// =====================================================
// Helper: Centralised error handler
// =====================================================
const handleError = (err, res) => {
    console.error(err);

    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    if (err.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: err.message });
    }

    return res.status(500).json({ success: false, message: 'Server error' });
};
const markReservationSuccess = async (reservationId) => {
    await Reservation.findByIdAndUpdate(reservationId, {
        status: 'success'
    });
};

// =====================================================
// Helper: Calculate total amount from time slots
// =====================================================
const calcAmount = (room, slotCount) => room.price * slotCount;


// =====================================================
// Helper: Generate QR base64 image from payload string
// =====================================================
const generateQrBase64 = async (payload) => {
    return await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 2
    });
};


// =====================================================
// US2-1
// @desc    Create payment for a reservation
// @route   POST /api/v1/payments
// @access  Private (user)
// =====================================================
exports.createPayment = async (req, res) => {
    try {
        const { reservationId, method } = req.body;

        if (!reservationId || !method) {
            return res.status(400).json({
                success: false,
                message: 'reservationId and method are required'
            });
        }

        if (!['qr', 'cash'].includes(method)) {
            return res.status(400).json({
                success: false,
                message: 'method must be "qr" or "cash"'
            });
        }

        const reservation = await Reservation.findById(reservationId)
            .populate({ path: 'room', select: 'name price capacity coworkingSpace' })
            .populate({ path: 'timeSlots', select: 'startTime endTime' });

        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservation not found' });
        }

        if (reservation.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (reservation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Reservation status is "${reservation.status}". Only pending reservations can be paid.`
            });
        }

        const existingPayment = await Payment.findOne({
            reservation: reservationId,
            status: { $in: ['pending', 'completed'] }
        });

        if (existingPayment) {
            return res.status(400).json({
                success: false,
                message: 'A payment already exists for this reservation'
            });
        }

        const amount = calcAmount(reservation.room, reservation.timeSlots.length);

        const payment = await Payment.create({
            reservation: reservationId,
            user: req.user.id,
            amount,
            method,
            status: 'pending'
        });

        return res.status(201).json({
            success: true,
            data: {
                paymentId:     payment._id,
                reservationId: reservation._id,
                amount,
                method:        payment.method,
                status:        payment.status,
                room:          reservation.room.name,
                timeSlots:     reservation.timeSlots
            }
        });

    } catch (err) {
        return handleError(err, res);
    }
};


// =====================================================
// US2-1 (success path)
// @desc    Confirm a payment as completed
// @route   PUT /api/v1/payments/:id/confirm
// @access  Private (admin or internal webhook)
// =====================================================
exports.confirmPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot confirm a payment with status "${payment.status}"`
            });
        }

        const transactionId = `TXN-${uuidv4().toUpperCase()}`;

        payment.status        = 'completed';
        payment.transactionId = transactionId;
        await payment.save();
        await markReservationSuccess(payment.reservation);
        await Reservation.findByIdAndUpdate(payment.reservation, { status: 'success' });

        return res.status(200).json({
            success: true,
            data: {
                paymentId:     payment._id,
                transactionId: payment.transactionId,
                status:        payment.status,
                amount:        payment.amount,
                method:        payment.method
            }
        });

    } catch (err) {
        return handleError(err, res);
    }
};


// =====================================================
// US2-1 (failure path)
// @desc    Mark a payment as failed
// @route   PUT /api/v1/payments/:id/fail
// @access  Private (admin or internal)
// =====================================================
exports.failPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot fail a payment with status "${payment.status}"`
            });
        }

        payment.status = 'failed';
        await payment.save();

        return res.status(200).json({
            success: true,
            message: 'Payment marked as failed. Reservation is still pending — user may retry.',
            data: { paymentId: payment._id, status: payment.status }
        });

    } catch (err) {
        return handleError(err, res);
    }
};


// =====================================================
// US2-2
// @desc    Generate a QR code for a payment (stored in QrCode collection)
// @route   POST /api/v1/payments/:id/qr
// @access  Private (owner of the payment)
// =====================================================
exports.generateQr = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate({
                path: 'reservation',
                populate: { path: 'room', select: 'coworkingSpace' }
            });

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (payment.method !== 'qr') {
            return res.status(400).json({
                success: false,
                message: 'This payment does not use QR method'
            });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot generate QR for a payment with status "${payment.status}"`
            });
        }

        // --- invalidate any previous unused QR for this payment ---
        await QrCode.deleteMany({ payment: payment._id, isUsed: false });

        // --- build payload (what gets encoded inside the QR image) ---
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        const payload = JSON.stringify({
            paymentId:     payment._id.toString(),
            reservationId: payment.reservation._id.toString(),
            amount:        payment.amount,
            generatedAt:   new Date().toISOString(),
            expiresAt:     expiresAt.toISOString()
        });

        // --- generate base64 image ---
        const imageBase64 = await generateQrBase64(payload);

        // --- persist QR record to DB ---
        const coworkingSpaceId = payment.reservation?.room?.coworkingSpace;

        const qrRecord = await QrCode.create({
            payment:       payment._id,
            coworkingSpace: coworkingSpaceId,
            imageBase64,
            payload,
            expiresAt,
            generatedBy:   req.user.id
        });

        // --- attach QR ref to payment ---
        payment.activeQr = qrRecord._id;
        await payment.save();

        return res.status(200).json({
            success: true,
            data: {
                paymentId:    payment._id,
                qrId:         qrRecord._id,
                qrImage:      imageBase64,
                expiresAt,
                expiresInSec: 15 * 60,
                amount:       payment.amount
            }
        });

    } catch (err) {
        return handleError(err, res);
    }
};


// =====================================================
// US2-2
// @desc    Verify & confirm QR payment
//          Caller passes the raw QR payload string (scanned from image)
//          OR the qrId — controller accepts both.
// @route   PUT /api/v1/payments/:id/confirm-qr
// @access  Private (admin or trusted webhook)
// =====================================================
exports.confirmQrPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.method !== 'qr') {
            return res.status(400).json({ success: false, message: 'Not a QR payment' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot confirm payment with status "${payment.status}"`
            });
        }

        // --- locate the QR record ---
        //     Accept qrId in body OR fall back to payment.activeQr
        const qrLookupId = req.body.qrId || payment.activeQr;

        if (!qrLookupId) {
            return res.status(400).json({
                success: false,
                message: 'No active QR found for this payment. Please regenerate.'
            });
        }

        const qrRecord = await QrCode.findById(qrLookupId);

        if (!qrRecord) {
            return res.status(404).json({ success: false, message: 'QR record not found' });
        }

        // --- verify QR belongs to this payment ---
        if (qrRecord.payment.toString() !== payment._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'QR code does not belong to this payment'
            });
        }

        // --- check not already used ---
        if (qrRecord.isUsed) {
            return res.status(400).json({
                success: false,
                message: 'QR code has already been used'
            });
        }

        // --- check not expired ---
        if (new Date() > qrRecord.expiresAt) {
            return res.status(400).json({
                success: false,
                message: 'QR code has expired. Please regenerate.'
            });
        }

        // --- optional payload verification (if caller sends scanned payload) ---
        if (req.body.payload) {
            if (req.body.payload !== qrRecord.payload) {
                return res.status(400).json({
                    success: false,
                    message: 'QR payload mismatch. Verification failed.'
                });
            }
        }

        // --- atomic update ---
        const transactionId = `TXN-${uuidv4().toUpperCase()}`;

        // mark QR as used
        qrRecord.isUsed = true;
        qrRecord.usedAt = new Date();
        await qrRecord.save();

        // complete payment
        payment.status        = 'completed';
        payment.transactionId = transactionId;
        payment.activeQr      = null;
        await payment.save();
        await markReservationSuccess(payment.reservation);
        await Reservation.findByIdAndUpdate(payment.reservation, { status: 'success' });

        return res.status(200).json({
            success: true,
            data: {
                paymentId:     payment._id,
                transactionId: payment.transactionId,
                status:        payment.status,
                amount:        payment.amount,
                qrId:          qrRecord._id,
                usedAt:        qrRecord.usedAt
            }
        });

    } catch (err) {
        return handleError(err, res);
    }
};


// =====================================================
// US2-2
// @desc    Verify a QR code without confirming payment
//          Frontend/scanner can call this to pre-validate before confirm
// @route   POST /api/v1/payments/verify-qr
// @access  Private (admin or trusted scanner)
// =====================================================
exports.verifyQr = async (req, res) => {
    try {
        const { qrId, payload } = req.body;

        if (!qrId && !payload) {
            return res.status(400).json({
                success: false,
                message: 'Provide qrId or payload to verify'
            });
        }

        // --- find QR record ---
        let qrRecord;

        if (qrId) {
            qrRecord = await QrCode.findById(qrId).populate('payment');
        } else {
            // look up by stored payload string
            qrRecord = await QrCode.findOne({ payload }).populate('payment');
        }

        if (!qrRecord) {
            return res.status(404).json({ success: false, message: 'QR record not found' });
        }

        const now = new Date();
        const expired  = now > qrRecord.expiresAt;
        const secondsLeft = expired ? 0 : Math.floor((qrRecord.expiresAt - now) / 1000);

        if (qrRecord.isUsed) {
            return res.status(400).json({
                success: false,
                message: 'QR code has already been used',
                data: { qrId: qrRecord._id, isUsed: true, usedAt: qrRecord.usedAt }
            });
        }

        if (expired) {
            return res.status(400).json({
                success: false,
                message: 'QR code has expired',
                data: { qrId: qrRecord._id, expired: true, expiresAt: qrRecord.expiresAt }
            });
        }

        // --- payload match check (optional but recommended) ---
        if (payload && payload !== qrRecord.payload) {
            return res.status(400).json({
                success: false,
                message: 'QR payload mismatch'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'QR is valid',
            data: {
                qrId:          qrRecord._id,
                paymentId:     qrRecord.payment._id,
                amount:        qrRecord.payment.amount,
                paymentStatus: qrRecord.payment.status,
                expiresAt:     qrRecord.expiresAt,
                secondsLeft,
                isUsed:        false
            }
        });

    } catch (err) {
        return handleError(err, res);
    }
};


// =====================================================
// US2-2 (helper for frontend countdown)
// @desc    Check if QR is still valid
// @route   GET /api/v1/payments/:id/qr-status
// @access  Private (owner)
// =====================================================
exports.getQrStatus = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .select('activeQr status method user');

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (!payment.activeQr) {
            return res.status(200).json({
                success: true,
                data: {
                    paymentStatus: payment.status,
                    qrExpired:     true,
                    secondsLeft:   0,
                    expiresAt:     null
                }
            });
        }

        const qrRecord = await QrCode.findById(payment.activeQr).select('expiresAt isUsed');
        const now = new Date();
        const expired = !qrRecord || qrRecord.isUsed || now > qrRecord.expiresAt;
        const secondsLeft = expired
            ? 0
            : Math.floor((qrRecord.expiresAt - now) / 1000);

        return res.status(200).json({
            success: true,
            data: {
                paymentStatus: payment.status,
                qrExpired:     expired,
                secondsLeft,
                expiresAt:     qrRecord?.expiresAt ?? null
            }
        });

    } catch (err) {
        return handleError(err, res);
    }
};


// =====================================================
// US2-3
// @desc    Admin confirms cash received
// @route   PUT /api/v1/payments/:id/confirm-cash
// @access  Private (admin only)
// =====================================================
exports.confirmCashPayment = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin only' });
        }

        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.method !== 'cash') {
            return res.status(400).json({ success: false, message: 'Not a cash payment' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot confirm payment with status "${payment.status}"`
            });
        }

        const transactionId = `TXN-${uuidv4().toUpperCase()}`;

        payment.status          = 'completed';
        payment.transactionId   = transactionId;
        payment.cashConfirmedBy = req.user.id;
        payment.cashConfirmedAt = new Date();
        await payment.save();
        await markReservationSuccess(payment.reservation);
        await Reservation.findByIdAndUpdate(payment.reservation, { status: 'success' });

        return res.status(200).json({
            success: true,
            data: {
                paymentId:       payment._id,
                transactionId:   payment.transactionId,
                status:          payment.status,
                cashConfirmedBy: req.user.id,
                cashConfirmedAt: payment.cashConfirmedAt,
                amount:          payment.amount
            }
        });

    } catch (err) {
        return handleError(err, res);
    }
};


// =====================================================
// US2-3 (admin dashboard view)
// @desc    Get all cash payments that are still pending
// @route   GET /api/v1/payments/pending-cash
// @access  Private (admin only)
// =====================================================
exports.getPendingCashPayments = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin only' });
        }

        const payments = await Payment.find({ method: 'cash', status: 'pending' })
            .populate({
                path: 'reservation',
                select: 'status timeSlots',
                populate: { path: 'timeSlots', select: 'startTime endTime' }
            })
            .populate({ path: 'user', select: 'name email telephoneNumber' })
            .sort({ createdAt: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: payments.length,
            data: payments
        });

    } catch (err) {
        return handleError(err, res);
    }
};


// =====================================================
// BONUS: Get single payment (owner or admin)
// @route   GET /api/v1/payments/:id
// @access  Private
// =====================================================
exports.getPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate({ path: 'reservation', select: 'status timeSlots room' })
            .populate({ path: 'user', select: 'name email' })
            .populate({ path: 'activeQr', select: 'expiresAt isUsed usedAt imageBase64' })
            .lean();

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        return res.status(200).json({ success: true, data: payment });

    } catch (err) {
        return handleError(err, res);
    }
};

// GET /payments/user/:id
// fetch all payment records for logged-in user (auth required); sorted by date desc
exports.getPaymentsByUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!req.user || (req.user.id && req.user.id !== userId) || (req.user._id && String(req.user._id) !== String(userId))) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const payments = await Payment.find({ user: userId }).sort({ createdAt: -1 }).lean();

    const decorated = payments.map(p => {
      if (p.status === 'refund_required') {
        return { ...p, uiBadge: { color: 'orange', tooltip: 'Contact Admin' } };
      }
      return p;
    });

    return res.status(200).json({
      success: true,
      count: decorated.length,
      data: decorated
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// =====================================================
// @desc    Update payment method (only when pending)
// @route   PUT /api/v1/payments/:id/method
// @access  Private (owner or admin)
// Business rule: if payment.status === 'completed' -> cannot change (user sees message)
// =====================================================
exports.updatePaymentMethod = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // owner or admin only
        if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Business rules
        if (payment.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Payment already completed. Contact Admin to change.' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Only pending payments can change method' });
        }

        const { method } = req.body;
        if (!method || !['qr', 'cash'].includes(method)) {
            return res.status(400).json({ success: false, message: 'method must be "qr" or "cash"' });
        }

        // update method but keep status as pending
        payment.method = method;

        // if switching away from qr, clear any activeQr reference
        if (method !== 'qr') {
            payment.activeQr = null;
        }

        // if switching away from cash, clear cash confirmation fields (if any)
        if (method !== 'cash') {
            payment.cashConfirmedBy = undefined;
            payment.cashConfirmedAt = undefined;
        }

        await payment.save();

        return res.status(200).json({ success: true, data: payment });
    } catch (err) {
        return handleError(err, res);
    }
};