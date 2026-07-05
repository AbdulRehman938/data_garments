import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { supabase } from '../../utils/supabase';

interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => { fetchCategories(); }, [currentPage, itemsPerPage]);

  const fetchCategories = async () => {
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      const { data, error, count } = await supabase
        .from('categories')
        .select('*', { count: 'exact' })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingCategory) {
        const { error } = await supabase.from('categories').update({ name: formData.name, description: formData.description }).eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert({ name: formData.name, description: formData.description });
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
      fetchCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      alert(error.message || 'Failed to save category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      alert(error.message || 'Failed to delete category');
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-logo-black">Categories</h1>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => { setEditingCategory(null); setFormData({ name: '', description: '' }); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-action-bordeaux text-white rounded-xl font-medium text-sm hover:bg-logo-black transition-colors"
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Description</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-logo-black">Created</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-logo-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => (
                    <tr key={category.id} className="border-t border-logo-rose/10 hover:bg-logo-rose/5">
                      <td className="px-6 py-4 font-medium text-logo-black">{category.name}</td>
                      <td className="px-6 py-4 text-logo-black/60">{category.description || '-'}</td>
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
                <div key={category.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-logo-black">{category.name}</p>
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

      {/* Modal — slides up from bottom on mobile */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl p-5 md:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="font-serif text-xl md:text-2xl text-logo-black mb-4">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-logo-black mb-1">Name</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-logo-black mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3}
                  className="w-full px-4 py-2.5 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-logo-rose/20 rounded-xl hover:bg-logo-rose/10 transition-colors text-sm font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-action-bordeaux text-white rounded-xl hover:bg-logo-black transition-colors text-sm font-medium">{editingCategory ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
