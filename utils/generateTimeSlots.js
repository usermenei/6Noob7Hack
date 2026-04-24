const TimeSlot = require('../models/TimeSlot');

const TZ_OFFSET_HOURS = 7;

/**
 * Create a UTC Date from a UTC+7 local time safely
 */
function toUTCDate(dateStr, hour, minute) {
  const [year, month, day] = dateStr.split('-').map(Number);

  return new Date(Date.UTC(
    year,
    month - 1,
    day,
    hour - TZ_OFFSET_HOURS,
    minute,
    0,
    0
  ));
}

/**
 * Get full UTC range for a UTC+7 local day
 */
function getUTCDayRange(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);

  const start = new Date(Date.UTC(
    year,
    month - 1,
    day,
    -TZ_OFFSET_HOURS,
    0,
    0,
    0
  ));

  const end = new Date(Date.UTC(
    year,
    month - 1,
    day,
    23 - TZ_OFFSET_HOURS,
    59,
    59,
    999
  ));

  return { start, end };
}

async function generateDailySlots(
  roomId,
  dateStr,
  openTime = '08:00',
  closeTime = '20:00'
) {
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);

  const { start: startOfDay, end: endOfDay } = getUTCDayRange(dateStr);

  const existing = await TimeSlot.find({
    room: roomId,
    startTime: { $gte: startOfDay, $lte: endOfDay }
  });

  const existingStarts = new Set(
    existing.map(s => new Date(s.startTime).getTime())
  );

  const toCreate = [];

  let cursor = toUTCDate(dateStr, openHour, openMin);
  const closeDate = toUTCDate(dateStr, closeHour, closeMin);

  while (cursor < closeDate) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor);
    slotEnd.setUTCHours(slotEnd.getUTCHours() + 1);

    if (slotEnd > closeDate) break;

    if (!existingStarts.has(slotStart.getTime())) {
      toCreate.push({
        room: roomId,
        startTime: slotStart,
        endTime: slotEnd
      });
    }

    cursor.setUTCHours(cursor.getUTCHours() + 1);
  }

  if (toCreate.length > 0) {
    await TimeSlot.insertMany(toCreate, { ordered: false });
  }

  return TimeSlot.find({
    room: roomId,
    startTime: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ startTime: 1 });
}

module.exports = { generateDailySlots };