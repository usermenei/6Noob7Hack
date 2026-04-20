const { getRoomsByCoworking } = require('../controllers/rooms');

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