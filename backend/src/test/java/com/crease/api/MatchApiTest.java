package com.crease.api;

import com.crease.domain.*;
import com.crease.repository.*;
import com.crease.service.MatchService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:crease-test;DB_CLOSE_DELAY=-1", "spring.jpa.hibernate.ddl-auto=create-drop", "crease.simulation.enabled=false"})
@AutoConfigureMockMvc
class MatchApiTest {
    @Autowired MockMvc mvc;
    @Autowired MatchRepository matches;
    @Autowired DeliveryRepository deliveries;
    @Autowired MatchService service;
    @Autowired ObjectMapper mapper;

    @BeforeEach void setup() {
        deliveries.deleteAll(); matches.deleteAll();
        var m = new MatchEntity(); m.id = "test-match"; m.homeTeam = "AUS"; m.awayTeam = "IND";
        m.venue = "Test Ground"; m.tournament = "Test T20"; m.startsAt = Instant.now();
        m.status = "LIVE"; m.currentInnings = 2; m.editable = true; matches.save(m);
        var log = new ArrayList<DeliveryEntity>();
        for (int n = 0; n < 6; n++) log.add(new DeliveryEntity(UUID.randomUUID().toString(), m.id, n + 1, 1, Outcome.RUN, 4));
        deliveries.saveAll(log);
    }
    private MatchService.ScoreRequest command(Outcome outcome, int runs, long revision) { return new MatchService.ScoreRequest(UUID.randomUUID(), outcome, runs, revision); }
    private String json(Object object) throws Exception { return mapper.writeValueAsString(object); }

