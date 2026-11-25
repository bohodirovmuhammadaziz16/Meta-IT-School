import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type {
  Course,
  LessonRecord,
  LessonStatus,
  PublicUser,
  SchoolLocation,
  StudentRecord,
  StudentStatus,
  UserRole,
} from './src/types.ts';

interface StoredUser extends PublicUser {
  passwordHash: string;
}

interface DatabaseSchema {
  adminPasscodeHash?: string;
  location: SchoolLocation;
  users: StoredUser[];
  courses: Course[];
  students: StudentRecord[];
  lessons: LessonRecord[];
}

interface SessionPayload {
  userId: string;
  role: UserRole;
  exp: number;
}

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// In-memory runtime override for Telegram config if Admin sets it in UI before adding Secrets
let runtimeTelegramConfig: { botToken: string; channelId: string } | null = null;

function getTelegramCredentials(): { botToken: string; channelId: string; source: 'env' | 'runtime' | 'none' } {
  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const envChannel = process.env.TELEGRAM_CHANNEL_ID?.trim();
  if (envToken && envChannel) {
    return { botToken: envToken, channelId: envChannel, source: 'env' };
  }
  if (runtimeTelegramConfig?.botToken && runtimeTelegramConfig?.channelId) {
    return { ...runtimeTelegramConfig, source: 'runtime' };
  }
  return { botToken: '', channelId: '', source: 'none' };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function verifyEnvPasscode(input: string, expected: string): boolean {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function signToken(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s()-]/g, '').trim();
}

