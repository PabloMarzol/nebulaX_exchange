import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';

interface LiveDataContextType {
  prices: Record<string, number>;
  orderBooks: Record<string, OrderBook>;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  isConnected: boolean;
}

interface OrderBook {
  bids: Array<{ price: number; amount: number; total: number }>;
  asks: Array<{ price: number; amount: number; total: number }>;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [orderBooks, setOrderBooks] = useState<Record<string, OrderBook>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(env.wsUrl, {
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

    socket.on('price-update', (data: { symbol: string; price: number }) => {
      setPrices((prev) => ({ ...prev, [data.symbol]: data.price }));
    });

    socket.on('orderbook-update', (data: { symbol: string; orderBook: OrderBook }) => {
      setOrderBooks((prev) => ({ ...prev, [data.symbol]: data.orderBook }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = (symbol: string) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribe', { symbol });
    }
  };

  const unsubscribe = (symbol: string) => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe', { symbol });
    }
  };

  return (
    <LiveDataContext.Provider
      value={{
        prices,
        orderBooks,
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
