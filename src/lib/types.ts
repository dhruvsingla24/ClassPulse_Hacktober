export type Role = "student" | "teacher" | "parent" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  salt: string;
  hash: string;
  roll?: string;
  classId?: string;
  childId?: string;
  avatar: string; // emoji-free initials colour seed
  goal?: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  topics: string[];
}

export interface Lecture {
  id: string;
  subjectId: string;
  topic: string;
  title: string;
  kind: "video" | "notes" | "link";
  url?: string;
  notes: string;
  minutes: number;
  published: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  records: Record<string, "present" | "absent" | "late">;
}

export interface Assignment {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  due: string;
  maxMarks: number;
  createdBy: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  text: string;
  submittedAt: string;
  status: "submitted" | "graded" | "resubmit";
  marks?: number;
  feedback?: string;
}

export interface Mark {
  studentId: string;
  subjectId: string;
  test: string;
  score: number;
  max: number;
  date: string;
}

export type Point = [number, number];
export interface Stroke {
  tool: "pen" | "highlighter" | "line" | "rect" | "arrow" | "text";
  color: string;
  size: number;
  points: Point[];
  text?: string;
}

export type DoubtStatus = "pending" | "reviewing" | "answered" | "next-class" | "resolved";

export interface Reply {
  id: string;
  authorId: string;
  text: string;
  at: string;
}

export interface Doubt {
  id: string;
  studentId: string;
  subjectId: string;
  topic: string;
  title: string;
  body: string;
  code?: string;
  priority: "normal" | "exam-soon";
  status: DoubtStatus;
  drawing: Stroke[];
  annotation: Stroke[];
  replies: Reply[];
  helped: string[];
  createdAt: string;
  resolvedAt?: string;
  inFaq?: boolean;
}

export interface Faq {
  id: string;
  subjectId: string;
  topic: string;
  q: string;
  a: string;
  helpful: number;
  fromDoubt?: string;
}

export interface Question {
  id: string;
  subjectId: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  q: string;
  options: string[];
  answer: number;
  hint: string;
  explanation: string;
}

export interface LedgerEntry {
  key: string; // idempotency key
  userId: string;
  amount: number;
  reason: string;
  at: string;
}

export interface Attempt {
  id: string;
  userId: string;
  game: GameId;
  level: number;
  puzzle: unknown;
  startedAt: string;
  finishedAt?: string;
  result?: { ok: boolean; steps: number; optimal: number; coins: number; xp: number };
}

export type GameId = "binary-search" | "sorting-race" | "linked-list" | "daily-challenge";

export interface Meeting {
  id: string;
  title: string;
  kind: "live-class" | "faculty" | "consultation" | "parent-teacher";
  at: string;
  minutes: number;
  room: string;
  createdBy: string;
}

export interface Announcement {
  id: string;
  text: string;
  pinned: boolean;
  at: string;
  readBy: string[];
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  href: string;
  read: boolean;
  at: string;
}

export interface Prefs {
  theme: "auto" | "light" | "dark" | "warm" | "contrast";
  fontScale: number; // 100-150
  lineHeight: number; // 1.5-1.9
  dyslexic: boolean;
  motion: "full" | "reduced" | "off";
  eveningCare: boolean;
  eveningFrom: number; // hour
  eyeRest: boolean;
  sound: boolean;
  quality: "low" | "medium" | "high";
}

export const DEFAULT_PREFS: Prefs = {
  theme: "auto",
  fontScale: 100,
  lineHeight: 1.6,
  dyslexic: false,
  motion: "full",
  eveningCare: false,
  eveningFrom: 20,
  eyeRest: false,
  sound: false,
  quality: "medium",
};

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  kind: "desk" | "avatar" | "theme";
  desc: string;
}

export interface DB {
  version: number;
  users: User[];
  subjects: Subject[];
  lectures: Lecture[];
  progress: { userId: string; lectureId: string; at: string }[];
  sessions: Session[];
  assignments: Assignment[];
  submissions: Submission[];
  marks: Mark[];
  doubts: Doubt[];
  faq: Faq[];
  questions: Question[];
  ledger: LedgerEntry[];
  attempts: Attempt[];
  activity: { userId: string; date: string }[];
  achievements: { userId: string; key: string; at: string }[];
  inventory: { userId: string; itemId: string; at: string }[];
  prefs: Record<string, Prefs>;
  meetings: Meeting[];
  announcements: Announcement[];
  notifications: Notification[];
  audit: { at: string; userId: string; action: string }[];
  exams?: Exam[];
}

export interface Exam {
  id: string;
  userId: string;
  qids: string[];
  startedAt: string;
  endsAt: string;
  submittedAt?: string;
  answers?: (number | null)[];
  score?: number;
  events: { at: string; kind: "visibility" | "blur" | "copy" | "paste" | "contextmenu" }[];
}

/** Public view of a user, safe to send to the client. */
export type PublicUser = Omit<User, "salt" | "hash">;
