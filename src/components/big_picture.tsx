import * as React from "react";
import * as Model from "model";
import { Picture } from "components/picture";

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

export const BigPicture: React.FC<Props> = ({
  image,
  previousImage,
  nextImage,
  onClose,
  showNext,
  showPrevious,
  width,
}) => {
  const [touchStart, setTouchStart] = React.useState<TouchStart | null>(null);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [animating, setAnimating] = React.useState(false);
  const [isSnapping, setIsSnapping] = React.useState(false);

  const onEscape = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  const goNext = React.useCallback(() => {
    showNext();
  }, [showNext]);

  const goPrevious = React.useCallback(() => {
    showPrevious();
  }, [showPrevious]);

  const onTouchStart = React.useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
    setDragOffset(0);
  }, []);

  const onTouchEnd = React.useCallback(
    (e: TouchEvent) => {
      if (!touchStart) {
        return;
      }
      const touch = e.changedTouches[0];
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
    [goNext, goPrevious, touchStart, width]
  );

  const onTouchMove = React.useCallback(
    (e: TouchEvent) => {
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
    [touchStart]
  );

  React.useEffect(() => {
    window.addEventListener("keyup", onEscape);
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    document.body.classList.add("no-scroll");

    return () => {
      window.removeEventListener("keyup", onEscape);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      document.body.classList.remove("no-scroll");
    };
  }, [onEscape, onTouchEnd, onTouchMove, onTouchStart]);

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
      <div className="BigPicture-viewport">
        <div
          className={`BigPicture-track${isDragging ? " is-dragging" : ""}`}
          style={trackStyle}
        >
          {[previousImage, image, nextImage].map((img) => {
            const imgScaleWidth = img.width / width;
            const imgScaleHeight = img.height / (window.innerHeight - 80);
            const imgScale = Math.max(imgScaleWidth, imgScaleHeight);
            return (
              <div
                className="BigPicture-frame"
                key={img.src}
                style={slideStyle}
              >
                <Picture
                  image={img}
                  onClick={() => {}}
                  height={img.height / imgScale}
                  width={img.width / imgScale}
                />
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
