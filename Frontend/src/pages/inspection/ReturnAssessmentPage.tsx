import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReturnService } from '../../services/returnService';
import { AssessmentService } from '../../services/assessmentService';
import { ReturnItem, ReturnAssessment } from '../../types';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  Info,
  Scan,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const ReturnAssessmentPage: React.FC = () => {
  const { returnId } = useParams<{ returnId: string }>();
  const [item, setItem] = useState<ReturnItem | null>(null);
  const [assessment, setAssessment] = useState<ReturnAssessment | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadReturn = async () => {
    if (returnId) {
      const data = await ReturnService.getReturnById(returnId);
      setItem(data);
      if (data?.assessment) {
        setAssessment(data.assessment);
      }
    }
  };

  useEffect(() => {
    loadReturn();
  }, [returnId]);

  const handleRunAssessment = async () => {
    if (!item) return;
    setIsAssessing(true);
    try {
      const result = await AssessmentService.runAiAssessment(item.id);
      setAssessment(result);
      await loadReturn();
      showToast({
        title: 'AI Assessment Generated',
        description: `Classified as ${result.predictedDisposition.replace('_', ' ').toUpperCase()} (${Math.round(result.confidenceScore * 100)}% conf).`,
        type: 'info',
      });
    } catch (err: any) {
      showToast({ title: 'Assessment Error', description: err.message, type: 'error' });
    } finally {
      setIsAssessing(false);
    }
  };

  if (!item) {
    return <div className="p-8 text-center text-slate-400">Loading return assessment workspace...</div>;
  }

  const activeImage = item.images[activeImageIndex] || item.images[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/returns/${item.id}`)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Return
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                AI Inference & Defect Pre-Screen
              </h1>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              RMA: {item.rmaNumber} &bull; {item.productName} ({item.sku})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            isLoading={isAssessing}
            leftIcon={<Sparkles className="w-4 h-4 text-blue-300" />}
            onClick={handleRunAssessment}
          >
            {assessment ? 'Re-Run AI Inference' : 'Execute AI Pre-Screen'}
          </Button>

          <Button
            variant="success"
            size="sm"
            leftIcon={<ClipboardCheck className="w-4 h-4" />}
            onClick={() => navigate(`/returns/${item.id}/inspection`)}
          >
            Proceed to Physical QA
          </Button>
        </div>
      </div>

      {/* Explicit Legal / Compliance Disclaimer */}
      <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Decision Support Policy: </span>
          AI model predictions and CNN visual detections are preliminary decision-support estimates. They do not establish final product functionality, consumer safety compliance, or resale eligibility without mandatory physical inspector sign-off.
        </div>
      </div>

      {/* 3-Panel Inspection Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Image & CNN Visual Detections (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader
              title="Visual Inspection & CNN Defect Detection"
              subtitle={`View: ${activeImage.caption}`}
            />
            <CardContent className="space-y-3">
              {/* Image Preview Container with Relative Bounding Boxes */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center">
                <img
                  src={activeImage.url}
                  alt={activeImage.caption}
                  className="w-full h-80 object-contain"
                />

                {/* CNN Defect Overlays */}
                {activeImage.detections?.map(det => (
                  <div
                    key={det.id}
                    className="absolute border-2 border-red-500 bg-red-500/15 transition-all"
                    style={{
                      left: `${det.bbox.x}%`,
                      top: `${det.bbox.y}%`,
                      width: `${det.bbox.width}%`,
                      height: `${det.bbox.height}%`,
                    }}
                  >
                    <div className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap flex items-center gap-1">
                      <span>{det.defectClass}</span>
                      <span className="font-mono opacity-90">({Math.round(det.confidence * 100)}%)</span>
                    </div>
                  </div>
                ))}

                {(!activeImage.detections || activeImage.detections.length === 0) && (
                  <div className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] px-2 py-1 rounded backdrop-blur-xs">
                    No structural defect detections triggered on this view
                  </div>
                )}
              </div>

              {/* Angle thumbnails */}
              {item.images.length > 1 && (
                <div className="flex gap-2 pt-1 overflow-x-auto pb-1">
                  {item.images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIndex === idx ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200 opacity-70'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Return Metadata Summary */}
          <Card>
            <CardHeader title="Reported Customer Manifest" />
            <CardContent className="text-xs space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Reported Condition</span>
                <span className="font-semibold text-slate-800 capitalize">{item.reportedCondition.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Packaging Integrity</span>
                <span className="font-semibold text-slate-800 capitalize">{item.packagingCondition.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Accessories Included</span>
                <span className="font-semibold text-slate-800 capitalize">{item.accessoryCompleteness}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block">Stated Reason:</span>
                <span className="text-slate-700 italic block mt-0.5">{item.returnReason}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Panel: Random Forest Predictions & Probabilities (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="h-full flex flex-col">
            <CardHeader
              title="Random Forest Classification"
              subtitle="Multivariate disposition likelihood"
            />
            <CardContent className="space-y-5 flex-1">
              {!assessment ? (
                <div className="p-8 text-center text-slate-400 my-auto">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30 text-blue-500" />
                  <p className="font-medium text-slate-700">No AI Assessment Executed Yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click "Execute AI Pre-Screen" to compute simulated Random Forest disposition probabilities.
                  </p>
                </div>
              ) : (
                <>
                  {/* Predicted disposition banner */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-teal-400 font-mono uppercase tracking-wider block">
                        Predicted Disposition
                      </span>
                      <span className="text-lg font-bold capitalize mt-0.5 block">
                        {assessment.predictedDisposition.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">Confidence</span>
                      <span className="text-2xl font-black text-teal-400 font-mono">
                        {Math.round(assessment.confidenceScore * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Class Probabilities Bar Breakdown */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Simulated Class Probabilities:</p>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between text-slate-600 mb-1">
                          <span>Approved Resale</span>
                          <span className="font-mono font-bold text-slate-900">
                            {Math.round(assessment.classProbabilities.approved_resale * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${assessment.classProbabilities.approved_resale * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-600 mb-1">
                          <span>Refurbishment Required</span>
                          <span className="font-mono font-bold text-slate-900">
                            {Math.round(assessment.classProbabilities.refurbishment_required * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${assessment.classProbabilities.refurbishment_required * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-600 mb-1">
                          <span>Quarantined / Hazard</span>
                          <span className="font-mono font-bold text-slate-900">
                            {Math.round(assessment.classProbabilities.quarantined * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${assessment.classProbabilities.quarantined * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-600 mb-1">
                          <span>Not Suitable / Salvage</span>
                          <span className="font-mono font-bold text-slate-900">
                            {Math.round(assessment.classProbabilities.not_suitable * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-400 rounded-full"
                            style={{ width: `${assessment.classProbabilities.not_suitable * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Flags & Missing Data */}
                  <div className="space-y-2">
                    {assessment.riskFlags.length > 0 && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                        <strong className="block mb-1">Risk Factors Detected:</strong>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {assessment.riskFlags.map((rf, idx) => (
                            <li key={idx}>{rf}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {assessment.missingFeatures.length > 0 && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900">
                        <strong className="block mb-1">Missing Features:</strong>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {assessment.missingFeatures.map((mf, idx) => (
                            <li key={idx}>{mf}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <div>Model: {assessment.modelVersion}</div>
                    <div>Evaluated: {assessment.timestamp}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Recommended Next Steps & Inspection Checklist Preview (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader
              title="Next Action Guide"
              subtitle="Decision protocol workflow"
            />
            <CardContent className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                  Recommended Workflow Step
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {assessment?.recommendedNextStep || 'Run AI pre-screen to generate protocol recommendation.'}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="font-bold text-slate-900 mb-2">Mandatory Checks Required:</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    <span>Physical integrity scan</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    <span>Functional power & diagnostic test</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    <span>Serial & warranty verification</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    <span>Sanitization certification</span>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full mt-4"
                leftIcon={<ClipboardCheck className="w-4 h-4" />}
                onClick={() => navigate(`/returns/${item.id}/inspection`)}
              >
                Launch Inspection Checklist
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
