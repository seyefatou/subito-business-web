"use client"

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Modules", href: "#modules" },
  { label: "Processus", href: "#process" },
  { label: "Demande", href: "#request-form" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16 lg:h-20">
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699466cc64af2efe86c003ac/c2debbc00_logoSubitoentreprise-2.png"
              alt="Subito Business"
              className="h-10 w-auto"
            />
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/business/login">
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-white text-sm"
              >
                Connexion
              </Button>
            </a>
            <Button
              onClick={() => scrollTo("#request-form")}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-5 rounded-lg shadow-md shadow-orange-500/20"
            >
              Ouvrir un compte
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-0 z-40 bg-slate-950/98 backdrop-blur-xl pt-20 px-6 md:hidden"
          >
            <div className="space-y-4">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className="block w-full text-left text-white text-xl font-medium py-3 border-b border-slate-800"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-4 space-y-3">
                <a href="/business/login" className="block">
                  <Button
                    variant="outline"
                    className="w-full border-slate-700 text-white py-6 text-base"
                  >
                    Connexion
                  </Button>
                </a>
                <Button
                  onClick={() => scrollTo("#request-form")}
                  className="w-full bg-orange-500 text-white py-6 text-base"
                >
                  Ouvrir un compte
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
