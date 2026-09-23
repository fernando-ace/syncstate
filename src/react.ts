import { useCallback, useSyncExternalStore } from "react";
import type { GlobalStateClient } from "./renderer";
import type { StateKey, StateShape, StateUpdate } from "./types";

export type GlobalStateSetter<Value> = (update: StateUpdate<Value>) => void;

export function createUseGlobalState<State extends StateShape>(
  client: GlobalStateClient<State>
) {
  return function useGlobalState<Key extends StateKey<State>>(
    key: Key
  ): [State[Key], GlobalStateSetter<State[Key]>] {
    const subscribe = useCallback(
      (notify: () => void) => client.subscribe(key, notify),
      [key]
    );
    const getSnapshot = useCallback(() => client.getSnapshot(key), [key]);
    const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const setValue = useCallback(
      (update: StateUpdate<State[Key]>) => {
        void client.set(key, update);
      },
      [key]
    );

    return [value, setValue];
  };
}
