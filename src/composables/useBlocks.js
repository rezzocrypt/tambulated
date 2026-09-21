import { ref, computed } from 'vue';

export const BLOCKS_KEY = 'blocks-layout';
const BLOCKS_VERSION = 1;

export const DEFAULT_BLOCKS = ['datetime', 'weather', 'crypto'];

function readLayout() {
  try {
    const raw = localStorage.getItem(BLOCKS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === BLOCKS_VERSION && Array.isArray(parsed.order) && Array.isArray(parsed.hidden)) {
      return { order: parsed.order, hidden: parsed.hidden };
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeLayout(layout) {
  const known = new Set(DEFAULT_BLOCKS);
  const order = (layout?.order || DEFAULT_BLOCKS).filter((id) => known.has(id));
  DEFAULT_BLOCKS.forEach((id) => {
    if (!order.includes(id)) order.push(id);
  });
  const hidden = (layout?.hidden || []).filter((id) => known.has(id));
  return { order, hidden };
}

const layout = ref(normalizeLayout(readLayout()));

export function reloadBlockLayout() {
  layout.value = normalizeLayout(readLayout());
}

function persist() {
  try {
    localStorage.setItem(BLOCKS_KEY, JSON.stringify({
      v: BLOCKS_VERSION,
      order: layout.value.order,
      hidden: layout.value.hidden,
    }));
  } catch {
    /* storage unavailable — keep layout in memory only */
  }
}

export function useBlockConfig() {
  const blocks = computed(() => layout.value.order);

  function isHidden(id) {
    return layout.value.hidden.includes(id);
  }

  function toggle(id) {
    layout.value = {
      ...layout.value,
      hidden: layout.value.hidden.includes(id)
        ? layout.value.hidden.filter((x) => x !== id)
        : [...layout.value.hidden, id],
    };
    persist();
  }

  function move(id, direction) {
    const { order } = layout.value;
    const index = order.indexOf(id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    layout.value = { ...layout.value, order: next };
    persist();
  }

  function moveUp(id) {
    move(id, -1);
  }

  function moveDown(id) {
    move(id, 1);
  }

  return { blocks, isHidden, toggle, moveUp, moveDown };
}