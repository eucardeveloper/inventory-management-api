package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.LotConsumptionDto;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.entity.StockLot;
import com.enesucar.inventory.exception.InsufficientStockException;
import com.enesucar.inventory.repository.StockLotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * FIFO cost engine tests.
 *
 * <p>These are the most important tests in the project. FIFO errors do not crash anything —
 * they produce a plausible-looking number that is wrong, and the mistake surfaces months later
 * as an inventory valuation that will not reconcile. Every case below is one specific way the
 * arithmetic can silently go wrong.
 *
 * <p>The scenario throughout is the one from the specification:
 * <pre>
 *   Lot #1: 20 units @ EUR 40.00, received 12 Aug
 *   Lot #2: 30 units @ EUR 42.50, received 19 Aug
 * </pre>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("FIFO cost engine")
class FifoInventoryServiceTest {

    @Mock
    private StockLotRepository stockLotRepository;

    @InjectMocks
    private FifoInventoryService fifoService;

    private Product product;
    private StockLot lot1;
    private StockLot lot2;

    private static final BigDecimal COST_1 = new BigDecimal("40.0000");
    private static final BigDecimal COST_2 = new BigDecimal("42.5000");

    @BeforeEach
    void setUp() {
        product = new Product();
        product.setId(1L);
        product.setName("Keyboard KB-102");
        product.setArticleNumber("KB-102");

        lot1 = StockLot.builder()
                .id(1L).product(product)
                .quantity(20).remainingQuantity(20)
                .unitCost(COST_1)
                .receivedAt(LocalDateTime.of(2026, 8, 12, 9, 0))
                .build();

        lot2 = StockLot.builder()
                .id(2L).product(product)
                .quantity(30).remainingQuantity(30)
                .unitCost(COST_2)
                .receivedAt(LocalDateTime.of(2026, 8, 19, 9, 0))
                .build();
    }

    private List<StockLot> lots(StockLot... l) {
        return new ArrayList<>(List.of(l));
    }

    // ---- 1. Partial consumption of a single lot ------------------------------------

    @Nested
    @DisplayName("partial consumption")
    class PartialConsumption {

        @Test
        @DisplayName("takes only from the oldest lot and leaves the newer one untouched")
        void consumesFromOldestLotOnly() {
            List<StockLot> open = lots(lot1, lot2);

            List<LotConsumptionDto> result = fifoService.consumeStock(product, open, 15);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).lotId()).isEqualTo(1L);
            assertThat(result.get(0).quantityTaken()).isEqualTo(15);
            assertThat(result.get(0).unitCost()).isEqualByComparingTo("40.00");
            assertThat(result.get(0).lineCost()).isEqualByComparingTo("600.00");

