import React, { useState, useEffect } from 'react';
import { AuditService } from '../../services/auditService';
import { AuditEvent } from '../../types';
import { Table, Column } from '../../components/common/Table';
import { StatusBadge } from '../../components/common/Badge';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { ShieldCheck, History, Filter } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState('all');

  useEffect(() => {
    AuditService.getAuditLogs().then(data => {
      setLogs(data);
      setIsLoading(false);
    });
  }, []);

  const filteredLogs = resultFilter === 'all'
    ? logs
    : logs.filter(l => l.result === resultFilter);

  const columns: Column<AuditEvent>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      className: 'font-mono text-slate-500 whitespace-nowrap',
    },
    {
      key: 'actor',
      header: 'Actor & Role',
      sortable: true,
      render: l => (
        <div>
          <span className="font-semibold text-slate-900 block">{l.actor}</span>
          <span className="text-[10px] text-slate-400 capitalize">{l.role}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action Executed',
      sortable: true,
      render: l => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
          {l.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entity Reference',
      render: l => (
        <div className="font-mono text-[11px] text-slate-600">
          <span>{l.entityType}: </span>
          <span className="text-blue-700 font-semibold">{l.entityId}</span>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'State Transition / Notes',
      render: l => (
        <div className="text-xs text-slate-600 max-w-sm truncate" title={l.newState || l.previousState}>
          {l.newState || l.previousState || '—'}
        </div>
      ),
    },
    {
      key: 'result',
      header: 'Audit Outcome',
      sortable: true,
      render: l => <StatusBadge status={l.result} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Immutable System Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cryptographically timestamped record of return evaluations, physical QA sign-offs, transfers, and stock movements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={resultFilter}
            onChange={e => setResultFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Outcomes</option>
            <option value="SUCCESS">Success Only</option>
            <option value="BLOCKED">Blocked / Exceptions</option>
          </select>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredLogs}
        keyExtractor={l => l.id}
        isLoading={isLoading}
        searchKeys={['actor', 'action', 'entityId', 'newState']}
        searchPlaceholder="Search audit log by actor, action name, or entity ID..."
        pageSize={12}
      />
    </div>
  );
};
