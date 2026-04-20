const { generateDailySlots } = require('../utils/generateTimeSlots');

jest.mock('../models/TimeSlot', () => ({
  find: jest.fn(),
  insertMany: jest.fn(),
}));

const TimeSlot = require('../models/TimeSlot');

beforeEach(() => jest.clearAllMocks());

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a fake TimeSlot document.
 * Uses UTC hours so timestamps match what the production code generates
 * (new Date(dateStr).setHours(...) runs in local time, but we compare
 *  via getTime(), so we mirror exactly how the code constructs dates).
 */
function makeSlot(hour, dateStr = '2024-01-01', roomId = 'room-123') {
  const start = new Date(dateStr);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(hour + 1, 0, 0, 0);
  return { _id: `slot-${hour}`, room: roomId, startTime: start, endTime: end };
}

/**
 * Wire TimeSlot.find for a single test:
 *   call 1 → await TimeSlot.find(…)          resolves to existingSlots (array)
 *   call 2 → TimeSlot.find(…).sort(…)        resolves to finalSlots
 */
function mockFind(existingSlots, finalSlots) {
  TimeSlot.find
    .mockResolvedValueOnce(existingSlots)
    .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue(finalSlots) });
}

// ─────────────────────────────────────────────────────────────────────────────
// generateDailySlots
// ─────────────────────────────────────────────────────────────────────────────
describe('generateDailySlots', () => {
  const ROOM_ID  = 'room-123';
  const DATE_STR = '2024-01-01';

  // ── creates all slots when none exist ──────────────────────────────────────
  test('creates all slots when no slots exist for that day', async () => {
    const finalSlots = [makeSlot(8), makeSlot(9)];
    mockFind([], finalSlots);
    TimeSlot.insertMany.mockResolvedValue(finalSlots);

    const result = await generateDailySlots(ROOM_ID, DATE_STR, '08:00', '10:00');

    expect(TimeSlot.insertMany).toHaveBeenCalledTimes(1);
    const docs = TimeSlot.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(2);
    expect(docs[0].startTime.getHours()).toBe(8);
    expect(docs[1].startTime.getHours()).toBe(9);
    expect(docs[0].room).toBe(ROOM_ID);
    expect(result).toEqual(finalSlots);
  });

  // ── skips slots that already exist ─────────────────────────────────────────
  test('skips slots whose startTime already exists in the DB', async () => {
    const slot8 = makeSlot(8);
    const finalSlots = [slot8, makeSlot(9)];
    mockFind([slot8], finalSlots);
    TimeSlot.insertMany.mockResolvedValue([makeSlot(9)]);

    await generateDailySlots(ROOM_ID, DATE_STR, '08:00', '10:00');

    const docs = TimeSlot.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(1);
    expect(docs[0].startTime.getHours()).toBe(9);
  });

  // ── does NOT call insertMany when all slots already exist ──────────────────
  test('does not call insertMany when every slot already exists', async () => {
    const existing = [makeSlot(8), makeSlot(9)];
    mockFind(existing, existing);

    await generateDailySlots(ROOM_ID, DATE_STR, '08:00', '10:00');

    expect(TimeSlot.insertMany).not.toHaveBeenCalled();
  });

  // ── correct slot count for default window (08:00–20:00) ───────────────────
  test('creates 12 slots with default open/close times (08:00–20:00)', async () => {
    // Build 12 slots: hours 8..19
    const allSlots = Array.from({ length: 12 }, (_, i) => makeSlot(8 + i));
    mockFind([], allSlots);
    TimeSlot.insertMany.mockResolvedValue(allSlots);

    await generateDailySlots(ROOM_ID, DATE_STR); // use defaults

    const docs = TimeSlot.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(12);
    expect(docs[0].startTime.getHours()).toBe(8);
    expect(docs[11].startTime.getHours()).toBe(19);
  });

  // ── slot that would exceed closeTime is not created ────────────────────────
  test('omits a slot whose endTime would exceed closeTime', async () => {
    // 08:00–09:30 window → only 08:00–09:00 fits; 09:00–10:00 exceeds 09:30
    const finalSlots = [makeSlot(8)];
    mockFind([], finalSlots);
    TimeSlot.insertMany.mockResolvedValue(finalSlots);

    await generateDailySlots(ROOM_ID, DATE_STR, '08:00', '09:30');

    const docs = TimeSlot.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(1);
    expect(docs[0].startTime.getHours()).toBe(8);
    expect(docs[0].endTime.getHours()).toBe(9);
  });

  // ── openTime === closeTime → zero slots ────────────────────────────────────
  test('creates no slots when openTime equals closeTime', async () => {
    mockFind([], []);

    await generateDailySlots(ROOM_ID, DATE_STR, '10:00', '10:00');

    expect(TimeSlot.insertMany).not.toHaveBeenCalled();
  });

  // ── each slot spans exactly 1 hour ────────────────────────────────────────
  test('each created slot spans exactly 1 hour', async () => {
    const finalSlots = [makeSlot(8), makeSlot(9)];
    mockFind([], finalSlots);
    TimeSlot.insertMany.mockResolvedValue(finalSlots);

    await generateDailySlots(ROOM_ID, DATE_STR, '08:00', '10:00');

    const docs = TimeSlot.insertMany.mock.calls[0][0];
    for (const doc of docs) {
      const diffMs = doc.endTime.getTime() - doc.startTime.getTime();
      expect(diffMs).toBe(60 * 60 * 1000);
    }
  });

  // ── first find is queried with correct room + date range ──────────────────
  test('queries existing slots with correct room id and day boundary', async () => {
    mockFind([], []);

    await generateDailySlots(ROOM_ID, DATE_STR, '08:00', '10:00');

    const query = TimeSlot.find.mock.calls[0][0];
    expect(query.room).toBe(ROOM_ID);
    expect(query.startTime.$gte).toBeInstanceOf(Date);
    expect(query.startTime.$lte).toBeInstanceOf(Date);
    // $gte must be start-of-day 00:00:00.000
    expect(query.startTime.$gte.getHours()).toBe(0);
    expect(query.startTime.$gte.getMinutes()).toBe(0);
    expect(query.startTime.$gte.getSeconds()).toBe(0);
    // $lte must be end-of-day 23:59:59.999
    expect(query.startTime.$lte.getHours()).toBe(23);
    expect(query.startTime.$lte.getMinutes()).toBe(59);
    expect(query.startTime.$lte.getSeconds()).toBe(59);
  });

  // ── insertMany is called with { ordered: false } ───────────────────────────
  test('calls insertMany with { ordered: false }', async () => {
    mockFind([], [makeSlot(8)]);
    TimeSlot.insertMany.mockResolvedValue([makeSlot(8)]);

    await generateDailySlots(ROOM_ID, DATE_STR, '08:00', '09:00');

    expect(TimeSlot.insertMany).toHaveBeenCalledWith(
      expect.any(Array),
      { ordered: false }
    );
  });

  // ── final find is sorted ascending by startTime ───────────────────────────
  test('returns result sorted by startTime ascending', async () => {
    const sortMock = jest.fn().mockResolvedValue([makeSlot(8), makeSlot(9)]);
    TimeSlot.find
      .mockResolvedValueOnce([])                           // 1st call – existing (array)
      .mockReturnValueOnce({ sort: sortMock });            // 2nd call – final list
    TimeSlot.insertMany.mockResolvedValue([]);

    await generateDailySlots(ROOM_ID, DATE_STR, '08:00', '10:00');

    expect(sortMock).toHaveBeenCalledWith({ startTime: 1 });
  });

  // ── error: first find rejects ─────────────────────────────────────────────
  test('propagates error when TimeSlot.find (existing) rejects', async () => {
    TimeSlot.find.mockRejectedValueOnce(new Error('DB read error'));

    await expect(
      generateDailySlots(ROOM_ID, DATE_STR, '08:00', '10:00')
    ).rejects.toThrow('DB read error');
  });

  // ── error: insertMany rejects ─────────────────────────────────────────────
  test('propagates error when insertMany rejects', async () => {
    // existing = [] so the function will attempt to insert
    TimeSlot.find.mockResolvedValueOnce([]);
    TimeSlot.insertMany.mockRejectedValue(new Error('DB write error'));

    await expect(
      generateDailySlots(ROOM_ID, DATE_STR, '08:00', '09:00')
    ).rejects.toThrow('DB write error');
  });

  // ── error: final find (.sort) rejects ────────────────────────────────────
  test('propagates error when final TimeSlot.find (.sort) rejects', async () => {
    TimeSlot.find
      .mockResolvedValueOnce([])                                               // existing – ok
      .mockReturnValueOnce({ sort: jest.fn().mockRejectedValue(new Error('sort error')) }); // final – fail
    TimeSlot.insertMany.mockResolvedValue([]);

    await expect(
      generateDailySlots(ROOM_ID, DATE_STR, '08:00', '09:00')
    ).rejects.toThrow('sort error');
  });
});