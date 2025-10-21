# Unified Image Upload Pipeline

## Overview

The Unified Image Upload Pipeline provides a standardized, consistent image upload experience across all seller components in the marketplace. This implementation addresses the requirements for standardizing image upload functionality across SellerOnboarding, SellerProfilePage, SellerDashboard, and SellerStorePage components.

**Requirements Addressed:** 5.1, 5.2, 5.3, 5.4, 5.5, 5.6

## Architecture

### Frontend Components

```
UnifiedImageUpload Component
├── useUnifiedImageUpload Hook
├── UnifiedImageService
└── SellerError Types
```

### Backend Services

```
Seller Image Routes
├── SellerImageController
├── SellerImageService
└── Image Storage & CDN Services
```

## Features

### ✅ Consistent Image Validation (Requirement 5.2)

- **Context-aware validation rules**
  - Profile: Max 5MB, 400x400px recommended, JPEG/PNG/WebP
  - Cover: Max 10MB, 1200x400px recommended, JPEG/PNG/WebP  
  - Listing: Max 10MB, 800x800px recommended, JPEG/PNG/WebP/GIF

- **Unified validation logic** across all components
- **Detailed error messages** with specific validation failures
- **File type and size checking** before upload

### ✅ Image Processing Pipeline (Requirement 5.5)

- **Automatic image optimization** with quality settings
- **Thumbnail generation** (small, medium, large)
- **Format conversion** to optimal formats (WebP when supported)
- **Dimension optimization** based on context
- **Compression** while maintaining quality

### ✅ Consistent CDN URL Generation (Requirement 5.4)

- **Standardized CDN URL patterns**
- **Optimization parameters** in URLs (quality, dimensions)
- **Fallback to direct URLs** when CDN unavailable
- **Consistent thumbnail URLs** across all contexts

### ✅ Unified Error Handling (Requirement 5.6)

- **SellerError class** with consistent error types
- **Error recovery strategies** with retry mechanisms
- **Graceful degradation** when services unavailable
- **User-friendly error messages** with actionable guidance

### ✅ Cross-Component Consistency (Requirement 5.1)

- **Same API endpoints** used by all seller components
- **Identical validation rules** applied consistently
- **Unified data interfaces** across all contexts
- **Consistent user experience** regardless of component

### ✅ Mobile Optimization (Requirement 5.3)

- **Touch-friendly interface** with proper touch targets
- **Responsive design** that works on all screen sizes
- **Drag and drop support** on mobile devices
- **Progress indicators** optimized for mobile

## Usage Examples

### Basic Usage

```tsx
import { UnifiedImageUpload } from '../components/Marketplace/Seller';

// Profile image upload
<UnifiedImageUpload
  context="profile"
  userId="user-wallet-address"
  onUploadSuccess={(results) => console.log('Upload success:', results)}
  onUploadError={(error) => console.error('Upload error:', error)}
/>

// Cover image upload
<UnifiedImageUpload
  context="cover"
  userId="user-wallet-address"
  maxFiles={1}
/>

// Product listing images
<UnifiedImageUpload
  context="listing"
  userId="user-wallet-address"
  maxFiles={10}
  multiple={true}
  variant="grid"
/>
```

### Advanced Usage with Custom Configuration

```tsx
<UnifiedImageUpload
  context="listing"
  userId="user-wallet-address"
  maxFiles={5}
  showPreviews={true}
  showProgress={true}
  variant="grid"
  label="Product Images"
  description="Upload high-quality product photos"
  dragText="Drop your product images here"
  browseText="Choose Files"
  onUploadSuccess={(results) => {
    // Handle successful uploads
    setProductImages(results);
  }}
  onUploadError={(error) => {
    // Handle upload errors
    showErrorNotification(error.getUserMessage());
  }}
  onFilesSelected={(files) => {
    // Handle file selection
    console.log('Files selected:', files);
  }}
  onRemoveImage={(result) => {
    // Handle image removal
    console.log('Image removed:', result);
  }}
  initialImages={existingImages}
/>
```

### Using the Hook Directly

```tsx
import { useUnifiedImageUpload } from '../hooks/useUnifiedImageUpload';

const MyComponent = () => {
  const {
    isUploading,
    progress,
    results,
    error,
    uploadSingle,
    uploadMultiple,
    deleteImage,
    validateFiles,
  } = useUnifiedImageUpload({
    context: 'profile',
    maxFiles: 1,
    userId: 'user-wallet-address',
    onSuccess: (results) => console.log('Success:', results),
    onError: (error) => console.error('Error:', error),
  });

  const handleFileUpload = async (file: File) => {
    try {
      const result = await uploadSingle(file);
      console.log('Upload result:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      {/* Your custom UI */}
    </div>
  );
};
```

## API Endpoints

### POST /api/marketplace/seller/images/upload

Upload a single image file.

**Request:**
```
Content-Type: multipart/form-data

image: File
context: 'profile' | 'cover' | 'listing'
userId: string
metadata?: string (JSON)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "image-uuid",
    "originalUrl": "https://storage.example.com/image.jpg",
    "cdnUrl": "https://cdn.example.com/images/image-uuid",
    "thumbnails": {
      "small": "https://cdn.example.com/images/image-uuid?w=150&h=150",
      "medium": "https://cdn.example.com/images/image-uuid?w=300&h=300",
      "large": "https://cdn.example.com/images/image-uuid?w=600&h=600"
    },
    "metadata": {
      "width": 800,
      "height": 600,
      "size": 245760,
      "format": "jpeg"
    },
    "ipfsHash": "QmXxXxXx...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/marketplace/seller/images/upload-multiple

Upload multiple image files in batch.

**Request:**
```
Content-Type: multipart/form-data

