import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';
import { Book, Send, Loader2, Upload, AlertCircle, CheckCircle2, FileUp, CreditCard, Info, Wallet, Eye, FileIcon, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePaystackPayment } from 'react-paystack';

const REQUIRED_DOCS = [
  { id: 'waec', label: 'WAEC/NECO Result' },
  { id: 'passport', label: 'Passport Photograph' },
  { id: 'indigene', label: 'LGA Indigene Letter' },
  { id: 'birth', label: 'Birth Certificate' }
];

function DocumentCard({ 
  doc, 
  file, 
  status, 
  onFileChange 
}: { 
  doc: typeof REQUIRED_DOCS[0], 
  file: File | undefined | null, 
  status: string | undefined, 
  onFileChange: (id: string, file: File | null) => void 
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  return (
    <div className="relative group">
      <label className={cn(
        "flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all h-40 text-center relative overflow-hidden",
        file ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-emerald-300"
      )}>
        <input 
          type="file" 
          className="hidden" 
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => onFileChange(doc.id, e.target.files ? e.target.files[0] : null)}
        />
        
        {file ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {previewUrl ? (
              <div className="absolute inset-0 w-full h-full p-2">
                <img 
                  src={previewUrl} 
                  alt={doc.label} 
                  className="w-full h-full object-cover rounded-lg shadow-sm border border-emerald-100" 
                />
                <div className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                  <div className="flex gap-2">
                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-2">
                  <FileIcon className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-bold text-slate-700 truncate w-full px-2">{file.name}</p>
                <p className="text-[9px] text-blue-500 mt-1 uppercase font-bold">PDF Document</p>
              </div>
            )}
            
            <div className={cn(
              "absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tight shadow-sm z-20",
              previewUrl ? "bg-white text-emerald-700" : "bg-emerald-600 text-white"
            )}>
              {doc.label}
            </div>

            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFileChange(doc.id, null);
              }}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <FileUp className="w-8 h-8 text-slate-400 mb-2 group-hover:text-emerald-500 transition-colors" />
            <p className="text-xs font-bold text-slate-700">{doc.label}</p>
            <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">Click to browse files</p>
          </>
        )}
        
        {status === 'uploading' && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-40">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        )}
      </label>
    </div>
  );
}

