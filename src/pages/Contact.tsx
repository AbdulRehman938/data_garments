import { motion } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiPhone, 
  FiMail, 
  FiMapPin, 
  FiClock
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Contact = () => (
  <div className="bg-bg-silk-glow min-h-screen pb-24 font-sans">
    <div className="max-w-5xl mx-auto px-6 md:px-8 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-logo-rose hover:text-action-bordeaux text-sm font-semibold mb-10 transition-colors">
        <FiArrowLeft size={16} /> Back to Home
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left: Info Cards */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          className="space-y-6"
        >
          <div>
            <h1 className="font-serif text-4xl md:text-5xl text-logo-black mb-4">Get In Touch</h1>
            <p className="text-logo-black/60 text-lg leading-relaxed">
              Have questions about an order or need assistance? We're here to help you with all your fashion needs.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="space-y-4">
            {/* Phone */}
            <a href="tel:+923167797719" className="block">
              <div className="bg-white rounded-2xl border border-logo-rose/10 p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-action-bordeaux/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-action-bordeaux transition-all">
                    <FiPhone size={22} className="text-action-bordeaux group-hover:text-white transition-all" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-logo-black/50 mb-1">Phone</p>
                    <p className="text-lg font-semibold text-logo-black">+92 316 7797719</p>
                  </div>
                </div>
              </div>
            </a>

            {/* WhatsApp */}
            <a href="https://wa.me/923167797719" target="_blank" rel="noopener noreferrer" className="block">
              <div className="bg-white rounded-2xl border border-logo-rose/10 p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#25D366]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#25D366] transition-all">
                    <FaWhatsapp size={22} className="text-[#25D366] group-hover:text-white transition-all" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-logo-black/50 mb-1">WhatsApp</p>
                    <p className="text-lg font-semibold text-logo-black">+92 316 7797719</p>
                  </div>
                </div>
              </div>
            </a>

            {/* Email */}
            <a href="mailto:datagarments06@gmail.com" className="block">
              <div className="bg-white rounded-2xl border border-logo-rose/10 p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-logo-rose/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-logo-rose transition-all">
                    <FiMail size={22} className="text-logo-rose group-hover:text-white transition-all" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-logo-black/50 mb-1">Email</p>
                    <p className="text-lg font-semibold text-logo-black">datagarments06@gmail.com</p>
                  </div>
                </div>
              </div>
            </a>

            {/* Address */}
            <div className="bg-white rounded-2xl border border-logo-rose/10 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-pop-orchid/10 rounded-xl flex items-center justify-center shrink-0">
                  <FiMapPin size={22} className="text-pop-orchid" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-logo-black/50 mb-1">Address</p>
                  <p className="text-lg font-semibold text-logo-black">
                    School Bazaar near United General Store
                  </p>
                  <p className="text-sm text-logo-black/60 mt-1">Rahim Yar Khan, Pakistan</p>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-white rounded-2xl border border-logo-rose/10 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-energy-apricot/10 rounded-xl flex items-center justify-center shrink-0">
                  <FiClock size={22} className="text-energy-apricot" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-logo-black/50 mb-1">Business Hours</p>
                  <p className="text-lg font-semibold text-logo-black">
                    10:00 AM - 7:30 PM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right: Decorative Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.1 }}
        >
          <div className="bg-gradient-to-br from-action-bordeaux to-[#460416] rounded-3xl p-8 md:p-10 text-white h-full flex flex-col justify-center">
            <div className="mb-8 text-white">
              
              <p className="text-white/70 leading-relaxed">
                Experience our premium collections in person. Our friendly staff is ready to help you find the perfect outfit.
              </p>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <FiMapPin size={16} />
                </div>
                <span>Rahim Yar Khan, Punjab</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <FiClock size={16} />
                </div>
                <span>Daily: 10 AM to 7:30 PM</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <FaWhatsapp size={16} />
                </div>
                <span>Quick replies on WhatsApp</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </div>
);

export default Contact;
