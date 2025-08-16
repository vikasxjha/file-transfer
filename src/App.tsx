import React, { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import FileList from "./components/FileList";
import QRCodeDisplay from "./components/QRCodeDisplay";
import ServerInfo from "./components/ServerInfo";
import FolderSelector from "./components/FolderSelector";
import "./App.css";

interface ServerInfo {
  url: string;
  port: number;
  sharedFolder?: string;
}

interface FileInfo {
  name: string;
  size: number;
  modified: string;
}

function App() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedClients, setConnectedClients] = useState(0);

  useEffect(() => {
    // Check if running in Electron
    const isElectron = window.require !== undefined;

    if (isElectron) {
      const { ipcRenderer } = window.require("electron");

      // Get server info from Electron
      ipcRenderer.invoke("get-server-info").then((info: ServerInfo) => {
        setServerInfo(info);
      });

      // Listen for server started event
      ipcRenderer.on("server-started", (event: any, info: ServerInfo) => {
        setServerInfo(info);
      });

      // Listen for folder selector requests
      ipcRenderer.on("open-folder-selector", () => {
        document.getElementById("folder-selector-button")?.click();
      });

      ipcRenderer.on("open-shared-folder", () => {
        if (serverInfo?.sharedFolder) {
          ipcRenderer.invoke("open-shared-folder", serverInfo.sharedFolder);
        }
      });
    } else {
      // Running in browser, get server info from current URL
      const currentUrl = window.location.origin;
      setServerInfo({
        url: currentUrl,
        port: parseInt(window.location.port) || 80,
      });
    }
  }, []);

  useEffect(() => {
    if (!serverInfo?.url) return;

    // Connect to WebSocket for real-time updates
    const socket = (window as any).io
      ? (window as any).io(serverInfo.url)
      : null;

    if (socket) {
      socket.on("connect", () => {
        setIsConnected(true);
        socket.emit("request-files");
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
      });

      socket.on("files-list", (fileList: FileInfo[]) => {
        setFiles(fileList);
      });

      socket.on("files-updated", (data: any) => {
        if (data.files) {
          setFiles(data.files);
        } else {
          // Refresh file list
          socket.emit("request-files");
        }
      });

      return () => {
        socket.disconnect();
      };
    } else {
      // Fallback to polling if WebSocket not available
      const fetchFiles = async () => {
        try {
          const response = await fetch(`${serverInfo.url}/api/files`);
          const fileList = await response.json();
          setFiles(fileList);
          setIsConnected(true);
        } catch (error) {
          setIsConnected(false);
        }
      };

      fetchFiles();
      const interval = setInterval(fetchFiles, 5000);
      return () => clearInterval(interval);
    }
  }, [serverInfo?.url]);

  const handleFileUpload = async (uploadedFiles: File[]) => {
    const formData = new FormData();
    uploadedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch(`${serverInfo?.url}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Files will be updated via WebSocket
        return true;
      }
      return false;
    } catch (error) {
      console.error("Upload error:", error);
      return false;
    }
  };

  const handleFileDelete = async (filename: string) => {
    try {
      const response = await fetch(
        `${serverInfo?.url}/api/files/${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
        }
      );
      return response.ok;
    } catch (error) {
      console.error("Delete error:", error);
      return false;
    }
  };

  const handleFolderSelect = async (folderPath: string) => {
    try {
      const response = await fetch(`${serverInfo?.url}/api/set-folder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folderPath }),
      });

      if (response.ok) {
        const result = await response.json();
        setServerInfo((prev) =>
          prev ? { ...prev, sharedFolder: result.sharedFolder } : null
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Folder selection error:", error);
      return false;
    }
  };

  if (!serverInfo) {
    return (
      <div className="app">
        <div className="loading">
          <h2>Starting Local File Share...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Local File Share</h1>
        <div className="connection-status">
          <span
            className={`status-indicator ${
              isConnected ? "connected" : "disconnected"
            }`}
          >
            {isConnected ? "●" : "●"}
          </span>
          <span>{isConnected ? "Connected" : "Disconnected"}</span>
        </div>
      </header>

      <main className="app-main">
        <div className="top-section">
          <div className="left-panel">
            <ServerInfo
              serverInfo={serverInfo}
              connectedClients={connectedClients}
            />
            <FolderSelector
              onFolderSelect={handleFolderSelect}
              currentFolder={serverInfo.sharedFolder}
            />
          </div>

          <div className="right-panel">
            <QRCodeDisplay url={serverInfo.url} />
          </div>
        </div>

        <div className="middle-section">
          <FileUpload
            onFileUpload={handleFileUpload}
            serverUrl={serverInfo.url}
          />
        </div>

        <div className="bottom-section">
          <FileList
            files={files}
            onFileDelete={handleFileDelete}
            serverUrl={serverInfo.url}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
