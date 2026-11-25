import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, GraduationCap, BookOpen, KeyRound, Copy, Check } from 'lucide-react';
import { api, setStoredToken } from '../lib/api';
import type { PublicUser, UserRole } from '../types';
import { LOGO_PATH } from './Navbar';

interface AuthPortalModalProps {
  isOpen: boolean;
  initialRole: UserRole;
  onClose: () => void;
  onAuthenticated: (user: PublicUser) => void;
}

function generateStrongAdminPasscode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  const bytes = new Uint8Array(12);
  window.crypto.getRandomValues(bytes);
  let out = 'META-';
  for (let i = 0; i < bytes.length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  isOpen,
  initialRole,
  onClose,
  onAuthenticated,
}) => {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Admin passcode status
  const [adminConfigured, setAdminConfigured] = useState<boolean>(true);
  const [checkingAdmin, setCheckingAdmin] = useState<boolean>(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [copiedPasscode, setCopiedPasscode] = useState(false);

  // Teacher / Student Login fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Teacher registration fields
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('+998 ');
  const [teacherSpecialty, setTeacherSpecialty] = useState('Frontend Development (React)');
  const [teacherPassword, setTeacherPassword] = useState('');

  // Student registration fields
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [studentAge, setStudentAge] = useState('18');
  const [studentPhone, setStudentPhone] = useState('+998 ');
  const [studentPassword, setStudentPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRole(initialRole);
    setMode('login');
    setError(null);
    setAdminPasscode('');
    setCopiedPasscode(false);
  }, [initialRole, isOpen]);

  useEffect(() => {
    if (!isOpen || role !== 'admin') return;
    setCheckingAdmin(true);
    api
      .getAdminStatus()
      .then((res) => {
        setAdminConfigured(res.configured);
      })
      .catch(() => {
        setAdminConfigured(true);
      })
      .finally(() => {
        setCheckingAdmin(false);
      });
  }, [isOpen, role]);

  if (!isOpen) return null;

  const switchRole = (nextRole: UserRole) => {
    setRole(nextRole);
    setMode('login');
    setError(null);
    setIdentifier('');
    setPassword('');
    setAdminPasscode('');
  };

  const fillDemoCredentials = (targetRole: 'teacher' | 'student') => {
    setMode('login');
    setError(null);
    if (targetRole === 'teacher') {
      setIdentifier('sardor@metait.uz');
      setPassword('ustoz123');
    } else {
      setIdentifier('+998904445566');
      setPassword('oquvchi123');
    }
  };

  const handleGenerateAdminPasscode = () => {
    const generated = generateStrongAdminPasscode();
    setAdminPasscode(generated);
    setCopiedPasscode(false);
  };

  const handleCopyAdminPasscode = () => {
    if (!adminPasscode) return;
    navigator.clipboard?.writeText(adminPasscode);
    setCopiedPasscode(true);
  };

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (adminPasscode.trim().length < 6) {
      setError('Maxsus parol kamida 6 ta belgidan iborat boʻlishi kerak.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.setupAdminPasscode(adminPasscode.trim());
      setStoredToken(res.token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin parolini oʻrnatishda xatolik.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        role === 'admin'
          ? await api.login({ role: 'admin', password: adminPasscode })
          : await api.login({ role, identifier, password });
      setStoredToken(res.token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.registerTeacher({
        fullName: teacherName,
        email: teacherEmail,
        phone: teacherPhone,
        password: teacherPassword,
        specialty: teacherSpecialty,
      });
      setStoredToken(res.token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.registerStudent({
        firstName: studentFirstName,
        lastName: studentLastName,
        age: Number(studentAge),
        phone: studentPhone,
        password: studentPassword,
      });
      setStoredToken(res.token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-gradient-to-r from-[#EFF6FF] to-white">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_PATH}
              alt="Meta IT School"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div>
              <h2 id="auth-modal-title" className="font-display text-base font-bold text-slate-900">
                Kabinetga kirish
              </h2>
              <p className="text-xs text-slate-500">Meta IT School · Rolingizni tanlang</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Role Switcher */}
        <div className="px-6 pt-5">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => switchRole('admin')}
              className={`py-2 px-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                role === 'admin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => switchRole('teacher')}
              className={`py-2 px-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                role === 'teacher'
                  ? 'bg-[#0057FF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Ustoz
            </button>
            <button
              type="button"
              onClick={() => switchRole('student')}
              className={`py-2 px-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                role === 'student'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              O'quvchi
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {role !== 'admin' && (
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`font-medium pb-1 border-b-2 transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'text-[#0057FF] border-[#0057FF]'
                    : 'text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                Tizimga kirish
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`font-medium pb-1 border-b-2 transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'text-[#0057FF] border-[#0057FF]'
                    : 'text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                {role === 'teacher' ? "Ustoz ro'yxatdan o'tishi" : "O'quvchi ro'yxatdan o'tishi"}
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {role === 'admin' ? (
            checkingAdmin ? (
              <div className="py-6 text-center text-sm text-slate-500">Tekshirilmoqda...</div>
            ) : !adminConfigured ? (
              <form onSubmit={handleAdminSetup} className="space-y-4">
                <div className="p-3.5 rounded-lg bg-[#EFF6FF] border border-blue-200 text-xs text-slate-700 space-y-1">
                  <div className="font-semibold text-[#0057FF] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    Birinchi marta maxsus Admin parolini o'rnatish
                  </div>
                  <p>
                    Admin kabinetiga email kiritmasdan, faqat quyida yaratiladigan maxsus parol orqali kiriladi. Parolni saqlab oling.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Maxsus Admin paroli
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateAdminPasscode}
                      className="text-xs font-medium text-[#0057FF] hover:underline cursor-pointer"
                    >
                      Kuchli parol yaratish
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      placeholder="Kamida 6 ta belgi (masalan: META-94X7...)"
                      className="flex-1 px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                    />
                    {adminPasscode && (
                      <button
                        type="button"
                        onClick={handleCopyAdminPasscode}
                        aria-label="Parolni nusxalash"
                        className="px-3 py-2.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPasscode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? 'Saqlanmoqda...' : 'Parolni tasdiqlash va Admin kabinetiga kirish'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  Admin kabinetiga email talab qilinmaydi — faqat maxsus admin parolini kiriting.
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Maxsus Admin paroli
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    placeholder="Maxsus parolni kiriting"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? 'Tekshirilmoqda...' : 'Admin kabinetiga kirish'}
                </button>
              </form>
            )
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email yoki telefon raqami
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={role === 'teacher' ? 'sardor@metait.uz yoki +998...' : '+998904445566'}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Parol
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0057FF] hover:bg-[#0044CC] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Tekshirilmoqda...' : 'Kabinetga kirish'}
              </button>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Sinov uchun tezkor ma'lumot:</span>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials(role)}
                  className="text-[#0057FF] font-medium hover:underline cursor-pointer"
                >
                  Namuna bilan to'ldirish
                </button>
              </div>
            </form>
          ) : role === 'teacher' ? (
            <form onSubmit={handleRegisterTeacher} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ustoz F.I.O.
                </label>
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Masalan: Jasur Mirzayev"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telefon raqami
                  </label>
                  <input
                    type="tel"
                    required
                    value={teacherPhone}
                    onChange={(e) => setTeacherPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="ustoz@metait.uz"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Dars o'tadigan IT yo'nalishi
                </label>
                <input
                  type="text"
                  required
                  value={teacherSpecialty}
                  onChange={(e) => setTeacherSpecialty(e.target.value)}
                  placeholder="Masalan: Backend (Python / Node.js)"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Parol
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="Kamida 4 ta belgi"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0057FF] hover:bg-[#0044CC] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Saqlanmoqda...' : "Ustoz sifatida ro'yxatdan o'tish"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterStudent} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ism
                  </label>
                  <input
                    type="text"
                    required
                    value={studentFirstName}
                    onChange={(e) => setStudentFirstName(e.target.value)}
                    placeholder="Azizbek"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Familiya
                  </label>
                  <input
                    type="text"
                    required
                    value={studentLastName}
                    onChange={(e) => setStudentLastName(e.target.value)}
                    placeholder="Rahimov"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Yosh
                  </label>
                  <input
                    type="number"
                    min={7}
                    max={75}
                    required
                    value={studentAge}
                    onChange={(e) => setStudentAge(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telefon raqami
                  </label>
                  <input
                    type="tel"
                    required
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Parol
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder="Kamida 4 ta belgi"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Saqlanmoqda...' : "O'quvchi kabinetini ochish"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
