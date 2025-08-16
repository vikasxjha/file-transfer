import React from 'react';

interface FolderSelectorProps {
  onFolderSelect: (folderPath: string) => Promise<boolean>;
  currentFolder?: string;
}

const FolderSelector: React.FC<FolderSelectorProps> = ({ onFolderSelect, currentFolder }) => {
  const handleFolderSelect = async () => {
    const isElectron = (window as any).require !== undefined;
    
    if (isElectron) {
      const { ipcRenderer } = (window as any).require('electron');
      const result = await ipcRenderer.invoke('open-folder-dialog');
      
      if (!result.canceled && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0];
        const success = await onFolderSelect(folderPath);
        if (!success) {
          alert('Failed to set shared folder. Please try again.');
        }
      }
    } else {
      alert('Folder selection is only available in the desktop app');
    }
  };

  return (
    <div className="folder-selector">
      <div className="folder-selector-header">
        <h3>Shared Folder</h3>
      </div>
      
      <div className="folder-info">
        {currentFolder ? (
          <div className="current-folder">
            <div className="folder-icon">📁</div>
            <div className="folder-details">
              <span className="folder-label">Current:</span>
              <span className="folder-path" title={currentFolder}>
                {currentFolder}
              </span>
            </div>
          </div>
        ) : (
          <div className="no-folder">
            <div className="folder-icon">📂</div>
            <span>Using default folder</span>
          </div>
        )}
      </div>
      
      <button 
        id="folder-selector-button"
        className="action-button secondary"
        onClick={handleFolderSelect}
      >
        📁 Change Folder
      </button>
      
      <div className="folder-hint">
        Select a folder to share files from that location
      </div>
    </div>
  );
};

export default FolderSelector;
