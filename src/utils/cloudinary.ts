/* eslint-disable @typescript-eslint/no-explicit-any */
const CLOUD_NAME = 'di9tb45rl'
const API_KEY = '344247339423785'
const API_SECRET = '4iiRti_yJ66jNiVfMDC5DAhQtP4'

const sha1 = async (message: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

const generateSignature = async (params: any): Promise<string> => {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  
  const stringToSign = sortedParams + API_SECRET
  return await sha1(stringToSign)
}

export const compressToWebP = async (file: File, quality = 85): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX_WIDTH = 2000
      let width = img.width
      let height = img.height
      
      if (width > MAX_WIDTH) {
        const ratio = MAX_WIDTH / width
        width = MAX_WIDTH
        height = Math.round(height * ratio)
      }
      
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert to WebP'))
          }
        },
        'image/webp',
        quality / 100
      )
    }
    img.onerror = (err) => reject(err)
    img.src = URL.createObjectURL(file)
  })
}

export const uploadImage = async (file: File, folder: string = 'products', quality = 85): Promise<string> => {
  try {
    const webpBlob = await compressToWebP(file, quality)
    const compressedFile = new File([webpBlob], file.name.replace(/\.[^/.]+$/, '.webp'), {
      type: 'image/webp',
      lastModified: Date.now()
    })
    
    const timestamp = Math.round(new Date().getTime() / 1000)
    const paramsToSign = {
      timestamp,
      folder,
      format: 'webp'
    }
    
    const signature = await generateSignature(paramsToSign)
    
    const formData = new FormData()
    formData.append('file', compressedFile)
    formData.append('timestamp', timestamp.toString())
    formData.append('api_key', API_KEY)
    formData.append('signature', signature)
    formData.append('folder', folder)
    formData.append('format', 'webp')

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message)
    }

    return data.secure_url
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

export const uploadMultipleImages = async (
  files: File[],
  folder: string = 'products',
  quality = 85
): Promise<string[]> => {
  const uploadPromises = files.map((file) => uploadImage(file, folder, quality))
  return Promise.all(uploadPromises)
}

export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000)
    const paramsToSign = {
      public_id: publicId,
      timestamp,
    }
    
    const signature = await generateSignature(paramsToSign)

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
    )

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message)
    }
  } catch (error) {
    console.error('Error deleting image:', error)
    throw error
  }
}