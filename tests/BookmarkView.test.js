import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import BookmarkView from '../src/views/BookmarkView.vue';
import { useLocale } from '@/composables/useLocale.js';
import { useTheme } from '@/composables/useTheme.js';

const ContextMenuStub = {
  name: 'ContextMenu',
  props: ['show', 'options'],
  template: '<ul class="cm-stub" v-if="show"><slot /></ul>',
};

const ContextMenuItemStub = {
  name: 'ContextMenuItem',
  props: ['label'],
  emits: ['click'],
  template: '<li class="cm-item" @click="$emit(\'click\')">{{ label }}</li>',
};

function leafItems(wrapper) {
  return wrapper.findAll('.bookmark-item').filter((el) => !el.find('a.folder').exists());
}

function firstFolder(wrapper) {
  return wrapper.findAll('.bookmark-item').find((el) => el.find('a.folder').exists());
}

async function mountView() {
  const wrapper = mount(BookmarkView, {
    global: {
      components: {
        ContextMenu: ContextMenuStub,
        ContextMenuItem: ContextMenuItemStub,
      },
    },
  });
  for (let i = 0; i < 30 && !wrapper.find('.bookmark-item').exists(); i++) {
    await flushPromises();
    await nextTick();
  }
  return wrapper;
}

function wrap(rand) {
  return `${rand}-${Date.now()}`;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('viewMode', 'grid');
  useLocale().setLocale('ru');
  useTheme().setTheme('system');
});

describe('BookmarkView', () => {
  it('renders the bookmark grid after loading', async () => {
    const wrapper = await mountView();
    expect(wrapper.findAll('.bookmark-item').length).toBeGreaterThan(0);
    expect(leafItems(wrapper).length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it('shows localized actions in the item context menu', async () => {
    const wrapper = await mountView();
    await leafItems(wrapper)[0].trigger('contextmenu');
    const items = wrapper.findAll('.cm-item');
    expect(items.map((i) => i.text())).toEqual(['Открыть', 'Переименовать', 'Удалить']);
    wrapper.unmount();
  });

  it('renames a bookmark through the dialog', async () => {
    const newTitle = wrap('Renamed-UT');
    const wrapper = await mountView();
    const leaf = leafItems(wrapper)[0];
    const oldTitle = leaf.find('.label').text();

    await leaf.trigger('contextmenu');
    await wrapper.findAll('.cm-item')[1].trigger('click');

    expect(wrapper.find('.modal-title').text()).toBe('Переименовать');
    expect(wrapper.find('.modal-input').element.value).toBe(oldTitle);

    await wrapper.find('.modal-input').setValue(newTitle);
    await wrapper.find('.modal-btn.primary').trigger('click');
    await flushAll(wrapper);

    const labels = wrapper.findAll('.bookmark-item .label').map((l) => l.text());
    expect(labels).toContain(newTitle);
    expect(labels).not.toContain(oldTitle);
    wrapper.unmount();
  });

  it('cancel closes the rename dialog without changes', async () => {
    const wrapper = await mountView();
    const leaf = leafItems(wrapper)[0];
    const oldTitle = leaf.find('.label').text();

    await leaf.trigger('contextmenu');
    await wrapper.findAll('.cm-item')[1].trigger('click');
    await wrapper.find('.modal-input').setValue('Should-Not-Save');
    await wrapper.find('.modal-actions .modal-btn').trigger('click');

    expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    const labels = wrapper.findAll('.bookmark-item .label').map((l) => l.text());
    expect(labels).toContain(oldTitle);
    expect(labels).not.toContain('Should-Not-Save');
    wrapper.unmount();
  });

  it('overlay click closes the dialog', async () => {
    const wrapper = await mountView();
    await leafItems(wrapper)[0].trigger('contextmenu');
    await wrapper.findAll('.cm-item')[1].trigger('click');
    expect(wrapper.find('.modal-overlay').exists()).toBe(true);
    await wrapper.find('.modal-overlay').trigger('click');
    expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    wrapper.unmount();
  });

  it('creates a folder from the empty-space context menu', async () => {
    const folderName = wrap('Folder-UT');
    const wrapper = await mountView();
    await wrapper.find('.wrapper').trigger('contextmenu');
    const items = wrapper.findAll('.cm-item');
    expect(items.map((i) => i.text())).toEqual(['Новая папка']);

    await items[0].trigger('click');
    expect(wrapper.find('.modal-title').text()).toBe('Новая папка');
    await wrapper.find('.modal-input').setValue(folderName);
    await wrapper.find('.modal-btn.primary').trigger('click');
    await flushAll(wrapper);

    const folders = wrapper.findAll('.bookmark-item a.folder .label').map((l) => l.text());
    expect(folders).toContain(folderName);
    wrapper.unmount();
  });

  it('deletes a folder through the item context menu', async () => {
    const folderName = wrap('Del-UT');
    const wrapper = await mountView();

    await wrapper.find('.wrapper').trigger('contextmenu');
    await wrapper.findAll('.cm-item')[0].trigger('click');
    await wrapper.find('.modal-input').setValue(folderName);
    await wrapper.find('.modal-btn.primary').trigger('click');
    await flushAll(wrapper);

    const folder = wrapper
      .findAll('.bookmark-item')
      .find((el) => el.find('a.folder').exists() && el.find('.label').text() === folderName);
    expect(folder).toBeTruthy();

    await folder.trigger('contextmenu');
    await wrapper.findAll('.cm-item')[2].trigger('click');
    await flushAll(wrapper);

    const labels = wrapper.findAll('.bookmark-item .label').map((l) => l.text());
    expect(labels).not.toContain(folderName);
    wrapper.unmount();
  });

  it('moves a bookmark into a folder via drag and drop', async () => {
    const wrapper = await mountView();
    const leaf = leafItems(wrapper)[0];
    const folder = firstFolder(wrapper);
    const leafTitle = leaf.find('.label').text();

    await leaf.trigger('dragstart', { dataTransfer: { setData: () => {}, effectAllowed: '' } });
    await folder.trigger('dragover');
    expect(folder.classes()).toContain('hovered');
    await folder.trigger('drop');
    await flushAll(wrapper);

    const rootLeafLabels = leafItems(wrapper).map((el) => el.find('.label').text());
    expect(rootLeafLabels).not.toContain(leafTitle);
    wrapper.unmount();
  });
});

async function flushAll(wrapper, count = 10) {
  for (let i = 0; i < count; i++) {
    await flushPromises();
    await nextTick();
  }
}