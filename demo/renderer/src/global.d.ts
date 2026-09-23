import type { GlobalStateBridge } from "../../../src/types";
import type { DemoState } from "../../shared";

declare global {
  interface Window {
    globalState: GlobalStateBridge<DemoState>;
  }
}

export {};
