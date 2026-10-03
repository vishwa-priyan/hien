import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HubService } from '../../services/hubService';
import { StorageService } from '../../services/storage';
import { Hub, HubType, HubStatus } from '../../types';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge, StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';
import { HubMap } from '../../components/map/HubMap';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Plus, Building2, MapPin, Phone, Mail, Eye, Power } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const HubManagementPage: React.FC = () => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedHubForMap, setSelectedHubForMap] = useState<string | undefined>();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Create Hub Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<HubType>('store');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('WA');
  const [formZip, setFormZip] = useState('');
  const [formLat, setFormLat] = useState('47.6062');
  const [formLng, setFormLng] = useState('-122.3321');
  const [formCapacity, setFormCapacity] = useState('2000');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formError, setFormError] = useState('');

  const transfers = StorageService.getState().transfers;

  const loadHubs = async () => {
    setIsLoading(true);
    const data = await HubService.getHubs();
    setHubs(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadHubs();
  }, []);

  const handleCreateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const capNum = parseInt(formCapacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      setFormError('Storage capacity must be a positive integer greater than 0.');
      return;
    }

    const latNum = parseFloat(formLat);
    const lngNum = parseFloat(formLng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setFormError('Valid decimal latitude and longitude coordinates are required.');
      return;
    }

    try {
      await HubService.createHub({
        name: formName,
        type: formType,
        address: formAddress,
        city: formCity,
        state: formState,
        zip: formZip,
        lat: latNum,
        lng: lngNum,
        capacity: capNum,
        operatingStatus: 'active',
        supportedCategories: ['Consumer Electronics', 'Audio & Sound', 'Wearables'],
        handlingCapabilities: ['Visual QA', 'Rapid Intake', 'Local Dispatch'],
        contactPerson: formContact,
        contactPhone: formPhone,
        contactEmail: formEmail,
      });

      showToast({
        title: 'Hub Created Successfully',
        description: `${formName} added to the HIEN hyperlocal network.`,
        type: 'success',
      });

      setIsCreateOpen(false);
      resetForm();
      loadHubs();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create hub');
    }
  };

  const handleToggleStatus = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await HubService.toggleOperatingStatus(id);
      showToast({
        title: 'Hub Status Updated',
        description: `${updated.name} operating status is now ${updated.operatingStatus.toUpperCase()}`,
        type: 'info',
      });
      loadHubs();
    } catch (err: any) {
      showToast({ title: 'Error updating status', description: err.message, type: 'error' });
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormAddress('');
    setFormCity('');
    setFormZip('');
    setFormContact('');
    setFormPhone('');
    setFormEmail('');
    setFormError('');
  };

  const filteredHubs = hubs.filter(h => {
    if (typeFilter !== 'all' && h.type !== typeFilter) return false;
    if (statusFilter !== 'all' && h.operatingStatus !== statusFilter) return false;
    return true;
  });

  const columns: Column<Hub>[] = [
    {
      key: 'name',
      header: 'Hub Name & Code',
      sortable: true,
      render: hub => (
        <div>
          <span className="font-semibold text-slate-900 block">{hub.name}</span>
          <span className="text-[10px] text-slate-400 font-mono">{hub.id}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: hub => (
        <Badge variant={hub.type === 'warehouse' ? 'purple' : hub.type === 'store' ? 'info' : 'neutral'}>
          {hub.type.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'city',
      header: 'Location',
      sortable: true,
      render: hub => (
        <div className="flex items-center gap-1.5 text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{hub.city}, {hub.state}</span>
        </div>
      ),
    },
    {
      key: 'occupancy',
      header: 'Storage Capacity',
      sortable: true,
      render: hub => {
        const pct = Math.round((hub.currentOccupancy / hub.capacity) * 100);
        const isNearCap = pct > 85;
        return (
          <div className="w-36">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-medium text-slate-800">{hub.currentOccupancy} / {hub.capacity}</span>
              <span className={`font-bold ${isNearCap ? 'text-amber-600' : 'text-slate-500'}`}>{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isNearCap ? 'bg-amber-500' : 'bg-teal-500'
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'contact',
      header: 'Contact Lead',
      render: hub => (
        <div className="text-slate-600">
          <div className="font-medium text-slate-900">{hub.contactPerson}</div>
          <div className="text-[10px] text-slate-400">{hub.contactPhone}</div>
        </div>
      ),
    },
    {
      key: 'operatingStatus',
      header: 'Operating Status',
      sortable: true,
      render: hub => <StatusBadge status={hub.operatingStatus} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: hub => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/admin/hubs/${hub.id}`)}
            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={e => handleToggleStatus(hub.id, e)}
            className={`p-1 rounded transition-colors ${
              hub.operatingStatus === 'active'
                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title={hub.operatingStatus === 'active' ? 'Deactivate Hub' : 'Activate Hub'}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Hub Network Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure participating stores, micro-fulfillment centers, and regional QA depots.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Add New Hub
        </Button>
      </div>

      {/* Interactive Map Component */}
      <Card>
        <CardHeader
          title="Hyperlocal Network Map & Active Transfer Corridors"
          subtitle="Real-time geographic distribution of hubs and in-transit transfer corridors in Puget Sound region"
        />
        <CardContent className="p-3">
          <HubMap
            hubs={hubs}
            transfers={transfers}
            selectedHubId={selectedHubForMap}
            onSelectHub={hubId => {
              setSelectedHubForMap(hubId);
              navigate(`/admin/hubs/${hubId}`);
            }}
          />
        </CardContent>
      </Card>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Hub Types</option>
            <option value="store">Store</option>
            <option value="access_point">Access Point / MFC</option>
            <option value="warehouse">Warehouse</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Operating Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{filteredHubs.length}</strong> registered hubs
        </div>
      </div>

      {/* Hubs Data Table */}
      <Table
        columns={columns}
        data={filteredHubs}
        keyExtractor={h => h.id}
        isLoading={isLoading}
        searchKeys={['name', 'city', 'type', 'id']}
        searchPlaceholder="Filter hubs by name, city, or ID..."
        pageSize={8}
        onRowClick={hub => navigate(`/admin/hubs/${hub.id}`)}
      />

      {/* Create Hub Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Network Hub"
        description="Add a participating store or distribution node to the HIEN inventory exchange network."
        maxWidth="xl"
      >
        <form onSubmit={handleCreateHub} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Hub Name *"
              required
              placeholder="e.g. Kirkland Waterfront Depot"
              value={formName}
              onChange={e => setFormName(e.target.value)}
            />

            <Select
              label="Hub Facility Type *"
              value={formType}
              onChange={e => setFormType(e.target.value as HubType)}
              options={[
                { value: 'store', label: 'Retail Store with Intake Pod' },
                { value: 'access_point', label: 'Micro-Fulfillment Access Point' },
                { value: 'warehouse', label: 'Regional QA Warehouse' },
              ]}
            />
          </div>

          <Input
            label="Street Address *"
            required
            placeholder="e.g. 102 Central Way"
            value={formAddress}
            onChange={e => setFormAddress(e.target.value)}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City *"
              required
              placeholder="Kirkland"
              value={formCity}
              onChange={e => setFormCity(e.target.value)}
            />
            <Input
              label="State *"
              required
              value={formState}
              onChange={e => setFormState(e.target.value)}
            />
            <Input
              label="Postal Code *"
              required
              placeholder="98033"
              value={formZip}
              onChange={e => setFormZip(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Latitude *"
              required
              type="number"
              step="0.0001"
              value={formLat}
              onChange={e => setFormLat(e.target.value)}
            />
            <Input
              label="Longitude *"
              required
              type="number"
              step="0.0001"
              value={formLng}
              onChange={e => setFormLng(e.target.value)}
            />
            <Input
              label="Unit Capacity *"
              required
              type="number"
              min="1"
              value={formCapacity}
              onChange={e => setFormCapacity(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Contact Person *"
              required
              placeholder="Alex Morgan"
              value={formContact}
              onChange={e => setFormContact(e.target.value)}
            />
            <Input
              label="Phone Number *"
              required
              placeholder="+1 (425) 555-0199"
              value={formPhone}
              onChange={e => setFormPhone(e.target.value)}
            />
            <Input
              label="Email Address *"
              required
              type="email"
              placeholder="alex.m@hien-hub.io"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save and Register Hub
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
