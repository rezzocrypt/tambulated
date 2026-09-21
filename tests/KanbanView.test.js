import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import KanbanView from '../src/views/KanbanView.vue';
import { useLocale } from '../src/composables/useLocale.js';
import { useKanban, reloadKanban } from '../src/composables/useKanban.js';

beforeEach(() => {
  localStorage.clear();
  useLocale().setLocale('ru');
  reloadKanban();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 5, 12)); // Monday
});

afterEach(() => {
  vi.useRealTimers();
});

function addOnce(text, day) {
  const { addTask } = useKanban();
  return addTask({ text, freq: 'once', days: [day], week: '2026-01-05' });
}

describe('KanbanView', () => {
  it('renders 7 day columns for the current week with day numbers and names', () => {
    const wrapper = mount(KanbanView);
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

  it('adds a daily task from the toolbar and renders it in every column', async () => {
    const wrapper = mount(KanbanView);
    await wrapper.find('.kb-tool-btn.primary').trigger('click');
    expect(wrapper.find('.modal').exists()).toBe(true);

    await wrapper.findAll('.modal-input')[0].setValue('Зарядка');
    expect(wrapper.find('.modal-btn.primary').attributes('disabled')).toBeUndefined();
    await wrapper.find('.modal-btn.primary').trigger('click');

    const cards = wrapper.findAll('.kb-card');
    expect(cards).toHaveLength(7);
    expect(cards[0].find('.kb-text').text()).toBe('Зарядка');
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 7');
    wrapper.unmount();
  });

  it('adds a once task to a chosen day via the column plus button', async () => {
    const wrapper = mount(KanbanView);
    await wrapper.findAll('.kb-col-add')[2].trigger('click');
    await wrapper.findAll('.modal-input')[0].setValue('Стоматолог');
    await wrapper.find('.modal-btn.primary').trigger('click');

    const cards = wrapper.findAll('.kb-card');
    expect(cards).toHaveLength(1);
    expect(wrapper.findAll('.kb-column')[2].findAll('.kb-card')).toHaveLength(1);
    expect(cards[0].find('.kb-text').text()).toBe('Стоматолог');
    expect(cards[0].find('.kb-freq').text()).toBe('Разово');
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 1');
    wrapper.unmount();
  });

  it('keeps the save button disabled until a name is entered', async () => {
    const wrapper = mount(KanbanView);
    await wrapper.find('.kb-tool-btn.primary').trigger('click');
    expect(wrapper.find('.modal-btn.primary').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('toggles a card done and updates the progress', async () => {
    const { addTask } = useKanban();
    addTask({ text: 'Бег', freq: 'daily' });
    const wrapper = mount(KanbanView);

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

  it('moves a card between days by drag and drop', async () => {
    const { addTask, getTask, tasks } = useKanban();
    addTask({ text: 'Чтение', freq: 'daily' });
    const taskId = tasks.value[0].id;
    const wrapper = mount(KanbanView);

    const columns = wrapper.findAll('.kb-column');
    const monCard = columns[0].find('.kb-card');
    await monCard.find('.kb-grip').trigger('dragstart');
    await columns[4].trigger('dragover');
    await columns[4].trigger('drop');

    const task = getTask(taskId);
    expect(task.freq).toBe('custom');
    expect(task.days).not.toContain(1);
    expect(task.days).toContain(5);

    expect(wrapper.findAll('.kb-column')[0].findAll('.kb-card')).toHaveLength(0);
    expect(wrapper.findAll('.kb-column')[4].findAll('.kb-card')).toHaveLength(1);
    wrapper.unmount();
  });

  it('shows a time range when an end time is set', async () => {
    const wrapper = mount(KanbanView);
    await wrapper.find('.kb-tool-btn.primary').trigger('click');
    const inputs = wrapper.findAll('.modal-input');
    await inputs[0].setValue('Звонок');
    await inputs[1].setValue('09:00');
    await inputs[2].setValue('09:30');
    await wrapper.find('.modal-btn.primary').trigger('click');

    let card = wrapper.find('.kb-card');
    expect(card.find('.kb-time').text()).toBe('09:00 – 09:30');

    await card.find('.kb-edit').trigger('click');
    const editInputs = wrapper.findAll('.modal-input');
    expect(editInputs[2].element.value).toBe('09:30');
    await editInputs[2].setValue('');
    await wrapper.find('.modal-btn.primary').trigger('click');

    card = wrapper.find('.kb-card');
    expect(card.find('.kb-time').text()).toBe('09:00');
    wrapper.unmount();
  });

  it('schedules a once task on an exact date via the editor', async () => {
    const wrapper = mount(KanbanView);
    await wrapper.find('.kb-tool-btn.primary').trigger('click');
    await wrapper.findAll('.modal-input')[0].setValue('Праздник');
    await wrapper.findAll('.kb-freq-opt')[0].trigger('click'); // Разово
    await wrapper.find('input[type="date"]').setValue('2026-01-09');
    await wrapper.find('.modal-btn.primary').trigger('click');

    const columns = wrapper.findAll('.kb-column');
    expect(columns[4].findAll('.kb-card')).toHaveLength(1); // Friday
    expect(columns[4].find('.kb-text').text()).toBe('Праздник');
    expect(columns[4].find('.kb-freq').text()).toBe('Разово');

    await wrapper.findAll('.kb-nav .kb-arrow')[1].trigger('click');
    expect(wrapper.findAll('.kb-card')).toHaveLength(0);
    wrapper.unmount();
  });

  it('navigates between weeks and jumps back to today', async () => {
    const wrapper = mount(KanbanView);
    expect(wrapper.find('.kb-today').exists()).toBe(false);
    const label = () => wrapper.find('.kb-week-label').text();
    expect(label()).toContain('января');
    expect(label()).toContain('2026');

    await wrapper.findAll('.kb-nav .kb-arrow')[1].trigger('click');
    expect(label()).toContain('января');
    await wrapper.find('.kb-today').trigger('click');
    expect(wrapper.find('.kb-today').exists()).toBe(false);
    expect(label()).toContain('января');
    wrapper.unmount();
  });

  it('renders no occurrences for a once task when another week is shown', async () => {
    addOnce('Встреча', 5);
    const wrapper = mount(KanbanView);
    expect(wrapper.findAll('.kb-card')).toHaveLength(1);
    await wrapper.findAll('.kb-nav .kb-arrow')[1].trigger('click');
    expect(wrapper.findAll('.kb-card')).toHaveLength(0);
    expect(wrapper.find('.kb-stats-text').text()).toBe('0 / 0');
    wrapper.unmount();
  });
});

function dateKeyOf(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}