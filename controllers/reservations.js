const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const TimeSlot = require('../models/TimeSlot');
const User = require('../models/User');
const Payment = require('../models/Payment');

// =====================================================
// Helper: Handle Common Errors
// =====================================================
const handleError = (err, res) => {
    console.error(err);

    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: "Duplicate field value entered."
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: "Invalid ID format"
        });
    }

    return res.status(500).json({
        success: false,
        message: "Server error"
    });
};
// =====================================================
// @desc    Get all reservations
// =====================================================
exports.getReservations = async (req, res) => {
  try {
    let filter = {};

    // ✅ Only admin sees all
    if (req.user.role !== "admin") {
      filter.user = req.user.id;
    }

    const reservations = await Reservation.find(filter)
      .populate({
        path: "room",
        select: "name capacity price coworkingSpace",
        populate: {
          path: "coworkingSpace",
          select: "name district province",
        },
      })
      .populate({
        path: "timeSlots",
        select: "startTime endTime",
        options: { sort: { startTime: 1 } }, // ✅ always sorted
      })
      .populate({
        path: "user",
        select: "name email",
      })
      .sort({ createdAt: -1 })
      .lean(); // ✅ important for clean JSON

    res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

// =====================================================
// @desc    Get single reservation
// =====================================================
exports.getReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate({
        path: "room",
        select: "name capacity price coworkingSpace",
        populate: {
          path: "coworkingSpace",
          select: "name district province",
        },
      })
      .populate({
        path: "timeSlots",
        select: "startTime endTime",
        options: { sort: { startTime: 1 } },
      })
      .populate({
        path: "user",
        select: "name email",
      })
      .lean();

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    // ✅ Safe auth check (after lean)
    if (
      reservation.user._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.status(200).json({
      success: true,
      data: reservation,
    });
  } catch (err) {
    return handleError(err, res);
  }
};

// =====================================================
// @desc    Add reservation (MULTI-SLOT)
// =====================================================
exports.addReservation = async (req, res) => {
    try {
        const { timeSlotIds } = req.body;

        // ✅ validation
        if (!timeSlotIds || !Array.isArray(timeSlotIds) || timeSlotIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "timeSlotIds must be a non-empty array"
            });
        }

        // ✅ get slots
        const slots = await TimeSlot.find({
            _id: { $in: timeSlotIds }
        }).sort({ startTime: 1 });

        if (slots.length !== timeSlotIds.length) {
            return res.status(404).json({
                success: false,
                message: "Some time slots not found"
            });
        }

        const roomId = slots[0].room;

        // ✅ same room check
        const sameRoom = slots.every(s => s.room.toString() === roomId.toString());
        if (!sameRoom) {
            return res.status(400).json({
                success: false,
                message: "All slots must belong to same room"
            });
        }

        // 🔥 continuous check
        for (let i = 0; i < slots.length - 1; i++) {
            const end = new Date(slots[i].endTime).getTime();
            const next = new Date(slots[i + 1].startTime).getTime();

            if (end !== next) {
                return res.status(400).json({
                    success: false,
                    message: "Time slots must be continuous"
                });
            }
        }

        // 🔥 check if any slot already booked
        const existing = await Reservation.findOne({
            timeSlots: { $in: timeSlotIds },
            status: { $in: ['pending', 'success'] }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "One or more slots already booked"
            });
        }

        // 🔥 limit 3 reservations
        const count = await Reservation.countDocuments({
            user: req.user.id,
            status: { $in: ['pending', 'success'] }
        });

        if (count >= 3) {
            return res.status(400).json({
                success: false,
                message: "Max 3 active reservations"
            });
        }

        // ✅ get room
        const roomData = await Room.findById(roomId);

        // ✅ create reservation
        const reservation = await Reservation.create({
            user: req.user.id,
            room: roomId,
            timeSlots: timeSlotIds,
            status: 'pending',
            roomSnapshot: {
                name: roomData.name,
                price: roomData.price,
                capacity: roomData.capacity
            }
        });

        res.status(201).json({
            success: true,
            data: reservation
        });

    } catch (err) {
        return handleError(err, res);
    }
};

// =====================================================
// @desc    Update reservation (MULTI-SLOT)
// =====================================================
exports.updateReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false });
        }

        if (
            reservation.user.toString() !== req.user.id &&
            req.user.role !== 'admin'
        ) {
            return res.status(403).json({ success: false });
        }

        if (reservation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: "Only pending can update"
            });
        }

        const { timeSlotIds } = req.body;

        if (!timeSlotIds || timeSlotIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "timeSlotIds required"
            });
        }

        // 🔥 check booked
        const existing = await Reservation.findOne({
            _id: { $ne: reservation._id },
            timeSlots: { $in: timeSlotIds },
            status: { $in: ['pending', 'success'] }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Slot already booked"
            });
        }

        reservation.timeSlots = timeSlotIds;
        await reservation.save();

        res.status(200).json({
            success: true,
            data: reservation
        });

    } catch (err) {
        return handleError(err, res);
    }
};

// =====================================================
// @desc    Cancel reservation
// =====================================================
exports.deleteReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found"
            });
        }

    if (
      reservation.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    // Load time slots to determine check-in time
    const slots = await TimeSlot.find({ _id: { $in: reservation.timeSlots } }).sort({ startTime: 1 });
    const firstStart = slots.length ? new Date(slots[0].startTime) : null;

    // Block cancellation if check-in time has passed
    if (firstStart && new Date() >= firstStart) {
      return res.status(400).json({ success: false, message: 'Cannot cancel reservation after check-in time has passed' });
    }

    // Check payment associated with this reservation
    const payment = await Payment.findOne({ reservation: reservation._id });

    if (payment && payment.status === 'completed') {
      // Paid -> mark reservation cancelled and payment as refund_required, notify admin
      reservation.status = 'cancelled';
      await reservation.save();

      payment.status = 'refund_required';
      await payment.save();

      // Placeholder for notifying admin (could be email/queue)
      console.log(`ADMIN NOTIFY: Reservation ${reservation._id} cancelled and payment ${payment._id} requires refund.`);

      // After cancellation slots are effectively released because reservation is no longer pending/success
      return res.status(200).json({
        success: true,
        message: 'Reservation cancelled. Payment marked as refund_required and admin notified.'
      });
    }

    // Unpaid or non-completed payment: cancel both reservation and pending payment (if any)
    reservation.status = 'cancelled';
    await reservation.save();

    if (payment && payment.status === 'pending') {
      payment.status = 'cancelled';
      await payment.save();
    }

    // Slots are released implicitly by changing reservation status
    // Active reservation count is derived from Reservation collection (status pending/success) so no extra user field to decrement

    return res.status(200).json({
      success: true,
      message: 'Reservation cancelled'
    });

    } catch (err) {
        return handleError(err, res);
    }
};

// =====================================================
// @desc    Admin confirm reservation
// =====================================================
exports.confirmReservation = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Admin only"
            });
        }

        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found"
            });
        }

        reservation.status = 'success';
        await reservation.save();

        await User.findByIdAndUpdate(reservation.user, {
            $inc: { numberOfEntries: 1 }
        });

        res.status(200).json({
            success: true,
            message: "Reservation confirmed",
            data: reservation
        });

    } catch (err) {
        return handleError(err, res);
    }
};

// =====================================================
// @desc    PERMANENT DELETE reservation
// =====================================================
exports.permanentlyDeleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    if (
      reservation.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await reservation.deleteOne();

    res.status(200).json({
      success: true,
      message: "Reservation permanently deleted",
    });
  } catch (err) {
    return handleError(err, res);
  }
};