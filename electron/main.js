const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { startServer } = require('./server');

let mainWindow;
let serverInstance;
let serverPort = 3001;
let serverUrl = '';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // Load the React app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start the file sharing server
  startFileServer();
}

async function startFileServer() {
  try {
    const result = await startServer(serverPort);
    serverInstance = result.server;
    serverUrl = result.url;
    
    // Send server info to renderer process
    if (mainWindow) {
      mainWindow.webContents.send('server-started', {
        url: serverUrl,
        port: serverPort
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    // Try a different port
    serverPort = Math.floor(Math.random() * 1000) + 3000;
    startFileServer();
  }
}

// IPC handlers
ipcMain.handle('get-server-info', () => {
  return {
    url: serverUrl,
    port: serverPort
  };
});

ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.handle('open-shared-folder', (event, folderPath) => {
  shell.openPath(folderPath);
});

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.close();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Create application menu
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Select Shared Folder',
        accelerator: 'CmdOrCtrl+O',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('open-folder-selector');
          }
        }
      },
      {
        label: 'Open Shared Folder',
        accelerator: 'CmdOrCtrl+Shift+O',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('open-shared-folder');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  }
];

if (process.platform === 'darwin') {
  template.unshift({
    label: app.getName(),
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  });
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
