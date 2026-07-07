'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Video, Shield, RefreshCw, Activity, Search, ArrowLeft, UserPlus, Pencil, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import {
  dashboardService,
  DashboardStats,
  MeetingHistoryItem,
  RecentMeeting,
  TopUser
} from '@/services/dashboardService';

// Dashboard Components
import { StatCard } from '@/components/admin/StatCard';
import { MeetingChart } from '@/components/admin/MeetingChart';
import { RecentMeetingsTable } from '@/components/admin/RecentMeetingsTable';
import { TopUsersList } from '@/components/admin/TopUsersList';
import { UserFormModal } from '@/components/admin/UserFormModal';

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<MeetingHistoryItem[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Pagination State
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [meetingPage, setMeetingPage] = useState(1);
  const [meetingTotalPages, setMeetingTotalPages] = useState(1);
  const [meetingSearch, setMeetingSearch] = useState('');
  const [meetingStatusFilter, setMeetingStatusFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tab, setTab] = useState<'analytics' | 'users' | 'meetings'>('analytics');

  // User directory search & filter state
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff'>('all');

  // User form modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/users', {
        params: { page: userPage, limit: 10, search: userSearch, role: roleFilter }
      });
      setUsers(res.data.data || []);
      setUserTotalPages(res.data.totalPages || 1);
      setUserTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRecentMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const res = await dashboardService.getRecentMeetings(meetingPage, 10, meetingSearch, meetingStatusFilter);
      setRecentMeetings(res.data || []);
      setMeetingTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch recent meetings:', err);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, h, t] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getMeetingHistory(30),
        dashboardService.getTopUsers(5),
      ]);
      setStats(s);
      setHistory(h);
      setTopUsers(t);
    } catch (err) {
      console.error('Failed to fetch admin dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [userPage, userSearch, roleFilter]);

  useEffect(() => {
    fetchRecentMeetings();
  }, [meetingPage, meetingSearch, meetingStatusFilter]);

  // Deprecated: We use backend filtering now

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user? This will revoke all access.')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter(u => u._id !== id));
    } catch (err) {
      alert('Failed to remove user.');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const mRemaining = m % 60;
    return `${h}h ${mRemaining}m ${s}s`;
  };

  const handleExportLogs = async () => {
    setExporting(true);
    try {
      const response = await dashboardService.getRecentMeetings(1, 100);
      const meetingsToExport = response.data;
      const headers = ['Meeting ID', 'Title', 'Status', 'Host ID', 'Meeting Code', 'Duration', 'Created At', 'Max Participants'];
      
      const csvRows = [
        headers.join(','),
        ...meetingsToExport.map(meeting => {
          const titleEscaped = `"${meeting.title.replace(/"/g, '""')}"`;
          return [
            meeting._id,
            titleEscaped,
            meeting.status,
            meeting.hostId,
            meeting.meetingCode,
            formatDuration(meeting.duration),
            meeting.createdAt,
            meeting.maxParticipants
          ].join(',');
        })
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `vma_system_meeting_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export system logs:', err);
      alert('Failed to export system logs.');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setIsUserModalOpen(true);
  };

  const handleUserModalSuccess = () => {
    fetchUsers();
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-10">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative flex items-center gap-4">
          {/* Go Back Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="relative z-10 p-2.5 sm:p-3 rounded-xl border border-border bg-white hover:bg-muted shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
          <div>
            <div className="absolute -top-6 -left-6 w-20 h-20 bg-primary/10 rounded-full blur-3xl animate-pulse pointer-events-none -z-10" />
            <h1 className="text-2xl sm:text-4xl font-black text-foreground uppercase tracking-tighter relative flex items-center gap-3">
              Admin <span className="text-primary">Console</span>
            </h1>
            <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] mt-1">
              OmniSuiteAI Platform Intelligence • AU Regional Data
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            className="rounded-full border-border bg-white hover:bg-muted shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={handleExportLogs}
            disabled={exporting}
            className="hidden sm:flex gap-2 font-black uppercase tracking-widest text-[10px]"
          >
            {exporting ? 'Exporting...' : 'Export System Logs'}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 p-1 bg-muted/60 border border-border rounded-2xl w-full sm:w-fit justify-center sm:justify-start">
          {[
            { id: 'analytics', label: 'Analytics', icon: Activity },
            { id: 'users', label: 'User Directory', icon: Users },
            { id: 'meetings', label: 'Session Logs', icon: Video },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all ${tab === item.id
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:text-primary hover:bg-muted/40'
                }`}
            >
              <item.icon className="h-3 w-3" />
              {item.label}
            </button>
          ))}
        </div>

        {loading && !stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-32 glass-card bg-card border-border rounded-2xl" />)}
          </div>
        ) : (
          <div className="animate-fade-in-up">
            {tab === 'analytics' && (
              <div className="space-y-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    label="Platform Users"
                    value={stats?.users.total || 0}
                    icon={Users}
                    description={`${stats?.users.active || 0} ACTIVE SEATS`}
                  />
                  <StatCard
                    label="Active Sessions"
                    value={stats?.realtime.activeRooms || 0}
                    icon={Activity}
                    color="text-primary"
                    description={`${stats?.realtime.participantsOnline || 0} PARTICIPANTS`}
                  />
                  <StatCard
                    label="Total Meetings"
                    value={stats?.meetings.total || 0}
                    icon={Video}
                    color="text-blue-600"
                    description={`${stats?.meetings.ended || 0} COMPLETED`}
                  />
                  <StatCard
                    label="Live Capacity"
                    value="100"
                    icon={Shield}
                    color="text-amber-500"
                    description="MAX CONCURRENT"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Chart Section */}
                  <div className="lg:col-span-2">
                    <MeetingChart data={history} />
                  </div>

                  {/* Top Users Section */}
                  <div className="lg:col-span-1">
                    <TopUsersList users={topUsers} />
                  </div>
                </div>

                {/* Recent Activity Mini Table */}
                <RecentMeetingsTable 
                  meetings={recentMeetings.slice(0, 5)} 
                  // No pagination for mini table on dashboard
                />
              </div>
            )}

            {tab === 'users' && (
              <div className="glass-card rounded-3xl overflow-hidden border-border bg-card relative shadow-sm">
                <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-foreground uppercase">Staff <span className="text-primary">Directory</span></h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Manage User Access & Roles</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Search Input */}
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        placeholder="SEARCH STAFF..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="bg-muted/40 border border-border rounded-full pl-10 pr-6 py-2 text-[10px] font-bold text-foreground uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all min-w-[200px]"
                      />
                    </div>

                    {/* Role Filter */}
                    <div className="relative">
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as any)}
                        className="appearance-none bg-muted/40 border border-border rounded-full pl-4 pr-10 py-2 text-[10px] font-black text-foreground uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                      >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* Add User Button */}
                    <Button
                      size="sm"
                      onClick={handleOpenAddUser}
                      className="rounded-full gap-1.5 text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/10"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add User
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
                        <th className="text-left p-6">Staff Member</th>
                        <th className="text-left p-6">Identity Status</th>
                        <th className="text-left p-6">Platform Role</th>
                        <th className="text-right p-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-muted-foreground font-bold text-sm">
                            Loading users...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <Users className="h-10 w-10 text-muted-foreground/40" />
                              <p className="text-sm font-bold text-muted-foreground">
                                {userSearch || roleFilter !== 'all' ? 'No users match your search criteria' : 'No users found'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        users.map((u: any) => (
                          <tr key={u._id} className="hover:bg-muted/20 transition-colors group">
                            <td className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center font-black text-primary border border-border group-hover:border-primary/30 transition-all duration-500 transform group-hover:scale-105">
                                  {u.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-foreground font-bold tracking-tight text-base">{u.name}</div>
                                  <div className="text-xs text-muted-foreground font-medium">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${u.isActive !== false ? 'bg-primary shadow-[0_0_8px_var(--color-primary)]' : 'bg-slate-400'}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  {u.isActive !== false ? 'Verified Active' : 'Deactivated'}
                                </span>
                              </div>
                            </td>
                            <td className="p-6">
                              <span className={`text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-tighter ${u.role === 'admin'
                                ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm'
                                : 'bg-muted text-muted-foreground border border-border'
                                }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all p-2.5 rounded-xl border border-transparent hover:border-primary/20"
                                  title="Edit User"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteUser(u._id)}
                                  className="text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-all p-2.5 rounded-xl border border-transparent hover:border-rose-600/20"
                                  title="Revoke Access"
                                >
                                  <Shield className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Results count and Pagination */}
                <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Showing {users.length} {userTotal > users.length ? `of ${userTotal}` : ''} users {userSearch || roleFilter !== 'all' ? '(filtered)' : ''}
                  </p>
                  
                  {userTotalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUserPage(userPage - 1)}
                        disabled={userPage <= 1}
                        className="px-3 py-1.5 rounded-lg border border-border bg-card text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Prev
                      </button>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">
                        {userPage} / {userTotalPages}
                      </span>
                      <button
                        onClick={() => setUserPage(userPage + 1)}
                        disabled={userPage >= userTotalPages}
                        className="px-3 py-1.5 rounded-lg border border-border bg-card text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'meetings' && (
              <RecentMeetingsTable 
                meetings={recentMeetings} 
                currentPage={meetingPage}
                totalPages={meetingTotalPages}
                onPageChange={setMeetingPage}
                search={meetingSearch}
                onSearchChange={setMeetingSearch}
                statusFilter={meetingStatusFilter}
                onStatusFilterChange={setMeetingStatusFilter}
                showFilters={true}
              />
            )}
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={handleUserModalSuccess}
        editUser={editingUser}
      />
    </div>
  );
}
