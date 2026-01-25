"use client"

import { Canvas } from "@react-three/fiber"
import { Text, Float, Environment } from "@react-three/drei"
import { Suspense } from "react"

const FONT_URL = "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_JAMO@1.0/BagelFatOne-Regular.woff2"

export function BubbleTitle() {
    return (
        <div className="w-full h-full relative z-50">
            <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
                <Suspense fallback={null}>
                    <ambientLight intensity={0.8} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} />

                    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                        <TitleGroup />
                    </Float>

                    <Environment preset="city" />
                </Suspense>
            </Canvas>
        </div>
    )
}

function TitleGroup() {
    return (
        <group position={[0, 0.5, 0]}>
            {/* 1. Subtitle: 나만의 향을 찾아주는 */}
            <Text
                font={FONT_URL}
                fontSize={0.5}
                position={[-1.8, 1.8, 0]}
                anchorX="left"
                color="#1e293b" // slate-900
                outlineWidth={0.02}
                outlineColor="#ffffff"
            >
                나만의 향을 찾아주는
            </Text>

            {/* 2. Main Title: 가장 유쾌한 브랜드 (Highlighted) */}
            <Text
                font={FONT_URL}
                fontSize={1.2}
                position={[-2.0, 0.7, 0]}
                anchorX="left"
                color="#FBCFE8" // pink-200
                outlineWidth={0.04}
                outlineColor="#0f172a" // slate-900
                characters="가장유쾌한 브랜드"
            >
                가장 유쾌한 브랜드
            </Text>

            {/* 3. English Title: AC'SCENT IDENTITY */}
            <Text
                font={FONT_URL}
                fontSize={0.9}
                position={[-1.9, -0.8, 0]}
                anchorX="left"
                color="#1e293b" // slate-900
                outlineWidth={0.03}
                outlineColor="#ffffff"
            >
                AC'SCENT IDENTITY
            </Text>
        </group>
    )
}
