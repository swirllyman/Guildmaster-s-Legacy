import { useState, useEffect } from 'react';

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsMobile(isMobileUA || isSmallScreen || isPortraitMode);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
};
