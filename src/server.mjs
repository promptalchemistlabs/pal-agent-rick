import http from "node:http";
import { createRick } from "./rick.mjs";

export function createRickServer({ rick = createRick() } = {}) {
  return http.createServer(async (request, response) => {
    response.setHeader("content-type", "application/json; charset=utf-8");
    if (request.method === "GET" && request.url === "/health") {
      return response.end(JSON.stringify(rick.health()));
    }
    if (request.method === "GET" && request.url === "/capabilities") {
      return response.end(JSON.stringify(rick.capabilities()));
    }
    if (request.method === "POST" && ["/tasks", "/approval-review"].includes(request.url)) {
      try {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const result = request.url === "/tasks"
          ? await rick.handleTask(body)
          : await rick.reviewApproval(body);
        response.statusCode = result.status === "failed" ? 400 : 200;
        return response.end(JSON.stringify(result));
      } catch (error) {
        response.statusCode = 400;
        return response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      }
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "Not found" }));
  });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = Number(process.env.RICK_PORT ?? 4103);
  createRickServer().listen(port, () => console.log(`Rick listening on http://127.0.0.1:${port}`));
}
