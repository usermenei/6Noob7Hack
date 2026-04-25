const { confirmQrPayment } = require('../controllers/payments');

jest.mock('../models/Payment');
jest.mock('../models/Reservation');
jest.mock('../models/QrCode');

const Payment     = require('../models/Payment');
const Reservation = require('../models/Reservation');
const QrCode      = require('../models/QrCode');

// ─── helpers ─────────────────────────────────────────────────────────────────

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides = {}) => ({
  body:   {},
  params: {},
  user:   { id: 'user-abc', role: 'user' },
  ...overrides,
});

const makePayment = (extra = {}) => ({
  _id:          'payment-001',
  user:         { toString: () => 'user-abc' },
  reservation:  'reservation-001',
  method:       'qr',
  status:       'pending',
  amount:       200,
  transactionId: null,
  adminQrCode:  null,
  save:         jest.fn().mockResolvedValue(true),
  ...extra,
});

const makeReservation = (extra = {}) => ({
  _id:  'reservation-001',
  room: { coworkingSpace: 'space-001' },
  ...extra,
});

const makeQrCode = (extra = {}) => ({
  _id:      'qr-001',
  isActive: true,
  ...extra,
});

// Reservation.findById().populate() chain
const mockReservationFind = (result) => {
  Reservation.findById.mockReturnValue({
    populate: jest.fn().mockResolvedValue(result),
  });
};

beforeEach(() => jest.clearAllMocks());

// ─── confirmQrPayment ─────────────────────────────────────────────────────────

describe('confirmQrPayment controller', () => {

  // ── Happy path ──────────────────────────────────────────────────────────────

  test('✅ valid QR payment — status set to completed, transactionId generated, returns 200', async () => {
    const payment = makePayment();
    Payment.findById.mockResolvedValue(payment);
    mockReservationFind(makeReservation());
    QrCode.findOne.mockResolvedValue(makeQrCode());
    Reservation.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

    const req = mockReq({ params: { id: 'payment-001' } });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(payment.status).toBe('completed');
    expect(payment.transactionId).toMatch(/^TXN-/);
    expect(payment.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          status:        'completed',
          transactionId: expect.stringMatching(/^TXN-/),
        }),
      })
    );
  });

  test('✅ adminQrCode linked to payment after confirm', async () => {
    const payment = makePayment();
    const qrCode  = makeQrCode({ _id: 'qr-001' });
    Payment.findById.mockResolvedValue(payment);
    mockReservationFind(makeReservation());
    QrCode.findOne.mockResolvedValue(qrCode);
    Reservation.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

    const req = mockReq({ params: { id: 'payment-001' } });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(payment.adminQrCode).toBe('qr-001');
    expect(payment.save).toHaveBeenCalled();
  });

  test('✅ reservation marked as success after QR confirm', async () => {
    const payment = makePayment();
    Payment.findById.mockResolvedValue(payment);
    mockReservationFind(makeReservation());
    QrCode.findOne.mockResolvedValue(makeQrCode());
    Reservation.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

    const req = mockReq({ params: { id: 'payment-001' } });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(Reservation.findByIdAndUpdate).toHaveBeenCalledWith(
      'reservation-001',
      { status: 'success' }
    );
  });

  test('✅ admin can confirm any user QR payment', async () => {
    const payment = makePayment({
      user: { toString: () => 'other-user-id' }, // different owner
    });
    Payment.findById.mockResolvedValue(payment);
    mockReservationFind(makeReservation());
    QrCode.findOne.mockResolvedValue(makeQrCode());
    Reservation.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

    const req = mockReq({
      params: { id: 'payment-001' },
      user:   { id: 'admin-id', role: 'admin' },
    });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(payment.status).toBe('completed');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── Wrong method ────────────────────────────────────────────────────────────

  test('❌ cash payment — returns 400 "This is not a QR payment", save not called', async () => {
    const payment = makePayment({ method: 'cash' });
    Payment.findById.mockResolvedValue(payment);

    const req = mockReq({ params: { id: 'payment-001' } });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'This is not a QR payment' })
    );
  });

  // ── Wrong status ────────────────────────────────────────────────────────────

  test('❌ already completed payment — returns 400, save not called', async () => {
    const payment = makePayment({ status: 'completed' });
    Payment.findById.mockResolvedValue(payment);

    const req = mockReq({ params: { id: 'payment-001' } });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Cannot confirm payment with status'),
      })
    );
  });

  test('❌ cancelled payment — returns 400, save not called', async () => {
    const payment = makePayment({ status: 'cancelled' });
    Payment.findById.mockResolvedValue(payment);

    const req = mockReq({ params: { id: 'payment-001' } });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── Authorization ───────────────────────────────────────────────────────────

  test('❌ non-owner non-admin — returns 403, save not called', async () => {
    const payment = makePayment({
      user: { toString: () => 'other-user-id' },
    });
    Payment.findById.mockResolvedValue(payment);

    const req = mockReq({
      params: { id: 'payment-001' },
      user:   { id: 'random-user-id', role: 'user' },
    });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Not authorized' })
    );
  });

  // ── Missing records ─────────────────────────────────────────────────────────

  test('❌ payment not found — returns 404', async () => {
    Payment.findById.mockResolvedValue(null);

    const req = mockReq({ params: { id: 'nonexistent-id' } });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Payment not found' })
    );
  });

  test('❌ reservation not found — returns 404', async () => {
    const payment = makePayment();
    Payment.findById.mockResolvedValue(payment);
    mockReservationFind(null); // reservation lookup returns null

    const req = mockReq({ params: { id: 'payment-001' } });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Reservation not found' })
    );
  });

  test('❌ no active QR code for coworking space — returns 404', async () => {
    const payment = makePayment();
    Payment.findById.mockResolvedValue(payment);
    mockReservationFind(makeReservation());
    QrCode.findOne.mockResolvedValue(null); // no active QR

    const req = mockReq({ params: { id: 'payment-001' } });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'No active QR code found for this coworking space',
      })
    );
  });

  // ── QR lookup uses correct coworkingSpace ───────────────────────────────────

  test('✅ QrCode.findOne called with correct coworkingSpace and isActive:true', async () => {
    const payment = makePayment();
    Payment.findById.mockResolvedValue(payment);
    mockReservationFind(makeReservation({ room: { coworkingSpace: 'space-xyz' } }));
    QrCode.findOne.mockResolvedValue(makeQrCode());
    Reservation.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

    const req = mockReq({ params: { id: 'payment-001' } });
    const res = mockRes();

    await confirmQrPayment(req, res);

    expect(QrCode.findOne).toHaveBeenCalledWith({
      coworkingSpace: 'space-xyz',
      isActive:       true,
    });
  });
});