import { describe, it, expect, beforeEach } from 'vitest';
import { BLOCKS_KEY, DEFAULT_BLOCKS, useBlockConfig, reloadBlockLayout } from '../src/composables/useBlocks.js';

beforeEach(() => {
  localStorage.clear();
  reloadBlockLayout();
});

function stored() {
  return JSON.parse(localStorage.getItem(BLOCKS_KEY));
}

describe('useBlockConfig', () => {
  it('exposes all default blocks in order', () => {
    const { blocks } = useBlockConfig();
    expect(blocks.value).toEqual(DEFAULT_BLOCKS);
  });

  it('toggles a block hidden and persists it', () => {
    const { toggle, isHidden } = useBlockConfig();
    expect(isHidden('weather')).toBe(false);
    toggle('weather');
    expect(isHidden('weather')).toBe(true);
    expect(stored().hidden).toEqual(['weather']);
    toggle('weather');
    expect(isHidden('weather')).toBe(false);
    expect(stored().hidden).toEqual([]);
  });

  it('restores a stored layout', () => {
    localStorage.setItem(BLOCKS_KEY, JSON.stringify({
      v: 1,
      order: ['crypto', 'datetime'],
      hidden: ['datetime'],
    }));
    reloadBlockLayout();
    const { blocks, isHidden } = useBlockConfig();
    expect(blocks.value).toEqual(['crypto', 'datetime', 'weather']);
    expect(isHidden('datetime')).toBe(true);
  });

  it('moves a block up and down', () => {
    const { blocks, moveUp, moveDown } = useBlockConfig();
    moveUp('weather');
    expect(blocks.value).toEqual(['weather', 'datetime', 'crypto']);
    expect(stored().order).toEqual(['weather', 'datetime', 'crypto']);
    moveDown('weather');
    expect(blocks.value).toEqual(['datetime', 'weather', 'crypto']);
  });

  it('ignores movement at the edges', () => {
    const { blocks, moveUp, moveDown } = useBlockConfig();
    moveUp('datetime');
    expect(blocks.value).toEqual(DEFAULT_BLOCKS);
    moveDown('crypto');
    expect(blocks.value).toEqual(DEFAULT_BLOCKS);
  });

  it('filters unknown ids from stored layouts', () => {
    localStorage.setItem(BLOCKS_KEY, JSON.stringify({
      v: 1,
      order: ['bogus', 'weather', 'datetime'],
      hidden: ['bogus', 'crypto'],
    }));
    reloadBlockLayout();
    const { blocks, isHidden } = useBlockConfig();
    expect(blocks.value).toEqual(['weather', 'datetime', 'crypto']);
    expect(isHidden('bogus')).toBe(false);
    expect(isHidden('crypto')).toBe(true);
  });
});