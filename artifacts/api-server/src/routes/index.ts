import { Router, type IRouter } from "express";
import healthRouter from "./health";
import portfolioRouter from "./portfolio";
import analyticsRouter from "./analyticsIni";
import dealsRouter from "./deals";
import servicesRouter from "./services";
import metricsRouter from "./metrics";
import accessRequestsRouter from "./accessRequests";
import authRouter from "./auth";
import dataRouter from "./data";
import integrationsRouter from "./integrations";
import importRouter from "./import";
import dataAgentRouter from "./dataAgent";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(portfolioRouter);
router.use(analyticsRouter);
router.use(dealsRouter);
router.use(servicesRouter);
router.use(metricsRouter);
router.use(accessRequestsRouter);
router.use(dataRouter);
router.use(integrationsRouter);
router.use(importRouter);
router.use(dataAgentRouter);

export default router;
