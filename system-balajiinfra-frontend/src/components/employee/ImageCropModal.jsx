import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, X, Check, Crop } from "lucide-react";

export default function ImageCropModal({ imageSrc, fileName = "employee_photo.png", onCropSave, onCancel }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const CROP_SIZE = 260; // 260x260 crop box size in px

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Handle Dragging / Panning
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleSave = () => {
    if (!imgRef.current || !imgLoaded) return;

    const canvas = document.createElement("canvas");
    const outputSize = 400; // 400x400 resolution output
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Draw background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outputSize, outputSize);

    // Calculate crop scaling factor relative to container
    const scale = outputSize / CROP_SIZE;

    ctx.save();
    // Move to canvas center
    ctx.translate(outputSize / 2, outputSize / 2);

    // Apply pan offset (scaled)
    ctx.translate(position.x * scale, position.y * scale);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply zoom
    ctx.scale(zoom, zoom);

    // Calculate base display size of image (matching object-contain behavior in crop box)
    const aspect = naturalSize.width / naturalSize.height;
    let drawW = CROP_SIZE;
    let drawH = CROP_SIZE;

    if (aspect > 1) {
      drawH = CROP_SIZE / aspect;
    } else {
      drawW = CROP_SIZE * aspect;
    }

    // Draw image centered at origin
    ctx.drawImage(
      imgRef.current,
      (-drawW / 2) * scale,
      (-drawH / 2) * scale,
      drawW * scale,
      drawH * scale
    );

    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) {
        const cleanName = fileName.replace(/\.[^/.]+$/, "") + "_cropped.png";
        const croppedFile = new File([blob], cleanName, { type: "image/png" });
        const croppedUrl = URL.createObjectURL(blob);
        onCropSave(croppedFile, cleanName, croppedUrl);
      }
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Crop className="w-5 h-5 text-sky-600" />
            <span>Crop & Adjust Photo</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Viewport Container */}
        <div className="p-6 flex flex-col items-center bg-slate-900 select-none">
          <div
            ref={containerRef}
            className="relative w-[280px] h-[280px] flex items-center justify-center overflow-hidden rounded-xl border-2 border-slate-700 cursor-grab active:cursor-grabbing bg-slate-950"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Image element being manipulated */}
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop target"
                crossOrigin="anonymous"
                className="pointer-events-none max-w-none transition-transform duration-75"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  maxHeight: `${CROP_SIZE}px`,
                  maxWidth: `${CROP_SIZE}px`,
                  objectFit: "contain",
                }}
              />
            )}

            {/* Darkened Overlay around crop frame */}
            <div className="absolute inset-0 pointer-events-none border-[10px] border-black/40 rounded-xl">
              <div className="w-full h-full border-2 border-dashed border-sky-400/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
            <span>💡</span> Drag image to position inside frame
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="p-5 bg-white space-y-4">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-slate-500" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <ZoomIn className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600 w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Buttons: Rotate & Reset */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleRotate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate 90°</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Apply Crop</span>
          </button>
        </div>
      </div>
    </div>
  );
}
