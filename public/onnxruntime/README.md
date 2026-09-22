# onnxruntime-web 1.30.0 (wasm 전용 빌드)

포토부스 인물 오려내기(`src/lib/photobooth/segmentation.ts`)의 U²-Net 경량 모델(`/models/u2netp.onnx`)을 돌리는 런타임.
번들러를 거치지 않고 여기서 직접 불러온다(`import('/onnxruntime/ort.wasm.min.mjs')`) — MediaPipe WASM(`/mediapipe/wasm`)과 같은 자체 호스팅 방식.

- 출처: npm `onnxruntime-web@1.30.0` 의 `dist/` (MIT)
- 모델: U²-Net (xuebinqin/U-2-Net, Apache-2.0) 의 u2netp, rembg 배포본 ONNX 변환
- 버전을 올릴 때는 세 파일(ort.wasm.min.mjs, ort-wasm-simd-threaded.mjs, .wasm)을 함께 바꿀 것
