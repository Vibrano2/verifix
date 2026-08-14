import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleUserRound,
  Droplets,
  FilePenLine,
  Hammer,
  Instagram,
  Linkedin,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  PaintRoller,
  Phone,
  ShieldCheck,
  Sparkles,
  Tag,
  UsersRound,
  Wrench,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type IconProps = { size?: number; className?: string };

type OrbitItem = {
  label: string;
  Icon: LucideIcon;
  position: string;
};

const orbitItems: OrbitItem[] = [
  { label: 'Plumbing', Icon: Droplets, position: 'orbit-top' },
  { label: 'Carpentry', Icon: Hammer, position: 'orbit-right-top' },
  { label: 'Painting', Icon: PaintRoller, position: 'orbit-right-bottom' },
  { label: 'Drain cleaning', Icon: Droplets, position: 'orbit-bottom-left' },
  { label: 'Pipe installation', Icon: Wrench, position: 'orbit-left-bottom' },
  { label: 'Electrical', Icon: Zap, position: 'orbit-left-top' },
];

const trustItems: { title: string; description: string; Icon: LucideIcon }[] = [
  { title: 'Verified Artisans', description: 'Background checked', Icon: ShieldCheck },
  { title: 'Secure Payments', description: 'Escrow protected', Icon: LockKeyhole },
  { title: 'Fair Pricing', description: 'No hidden fees', Icon: Tag },
];

const steps: { number: string; title: string; description: string; Icon: LucideIcon }[] = [
  { number: '1', title: 'Post a Job', description: 'Tell us what you need\nand we will.', Icon: FilePenLine },
  { number: '2', title: 'Get Matched', description: 'We connect you with\nverified artisans near you.', Icon: UsersRound },
  { number: '3', title: 'Job Done', description: 'Approve the work and pay\nonly when you are satisfied.', Icon: ShieldCheck },
];

function ArtivaMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup${compact ? ' brand-lockup-compact' : ''}`} aria-label="Artiva, verified, fast protected">
      <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
        <path className="mark-shield" d="M32 4 53 12v17c0 14-8.8 24.7-21 30C19.8 53.7 11 43 11 29V12L32 4Z" />
        <path className="mark-tool" d="m20 39 18-18m-13 5 5 5m5-13 4-4a6 6 0 0 1 7-1l-5 5 3 3 5-5a6 6 0 0 1-1 7l-4 4" />
        <path className="mark-star" d="m47 5 2.2 5.1 5.5.5-4.1 3.6 1.2 5.3-4.8-2.8-4.8 2.8 1.2-5.3-4.1-3.6 5.5-.5L47 5Z" />
        <path className="mark-speed" d="M3 37h12M7 43h9M11 49h8" />
      </svg>
      <div>
        <div className="brand-name">Artiva</div>
        <div className="brand-tagline">verified, fast protected</div>
      </div>
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="hero-artwork" aria-label="Artiva shield with crossed tools and trade icons">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      {orbitItems.map(({ label, Icon, position }) => (
        <div className={`orbit-icon ${position}`} key={label} title={label}>
          <Icon size={25} strokeWidth={1.35} />
        </div>
      ))}
      <div className="art-glow" />
      <svg className="hero-shield" viewBox="0 0 300 300" aria-hidden="true">
        <defs>
          <linearGradient id="shieldLine" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#19d6f2" />
            <stop offset="1" stopColor="#008db5" />
          </linearGradient>
          <filter id="softGlow"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
        <path d="M150 23 246 58v77c0 61-39 108-96 135-57-27-96-74-96-135V58l96-35Z" fill="#061b2b" stroke="#00b8dc" strokeWidth="9" />
        <path d="M150 42 228 70v64c0 50-30 89-78 114-48-25-78-64-78-114V70l78-28Z" fill="none" stroke="#073b55" strokeWidth="4" />
        <path d="m98 175 83-83M139 108l31 31m-3-34 18-18c9-9 22-11 33-6l-21 21 15 15 21-21c5 11 3 24-6 33l-18 18" fill="none" stroke="#f5f7f7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="17" />
        <path d="M81 178h51M70 191h42M60 204h32" stroke="#f5b900" strokeLinecap="round" strokeWidth="8" />
        <path d="m226 38 5.7 13.1 14.3 1.3-10.8 9.5 3.2 14-12.4-7.4-12.4 7.4 3.2-14-10.8-9.5 14.3-1.3L226 38Z" fill="#ffc400" />
      </svg>
      <div className="art-platform"><span /></div>
    </div>
  );
}

function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a href="#home" className="logo-link"><ArtivaMark /></a>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="active" href="#home">Home</a>
          <a href="#artisans">Find Artisans</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#become-artisan">Become an Artisan</a>
          <a href="#jobs">Jobs</a>
          <a href="#about">About Us</a>
        </nav>
        <div className="header-actions">
          <a className="login-link" href="#login">Log in</a>
          <a className="signup-link" href="#signup"><CircleUserRound size={16} /> <span>Sign up<small>Phone + OTP</small></span></a>
        </div>
        <button className="mobile-menu" aria-label="Open menu"><Menu size={22} /></button>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-copy">
            <h1>Get quality work<br />done by <span>trusted<br />artisans.</span></h1>
            <p>Artiva connects you with verified, skilled, and reliable<br className="desktop-only" /> artisans for any job — fast, secure, and hassle-free.</p>
            <div className="hero-actions">
              <a className="primary-button" href="#artisans">Find an Artisan <ArrowRight size={22} /></a>
              <a className="secondary-button" href="#become-artisan"><HardHatIcon /> I&apos;m an Artisan</a>
            </div>
            <div className="trust-row">
              {trustItems.map(({ title, description, Icon }) => (
                <div className="trust-item" key={title}>
                  <Icon size={32} strokeWidth={1.45} />
                  <div><strong>{title}</strong><span>{description}</span></div>
                </div>
              ))}
            </div>
          </div>
          <HeroArtwork />
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading"><h2>How Artiva Works</h2><p>Getting your job done is simple in just 3 easy steps.</p></div>
          <div className="steps-row">
            {steps.map(({ number, title, description, Icon }, index) => (
              <div className="step-wrap" key={title}>
                <div className="step-card"><Icon size={42} strokeWidth={1.35} /></div>
                <div className="step-number">{number}</div>
                <div className="step-copy"><h3>{title}</h3><p>{description}</p></div>
                {index < steps.length - 1 && <ChevronRight className="step-arrow" size={24} strokeWidth={1} />}
              </div>
            ))}
          </div>
          <div className="escrow-callout"><LockKeyhole size={26} strokeWidth={1.45} /><p>Your payment is held securely in escrow.<br /><span>Pay only when the job is done to your satisfaction.</span></p></div>
        </section>
      </main>

      <footer className="site-footer" id="about">
        <div className="footer-brand"><ArtivaMark compact /><p>Connecting you with verified, skilled,<br />and reliable artisans for any job —<br />fast, secure, and hassle-free.</p><div className="socials"><a href="#facebook" aria-label="Facebook"><CircleUserRound size={18} /></a><a href="#instagram" aria-label="Instagram"><Instagram size={18} /></a><a href="#twitter" aria-label="Twitter"><Sparkles size={17} /></a><a href="#linkedin" aria-label="LinkedIn"><Linkedin size={18} /></a></div></div>
        <FooterLinks title="Quick Links" links={['Home', 'Find Artisans', 'How It Works', 'Become an Artisan', 'Jobs', 'About Us']} />
        <FooterLinks title="For Artisans" links={['How It Works', 'Become an Artisan', 'Help Center']} />
        <FooterLinks title="For Clients" links={['How It Works', 'Safety & Security', 'Help Center']} />
        <div className="footer-contact"><h3>Contact Us</h3><p><Phone size={15} /> +234 800 123 4567</p><p><Mail size={15} /> hello@artiva.com</p><p><MapPin size={15} /> Life Camp, Abuja, Nigeria</p><div className="store-buttons"><span>GET IT ON<strong>Google Play</strong></span><span>Download on the<strong>App Store</strong></span></div></div>
        <div className="footer-bottom"><span>© 2025 Artiva. All rights reserved.</span><span>Terms of Service <i /> Privacy Policy</span></div>
      </footer>
    </div>
  );
}

function FooterLinks({ title, links }: { title: string; links: string[] }) {
  return <div className="footer-links"><h3>{title}</h3>{links.map((link) => <a href={`#${link.toLowerCase().replace(/ /g, '-')}`} key={link}>{link}</a>)}</div>;
}

function HardHatIcon({ size = 21, className = '' }: IconProps) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17h16M6 17v-2.8a6 6 0 0 1 12 0V17M12 8v6M5 20h14" /></svg>;
}

export default App;
