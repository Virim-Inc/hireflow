import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface MatchBarProps {
  label: string;
  value: number; // 0–100
  animate?: boolean;
  delay?: number;
  showValue?: boolean;
}

function getColor(v: number) {
  if (v >= 85) return 'var(--hf-score-high)';
  if (v >= 65) return 'var(--hf-score-mid)';
  return 'var(--hf-score-low)';
}

export function MatchBar({ label, value, animate = true, delay = 0, showValue = true }: MatchBarProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  const valRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fill = fillRef.current;
    const valEl = valRef.current;
    if (!fill) return;
    const color = getColor(value);
    fill.style.background = `linear-gradient(90deg, ${color}cc, ${color})`;

    if (animate) {
      gsap.fromTo(fill, { width: '0%' }, { width: `${value}%`, duration: 1.1, delay, ease: 'power3.out' });
      if (valEl) {
        const obj = { v: 0 };
        gsap.to(obj, { v: value, duration: 1.1, delay, ease: 'power3.out',
          onUpdate() { if (valEl) valEl.textContent = `${Math.round(obj.v)}%`; }
        });
      }
    } else {
      fill.style.width = `${value}%`;
      if (valEl) valEl.textContent = `${value}%`;
    }
  }, [value, animate, delay]);

  return (
    <div className="match-bar-row">
      <span className="match-bar-label">{label}</span>
      <div className="match-bar-track">
        <div ref={fillRef} className="match-bar-fill" style={{ width: 0 }} />
      </div>
      {showValue && <span ref={valRef} className="match-bar-val">0%</span>}
    </div>
  );
}
