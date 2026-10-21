package com.crease.api;

import com.crease.service.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.*;

@RestController
@RequestMapping("/api")
public class MatchController {
    private final MatchService matches;
    private final LiveFeed feed;
    public MatchController(MatchService matches, LiveFeed feed) { this.matches = matches; this.feed = feed; }
    @GetMapping("/matches") public List<MatchService.Summary> list(@RequestParam(required = false) String status) { return matches.list(status); }
    @GetMapping("/matches/{id}") public MatchService.Detail detail(@PathVariable String id) { return matches.detail(id); }
    @PostMapping("/matches/{id}/deliveries") public MatchService.Detail score(@PathVariable String id, @Valid @RequestBody MatchService.ScoreRequest request) { return matches.score(id, request); }
    @DeleteMapping("/matches/{id}/deliveries/latest") public MatchService.Detail undo(@PathVariable String id, @RequestParam long expectedRevision) { return matches.undo(id, expectedRevision); }
    @PatchMapping("/matches/{id}/simulation") public MatchService.Detail simulation(@PathVariable String id, @Valid @RequestBody MatchService.SimulationRequest request) { return matches.simulation(id, request); }
    @PostMapping("/matches/{id}/restart") public MatchService.Detail restart(@PathVariable String id, @Valid @RequestBody MatchService.RevisionRequest request) { return matches.restart(id, request); }
    @GetMapping(value = "/live", produces = "text/event-stream") public SseEmitter live() { return feed.subscribe(); }

    @GetMapping("/players") public Map<String, Object> players() {
        var batting = new HashMap<String, Map<String, Object>>();
        var bowling = new HashMap<String, Map<String, Object>>();
        for (var summary : matches.list(null)) {
            for (var innings : matches.detail(summary.id()).innings()) {
                for (var b : innings.batters()) {
                    if (b.balls() == 0 && b.runs() == 0) continue;
                    var entry = batting.computeIfAbsent(b.id(), ignored -> new HashMap<>(Map.of("id", b.id(), "name", b.name(), "team", innings.team().id(), "runs", 0, "balls", 0, "fours", 0, "sixes", 0)));
                    entry.put("runs", (int) entry.get("runs") + b.runs()); entry.put("balls", (int) entry.get("balls") + b.balls());
                    entry.put("fours", (int) entry.get("fours") + b.fours()); entry.put("sixes", (int) entry.get("sixes") + b.sixes());
                    entry.put("strikeRate", ScoreEngine.rate((int) entry.get("runs"), (int) entry.get("balls"), 100));
                }
                for (var b : innings.bowlers()) {
                    var entry = bowling.computeIfAbsent(b.id(), ignored -> new HashMap<>(Map.of("id", b.id(), "name", b.name(), "team", innings.bowlingTeam().id(), "wickets", 0, "runs", 0, "balls", 0)));
                    entry.put("wickets", (int) entry.get("wickets") + b.wickets()); entry.put("runs", (int) entry.get("runs") + b.runs()); entry.put("balls", (int) entry.get("balls") + b.balls());
                    entry.put("economy", ScoreEngine.rate((int) entry.get("runs"), (int) entry.get("balls"), 6));
                }
            }
        }
        return Map.of("batters", batting.values().stream().sorted(Comparator.comparingInt(e -> -(int) e.get("runs"))).toList(),
                "bowlers", bowling.values().stream().sorted(Comparator.<Map<String, Object>>comparingInt(e -> -(int) e.get("wickets")).thenComparingDouble(e -> ((Number) e.get("economy")).doubleValue())).toList());
    }
}
