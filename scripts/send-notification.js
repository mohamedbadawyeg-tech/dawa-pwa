const admin = require('firebase-admin');
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const message = {
  topic: 'all_patients',
  notification: {
    title: 'تذكير صحتي 💊',
    body: 'حان موعد مراجعة أدويتك الآن. فضلاً افتح التطبيق للتأكيد.',
  },
  webpush: {
    fcmOptions: {
      link: 'https://eladwya-92754604-eb321.web.app'
    },
    notification: {
      icon: 'https://cdn-icons-png.flaticon.com/512/883/883356.png'
    }
  }
};

admin.messaging().send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
    process.exit(0);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
    process.exit(1);
  });
