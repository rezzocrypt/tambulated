const bookmarks = {
  async getTree() {
    return new Promise((resolve) => {
      chrome.bookmarks.getTree((tree) => resolve(tree));
    });
  },

  async create(bookmark) {
    return new Promise((resolve) => {
      chrome.bookmarks.create(bookmark, (node) => resolve(node));
    });
  },

  async update(id, changes) {
    return new Promise((resolve) => {
      chrome.bookmarks.update(id, changes, (node) => resolve(node));
    });
  },

  async move(id, destination) {
    return new Promise((resolve) => {
      chrome.bookmarks.move(id, destination, (node) => resolve(node));
    });
  },

  async remove(id) {
    return new Promise((resolve) => {
      chrome.bookmarks.remove(id, () => resolve());
    });
  },

  on: {
    created: {
      addListener: (fn) => chrome.bookmarks.onCreated.addListener(fn),
      removeListener: (fn) => chrome.bookmarks.onCreated.removeListener(fn),
    },
    removed: {
      addListener: (fn) => chrome.bookmarks.onRemoved.addListener(fn),
      removeListener: (fn) => chrome.bookmarks.onRemoved.removeListener(fn),
    },
    changed: {
      addListener: (fn) => chrome.bookmarks.onChanged.addListener(fn),
      removeListener: (fn) => chrome.bookmarks.onChanged.removeListener(fn),
    },
    moved: {
      addListener: (fn) => chrome.bookmarks.onMoved.addListener(fn),
      removeListener: (fn) => chrome.bookmarks.onMoved.removeListener(fn),
    },
    childrenReordered: {
      addListener: (fn) => chrome.bookmarks.onChildrenReordered.addListener(fn),
      removeListener: (fn) => chrome.bookmarks.onChildrenReordered.removeListener(fn),
    },
  },
};

export default bookmarks;
