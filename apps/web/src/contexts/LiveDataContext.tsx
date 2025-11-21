import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';

interface LiveDataContextType {
  prices: Record<string, string>;
  orderbooks: Record<string, any>;
  candles: Record<string, any[]>;
  trades: Record<string, any[]>;
  subscribe: (type: 'market' | 'candles' | 'prices' | 'user', symbol?: string, interval?: string) => void;
  unsubscribe: (type: 'market' | 'candles' | 'prices' | 'user', symbol?: string, interval?: string) => void;
  isConnected: boolean;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [orderbooks, setOrderbooks] = useState<Record<string, any>>({});
  const [candles, setCandles] = useState<Record<string, any[]>>({});
  const [trades, setTrades] = useState<Record<string, any[]>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const wsUrl = env.wsUrl || 'http://localhost:3000';
    socketRef.current = io(wsUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });

    // Listen for price updates
    socket.on('prices:update', (data: { data: Record<string, string>; timestamp: number }) => {
      setPrices(data.data);
    });

    // Listen for orderbook updates
    socket.on('orderbook:update', (data: { symbol: string; data: any; timestamp: number }) => {
      setOrderbooks((prev) => ({ ...prev, [data.symbol]: data.data }));
    });

    // Listen for candles updates
    socket.on('candles:update', (data: { symbol: string; interval: string; data: any; timestamp: number }) => {
      const key = `${data.symbol}:${data.interval}`;
      setCandles((prev) => {
        const existing = prev[key] || [];
        // Update or append candle
        const index = existing.findIndex((c: any) => c.t === data.data.t);
        if (index >= 0) {
          existing[index] = data.data;
          return { ...prev, [key]: [...existing] };
        } else {
          return { ...prev, [key]: [...existing, data.data] };
        }
      });
    });

    // Listen for candles snapshot
    socket.on('candles:snapshot', (data: { symbol: string; interval: string; data: any[]; timestamp: number }) => {
      const key = `${data.symbol}:${data.interval}`;
      setCandles((prev) => ({ ...prev, [key]: data.data }));
    });

    // Listen for trades updates
    socket.on('trades:update', (data: { symbol: string; data: any; timestamp: number }) => {
      setTrades((prev) => {
        const existing = prev[data.symbol] || [];
        return { ...prev, [data.symbol]: [data.data, ...existing].slice(0, 100) };
      });
    });

    // Listen for user events
    socket.on('user:event', (data: { data: any; timestamp: number }) => {
      console.log('User event:', data);
      // Handle user-specific events (fills, order updates, etc.)
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = (type: 'market' | 'candles' | 'prices' | 'user', symbol?: string, interval?: string) => {
    if (!socketRef.current) return;

    if (type === 'market' && symbol) {
      socketRef.current.emit('subscribe:market', { symbol });
    } else if (type === 'candles' && symbol && interval) {
      socketRef.current.emit('subscribe:candles', { symbol, interval });
    } else if (type === 'prices') {
      socketRef.current.emit('subscribe:prices');
    } else if (type === 'user') {
      // TODO: Add userId and token
      // socketRef.current.emit('subscribe:user', { userId, token });
    }
  };

  const unsubscribe = (type: 'market' | 'candles' | 'prices' | 'user', symbol?: string, interval?: string) => {
    if (!socketRef.current) return;

    if (type === 'market' && symbol) {
      socketRef.current.emit('unsubscribe:market', { symbol });
    } else if (type === 'candles' && symbol && interval) {
      socketRef.current.emit('unsubscribe:candles', { symbol, interval });
    } else if (type === 'prices') {
      socketRef.current.emit('unsubscribe:prices');
    } else if (type === 'user') {
      // TODO: Add userId
      // socketRef.current.emit('unsubscribe:user', { userId });
    }
  };

  return (
    <LiveDataContext.Provider
      value={{
        prices,
        orderbooks,
        candles,
        trades,
        subscribe,
        unsubscribe,
        isConnected,
      }}
    >
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveData() {
  const context = useContext(LiveDataContext);
  if (!context) {
    throw new Error('useLiveData must be used within LiveDataProvider');
  }
  return context;
}
