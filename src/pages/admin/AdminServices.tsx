import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiToggleLeft, FiToggleRight,
  FiTruck, FiRefreshCw, FiShield, FiPackage, FiStar, FiHeart,
  FiGift, FiZap, FiAward, FiCheckCircle, FiClock, FiGlobe,
} from 'react-icons/fi';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../components/common/Toast';

/* ─── Available icons the admin can pick ─── */
export const SERVICE_ICONS: Record<string, React.ElementType> = {
  FiTruck, FiRefreshCw, FiShield, FiPackage, FiStar, FiHeart,
  FiGift, FiZap, FiAward, FiCheckCircle, FiClock, FiGlobe,
};

export interface Service {
  id: string;
  label: string;
  icon_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const serviceSchema = Yup.object({
  label: Yup.string()
    .trim()
    .min(2, 'Label must be at least 2 characters')
    .max(60, 'Label cannot exceed 60 characters')
    .required('Label is required'),
  icon_name: Yup.string().required('Please select an icon'),
});

const AdminServices = () => {
  const { toast, confirm } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      toast(err.message || 'Failed to load services', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: { label: '', icon_name: 'FiTruck' },
    validationSchema: serviceSchema,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      setSaving(true);
      try {
        if (editing) {
          const { error } = await supabase
            .from('services')
            .update({ label: values.label.trim(), icon_name: values.icon_name })
            .eq('id', editing.id);
          if (error) throw error;
          toast('Service updated.', 'success');
        } else {
          const maxOrder = services.reduce((m, s) => Math.max(m, s.sort_order), 0);
          const { error } = await supabase
            .from('services')
            .insert({ label: values.label.trim(), icon_name: values.icon_name, is_active: true, sort_order: maxOrder + 1 });
          if (error) throw error;
          toast('Service added.', 'success');
        }
        setIsModalOpen(false);
        setEditing(null);
        resetForm();
        fetchServices();
      } catch (err: any) {
        toast(err.message || 'Failed to save service', 'error', 'Save Failed');
      } finally {
        setSaving(false);
      }
    },
  });

  const openAdd = () => {
    setEditing(null);
    formik.resetForm({ values: { label: '', icon_name: 'FiTruck' } });
    setIsModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    formik.resetForm({ values: { label: s.label, icon_name: s.icon_name } });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Service',
      message: 'This will remove the service badge from all product pages. Cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      toast('Service deleted.', 'success');
      fetchServices();
    } catch (err: any) {
      toast(err.message || 'Failed to delete', 'error');
    }
  };

  const handleToggle = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);
      if (error) throw error;
      setServices((prev) => prev.map((s) => s.id === service.id ? { ...s, is_active: !s.is_active } : s));
    } catch (err: any) {
      toast(err.message || 'Failed to toggle', 'error');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const arr = [...services];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    setServices(arr);
    await Promise.all([
      supabase.from('services').update({ sort_order: index - 1 }).eq('id', arr[index - 1].id),
      supabase.from('services').update({ sort_order: index }).eq('id', arr[index].id),
    ]);
  };

  const handleMoveDown = async (index: number) => {
    if (index === services.length - 1) return;
    const arr = [...services];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    setServices(arr);
    await Promise.all([
      supabase.from('services').update({ sort_order: index }).eq('id', arr[index].id),
      supabase.from('services').update({ sort_order: index + 1 }).eq('id', arr[index + 1].id),
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-logo-black">Service Badges</h1>
          <p className="text-sm text-logo-black/50 mt-1 font-sans">
            Manage the trust badges shown on every product detail page
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-action-bordeaux text-white rounded-xl text-sm font-medium hover:bg-logo-black transition-colors cursor-pointer"
        >
          <FiPlus size={17} /> Add Service
        </motion.button>
      </div>

      {/* Live Preview */}
      {services.filter((s) => s.is_active).length > 0 && (
        <div className="bg-white rounded-2xl border border-logo-rose/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-logo-black/50 mb-3">Live Preview — Product Page</p>
          <div className="flex flex-wrap gap-3">
            {services.filter((s) => s.is_active).map((s) => {
              const Icon = SERVICE_ICONS[s.icon_name] || FiCheckCircle;
              return (
                <div key={s.id} className="flex items-center gap-2 bg-bg-silk-glow/50 px-3 py-2.5 rounded-xl border border-logo-rose/8 text-xs text-logo-black/60">
                  <Icon size={14} className="text-logo-rose shrink-0" />
                  <span className="font-medium">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="bg-white rounded-2xl border border-logo-rose/10 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-logo-black/50 font-sans text-sm">Loading...</div>
        ) : services.length === 0 ? (
          <div className="p-10 text-center">
            <FiShield size={36} className="text-logo-rose/20 mx-auto mb-3" />
            <p className="font-sans text-sm text-logo-black/50">No service badges yet. Add your first one.</p>
          </div>
        ) : (
          <div className="divide-y divide-logo-rose/8">
            {services.map((service, index) => {
              const Icon = SERVICE_ICONS[service.icon_name] || FiCheckCircle;
              return (
                <motion.div key={service.id} layout
                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${service.is_active ? 'hover:bg-logo-rose/3' : 'opacity-50 bg-logo-black/2'}`}>
                  {/* Icon preview */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${service.is_active ? 'bg-logo-rose/10' : 'bg-logo-black/5'}`}>
                    <Icon size={18} className={service.is_active ? 'text-action-bordeaux' : 'text-logo-black/30'} />
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm font-semibold text-logo-black truncate">{service.label}</p>
                    <p className="font-sans text-xs text-logo-black/40">{service.icon_name}</p>
                  </div>

                  {/* Status */}
                  <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${service.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-logo-black/5 text-logo-black/40'}`}>
                    {service.is_active ? <FiCheck size={10} /> : <FiX size={10} />}
                    {service.is_active ? 'Active' : 'Hidden'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Move up/down */}
                    <div className="hidden sm:flex flex-col gap-0.5">
                      <button onClick={() => handleMoveUp(index)} disabled={index === 0}
                        className="p-1 text-logo-black/30 hover:text-logo-black disabled:opacity-20 cursor-pointer transition-colors leading-none">
                        ▲
                      </button>
                      <button onClick={() => handleMoveDown(index)} disabled={index === services.length - 1}
                        className="p-1 text-logo-black/30 hover:text-logo-black disabled:opacity-20 cursor-pointer transition-colors leading-none text-xs">
                        ▼
                      </button>
                    </div>
                    {/* Toggle */}
                    <button onClick={() => handleToggle(service)} title={service.is_active ? 'Hide' : 'Show'}
                      className="p-2 rounded-lg hover:bg-logo-rose/10 transition-colors cursor-pointer text-logo-rose">
                      {service.is_active ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} className="text-logo-black/30" />}
                    </button>
                    {/* Edit */}
                    <button onClick={() => openEdit(service)}
                      className="p-2 text-logo-rose hover:bg-logo-rose/10 rounded-lg transition-colors cursor-pointer">
                      <FiEdit2 size={16} />
                    </button>
                    {/* Delete */}
                    <button onClick={() => handleDelete(service.id)}
                      className="p-2 text-logo-rose hover:bg-logo-rose/10 rounded-lg transition-colors cursor-pointer">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-logo-rose/15"
            >
              <h2 className="font-serif text-xl text-logo-black mb-5">
                {editing ? 'Edit Service Badge' : 'Add Service Badge'}
              </h2>
              <form onSubmit={formik.handleSubmit} className="space-y-4">
                {/* Label */}
                <div>
                  <label className="block text-sm font-semibold text-logo-black mb-1.5">Label *</label>
                  <input
                    type="text"
                    name="label"
                    maxLength={60}
                    placeholder="e.g. Free Delivery"
                    value={formik.values.label}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-logo-rose/15 ${formik.touched.label && formik.errors.label ? 'border-red-400' : 'border-logo-rose/20 focus:border-logo-rose'}`}
                  />
                  <div className="flex justify-between mt-0.5 h-4">
                    <span className="text-xs text-red-500">{formik.touched.label && formik.errors.label ? formik.errors.label : ''}</span>
                    <span className="text-[10px] text-logo-black/30">{formik.values.label.length}/60</span>
                  </div>
                </div>

                {/* Icon picker */}
                <div>
                  <label className="block text-sm font-semibold text-logo-black mb-2">Icon *</label>
                  <div className="grid grid-cols-6 gap-2">
                    {Object.entries(SERVICE_ICONS).map(([name, Icon]) => (
                      <button key={name} type="button"
                        onClick={() => formik.setFieldValue('icon_name', name)}
                        title={name}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all cursor-pointer border-2 ${formik.values.icon_name === name ? 'bg-action-bordeaux border-action-bordeaux text-white shadow-md' : 'border-logo-rose/15 text-logo-black/50 hover:border-logo-rose/40 hover:bg-logo-rose/5'}`}>
                        <Icon size={18} />
                      </button>
                    ))}
                  </div>
                  {formik.touched.icon_name && formik.errors.icon_name && (
                    <p className="text-xs text-red-500 mt-1">{formik.errors.icon_name}</p>
                  )}
                </div>

                {/* Preview */}
                <div className="flex items-center gap-3 p-3 bg-bg-silk-glow/40 rounded-xl border border-logo-rose/10">
                  {(() => {
                    const Icon = SERVICE_ICONS[formik.values.icon_name] || FiCheckCircle;
                    return <Icon size={18} className="text-logo-rose shrink-0" />;
                  })()}
                  <span className="text-sm text-logo-black/70 font-medium">{formik.values.label || 'Preview'}</span>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button"
                    onClick={() => { setIsModalOpen(false); setEditing(null); formik.resetForm(); }}
                    className="flex-1 py-2.5 border border-logo-rose/20 rounded-xl text-sm font-semibold text-logo-black hover:bg-logo-rose/5 transition-all cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50">
                    {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
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

export default AdminServices;
