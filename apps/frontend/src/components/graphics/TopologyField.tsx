import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
  opacityDir: number;
}

interface TopologyFieldProps {
  className?: string;
  nodeCount?: number;
  opacity?: number;
  color?: "amber" | "steel" | "mixed";
}

export function TopologyField({
  className = "",
  nodeCount = 28,
  opacity = 0.18,
  color = "mixed",
}: TopologyFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener("resize", resize);

    // Init nodes
    const nodes: Node[] = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 1,
      opacity: Math.random(),
      opacityDir: Math.random() > 0.5 ? 1 : -1,
    }));
    nodesRef.current = nodes;

    const maxDist = 160;

    function getNodeColor(i: number): string {
      if (color === "amber") return `rgba(212,168,67,${opacity})`;
      if (color === "steel") return `rgba(107,127,163,${opacity})`;
      return i % 3 === 0
        ? `rgba(212,168,67,${opacity})`
        : `rgba(107,127,163,${opacity * 0.7})`;
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Update nodes
      for (const node of nodesRef.current) {
        node.x += node.vx;
        node.y += node.vy;
        node.opacity += node.opacityDir * 0.004;

        if (node.opacity >= 1) node.opacityDir = -1;
        if (node.opacity <= 0.1) node.opacityDir = 1;

        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;
        node.x = Math.max(0, Math.min(w, node.x));
        node.y = Math.max(0, Math.min(h, node.y));
      }

      // Draw edges
      for (let i = 0; i < nodesRef.current.length; i++) {
        for (let j = i + 1; j < nodesRef.current.length; j++) {
          const a = nodesRef.current[i];
          const b = nodesRef.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * opacity * 0.4;
            const edgeColor = (i + j) % 3 === 0
              ? `rgba(212,168,67,${alpha})`
              : `rgba(107,127,163,${alpha * 0.6})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = edgeColor;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      nodesRef.current.forEach((node, i) => {
        const nodeOpacity = node.opacity * opacity;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = getNodeColor(i).replace(String(opacity), String(nodeOpacity));
        ctx.fill();
      });

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [nodeCount, opacity, color]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ mixBlendMode: "screen" }}
    />
  );
}
