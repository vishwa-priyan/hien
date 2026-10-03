import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { ReturnItem } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';
import { History, RotateCcw, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export const InspectionHistoryPage: React.FC = () => {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const data = StorageService.getState().returns;
    setReturns(data);
  }, []);

  // Filter returns that have undergone inspection or AI assessment
  const inspectedReturns = returns.filter(
    r => r.inspection || r.assessment || r.status === 'approved_resale'
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Inspection History & QA Audit Logs
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Complete chain of custody: intake registration &rarr; simulated AI inference &rarr; physical checkpoint execution &rarr; inventory admission.
        </p>
      </div>

      <div className="space-y-4">
        {inspectedReturns.slice(0, 10).map(r => (
          <Card key={r.id}>
            <CardHeader
              title={
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-bold text-slate-900">{r.rmaNumber}</span>
                  <StatusBadge status={r.status} />
                  <span className="text-xs font-normal text-slate-500">at {r.hubName}</span>
                </div>
              }
              action={
                <Button
                  variant="outline"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={() => navigate(`/returns/${r.id}`)}
                >
                  View File
                </Button>
              }
            />
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <img src={r.primaryImage} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                  <div>
                    <span className="text-sm font-bold text-slate-900">{r.productName}</span>
                    <span className="text-xs text-slate-500 block">SKU: {r.sku} &bull; Order: {r.orderReference}</span>
                  </div>
                </div>

                {r.assessment && (
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs">
                    <span className="text-blue-900 font-semibold block">AI Inference Pre-Screen</span>
                    <span className="text-slate-600">
                      Random Forest: <strong className="capitalize">{r.assessment.predictedDisposition.replace('_', ' ')}</strong> ({Math.round(r.assessment.confidenceScore * 100)}% conf)
                    </span>
                  </div>
                )}
              </div>

              {/* Timeline steps */}
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-200">
                {r.historyTimeline.map((ev, idx) => (
                  <div key={idx} className="relative flex items-start gap-3 pl-6 text-xs">
                    <span className="absolute left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-white" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{ev.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{ev.timestamp}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">{ev.description}</p>
                      <span className="text-[10px] text-slate-400 font-medium">Actor: {ev.actor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
