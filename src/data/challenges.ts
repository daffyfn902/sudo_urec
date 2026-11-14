import type { Challenge } from './types'

/**
 * Beginner-friendly discovery challenges.
 * zoneIds match GYM_ZONES — no real class schedules or equipment guarantees.
 */
export const CHALLENGES: Challenge[] = [
  {
    id: 'machine-circuit-intro',
    title: 'Machine Circuit Intro',
    description:
      'Walk the upstairs strength floor and try three simple machines at a light weight. No rush — explore at your pace.',
    category: 'strength',
    difficulty: 'easy',
    durationMinutes: 20,
    zoneId: 'upstairs-strength',
    steps: [
      'Find the upstairs strength area and pick any open machine that feels approachable.',
      'Set a light weight and do 8–10 smooth reps, focusing on control.',
      'Move to two more machines and repeat — stop anytime something feels off.',
    ],
    beginnerFriendly: true,
  },
  {
    id: 'dumbbell-floor-walk',
    title: 'Dumbbell Floor Walkthrough',
    description:
      'Get comfortable in free weights by learning the layout first. Familiarity makes the room feel smaller.',
    category: 'strength',
    difficulty: 'easy',
    durationMinutes: 15,
    zoneId: 'free-weights',
    steps: [
      'Enter free weights and take one slow lap to notice benches, racks, and open floor.',
      'Pick a pair of light dumbbells and try a simple movement you already know.',
      'Put equipment back and note one area you might try next visit.',
    ],
    beginnerFriendly: true,
  },
  {
    id: 'goblet-squat-starter',
    title: 'Goblet Squat Starter',
    description:
      'A friendly first free-weight pattern: hold one dumbbell at your chest and squat with control.',
    category: 'strength',
    difficulty: 'moderate',
    durationMinutes: 25,
    zoneId: 'free-weights',
    steps: [
      'Warm up with 1–2 minutes of easy marching or arm circles nearby.',
      'Hold one light-to-moderate dumbbell at chest height and squat for 3 sets of 8.',
      'Rest as needed between sets; finish with a short stretch.',
    ],
    beginnerFriendly: true,
  },
  {
    id: 'turf-flow-basics',
    title: 'Turf Flow Basics',
    description:
      'Sample the functional training turf with bodyweight moves — no heavy lifts required.',
    category: 'strength',
    difficulty: 'moderate',
    durationMinutes: 20,
    zoneId: 'functional-training',
    steps: [
      'Claim a quiet strip of turf and set a 15–20 minute timer.',
      'Alternate 40 seconds of bodyweight squats, push-ups (or incline), and marching.',
      'Cool down with easy walking on the turf for 2 minutes.',
    ],
    beginnerFriendly: true,
  },
  {
    id: 'rack-confidence-check',
    title: 'Rack Confidence Check',
    description:
      'Stand near a squat rack, learn the space, and practice a bodyweight pattern before loading anything.',
    category: 'strength',
    difficulty: 'stretch',
    durationMinutes: 30,
    zoneId: 'functional-training',
    steps: [
      'Locate an open rack area and watch one set so the flow feels familiar.',
      'Practice bodyweight squats or a light empty-bar feel only if you are comfortable.',
      'Leave when you feel more at ease — progress can be just showing up.',
    ],
    beginnerFriendly: false,
  },
  {
    id: 'treadmill-settle-in',
    title: 'Treadmill Settle-In',
    description:
      'An easy cardio entry: short walk intervals so the cardio deck feels welcoming, not overwhelming.',
    category: 'cardio',
    difficulty: 'easy',
    durationMinutes: 15,
    zoneId: 'cardio',
    steps: [
      'Choose any open treadmill and start at a comfortable walking pace.',
      'Walk 3 minutes easy, then 1 minute slightly brisk — repeat twice.',
      'Slow to a cool-down walk for 2 minutes before stepping off carefully.',
    ],
    beginnerFriendly: true,
  },
  {
    id: 'bike-and-breathe',
    title: 'Bike & Breathe',
    description:
      'Low-impact cycling with a focus on steady breathing — great when the floor feels busy elsewhere.',
    category: 'cardio',
    difficulty: 'easy',
    durationMinutes: 20,
    zoneId: 'cardio',
    steps: [
      'Hop on a bike and set resistance low enough to chat comfortably.',
      'Ride at a steady pace for 12–15 minutes while keeping relaxed shoulders.',
      'Finish with 2 minutes very easy pedaling, then stretch calves if you like.',
    ],
    beginnerFriendly: true,
  },
  {
    id: 'track-lap-tour',
    title: 'Track Lap Tour',
    description:
      'Learn the indoor track direction and distance with a gentle walking set of laps.',
    category: 'cardio',
    difficulty: 'easy',
    durationMinutes: 20,
    zoneId: 'indoor-track',
    steps: [
      'Note the posted direction and start walking at an easy conversational pace.',
      'Complete 4–6 laps (or about 12–15 minutes), pausing if you need space to pass.',
      'Cool down with one slower lap and a short calf stretch by the rail.',
    ],
    beginnerFriendly: true,
  },
  {
    id: 'interval-walk-jog',
    title: 'Walk–Jog Intervals',
    description:
      'Dip a toe into jogging without committing to a long run — short bursts, lots of walking.',
    category: 'cardio',
    difficulty: 'moderate',
    durationMinutes: 25,
    zoneId: 'indoor-track',
    steps: [
      'Warm up with 3 easy walking laps.',
      'Alternate 1 lap light jog with 1 lap walk for 4–6 rounds — walk more if needed.',
      'End with 2 easy walking laps and check how your joints feel.',
    ],
    beginnerFriendly: true,
  },
  {
    id: 'cardio-mix-sampler',
    title: 'Cardio Mix Sampler',
    description:
      'Try two different cardio machines back-to-back so you leave knowing what you prefer.',
    category: 'cardio',
    difficulty: 'stretch',
    durationMinutes: 30,
    zoneId: 'cardio',
    steps: [
      'Spend 10 minutes on a treadmill or elliptical at an easy effort.',
      'Switch to a bike or rower for another 10 minutes at a similar feel.',
      'Note which machine felt better — that becomes your go-to next time.',
    ],
    beginnerFriendly: false,
  },
  {
    id: 'half-court-shootaround',
    title: 'Half-Court Shootaround',
    description:
      'Casual basketball time with no game pressure — just you, a ball, and the rim.',
    category: 'sports',
    difficulty: 'easy',
    durationMinutes: 20,
    zoneId: 'basketball-courts',
    steps: [
      'Grab a ball and find open space on a half-court or side hoop.',
      'Take easy shots from close range for 10–15 minutes; no scorekeeping needed.',
      'Finish with a few free throws and return the ball.',
    ],
    beginnerFriendly: true,
  },
  {
    id: 'solo-layup-lines',
    title: 'Solo Layup Lines',
    description:
      'Practice simple layups at your own speed — a classic way to feel at home on the court.',
    category: 'sports',
    difficulty: 'moderate',
    durationMinutes: 25,
    zoneId: 'basketball-courts',
    steps: [
      'Warm up with light shooting near the basket for a few minutes.',
      'Alternate left- and right-side layups for 10–12 minutes at a comfortable pace.',
      'Cool down with free throws or standing stretch before you leave.',
    ],
    beginnerFriendly: true,
  },
  {
    id: 'pickup-observer',
    title: 'Pickup Observer → Joiner',
    description:
      'Watch a short stretch of open play, then join only if it feels right — showing up counts.',
    category: 'sports',
    difficulty: 'stretch',
    durationMinutes: 35,
    zoneId: 'basketball-courts',
    steps: [
      'Sit or stand courtside and watch a few possessions to learn the vibe.',
      'If a spot opens and you feel ready, ask to rotate in — or keep shooting nearby.',
      'Leave when you have learned something new, whether or not you played full games.',
    ],
    beginnerFriendly: false,
  },
]

export const CHALLENGE_BY_ID = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, c]),
) as Record<string, Challenge>

/** Maps app zone IDs to the standalone 3D scene zone IDs in public/urec-3d.html */
export const ZONE_TO_MAP_FOCUS: Record<
  string,
  { mapZoneId: string; floor: number; label: string }
> = {
  'free-weights': { mapZoneId: 'L2_fitness', floor: 2, label: 'Fitness Center' },
  cardio: { mapZoneId: 'L3_cardio_deck', floor: 3, label: 'Cardio Deck' },
  'basketball-courts': { mapZoneId: 'L2_mac2', floor: 2, label: 'MAC 2' },
  'upstairs-strength': { mapZoneId: 'L2_fitness', floor: 2, label: 'Fitness Center' },
  'indoor-track': { mapZoneId: 'L4_track', floor: 4, label: 'Running Track' },
  'functional-training': { mapZoneId: 'L4_stretch', floor: 4, label: 'Stretching Area' },
}
