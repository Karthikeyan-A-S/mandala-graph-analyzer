import React, { useState, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import GraphView from './components/GraphView';
import Controls from './components/Controls';
import './App.css'; 
import { toRad } from './utils';

const App = () => {
  // --- STATE ---
  const getInitialState = (key, defaultValue) => {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    return defaultValue;
  };

  const [viewMode, setViewMode] = useState('canvas');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const activeViewRef = useRef(null); // REF TO TRIGGER DOWNLOAD
  
  const [gridOrder, setGridOrder] = useState(() => getInitialState('mandala-gridOrder', 8));
  const [showGrid, setShowGrid] = useState(() => getInitialState('mandala-showGrid', false));
  const [globalInvert, setGlobalInvert] = useState(() => getInitialState('mandala-globalInvert', false));
  const [showIDs, setShowIDs] = useState(() => getInitialState('mandala-showIDs', true));
  const [motifs, setMotifs] = useState(() => getInitialState('mandala-motifs', []));
  
  const [selectedId, setSelectedId] = useState(null);
  const [jsonInput, setJsonInput] = useState('');

  // --- EFFECT: SAVE TO LOCAL STORAGE ---
  useEffect(() => {
    localStorage.setItem('mandala-gridOrder', JSON.stringify(gridOrder));
    localStorage.setItem('mandala-showGrid', JSON.stringify(showGrid));
    localStorage.setItem('mandala-globalInvert', JSON.stringify(globalInvert));
    localStorage.setItem('mandala-showIDs', JSON.stringify(showIDs));
    localStorage.setItem('mandala-motifs', JSON.stringify(motifs));
  }, [gridOrder, showGrid, globalInvert, showIDs, motifs]);

  // --- Actions ---
  const addMotif = (url) => {
    const newId = Date.now().toString();
    const newMotif = {
      id: newId, url,
      config: {
        radius: 0.5, angle: 0, rotation: 0, scale: 0.5,
        multiplicity: 1, flip: false, invert: false, color: '#000000'
      }
    };
    setMotifs([...motifs, newMotif]);
    setSelectedId(newId);
  };

  const updateMotif = (id, newConfig) => setMotifs(motifs.map(m => m.id === id ? { ...m, config: { ...m.config, ...newConfig } } : m));
  const deleteMotif = (id) => { setMotifs(motifs.filter(m => m.id !== id)); if (selectedId === id) setSelectedId(null); };

  const clearAllMotifs = () => {
    if (window.confirm("Are you sure you want to clear all motifs?")) {
      setMotifs([]);
      setSelectedId(null);
    }
  };

  // --- DOWNLOAD HANDLER FOR SIDEBAR ---
  const triggerViewDownload = () => {
    if (activeViewRef.current) {
      activeViewRef.current.download();
    }
  };

  // --- I/O Functions ---
  const downloadJSON = () => {
    const data = JSON.stringify({ gridOrder, globalInvert, motifs }, null, 2);
    saveFile(data, 'mandala_state.json', 'application/json');
  };

  const loadGraphFromInput = () => {
    try {
      const data = JSON.parse(jsonInput);
      if (data.motifs) setMotifs(data.motifs);
      if (data.gridOrder) setGridOrder(data.gridOrder);
      if (data.globalInvert !== undefined) setGlobalInvert(data.globalInvert);
      alert("State loaded successfully!");
    } catch (err) { alert("Invalid JSON format"); }
  };

  const downloadConnectionData = () => {
    const nodeList = {}; const edgeList = []; let nodeCounter = 0;
    const sortedMotifs = [...motifs].sort((a, b) => {
        const rA = a.config.multiplicity === 0 ? 0 : a.config.radius;
        const rB = b.config.multiplicity === 0 ? 0 : b.config.radius;
        return rA - rB;
    });
    let previousLayerIds = [];
    const centerMotifIndex = sortedMotifs.findIndex(m => m.config.multiplicity === 0);

    if (centerMotifIndex !== -1) {
        const centerMotif = sortedMotifs[centerMotifIndex];
        const internalId = `${centerMotif.id}-0`;
        nodeList[internalId] = nodeCounter++; 
        previousLayerIds = [internalId];
        sortedMotifs.splice(centerMotifIndex, 1);
    } else {
        nodeList['center'] = nodeCounter++;
        previousLayerIds = ['center'];
    }

    sortedMotifs.forEach((motif) => {
        const currentLayerIds = [];
        const totalNodes = Math.max(gridOrder * motif.config.multiplicity, 1);
        for (let i = 0; i < totalNodes; i++) {
            const internalId = `${motif.id}-${i}`;
            nodeList[internalId] = nodeCounter++;
            currentLayerIds.push(internalId);
            const angleOffset = totalNodes > 1 ? (i * 360) / totalNodes : 0;
            const angle = motif.config.angle + angleOffset;
            const r = motif.config.radius;
            const x = r * Math.cos(toRad(angle));
            const y = r * Math.sin(toRad(angle));
            let closestPrevId = previousLayerIds[0];
            let minDistSq = Infinity;
            previousLayerIds.forEach(prevId => {
                let prevX = 0, prevY = 0;
                if (prevId !== 'center' && !prevId.includes('-0-root')) { 
                   const [mId, mIdxStr] = prevId.split('-');
                   const prevMotif = motifs.find(m => m.id === mId);
                   if (prevMotif && prevMotif.config.multiplicity !== 0) {
                       const mIdx = parseInt(mIdxStr);
                       const prevTotal = Math.max(gridOrder * prevMotif.config.multiplicity, 1);
                       const prevOffset = (mIdx * 360) / prevTotal;
                       const prevAngle = prevMotif.config.angle + prevOffset;
                       prevX = prevMotif.config.radius * Math.cos(toRad(prevAngle));
                       prevY = prevMotif.config.radius * Math.sin(toRad(prevAngle));
                   }
                }
                const dx = x - prevX; const dy = y - prevY;
                const distSq = dx*dx + dy*dy;
                if (distSq < minDistSq) { minDistSq = distSq; closestPrevId = prevId; }
            });
            edgeList.push([nodeList[internalId], nodeList[closestPrevId]]);
        }
        if (currentLayerIds.length > 1) {
            for (let i = 0; i < currentLayerIds.length; i++) {
                const source = currentLayerIds[i];
                const target = currentLayerIds[(i + 1) % currentLayerIds.length];
                edgeList.push([nodeList[source], nodeList[target]]);
            }
        }
        previousLayerIds = currentLayerIds;
    });

    const matlabData = {
        description: "Adjacency List. Nodes 0-indexed. If Count=0 used, that image is Node 0.",
        node_count: nodeCounter,
        edges: edgeList 
    };
    saveFile(JSON.stringify(matlabData, null, 2), 'mandala_connectivity.json', 'application/json');
  };

  const saveFile = (content, fileName, contentType) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file); a.download = fileName; a.click();
  };
  
  const handleCustomImage = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => addMotif(ev.target.result);
      reader.readAsDataURL(file);
    });
  };
  const handleJsonInputChange = (e) => setJsonInput(e.target.value);

  return (
    <div className={`app-container ${isFullScreen ? 'fullscreen-mode' : ''}`}>
      <div className="canvas-wrapper">
        {viewMode === 'canvas' ? (
          <Canvas 
            ref={activeViewRef} // Pass Ref
            motifs={motifs} gridOrder={gridOrder} showGrid={showGrid} 
            globalInvert={globalInvert} showIDs={showIDs}
            isFullScreen={isFullScreen} toggleFullScreen={() => setIsFullScreen(!isFullScreen)}
          />
        ) : (
          <GraphView 
            ref={activeViewRef} // Pass Ref
            motifs={motifs} gridOrder={gridOrder} width={800} height={800} showIDs={showIDs}
            isFullScreen={isFullScreen} toggleFullScreen={() => setIsFullScreen(!isFullScreen)}
          />
        )}
      </div>
      <Controls 
        viewMode={viewMode} setViewMode={setViewMode}
        gridOrder={gridOrder} setGridOrder={setGridOrder}
        showGrid={showGrid} setShowGrid={setShowGrid}
        globalInvert={globalInvert} setGlobalInvert={setGlobalInvert}
        showIDs={showIDs} setShowIDs={setShowIDs}
        motifs={motifs} selectedId={selectedId} setSelectedId={setSelectedId}
        addMotif={addMotif} updateMotif={updateMotif} deleteMotif={deleteMotif}
        clearAllMotifs={clearAllMotifs}
        handleCustomImage={handleCustomImage}
        downloadJSON={downloadJSON} 
        downloadConnectionData={downloadConnectionData}
        
        // PASS NEW PROPS FOR BUTTONS
        triggerViewDownload={triggerViewDownload}
        toggleFullScreen={() => setIsFullScreen(!isFullScreen)}
        
        jsonInput={jsonInput} handleJsonInputChange={handleJsonInputChange} loadGraphFromInput={loadGraphFromInput}
      />
    </div>
  );
};

export default App;