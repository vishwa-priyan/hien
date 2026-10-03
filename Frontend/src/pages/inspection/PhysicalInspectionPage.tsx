import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReturnService } from '../../services/returnService';
import { InspectionService } from '../../services/inspectionService';
import { ReturnItem, InspectionCheckItem } from '../../types';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardCheck,
  ShieldCheck,
  Upload,
  Info,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const PhysicalInspectionPage: React.FC = () => {
  const { returnId } = useParams<{ returnId: string }>();
  const [item, setItem] = useState<ReturnItem | null>(null);
  const [checks, setChecks] = useState<InspectionCheckItem[]>([]);
  const [disposition, setDisposition] = useState<'approved_resale' | 'refurbishment_required' | 'not_suitable' | 'quarantined'>('approved_resale');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (returnId) {
      ReturnService.getReturnById(returnId).then(data => {
        if (!data) return;
        setItem(data);

        // Prepopulate checks based on product category or existing inspection
        if (data.inspection?.checks) {
          setChecks(data.inspection.checks);
          setDisposition(data.inspection.finalDisposition);
          setNotes(data.inspection.inspectorNotes);
        } else {
          const defaultChecks: InspectionCheckItem[] = [
            { id: 'chk-1', label: 'Physical casing integrity & cosmetic grade evaluation', isMandatory: true, passed: null },
            { id: 'chk-2', label: 'Full functional diagnostic (Power, Audio/Display/Sensors)', isMandatory: true, passed: null },
            { id: 'chk-3', label: 'Accessory completeness & cable integrity check', isMandatory: false, passed: null },
            { id: 'chk-4', label: 'Hardware serial identity & anti-counterfeiting check', isMandatory: true, passed: null },
            { id: 'chk-5', label: 'Safety check: Battery expansion / Thermal / Liquid ingress', isMandatory: true, passed: null },
            { id: 'chk-6', label: 'Sanitization & hygiene processing certification', isMandatory: true, passed: null },
          ];
          setChecks(defaultChecks);
        }
      });
    }
  }, [returnId]);

  if (!item) {
    return <div className="p-8 text-center text-slate-400">Loading inspection checklist...</div>;
  }

  const handleCheckToggle = (id: string, passed: boolean) => {
    setChecks(prev =>
      prev.map(c => (c.id === id ? { ...c, passed } : c))
    );
  };

  const handleCheckNote = (id: string, checkNote: string) => {
    setChecks(prev =>
      prev.map(c => (c.id === id ? { ...c, notes: checkNote } : c))
    );
  };

  const handleInitialValidate = () => {
    // Check if mandatory checks have been reviewed
    const uninspectedMandatory = checks.filter(c => c.isMandatory && c.passed === null);
    if (uninspectedMandatory.length > 0) {
      showToast({
        title: 'Incomplete Mandatory Checklist',
        description: `Please record PASS or FAIL for: ${uninspectedMandatory.map(c => c.label).join(', ')}`,
        type: 'warning',
      });
      return;
    }

    const failedMandatory = checks.filter(c => c.isMandatory && c.passed === false);
    if (disposition === 'approved_resale' && failedMandatory.length > 0) {
      showToast({
        title: 'Resale Approval Blocked',
        description: `Cannot approve for resale when mandatory checkpoints fail (${failedMandatory.map(c => c.label).join(', ')}).`,
        type: 'error',
      });
      return;
    }

    if (!notes.trim()) {
      showToast({
        title: 'Inspector Notes Required',
        description: 'Please add a brief summary or technician sign-off remark.',
        type: 'warning',
      });
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      await InspectionService.recordInspection({
        returnId: item.id,
        checks,
        finalDisposition: disposition,
        inspectorNotes: notes,
      });

      showToast({
        title: 'Inspection Recorded',
        description: disposition === 'approved_resale'
          ? `Item approved and admitted to sellable stock at ${item.hubName}!`
          : `Item disposition set to ${disposition.replace('_', ' ').toUpperCase()}.`,
        type: 'success',
      });

      setIsConfirmOpen(false);
      navigate(`/returns/${item.id}`);
    } catch (err: any) {
      showToast({ title: 'Submission Error', description: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allMandatoryPassed = checks.filter(c => c.isMandatory).every(c => c.passed === true);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/returns/${item.id}/assessment`)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            AI Assessment
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Physical QA Inspection
              </h1>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              RMA: {item.rmaNumber} &bull; {item.productName} ({item.sku})
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Checkpoint Notice */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Inventory Safety Guardrail: </span>
          Items cannot be admitted into local sellable inventory without 100% pass on all mandatory safety and diagnostic checks. Failed checks require triage to refurbishment or safety quarantine.
        </div>
      </div>

      {/* Checklist Card */}
      <Card>
        <CardHeader
          title="Mandatory & Category Checkpoints"
          subtitle={`Product Category: ${item.category} — QA Facility: ${item.hubName}`}
        />
        <CardContent className="space-y-4">
          <div className="divide-y divide-slate-100">
            {checks.map(chk => (
              <div key={chk.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">{chk.label}</span>
                    {chk.isMandatory ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700">
                        MANDATORY
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                        OPTIONAL
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Optional inspector remarks on this checkpoint..."
                    value={chk.notes || ''}
                    onChange={e => handleCheckNote(chk.id, e.target.value)}
                    className="mt-1 text-xs text-slate-600 placeholder-slate-400 border border-slate-200 rounded px-2 py-1 w-full max-w-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCheckToggle(chk.id, true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      chk.passed === true
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>PASS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCheckToggle(chk.id, false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      chk.passed === false
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>FAIL</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disposition Selection & Inspector Notes */}
      <Card>
        <CardHeader
          title="Final QA Disposition & Authorization"
          subtitle="Determine inventory routing and record permanent technician signature"
        />
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Final Disposition Result *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  disposition === 'approved_resale'
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Approved for Resale</span>
                  <input
                    type="radio"
                    name="disposition"
                    checked={disposition === 'approved_resale'}
                    onChange={() => setDisposition('approved_resale')}
                    className="accent-emerald-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Admits unit into local sellable inventory at {item.hubName}.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  disposition === 'refurbishment_required'
                    ? 'border-blue-600 bg-blue-50/40 text-blue-950 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Refurbishment Needed</span>
                  <input
                    type="radio"
                    name="disposition"
                    checked={disposition === 'refurbishment_required'}
                    onChange={() => setDisposition('refurbishment_required')}
                    className="accent-blue-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Requires parts swap or workshop servicing. Not sellable.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  disposition === 'quarantined'
                    ? 'border-red-600 bg-red-50/40 text-red-950 ring-2 ring-red-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Quarantine for Safety</span>
                  <input
                    type="radio"
                    name="disposition"
                    checked={disposition === 'quarantined'}
                    onChange={() => setDisposition('quarantined')}
                    className="accent-red-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Isolated in designated bay. Prohibited from orders.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  disposition === 'not_suitable'
                    ? 'border-slate-700 bg-slate-100 text-slate-900 ring-2 ring-slate-400/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Not Suitable / Salvage</span>
                  <input
                    type="radio"
                    name="disposition"
                    checked={disposition === 'not_suitable'}
                    onChange={() => setDisposition('not_suitable')}
                    className="accent-slate-700"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Recycle or raw component breakdown only.
                </p>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Inspector Diagnostic Notes & Sign-off Certification *
            </label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950"
              placeholder="e.g. Device passed all 6 physical and acoustic checkpoints with zero cosmetic flaws. Sanitized with 99% isopropanol. Approved for Grade-A Certified Resale."
            />
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/returns/${item.id}/assessment`)}
          >
            Review AI Pre-Screen
          </Button>

          <Button
            variant={disposition === 'approved_resale' ? 'success' : 'primary'}
            size="sm"
            leftIcon={<ClipboardCheck className="w-4 h-4" />}
            onClick={handleInitialValidate}
          >
            Submit Physical Inspection Decision
          </Button>
        </CardFooter>
      </Card>

      {/* Confirmation Dialog before Submitting Consequential Action */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirm Final QA Inspection Decision"
        message={`Are you sure you want to sign off this return (${item.rmaNumber}) with final disposition: ${disposition.toUpperCase()}? ${
          disposition === 'approved_resale'
            ? 'This will automatically admit 1 unit of this SKU into sellable available inventory at ' + item.hubName + '.'
            : 'This item will be routed away from sellable local inventory.'
        }`}
        confirmLabel="Confirm & Record Decision"
        isLoading={isSubmitting}
      />
    </div>
  );
};
