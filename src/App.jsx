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
  const [graphOpacity, setGraphOpacity] = useState(0.8);
  const [imageOpacity, setImageOpacity] = useState(1.0);

  const [showTable, setShowTable] = useState(false);
  const [tableData, setTableData] = useState([]);
  const activeViewRef = useRef(null); 
  
  const [gridOrder, setGridOrder] = useState(() => getInitialState('mandala-gridOrder', 8));
  const [showGrid, setShowGrid] = useState(() => getInitialState('mandala-showGrid', false));
  const [globalInvert, setGlobalInvert] = useState(() => getInitialState('mandala-globalInvert', false));
  const [showIDs, setShowIDs] = useState(() => getInitialState('mandala-showIDs', true));
  const [motifs, setMotifs] = useState(() => getInitialState('mandala-motifs', []));
  const [selectedId, setSelectedId] = useState(null);
  const [jsonInput, setJsonInput] = useState('');

  useEffect(() => {
    localStorage.setItem('mandala-gridOrder', JSON.stringify(gridOrder));
    localStorage.setItem('mandala-showGrid', JSON.stringify(showGrid));
    localStorage.setItem('mandala-globalInvert', JSON.stringify(globalInvert));
    localStorage.setItem('mandala-showIDs', JSON.stringify(showIDs));
    localStorage.setItem('mandala-motifs', JSON.stringify(motifs));
    localStorage.setItem('mandala-topology', JSON.stringify(edgeTopology));
  }, [gridOrder, showGrid, globalInvert, showIDs, motifs, edgeTopology]);

  const addMotif = (url) => {
    const newId = Date.now().toString();
    const newMotif = { id: newId, url, config: { radius: 0.5, angle: 0, rotation: 0, scale: 0.5, multiplicity: 1, flip: false, invert: false, color: '#000000' } };
    setMotifs([...motifs, newMotif]); setSelectedId(newId);
  };
  const updateMotif = (id, newConfig) => setMotifs(motifs.map(m => m.id === id ? { ...m, config: { ...m.config, ...newConfig } } : m));
  const deleteMotif = (id) => { setMotifs(motifs.filter(m => m.id !== id)); if (selectedId === id) setSelectedId(null); };
  const clearAllMotifs = () => { if (window.confirm("Clear all?")) { setMotifs([]); setSelectedId(null); } };
  const triggerViewDownload = () => { if (activeViewRef.current) activeViewRef.current.download(); };
  
  const handleOpenTable = () => {
    if (viewMode === 'canvas') { alert("Switch to Graph or Overlay View first."); setViewMode('overlay'); return; }
    if (activeViewRef.current && activeViewRef.current.getData) { setTableData(activeViewRef.current.getData()); setShowTable(true); }
  };

  const downloadJSON = () => { const data = JSON.stringify({ gridOrder, globalInvert, motifs }, null, 2); saveFile(data, 'mandala.json', 'application/json'); };
  const loadGraphFromInput = () => { try { const data = JSON.parse(jsonInput); if (data.motifs) setMotifs(data.motifs); if (data.gridOrder) setGridOrder(data.gridOrder); alert("Loaded!"); } catch (err) { alert("Invalid JSON"); } };
  const saveFile = (content, fileName, contentType) => { const a = document.createElement("a"); const file = new Blob([content], { type: contentType }); a.href = URL.createObjectURL(file); a.download = fileName; a.click(); };
  const handleCustomImage = (e) => { Array.from(e.target.files).forEach(file => { const r = new FileReader(); r.onload = (ev) => addMotif(ev.target.result); r.readAsDataURL(file); }); };
  const handleJsonInputChange = (e) => setJsonInput(e.target.value);
  const downloadConnectionData = () => { /* Placeholder */ };

  return (
    <div className={`app-container ${isFullScreen ? 'fullscreen-mode' : ''}`}>
      <div className="canvas-wrapper">
        
        {/* Layer 0: White Backdrop */}
        <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'white', zIndex: 0 }} />

        {/* Layer 1: Image Canvas */}
        {(viewMode === 'canvas' || viewMode === 'overlay') && (
          <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1, opacity: imageOpacity }}>
             <Canvas 
               ref={viewMode === 'canvas' ? activeViewRef : null}
               motifs={motifs} gridOrder={gridOrder} showGrid={showGrid} 
               globalInvert={globalInvert} showIDs={showIDs} 
               isFullScreen={isFullScreen} toggleFullScreen={() => setIsFullScreen(!isFullScreen)} 
             />
          </div>
        )}

        {/* Layer 2: Graph SVG */}
        {(viewMode === 'graph' || viewMode === 'overlay') && (
           <div style={{ 
             position: 'absolute', width: '100%', height: '100%', zIndex: 2, 
             opacity: viewMode === 'overlay' ? graphOpacity : 1, 
             // FIX: Only disable pointer events in Overlay mode. In Graph mode, we want clicks!
             pointerEvents: viewMode === 'overlay' ? 'none' : 'auto' 
           }}>
             <GraphView 
               ref={activeViewRef}
               motifs={motifs} gridOrder={gridOrder} width={800} height={800} showIDs={showIDs}
               isFullScreen={isFullScreen} toggleFullScreen={() => setIsFullScreen(!isFullScreen)}
               centralityMode={centralityMode} edgeTopology={edgeTopology} 
               transparentBackground={viewMode === 'overlay'}
             />
           </div>
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
        clearAllMotifs={clearAllMotifs} handleCustomImage={handleCustomImage}
        downloadJSON={downloadJSON} downloadConnectionData={downloadConnectionData}
        triggerViewDownload={triggerViewDownload} toggleFullScreen={() => setIsFullScreen(!isFullScreen)}
        jsonInput={jsonInput} handleJsonInputChange={handleJsonInputChange} loadGraphFromInput={loadGraphFromInput}
        centralityMode={centralityMode} setCentralityMode={setCentralityMode}
        handleOpenTable={handleOpenTable} edgeTopology={edgeTopology} setEdgeTopology={setEdgeTopology}
        graphOpacity={graphOpacity} setGraphOpacity={setGraphOpacity}
        imageOpacity={imageOpacity} setImageOpacity={setImageOpacity}
      />
      <CentralityTable isOpen={showTable} onClose={() => setShowTable(false)} data={tableData} />
    </div>
  );
};

export default App;