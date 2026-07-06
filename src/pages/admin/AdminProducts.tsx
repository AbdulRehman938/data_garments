import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiImage, FiX } from 'react-icons/fi';
import { supabase } from '../../utils/supabase';
import { uploadMultipleImages, deleteImage } from '../../utils/cloudinary';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
  stock: number;
  created_at: string;
  images?: ProductImage[];
}

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  order_index: number;
}

interface Category {
  id: string;
  name: string;
}

const AdminProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    stock: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage, itemsPerPage]);

  const fetchProducts = async () => {
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: productsData, error: productsError, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (productsError) throw productsError;

      // Fetch images for each product
      const productsWithImages = await Promise.all(
        (productsData || []).map(async (product) => {
          const { data: images } = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', product.id)
            .order('order_index', { ascending: true });

          return {
            ...product,
            images: images || [],
          };
        })
      );

      setProducts(productsWithImages);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .not('name', 'ilike', '__SYSTEM_%'); // Exclude system config rows

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
        alert('Please select at least 2 images');
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

      // Upload images to Cloudinary
      const imageUrls = await uploadMultipleImages(selectedFiles);

      if (editingProduct) {
        // Update existing product
        const { error: productError } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            category_id: formData.category_id || null,
            stock: parseInt(formData.stock),
          })
          .eq('id', editingProduct.id);

        if (productError) throw productError;

        // Delete old images
        const { data: oldImages } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', editingProduct.id);

        if (oldImages) {
          for (const oldImage of oldImages) {
            // Delete from Cloudinary
            const publicId = oldImage.image_url.split('/').pop()?.split('.')[0];
            if (publicId) {
              await deleteImage(publicId);
            }
          }
        }

        // Delete from database
        await supabase
          .from('product_images')
          .delete()
          .eq('product_id', editingProduct.id);

        // Insert new images
        for (let i = 0; i < imageUrls.length; i++) {
          await supabase.from('product_images').insert({
            product_id: editingProduct.id,
            image_url: imageUrls[i],
            order_index: i,
          });
        }
      } else {
        // Create new product
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            category_id: formData.category_id || null,
            stock: parseInt(formData.stock),
          })
          .select()
          .single();

        if (productError) throw productError;

        // Insert images
        for (let i = 0; i < imageUrls.length; i++) {
          await supabase.from('product_images').insert({
            product_id: newProduct.id,
            image_url: imageUrls[i],
            order_index: i,
          });
        }
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      setSelectedFiles([]);
      setFormData({
        name: '',
        description: '',
        price: '',
        category_id: '',
        image_url: '',
        stock: '',
      });
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(error.message || 'Failed to save product');
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      stock: product.stock.toString(),
    });
    
    // Fetch existing images for this product
    if (product.images && product.images.length > 0) {
      // Convert image URLs to File objects for preview
      const imageFiles = await Promise.all(
        product.images.map(async (img) => {
          try {
            const response = await fetch(img.image_url);
            const blob = await response.blob();
            const file = new File([blob], `image_${img.order_index}.jpg`, { type: 'image/jpeg' });
            return file;
          } catch (error) {
            console.error('Error fetching image:', error);
            return null;
          }
        })
      );
      setSelectedFiles(imageFiles.filter((f): f is File => f !== null));
    } else {
      setSelectedFiles([]);
    }
    
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      // Delete images from Cloudinary
      const { data: images } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id);

      if (images) {
        for (const image of images) {
          const publicId = image.image_url.split('/').pop()?.split('.')[0];
          if (publicId) {
            await deleteImage(publicId);
          }
        }
      }

      // Delete from database (CASCADE will handle product_images)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(error.message || 'Failed to delete product');
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-logo-black">Products</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/admin/products/add')}
          className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-action-bordeaux text-white rounded-xl font-medium text-sm hover:bg-logo-black transition-colors cursor-pointer"
        >
          <FiPlus size={18} />
          Add Product
        </motion.button>
      </div>

      {/* Search */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40" size={20} />
          <motion.input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20"
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </motion.div>

      {/* Products Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm overflow-hidden border border-logo-rose/20"
      >
        {isLoading ? (
          <div className="p-8 text-center text-logo-black/60">Loading...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-logo-black/60">
            {searchQuery ? 'No products found' : 'No products yet'}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg-silk-glow">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Product</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Stock</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Category</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-logo-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const category = categories.find((c) => c.id === product.category_id);
                    return (
                      <tr key={product.id} className="border-t border-logo-rose/10 hover:bg-logo-rose/5">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                            ) : (
                              <div className="w-12 h-12 bg-bg-silk-glow rounded-lg flex items-center justify-center"><FiImage className="text-logo-black/40" size={20} /></div>
                            )}
                            <div>
                              <p className="font-medium text-logo-black">{product.name}</p>
                              <p className="text-sm text-logo-black/60 truncate max-w-xs">{product.description || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-logo-black">${product.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-logo-black/60">{product.stock}</td>
                        <td className="px-6 py-4 text-logo-black/60">{category?.name || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEdit(product)} className="p-2 text-logo-rose hover:bg-logo-rose/10 rounded-lg transition-colors"><FiEdit2 size={18} /></button>
                            <button onClick={() => handleDelete(product.id)} className="p-2 text-logo-rose hover:bg-logo-rose/10 rounded-lg transition-colors"><FiTrash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-logo-rose/10">
              {filteredProducts.map((product) => {
                const category = categories.find((c) => c.id === product.category_id);
                return (
                  <div key={product.id} className="p-4 flex items-start gap-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded-xl shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-bg-silk-glow rounded-xl flex items-center justify-center shrink-0"><FiImage className="text-logo-black/40" size={20} /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-logo-black truncate">{product.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs font-medium text-action-bordeaux">${product.price.toFixed(2)}</span>
                        <span className="text-xs text-logo-black/50">Stock: {product.stock}</span>
                        {category && <span className="text-xs bg-logo-rose/10 text-logo-rose px-2 py-0.5 rounded-full">{category.name}</span>}
                      </div>
                      {product.description && <p className="text-xs text-logo-black/50 mt-1 line-clamp-2">{product.description}</p>}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => handleEdit(product)} className="p-2 text-logo-rose hover:bg-logo-rose/10 rounded-lg transition-colors"><FiEdit2 size={16} /></button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 text-logo-rose hover:bg-logo-rose/10 rounded-lg transition-colors"><FiTrash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalCount > itemsPerPage && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-6 py-4 border-t border-logo-rose/10">
                <p className="text-xs md:text-sm text-logo-black/60">Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} products</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-sm border border-logo-rose/20 rounded-lg hover:bg-logo-rose/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
                  <span className="px-3 py-1.5 text-sm font-medium text-logo-black">{currentPage} / {Math.ceil(totalCount / itemsPerPage)}</span>
                  <button onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))} disabled={currentPage === Math.ceil(totalCount / itemsPerPage)} className="px-3 py-1.5 text-sm border border-logo-rose/20 rounded-lg hover:bg-logo-rose/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Modal — slides up from bottom on mobile */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl p-5 md:p-6 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <h2 className="font-serif text-2xl text-logo-black mb-4">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-logo-black mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-logo-black mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-logo-black mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-logo-black mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-2 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-logo-black mb-1">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20"
                >
                  <option value="">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-logo-black mb-1">
                  Product Images (2-5 images required)
                </label>
                <div className="border-2 border-dashed border-logo-rose/20 rounded-xl p-4">
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
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center cursor-pointer py-4"
                  >
                    <FiImage className="text-logo-black/40" size={32} />
                    <p className="text-sm text-logo-black/60 mt-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-logo-black/40 mt-1">
                      PNG, JPG, WEBP (Max 5 images)
                    </p>
                  </label>
                </div>
                
                {/* Image Previews */}
                {selectedFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-logo-black/60 mt-1">
                  {selectedFiles.length}/5 images selected
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 border border-logo-rose/20 rounded-xl hover:bg-logo-rose/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 py-2 bg-action-bordeaux text-white rounded-xl hover:bg-logo-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
