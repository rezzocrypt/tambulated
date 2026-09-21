import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ALL_DAYS,
  addDays,
  dateKey,
  parseDateKey,
  mondayOf,
  shiftWeek,
  weekDates,
  weekdayNum,
} from '../src/utils/week.js';
import {
  FREQS,
  useKanban,
  freqDays,
  rruleFor,
  parseRrule,
  occurrenceFromEvent,
} from '../src/composables/useKanban.js';
import { setCalendarToken, clearCalendarToken } from '../src/composables/useGoogleCalendar.js';

const MON = new Date(2026, 0, 5); // Monday

let mockEvents;

function timed(id, { summary = 'Task', date = '2026-01-05', start = '09:00', end = '10:00', recurrence, recurringEventId } = {}) {
  const ev = {
    id,
    summary,
    start: { dateTime: `${date}T${start}:00` },
    end: { dateTime: `${date}T${end}:00` },
  };
  if (recurrence) ev.recurrence = [recurrence];
  if (recurringEventId) {
    ev.recurringEventId = recurringEventId;
    ev.originalStartTime = { dateTime: `${date}T${start}:00` };
  }
  return ev;
}

function allDay(id, { summary = 'Task', date = '2026-01-05', recurrence, recurringEventId } = {}) {
  const next = new Date(parseDateKey(date));
  next.setDate(next.getDate() + 1);
  const ev = {
    id,
    summary,
    start: { date: date },
    end: { date: dateKey(next) },
  };
  if (recurrence) ev.recurrence = [recurrence];
  if (recurringEventId) {
    ev.recurringEventId = recurringEventId;
    ev.originalStartTime = { date };
  }
  return ev;
}

function dailySeries(id, summary, { from = '2026-01-05', count = 1, start = '09:00', end = '10:00' } = {}) {
  const master = timed(id, { summary, date: from, start, end, recurrence: 'FREQ=DAILY' });
  const out = [master];
  const base = parseDateKey(from);
  for (let i = 1; i < count; i += 1) {
    const d = addDays(base, i);
    out.push(timed(`${id}-${i}`, {
      summary,
      date: dateKey(d),
      start,
      end,
      recurringEventId: id,
    }));
  }
  return out;
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function mockApi(url, opts = {}) {
  const method = opts.method || 'GET';
  const token = localStorage.getItem('gcal-token');
  expect(opts.headers?.Authorization).toBe(`Bearer ${token}`);

  if (method === 'GET' && url.includes('/events?')) {
    const params = new URLSearchParams(url.split('?')[1]);
    const min = params.get('timeMin').slice(0, 10);
    const max = params.get('timeMax').slice(0, 10);
    const items = mockEvents.filter((ev) => {
      const date = ev.start?.date ? ev.start.date.slice(0, 10) : ev.start?.dateTime?.slice(0, 10) || '';
      const orig = ev.originalStartTime?.date
        ? ev.originalStartTime.date.slice(0, 10)
        : ev.originalStartTime?.dateTime?.slice(0, 10);
      const d = orig || date;
      return d >= min && d <= max;
    });
    return jsonResponse({ items });
  }
  if (method === 'GET') {
    const id = decodeURIComponent(url.split('/').pop());
    const ev = mockEvents.find((e) => e.id === id) || mockEvents.find((e) => e.recurringEventId === id && !e.recurringEventId);
    return jsonResponse(ev || {});
  }
  if (method === 'POST') {
    const body = JSON.parse(opts.body);
    const event = { id: `gen-${mockEvents.length + 1}`, ...body };
    mockEvents.push(event);
    return jsonResponse(event);
  }
  if (method === 'PATCH') {
    const id = decodeURIComponent(url.split('/').pop());
    const body = JSON.parse(opts.body);
    const idx = mockEvents.findIndex((e) => e.id === id);
    if (idx >= 0) mockEvents[idx] = { ...mockEvents[idx], ...body };
    return jsonResponse(mockEvents[idx]);
  }
  if (method === 'DELETE') {
    const id = decodeURIComponent(url.split('/').pop());
    mockEvents = mockEvents.filter((e) => e.id !== id && e.recurringEventId !== id);
    return new Response(null, { status: 204 });
  }
  return jsonResponse({});
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('gcal-token', 'TEST_TOKEN');
  mockEvents = [];
  vi.stubGlobal('fetch', mockApi);
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearCalendarToken();
  localStorage.removeItem('kanban-done');
});

