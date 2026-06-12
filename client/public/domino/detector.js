/*
 * Domino pip detector.
 *
 * Pure-JS computer vision: grayscale -> adaptive threshold (via integral
 * image) at two window scales -> morphological closing (heals pips split
 * by glare) -> connected components -> shape/size filtering -> merge of
 * scales -> pip-size outlier rejection. Works for dark pips on light
 * tiles and light pips on dark tiles ("auto" picks the polarity that
 * yields more plausible pips).
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

  function dilate3(mask, w, h) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (mask[i]) {
          out[i] = 1;
          continue;
        }
        let on = 0;
        for (let dy = -1; dy <= 1 && !on; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            if (mask[yy * w + xx]) {
              on = 1;
              break;
            }
          }
        }
        out[i] = on;
      }
    }
    return out;
  }

  function erode3(mask, w, h) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        let all = 1;
        for (let dy = -1; dy <= 1 && all; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) {
            all = 0;
            break;
          }
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w || !mask[yy * w + xx]) {
              all = 0;
              break;
            }
          }
        }
        out[i] = all;
      }
    }
    return out;
  }

  // Closing (dilate then erode) reunites pips that specular highlights or
  // engraved centers split into crescents, without growing isolated blobs.
  function close3(mask, w, h) {
    return erode3(dilate3(mask, w, h), w, h);
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
  // not clipped by the frame edge.
  function filterPips(comps, w, h) {
    const frameArea = w * h;
    const minArea = Math.max(12, frameArea * 0.00012);
    const maxArea = frameArea * 0.025;
    const maxDim = Math.min(w, h) * 0.22;
    const pips = [];
    for (const c of comps) {
      if (c.touchesBorder) continue;
      if (c.area < minArea || c.area > maxArea) continue;
      const bw = c.maxX - c.minX + 1;
      const bh = c.maxY - c.minY + 1;
      if (bw < 3 || bh < 3) continue;
      if (bw > maxDim || bh > maxDim) continue;
      const aspect = bw / bh;
      if (aspect < 0.58 || aspect > 1.72) continue;
      const extent = c.area / (bw * bh);
      if (extent < 0.52) continue; // a filled circle has extent ~0.785
      pips.push({ x: c.cx, y: c.cy, r: Math.sqrt(c.area / Math.PI) });
    }
    return pips;
  }

  // Union of two detections, skipping pips already found by the other scale.
  function mergePips(a, b) {
    const out = a.slice();
    for (const p of b) {
      let dup = false;
      for (const q of a) {
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const limit = Math.max(3, Math.max(p.r, q.r)) * 2;
        if (dx * dx + dy * dy < limit * limit) {
          dup = true;
          break;
        }
      }
      if (!dup) out.push(p);
    }
    return out;
  }

  // Pips photographed together are all about the same size; drop outliers.
  function rejectSizeOutliers(pips) {
    if (pips.length < 5) return pips;
    const areas = pips.map((p) => p.r * p.r).sort((a, b) => a - b);
    const median = areas[areas.length >> 1];
    return pips.filter((p) => {
      const a = p.r * p.r;
      return a >= median * 0.4 && a <= median * 2.3;
    });
  }

  // Mean gray of an axis-aligned box, clamped to the frame.
  function boxMean(ii, w, h, x0, y0, x1, y1) {
    const W = w + 1;
    x0 = x0 < 0 ? 0 : x0;
    y0 = y0 < 0 ? 0 : y0;
    x1 = x1 > w - 1 ? w - 1 : x1;
    y1 = y1 > h - 1 ? h - 1 : y1;
    const area = (x1 - x0 + 1) * (y1 - y0 + 1);
    if (area <= 0) return 0;
    const sum = ii[(y1 + 1) * W + x1 + 1] - ii[y0 * W + x1 + 1] - ii[(y1 + 1) * W + x0] + ii[y0 * W + x0];
    return sum / area;
  }

  // A real pip is much darker (or lighter) than the ring around it; blobs
  // assembled from sensor noise or surface texture are not.
  function hasContrast(p, ii, w, h, darkOnLight) {
    const MIN_CONTRAST = 20;
    const cx = Math.round(p.x);
    const cy = Math.round(p.y);
    const rIn = Math.max(1, Math.round(p.r * 0.7));
    const rOut = Math.max(rIn + 2, Math.round(p.r * 2.2));
    const inner = boxMean(ii, w, h, cx - rIn, cy - rIn, cx + rIn, cy + rIn);
    const innerArea = (2 * rIn + 1) * (2 * rIn + 1);
    const outerArea = (2 * rOut + 1) * (2 * rOut + 1);
    const outerSumMean = boxMean(ii, w, h, cx - rOut, cy - rOut, cx + rOut, cy + rOut);
    // Approximate the surrounding ring by subtracting the inner box from
    // the outer box (areas are approximate near frame edges; close enough).
    const ring = (outerSumMean * outerArea - inner * innerArea) / (outerArea - innerArea);
    return darkOnLight ? ring - inner >= MIN_CONTRAST : inner - ring >= MIN_CONTRAST;
  }

  function detectPolarity(g, ii, w, h, darkOnLight) {
    const bias = 12;
    const minDim = Math.min(w, h);
    // Small window catches normal-size pips; the large window catches big
    // pips (tile filling the frame) whose centers a small window misses.
    const winSmall = Math.max(8, Math.round(minDim / 10));
    const winLarge = Math.max(16, Math.round(minDim / 4));
    const detectAt = (win) => {
      const mask = adaptiveMask(g, ii, w, h, win, bias, darkOnLight);
      // Closing heals pips split by glare, but can also bridge tightly
      // packed small pips. Glare crescents fail the roundness filter while
      // merged pips vanish entirely, so whichever variant yields more
      // valid pips is the faithful one.
      const validate = (pips) => pips.filter((p) => hasContrast(p, ii, w, h, darkOnLight));
      const raw = validate(filterPips(connectedComponents(mask, w, h), w, h));
      const closed = validate(filterPips(connectedComponents(close3(mask, w, h), w, h), w, h));
      return closed.length >= raw.length ? closed : raw;
    };
    return rejectSizeOutliers(mergePips(detectAt(winSmall), detectAt(winLarge)));
  }

  /**
   * @param {ImageData|{width,height,data}} imageData RGBA frame (downscaled,
   *   ideally <= ~600px wide for speed)
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

    let dark = null;
    let light = null;
    if (opts.polarity !== "light") dark = detectPolarity(g, ii, w, h, true);
    if (opts.polarity !== "dark") light = detectPolarity(g, ii, w, h, false);

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
