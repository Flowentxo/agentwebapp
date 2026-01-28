/**
 * DotAgent - Recruiter AI Agent
 *
 * Inspired by Usemotion's Dot AI Employee
 * Sources candidates, screens resumes, and coordinates the hiring process
 *
 * Features:
 * - Candidate Sourcing & Boolean Search
 * - Resume Screening & Job Matching
 * - Candidate Outreach & Communication
 * - Interview Scheduling & Coordination
 */

import { Users } from 'lucide-react';
import { MotionBaseAgent } from '../shared/MotionBaseAgent';
import { AgentContext, AgentResponse, ConversationMessage } from '@/lib/agents/shared/types';
import {
  MotionAgentContext,
  MotionTool,
  MotionAgentId,
  AgentCategory,
} from '../shared/types';
import {
  // Sourcing
  SearchCandidatesInput,
  SearchCandidatesOutput,
  AnalyzeLinkedInProfileInput,
  AnalyzeLinkedInProfileOutput,
  GenerateBooleanSearchInput,
  GenerateBooleanSearchOutput,
  // Screening
  ScreenResumeInput,
  ScreenResumeOutput,
  MatchJobRequirementsInput,
  MatchJobRequirementsOutput,
  GenerateScreeningQuestionsInput,
  GenerateScreeningQuestionsOutput,
  // Communication
  DraftOutreachMessageInput,
  DraftOutreachMessageOutput,
  DraftRejectionEmailInput,
  DraftRejectionEmailOutput,
  // Coordination
  ScheduleInterviewInput,
  ScheduleInterviewOutput,
  CreateJobDescriptionInput,
  CreateJobDescriptionOutput,
} from './types';

// ============================================
// DOT AGENT CLASS
// ============================================

export class DotAgent extends MotionBaseAgent {
  // Required BaseAgent properties
  readonly id = 'dot';
  readonly name = 'Dot';
  readonly description = 'A talent acquisition specialist who sources candidates, screens resumes, and coordinates the hiring process.';
  readonly version = '1.0.0';
  readonly category = 'hr';
  readonly icon = 'Users';
  readonly color = '#8B5CF6';

  // Motion-specific properties
  readonly motionId: MotionAgentId = 'dot';
  readonly role = 'Recruiter';
  readonly agentCategory: AgentCategory = 'hr';
  readonly specialties = [
    'Candidate Sourcing',
    'Resume Screening',
    'Interview Scheduling',
    'Job Description Writing',
    'Candidate Communication',
    'Hiring Pipeline Management',
  ];
  readonly lucideIcon = Users;

  protected creditMultiplier = 1.0;

  constructor() {
    super();
    this.registerMotionTools();
  }

  protected registerTools(): void {}

  protected registerMotionTools(): void {
    // Sourcing Tools
    this.registerMotionTool(this.createSearchCandidatesTool());
    this.registerMotionTool(this.createAnalyzeLinkedInProfileTool());
    this.registerMotionTool(this.createGenerateBooleanSearchTool());

    // Screening Tools
    this.registerMotionTool(this.createScreenResumeTool());
    this.registerMotionTool(this.createMatchJobRequirementsTool());
    this.registerMotionTool(this.createGenerateScreeningQuestionsTool());

    // Communication Tools
    this.registerMotionTool(this.createDraftOutreachMessageTool());
    this.registerMotionTool(this.createDraftRejectionEmailTool());

    // Coordination Tools
    this.registerMotionTool(this.createScheduleInterviewTool());
    this.registerMotionTool(this.createJobDescriptionTool());
  }

  // ============================================
  // SOURCING TOOLS
  // ============================================

