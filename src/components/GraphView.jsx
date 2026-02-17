import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { toRad, computeDegree, computeCloseness, computeBetweenness, computeEigenvector } from '../utils';

const getHeatmapColor = (score, maxScore) => {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const hue = 240 - (ratio * 240); 
  return `hsl(${hue}, 80%, 50%)`;
};

const GraphView = forwardRef(({ 
  motifs, gridOrder, showIDs, centralityMode,
  edgeTopology = { radial: true, ring: true },
  transparentBackground = false 
}, ref) => {
  
  const svgRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [graphState, setGraphState] = useState({ nodes: [], adjacency: {} });
  const LOGICAL_SIZE = 1000;

  useEffect(() => {
    const centerX = LOGICAL_SIZE / 2;
    const centerY = LOGICAL_SIZE / 2;
    const maxRadiusPx = (LOGICAL_SIZE / 2) - 50;

    const allNodes = [];
    const allEdges = [];
    const adjacency = {}; 

    const addNode = (n) => { allNodes.push(n); adjacency[n.id] = []; };
    const addEdge = (u, v, props) => {
        allEdges.push(props);
        adjacency[u].push(v);
        adjacency[v].push(u); 
    };

    // 1. Separate & Sort
    const centerMotifs = motifs.filter(m => m.config.isCenter);
    const ringMotifs = motifs.filter(m => !m.config.isCenter).sort((a, b) => a.config.radius - b.config.radius);

    // 2. Group Ring Motifs by Radius (Tolerance 0.01)
    const layers = [];
    ringMotifs.forEach(m => {
        const existingLayer = layers.find(l => Math.abs(l.radius - m.config.radius) < 0.01);
        if (existingLayer) {
            existingLayer.motifs.push(m);
        } else {
            layers.push({ radius: m.config.radius, motifs: [m] });
        }
    });

    let previousLayerNodes = [];
    
    // 3. Create SINGLE Center Node
    if (centerMotifs.length > 0) {
        const rep = centerMotifs[0]; 
        const rootNode = {
            id: 'center-node', x: centerX, y: centerY, 
            color: rep.config.color === '#000000' ? '#e74c3c' : rep.config.color,
            r: 8 + (rep.config.scale * 2), baseR: 8, label: "C", layer: 0
        };
        addNode(rootNode);
        previousLayerNodes = [rootNode];
    } else {
        const abstractCenter = { 
            id: 'center-node', x: centerX, y: centerY, 
            color: '#2ecc71', r: 6, baseR: 6, label: 'C', layer: 0
        };
        addNode(abstractCenter);
        previousLayerNodes = [abstractCenter];
    }

    // 4. Process Layers (Grouped by Radius)
    layers.forEach((layer, layerIdx) => {
      const currentLayerTotalNodes = []; // All nodes generated in this radius-layer

      layer.motifs.forEach((motif, mIdx) => {
          const { angle, multiplicity, color, scale } = motif.config;
          const currentMotifNodes = [];
          
          // Generate an ID suffix based on layer index + motif index to ensure uniqueness
          // This prevents ID collision if multiple motifs are in the same layer
          const uniqueGroupSuffix = `${layerIdx}-${mIdx}`; 
          const layerLabel = (layerIdx + 1).toString();
          const totalNodes = Math.max(gridOrder * multiplicity, 1);
          
          for (let i = 0; i < totalNodes; i++) {
            const theta = toRad(angle + (i * 360) / totalNodes - 90);
            const rPx = layer.radius * maxRadiusPx; 
            const x = centerX + rPx * Math.cos(theta);
            const y = centerY + rPx * Math.sin(theta);
            
            const nodeId = `${motif.id}-${i}`;
            
            const node = {
              id: nodeId, x, y,
              color: color === '#000000' ? getColor(layerIdx) : color,
              r: 6 + (scale * 4), baseR: 6 + (scale * 4),
              label: layerLabel, layer: layerLabel
            };
            addNode(node);
            currentMotifNodes.push(node);
            currentLayerTotalNodes.push(node); // Collect for next layer's reference

            // RADIAL CONNECTION (Connect to PREVIOUS layer, not sibling motifs)
            if (edgeTopology.radial) {
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
          }
          
          // RING CONNECTION (Within this specific motif's ring)
          if (edgeTopology.ring && currentMotifNodes.length > 1) {
            for (let i = 0; i < currentMotifNodes.length; i++) {
              const n1 = currentMotifNodes[i];
              const n2 = currentMotifNodes[(i + 1) % currentMotifNodes.length];
              addEdge(n1.id, n2.id, {
                  key: `r-${n1.id}-${n2.id}`, 
                  x1: n1.x, y1: n1.y, x2: n2.x, y2: n2.y, isRing: true
              });
            }
          }
      });

      // Update previous layer to be THIS entire layer (all motifs combined)
      // So the NEXT layer (larger radius) will connect to any of these nodes.
      previousLayerNodes = currentLayerTotalNodes;
    });

    setGraphState({ nodes: allNodes, adjacency });

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
            const sizeBonus = (score / maxScore) * 15; 
            n.r = n.baseR + sizeBonus;
        });
    }

    setGraphData({ nodes: allNodes, edges: allEdges });
  }, [motifs, gridOrder, centralityMode, edgeTopology]);

  const getColor = (i) => ['#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c'][i % 6];
  
  const downloadSVG = () => {
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `mandala-graph-${Date.now()}.svg`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const getAnalysisData = () => {
      const { nodes, adjacency } = graphState;
      if (!nodes.length) return [];
      const nodeIds = nodes.map(n => n.id);
      const deg = computeDegree(adjacency, nodeIds);
      const clo = computeCloseness(adjacency, nodeIds);
      const bet = computeBetweenness(adjacency, nodeIds);
      const eig = computeEigenvector(adjacency, nodeIds);
      return nodes.map(n => ({
          id: n.id, layer: n.layer,
          degree: deg[n.id] || 0, closeness: clo[n.id] || 0,
          betweenness: bet[n.id] || 0, eigenvector: eig[n.id] || 0
      }));
  };

  useImperativeHandle(ref, () => ({ download: downloadSVG, getData: getAnalysisData }));

  return (
    <div className="view-pane-wrapper" style={transparentBackground ? { background: 'transparent', boxShadow: 'none' } : {}}>
      <svg ref={svgRef} viewBox={`0 0 ${LOGICAL_SIZE} ${LOGICAL_SIZE}`} className="main-graph-element" style={{ width: '100%', height: '100%' }}>
        {!transparentBackground && <rect width="100%" height="100%" fill="white" />}
        {graphData.edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#777" strokeWidth={e.isRing ? 1 : 2} opacity={0.6} />
        ))}
        {graphData.nodes.map((n) => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <circle r={n.r} fill={n.color} stroke="#333" strokeWidth="1" />
            {(n.label === 'C' || showIDs) && (
              <text dy=".3em" textAnchor="middle" fill="#000" fontSize="14px" fontWeight="bold" stroke="white" strokeWidth="2px" paintOrder="stroke">
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