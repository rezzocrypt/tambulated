import fakeBookmark from './fake-bookmark.js';

console.log("fakeBookmark", fakeBookmark)

// Mock для Chrome API во время разработки и сборки
const chromeMock = {
  bookmarks: {
    getTree: (callback) => {
      console.log('Chrome bookmarks.getTree mock called');
      return typeof fakeBookmark !== 'undefined' ? fakeBookmark : [];
    },
    
    create: (bookmark, callback) => {
      console.log('Chrome bookmarks.create mock called:', bookmark);
      callback({ id: Date.now().toString(), ...bookmark });
    },
    
    update: (id, changes, callback) => {
      console.log('Chrome bookmarks.update mock called:', id, changes);
      callback({ id, ...changes });
    },
    
    remove: (id, callback) => {
      console.log('Chrome bookmarks.remove mock called:', id);
      callback();
    },
    
    // Events
    onCreated: {
      addListener: () => console.log('onCreated listener added'),
      removeListener: () => console.log('onCreated listener removed')
    },
    onRemoved: {
      addListener: () => console.log('onRemoved listener added'),
      removeListener: () => console.log('onRemoved listener removed')
    },
    onChanged: {
      addListener: () => console.log('onChanged listener added'),
      removeListener: () => console.log('onChanged listener removed')
    },
    onMoved: {
      addListener: () => console.log('onMoved listener added'),
      removeListener: () => console.log('onMoved listener removed')
    },
    onChildrenReordered: {
      addListener: () => console.log('onChildrenReordered listener added'),
      removeListener: () => console.log('onChildrenReordered listener removed')
    }
  },
  
  runtime: {
    lastError: null,
    onInstalled: {
      addListener: () => console.log('onInstalled listener added')
    }
  },
  
  tabs: {
    create: (properties) => {
      console.log('Chrome tabs.create mock called:', properties);
      if (properties.url) {
        window.open(properties.url, '_blank');
      }
    }
  },
  
  storage: {
    local: {
      get: (keys, callback) => {
        console.log('Chrome storage.local.get mock called:', keys);
        callback({});
      },
      set: (items, callback) => {
        console.log('Chrome storage.local.set mock called:', items);
        callback && callback();
      }
    }
  }
};
// Экспортируем mock или реальный chrome API
export default typeof chrome !== 'undefined' && chrome.bookmarks ? chrome : chromeMock;