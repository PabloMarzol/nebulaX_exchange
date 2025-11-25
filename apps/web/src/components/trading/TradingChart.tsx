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
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [interval, setInterval] = useState('1h');
  const [legendData, setLegendData] = useState<any>(null);
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

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Overlay on same scale but squashed? No, usually separate or overlay with scaleMargins
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // Highest volume bar will be at 80% from top (bottom 20%)
        bottom: 0,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;

    // Crosshair handler for legend
    chart.subscribeCrosshairMove((param) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        setLegendData(null);
      } else {
        const candleData = param.seriesData.get(series) as any;
        const volumeData = param.seriesData.get(volumeSeries) as any;
        if (candleData) {
          setLegendData({ ...candleData, volume: volumeData?.value });
        }
      }
    });

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

    const volumeData = candlesData.map((candle) => ({
      time: (candle.t / 1000) as Time,
      value: parseFloat(candle.v),
      color: parseFloat(candle.c) >= parseFloat(candle.o) ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
    }));

    seriesRef.current.setData(formattedData);
    volumeSeriesRef.current?.setData(volumeData);
    
    // Set initial legend data to last candle
    if (formattedData.length > 0) {
        const last = formattedData[formattedData.length - 1];
        const lastVol = volumeData[volumeData.length - 1];
        setLegendData({ ...last, volume: lastVol.value });
    }

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

      <CardContent className="flex-1 p-0 relative group">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 z-10">
            <div className="text-sm text-zinc-400">Loading chart...</div>
          </div>
        )}
        
        {/* Chart Legend */}
        <div className="absolute top-3 left-3 z-20 flex flex-col space-y-1 pointer-events-none text-xs font-mono bg-black/40 p-2 rounded border border-zinc-800/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-4">
            <span className="font-bold text-zinc-300">{symbol}</span>
            <span className="text-zinc-400">{interval}</span>
          </div>
          {legendData ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-400">
              <div className="flex justify-between gap-2"><span>O:</span> <span className="text-zinc-200">{legendData.open?.toFixed(2)}</span></div>
              <div className="flex justify-between gap-2"><span>H:</span> <span className="text-zinc-200">{legendData.high?.toFixed(2)}</span></div>
              <div className="flex justify-between gap-2"><span>L:</span> <span className="text-zinc-200">{legendData.low?.toFixed(2)}</span></div>
              <div className="flex justify-between gap-2"><span>C:</span> <span className="text-zinc-200">{legendData.close?.toFixed(2)}</span></div>
              <div className="flex justify-between gap-2 col-span-2"><span>Vol:</span> <span className="text-zinc-200">{legendData.volume?.toLocaleString()}</span></div>
            </div>
          ) : (
            <div className="text-zinc-500">--</div>
          )}
        </div>

        <div ref={chartContainerRef} className="w-full h-full" />
      </CardContent>
    </Card>
  );
}
