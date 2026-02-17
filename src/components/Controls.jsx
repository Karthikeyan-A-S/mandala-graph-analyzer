import React, { useState } from 'react';
import { getLibraryImages } from '../utils';
import LibraryModal from './LibraryModal';

const Controls = ({ 
  viewMode, setViewMode,
  gridOrder, setGridOrder, 
  showGrid, setShowGrid,
  globalInvert, setGlobalInvert,
  showIDs, setShowIDs,
  centralityMode, setCentralityMode,
  handleOpenTable, 
  edgeTopology, setEdgeTopology,
  graphOpacity, setGraphOpacity,
  imageOpacity, setImageOpacity,
  motifs, selectedId, setSelectedId,
  addMotif, updateMotif, deleteMotif, clearAllMotifs,
  handleCustomImage,
  downloadJSON, downloadConnectionData,
  triggerViewDownload, toggleFullScreen,
  jsonInput, handleJsonInputChange, loadGraphFromInput,
  
  // NEW PROP
  handleFileUpload
}) => {
  
  const libraryImages = getLibraryImages();
  const activeMotif = motifs.find(m => m.id === selectedId);
  const [showLibrary, setShowLibrary] = useState(false);
  const handleModalSelect = (url) => { addMotif(url); setShowLibrary(false); };

  return (
    <div id="toolbox">
      <h2 className="toolbox-title">Mandala Controls</h2>

      <div className="view-toggle">
        <button className={`toggle-btn ${viewMode === 'canvas' ? 'active' : ''}`} onClick={() => setViewMode('canvas')}>🎨 Image</button>
        <button className={`toggle-btn ${viewMode === 'overlay' ? 'active' : ''}`} onClick={() => setViewMode('overlay')}>👁 Overlay</button>
        <button className={`toggle-btn ${viewMode === 'graph' ? 'active' : ''}`} onClick={() => setViewMode('graph')}>🕸 Graph</button>
      </div>
      
      <fieldset>
        <legend>Settings</legend>
        <div className="control-row">
          <label>Grid Order:</label>
          <select className="styled-select" value={gridOrder} onChange={e => setGridOrder(Number(e.target.value))}>
            {[3,4,6,8,10,12,16,20,24,32].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="toggles-row">
          <label className="checkbox-label"><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> Grid</label>
          <label className="checkbox-label"><input type="checkbox" checked={globalInvert} onChange={e => setGlobalInvert(e.target.checked)} /> Invert BG</label>
          <label className="checkbox-label"><input type="checkbox" checked={showIDs} onChange={e => setShowIDs(e.target.checked)} /> IDs</label>
        </div>

        {viewMode === 'overlay' && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
            <div className="slider-row" style={{ marginBottom: '8px' }}>
              <label className="slider-label" style={{width:'95px'}}>Image Opacity:</label>
              <input type="range" className="styled-range" min={0} max={1} step={0.05} value={imageOpacity} onChange={e => setImageOpacity(Number(e.target.value))} />
            </div>
            <div className="slider-row">
              <label className="slider-label" style={{width:'95px'}}>Graph Opacity:</label>
              <input type="range" className="styled-range" min={0} max={1} step={0.05} value={graphOpacity} onChange={e => setGraphOpacity(Number(e.target.value))} />
            </div>
          </div>
        )}

        {(viewMode === 'graph' || viewMode === 'overlay') && (
          <>
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
              <legend style={{fontSize:'0.85rem', color:'#7f8c8d', marginBottom:'5px', display:'block'}}>Graph Topology</legend>
              <div className="toggles-row">
                <label className="checkbox-label"><input type="checkbox" checked={edgeTopology?.radial} onChange={e => setEdgeTopology({...edgeTopology, radial: e.target.checked})} /> Radial</label>
                <label className="checkbox-label"><input type="checkbox" checked={edgeTopology?.ring} onChange={e => setEdgeTopology({...edgeTopology, ring: e.target.checked})} /> Ring</label>
              </div>
            </div>

            <div className="control-row" style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
               <label style={{ fontWeight: 'bold', color: '#2c3e50', width: '100%', fontSize: '0.9rem' }}>Network Analysis:</label>
               <select className="styled-select" value={centralityMode} onChange={e => setCentralityMode(e.target.value)} style={{ flex: 1, minWidth: '120px' }}>
                 <option value="none">Heatmap: None</option>
                 <option value="degree">Degree</option>
                 <option value="closeness">Closeness</option>
                 <option value="betweenness">Betweenness</option>
                 <option value="eigenvector">Eigenvector</option>
               </select>
               <button className="secondary-btn" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }} onClick={handleOpenTable}>📊 Table</button>
            </div>
          </>
        )}
      </fieldset>

      <div className="view-actions-row">
        <button className="secondary-btn" onClick={toggleFullScreen}>⤢ Full Screen</button>
        <button className="primary-btn" onClick={triggerViewDownload}>⬇ Save {viewMode === 'canvas' ? 'PNG' : 'SVG'}</button>
      </div>

      <fieldset className="graph-io-fieldset">
        <legend>Data I/O</legend>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
            <button className="primary-btn" style={{ fontSize: '0.8rem', padding: '8px' }} onClick={downloadJSON}>⬇ JSON</button>
            <button className="download-btn" style={{ fontSize: '0.8rem', padding: '8px' }} onClick={downloadConnectionData}>⬇ Connectivity</button>
        </div>
        
        {/* NEW: Upload File Section */}
        <label className="custom-file-btn" style={{ margin: '5px 0' }}>
            <span>⬆ Upload JSON File</span>
            <input type="file" accept=".json" onChange={handleFileUpload} hidden />
        </label>
        
        <div className="json-import-area">
          <textarea className="json-textarea" placeholder="Or paste JSON text here..." value={jsonInput} onChange={handleJsonInputChange} rows={1} />
          <button className="secondary-btn" onClick={loadGraphFromInput} disabled={!jsonInput}>Load Text</button>
        </div>
      </fieldset>

      <fieldset>
        <div className="legend-row">
           <legend>Library</legend>
           <button className="view-all-btn" onClick={() => setShowLibrary(true)}>⤢ View All</button>
        </div>
        <div className="library-grid">
          {libraryImages.map((url, idx) => (
            <button key={idx} className="img-btn" onClick={() => addMotif(url)}><img src={url} alt="motif" loading="lazy" /></button>
          ))}
        </div>
        <label className="custom-file-btn"><span>+ Upload Custom Image</span><input type="file" accept="image/*" multiple onChange={handleCustomImage} hidden /></label>
      </fieldset>

      <fieldset>
        <div className="legend-row">
          <legend>Active Motifs ({motifs.length})</legend>
          {motifs.length > 0 && <button className="view-all-btn" style={{ color: '#e74c3c' }} onClick={clearAllMotifs}>Clear All</button>}
        </div>
        <div className="used-list">
          {motifs.map(m => (
            <div key={m.id} className={`used-item ${selectedId === m.id ? 'active' : ''}`} onClick={() => setSelectedId(m.id)}>
              <img src={m.url} alt="" className="used-thumb"/>
              <span className="used-id">{m.id.slice(-4)}</span>
              <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteMotif(m.id); }}>×</button>
            </div>
          ))}
        </div>
      </fieldset>

      <div className={`edit-panel ${activeMotif ? 'panel-visible' : ''}`}>
      {activeMotif && (
        <fieldset className="highlight-fieldset">
          <legend>Edit: {activeMotif.id.slice(-4)}</legend>
          <SliderControl label="Radius" value={activeMotif.config.radius} min={0} max={1} step={0.01} onChange={val => updateMotif(selectedId, { radius: val })} />
          <SliderControl label="Angle" value={activeMotif.config.angle} min={-180} max={180} step={1} onChange={val => updateMotif(selectedId, { angle: val })} />
          <SliderControl label="Rotation" value={activeMotif.config.rotation} min={-180} max={180} step={1} onChange={val => updateMotif(selectedId, { rotation: val })} />
          <SliderControl label="Size" value={activeMotif.config.scale} min={0.1} max={3} step={0.05} onChange={val => updateMotif(selectedId, { scale: val })} />
          <SliderControl label="Count" value={activeMotif.config.multiplicity} min={0} max={64} step={1} onChange={val => updateMotif(selectedId, { multiplicity: val })} />
          <div className="toggles-row parameters-toggles">
             <label className="checkbox-label"><input type="checkbox" checked={activeMotif.config.flip} onChange={e => updateMotif(selectedId, { flip: e.target.checked })} /> Flip</label>
             <label className="checkbox-label"><input type="checkbox" checked={activeMotif.config.invert} onChange={e => updateMotif(selectedId, { invert: e.target.checked })} /> Invert</label>
             <input type="color" className="color-picker" value={activeMotif.config.color} onChange={e => updateMotif(selectedId, { color: e.target.value })} />
          </div>
        </fieldset>
      )}
      </div>
      <LibraryModal isOpen={showLibrary} onClose={() => setShowLibrary(false)} images={libraryImages} onSelect={handleModalSelect} />
    </div>
  );
};

const SliderControl = ({ label, value, min, max, step, onChange }) => (
  <div className="slider-row">
    <label className="slider-label">{label}</label>
    <input type="range" className="styled-range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
    <input type="number" className="styled-number" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max} />
  </div>
);

export default Controls;