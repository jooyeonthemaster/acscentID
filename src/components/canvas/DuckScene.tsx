"use client"

import { useRef, useMemo, useLayoutEffect } from "react"
import { useFrame, useLoader } from "@react-three/fiber"
import { Float, ContactShadows, Environment, Center } from "@react-three/drei"
import * as THREE from "three"
import { STLLoader } from "three-stdlib"

// Premium Toy Material Factory
const getToyMaterial = (color: string) => {
    return new THREE.MeshPhysicalMaterial({
        color: color,
        roughness: 0.15,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
    })
}

// Wrapper for "fly-in" animations using native Three math
const PartWrapper = ({ children, id, offset = [0, 0, 0] }: { children: React.ReactNode, id: string, offset?: [number, number, number] }) => {
    const group = useRef<THREE.Group>(null)

    // 아주 부드럽고 띡띡 끊기지 않는 자연스러운 등장 애니메이션을 위해
    // 렌더링 직전에 시작 위치를 세팅합니다.
    useLayoutEffect(() => {
        if (!group.current) return

        // 방향을 랜덤하게 주어 떨어지면서 들어오는 듯한 귀여운 연출
        const dirX = Math.random() > 0.5 ? 1 : -1;
        const dirZ = Math.random() > 0.5 ? 1 : -1;

        group.current.position.set(
            offset[0] + (30 * dirX),
            offset[1] + 100,
            offset[2] + (30 * dirZ)
        )
        // 무작위 회전 상태에서 시작하여 제자리로 돌아오게 함
        group.current.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        )
        group.current.scale.setScalar(0.01)
    }, [id])

    useFrame((_, delta) => {
        if (!group.current) return

        // 부드럽게 감속하며 목표 지점(offset, 혹은 rotation 0)으로 도달
        const pDamp = 6;
        const rDamp = 5;
        const sDamp = 8;

        group.current.position.y = THREE.MathUtils.damp(group.current.position.y, offset[1], pDamp, delta)
        group.current.position.x = THREE.MathUtils.damp(group.current.position.x, offset[0], pDamp, delta)
        group.current.position.z = THREE.MathUtils.damp(group.current.position.z, offset[2], pDamp, delta)

        group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, 0, rDamp, delta)
        group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, 0, rDamp, delta)
        group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, 0, rDamp, delta)

        const nextScale = THREE.MathUtils.damp(group.current.scale.x, 1, sDamp, delta)
        group.current.scale.setScalar(nextScale)
    })

    return (
        <group ref={group}>
            {children}
        </group>
    )
}

// STL Model Helper
const STLModel = ({ url, color, receiveShadow = true, castShadow = true }: { url: string, color: string, receiveShadow?: boolean, castShadow?: boolean }) => {
    // using STLLoader from three-stdlib
    const geometry = useLoader(STLLoader, url) as THREE.BufferGeometry

    // Normalize normals just in case STL has no normals
    useMemo(() => {
        geometry.computeVertexNormals()
    }, [geometry])

    const material = useMemo(() => getToyMaterial(color), [color])

    return (
        <mesh
            geometry={geometry}
            material={material}
            castShadow={castShadow}
            receiveShadow={receiveShadow}
            rotation={[-Math.PI / 2, 0, 0]} // Convert CAD Z-up to WebGL Y-up
        />
    )
}

// --- Main Scene Component ---

