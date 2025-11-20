import * as React from "react";
import * as Model from "model";
import { Picture } from "components/picture";

export interface Props {
  image: Model.Image;
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
  onClose,
  showNext,
  showPrevious,
  width,
}) => {
  const [touchStart, setTouchStart] = React.useState<TouchStart | null>(null);

  const onEscape = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  const onTouchStart = React.useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.screenX, y: touch.screenY });
  }, []);

  const onTouchEnd = React.useCallback(
    (e: TouchEvent) => {
      if (!touchStart) {
        return;
      }
      const touch = e.changedTouches[0];
      const dx = touch.screenX - touchStart.x;

      if (Math.abs(dx) / window.innerWidth > 0.05) {
        if (dx < 0) {
          showNext();
        } else {
          showPrevious();
        }
      }

      setTouchStart(null);
    },
    [showNext, showPrevious, touchStart]
  );

  React.useEffect(() => {
    window.addEventListener("keyup", onEscape);
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);
    document.body.classList.add("no-scroll");

    return () => {
      window.removeEventListener("keyup", onEscape);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      document.body.classList.remove("no-scroll");
    };
  }, [onEscape, onTouchEnd, onTouchStart]);

  const scaleWidth = image.width / width;
  const scaleHeight = image.height / (window.innerHeight - 80);
  const scale = Math.max(scaleWidth, scaleHeight);

  return (
    <div className="BigPicture">
      <Picture
        image={image}
        onClick={() => {}}
        height={image.height / scale}
        width={image.width / scale}
      />
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
