
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// Tips Array
const DAILY_TIPS = [
  "يا حاج ممدوح، الفطار الصحي: نص رغيف بلدي مع جبنة قريش وبيضة مسلوقة.. بالهنا والشفا.",
  "يا حاج ممدوح، ابعد عن المخللات والجبنة الرومي والقديمة عشان الضغط.. صحتك بالدنيا.",
  "يا حاج ممدوح، كتر من الخضار زي الكوسة والفاصوليا والبسلة.. مفيدة جداً ليك.",
  "يا حاج ممدوح، بلاش مقليات وسمنة كتير.. الأكل المسلوق والمشوي أخف بكتير على القلب.",
  "يا حاج ممدوح، اشرب مياه كتير طول اليوم (لتر ونص على الأقل).. الكلى محتاجة مياه.",
  "يا حاج ممدوح، العشا خفيف أحسن، زبادي لايت وفاكهة.. وتصبح على خير.",
  "يا حاج ممدوح، خد علاجك في ميعاده بالظبط.. الانتظام هو سر استقرار الحالة.",
  "يا حاج ممدوح، الفاكهة المسموحة ليك: تفاح، كمثرى، برتقال.. بس بلاش تكتر (ثمرة أو اتنين بالكتير).",
  "يا حاج ممدوح، ممنوع الملح الزيادة في الأكل.. ممكن تستبدله بليمون وكمون لطعم حلو.",
  "يا حاج ممدوح، ممنوع تماماً العرقسوس والمشروبات الغازية.. دول خطر جداً على الضغط والسكر.",
  "يا حاج ممدوح، السمك المشوي مرتين في الأسبوع ممتاز لصحة القلب.",
  "يا حاج ممدوح، قسم وجباتك على 5 وجبات صغيرة بدل وجبتين كبار.. أريح للمعدة والقلب.",
  "يا حاج ممدوح، ممنوع النوم بعد الأكل مباشرة.. استنى ساعتين على الأقل.",
  "يا حاج ممدوح، لو حسيت بأي نهجان أو دوخة، ريح فوراً وقيس الضغط والأكسجين.",
  "يا حاج ممدوح، بلاش مجهود بدني عنيف.. الحركة البسيطة المستمرة أحسن بكتير.",
  "يا حاج ممدوح، خلي بالك من مواعيد دواء السيولة (Eliquis و Plavix).. ولازم تتابع لو فيه أي كدمات.",
  "يا حاج ممدوح، شوربة الخضار بليمون وشوية كمون.. دواء للبرد ومقوية للمناعة.",
  "يا حاج ممدوح، السكر بيعلى من الزعل.. خليك رايق ومبسوط دايماً.",
  "يا حاج ممدوح، تابع وزنك كل فترة.. لو زاد فجأة ممكن يكون ارتشاح سوائل.",
  "يا حاج ممدوح، بلاش اللحوم المصنعة زي اللانشون والبسطرمة.. كلها ملح ودهون.",
  "يا حاج ممدوح، الفول المدمس ممتاز في الفطار بس بلاش زيت كتير وملح.. وبالهنا.",
  "يا حاج ممدوح، كوباية زبادي قبل النوم بتريح المعدة وبتساعد على الهضم."
];

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
  
  // Get random tip
  const randomTip = DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)];
  console.log('Selected tip:', randomTip);

  // Get all tokens
  // Note: In a real app we might want to batch this or use topics, 
  // but for this scale getting all tokens is fine.
  const tokensSnapshot = await db.collection('tokens').get();
  
  let successCount = 0;
  let failureCount = 0;

  const promises = tokensSnapshot.docs.map(async (doc) => {
    const data = doc.data();
    if (data.fcmToken) {
      const payload = {
        token: data.fcmToken,
        notification: {
          title: 'نصيحة اليوم 💡',
          body: randomTip
        },
        data: {
          type: 'tip', // Marker for client to handle silently
          url: '/'
        },
        android: {
          priority: 'normal',
          notification: {
            channelId: 'tips_channel',
            sound: 'default' // We'll try to handle silence on client or use a silent channel if possible, 
                             // but 'default' is safe fallback. Client code will suppress app sound.
          }
        },
        webpush: {
          headers: {
            Urgency: 'normal'
          },
          notification: {
            silent: true, // Request silent notification for web
            renotify: false,
            requireInteraction: false
          }
        }
      };

      try {
        await admin.messaging().send(payload);
        successCount++;
      } catch (err) {
        console.error(`Failed to send to token ${doc.id}:`, err.message);
        failureCount++;
      }
    }
  });

  await Promise.all(promises);
  
  console.log(`Finished sending tips. Success: ${successCount}, Failed: ${failureCount}`);
  process.exit(0);
}

send();
