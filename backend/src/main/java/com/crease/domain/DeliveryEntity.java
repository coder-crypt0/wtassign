package com.crease.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "deliveries", indexes = @Index(name = "idx_delivery_match", columnList = "matchId,sequenceNumber"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"matchId", "sequenceNumber"}))
public class DeliveryEntity {
    @Id public String id;
    @Column(nullable = false) public String matchId;
    public int sequenceNumber;
    public int innings;
    @Enumerated(EnumType.STRING) public Outcome outcome;
    public int runs;
    public Instant createdAt;

    public DeliveryEntity() {}
    public DeliveryEntity(String id, String matchId, int sequence, int innings, Outcome outcome, int runs) {
        this.id = id; this.matchId = matchId; this.sequenceNumber = sequence;
        this.innings = innings; this.outcome = outcome; this.runs = runs; this.createdAt = Instant.now();
    }
}
