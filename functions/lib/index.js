"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMedicationReminder = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();
exports.sendMedicationReminder = functions.pubsub.schedule('0 * * * *').onRun(async (context) => {
    console.log('Running hourly medication reminder check');
    // Here you can add logic to query Firestore for patients who need reminders
    // For now, we will just send to a topic
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
//# sourceMappingURL=index.js.map