import { ref } from 'vue';
import chromeAPI from '@/assets/chrome-mock.js';
import { collectBookmarks } from '@/utils/bookmarkTree.js';
import { DEAD_SCAN_CONCURRENCY, DEAD_SCAN_TIMEOUT_MS, NOT_VALIDED_FOLDER } from '@/config.js';

const isScanning = ref(false);
const progress = ref({ done: 0, total: 0 });
const lastResult = ref(null);

export function isWebUrl(url) {
  return /^https?:\/\//i.test(String(url ?? '').trim());
}

export async function isDeadUrl(url, fetchImpl, timeoutMs = DEAD_SCAN_TIMEOUT_MS) {
  if (!isWebUrl(url)) return true;
  const request = fetchImpl ?? globalThis.fetch;
  if (typeof request !== 'function') return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await request(String(url).trim(), {
      method: 'GET',
      mode: 'no-cors',
      redirect: 'follow',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
    return false;
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}

export async function findDeadBookmarks(nodes, options = {}) {
  const {
    concurrency = DEAD_SCAN_CONCURRENCY,
    fetchImpl,
    onProgress,
  } = options;
  const queue = [...nodes];
  const total = queue.length;
  const dead = [];
  let done = 0;
  const worker = async () => {
    while (queue.length > 0) {
      const node = queue.shift();
      if (await isDeadUrl(node.url, fetchImpl)) dead.push(node);
      done += 1;
      if (onProgress) onProgress(done, total);
    }
  };
  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, total)) },
    () => worker(),
  );
  await Promise.all(workers);
  return dead;
}

export function findNotValidedFolder(nodes) {
  if (!Array.isArray(nodes)) return null;
  return nodes.find((node) => node && node.title === NOT_VALIDED_FOLDER) ?? null;
}

export function useDeadBookmarks(bookmarks, options = {}) {
  const fetchImpl = options.fetchImpl;

  async function scan() {
    if (isScanning.value) return lastResult.value;
    isScanning.value = true;
    progress.value = { done: 0, total: 0 };
    lastResult.value = null;
    try {
      await bookmarks.loadTree();
      const roots = bookmarks.bookmarksRoot.value ?? [];
      const existing = findNotValidedFolder(roots);
      const targets = roots.filter((node) => node !== existing);
      const urls = collectBookmarks(targets);
      progress.value = { done: 0, total: urls.length };
      const dead = await findDeadBookmarks(urls, {
        fetchImpl,
        onProgress: (done, total) => {
          progress.value = { done, total };
        },
      });
      if (dead.length === 0) {
        lastResult.value = { moved: 0, dead: [] };
        return lastResult.value;
      }
      const folder = existing
        ?? await chromeAPI.bookmarks.create({
          parentId: bookmarks.rootNode.value?.id,
          title: NOT_VALIDED_FOLDER,
        });
      for (const node of dead) {
        await chromeAPI.bookmarks.move(node.id, { parentId: folder.id });
      }
      await bookmarks.reload();
      lastResult.value = { moved: dead.length, dead };
      return lastResult.value;
    } finally {
      isScanning.value = false;
    }
  }

  return { isScanning, progress, lastResult, scan };
}
