const { createRoom } = require('../controllers/rooms');

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