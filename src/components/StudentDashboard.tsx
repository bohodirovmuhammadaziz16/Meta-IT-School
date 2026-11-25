import React, { useEffect, useState } from 'react';
import { LogOut, Plus, Check, Trash2, Calendar, Clock, BookOpen } from 'lucide-react';
import { api, formatUZS } from '../lib/api';
import type { Course, LessonRecord, PublicUser, StudentRecord } from '../types';
import { DAYS_OF_WEEK, TIME_SLOTS } from '../types';

interface StudentDashboardProps {
  user: PublicUser;
  onLogout: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onLogout }) => {
  const [student, setStudent] = useState<PublicUser>(user);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<StudentRecord[]>([]);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [preferredDays, setPreferredDays] = useState<string[]>([
    'Dushanba',
    'Chorshanba',
    'Juma',
  ]);
  const [preferredTime, setPreferredTime] = useState<string>(TIME_SLOTS[2]);
  const [notes, setNotes] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.studentGetDashboard();
      setStudent(data.student);
      setCourses(data.courses);
      setEnrollments(data.enrollments);
      setLessons(data.lessons);
      if (!selectedCourse && data.courses.length > 0) {
        setSelectedCourse(data.courses[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ma'lumotlarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleDay = (day: string) => {
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (preferredDays.length === 0) {
      setError('Kamida bitta qulay kunni tanlang.');
      return;
    }

    setEnrolling(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.studentEnroll({
        courseId: selectedCourse.id,
        preferredDays,
        preferredTime,
        notes,
      });
      setNotes('');
      setSuccessMsg(
        `"${selectedCourse.title}" kursiga yozilish arizangiz yuborildi${
          res.telegramSent ? ' va Telegram kanaliga yetkazildi.' : '.'
        }`
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kursga yozilishda xatolik.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.studentCancelEnrollment(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arizani bekor qilishda xatolik.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-emerald-600">
            O'quvchi kabineti · Kursga yozilish stoli
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            {student.fullName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 mt-1">
            <span>Yo'nalish: <strong className="text-slate-900">IT yo'nalishi</strong></span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{student.phone}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Chiqish
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KURSGA YOZILISH STOLI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Kursga yozilish stoli — Barcha IT yo'nalishlari
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Kursni tanlang — o'ng tomonda uning davomiyligi, mavzular ketma-ketligi va yozilish formasi ochiladi.
            </p>
          </div>

          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              Kurslar yuklanmoqda...
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => {
                const isSelected = selectedCourse?.id === course.id;
                const alreadyEnrolled = enrollments.some((e) => e.courseId === course.id);
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setSelectedCourse(course)}
                    className={`w-full text-left p-5 rounded-xl border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#EFF6FF]/70 border-[#0057FF]'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-500">
                          {course.track} · {course.category} · {course.durationMonths} oy
                        </div>
                        <h3 className="font-display text-base font-bold text-slate-900">
                          {course.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {course.description}
                        </p>
                        <div className="text-xs text-slate-500 pt-1">
                          Ustoz: <span className="text-slate-800 font-medium">{course.teacherName}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>{course.scheduleSummary}</span>
                        </div>
                      </div>
                      <div className="sm:text-right shrink-0 space-y-1">
                        <div className="font-mono text-base font-semibold text-[#0057FF] tabular-nums whitespace-nowrap">
                          {formatUZS(course.price)}
                        </div>
                        <div className="text-xs text-slate-500">oyiga</div>
                        {alreadyEnrolled && (
                          <div className="text-xs font-medium text-emerald-700 pt-1">
                            Yozilgan
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Enrollment Desk + Syllabus */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sticky top-24 space-y-6">
          <h3 className="font-display text-base font-bold text-slate-900">
            Tanlangan kursga yozilish
          </h3>
          {selectedCourse ? (
            <form onSubmit={handleEnroll} className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-sky-400">{selectedCourse.category}</div>
                    <div className="font-semibold text-white mt-0.5">{selectedCourse.title}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-semibold text-sky-400 tabular-nums">
                      {formatUZS(selectedCourse.price)}
                    </div>
                    <div className="text-xs text-slate-400 tabular-nums">
                      {selectedCourse.durationMonths} oy
                    </div>
                  </div>
                </div>

                {selectedCourse.curriculum?.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Mavzular ketma-ketligi
                    </div>
                    <ol className="space-y-1.5 text-xs text-slate-200">
                      {selectedCourse.curriculum.map((topic, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="font-mono text-sky-400 tabular-nums shrink-0">
                            {String(idx + 1).padStart(2, '0')}.
                          </span>
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0057FF]" />
                  Qulay kunlarni tanlang
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const active = preferredDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
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

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0057FF]" />
                  Qulay vaqtni tanlang
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const active = preferredTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setPreferredTime(slot)}
                        className={`px-2.5 py-2 text-xs font-mono tabular-nums font-medium rounded-lg border transition-colors cursor-pointer ${
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

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Qo'shimcha izoh (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Masalan: Boshlang'ich daraja"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                />
              </div>

              <button
                type="submit"
                disabled={enrolling}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0057FF] hover:bg-[#0044CC] disabled:opacity-60 rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {enrolling ? 'Yozilmoqda...' : 'Kursga yozilish'}
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-500 mt-3">Chap tomondan biror kursni tanlang.</p>
          )}
        </div>
      </div>

      {/* My Enrolled Courses */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Mening yozilgan kurslarim va arizalarim
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">{enrollments.length} ta</span>
        </div>

        {enrollments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Siz hali birorta kursga yozilmagansiz. Yuqoridagi kursga yozilish stolidan foydalaning.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-6">IT kursi</th>
                  <th className="py-3 px-4">Tanlangan kunlar</th>
                  <th className="py-3 px-4">Vaqt</th>
                  <th className="py-3 px-4">Guruh</th>
                  <th className="py-3 px-4">Holati</th>
                  <th className="py-3 px-6 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {enrollments.map((enr) => (
                  <tr key={enr.id}>
                    <td className="py-3.5 px-6 font-medium text-slate-900">{enr.courseName}</td>
                    <td className="py-3.5 px-4 text-slate-600">{enr.preferredDays.join(' · ')}</td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {enr.preferredTime}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700">{enr.groupName}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs font-medium ${
                          enr.status === "O'qimoqda"
                            ? 'text-emerald-700'
                            : enr.status === 'Tasdiqlangan'
                            ? 'text-[#0057FF]'
                            : 'text-amber-700'
                        }`}
                      >
                        {enr.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {enr.status === 'Yangi' ? (
                        <button
                          type="button"
                          onClick={() => handleCancel(enr.id)}
                          aria-label="Arizani bekor qilish"
                          className="text-xs text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Bekor qilish
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lessons.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Kurslaringiz bo'yicha dars jadvali
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {lessons.map((l) => (
              <div key={l.id} className="px-6 py-4 flex items-center justify-between gap-4 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{l.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {l.courseName} · Ustoz: {l.teacherName}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-medium text-slate-800">{l.day}</div>
                  <div className="font-mono tabular-nums text-slate-500 mt-0.5">
                    {l.timeSlot} · {l.room}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
