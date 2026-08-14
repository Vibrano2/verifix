import React from 'react';
import { ArtivaLogo } from './ArtivaLogo';
import { useApp } from '../context/AppContext';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  const { navigateTo, showToast } = useApp();

  return (
    <footer className="bg-dark-footer text-muted border-t border-[#161f2d] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-6">
            <div className="cursor-pointer" onClick={() => navigateTo('home')}>
              <ArtivaLogo size="md" showWordmark={true} />
            </div>
            <p className="text-[13px] text-muted max-w-sm leading-relaxed">
              Connecting you with verified, skilled, and reliable artisans for any job — fast, secure, and hassle-free.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-4 text-white">
              <button type="button" onClick={() => showToast('Facebook is coming soon.', 'info')} aria-label="Facebook profile coming soon" className="w-8 h-8 rounded-full border border-[#16858F] bg-transparent flex items-center justify-center hover:bg-[#16858F]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16D4C6] transition-colors">
                <Facebook className="w-4 h-4 fill-current" />
              </button>
              <button type="button" onClick={() => showToast('Instagram is coming soon.', 'info')} aria-label="Instagram profile coming soon" className="w-8 h-8 rounded-full border border-[#16858F] bg-transparent flex items-center justify-center hover:bg-[#16858F]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16D4C6] transition-colors">
                <Instagram className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => showToast('X is coming soon.', 'info')} aria-label="X profile coming soon" className="w-8 h-8 rounded-full border border-[#16858F] bg-transparent flex items-center justify-center hover:bg-[#16858F]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16D4C6] transition-colors">
                <Twitter className="w-4 h-4 fill-current" />
              </button>
              <button type="button" onClick={() => showToast('LinkedIn is coming soon.', 'info')} aria-label="LinkedIn profile coming soon" className="w-8 h-8 rounded-full border border-[#16858F] bg-transparent flex items-center justify-center hover:bg-[#16858F]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16D4C6] transition-colors">
                <Linkedin className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white font-sans">
              Quick Links
            </h4>
            <ul className="space-y-3 text-[13px] text-muted">
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('home'); }} className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('find_artisans'); }} className="hover:text-white transition-colors">Find Artisans</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('how_it_works'); }} className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('become_artisan'); }} className="hover:text-white transition-colors">Become an Artisan</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('jobs_board'); }} className="hover:text-white transition-colors">Jobs</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('about_us'); }} className="hover:text-white transition-colors">About Us</a></li>
            </ul>
          </div>

          {/* For Artisans */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white font-sans">
              For Artisans
            </h4>
            <ul className="space-y-3 text-[13px] text-muted">
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('how_it_works'); }} className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('become_artisan'); }} className="hover:text-white transition-colors">Become an Artisan</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('help_center'); }} className="hover:text-white transition-colors">Help Center</a></li>
            </ul>
          </div>

          {/* For Clients */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white font-sans">
              For Clients
            </h4>
            <ul className="space-y-3 text-[13px] text-muted">
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('how_it_works'); }} className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('safety'); }} className="hover:text-white transition-colors">Safety & Security</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('help_center'); }} className="hover:text-white transition-colors">Help Center</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="lg:col-span-1 space-y-4">
            <h4 className="text-sm font-semibold text-white font-sans">
              Contact Us
            </h4>
            <ul className="space-y-3 text-[13px] text-muted">
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#16858F]" />
                <span>Phone: to be configured</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#16858F]" />
                <span>Email: to be configured</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#16858F]" />
                <span>Location: to be configured</span>
              </li>
            </ul>
            
            {/* Mobile App Store Badges */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => showToast('Google Play download is coming soon.', 'info')}
                aria-label="Get Artiva on Google Play"
                className="block w-[180px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16D4C6]"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                  alt="Get it on Google Play"
                  width="180"
                  height="53"
                  loading="lazy"
                />
              </button>
              <button
                type="button"
                onClick={() => showToast('App Store download is coming soon.', 'info')}
                aria-label="Download Artiva on the App Store"
                className="block w-[180px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16D4C6]"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                  alt="Download on the App Store"
                  width="180"
                  height="53"
                  loading="lazy"
                />
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#161f2d] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted">
          <p>© 2025 Artiva. All rights reserved.</p>
          
          <div className="flex items-center gap-6">
            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('terms'); }} className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('privacy'); }} className="hover:text-white transition-colors">Privacy Policy</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
