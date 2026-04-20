const reservationsController = require('../controllers/reservations');

jest.mock('../models/Reservation', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../models/Room', () => ({ findById: jest.fn() }));
jest.mock('../models/TimeSlot', () => ({ find: jest.fn() }));
jest.mock('../models/User', () => ({ findByIdAndUpdate: jest.fn() }));

const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const TimeSlot = require('../models/TimeSlot');
const User = require('../models/User');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function chainableResolve(value) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
  };
  return chain;
}

function timeslotFind(slots) {
  return { sort: jest.fn().mockResolvedValue(slots) };
}

beforeEach(() => jest.clearAllMocks());

describe('handleError (via getReservations)', () => {
  test('handles duplicate key error (code 11000)', async () => {
    Reservation.find.mockImplementation(() => { throw { code: 11000 }; });
    const res = mockRes();
    await reservationsController.getReservations({ user: { role: 'admin' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Duplicate field value entered.' }));
  });

  test('handles ValidationError', async () => {
    Reservation.find.mockImplementation(() => { throw { name: 'ValidationError', message: 'bad input' }; });
    const res = mockRes();
    await reservationsController.getReservations({ user: { role: 'admin' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'bad input' }));
  });

  test('handles CastError', async () => {
    Reservation.find.mockImplementation(() => { throw { name: 'CastError' }; });
    const res = mockRes();
    await reservationsController.getReservations({ user: { role: 'admin' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid ID format' }));
  });

  test('handles generic server error', async () => {
    Reservation.find.mockImplementation(() => { throw new Error('boom'); });
    const res = mockRes();
    await reservationsController.getReservations({ user: { role: 'admin' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server error' }));
  });
});

describe('getReservations', () => {
  test('admin sees all reservations', async () => {
    const data = [{ id: 1 }, { id: 2 }];
    Reservation.find.mockReturnValue(chainableResolve(data));
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    await reservationsController.getReservations(req, res);
    expect(Reservation.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 2, data }));
  });

  test('non-admin sees only their own reservations', async () => {
    const data = [{ id: 3 }];
    Reservation.find.mockReturnValue(chainableResolve(data));
    const req = { user: { role: 'user', id: 'u1' } };
    const res = mockRes();
    await reservationsController.getReservations(req, res);
    expect(Reservation.find).toHaveBeenCalledWith({ user: 'u1' });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getReservation', () => {
  test('404 when reservation not found', async () => {
    Reservation.findById.mockReturnValue(chainableResolve(null));
    const req = { params: { id: 'r1' }, user: { id: 'u1', role: 'user' } };
    const res = mockRes();
    await reservationsController.getReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reservation not found' }));
  });

  test('403 when not owner and not admin', async () => {
    const reservation = { user: { _id: { toString: () => 'other' } } };
    Reservation.findById.mockReturnValue(chainableResolve(reservation));
    const req = { params: { id: 'r2' }, user: { id: 'u1', role: 'user' } };
    const res = mockRes();
    await reservationsController.getReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not authorized' }));
  });

  test('200 when owner accesses their reservation', async () => {
    const reservation = { user: { _id: { toString: () => 'u1' } } };
    Reservation.findById.mockReturnValue(chainableResolve(reservation));
    const req = { params: { id: 'r3' }, user: { id: 'u1', role: 'user' } };
    const res = mockRes();
    await reservationsController.getReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: reservation }));
  });

  test('200 when admin accesses any reservation', async () => {
    const reservation = { user: { _id: { toString: () => 'someone-else' } } };
    Reservation.findById.mockReturnValue(chainableResolve(reservation));
    const req = { params: { id: 'r4' }, user: { id: 'admin1', role: 'admin' } };
    const res = mockRes();
    await reservationsController.getReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('500 on unexpected error', async () => {
    Reservation.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValue(new Error('db fail')),
    });
    const req = { params: { id: 'r1' }, user: { id: 'u1', role: 'user' } };
    const res = mockRes();
    await reservationsController.getReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('addReservation', () => {
  test('400 when timeSlotIds missing', async () => {
    const req = { body: {}, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'timeSlotIds must be a non-empty array' }));
  });

  test('400 when timeSlotIds is not an array', async () => {
    const req = { body: { timeSlotIds: 'not-array' }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('400 when timeSlotIds is empty array', async () => {
    const req = { body: { timeSlotIds: [] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('404 when some time slots not found', async () => {
    TimeSlot.find.mockReturnValue(timeslotFind([]));
    const req = { body: { timeSlotIds: ['a', 'b'] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Some time slots not found' }));
  });

  test('400 when slots belong to different rooms', async () => {
    const slots = [
      { room: { toString: () => 'r1' }, endTime: '2024-01-01T09:00:00Z' },
      { room: { toString: () => 'r2' }, startTime: '2024-01-01T09:00:00Z' },
    ];
    TimeSlot.find.mockReturnValue(timeslotFind(slots));
    const req = { body: { timeSlotIds: ['1', '2'] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'All slots must belong to same room' }));
  });

  test('400 when slots are not continuous', async () => {
    const slots = [
      { room: { toString: () => 'r1' }, startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T09:00:00Z' },
      { room: { toString: () => 'r1' }, startTime: '2024-01-01T10:00:00Z', endTime: '2024-01-01T11:00:00Z' },
    ];
    TimeSlot.find.mockReturnValue(timeslotFind(slots));
    const req = { body: { timeSlotIds: ['1', '2'] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Time slots must be continuous' }));
  });

  test('400 when one or more slots already booked', async () => {
    const slots = [{ room: { toString: () => 'r1' }, startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T09:00:00Z' }];
    TimeSlot.find.mockReturnValue(timeslotFind(slots));
    Reservation.findOne.mockResolvedValue({ _id: 'existing' });
    const req = { body: { timeSlotIds: ['1'] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'One or more slots already booked' }));
  });

  test('400 when user exceeds 3 active reservations', async () => {
    const slots = [{ room: { toString: () => 'r1' }, startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T09:00:00Z' }];
    TimeSlot.find.mockReturnValue(timeslotFind(slots));
    Reservation.findOne.mockResolvedValue(null);
    Reservation.countDocuments.mockResolvedValue(3);
    const req = { body: { timeSlotIds: ['1'] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Max 3 active reservations' }));
  });

  test('201 on successful reservation creation', async () => {
    const slots = [{ room: { toString: () => 'r1' }, startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T09:00:00Z' }];
    TimeSlot.find.mockReturnValue(timeslotFind(slots));
    Reservation.findOne.mockResolvedValue(null);
    Reservation.countDocuments.mockResolvedValue(0);
    Room.findById.mockResolvedValue({ name: 'Room A', price: 100, capacity: 5 });
    Reservation.create.mockResolvedValue({ _id: 'new-res' });
    const req = { body: { timeSlotIds: ['1'] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('500 on unexpected error', async () => {
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error('db fail')) });
    const req = { body: { timeSlotIds: ['1'] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('updateReservation', () => {
  test('404 when reservation not found', async () => {
    Reservation.findById.mockResolvedValue(null);
    const req = { params: { id: 'x' }, user: { id: 'u1', role: 'user' }, body: {} };
    const res = mockRes();
    await reservationsController.updateReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('403 when not owner and not admin', async () => {
    const reservation = { _id: 'r', user: { toString: () => 'other' }, status: 'pending' };
    Reservation.findById.mockResolvedValue(reservation);
    const req = { params: { id: 'r' }, user: { id: 'u1', role: 'user' }, body: { timeSlotIds: ['1'] } };
    const res = mockRes();
    await reservationsController.updateReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('400 when reservation status is not pending', async () => {
    const reservation = { _id: 'r', user: { toString: () => 'u1' }, status: 'success' };
    Reservation.findById.mockResolvedValue(reservation);
    const req = { params: { id: 'r' }, user: { id: 'u1', role: 'user' }, body: { timeSlotIds: ['1'] } };
    const res = mockRes();
    await reservationsController.updateReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Only pending can update' }));
  });

  test('400 when timeSlotIds missing in body', async () => {
    const reservation = { _id: 'r', user: { toString: () => 'u1' }, status: 'pending' };
    Reservation.findById.mockResolvedValue(reservation);
    const req = { params: { id: 'r' }, user: { id: 'u1', role: 'user' }, body: {} };
    const res = mockRes();
    await reservationsController.updateReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'timeSlotIds required' }));
  });

  test('400 when requested slot already booked', async () => {
    const reservation = { _id: 'r', user: { toString: () => 'u1' }, status: 'pending' };
    Reservation.findById.mockResolvedValue(reservation);
    Reservation.findOne.mockResolvedValue({ _id: 'other-res' });
    const req = { params: { id: 'r' }, user: { id: 'u1', role: 'user' }, body: { timeSlotIds: ['1'] } };
    const res = mockRes();
    await reservationsController.updateReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Slot already booked' }));
  });

  test('200 on successful update by owner', async () => {
    const reservation = { _id: 'r', user: { toString: () => 'u1' }, status: 'pending', save: jest.fn().mockResolvedValue(true) };
    Reservation.findById.mockResolvedValue(reservation);
    Reservation.findOne.mockResolvedValue(null);
    const req = { params: { id: 'r' }, user: { id: 'u1', role: 'user' }, body: { timeSlotIds: ['1', '2'] } };
    const res = mockRes();
    await reservationsController.updateReservation(req, res);
    expect(reservation.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('200 when admin updates any reservation', async () => {
    const reservation = { _id: 'r', user: { toString: () => 'other' }, status: 'pending', save: jest.fn().mockResolvedValue(true) };
    Reservation.findById.mockResolvedValue(reservation);
    Reservation.findOne.mockResolvedValue(null);
    const req = { params: { id: 'r' }, user: { id: 'admin1', role: 'admin' }, body: { timeSlotIds: ['1'] } };
    const res = mockRes();
    await reservationsController.updateReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('500 on unexpected error', async () => {
    Reservation.findById.mockRejectedValue(new Error('db fail'));
    const req = { params: { id: 'r' }, user: { id: 'u1', role: 'user' }, body: {} };
    const res = mockRes();
    await reservationsController.updateReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('deleteReservation', () => {
  test('404 when reservation not found', async () => {
    Reservation.findById.mockResolvedValue(null);
    const req = { params: { id: 'x' }, user: { id: 'u1', role: 'user' } };
    const res = mockRes();
    await reservationsController.deleteReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reservation not found' }));
  });

  test('403 when not owner and not admin', async () => {
    const reservation = { user: { toString: () => 'other' } };
    Reservation.findById.mockResolvedValue(reservation);
    const req = { params: { id: 'r' }, user: { id: 'u1', role: 'user' } };
    const res = mockRes();
    await reservationsController.deleteReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not authorized' }));
  });

  test('200 on successful cancellation by owner', async () => {
    const reservation = { user: { toString: () => 'u1' }, status: 'pending', save: jest.fn().mockResolvedValue(true) };
    Reservation.findById.mockResolvedValue(reservation);
    const req = { params: { id: 'r' }, user: { id: 'u1', role: 'user' } };
    const res = mockRes();
    await reservationsController.deleteReservation(req, res);
    expect(reservation.status).toBe('cancelled');
    expect(reservation.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Reservation cancelled' }));
  });

  test('200 when admin cancels any reservation', async () => {
    const reservation = { user: { toString: () => 'other' }, status: 'pending', save: jest.fn().mockResolvedValue(true) };
    Reservation.findById.mockResolvedValue(reservation);
    const req = { params: { id: 'r' }, user: { id: 'admin1', role: 'admin' } };
    const res = mockRes();
    await reservationsController.deleteReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('500 on unexpected error', async () => {
    Reservation.findById.mockRejectedValue(new Error('db fail'));
    const req = { params: { id: 'r' }, user: { id: 'u1', role: 'user' } };
    const res = mockRes();
    await reservationsController.deleteReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('confirmReservation', () => {
  test('403 when not admin', async () => {
    const req = { params: { id: 'r' }, user: { role: 'user', id: 'u1' } };
    const res = mockRes();
    await reservationsController.confirmReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Admin only' }));
  });

  test('404 when reservation not found', async () => {
    Reservation.findById.mockResolvedValue(null);
    const req = { params: { id: 'r' }, user: { role: 'admin' } };
    const res = mockRes();
    await reservationsController.confirmReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reservation not found' }));
  });

  test('200 on successful confirm', async () => {
    const reservation = { user: 'u1', status: 'pending', save: jest.fn().mockResolvedValue(true) };
    Reservation.findById.mockResolvedValue(reservation);
    User.findByIdAndUpdate.mockResolvedValue({});
    const req = { params: { id: 'r' }, user: { role: 'admin' } };
    const res = mockRes();
    await reservationsController.confirmReservation(req, res);
    expect(reservation.status).toBe('success');
    expect(reservation.save).toHaveBeenCalled();
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { $inc: { numberOfEntries: 1 } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Reservation confirmed' }));
  });

  test('500 on unexpected error', async () => {
    Reservation.findById.mockRejectedValue(new Error('db fail'));
    const req = { params: { id: 'r' }, user: { role: 'admin' } };
    const res = mockRes();
    await reservationsController.confirmReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// Finish the addReservation describe block
describe('addReservation completion', () => {
  test('Line 176: 400 when user has 3 active reservations', async () => {
    const slots = [{ room: { toString: () => 'r1' }, startTime: '2024-01-01T08:00', endTime: '2024-01-01T09:00' }];
    TimeSlot.find.mockReturnValue(timeslotFind(slots));
    Reservation.findOne.mockResolvedValue(null);
    Reservation.countDocuments.mockResolvedValue(3); // The limit

    const req = { body: { timeSlotIds: ['1'] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Max 3 active reservations' }));
  });

  test('201 on successful reservation creation', async () => {
    const slots = [{ room: 'r1', startTime: '2024-01-01T08:00', endTime: '2024-01-01T09:00' }];
    TimeSlot.find.mockReturnValue(timeslotFind(slots));
    Reservation.findOne.mockResolvedValue(null);
    Reservation.countDocuments.mockResolvedValue(0);
    Room.findById.mockResolvedValue({ name: 'Room 1', price: 100, capacity: 10 });
    Reservation.create.mockResolvedValue({ _id: 'new-res' });

    const req = { body: { timeSlotIds: ['ts1'] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('updateReservation, deleteReservation, confirmReservation', () => {
  // Logic for updateReservation success
  test('updateReservation: 200 on success', async () => {
    const resv = { _id: 'r1', user: 'u1', status: 'pending', save: jest.fn() };
    Reservation.findById.mockResolvedValue(resv);
    Reservation.findOne.mockResolvedValue(null); // No conflict

    const req = { params: { id: 'r1' }, body: { timeSlotIds: ['ts2'] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.updateReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // Logic for confirmReservation (Admin only)
  test('confirmReservation: 200 and increments user entries', async () => {
    const resv = { _id: 'r1', user: 'u1', save: jest.fn() };
    Reservation.findById.mockResolvedValue(resv);
    User.findByIdAndUpdate.mockResolvedValue({});

    const req = { params: { id: 'r1' }, user: { role: 'admin' } };
    const res = mockRes();
    await reservationsController.confirmReservation(req, res);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { $inc: { numberOfEntries: 1 } });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('handleError branch coverage', () => {
  test('handles error without code or name (fallback to 500)', async () => {
    // โยน error ที่ไม่มี code 11000 และไม่ใช่ ValidationError/CastError
    Reservation.find.mockImplementation(() => { 
      const err = new Error('Generic');
      delete err.stack; // ทำความสะอาด error
      throw err; 
    });
    const res = mockRes();
    await reservationsController.getReservations({ user: { role: 'admin' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server error' }));
  });
});

describe('addReservation deep branch coverage', () => {
  test('Line 158: 400 when timeSlotIds is not an array', async () => {
    const req = { body: { timeSlotIds: "not-an-array" }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('Line 192: 400 when slots are not continuous (gap check)', async () => {
    const slots = [
      { room: 'r1', startTime: '2024-01-01T08:00', endTime: '2024-01-01T09:00' },
      { room: 'r1', startTime: '2024-01-01T10:00', endTime: '2024-01-01T11:00' } // มีช่องว่าง 1 ชม.
    ];
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(slots) });
    const req = { body: { timeSlotIds: ['ts1', 'ts2'] }, user: { id: 'u1' } };
    const res = mockRes();
    await reservationsController.addReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Time slots must be continuous' }));
  });
}); 

describe('updateReservation admin branch', () => {
  test('Line 245: Admin can update even if not owner', async () => {
    const reservation = { 
      _id: 'r1', 
      user: 'other-user-id', // ไม่ใช่ u1
      status: 'pending', 
      save: jest.fn().mockResolvedValue(true) 
    };
    Reservation.findById.mockResolvedValue(reservation);
    Reservation.findOne.mockResolvedValue(null); // ไม่มีคิวซ้อน

    const req = { 
      params: { id: 'r1' }, 
      user: { id: 'admin-id', role: 'admin' }, 
      body: { timeSlotIds: ['tsnew'] } 
    };
    const res = mockRes();
    await reservationsController.updateReservation(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(reservation.save).toHaveBeenCalled();
  });
});

describe('confirmReservation error branches', () => {
  test('Line 345: 403 when user is NOT admin', async () => {
    const req = { user: { role: 'user' }, params: { id: 'r1' } };
    const res = mockRes();
    await reservationsController.confirmReservation(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Admin only' }));
  });
});

test('Line 192-200: should return 400 if time slots are not continuous', async () => {
  // จำลอง 2 slots ที่เวลาไม่ต่อกัน (09:00-10:00 และ 11:00-12:00)
  const mockSlots = [
    { 
      _id: 'slot1', 
      room: 'room1', 
      startTime: '2026-01-01T09:00:00.000Z', 
      endTime: '2026-01-01T10:00:00.000Z' 
    },
    { 
      _id: 'slot2', 
      room: 'room1', 
      startTime: '2026-01-01T11:00:00.000Z', // หายไป 1 ชม. จาก slot แรก
      endTime: '2026-01-01T12:00:00.000Z' 
    }
  ];

  // Mock ให้คืนค่า slots ที่เวลาโดดข้ามกัน
  TimeSlot.find.mockReturnValue({
    sort: jest.fn().mockResolvedValue(mockSlots)
  });

  const req = {
    body: { timeSlotIds: ['slot1', 'slot2'] },
    user: { id: 'u1' }
  };
  const res = mockRes();

  await reservationsController.addReservation(req, res);

  // ตรวจสอบว่าเข้าเงื่อนไข end !== next
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      message: "Time slots must be continuous"
    })
  );
});

test('addReservation - Success when time slots are perfectly continuous (end === next)', async () => {
    // 1. เตรียม Mock Slots ที่เวลาต่อกันพอดี
    const mockSlots = [
        {
            _id: 'slot1',
            room: { toString: () => 'room123' },
            startTime: '2026-01-01T10:00:00.000Z',
            endTime: '2026-01-01T11:00:00.000Z' // สิ้นสุด 11:00
        },
        {
            _id: 'slot2',
            room: { toString: () => 'room123' },
            startTime: '2026-01-01T11:00:00.000Z', // เริ่มต้น 11:00 พอดี (end === next)
            endTime: '2026-01-01T12:00:00.000Z'
        }
    ];

    // 2. Setup Mocks
    TimeSlot.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockSlots)
    });
    
    // Mock ส่วนอื่นๆ ให้ผ่านฉลุย
    Reservation.findOne.mockResolvedValue(null); // ยังไม่มีใครจอง
    Reservation.countDocuments.mockResolvedValue(0); // ยังจองไม่เกิน 3 ครั้ง
    Room.findById.mockResolvedValue({ name: 'Meeting Room A', price: 500, capacity: 10 });
    Reservation.create.mockResolvedValue({ _id: 'new_res_id', status: 'pending' });

    const req = {
        body: { timeSlotIds: ['slot1', 'slot2'] },
        user: { id: 'user1', role: 'user' }
    };
    const res = mockRes();

    // 3. Execute
    await reservationsController.addReservation(req, res);

    // 4. Verification
    // ตรวจสอบว่า status ไม่ใช่ 400 (แปลว่าผ่าน loop continuous check มาได้)
    expect(res.status).toHaveBeenCalledWith(201); 
    expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
            success: true
        })
    );
});

describe('permanentlyDeleteReservation', () => {
    test('200 Success: should delete reservation if user is the owner', async () => {
        const mockResv = {
            user: { toString: () => 'user123' },
            deleteOne: jest.fn().mockResolvedValue(true)
        };
        Reservation.findById.mockResolvedValue(mockResv);

        const req = { 
            params: { id: 'res1' }, 
            user: { id: 'user123', role: 'user' } 
        };
        const res = mockRes();

        await reservationsController.permanentlyDeleteReservation(req, res);

        expect(mockResv.deleteOne).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Reservation permanently deleted"
        }));
    });

    test('200 Success: should delete if requester is admin (even if not owner)', async () => {
        const mockResv = {
            user: { toString: () => 'other_user' },
            deleteOne: jest.fn().mockResolvedValue(true)
        };
        Reservation.findById.mockResolvedValue(mockResv);

        const req = { 
            params: { id: 'res1' }, 
            user: { id: 'admin123', role: 'admin' } 
        };
        const res = mockRes();

        await reservationsController.permanentlyDeleteReservation(req, res);

        expect(mockResv.deleteOne).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('404 Not Found: should return 404 if reservation does not exist', async () => {
        Reservation.findById.mockResolvedValue(null);

        const req = { params: { id: 'invalid_id' }, user: {} };
        const res = mockRes();

        await reservationsController.permanentlyDeleteReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Reservation not found"
        }));
    });

    test('403 Forbidden: should return 403 if user is not owner and not admin', async () => {
        const mockResv = {
            user: { toString: () => 'owner_id' }
        };
        Reservation.findById.mockResolvedValue(mockResv);

        const req = { 
            params: { id: 'res1' }, 
            user: { id: 'attacker_id', role: 'user' } 
        };
        const res = mockRes();

        await reservationsController.permanentlyDeleteReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Not authorized"
        }));
    });

    test('500 Error: should trigger handleError on database failure', async () => {
        Reservation.findById.mockImplementation(() => {
            throw new Error('DB connection lost');
        });

        const req = { params: { id: 'res1' }, user: {} };
        const res = mockRes();

        await reservationsController.permanentlyDeleteReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(500); // มาจาก handleError
    });
});