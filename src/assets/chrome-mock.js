import fakeBookmark from './fake-bookmark.js';

let tree = fakeBookmark;

function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (Array.isArray(node.children)) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function findParent(nodes, parentId) {
  for (const node of nodes) {
    if (node.id === parentId) return node;
    if (Array.isArray(node.children)) {
      const found = findParent(node.children, parentId);
      if (found) return found;
    }
  }
  return null;
}

function moveNode(id, destination) {
  const node = findNode(tree, id);
  if (!node) return null;
  const oldParent = findParent(tree, node.parentId);
  if (oldParent && Array.isArray(oldParent.children)) {
    const oldIndex = oldParent.children.indexOf(node);
    if (oldIndex >= 0) oldParent.children.splice(oldIndex, 1);
  }
  const dest = findParent(tree, destination.parentId);
  if (dest) {
    if (!Array.isArray(dest.children)) dest.children = [];
    const index = destination.index == null || destination.index < 0 ? dest.children.length : destination.index;
    dest.children.splice(index, 0, node);
    node.parentId = destination.parentId;
    node.index = index;
  }
  return node;
}

// Mock для Chrome API во время разработки и сборки
const chromeMock = {
  bookmarks: {
    getTree: () => tree,
    create: (bookmark, callback) => { callback({ id: Date.now().toString(), ...bookmark }); },
    update: (id, changes, callback) => { callback({ id, ...changes }); },
    move: (id, destination, callback) => { const node = moveNode(id, destination); if (callback) callback(node); },
    remove: (id, callback) => { callback(); },
    
    // Events
    onCreated: { addListener: () => {}, removeListener: () => {} },
    onRemoved: { addListener: () => {}, removeListener: () => {} },
    onChanged: { addListener: () => {}, removeListener: () => {} },
    onMoved: { addListener: () => {}, removeListener: () => {} },
    onChildrenReordered: { addListener: () => {}, removeListener: () => {} }
  },
  
  runtime: {
    lastError: null,
    onInstalled: { addListener: () => {} }
  },
  
  tabs: {
    create: (properties) => {
      if (properties.url) {
        window.open(properties.url, '_blank');
      }
    }
  },
  
  storage: {
    local: {
      get: (keys, callback) => { callback({}); },
      set: (items, callback) => { callback && callback(); }
    }
  }
};
// Экспортируем mock или реальный chrome API
var resultObject = typeof chrome !== 'undefined' ? chrome : chromeMock;
resultObject.bookmarks = resultObject.bookmarks ? resultObject.bookmarks : chromeMock.bookmarks;
resultObject.tabs = resultObject.tabs ? resultObject.tabs : chromeMock.tabs;
export default resultObject;