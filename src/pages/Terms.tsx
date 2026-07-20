import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. Use of Our Website',
    content:
      'Our website is for browsing and ordering women\'s clothing. You agree to use the website only for lawful purposes and not to misuse or interfere with its operation.',
  },
  {
    title: '2. Product Information',
    content:
      'We do our best to provide accurate product descriptions, prices, and images. However, slight differences in color or appearance may occur due to lighting or screen settings.',
  },
  {
    title: '3. Orders',
    content:
      'After you place an order, we may contact you to confirm your details before processing it. We reserve the right to accept or cancel any order if necessary.',
  },
  {
    title: '4. Payments',
    content:
      'We do not accept online payments through our website. Payment is made using the agreed method during order confirmation, such as Cash on Delivery (COD) or another offline payment method.',
  },
  {
    title: '5. Shipping',
    content:
      'We aim to deliver your order as quickly as possible. Delivery times may vary depending on your location and the courier service. Delays caused by the courier or unexpected circumstances are beyond our control.',
  },
  {
    title: '6. No Returns or Exchanges',
    content:
      'We do not offer returns or exchanges on any products. Please review your order carefully before confirming it. Once an order has been placed and processed, it cannot be returned or exchanged.',
  },
  {
    title: '7. Intellectual Property',
    content:
      'All content on this website, including text, images, logos, and designs, belongs to DATA GARMENTS unless otherwise stated. You may not copy, use, or reproduce any content without our permission.',
  },
  {
    title: '8. Limitation of Liability',
    content:
      'We work hard to keep our website accurate and available, but we cannot guarantee that it will always be free from errors or interruptions. DATA GARMENTS is not responsible for any indirect loss resulting from the use of our website.',
  },
  {
    title: '9. Changes to These Terms',
    content:
      'We may update these Terms & Conditions at any time. Any changes will be posted on this page with the updated date.',
  },
];

const Terms = () => (
  <div className="bg-bg-silk-glow min-h-screen pb-5 font-sans">
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-logo-rose hover:text-action-bordeaux text-sm font-semibold mb-8 transition-colors"
      >
        <FiArrowLeft size={16} /> Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-logo-rose/10 shadow-sm p-8 md:p-12 space-y-8"
      >
        {/* Header */}
        <div className="space-y-2 pb-4 border-b border-logo-rose/10">
          <h1 className="font-serif text-4xl text-logo-black">Terms &amp; Conditions</h1>
          <p className="text-logo-black/40 text-sm">Last Updated: July 11, 2026</p>
          <p className="text-logo-black/70 text-sm leading-relaxed pt-1">
            Welcome to DATA GARMENTS. By using our website, you agree to these Terms &amp;
            Conditions. Please read them carefully before using our website or placing an order.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="space-y-1"
            >
              <h2 className="font-semibold text-base text-logo-black">{section.title}</h2>
              <p className="text-logo-black/65 text-sm leading-relaxed">{section.content}</p>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <div className="pt-6 border-t border-logo-rose/10 space-y-3">
          <h2 className="font-semibold text-base text-logo-black">10. Contact Us</h2>
          <p className="text-logo-black/65 text-sm leading-relaxed">
            If you have any questions about these Terms &amp; Conditions, please contact us.
          </p>
          <div className="bg-logo-rose/5 rounded-2xl p-5 space-y-2 text-sm text-logo-black/70">
            <p className="font-semibold text-logo-black">DATA GARMENTS</p>
            <p>
              Email:{' '}
              <a
                href="mailto:datagarments06@gmail.com"
                className="text-logo-rose hover:text-action-bordeaux transition-colors"
              >
                datagarments06@gmail.com
              </a>
            </p>
            <p>Phone: 0316-7797719</p>
            <p>Address: School Bazaar, Near United General Store, Rahim Yar Khan, Pakistan</p>
            <p>Customer Support Hours: Monday to Saturday, 9:00 AM to 7:00 PM</p>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

export default Terms;
