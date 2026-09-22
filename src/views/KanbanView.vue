<template>
  <div class="kb-view">
    <div class="kb-toolbar">
      <div class="kb-title-group">
        <div class="kb-title">{{ t('tasksTitle') }}</div>
        <div class="kb-stats" :title="t('tasksProgress')">
          <div class="kb-progress">
            <div class="kb-progress-fill" :style="{ width: progressPct + '%' }"></div>
          </div>
          <div class="kb-stats-text">{{ stats.done }} / {{ stats.total }}</div>
        </div>
      </div>
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
      <div class="kb-tools">
        <button v-if="!connected" class="kb-tool-btn" :title="t('tasksAuthHint')" @click="openConnect">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>{{ t('tasksConnect') }}</span>
        </button>
        <button v-else-if="status === 'loading'" class="kb-tool-btn" disabled>
          <span class="kb-spin"></span>
          <span>{{ t('tasksLoading') }}</span>
        </button>
        <button v-else-if="status === 'error'" class="kb-tool-btn" @click="reloadWeek">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 4v6h6"></path>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <span>{{ t('tasksRetry') }}</span>
        </button>
        <button class="kb-tool-btn primary" :disabled="saving || !connected" @click="openNewEditor(null)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>{{ t('tasksAddTask') }}</span>
        </button>
        <button v-if="connected" class="kb-tool-btn kb-tool-gear" :title="t('tasksSettings')" :aria-label="t('tasksSettings')" @click="openSettings">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
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
              :key="`${card.seriesId}:${card.dateStr}`"
              class="kb-card"
              :class="{ done: card.done, drop: dragTaskId === card.seriesId }"
            >
              <span
                class="kb-grip"
                draggable="true"
                :title="t('tasksDrag')"
                :aria-label="t('tasksDrag')"
                @dragstart="onDragStart(card.seriesId, card.day)"
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
                v-if="card.task"
                class="kb-done"
                :class="{ on: card.done }"
                :aria-pressed="card.done"
                :aria-label="`${card.text}: ${card.dateStr}`"
                @click="toggleDone(card.seriesId, card.dateStr)"
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
                  class="kb-edit"
                  :title="t('tasksEdit')"
                  :aria-label="`${t('tasksEdit')}: ${card.text}`"
                  @click="openTaskEditor(card.seriesId)"
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
      <div v-if="status === 'ready' && undatedCards.length" class="kb-undated">
        <div class="kb-undated-title">{{ t('tasksNoDate') }}</div>
        <div class="kb-undated-list">
          <div
            v-for="card in undatedCards"
            :key="`u:${card.seriesId}`"
            class="kb-card"
            :class="{ done: card.done }"
          >
            <span
              class="kb-grip"
              draggable="true"
              :title="t('tasksDrag')"
              :aria-label="t('tasksDrag')"
              @dragstart="onDragStart(card.seriesId, card.day)"
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
              v-if="card.task"
              class="kb-done"
              :class="{ on: card.done }"
              :aria-pressed="card.done"
              :aria-label="`${card.text}`"
              @click="toggleDone(card.seriesId, card.dateStr)"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <div class="kb-card-main">
              <div class="kb-text">{{ card.text }}</div>
              <div class="kb-freq">{{ freqLabel(card.freq) }}</div>
            </div>
            <div class="kb-card-actions">
              <button
                class="kb-edit"
                :title="t('tasksEdit')"
                :aria-label="`${t('tasksEdit')}: ${card.text}`"
                @click="openTaskEditor(card.seriesId)"
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="status === 'loading'" class="kb-empty">
        <div class="kb-empty-icon kb-spin"></div>
        <p>{{ t('tasksLoading') }}</p>
      </div>
      <div v-else-if="status === 'error'" class="kb-empty">
        <div class="kb-empty-icon">⚠</div>
        <p>{{ t('tasksError') }}</p>
        <button class="kb-empty-btn" @click="reloadWeek">{{ t('tasksRetry') }}</button>
      </div>
      <div v-else-if="status === 'ready' && !events.length" class="kb-empty">
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
        <div v-if="!editor.id && editor.kind === 'task' && editor.freq !== 'once'" class="kb-kind-note">{{ t('tasksRepeatNote') }}</div>
        <div v-if="!editor.id">
          <div class="kb-field-label">{{ t('tasksKind') }}</div>
          <div class="kb-freq-pick">
            <button class="kb-freq-opt" :class="{ on: editor.kind === 'task' }" @click="editor.kind = 'task'">{{ t('tasksKindTask') }}</button>
            <button class="kb-freq-opt" :class="{ on: editor.kind === 'event' }" @click="editor.kind = 'event'">{{ t('tasksKindEvent') }}</button>
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
        <div v-if="editorError" class="kb-conn-error">{{ editorError }}</div>
        <div class="modal-actions">
          <button v-if="editor.id" class="modal-btn danger" :disabled="saving" @click="deleteEditorTask">{{ t('delete') }}</button>
          <span class="kb-spacer"></span>
          <button class="modal-btn" @click="editor = null">{{ t('cancel') }}</button>
          <button
            class="modal-btn primary"
            :disabled="!editor.text.trim() || !editorSaveAllowed || saving"
            @click="saveEditor"
          >
            {{ t('tasksSave') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="connectOpen" class="modal-overlay" @click.self="connectOpen = false">
      <div class="modal">
        <div class="modal-title">{{ settingsMode ? t('tasksSettings') : t('tasksConnect') }}</div>
        <p v-if="!settingsMode" class="kb-conn-hint">{{ t('tasksAuthHint') }}</p>
        <p v-else class="kb-conn-hint">{{ t('tasksSettingsHint') }}</p>
        <div v-if="settingsMode" class="kb-conn-account">
          <span class="kb-conn-login-text">{{ connectLogin }}</span>
          <button class="modal-btn danger" @click="logoutAccount">{{ t('tasksLogout') }}</button>
        </div>
        <template v-else>
          <input v-model="connectLogin" class="modal-input kb-conn-login" type="text" :placeholder="t('tasksLoginLabel')" />
          <input v-model="connectPassword" class="modal-input kb-conn-pass" type="password" :placeholder="t('tasksAppPassword')" />
        </template>
        <div v-if="connectError" class="kb-conn-error">{{ connectError }}</div>
        <div v-if="eventsCalendars.length">
          <div class="kb-field-label">{{ t('tasksCalendar') }}</div>
          <div class="kb-conn-cals kb-conn-cal">
            <label v-for="cal in eventsCalendars" :key="cal.href" class="kb-conn-cal-item">
              <input type="checkbox" :checked="selectedEventsCals.includes(cal.href)" @change="toggleCal('events', cal.href)" />
              <span>{{ cal.displayName }}</span>
            </label>
          </div>
        </div>
        <div v-if="tasksCalendars.length">
          <div class="kb-field-label">{{ t('tasksTasksCalendar') }}</div>
          <div class="kb-conn-cals kb-conn-tasks">
            <label v-for="cal in tasksCalendars" :key="cal.href" class="kb-conn-cal-item">
              <input type="checkbox" :checked="selectedTasksCals.includes(cal.href)" @change="toggleCal('tasks', cal.href)" />
              <span>{{ cal.displayName }}</span>
            </label>
          </div>
        </div>
        <div v-else-if="connectChecked" class="kb-conn-empty">{{ t('tasksNoCalendars') }}</div>
        <div class="modal-actions">
          <button class="modal-btn" @click="connectOpen = false">{{ t('cancel') }}</button>
          <button
            v-if="!availCalendars.length"
            class="modal-btn primary"
            :disabled="!canCheckConnect"
            @click="loadCalendars"
          >
            <span v-if="connectChecking" class="kb-spin"></span>
            <span>{{ t('tasksCheck') }}</span>
          </button>
          <button v-else class="modal-btn primary" :disabled="!canApplyConnection" @click="applyConnection">
            {{ settingsMode ? t('tasksSave') : t('tasksConnectNow') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useLocale } from '@/composables/useLocale.js';
import { ALL_DAYS, DAY_NAMES_KEY, dateKey, mondayOf, parseDateKey, shiftWeek, weekdayNum } from '@/utils/week.js';
import { discoverCalendars, getAccount, getStoredAccount, setAccount, setCalendars, getCalendars, hasCalendar, hasTasksCalendar, logout } from '@/composables/useYandexCalendar.js';
import { FREQS, useKanban, checkCalendarConnection, reloadKanban } from '@/composables/useKanban.js';

const { t, toLocaleString } = useLocale();
const {
  events,
  status,
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
} = useKanban();

const connected = ref(false);
const connectOpen = ref(false);
const settingsMode = ref(false);
const connectLogin = ref('');
const connectPassword = ref('');
const availCalendars = ref([]);
const selectedEventsCals = ref([]);
const selectedTasksCals = ref([]);
const connectChecked = ref(false);
const connectChecking = ref(false);
const connectError = ref('');
const canCheckConnect = computed(
  () =>
    !!connectLogin.value.trim() &&
    !connectChecking.value &&
    (!!connectPassword.value || !!getStoredAccount()?.password),
);
const canApplyConnection = computed(
  () => !!availCalendars.value.length && (selectedEventsCals.value.length || selectedTasksCals.value.length),
);

const eventsCalendars = computed(() => availCalendars.value.filter((cal) => cal.component !== 'VTODO'));
const tasksCalendars = computed(() => availCalendars.value.filter((cal) => cal.component === 'VTODO'));

function toggleCal(section, href) {
  const listRef = section === 'tasks' ? selectedTasksCals : selectedEventsCals;
  if (listRef.value.includes(href)) {
    listRef.value = listRef.value.filter((h) => h !== href);
  } else {
    listRef.value = [...listRef.value, href];
  }
}

const week = ref(mondayOf(new Date()));
const todayKey = dateKey(new Date());
const dates = computed(() => {
  return ALL_DAYS.map((offset) => new Date(week.value.getFullYear(), week.value.getMonth(), week.value.getDate() + offset - 1));
});

onMounted(async () => {
  connected.value = await checkCalendarConnection();
  document.addEventListener('visibilitychange', onVisibility);
});

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility);
});

