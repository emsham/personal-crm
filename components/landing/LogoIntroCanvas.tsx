import React, { useEffect, useRef } from 'react';

interface NetworkNode {
  x: number;
  y: number;
  radius: number;
  color: { r: number; g: number; b: number };
  scale: number;
  targetScale: number;
  delay: number;
}

interface LogoIntroCanvasProps {
  className?: string;
}

const LogoIntroCanvas: React.FC<LogoIntroCanvasProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const nodesRef = useRef<NetworkNode[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const logoColors = [
      { r: 56, g: 189, b: 248 },   // cyan
      { r: 129, g: 140, b: 248 },  // blue
      { r: 167, g: 139, b: 250 },  // purple
      { r: 99, g: 179, b: 237 }    // gradient blue
    ];

    const initNodes = () => {
      nodesRef.current = [];
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Larger grid cells = fewer nodes, more spread out
      const gridCols = Math.ceil(canvas.width / 150);
      const gridRows = Math.ceil(canvas.height / 150);

      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const cellX = (col + 0.5) * (canvas.width / gridCols);
          const cellY = (row + 0.5) * (canvas.height / gridRows);

          // Skip center area where SVG logo is (larger exclusion zone)
          const distFromCenter = Math.sqrt(
            Math.pow(cellX - centerX, 2) + Math.pow(cellY - centerY, 2)
          );

          if (distFromCenter < 200) continue;

          // Random offset within cell
          const offsetX = (Math.random() - 0.5) * 60;
          const offsetY = (Math.random() - 0.5) * 60;

          // Lower probability = fewer nodes (was 0.55, now 0.35)
          if (Math.random() > 0.35) continue;

          const colorIndex = Math.floor(Math.random() * logoColors.length);
          const size = 2 + Math.random() * 3;

          nodesRef.current.push({
            x: cellX + offsetX,
            y: cellY + offsetY,
            radius: size,
            color: logoColors[colorIndex],
            scale: 0,
            targetScale: 1,
            delay: Math.random() * 0.8
          });
        }
      }
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNodes();
    };

    const drawAnimation = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = (Date.now() - startTimeRef.current) * 0.001;
      const nodes = nodesRef.current;

      // Animate nodes in
      nodes.forEach(node => {
        const elapsed = time - node.delay;
        if (elapsed > 0) {
          node.scale += (node.targetScale - node.scale) * 0.06;
        }
      });

      // Draw connections between nearby nodes
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.scale < 0.1) continue;

        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          if (other.scale < 0.1) continue;

          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const opacity = (1 - dist / 120) * 0.12 * Math.min(node.scale, other.scale);

            const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y);
            gradient.addColorStop(0, `rgba(${node.color.r}, ${node.color.g}, ${node.color.b}, ${opacity})`);
            gradient.addColorStop(1, `rgba(${other.color.r}, ${other.color.g}, ${other.color.b}, ${opacity})`);

            ctx.beginPath();
            ctx.strokeStyle = gradient;
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
      }

      // Draw network nodes (small, solid)
      nodes.forEach(node => {
        const r = node.radius * node.scale;
        if (r < 0.5) return;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${node.color.r}, ${node.color.g}, ${node.color.b}, ${0.75 * node.scale})`;
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(drawAnimation);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    drawAnimation();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
};

export default LogoIntroCanvas;
