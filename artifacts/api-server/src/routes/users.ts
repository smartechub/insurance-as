import { Router, type IRouter, type Request, type Response } from "express";
import bcryptjs from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!(req.session as any).userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: () => void) {
  if ((req.session as any).userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

router.get("/", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable);
  res.json(users.map(u => ({ ...u, createdAt: u.createdAt?.toISOString() })));
});

router.post("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }
  const hashed = await bcryptjs.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, email, password: hashed, role }).returning({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  });
  res.status(201).json({ ...user, createdAt: user.createdAt?.toISOString() });
});

router.put("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updates: any = {};
  if (req.body.name) updates.name = req.body.name;
  if (req.body.email) updates.email = req.body.email;
  if (req.body.role) updates.role = req.body.role;
  if (req.body.password) updates.password = await bcryptjs.hash(req.body.password, 10);
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  });
  res.json({ ...user, createdAt: user.createdAt?.toISOString() });
});

router.delete("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ message: "User deleted successfully" });
});

export default router;
