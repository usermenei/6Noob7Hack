const { getRoomAvailability } = require('../controllers/rooms');

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