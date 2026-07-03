import { useEffect, useRef } from "react";

interface AnimatedBackgroundProps {
  /** Number of floating gradient orbs */
  orbCount?: number;
  /** Whether to show the subtle grid pattern */
  showGrid?: boolean;
  /** Number of floating particles */
  particleCount?: number;
  /** Additional CSS class names */
  className?: string;
  /** Enable cursor-repel effect on shapes */
  cursorRepel?: boolean;
}

interface FloatingShape {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  size: number;
  baseOpacity: number;
  repelRadius: number;
  repelStrength: number;
  returnSpeed: number;
  driftSpeed: number;
  driftAngle: number;
}

/**
 * Reusable animated background component with cursor-repel physics.
 * Floating shapes drift peacefully; the cursor pushes them away.
 */
export function AnimatedBackground({
  orbCount = 4,
  showGrid = true,
  particleCount = 30,
  className = "",
  cursorRepel = true,
}: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<FloatingShape[]>([]);
  const orbsRef = useRef<HTMLDivElement[]>([]);
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);

  /* ── cursor tracking ─────────────────────────────────────────── */
  useEffect(() => {
    const glow = cursorGlowRef.current;
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (glow) {
        glow.style.left = `${e.clientX}px`;
        glow.style.top = `${e.clientY}px`;
        glow.style.opacity = "1";
      }
    };
    const onLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
      if (glow) glow.style.opacity = "0";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [cursorRepel]);

  /* ── floating shapes physics loop ───────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    // Collect all shape elements
    const els = Array.from(
      container.querySelectorAll<HTMLDivElement>("[data-repel-shape]")
    );

    shapesRef.current = els.map((el) => {
      const size = parseFloat(el.dataset.repelSize || "60");
      const bx = Math.random() * W;
      const by = Math.random() * H;
      el.style.left = `${bx}px`;
      el.style.top = `${by}px`;
      return {
        el,
        x: bx,
        y: by,
        vx: 0,
        vy: 0,
        baseX: bx,
        baseY: by,
        size,
        baseOpacity: parseFloat(el.dataset.repelOpacity || "0.6"),
        repelRadius: parseFloat(el.dataset.repelRadius || "160"),
        repelStrength: parseFloat(el.dataset.repelStrength || "8"),
        returnSpeed: 0.04 + Math.random() * 0.03,
        driftSpeed: 0.15 + Math.random() * 0.25,
        driftAngle: Math.random() * Math.PI * 2,
      };
    });

    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16, 3); // cap delta
      last = now;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const s of shapesRef.current) {
        // Slow organic drift of the base position
        s.driftAngle += 0.003 * dt;
        s.baseX += Math.cos(s.driftAngle) * s.driftSpeed * dt;
        s.baseY += Math.sin(s.driftAngle) * s.driftSpeed * dt;

        // Wrap base position
        if (s.baseX < -s.size) s.baseX = W + s.size;
        if (s.baseX > W + s.size) s.baseX = -s.size;
        if (s.baseY < -s.size) s.baseY = H + s.size;
        if (s.baseY > H + s.size) s.baseY = -s.size;

        // Cursor repulsion
        const dx = s.x - mx;
        const dy = s.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < s.repelRadius && dist > 0) {
          const force = (1 - dist / s.repelRadius) * s.repelStrength;
          s.vx += (dx / dist) * force * dt;
          s.vy += (dy / dist) * force * dt;
        }

        // Spring return to base
        s.vx += (s.baseX - s.x) * s.returnSpeed * dt;
        s.vy += (s.baseY - s.y) * s.returnSpeed * dt;

        // Damping
        s.vx *= 0.88;
        s.vy *= 0.88;

        s.x += s.vx;
        s.y += s.vy;

        // Apply
        s.el.style.transform = `translate(${s.x - s.baseX}px, ${s.y - s.baseY}px)`;
        s.el.style.left = `${s.baseX}px`;
        s.el.style.top = `${s.baseY}px`;

        // Dim when near cursor
        if (dist < s.repelRadius) {
          const t = dist / s.repelRadius;
          s.el.style.opacity = `${s.baseOpacity * (0.3 + 0.7 * t)}`;
        } else {
          s.el.style.opacity = `${s.baseOpacity}`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [orbCount, particleCount, cursorRepel]);

  /* ── slow GSAP-free orb drift (CSS keyframes via inline style) ─ */
  useEffect(() => {
    const orbs = orbsRef.current;
    orbs.forEach((orb, i) => {
      if (!orb) return;
      const bx = 10 + Math.random() * 80;
      const by = 10 + Math.random() * 80;
      orb.style.left = `${bx}%`;
      orb.style.top = `${by}%`;
      orb.style.animationDelay = `${i * -3.2}s`;
      orb.style.animationDuration = `${14 + i * 3}s`;
    });
  }, [orbCount]);

  // Orb gradient colors — blue palette
  const orbColors = [
    "radial-gradient(circle, oklch(0.65 0.20 250 / 0.40), transparent 70%)",
    "radial-gradient(circle, oklch(0.55 0.20 255 / 0.35), transparent 70%)",
    "radial-gradient(circle, oklch(0.80 0.14 250 / 0.32), transparent 70%)",
    "radial-gradient(circle, oklch(0.50 0.18 255 / 0.35), transparent 70%)",
    "radial-gradient(circle, oklch(0.60 0.18 250 / 0.30), transparent 70%)",
    "radial-gradient(circle, oklch(0.85 0.10 250 / 0.28), transparent 70%)",
  ];

  // Repellable shape definitions — blue theme
  const shapeConfigs = [
    // Large translucent circles
    { type: "circle", size: 80, color: "oklch(0.65 0.20 250 / 0.10)", border: "oklch(0.65 0.20 250 / 0.35)", repelRadius: 180, repelStrength: 9, opacity: 0.75 },
    { type: "circle", size: 55, color: "oklch(0.55 0.20 255 / 0.08)", border: "oklch(0.55 0.20 255 / 0.40)", repelRadius: 140, repelStrength: 10, opacity: 0.7 },
    { type: "circle", size: 40, color: "transparent", border: "oklch(0.80 0.14 250 / 0.45)", repelRadius: 130, repelStrength: 11, opacity: 0.65 },
    { type: "circle", size: 65, color: "oklch(0.50 0.18 255 / 0.07)", border: "oklch(0.50 0.18 255 / 0.35)", repelRadius: 160, repelStrength: 8, opacity: 0.7 },
    // Diamonds (rotated squares)
    { type: "diamond", size: 48, color: "oklch(0.60 0.18 250 / 0.08)", border: "oklch(0.60 0.18 250 / 0.45)", repelRadius: 150, repelStrength: 12, opacity: 0.65 },
    { type: "diamond", size: 30, color: "transparent", border: "oklch(0.85 0.10 250 / 0.50)", repelRadius: 120, repelStrength: 13, opacity: 0.6 },
    { type: "diamond", size: 62, color: "oklch(0.65 0.20 250 / 0.05)", border: "oklch(0.65 0.20 250 / 0.30)", repelRadius: 170, repelStrength: 7, opacity: 0.55 },
    // Glowing dots
    { type: "dot", size: 8, color: "oklch(0.65 0.20 250 / 0.85)", border: "none", repelRadius: 100, repelStrength: 14, opacity: 0.85 },
    { type: "dot", size: 6, color: "oklch(0.80 0.14 250 / 0.80)", border: "none", repelRadius: 90, repelStrength: 15, opacity: 0.8 },
    { type: "dot", size: 10, color: "oklch(0.55 0.20 255 / 0.75)", border: "none", repelRadius: 110, repelStrength: 13, opacity: 0.8 },
    { type: "dot", size: 5, color: "oklch(0.60 0.18 250 / 0.85)", border: "none", repelRadius: 85, repelStrength: 16, opacity: 0.75 },
    { type: "dot", size: 7, color: "oklch(0.85 0.10 250 / 0.80)", border: "none", repelRadius: 95, repelStrength: 14, opacity: 0.8 },
    // Rings (large hollow circles)
    { type: "ring", size: 120, color: "transparent", border: "oklch(0.65 0.20 250 / 0.18)", repelRadius: 200, repelStrength: 6, opacity: 0.5 },
    { type: "ring", size: 90, color: "transparent", border: "oklch(0.80 0.14 250 / 0.15)", repelRadius: 180, repelStrength: 7, opacity: 0.45 },
    { type: "ring", size: 150, color: "transparent", border: "oklch(0.50 0.18 255 / 0.12)", repelRadius: 220, repelStrength: 5, opacity: 0.4 },
  ];

  return (
    <div
      ref={containerRef}
      className={`animated-bg ${className}`}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      {/* Base gradient layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, transparent 0%, oklch(0.14 0.015 250 / 0.3) 50%, transparent 100%)",
        }}
      />

      {/* Slow-drifting background orbs (CSS animation) */}
      {Array.from({ length: orbCount }).map((_, i) => (
        <div
          key={`orb-${i}`}
          ref={(el) => {
            if (el) orbsRef.current[i] = el;
          }}
          className="animated-bg-orb"
          style={{
            position: "absolute",
            width: `${280 + i * 90}px`,
            height: `${280 + i * 90}px`,
            borderRadius: "50%",
            background: orbColors[i % orbColors.length],
            filter: "blur(70px)",
            willChange: "transform",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Grid pattern overlay */}
      {showGrid && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, oklch(1 0 0 / 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, oklch(1 0 0 / 0.03) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />
      )}

      {/* ── Cursor-repellable floating shapes ── */}
      {shapeConfigs.map((cfg, i) => {
        const isCircleOrRing = cfg.type === "circle" || cfg.type === "ring";
        const isDiamond = cfg.type === "diamond";
        const isDot = cfg.type === "dot";

        const borderWidth = isDot ? 0 : cfg.type === "ring" ? 1.5 : 1;

        return (
          <div
            key={`shape-${i}`}
            data-repel-shape
            data-repel-size={cfg.size}
            data-repel-opacity={cfg.opacity}
            data-repel-radius={cfg.repelRadius}
            data-repel-strength={cfg.repelStrength}
            style={{
              position: "absolute",
              width: `${cfg.size}px`,
              height: `${cfg.size}px`,
              borderRadius: isCircleOrRing || isDot ? "50%" : "0",
              background: cfg.color,
              border:
                cfg.border !== "none"
                  ? `${borderWidth}px solid ${cfg.border}`
                  : "none",
              transform: isDiamond ? "rotate(45deg)" : undefined,
              opacity: cfg.opacity,
              willChange: "transform, opacity, left, top",
              boxShadow: isDot
                ? `0 0 ${cfg.size * 2}px ${cfg.color}, 0 0 ${cfg.size * 4}px ${cfg.color.replace("0.9", "0.4").replace("0.85", "0.3").replace("0.8", "0.3").replace("0.75", "0.25")}`
                : cfg.type === "ring"
                  ? `0 0 20px ${cfg.border.replace("0.2", "0.08").replace("0.18", "0.07").replace("0.15", "0.06")}`
                  : undefined,
              backdropFilter: isCircleOrRing && !isDot ? "blur(2px)" : undefined,
            }}
          />
        );
      })}

      {/* Small floating particles */}
      {Array.from({ length: particleCount }).map((_, i) => (
        <div
          key={`particle-${i}`}
          data-repel-shape
          data-repel-size={3}
          data-repel-opacity={0.5 + Math.random() * 0.35}
          data-repel-radius={80}
          data-repel-strength={18}
          style={{
            position: "absolute",
            width: `${1.5 + Math.random() * 2.5}px`,
            height: `${1.5 + Math.random() * 2.5}px`,
            borderRadius: "50%",
            background:
              i % 4 === 0
                ? "oklch(0.65 0.20 250 / 0.65)"
                : i % 4 === 1
                  ? "oklch(0.985 0 0 / 0.5)"
                  : i % 4 === 2
                    ? "oklch(0.80 0.14 250 / 0.60)"
                    : "oklch(0.55 0.20 255 / 0.55)",
            willChange: "transform, opacity",
          }}
        />
      ))}

      {/* Noise texture overlay for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 35%, oklch(0.10 0.015 250 / 0.8) 100%)",
        }}
      />

      {/* Cursor glow follower */}
      <div
        ref={cursorGlowRef}
        className="animated-bg-cursor-glow"
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, oklch(0.65 0.20 250 / 0.08) 0%, oklch(0.55 0.20 255 / 0.03) 50%, transparent 70%)",
          pointerEvents: "none",
          transform: "translate(-50%, -50%)",
          willChange: "left, top, opacity",
          transition: "left 0.08s ease-out, top 0.08s ease-out, opacity 0.4s ease",
          opacity: 0,
          left: "-9999px",
          top: "-9999px",
        }}
      />
    </div>
  );
}
