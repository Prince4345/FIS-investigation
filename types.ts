
export enum CaseStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
  COLD = 'Cold',
  ON_HOLD = 'On Hold'
}

export enum TimeConfidence {
  EXACT = 'exact',
  ESTIMATED = 'estimated',
  UNKNOWN = 'unknown'
}

export interface CrimeCase {
  id: string;
  title: string;
  summary: string;
  status: CaseStatus;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  evidenceCount?: number;
  witnessCount?: number;
}

export interface Evidence {
  id: string;
  name: string;
  type: string;
  description: string;
  storageUrl: string;
  uploadedAt: number;
}

export interface Witness {
  id: string;
  name: string;
  statement: string;
  reliabilityScore: number;
  recordedAt: number;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  time: string;
  timeConfidence: TimeConfidence;
}

export interface AIIntelligenceCorrelation {
  sourceType: 'evidence' | 'witness' | 'timeline';
  refId: string;
  label: string;
  snippet: string;
  isManual?: boolean;
}

export interface AIObservation {
  id: string;
  type: 'inconsistency' | 'delay' | 'pattern';
  observation: string;
  reasoning: string;
  correlations: AIIntelligenceCorrelation[];
  confidence: number;
  limitations: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
}


