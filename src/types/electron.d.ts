declare global {
  interface Window {
    require: any;
    ipcRenderer: any;
    electronAPI: any;
  }
}

export {};
