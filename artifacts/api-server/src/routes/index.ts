import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import claimsRouter from "./claims";
import documentsRouter from "./documents";
import usersRouter from "./users";
import auditLogsRouter from "./audit-logs";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/claims", claimsRouter);
router.use("/documents", documentsRouter);
router.use("/users", usersRouter);
router.use("/audit-logs", auditLogsRouter);

export default router;
