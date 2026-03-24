import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { smtpConfigTable } from "@workspace/db/schema";
import { testSmtpConnection } from "../lib/email";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!(req.session as any).userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if ((req.session as any).userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

router.get("/", requireAdmin, async (_req: Request, res: Response) => {
  const rows = await db.select().from(smtpConfigTable).limit(1);
  const config = rows[0];
  if (!config) {
    res.json(null);
    return;
  }
  res.json({ ...config, password: config.password ? "••••••••" : "" });
});

router.put("/", requireAdmin, async (req: Request, res: Response) => {
  const { host, port, secure, username, password, fromName, fromEmail, enabled } = req.body as {
    host: string; port: number; secure: boolean;
    username: string; password: string;
    fromName: string; fromEmail: string; enabled: boolean;
  };

  if (!host || !port || !username || !fromEmail) {
    res.status(400).json({ error: "host, port, username, fromEmail are required" });
    return;
  }

  const existing = await db.select().from(smtpConfigTable).limit(1);

  if (existing.length === 0) {
    const [row] = await db.insert(smtpConfigTable).values({
      host, port: Number(port), secure: !!secure,
      username, password, fromName, fromEmail,
      enabled: !!enabled, updatedAt: new Date(),
    }).returning();
    res.json({ ...row, password: row.password ? "••••••••" : "" });
  } else {
    const updateData: any = {
      host, port: Number(port), secure: !!secure,
      username, fromName, fromEmail,
      enabled: !!enabled, updatedAt: new Date(),
    };
    if (password && password !== "••••••••") {
      updateData.password = password;
    }
    const [row] = await db.update(smtpConfigTable).set(updateData).returning();
    res.json({ ...row, password: row.password ? "••••••••" : "" });
  }
});

router.post("/test", requireAdmin, async (req: Request, res: Response) => {
  const { host, port, secure, username, password, fromName, fromEmail, testRecipient } = req.body as {
    host: string; port: number; secure: boolean;
    username: string; password: string;
    fromName: string; fromEmail: string;
    testRecipient: string;
  };

  if (!testRecipient) {
    res.status(400).json({ error: "testRecipient is required" });
    return;
  }

  let resolvedPassword = password;
  if (password === "••••••••") {
    const existing = await db.select().from(smtpConfigTable).limit(1);
    resolvedPassword = existing[0]?.password ?? "";
  }

  const result = await testSmtpConnection({
    host, port: Number(port), secure: !!secure,
    username, password: resolvedPassword,
    fromName, fromEmail, testRecipient,
  });

  res.json(result);
});

export default router;
