import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import KanbanView from '../src/views/KanbanView.vue';
import { useLocale } from '../src/composables/useLocale.js';
import { reloadKanban } from '../src/composables/useKanban.js';
import { setAccount, setCalendar, setTasksCalendar, setCalendars, clearAccount, resetEventsMock } from '../src/composables/useYandexCalendar.js';
import { ALL_DAYS, dateKey, parseDateKey, addDays } from '../src/utils/week.js';
import { createCalDavMock } from './caldavMock.js';

const WEEK = '2026-01-05';
const ACCOUNT = { login: 'user@yandex.ru', password: 'app-password' };
const CALENDAR = { href: '/cal/dflt/', displayName: 'Основной календарь' };
const TASKS_CALENDAR = { href: '/cal/tasks/', displayName: 'Задачи', component: 'VTODO' };

let mockEvents;
let fetchCalls;

function timed(uid, { summary = 'Task', date = WEEK, start = '09:00', end = '10:00', recurrence = '' } = {}) {
  const ev = {
    uid,
    summary,
    start: { dateTime: `${date}T${start}:00` },
    end: { dateTime: `${date}T${end}:00` },
    recurrence,
    etag: '"e1"',
  };
  ev.href = `/cal/dflt/${uid}.ics`;
  return ev;
}

function todo(uid, { summary = 'Task', date = WEEK, start = '', status = 'NEEDS-ACTION', recurrence = '' } = {}) {
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
  else ev.start = { date };
  return ev;
}

beforeEach(() => {
  localStorage.clear();
  setAccount(ACCOUNT.login, ACCOUNT.password);
  setCalendar(CALENDAR);
  setTasksCalendar(TASKS_CALENDAR);
  useLocale().setLocale('ru');
  reloadKanban();
  mockEvents = [];
  fetchCalls = [];
  const mocks = createCalDavMock({ account: ACCOUNT, calendars: [CALENDAR, TASKS_CALENDAR], events: mockEvents, fetchCalls });
  vi.stubGlobal('fetch', mocks.handler);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 5, 12)); // Monday
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  clearAccount();
  localStorage.removeItem('kanban-done');
});

async function flushAll() {
  for (let i = 0; i < 60; i += 1) await Promise.resolve();
}

async function mountBoard(events = []) {
  events.forEach((ev) => mockEvents.push(ev));
  const wrapper = mount(KanbanView);
  await flushAll();
  return wrapper;
}

