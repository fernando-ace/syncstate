# SyncState

A small TypeScript library for one authoritative Electron state store. The main
process owns every value; sandboxed renderer windows read, write, and subscribe
through a narrow `contextBridge` API. A React hook wraps the renderer client.

## Install

```bash
npm install electron-global-state-sync
```

## Minimal React example

After exposing a typed bridge from preload, create one renderer client and hook:

```tsx
import { createGlobalStateClient } from "electron-global-state-sync/renderer";
import { createUseGlobalState } from "electron-global-state-sync/react";
import type { GlobalStateBridge } from "electron-global-state-sync/types";

interface AppState {
  count: number;
}

declare global {
  interface Window {
    globalState: GlobalStateBridge<AppState>;
  }
}

const client = createGlobalStateClient(window.globalState, { count: 0 });
const useGlobalState = createUseGlobalState(client);

export function Counter() {
  const [count, setCount] = useGlobalState("count");

  return <button onClick={() => setCount((value) => value + 1)}>{count}</button>;
}
```

## Electron wiring

Install the canonical store in the main process with the same shared state type:

```ts
import { ipcMain } from "electron";
import { createGlobalStateMain } from "electron-global-state-sync";
import { initialState } from "./shared";

const globalState = createGlobalStateMain(ipcMain, initialState);

globalState.get("count");
globalState.set("status", "working");
```

Expose only the typed bridge from the preload script:

```ts
import { exposeGlobalState } from "electron-global-state-sync/preload";
import type { AppState } from "./shared";

exposeGlobalState<AppState>();
```

Keep renderer security enabled:

```ts
new BrowserWindow({
  webPreferences: {
    preload: PRELOAD_PATH,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
});
```

The renderer's initial snapshot prevents a loading-only render; the subscribed
main-process value replaces it immediately.

The bridge and client also expose typed `get`, `set`, `subscribe`, and
`unsubscribe` methods. `client.subscribe()` returns an unsubscribe function.

## Architecture

```text
React component
  ↕ useGlobalState / renderer cache
contextBridge API in preload
  ↕ narrow IPC channels
canonical state in Electron main
  ↳ broadcasts changed keys to every subscribed renderer
```

The main process validates keys, tracks subscriptions per `webContents`, removes
them when a window is destroyed, and broadcasts updates after every accepted
write. Renderer clients ignore stale initial reads so an older response cannot
overwrite a newer subscription event.

## Limitations

- State is in memory only and resets when the app exits.
- Concurrent writes are last-write-wins. Functional setters use the renderer's
  latest snapshot; they are not cross-window atomic transactions.
- Keys are validated at runtime, but value types are enforced by TypeScript only.
- Values must be Electron structured-clone compatible. Replace objects through
  `set` rather than mutating references returned inside the main process.
- One IPC handler set is installed per Electron app; call `dispose()` before
  replacing it in tests or during teardown.

## Development

```bash
npm install
npm test
npm run build
npm run demo
```

`npm run demo` opens two windows. Change the count or message in either window
to see the other update immediately. `npm run demo:smoke` performs the same
bidirectional check automatically and exits.
