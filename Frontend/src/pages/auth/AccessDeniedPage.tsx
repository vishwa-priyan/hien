import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const AccessDeniedPage: React.FC = () => {
  const { currentRole, switchRole } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
      <p className="text-xs text-slate-500 max-w-md mt-1 mb-6 leading-relaxed">
        Your current active role (<span className="font-semibold text-slate-800">{currentRole.toUpperCase()}</span>) does not have authorization to view this section.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={async () => {
            await switchRole('admin');
            navigate('/admin/dashboard');
          }}
        >
          Switch to Platform Admin
        </Button>
      </div>
    </div>
  );
};
