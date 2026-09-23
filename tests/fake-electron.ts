import { EventEmitter } from "node:events";

type Handler = (event: FakeIpcEvent, ...args: unknown[]) => unknown;
type Listener = (event: FakeIpcEvent, ...args: unknown[]) => void;

interface FakeIpcEvent {
  sender: FakeWebContents;
}

export class FakeIpcMain {
  readonly handlers = new Map<string, Handler>();
  readonly events = new EventEmitter();

  handle(channel: string, listener: Handler): void {
    this.handlers.set(channel, listener);
  }

  on(channel: string, listener: Listener): void {
    this.events.on(channel, listener);
  }

  removeHandler(channel: string): void {
    this.handlers.delete(channel);
  }

  removeListener(channel: string, listener: Listener): void {
    this.events.removeListener(channel, listener);
  }
}

class FakeWebContents extends EventEmitter {
  destroyed = false;
  renderer?: FakeIpcRenderer;

  isDestroyed(): boolean {
    return this.destroyed;
  }

  send(channel: string, key: string, value: unknown): void {
    this.renderer?.events.emit(channel, {}, key, value);
  }

  destroy(): void {
    this.destroyed = true;
    this.emit("destroyed");
  }
}

export class FakeIpcRenderer {
  readonly events = new EventEmitter();
  readonly sent: Array<{ channel: string; key: string }> = [];
  readonly contents = new FakeWebContents();

  constructor(private readonly main: FakeIpcMain) {
    this.contents.renderer = this;
  }

  async invoke(channel: string, key: string, value?: unknown): Promise<unknown> {
    const handler = this.main.handlers.get(channel);
    if (!handler) throw new Error(`No handler for ${channel}`);
    return handler({ sender: this.contents }, key, value);
  }

  on(
    channel: string,
    listener: (event: unknown, key: string, value: unknown) => void
  ): void {
    this.events.on(channel, listener);
  }

  send(channel: string, key: string): void {
    this.sent.push({ channel, key });
    this.main.events.emit(channel, { sender: this.contents }, key);
  }
}
