import PageHeader from '../components/PageHeader.jsx'
import { useToast } from '../components/Toast.jsx'

export default function Receipt() {
  const toast = useToast()
  const onLocked = () => toast('🔒 곧 업데이트 예정이에요')

  return (
    <div>
      <PageHeader title="영수증" />
      <div className="page">
        <div className="card lock-card">
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>
            🧾 영수증 사진 인식
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 6, marginBottom: 14 }}>
            영수증을 찍으면 구매 품목을 자동으로 기록해드려요
          </div>

          <ul style={{
            fontSize: 13, color: 'var(--text-sub)',
            paddingLeft: 18, margin: 0, lineHeight: 1.8,
          }}>
            <li>판매처, 품목명, 수량, 단가 자동 인식</li>
            <li>기존 소모품 재고 자동 업데이트</li>
            <li>가격 이력 자동 저장</li>
          </ul>
        </div>

        <button
          type="button"
          className="btn disabled block lg"
          onClick={onLocked}
        >
          🔒 영수증 찍기 (준비중)
        </button>

        <div className="empty" style={{ padding: '32px 20px', fontSize: 12 }}>
          Claude AI 비용 절감을 위해 비활성화되어 있어요<br />
          백엔드 코드는 준비되어 있어 <code>ENABLE_OCR=true</code> 로 켤 수 있어요
        </div>
      </div>
    </div>
  )
}
