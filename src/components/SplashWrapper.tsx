"use client";

import { useState, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Check if splash was already shown this session
    const alreadyShown = sessionStorage.getItem("splash_shown");
    if (alreadyShown) {
      setShowSplash(false);
    }
    setHasMounted(true);
  }, []);

  const handleSplashFinish = () => {
    sessionStorage.setItem("splash_shown", "true");
    setShowSplash(false);
  };

  // Don't render anything until mounted (avoid hydration mismatch)
  if (!hasMounted) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000000",
          zIndex: 99999,
        }}
      />
    );
  }

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <div
        style={{
          opacity: showSplash ? 0 : 1,
          transition: "opacity 400ms ease-in",
        }}
      >
        {children}
      </div>
    </>
  );
}
