export interface UploadResult {
  cid: string;
  url: string;
  size: number;
  type: string;
}

class IPFSUploadService {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/json'
  ];

  async uploadFile(file: File): Promise<UploadResult> {
    this.validateFile(file);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/support/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');

    const data = await response.json();
    return data.data;
  }

  async uploadMultiple(files: File[]): Promise<UploadResult[]> {
    return Promise.all(files.map(file => this.uploadFile(file)));
  }

  private validateFile(file: File): void {
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
    }

    if (!this.allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed`);
    }
  }
}

export const ipfsUploadService = new IPFSUploadService();
