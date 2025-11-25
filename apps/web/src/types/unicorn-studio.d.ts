// Type declarations for UnicornStudio
interface UnicornStudio {
  init: () => void;
  isInitialized: boolean;
}

interface Window {
  UnicornStudio?: UnicornStudio;
}