export type DuckParts = {
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

interface DuckSceneProps {
    parts: DuckParts
    config: any // We'll pass PARTS_CONFIG to lookup URLs
}

export function DuckScene({ parts, config }: DuckSceneProps) {
    const group = useRef<THREE.Group>(null)

    useFrame((state) => {
        if (group.current) {
            // Very smooth subtle floating
            group.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 2 // Increased amplitude because STL scale is large
            // Subtle rotation
            group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15
        }
    })

    // Find URLs for current selection
    const headData = config.head.find((i: any) => i.id === parts.head)
    const armsData = config.arms.find((i: any) => i.id === parts.arms)
    const tailData = config.tail.find((i: any) => i.id === parts.tail)
    const feetData = config.feet.find((i: any) => i.id === parts.feet)
    const faceData = config.face.find((i: any) => i.id === parts.face)

    return (
        <group>
            {/* Center scales and positions the whole CAD assembly perfectly in view */}
            <Center top>
                <group ref={group}>
                    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2} floatingRange={[-2, 2]}>

                        {/* Base Objects (Always visible) */}
                        <group>
                            {/* Outer duck body */}
                            <STLModel url="/parts/stl/animal case base.stl" color={parts.bodyColor} />
                        </group>

                        {/* Parts wrapped for fly-in animations */}
                        {headData?.url && (
                            <PartWrapper id={`head-${parts.head}`} offset={[0, 62, 0]}>
                                <STLModel url={headData.url} color={parts.headColor} />
                            </PartWrapper>
                        )}

                        {armsData?.urls?.length > 0 && (
                            <PartWrapper id={`arms-${parts.arms}`} offset={[0, 0, 0]}>
                                {armsData.urls.map((url: string, idx: number) => {
                                    // Make sure index 0 is left, 1 is right
                                    const isLeft = idx === 0;

                                    let posX = 0; let posY = 0; let posZ = 0;
                                    let rotX = 0; let rotY = 0; let rotZ = 0;

                                    if (parts.arms === 'rabbit_arms') {
                                        // Position along the front/back axis
                                        posX = 5;
                                        posY = 34;

                                        // Move arms closer to the body
                                        posZ = isLeft ? -12 : 12;

                                        // The CAD files are already explicitly exported as 'Left' and 'Right' mirrors.
                                        rotY = -Math.PI / 2;

                                        // Forward tilt
                                        rotX = -Math.PI * 0.75;
                                    } else {
                                        // '짧은 팔' (short_arms) 등 새로운 팔 맞춤 설정
                                        // 스크린샷 렌더링을 보니, 토끼팔처럼 초기 각도가 90도 틀어져 있는 상태인 것 같습니다.
                                        // 핀이 앞뒤(X축)를 보고 있으니 Y축으로 90도 돌려주겠습니다.
                                        posX = -3.5; // 살짝 더 뒤로 (마이너스 방향) 보냄
                                        posY = 3; // 아주 살짝 더 내림
                                        posZ = isLeft ? -1.5 : 1.5; // 마지막까지 깊숙이 찔러넣음
                                        rotX = 0;
                                        rotY = -Math.PI / 2; // 핀이 오리를 향하게 90도 회전
                                        rotZ = 0;
                                    }

                                    return (
                                        <group key={url} position={[posX, posY, posZ]}>
                                            <group rotation={[0, rotY, 0]}>
                                                <group rotation={[rotX, 0, rotZ]}>
                                                    <STLModel url={url} color={parts.armsColor} />
                                                </group>
                                            </group>
                                        </group>
                                    )
                                })}
                            </PartWrapper>
                        )}

                        {tailData?.url && (
                            <PartWrapper id={`tail-${parts.tail}`}>
                                {(() => {
                                    let posX = 0; let posY = 0; let posZ = 0;
                                    let rotX = 0; let rotY = 0; let rotZ = 0;

                                    if (parts.tail === 'furry_tail') {
                                        // 이제 앞을 쳐다보니 바로 쑤셔박겠습니다!
                                        // 일단 다른 꼬리들이 들어갔던(-21, 1) 부근으로 대폭 이동!
                                        posX = -15; // 안쪽으로 과감하게 쑥 밀어넣음!
                                        posY = 6; // 좀 더 위로 올림
                                        posZ = 0;
                                        // 180도일 때 옆을 봤다는 건, 원래 (0도)부터가 옆을 보고 있는 모델이었다는 뜻이네요!
                                        // 그렇다면 90도 회전을 주어야 앞/뒤를 봅니다.
                                        // -90(-Math.PI/2)일 때 바깥을 봤다면, 반대로 90(Math.PI/2)를 주면 오리를 향합니다!
                                        // X축으로 기울였더니 옆으로 누워버리는 걸(Roll) 보아,
                                        // 꼬리의 상하 각도(Pitch)를 조절하는 축은 Z축인 것 같습니다!
                                        rotX = -Math.PI / 6; // 다시 X축으로 -30도를 줍니다!
                                        rotY = Math.PI / 2; // 90도 회전 (앞보기)
                                        rotZ = 0;
                                    } else {
                                        // 납작 꼬리, 토끼 꼬리: 유저님이 완벽하다고 컨펌한 위치! 평생 고정!
                                        posX = -21;
                                        posY = 1;
                                        posZ = 0;
                                        rotX = 0;
                                        rotY = 0;
                                        rotZ = 0;
                                    }

                                    return (
                                        <group position={[posX, posY, posZ]}>
                                            <group rotation={[0, rotY, 0]}>
                                                <group rotation={[rotX, 0, rotZ]}>
                                                    <STLModel url={tailData.url} color={parts.tailColor} />
                                                </group>
                                            </group>
                                        </group>
                                    )
                                })()}
                            </PartWrapper>
                        )}

                        {feetData?.url && (
                            <PartWrapper id={`feet-${parts.feet}`} offset={[0, -15, 0]}>
                                {(() => {
                                    if (parts.feet === 'animal_foot') {
                                        // 동물 발: 같은 STL을 좌/우 미러링하여 두 개 배치
                                        const posX = 10;
                                        const posY = 18;  // offset -15 + 18 = 총 Y=3
                                        const footSpacing = 12; // 좌우 간격

                                        return (
                                            <>
                                                {/* 왼발 */}
                                                <group position={[posX, posY, -footSpacing]}>
                                                    <group rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
                                                        <STLModel url={feetData.url} color={parts.feetColor} />
                                                    </group>
                                                </group>
                                                {/* 오른발: Z축 미러 */}
                                                <group position={[posX, posY, footSpacing]}>
                                                    <group scale={[1, 1, -1]}>
                                                        <group rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
                                                            <STLModel url={feetData.url} color={parts.feetColor} />
                                                        </group>
                                                    </group>
                                                </group>
                                            </>
                                        );
                                    }

                                    if (parts.feet === 'rabbit_foot') {
                                        // 토끼 발: 좌/우 미러링, 핀이 몸통 구멍으로 향하게
                                        const posX = 12;
                                        const posY = 18.5;
                                        const footSpacing = 3;

                                        return (
                                            <>
                                                {/* 왼발 */}
                                                <group position={[posX, posY, -footSpacing]}>
                                                    {/* 외부: 핀 방향 보정 + 발가락 세우기 */}
                                                    <group rotation={[Math.PI / 2, Math.PI / 2, 0]}>
                                                        {/* 내부: 동물발과 동일한 눕히기 */}
                                                        <group rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
                                                            <STLModel url={feetData.url} color={"#F97316"} />
                                                        </group>
                                                    </group>
                                                </group>
                                                {/* 오른발: Z축 미러 */}
                                                <group position={[posX, posY, footSpacing]}>
                                                    <group scale={[1, 1, -1]}>
                                                        <group rotation={[Math.PI / 2, Math.PI / 2, 0]}>
                                                            <group rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
                                                                <STLModel url={feetData.url} color={parts.feetColor} />
                                                            </group>
                                                        </group>
                                                    </group>
                                                </group>
                                            </>
                                        );
                                    }

                                    // 다른 발 종류 (기본)
                                    return (
                                        <STLModel url={feetData.url} color={parts.feetColor} />
                                    );
                                })()}
                            </PartWrapper>
                        )}

                        {faceData?.url && (
                            <PartWrapper id={`face-${parts.face}`}>
                                {(() => {
                                    let posX = 17;
                                    let posY = 59.8;
                                    let posZ = 0;

                                    let rotX = 0;
                                    let rotY = 0;
                                    let rotZ = 0;

                                    if (parts.face === 'rabbit_teeth') {
                                        posY -= 2.5; // 코('58.3')보다 구멍이 밑에 있으니, 이빨 파츠의 높이를 스윽 내려줍니다!

                                        // 코와 다르게 이빨은 모델 좌표계가 다른 것 같습니다!
                                        // 현재 -90도로 돌렸을 때 핀이 '옆'을 보고 세로로 서 있었습니다.
                                        // 핀이 뒤쪽(오리 몸통)을 보게 하고 가로로 눕히기 위해 각도를 재조정합니다.
                                        // 가로로 눕혀놨더니, 오히려 사용자님은 세로(원래 모양)로 서 있길 원하십니다!
                                        rotX = 0; // X축 회전을 풀어서 원래대로 세로로 다시 세웁니다.
                                        rotY = Math.PI; // 핀이 뒤로(오리쪽) 향하는 건 맞으므로 이대로 고정!
                                        rotZ = 0;
                                    } else {
                                        // 귀여운 코
                                        rotX = 0;
                                        rotY = -Math.PI / 2;
                                        rotZ = 0;
                                    }

                                    return (
                                        <group position={[posX, posY, posZ]}>
                                            <group rotation={[0, rotY, 0]}>
                                                <group rotation={[rotX, 0, rotZ]}>
                                                    <STLModel url={faceData.url} color={parts.faceColor} />
                                                </group>
                                            </group>
                                        </group>
                                    );
                                })()}
                            </PartWrapper>
                        )}

                    </Float>

                    {/* Floor shadow positioned relative to center */}
                    <ContactShadows position={[0, -5, 0]} opacity={0.6} scale={150} blur={2.5} far={40} color="#0f172a" />
                </group>
            </Center>

            <Environment preset="city" />
            <ambientLight intensity={0.4} />
            <directionalLight position={[50, 100, 50]} intensity={1.5} castShadow />
        </group>
    )
}
