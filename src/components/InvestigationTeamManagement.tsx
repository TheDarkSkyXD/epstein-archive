import React, { useState } from 'react';
import { Investigation, Investigator } from '../types/investigation';
// TODO: Add team member feature - see UNUSED_VARIABLES_RECOMMENDATIONS.md
import {
  Users,
  Plus as _Plus,
  Mail,
  UserPlus,
  Crown,
  Shield,
  User as _User,
  Building,
  Eye,
} from 'lucide-react';
import { useToasts } from './ToastProvider';

interface InvestigationTeamManagementProps {
  investigation: Investigation;
  currentUser: Investigator;
  onTeamUpdate: (investigation: Investigation) => void;
}

export const InvestigationTeamManagement: React.FC<InvestigationTeamManagementProps> = ({
  investigation,
  currentUser,
  onTeamUpdate,
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'researcher' | 'analyst' | 'reviewer'>('researcher');
  const [inviteMessage, setInviteMessage] = useState('');
  const { addToast } = useToasts();

  // Ensure current user is first author if team is empty
  const ensureFirstAuthor = () => {
    if (investigation.team.length === 0) {
      const firstAuthor: Investigator = {
        id: currentUser.id,
        name: currentUser.name || 'Unknown Investigator',
        email: currentUser.email,
        role: 'lead',
        permissions: ['read', 'write', 'admin'],
        joinedAt: new Date(),
        organization: currentUser.organization,
        expertise: currentUser.expertise || [],
        status: 'active',
      };

      const updatedInvestigation = {
        ...investigation,
        team: [firstAuthor],
        leadInvestigator: currentUser.id,
      };

      onTeamUpdate(updatedInvestigation);
      return true;
    }
    return false;
  };

  // Auto-populate first author on component mount
  React.useEffect(() => {
    ensureFirstAuthor();
  }, []);

  // Handle email invitation
  const handleEmailInvitation = async (
    email: string,
    role: 'researcher' | 'analyst' | 'reviewer',
    message?: string,
  ) => {
    try {
      // Call API to send invitation
      const response = await fetch('/api/investigations/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investigationId: investigation.id,
          email,
          role,
          message,
          invitedBy: currentUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      const result = await response.json();

      // Create a pending member while waiting for acceptance
      const invitedMember: Investigator = {
        id: result.invitationId || `invited-${Date.now()}`,
        name: email.split('@')[0], // Temporary name from email
        email: email,
        role: role,
        permissions: getRolePermissions(role),
        joinedAt: new Date(),
        organization: '',
        expertise: [],
        status: 'pending',
      };

      const updatedInvestigation = {
        ...investigation,
        team: [...investigation.team, invitedMember],
      };

      onTeamUpdate(updatedInvestigation);

      return true;
    } catch (error) {
      console.error('Error sending invitation:', error);
      return false;
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;

    // Send email invitation
    const success = await handleEmailInvitation(inviteEmail, inviteRole, inviteMessage);

    if (success) {
      // Reset form
      setInviteEmail('');
      setInviteRole('researcher');
      setInviteMessage('');
      setShowInviteModal(false);

      // Show success message
      addToast({
        text: `Invitation sent to ${inviteEmail}. They will be added to the team once they accept.`,
        type: 'success',
      });
    } else {
      addToast({ text: 'Failed to send invitation. Please try again.', type: 'error' });
    }
  };

  const getRolePermissions = (role: string): string[] => {
    switch (role) {
      case 'lead':
        return ['read', 'write', 'admin'];
      case 'researcher':
      case 'analyst':
        return ['read', 'write'];
      case 'reviewer':
        return ['read', 'comment'];
      case 'external':
        return ['read'];
      default:
        return ['read'];
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'lead':
        return Crown;
      case 'researcher':
        return User;
      case 'analyst':
        return Shield;
      case 'reviewer':
        return Eye;
      default:
        return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'lead':
        return 'text-yellow-400 bg-yellow-900/30';
      case 'researcher':
        return 'text-blue-400 bg-blue-900/30';
      case 'analyst':
        return 'text-green-400 bg-green-900/30';
      case 'reviewer':
        return 'text-purple-400 bg-purple-900/30';
      default:
        return 'text-gray-400 bg-gray-900/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Investigation Team</h3>
          <p className="text-sm text-slate-400 mt-1">Manage team members and their permissions</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Team Lead Info */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-white font-medium">Lead Investigator</p>
            <p className="text-slate-400 text-sm">
              {investigation.team.find((member) => member.id === investigation.leadInvestigator)
                ?.name || investigation.leadInvestigator}
            </p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="space-y-4">
        {investigation.team.map((member) => {
          const RoleIcon = getRoleIcon(member.role);
          const roleColorClass = getRoleColor(member.role);

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border ${roleColorClass}`}
                >
                  <RoleIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-medium text-white">{member.name}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${roleColorClass}`}>
                      {member.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </div>
                    {member.organization && (
                      <div className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {member.organization}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Joined {member.joinedAt.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  {member.permissions.map((permission) => (
                    <span key={permission} className="px-2 py-1 bg-slate-700 rounded">
                      {permission}
                    </span>
                  ))}
                </div>
                {member.role !== 'lead' && (
                  <div className="flex gap-2 mt-2">
                    <button className="text-xs text-blue-400 hover:text-blue-300">
                      Manage Permissions
                    </button>
                    {member.status === 'pending' && (
                      <span className="text-xs text-yellow-400">Pending acceptance</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Invite Team Member</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <Users className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="researcher">Researcher</option>
                  <option value="analyst">Analyst</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="external">External Consultant</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a personal message to the invitation..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-t border-slate-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteMember}
                disabled={!inviteEmail.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
