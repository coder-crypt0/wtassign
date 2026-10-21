package com.crease.service;

import com.crease.domain.*;
import java.util.*;

/** The delivery log is the source of truth. Replaying it also makes undo exact. */
public final class ScoreEngine {
    private ScoreEngine() {}
    public record Batter(String id, String name, String role, int runs, int balls, int fours, int sixes, double strikeRate, String status) {}
    public record Bowler(String id, String name, String overs, int balls, int runs, int wickets, double economy) {}
    public record Over(int number, int runs, int wickets, int cumulativeRuns) {}
    public record Fall(int wicket, int score, String over, String player) {}
    public record Ball(String id, int sequence, int innings, String over, String label, int runs, Outcome outcome, String commentary, int score, int wickets) {}
    public record Innings(int number, Team team, Team bowlingTeam, int runs, int wickets, int balls, String overs, double runRate, int extras,
                          int partnershipRuns, int partnershipBalls, List<Batter> batters, List<Bowler> bowlers,
                          List<Over> oversData, List<Fall> fallOfWickets, List<Ball> commentary) {}

    public static Innings calculate(int number, Team batting, Team bowling, List<DeliveryEntity> source) {
        int[][] bats = new int[11][4];
        int[][] bowls = new int[5][3];
        boolean[] dismissed = new boolean[11];
        int striker = 0, nonStriker = 1, next = 2, score = 0, wickets = 0, balls = 0, extras = 0, stand = 0, standBalls = 0;
        var overs = new TreeMap<Integer, int[]>();
        var falls = new ArrayList<Fall>();
        var commentary = new ArrayList<Ball>();
        for (var d : source) {
            if (d.innings != number) continue;
            if (wickets == 10 || balls == 120) break;
            int overNumber = balls / 6 + 1, bowler = (balls / 6) % 5;
            boolean legal = d.outcome == Outcome.RUN || d.outcome == Outcome.WICKET;
            int total = d.runs + (legal ? 0 : 1);
            String name = batting.players().get(striker).name();
            String bowlerName = bowling.players().get(6 + bowler).name();
            score += total; stand += total;
            bowls[bowler][1] += total;
            int[] over = overs.computeIfAbsent(overNumber, ignored -> new int[2]);
            over[0] += total;
            if (legal) { balls++; standBalls++; bats[striker][1]++; bowls[bowler][0]++; }
            if (d.outcome == Outcome.WIDE) extras += total;
            else {
                if (d.outcome == Outcome.NO_BALL) extras++;
                bats[striker][0] += d.runs;
                if (d.runs == 4) bats[striker][2]++;
                if (d.runs == 6) bats[striker][3]++;
            }
            String label = switch (d.outcome) { case WICKET -> "W"; case WIDE -> d.runs == 0 ? "Wd" : (d.runs + 1) + "wd"; case NO_BALL -> d.runs == 0 ? "Nb" : d.runs + "+nb"; case RUN -> String.valueOf(d.runs); };
            String text = switch (d.outcome) {
                case WICKET -> "OUT! " + bowlerName + " breaks through. " + name + " departs for " + bats[striker][0] + ".";
                case WIDE -> "Down the leg side from " + bowlerName + ". " + total + (total == 1 ? " extra." : " extras.");
                case NO_BALL -> "No ball from " + bowlerName + ". " + (d.runs == 0 ? "One added to the total." : name + " adds " + d.runs + " off the bat.");
                case RUN -> switch (d.runs) {
                    case 0 -> "A tight line from " + bowlerName + ". " + name + " can't find the gap.";
                    case 4 -> "FOUR! " + name + " finds the gap. Beautiful timing, straight to the rope.";
                    case 6 -> "SIX! " + name + " goes big. That one is sailing into the stands!";
                    default -> name + " works it into space for " + d.runs + (d.runs == 1 ? " run." : " runs.");
                };
            };
            String ballOver = legal ? overs(balls - 1) : overs(balls);
            // Delivery notation is 0.1–0.6, while a completed over in the score is 1.0.
            ballOver = legal ? ((balls - 1) / 6) + "." + ((balls - 1) % 6 + 1) : ballOver + " +";
            if (d.outcome == Outcome.WICKET) {
                dismissed[striker] = true; wickets++; bowls[bowler][2]++; over[1]++;
                falls.add(new Fall(wickets, score, overs(balls), name));
                if (next < 11) striker = next++;
                stand = 0; standBalls = 0;
            } else if (d.runs % 2 == 1) { int temp = striker; striker = nonStriker; nonStriker = temp; }
            if (legal && balls % 6 == 0) { int temp = striker; striker = nonStriker; nonStriker = temp; }
            commentary.add(new Ball(d.id, d.sequenceNumber, number, ballOver, label, total, d.outcome, text, score, wickets));
        }
        var batters = new ArrayList<Batter>();
        for (int i = 0; i < 11; i++) {
            var p = batting.players().get(i);
            String state = dismissed[i] ? "out" : i == striker && wickets < 10 && balls < 120 ? "striker" : i == nonStriker && wickets < 10 && balls < 120 ? "non-striker" : i < next ? "not out" : "yet to bat";
            batters.add(new Batter(p.id(), p.name(), p.role(), bats[i][0], bats[i][1], bats[i][2], bats[i][3], rate(bats[i][0], bats[i][1], 100), state));
        }
        var bowlers = new ArrayList<Bowler>();
        for (int i = 0; i < 5; i++) {
            var p = bowling.players().get(6 + i);
            if (bowls[i][0] > 0 || bowls[i][1] > 0) bowlers.add(new Bowler(p.id(), p.name(), overs(bowls[i][0]), bowls[i][0], bowls[i][1], bowls[i][2], rate(bowls[i][1], bowls[i][0], 6)));
        }
        int cumulative = 0;
        var chart = new ArrayList<Over>();
        for (var e : overs.entrySet()) { cumulative += e.getValue()[0]; chart.add(new Over(e.getKey(), e.getValue()[0], e.getValue()[1], cumulative)); }
        return new Innings(number, batting, bowling, score, wickets, balls, overs(balls), rate(score, balls, 6), extras, stand, standBalls,
                List.copyOf(batters), List.copyOf(bowlers), List.copyOf(chart), List.copyOf(falls), List.copyOf(commentary));
    }

    public static String overs(int balls) { return balls / 6 + "." + balls % 6; }
    public static double rate(int runs, int balls, int factor) { return balls == 0 ? 0 : Math.round(runs * (double) factor / balls * 100) / 100.0; }
}
