const admin = require('firebase-admin');
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const patientId = process.env.PATIENT_ID;
const medName = process.env.MED_NAME;

async function send() {
  if (!patientId || !medName) {
    console.error('Missing PATIENT_ID or MED_NAME');
    process.exit(1);
  }

  const db = admin.firestore();
  const tokenDoc = await db.collection('tokens').doc(patientId).get();

  if (!tokenDoc.exists || !tokenDoc.data().fcmToken) {
    console.error('No token found for patient');
    process.exit(1);
  }

  const token = tokenDoc.data().fcmToken;

  const message = {
    token: token,
    notification: {
      title: 'تذكير من المرافق 🔔',
      body: `يا حاج ممدوح لا تنسى تناول ${medName}`,
    },
    webpush: {
      fcmOptions: {
        link: 'https://eladwya-92754604-eb321.web.app'
      },
       notification: {
            icon: 'https://cdn-icons-png.flaticon.com/512/883/883356.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/883/883356.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            actions: [
                {
                    action: 'confirm',
                    title: '✅ تم التناول'
                }
            ]
        }
    }
  };

  try {
    await admin.messaging().send(message);
    console.log('Sent successfully');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

send();
