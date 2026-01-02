import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let serviceAccount;

try {
  const fileContent = await readFile(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(fileContent);
} catch (error) {
  console.error('Failed to read service account file:', error);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function send() {
  const db = admin.firestore();
  
  // Get all patients
  const patientsSnapshot = await db.collection('patients').get();
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  for (const doc of patientsSnapshot.docs) {
    const patientData = doc.data();
    const patientId = doc.id;

    // Check medications
    if (patientData.medications && Array.isArray(patientData.medications)) {
      for (const med of patientData.medications) {
        // Skip if time is missing
        if (!med.time) {
          console.warn(`Skipping medication ${med.name || 'unknown'} for patient ${patientId}: Missing time`);
          continue;
        }

        try {
            // Parse time (e.g., "14:30")
            const [hour, minute] = med.time.split(':').map(Number);
            
            // Check if it's time (within last 15 mins to be safe)
            if (hour === currentHour && Math.abs(minute - currentMinute) < 15) {
                const tokenDoc = await db.collection('tokens').doc(patientId).get();
                if (tokenDoc.exists && tokenDoc.data().fcmToken) {
                    const token = tokenDoc.data().fcmToken;
                    const payload = {
                        token: token,
                        notification: {
                            title: 'وقت الدواء 💊',
                            body: `حان موعد أخذ دواء: ${med.name}`
                        }
                    };
                    await admin.messaging().send(payload);
                    console.log(`Sent reminder for ${med.name} to ${patientData.name}`);
                }
            }
        } catch (err) {
            console.error(`Error processing medication for patient ${patientId}:`, err);
        }
      }
    }
  }
  process.exit(0);
}

send();
