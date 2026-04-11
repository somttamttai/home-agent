import { NavLink } from 'react-router-dom'

export default function TabBar() {
  return (
    <nav className="tabbar">
      <NavLink to="/" end>
        <span className="icon">🏠</span>홈
      </NavLink>
      <NavLink to="/scan">
        <span className="icon">📷</span>스캔
      </NavLink>
      <NavLink to="/add" className="tab-add">
        <span className="icon">＋</span>추가
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
