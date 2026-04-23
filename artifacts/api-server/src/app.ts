import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { extractAuth } from "./middleware/extractAuth";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Apply auth extraction globally — the Replit proxy strips the /api prefix
// before forwarding to this server, so we can't scope it to /api only.
app.use(extractAuth);

// Mount routes at /api for direct curl/Vercel access (full path preserved)
app.use("/api", router);

// Mount routes at / for the Replit dev proxy, which strips /api before
// forwarding. This way POST /import/preview works in the browser.
app.use("/", router);

export default app;
