import React, { useState, useEffect, useRef } from 'react';

interface FlipContainerProps {
  isFlipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
}

export function FlipContainer({ isFlipped, front, back }: FlipContainerProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | string>('auto');

  useEffect(() => {
    const updateHeight = () => {
      const activeEl = isFlipped ? backRef.current : frontRef.current;
      if (activeEl) {
        setHeight(activeEl.offsetHeight);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    const currentFront = frontRef.current;
    const currentBack = backRef.current;

    if (currentFront) observer.observe(currentFront);
    if (currentBack) observer.observe(currentBack);

    return () => {
      observer.disconnect();
    };
  }, [isFlipped]);

  return (
    <div 
      className={`dash-flip-container ${isFlipped ? 'is-flipped' : ''}`}
      style={{ height, transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <div className="dash-flip-inner">
        <div 
          ref={frontRef} 
          className="dash-card-face dash-card-front" 
          style={{ 
            pointerEvents: isFlipped ? 'none' : 'auto',
            visibility: isFlipped ? 'hidden' : 'visible',
            transition: `visibility 0s ${isFlipped ? '0.4s' : '0s'}`
          }}
        >
          {front}
        </div>
        <div 
          ref={backRef} 
          className="dash-card-face dash-card-back" 
          style={{ 
            pointerEvents: isFlipped ? 'auto' : 'none',
            visibility: isFlipped ? 'visible' : 'hidden',
            transition: `visibility 0s ${isFlipped ? '0s' : '0.4s'}`
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}