export default function ApplicationForm() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [course, setCourse] = useState('');
  const [courses, setCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [error, setError] = useState('');
  const [activeAppExists, setActiveAppExists] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [files, setFiles] = useState<Record<string, File>>({});
  const [uploadingStatus, setUploadingStatus] = useState<Record<string, 'idle' | 'uploading' | 'success' | 'error'>>({});

  const paystackConfig = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || '',
    amount: (settings?.applicationFee || 5000) * 100, // Amount is in kobo
    publicKey: (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || '',
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch('/api/programs');
        if (res.ok) {
          const data = await res.json();
          setCourses(data.map((p: any) => p.name));
        }
      } catch (err) {
        console.error("Error fetching courses:", err);
      } finally {
        setFetchingCourses(false);
      }
    };

    const checkExistingApp = async () => {
      try {
        const res = await fetch('/api/applications/my');
        if (res.ok) {
          const data = await res.json();
          const hasActiveApp = data.some((app: any) => app.status === 'PENDING' || app.status === 'APPROVED');
          setActiveAppExists(hasActiveApp);
        }
      } catch (err) {
        console.error("Error checking existing applications:", err);
      }
    };

    fetchCourses();
    checkExistingApp();
  }, []);

  const handleFileChange = (id: string, file: File | null) => {
    if (file) {
      setFiles(prev => ({ ...prev, [id]: file }));
      setUploadingStatus(prev => ({ ...prev, [id]: 'idle' }));
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !course) {
      setError('Please select a course to proceed.');
      return;
    }
    if (currentStep === 2 && Object.keys(files).length < REQUIRED_DOCS.length) {
      setError('Please provide all required documents.');
      return;
    }
    setError('');
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handlePaymentSuccess = (reference: any) => {
    console.log("Payment successful:", reference);
    setPaymentRef(reference.reference);
    performSubmission(reference.reference);
  };

  const handlePaymentClose = () => {
    setError('Transaction cancelled. Please complete payment to submit your application.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !course) return;
    
    // Trigger Paystack popup
    initializePayment({ 
      onSuccess: handlePaymentSuccess, 
      onClose: handlePaymentClose 
    });
  };

  const performSubmission = async (ref: string) => {
    setLoading(true);
    setError('');
    const uploadedDocUrls: Record<string, string> = {};

    try {
      // 1. Upload files
      for (const doc of REQUIRED_DOCS) {
        setUploadingStatus(prev => ({ ...prev, [doc.id]: 'uploading' }));
        const file = files[doc.id];
        
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload
        });

        if (!uploadRes.ok) throw new Error(`Failed to upload ${doc.label}`);
        
        const uploadData = await uploadRes.json();
        uploadedDocUrls[doc.id] = uploadData.url;
        setUploadingStatus(prev => ({ ...prev, [doc.id]: 'success' }));
      }

      // 2. Create Application
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseApplied: course,
          documents: uploadedDocUrls,
          paymentReference: ref,
          amountPaid: settings?.applicationFee
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'Failed to submit application');
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-800">New Admission Application</h1>
        <p className="text-slate-500">Academic Session 2026/2027 • Standard Processing</p>
      </div>

      {activeAppExists ? (
        <div className="glass-card p-12 bg-white border border-slate-200 shadow-sm rounded-3xl text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Already in Progress</h2>
            <p className="text-slate-500 text-sm">
              You already have an active application that is currently being processed. 
              Students are only allowed to submit a new application if their previous one has been officially rejected.
            </p>
          </div>
          <div className="pt-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn-primary px-8 py-3 rounded-xl font-bold"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-between px-4 mb-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    currentStep === s ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-50" : 
                    currentStep > s ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {currentStep > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase font-bold tracking-wider",
                    currentStep === s ? "text-emerald-700" : "text-slate-400"
                  )}>
                    {s === 1 ? 'Program' : s === 2 ? 'Documents' : 'Payment'}
                  </span>
                </div>
              ))}
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-100 -z-10" />
            </div>

            <form onSubmit={handleSubmit} className="glass-card p-8 bg-white border border-slate-200 shadow-sm rounded-2xl">
              <div className="space-y-8">
                {currentStep === 1 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4 text-emerald-600">
                      <Book className="w-5 h-5" />
                      <h2 className="font-bold uppercase tracking-widest text-xs tracking-tighter">Step 1: Program Choice</h2>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Select Your Program</label>
                      <select 
                        required
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        className="input-field bg-slate-50"
                      >
                        <option value="">{fetchingCourses ? 'Loading programs...' : 'Choose your course...'}</option>
                        {courses.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <p className="mt-3 text-xs text-slate-500 italic">Please choose the program you wish to apply for carefully.</p>
                    </div>
                  </section>
                )}

                {currentStep === 2 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4 text-emerald-600">
                      <Upload className="w-5 h-5" />
                      <h2 className="font-bold uppercase tracking-widest text-xs tracking-tighter">Step 2: Supporting Documents</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {REQUIRED_DOCS.map((doc) => (
                        <DocumentCard 
                          key={doc.id}
                          doc={doc}
                          file={files[doc.id]}
                          status={uploadingStatus[doc.id]}
                          onFileChange={handleFileChange}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {currentStep === 3 && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-2 mb-4 text-emerald-600">
                      <CreditCard className="w-5 h-5" />
                      <h2 className="font-bold uppercase tracking-widest text-xs tracking-tighter">Step 3: Application Fee</h2>
                    </div>
                    
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-slate-600">Application Fee</span>
                        <span className="text-xl font-bold text-slate-900">₦{settings?.applicationFee?.toLocaleString() || '5,000'}</span>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-6">
                        <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          Your application will be submitted automatically once the payment is successful. 
                          We use Paystack to ensure your transaction is secure.
                        </p>
                      </div>
                      
                      {loading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                          <p className="text-xs font-bold text-emerald-700 animate-pulse">Processing Application...</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Payment Method</p>
                            <p className="text-xs font-bold text-slate-700">Online Card / USSD / Transfer</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                {currentStep > 1 ? (
                  <button 
                    type="button" 
                    onClick={prevStep}
                    className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50"
                  >
                    Back
                  </button>
                ) : <div />}
                
                {currentStep < 3 ? (
                  <button 
                    type="button" 
                    onClick={nextStep}
                    className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2"
                  >
                    Continue <Send className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-emerald-900/10"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Pay & Submit Application <CreditCard className="w-4 h-4" /></>}
                  </button>
                )}
              </div>
            </form>
          </div>

        <div className="space-y-6">
          <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/10">
            <h3 className="font-bold mb-4 opacity-70 uppercase tracking-widest text-[10px]">Processing Policy</h3>
            <ul className="text-xs space-y-4">
              <li className="flex gap-3">
                <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center shrink-0">1</div>
                <span>Files must be clear and legible. Use an official scanner where possible.</span>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center shrink-0">2</div>
                <span>Maximum file size is 5MB per document. Supported: PDF, JPG, PNG.</span>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center shrink-0">3</div>
                <span>Intentional submission of false documents results in immediate disqualification.</span>
              </li>
            </ul>
          </div>
          
          <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-sm mb-2 text-slate-800">Support Required?</h3>
            <p className="text-xs text-slate-500 mb-4 px-2">If you experience errors during upload, contact technical support.</p>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
