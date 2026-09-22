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
  checkCalendarConnection,
  freqDays,
  rruleFor,
  parseRrule,
  occurrenceFromEvent,
} from '../src/composables/useKanban.js';
import {
  setAccount,
  setCalendar,
  setTasksCalendar,
  clearAccount,
} from '../src/composables/useYandexCalendar.js';
import { createCalDavMock } from './caldavMock.js';

const MON = new Date(2026, 0, 5); // Monday
const ACCOUNT = { login: 'user@yandex.ru', password: 'app-password' };
const CALENDAR = { href: '/cal/dflt/', displayName: 'Основной календарь' };
const TASKS_CALENDAR = { href: '/cal/tasks/', displayName: 'Задачи', component: 'VTODO' };

let mockEvents;
let mocks;

function timed(uid, { summary = 'Task', date = '2026-01-05', start = '09:00', end = '10:00', recurrence = '', href } = {}) {
  const ev = {
    uid,
    summary,
    start: { dateTime: `${date}T${start}:00` },
    end: { dateTime: `${date}T${end}:00` },
    recurrence,
    etag: '"e1"',
  };
  ev.href = href || `/cal/dflt/${uid}.ics`;
  return ev;
}

function allDay(uid, { summary = 'Task', date = '2026-01-05', recurrence = '' } = {}) {
  const next = new Date(parseDateKey(date));
  next.setDate(next.getDate() + 1);
  return {
    uid,
    summary,
    start: { date },
    end: { date: dateKey(next) },
    recurrence,
    etag: '"e1"',
    href: `/cal/dflt/${uid}.ics`,
  };
}

function dailyMaster(uid, summary, { from = '2026-01-05', start = '09:00', end = '10:00' } = {}) {
  return timed(uid, { summary, date: from, start, end, recurrence: 'FREQ=DAILY' });
}

function todo(uid, { summary = 'Task', date = '', start = '', end = '', status = 'NEEDS-ACTION', recurrence = '' } = {}) {
  const ev = {
    uid,
    summary,
    status,
    recurrence,
    etag: '"e2"',
    href: `/cal/tasks/${uid}.ics`,
    kind: 'VTODO',
  };
  if (start) ev.start = { dateTime: `${date}T${start}:00` };
  else if (date) ev.start = { date };
  if (end) ev.due = { dateTime: `${date}T${end}:00` };
  return ev;
}

