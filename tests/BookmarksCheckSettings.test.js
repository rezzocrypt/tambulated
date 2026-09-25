import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import BookmarksCheckSettings from '@/components/Bookmark/BookmarksCheckSettings.vue';
import { useLocale } from '@/composables/useLocale.js';
import { useBookmarks } from '@/composables/useBookmarks.js';
import { useDeadBookmarks } from '@/composables/useDeadBookmarks.js';
import { collectFolders } from '@/utils/bookmarkTree.js';
import chromeAPI from '@/assets/chrome-mock.js';

function openPopover(wrapper) {
  return wrapper.find('.ops-btn').trigger('click').then(() => nextTick());
}

async function settle() {
  for (let i = 0; i < 20; i++) {
    await flushPromises();
    await nextTick();
  }
}

let bookmarks;

beforeEach(async () => {
  localStorage.clear();
  useLocale().setLocale('ru');
  vi.restoreAllMocks();
  bookmarks = useBookmarks();
  const state = useDeadBookmarks(bookmarks);
  state.targetId.value = '';
  state.lastResult.value = null;
  await bookmarks.loadTree();
});

describe('BookmarksCheckSettings', () => {
  it('renders the popover without crashing when no scan has run yet', async () => {
    const wrapper = mount(BookmarksCheckSettings);
    await openPopover(wrapper);
    expect(wrapper.find('.settings-pop').exists()).toBe(true);
    expect(wrapper.find('.settings-head').text()).toBe('Периодические операции');
    expect(wrapper.find('.check-btn').text()).toBe('Детектить мёртвые');
    wrapper.unmount();
  });

  it('lists every tree folder after the default destination', async () => {
    const expected = collectFolders(bookmarks.rootNode.value?.children);
    const wrapper = mount(BookmarksCheckSettings);
    await openPopover(wrapper);
    await wrapper.find('.target-btn').trigger('click');
    await nextTick();

    const rows = wrapper.findAll('.tree-row');
    expect(rows).toHaveLength(expected.length + 1);
    expect(rows[0].text()).toContain('Not Valided (корень)');
    const nestedIndex = expected.findIndex((item) => item.depth > 0);
    if (nestedIndex >= 0) {
      expect(rows[nestedIndex + 1].text()).toContain(expected[nestedIndex].title);
      expect(rows[nestedIndex + 1].attributes('style')).toContain('padding-left');
    }
    wrapper.unmount();
  });

  it('shows the chosen folder in the trigger and marks it in the tree', async () => {
    const chosen = collectFolders(bookmarks.rootNode.value?.children)[0];
    const wrapper = mount(BookmarksCheckSettings);
    await openPopover(wrapper);

    await wrapper.find('.target-btn').trigger('click');
    await nextTick();
    await wrapper.findAll('.tree-row')[1].trigger('click');
    await nextTick();

    expect(wrapper.find('.target-tree').exists()).toBe(false);
    expect(wrapper.find('.target-name').text()).toBe(chosen.title);
    expect(useDeadBookmarks(bookmarks).targetId.value).toBe(chosen.id);

    await wrapper.find('.target-btn').trigger('click');
    await nextTick();
    expect(wrapper.findAll('.tree-row')[1].classes()).toContain('selected');
    expect(wrapper.findAll('.tree-row')[1].attributes('aria-checked')).toBe('true');
    expect(wrapper.find('.target-name').text()).toBe(chosen.title);
    wrapper.unmount();
  });

  it('closes the tree on Escape without closing the panel', async () => {
    const wrapper = mount(BookmarksCheckSettings);
    await openPopover(wrapper);
    await wrapper.find('.target-btn').trigger('click');
    await nextTick();
    expect(wrapper.find('.target-tree').exists()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(wrapper.find('.target-tree').exists()).toBe(false);
    expect(wrapper.find('.settings-pop').exists()).toBe(true);
    wrapper.unmount();
  });

  it('moves dead bookmarks into the folder chosen in the tree', async () => {
    const chosen = collectFolders(bookmarks.rootNode.value?.children)[0];
    const move = vi.spyOn(chromeAPI.bookmarks, 'move').mockReturnValue({});
    vi.spyOn(chromeAPI.bookmarks, 'create').mockReturnValue({ id: 'nv-test' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));

    const wrapper = mount(BookmarksCheckSettings);
    await openPopover(wrapper);
    await wrapper.find('.target-btn').trigger('click');
    await nextTick();
    await wrapper.findAll('.tree-row')[1].trigger('click');
    await wrapper.find('.check-btn').trigger('click');
    await settle();

    expect(move).toHaveBeenCalled();
    for (const call of move.mock.calls) {
      expect(call[1]).toEqual({ parentId: chosen.id });
    }
    expect(wrapper.find('.check-status').text()).toContain('Перемещено мёртвых закладок');
    vi.unstubAllGlobals();
    wrapper.unmount();
  });

  it('shows the number of moved dead bookmarks after a scan', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const wrapper = mount(BookmarksCheckSettings);
    await openPopover(wrapper);

    await wrapper.find('.check-btn').trigger('click');
    await settle();

    const status = wrapper.find('.check-status');
    expect(status.exists()).toBe(true);
    expect(status.text()).toContain('Перемещено мёртвых закладок');
    expect(globalThis.fetch).toHaveBeenCalled();
    vi.unstubAllGlobals();
    wrapper.unmount();
  });
});
