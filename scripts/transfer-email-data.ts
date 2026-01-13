
// npx tsx scripts/transfer-email-data.ts old-user@example.com new-user@example.com 
import { db, pool } from '../lib/db';
import { 
  brandprofile, 
  brandAnalyses, 
  conversations, 
  messages, 
  messageFeedback, 
  aeoReports,
  notifications
} from '../lib/db/schema';
import { fileGenerationJobs } from '../lib/db/schema.files';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const args = process.argv.slice(2);
  const sourceEmail = args[0];
  const targetEmail = args[1];

  if (!sourceEmail || !targetEmail) {
    console.error('Usage: tsx scripts/transfer-email-data.ts <source-email> <target-email>');
    process.exit(1);
  }

  console.log(`Copying data from ${sourceEmail} to ${targetEmail}...`);

  try {
    // 1. Get User IDs
    // We access the "user" table directly via SQL because it's managed by Better Auth and not in our Drizzle schema
    const userRes = await pool.query('SELECT id, email FROM "user" WHERE email = $1 OR email = $2', [sourceEmail, targetEmail]);
    
    const sourceUser = userRes.rows.find(u => u.email === sourceEmail);
    const targetUser = userRes.rows.find(u => u.email === targetEmail);

    if (!sourceUser) {
      console.error(`Source user not found: ${sourceEmail}`);
      process.exit(1);
    }
    if (!targetUser) {
      console.error(`Target user not found: ${targetEmail}`);
      process.exit(1);
    }

    const sourceUserId = sourceUser.id;
    const targetUserId = targetUser.id;

    console.log(`Source User ID: ${sourceUserId}`);
    console.log(`Target User ID: ${targetUserId}`);

    // 2. Copy Data
    
    // Brand Profiles
    const sourceProfiles = await db.select().from(brandprofile).where(eq(brandprofile.userId, sourceUserId));
    let profileCount = 0;
    for (const profile of sourceProfiles) {
      try {
        const { id, createdAt, updatedAt, ...rest } = profile;
        await db.insert(brandprofile).values({
          ...rest,
          userId: targetUserId
        }).onConflictDoNothing();
        profileCount++;
      } catch (e) {
        console.error(`Failed to copy profile ${profile.url}:`, e);
      }
    }
    console.log(`Copied ${profileCount} brand profiles.`);

    // Brand Analyses
    const sourceAnalyses = await db.select().from(brandAnalyses).where(eq(brandAnalyses.userId, sourceUserId));
    let analysisCount = 0;
    for (const analysis of sourceAnalyses) {
      try {
        const { id, createdAt, updatedAt, ...rest } = analysis;
        await db.insert(brandAnalyses).values({
          ...rest,
          userId: targetUserId
        });
        analysisCount++;
      } catch (e) {
        console.error(`Failed to copy analysis for ${analysis.url}:`, e);
      }
    }
    console.log(`Copied ${analysisCount} brand analyses.`);

    // Conversations, Messages, and Feedback
    const sourceConvs = await db.select().from(conversations).where(eq(conversations.userId, sourceUserId));
    let convCount = 0;
    let msgCount = 0;
    let fbCount = 0;

    for (const conv of sourceConvs) {
      try {
        const { id: oldConvId, createdAt, updatedAt, ...restConv } = conv;
        
        // Insert new conversation
        const [newConv] = await db.insert(conversations).values({
          ...restConv,
          userId: targetUserId
        }).returning({ id: conversations.id });
        
        if (!newConv) continue;
        convCount++;

        // Get messages for this conv
        const sourceMsgs = await db.select().from(messages).where(eq(messages.conversationId, oldConvId));
        
        for (const msg of sourceMsgs) {
          const { id: oldMsgId, createdAt: msgCreatedAt, ...restMsg } = msg;
          
          // Insert new message linked to new conv
          const [newMsg] = await db.insert(messages).values({
            ...restMsg,
            conversationId: newConv.id,
            userId: targetUserId
          }).returning({ id: messages.id });

          if (!newMsg) continue;
          msgCount++;

          // Get feedback for this message
          const sourceFb = await db.select().from(messageFeedback).where(eq(messageFeedback.messageId, oldMsgId));
          
          for (const fb of sourceFb) {
            const { id, createdAt, ...restFb } = fb;
            await db.insert(messageFeedback).values({
              ...restFb,
              messageId: newMsg.id,
              userId: targetUserId
            });
            fbCount++;
          }
        }
      } catch (e) {
        console.error(`Failed to copy conversation ${conv.id}:`, e);
      }
    }
    console.log(`Copied ${convCount} conversations, ${msgCount} messages, and ${fbCount} feedbacks.`);

    // AEO Reports
    const sourceAeo = await db.select().from(aeoReports).where(eq(aeoReports.userId, sourceUserId));
    let aeoCount = 0;
    for (const report of sourceAeo) {
      try {
        const { id, createdAt, ...rest } = report;
        await db.insert(aeoReports).values({
          ...rest,
          userId: targetUserId,
          userEmail: targetEmail
        });
        aeoCount++;
      } catch (e) {
        console.error(`Failed to copy AEO report ${report.id}:`, e);
      }
    }
    console.log(`Copied ${aeoCount} AEO reports.`);

    // File Generation Jobs
    const sourceFiles = await db.select().from(fileGenerationJobs).where(eq(fileGenerationJobs.userId, sourceUserId));
    let fileCount = 0;
    for (const job of sourceFiles) {
      try {
        const { id, createdAt, updatedAt, ...rest } = job;
        await db.insert(fileGenerationJobs).values({
          ...rest,
          userId: targetUserId,
          userEmail: targetEmail
        });
        fileCount++;
      } catch (e) {
        console.error(`Failed to copy file job ${job.id}:`, e);
      }
    }
    console.log(`Copied ${fileCount} file generation jobs.`);

    // Notifications
    const sourceNotifs = await db.select().from(notifications).where(eq(notifications.userId, sourceUserId));
    let notifCount = 0;
    for (const notif of sourceNotifs) {
      try {
        const { id, createdAt, ...rest } = notif;
        await db.insert(notifications).values({
          ...rest,
          userId: targetUserId,
          userEmail: targetEmail
        });
        notifCount++;
      } catch (e) {
        console.error(`Failed to copy notification ${notif.id}:`, e);
      }
    }
    console.log(`Copied ${notifCount} notifications.`);

    console.log('-----------------------------------');
    console.log('Copy complete successfully.');

  } catch (error) {
    console.error('Error executing copy:', error);
  } finally {
    // Close the pool to allow the script to exit
    await pool.end();
  }
}

main();
