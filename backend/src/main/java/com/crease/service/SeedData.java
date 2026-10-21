package com.crease.service;

import com.crease.domain.*;
import com.crease.repository.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Component
public class SeedData implements ApplicationRunner {
    private final MatchRepository matches;
    private final DeliveryRepository deliveries;
    public SeedData(MatchRepository matches, DeliveryRepository deliveries) { this.matches = matches; this.deliveries = deliveries; }

    @Override @Transactional
    public void run(ApplicationArguments args) {
        if (matches.count() > 0) return;
        var today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        seed("ind-aus", "AUS", "IND", "Kensington Oval, Barbados", "LIVE", today, 14, 92, 42);
        seed("eng-sa", "SA", "ENG", "Daren Sammy Stadium, St Lucia", "LIVE", today, 15, 67, 88);
        seed("nz-pak", "NZ", "PAK", "Providence Stadium, Guyana", "UPCOMING", today.plusDays(1), 19, 0, 9);
        seed("wi-sl", "WI", "SL", "Brian Lara Academy, Trinidad", "COMPLETED", today.minusDays(1), 19, 120, 17);
        seed("ind-eng", "IND", "ENG", "Kensington Oval, Barbados", "COMPLETED", today.minusDays(2), 19, 120, 61);
        seed("aus-nz", "AUS", "NZ", "Daren Sammy Stadium, St Lucia", "UPCOMING", today.plusDays(2), 19, 0, 27);
    }

    private void seed(String id, String home, String away, String venue, String status, LocalDate date, int hour, int chaseBalls, int seed) {
        var m = new MatchEntity();
        m.id = id; m.homeTeam = home; m.awayTeam = away; m.venue = venue;
        m.tournament = "World T20 · Super Eight"; m.status = status;
        m.startsAt = date.atTime(hour, 30).atZone(ZoneId.of("Asia/Kolkata")).toInstant();
        m.currentInnings = status.equals("UPCOMING") ? 1 : 2; m.editable = status.equals("LIVE"); m.autoPlay = m.editable;
        matches.save(m);
        if (status.equals("UPCOMING")) return;
        deliveries.saveAll(makeLog(id, chaseBalls, seed));
    }

    public static List<DeliveryEntity> openingLog(String id) {
        return switch (id) {
            case "ind-aus" -> makeLog(id, 92, 42);
            case "eng-sa" -> makeLog(id, 67, 88);
            default -> throw new IllegalArgumentException("This fixture has no live simulation.");
        };
    }

    private static List<DeliveryEntity> makeLog(String id, int chaseBalls, int seed) {
        var log = new ArrayList<DeliveryEntity>(); var random = new Random(seed);
        generate(id, 1, 120, random, log, Integer.MAX_VALUE);
        int target = log.stream().mapToInt(d -> d.runs).sum() + 1;
        generate(id, 2, chaseBalls, random, log, target);
        return log;
    }

    private static void generate(String id, int innings, int length, Random random, List<DeliveryEntity> log, int target) {
        int wickets = 0, score = 0;
        int[] weights = {0, 0, 1, 1, 1, 1, 2, 2, 4, 4, 6};
        for (int b = 0; b < length && wickets < 10 && score < target; b++) {
            boolean wicket = b > 9 && (b % 29 == 17 || random.nextInt(45) == 0);
            int runs = wicket ? 0 : weights[random.nextInt(weights.length)];
            if (wicket) wickets++;
            score += runs;
            log.add(new DeliveryEntity(UUID.nameUUIDFromBytes((id + ":" + innings + ":" + b).getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString(), id, log.size() + 1, innings, wicket ? Outcome.WICKET : Outcome.RUN, runs));
        }
    }
}
