import { Router, type IRouter } from "express";
import healthRouter from "./health";
import portfolioRouter from "./portfolio";
import analyticsRouter from "./analyticsIni";
import dealsRouter from "./deals";
import servicesRouter from "./services";

const router: IRouter = Router();

router.use(healthRouter);
router.use(portfolioRouter);
router.use(analyticsRouter);
router.use(dealsRouter);
router.use(servicesRouter);

export default router;
