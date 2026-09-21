import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import BlocksSettings from '../src/components/Common/BlocksSettings.vue';
import { useLocale } from '@/composables/useLocale.js';
import { reloadBlockLayout } from '@/composables/useBlocks.js';

beforeEach(() => {
  localStorage.clear();
  reloadBlockLayout();
  useLocale().setLocale('ru');
});

describe('BlocksSettings', () => {
  it('opens on gear click and lists all blocks', async () => {
    const wrapper = mount(BlocksSettings);
    expect(wrapper.find('.settings-pop').exists()).toBe(false);
    await wrapper.find('.gear-btn').trigger('click');
    expect(wrapper.find('.settings-pop').exists()).toBe(true);
    const names = wrapper.findAll('.block-name').map((n) => n.text());
    expect(names).toEqual(['Часы', 'Погода', 'Криптовалюты']);
    wrapper.unmount();
  });

  it('hides a block via its toggle and persists the layout', async () => {
    const wrapper = mount(BlocksSettings);
    await wrapper.find('.gear-btn').trigger('click');
    await wrapper.findAll('.block-toggle')[1].trigger('click');

    const layout = JSON.parse(localStorage.getItem('blocks-layout'));
    expect(layout.hidden).toEqual(['weather']);
    expect(wrapper.findAll('.block-row')[1].classes()).toContain('off');
    wrapper.unmount();
  });

  it('reorders blocks with the up arrow and persists the layout', async () => {
    const wrapper = mount(BlocksSettings);
    await wrapper.find('.gear-btn').trigger('click');
    const rows = wrapper.findAll('.block-row');
    await rows[1].find('.block-controls .block-arrow').trigger('click');

    const layout = JSON.parse(localStorage.getItem('blocks-layout'));
    expect(layout.order).toEqual(['weather', 'datetime', 'crypto']);
    wrapper.unmount();
  });

  it('closes on Escape', async () => {
    const wrapper = mount(BlocksSettings);
    await wrapper.find('.gear-btn').trigger('click');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(wrapper.find('.settings-pop').exists()).toBe(false);
    wrapper.unmount();
  });

  it('closes on outside click', async () => {
    const wrapper = mount(BlocksSettings);
    await wrapper.find('.gear-btn').trigger('click');
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.find('.settings-pop').exists()).toBe(false);
    wrapper.unmount();
  });
});