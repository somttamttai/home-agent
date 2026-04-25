import { useNavigate } from 'react-router-dom'

const ITEMS = [
  { icon: '📅', title: '일정',   sub: '개발 중',  to: '/schedule', ready: false },
  { icon: '✈️', title: '여행',   sub: '준비 중',  to: null,        ready: false },
  { icon: '💰', title: '가계부', sub: '준비 중',  to: null,        ready: false },
  { icon: '🏥', title: '건강',   sub: '준비 중',  to: null,        ready: false },
  { icon: '⚙️', title: '설정',   sub: '계정·가족·집 관리', to: '/settings', ready: true },
]

export default function More() {
  const nav = useNavigate()
  return (
    <div className="page-enter">
      <div className="page">
        <h1 className="page-title">더보기</h1>
        <div className="more-list">
          {ITEMS.map((it) => (
            <button
              key={it.title}
              type="button"
              className={`more-item ${it.ready ? '' : 'disabled'}`}
              onClick={() => it.to && nav(it.to)}
            >
              <span className="more-icon">{it.icon}</span>
              <span className="more-text">
                <span className="t">{it.title}</span>
                <span className="s">{it.sub}</span>
              </span>
              <span className="more-arrow">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
