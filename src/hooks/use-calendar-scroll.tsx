import { useState, useRef, useEffect } from 'react';
import { calculateVelocity } from '@/utils/scrollUtils';

interface ScrollState {
  isDragging: boolean;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
  lastTime: number;
  lastPoint: { x: number; y: number };
}

export const useCalendarScroll = (scrollContainerRef: React.RefObject<HTMLDivElement>) => {
  const [scrollState, setScrollState] = useState<ScrollState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    lastTime: 0,
    lastPoint: { x: 0, y: 0 },
  });
  
  const animationFrameRef = useRef<number>();
  const currentVelocityRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (scrollState.isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scrollState.isDragging]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const scrollContainer = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;
    
    setScrollState({
      isDragging: true,
      startX: e.pageX,
      startY: e.pageY,
      scrollLeft: scrollContainer.scrollLeft,
      scrollTop: scrollContainer.scrollTop,
      lastTime: Date.now(),
      lastPoint: { x: e.pageX, y: e.pageY },
    });
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleGlobalMouseUp = () => {
    if (!scrollState.isDragging) return;
    
    setScrollState(prev => ({ ...prev, isDragging: false }));
    
    const scrollContainer = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    let currentVelocity = { ...currentVelocityRef.current };
    
    const animate = () => {
      currentVelocity = {
        x: currentVelocity.x * 0.9,
        y: currentVelocity.y * 0.9,
      };

      scrollContainer.scrollLeft = scrollContainer.scrollLeft + currentVelocity.x;
      scrollContainer.scrollTop = scrollContainer.scrollTop + currentVelocity.y;

      if (Math.abs(currentVelocity.x) > 0.01 || Math.abs(currentVelocity.y) > 0.01) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        console.log("Animation stopped - velocity too low");
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    animate()
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    const scrollContainer = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollState.isDragging || !scrollContainer) return;
    
    e.preventDefault();
    const deltaX = e.pageX - scrollState.startX;
    const deltaY = e.pageY - scrollState.startY;
    
    const currentTime = Date.now();
    const timeElapsed = currentTime - scrollState.lastTime;
    
    if (timeElapsed > 0) {
      currentVelocityRef.current = {
        x: calculateVelocity(e.pageX, scrollState.lastPoint.x, timeElapsed),
        y: calculateVelocity(e.pageY, scrollState.lastPoint.y, timeElapsed),
      };
    }
    
    setScrollState(prev => ({
      ...prev,
      lastTime: currentTime,
      lastPoint: { x: e.pageX, y: e.pageY },
    }));

    scrollContainer.scrollLeft = scrollState.scrollLeft - deltaX;
    scrollContainer.scrollTop = scrollState.scrollTop - deltaY;
  };

  return {
    handleMouseDown,
    isDragging: scrollState.isDragging,
  };
};