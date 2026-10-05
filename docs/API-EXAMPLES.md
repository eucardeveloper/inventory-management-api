# API Examples

Base URL: `http://localhost:8083`

Examples use a cookie jar. The backend sets `access_token` and `refresh_token` cookies on login; do not copy token values into shell history.

## Login

```bash
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  http://localhost:8083/api/auth/login
```

Example response body:

```json
{"token":"<access-jwt-for-api-clients>","role":"ADMIN"}
```

## Create a product

```bash
curl -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"articleNumber":"DEMO-001","name":"Demo Scanner","description":"Warehouse scanner","unitPrice":149.90,"reorderLevel":10,"active":true,"supplierId":1}' \
  http://localhost:8083/api/products
```

Example response shape:

```json
{"id":101,"articleNumber":"DEMO-001","name":"Demo Scanner","stock":0,"active":true}
```

The exact response includes the fields defined by `ProductController` and `Product` serialization.

## Record stock IN

```bash
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"productId":101,"quantity":20,"movementType":"IN","unitCost":40.00,"idempotencyKey":"demo-in-001"}' \
  http://localhost:8083/api/warehouse/movements
```

Example response shape:

```json
{"id":201,"productId":101,"movementType":"IN","quantity":20,"totalCost":800.00,"stockAfter":20,"createdLotId":301}
```

## Record stock OUT using FIFO

```bash
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"productId":101,"quantity":5,"movementType":"OUT","idempotencyKey":"demo-out-001"}' \
  http://localhost:8083/api/warehouse/movements
```

Example response shape:

```json
{
  "id":202,
  "productId":101,
  "movementType":"OUT",
  "quantity":5,
  "totalCost":200.00,
  "stockAfter":15,
  "lotConsumptions":[
    {"lotId":301,"quantityTaken":5,"unitCost":40.00,"lineCost":200.00}
  ]
}
```

## FIFO stock report

```bash
curl -b cookies.txt http://localhost:8083/api/warehouse/report
```

Example response shape:

```json
[
  {
    "productId":101,
    "productName":"Demo Scanner",
    "articleNumber":"DEMO-001",
    "totalIn":20,
    "totalOut":5,
    "currentStock":15,
    "isLowStock":false
  }
]
```

For the complete contract, open `http://localhost:8083/swagger-ui.html`.
