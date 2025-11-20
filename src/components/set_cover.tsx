import * as React from "react";
import * as Model from "model";
import { Picture } from "components/picture";

export interface Props {
  imageSet: Model.ImageSet;
  onClick: () => void;
  width: number;
}

export const SetCover: React.FC<Props> = ({ imageSet, onClick, width }) => {
  const coverImage = imageSet.images[0];
  const isTall = coverImage.height > coverImage.width;

  const height = isTall
    ? width
    : (coverImage.height / coverImage.width) * width;

  const normalizedWidth = isTall
    ? (coverImage.width / coverImage.height) * width
    : width;

  return (
    <div className="SetCover" onClick={onClick}>
      <Picture
        image={coverImage}
        onClick={() => {}}
        height={height}
        width={normalizedWidth}
      />
      <h2>
        <span className="SetCover-location">{imageSet.location}</span>
        <span className="SetCover-description">{imageSet.description}</span>
      </h2>
    </div>
  );
};
