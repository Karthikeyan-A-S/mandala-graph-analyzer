import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { toRad, tintImage, invertHex } from '../utils';

const Canvas = forwardRef(({ motifs, gridOrder, showGrid, globalInvert, showIDs, isFullScreen, toggleFullScreen }, ref) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    
    // Resize based on mode
    if (isFullScreen) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    } else {
      canvas.width = 1000; // High res for download quality
      canvas.height = 1000;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Center & Scale Logic
    const centerX = width / 2;
    const centerY = height / 2;
    const minDim = Math.min(width, height);
    const drawScale = minDim / 1000; 

    // Draw Background
    ctx.fillStyle = globalInvert ? '#000000' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (showGrid) drawGrid(ctx, centerX, centerY, gridOrder, globalInvert, drawScale);

    const drawAllMotifs = async () => {
      const sortedMotifs = [...motifs].sort((a, b) => {
        const radA = a.config.multiplicity === 0 ? 0 : a.config.radius;
        const radB = b.config.multiplicity === 0 ? 0 : b.config.radius;
        return radA - radB;
      });
      
      for (let i = 0; i < sortedMotifs.length; i++) {
        await drawSingleMotif(ctx, centerX, centerY, sortedMotifs[i], gridOrder, globalInvert, showIDs, i + 1, drawScale);
      }
    };
    drawAllMotifs();

  }, [motifs, gridOrder, showGrid, globalInvert, showIDs, isFullScreen]);

  // --- DOWNLOAD LOGIC EXPOSED TO PARENT ---
  const downloadPNG = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `mandala-art-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useImperativeHandle(ref, () => ({
    download: downloadPNG
  }));

  return (
    <div className="view-pane-wrapper">
      {/* ONLY SHOW FLOATING BUTTONS IN FULL SCREEN */}
      {isFullScreen && (
        <div className="fullscreen-toolbar">
           <button onClick={toggleFullScreen} className="float-btn">Exit Full Screen</button>
           <button onClick={downloadPNG} className="float-btn">⬇ Save PNG</button>
        </div>
      )}
      <canvas ref={canvasRef} className="main-canvas-element" />
    </div>
  );
});

// --- Helpers ---
const drawGrid = (ctx, cx, cy, order, invert, scale) => {
  ctx.save();
  ctx.strokeStyle = invert ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  const maxRadius = 500 * scale; 
  for (let r = 0; r < maxRadius; r += (60 * scale)) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < order; i++) {
    const angle = (i * 360) / order;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(toRad(angle - 90));
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(maxRadius, 0); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
};

const drawSingleMotif = (ctx, cx, cy, motif, gridOrder, globalInvert, showIDs, layerNumber, drawScale) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = motif.url;
    img.crossOrigin = "Anonymous"; 
    img.onload = () => {
      const { radius, angle, rotation, scale, multiplicity, flip, invert, color } = motif.config;
      const shouldInvert = (invert && !globalInvert) || (!invert && globalInvert);
      let finalColor = color;
      if (shouldInvert) finalColor = invertHex(color);
      else if (globalInvert && color === '#000000') finalColor = '#ffffff'; 

      const drawable = tintImage(img, finalColor);
      const isWhiteOnWhite = (finalColor.toLowerCase() === '#ffffff' && !globalInvert);
      const isCenter = multiplicity === 0;
      const totalCopies = isCenter ? 1 : gridOrder * multiplicity;
      const finalScale = scale * drawScale;
      const radiusPixel = radius * (500 * drawScale - 50 * drawScale); 

      for (let i = 0; i < totalCopies; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        if (isCenter) {
            ctx.rotate(toRad(rotation)); 
            if (showIDs) {
                ctx.save(); ctx.fillStyle = globalInvert ? "#ffff00" : "#0000ff";
                ctx.font = `bold ${20 * drawScale}px sans-serif`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(layerNumber.toString(), 0, -(img.height * finalScale / 2) - (15 * drawScale));
                ctx.restore();
            }
        } else {
            const sectorAngle = (i * 360) / totalCopies;
            const finalAngle = angle + sectorAngle;
            ctx.rotate(toRad(finalAngle - 90));
            ctx.translate(radiusPixel, 0);
            if (showIDs) {
                ctx.save(); ctx.rotate(toRad(90)); 
                ctx.fillStyle = globalInvert ? "#ffff00" : "#0000ff";
                ctx.font = `bold ${16 * drawScale}px sans-serif`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(layerNumber.toString(), 0, -(img.height * finalScale / 2) - (12 * drawScale)); 
                ctx.restore();
            }
            ctx.rotate(toRad(rotation + 90));
        }
        const scaleX = flip ? -finalScale : finalScale;
        ctx.scale(scaleX, finalScale);
        if (isWhiteOnWhite) {
            ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 4;
        }
        ctx.drawImage(drawable, -img.width / 2, -img.height / 2);
        ctx.restore();
      }
      resolve();
    };
    img.onerror = () => resolve();
  });
};

export default Canvas;