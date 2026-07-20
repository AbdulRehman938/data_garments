import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiImage, FiX, FiCheck } from 'react-icons/fi';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../utils/supabase';
import { uploadMultipleImages, deleteImage } from '../../utils/cloudinary';
import { useToast } from '../../components/common/Toast';
import { CustomSelect, MultiTagInput } from '../../components/common/CustomSelect';

// Lock body scroll when modal is open
const useScrollLock = (isOpen: boolean) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
};
import { SERVICE_ICONS, type Service } from './AdminServices';

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

const COLOR_PRESETS = ['White', 'Black', 'Red', 'Pink', 'Beige', 'Navy', 'Green', 'Yellow', 'Gold', 'Brown', 'Grey', 'Blue', 'Purple', 'Multi'];
const SIZE_PRESETS  = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
const FABRIC_OPTIONS   = ['Pure Lawn', 'Cotton', 'Chiffon', 'Silk', 'Net', 'Linen', 'Organza', 'Karandi', 'Khaddar', 'Velvet'];
const WEAR_TYPE_OPTIONS    = ['Formal Wear', 'Casual Wear', 'Party Wear', 'Wedding Wear', 'Semi-Formal', 'Everyday Wear'];
const TROUSER_TYPE_OPTIONS = ['Trouser', 'Shalwar', 'Palazzo', 'Capri', 'Cigarette Pants', 'No Trouser'];
const PRODUCT_CAT_OPTIONS  = ['1 Piece', '2 Piece', '3 Piece', '3 Piece Stitched', 'Unstitched', 'Kurta', 'Dupatta Only'];
const DUPATTA_FAB_OPTIONS  = ['Chiffon', 'Net', 'Silk', 'Lawn', 'Cotton', 'Organza', 'No Dupatta'];
const STYLING_OPTIONS      = ['Printed', 'Embroidered', 'Printed & Patches', 'Plain', 'Block Print', 'Digital Print'];

