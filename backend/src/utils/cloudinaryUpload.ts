import { cloudinary } from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';

export function uploadImageToCloudinary(
  buffer: Buffer,
  folder = 'ecommerce/products',
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error('Cloudinary upload failed'));
        return;
      }
      resolve(result);
    });
    stream.end(buffer);
  });
}

export function deleteImageFromCloudinary(publicId: string): Promise<void> {
  return cloudinary.uploader.destroy(publicId).then(() => undefined);
}
