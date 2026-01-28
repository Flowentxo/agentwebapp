/**
 * Dot Agent - Type Definitions
 * Recruiter AI Agent
 */

// ============================================
// SOURCING TYPES
// ============================================

// Tool 1: search_candidates
export interface SearchCandidatesInput {
  jobTitle: string;
  skills: string[];
  location?: string;
  yearsExperience?: { min?: number; max?: number };
  companies?: string[];
  industries?: string[];
  education?: string[];
  currentlyEmployed?: boolean;
  openToRemote?: boolean;
  maxResults?: number;
}

export interface SearchCandidatesOutput {
  candidates: Array<{
    id: string;
    name: string;
    currentTitle: string;
    currentCompany: string;
    location: string;
    yearsExperience: number;
    skills: string[];
    education: string[];
    matchScore: number;
    profileUrl?: string;
    email?: string;
    phone?: string;
    highlights: string[];
  }>;
  totalFound: number;
  searchCriteria: string;
  refinementSuggestions: string[];
}

// Tool 2: analyze_linkedin_profile
export interface AnalyzeLinkedInProfileInput {
  profileUrl?: string;
  profileText?: string;
  jobRequirements?: {
    skills: string[];
    experience: number;
    level: string;
  };
}

export interface AnalyzeLinkedInProfileOutput {
  profile: {
    name: string;
    headline: string;
    location: string;
    summary: string;
    currentRole: {
      title: string;
      company: string;
      duration: string;
    };
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      highlights: string[];
    }>;
    education: Array<{
      institution: string;
      degree: string;
      field: string;
      year: string;
    }>;
    skills: string[];
    endorsements: number;
    recommendations: number;
    connections: string;
  };
  analysis: {
    careerTrajectory: string;
    strengthAreas: string[];
    potentialConcerns: string[];
    cultureFitIndicators: string[];
    motivationClues: string[];
  };
  jobFit?: {
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    experienceMatch: boolean;
    recommendation: string;
  };
  outreachSuggestions: string[];
}

// Tool 3: generate_boolean_search
export interface GenerateBooleanSearchInput {
  jobTitle: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  yearsExperience?: number;
  location?: string;
  excludeCompanies?: string[];
  platform: 'linkedin' | 'indeed' | 'github' | 'generic';
}

export interface GenerateBooleanSearchOutput {
  booleanString: string;
  breakdown: {
    titleVariations: string[];
    skillCombinations: string;
    exclusions: string;
    locationFilters: string;
  };
  alternativeSearches: string[];
  tips: string[];
  estimatedResults: string;
}

// ============================================
// SCREENING TYPES
// ============================================

// Tool 4: screen_resume
export interface ScreenResumeInput {
  resumeText: string;
  jobRequirements: {
    requiredSkills: string[];
    preferredSkills?: string[];
    yearsExperience: number;
    education?: string;
    certifications?: string[];
  };
  evaluationCriteria?: {
    weightSkills?: number;
    weightExperience?: number;
    weightEducation?: number;
  };
}

export interface ScreenResumeOutput {
  overallScore: number;
  skillsMatch: {
    required: Array<{
      skill: string;
      found: boolean;
      evidence?: string;
      proficiencyLevel?: string;
    }>;
    preferred: Array<{
      skill: string;
      found: boolean;
      evidence?: string;
    }>;
    additional: string[];
  };
  experienceAnalysis: {
    totalYears: number;
    relevantYears: number;
    seniorityLevel: string;
    careerProgression: string;
    industryExperience: string[];
    companyTypes: string[];
  };
  educationAnalysis: {
    highestDegree: string;
    relevantEducation: boolean;
    certifications: string[];
  };
  strengths: string[];
  concerns: string[];
  redFlags?: string[];
  recommendation: 'proceed' | 'maybe' | 'pass';
  suggestedQuestions: string[];
  interviewFocus: string[];
}

// Tool 5: match_job_requirements
export interface MatchJobRequirementsInput {
  candidateProfile: {
    skills: string[];
    yearsExperience: number;
    education: string;
    currentRole: string;
    industries: string[];
  };
  jobRequirements: {
    title: string;
    skills: string[];
    experience: number;
    education?: string;
    level: string;
    department: string;
  };
  weightings?: {
    skills: number;
    experience: number;
    education: number;
    levelMatch: number;
  };
}

export interface MatchJobRequirementsOutput {
  overallMatch: number;
  categoryScores: {
    skills: { score: number; matched: string[]; missing: string[]; bonus: string[] };
    experience: { score: number; analysis: string };
    education: { score: number; analysis: string };
    level: { score: number; analysis: string };
  };
  fitAnalysis: {
    strengths: string[];
    gaps: string[];
    growthAreas: string[];
  };
  recommendation: 'strong_fit' | 'good_fit' | 'potential_fit' | 'not_fit';
  nextSteps: string[];
  developmentPlan?: string[];
}

