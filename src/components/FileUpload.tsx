import React, { useState, useRef } from "react";

interface FileUploadProps {
  onFileUpload: (files: File[]) => Promise<boolean>;
  serverUrl: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, serverUrl }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const success = await onFileUpload(files);
      if (success) {
        setUploadProgress(100);
        setTimeout(() => {
          setUploadProgress(0);
          setIsUploading(false);
        }, 1000);
      } else {
        setIsUploading(false);
        alert("Upload failed. Please try again.");
      }
    } catch (error) {
      setIsUploading(false);
      alert("Upload failed. Please try again.");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload">
      <div
        className={`upload-area ${isDragging ? "dragging" : ""} ${
          isUploading ? "uploading" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        {isUploading ? (
          <div className="upload-progress">
            <div className="upload-icon">📤</div>
            <div className="upload-text">Uploading files...</div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <>
            <div className="upload-icon">{isDragging ? "📂" : "📁"}</div>
            <div className="upload-text">
              {isDragging
                ? "Drop files here to upload"
                : "Drag & drop files here or click to browse"}
            </div>
            <div className="upload-hint">Maximum file size: 100MB</div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
