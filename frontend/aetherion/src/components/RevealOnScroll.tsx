"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  delay?: number;
}

export default function RevealOnScroll({ children, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Chỉ khi nào cuộn chuột lọt vào màn hình thì mới kích hoạt
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target); // Hiện rồi thì tắt theo dõi để tiết kiệm tài nguyên
        }
      },
      // Kích hoạt khi phần tử nhô lên màn hình được 10%
      { threshold: 0.3 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-wrapper ${isVisible ? "is-visible" : ""}`}
      style={{ transitionDelay: `${delay}ms`, height: "100%", width: "100%" }}
    >
      {children}
    </div>
  );
}
