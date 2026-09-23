import { channels } from "./channels";
import type {
  GlobalStateBridge,
  StateKey,
  StateListener,
  StateShape
} from "./types";

interface IpcRendererLike {
  invoke(channel: string, key: string, value?: unknown): Promise<unknown>;
  on(
    channel: string,
    listener: (event: unknown, key: string, value: unknown) => void
  ): void;
  send(channel: string, key: string): void;
}

export function createGlobalStateBridge<State extends StateShape>(
  ipcRenderer: IpcRendererLike
): GlobalStateBridge<State> {
  type Key = StateKey<State>;
  type Listener = StateListener<State[Key]>;
  const listeners = new Map<Key, Set<Listener>>();

  ipcRenderer.on(channels.update, (_event, rawKey, value) => {
    const key = rawKey as Key;
    for (const listener of listeners.get(key) ?? []) {
      listener(value as State[Key]);
    }
  });

  return {
    async get(key) {
      return (await ipcRenderer.invoke(channels.get, key)) as State[typeof key];
    },
    async set(key, value) {
      return (await ipcRenderer.invoke(
        channels.set,
        key,
        value
      )) as State[typeof key];
    },
    subscribe(key, listener) {
      let keyListeners = listeners.get(key) as Set<typeof listener> | undefined;
      if (!keyListeners) {
        keyListeners = new Set();
        listeners.set(key, keyListeners as Set<Listener>);
        ipcRenderer.send(channels.subscribe, key);
      }
      keyListeners.add(listener);
    },
    unsubscribe(key, listener) {
      const keyListeners = listeners.get(key) as Set<typeof listener> | undefined;
      keyListeners?.delete(listener);
      if (keyListeners?.size === 0) {
        listeners.delete(key);
        ipcRenderer.send(channels.unsubscribe, key);
      }
    }
  };
}
