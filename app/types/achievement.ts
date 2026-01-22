export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: string | null
  progress?: number
  maxProgress?: number
}
