import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiPackage, FiTruck, FiCheck, FiXCircle, FiClock, FiShoppingBag, FiEye, FiUser, FiHeart } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_note?: string;
  delivery_method: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'Pending', icon: FiClock, color: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processing', icon: FiPackage, color: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Shipped', icon: FiTruck, color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Delivered', icon: FiCheck, color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', icon: FiXCircle, color: 'bg-red-100 text-red-700' },
};

const OrderHistory = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user?.id]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-auto bg-bg-silk-glow w-full py-0 px-3 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full md:max-w-3xl md:mx-auto md:px-0"
      >
        {/* Header */}
        <div className="mb-8 px-0 md:px-0 w-full">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-logo-black hover:text-logo-rose transition-colors duration-200 font-sans text-sm mb-4"
          >
            <FiArrowLeft size={16} />
            Back to Home
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl text-logo-black mt-4 mb-2">
            Order History
          </h1>
          <p className="font-sans text-sm text-logo-black/60">
            View and track your past orders
          </p>

          {/* Quick nav tabs */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <Link
              to="/profile-settings"
              className="flex items-center gap-1.5 px-4 py-2 border border-logo-rose/20 text-logo-black/60 hover:border-logo-rose hover:text-logo-rose rounded-full font-sans font-bold text-xs uppercase tracking-wide transition-all"
            >
              <FiUser size={12} /> Profile
            </Link>
            <Link
              to="/wishlist"
              className="flex items-center gap-1.5 px-4 py-2 border border-logo-rose/20 text-logo-black/60 hover:border-logo-rose hover:text-logo-rose rounded-full font-sans font-bold text-xs uppercase tracking-wide transition-all"
            >
              <FiHeart size={12} /> Wishlist
            </Link>
            <span className="px-4 py-2 bg-action-bordeaux text-white rounded-full font-sans font-bold text-xs uppercase tracking-wide">
              <FiShoppingBag size={12} /> Orders
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-logo-rose/30 border-t-action-bordeaux animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-logo-rose/20 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-logo-rose/10 flex items-center justify-center mx-auto mb-5">
              <FiShoppingBag size={32} className="text-logo-rose/40" />
            </div>
            <h2 className="font-serif text-xl text-logo-black mb-2">No orders yet</h2>
            <p className="font-sans text-sm text-logo-black/50 mb-6">
              You haven't placed any orders yet.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-full font-sans font-bold text-sm transition-all shadow-md"
            >
              <FiShoppingBag size={16} />
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              const isExpanded = expandedOrderId === order.id;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-logo-rose/20 overflow-hidden"
                >
                  {/* Order Summary */}
                  <div
                    className="p-4 md:p-6 cursor-pointer hover:bg-logo-rose/5 transition-colors"
                    onClick={() => toggleExpand(order.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${status.color}`}>
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                          <span className="text-xs text-logo-black/40 font-mono">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>
                        <p className="font-sans text-sm text-logo-black/60">
                          {formatDate(order.created_at)}
                        </p>
                        <p className="font-sans font-bold text-action-bordeaux text-lg mt-1">
                          PKR {order.total_amount.toLocaleString()}
                        </p>
                        <p className="font-sans text-xs text-logo-black/50 mt-1">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiEye
                          size={18}
                          className={`text-logo-rose transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Order Details (Expandable) */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-logo-rose/10 p-4 md:p-6 bg-bg-silk-glow/30"
                    >
                      {/* Items */}
                      <div className="mb-6">
                        <h3 className="font-serif text-lg text-logo-black mb-3">Order Items</h3>
                        <div className="space-y-3">
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 p-3 bg-white rounded-xl border border-logo-rose/10"
                            >
                              <div className="w-12 h-12 bg-bg-silk-glow rounded-lg flex items-center justify-center shrink-0">
                                <FiShoppingBag size={16} className="text-logo-rose/30" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-sans text-sm font-semibold text-logo-black truncate">
                                  {item.name}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {item.size && (
                                    <span className="text-[10px] bg-bg-silk-glow px-2 py-0.5 rounded-full text-logo-black/60">
                                      Size: {item.size}
                                    </span>
                                  )}
                                  {item.color && (
                                    <span className="text-[10px] bg-bg-silk-glow px-2 py-0.5 rounded-full text-logo-black/60">
                                      Color: {item.color}
                                    </span>
                                  )}
                                </div>
                                <p className="font-sans text-xs text-logo-black/50 mt-1">
                                  Qty: {item.quantity} × PKR {item.price.toLocaleString()}
                                </p>
                              </div>
                              <p className="font-sans font-bold text-action-bordeaux text-sm shrink-0">
                                PKR {(item.price * item.quantity).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping Details */}
                      <div className="mb-6">
                        <h3 className="font-serif text-lg text-logo-black mb-3">Shipping Details</h3>
                        <div className="bg-white rounded-xl border border-logo-rose/10 p-4 space-y-2">
                          <div>
                            <p className="text-xs text-logo-black/40 uppercase tracking-wider mb-1">Name</p>
                            <p className="font-sans text-sm text-logo-black">{order.customer_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-logo-black/40 uppercase tracking-wider mb-1">Phone</p>
                            <p className="font-sans text-sm text-logo-black">{order.customer_phone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-logo-black/40 uppercase tracking-wider mb-1">Address</p>
                            <p className="font-sans text-sm text-logo-black">{order.customer_address}</p>
                          </div>
                          <div>
                            <p className="text-xs text-logo-black/40 uppercase tracking-wider mb-1">City</p>
                            <p className="font-sans text-sm text-logo-black">{order.customer_city}</p>
                          </div>
                          <div>
                            <p className="text-xs text-logo-black/40 uppercase tracking-wider mb-1">Delivery Method</p>
                            <p className="font-sans text-sm text-logo-black">{order.delivery_method}</p>
                          </div>
                          {order.customer_note && (
                            <div>
                              <p className="text-xs text-logo-black/40 uppercase tracking-wider mb-1">Note</p>
                              <p className="font-sans text-sm text-logo-black">{order.customer_note}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Summary */}
                      <div className="bg-white rounded-xl border border-logo-rose/10 p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-sans text-sm text-logo-black/70">Total Amount</span>
                          <span className="font-sans font-bold text-action-bordeaux text-lg">
                            PKR {order.total_amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OrderHistory;
