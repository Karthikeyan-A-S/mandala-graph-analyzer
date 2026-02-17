export const toRad = (deg) => (deg / 180) * Math.PI;

export const getLibraryImages = () => {
  const images = [];
  // Handles deployment path automatically
  const basePath = import.meta.env.BASE_URL;
  
  // UPDATE THIS NUMBER to your actual image count
  const totalImages = 112; 

  for (let i = 1; i <= totalImages; i++) {
    const num = i.toString().padStart(3, '0');
    const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    images.push(`${cleanBase}/primitives/${num}.png`);
  }
  return images;
};

export const tintImage = (img, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
};

export const invertHex = (hex) => {
  if (hex.indexOf('#') === 0) hex = hex.slice(1);
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length !== 6) return '#ffffff';
  const r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16).padStart(2, '0');
  const g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16).padStart(2, '0');
  const b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16).padStart(2, '0');
  return "#" + r + g + b;
};

// --- ALGORITHMS (Used by GraphView) ---
export const computeDegree = (adj, nodeIds) => {
    const scores = {};
    nodeIds.forEach(id => scores[id] = adj[id] ? adj[id].length : 0);
    return scores;
};

export const computeCloseness = (adj, nodeIds) => {
    const scores = {};
    nodeIds.forEach(startNode => {
        const dist = {};
        const queue = [startNode];
        dist[startNode] = 0;
        let sumDist = 0;
        let reached = 0;
        let head = 0;
        while(head < queue.length){
            const u = queue[head++];
            if(adj[u]) {
                adj[u].forEach(v => {
                    if (dist[v] === undefined) {
                        dist[v] = dist[u] + 1;
                        sumDist += dist[v];
                        reached++;
                        queue.push(v);
                    }
                });
            }
        }
        scores[startNode] = sumDist === 0 ? 0 : (reached / sumDist);
    });
    return scores;
};

export const computeBetweenness = (adj, nodeIds) => {
    const scores = {};
    nodeIds.forEach(n => scores[n] = 0);
    nodeIds.forEach(s => {
        const stack = [];
        const P = {}; nodeIds.forEach(v => P[v] = []);
        const sigma = {}; nodeIds.forEach(v => sigma[v] = 0); sigma[s] = 1;
        const d = {}; nodeIds.forEach(v => d[v] = -1); d[s] = 0;
        const queue = [s];
        while (queue.length > 0) {
            const v = queue.shift();
            stack.push(v);
            if(adj[v]) {
                adj[v].forEach(w => {
                    if (d[w] < 0) { queue.push(w); d[w] = d[v] + 1; }
                    if (d[w] === d[v] + 1) { sigma[w] += sigma[v]; P[w].push(v); }
                });
            }
        }
        const delta = {}; nodeIds.forEach(v => delta[v] = 0);
        while (stack.length > 0) {
            const w = stack.pop();
            P[w].forEach(v => { delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]); });
            if (w !== s) scores[w] += delta[w];
        }
    });
    return scores;
};

export const computeEigenvector = (adj, nodeIds) => {
    const scores = {};
    nodeIds.forEach(n => scores[n] = 1); 
    for (let iter = 0; iter < 20; iter++) {
        const newScores = {};
        let norm = 0;
        nodeIds.forEach(u => {
            let sum = 0;
            if(adj[u]) { adj[u].forEach(v => sum += scores[v]); }
            newScores[u] = sum;
            norm += sum * sum;
        });
        norm = Math.sqrt(norm);
        if (norm === 0) break;
        nodeIds.forEach(u => scores[u] = newScores[u] / norm);
    }
    return scores;
};