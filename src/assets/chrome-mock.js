import fakeBookmark from './fake-bookmark.js';

// Mock для Chrome API во время разработки и сборки
const chromeMock = {
  bookmarks: {
    getTree: (callback) => typeof fakeBookmark !== 'undefined' ? fakeBookmark : [],
    create: (bookmark, callback) => { callback({ id: Date.now().toString(), ...bookmark }); },
    update: (id, changes, callback) => { callback({ id, ...changes }); },
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
export default typeof chrome !== 'undefined' && chrome.bookmarks ? chrome : chromeMock;