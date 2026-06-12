/*
 * Domino pip detector.
 *
 * Pure-JS computer vision: grayscale -> adaptive threshold (via integral
 * image) -> connected components -> shape/size filtering. Works for dark
 * pips on light tiles and light pips on dark tiles ("auto" picks the
 * polarity that yields more plausible pips).
 *
 * Exposed as `DominoDetector.detect(imageData, options)` in the browser
 * and via module.exports under Node (for tests).
 */
(function (global) {
  "use strict";

  function toGray(data, w, h) {
    const g = new Uint8ClampedArray(w * h);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) {
      g[i] = (data[j] * 77 + data[j + 1] * 151 + data[j + 2] * 28) >> 8;
    }
    return g;
  }

  // Summed-area table with one extra row/column of zeros for easy lookups.
  function integralImage(g, w, h) {
    const W = w + 1;
    const ii = new Float64Array(W * (h + 1));
    for (let y = 0; y < h; y++) {
      let rowSum = 0;
      const src = y * w;
      const dstPrev = y * W;
      const dst = (y + 1) * W;
      for (let x = 0; x < w; x++) {
        rowSum += g[src + x];
        ii[dst + x + 1] = ii[dstPrev + x + 1] + rowSum;
      }
    }
    return ii;
  }

  // Mark pixels that are clearly darker (or lighter) than their local
  // neighborhood mean. Local windows make this robust to uneven lighting.
  function adaptiveMask(g, ii, w, h, win, bias, darkOnLight) {
    const W = w + 1;
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const y0 = y - win < 0 ? 0 : y - win;
      const y1 = y + win >= h ? h - 1 : y + win;
      const rowT = y0 * W;
      const rowB = (y1 + 1) * W;
      for (let x = 0; x < w; x++) {
        const x0 = x - win < 0 ? 0 : x - win;
        const x1 = x + win >= w ? w - 1 : x + win;
        const area = (y1 - y0 + 1) * (x1 - x0 + 1);
        const sum = ii[rowB + x1 + 1] - ii[rowT + x1 + 1] - ii[rowB + x0] + ii[rowT + x0];
        const mean = sum / area;
        const v = g[y * w + x];
        mask[y * w + x] = darkOnLight ? (v < mean - bias ? 1 : 0) : (v > mean + bias ? 1 : 0);
      }
    }
    return mask;
  }

  // Iterative flood fill (4-connectivity) collecting per-blob stats.
  function connectedComponents(mask, w, h) {
    const labels = new Int32Array(w * h);
    const stack = new Int32Array(w * h);
    const comps = [];
    let nextLabel = 1;
    for (let start = 0; start < mask.length; start++) {
      if (!mask[start] || labels[start]) continue;
      let sp = 0;
      stack[sp++] = start;
      labels[start] = nextLabel;
      let area = 0, sx = 0, sy = 0;
      let minX = w, maxX = 0, minY = h, maxY = 0;
      let touchesBorder = false;
      while (sp > 0) {
        const p = stack[--sp];
        const px = p % w;
        const py = (p / w) | 0;
        area++;
        sx += px;
        sy += py;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        if (px === 0 || py === 0 || px === w - 1 || py === h - 1) touchesBorder = true;
        if (px > 0 && mask[p - 1] && !labels[p - 1]) { labels[p - 1] = nextLabel; stack[sp++] = p - 1; }
        if (px < w - 1 && mask[p + 1] && !labels[p + 1]) { labels[p + 1] = nextLabel; stack[sp++] = p + 1; }
        if (py > 0 && mask[p - w] && !labels[p - w]) { labels[p - w] = nextLabel; stack[sp++] = p - w; }
        if (py < h - 1 && mask[p + w] && !labels[p + w]) { labels[p + w] = nextLabel; stack[sp++] = p + w; }
      }
      comps.push({ area, cx: sx / area, cy: sy / area, minX, maxX, minY, maxY, touchesBorder });
      nextLabel++;
    }
    return comps;
  }

  // Keep only blobs that look like pips: roughly round, sensible size,
  // not clipped by the frame edge, and similar in size to each other.
  function filterPips(comps, w, h) {
    const frameArea = w * h;
    const minArea = Math.max(14, frameArea * 0.00015);
    const maxArea = frameArea * 0.02;
    let pips = [];
    for (const c of comps) {
      if (c.touchesBorder) continue;
      if (c.area < minArea || c.area > maxArea) continue;
      const bw = c.maxX - c.minX + 1;
      const bh = c.maxY - c.minY + 1;
      const aspect = bw / bh;
      if (aspect < 0.55 || aspect > 1.8) continue;
      const extent = c.area / (bw * bh);
      if (extent < 0.5) continue; // a filled circle has extent ~0.785
      pips.push(c);
    }
    // Pips photographed together are all about the same size; drop outliers.
    if (pips.length >= 4) {
      const areas = pips.map((p) => p.area).sort((a, b) => a - b);
      const median = areas[areas.length >> 1];
      pips = pips.filter((p) => p.area >= median * 0.35 && p.area <= median * 2.8);
    }
    return pips.map((p) => ({
      x: p.cx,
      y: p.cy,
      r: Math.sqrt(p.area / Math.PI),
    }));
  }

  /**
   * @param {ImageData|{width,height,data}} imageData RGBA frame (downscaled,
   *   ideally <= ~400px wide for speed)
   * @param {{polarity?: 'auto'|'dark'|'light'}} [options] pip color relative
   *   to the tile face
   * @returns {{count: number, pips: Array<{x,y,r}>, polarity: 'dark'|'light'}}
   */
  function detect(imageData, options) {
    const opts = options || {};
    const w = imageData.width;
    const h = imageData.height;
    const g = toGray(imageData.data, w, h);
    const ii = integralImage(g, w, h);
    const win = Math.max(8, Math.round(Math.min(w, h) / 10));
    const bias = 14;

    let dark = null;
    let light = null;
    if (opts.polarity !== "light") {
      dark = filterPips(connectedComponents(adaptiveMask(g, ii, w, h, win, bias, true), w, h), w, h);
    }
    if (opts.polarity !== "dark") {
      light = filterPips(connectedComponents(adaptiveMask(g, ii, w, h, win, bias, false), w, h), w, h);
    }

    if (opts.polarity === "dark") return { count: dark.length, pips: dark, polarity: "dark" };
    if (opts.polarity === "light") return { count: light.length, pips: light, polarity: "light" };
    // Auto: dark pips are the common case, so light only wins when it is
    // clearly ahead (guards against glare specks on a light tile).
    if (light.length > dark.length * 1.5 + 1) {
      return { count: light.length, pips: light, polarity: "light" };
    }
    return { count: dark.length, pips: dark, polarity: "dark" };
  }

  const api = { detect };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.DominoDetector = api;
  }
})(typeof self !== "undefined" ? self : this);
