import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';

import type { JsonCmdLookUp } from '@/pages/Index';

interface JoystickData {
  x: number; // -1 to 1
  y: number; // -1 to 1
  distance: number; // 0 to 1
  angle: number; // 0 to 360 degrees
}

interface VirtualJoystickProps {
  onMove?: (data: JoystickData) => void;
  size?: number;
  jsonCmdLookUp?: JsonCmdLookUp | null;
}

/**
 * Calculates left and right wheel speeds (as percentages, -100 to 100)
 * for a differential (tank-style) steering vehicle based on joystick input.
 *
 * @param angle - Joystick angle in degrees (0-360, 0=right, 90=up, 180=left, 270=down)
 * @param distance - Joystick distance from center (0 to 1)
 * @returns {{ left: number; right: number }} Wheel speeds as percentages (-100 to 100)
 */
const calculateDifferentialDrive = (angle: number, distance: number): { left: number; right: number } => {
  if (distance === 0) return { left: 0, right: 0 };

  const rad = angle * (Math.PI / 180);
  // x = left/right component, y = forward/backward component
  const x = Math.cos(rad) * distance;
  const y = Math.sin(rad) * distance;

  // Differential mixing: forward/back ± turn
  let left = y + x;
  let right = y - x;

  // Clamp to -1..1 range then scale to percentage
  const max = Math.max(Math.abs(left), Math.abs(right), 1);
  left = Math.round((left / max) * distance * 100);
  right = Math.round((right / max) * distance * 100);

  return { left, right };
};

export const VirtualJoystick = ({ onMove, size = 150, jsonCmdLookUp }: VirtualJoystickProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const knobSize = size * 0.3;
  const maxDistance = (size - knobSize) / 2;

  const updateJoystick = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let x = deltaX;
    let y = deltaY;

    if (distance > maxDistance) {
      const ratio = maxDistance / distance;
      x = deltaX * ratio;
      y = deltaY * ratio;
    }

    setKnobPosition({ x, y });

    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const angle = Math.atan2(-y, x) * (180 / Math.PI);
    const normalizedAngle = angle < 0 ? angle + 360 : angle;

    const joystickData: JoystickData = {
      x: x / maxDistance,
      y: -y / maxDistance, // Invert Y for intuitive control
      distance: normalizedDistance,
      angle: normalizedAngle,
    };

    onMove?.(joystickData);
  }, [maxDistance, onMove]);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    updateJoystick(clientX, clientY);
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(() => {
      updateJoystick(clientX, clientY);
    });
  }, [isDragging, updateJoystick]);

  const handleEnd = () => {
    setIsDragging(false);
    setKnobPosition({ x: 0, y: 0 });
    onMove?.({ x: 0, y: 0, distance: 0, angle: 0 });
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, []);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <Card className="p-4">
      <div className="text-center mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Movement Control</h3>
      </div>
      <div
        ref={containerRef}
        className="relative mx-auto cursor-grab active:cursor-grabbing select-none"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-border bg-gradient-to-br from-muted to-background"
          style={{
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 0 20px rgba(0,195,255,0.1)',
          }}
        />
        
        {/* Center dot */}
        <div
          className="absolute w-1 h-1 bg-primary rounded-full"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
        
        {/* Knob */}
        <div
          className={`absolute rounded-full bg-primary transition-all duration-75 ${
            isDragging ? 'scale-110' : 'scale-100'
          }`}
          style={{
            width: knobSize,
            height: knobSize,
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${knobPosition.x}px, ${knobPosition.y}px)`,
            boxShadow: 'var(--shadow-glow), 0 2px 8px rgba(0,0,0,0.4)',
          }}
        />
      </div>
    </Card>
  );
};