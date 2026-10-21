package com.crease.service;

import jakarta.annotation.PreDestroy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
import java.util.concurrent.*;

@Service
public class LiveFeed {
    private final Map<UUID, SseEmitter> clients = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private final Semaphore sends = new Semaphore(256);

    public synchronized SseEmitter subscribe() {
        if (clients.size() >= 256) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "The live feed is busy. Please retry shortly.");
        var id = UUID.randomUUID(); var emitter = new SseEmitter(3_600_000L);
        clients.put(id, emitter);
        emitter.onCompletion(() -> clients.remove(id)); emitter.onTimeout(() -> clients.remove(id)); emitter.onError(ignored -> clients.remove(id));
        send(id, emitter, "connected", Map.of("message", "Live feed connected"));
        return emitter;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void changed(MatchService.Changed event) { broadcast("score", event); }

    @Scheduled(fixedDelay = 15000)
    public void heartbeat() { broadcast("heartbeat", Map.of("time", java.time.Instant.now().toString())); }

    private void broadcast(String name, Object data) { clients.forEach((id, emitter) -> send(id, emitter, name, data)); }
    private void send(UUID id, SseEmitter emitter, String name, Object data) {
        if (!sends.tryAcquire()) { clients.remove(id); emitter.complete(); return; }
        executor.submit(() -> {
            try { synchronized (emitter) { emitter.send(SseEmitter.event().name(name).reconnectTime(3000).data(data)); } }
            catch (Exception e) { clients.remove(id); emitter.complete(); }
            finally { sends.release(); }
        });
    }
    @PreDestroy public void close() { clients.values().forEach(SseEmitter::complete); executor.close(); }
}
