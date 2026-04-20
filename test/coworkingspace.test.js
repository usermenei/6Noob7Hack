const cwController = require('../controllers/coworkingspaces');

jest.mock('../models/CoworkingSpace', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
}));
jest.mock('../models/Reservation', () => ({ deleteMany: jest.fn() }));

const Coworkingspace = require('../models/CoworkingSpace');
const Reservation = require('../models/Reservation');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// chainable mock for find().populate().select().sort().skip().limit()
function chainableFind(value) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(value),
  };
  return chain;
}

// chainable mock for findById().populate()
function chainableFindById(value) {
  return { populate: jest.fn().mockResolvedValue(value) };
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// getCoworkingspaces
// ─────────────────────────────────────────────
describe('getCoworkingspaces', () => {
  test('200 with default query (no select/sort/page/limit)', async () => {
    const spaces = [{ _id: 's1' }, { _id: 's2' }];
    Coworkingspace.find.mockReturnValue(chainableFind(spaces));
    Coworkingspace.countDocuments.mockResolvedValue(2);
    const req = { query: {} };
    const res = mockRes();
    await cwController.getCoworkingspaces(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 2 }));
  });

  test('200 with select and sort params', async () => {
    const spaces = [{ _id: 's1' }];
    Coworkingspace.find.mockReturnValue(chainableFind(spaces));
    Coworkingspace.countDocuments.mockResolvedValue(1);
    const req = { query: { select: 'name,address', sort: 'name,-createdAt' } };
    const res = mockRes();
    await cwController.getCoworkingspaces(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('200 with pagination next page', async () => {
    Coworkingspace.find.mockReturnValue(chainableFind([]));
    Coworkingspace.countDocuments.mockResolvedValue(100);
    const req = { query: { page: '1', limit: '5' } };
    const res = mockRes();
    await cwController.getCoworkingspaces(req, res, jest.fn());
    const payload = res.json.mock.calls[0][0];
    expect(payload.pagination.next).toEqual({ page: 2, limit: 5 });
    expect(payload.pagination.prev).toBeUndefined();
  });

  test('200 with pagination prev page', async () => {
    Coworkingspace.find.mockReturnValue(chainableFind([]));
    Coworkingspace.countDocuments.mockResolvedValue(100);
    const req = { query: { page: '3', limit: '5' } };
    const res = mockRes();
    await cwController.getCoworkingspaces(req, res, jest.fn());
    const payload = res.json.mock.calls[0][0];
    expect(payload.pagination.prev).toEqual({ page: 2, limit: 5 });
    expect(payload.pagination.next).toEqual({ page: 4, limit: 5 });
  });

  test('200 with gt/gte/lt/lte query operators converted', async () => {
    Coworkingspace.find.mockReturnValue(chainableFind([]));
    Coworkingspace.countDocuments.mockResolvedValue(0);
    const req = { query: { price: { gt: '100' } } };
    const res = mockRes();
    await cwController.getCoworkingspaces(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('500 on unexpected error', async () => {
    Coworkingspace.find.mockImplementation(() => { throw new Error('db fail'); });
    const req = { query: {} };
    const res = mockRes();
    await cwController.getCoworkingspaces(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// getCoworkingspace
// ─────────────────────────────────────────────
describe('getCoworkingspace', () => {
  test('404 when not found', async () => {
    Coworkingspace.findById.mockReturnValue(chainableFindById(null));
    const req = { params: { id: 's1' } };
    const res = mockRes();
    await cwController.getCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Coworking space not found' }));
  });

  test('200 on success', async () => {
    const space = { _id: 's1', name: 'A' };
    Coworkingspace.findById.mockReturnValue(chainableFindById(space));
    const req = { params: { id: 's1' } };
    const res = mockRes();
    await cwController.getCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: space }));
  });

  test('500 on unexpected error', async () => {
    Coworkingspace.findById.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('fail')) });
    const req = { params: { id: 's1' } };
    const res = mockRes();
    await cwController.getCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// createCoworkingspace
// ─────────────────────────────────────────────
describe('createCoworkingspace', () => {
  test('201 on success', async () => {
    const space = { _id: 's1', name: 'A' };
    Coworkingspace.create.mockResolvedValue(space);
    const req = { body: { name: 'A' } };
    const res = mockRes();
    await cwController.createCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: space }));
  });

  test('400 on duplicate (code 11000)', async () => {
    Coworkingspace.create.mockRejectedValue({ code: 11000 });
    const req = { body: { name: 'A' } };
    const res = mockRes();
    await cwController.createCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Duplicate') }));
  });

  test('400 on validation error', async () => {
    Coworkingspace.create.mockRejectedValue(new Error('Validation failed'));
    const req = { body: {} };
    const res = mockRes();
    await cwController.createCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Validation failed' }));
  });
});

// ─────────────────────────────────────────────
// updateCoworkingspace
// ─────────────────────────────────────────────
describe('updateCoworkingspace', () => {
  test('404 when not found', async () => {
    Coworkingspace.findByIdAndUpdate.mockResolvedValue(null);
    const req = { params: { id: 's1' }, body: { name: 'B' } };
    const res = mockRes();
    await cwController.updateCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Coworking space not found' }));
  });

  test('200 on success', async () => {
    const space = { _id: 's1', name: 'B' };
    Coworkingspace.findByIdAndUpdate.mockResolvedValue(space);
    const req = { params: { id: 's1' }, body: { name: 'B' } };
    const res = mockRes();
    await cwController.updateCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: space }));
  });

  test('400 on duplicate (code 11000)', async () => {
    Coworkingspace.findByIdAndUpdate.mockRejectedValue({ code: 11000 });
    const req = { params: { id: 's1' }, body: { name: 'B' } };
    const res = mockRes();
    await cwController.updateCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Duplicate') }));
  });

  test('400 on validation error', async () => {
    Coworkingspace.findByIdAndUpdate.mockRejectedValue(new Error('Validation failed'));
    const req = { params: { id: 's1' }, body: {} };
    const res = mockRes();
    await cwController.updateCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Validation failed' }));
  });
});

// ─────────────────────────────────────────────
// deleteCoworkingspace
// ─────────────────────────────────────────────
describe('deleteCoworkingspace', () => {
  test('404 when not found', async () => {
    Coworkingspace.findById.mockResolvedValue(null);
    const req = { params: { id: 's1' } };
    const res = mockRes();
    await cwController.deleteCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Coworking space not found' }));
  });

  test('200 on success (cascades reservations)', async () => {
    const space = { _id: 's1', deleteOne: jest.fn().mockResolvedValue(true) };
    Coworkingspace.findById.mockResolvedValue(space);
    Reservation.deleteMany.mockResolvedValue({});
    const req = { params: { id: 's1' } };
    const res = mockRes();
    await cwController.deleteCoworkingspace(req, res, jest.fn());
    expect(Reservation.deleteMany).toHaveBeenCalledWith({ coworkingspace: 's1' });
    expect(space.deleteOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Coworking space deleted successfully' }));
  });

  test('500 on unexpected error', async () => {
    Coworkingspace.findById.mockRejectedValue(new Error('db fail'));
    const req = { params: { id: 's1' } };
    const res = mockRes();
    await cwController.deleteCoworkingspace(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// updateCoworkingspacePhoto
// ─────────────────────────────────────────────
describe('updateCoworkingspacePhoto', () => {
  test('400 when neither picture nor caption provided', async () => {
    const req = { params: { id: 's1' }, body: {} };
    const res = mockRes();
    await cwController.updateCoworkingspacePhoto(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Please provide a picture URL or caption' }));
  });

  test('404 when space not found', async () => {
    Coworkingspace.findById.mockResolvedValue(null);
    const req = { params: { id: 's1' }, body: { picture: 'http://pic.jpg' } };
    const res = mockRes();
    await cwController.updateCoworkingspacePhoto(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Coworking space not found' }));
  });

  test('200 with picture only', async () => {
    Coworkingspace.findById.mockResolvedValue({ _id: 's1' });
    Coworkingspace.findByIdAndUpdate.mockResolvedValue({ picture: 'http://pic.jpg', caption: null });
    const req = { params: { id: 's1' }, body: { picture: 'http://pic.jpg' } };
    const res = mockRes();
    await cwController.updateCoworkingspacePhoto(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { picture: 'http://pic.jpg', caption: null } }));
  });

  test('200 with caption only', async () => {
    Coworkingspace.findById.mockResolvedValue({ _id: 's1' });
    Coworkingspace.findByIdAndUpdate.mockResolvedValue({ picture: null, caption: 'Nice place' });
    const req = { params: { id: 's1' }, body: { caption: 'Nice place' } };
    const res = mockRes();
    await cwController.updateCoworkingspacePhoto(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('200 with both picture and caption', async () => {
    Coworkingspace.findById.mockResolvedValue({ _id: 's1' });
    Coworkingspace.findByIdAndUpdate.mockResolvedValue({ picture: 'http://pic.jpg', caption: 'Nice place' });
    const req = { params: { id: 's1' }, body: { picture: 'http://pic.jpg', caption: 'Nice place' } };
    const res = mockRes();
    await cwController.updateCoworkingspacePhoto(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('500 on unexpected error', async () => {
    Coworkingspace.findById.mockRejectedValue(new Error('db fail'));
    const req = { params: { id: 's1' }, body: { picture: 'http://pic.jpg' } };
    const res = mockRes();
    await cwController.updateCoworkingspacePhoto(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('coworkingspaces additional coverage', () => {
  test('Line 119: createCoworkingspace fallback error message', async () => {
    Coworkingspace.create.mockRejectedValue({}); // No message, no code 11000
    const req = { body: {} };
    const res = mockRes();
    await cwController.createCoworkingspace(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid data' }));
  });

  test('Line 153: updateCoworkingspace fallback error message', async () => {
    Coworkingspace.findByIdAndUpdate.mockRejectedValue({});
    const req = { params: { id: 's1' }, body: {} };
    const res = mockRes();
    await cwController.updateCoworkingspace(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Update failed' }));
  });
});