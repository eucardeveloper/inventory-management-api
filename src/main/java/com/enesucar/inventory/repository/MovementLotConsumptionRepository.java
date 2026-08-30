package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.MovementLotConsumption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovementLotConsumptionRepository extends JpaRepository<MovementLotConsumption, Long> {

    /** The itemised FIFO lines of one movement, used by the ledger detail view and by reversals. */
    List<MovementLotConsumption> findByMovementId(Long movementId);
}
