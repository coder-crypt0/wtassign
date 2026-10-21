package com.crease.service;

import com.crease.domain.*;
import com.crease.repository.*;
import jakarta.validation.constraints.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@Service
public class MatchService {
    private final MatchRepository matches;
    private final DeliveryRepository deliveries;
    private final ApplicationEventPublisher events;
    public record Changed(String matchId, long revision) {}
    public record Summary(String id, Team home, Team away, String status, String tournament, String venue, Instant startsAt,
                          int innings, String battingTeamId, int score, int wickets, String overs, int balls, int maxOvers,
                          Integer target, Double requiredRate, double currentRate, int firstInningsScore, int firstInningsWickets, String firstInningsOvers,
                          String result, String statusText, boolean autoPlay, boolean editable, long revision) {}
    public record Detail(Summary match, List<ScoreEngine.Innings> innings) {}
    public record ScoreRequest(@NotNull UUID requestId, @NotNull Outcome outcome, @Min(0) @Max(6) int runs, @NotNull @PositiveOrZero Long expectedRevision) {}
    public record SimulationRequest(boolean enabled, @NotNull @PositiveOrZero Long expectedRevision) {}
    public record RevisionRequest(@NotNull @PositiveOrZero Long expectedRevision) {}

    public MatchService(MatchRepository matches, DeliveryRepository deliveries, ApplicationEventPublisher events) {
        this.matches = matches; this.deliveries = deliveries; this.events = events;
    }

    @Transactional(readOnly = true)
    public List<Summary> list(String status) {
        if (status != null && !Set.of("LIVE", "UPCOMING", "COMPLETED").contains(status)) throw bad("Status must be LIVE, UPCOMING or COMPLETED.");
        var all = matches.findAllByOrderByStartsAtAsc();
        if (all.isEmpty()) return List.of();
        var logs = deliveries.findByMatchIdInOrderBySequenceNumberAsc(all.stream().map(m -> m.id).toList());
        return all.stream().filter(m -> status == null || m.status.equals(status))
                .map(m -> build(m, logs.stream().filter(d -> d.matchId.equals(m.id)).toList()).match()).toList();
    }

    @Transactional(readOnly = true)
    public Detail detail(String id) { return build(find(id), deliveries.findByMatchIdOrderBySequenceNumberAsc(id)); }

    @Transactional
    public Detail score(String id, ScoreRequest request) {
        var m = lock(id);
        var existing = deliveries.findById(request.requestId().toString());
        if (existing.isPresent()) {
            var d = existing.get();
            if (!d.matchId.equals(id) || d.outcome != request.outcome() || d.runs != request.runs()) throw conflict("This request ID was already used for a different delivery.");
            return build(m, deliveries.findByMatchIdOrderBySequenceNumberAsc(id));
        }
        checkRevision(m, request.expectedRevision());
        if (!m.status.equals("LIVE") || !m.editable) throw conflict("Only a live simulation can receive a delivery.");
        if (request.outcome() == Outcome.WICKET && request.runs() != 0) throw bad("A wicket delivery must have zero runs.");
        var log = new ArrayList<>(deliveries.findByMatchIdOrderBySequenceNumberAsc(id));
        var before = build(m, log);
        // A no-ball grants a free hit; a wicket on that following delivery is not valid.
        if (request.outcome() == Outcome.WICKET && freeHit(log, m.currentInnings)) throw bad("Free hit: a bowler's wicket cannot be recorded. Add runs or a dot ball.");
        var d = new DeliveryEntity(request.requestId().toString(), id, log.isEmpty() ? 1 : log.getLast().sequenceNumber + 1,
                m.currentInnings, request.outcome(), request.runs());
        deliveries.save(d); log.add(d);
        var after = build(m, log).innings().get(m.currentInnings - 1);
        if (m.currentInnings == 2 && after.runs() >= before.match().target()) { m.status = "COMPLETED"; m.autoPlay = false; }
        else if (after.balls() >= 120 || after.wickets() >= 10) {
            if (m.currentInnings == 1) m.currentInnings = 2;
            else { m.status = "COMPLETED"; m.autoPlay = false; }
        }
        changed(m);
        return build(m, log);
    }

