const {
  adminCancelPayment,
} = require("../controllers/payments"); // adjust path if needed

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
  user:   { id: "admin-user-id", name: "Admin", role: "admin" },
  ...overrides,
});

// payment factory — auditLog is an array just like a real Mongoose doc
const makePayment = (extra = {}) => ({
  _id:        "payment-001",
  status:     "pending",
  reservation: "reservation-001",  // just an id — controller does separate findById
  auditLog:   [],
  save:       jest.fn().mockResolvedValue(true),
  ...extra,
});

const makeReservation = (extra = {}) => ({
  _id:    "reservation-001",
  status: "Active",
  save:   jest.fn().mockResolvedValue(true),
  ...extra,
});

beforeEach(() => jest.clearAllMocks());

// ─── adminCancelPayment ───────────────────────────────────────────────────────

describe("adminCancelPayment controller", () => {

  // ── Pending → Cancelled ─────────────────────────────────────────────────────

  test("✅ pending payment — sets status to cancelled, returns 200", async () => {
    const payment     = makePayment({ status: "pending" });
    const reservation = makeReservation();
    Payment.findById.mockResolvedValue(payment);
    Reservation.findById.mockResolvedValue(reservation);

    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    expect(payment.status).toBe("cancelled");
    expect(payment.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test("✅ pending payment — sets linked reservation status to cancelled", async () => {
    const payment     = makePayment({ status: "pending" });
    const reservation = makeReservation();
    Payment.findById.mockResolvedValue(payment);
    Reservation.findById.mockResolvedValue(reservation);

    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    expect(reservation.status).toBe("cancelled");
    expect(reservation.save).toHaveBeenCalled();
  });

  // ── Failed → Cancelled ──────────────────────────────────────────────────────

  test("✅ failed payment — also sets status to cancelled", async () => {
    const payment     = makePayment({ status: "failed" });
    const reservation = makeReservation();
    Payment.findById.mockResolvedValue(payment);
    Reservation.findById.mockResolvedValue(reservation);

    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    expect(payment.status).toBe("cancelled");
    expect(payment.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── Completed → Refund Required ─────────────────────────────────────────────

  test("✅ completed payment — sets payment status to refund_required", async () => {
    const payment     = makePayment({ status: "completed" });
    const reservation = makeReservation();
    Payment.findById.mockResolvedValue(payment);
    Reservation.findById.mockResolvedValue(reservation);

    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    expect(payment.status).toBe("refund_required");
    expect(payment.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("✅ completed payment — reservation still set to cancelled", async () => {
    const payment     = makePayment({ status: "completed" });
    const reservation = makeReservation();
    Payment.findById.mockResolvedValue(payment);
    Reservation.findById.mockResolvedValue(reservation);

    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    expect(reservation.status).toBe("cancelled");
    expect(reservation.save).toHaveBeenCalled();
  });

  // ── Audit log ───────────────────────────────────────────────────────────────

  test("✅ audit log — push entry with changedBy, action, oldStatus, newStatus, timestamp", async () => {
    const payment     = makePayment({ status: "pending" });
    const reservation = makeReservation();
    Payment.findById.mockResolvedValue(payment);
    Reservation.findById.mockResolvedValue(reservation);

    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    expect(payment.auditLog).toHaveLength(1);
    expect(payment.auditLog[0]).toMatchObject({
      changedBy: "admin-user-id",
      action:    "cancel",
      oldStatus: "pending",
      newStatus: "cancelled",
      timestamp: expect.any(Date),
    });
  });

  test("✅ audit log — completed payment logs refund_required as newStatus", async () => {
    const payment     = makePayment({ status: "completed" });
    const reservation = makeReservation();
    Payment.findById.mockResolvedValue(payment);
    Reservation.findById.mockResolvedValue(reservation);

    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    expect(payment.auditLog[0]).toMatchObject({
      changedBy: "admin-user-id",
      action:    "cancel",
      oldStatus: "completed",
      newStatus: "refund_required",
    });
  });

  // ── UI state (response shape) ───────────────────────────────────────────────

  test("✅ response includes payment data and reservationStatus for UI", async () => {
    const payment     = makePayment({ status: "pending" });
    const reservation = makeReservation();
    Payment.findById.mockResolvedValue(payment);
    Reservation.findById.mockResolvedValue(reservation);

    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          payment:           expect.anything(),
          reservationStatus: "Cancelled",
        }),
      })
    );
  });

  // ── Slot released (via reservation cancellation) ────────────────────────────

  test("✅ slot released — Reservation.findById called with payment's reservation id", async () => {
    const payment     = makePayment({ status: "pending", reservation: "reservation-001" });
    const reservation = makeReservation();
    Payment.findById.mockResolvedValue(payment);
    Reservation.findById.mockResolvedValue(reservation);

    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    // Controller must look up the reservation using the id stored on payment
    expect(Reservation.findById).toHaveBeenCalledWith("reservation-001");
    expect(reservation.save).toHaveBeenCalled();
  });

  test("✅ no reservation linked — payment still cancelled without crash", async () => {
    const payment = makePayment({ status: "pending", reservation: null });
    Payment.findById.mockResolvedValue(payment);
    Reservation.findById.mockResolvedValue(null); // no reservation found

    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    expect(payment.status).toBe("cancelled");
    expect(payment.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  test("❌ payment not found — returns 404", async () => {
    Payment.findById.mockResolvedValue(null);

    const req = mockReq({ params: { id: "nonexistent-id" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Payment not found" })
    );
  });

  test("❌ already cancelled — returns 400 and blocks double-cancel", async () => {
    const payment = makePayment({ status: "cancelled" });
    Payment.findById.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();

    await adminCancelPayment(req, res);

    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
  test("❌ already cancelled — returns 400 and blocks double-cancel", async () => {
    const payment = makePayment({ status: "cancelled" });
    Payment.findById.mockResolvedValue(payment);
 
    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();
 
    await adminCancelPayment(req, res);
 
    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
 
  // ── Catch block ─────────────────────────────────────────────────────────────
 
  test("❌ DB error — catch block returns 500", async () => {
    Payment.findById.mockRejectedValue(new Error("DB connection lost"));
 
    const req = mockReq({ params: { id: "payment-001" } });
    const res = mockRes();
 
    await adminCancelPayment(req, res);
 
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});