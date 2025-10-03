# Mirror Table - AI Coding Agent Instructions

## Project Overview

Mirror Table is a **real-time collaborative virtual canvas application** built for tabletop RPG (TTRPG) sessions. A host controls a table that is mirrored to all connected clients. The application uses **Google Drive for asset persistence** and **Firebase/Firestore for real-time updates**.

### Core Architecture

- **Frontend**: Nuxt 3.19 (Vue 3.5 + TypeScript) with Vuestic UI component library
- **Canvas Rendering**: Konva.js (vue-konva) for 2D graphics and canvas manipulation
- **State Management**: Pinia v3 stores (composition API pattern)
- **Real-time Backend**: Firebase 12.x Authentication + Firestore
- **Asset Storage**: Google Drive API (v3) with custom file metadata
- **Local Caching**: IndexedDB (via idb) for offline-first asset management
- **Package Manager**: pnpm 10.x (via Corepack)
- **Node.js**: >= 20.13.0 (Vercel deployment uses Node 20)

### Key Directory Structure

- `stores/` - Pinia stores (auto-imported) for state management
- `composables/` - Vue composables (auto-imported) for reusable logic
- `models/` - TypeScript types and factory functions (auto-imported)
- `components/` - Vue components following PascalCase naming
- `pages/` - File-based routing (`/g/[table_slug]` for table sessions)
- `utils/` - Helper functions (e.g., `firestoreDataConverter`, `driveOps`)
- `plugins/` - Nuxt plugins: `firebase.client.ts`, `logger.ts`, `konva.client.ts`

## Development Workflow

### Setup & Running

```bash
# Install dependencies
pnpm install

# Install pre-commit hooks (first time only)
pnpm exec husky install

# Development server (http://localhost:3000)
pnpm run dev

# Linting (auto-fixes enabled)
pnpm run lint

# Production build
pnpm run build
pnpm run preview
```

### Environment Configuration

Required runtime config is in `nuxt.config.ts` under `runtimeConfig`:

- Firebase: `fbApiKey`, `fbAuthDomain`, `projectId`, `fbServiceAccount`
- Google OAuth: `clientId`, `clientSecret`, `googleAuthRedirectUri`
- Debug logging: `debugEnabled`, `debugNamespace` (uses debug package with `app:*` namespaces)

## Critical Patterns & Conventions

### 1. State Management (Pinia Stores)

All stores use **Composition API pattern** with `defineStore` + arrow function:

```typescript
export const useTableStore = defineStore('table', () => {
  const state = ref(initialValue);
  const computed = computed(() => /* ... */);
  const action = async () => { /* ... */ };

  return { state, computed, action };
});
```

- Stores are auto-imported (configured in `nuxt.config.ts`)
- HMR support required: add `if (import.meta.hot) { ... }` at end
- Access other stores directly: `const otherStore = useOtherStore()`

### 2. Firestore Data Pattern

**Every Firestore query uses a custom converter**:

```typescript
const q = computed(() => {
  return query(
    collection($db, 'tables').withConverter(firestoreDataConverter<Table>()),
    where('slug', '==', slug.value),
  );
});

const data = useFirestore(q, defaultValue);
```

- Always use `firestoreDataConverter<T>()` for type safety
- `useFirestore` from `@vueuse/firebase` for reactive queries
- Access `$db` (Firestore) and `$auth` (Firebase Auth) from `useNuxtApp()`

### 3. Google Drive Integration

Assets are stored as Drive files with custom `appProperties` metadata:

```typescript
// Custom metadata stored in appProperties
interface AssetProperties {
  type: 'asset';
  kind: 'text' | 'image' | 'complex'; // Complex assets have separate preview file
  title: string;
  showTitle: boolean;
  preview?: PreviewProperties; // Contains preview file ID and dimensions
}
```

- Use `useDrive()` composable to initialize gapi client and picker
- Drive operations in `utils/driveOps.ts` (e.g., `getFile`, `downloadMedia`)
- **Caching strategy**: Use `DataRetrievalStrategies` enum (CACHE, LAZY, RECENT, SOURCE)
- Files cached in IndexedDB via `cache-store.ts` (schema in `models/types.ts` → `CacheSchema`)

### 4. Canvas Architecture (Konva)

Canvas elements are stored in Firestore with **client-side state management**:

