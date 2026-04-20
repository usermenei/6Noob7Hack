const authController = require('../controllers/auth');

jest.mock('../models/User', () => ({ findById: jest.fn(), findOne: jest.fn(), create: jest.fn(), findByIdAndUpdate: jest.fn() }));

const User = require('../models/User');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// register
// ─────────────────────────────────────────────
describe('register', () => {
  test('201 on success (calls sendTokenResponse)', async () => {
    const fakeUser = { getSignedJwtToken: jest.fn().mockReturnValue('tok') };
    User.create.mockResolvedValue(fakeUser);
    process.env.JWT_COOKIE_EXPIRE = '1';
    const req = { body: { name: 'A', email: 'a@b.com', telephoneNumber: '0', password: 'pw', role: 'user' } };
    const res = mockRes();
    await authController.register(req, res, jest.fn());
    expect(User.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'tok' }));
  });

  test('400 on duplicate email (code 11000)', async () => {
    User.create.mockRejectedValue({ code: 11000 });
    const req = { body: { name: 'A', email: 'a@b.com', telephoneNumber: '0', password: 'pw' } };
    const res = mockRes();
    await authController.register(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Duplicate field value entered. Email already exists.' }));
  });

  test('400 on validation error', async () => {
    User.create.mockRejectedValue(new Error('Validation failed'));
    const req = { body: {} };
    const res = mockRes();
    await authController.register(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Validation failed' }));
  });
});

// ─────────────────────────────────────────────
// login
// ─────────────────────────────────────────────
describe('login', () => {
  test('400 when email or password missing', async () => {
    const req = { body: { email: '', password: '' } };
    const res = mockRes();
    await authController.login(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Please provide an email and password' }));
  });

  test('401 when user not found', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { body: { email: 'a@b.com', password: 'pw' } };
    const res = mockRes();
    await authController.login(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid credentials' }));
  });

  test('401 when password does not match', async () => {
    const fakeUser = { matchPassword: jest.fn().mockResolvedValue(false) };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
    const req = { body: { email: 'a@b.com', password: 'wrong' } };
    const res = mockRes();
    await authController.login(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid credentials' }));
  });

  test('200 on successful login', async () => {
    const fakeUser = { matchPassword: jest.fn().mockResolvedValue(true), getSignedJwtToken: jest.fn().mockReturnValue('tok') };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
    process.env.JWT_COOKIE_EXPIRE = '1';
    const req = { body: { email: 'a@b.com', password: 'pw' } };
    const res = mockRes();
    await authController.login(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'tok' }));
  });

  test('500 on unexpected error', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('db fail')) });
    const req = { body: { email: 'a@b.com', password: 'pw' } };
    const res = mockRes();
    await authController.login(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// getMe
// ─────────────────────────────────────────────
describe('getMe', () => {
  test('404 when user not found', async () => {
    User.findById.mockResolvedValue(null);
    const req = { user: { id: 'u1' } };
    const res = mockRes();
    await authController.getMe(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User not found' }));
  });

  const rankCases = [
    { entries: 0,   rank: 0, title: 'Newbie',      discount: '0%' },
    { entries: 1,   rank: 1, title: 'Bronze',      discount: '0%' },
    { entries: 5,   rank: 2, title: 'Silver',      discount: '5%' },
    { entries: 10,  rank: 3, title: 'Gold',        discount: '10%' },
    { entries: 25,  rank: 4, title: 'Diamond',     discount: '25%' },
    { entries: 100, rank: 5, title: 'Legend',      discount: '50%' },
    { entries: 500, rank: 6, title: 'Grandmaster', discount: '90%' },
  ];

  rankCases.forEach(({ entries, rank, title, discount }) => {
    test(`200 with rank "${title}" at ${entries} entries`, async () => {
      const fakeUser = { _id: 'u1', name: 'A', email: 'a@b.com', telephoneNumber: '0', numberOfEntries: entries, profilePicture: null };
      User.findById.mockResolvedValue(fakeUser);
      const req = { user: { id: 'u1' } };
      const res = mockRes();
      await authController.getMe(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ rank, title, discount })
      }));
    });
  });

  test('500 on unexpected error', async () => {
    User.findById.mockRejectedValue(new Error('db fail'));
    const req = { user: { id: 'u1' } };
    const res = mockRes();
    await authController.getMe(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// logout
// ─────────────────────────────────────────────
describe('logout', () => {
  test('200 on successful logout', async () => {
    const req = {};
    const res = mockRes();
    await authController.logout(req, res, jest.fn());
    expect(res.cookie).toHaveBeenCalledWith('token', 'none', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Logged out successfully' }));
  });

  test('500 on unexpected error', async () => {
    const req = {};
    const res = mockRes();
    res.cookie = jest.fn().mockImplementation(() => { throw new Error('fail'); });
    await authController.logout(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────
// updateProfilePicture
// ─────────────────────────────────────────────
describe('updateProfilePicture', () => {
  test('400 when profilePicture not provided', async () => {
    const req = { user: { id: 'u1' }, body: {} };
    const res = mockRes();
    await authController.updateProfilePicture(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Please provide a picture URL' }));
  });

  test('404 when user not found after update', async () => {
    User.findByIdAndUpdate.mockResolvedValue(null);
    const req = { user: { id: 'u1' }, body: { profilePicture: 'http://pic.jpg' } };
    const res = mockRes();
    await authController.updateProfilePicture(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User not found' }));
  });

  test('200 on successful update', async () => {
    User.findByIdAndUpdate.mockResolvedValue({ profilePicture: 'http://pic.jpg' });
    const req = { user: { id: 'u1' }, body: { profilePicture: 'http://pic.jpg' } };
    const res = mockRes();
    await authController.updateProfilePicture(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { profilePicture: 'http://pic.jpg' } }));
  });

  test('500 on unexpected error', async () => {
    User.findByIdAndUpdate.mockRejectedValue(new Error('db fail'));
    const req = { user: { id: 'u1' }, body: { profilePicture: 'http://pic.jpg' } };
    const res = mockRes();
    await authController.updateProfilePicture(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('auth additional coverage', () => {
  test('Line 15: Sets secure cookie when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_COOKIE_EXPIRE = '1';
    const fakeUser = { getSignedJwtToken: jest.fn().mockReturnValue('tok') };
    User.create.mockResolvedValue(fakeUser);
    
    const req = { body: { name: 'A', email: 'a@b.com', telephoneNumber: '0', password: 'pw' } };
    const res = mockRes();
    await authController.register(req, res, jest.fn());

    expect(res.cookie).toHaveBeenCalledWith(
      'token', 
      'tok', 
      expect.objectContaining({ secure: true })
    );
    // Reset env
    process.env.NODE_ENV = 'test';
  });

  test('Line 55: Uses fallback error message when err.message is missing', async () => {
    // Reject with an object that has no message property
    User.create.mockRejectedValue({ someOtherProperty: 'no-message' });
    const req = { body: { name: 'A', email: 'a@b.com', telephoneNumber: '0', password: 'pw' } };
    const res = mockRes();
    
    await authController.register(req, res, jest.fn());
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
      message: 'Registration failed' 
    }));
  });
});