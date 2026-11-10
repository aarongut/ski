// Inlined right after each photo grid so it runs before first paint.
//
// CSS alone lays the grid out greedily: each row takes photos until the next one doesn't fit, then
// stretches. This replaces that with the balanced layout the site has always used: choose every
// row break at once so that, across the whole trip, row heights stay as close as possible to the
// target (minimising the summed squared difference). Then size each tile so the browser's flex
// wrapping reproduces exactly those rows.
(() => {
  const breaksFor = (ratios, width, target, gap) => {
    const n = ratios.length;
    const cost = Array.from({ length: n + 1 }, () => Infinity);
    const next = Array.from({ length: n + 1 }, () => n);
    cost[n] = 0;
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j <= n; j++) {
        sum += ratios[j - 1];
        const height = (width - gap * (j - i - 1)) / sum;
        const total = (height - target) ** 2 + cost[j];
        if (total < cost[i]) {
          cost[i] = total;
          next[i] = j;
        }
        // Rows only get shorter from here; nothing this thin will ever win.
        if (height < target / 3) {
          break;
        }
      }
    }
    const rows = [];
    for (let i = 0; i < n; i = next[i]) {
      rows.push([i, next[i]]);
    }
    return rows;
  };

  const layout = (grid, width) => {
    const style = getComputedStyle(grid);
    const target = parseFloat(style.getPropertyValue("--row-h")) || 350;
    const gap = parseFloat(style.columnGap) || 0;
    const tiles = Array.from(grid.children);
    const ratios = tiles.map((tile) => Number(tile.dataset.ar));

    for (const [start, end] of breaksFor(ratios, width, target, gap)) {
      let sum = 0;
      for (let k = start; k < end; k++) {
        sum += ratios[k];
      }
      const height = (width - gap * (end - start - 1)) / sum;
      for (let k = start; k < end; k++) {
        // Slightly under-size each basis so rounding can never push a tile onto the next row;
        // flex-grow (proportional to aspect ratio) then fills the last pixel while keeping heights equal.
        tiles[k].style.flex = `${ratios[k]} 0 ${Math.max(1, Math.floor(ratios[k] * height) - 1)}px`;
      }
    }
    grid.classList.add("is-justified");
  };

  for (const grid of document.querySelectorAll("[data-grid]:not([data-grid-ready])")) {
    grid.setAttribute("data-grid-ready", "");
    let lastWidth = 0;
    const run = () => {
      const width = grid.clientWidth;
      if (width > 0 && width !== lastWidth) {
        lastWidth = width;
        layout(grid, width);
      }
    };
    run();
    if ("ResizeObserver" in window) {
      new ResizeObserver(run).observe(grid);
    }
  }
})();
