const { adminUpdatePaymentMethod } = require("../controllers/payments");

jest.mock("../models/Payment");
const Payment = require("../models/Payment");

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
  user:   { id: "admin-id", role: "admin" },
  ...overrides,
});

const makePayment = (extra = {}) => ({
  _id:      "payment-001",
  method:   "cash",
  status:   "pending",
  auditLog: [],
  save:     jest.fn().mockResolvedValue(true),
  ...extra,
});

beforeEach(() => jest.clearAllMocks());

// ─── adminUpdatePaymentMethod ─────────────────────────────────────────────────

describe("adminUpdatePaymentMethod controller", () => {

  // ── Happy path ──────────────────────────────────────────────────────────────

  test("✅ pending → qr — method updated, auditLog pushed, returns 200", async () => {
    const payment = makePayment({ method: "cash" });
    Payment.findById.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "payment-001" }, body: { method: "qr" } });
    const res = mockRes();

    await adminUpdatePaymentMethod(req, res);

    expect(payment.method).toBe("qr");
    expect(payment.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: payment })
    );
  });

  test("✅ pending → cash — method updated, returns 200", async () => {
    const payment = makePayment({ method: "qr" });
    Payment.findById.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "payment-001" }, body: { method: "cash" } });
    const res = mockRes();

    await adminUpdatePaymentMethod(req, res);

    expect(payment.method).toBe("cash");
    expect(payment.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── Audit log ───────────────────────────────────────────────────────────────

  test("✅ auditLog entry pushed with correct fields", async () => {
    const payment = makePayment({ method: "cash", status: "pending" });
    Payment.findById.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "payment-001" }, body: { method: "qr" } });
    const res = mockRes();

    await adminUpdatePaymentMethod(req, res);

    expect(payment.auditLog).toHaveLength(1);
    expect(payment.auditLog[0]).toMatchObject({
      changedBy: "admin-id",
      action:    "method_change",
      oldMethod: "cash",
      newMethod: "qr",
      oldStatus: "pending",
      newStatus: "pending",
      timestamp: expect.any(Date),
    });
  });

  // ── Business rule: block completed ─────────────────────────────────────────

  test("❌ completed payment — returns 400 'Cannot change method on a completed payment', save not called", async () => {
    const payment = makePayment({ status: "completed" });
    Payment.findById.mockResolvedValue(payment);

    const req = mockReq({ params: { id: "payment-001" }, body: { method: "qr" } });
    const res = mockRes();

    await adminUpdatePaymentMethod(req, res);

    expect(payment.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Cannot change method on a completed payment",
      })
    );
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  test("❌ missing method in body — returns 400", async () => {
    const req = mockReq({ params: { id: "payment-001" }, body: {} });
    const res = mockRes();

    await adminUpdatePaymentMethod(req, res);

    expect(Payment.findById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "method is required" })
    );
  });

  test("❌ payment not found — returns 404", async () => {
    Payment.findById.mockResolvedValue(null);

    const req = mockReq({ params: { id: "nonexistent" }, body: { method: "qr" } });
    const res = mockRes();

    await adminUpdatePaymentMethod(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Payment not found" })
    );
  });

  // ── Catch block ─────────────────────────────────────────────────────────────

  test("❌ DB error — catch block returns 500", async () => {
    Payment.findById.mockRejectedValue(new Error("DB connection lost"));

    const req = mockReq({ params: { id: "payment-001" }, body: { method: "qr" } });
    const res = mockRes();

    await adminUpdatePaymentMethod(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});