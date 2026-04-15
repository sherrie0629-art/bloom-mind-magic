/// <reference types="vite/client" />

interface Window {
  createLemonSqueezy?: () => void;
  LemonSqueezy?: {
    Url: {
      Open: (url: string) => void;
      Close: () => void;
    };
    Setup: (options: {
      eventHandler?: (event: { event: string; data?: any }) => void;
    }) => void;
  };
}
