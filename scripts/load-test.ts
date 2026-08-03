/**
 * Load Test para HomologaPneu
 * Testar performance sob carga
 *
 * Executar:
 * npm install -D k6
 * k6 run scripts/load-test.js --vus 50 --duration 5m --ramp-up 1m
 *
 * Interpretar resultados:
 * - http_req_duration: latência da requisição
 * - http_req_failed: taxa de erro
 * - http_reqs: requisições por segundo
 */

import http from "k6/http";
import { check, group, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 10 }, // Ramp up
    { duration: "3m", target: 50 }, // Stay at 50 VUs
    { duration: "1m", target: 20 }, // Ramp down
  ],
  thresholds: {
    "http_req_duration": ["p(95)<500", "p(99)<1000"], // 95% < 500ms, 99% < 1s
    "http_req_failed": ["rate<0.1"], // Error rate < 10%
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  group("Dashboard", () => {
    const dashRes = http.get(`${BASE_URL}/api/dashboard`);
    check(dashRes, {
      "dashboard status is 200": (r) => r.status === 200,
      "dashboard response time < 500ms": (r) => r.timings.duration < 500,
      "dashboard has cache headers": (r) =>
        r.headers["Cache-Control"] !== undefined,
    });
    sleep(1);
  });

  group("Fabricantes", () => {
    const mfgRes = http.get(`${BASE_URL}/api/fabricantes`);
    check(mfgRes, {
      "manufacturers status is 200": (r) => r.status === 200,
      "manufacturers cached": (r) => r.timings.duration < 100,
    });
    sleep(1);
  });

  group("Homologações", () => {
    const homRes = http.get(
      `${BASE_URL}/api/homologacoes?limit=20&offset=0`
    );
    check(homRes, {
      "homologations status is 200": (r) => r.status === 200,
      "homologations response time < 1000ms": (r) => r.timings.duration < 1000,
    });
    sleep(2);
  });

  group("Health Check", () => {
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, {
      "health status is 200": (r) => r.status === 200,
      "health returns healthy": (r) => r.body.includes("healthy"),
    });
  });

  group("Rate Limiting", () => {
    for (let i = 0; i < 5; i++) {
      const res = http.get(`${BASE_URL}/api/status`);
      check(res, {
        "rate limit headers present": (r) =>
          r.headers["X-RateLimit-Limit"] !== undefined,
      });
    }
  });
}

/**
 * Summary da saída:
 * - http_req_duration: P50, P90, P95, P99 latencies
 * - http_reqs: requisições por segundo
 * - http_req_failed: taxa de erro
 * - iterations: total de iterações
 * - vus: virtual users ativos
 */
