import * as echarts from 'echarts';
import React, { useEffect, useRef } from 'react';

interface EChartsProps {
  option: echarts.EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  theme?: string | object;
  onEvents?: Record<string, Function>;
}

// Flag to track if Indonesia map is registered
let indonesiaMapRegistered = false;

const EChartComponent: React.FC<EChartsProps> = ({ option, style, className, theme, onEvents }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    // Register Indonesia map if needed (check if option uses geo with map: 'indonesia')
    const registerIndonesiaMap = async () => {
      if (!indonesiaMapRegistered && option.geo) {
        try {
          const response = await fetch('/indonesia.geojson');
          const geoJson = await response.json();
          echarts.registerMap('indonesia', geoJson);
          indonesiaMapRegistered = true;
        } catch (error) {
          console.error('Failed to load Indonesia GeoJSON:', error);
        }
      }
    };

    registerIndonesiaMap().then(() => {
      // Initialize chart
      if (chartRef.current) {
        chartInstance.current = echarts.init(chartRef.current, theme);
        chartInstance.current.setOption(option);
      }
    });

    // Resize handler for window resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    // ResizeObserver to detect container size changes (e.g., sidebar collapse/expand)
    let resizeObserver: ResizeObserver | null = null;
    if (chartRef.current) {
      resizeObserver = new ResizeObserver(() => {
        // Debounce the resize to avoid performance issues
        setTimeout(() => {
          chartInstance.current?.resize();
        }, 100);
      });
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      chartInstance.current?.dispose();
    };
  }, [theme]);

  // Update chart option
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.setOption(option);
    }
  }, [option]);

  // Bind events
  useEffect(() => {
    if (chartInstance.current && onEvents) {
      Object.entries(onEvents).forEach(([eventName, handler]) => {
        chartInstance.current?.on(eventName, handler as any);
      });
    }

    return () => {
      if (chartInstance.current && onEvents) {
        Object.entries(onEvents).forEach(([eventName]) => {
          chartInstance.current?.off(eventName);
        });
      }
    };
  }, [onEvents]);

  return <div ref={chartRef} style={{ height: '300px', width: '100%', ...style }} className={className} />;
};

export default EChartComponent;
