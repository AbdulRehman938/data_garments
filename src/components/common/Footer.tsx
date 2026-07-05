import { Link } from 'react-router-dom';
import { FaInstagram, FaTiktok, FaWhatsapp } from 'react-icons/fa';

const Footer = () => {
  const exploreLinks = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: 'About Us', path: '/about' },
    { name: 'Contact Us', path: '/contact' },
  ];

  const legalLinks = [
    { name: 'Privacy Policy', path: '/privacy' },
    { name: 'Terms & Conditions', path: '/terms' },
  ];

  return (
    <footer className="bg-pop-orchid/20 backdrop-blur-3xl rounded-t-2xl w-full mt-auto">
      {/* Main Footer Content */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16 py-12 md:py-16 pb-4 md:pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16">
          {/* Brand Info & Socials */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-5">
            <Link to="/" className="inline-block">
              <img
                src="/logo_header.avif"
                alt="Data Garments"
                className="h-10 md:h-12 w-auto object-contain"
                loading="eager"
              />
            </Link>
            <p className="font-sans text-sm text-logo-black/70 leading-relaxed max-w-sm">
              Premium garments designed for comfort, luxury, and everyday style. Explore our exclusive trendsetting capsule collections.
            </p>
            {/* Social Icons (Instagram, TikTok, WhatsApp Chat) */}
            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-logo-rose/10 flex items-center justify-center text-logo-black hover:text-logo-rose hover:bg-logo-rose/20 transition-all duration-300 cursor-pointer"
                aria-label="Instagram"
              >
                <FaInstagram size={20} />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-logo-rose/10 flex items-center justify-center text-logo-black hover:text-logo-rose hover:bg-logo-rose/20 transition-all duration-300 cursor-pointer"
                aria-label="TikTok"
              >
                <FaTiktok size={18} />
              </a>
              <a
                href="https://wa.me/yourphonenumber"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-logo-rose/10 flex items-center justify-center text-logo-black hover:text-logo-rose hover:bg-logo-rose/20 transition-all duration-300 cursor-pointer"
                aria-label="WhatsApp Chat"
              >
                <FaWhatsapp size={20} />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="col-span-1 flex flex-col gap-4">
            <h3 className="font-serif font-semibold text-lg text-logo-black">Explore</h3>
            <ul className="flex flex-col gap-3">
              {exploreLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="font-sans text-sm text-logo-black/70 hover:text-logo-rose transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal / Policy Links */}
          <div className="col-span-1 flex flex-col gap-4">
            <h3 className="font-serif font-semibold text-lg text-logo-black">Legal</h3>
            <ul className="flex flex-col gap-3">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="font-sans text-sm text-logo-black/70 hover:text-logo-rose transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp Community Button / CTA */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <h3 className="font-serif font-semibold text-lg text-logo-black">Join Our Community</h3>
            <p className="font-sans text-sm text-logo-black/70 leading-relaxed">
              Become part of our exclusive WhatsApp community. Get early access to new collections, drops, and VIP sales.
            </p>
            <a
              href="https://chat.whatsapp.com/yourcommunitylink"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full font-sans font-medium text-sm transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] shadow-md cursor-pointer"
            >
              <FaWhatsapp size={18} />
              WhatsApp Community
            </a>
          </div>
        </div>

        {/* Bottom Copyright bar */}
        <div className="mt-2 pt-6 border-t border-logo-rose/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
          <p className="font-sans text-xs text-logo-black/50">
            &copy; {new Date().getFullYear()} Data Garments. All rights reserved.
          </p>
          <p className="font-sans text-xs text-logo-black/50">
            Crafted for premium comfort.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;