const productEditSchema = Yup.object({
  name: Yup.string()
    .trim().min(3, 'At least 3 characters').max(100, 'Max 100 characters')
    .matches(/^[a-zA-Z0-9\s\-&'.,()/]+$/, 'Only letters, numbers and basic punctuation')
    .required('Product name is required'),
  description: Yup.string().trim().max(1000, 'Max 1000 characters').optional(),
  price: Yup.number().typeError('Must be a number').positive('Must be > 0').min(1, 'Min PKR 1').max(9999999, 'Max PKR 9,999,999').required('Price is required'),
  stock: Yup.number().typeError('Must be a number').integer('Whole number').min(0, 'Cannot be negative').max(99999, 'Max 99,999').required('Stock is required'),
  category_id: Yup.string().optional(),
  colors: Yup.array().of(Yup.string()).optional(),
  sizes: Yup.array().of(Yup.string()).optional(),
  fabric: Yup.string().optional(),
  wear_type: Yup.string().optional(),
  trouser_type: Yup.string().optional(),
  styling: Yup.string().optional(),
  product_category: Yup.string().optional(),
  dupatta_fabric: Yup.string().optional(),
  trouser_fabric: Yup.string().optional(),
});

const AdminProducts = () => {
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [imageError, setImageError] = useState('');

  // Lock body scroll when modal is open
  useScrollLock(isModalOpen);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchServices();
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
        .not('name', 'ilike', '__SYSTEM_%');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const editFormik = useFormik({
    initialValues: {
      name: '', description: '', price: '', stock: '', category_id: '',
      colors: [] as string[], sizes: [] as string[],
      fabric: '', wear_type: '', trouser_type: '', styling: '',
      product_category: '', dupatta_fabric: '', trouser_fabric: '',
      service_ids: [] as string[],
    },
    validationSchema: productEditSchema,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      setImageError('');
      if (selectedFiles.length < 2) { setImageError('Please select at least 2 images'); return; }
      if (selectedFiles.length > 5) { setImageError('Maximum 5 images allowed'); return; }

      setIsUploading(true);
      try {
        const imageUrls = await uploadMultipleImages(selectedFiles);

        if (editingProduct) {
          const { error: productError } = await supabase.from('products').update({
            name: values.name.trim(),
            description: values.description.trim(),
            price: parseFloat(values.price),
            category_id: values.category_id || null,
            stock: parseInt(values.stock),
            details: JSON.stringify({ colors: values.colors, sizes: values.sizes, fabric: values.fabric, wear_type: values.wear_type, trouser_type: values.trouser_type, styling: values.styling, product_category: values.product_category, dupatta_fabric: values.dupatta_fabric, trouser_fabric: values.trouser_fabric, service_ids: values.service_ids }),
          }).eq('id', editingProduct.id);
          if (productError) throw productError;

          const { data: oldImages } = await supabase.from('product_images').select('*').eq('product_id', editingProduct.id);
          if (oldImages) {
            for (const oldImage of oldImages) {
              const publicId = oldImage.image_url.split('/').pop()?.split('.')[0];
              if (publicId) await deleteImage(publicId);
            }
          }
          await supabase.from('product_images').delete().eq('product_id', editingProduct.id);
          for (let i = 0; i < imageUrls.length; i++) {
            await supabase.from('product_images').insert({ product_id: editingProduct.id, image_url: imageUrls[i], order_index: i });
          }
        } else {
          const { data: newProduct, error: productError } = await supabase.from('products').insert({
            name: values.name.trim(),
            description: values.description.trim(),
            price: parseFloat(values.price),
            category_id: values.category_id || null,
            stock: parseInt(values.stock),
            details: JSON.stringify({ colors: values.colors, sizes: values.sizes, fabric: values.fabric, wear_type: values.wear_type, trouser_type: values.trouser_type, styling: values.styling, product_category: values.product_category, dupatta_fabric: values.dupatta_fabric, trouser_fabric: values.trouser_fabric, service_ids: values.service_ids }),
          }).select().single();
          if (productError) throw productError;
          for (let i = 0; i < imageUrls.length; i++) {
            await supabase.from('product_images').insert({ product_id: newProduct.id, image_url: imageUrls[i], order_index: i });
          }
        }

        setIsModalOpen(false);
        setEditingProduct(null);
        setSelectedFiles([]);
        setImageError('');
        resetForm();
        fetchProducts();
      } catch (error: any) {
        console.error('Error saving product:', error);
        toast(error.message || 'Failed to save product', 'error', 'Save Failed');
      } finally {
        setIsUploading(false);
      }
    },
  });

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    let details: any = {};
    try { if ((product as any).details) details = JSON.parse((product as any).details); } catch { /* ignore */ }
    editFormik.resetForm({
      values: {
        name: product.name, description: product.description || '',
        price: product.price.toString(), category_id: product.category_id || '', stock: product.stock.toString(),
        colors: details.colors || [], sizes: details.sizes || [],
        fabric: details.fabric || '', wear_type: details.wear_type || '',
        trouser_type: details.trouser_type || '', styling: details.styling || '',
        product_category: details.product_category || '', dupatta_fabric: details.dupatta_fabric || '',
        trouser_fabric: details.trouser_fabric || '',
        service_ids: details.service_ids || [],
      },
    });
    setImageError('');
    if (product.images && product.images.length > 0) {
      const imageFiles = await Promise.all(
        product.images.map(async (img) => {
          try {
            const response = await fetch(img.image_url);
            const blob = await response.blob();
            return new File([blob], `image_${img.order_index}.jpg`, { type: 'image/jpeg' });
          } catch { return null; }
        })
      );
      setSelectedFiles(imageFiles.filter((f): f is File => f !== null));
    } else {
      setSelectedFiles([]);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? All images will also be removed. This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;

    try {
      const { data: images } = await supabase.from('product_images').select('*').eq('product_id', id);
      if (images) {
        for (const image of images) {
          const publicId = image.image_url.split('/').pop()?.split('.')[0];
          if (publicId) await deleteImage(publicId);
        }
      }
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast('Product deleted successfully.', 'success');
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast(error.message || 'Failed to delete product', 'error', 'Delete Failed');
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (serviceFilter) {
      try {
        const details = (product as any).details ? JSON.parse((product as any).details) : {};
        const ids: string[] = details.service_ids || [];
        if (!ids.includes(serviceFilter)) return false;
      } catch { return false; }
    }
    return true;
  });

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

      {/* Search + Service Filter */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 space-y-3"
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

        {/* Service tag filter pills */}
        {services.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-logo-black/50 font-sans shrink-0">Filter by service:</span>
            <button
              onClick={() => setServiceFilter('')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                serviceFilter === '' ? 'bg-action-bordeaux text-white border-action-bordeaux' : 'border-logo-rose/20 text-logo-black/60 hover:border-logo-rose/40'
              }`}
            >
              All
            </button>
            {services.map((svc) => {
              const Icon = SERVICE_ICONS[svc.icon_name];
              return (
                <button
                  key={svc.id}
                  onClick={() => setServiceFilter(serviceFilter === svc.id ? '' : svc.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    serviceFilter === svc.id
                      ? 'bg-action-bordeaux text-white border-action-bordeaux'
                      : 'border-logo-rose/20 text-logo-black/60 hover:border-logo-rose/40'
                  }`}
                >
                  {Icon && <Icon size={11} />}
                  {svc.label}
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Products Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className=" rounded-2xl overflow-hidden "
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
                        <td className="px-6 py-4 font-medium text-logo-black">PKR {product.price.toLocaleString()}</td>
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
            <div className="md:hidden space-y-3">
              {filteredProducts.map((product) => {
                const category = categories.find((c) => c.id === product.category_id);
                return (
                  <div key={product.id} className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-4 flex items-start gap-4">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-20 h-20 object-cover rounded-xl shrink-0" />
                    ) : (
                      <div className="w-20 h-20 bg-bg-silk-glow rounded-xl flex items-center justify-center shrink-0"><FiImage className="text-logo-black/40" size={24} /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-logo-black truncate">{product.name}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs font-bold text-action-bordeaux">PKR {product.price.toLocaleString()}</span>
                        <span className="text-xs text-logo-black/50">Stock: {product.stock}</span>
                      </div>
                      {category && <span className="inline-block mt-2 text-xs bg-logo-rose/10 text-logo-rose px-2.5 py-1 rounded-full">{category.name}</span>}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => handleEdit(product)} className="p-2.5 text-logo-rose hover:bg-logo-rose/10 rounded-xl transition-colors"><FiEdit2 size={16} /></button>
                      <button onClick={() => handleDelete(product.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><FiTrash2 size={16} /></button>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto" onClick={() => setIsModalOpen(false)}>
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl p-5 md:p-6 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-2xl text-logo-black mb-4">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <form onSubmit={editFormik.handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-logo-black mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  maxLength={100}
                  value={editFormik.values.name}
                  onChange={editFormik.handleChange}
                  onBlur={editFormik.handleBlur}
                  placeholder="Enter product name"
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-logo-rose/20 text-sm ${editFormik.touched.name && editFormik.errors.name ? 'border-red-400' : 'border-logo-rose/20 focus:border-logo-rose'}`}
                />
                <div className="flex justify-between mt-0.5 h-4">
                  <span className="text-xs text-red-500">{editFormik.touched.name && editFormik.errors.name ? editFormik.errors.name : ''}</span>
                  <span className="text-[10px] text-logo-black/30">{editFormik.values.name.length}/100</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-logo-black mb-1">Description</label>
                <textarea
                  name="description"
                  maxLength={1000}
                  value={editFormik.values.description}
                  onChange={editFormik.handleChange}
                  onBlur={editFormik.handleBlur}
                  rows={3}
                  placeholder="Describe the product..."
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-logo-rose/20 text-sm resize-none ${editFormik.touched.description && editFormik.errors.description ? 'border-red-400' : 'border-logo-rose/20 focus:border-logo-rose'}`}
                />
                <div className="flex justify-between mt-0.5 h-4">
                  <span className="text-xs text-red-500">{editFormik.touched.description && editFormik.errors.description ? editFormik.errors.description : ''}</span>
                  <span className="text-[10px] text-logo-black/30">{editFormik.values.description.length}/1000</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Price PKR */}
                <div>
                  <label className="block text-sm font-medium text-logo-black mb-1">Price (PKR) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-logo-black/50 text-xs font-semibold select-none">PKR</span>
                    <input
                      type="number"
                      name="price"
                      step="1"
                      min="1"
                      max="9999999"
                      value={editFormik.values.price}
                      onChange={editFormik.handleChange}
                      onBlur={editFormik.handleBlur}
                      placeholder="0"
                      className={`w-full pl-12 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-logo-rose/20 text-sm ${editFormik.touched.price && editFormik.errors.price ? 'border-red-400' : 'border-logo-rose/20 focus:border-logo-rose'}`}
                    />
                  </div>
                  <div className="h-4 mt-0.5"><span className="text-xs text-red-500">{editFormik.touched.price && editFormik.errors.price ? editFormik.errors.price : ''}</span></div>
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-sm font-medium text-logo-black mb-1">Stock *</label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    max="99999"
                    value={editFormik.values.stock}
                    onChange={editFormik.handleChange}
                    onBlur={editFormik.handleBlur}
                    placeholder="0"
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-logo-rose/20 text-sm ${editFormik.touched.stock && editFormik.errors.stock ? 'border-red-400' : 'border-logo-rose/20 focus:border-logo-rose'}`}
                  />
                  <div className="h-4 mt-0.5"><span className="text-xs text-red-500">{editFormik.touched.stock && editFormik.errors.stock ? editFormik.errors.stock : ''}</span></div>
                </div>
              </div>

              {/* Category */}
              <CustomSelect
                label="Category"
                options={categories.map((c) => c.name)}
                value={categories.find((c) => c.id === editFormik.values.category_id)?.name || ''}
                onChange={(name) => {
                  const cat = categories.find((c) => c.name === name);
                  editFormik.setFieldValue('category_id', cat?.id || '');
                }}
                placeholder="No Category"
                allowCustom={false}
              />

              {/* Colors */}
              <MultiTagInput
                label="Available Colors"
                presets={COLOR_PRESETS}
                values={editFormik.values.colors}
                onChange={(v) => editFormik.setFieldValue('colors', v)}
                placeholder="Type custom color & press Enter…"
              />

              {/* Sizes */}
              <MultiTagInput
                label="Available Sizes"
                presets={SIZE_PRESETS}
                values={editFormik.values.sizes}
                onChange={(v) => editFormik.setFieldValue('sizes', v)}
                placeholder="Type custom size & press Enter…"
              />

              {/* Product detail custom dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'fabric', label: 'Fabric', options: FABRIC_OPTIONS },
                  { name: 'wear_type', label: 'Wear Type', options: WEAR_TYPE_OPTIONS },
                  { name: 'trouser_type', label: 'Trouser Type', options: TROUSER_TYPE_OPTIONS },
                  { name: 'styling', label: 'Styling', options: STYLING_OPTIONS },
                  { name: 'product_category', label: 'Product Category', options: PRODUCT_CAT_OPTIONS },
                  { name: 'dupatta_fabric', label: 'Dupatta Fabric', options: DUPATTA_FAB_OPTIONS },
                  { name: 'trouser_fabric', label: 'Trouser Fabric', options: FABRIC_OPTIONS },
                ].map(({ name, label, options }) => (
                  <CustomSelect
                    key={name}
                    label={label}
                    options={options}
                    value={(editFormik.values as any)[name]}
                    onChange={(v) => editFormik.setFieldValue(name, v)}
                    allowCustom
                  />
                ))}
              </div>

              {/* Service Badges */}
              {services.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-logo-black mb-2">Service Badges</label>
                  <div className="grid grid-cols-2 gap-2">
                    {services.map((svc) => {
                      const Icon = SERVICE_ICONS[svc.icon_name];
                      const selected = editFormik.values.service_ids.includes(svc.id);
                      return (
                        <button key={svc.id} type="button"
                          onClick={() => {
                            const ids = editFormik.values.service_ids;
                            editFormik.setFieldValue('service_ids',
                              selected ? ids.filter((x) => x !== svc.id) : [...ids, svc.id]
                            );
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all cursor-pointer text-xs font-semibold ${
                            selected
                              ? 'border-action-bordeaux bg-action-bordeaux/8 text-action-bordeaux'
                              : 'border-logo-rose/15 text-logo-black/60 hover:border-logo-rose/40'
                          }`}
                        >
                          {Icon && <Icon size={13} className="shrink-0" />}
                          <span className="truncate flex-1">{svc.label}</span>
                          {selected && <FiCheck size={11} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-logo-black mb-1">Product Images (2–5 required)</label>
                <div className="border-2 border-dashed border-logo-rose/20 rounded-xl p-4">
                  <input type="file" multiple accept="image/*" onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length + selectedFiles.length > 5) { setImageError('Maximum 5 images allowed'); return; }
                    setImageError('');
                    setSelectedFiles([...selectedFiles, ...files]);
                  }} className="hidden" id="image-upload" />
                  <label htmlFor="image-upload" className="flex flex-col items-center justify-center cursor-pointer py-4">
                    <FiImage className="text-logo-black/40" size={32} />
                    <p className="text-sm text-logo-black/60 mt-2">Click to upload or drag and drop</p>
                    <p className="text-xs text-logo-black/40 mt-1">PNG, JPG, WEBP (Max 5 images)</p>
                  </label>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} className="w-full h-20 object-cover rounded-lg" />
                        <button type="button" onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 cursor-pointer">
                          <FiX size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imageError && <p className="text-xs text-red-500 mt-1">{imageError}</p>}
                <p className="text-xs text-logo-black/60 mt-1">{selectedFiles.length}/5 images selected</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); editFormik.resetForm(); setImageError(''); }}
                  className="flex-1 py-2 border border-logo-rose/20 rounded-xl hover:bg-logo-rose/10 transition-colors text-sm cursor-pointer">Cancel</button>
                <button type="submit" disabled={isUploading}
                  className="flex-1 py-2 bg-action-bordeaux text-white rounded-xl hover:bg-logo-black transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
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
