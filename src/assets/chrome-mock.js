import fakeBookmark from './fake-bookmark.js';

// Mock для Chrome API во время разработки и сборки
const chromeMock = {
  bookmarks: {
    getTree: () => typeof fakeBookmark !== 'undefined' ? fakeBookmark : [],
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
var resultObject = typeof chrome !== 'undefined' ? chrome : chromeMock;
resultObject.bookmarks = resultObject.bookmarks ? resultObject.bookmarks : chromeMock.bookmarks;
resultObject.tabs = resultObject.tabs ? resultObject.tabs : chromeMock.tabs;
export default resultObject;