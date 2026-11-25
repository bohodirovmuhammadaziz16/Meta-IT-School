import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  MapPin,
  Clock,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { api, formatUZS, getStoredToken, setStoredToken } from './lib/api';
import type {
  Course,
  PublicTeacherSummary,
  PublicUser,
  SchoolLocation,
  UserRole,
} from './types';
import { LOGO_PATH, Navbar } from './components/Navbar';
import { RegistrationSection } from './components/RegistrationSection';
import { AuthPortalModal } from './components/AuthPortalModal';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';

const CATEGORY_ACCENT: Record<string, { text: string; bg: string; border: string }> = {
  'Web dasturlash': { text: 'text-[#0057FF]', bg: 'bg-blue-50', border: 'border-blue-200' },
  'Backend dasturlash': { text: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  'Full-Stack dasturlash': { text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  'Mobil dasturlash': { text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
  'UI/UX dizayn': { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  'Kiberxavfsizlik': { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  "Sun'iy intellekt & Data Science": { text: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  "Ma'lumotlar tahlili": { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'DevOps & Cloud': { text: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  'QA Engineering': { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  "O'yinlar yaratish": { text: 'text-fuchsia-700', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200' },
  'Grafik va Motion dizayn': { text: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200' },
};

function safeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'cabinet'>('home');
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<PublicTeacherSummary[]>([]);
  const [location, setLocation] = useState<SchoolLocation | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Barchasi');
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('student');

  const loadBootstrap = async () => {
    try {
      const data = await api.getBootstrap();
      setCourses(data.courses);
      setTeachers(data.teachers);
      setLocation(data.location);
      if (data.courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(data.courses[0].id);
      }
    } catch (err) {
      console.error('Bootstrap error:', err);
    } finally {
      setLoadingBootstrap(false);
    }
  };

  useEffect(() => {
    loadBootstrap();
    const token = getStoredToken();
    if (token) {
      api
        .getMe()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          setStoredToken(null);
        });
    }
  }, []);

  const handleNavigateHome = (sectionId?: string) => {
    setActiveView('home');
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenPortalForRole = (role: UserRole) => {
    if (user && user.role === role) {
      setActiveView('cabinet');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setAuthInitialRole(role);
    setAuthModalOpen(true);
  };

  const handleAuthenticated = (authedUser: PublicUser) => {
    setUser(authedUser);
    setActiveView('cabinet');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setActiveView('home');
  };

  const handleSelectCourseForRegistration = (courseId: string) => {
    setSelectedCourseId(courseId);
    const el = document.getElementById('register');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const categories = ['Barchasi', ...Array.from(new Set(courses.map((c) => c.category)))];
  const visibleCourses =
    categoryFilter === 'Barchasi'
      ? courses
      : courses.filter((c) => c.category === categoryFilter);

  const validMapLink = location?.mapLink ? safeExternalUrl(location.mapLink) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <Navbar
        user={user}
        activeView={activeView}
        onNavigateHome={handleNavigateHome}
        onOpenAuth={() => {
          setAuthInitialRole('student');
          setAuthModalOpen(true);
        }}
        onOpenCabinet={() => setActiveView('cabinet')}
      />

      {activeView === 'cabinet' && user ? (
        <main className="flex-1">
          {user.role === 'admin' && (
            <AdminDashboard
              user={user}
              onLogout={handleLogout}
              onPublicDataChanged={loadBootstrap}
            />
          )}
          {user.role === 'teacher' && (
            <TeacherDashboard user={user} onLogout={handleLogout} />
          )}
          {user.role === 'student' && (
            <StudentDashboard user={user} onLogout={handleLogout} />
          )}
        </main>
      ) : (
        <main className="flex-1">
          {/* HERO SECTION — Rich colorful Meta Blue + Deep Slate aesthetic */}
          <section
            id="hero"
            className="py-16 sm:py-24 bg-gradient-to-b from-[#EFF6FF] via-[#F8FAFC] to-[#F8FAFC]"
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* Left Column */}
                <div className="lg:col-span-7 space-y-7">
                  <div className="flex items-center gap-4">
                    <img
                      src={LOGO_PATH}
                      alt="Meta IT School rasmiy logotipi"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#0057FF]/25 shadow-sm shrink-0"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#0057FF] tracking-wide">
                        Zamonaviy IT Ta'lim Markazi
                      </p>
                      <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                        Meta IT School
                      </p>
                    </div>
                  </div>

                  <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12] text-balance">
                    IT sohasining <span className="text-[#0057FF]">barcha yo'nalishlari</span> bir markazda
                  </h1>

                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                    Web va Mobil dasturlash, Sun'iy intellekt, Kiberxavfsizlik, DevOps, QA va UI/UX dizayn. O'zingizga qulay kun va vaqtni tanlab ro'yxatdan o'ting.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <button
                      type="button"
                      onClick={() => handleNavigateHome('register')}
                      className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#0057FF] to-[#0284C7] hover:from-[#0044CC] hover:to-[#0369A1] rounded-lg transition-all inline-flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-xs"
                    >
                      Ro'yxatdan o'tish
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigateHome('portals')}
                      className="px-6 py-3 text-sm font-medium text-slate-800 bg-white border border-slate-200 hover:border-[#0057FF] hover:text-[#0057FF] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Kabinetlarga kirish
                    </button>
                  </div>
                </div>

                {/* Right Column: Rich Contrast Brand & Summary Card */}
                <div className="lg:col-span-5">
                  <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-lg">
                    <div className="flex items-center justify-between pb-5 border-b border-slate-800">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={LOGO_PATH}
                          alt="Meta IT School logotipi"
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <div className="font-display text-base font-bold text-white">
                            Meta IT School
                          </div>
                          <div className="text-xs text-sky-400">
                            Yo'nalish: Faqat IT yo'nalishi
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-medium text-emerald-400 tabular-nums">
                        2026 Qabul
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/70 rounded-xl p-4">
                        <div className="font-display text-2xl font-bold text-white tabular-nums">
                          {courses.length} ta
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Barcha IT yo'nalishlari</div>
                      </div>
                      <div className="bg-slate-800/70 rounded-xl p-4">
                        <div className="font-display text-2xl font-bold text-sky-400 tabular-nums">
                          {teachers.length} nafar
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Tajribali ustozlar</div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-5 space-y-3">
                      <div className="text-xs font-medium text-slate-400">
                        Top IT yo'nalishlari
                      </div>
                      <div className="space-y-2.5">
                        {courses.slice(0, 4).map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="text-slate-200 font-medium truncate">
                              {c.title}
                            </span>
                            <span className="font-mono text-xs text-sky-400 tabular-nums shrink-0">
                              {c.durationMonths} oy
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ALL IT COURSES SECTION WITH CATEGORY FILTER */}
          <section id="courses" className="py-16 border-t border-slate-200 bg-[#F8FAFC]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#0057FF]">O'quv dasturlari</p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    IT yo'nalishidagi barcha kurslar
                  </h2>
                </div>
                <p className="text-sm text-slate-500">
                  Yo'nalishni tanlang — davomiyligi va mavzular ketma-ketligini ko'ring
                </p>
              </div>

              {/* Interactive Category Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-[#0057FF] text-white border-[#0057FF]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#0057FF]/40 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loadingBootstrap ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-56 bg-white border border-slate-200 rounded-xl p-6 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {visibleCourses.map((course) => {
                    const accent = CATEGORY_ACCENT[course.category] || {
                      text: 'text-[#0057FF]',
                      bg: 'bg-blue-50',
                      border: 'border-blue-200',
                    };
                    return (
                      <div
                        key={course.id}
                        className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-6 hover:border-[#0057FF]/50 transition-colors"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className={`font-semibold ${accent.text}`}>
                              {course.category}
                            </span>
                            <span className="font-mono text-slate-500 tabular-nums">
                              {course.durationMonths} oy · {course.curriculum?.length || 0} modul
                            </span>
                          </div>
                          <h3 className="font-display text-lg font-bold text-slate-900 leading-snug">
                            {course.title}
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {course.description}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-4">
                          <div className="flex items-baseline justify-between gap-2">
                            <div>
                              <div className="text-xs text-slate-500">Ustoz</div>
                              <div className="text-sm font-medium text-slate-800">
                                {course.teacherName}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500">Oylik to'lov</div>
                              <div className="font-mono text-base font-semibold text-[#0057FF] tabular-nums">
                                {formatUZS(course.price)}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectCourseForRegistration(course.id)}
                            className={`w-full py-2.5 px-4 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${accent.text} ${accent.bg} ${accent.border} hover:bg-[#0057FF] hover:text-white hover:border-[#0057FF]`}
                          >
                            Shu yo'nalishga yozilish
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* DEDICATED REGISTRATION FORM + SYLLABUS TIMELINE */}
          <RegistrationSection
            courses={courses}
            selectedCourseId={selectedCourseId}
            onSelectCourseId={setSelectedCourseId}
            onStudentAuthenticated={handleAuthenticated}
          />

          {/* DEDICATED LOCATION SECTION ("Manzil") */}
          {location && (
            <section id="location" className="py-16 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white">
              <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-7 space-y-4">
                    <p className="text-xs font-semibold text-sky-400 tracking-wide">
                      Bizning manzil
                    </p>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-white text-balance">
                      Meta IT School o'quv markazi joylashuvi
                    </h2>
                    <p className="text-slate-300 text-sm sm:text-base max-w-xl">
                      Markazimizga tashrif buyuring, zamonaviy kompyuter xonalari bilan tanishing va o'zingizga mos IT yo'nalishi bo'yicha bepul maslahat oling.
                    </p>
                    {validMapLink && (
                      <div className="pt-2">
                        <a
                          href={validMapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0057FF] hover:bg-[#0044CC] rounded-lg transition-colors"
                        >
                          Xaritada ko'rish
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5 bg-slate-800/70 border border-slate-700 rounded-2xl p-6 space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-slate-400">Manzil</div>
                        <div className="font-medium text-white mt-0.5">{location.address}</div>
                        {location.landmark && (
                          <div className="text-xs text-slate-300 mt-1">
                            Mo'ljal: {location.landmark}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pt-3 border-t border-slate-700">
                      <Clock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-slate-400">Ish vaqti</div>
                        <div className="font-medium text-white mt-0.5">{location.workingHours}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pt-3 border-t border-slate-700">
                      <Phone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-slate-400">Aloqa telefoni</div>
                        <div className="font-mono font-medium text-white tabular-nums mt-0.5">
                          {location.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 3-PATH CABINET PORTALS (Admin, Ustoz, O'quvchi) */}
          <section id="portals" className="py-20 bg-[#F8FAFC]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
              <div className="max-w-2xl space-y-2">
                <p className="text-xs font-semibold text-[#0057FF]">Tizimga kirish</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Uch xil yo'l bilan shaxsiy kabinetga kirish
                </h2>
                <p className="text-sm text-slate-600">
                  Meta IT School tizimida Admin, ro'yxatdan o'tgan Ustoz va O'quvchilar uchun alohida ishchi kabinetlar mavjud.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Admin */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-6">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      Admin kabineti
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Maxsus parol orqali kirish. IT kurs turlarini qo'shish, narx belgilash, manzilni tahrirlash va o'quvchilarni boshqarish.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenPortalForRole('admin')}
                    className="w-full py-2.5 px-4 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Admin sifatida kirish
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Ustoz */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-6">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0057FF] text-white flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      Ustoz kabineti
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Ro'yxatdan o'tgan o'qituvchilar uchun dars jadvali, o'tiladigan IT yo'nalishini ko'rish va o'z darslarini boshqarish.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenPortalForRole('teacher')}
                    className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0057FF] hover:bg-[#0044CC] rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Ustoz sifatida kirish
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* O'quvchi */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-6">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      O'quvchi kabineti
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Kursga yozilish stoli: barcha IT kurslari, davomiyligi, mavzular ketma-ketligi va qulay vaqtni tanlab yozilish.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenPortalForRole('student')}
                    className="w-full py-2.5 px-4 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    O'quvchi sifatida kirish
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_PATH}
              alt="Meta IT School"
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover border border-slate-200"
            />
            <span className="font-display font-semibold text-slate-900">Meta IT School</span>
            <span aria-hidden="true">·</span>
            <span>IT Ta'lim Markazi</span>
          </div>
          <p className="text-xs text-slate-400">
            © 2026 Meta IT School. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </footer>

      <AuthPortalModal
        isOpen={authModalOpen}
        initialRole={authInitialRole}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}
