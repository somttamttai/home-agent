import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Scan from './pages/Scan.jsx'
import Receipt from './pages/Receipt.jsx'
import PriceCompare from './pages/PriceCompare.jsx'
import Add from './pages/Add.jsx'
import { ToastProvider } from './components/Toast.jsx'

function Header() {
  const { pathname } = useLocation()
  const titles = {
    '/': '🏠 home-agent',
    '/scan': '📷 바코드 스캔',
    '/receipt': '🧾 영수증',
    '/compare': '💰 가격비교',
    '/add': '➕ 소모품 추가',
  }
  return (
    <div className="header">
      <h1>{titles[pathname] || 'home-agent'}</h1>
      <div className="sub">집안 소모품 재고/가격 관리</div>
    </div>
  )
}

function TabBar() {
  return (
    <nav className="tabbar">
      <NavLink to="/" end>
        <span className="icon">🏠</span>홈
      </NavLink>
      <NavLink to="/scan">
        <span className="icon">📷</span>스캔
      </NavLink>
      <NavLink to="/add" className="tab-add">
        <span className="icon">➕</span>추가
      </NavLink>
      <NavLink to="/compare">
        <span className="icon">💰</span>가격비교
      </NavLink>
      <NavLink to="/receipt">
        <span className="icon">🧾</span>영수증
      </NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <div className="app">
        <Header />
        <div className="page">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/add" element={<Add />} />
            <Route path="/compare" element={<PriceCompare />} />
            <Route path="/receipt" element={<Receipt />} />
          </Routes>
        </div>
        <TabBar />
      </div>
    </ToastProvider>
  )
}
