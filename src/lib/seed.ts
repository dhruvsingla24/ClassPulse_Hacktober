import { hashPassword } from "./password";
import type { DB, Doubt, Lecture, Mark, Question, Session, Subject, Submission, User } from "./types";
import { DEFAULT_PREFS } from "./types";

export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS = [
  { role: "student", name: "Aarav Sharma", email: "aarav@classpulse.dev" },
  { role: "student", name: "Diya Patel", email: "diya@classpulse.dev" },
  { role: "student", name: "Kabir Singh", email: "kabir@classpulse.dev" },
  { role: "student", name: "Meera Iyer", email: "meera@classpulse.dev" },
  { role: "student", name: "Rohan Gupta", email: "rohan@classpulse.dev" },
  { role: "teacher", name: "Ananya Rao", email: "teacher@classpulse.dev" },
  { role: "parent", name: "Neha Sharma", email: "parent@classpulse.dev" },
  { role: "admin", name: "Vikram Admin", email: "admin@classpulse.dev" },
] as const;

const MORE_STUDENTS = [
  "Ishaan Verma", "Ananya Nair", "Arjun Reddy", "Saanvi Joshi", "Vihaan Mehta", "Aditi Kulkarni",
  "Reyansh Das", "Myra Chatterjee", "Ayaan Khan", "Kiara Bose", "Dhruv Malhotra", "Anika Pillai",
  "Shaurya Bhat", "Tara Menon", "Advik Saxena", "Navya Kapoor", "Atharv Mishra", "Riya Sinha",
  "Krish Agarwal", "Pari Deshmukh",
];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const day = (offset: number, base = new Date()) => {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
const iso = (offsetDays: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const SUBJECTS: Subject[] = [
  { id: "math", name: "Mathematics", color: "#5B7FD6", icon: "Sigma", topics: ["Algebra", "Matrices", "Calculus", "Probability"] },
  { id: "phy", name: "Physics", color: "#D9885B", icon: "Atom", topics: ["Kinematics", "Laws of Motion", "Electricity", "Optics"] },
  { id: "cs", name: "Computer Science", color: "#4FA38A", icon: "Code2", topics: ["Binary Search", "Sorting", "Linked Lists", "Recursion"] },
  { id: "chem", name: "Chemistry", color: "#B46AB8", icon: "FlaskConical", topics: ["Atomic Structure", "Chemical Bonding", "Acids and Bases", "Organic Basics"] },
  { id: "eng", name: "English", color: "#C9A54A", icon: "BookOpen", topics: ["Grammar", "Comprehension", "Essay Writing", "Poetry"] },
];

const LECTURES: Omit<Lecture, "id" | "createdAt" | "published">[] = [
  { subjectId: "cs", topic: "Binary Search", title: "Binary search: halving the problem", kind: "notes", minutes: 12,
    notes: "Binary search finds a value in a sorted list by checking the middle element.\n\nIf the middle is too small, the answer must be on the right; if it is too big, the answer is on the left. Each step throws away half of the remaining items, so a list of n items needs at most about log2(n) + 1 checks.\n\nKey rules:\n- The list must be sorted.\n- Keep two pointers, low and high.\n- mid = floor((low + high) / 2).\n- Stop when low > high (not found) or when list[mid] equals the target.\n\nTry it in the Learning Arcade: Binary Search Treasure Hunt rewards you for matching the optimal number of steps." },
  { subjectId: "cs", topic: "Sorting", title: "Bubble, selection and insertion sort", kind: "notes", minutes: 18,
    notes: "Bubble sort repeatedly swaps neighbouring items that are in the wrong order. After each pass the largest item 'bubbles' to the end.\n\nSelection sort finds the smallest remaining item and swaps it into the next position. It makes at most n - 1 swaps.\n\nInsertion sort grows a sorted prefix and inserts each new item into its place, which is fast for nearly-sorted data.\n\nAll three take O(n^2) comparisons in the worst case. Practise them in the Sorting Race." },
  { subjectId: "cs", topic: "Linked Lists", title: "Nodes and pointers", kind: "notes", minutes: 15,
    notes: "A linked list stores items in nodes. Each node holds a value and a pointer to the next node. The list remembers its head (first node).\n\nInsert at head: the new node points to the old head, then head moves to the new node. O(1).\nInsert at tail: walk to the last node and point it at the new node. O(n) without a tail pointer.\nDelete: make the previous node skip over the removed node.\n\nBuild one yourself in the Linked List Builder." },
  { subjectId: "cs", topic: "Recursion", title: "Thinking recursively", kind: "link", url: "https://www.khanacademy.org/computing/computer-science/algorithms/recursive-algorithms/a/recursion", minutes: 20,
    notes: "A recursive function solves a problem by calling itself on a smaller version of the same problem. Every recursive function needs a base case that stops the calls." },
  { subjectId: "math", topic: "Matrices", title: "Matrix multiplication step by step", kind: "notes", minutes: 16,
    notes: "To multiply A (m x n) by B (n x p), the number of columns of A must equal the number of rows of B. The result is m x p.\n\nEntry (i, j) of AB is the dot product of row i of A with column j of B.\n\nMatrix multiplication is not commutative: AB is usually different from BA." },
  { subjectId: "math", topic: "Probability", title: "Probability of independent events", kind: "notes", minutes: 14,
    notes: "Two events are independent if one happening does not change the chance of the other. Then P(A and B) = P(A) x P(B).\n\nExample: the chance of two heads in two fair coin tosses is 1/2 x 1/2 = 1/4." },
  { subjectId: "math", topic: "Calculus", title: "Limits and the idea of a derivative", kind: "notes", minutes: 22,
    notes: "The derivative measures how fast a function changes. It is the limit of (f(x + h) - f(x)) / h as h approaches 0.\n\nFor f(x) = x^2 the derivative is 2x." },
  { subjectId: "phy", topic: "Kinematics", title: "Equations of motion", kind: "notes", minutes: 18,
    notes: "For constant acceleration a:\n- v = u + at\n- s = ut + (1/2)at^2\n- v^2 = u^2 + 2as\n\nu is the initial velocity, v the final velocity, s the displacement and t the time." },
  { subjectId: "phy", topic: "Electricity", title: "Ohm's law and circuits", kind: "notes", minutes: 15,
    notes: "Ohm's law: V = I x R. Resistors in series add: R = R1 + R2. In parallel: 1/R = 1/R1 + 1/R2." },
  { subjectId: "chem", topic: "Chemical Bonding", title: "Ionic vs covalent bonds", kind: "notes", minutes: 14,
    notes: "Ionic bonds form when electrons are transferred (for example Na to Cl). Covalent bonds form when electrons are shared (for example in H2O)." },
  { subjectId: "chem", topic: "Acids and Bases", title: "The pH scale", kind: "notes", minutes: 10,
    notes: "pH below 7 is acidic, 7 is neutral and above 7 is basic. Each step on the scale is a factor of 10 in hydrogen ion concentration." },
  { subjectId: "eng", topic: "Essay Writing", title: "Structuring an argumentative essay", kind: "notes", minutes: 12,
    notes: "Open with a clear claim. Give each reason its own paragraph with evidence. Answer the strongest counter-argument. Close by restating your claim in a new way." },
];

const QUESTIONS: Omit<Question, "id">[] = [
  { subjectId: "cs", topic: "Binary Search", difficulty: "easy", q: "What must be true of a list before you binary search it?", options: ["It is sorted", "It has an even length", "It has no duplicates", "It is a linked list"], answer: 0, hint: "Think about why halving works.", explanation: "Binary search relies on order to know which half can be discarded." },
  { subjectId: "cs", topic: "Binary Search", difficulty: "medium", q: "At most how many checks does binary search need for 100 sorted items?", options: ["7", "10", "50", "100"], answer: 0, hint: "2^7 = 128.", explanation: "Each check halves the range, and 2^7 = 128 >= 100, so 7 checks are enough." },
  { subjectId: "cs", topic: "Sorting", difficulty: "easy", q: "Which sort repeatedly swaps adjacent items that are out of order?", options: ["Bubble sort", "Selection sort", "Merge sort", "Quick sort"], answer: 0, hint: "Large items rise like bubbles.", explanation: "Bubble sort compares and swaps neighbours on every pass." },
  { subjectId: "cs", topic: "Linked Lists", difficulty: "medium", q: "What is the time to insert at the head of a singly linked list?", options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], answer: 0, hint: "No walking is needed.", explanation: "You only create a node and update the head pointer." },
  { subjectId: "cs", topic: "Recursion", difficulty: "medium", q: "What stops a recursive function from running forever?", options: ["A base case", "A for loop", "A global variable", "A return type"], answer: 0, hint: "It is the smallest version of the problem.", explanation: "The base case returns without calling itself again." },
  { subjectId: "math", topic: "Matrices", difficulty: "medium", q: "A is 2x3 and B is 3x4. What is the size of AB?", options: ["2x4", "3x3", "4x2", "Not defined"], answer: 0, hint: "Outer dimensions survive.", explanation: "(2x3)(3x4) gives a 2x4 matrix." },
  { subjectId: "math", topic: "Probability", difficulty: "easy", q: "Probability of two heads in two fair coin tosses?", options: ["1/4", "1/2", "3/4", "1"], answer: 0, hint: "Multiply independent probabilities.", explanation: "1/2 x 1/2 = 1/4." },
  { subjectId: "math", topic: "Calculus", difficulty: "medium", q: "What is the derivative of x^2?", options: ["2x", "x", "x^3/3", "2"], answer: 0, hint: "Bring the power down.", explanation: "d/dx x^n = n x^(n-1), so 2x." },
  { subjectId: "math", topic: "Algebra", difficulty: "easy", q: "Solve 3x + 5 = 20.", options: ["5", "15", "25/3", "3"], answer: 0, hint: "Subtract 5 first.", explanation: "3x = 15, so x = 5." },
  { subjectId: "phy", topic: "Kinematics", difficulty: "medium", q: "A car starts from rest at 2 m/s^2. Its speed after 5 s?", options: ["10 m/s", "7 m/s", "2.5 m/s", "25 m/s"], answer: 0, hint: "v = u + at.", explanation: "v = 0 + 2 x 5 = 10 m/s." },
  { subjectId: "phy", topic: "Electricity", difficulty: "easy", q: "V = 12 V and R = 4 ohm. What is the current?", options: ["3 A", "48 A", "16 A", "0.33 A"], answer: 0, hint: "I = V / R.", explanation: "12 / 4 = 3 A." },
  { subjectId: "phy", topic: "Optics", difficulty: "medium", q: "Which mirror can form a real, inverted image?", options: ["Concave", "Convex", "Plane", "None"], answer: 0, hint: "It converges light.", explanation: "A concave mirror forms real images when the object is beyond its focus." },
  { subjectId: "chem", topic: "Acids and Bases", difficulty: "easy", q: "A solution with pH 3 is…", options: ["Acidic", "Neutral", "Basic", "Salty"], answer: 0, hint: "Below 7.", explanation: "pH below 7 means acidic." },
  { subjectId: "chem", topic: "Chemical Bonding", difficulty: "medium", q: "The bond in NaCl is mainly…", options: ["Ionic", "Covalent", "Metallic", "Hydrogen"], answer: 0, hint: "An electron is transferred.", explanation: "Na gives an electron to Cl, forming ions." },
  { subjectId: "eng", topic: "Grammar", difficulty: "easy", q: "Choose the correct sentence.", options: ["She doesn't like tea.", "She don't like tea.", "She not like tea.", "She doesn't likes tea."], answer: 0, hint: "Third person singular with 'does'.", explanation: "'Does not' takes the base verb 'like'." },
];

// Shuffle options per question deterministically so the answer is not always A.
function shuffleQuestions(r: () => number): Question[] {
  return QUESTIONS.map((q, i) => {
    const order = q.options.map((_, k) => k).sort(() => r() - 0.5);
    return { ...q, id: "q" + (i + 1), options: order.map((k) => q.options[k]), answer: order.indexOf(q.answer) };
  });
}

export function buildSeed(): DB {
  const r = rng(42);
  const users: User[] = [];
  const mk = (name: string, email: string, role: User["role"], extra: Partial<User> = {}) => {
    const { salt, hash } = hashPassword(DEMO_PASSWORD, "seed-" + email);
    const u: User = { id: "u" + (users.length + 1), name, email, role, salt, hash, avatar: String(Math.floor(r() * 360)), ...extra };
    users.push(u);
    return u;
  };

  const students: User[] = [];
  let roll = 1;
  for (const a of DEMO_ACCOUNTS.filter((a) => a.role === "student")) {
    students.push(mk(a.name, a.email, "student", { roll: "10A-" + String(roll++).padStart(2, "0"), classId: "10A", goal: "Score 90% in finals" }));
  }
  for (const n of MORE_STUDENTS) {
    const email = n.toLowerCase().replace(/[^a-z]+/g, ".") + "@classpulse.dev";
    students.push(mk(n, email, "student", { roll: "10A-" + String(roll++).padStart(2, "0"), classId: "10A" }));
  }
  const teacher = mk("Ananya Rao", "teacher@classpulse.dev", "teacher", { classId: "10A" });
  mk("Neha Sharma", "parent@classpulse.dev", "parent", { childId: students[0].id });
  mk("Vikram Admin", "admin@classpulse.dev", "admin");

  // Ability and attendance tendency per student; a few deliberately at risk.
  const ability: Record<string, number> = {};
  const attend: Record<string, number> = {};
  students.forEach((s, i) => {
    ability[s.id] = i === 0 ? 0.74 : 0.45 + r() * 0.5;
    attend[s.id] = i === 0 ? 0.93 : 0.7 + r() * 0.3;
  });
  [students[7], students[12], students[18]].forEach((s) => { ability[s.id] = 0.38; attend[s.id] = 0.64; });

  const lectures: Lecture[] = LECTURES.map((l, i) => ({ ...l, id: "l" + (i + 1), published: true, createdAt: iso(-30 + i) }));

  const sessions: Session[] = [];
  for (let k = 20; k >= 1; k--) {
    const d = new Date();
    d.setDate(d.getDate() - k);
    if (d.getDay() === 0) continue;
    const subj = SUBJECTS[k % SUBJECTS.length];
    const records: Session["records"] = {};
    for (const s of students) {
      const x = r();
      records[s.id] = x < attend[s.id] ? "present" : x < attend[s.id] + 0.05 ? "late" : "absent";
    }
    sessions.push({ id: "s" + k, subjectId: subj.id, date: day(-k), records });
  }

  const marks: Mark[] = [];
  const tests = ["Unit Test 1", "Unit Test 2", "Mid-term"];
  for (const s of students) {
    for (const subj of SUBJECTS) {
      tests.forEach((t, ti) => {
        // at-risk students decline over time, others improve slightly
        const drift = ability[s.id] < 0.42 ? -0.06 * ti : 0.03 * ti;
        const score = Math.round(Math.max(0.2, Math.min(0.99, ability[s.id] + drift + (r() - 0.5) * 0.18)) * 50);
        marks.push({ studentId: s.id, subjectId: subj.id, test: t, score, max: 50, date: day(-40 + ti * 14) });
      });
    }
  }

  const assignments = [
    { id: "a1", subjectId: "cs", title: "Trace binary search by hand", description: "Trace binary search for target 37 in [3, 8, 15, 21, 29, 37, 44, 52]. Write low, high and mid at every step.", due: iso(-3, 23), maxMarks: 10, createdBy: teacher.id, createdAt: iso(-10) },
    { id: "a2", subjectId: "math", title: "Matrix multiplication worksheet", description: "Multiply the three pairs of matrices on page 42 and explain why BA is not defined for pair 3.", due: iso(2, 23), maxMarks: 20, createdBy: teacher.id, createdAt: iso(-4) },
    { id: "a3", subjectId: "phy", title: "Equations of motion problems", description: "Solve problems 1 to 5 from the kinematics sheet. Show every formula you use.", due: iso(5, 23), maxMarks: 15, createdBy: teacher.id, createdAt: iso(-1) },
  ];
  const submissions: Submission[] = [];
  students.forEach((s, i) => {
    if (i === 0 || r() < 0.85) {
      submissions.push({ id: "sub" + submissions.length, assignmentId: "a1", studentId: s.id, text: "low=0, high=7, mid=3 (21 < 37) -> low=4; mid=5 (37) found.", submittedAt: iso(-4, 18), status: "graded", marks: Math.round(ability[s.id] * 10), feedback: ability[s.id] > 0.7 ? "Clear and complete trace." : "Show each step of low and high." });
    }
    if (i > 0 && r() < 0.4) {
      submissions.push({ id: "sub" + submissions.length, assignmentId: "a2", studentId: s.id, text: "Pair 1: [[19,22],[43,50]]. Pair 2 done. Pair 3: BA needs columns of B = rows of A.", submittedAt: iso(-1, 20), status: "submitted" });
    }
  });

  const mkDoubt = (n: number, s: User, subjectId: string, topic: string, title: string, body: string, status: Doubt["status"], days: number, reply?: string): Doubt => ({
    id: "d" + n, studentId: s.id, subjectId, topic, title, body, priority: n % 3 === 0 ? "exam-soon" : "normal", status,
    drawing: [], annotation: [], helped: [], createdAt: iso(-days, 15),
    replies: reply ? [{ id: "r" + n, authorId: teacher.id, text: reply, at: iso(-days + 1, 11) }] : [],
    resolvedAt: status === "resolved" ? iso(-days + 1, 11) : undefined,
  });
  const doubts: Doubt[] = [
    mkDoubt(1, students[1], "cs", "Binary Search", "Why is mid = (low + high) / 2 rounded down?", "If low = 4 and high = 7, mid is 5.5. Which one do we take and why?", "resolved", 6, "We use floor so mid is always a valid index. Either side works as long as you are consistent, but floor is the convention."),
    mkDoubt(2, students[2], "math", "Matrices", "Why can't I multiply a 2x3 by a 2x3?", "The worksheet says it's not defined but both are the same size.", "resolved", 5, "Columns of the first (3) must equal rows of the second (2). They don't match, so the product is undefined."),
    mkDoubt(3, students[3], "phy", "Kinematics", "Sign of acceleration when braking", "Is deceleration negative acceleration or a separate quantity?", "pending", 1),
    mkDoubt(4, students[5], "math", "Matrices", "Is AB = BA ever true?", "Are there matrices where order doesn't matter?", "pending", 2),
    mkDoubt(5, students[8], "cs", "Recursion", "Stack overflow in my factorial", "My recursive factorial crashes for n = 100000.", "reviewing", 2),
    mkDoubt(6, students[10], "math", "Matrices", "Identity matrix size", "How do I know what size identity matrix to use?", "pending", 3),
    mkDoubt(7, students[4], "chem", "Chemical Bonding", "Is HCl ionic or covalent?", "It forms ions in water, so is it ionic?", "answered", 4, "HCl is a polar covalent molecule. It ionises when dissolved in water, which is a reaction, not its bond type."),
    mkDoubt(8, students[6], "cs", "Linked Lists", "Deleting the head node", "What happens to the old head after deleting it?", "pending", 1),
  ];
  doubts[4].code = "int fact(int n) {\n  return n * fact(n - 1);\n}";

  const faq = [
    { id: "f1", subjectId: "cs", topic: "Binary Search", q: "Why is mid rounded down?", a: doubts[0].replies[0].text, helpful: 14, fromDoubt: "d1" },
    { id: "f2", subjectId: "math", topic: "Matrices", q: "When is matrix multiplication undefined?", a: doubts[1].replies[0].text, helpful: 21, fromDoubt: "d2" },
    { id: "f3", subjectId: "phy", topic: "Electricity", q: "Why do parallel resistors lower total resistance?", a: "Each branch gives current another path, so more total current flows for the same voltage, which means lower total resistance.", helpful: 9 },
    { id: "f4", subjectId: "cs", topic: "Sorting", q: "Which simple sort is best for nearly sorted data?", a: "Insertion sort: each item moves only a short distance, so it runs close to O(n).", helpful: 11 },
    { id: "f5", subjectId: "chem", topic: "Acids and Bases", q: "Is pH 0 possible?", a: "Yes. Very strong concentrated acids can have pH 0 or even below.", helpful: 6 },
    { id: "f6", subjectId: "eng", topic: "Grammar", q: "Doesn't vs don't?", a: "Use doesn't with he, she and it; use don't with I, you, we and they.", helpful: 8 },
  ];

  const ledger: DB["ledger"] = [];
  const activity: DB["activity"] = [];
  const achievements: DB["achievements"] = [];
  students.forEach((s, i) => {
    let coins = 0;
    for (let k = 60; k >= 1; k--) {
      // demo student: active the last 4 days in a row so today's play extends the streak to 5
      const active = i === 0 ? k <= 4 || r() < 0.45 : r() < ability[s.id] * 0.6;
      if (!active) continue;
      activity.push({ userId: s.id, date: day(-k) });
      const amt = 10 + Math.floor(r() * 20);
      coins += amt;
      ledger.push({ key: `seed:${s.id}:${k}`, userId: s.id, amount: amt, reason: "Daily practice", at: iso(-k, 18) });
    }
    if (coins > 300) achievements.push({ userId: s.id, key: "math-explorer", at: iso(-10) });
  });

  return {
    version: 1,
    users,
    subjects: SUBJECTS,
    lectures,
    progress: [{ userId: students[0].id, lectureId: "l1", at: iso(-5) }],
    sessions,
    assignments,
    submissions,
    marks,
    doubts,
    faq,
    questions: shuffleQuestions(r),
    ledger,
    attempts: [],
    activity,
    achievements,
    inventory: [{ userId: students[0].id, itemId: "plant", at: iso(-8) }],
    prefs: Object.fromEntries(users.map((u) => [u.id, { ...DEFAULT_PREFS }])),
    meetings: [
      { id: "m1", title: "Live class: Matrices revision", kind: "live-class", at: iso(1, 16), minutes: 45, room: "ClassPulse-10A-Matrices", createdBy: teacher.id },
      { id: "m2", title: "Parent-teacher meeting", kind: "parent-teacher", at: iso(3, 17), minutes: 30, room: "ClassPulse-PTM-10A", createdBy: teacher.id },
      { id: "m3", title: "Faculty sync", kind: "faculty", at: iso(4, 9), minutes: 30, room: "ClassPulse-Faculty", createdBy: teacher.id },
    ],
    announcements: [
      { id: "an1", text: "Mid-term results are live in your Progress tab.", pinned: true, at: iso(-2), readBy: [] },
      { id: "an2", text: "New Arcade level unlocked: Sorting Race is open for everyone.", pinned: false, at: iso(-1), readBy: [] },
    ],
    notifications: [
      { id: "n1", userId: students[0].id, text: "New assignment: Equations of motion problems", href: "/app/assignments", read: false, at: iso(-1) },
      { id: "n2", userId: students[0].id, text: "Daily challenge is ready", href: "/app", read: false, at: iso(0, 7) },
    ],
    audit: [],
  };
}
