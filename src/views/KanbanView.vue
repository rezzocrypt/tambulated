<template>
  <div class="kb-view">
    <div class="kb-toolbar">
      <div class="kb-title">{{ t('tasksTitle') }}</div>
      <div class="kb-nav">
        <button class="kb-arrow" :title="t('tasksPrev')" :aria-label="t('tasksPrev')" @click="navigateWeek(-1)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div class="kb-week-block">
          <div class="kb-week-label">{{ weekLabel }}</div>
          <button v-if="!isCurrentWeek" class="kb-today" @click="goToday">{{ t('tasksToday') }}</button>
        </div>
        <button class="kb-arrow" :title="t('tasksNext')" :aria-label="t('tasksNext')" @click="navigateWeek(1)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <div class="kb-spacer"></div>
      <div class="kb-stats" :title="t('tasksProgress')">
        <div class="kb-progress">
          <div class="kb-progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <div class="kb-stats-text">{{ stats.done }} / {{ stats.total }}</div>
      </div>
      <div class="kb-tools">
        <button class="kb-tool-btn" @click="exportBackup">{{ t('tasksExport') }}</button>
        <button class="kb-tool-btn" @click="importInput?.click()">{{ t('tasksImport') }}</button>
        <button class="kb-tool-btn primary" @click="openNewEditor(null)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>{{ t('tasksAddTask') }}</span>
        </button>
        <input ref="importInput" class="kb-file" type="file" accept="application/json" @change="onImportFile" />
      </div>
    </div>

    <div class="kb-board-wrap">
      <div class="kb-board">
        <div
          v-for="col in columns"
          :key="col.day"
          class="kb-column"
          :class="{ today: col.today, drop: dropDay === col.day }"
          @dragover.prevent="dropDay = col.day"
          @drop.prevent="onColumnDrop(col.day)"
        >
          <div class="kb-col-head">
            <span class="kb-day-name">{{ t(DAY_NAMES_KEY[col.day]) }}</span>
            <span class="kb-day-num">{{ col.dateNum }}</span>
            <button
              class="kb-col-add"
              :title="`${t('tasksAddTask')}: ${t(DAY_NAMES_KEY[col.day])}`"
              :aria-label="`${t('tasksAddTask')}: ${t(DAY_NAMES_KEY[col.day])}`"
              @click="openNewEditor(col.day)"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
          <div class="kb-col-body">
            <div
              v-for="card in col.cards"
              :key="`${card.taskId}:${card.dateStr}`"
              class="kb-card"
              :class="{ done: card.done, drop: dragTaskId === card.taskId }"
            >
              <span
                class="kb-grip"
                draggable="true"
                :title="t('tasksDrag')"
                :aria-label="t('tasksDrag')"
                @dragstart="onDragStart(card.taskId, card.day)"
                @dragend="clearDrag"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <circle cx="9" cy="6" r="1.4" />
                  <circle cx="15" cy="6" r="1.4" />
                  <circle cx="9" cy="12" r="1.4" />
                  <circle cx="15" cy="12" r="1.4" />
                  <circle cx="9" cy="18" r="1.4" />
                  <circle cx="15" cy="18" r="1.4" />
                </svg>
              </span>
              <button
                class="kb-done"
                :class="{ on: card.done }"
                :aria-pressed="card.done"
                :aria-label="`${card.text}: ${card.dateStr}`"
                @click="toggleDone(card.taskId, card.dateStr)"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <div class="kb-card-main">
                <div v-if="timeRange(card)" class="kb-time">{{ timeRange(card) }}</div>
                <div class="kb-text">{{ card.text }}</div>
                <div class="kb-freq">{{ freqLabel(card.freq) }}</div>
              </div>
              <div class="kb-card-actions">
                <button
                  class="kb-move"
                  :disabled="col.day === 1"
                  :title="t('tasksPrevDay')"
                  :aria-label="t('tasksPrevDay')"
                  @click="moveOccurrence(card.taskId, card.day, card.day - 1)"
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  class="kb-move"
                  :disabled="col.day === 7"
                  :title="t('tasksNextDay')"
                  :aria-label="t('tasksNextDay')"
                  @click="moveOccurrence(card.taskId, card.day, card.day + 1)"
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
                <button
                  class="kb-edit"
                  :title="t('tasksEdit')"
                  :aria-label="`${t('tasksEdit')}: ${card.text}`"
                  @click="openTaskEditor(card.taskId)"
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!tasks.length" class="kb-empty">
        <div class="kb-empty-icon">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2"></rect>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <line x1="8" y1="15" x2="16" y2="15"></line>
          </svg>
        </div>
        <p>{{ t('tasksEmpty') }}</p>
        <p class="kb-empty-sub">{{ t('tasksEmptyHint') }}</p>
      </div>
    </div>

    <div v-if="editor" class="modal-overlay" @click.self="editor = null">
      <div class="modal">
        <div class="modal-title">{{ t('tasksEditTask') }}</div>
        <input
          v-model="editor.text"
          class="modal-input"
          type="text"
          :placeholder="t('tasksTaskName')"
          @keyup.enter="saveEditor"
          @keyup.esc="editor = null"
        />
        <div>
          <div class="kb-field-label">{{ t('tasksTime') }}</div>
          <input v-model="editor.time" class="modal-input" type="time" />
        </div>
        <div>
          <div class="kb-field-label">{{ t('tasksEndTime') }}</div>
          <input v-model="editor.endTime" class="modal-input" type="time" />
        </div>
        <div>
          <div class="kb-field-label">{{ t('tasksFrequency') }}</div>
          <div class="kb-freq-pick">
            <button
              v-for="freq in FREQS"
              :key="freq"
              class="kb-freq-opt"
              :class="{ on: editor.freq === freq }"
              @click="setEditorFreq(freq)"
            >
              {{ freqLabel(freq) }}
            </button>
          </div>
        </div>
        <div v-if="editor.freq === 'once'">
          <div class="kb-field-label">{{ t('tasksDate') }}</div>
          <input v-model="editor.date" class="modal-input" type="date" />
        </div>
        <div v-if="editor.freq === 'custom'">
          <div class="kb-field-label">{{ t('tasksDays') }}</div>
          <div class="kb-days-pick">
            <button
              v-for="day in ALL_DAYS"
              :key="day"
              class="kb-day-pick"
              :class="{ on: editor.days.includes(day) }"
              @click="toggleEditorDay(day)"
            >
              {{ t(DAY_NAMES_KEY[day]) }}
            </button>
          </div>
        </div>
        <div class="modal-actions">
          <button v-if="editor.id" class="modal-btn danger" @click="deleteEditorTask">{{ t('delete') }}</button>
          <span class="kb-spacer"></span>
          <button class="modal-btn" @click="editor = null">{{ t('cancel') }}</button>
          <button
            class="modal-btn primary"
            :disabled="!editor.text.trim() || !editorSaveAllowed"
            @click="saveEditor"
          >
            {{ t('tasksSave') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useLocale } from '@/composables/useLocale.js';
import { ALL_DAYS, DAY_NAMES_KEY, dateKey, mondayOf, parseDateKey, shiftWeek, weekdayNum } from '@/utils/week.js';
import { FREQS, useKanban } from '@/composables/useKanban.js';

const { t, toLocaleString } = useLocale();
const {
  tasks,
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
} = useKanban();

const week = ref(mondayOf(new Date()));
const todayKey = dateKey(new Date());
const dates = computed(() => weekDatesArray(week.value));

function weekDatesArray(monday) {
  return ALL_DAYS.map((offset) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset - 1);
    return d;
  });
}

