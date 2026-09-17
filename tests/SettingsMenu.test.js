import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import SettingsMenu from '../src/components/Common/SettingsMenu.vue';
import { useTheme } from '@/composables/useTheme.js';
import { useLocale } from '@/composables/useLocale.js';

beforeEach(() => {
  localStorage.clear();
  useTheme().setTheme('system');
  useLocale().setLocale('ru');
});

describe('SettingsMenu', () => {
  it('is closed by default and opens on gear click', async () => {
    const wrapper = mount(SettingsMenu);
    expect(wrapper.find('.settings-pop').exists()).toBe(false);
    await wrapper.find('.gear-btn').trigger('click');
    expect(wrapper.find('.settings-pop').exists()).toBe(true);
    wrapper.unmount();
  });

  it('applies a theme when a theme option is clicked', async () => {
    const wrapper = mount(SettingsMenu);
    await wrapper.find('.gear-btn').trigger('click');
    const options = wrapper.findAll('.theme-option');
    expect(options.length).toBeGreaterThanOrEqual(4);
    await options[2].trigger('click');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    wrapper.unmount();
  });

  it('switches the locale from the language options', async () => {
    const wrapper = mount(SettingsMenu);
    await wrapper.find('.gear-btn').trigger('click');
    const options = wrapper.findAll('.locale-option');
    expect(options.map((o) => o.text())).toEqual(['RU', 'EN', '中文']);
    await options[1].trigger('click');
    expect(useLocale().current.value).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(wrapper.find('.gear-btn').attributes('title')).toBe('Settings');
    wrapper.unmount();
  });

  it('closes on Escape', async () => {
    const wrapper = mount(SettingsMenu);
    await wrapper.find('.gear-btn').trigger('click');
    expect(wrapper.find('.settings-pop').exists()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(wrapper.find('.settings-pop').exists()).toBe(false);
    wrapper.unmount();
  });

  it('closes on outside click', async () => {
    const wrapper = mount(SettingsMenu);
    await wrapper.find('.gear-btn').trigger('click');
    expect(wrapper.find('.settings-pop').exists()).toBe(true);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.find('.settings-pop').exists()).toBe(false);
    wrapper.unmount();
  });
});