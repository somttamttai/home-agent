import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTheme } from '../hooks/useTheme.js'

const NAV_ITEMS = [
  { path: '/',         icon: '🏠', label: '전체' },
  { path: '/category/욕실',     icon: '🛁', label: '욕실' },
  { path: '/category/주방',     icon: '🍳', label: '주방' },
  { path: '/category/세탁실',   icon: '🧺', label: '세탁실' },
  { path: '/category/청소',     icon: '🧹', label: '청소' },
  { path: '/category/침실',     icon: '🛏', label: '침실' },
  { path: '/category/드레스룸', icon: '👔', label: '드레스룸' },
]

const TOOL_ITEMS = [
  { path: '/add',     icon: '＋', label: '소모품 추가' },
  { path: '/compare', icon: '💰', label: '가격비교' },
]

export default function Sidebar() {
  const location = useLocation()
  const { signOut, household } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <NavLink to="/" className="sidebar-logo">
          <span className="icon">🏠</span>
          <span className="text">home-agent</span>
        </NavLink>
        {household?.name && (
          <div className="sidebar-household">{household.name}</div>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">카테고리</div>
        {NAV_ITEMS.map((it) => (
          <NavLink
            key={it.path}
            to={it.path}
            end={it.path === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="icon">{it.icon}</span>
            <span className="label">{it.label}</span>
          </NavLink>
        ))}

        <div className="sidebar-divider" />
        <div className="sidebar-section-label">도구</div>
        {TOOL_ITEMS.map((it) => (
          <NavLink
            key={it.path}
            to={it.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="icon">{it.icon}</span>
            <span className="label">{it.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="icon">⚙️</span>
          <span className="label">설정</span>
        </NavLink>
        <button type="button" className="sidebar-link" onClick={toggle}>
          <span className="icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="label">테마 전환</span>
        </button>
        <button type="button" className="sidebar-link" onClick={signOut}>
          <span className="icon">🚪</span>
          <span className="label">로그아웃</span>
        </button>
      </div>
    </aside>
  )
}
