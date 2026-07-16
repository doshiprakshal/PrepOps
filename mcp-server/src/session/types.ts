export type Mode =
  | 'concept'
  | 'incident'
  | 'debugging'
  | 'coding'
  | 'mock'
  | 'whiteboard'
  | 'system_design'
  | 'rapid_fire'
  | 'mixed';

export type Difficulty = 'Junior' | 'Mid' | 'Senior' | 'Staff' | 'Principal' | 'Intermediate';

export type PersonaId =
  | 'google_sre'
  | 'amazon_devops'
  | 'netflix_sre'
  | 'stripe_engineering'
  | 'startup_devops'
  | 'staff_engineer'
  | 'principal_engineer'
  | 'friendly_mentor'
  | 'strict_bar_raiser';

export type ConceptSubMode = 'learn' | 'flashcard' | 'mcq';

export interface SessionConfig {
  // shared
  mode:       Mode;
  difficulty: Difficulty;
  persona:    PersonaId;

  // concept
  topic?:          string;
  concept_mode?:   ConceptSubMode;

  // incident
  incident_id?:    string;
  incident_domain?:string;
  custom_incident?:string;

  // debugging
  lab_type?:       string;
  lab_topic?:      string;

  // coding
  coding_source?:  'auto' | 'custom';
  coding_problem?: string;
  coding_company?: string;

  // mock / whiteboard / system_design / rapid_fire / mixed
  role?:           string;
  company?:        string;
  focus_areas?:    string[];
  interview_length?: 'short' | 'standard' | 'full';
  jd_context?:     string;
  wb_topic?:       string;
  sd_system?:      string;
  sd_scale?:       string;
  sd_constraints?: string;
  rf_count?:       number;
  session_length?: 'quick' | 'standard' | 'full';

  // JD blueprint (populated by build_runtime_blueprint)
  blueprint?: string;
}

export interface SessionState {
  config:      SessionConfig;
  phase:       number;
  turn_count:  number;
  started_at:  number;

  // hidden state only the server should track
  hidden?: {
    // incident: clues not yet revealed, red herrings seeded
    incident_phase?:     'opening' | 'investigation' | 'resolution' | 'debrief';
    clues_revealed?:     number;
    working_hypothesis?: string | null;
    known_signals?:      string[];
    // coding: problem statement hidden until reveal
    coding_revealed?:    boolean;
    // rapid fire: questions asked so far
    rf_questions_asked?: number;
  };
}
