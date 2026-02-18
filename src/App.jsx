import React, { useState, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import GraphView from './components/GraphView';
import Controls from './components/Controls';
import CentralityTable from './components/CentralityTable';
import './App.css'; 
import { toRad } from './utils';

const App = () => {
  const getInitialState = (key, defaultValue) => {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    return defaultValue;
  };

  const [viewMode, setViewMode] = useState('canvas'); 
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [centralityMode, setCentralityMode] = useState('none');
  const [edgeTopology, setEdgeTopology] = useState(() => getInitialState('mandala-topology', { radial: true, ring: true }));
  
  // INDEPENDENT OPACITY STATES
  const [graphOpacity, setGraphOpacity] = useState(0.8);
  const [imageOpacity, setImageOpacity] = useState(1.0);

  const [showTable, setShowTable] = useState(false);
  const [tableData, setTableData] = useState([]);
  const activeViewRef = useRef(null); 
  
  const [gridOrder, setGridOrder] = useState(() => getInitialState('mandala-gridOrder', 8));
  const [showGrid, setShowGrid] = useState(() => getInitialState('mandala-showGrid', false));
  const [globalInvert, setGlobalInvert] = useState(() => getInitialState('mandala-globalInvert', false));
  
  // --- SPLIT ID STATES ---
  const [showMotifIDs, setShowMotifIDs] = useState(() => getInitialState('mandala-showMotifIDs', false)); // IDs on Image
  const [showNodeIDs, setShowNodeIDs] = useState(() => getInitialState('mandala-showNodeIDs', true));     // IDs on Graph

  const [motifs, setMotifs] = useState(() => getInitialState('mandala-motifs', []));
  const [selectedId, setSelectedId] = useState(null);
  const [jsonInput, setJsonInput] = useState('');

  useEffect(() => {
    localStorage.setItem('mandala-gridOrder', JSON.stringify(gridOrder));
    localStorage.setItem('mandala-showGrid', JSON.stringify(showGrid));
    localStorage.setItem('mandala-globalInvert', JSON.stringify(globalInvert));
    localStorage.setItem('mandala-showMotifIDs', JSON.stringify(showMotifIDs));
    localStorage.setItem('mandala-showNodeIDs', JSON.stringify(showNodeIDs));
    localStorage.setItem('mandala-motifs', JSON.stringify(motifs));
    localStorage.setItem('mandala-topology', JSON.stringify(edgeTopology));
  }, [gridOrder, showGrid, globalInvert, showMotifIDs, showNodeIDs, motifs, edgeTopology]);

  // --- ACTIONS ---
  const addMotif = (url) => {
    const newId = Date.now().toString();
    const newMotif = { 
        id: newId, 
        url, 
        config: { 
            radius: 0.5, angle: 0, rotation: 0, scale: 0.5, 
            multiplicity: 1, flip: false, invert: false, color: '#000000',
            isCenter: false 
        } 
    };
    setMotifs([...motifs, newMotif]); 
    setSelectedId(newId);
  };

  const updateMotif = (id, newConfig) => setMotifs(motifs.map(m => m.id === id ? { ...m, config: { ...m.config, ...newConfig } } : m));
  const deleteMotif = (id) => { setMotifs(motifs.filter(m => m.id !== id)); if (selectedId === id) setSelectedId(null); };
  const clearAllMotifs = () => { if (window.confirm("Clear all?")) { setMotifs([]); setSelectedId(null); } };
  const triggerViewDownload = () => { if (activeViewRef.current) activeViewRef.current.download(); };
  
  const handleOpenTable = () => {
    if (viewMode === 'canvas') { alert("Switch to Graph or Overlay View first."); setViewMode('overlay'); return; }
    if (activeViewRef.current && activeViewRef.current.getData) { setTableData(activeViewRef.current.getData()); setShowTable(true); }
  };

  // --- DATA I/O ---
  const saveFile = (content, fileName, contentType) => { 
      const a = document.createElement("a"); 
      const file = new Blob([content], { type: contentType }); 
      a.href = URL.createObjectURL(file); 
      a.download = fileName; 
      a.click(); 
  };

  const downloadJSON = () => { 
      const data = JSON.stringify({ gridOrder, globalInvert, motifs }, null, 2); 
      saveFile(data, 'mandala.json', 'application/json'); 
  };

  const handleCustomImage = (e) => { 
      Array.from(e.target.files).forEach(file => { 
          const r = new FileReader(); 
          r.onload = (ev) => addMotif(ev.target.result); 
          r.readAsDataURL(file); 
      }); 
  };
  
  const handleJsonInputChange = (e) => setJsonInput(e.target.value);

  // Shared Loader
  const loadGraphData = (data) => {
    if (data.motifs) setMotifs(data.motifs);
    if (data.gridOrder) setGridOrder(data.gridOrder);
    if (data.globalInvert !== undefined) setGlobalInvert(data.globalInvert);
    alert("Graph loaded successfully!");
  };

  const loadGraphFromInput = () => {
    try {
      const data = JSON.parse(jsonInput);
      loadGraphData(data);
    } catch (err) {
      alert("Invalid JSON text");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        loadGraphData(data);
        e.target.value = ''; // Reset
      } catch (err) {
        alert("Error parsing JSON file");
      }
    };
    reader.readAsText(file);
  };

  // --- CONNECTIVITY EXPORT ---
  const downloadConnectionData = () => {
    const nodeList = {}; 
    const edgeList = []; 
    let nodeCounter = 0;
    
    const centerMotifs = motifs.filter(m => m.config.isCenter);
    const ringMotifs = motifs.filter(m => !m.config.isCenter).sort((a, b) => a.config.radius - b.config.radius);

    const layers = [];
    ringMotifs.forEach(m => {
        const existingLayer = layers.find(l => Math.abs(l.radius - m.config.radius) < 0.01);
        if (existingLayer) existingLayer.motifs.push(m);
        else layers.push({ radius: m.config.radius, motifs: [m] });
    });

    let previousLayerIds = [];

    // Center Node (Layer 0)
    const centerId = 'center-node';
    nodeList[centerId] = nodeCounter++;
    previousLayerIds = [centerId];

    // Layers
    layers.forEach((layer) => {
        const currentLayerIds = []; 

        layer.motifs.forEach((motif) => {
            const currentMotifIds = [];
            const totalNodes = Math.max(gridOrder * motif.config.multiplicity, 1);

            for (let i = 0; i < totalNodes; i++) {
                const internalId = `${motif.id}-${i}`;
                nodeList[internalId] = nodeCounter++;
                currentMotifIds.push(internalId);
                currentLayerIds.push(internalId); 

                // RADIAL
                if (edgeTopology.radial) {
                    const prevIndex = Math.floor(i * (previousLayerIds.length / totalNodes)) % previousLayerIds.length;
                    edgeList.push([nodeList[internalId], nodeList[previousLayerIds[prevIndex]]]);
                }
            }

            // RING
            if (edgeTopology.ring && currentMotifIds.length > 1) {
                for (let i = 0; i < currentMotifIds.length; i++) {
                    edgeList.push([nodeList[currentMotifIds[i]], nodeList[currentMotifIds[(i + 1) % currentMotifIds.length]]]);
                }
            }
        });
        previousLayerIds = currentLayerIds;
    });

    const outputData = {
        description: "Adjacency List (Center Merged, Layer-Grouped)",
        topology_settings: edgeTopology,
        node_count: nodeCounter,
        edges: edgeList 
    };

    saveFile(JSON.stringify(outputData, null, 2), 'mandala_connectivity.json', 'application/json');
  };

  return (
    <div className={`app-container ${isFullScreen ? 'fullscreen-mode' : ''}`}>
      <div className="canvas-wrapper">
        <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'white', zIndex: 0 }} />
        
        {/* Layer 1: Image Canvas */}
        {(viewMode === 'canvas' || viewMode === 'overlay') && (
          <div style={{ 
            position: 'absolute', width: '100%', height: '100%', zIndex: 1,
            opacity: imageOpacity 
          }}>
             <Canvas 
               ref={viewMode === 'canvas' ? activeViewRef : null}
               motifs={motifs} gridOrder={gridOrder} showGrid={showGrid} 
               globalInvert={globalInvert} 
               showMotifIDs={showMotifIDs} // PASSING NEW PROP
               isFullScreen={isFullScreen} toggleFullScreen={() => setIsFullScreen(!isFullScreen)} 
             />
          </div>
        )}

        {/* Layer 2: Graph SVG */}
        {(viewMode === 'graph' || viewMode === 'overlay') && (
           <div style={{ 
             position: 'absolute', width: '100%', height: '100%', zIndex: 2, 
             opacity: viewMode === 'overlay' ? graphOpacity : 1, 
             pointerEvents: viewMode === 'overlay' ? 'none' : 'auto' 
           }}>
             <GraphView 
               ref={activeViewRef}
               motifs={motifs} gridOrder={gridOrder} 
               showNodeIDs={showNodeIDs} // PASSING NEW PROP
               isFullScreen={isFullScreen} toggleFullScreen={() => setIsFullScreen(!isFullScreen)}
               centralityMode={centralityMode} edgeTopology={edgeTopology} 
               transparentBackground={viewMode === 'overlay'}
             />
           </div>
        )}
        
        {isFullScreen && (
          <div className="fullscreen-toolbar" style={{ pointerEvents: 'auto' }}>
            <button onClick={() => setIsFullScreen(false)} className="float-btn">Exit Full Screen</button>
            <button onClick={triggerViewDownload} className="float-btn">⬇ Save {viewMode === 'canvas' ? 'PNG' : 'SVG'}</button>
          </div>
        )}
      </div>
      
      <Controls 
        viewMode={viewMode} setViewMode={setViewMode}
        gridOrder={gridOrder} setGridOrder={setGridOrder}
        showGrid={showGrid} setShowGrid={setShowGrid}
        globalInvert={globalInvert} setGlobalInvert={setGlobalInvert}
        
        // PASSING BOTH ID STATES
        showMotifIDs={showMotifIDs} setShowMotifIDs={setShowMotifIDs}
        showNodeIDs={showNodeIDs} setShowNodeIDs={setShowNodeIDs}

        motifs={motifs} selectedId={selectedId} setSelectedId={setSelectedId}
        addMotif={addMotif} updateMotif={updateMotif} deleteMotif={deleteMotif}
        clearAllMotifs={clearAllMotifs} handleCustomImage={handleCustomImage}
        downloadJSON={downloadJSON} downloadConnectionData={downloadConnectionData}
        triggerViewDownload={triggerViewDownload} toggleFullScreen={() => setIsFullScreen(!isFullScreen)}
        jsonInput={jsonInput} handleJsonInputChange={handleJsonInputChange} loadGraphFromInput={loadGraphFromInput}
        centralityMode={centralityMode} setCentralityMode={setCentralityMode}
        handleOpenTable={handleOpenTable} edgeTopology={edgeTopology} setEdgeTopology={setEdgeTopology}
        graphOpacity={graphOpacity} setGraphOpacity={setGraphOpacity}
        imageOpacity={imageOpacity} setImageOpacity={setImageOpacity}
        handleFileUpload={handleFileUpload}
      />
      <CentralityTable isOpen={showTable} onClose={() => setShowTable(false)} data={tableData} />
    </div>
  );
};

export default App;