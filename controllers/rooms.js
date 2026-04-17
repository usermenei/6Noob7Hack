const Room = require('../models/Room');
const TimeSlot = require('../models/TimeSlot');
const Reservation = require('../models/Reservation');
const { generateDailySlots } = require('../utils/generateTimeSlots');
const CoworkingSpace = require('../models/CoworkingSpace');

// =====================================================
// CREATE ROOM
// =====================================================
exports.createRoom = async (req, res) => {
  try {
    const { name, capacity, price, coworkingSpace, picture } = req.body;

    if (!name || !capacity || !price || !coworkingSpace) {
      return res.status(400).json({
        success: false,
        message: "Missing fields"
      });
    }

    // ✅ validate coworking space
    const space = await CoworkingSpace.findById(coworkingSpace);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: "Coworking space not found"
      });
    }

    // ✅ prevent duplicate room name in same space
    const duplicate = await Room.findOne({ name, coworkingSpace });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Room name already exists in this coworking space"
      });
    }

    const room = await Room.create({
  ...req.body,
  picture: picture || null
});

    return res.status(201).json({
      success: true,
      data: room
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// =====================================================
// GET ROOMS
// =====================================================
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ status: 'active' })
      .populate('coworkingSpace', 'name district province');

    return res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// =====================================================
// GET ROOM AVAILABILITY (AUTO SLOT + BOOKING CHECK)
// =====================================================
exports.getRoomAvailability = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Please provide date (YYYY-MM-DD)"
      });
    }

    const rooms = await Room.find({ status: 'active' })
      .populate('coworkingSpace', 'name district province openTime closeTime');

    const result = [];

    for (const room of rooms) {
      const space = room.coworkingSpace;

      // ✅ generate slots (only for viewing, NOT booking)
      const slots = await generateDailySlots(
        room._id,
        date,
        space?.openTime || '08:00',
        space?.closeTime || '20:00'
      );

      // 🔥 get reservations
      const reservations = await Reservation.find({
        room: room._id,
        status: { $in: ['pending', 'success'] }
      });

      const bookedSlotIds = new Set(
        reservations.flatMap(r => r.timeSlots.map(id => id.toString()))
      );

      const slotData = slots.map(slot => {
        const isBooked = bookedSlotIds.has(slot._id.toString());

        const hour = new Date(slot.startTime).getHours();
        let price = room.price;

        if (hour >= 12 && hour <= 17) price *= 1.5;   // peak
        else if (hour >= 18) price *= 1.2;            // evening

        return {
          timeSlotId: slot._id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: isBooked ? 'booked' : 'available',
          price: Math.round(price)
        };
      });

      result.push({
        roomId: room._id,
        roomName: room.name,
        capacity: room.capacity,
        basePrice: room.price,
        coworkingSpace: space,
        slots: slotData
      });
    }

    return res.status(200).json({
      success: true,
      date,
      data: result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// =====================================================
// GET ROOMS BY COWORKING SPACE
// GET /api/v1/coworkingspaces/:coworkingId/rooms
// =====================================================
exports.getRoomsByCoworking = async (req, res) => {
  try {
    console.log("PARAM:", req.params.coworkingId);

    const rooms = await Room.find({
      coworkingSpace: req.params.coworkingId,
      status: 'active'
    });

    return res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================
// GET SINGLE ROOM WITH AVAILABILITY
// GET /api/v1/coworkingspaces/:coworkingId/rooms/:roomId?date=YYYY-MM-DD
// =====================================================
exports.getRoomByCoworking = async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.roomId,
      coworkingSpace: req.params.coworkingId,
      status: 'active'
    }).populate('coworkingSpace', 'name district province openTime closeTime');

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    // If date provided, attach availability (reuse your existing logic)
    if (req.query.date) {
      const space = room.coworkingSpace;
      const slots = await generateDailySlots(
        room._id,
        req.query.date,
        space?.openTime || '08:00',
        space?.closeTime || '20:00'
      );

      const reservations = await Reservation.find({
        room: room._id,
        status: { $in: ['pending', 'success'] }
      });

      const bookedSlotIds = new Set(
        reservations.flatMap(r => r.timeSlots.map(id => id.toString()))
      );

      const slotData = slots.map(slot => {
        const isBooked = bookedSlotIds.has(slot._id.toString());
        const hour = new Date(slot.startTime).getHours();
        let price = room.price;
        if (hour >= 12 && hour <= 17) price *= 1.5;
        else if (hour >= 18) price *= 1.2;

        return {
          timeSlotId: slot._id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: isBooked ? 'booked' : 'available',
          price: Math.round(price)
        };
      });

      return res.status(200).json({
        success: true,
        data: { ...room.toObject(), slots: slotData }
      });
    }

    return res.status(200).json({ success: true, data: room });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================
// UPDATE ROOM
// =====================================================
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // ✅ validate coworking space if changed
    if (req.body.coworkingSpace) {
      const space = await CoworkingSpace.findById(req.body.coworkingSpace);
      if (!space) {
        return res.status(404).json({
          success: false,
          message: "Coworking space not found"
        });
      }
    }

    // ❗ prevent duplicate name
    const duplicate = await Room.findOne({
      name: req.body.name,
      coworkingSpace: req.body.coworkingSpace || room.coworkingSpace,
      _id: { $ne: room._id }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Duplicate room name"
      });
    }
    if (req.body.picture !== undefined) {
  room.picture = req.body.picture;
}
    Object.assign(room, req.body);
    await room.save();

    return res.status(200).json({
      success: true,
      data: room
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// =====================================================
// DELETE ROOM (SOFT DELETE)
// =====================================================
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    const activeReservations = await Reservation.find({
      room: room._id,
      status: { $in: ['pending', 'success'] }
    });

    if (activeReservations.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Room has active reservations"
      });
    }

    room.status = 'deleted';
    await room.save();

    return res.status(200).json({
      success: true,
      message: "Room deleted"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};