```typescript
// Firestore document structure
interface SceneElementCanvasObjectAsset {
  _type: 'canvas-object';
  type: 'asset';
  asset: SceneElementCanvasObjectAssetProperties;
  container: ElementContainerConfig; // Position, size, rotation
  enabled: boolean;
  selectionGroup: SelectionGroup; // BACKGROUND(0), ELEMENT(10), HIDDEN(20), SCREEN(30)
}

// Client-side state (not persisted)
interface CanvasElementStateAsset {
  id: string;
  loading: boolean;
  loaded: boolean;
  selected: boolean;
  selectable: boolean;
  imageElement?: HTMLImageElement; // Loaded preview image
}
```

- **State registry**: `canvasElementsStateRegistry` in `canvas-elements-store.ts`
- Konva components use `ref()` to access nodes: `const nodeRef = ref<KonvaComponent<Konva.Image>>()`
- Access Konva node: `nodeRef.value?.getNode()`

### 5. Session Management

Tables have a **host (owner)** and multiple **viewer sessions**:

- `TableSession` maps `sessionId` → `TableSessionPresence`
- Each presence has `groupId` (for grouped viewers), `sceneId`, `path[]` (breadcrumb)
- **Presentation mode**: Host can create "private sessions" (prefix `local#`) to simulate viewer POV
- Screen frame tracking: `updateScreenFrame()` in `session-store.ts` for viewer viewport

### 6. Logging & Debugging

Custom debug logger via `debug` package (plugin: `plugins/logger.ts`):

```typescript
const { $logger } = useNuxtApp();
const log = $logger['canvas:elements']; // Namespace: app:canvas:elements
log('Message with data:', someData);

// Control via runtimeConfig
LOG_ENABLED=true LOG_NAMESPACE="app:*" pnpm dev
```

Common namespaces: `app:session`, `app:canvas:elements`, `app:drive`

### 7. Component Patterns

- **Auto-imports enabled**: Components, composables, stores, models
- **Props with destructuring**: Vite configured with `script.propsDestructure: true`
- **DefineModel enabled**: `script.defineModel: true` in `nuxt.config.ts`
- Layout transitions: `slide-fade` transition (see `assets/transitions.scss`)

### 8. Type Guards & Validation

Extensive runtime type checking with type guard functions:

```typescript
// Check object types
if (isSceneElementCanvasObjectAsset(element)) { /* ... */ }
if (isDriveAsset(file)) { /* ... */ }
if (isCanvasElementStateAsset(state)) { /* ... */ }

// Stateful elements (Firestore doc + client state)
type Stateful<T extends SceneElement, U extends CanvasElementState> = T & { _state: U };
```

Always prefer type guards over type assertions.

### 9. Factory Functions

Models provide factory functions for creating typed objects:

```typescript
// Example: SceneElementCanvasObjectAssetFactory
const element = SceneElementCanvasObjectAssetFactory(
  ID_PLACEHOLDER, // Replaced with Firestore auto-ID
  asset,
  ownerId,
  fittingFunction, // Optional: fit to stage dimensions
);
```

- `ID_PLACEHOLDER` constant used with `replaceIdPlaceholder()` utility
- Factory functions enforce required fields and default values

### 10. Error Handling

Custom error types with type guards:

```typescript
try {
  await driveOperation();
} catch (e) {
  if (isDriveInvalidParentFolderError(e)) {
    // Handle specific error
  }
  const notificationStore = useNotificationStore();
  notificationStore.error(extractErrorMessage(e)); // util function
}
```

## Common Pitfalls

1. **Don't forget Firestore converters**: Always use `.withConverter(firestoreDataConverter<T>())`
2. **Canvas state lifecycle**: Create element state before accessing in `canvasElementsStateRegistry`
3. **Complex assets**: Must fetch preview properties from separate collection (`asset_properties`)
4. **HMR in stores**: Missing `if (import.meta.hot)` block breaks hot reload
5. **Drive API loading**: Check `driveStore.isReady` before Drive operations
6. **SelectionGroup enum**: Use numeric values (0, 10, 20, 30) not strings

## Testing & Debugging

- **No automated tests currently** - manual testing workflow
- Use `$logger` with specific namespaces to trace execution
- Check browser's IndexedDB for cached files (db: cache, stores: files, media)
- Firebase Emulator not currently configured - uses production Firestore
- Lint-staged runs eslint on pre-commit (configured in `package.json`)

## Key Files to Reference

- `models/types.ts` - Single source of truth for all TypeScript interfaces
- `stores/table-store.ts` - Core table state and permissions logic
- `stores/canvas-elements-store.ts` - Canvas element state management
- `composables/useDrive.ts` - Google Drive API initialization
- `utils/driveOps.ts` - Drive file operations and caching
- `nuxt.config.ts` - Module configuration and runtime config
