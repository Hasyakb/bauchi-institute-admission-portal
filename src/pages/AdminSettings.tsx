import React, { useState, useEffect } from 'react';
import { useSettings } from '../lib/SettingsContext';
import { Save, Upload, Loader2, CheckCircle2, AlertCircle, Building2, Mail, Info, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function AdminSettings() {
  const { settings, refreshSettings } = useSettings();
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolShortName: '',
    schoolDescription: '',
    contactEmail: '',
    logoUrl: '',
    applicationFee: 5000,
    databaseUrl: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    admissionLetterTemplate: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSmtp, setShowSmtp] = useState(false);
  const [showDb, setShowDb] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (settings) {
      setFormData({
        schoolName: settings.schoolName || '',
        schoolShortName: settings.schoolShortName || '',
        schoolDescription: settings.schoolDescription || '',
        contactEmail: settings.contactEmail || '',
        logoUrl: settings.logoUrl || '',
        databaseUrl: settings.databaseUrl || '',
        applicationFee: settings.applicationFee || 5000,
        smtpHost: settings.smtpHost || '',
        smtpPort: settings.smtpPort || 587,
        smtpUser: settings.smtpUser || '',
        smtpPass: settings.smtpPass || '',
        admissionLetterTemplate: settings.admissionLetterTemplate || ''
      });
    }
  }, [settings]);

  const [testingEmail, setTestingEmail] = useState(false);
  const [testingDb, setTestingDb] = useState(false);

  const testEmail = async () => {
    setTestingEmail(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: formData.smtpHost,
          smtpPort: formData.smtpPort,
          smtpUser: formData.smtpUser,
          smtpPass: formData.smtpPass
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: `${data.error}: ${data.message}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Connection failed' });
    } finally {
      setTestingEmail(false);
    }
  };

  const testDb = async () => {
    if (!formData.databaseUrl) return;
    setTestingDb(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/admin/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseUrl: formData.databaseUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: `${data.error}: ${data.message}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Database connection failed' });
    } finally {
      setTestingDb(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload
      });

      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      setFormData(prev => ({ ...prev, logoUrl: data.url }));
      setMessage({ type: 'success', text: 'Logo uploaded successfully. Save changes to apply.' });
    } catch (err) {
      console.error("Logo upload error:", err);
      setMessage({ type: 'error', text: 'Failed to upload logo.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        await refreshSettings();
        setMessage({ type: 'success', text: 'Settings updated successfully!' });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error updating settings.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Portal Settings</h1>
        <p className="text-slate-500">Configure your institution's identity and contact details.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Institution Full Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={formData.schoolName}
                      onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                      className="input-field pl-10" 
                      placeholder="e.g. Bauchi Institute for Arabic and Islamic Studies"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Short Name / Abbreviation</label>
                  <input 
                    type="text" 
                    value={formData.schoolShortName}
                    onChange={(e) => setFormData(prev => ({ ...prev, schoolShortName: e.target.value }))}
                    className="input-field" 
                    placeholder="e.g. BIAIS"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Support Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      value={formData.contactEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                      className="input-field pl-10" 
                      placeholder="helpdesk@school.edu"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Application Fee (₦)</label>
                  <div className="relative">
                    <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="number" 
                      value={isNaN(formData.applicationFee) ? '' : formData.applicationFee}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setFormData(prev => ({ ...prev, applicationFee: val }));
                      }}
                      className="input-field pl-10" 
                      placeholder="5000"
                      min="0"
                      step="100"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Institution Description</label>
                  <textarea 
                    value={formData.schoolDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, schoolDescription: e.target.value }))}
                    className="input-field min-h-[100px] py-3" 
                    placeholder="Short description displayed on home page and footers..."
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700">Admission Letter Body Text</label>
                    <div className="group relative">
                      <Info className="w-4 h-4 text-slate-400 cursor-help" />
                      <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                        This text appears in the main body of the admission letter for approved applicants. Use clear, welcoming language.
                      </div>
                    </div>
                  </div>
                  <textarea 
                    value={formData.admissionLetterTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, admissionLetterTemplate: e.target.value }))}
                    className="input-field min-h-[120px] py-3 text-sm" 
                    placeholder="Enter the official admission letter text..."
                  />
                  <p className="mt-2 text-[10px] text-slate-400">
                    <strong>Tip:</strong> Keep the tone official and informative.
                  </p>
                </div>
              </div>

              {/* SMTP Settings Collapsible */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <button 
                  type="button"
                  onClick={() => setShowSmtp(!showSmtp)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Email (SMTP) Settings</p>
                      <p className="text-[10px] text-slate-500">Configure how the system sends automated emails.</p>
                    </div>
                  </div>
                  <motion.span animate={{ rotate: showSmtp ? 180 : 0 }}>
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.span>
                </button>

                <AnimatePresence>
                  {showSmtp && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                        <div className="md:col-span-2">
                          <p className="text-[11px] text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4">
                            <strong>Note:</strong> If left empty, the system will log emails to <code>email-logs.txt</code> for development purposes.
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP Host</label>
                          <input 
                            type="text" 
                            value={formData.smtpHost}
                            onChange={(e) => setFormData(prev => ({ ...prev, smtpHost: e.target.value }))}
                            className="input-field text-sm py-2" 
                            placeholder="e.g. smtp.gmail.com"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP Port</label>
                          <input 
                            type="number" 
                            value={isNaN(formData.smtpPort) ? '' : (formData.smtpPort || '')}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                              setFormData(prev => ({ ...prev, smtpPort: val }));
                            }}
                            className="input-field text-sm py-2" 
                            placeholder="587"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP User / Email</label>
                          <input 
                            type="text" 
                            value={formData.smtpUser}
                            onChange={(e) => setFormData(prev => ({ ...prev, smtpUser: e.target.value }))}
                            className="input-field text-sm py-2" 
                            placeholder="portal@school.edu.ng"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP Password</label>
                          <input 
                            type="password" 
                            value={formData.smtpPass}
                            onChange={(e) => setFormData(prev => ({ ...prev, smtpPass: e.target.value }))}
                            className="input-field text-sm py-2" 
                            placeholder="••••••••••••"
                          />
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={testEmail}
                            disabled={testingEmail || !formData.smtpUser || !formData.smtpPass}
                            className="text-xs font-bold bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {testingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                            Test Configuration
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Database Settings Collapsible */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <button 
                  type="button"
                  onClick={() => setShowDb(!showDb)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Database Configuration</p>
                      <p className="text-[10px] text-slate-500">Manage your PostgreSQL connection string for Neon.</p>
                    </div>
                  </div>
                  <motion.span animate={{ rotate: showDb ? 180 : 0 }}>
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.span>
                </button>
 
                <AnimatePresence>
                  {showDb && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 border-t border-slate-100 space-y-4 bg-white">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Neon PostgreSQL URL</label>
                          <div className="relative">
                            <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <input 
                              type="password" 
                              value={formData.databaseUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, databaseUrl: e.target.value }))}
                              className="input-field text-sm py-2 pl-9 pr-10" 
                              placeholder="postgresql://user:pass@host/db..."
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 group cursor-help">
                              <Info className="w-3 h-3 text-slate-300" />
                              <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                                Currently used for connection reference and external integrations.
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-[10px] text-slate-400 leading-relaxed italic">
                            Changing this here updates the reference record. Ensure it matches your deployment environment.
                          </p>
                        </div>
                        
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={testDb}
                            disabled={testingDb || !formData.databaseUrl}
                            className="text-xs font-bold bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {testingDb ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                            Test Database Connection
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {message.text && (
                <div className={cn(
                  "p-4 rounded-xl flex items-center gap-3 text-sm font-medium border",
                  message.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
                )}>
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  {message.text}
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                type="submit" 
                disabled={loading || uploading}
                className="btn-primary px-8 py-3 flex items-center gap-2 shadow-lg shadow-emerald-900/10"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" /> Institution Logo
            </h3>
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl mb-4 flex items-center justify-center overflow-hidden relative group">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="School Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-slate-300 text-center p-4">
                    <Building2 className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-[10px] font-bold uppercase">No Logo</p>
                  </div>
                )}
                
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                )}
              </div>
              
              <label className="w-full">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
                <div className="w-full py-2 bg-white border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                  {formData.logoUrl ? 'Change Logo' : 'Upload Logo'}
                </div>
              </label>
              <p className="mt-3 text-[10px] text-slate-400 text-center">Recommended: PNG or JPG with transparent background (min 200x200px).</p>
            </div>
          </div>

          <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-xl shadow-emerald-900/10">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4 text-white">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="font-bold mb-2">Live Portal Branding</h3>
            <p className="text-xs text-white/80 leading-relaxed mb-6">
              Changes saved here will immediately reflect across the entire portal.
            </p>

            <div className="space-y-4 bg-white/10 p-4 rounded-xl border border-white/20">
              <div className="flex justify-between text-[10px] uppercase font-bold text-white/60">
                <span>Current Identity</span>
                <span>Active</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                  {settings?.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-contain p-1" /> : <div className="text-emerald-700 font-bold">{settings?.schoolShortName?.[0]}</div>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{settings?.schoolName}</p>
                  <p className="text-[10px] text-white/60 truncate">{settings?.contactEmail}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
