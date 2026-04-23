const { deleteReservation } = require("../controllers/reservations");

jest.mock("../models/Reservation");
jest.mock("../models/TimeSlot");
jest.mock("../models/Payment");

const Reservation = require("../models/Reservation");
const TimeSlot    = require("../models/TimeSlot");
const Payment     = require("../models/Payment");

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

// future slot — check-in has NOT passed yet
const futureSlot = () => ({
  _id:       "slot-001",
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
});

// past slot — check-in HAS passed
const pastSlot = () => ({
  _id:       "slot-002",
  startTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
});

const makeReservation = (extra = {}) => ({
  _id:       "reservation-001",
  user:      { toString: () => "user-abc" },
  timeSlots: ["slot-001"],
  status:    "pending",
  save:      jest.fn().mockResolvedValue(true),
  ...extra,
});

const makePayment = (extra = {}) => ({
  _id:    "payment-001",
  status: "pending",
  save:   jest.fn().mockResolvedValue(true),
  ...extra,
});

beforeEach(() => jest.clearAllMocks());

// ─── deleteReservation ────────────────────────────────────────────────────────

describe("deleteReservation controller", () => {

  // ── Unpaid cancel ───────────────────────────────────────────────────────────

  test("✅ unpaid pending — reservation set to cancelled, returns 200", async () => {
    const reservation = makeReservation({ status: "pending" });
    const payment     = makePayment({ status: "pending" });

    Reservation.findById.mockResolvedValue(reservation);
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([futureSlot()]) });
    Payment.findOne.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "reservation-001" } });
    const res = mockRes();

    await deleteReservation(req, res);

    expect(reservation.status).toBe("cancelled");
    expect(reservation.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Reservation cancelled" })
    );
  });

  test("✅ unpaid pending — associated pending payment also set to cancelled", async () => {
    const reservation = makeReservation({ status: "pending" });
    const payment     = makePayment({ status: "pending" });

    Reservation.findById.mockResolvedValue(reservation);
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([futureSlot()]) });
    Payment.findOne.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "reservation-001" } });
    const res = mockRes();

    await deleteReservation(req, res);

    expect(payment.status).toBe("cancelled");
    expect(payment.save).toHaveBeenCalled();
  });

  test("✅ no payment record — reservation cancelled cleanly without crash", async () => {
    const reservation = makeReservation({ status: "pending" });

    Reservation.findById.mockResolvedValue(reservation);
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([futureSlot()]) });
    Payment.findOne.mockResolvedValue(null);

    const req = mockReq({ params: { id: "reservation-001" } });
    const res = mockRes();

    await deleteReservation(req, res);

    expect(reservation.status).toBe("cancelled");
    expect(reservation.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── Slot released (implicit) ────────────────────────────────────────────────

  test("✅ slot released — reservation status leaves pending/success pool after cancel", async () => {
    const reservation = makeReservation({ status: "pending" });
    const payment     = makePayment({ status: "pending" });

    Reservation.findById.mockResolvedValue(reservation);
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([futureSlot()]) });
    Payment.findOne.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "reservation-001" } });
    const res = mockRes();

    await deleteReservation(req, res);

    // Slot release is implicit: reservation.status is no longer pending/success
    expect(reservation.status).toBe("cancelled");
    expect(reservation.save).toHaveBeenCalled();
  });

  // ── Paid cancel ─────────────────────────────────────────────────────────────

  test("✅ paid cancel — reservation set to cancelled, returns 200", async () => {
    const reservation = makeReservation({ status: "success" });
    const payment     = makePayment({ status: "completed" });

    Reservation.findById.mockResolvedValue(reservation);
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([futureSlot()]) });
    Payment.findOne.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "reservation-001" } });
    const res = mockRes();

    await deleteReservation(req, res);

    expect(reservation.status).toBe("cancelled");
    expect(reservation.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("✅ paid cancel — payment status set to refund_required", async () => {
    const reservation = makeReservation({ status: "success" });
    const payment     = makePayment({ status: "completed" });

    Reservation.findById.mockResolvedValue(reservation);
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([futureSlot()]) });
    Payment.findOne.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "reservation-001" } });
    const res = mockRes();

    await deleteReservation(req, res);

    expect(payment.status).toBe("refund_required");
    expect(payment.save).toHaveBeenCalled();
  });

  test("✅ paid cancel — response message tells user admin has been notified", async () => {
    const reservation = makeReservation({ status: "success" });
    const payment     = makePayment({ status: "completed" });

    Reservation.findById.mockResolvedValue(reservation);
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([futureSlot()]) });
    Payment.findOne.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "reservation-001" } });
    const res = mockRes();

    await deleteReservation(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Reservation cancelled. Payment marked as refund_required and admin notified.",
      })
    );
  });

  // ── Past reservation block ──────────────────────────────────────────────────

  test("❌ check-in time has passed — returns 400, nothing saved", async () => {
    const reservation = makeReservation();
    const payment     = makePayment();

    Reservation.findById.mockResolvedValue(reservation);
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([pastSlot()]) });
    Payment.findOne.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "reservation-001" } });
    const res = mockRes();

    await deleteReservation(req, res);

    expect(reservation.save).not.toHaveBeenCalled();
    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Cannot cancel reservation after check-in time has passed",
      })
    );
  });

  test("❌ no time slots found — past check skipped, reservation cancelled normally", async () => {
    // slots array empty → firstStart is null → past-check is skipped
    const reservation = makeReservation({ timeSlots: [] });

    Reservation.findById.mockResolvedValue(reservation);
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    Payment.findOne.mockResolvedValue(null);

    const req = mockReq({ params: { id: "reservation-001" } });
    const res = mockRes();

    await deleteReservation(req, res);

    expect(reservation.status).toBe("cancelled");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── Authorization ───────────────────────────────────────────────────────────

  test("❌ non-owner non-admin — returns 403, nothing saved", async () => {
    const reservation = makeReservation({
      user: { toString: () => "other-user-id" },
    });

    Reservation.findById.mockResolvedValue(reservation);

    const req = mockReq({
      params: { id: "reservation-001" },
      user:   { id: "random-user-id", role: "user" },
    });
    const res = mockRes();

    await deleteReservation(req, res);

    expect(reservation.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Not authorized" })
    );
  });

  test("✅ admin can cancel any user's reservation", async () => {
    const reservation = makeReservation({
      user: { toString: () => "other-user-id" },
    });

    Reservation.findById.mockResolvedValue(reservation);
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([futureSlot()]) });
    Payment.findOne.mockResolvedValue(null);

    const req = mockReq({
      params: { id: "reservation-001" },
      user:   { id: "admin-id", role: "admin" },
    });
    const res = mockRes();

    await deleteReservation(req, res);

    expect(reservation.status).toBe("cancelled");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  test("❌ reservation not found — returns 404", async () => {
    Reservation.findById.mockResolvedValue(null);

    const req = mockReq({ params: { id: "nonexistent-id" } });
    const res = mockRes();

    await deleteReservation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Reservation not found" })
    );
  });

  // ── Active reservation count (implicit) ─────────────────────────────────────

  test("✅ after cancel — reservation no longer in pending/success pool (count decreases implicitly)", async () => {
    const reservation = makeReservation({ status: "pending" });

    Reservation.findById.mockResolvedValue(reservation);
    TimeSlot.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([futureSlot()]) });
    Payment.findOne.mockResolvedValue(null);

    const req = mockReq({ params: { id: "reservation-001" } });
    const res = mockRes();

    await deleteReservation(req, res);

    // status is now 'cancelled' — excluded from pending/success count queries
    expect(["pending", "success"]).not.toContain(reservation.status);
  });
});