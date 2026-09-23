import { describe, expect, it, vi } from "vitest";
import { createGlobalStateBridge } from "../src/bridge";
import { channels } from "../src/channels";
import { createGlobalStateMain } from "../src/main";
import { createGlobalStateClient } from "../src/renderer";
import { FakeIpcMain, FakeIpcRenderer } from "./fake-electron";

interface TestState {
  count: number;
  message: string;
}

function setup() {
  const ipcMain = new FakeIpcMain();
  const main = createGlobalStateMain<TestState>(ipcMain, {
    count: 0,
    message: "Ready"
  });
  const rendererA = new FakeIpcRenderer(ipcMain);
  const rendererB = new FakeIpcRenderer(ipcMain);
  const clientA = createGlobalStateClient(
    createGlobalStateBridge<TestState>(rendererA),
    { count: 0, message: "Ready" }
  );
  const clientB = createGlobalStateClient(
    createGlobalStateBridge<TestState>(rendererB),
    { count: 0, message: "Ready" }
  );

  return { main, rendererA, rendererB, clientA, clientB };
}

describe("global synchronization", () => {
  it("propagates changes from either renderer to every subscribed renderer", async () => {
    const { main, clientA, clientB } = setup();
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    clientA.subscribe("count", listenerA);
    clientB.subscribe("count", listenerB);

    await clientA.set("count", (count) => count + 1);

    expect(main.get("count")).toBe(1);
    expect(clientA.getSnapshot("count")).toBe(1);
    expect(clientB.getSnapshot("count")).toBe(1);
    expect(listenerA).toHaveBeenCalledWith(1);
    expect(listenerB).toHaveBeenCalledWith(1);

    await clientB.set("count", 7);

    expect(clientA.getSnapshot("count")).toBe(7);
    expect(clientB.getSnapshot("count")).toBe(7);
  });

  it("stops delivery after unsubscribe while other windows stay subscribed", async () => {
    const { clientA, clientB } = setup();
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    clientA.subscribe("message", listenerA);
    const unsubscribeB = clientB.subscribe("message", listenerB);
    unsubscribeB();

    await clientA.set("message", "Synced");

    expect(listenerA).toHaveBeenCalledWith("Synced");
    expect(listenerB).not.toHaveBeenCalled();
    expect(clientB.getSnapshot("message")).toBe("Ready");
  });

  it("rejects keys that are not in the main-process state", async () => {
    const { rendererA } = setup();

    await expect(rendererA.invoke(channels.get, "missing")).rejects.toThrow(
      "Unknown global state key"
    );
  });
});

describe("subscription lifecycle", () => {
  it("subscribes once per key and unsubscribes after the final listener", () => {
    const ipcMain = new FakeIpcMain();
    createGlobalStateMain<TestState>(ipcMain, { count: 0, message: "Ready" });
    const ipcRenderer = new FakeIpcRenderer(ipcMain);
    const bridge = createGlobalStateBridge<TestState>(ipcRenderer);
    const first = vi.fn();
    const second = vi.fn();

    bridge.subscribe("count", first);
    bridge.subscribe("count", second);
    bridge.unsubscribe("count", first);

    expect(ipcRenderer.sent).toEqual([
      { channel: channels.subscribe, key: "count" }
    ]);

    bridge.unsubscribe("count", second);

    expect(ipcRenderer.sent).toEqual([
      { channel: channels.subscribe, key: "count" },
      { channel: channels.unsubscribe, key: "count" }
    ]);
  });
});
