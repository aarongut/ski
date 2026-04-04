import * as React from "react";
import * as Model from "@/model";
import { Picture } from "@/components/picture";

export interface Props {
  image: Model.Image;
  previousImage: Model.Image;
  nextImage: Model.Image;
  onClose: () => void;
  showNext: () => void;
  showPrevious: () => void;
  width: number;
}

interface TouchStart {
  x: number;
  y: number;
}

interface PinchState {
  distance: number;
  startZoom: number;
}

interface Point {
  x: number;
  y: number;
}

export const BigPicture: React.FC<Props> = ({
  image,
  previousImage,
  nextImage,
  onClose,
  showNext,
  showPrevious,
  width,
}) => {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [touchStart, setTouchStart] = React.useState<TouchStart | null>(null);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [animating, setAnimating] = React.useState(false);
  const [isSnapping, setIsSnapping] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState<Point>({ x: 0, y: 0 });
  const [panStart, setPanStart] = React.useState<Point | null>(null);
  const [pinchState, setPinchState] = React.useState<PinchState | null>(null);
  const [isPointerPanning, setIsPointerPanning] = React.useState(false);
  const tapStartRef = React.useRef<Point | null>(null);
  const lastTapRef = React.useRef<{ time: number; x: number; y: number } | null>(null);

  const onEscape = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  const goNext = React.useCallback(() => {
    showNext();
  }, [showNext]);

  const goPrevious = React.useCallback(() => {
    showPrevious();
  }, [showPrevious]);

  const getViewportCenter = React.useCallback((): Point | null => {
    const node = viewportRef.current;
    if (!node) {
      return null;
    }
    const rect = node.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  }, []);

  const clampPan = React.useCallback(
    (nextPan: Point, nextZoom?: number) => {
      const node = viewportRef.current;
      if (!node) {
        return nextPan;
      }
      const z = nextZoom ?? zoom;
      if (z <= 1) {
        return { x: 0, y: 0 };
      }
      const viewportRect = node.getBoundingClientRect();
      const viewportWidth = viewportRect.width;
      const viewportHeight = viewportRect.height;
      const imgScaleWidth = image.width / width;
      const imgScaleHeight = image.height / (window.innerHeight - 80);
      const imgScale = Math.max(imgScaleWidth, imgScaleHeight);
      const displayWidth = image.width / imgScale;
      const displayHeight = image.height / imgScale;
      const maxPanX = Math.max(0, (displayWidth * z - viewportWidth) / 2);
      const maxPanY = Math.max(0, (displayHeight * z - viewportHeight) / 2);
      return {
        x: Math.min(maxPanX, Math.max(-maxPanX, nextPan.x)),
        y: Math.min(maxPanY, Math.max(-maxPanY, nextPan.y)),
      };
    },
    [image.height, image.width, width, zoom],
  );

  const applyZoomAt = React.useCallback(
    (nextZoom: number, focalPoint?: Point) => {
      const clampedZoom = Math.min(4, Math.max(1, nextZoom));
      const center = getViewportCenter();
      if (!center) {
        setZoom(clampedZoom);
        setPan({ x: 0, y: 0 });
        return;
      }
      const focus = focalPoint ?? center;
      const ratio = clampedZoom / zoom;
      const nextPan = {
        x: pan.x * ratio + (focus.x - center.x) * (1 - ratio),
        y: pan.y * ratio + (focus.y - center.y) * (1 - ratio),
      };
      setZoom(clampedZoom);
      setPan(clampPan(nextPan, clampedZoom));
    },
    [clampPan, getViewportCenter, pan.x, pan.y, zoom],
  );

  const startSwipe = React.useCallback((touch: React.Touch) => {
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
    setDragOffset(0);
  }, []);

  const onTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      tapStartRef.current = null;

      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const dx = a.clientX - b.clientX;
        const dy = a.clientY - b.clientY;
        const distance = Math.hypot(dx, dy);
        setPinchState({ distance, startZoom: zoom });
        setIsDragging(false);
        setTouchStart(null);
        setPanStart(null);
        return;
      }

      if (zoom > 1) {
        const touch = e.touches[0];
        setPanStart({ x: touch.clientX, y: touch.clientY });
        setIsDragging(false);
        setTouchStart(null);
        tapStartRef.current = { x: touch.clientX, y: touch.clientY };
        return;
      }

      const touch = e.touches[0];
      startSwipe(touch);
      tapStartRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [startSwipe, zoom],
  );

  const onTouchEnd = React.useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      const tapStart = tapStartRef.current;
      const now = Date.now();
      const isTap =
        tapStart && Math.hypot(tapStart.x - touch.clientX, tapStart.y - touch.clientY) < 10;
      const lastTap = lastTapRef.current;

      if (isTap && lastTap && now - lastTap.time < 350) {
        const distance = Math.hypot(lastTap.x - touch.clientX, lastTap.y - touch.clientY);
        if (distance < 40) {
          const rect = viewportRef.current?.getBoundingClientRect();
          const focal = rect
            ? { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
            : undefined;
          const fitScale = Math.max(image.width / width, image.height / (window.innerHeight - 80));
          const targetZoom = zoom > 1.05 ? 1 : Math.min(4, fitScale);
          applyZoomAt(targetZoom, focal);
          setIsDragging(false);
          setTouchStart(null);
          setPanStart(null);
          tapStartRef.current = null;
          lastTapRef.current = null;
          return;
        }
      }

      if (isTap) {
        lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
      }

      if (pinchState) {
        setPinchState(null);
        return;
      }

      if (zoom > 1) {
        setPanStart(null);
        return;
      }

      if (!touchStart) {
        return;
      }
      const dx = touch.clientX - touchStart.x;
      const threshold = Math.max(50, width * 0.08);
      const movedEnough = Math.abs(dx) > threshold;

      setIsDragging(false);
      setTouchStart(null);

      if (movedEnough) {
        const target = dx < 0 ? -width : width;
        setAnimating(true);
        setDragOffset(target);
        setTimeout(() => {
          setIsSnapping(true);
          if (dx < 0) {
            goNext();
          } else {
            goPrevious();
          }
          requestAnimationFrame(() => {
            setDragOffset(0);
            setAnimating(false);
            requestAnimationFrame(() => setIsSnapping(false));
          });
        }, 220);
      } else {
        setDragOffset(0);
      }
    },
    [
      applyZoomAt,
      goNext,
      goPrevious,
      image.height,
      image.width,
      pinchState,
      touchStart,
      width,
      zoom,
    ],
  );

  const onTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      if (pinchState && e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const dx = a.clientX - b.clientX;
        const dy = a.clientY - b.clientY;
        const distance = Math.hypot(dx, dy);
        const rect = viewportRef.current?.getBoundingClientRect();
        const midpoint = {
          x: (a.clientX + b.clientX) / 2 - (rect?.left ?? 0),
          y: (a.clientY + b.clientY) / 2 - (rect?.top ?? 0),
        };
        const ratio = distance / pinchState.distance;
        applyZoomAt(pinchState.startZoom * ratio, midpoint);
        return;
      }

      if (zoom > 1 && panStart) {
        e.preventDefault();
        const touch = e.touches[0];
        setPan((prev) =>
          clampPan(
            {
              x: prev.x + (touch.clientX - panStart.x),
              y: prev.y + (touch.clientY - panStart.y),
            },
            zoom,
          ),
        );
        setPanStart({ x: touch.clientX, y: touch.clientY });
        return;
      }

      if (!touchStart) {
        return;
      }

      const touch = e.touches[0];
      const dx = touch.clientX - touchStart.x;
      // Allow slight vertical movement but ignore large vertical swipes to avoid accidental nav
      const dy = Math.abs(touch.clientY - touchStart.y);
      if (dy > Math.abs(dx) * 1.5) {
        return;
      }
      setDragOffset(dx);
    },
    [applyZoomAt, clampPan, panStart, pinchState, touchStart, zoom],
  );

  React.useEffect(() => {
    window.addEventListener("keyup", onEscape);
    document.body.classList.add("no-scroll");

    return () => {
      window.removeEventListener("keyup", onEscape);
      document.body.classList.remove("no-scroll");
    };
  }, [onEscape]);

  React.useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [image.src]);

  const onWheel = React.useCallback(
    (e: WheelEvent) => {
      if (!viewportRef.current) {
        return;
      }
      const rect = viewportRef.current.getBoundingClientRect();
      const focal = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const delta = -e.deltaY * (e.ctrlKey ? 0.0025 : 0.0015);
      const nextZoom = zoom * (1 + delta);
      if (Math.abs(delta) > 0.0001) {
        e.preventDefault();
      }
      applyZoomAt(nextZoom, focal);
    },
    [applyZoomAt, zoom],
  );

  React.useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
    };
  }, [onWheel]);

  React.useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isPointerPanning || zoom <= 1) {
        return;
      }
      setPan((prev) =>
        clampPan(
          {
            x: prev.x + e.movementX,
            y: prev.y + e.movementY,
          },
          zoom,
        ),
      );
    };

    const onMouseUp = () => {
      setIsPointerPanning(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [clampPan, isPointerPanning, zoom]);

  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1 || e.button !== 0) {
        return;
      }
      e.preventDefault();
      setIsPointerPanning(true);
    },
    [zoom],
  );

  const slideWidth = width;
  const trackBase = -slideWidth + dragOffset;
  const trackStyle: React.CSSProperties = {
    width: `${slideWidth * 3}px`,
    transform: `translate3d(${trackBase}px, 0, 0)`,
    transition: isDragging || isSnapping ? "none" : "transform 0.25s ease",
  };
  const slideStyle: React.CSSProperties = {
    width: `${slideWidth}px`,
    flex: `0 0 ${slideWidth}px`,
    opacity: animating ? 0.98 : 1,
    transition: isDragging ? "none" : "opacity 0.2s ease",
  };

  return (
    <div className="BigPicture">
      <div
        className="BigPicture-viewport"
        ref={viewportRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        <div className={`BigPicture-track${isDragging ? " is-dragging" : ""}`} style={trackStyle}>
          {[previousImage, image, nextImage].map((img) => {
            const imgScaleWidth = img.width / width;
            const imgScaleHeight = img.height / (window.innerHeight - 80);
            const imgScale = Math.max(imgScaleWidth, imgScaleHeight);
            const isCurrent = img.src === image.src;
            return (
              <div className="BigPicture-frame" key={img.src} style={slideStyle}>
                <div
                  className="BigPicture-imageWrapper"
                  style={
                    isCurrent ? { transform: `translate3d(${pan.x}px, ${pan.y}px, 0)` } : undefined
                  }
                >
                  <div
                    className="BigPicture-zoomTarget"
                    style={isCurrent ? { transform: `scale(${zoom})` } : undefined}
                  >
                    <Picture
                      image={img}
                      onClick={() => {}}
                      height={img.height / imgScale}
                      width={img.width / imgScale}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="BigPicture-footer">
        <a
          className="BigPicture-footerLink"
          href={`img/${image.src}`}
          target="_blank"
          rel="noreferrer"
          download={image.src}
        >
          ⬇ Download
        </a>
        <span
          className="BigPicture-footerLink"
          role="button"
          onClick={onClose}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              onClose();
            }
          }}
          tabIndex={0}
        >
          Close
        </span>
      </div>
    </div>
  );
};
