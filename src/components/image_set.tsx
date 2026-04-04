import * as React from "react";
import * as Model from "@/model";
import { Grid } from "@/components/grid";

export interface Props {
  imageSet: Model.ImageSet;
  onImageSelected: (img: Model.Image) => void;
  onShowHome: () => void;
  pageBottom: number;
  width: number;
  height: number;
}

export const ImageSet: React.FC<Props> = ({
  imageSet,
  onImageSelected,
  onShowHome,
  pageBottom,
  width,
  height,
}) => {
  return (
    <div className="ImageSet">
      <h2>
        <span className="ImageSet-location">{imageSet.location}</span>
        <span className="ImageSet-description">{imageSet.description}</span>
      </h2>
      <Grid
        images={imageSet.images}
        onImageSelected={onImageSelected}
        pageBottom={pageBottom}
        width={width}
        height={height}
      />
      <div className="ImageSet-navigation">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onShowHome();
          }}
        >
          Back
        </a>
      </div>
    </div>
  );
};
