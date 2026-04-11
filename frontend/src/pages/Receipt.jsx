import { useToast } from '../components/Toast.jsx'

export default function Receipt() {
  const toast = useToast()

  const onPick = () => {
    toast('🔒 곧 업데이트 예정이에요')
    // const input = document.createElement('input')
    // input.type = 'file'
    // input.accept = 'image/*'
    // input.capture = 'environment'
    // input.onchange = async (e) => {
    //   const f = e.target.files?.[0]
    //   if (!f) return
    //   const form = new FormData()
    //   form.append('file', f)
    //   const r = await fetch('/api/scan/receipt', { method: 'POST', body: form })
    //   console.log(await r.json())
    // }
    // input.click()
  }

  return (
    <div>
      <div className="card">
        <b>🧾 영수증 사진 인식</b>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          영수증 사진을 찍으면 구매 품목을 자동으로 기록해요.
        </div>
      </div>

      <div className="card lock-overlay" style={{ minHeight: 160 }}>
        <b>구매 내역 자동 추출</b>
        <ul style={{ fontSize: 13, color: '#6b7280', paddingLeft: 18 }}>
          <li>판매처, 품목명, 수량, 단가 자동 인식</li>
          <li>기존 소모품 재고 자동 업데이트</li>
          <li>가격 이력 자동 저장</li>
        </ul>
      </div>

      <button className="btn disabled block" onClick={onPick}>
        🔒 영수증 찍기 (준비중)
      </button>

      <div className="empty" style={{ fontSize: 12 }}>
        Claude AI 비용 절감을 위해 비활성화되어 있어요.<br />
        백엔드 코드는 준비되어 있어, <code>ENABLE_OCR=true</code> 로 켤 수 있습니다.
      </div>
    </div>
  )
}
