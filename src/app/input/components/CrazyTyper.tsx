import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState, useRef } from "react"
import type { FormDataType } from "../types"

interface CrazyTyperProps {
    step: number
    formData: FormDataType
}

const REACTIONS: Record<string, string[]> = {
    // Step 1: Name / Gender
    "Male": [
        "남돌 최애라고?! 오빠라고 불러도 될까?! 잘생기면 다 오빠지!!!",
        "그 오빠 때문에 내 통장이 텅장됐어... 그래도 행복해!!!!",
        "얼굴이 복지다... 나라 세우자 진짜... 충성충성!!!",
        "어디 사는 누구야?! 내가 당장 납치하러 갈게!!!! (철컹철컹)"
    ],
    "Female": [
        "여돌 최애?! 언니 날 가져요 엉엉 ㅠㅠ",
        "이쁜 언니가 세상을 구한다!!! 언니 때문에 현생 불가야...",
        "언니 나 죽어!!! 퀸카 그 자체... 숨이 안 쉬어져 헉헉",
        "존예보스 등판... 언니 얼굴만 봐도 배가 불러 ㅠㅠ"
    ],
    "Mixed": [
        "혼성 그룹?! 이 맛집을 나만 몰랐네!! 케미 미쳤다...",
        "매력 과다 복용으로 기절... 삐뽀삐뽀 불러줘요...",
        "이 구역의 짱은 너야!!! 다 씹어먹자!!!!"
    ],

    // Step 2: Styles
    "귀여운": [
        "귀여워??? 진짜 아파트 다 뽑아버려!!! 지구 뿌셔 우주 뿌셔!!!",
        "귀여운 게 최고야 짜릿해!!! 늘 새로워!!!",
        "말랑콩떡 그 자체... 한입만 깨물어봐도 돼?! ㅠㅠ",
        "숨을 못 쉬겠어 헉헉... 심장이 남아나질 않아...",
        "주머니에 넣고 다니고 싶다 진짜... 납치 각이다..."
    ],
    "섹시한": [
        "섹시해?! 코피 팡!!!! 휴지 좀 줘요 과다출혈이야...",
        "아... 나 죽어... ㅇ<-< 여기서 잠들다...",
        "치명적이야... 그 눈빛에 갇혀서 평생 살고 싶어 ㅠㅠ",
        "혈중 섹시 농도 과다!!!! 구급차 불러!!!! 119!!!!",
        "섹시함이 죄라면 넌 무기징역... 감옥에서 나오지 마 제발..."
    ],
    "청량한": [
        "인간 포카리 스웨트!!! 청량해서 눈이 멀 것 같아 ㅠㅠ",
        "탄산 그 자체!!! 목구멍이 뻥 뚫리는 기분이야!!!",
        "청량 청량 열매 과다 복용... 보기만 해도 시원해 미치겠어!!",
        "여름이었다... 기억 조작 오지게 만드는 그 청량함...",
        "온몸에 파랑 물감을 뒤집어쓴 것 같아!!! 짜릿해!!!"
    ],
    "시크한": [
        "시크해?? 냉미남/냉미녀 모먼트... 날 밟고 가주라 제발...",
        "차가운 도시의 갓벽함!! 베일 것 같은 턱선 실화냐?!",
        "눈빛 하나로 제압당함... 무릎 꿇었습니다 충성충성...",
        "저 차가운 표정 뒤에 숨겨진 다정함... 내가 쳐돌아버려 ㅠㅠ"
    ],
    "우아한": [
        "우아해?? 귀족이세요?! 전생에 나라를 구하셨나...",
        "분위기 미쳤다... 그냥 앉아만 있어도 서사 뚝딱 완성...",
        "왕족 아니야?? 내 비천한 눈이 호강한다 진짜...",
        "걸을 때마다 꽃길이 펼쳐져... 향기도 루이비통일 것 같아..."
    ],
    "활발한": [
        "에너지 뿜뿜!!! 보고만 있어도 우울증 치료 완치!!!",
        "비글미 미쳐따 ㅋㅋㅋ 텐션 저 세상 텐션!!! 감당 불가 ㅋㅋㅋ",
        "인간 비타민 그 잡채!! 내 삶의 활력소야 ㅠㅠ",
        "같이 있으면 24시간이 모자라!!! 체력 괴물 사랑해!!!"
    ],
    "레트로": [
        "레트로 감성 미쳤다... 응답하라 1988 찍는 줄...",
        "그 시절 우리가 사랑했던 그 소년/소녀... 기억 조작 ON...",
        "필카 감성 낭낭해... 분위기 깡패 인정합니다!!!"
    ],
    "캐주얼": [
        "남친짤/여친짤 제조기!!! 매일매일 저장하느라 폰 용량 터짐...",
        "꾸안꾸의 정석... 근데 얼굴이 다 했잖아 ㅠㅠ",
        "후드티만 입어도 화보야... 패완얼 인정? 어 인정..."
    ],

    // Step 3: Personality
    "다정해": [
        "다정하기까지?! 유죄 인간... 당장 혼인신고서 가져와!!!",
        "1가구 1보급 시급함 ㅠㅠ 왜 내 주위엔 없는 거야...",
        "나한테만 다정해주라... 질투 나서 미쳐버리겠어 ㅠㅠ",
        "천사가 아닐 리 없어... 날개 어디 숨겼어?! 빨리 말해!!"
    ],
    "츤데레": [
        "겉바속촉?! 미치겠다... 틱틱대면서 챙겨주는 거 설렌다구 ㅠㅠ",
        "반전 매력 대박이다... 그 갭차이에 쳐돌아버려...",
        "치인다 치여 ㅠㅠ 나쁜 남자/여자 스타일인데 끌려...",
        "오히려 좋아!!! 더 차갑게 대해줘!!! 하악..."
    ],
    "4차원": [
        "엉뚱해?? 귀여워 미쳐 ㅋㅋㅋ 도대체 무슨 생각 하는 거야?!",
        "매력 터진다 진짜 ㅋㅋㅋ 너 때문에 하루하루가 시트콤이야 ㅠㅠ",
        "알 수 없는 매력 덩어리!! 외계에서 왔니?! 사랑해!!!",
        "예측불가 매력... 출구 따위는 없다 입구만 있을 뿐..."
    ],
    "밝은": [
        "해바라기 같아 ㅠㅠ 보고 있으면 나까지 환해져!!",
        "인간 햇살... 조명이 필요 없어 자체 발광이니까!!!",
        "우울할 틈이 없다 진짜... 너가 내 태양이야 ㅠㅠ"
    ],
    "차분한": [
        "새벽 감성 뚝딱... 목소리 들으면 고막 녹아내려...",
        "지적인 매력 뿜뿜... 뇌섹남/뇌섹녀 모먼트 사랑해...",
        "같이 도서관 데이트 하고 싶다... 숨만 쉬어도 설레..."
    ],
    "유머러스한": [
        "개그캐였어?! ㅋㅋㅋ 얼굴만 봐도 웃긴데 입담까지?!",
        "너랑 있으면 배꼽 빠져 ㅋㅋㅋ 1일 1깡 대신 1일 1폭소!!",
        "센스 미쳤다 진짜 ㅋㅋㅋ 방송국 놈들이 가만 안 둘 인재!!"
    ],
    "자신감 있는": [
        "본업 천재 모먼트... 일하는 모습 너무 섹시해 ㅠㅠ",
        "자존감 지키미!!! 너만 믿고 따라갈게 대장님!!!",
        "무대 씹어먹는 카리스마... 무릎 갈렸다 이미..."
    ],
    "사려 깊은": [
        "섬세해 ㅠㅠ 나보다 나를 더 잘 챙겨줘...",
        "마음씨가 비단결이야... 천연기념물로 지정해야 함!!!",
        "눈물 버튼 ON... 존재 자체가 위로야 고마워 ㅠㅠ"
    ],
    "열정적인": [
        "유노윤호 저리가라네!!! 열정 만수르 인정!!!",
        "불꽃 카리스마!!! 그 열정에 내가 타버릴 것 같아...",
        "포기를 모르는 남자/여자... 멋져서 눈물 나 ㅠㅠ"
    ],
    "수줍은": [
        "수줍어?! ㅋㅋㅋ 귀 빨개지는 거 세상에서 제일 귀여워 ㅠㅠ",
        "부끄럼쟁이 ㅋㅋㅋ 내가 더 괴롭히고(?) 싶어지잖아!!",
        "샤이한 매력... 지켜주고 싶다 진짜... 내 주머니로 들어와!!"
    ],

    // Step 4: Charm Point
    "눈웃음": [
        "눈웃음 미쳤다... 심장이 녹아내려 ㅠㅠㅠ 물웅덩이 됐어...",
        "웃을 때 눈이 초승달 되는 거 실화?! 달빛 요정이세요?!",
        "그 눈웃음에 맞으면 즉사야... 방탄조끼 필수 착용!!!",
        "눈웃음 한 번에 내 수명 10년 늘어남... 불로장생 비결 발견!!"
    ],
    "목소리": [
        "목소리 뭐야?! 귀가 임신했어 ㅠㅠㅠ 고막 터져도 좋아...",
        "ASMR이 따로 없다... 하루종일 듣고 싶어 무한 반복 재생!!!",
        "목소리에서 꿀 뚝뚝... 성대가 황금이야?! 국보급 목소리!!!",
        "저음/고음 미쳤다... 귓가에 캠핑하고 싶어 텐트 칠게요..."
    ],
    "손": [
        "섬섬옥수 미쳤다... 손마저 잘생겼으면 반칙 아냐?!",
        "핏줄... 설렌다... 링거 꽂아주고 싶다(?)",
        "피아노 잘 칠 것 같아... 그 손으로 내 머리 쓰담쓰담 좀...",
        "손 사진 찍어서 액자에 걸어두고 싶다... 예술 작품이야..."
    ],
    "분위기": [
        "분위기 깡패다... 존재 자체가 한 편의 영화야 ㅠㅠ",
        "아우라 미쳤다!!! 공기가 달라져 숨을 못 쉬겠어...",
        "같이 있으면 내가 주인공이 된 기분이야... 로맨스 찍자!!!",
        "무드등이 필요 없어 자체 조명이니까... 분위기 맛집 인정!!"
    ],
    "눈빛": [
        "눈빛에 은하수 박았어?! 빠져든다 빠져들어... 익사 각!!",
        "그 눈으로 쳐다보면 심장 폭발이야... 소화기 가져와!!!",
        "눈빛 하나로 서사 뚝딱... 눈싸움하면 내가 100% 져 ㅠㅠ",
        "눈빛이 말을 해... 무슨 말인지는 모르겠지만 사랑해!!!"
    ],
    "미소": [
        "미소 짓는 순간 세상이 환해져!!! 태양 실직 위기...",
        "그 미소에 맞으면 기절이야... 자동 심폐소생술 필요!!!",
        "웃는 얼굴 보면 모든 걱정이 싹 사라져... 만병통치약...",
        "1일 1미소 안 보면 금단현상 와... 미소 중독자 인정 ㅠㅠ"
    ],
    "말투": [
        "말투 미쳤다... 어떻게 그렇게 말해?! 녹음해서 알람 삼을래!!!",
        "말 한마디에 심장이 콩닥콩닥... 대화만 해도 설레 ㅠㅠ",
        "특유의 말투가 중독성 있어... 하루종일 듣고 싶다 진짜...",
        "말투만 들어도 누군지 알아... 성대모사 불가 유일무이 말투!!!"
    ],
    "제스처": [
        "제스처 하나하나가 예술이야... 몸이 곧 캔버스!!!",
        "손짓 하나에 심장이 두근두근... 수화로 사랑 고백해줘!!!",
        "움직임이 물 흐르듯... 춤 안 춰도 춤추는 것 같아 ㅠㅠ",
        "제스처 장인 인정!!! 온몸으로 말하는 사람 처음 봐..."
    ]
}

