
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// Tips Array
const DAILY_TIPS = [
  "يا {name}، الفطار الصحي: نص رغيف بلدي مع جبنة قريش وبيضة مسلوقة.. بالهنا والشفا.",
  "يا {name}، ابعد عن المخللات والجبنة الرومي والقديمة عشان الضغط.. صحتك بالدنيا.",
  "يا {name}، كتر من الخضار زي الكوسة والفاصوليا والبسلة.. مفيدة جداً ليك.",
  "يا {name}، بلاش مقليات وسمنة كتير.. الأكل المسلوق والمشوي أخف بكتير على القلب.",
  "يا {name}، اشرب مياه كتير طول اليوم (لتر ونص على الأقل).. الكلى محتاجة مياه.",
  "يا {name}، العشا خفيف أحسن، زبادي لايت وفاكهة.. وتصبح على خير.",
  "يا {name}، خد علاجك في ميعاده بالظبط.. الانتظام هو سر استقرار الحالة.",
  "يا {name}، الفاكهة المسموحة ليك: تفاح، كمثرى، برتقال.. بس بلاش تكتر (ثمرة أو اتنين بالكتير).",
  "يا {name}، ممنوع الملح الزيادة في الأكل.. ممكن تستبدله بليمون وكمون لطعم حلو.",
  "يا {name}، ممنوع تماماً العرقسوس والمشروبات الغازية.. دول خطر جداً على الضغط والسكر.",
  "يا {name}، السمك المشوي مرتين في الأسبوع ممتاز لصحة القلب.",
  "يا {name}، قسم وجباتك على 5 وجبات صغيرة بدل وجبتين كبار.. أريح للمعدة والقلب.",
  "يا {name}، ممنوع النوم بعد الأكل مباشرة.. استنى ساعتين على الأقل.",
  "يا {name}، لو حسيت بأي نهجان أو دوخة، ريح فوراً وقيس الضغط والأكسجين.",
  "يا {name}، بلاش مجهود بدني عنيف.. الحركة البسيطة المستمرة أحسن بكتير.",
  "يا {name}، خلي بالك من مواعيد دواء السيولة (Eliquis و Plavix).. ولازم تتابع لو فيه أي كدمات.",
  "يا {name}، شوربة الخضار بليمون وشوية كمون.. دواء للبرد ومقوية للمناعة.",
  "يا {name}، السكر بيعلى من الزعل.. خليك رايق ومبسوط دايماً.",
  "يا {name}، تابع وزنك كل فترة.. لو زاد فجأة ممكن يكون ارتشاح سوائل.",
  "يا {name}، بلاش اللحوم المصنعة زي اللانشون والبسطرمة.. كلها ملح ودهون.",
  "يا {name}، الفول المدمس ممتاز في الفطار بس بلاش زيت كتير وملح.. وبالهنا.",
  "يا {name}، كوباية زبادي قبل النوم بتريح المعدة وبتساعد على الهضم."
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

  // Get all patients to map names
  const patientsSnapshot = await db.collection('patients').get();
  const patientNames = {};
  patientsSnapshot.forEach(doc => {
    patientNames[doc.id] = doc.data().name || "حاج/ة";
  });

  // Get all tokens
  const tokensSnapshot = await db.collection('tokens').get();
  
  let successCount = 0;
  let failureCount = 0;

  const promises = tokensSnapshot.docs.map(async (doc) => {
    const data = doc.data();
    const patientId = doc.id; // Assuming token doc ID is patientId
    const name = patientNames[patientId] || "حاج/ة";
    const personalizedTip = randomTip.replace('{name}', name);

    if (data.fcmToken) {
      const payload = {
        token: data.fcmToken,
        notification: {
          title: 'نصيحة اليوم 💡',
          body: personalizedTip
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
