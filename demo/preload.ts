import { exposeGlobalState } from "../src/preload";
import type { DemoState } from "./shared";

exposeGlobalState<DemoState>();
