import React, { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  LogOut,
  X,
  BookOpen,
  Users,
  Calendar,
  MapPin,
  Send,
  Check,
} from 'lucide-react';
import { api, formatUZS } from '../lib/api';
import type {
  Course,
  LessonRecord,
  PublicUser,
  SchoolLocation,
  StudentRecord,
  StudentStatus,
} from '../types';
import { DAYS_OF_WEEK, IT_CATEGORIES, TIME_SLOTS } from '../types';

interface AdminDashboardProps {
  user: PublicUser;
  onLogout: () => void;
  onPublicDataChanged: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onLogout,
  onPublicDataChanged,
}) => {
  const [tab, setTab] = useState<'courses' | 'students' | 'teachers' | 'location'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<PublicUser[]>([]);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Location & Telegram state
  const [locAddress, setLocAddress] = useState('');
  const [locLandmark, setLocLandmark] = useState('');
  const [locHours, setLocHours] = useState('');
  const [locPhone, setLocPhone] = useState('');
  const [locMapLink, setLocMapLink] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  const [telegramStatus, setTelegramStatus] = useState<{
    configured: boolean;
    source: 'env' | 'runtime' | 'none';
    channelId: string;
  }>({ configured: false, source: 'none', channelId: '' });
  const [tgTokenInput, setTgTokenInput] = useState('');
  const [tgChannelInput, setTgChannelInput] = useState('');
  const [savingTg, setSavingTg] = useState(false);
  const [testingTg, setTestingTg] = useState(false);

  // Course modal state
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState<string>(IT_CATEGORIES[0]);
  const [coursePrice, setCoursePrice] = useState('1200000');
  const [courseDuration, setCourseDuration] = useState('6');
  const [courseTeacherId, setCourseTeacherId] = useState('');
  const [courseSchedule, setCourseSchedule] = useState('Dushanba · Chorshanba · Juma');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseCurriculumText, setCourseCurriculumText] = useState('');
  const [courseActive, setCourseActive] = useState(true);
  const [savingCourse, setSavingCourse] = useState(false);

  // Student search & edit modal state
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Barchasi');
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [sFirstName, setSFirstName] = useState('');
  const [sLastName, setSLastName] = useState('');
  const [sAge, setSAge] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sCourseId, setSCourseId] = useState('');
  const [sDays, setSDays] = useState<string[]>([]);
  const [sTime, setSTime] = useState<string>(TIME_SLOTS[0]);
  const [sStatus, setSStatus] = useState<StudentStatus>('Yangi');
  const [sGroup, setSGroup] = useState('');
  const [sNotes, setSNotes] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminGetOverview();
      setCourses(data.courses);
      setStudents(data.students);
      setTeachers(data.teachers);
      setLessons(data.lessons);
      setLocAddress(data.location.address);
      setLocLandmark(data.location.landmark);
      setLocHours(data.location.workingHours);
      setLocPhone(data.location.phone);
      setLocMapLink(data.location.mapLink);
      setTelegramStatus(data.telegram);
      if (data.telegram.channelId && !tgChannelInput) {
        setTgChannelInput(data.telegram.channelId);
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

  const openAddCourse = () => {
    setEditingCourse(null);
    setCourseTitle('');
    setCourseCategory(IT_CATEGORIES[0]);
    setCoursePrice('1200000');
    setCourseDuration('6');
    setCourseTeacherId(teachers[0]?.id || '');
    setCourseSchedule('Dushanba · Chorshanba · Juma');
    setCourseDesc('');
    setCourseCurriculumText(
      '1-oy: Asosiy tushunchalar va ish muhitini sozlash\n2-oy: Amaliy texnologiyalar bilan ishlash\n3-oy: Real loyiha va portfolio tayyorlash'
    );
    setCourseActive(true);
    setCourseModalOpen(true);
  };

  const openEditCourse = (c: Course) => {
    setEditingCourse(c);
    setCourseTitle(c.title);
    setCourseCategory(c.category);
    setCoursePrice(String(c.price));
    setCourseDuration(String(c.durationMonths));
    setCourseTeacherId(c.teacherId);
    setCourseSchedule(c.scheduleSummary);
    setCourseDesc(c.description);
    setCourseCurriculumText((c.curriculum || []).join('\n'));
    setCourseActive(c.active);
    setCourseModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCourse(true);
    setError(null);
    try {
      const curriculum = courseCurriculumText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const payload = {
        title: courseTitle,
        category: courseCategory,
        price: Number(coursePrice),
        durationMonths: Number(courseDuration),
        teacherId: courseTeacherId,
        scheduleSummary: courseSchedule,
        description: courseDesc,
        curriculum,
        active: courseActive,
      };
      if (editingCourse) {
        await api.adminUpdateCourse(editingCourse.id, payload);
      } else {
        await api.adminCreateCourse(payload);
      }
      setCourseModalOpen(false);
      await loadData();
      onPublicDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kursni saqlashda xatolik.');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await api.adminDeleteCourse(id);
      await loadData();
      onPublicDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kursni o'chirishda xatolik.");
    }
  };

  const openEditStudent = (s: StudentRecord) => {
    setEditingStudent(s);
    setSFirstName(s.firstName);
    setSLastName(s.lastName);
    setSAge(String(s.age));
    setSPhone(s.phone);
    setSCourseId(s.courseId);
    setSDays(s.preferredDays);
    setSTime(s.preferredTime);
    setSStatus(s.status);
    setSGroup(s.groupName);
    setSNotes(s.notes);
  };

  const toggleStudentDay = (day: string) => {
    setSDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingStudent(true);
    setError(null);
    try {
      await api.adminUpdateStudent(editingStudent.id, {
        firstName: sFirstName,
        lastName: sLastName,
        age: Number(sAge),
        phone: sPhone,
        courseId: sCourseId,
        preferredDays: sDays.length > 0 ? sDays : editingStudent.preferredDays,
        preferredTime: sTime,
        status: sStatus,
        groupName: sGroup,
        notes: sNotes,
      });
      setEditingStudent(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'quvchini yangilashda xatolik.");
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await api.adminDeleteStudent(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'quvchini o'chirishda xatolik.");
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLocation(true);
    setError(null);
    setNotice(null);
    try {
      const payload: SchoolLocation = {
        address: locAddress,
        landmark: locLandmark,
        workingHours: locHours,
        phone: locPhone,
        mapLink: locMapLink,
      };
      await api.adminUpdateLocation(payload);
      setNotice("Markaz manzili muvaffaqiyatli yangilandi va asosiy sahifada ko'rinmoqda.");
      onPublicDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Manzilni saqlashda xatolik.');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTg(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.adminSaveTelegramConfig({
        botToken: tgTokenInput,
        channelId: tgChannelInput,
      });
      setTelegramStatus({
        configured: res.configured,
        source: 'runtime',
        channelId: res.channelId,
      });
      setTgTokenInput('');
      setNotice('Telegram bot sozlamalari faollashtirildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Telegram sozlamalarida xatolik.');
    } finally {
      setSavingTg(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTg(true);
    setError(null);
    setNotice(null);
    try {
      await api.adminTestTelegram();
      setNotice('Sinov xabari Telegram kanalingizga muvaffaqiyatli yuborildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Telegram sinovida xatolik.');
    } finally {
      setTestingTg(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const query = studentSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(query) ||
      s.phone.toLowerCase().includes(query) ||
      s.courseName.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'Barchasi' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Cabinet Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-[#0057FF]">Admin kabineti</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            {user.fullName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            IT kurs turlari, narxlar, markaz manzili va o'quvchilar ro'yxatini boshqarish paneli
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openAddCourse}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0057FF] hover:bg-[#0044CC] rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yangi IT kurs qo'shish
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

      {/* Summary metrics strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#0057FF] to-[#0284C7] text-white rounded-xl p-5">
          <p className="text-xs text-blue-100">IT kurs turlari</p>
          <p className="font-display text-2xl font-bold tabular-nums mt-1">
            {courses.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Jami o'quvchilar</p>
          <p className="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {students.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Yangi arizalar</p>
          <p className="font-display text-2xl font-bold text-amber-600 tabular-nums mt-1">
            {students.filter((s) => s.status === 'Yangi').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Ro'yxatdan o'tgan ustozlar</p>
          <p className="font-display text-2xl font-bold text-emerald-600 tabular-nums mt-1">
            {teachers.length}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab('courses')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            tab === 'courses' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Kurslar va Narxlar
        </button>
        <button
          type="button"
          onClick={() => setTab('students')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            tab === 'students' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          O'quvchilarni tahrirlash
        </button>
        <button
          type="button"
          onClick={() => setTab('teachers')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            tab === 'teachers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Ustozlar va Darslar
        </button>
        <button
          type="button"
          onClick={() => setTab('location')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            tab === 'location' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Manzil va Telegram
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Ma'lumotlar yuklanmoqda...
        </div>
      ) : tab === 'courses' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              IT yo'nalishi kurs turlari, narxlar va mavzular
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">{courses.length} ta kurs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-6">Kurs nomi</th>
                  <th className="py-3 px-4">Bo'lim</th>
                  <th className="py-3 px-4">Ustoz</th>
                  <th className="py-3 px-4">Davomiyligi</th>
                  <th className="py-3 px-4 text-right">Oylik narxi</th>
                  <th className="py-3 px-4">Holati</th>
                  <th className="py-3 px-6 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-medium text-slate-900">{c.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {c.curriculum?.length || 0} ta modul · {c.scheduleSummary}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{c.category}</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{c.teacherName}</td>
                    <td className="py-3.5 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                      {c.durationMonths} oy
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-[#0057FF] tabular-nums whitespace-nowrap">
                      {formatUZS(c.price)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={c.active ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {c.active ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditCourse(c)}
                          aria-label={`${c.title} kursini tahrirlash`}
                          className="p-1.5 text-slate-500 hover:text-[#0057FF] rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(c.id)}
                          aria-label={`${c.title} kursini o'chirish`}
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
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
        </div>
      ) : tab === 'students' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Ism, telefon yoki kurs bo'yicha qidirish..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {['Barchasi', 'Yangi', 'Tasdiqlangan', "O'qimoqda", 'Yakunlagan'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                So'rov bo'yicha o'quvchilar topilmadi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                      <th className="py-3 px-6">O'quvchi</th>
                      <th className="py-3 px-4">Yosh</th>
                      <th className="py-3 px-4">Telefon</th>
                      <th className="py-3 px-4">IT kursi</th>
                      <th className="py-3 px-4">Qulay kunlar va vaqt</th>
                      <th className="py-3 px-4">Guruh</th>
                      <th className="py-3 px-4">Holati</th>
                      <th className="py-3 px-6 text-right">Tahrirlash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-medium text-slate-900">
                            {s.firstName} {s.lastName}
                          </div>
                          {s.notes && (
                            <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">
                              {s.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600">
                          {s.age}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {s.phone}
                        </td>
                        <td className="py-3.5 px-4 text-slate-800">{s.courseName}</td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-slate-700">
                            {s.preferredDays.join(' · ')}
                          </div>
                          <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                            {s.preferredTime}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {s.groupName}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-xs font-medium ${
                              s.status === "O'qimoqda"
                                ? 'text-emerald-700'
                                : s.status === 'Tasdiqlangan'
                                ? 'text-[#0057FF]'
                                : s.status === 'Yangi'
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditStudent(s)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-[#0057FF] hover:text-[#0057FF] rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Tahrirlash
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(s.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
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
        </div>
      ) : tab === 'teachers' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Ro'yxatdan o'tgan ustozlar
              </h2>
            </div>
            <div className="divide-y divide-slate-200">
              {teachers.map((t) => (
                <div key={t.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-slate-900">{t.fullName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {t.track} · {t.specialty}
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono tabular-nums text-slate-600">
                    <div>{t.phone}</div>
                    <div className="font-sans text-slate-400 mt-0.5">{t.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Faol darslar jadvali
              </h2>
            </div>
            <div className="divide-y divide-slate-200">
              {lessons.map((l) => (
                <div key={l.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-slate-900">{l.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {l.courseName} · {l.teacherName}
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
        </div>
      ) : (
        /* LOCATION & TELEGRAM SETTINGS TAB */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* School Address Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
              <MapPin className="w-5 h-5 text-[#0057FF]" />
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  O'quv markaz manzili
                </h2>
                <p className="text-xs text-slate-500">
                  Belgilangan manzil asosiy sahifadagi "Manzil" bo'limida darhol ko'rinadi
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  To'liq manzil
                </label>
                <input
                  type="text"
                  required
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  placeholder="Toshkent sh., Chilonzor tumani..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mo'ljal
                </label>
                <input
                  type="text"
                  value={locLandmark}
                  onChange={(e) => setLocLandmark(e.target.value)}
                  placeholder="Metro bekati yoki bino nomi"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ish vaqti
                  </label>
                  <input
                    type="text"
                    value={locHours}
                    onChange={(e) => setLocHours(e.target.value)}
                    placeholder="Dushanba - Shanba · 09:00 - 21:00"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Aloqa telefoni
                  </label>
                  <input
                    type="tel"
                    required
                    value={locPhone}
                    onChange={(e) => setLocPhone(e.target.value)}
                    placeholder="+998 90 100 00 01"
                    className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Xarita havolasi (Google / Yandex Maps)
                </label>
                <input
                  type="url"
                  value={locMapLink}
                  onChange={(e) => setLocMapLink(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                />
              </div>
              <button
                type="submit"
                disabled={savingLocation}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0057FF] hover:bg-[#0044CC] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {savingLocation ? 'Saqlanmoqda...' : 'Manzilni saqlash'}
              </button>
            </form>
          </div>

          {/* Telegram Notification Settings */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-sky-600" />
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Telegram kanal xabarnomalari
                  </h2>
                  <p className="text-xs text-slate-500">
                    O'quvchi kursga yozilganda ma'lumotlar avtomatik Telegramga boradi
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold ${
                  telegramStatus.configured ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {telegramStatus.configured ? 'Faol' : 'Sozlanmagan'}
              </span>
            </div>

            {telegramStatus.source === 'env' ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 space-y-1">
                <div className="font-medium">Telegram Bot server Secrets orqali ulangan.</div>
                <div className="text-xs font-mono text-emerald-700">
                  Kanal ID: {telegramStatus.channelId}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveTelegram} className="space-y-4">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  Doimiy ishlashi uchun Settings → Secrets bo'limiga <code className="font-mono text-slate-800">TELEGRAM_BOT_TOKEN</code> va <code className="font-mono text-slate-800">TELEGRAM_CHANNEL_ID</code> ni kiriting yoki hozir sinash uchun shu yerdan vaqtinchalik ulang.
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telegram Bot Token
                  </label>
                  <input
                    type="password"
                    required
                    value={tgTokenInput}
                    onChange={(e) => setTgTokenInput(e.target.value)}
                    placeholder="Bot tokenni kiriting"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telegram Kanal ID
                  </label>
                  <input
                    type="text"
                    required
                    value={tgChannelInput}
                    onChange={(e) => setTgChannelInput(e.target.value)}
                    placeholder="-100..."
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingTg}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {savingTg ? 'Ulanmoqda...' : 'Telegramni ulash'}
                </button>
              </form>
            )}

            {telegramStatus.configured && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={testingTg}
                  className="px-4 py-2 text-sm font-medium text-[#0057FF] bg-[#EFF6FF] hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                >
                  {testingTg ? 'Yuborilmoqda...' : 'Sinov xabarini yuborish'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Course Add/Edit Modal */}
      {courseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingCourse ? 'IT kursni tahrirlash' : 'Yangi IT kurs qo‘shish'}
              </h3>
              <button
                type="button"
                onClick={() => setCourseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCourse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kurs nomi (IT yo'nalishi)
                </label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Masalan: Cybersecurity Fundamentals"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    IT bo'limi
                  </label>
                  <select
                    value={courseCategory}
                    onChange={(e) => setCourseCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    {IT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Oylik narxi (so'm)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    required
                    value={coursePrice}
                    onChange={(e) => setCoursePrice(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Davomiyligi (oy)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={courseDuration}
                    onChange={(e) => setCourseDuration(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mas'ul ustoz
                  </label>
                  <select
                    value={courseTeacherId}
                    onChange={(e) => setCourseTeacherId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="">Tayinlanmagan</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Dars kunlari tavsifi
                </label>
                <input
                  type="text"
                  value={courseSchedule}
                  onChange={(e) => setCourseSchedule(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Qisqacha tavsif
                </label>
                <textarea
                  rows={2}
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mavzular ketma-ketligi (har bir modulni yangi qatordan yozing)
                </label>
                <textarea
                  rows={4}
                  value={courseCurriculumText}
                  onChange={(e) => setCourseCurriculumText(e.target.value)}
                  placeholder="1-oy: HTML/CSS asoslari&#10;2-oy: JavaScript..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={courseActive}
                  onChange={(e) => setCourseActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0057FF]"
                />
                <span>Saytda faol kurs sifatida ko'rsatish</span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCourseModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingCourse}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0057FF] hover:bg-[#0044CC] disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {savingCourse ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                O'quvchi ma'lumotlarini tahrirlash
              </h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ism</label>
                  <input
                    type="text"
                    required
                    value={sFirstName}
                    onChange={(e) => setSFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Familiya</label>
                  <input
                    type="text"
                    required
                    value={sLastName}
                    onChange={(e) => setSLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Yosh</label>
                  <input
                    type="number"
                    min={7}
                    max={75}
                    required
                    value={sAge}
                    onChange={(e) => setSAge(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    required
                    value={sPhone}
                    onChange={(e) => setSPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  IT kursi
                </label>
                <select
                  value={sCourseId}
                  onChange={(e) => setSCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Qulay kunlar
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const active = sDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleStudentDay(day)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#0057FF] text-white border-[#0057FF]'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Qulay vaqt
                  </label>
                  <select
                    value={sTime}
                    onChange={(e) => setSTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Holati
                  </label>
                  <select
                    value={sStatus}
                    onChange={(e) => setSStatus(e.target.value as StudentStatus)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Yangi">Yangi</option>
                    <option value="Tasdiqlangan">Tasdiqlangan</option>
                    <option value="O'qimoqda">O'qimoqda</option>
                    <option value="Yakunlagan">Yakunlagan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Guruh</label>
                  <input
                    type="text"
                    value={sGroup}
                    onChange={(e) => setSGroup(e.target.value)}
                    placeholder="FE-101"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Izoh</label>
                  <input
                    type="text"
                    value={sNotes}
                    onChange={(e) => setSNotes(e.target.value)}
                    placeholder="Qo'shimcha ma'lumot"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#0057FF] hover:bg-[#0044CC] disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {savingStudent ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
