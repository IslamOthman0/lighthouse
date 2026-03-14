/**
 * Comprehensive Mock Data Fixtures — Lighthouse UI Testing
 *
 * Covers ALL visual states for Phase 1-6 visual tests.
 * Member schema matches transform.js return shape (lines 133-199).
 * Leave fields match LeaveCard.jsx requirements (lines 40-46).
 *
 * Score formula (40/20/30/10):
 *   trackedScore    = min(tracked / target, 1) * 40
 *   workloadScore   = min(tasks / (3 * workingDays), 1) * 20
 *   completionScore = (done / completionDenominator) * 30
 *   complianceScore = min(complianceHours / target, 1) * 10
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const MOCK_AUTH_USER = {
  user_id: '87650455',
  user_name: 'islamothman',
  email: 'islam@test.com',
  apiKey: 'pk_test_mock_key_for_visual_tests',
  teamId: '9011234567',
  role: 'admin',
  profilePicture: null,
  savedAt: Date.now(),
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const NOW = Date.now();

/**
 * Creates a mock member with defaults for all optional fields.
 * Pass overrides to set specific values.
 */
export function createMockMember(overrides = {}) {
  const defaults = {
    profilePicture: null,
    clickUpColor: null,
    timer: null,
    task: null,
    taskStatus: null,
    taskStatusColor: null,
    project: null,
    startTime: null,
    endTime: null,
    lastSeen: null,
    previousTimer: null,
    publisher: '',
    genre: '',
    tags: [],
    assignees: [],
    priority: 'Normal',
    breaks: { total: 0, count: 0 },
    tasks: 0,
    done: 0,
    completionDenominator: 0,
    score: 0,
    scoreBreakdown: { trackedTime: 0, tasksWorked: 0, tasksDone: 0, compliance: 0 },
    complianceHours: 0,
    isOverworking: false,
    overtimeMinutes: 0,
    lastActiveDate: null,
    avgStartTime: null,
    avgEndTime: null,
    startDelta: null,
    endDelta: null,
    updatedAt: NOW,
    // Leave fields (only for leave members)
    onLeave: false,
    leaveType: null,
    leaveStart: null,
    leaveEnd: null,
    returnDate: null,
    leaveRecord: null,
  };
  return { ...defaults, ...overrides };
}

// ─── 8 Core Mock Members (one per visual state) ───────────────────────────────

