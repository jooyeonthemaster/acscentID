'use client'

import { useState, useCallback, useRef } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Upload,
  Trash2,
  Crop,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Loader2,
  RotateCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// ============================================================
// Types
// ============================================================
export type AspectRatioOption = '4/5' | '1/1' | '3/4' | '16/9' | 'free'

interface AspectRatioConfig {
  label: string
  value: number | undefined
  desc: string
}

const ASPECT_RATIOS: Record<AspectRatioOption, AspectRatioConfig> = {
  '4/5': { label: '4:5', value: 4 / 5, desc: '모바일 최적' },
  '1/1': { label: '1:1', value: 1, desc: '정사각형' },
  '3/4': { label: '3:4', value: 3 / 4, desc: '세로형' },
  '16/9': { label: '16:9', value: 16 / 9, desc: '가로형' },
  free: { label: '자유', value: undefined, desc: '자유 비율' },
}

// ============================================================
// Canvas crop helper (rotation 지원)
// ============================================================
function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  outputType = 'image/jpeg'
): Promise<Blob> {
  const image = new window.Image()
  image.crossOrigin = 'anonymous'

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = reject
    image.src = imageSrc
  })

  const rotRad = getRadianAngle(rotation)
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  )

  // Create canvas big enough for rotated image
  const canvas = document.createElement('canvas')
  canvas.width = bBoxWidth
  canvas.height = bBoxHeight
  const ctx = canvas.getContext('2d')!

  // Rotate around center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  // Extract the cropped area from the rotated canvas
  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height
  const croppedCtx = croppedCanvas.getContext('2d')!

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise<Blob>((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      },
      outputType,
      0.92
    )
  })
}