describe('week date utils', () => {
  it('maps weekday numbers Mon..Sun as 1..7', () => {
    expect(weekdayNum(new Date(2026, 0, 5))).toBe(1); // Mon
    expect(weekdayNum(new Date(2026, 0, 6))).toBe(2); // Tue
    expect(weekdayNum(new Date(2026, 0, 11))).toBe(7); // Sun
  });

  it('produces YYYY-MM-DD keys and parses them back', () => {
    expect(dateKey(MON)).toBe('2026-01-05');
    expect(parseDateKey('2026-01-05').getTime()).toBe(MON.getTime());
  });

  it('anchors a monday and shifts weeks', () => {
    expect(dateKey(mondayOf(new Date(2026, 0, 7)))).toBe('2026-01-05');
    expect(dateKey(mondayOf(new Date(2026, 0, 11)))).toBe('2026-01-05');
    expect(dateKey(mondayOf(new Date(2025, 11, 31)))).toBe('2025-12-29');
    expect(dateKey(shiftWeek(MON, 1))).toBe('2026-01-12');
    expect(dateKey(shiftWeek(MON, -1))).toBe('2025-12-29');
  });

  it('returns 7 dates starting on monday', () => {
    const dates = weekDates(MON);
    expect(dates.map(dateKey)).toEqual([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
      '2026-01-11',
    ]);
  });

  it('adds days across month bounds', () => {
    expect(dateKey(addDays(MON, 6))).toBe('2026-01-11');
    expect(dateKey(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
  });
});

describe('freqDays', () => {
  it('expands frequency presets', () => {
    expect(freqDays({ freq: 'daily', days: [] })).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(freqDays({ freq: 'weekdays', days: [] })).toEqual([1, 2, 3, 4, 5]);
    expect(freqDays({ freq: 'once', days: [6] })).toEqual([6]);
    expect(freqDays({ freq: 'custom', days: [5, 1] })).toEqual([1, 5]);
  });
});

describe('rrule round trip', () => {
  it('builds RRULEs for the supported frequencies', () => {
    expect(rruleFor('daily', [])).toBe('FREQ=DAILY');
    expect(rruleFor('weekdays', [])).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
    expect(rruleFor('custom', [1, 3, 5])).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
  });

  it('parses RRULEs back into the board model', () => {
    expect(parseRrule('')).toEqual({ freq: 'once', days: [] });
    expect(parseRrule('FREQ=DAILY')).toEqual({ freq: 'daily', days: [...ALL_DAYS] });
    expect(parseRrule('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')).toEqual({ freq: 'weekdays', days: [1, 2, 3, 4, 5] });
    expect(parseRrule('FREQ=WEEKLY;BYDAY=TU,TH')).toEqual({ freq: 'custom', days: [2, 4] });
  });
});

describe('useKanban store', () => {
  it('loads occurrences for the week from the calendar', async () => {
    mockEvents = dailySeries('s1', 'Brush teeth', { count: 7 });
    const { events, status, loadWeek } = useKanban();
    await loadWeek(MON);
    expect(status.value).toBe('ready');
    expect(events.value).toHaveLength(7);
    expect(events.value[0]).toMatchObject({ seriesId: 's1', text: 'Brush teeth', day: 1, dateStr: '2026-01-05', freq: 'daily' });
    expect(events.value[6]).toMatchObject({ day: 7, dateStr: '2026-01-11' });
  });

  it('inherits recurrence info on instances that omit it', async () => {
    const master = timed('s2', { summary: 'Yoga', date: '2026-01-05', recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE,FR', start: '08:00', end: '09:00' });
    mockEvents = [
      master,
      timed('s2-1', { summary: 'Yoga', date: '2026-01-07', start: '08:00', end: '09:00', recurringEventId: 's2' }),
      timed('s2-2', { summary: 'Yoga', date: '2026-01-09', start: '08:00', end: '09:00', recurringEventId: 's2' }),
    ];
    const { events, loadWeek } = useKanban();
    await loadWeek(MON);
    const days = events.value.map((ev) => ev.day);
    expect(days).toEqual([1, 3, 5]);
    for (const ev of events.value) {
      expect(ev.freq).toBe('custom');
      expect(ev.days).toEqual([1, 3, 5]);
    }
  });

  it('resolves an out-of-window series via the master fetch', async () => {
    const startFromPrevMonth = '2025-12-29';
    mockEvents = [
      timed('legacy-occ', { summary: 'Old series', date: '2026-01-05', start: '07:00', end: '08:00', recurringEventId: 'legacy' }),
    ];
    const realFetch = mockApi;
    const getEventSpy = vi.fn(async (url, opts) => {
      if (url.includes('/legacy')) {
        return jsonResponse(timed('legacy', { summary: 'Old series', date: startFromPrevMonth, recurrence: 'FREQ=WEEKLY;BYDAY=MO', start: '07:00', end: '08:00' }));
      }
      return realFetch(url, opts);
    });
    vi.stubGlobal('fetch', getEventSpy);
    const { events, loadWeek } = useKanban();
    await loadWeek(MON);
    expect(events.value[0].freq).toBe('custom');
    expect(events.value[0].days).toEqual([1]);
  });

  it('toggles done state locally without touching the calendar', async () => {
    mockEvents = dailySeries('s1', 'Run', { count: 1 });
    const { events, loadWeek, toggleDone, isDone } = useKanban();
    await loadWeek(MON);
    const series = events.value[0].seriesId;
    toggleDone(series, '2026-01-05');
    expect(isDone(series, '2026-01-05')).toBe(true);
    toggleDone(series, '2026-01-05');
    expect(isDone(series, '2026-01-05')).toBe(false);
  });

  it('creates a recurring event via POST and reflects it on the board', async () => {
    const { events, loadWeek, addTask } = useKanban();
    await loadWeek(MON);
    await addTask({ text: 'Drink water', freq: 'daily', time: '09:00', endTime: '09:30' });
    const created = mockEvents.find((e) => e.summary === 'Drink water');
    expect(created).toBeDefined();
    expect(created.recurrence).toEqual(['FREQ=DAILY']);
    expect(created.start.dateTime.startsWith('2026-01-05T09:00')).toBe(true);
    expect(created.end.dateTime).toBe('2026-01-05T09:30:00');
    expect(events.value.some((ev) => ev.text === 'Drink water')).toBe(true);
  });

  it('creates an all-day once event on the exact date', async () => {
    const { loadWeek, addTask } = useKanban();
    await loadWeek(MON);
    await addTask({ text: 'Trip', freq: 'once', date: '2026-03-15' });
    const created = mockEvents.find((e) => e.summary === 'Trip');
    expect(created.start).toEqual({ date: '2026-03-15' });
    expect(created.recurrence).toEqual([]);
  });

  it('patches a recurring task into custom days', async () => {
    mockEvents = dailySeries('s1', 'Daily', { count: 1 });
    const { loadWeek, updateTask, events } = useKanban();
    await loadWeek(MON);
    await updateTask('s1', { text: 'Daily', freq: 'custom', days: [1, 2, 4], time: '09:00', endTime: '' });
    const patched = mockEvents.find((e) => e.id === 's1');
    expect(patched.recurrence).toEqual(['FREQ=WEEKLY;BYDAY=MO,TU,TH']);
    expect(patched.summary).toBe('Daily');
    expect(events.value.length).toBeGreaterThanOrEqual(1);
  });

  it('moves a once occurrence to another day keeping its time', async () => {
    mockEvents = [timed('once1', { summary: 'Once', date: '2026-01-07', start: '11:00', end: '12:00' })];
    const { loadWeek, moveOccurrence } = useKanban();
    await loadWeek(MON);
    const moved = await moveOccurrence('once1', 3, 5);
    expect(moved).toBeTruthy();
    const patched = mockEvents.find((e) => e.id === 'once1');
    expect(patched.start.dateTime).toBe('2026-01-09T11:00:00');
  });

  it('moves a recurring occurrence and degrades to custom days', async () => {
    mockEvents = dailySeries('s1', 'Daily', { count: 2 });
    const { loadWeek, moveOccurrence } = useKanban();
    await loadWeek(MON);
    await moveOccurrence('s1', 2, 5);
    const patched = mockEvents.find((e) => e.id === 's1');
    expect(patched.recurrence).toEqual(['FREQ=WEEKLY;BYDAY=MO,WE,TH,FR,SA,SU']);
  });

  it('ignores no-op moves', async () => {
    mockEvents = [timed('once1', { summary: 'Once', date: '2026-01-07' })];
    const { loadWeek, moveOccurrence } = useKanban();
    await loadWeek(MON);
    expect(await moveOccurrence('once1', 3, 3)).toBe(false);
  });

  it('deletes an event and cleans its done entries', async () => {
    mockEvents = dailySeries('s1', 'Read', { count: 7 });
    const { loadWeek, removeTask, toggleDone } = useKanban();
    await loadWeek(MON);
    toggleDone('s1', '2026-01-05');
    expect(mockEvents.some((e) => e.id === 's1')).toBe(true);
    await removeTask('s1');
    expect(mockEvents.some((e) => e.id === 's1' || e.recurringEventId === 's1')).toBe(false);
  });

  it('computes week stats counting done occurrences', async () => {
    mockEvents = [
      ...dailySeries('d1', 'Daily', { count: 1 }),
      timed('o1', { summary: 'Once', date: '2026-01-09', start: '09:00', end: '10:00' }),
    ];
    const { loadWeek, toggleDone, weekStats } = useKanban();
    await loadWeek(MON);
    toggleDone('d1', '2026-01-05');
    expect(weekStats()).toEqual({ done: 1, total: 2 });
  });

  it('rejects the board when no token is configured', async () => {
    localStorage.removeItem('gcal-token');
    const { status, loadWeek, error } = useKanban();
    await loadWeek(MON);
    expect(status.value).toBe('error');
    expect(error.value).toBe('KCAL_NO_TOKEN');
  });

  it('exposes the known frequency presets', () => {
    expect(FREQS).toEqual(['once', 'daily', 'weekdays', 'custom']);
  });

  it('parses a single event occurrence', () => {
    const ev = occurrenceFromEvent(timed('x', { summary: 'Meet', date: '2026-01-06', start: '10:30', end: '11:00' }));
    expect(ev).toMatchObject({ seriesId: 'x', time: '10:30', endTime: '11:00', day: 2, freq: 'once' });
  });
});