    @Test void scoresDeliveryAndReturnsDerivedPlayerStats() throws Exception {
        mvc.perform(post("/api/matches/test-match/deliveries").contentType(MediaType.APPLICATION_JSON).content(json(command(Outcome.RUN, 4, 0))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.match.score").value(4)).andExpect(jsonPath("$.match.revision").value(1))
            .andExpect(jsonPath("$.innings[1].batters[0].fours").value(1));
    }
    @Test void repeatedRequestIsIdempotent() {
        var c = command(Outcome.RUN, 6, 0); service.score("test-match", c); var again = service.score("test-match", c);
        assertThat(again.match().score()).isEqualTo(6); assertThat(again.match().revision()).isEqualTo(1); assertThat(deliveries.count()).isEqualTo(7);
    }
    @Test void reusedRequestWithDifferentPayloadIsRejected() throws Exception {
        var c = command(Outcome.RUN, 4, 0); service.score("test-match", c);
        var changed = new MatchService.ScoreRequest(c.requestId(), Outcome.RUN, 6, 1L);
        mvc.perform(post("/api/matches/test-match/deliveries").contentType(MediaType.APPLICATION_JSON).content(json(changed))).andExpect(status().isConflict());
    }
    @Test void staleScorerIsRejected() throws Exception {
        service.score("test-match", command(Outcome.RUN, 1, 0));
        mvc.perform(post("/api/matches/test-match/deliveries").contentType(MediaType.APPLICATION_JSON).content(json(command(Outcome.RUN, 4, 0))))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("The score changed. Refresh and try again."));
    }
    @Test void invalidRunsAndWicketAreRejected() throws Exception {
        mvc.perform(post("/api/matches/test-match/deliveries").contentType(MediaType.APPLICATION_JSON).content(json(command(Outcome.RUN, 9, 0)))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/matches/test-match/deliveries").contentType(MediaType.APPLICATION_JSON).content(json(command(Outcome.WICKET, 2, 0)))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/matches/test-match/deliveries").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
    }
    @Test void unknownMatchAndInvalidStatusReturnUsefulErrors() throws Exception {
        mvc.perform(get("/api/matches/missing")).andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("Match not found."));
        mvc.perform(get("/api/matches?status=invalid")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/matches?status=LIVE")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
    }
    @Test void undoRestoresTheExactScoreAndPausesAutoplay() {
        service.simulation("test-match", new MatchService.SimulationRequest(true, 0L));
        service.score("test-match", command(Outcome.RUN, 4, 1));
        var result = service.undo("test-match", 2);
        assertThat(result.match().score()).isZero(); assertThat(result.match().balls()).isZero();
        assertThat(result.match().autoPlay()).isFalse(); assertThat(result.match().revision()).isEqualTo(3);
    }
    @Test void chasingTheTargetCompletesMatchAndUndoReopensIt() {
        for (int n = 0; n < 4; n++) service.score("test-match", command(Outcome.RUN, 6, n));
        var result = service.score("test-match", command(Outcome.WIDE, 0, 4));
        assertThat(result.match().score()).isEqualTo(25); assertThat(result.match().status()).isEqualTo("COMPLETED");
        assertThat(result.match().result()).isEqualTo("India won by 10 wickets");
        assertThat(service.undo("test-match", 5).match().status()).isEqualTo("LIVE");
    }
    @Test void wicketIsRejectedOnFreeHit() throws Exception {
        service.score("test-match", command(Outcome.NO_BALL, 0, 0));
        service.score("test-match", command(Outcome.WIDE, 0, 1));
        mvc.perform(post("/api/matches/test-match/deliveries").contentType(MediaType.APPLICATION_JSON).content(json(command(Outcome.WICKET, 0, 2))))
            .andExpect(status().isBadRequest());
        assertThat(service.detail("test-match").match().wickets()).isZero();
    }
    @Test void finishedAndUpcomingFixturesRejectWrites() throws Exception {
        var m = matches.findById("test-match").orElseThrow(); m.status = "UPCOMING"; matches.save(m);
        mvc.perform(post("/api/matches/test-match/deliveries").contentType(MediaType.APPLICATION_JSON).content(json(command(Outcome.RUN, 1, 0)))).andExpect(status().isConflict());
        mvc.perform(patch("/api/matches/test-match/simulation").contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":true,\"expectedRevision\":0}")).andExpect(status().isConflict());
    }
    @Test void simultaneousScorersCannotLoseUpdates() throws Exception {
        try (var pool = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1);
            Callable<Integer> job = () -> { start.await(); try { service.score("test-match", command(Outcome.RUN, 4, 0)); return 200; } catch (ResponseStatusException e) { return e.getStatusCode().value(); } };
            var first = pool.submit(job); var second = pool.submit(job); start.countDown();
            assertThat(List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS))).containsExactlyInAnyOrder(200, 409);
        }
        assertThat(service.detail("test-match").match().score()).isEqualTo(4); assertThat(deliveries.count()).isEqualTo(7);
    }
    @Test void leadersAreCalculatedFromDeliveries() throws Exception {
        service.score("test-match", command(Outcome.RUN, 6, 0));
        mvc.perform(get("/api/players")).andExpect(status().isOk()).andExpect(jsonPath("$.batters").isArray()).andExpect(jsonPath("$.bowlers").isArray());
    }
    @Test void healthEndpointIsAvailable() throws Exception { mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP")); }

    @Test void restartRebuildsTheDemoCheckpointAndKeepsRevisionsIncreasing() {
        var m = matches.findById("test-match").orElseThrow();
        deliveries.deleteAll(); matches.deleteAll(); m.id = "ind-aus"; matches.save(m);
        var opening = service.restart("ind-aus", new MatchService.RevisionRequest(0L));
        assertThat(opening.match().balls()).isEqualTo(92);
        assertThat(opening.match().autoPlay()).isFalse();
        service.score("ind-aus", command(Outcome.RUN, 4, 1));
        var reset = service.restart("ind-aus", new MatchService.RevisionRequest(2L));
        assertThat(reset.match().score()).isEqualTo(opening.match().score());
        assertThat(reset.match().revision()).isEqualTo(3);
        assertThat(deliveries.count()).isEqualTo(212);
    }
}
