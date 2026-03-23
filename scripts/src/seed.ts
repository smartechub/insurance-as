import { db } from "@workspace/db";
import { usersTable, claimsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcryptjs from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const adminPass = await bcryptjs.hash("admin123", 10);
  const userPass = await bcryptjs.hash("user123", 10);

  const [admin] = await db
    .insert(usersTable)
    .values({ name: "Admin User", email: "admin@company.com", password: adminPass, role: "admin" })
    .onConflictDoNothing()
    .returning();

  const [employee] = await db
    .insert(usersTable)
    .values({ name: "John Employee", email: "john@company.com", password: userPass, role: "user" })
    .onConflictDoNothing()
    .returning();

  console.log("Users seeded:", { admin: admin?.email ?? "already exists", employee: employee?.email ?? "already exists" });

  const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@company.com"));
  const adminId = adminUser?.id;

  if (adminId) {
    await db.insert(claimsTable).values([
      {
        employeeId: "EMP001",
        employeeName: "John Employee",
        assetCode: "ASSET-001",
        assetType: "Laptop",
        serialNo: "SN-LAP-001",
        damageDate: "15-01-2026",
        repairDate: "20-01-2026",
        effectedPart: "Screen",
        caseId: "CASE-2026-001",
        payableAmount: "25000",
        recoverAmount: "20000",
        fileCharge: "500",
        claimStatus: "Settled",
        employeeFileChargeStatus: "Settled",
        remark: "Screen replacement completed successfully",
        createdBy: adminId,
      },
      {
        employeeId: "EMP002",
        employeeName: "Jane Smith",
        assetCode: "ASSET-002",
        assetType: "Desktop",
        serialNo: "SN-DES-002",
        damageDate: "01-02-2026",
        effectedPart: "Hard Drive",
        caseId: "CASE-2026-002",
        payableAmount: "8000",
        fileCharge: "200",
        claimStatus: "Processing",
        employeeFileChargeStatus: "Pending",
        remark: "Under technical review",
        createdBy: adminId,
      },
      {
        employeeId: "EMP003",
        employeeName: "Bob Wilson",
        assetCode: "ASSET-003",
        assetType: "Laptop",
        serialNo: "SN-LAP-003",
        damageDate: "10-03-2026",
        effectedPart: "Battery",
        caseId: "CASE-2026-003",
        payableAmount: "5000",
        fileCharge: "150",
        claimStatus: "Pending",
        employeeFileChargeStatus: "Pending",
        remark: "Awaiting approval",
        createdBy: adminId,
      },
      {
        employeeId: "EMP001",
        employeeName: "John Employee",
        assetCode: "ASSET-004",
        assetType: "Other",
        serialNo: "SN-OTHER-004",
        damageDate: "05-03-2026",
        effectedPart: "Power Adapter",
        caseId: "CASE-2026-004",
        payableAmount: "2500",
        fileCharge: "100",
        claimStatus: "Approved",
        employeeFileChargeStatus: "Pending",
        remark: "Approved for replacement",
        createdBy: adminId,
      },
    ]).onConflictDoNothing();
    console.log("Sample claims seeded");
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
