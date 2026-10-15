/*
 * kmeans.js — 색 군집화(K-means) 알고리즘
 * -----------------------------------------------------------------------------
 * 일반적인 벡터(숫자 배열)에 대해 동작하므로 RGB/LAB 어느 색공간이든 쓸 수 있다.
 * 수업 맥락: "픽셀 전체를 다 쓰지 않고 핵심 색상 K개로 요약" = 추상화의 실제 사례.
 *
 *  cluster(data, K, options) → { centroids, assignments, counts }
 *    data           : [[c0,c1,c2], ...]  (예: [r,g,b] 또는 [L,a,b])
 *    K              : 군집(대표색) 개수 — 상한 없음(Infinity 가능). 실제 K는 data 개수까지.
 *    options.seed   : 난수 시드(같은 시드 → 같은 결과, 재현성 보장)
 *    options.weights: 점마다 가중치(같은 색 픽셀 수). 없으면 모두 1.
 *
 *  makeNearest(centroids) → v => 가장 가까운 중심 번호
 *    K가 크면 색공간을 격자로 나눠 주변 칸만 찾아본다(수만~수십만 K도 실용 속도).
 */
(function (global) {
  'use strict';

  // 시드 기반 난수(mulberry32). 같은 시드를 주면 항상 같은 수열이 나오므로
  // "같은 설정으로 다시 분석하면 같은 결과"가 되어 비교/기록(로그)에 유리하다.
  function makeRNG(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 두 벡터 사이 거리의 제곱(루트를 생략해 비교만 빠르게)
  function dist2(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
    return s;
  }

  // 가장 가까운 중심 찾기. K가 작으면 전부 비교, 크면 3차원 격자로 주변 칸만 비교.
  function makeNearest(centroids) {
    const K = centroids.length;
    const brute = v => {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < K; c++) {
        const dd = dist2(v, centroids[c]);
        if (dd < bestD) { bestD = dd; best = c; }
      }
      return best;
    };
    if (K <= 48 || centroids[0].length !== 3) return brute;

    // 격자: 축마다 G칸, 칸 하나에 중심이 평균 2개쯤 들어가게.
    const G = Math.max(2, Math.min(96, Math.round(Math.cbrt(K / 2))));
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let c = 0; c < K; c++) for (let d = 0; d < 3; d++) {
      const x = centroids[c][d]; if (x < lo[d]) lo[d] = x; if (x > hi[d]) hi[d] = x;
    }
    const cs = [0, 1, 2].map(d => Math.max(1e-9, (hi[d] - lo[d]) / G));
    const minCs = Math.min(cs[0], cs[1], cs[2]);
    const cellOf = (x, d) => { const i = Math.floor((x - lo[d]) / cs[d]); return i < 0 ? 0 : i >= G ? G - 1 : i; };
    const cellIdx = (a, b, c) => (a * G + b) * G + c;
    // CSR 버킷: start[cell] ~ start[cell+1] 범위가 그 칸의 중심 번호들
    const nCell = G * G * G, start = new Int32Array(nCell + 1), cellOfC = new Int32Array(K);
    for (let c = 0; c < K; c++) {
      const v = centroids[c], ci = cellIdx(cellOf(v[0], 0), cellOf(v[1], 1), cellOf(v[2], 2));
      cellOfC[c] = ci; start[ci + 1]++;
    }
    for (let i = 0; i < nCell; i++) start[i + 1] += start[i];
    const fill = start.slice(0, nCell), items = new Int32Array(K);
    for (let c = 0; c < K; c++) items[fill[cellOfC[c]]++] = c;

    return v => {
      const a0 = cellOf(v[0], 0), b0 = cellOf(v[1], 1), c0 = cellOf(v[2], 2);
      let best = 0, bestD = Infinity;
      for (let r = 0; r < G; r++) {
        for (let a = Math.max(0, a0 - r); a <= Math.min(G - 1, a0 + r); a++) {
          const da = Math.abs(a - a0);
          for (let b = Math.max(0, b0 - r); b <= Math.min(G - 1, b0 + r); b++) {
            const db = Math.abs(b - b0);
            for (let c = Math.max(0, c0 - r); c <= Math.min(G - 1, c0 + r); c++) {
              if (Math.max(da, db, Math.abs(c - c0)) !== r) continue;   // 이번 고리(껍질)만
              const ci = cellIdx(a, b, c);
              for (let k = start[ci]; k < start[ci + 1]; k++) {
                const cc = centroids[items[k]];
                const x = v[0] - cc[0], y = v[1] - cc[1], z = v[2] - cc[2];
                const dd = x * x + y * y + z * z;
                if (dd < bestD) { bestD = dd; best = items[k]; }
              }
            }
          }
        }
        // 다음 고리부터는 최소 r칸 떨어져 있으므로, 이미 그보다 가까운 중심을 찾았으면 끝.
        if (bestD <= (r * minCs) * (r * minCs)) break;
      }
      return best;
    };
  }

  // k-means++ 초기화: 멀리 떨어진 점을 우선 골라 초기 중심을 잘 퍼뜨린다(가중치 반영).
  //  비용이 n×K라 K가 매우 크면 시드 기반 무작위 추출(중복 없음)로 대신한다.
  function initCentroids(data, w, K, rng) {
    const n = data.length;
    if (K > 1500) {
      const idx = new Int32Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      const out = [];
      for (let c = 0; c < K; c++) {
        const j = c + Math.floor(rng() * (n - c));
        const t = idx[c]; idx[c] = idx[j]; idx[j] = t;
        out.push(data[idx[c]].slice());
      }
      return out;
    }
    const centroids = [data[Math.floor(rng() * n)].slice()];
    const best = new Float64Array(n).fill(Infinity);
    for (let c = 1; c < K; c++) {
      let sum = 0;
      const prev = centroids[c - 1];
      for (let i = 0; i < n; i++) {
        const dd = dist2(data[i], prev);
        if (dd < best[i]) best[i] = dd;
        sum += best[i] * w[i];
      }
      let r = rng() * sum, idx = 0;
      for (; idx < n - 1; idx++) { r -= best[idx] * w[idx]; if (r <= 0) break; }
      centroids.push(data[idx].slice());
    }
    return centroids;
  }

  function cluster(data, K, options) {
    options = options || {};
    const maxIter = options.maxIter || 24;
    const n = data.length;
    const dim = data[0].length;
    const w = options.weights || new Float64Array(n).fill(1);
    K = Math.max(1, Math.min(K, n));
    const rng = makeRNG(options.seed != null ? options.seed : 12345);
    const assign = new Int32Array(n);
    const counts = new Float64Array(K);

    // K가 점 개수와 같으면 점 하나하나가 곧 중심 — 반복할 필요가 없다.
    if (K === n) {
      const centroids = data.map(v => v.slice());
      for (let i = 0; i < n; i++) { assign[i] = i; counts[i] = w[i]; }
      return { centroids, assignments: assign, counts: Array.from(counts) };
    }

    const centroids = initCentroids(data, w, K, rng);

    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;

      // (1) 할당 단계: 각 점을 가장 가까운 중심으로 배정
      const nearest = makeNearest(centroids);
      for (let i = 0; i < n; i++) {
        const best = nearest(data[i]);
        if (assign[i] !== best || iter === 0) { assign[i] = best; changed = true; }
      }

      // (2) 갱신 단계: 각 군집의 (가중) 평균으로 중심을 옮김
      const sums = new Float64Array(K * dim);
      counts.fill(0);
      for (let i = 0; i < n; i++) {
        const c = assign[i], v = data[i], wi = w[i];
        counts[c] += wi;
        for (let d = 0; d < dim; d++) sums[c * dim + d] += v[d] * wi;
      }
      for (let c = 0; c < K; c++) {
        if (counts[c] === 0) {
          if (K <= 256) {
            // 빈 군집은 현재 중심에서 가장 먼 점으로 다시 시작시킨다.
            let far = 0, farD = -1;
            for (let i = 0; i < n; i++) {
              const dd = dist2(data[i], centroids[assign[i]]);
              if (dd > farD) { farD = dd; far = i; }
            }
            centroids[c] = data[far].slice();
          } else {
            // K가 크면 전체 탐색이 너무 비싸므로 무작위 점에서 다시 시작.
            centroids[c] = data[Math.floor(rng() * n)].slice();
          }
        } else {
          const cen = centroids[c];
          for (let d = 0; d < dim; d++) cen[d] = sums[c * dim + d] / counts[c];
        }
      }

      if (!changed && iter > 0) break; // 더 이상 변화가 없으면 수렴 → 종료
    }

    return { centroids, assignments: assign, counts: Array.from(counts) };
  }

  global.KMeans = { cluster, makeRNG, makeNearest };
})(window);
