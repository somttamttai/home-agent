export default function BuyButton({ link, mall, price, block = false, lg = false }) {
  if (!link) {
    return (
      <button className={`btn disabled${block ? ' block' : ''}${lg ? ' lg' : ''}`} disabled>
        구매링크 없음
      </button>
    )
  }
  return (
    <a
      className={`btn${block ? ' block' : ''}${lg ? ' lg' : ''}`}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
    >
      🛒 {mall || '쇼핑몰'}에서 구매하기
      {price != null && ` · ${price.toLocaleString()}원`}
    </a>
  )
}
