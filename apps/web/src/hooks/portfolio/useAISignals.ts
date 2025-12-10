/**
 * Hook for real-time AI signals via WebSocket
 */
import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/LiveDataContext';

export interface AISignalUpdate {
  ticker: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: any;
  timestamp: string;
}

interface UseAISignalsOptions {
  userId: string;
  enabled?: boolean;
}

export function useAISignals({ userId, enabled = false }: UseAISignalsOptions) {
  const socket = useSocket();
  const [signals, setSignals] = useState<AISignalUpdate[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!enabled || !socket || !userId) return;

    // Subscribe to AI signals
    socket.emit('subscribe:ai-signals', { userId });

    // Handle subscription confirmation
    socket.on('ai-signals:subscribed', () => {
      setIsSubscribed(true);
      console.log('Subscribed to AI signals');
    });

    // Handle signal updates
    socket.on('ai-signals:update', (data: AISignalUpdate) => {
      setSignals((prev) => [data, ...prev].slice(0, 50)); // Keep last 50 signals
    });

    // Handle errors
    socket.on('error', (error: any) => {
      console.error('AI signals WebSocket error:', error);
    });

    // Cleanup
    return () => {
      socket.emit('unsubscribe:ai-signals', { userId });
      socket.off('ai-signals:subscribed');
      socket.off('ai-signals:update');
      socket.off('error');
      setIsSubscribed(false);
    };
  }, [socket, userId, enabled]);

  return {
    signals,
    isSubscribed
  };
}
