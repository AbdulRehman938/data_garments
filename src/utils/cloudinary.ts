// Cloudinary configuration for signed uploads
const CLOUD_NAME = 'di9tb45rl';
const API_KEY = '344247339423785';
const API_SECRET = '4iiRti_yJ66jNiVfMDC5DAhQtP4';

// Generate signature for signed upload
const generateSignature = (params: any): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  
  return btoa(sortedParams + API_SECRET);
};

export const uploadImage = async (file: File, folder: string = 'products'): Promise<string> => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      timestamp,
      folder,
    };
    
    const signature = generateSignature(paramsToSign);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', API_KEY);
    formData.append('signature', signature);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.secure_url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const uploadMultipleImages = async (
  files: File[],
  folder: string = 'products'
): Promise<string[]> => {
  const uploadPromises = files.map((file) => uploadImage(file, folder));
  return Promise.all(uploadPromises);
};

export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      public_id: publicId,
      timestamp,
    };
    
    const signature = generateSignature(paramsToSign);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          api_key: API_KEY,
          signature,
          timestamp,
        }),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};
