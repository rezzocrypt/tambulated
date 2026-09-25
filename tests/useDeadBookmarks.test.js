import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import chromeAPI from '@/assets/chrome-mock.js';
import {
  isWebUrl,
  isDeadUrl,
  findDeadBookmarks,
  findNotValidedFolder,
  useDeadBookmarks,
} from '@/composables/useDeadBookmarks.js';
import { collectBookmarks, collectFolders } from '@/utils/bookmarkTree.js';
import { NOT_VALIDED_FOLDER } from '@/config.js';

function makeBookmarks(rootChildren, rootId = 'root') {
  const root = ref({ id: rootId, title: 'Bookmarks bar', children: rootChildren });
  const roots = ref(rootChildren);
  return {
    rootNode: root,
    bookmarksRoot: roots,
    loadTree: vi.fn(async () => {}),
    reload: vi.fn(async () => {}),
  };
}

function url(id, value) {
  return { id, title: id, url: value };
}

function folder(id, title, children) {
  return { id, title, children };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('isWebUrl', () => {
  it('accepts http and https only', () => {
    expect(isWebUrl('https://example.com')).toBe(true);
    expect(isWebUrl('http://example.com/a?b=1')).toBe(true);
    expect(isWebUrl('chrome://extensions')).toBe(false);
    expect(isWebUrl('file:///c:/tmp/a.html')).toBe(false);
    expect(isWebUrl('javascript:void(0)')).toBe(false);
    expect(isWebUrl(undefined)).toBe(false);
  });
});

describe('isDeadUrl', () => {
  it('treats non-web schemes as dead without any request', async () => {
    const fetchImpl = vi.fn();
    expect(await isDeadUrl('chrome://extensions', fetchImpl)).toBe(true);
    expect(await isDeadUrl('file:///c:/tmp/a.html', fetchImpl)).toBe(true);
    expect(await isDeadUrl('javascript:void(0)', fetchImpl)).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('treats a rejected request as dead', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    expect(await isDeadUrl('https://dead.example', fetchImpl)).toBe(true);
  });

  it('treats any resolved request as alive, including 404', async () => {
    const fetchImpl = vi.fn(async () => ({ type: 'opaque', status: 0 }));
    expect(await isDeadUrl('https://alive.example/404', fetchImpl)).toBe(false);
  });

  it('uses no-cors so no extra host permissions are required', async () => {
    const fetchImpl = vi.fn(async () => ({ type: 'opaque', status: 0 }));
    await isDeadUrl('https://example.com', fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith('https://example.com', expect.objectContaining({ mode: 'no-cors' }));
  });
});

describe('collectBookmarks', () => {
  it('walks the whole tree and returns only url nodes', () => {
    const tree = [
      folder('f1', 'A', [url('a1', 'https://a1.example'), folder('f2', 'B', [url('a2', 'https://a2.example')])]),
      url('r1', 'https://r1.example'),
    ];
    expect(collectBookmarks(tree).map((n) => n.id)).toEqual(['a1', 'a2', 'r1']);
  });

  it('skips nodes matching the predicate', () => {
    const tree = [url('a1', 'https://a1.example'), url('skip', 'https://skip.example')];
    const collected = collectBookmarks(tree, (node) => node.id === 'skip');
    expect(collected.map((n) => n.id)).toEqual(['a1']);
  });
});

describe('collectFolders', () => {
  it('returns every folder of the tree with its depth', () => {
    const tree = [
      folder('f1', 'A', [url('a1', 'https://a1.example'), folder('f2', 'B', [folder('f3', 'C', [])])]),
      url('r1', 'https://r1.example'),
      folder('f4', 'D', []),
    ];
    expect(collectFolders(tree)).toEqual([
      { id: 'f1', title: 'A', depth: 0 },
      { id: 'f2', title: 'B', depth: 1 },
      { id: 'f3', title: 'C', depth: 2 },
      { id: 'f4', title: 'D', depth: 0 },
    ]);
  });

  it('ignores non-array input', () => {
    expect(collectFolders(null)).toEqual([]);
  });
});

describe('findDeadBookmarks', () => {
  it('reports progress up to total and returns dead nodes', async () => {
    const nodes = [url('ok', 'https://ok.example'), url('bad', 'https://bad.example')];
    const seen = [];
    const fetchImpl = vi.fn(async (target) => {
      if (target.includes('bad')) throw new TypeError('Failed to fetch');
      return { type: 'opaque', status: 0 };
    });
    const dead = await findDeadBookmarks(nodes, {
      fetchImpl,
      onProgress: (done, total) => seen.push([done, total]),
    });
    expect(dead.map((n) => n.id)).toEqual(['bad']);
    expect(seen.at(-1)).toEqual([2, 2]);
  });
});

describe('findNotValidedFolder', () => {
  it('finds the folder among root children', () => {
    const target = folder(NOT_VALIDED_FOLDER, NOT_VALIDED_FOLDER, []);
    expect(findNotValidedFolder([url('a', 'https://a.example'), target])).toBe(target);
    expect(findNotValidedFolder([url('a', 'https://a.example')])).toBeNull();
  });
});

describe('useDeadBookmarks', () => {
  beforeEach(() => {
    useDeadBookmarks(makeBookmarks([])).targetId.value = '';
  });

  it('exposes every tree folder as a destination option', async () => {
    const bookmarks = makeBookmarks([
      folder('f1', 'Готовые', [folder('f2', 'Старые', [url('deep', 'https://deep.example')])]),
    ]);
    const { folders } = useDeadBookmarks(bookmarks);
    expect(folders.value).toEqual([
      { id: 'f1', title: 'Готовые', depth: 0 },
      { id: 'f2', title: 'Старые', depth: 1 },
    ]);
  });

  it('moves dead bookmarks into the selected folder and never scans inside it', async () => {
    const targetFolder = folder('pick-me', 'На проверку', [url('inside', 'https://inside-target.example')]);
    const bookmarks = makeBookmarks([
      targetFolder,
      url('dead', 'https://dead.example'),
      url('alive', 'https://alive.example'),
    ]);
    const create = vi.spyOn(chromeAPI.bookmarks, 'create');
    const move = vi.spyOn(chromeAPI.bookmarks, 'move').mockReturnValue({});
    const fetchImpl = vi.fn(async (target) => {
      if (target.includes('dead')) throw new TypeError('Failed to fetch');
      return { type: 'opaque', status: 0 };
    });

    const { scan, targetId } = useDeadBookmarks(bookmarks, { fetchImpl });
    targetId.value = 'pick-me';
    const result = await scan();

    expect(create).not.toHaveBeenCalled();
    expect(move).toHaveBeenCalledTimes(1);
    expect(move).toHaveBeenCalledWith('dead', { parentId: 'pick-me' });
    expect(fetchImpl).not.toHaveBeenCalledWith('https://inside-target.example', expect.anything());
    expect(result.targetId).toBe('pick-me');
  });

  it('falls back to Not Valided when the selected folder no longer exists', async () => {
    const bookmarks = makeBookmarks([url('dead', 'https://dead.example')]);
    const create = vi.spyOn(chromeAPI.bookmarks, 'create').mockReturnValue({ id: 'nv-9' });
    const move = vi.spyOn(chromeAPI.bookmarks, 'move').mockReturnValue({});
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch'); });

    const { scan, targetId } = useDeadBookmarks(bookmarks, { fetchImpl });
    targetId.value = 'deleted-folder';
    const result = await scan();

    expect(targetId.value).toBe('');
    expect(create).toHaveBeenCalledWith({ parentId: 'root', title: NOT_VALIDED_FOLDER });
    expect(move).toHaveBeenCalledWith('dead', { parentId: 'nv-9' });
    expect(result.targetId).toBe('nv-9');
  });

  it('moves dead bookmarks into a new root folder and reloads', async () => {
    const bookmarks = makeBookmarks([
      folder('f1', 'Готовые', [url('dead', 'https://dead.example'), url('alive', 'https://alive.example')]),
      url('root-bad', 'https://bad-root.example'),
    ]);
    const create = vi.spyOn(chromeAPI.bookmarks, 'create').mockReturnValue({ id: 'nv-1' });
    const move = vi.spyOn(chromeAPI.bookmarks, 'move').mockReturnValue({});
    const fetchImpl = vi.fn(async (target) => {
      if (target.includes('dead') || target.includes('bad-root')) throw new TypeError('Failed to fetch');
      return { type: 'opaque', status: 0 };
    });

    const { scan, isScanning, lastResult } = useDeadBookmarks(bookmarks, { fetchImpl });
    const result = await scan();

    expect(create).toHaveBeenCalledWith({ parentId: 'root', title: NOT_VALIDED_FOLDER });
    expect(move).toHaveBeenCalledTimes(2);
    expect(move).toHaveBeenCalledWith('dead', { parentId: 'nv-1' });
    expect(move).toHaveBeenCalledWith('root-bad', { parentId: 'nv-1' });
    expect(result.moved).toBe(2);
    expect(lastResult.value.moved).toBe(2);
    expect(isScanning.value).toBe(false);
    expect(bookmarks.reload).toHaveBeenCalledTimes(1);
  });

  it('does not create a folder when everything is alive', async () => {
    const bookmarks = makeBookmarks([url('ok', 'https://ok.example')]);
    const create = vi.spyOn(chromeAPI.bookmarks, 'create');
    const move = vi.spyOn(chromeAPI.bookmarks, 'move');
    const fetchImpl = vi.fn(async () => ({ type: 'opaque', status: 0 }));

    const { scan, lastResult } = useDeadBookmarks(bookmarks, { fetchImpl });
    const result = await scan();

    expect(result.moved).toBe(0);
    expect(lastResult.value.moved).toBe(0);
    expect(create).not.toHaveBeenCalled();
    expect(move).not.toHaveBeenCalled();
    expect(bookmarks.reload).not.toHaveBeenCalled();
  });

  it('reuses an existing Not Valided folder and never scans inside it', async () => {
    const existing = folder('nv-0', NOT_VALIDED_FOLDER, [url('old-dead', 'https://old-dead.example')]);
    const bookmarks = makeBookmarks([existing, url('new-dead', 'https://new-dead.example')]);
    const create = vi.spyOn(chromeAPI.bookmarks, 'create');
    const move = vi.spyOn(chromeAPI.bookmarks, 'move').mockReturnValue({});
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch'); });

    const { scan } = useDeadBookmarks(bookmarks, { fetchImpl });
    const result = await scan();

    expect(create).not.toHaveBeenCalled();
    expect(move).toHaveBeenCalledTimes(1);
    expect(move).toHaveBeenCalledWith('new-dead', { parentId: 'nv-0' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).not.toHaveBeenCalledWith('https://old-dead.example', expect.anything());
    expect(result.moved).toBe(1);
  });

  it('marks chrome:// and file:// bookmarks as dead', async () => {
    const bookmarks = makeBookmarks([
      url('ext', 'chrome-extension://abc/page.html'),
      url('file', 'file:///c:/tmp/a.html'),
    ]);
    const create = vi.spyOn(chromeAPI.bookmarks, 'create').mockReturnValue({ id: 'nv-2' });
    const move = vi.spyOn(chromeAPI.bookmarks, 'move').mockReturnValue({});
    const fetchImpl = vi.fn();

    const { scan } = useDeadBookmarks(bookmarks, { fetchImpl });
    const result = await scan();

    expect(result.moved).toBe(2);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({ parentId: 'root', title: NOT_VALIDED_FOLDER });
    expect(move).toHaveBeenCalledWith('ext', { parentId: 'nv-2' });
    expect(move).toHaveBeenCalledWith('file', { parentId: 'nv-2' });
  });

  it('ignores a repeated call while a scan is running', async () => {
    const bookmarks = makeBookmarks([url('bad', 'https://bad.example')]);
    vi.spyOn(chromeAPI.bookmarks, 'create').mockReturnValue({ id: 'nv-3' });
    const move = vi.spyOn(chromeAPI.bookmarks, 'move').mockReturnValue({});
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const fetchImpl = vi.fn(async () => { await gate; throw new TypeError('Failed to fetch'); });

    const { scan } = useDeadBookmarks(bookmarks, { fetchImpl });
    const first = scan();
    const second = await scan();
    release();
    await first;

    expect(second).toBeNull();
    expect(move).toHaveBeenCalledTimes(1);
  });
});
