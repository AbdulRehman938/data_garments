import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const About = () => (
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
        className="bg-white rounded-3xl border border-logo-rose/10 shadow-sm p-8 md:p-12 space-y-6 text-center"
      >
        {/* Heading */}
        <div className="space-y-2">
          <p className="text-logo-rose text-xs font-semibold uppercase tracking-widest">
            Our Story
          </p>
          <h1 className="font-serif text-4xl text-logo-black">About DATA GARMENTS</h1>
        </div>

        {/* Divider */}
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-16 bg-logo-rose/20" />
          <span className="w-2 h-2 rounded-full bg-logo-rose/40" />
          <span className="h-px w-16 bg-logo-rose/20" />
        </div>

        {/* Body paragraphs */}
        <div className="space-y-4 text-logo-black/70 text-sm leading-relaxed max-w-xl mx-auto">
          <p>
            DATA GARMENTS is an online store for women's clothing. We offer stylish, comfortable,
            and affordable fashion for every occasion.
          </p>
          <p>
            Our aim is to make online shopping simple, easy, and enjoyable. We carefully choose
            quality products so our customers can shop with confidence.
          </p>
          <p>
            We are committed to providing excellent customer service and a smooth shopping
            experience. Whether you're looking for everyday wear or the latest fashion, DATA
            GARMENTS is here to help you find the right outfit.
          </p>
        </div>

        {/* Thank you note */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-logo-rose/5 rounded-2xl px-8 py-6 max-w-md mx-auto space-y-1"
        >
          <p className="font-serif text-lg text-logo-black">
            Thank you for choosing DATA GARMENTS.
          </p>
          <p className="text-logo-black/55 text-sm">
            We appreciate your support and look forward to serving you.
          </p>
        </motion.div>
      </motion.div>
    </div>
  </div>
);

export default About;
