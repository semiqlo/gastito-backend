import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gastitoRouter from "./gastito/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/gastito", gastitoRouter);

export default router;
