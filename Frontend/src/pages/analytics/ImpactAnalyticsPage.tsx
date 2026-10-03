import React, { useState, useEffect } from 'react';
import { AnalyticsService, ImpactSummary } from '../../services/analyticsService';
import { StorageService } from '../../services/storage';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import {
  Leaf,
  DollarSign,
  Compass,
  Clock,
  Download,
  Filter,
  Info,
  RotateCcw,
  ShoppingBag,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useToast } from '../../context/ToastContext';

export const ImpactAnalyticsPage: React.FC = () => {
  const [impact, setImpact] = useState<ImpactSummary | null>(null);
  const [hubFilter, setHubFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { showToast } = useToast();
  const hubs = StorageService.getState().hubs;

  useEffect(() => {
    AnalyticsService.getImpactMetrics().then(setImpact);
  }, []);

  const handleExportCSV = () => {
    if (!impact) return;
    const rows = [
      ['Metric', 'Baseline Central Reverse Logistics', 'HIEN Hyperlocal Network', 'Net Avoided / Benefit'],
      ['Total Logistics Cost ($)', impact.baselineLogisticsCost, impact.hienLogisticsCost, impact.costAvoided],
      ['Transport Distance (km)', impact.baselineDistanceKm, impact.hienDistanceKm, impact.distanceAvoidedKm],
      ['Carbon Emissions (kg CO2e)', impact.baselineEmissionsKg, impact.hienEmissionsKg, impact.emissionsAvoidedKg],
      ['Resale Turnaround Speed (Days)', impact.turnaroundDaysBaseline, impact.turnaroundDaysHien, `${(impact.turnaroundDaysBaseline - impact.turnaroundDaysHien).toFixed(1)} days faster`],
      ['Resale Retention Rate', '22% (typical)', `${impact.returnsResaleEligiblePct}%`, `+${impact.returnsResaleEligiblePct - 22}% improvement`],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hien_sustainability_impact_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      title: 'CSV Report Exported',
      description: 'Downloaded sustainability and logistics cost comparison summary.',
      type: 'success',
    });
  };

  if (!impact) {
    return <div className="p-8 text-center text-slate-400">Loading impact telemetry...</div>;
  }

  // Comparison bar chart data
  const comparisonData = [
    {
      category: 'Cost ($100s)',
      Baseline: Math.round(impact.baselineLogisticsCost / 100),
      HIEN: Math.round(impact.hienLogisticsCost / 100),
    },
    {
      category: 'Distance (100 km)',
      Baseline: Math.round(impact.baselineDistanceKm / 100),
      HIEN: Math.round(impact.hienDistanceKm / 100),
    },
    {
      category: 'Emissions (10 kg CO₂e)',
      Baseline: Math.round(impact.baselineEmissionsKg / 10),
      HIEN: Math.round(impact.hienEmissionsKg / 10),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Sustainability & Carbon Impact Analytics
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
              SIMULATED TELEMETRY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Empirical comparative analysis: Conventional centralized warehouse returns vs HIEN hyperlocal exchange corridors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportCSV}
          >
            Export CSV Dataset
          </Button>
        </div>
      </div>

      {/* Methodology Disclaimer */}
      <div className="p-3.5 bg-slate-900 text-slate-300 rounded-xl text-xs flex items-start gap-3 border border-slate-800">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="text-teal-400 font-bold">Accounting Assumptions: </span>
          Baseline reverse logistics assumes every return is transported ~420 km round-trip to a centralized distribution center at $48.50 average handling fee. HIEN estimates reflect actual hyperlocal distance traveled (~15-55 km) and local QA turnaround.
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Carbon Avoided</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {impact.emissionsAvoidedKg.toLocaleString()} <span className="text-sm font-normal text-slate-500">kg CO₂e</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Avoided freight exhaust</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-linear-to-br from-teal-500/10 via-teal-500/5 to-transparent border-teal-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-600 text-white rounded-xl shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Cost Avoided</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                ${impact.costAvoided.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Avoided warehouse double-handling</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-linear-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Distance Avoided</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {impact.distanceAvoidedKm.toLocaleString()} <span className="text-sm font-normal text-slate-500">km</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Total road freight kilometers saved</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-linear-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 text-white rounded-xl shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Turnaround Time</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {impact.turnaroundDaysHien} <span className="text-sm font-normal text-slate-500">days</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">vs 15.2 days central reverse cycle</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Comparison Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Baseline vs HIEN Direct Comparison Bar Chart */}
        <Card>
          <CardHeader
            title="Baseline vs HIEN Core Metrics"
            subtitle="Normalized scale comparing centralized warehouse baseline against HIEN exchange"
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} />
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
                <Bar dataKey="Baseline" name="Central Reverse Logistics (Baseline)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="HIEN" name="HIEN Hyperlocal Network" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Emissions Avoided Trend */}
        <Card>
          <CardHeader
            title="Monthly Carbon Emissions Avoided (kg CO₂e)"
            subtitle="Trailing 6-month growth in avoided logistics exhaust emissions"
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={impact.monthlyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
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
                <Line
                  type="monotone"
                  dataKey="emissionsAvoidedKg"
                  name="Avoided CO₂e (kg)"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hub Performance & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hub Comparison Table */}
        <Card>
          <CardHeader
            title="Facility Performance Breakdown"
            subtitle="Local resale conversions and carbon savings by participating facility"
          />
          <CardContent className="p-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="p-3">Facility</th>
                  <th className="p-3">Returns Processed</th>
                  <th className="p-3">Units Resold</th>
                  <th className="p-3 text-right">CO₂ Saved</th>
                  <th className="p-3 text-right">Cost Avoided</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {impact.hubComparisons.map(h => (
                  <tr key={h.hubName} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{h.hubName}</td>
                    <td className="p-3 text-slate-600">{h.localReturns}</td>
                    <td className="p-3 font-bold text-teal-700">{h.resoldUnits}</td>
                    <td className="p-3 text-right font-mono text-emerald-700">{h.co2SavedKg} kg</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">${h.costAvoided}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Category Breakdown Table */}
        <Card>
          <CardHeader
            title="Category Resale Success Rate"
            subtitle="Percentage of returns successfully approved for local resale by product family"
          />
          <CardContent className="p-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="p-3">Product Category</th>
                  <th className="p-3">Intake Count</th>
                  <th className="p-3">Resale Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {impact.categoryBreakdown.map(cat => (
                  <tr key={cat.category} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{cat.category}</td>
                    <td className="p-3 text-slate-600">{cat.returnsCount}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{ width: `${cat.resaleRatePct}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-800">{cat.resaleRatePct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
