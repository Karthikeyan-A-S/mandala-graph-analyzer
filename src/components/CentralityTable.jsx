import React from 'react';

const CentralityTable = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const downloadCSV = () => {
    // Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Node ID,Layer,Degree,Closeness,Betweenness,Eigenvector\n";

    // Rows
    data.forEach(row => {
      const rowStr = `${row.id},${row.layer},${row.degree},${row.closeness.toFixed(4)},${row.betweenness.toFixed(4)},${row.eigenvector.toFixed(4)}`;
      csvContent += rowStr + "\n";
    });

    // Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mandala_centrality_analysis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content table-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Centrality Analysis Data</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button className="primary-btn" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.85rem' }} onClick={downloadCSV}>⬇ Export CSV</button>
             <button className="close-modal-btn" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">
          <table className="analysis-table">
            <thead>
              <tr>
                <th>Node ID</th>
                <th>Layer</th>
                <th>Degree</th>
                <th>Closeness</th>
                <th>Betweenness</th>
                <th>Eigenvector</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td>{row.id}</td>
                  <td>{row.layer}</td>
                  <td>{row.degree}</td>
                  <td>{row.closeness.toFixed(4)}</td>
                  <td>{row.betweenness.toFixed(4)}</td>
                  <td>{row.eigenvector.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CentralityTable;