export const MOCK_MEMBERS = [
  // Member 1: Working — high score, Arabic task name (RTL test)
  createMockMember({
    id: 1,
    name: 'Dina Ibrahim',
    initials: 'DI',
    clickUpId: '87657591',
    color: '#6366f1',
    target: 6.5,
    status: 'working',
    timer: 1800,          // 30 min current session (seconds)
    tracked: 5.2,
    task: 'كتاب التاريخ العربي الحديث',  // Arabic for RTL testing
    taskStatus: 'in progress',
    taskStatusColor: '#f59e0b',
    project: 'Digitization Queue',
    startTime: '8:15 AM',
    endTime: null,
    lastSeen: null,
    publisher: 'دار الشروق',
    genre: 'History',
    tags: [{ name: 'urgent', color: '#ef4444' }],
    assignees: [{ name: 'islamothman', initials: 'IO', color: '#10b981' }],
    priority: 'High',
    breaks: { total: 15, count: 1 },
    tasks: 5,
    done: 4,
    completionDenominator: 5,
    // trackedScore: min(5.2/6.5,1)*40 = 32, workload: min(5/3,1)*20 = 20, completion: (4/5)*30 = 24, compliance: min(5.0/6.5,1)*10 = 7.7
    score: 84,
    scoreBreakdown: { trackedTime: 32, tasksWorked: 20, tasksDone: 24, compliance: 7.7 },
    complianceHours: 5.0,
    isOverworking: false,
    overtimeMinutes: 0,
    lastActiveDate: new Date().toISOString(),
    avgStartTime: '08:10',
    avgEndTime: null,
    startDelta: -5,
    endDelta: null,
  }),

  // Member 2: Working — overworking, orange timer warning
  createMockMember({
    id: 2,
    name: 'Alaa Soliman',
    initials: 'AS',
    clickUpId: '93604849',
    color: '#8b5cf6',
    target: 6.5,
    status: 'working',
    timer: 5400,          // 90 min current session
    tracked: 7.8,
    task: 'Encyclopedia of Islamic Architecture Vol. 3',
    taskStatus: 'in progress',
    taskStatusColor: '#f59e0b',
    project: 'Archive Digitization',
    startTime: '8:00 AM',
    endTime: null,
    lastSeen: null,
    publisher: 'Academic Press',
    genre: 'Architecture',
    tags: [{ name: 'high-priority', color: '#f97316' }],
    priority: 'Urgent',
    breaks: { total: 10, count: 1 },
    tasks: 8,
    done: 7,
    completionDenominator: 8,
    // tracked > target → capped at 40 for tracked, completion (7/8)*30=26.25
    score: 96,
    scoreBreakdown: { trackedTime: 40, tasksWorked: 20, tasksDone: 26.25, compliance: 10 },
    complianceHours: 6.5,
    isOverworking: true,
    overtimeMinutes: 78,  // (7.8 - 6.5) * 60
    lastActiveDate: new Date().toISOString(),
    avgStartTime: '08:00',
    avgEndTime: null,
    startDelta: 0,
    endDelta: null,
  }),

  // Member 3: Break — 8 minutes ago
  createMockMember({
    id: 3,
    name: 'Nada Meshref',
    initials: 'NM',
    clickUpId: '93604850',
    color: '#ec4899',
    target: 6.5,
    status: 'break',
    timer: null,
    tracked: 4.5,
    task: 'Ottoman History Manuscripts — Vol. 12',
    taskStatus: 'in progress',
    taskStatusColor: '#f59e0b',
    project: 'Manuscript Digitization',
    startTime: '8:30 AM',
    endTime: '2:30 PM',
    lastSeen: 8,          // 8 minutes ago
    publisher: 'Cairo University Press',
    genre: 'History',
    breaks: { total: 25, count: 2 },
    tasks: 4,
    done: 3,
    completionDenominator: 4,
    // tracked: min(4.5/6.5)*40=27.7, tasks: min(4/3)*20=20, completion:(3/4)*30=22.5, compliance:min(4.2/6.5)*10=6.5
    score: 63,
    scoreBreakdown: { trackedTime: 27.7, tasksWorked: 20, tasksDone: 22.5, compliance: 6.5 },
    complianceHours: 4.2,
    isOverworking: false,
    lastActiveDate: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    avgStartTime: '08:25',
    avgEndTime: '14:25',
    startDelta: -5,
    endDelta: 5,
  }),

  // Member 4: Offline — 2.5 hours ago (150 min)
  createMockMember({
    id: 4,
    name: 'Nada Amr',
    initials: 'NA',
    clickUpId: '93604848',
    color: '#f59e0b',
    target: 6.5,
    status: 'offline',
    timer: null,
    tracked: 4.2,
    task: 'Modern Arabic Literature Collection',
    taskStatus: 'ready',
    taskStatusColor: '#10b981',
    project: 'Literature Archive',
    startTime: '8:45 AM',
    endTime: '1:15 PM',
    lastSeen: 150,        // 150 minutes = 2.5 hours ago
    breaks: { total: 20, count: 2 },
    tasks: 5,
    done: 3,
    completionDenominator: 5,
    // tracked: min(4.2/6.5)*40=25.8, tasks: min(5/3)*20=20, completion:(3/5)*30=18, compliance:min(3.8/6.5)*10=5.8
    score: 41,
    scoreBreakdown: { trackedTime: 25.8, tasksWorked: 20, tasksDone: 18, compliance: 5.8 },
    complianceHours: 3.8,
    isOverworking: false,
    lastActiveDate: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    avgStartTime: '08:40',
    avgEndTime: '13:10',
    startDelta: -10,
    endDelta: -290,
  }),

  // Member 5: NoActivity — 0 hours tracked, no tasks
  createMockMember({
    id: 5,
    name: 'Islam Othman',
    initials: 'IO',
    clickUpId: '87650455',
    color: '#10b981',
    target: 6.5,
    status: 'noActivity',
    timer: null,
    tracked: 0,
    task: null,
    taskStatus: null,
    project: null,
    lastSeen: null,
    tasks: 0,
    done: 0,
    completionDenominator: 0,
    score: 0,
    scoreBreakdown: { trackedTime: 0, tasksWorked: 0, tasksDone: 0, compliance: 0 },
    complianceHours: 0,
    isOverworking: false,
    lastActiveDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  }),

  // Member 6: Leave — on approved annual leave
  createMockMember({
    id: 6,
    name: 'Riham',
    initials: 'RI',
    clickUpId: '87657592',
    color: '#3b82f6',
    target: 6.5,
    status: 'leave',
    timer: null,
    tracked: 0,
    task: null,
    project: null,
    tasks: 0,
    done: 0,
    completionDenominator: 0,
    score: 0,
    scoreBreakdown: { trackedTime: 0, tasksWorked: 0, tasksDone: 0, compliance: 0 },
    complianceHours: 0,
    isOverworking: false,
    // Leave-specific fields
    onLeave: true,
    leaveType: 'Annual Leave',
    leaveStart: '2026-03-10',
    leaveEnd: '2026-03-14',
    returnDate: '2026-03-15',
    leaveRecord: { requestedDays: 5, status: 'approved' },
    lastActiveDate: '2026-03-09T18:00:00.000Z',
  }),

  // Member 7: Working — low score, falling behind
  createMockMember({
    id: 7,
    name: 'Samar Magdy',
    initials: 'SA',
    clickUpId: '87657593',
    color: '#ef4444',
    target: 6.5,
    status: 'working',
    timer: 900,           // 15 min current session
    tracked: 1.8,
    task: 'Regional Geography Atlas — Chapter 5',
    taskStatus: 'in progress',
    taskStatusColor: '#f59e0b',
    project: 'Geography Collection',
    startTime: '10:30 AM',
    endTime: null,
    lastSeen: null,
    breaks: { total: 0, count: 0 },
    tasks: 2,
    done: 0,
    completionDenominator: 2,
    // tracked: min(1.8/6.5)*40=11.1, tasks: min(2/3)*20=13.3, completion:(0/2)*30=0, compliance:min(1.5/6.5)*10=2.3
    score: 28,
    scoreBreakdown: { trackedTime: 11.1, tasksWorked: 13.3, tasksDone: 0, compliance: 2.3 },
    complianceHours: 1.5,
    isOverworking: false,
    lastActiveDate: new Date().toISOString(),
    avgStartTime: '10:25',
    avgEndTime: null,
    startDelta: 145,      // 2h 25m late
    endDelta: null,
  }),

  // Member 8: Offline — recently offline (35 min), decent score
  createMockMember({
    id: 8,
    name: 'Merit Fouad',
    initials: 'MF',
    clickUpId: '87708246',
    color: '#14b8a6',
    target: 6.5,
    status: 'offline',
    timer: null,
    tracked: 3.5,
    task: 'Scientific Journals — Physics Collection',
    taskStatus: 'in progress',
    taskStatusColor: '#f59e0b',
    project: 'Scientific Archive',
    startTime: '8:20 AM',
    endTime: '12:00 PM',
    lastSeen: 35,         // 35 minutes ago
    breaks: { total: 15, count: 1 },
    tasks: 4,
    done: 2,
    completionDenominator: 4,
    // tracked: min(3.5/6.5)*40=21.5, tasks: min(4/3)*20=20, completion:(2/4)*30=15, compliance:min(3.2/6.5)*10=4.9
    score: 55,
    scoreBreakdown: { trackedTime: 21.5, tasksWorked: 20, tasksDone: 15, compliance: 4.9 },
    complianceHours: 3.2,
    isOverworking: false,
    lastActiveDate: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    avgStartTime: '08:15',
    avgEndTime: '12:00',
    startDelta: -5,
    endDelta: -360,
  }),
];

