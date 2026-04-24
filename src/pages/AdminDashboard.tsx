import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Users, FileText, CheckCircle, Clock, XCircle, Search, Filter, ArrowRight, Eye, ExternalLink, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, BookOpen, Settings, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface Application {
  id: string;
  userId: string;
  courseApplied: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  documents?: Record<string, string>;
  olevelResults?: { subject: string, grade: string }[];
  createdAt: string;
  user?: {
    fullName: string;
    email: string;
  }
}

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalCount: 0, totalPages: 1, currentPage: 1, limit: 10 });
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const fetchAllApplications = async (currentPage: number, currentFilter: string, currentSearch: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        status: currentFilter,
        search: currentSearch
      });
      const res = await fetch(`/api/admin/applications?${params}`);
      if (res.ok) {
        const result = await res.json();
        setApplications(result.data);
        setMeta(result.meta);
      }
    } catch (err) {
      console.error("Error fetching all applications:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Search Debounce
  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchAllApplications(1, filter, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, filter, isAdmin]);

  // Handle Page Change
  useEffect(() => {
    if (!isAdmin) return;
    fetchAllApplications(page, filter, search);
  }, [page, isAdmin]);

  const updateStatus = async (appId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setApplications(prev => prev.map(app => app.id === appId ? { ...app, status: newStatus } : app));
        if (selectedApp?.id === appId) {
          setSelectedApp(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-slate-500">Only authorized school staff can access the admin dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display mb-2">Admin Control Center</h1>
          <p className="text-slate-500">Review and process student admissions applications.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none mb-1">Results Found</p>
              <p className="text-lg font-bold leading-none">{meta.totalCount}</p>
            </div>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none mb-1">Status View</p>
              <p className="text-lg font-bold leading-none capitalize">{filter}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <button 
          onClick={() => navigate('/admin')} 
          className="p-6 bg-white border border-slate-200 rounded-3xl text-left hover:border-emerald-600 transition-all group"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800">Applications</h3>
          <p className="text-xs text-slate-500">Review student submissions</p>
        </button>
        <button 
          onClick={() => navigate('/admin/programs')} 
          className="p-6 bg-white border border-slate-200 rounded-3xl text-left hover:border-emerald-600 transition-all group"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800">Programs</h3>
          <p className="text-xs text-slate-500">Manage academic courses</p>
        </button>
        <button 
          onClick={() => navigate('/admin/users')} 
          className="p-6 bg-white border border-slate-200 rounded-3xl text-left hover:border-emerald-600 transition-all group"
        >
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800">Users</h3>
          <p className="text-xs text-slate-500">Manage staff and students</p>
        </button>
        <button 
          onClick={() => navigate('/admin/settings')} 
          className="p-6 bg-white border border-slate-200 rounded-3xl text-left hover:border-emerald-600 transition-all group"
          id="admin-settings-card"
        >
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
            <Settings className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800">Settings</h3>
          <p className="text-xs text-slate-500">Portal Branding & Email</p>
        </button>
        <button 
          onClick={() => navigate('/admin/health')} 
          className="p-6 bg-white border border-slate-200 rounded-3xl text-left hover:border-emerald-600 transition-all group"
        >
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-4 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800">Health Check</h3>
          <p className="text-xs text-slate-500">System connectivity status</p>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or course..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-emerald-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all border",
                  filter === f ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/10" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-bold border-b border-slate-100">
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Course Applied</th>
                <th className="px-6 py-4">Date Submitted</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence mode='popLayout'>
                {!loading && applications.map((app) => (
                  <motion.tr 
                    layout
                    key={app.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedApp(app)}
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{app.user?.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono">{app.userId.slice(0, 8)}...</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md font-medium">{app.courseApplied}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {app.createdAt ? format(new Date(app.createdAt), 'MMM d, yyyy') : 'Recently'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        app.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        app.status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-100" :
                        "bg-amber-50 text-amber-700 border-amber-100"
                      )}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setSelectedApp(app)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {app.status === 'PENDING' && (
                          <>
                            <button 
                              onClick={() => updateStatus(app.id, 'APPROVED')}
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => updateStatus(app.id, 'REJECTED')}
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Loading applications...</p>
            </div>
          )}
          {!loading && applications.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-slate-500 text-sm">No applications found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Showing <span className="font-bold text-slate-700">{(meta.currentPage - 1) * meta.limit + 1}</span> to <span className="font-bold text-slate-700">{Math.min(meta.currentPage * meta.limit, meta.totalCount)}</span> of <span className="font-bold text-slate-700">{meta.totalCount}</span> applications
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setPage(1)}
              disabled={page === 1 || loading}
              className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
              className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 px-2">
              <span className="text-xs text-slate-400">Page</span>
              <span className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded-md text-emerald-600 min-w-[2rem] text-center">
                {meta.currentPage}
              </span>
              <span className="text-xs text-slate-400">of {meta.totalPages}</span>
            </div>

            <button 
              onClick={() => setPage(prev => Math.min(meta.totalPages, prev + 1))}
              disabled={page === meta.totalPages || loading}
              className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPage(meta.totalPages)}
              disabled={page === meta.totalPages || loading}
              className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Application Detail Modal */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedApp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    Application Details
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full uppercase border font-bold ml-2",
                      selectedApp.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      selectedApp.status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-100" :
                      "bg-amber-50 text-amber-700 border-amber-100"
                    )}>
                      {selectedApp.status}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">ID: {selectedApp.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedApp(null)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Applicant Info */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Applicant Name</h3>
                    <p className="font-bold text-slate-900">{selectedApp.user?.fullName}</p>
                  </div>
                  <div>
                    <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Program Applied</h3>
                    <p className="font-bold text-emerald-700">{selectedApp.courseApplied}</p>
                  </div>
                </div>

                {/* O'Level Results Section */}
                <div>
                  <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">O'Level Academic Record</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-100/50 border-b border-slate-200">
                          <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-500">Subject</th>
                          <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-500 text-right">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedApp.olevelResults && selectedApp.olevelResults.length > 0 ? (
                          selectedApp.olevelResults.map((res, idx) => (
                            <tr key={idx} className="bg-white">
                              <td className="px-4 py-2 text-sm font-medium text-slate-700">{res.subject}</td>
                              <td className="px-4 py-2 text-sm font-bold text-slate-900 text-right">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px]",
                                  ['A1', 'B2', 'B3'].includes(res.grade) ? "bg-emerald-50 text-emerald-700" :
                                  ['C4', 'C5', 'C6'].includes(res.grade) ? "bg-blue-50 text-blue-700" :
                                  "bg-red-50 text-red-700"
                                )}>
                                  {res.grade}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="px-4 py-8 text-center text-xs text-slate-400 italic">No O'Level results provided manually.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Documents Grid */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Uploaded Documents</h3>
                    {selectedApp.documents && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        {Object.keys(selectedApp.documents).length} File(s)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedApp.documents ? Object.entries(selectedApp.documents).map(([key, url]) => (
                      <div 
                        key={key}
                        className="flex flex-col p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-300 transition-all group"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-200">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 capitalize truncate">{key.replace('_', ' ')}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-tight">Requirement Verified</p>
                          </div>
                        </div>
                        <a 
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open in New Tab
                        </a>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-400 italic">No documents found for this application.</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedApp.status === 'PENDING' && (
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
                  <button 
                    onClick={() => updateStatus(selectedApp.id, 'APPROVED')}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" /> Approve Applicant
                  </button>
                  <button 
                    onClick={() => updateStatus(selectedApp.id, 'REJECTED')}
                    className="flex-1 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" /> Deny Admission
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
