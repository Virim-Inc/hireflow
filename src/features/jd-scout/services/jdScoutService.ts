import type { JdFormData, ScoutCandidate, ScoutResults } from '../types/jd-scout.types';

const SCOUT_CANDIDATES: ScoutCandidate[] = [
  {
    id: 's1', rank: 1, score: 98, name: 'Aditya Kumar', title: 'Principal Engineer',
    currentCompany: 'Microsoft', location: 'Bangalore, IN', experience: 10,
    education: 'B.Tech IIT Delhi', avatar: 'AK',
    skills: ['React', 'TypeScript', 'Node.js', 'AWS', 'GraphQL', 'Kubernetes', 'Python'],
    matchedSkills: ['React', 'TypeScript', 'Node.js', 'AWS', 'GraphQL'],
    matchBreakdown: { overall: 98, skills: 99, location: 98, experience: 97, cultureFit: 96, education: 99 },
    salaryExpectation: '₹55–65 LPA', availability: 'Immediate',
    linkedinUrl: 'https://linkedin.com', status: 'open',
  },
  {
    id: 's2', rank: 2, score: 95, name: 'Meera Iyer', title: 'Staff Software Engineer',
    currentCompany: 'Amazon', location: 'Hyderabad, IN', experience: 9,
    education: 'M.S. Computer Science', avatar: 'MI',
    skills: ['React', 'TypeScript', 'GraphQL', 'AWS', 'Docker', 'PostgreSQL'],
    matchedSkills: ['React', 'TypeScript', 'GraphQL', 'AWS'],
    matchBreakdown: { overall: 95, skills: 96, location: 94, experience: 95, cultureFit: 94, education: 97 },
    salaryExpectation: '₹50–60 LPA', availability: '1 month notice',
    status: 'open',
  },
  {
    id: 's3', rank: 3, score: 92, name: 'Rohit Joshi', title: 'Senior SDE',
    currentCompany: 'Swiggy', location: 'Bangalore, IN', experience: 7,
    education: 'B.Tech NIT', avatar: 'RJ',
    skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'Redis', 'MongoDB'],
    matchedSkills: ['React', 'Node.js', 'TypeScript', 'AWS'],
    matchBreakdown: { overall: 92, skills: 93, location: 95, experience: 90, cultureFit: 91, education: 90 },
    salaryExpectation: '₹40–50 LPA', availability: '2 weeks notice',
    status: 'open',
  },
  {
    id: 's4', rank: 4, score: 88, name: 'Nisha Gupta', title: 'Full Stack Lead',
    currentCompany: 'Paytm', location: 'Noida, IN', experience: 8,
    education: 'B.Tech BITS Pilani', avatar: 'NG',
    skills: ['React', 'Vue.js', 'Node.js', 'TypeScript', 'AWS', 'CI/CD'],
    matchedSkills: ['React', 'Node.js', 'TypeScript', 'AWS'],
    matchBreakdown: { overall: 88, skills: 90, location: 82, experience: 92, cultureFit: 88, education: 91 },
    salaryExpectation: '₹38–45 LPA', availability: '1 month notice',
    status: 'available',
  },
  {
    id: 's5', rank: 5, score: 84, name: 'Amit Bose', title: 'Senior Frontend Engineer',
    currentCompany: 'Zomato', location: 'Gurgaon, IN', experience: 6,
    education: 'B.Tech VIT', avatar: 'AB',
    skills: ['React', 'TypeScript', 'GraphQL', 'Next.js', 'Tailwind'],
    matchedSkills: ['React', 'TypeScript', 'GraphQL'],
    matchBreakdown: { overall: 84, skills: 87, location: 80, experience: 84, cultureFit: 85, education: 82 },
    salaryExpectation: '₹32–40 LPA', availability: 'Immediate',
    status: 'available',
  },
  {
    id: 's6', rank: 6, score: 79, name: 'Pooja Reddy', title: 'Software Developer',
    currentCompany: 'Ola', location: 'Bangalore, IN', experience: 5,
    education: 'B.Tech Manipal', avatar: 'PR',
    skills: ['React', 'JavaScript', 'Node.js', 'MongoDB', 'Docker'],
    matchedSkills: ['React', 'Node.js'],
    matchBreakdown: { overall: 79, skills: 80, location: 92, experience: 78, cultureFit: 76, education: 75 },
    salaryExpectation: '₹28–35 LPA', availability: '2 weeks notice',
    status: 'open',
  },
];

export const jdScoutService = {
  async searchCandidates(_jd: JdFormData): Promise<ScoutResults> {
    await new Promise(r => setTimeout(r, 2200)); // simulate AI search time
    return {
      candidates: SCOUT_CANDIDATES,
      totalFound: 6,
      searchedAt: new Date().toISOString(),
      jdTitle: _jd.title || 'Open Position',
    };
  },

  async uploadAndParse(file?: File): Promise<Partial<JdFormData>> {
    void file;
    await new Promise(r => setTimeout(r, 1500));
    return {
      title: 'Senior Full Stack Engineer',
      company: 'HireFlow Technologies',
      location: 'Bangalore, IN',
      locationType: 'hybrid',
      experienceMin: 5,
      experienceMax: 10,
      skills: ['React', 'TypeScript', 'Node.js', 'AWS', 'GraphQL'],
      description: 'We are looking for a Senior Full Stack Engineer to join our growing team...',
      education: "Bachelor's in Computer Science or equivalent",
      industry: 'Technology',
    };
  },
};
