import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  delay?: number;
}

const RANK_CONFIG: Record<number, { color: string; glow: string; label: string }> = {
  1: { color: 'var(--hf-gold)', glow: 'var(--hf-gold-glow)', label: '1st' },
  2: { color: 'var(--hf-silver)', glow: 'var(--hf-silver-glow)', label: '2nd' },
  3: { color: 'var(--hf-bronze)', glow: 'var(--hf-bronze-glow)', label: '3rd' },
};

const SIZE_MAP = { sm: 28, md: 36, lg: 48 };
const FONT_MAP = { sm: '10px', md: '12px', lg: '16px' };

export function RankBadge({ rank, size = 'md', animate = true, delay = 0 }: RankBadgeProps) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const config = RANK_CONFIG[rank];
  const px = SIZE_MAP[size];
  const font = FONT_MAP[size];

  useEffect(() => {
    if (!animate || !badgeRef.current) return;
    gsap.fromTo(badgeRef.current,
      { scale: 0, rotate: -20, opacity: 0 },
      {
        scale: 1, rotate: 0, opacity: 1,
        duration: 0.55,
        delay,
        ease: 'back.out(1.8)',
      }
    );
  }, [animate, delay]);

  if (!config) {
    // Generic rank badge for rank 4+
    return (
      <div
        ref={badgeRef}
        style={{
          width: px, height: px,
          borderRadius: '50%',
          background: 'var(--hf-surface-3)',
          border: '1px solid var(--hf-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: font, fontWeight: 700,
          color: 'var(--hf-text-secondary)',
          opacity: animate ? 0 : 1,
          flexShrink: 0,
        }}
      >
        #{rank}
      </div>
    );
  }

  return (
    <div
      ref={badgeRef}
      style={{
        width: px, height: px,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, oklch(1 0 0 / 0.2), transparent), ${config.color}`,
        boxShadow: `0 0 12px ${config.glow}, 0 2px 8px oklch(0 0 0 / 0.4)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: font, fontWeight: 800,
        color: 'oklch(0.10 0 0)',
        opacity: animate ? 0 : 1,
        flexShrink: 0,
        position: 'relative',
      }}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </div>
  );
}
