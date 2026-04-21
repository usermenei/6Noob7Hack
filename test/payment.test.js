/**
 * paymentController.test.js
 * Jest test suite – targets 100 % statement coverage for paymentController.js
 *
 * Mocking strategy
 * ─────────────────
 * • All Mongoose models (Payment, Reservation, QrCode, Room) are fully mocked
 *   so no real DB connection is required.
 * • `uuid` is mocked to return a deterministic string.
 * • `qrcode` is mocked to return a fixed base64 string.
 * • req / res are lightweight plain objects with jest.fn() methods.
 */

// ─── Module mocks (must be before any require) ────────────────────────────────

jest.mock('../models/Payment');
jest.mock('../models/Reservation');
jest.mock('../models/QrCode');
jest.mock('../models/Room');
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid-1234') }));
jest.mock('qrcode', () => ({
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,MOCKQR==')
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

const Payment     = require('../models/Payment');
const Reservation = require('../models/Reservation');
const QrCode      = require('../models/QrCode');

const {
    createPayment,
    confirmPayment,
    failPayment,
    generateQr,
    confirmQrPayment,
    verifyQr,
    getQrStatus,
    confirmCashPayment,
    getPendingCashPayments,
    getPayment,
} = require('../controllers/payments');

// ─── Shared test helpers ───────────────────────────────────────────────────────

/**
 * Build a minimal Express-like res mock that records the last call to
 * status(), json() and supports chaining.
 */
const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

/** Resets all mock state between tests */
beforeEach(() => jest.clearAllMocks());

// ══════════════════════════════════════════════════════════════════════════════
//  createPayment
// ══════════════════════════════════════════════════════════════════════════════

describe('createPayment', () => {
    const baseReq = () => ({
        body: { reservationId: 'res123', method: 'qr' },
        user: { id: 'user1' },
    });

    it('400 – missing reservationId', async () => {
        const req = { body: { method: 'qr' }, user: { id: 'u1' } };
        const res = buildRes();
        await createPayment(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: expect.stringContaining('required') })
        );
    });

    it('400 – missing method', async () => {
        const req = { body: { reservationId: 'r1' }, user: { id: 'u1' } };
        const res = buildRes();
        await createPayment(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 – invalid method value', async () => {
        const req = { body: { reservationId: 'r1', method: 'bitcoin' }, user: { id: 'u1' } };
        const res = buildRes();
        await createPayment(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('"qr" or "cash"') })
        );
    });

    it('404 – reservation not found', async () => {
        const req = baseReq();
        const res = buildRes();

        const populateMock = jest.fn().mockResolvedValue(null);
        Payment.findById = jest.fn();
        Reservation.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: populateMock }) });

        await createPayment(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('403 – reservation belongs to another user', async () => {
        const req = baseReq();
        const res = buildRes();

        const reservation = {
            _id: 'res123',
            user: { toString: () => 'other-user' },
            status: 'pending',
            room: { name: 'Room A', price: 100 },
            timeSlots: [],
        };

        Reservation.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(reservation) }),
        });

        await createPayment(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('400 – reservation not in pending status', async () => {
        const req = baseReq();
        const res = buildRes();

        const reservation = {
            _id: 'res123',
            user: { toString: () => 'user1' },
            status: 'success',
            room: { name: 'Room A', price: 100 },
            timeSlots: [],
        };

        Reservation.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(reservation) }),
        });

        await createPayment(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('success') })
        );
    });

    it('400 – active payment already exists', async () => {
        const req = baseReq();
        const res = buildRes();

        const reservation = {
            _id: 'res123',
            user: { toString: () => 'user1' },
            status: 'pending',
            room: { name: 'Room A', price: 100 },
            timeSlots: [{}],
        };

        Reservation.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(reservation) }),
        });
        Payment.findOne = jest.fn().mockResolvedValue({ _id: 'existing-pay' });

        await createPayment(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('already exists') })
        );
    });

    it('201 – successfully creates a QR payment', async () => {
        const req = baseReq();
        const res = buildRes();

        const reservation = {
            _id: 'res123',
            user: { toString: () => 'user1' },
            status: 'pending',
            room: { name: 'Room A', price: 100 },
            timeSlots: [{ startTime: '09:00', endTime: '10:00' }, { startTime: '10:00', endTime: '11:00' }],
        };

        Reservation.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(reservation) }),
        });
        Payment.findOne   = jest.fn().mockResolvedValue(null);
        Payment.create    = jest.fn().mockResolvedValue({
            _id: 'pay1', method: 'qr', status: 'pending', amount: 200,
        });

        await createPayment(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: expect.objectContaining({ amount: 200 }) })
        );
    });

    it('201 – successfully creates a cash payment', async () => {
        const req = { body: { reservationId: 'res123', method: 'cash' }, user: { id: 'user1' } };
        const res = buildRes();

        const reservation = {
            _id: 'res123',
            user: { toString: () => 'user1' },
            status: 'pending',
            room: { name: 'Room A', price: 50 },
            timeSlots: [{}],
        };

        Reservation.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(reservation) }),
        });
        Payment.findOne = jest.fn().mockResolvedValue(null);
        Payment.create  = jest.fn().mockResolvedValue({
            _id: 'pay2', method: 'cash', status: 'pending', amount: 50,
        });

        await createPayment(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('500 – handles unexpected errors', async () => {
        const req = baseReq();
        const res = buildRes();
        Reservation.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('DB down')) }),
        });
        await createPayment(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  confirmPayment
// ══════════════════════════════════════════════════════════════════════════════

describe('confirmPayment', () => {
    it('404 – payment not found', async () => {
        Payment.findById = jest.fn().mockResolvedValue(null);
        const res = buildRes();
        await confirmPayment({ params: { id: 'bad' } }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 – payment not pending', async () => {
        Payment.findById = jest.fn().mockResolvedValue({ status: 'completed', save: jest.fn() });
        const res = buildRes();
        await confirmPayment({ params: { id: 'p1' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('200 – confirms pending payment and marks reservation success', async () => {
        const payment = {
            _id: 'p1', status: 'pending', amount: 100, method: 'qr',
            reservation: 'res1',
            save: jest.fn().mockResolvedValue(true),
        };
        Payment.findById              = jest.fn().mockResolvedValue(payment);
        Reservation.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

        const res = buildRes();
        await confirmPayment({ params: { id: 'p1' } }, res);
        expect(payment.status).toBe('completed');
        expect(payment.transactionId).toMatch(/^TXN-/);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('500 – handles unexpected errors', async () => {
        Payment.findById = jest.fn().mockRejectedValue(new Error('fail'));
        const res = buildRes();
        await confirmPayment({ params: { id: 'x' } }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  failPayment
// ══════════════════════════════════════════════════════════════════════════════

describe('failPayment', () => {
    it('404 – payment not found', async () => {
        Payment.findById = jest.fn().mockResolvedValue(null);
        const res = buildRes();
        await failPayment({ params: { id: 'nope' } }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 – payment already completed', async () => {
        Payment.findById = jest.fn().mockResolvedValue({ status: 'completed', save: jest.fn() });
        const res = buildRes();
        await failPayment({ params: { id: 'p1' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('200 – marks pending payment as failed', async () => {
        const payment = { _id: 'p1', status: 'pending', save: jest.fn().mockResolvedValue(true) };
        Payment.findById = jest.fn().mockResolvedValue(payment);
        const res = buildRes();
        await failPayment({ params: { id: 'p1' } }, res);
        expect(payment.status).toBe('failed');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('500 – handles unexpected errors', async () => {
        Payment.findById = jest.fn().mockRejectedValue(new Error('oops'));
        const res = buildRes();
        await failPayment({ params: { id: 'x' } }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  generateQr
// ══════════════════════════════════════════════════════════════════════════════

describe('generateQr', () => {
    const req = (overrides = {}) => ({
        params: { id: 'pay1' },
        user:   { id: 'user1' },
        ...overrides,
    });

    const buildPayment = (overrides = {}) => ({
        _id:    { toString: () => 'pay1' },
        user:   { toString: () => 'user1' },
        method: 'qr',
        status: 'pending',
        amount: 200,
        reservation: {
            _id:  { toString: () => 'res1' },
            room: { coworkingSpace: 'cs1' },
        },
        save:   jest.fn().mockResolvedValue(true),
        ...overrides,
    });

    it('404 – payment not found', async () => {
        Payment.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
        const res = buildRes();
        await generateQr(req(), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('403 – not the owner', async () => {
        const payment = buildPayment({ user: { toString: () => 'other' } });
        Payment.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(payment) });
        const res = buildRes();
        await generateQr(req(), res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('400 – wrong method (cash)', async () => {
        const payment = buildPayment({ method: 'cash' });
        Payment.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(payment) });
        const res = buildRes();
        await generateQr(req(), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('QR method') })
        );
    });

    it('400 – payment not pending', async () => {
        const payment = buildPayment({ status: 'completed' });
        Payment.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(payment) });
        const res = buildRes();
        await generateQr(req(), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('200 – generates QR and returns base64 image', async () => {
        const payment = buildPayment();
        Payment.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(payment) });
        QrCode.deleteMany = jest.fn().mockResolvedValue(true);
        QrCode.create     = jest.fn().mockResolvedValue({
            _id: 'qr1',
            imageBase64: 'data:image/png;base64,MOCKQR==',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });

        const res = buildRes();
        await generateQr(req(), res);
        expect(QrCode.deleteMany).toHaveBeenCalledWith({ payment: payment._id, isUsed: false });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, data: expect.objectContaining({ qrImage: 'data:image/png;base64,MOCKQR==' }) })
        );
    });

    it('500 – handles unexpected errors', async () => {
        Payment.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('db')) });
        const res = buildRes();
        await generateQr(req(), res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  confirmQrPayment
// ══════════════════════════════════════════════════════════════════════════════

describe('confirmQrPayment', () => {
    const basePayment = (overrides = {}) => ({
        _id:         { toString: () => 'pay1' },
        method:      'qr',
        status:      'pending',
        amount:      100,
        activeQr:    'qr1',
        reservation: 'res1',
        save:        jest.fn().mockResolvedValue(true),
        ...overrides,
    });

    const baseQr = (overrides = {}) => ({
        _id:      'qr1',
        payment:  { toString: () => 'pay1' },
        isUsed:   false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        payload:  '{"paymentId":"pay1"}',
        save:     jest.fn().mockResolvedValue(true),
        ...overrides,
    });

    it('404 – payment not found', async () => {
        Payment.findById = jest.fn().mockResolvedValue(null);
        const res = buildRes();
        await confirmQrPayment({ params: { id: 'x' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 – not a QR payment', async () => {
        Payment.findById = jest.fn().mockResolvedValue(basePayment({ method: 'cash' }));
        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not a QR payment' }));
    });

    it('400 – payment not pending', async () => {
        Payment.findById = jest.fn().mockResolvedValue(basePayment({ status: 'completed' }));
        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 – no active QR on payment', async () => {
        Payment.findById = jest.fn().mockResolvedValue(basePayment({ activeQr: null }));
        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('No active QR') })
        );
    });

    it('404 – QR record not found in DB', async () => {
        Payment.findById = jest.fn().mockResolvedValue(basePayment());
        QrCode.findById  = jest.fn().mockResolvedValue(null);
        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 – QR does not belong to this payment', async () => {
        Payment.findById = jest.fn().mockResolvedValue(basePayment());
        QrCode.findById  = jest.fn().mockResolvedValue(baseQr({ payment: { toString: () => 'OTHER' } }));
        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('does not belong') })
        );
    });

    it('400 – QR already used', async () => {
        Payment.findById = jest.fn().mockResolvedValue(basePayment());
        QrCode.findById  = jest.fn().mockResolvedValue(baseQr({ isUsed: true }));
        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('already been used') })
        );
    });

    it('400 – QR expired', async () => {
        Payment.findById = jest.fn().mockResolvedValue(basePayment());
        QrCode.findById  = jest.fn().mockResolvedValue(baseQr({ expiresAt: new Date(Date.now() - 1000) }));
        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('expired') })
        );
    });

    it('400 – payload mismatch when payload provided', async () => {
        Payment.findById = jest.fn().mockResolvedValue(basePayment());
        QrCode.findById  = jest.fn().mockResolvedValue(baseQr({ payload: 'CORRECT' }));
        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: { payload: 'WRONG' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('mismatch') })
        );
    });

    it('200 – confirms QR payment without payload check', async () => {
        const payment = basePayment();
        const qr      = baseQr();
        Payment.findById              = jest.fn().mockResolvedValue(payment);
        QrCode.findById               = jest.fn().mockResolvedValue(qr);
        Reservation.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: {} }, res);
        expect(qr.isUsed).toBe(true);
        expect(payment.status).toBe('completed');
        expect(payment.transactionId).toMatch(/^TXN-/);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('200 – confirms QR payment with matching payload', async () => {
        const payment = basePayment();
        const qr      = baseQr({ payload: 'MATCH' });
        Payment.findById              = jest.fn().mockResolvedValue(payment);
        QrCode.findById               = jest.fn().mockResolvedValue(qr);
        Reservation.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: { payload: 'MATCH' } }, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('uses qrId from body when provided instead of activeQr', async () => {
        const payment = basePayment({ activeQr: 'fallback-qr' });
        const qr      = baseQr({ _id: 'body-qr-id' });
        Payment.findById              = jest.fn().mockResolvedValue(payment);
        QrCode.findById               = jest.fn().mockResolvedValue(qr);
        Reservation.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: { qrId: 'body-qr-id' } }, res);
        expect(QrCode.findById).toHaveBeenCalledWith('body-qr-id');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('500 – handles unexpected errors', async () => {
        Payment.findById = jest.fn().mockRejectedValue(new Error('crash'));
        const res = buildRes();
        await confirmQrPayment({ params: { id: 'p1' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  verifyQr
// ══════════════════════════════════════════════════════════════════════════════

describe('verifyQr', () => {
    it('400 – no qrId or payload provided', async () => {
        const res = buildRes();
        await verifyQr({ body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 – QR record not found by qrId', async () => {
        QrCode.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
        const res = buildRes();
        await verifyQr({ body: { qrId: 'gone' } }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('404 – QR record not found by payload', async () => {
        QrCode.findOne = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
        const res = buildRes();
        await verifyQr({ body: { payload: 'raw-payload' } }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 – QR already used (found by qrId)', async () => {
        const qr = { _id: 'qr1', isUsed: true, usedAt: new Date(), expiresAt: new Date(Date.now() + 5000), payment: { _id: 'p1', amount: 100, status: 'completed' } };
        QrCode.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(qr) });
        const res = buildRes();
        await verifyQr({ body: { qrId: 'qr1' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('already been used') })
        );
    });

    it('400 – QR expired', async () => {
        const qr = { _id: 'qr1', isUsed: false, expiresAt: new Date(Date.now() - 1000), payload: 'p', payment: { _id: 'p1', amount: 100, status: 'pending' } };
        QrCode.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(qr) });
        const res = buildRes();
        await verifyQr({ body: { qrId: 'qr1' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'QR code has expired' }));
    });

    it('400 – payload mismatch', async () => {
        const qr = {
            _id: 'qr1', isUsed: false,
            expiresAt: new Date(Date.now() + 5000),
            payload: 'STORED',
            payment: { _id: 'p1', amount: 100, status: 'pending' },
        };
        QrCode.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(qr) });
        const res = buildRes();
        await verifyQr({ body: { qrId: 'qr1', payload: 'DIFFERENT' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'QR payload mismatch' }));
    });

    it('200 – valid QR (lookup by qrId, no payload check)', async () => {
        const qr = {
            _id: 'qr1', isUsed: false,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            payload: 'STORED',
            payment: { _id: 'p1', amount: 100, status: 'pending' },
        };
        QrCode.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(qr) });
        const res = buildRes();
        await verifyQr({ body: { qrId: 'qr1' } }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, message: 'QR is valid' })
        );
    });

    it('200 – valid QR (lookup by payload, matching payload check)', async () => {
        const qr = {
            _id: 'qr1', isUsed: false,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            payload: 'EXACT',
            payment: { _id: 'p1', amount: 100, status: 'pending' },
        };
        QrCode.findOne = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(qr) });
        const res = buildRes();
        await verifyQr({ body: { payload: 'EXACT' } }, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('500 – handles unexpected errors', async () => {
        QrCode.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('boom')) });
        const res = buildRes();
        await verifyQr({ body: { qrId: 'qr1' } }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  getQrStatus
// ══════════════════════════════════════════════════════════════════════════════

describe('getQrStatus', () => {
    const req = { params: { id: 'pay1' }, user: { id: 'user1' } };

    it('404 – payment not found', async () => {
        Payment.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
        const res = buildRes();
        await getQrStatus(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('403 – not the owner', async () => {
        Payment.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ user: { toString: () => 'other' }, status: 'pending', activeQr: null }),
        });
        const res = buildRes();
        await getQrStatus(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('200 – no active QR → returns expired=true', async () => {
        Payment.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ user: { toString: () => 'user1' }, status: 'pending', activeQr: null }),
        });
        const res = buildRes();
        await getQrStatus(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ qrExpired: true, secondsLeft: 0 }) })
        );
    });

    it('200 – active QR not yet expired', async () => {
        Payment.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ user: { toString: () => 'user1' }, status: 'pending', activeQr: 'qr1' }),
        });
        QrCode.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ expiresAt: new Date(Date.now() + 5 * 60 * 1000), isUsed: false }),
        });
        const res = buildRes();
        await getQrStatus(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ qrExpired: false }) })
        );
    });

    it('200 – QR record not found → treats as expired', async () => {
        Payment.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ user: { toString: () => 'user1' }, status: 'pending', activeQr: 'qr-missing' }),
        });
        QrCode.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
        const res = buildRes();
        await getQrStatus(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ qrExpired: true }) })
        );
    });

    it('200 – QR isUsed=true → treats as expired', async () => {
        Payment.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ user: { toString: () => 'user1' }, status: 'pending', activeQr: 'qr1' }),
        });
        QrCode.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ expiresAt: new Date(Date.now() + 5000), isUsed: true }),
        });
        const res = buildRes();
        await getQrStatus(req, res);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ qrExpired: true, secondsLeft: 0 }) })
        );
    });

    it('200 – QR time past expiresAt → treats as expired', async () => {
        Payment.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ user: { toString: () => 'user1' }, status: 'pending', activeQr: 'qr1' }),
        });
        QrCode.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ expiresAt: new Date(Date.now() - 1000), isUsed: false }),
        });
        const res = buildRes();
        await getQrStatus(req, res);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ qrExpired: true, secondsLeft: 0 }) })
        );
    });

    it('500 – handles unexpected errors', async () => {
        Payment.findById = jest.fn().mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('fail')) });
        const res = buildRes();
        await getQrStatus(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  confirmCashPayment
// ══════════════════════════════════════════════════════════════════════════════

describe('confirmCashPayment', () => {
    const adminReq = { params: { id: 'pay1' }, user: { id: 'admin1', role: 'admin' } };

    it('403 – non-admin user', async () => {
        const res = buildRes();
        await confirmCashPayment({ params: { id: 'p1' }, user: { id: 'u1', role: 'user' } }, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('404 – payment not found', async () => {
        Payment.findById = jest.fn().mockResolvedValue(null);
        const res = buildRes();
        await confirmCashPayment(adminReq, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 – not a cash payment', async () => {
        Payment.findById = jest.fn().mockResolvedValue({ method: 'qr', status: 'pending', save: jest.fn() });
        const res = buildRes();
        await confirmCashPayment(adminReq, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not a cash payment' }));
    });

    it('400 – payment not pending', async () => {
        Payment.findById = jest.fn().mockResolvedValue({ method: 'cash', status: 'completed', save: jest.fn() });
        const res = buildRes();
        await confirmCashPayment(adminReq, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('200 – confirms cash payment', async () => {
        const payment = {
            _id: 'pay1', method: 'cash', status: 'pending', amount: 300,
            reservation: 'res1',
            save: jest.fn().mockResolvedValue(true),
        };
        Payment.findById              = jest.fn().mockResolvedValue(payment);
        Reservation.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

        const res = buildRes();
        await confirmCashPayment(adminReq, res);
        expect(payment.status).toBe('completed');
        expect(payment.cashConfirmedBy).toBe('admin1');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('500 – handles unexpected errors', async () => {
        Payment.findById = jest.fn().mockRejectedValue(new Error('db error'));
        const res = buildRes();
        await confirmCashPayment(adminReq, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  getPendingCashPayments
// ══════════════════════════════════════════════════════════════════════════════

describe('getPendingCashPayments', () => {
    it('403 – non-admin user', async () => {
        const res = buildRes();
        await getPendingCashPayments({ user: { role: 'user' } }, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('200 – returns pending cash payments', async () => {
        const payments = [{ _id: 'p1' }, { _id: 'p2' }];
        Payment.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort:     jest.fn().mockReturnThis(),
            lean:     jest.fn().mockResolvedValue(payments),
        });

        const res = buildRes();
        await getPendingCashPayments({ user: { role: 'admin' } }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, count: 2, data: payments })
        );
    });

    it('500 – handles unexpected errors', async () => {
        Payment.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            sort:     jest.fn().mockReturnThis(),
            lean:     jest.fn().mockRejectedValue(new Error('fail')),
        });
        const res = buildRes();
        await getPendingCashPayments({ user: { role: 'admin' } }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  getPayment
// ══════════════════════════════════════════════════════════════════════════════

describe('getPayment', () => {
    it('404 – payment not found', async () => {
        Payment.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            lean:     jest.fn().mockResolvedValue(null),
        });
        const res = buildRes();
        await getPayment({ params: { id: 'bad' }, user: { id: 'u1', role: 'user' } }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('403 – user is not owner and not admin', async () => {
        const payment = { _id: 'p1', user: { _id: { toString: () => 'other-user' } } };
        Payment.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            lean:     jest.fn().mockResolvedValue(payment),
        });
        const res = buildRes();
        await getPayment({ params: { id: 'p1' }, user: { id: 'u1', role: 'user' } }, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('200 – owner can retrieve their own payment', async () => {
        const payment = { _id: 'p1', user: { _id: { toString: () => 'user1' } } };
        Payment.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            lean:     jest.fn().mockResolvedValue(payment),
        });
        const res = buildRes();
        await getPayment({ params: { id: 'p1' }, user: { id: 'user1', role: 'user' } }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: payment }));
    });

    it('200 – admin can retrieve any payment', async () => {
        const payment = { _id: 'p1', user: { _id: { toString: () => 'someone-else' } } };
        Payment.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            lean:     jest.fn().mockResolvedValue(payment),
        });
        const res = buildRes();
        await getPayment({ params: { id: 'p1' }, user: { id: 'admin1', role: 'admin' } }, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('500 – handles unexpected errors', async () => {
        Payment.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            lean:     jest.fn().mockRejectedValue(new Error('crash')),
        });
        const res = buildRes();
        await getPayment({ params: { id: 'p1' }, user: { id: 'u1', role: 'user' } }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  handleError – CastError and ValidationError branches
// ══════════════════════════════════════════════════════════════════════════════

describe('handleError – error type branches', () => {
    // We trigger the internal handleError by making a model throw a
    // specifically named error inside one of the exported controllers.

    it('400 – CastError is mapped to 400 invalid ID', async () => {
        const castErr = new Error('bad id');
        castErr.name = 'CastError';
        Payment.findById = jest.fn().mockRejectedValue(castErr);
        const res = buildRes();
        await confirmPayment({ params: { id: 'p1' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Invalid ID format' })
        );
    });

    it('400 – ValidationError is mapped to 400 with its message', async () => {
        const valErr = new Error('price is required');
        valErr.name = 'ValidationError';
        Payment.findById = jest.fn().mockRejectedValue(valErr);
        const res = buildRes();
        await confirmPayment({ params: { id: 'p1' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'price is required' })
        );
    });
});