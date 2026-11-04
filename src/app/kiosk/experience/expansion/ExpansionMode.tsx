'use client'

import dynamic from 'next/dynamic'
import { useKx } from '../kx'
import type { PreferenceId } from '@/lib/kiosk/expansion/types'
import './expansion.css'

const PreferenceMode = dynamic(() => import('./PreferenceMode'), { ssr:false })
const CameraModes = dynamic(() => import('./CameraModes'), { ssr:false })
const ParticipantModes = dynamic(() => import('./ParticipantModes'), { ssr:false })
const InteractiveModes = dynamic(() => import('./InteractiveModes'), { ssr:false })
const HousingModes = dynamic(() => import('./HousingModes'), { ssr:false })

export default function ExpansionMode() {
  const { id } = useKx()
  return <div className="ex-shell">{id === 'housing-scent' || id === 'housing-mate' || id === 'housing-home' ? <HousingModes id={id} /> : id === 'lookalike' || id === 'palm' || id === 'face' ? <CameraModes id={id} /> : id === 'team' || id === 'couple' ? <ParticipantModes id={id} /> : id === 'science' || id === 'product' || id === 'vision-wall' || id === 'heritage' ? <InteractiveModes id={id} /> : <PreferenceMode id={id as PreferenceId} />}</div>
}
