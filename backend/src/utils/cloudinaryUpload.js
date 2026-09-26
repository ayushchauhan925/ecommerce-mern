const { cloudinary } = require('../config/cloudinary');

function uploadImageToCloudinary(buffer, folder = 'ecommerce/products') {
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

function deleteImageFromCloudinary(publicId) {
  return cloudinary.uploader.destroy(publicId).then(() => undefined);
}

module.exports = { uploadImageToCloudinary, deleteImageFromCloudinary };
