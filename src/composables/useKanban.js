import { ref, computed } from 'vue';
import { ALL_DAYS, addDays, dateKey, mondayOf, parseDateKey, weekdayNum } from '@/utils/week.js';
import {
  getCalendarToken,
  listEvents,
  getEvent,
  insertEvent,
  patchEvent,
  deleteEvent,
} from '@/composables/useGoogleCalendar.js';

const DONE_KEY = 'kanban-done';

export const FREQS = ['once', 'daily', 'weekdays', 'custom'];

export const BYDAY = { 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA', 7: 'SU' };
const BYDAY_NUM = Object.fromEntries(Object.entries(BYDAY).map(([n, s]) => [s, Number(n)]));

export function freqDays(task) {
  if (task?.freq === 'daily') return [...ALL_DAYS];
  if (task?.freq === 'weekdays') return [1, 2, 3, 4, 5];
  const days = Array.isArray(task?.days) ? task.days : [];
  return ALL_DAYS.filter((day) => days.includes(day)).sort((a, b) => a - b);
}

export function rruleFor(freq, days) {
  if (freq === 'daily') return 'FREQ=DAILY';
  if (freq === 'weekdays') return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
  const set = (days || []).filter((day) => ALL_DAYS.includes(day)).sort((a, b) => a - b);
  return `FREQ=WEEKLY;BYDAY=${set.map((day) => BYDAY[day]).join(',')}`;
}

export function parseRrule(rrule) {
  if (!rrule) return { freq: 'once', days: [] };
  const params = {};
  for (const part of rrule.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) params[part.slice(0, idx)] = part.slice(idx + 1);
  }
  if (params.FREQ === 'DAILY') return { freq: 'daily', days: [...ALL_DAYS] };
  if (params.FREQ === 'WEEKLY') {
    const days = (params.BYDAY ? params.BYDAY.split(',') : [])
      .map((day) => BYDAY_NUM[day])
      .filter((day) => day);
    if (days.length === 5 && days.every((day) => day >= 1 && day <= 5)) {
      return { freq: 'weekdays', days: [1, 2, 3, 4, 5] };
    }
    return { freq: 'custom', days: days.length ? days : [] };
  }
  return { freq: 'custom', days: [] };
}

function parseTime(value) {
  if (!value) return { date: '', time: '' };
  return { date: value.slice(0, 10), time: value.length >= 16 ? value.slice(11, 16) : '' };
}

function buildStartEnd({ date, time, endTime }) {
  if (!time) {
    const next = new Date(parseDateKey(date));
    next.setDate(next.getDate() + 1);
    return {
      start: { date },
      end: { date: dateKey(next) },
    };
  }
  if (!endTime) {
    const next = new Date(parseDateKey(date));
    next.setDate(next.getDate() + 1);
    return {
      start: { dateTime: `${date}T${time}:00`, timeZone: 'UTC' },
      end: { date: dateKey(next) },
    };
  }
  return {
    start: { dateTime: `${date}T${time}:00`, timeZone: 'UTC' },
    end: { dateTime: `${date}T${endTime}:00`, timeZone: 'UTC' },
  };
}

function firstMatchingDate(monday, freq, days) {
  const set = freq === 'daily' ? [...ALL_DAYS] : freq === 'weekdays' ? [1, 2, 3, 4, 5] : freqDays({ freq, days });
  const startDay = weekdayNum(monday);
  const candidates = set.slice().sort((a, b) => a - b);
  const offset = candidates.find((day) => day >= startDay) ?? candidates[0];
  return dateKey(addDays(mondayOf(monday), (offset || 1) - 1));
}

