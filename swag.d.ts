export interface Job {
  queue: string
  id: string
  run_at: Date
  data: any
  expression: string
  locked_until: Date
  locked_by: string
  attempts: number
}

export type TimeInterval = 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'

export type Interval = `${number} ${TimeInterval}`
