import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  Search,
  X,
  Check,
  AlertTriangle,
  Lock,
  LogOut,
  Activity,
  Server,
  Database,
  FileText,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  username: string;
  email: string | null;
  role: 'admin' | 'investigator' | 'viewer';
  created_at: string;
  last_active: string | null;
}

interface AuditLogEntry {
  id: number;
  user_id: string;
  performed_by?: string;
  action: string;
  object_type: string;
  object_id: string | null;
  payload: any;
  timestamp: string;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  uptime: number;
  database: string;
  data: {
    entities: number;
    documents: number;
  };
  environment: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'system'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  // TODO: Display error messages in UI - see UNUSED_VARIABLES_RECOMMENDATIONS.md
  const [_error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    username: string;
    email: string;
    password: string;
    role: 'admin' | 'investigator' | 'viewer';
  }>({
    username: '',
    email: '',
    password: '',
    role: 'investigator',
  });

  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    // Pre-fetch health
    fetchHealth();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout();
      navigate('/login');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await fetch('/api/admin/audit-logs?limit=200');
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setUsers([...users, data]);
      closeModal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updateData: any = {
        role: formData.role,
        email: formData.email,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error('Failed to update user');

      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...updateData } : u)));
      closeModal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      setUsers(users.filter((u) => u.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'investigator',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || '',
      password: '', // Don't show existing hash
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-500" />
              Admin Dashboard
            </h1>
            <p className="text-slate-400 mt-1">Manage users, permissions, and system access</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users size={18} />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity size={18} />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'system'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Server size={18} />
            System Health
          </button>
        </div>

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-medium">Total Users</h3>
                  <Users className="text-blue-500 w-5 h-5" />
                </div>
                <div className="text-3xl font-bold text-slate-100">{users.length}</div>
              </div>
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-medium">Admins</h3>
                  <Shield className="text-purple-500 w-5 h-5" />
                </div>
                <div className="text-3xl font-bold text-slate-100">
                  {users.filter((u) => u.role === 'admin').length}
                </div>
              </div>
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-medium">Active (24h)</h3>
                  <Check className="text-green-500 w-5 h-5" />
                </div>
                <div className="text-3xl font-bold text-slate-100">
                  {/* Mock for now, rely on last_active if parsed correctly */}
                  {
                    users.filter((u) => {
                      if (!u.last_active) return false;
                      const date = new Date(u.last_active);
                      return new Date().getTime() - date.getTime() < 24 * 60 * 60 * 1000;
                    }).length
                  }
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-100">Users</h2>
                <div className="flex items-center gap-3 w-full max-w-xl justify-end">
                  <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20 whitespace-nowrap"
                  >
                    <UserPlus size={18} />
                    <span>Add User</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 text-slate-400 text-sm border-b border-slate-800">
                      <th className="px-6 py-3 font-medium">User</th>
                      <th className="px-6 py-3 font-medium">Role</th>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Last Active</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                          Loading users...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-medium text-sm">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="font-medium text-slate-200">{user.username}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                user.role === 'admin'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  : user.role === 'investigator'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-slate-700/50 text-slate-300 border-slate-600/50'
                              }`}
                            >
                              {user.role === 'admin' && <Shield size={12} />}
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-sm">{user.email || '-'}</td>
                          <td className="px-6 py-4 text-slate-400 text-sm">
                            {user.last_active
                              ? new Date(user.last_active).toLocaleString()
                              : 'Never'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(user)}
                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Edit User"
                              >
                                <Edit2 size={16} />
                              </button>
                              {user.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- AUDIT TAB --- */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden animate-in fade-in duration-300">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Activity className="text-blue-400 w-5 h-5" />
                Audit Logs
              </h2>
              <button
                onClick={fetchAuditLogs}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                title="Refresh"
              >
                <RefreshCw size={18} className={auditLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-950 text-slate-400 text-sm border-b border-slate-800">
                    <th className="px-6 py-3 font-medium">Timestamp</th>
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                    <th className="px-6 py-3 font-medium">Target</th>
                    <th className="px-6 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditLoading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        Loading logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-800/30">
                        <td className="px-6 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-300">
                          {log.performed_by || log.user_id}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {log.object_type}{' '}
                          {log.object_id && (
                            <span className="text-slate-500">#{log.object_id.substring(0, 8)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono text-xs max-w-md truncate">
                          {JSON.stringify(log.payload)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- SYSTEM TAB --- */}
        {activeTab === 'system' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="text-green-500" />
                  <h3 className="text-slate-400 text-sm font-medium">Status</h3>
                </div>
                <div className="text-2xl font-bold text-white uppercase">
                  {health?.status || 'Unknown'}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Uptime: {health ? (health.uptime / 3600).toFixed(1) : 0} hrs
                </p>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <Database className="text-blue-500" />
                  <h3 className="text-slate-400 text-sm font-medium">Database</h3>
                </div>
                <div className="text-2xl font-bold text-white uppercase">
                  {health?.database || 'Unknown'}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Entities: {health?.data?.entities?.toLocaleString()}
                </p>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="text-orange-500" />
                  <h3 className="text-slate-400 text-sm font-medium">Documents</h3>
                </div>
                <div className="text-2xl font-bold text-white">
                  {health?.data?.documents?.toLocaleString() || 0}
                </div>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <Cpu className="text-purple-500" />
                  <h3 className="text-slate-400 text-sm font-medium">Environment</h3>
                </div>
                <div className="text-sm font-mono text-white bg-slate-950 p-2 rounded">
                  {health?.environment || 'unknown'}
                </div>
              </div>
            </div>

            {/* Add more system controls here later */}
            <div className="bg-amber-900/10 border border-amber-900/30 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-amber-500 mt-0.5" />
              <div>
                <h4 className="text-amber-400 font-medium">System Maintenance</h4>
                <p className="text-amber-500/80 text-sm mt-1">
                  Advanced system operations (re-indexing, cache clearing) are currently handled via
                  CLI scripts. Do not attempt to modify production database directly while server is
                  running.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-semibold text-slate-100">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingUser ? handleUpdate : handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingUser}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  {editingUser ? 'New Password (leave blank to keep)' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none"
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none"
                >
                  <option value="viewer">Viewer (Read Only)</option>
                  <option value="investigator">Investigator (Can Edit)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
