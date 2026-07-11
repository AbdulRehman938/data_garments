import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiImage, FiX, FiPlus, FiMinus, FiCheck } from 'react-icons/fi';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../utils/supabase';
import { uploadMultipleImages } from '../../utils/cloudinary';
import { useToast } from '../../components/common/Toast';
import { CustomSelect, MultiTagInput } from '../../components/common/CustomSelect';
import { SERVICE_ICONS, type Service } from './AdminServices';

interface Category {
  id: string;
  name: string;
}

/* ─── Preset options ─── */
const COLOR_PRESETS = ['White', 'Black', 'Red', 'Pink', 'Beige', 'Navy', 'Green', 'Yellow', 'Gold', 'Brown', 'Grey', 'Blue', 'Purple', 'Multi'];
const SIZE_PRESETS  = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
const FABRIC_OPTIONS  = ['Pure Lawn', 'Cotton', 'Chiffon', 'Silk', 'Net', 'Linen', 'Organza', 'Karandi', 'Khaddar', 'Velvet'];
const WEAR_TYPE_OPTIONS   = ['Formal Wear', 'Casual Wear', 'Party Wear', 'Wedding Wear', 'Semi-Formal', 'Everyday Wear'];
const TROUSER_TYPE_OPTIONS = ['Trouser', 'Shalwar', 'Palazzo', 'Capri', 'Cigarette Pants', 'No Trouser'];
const PRODUCT_CAT_OPTIONS  = ['1 Piece', '2 Piece', '3 Piece', '3 Piece Stitched', 'Unstitched', 'Kurta', 'Dupatta Only'];
const DUPATTA_FAB_OPTIONS  = ['Chiffon', 'Net', 'Silk', 'Lawn', 'Cotton', 'Organza', 'No Dupatta'];
const STYLING_OPTIONS      = ['Printed', 'Embroidered', 'Printed & Patches', 'Plain', 'Block Print', 'Digital Print'];

