import { describe, it, expect, beforeEach } from 'vitest';
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
import { KANBAN_KEY, FREQS, useKanban, reloadKanban, freqDays } from '../src/composables/useKanban.js';

beforeEach(() => {
  localStorage.clear();
  reloadKanban();
});

const MON = new Date(2026, 0, 5); // Monday

function stored() {
  return JSON.parse(localStorage.getItem(KANBAN_KEY));
}

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

describe('useKanban store', () => {
  it('adds a daily task that occurs every day of the week', () => {
    const { tasks, occurrenceDates } = useKanban();
    const created = add(useKanban(), { text: 'Brush teeth', freq: 'daily' });
    expect(tasks.value).toHaveLength(1);
    expect(occurrenceDates(created, MON).map(dateKey)).toEqual([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
      '2026-01-11',
    ]);
  });

  it('adds a once task bound to only its own week and its own day', () => {
    const { occurrenceDates } = useKanban();
    const task = add(useKanban(), { text: 'Dentist', freq: 'once', days: [3], week: '2026-01-05' });
    expect(occurrenceDates(task, MON).map(dateKey)).toEqual(['2026-01-07']);
    expect(occurrenceDates(task, shiftWeek(MON, 1))).toEqual([]);
    expect(occurrenceDates(task, shiftWeek(MON, -1))).toEqual([]);
  });

  it('clamps a once task to a single day even if multiple are given', () => {
    const { occurrenceDates } = useKanban();
    const task = add(useKanban(), { text: 'Once', freq: 'once', days: [2, 4, 6], week: '2026-01-05' });
    expect(occurrenceDates(task, MON).map(dateKey)).toEqual(['2026-01-06']);
  });

  it('schedules a once task on an exact date regardless of the current week', () => {
    const { getTask, occurrenceDates } = useKanban();
    const task = add(useKanban(), { text: 'Trip', freq: 'once', date: '2026-03-15' });
    expect(occurrenceDates(task, MON)).toEqual([]);
    const weekOfTrip = parseDateKey('2026-03-09'); // Monday of the week containing Mar 15
    expect(occurrenceDates(task, weekOfTrip).map(dateKey)).toEqual(['2026-03-15']);

    const fresh = getTask(task.id);
    expect(fresh.date).toBe('2026-03-15');
    expect(fresh.days).toEqual([7]);
    expect(fresh.week).toBe('2026-03-09');
  });

  it('updates and removes tasks, cleaning done entries', () => {
    const { tasks, getTask, updateTask, removeTask, toggleDone, done } = useKanban();
    const task = add(useKanban(), { text: 'Read', freq: 'daily' });
    toggleDone(task.id, '2026-01-05');
    expect(done.value[task.id]).toEqual({ '2026-01-05': true });

    updateTask(task.id, { text: 'Read a book' });
    expect(getTask(task.id).text).toBe('Read a book');

    removeTask(task.id);
    expect(tasks.value).toHaveLength(0);
    expect(done.value[task.id]).toBeUndefined();
  });

  it('toggles done state on and off', () => {
    const { toggleDone, isDone } = useKanban();
    const task = add(useKanban(), { text: 'Run', freq: 'daily' });
    toggleDone(task.id, '2026-01-06');
    expect(isDone(task.id, '2026-01-06')).toBe(true);
    toggleDone(task.id, '2026-01-06');
    expect(isDone(task.id, '2026-01-06')).toBe(false);
  });

  it('moves a once occurrence to another day keeping its week', () => {
    const { getTask, occurrenceDates, moveOccurrence } = useKanban();
    const task = add(useKanban(), { text: 'Once', freq: 'once', days: [3], week: '2026-01-05' });
    expect(moveOccurrence(task.id, 3, 5)).toBe(true);
    const fresh = getTask(task.id);
    expect(occurrenceDates(fresh, MON).map(dateKey)).toEqual(['2026-01-09']);
    expect(freqDays(fresh)).toEqual([5]);
    expect(fresh.date).toBe('2026-01-09');
  });

  it('moves a recurring occurrence and degrades to custom days', () => {
    const { getTask, occurrenceDates, moveOccurrence } = useKanban();
    const daily = add(useKanban(), { text: 'Daily', freq: 'daily' });
    expect(moveOccurrence(daily.id, 2, 5)).toBe(true);
    const fresh = getTask(daily.id);
    expect(freqDays(fresh)).toEqual([1, 3, 4, 5, 6, 7]);
    const dates = occurrenceDates(fresh, MON).map(dateKey);
    expect(dates).not.toContain('2026-01-06');
    expect(dates).toContain('2026-01-09');
  });

  it('ignores no-op moves', () => {
    const { moveOccurrence } = useKanban();
    const task = add(useKanban(), { text: 'Standstill', freq: 'daily' });
    expect(moveOccurrence(task.id, 2, 2)).toBe(false);
    expect(freqDays(task)).toEqual(ALL_DAYS);
  });

  it('computes week stats counting done occurrences', () => {
    const { weekStats, toggleDone } = useKanban();
    const daily = add(useKanban(), { text: 'Daily', freq: 'daily' });
    const once = add(useKanban(), { text: 'Once', freq: 'once', days: [5], week: '2026-01-05' });
    toggleDone(daily.id, '2026-01-05');
    toggleDone(daily.id, '2026-01-06');
    toggleDone(once.id, '2026-01-09');
    expect(weekStats(MON)).toEqual({ done: 3, total: 8 });
    expect(weekStats(shiftWeek(MON, 1))).toEqual({ done: 0, total: 7 });
  });

  it('persists across a reload', () => {
    const { tasks, addTask: addOne } = useKanban();
    addOne({ text: 'Persisted', freq: 'daily', time: '09:00', endTime: '09:30' });
    expect(stored().v).toBe(1);
    expect(stored().tasks).toHaveLength(1);
    reloadKanban();
    expect(tasks.value[0].text).toBe('Persisted');
    expect(tasks.value[0].endTime).toBe('09:30');
  });

  it('normalizes old stored tasks to include an empty end time', () => {
    localStorage.setItem(KANBAN_KEY, JSON.stringify({
      v: 1,
      tasks: [{ id: 'legacy', text: 'Old', freq: 'daily', days: [1], time: '08:00' }],
      done: {},
    }));
    reloadKanban();
    expect(useKanban().tasks.value[0].endTime).toBe('');
  });

  it('falls back to an empty board for malformed storage', () => {
    localStorage.setItem(KANBAN_KEY, 'not json');
    reloadKanban();
    const { tasks } = useKanban();
    expect(tasks.value).toEqual([]);

    localStorage.setItem(KANBAN_KEY, JSON.stringify({ v: 99 }));
    reloadKanban();
    expect(useKanban().tasks.value).toEqual([]);
  });

  it('exports and imports a backup', () => {
    const { exportData, importData, tasks, done, toggleDone } = useKanban();
    const task = add(useKanban(), { text: 'Backup me', freq: 'custom', days: [2, 4] });
    toggleDone(task.id, '2026-01-06');

    const backup = exportData();
    expect(backup.v).toBe(1);
    expect(backup.tasks).toHaveLength(1);

    importData({ v: 1, tasks: [], done: {} });
    expect(tasks.value).toEqual([]);
    expect(stored().tasks).toEqual([]);

    importData(backup);
    expect(tasks.value).toHaveLength(1);
    expect(done.value[task.id]).toEqual({ '2026-01-06': true });
    expect(stored().tasks).toHaveLength(1);
  });

  it('exposes the known frequency presets', () => {
    expect(FREQS).toEqual(['once', 'daily', 'weekdays', 'custom']);
  });
});

function add(ctx, opts) {
  return ctx.addTask(opts);
}