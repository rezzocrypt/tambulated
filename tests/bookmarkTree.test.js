import { describe, it, expect } from 'vitest';
import { findNode, findParent, moveNode, removeNode } from '../src/utils/bookmarkTree.js';

function makeTree() {
  return [
    {
      id: 'root',
      children: [
        {
          id: 'a',
          parentId: 'root',
          title: 'A',
          children: [
            { id: 'a1', parentId: 'a', title: 'A1' },
            { id: 'a2', parentId: 'a', title: 'A2' },
          ],
        },
        { id: 'b', parentId: 'root', title: 'B', url: 'https://b.example' },
      ],
    },
  ];
}

describe('findNode', () => {
  it('finds a node by id anywhere in the tree', () => {
    const tree = makeTree();
    expect(findNode(tree, 'a1')?.title).toBe('A1');
    expect(findNode(tree, 'root')?.id).toBe('root');
    expect(findNode(tree, 'b')?.url).toBe('https://b.example');
  });

  it('returns null for missing ids', () => {
    expect(findNode(makeTree(), 'nope')).toBeNull();
    expect(findNode(makeTree(), null)).toBeNull();
    expect(findNode(null, 'a')).toBeNull();
    expect(findNode([], 'a')).toBeNull();
  });
});

describe('findParent', () => {
  it('returns the node whose id matches', () => {
    const tree = makeTree();
    expect(findParent(tree, 'a')?.title).toBe('A');
    expect(findParent(tree, 'a1')?.title).toBe('A1');
    expect(findParent(tree, 'nope')).toBeNull();
    expect(findParent(tree, null)).toBeNull();
  });
});

describe('moveNode', () => {
  it('moves a node into a new parent', () => {
    const tree = makeTree();
    const node = moveNode(tree, 'a1', { parentId: 'b' });
    expect(node?.parentId).toBe('b');
    const b = findNode(tree, 'b');
    expect(b.children.map((n) => n.id)).toEqual(['a1']);
    expect(findNode(tree, 'a').children.map((n) => n.id)).toEqual(['a2']);
  });

  it('reorders within the same parent when an index is given', () => {
    const tree = makeTree();
    moveNode(tree, 'a2', { parentId: 'a', index: 0 });
    expect(findNode(tree, 'a').children.map((n) => n.id)).toEqual(['a2', 'a1']);
  });

  it('returns null when the node does not exist', () => {
    expect(moveNode(makeTree(), 'nope', { parentId: 'b' })).toBeNull();
  });
});

describe('removeNode', () => {
  it('removes a node from its parent', () => {
    const tree = makeTree();
    removeNode(tree, 'a1');
    expect(findNode(tree, 'a').children.map((n) => n.id)).toEqual(['a2']);
    expect(findNode(tree, 'a1')).toBeNull();
  });
});