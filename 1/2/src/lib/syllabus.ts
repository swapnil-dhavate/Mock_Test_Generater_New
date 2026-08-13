export const TECHNICAL_SUBJECTS = [
  {
    id: 'anatomy',
    name: 'Anatomy & Physiology',
    topics: ['Skeletal System', 'Cardiovascular System', 'Respiratory System', 'Nervous System', 'Gastrointestinal', 'Renal System']
  },
  {
    id: 'med-surg',
    name: 'Medical Surgical Nursing',
    topics: ['Cardiac Disorders', 'Respiratory Disorders', 'Neurological Disorders', 'Oncology', 'Endocrine Disorders']
  },
  {
    id: 'nursing-foundation',
    name: 'Fundamentals of Nursing',
    topics: ['Vital Signs', 'First Aid', 'Ethics & Law', 'Patient Safety']
  },
  {
    id: 'pediatrics',
    name: 'Child Health Nursing',
    topics: ['Immunization', 'Growth & Development', 'Congenital Anomalies', 'Neonatal Care', 'Pediatric Disorders']
  },
  {
    id: 'psychiatric',
    name: 'Mental Health Nursing',
    topics: ['Schizophrenia', 'Mood Disorders', 'Substance Abuse', 'Personality Disorders', 'Therapeutic Communication']
  },
  {
    id: 'obg',
    name: 'Midwifery & Gynecological Nursing',
    topics: ['Labor Stages', 'Antenatal Care', 'Postpartum Care', 'High-Risk Pregnancy']
  },
  {
    id: 'community',
    name: 'Community Health Nursing',
    topics: ['Epidemiology', 'Health Programs', 'Demography', 'Communicable Diseases']
  },
  {
    id: 'nutrition',
    name: 'Nutrition & Dietetics',
    topics: ['Macronutrients', 'Vitamins & Minerals', 'Therapeutic Diets', 'Assessment']
  },
  {
    id: 'nursing-admin',
    name: 'Nursing Administration & Ward Management',
    topics: ['Management Principles', 'Material Management', 'Budgeting', 'Leadership']
  }
];

export const NON_TECHNICAL_SUBJECTS = [
  {
    id: 'english',
    name: 'English Language',
    topics: ['Grammar', 'Vocabulary', 'Comprehension', 'Fill in the blanks', 'Synonyms & Antonyms']
  },
  {
    id: 'gk',
    name: 'General Knowledge',
    topics: ['Current Affairs', 'History', 'Geography', 'Indian Polity', 'Economics', 'General Science']
  },
  {
    id: 'maths',
    name: 'Numerical Ability',
    topics: ['Basic Mathematics', 'Percentage', 'Ratio & Proportion', 'Average', 'Time & Work', 'Simple & Compound Interest']
  },
  {
    id: 'reasoning',
    name: 'Reasoning',
    topics: ['General Aptitude', 'Blood Relations', 'Coding-Decoding', 'Number Series', 'Direction Sense', 'Syllogism']
  }
];

export const SyllabusMasterList = {
  technical: [
    'Anatomy & Physiology', 'Medical Surgical Nursing', 'Fundamentals of Nursing',
    'Child Health Nursing', 'Mental Health Nursing', 'Midwifery & Gynecological Nursing',
    'Community Health Nursing', 'Microbiology', 'Pharmacology', 'Nutrition & Dietetics',
    'Psychology', 'Sociology', 'Nursing Administration & Ward Management',
    'Nursing Education & Research', 'Environmental Hygiene'
  ],
  nonTechnical: [
    'Marathi Language', 'English Language', 'General Knowledge', 'Maharashtra GK', 'Numerical Ability', 'Reasoning'
  ],
  highPriority: [
    'Infection Control', 'ICU & Emergency Nursing', 'Pharmacology Drug Calculations',
    'Obstetrics Complications', 'Pediatric Vaccination', 'Mental Health Disorders',
    'Community Health Programs', 'Biomedical Waste Management', 'Hospital Protocols',
    'National Health Schemes'
  ],
  mhSpecific: [
    'Maharashtra GK', 'Current Affairs', 'Indian Health Programs', 'National Health Mission (NHM)',
    'English Language', 'Marathi Language', 'Grammar', 'Vocabulary', 'Translation-based Questions', 'Medical Terminology'
  ]
};
