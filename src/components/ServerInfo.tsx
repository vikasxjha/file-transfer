import React from 'react';

interface ServerInfoProps {
  serverInfo: {
    url: string;
    port: number;
    sharedFolder?: string;
  };
  connectedClients: number;
}

const ServerInfo: React.FC<ServerInfoProps> = ({ serverInfo, connectedClients }) => {
  const getLocalIP = () => {
    try {
      const url = new URL(serverInfo.url);
      return url.hostname;
    } catch {
      return 'localhost';
    }
  };

  return (
    <div className="server-info">
      <div className="server-info-header">
        <h3>Server Information</h3>
      </div>
      
      <div className="info-grid">
        <div className="info-item">
          <label>Status:</label>
          <span className="status-active">🟢 Running</span>
        </div>
        
        <div className="info-item">
          <label>Local IP:</label>
          <span className="ip-address">{getLocalIP()}</span>
        </div>
        
        <div className="info-item">
          <label>Port:</label>
          <span className="port-number">{serverInfo.port}</span>
        </div>
        
        <div className="info-item">
          <label>Connected:</label>
          <span className="client-count">{connectedClients} device(s)</span>
        </div>
        
        {serverInfo.sharedFolder && (
          <div className="info-item full-width">
            <label>Shared Folder:</label>
            <span className="folder-path" title={serverInfo.sharedFolder}>
              {serverInfo.sharedFolder}
            </span>
          </div>
        )}
      </div>
      
      <div className="server-actions">
        <button 
          className="action-button primary"
          onClick={() => {
            if (serverInfo.sharedFolder) {
              // Try to open folder in Electron
              const isElectron = (window as any).require !== undefined;
              if (isElectron) {
                const { ipcRenderer } = (window as any).require('electron');
                ipcRenderer.invoke('open-shared-folder', serverInfo.sharedFolder);
              } else {
                alert('Folder can only be opened in desktop app');
              }
            }
          }}
          disabled={!serverInfo.sharedFolder}
        >
          📁 Open Folder
        </button>
      </div>
    </div>
  );
};

export default ServerInfo;