    @Transactional
    public Detail undo(String id, long expectedRevision) {
        var m = lock(id); checkRevision(m, expectedRevision);
        if (!m.editable || m.status.equals("UPCOMING")) throw conflict("This fixture is read-only.");
        var log = new ArrayList<>(deliveries.findByMatchIdOrderBySequenceNumberAsc(id));
        if (log.isEmpty()) throw conflict("No delivery to undo.");
        var last = log.removeLast();
        deliveries.delete(last); m.currentInnings = last.innings; m.status = "LIVE"; m.autoPlay = false;
        changed(m); return build(m, log);
    }

    @Transactional
    public Detail simulation(String id, SimulationRequest request) {
        var m = lock(id); checkRevision(m, request.expectedRevision());
        if (!m.editable || !m.status.equals("LIVE")) throw conflict("Simulation is available for live matches only.");
        m.autoPlay = request.enabled(); changed(m);
        return build(m, deliveries.findByMatchIdOrderBySequenceNumberAsc(id));
    }

    @Transactional
    public Detail restart(String id, RevisionRequest request) {
        var m = lock(id); checkRevision(m, request.expectedRevision());
        if (!m.editable || !Set.of("ind-aus", "eng-sa").contains(id)) throw conflict("This fixture has no live simulation to restart.");
        deliveries.deleteAll(deliveries.findByMatchIdOrderBySequenceNumberAsc(id));
        deliveries.flush();
        var log = SeedData.openingLog(id);
        deliveries.saveAll(log);
        m.status = "LIVE"; m.currentInnings = 2; m.autoPlay = false;
        changed(m); return build(m, log);
    }

    public static boolean freeHit(List<DeliveryEntity> log, int innings) {
        for (int i = log.size() - 1; i >= 0; i--) {
            var d = log.get(i);
            if (d.innings != innings) continue;
            if (d.outcome == Outcome.WIDE) continue;
            return d.outcome == Outcome.NO_BALL;
        }
        return false;
    }

    private Detail build(MatchEntity m, List<DeliveryEntity> log) {
        var home = Team.of(m.homeTeam); var away = Team.of(m.awayTeam);
        var first = ScoreEngine.calculate(1, home, away, log);
        var second = ScoreEngine.calculate(2, away, home, log);
        var active = m.currentInnings == 1 ? first : second;
        Integer target = m.currentInnings == 2 ? first.runs() + 1 : null;
        Double required = target == null || active.balls() >= 120 ? null : ScoreEngine.rate(Math.max(0, target - active.runs()), 120 - active.balls(), 6);
        String result = "";
        String text = m.status.equals("UPCOMING") ? "First ball " + m.startsAt : home.name() + " are setting the pace";
        if (target != null) text = away.name() + " need " + Math.max(0, target - active.runs()) + " runs in " + Math.max(0, 120 - active.balls()) + " balls";
        if (m.status.equals("COMPLETED")) {
            result = second.runs() > first.runs() ? away.name() + " won by " + (10 - second.wickets()) + (second.wickets() == 9 ? " wicket" : " wickets")
                    : second.runs() == first.runs() ? "Match tied" : home.name() + " won by " + (first.runs() - second.runs()) + (first.runs() - second.runs() == 1 ? " run" : " runs");
            text = result;
        }
        return new Detail(new Summary(m.id, home, away, m.status, m.tournament, m.venue, m.startsAt, m.currentInnings,
                active.team().id(), active.runs(), active.wickets(), active.overs(), active.balls(), 20, target, required, active.runRate(),
                first.runs(), first.wickets(), first.overs(), result, text, m.autoPlay, m.editable, m.revision), m.currentInnings == 1 ? List.of(first) : List.of(first, second));
    }

    private void changed(MatchEntity m) { m.revision++; matches.save(m); events.publishEvent(new Changed(m.id, m.revision)); }
    private MatchEntity find(String id) { return matches.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found.")); }
    private MatchEntity lock(String id) { return matches.lockById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found.")); }
    private static void checkRevision(MatchEntity m, long revision) { if (m.revision != revision) throw conflict("The score changed. Refresh and try again."); }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private static ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