// ─── Team Stats (pre-computed from MOCK_MEMBERS) ──────────────────────────────

// Total tracked: 5.2+7.8+4.5+4.2+0+0+1.8+3.5 = 27.0h
// Total target: 8 * 6.5 = 52.0h (but leave member has 0 target effectively)
// Working members: 3 (Dina, Alaa, Samar)
export const MOCK_TEAM_STATS = {
  tracked: {
    value: 27.0,
    target: 52.0,
    progress: Math.round((27.0 / 52.0) * 100), // ~52%
  },
  tasks: {
    done: 16,   // 4+7+3+3+0+0+0+2 = 19 done (minus leave)
    total: 28,  // 5+8+4+5+0+0+2+4 = 28
    progress: Math.round((16 / 28) * 100), // ~57%
  },
};

// ─── Score Metrics (avg of non-leave, non-noActivity members) ─────────────────

// Average score of active members for team display
const activeMembers = [84, 96, 63, 41, 28, 55]; // excludes noActivity(0) and leave(0)
const avgScore = Math.round(activeMembers.reduce((a, b) => a + b, 0) / 8); // all 8

export const MOCK_SCORE_METRICS = {
  total: Math.round(avgScore),
  time: Math.round((32 + 40 + 27.7 + 25.8 + 0 + 0 + 11.1 + 21.5) / 8),
  workload: Math.round((20 + 20 + 20 + 20 + 0 + 0 + 13.3 + 20) / 8),
  tasks: Math.round((24 + 26.25 + 22.5 + 18 + 0 + 0 + 0 + 15) / 8),
  compliance: Math.round((7.7 + 10 + 6.5 + 5.8 + 0 + 0 + 2.3 + 4.9) / 8),
  weighted: {
    time: 32,
    workload: 20,
    completion: 24,
    compliance: 7.7,
  },
  weights: {
    TIME: 0.40,
    WORKLOAD: 0.20,
    COMPLETION: 0.30,
    COMPLIANCE: 0.10,
  },
};

