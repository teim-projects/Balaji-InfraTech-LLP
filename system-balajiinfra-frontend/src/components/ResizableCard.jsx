import React, { useState, useEffect, useRef, useCallback } from "react";
import { Maximize2, Minimize2, RotateCcw, Move, GripHorizontal } from "lucide-react";

/**
 * ResizableCard Component
 * Wraps dashboard cards with interactive drag-to-resize capability (both corner and bottom edge),
 * double-click reset, quick size presets, and localStorage persistence.
 */
export default function ResizableCard({
  id,
  children,
  defaultHeight = 360,
  minHeight = 220,
  maxHeight = 850,
  defaultWidth = null,
  minWidth = 280,
  maxWidth = 1400,
  allowHorizontal = false,
  className = "",
  style = {},
  headerActions = null,
}) {
  const cardRef = useRef(null);

  // Load persisted height / width if available
  const [height, setHeight] = useState(() => {
    if (!id) return defaultHeight;
    try {
      const saved = localStorage.getItem(`dash_card_h_${id}`);
      if (saved) {
        // Clear out old 400px legacy default for pending uan card
        if (id === "pending-uan-card" && saved === "400") {
          localStorage.removeItem(`dash_card_h_${id}`);
          return defaultHeight;
        }
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= minHeight && parsed <= maxHeight) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return defaultHeight;
  });

  const [width, setWidth] = useState(() => {
    if (!id || !allowHorizontal) return defaultWidth;
    try {
      const saved = localStorage.getItem(`dash_card_w_${id}`);
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return defaultWidth;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState(null); // 'corner' | 'bottom' | 'right'
  const [isHovered, setIsHovered] = useState(false);

  // Save to localStorage ONLY when user manually resizes (not on initial default render)
  const persistDimensions = useCallback((h, w) => {
    if (!id) return;
    try {
      if (h) localStorage.setItem(`dash_card_h_${id}`, String(Math.round(h)));
      if (w && allowHorizontal) localStorage.setItem(`dash_card_w_${id}`, String(Math.round(w)));
    } catch {
      // ignore
    }
  }, [id, allowHorizontal]);

  // Reset to default
  const handleReset = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setHeight(defaultHeight);
    if (allowHorizontal) setWidth(defaultWidth);
    if (id) {
      try {
        localStorage.removeItem(`dash_card_h_${id}`);
        localStorage.removeItem(`dash_card_w_${id}`);
      } catch {
        // ignore
      }
    }
  }, [id, defaultHeight, defaultWidth, allowHorizontal]);

  // Quick Preset Sizing
  const handlePreset = useCallback((preset) => {
    if (preset === "compact") {
      setHeight(minHeight);
    } else if (preset === "default") {
      setHeight(defaultHeight);
    } else if (preset === "expanded") {
      setHeight(Math.min(maxHeight, Math.round(defaultHeight * 1.45)));
    } else if (preset === "full") {
      setHeight(maxHeight);
    }
  }, [minHeight, defaultHeight, maxHeight]);

  // Mouse / Touch Resize Handler
  const startResize = useCallback((e, direction) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setDragDirection(direction);

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const startH = cardRef.current ? cardRef.current.offsetHeight : (height || defaultHeight);
    const startW = cardRef.current ? cardRef.current.offsetWidth : (width || defaultWidth || 400);

    let lastH = startH;
    let lastW = startW;

    const onMove = (moveEvt) => {
      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;

      if (direction === "bottom" || direction === "corner") {
        const deltaY = curY - clientY;
        const newH = Math.max(minHeight, Math.min(maxHeight, startH + deltaY));
        lastH = Math.round(newH);
        setHeight(lastH);
      }

      if (allowHorizontal && (direction === "right" || direction === "corner")) {
        const deltaX = curX - clientX;
        const newW = Math.max(minWidth, Math.min(maxWidth, startW + deltaX));
        lastW = Math.round(newW);
        setWidth(lastW);
      }
    };

    const onEnd = () => {
      setIsDragging(false);
      setDragDirection(null);
      persistDimensions(lastH, lastW);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor =
      direction === "corner" ? "nwse-resize" : direction === "right" ? "ew-resize" : "ns-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, [height, width, defaultHeight, defaultWidth, minHeight, maxHeight, minWidth, maxWidth, allowHorizontal, persistDimensions]);

  const isCustomHeight = Math.abs((height || defaultHeight) - defaultHeight) > 10;

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: height ? `${height}px` : "auto",
        width: width && allowHorizontal ? `${width}px` : "100%",
        minHeight: `${minHeight}px`,
        maxHeight: `${maxHeight}px`,
        ...style,
      }}
      className={`relative group flex flex-col ${
        isDragging ? "transition-none select-none ring-2 ring-sky-400 shadow-xl" : "transition-[height,box-shadow,border-color] duration-200"
      } ${className}`}
    >
      {/* Card Content */}
      <div className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden w-full h-full">
        {children}
      </div>

      {/* Floating Resize Controls (Only visible while actively dragging) */}
      <div
        className={`absolute bottom-2.5 right-6 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-full px-2 py-0.5 shadow-sm text-[9.5px] font-semibold text-slate-600 transition-opacity duration-200 ${
          isDragging ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="text-slate-400 font-mono text-[9px] mr-0.5">
          {Math.round(height)}px
        </span>

        {isCustomHeight && (
          <button
            type="button"
            onClick={handleReset}
            title="Reset to default height (or double-click resize grip)"
            className="p-0.5 hover:text-sky-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => handlePreset(height > defaultHeight ? "default" : "expanded")}
          title={height > defaultHeight ? "Compact view" : "Expand view"}
          className="p-0.5 hover:text-sky-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
        >
          {height > defaultHeight ? <Minimize2 className="w-2.5 h-2.5" /> : <Maximize2 className="w-2.5 h-2.5" />}
        </button>
      </div>

      {/* Bottom Horizontal Resize Grip Bar */}
      <div
        onMouseDown={(e) => startResize(e, "bottom")}
        onTouchStart={(e) => startResize(e, "bottom")}
        onDoubleClick={handleReset}
        title="Hold & drag to resize height (Double-click to reset)"
        className={`absolute bottom-0 left-0 right-4 h-2.5 cursor-ns-resize z-20 flex items-center justify-center transition-colors group/bottom ${
          isDragging && dragDirection === "bottom" ? "bg-sky-400/30" : "hover:bg-sky-400/20"
        }`}
      >
        <div className="w-10 h-1 rounded-full bg-slate-300/80 group-hover/bottom:bg-sky-500 transition-colors" />
      </div>

      {/* Corner Diagonal Resize Grip Handle */}
      <div
        onMouseDown={(e) => startResize(e, "corner")}
        onTouchStart={(e) => startResize(e, "corner")}
        onDoubleClick={handleReset}
        title="Hold and drag to resize (Double-click to reset)"
        className={`absolute bottom-0.5 right-0.5 w-4 h-4 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 transition-all ${
          isDragging && dragDirection === "corner" ? "scale-125 text-sky-600" : "text-slate-400 hover:text-sky-600 hover:scale-110"
        }`}
      >
        <svg
          viewBox="0 0 10 10"
          className="w-2.5 h-2.5 stroke-current fill-current opacity-70 hover:opacity-100"
        >
          <line x1="8" y1="2" x2="2" y2="8" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="8" y1="5" x2="5" y2="8" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="8" y1="8" x2="8" y2="8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
