const { deleteRoom } = require('../controllers/rooms');

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