function onVisibility() {
  if (document.visibilityState === 'visible' && connected.value && status.value !== 'loading') {
    reloadWeek();
  }
}

watch(week, (monday) => {
  loadWeek(monday);
}, { immediate: true });

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

function openConnect() {
  settingsMode.value = false;
  connectPassword.value = '';
  availCalendars.value = [];
  selectedEventsCals.value = [];
  selectedTasksCals.value = [];
  connectChecked.value = false;
  connectError.value = '';
  const acc = getAccount();
  connectLogin.value = acc?.login || '';
  connectOpen.value = true;
}

async function openSettings() {
  if (!getAccount()) {
    openConnect();
    return;
  }
  settingsMode.value = true;
  const acc = getStoredAccount();
  connectLogin.value = acc?.login || '';
  connectPassword.value = acc?.password || '';
  availCalendars.value = [];
  selectedEventsCals.value = [];
  selectedTasksCals.value = [];
  connectChecked.value = false;
  connectError.value = '';
  connectOpen.value = true;
  await loadCalendars();
}

function logoutAccount() {
  logout();
  reloadKanban();
  connected.value = false;
  connectOpen.value = false;
  openConnect();
}

function prefillSelection() {
  const stored = getCalendars();
  const evHrefs = stored.filter((c) => c.component !== 'VTODO').map((c) => c.href);
  const taskHrefs = stored.filter((c) => c.component === 'VTODO').map((c) => c.href);
  selectedEventsCals.value = evHrefs.length
    ? evHrefs.filter((h) => eventsCalendars.value.some((c) => c.href === h))
    : eventsCalendars.value[0]
      ? [eventsCalendars.value[0].href]
      : [];
  selectedTasksCals.value = taskHrefs.length
    ? taskHrefs.filter((h) => tasksCalendars.value.some((c) => c.href === h))
    : tasksCalendars.value[0]
      ? [tasksCalendars.value[0].href]
      : [];
}