// ─── Project Breakdown ────────────────────────────────────────────────────────

export const MOCK_PROJECT_BREAKDOWN = {
  'Digitization Queue': {
    name: 'Digitization Queue',
    color: '#6366f1',
    statuses: {
      'in progress': { name: 'in progress', color: '#f59e0b', count: 3, tasks: 3 },
      'ready': { name: 'ready', color: '#10b981', count: 8, tasks: 8 },
      'backlog': { name: 'backlog', color: '#6b7280', count: 12, tasks: 12 },
    },
  },
  'Archive Digitization': {
    name: 'Archive Digitization',
    color: '#8b5cf6',
    statuses: {
      'in progress': { name: 'in progress', color: '#f59e0b', count: 2, tasks: 2 },
      'ready': { name: 'ready', color: '#10b981', count: 15, tasks: 15 },
      'stopped': { name: 'stopped', color: '#ef4444', count: 1, tasks: 1 },
    },
  },
  'Manuscript Digitization': {
    name: 'Manuscript Digitization',
    color: '#ec4899',
    statuses: {
      'in progress': { name: 'in progress', color: '#f59e0b', count: 1, tasks: 1 },
      'ready': { name: 'ready', color: '#10b981', count: 6, tasks: 6 },
      'hold': { name: 'hold', color: '#f97316', count: 2, tasks: 2 },
    },
  },
};

