const {
  createPayment,
  confirmCashPayment,
  getPendingCashPayments,
} = require("../controllers/payments");

jest.mock("../models/Payment");
jest.mock("../models/Reservation");

const Payment     = require("../models/Payment");
const Reservation = require("../models/Reservation");

// ─── helpers ─────────────────────────────────────────────────────────────────

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides = {}) => ({
  body:   {},
  query:  {},
  params: {},
  file:   null,
  user:   { id: "user-abc", role: "user" },
  ...overrides,
});

const makeReservation = (extra = {}) => ({
  _id:       "reservation-001",
  user:      { toString: () => "user-abc" },
  status:    "pending",
  room:      { _id: "room-001", name: "Room A", price: 100, coworkingSpace: "space-001" },
  timeSlots: [
    { _id: "slot-001", startTime: new Date(), endTime: new Date() },
    { _id: "slot-002", startTime: new Date(), endTime: new Date() },
  ],
  ...extra,
});

const makePayment = (extra = {}) => ({
  _id:             "payment-001",
  user:            { toString: () => "user-abc" },
  reservation:     "reservation-001",
  method:          "cash",
  status:          "pending",
  amount:          200,
  transactionId:   null,
  cashConfirmedBy: null,
  cashConfirmedAt: null,
  auditLog:        [],
  save:            jest.fn().mockResolvedValue(true),
  ...extra,
});

// Reservation.findById().populate().populate() chain
const mockReservationFind = (result) =>
  Reservation.findById.mockReturnValue({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(result),
    }),
  });

beforeEach(() => jest.clearAllMocks());

// ─── createPayment (cash selection) ──────────────────────────────────────────

describe("createPayment — cash flow", () => {

  test("✅ cash selected — creates payment with status pending, returns 201", async () => {
    mockReservationFind(makeReservation());
    Payment.findOne.mockResolvedValue(null);
    Payment.create.mockResolvedValue({
      _id: "payment-001", method: "cash", status: "pending",
    });

    const req = mockReq({
      body: { reservationId: "reservation-001", method: "cash", amount: 200 },
    });
    const res = mockRes();

    await createPayment(req, res);

    expect(Payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ method: "cash", status: "pending" })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test("✅ response includes method 'cash' and status 'pending' for UI instruction", async () => {
    mockReservationFind(makeReservation());
    Payment.findOne.mockResolvedValue(null);
    Payment.create.mockResolvedValue({
      _id: "payment-001", method: "cash", status: "pending",
    });

    const req = mockReq({
      body: { reservationId: "reservation-001", method: "cash", amount: 200 },
    });
    const res = mockRes();

    await createPayment(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ method: "cash", status: "pending" }),
      })
    );
  });

  test("✅ amount from req.body passed directly to Payment.create", async () => {
    // controller uses req.body.amount, not room.price × slots
    mockReservationFind(makeReservation());
    Payment.findOne.mockResolvedValue(null);
    Payment.create.mockResolvedValue({ _id: "p1", method: "cash", status: "pending" });

    const req = mockReq({
      body: { reservationId: "reservation-001", method: "cash", amount: 350 },
    });
    const res = mockRes();

    await createPayment(req, res);

    expect(Payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 350 })
    );
  });

  test("❌ missing amount — returns 400", async () => {
    const req = mockReq({
      body: { reservationId: "reservation-001", method: "cash" }, // no amount
    });
    const res = mockRes();

    await createPayment(req, res);

    expect(Payment.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "reservationId, method, and amount are required",
      })
    );
  });

  test("❌ missing reservationId — returns 400", async () => {
    const req = mockReq({
      body: { method: "cash", amount: 200 },
    });
    const res = mockRes();

    await createPayment(req, res);

    expect(Payment.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ already has active payment — returns 400, no duplicate created", async () => {
    mockReservationFind(makeReservation());
    Payment.findOne.mockResolvedValue(makePayment({ status: "pending" }));

    const req = mockReq({
      body: { reservationId: "reservation-001", method: "cash", amount: 200 },
    });
    const res = mockRes();

    await createPayment(req, res);

    expect(Payment.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "A payment already exists for this reservation",
      })
    );
  });

  test("❌ reservation not pending (cancelled) — returns 400", async () => {
    mockReservationFind(makeReservation({ status: "cancelled" }));

    const req = mockReq({
      body: { reservationId: "reservation-001", method: "cash", amount: 200 },
    });
    const res = mockRes();

    await createPayment(req, res);

    expect(Payment.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ non-owner tries to pay — returns 403", async () => {
    mockReservationFind(makeReservation({
      user: { toString: () => "other-user-id" },
    }));

    const req = mockReq({
      body: { reservationId: "reservation-001", method: "cash", amount: 200 },
      user: { id: "user-abc", role: "user" },
    });
    const res = mockRes();

    await createPayment(req, res);

    expect(Payment.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("❌ reservation not found — returns 404", async () => {
    mockReservationFind(null);

    const req = mockReq({
      body: { reservationId: "nonexistent", method: "cash", amount: 200 },
    });
    const res = mockRes();

    await createPayment(req, res);

    expect(Payment.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Reservation not found" })
    );
  });
});

// ─── confirmCashPayment ───────────────────────────────────────────────────────
// NOTE: role guard is route-level middleware (authorize('admin')).
// Controller calls Payment.findById first — no internal role check.

describe("confirmCashPayment controller", () => {

  test("✅ confirms cash — payment status set to completed, returns 200", async () => {
    const payment = makePayment({ method: "cash", status: "pending" });
    Payment.findById.mockResolvedValue(payment);
    Reservation.findByIdAndUpdate.mockResolvedValue({});

    const req = mockReq({ params: { id: "payment-001" }, user: { id: "admin-id", role: "admin" } });
    const res = mockRes();

    await confirmCashPayment(req, res);

    expect(payment.status).toBe("completed");
    expect(payment.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test("✅ reservation updated to success", async () => {
    const payment = makePayment({ method: "cash", status: "pending" });
    Payment.findById.mockResolvedValue(payment);
    Reservation.findByIdAndUpdate.mockResolvedValue({});

    const req = mockReq({ params: { id: "payment-001" }, user: { id: "admin-id", role: "admin" } });
    const res = mockRes();

    await confirmCashPayment(req, res);

    expect(Reservation.findByIdAndUpdate).toHaveBeenCalledWith(
      payment.reservation,
      { status: "success" }
    );
  });

  test("✅ transactionId generated with TXN- prefix", async () => {
    const payment = makePayment({ method: "cash", status: "pending" });
    Payment.findById.mockResolvedValue(payment);
    Reservation.findByIdAndUpdate.mockResolvedValue({});

    const req = mockReq({ params: { id: "payment-001" }, user: { id: "admin-id", role: "admin" } });
    const res = mockRes();

    await confirmCashPayment(req, res);

    expect(payment.transactionId).toMatch(/^TXN-/);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transactionId: expect.stringMatching(/^TXN-/),
        }),
      })
    );
  });

  test("✅ cashConfirmedBy and cashConfirmedAt recorded on payment", async () => {
    const payment = makePayment({ method: "cash", status: "pending" });
    Payment.findById.mockResolvedValue(payment);
    Reservation.findByIdAndUpdate.mockResolvedValue({});

    const req = mockReq({ params: { id: "payment-001" }, user: { id: "admin-id", role: "admin" } });
    const res = mockRes();

    await confirmCashPayment(req, res);

    expect(payment.cashConfirmedBy).toBe("admin-id");
    expect(payment.cashConfirmedAt).toBeInstanceOf(Date);
  });

  test("❌ not a cash payment — returns 400, save not called", async () => {
    const payment = makePayment({ method: "qr", status: "pending" });
    Payment.findById.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "payment-001" }, user: { id: "admin-id", role: "admin" } });
    const res = mockRes();

    await confirmCashPayment(req, res);

    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Not a cash payment" })
    );
  });

  test("❌ payment already completed — returns 400, save not called", async () => {
    const payment = makePayment({ method: "cash", status: "completed" });
    Payment.findById.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "payment-001" }, user: { id: "admin-id", role: "admin" } });
    const res = mockRes();

    await confirmCashPayment(req, res);

    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("Cannot confirm payment with status"),
      })
    );
  });

  test("❌ payment not found — returns 404", async () => {
    Payment.findById.mockResolvedValue(null);

    const req = mockReq({ params: { id: "nonexistent-id" }, user: { id: "admin-id", role: "admin" } });
    const res = mockRes();

    await confirmCashPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Payment not found" })
    );
  });
});

