type ValueOf<T> = T[keyof T]

export const ApplicationStatus = {
  draft: 'draft',
  submitted: 'submitted',
  awaitingReferences: 'awaiting_references',
  reviewReady: 'review_ready',
  overrideReady: 'override_ready',
  withdrawn: 'withdrawn',
} as const
export type ApplicationStatus = ValueOf<typeof ApplicationStatus>

export const AssignmentStatus = {
  assigned: 'assigned',
  conflict: 'conflict',
  submitted: 'submitted',
} as const
export type AssignmentStatus = ValueOf<typeof AssignmentStatus>

export const RefereeRequestStatus = {
  invited: 'invited',
  submitted: 'submitted',
} as const
export type RefereeRequestStatus = ValueOf<typeof RefereeRequestStatus>

export const DecisionOutcome = {
  selected: 'selected',
  waitlisted: 'waitlisted',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
} as const
export type DecisionOutcome = ValueOf<typeof DecisionOutcome>

export const DocumentKind = {
  cv: 'cv',
  researchStatement: 'research_statement',
  additional: 'additional',
  referenceLetter: 'reference_letter',
} as const
export type DocumentKind = ValueOf<typeof DocumentKind>
export type ApplicantDocumentKind = Exclude<DocumentKind, typeof DocumentKind.referenceLetter>

export type StatusValue =
  | ApplicationStatus
  | AssignmentStatus
  | RefereeRequestStatus
  | DecisionOutcome

export type User = {
  id: number
  email: string
  first_name: string
  last_name: string
  primary_affiliation: string
  is_system_admin: boolean
  organizer_approved: boolean
  campaign_operator: boolean
  can_edit_profile: boolean
}

export type ResearchField = { id: number; name: string }

export type CampaignEvaluator = {
  id: number
  email: string
  first_name: string
  last_name: string
  assignments: Array<{
    id: number
    status: AssignmentStatus
    application_id: number
    applicant: { email: string; first_name: string; last_name: string }
  }>
}

export type RubricCriterion = {
  id: number
  title: string
  description: string
  minimum: number
  maximum: number
  weight: number
}

export type Campaign = {
  id: number
  title: string
  slug: string
  description: string
  description_url: string
  timezone: string
  opens_at: string
  application_deadline: string
  letter_deadline: string
  evaluation_deadline: string
  retention_at: string
  required_referees: number
  is_listed: boolean
  review_open: boolean
  active: boolean
  requirements: Record<string, boolean>
  questions: Array<{ id: string; label: string; type: string; required?: boolean; options?: string[] }>
  research_fields: ResearchField[]
  rubric: RubricCriterion[]
  can_manage_operators?: boolean
  can_record_decisions?: boolean
}

export type Application = {
  id: number
  campaign_id: number
  status: ApplicationStatus
  profile: Record<string, string>
  career: Array<Record<string, string>>
  responses: Record<string, string | string[] | boolean>
  primary_field_id: number | null
  primary_field_label: string
  secondary_fields: Array<{ id: number; label: string }>
  other_research: string
  consent_at: string | null
  applicant: { id: number; email: string; first_name: string; last_name: string }
  referees: Array<{ id: number; first_name: string; last_name: string; email: string; phone: string; status: RefereeRequestStatus }>
  documents: Array<{ id: number; kind: DocumentKind; original_name: string; size: number }>
  campaign?: Campaign
}
