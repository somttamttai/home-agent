import PageHeader from '../components/PageHeader.jsx'
import { useToast } from '../components/Toast.jsx'

// 실제 바코드 스캔 / 상품 사진 인식 코드는 준비중이라 비활성화.
// import { useEffect, useRef, useState } from 'react'
// import { BrowserMultiFormatReader } from '@zxing/browser'
// import BuyButton from '../components/BuyButton.jsx'

export default function Scan() {
  const toast = useToast()
  const onLocked = () => toast('🔒 곧 업데이트 예정이에요')

  return (
    <div className="page-enter">
      <PageHeader title="바코드 스캔" />
      <div className="page">
        <div className="card lock-card">
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>
            📷 바코드 스캔
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 4 }}>
            카메라로 상품 바코드를 비춰주세요
          </div>

          <div className="scan-box">
            <div className="lock-icon">🔒</div>
          </div>

          <button
            type="button"
            className="btn disabled block"
            onClick={onLocked}
          >
            🔒 스캔 시작 (준비중)
          </button>
        </div>

        <div className="card lock-card">
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>
            🖼 상품 사진으로 인식
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 4, marginBottom: 16 }}>
            바코드가 없는 상품은 사진으로 인식할 수 있어요
          </div>
          <button
            type="button"
            className="btn disabled block"
            onClick={onLocked}
          >
            🔒 사진 찍기 (준비중)
          </button>
        </div>

        <div className="empty" style={{ padding: '32px 20px' }}>
          곧 업데이트 예정이에요
        </div>
      </div>
    </div>
  )
}
