import bcrypt from "bcryptjs";
import fs from "fs";

async function main() {
  const env = fs.readFileSync(".env", "utf8");
  const m = env.match(/^ADMIN_PASSWORD_HASH=(.+)$/m);
  const hash = m ? m[1].replace(/\\\$/g, "$") : null;
  console.log("hash found:", !!hash);

  if (hash) {
    const candidates = ["belajar123", "admin123", "admin", "tutor123", "password", "senangbelajar", "admin1234", "Admin123", "admin@123", "12345678"];
    let matched = false;
    for (const c of candidates) {
      try {
        const ok = await bcrypt.compare(c, hash);
        if (ok) {
          console.log("COCOK:", c);
          matched = true;
        }
      } catch (e) {
        console.log("err compare", c, (e as Error).message);
      }
    }
    if (!matched) console.log("Tidak ada kandidat yang cocok");
    console.log("done");
  }
}

main().finally(() => process.exit(0));
