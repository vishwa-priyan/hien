import React, { useState } from 'react';
import { StorageService } from '../../services/storage';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { NetworkConfig } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Sliders, AlertTriangle, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { AuditService } from '../../services/auditService';

export const NetworkConfigPage: React.FC = () => {
  const [config, setConfig] = useState<NetworkConfig>(() => StorageService.getState().config);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const { resetDemoData, currentUser } = useAuth();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    StorageService.updateState(prev => ({
      ...prev,
      config,
    }));

    await AuditService.logEvent({
      actor: currentUser.name,
      role: currentUser.role,
      action: 'UPDATE_NETWORK_POLICY_CONFIG',
      entityType: 'NetworkConfig',
      entityId: 'global-config',
      newState: JSON.stringify(config),
      result: 'SUCCESS',
    });

    setIsSaving(false);
    showToast({
      title: 'Configuration Saved',
      description: 'Decision engine and transfer feasibility algorithms updated.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Network Policy & Algorithm Parameters
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Tune algorithmic parameters for the transfer decision engine, demand horizons, and sustainability factors.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <p className="font-bold">Core Architectural Safeguard</p>
          <p className="mt-0.5 leading-relaxed">
            AI confidence thresholds serve as decision-support indicators. By design, HIEN governance prevents AI scores alone from bypassing mandatory physical inspections or product safety isolation rules.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Transfer Decision Engine Parameters */}
        <Card>
          <CardHeader
            title="Transfer Optimization & Hurdle Rates"
            subtitle="Parameters governing whether the rule engine proposes peer-to-peer inventory transfers"
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Minimum Net Benefit Hurdle ($)"
                type="number"
                step="1"
                min="0"
                helperText="Transfers with net benefit below this amount are filtered out"
                value={config.minExpectedTransferBenefit}
                onChange={e =>
                  setConfig({ ...config, minExpectedTransferBenefit: parseFloat(e.target.value) || 0 })
                }
              />

              <Input
                label="Demand Planning Horizon (Days)"
                type="number"
                step="1"
                min="7"
                max="60"
                helperText="Lookahead window for demand forecast aggregation"
                value={config.planningHorizonDays}
                onChange={e =>
                  setConfig({ ...config, planningHorizonDays: parseInt(e.target.value, 10) || 14 })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Road Transport Cost ($ / km)"
                type="number"
                step="0.05"
                min="0.1"
                helperText="Estimated vehicle fuel, labor, and depreciation cost"
                value={config.transportCostPerKm}
                onChange={e =>
                  setConfig({ ...config, transportCostPerKm: parseFloat(e.target.value) || 1.25 })
                }
              />

              <Input
                label="Vehicle Emissions Factor (kg CO₂e / km)"
                type="number"
                step="0.01"
                min="0.01"
                helperText="Standard EPA medium-duty delivery van carbon intensity"
                value={config.emissionsFactorKgPerKm}
                onChange={e =>
                  setConfig({ ...config, emissionsFactorKgPerKm: parseFloat(e.target.value) || 0.192 })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Hub & AI Review Thresholds */}
        <Card>
          <CardHeader
            title="Capacity & AI Decision-Support Thresholds"
            subtitle="Alert levels and model triage flags"
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Hub Capacity Alert Threshold (%)"
                type="number"
                step="1"
                min="50"
                max="98"
                helperText="Triggers warning and prioritizes outbound stock rebalancing"
                value={config.hubCapacityThresholdAlert}
                onChange={e =>
                  setConfig({ ...config, hubCapacityThresholdAlert: parseInt(e.target.value, 10) || 85 })
                }
              />

              <Input
                label="AI Classification Confidence Threshold (%)"
                type="number"
                step="1"
                min="50"
                max="95"
                helperText="Predictions below this score trigger a low-confidence review flag"
                value={config.aiConfidenceThreshold}
                onChange={e =>
                  setConfig({ ...config, aiConfidenceThreshold: parseInt(e.target.value, 10) || 75 })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Baseline Reverse Logistics Benchmark */}
        <Card>
          <CardHeader
            title="Conventional Baseline Reference Parameters"
            subtitle="Central warehouse reverse-logistics metrics used for comparative impact calculations"
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Central Warehouse Return Cost ($ / unit)"
                type="number"
                step="0.5"
                helperText="Average cost of return handling via central distribution center"
                value={config.baselineCentralCostPerUnit}
                onChange={e =>
                  setConfig({ ...config, baselineCentralCostPerUnit: parseFloat(e.target.value) || 48.5 })
                }
              />

              <Input
                label="Average Central Warehouse Route (km)"
                type="number"
                step="10"
                helperText="Average round-trip distance from local store to central hub"
                value={config.baselineCentralDistanceKm}
                onChange={e =>
                  setConfig({ ...config, baselineCentralDistanceKm: parseFloat(e.target.value) || 420 })
                }
              />
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4 text-amber-600" />}
              onClick={() => {
                if (confirm('Reset entire system state to initial seed dataset? All temporary modifications will be restored.')) {
                  resetDemoData();
                  showToast({ title: 'Prototype State Reset', description: 'Restored original demo dataset.', type: 'info' });
                }
              }}
            >
              Reset Seed Data to Defaults
            </Button>

            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
              Save Policy Configuration
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};
