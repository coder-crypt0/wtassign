package com.crease.service;

import com.crease.domain.Outcome;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Component
public class SimulationService {
    private final MatchService matches;
    private final boolean enabled;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SimulationService.class);
    public SimulationService(MatchService matches, @Value("${crease.simulation.enabled}") boolean enabled) { this.matches = matches; this.enabled = enabled; }

    @Scheduled(fixedDelayString = "${crease.simulation.interval-ms}", initialDelay = 12000)
    public void tick() {
        if (!enabled) return;
        for (var match : matches.list("LIVE")) {
            if (!match.autoPlay()) continue;
            try {
                int roll = ThreadLocalRandom.current().nextInt(100);
                var outcome = roll < 4 ? Outcome.WICKET : roll < 8 ? Outcome.WIDE : roll < 10 ? Outcome.NO_BALL : Outcome.RUN;
                int[] weightedRuns = {0, 0, 0, 1, 1, 1, 2, 2, 4, 4, 6};
                int runs = outcome == Outcome.RUN ? weightedRuns[ThreadLocalRandom.current().nextInt(weightedRuns.length)] : 0;
                matches.score(match.id(), new MatchService.ScoreRequest(UUID.randomUUID(), outcome, runs, match.revision()));
            } catch (ResponseStatusException e) {
                // A scorer may update or pause the match between the read and the lock.
                if (e.getStatusCode().value() != 409 && e.getStatusCode().value() != 400) log.warn("Simulation skipped {}: {}", match.id(), e.getReason());
            } catch (Exception e) { log.error("Simulation failed for {}", match.id(), e); }
        }
    }
}
