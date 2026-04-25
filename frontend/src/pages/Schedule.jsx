import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

const VIEWS = [
  { id: 'today', label: '오늘' },
  { id: 'week',  label: '이번주' },
  { id: 'month', label: '월간' },
]

const CHORE_PRESETS = [
  { title: '청소기',     emoji: '🧹' },
  { title: '설거지',     emoji: '🍽️' },
  { title: '분리수거',   emoji: '🗑️' },
  { title: '화장실청소', emoji: '🚿' },
  { title: '빨래',       emoji: '🧺' },
  { title: '장보기',     emoji: '🛒' },
  { title: '창문닦기',   emoji: '🪟' },
  { title: '냉장고정리', emoji: '🧊' },
]

const REPEAT_OPTIONS = [
  { id: 'none',    label: '안함' },
  { id: 'daily',   label: '매일' },
  { id: 'weekly',  label: '매주' },
  { id: 'monthly', label: '매월' },
]

const DOW_LABELS = ['일','월','화','수','목','금','토']

// ── helpers ────────────────────────────────────────────────────────
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function formatKoreanDate(d) {
  return `${d.getMonth()+1}월 ${d.getDate()}일 ${DOW_LABELS[d.getDay()]}요일`
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function getMonthStart(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function getWeekStart(d) {
  const x = new Date(d); const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff); x.setHours(0,0,0,0); return x
}

function isChoreActiveOn(chore, date) {
  const day = date.getDay()
  const dom = date.getDate()
  switch (chore.repeat_type) {
    case 'none':    return true
    case 'daily':   return true
    case 'weekly':  return chore.repeat_day === day
    case 'monthly': return chore.repeat_day === dom
    default: return false
  }
}

function getAssigneeName(chore, membersById) {
  if (chore.assignee_id) {
    return membersById[chore.assignee_id]?.name || null
  }
  const rm = chore.rotation_members || []
  if (rm.length > 0) {
    const id = rm[(chore.rotation_index ?? 0) % rm.length]
    return membersById[id]?.name || null
  }
  return null
}

// ── Schedule (main) ───────────────────────────────────────────────
export default function Schedule() {
  const toast = useToast()
  const { authHeaders, user } = useAuth()
  const [view, setView] = useState('today')
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [chores, setChores] = useState([])
  const [schedules, setSchedules] = useState([])
  const [members, setMembers] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(null) // 'chore' | 'schedule'
  const [loading, setLoading] = useState(true)

  const membersById = useMemo(() => {
    const m = {}
    for (const x of members) m[x.user_id] = x
    return m
  }, [members])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [c, s, mem] = await Promise.all([
        fetch('/api/chores',            { headers: authHeaders() }).then((r) => r.ok ? r.json() : { items: [] }),
        fetch('/api/schedules',         { headers: authHeaders() }).then((r) => r.ok ? r.json() : { items: [] }),
        fetch('/api/household-members', { headers: authHeaders() }).then((r) => r.ok ? r.json() : { members: [] }),
      ])
      setChores(c.items || [])
      setSchedules(s.items || [])
      setMembers(mem.members || [])
    } catch {
      toast('불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [authHeaders, toast])

  useEffect(() => { loadAll() }, [loadAll])

  const claimChore = async (chore) => {
    if (!user?.id) return
    try {
      const r = await fetch(`/api/chores?id=${chore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ assignee_id: user.id }),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      setChores((prev) => prev.map((c) => (c.id === chore.id ? updated : c)))
      toast('내 담당으로 변경됐어요 🙋')
    } catch { toast('변경 실패') }
  }

  const advanceRotation = async (chore) => {
    try {
      const r = await fetch(`/api/chores?id=${chore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ action: 'advance_rotation' }),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      setChores((prev) => prev.map((c) => (c.id === chore.id ? updated : c)))
      toast('다음 차례로 넘겼어요 🔄')
    } catch { toast('변경 실패') }
  }

  const deleteChore = async (chore) => {
    if (!confirm(`"${chore.title}" 삭제할까요?`)) return
    try {
      const r = await fetch(`/api/chores?id=${chore.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) throw new Error()
      setChores((prev) => prev.filter((c) => c.id !== chore.id))
    } catch { toast('삭제 실패') }
  }

  const deleteSchedule = async (s) => {
    if (!confirm(`"${s.title}" 삭제할까요?`)) return
    try {
      const r = await fetch(`/api/schedules?id=${s.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) throw new Error()
      setSchedules((prev) => prev.filter((x) => x.id !== s.id))
    } catch { toast('삭제 실패') }
  }

  const onCreatedChore = (created) => { setChores((prev) => [...prev, created]); setAdding(null); setShowAdd(false); toast('집안일 추가됨 ✨') }
  const onCreatedSchedule = (created) => { setSchedules((prev) => [...prev, created]); setAdding(null); setShowAdd(false); toast('일정 추가됨 ✨') }

  const pickDate = (d) => { setSelectedDate(d); setView('today') }

  return (
    <div className="page-enter">
      <div className="page schedule-page">
        <h1 className="page-title">일정</h1>

        <div className="subtabs">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`subtab ${view === v.id ? 'active' : ''}`}
              onClick={() => setView(v.id)}
            >{v.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="empty"><div className="spinner" /><div style={{ marginTop: 14 }}>불러오는 중…</div></div>
        ) : (
          <>
            {view === 'today' && (
              <TodayView
                date={selectedDate}
                chores={chores}
                schedules={schedules}
                membersById={membersById}
                currentUserId={user?.id}
                onClaim={claimChore}
                onAdvance={advanceRotation}
                onDeleteChore={deleteChore}
                onDeleteSchedule={deleteSchedule}
              />
            )}
            {view === 'week' && (
              <WeekView
                anchorDate={selectedDate}
                chores={chores}
                schedules={schedules}
                onPickDate={pickDate}
              />
            )}
            {view === 'month' && (
              <MonthView
                anchorDate={selectedDate}
                chores={chores}
                schedules={schedules}
                onPickDate={pickDate}
                onChangeMonth={(d) => setSelectedDate(d)}
              />
            )}
          </>
        )}

        <button type="button" className="schedule-fab" onClick={() => setShowAdd(true)} aria-label="추가">＋</button>

        {showAdd && !adding && (
          <QuickAddSheet
            onPickChore={() => setAdding('chore')}
            onPickSchedule={() => setAdding('schedule')}
            onCancel={() => setShowAdd(false)}
          />
        )}
        {adding === 'chore' && (
          <ChoreAddModal
            members={members}
            authHeaders={authHeaders}
            onSaved={onCreatedChore}
            onCancel={() => { setAdding(null); setShowAdd(false) }}
          />
        )}
        {adding === 'schedule' && (
          <ScheduleAddModal
            initialDate={selectedDate}
            authHeaders={authHeaders}
            onSaved={onCreatedSchedule}
            onCancel={() => { setAdding(null); setShowAdd(false) }}
          />
        )}
      </div>
    </div>
  )
}

// ── Today ─────────────────────────────────────────────────────────
function TodayView({ date, chores, schedules, membersById, currentUserId, onClaim, onAdvance, onDeleteChore, onDeleteSchedule }) {
  const todayChores  = chores.filter((c) => isChoreActiveOn(c, date))
  const todaySchedules = schedules.filter((s) => s.schedule_date === dateKey(date))
  const isToday = isSameDay(date, new Date())

  return (
    <div className="subtab-content">
      <div className="date-header">
        <span className="big">{formatKoreanDate(date)}</span>
        {!isToday && <span className="not-today">(선택한 날)</span>}
      </div>

      <h2 className="section-header">{isToday ? '오늘의 집안일' : '집안일'}</h2>
      {todayChores.length === 0 ? (
        <div className="empty mini"><div>오늘은 계획된 집안일이 없어요</div></div>
      ) : (
        <div className="chore-list">
          {todayChores.map((c) => (
            <ChoreCard
              key={c.id}
              chore={c}
              membersById={membersById}
              currentUserId={currentUserId}
              onClaim={() => onClaim(c)}
              onAdvance={() => onAdvance(c)}
              onDelete={() => onDeleteChore(c)}
            />
          ))}
        </div>
      )}

      <h2 className="section-header" style={{ marginTop: 20 }}>{isToday ? '오늘의 일정' : '일정'}</h2>
      {todaySchedules.length === 0 ? (
        <div className="empty mini"><div>등록된 일정이 없어요</div></div>
      ) : (
        <div className="schedule-list">
          {todaySchedules.map((s) => (
            <ScheduleRow key={s.id} schedule={s} onDelete={() => onDeleteSchedule(s)} />
          ))}
        </div>
      )}
    </div>
  )
}

function ChoreCard({ chore, membersById, currentUserId, onClaim, onAdvance, onDelete }) {
  const name = getAssigneeName(chore, membersById)
  const isMe = chore.assignee_id && chore.assignee_id === currentUserId
  const hasRotation = (chore.rotation_members || []).length > 0

  return (
    <div className={`chore-card ${isMe ? 'mine' : ''}`}>
      <span className="emoji">{chore.emoji}</span>
      <div className="body">
        <div className="msg">
          {name
            ? <><strong>{name}</strong>님 <strong>{chore.title}</strong> 차례예요, 잘 부탁해요 {chore.emoji}</>
            : <>오늘 <strong>{chore.title}</strong> 날이에요, 잘 부탁해요 {chore.emoji}</>}
        </div>
        <div className="actions">
          {!name && (
            <button type="button" className="btn small" onClick={onClaim}>내가 할게요</button>
          )}
          {hasRotation && (
            <button type="button" className="btn small tonal" onClick={onAdvance}>다음 차례 →</button>
          )}
          <button type="button" className="ghost-btn" onClick={onDelete} aria-label="삭제">🗑️</button>
        </div>
      </div>
    </div>
  )
}

function ScheduleRow({ schedule, onDelete }) {
  return (
    <div className="schedule-row">
      <span className="emoji">{schedule.emoji}</span>
      <div className="body">
        <div className="title">{schedule.title}</div>
        {schedule.memo && <div className="memo">{schedule.memo}</div>}
      </div>
      <button type="button" className="ghost-btn" onClick={onDelete} aria-label="삭제">×</button>
    </div>
  )
}

// ── Week ──────────────────────────────────────────────────────────
function WeekView({ anchorDate, chores, schedules, onPickDate }) {
  const start = getWeekStart(anchorDate)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d
  })
  const today = new Date()

  return (
    <div className="subtab-content">
      <div className="week-grid">
        {days.map((d, i) => {
          const dayChores = chores.filter((c) => isChoreActiveOn(c, d))
          const daySchedules = schedules.filter((s) => s.schedule_date === dateKey(d))
          const isToday = isSameDay(d, today)
          return (
            <button
              key={dateKey(d)}
              type="button"
              className={`week-day-card ${isToday ? 'today' : ''}`}
              onClick={() => onPickDate(d)}
            >
              <div className="head">
                <span className="dow">{DOW_LABELS[i === 6 ? 0 : i + 1] /* monday-start */}</span>
                <span className="dom">{d.getDate()}</span>
              </div>
              {dayChores.length > 0 && (
                <div className="line">🧹 {dayChores.length}건</div>
              )}
              {daySchedules.length > 0 && (
                <div className="line">📅 {daySchedules.length}건</div>
              )}
              {dayChores.length === 0 && daySchedules.length === 0 && (
                <div className="line dim">없음</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Month ─────────────────────────────────────────────────────────
function MonthView({ anchorDate, chores, schedules, onPickDate, onChangeMonth }) {
  const monthStart = getMonthStart(anchorDate)
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
  // 달력 시작: 해당 월 1일이 속한 주의 일요일
  const gridStart = new Date(monthStart)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart); d.setDate(d.getDate() + i); return d
  })
  const today = new Date()

  const shiftMonth = (delta) => {
    const d = new Date(monthStart)
    d.setMonth(d.getMonth() + delta)
    onChangeMonth(d)
  }

  return (
    <div className="subtab-content">
      <div className="month-nav">
        <button type="button" onClick={() => shiftMonth(-1)}>‹</button>
        <span>{monthStart.getFullYear()}년 {monthStart.getMonth()+1}월</span>
        <button type="button" onClick={() => shiftMonth(1)}>›</button>
      </div>
      <div className="month-dow">
        {['일','월','화','수','목','금','토'].map((d, i) => (
          <span key={d} className={i === 0 ? 'sun' : i === 6 ? 'sat' : ''}>{d}</span>
        ))}
      </div>
      <div className="month-grid">
        {days.map((d) => {
          const inMonth = d.getMonth() === monthStart.getMonth()
          const hasChore = chores.some((c) => isChoreActiveOn(c, d))
          const hasSchedule = schedules.some((s) => s.schedule_date === dateKey(d))
          const isToday = isSameDay(d, today)
          return (
            <button
              key={dateKey(d)}
              type="button"
              className={`month-cell ${inMonth ? '' : 'out'} ${isToday ? 'today' : ''}`}
              onClick={() => onPickDate(d)}
            >
              <span className="num">{d.getDate()}</span>
              <span className="dots">
                {hasChore    && <span className="dot chore" />}
                {hasSchedule && <span className="dot sched" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Quick add bottom sheet ────────────────────────────────────────
function QuickAddSheet({ onPickChore, onPickSchedule, onCancel }) {
  return (
    <div className="sched-modal-overlay" onClick={onCancel}>
      <div className="sched-quick-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <button type="button" className="quick-pick" onClick={onPickChore}>
          <span className="emoji">🧹</span>
          <span className="info">
            <span className="t">집안일 추가</span>
            <span className="s">청소·설거지·분리수거 등</span>
          </span>
          <span className="arrow">›</span>
        </button>
        <button type="button" className="quick-pick" onClick={onPickSchedule}>
          <span className="emoji">📅</span>
          <span className="info">
            <span className="t">일정 추가</span>
            <span className="s">병원·약속·기념일 등</span>
          </span>
          <span className="arrow">›</span>
        </button>
        <button type="button" className="btn tonal block" onClick={onCancel} style={{ marginTop: 8 }}>닫기</button>
      </div>
    </div>
  )
}

// ── Chore Add Modal ───────────────────────────────────────────────
function ChoreAddModal({ members, authHeaders, onSaved, onCancel }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('📋')
  const [repeatType, setRepeatType] = useState('weekly')
  const [repeatDay, setRepeatDay] = useState(1) // weekly: 1=월, monthly: 일자
  const [assigneeId, setAssigneeId] = useState('')
  const [rotationOn, setRotationOn] = useState(false)
  const [rotationMembers, setRotationMembers] = useState([])
  const [saving, setSaving] = useState(false)

  const pickPreset = (p) => { setTitle(p.title); setEmoji(p.emoji) }

  const toggleRotationMember = (uid) => {
    setRotationMembers((prev) => prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid])
  }

  const submit = async (e) => {
    e?.preventDefault()
    const t = title.trim()
    if (!t) return
    setSaving(true)
    try {
      const body = {
        title: t,
        emoji: emoji || '📋',
        repeat_type: repeatType,
        repeat_day: repeatType === 'weekly' ? Number(repeatDay) : repeatType === 'monthly' ? Number(repeatDay) : null,
      }
      if (rotationOn && rotationMembers.length > 0) {
        body.rotation_members = rotationMembers
        body.assignee_id = rotationMembers[0]
      } else if (assigneeId) {
        body.assignee_id = assigneeId
      }
      const r = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error()
      onSaved(await r.json())
    } catch {
      toast('추가 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sched-modal-overlay" onClick={onCancel}>
      <div className="sched-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="picked-emoji">{emoji}</span>
          <div className="title">집안일 추가</div>
        </div>

        <form onSubmit={submit} className="modal-body">
          <div className="field">
            <span>자주 하는 집안일</span>
            <div className="preset-grid">
              {CHORE_PRESETS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  className={`preset-btn ${title === p.title ? 'active' : ''}`}
                  onClick={() => pickPreset(p)}
                >
                  <span className="e">{p.emoji}</span>
                  <span className="t">{p.title}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>이름 (직접 입력)</span>
            <input
              className="search-input"
              placeholder="예: 욕조 청소"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <div className="field">
            <span>반복</span>
            <div className="seg-group">
              {REPEAT_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`seg ${repeatType === o.id ? 'active' : ''}`}
                  onClick={() => setRepeatType(o.id)}
                >{o.label}</button>
              ))}
            </div>
          </div>

          {repeatType === 'weekly' && (
            <div className="field">
              <span>요일</span>
              <div className="seg-group">
                {DOW_LABELS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    className={`seg ${Number(repeatDay) === i ? 'active' : ''}`}
                    onClick={() => setRepeatDay(i)}
                  >{d}</button>
                ))}
              </div>
            </div>
          )}

          {repeatType === 'monthly' && (
            <label className="field">
              <span>매월 며칠</span>
              <input
                type="number" min="1" max="31"
                className="search-input"
                value={repeatDay}
                onChange={(e) => setRepeatDay(e.target.value)}
              />
            </label>
          )}

          <div className="field">
            <span>담당자</span>
            <select
              className="search-input"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={rotationOn}
            >
              <option value="">담당자 없음</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
            </select>
          </div>

          {members.length > 1 && (
            <div className="field">
              <label className="check-row">
                <input type="checkbox" checked={rotationOn} onChange={(e) => setRotationOn(e.target.checked)} />
                <span>로테이션 (자동으로 돌아가며 담당)</span>
              </label>
              {rotationOn && (
                <div className="rotation-pick">
                  {members.map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      className={`pick-chip ${rotationMembers.includes(m.user_id) ? 'active' : ''}`}
                      onClick={() => toggleRotationMember(m.user_id)}
                    >
                      {rotationMembers.indexOf(m.user_id) >= 0 && (
                        <span className="order">{rotationMembers.indexOf(m.user_id) + 1}</span>
                      )}
                      {m.name}
                    </button>
                  ))}
                  <div className="hint">탭한 순서대로 돌아가요</div>
                </div>
              )}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn tonal" onClick={onCancel} disabled={saving}>취소</button>
            <button type="submit" className="btn" disabled={saving || !title.trim()}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Schedule Add Modal ────────────────────────────────────────────
function ScheduleAddModal({ initialDate, authHeaders, onSaved, onCancel }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('📅')
  const [date, setDate] = useState(() => dateKey(initialDate || new Date()))
  const [memo, setMemo] = useState('')
  const [isShared, setIsShared] = useState(true)
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e?.preventDefault()
    const t = title.trim()
    if (!t || !date) return
    setSaving(true)
    try {
      const r = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          title: t,
          emoji: emoji || '📅',
          schedule_date: date,
          memo: memo.trim() || null,
          is_shared: isShared,
        }),
      })
      if (!r.ok) throw new Error()
      onSaved(await r.json())
    } catch {
      toast('추가 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sched-modal-overlay" onClick={onCancel}>
      <div className="sched-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="picked-emoji">{emoji}</span>
          <div className="title">일정 추가</div>
        </div>

        <form onSubmit={submit} className="modal-body">
          <label className="field">
            <span>날짜</span>
            <input type="date" className="search-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <label className="field">
            <span>제목</span>
            <input className="search-input" placeholder="예: 병원 예약" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </label>

          <label className="field">
            <span>이모지</span>
            <input className="search-input" placeholder="📅" value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} maxLength={4} />
          </label>

          <label className="field">
            <span>메모 (선택)</span>
            <textarea
              className="search-input"
              rows={3}
              placeholder="자세한 내용을 적어보세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              style={{ resize: 'vertical', minHeight: 60 }}
            />
          </label>

          <label className="check-row">
            <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
            <span>가족과 공유</span>
          </label>

          <div className="form-actions">
            <button type="button" className="btn tonal" onClick={onCancel} disabled={saving}>취소</button>
            <button type="submit" className="btn" disabled={saving || !title.trim() || !date}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