const productSchema = Yup.object({
  name: Yup.string()
    .trim().min(3, 'At least 3 characters').max(100, 'Max 100 characters')
    .matches(/^[a-zA-Z0-9\s\-&'.,()/]+$/, 'Only letters, numbers and basic punctuation').required('Required'),
  description: Yup.string().trim().min(20, 'At least 20 characters').max(1000, 'Max 1000 characters').optional(),
  price: Yup.number().typeError('Must be a number').positive('Must be > 0').min(1, 'Min PKR 1').max(9999999, 'Max PKR 9,999,999').required('Required'),
  original_price: Yup.number().typeError('Must be a number').positive('Must be > 0').min(1, 'Min PKR 1').max(9999999, 'Max PKR 9,999,999').optional().test('greater-than-price', 'Original price must be higher than discounted price', function(value) {
    return !value || value > this.parent.price;
  }),
  stock: Yup.number().typeError('Must be a number').integer('Whole number').min(0, 'Cannot be negative').max(99999, 'Max 99,999').required('Required'),
  category_id: Yup.string().required('Please select a category'),
  // product detail fields
  colors: Yup.array().of(Yup.string()).min(1, 'Select at least one color'),
  sizes: Yup.array().of(Yup.string()).min(1, 'Select at least one size'),
  fabric: Yup.string().optional(),
  wear_type: Yup.string().optional(),
  trouser_type: Yup.string().optional(),
  styling: Yup.string().optional(),
  product_category: Yup.string().optional(),
  dupatta_fabric: Yup.string().optional(),
  trouser_fabric: Yup.string().optional(),
});

const AdminAddProduct = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState('');

  useEffect(() => { fetchCategories(); fetchServices(); }, []);

  useEffect(() => {
    // Auto-select the first active service as default
    const activeServices = services.filter(s => s.is_active);
    if (activeServices.length > 0 && formik.values.service_ids.length === 0) {
      formik.setFieldValue('service_ids', [activeServices[0].id]);
    }
  }, [services]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('id, name').not('name', 'ilike', '__SYSTEM_%');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) { console.error(error); }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase.from('services').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      setServices(data || []);
    } catch (error) { console.error(error); }
  };

  const formik = useFormik({
    initialValues: {
      name: '', description: '', price: '', original_price: '', stock: '', category_id: '',
      colors: [] as string[], sizes: [] as string[],
      fabric: '', wear_type: '', trouser_type: '', styling: '',
      product_category: '', dupatta_fabric: '', trouser_fabric: '',
      service_ids: [] as string[],
    },
    validationSchema: productSchema,
    onSubmit: async (values) => {
      setImageError('');
      if (selectedFiles.length < 2) { setImageError('Please select at least 2 images'); return; }
      if (selectedFiles.length > 5) { setImageError('Maximum 5 images allowed'); return; }
      setIsUploading(true);
      try {
        const imageUrls = await uploadMultipleImages(selectedFiles);
        if (!imageUrls || imageUrls.length === 0) throw new Error('Image upload failed');

        const details = {
          colors: values.colors,
          sizes: values.sizes,
          fabric: values.fabric,
          wear_type: values.wear_type,
          trouser_type: values.trouser_type,
          styling: values.styling,
          product_category: values.product_category,
          dupatta_fabric: values.dupatta_fabric,
          trouser_fabric: values.trouser_fabric,
          service_ids: values.service_ids,
        };

        const { data: newProduct, error: productError } = await supabase.from('products').insert({
          name: values.name.trim(), description: values.description.trim(),
          price: parseFloat(values.price), 
          original_price: values.original_price ? parseFloat(values.original_price) : null,
          category_id: values.category_id || null,
          stock: parseInt(values.stock), image_url: imageUrls[0],
          details: JSON.stringify(details),
        }).select().single();

        if (productError) throw productError;

        for (let i = 0; i < imageUrls.length; i++) {
          await supabase.from('product_images').insert({ product_id: newProduct.id, image_url: imageUrls[i], order_index: i });
        }
        navigate('/admin/products');
      } catch (error: any) {
        toast(error.message || 'Failed to save product', 'error', 'Save Failed');
      } finally { setIsUploading(false); }
    },
  });

  const fErr = (f: string) => (formik.touched as any)[f] && (formik.errors as any)[f] ? (formik.errors as any)[f] : '';
  const inputCls = (f: string) => `w-full px-4 py-3 bg-bg-silk-glow/20 border rounded-xl focus:outline-none focus:ring-2 focus:ring-logo-rose/10 text-sm ${fErr(f) ? 'border-red-400' : 'border-logo-rose/20 focus:border-logo-rose'}`;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <Link to="/admin/products" className="inline-flex items-center gap-2 text-logo-rose hover:text-action-bordeaux transition-colors font-medium text-sm">
          <FiArrowLeft size={16} /> Back to Products List
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 md:p-10 border border-logo-rose/10 shadow-[0_10px_30px_rgba(210,150,158,0.06)]">
        <h1 className="font-serif text-2xl md:text-3xl text-logo-black mb-6 border-b border-logo-rose/10 pb-4">Add New Product</h1>

        <form onSubmit={formik.handleSubmit} className="space-y-8">

          {/* ── Section: Basic Info ── */}
          <div className="space-y-1">
            <h2 className="font-serif text-lg text-logo-black border-b border-logo-rose/8 pb-2 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-logo-black mb-1.5">Product Name *</label>
                <input type="text" name="name" maxLength={100} placeholder="Enter product title"
                  value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur}
                  className={inputCls('name')} />
                <div className="flex justify-between h-4 mt-0.5">
                  <span className="text-xs text-red-500">{fErr('name')}</span>
                  <span className="text-[10px] text-logo-black/30">{formik.values.name.length}/100</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-logo-black mb-1.5">Discounted Price (PKR) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/50 text-sm font-semibold select-none">PKR</span>
                  <input type="number" name="price" step="1" min="1" max="9999999" placeholder="0"
                    value={formik.values.price} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    className={`${inputCls('price')} pl-14`} />
                </div>
                <div className="h-4 mt-0.5"><span className="text-xs text-red-500">{fErr('price')}</span></div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-logo-black mb-1.5">Original Price (PKR) <span className="text-xs text-logo-black/50 font-normal">(optional, for strikethrough)</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/50 text-sm font-semibold select-none">PKR</span>
                  <input type="number" name="original_price" step="1" min="1" max="9999999" placeholder="Leave empty for no discount"
                    value={formik.values.original_price} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    className={`${inputCls('original_price')} pl-14`} />
                </div>
                <div className="h-4 mt-0.5"><span className="text-xs text-red-500">{fErr('original_price')}</span></div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-logo-black mb-1.5">Stock Quantity *</label>
                <input type="number" name="stock" min="0" max="99999" placeholder="0"
                  value={formik.values.stock} onChange={formik.handleChange} onBlur={formik.handleBlur}
                  className={inputCls('stock')} />
                <div className="h-4 mt-0.5"><span className="text-xs text-red-500">{fErr('stock')}</span></div>
              </div>

              <div className="md:col-span-2">
                <CustomSelect
                  label="Category *"
                  options={categories.map((c) => c.name)}
                  value={categories.find((c) => c.id === formik.values.category_id)?.name || ''}
                  onChange={(name) => {
                    const cat = categories.find((c) => c.name === name);
                    formik.setFieldValue('category_id', cat?.id || '');
                  }}
                  placeholder="Select a category"
                  allowCustom={false}
                  error={fErr('category_id')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-logo-black mb-1.5">Description</label>
                <textarea name="description" rows={4} maxLength={1000}
                  placeholder="Describe craftsmanship, fit, fabric and features..."
                  value={formik.values.description} onChange={formik.handleChange} onBlur={formik.handleBlur}
                  className={`${inputCls('description')} resize-none leading-relaxed`} />
                <div className="flex justify-between h-4 mt-0.5">
                  <span className="text-xs text-red-500">{fErr('description')}</span>
                  <span className="text-[10px] text-logo-black/30">{formik.values.description.length}/1000</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Colors & Sizes ── */}
          <div className="space-y-1">
            <h2 className="font-serif text-lg text-logo-black border-b border-logo-rose/8 pb-2 mb-4">Colors & Sizes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MultiTagInput
                label="Available Colors *"
                presets={COLOR_PRESETS}
                values={formik.values.colors}
                onChange={(v) => formik.setFieldValue('colors', v)}
                error={fErr('colors')}
                placeholder="Type custom color & press Enter…"
              />
              <MultiTagInput
                label="Available Sizes *"
                presets={SIZE_PRESETS}
                values={formik.values.sizes}
                onChange={(v) => formik.setFieldValue('sizes', v)}
                error={fErr('sizes')}
                placeholder="Type custom size & press Enter…"
              />
            </div>
          </div>

          {/* ── Section: Product Details ── */}
          <div className="space-y-1">
            <h2 className="font-serif text-lg text-logo-black border-b border-logo-rose/8 pb-2 mb-4">Product Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                  value={(formik.values as any)[name]}
                  onChange={(v) => formik.setFieldValue(name, v)}
                  allowCustom
                />
              ))}
            </div>
          </div>

          {/* ── Section: Quantity display (informational) ── */}
          <div className="space-y-1">
            <h2 className="font-serif text-lg text-logo-black border-b border-logo-rose/8 pb-2 mb-4">Stock Preview</h2>
            <div className="flex items-center gap-4 bg-bg-silk-glow/40 rounded-2xl p-4 border border-logo-rose/10">
              <button type="button" onClick={() => formik.setFieldValue('stock', Math.max(0, parseInt(formik.values.stock || '0') - 1))}
                className="w-9 h-9 rounded-full border border-logo-rose/20 flex items-center justify-center hover:bg-logo-rose/10 transition-colors cursor-pointer">
                <FiMinus size={14} />
              </button>
              <div className="text-center">
                <span className="font-serif text-3xl font-bold text-logo-black">{formik.values.stock || '0'}</span>
                <p className="text-xs text-logo-black/40 font-sans mt-0.5">units in stock</p>
              </div>
              <button type="button" onClick={() => formik.setFieldValue('stock', parseInt(formik.values.stock || '0') + 1)}
                className="w-9 h-9 rounded-full border border-logo-rose/20 flex items-center justify-center hover:bg-logo-rose/10 transition-colors cursor-pointer">
                <FiPlus size={14} />
              </button>
            </div>
          </div>

          {/* ── Section: Service Badges ── */}
          <div className="space-y-1">
            <h2 className="font-serif text-lg text-logo-black border-b border-logo-rose/8 pb-2 mb-1">Service Badges</h2>
            <p className="text-xs text-logo-black/50 mb-3 font-sans">Select which service/delivery badges to show on this product's page.</p>
            {services.length === 0 ? (
              <p className="text-xs text-logo-black/40 italic font-sans">No service badges created yet. Add them in Admin → Services.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {services.map((svc) => {
                  const Icon = SERVICE_ICONS[svc.icon_name] ?? FiCheck;
                  const selected = formik.values.service_ids.includes(svc.id);
                  return (
                    <button key={svc.id} type="button"
                      onClick={() => {
                        const ids = formik.values.service_ids;
                        formik.setFieldValue('service_ids',
                          selected ? ids.filter((x) => x !== svc.id) : [...ids, svc.id]
                        );
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all cursor-pointer text-xs font-semibold ${
                        selected
                          ? 'border-action-bordeaux bg-action-bordeaux/8 text-action-bordeaux'
                          : 'border-logo-rose/15 text-logo-black/60 hover:border-logo-rose/40'
                      }`}
                    >
                      <Icon size={14} className="shrink-0" />
                      <span className="truncate">{svc.label}</span>
                      {selected && <FiCheck size={11} className="ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Section: Images ── */}
          <div>
            <h2 className="font-serif text-lg text-logo-black border-b border-logo-rose/8 pb-2 mb-4">Product Gallery *</h2>
            <p className="text-xs text-logo-black/50 mb-3">Upload 2 to 5 images. First image will act as cover.</p>
            <div className="border-2 border-dashed border-logo-rose/20 rounded-2xl p-6 bg-bg-silk-glow/10 hover:bg-logo-rose/5 transition-all">
              <input type="file" multiple accept="image/*" onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length + selectedFiles.length > 5) { setImageError('Maximum 5 images allowed'); return; }
                setImageError(''); setSelectedFiles([...selectedFiles, ...files]);
              }} className="hidden" id="image-upload-page" />
              <label htmlFor="image-upload-page" className="flex flex-col items-center justify-center cursor-pointer py-6">
                <FiImage className="text-logo-rose mb-3" size={40} />
                <p className="text-sm font-bold text-logo-black">Click to upload photos</p>
                <p className="text-xs text-logo-black/40 mt-1">PNG, JPG, WEBP (Max 5 images)</p>
              </label>
            </div>
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative aspect-[4/5] bg-bg-silk-glow rounded-xl overflow-hidden border border-logo-rose/10 shadow-sm">
                    <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    {index === 0 && <span className="absolute bottom-1 left-1 bg-action-bordeaux text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">Cover</span>}
                    <button type="button" onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer">
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imageError && <p className="text-xs text-red-500 mt-2">{imageError}</p>}
            <p className="text-xs text-logo-black/50 mt-2">{selectedFiles.length} of 5 selected (minimum 2 required)</p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-logo-rose/10">
            <button type="button" onClick={() => navigate('/admin/products')}
              className="flex-1 py-3 border border-logo-rose/20 rounded-full hover:bg-logo-rose/5 text-sm font-bold text-logo-black cursor-pointer uppercase tracking-widest text-center transition-all">
              Cancel
            </button>
            <button type="submit" disabled={isUploading}
              className="flex-1 py-3 bg-action-bordeaux text-white rounded-full hover:bg-[#460416] text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-widest text-center shadow-md hover:shadow-lg transition-all">
              {isUploading ? 'Uploading & Creating...' : 'Save Product'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminAddProduct;
