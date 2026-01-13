"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { Float, Environment, PerspectiveCamera, Stars, ContactShadows, RoundedBox, Cylinder, Sphere, Instance, Instances } from "@react-three/drei"
import { useRef, useState, useMemo } from "react"
import * as THREE from "three"

// --- Procedural Cute Perfume Bottle ---
function PerfumeBottle(props: any) {
    const group = useRef<THREE.Group>(null!)
    const [hovered, setHover] = useState(false)

    useFrame((state, delta) => {
        // Gentle floating rotation
        group.current.rotation.y += delta * 0.2
        group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    })

    // Colors
    const liquidColor = props.color || "#F472B6"
    const glassColor = "#ffffff"
    const capColor = "#FCD34D" // Gold

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
            <group
                ref={group}
                {...props}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
                scale={hovered ? 1.1 : 1}
            >
                {/* Bottle Body (Glass) */}
                <RoundedBox args={[1.5, 1.8, 0.8]} radius={0.2} smoothness={4} position={[0, 0, 0]}>
                    <meshPhysicalMaterial
                        transmission={0.6} // Glass-like
                        thickness={1}
                        roughness={0.1}
                        clearcoat={1}
                        color={glassColor}
                        transparent
                        opacity={0.5}
                    />
                </RoundedBox>

                {/* Liquid Inside */}
                <RoundedBox args={[1.3, 1.4, 0.6]} radius={0.15} smoothness={4} position={[0, -0.1, 0]}>
                    <meshStandardMaterial color={liquidColor} />
                </RoundedBox>

                {/* Neck */}
                <Cylinder args={[0.2, 0.2, 0.4]} position={[0, 1.0, 0]}>
                    <meshStandardMaterial color={capColor} metalness={0.8} roughness={0.2} />
                </Cylinder>

                {/* Cap (Round Ball) */}
                <Sphere args={[0.35, 32, 32]} position={[0, 1.4, 0]}>
                    <meshStandardMaterial color={capColor} metalness={0.6} roughness={0.2} />
                </Sphere>

                {/* Label (Sticker) */}
                <mesh position={[0, 0.2, 0.41]}>
                    <planeGeometry args={[0.8, 0.5]} />
                    <meshStandardMaterial color="#FFF" />
                </mesh>
            </group>
        </Float>
    )
}

// --- Scent Particles (Spraying Effect) ---
function ScentParticles({ count = 30, color = "white" }) {
    const mesh = useRef<THREE.InstancedMesh>(null!)
    const [dummy] = useState(() => new THREE.Object3D())

    // Random positions for particles
    const particles = useMemo(() => {
        const temp = []
        for (let i = 0; i < count; i++) {
            const t = Math.random() * 100
            const factor = 20 + Math.random() * 100
            const speed = 0.01 + Math.random() / 200
            const xFactor = -2 + Math.random() * 4
            const yFactor = -2 + Math.random() * 4
            const zFactor = -2 + Math.random() * 4
            temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 })
        }
        return temp
    }, [count])

    useFrame((state, delta) => {
        particles.forEach((particle, i) => {
            let { t, factor, speed, xFactor, yFactor, zFactor } = particle
            t = particle.t += speed / 2
            const a = Math.cos(t) + Math.sin(t * 1) / 10
            const b = Math.sin(t) + Math.cos(t * 2) / 10
            const s = Math.cos(t)

            // Move particles upwards resembling scent
            dummy.position.set(
                (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
                (particle.my / 10) * b + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10 + (state.clock.elapsedTime * 0.5) % 10 - 5, // Upward drift
                (particle.my / 10) * b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
            )
            dummy.scale.setScalar(s * 0.5 + 0.5) // Pulse scale
            dummy.rotation.set(s * 5, s * 5, s * 5)
            dummy.updateMatrix()
            mesh.current.setMatrixAt(i, dummy.matrix)
        })
        mesh.current.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh ref={mesh} args={[null as any, null as any, count]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
        </instancedMesh>
    )
}

// --- Main 3D Scene ---
export function KitschScene() {
    return (
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
            <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 10], fov: 45 }}>

                {/* Soft Studio Lighting - Warmer for Yellow BG */}
                <ambientLight intensity={1.2} />
                <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1.5} castShadow />
                <pointLight position={[-10, 0, -10]} intensity={0.8} color="#FDE047" /> {/* Yellow tint */}

                {/* 
            Procedural Perfume Bottles - Moved further back and spread out to not interfere with text
        */}
                <PerfumeBottle position={[-12, 2, -5]} rotation={[0, 0.3, 0.2]} color="#F472B6" />
                <PerfumeBottle position={[12, -2, -6]} rotation={[0, -0.3, -0.2]} color="#67E8F9" />

                {/* Center/Background decorative elements */}
                <Float speed={1.5} floatIntensity={2}>
                    <Sphere args={[0.4, 32, 32]} position={[8, 6, -8]}>
                        <meshStandardMaterial color="#FDE047" />
                    </Sphere>
                </Float>

                {/* Scent Spray Effects - Reduced count and opacity */}
                <ScentParticles count={20} color="#FBCFE8" />
                <ScentParticles count={10} color="#FEF08A" />

                {/* Environment for shiny glass reflections */}
                <Environment preset="city" />

                {/* Soft Ground Shadows - Darker for visibility on yellow */}
                <ContactShadows opacity={0.2} scale={40} blur={4} far={10} color="#A16207" />
            </Canvas>
        </div>
    )
}
