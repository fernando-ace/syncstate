import { contextBridge, ipcRenderer } from "electron";
import { createGlobalStateBridge } from "./bridge";
import type { StateShape } from "./types";

export function exposeGlobalState<State extends StateShape>(
  globalName = "globalState"
): void {
  contextBridge.exposeInMainWorld(
    globalName,
    createGlobalStateBridge<State>(ipcRenderer)
  );
}

export type { GlobalStateBridge } from "./types";
