import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface ScoreRingProps {
  score: number; // 0–100
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
  delay?: number;
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'var(--hf-score-high)';
  if (score >= 65) return 'var(--hf-score-mid)';
  return 'var(--hf-score-low)';
}

export function ScoreRing({ score, size = 72, strokeWidth = 6, animate = true, delay = 0 }: ScoreRingProps) {
  const progressRef = useRef<SVGCircleElement>(null);
  const scoreTextRef = useRef<SVGTextElement>(null);

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  const color = getScoreColor(score);

  useEffect(() => {
    const el = progressRef.current;
    const textEl = scoreTextRef.current;
    if (!el || !textEl) return;

    const targetOffset = circumference - (score / 100) * circumference;

    if (animate) {
      // Start at full offset (empty)
      gsap.set(el, { strokeDashoffset: circumference });
      const obj = { val: 0 };
      gsap.to(obj, {
        val: score,
        duration: 1.4,
        delay,
        ease: 'power3.out',
        onUpdate() {
          const off = circumference - (obj.val / 100) * circumference;
          el.style.strokeDashoffset = String(off);
          textEl.textContent = Math.round(obj.val).toString();
        },
      });
    } else {
      el.style.strokeDashoffset = String(targetOffset);
      textEl.textContent = score.toString();
    }
  }, [score, circumference, animate, delay]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="score-ring" aria-label={`Score ${score}`}>
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke="oklch(1 0 0 / 0.06)"
        strokeWidth={strokeWidth}
      />
      {/* Glow filter */}
      <defs>
        <filter id={`glow-${score}-${size}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Progress arc */}
      <circle
        ref={progressRef}
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        filter={`url(#glow-${score}-${size})`}
        style={{ transition: 'stroke 0.3s ease' }}
      />
      {/* Score number */}
      <text
        ref={scoreTextRef}
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={size * 0.22}
        fontWeight="700"
        fontFamily="'Geist Variable', sans-serif"
      >
        0
      </text>
    </svg>
  );
}