const isCurrentWeek = computed(() => {
  return dateKey(week.value) === dateKey(mondayOf(new Date()));
});

const weekLabel = computed(() => {
  const first = dates.value[0];
  const last = dates.value[6];
  const fmt = (d, withYear) => {
    const label = toLocaleString(d, { day: 'numeric', month: 'long' });
    return withYear ? `${label} ${d.getFullYear()}` : label;
  };
  if (first.getFullYear() === last.getFullYear()) {
    return `${fmt(first)} – ${fmt(last, true)}`;
  }
  return `${fmt(first, true)} – ${fmt(last, true)}`;
});

function timeRank(time) {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const cards = computed(() => {
  const out = [];
  for (const task of tasks.value) {
    for (const date of occurrenceDates(task, week.value)) {
      const dateStr = dateKey(date);
      out.push({
        taskId: task.id,
        dateStr,
        day: ((date.getDay() + 6) % 7) + 1,
        time: task.time,
        endTime: task.endTime || '',
        text: task.text,
        freq: task.freq,
        done: isDone(task.id, dateStr),
      });
    }
  }
  return out.sort((a, b) => timeRank(a.time) - timeRank(b.time) || a.text.localeCompare(b.text));
});

function timeRange(card) {
  return [card.time, card.endTime].filter(Boolean).join(' – ');
}

const columns = computed(() => {
  const grouped = Object.fromEntries(ALL_DAYS.map((day) => [day, []]));
  for (const card of cards.value) grouped[card.day].push(card);
  return ALL_DAYS.map((day) => ({
    day,
    dateNum: dates.value[day - 1].getDate(),
    today: dateKey(dates.value[day - 1]) === todayKey,
    cards: grouped[day],
  }));
});

const stats = computed(() => weekStats(week.value));
const progressPct = computed(() => (stats.value.total ? Math.round((stats.value.done / stats.value.total) * 100) : 0));

const dragTaskId = ref(null);
const dragFromDay = ref(null);
const dropDay = ref(null);

const importInput = ref(null);
const editor = ref(null);

const editorSaveAllowed = computed(() => {
  const freq = editor.value?.freq;
  if (freq === 'once') return !!editor.value.date;
  if (freq === 'custom') return editor.value.days.length > 0;
  return true;
});

function freqLabel(freq) {
  const labels = {
    once: t('tasksOnce'),
    daily: t('tasksDaily'),
    weekdays: t('tasksWeekdays'),
    custom: t('tasksCustom'),
  };
  return labels[freq] || freq;
}

function navigateWeek(amount) {
  week.value = shiftWeek(week.value, amount);
}

function goToday() {
  week.value = mondayOf(new Date());
}

function openNewEditor(day) {
  editor.value = {
    id: null,
    text: '',
    time: '',
    endTime: '',
    freq: day ? 'once' : 'daily',
    days: day ? [day] : [...ALL_DAYS],
    week: dateKey(week.value),
    date: day ? dateKey(dates.value[day - 1]) : '',
  };
  nextTick(() => {
    const input = document.querySelector('.kb-view .modal-input');
    input?.focus();
  });
}

function openTaskEditor(taskId) {
  const task = getTask(taskId);
  if (!task) return;
  editor.value = {
    id: task.id,
    text: task.text,
    time: task.time || '',
    endTime: task.endTime || '',
    freq: task.freq,
    days: [...task.days],
    week: task.week,
    date: task.date || '',
  };
}

function setEditorFreq(freq) {
  editor.value.freq = freq;
  if (freq === 'daily') editor.value.days = [...ALL_DAYS];
  if (freq === 'weekdays') editor.value.days = [1, 2, 3, 4, 5];
  if (freq === 'once' && !editor.value.date) {
    editor.value.date = dateKey(week.value);
  }
}

function toggleEditorDay(day) {
  const days = editor.value.days;
  if (days.includes(day)) {
    editor.value.days = days.filter((d) => d !== day);
  } else {
    editor.value.days = [...days, day].sort((a, b) => a - b);
  }
}

function saveEditor() {
  const text = editor.value.text.trim();
  if (!text || !editorSaveAllowed.value) return;
  const freq = editor.value.freq;
  let days;
  let week = null;
  let date = '';
  if (freq === 'daily') {
    days = [...ALL_DAYS];
  } else if (freq === 'weekdays') {
    days = [1, 2, 3, 4, 5];
  } else if (freq === 'custom') {
    days = editor.value.days;
  } else {
    const parsed = parseDateKey(editor.value.date);
    days = [weekdayNum(parsed)];
    week = dateKey(mondayOf(parsed));
    date = dateKey(parsed);
  }
  const payload = {
    text,
    time: editor.value.time,
    endTime: editor.value.endTime,
    freq,
    days,
    week,
    date,
  };
  if (editor.value.id) {
    updateTask(editor.value.id, payload);
  } else {
    addTask(payload);
  }
  editor.value = null;
}

function deleteEditorTask() {
  removeTask(editor.value.id);
  editor.value = null;
}

function onDragStart(taskId, fromDay) {
  dragTaskId.value = taskId;
  dragFromDay.value = fromDay;
}

function clearDrag() {
  dragTaskId.value = null;
  dragFromDay.value = null;
  dropDay.value = null;
}

function onColumnDrop(day) {
  if (dragTaskId.value && dragFromDay.value != null) {
    moveOccurrence(dragTaskId.value, dragFromDay.value, day);
  }
  clearDrag();
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `kanban-${dateKey(mondayOf(new Date()))}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function onImportFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      importData(JSON.parse(reader.result));
    } catch {
      /* ignore an invalid backup file */
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
</script>

<style scoped>
.kb-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
}
.kb-spacer {
  flex: 1;
}
.kb-toolbar {
  position: sticky;
  top: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--glass-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--shadow);
}
.kb-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}
.kb-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.kb-arrow {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}
.kb-arrow:hover {
  background: var(--glass-hover);
  color: var(--text-primary);
}
.kb-week-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}
.kb-week-label {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}
.kb-today {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  color: var(--accent);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}
.kb-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.kb-progress {
  width: 90px;
  height: 8px;
  border-radius: 999px;
  background: var(--glass-bg-strong);
  overflow: hidden;
}
.kb-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), #8b5cf6);
  transition: width 0.3s ease;
}
.kb-stats-text {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}
.kb-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.kb-tool-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.kb-tool-btn:hover {
  background: var(--glass-hover);
  color: var(--text-primary);
}
.kb-tool-btn.primary {
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 2px 10px rgba(109, 92, 255, 0.45);
}
.kb-tool-btn.primary:hover {
  filter: brightness(1.08);
}
.kb-file {
  display: none;
}

.kb-board-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
}
.kb-board {
  display: flex;
  gap: 10px;
  height: 100%;
  overflow-x: auto;
  padding: 14px;
  background: var(--glass-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.kb-column {
  flex: 1 1 0;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--glass-bg-strong);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.kb-column.today {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.kb-column.drop {
  border-color: var(--accent);
  background: rgba(109, 92, 255, 0.16);
}
.kb-col-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 10px 8px;
  border-bottom: 1px solid var(--border);
}
.kb-day-name {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-primary);
}
.kb-day-num {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}
.kb-column.today .kb-day-name,
.kb-column.today .kb-day-num {
  color: var(--accent);
}
.kb-col-add {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-left: auto;
  border: 1px dashed var(--border-strong);
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.kb-col-add:hover {
  background: var(--glass-hover);
  color: var(--text-primary);
  border-color: var(--accent);
}
.kb-col-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.kb-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 8px 8px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--popup-bg);
  box-shadow: var(--shadow-sm);
  transition: opacity 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}
.kb-card.drop {
  opacity: 0.5;
}
.kb-card.done {
  opacity: 0.55;
}
.kb-grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 20px;
  flex-shrink: 0;
  color: var(--text-secondary);
  cursor: grab;
  border-radius: 4px;
  transition: background-color 0.2s ease, color 0.2s ease;
}
.kb-grip:hover {
  background: var(--glass-hover);
  color: var(--text-primary);
}
.kb-grip:active {
  cursor: grabbing;
}
.kb-done {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 1px;
  border: 2px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.kb-done:hover {
  border-color: var(--accent);
}
.kb-done.on {
  background: var(--accent);
  border-color: transparent;
  color: #ffffff;
}
.kb-card-main {
  flex: 1;
  min-width: 0;
}
.kb-time {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}
.kb-text {
  font-size: 13px;
  color: var(--text-primary);
  word-break: break-word;
}
.kb-card.done .kb-text {
  text-decoration: line-through;
  color: var(--text-secondary);
}
.kb-freq {
  margin-top: 4px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}
.kb-card-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}
.kb-move,
.kb-edit {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.2s ease, background-color 0.2s ease, color 0.2s ease;
}
.kb-card:hover .kb-move,
.kb-card:hover .kb-edit {
  opacity: 1;
}
.kb-move:hover:not(:disabled),
.kb-edit:hover {
  background: var(--glass-hover);
  color: var(--text-primary);
}
.kb-move:disabled {
  opacity: 0;
}

.kb-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  color: var(--text-secondary);
  pointer-events: none;
}
.kb-empty-icon {
  opacity: 0.7;
}
.kb-empty p {
  font-size: 14px;
}
.kb-empty-sub {
  font-size: 12px;
  opacity: 0.7;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.modal {
  width: min(380px, calc(100vw - 48px));
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  background: var(--popup-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.modal-input {
  width: 100%;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--glass-bg-strong);
  border: 1px solid var(--border);
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}
.modal-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(109, 92, 255, 0.25);
}
.kb-field-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.kb-freq-pick {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.kb-freq-opt {
  appearance: none;
  flex: 1;
  min-width: calc(50% - 6px);
  padding: 8px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.kb-freq-opt:hover {
  background: var(--popup-hover);
  color: var(--text-primary);
}
.kb-freq-opt.on {
  background: var(--accent);
  border-color: transparent;
  color: #ffffff;
}
.kb-days-pick {
  display: flex;
  gap: 6px;
}
.kb-day-pick {
  appearance: none;
  flex: 1;
  padding: 8px 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.kb-day-pick:hover {
  background: var(--popup-hover);
  color: var(--text-primary);
}
.kb-day-pick.on {
  background: var(--accent);
  border-color: transparent;
  color: #ffffff;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.modal-actions .kb-spacer {
  flex: 1;
}
.modal-btn {
  padding: 8px 18px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--popup-hover);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}
.modal-btn:hover:not(:disabled) {
  background: var(--glass-hover);
}
.modal-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.modal-btn.primary {
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 2px 10px rgba(109, 92, 255, 0.45);
}
.modal-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
}
.modal-btn.danger {
  color: var(--danger);
  border-color: var(--danger);
  margin-right: auto;
}
</style>