beforeEach(() => {
  localStorage.clear();
  setAccount(ACCOUNT.login, ACCOUNT.password);
  setCalendar(CALENDAR);
  setTasksCalendar(TASKS_CALENDAR);
  mockEvents = [];
  mocks = createCalDavMock({ account: ACCOUNT, calendars: [CALENDAR, TASKS_CALENDAR], events: mockEvents });
  vi.stubGlobal('fetch', mocks.handler);
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearAccount();
  localStorage.clear();
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
  it('loads occurrences for the week from the calendar by expanding the master', async () => {
    mockEvents.push(dailyMaster('s1', 'Brush teeth'));
    const { events, status, loadWeek } = useKanban();
    await loadWeek(MON);
    expect(status.value).toBe('ready');
    expect(events.value).toHaveLength(7);
    expect(events.value[0]).toMatchObject({ seriesId: 's1', text: 'Brush teeth', day: 1, dateStr: '2026-01-05', freq: 'daily' });
    expect(events.value[6]).toMatchObject({ day: 7, dateStr: '2026-01-11' });
  });

  it('expands a weekly custom series onto its weekdays', async () => {
    mockEvents.push(timed('s2', { summary: 'Yoga', date: '2026-01-05', start: '08:00', end: '09:00', recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' }));
    const { events, loadWeek } = useKanban();
    await loadWeek(MON);
    const days = events.value.map((ev) => ev.day);
    expect(days).toEqual([1, 3, 5]);
    for (const ev of events.value) {
      expect(ev.freq).toBe('custom');
      expect(ev.days).toEqual([1, 3, 5]);
    }
  });

  it('includes a recurring master that started before the shown week', async () => {
    mockEvents.push(timed('s3', { summary: 'Old daily', date: '2025-12-29', recurrence: 'FREQ=DAILY' }));
    const { events, loadWeek } = useKanban();
    await loadWeek(MON);
    expect(events.value).toHaveLength(7);
    expect(events.value[0]).toMatchObject({ day: 1, dateStr: '2026-01-05' });
  });

  it('checks connection as configured account and calendar', async () => {
    expect(await checkCalendarConnection()).toBe(true);
    clearAccount();
    expect(await checkCalendarConnection()).toBe(false);
  });

  it('toggles done state locally without touching the calendar', async () => {
    mockEvents.push(dailyMaster('s1', 'Run'));
    const { events, loadWeek, toggleDone, isDone } = useKanban();
    await loadWeek(MON);
    const series = events.value[0].seriesId;
    toggleDone(series, '2026-01-05');
    expect(isDone(series, '2026-01-05')).toBe(true);
    toggleDone(series, '2026-01-05');
    expect(isDone(series, '2026-01-05')).toBe(false);
  });

  it('creates a recurring event via PUT and reflects it on the board', async () => {
    const { events, loadWeek, addTask } = useKanban();
    await loadWeek(MON);
    await addTask({ text: 'Drink water', kind: 'event', freq: 'daily', time: '09:00', endTime: '09:30' });
    const created = mockEvents.find((e) => e.summary === 'Drink water');
    expect(created).toBeDefined();
    expect(created.kind).toBe('VEVENT');
    expect(created.recurrence).toBe('FREQ=DAILY');
    expect(created.start.dateTime.startsWith('2026-01-05T09:00')).toBe(true);
    expect(created.end.dateTime).toBe('2026-01-05T09:30:00');
    expect(events.value.some((ev) => ev.text === 'Drink water')).toBe(true);
  });

  it('creates an all-day once event on the exact date', async () => {
    const { loadWeek, addTask } = useKanban();
    await loadWeek(MON);
    await addTask({ text: 'Trip', kind: 'event', freq: 'once', date: '2026-03-15' });
    const created = mockEvents.find((e) => e.summary === 'Trip');
    expect(created.start).toEqual({ date: '2026-03-15' });
    expect(created.recurrence).toBe('');
  });

  it('creates a task in the tasks calendar by default as VTODO', async () => {
    const { events, loadWeek, addTask } = useKanban();
    await loadWeek(MON);
    await addTask({ text: 'Продукты', freq: 'once', date: '2026-01-06', time: '11:00', endTime: '12:00' });
    const created = mockEvents.find((e) => e.summary === 'Продукты');
    expect(created).toBeDefined();
    expect(created.kind).toBe('VTODO');
    expect(created.start.dateTime).toBe('2026-01-06T11:00:00');
    expect(created.due.dateTime).toBe('2026-01-06T12:00:00');
    expect(events.value.some((ev) => ev.text === 'Продукты' && ev.task)).toBe(true);
  });

  it('creates an undated once task with no DTSTART', async () => {
    const { events, loadWeek, addTask } = useKanban();
    await loadWeek(MON);
    await addTask({ text: 'Open task', kind: 'task', freq: 'once', date: '' });
    const created = mockEvents.find((e) => e.summary === 'Open task');
    expect(created).toBeDefined();
    expect(created.kind).toBe('VTODO');
    expect(created.start).toBeNull();
    const board = events.value.find((ev) => ev.text === 'Open task');
    expect(board).toMatchObject({ day: 0, undated: true, task: true });
  });

  it('loads dated and undated tasks alongside events', async () => {
    mockEvents.push(timed('e1', { summary: 'Meet' }));
    mockEvents.push(todo('t1', { summary: 'Dated task', date: '2026-01-07', start: '14:00' }));
    mockEvents.push(todo('t2', { summary: 'Open task' }));
    const { events, loadWeek } = useKanban();
    await loadWeek(MON);
    const tasks = events.value.filter((ev) => ev.task);
    expect(tasks).toHaveLength(2);
    const dated = tasks.find((ev) => ev.text === 'Dated task');
    expect(dated).toMatchObject({ day: 3, time: '14:00', task: true });
    const open = tasks.find((ev) => ev.text === 'Open task');
    expect(open).toMatchObject({ day: 0, undated: true });
  });

  it('toggles a task done and persists STATUS to the tasks calendar', async () => {
    mockEvents.push(todo('t1', { summary: 'Pay bills' }));
    const { loadWeek, toggleDone, isDone, events } = useKanban();
    await loadWeek(MON);
    await toggleDone('t1', '');
    expect(isDone('t1', '')).toBe(true);
    const rec = mockEvents.find((e) => e.uid === 't1');
    expect(rec.status).toBe('COMPLETED');
    await loadWeek(MON);
    expect(isDone('t1', '')).toBe(true);
  });

  it('moves an undated task onto a day', async () => {
    mockEvents.push(todo('t1', { summary: 'Call mom' }));
    const { loadWeek, moveOccurrence } = useKanban();
    await loadWeek(MON);
    await moveOccurrence('t1', 0, 2);
    const patched = mockEvents.find((e) => e.uid === 't1');
    expect(patched.start.date).toBe('2026-01-06');
  });

  it('patches a recurring task into custom days', async () => {
    mockEvents.push(dailyMaster('s1', 'Daily'));
    const { loadWeek, updateTask, events } = useKanban();
    await loadWeek(MON);
    await updateTask('s1', { text: 'Daily', freq: 'custom', days: [1, 2, 4], time: '09:00', endTime: '' });
    const patched = mockEvents.find((e) => e.uid === 's1');
    expect(patched.recurrence).toBe('FREQ=WEEKLY;BYDAY=MO,TU,TH');
    expect(patched.summary).toBe('Daily');
    expect(events.value.length).toBeGreaterThanOrEqual(1);
  });

  it('moves a once occurrence to another day keeping its time', async () => {
    mockEvents.push(timed('once1', { summary: 'Once', date: '2026-01-07', start: '11:00', end: '12:00' }));
    const { loadWeek, moveOccurrence } = useKanban();
    await loadWeek(MON);
    const moved = await moveOccurrence('once1', 3, 5);
    expect(moved).toBeTruthy();
    const patched = mockEvents.find((e) => e.uid === 'once1');
    expect(patched.start.dateTime).toBe('2026-01-09T11:00:00');
  });

  it('moves a recurring occurrence and degrades to custom days', async () => {
    mockEvents.push(dailyMaster('s1', 'Daily'));
    const { loadWeek, moveOccurrence } = useKanban();
    await loadWeek(MON);
    await moveOccurrence('s1', 2, 5);
    const patched = mockEvents.find((e) => e.uid === 's1');
    expect(patched.recurrence).toBe('FREQ=WEEKLY;BYDAY=MO,WE,TH,FR,SA,SU');
  });

  it('ignores no-op moves', async () => {
    mockEvents.push(timed('once1', { summary: 'Once', date: '2026-01-07' }));
    const { loadWeek, moveOccurrence } = useKanban();
    await loadWeek(MON);
    expect(await moveOccurrence('once1', 3, 3)).toBe(false);
  });

  it('deletes an event and cleans its done entries', async () => {
    mockEvents.push(dailyMaster('s1', 'Read'));
    const { loadWeek, removeTask, toggleDone } = useKanban();
    await loadWeek(MON);
    toggleDone('s1', '2026-01-05');
    expect(mockEvents.some((e) => e.uid === 's1')).toBe(true);
    await removeTask('s1');
    expect(mockEvents.some((e) => e.uid === 's1')).toBe(false);
  });

  it('computes week stats counting done occurrences', async () => {
    mockEvents.push(timed('o1', { summary: 'A', date: '2026-01-05' }), timed('o2', { summary: 'B', date: '2026-01-06' }));
    const { loadWeek, toggleDone, weekStats } = useKanban();
    await loadWeek(MON);
    toggleDone('o1', '2026-01-05');
    expect(weekStats()).toEqual({ done: 1, total: 2 });
  });

  it('rejects the board when no account is configured', async () => {
    clearAccount();
    const { status, loadWeek, error } = useKanban();
    await loadWeek(MON);
    expect(status.value).toBe('error');
    expect(error.value).toBe('KCAL_NO_ACCOUNT');
  });

  it('exposes the known frequency presets', () => {
    expect(FREQS).toEqual(['once', 'daily', 'weekdays', 'custom']);
  });

  it('parses a single event occurrence', () => {
    const ev = occurrenceFromEvent(timed('x', { summary: 'Meet', date: '2026-01-06', start: '10:30', end: '11:00' }));
    expect(ev).toMatchObject({ seriesId: 'x', time: '10:30', endTime: '11:00', day: 2, freq: 'once' });
  });

  it('parses an all-day occurrence', () => {
    const ev = occurrenceFromEvent(allDay('x', { date: '2026-01-06' }));
    expect(ev).toMatchObject({ seriesId: 'x', time: '', endTime: '', day: 2, freq: 'once', allDay: true });
  });
});