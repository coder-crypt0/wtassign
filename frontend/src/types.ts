export type Status = "LIVE" | "UPCOMING" | "COMPLETED";
export type Outcome = "RUN" | "WICKET" | "WIDE" | "NO_BALL";
export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  players: { id: string; name: string; role: string }[];
}
export interface Match {
  id: string;
  home: Team;
  away: Team;
  status: Status;
  tournament: string;
  venue: string;
  startsAt: string;
  innings: number;
  battingTeamId: string;
  score: number;
  wickets: number;
  overs: string;
  balls: number;
  maxOvers: number;
  target: number | null;
  requiredRate: number | null;
  currentRate: number;
  firstInningsScore: number;
  firstInningsWickets: number;
  result: string;
  statusText: string;
  autoPlay: boolean;
  editable: boolean;
  revision: number;
}
export interface Batter {
  id: string;
  name: string;
  role: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  status: string;
}
export interface Bowler {
  id: string;
  name: string;
  overs: string;
  balls: number;
  runs: number;
  wickets: number;
  economy: number;
}
export interface Ball {
  id: string;
  sequence: number;
  innings: number;
  over: string;
  label: string;
  runs: number;
  outcome: Outcome;
  commentary: string;
  score: number;
  wickets: number;
}
export interface Innings {
  number: number;
  team: Team;
  bowlingTeam: Team;
  runs: number;
  wickets: number;
  balls: number;
  overs: string;
  runRate: number;
  extras: number;
  partnershipRuns: number;
  partnershipBalls: number;
  batters: Batter[];
  bowlers: Bowler[];
  oversData: {
    number: number;
    runs: number;
    wickets: number;
    cumulativeRuns: number;
  }[];
  fallOfWickets: {
    wicket: number;
    score: number;
    over: string;
    player: string;
  }[];
  commentary: Ball[];
}
export interface Detail {
  match: Match;
  innings: Innings[];
}
export interface PlayerStats {
  id: string;
  name: string;
  team: string;
  runs: number;
  balls: number;
  fours?: number;
  sixes?: number;
  strikeRate?: number;
  wickets?: number;
  economy?: number;
}
export interface Leaders {
  batters: PlayerStats[];
  bowlers: PlayerStats[];
}
