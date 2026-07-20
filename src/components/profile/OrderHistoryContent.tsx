import { useState, useEffect } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPackage, FiTruck, FiCheck, FiXCircle, FiClock, FiShoppingBag, FiSearch, FiFilter, FiStar, FiCamera, FiX, FiChevronDown } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/common/Toast';
import { supabase } from '../../utils/supabase';

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
  is_reviewed?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'Pending', icon: FiClock, color: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processing', icon: FiPackage, color: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Shipped', icon: FiTruck, color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Delivered', icon: FiCheck, color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', icon: FiXCircle, color: 'bg-red-100 text-red-700' },
};

const OrderHistoryContent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'reviewed' | 'pending'>('all');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<OrderItem | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [reviewDropdownOpen, setReviewDropdownOpen] = useState(false);

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

  // Filter orders based on search query, status, and review status
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = searchQuery === '' || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    const matchesReview = reviewFilter === 'all' || 
      (reviewFilter === 'reviewed' && order.is_reviewed) ||
      (reviewFilter === 'pending' && !order.is_reviewed);
    
    return matchesSearch && matchesStatus && matchesReview;
  });

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-logo-rose/10 p-4 mb-6 relative z-50">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-logo-black/40" size={16} />
            <input
              type="text"
              placeholder="Search orders"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-logo-black/30 hover:text-logo-rose cursor-pointer"
              >
                <FiXCircle size={14} />
              </button>
            )}
          </div>
          
          {/* Status Filter */}
          <div className="relative z-[100]">
            <div className="flex items-center gap-2">
              <FiFilter size={16} className="text-logo-black/40" />
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all cursor-pointer"
              >
                <span>{statusFilter === 'all' ? 'All Status' : STATUS_CONFIG[statusFilter]?.label || statusFilter}</span>
                <FiChevronDown size={14} className={`transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <AnimatePresence>
              {statusDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-40 bg-white border border-logo-rose/20 rounded-xl shadow-lg z-[9999] overflow-hidden"
                >
                  {(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setStatusDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-logo-rose/5 transition-colors ${statusFilter === status ? 'bg-logo-rose/10 font-semibold' : ''}`}
                    >
                      {status === 'all' ? 'All Status' : (
                        <>
                          {React.createElement(STATUS_CONFIG[status].icon, { size: 12 })}
                          {STATUS_CONFIG[status].label}
                        </>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Review Filter */}
          <div className="relative z-[100]">
            <div className="flex items-center gap-2">
              <FiStar size={16} className="text-logo-black/40" />
              <button
                onClick={() => setReviewDropdownOpen(!reviewDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all cursor-pointer"
              >
                <span>{reviewFilter === 'all' ? 'All Reviews' : reviewFilter === 'reviewed' ? 'Reviewed' : 'Pending Review'}</span>
                <FiChevronDown size={14} className={`transition-transform ${reviewDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <AnimatePresence>
              {reviewDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-40 bg-white border border-logo-rose/20 rounded-xl shadow-lg z-[9999] overflow-hidden"
                >
                  {(['all', 'reviewed', 'pending'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setReviewFilter(filter);
                        setReviewDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-logo-rose/5 transition-colors ${reviewFilter === filter ? 'bg-logo-rose/10 font-semibold' : ''}`}
                    >
                      {filter === 'all' ? 'All Reviews' : filter === 'reviewed' ? 'Reviewed' : 'Pending Review'}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Results count */}
        <div className="mt-2 text-xs text-logo-black/50 font-sans">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-logo-rose/30 border-t-action-bordeaux animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-logo-rose/20 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-logo-rose/10 flex items-center justify-center mx-auto mb-5">
            <FiSearch size={32} className="text-logo-rose/40" />
          </div>
          <h2 className="font-serif text-xl text-logo-black mb-2">No orders found</h2>
          <p className="font-sans text-sm text-logo-black/50 mb-6">
            Try adjusting your search or filter criteria.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-full font-sans font-bold text-sm transition-all shadow-md cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4 relative z-0">
          {filteredOrders.map((order) => {
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
                    <div className="flex flex-col items-end gap-3">
                      {order.status === 'delivered' && !order.is_reviewed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setSelectedProduct(order.items[0]);
                            setReviewModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
                        >
                          <FiStar size={14} /> Write Review
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(order.id);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-logo-rose/10 hover:bg-logo-rose/20 text-logo-rose rounded-xl text-sm font-semibold transition-all cursor-pointer"
                      >
                        {isExpanded ? 'Collapse' : 'See Details'}
                      </button>
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
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <p className="font-sans font-bold text-action-bordeaux text-sm">
                                PKR {(item.price * item.quantity).toLocaleString()}
                              </p>
                              {order.status === 'delivered' && !order.is_reviewed && (
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setSelectedProduct(item);
                                    setReviewModalOpen(true);
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
                                >
                                  <FiStar size={14} /> Write Review
                                </button>
                              )}
                            </div>
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

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModalOpen && selectedOrder && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-logo-rose/15 p-6 space-y-5 my-4"
            >
              {/* Modal header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl text-logo-black">Write a Review</h2>
                  <p className="text-sm text-logo-black/60 mt-1">{selectedProduct.name}</p>
                </div>
                <button onClick={() => {
                  setReviewModalOpen(false);
                  setRating(0);
                  setComment('');
                  setPhotos([]);
                  setPhotoPreviews([]);
                }}
                  className="p-2 text-logo-black/40 hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Rating */}
              <div>
                <label className="block font-sans text-sm font-medium text-logo-black mb-3">
                  Rating <span className="text-logo-rose">*</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="text-2xl transition-colors cursor-pointer"
                    >
                      <FiStar
                        className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-logo-black/20'}
                        size={24}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block font-sans text-sm font-medium text-logo-black mb-2">
                  Comment (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  rows={4}
                  className="w-full px-4 py-3 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all resize-none"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block font-sans text-sm font-medium text-logo-black mb-2">
                  Photos (Optional - Max 3)
                </label>
                <div className="flex gap-3">
                  {photoPreviews.map((preview, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-logo-rose/20">
                      <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          const newPhotos = photos.filter((_, i) => i !== idx);
                          const newPreviews = photoPreviews.filter((_, i) => i !== idx);
                          setPhotos(newPhotos);
                          setPhotoPreviews(newPreviews);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  ))}
                  {photoPreviews.length < 3 && (
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-logo-rose/30 flex flex-col items-center justify-center cursor-pointer hover:border-logo-rose hover:bg-logo-rose/5 transition-all">
                      <FiCamera size={20} className="text-logo-rose/40" />
                      <span className="text-[10px] text-logo-black/40 mt-1">Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && photoPreviews.length < 3) {
                            setPhotos([...photos, file]);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setPhotoPreviews([...photoPreviews, reader.result as string]);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={async () => {
                  if (rating === 0) {
                    toast('Please select a rating', 'warning', 'Rating Required');
                    return;
                  }

                  setIsSubmittingReview(true);
                  try {
                    // Upload photos
                    const photoUrls: string[] = [];
                    for (const photo of photos) {
                      const fileName = `${Date.now()}-${photo.name}`;
                      const { error: uploadError } = await supabase.storage
                        .from('review-photos')
                        .upload(fileName, photo);

                      if (uploadError) throw uploadError;

                      const { data: publicUrlData } = supabase.storage
                        .from('review-photos')
                        .getPublicUrl(fileName);

                      photoUrls.push(publicUrlData.publicUrl);
                    }

                    // Create review
                    const { error: reviewError } = await supabase
                      .from('reviews')
                      .insert({
                        user_id: user?.id,
                        order_id: selectedOrder.id,
                        product_id: selectedProduct.product_id,
                        rating,
                        comment,
                        photo1_url: photoUrls[0] || null,
                        photo2_url: photoUrls[1] || null,
                        photo3_url: photoUrls[2] || null,
                      });

                    if (reviewError) throw reviewError;

                    // Update order as reviewed
                    await supabase
                      .from('orders')
                      .update({ is_reviewed: true })
                      .eq('id', selectedOrder.id);

                    // Update local state
                    setOrders((prev) => prev.map((o) => 
                      o.id === selectedOrder.id ? { ...o, is_reviewed: true } : o
                    ));

                    toast('Review submitted successfully!', 'success', 'Success');

                    // Close modal and reset
                    setReviewModalOpen(false);
                    setRating(0);
                    setComment('');
                    setPhotos([]);
                    setPhotoPreviews([]);
                  } catch (err) {
                    console.error('Error submitting review:', err);
                    toast('Failed to submit review. Please try again.', 'error', 'Error');
                  } finally {
                    setIsSubmittingReview(false);
                  }
                }}
                disabled={isSubmittingReview || rating === 0}
                className="w-full py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl font-sans font-semibold tracking-wide text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingReview ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <FiStar size={16} />
                    Submit Review
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OrderHistoryContent;