async function loadCalendars() {
  connectChecking.value = true;
  connectError.value = '';
  try {
    const acc = getStoredAccount();
    const password = connectPassword.value || acc?.password || '';
    setAccount(connectLogin.value.trim(), password);
    const calendars = await discoverCalendars();
    availCalendars.value = calendars;
    connectChecked.value = true;
    prefillSelection();
  } catch (err) {
    console.log(err);
    connectError.value = err?.message === 'KCAL_AUTH_FAILED' ? t('tasksIncorrectCreds') : t('tasksCalError');
    availCalendars.value = [];
  } finally {
    connectChecking.value = false;
  }
}

async function applyConnection() {
  const selected = availCalendars.value.filter(
    (cal) => selectedEventsCals.value.includes(cal.href) || selectedTasksCals.value.includes(cal.href),
  );
  if (!selected.length) return;
  setCalendars(selected);
  connectOpen.value = false;
  connected.value = true;
  await loadWeek(week.value);
}

function timeRank(time) {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const cards = computed(() => {
  const out = [];
  for (const ev of events.value) {
    out.push({
      seriesId: ev.seriesId,
      dateStr: ev.dateStr,
      day: ev.day,
      time: ev.time,
      endTime: ev.endTime || '',
      text: ev.text,
      freq: ev.freq,
      task: ev.task,
      done: isDone(ev.seriesId, ev.dateStr),
    });
  }
  return out.sort((a, b) => timeRank(a.time) - timeRank(b.time) || a.text.localeCompare(b.text));
});

const undatedCards = computed(() => events.value.filter((ev) => ev.day === 0).map((ev) => ({
  seriesId: ev.seriesId,
  dateStr: ev.dateStr,
  day: ev.day,
  text: ev.text,
  freq: ev.freq,
  task: ev.task,
  done: isDone(ev.seriesId, ev.dateStr),
})));

function timeRange(card) {
  return [card.time, card.endTime].filter(Boolean).join(' – ');
}

const columns = computed(() => {
  const grouped = Object.fromEntries(ALL_DAYS.map((day) => [day, []]));
  for (const card of cards.value) {
    if (grouped[card.day]) grouped[card.day].push(card);
  }
  return ALL_DAYS.map((day) => ({
    day,
    dateNum: dates.value[day - 1].getDate(),
    today: dateKey(dates.value[day - 1]) === todayKey,
    cards: grouped[day],
  }));
});

const stats = computed(() => weekStats());
const progressPct = computed(() => (stats.value.total ? Math.round((stats.value.done / stats.value.total) * 100) : 0));

const dragTaskId = ref(null);
const dragFromDay = ref(null);
const dropDay = ref(null);

const editor = ref(null);
const editorError = ref('');

const editorSaveAllowed = computed(() => {
  const freq = editor.value?.freq;
  if (freq === 'once') return editor.value.kind === 'task' ? true : !!editor.value.date;
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
    kind: 'task',
    time: '',
    endTime: '',
    freq: day ? 'once' : 'daily',
    days: day ? [day] : [...ALL_DAYS],
    date: day ? dateKey(dates.value[day - 1]) : '',
  };
  editorError.value = '';
  nextTick(() => {
    const input = document.querySelector('.kb-view .modal-input');
    input?.focus();
  });
}

function openTaskEditor(seriesId) {
  const ev = occurrenceBySeries(seriesId);
  if (!ev) return;
  editor.value = {
    id: ev.seriesId,
    text: ev.text,
    kind: ev.task ? 'task' : 'event',
    time: ev.time || '',
    endTime: ev.endTime || '',
    freq: ev.freq,
    days: [...ev.days],
    date: ev.freq === 'once' ? ev.dateStr : '',
  };
  editorError.value = '';
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

async function saveEditor() {
  const text = editor.value.text.trim();
  if (!text || !editorSaveAllowed.value) return;
  const freq = editor.value.freq;
  const kind = freq === 'once' ? (editor.value.kind || 'task') : 'event';
  if (kind === 'task' && !hasTasksCalendar()) {
    editorError.value = t('tasksNeedTasksCalendar');
    return;
  }
  if (kind === 'event' && !hasCalendar()) {
    editorError.value = t('tasksNeedConnect');
    return;
  }
  let days;
  if (freq === 'daily') {
    days = [...ALL_DAYS];
  } else if (freq === 'weekdays') {
    days = [1, 2, 3, 4, 5];
  } else if (freq === 'custom') {
    days = editor.value.days;
  } else {
    const parsed = parseDateKey(editor.value.date);
    days = [weekdayNum(parsed)];
  }
  const payload = {
    text,
    kind,
    time: editor.value.time,
    endTime: editor.value.endTime,
    freq,
    days,
    date: freq === 'once' ? editor.value.date : '',
  };
  if (editor.value.id) {
    await updateTask(editor.value.id, payload);
  } else {
    await addTask(payload);
  }
  editor.value = null;
}

async function deleteEditorTask() {
  await removeTask(editor.value.id);
  editor.value = null;
}

function onDragStart(seriesId, fromDay) {
  dragTaskId.value = seriesId;
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
.kb-title-group {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
  min-width: 0;
}
.kb-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}
.kb-nav {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
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
  margin-left: auto;
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
.kb-tool-btn.kb-tool-gear {
  padding: 7px 9px;
}
.kb-tool-btn:disabled {
  opacity: 0.55;
  cursor: default;
}
.kb-spin {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--border-strong);
  border-top-color: transparent;
  border-radius: 50%;
  animation: kb-rotate 0.7s linear infinite;
}
@keyframes kb-rotate {
  to {
    transform: rotate(360deg);
  }
}

.kb-board-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.kb-board {
  display: flex;
  gap: 10px;
  flex: 1;
  min-height: 0;
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

.kb-undated {
  margin-top: 10px;
  padding: 12px 14px;
  background: var(--glass-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.kb-undated-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.kb-undated-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.kb-undated-list .kb-card {
  flex: 1 1 220px;
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
.kb-card:hover .kb-edit {
  opacity: 1;
}
.kb-edit:hover {
  background: var(--glass-hover);
  color: var(--text-primary);
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
  display: flex;
  align-items: center;
  justify-content: center;
}
.kb-empty p {
  font-size: 14px;
}
.kb-empty-sub {
  font-size: 12px;
  opacity: 0.7;
}
.kb-empty-btn {
  appearance: none;
  padding: 7px 16px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--glass-bg-strong);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  pointer-events: auto;
}
.kb-empty-btn:hover {
  background: var(--glass-hover);
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
.kb-conn-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
}
.kb-conn-error,
.kb-conn-empty {
  font-size: 12px;
  color: var(--danger);
}
.kb-conn-empty {
  color: var(--text-secondary);
}
.kb-conn-cal {
  display: block;
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
.kb-conn-account {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 420px;
}
.kb-conn-cals {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.kb-conn-cal-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  padding: 3px 0;
}
.kb-conn-cal-item input[type='checkbox'] {
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
  cursor: pointer;
}
.kb-conn-login-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 7px 0;
  color: var(--text-secondary);
  font-size: 13px;
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
.kb-kind-note {
  font-size: 12px;
  color: var(--text-secondary);
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