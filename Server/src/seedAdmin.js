import { User } from "./models/user.model.js";

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before creating an administrator");
    }
    if (adminPassword.length < 16) {
      throw new Error("ADMIN_PASSWORD must be at least 16 characters");
    }
    const existingAdmin = await User.findByEmail(adminEmail);

    if (!existingAdmin) {
      console.log("Creating Admin User...");
      await User.create({
        firstName: "Admin",
        lastName: "User",
        email: adminEmail,
        password: adminPassword,
        role: "admin"
      });
      console.log("✅ Admin user created successfully!");
    } else {
      if (existingAdmin.role !== "admin") throw new Error("ADMIN_EMAIL belongs to a customer account");
      console.log("ℹ️ Admin user already exists.");
    }
  } catch (error) {
    console.error("❌ Error seeding admin:", error.message);
    throw error;
  }
};

export default seedAdmin;