// ============================================================
// Upload helper
// ============================================================
const uploadCroppedImage = async (blob: Blob): Promise<string> => {
  const ext = blob.type === 'image/png' ? 'png' : 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const filePath = `popups/${timestamp}_${random}.${ext}`

  const { data, error } = await supabase.storage
    .from('admin-content')
    .upload(filePath, blob, {
      contentType: blob.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('admin-content')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

// ============================================================
// Aspect Ratio Selector
// ============================================================
export function AspectRatioSelector({
  value,
  onChange,
}: {
  value: AspectRatioOption
  onChange: (v: AspectRatioOption) => void
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        이미지 비율
      </label>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(ASPECT_RATIOS) as AspectRatioOption[]).map((key) => {
          const config = ASPECT_RATIOS[key]
          const isSelected = value === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`
                flex flex-col items-center px-3 py-2 rounded-xl border-2 transition-all text-center min-w-[64px]
                ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
            >
              {/* Mini preview box */}
              <div
                className={`rounded border mb-1 ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-200'
                    : 'border-slate-300 bg-slate-100'
                }`}
                style={{
                  width: key === '16/9' ? 32 : key === '1/1' ? 20 : 18,
                  height:
                    key === '16/9'
                      ? 18
                      : key === '1/1'
                        ? 20
                        : key === '4/5'
                          ? 22
                          : key === '3/4'
                            ? 24
                            : 20,
                }}
              />
              <span className="text-xs font-bold text-slate-900">
                {config.label}
              </span>
              <span className="text-[10px] text-slate-500">{config.desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Crop Modal
// ============================================================
function CropModal({
  imageSrc,
  aspectRatio,
  onComplete,
  onCancel,
}: {
  imageSrc: string
  aspectRatio: AspectRatioOption
  onComplete: (blob: Blob) => void
  onCancel: () => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const [cropError, setCropError] = useState('')

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setProcessing(true)
    setCropError('')
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      onComplete(blob)
    } catch (err: any) {
      console.error('Crop error:', err)
      setCropError(
        err?.message?.includes('SecurityError') || err?.message?.includes('tainted')
          ? '외부 이미지는 다시 크롭할 수 없습니다. 새 이미지를 업로드해 주세요.'
          : '크롭에 실패했습니다. 다시 시도해 주세요.'
      )
    } finally {
      setProcessing(false)
    }
  }

  const config = ASPECT_RATIOS[aspectRatio]

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur">
        <div className="flex items-center gap-2">
          <Crop className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-bold text-sm">이미지 크롭</span>
          <span className="text-slate-400 text-xs">
            ({config.label} - {config.desc})
          </span>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Cropper Area */}
      <div className="flex-1 relative">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={config.value}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          cropShape="rect"
          showGrid={true}
          style={{
            containerStyle: { background: '#111' },
          }}
        />
      </div>

      {/* Controls */}
      <div className="bg-slate-900/90 backdrop-blur px-4 py-4 space-y-3">
        {/* Zoom */}
        <div className="flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-slate-400" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none bg-slate-700 accent-yellow-400"
          />
          <ZoomIn className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 w-10 text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Rotation */}
        <div className="flex items-center gap-3">
          <RotateCw className="w-4 h-4 text-slate-400" />
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none bg-slate-700 accent-yellow-400"
          />
          <span className="text-xs text-slate-400 w-10 text-right">
            {rotation}°
          </span>
        </div>

        {/* Error message */}
        {cropError && (
          <div className="bg-red-500/20 text-red-300 text-xs px-3 py-2 rounded-lg">
            {cropError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="flex-1 py-2.5 text-sm font-bold text-slate-900 bg-yellow-400 rounded-xl hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            크롭 적용
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main Component: ImageCropUploader
// ============================================================
export function ImageCropUploader({
  imageUrl,
  aspectRatio,
  onUpload,
  onRemove,
}: {
  imageUrl: string
  aspectRatio: AspectRatioOption
  onUpload: (url: string) => void
  onRemove: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다.')
      return
    }
    setError('')

    // Read file and open cropper
    const reader = new FileReader()
    reader.onload = () => {
      setRawImageSrc(reader.result as string)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (blob: Blob) => {
    setShowCropper(false)
    setRawImageSrc(null)
    setUploading(true)
    try {
      const url = await uploadCroppedImage(blob)
      onUpload(url)
    } catch (err: any) {
      setError(err.message || '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setRawImageSrc(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Recrop existing image (fetch blob to avoid CORS tainted canvas)
  const handleRecrop = async () => {
    if (!imageUrl) return
    setError('')
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      setRawImageSrc(objectUrl)
      setShowCropper(true)
    } catch {
      setError('이미지를 다시 불러올 수 없습니다. 새 이미지를 업로드해 주세요.')
    }
  }

  const aspectStyle = aspectRatio === 'free' ? 'aspect-[4/5]' :
    aspectRatio === '16/9' ? 'aspect-[16/9]' :
    aspectRatio === '1/1' ? 'aspect-square' :
    aspectRatio === '3/4' ? 'aspect-[3/4]' :
    'aspect-[4/5]'

  return (
    <>
      {/* Crop Modal */}
      <AnimatePresence>
        {showCropper && rawImageSrc && (
          <CropModal
            imageSrc={rawImageSrc}
            aspectRatio={aspectRatio}
            onComplete={handleCropComplete}
            onCancel={handleCropCancel}
          />
        )}
      </AnimatePresence>

      {/* Uploaded Image Preview */}
      {imageUrl ? (
        <div className="relative group">
          <div className={`relative w-full ${aspectStyle} rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50`}>
            <Image
              src={imageUrl}
              alt="팝업 이미지"
              fill
              className="object-cover"
              unoptimized
            />
            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRecrop}
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-100"
              >
                <Crop className="w-4 h-4" />
                다시 크롭
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            </div>
          </div>
          {/* Ratio badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded-full">
            {ASPECT_RATIOS[aspectRatio].label}
          </div>
        </div>
      ) : (
        /* Upload Zone */
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`
              w-full ${aspectStyle} rounded-xl border-2 border-dashed cursor-pointer
              flex flex-col items-center justify-center gap-3 transition-colors
              ${
                dragOver
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
              }
              ${uploading ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                <span className="text-sm text-slate-500">업로드 중...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400" />
                <div className="text-center">
                  <span className="text-sm font-medium text-slate-600">
                    클릭 또는 드래그하여 이미지 업로드
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    PNG, JPG, WEBP (최대 10MB) · 업로드 후 크롭 가능
                  </p>
                </div>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChange}
          />
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>
      )}
    </>
  )
}
