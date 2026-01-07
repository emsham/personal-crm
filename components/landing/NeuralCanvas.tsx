import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface LogoNode {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: { r: number; g: number; b: number };
  phase: number;
}

interface NeuralCanvasProps {
  className?: string;
}

const NeuralCanvas: React.FC<NeuralCanvasProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const nodesRef = useRef<Node[]>([]);
  const logoNodesRef = useRef<LogoNode[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const logoColors = {
      cyan: { r: 56, g: 189, b: 248 },
      blue: { r: 129, g: 140, b: 248 },
      purple: { r: 167, g: 139, b: 250 },
      gradient: { r: 99, g: 179, b: 237 },
    };
    const colorKeys = ['cyan', 'blue', 'purple', 'gradient'] as const;

    const initNodes = () => {
      nodesRef.current = [];
      logoNodesRef.current = [];
      const nodeCount = Math.floor((canvas.width * canvas.height) / 25000);

      for (let i = 0; i < nodeCount; i++) {
        nodesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
        });
      }

      const headerHeight = canvas.height * 0.4;
      const positions = [
        { x: canvas.width * 0.15, y: headerHeight * 0.4 },
        { x: canvas.width * 0.35, y: headerHeight * 0.35 },
        { x: canvas.width * 0.65, y: headerHeight * 0.3 },
        { x: canvas.width * 0.85, y: headerHeight * 0.45 },
      ];

      positions.forEach((pos, i) => {
        logoNodesRef.current.push({
          x: pos.x,
          y: pos.y,
          baseX: pos.x,
          baseY: pos.y,
          radius: 12 + Math.random() * 6,
          color: logoColors[colorKeys[i]],
          phase: Math.random() * Math.PI * 2,
        });
      });
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNodes();
    };

    const drawNetwork = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = Date.now() * 0.001;
      const nodes = nodesRef.current;
      const logoNodes = logoNodesRef.current;

      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        nodes.forEach((other, j) => {
          if (i === j) return;
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const opacity = (1 - dist / 150) * 0.3;
            const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y);
            gradient.addColorStop(0, `rgba(99, 179, 237, ${opacity})`);
            gradient.addColorStop(1, `rgba(167, 139, 250, ${opacity})`);

            ctx.beginPath();
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        });

        logoNodes.forEach((logoNode) => {
          const dx = logoNode.x - node.x;
          const dy = logoNode.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            const opacity = (1 - dist / 180) * 0.35;
            const c = logoNode.color;
            const gradient = ctx.createLinearGradient(node.x, node.y, logoNode.x, logoNode.y);
            gradient.addColorStop(0, `rgba(99, 179, 237, ${opacity * 0.5})`);
            gradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, ${opacity})`);

            ctx.beginPath();
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1.5;
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(logoNode.x, logoNode.y);
            ctx.stroke();
          }
        });

        const nodeGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 2);
        nodeGradient.addColorStop(0, 'rgba(99, 179, 237, 0.8)');
        nodeGradient.addColorStop(1, 'rgba(167, 139, 250, 0.4)');

        ctx.beginPath();
        ctx.fillStyle = nodeGradient;
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      logoNodes.forEach((node) => {
        node.x = node.baseX + Math.sin(time * 0.3 + node.phase) * 20;
        node.y = node.baseY + Math.cos(time * 0.25 + node.phase) * 15;

        const c = node.color;
        const pulse = Math.sin(time * 1.2 + node.phase) * 0.1 + 1;
        const r = node.radius * pulse;

        const glowGradient = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, r * 2.5);
        glowGradient.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0.25)`);
        glowGradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

        ctx.beginPath();
        ctx.fillStyle = glowGradient;
        ctx.arc(node.x, node.y, r * 2.5, 0, Math.PI * 2);
        ctx.fill();

        const mainGradient = ctx.createRadialGradient(
          node.x - r * 0.3,
          node.y - r * 0.3,
          0,
          node.x,
          node.y,
          r * 1.1
        );
        mainGradient.addColorStop(
          0,
          `rgba(${Math.min(255, c.r + 70)}, ${Math.min(255, c.g + 70)}, ${Math.min(255, c.b + 70)}, 1)`
        );
        mainGradient.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, 1)`);
        mainGradient.addColorStop(
          1,
          `rgba(${Math.max(0, c.r - 30)}, ${Math.max(0, c.g - 30)}, ${Math.max(0, c.b - 30)}, 0.95)`
        );

        ctx.beginPath();
        ctx.fillStyle = mainGradient;
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fill();

        const hlGradient = ctx.createRadialGradient(
          node.x - r * 0.25,
          node.y - r * 0.25,
          0,
          node.x - r * 0.15,
          node.y - r * 0.15,
          r * 0.4
        );
        hlGradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        hlGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.fillStyle = hlGradient;
        ctx.arc(node.x - r * 0.15, node.y - r * 0.15, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      logoNodes.forEach((node, i) => {
        logoNodes.forEach((other, j) => {
          if (i >= j) return;
          const c1 = node.color;
          const c2 = other.color;

          const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y);
          gradient.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.15)`);
          gradient.addColorStop(1, `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.15)`);

          ctx.beginPath();
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.5;
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        });
      });

      animationRef.current = requestAnimationFrame(drawNetwork);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    drawNetwork();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
};

export default NeuralCanvas;
