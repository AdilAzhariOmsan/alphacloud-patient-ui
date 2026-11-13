/**
 * Seeded mock data. A fixed seed keeps names, IDs and remarks identical on
 * every load. Timestamps are relative to "now", so the list always looks
 * current.
 */
export const COUNTRIES = {
  MY: { name: 'Malaysia', dial: '+60', flag: 'my' },
  SG: { name: 'Singapore', dial: '+65', flag: 'sg' },
  CN: { name: 'China', dial: '+86', flag: 'cn' },
  ID: { name: 'Indonesia', dial: '+62', flag: 'id' },
  TH: { name: 'Thailand', dial: '+66', flag: 'th' },
  IN: { name: 'India', dial: '+91', flag: 'in' },
  JP: { name: 'Japan', dial: '+81', flag: 'jp' },
  KR: { name: 'South Korea', dial: '+82', flag: 'kr' },
  PH: { name: 'Philippines', dial: '+63', flag: 'ph' },
  VN: { name: 'Vietnam', dial: '+84', flag: 'vn' },
  GB: { name: 'United Kingdom', dial: '+44', flag: 'gb' },
  US: { name: 'United States', dial: '+1', flag: 'us' },
  AU: { name: 'Australia', dial: '+61', flag: 'au' },
};

export const STATUSES = {
  waiting: { label: 'In queue', chip: 'warning' },
  consulting: { label: 'In consultation', chip: 'primary' },
  done: { label: 'Checked out', chip: 'success' },
  offline: { label: 'Not in clinic', chip: '' },
};

const SEEDS = [
  ['Ahmad Faizal bin Rahman', 'MY'], ['Nurul Aina binti Ismail', 'MY'], ['Tan Wei Ming', 'MY'],
  ['Lim Mei Ling', 'MY'], ['Priya a/p Subramaniam', 'MY'], ['Muhammad Haziq Zulkifli', 'MY'],
  ['Siti Hajar Abdullah', 'MY'], ['Wong Kah Wai', 'MY'], ['Rajesh Kumar a/l Muthusamy', 'MY'],
  ['Chong Li Ying', 'MY'], ['Ng Jun Hao', 'SG'], ['Ong Hui Min', 'SG'],
  ['Zhang Wei', 'CN'], ['Li Na', 'CN'], ['Wang Fang', 'CN'], ['Chen Jie', 'CN'],
  ['Budi Santoso', 'ID'], ['Dewi Lestari', 'ID'], ['Somchai Wongsakul', 'TH'], ['Nattaya Srisuk', 'TH'],
  ['Arjun Mehta', 'IN'], ['Ananya Iyer', 'IN'], ['Haruto Sato', 'JP'], ['Yui Tanaka', 'JP'],
  ['Kim Min-jun', 'KR'], ['Park Seo-yeon', 'KR'], ['Maria Clara Santos', 'PH'], ['Jose Miguel Reyes', 'PH'],
  ['Nguyen Van An', 'VN'], ['Tran Thi Mai', 'VN'], ['Oliver Bennett', 'GB'], ['Charlotte Hughes', 'GB'],
  ['Ethan Carter', 'US'], ['Olivia Brooks', 'US'], ['Liam Mitchell', 'AU'], ['Chloe Walker', 'AU'],
];

const OCCUPATIONS = [
  'Software Engineer', 'Accountant', 'Teacher', 'Nurse', 'Civil Engineer', 'Retired', 'Business Owner',
  'Graphic Designer', 'Student', 'Sales Executive', 'Architect', 'Chef', 'Lawyer', 'Pharmacist',
  'Marketing Manager', 'Data Analyst', 'Pilot', 'Homemaker', 'Journalist', 'Logistics Coordinator',
];

/* Medical profile: free-text remarks plus a structured allergy list. Twelve
   entries, picked once per patient, so the seeded sequence stays stable. */
