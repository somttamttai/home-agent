export default function BuyButton({ link, mall, price, block = false }) {
  if (!link) {
    return (
      <button className="btn disabled" disabled>
        구매링크 없음
      </button>
    )
  }
  return (
    <a
      className={`btn ${block ? 'block' : ''}`}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
    >
      🛒 {mall || '쇼핑몰'} 바로가기
      {price != null && ` · ${price.toLocaleString()}원`}
    </a>
  )
}