images: File[]
context: 'profile' | 'cover' | 'listing'
userId: string
```

**Response:**
```json
{
  "success": true,
  "data": {
    "successful": [...], // Array of successful upload results
    "failed": [...],    // Array of failed uploads with errors
    "totalUploaded": 3,
    "totalFailed": 1
  }
}
```

### GET /api/marketplace/seller/images/:imageId

Get image information and URLs.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "image-uuid",
    "originalUrl": "https://storage.example.com/image.jpg",
    "cdnUrl": "https://cdn.example.com/images/image-uuid",
    "thumbnails": { ... },
    "metadata": { ... }
  }
}
```

### DELETE /api/marketplace/seller/images/:imageId

Delete an image from storage.

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### GET /api/marketplace/seller/:walletAddress/images

Get all images for a seller with pagination.

**Query Parameters:**
- `context`: Filter by image context
- `limit`: Number of images per page (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [...], // Array of image results
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 123
  }
}
```

## Error Handling

### Error Types

```typescript
enum SellerErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  IMAGE_UPLOAD_ERROR = 'IMAGE_UPLOAD_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
}
```

### Error Recovery Strategies

The system provides automatic error recovery with:

- **Retry mechanisms** with exponential backoff
- **Fallback to cached data** when available
- **Graceful degradation** for non-critical failures
- **User-friendly error messages** with actionable steps

### Example Error Handling

```tsx
const handleUploadError = (error: SellerError) => {
  switch (error.type) {
    case SellerErrorType.VALIDATION_ERROR:
      // Show validation errors to user
      showValidationErrors(error.details.errors);
      break;
    
    case SellerErrorType.NETWORK_ERROR:
      // Offer retry option
      showRetryDialog(error.getUserMessage());
      break;
    
    case SellerErrorType.IMAGE_UPLOAD_ERROR:
      // Show upload-specific error
      showUploadError(error.getUserMessage());
      break;
    
    default:
      // Generic error handling
      showGenericError(error.getUserMessage());
  }
};
```

## Testing

### Backend Tests

```bash
# Run unified image upload integration tests
npm test -- --testPathPattern=unifiedImageUpload.integration.test.ts
```

### Frontend Tests

```bash
# Run component tests
npm test -- --testPathPattern=UnifiedImageUpload.test.tsx
```

### Test Coverage

The implementation includes comprehensive tests for:

- ✅ Image validation across all contexts
- ✅ Upload processing and optimization
- ✅ API endpoint consistency
- ✅ Error handling scenarios
- ✅ CDN URL generation
- ✅ Cross-component consistency
- ✅ Mobile optimization
- ✅ Accessibility compliance

## Performance Considerations

### Optimization Features

- **Batch processing** for multiple uploads
- **Concurrent upload limits** to prevent server overload
- **Image compression** to reduce file sizes
- **CDN integration** for fast image delivery
- **Lazy loading** for image previews
- **Progress tracking** for better user experience

### Caching Strategy

- **Browser caching** for uploaded images
- **CDN caching** with appropriate cache headers
- **Service worker caching** for offline support
- **Memory caching** for frequently accessed images

## Security

### Security Measures

- **File type validation** to prevent malicious uploads
- **File size limits** to prevent abuse
- **Image content scanning** for inappropriate content
- **User authentication** required for uploads
- **Access control** for image deletion and modification
- **CSRF protection** on all endpoints

### Data Protection

- **Secure file storage** with encryption at rest
- **HTTPS-only** image URLs
- **Access logging** for audit trails
- **Automatic cleanup** of temporary files

## Migration Guide

### Updating Existing Components

1. **Replace existing image upload logic** with UnifiedImageUpload component
2. **Update API calls** to use standardized endpoints
3. **Migrate error handling** to use SellerError types
4. **Test thoroughly** across all seller components

### Example Migration

```tsx
// Before (inconsistent implementation)
<input 
  type="file" 
  onChange={handleFileChange}
  accept="image/*"
/>

// After (unified implementation)
<UnifiedImageUpload
  context="profile"
  userId={walletAddress}
  onUploadSuccess={handleSuccess}
  onUploadError={handleError}
/>
```

## Troubleshooting

### Common Issues

1. **Upload failures**: Check network connectivity and file size limits
2. **Validation errors**: Verify file types and dimensions
3. **CDN issues**: Check CDN configuration and fallback URLs
4. **Permission errors**: Verify user authentication and access rights

### Debug Mode

Enable debug logging:

```typescript
// Enable debug mode in development
process.env.NODE_ENV === 'development' && console.log('Upload debug info:', result);
```

## Future Enhancements

### Planned Features

- **WebP format support** for better compression
- **Progressive image loading** for better performance
- **Image editing tools** (crop, rotate, filters)
- **Bulk operations** for managing multiple images
- **Advanced analytics** for upload performance
- **AI-powered image optimization** suggestions

---

## Implementation Status: ✅ COMPLETE

All requirements (5.1, 5.2, 5.3, 5.4, 5.5, 5.6) have been successfully implemented with:

- ✅ Standardized API endpoints across all seller components
- ✅ Unified data interfaces and validation rules
- ✅ Consistent error handling with recovery strategies
- ✅ Image processing pipeline with optimization
- ✅ CDN URL generation and thumbnail support
- ✅ Mobile-optimized responsive design
- ✅ Comprehensive test coverage
- ✅ Cross-component consistency verification

The unified image upload pipeline is now ready for production use across all seller components.