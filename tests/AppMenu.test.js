import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import AppMenu from '../src/components/Common/AppMenu.vue';
import { useLocale } from '@/composables/useLocale.js';

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div>home</div>' } },
      { path: '/tasks', name: 'tasks', component: { template: '<div>tasks</div>' } },
    ],
  });
}

beforeEach(() => {
  localStorage.clear();
  useLocale().setLocale('ru');
});

describe('AppMenu', () => {
  it('renders a bookmark and a tasks switcher', async () => {
    const router = makeRouter();
    const wrapper = mount(AppMenu, { global: { plugins: [router] } });
    await flushPromises();

    const items = wrapper.findAll('.app-menu-item');
    expect(items.length).toBe(2);
    expect(items[0].attributes('title')).toBe('Закладки');
    expect(items[1].attributes('title')).toBe('Список дел');
    wrapper.unmount();
  });

  it('opens the settings popup from the menu', async () => {
    const router = makeRouter();
    const wrapper = mount(AppMenu, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.find('.settings-pop').exists()).toBe(false);
    await wrapper.find('.gear-btn').trigger('click');
    await nextTick();
    expect(wrapper.find('.settings-pop').exists()).toBe(true);
    expect(wrapper.find('.settings-version').exists()).toBe(true);
    wrapper.unmount();
  });

  it('highlights the active screen', async () => {
    const router = makeRouter();
    const wrapper = mount(AppMenu, { global: { plugins: [router] } });
    await flushPromises();

    await router.push('/tasks');
    await nextTick();
    expect(wrapper.findAll('.app-menu-item')[1].classes()).toContain('active');
    expect(wrapper.findAll('.app-menu-item')[0].classes()).not.toContain('active');

    await router.push('/');
    await nextTick();
    expect(wrapper.findAll('.app-menu-item')[0].classes()).toContain('active');
    expect(wrapper.findAll('.app-menu-item')[1].classes()).not.toContain('active');
    wrapper.unmount();
  });
});