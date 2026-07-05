import { motion } from 'framer-motion';
import { FiHome, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const ServerError = () => {

  return (
    <div className="min-h-screen bg-bg-silk-glow flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-lg"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <FiAlertTriangle className="text-logo-rose" size={80} />
          </div>
          <h1 className="font-serif text-8xl md:text-9xl font-bold text-logo-rose mb-4">500</h1>
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="font-serif text-2xl md:text-3xl text-logo-black mb-4"
        >
          Internal Server Error
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="font-sans text-logo-black/60 mb-8"
        >
          Something went wrong on our end. Please try again later or contact support if the problem persists.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 bg-action-bordeaux text-white rounded-xl font-medium hover:bg-logo-black transition-colors"
          >
            <FiHome size={20} />
            Back to Home
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-logo-rose/20 text-logo-black rounded-xl font-medium hover:bg-logo-rose/10 transition-colors"
          >
            <FiRefreshCw size={20} />
            Refresh Page
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ServerError;
