import { User, UserProfile, Lesson, Coach, Branch, Reservation, Membership } from '@prisma/client'

export type UserWithProfile = User & {
  profile: UserProfile | null
}

export type LessonWithRelations = Lesson & {
  coach: Coach
  branch: Branch
}

export type ReservationWithRelations = Reservation & {
  lesson: LessonWithRelations
  user: UserWithProfile
  coach: Coach
  branch: Branch
}

export type MembershipWithRelations = Membership & {
  coach: Coach
}

export type TimeRange = {
  start: string
  end: string
}

export type AvailabilityResponse = {
  date: string
  slotStepMinutes: number
  availableRanges: TimeRange[]
}

export type ApiError = {
  error: {
    code: string
    message: string
  }
}