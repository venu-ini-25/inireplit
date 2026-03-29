import { MOCK_API, MOCK_COMPANIES, MOCK_DEALS } from "./mockApiData";

const DATA_PATHS = new Set([
  "portfolio/summary", "portfolio/companies", "portfolio/kpis",
  "analytics/revenue", "analytics/spending", "analytics/reports", "analytics/benchmarks",
  "metrics/cashflow", "metrics/operations", "metrics/product",
  "metrics/marketing", "metrics/sales", "metrics/people",
  "services/overview", "services/engagements",
  "deals", "deals/pipeline-summary",
]);

function mockResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const _nativeFetch = window.fetch.bind(window);

const IS_DEV = import.meta.env.DEV;

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input
    : input instanceof URL ? input.href
    : (input as Request).url;

  if (!url.includes("/api/")) return _nativeFetch(input, init);

  const apiPath = url.split("/api/")[1]?.split("?")[0] ?? "";

  if (IS_DEV) {
    return _nativeFetch(input, init);
  }

  if (apiPath.startsWith("portfolio/companies/")) {
    const id = apiPath.split("/")[2];
    const company = MOCK_COMPANIES[id] ?? Object.values(MOCK_COMPANIES)[0];
    return mockResponse(company);
  }

  if (apiPath.startsWith("deals/") && apiPath !== "deals/pipeline-summary") {
    const id = apiPath.split("/")[1];
    const deal = MOCK_DEALS[id] ?? Object.values(MOCK_DEALS)[0];
    return mockResponse(deal);
  }

  if (DATA_PATHS.has(apiPath)) {
    return mockResponse(MOCK_API[apiPath]);
  }

  return _nativeFetch(input, init);
};
