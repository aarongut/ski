#!/bin/bash

set -e
shopt -s nullglob

function make_jpg {
	if [ ! -f $2/$1 ]; then
		echo "Converting $2/$1"
		magick $1 -resize $2x$2 -quality 30 $2/$1
	fi
}

function make_webp {
	NAME="$(basename $1 .jpg).webp"
	if [ ! -f $2/$NAME ]; then
		echo "Converting $2/$NAME"
		magick $1 -resize $2x$2 -quality $3 $2/$NAME
	fi
}

function make_avif {
	NAME="$(basename $1 .jpg).avif"
	if [ ! -f $2/$NAME ]; then
		echo "Converting $2/$NAME"
		magick $1 -resize $2x$2 -quality $3 $2/$NAME
	fi
}

for f in original/*.jpg; do
	SUM=$(md5 < $f)
	cp $f ${SUM}.jpg;
	magick identify -format "{ \"src\": \"%f\", \"width\": %w, \"height\": %h },\n" ${SUM}.jpg >> new_data.json
done

for img in *.jpg; do
	make_jpg $img 2400 &
	make_jpg $img 1600 &
	make_jpg $img 1200 &
	make_jpg $img 800 &
	make_jpg $img 600 &
	make_jpg $img 400 &
	make_jpg $img 200 &

	make_webp $img 2400 50 &
	make_webp $img 1600 50 &
	make_webp $img 1200 50 &
	make_webp $img 800 40 &
	make_webp $img 600 40 &
	make_webp $img 400 40 &
	make_webp $img 200 40 &

	make_avif $img 2400 70 &
	make_avif $img 1600 70 &
	make_avif $img 1200 70 &
	make_avif $img 800 60 &
	make_avif $img 600 60 &
	make_avif $img 400 50 &
	make_avif $img 200 50 &

	wait
done