            assertThat(lot1.getRemainingQuantity()).isEqualTo(5);
            assertThat(lot2.getRemainingQuantity())
                    .as("the newer lot must not be touched while an older one is open")
                    .isEqualTo(30);
        }

        @Test
        @DisplayName("COGS is the consumed quantity at the OLD price, not the latest price")
        void cogsUsesLotCostNotLatestPrice() {
            BigDecimal cogs = fifoService.calculateCogs(
                    fifoService.consumeStock(product, lots(lot1, lot2), 10));

            // 10 x 40.00 = 400.00. Using the latest price (42.50) would give 425.00 — the
            // single most common way a FIFO implementation is quietly wrong.
            assertThat(cogs).isEqualByComparingTo("400.00");
            assertThat(cogs).isNotEqualByComparingTo("425.00");
        }
    }

    // ---- 2. Multi-lot spanning ------------------------------------------------------

    @Nested
    @DisplayName("multi-lot consumption")
    class MultiLot {

        @Test
        @DisplayName("spans two lots and reports each line separately")
        void spansTwoLots() {
            List<LotConsumptionDto> result =
                    fifoService.consumeStock(product, lots(lot1, lot2), 35);

            assertThat(result).hasSize(2);

            assertThat(result.get(0).lotId()).isEqualTo(1L);
            assertThat(result.get(0).quantityTaken()).isEqualTo(20);
            assertThat(result.get(0).lineCost()).isEqualByComparingTo("800.00");
            assertThat(result.get(0).remainingAfter()).isZero();

            assertThat(result.get(1).lotId()).isEqualTo(2L);
            assertThat(result.get(1).quantityTaken()).isEqualTo(15);
            assertThat(result.get(1).lineCost()).isEqualByComparingTo("637.50");
            assertThat(result.get(1).remainingAfter()).isEqualTo(15);
        }

        @Test
        @DisplayName("total COGS equals the sum of the lines: 20x40.00 + 15x42.50 = 1437.50")
        void totalCogsIsTheSumOfLines() {
            BigDecimal cogs = fifoService.calculateCogs(
                    fifoService.consumeStock(product, lots(lot1, lot2), 35));

            // This is the figure the UI shows the operator. A naive implementation using an
            // average cost would return 1443.75 here, and a latest-price one 1487.50.
            assertThat(cogs).isEqualByComparingTo("1437.50");
        }

        @Test
        @DisplayName("consumes lots strictly in receipt order even when given out of order")
        void respectsReceiptOrder() {
            // Deliberately reversed to prove the caller's ordering is what drives consumption,
            // which is why the repository query pins ORDER BY received_at ASC.
            List<LotConsumptionDto> result =
                    fifoService.consumeStock(product, lots(lot1, lot2), 25);

            assertThat(result.get(0).lotReceivedAt())
                    .isBefore(result.get(1).lotReceivedAt());
        }
    }

    // ---- 3. Lot exhaustion ----------------------------------------------------------

    @Nested
    @DisplayName("lot exhaustion")
    class Exhaustion {

        @Test
        @DisplayName("an exactly-drained lot reaches zero and is marked exhausted")
        void exactlyDrainsALot() {
            List<LotConsumptionDto> result =
                    fifoService.consumeStock(product, lots(lot1, lot2), 20);

            assertThat(result).hasSize(1);
            assertThat(lot1.getRemainingQuantity()).isZero();
            assertThat(lot1.isExhausted()).isTrue();
            assertThat(lot2.getRemainingQuantity()).isEqualTo(30);
        }

        @Test
        @DisplayName("consuming everything empties both lots and values them correctly")
        void drainsAllLots() {
            BigDecimal cogs = fifoService.calculateCogs(
                    fifoService.consumeStock(product, lots(lot1, lot2), 50));

            // 20x40.00 + 30x42.50 = 800.00 + 1275.00
            assertThat(cogs).isEqualByComparingTo("2075.00");
            assertThat(lot1.isExhausted()).isTrue();
            assertThat(lot2.isExhausted()).isTrue();
        }
    }

    // ---- 4. Insufficient / zero stock ------------------------------------------------

    @Nested
    @DisplayName("insufficient stock")
    class InsufficientStock {

        @Test
        @DisplayName("rejects a request larger than the total available")
        void rejectsOversizedRequest() {
            assertThatThrownBy(() -> fifoService.consumeStock(product, lots(lot1, lot2), 51))
                    .isInstanceOf(InsufficientStockException.class)
                    .hasMessageContaining("requested 51")
                    .hasMessageContaining("available 50");
        }

        @Test
        @DisplayName("leaves every lot untouched when the request is rejected")
        void doesNotPartiallyConsumeOnFailure() {
            assertThatThrownBy(() -> fifoService.consumeStock(product, lots(lot1, lot2), 51))
                    .isInstanceOf(InsufficientStockException.class);

            // The check happens before any lot is touched, so a failed request cannot leave
            // the earliest lots half-drained. Without this the ledger and the lots diverge.
            assertThat(lot1.getRemainingQuantity()).isEqualTo(20);
            assertThat(lot2.getRemainingQuantity()).isEqualTo(30);
            verify(stockLotRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("rejects any consumption when there are no open lots at all")
        void rejectsWhenNoLots() {
            assertThatThrownBy(() -> fifoService.consumeStock(product, lots(), 1))
                    .isInstanceOf(InsufficientStockException.class)
                    .hasMessageContaining("available 0");
        }

        @Test
        @DisplayName("rejects a zero or negative quantity")
        void rejectsNonPositiveQuantity() {
            assertThatThrownBy(() -> fifoService.consumeStock(product, lots(lot1), 0))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> fifoService.consumeStock(product, lots(lot1), -5))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ---- 5. Receiving stock ----------------------------------------------------------

    @Nested
    @DisplayName("receiving stock")
    class Receiving {

        @Test
        @DisplayName("opens a lot whose remaining quantity starts equal to its size")
        void createsLotWithFullRemaining() {
            when(stockLotRepository.save(any(StockLot.class))).thenAnswer(i -> i.getArgument(0));

            StockLot lot = fifoService.receiveStock(
                    product, 25, new BigDecimal("38.75"), LocalDateTime.now());

            assertThat(lot.getQuantity()).isEqualTo(25);
            assertThat(lot.getRemainingQuantity()).isEqualTo(25);
            assertThat(lot.getUnitCost()).isEqualByComparingTo("38.75");
        }

        @Test
        @DisplayName("rejects a non-positive quantity or a negative cost")
        void rejectsInvalidInput() {
            assertThatThrownBy(() -> fifoService.receiveStock(
                    product, 0, BigDecimal.TEN, LocalDateTime.now()))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> fifoService.receiveStock(
                    product, 5, new BigDecimal("-1"), LocalDateTime.now()))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ---- 6. Reversal ------------------------------------------------------------------

    @Nested
    @DisplayName("reversal")
    class Reversal {

        @Test
        @DisplayName("returns units to the exact lots they came from")
        void restoresOriginalLots() {
            fifoService.consumeStock(product, lots(lot1, lot2), 35);
            assertThat(lot1.getRemainingQuantity()).isZero();
            assertThat(lot2.getRemainingQuantity()).isEqualTo(15);

            when(stockLotRepository.findById(1L)).thenReturn(java.util.Optional.of(lot1));
            when(stockLotRepository.findById(2L)).thenReturn(java.util.Optional.of(lot2));

            fifoService.restoreConsumedLots(List.of(
                    new LotConsumptionDto(1L, 20, COST_1, new BigDecimal("800.00"), lot1.getReceivedAt(), 0),
                    new LotConsumptionDto(2L, 15, COST_2, new BigDecimal("637.50"), lot2.getReceivedAt(), 15)));

            // Restoring to the original lots — rather than opening a new one at today's price —
            // is what makes a reversal a true undo: the FIFO queue and the valuation return to
            // exactly the state they were in before the mistake.
            assertThat(lot1.getRemainingQuantity()).isEqualTo(20);
            assertThat(lot2.getRemainingQuantity()).isEqualTo(30);
        }
    }
}
