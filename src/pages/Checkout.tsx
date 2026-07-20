import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiShoppingBag, FiTruck, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

interface DeliveryOption {
  id: string;
  label: string;
  description: string;
  extraCharge?: number;
  isActive?: boolean;
}

const WHATSAPP_NUMBER = '923167797719';

// Calculate tiered delivery charge based on number of items
const calculateDeliveryCharge = (totalItems: number): number => {
  const baseCharge = 350;
  if (totalItems <= 3) return baseCharge;
  // Add 100 for each additional item beyond 3
  return baseCharge + (totalItems - 3) * 100;
};

const DELIVERY_OPTIONS: DeliveryOption[] = [
  { id: 'standard', label: 'Standard Delivery', description: 'Nationwide — 3–5 business days' },
  { id: 'express', label: 'Express Delivery', description: 'Nationwide — 1–2 business days', extraCharge: 150, isActive: true },
];

// Comprehensive list of Pakistani cities for validation
const PAKISTANI_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta',
  'Hyderabad', 'Gujranwala', 'Sialkot', 'Sargodha', 'Bahawalpur', 'Sukkur', 'Larkana', 'Sheikhupura',
  'Rahim Yar Khan', 'Jhang', 'Dera Ghazi Khan', 'Gujrat', 'Mardan', 'Kasur', 'Mingora', 'Sahiwal',
  'Okara', 'Wah Cantonment', 'Daska', 'Chiniot', 'Burewala', 'Jacobabad', 'Saddiqabad', 'Mandi Bahauddin',
  'Abbottabad', 'Tando Allahyar', 'Muzaffargarh', 'Kot Addu', 'Nawabshah', 'Kāmoke', 'Shikarpur', 'Hafizabad',
  'Kohat', 'Dera Ismail Khan', 'Chishtian', 'Tando Adam', 'Khanewal', 'Muridke', 'Pakpattan', 'Jhelum',
  'Bahawalnagar', 'Khanpur', 'Khushab', 'Mianwali', 'Tank', 'Nowshera', 'Charsadda', 'Swabi', 'Mansehra',
  'Haripur', 'Attock', 'Chakwal', 'Khairpur', 'Badin', 'Thatta', 'Sanghar', 'Mirpur Khas', 'Umerkot',
  'Tharparkar', 'Naushahro Firoze', 'Matiari', 'Tando Muhammad Khan', 'Jamshoro', 'Dadu', 'Shahdadkot',
  'Qambar Shahdadkot', 'Ghotki', 'Sukkur', 'Khairpur', 'Larkana', 'Jacobabad', 'Shikarpur', 'Kashmore',
  'Ghotki', 'Sukkur', 'Khairpur', 'Larkana', 'Jacobabad', 'Shikarpur', 'Kashmore', 'Naushahro Firoze',
  'Matiari', 'Tando Muhammad Khan', 'Jamshoro', 'Dadu', 'Shahdadkot', 'Qambar Shahdadkot', 'Badin',
  'Thatta', 'Sanghar', 'Mirpur Khas', 'Umerkot', 'Tharparkar', 'Hyderabad', 'Karachi', 'Malir',
  'Korangi', 'Central', 'East', 'West', 'South', 'Lahore', 'Gujranwala', 'Sialkot', 'Gujrat',
  'Mandi Bahauddin', 'Hafizabad', 'Sheikhupura', 'Nankana Sahib', 'Faisalabad', 'Toba Tek Singh',
  'Jhang', 'Chiniot', 'Sargodha', 'Khushab', 'Mianwali', 'Bhakkar', 'Multan', 'Khanewal', 'Lodhran',
  'Vehari', 'Bahawalpur', 'Bahawalnagar', 'Rahim Yar Khan', 'Muzaffargarh', 'Layyah', 'Dera Ghazi Khan',
  'Rajanpur', 'Rawalpindi', 'Islamabad', 'Attock', 'Chakwal', 'Jhelum', 'Mianwali', 'Talagang',
  'Hazro', 'Taxila', 'Peshawar', 'Mardan', 'Charsadda', 'Nowshera', 'Swabi', 'Kohat', 'Karak',
  'Bannu', 'Lakki Marwat', 'Dera Ismail Khan', 'Tank', 'Abbottabad', 'Mansehra', 'Haripur', 'Battagram',
  'Kohistan', 'Lower Kohistan', 'Upper Kohistan', 'Torghar', 'Swat', 'Upper Dir', 'Lower Dir',
  'Malakand', 'Buner', 'Shangla', 'Chitral', 'Quetta', 'Zhob', 'Killa Saifullah', 'Loralai',
  'Duki', 'Ziarat', 'Pishin', 'Killa Abdullah', 'Chaman', 'Nushki', 'Kharan', 'Washuk',
  'Chagai', 'Awaran', 'Kech', 'Gwadar', 'Lasbela', 'Hub', 'Jhal Magsi', 'Sibi', 'Kohlu',
  'Dera Bugti', 'Barkhan', 'Musa Khel', 'Zafarwal', 'Narowal', 'Shakargarh', 'Kharian', 'Sarai Alamgir',
  'Gujrat', 'Phalia', 'Mandi Bahauddin', 'Kotli', 'Rawalakot', 'Muzaffarabad', 'Bhimber', 'Bagh',
  'Hattian', 'Neelum', 'Kahuta', 'Kallar Syedan', 'Murree', 'Kotli Sattian', 'Rawalpindi', 'Islamabad'
];

