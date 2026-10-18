import React, { useState, useEffect } from 'react';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onFinish();
    }, 2000); // 2 seconds splash screen
    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b14]">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <img src="/DhairyaX Aviation AI Logo.png" alt="DhairyaX Logo" className="w-48 h-48 object-contain" />
        <h1 className="text-2xl font-bold text-white tracking-widest">DHAIRYAX</h1>
      </div>
    </div>
  );
}
