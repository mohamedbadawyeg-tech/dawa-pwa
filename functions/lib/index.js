"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRemoteReminder = exports.sendMedicationReminder = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();
// 1. Scheduled Reminder (Hourly)
exports.sendMedicationReminder = functions.pubsub.schedule('0 * * * *').onRun(async (context) => {
    console.log('Running hourly medication reminder check');
    const payload = {
        notification: {
            title: 'تذكير صحتي 💊',
            body: 'حان موعد مراجعة أدويتك الآن. فضلاً افتح التطبيق للتأكيد.',
            image: 'https://cdn-icons-png.flaticon.com/512/883/883356.png'
        },
        topic: 'all_patients'
    };
    try {
        const response = await admin.messaging().send(payload);
        console.log('Successfully sent message:', response);
    }
    catch (error) {
        console.log('Error sending message:', error);
    }
});
// 2. Real-time Caregiver Reminder Trigger
exports.onRemoteReminder = functions.firestore
    .document('patients/{patientId}')
    .onUpdate(async (change, context) => {
    var _a, _b;
    const newData = change.after.data();
    const previousData = change.before.data();
    const patientId = context.params.patientId;
    // Check if remoteReminder has changed
    const newReminder = newData.remoteReminder;
    const oldReminder = previousData.remoteReminder;
    if (!newReminder || (oldReminder && newReminder.timestamp === oldReminder.timestamp)) {
        return null; // No new reminder
    }
    // Only send if the reminder is recent (within last 30 seconds)
    if (Date.now() - newReminder.timestamp > 30000) {
        return null;
    }
    console.log(`Sending remote reminder to patient ${patientId} for medication: ${newReminder.medName}`);
    // Get the patient's FCM token
    const tokenDoc = await admin.firestore().collection('tokens').doc(patientId).get();
    if (!tokenDoc.exists || !((_a = tokenDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken)) {
        console.log(`No FCM token found for patient ${patientId}`);
        return null;
    }
    const fcmToken = (_b = tokenDoc.data()) === null || _b === void 0 ? void 0 : _b.fcmToken;
    const payload = {
        token: fcmToken,
        notification: {
            title: 'تذكير من المرافق �',
            body: `يا حاج ممدوح لا تنسى تناول ${newReminder.medName}`,
            image: 'https://cdn-icons-png.flaticon.com/512/883/883356.png'
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
        const response = await admin.messaging().send(payload);
        console.log('Successfully sent remote reminder:', response);
        return response;
    }
    catch (error) {
        console.error('Error sending remote reminder:', error);
        return null;
    }
});
//# sourceMappingURL=index.js.map