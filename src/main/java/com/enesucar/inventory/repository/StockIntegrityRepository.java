package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.Product;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.List;

/**
 * Read-only cross-check of the three places stock lives: the product's cached figure, the sum of its open lots
 * (the source of truth) and the net of the append-only ledger. The fourth figure, the last {@code stock_after}
 * written on a movement, must agree with them too.
 */
public interface StockIntegrityRepository extends Repository<Product, Long> {

    interface Row {
        Long getProductId();
        String getArticleNumber();
        String getName();
        Long getStock();
        Long getLotTotal();
        Long getLedgerNet();
        Long getLastStockAfter();
    }

    @Query(value = """
            SELECT p.id AS "productId",
                   p.article_number AS "articleNumber",
                   p.name AS "name",
                   COALESCE(p.stock, 0) AS "stock",
                   COALESCE((SELECT SUM(l.remaining_quantity) FROM stock_lot l WHERE l.product_id = p.id), 0) AS "lotTotal",
                   COALESCE((SELECT SUM(CASE WHEN m.movement_type = 'IN' THEN m.quantity ELSE -m.quantity END)
                             FROM stock_movement m WHERE m.product_id = p.id), 0) AS "ledgerNet",
                   COALESCE((SELECT m.stock_after FROM stock_movement m WHERE m.product_id = p.id
                             ORDER BY m.id DESC LIMIT 1), 0) AS "lastStockAfter"
            FROM product p
            ORDER BY p.id
            """, nativeQuery = true)
    List<Row> findAllRows();
}
