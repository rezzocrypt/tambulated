import { describe, it, expect, beforeEach, vi } from 'vitest';

async function setup() {
  vi.resetModules();
  const chromeMod = await import('@/assets/chrome-mock.js');
  await chromeMod.ready;
  const { useBookmarks } = await import('../src/composables/useBookmarks.js');
  const bm = useBookmarks();
  await bm.reload();
  return { bm, chromeAPI: chromeMod.default };
}

let ctx;

beforeEach(async () => {
  ctx = await setup();
});

describe('useBookmarks', () => {
  it('loads root children into the current view', () => {
    expect(Array.isArray(ctx.bm.currentNode.value)).toBe(true);
    expect(ctx.bm.currentNode.value.length).toBeGreaterThan(0);
  });

  it('creates a fresh array on reload (reactivity fix)', () => {
    const before = ctx.bm.currentNode.value;
    return ctx.bm.reload().then(() => {
      expect(ctx.bm.currentNode.value).not.toBe(before);
      expect(ctx.bm.currentNode.value).toEqual(before);
    });
  });

  it('navigates into a folder and back to root', () => {
    const folder = ctx.bm.currentNode.value.find((n) => Array.isArray(n.children));
    expect(folder).toBeTruthy();
    const ok = ctx.bm.navigateInto(folder);
    expect(ok).toBe(true);
    expect(ctx.bm.currentParentId.value).toBe(folder.id);
    expect(ctx.bm.currentNode.value).toBe(folder.children);
    expect(ctx.bm.parents.value).toContain(folder);

    ctx.bm.goToRoot();
    expect(ctx.bm.parents.value).toHaveLength(0);
  });

  it('rejects navigation into a leaf', () => {
    const leaf = ctx.bm.currentNode.value.find((n) => !Array.isArray(n.children));
    expect(leaf).toBeTruthy();
    expect(ctx.bm.navigateInto(leaf)).toBe(false);
  });

  it('removes a bookmark and reloads the view', async () => {
    const leaf = ctx.bm.currentNode.value.find((n) => !Array.isArray(n.children));
    await ctx.bm.removeBookmark(leaf.id);
    expect(ctx.bm.currentNode.value.some((n) => n.id === leaf.id)).toBe(false);
  });

  it('shows bookmarks created through the chrome api after reload', async () => {
    const parentId = ctx.bm.currentParentId.value;
    await ctx.chromeAPI.bookmarks.create({ parentId, title: 'Created-UT' });
    await ctx.bm.reload();
    expect(ctx.bm.currentNode.value.some((n) => n.title === 'Created-UT')).toBe(true);
  });

  it('moves a bookmark into a folder', async () => {
    const folder = ctx.bm.currentNode.value.find((n) => Array.isArray(n.children));
    const leaf = ctx.bm.currentNode.value.find((n) => !Array.isArray(n.children));
    await ctx.bm.moveBookmark(leaf.id, { parentId: folder.id, index: 0 });
    expect(ctx.bm.currentNode.value.some((n) => n.id === leaf.id)).toBe(false);
    expect(ctx.bm.findNodeById(leaf.id)?.parentId).toBe(folder.id);
  });

  it('findNodeById finds nested nodes', async () => {
    const leaf = ctx.bm.currentNode.value.find((n) => !Array.isArray(n.children));
    expect(ctx.bm.findNodeById(leaf.id)?.id).toBe(leaf.id);
    expect(ctx.bm.findNodeById('missing')).toBeNull();
  });

  it('rebuilds parents from the fresh tree after reload', async () => {
    const folder = ctx.bm.currentNode.value.find((n) => Array.isArray(n.children) && n.children.length > 0);
    expect(folder).toBeTruthy();
    const sub = folder.children.find((n) => Array.isArray(n.children));
    ctx.bm.navigateInto(folder);
    ctx.bm.navigateInto(sub);

    expect(ctx.bm.currentParentId.value).toBe(sub.id);
    expect(ctx.bm.parents.value.map((n) => n.id)).toEqual([folder.id, sub.id]);

    await ctx.bm.reload();
    expect(ctx.bm.currentParentId.value).toBe(sub.id);
    expect(ctx.bm.parents.value.map((n) => n.id)).toEqual([folder.id, sub.id]);
  });

  it('clears parents when the current folder no longer exists after reload', async () => {
    const folder = ctx.bm.currentNode.value.find((n) => Array.isArray(n.children) && n.children.length > 0);
    expect(folder).toBeTruthy();
    const sub = folder.children.find((n) => Array.isArray(n.children));
    expect(sub).toBeTruthy();

    ctx.bm.navigateInto(folder);
    ctx.bm.navigateInto(sub);
    expect(ctx.bm.parents.value.map((n) => n.id)).toEqual([folder.id, sub.id]);

    await ctx.chromeAPI.bookmarks.removeTree(sub.id);
    await ctx.bm.reload();

    expect(ctx.bm.parents.value).toHaveLength(0);
  });
});