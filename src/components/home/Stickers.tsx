"use client"


// Common Props
interface StickerProps {
    className?: string
    style?: React.CSSProperties
    onClick?: () => void
}

// 1. 3D Perfume Bottle Sticker (Vector)
export function StickerPerfume({ className, style, onClick }: StickerProps) {
    return (
        <svg
            width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"
            className={`drop-shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all duration-300 ${className}`}
            style={style}
            onClick={onClick}
        >
            {/* Bottle Body */}
            <path d="M50 80 H150 V160 C150 176.569 136.569 190 120 190 H80 C63.4315 190 50 176.569 50 160 V80 Z" fill="#F472B6" stroke="black" strokeWidth="4" />
            {/* Liquid Shine/Reflection */}
            <path d="M60 90 H100 V160 C100 165 95 170 90 170 H60 V90 Z" fill="white" fillOpacity="0.3" />
            <path d="M110 100 H140 V150 C140 155 135 160 130 160 H110 V100 Z" fill="#EC4899" fillOpacity="0.2" />

            {/* Neck */}
            <rect x="85" y="50" width="30" height="30" fill="#FCD34D" stroke="black" strokeWidth="4" />
            <path d="M90 50 V80" stroke="black" strokeWidth="2" strokeOpacity="0.2" />
            <path d="M110 50 V80" stroke="black" strokeWidth="2" strokeOpacity="0.2" />

            {/* Cap (Round) */}
            <circle cx="100" cy="30" r="20" fill="#FCD34D" stroke="black" strokeWidth="4" />
            <circle cx="106" cy="24" r="6" fill="white" fillOpacity="0.6" stroke="none" />

            {/* Label */}
            <rect x="70" y="110" width="60" height="40" rx="4" fill="white" stroke="black" strokeWidth="3" />
            <path d="M80 125 H120" stroke="black" strokeWidth="3" strokeLinecap="round" />
            <path d="M90 135 H110" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
}

// 2. Retro Ticket Sticker
export function StickerTicket({ title, discount, color = "#A5F3FC", className, onClick }: StickerProps & { title: string, discount: string, color?: string }) {
    return (
        <div
            className={`relative group cursor-pointer ${className}`}
            onClick={onClick}
        >
            {/* Ticket SVG Shape */}
            <svg width="260" height="140" viewBox="0 0 260 140" fill="none" className="drop-shadow-[6px_6px_0px_#000] group-hover:drop-shadow-[2px_2px_0px_#000] transition-all duration-300">
                <path
                    d="M10 10 H250 V40 C240 40 240 60 250 60 V130 H10 V60 C20 60 20 40 10 40 V10 Z"
                    fill={color}
                    stroke="black"
                    strokeWidth="4"
                />
                {/* Dashed Line */}
                <line x1="190" y1="15" x2="190" y2="125" stroke="black" strokeWidth="3" strokeDasharray="8 8" />
                {/* Hole */}
                <circle cx="20" cy="50" r="0" fill="white" /> {/* Visual trick for cutout if needed, but handled by path */}
            </svg>

            {/* Content Overlay */}
            <div className="absolute inset-0 p-6 flex items-center">
                <div className="w-[170px]">
                    <div className="text-xs font-black text-slate-900 tracking-widest mb-1">특별 혜택</div>
                    <div className="text-xl font-black text-slate-900 uppercase leading-none mb-2 break-keep">{title}</div>
                    <div className="inline-block bg-black text-white px-2 py-0.5 text-xs font-bold rounded-sm">쿠폰</div>
                </div>
                <div className="flex-1 flex justify-center items-center rotate-90">
                    <span className="text-3xl font-black text-slate-900 whitespace-nowrap">{discount}</span>
                </div>
            </div>
        </div>
    )
}

// 3. Puffy Star Sticker
export function StickerStar({ className }: StickerProps) {
    return (
        <svg width="80" height="80" viewBox="0 0 100 100" className={`animate-spin-slow ${className}`}>
            <path
                d="M50 0 L61 35 L98 35 L68 57 L79 91 L50 70 L21 91 L32 57 L2 35 L39 35 Z"
                fill="#FEF08A"
                stroke="black"
                strokeWidth="4"
                strokeLinejoin="round"
                className="drop-shadow-md"
            />
            {/* Face */}
            <circle cx="40" cy="50" r="4" fill="black" />
            <circle cx="60" cy="50" r="4" fill="black" />
            <path d="M45 60 Q50 65 55 60" stroke="black" strokeWidth="3" fill="none" />
        </svg>
    )
}

// 4. "NEW" Burst Badge
export function StickerNew({ className }: StickerProps) {
    return (
        <div className={`relative w-24 h-24 flex items-center justify-center ${className}`}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full animate-pulse-slow">
                <path
                    d="M50 0 L60 20 L80 10 L85 30 L100 40 L85 60 L95 80 L70 85 L60 100 L40 90 L20 95 L15 75 L0 60 L20 45 L10 20 L35 25 Z"
                    fill="#F43F5E"
                    stroke="black"
                    strokeWidth="3"
                />
            </svg>
            <span className="relative z-10 font-black text-white text-xl rotate-[-10deg]">신규!</span>
        </div>
    )
}

// 5. Game Cartridge Card (For Programs)
export function StickerCartridge({ title, subtitle, color, className, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={`
                relative w-64 h-80 ${color} border-4 border-slate-900 rounded-t-2xl rounded-b-lg
                shadow-[8px_8px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:translate-x-1 hover:translate-y-1
                transition-all cursor-pointer flex flex-col overflow-hidden ${className}
            `}
        >
            {/* Grip Lines */}
            <div className="h-6 bg-black/10 w-full border-b-4 border-slate-900 flex justify-center gap-2 items-center">
                <div className="w-40 h-1 bg-black/20 rounded-full" />
                <div className="w-40 h-1 bg-black/20 rounded-full" />
            </div>

            {/* Label Area */}
            <div className="flex-1 p-4 flex flex-col items-center justify-center text-center bg-white m-3 mb-8 border-2 border-slate-900 rounded-lg relative overflow-hidden">
                {/* Holo Shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent w-[200%] h-full animate-shine" />

                <h3 className="font-black text-5xl md:text-2xl text-slate-900 leading-none mb-2 z-10 break-keep">{title}</h3>
                <p className="text-xl md:text-xs font-bold text-slate-500 z-10 break-keep">{subtitle}</p>
                <div className="mt-4 z-10">
                    <span className="inline-block px-4 py-2 md:px-2 md:py-1 bg-black text-white text-lg md:text-[10px] font-bold rounded">PPUDUCK</span>
                </div>
            </div>

            {/* Bottom Connector */}
            <div className="h-4 bg-slate-800 w-3/4 mx-auto rounded-t-md mb-0" />
        </div>
    )
}
