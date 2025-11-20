import * as React from "react";
import * as Model from "model";

export interface Props {
  image: Model.Image;
  onClick: () => void;
  height: number;
  width: number;
  defer?: boolean;
}

interface SrcSetInfo {
  jpeg: string;
  webp: string;
  avif: string;
  bestSrc: string;
}

export const Picture: React.FC<Props> = ({
  image,
  onClick,
  height,
  width,
  defer,
}) => {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const srcSet = React.useMemo(() => {
    const jpegSrcSet: string[] = [];
    const webpSrcSet: string[] = [];
    const avifSrcSet: string[] = [];
    let bestSize = 800;
    let bestScale = Infinity;

    Model.SIZES.forEach((size) => {
      const derivedWidth =
        image.width > image.height ? size : (image.width / image.height) * size;

      const scale = derivedWidth / width;

      if (scale >= 1 || size === 2400) {
        const jpeg = `img/${size}/${image.src}`;
        const webp = jpeg.replace("jpg", "webp");
        const avif = jpeg.replace("jpg", "avif");
        jpegSrcSet.push(`${jpeg} ${scale}x`);
        webpSrcSet.push(`${webp} ${scale}x`);
        avifSrcSet.push(`${avif} ${scale}x`);
        if (scale < bestScale) {
          bestSize = size;
          bestScale = scale;
        }
      }
    });

    return {
      jpeg: jpegSrcSet.join(","),
      webp: webpSrcSet.join(","),
      avif: avifSrcSet.join(","),
      bestSrc: `img/${bestSize}/${image.src}`,
    };
  }, [image, width]);

  if (defer || !isMounted) {
    return <div className="Picture-defer" style={{ width: width + "px" }} />;
  }

  return (
    <picture>
      <source srcSet={srcSet.avif} type="image/avif" />
      <source srcSet={srcSet.webp} type="image/webp" />
      <source srcSet={srcSet.jpeg} type="image/jpeg" />
      <img
        id={image.src}
        onClick={onClick}
        src={srcSet.bestSrc}
        height={height + "px"}
        width={Math.floor(width) + "px"}
        alt=""
      />
    </picture>
  );
};