// Tool 6: generate_screening_questions
export interface GenerateScreeningQuestionsInput {
  jobTitle: string;
  requiredSkills: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  focusAreas?: string[];
  candidateBackground?: string;
  questionTypes?: ('technical' | 'behavioral' | 'situational' | 'cultural')[];
  numberOfQuestions?: number;
}

export interface GenerateScreeningQuestionsOutput {
  questions: Array<{
    question: string;
    type: 'technical' | 'behavioral' | 'situational' | 'cultural';
    skill: string;
    difficulty: 'easy' | 'medium' | 'hard';
    expectedAnswer?: string;
    followUpQuestions: string[];
    redFlagResponses?: string[];
    greenFlagResponses?: string[];
  }>;
  interviewGuide: {
    introduction: string;
    questionOrder: string[];
    closingQuestions: string[];
    candidateQuestionsToExpect: string[];
  };
  evaluationRubric: {
    criteria: string[];
    scoringGuide: string;
  };
}

// ============================================
// COMMUNICATION TYPES
// ============================================

// Tool 7: draft_outreach_message
export interface DraftOutreachMessageInput {
  candidateName: string;
  candidateTitle: string;
  candidateCompany: string;
  jobTitle: string;
  companyName: string;
  personalizationPoints?: string[];
  channel: 'email' | 'linkedin' | 'inmail';
  tone: 'professional' | 'casual' | 'enthusiastic';
  includeCompensation?: boolean;
  compensationRange?: string;
}

export interface DraftOutreachMessageOutput {
  subject?: string;
  message: string;
  characterCount: number;
  personalizationUsed: string[];
  variants: string[];
  followUpMessage: string;
  followUpTiming: string;
  responseTemplates: {
    interested: string;
    notInterested: string;
    wantMoreInfo: string;
  };
  tips: string[];
}

// Tool 8: draft_rejection_email
export interface DraftRejectionEmailInput {
  candidateName: string;
  jobTitle: string;
  stage: 'application' | 'phone_screen' | 'interview' | 'final_round';
  reason?: string;
  keepInTalentPool?: boolean;
  feedbackAllowed?: boolean;
  tone: 'professional' | 'warm' | 'brief';
}

export interface DraftRejectionEmailOutput {
  subject: string;
  body: string;
  feedbackSection?: string;
  talentPoolInvitation?: string;
  variants: string[];
  sendingRecommendations: {
    timing: string;
    sender: string;
    channel: string;
  };
}

// ============================================
// COORDINATION TYPES
// ============================================

// Tool 9: schedule_interview
export interface ScheduleInterviewInput {
  candidateName: string;
  candidateEmail: string;
  interviewType: 'phone_screen' | 'video' | 'onsite' | 'panel' | 'technical';
  interviewers: Array<{
    name: string;
    email: string;
    role: string;
  }>;
  duration: number; // minutes
  preferredTimes?: string[];
  timezone?: string;
  jobTitle: string;
  includePrep?: boolean;
}

export interface ScheduleInterviewOutput {
  interviewDetails: {
    type: string;
    duration: number;
    proposedTimes: string[];
    interviewers: string[];
  };
  candidateEmail: {
    subject: string;
    body: string;
    calendarInvite: string;
  };
  interviewerEmail: {
    subject: string;
    body: string;
  };
  prepMaterials?: {
    forCandidate: string[];
    forInterviewers: string[];
  };
  logistics: {
    platform?: string;
    meetingLink?: string;
    location?: string;
    parkingInfo?: string;
  };
  reminderSchedule: Array<{
    recipient: string;
    timing: string;
    message: string;
  }>;
}

// Tool 10: create_job_description
export interface CreateJobDescriptionInput {
  title: string;
  department: string;
  level: 'intern' | 'entry' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | 'executive';
  responsibilities: string[];
  requirements: string[];
  niceToHave?: string[];
  benefits?: string[];
  companyInfo?: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  location: string;
  remotePolicy: 'onsite' | 'hybrid' | 'remote';
  tone: 'professional' | 'startup' | 'corporate' | 'creative';
}

export interface CreateJobDescriptionOutput {
  title: string;
  summary: string;
  aboutRole: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  compensation?: string;
  aboutCompany: string;
  location: string;
  workArrangement: string;
  equalOpportunityStatement: string;
  applicationInstructions: string;
  seoKeywords: string[];
  estimatedApplicants: string;
  competitiveAnalysis: string[];
}
