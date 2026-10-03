import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ForecastService } from '../../services/forecastService';
import { StorageService } from '../../services/storage';
import { DemandForecast } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import {
  TrendingUp,
  Boxes,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const DemandForecastPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { allHubs } = useAuth();
  const state = StorageService.getState();
  const products = state.products;

  const initialSku = searchParams.get('sku') || products[0]?.sku || 'SKU-AUD-801';
  const initialHubId = searchParams.get('hubId') || allHubs[0]?.id || 'hub-sea-01';

  const [selectedSku, setSelectedSku] = useState(initialSku);
  const [selectedHubId, setSelectedHubId] = useState(initialHubId);
  const [forecast, setForecast] = useState<DemandForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    ForecastService.getForecastForProductAndHub(selectedSku, selectedHubId).then(data => {
      setForecast(data);
      setIsLoading(false);
    });
  }, [selectedSku, selectedHubId]);

  // Combine historical and forecast points for smooth continuous visualization
  const chartData = forecast
    ? [
        ...forecast.historicalPoints.map(p => ({
          date: p.date.slice(5),
          Historical: p.demand,
          Predicted: null,
          LowerBound: null,
          UpperBound: null,
        })),
        ...forecast.forecastPoints.map(p => ({
          date: p.date.slice(5),
          Historical: null,
          Predicted: p.predictedDemand,
          LowerBound: p.lowerBound,
          UpperBound: p.upperBound,
        })),
      ]
    : [];

  const selectedProduct = products.find(p => p.sku === selectedSku);
  const selectedHub = allHubs.find(h => h.id === selectedHubId);

  return (
    <div className="space-y-6">
      {/* Title & Filter Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Demand Forecasting Engine
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
              SIMULATED ML FORECAST
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Machine-learning predicted local consumer demand projections driving stock balancing recommendations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSku}
            onChange={e => setSelectedSku(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800"
          >
            {products.map(p => (
              <option key={p.sku} value={p.sku}>
                {p.sku} — {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedHubId}
            onChange={e => setSelectedHubId(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800"
          >
            {allHubs.map(h => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Model Disclaimer */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Forecast Notice:</strong> Numerical predictions are simulated estimates calculated by the {forecast?.modelName || 'HistGradientBoostingRegressor'} model based on historical demand trends, calendar features, and localized return rates. Forecasts do not represent guaranteed orders.
        </div>
      </div>

      {forecast && (
        <>
          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Available Stock"
              value={`${forecast.availableStock} units`}
              subtitle={`At ${forecast.hubName.split(' ')[0]}`}
              icon={Boxes}
              color="teal"
            />
            <StatCard
              title="14-Day Forecast Demand"
              value={`${forecast.forecastPoints.reduce((s, p) => s + p.predictedDemand, 0)} units`}
              subtitle="Sum of next 14 days"
              icon={TrendingUp}
              color="blue"
            />
            <StatCard
              title="Model Error (MAPE)"
              value={`${forecast.mape.toFixed(1)}%`}
              subtitle={`RMSE: ${forecast.rmse.toFixed(2)} units`}
              icon={Sparkles}
              color="slate"
            />
            <StatCard
              title="Net Position"
              value={forecast.expectedShortageOrSurplus >= 0 ? `+${forecast.expectedShortageOrSurplus} Surplus` : `${forecast.expectedShortageOrSurplus} Shortage`}
              subtitle={forecast.expectedShortageOrSurplus < 0 ? 'Stockout risk detected' : 'Available for rebalancing'}
              icon={AlertTriangle}
              color={forecast.expectedShortageOrSurplus < 0 ? 'amber' : 'emerald'}
            />
          </div>

          {/* Main Forecast Chart */}
          <Card>
            <CardHeader
              title={`Demand Trend & 14-Day Horizon: ${forecast.productName}`}
              subtitle={`Model: ${forecast.modelName} ${forecast.modelVersion} — Last updated: ${forecast.lastForecastTimestamp}`}
            />
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="Historical"
                    stroke="#0f172a"
                    strokeWidth={2}
                    fill="#cbd5e1"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="Predicted"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="UpperBound"
                    name="Confidence Upper"
                    stroke="#93c5fd"
                    strokeWidth={1}
                    fill="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="LowerBound"
                    name="Confidence Lower"
                    stroke="#93c5fd"
                    strokeWidth={1}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
