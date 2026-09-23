import { ref, computed } from 'vue';
import { ALL_DAYS, addDays, dateKey, mondayOf, parseDateKey, weekdayNum } from '@/utils/week.js';
import { KANBAN_DONE_KEY as DONE_KEY, KANBAN_FREQS as FREQS } from '@/config.js';
import {
  hasAccount,
  hasCalendar,
  hasTasksCalendar,
  listEvents,
  listTasks,
  resetUidMeta,
  getEvent,
  getTask,
  insertEvent,
  insertTask,
  patchEvent,
  patchTask,
  deleteEvent,
  deleteTask,
} from '@/composables/useYandexCalendar.js';
import { freqDays, rruleFor, parseRrule } from '@/composables/caldavData.js';

export { freqDays, rruleFor, parseRrule };

export { FREQS };

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
  const seriesId = isRecurring ? item.recurringEventId : item.uid ?? item.id;
  const rrule = Array.isArray(item.recurrence) ? item.recurrence[0] : '';
  if (item.undated) {
    return {
      id,
      seriesId,
      text: item.summary || '',
      dateStr: '',
      day: 0,
      time: '',
      endTime: '',
      allDay: false,
      freq: 'once',
      days: [],
      recurrence: rrule,
      isMaster: false,
      task: true,
      status: item.status || '',
      undated: true,
    };
  }
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
    task: item.task ? true : false,
    status: item.task ? (item.status || '') : '',
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

export async function checkCalendarConnection() {
  return hasAccount() && (hasCalendar() || hasTasksCalendar());
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
  const taskSeriesIds = new Set();

  function isDone(seriesId, dateStr) {
    return !!done.value[seriesId]?.[dateStr];
  }

  async function toggleDone(seriesId, dateStr) {
    const nextDone = !isDone(seriesId, dateStr);
    if (taskSeriesIds.has(seriesId)) {
      try {
        await patchTask(seriesId, {
          status: nextDone ? 'COMPLETED' : 'NEEDS-ACTION',
          completed: nextDone ? true : undefined,
        });
      } catch {
        return;
      }
    }
    const current = done.value[seriesId] || {};
    const next = { ...current };
    if (nextDone) {
      next[dateStr] = true;
    } else {
      delete next[dateStr];
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

  function seedTaskDone(current) {
    let changed = false;
    const next = { ...done.value };
    for (const ev of current) {
      if (!ev.task || !ev.seriesId) continue;
      const entry = { ...(next[ev.seriesId] || {}) };
      const target = ev.status === 'COMPLETED';
      if (target !== !!entry[ev.dateStr]) {
        if (target) {
          entry[ev.dateStr] = true;
        } else {
          delete entry[ev.dateStr];
        }
        changed = true;
      }
      if (Object.keys(entry).length) {
        next[ev.seriesId] = entry;
      } else if (next[ev.seriesId]) {
        delete next[ev.seriesId];
      }
    }
    if (changed) {
      done.value = next;
      persistDone(next);
    }
  }

  async function reloadWeek() {
    const monday = state.value.monday;
    if (!monday) return;
    state.value = { ...state.value, status: 'loading', error: '' };
    try {
      resetUidMeta();
      const eventsRes = await listEvents(monday);
      const tasksRes = hasTasksCalendar()
        ? await listTasks(monday).catch(() => [])
        : [];
      const items = [...(Array.isArray(eventsRes) ? eventsRes : Array.isArray(eventsRes?.items) ? eventsRes.items : []), ...(Array.isArray(tasksRes) ? tasksRes : [])];
      taskSeriesIds.clear();
      for (const it of items) {
        if (it.task) taskSeriesIds.add(it.uid);
      }
      const parsed = items.map(occurrenceFromEvent);
      seedTaskDone(parsed);
      const seriesMeta = {};
      for (const ev of parsed) {
        if (ev.isMaster && ev.recurrence) seriesMeta[ev.id] = { freq: ev.freq, days: ev.days };
      }
      const missing = parsed
        .filter((ev) => !ev.isMaster && ev.freq === 'once' && ev.recurringEventId && ev.seriesId && !seriesMeta[ev.seriesId])
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

  async function addTask({ text, time = '', endTime = '', freq = 'daily', days = ALL_DAYS, date = '', kind = 'task', calendarHref = '' }) {
    state.value = { ...state.value, saving: true };
    try {
      const f = FREQS.includes(freq) ? freq : 'daily';
      const dateStr = f === 'once'
        ? date
        : firstMatchingDate(state.value.monday || new Date(), f, days);
      const { start, end } = dateStr ? buildStartEnd({ date: dateStr, time, endTime }) : { start: null, end: null };
      const body = {
        summary: text,
        start,
        end,
        recurrence: f === 'once' ? [] : [rruleFor(f, days)],
      };
      if (calendarHref) body.calendarHref = calendarHref;
      if (kind === 'task') {
        await insertTask('primary', body);
      } else {
        await insertEvent('primary', body);
      }
      await reloadWeek();
    } finally {
      state.value = { ...state.value, saving: false };
    }
  }

  async function updateTask(seriesId, patch) {
    state.value = { ...state.value, saving: true };
    try {
      const isTask = taskSeriesIds.has(seriesId);
      const master = isTask ? await getTask(seriesId) : await getEvent('primary', seriesId);
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
      if (isTask) {
        await patchTask(seriesId, body);
      } else {
        await patchEvent('primary', seriesId, body);
      }
      await reloadWeek();
      return true;
    } finally {
      state.value = { ...state.value, saving: false };
    }
  }

  async function removeTask(seriesId) {
    state.value = { ...state.value, saving: true };
    try {
      if (taskSeriesIds.has(seriesId)) {
        await deleteTask(seriesId);
      } else {
        await deleteEvent('primary', seriesId);
      }
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
    const occurrenceDate = ev.dateStr ? parseDateKey(ev.dateStr) : state.value.monday;
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