# tambulated

Chrome-расширение (Manifest V3), заменяющее новую вкладку менеджером закладок на Vue 3 + Vite.

## Быстрый старт

```bash
npm install
```

### Разработка

```bash
npm run serve
```

Откроется на `http://localhost:8081`. В dev-режиме используются фейковые данные из `src/assets/fake-bookmark.js` — реальные закладки Chrome не затрагиваются.

### Сборка

```bash
npm run build
```

Результат в `dist/`. Фейковые данные **не** попадают в прод-бандл.

### Загрузка в Chrome

1. `chrome://extensions` → включить «Режим разработчика»
2. «Загрузить распакованное расширение» → выбрать папку `dist`

### Линтер

```bash
npm run lint
```

## Структура

```
src/
  assets/
    chrome-mock.js          ← mock Chrome API (только dev) + загрузка fake-bookmark.js
    fake-bookmark.js        ← фейковые закладки (dev only)
    icons.css               ← платформенные иконки по доменам
    main.css                ← глобальные стили, CSS-переменные
    icons/platform/*.png    ← PNG-иконки платформ
  components/
    BreadCrumbs.vue         ← хлебные крошки + drop-зона «Главная»
    Bookmark/
      BookmarkGrid.vue      ← плиточный режим
      BookmarkTable.vue     ← табличный режим
    Common/
      DateTimeBlock.vue     ← часы/дата в боковой панели
      PageBackground.vue    ← фон (Bing daily image)
  composables/
    useBookmarks.js         ← реактивные данные: getTree, move, remove, навигация по папкам
  utils/
    bookmarkTree.js         ← утилиты дерева: findNode, findParent, moveNode, removeNode, createNode
    bookmarks.js            ← promise-обёртка chrome.bookmarks API
  config/
    router.js               ← маршрутизация (hash history)
  views/
    BookmarkView.vue        ← основная страница (тулбар, переключатели, DnD, контекстное меню)
    AboutView.vue
    NotFoundView.vue
public/
  manifest.json             ← MV3 манифест
  icons/                    ← иконки расширения
  images/defaultbg.jpg      ← фоллбэк-фон
```

## Ключевые файлы

| Файл | Назначение |
|---|---|
| `src/utils/bookmarkTree.js` | Обход/модификация дерева закладок (shared между mock и UI) |
| `src/composables/useBookmarks.js` | Единый источник правды для состояния закладок |
| `src/assets/chrome-mock.js` | dev-only mock; в реальном расширении используется `chrome.*` API |
| `vite.config.js` | Конфигурация Vite с алиасом `@` → `src/` |

## Режимы

- **Разработка** (`npm run serve`): fake-bookmark.js загружается динамически; `chrome` отсутствует → mock.
- **Прод** (`npm run build`): fake-bookmark.js **не** импортируется; используется нативный `chrome.bookmarks` API.
