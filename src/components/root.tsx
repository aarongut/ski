import * as React from "react";
import * as Model from "@/model";
import { BigPicture } from "@/components/big_picture";
import { ImageSet } from "@/components/image_set";
import { SetCover } from "@/components/set_cover";

export interface Props {}

const viewWidth = (): number => {
  const widths = [
    window.innerWidth,
    window.outerWidth,
    document.documentElement?.clientWidth,
    document.body?.clientWidth,
  ].filter((w): w is number => typeof w === "number" && w > 0 && isFinite(w));

  return widths.length > 0 ? Math.max(...widths) : 0;
};

const viewHeight = (): number => {
  const heights = [
    window.innerHeight,
    window.outerHeight,
    document.documentElement?.clientHeight,
    document.body?.clientHeight,
  ].filter((h): h is number => typeof h === "number" && h > 0 && isFinite(h));

  return heights.length > 0 ? Math.max(...heights) : 0;
};

const formatHash = (set: Model.ImageSet) =>
  set.location.replace(/[^a-zA-Z0-9-_]/g, "-") +
  "-" +
  set.description.replace(/[^a-zA-Z0-9-_]/g, "-");

export const Root: React.FC<Props> = () => {
  const [data] = React.useState<Model.Data>(Model.data);
  const [selectedImage, setSelectedImage] = React.useState<Model.Image | null>(null);
  const [selectedSet, setSelectedSet] = React.useState<Model.ImageSet | null>(null);
  const [dimensions, setDimensions] = React.useState(() => {
    const height = viewHeight();
    return {
      pageBottom: height + window.pageYOffset,
      width: viewWidth(),
      height,
    };
  });

  const updateView = React.useCallback(() => {
    const height = viewHeight();
    setDimensions({
      pageBottom: height + window.pageYOffset,
      width: viewWidth(),
      height,
    });
  }, []);

  const loadHash = React.useCallback(() => {
    if (window.location.hash.length === 0) {
      setSelectedImage(null);
      setSelectedSet(null);
      return;
    }

    if (!data) {
      return;
    }

    const hash = window.location.hash.slice(1);
    let nextImage: Model.Image | null = null;
    let nextSet: Model.ImageSet | null = null;

    data.sets.forEach((set) => {
      if (formatHash(set) === hash) {
        nextSet = set;
      }

      const image = set.images.find((img) => img.src === hash);
      if (image) {
        nextImage = image;
        nextSet = set;
      }
    });

    setSelectedImage(nextImage);
    setSelectedSet(nextSet);
  }, [data]);

  React.useEffect(() => {
    loadHash();
  }, [data, loadHash]);

  React.useEffect(() => {
    const handlePopState = () => loadHash();

    window.addEventListener("resize", updateView);
    window.addEventListener("scroll", updateView, { passive: true });
    window.addEventListener("orientationchange", updateView);
    window.addEventListener("popstate", handlePopState);

    const orientation = (screen as any).orientation;
    if (orientation?.addEventListener) {
      orientation.addEventListener("change", updateView);
    }

    updateView();

    return () => {
      window.removeEventListener("resize", updateView);
      window.removeEventListener("scroll", updateView);
      window.removeEventListener("orientationchange", updateView);
      window.removeEventListener("popstate", handlePopState);
      if (orientation?.removeEventListener) {
        orientation.removeEventListener("change", updateView);
      }
    };
  }, [loadHash, updateView]);

  React.useEffect(() => {
    if (selectedSet) {
      document.title =
        selectedSet.location + " – " + selectedSet.description + " – Skiing - Aaron Gutierrez";
    } else {
      document.title = "Skiing - Aaron Gutierrez";
    }
  }, [selectedSet]);

  const onImageSelected = React.useCallback(
    (img: Model.Image) => {
      if (selectedImage) {
        window.history.replaceState(null, "", `#${img.src}`);
      } else {
        window.history.pushState(null, "", `#${img.src}`);
      }
      setSelectedImage(img);
    },
    [selectedImage],
  );

  const onSetSelected = React.useCallback((set: Model.ImageSet) => {
    setSelectedSet(set);
    window.history.pushState(null, "", `#${formatHash(set)}`);
  }, []);

  const onHomeSelected = React.useCallback(() => {
    setSelectedSet(null);
    setSelectedImage(null);
    window.history.pushState(null, "", "#");
  }, []);

  const showGrid = React.useCallback(() => {
    setSelectedImage(null);
    window.history.go(-1);
    if (selectedSet) {
      onSetSelected(selectedSet);
    }
  }, [onSetSelected, selectedSet]);

  const showNextBigPicture = React.useCallback(() => {
    if (!selectedSet || !selectedImage) {
      return;
    }
    const images: Model.Image[] = selectedSet.images;
    const current = images.indexOf(selectedImage);
    const next = current + 1 >= images.length ? 0 : current + 1;
    onImageSelected(images[next]);
  }, [onImageSelected, selectedImage, selectedSet]);

  const showPreviousBigPicture = React.useCallback(() => {
    if (!selectedSet || !selectedImage) {
      return;
    }
    const images: Model.Image[] = selectedSet.images;
    const current = images.indexOf(selectedImage);
    const previous = current - 1 < 0 ? images.length - 1 : current - 1;
    onImageSelected(images[previous]);
  }, [onImageSelected, selectedImage, selectedSet]);

  const neighbors = React.useMemo(() => {
    if (!selectedSet || !selectedImage) {
      return null;
    }
    const images = selectedSet.images;
    const current = images.indexOf(selectedImage);
    const previousIdx = current - 1 < 0 ? images.length - 1 : current - 1;
    const nextIdx = current + 1 >= images.length ? 0 : current + 1;
    return {
      previous: images[previousIdx],
      next: images[nextIdx],
    };
  }, [selectedImage, selectedSet]);

  const renderSets = () => {
    if (selectedSet) {
      return (
        <ImageSet
          key={selectedSet.location + selectedSet.description}
          imageSet={selectedSet}
          pageBottom={dimensions.pageBottom}
          onImageSelected={onImageSelected}
          onShowHome={onHomeSelected}
          width={dimensions.width}
          height={dimensions.height}
        />
      );
    }

    return (
      <div className="Root-setCovers">
        {data.sets.map((set) => (
          <SetCover
            key={set.location + set.description}
            imageSet={set}
            onClick={() => {
              onSetSelected(set);
              scrollTo(0, 0);
            }}
            width={Math.min(dimensions.width, 400)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="Root">
      {selectedImage ? (
        <BigPicture
          image={selectedImage}
          previousImage={neighbors?.previous ?? selectedImage}
          nextImage={neighbors?.next ?? selectedImage}
          onClose={showGrid}
          showNext={showNextBigPicture}
          showPrevious={showPreviousBigPicture}
          width={dimensions.width}
        />
      ) : null}
      <h1 onClick={onHomeSelected}>Aaron's Ski Pictures</h1>
      {renderSets()}
    </div>
  );
};
