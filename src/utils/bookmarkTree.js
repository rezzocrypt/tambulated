export function findNode(nodes, id) {
  if (id == null || !Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    if (Array.isArray(node.children)) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(nodes, parentId) {
  if (parentId == null || !Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (node.id === parentId) return node;
    if (Array.isArray(node.children)) {
      const found = findParent(node.children, parentId);
      if (found) return found;
    }
  }
  return null;
}

export function moveNode(tree, id, destination) {
  const node = findNode(tree, id);
  if (!node) return null;
  const oldParent = findParent(tree, node.parentId);
  if (oldParent && Array.isArray(oldParent.children)) {
    const oldIndex = oldParent.children.indexOf(node);
    if (oldIndex >= 0) oldParent.children.splice(oldIndex, 1);
  }
  const dest = findParent(tree, destination.parentId);
  if (dest) {
    if (!Array.isArray(dest.children)) dest.children = [];
    const index = destination.index == null || destination.index < 0
      ? dest.children.length
      : destination.index;
    dest.children.splice(index, 0, node);
    node.parentId = destination.parentId;
    node.index = index;
  }
  return node;
}

export function removeNode(tree, id) {
  const parent = findParent(tree, findNode(tree, id)?.parentId);
  if (parent && Array.isArray(parent.children)) {
    const idx = parent.children.findIndex((n) => n.id === id);
    if (idx >= 0) parent.children.splice(idx, 1);
  }
}

export function createNode(parentId, bookmark) {
  const parent = findNode(
    Array.isArray(parentId) ? parentId : findParent([parentId], parentId)?.children,
    parentId,
  );
  const node = { id: Date.now().toString(), parentId, ...bookmark };
  if (parent && Array.isArray(parent.children)) {
    node.index = parent.children.length;
    parent.children.push(node);
  }
  return node;
}
