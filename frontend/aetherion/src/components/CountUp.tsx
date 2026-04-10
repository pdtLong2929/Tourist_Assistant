// src/components/CounterUp.tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface CounterUpProps {
  end: number;
  suffix?: string;
}

export default function CountUp({ end, suffix = "" }: CounterUpProps) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 },
    );
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const duration = 1500; // Nhảy trong 2 giây
    const startTime = performance.now();

    const animateCount = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      setCount(Math.floor(start + progress * (end - start)));
      if (progress < 1) requestAnimationFrame(animateCount);
    };
    requestAnimationFrame(animateCount);
  }, [isVisible, end]);

  return (
    <span ref={elementRef}>
      {count}
      {suffix}
    </span>
  );
}
