import "@fontsource/monaspace-xenon/400.css";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

import type { ExifDisplay } from "../lib/exif.ts";

const DOWNLOAD_ICON = {
  isCustomSVG: true,
  inner:
    '<path d="M14.2 6h3.6v11.1l3.4-3.4 2.5 2.5L16 23.9l-7.7-7.7 2.5-2.5 3.4 3.4V6ZM7 24.5h18V28H7v-3.5Z" id="pswp__icn-download"/>',
  outlineID: "pswp__icn-download",
};

const setUpLightbox = (grid: HTMLElement): void => {
  const tiles = Array.from(grid.querySelectorAll<HTMLAnchorElement>("a.tile"));
  const indexOfSrc = (src: string): number => tiles.findIndex((tile) => tile.dataset.src === src);
  const srcFromHash = (): string => decodeURIComponent(window.location.hash.slice(1));
  const urlWithoutHash = (): string => window.location.pathname + window.location.search;

  const lightbox = new PhotoSwipeLightbox({
    gallery: grid,
    children: "a.tile",
    pswpModule: () => import("photoswipe"),
    bgOpacity: 1,
    showHideAnimationType: "zoom",
    preload: [1, 2],
    paddingFn: (viewport) =>
      viewport.x < 700
        ? { top: 0, bottom: 0, left: 0, right: 0 }
        : { top: 56, bottom: 88, left: 72, right: 72 },
    imageClickAction: "zoom",
    tapAction: "toggle-controls",
    doubleTapAction: "zoom",
    closeTitle: "Close (Esc)",
    zoomTitle: "Zoom (Z)",
    arrowPrevTitle: "Previous (←)",
    arrowNextTitle: "Next (→)",
    errorMsg: "This photo didn't load. Check your connection and try again.",
  });

  // PhotoSwipe puts the srcset on a plain <img>, which (unlike the grid's <picture>) can't fall
  // back by format. Follow whatever the browser already chose for the thumbnails, and use JPEG
  // until it has chosen anything.
  const thumbnailsUseAvif = (): boolean =>
    Array.from(grid.querySelectorAll("img")).some((img) => /\.avif(\?|$)/.test(img.currentSrc));

  lightbox.addFilter("domItemData", (itemData, _element, link) => {
    if (!thumbnailsUseAvif() && link.dataset.jpegSrcset) {
      itemData.srcset = link.dataset.jpegSrcset;
    }
    return itemData;
  });

  lightbox.on("uiRegister", () => {
    const ui = lightbox.pswp?.ui;
    if (!ui) {
      return;
    }
    ui.registerElement({
      name: "download",
      title: "Download full-size original",
      order: 8,
      isButton: true,
      tagName: "a",
      html: DOWNLOAD_ICON,
      onInit: (el, pswp) => {
        el.setAttribute("download", "");
        const update = () => {
          const tile = pswp.currSlide?.data.element;
          if (tile instanceof HTMLElement && tile.dataset.download) {
            el.setAttribute("href", tile.dataset.download);
          }
        };
        pswp.on("change", update);
        update();
      },
    });
    ui.registerElement({
      name: "caption",
      order: 9,
      isButton: false,
      appendTo: "root",
      onInit: (el, pswp) => {
        const gear = document.createElement("p");
        gear.className = "pswp__exif";
        const exposure = document.createElement("p");
        exposure.className = "pswp__exif";
        el.append(gear, exposure);

        const fill = (line: HTMLElement, parts: string[] | undefined) => {
          line.replaceChildren(
            ...(parts ?? []).map((part) => {
              const span = document.createElement("span");
              span.textContent = part;
              return span;
            }),
          );
          line.hidden = !parts || parts.length === 0;
        };
        const update = () => {
          const tile = pswp.currSlide?.data.element;
          let display: ExifDisplay | undefined;
          if (tile instanceof HTMLElement && tile.dataset.exif) {
            try {
              display = JSON.parse(tile.dataset.exif) as ExifDisplay;
            } catch {
              display = undefined;
            }
          }
          fill(gear, display?.gear);
          fill(exposure, display?.exposure);
        };
        pswp.on("change", update);
        update();
      },
    });
  });

  // Keep the URL pointing at the open photo (`/trip#photo.jpg`) so photos can be shared, and make
  // the back button close the lightbox instead of leaving the page.
  let pushedEntry = false; // We added a history entry when the lightbox opened.
  let startedOnHash = false; // The lightbox was opened from a URL that already had the photo's hash.
  let closedByBackButton = false;
  let ignoreNextPop = false;

  const currentSrc = (): string | undefined => {
    const tile = lightbox.pswp?.currSlide?.data.element;
    return tile instanceof HTMLElement ? tile.dataset.src : undefined;
  };

  const syncUrl = () => {
    const src = currentSrc();
    if (!src) {
      return;
    }
    const hash = `#${src}`;
    if (!pushedEntry && !startedOnHash) {
      window.history.pushState({ lightbox: true }, "", hash);
      pushedEntry = true;
    } else if (window.location.hash !== hash) {
      window.history.replaceState(window.history.state, "", hash);
    }
  };

  lightbox.on("afterInit", syncUrl);
  lightbox.on("change", syncUrl);

  lightbox.on("close", () => {
    // Bring the photo's thumbnail on screen so the closing animation lands somewhere visible.
    const tile = lightbox.pswp?.currSlide?.data.element;
    if (tile instanceof HTMLElement) {
      const rect = tile.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        tile.scrollIntoView({ block: "center" });
      }
    }

    if (closedByBackButton) {
      // The browser already moved back; nothing to undo.
    } else if (pushedEntry) {
      ignoreNextPop = true;
      window.history.back();
    } else {
      window.history.replaceState(null, "", urlWithoutHash());
    }
    pushedEntry = false;
    startedOnHash = false;
    closedByBackButton = false;
  });

  window.addEventListener("popstate", () => {
    if (ignoreNextPop) {
      ignoreNextPop = false;
      return;
    }
    const index = indexOfSrc(srcFromHash());
    const pswp = lightbox.pswp;
    if (pswp) {
      if (index < 0) {
        closedByBackButton = true;
        pushedEntry = false;
        pswp.close();
      } else {
        pswp.goTo(index);
      }
    } else if (index >= 0) {
      startedOnHash = true;
      lightbox.loadAndOpen(index, { gallery: grid });
    }
  });

  lightbox.init();

  const initial = indexOfSrc(srcFromHash());
  if (initial >= 0) {
    startedOnHash = true;
    lightbox.loadAndOpen(initial, { gallery: grid });
  }
};

const grid = document.querySelector<HTMLElement>("[data-grid]");
if (grid) {
  setUpLightbox(grid);
}
