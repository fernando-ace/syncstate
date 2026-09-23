import { createUseGlobalState } from "../../../src/react";
import { createGlobalStateClient } from "../../../src/renderer";
import { initialDemoState } from "../../shared";

const client = createGlobalStateClient(window.globalState, initialDemoState);

export const useGlobalState = createUseGlobalState(client);
