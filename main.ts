import { app, BrowserWindow, Menu, nativeImage, Tray } from "electron";
import { join } from "node:path";
import { Dependencies } from "./dependencies";
import { Ipc } from "./ipc";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const APP_NAME = "Sincronizador de Documentos Fiscais";
const TRAY_ICON = `data:image/svg+xml;base64,${
  Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#145c52"/>
      <path d="M10 7h9l4 4v14H10z" fill="#ffffff"/>
      <path d="M19 7v5h5" fill="#dcefea"/>
      <path d="M13 16h8M13 20h8M13 24h5" stroke="#145c52" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `).toString("base64")
}`;

if (process.platform === "linux") {
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.commandLine.appendSwitch("in-process-gpu");
  app.commandLine.appendSwitch("enable-unsafe-swiftshader");
}

app.disableHardwareAcceleration();

const dependencies = new Dependencies();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: APP_NAME,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  dependencies.syncScheduler.attach(mainWindow);
  dependencies.updateService.attach(mainWindow);

  mainWindow.on("minimize", () => {
    mainWindow?.hide();
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow?.hide();
  });

  let didShow = false;
  const showWindow = (): void => {
    if (didShow) {
      return;
    }
    didShow = true;
    mainWindow?.show();
  };

  mainWindow.once("ready-to-show", showWindow);
  mainWindow.webContents.once("did-finish-load", showWindow);
  mainWindow.webContents.once("did-fail-load", showWindow);
  setTimeout(showWindow, 3_000);

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function setupTray(): void {
  if (tray) {
    return;
  }

  tray = new Tray(nativeImage.createFromDataURL(TRAY_ICON));
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: "Abrir",
      click: showMainWindow,
    },
    {
      label: "Sincronizar agora",
      click: () => {
        void dependencies.syncScheduler.runNow();
      },
    },
    { type: "separator" },
    {
      label: "Sair",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
  tray.on("click", showMainWindow);
}

void app.whenReady().then(() => {
  app.setName(APP_NAME);
  app.setAppUserModelId("devstationtech.tax-document-sync");
  dependencies.initialize();
  dependencies.updateService.initialize();
  new Ipc(dependencies).register();
  createWindow();
  setupTray();
  void dependencies.updateService.check();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});
