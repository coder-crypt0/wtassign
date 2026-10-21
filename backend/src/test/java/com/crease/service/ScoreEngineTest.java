package com.crease.service;

import com.crease.domain.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;

class ScoreEngineTest {
    private final Team india = Team.of("IND"), australia = Team.of("AUS");
    private final List<DeliveryEntity> log = new ArrayList<>();
    private void ball(Outcome outcome, int runs) { log.add(new DeliveryEntity(UUID.randomUUID().toString(), "test-match", log.size() + 1, 1, outcome, runs)); }
    private ScoreEngine.Innings score() { return ScoreEngine.calculate(1, india, australia, log); }

    @Test void runsRotateStrikeAndAttributeBoundaries() {
        ball(Outcome.RUN, 1); ball(Outcome.RUN, 4); ball(Outcome.RUN, 6);
        var i = score();
        assertThat(i.runs()).isEqualTo(11); assertThat(i.balls()).isEqualTo(3);
        assertThat(i.batters().get(0).runs()).isEqualTo(1);
        assertThat(i.batters().get(1).runs()).isEqualTo(10);
        assertThat(i.batters().get(1).fours()).isEqualTo(1);
        assertThat(i.batters().get(1).sixes()).isEqualTo(1);
    }
    @Test void sixLegalBallsCompleteOverAndSwapStrike() {
        for (int n = 0; n < 6; n++) ball(Outcome.RUN, 0);
        var i = score();
        assertThat(i.overs()).isEqualTo("1.0");
        assertThat(i.commentary().getLast().over()).isEqualTo("0.6");
        assertThat(i.batters().get(1).status()).isEqualTo("striker");
    }
    @Test void extrasDoNotConsumeLegalBalls() {
        ball(Outcome.WIDE, 0); ball(Outcome.NO_BALL, 4); ball(Outcome.RUN, 2);
        var i = score();
        assertThat(i.runs()).isEqualTo(8); assertThat(i.balls()).isEqualTo(1);
        assertThat(i.extras()).isEqualTo(2); assertThat(i.batters().getFirst().runs()).isEqualTo(6);
        assertThat(i.bowlers().getFirst().runs()).isEqualTo(8);
    }
    @Test void wicketIntroducesNextBatterAndResetsPartnership() {
        ball(Outcome.RUN, 4); ball(Outcome.WICKET, 0); ball(Outcome.RUN, 2);
        var i = score();
        assertThat(i.wickets()).isEqualTo(1); assertThat(i.batters().getFirst().status()).isEqualTo("out");
        assertThat(i.batters().get(2).runs()).isEqualTo(2); assertThat(i.partnershipRuns()).isEqualTo(2);
        assertThat(i.partnershipBalls()).isEqualTo(1); assertThat(i.bowlers().getFirst().wickets()).isEqualTo(1);
        assertThat(i.fallOfWickets().getFirst().score()).isEqualTo(4);
    }
    @Test void wicketsAndOverBoundariesAreCorrectTogether() {
        for (int n = 0; n < 5; n++) ball(Outcome.RUN, 0);
        ball(Outcome.WICKET, 0);
        assertThat(score().batters().get(1).status()).isEqualTo("striker");
        assertThat(score().batters().get(2).status()).isEqualTo("non-striker");
    }
    @Test void allOutStopsTheInnings() {
        for (int n = 0; n < 11; n++) ball(Outcome.WICKET, 0);
        var i = score(); assertThat(i.wickets()).isEqualTo(10); assertThat(i.balls()).isEqualTo(10);
        assertThat(i.commentary()).hasSize(10);
    }
    @Test void twentyOversStopsTheInnings() {
        for (int n = 0; n < 121; n++) ball(Outcome.RUN, 1);
        assertThat(score().balls()).isEqualTo(120); assertThat(score().runs()).isEqualTo(120);
        assertThat(score().oversData()).hasSize(20);
    }
    @Test void wideRunsAreAllExtrasAndOddRunningChangesStrike() {
        ball(Outcome.WIDE, 1); ball(Outcome.RUN, 4);
        assertThat(score().extras()).isEqualTo(2); assertThat(score().batters().get(1).runs()).isEqualTo(4);
    }
    @Test void freeHitSurvivesWidesButEndsOnLegalDelivery() {
        ball(Outcome.NO_BALL, 0); ball(Outcome.WIDE, 0);
        assertThat(MatchService.freeHit(log, 1)).isTrue();
        ball(Outcome.RUN, 0); assertThat(MatchService.freeHit(log, 1)).isFalse();
    }
    @Test void rateWithNoDeliveriesIsFinite() {
        assertThat(score().runRate()).isZero(); assertThat(ScoreEngine.rate(6, 0, 100)).isZero();
    }
}
