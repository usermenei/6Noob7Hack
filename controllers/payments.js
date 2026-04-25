// controllers/payments.js

const Payment     = require('../models/Payment');
const Reservation = require('../models/Reservation');
const Room        = require('../models/Room');
const { randomUUID } = require('crypto');
const QrCode      = require('../models/QrCode');
const multer      = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format Not Supported'), false);
        }
    }
});
exports.uploadQrMiddleware = upload.single('image');

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
// US2-1
// @desc    Create payment for a reservation
// @route   POST /api/v1/payments
// @access  Private (user)
// =====================================================
exports.createPayment = async (req, res) => {
    try {
        const { reservationId, method, amount } = req.body;

        if (!reservationId || !method || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: 'reservationId, method, and amount are required'
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

        const payment = await Payment.create({
            reservation: reservationId,
            user: req.user.id,
            amount: amount, // 👈 ใช้ตัวนี้แทน
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

        const transactionId = `TXN-${randomUUID().toUpperCase()}`;

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
// @desc    User confirms QR payment with QrCode
// @route   PUT /api/v1/payments/:id/confirm-qr
// @access  Private (user or admin)
// =====================================================
exports.confirmQrPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.method !== 'qr') {
            return res.status(400).json({ success: false, message: 'This is not a QR payment' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot confirm payment with status "${payment.status}"`
            });
        }

        if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const reservation = await Reservation.findById(payment.reservation)
            .populate({ path: 'room', select: 'coworkingSpace' });

        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservation not found' });
        }

        const coworkingSpaceId = reservation.room.coworkingSpace;

        const adminQr = await QrCode.findOne({
            coworkingSpace: coworkingSpaceId,
            isActive: true
        });

        if (!adminQr) {
            return res.status(404).json({
                success: false,
                message: 'No active QR code found for this coworking space'
            });
        }

        const transactionId = `TXN-${randomUUID().toUpperCase()}`;
        payment.status = 'completed';
        payment.transactionId = transactionId;
        payment.adminQrCode = adminQr._id; 
        await payment.save();
        await markReservationSuccess(payment.reservation);

        return res.status(200).json({
            success: true,
            data: {
                paymentId:     payment._id,
                transactionId: payment.transactionId,
                status:        payment.status,
                amount:        payment.amount
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

        const transactionId = `TXN-${randomUUID().toUpperCase()}`;

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
            .populate({ path: 'adminQrCode', select: 'coworkingSpace isActive' })
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
// =====================================================
exports.updatePaymentMethod = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

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

        payment.method = method;

        if (method !== 'qr') {
            payment.adminQrCode = null;
        }

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

// =====================================================
// US2-6
// @desc    User cancels their own payment/reservation
// @route   PUT /api/v1/payments/:id/cancel
// @access  Private (user)
// =====================================================
exports.userCancelPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // เฉพาะเจ้าของเท่านั้น
        if (payment.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // เช็คว่าเวลาจองผ่านไปแล้วหรือยัง
        const reservation = await Reservation.findById(payment.reservation)
            .populate({ path: 'timeSlots', select: 'startTime' });

        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservation not found' });
        }

        const now = new Date();
        const earliest = reservation.timeSlots.reduce((min, slot) =>
            new Date(slot.startTime) < min ? new Date(slot.startTime) : min,
            new Date(reservation.timeSlots[0].startTime)
        );

        // Given reservation time has passed → prevent cancellation
        if (now >= earliest) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel after reservation time has passed'
            });
        }

        const oldStatus = payment.status;

        if (oldStatus === 'pending') {
            // Given unpaid → both become "cancelled"
            payment.status = 'cancelled';
            reservation.status = 'cancelled';

        } else if (oldStatus === 'completed') {
            // Given paid → payment becomes "refund_required"
            payment.status = 'refund_required';
            reservation.status = 'cancelled';
            // TODO: notify admin (email/notification)

        } else {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel payment with status "${oldStatus}"`
            });
        }

        await payment.save();
        await reservation.save();

        return res.status(200).json({
            success: true,
            data: {
                paymentId:         payment._id,
                paymentStatus:     payment.status,
                reservationStatus: reservation.status
            }
        });

    } catch (err) {
        return handleError(err, res);
    }
};

// =====================================================
// @desc    Admin upload QR code image
// @route   POST /api/v1/payments/admin/qr-code
// @access  Private (admin only)
// =====================================================
exports.uploadQrCode = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { spaceId } = req.body;
        if (!spaceId) {
            return res.status(400).json({ success: false, message: 'spaceId is required' });
        }

        const imageData = req.file.buffer.toString('base64');

        // ✅ upsert: update existing doc or create new one — avoids duplicate key error
        const qrDoc = await QrCode.findOneAndUpdate(
            { coworkingSpace: spaceId },
            {
                $set: {
                    imageData,
                    mimeType  : req.file.mimetype,
                    isActive  : true,
                    uploadedBy: req.user.id,
                    updatedAt : new Date(),
                }
            },
            {
                upsert             : true,
                new                : true,
                setDefaultsOnInsert: true,
            }
        );

        return res.status(200).json({
            success   : true,
            message   : 'QR Code updated successfully',
            uploadedAt: qrDoc.updatedAt || qrDoc.createdAt,
        });

    } catch (err) {
        if (err.message === 'Format Not Supported') {
            return res.status(400).json({ success: false, message: 'Format Not Supported. Use JPG, PNG, or WEBP.' });
        }
        return handleError(err, res);
    }
};
// =====================================================
// @desc    Get active admin QR code image (for user payment page)
// @route   GET /api/v1/payments/:paymentId/qr-code
// @access  Private (user & admin)
// =====================================================
exports.getQrCode = async (req, res) => {
    try {
        const paymentId = req.params.id;

        // 1) หา payment
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // 2) ตรวจสิทธิ์ (เจ้าของ หรือ admin)
        if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // 3) ต้องเป็น QR method
        if (payment.method !== 'qr') {
            return res.status(400).json({
                success: false,
                message: 'This payment is not QR method'
            });
        }

        // 4) ต้องยังเป็น pending เท่านั้น
        if (payment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'QR code is only available for pending payments'
            });
        }

        // 5) หา reservation → room → coworkingSpace
        const reservation = await Reservation.findById(payment.reservation)
            .populate({
                path: 'room',
                select: 'coworkingSpace'
            });

        if (!reservation || !reservation.room) {
            return res.status(404).json({
                success: false,
                message: 'Reservation or room not found'
            });
        }

        const coworkingSpaceId = reservation.room.coworkingSpace;

        // 6) ดึง QR ของ space (admin upload)
        const qrDoc = await QrCode.findOne({
            coworkingSpace: coworkingSpaceId,
            isActive: true
        });

        if (!qrDoc) {
            return res.status(404).json({
                success: false,
                message: 'No active QR code found for this co-working space'
            });
        }

        // 7) แปลงเป็น data URL
        const dataUrl = `data:${qrDoc.mimeType};base64,${qrDoc.imageData}`;

        // 8) ส่งกลับ
        return res.status(200).json({
            success: true,
            data: {
                paymentId: payment._id,
                amount: payment.amount,
                qrCode: dataUrl
            }
        });

    } catch (err) {
        return handleError(err, res);
    }
};

