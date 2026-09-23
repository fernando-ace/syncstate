export type StateShape = object;
export type StateKey<State extends StateShape> = Extract<keyof State, string>;
export type StateListener<Value> = (value: Value) => void;
export type StateUpdate<Value> = Value | ((current: Value) => Value);

export interface GlobalStateBridge<State extends StateShape> {
  get<Key extends StateKey<State>>(key: Key): Promise<State[Key]>;
  set<Key extends StateKey<State>>(key: Key, value: State[Key]): Promise<State[Key]>;
  subscribe<Key extends StateKey<State>>(
    key: Key,
    listener: StateListener<State[Key]>
  ): void;
  unsubscribe<Key extends StateKey<State>>(
    key: Key,
    listener: StateListener<State[Key]>
  ): void;
}