function isSafeHttpUrl(url: string): boolean {
  if (!url.trim()) return true;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function toPublicUser(user: StoredUser): PublicUser {
  const { passwordHash: _ignored, ...pub } = user;
  return pub;
}

const DEFAULT_LOCATION: SchoolLocation = {
  address: "Toshkent sh., Chilonzor tumani, Bunyodkor ko'chasi, 15-uy",
  landmark: "Novza metro bekati yonida, Meta IT Markazi 2-qavat",
  workingHours: 'Dushanba - Shanba · 09:00 - 21:00',
  phone: '+998 90 100 00 01',
  mapLink: 'https://maps.google.com/?q=Tashkent+Novza',
};

const DEFAULT_COURSES: Course[] = [
  {
    id: 'crs_frontend',
    title: 'Frontend Development (React & TypeScript)',
    track: "IT yo'nalishi",
    category: 'Web dasturlash',
    price: 1200000,
    durationMonths: 6,
    teacherId: 'usr_teacher_1',
    teacherName: 'Sardorbek Alimov',
    description: "HTML5, CSS3, zamonaviy JavaScript, TypeScript va React yordamida real veb-ilovalar yaratish.",
    scheduleSummary: 'Dushanba · Chorshanba · Juma',
    curriculum: [
      '1-oy: HTML5, CSS3, Flexbox, Grid va Responsive dizayn asoslari',
      '2-oy: Tailwind CSS va Git/GitHub bilan jamoaviy ishlash',
      '3-oy: JavaScript ES6+, DOM bilan ishlash va Asinxron soʻrovlar',
      '4-oy: TypeScript turlari va modulli arxitektura',
      '5-oy: React Hooks, Router, State management va REST API integratsiya',
      '6-oy: Next.js asoslari, optimizatsiya va yakuniy portfolio loyihasi',
    ],
    active: true,
  },
  {
    id: 'crs_backend',
    title: 'Backend Engineering (Python & Node.js)',
    track: "IT yo'nalishi",
    category: 'Backend dasturlash',
    price: 1350000,
    durationMonths: 7,
    teacherId: 'usr_teacher_2',
    teacherName: 'Dilnoza Karimova',
    description: "REST API, PostgreSQL, autentifikatsiya, server arxitekturasi va yuqori yuklamali tizimlar.",
    scheduleSummary: 'Seshanba · Payshanba · Shanba',
    curriculum: [
      '1-oy: Python asoslari, algoritmlar va maʼlumotlar tuzilmasi',
      '2-oy: OOP tamoyillari va Node.js / Express asoslari',
      '3-oy: PostgreSQL, SQL soʻrovlar va maʼlumotlar bazasini loyihalash',
      '4-oy: Django / FastAPI yordamida RESTful API yaratish',
      '5-oy: JWT, OAuth, xavfsizlik va keshlash (Redis)',
      '6-oy: Docker konteynerizatsiya va mikroservis arxitekturasi',
      '7-oy: Serverga joylashtirish (CI/CD) va yakuniy backend loyiha',
    ],
    active: true,
  },
  {
    id: 'crs_fullstack',
    title: 'Full-Stack Web Development (Next.js & PostgreSQL)',
    track: "IT yo'nalishi",
    category: 'Full-Stack dasturlash',
    price: 1500000,
    durationMonths: 8,
    teacherId: 'usr_teacher_1',
    teacherName: 'Sardorbek Alimov',
    description: "Frontend va Backend texnologiyalarini to'liq birlashtirib, noldan tayyor SaaS platformalar qurish.",
    scheduleSummary: 'Dushanba · Chorshanba · Juma',
    curriculum: [
      '1-oy: Web asoslari, HTML/CSS va Tailwind CSS',
      '2-oy: JavaScript & TypeScript chuqurlashtirilgan kursi',
      '3-oy: React komponentlar arxitekturasi va UI holat boshqaruvi',
      '4-oy: Node.js, Express va Server-Side Rendering',
      '5-oy: Next.js App Router, Server Actions va API Routes',
      '6-oy: PostgreSQL, Prisma ORM va maʼlumotlar xavfsizligi',
      '7-oy: Toʻlov tizimlari, real-time WebSocket va autentifikatsiya',
      '8-oy: Production deploy va real startap loyihasini himoya qilish',
    ],
    active: true,
  },
  {
    id: 'crs_flutter',
    title: 'Mobile App Development (Flutter — iOS & Android)',
    track: "IT yo'nalishi",
    category: 'Mobil dasturlash',
    price: 1400000,
    durationMonths: 6,
    teacherId: 'usr_teacher_1',
    teacherName: 'Sardorbek Alimov',
    description: "Dart va Flutter yordamida bir vaqtning o'zida iOS va Android uchun tezkor mobil ilovalar yaratish.",
    scheduleSummary: 'Seshanba · Payshanba · Shanba',
    curriculum: [
      '1-oy: Dart dasturlash tili va OOP asoslari',
      '2-oy: Flutter Widget Tree, Layoutlar va Material/Cupertino UI',
      '3-oy: Navigatsiya, animatsiyalar va foydalanuvchi formalari',
      '4-oy: State Management (Bloc / Riverpod) va lokal xotira',
      '5-oy: REST API, Push-xabarnomalar va Google Maps integratsiyasi',
      '6-oy: App Store va Google Play Marketga ilova yuklash',
    ],
    active: true,
  },
  {
    id: 'crs_uiux',
    title: 'UI/UX & Product Design (Figma)',
    track: "IT yo'nalishi",
    category: 'UI/UX dizayn',
    price: 950000,
    durationMonths: 4,
    teacherId: 'usr_teacher_3',
    teacherName: 'Javohir Tursunov',
    description: "Foydalanuvchi tadqiqoti, wireframe, Figma komponentlar tizimi va mobil/veb interfeys dizayni.",
    scheduleSummary: 'Dushanba · Chorshanba · Juma',
    curriculum: [
      '1-oy: Dizayn tafakkuri, UX tadqiqot, User Flow va Wireframing',
      '2-oy: Figma Auto Layout, ranglar nazariyasi va tipografika',
      '3-oy: Dizayn tizimlari (Design System), UI kitlar va interaktiv prototiplar',
      '4-oy: Veb va mobil ilova loyihasi, Behance/Dribbble portfolioni tayyorlash',
    ],
    active: true,
  },
  {
    id: 'crs_cyber',
    title: 'Cybersecurity & Network Security',
    track: "IT yo'nalishi",
    category: 'Kiberxavfsizlik',
    price: 1550000,
    durationMonths: 6,
    teacherId: 'usr_teacher_2',
    teacherName: 'Dilnoza Karimova',
    description: "Tarmoq xavfsizligi, Linux administratsiya, Pentesting va veb-ilovalarni himoya qilish asoslari.",
    scheduleSummary: 'Seshanba · Payshanba · Shanba',
    curriculum: [
      '1-oy: Kompyuter tarmoqlari (TCP/IP, DNS, HTTP) va Linux tizimi',
      '2-oy: Kriptografiya, autentifikatsiya va xavfsiz protokollar',
      '3-oy: Veb-zaifliklar (OWASP Top 10: XSS, SQLi, CSRF)',
      '4-oy: Penetration Testing vositalari (Kali Linux, Burp Suite, Nmap)',
      '5-oy: Tarmoq monitoringi, SIEM va insidentlarga javob berish',
      '6-oy: CTF amaliy musobaqalari va tizim auditi loyihasi',
    ],
    active: true,
  },
  {
    id: 'crs_ai',
    title: 'Data Science, AI & Machine Learning',
    track: "IT yo'nalishi",
    category: "Sun'iy intellekt & Data Science",
    price: 1600000,
    durationMonths: 7,
    teacherId: 'usr_teacher_2',
    teacherName: 'Dilnoza Karimova',
    description: "Python, Machine Learning algoritmlari, neyron tarmoqlar va zamonaviy AI modellar bilan ishlash.",
    scheduleSummary: 'Dushanba · Chorshanba · Juma',
    curriculum: [
      '1-oy: Python, NumPy va chiziqli algebra/ehtimollar asoslari',
      '2-oy: Pandas, maʼlumotlarni tozalash va vizualizatsiya',
      '3-oy: Nazoratli oʻqitish (Regression, Classification, Scikit-learn)',
      '4-oy: Nazoratsiz oʻqitish (Clustering) va modelni baholash',
      '5-oy: Deep Learning va Neyron tarmoqlar (PyTorch / TensorFlow)',
      '6-oy: NLP, LLM API integratsiyasi va RAG tizimlari',
      '7-oy: Real sunʼiy intellekt mahsulotini yaratish va himoya qilish',
    ],
    active: true,
  },
  {
    id: 'crs_data',
    title: 'Data Analytics & SQL / Power BI',
    track: "IT yo'nalishi",
    category: "Ma'lumotlar tahlili",
    price: 1100000,
    durationMonths: 5,
    teacherId: 'usr_teacher_2',
    teacherName: 'Dilnoza Karimova',
    description: "SQL so'rovlar, Excel/Google Sheets, Power BI va biznes ko'rsatkichlari uchun analitik dashboardlar.",
    scheduleSummary: 'Dushanba · Chorshanba · Juma',
    curriculum: [
      '1-oy: Analitik fikrlash, Excel/Google Sheets ilgʻor formulalari',
      '2-oy: SQL asoslari, JOINlar, agregatsiya va murakkab soʻrovlar',
      '3-oy: Python Pandas bilan katta maʼlumotlarni qayta ishlash',
      '4-oy: Power BI va Tableau orqali interaktiv biznes dashboardlar',
      '5-oy: A/B testlash, KPI tahlili va real biznes keys himoyasi',
    ],
    active: true,
  },
  {
    id: 'crs_devops',
    title: 'DevOps & Cloud Engineering (Docker, Linux, AWS)',
    track: "IT yo'nalishi",
    category: 'DevOps & Cloud',
    price: 1500000,
    durationMonths: 5,
    teacherId: 'usr_teacher_2',
    teacherName: 'Dilnoza Karimova',
    description: "Linux serverlar, Docker, Kubernetes, CI/CD avtomatlashtirish va bulutli infratuzilma.",
    scheduleSummary: 'Seshanba · Payshanba · Shanba',
    curriculum: [
      '1-oy: Linux tizim administratsiyasi, Bash skriptlar va Nginx',
      '2-oy: Docker va Docker Compose yordamida konteynerizatsiya',
      '3-oy: CI/CD pipeline (GitHub Actions, GitLab CI) qurish',
      '4-oy: Kubernetes orkestratsiyasi va AWS bulut xizmatlari',
      '5-oy: Monitoring (Prometheus, Grafana) va Terraform (IaC)',
    ],
    active: true,
  },
  {
    id: 'crs_qa',
    title: 'QA Engineering (Software Testing & Automation)',
    track: "IT yo'nalishi",
    category: 'QA Engineering',
    price: 1000000,
    durationMonths: 4,
    teacherId: 'usr_teacher_1',
    teacherName: 'Sardorbek Alimov',
    description: "Manual va avtomatlashtirilgan dasturiy ta'minot testi, Postman API testing va Playwright/Selenium.",
    scheduleSummary: 'Dushanba · Chorshanba · Juma',
    curriculum: [
      '1-oy: QA asoslari, Test Case, Bug Report va Jira bilan ishlash',
      '2-oy: Veb va Mobil ilovalarni qoʻlda (Manual) testlash va SQL',
      '3-oy: API testlash (Postman, Swagger) va avtomatlashtirish asoslari',
      '4-oy: Playwright / Selenium yordamida avto-testlar yozish',
    ],
    active: true,
  },
  {
    id: 'crs_gamedev',
    title: '3D Modeling & Game Development (Unity / C#)',
    track: "IT yo'nalishi",
    category: "O'yinlar yaratish",
    price: 1300000,
    durationMonths: 6,
    teacherId: 'usr_teacher_3',
    teacherName: 'Javohir Tursunov',
    description: "C# dasturlash tili va Unity dvijogi orqali 2D/3D o'yinlar mexanikasi va mobil o'yinlar yaratish.",
    scheduleSummary: 'Seshanba · Payshanba · Shanba',
    curriculum: [
      '1-oy: C# dasturlash tili va oʻyinlar mantigʻi asoslari',
      '2-oy: Unity interfeysi, fizika, toʻqnashuvlar va 2D oʻyin yaratish',
      '3-oy: Blender asoslari va 3D obyektlarni Unityga integratsiya qilish',
      '4-oy: Kamera boshqaruvi, animatsiyalar, ovoz va UI menyular',
      '5-oy: Sunʼiy intellekt (NPC), optimizatsiya va mobil boshqaruv',
      '6-oy: Tayyor 3D oʻyin loyihasini chiqarish',
    ],
    active: true,
  },
  {
    id: 'crs_graphic',
    title: 'Grafik Dizayn & Motion (Photoshop, Illustrator, After Effects)',
    track: "IT yo'nalishi",
    category: 'Grafik va Motion dizayn',
    price: 900000,
    durationMonths: 4,
    teacherId: 'usr_teacher_3',
    teacherName: 'Javohir Tursunov',
    description: "Brending, logotip, reklama bannerlari va IT mahsulotlar uchun motion animatsiyalar tayyorlash.",
    scheduleSummary: 'Dushanba · Chorshanba · Juma',
    curriculum: [
      '1-oy: Adobe Photoshop — retush, kollaj va ijtimoiy tarmoq dizayni',
      '2-oy: Adobe Illustrator — vektor grafika, logotip va brendbuk',
      '3-oy: Tipografika, kompozitsiya va bosma/raqamli materiallar',
      '4-oy: After Effects bilan Motion dizayn va portfolio loyihasi',
    ],
    active: true,
  },
];

function createInitialDb(): DatabaseSchema {
  const adminId = 'usr_admin_1';
  const teacher1Id = 'usr_teacher_1';
  const teacher2Id = 'usr_teacher_2';
  const teacher3Id = 'usr_teacher_3';
  const student1Id = 'usr_student_1';

  return {
    location: DEFAULT_LOCATION,
    users: [
      {
        id: adminId,
        role: 'admin',
        fullName: 'Meta IT Administrator',
        email: 'admin@metait.uz',
        phone: '+998901000001',
        track: "IT yo'nalishi",
        passwordHash: '',
      },
      {
        id: teacher1Id,
        role: 'teacher',
        fullName: 'Sardorbek Alimov',
        email: 'sardor@metait.uz',
        phone: '+998901112233',
        specialty: 'Frontend, Full-Stack & Mobile (React / Flutter)',
        track: "IT yo'nalishi",
        passwordHash: hashPassword('ustoz123'),
      },
      {
        id: teacher2Id,
        role: 'teacher',
        fullName: 'Dilnoza Karimova',
        email: 'dilnoza@metait.uz',
        phone: '+998902223344',
        specialty: 'Backend, Data Science, DevOps & Cybersecurity',
        track: "IT yo'nalishi",
        passwordHash: hashPassword('ustoz123'),
      },
      {
        id: teacher3Id,
        role: 'teacher',
        fullName: 'Javohir Tursunov',
        email: 'javohir@metait.uz',
        phone: '+998903334455',
        specialty: 'UI/UX, Grafik Dizayn & 3D Game Dev',
        track: "IT yo'nalishi",
        passwordHash: hashPassword('ustoz123'),
      },
      {
        id: student1Id,
        role: 'student',
        fullName: 'Azizbek Rahimov',
        firstName: 'Azizbek',
        lastName: 'Rahimov',
        age: 19,
        email: 'azizbek@metait.uz',
        phone: '+998904445566',
        track: "IT yo'nalishi",
        passwordHash: hashPassword('oquvchi123'),
      },
    ],
    courses: DEFAULT_COURSES,
    students: [
      {
        id: 'std_1',
        firstName: 'Azizbek',
        lastName: 'Rahimov',
        age: 19,
        phone: '+998904445566',
        preferredDays: ['Dushanba', 'Chorshanba', 'Juma'],
        preferredTime: '14:00 - 16:00',
        track: "IT yo'nalishi",
        courseId: 'crs_frontend',
        courseName: 'Frontend Development (React & TypeScript)',
        status: "O'qimoqda",
        groupName: 'FE-101',
        notes: 'Asosiy HTML/CSS bilimi bor',
        studentUserId: student1Id,
        createdAt: '2026-11-10T09:00:00.000Z',
      },
      {
        id: 'std_2',
        firstName: 'Madina',
        lastName: 'Usmonova',
        age: 21,
        phone: '+998935556677',
        preferredDays: ['Seshanba', 'Payshanba', 'Shanba'],
        preferredTime: '16:00 - 18:00',
        track: "IT yo'nalishi",
        courseId: 'crs_backend',
        courseName: 'Backend Engineering (Python & Node.js)',
        status: 'Tasdiqlangan',
        groupName: 'BE-204',
        notes: 'Python asoslari bilan tanish',
        createdAt: '2026-11-18T11:30:00.000Z',
      },
      {
        id: 'std_3',
        firstName: 'Bobur',
        lastName: 'Nazarov',
        age: 17,
        phone: '+998977778899',
        preferredDays: ['Dushanba', 'Chorshanba', 'Juma'],
        preferredTime: '18:30 - 20:30',
        track: "IT yo'nalishi",
        courseId: 'crs_uiux',
        courseName: 'UI/UX & Product Design (Figma)',
        status: 'Yangi',
        groupName: 'UX-102',
        notes: 'Kechki guruhga yozildi',
        createdAt: '2026-11-22T15:10:00.000Z',
      },
    ],
    lessons: [
      {
        id: 'lsn_1',
        teacherId: teacher1Id,
        teacherName: 'Sardorbek Alimov',
        courseId: 'crs_frontend',
        courseName: 'Frontend Development (React & TypeScript)',
        track: "IT yo'nalishi",
        title: 'React Hooks va State Boshqaruvi',
        day: 'Dushanba',
        timeSlot: '14:00 - 16:00',
        room: 'Xona 201',
        groupName: 'FE-101',
        status: "O'tildi",
        notes: 'Amaliy mashgʻulot va uyga vazifa tekshiruvi',
      },
      {
        id: 'lsn_2',
        teacherId: teacher1Id,
        teacherName: 'Sardorbek Alimov',
        courseId: 'crs_frontend',
        courseName: 'Frontend Development (React & TypeScript)',
        track: "IT yo'nalishi",
        title: 'TypeScript Generics va API Integratsiya',
        day: 'Chorshanba',
        timeSlot: '14:00 - 16:00',
        room: 'Xona 201',
        groupName: 'FE-101',
        status: 'Rejalashtirilgan',
        notes: 'Fetch API va xatoliklarni boshqarish',
      },
      {
        id: 'lsn_3',
        teacherId: teacher1Id,
        teacherName: 'Sardorbek Alimov',
        courseId: 'crs_flutter',
        courseName: 'Mobile App Development (Flutter — iOS & Android)',
        track: "IT yo'nalishi",
        title: 'Flutter Widget Tree va Navigation',
        day: 'Seshanba',
        timeSlot: '16:00 - 18:00',
        room: 'Xona 203',
        groupName: 'FL-105',
        status: 'Rejalashtirilgan',
        notes: 'Mobil ekranlar orasida oʻtish',
      },
      {
        id: 'lsn_4',
        teacherId: teacher2Id,
        teacherName: 'Dilnoza Karimova',
        courseId: 'crs_backend',
        courseName: 'Backend Engineering (Python & Node.js)',
        track: "IT yo'nalishi",
        title: 'RESTful API Arxitekturasi va Express Middleware',
        day: 'Seshanba',
        timeSlot: '16:00 - 18:00',
        room: 'Xona 302',
        groupName: 'BE-204',
        status: 'Rejalashtirilgan',
        notes: 'JWT va rolga asoslangan ruxsatlar',
      },
      {
        id: 'lsn_5',
        teacherId: teacher3Id,
        teacherName: 'Javohir Tursunov',
        courseId: 'crs_uiux',
        courseName: 'UI/UX & Product Design (Figma)',
        track: "IT yo'nalishi",
        title: 'Auto Layout va Komponent Kutubxonasi',
        day: 'Dushanba',
        timeSlot: '18:30 - 20:30',
        room: 'Design Studio 104',
        groupName: 'UX-102',
        status: 'Rejalashtirilgan',
        notes: 'Figma amaliy loyiha',
      },
    ],
  };
}

function readDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw) as DatabaseSchema;

  // Migrate smoothly if db.json came from earlier turn
  let changed = false;
  if (!parsed.location) {
    parsed.location = DEFAULT_LOCATION;
    changed = true;
  }
  const existingCourseIds = new Set(parsed.courses.map((c) => c.id));
  parsed.courses = parsed.courses.map((c) => {
    if (!Array.isArray(c.curriculum) || c.curriculum.length === 0) {
      const def = DEFAULT_COURSES.find((d) => d.id === c.id);
      changed = true;
      return {
        ...c,
        curriculum: def?.curriculum || [
          '1-oy: Asosiy tushunchalar va amaliy poydevor',
          '2-oy: Asosiy texnologiyalar bilan ishlash',
          '3-oy: Real loyiha va portfolio tayyorlash',
        ],
      };
    }
    return c;
  });
  for (const defCourse of DEFAULT_COURSES) {
    if (!existingCourseIds.has(defCourse.id)) {
      parsed.courses.push(defCourse);
      changed = true;
    }
  }
  if (changed) {
    writeDb(parsed);
  }
  return parsed;
}

function writeDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

async function notifyTelegramStudent(
  student: StudentRecord,
  course: Course,
  sourceLabel: string
): Promise<{ sent: boolean; reason?: string }> {
  const { botToken, channelId } = getTelegramCredentials();
  if (!botToken || !channelId) {
    return { sent: false, reason: 'Telegram konfiguratsiyasi kiritilmagan' };
  }

  const formattedPrice = `${new Intl.NumberFormat('uz-UZ').format(course.price).replace(/,/g, ' ')} so'm/oy`;
  const lines = [
    `META IT SCHOOL — ${sourceLabel}`,
    '',
    `O'quvchi: ${student.firstName} ${student.lastName}`,
    `Yoshi: ${student.age} yosh`,
    `Telefon: ${student.phone}`,
    `Yo'nalish: ${student.track}`,
    `Tanlangan kurs: ${course.title}`,
    `Davomiyligi: ${course.durationMonths} oy`,
    `Kurs narxi: ${formattedPrice}`,
    `Qulay kunlar: ${student.preferredDays.join(', ')}`,
    `Qulay vaqt: ${student.preferredTime}`,
    student.notes ? `Izoh: ${student.notes}` : null,
    `Holat: ${student.status}`,
    `Vaqt: ${new Date(student.createdAt).toLocaleString('uz-UZ')}`,
  ].filter(Boolean);

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: lines.join('\n'),
      }),
    });
    if (!response.ok) {
      const errBody = await response.text();
      console.error('Telegram API error:', response.status, errBody);
      return { sent: false, reason: `Telegram HTTP ${response.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('Telegram send failed:', err);
    return { sent: false, reason: 'Telegram tarmoq xatoligi' };
  }
}

interface AuthedRequest extends Request {
  authUser?: StoredUser;
}

function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Avtorizatsiya talab qilinadi.' });
      return;
    }
    const token = authHeader.slice('Bearer '.length);
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Sessiya muddati tugagan. Qayta kiring.' });
      return;
    }
    const db = readDb();
    const user = db.users.find((u) => u.id === payload.userId);
    if (!user || !allowedRoles.includes(user.role)) {
      res.status(403).json({ error: 'Ushbu boʻlimga kirish huquqingiz yoʻq.' });
      return;
    }
    req.authUser = user;
    next();
  };
}

async function startServer() {
  readDb();

  const app = express();
  app.use(express.json());

  // Public bootstrap: Courses, teachers, schedule overview, and school location
  app.get('/api/public/bootstrap', (_req: Request, res: Response) => {
    const db = readDb();
    const teachers = db.users
      .filter((u) => u.role === 'teacher')
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        specialty: u.specialty || "IT yo'nalishi",
        track: u.track,
      }));
    res.json({
      courses: db.courses.filter((c) => c.active),
      teachers,
      location: db.location,
      lessons: db.lessons.map((l) => ({
        id: l.id,
        courseName: l.courseName,
        teacherName: l.teacherName,
        day: l.day,
        timeSlot: l.timeSlot,
        room: l.room,
        groupName: l.groupName,
        status: l.status,
      })),
    });
  });

  // Public: Check whether Admin special passcode is configured
  app.get('/api/auth/admin-status', (_req: Request, res: Response) => {
    const db = readDb();
    const envConfigured = Boolean(process.env.ADMIN_PASSCODE?.trim());
    const dbConfigured = Boolean(db.adminPasscodeHash);
    res.json({
      configured: envConfigured || dbConfigured,
      source: envConfigured ? 'env' : dbConfigured ? 'claimed' : 'none',
    });
  });

  // One-time Admin passcode setup (locked once claimed or when ADMIN_PASSCODE env var is set)
  app.post('/api/auth/admin-setup', (req: Request, res: Response) => {
    const db = readDb();
    if (process.env.ADMIN_PASSCODE?.trim() || db.adminPasscodeHash) {
      res.status(403).json({ error: 'Admin maxsus paroli allaqachon oʻrnatilgan.' });
      return;
    }

    const { passcode } = req.body as { passcode?: string };
    if (!passcode || passcode.trim().length < 6) {
      res.status(400).json({ error: 'Maxsus admin paroli kamida 6 ta belgidan iborat boʻlishi kerak.' });
      return;
    }

    db.adminPasscodeHash = hashPassword(passcode.trim());
    writeDb(db);

    const adminUser = db.users.find((u) => u.role === 'admin');
    if (!adminUser) {
      res.status(500).json({ error: 'Admin profili topilmadi.' });
      return;
    }

    const token = signToken({
      userId: adminUser.id,
      role: 'admin',
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ token, user: toPublicUser(adminUser) });
  });

  // Public: Student Registration Form submission + Telegram notification
  app.post('/api/registrations', async (req: Request, res: Response) => {
    const {
      firstName,
      lastName,
      age,
      phone,
      preferredDays,
      preferredTime,
      courseId,
      createStudentAccount,
      password,
    } = req.body as {
      firstName?: string;
      lastName?: string;
      age?: number | string;
      phone?: string;
      preferredDays?: string[];
      preferredTime?: string;
      courseId?: string;
      createStudentAccount?: boolean;
      password?: string;
    };

    if (!firstName?.trim() || !lastName?.trim()) {
      res.status(400).json({ error: 'Ism va familiyani kiriting.' });
      return;
    }
    const parsedAge = Number(age);
    if (!Number.isFinite(parsedAge) || parsedAge < 7 || parsedAge > 75) {
      res.status(400).json({ error: "Yosh 7 dan 75 gacha bo'lishi kerak." });
      return;
    }
    const cleanPhone = (phone || '').trim();
    if (normalizePhone(cleanPhone).length < 9) {
      res.status(400).json({ error: "To'g'ri telefon raqamini kiriting." });
      return;
    }
    if (!Array.isArray(preferredDays) || preferredDays.length === 0) {
      res.status(400).json({ error: 'Kamida bitta qulay kunni tanlang.' });
      return;
    }
    if (!preferredTime?.trim()) {
      res.status(400).json({ error: 'Qulay vaqtni tanlang.' });
      return;
    }

    const db = readDb();
    const course = db.courses.find((c) => c.id === courseId && c.active);
    if (!course) {
      res.status(400).json({ error: "Tanlangan IT yo'nalishi topilmadi." });
      return;
    }

    let linkedUser: StoredUser | undefined;
    let authToken: string | undefined;

    if (createStudentAccount && password && password.trim().length >= 4) {
      const normalized = normalizePhone(cleanPhone);
      const existingUser = db.users.find((u) => normalizePhone(u.phone) === normalized);
      if (existingUser) {
        if (existingUser.role !== 'student') {
          res.status(409).json({ error: "Bu telefon raqami boshqa rol bilan ro'yxatdan o'tgan." });
          return;
        }
        linkedUser = existingUser;
      } else {
        linkedUser = {
          id: `usr_std_${Date.now()}`,
          role: 'student',
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          age: parsedAge,
          email: `${normalized.replace('+', '')}@student.metait.uz`,
          phone: cleanPhone,
          track: "IT yo'nalishi",
          passwordHash: hashPassword(password.trim()),
        };
        db.users.push(linkedUser);
      }
      authToken = signToken({
        userId: linkedUser.id,
        role: 'student',
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
    }

    const newStudent: StudentRecord = {
      id: `std_${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      age: parsedAge,
      phone: cleanPhone,
      preferredDays: preferredDays.slice(0, 6),
      preferredTime: preferredTime.trim(),
      track: "IT yo'nalishi",
      courseId: course.id,
      courseName: course.title,
      status: 'Yangi',
      groupName: 'Belgilanmagan',
      notes: '',
      studentUserId: linkedUser?.id,
      createdAt: new Date().toISOString(),
    };

    db.students.unshift(newStudent);
    writeDb(db);

    const telegramResult = await notifyTelegramStudent(
      newStudent,
      course,
      "Yangi o'quvchi ro'yxatdan o'tdi"
    );

    res.status(201).json({
      registration: newStudent,
      token: authToken,
      user: linkedUser ? toPublicUser(linkedUser) : undefined,
      telegramSent: telegramResult.sent,
    });
  });

  // Auth: Login for Admin (special passcode only, no email), Teacher, or Student
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { role, identifier, password } = req.body as {
      role?: UserRole;
      identifier?: string;
      password?: string;
    };

    if (!role || !password) {
      res.status(400).json({ error: 'Rol va parolni kiriting.' });
      return;
    }

    const db = readDb();

    if (role === 'admin') {
      const envPasscode = process.env.ADMIN_PASSCODE?.trim();
      const adminUser = db.users.find((u) => u.role === 'admin');
      if (!adminUser) {
        res.status(500).json({ error: 'Admin profili topilmadi.' });
        return;
      }

      let valid = false;
      if (envPasscode) {
        valid = verifyEnvPasscode(password.trim(), envPasscode);
      } else if (db.adminPasscodeHash) {
        valid = verifyPassword(password.trim(), db.adminPasscodeHash);
      } else {
        res.status(403).json({ error: 'Avval maxsus admin parolini oʻrnating.' });
        return;
      }

      if (!valid) {
        res.status(401).json({ error: "Maxsus admin paroli noto'g'ri." });
        return;
      }

      const token = signToken({
        userId: adminUser.id,
        role: 'admin',
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      res.json({ token, user: toPublicUser(adminUser) });
      return;
    }

    if (!identifier?.trim()) {
      res.status(400).json({ error: 'Email yoki telefon raqamini kiriting.' });
      return;
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanPhone = normalizePhone(identifier);

    const user = db.users.find(
      (u) =>
        u.role === role &&
        (u.email.toLowerCase() === cleanId || normalizePhone(u.phone) === cleanPhone)
    );

    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Login/telefon yoki parol noto'g'ri." });
      return;
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token, user: toPublicUser(user) });
  });

  // Auth: Register a new Teacher (Ustoz)
  app.post('/api/auth/register-teacher', (req: Request, res: Response) => {
    const { fullName, email, phone, password, specialty } = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
      specialty?: string;
    };

    if (!fullName?.trim() || !phone?.trim() || !password?.trim() || !specialty?.trim()) {
      res.status(400).json({ error: "Barcha ustoz ma'lumotlarini to'ldiring." });
      return;
    }
    if (password.trim().length < 4) {
      res.status(400).json({ error: "Parol kamida 4 ta belgidan iborat bo'lishi kerak." });
      return;
    }

    const db = readDb();
    const cleanEmail = (email?.trim() || `${normalizePhone(phone)}@metait.uz`).toLowerCase();
    const cleanPhone = normalizePhone(phone);

    const exists = db.users.some(
      (u) => u.email.toLowerCase() === cleanEmail || normalizePhone(u.phone) === cleanPhone
    );
    if (exists) {
      res.status(409).json({ error: "Bu email yoki telefon raqami allaqachon ro'yxatdan o'tgan." });
      return;
    }

    const newTeacher: StoredUser = {
      id: `usr_teacher_${Date.now()}`,
      role: 'teacher',
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      specialty: specialty.trim(),
      track: "IT yo'nalishi",
      passwordHash: hashPassword(password.trim()),
    };

    db.users.push(newTeacher);
    writeDb(db);

    const token = signToken({
      userId: newTeacher.id,
      role: 'teacher',
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ token, user: toPublicUser(newTeacher) });
  });

  // Auth: Register a new Student account
  app.post('/api/auth/register-student', (req: Request, res: Response) => {
    const { firstName, lastName, age, phone, password } = req.body as {
      firstName?: string;
      lastName?: string;
      age?: number | string;
      phone?: string;
      password?: string;
    };

    if (!firstName?.trim() || !lastName?.trim() || !phone?.trim() || !password?.trim()) {
      res.status(400).json({ error: "Ism, familiya, telefon va parolni kiriting." });
      return;
    }
    const parsedAge = Number(age);
    if (!Number.isFinite(parsedAge) || parsedAge < 7 || parsedAge > 75) {
      res.status(400).json({ error: "Yosh 7 dan 75 gacha bo'lishi kerak." });
      return;
    }
    if (password.trim().length < 4) {
      res.status(400).json({ error: "Parol kamida 4 ta belgidan iborat bo'lishi kerak." });
      return;
    }

    const db = readDb();
    const cleanPhone = normalizePhone(phone);
    const exists = db.users.some((u) => normalizePhone(u.phone) === cleanPhone);
    if (exists) {
      res.status(409).json({ error: "Bu telefon raqami allaqachon ro'yxatdan o'tgan." });
      return;
    }

    const newStudentUser: StoredUser = {
      id: `usr_student_${Date.now()}`,
      role: 'student',
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      age: parsedAge,
      email: `${cleanPhone.replace('+', '')}@student.metait.uz`,
      phone: phone.trim(),
      track: "IT yo'nalishi",
      passwordHash: hashPassword(password.trim()),
    };

    db.users.push(newStudentUser);
    writeDb(db);

    const token = signToken({
      userId: newStudentUser.id,
      role: 'student',
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ token, user: toPublicUser(newStudentUser) });
  });

  app.get('/api/auth/me', requireRole(['admin', 'teacher', 'student']), (req: AuthedRequest, res: Response) => {
    res.json({ user: toPublicUser(req.authUser!) });
  });

  // ADMIN ROUTES
  app.get('/api/admin/overview', requireRole(['admin']), (_req: AuthedRequest, res: Response) => {
    const db = readDb();
    const teachers = db.users.filter((u) => u.role === 'teacher').map(toPublicUser);
    const tg = getTelegramCredentials();
    res.json({
      courses: db.courses,
      students: db.students,
      teachers,
      lessons: db.lessons,
      location: db.location,
      telegram: {
        configured: tg.source !== 'none',
        source: tg.source,
        channelId: tg.channelId ? tg.channelId : '',
      },
    });
  });

  app.put('/api/admin/location', requireRole(['admin']), (req: AuthedRequest, res: Response) => {
    const { address, landmark, workingHours, phone, mapLink } = req.body as Partial<SchoolLocation>;
    if (!address?.trim() || !phone?.trim()) {
      res.status(400).json({ error: 'Manzil va aloqa telefonini kiriting.' });
      return;
    }
    if (mapLink && !isSafeHttpUrl(mapLink)) {
      res.status(400).json({ error: "Xarita havolasi http:// yoki https:// bilan boshlanishi kerak." });
      return;
    }

    const db = readDb();
    db.location = {
      address: address.trim(),
      landmark: landmark?.trim() || '',
      workingHours: workingHours?.trim() || 'Dushanba - Shanba · 09:00 - 21:00',
      phone: phone.trim(),
      mapLink: mapLink?.trim() || '',
    };
    writeDb(db);
    res.json({ location: db.location });
  });

  app.post('/api/admin/telegram-config', requireRole(['admin']), (req: AuthedRequest, res: Response) => {
    const { botToken, channelId } = req.body as { botToken?: string; channelId?: string };
    if (!botToken?.trim() || !channelId?.trim()) {
      res.status(400).json({ error: 'Bot token va Kanal ID ni kiriting.' });
      return;
    }
    runtimeTelegramConfig = {
      botToken: botToken.trim(),
      channelId: channelId.trim(),
    };
    res.json({
      configured: true,
      source: 'runtime',
      channelId: runtimeTelegramConfig.channelId,
    });
  });

  app.post('/api/admin/telegram-test', requireRole(['admin']), async (_req: AuthedRequest, res: Response) => {
    const { botToken, channelId } = getTelegramCredentials();
    if (!botToken || !channelId) {
      res.status(400).json({ error: 'Telegram bot token va kanal ID kiritilmagan.' });
      return;
    }
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: 'META IT SCHOOL — Telegram bildirishnomalari muvaffaqiyatli ulandi!',
        }),
      });
      if (!response.ok) {
        const txt = await response.text();
        res.status(400).json({ error: `Telegram xatoligi (${response.status}): ${txt}` });
        return;
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Telegram serveriga ulanib boʻlmadi.' });
    }
  });

  app.post('/api/admin/courses', requireRole(['admin']), (req: AuthedRequest, res: Response) => {
    const {
      title,
      category,
      price,
      durationMonths,
      teacherId,
      description,
      scheduleSummary,
      curriculum,
      active,
    } = req.body as Partial<Course>;

    if (!title?.trim()) {
      res.status(400).json({ error: 'Kurs nomini kiriting.' });
      return;
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      res.status(400).json({ error: "To'g'ri narx belgilang." });
      return;
    }

    const db = readDb();
    const teacher = db.users.find((u) => u.id === teacherId && u.role === 'teacher');

    const cleanCurriculum = Array.isArray(curriculum)
      ? curriculum.map((item) => String(item).trim()).filter(Boolean)
      : [];

    const newCourse: Course = {
      id: `crs_${Date.now()}`,
      title: title.trim(),
      track: "IT yo'nalishi",
      category: category?.trim() || 'Web dasturlash',
      price: numericPrice,
      durationMonths: Math.max(1, Number(durationMonths) || 6),
      teacherId: teacher ? teacher.id : '',
      teacherName: teacher ? teacher.fullName : 'Tayinlanmagan',
      description: description?.trim() || "Meta IT School amaliy IT o'quv dasturi.",
      scheduleSummary: scheduleSummary?.trim() || 'Dushanba · Chorshanba · Juma',
      curriculum:
        cleanCurriculum.length > 0
          ? cleanCurriculum
          : [
              '1-oy: Nazariy asoslar va ish muhitini sozlash',
              '2-oy: Asosiy texnologiyalar va amaliy mashqlar',
              '3-oy: Yakuniy loyiha va portfolio tayyorlash',
            ],
      active: active ?? true,
    };

    db.courses.push(newCourse);
    writeDb(db);
    res.status(201).json({ course: newCourse });
  });

  app.patch('/api/admin/courses/:id', requireRole(['admin']), (req: AuthedRequest, res: Response) => {
    const { id } = req.params;
    const db = readDb();
    const idx = db.courses.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Kurs topilmadi.' });
      return;
    }

    const body = req.body as Partial<Course>;
    const existing = db.courses[idx];

    let teacherId = existing.teacherId;
    let teacherName = existing.teacherName;
    if (typeof body.teacherId === 'string') {
      const teacher = db.users.find((u) => u.id === body.teacherId && u.role === 'teacher');
      teacherId = teacher ? teacher.id : '';
      teacherName = teacher ? teacher.fullName : 'Tayinlanmagan';
    }

    const nextCurriculum = Array.isArray(body.curriculum)
      ? body.curriculum.map((item) => String(item).trim()).filter(Boolean)
      : existing.curriculum;

    const updated: Course = {
      ...existing,
      title: body.title !== undefined ? body.title.trim() || existing.title : existing.title,
      category: body.category !== undefined ? body.category.trim() : existing.category,
      price: body.price !== undefined && Number.isFinite(Number(body.price)) ? Number(body.price) : existing.price,
      durationMonths:
        body.durationMonths !== undefined && Number.isFinite(Number(body.durationMonths))
          ? Math.max(1, Number(body.durationMonths))
          : existing.durationMonths,
      teacherId,
      teacherName,
      description: body.description !== undefined ? body.description.trim() : existing.description,
      scheduleSummary: body.scheduleSummary !== undefined ? body.scheduleSummary.trim() : existing.scheduleSummary,
      curriculum: nextCurriculum.length > 0 ? nextCurriculum : existing.curriculum,
      active: body.active !== undefined ? Boolean(body.active) : existing.active,
    };

    db.courses[idx] = updated;
    db.students = db.students.map((s) => (s.courseId === id ? { ...s, courseName: updated.title } : s));
    db.lessons = db.lessons.map((l) => (l.courseId === id ? { ...l, courseName: updated.title } : l));
    writeDb(db);

    res.json({ course: updated });
  });

  app.delete('/api/admin/courses/:id', requireRole(['admin']), (req: AuthedRequest, res: Response) => {
    const { id } = req.params;
    const db = readDb();
    const before = db.courses.length;
    db.courses = db.courses.filter((c) => c.id !== id);
    if (db.courses.length === before) {
      res.status(404).json({ error: 'Kurs topilmadi.' });
      return;
    }
    writeDb(db);
    res.json({ ok: true });
  });

  app.patch('/api/admin/students/:id', requireRole(['admin']), (req: AuthedRequest, res: Response) => {
    const { id } = req.params;
    const db = readDb();
    const idx = db.students.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "O'quvchi topilmadi." });
      return;
    }

    const existing = db.students[idx];
    const body = req.body as Partial<StudentRecord>;

    let courseId = existing.courseId;
    let courseName = existing.courseName;
    if (body.courseId && body.courseId !== existing.courseId) {
      const course = db.courses.find((c) => c.id === body.courseId);
      if (course) {
        courseId = course.id;
        courseName = course.title;
      }
    }

    const validStatuses: StudentStatus[] = ['Yangi', 'Tasdiqlangan', "O'qimoqda", 'Yakunlagan'];
    const nextStatus = body.status && validStatuses.includes(body.status) ? body.status : existing.status;

    const updated: StudentRecord = {
      ...existing,
      firstName: body.firstName !== undefined ? body.firstName.trim() || existing.firstName : existing.firstName,
      lastName: body.lastName !== undefined ? body.lastName.trim() || existing.lastName : existing.lastName,
      age: body.age !== undefined && Number.isFinite(Number(body.age)) ? Number(body.age) : existing.age,
      phone: body.phone !== undefined ? body.phone.trim() || existing.phone : existing.phone,
      preferredDays: Array.isArray(body.preferredDays) && body.preferredDays.length > 0 ? body.preferredDays : existing.preferredDays,
      preferredTime: body.preferredTime !== undefined ? body.preferredTime.trim() : existing.preferredTime,
      courseId,
      courseName,
      status: nextStatus,
      groupName: body.groupName !== undefined ? body.groupName.trim() : existing.groupName,
      notes: body.notes !== undefined ? body.notes.trim() : existing.notes,
    };

    db.students[idx] = updated;
    writeDb(db);
    res.json({ student: updated });
  });

  app.delete('/api/admin/students/:id', requireRole(['admin']), (req: AuthedRequest, res: Response) => {
    const { id } = req.params;
    const db = readDb();
    const before = db.students.length;
    db.students = db.students.filter((s) => s.id !== id);
    if (db.students.length === before) {
      res.status(404).json({ error: "O'quvchi topilmadi." });
      return;
    }
    writeDb(db);
    res.json({ ok: true });
  });

  // TEACHER ROUTES
  app.get('/api/teacher/dashboard', requireRole(['teacher']), (req: AuthedRequest, res: Response) => {
    const db = readDb();
    const teacher = req.authUser!;
    const assignedCourses = db.courses.filter((c) => c.teacherId === teacher.id);
    const assignedCourseIds = new Set(assignedCourses.map((c) => c.id));
    const lessons = db.lessons.filter((l) => l.teacherId === teacher.id);
    const myStudents = db.students.filter((s) => assignedCourseIds.has(s.courseId));

    res.json({
      teacher: toPublicUser(teacher),
      assignedCourses,
      allCourses: db.courses.filter((c) => c.active),
      lessons,
      students: myStudents,
    });
  });

  app.post('/api/teacher/lessons', requireRole(['teacher']), (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { courseId, title, day, timeSlot, room, groupName, notes } = req.body as Partial<LessonRecord>;

    if (!title?.trim() || !day?.trim() || !timeSlot?.trim()) {
      res.status(400).json({ error: 'Dars mavzusi, kuni va vaqtini kiriting.' });
      return;
    }

    const db = readDb();
    const course = db.courses.find((c) => c.id === courseId) || db.courses.find((c) => c.teacherId === teacher.id);

    const newLesson: LessonRecord = {
      id: `lsn_${Date.now()}`,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      courseId: course ? course.id : 'custom',
      courseName: course ? course.title : teacher.specialty || "IT yo'nalishi",
      track: "IT yo'nalishi",
      title: title.trim(),
      day: day.trim(),
      timeSlot: timeSlot.trim(),
      room: room?.trim() || 'Xona 201',
      groupName: groupName?.trim() || 'IT-Guruh',
      status: 'Rejalashtirilgan',
      notes: notes?.trim() || '',
    };

    db.lessons.unshift(newLesson);
    writeDb(db);
    res.status(201).json({ lesson: newLesson });
  });

  app.patch('/api/teacher/lessons/:id', requireRole(['teacher']), (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { id } = req.params;
    const db = readDb();
    const idx = db.lessons.findIndex((l) => l.id === id && l.teacherId === teacher.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Dars topilmadi yoki sizga tegishli emas.' });
      return;
    }

    const existing = db.lessons[idx];
    const body = req.body as Partial<LessonRecord>;
    const validStatuses: LessonStatus[] = ['Rejalashtirilgan', "O'tildi", 'Qoldirildi'];
    const nextStatus = body.status && validStatuses.includes(body.status) ? body.status : existing.status;

    let courseId = existing.courseId;
    let courseName = existing.courseName;
    if (body.courseId && body.courseId !== existing.courseId) {
      const course = db.courses.find((c) => c.id === body.courseId);
      if (course) {
        courseId = course.id;
        courseName = course.title;
      }
    }

    const updated: LessonRecord = {
      ...existing,
      courseId,
      courseName,
      title: body.title !== undefined ? body.title.trim() || existing.title : existing.title,
      day: body.day !== undefined ? body.day.trim() : existing.day,
      timeSlot: body.timeSlot !== undefined ? body.timeSlot.trim() : existing.timeSlot,
      room: body.room !== undefined ? body.room.trim() : existing.room,
      groupName: body.groupName !== undefined ? body.groupName.trim() : existing.groupName,
      status: nextStatus,
      notes: body.notes !== undefined ? body.notes.trim() : existing.notes,
    };

    db.lessons[idx] = updated;
    writeDb(db);
    res.json({ lesson: updated });
  });

  app.delete('/api/teacher/lessons/:id', requireRole(['teacher']), (req: AuthedRequest, res: Response) => {
    const teacher = req.authUser!;
    const { id } = req.params;
    const db = readDb();
    const before = db.lessons.length;
    db.lessons = db.lessons.filter((l) => !(l.id === id && l.teacherId === teacher.id));
    if (db.lessons.length === before) {
      res.status(404).json({ error: 'Dars topilmadi.' });
      return;
    }
    writeDb(db);
    res.json({ ok: true });
  });

  // STUDENT ROUTES (Course enrollment desk + Telegram notification)
  app.get('/api/student/dashboard', requireRole(['student']), (req: AuthedRequest, res: Response) => {
    const db = readDb();
    const student = req.authUser!;
    const cleanPhone = normalizePhone(student.phone);

    const enrollments = db.students.filter(
      (s) => s.studentUserId === student.id || normalizePhone(s.phone) === cleanPhone
    );

    res.json({
      student: toPublicUser(student),
      courses: db.courses.filter((c) => c.active),
      enrollments,
      lessons: db.lessons.filter((l) => enrollments.some((e) => e.courseId === l.courseId)),
    });
  });

  app.post('/api/student/enroll', requireRole(['student']), async (req: AuthedRequest, res: Response) => {
    const student = req.authUser!;
    const { courseId, preferredDays, preferredTime, notes } = req.body as {
      courseId?: string;
      preferredDays?: string[];
      preferredTime?: string;
      notes?: string;
    };

    if (!courseId) {
      res.status(400).json({ error: 'Kursni tanlang.' });
      return;
    }
    if (!Array.isArray(preferredDays) || preferredDays.length === 0) {
      res.status(400).json({ error: 'Qulay kunlarni tanlang.' });
      return;
    }
    if (!preferredTime?.trim()) {
      res.status(400).json({ error: 'Qulay vaqtni tanlang.' });
      return;
    }

    const db = readDb();
    const course = db.courses.find((c) => c.id === courseId && c.active);
    if (!course) {
      res.status(404).json({ error: 'Kurs topilmadi.' });
      return;
    }

    const nameParts = student.fullName.split(' ');
    const newEnrollment: StudentRecord = {
      id: `std_${Date.now()}`,
      firstName: student.firstName || nameParts[0] || student.fullName,
      lastName: student.lastName || nameParts.slice(1).join(' ') || '-',
      age: student.age || 18,
      phone: student.phone,
      preferredDays,
      preferredTime: preferredTime.trim(),
      track: "IT yo'nalishi",
      courseId: course.id,
      courseName: course.title,
      status: 'Yangi',
      groupName: 'Belgilanmagan',
      notes: notes?.trim() || '',
      studentUserId: student.id,
      createdAt: new Date().toISOString(),
    };

    db.students.unshift(newEnrollment);
    writeDb(db);

    const telegramResult = await notifyTelegramStudent(
      newEnrollment,
      course,
      "O'quvchi kabinetidan kursga yozildi"
    );

    res.status(201).json({
      enrollment: newEnrollment,
      telegramSent: telegramResult.sent,
    });
  });

  app.delete('/api/student/enroll/:id', requireRole(['student']), (req: AuthedRequest, res: Response) => {
    const student = req.authUser!;
    const { id } = req.params;
    const db = readDb();
    const cleanPhone = normalizePhone(student.phone);
    const target = db.students.find(
      (s) => s.id === id && (s.studentUserId === student.id || normalizePhone(s.phone) === cleanPhone)
    );
    if (!target) {
      res.status(404).json({ error: 'Ariza topilmadi.' });
      return;
    }
    if (target.status !== 'Yangi') {
      res.status(400).json({ error: 'Faqat yangi arizalarni bekor qilish mumkin.' });
      return;
    }
    db.students = db.students.filter((s) => s.id !== id);
    writeDb(db);
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meta IT School server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
