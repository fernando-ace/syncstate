import { channels } from "./channels";
import type { StateKey, StateShape } from "./types";

interface WebContentsLike {
  isDestroyed(): boolean;
  once(event: "destroyed", listener: () => void): void;
  send(channel: string, key: string, value: unknown): void;
}

interface IpcEventLike {
  sender: WebContentsLike;
}

interface IpcMainLike {
  handle(
    channel: string,
    listener: (event: IpcEventLike, ...args: unknown[]) => unknown
  ): void;
  on(
    channel: string,
    listener: (event: IpcEventLike, ...args: unknown[]) => void
  ): void;
  removeHandler(channel: string): void;
  removeListener(
    channel: string,
    listener: (event: IpcEventLike, ...args: unknown[]) => void
  ): void;
}

export interface GlobalStateMain<State extends StateShape> {
  get<Key extends StateKey<State>>(key: Key): State[Key];
  set<Key extends StateKey<State>>(key: Key, value: State[Key]): void;
  dispose(): void;
}

export function createGlobalStateMain<State extends StateShape>(
  ipcMain: IpcMainLike,
  initialState: State
): GlobalStateMain<State> {
  const state = { ...initialState };
  const subscriptions = new Map<WebContentsLike, Set<StateKey<State>>>();
  const observedContents = new WeakSet<WebContentsLike>();

  const assertKey = (candidate: unknown): StateKey<State> => {
    if (
      typeof candidate !== "string" ||
      !Object.prototype.hasOwnProperty.call(state, candidate)
    ) {
      throw new Error(`Unknown global state key: ${String(candidate)}`);
    }

    return candidate as StateKey<State>;
  };

  const get = <Key extends StateKey<State>>(key: Key): State[Key] => state[key];

  const set = <Key extends StateKey<State>>(key: Key, value: State[Key]): void => {
    state[key] = value;

    for (const [contents, keys] of subscriptions) {
      if (contents.isDestroyed()) {
        subscriptions.delete(contents);
      } else if (keys.has(key)) {
        contents.send(channels.update, key, value);
      }
    }
  };

  const observe = (contents: WebContentsLike): Set<StateKey<State>> => {
    let keys = subscriptions.get(contents);
    if (!keys) {
      keys = new Set();
      subscriptions.set(contents, keys);
    }

    if (!observedContents.has(contents)) {
      observedContents.add(contents);
      contents.once("destroyed", () => subscriptions.delete(contents));
    }

    return keys;
  };

  const handleGet = (_event: IpcEventLike, candidate: unknown): unknown =>
    get(assertKey(candidate));

  const handleSet = (
    _event: IpcEventLike,
    candidate: unknown,
    value: unknown
  ): unknown => {
    const key = assertKey(candidate);
    set(key, value as State[typeof key]);
    return get(key);
  };

  const handleSubscribe = (event: IpcEventLike, candidate: unknown): void => {
    observe(event.sender).add(assertKey(candidate));
  };

  const handleUnsubscribe = (event: IpcEventLike, candidate: unknown): void => {
    const key = assertKey(candidate);
    const keys = subscriptions.get(event.sender);
    keys?.delete(key);
    if (keys?.size === 0) subscriptions.delete(event.sender);
  };

  ipcMain.handle(channels.get, handleGet);
  ipcMain.handle(channels.set, handleSet);
  ipcMain.on(channels.subscribe, handleSubscribe);
  ipcMain.on(channels.unsubscribe, handleUnsubscribe);

  return {
    get,
    set,
    dispose() {
      ipcMain.removeHandler(channels.get);
      ipcMain.removeHandler(channels.set);
      ipcMain.removeListener(channels.subscribe, handleSubscribe);
      ipcMain.removeListener(channels.unsubscribe, handleUnsubscribe);
      subscriptions.clear();
    }
  };
}
