import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Privacy = () => (
  <div className="bg-bg-silk-glow min-h-screen pb-5 font-sans">
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-logo-rose hover:text-action-bordeaux text-sm font-semibold mb-8 transition-colors">
        <FiArrowLeft size={16} /> Back to Home
      </Link>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-logo-rose/10 shadow-sm p-8 md:p-12 space-y-4">
        <h1 className="font-serif text-4xl text-logo-black">Privacy Policy</h1>
        <p className="text-logo-black/50 text-sm leading-relaxed">
          This page content will be provided by the client. Please share the Privacy Policy text and we will update this page.
        </p>
      </motion.div>
    </div>
  </div>
);

export default Privacy;
