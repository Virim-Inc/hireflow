import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface AnimatedCountProps {
  value: number;
  decimals?: number;
  suffix?: string;
}

function formatValue(value: number, decimals: number, suffix: string): string {
  return `${value.toFixed(decimals)}${suffix}`;
}

export function AnimatedCount({ value, decimals = 0, suffix = '' }: AnimatedCountProps) {
  const [displayValue, setDisplayValue] = useState(() => formatValue(value, decimals, suffix));
  const tweenRef = useRef<{ current: number }>({ current: 0 });

  useEffect(() => {
    tweenRef.current.current = 0;
    const animation = gsap.to(tweenRef.current, {
      current: value,
      duration: 0.85,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayValue(formatValue(tweenRef.current.current, decimals, suffix));
      },
    });

    return () => {
      animation.kill();
    };
  }, [value, decimals, suffix]);

  return <>{displayValue}</>;
}
