import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import KanbanView from '../src/views/KanbanView.vue';
import { useLocale } from '../src/composables/useLocale.js';
import { reloadKanban } from '../src/composables/useKanban.js';
import { setCalendarToken, clearCalendarToken } from '../src/composables/useGoogleCalendar.js';
import { ALL_DAYS, dateKey, parseDateKey, addDays, weekdayNum } from '../src/utils/week.js';

const WEEK = '2026-01-05';

let mockEvents;
let fetchCalls;

function timed(id, { summary = 'Task', date = WEEK, start = '09:00', end = '10:00', recurrence, recurringEventId } = {}) {
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

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function expand(item, min, max) {
  if (item.recurringEventId) return [item];
  const rr = item.recurrence?.[0];
  if (!rr) return [item];
  const startStr = item.start?.date || item.start?.dateTime?.slice(0, 10) || '';
  const startDate = startStr ? parseDateKey(startStr) : null;
  if (!startDate) return [item];
  const freq = {};
  let byday = [];
  for (const part of rr.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) freq[part.slice(0, idx)] = part.slice(idx + 1);
  }
  byday = (freq.BYDAY || '').split(',').map((s) => ({ MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 }[s])).filter(Boolean);
  const out = [];
  const minD = parseDateKey(min);
  const maxD = parseDateKey(max);
  const now = new Date(Math.min(startDate.getTime(), minD.getTime()));
  if (freq.FREQ === 'DAILY' || byday.includes(weekdayNum(startDate))) out.push(item);
  for (let d = now; dateKey(d) < dateKey(maxD); d = addDays(d, 1)) {
    if (dateKey(d) < dateKey(minD) || dateKey(d) <= dateKey(startDate)) continue;
    const dayNum = weekdayNum(d);
    const hit = freq.FREQ === 'DAILY' || byday.includes(dayNum);
    if (!hit) continue;
    const key = dateKey(d);
    const startTime = item.start?.dateTime?.slice(11, 16) || '09:00';
    const endTime = item.end?.dateTime?.slice(11, 16) || startTime;
    const inst = item.start?.date
      ? {
          id: `${item.id}-${key}`,
          summary: item.summary,
          start: { date: key },
          end: { date: dateKey(addDays(d, 1)) },
          recurringEventId: item.id,
          originalStartTime: { date: key },
        }
      : {
          id: `${item.id}-${key}`,
          summary: item.summary,
          start: { dateTime: `${key}T${startTime}:00` },
          end: { dateTime: `${key}T${endTime}:00` },
          recurringEventId: item.id,
          originalStartTime: { dateTime: `${key}T${startTime}:00` },
        };
    out.push(inst);
  }
  return out;
}

async function mockApi(url, opts = {}) {
  const method = opts.method || 'GET';
  fetchCalls.push({ url: String(url), method });
  if (method === 'GET' && url.includes('/events?')) {
    const params = new URLSearchParams(url.split('?')[1]);
    const min = params.get('timeMin').slice(0, 10);
    const max = params.get('timeMax').slice(0, 10);
    const items = [];
    for (const ev of mockEvents) {
      for (const inst of expand(ev, min, max)) {
        const date = inst.originalStartTime?.date
          ? inst.originalStartTime.date.slice(0, 10)
          : (inst.start?.date || inst.start?.dateTime || '').slice(0, 10);
        if (date >= min && date <= max) items.push(inst);
      }
    }
    items.sort((a, b) => (a.start?.dateTime || a.start?.date || '').localeCompare(b.start?.dateTime || b.start?.date || ''));
    return jsonResponse({ items });
  }
  if (method === 'GET') {
    const id = decodeURIComponent(url.split('/').pop());
    const ev = mockEvents.find((e) => e.id === id);
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
  useLocale().setLocale('ru');
  reloadKanban();
  mockEvents = [];
  fetchCalls = [];
  vi.stubGlobal('fetch', mockApi);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 5, 12)); // Monday
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  clearCalendarToken();
  localStorage.removeItem('kanban-done');
});

