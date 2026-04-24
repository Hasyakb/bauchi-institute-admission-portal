import React from 'react';
import { motion } from 'motion/react';
import { X, Printer, Award } from 'lucide-react';
import { format } from 'date-fns';

interface AdmissionLetterProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  activeApp: any;
  settings: any;
}

export default function AdmissionLetter({ isOpen, onClose, user, activeApp, settings }: AdmissionLetterProps) {
  if (!isOpen || !activeApp) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0 print:static print:bg-white overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl print:shadow-none print:max-w-none print:w-full print:rounded-none my-8"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50 print:hidden sticky top-0 z-20">
          <div className="flex items-center gap-2 text-emerald-700">
            <Award className="w-5 h-5" />
            <h2 className="font-bold">Official Admission Letter</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
              <Printer className="w-4 h-4" /> Print Letter
            </button>
            <button onClick={onClose} className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-8 bg-white text-slate-900 font-serif leading-relaxed">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
            <div className="flex items-center gap-6">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-slate-900 flex items-center justify-center text-white text-2xl font-bold italic">
                  {settings?.schoolShortName?.[0] || 'S'}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">{settings?.schoolName || 'Academic Institution'}</h1>
                <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] mb-1">OFFICE OF THE REGISTRAR (ADMISSIONS)</p>
                <p className="text-[9px] text-slate-400 italic">P.M.B 1234, School Avenue, State Capital, Nigeria</p>
              </div>
            </div>
            <div className="text-right">
              <div className="w-20 h-24 bg-slate-50 border border-slate-200 flex items-center justify-center text-[8px] text-slate-400 text-center p-2 uppercase">
                Affix Passport Photograph Here
              </div>
            </div>
          </div>

          {/* Letter Metadata */}
          <div className="flex justify-between text-xs">
            <div className="space-y-1">
              <p className="font-bold">REF NO: {settings?.schoolShortName || 'SCHOOL'}/ADM/2026/{(activeApp.id.toUpperCase().slice(0, 6))}</p>
              <p className="text-slate-500">Date: {format(new Date(), 'MMMM dd, yyyy')}</p>
            </div>
            <div className="text-right">
              <p className="font-bold uppercase underline">Official Admission Notification</p>
            </div>
          </div>

          {/* Student Info */}
          <div className="space-y-0.5 border-l-2 border-slate-100 pl-4 py-1">
            <p className="font-bold text-base">{user?.fullName}</p>
            <p className="text-slate-600 text-xs">{user?.email}</p>
            <p className="text-slate-600 text-xs text-uppercase">Application ID: {activeApp.id.toUpperCase()}</p>
          </div>

          {/* Salutation */}
          <div>
            <p className="font-bold text-base uppercase text-center border-b border-slate-200 pb-2">OFFER OF PROVISIONAL ADMISSION: 2026/2027 SESSION</p>
            <p className="mt-6 text-sm">Dear <span className="font-bold">{user?.fullName?.split(' ')[0] || 'Applicant'}</span>,</p>
          </div>

          {/* Body */}
          <div className="space-y-4 text-sm text-justify">
            <p>
              {settings?.admissionLetterTemplate || (
                <>
                  I am pleased to inform you that following your performance in the entrance examination and subsequent screening, 
                  the Admissions Committee has approved your <span className="font-bold text-emerald-700">Provisional Admission</span> into 
                  the <span className="font-bold">{settings?.schoolName || 'Institution'}</span> to pursue a course of study leading to the award of 
                  <span className="font-bold italic"> {activeApp.courseApplied}</span>.
                </>
              )}
              {settings?.admissionLetterTemplate && (
                <span className="block mt-4">
                  Course of Study: <span className="font-bold italic">{activeApp.courseApplied}</span>
                </span>
              )}
            </p>
            
            <p className="font-bold underline uppercase text-xs tracking-wider pt-2">Registration Instructions & Requirements:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-lg text-xs leading-5">
              <ul className="list-disc pl-5 space-y-1">
                <li>Original and 3 photocopies of this Admission Letter.</li>
                <li>Original O'Level Result(s) (WAEC/NECO/NABTEB).</li>
                <li>Original Birth Certificate or Declaration of Age.</li>
                <li>Certificate of State and Local Government Origin.</li>
              </ul>
              <ul className="list-disc pl-5 space-y-1">
                <li>Eight (8) recent Passport-sized photographs.</li>
                <li>Letter of Reference from a reputable individual.</li>
                <li>Proof of Payment for Acceptance and Tuition Fees.</li>
                <li>Duly completed Medical Fitness Report.</li>
              </ul>
            </div>

            <p>
              You are required to report to the <span className="font-bold italic">Registration Centre</span> for screening and verification 
              of documents before being cleared to pay your school fees. This offer remains provisional until physical verification 
              is successfully completed.
            </p>
          </div>

          {/* Acceptance Slip for Student */}
          <div className="border-2 border-dashed border-slate-200 p-6 bg-slate-50 rounded-xl space-y-4">
            <p className="text-center font-bold text-xs uppercase tracking-widest border-b border-slate-200 pb-2">Candidate's Acceptance Declaration</p>
            <p className="text-[11px] leading-relaxed italic">
              I, <span className="font-bold underline px-2">{user?.fullName}</span>, having been offered provisional admission 
              to study <span className="font-bold underline px-2">{activeApp.courseApplied}</span>, hereby accept the offer and 
              agree to abide by the rules and regulations of the institution.
            </p>
            <div className="flex justify-between items-end pt-4">
              <div className="space-y-1">
                <div className="w-40 border-b border-slate-400 h-8"></div>
                <p className="text-[9px] font-bold uppercase">Candidate's Signature & Date</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-emerald-600 uppercase border border-emerald-200 px-3 py-1 rounded bg-white">ACCEPTANCE SLIP</p>
              </div>
            </div>
          </div>

          {/* Signature Area */}
          <div className="pt-8 flex justify-between items-end">
            <div className="space-y-1 text-center">
              <div className="h-10 w-32 border-b border-slate-400 italic font-cursive text-slate-500 flex items-end justify-center">
                Signed
              </div>
              <p className="font-bold text-[10px] uppercase">Registrar</p>
            </div>
            <div className="text-[9px] text-slate-400 italic max-w-xs text-right">
              Generated on {format(new Date(), 'dd/MM/yyyy HH:mm:ss')} for official use during registration session 2026/2027.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
