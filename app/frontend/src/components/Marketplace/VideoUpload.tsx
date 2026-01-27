import React, { useState, useRef, useCallback } from 'react';

interface VideoUploadProps {
  onUploadComplete: (url: string, metadata: VideoMetadata) => void;
  onUploadProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  maxSize?: number; // in bytes
  accept?: string[];
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  size: number;
}

/**
 * Enhanced Video Upload Component
 * Features: progress tracking, video preview, metadata extraction, validation
 */
export const VideoUpload: React.FC<VideoUploadProps> = ({
  onUploadComplete,
  onUploadProgress,
  onError,
  maxSize = 100 * 1024 * 1024, // 100MB default
  accept = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const MAX_DURATION = 600; // 10 minutes in seconds
  const MIN_DURATION = 1; // 1 second minimum

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!accept.includes(file.type)) {
      const errorMessage = `Invalid file type. Accepted formats: ${accept.map(a => a.split('/')[1]).join(', ')}`;
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      const errorMessage = `File too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(0)}MB`;
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Extract video metadata
    if (videoRef.current) {
      videoRef.current.src = objectUrl;

      videoRef.current.onloadedmetadata = () => {
        const metadata: VideoMetadata = {
          duration: videoRef.current!.duration,
          width: videoRef.current!.videoWidth,
          height: videoRef.current!.videoHeight,
          format: file.type,
          size: file.size
        };

        // Validate duration
        if (metadata.duration < MIN_DURATION) {
          const errorMessage = `Video too short. Minimum duration: ${MIN_DURATION} second`;
          setError(errorMessage);
          URL.revokeObjectURL(objectUrl);
          setPreviewUrl(null);
          if (onError) onError(errorMessage);
          return;
        }

        if (metadata.duration > MAX_DURATION) {
          const errorMessage = `Video too long. Maximum duration: ${Math.floor(MAX_DURATION / 60)} minutes`;
          setError(errorMessage);
          URL.revokeObjectURL(objectUrl);
          setPreviewUrl(null);
          if (onError) onError(errorMessage);
          return;
        }

        setVideoMetadata(metadata);
      };
    }
  }, [accept, maxSize, onError]);

  const handleUpload = useCallback(async () => {
    if (!previewUrl || !videoMetadata) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Convert object URL to File
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const file = new File([blob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });

      // Create FormData
      const formData = new FormData();
      formData.append('video', file);
      formData.append('metadata', JSON.stringify(videoMetadata));

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
          if (onUploadProgress) {
            onUploadProgress(progress);
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          onUploadComplete(result.url, videoMetadata);
          setIsUploading(false);
          setUploadProgress(100);
        } else {
          const errorMessage = `Upload failed: ${xhr.statusText}`;
          setError(errorMessage);
          if (onError) onError(errorMessage);
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        const errorMessage = 'Upload failed. Please try again.';
        setError(errorMessage);
        if (onError) onError(errorMessage);
        setIsUploading(false);
      };

      xhr.open('POST', '/api/upload/video');
      xhr.send(formData);
    } catch (err) {
      const errorMessage = 'Upload failed. Please try again.';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      setIsUploading(false);
    }
  }, [previewUrl, videoMetadata, onUploadComplete, onUploadProgress, onError]);

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setVideoMetadata(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!previewUrl ? (
        <div
          className="upload-zone"
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #ccc',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#666'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ccc'}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📹</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Upload Video</h3>
          <p style={{ margin: 0, color: '#666' }}>
            Click to select a video file
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#999' }}>
            Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB • Formats: {accept.map(a => a.split('/')[1]).join(', ')}
          </p>
        </div>
      ) : (
        <div className="video-preview">
          <video
            ref={videoRef}
            src={previewUrl}
            controls
            style={{
              width: '100%',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}
          />

          {videoMetadata && (
            <div className="video-info" style={{
              background: '#f5f5f5',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <div>
                  <strong>Duration:</strong> {formatDuration(videoMetadata.duration)}
                </div>
                <div>
                  <strong>Size:</strong> {formatFileSize(videoMetadata.size)}
                </div>
                <div>
                  <strong>Resolution:</strong> {videoMetadata.width}x{videoMetadata.height}
                </div>
                <div>
                  <strong>Format:</strong> {videoMetadata.format.split('/')[1].toUpperCase()}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: '#fee',
              border: '1px solid #fcc',
              color: '#c33',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {isUploading ? (
            <div>
              <div style={{
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem'
              }}>
                <span>Uploading...</span>
                <span>{uploadProgress.toFixed(0)}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: '#4CAF50',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleUpload}
                disabled={!!error}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  background: error ? '#ccc' : '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: error ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                Upload Video
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .video-upload {
          width: 100%;
        }

        .upload-zone:hover {
          background: #fafafa;
        }
      `}</style>
    </div>
  );
};

export default VideoUpload;