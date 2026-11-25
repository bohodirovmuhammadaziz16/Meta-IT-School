export type UserRole = 'admin' | 'teacher' | 'student';

export type StudentStatus = 'Yangi' | 'Tasdiqlangan' | "O'qimoqda" | 'Yakunlagan';

export type LessonStatus = 'Rejalashtirilgan' | "O'tildi" | 'Qoldirildi';

export interface PublicUser {
  id: string;
  role: UserRole;
  fullName: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  email: string;
  phone: string;
  specialty?: string;
  track: "IT yo'nalishi";
}

export interface SchoolLocation {
  address: string;
  landmark: string;
  workingHours: string;
  phone: string;
  mapLink: string;
}

export interface Course {
  id: string;
  title: string;
  track: "IT yo'nalishi";
  category: string;
  price: number;
  durationMonths: number;
  teacherId: string;
  teacherName: string;
  description: string;
  scheduleSummary: string;
  curriculum: string[];
  active: boolean;
}

export interface StudentRecord {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  phone: string;
  preferredDays: string[];
  preferredTime: string;
  track: "IT yo'nalishi";
  courseId: string;
  courseName: string;
  status: StudentStatus;
  groupName: string;
  notes: string;
  studentUserId?: string;
  createdAt: string;
}

export interface LessonRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseName: string;
  track: "IT yo'nalishi";
  title: string;
  day: string;
  timeSlot: string;
  room: string;
  groupName: string;
  status: LessonStatus;
  notes: string;
}

export interface PublicTeacherSummary {
  id: string;
  fullName: string;
  specialty: string;
  track: "IT yo'nalishi";
}

export const DAYS_OF_WEEK = [
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
] as const;

export const TIME_SLOTS = [
  '09:00 - 11:00',
  '11:00 - 13:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:30 - 20:30',
] as const;

export const IT_CATEGORIES = [
  'Web dasturlash',
  'Backend dasturlash',
  'Full-Stack dasturlash',
  'Mobil dasturlash',
  'UI/UX dizayn',
  'Kiberxavfsizlik',
  "Sun'iy intellekt & Data Science",
  "Ma'lumotlar tahlili",
  'DevOps & Cloud',
  'QA Engineering',
  "O'yinlar yaratish",
  'Grafik va Motion dizayn',
] as const;
