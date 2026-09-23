import type {
  GlobalStateBridge,
  StateKey,
  StateListener,
  StateShape,
  StateUpdate
} from "./types";

export class GlobalStateClient<State extends StateShape> {
  readonly #bridge: GlobalStateBridge<State>;
  readonly #snapshot: State;
  readonly #listeners = new Map<
    StateKey<State>,
    Set<StateListener<State[StateKey<State>]>>
  >();
  readonly #receivers = new Map<
    StateKey<State>,
    StateListener<State[StateKey<State>]>
  >();
  readonly #versions = new Map<StateKey<State>, number>();

  constructor(bridge: GlobalStateBridge<State>, initialSnapshot: State) {
    this.#bridge = bridge;
    this.#snapshot = { ...initialSnapshot };
  }

  getSnapshot<Key extends StateKey<State>>(key: Key): State[Key] {
    return this.#snapshot[key];
  }

  async get<Key extends StateKey<State>>(key: Key): Promise<State[Key]> {
    const version = this.#versions.get(key) ?? 0;
    const value = await this.#bridge.get(key);
    if ((this.#versions.get(key) ?? 0) === version) {
      this.#publish(key, value);
    }
    return value;
  }

  async set<Key extends StateKey<State>>(
    key: Key,
    update: StateUpdate<State[Key]>
  ): Promise<void> {
    const current = this.getSnapshot(key);
    const next =
      typeof update === "function"
        ? (update as (value: State[Key]) => State[Key])(current)
        : update;
    const accepted = await this.#bridge.set(key, next);
    this.#publish(key, accepted);
  }

  subscribe<Key extends StateKey<State>>(
    key: Key,
    listener: StateListener<State[Key]>
  ): () => void {
    let keyListeners = this.#listeners.get(key) as
      | Set<typeof listener>
      | undefined;

    if (!keyListeners) {
      keyListeners = new Set();
      this.#listeners.set(
        key,
        keyListeners as Set<StateListener<State[StateKey<State>]>>
      );

      const receiver: StateListener<State[Key]> = (value) =>
        this.#publish(key, value);
      this.#receivers.set(
        key,
        receiver as StateListener<State[StateKey<State>]>
      );
      this.#bridge.subscribe(key, receiver);
      void this.get(key);
    }

    keyListeners.add(listener);
    return () => this.unsubscribe(key, listener);
  }

  unsubscribe<Key extends StateKey<State>>(
    key: Key,
    listener: StateListener<State[Key]>
  ): void {
    const keyListeners = this.#listeners.get(key) as
      | Set<typeof listener>
      | undefined;
    keyListeners?.delete(listener);

    if (keyListeners?.size === 0) {
      this.#listeners.delete(key);
      const receiver = this.#receivers.get(key) as
        | StateListener<State[Key]>
        | undefined;
      if (receiver) this.#bridge.unsubscribe(key, receiver);
      this.#receivers.delete(key);
    }
  }

  #publish<Key extends StateKey<State>>(key: Key, value: State[Key]): void {
    if (Object.is(this.#snapshot[key], value)) return;
    this.#snapshot[key] = value;
    this.#versions.set(key, (this.#versions.get(key) ?? 0) + 1);
    const keyListeners = this.#listeners.get(key) as
      | Set<StateListener<State[Key]>>
      | undefined;
    for (const listener of keyListeners ?? []) listener(value);
  }
}

export function createGlobalStateClient<State extends StateShape>(
  bridge: GlobalStateBridge<State>,
  initialSnapshot: State
): GlobalStateClient<State> {
  return new GlobalStateClient(bridge, initialSnapshot);
}

export type { GlobalStateBridge, StateUpdate } from "./types";
