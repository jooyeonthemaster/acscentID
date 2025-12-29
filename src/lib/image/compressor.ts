/**
 * 이미지 압축 유틸리티
 * - 최대 너비/높이 제한
 * - JPEG 품질 조절
 * - Canvas API 활용
 */

export interface CompressionOptions {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    mimeType?: "image/jpeg" | "image/webp"
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxWidth: 800,
    maxHeight: 960,  // 5:6 비율 유지 (800 * 1.2)
    quality: 0.8,
    mimeType: "image/jpeg"
}

/**
 * 이미지 파일을 압축하여 base64 문자열로 반환
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    return new Promise((resolve, reject) => {
        const img = new Image()
        const reader = new FileReader()

        reader.onload = (e) => {
            img.src = e.target?.result as string
        }

        reader.onerror = () => {
            reject(new Error("이미지 파일을 읽을 수 없습니다."))
        }

        img.onload = () => {
            try {
                const { width, height } = calculateDimensions(
                    img.width,
                    img.height,
                    opts.maxWidth,
                    opts.maxHeight
                )

                const canvas = document.createElement("canvas")
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    reject(new Error("Canvas context를 생성할 수 없습니다."))
                    return
                }

                // 이미지 스무딩 설정 (고품질 리사이징)
                ctx.imageSmoothingEnabled = true
                ctx.imageSmoothingQuality = "high"

                // 이미지 그리기
                ctx.drawImage(img, 0, 0, width, height)

                // base64로 변환
                const compressedBase64 = canvas.toDataURL(opts.mimeType, opts.quality)

                resolve(compressedBase64)
            } catch (error) {
                reject(error)
            }
        }

        img.onerror = () => {
            reject(new Error("이미지를 로드할 수 없습니다."))
        }

        reader.readAsDataURL(file)
    })
}

/**
 * 비율을 유지하면서 최대 크기 내에서 새 dimensions 계산
 */
function calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    let width = originalWidth
    let height = originalHeight

    // 이미 충분히 작으면 그대로 반환
    if (width <= maxWidth && height <= maxHeight) {
        return { width, height }
    }

    // 비율 계산
    const widthRatio = maxWidth / width
    const heightRatio = maxHeight / height
    const ratio = Math.min(widthRatio, heightRatio)

    width = Math.round(width * ratio)
    height = Math.round(height * ratio)

    return { width, height }
}

/**
 * base64 문자열의 대략적인 파일 크기 계산 (바이트)
 */
export function estimateBase64Size(base64: string): number {
    // base64 데이터 부분만 추출
    const base64Data = base64.split(",")[1] || base64
    // base64는 원본의 약 4/3 크기
    return Math.round((base64Data.length * 3) / 4)
}

/**
 * 파일 크기를 사람이 읽기 좋은 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Storage 업로드용 최적화 설정
 */
const STORAGE_OPTIONS = {
    maxWidth: 800,
    maxHeight: 960,
    quality: 0.7,  // Storage용으로 조금 더 압축
    maxSizeKB: 500  // 최대 500KB 목표
}

/**
 * base64 이미지를 Storage 업로드용 Blob으로 압축
 * - 800x960 최대 크기
 * - 품질 0.7 (70%)
 * - 최대 500KB 목표 (초과 시 품질 추가 조정)
 */
export async function compressForStorage(base64: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image()

        img.onload = async () => {
            try {
                const { width, height } = calculateDimensions(
                    img.width,
                    img.height,
                    STORAGE_OPTIONS.maxWidth,
                    STORAGE_OPTIONS.maxHeight
                )

                const canvas = document.createElement("canvas")
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    reject(new Error("Canvas context를 생성할 수 없습니다."))
                    return
                }

                // 고품질 리사이징
                ctx.imageSmoothingEnabled = true
                ctx.imageSmoothingQuality = "high"
                ctx.drawImage(img, 0, 0, width, height)

                // 초기 품질로 Blob 생성
                let quality = STORAGE_OPTIONS.quality
                let blob = await canvasToBlob(canvas, quality)

                // 500KB 초과 시 품질 조정 (최소 0.4까지)
                while (blob.size > STORAGE_OPTIONS.maxSizeKB * 1024 && quality > 0.4) {
                    quality -= 0.1
                    blob = await canvasToBlob(canvas, quality)
                }

                console.log(`[compressForStorage] Final size: ${formatFileSize(blob.size)}, quality: ${quality.toFixed(1)}`)
                resolve(blob)
            } catch (error) {
                reject(error)
            }
        }

        img.onerror = () => {
            reject(new Error("이미지를 로드할 수 없습니다."))
        }

        img.src = base64
    })
}

/**
 * Canvas를 Blob으로 변환하는 헬퍼 함수
 */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob)
                } else {
                    reject(new Error("Blob 생성에 실패했습니다."))
                }
            },
            "image/jpeg",
            quality
        )
    })
}

/**
 * base64를 Blob으로 직접 변환 (압축 없이)
 */
export function base64ToBlob(base64: string): Blob {
    const base64Data = base64.split(",")[1] || base64
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: "image/jpeg" })
}
