import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { createGlobalStateMain } from "../src/main";
import { initialDemoState } from "./shared";

const isSmokeTest = process.argv.includes("--smoke-test");
const windows: BrowserWindow[] = [];

function createWindow(name: string, x: number): BrowserWindow {
  const window = new BrowserWindow({
    width: 520,
    height: 650,
    x,
    y: 120,
    minWidth: 420,
    minHeight: 560,
    show: false,
    backgroundColor: "#f5f7fb",
    title: `SyncState — ${name}`,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  void window.loadFile(join(__dirname, "renderer", "index.html"), {
    query: { window: name }
  });
  window.once("ready-to-show", () => window.show());
  return window;
}

async function waitFor(
  window: BrowserWindow,
  expression: string,
  timeoutMs = 5_000
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await window.webContents.executeJavaScript(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function runSmokeTest(
  [first, second]: [BrowserWindow, BrowserWindow]
): Promise<void> {
  await Promise.all(
    [first, second].map(
      (window) =>
        new Promise<void>((resolve) =>
          window.webContents.once("did-finish-load", () => resolve())
        )
    )
  );
  await waitFor(first, "document.querySelector('[data-testid=count]')?.textContent === '0'");
  await first.webContents.executeJavaScript(
    "document.querySelector('[data-testid=increment]').click()"
  );
  await waitFor(second, "document.querySelector('[data-testid=count]')?.textContent === '1'");
  await second.webContents.executeJavaScript(
    "document.querySelector('[data-testid=decrement]').click()"
  );
  await waitFor(first, "document.querySelector('[data-testid=count]')?.textContent === '0'");
  console.log("DEMO_SMOKE_OK: both Electron windows synchronized bidirectionally");
  app.quit();
}

void app.whenReady().then(async () => {
  createGlobalStateMain(ipcMain, initialDemoState);
  windows.push(createWindow("Window one", 140), createWindow("Window two", 700));

  if (isSmokeTest) {
    try {
      await runSmokeTest(windows as [BrowserWindow, BrowserWindow]);
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
  }
});

app.on("window-all-closed", () => app.quit());
