import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../lib/SettingsContext';
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const { settings } = useSettings();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=2070" 
            alt="University Library" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl text-white"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Clock className="w-4 h-4" />
              2026/2027 Admissions Now Open
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-[0.9] mb-6">
              Shape Your Future with <span className="text-emerald-400">Islamic Excellence.</span>
            </h1>
            <p className="text-lg text-slate-200 mb-10 max-w-lg leading-relaxed">
              Join the {settings?.schoolName || 'Bauchi Institute for Arabic and Islamic Studies'}. {settings?.schoolDescription || 'Experience a blend of traditional values and modern academic rigor.'}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary py-4 px-8 text-lg flex items-center gap-2 shadow-xl shadow-emerald-900/40">
                Apply Now <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 py-4 px-8 text-lg">
                Portal Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats/Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: BookOpen,
                title: "Traditional Values",
                desc: "Rooted in authentic Arabic and Islamic scholarship with deep historical foundations."
              },
              {
                icon: GraduationCap,
                title: "Academic Growth",
                desc: "Modern teaching methodologies integrated with classical theological discourse."
              },
              {
                icon: ShieldCheck,
                title: "Streamlined Admissions",
                desc: "Fully digitized portal for application, document upload, and status tracking."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col gap-4"
              >
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold font-display">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-display mb-6">Ready to begin your journey?</h2>
          <p className="text-slate-600 mb-10 text-lg">
            Our admission process is simple and transparent. Registered accounts can track their application in real-time.
          </p>
          <Link to="/register" className="btn-primary py-4 px-10 rounded-full inline-flex items-center gap-2 text-lg shadow-xl shadow-blue-900/20">
            Start Your Application <GraduationCap className="w-6 h-6" />
          </Link>
        </div>
      </section>
    </div>
  );
}
