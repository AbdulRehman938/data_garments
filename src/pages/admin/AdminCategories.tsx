import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiImage, FiX, FiStar, FiCheck } from 'react-icons/fi';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../utils/supabase';
import { uploadImage } from '../../utils/cloudinary';
import { useToast } from '../../components/common/Toast';

const SYSTEM_SETTINGS_KEY = '__SYSTEM_SETTINGS__';

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

const AdminCategories = () => {
  const { toast, confirm } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');

  const categorySchema = Yup.object({
    name: Yup.string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters')
      .matches(/^[a-zA-Z0-9\s&'-]+$/, 'Only letters, numbers and basic punctuation allowed')
      .required('Category name is required'),
    description: Yup.string()
      .trim()
      .max(300, 'Description cannot exceed 300 characters')
      .optional(),
  });

  // Featured categories panel state
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [lowStockThresholds, setLowStockThresholds] = useState<Record<string, number>>({});
  const [savingFeatured, setSavingFeatured] = useState(false);
  const [featuredSaved, setFeaturedSaved] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchFeaturedSettings();
  }, [currentPage, itemsPerPage]);

  const fetchCategories = async () => {
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      const { data, error, count } = await supabase
        .from('categories')
        .select('*', { count: 'exact' })
        .not('name', 'ilike', '__SYSTEM_%')
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      setCategories(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeaturedSettings = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('description')
        .eq('name', SYSTEM_SETTINGS_KEY)
        .maybeSingle();

      if (data?.description) {
        try {
          const parsed = JSON.parse(data.description);
          setFeaturedIds(Array.isArray(parsed.featured) ? parsed.featured : []);
          setLowStockThresholds(parsed.lowStockThresholds || {});
        } catch {
          setFeaturedIds([]);
          setLowStockThresholds({});
        }
      }
    } catch (error) {
      console.error('Error fetching featured settings:', error);
    }
  };

  const handleSaveFeatured = async () => {
    setSavingFeatured(true);
    try {
      const settingsJson = JSON.stringify({ 
        featured: featuredIds,
        lowStockThresholds
      });
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('name', SYSTEM_SETTINGS_KEY)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('categories')
          .update({ description: settingsJson })
          .eq('id', existing.id);
      } else {
        await supabase.from('categories').insert({
          name: SYSTEM_SETTINGS_KEY,
          description: settingsJson,
          image_url: null,
        });
      }

      setFeaturedSaved(true);
      setTimeout(() => setFeaturedSaved(false), 2500);
    } catch (error) {
      console.error('Error saving featured settings:', error);
    } finally {
      setSavingFeatured(false);
    }
  };

  const toggleFeatured = (id: string) => {
    setFeaturedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) return prev; // max 5 categories
      return [...prev, id];
    });
  };

  const formik = useFormik({
    initialValues: { name: '', description: '' },
    validationSchema: categorySchema,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      setIsUploading(true);
      try {
        let imageUrl = imagePreviewUrl;
        if (selectedFile) {
          imageUrl = await uploadImage(selectedFile, 'categories');
        }
        if (editingCategory) {
          const { error } = await supabase.from('categories').update({
            name: values.name.trim(),
            description: values.description.trim(),
            image_url: imageUrl,
          }).eq('id', editingCategory.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('categories').insert({
            name: values.name.trim(),
            description: values.description.trim(),
            image_url: imageUrl,
          });
          if (error) throw error;
        }
        setIsModalOpen(false);
        setEditingCategory(null);
        resetForm();
        setSelectedFile(null);
        setImagePreviewUrl('');
        fetchCategories();
      } catch (error: any) {
        console.error('Error saving category:', error);
        toast(error.message || 'Failed to save category', 'error', 'Save Failed');
      } finally {
        setIsLoading(false);
        setIsUploading(false);
      }
    },
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    formik.setValues({
      name: category.name,
      description: category.description || '',
    });
    formik.resetForm({ values: { name: category.name, description: category.description || '' } });
    setSelectedFile(null);
    setImagePreviewUrl(category.image_url || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setFeaturedIds((prev) => prev.filter((x) => x !== id));
      toast('Category deleted successfully.', 'success');
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast(error.message || 'Failed to delete category', 'error', 'Delete Failed');
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* ──────────── Homepage Featured Collections Panel ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-logo-rose/10 bg-bg-silk-glow/30">
          <div className="flex items-center gap-2">
            <FiStar size={16} className="text-luxury-gold" />
            <h2 className="font-serif text-lg text-logo-black">Homepage Featured Collections</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium ${featuredIds.length >= 5 ? 'text-pop-orchid font-bold' : 'text-logo-black/50'}`}>
              {featuredIds.length}/5 selected
            </span>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveFeatured}
              disabled={savingFeatured}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                featuredSaved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-action-bordeaux hover:bg-logo-black text-white disabled:opacity-60'
              }`}
            >
              {featuredSaved ? <><FiCheck size={15} /> Saved!</> : savingFeatured ? 'Saving...' : 'Save Selection'}
            </motion.button>
          </div>
        </div>
        <p className="text-xs text-logo-black/50 px-6 pt-3 pb-1">
          Select up to <strong>5 categories</strong> to display on the public homepage. Click a tile to toggle.
        </p>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const isSelected = featuredIds.includes(cat.id);
            const isDisabled = !isSelected && featuredIds.length >= 5;
            return (
              <button
                key={cat.id}
                onClick={() => !isDisabled && toggleFeatured(cat.id)}
                className={`relative rounded-xl overflow-hidden aspect-[4/3] border-2 transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'border-action-bordeaux ring-2 ring-action-bordeaux/20 shadow-md'
                    : isDisabled
                    ? 'border-logo-rose/10 opacity-40 cursor-not-allowed'
                    : 'border-logo-rose/10 hover:border-logo-rose/40'
                }`}
              >
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-logo-rose to-action-bordeaux flex items-center justify-center">
                    <span className="text-white font-serif text-2xl font-bold">{cat.name.charAt(0)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 right-2 text-white text-xs font-bold truncate font-sans">
                  {cat.name}
                </span>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-action-bordeaux rounded-full flex items-center justify-center shadow-md">
                    <FiCheck size={12} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
          {categories.length === 0 && (
            <p className="col-span-full text-sm text-logo-black/50 py-4 text-center">
              Add categories first to configure homepage display.
            </p>
          )}
        </div>
      </motion.div>

      {/* ──────────── Category List Manager ──────────── */}
      <div>
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="font-serif text-2xl md:text-3xl text-logo-black">All Categories</h1>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { setEditingCategory(null); formik.resetForm(); setSelectedFile(null); setImagePreviewUrl(''); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-action-bordeaux text-white rounded-xl font-medium text-sm hover:bg-logo-black transition-colors cursor-pointer"
          >
            <FiPlus size={18} /> Add Category
          </motion.button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40" size={20} />
            <input type="text" placeholder="Search categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20" />
          </div>
        </div>

        {/* Table / Cards */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-logo-rose/20">
          {isLoading ? (
            <div className="p-8 text-center text-logo-black/60">Loading...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-logo-black/60">{searchQuery ? 'No categories found' : 'No categories yet'}</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-bg-silk-glow">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Image</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Low Stock Threshold</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Description</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Featured</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Created</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-logo-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((category) => (
                      <tr key={category.id} className="border-t border-logo-rose/10 hover:bg-logo-rose/5">
                        <td className="px-6 py-4">
                          {category.image_url ? (
                            <img src={category.image_url} alt={category.name} className="w-12 h-12 object-cover rounded-lg" />
                          ) : (
                            <div className="w-12 h-12 bg-bg-silk-glow rounded-lg flex items-center justify-center">
                              <FiImage className="text-logo-black/40" size={20} />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-logo-black">{category.name}</td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="0"
                            value={lowStockThresholds[category.id] ?? 5}
                            onChange={(e) => {
                              setLowStockThresholds(prev => ({
                                ...prev,
                                [category.id]: Math.max(0, parseInt(e.target.value) || 0)
                              }));
                            }}
                            className="w-20 px-2 py-1 border border-logo-rose/20 rounded-lg text-sm focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20"
                          />
                        </td>
                        <td className="px-6 py-4 text-logo-black/60 max-w-xs truncate">{category.description || '-'}</td>
                        <td className="px-6 py-4">
                          {featuredIds.includes(category.id) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-luxury-gold bg-luxury-gold/10 rounded-full">
                              <FiStar size={10} /> Featured
                            </span>
                          ) : (
                            <span className="text-xs text-logo-black/30">–</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-logo-black/60">{new Date(category.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEdit(category)} className="p-2 text-logo-rose hover:bg-logo-rose/10 rounded-lg transition-colors"><FiEdit2 size={18} /></button>
                            <button onClick={() => handleDelete(category.id)} className="p-2 text-logo-rose hover:bg-logo-rose/10 rounded-lg transition-colors"><FiTrash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Layout */}
              <div className="md:hidden divide-y divide-logo-rose/10">
                {filteredCategories.map((category) => (
                  <div key={category.id} className="p-4 flex items-start gap-3">
                    {category.image_url ? (
                      <img src={category.image_url} alt={category.name} className="w-16 h-16 object-cover rounded-xl shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-bg-silk-glow rounded-xl flex items-center justify-center shrink-0">
                        <FiImage className="text-logo-black/40" size={20} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-logo-black">{category.name}</p>
                        {featuredIds.includes(category.id) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-luxury-gold bg-luxury-gold/10 rounded-full">
                            <FiStar size={9} /> Featured
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-logo-black/50 font-semibold">Low Stock Threshold:</span>
                        <input
                          type="number"
                          min="0"
                          value={lowStockThresholds[category.id] ?? 5}
                          onChange={(e) => {
                            setLowStockThresholds(prev => ({
                              ...prev,
                              [category.id]: Math.max(0, parseInt(e.target.value) || 0)
                            }));
                          }}
                          className="w-16 px-2 py-1 border border-logo-rose/20 rounded-lg text-sm focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20"
                        />
                      </div>
                      {category.description && <p className="text-sm text-logo-black/60 mt-0.5 line-clamp-2">{category.description}</p>}
                      <p className="text-xs text-logo-black/40 mt-1">{new Date(category.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleEdit(category)} className="p-2 text-logo-rose hover:bg-logo-rose/10 rounded-lg transition-colors"><FiEdit2 size={16} /></button>
                      <button onClick={() => handleDelete(category.id)} className="p-2 text-logo-rose hover:bg-logo-rose/10 rounded-lg transition-colors"><FiTrash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalCount > itemsPerPage && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-6 py-4 border-t border-logo-rose/10">
                  <p className="text-xs md:text-sm text-logo-black/60">Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-sm border border-logo-rose/20 rounded-lg hover:bg-logo-rose/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
                    <span className="px-3 py-1.5 text-sm font-medium text-logo-black">{currentPage} / {Math.ceil(totalCount / itemsPerPage)}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))} disabled={currentPage === Math.ceil(totalCount / itemsPerPage)} className="px-3 py-1.5 text-sm border border-logo-rose/20 rounded-lg hover:bg-logo-rose/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl p-5 md:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
            >
              <h2 className="font-serif text-xl md:text-2xl text-logo-black mb-4">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <form onSubmit={formik.handleSubmit} className="space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-logo-black mb-1">Category Image</label>
                  <div className="relative">
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setSelectedFile(file); setImagePreviewUrl(URL.createObjectURL(file)); }
                    }} className="hidden" id="category-image" />
                    <label htmlFor="category-image" className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-logo-rose/30 rounded-xl hover:border-logo-rose hover:bg-logo-rose/5 transition-all cursor-pointer">
                      <FiImage size={20} className="text-logo-rose" />
                      <span className="text-sm text-logo-black/70">{selectedFile ? selectedFile.name : (imagePreviewUrl ? 'Change image' : 'Upload image')}</span>
                    </label>
                    {(selectedFile || imagePreviewUrl) && (
                      <button type="button" onClick={() => { setSelectedFile(null); setImagePreviewUrl(''); }} className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors cursor-pointer">
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                  {imagePreviewUrl && (
                    <div className="mt-3">
                      <img src={imagePreviewUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-logo-black mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    maxLength={50}
                    placeholder="e.g. Summer Collection"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-logo-rose/20 text-sm ${formik.touched.name && formik.errors.name ? 'border-red-400 focus:border-red-400' : 'border-logo-rose/20 focus:border-logo-rose'}`}
                  />
                  <div className="flex justify-between items-center mt-0.5 h-4">
                    <span className="text-xs text-red-500 font-sans">{formik.touched.name && formik.errors.name ? formik.errors.name : ''}</span>
                    <span className="text-[10px] text-logo-black/30 font-sans">{formik.values.name.length}/50</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-logo-black mb-1">Description</label>
                  <textarea
                    name="description"
                    maxLength={300}
                    rows={3}
                    placeholder="Brief description of this category..."
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-logo-rose/20 text-sm resize-none ${formik.touched.description && formik.errors.description ? 'border-red-400 focus:border-red-400' : 'border-logo-rose/20 focus:border-logo-rose'}`}
                  />
                  <div className="flex justify-between items-center mt-0.5 h-4">
                    <span className="text-xs text-red-500 font-sans">{formik.touched.description && formik.errors.description ? formik.errors.description : ''}</span>
                    <span className="text-[10px] text-logo-black/30 font-sans">{formik.values.description.length}/300</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setIsModalOpen(false); formik.resetForm(); setImagePreviewUrl(''); setSelectedFile(null); }}
                    className="flex-1 py-2.5 border border-logo-rose/20 rounded-xl hover:bg-logo-rose/10 transition-colors text-sm font-medium cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isUploading || !formik.isValid}
                    className="flex-1 py-2.5 bg-action-bordeaux text-white rounded-xl hover:bg-logo-black transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {isUploading ? 'Uploading...' : (editingCategory ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCategories;
