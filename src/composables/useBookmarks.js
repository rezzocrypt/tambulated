import { ref } from 'vue';
import chromeAPI from '@/assets/chrome-mock.js';
import { findNode } from '@/utils/bookmarkTree.js';

const bookmarkTree = ref(null);
const bookmarksRoot = ref(null);
const currentNode = ref(null);
const rootNode = ref(null);
const currentParentId = ref(null);
const parents = ref([]);
const allBookmarks = ref(null);
const selectedItem = ref(null);

export function useBookmarks() {
  async function loadTree() {
    bookmarkTree.value = await chromeAPI.bookmarks.getTree();
    rootNode.value = bookmarkTree.value[0]?.children[0] ?? null;
    bookmarksRoot.value = rootNode.value?.children ?? [];
  }

  function setCurrentView() {
    const rootId = rootNode.value?.id ?? null;
    const pid = currentParentId.value ?? rootId;
    const fresh = findNode(bookmarkTree.value, pid);
    if (fresh && Array.isArray(fresh.children)) {
      currentNode.value = fresh.children;
      allBookmarks.value = fresh.children;
      currentParentId.value = pid;
    } else {
      currentNode.value = bookmarksRoot.value;
      allBookmarks.value = bookmarksRoot.value;
      currentParentId.value = rootId;
    }
  }

  async function reload() {
    await loadTree();
    setCurrentView();
  }

  async function moveBookmark(id, destination) {
    if (id == null || destination.parentId == null) return;
    await chromeAPI.bookmarks.move(id, destination);
    setCurrentView();
  }

  async function removeBookmark(id) {
    await chromeAPI.bookmarks.remove(id);
    await reload();
  }

  function navigateInto(bookmark) {
    if (!Array.isArray(bookmark.children)) return false;
    currentNode.value = bookmark.children;
    currentNode.value.parentElement = bookmark;
    currentParentId.value = bookmark.id ?? rootNode.value?.id ?? null;
    if (bookmark.id == null) {
      parents.value = [];
    } else {
      const idx = parents.value.indexOf(bookmark);
      if (idx >= 0) parents.value.splice(idx + 1);
      else parents.value.push(bookmark);
    }
    return true;
  }

  function goToRoot() {
    currentParentId.value = rootNode.value?.id ?? null;
    setCurrentView();
    parents.value = [];
  }

  function findNodeById(id) {
    return findNode(bookmarkTree.value, id);
  }

  return {
    bookmarkTree,
    bookmarksRoot,
    currentNode,
    rootNode,
    currentParentId,
    parents,
    allBookmarks,
    selectedItem,
    loadTree,
    reload,
    setCurrentView,
    moveBookmark,
    removeBookmark,
    navigateInto,
    goToRoot,
    findNodeById,
  };
}
