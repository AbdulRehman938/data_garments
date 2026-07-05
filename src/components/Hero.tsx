import { type Variants } from 'framer-motion';
import { motion } from 'framer-motion';
import { FiArrowRight, FiPlay } from 'react-icons/fi';

export const Hero = () => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      } as never,
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: 'easeOut' } as never,
    },
  };

  return (
    <section className="min-h-screen w-full flex flex-col justify-center items-center bg-bg-silk-glow relative overflow-hidden px-6 md:px-12 lg:px-16 py-20 pt-10 md:py-28 md:pt-16 lg:py-36 lg:pt-16">
      {/* Background ambient glowing circles */}
      <div className="absolute top-1/4 left-0 w-72 h-72 md:w-96 md:h-96 rounded-full bg-logo-rose/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 md:w-[450px] md:h-[450px] rounded-full bg-pop-orchid/5 blur-3xl pointer-events-none" />

      {/* Hero Content Container */}
      <div className="max-w-[1600px] w-full grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-20 items-center z-10">
        {/* Left Side: Typography & CTAs */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-6 flex flex-col justify-center text-left"
        >
          {/* Eyebrow Tagline */}
          <motion.span
            variants={itemVariants}
            className="font-sans text-xs md:text-sm tracking-[0.25em] text-action-bordeaux uppercase font-semibold mb-4"
          >
            Elegance In Every Thread
          </motion.span>

          {/* Main Heading */}
          <motion.h1
            variants={itemVariants}
            className="font-serif font-medium text-5xl md:text-6xl lg:text-[8rem] xl:text-[9rem] text-logo-black leading-[1.05] mb-8 tracking-[-0.03em]"
          >
            Redefining <br />
            <em className="text-logo-rose not-italic">Feminine</em> Luxury
          </motion.h1>

          {/* Body Copy */}
          <motion.p
            variants={itemVariants}
            className="font-sans text-sm md:text-base lg:text-lg text-logo-black/70 leading-relaxed max-w-xl mb-10"
          >
            Discover our summer capsule collection. Tailored minimalist designs, ethically crafted in silk, linen, and organic cotton to celebrate the modern woman.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-4 md:gap-6 mt-10"
          >
            <a
              href="/shop"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-action-bordeaux hover:bg-[#460416] text-white rounded-full font-sans font-semibold tracking-wide text-sm shadow-md transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
            >
              Shop Collection
              <FiArrowRight size={18} />
            </a>
            <a
              href="/lookbook"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-logo-rose/40 hover:border-logo-rose hover:bg-logo-rose/5 text-logo-black rounded-full font-sans font-semibold tracking-wide text-sm transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
            >
              <FiPlay size={16} className="text-logo-rose" />
              View Lookbook
            </a>
          </motion.div>
        </motion.div>

        {/* Right Side: Editorial Image Collage Placeholders */}
        <div className="lg:col-span-6 w-full flex justify-center items-center">
          <div className="relative w-full max-w-[600px] aspect-[4/5] sm:aspect-[0.9] lg:aspect-[0.85]">
            {/* Card 1 — Main Portrait (tall, left-center) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, -10, 0],
              }}
              transition={{
                opacity: { duration: 0.7, ease: 'easeOut' },
                scale: { duration: 0.7, ease: 'easeOut' },
                y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0 },
              }}
              className="absolute left-[6%] top-[8%] w-[55%] aspect-[3/4] bg-white border border-logo-rose/25 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:border-logo-rose/50 transition-all duration-300 group cursor-pointer"
            >
              <img
                src="https://res.cloudinary.com/di9tb45rl/image/upload/v1783257380/hero_portrait_uplkbr.jpg"
                alt="Pakistani embroidered lawn suit — editorial portrait"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </motion.div>

            {/* Card 2 — Detail Closeup (square, bottom-right) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, 8, 0],
              }}
              transition={{
                opacity: { duration: 0.7, ease: 'easeOut', delay: 0.2 },
                scale: { duration: 0.7, ease: 'easeOut', delay: 0.2 },
                y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
              }}
              className="absolute right-[3%] bottom-[4%] w-[40%] aspect-square bg-white border border-logo-rose/25 rounded-2xl shadow-md overflow-hidden hover:shadow-lg hover:border-logo-rose/50 transition-all duration-300 group cursor-pointer"
            >
              <img
                src="https://res.cloudinary.com/di9tb45rl/image/upload/v1783257380/hero_fabric_xvcw3d.jpg"
                alt="Pakistani lawn fabric embroidery detail"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </motion.div>

            {/* Card 3 — Lifestyle Landscape (wide, top-right) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, -6, 0],
              }}
              transition={{
                opacity: { duration: 0.7, ease: 'easeOut', delay: 0.4 },
                scale: { duration: 0.7, ease: 'easeOut', delay: 0.4 },
                y: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 },
              }}
              className="absolute right-[5%] top-[5%] w-[40%] aspect-[3/2] bg-white border border-logo-rose/25 rounded-xl shadow-md overflow-hidden hover:shadow-lg hover:border-logo-rose/50 transition-all duration-300 group cursor-pointer"
            >
              <img
                src="https://res.cloudinary.com/di9tb45rl/image/upload/v1783257380/hero_lifestyle_pk2j0z.jpg"
                alt="Pakistani women in printed lawn suits — lifestyle scene"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
