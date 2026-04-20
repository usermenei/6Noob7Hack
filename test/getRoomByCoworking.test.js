const { getRoomByCoworking } = require('../controllers/rooms');

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