export function CrazyTyper({ step, formData }: CrazyTyperProps) {
    const [displayText, setDisplayText] = useState("")
    const [isDeleting, setIsDeleting] = useState(false)
    const [queue, setQueue] = useState<string[]>([])
    const prevDataRef = useRef<FormDataType>(formData)

    // Watch for changes and trigger instantaneous reactions
    useEffect(() => {
        const prev = prevDataRef.current
        let reaction = ""

        // Step 1: Name change (Debounce slightly or just react to length?)
        if (step === 1 && formData.name !== prev.name && formData.name.length > 1) {
            // Randomly react to name typing
            if (Math.random() > 0.7) reaction = `${formData.name}?? 이름도 이뻐!!`
        }

        // Step 1: Gender change
        if (step === 1 && formData.gender !== prev.gender) {
            const list = REACTIONS[formData.gender] || ["헐 대박!!"]
            reaction = list[Math.floor(Math.random() * list.length)]
        }

        // Step 2: Style added
        if (step === 2 && formData.styles.length > prev.styles.length) {
            const newStyle = formData.styles.find(s => !prev.styles.includes(s))
            if (newStyle) {
                const list = REACTIONS[newStyle] || [`${newStyle} 스타일?! 미쳤다!!`]
                reaction = list[Math.floor(Math.random() * list.length)]
            }
        }

        // Step 3: Personality added
        if (step === 3 && formData.personalities.length > prev.personalities.length) {
            const newPers = formData.personalities.find(p => !prev.personalities.includes(p))
            if (newPers) {
                const list = REACTIONS[newPers] || [`${newPers} 성격?! 완전 내 스타일!!`]
                reaction = list[Math.floor(Math.random() * list.length)]
            }
        }

        // Step 4: Charm Point added
        if (step === 4 && formData.charmPoints.length > prev.charmPoints.length) {
            reaction = "매력이 끝이 없네!!!"
        }

        if (reaction) {
            // INSTANT UPDATE: Interrupt current cycle
            setDisplayText(reaction)
            setIsDeleting(false)
            // Add a "Shock" effect by clearing queue/timers if possible? 
            // We just let the main typing loop pick up from this new state or hold it.
            // For a "flash", we set it directly.
        }

        prevDataRef.current = formData
    }, [formData, step])

    // Main Typing Loop (Fallback to default comments if no reaction active)
    useEffect(() => {
        // If we just set a reaction manually (in the watcher above), 
        // we want to hold it for a bit, then delete. 
        // Or if it's currently typing/deleting normal comments.

        let timeout: NodeJS.Timeout

        const animate = () => {
            // Logic to cycle default comments...
            // Simplified for "Reaction Priority":
            // If displayText matches a Reaction, hold specifically. 
            // Otherwise cycle.

            // ... Implementing a simple loop for now
            if (!isDeleting) {
                if (displayText.length > 20) { // Arbitrary long length check or end of string
                    timeout = setTimeout(() => setIsDeleting(true), 1200)
                }
            } else {
                if (displayText.length === 0) {
                    setIsDeleting(false)
                    // Pick random default info
                } else {
                    setDisplayText(prev => prev.slice(0, -1))
                    timeout = setTimeout(animate, 30)
                }
            }
        }
        // Actually, mixing the two Logics (Reaction vs Loop) in one effect is hard.
        // Let's keep the reaction "Flash" separate.

    }, [displayText, isDeleting]) // This is getting complex. 

    // Simpler approach: 
    // The Watcher sets a "Reaction Mode" state.
    // If Reaction Mode is active, show that text. 
    // After 2 seconds, go back to Idle Loop.

    return (
        <Content step={step} formData={formData} />
    )
}