// ─── Settings Variations ──────────────────────────────────────────────────────

export const MOCK_SETTINGS = {
  DEFAULT: {
    team: {
      membersToMonitor: [], // Empty = show all seeded members
      leaveQuotas: {},
      sickQuotas: {},
      bonusQuotas: {},
      wfhQuotas: {},
    },
    clickup: {
      apiKey: 'pk_test_mock_key_for_visual_tests',
      teamId: '9011234567',
      projectsToTrack: [],
      leaveListId: '',
      wfhListId: '',
      customFields: {},
    },
    score: {
      weights: {
        trackedTime: 0.40,
        tasksWorked: 0.20,
        tasksDone: 0.30,
        compliance: 0.10,
      },
      taskBaseline: 3,
    },
    thresholds: {
      breakMinutes: 15,
      offlineMinutes: 60,
      breakGapMinutes: 5,
    },
    sync: {
      intervalMs: 30000,
      autoClearCache: 'weekly',
      dataRetentionDays: 30,
      batchSize: 10,
      batchDelayMs: 150,
    },
    schedule: {
      startTime: '08:00',
      endTime: '18:00',
      workDays: [0, 1, 2, 3, 4], // Sun-Thu
      dailyTargetHours: 6.5,
      publicHolidays: [],
    },
    display: {
      theme: 'trueBlack',
      defaultView: 'grid',
      showProfilePictures: true,
      developerMode: false,
    },
  },

  CUSTOM_WEIGHTS: {
    score: {
      weights: {
        trackedTime: 0.60,   // 60% (up from 40%)
        tasksWorked: 0.10,   // 10% (down from 20%)
        tasksDone: 0.20,     // 20% (down from 30%)
        compliance: 0.10,    // 10% unchanged
      },
      taskBaseline: 3,
    },
  },

  CUSTOM_SCHEDULE: {
    schedule: {
      startTime: '09:00',
      endTime: '17:00',
      workDays: [1, 2, 3, 4, 5], // Mon-Fri (instead of Sun-Thu)
      dailyTargetHours: 6.5,
      publicHolidays: [],
    },
  },

  NOIR_GLASS_THEME: {
    display: {
      theme: 'noirGlass',
      defaultView: 'grid',
      showProfilePictures: true,
      developerMode: false,
    },
  },
};

// ─── Date Range Presets ───────────────────────────────────────────────────────

const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const last7Start = new Date(today);
last7Start.setDate(today.getDate() - 6);
const last7StartStr = `${last7Start.getFullYear()}-${String(last7Start.getMonth() + 1).padStart(2, '0')}-${String(last7Start.getDate()).padStart(2, '0')}`;

