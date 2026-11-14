package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.MovementLotConsumption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface MovementLotConsumptionRepository extends JpaRepository<MovementLotConsumption, Long> {

    /** The itemised FIFO lines of one movement, used by the ledger detail view and by reversals. */
    List<MovementLotConsumption> findByMovementId(Long movementId);

    /** The lines of a whole ledger page in one statement, so listing N movements does not cost N queries. */
    @Query("SELECT c FROM MovementLotConsumption c WHERE c.movement.id IN :movementIds ORDER BY c.id")
    List<MovementLotConsumption> findByMovementIdIn(@Param("movementIds") Collection<Long> movementIds);
}
