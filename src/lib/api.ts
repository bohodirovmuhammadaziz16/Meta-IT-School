import type {
  Course,
  LessonRecord,
  PublicTeacherSummary,
  PublicUser,
  SchoolLocation,
  StudentRecord,
  UserRole,
} from '../types';

// Keep auth token strictly in JS memory rather than localStorage/sessionStorage
let inMemoryToken: string | null = null;

export function getStoredToken(): string | null {
  return inMemoryToken;
}

export function setStoredToken(token: string | null): void {
  inMemoryToken = token;
}

export function formatUZS(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount).replace(/,/g, ' ')} so'm`;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Server bilan bog'lanishda xatolik yuz berdi.");
  }
  return data;
}

export const api = {
  getBootstrap: () =>
    request<{
      courses: Course[];
      teachers: PublicTeacherSummary[];
      location: SchoolLocation;
      lessons: Array<{
        id: string;
        courseName: string;
        teacherName: string;
        day: string;
        timeSlot: string;
        room: string;
        groupName: string;
        status: string;
      }>;
    }>('/api/public/bootstrap'),

  getAdminStatus: () =>
    request<{ configured: boolean; source: 'env' | 'claimed' | 'none' }>('/api/auth/admin-status'),

  setupAdminPasscode: (passcode: string) =>
    request<{ token: string; user: PublicUser }>('/api/auth/admin-setup', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),

  submitRegistration: (payload: {
    firstName: string;
    lastName: string;
    age: number;
    phone: string;
    preferredDays: string[];
    preferredTime: string;
    courseId: string;
    createStudentAccount?: boolean;
    password?: string;
  }) =>
    request<{
      registration: StudentRecord;
      token?: string;
      user?: PublicUser;
      telegramSent?: boolean;
    }>('/api/registrations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { role: UserRole; identifier?: string; password: string }) =>
    request<{ token: string; user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  registerTeacher: (payload: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    specialty: string;
  }) =>
    request<{ token: string; user: PublicUser }>('/api/auth/register-teacher', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  registerStudent: (payload: {
    firstName: string;
    lastName: string;
    age: number;
    phone: string;
    password: string;
  }) =>
    request<{ token: string; user: PublicUser }>('/api/auth/register-student', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: PublicUser }>('/api/auth/me'),

  adminGetOverview: () =>
    request<{
      courses: Course[];
      students: StudentRecord[];
      teachers: PublicUser[];
      lessons: LessonRecord[];
      location: SchoolLocation;
      telegram: {
        configured: boolean;
        source: 'env' | 'runtime' | 'none';
        channelId: string;
      };
    }>('/api/admin/overview'),

  adminUpdateLocation: (payload: SchoolLocation) =>
    request<{ location: SchoolLocation }>('/api/admin/location', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  adminSaveTelegramConfig: (payload: { botToken: string; channelId: string }) =>
    request<{ configured: boolean; source: string; channelId: string }>('/api/admin/telegram-config', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminTestTelegram: () =>
    request<{ ok: boolean }>('/api/admin/telegram-test', {
      method: 'POST',
    }),

  adminCreateCourse: (payload: Partial<Course>) =>
    request<{ course: Course }>('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminUpdateCourse: (id: string, payload: Partial<Course>) =>
    request<{ course: Course }>(`/api/admin/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  adminDeleteCourse: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/courses/${id}`, {
      method: 'DELETE',
    }),

  adminUpdateStudent: (id: string, payload: Partial<StudentRecord>) =>
    request<{ student: StudentRecord }>(`/api/admin/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  adminDeleteStudent: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/students/${id}`, {
      method: 'DELETE',
    }),

  teacherGetDashboard: () =>
    request<{
      teacher: PublicUser;
      assignedCourses: Course[];
      allCourses: Course[];
      lessons: LessonRecord[];
      students: StudentRecord[];
    }>('/api/teacher/dashboard'),

  teacherCreateLesson: (payload: Partial<LessonRecord>) =>
    request<{ lesson: LessonRecord }>('/api/teacher/lessons', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  teacherUpdateLesson: (id: string, payload: Partial<LessonRecord>) =>
    request<{ lesson: LessonRecord }>(`/api/teacher/lessons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  teacherDeleteLesson: (id: string) =>
    request<{ ok: boolean }>(`/api/teacher/lessons/${id}`, {
      method: 'DELETE',
    }),

  studentGetDashboard: () =>
    request<{
      student: PublicUser;
      courses: Course[];
      enrollments: StudentRecord[];
      lessons: LessonRecord[];
    }>('/api/student/dashboard'),

  studentEnroll: (payload: {
    courseId: string;
    preferredDays: string[];
    preferredTime: string;
    notes?: string;
  }) =>
    request<{ enrollment: StudentRecord; telegramSent?: boolean }>('/api/student/enroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  studentCancelEnrollment: (id: string) =>
    request<{ ok: boolean }>(`/api/student/enroll/${id}`, {
      method: 'DELETE',
    }),
};
