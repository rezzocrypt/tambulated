import { ref, computed } from 'vue';
import {
  ALL_DAYS,
  addDays,
  dateKey,
  parseDateKey,
  weekdayNum,
  mondayOf,
  weekDates,
} from '@/utils/week.js';

export const KANBAN_KEY = 'kanban-board';
const KANBAN_VERSION = 1;

export const FREQS = ['once', 'daily', 'weekdays', 'custom'];

export function freqDays(task) {
  if (task?.freq === 'daily') return [...ALL_DAYS];
  if (task?.freq === 'weekdays') return [1, 2, 3, 4, 5];
  const days = Array.isArray(task?.days) ? task.days : [];
  return ALL_DAYS.filter((day) => days.includes(day)).sort((a, b) => a - b);
}

function normalizeDays(days) {
  const filtered = ALL_DAYS.filter((day) => days.includes(day));
  return filtered.length ? filtered : [...ALL_DAYS];
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalize(data) {
  const tasks = (Array.isArray(data?.tasks) ? data.tasks : []).map((task) => {
    const next = {
      endTime: '',
      ...task,
    };
    if (next.freq === 'once' && !next.date) {
      const week = typeof next.week === 'string' ? parseDateKey(next.week) : null;
      const day = Array.isArray(next.days) && next.days.length ? next.days[0] : 1;
      next.date = week ? dateKey(addDays(week, day - 1)) : '';
    }
    return next;
  });
  const done = data?.done && typeof data.done === 'object' ? data.done : {};
  return { tasks, done };
}

export function readKanban() {
  try {
    const raw = localStorage.getItem(KANBAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== KANBAN_VERSION) return null;
    return normalize(parsed);
  } catch {
    return null;
  }
}

const state = ref(normalize(readKanban()));

export function reloadKanban() {
  state.value = normalize(readKanban());
}

function persist() {
  try {
    localStorage.setItem(KANBAN_KEY, JSON.stringify({
      v: KANBAN_VERSION,
      tasks: state.value.tasks,
      done: state.value.done,
    }));
  } catch {
    /* storage unavailable — keep data in memory only */
  }
}

export function useKanban() {
  const tasks = computed(() => state.value.tasks);
  const done = computed(() => state.value.done);

  function getTask(id) {
    return state.value.tasks.find((task) => task.id === id);
  }

  function addTask({ text, time = '', endTime = '', freq = 'daily', days = ALL_DAYS, week = null, date = '' }) {
    let normalized = normalizeDays(days);
    let taskWeek = week;
    let taskDate = '';
    let parsed = typeof date === 'string' && date ? parseDateKey(date) : null;
    if (freq === 'once') {
      if (parsed) {
        normalized = [weekdayNum(parsed)];
        taskWeek = dateKey(mondayOf(parsed));
        taskDate = dateKey(parsed);
      } else {
        normalized = [normalized[0]];
      }
    }
    if (freq === 'once' && !taskDate) {
      const anchor = typeof taskWeek === 'string' ? parseDateKey(taskWeek) : null;
      taskDate = anchor ? dateKey(addDays(anchor, normalized[0] - 1)) : '';
    }
    const task = {
      id: uid(),
      text,
      time,
      endTime,
      freq: FREQS.includes(freq) ? freq : 'daily',
      days: normalized,
      week: freq === 'once' ? taskWeek : null,
      date: freq === 'once' ? taskDate : '',
    };
    state.value = { ...state.value, tasks: [...state.value.tasks, task] };
    persist();
    return task;
  }

  function updateTask(id, patch) {
    state.value = {
      ...state.value,
      tasks: state.value.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    };
    persist();
  }

  function removeTask(id) {
    const nextDone = { ...state.value.done };
    delete nextDone[id];
    state.value = {
      ...state.value,
      tasks: state.value.tasks.filter((task) => task.id !== id),
      done: nextDone,
    };
    persist();
  }

  function setTaskDoneEntries(taskId, entries) {
    const nextDone = { ...state.value.done };
    if (Object.keys(entries).length) {
      nextDone[taskId] = entries;
    } else {
      delete nextDone[taskId];
    }
    state.value = { ...state.value, done: nextDone };
    persist();
  }

  function toggleDone(taskId, dateStr) {
    const current = state.value.done[taskId] || {};
    const next = { ...current };
    if (next[dateStr]) {
      delete next[dateStr];
    } else {
      next[dateStr] = true;
    }
    setTaskDoneEntries(taskId, next);
  }

  function isDone(taskId, dateStr) {
    return !!state.value.done[taskId]?.[dateStr];
  }

  function occurrenceDates(task, monday) {
    if (task?.freq === 'once') {
      if (!task.date) return [];
      const date = parseDateKey(task.date);
      if (dateKey(mondayOf(monday)) !== dateKey(mondayOf(date))) return [];
      return [date];
    }
    const days = freqDays(task);
    return weekDates(monday).filter((date) => days.includes(weekdayNum(date)));
  }

  function moveOccurrence(taskId, fromDay, toDay) {
    const task = getTask(taskId);
    if (!task || fromDay === toDay) return false;
    if (task.freq === 'once') {
      if (!task.date && !task.week) return false;
      const current = task.date ? parseDateKey(task.date) : parseDateKey(task.week);
      const moved = addDays(mondayOf(current), toDay - 1);
      updateTask(taskId, {
        days: [toDay],
        date: dateKey(moved),
        week: dateKey(mondayOf(moved)),
      });
      return true;
    }
    const current = freqDays(task);
    const next = current.filter((day) => day !== fromDay);
    if (!next.includes(toDay)) next.push(toDay);
    next.sort((a, b) => a - b);
    updateTask(taskId, { freq: 'custom', days: next });
    return true;
  }

  function weekStats(monday) {
    let total = 0;
    let completed = 0;
    for (const task of state.value.tasks) {
      for (const date of occurrenceDates(task, monday)) {
        total += 1;
        if (isDone(task.id, dateKey(date))) completed += 1;
      }
    }
    return { done: completed, total };
  }

  function exportData() {
    return { v: KANBAN_VERSION, tasks: state.value.tasks, done: state.value.done };
  }

  function importData(data) {
    state.value = normalize(data);
    persist();
  }

  return {
    tasks,
    done,
    getTask,
    addTask,
    updateTask,
    removeTask,
    toggleDone,
    isDone,
    occurrenceDates,
    moveOccurrence,
    weekStats,
    exportData,
    importData,
  };
}