const MEDICAL_PROFILES = [
  { remarks: 'Use alternative antibiotics.', allergies: ['Penicillin'] },
  { remarks: 'No ongoing conditions.', allergies: [] },
  { remarks: 'Mild asthma. Carries a salbutamol inhaler.', allergies: [] },
  { remarks: 'Type 2 diabetes, managed with metformin 500 mg twice daily.', allergies: [] },
  { remarks: 'Use nitrile gloves for all procedures.', allergies: ['Shellfish', 'Latex'] },
  { remarks: 'Hypertension. Monitor blood pressure at every visit.', allergies: [] },
  { remarks: 'Paracetamol only for pain relief.', allergies: ['NSAIDs (ibuprofen)'] },
  { remarks: 'Lower back pain after a 2024 sports injury.', allergies: [] },
  { remarks: 'Seasonal allergic rhinitis. On cetirizine as needed.', allergies: ['Dust mites'] },
  { remarks: 'Pregnant, second trimester. Avoid X-ray imaging.', allergies: [] },
  { remarks: 'High cholesterol. On atorvastatin 20 mg.', allergies: [] },
  { remarks: 'History of anaphylaxis. Carries an EpiPen.', allergies: ['Peanuts'] },
];

const TREATMENTS = [
  'General Consultation', 'Dental Scaling', 'Physiotherapy', 'Follow-up Review', 'Blood Test',
  'Vaccination', 'Health Screening', 'Dermatology Review', 'Eye Examination', 'Wound Dressing',
];

const DOCTORS = ['Dr. Sarah Lim', 'Dr. Arif Hakim', 'Dr. Mei Chen', 'Dr. Rahul Nair', 'Dr. Emily Tan', 'Dr. Kenji Mori'];

const SYMPTOMS = [
  'Persistent dry cough for 1 week', 'Routine check, no symptoms', 'Tooth sensitivity when drinking cold water',
  'Knee stiffness after running', 'Review HbA1c results', 'Recurring migraine, 3x per week',
  'Itchy rash on forearms', 'Blurred vision when reading', 'Annual booster due', 'Fever and sore throat since Monday',
];

const APPT_STATUSES = ['Confirmed', 'Confirmed', 'Pending', 'Rescheduled'];

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;
const MIN = 60_000;

export function generatePatients(now = Date.now()) {
  const rand = mulberry32(20261112);
  const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const digits = (n) => Array.from({ length: n }, () => int(0, 9)).join('');

  const roundTo5 = (ts) => ts - (ts % (5 * MIN));

  return SEEDS.map(([name, cc], i) => {
    const country = COUNTRIES[cc];
    const birthYear = int(1952, 2008);
    const birthday = new Date(birthYear, int(0, 11), int(1, 28)).getTime();
    // Identity documents: only the last four characters are ever generated or
    // kept, so no complete (and potentially real) NRIC or passport number
    // exists anywhere in the demo. The discarded draws keep the seeded
    // sequence, and therefore every other field, unchanged.
    if (cc === 'MY') int(1, 16); else { int(0, 25); digits(4); }
    const idLast4 = digits(4);

    const phone = cc === 'MY'
      ? `${country.dial} 1${int(0, 9)}-${digits(3)} ${digits(4)}`
      : `${country.dial} ${digits(3)} ${digits(3)} ${digits(4)}`;

    const slug = name.toLowerCase().replace(/\b(bin|binti|a\/l|a\/p)\b/g, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');

    const appointmentCount = int(0, 3);
    const appointments = Array.from({ length: appointmentCount }, () => {
      const day = new Date(now + int(1, 30) * DAY);
      day.setHours(int(9, 16), pick([0, 15, 30, 45]), 0, 0);
      return {
        id: `apt-${i}-${digits(4)}`,
        at: day.getTime(),
        treatment: pick(TREATMENTS),
        doctor: pick(DOCTORS),
        status: pick(APPT_STATUSES),
        symptoms: pick(SYMPTOMS),
      };
    }).sort((a, b) => a.at - b.at);

    return {
      id: `PT-${String(1001 + i)}`,
      name,
      idType: cc === 'MY' ? 'NRIC' : 'Passport',
      idLast4,
      phone,
      email: `${slug}@example.com`,
      nationality: cc,
      birthday,
      occupation: pick(OCCUPATIONS),
      vip: rand() < 0.24,
      createdAt: roundTo5(now - int(0, 75) * DAY - int(0, 600) * MIN),
      lastVisit: { at: roundTo5(now - int(3, 220) * DAY), durationMin: pick([20, 25, 30, 40, 45, 60, 75, 90]) },
      ...structuredClone(pick(MEDICAL_PROFILES)),
      // Exactly two patients start in the queue, matching the "Queue 2" badge in the spec.
      status: i === 2 || i === 13 ? 'waiting' : i === 5 || i === 20 ? 'consulting' : rand() < 0.3 ? 'done' : 'offline',
      appointments,
    };
  });
}
