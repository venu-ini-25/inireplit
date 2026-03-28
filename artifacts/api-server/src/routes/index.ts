import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import transactionsRouter from "./transactions";
import accountsRouter from "./accounts";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(transactionsRouter);
router.use(accountsRouter);
router.use(analyticsRouter);

export default router;
