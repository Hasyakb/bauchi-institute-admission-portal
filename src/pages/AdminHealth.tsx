import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Database, Mail, HardDrive, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface HealthChecks {
  database?: { status: string; type?: string; message?: string };
  email?: { status: string; host?: string; message?: string };
  firebase?: { status: string };
  storage?: { status: string };
}

export default function AdminHealth() {
  const [checks, setChecks] = useState<HealthChecks | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/health-check');
      if (res.ok) {
        const data = await res.json();
        setChecks(data);
      }
    } catch (err) {
      console.error("Health check failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'OK' || status === 'CONFIGURED' || status === 'INITIALIZED' || status === 'WRITABLE') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    }
    if (status === 'LOG_ONLY') {
      return <Activity className="w-5 h-5 text-blue-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
            System Diagnostics
          </h1>
          <p className="text-slate-500">Real-time health status of portal infrastructure.</p>
        </div>
        <button 
          onClick={fetchHealth} 
          disabled={loading}
          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Check */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Database className="w-5 h-5" />
            </div>
            {checks && <StatusIcon status={checks.database?.status || ''} />}
          </div>
          <h3 className="font-bold text-slate-900 mb-1">Primary Database</h3>
          <p className="text-xs text-slate-500 mb-4">Prisma ORM connection status.</p>
          
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            {loading ? (
              <div className="animate-pulse flex space-y-2 flex-col">
                <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                <div className="h-2 bg-slate-200 rounded w-3/4"></div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-slate-700">{checks?.database?.status === 'OK' ? 'Connected' : 'Disconnected'}</p>
                <p className="text-[10px] text-slate-400 mt-1">{checks?.database?.type || checks?.database?.message || 'N/A'}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Email Check */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Mail className="w-5 h-5" />
            </div>
            {checks && <StatusIcon status={checks.email?.status || ''} />}
          </div>
          <h3 className="font-bold text-slate-900 mb-1">Email Service</h3>
          <p className="text-xs text-slate-500 mb-4">SMTP configuration & connectivity.</p>
          
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            {loading ? (
              <div className="animate-pulse flex space-y-2 flex-col">
                <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                <div className="h-2 bg-slate-200 rounded w-3/4"></div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-slate-700">
                  {checks?.email?.status === 'CONFIGURED' ? 'SMTP Active' : checks?.email?.status === 'LOG_ONLY' ? 'Logging mode' : 'Error'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{checks?.email?.host || checks?.email?.message || 'No SMTP host'}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Firebase Check */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L4 22L12 18L20 22L12 2Z" />
              </svg>
            </div>
            {checks && <StatusIcon status={checks.firebase?.status || ''} />}
          </div>
          <h3 className="font-bold text-slate-900 mb-1">Firebase Admin</h3>
          <p className="text-xs text-slate-500 mb-4">Google Auth & Admin SDK initialization.</p>
          
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            {loading ? (
              <div className="animate-pulse flex space-y-2 flex-col">
                <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                <div className="h-2 bg-slate-200 rounded w-3/4"></div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-slate-700">{checks?.firebase?.status === 'INITIALIZED' ? 'Initialized' : 'Not setup'}</p>
                <p className="text-[10px] text-slate-400 mt-1">Required for Google SSO and Security Rules.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Storage Check */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <HardDrive className="w-5 h-5" />
            </div>
            {checks && <StatusIcon status={checks.storage?.status || ''} />}
          </div>
          <h3 className="font-bold text-slate-900 mb-1">Local Storage</h3>
          <p className="text-xs text-slate-500 mb-4">File system write permissions.</p>
          
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            {loading ? (
              <div className="animate-pulse flex space-y-2 flex-col">
                <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                <div className="h-2 bg-slate-200 rounded w-3/4"></div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-slate-700">{checks?.storage?.status === 'WRITABLE' ? 'Read/Write OK' : 'Read Only'}</p>
                <p className="text-[10px] text-slate-400 mt-1">Ensures student document uploads work correctly.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="mt-12 bg-emerald-600 text-white rounded-3xl p-8 shadow-xl shadow-emerald-900/10">
        <h3 className="text-xl font-bold mb-4">Test Representative Flows</h3>
        <p className="text-emerald-50 mb-8 max-w-2xl">
          The best way to "test" the application is to walk through the primary student journey. 
          Use an incognito window to simulate a new applicant.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-3">1</div>
            <h4 className="font-bold text-sm mb-2">Registration</h4>
            <p className="text-[10px] text-emerald-100 leading-relaxed italic">
              Create a test account with a real email to verify the welcome notification.
            </p>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-3">2</div>
            <h4 className="font-bold text-sm mb-2">Application</h4>
            <p className="text-[10px] text-emerald-100 leading-relaxed italic">
              Fill the application form and upload test PDF/JPG documents.
            </p>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-3">3</div>
            <h4 className="font-bold text-sm mb-2">Admin Review</h4>
            <p className="text-[10px] text-emerald-100 leading-relaxed italic">
              Switch to your Admin account and approve the application to test the offer letter logic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