function Content({ step, formData }: CrazyTyperProps) {
    const [mainText, setMainText] = useState("누구야?!")
    const prevDataRef = useRef(formData)

    // Default Idle Comments
    const [idleIndex, setIdleIndex] = useState(0)

    // Reaction Trigger
    useEffect(() => {
        const prev = prevDataRef.current
        let reaction = ""

        // Style added
        if (formData.styles.length > prev.styles.length) {
            const newStyle = formData.styles[formData.styles.length - 1]
            const list = REACTIONS[newStyle] || [`${newStyle}?!!? 대박!!`]
            reaction = list[Math.floor(Math.random() * list.length)]
        }
        // Personality added
        else if (formData.personalities.length > prev.personalities.length) {
            const newPers = formData.personalities[formData.personalities.length - 1]
            const list = REACTIONS[newPers] || [`${newPers}?!!? 대박!!`]
            reaction = list[Math.floor(Math.random() * list.length)]
        }
        // Charm point added
        else if (formData.charmPoints.length > prev.charmPoints.length) {
            const newCharm = formData.charmPoints[formData.charmPoints.length - 1]
            const list = REACTIONS[newCharm] || [`${newCharm}?!!? 대박!!`]
            reaction = list[Math.floor(Math.random() * list.length)]
        }
        // Gender changed
        else if (formData.gender !== prev.gender) {
            const list = REACTIONS[formData.gender] || []
            if (list.length) reaction = list[Math.floor(Math.random() * list.length)]
        }
        // Step change - show intro text
        else if (step === 2 && prev.styles.length === formData.styles.length) reaction = "어떤 스타일이야??!"
        else if (step === 3 && prev.personalities.length === formData.personalities.length) reaction = "성격은 어때??!"
        else if (step === 4 && prev.charmPoints.length === formData.charmPoints.length) reaction = "매력 포인트는??!"

        if (reaction) {
            setMainText(reaction)
        }

        prevDataRef.current = formData
    }, [formData, step])

    return (
        <div className="relative min-h-[200px] flex items-center justify-center">
            {/* Text Rendering with Shake Effect */}
            <motion.div
                key={mainText} // Re-render animation on text change
                className="text-2xl sm:text-3xl md:text-5xl font-black text-center break-keep leading-tight drop-shadow-xl"
                initial={{ scale: 1.5, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
            >
                {mainText.split("").map((char, i) => (
                    <motion.span
                        key={i}
                        className="inline-block"
                        animate={{
                            y: [0, -5, 0],
                            color: ["#000000", "#FF0000", "#0000FF", "#000000"][i % 3]
                        }}
                        transition={{
                            duration: 0.2,
                            repeat: Infinity,
                            repeatDelay: Math.random() * 0.5
                        }}
                    >
                        {char}
                    </motion.span>
                ))}
            </motion.div>
        </div>
    )
}
