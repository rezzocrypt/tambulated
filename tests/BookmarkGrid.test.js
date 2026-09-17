import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BookmarkGrid from '../src/components/Bookmark/BookmarkGrid.vue';

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

function mountGrid(extra = {}) {
  return mount(BookmarkGrid, { props: { ...factory(), ...extra } });
}

describe('BookmarkGrid', () => {
  it('renders items with folder/file icons', () => {
    const wrapper = mountGrid();
    const itemsEls = wrapper.findAll('.bookmark-item');
    expect(itemsEls).toHaveLength(2);
    expect(itemsEls[0].find('a').classes()).toContain('folder');
    expect(itemsEls[1].find('a').classes()).toContain('file');
    expect(itemsEls[0].find('.label').text()).toBe('Folder');
  });

  it('marks items as draggable', () => {
    const wrapper = mountGrid();
    const itemsEls = wrapper.findAll('.bookmark-item');
    expect(itemsEls[0].attributes('draggable')).toBe('true');
    expect(itemsEls[1].attributes('draggable')).toBe('true');
  });

  it('calls clickFn on item click', async () => {
    const props = factory();
    const wrapper = mountGrid(props);
    await wrapper.findAll('.bookmark-item')[0].trigger('click');
    expect(props.clickFn).toHaveBeenCalledWith(items[0]);
  });

  it('routes item context menu to contextFn only', async () => {
    const props = factory();
    const wrapper = mountGrid(props);
    await wrapper.findAll('.bookmark-item')[1].trigger('contextmenu');
    expect(props.contextFn).toHaveBeenCalledWith(expect.any(Object), items[1]);
    expect(props.backgroundContextFn).not.toHaveBeenCalled();
  });

  it('routes wrapper context menu to backgroundContextFn', async () => {
    const props = factory();
    const wrapper = mountGrid(props);
    await wrapper.find('.wrapper').trigger('contextmenu');
    expect(props.backgroundContextFn).toHaveBeenCalledTimes(1);
    expect(props.contextFn).not.toHaveBeenCalled();
  });

  it('calls dragStartFn on dragstart', async () => {
    const props = factory();
    const wrapper = mountGrid(props);
    const item = wrapper.findAll('.bookmark-item')[1];
    await item.trigger('dragstart', { dataTransfer: { effectAllowed: '', setData: () => {} } });
    expect(props.dragStartFn).toHaveBeenCalledWith(items[1]);
  });

  it('toggles the hovered class and calls dropFn on drop', async () => {
    const props = factory();
    const wrapper = mountGrid(props);
    const item = wrapper.findAll('.bookmark-item')[0];
    await item.trigger('dragover');
    expect(item.classes()).toContain('hovered');
    await item.trigger('drop');
    expect(props.dropFn).toHaveBeenCalledWith(items[0]);
    expect(item.classes()).not.toContain('hovered');
  });

  it('clears hovered state on dragleave', async () => {
    const wrapper = mountGrid();
    const item = wrapper.findAll('.bookmark-item')[0];
    await item.trigger('dragover');
    await item.trigger('dragleave');
    expect(item.classes()).not.toContain('hovered');
  });

  it('calls dropRootFn on wrapper drop', async () => {
    const props = factory();
    const wrapper = mountGrid(props);
    await wrapper.find('.wrapper').trigger('drop');
    expect(props.dropRootFn).toHaveBeenCalledTimes(1);
  });
});