interface CheckoutFormValues {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  note: string;
  delivery: string;
}

const checkoutSchema = Yup.object({
  full_name: Yup.string()
    .trim()
    .min(3, 'Min 3 characters')
    .max(80, 'Max 80 characters')
    .required('Full name is required'),

  phone: Yup.string()
    .matches(/^(03\d{9}|\+923\d{9}|923\d{9})$/, 'Enter a valid Pakistani number (03XXXXXXXXX, +923XXXXXXXXX, or 923XXXXXXXXX)')
    .required('Phone number is required'),

  address: Yup.string()
    .trim()
    .min(10, 'Please enter a complete address')
    .max(300, 'Max 300 characters')
    .test('pakistan-address', 'Please enter a valid Pakistani address', (value) => {
      if (!value) return false;
      const lowerValue = value.toLowerCase();
      // Check that address doesn't contain non-Pakistan country names
      const forbiddenCountries = ['india', 'usa', 'uk', 'canada', 'australia', 'china', 'iran', 'afghanistan'];
      const hasForbiddenCountry = forbiddenCountries.some(country => lowerValue.includes(country));
      // Check for common Pakistani address components
      const hasPakistanComponents = /(street|road|lane|sector|phase|block|house|flat|apartment|gali|mohalla|bazar|market|chowk)/i.test(lowerValue);
      return !hasForbiddenCountry && (hasPakistanComponents || lowerValue.length >= 15);
    })
    .required('Address is required'),

  city: Yup.string()
    .trim()
    .min(2, 'Min 2 characters')
    .max(60, 'Max 60 characters')
    .test('valid-city', 'Please enter a valid Pakistani city', (value) => {
      if (!value) return false;
      const normalizedCity = value.toLowerCase().trim();
      return PAKISTANI_CITIES.some(city =>
        city.toLowerCase().includes(normalizedCity) ||
        normalizedCity.includes(city.toLowerCase()) ||
        city.toLowerCase() === normalizedCity
      );
    })
    .required('City is required'),

  note: Yup.string()
    .trim()
    .max(300, 'Max 300 characters')
    .optional(),

  delivery: Yup.string()
    .required('Please select a delivery option'),
});

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  const isGuest = user?.isGuest === true || !user?.role || user?.role === 'GUEST';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [availableDeliveryOptions, setAvailableDeliveryOptions] = useState<DeliveryOption[]>(DELIVERY_OPTIONS);

  console.log('Checkout - User:', user, 'isGuest:', isGuest);

  // Fetch product details to determine available delivery options
  useEffect(() => {
    const fetchAvailableOptions = async () => {
      if (cartItems.length === 0) {
        setAvailableDeliveryOptions(DELIVERY_OPTIONS);
        return;
      }

      const productIds = [...new Set(cartItems.map(item => item.id))];

      try {
        const { data: products, error } = await supabase
          .from('products')
          .select('id, express_delivery_available')
          .in('id', productIds);

        if (error) {
          console.error('Failed to fetch product details:', error);
          setAvailableDeliveryOptions(DELIVERY_OPTIONS);
          return;
        }

        const hasExpressAvailable = products?.some(p => p.express_delivery_available) ?? false;

        if (hasExpressAvailable) {
          setAvailableDeliveryOptions(DELIVERY_OPTIONS);
        } else {
          setAvailableDeliveryOptions([DELIVERY_OPTIONS[0]]);
        }
      } catch (error) {
        console.error('Error fetching delivery options:', error);
        setAvailableDeliveryOptions(DELIVERY_OPTIONS);
      }
    };

    fetchAvailableOptions();
  }, [cartItems]);

  const formik = useFormik<CheckoutFormValues>({
    initialValues: {
      full_name: '',
      phone: '',
      address: '',
      city: '',
      note: '',
      delivery: availableDeliveryOptions[0]?.id || 'standard',
    },
    validationSchema: checkoutSchema,
    onSubmit: async (values) => {
      if (cartItems.length === 0) return;
      setIsSubmitting(true);

      const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const baseDeliveryCharge = calculateDeliveryCharge(totalItems);
      const deliveryOption = availableDeliveryOptions.find((d) => d.id === values.delivery)!;
      const deliveryCharge = baseDeliveryCharge + (deliveryOption.extraCharge || 0);
      const grandTotal = cartTotal + deliveryCharge;

      const normalizePhone = (phone: string) => {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('92')) {
          cleaned = '0' + cleaned.slice(2);
        }
        return cleaned;
      };

      const normalizedPhone = normalizePhone(values.phone);

      const itemLines = cartItems.map((item) => {
        let line = `• ${item.name} x${item.quantity} — PKR ${(item.price * item.quantity).toLocaleString()}`;
        if (item.size) line += ` | Size: ${item.size}`;
        if (item.color) line += ` | Color: ${item.color}`;
        return line;
      }).join('\n');

      const message = [
        `🛍️ *New Order — Data Garments*`,
        ``,
        `*Customer Details*`,
        `Name: ${values.full_name}`,
        `Phone: ${normalizedPhone}`,
        `City: ${values.city}`,
        `Address: ${values.address}`,
        values.note ? `Note: ${values.note}` : '',
        ``,
        `*Order Items*`,
        itemLines,
        ``,
        `*Delivery:* ${deliveryOption.label} — PKR ${deliveryCharge.toLocaleString()}`,
        `*Products Total:* PKR ${cartTotal.toLocaleString()}`,
        `*Grand Total:* PKR ${grandTotal.toLocaleString()}`,
        ``,
        `⚠️ Delivery charges (PKR ${deliveryCharge.toLocaleString()}) must be paid in advance.`,
        `Remaining amount (PKR ${cartTotal.toLocaleString()}) will be collected via Cash on Delivery.`,
      ].filter((l) => l !== '').join('\n');

      const orderId = crypto.randomUUID();

      const orderItems = cartItems.map(item => ({
        product_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size || null,
        color: item.color || null,
      }));

      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          user_id: isGuest ? null : user?.id,
          customer_name: values.full_name,
          customer_phone: normalizedPhone,
          customer_address: values.address,
          customer_city: values.city,
          customer_note: values.note || null,
          delivery_method: deliveryOption.label,
          items: orderItems,
          total_amount: grandTotal,
          status: 'pending',
        });

      if (orderError) {
        console.error('Supabase order error:', orderError);
        throw orderError;
      }

      // Insert into order_items table for tracking sales stats
      const orderItemsForDb = cartItems.map(item => ({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        price_at_order: item.price,
      }));

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItemsForDb);

      if (orderItemsError) {
        console.error('Supabase order_items error:', orderItemsError);
        // Don't throw here as the main order is already created
      }

      console.log('Order created with ID:', orderId);

      const messageWithId = [
        ...message.split('\n'),
        ``,
        `*Order ID:* ${orderId}`,
      ].join('\n');

      clearCart();
      setShowSuccess(true);
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageWithId)}`, '_blank');
      setTimeout(() => navigate('/shop'), 3000);
    }
  })

  // Calculate delivery charge for display
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedDelivery = availableDeliveryOptions.find((d) => d.id === formik.values.delivery) || availableDeliveryOptions[0];
  const baseDeliveryCharge = calculateDeliveryCharge(totalItems);
  const deliveryCharge = baseDeliveryCharge + (selectedDelivery?.extraCharge || 0);
  const grandTotal = cartTotal + deliveryCharge;

  const fErr = (f: keyof CheckoutFormValues): string =>
    formik.touched[f] && formik.errors[f]
      ? (formik.errors[f] as string)
      : '';

  const inputCls = (f: keyof CheckoutFormValues) =>
    `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-logo-rose/15 transition-all ${fErr(f) ? 'border-red-400' : 'border-logo-rose/20 focus:border-logo-rose'
    }`;

  if (cartItems.length === 0 && !showSuccess) {
    return (
      <div className="min-h-screen bg-bg-silk-glow flex flex-col items-center justify-center gap-4 p-8">
        <FiShoppingBag size={48} className="text-logo-rose/30" />
        <h2 className="font-serif text-2xl text-logo-black">Your cart is empty</h2>
        <Link to="/shop" className="px-6 py-3 bg-action-bordeaux text-white rounded-full font-bold text-sm uppercase tracking-widest hover:bg-[#460416] transition-all">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-bg-silk-glow min-h-screen pb-5 font-sans">
      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-500 bg-white flex flex-col items-center justify-center gap-6 text-center p-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
              className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center"
            >
              <FiCheck size={40} className="text-emerald-500" />
            </motion.div>
            <h2 className="font-serif text-3xl text-logo-black">Order Placed!</h2>
            <p className="text-logo-black/60 max-w-sm leading-relaxed text-sm">
              Your order has been saved. WhatsApp is opening so you can confirm your order by pressing Send.
            </p>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
              <FaWhatsapp size={20} />
              Opening WhatsApp...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b border-logo-rose/10 px-6 md:px-12 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-logo-rose hover:text-action-bordeaux text-xs font-semibold">
            <FiArrowLeft size={14} /> Continue Shopping
          </Link>
          <span className="text-logo-black/20">/</span>
          <h1 className="font-serif text-xl text-logo-black">Checkout</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ── Left: Form ── */}
        <div className="lg:col-span-7">
          <form onSubmit={formik.handleSubmit} className="space-y-6">

            {/* Customer Info */}
            <div className="bg-white rounded-3xl border border-logo-rose/10 p-6 shadow-sm space-y-5">
              <h2 className="font-serif text-xl text-logo-black border-b border-logo-rose/8 pb-3">Your Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-logo-black/70 uppercase tracking-wider mb-1.5">Full Name *</label>
                  <input type="text" name="full_name" maxLength={80} placeholder="Enter your full name"
                    value={formik.values.full_name} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    className={inputCls('full_name')} />
                  {fErr('full_name') && <p className="text-xs text-red-500 mt-1">{fErr('full_name')}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-logo-black/70 uppercase tracking-wider mb-1.5">Phone Number *</label>
                  <input type="tel" name="phone" maxLength={11} placeholder="03XXXXXXXXX"
                    value={formik.values.phone} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    className={inputCls('phone')} />
                  {fErr('phone') && <p className="text-xs text-red-500 mt-1">{fErr('phone')}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-logo-black/70 uppercase tracking-wider mb-1.5">City *</label>
                  <input type="text" name="city" maxLength={60} placeholder="e.g. Karachi"
                    value={formik.values.city} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    className={inputCls('city')} />
                  {fErr('city') && <p className="text-xs text-red-500 mt-1">{fErr('city')}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-logo-black/70 uppercase tracking-wider mb-1.5">Complete Address *</label>
                  <textarea name="address" rows={3} maxLength={300}
                    placeholder="House no., street, area, city..."
                    value={formik.values.address} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    className={`${inputCls('address')} resize-none`} />
                  {fErr('address') && <p className="text-xs text-red-500 mt-1">{fErr('address')}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-logo-black/70 uppercase tracking-wider mb-1.5">Order Note <span className="normal-case font-normal">(optional)</span></label>
                  <textarea name="note" rows={2} maxLength={300} placeholder="Any special instructions..."
                    value={formik.values.note} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    className={`${inputCls('note')} resize-none`} />
                </div>
              </div>
            </div>

            {/* Delivery Method */}
            <div className="bg-white rounded-3xl border border-logo-rose/10 p-6 shadow-sm space-y-4">
              <h2 className="font-serif text-xl text-logo-black border-b border-logo-rose/8 pb-3">
                <FiTruck className="inline mr-2 text-logo-rose" size={18} />
                Delivery Method
              </h2>
              <div className="space-y-3">
                {availableDeliveryOptions.map((opt) => {
                  const optionCharge = baseDeliveryCharge + (opt.extraCharge || 0);
                  return (
                    <button key={opt.id} type="button"
                      onClick={() => formik.setFieldValue('delivery', opt.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${formik.values.delivery === opt.id
                          ? 'border-action-bordeaux bg-action-bordeaux/5'
                          : 'border-logo-rose/15 hover:border-logo-rose/40'
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${formik.values.delivery === opt.id ? 'border-action-bordeaux' : 'border-logo-rose/30'
                        }`}>
                        {formik.values.delivery === opt.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-action-bordeaux" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-logo-black">{opt.label}</p>
                        <p className="text-xs text-logo-black/50">{opt.description}</p>
                      </div>
                      <span className="font-bold text-sm text-action-bordeaux shrink-0">PKR {optionCharge.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>

              {/* COD Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 leading-relaxed">
                <p className="font-bold mb-1">📦 Payment Information</p>
                Delivery charges must be paid in advance. The remaining order amount will be collected through <strong>Cash on Delivery (COD)</strong>.
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isSubmitting}
              className="w-full py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <FaWhatsapp size={20} />
              {isSubmitting ? 'Placing Order...' : 'Confirm Order via WhatsApp'}
            </button>
          </form>
        </div>

        {/* ── Right: Order Summary ── */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-logo-rose/10 p-6 shadow-sm sticky top-24 space-y-5">
            <h2 className="font-serif text-xl text-logo-black border-b border-logo-rose/8 pb-3">Order Summary</h2>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-3 items-start">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name}
                      className="w-14 h-14 object-cover rounded-xl shrink-0 border border-logo-rose/10" />
                  ) : (
                    <div className="w-14 h-14 bg-bg-silk-glow rounded-xl shrink-0 flex items-center justify-center">
                      <FiShoppingBag size={16} className="text-logo-rose/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-logo-black truncate">{item.name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.size && <span className="text-[10px] bg-bg-silk-glow px-2 py-0.5 rounded-full text-logo-black/60">Size: {item.size}</span>}
                      {item.color && <span className="text-[10px] bg-bg-silk-glow px-2 py-0.5 rounded-full text-logo-black/60">Color: {item.color}</span>}
                    </div>
                    <p className="text-xs text-logo-black/50 mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-action-bordeaux shrink-0">
                    PKR {(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-logo-rose/10 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-logo-black/70">
                <span>Subtotal</span>
                <span className="font-semibold">PKR {cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-logo-black/70">
                <span>Delivery ({selectedDelivery.label})</span>
                <span className="font-semibold">PKR {deliveryCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-logo-black border-t border-logo-rose/10 pt-2 mt-1">
                <span>Grand Total</span>
                <span className="text-action-bordeaux">PKR {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[11px] text-logo-black/40 text-center leading-relaxed">
              By confirming, WhatsApp will open with your pre-filled order. Just press Send.
            </p>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <AnimatePresence>
        {showError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-500 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-sm mx-4 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertCircle className="text-3xl text-red-500" />
              </div>
              <h2 className="font-serif text-xl md:text-2xl text-logo-black mb-2">Order Failed</h2>
              <p className="font-sans text-sm text-logo-black/60 mb-6">
                Something went wrong while placing your order. Please check your connection and try again.
              </p>
              <button
                onClick={() => setShowError(false)}
                className="w-full py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl font-sans font-semibold text-sm transition-all cursor-pointer"
              >
                Try Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Checkout;
