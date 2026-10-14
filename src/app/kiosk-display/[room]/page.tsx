import { ExhibitDisplay } from './ExhibitDisplay'
export const metadata = { title: '연결 전시', robots: { index: false, follow: false } }
export default async function Page({ params }: { params: Promise<{ room: string }> }) { return <ExhibitDisplay room={(await params).room} /> }
