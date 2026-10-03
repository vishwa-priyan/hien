import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Eye, EyeOff, ArrowRight, UserCheck, Sparkles } from 'lucide-react';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('sarah.chen@hien-network.io');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await login(email, password);
    setIsLoading(false);
    navigate('/admin/dashboard');
  };

  const handleQuickRole = async (role: UserRole, targetRoute: string) => {
    setIsLoading(true);
    await switchRole(role);
    setIsLoading(false);
    navigate(targetRoute);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-teal-500 selection:text-slate-900">
      {/* Brand logo & tagline */}
      <div className="mb-8 text-center max-w-md">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500 text-slate-950 font-black text-2xl shadow-xl shadow-teal-500/20 mb-4">
          HI
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          HIEN Platform
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
          Hyperlocal Inventory Exchange Network & AI Reverse-Logistics Decision Layer
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">Sign In to Workspace</h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose a demo profile or enter test credentials to explore the system.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Access Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Sign In to System</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Role Logins */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1-Click Demo Profiles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickRole('admin', '/admin/dashboard')}
              className="p-2.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-left transition-all group"
            >
              <div className="font-semibold text-slate-900 group-hover:text-teal-700">Platform Admin</div>
              <div className="text-[10px] text-slate-500">Sarah Chen (Network Oversight)</div>
            </button>

            <button
              onClick={() => handleQuickRole('inspector', '/inspection/dashboard')}
              className="p-2.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-left transition-all group"
            >
              <div className="font-semibold text-slate-900 group-hover:text-teal-700">Return Inspector</div>
              <div className="text-[10px] text-slate-500">Marcus Vance (Seattle QA)</div>
            </button>

            <button
              onClick={() => handleQuickRole('hub_manager', '/hub/dashboard')}
              className="p-2.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-left transition-all group"
            >
              <div className="font-semibold text-slate-900 group-hover:text-teal-700">Store / Hub Manager</div>
              <div className="text-[10px] text-slate-500">Elena Rostova (Bellevue)</div>
            </button>

            <button
              onClick={() => handleQuickRole('logistics', '/logistics/dashboard')}
              className="p-2.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-left transition-all group"
            >
              <div className="font-semibold text-slate-900 group-hover:text-teal-700">Logistics Operator</div>
              <div className="text-[10px] text-slate-500">David Kim (Tacoma Fleet)</div>
            </button>
          </div>

          <div className="mt-2">
            <button
              onClick={() => handleQuickRole('analytics_viewer', '/analytics/impact')}
              className="w-full p-2 rounded-lg border border-dashed border-slate-200 hover:border-slate-400 text-center text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Enter as Read-Only <strong>Sustainability Analyst</strong> (Dr. Pendelton)
            </button>
          </div>
        </div>
      </div>

      <p className="text-slate-500 text-xs mt-6 text-center max-w-sm">
        HIEN System v1.0. All ML inferences and CNN condition evaluations are processed via FastAPI backend.
      </p>
    </div>
  );
};