async function flushAll() {
  for (let i = 0; i < 60; i += 1) await Promise.resolve();
}

async function mountBoard(events = mockEvents) {
  mockEvents = events;
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
      ...ALL_DAYS.map((day) =>
        timed(`daily-${day}`, { summary: 'Зарядка', date: dateKey(addDays(parseDateKey(WEEK), day - 1)), recurringEventId: 'daily', recurrence: 'FREQ=DAILY' }),
      ),
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
    expect(created.recurrence).toEqual(['FREQ=DAILY']);
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
    expect(created.recurrence).toEqual([]);

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
    const wrapper = await mountBoard([timed('run', { summary: 'Бег', date: WEEK, recurrence: 'FREQ=DAILY' })]);
    let cards = wrapper.findAll('.kb-card');
    expect(cards).toHaveLength(7);
    expect(cards[0].classes()).not.toContain('done');
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 7');

    await cards[0].find('.kb-done').trigger('click');
    cards = wrapper.findAll('.kb-card');
    expect(cards[0].classes()).toContain('done');
    expect(wrapper.find('.kb-stats-text').text()).toBe('1 / 7');

    await cards[0].find('.kb-done').trigger('click');
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 7');
    wrapper.unmount();
  });

  it('moves a card between days by drag and drop, patching the calendar', async () => {
    const wrapper = await mountBoard([timed('read', { summary: 'Чтение', date: WEEK, recurrence: 'FREQ=DAILY' })]);
    expect(wrapper.findAll('.kb-card')).toHaveLength(7);

    const columns = wrapper.findAll('.kb-column');
    await columns[0].find('.kb-card').find('.kb-grip').trigger('dragstart');
    await columns[4].trigger('dragover');
    await columns[4].trigger('drop');
    await flushAll();

    const patched = mockEvents.find((e) => e.id === 'read');
    expect(patched.recurrence[0]).not.toContain('BYDAY=MO');
    expect(patched.recurrence[0]).toContain('TU');

    expect(wrapper.findAll('.kb-column')[0].findAll('.kb-card')).toHaveLength(0);
    expect(wrapper.findAll('.kb-column')[4].findAll('.kb-card').length).toBeGreaterThanOrEqual(1);
    wrapper.unmount();
  });

  it('shows a time range when an end time is set and clears it on edit', async () => {
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
    expect(card.find('.kb-time').text()).toBe('09:00');
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
    const listCalls = () => fetchCalls.filter((c) => c.url.includes('/events?'));
    expect(listCalls()).toHaveLength(1);

    expect(wrapper.find('.kb-today').exists()).toBe(false);
    const label = () => wrapper.find('.kb-week-label').text();
    expect(label()).toContain('января');
    expect(label()).toContain('2026');

    await wrapper.findAll('.kb-nav .kb-arrow')[1].trigger('click');
    await flushAll();
    expect(label()).toContain('января');
    expect(listCalls()).toHaveLength(2);
    expect(listCalls()[1].url).toContain('2026-01-12');

    await wrapper.find('.kb-today').trigger('click');
    await flushAll();
    expect(listCalls()).toHaveLength(3);
    expect(listCalls()[2].url).toContain('2026-01-05');
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
    const wrapper = await mountBoard([timed('doomed', { summary: 'Ненужное', date: WEEK })]);
    await wrapper.find('.kb-card').find('.kb-edit').trigger('click');
    await wrapper.find('.modal-btn.danger').trigger('click');
    await flushAll();
    expect(mockEvents.some((e) => e.id === 'doomed')).toBe(false);
    expect(wrapper.findAll('.kb-card')).toHaveLength(0);
    wrapper.unmount();
  });

  it('shows a connect button when no Google token is available', async () => {
    localStorage.removeItem('gcal-token');
    const wrapper = await mountBoard([]);
    expect(wrapper.find('.kb-tool-btn.primary').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.kb-tools').text()).toContain('Подключить Google');
    wrapper.unmount();
  });
});