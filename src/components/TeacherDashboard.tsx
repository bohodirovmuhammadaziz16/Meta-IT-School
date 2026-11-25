import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, LogOut, X, Calendar, Users } from 'lucide-react';
import { api } from '../lib/api';
import type {
  Course,
  LessonRecord,
  LessonStatus,
  PublicUser,
  StudentRecord,
} from '../types';
import { DAYS_OF_WEEK, TIME_SLOTS } from '../types';

interface TeacherDashboardProps {
  user: PublicUser;
  onLogout: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout }) => {
  const [teacher, setTeacher] = useState<PublicUser>(user);
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [dayFilter, setDayFilter] = useState<string>('Barchasi');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lesson modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonRecord | null>(null);
  const [lCourseId, setLCourseId] = useState('');
  const [lTitle, setLTitle] = useState('');
  const [lDay, setLDay] = useState<string>(DAYS_OF_WEEK[0]);
  const [lTime, setLTime] = useState<string>(TIME_SLOTS[0]);
  const [lRoom, setLRoom] = useState('Xona 201');
  const [lGroup, setLGroup] = useState('IT-101');
  const [lStatus, setLStatus] = useState<LessonStatus>('Rejalashtirilgan');
  const [lNotes, setLNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.teacherGetDashboard();
      setTeacher(data.teacher);
      setAssignedCourses(data.assignedCourses);
      setAllCourses(data.allCourses);
      setLessons(data.lessons);
      setStudents(data.students);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ma'lumotlarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddLesson = () => {
    setEditingLesson(null);
    setLCourseId(assignedCourses[0]?.id || allCourses[0]?.id || '');
    setLTitle('');
    setLDay(DAYS_OF_WEEK[0]);
    setLTime(TIME_SLOTS[0]);
    setLRoom('Xona 201');
    setLGroup('IT-101');
    setLStatus('Rejalashtirilgan');
    setLNotes('');
    setModalOpen(true);
  };

  const openEditLesson = (l: LessonRecord) => {
    setEditingLesson(l);
    setLCourseId(l.courseId);
    setLTitle(l.title);
    setLDay(l.day);
    setLTime(l.timeSlot);
    setLRoom(l.room);
    setLGroup(l.groupName);
    setLStatus(l.status);
    setLNotes(l.notes);
    setModalOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        courseId: lCourseId,
        title: lTitle,
        day: lDay,
        timeSlot: lTime,
        room: lRoom,
        groupName: lGroup,
        status: lStatus,
        notes: lNotes,
      };
      if (editingLesson) {
        await api.teacherUpdateLesson(editingLesson.id, payload);
      } else {
        await api.teacherCreateLesson(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Darsni saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (lesson: LessonRecord, status: LessonStatus) => {
    try {
      await api.teacherUpdateLesson(lesson.id, { status });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Holatni yangilashda xatolik.');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    try {
      await api.teacherDeleteLesson(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Darsni o'chirishda xatolik.");
    }
  };

  const filteredLessons =
    dayFilter === 'Barchasi' ? lessons : lessons.filter((l) => l.day === dayFilter);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-[#0057FF]">
            Ustoz kabineti · Ro'yxatdan o'tgan o'qituvchi
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            {teacher.fullName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 mt-1">
            <span>Yo'nalish: <strong className="text-slate-900">{teacher.track}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Mutaxassislik: <strong className="text-slate-900">{teacher.specialty}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openAddLesson}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0057FF] hover:bg-[#0044CC] rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yangi dars qo'shish
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Chiqish
          </button>
        </div>
      </div>

      {/* Assigned IT Courses Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 md:col-span-2">
          <p className="text-xs font-medium text-slate-500">
            Siz dars o'tadigan IT kurslar ({teacher.track})
          </p>
          {assignedCourses.length === 0 ? (
            <p className="text-sm text-slate-600 mt-2">
              Hozircha sizga biriktirilgan kurslar yo'q. Yangi dars qo'shishda o'zingizga mos IT kursini tanlashingiz mumkin.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {assignedCourses.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{c.title}</div>
                    <div className="text-xs text-slate-500">
                      {c.category} · {c.scheduleSummary}
                    </div>
                  </div>
                  <span className="font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {c.durationMonths} oy
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Dars jadvali va o'quvchilar</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="font-display text-2xl font-bold text-slate-900 tabular-nums">
                  {lessons.length}
                </div>
                <div className="text-xs text-slate-500">Jami darslar</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-[#0057FF] tabular-nums">
                  {students.length}
                </div>
                <div className="text-xs text-slate-500">O'quvchilar</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            Telefon: <span className="font-mono tabular-nums text-slate-700">{teacher.phone}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Lesson Schedule Management */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0057FF]" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Mening dars jadvalim va darslarni boshqarish
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {['Barchasi', ...DAYS_OF_WEEK].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setDayFilter(day)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  dayFilter === day
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {day === 'Barchasi' ? 'Barchasi' : day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Yuklanmoqda...</div>
        ) : filteredLessons.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-500">Tanlangan kun uchun darslar topilmadi.</p>
            <button
              type="button"
              onClick={openAddLesson}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0057FF] rounded-lg cursor-pointer"
            >
              Dars qo'shish
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-6">Dars mavzusi</th>
                  <th className="py-3 px-4">IT yo'nalishi / Kurs</th>
                  <th className="py-3 px-4">Kun va Vaqt</th>
                  <th className="py-3 px-4">Guruh · Xona</th>
                  <th className="py-3 px-4">Holati</th>
                  <th className="py-3 px-6 text-right">Boshqarish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredLessons.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-medium text-slate-900">{l.title}</div>
                      {l.notes && <div className="text-xs text-slate-500 mt-0.5">{l.notes}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{l.courseName}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{l.day}</div>
                      <div className="text-xs font-mono tabular-nums text-slate-500">
                        {l.timeSlot}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-mono text-xs">
                      {l.groupName} · {l.room}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={l.status}
                        onChange={(e) => handleQuickStatus(l, e.target.value as LessonStatus)}
                        aria-label="Dars holati"
                        className={`text-xs font-medium px-2.5 py-1 rounded-md border bg-white cursor-pointer ${
                          l.status === "O'tildi"
                            ? 'text-emerald-700 border-emerald-200'
                            : l.status === 'Qoldirildi'
                            ? 'text-red-700 border-red-200'
                            : 'text-[#0057FF] border-blue-200'
                        }`}
                      >
                        <option value="Rejalashtirilgan">Rejalashtirilgan</option>
                        <option value="O'tildi">O'tildi</option>
                        <option value="Qoldirildi">Qoldirildi</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditLesson(l)}
                          aria-label="Darsni tahrirlash"
                          className="p-1.5 text-slate-500 hover:text-[#0057FF] rounded-md hover:bg-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(l.id)}
                          aria-label="Darsni o'chirish"
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Students enrolled in teacher's IT courses */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0057FF]" />
          <h2 className="font-display text-base font-semibold text-slate-900">
            Yo'nalishingizga yozilgan o'quvchilar
          </h2>
        </div>
        {students.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Hozircha sizning kurslaringizga yozilgan o'quvchilar yo'q.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-6">O'quvchi</th>
                  <th className="py-3 px-4">Kurs</th>
                  <th className="py-3 px-4">Qulay kunlar va vaqt</th>
                  <th className="py-3 px-4">Guruh</th>
                  <th className="py-3 px-6">Holati</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 px-6 font-medium text-slate-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{s.courseName}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {s.preferredDays.join(' · ')} ·{' '}
                      <span className="font-mono tabular-nums">{s.preferredTime}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">{s.groupName}</td>
                    <td className="py-3 px-6 text-xs font-medium text-slate-700">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Lesson Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingLesson ? 'Darsni tahrirlash' : "Yangi dars qo'shish"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveLesson} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  IT kursi
                </label>
                <select
                  value={lCourseId}
                  onChange={(e) => setLCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Dars mavzusi
                </label>
                <input
                  type="text"
                  required
                  value={lTitle}
                  onChange={(e) => setLTitle(e.target.value)}
                  placeholder="Masalan: React Router va Autentifikatsiya"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kun</label>
                  <select
                    value={lDay}
                    onChange={(e) => setLDay(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Vaqt</label>
                  <select
                    value={lTime}
                    onChange={(e) => setLTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Guruh</label>
                  <input
                    type="text"
                    value={lGroup}
                    onChange={(e) => setLGroup(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Xona</label>
                  <input
                    type="text"
                    value={lRoom}
                    onChange={(e) => setLRoom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Izoh</label>
                <input
                  type="text"
                  value={lNotes}
                  onChange={(e) => setLNotes(e.target.value)}
                  placeholder="Uyga vazifa yoki kerakli materiallar"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0057FF] hover:bg-[#0044CC] disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
