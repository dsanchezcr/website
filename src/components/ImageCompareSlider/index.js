import React, { useState, useRef, useCallback } from 'react';
import styles from './ImageCompareSlider.module.css';

export default function ImageCompareSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = 'Before',
  afterAlt = 'After',
  beforeLabel = 'Before',
  afterLabel = 'After',
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = useCallback((e) => {
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="slider"
      aria-label="Image comparison slider"
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - 2));
        if (e.key === 'ArrowRight') setPosition((p) => Math.min(100, p + 2));
      }}
    >
      {/* After image (full width, underneath) */}
      <img src={afterSrc} alt={afterAlt} className={styles.image} draggable={false} />

      {/* Before image (clipped) */}
      <div className={styles.beforeWrapper} style={{ width: `${position}%` }}>
        <img src={beforeSrc} alt={beforeAlt} className={styles.image} draggable={false} />
      </div>

      {/* Labels */}
      <span className={styles.labelBefore} style={{ opacity: position > 15 ? 1 : 0 }}>
        {beforeLabel}
      </span>
      <span className={styles.labelAfter} style={{ opacity: position < 85 ? 1 : 0 }}>
        {afterLabel}
      </span>

      {/* Slider handle */}
      <div className={styles.handle} style={{ left: `${position}%` }}>
        <div className={styles.handleLine} />
        <div className={styles.handleGrip}>
          <span aria-hidden="true">◄ ►</span>
        </div>
        <div className={styles.handleLine} />
      </div>
    </div>
  );
}
