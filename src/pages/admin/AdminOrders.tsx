import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiEye, FiX, FiPackage, FiTruck, FiCheck, FiXCircle, FiClock, FiChevronDown } from 'react-icons/fi';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../components/common/Toast';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

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

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  size: string | null;
  color: string | null;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_note: string | null;
  delivery_method: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending',   color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   icon: FiClock },
  confirmed: { label: 'Confirmed', color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',     icon: FiCheck },
  shipped:   { label: 'Shipped',   color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200', icon: FiTruck },
  delivered: { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: FiPackage },
  cancelled: { label: 'Cancelled', color: 'text-red-700',     bg: 'bg-red-50 border-red-200',       icon: FiXCircle },
};

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const AdminOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Lock body scroll when modal is open
  useScrollLock(!!viewingOrder);
  const ITEMS_PER_PAGE = 15;
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => { fetchOrders(); }, [currentPage, statusFilter]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error, count } = await query;
      if (error) throw error;
      setOrders(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      if (viewingOrder?.id === orderId) setViewingOrder((o) => o ? { ...o, status: newStatus } : o);
      toast(`Order marked as ${STATUS_CONFIG[newStatus].label}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) =>
    o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_phone.includes(searchQuery) ||
    o.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-logo-black">Orders</h1>
          <p className="text-sm text-logo-black/50 mt-0.5 font-sans">{totalCount} total orders</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...STATUS_FLOW] as const).map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer capitalize ${
              statusFilter === s
                ? 'bg-action-bordeaux text-white border-action-bordeaux'
                : 'border-logo-rose/20 text-logo-black/60 hover:border-logo-rose/40'
            }`}>
            {s === 'all' ? 'All Orders' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40" size={18} />
        <input type="text" placeholder="Search by name, phone or order ID..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 text-sm" />
      </div>

      {/* Table */}
      <div className="bg-transparent rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-logo-black/50 font-sans text-sm">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-logo-black/50 font-sans text-sm">
            {searchQuery ? 'No orders match your search.' : 'No orders yet.'}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg-silk-glow">
                  <tr>
                    {['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-logo-black/60 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-logo-rose/8">
                  {filtered.map((order, index) => {
                    const cfg = STATUS_CONFIG[order.status];
                    const Icon = cfg.icon;
                    const isLastOrder = index === filtered.length - 1;
                    return (
                      <tr key={order.id} className="hover:bg-logo-rose/3 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs text-logo-black/50">{order.id.slice(0, 8)}…</td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-sm text-logo-black">{order.customer_name}</p>
                          <p className="text-xs text-logo-black/50">{order.customer_phone}</p>
                          <p className="text-xs text-logo-black/40">{order.customer_city}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-logo-black/70">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                        <td className="px-5 py-4 font-bold text-sm text-action-bordeaux">PKR {order.total_amount.toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color}`}>
                            <Icon size={10} /> {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-logo-black/50">
                          {new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewingOrder(order)}
                              className="p-2 text-logo-rose hover:bg-logo-rose/10 rounded-lg transition-colors cursor-pointer" title="View details">
                              <FiEye size={16} />
                            </button>
                            {/* Custom status dropdown */}
                            <div className="relative">
                              <button
                                onClick={() => setOpenDropdownId(openDropdownId === order.id ? null : order.id)}
                                className="flex items-center gap-1 text-xs border border-logo-rose/20 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-logo-rose cursor-pointer disabled:opacity-50 min-w-[100px]"
                                disabled={updatingId === order.id}
                              >
                                <span className="truncate">{STATUS_CONFIG[order.status].label}</span>
                                <FiChevronDown size={12} className={`transition-transform ${openDropdownId === order.id ? 'rotate-180' : ''}`} />
                              </button>
                              <AnimatePresence>
                                {openDropdownId === order.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className={`absolute ${isLastOrder ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 w-32 bg-white border border-logo-rose/20 rounded-lg shadow-lg z-10 overflow-hidden`}
                                  >
                                    {STATUS_FLOW.map((s) => {
                                      const cfg = STATUS_CONFIG[s];
                                      const Icon = cfg.icon;
                                      return (
                                        <button
                                          key={s}
                                          onClick={() => {
                                            handleStatusChange(order.id, s);
                                            setOpenDropdownId(null);
                                          }}
                                          disabled={updatingId === order.id}
                                          className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-logo-rose/5 transition-colors disabled:opacity-50 ${order.status === s ? 'bg-logo-rose/10' : ''}`}
                                        >
                                          <Icon size={12} />
                                          {cfg.label}
                                        </button>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((order, index) => {
                const cfg = STATUS_CONFIG[order.status];
                const Icon = cfg.icon;
                const isLastOrder = index === filtered.length - 1;
                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-logo-black">{order.customer_name}</p>
                        <p className="text-xs text-logo-black/50 mt-1">{order.customer_phone} · {order.customer_city}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${cfg.bg} ${cfg.color}`}>
                        <Icon size={9} /> {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-logo-rose/10">
                      <span className="text-xs text-logo-black/50">{order.items.length} items · {new Date(order.created_at).toLocaleDateString()}</span>
                      <span className="font-bold text-sm text-action-bordeaux">PKR {order.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setViewingOrder(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-logo-rose/20 rounded-xl text-xs font-semibold text-logo-rose hover:bg-logo-rose/5 transition-colors cursor-pointer">
                        <FiEye size={13} /> View
                      </button>
                      <div className="relative flex-1">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === order.id ? null : order.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-logo-rose/20 rounded-xl text-xs font-semibold text-logo-black hover:bg-logo-rose/5 transition-colors cursor-pointer"
                          disabled={updatingId === order.id}
                        >
                          <span className="truncate">{STATUS_CONFIG[order.status].label}</span>
                          <FiChevronDown size={12} className={`transition-transform ${openDropdownId === order.id ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {openDropdownId === order.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className={`absolute ${isLastOrder ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 w-full bg-white border border-logo-rose/20 rounded-xl shadow-lg z-[9999] overflow-hidden`}
                            >
                              {STATUS_FLOW.map((s) => {
                                const cfg = STATUS_CONFIG[s];
                                const Icon = cfg.icon;
                                return (
                                  <button
                                    key={s}
                                    onClick={() => {
                                      handleStatusChange(order.id, s);
                                      setOpenDropdownId(null);
                                    }}
                                    disabled={updatingId === order.id}
                                    className={`flex items-center gap-2 w-full px-3 py-2.5 text-xs text-left hover:bg-logo-rose/5 transition-colors disabled:opacity-50 ${order.status === s ? 'bg-logo-rose/10' : ''}`}
                                  >
                                    <Icon size={12} />
                                    {cfg.label}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 border-t border-logo-rose/10">
                <p className="text-xs text-logo-black/60">Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-logo-rose/20 rounded-lg hover:bg-logo-rose/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
                  <span className="text-sm font-medium text-logo-black">{currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-logo-rose/20 rounded-lg hover:bg-logo-rose/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {viewingOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-logo-rose/15 p-6 space-y-5 my-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl text-logo-black">Order Details</h2>
                  <p className="text-xs text-logo-black/40 font-mono mt-0.5">{viewingOrder.id}</p>
                </div>
                <button onClick={() => setViewingOrder(null)}
                  className="p-2 text-logo-black/40 hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors cursor-pointer shrink-0">
                  <FiX size={18} />
                </button>
              </div>

              {/* Status badge */}
              {(() => {
                const cfg = STATUS_CONFIG[viewingOrder.status];
                const Icon = cfg.icon;
                return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color}`}>
                    <Icon size={12} /> {cfg.label}
                  </span>
                );
              })()}

              {/* Customer info */}
              <div className="bg-bg-silk-glow/50 rounded-2xl p-4 space-y-1.5 text-sm">
                <p><span className="font-semibold text-logo-black/60 text-xs uppercase tracking-wider">Customer</span></p>
                <p className="font-semibold text-logo-black">{viewingOrder.customer_name}</p>
                <p className="text-logo-black/60">{viewingOrder.customer_phone}</p>
                <p className="text-logo-black/60">{viewingOrder.customer_address}, {viewingOrder.customer_city}</p>
                {viewingOrder.customer_note && (
                  <p className="text-logo-black/50 italic text-xs">Note: {viewingOrder.customer_note}</p>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2">
                <p className="font-semibold text-xs uppercase tracking-wider text-logo-black/60">Order Items</p>
                {viewingOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 py-2 border-b border-logo-rose/8 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-logo-black truncate">{item.name}</p>
                      <div className="flex gap-2 mt-0.5">
                        {item.size && <span className="text-[10px] bg-bg-silk-glow px-1.5 py-0.5 rounded text-logo-black/60">Size: {item.size}</span>}
                        {item.color && <span className="text-[10px] bg-bg-silk-glow px-1.5 py-0.5 rounded text-logo-black/60">Color: {item.color}</span>}
                        <span className="text-[10px] text-logo-black/50">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-action-bordeaux shrink-0">PKR {(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-logo-rose/10 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-logo-black/60">
                  <span>Delivery ({viewingOrder.delivery_method})</span>
                  <span>included</span>
                </div>
                <div className="flex justify-between font-bold text-base text-logo-black">
                  <span>Grand Total</span>
                  <span className="text-action-bordeaux">PKR {viewingOrder.total_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Status change */}
              <div className="space-y-2">
                <p className="font-semibold text-xs uppercase tracking-wider text-logo-black/60">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_FLOW.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    const isActive = viewingOrder.status === s;
                    return (
                      <button key={s}
                        onClick={() => handleStatusChange(viewingOrder.id, s)}
                        disabled={isActive || updatingId === viewingOrder.id}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer disabled:cursor-default ${
                          isActive
                            ? `${cfg.bg} ${cfg.color} border-current`
                            : 'border-logo-rose/15 text-logo-black/50 hover:border-logo-rose/40 disabled:opacity-50'
                        }`}
                      >
                        <Icon size={14} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOrders;
