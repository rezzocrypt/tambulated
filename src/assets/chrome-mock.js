import { findNode, findParent, moveNode } from '../utils/bookmarkTree.js';

let tree = [];

function makeEvent() {
  const listeners = new Set();
  return {
    addListener: (fn) => listeners.add(fn),
    removeListener: (fn) => listeners.delete(fn),
    _emit: (...args) => listeners.forEach((fn) => fn(...args)),
  };
}

const onCreated = makeEvent();
const onRemoved = makeEvent();
const onChanged = makeEvent();
const onMoved = makeEvent();
const onChildrenReordered = makeEvent();

const chromeMock = {
  bookmarks: {
    getTree: () => tree,

    create(bookmark, callback) {
      const parent = findNode(tree, bookmark.parentId) || tree[0];
      const id = Date.now().toString();
      const node = { id, index: (parent.children ??= []).length, ...bookmark };
      parent.children.push(node);
      onCreated._emit(null, node);
      if (callback) callback(node);
      return node;
    },

    update(id, changes, callback) {
      const node = findNode(tree, id);
      if (node) Object.assign(node, changes);
      if (callback) callback(node);
      return node;
    },

    move(id, destination, callback) {
      const node = moveNode(tree, id, destination);
      onMoved._emit(null, { ...destination, node });
      if (callback) callback(node);
      return node;
    },

    remove(id, callback) {
      const node = findNode(tree, id);
      if (!node) { if (callback) callback(); return; }
      const parent = findParent(tree, node.parentId);
      const index = parent?.children?.indexOf(node) ?? -1;
      if (index >= 0) parent.children.splice(index, 1);
      onRemoved._emit(null, { bookmarkId: id, parent, node });
      if (callback) callback();
    },

    removeTree(id, callback) {
      const node = findNode(tree, id);
      if (!node) { if (callback) callback(); return; }
      const parent = findParent(tree, node.parentId);
      const index = parent?.children?.indexOf(node) ?? -1;
      if (index >= 0) parent.children.splice(index, 1);
      onRemoved._emit(null, { bookmarkId: id, parent, node });
      if (callback) callback();
    },

    onCreated,
    onRemoved,
    onChanged,
    onMoved,
    onChildrenReordered,
  },

  runtime: {
    lastError: null,
    onInstalled: { addListener: () => {} },
  },

  tabs: {
    create: (properties) => {
      if (properties.url) window.open(properties.url, '_blank');
    },
  },

  storage: {
    local: {
      get: (keys, callback) => { callback({}); },
      set: (items, callback) => { callback && callback(); },
    },
  },
};

async function initMock() {
  if (import.meta.env.DEV) {
    const mod = await import('../assets/fake-bookmark.js');
    tree = mod.default;
  } else {
    tree = [{ children: [] }];
  }
}

const nativeChrome = typeof chrome !== 'undefined' ? chrome : null;
const api = nativeChrome ?? chromeMock;
api.bookmarks = api.bookmarks ?? chromeMock.bookmarks;
api.tabs = api.tabs ?? chromeMock.tabs;
api.storage = api.storage ?? chromeMock.storage;
api.runtime = api.runtime ?? chromeMock.runtime;

export const ready = initMock();
export default api;
