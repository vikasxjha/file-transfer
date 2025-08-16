import React, { useEffect, useState } from 'react';

interface QRCodeDisplayProps {
  url: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateQRCode();
  }, [url]);

  const generateQRCode = async () => {
    setIsLoading(true);
    try {
      // Use a public QR code API service
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      alert('URL copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('URL copied to clipboard!');
    }
  };

  return (
    <div className="qr-code-display">
      <div className="qr-code-header">
        <h3>Quick Connect</h3>
        <p>Scan with your phone or share the URL</p>
      </div>
      
      <div className="qr-code-container">
        {isLoading ? (
          <div className="qr-loading">
            <div className="qr-placeholder">
              <span>📱</span>
            </div>
            <p>Generating QR code...</p>
          </div>
        ) : (
          <div className="qr-code">
            <img 
              src={qrCodeUrl} 
              alt="QR Code for file sharing URL"
              className="qr-image"
              onError={() => {
                // Fallback if QR service is down
                setQrCodeUrl('');
              }}
            />
            {!qrCodeUrl && (
              <div className="qr-fallback">
                <span className="qr-icon">📱</span>
                <p>QR code unavailable</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="url-section">
        <div className="url-display">
          <input 
            type="text" 
            value={url} 
            readOnly 
            className="url-input"
          />
          <button 
            onClick={copyUrlToClipboard}
            className="copy-button"
            title="Copy URL to clipboard"
          >
            📋
          </button>
        </div>
        <p className="url-hint">
          Share this URL with devices on your network
        </p>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
