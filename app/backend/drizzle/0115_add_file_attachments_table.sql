-- Add file_attachments table for deduplication and virus scanning tracking
CREATE TABLE IF NOT EXISTS file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash VARCHAR(64) UNIQUE NOT NULL,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  s3_key VARCHAR(500),
  ipfs_cid VARCHAR(100),
  uploaded_by VARCHAR(66) NOT NULL,
  upload_timestamp TIMESTAMP DEFAULT NOW(),
  virus_scan_status VARCHAR(20) DEFAULT 'pending',
  virus_scan_result JSONB,
  reference_count INTEGER DEFAULT 1,
  is_quarantined BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_attachments_hash ON file_attachments(file_hash);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_attachments_virus_scan_status ON file_attachments(virus_scan_status);
CREATE INDEX IF NOT EXISTS idx_file_attachments_created_at ON file_attachments(created_at);

-- Add virus scan logs table for audit trail
CREATE TABLE IF NOT EXISTS virus_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash VARCHAR(64) NOT NULL,
  scanner VARCHAR(20) NOT NULL,
  scan_result VARCHAR(20) NOT NULL,
  viruses TEXT[],
  scan_time_ms INTEGER,
  scanned_at TIMESTAMP DEFAULT NOW(),
  scanned_by VARCHAR(66),
  FOREIGN KEY (file_hash) REFERENCES file_attachments(file_hash) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_virus_scan_logs_file_hash ON virus_scan_logs(file_hash);
CREATE INDEX IF NOT EXISTS idx_virus_scan_logs_scanned_at ON virus_scan_logs(scanned_at);
