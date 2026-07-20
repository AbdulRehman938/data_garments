import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiStar, FiEye, FiX, FiTrash2 } from 'react-icons/fi';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../components/common/Toast';

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

interface Review {
  id: string;
  user_id: string;
  order_id: string;
  product_id: string;
  rating: number;
  comment: string;
  photo1_url?: string;
  photo2_url?: string;
  photo3_url?: string;
  created_at: string;
  user?: {
    username: string;
    email: string;
  };
  product?: {
    name: string;
    image_url?: string;
  };
}

const AdminReviews = () => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [viewingReview, setViewingReview] = useState<Review | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Lock body scroll when modal is open
  useScrollLock(!!viewingReview);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => { fetchReviews(); }, [currentPage, ratingFilter]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      let query = supabase
        .from('reviews')
        .select(`
          *,
          user:users(username, email),
          product:products(name, image_url)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (ratingFilter !== 'all') {
        query = query.eq('rating', parseInt(ratingFilter));
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setReviews(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    setDeletingId(reviewId);
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast('Review deleted successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to delete review', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = reviews.filter((r) =>
    r.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.user?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.comment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-logo-black">Reviews</h1>
          <p className="text-sm text-logo-black/50 mt-0.5 font-sans">{totalCount} total reviews</p>
        </div>
      </div>

      {/* Rating filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', '5', '4', '3', '2', '1'] as const).map((r) => (
          <button key={r} onClick={() => { setRatingFilter(r); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              ratingFilter === r
                ? 'bg-action-bordeaux text-white border-action-bordeaux'
                : 'border-logo-rose/20 text-logo-black/60 hover:border-logo-rose/40'
            }`}
          >
            {r === 'all' ? 'All Ratings' : (
              <>
                <FiStar size={10} /> {r} Star{r !== '1' ? 's' : ''}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40" size={18} />
        <input type="text" placeholder="Search by product, user, or comment..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 text-sm" />
      </div>

      {/* Reviews Grid */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-logo-rose/20 p-10 text-center text-logo-black/50 font-sans text-sm">Loading reviews...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-logo-rose/20 p-10 text-center text-logo-black/50 font-sans text-sm">
            {searchQuery ? 'No reviews match your search.' : 'No reviews yet.'}
          </div>
        ) : (
          filtered.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl shadow-sm border border-logo-rose/20 p-5 hover:border-logo-rose/30 transition-colors">
              <div className="flex items-start gap-4">
                {/* Product Info */}
                <div className="w-20 h-20 bg-bg-silk-glow rounded-xl overflow-hidden shrink-0">
                  {review.product?.image_url ? (
                    <img src={review.product.image_url} alt={review.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-logo-rose/30">
                      <FiStar size={24} />
                    </div>
                  )}
                </div>

                {/* Review Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-sm text-logo-black">{review.product?.name || 'Unknown Product'}</h3>
                      <p className="text-xs text-logo-black/50 mt-1">
                        by {review.user?.username || 'Unknown User'} · {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FiStar
                          key={star}
                          size={14}
                          className={star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-logo-black/20'}
                        />
                      ))}
                    </div>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-logo-black/70 line-clamp-2 mb-3">{review.comment}</p>
                  )}

                  {/* Photos */}
                  {(review.photo1_url || review.photo2_url || review.photo3_url) && (
                    <div className="flex gap-2">
                      {review.photo1_url && (
                        <img src={review.photo1_url} alt="Review photo" className="w-14 h-14 rounded-lg object-cover" />
                      )}
                      {review.photo2_url && (
                        <img src={review.photo2_url} alt="Review photo" className="w-14 h-14 rounded-lg object-cover" />
                      )}
                      {review.photo3_url && (
                        <img src={review.photo3_url} alt="Review photo" className="w-14 h-14 rounded-lg object-cover" />
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setViewingReview(review)}
                    className="p-2.5 text-logo-rose hover:bg-logo-rose/10 rounded-xl transition-colors cursor-pointer"
                    title="View details"
                  >
                    <FiEye size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    disabled={deletingId === review.id}
                    className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete review"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

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
      </div>

      {/* Review Detail Modal */}
      <AnimatePresence>
        {viewingReview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-logo-rose/15 p-6 space-y-5 my-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl text-logo-black">Review Details</h2>
                  <p className="text-xs text-logo-black/40 font-mono mt-0.5">{viewingReview.id}</p>
                </div>
                <button onClick={() => setViewingReview(null)}
                  className="p-2 text-logo-black/40 hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors cursor-pointer shrink-0">
                  <FiX size={18} />
                </button>
              </div>

              {/* Product Info */}
              <div className="flex items-center gap-4 p-4 bg-bg-silk-glow/50 rounded-2xl">
                <div className="w-20 h-20 bg-white rounded-xl overflow-hidden shrink-0">
                  {viewingReview.product?.image_url ? (
                    <img src={viewingReview.product.image_url} alt={viewingReview.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-logo-rose/30">
                      <FiStar size={24} />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-logo-black">{viewingReview.product?.name || 'Unknown Product'}</h3>
                  <p className="text-sm text-logo-black/60 mt-1">Product ID: {viewingReview.product_id}</p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-logo-black/60">Rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FiStar
                      key={star}
                      size={20}
                      className={star <= viewingReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-logo-black/20'}
                    />
                  ))}
                </div>
                <span className="font-bold text-lg text-logo-black ml-2">{viewingReview.rating}/5</span>
              </div>

              {/* Comment */}
              {viewingReview.comment && (
                <div>
                  <p className="font-semibold text-xs uppercase tracking-wider text-logo-black/60 mb-2">Comment</p>
                  <p className="text-sm text-logo-black bg-bg-silk-glow/30 p-4 rounded-xl">{viewingReview.comment}</p>
                </div>
              )}

              {/* Photos */}
              {(viewingReview.photo1_url || viewingReview.photo2_url || viewingReview.photo3_url) && (
                <div>
                  <p className="font-semibold text-xs uppercase tracking-wider text-logo-black/60 mb-2">Photos</p>
                  <div className="flex gap-3">
                    {viewingReview.photo1_url && (
                      <img src={viewingReview.photo1_url} alt="Review photo" className="w-24 h-24 rounded-xl object-cover" />
                    )}
                    {viewingReview.photo2_url && (
                      <img src={viewingReview.photo2_url} alt="Review photo" className="w-24 h-24 rounded-xl object-cover" />
                    )}
                    {viewingReview.photo3_url && (
                      <img src={viewingReview.photo3_url} alt="Review photo" className="w-24 h-24 rounded-xl object-cover" />
                    )}
                  </div>
                </div>
              )}

              {/* User Info */}
              <div className="bg-bg-silk-glow/50 rounded-2xl p-4 space-y-2 text-sm">
                <p><span className="font-semibold text-logo-black/60 text-xs uppercase tracking-wider">User</span></p>
                <p className="font-semibold text-logo-black">{viewingReview.user?.username || 'Unknown User'}</p>
                <p className="text-logo-black/60">{viewingReview.user?.email || 'No email'}</p>
                <p className="text-logo-black/50 text-xs">User ID: {viewingReview.user_id}</p>
              </div>

              {/* Order Info */}
              <div className="bg-bg-silk-glow/50 rounded-2xl p-4 space-y-2 text-sm">
                <p><span className="font-semibold text-logo-black/60 text-xs uppercase tracking-wider">Order</span></p>
                <p className="text-logo-black/60">Order ID: {viewingReview.order_id}</p>
                <p className="text-logo-black/50 text-xs">Reviewed on: {new Date(viewingReview.created_at).toLocaleString()}</p>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => {
                  handleDeleteReview(viewingReview.id);
                  setViewingReview(null);
                }}
                disabled={deletingId === viewingReview.id}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-sans font-semibold tracking-wide text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiTrash2 size={16} />
                Delete Review
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminReviews;
