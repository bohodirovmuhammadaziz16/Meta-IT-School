import React, { useEffect, useState } from 'react';
import { Check, ArrowRight, Calendar, Clock, BookOpen } from 'lucide-react';
import { api, formatUZS, setStoredToken } from '../lib/api';
import type { Course, PublicUser, StudentRecord } from '../types';
import { DAYS_OF_WEEK, TIME_SLOTS } from '../types';

interface RegistrationSectionProps {
  courses: Course[];
  selectedCourseId: string;
  onSelectCourseId: (id: string) => void;
  onStudentAuthenticated: (user: PublicUser) => void;
}

export const RegistrationSection: React.FC<RegistrationSectionProps> = ({
  courses,
  selectedCourseId,
  onSelectCourseId,
  onStudentAuthenticated,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [preferredDays, setPreferredDays] = useState<string[]>([
    'Dushanba',
    'Chorshanba',
    'Juma',
  ]);
  const [preferredTime, setPreferredTime] = useState<string>(TIME_SLOTS[2]);
  const [createAccount, setCreateAccount] = useState(true);
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<StudentRecord | null>(null);
  const [telegramSent, setTelegramSent] = useState(false);
  const [autoLoggedUser, setAutoLoggedUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      onSelectCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId, onSelectCourseId]);

  const toggleDay = (day: string) => {
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const applyPreset = (preset: 'odd' | 'even') => {
    if (preset === 'odd') {
      setPreferredDays(['Dushanba', 'Chorshanba', 'Juma']);
    } else {
      setPreferredDays(['Seshanba', 'Payshanba', 'Shanba']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Iltimos, ism va familiyangizni kiriting.');
      return;
    }
    const parsedAge = Number(age);
    if (!Number.isFinite(parsedAge) || parsedAge < 7 || parsedAge > 75) {
      setError("Yosh 7 dan 75 gacha bo'lishi kerak.");
      return;
    }
    if (preferredDays.length === 0) {
      setError('O‘zingizga qulay bo‘lgan kamida bitta kunni tanlang.');
      return;
    }
    if (!selectedCourseId) {
      setError("Qiziqqan IT yo'nalishini tanlang.");
      return;
    }
    if (createAccount && password.trim().length < 4) {
      setError("Kabinet uchun kamida 4 ta belgidan iborat parol kiriting (yoki parol yaratishni o'chiring).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitRegistration({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: parsedAge,
        phone: phone.trim(),
        preferredDays,
        preferredTime,
        courseId: selectedCourseId,
        createStudentAccount: createAccount,
        password: createAccount ? password.trim() : undefined,
      });

      if (res.token && res.user) {
        setStoredToken(res.token);
        setAutoLoggedUser(res.user);
      }
      setTelegramSent(Boolean(res.telegramSent));
      setSubmittedRecord(res.registration);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setAge('');
    setPhone('+998 ');
    setPassword('');
    setSubmittedRecord(null);
    setTelegramSent(false);
    setError(null);
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <section id="register" className="py-20 bg-white border-y border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left column: Selected course duration & ordered curriculum topics */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#0057FF] tracking-wide">
                Qabul va ro'yxatdan o'tish
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
                IT yo'nalishiga ro'yxatdan o'tish
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Meta IT School markazida barcha darslar faqat zamonaviy IT yo'nalishlari bo'yicha olib boriladi. Yo'nalishni tanlaganingizda dars davomiyligi va mavzular ketma-ketligi quyida ko'rinadi.
              </p>
            </div>

            {selectedCourse && (
              <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-5">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="text-xs font-medium text-sky-400">
                      {selectedCourse.track} · {selectedCourse.category}
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mt-1">
                      {selectedCourse.title}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-semibold text-sky-400 tabular-nums">
                      {formatUZS(selectedCourse.price)}
                    </div>
                    <div className="text-xs text-slate-400">oyiga</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-800/70 rounded-xl p-3.5">
                    <div className="text-xs text-slate-400">Davomiyligi</div>
                    <div className="font-display text-lg font-bold text-white tabular-nums mt-0.5">
                      {selectedCourse.durationMonths} oy
                    </div>
                    <div className="text-xs text-slate-400 tabular-nums">
                      ~{selectedCourse.durationMonths * 12} ta amaliy dars
                    </div>
                  </div>
                  <div className="bg-slate-800/70 rounded-xl p-3.5">
                    <div className="text-xs text-slate-400">Ustoz</div>
                    <div className="font-medium text-white mt-0.5 truncate">
                      {selectedCourse.teacherName}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {selectedCourse.scheduleSummary}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Mavzular ketma-ketligi
                  </div>
                  <ol className="space-y-2.5 text-sm text-slate-200">
                    {selectedCourse.curriculum.map((topic, index) => (
                      <li key={index} className="flex items-start gap-2.5">
                        <span className="font-mono text-xs font-semibold text-sky-400 tabular-nums mt-0.5 shrink-0">
                          {String(index + 1).padStart(2, '0')}.
                        </span>
                        <span className="leading-snug">{topic}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Right column: dedicated registration form */}
          <div className="lg:col-span-7">
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 sm:p-8">
              {submittedRecord ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold text-slate-900">
                        Ro'yxatdan o'tish muvaffaqiyatli yakunlandi
                      </h3>
                      <p className="text-sm text-slate-600">
                        Arizangiz Meta IT School tizimiga saqlandi
                        {telegramSent ? ' va Telegram kanaliga yuborildi.' : '.'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">O'quvchi</span>
                      <span className="font-medium text-slate-900">
                        {submittedRecord.firstName} {submittedRecord.lastName} ({submittedRecord.age} yosh)
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Telefon raqami</span>
                      <span className="font-mono text-slate-900 tabular-nums">
                        {submittedRecord.phone}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Yo'nalish</span>
                      <span className="font-medium text-slate-900 text-right">
                        {submittedRecord.track} — {submittedRecord.courseName}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Qulay kunlar</span>
                      <span className="font-medium text-slate-900 text-right">
                        {submittedRecord.preferredDays.join(' · ')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Qulay vaqt</span>
                      <span className="font-mono text-slate-900 tabular-nums">
                        {submittedRecord.preferredTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {autoLoggedUser && (
                      <button
                        type="button"
                        onClick={() => onStudentAuthenticated(autoLoggedUser)}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-[#0057FF] hover:bg-[#0044CC] rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        O'quvchi kabinetiga o'tish
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Yana ro'yxatdan o'tish
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {/* Row 1: Ism & Familiya */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reg-first-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Ism
                      </label>
                      <input
                        id="reg-first-name"
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Masalan: Azizbek"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-last-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Familiya
                      </label>
                      <input
                        id="reg-last-name"
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Masalan: Rahimov"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                      />
                    </div>
                  </div>

                  {/* Row 2: Yosh & Telefon raqami */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reg-age" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Yosh
                      </label>
                      <input
                        id="reg-age"
                        type="number"
                        min={7}
                        max={75}
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="18"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Telefon raqami
                      </label>
                      <input
                        id="reg-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+998 90 123 45 67"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                      />
                    </div>
                  </div>

                  {/* Row 3: Yo'nalish (Strictly IT yo'nalishi) + Qiziqqan IT kursi */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Yo'nalish
                      </label>
                      <div className="px-3.5 py-2.5 text-sm font-semibold text-[#0057FF] bg-[#EFF6FF] border border-blue-200 rounded-lg">
                        IT yo'nalishi
                      </div>
                    </div>
                    <div className="sm:col-span-8">
                      <label htmlFor="reg-course" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Qiziqqan IT kursi
                      </label>
                      <select
                        id="reg-course"
                        value={selectedCourseId}
                        onChange={(e) => onSelectCourseId(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                      >
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title} — {course.durationMonths} oy · {formatUZS(course.price)}/oy
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 4: O'ziga qulay kunlar */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-slate-700 inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#0057FF]" />
                        O'ziga qulay kunlar
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => applyPreset('odd')}
                          className="px-2.5 py-1 text-slate-600 bg-white border border-slate-200 hover:border-[#0057FF] hover:text-[#0057FF] rounded-md transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Toq kunlar
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('even')}
                          className="px-2.5 py-1 text-slate-600 bg-white border border-slate-200 hover:border-[#0057FF] hover:text-[#0057FF] rounded-md transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Juft kunlar
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const active = preferredDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                              active
                                ? 'bg-[#0057FF] text-white border-[#0057FF]'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 5: O'ziga qulay vaqt */}
                  <div>
                    <span className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#0057FF]" />
                      O'ziga qulay vaqt
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const active = preferredTime === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setPreferredTime(slot)}
                            className={`px-2.5 py-2 text-xs font-mono tabular-nums font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                              active
                                ? 'bg-[#0057FF] text-white border-[#0057FF]'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Student Cabinet Password */}
                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={createAccount}
                        onChange={(e) => setCreateAccount(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#0057FF] focus:ring-[#0057FF]"
                      />
                      <span>O'quvchi kabineti (kursga yozilish stoli) uchun parol yaratish</span>
                    </label>
                    {createAccount && (
                      <div>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Kabinetga kirish paroli (kamida 4 ta belgi)"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-6 text-sm font-semibold text-white bg-gradient-to-r from-[#0057FF] to-[#0284C7] hover:from-[#0044CC] hover:to-[#0369A1] disabled:opacity-60 rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    {submitting ? 'Yuborilmoqda...' : "Ro'yxatdan o'tishni yakunlash"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
