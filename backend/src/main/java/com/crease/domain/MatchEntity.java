package com.crease.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "cricket_matches")
public class MatchEntity {
    @Id public String id;
    @Column(nullable = false) public String homeTeam;
    @Column(nullable = false) public String awayTeam;
    @Column(nullable = false) public String venue;
    public String tournament;
    public Instant startsAt;
    public String status;
    public int currentInnings;
    public boolean autoPlay;
    public boolean editable;
    public long revision;

    public MatchEntity() {}
}
