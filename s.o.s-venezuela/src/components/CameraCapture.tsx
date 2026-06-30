import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, RotateCcw, AlertCircle, Check, ZoomIn } from 'lucide-react';

interface CameraCaptureProps {
  onPhotoSelected: (base64Photo: string) => void;
  initialPhotoUrl?: string;
}

export default function CameraCapture({ onPhotoSelected, initialPhotoUrl }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl || null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isActivatingCamera, setIsActivatingCamera] = useState(false);

  // Cropping & Framing States
  const [originalPhoto, setOriginalPhoto] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Turn on device camera
  const startCamera = async () => {
    setCameraError(null);
    setIsActivatingCamera(true);
    try {
      stopCamera();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setMode('camera');
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("No se pudo acceder a la cámara. Verifica los permisos o usa la opción de subir archivo.");
      setMode('upload');
    } finally {
      setIsActivatingCamera(false);
    }
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Draw frame to canvas
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Horizontal flip for mirror effect when using front-facing camera
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Reset transform
      context.setTransform(1, 0, 0, 1, 0, 0);

      // Convert to high quality base64 jpeg for editing
      const base64 = canvas.toDataURL('image/jpeg', 0.95);
      setOriginalPhoto(base64);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setIsCropping(true);
      stopCamera();
    }
  };

  // Handle uploaded file input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setOriginalPhoto(base64);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  // Reset and retake photo
  const handleReset = () => {
    setPhotoPreview(null);
    setOriginalPhoto(null);
    setIsCropping(false);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    onPhotoSelected("");
    if (mode === 'camera') {
      startCamera();
    }
  };

  // Drag handlers for cropping view
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Cancel framing/cropping
  const cancelCrop = () => {
    setOriginalPhoto(null);
    setIsCropping(false);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    if (!photoPreview) {
      onPhotoSelected("");
    }
  };

  // Process the crop and trigger the final image save
  const applyCrop = () => {
    if (!originalPhoto) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const outputSize = 400; // Perfect square for reliable face scanning
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const imgW = img.width;
        const imgH = img.height;
        const viewportSize = 180; // Match CSS viewport size

        // Base scale to cover the square viewport
        const baseScale = Math.max(viewportSize / imgW, viewportSize / imgH);
        const renderW = imgW * baseScale;
        const renderH = imgH * baseScale;

        // Ratio between final canvas output and viewport
        const ratio = outputSize / viewportSize;
        const drawnW = renderW * zoom * ratio;
        const drawnH = renderH * zoom * ratio;

        const drawnX = (outputSize / 2) - (drawnW / 2) + (pan.x * ratio);
        const drawnY = (outputSize / 2) - (drawnH / 2) + (pan.y * ratio);

        // Background color fill
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outputSize, outputSize);

        // Draw image onto canvas with custom transform
        ctx.drawImage(img, drawnX, drawnY, drawnW, drawnH);

        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.90);
        setPhotoPreview(croppedBase64);
        onPhotoSelected(croppedBase64);
        setIsCropping(false);
      }
    };
    img.src = originalPhoto;
  };

  return (
    <div className="space-y-3">
      {/* Selector of Mode (only show if not cropping) */}
      {!isCropping && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setMode('upload');
            }}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg border transition ${
              mode === 'upload' && !photoPreview
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Upload className="inline-block h-3.5 w-3.5 mr-1" />
            Subir Foto
          </button>
          <button
            type="button"
            onClick={startCamera}
            disabled={isActivatingCamera}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg border transition flex items-center justify-center gap-1 ${
              mode === 'camera' || (stream && !photoPreview)
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {isActivatingCamera ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            Tomar Foto
          </button>
        </div>
      )}

      {cameraError && !isCropping && (
        <div className="flex items-start gap-2 p-2.5 bg-red-50 text-red-800 text-xs rounded-lg border border-red-100">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Frame / Window */}
      <div 
        className={`relative border border-slate-200 rounded-xl overflow-hidden transition-all duration-300 ${
          isCropping 
            ? 'bg-slate-950 shadow-md p-4 flex flex-col items-center justify-center min-h-[350px]' 
            : 'bg-slate-50 h-56 flex items-center justify-center shadow-sm'
        }`}
      >
        {isCropping ? (
          /* INTERACTIVE CROPPING/ALIGNMENT WORKSPACE */
          <div className="flex flex-col items-center w-full space-y-4">
            <div className="text-center">
              <h4 className="text-xs font-bold text-brand-yellow flex items-center justify-center gap-1.5 uppercase tracking-wide">
                <span className="inline-block w-2 h-2 rounded-full bg-brand-yellow animate-pulse" />
                Ajustar Encuadre
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 max-w-[240px] leading-tight">
                Arrastra y ajusta el zoom para que el rostro quede perfectamente centrado
              </p>
            </div>

            {/* Circular Crop Viewport container */}
            <div 
              className="relative w-[180px] h-[180px] rounded-full overflow-hidden border-2 border-brand-yellow/80 bg-slate-900 cursor-move shadow-inner select-none overflow-hidden touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {originalPhoto && (
                <img
                  src={originalPhoto}
                  alt="Ajuste de rostro"
                  className="absolute pointer-events-none select-none max-w-none max-h-none origin-center"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  }}
                  referrerPolicy="no-referrer"
                />
              )}
              
              {/* Overlay HUD guidelines */}
              <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Horizontal crosshair */}
                <div className="h-[1px] w-6 bg-brand-yellow/40 absolute" />
                {/* Vertical crosshair */}
                <div className="h-6 w-[1px] bg-brand-yellow/40 absolute" />
                {/* Outer face alignment ellipse template */}
                <div className="h-[130px] w-[110px] rounded-full border border-dashed border-white/20 absolute" />
              </div>
            </div>

            {/* Slider zoom controls */}
            <div className="w-full max-w-[210px] space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                <span>Alejar</span>
                <span>Zoom: {Math.round(zoom * 100)}%</span>
                <span>Acercar</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="3.5"
                  step="0.02"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-yellow"
                />
              </div>
            </div>

            {/* Crop Control Action Row */}
            <div className="flex gap-2 w-full max-w-[210px]">
              <button
                type="button"
                onClick={cancelCrop}
                className="flex-1 py-1.5 text-center text-xs font-semibold rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyCrop}
                className="flex-1 py-1.5 text-center text-xs font-bold rounded-lg bg-brand-yellow text-slate-900 hover:bg-brand-yellow/90 transition flex items-center justify-center gap-1 cursor-pointer shadow"
              >
                <Check className="h-3 w-3" />
                Confirmar
              </button>
            </div>
          </div>
        ) : photoPreview ? (
          /* PREVIEW OF CROPED PHOTO */
          <div className="relative h-full w-full flex items-center justify-center bg-slate-100">
            <img
              src={photoPreview}
              alt="Foto del rostro"
              className="h-full w-auto max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
            {/* Soft badge indicating success square format */}
            <span className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur text-brand-yellow text-[9px] font-bold px-2 py-0.5 rounded-full border border-brand-yellow/20 flex items-center gap-1 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-yellow animate-pulse" />
              1:1 Rostro Encuadrado
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-950 backdrop-blur text-white px-2.5 py-1 text-[11px] font-semibold rounded-lg shadow transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3 text-brand-yellow" />
              Cambiar foto
            </button>
          </div>
        ) : mode === 'camera' && stream ? (
          /* LIVE VIDEO CAMERA STREAM */
          <div className="relative h-full w-full">
            <video
              ref={videoRef}
              className="h-full w-full object-cover scale-x-[-1]"
              muted
              playsInline
            />
            <div className="absolute inset-0 border-2 border-dashed border-brand-yellow/50 rounded-lg pointer-events-none m-4 flex items-center justify-center">
              <div className="h-44 w-44 rounded-full border border-dashed border-brand-blue/40 flex items-center justify-center">
                <span className="text-[10px] text-slate-200 bg-slate-900/75 backdrop-blur px-2.5 py-0.5 rounded-full font-sans font-medium">
                  Encuadra el rostro
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={capturePhoto}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-brand-red text-white font-bold text-xs px-4 py-2 rounded-full shadow hover:bg-brand-red/90 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              Capturar
            </button>
          </div>
        ) : (
          /* FILE UPLOADER DRAWER */
          <label className="flex flex-col items-center justify-center h-full w-full p-4 cursor-pointer hover:bg-slate-100/50 transition">
            <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200 text-slate-500 mb-2">
              <Upload className="h-5 w-5 text-brand-blue" />
            </div>
            <span className="text-xs font-semibold text-slate-700">Arrastra o sube una imagen de rostro</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Formatos soportados: JPG, PNG, WEBP</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Hidden canvas for taking photos */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