export function occurrenceFromEvent(item) {
  const isRecurring = !!item.recurringEventId;
  const id = item.id;
  const seriesId = isRecurring ? item.recurringEventId : id;
  const original = item.originalStartTime || {};
  const startDate = item.start?.date || item.start?.dateTime || '';
  const endDate = item.end?.date || item.end?.dateTime || '';
  const allDay = !!item.start?.date;
  const start = allDay
    ? { date: startDate, time: '' }
    : { date: startDate.slice(0, 10), time: startDate.length >= 16 ? startDate.slice(11, 16) : '' };
  const end = allDay
    ? { date: endDate, time: '' }
    : { date: endDate.slice(0, 10), time: endDate.length >= 16 ? endDate.slice(11, 16) : '' };
  const occurrenceDate = isRecurring
    ? parseTime(original.dateTime || original.date).date
    : start.date;
  const rrule = Array.isArray(item.recurrence) ? item.recurrence[0] : '';
  const parsed = parseRrule(rrule);
  const fallbackDay = occurrenceDate ? weekdayNum(parseDateKey(occurrenceDate)) : 1;
  if (parsed.freq === 'custom' && !parsed.days.length) {
    parsed.days = [fallbackDay];
  }
  return {
    id,
    seriesId,
    text: item.summary || '',
    dateStr: occurrenceDate || start.date || '',
    day: occurrenceDate ? weekdayNum(parseDateKey(occurrenceDate)) : 1,
    time: start.time,
    endTime: end.time && end.date >= start.date ? end.time : '',
    allDay,
    freq: parsed.freq,
    days: parsed.days,
    recurrence: rrule,
    originalStart: original,
    isMaster: !isRecurring && !!rrule,
  };
}

function readDone() {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistDone(done) {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify(done));
  } catch {
    /* storage unavailable — keep in memory */
  }
}

const done = ref(readDone());

const state = ref({
  status: 'idle',
  monday: null,
  events: [],
  error: '',
  saving: false,
});

export async function checkCalendarConnection(interactive = false) {
  try {
    await getCalendarToken({ interactive });
    return true;
  } catch {
    return false;
  }
}

export function reloadKanban() {
  done.value = readDone();
  state.value = { status: 'idle', monday: null, events: [], error: '', saving: false };
}

