'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Token de reinitialisation manquant');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);

    try {
      await api.authCompagny.resetPassword({ token, newPassword });
      setSuccess(true);
      toast.success('Mot de passe reinitialise avec succes');
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Token invalide ou expire');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <style>{`
        .gradient-subito {
          background-color: #E04A1F;
        }
        .text-subito {
          color: #E04A1F;
        }
      `}</style>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo-subito.jpeg`}
              alt="Subito"
              className="h-12 w-auto"
            />
            <div className="text-left">
              <span className="font-bold text-2xl text-slate-800">Subito</span>
              <span className="block text-sm text-slate-500 font-medium -mt-1">Business</span>
            </div>
          </div>
          <p className="text-slate-500">Nouveau mot de passe</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Mot de passe reinitialise</h2>
              <p className="text-sm text-slate-500">
                Votre mot de passe a ete modifie avec succes. Vous pouvez maintenant vous connecter.
              </p>
              <Link href="/login">
                <Button className="w-full h-12 gradient-subito text-white border-0 text-base font-medium mt-2">
                  Se connecter
                </Button>
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-500">
                Le lien de reinitialisation est invalide ou a expire. Veuillez refaire une demande.
              </p>
              <Link href="/forgot-password">
                <Button variant="outline" className="w-full">
                  Demander un nouveau lien
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7 text-orange-600" />
                </div>
                <p className="text-sm text-slate-500">
                  Choisissez un nouveau mot de passe pour votre compte.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Retapez le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 gradient-subito text-white border-0 text-base font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Reinitialisation...
                  </>
                ) : (
                  'Reinitialiser le mot de passe'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-subito hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Retour a la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
