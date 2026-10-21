export type ThanksTag = 'thanks' | 'helpful' | 'clear'

/** Server-calculated reputation; never submitted with an editable profile. */
export interface ContributionScore {
  user_id: string
  score: number
  posts_points: number
  answers_points: number
  resources_points: number
  thanks_points: number
  solutions_points: number
  thanks_received: number
  solutions_count: number
}
