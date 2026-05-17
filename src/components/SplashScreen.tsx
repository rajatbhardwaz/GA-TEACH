"use client";

import { useEffect, useRef, useState } from "react";
import lottie, { AnimationItem } from "lottie-web";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: "/splash-screen.json",
    });

    animRef.current = anim;

    // When the animation completes, start fade-out then call onFinish
    anim.addEventListener("complete", () => {
      setFadeOut(true);
      setTimeout(() => {
        onFinish();
      }, 600); // match the CSS fade-out duration
    });

    // Safety timeout: if animation takes too long, force finish after 6s
    const safetyTimer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => onFinish(), 600);
    }, 6000);

    return () => {
      clearTimeout(safetyTimer);
      anim.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        overflow: "hidden",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 600ms ease-out",
      }}
    >
      {/*
        The container is scaled up (~120%) so edge jitter / water artifacts
        are pushed outside the visible viewport.
      */}
      <div
        ref={containerRef}
        style={{
          width: "120vw",
          height: "120vh",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
