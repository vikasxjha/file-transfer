import React from 'react';

interface FileInfo {
  name: string;
  size: number;
  modified: string;
}

interface FileListProps {
  files: FileInfo[];
  onFileDelete: (filename: string) => Promise<boolean>;
  serverUrl: string;
}

const FileList: React.FC<FileListProps> = ({ files, onFileDelete, serverUrl }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleDownload = (filename: string) => {
    const downloadUrl = `${serverUrl}/api/download/${encodeURIComponent(filename)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (filename: string) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      const success = await onFileDelete(filename);
      if (!success) {
        alert('Failed to delete file. Please try again.');
      }
    }
  };

  if (files.length === 0) {
    return (
      <div className="file-list">
        <div className="file-list-header">
          <h3>Shared Files</h3>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <div className="empty-text">No files shared yet</div>
          <div className="empty-hint">Upload some files to get started</div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-list">
      <div className="file-list-header">
        <h3>Shared Files ({files.length})</h3>
      </div>
      
      <div className="file-table">
        <div className="file-table-header">
          <div className="file-name">Name</div>
          <div className="file-size">Size</div>
          <div className="file-modified">Modified</div>
          <div className="file-actions">Actions</div>
        </div>
        
        <div className="file-table-body">
          {files.map((file) => (
            <div key={file.name} className="file-row">
              <div className="file-name">
                <span className="file-icon">📄</span>
                <span className="file-name-text">{file.name}</span>
              </div>
              <div className="file-size">{formatFileSize(file.size)}</div>
              <div className="file-modified">{formatDate(file.modified)}</div>
              <div className="file-actions">
                <button
                  className="action-button download-button"
                  onClick={() => handleDownload(file.name)}
                  title="Download file"
                >
                  ⬇️
                </button>
                <button
                  className="action-button delete-button"
                  onClick={() => handleDelete(file.name)}
                  title="Delete file"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FileList;