// ─── getPendingCashPayments ───────────────────────────────────────────────────
// NOTE: admin-only enforced at route level — no role check inside controller.

describe("getPendingCashPayments controller", () => {

  test("✅ returns pending cash payments with count", async () => {
    const payments = [
      { _id: "p1", method: "cash", status: "pending", user: { name: "Alice" } },
      { _id: "p2", method: "cash", status: "pending", user: { name: "Bob" } },
    ];
    Payment.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(payments),
          }),
        }),
      }),
    });

    const req = mockReq({ user: { id: "admin-id", role: "admin" } });
    const res = mockRes();

    await getPendingCashPayments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 2, data: payments })
    );
  });

  test("✅ returns empty list when no pending cash payments", async () => {
    Payment.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    const req = mockReq({ user: { id: "admin-id", role: "admin" } });
    const res = mockRes();

    await getPendingCashPayments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 0, data: [] })
    );
  });

  test("✅ queries only method=cash and status=pending", async () => {
    const findMock = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    Payment.find = findMock;

    const req = mockReq({ user: { id: "admin-id", role: "admin" } });
    const res = mockRes();

    await getPendingCashPayments(req, res);

    expect(findMock).toHaveBeenCalledWith({ method: "cash", status: "pending" });
  });

  test("✅ sorted by createdAt ascending (oldest first for admin action)", async () => {
    const sortMock = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    Payment.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({ sort: sortMock }),
      }),
    });

    const req = mockReq({ user: { id: "admin-id", role: "admin" } });
    const res = mockRes();

    await getPendingCashPayments(req, res);

    expect(sortMock).toHaveBeenCalledWith({ createdAt: 1 });
  });
});