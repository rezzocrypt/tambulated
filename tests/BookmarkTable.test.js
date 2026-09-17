import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BookmarkTable from '../src/components/Bookmark/BookmarkTable.vue';
import { useLocale } from '@/composables/useLocale.js';

const items = [
  { id: 'f1', title: 'Folder', children: [] },
  { id: 'b1', title: 'Leaf', url: 'https://leaf.example' },
];

function factory() {
  return {
    items,
    clickFn: vi.fn(),
    contextFn: vi.fn(),
    backgroundContextFn: vi.fn(),
    iconFn: () => 'file',
    dragStartFn: vi.fn(),
    dropFn: vi.fn(),
    dropRootFn: vi.fn(),
  };
}

function mountTable(extra = {}) {
  return mount(BookmarkTable, { props: { ...factory(), ...extra } });
}

beforeEach(() => {
  localStorage.clear();
  useLocale().setLocale('ru');
});

describe('BookmarkTable', () => {
  it('renders translated column headers', () => {
    const wrapper = mountTable();
    const headers = wrapper.findAll('th').map((th) => th.text());
    expect(headers).toContain('Название');
    expect(headers).toContain('Адрес');
  });

  it('renders rows with folder/file icons and urls', () => {
    const wrapper = mountTable();
    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].find('.td-icon a').classes()).toContain('folder');
    expect(rows[1].find('.td-icon a').classes()).toContain('file');
    expect(rows[1].find('.td-url').text()).toBe('https://leaf.example');
    expect(rows[0].find('.td-url').text()).toBe('—');
  });

  it('calls clickFn on row click', async () => {
    const props = factory();
    const wrapper = mountTable(props);
    await wrapper.findAll('tbody tr')[0].trigger('click');
    expect(props.clickFn).toHaveBeenCalledWith(items[0]);
  });

  it('routes row context menu to contextFn only', async () => {
    const props = factory();
    const wrapper = mountTable(props);
    await wrapper.findAll('tbody tr')[1].trigger('contextmenu');
    expect(props.contextFn).toHaveBeenCalledWith(expect.any(Object), items[1]);
    expect(props.backgroundContextFn).not.toHaveBeenCalled();
  });

  it('routes wrapper context menu to backgroundContextFn', async () => {
    const props = factory();
    const wrapper = mountTable(props);
    await wrapper.find('.table-wrapper').trigger('contextmenu');
    expect(props.backgroundContextFn).toHaveBeenCalledTimes(1);
    expect(props.contextFn).not.toHaveBeenCalled();
  });

  it('toggles hovered class and calls dropFn on row drop', async () => {
    const props = factory();
    const wrapper = mountTable(props);
    const row = wrapper.findAll('tbody tr')[0];
    await row.trigger('dragover');
    expect(row.classes()).toContain('hovered');
    await row.trigger('drop');
    expect(props.dropFn).toHaveBeenCalledWith(items[0]);
    expect(row.classes()).not.toContain('hovered');
  });
});