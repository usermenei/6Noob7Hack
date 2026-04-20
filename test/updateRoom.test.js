const { updateRoom } = require('../controllers/rooms');

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