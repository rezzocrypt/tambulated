import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import BreadCrumbs from '../src/components/BreadCrumbs.vue';
import { useLocale } from '@/composables/useLocale.js';

beforeEach(() => {
  localStorage.clear();
  useLocale().setLocale('ru');
});

describe('BreadCrumbs', () => {
  it('renders the localized root label', () => {
    const wrapper = mount(BreadCrumbs, { props: { rootElement: [] } });
    expect(wrapper.find('.crumb').text()).toBe('Главная');
  });

  it('re-renders the root label when the locale changes', async () => {
    const wrapper = mount(BreadCrumbs, { props: { rootElement: [] } });
    useLocale().setLocale('en');
    await nextTick();
    expect(wrapper.find('.crumb').text()).toBe('Home');
  });

  it('renders breadcrumb items', () => {
    const wrapper = mount(BreadCrumbs, {
      props: {
        rootElement: [],
        items: [{ id: '1', title: 'Folder1' }, { id: '2', title: 'Folder2' }],
      },
    });
    const crumbs = wrapper.findAll('.crumb');
    expect(crumbs).toHaveLength(3);
    expect(crumbs[1].text()).toBe('Folder1');
    expect(crumbs[2].text()).toBe('Folder2');
  });

  it('calls clickFn with { children: rootElement } for the root crumb', async () => {
    const clickFn = vi.fn();
    const rootElement = [{ id: 'root' }];
    const wrapper = mount(BreadCrumbs, { props: { clickFn, rootElement } });
    await wrapper.findAll('.crumb')[0].trigger('click');
    expect(clickFn).toHaveBeenCalledWith({ children: rootElement });
  });

  it('calls clickFn with the item for regular crumbs', async () => {
    const clickFn = vi.fn();
    const item = { id: '1', title: 'Folder1' };
    const wrapper = mount(BreadCrumbs, { props: { clickFn, rootElement: [], items: [item] } });
    await wrapper.findAll('.crumb')[1].trigger('click');
    expect(clickFn).toHaveBeenCalledWith(item);
  });

  it('toggles hovered state and calls dropRootFn on drop', async () => {
    const dropRootFn = vi.fn();
    const wrapper = mount(BreadCrumbs, { props: { rootElement: [], dropRootFn } });
    const section = wrapper.find('.crumb-section');
    await wrapper.find('.crumb').trigger('dragover');
    expect(section.classes()).toContain('hovered');
    await wrapper.find('.crumb').trigger('drop');
    expect(dropRootFn).toHaveBeenCalled();
    expect(section.classes()).not.toContain('hovered');
  });
});