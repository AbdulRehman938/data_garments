import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiImage, FiX } from 'react-icons/fi';
import { supabase } from '../../utils/supabase';
import { uploadMultipleImages } from '../../utils/cloudinary';

interface Category {
  id: string;
  name: string;
}

const AdminAddProduct = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .not('name', 'ilike', '__SYSTEM_%'); // Exclude system config categories
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsUploading(true);

    try {
      // Validate image count (2-5 images required)
      if (selectedFiles.length < 2) {
        alert('Please select at least 2 images for the product gallery');
        setIsUploading(false);
        setIsLoading(false);
        return;
      }
      if (selectedFiles.length > 5) {
        alert('Maximum 5 images allowed');
        setIsUploading(false);
        setIsLoading(false);
        return;
      }

      // 1. Upload images to Cloudinary
      const imageUrls = await uploadMultipleImages(selectedFiles);

      if (!imageUrls || imageUrls.length === 0) {
        throw new Error('Image upload failed');
      }

      // 2. Create new product in Supabase
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category_id: formData.category_id || null,
          stock: parseInt(formData.stock),
          image_url: imageUrls[0], // Cover image
        })
        .select()
        .single();

      if (productError) throw productError;

      // 3. Insert all images in product_images table
      for (let i = 0; i < imageUrls.length; i++) {
        await supabase.from('product_images').insert({
          product_id: newProduct.id,
          image_url: imageUrls[i],
          order_index: i,
        });
      }

      // Navigate back to products list
      navigate('/admin/products');
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(error.message || 'Failed to save product');
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Back to Products */}
      <div className="mb-6">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-2 text-logo-rose hover:text-action-bordeaux transition-colors font-medium text-sm"
        >
          <FiArrowLeft size={16} />
          Back to Products List
        </Link>
      </div>

      {/* Main card form */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 md:p-10 border border-logo-rose/10 shadow-[0_10px_30px_rgba(210,150,158,0.06)]"
      >
        <h1 className="font-serif text-2xl md:text-3xl text-logo-black mb-6 border-b border-logo-rose/10 pb-4">
          Add New Product
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grid fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-logo-black mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="Enter product title"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-bg-silk-glow/20 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/10 text-sm"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-logo-black mb-1.5">
                Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 bg-bg-silk-glow/20 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/10 text-sm"
              />
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-semibold text-logo-black mb-1.5">
                Stock Quantity *
              </label>
              <input
                type="number"
                required
                placeholder="Enter available stock"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-3 bg-bg-silk-glow/20 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/10 text-sm"
              />
            </div>

            {/* Category Select */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-logo-black mb-1.5">
                Category Collection *
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-3 bg-bg-silk-glow/20 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/10 text-sm cursor-pointer"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-logo-black mb-1.5">
                Description
              </label>
              <textarea
                rows={4}
                placeholder="Describe this product's craftsmanship, fit, fabric and features..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-bg-silk-glow/20 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/10 text-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Image Uploader */}
          <div>
            <label className="block text-sm font-semibold text-logo-black mb-1.5">
              Product Gallery Images * (Upload 2 to 5 images. First image will act as cover)
            </label>
            
            <div className="border-2 border-dashed border-logo-rose/20 rounded-2xl p-6 bg-bg-silk-glow/10 hover:bg-logo-rose/5 transition-all">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length + selectedFiles.length > 5) {
                    alert('Maximum 5 images allowed');
                    return;
                  }
                  setSelectedFiles([...selectedFiles, ...files]);
                }}
                className="hidden"
                id="image-upload-page"
              />
              <label
                htmlFor="image-upload-page"
                className="flex flex-col items-center justify-center cursor-pointer py-6"
              >
                <FiImage className="text-logo-rose mb-3" size={40} />
                <p className="text-sm font-bold text-logo-black">Click to upload photos</p>
                <p className="text-xs text-logo-black/40 mt-1">PNG, JPG, WEBP formats (Max 5 images)</p>
              </label>
            </div>

            {/* Previews */}
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative aspect-[4/5] bg-bg-silk-glow rounded-xl overflow-hidden border border-logo-rose/10 shadow-sm">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 bg-action-bordeaux text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                      }}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-logo-black/50 mt-2 font-medium">
              {selectedFiles.length} of 5 images selected (minimum 2 required)
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-6 border-t border-logo-rose/10">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="flex-1 py-3 border border-logo-rose/20 rounded-full hover:bg-logo-rose/5 transition-all text-sm font-bold text-logo-black cursor-pointer uppercase tracking-widest text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isUploading}
              className="flex-1 py-3 bg-action-bordeaux text-white rounded-full hover:bg-[#460416] transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-widest text-center shadow-md hover:shadow-lg"
            >
              {isUploading ? 'Uploading & Creating...' : 'Save Product'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminAddProduct;
