'use client';

import { useRef } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Trash2, Upload } from 'lucide-react';
import { ProductImageResponse } from '@/lib/types';
import { useDeleteProductImage, useUploadProductImage } from '@/hooks/useProducts';
import { getErrorMessage } from '@/lib/api';

export function ProductImageManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImageResponse[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadProductImage(productId);
  const deleteImage = useDeleteProductImage(productId);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage.mutate(file, {
      onSuccess: () => toast.success('Image uploaded'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not upload image')),
    });
    e.target.value = '';
  }

  function handleDelete(imageId: string) {
    deleteImage.mutate(imageId, {
      onSuccess: () => toast.success('Image deleted'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not delete image')),
    });
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-md border border-slate-200">
            <Image src={img.url} alt="" fill className="object-cover" />
            <button
              onClick={() => handleDelete(img.id)}
              className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
              title="Delete image"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadImage.isPending}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600"
        >
          <Upload size={20} />
          <span className="text-xs">{uploadImage.isPending ? 'Uploading...' : 'Add image'}</span>
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <p className="mt-2 text-xs text-slate-400">JPEG, PNG, or WEBP. Max 5MB.</p>
    </div>
  );
}
