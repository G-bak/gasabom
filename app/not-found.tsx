import Link from "next/link";

export default function NotFound() {
  return <main className="not-found-page"><div><span className="not-found-icon">♫</span><h1>이 곡은 아직 보관함에 없어요.</h1><p>주소를 확인하거나 새 곡을 추가해 보세요.</p><Link href="/" className="button button-primary">보관함으로 돌아가기 →</Link></div></main>;
}
