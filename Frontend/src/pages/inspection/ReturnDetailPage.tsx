import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReturnService } from '../../services/returnService';
import { ReturnItem } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { ArrowLeft, Sparkles, ClipboardCheck, Clock, MapPin, Package, CheckCircle2 } from 'lucide-react';

export const ReturnDetailPage: React.FC = () => {
  const { returnId } = useParams<{ returnId: string }>();
  const [item, setItem] = useState<ReturnItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (returnId) {
      ReturnService.getReturnById(returnId).then(data => {
        setItem(data);
        setIsLoading(false);
      });
    }
  }, [returnId]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading return record...</div>;
  }

  if (!item) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-bold text-slate-900">Return record not found</h2>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/returns')}>
          Back to Worklist
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/returns')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Returns
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {item.rmaNumber}
              </h1>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Order Ref: {item.orderReference} &bull; Intake Hub: {item.hubName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Sparkles className="w-4 h-4 text-blue-600" />}
            onClick={() => navigate(`/returns/${item.id}/assessment`)}
          >
            {item.assessment ? 'View AI Inference' : 'Run AI Screen'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<ClipboardCheck className="w-4 h-4" />}
            onClick={() => navigate(`/returns/${item.id}/inspection`)}
          >
            {item.inspection ? 'Review Inspection QA' : 'Perform Physical QA'}
          </Button>
        </div>
      </div>

      {/* Main Grid: Details + Photos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Product & Return Classification"
              subtitle="Declared details from intake associate"
            />
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={item.primaryImage}
                  alt={item.productName}
                  className="w-16 h-16 rounded-lg object-cover border border-slate-200 bg-white"
                />
                <div className="text-xs flex-1">
                  <h4 className="text-sm font-bold text-slate-900">{item.productName}</h4>
                  <div className="text-slate-500 mt-1">
                    <span className="font-mono text-blue-700 font-semibold">{item.sku}</span> &bull; Category: {item.category}
                  </div>
                  <p className="text-slate-700 mt-2 font-medium">
                    Return Reason: <span className="font-normal text-slate-600">{item.returnReason}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Reported Condition</span>
                  <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                    {item.reportedCondition.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Packaging State</span>
                  <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                    {item.packagingCondition.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Accessories</span>
                  <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
                    {item.accessoryCompleteness}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Assessment Snapshot if exists */}
          {item.assessment && (
            <Card className="border-blue-200 bg-blue-50/20">
              <CardHeader
                title={
                  <div className="flex items-center gap-2 text-blue-950">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>AI Model Pre-Screen Assessment</span>
                  </div>
                }
                subtitle={`Version: ${item.assessment.modelVersion} — ${item.assessment.timestamp}`}
              />
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                  <div>
                    <span className="text-slate-500 block">Predicted Outcome</span>
                    <span className="text-sm font-bold text-slate-900 capitalize">
                      {item.assessment.predictedDisposition.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Confidence Score</span>
                    <span className="text-base font-mono font-bold text-blue-700">
                      {Math.round(item.assessment.confidenceScore * 100)}%
                    </span>
                  </div>
                </div>

                {item.assessment.riskFlags.length > 0 && (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
                    <strong>Flags:</strong> {item.assessment.riskFlags.join('; ')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Physical Inspection Sign-off if exists */}
          {item.inspection && (
            <Card className="border-emerald-200 bg-emerald-50/20">
              <CardHeader
                title={
                  <div className="flex items-center gap-2 text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Physical Inspection Sign-off</span>
                  </div>
                }
                subtitle={`Completed by ${item.inspection.inspectorName} on ${item.inspection.completedAt}`}
              />
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block">Final Disposition</span>
                    <span className="text-sm font-bold text-emerald-800 capitalize">
                      {item.inspection.finalDisposition.replace('_', ' ')}
                    </span>
                  </div>
                  <Badge variant="success">QA Approved</Badge>
                </div>

                <div className="space-y-1.5">
                  <p className="font-semibold text-slate-700">Inspection Checkpoints:</p>
                  {item.inspection.checks.map(chk => (
                    <div key={chk.id} className="flex items-center justify-between p-2 rounded bg-white border border-slate-100">
                      <span className="text-slate-700">{chk.label}</span>
                      <span className={`font-bold ${chk.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                        {chk.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>

                {item.inspection.inspectorNotes && (
                  <p className="text-slate-600 italic mt-2">"{item.inspection.inspectorNotes}"</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Photos & Lifecycle History Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Product Photos" subtitle={`${item.images.length} view(s) captured`} />
            <CardContent className="space-y-3">
              {item.images.map(img => (
                <div key={img.id} className="relative rounded-lg overflow-hidden border border-slate-200">
                  <img src={img.url} alt={img.caption} className="w-full h-44 object-cover" />
                  <div className="p-2 bg-white text-xs">
                    <span className="font-medium text-slate-700">{img.caption}</span>
                    {img.detections && img.detections.length > 0 && (
                      <span className="block text-[11px] text-blue-700 font-semibold mt-0.5">
                        CNN: {img.detections.map(d => `${d.defectClass} (${Math.round(d.confidence * 100)}%)`).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Unified Timeline */}
          <Card>
            <CardHeader title="Lifecycle Timeline" subtitle="Audit trail for this returned item" />
            <CardContent>
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-200">
                {item.historyTimeline.map((ev, idx) => (
                  <div key={idx} className="relative flex items-start gap-3 pl-6 text-xs">
                    <span className="absolute left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-900 ring-4 ring-white" />
                    <div>
                      <p className="font-bold text-slate-900">{ev.title}</p>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">{ev.description}</p>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>{ev.timestamp}</span> &bull; <span>{ev.actor}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
