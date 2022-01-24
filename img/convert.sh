#!/bin/bash

set -e

function make_jpg {
	if [ ! -f $2/$1 ]; then
		echo "Converting $2/$1"
		convert $1 -resize $2x$2 -quality 30 $2/$1
	fi
}

function make_webp {
	NAME="$(basename $1 .jpg).webp"
	if [ ! -f $2/$NAME ]; then
		echo "Converting $2/$NAME"
		convert $1 -resize $2x$2 -quality 30 $2/$NAME
	fi
}

for f in original/*.jpg; do
	SUM=$(md5 < $f)
	cp $f ${SUM}.jpg;
	magick identify -format "{ \"src\": \"%f\", \"width\": %w, \"height\": %h },\n" ${SUM}.jpg >> new_data.json
done

for img in *.jpg; do
	make_jpg $img 2400
	make_jpg $img 1600
	make_jpg $img 1200
	make_jpg $img 800
	make_jpg $img 600
	make_jpg $img 400
	make_jpg $img 200

	make_webp $img 2400
	make_webp $img 1600
	make_webp $img 1200
	make_webp $img 800
	make_webp $img 600
	make_webp $img 400
	make_webp $img 200
done
