const { getRooms } = require('../controllers/rooms');

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