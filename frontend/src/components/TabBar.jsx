import { NavLink } from 'react-router-dom'

export default function TabBar() {
  return (
    <nav className="tabbar">
      <NavLink to="/" end>
        <span className="icon">🛒</span>소모품
      </NavLink>
      <NavLink to="/fridge">
        <span className="icon">🧊</span>냉장고
      </NavLink>
      <NavLink to="/schedule">
        <span className="icon">📅</span>일정
      </NavLink>
      <NavLink to="/more">
        <span className="icon">➕</span>더보기
      </NavLink>
    </nav>
  )
}
