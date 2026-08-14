import { sendExamRecap } from "../src/services/exam-scheduler";

async function main() {
  const ok = await sendExamRecap("9375e21d-5e40-4a8e-a4c0-4eff403344ae");
  console.log("recap terkirim ke student:", ok);
}
main().finally(() => process.exit(0));
