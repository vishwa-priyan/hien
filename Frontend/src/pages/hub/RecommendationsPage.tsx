import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecommendationService } from '../../services/recommendationService';
import { TransferRecommendation } from '../../types';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Compass,
  Leaf,
  ShieldCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const RecommendationsPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<TransferRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [selectedRec, setSelectedRec] = useState<TransferRecommendation | null>(null);
  const [confirmApproveRec, setConfirmApproveRec] = useState<TransferRecommendation | null>(null);
  const [rejectRec, setRejectRec] = useState<TransferRecommendation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    setIsLoading(true);
    const data = await RecommendationService.getRecommendations();
    setRecommendations(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async () => {
    if (!confirmApproveRec) return;
    try {
      const transfer = await RecommendationService.approveRecommendation(confirmApproveRec.id);
      showToast({
        title: 'Transfer Approved & Scheduled',
        description: `Created transfer ${transfer.transferCode}. Stock reserved at source hub.`,
        type: 'success',
      });
      setConfirmApproveRec(null);
      await loadData();
      navigate(`/hub/transfers/${transfer.id}`);
    } catch (err: any) {
      showToast({ title: 'Approval Failed', description: err.message, type: 'error' });
    }
  };

  const handleReject = async () => {
    if (!rejectRec || !rejectReason.trim()) return;
    try {
      await RecommendationService.rejectRecommendation(rejectRec.id, rejectReason);
      showToast({
        title: 'Recommendation Dismissed',
        description: 'Rebalancing proposal rejected.',
        type: 'info',
      });
      setRejectRec(null);
      setRejectReason('');
      await loadData();
    } catch (err: any) {
      showToast({ title: 'Rejection Failed', description: err.message, type: 'error' });
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const updated = await RecommendationService.recalculateRecommendations();
      setRecommendations(updated);
      showToast({
        title: 'Decision Engine Recalculated',
        description: 'Analyzed current stock levels and demand deltas across all 5 hubs.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({ title: 'Recalculation Failed', description: err.message, type: 'error' });
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Inventory Balancing Recommendations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Algorithmic peer-to-peer transfer recommendations evaluated against margin hurdles, road distance, and carbon intensity.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          isLoading={isRecalculating}
          leftIcon={<RefreshCw className="w-4 h-4 text-teal-600" />}
          onClick={handleRecalculate}
        >
          Recalculate Network Routes
        </Button>
      </div>

      {/* Decision Engine Banner */}
      <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>
            <strong>Deterministic Rule Engine:</strong> Recommendations enforce 100% feasibility (available stock check, destination storage capacity, category certification, and minimum $35.00 net benefit hurdle).
          </span>
        </div>
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
            No pending transfer recommendations. All hubs are currently within equilibrium thresholds.
          </div>
        ) : (
          recommendations.map(rec => (
            <Card key={rec.id} className={rec.status === 'approved' ? 'border-emerald-200 bg-emerald-50/20' : ''}>
              <CardHeader
                title={
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-bold text-slate-900 text-base">{rec.productName}</span>
                    <span className="font-mono text-xs text-blue-700 font-semibold px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                      {rec.sku}
                    </span>
                    <Badge variant={rec.status === 'approved' ? 'success' : rec.status === 'rejected' ? 'danger' : 'info'}>
                      {rec.status.toUpperCase()}
                    </Badge>
                  </div>
                }
                action={
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Net Benefit</span>
                    <span className="text-xl font-black text-emerald-700 font-mono">
                      +${rec.netBenefit.toFixed(2)}
                    </span>
                  </div>
                }
              />
              <CardContent className="space-y-4">
                {/* Route visualization */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Source Facility (Surplus)</span>
                    <span className="font-bold text-slate-900 text-sm block mt-0.5">{rec.sourceHubName}</span>
                    <span className="text-xs text-emerald-700 font-semibold">{rec.sourceSurplus} surplus units available</span>
                  </div>

                  <div className="flex flex-col items-center justify-center px-4">
                    <span className="text-xs font-bold text-slate-900 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-2xs">
                      Transfer {rec.quantity} units
                    </span>
                    <div className="w-32 border-t-2 border-dashed border-slate-300 relative my-2">
                      <ArrowRight className="w-4 h-4 text-slate-400 absolute right-0 -top-2" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{rec.distanceKm} km &bull; ~{rec.estTransferHours} hrs</span>
                  </div>

                  <div className="flex-1 sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination Facility (Shortage)</span>
                    <span className="font-bold text-slate-900 text-sm block mt-0.5">{rec.destHubName}</span>
                    <span className="text-xs text-amber-700 font-semibold">{rec.destShortage} units deficit projected</span>
                  </div>
                </div>

                {/* Economics and Environmental Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Avoided Central Return</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">${rec.expectedBenefit.toFixed(2)}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Local Transport Cost</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">${rec.estTransportCost.toFixed(2)}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Handling & QA Cost</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">${rec.handlingCost.toFixed(2)}</span>
                  </div>
                  <div className="p-2.5 bg-teal-50 rounded-lg border border-teal-200 text-teal-900">
                    <span className="block text-[10px] uppercase font-bold">Carbon Impact</span>
                    <span className="font-bold text-sm mt-0.5 block">{rec.estEmissionsKg} kg CO₂e</span>
                  </div>
                </div>

                {/* Rationale explanation */}
                <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                  <strong className="text-slate-900 block mb-0.5">Decision Rationale:</strong>
                  {rec.rationale}
                </div>

                {/* Feasibility Constraint Checkpoints */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Feasibility Constraint Verification:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {rec.constraintChecks.map((chk, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded bg-slate-50 border border-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-900 block">{chk.constraint}</span>
                          <span className="text-[11px] text-slate-500">{chk.details}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              {rec.status === 'proposed' && (
                <CardFooter className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRejectRec(rec);
                      setRejectReason('');
                    }}
                  >
                    Reject Proposal
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => setConfirmApproveRec(rec)}
                  >
                    Approve Transfer & Reserve Stock
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Confirmation Dialog for Approving Transfer */}
      <ConfirmDialog
        isOpen={Boolean(confirmApproveRec)}
        onClose={() => setConfirmApproveRec(null)}
        onConfirm={handleApprove}
        title="Approve Inventory Transfer"
        message={`Confirm scheduling transfer of ${confirmApproveRec?.quantity} units of ${confirmApproveRec?.productName} from ${confirmApproveRec?.sourceHubName} to ${confirmApproveRec?.destHubName}? Source inventory will be reserved immediately.`}
        confirmLabel="Approve & Schedule"
      />

      {/* Modal for Rejecting Recommendation with Reason */}
      <Modal
        isOpen={Boolean(rejectRec)}
        onClose={() => setRejectRec(null)}
        title="Reject Balancing Recommendation"
        description="Provide a justification for rejecting this algorithmic route proposal."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rejection Reason *
            </label>
            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="e.g. Source facility expects imminent local corporate order; inventory needed on site."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRejectRec(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReject} disabled={!rejectReason.trim()}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