// =====================================================
// @desc    Get active admin QR code metadata (for admin dashboard)
// @route   GET /api/v1/payments/admin/qr-code/:spaceId
// @access  Private (admin only)
// =====================================================
exports.getQrCodeBySpace = async (req, res) => {
    try {
        const { spaceId } = req.params;

        if (!spaceId) {
            return res.status(400).json({
                success: false,
                message: 'spaceId is required'
            });
        }

        // 1) หา QR ของ space นี้
        const qrDoc = await QrCode.findOne({
            coworkingSpace: spaceId,
            isActive: true
        }).populate('uploadedBy', 'name email');

        if (!qrDoc) {
            return res.status(404).json({
                success: false,
                message: 'No active QR code found for this co-working space'
            });
        }

        // 2) แปลงเป็น data URL
        const dataUrl = `data:${qrDoc.mimeType};base64,${qrDoc.imageData}`;

        // 3) response
        return res.status(200).json({
            success: true,
            data: {
                spaceId: spaceId,
                qrCode: dataUrl,
                uploadedBy: qrDoc.uploadedBy?.name,
                uploadedAt: qrDoc.createdAt
            }
        });

    } catch (err) {
        return handleError(err, res);
    }
};

exports.adminUpdatePaymentMethod = async (req, res) => {
    try {
        const { method } = req.body;

        if (!method) {
            return res.status(400).json({ success: false, message: 'method is required' });
        }

        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // block if already completed
        if (payment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot change method on a completed payment'
            });
        }

        const oldMethod = payment.method;
        payment.method = method;

        payment.auditLog.push({
            changedBy: req.user.id,
            action   : 'method_change',
            oldMethod,
            newMethod: method,
            oldStatus: payment.status,
            newStatus: payment.status,
            timestamp: new Date()
        });

        await payment.save();

        return res.status(200).json({ success: true, data: payment });

    } catch (err) {
        return handleError(err, res);
    }
};

exports.adminCancelPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        const oldStatus = payment.status;
        let newPaymentStatus;

        if (payment.status === 'pending' || payment.status === 'failed') {
            newPaymentStatus = 'cancelled';

        } else if (payment.status === 'completed') {
            newPaymentStatus = 'refund_required';

        } else {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel payment with status: ${payment.status}`
            });
        }

        payment.status = newPaymentStatus;

        payment.auditLog.push({
            changedBy: req.user.id,
            action   : 'cancel',
            oldStatus,
            newStatus: newPaymentStatus,
            timestamp: new Date()
        });

        await payment.save();

        // update reservation → cancelled + release time slot
        const reservation = await Reservation.findById(payment.reservation);
        if (reservation) {
            reservation.status = 'cancelled';
            await reservation.save();
        }

        return res.status(200).json({
            success: true,
            data: {
                payment,
                reservationStatus: 'Cancelled'
            }
        });

    } catch (err) {
        return handleError(err, res);
    }
};

// =====================================================
// @desc    Get payment by reservationId
// @route   GET /api/v1/payments/reservation/:reservationId
// @access  Private (owner or admin)
// =====================================================
exports.getPaymentByReservation = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      reservation: req.params.reservationId,
      status: { $in: ['pending', 'completed'] }
    }).lean();

    if (!payment) {
      return res.status(404).json({ success: false, message: 'No payment found for this reservation' });
    }

    if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    return res.status(200).json({ success: true, data: payment });
  } catch (err) {
    return handleError(err, res);
  }
};