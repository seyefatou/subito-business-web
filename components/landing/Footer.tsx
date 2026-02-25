import React from "react";
import { Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699466cc64af2efe86c003ac/c2debbc00_logoSubitoentreprise-2.png"
              alt="Subito Business"
              className="h-8 w-auto"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <a href="tel:+221781363635" className="flex items-center gap-2 text-slate-400 hover:text-orange-400 text-sm transition-colors">
              <Phone className="w-4 h-4" />
              +221 78 136 36 35
            </a>
            <a href="mailto:contact@mysubito.net" className="flex items-center gap-2 text-slate-400 hover:text-orange-400 text-sm transition-colors">
              <Mail className="w-4 h-4" />
              contact@mysubito.net
            </a>
          </div>

          <div className="flex items-center gap-8">
            <a href="#" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Conditions générales</a>
            <a href="#" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Politique de confidentialité</a>
          </div>

          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} MySubito. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