export const MOCK_DATE_RANGES = {
  TODAY: {
    startDate: null,
    endDate: null,
    preset: 'today',
  },
  YESTERDAY: {
    startDate: (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    endDate: (() => {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    preset: 'yesterday',
  },
  LAST_7_DAYS: {
    startDate: last7StartStr,
    endDate: todayStr,
    preset: 'last7',
  },
  CUSTOM_RANGE: {
    startDate: '2026-02-01',
    endDate: '2026-02-15',
    preset: 'custom',
  },
};

// ─── Mock Leave Records (for db.leaves seeding) ───────────────────────────────

export const MOCK_LEAVES = [
  // Riham — approved annual leave (matches Member 6)
  {
    id: 1,
    memberId: 6,
    clickUpId: '87657592',
    memberName: 'Riham',
    type: 'annual',
    status: 'approved',
    startDate: '2026-03-10',
    endDate: '2026-03-14',
    returnDate: '2026-03-15',
    requestedDays: 5,
    notes: 'Spring vacation',
  },
  // Dina Ibrahim — upcoming approved leave (not affecting today)
  {
    id: 2,
    memberId: 1,
    clickUpId: '87657591',
    memberName: 'Dina Ibrahim',
    type: 'annual',
    status: 'approved',
    startDate: '2026-03-20',
    endDate: '2026-03-22',
    returnDate: '2026-03-23',
    requestedDays: 3,
    notes: '',
  },
  // Islam Othman — WFH record
  {
    id: 3,
    memberId: 5,
    clickUpId: '87650455',
    memberName: 'Islam Othman',
    type: 'wfh',
    status: 'approved',
    startDate: todayStr,
    endDate: todayStr,
    returnDate: null,
    requestedDays: 1,
    notes: 'Working from home',
  },
];

// ─── Edge Case Member Sets ────────────────────────────────────────────────────

export const EDGE_CASE_MEMBERS = {
  EMPTY_TEAM: [],

  SINGLE_MEMBER: [
    createMockMember({
      id: 1,
      name: 'Dina Ibrahim',
      initials: 'DI',
      clickUpId: '87657591',
      color: '#6366f1',
      target: 6.5,
      status: 'working',
      timer: 1800,
      tracked: 5.2,
      task: 'Test Book',
      taskStatus: 'in progress',
      taskStatusColor: '#f59e0b',
      project: 'Test Project',
      tasks: 5,
      done: 4,
      completionDenominator: 5,
      score: 84,
      complianceHours: 5.0,
      lastActiveDate: new Date().toISOString(),
    }),
  ],

  ALL_ON_LEAVE: [
    'Dina Ibrahim', 'Alaa Soliman', 'Nada Meshref', 'Nada Amr',
    'Islam Othman', 'Riham', 'Samar Magdy', 'Merit Fouad',
  ].map((name, i) => createMockMember({
    id: i + 1,
    name,
    initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    clickUpId: ['87657591', '93604849', '93604850', '93604848', '87650455', '87657592', '87657593', '87708246'][i],
    color: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'][i],
    target: 6.5,
    status: 'leave',
    tracked: 0,
    tasks: 0,
    done: 0,
    score: 0,
    onLeave: true,
    leaveType: 'Annual Leave',
    leaveStart: '2026-03-10',
    leaveEnd: '2026-03-16',
    returnDate: '2026-03-17',
    leaveRecord: { requestedDays: 7, status: 'approved' },
  })),

  ALL_OVERWORKING: [
    'Dina Ibrahim', 'Alaa Soliman', 'Nada Meshref', 'Nada Amr',
    'Islam Othman', 'Riham', 'Samar Magdy', 'Merit Fouad',
  ].map((name, i) => createMockMember({
    id: i + 1,
    name,
    initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    clickUpId: ['87657591', '93604849', '93604850', '93604848', '87650455', '87657592', '87657593', '87708246'][i],
    color: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'][i],
    target: 6.5,
    status: 'working',
    timer: 3600,
    tracked: 7.5,
    task: 'Overwork Test Book',
    taskStatus: 'in progress',
    project: 'Test Project',
    tasks: 6,
    done: 5,
    completionDenominator: 6,
    score: 95,
    complianceHours: 6.5,
    isOverworking: true,
    overtimeMinutes: 60,
    lastActiveDate: new Date().toISOString(),
  })),

  ALL_NO_ACTIVITY: [
    'Dina Ibrahim', 'Alaa Soliman', 'Nada Meshref', 'Nada Amr',
    'Islam Othman', 'Riham', 'Samar Magdy', 'Merit Fouad',
  ].map((name, i) => createMockMember({
    id: i + 1,
    name,
    initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    clickUpId: ['87657591', '93604849', '93604850', '93604848', '87650455', '87657592', '87657593', '87708246'][i],
    color: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'][i],
    target: 6.5,
    status: 'noActivity',
    tracked: 0,
    tasks: 0,
    done: 0,
    score: 0,
    complianceHours: 0,
    lastActiveDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  })),
};