describe('KanbanView', () => {
  it('renders 7 day columns for the current week with day numbers and names', async () => {
    const wrapper = await mountBoard([]);
    const columns = wrapper.findAll('.kb-column');
    expect(columns).toHaveLength(7);
    expect(columns[0].find('.kb-day-name').text()).toBe('Пн');
    expect(columns[0].find('.kb-day-num').text()).toBe('5');
    expect(columns[6].find('.kb-day-name').text()).toBe('Вс');
    expect(columns[6].find('.kb-day-num').text()).toBe('11');
    expect(columns[0].classes()).toContain('today');
    expect(wrapper.find('.kb-empty').exists()).toBe(true);
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 0');
    wrapper.unmount();
  });

  it('renders occurrences from calendar events in their columns', async () => {
    const events = [
      timed('daily', { summary: 'Зарядка', recurrence: 'FREQ=DAILY' }),
      timed('gym', { summary: 'Тренажёрка', date: '2026-01-07', start: '18:00', end: '19:30' }),
    ];
    const wrapper = await mountBoard(events);
    const cards = wrapper.findAll('.kb-card');
    expect(cards).toHaveLength(8);
    expect(cards[0].find('.kb-text').text()).toBe('Зарядка');
    expect(cards[0].find('.kb-freq').text()).toBe('Каждый день');
    const wed = wrapper.findAll('.kb-column')[2];
    expect(wed.findAll('.kb-card')).toHaveLength(2);
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 8');
    wrapper.unmount();
  });

  it('adds a daily task from the toolbar as a calendar event', async () => {
    const wrapper = await mountBoard([]);
    await wrapper.find('.kb-tool-btn.primary').trigger('click');
    expect(wrapper.find('.modal').exists()).toBe(true);

    await wrapper.findAll('.modal-input')[0].setValue('Зарядка');
    expect(wrapper.find('.modal-btn.primary').attributes('disabled')).toBeUndefined();
    await wrapper.find('.modal-btn.primary').trigger('click');
    await flushAll();

    const created = mockEvents.find((e) => e.summary === 'Зарядка');
    expect(created).toBeDefined();
    expect(created.recurrence).toBe('FREQ=DAILY');
    expect(wrapper.findAll('.kb-card').length).toBeGreaterThanOrEqual(1);
    expect(wrapper.findAll('.kb-card')[0].find('.kb-text').text()).toBe('Зарядка');
    wrapper.unmount();
  });

  it('adds a once task to a chosen day via the column plus button', async () => {
    const wrapper = await mountBoard([]);
    await wrapper.findAll('.kb-col-add')[2].trigger('click');
    await wrapper.findAll('.modal-input')[0].setValue('Стоматолог');
    await wrapper.find('.modal-btn.primary').trigger('click');
    await flushAll();

    const created = mockEvents.find((e) => e.summary === 'Стоматолог');
    expect(created).toBeDefined();
    expect(created.start.date).toBe('2026-01-07');
    expect(created.recurrence).toBe('');

    const cards = wrapper.findAll('.kb-card');
    expect(cards).toHaveLength(1);
    expect(wrapper.findAll('.kb-column')[2].findAll('.kb-card')).toHaveLength(1);
    expect(cards[0].find('.kb-freq').text()).toBe('Разово');
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 1');
    wrapper.unmount();
  });

  it('keeps the save button disabled until a name is entered', async () => {
    const wrapper = await mountBoard([]);
    await wrapper.find('.kb-tool-btn.primary').trigger('click');
    expect(wrapper.find('.modal-btn.primary').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('toggles a card done and updates the progress', async () => {
    const wrapper = await mountBoard([todo('run', { summary: 'Бег', date: WEEK, start: '09:00', recurrence: 'FREQ=DAILY' })]);
    let cards = wrapper.findAll('.kb-card');
    expect(cards).toHaveLength(7);
    expect(cards[0].classes()).not.toContain('done');
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 7');

    await cards[0].find('.kb-done').trigger('click');
    await flushAll();
    cards = wrapper.findAll('.kb-card');
    expect(cards[0].classes()).toContain('done');
    expect(wrapper.find('.kb-stats-text').text()).toBe('1 / 7');

    await cards[0].find('.kb-done').trigger('click');
    await flushAll();
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 7');
    wrapper.unmount();
  });

  it('moves a card between days by drag and drop, writing a new RRULE to the calendar', async () => {
    const wrapper = await mountBoard([timed('read', { summary: 'Чтение', recurrence: 'FREQ=DAILY' })]);
    expect(wrapper.findAll('.kb-card')).toHaveLength(7);

    const columns = wrapper.findAll('.kb-column');
    await columns[0].find('.kb-card').find('.kb-grip').trigger('dragstart');
    await columns[4].trigger('dragover');
    await columns[4].trigger('drop');
    await flushAll();

    const patched = mockEvents.find((e) => e.uid === 'read');
    expect(patched.recurrence).not.toContain('BYDAY=MO');
    expect(patched.recurrence).toContain('TU');

    expect(wrapper.findAll('.kb-column')[0].findAll('.kb-card')).toHaveLength(0);
    expect(wrapper.findAll('.kb-column')[4].findAll('.kb-card').length).toBeGreaterThanOrEqual(1);
    wrapper.unmount();
  });

  it('shows a time range when an end time is set and defaults to one hour after clearing it', async () => {
    const wrapper = await mountBoard([]);
    await wrapper.find('.kb-tool-btn.primary').trigger('click');
    const inputs = wrapper.findAll('.modal-input');
    await inputs[0].setValue('Звонок');
    await inputs[1].setValue('09:00');
    await inputs[2].setValue('09:30');
    await wrapper.find('.modal-btn.primary').trigger('click');
    await flushAll();

    let card = wrapper.find('.kb-card');
    expect(card.find('.kb-time').text()).toBe('09:00 – 09:30');

    await card.find('.kb-edit').trigger('click');
    const editInputs = wrapper.findAll('.modal-input');
    expect(editInputs[2].element.value).toBe('09:30');
    await editInputs[2].setValue('');
    await wrapper.find('.modal-btn.primary').trigger('click');
    await flushAll();

    card = wrapper.find('.kb-card');
    expect(card.find('.kb-time').text()).toBe('09:00 – 10:00');
    wrapper.unmount();
  });

  it('schedules a once task on an exact date via the editor and hides it in other weeks', async () => {
    const wrapper = await mountBoard([]);
    await wrapper.find('.kb-tool-btn.primary').trigger('click');
    await wrapper.findAll('.modal-input')[0].setValue('Праздник');
    await wrapper.findAll('.kb-freq-opt')[0].trigger('click'); // Разово
    await wrapper.find('input[type="date"]').setValue('2026-01-09');
    await wrapper.find('.modal-btn.primary').trigger('click');
    await flushAll();

    const columns = wrapper.findAll('.kb-column');
    expect(columns[4].findAll('.kb-card')).toHaveLength(1); // Friday
    expect(columns[4].find('.kb-text').text()).toBe('Праздник');
    expect(columns[4].find('.kb-freq').text()).toBe('Разово');

    await wrapper.findAll('.kb-nav .kb-arrow')[1].trigger('click');
    await flushAll();
    expect(wrapper.findAll('.kb-card')).toHaveLength(0);
    wrapper.unmount();
  });

  it('navigates between weeks refetching the calendar and jumps back to today', async () => {
    const wrapper = await mountBoard([]);
    const listCalls = () => fetchCalls.filter((c) => c.method === 'PROPFIND');
    expect(listCalls()).toHaveLength(2);

    expect(wrapper.find('.kb-today').exists()).toBe(false);
    const label = () => wrapper.find('.kb-week-label').text();
    expect(label()).toContain('января');
    expect(label()).toContain('2026');

    await wrapper.findAll('.kb-nav .kb-arrow')[1].trigger('click');
    await flushAll();
    expect(label()).toContain('января');
    expect(listCalls()).toHaveLength(4);

    await wrapper.find('.kb-today').trigger('click');
    await flushAll();
    expect(listCalls()).toHaveLength(6);
    expect(wrapper.find('.kb-today').exists()).toBe(false);
    wrapper.unmount();
  });

  it('renders no occurrences for a once task when another week is shown', async () => {
    const wrapper = await mountBoard([timed('meet', { summary: 'Встреча', date: '2026-01-09' })]);
    expect(wrapper.findAll('.kb-card')).toHaveLength(1);
    await wrapper.findAll('.kb-nav .kb-arrow')[1].trigger('click');
    await flushAll();
    expect(wrapper.findAll('.kb-card')).toHaveLength(0);
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 0');
    wrapper.unmount();
  });

  it('deletes a task via the editor and removes it from the calendar', async () => {
    const wrapper = await mountBoard([timed('doomed', { summary: 'Ненужное' })]);
    await wrapper.find('.kb-card').find('.kb-edit').trigger('click');
    await wrapper.find('.modal-btn.danger').trigger('click');
    await flushAll();
    expect(mockEvents.some((e) => e.uid === 'doomed')).toBe(false);
    expect(wrapper.findAll('.kb-card')).toHaveLength(0);
    wrapper.unmount();
  });

  it('shows a connect button when no Yandex account is available', async () => {
    clearAccount();
    const wrapper = await mountBoard([]);
    expect(wrapper.find('.kb-tool-btn.primary').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.kb-tools').text()).toContain('Подключить Яндекс');
    wrapper.unmount();
  });

  it('connects with a Yandex account, discovers calendars and loads the board', async () => {
    clearAccount();
    localStorage.removeItem('ycal-calendar');
    mockEvents.push(timed('fit', { summary: 'Занятие', recurrence: 'FREQ=DAILY' }));
    const wrapper = mount(KanbanView);
    await flushAll();
    expect(wrapper.find('.kb-tool-btn.primary').attributes('disabled')).toBeDefined();

    await wrapper.findAll('.kb-tool-btn')[0].trigger('click');
    await wrapper.find('.kb-conn-login').setValue(ACCOUNT.login);
    await wrapper.find('.kb-conn-pass').setValue(ACCOUNT.password);
    await wrapper.find('.modal-btn.primary').trigger('click');
    await flushAll();

    expect(wrapper.find('.kb-conn-cal').exists()).toBe(true);
    await wrapper.find('.modal-btn.primary').trigger('click');
    await flushAll();

    expect(wrapper.find('.kb-tool-btn.primary').attributes('disabled')).toBeUndefined();
    expect(wrapper.findAll('.kb-card')).toHaveLength(7);
    wrapper.unmount();
  });

  it('allows pick only after a calendar is discovered', async () => {
    resetEventsMock();
    const wrapper = mount(KanbanView);
    await flushAll();
    await wrapper.findAll('.kb-tool-btn')[0].trigger('click');
    expect(wrapper.findAll('.modal-btn.primary')).toHaveLength(1);
    expect(wrapper.findAll('.modal-btn.primary')[0].text()).toBe('Проверить');
    wrapper.unmount();
  });

  it('opens the settings gear with calendar pickers and saves them', async () => {
    mockEvents.push(timed('fit', { summary: 'Занятие', recurrence: 'FREQ=DAILY' }));
    const wrapper = await mountBoard([]);
    await wrapper.find('.kb-tool-gear').trigger('click');
    await flushAll();

    expect(wrapper.find('.kb-conn-cal').exists()).toBe(true);
    expect(wrapper.find('.kb-conn-tasks').exists()).toBe(true);
    const saveBtn = wrapper.findAll('.modal-btn.primary').pop();
    expect(saveBtn.text()).toBe('Сохранить');

    await wrapper.findAll('.kb-conn-tasks input[type="checkbox"]')[0].setChecked(false);
    await saveBtn.trigger('click');
    await flushAll();

    expect(wrapper.findAll('.kb-card')).toHaveLength(7);
    expect(wrapper.find('.kb-tool-btn.primary').attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });

  it('renders events and tasks from several calendars on one board', async () => {
    const CAL2 = { href: '/cal/dflt2/', displayName: 'Второй календарь', component: 'VEVENT' };
    const TASKS2 = { href: '/cal/tasks2/', displayName: 'Другой список', component: 'VTODO' };
    setCalendars([CALENDAR, CAL2, TASKS_CALENDAR, TASKS2]);
    const mocks = createCalDavMock({ account: ACCOUNT, calendars: [CALENDAR, CAL2, TASKS_CALENDAR, TASKS2], events: mockEvents });
    vi.stubGlobal('fetch', mocks.handler);
    mockEvents.push(
      timed('ev1', { summary: 'Из первого', recurrence: 'FREQ=DAILY' }),
      { ...timed('ev2', { summary: 'Из второго' }), href: '/cal/dflt2/ev2.ics' },
      { uid: 't2', kind: 'VTODO', summary: 'Задача второго списка', status: 'NEEDS-ACTION', etag: '"e2"', href: '/cal/tasks2/t2.ics' },
    );
    const wrapper = await mountBoard([]);
    expect(wrapper.findAll('.kb-card')).toHaveLength(9);
    expect(wrapper.find('.kb-undated .kb-text').text()).toBe('Задача второго списка');
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 9');
    wrapper.unmount();
  });

  it('renders undated tasks from the tasks calendar in the no-date block', async () => {
    const wrapper = await mountBoard([{
      uid: 'u1',
      kind: 'VTODO',
      summary: 'Разобрать почту',
      status: 'NEEDS-ACTION',
      etag: '"e2"',
      href: '/cal/tasks/u1.ics',
    }]);
    expect(wrapper.find('.kb-undated').exists()).toBe(true);
    expect(wrapper.find('.kb-undated .kb-text').text()).toBe('Разобрать почту');
    expect(wrapper.findAll('.kb-column .kb-card')).toHaveLength(0);
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 1');
    wrapper.unmount();
  });

  it('toggles a task done and persists STATUS to the tasks calendar', async () => {
    const wrapper = await mountBoard([{
      uid: 't1',
      kind: 'VTODO',
      summary: 'Оплатить счета',
      status: 'NEEDS-ACTION',
      etag: '"e2"',
      href: '/cal/tasks/t1.ics',
    }]);
    const card = wrapper.find('.kb-undated .kb-card');
    expect(card.classes()).not.toContain('done');
    await card.find('.kb-done').trigger('click');
    await flushAll();
    const rec = mockEvents.find((e) => e.uid === 't1');
    expect(rec.status).toBe('COMPLETED');
    expect(wrapper.find('.kb-undated .kb-card').classes()).toContain('done');
    wrapper.unmount();
  });
});