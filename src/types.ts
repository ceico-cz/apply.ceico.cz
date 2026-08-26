export type User = {
  id: number
  email: string
  first_name: string
  last_name: string
  is_system_admin: boolean
  organizer_approved: boolean
  campaign_operator: boolean
  can_edit_profile: boolean
}

export type ResearchField = { id: number; name: string }

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
  status: 'draft' | 'submitted' | 'awaiting_references' | 'review_ready' | 'override_ready' | 'withdrawn'
  profile: Record<string, string>
  career: Array<Record<string, string>>
  responses: Record<string, string | string[] | boolean>
  primary_field_id: number | null
  primary_field_label: string
  secondary_fields: Array<{ id: number; label: string }>
  other_research: string
  consent_at: string | null
  applicant: { id: number; email: string; first_name: string; last_name: string }
  referees: Array<{ id: number; first_name: string; last_name: string; email: string; phone: string; status: string }>
  documents: Array<{ id: number; kind: string; original_name: string; size: number }>
  campaign?: Campaign
}
