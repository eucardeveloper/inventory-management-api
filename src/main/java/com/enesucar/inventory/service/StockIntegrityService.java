package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.StockIntegrityResponse;
import com.enesucar.inventory.repository.StockIntegrityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/** Cross-checks the cached stock, the open lots and the ledger for every product. Read-only. */
@Service
@RequiredArgsConstructor
public class StockIntegrityService {

    private final StockIntegrityRepository repository;

    @Transactional(readOnly = true)
    public StockIntegrityResponse check(boolean onlyInconsistent) {
        List<StockIntegrityResponse.Row> all = repository.findAllRows().stream()
                .map(r -> {
                    long stock = r.getStock(), lots = r.getLotTotal(), ledger = r.getLedgerNet(), last = r.getLastStockAfter();
                    boolean consistent = stock == lots && lots == ledger && ledger == last;
                    return new StockIntegrityResponse.Row(r.getProductId(), r.getArticleNumber(), r.getName(),
                            stock, lots, ledger, last, consistent);
                })
                .toList();
        int bad = (int) all.stream().filter(r -> !r.consistent()).count();
        List<StockIntegrityResponse.Row> rows = onlyInconsistent
                ? all.stream().filter(r -> !r.consistent()).toList() : all;
        return new StockIntegrityResponse(Instant.now(), all.size(), bad, rows);
    }
}
