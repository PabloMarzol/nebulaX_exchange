import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCandles } from '../../hooks/useMarketData';
import { useLiveData } from '../../contexts/LiveDataContext';

interface TradingChartProps {
  symbol: string;
}

const INTERVALS = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
];

export function TradingChart({ symbol }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [interval, setInterval] = useState('1h');
  const { data: candlesData, isLoading } = useCandles(symbol, interval);
  const { subscribe, unsubscribe } = useLiveData();

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#09090b' },
        textColor: '#d4d4d8',
      },
      grid: {
        vertLines: { color: '#18181b' },
        horzLines: { color: '#18181b' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#27272a',
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false,
      },
      height: chartContainerRef.current.clientHeight,
      width: chartContainerRef.current.clientWidth,
    });

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Subscribe to candle WebSocket updates
  useEffect(() => {
    if (symbol && interval) {
      subscribe('candles', symbol, interval);
    }
    return () => {
      if (symbol && interval) {
        unsubscribe('candles', symbol, interval);
      }
    };
  }, [symbol, interval, subscribe, unsubscribe]);

  // Update chart data
  useEffect(() => {
    if (!candlesData || !seriesRef.current) return;

    const formattedData: CandlestickData<Time>[] = candlesData.map((candle) => ({
      time: (candle.t / 1000) as Time,
      open: parseFloat(candle.o),
      high: parseFloat(candle.h),
      low: parseFloat(candle.l),
      close: parseFloat(candle.c),
    }));

    seriesRef.current.setData(formattedData);

    // Fit content to view
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candlesData]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">{symbol} Chart</CardTitle>

        <Select value={interval} onValueChange={setInterval}>
          <SelectTrigger className="w-[100px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERVALS.map((int) => (
              <SelectItem key={int.value} value={int.value}>
                {int.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="flex-1 p-0 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 z-10">
            <div className="text-sm text-zinc-400">Loading chart...</div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </CardContent>
    </Card>
  );
}