export function useKanban() {
  const events = computed(() => state.value.events);
  const status = computed(() => state.value.status);
  const error = computed(() => state.value.error);
  const saving = computed(() => state.value.saving);

  function isDone(seriesId, dateStr) {
    return !!done.value[seriesId]?.[dateStr];
  }

  function toggleDone(seriesId, dateStr) {
    const current = done.value[seriesId] || {};
    const next = { ...current };
    if (next[dateStr]) {
      delete next[dateStr];
    } else {
      next[dateStr] = true;
    }
    if (Object.keys(next).length) {
      done.value = { ...done.value, [seriesId]: next };
    } else {
      const rest = { ...done.value };
      delete rest[seriesId];
      done.value = rest;
    }
    persistDone(done.value);
  }

  async function reloadWeek() {
    const monday = state.value.monday;
    if (!monday) return;
    state.value = { ...state.value, status: 'loading', error: '' };
    try {
      const res = await listEvents(monday);
      const items = Array.isArray(res?.items) ? res.items : [];
      const parsed = items.map(occurrenceFromEvent);
      const seriesMeta = {};
      for (const ev of parsed) {
        if (ev.isMaster && ev.recurrence) seriesMeta[ev.id] = { freq: ev.freq, days: ev.days };
      }
      const missing = parsed
        .filter((ev) => !ev.isMaster && ev.freq === 'once' && ev.seriesId && !seriesMeta[ev.seriesId])
        .map((ev) => ev.seriesId);
      for (const sid of new Set(missing)) {
        try {
          const master = await getEvent('primary', sid);
          const rr = Array.isArray(master?.recurrence) ? master.recurrence[0] : '';
          const meta = parseRrule(rr);
          if (meta.freq !== 'once') seriesMeta[sid] = meta;
        } catch {
          /* series not resolved — keep as once */
        }
      }
      for (const ev of parsed) {
        if (ev.isMaster || ev.freq !== 'once') continue;
        const meta = seriesMeta[ev.seriesId];
        if (meta) {
          ev.freq = meta.freq;
          ev.days = meta.days;
        }
      }
      parsed.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.time.localeCompare(b.time));
      state.value = { ...state.value, status: 'ready', events: parsed };
    } catch (err) {
      state.value = { ...state.value, status: 'error', error: err?.message || String(err) };
    }
  }

  async function loadWeek(monday) {
    state.value = { ...state.value, monday };
    await reloadWeek();
  }

  function occurrenceOf(seriesId, day) {
    return state.value.events.find((ev) => ev.seriesId === seriesId && ev.day === day);
  }

  function occurrenceBySeries(seriesId) {
    return state.value.events.find((ev) => ev.seriesId === seriesId);
  }

  async function addTask({ text, time = '', endTime = '', freq = 'daily', days = ALL_DAYS, date = '' }) {
    state.value = { ...state.value, saving: true };
    try {
      const f = FREQS.includes(freq) ? freq : 'daily';
      const dateStr = f === 'once'
        ? date
        : firstMatchingDate(state.value.monday || new Date(), f, days);
      const { start, end } = buildStartEnd({ date: dateStr, time, endTime });
      const body = {
        summary: text,
        start,
        end,
        recurrence: f === 'once' ? [] : [rruleFor(f, days)],
      };
      await insertEvent('primary', body);
      await reloadWeek();
    } finally {
      state.value = { ...state.value, saving: false };
    }
  }

  async function updateTask(seriesId, patch) {
    state.value = { ...state.value, saving: true };
    try {
      const master = await getEvent('primary', seriesId);
      const start = master.start || {};
      const masterTime = start.date ? '' : parseTime(start.dateTime).time;
      const startDate = start.date ? start.date.slice(0, 10) : parseTime(start.dateTime).date;

      const body = {};
      if (patch.text) body.summary = patch.text;
      const f = FREQS.includes(patch.freq) ? patch.freq : 'once';
      const time = patch.time || masterTime;
      const dateStr = f === 'once' ? patch.date : startDate;
      if (dateStr) {
        const { start: s, end: e } = buildStartEnd({ date: dateStr, time, endTime: patch.endTime || '' });
        body.start = s;
        body.end = e;
      }
      body.recurrence = f === 'once' ? [] : [rruleFor(f, patch.freq === 'custom' ? patch.days : freqDays({ freq: f, days: patch.days }))];
      await patchEvent('primary', seriesId, body);
      await reloadWeek();
      return true;
    } finally {
      state.value = { ...state.value, saving: false };
    }
  }

  async function removeTask(seriesId) {
    state.value = { ...state.value, saving: true };
    try {
      await deleteEvent('primary', seriesId);
      const rest = { ...done.value };
      delete rest[seriesId];
      done.value = rest;
      persistDone(done.value);
      await reloadWeek();
    } finally {
      state.value = { ...state.value, saving: false };
    }
  }

  async function moveOccurrence(seriesId, fromDay, toDay) {
    if (fromDay === toDay) return false;
    const ev = occurrenceOf(seriesId, fromDay);
    if (!ev) return false;
    const occurrenceDate = parseDateKey(ev.dateStr);
    if (ev.freq === 'once') {
      const moved = addDays(mondayOf(occurrenceDate), toDay - 1);
      return updateTask(seriesId, {
        freq: 'once',
        days: [toDay],
        date: dateKey(moved),
        time: ev.time,
        endTime: ev.endTime,
      });
    }
    const current = ev.days.length ? ev.days : freqDays(ev);
    const next = current.filter((day) => day !== fromDay);
    if (!next.includes(toDay)) next.push(toDay);
    next.sort((a, b) => a - b);
    return updateTask(seriesId, {
      freq: 'custom',
      days: next,
      time: ev.time,
      endTime: ev.endTime,
    });
  }

  function weekStats() {
    let total = 0;
    let completed = 0;
    for (const ev of state.value.events) {
      total += 1;
      if (isDone(ev.seriesId, ev.dateStr)) completed += 1;
    }
    return { done: completed, total };
  }

  return {
    events,
    status,
    error,
    saving,
    loadWeek,
    reloadWeek,
    toggleDone,
    isDone,
    occurrenceBySeries,
    addTask,
    updateTask,
    removeTask,
    moveOccurrence,
    weekStats,
  };
}