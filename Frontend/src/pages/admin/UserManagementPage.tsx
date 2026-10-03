import React, { useState, useEffect } from 'react';
import { UserService } from '../../services/userService';
import { StorageService } from '../../services/storage';
import { User, UserRole } from '../../types';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Plus, UserCheck, Power, Edit3 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmToggleUser, setConfirmToggleUser] = useState<User | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('inspector');
  const [hubId, setHubId] = useState('');

  const { showToast } = useToast();
  const hubs = StorageService.getState().hubs;

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await UserService.getUsers();
    setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('inspector');
    setHubId(hubs[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setHubId(u.assignedHubId || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignedHub = hubs.find(h => h.id === hubId);

    try {
      if (editingUser) {
        await UserService.updateUser(editingUser.id, {
          name,
          email,
          role,
          assignedHubId: hubId || undefined,
          assignedHubName: assignedHub?.name || undefined,
        });
        showToast({ title: 'User Updated', description: `${name} has been updated.`, type: 'success' });
      } else {
        await UserService.createUser({
          name,
          email,
          role,
          assignedHubId: hubId || undefined,
          assignedHubName: assignedHub?.name || undefined,
          status: 'active',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        });
        showToast({ title: 'User Created', description: `Added ${name} to system directory.`, type: 'success' });
      }

      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      showToast({ title: 'Operation Failed', description: err.message, type: 'error' });
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmToggleUser) return;
    try {
      await UserService.toggleUserStatus(confirmToggleUser.id);
      showToast({
        title: 'Status Updated',
        description: `${confirmToggleUser.name} is now ${confirmToggleUser.status === 'active' ? 'INACTIVE' : 'ACTIVE'}.`,
        type: 'info',
      });
      setConfirmToggleUser(null);
      loadUsers();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User Profile',
      sortable: true,
      render: u => (
        <div className="flex items-center gap-3">
          <img
            src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-slate-200"
          />
          <div>
            <span className="font-semibold text-slate-900 block">{u.name}</span>
            <span className="text-[11px] text-slate-400">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      sortable: true,
      render: u => (
        <Badge variant={u.role === 'admin' ? 'purple' : u.role === 'inspector' ? 'warning' : 'info'}>
          {u.role.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'hub',
      header: 'Hub Affiliation',
      render: u => <span className="text-slate-700">{u.assignedHubName || '— (Network-wide)'}</span>,
    },
    {
      key: 'status',
      header: 'Account Status',
      sortable: true,
      render: u => <StatusBadge status={u.status} />,
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      render: u => <span className="text-slate-400 text-[11px]">{u.lastActive}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: u => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(u)}
            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Edit User"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setConfirmToggleUser(u)}
            className={`p-1 rounded transition-colors ${
              u.status === 'active' ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title={u.status === 'active' ? 'Deactivate User' : 'Activate User'}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            User Directory & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage mock user accounts, role-based authorization scopes, and designated hub assignments.
          </p>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
          Create User
        </Button>
      </div>

      <Table
        columns={columns}
        data={users}
        keyExtractor={u => u.id}
        isLoading={isLoading}
        searchKeys={['name', 'email', 'role', 'assignedHubName']}
        searchPlaceholder="Search users by name, email, or role..."
        pageSize={8}
      />

      {/* Edit/Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User Credentials & Role' : 'Create New System User'}
        description="Demo configuration. Roles control operational views and authorization checks across the app."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            required
            placeholder="e.g. Dr. Maya Lin"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <Input
            label="Email Address *"
            required
            type="email"
            placeholder="maya.lin@hien-network.io"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <Select
            label="System Role Scope *"
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            options={[
              { value: 'admin', label: 'Platform Administrator (Full Oversight)' },
              { value: 'inspector', label: 'Return Inspection Officer (QA & Condition Verification)' },
              { value: 'hub_manager', label: 'Store / Hub Manager (Local Inventory & Fulfillment)' },
              { value: 'logistics', label: 'Logistics Operator (Dispatch & In-Transit Fleets)' },
              { value: 'analytics_viewer', label: 'Analytics Viewer (Read-only Sustainability Impact)' },
            ]}
          />

          <Select
            label="Assigned Hub (Optional)"
            value={hubId}
            onChange={e => setHubId(e.target.value)}
            options={[
              { value: '', label: '— No specific hub (Network wide) —' },
              ...hubs.map(h => ({ value: h.id, label: `${h.name} (${h.city})` })),
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for user activation toggle */}
      <ConfirmDialog
        isOpen={Boolean(confirmToggleUser)}
        onClose={() => setConfirmToggleUser(null)}
        onConfirm={handleToggleStatus}
        title={confirmToggleUser?.status === 'active' ? 'Deactivate User Account' : 'Reactivate User Account'}
        message={`Are you sure you want to ${
          confirmToggleUser?.status === 'active' ? 'deactivate' : 'reactivate'
        } ${confirmToggleUser?.name}'s account? Inactive users cannot initiate or sign off on network actions.`}
        isDestructive={confirmToggleUser?.status === 'active'}
        confirmLabel={confirmToggleUser?.status === 'active' ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
};
