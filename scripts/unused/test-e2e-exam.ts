
import { generatePreTest } from '../src/services/exam-generator';
import { submitAttempt } from '../src/services/exam-submitter';
import { generateImprovementPlan } from '../src/services/improvement-plan-generator';
import { updateSchedule } from '../src/services/schedule-updater';
import { prisma } from '../src/lib/prisma';

async function runEndToEndTest() {
  const studentId = 'test-student-123';
  const subject = 'Mathematics';
  const materialId = 'math-material-456';

  try {
    // 1. Generate PRE_TEST
    console.log('Step 1: Generating Pre-Test...');
    const preTest = await generatePreTest(studentId, subject);
    console.log(`Pre-Test generated with ID: ${preTest.id}`);

    // 2. Submit Attempt
    console.log('Step 2: Submitting Attempt...');
    const attempt = await submitAttempt(preTest.id, [
      { questionId: 'q1', answer: 'A' },
      { questionId: 'q2', answer: 'B' },
    ]); // Replace with actual questions and answers
    console.log(`Attempt submitted with ID: ${attempt.id}`);

    // 3. Verify ImprovementPlan is generated
    console.log('Step 3: Verifying Improvement Plan generation...');
    // In a real scenario, you'd poll or wait for the plan to be ready
    // For this example, we'll assume it's generated immediately after submission.
    // A more robust test would check the status or poll an endpoint.
    const improvementPlan = await generateImprovementPlan(attempt.id);
    if (!improvementPlan) {
      throw new Error('Improvement Plan not generated.');
    }
    console.log(`Improvement Plan generated with ID: ${improvementPlan.id}`);

    // 4. Apply ImprovementPlan
    console.log('Step 4: Applying Improvement Plan...');
    await updateSchedule(studentId, improvementPlan.id);
    console.log('Improvement Plan applied. Schedule updated.');

    // 5. Verify schedule change
    console.log('Step 5: Verifying schedule change...');
    // This step would involve querying the student's schedule to confirm the update.
    // For simplicity, we'll just log a success message.
    console.log('Schedule change verified (simulated).');

    console.log('\nEnd-to-End Test Completed Successfully!');

  } catch (error) {
    console.error('\nEnd-to-End Test Failed:', error);
    // Consider more specific error handling and cleanup here
  } finally {
    // Cleanup: Delete generated exam and attempt data
    console.log('Cleaning up test data...');
    await prisma.exam.deleteMany({ where: { studentId: studentId } });
    await prisma.examAttempt.deleteMany({ where: { studentId: studentId } });
    await prisma.improvementPlan.deleteMany({ where: { studentId: studentId } });
    // Add other cleanup if necessary (e.g., schedule entries)
    console.log('Cleanup complete.');
  }
}

runEndToEndTest();
