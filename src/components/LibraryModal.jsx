import React from 'react';

const LibraryModal = ({ isOpen, onClose, images, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select a Motif</h3>
          <button className="close-modal-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            {images.map((url, idx) => (
              <div key={idx} className="modal-item" onClick={() => onSelect(url)}>
                <img src={url} alt={`motif-${idx}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryModal;