package com.crease.repository;

import com.crease.domain.MatchEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface MatchRepository extends JpaRepository<MatchEntity, String> {
    List<MatchEntity> findAllByOrderByStartsAtAsc();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from MatchEntity m where m.id = :id")
    Optional<MatchEntity> lockById(@Param("id") String id);
}
