export interface Referral {
  id: string
  name: string
  registeredAt: string
  bonus: number
}

export interface ReferralProgram {
  code: string
  totalInvited: number
  totalBonus: number
  referrals: Referral[]
}