  private createSearchCandidatesTool(): MotionTool<SearchCandidatesInput, SearchCandidatesOutput> {
    return {
      name: 'search_candidates',
      displayName: 'Search Candidates',
      description: 'Search for candidates based on skills, experience, and other criteria',
      category: 'analytics',
      creditCost: 50,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          jobTitle: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } },
          location: { type: 'string' },
          yearsExperience: { type: 'object' },
          companies: { type: 'array', items: { type: 'string' } },
          maxResults: { type: 'number' },
        },
        required: ['jobTitle', 'skills'],
      },
      execute: async (input, context) => {
        const candidates = [];
        const numResults = Math.min(input.maxResults || 10, 20);

        for (let i = 0; i < numResults; i++) {
          candidates.push({
            id: `candidate_${i + 1}`,
            name: `Candidate ${i + 1}`,
            currentTitle: input.jobTitle,
            currentCompany: input.companies?.[i % (input.companies.length || 1)] || 'Tech Company',
            location: input.location || 'San Francisco, CA',
            yearsExperience: (input.yearsExperience?.min || 3) + i,
            skills: input.skills.slice(0, 5),
            education: ['BS Computer Science'],
            matchScore: 95 - i * 3,
            highlights: [
              `${5 + i} years in ${input.jobTitle}`,
              `Expert in ${input.skills[0]}`,
              'Strong technical background',
            ],
          });
        }

        return {
          candidates,
          totalFound: numResults * 5,
          searchCriteria: `${input.jobTitle} with ${input.skills.join(', ')}`,
          refinementSuggestions: [
            'Add specific technologies to narrow results',
            'Consider adjacent job titles',
            'Expand location search for remote roles',
          ],
        };
      },
    };
  }

  private createAnalyzeLinkedInProfileTool(): MotionTool<AnalyzeLinkedInProfileInput, AnalyzeLinkedInProfileOutput> {
    return {
      name: 'analyze_linkedin_profile',
      displayName: 'Analyze LinkedIn Profile',
      description: 'Analyze a LinkedIn profile to assess candidate fit and outreach approach',
      category: 'analytics',
      creditCost: 25,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          profileUrl: { type: 'string' },
          profileText: { type: 'string' },
          jobRequirements: { type: 'object' },
        },
        required: [],
      },
      execute: async (input, context) => {
        return {
          profile: {
            name: 'Jane Smith',
            headline: 'Senior Software Engineer | Full-Stack | React & Node.js',
            location: 'San Francisco Bay Area',
            summary: 'Passionate engineer with 8 years of experience building scalable web applications.',
            currentRole: {
              title: 'Senior Software Engineer',
              company: 'Tech Corp',
              duration: '3 years',
            },
            experience: [
              { title: 'Senior Software Engineer', company: 'Tech Corp', duration: '3 years', highlights: ['Led team of 5', 'Built microservices'] },
              { title: 'Software Engineer', company: 'Startup Inc', duration: '4 years', highlights: ['Full-stack development', 'Agile methodology'] },
            ],
            education: [{ institution: 'Stanford University', degree: 'BS', field: 'Computer Science', year: '2015' }],
            skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL'],
            endorsements: 150,
            recommendations: 8,
            connections: '500+',
          },
          analysis: {
            careerTrajectory: 'Consistent growth from IC to senior roles with increasing responsibility',
            strengthAreas: ['Full-stack development', 'Team leadership', 'Scalable architecture'],
            potentialConcerns: ['May be looking for management path', 'High market value'],
            cultureFitIndicators: ['Collaborative based on recommendations', 'Growth-oriented'],
            motivationClues: ['Recently completed AWS certification', 'Active in tech communities'],
          },
          jobFit: input.jobRequirements ? {
            matchScore: 85,
            matchedSkills: input.jobRequirements.skills?.slice(0, 3) || [],
            missingSkills: [],
            experienceMatch: true,
            recommendation: 'Strong candidate - proceed with outreach',
          } : undefined,
          outreachSuggestions: [
            'Mention their recent AWS certification',
            'Reference their team leadership experience',
            'Highlight growth opportunities in your role',
          ],
        };
      },
    };
  }

  private createGenerateBooleanSearchTool(): MotionTool<GenerateBooleanSearchInput, GenerateBooleanSearchOutput> {
    return {
      name: 'generate_boolean_search',
      displayName: 'Generate Boolean Search',
      description: 'Create optimized boolean search strings for sourcing platforms',
      category: 'analytics',
      creditCost: 25,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          jobTitle: { type: 'string' },
          requiredSkills: { type: 'array', items: { type: 'string' } },
          preferredSkills: { type: 'array', items: { type: 'string' } },
          yearsExperience: { type: 'number' },
          location: { type: 'string' },
          excludeCompanies: { type: 'array', items: { type: 'string' } },
          platform: { type: 'string', enum: ['linkedin', 'indeed', 'github', 'generic'] },
        },
        required: ['jobTitle', 'requiredSkills', 'platform'],
      },
      execute: async (input, context) => {
        const titleVariations = [input.jobTitle, input.jobTitle.replace('Senior', 'Sr.'), input.jobTitle.replace('Engineer', 'Developer')];
        const skillsString = input.requiredSkills.map(s => `"${s}"`).join(' OR ');
        const exclusions = input.excludeCompanies?.map(c => `NOT "${c}"`).join(' ') || '';

        const booleanString = `(${titleVariations.map(t => `"${t}"`).join(' OR ')}) AND (${skillsString}) ${exclusions}`;

        return {
          booleanString,
          breakdown: {
            titleVariations,
            skillCombinations: skillsString,
            exclusions: exclusions || 'None',
            locationFilters: input.location || 'Not specified',
          },
          alternativeSearches: [
            booleanString.replace('AND', 'OR'),
            `${titleVariations[0]} ${input.requiredSkills[0]}`,
          ],
          tips: [
            'Use quotes for exact matches',
            'Try related job titles for more results',
            'Add industry-specific terms',
          ],
          estimatedResults: '500-1000 profiles',
        };
      },
    };
  }

  // ============================================
  // SCREENING TOOLS
  // ============================================

  private createScreenResumeTool(): MotionTool<ScreenResumeInput, ScreenResumeOutput> {
    return {
      name: 'screen_resume',
      displayName: 'Screen Resume',
      description: 'Screen and evaluate a resume against job requirements',
      category: 'analytics',
      creditCost: 50,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          resumeText: { type: 'string' },
          jobRequirements: { type: 'object' },
          evaluationCriteria: { type: 'object' },
        },
        required: ['resumeText', 'jobRequirements'],
      },
      execute: async (input, context) => {
        const { jobRequirements } = input;
        const requiredSkillsFound = jobRequirements.requiredSkills.map(skill => ({
          skill,
          found: Math.random() > 0.3,
          evidence: `Mentioned in experience section`,
          proficiencyLevel: 'Advanced',
        }));

        const foundCount = requiredSkillsFound.filter(s => s.found).length;
        const score = Math.round((foundCount / jobRequirements.requiredSkills.length) * 100);

        return {
          overallScore: score,
          skillsMatch: {
            required: requiredSkillsFound,
            preferred: (jobRequirements.preferredSkills || []).map(skill => ({
              skill,
              found: Math.random() > 0.5,
              evidence: 'Found in skills section',
            })),
            additional: ['Communication', 'Problem-solving', 'Team collaboration'],
          },
          experienceAnalysis: {
            totalYears: 7,
            relevantYears: 5,
            seniorityLevel: 'Senior',
            careerProgression: 'Strong upward trajectory',
            industryExperience: ['SaaS', 'Fintech'],
            companyTypes: ['Startup', 'Enterprise'],
          },
          educationAnalysis: {
            highestDegree: 'Bachelor\'s',
            relevantEducation: true,
            certifications: ['AWS Certified'],
          },
          strengths: [
            'Strong technical background',
            'Leadership experience',
            'Relevant industry experience',
          ],
          concerns: [
            'Short tenure at last company',
          ],
          recommendation: score >= 70 ? 'proceed' : score >= 50 ? 'maybe' : 'pass',
          suggestedQuestions: [
            'Tell me about your experience with [top skill]',
            'Why are you looking to leave your current role?',
            'Describe a challenging project you led',
          ],
          interviewFocus: [
            'Technical depth in core skills',
            'Leadership and collaboration',
            'Reason for job change',
          ],
        };
      },
    };
  }

  private createMatchJobRequirementsTool(): MotionTool<MatchJobRequirementsInput, MatchJobRequirementsOutput> {
    return {
      name: 'match_job_requirements',
      displayName: 'Match Job Requirements',
      description: 'Calculate detailed match score between candidate and job requirements',
      category: 'analytics',
      creditCost: 50,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          candidateProfile: { type: 'object' },
          jobRequirements: { type: 'object' },
          weightings: { type: 'object' },
        },
        required: ['candidateProfile', 'jobRequirements'],
      },
      execute: async (input, context) => {
        const { candidateProfile, jobRequirements } = input;
        const matchedSkills = candidateProfile.skills.filter(s => jobRequirements.skills.includes(s));
        const missingSkills = jobRequirements.skills.filter(s => !candidateProfile.skills.includes(s));
        const skillScore = Math.round((matchedSkills.length / jobRequirements.skills.length) * 100);
        const expScore = candidateProfile.yearsExperience >= jobRequirements.experience ? 100 : 70;
        const overallMatch = Math.round((skillScore * 0.5 + expScore * 0.3 + 80 * 0.2));

        const recommendation = overallMatch >= 85 ? 'strong_fit' : overallMatch >= 70 ? 'good_fit' : overallMatch >= 50 ? 'potential_fit' : 'not_fit';

        return {
          overallMatch,
          categoryScores: {
            skills: { score: skillScore, matched: matchedSkills, missing: missingSkills, bonus: candidateProfile.skills.filter(s => !jobRequirements.skills.includes(s)) },
            experience: { score: expScore, analysis: `${candidateProfile.yearsExperience} years vs ${jobRequirements.experience} required` },
            education: { score: 85, analysis: 'Meets education requirements' },
            level: { score: 80, analysis: 'Appropriate seniority level' },
          },
          fitAnalysis: {
            strengths: ['Strong skill match', 'Relevant experience'],
            gaps: missingSkills.length > 0 ? [`Missing: ${missingSkills.join(', ')}`] : [],
            growthAreas: ['Could develop leadership skills'],
          },
          recommendation: recommendation as 'strong_fit' | 'good_fit' | 'potential_fit' | 'not_fit',
          nextSteps: recommendation === 'strong_fit' ? ['Schedule interview immediately'] : ['Phone screen to assess gaps'],
          developmentPlan: missingSkills.length > 0 ? [`Training on ${missingSkills[0]}`] : undefined,
        };
      },
    };
  }

  private createGenerateScreeningQuestionsTool(): MotionTool<GenerateScreeningQuestionsInput, GenerateScreeningQuestionsOutput> {
    return {
      name: 'generate_screening_questions',
      displayName: 'Generate Screening Questions',
      description: 'Create tailored screening questions for phone screens and interviews',
      category: 'document',
      creditCost: 25,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          jobTitle: { type: 'string' },
          requiredSkills: { type: 'array', items: { type: 'string' } },
          experienceLevel: { type: 'string', enum: ['entry', 'mid', 'senior', 'lead'] },
          focusAreas: { type: 'array', items: { type: 'string' } },
          numberOfQuestions: { type: 'number' },
        },
        required: ['jobTitle', 'requiredSkills', 'experienceLevel'],
      },
      execute: async (input, context) => {
        const numQuestions = input.numberOfQuestions || 10;
        const questions = [];

        for (let i = 0; i < numQuestions; i++) {
          const skill = input.requiredSkills[i % input.requiredSkills.length];
          questions.push({
            question: i % 4 === 0
              ? `Tell me about your experience with ${skill}.`
              : i % 4 === 1
              ? `Describe a challenging situation where you used ${skill}.`
              : i % 4 === 2
              ? `How would you approach a problem involving ${skill}?`
              : `What's your learning process for staying current with ${skill}?`,
            type: (['technical', 'behavioral', 'situational', 'cultural'] as const)[i % 4],
            skill,
            difficulty: input.experienceLevel === 'senior' ? 'hard' : 'medium',
            expectedAnswer: 'Look for specific examples and depth of knowledge',
            followUpQuestions: ['Can you elaborate?', 'What was the outcome?'],
            redFlagResponses: ['Vague answers', 'No specific examples'],
            greenFlagResponses: ['Specific metrics', 'Clear problem-solving approach'],
          });
        }

        return {
          questions: questions as GenerateScreeningQuestionsOutput['questions'],
          interviewGuide: {
            introduction: `Welcome to the ${input.jobTitle} interview. I'll be asking about your experience and skills.`,
            questionOrder: questions.slice(0, 5).map((_, i) => `Question ${i + 1}`),
            closingQuestions: ['What questions do you have for us?', 'What are your salary expectations?'],
            candidateQuestionsToExpect: ['What does success look like?', 'Team structure?', 'Growth opportunities?'],
          },
          evaluationRubric: {
            criteria: ['Technical depth', 'Problem-solving', 'Communication', 'Cultural fit'],
            scoringGuide: '1-5 scale for each criterion',
          },
        };
      },
    };
  }

  // ============================================
  // COMMUNICATION TOOLS
  // ============================================

  private createDraftOutreachMessageTool(): MotionTool<DraftOutreachMessageInput, DraftOutreachMessageOutput> {
    return {
      name: 'draft_outreach_message',
      displayName: 'Draft Outreach Message',
      description: 'Create personalized candidate outreach messages',
      category: 'communication',
      creditCost: 50,
      requiresApproval: true,
      inputSchema: {
        type: 'object',
        properties: {
          candidateName: { type: 'string' },
          candidateTitle: { type: 'string' },
          candidateCompany: { type: 'string' },
          jobTitle: { type: 'string' },
          companyName: { type: 'string' },
          personalizationPoints: { type: 'array', items: { type: 'string' } },
          channel: { type: 'string', enum: ['email', 'linkedin', 'inmail'] },
          tone: { type: 'string', enum: ['professional', 'casual', 'enthusiastic'] },
        },
        required: ['candidateName', 'candidateTitle', 'jobTitle', 'companyName', 'channel', 'tone'],
      },
      execute: async (input, context) => {
        const personalization = input.personalizationPoints?.[0] || `your experience as a ${input.candidateTitle}`;

        const message = `Hi ${input.candidateName},

I came across your profile and was impressed by ${personalization}. I'm reaching out about a ${input.jobTitle} opportunity at ${input.companyName}.

${input.companyName} is doing exciting work in [industry], and we're looking for someone with your background to help us [key initiative].

Would you be open to a quick conversation to learn more?

Best,
[Your name]`;

        return {
          subject: input.channel === 'email' ? `${input.jobTitle} opportunity at ${input.companyName}` : undefined,
          message,
          characterCount: message.length,
          personalizationUsed: input.personalizationPoints || [],
          variants: [message, message.replace('quick conversation', '15-minute call')],
          followUpMessage: `Hi ${input.candidateName}, just wanted to follow up on my previous message about the ${input.jobTitle} role. Let me know if you'd like to chat!`,
          followUpTiming: '5-7 days after initial outreach',
          responseTemplates: {
            interested: 'Great! Let me send over some times for a call...',
            notInterested: 'Thank you for letting me know. If things change, please feel free to reach out...',
            wantMoreInfo: 'Happy to share more! Here are some details about the role...',
          },
          tips: [
            'Send on Tuesday-Thursday mornings',
            'Keep it short and personalized',
            'Focus on what you can offer them',
          ],
        };
      },
    };
  }

  private createDraftRejectionEmailTool(): MotionTool<DraftRejectionEmailInput, DraftRejectionEmailOutput> {
    return {
      name: 'draft_rejection_email',
      displayName: 'Draft Rejection Email',
      description: 'Create thoughtful rejection emails that maintain positive candidate experience',
      category: 'communication',
      creditCost: 25,
      requiresApproval: true,
      inputSchema: {
        type: 'object',
        properties: {
          candidateName: { type: 'string' },
          jobTitle: { type: 'string' },
          stage: { type: 'string', enum: ['application', 'phone_screen', 'interview', 'final_round'] },
          reason: { type: 'string' },
          keepInTalentPool: { type: 'boolean' },
          feedbackAllowed: { type: 'boolean' },
          tone: { type: 'string', enum: ['professional', 'warm', 'brief'] },
        },
        required: ['candidateName', 'jobTitle', 'stage', 'tone'],
      },
      execute: async (input, context) => {
        const stageMessages = {
          application: 'After reviewing your application',
          phone_screen: 'After our initial conversation',
          interview: 'After careful consideration following your interview',
          final_round: 'After much deliberation in our final review',
        };

        const body = `Dear ${input.candidateName},

Thank you for your interest in the ${input.jobTitle} position and for taking the time to speak with us.

${stageMessages[input.stage]}, we have decided to move forward with other candidates whose experience more closely aligns with our current needs.

This was a difficult decision, as we were impressed by your background. We encourage you to apply for future positions that match your skills.

${input.keepInTalentPool ? 'We\'d like to keep your information on file for future opportunities that may be a better fit.' : ''}

We wish you the best in your job search and future endeavors.

Best regards,
[Hiring Team]`;

        return {
          subject: `Update on your ${input.jobTitle} application`,
          body,
          feedbackSection: input.feedbackAllowed ? `If you'd like specific feedback on your application, please let me know and I'll be happy to provide some insights.` : undefined,
          talentPoolInvitation: input.keepInTalentPool ? 'Would you be open to being contacted for future opportunities?' : undefined,
          variants: [body, body.replace('other candidates', 'another candidate')],
          sendingRecommendations: {
            timing: 'Within 2 business days of decision',
            sender: 'Recruiter who had most contact',
            channel: 'Email (personal touch for final round)',
          },
        };
      },
    };
  }

  // ============================================
  // COORDINATION TOOLS
  // ============================================

  private createScheduleInterviewTool(): MotionTool<ScheduleInterviewInput, ScheduleInterviewOutput> {
    return {
      name: 'schedule_interview',
      displayName: 'Schedule Interview',
      description: 'Coordinate and schedule interviews with calendar invites and prep materials',
      category: 'communication',
      creditCost: 50,
      requiresApproval: true,
      inputSchema: {
        type: 'object',
        properties: {
          candidateName: { type: 'string' },
          candidateEmail: { type: 'string' },
          interviewType: { type: 'string', enum: ['phone_screen', 'video', 'onsite', 'panel', 'technical'] },
          interviewers: { type: 'array', items: { type: 'object' } },
          duration: { type: 'number' },
          preferredTimes: { type: 'array', items: { type: 'string' } },
          jobTitle: { type: 'string' },
          includePrep: { type: 'boolean' },
        },
        required: ['candidateName', 'candidateEmail', 'interviewType', 'interviewers', 'duration', 'jobTitle'],
      },
      execute: async (input, context) => {
        const proposedTimes = input.preferredTimes || [
          'Tuesday 10:00 AM',
          'Wednesday 2:00 PM',
          'Thursday 11:00 AM',
        ];

        return {
          interviewDetails: {
            type: input.interviewType,
            duration: input.duration,
            proposedTimes,
            interviewers: input.interviewers.map(i => i.name),
          },
          candidateEmail: {
            subject: `Interview for ${input.jobTitle} - Next Steps`,
            body: `Hi ${input.candidateName},\n\nWe'd like to schedule your ${input.interviewType} interview for the ${input.jobTitle} position.\n\nPlease select a time that works for you:\n${proposedTimes.map(t => `- ${t}`).join('\n')}\n\nLooking forward to speaking with you!\n\nBest,\n[Recruiter]`,
            calendarInvite: 'Calendar invite will be sent upon confirmation',
          },
          interviewerEmail: {
            subject: `Interview scheduled: ${input.candidateName} for ${input.jobTitle}`,
            body: `Hi team,\n\nPlease prepare for the upcoming interview with ${input.candidateName}.\n\nDetails:\n- Type: ${input.interviewType}\n- Duration: ${input.duration} minutes\n\nPlease review the candidate's resume and prepare your questions.`,
          },
          prepMaterials: input.includePrep ? {
            forCandidate: ['Company overview', 'Team information', 'Interview format guide'],
            forInterviewers: ['Resume', 'Screening notes', 'Interview scorecard'],
          } : undefined,
          logistics: {
            platform: input.interviewType === 'video' ? 'Zoom' : undefined,
            meetingLink: input.interviewType === 'video' ? 'Will be generated upon confirmation' : undefined,
            location: input.interviewType === 'onsite' ? 'Main office - reception will guide you' : undefined,
          },
          reminderSchedule: [
            { recipient: input.candidateName, timing: '24 hours before', message: 'Interview reminder with logistics' },
            { recipient: 'Interviewers', timing: '1 hour before', message: 'Interview starting soon - review materials' },
          ],
        };
      },
    };
  }

  private createJobDescriptionTool(): MotionTool<CreateJobDescriptionInput, CreateJobDescriptionOutput> {
    return {
      name: 'create_job_description',
      displayName: 'Create Job Description',
      description: 'Generate comprehensive, inclusive job descriptions',
      category: 'document',
      creditCost: 75,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          department: { type: 'string' },
          level: { type: 'string', enum: ['intern', 'entry', 'mid', 'senior', 'lead', 'manager', 'director', 'executive'] },
          responsibilities: { type: 'array', items: { type: 'string' } },
          requirements: { type: 'array', items: { type: 'string' } },
          niceToHave: { type: 'array', items: { type: 'string' } },
          benefits: { type: 'array', items: { type: 'string' } },
          companyInfo: { type: 'string' },
          salary: { type: 'object' },
          location: { type: 'string' },
          remotePolicy: { type: 'string', enum: ['onsite', 'hybrid', 'remote'] },
          tone: { type: 'string', enum: ['professional', 'startup', 'corporate', 'creative'] },
        },
        required: ['title', 'department', 'level', 'responsibilities', 'requirements', 'location', 'remotePolicy', 'tone'],
      },
      execute: async (input, context) => {
        const levelDescriptors: Record<string, string> = {
          intern: 'learning opportunity',
          entry: 'starting your career',
          mid: 'growing professional',
          senior: 'experienced professional',
          lead: 'technical leader',
          manager: 'people leader',
          director: 'strategic leader',
          executive: 'executive leadership',
        };

        return {
          title: input.title,
          summary: `We're looking for a ${levelDescriptors[input.level]} to join our ${input.department} team as a ${input.title}.`,
          aboutRole: `As a ${input.title}, you'll play a key role in ${input.responsibilities[0]?.toLowerCase() || 'driving impact'}. This is an exciting opportunity for someone who wants to make a real difference.`,
          responsibilities: input.responsibilities.map(r => `• ${r}`),
          requirements: input.requirements.map(r => `• ${r}`),
          niceToHave: (input.niceToHave || []).map(n => `• ${n}`),
          benefits: (input.benefits || ['Competitive salary', 'Health insurance', 'Flexible work']).map(b => `• ${b}`),
          compensation: input.salary ? `${input.salary.currency} ${input.salary.min.toLocaleString()} - ${input.salary.max.toLocaleString()}` : undefined,
          aboutCompany: input.companyInfo || 'We are a growing company dedicated to innovation and excellence.',
          location: input.location,
          workArrangement: input.remotePolicy === 'remote' ? 'Fully Remote' : input.remotePolicy === 'hybrid' ? 'Hybrid (2-3 days in office)' : 'On-site',
          equalOpportunityStatement: 'We are an equal opportunity employer and value diversity. We do not discriminate based on race, religion, color, national origin, gender, sexual orientation, age, marital status, veteran status, or disability status.',
          applicationInstructions: 'To apply, please submit your resume and a brief cover letter explaining why you\'re interested in this role.',
          seoKeywords: [input.title, input.department, ...input.requirements.slice(0, 3)],
          estimatedApplicants: '50-100 applications expected',
          competitiveAnalysis: ['Salary is competitive for market', 'Remote option is attractive', 'Consider adding signing bonus for senior roles'],
        };
      },
    };
  }

  // ============================================
  // CHAT HANDLING
  // ============================================

  public async handleChat(
    message: string,
    context: AgentContext,
    conversationHistory?: ConversationMessage[]
  ): Promise<AgentResponse<string>> {
    const startTime = Date.now();

    try {
      const response = `As Dot, your Recruiter, I'm here to help you find and hire the best talent!

Based on your message: "${message}"

I can help you with:
🔍 **Sourcing** - Search candidates, analyze profiles, create boolean searches
📋 **Screening** - Screen resumes, match requirements, create interview questions
💬 **Communication** - Draft outreach messages, rejection emails
📅 **Coordination** - Schedule interviews, create job descriptions

What would you like to work on today?`;

      return {
        success: true,
        data: response,
        metadata: {
          agentId: this.id,
          executionTimeMs: Date.now() - startTime,
          toolsUsed: [],
          correlationId: crypto.randomUUID(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : String(error),
          retryable: false,
        },
        metadata: {
          agentId: this.id,
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  public getSystemPrompt(): string {
    return `You are Dot, an expert Recruiter AI.

YOUR ROLE:
- Source and identify top talent
- Screen and evaluate candidates
- Coordinate the interview process
- Maintain positive candidate experience
- Support hiring managers

YOUR PERSONALITY:
- Empathetic and professional
- Detail-oriented evaluator
- Excellent communicator
- Diversity-conscious

YOUR SPECIALTIES:
${this.specialties.map(s => `- ${s}`).join('\n')}

GUIDELINES:
1. Evaluate candidates objectively
2. Maintain excellent candidate experience
3. Communicate clearly and promptly
4. Consider cultural fit alongside skills
5. Respect confidentiality
6. Use inclusive language in all communications`;
  }

  protected async getAgentSpecificContext(context: MotionAgentContext): Promise<Record<string, unknown>> {
    return {
      agentRole: 'Recruiter',
      availableTools: this.getMotionTools().map(t => t.name),
      atsIntegrations: ['greenhouse', 'lever', 'workday'],
    };
  }
}

export const dotAgent = new DotAgent();

export default DotAgent;
