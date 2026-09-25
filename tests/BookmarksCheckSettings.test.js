import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import BookmarksCheckSettings from '@/components/Bookmark/BookmarksCheckSettings.vue';
import { useLocale } from '@/composables/useLocale.js';

function openPopover(wrapper) {
  return wrapper.find('.ops-btn').trigger('click').then(() => nextTick());
}

beforeEach(() => {
  localStorage.clear();
  useLocale().setLocale('ru');
  vi.restoreAllMocks();
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

  it('shows the number of moved dead bookmarks after a scan', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const wrapper = mount(BookmarksCheckSettings);
    await openPopover(wrapper);

    await wrapper.find('.check-btn').trigger('click');
    for (let i = 0; i < 20; i++) {
      await flushPromises();
      await nextTick();
    }

    const status = wrapper.find('.check-status');
    expect(status.exists()).toBe(true);
    expect(status.text()).toContain('Перемещено в Not Valided');
    expect(globalThis.fetch).toHaveBeenCalled();
    vi.unstubAllGlobals();
    wrapper.unmount();
  });
});
