import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NeuralCanvas from './NeuralCanvas';
import LogoIntroCanvas from './LogoIntroCanvas';
import { useScrollReveal } from './useScrollReveal';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  useScrollReveal();
  const [navVisible, setNavVisible] = useState(false);
  const [introStyle, setIntroStyle] = useState({ opacity: 1, transform: 'scale(1)' });

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const introHeight = window.innerHeight;
          const scrollProgress = Math.min(scrollY / (introHeight * 0.5), 1);

          // Fade and scale intro
          setIntroStyle({
            opacity: 1 - scrollProgress,
            transform: `scale(${1 - scrollProgress * 0.1})`
          });

          // Show nav after scrolling past intro
          setNavVisible(scrollY > introHeight * 0.3);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.querySelector(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-bg-mesh" />
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />
      <div className="landing-orb landing-orb-3" />

      {/* Logo Intro Section */}
      <section className="landing-logo-intro" style={introStyle}>
        <LogoIntroCanvas className="landing-logo-intro-canvas" />
        <div className="landing-logo-intro-content">
          <img src="/tethru-icon-color.svg" alt="tethru" className="landing-intro-logo-icon" />
          <div className="landing-logo-intro-text">
            <h1>tethru</h1>
            <p>AI-Powered Personal CRM</p>
          </div>
        </div>
        <div className="landing-scroll-indicator">
          <span>Scroll</span>
          <div className="landing-scroll-indicator-arrow"></div>
        </div>
      </section>

      {/* Navigation */}
      <nav className={`landing-nav ${navVisible ? 'visible' : ''}`}>
        <div className="landing-nav-logo">
          <img src="/tethru-icon-color.svg" alt="tethru" />
          <span>tethru</span>
        </div>
        <div className="landing-nav-links">
          <a href="#features" onClick={(e) => handleSmoothScroll(e, '#features')}>Features</a>
          <a href="#demo" onClick={(e) => handleSmoothScroll(e, '#demo')}>Demo</a>
          <a href="#pricing" onClick={(e) => handleSmoothScroll(e, '#pricing')}>Pricing</a>
          <Link to="/signup" className="landing-btn landing-btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <NeuralCanvas className="landing-neural-canvas" />

        <div className="landing-hero-badge">
          AI-Powered CRM
        </div>

        <h1>
          Your relationships,<br />
          <span className="gradient">intelligently managed</span>
        </h1>

        <p className="landing-hero-subtitle">
          tethru is an AI-first personal CRM that helps you nurture meaningful connections.
          Just tell it what you need in plain English.
        </p>

        <div className="landing-hero-cta">
          <Link to="/signup" className="landing-btn landing-btn-primary">
            Start for Free
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <a href="#demo" className="landing-btn landing-btn-glass" onClick={(e) => handleSmoothScroll(e, '#demo')}>
            See it in action
          </a>
        </div>

        <div className="landing-stats-bar">
          <div className="landing-stat">
            <div className="landing-stat-value">12</div>
            <div className="landing-stat-label">AI Tools</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-value">BYOK</div>
            <div className="landing-stat-label">Your API Keys</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-value">Sync</div>
            <div className="landing-stat-label">Web + Mobile</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-value">E2E</div>
            <div className="landing-stat-label">Encrypted</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features" id="features">
        <div className="landing-section-header landing-reveal">
          <div className="landing-section-tag">// capabilities</div>
          <h2 className="landing-section-title">Everything you need to<br />stay connected</h2>
          <p className="landing-section-subtitle">
            Powerful features wrapped in an interface so intuitive,
            you'll wonder how you managed without it.
          </p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card landing-reveal">
            <div className="landing-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2a4 4 0 0 1 4 4c0 1.1-.9 2-2 2h-4a2 2 0 0 1-2-2 4 4 0 0 1 4-4z" />
                <path d="M12 8v8" />
                <path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2" />
                <circle cx="12" cy="16" r="2" />
              </svg>
            </div>
            <h3 className="landing-feature-title">AI-First Interface</h3>
            <p className="landing-feature-desc">
              Chat naturally with your CRM. Search contacts, log interactions,
              create tasks - all through conversation. No forms, no friction.
            </p>
          </div>

          <div className="landing-feature-card landing-reveal">
            <div className="landing-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="landing-feature-title">Smart Contacts</h3>
            <p className="landing-feature-desc">
              Track birthdays, important dates, relationships between contacts.
              Get reminded before connections drift away.
            </p>
          </div>

          <div className="landing-feature-card landing-reveal">
            <div className="landing-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="landing-feature-title">Interaction Logging</h3>
            <p className="landing-feature-desc">
              Log calls, meetings, emails, coffee chats. Build a complete history
              of every relationship so you never forget context.
            </p>
          </div>

          <div className="landing-feature-card landing-reveal">
            <div className="landing-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M9 16l2 2 4-4" />
              </svg>
            </div>
            <h3 className="landing-feature-title">Task Management</h3>
            <p className="landing-feature-desc">
              Create follow-up tasks linked to contacts. Set due dates, priorities,
              and reminders. Never drop the ball on important relationships.
            </p>
          </div>

          <div className="landing-feature-card landing-reveal">
            <div className="landing-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12" y2="18" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
              </svg>
            </div>
            <h3 className="landing-feature-title">Cross-Platform Sync</h3>
            <p className="landing-feature-desc">
              Access your CRM from web or mobile. Real-time sync keeps everything
              in perfect harmony across all your devices.
            </p>
          </div>

          <div className="landing-feature-card landing-reveal">
            <div className="landing-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <h3 className="landing-feature-title">BYOK Security</h3>
            <p className="landing-feature-desc">
              Bring Your Own Key. Use your Gemini or OpenAI API key.
              Your data stays yours, encrypted end-to-end.
            </p>
          </div>
        </div>
      </section>

      {/* AI Demo Section */}
      <section className="landing-ai-demo" id="demo">
        <div className="landing-ai-demo-container">
          <div className="landing-ai-demo-content landing-reveal">
            <div className="landing-section-tag">// natural language</div>
            <h2>Just ask.<br />AI handles the rest.</h2>
            <p>
              No more clicking through menus. Tell tethru what you need
              in plain English and watch it work. Search, create, update -
              all through natural conversation.
            </p>
            <div className="landing-ai-tools-list">
              <span className="landing-ai-tool-tag">searchContacts</span>
              <span className="landing-ai-tool-tag">addContact</span>
              <span className="landing-ai-tool-tag">logInteraction</span>
              <span className="landing-ai-tool-tag">createTask</span>
              <span className="landing-ai-tool-tag">getStats</span>
              <span className="landing-ai-tool-tag">updateContact</span>
              <span className="landing-ai-tool-tag">searchTasks</span>
              <span className="landing-ai-tool-tag">+5 more</span>
            </div>
          </div>

          <div className="landing-chat-mockup landing-reveal">
            <div className="landing-chat-header">
              <div className="landing-chat-header-dot"></div>
              <div className="landing-chat-header-dot"></div>
              <div className="landing-chat-header-dot"></div>
            </div>
            <div className="landing-chat-messages">
              <div className="landing-chat-message user">
                Who haven't I talked to in a while?
              </div>
              <div className="landing-chat-message ai">
                I found 3 contacts you haven't connected with recently: Sarah Chen (45 days), Mike Johnson (38 days), and Alex Rivera (32 days). Would you like me to create follow-up tasks for them?
              </div>
              <div className="landing-chat-message user">
                Yes, and remind me about Sarah's birthday coming up
              </div>
              <div className="landing-chat-message ai">
                Done! I've created follow-up tasks for all three. Sarah's birthday is January 15th - I've added a reminder for January 14th so you can send her a message.
              </div>
              <div className="landing-typing-indicator">
                <div className="landing-typing-dot"></div>
                <div className="landing-typing-dot"></div>
                <div className="landing-typing-dot"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta" id="pricing">
        <div className="landing-cta-card landing-reveal">
          <h2>Ready to transform how you<br />manage relationships?</h2>
          <p>
            Start for free. No credit card required. Bring your own AI key.
          </p>
          <div className="landing-cta-buttons">
            <Link to="/signup" className="landing-btn landing-btn-primary">
              Get Started Free
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-glass">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-logo">
            <img src="/tethru-icon-color.svg" alt="tethru" />
            <span style={{ fontWeight: 600 }}>tethru</span>
          </div>
          <div className="landing-footer-links">
            <a href="#features" onClick={(e) => handleSmoothScroll(e, '#features')}>Features</a>
            <a href="#demo" onClick={(e) => handleSmoothScroll(e, '#demo')}>Demo</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
          <div className="landing-footer-copy">
            &copy; 2025 tethru. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
