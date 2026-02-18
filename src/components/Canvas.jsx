import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { toRad, tintImage } from '../utils';

const Canvas = forwardRef(({ motifs, gridOrder, showGrid, globalInvert, showMotifIDs }, ref) => {
  const canvasRef = useRef(null);
  const LOGICAL_SIZE = 1000;

  const download = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `mandala-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  
  const getData = () => [];

  useImperativeHandle(ref, () => ({ download, getData }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = LOGICAL_SIZE * dpr;
    canvas.height = LOGICAL_SIZE * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    ctx.scale(dpr, dpr);

    ctx.fillStyle = globalInvert ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

    const centerX = LOGICAL_SIZE / 2;
    const centerY = LOGICAL_SIZE / 2;
    const maxRadius = (LOGICAL_SIZE / 2) - 50; 

    if (showGrid) {
      ctx.strokeStyle = globalInvert ? '#444' : '#eee';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 10; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * (i / 10), 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < gridOrder; i++) {
        const theta = (i * 2 * Math.PI) / gridOrder - (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + maxRadius * Math.cos(theta), centerY + maxRadius * Math.sin(theta));
        ctx.stroke();
      }
    }

    const drawAllMotifs = async () => {
      const sortedMotifs = [...motifs].sort((a, b) => {
          const rA = a.config.isCenter ? 0 : a.config.radius;
          const rB = b.config.isCenter ? 0 : b.config.radius;
          return rA - rB;
      });

      for (const motif of sortedMotifs) {
        await drawSingleMotif(ctx, motif, centerX, centerY, maxRadius, gridOrder, globalInvert, showMotifIDs);
      }
    };

    drawAllMotifs();

  }, [motifs, gridOrder, showGrid, globalInvert, showMotifIDs]);

  return <canvas ref={canvasRef} className="main-canvas-element" />;
});

const drawSingleMotif = (ctx, motif, cx, cy, maxRadius, gridOrder, globalInvert, showMotifIDs) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = motif.url;
    img.onload = () => {
      const { radius, angle, rotation, scale, multiplicity, flip, invert, color, isCenter } = motif.config;
      
      const count = isCenter ? 1 : Math.max(gridOrder * multiplicity, 1);
      const effectiveRadius = isCenter ? 0 : radius;
      
      let drawImg = img;
      if (color !== '#000000') {
          drawImg = tintImage(img, color);
      }

      for (let i = 0; i < count; i++) {
        ctx.save();
        const theta = isCenter ? 0 : toRad(angle + (i * 360) / count - 90);
        const rPx = effectiveRadius * maxRadius;
        const x = cx + rPx * Math.cos(theta);
        const y = cy + rPx * Math.sin(theta);
        
        ctx.translate(x, y);
        ctx.rotate(theta + toRad(90)); 
        ctx.rotate(toRad(rotation));
        if (flip) ctx.scale(-1, 1);
        
        const w = 50 * scale; 
        const h = 50 * scale * (img.height / img.width);
        
        if (invert || globalInvert) ctx.filter = 'invert(1)';
        ctx.drawImage(drawImg, -w / 2, -h / 2, w, h);
        
        if (showMotifIDs) {
            ctx.filter = 'none';
            ctx.fillStyle = globalInvert ? '#fff' : '#000';
            ctx.font = '14px sans-serif'; 
            ctx.textAlign = 'center';
            const label = isCenter ? `${motif.id.slice(-4)}-0` : `${motif.id.slice(-4)}-${i}`;
            ctx.fillText(label, 0, -h/2 - 5);
        }

        ctx.restore();
      }
      resolve();
    };
    img.onerror = resolve;
  });
};

export default Canvas;