const {
  createRoom,
  getRooms,
  getRoomAvailability,
  getRoomsByCoworking,
  getRoomByCoworking,
  updateRoom,
  deleteRoom,
} = require('../controllers/rooms');

jest.mock('../models/Room', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../models/CoworkingSpace', () => ({
  findById: jest.fn(),
}));
jest.mock('../models/Reservation', () => ({
  find: jest.fn(),
}));
jest.mock('../models/TimeSlot', () => ({}));
jest.mock('../utils/generateTimeSlots', () => ({
  generateDailySlots: jest.fn(),
}));

const Room = require('../models/Room');
const CoworkingSpace = require('../models/CoworkingSpace');
const Reservation = require('../models/Reservation');
const { generateDailySlots } = require('../utils/generateTimeSlots');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// CREATE ROOM
// ─────────────────────────────────────────────
describe('createRoom', () => {
  test('400 when missing required fields', async () => {
    const req = { body: { name: 'A', capacity: 5 } }; // missing price, coworkingSpace
    const res = mockRes();
    await createRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Missing fields' }));
  });

  test('404 when coworking space not found', async () => {
    CoworkingSpace.findById.mockResolvedValue(null);
    const req = { body: { name: 'A', capacity: 5, price: 100, coworkingSpace: 'space-1' } };
    const res = mockRes();
    await createRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Coworking space not found' }));
  });

  test('400 when duplicate room name in same space', async () => {
    CoworkingSpace.findById.mockResolvedValue({ _id: 'space-1' });
    Room.findOne.mockResolvedValue({ _id: 'existing-room' });
    const req = { body: { name: 'A', capacity: 5, price: 100, coworkingSpace: 'space-1' } };
    const res = mockRes();
    await createRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Room name already exists in this coworking space' }));
  });

  test('201 when room created successfully (with picture)', async () => {
    CoworkingSpace.findById.mockResolvedValue({ _id: 'space-1' });
    Room.findOne.mockResolvedValue(null);
    const newRoom = { _id: 'room-1', name: 'A', picture: 'pic.jpg' };
    Room.create.mockResolvedValue(newRoom);
    const req = { body: { name: 'A', capacity: 5, price: 100, coworkingSpace: 'space-1', picture: 'pic.jpg' } };
    const res = mockRes();
    await createRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: newRoom }));
  });

  test('201 when room created without picture (defaults to null)', async () => {
    CoworkingSpace.findById.mockResolvedValue({ _id: 'space-1' });
    Room.findOne.mockResolvedValue(null);
    Room.create.mockResolvedValue({ _id: 'room-2', picture: null });
    const req = { body: { name: 'B', capacity: 3, price: 50, coworkingSpace: 'space-1' } };
    const res = mockRes();
    await createRoom(req, res);
    expect(Room.create).toHaveBeenCalledWith(expect.objectContaining({ picture: null }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('500 on unexpected error', async () => {
    CoworkingSpace.findById.mockRejectedValue(new Error('DB error'));
    const req = { body: { name: 'A', capacity: 5, price: 100, coworkingSpace: 'space-1' } };
    const res = mockRes();
    await createRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// GET ROOMS
// ─────────────────────────────────────────────
describe('getRooms', () => {
  test('200 with list of active rooms', async () => {
    const rooms = [{ _id: 'r1' }, { _id: 'r2' }];
    Room.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(rooms) });
    const req = {};
    const res = mockRes();
    await getRooms(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 2, data: rooms }));
  });

  test('500 on error', async () => {
    Room.find.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('fail')) });
    const res = mockRes();
    await getRooms({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// GET ROOM AVAILABILITY
// ─────────────────────────────────────────────
describe('getRoomAvailability', () => {
  test('400 when date not provided', async () => {
    const req = { query: {} };
    const res = mockRes();
    await getRoomAvailability(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Please provide date (YYYY-MM-DD)' }));
  });

  test('200 with slot availability (booked + available, with price tiers)', async () => {
    const slotMorning = { _id: 'slot-1', startTime: new Date('2024-01-01T08:00:00'), endTime: new Date('2024-01-01T09:00:00') };
    const slotPeak    = { _id: 'slot-2', startTime: new Date('2024-01-01T13:00:00'), endTime: new Date('2024-01-01T14:00:00') };
    const slotEvening = { _id: 'slot-3', startTime: new Date('2024-01-01T19:00:00'), endTime: new Date('2024-01-01T20:00:00') };

    const fakeRoom = {
      _id: 'room-1',
      name: 'Room A',
      capacity: 5,
      price: 100,
      coworkingSpace: { _id: 'space-1', openTime: '08:00', closeTime: '20:00' },
    };

    Room.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([fakeRoom]),
    });

    generateDailySlots.mockResolvedValue([slotMorning, slotPeak, slotEvening]);

    // slot-2 is booked
    Reservation.find.mockResolvedValue([{ timeSlots: ['slot-2'] }]);

    const req = { query: { date: '2024-01-01' } };
    const res = mockRes();
    await getRoomAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    const slots = payload.data[0].slots;
    expect(slots[0].status).toBe('available');
    expect(slots[0].price).toBe(100);        // normal price
    expect(slots[1].status).toBe('booked');
    expect(slots[1].price).toBe(150);        // peak 1.5x
    expect(slots[2].price).toBe(120);        // evening 1.2x
  });

  test('200 with room where coworkingSpace is null (uses defaults)', async () => {
    const fakeRoom = { _id: 'room-2', name: 'Room B', capacity: 3, price: 80, coworkingSpace: null };
    Room.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([fakeRoom]) });
    generateDailySlots.mockResolvedValue([]);
    Reservation.find.mockResolvedValue([]);
    const req = { query: { date: '2024-01-01' } };
    const res = mockRes();
    await getRoomAvailability(req, res);
    expect(generateDailySlots).toHaveBeenCalledWith('room-2', '2024-01-01', '08:00', '20:00');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('500 on error', async () => {
    Room.find.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('fail')) });
    const req = { query: { date: '2024-01-01' } };
    const res = mockRes();
    await getRoomAvailability(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// GET ROOMS BY COWORKING
// ─────────────────────────────────────────────
describe('getRoomsByCoworking', () => {
  test('200 with rooms for given coworking space', async () => {
    const rooms = [{ _id: 'r1' }];
    Room.find.mockResolvedValue(rooms);
    const req = { params: { coworkingId: 'space-1' } };
    const res = mockRes();
    await getRoomsByCoworking(req, res);
    expect(Room.find).toHaveBeenCalledWith({ coworkingSpace: 'space-1', status: 'active' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 1, data: rooms }));
  });

  test('500 on error', async () => {
    Room.find.mockRejectedValue(new Error('fail'));
    const req = { params: { coworkingId: 'space-1' } };
    const res = mockRes();
    await getRoomsByCoworking(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// GET ROOM BY COWORKING (single room)
// ─────────────────────────────────────────────
describe('getRoomByCoworking', () => {
  test('404 when room not found', async () => {
    Room.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const req = { params: { roomId: 'r1', coworkingId: 's1' }, query: {} };
    const res = mockRes();
    await getRoomByCoworking(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('200 without date (returns room only)', async () => {
    const fakeRoom = { _id: 'r1', name: 'Room A' };
    Room.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeRoom) });
    const req = { params: { roomId: 'r1', coworkingId: 's1' }, query: {} };
    const res = mockRes();
    await getRoomByCoworking(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: fakeRoom }));
  });

  test('200 with date (returns room + slot data, all price tiers)', async () => {
    const slotMorning = { _id: 'slot-1', startTime: new Date('2024-01-01T09:00:00'), endTime: new Date('2024-01-01T10:00:00') };
    const slotPeak    = { _id: 'slot-2', startTime: new Date('2024-01-01T14:00:00'), endTime: new Date('2024-01-01T15:00:00') };
    const slotEvening = { _id: 'slot-3', startTime: new Date('2024-01-01T18:00:00'), endTime: new Date('2024-01-01T19:00:00') };

    const fakeRoom = {
      _id: 'r1',
      price: 100,
      coworkingSpace: { openTime: '08:00', closeTime: '20:00' },
      toObject: () => ({ _id: 'r1', price: 100 }),
    };
    Room.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeRoom) });
    generateDailySlots.mockResolvedValue([slotMorning, slotPeak, slotEvening]);
    // slot-2 is booked
    Reservation.find.mockResolvedValue([{ timeSlots: ['slot-2'] }]);

    const req = { params: { roomId: 'r1', coworkingId: 's1' }, query: { date: '2024-01-01' } };
    const res = mockRes();
    await getRoomByCoworking(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    const slots = payload.data.slots;
    expect(slots[0].status).toBe('available');
    expect(slots[0].price).toBe(100);
    expect(slots[1].status).toBe('booked');
    expect(slots[1].price).toBe(150);  // peak
    expect(slots[2].price).toBe(120);  // evening
  });

  test('200 with date and coworkingSpace null (uses defaults)', async () => {
    const fakeRoom = {
      _id: 'r1',
      price: 100,
      coworkingSpace: null,
      toObject: () => ({ _id: 'r1' }),
    };
    Room.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeRoom) });
    generateDailySlots.mockResolvedValue([]);
    Reservation.find.mockResolvedValue([]);
    const req = { params: { roomId: 'r1', coworkingId: 's1' }, query: { date: '2024-01-01' } };
    const res = mockRes();
    await getRoomByCoworking(req, res);
    expect(generateDailySlots).toHaveBeenCalledWith('r1', '2024-01-01', '08:00', '20:00');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('500 on error', async () => {
    Room.findOne.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('fail')) });
    const req = { params: { roomId: 'r1', coworkingId: 's1' }, query: {} };
    const res = mockRes();
    await getRoomByCoworking(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// UPDATE ROOM
// ─────────────────────────────────────────────
describe('updateRoom', () => {
  test('404 when room not found', async () => {
    Room.findById.mockResolvedValue(null);
    const req = { params: { id: 'r1' }, body: {} };
    const res = mockRes();
    await updateRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Room not found' }));
  });

  test('404 when coworking space not found', async () => {
    Room.findById.mockResolvedValue({ _id: 'r1', coworkingSpace: 'space-1' });
    CoworkingSpace.findById.mockResolvedValue(null);
    const req = { params: { id: 'r1' }, body: { coworkingSpace: 'new-space' } };
    const res = mockRes();
    await updateRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Coworking space not found' }));
  });

  test('400 when duplicate room name', async () => {
    Room.findById.mockResolvedValue({ _id: 'r1', coworkingSpace: 'space-1' });
    CoworkingSpace.findById.mockResolvedValue({ _id: 'space-1' });
    Room.findOne.mockResolvedValue({ _id: 'other' });
    const req = { params: { id: 'r1' }, body: { name: 'Dup', coworkingSpace: 'space-1' } };
    const res = mockRes();
    await updateRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Duplicate room name' }));
  });

  test('200 on successful update (picture set to null explicitly)', async () => {
    const fakeRoom = { _id: 'r1', name: 'Old', coworkingSpace: 'space-1', picture: 'old.jpg', save: jest.fn().mockResolvedValue(true) };
    Room.findById.mockResolvedValue(fakeRoom);
    CoworkingSpace.findById.mockResolvedValue({ _id: 'space-1' });
    Room.findOne.mockResolvedValue(null);
    const req = { params: { id: 'r1' }, body: { name: 'New', picture: null } };
    const res = mockRes();
    await updateRoom(req, res);
    expect(fakeRoom.save).toHaveBeenCalled();
    expect(fakeRoom.picture).toBe(null);
    expect(fakeRoom.name).toBe('New');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('200 on successful update without coworkingSpace in body', async () => {
    const fakeRoom = { _id: 'r1', name: 'Old', coworkingSpace: 'space-1', save: jest.fn().mockResolvedValue(true) };
    Room.findById.mockResolvedValue(fakeRoom);
    Room.findOne.mockResolvedValue(null);
    const req = { params: { id: 'r1' }, body: { name: 'New' } };
    const res = mockRes();
    await updateRoom(req, res);
    expect(CoworkingSpace.findById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('500 on error', async () => {
    Room.findById.mockRejectedValue(new Error('fail'));
    const req = { params: { id: 'r1' }, body: {} };
    const res = mockRes();
    await updateRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// DELETE ROOM
// ─────────────────────────────────────────────
describe('deleteRoom', () => {
  test('404 when room not found', async () => {
    Room.findById.mockResolvedValue(null);
    const req = { params: { id: 'r1' } };
    const res = mockRes();
    await deleteRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Room not found' }));
  });

  test('400 when room has active reservations', async () => {
    Room.findById.mockResolvedValue({ _id: 'r1' });
    Reservation.find.mockResolvedValue([{ _id: 'res-1' }]);
    const req = { params: { id: 'r1' } };
    const res = mockRes();
    await deleteRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Room has active reservations' }));
  });

  test('200 on successful soft delete', async () => {
    const fakeRoom = { _id: 'r1', status: 'active', save: jest.fn().mockResolvedValue(true) };
    Room.findById.mockResolvedValue(fakeRoom);
    Reservation.find.mockResolvedValue([]);
    const req = { params: { id: 'r1' } };
    const res = mockRes();
    await deleteRoom(req, res);
    expect(fakeRoom.status).toBe('deleted');
    expect(fakeRoom.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Room deleted' }));
  });

  test('500 on error', async () => {
    Room.findById.mockRejectedValue(new Error('fail'));
    const req = { params: { id: 'r1' } };
    const res = mockRes();
    await deleteRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});