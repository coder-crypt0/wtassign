package com.crease.repository;

import com.crease.domain.DeliveryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DeliveryRepository extends JpaRepository<DeliveryEntity, String> {
    List<DeliveryEntity> findByMatchIdOrderBySequenceNumberAsc(String matchId);
    List<DeliveryEntity> findByMatchIdInOrderBySequenceNumberAsc(List<String> ids);
}
