import { motion } from 'framer-motion';

export const Hero = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-primary-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-4xl"
      >
        <h1 className="font-serif text-5xl md:text-7xl font-bold text-primary-900 mb-6">
          Welcome to the Data Garments
        </h1>
        <p className="font-sans text-lg md:text-xl text-primary-600 mb-10">
          Discover premium clothing with timeless designs
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="font-sans bg-accent-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-accent-700 transition-colors"
        >
          Explore Collection
        </motion.button>
      </motion.div>
    </section>
  );
};
