"use client"

import { useState, Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import Link from "next/link"
import { ArrowLeft, Check, RotateCcw, ShoppingBag, Sparkles } from "lucide-react"
import { DuckScene } from "@/components/canvas/DuckScene"

type PartType = 'head' | 'arms' | 'tail' | 'feet' | 'face' | 'bodyColor'

const PARTS_CONFIG = {
    bodyColor: [
        { id: '#FCD34D', name: '오리 옐로우', price: 0 },
        { id: '#FFFFFF', name: '화이트', price: 0 },
        { id: '#FF6B9D', name: '딸기 핑크', price: 0 },
        { id: '#A78BFA', name: '퍼플', price: 0 },
        { id: '#94A3B8', name: '메탈릭 실버', price: 1000 },
        { id: '#F97316', name: '오렌지', price: 0 },
        { id: '#34D399', name: '민트', price: 0 },
    ],
    head: [
        { id: 'none', name: '선택 안함', price: 0, url: null },
        { id: 'ball_cap', name: '볼캡', price: 2000, url: '/parts/stl/ball cap.stl' },
        { id: 'bird_cap', name: '새 모자', price: 2500, url: '/parts/stl/bird cap.stl' },
        { id: 'chef_hat', name: '요리사 셰프', price: 3000, url: '/parts/stl/chef hat.stl' },
        { id: 'cowboy_hat', name: '카우보이', price: 3000, url: '/parts/stl/cowboy hat.stl' },
        { id: 'got', name: '조선 갓', price: 4000, url: '/parts/stl/got.stl' },
        { id: 'heli', name: '헬리콥터', price: 3500, url: '/parts/stl/heli.stl' },
        { id: 'rabbit_cap', name: '토끼 모자', price: 4000, url: '/parts/stl/rabbit cap.stl' },
        { id: 'snapback', name: '스냅백', price: 2000, url: '/parts/stl/snapback.stl' },
        { id: 'tea_set', name: '찻잔', price: 5000, url: '/parts/stl/tea set.stl' },
        { id: 'viking', name: '바이킹 투구', price: 4500, url: '/parts/stl/viking.stl' },
    ],
    arms: [
        { id: 'none', name: '선택 안함', price: 0, urls: [] },
        { id: 'rabbit_arms', name: '토끼 팔', price: 1500, urls: ['/parts/stl/rabbit arml.stl', '/parts/stl/rabbit armr.stl'] },
        { id: 'short_arms', name: '짧은 팔', price: 1500, urls: ['/parts/stl/short arm1.stl', '/parts/stl/short arm2.stl'] },
    ],
    tail: [
        { id: 'none', name: '선택 안함', price: 0, url: null },
        { id: 'flat_tail', name: '납작 꼬리', price: 1000, url: '/parts/stl/flat tail.stl' },
        { id: 'furry_tail', name: '풍성한 꼬리', price: 2000, url: '/parts/stl/furry tail.stl' },
        { id: 'rabbit_tail', name: '토끼 꼬리', price: 1500, url: '/parts/stl/rabit tail.stl' },
    ],
    feet: [
        { id: 'none', name: '선택 안함', price: 0, url: null },
        { id: 'animal_foot', name: '동물 발', price: 2000, url: '/parts/stl/animal foot.stl' },
        { id: 'rabbit_foot', name: '토끼 발', price: 2500, url: '/parts/stl/rabbit foot.stl' },
    ],
    face: [
        { id: 'none', name: '선택 안함', price: 0, url: null },
        { id: 'cute_nose', name: '귀여운 코', price: 500, url: '/parts/stl/cute nose.stl' },
        { id: 'rabbit_teeth', name: '이빨', price: 800, url: '/parts/stl/rabbit teeth.stl' },
    ],
}

// Define types to match DuckScene's expected props
interface CustomizationState {
    head: string
    headColor: string
    arms: string
    armsColor: string
    tail: string
    tailColor: string
    feet: string
    feetColor: string
    face: string
    faceColor: string
    bodyColor: string
}

export default function CustomDuckPage() {
    const [activeTab, setActiveTab] = useState<PartType>('bodyColor')
    const [customization, setCustomization] = useState<CustomizationState>({
        head: 'none', headColor: '#FF6B9D',
        arms: 'none', armsColor: '#FCD34D',
        tail: 'none', tailColor: '#FCD34D',
        feet: 'none', feetColor: '#F97316',
        face: 'none', faceColor: '#EF4444',
        bodyColor: '#FCD34D'
    })

    // 가격 설정은 필요 없음. 기본 케이스가 1만원. 파츠 비용 없음.
    const totalPrice = 10000

    const handlePartSelect = (category: PartType, id: string) => {
        setCustomization(prev => ({
            ...prev,
            [category]: id as any
        }))
    }

    return (
        <div className="min-h-screen bg-slate-100 font-sans flex items-center justify-center">
            <div className="w-full max-w-[455px] h-[100dvh] mx-auto bg-[#FFF7ED] shadow-[0_0_40px_rgba(0,0,0,0.1)] flex flex-col relative overflow-hidden">
                {/* --- Top: 3D Canvas --- */}
                <div className="relative w-full h-[50%] bg-[#FCD34D]/20">
                    {/* Back Button */}
                    <Link href="/" className="absolute top-6 left-6 z-10 p-3 bg-white border-2 border-slate-900 rounded-full shadow-[2px_2px_0px_#000] hover:translate-y-[2px] hover:shadow-none transition-all">
                        <ArrowLeft size={24} className="text-slate-900" />
                    </Link>

                    {/* Reset Button */}
                    <button
                        onClick={() => setCustomization({
                            head: 'none', headColor: '#FF6B9D',
                            arms: 'none', armsColor: '#FCD34D',
                            tail: 'none', tailColor: '#FCD34D',
                            feet: 'none', feetColor: '#F97316',
                            face: 'none', faceColor: '#EF4444',
                            bodyColor: '#FCD34D'
                        })}
                        className="absolute top-6 right-6 z-10 p-3 bg-white border-2 border-slate-900 rounded-full shadow-[2px_2px_0px_#000] hover:translate-y-[2px] hover:shadow-none transition-all"
                    >
                        <RotateCcw size={24} className="text-slate-900" />
                    </button>

                    <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center pointer-events-none z-0">
                        <h1 className="text-5xl font-black text-slate-900 drop-shadow-sm tracking-tighter opacity-10 whitespace-nowrap">
                            CUSTOM DUCK
                        </h1>
                    </div>

                    <Canvas shadows className="w-full h-full">
                        <Suspense fallback={null}>
                            <PerspectiveCamera makeDefault position={[0, 0, 250]} fov={45} />
                            <ambientLight intensity={0.7} />
                            <spotLight position={[50, 50, 50]} angle={0.15} penumbra={1} castShadow intensity={1} />
                            <pointLight position={[-50, -50, -50]} intensity={0.5} />

                            {/* The Duck Scene */}
                            <DuckScene parts={customization} config={PARTS_CONFIG} />

                            <OrbitControls
                                target={[0, 30, 0]} // Positive Y shifts focus UP, which pushes the duck DOWN on screen
                                enablePan={true}
                                enableZoom={true}
                                zoomSpeed={1.5}
                                minPolarAngle={Math.PI / 8}
                                maxPolarAngle={Math.PI / 1.5}
                                minDistance={10}
                                maxDistance={500}
                            />

                            {/* Floor */}
                            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
                                <circleGeometry args={[200, 64]} />
                                <shadowMaterial opacity={0.2} />
                            </mesh>
                        </Suspense>
                    </Canvas>
                </div>

                {/* --- Bottom: Controls --- */}
                <div className="w-full h-[50%] bg-white border-t-4 border-slate-900 flex flex-col relative z-20 rounded-t-[32px] -mt-16 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">

                    {/* Price Header */}
                    <div className="px-5 pt-5 pb-3 border-b-2 border-slate-100 flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">TOTAL PRICE</span>
                            <span className="text-xl font-black text-slate-900 leading-none">₩{totalPrice.toLocaleString()}</span>
                        </div>
                        <button disabled className="bg-slate-300 text-slate-500 px-4 py-2 rounded-lg font-bold flex flex-col items-center justify-center cursor-not-allowed border-2 border-slate-300 leading-tight">
                            <span className="text-[10px] font-black">2026/03/02</span>
                            <span className="text-xs">COMING SOON</span>
                        </button>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex overflow-x-auto px-4 py-2.5 gap-2 no-scrollbar border-b border-slate-100">
                        {Object.keys(PARTS_CONFIG).map((key) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key as PartType)}
                                className={`px-4 py-1.5 rounded-full font-bold text-[11px] whitespace-nowrap transition-all flex-shrink-0 ${activeTab === key
                                    ? 'bg-[#FCD34D] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#000]'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border-2 border-transparent'
                                    }`}
                            >
                                {key === 'bodyColor' && '1. 오리 컬러'}
                                {key === 'head' && '2. 머리 장식'}
                                {key === 'arms' && '3. 팔 모양'}
                                {key === 'tail' && '4. 꼬리 모양'}
                                {key === 'feet' && '5. 발 모양'}
                                {key === 'face' && '6. 얼굴 포인트'}
                            </button>
                        ))}
                    </div>

                    {/* Part Color Tool (Only when a part is selected & not bodyColor) */}
                    {activeTab !== 'bodyColor' && customization[activeTab as keyof CustomizationState] !== 'none' && (
                        <div className="flex items-center gap-3 overflow-x-auto px-5 py-2.5 border-b border-slate-200 bg-white no-scrollbar">
                            <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">파트 색상</span>
                            {/* 추가적인 색상들을 위해 조금 더 확장된 배열 사용 */}
                            {[...PARTS_CONFIG.bodyColor, { id: '#EF4444', name: '레드' }, { id: '#0F172A', name: '블랙' }, { id: '#3B82F6', name: '블루' }].map((c) => (
                                <button
                                    key={`color-${c.id}`}
                                    onClick={() => setCustomization(prev => ({ ...prev, [`${activeTab}Color`]: c.id }))}
                                    title={c.name}
                                    className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all ${customization[`${activeTab}Color` as keyof CustomizationState] === c.id
                                        ? 'border-slate-900 scale-110 shadow-[2px_2px_0px_#000]'
                                        : 'border-slate-200 hover:scale-105 hover:shadow-sm'
                                        }`}
                                    style={{ backgroundColor: c.id }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Options Grid */}
                    <div className="flex-1 p-3 overflow-y-auto bg-slate-50/50">
                        <div className="grid grid-cols-2 gap-2 pb-8">
                            {PARTS_CONFIG[activeTab].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handlePartSelect(activeTab, item.id)}
                                    className={`group relative p-3 rounded-xl border-2 transition-all text-left h-20 flex flex-col justify-between ${
                                        // @ts-ignore
                                        customization[activeTab] === item.id
                                            ? 'bg-white border-slate-900 shadow-[4px_4px_0px_#000]'
                                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                                        }`}
                                >
                                    {/* Visual Indicator for Colors */}
                                    {activeTab === 'bodyColor' && item.id !== 'none' && (
                                        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: item.id }} />
                                    )}

                                    <span className="font-bold text-slate-900 text-sm mt-auto">{item.name}</span>

                                    {/* Selected Checkmark */}
                                    {/* @ts-ignore */}
                                    {customization[activeTab] === item.id && (
                                        <div className="absolute -top-2 -right-2 bg-slate-900 text-white p-1 rounded-full border-2 border-white">
                                            <Check size={12} strokeWidth={4} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Shadow gradient for scrolling indication (optional) */}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
                </div>
            </div>
        </div>
    )
}
