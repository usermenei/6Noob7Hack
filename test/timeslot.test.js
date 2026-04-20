const timeslotsController = require('../controllers/timeslots');

jest.mock('../models/TimeSlot', () => ({ find: jest.fn(), findOne: jest.fn(), create: jest.fn() }));
jest.mock('../models/Room', () => ({ findById: jest.fn() }));

const TimeSlot = require('../models/TimeSlot');
const Room = require('../models/Room');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// createTimeSlot
// ─────────────────────────────────────────────
describe('createTimeSlot', () => {
  const baseSpace = { openTime: '08:00', closeTime: '20:00' };

  test('404 when room not found', async () => {
    Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const req = { body: { room: 'r1', startTime: '2024-01-01T09:00:00Z', endTime: '2024-01-01T10:00:00Z' } };
    const res = mockRes();
    await timeslotsController.createTimeSlot(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Room not found' }));
  });

  test('404 when coworking space not found (null on room)', async () => {
    const fakeRoom = { _id: 'r1', coworkingSpace: null };
    Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeRoom) });
    const req = { body: { room: 'r1', startTime: '2024-01-01T09:00:00Z', endTime: '2024-01-01T10:00:00Z' } };
    const res = mockRes();
    await timeslotsController.createTimeSlot(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Coworking space not found' }));
  });

  test('400 when slot is before open time', async () => {
    const fakeRoom = { _id: 'r1', coworkingSpace: { ...baseSpace } };
    Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeRoom) });
    // slot starts at 06:00 UTC — will be before 08:00 local if same timezone
    const req = { body: { room: 'r1', startTime: '2024-01-01T06:00:00', endTime: '2024-01-01T07:00:00' } };
    const res = mockRes();
    await timeslotsController.createTimeSlot(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('08:00') }));
  });

  test('400 when slot is after close time', async () => {
    const fakeRoom = { _id: 'r1', coworkingSpace: { ...baseSpace } };
    Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeRoom) });
    const req = { body: { room: 'r1', startTime: '2024-01-01T21:00:00', endTime: '2024-01-01T22:00:00' } };
    const res = mockRes();
    await timeslotsController.createTimeSlot(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('20:00') }));
  });

  test('400 when slot overlaps with existing slot', async () => {
    const fakeRoom = { _id: 'r1', coworkingSpace: { ...baseSpace } };
    Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeRoom) });
    TimeSlot.findOne.mockResolvedValue({ _id: 'existing' });
    const req = { body: { room: 'r1', startTime: '2024-01-01T09:00:00', endTime: '2024-01-01T10:00:00' } };
    const res = mockRes();
    await timeslotsController.createTimeSlot(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Time slot overlaps with existing slot' }));
  });

  test('201 on successful creation', async () => {
    const fakeRoom = { _id: 'r1', coworkingSpace: { ...baseSpace } };
    Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeRoom) });
    TimeSlot.findOne.mockResolvedValue(null);
    const newSlot = { _id: 'slot-1', room: 'r1' };
    TimeSlot.create.mockResolvedValue(newSlot);
    const req = { body: { room: 'r1', startTime: '2024-01-01T09:00:00', endTime: '2024-01-01T10:00:00' } };
    const res = mockRes();
    await timeslotsController.createTimeSlot(req, res);
    expect(TimeSlot.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: newSlot }));
  });

  test('500 on unexpected error', async () => {
    Room.findById.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('db fail')) });
    const req = { body: { room: 'r1', startTime: '2024-01-01T09:00:00', endTime: '2024-01-01T10:00:00' } };
    const res = mockRes();
    await timeslotsController.createTimeSlot(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// getTimeSlots
// ─────────────────────────────────────────────
describe('getTimeSlots', () => {
  test('200 with list of slots', async () => {
    const slots = [{ _id: 'slot-1' }, { _id: 'slot-2' }];
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(slots) });
    const req = { params: { roomId: 'r1' } };
    const res = mockRes();
    await timeslotsController.getTimeSlots(req, res);
    expect(TimeSlot.find).toHaveBeenCalledWith({ room: 'r1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 2, data: slots }));
  });

  test('500 on unexpected error', async () => {
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error('db fail')) });
    const req = { params: { roomId: 'r1' } };
    const res = mockRes();
    await timeslotsController.getTimeSlots(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});