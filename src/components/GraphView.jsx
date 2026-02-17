import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { toRad } from '../utils';
import { computeDegree, computeCloseness, computeBetweenness, computeEigenvector } from '../utils';

// Helper for heatmap colors
const getHeatmapColor = (score, maxScore) => {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const hue = 240 - (ratio * 240); 
  return `hsl(${hue}, 80%, 50%)`;
};

const GraphView = forwardRef(({ motifs, gridOrder, width = 800, height = 800, showIDs, isFullScreen, toggleFullScreen, centralityMode }, ref) => {
  const svgRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [graphState, setGraphState] = useState({ nodes: [], adjacency: {} }); // Store for analysis
  
  const viewWidth = isFullScreen ? window.innerWidth : width;
  const viewHeight = isFullScreen ? window.innerHeight : height;

  useEffect(() => {
    const centerX = viewWidth / 2;
    const centerY = viewHeight / 2;
    const allNodes = [];
    const allEdges = [];
    const adjacency = {}; 

    const addNode = (n) => { 
        allNodes.push(n); 
        adjacency[n.id] = []; 
    };
    const addEdge = (u, v, props) => {
        allEdges.push(props);
        adjacency[u].push(v);
        adjacency[v].push(u); 
    };

    const sortedMotifs = [...motifs].sort((a, b) => {
        const rA = a.config.multiplicity === 0 ? 0 : a.config.radius;
        const rB = b.config.multiplicity === 0 ? 0 : b.config.radius;
        return rA - rB;
    });

    let previousLayerNodes = [];
    const centerMotifIndex = sortedMotifs.findIndex(m => m.config.multiplicity === 0);
    
    // --- REDUCED NODE SIZES HERE ---
    if (centerMotifIndex !== -1) {
        const centerMotif = sortedMotifs[centerMotifIndex];
        const rootNode = {
            id: `${centerMotif.id}-0`, x: centerX, y: centerY, 
            color: centerMotif.config.color === '#000000' ? '#e74c3c' : centerMotif.config.color,
            r: 8 + (centerMotif.config.scale * 2), baseR: 8, label: "1", layer: 1
        };
        addNode(rootNode);
        previousLayerNodes = [rootNode];
        sortedMotifs.splice(centerMotifIndex, 1);
    } else {
        const abstractCenter = { 
            id: 'center', x: centerX, y: centerY, 
            color: '#2ecc71', r: 6, baseR: 6, label: 'C', layer: 0
        };
        addNode(abstractCenter);
        previousLayerNodes = [abstractCenter];
    }

    const maxRadiusPx = (Math.min(viewWidth, viewHeight) / 2) - 50;

    sortedMotifs.forEach((motif, idx) => {
      const { radius, angle, multiplicity, color, scale } = motif.config;
      const currentLayerNodes = [];
      const layerLabel = (centerMotifIndex !== -1 ? idx + 2 : idx + 1).toString();
      const totalNodes = Math.max(gridOrder * multiplicity, 1);
      
      for (let i = 0; i < totalNodes; i++) {
        const theta = toRad(angle + (i * 360) / totalNodes - 90);
        const rPx = radius * maxRadiusPx; 
        const x = centerX + rPx * Math.cos(theta);
        const y = centerY + rPx * Math.sin(theta);
        const nodeId = `${motif.id}-${i}`;
        
        const node = {
          id: nodeId, x, y,
          color: color === '#000000' ? getColor(idx) : color,
          // SMALLER NODES: Base 3px + small scale bonus
          r: 3 + (scale * 2), baseR: 3 + (scale * 2),
          label: layerLabel, layer: layerLabel
        };
        addNode(node);
        currentLayerNodes.push(node);

        let closestPrev = previousLayerNodes[0];
        let minDist = Infinity;
        previousLayerNodes.forEach(prevNode => {
          const dx = prevNode.x - x; const dy = prevNode.y - y; const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < minDist) { minDist = dist; closestPrev = prevNode; }
        });
        
        addEdge(nodeId, closestPrev.id, { 
            key: `e-${nodeId}-${closestPrev.id}`, 
            x1: x, y1: y, x2: closestPrev.x, y2: closestPrev.y, isRing: false 
        });
      }
      
      if (currentLayerNodes.length > 1) {
        for (let i = 0; i < currentLayerNodes.length; i++) {
          const n1 = currentLayerNodes[i];
          const n2 = currentLayerNodes[(i + 1) % currentLayerNodes.length];
          addEdge(n1.id, n2.id, {
              key: `r-${n1.id}-${n2.id}`, 
              x1: n1.x, y1: n1.y, x2: n2.x, y2: n2.y, isRing: true
          });
        }
      }
      previousLayerNodes = currentLayerNodes;
    });

    // Save state for Data Table export
    setGraphState({ nodes: allNodes, adjacency });

    // Apply Visual Mode Centrality
    if (centralityMode !== 'none') {
        const nodeIds = allNodes.map(n => n.id);
        let scores = {};
        
        if (centralityMode === 'degree') scores = computeDegree(adjacency, nodeIds);
        else if (centralityMode === 'closeness') scores = computeCloseness(adjacency, nodeIds);
        else if (centralityMode === 'betweenness') scores = computeBetweenness(adjacency, nodeIds);
        else if (centralityMode === 'eigenvector') scores = computeEigenvector(adjacency, nodeIds);

        const maxScore = Math.max(...Object.values(scores)) || 1;

        allNodes.forEach(n => {
            const score = scores[n.id] || 0;
            n.color = getHeatmapColor(score, maxScore);
            // Sizing: Base + max 10px extra
            const sizeBonus = (score / maxScore) * 10; 
            n.r = n.baseR + sizeBonus;
        });
    }

    setGraphData({ nodes: allNodes, edges: allEdges });
  }, [motifs, gridOrder, viewWidth, viewHeight, centralityMode]);

  const getColor = (i) => ['#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c'][i % 6];

  const downloadSVG = () => {
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `mandala-graph-${Date.now()}.svg`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- NEW: GENERATE FULL DATA TABLE ---
  const getAnalysisData = () => {
      const { nodes, adjacency } = graphState;
      if (!nodes.length) return [];

      const nodeIds = nodes.map(n => n.id);
      
      // Compute ALL metrics
      const deg = computeDegree(adjacency, nodeIds);
      const clo = computeCloseness(adjacency, nodeIds);
      const bet = computeBetweenness(adjacency, nodeIds);
      const eig = computeEigenvector(adjacency, nodeIds);

      // Combine into rows
      return nodes.map(n => ({
          id: n.id,
          layer: n.layer,
          degree: deg[n.id] || 0,
          closeness: clo[n.id] || 0,
          betweenness: bet[n.id] || 0,
          eigenvector: eig[n.id] || 0
      }));
  };

  useImperativeHandle(ref, () => ({ 
      download: downloadSVG,
      getData: getAnalysisData // Expose data getter
  }));

  return (
    <div className="view-pane-wrapper">
      {isFullScreen && (
        <div className="fullscreen-toolbar">
           <button onClick={toggleFullScreen} className="float-btn">Exit Full Screen</button>
           <button onClick={downloadSVG} className="float-btn">⬇ Save SVG</button>
        </div>
      )}
      <svg ref={svgRef} width={viewWidth} height={viewHeight} viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="main-graph-element">
        <rect width="100%" height="100%" fill="white" />
        {graphData.edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#777" strokeWidth={e.isRing ? 1 : 1.5} opacity={0.5} />
        ))}
        {graphData.nodes.map((n) => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <circle r={n.r} fill={n.color} stroke="#333" strokeWidth="1" />
            {((n.label === 'C' || n.label === '1') || showIDs) && (
              <text dy=".3em" textAnchor="middle" fill="#000" fontSize="9px" fontWeight="bold" stroke="white" strokeWidth="0.5px" paintOrder="stroke">
                {n.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
});

export default GraphView;