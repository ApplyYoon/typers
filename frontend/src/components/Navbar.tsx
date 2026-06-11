import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: '학교대항전', path: '/battle' },
    { label: '타이핑', path: '/typing' },
    { label: '로드맵', path: '/roadmap' },
    { label: '커스텀', path: '/custom' },
    { label: '랭크전', path: '/real-battle' },
    { label: '랭킹', path: '/ranking' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/home" className="navbar-logo">
          <img src="/logo_nbg.png" alt="Typers" className="navbar-logo-img" />
          <span>Typers</span>
        </Link>

        <div className="navbar-links">
          {navItems.map((item) => (
            <div key={item.label} className="navbar-item">
              <Link
                to={item.path}
                className={`navbar-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            </div>
          ))}
        </div>

        <div className="navbar-right">
          <Link to="/profile" className="navbar-user">
            <img src="/logo_nbg.png" alt="logo" className="navbar-avatar" />
            <span className="navbar-username">1KO</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
