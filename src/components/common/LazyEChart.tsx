import { lazy, Suspense } from 'react';

// Lazy load ECharts component
const EChartComponentLazy = lazy(() => import('./EChartComponent'));

// Loading skeleton untuk charts
export const ChartLoadingSkeleton = () => (
  <div className="w-full h-[300px] animate-pulse bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="text-sm text-gray-400">Loading chart...</div>
  </div>
);

// Wrapper untuk lazy loaded charts dengan suspense
const LazyEChart = (props: any) => (
  <Suspense fallback={<ChartLoadingSkeleton />}>
    <EChartComponentLazy {...props} />
  </Suspense>
);

export default LazyEChart;
