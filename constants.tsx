
import React from 'react';
import { Medication, TimeSlot } from './types';
import { Sun, Coffee, Utensils, CloudSun, Clock, Moon, Bed } from 'lucide-react';

// التاريخ الطبي الشامل للحاج ممدوح - يستخدم كمرجع للذكاء الاصطناعي
export const MEDICAL_HISTORY_SUMMARY = `🧾 ملخص التاريخ المرضي – الحاج ممدوح عبد العال
- السن: 75 سنة.
- الأمراض المزمنة: سكري، ضغط دم مرتفع، قصور بالشرايين التاجية.
- جراحات سابقة: تغيير صمام أورطي (صمام نسيجي).
- الحالة الأخيرة: دخول العناية المركزة بسبب ارتشاح رئوي قلبي (Cardiogenic Pulmonary Edema) وفشل تنفسي من النوع الأول.
- ملاحظات هامة: 
  * يمنع تماماً تناول دواء Neophilin (يسبب إجهاد للقلب).
  * يعاني من متلازمة قلبي-كلوية (تأثر الكلى بضعف القلب).
  * تاريخ من نقص الأكسجين (يحتاج متابعة SPO2 بدقة).
  * يتناول مميعات دم (Eliquis, Plavix) مما يزيد خطر النزيف.`;

export const MEDICAL_HISTORY_SUMMARY_EN = `🧾 Medical History Summary – Hajj Mamdouh Abdel Aal
- Age: 75 years.
- Chronic Diseases: Diabetes, Hypertension, Coronary Artery Insufficiency.
- Past Surgeries: Aortic Valve Replacement (Tissue Valve).
- Recent Status: ICU admission due to Cardiogenic Pulmonary Edema and Type 1 Respiratory Failure.
- Important Notes: 
  * Neophilin is strictly prohibited (causes cardiac stress).
  * Suffers from Cardiorenal Syndrome.
  * History of Hypoxia (requires strict SPO2 monitoring).
  * Taking blood thinners (Eliquis, Plavix) increasing bleeding risk.`;

// نصائح يومية متنوعة (عامة + تغذية)
export const DAILY_TIPS = [
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

export const DAILY_TIPS_EN = [
  "Mr. {name}, Healthy Breakfast: Half a brown loaf with cottage cheese and a boiled egg.. Enjoy.",
  "Mr. {name}, Avoid pickles and aged cheese for your blood pressure.. Your health is everything.",
  "Mr. {name}, Eat more vegetables like zucchini, beans, and peas.. Very beneficial for you.",
  "Mr. {name}, Avoid fried foods and excess ghee.. Boiled and grilled food is much lighter on the heart.",
  "Mr. {name}, Drink plenty of water throughout the day (at least 1.5 liters).. Your kidneys need water.",
  "Mr. {name}, Light dinner is better, light yogurt and fruit.. Good night.",
  "Mr. {name}, Take your medicine exactly on time.. Consistency is the secret to stability.",
  "Mr. {name}, Allowed fruits: Apple, Pear, Orange.. But don't overdo it (one or two at most).",
  "Mr. {name}, Avoid excess salt in food.. You can replace it with lemon and cumin for good taste.",
  "Mr. {name}, Licorice and carbonated drinks are strictly prohibited.. They are very dangerous for BP and sugar.",
  "Mr. {name}, Grilled fish twice a week is excellent for heart health.",
  "Mr. {name}, Divide your meals into 5 small meals instead of two large ones.. Easier on the stomach and heart.",
  "Mr. {name}, No sleeping immediately after eating.. Wait at least two hours.",
  "Mr. {name}, If you feel any shortness of breath or dizziness, rest immediately and check BP and Oxygen.",
  "Mr. {name}, Avoid strenuous physical effort.. Simple continuous movement is much better.",
  "Mr. {name}, Watch out for blood thinner timings (Eliquis and Plavix).. And check for any bruises.",
  "Mr. {name}, Vegetable soup with lemon and some cumin.. Medicine for cold and immunity booster.",
  "Mr. {name}, Sugar rises with stress.. Stay calm and happy always.",
  "Mr. {name}, Check your weight periodically.. If it increases suddenly, it might be fluid retention.",
  "Mr. {name}, Avoid processed meats like luncheon and pastrami.. Full of salt and fats.",
  "Mr. {name}, Fava beans are excellent for breakfast but avoid too much oil and salt.. Enjoy.",
  "Mr. {name}, A cup of yogurt before bed soothes the stomach and helps digestion."
];

// نظام الأكل المخصص للحالة
export const DIET_GUIDELINES = `🥗 نظام الأكل المخصص (قلب + رئة + ضغط + كُلى)

✅ الأكل المسموح:
- الفطار: عيش سن/بلدي (نصف رغيف)، بيضة مسلوقة، جبنة قريش، فول خفيف، زبادي لايت، شاي/قهوة خفيفة.
- الغداء: فراخ مسلوقة/مشوية، سمك مشوي (مرتين أسبوعياً)، لحمة حمراء مسلوقة (مرة أسبوعياً).
- الخضار: كوسة، فاصوليا خضراء، بسلة، جزر.
- الفاكهة (1-2 ثمرة): تفاح، كمثرى، برتقال، نصف موزة.
- السوائل: مياه 1.5 لتر يومياً.

❌ الممنوعات:
- ملح زيادة، مخللات، جبن قديمة/رومي.
- مقليات، كبدة، مخ، سمنة، شوربة لحمة ثقيلة.
- مشروبات غازية، عرقسوس.

⚠️ ملاحظات:
- الملح: أقل شيء ممكن.
- الطهي: مسلوق، مشوي، أو في الفرن فقط.
- 5 وجبات صغيرة أفضل من وجبتين كبار.
- النوم بعد الأكل مباشرة ممنوع.`;

export const DIET_GUIDELINES_EN = `🥗 Customized Diet (Heart + Lung + BP + Kidneys)

✅ Allowed Foods:
- Breakfast: Brown bread (half loaf), boiled egg, cottage cheese, light fava beans, light yogurt.
- Lunch: Boiled/Grilled chicken, Grilled fish (twice/week), Boiled red meat (once/week).
- Vegetables: Zucchini, Green beans, Peas, Carrots.
- Fruits (1-2 pieces): Apple, Pear, Orange, Half banana.
- Fluids: 1.5 Liters water daily.

❌ Prohibited:
- Excess salt, pickles, aged/Romy cheese.
- Fried foods, liver, brain, ghee, heavy meat soup.
- Carbonated drinks, licorice.

⚠️ Notes:
- Salt: Minimum possible.
- Cooking: Boiled, Grilled, or Oven only.
- 5 small meals are better than 2 large ones.
- Sleeping immediately after eating is prohibited.`;

export const MEDICATIONS: Medication[] = [
  { 
    id: 'examide', name: 'Examide 20 mg', dosage: 'قرص واحد', timeSlot: 'morning-fasting', 
    notes: 'مدر للبول - على معدة فارغة', isCritical: false, frequencyLabel: '7:00 صباحاً', category: 'other',
    sideEffects: ['دوخة', 'جفاف الفم', 'تشنج عضلات'],
    nameEn: 'Examide 20 mg', dosageEn: 'One tablet', notesEn: 'Diuretic - on empty stomach', frequencyLabelEn: '7:00 AM', sideEffectsEn: ['Dizziness', 'Dry mouth', 'Muscle cramps'],
    stock: 30, lowStockThreshold: 5
  },
  { 
    id: 'norvasc', name: 'Norvasc 10 mg', dosage: 'قرص واحد', timeSlot: 'morning-fasting', 
    notes: 'لضغط الدم', isCritical: false, frequencyLabel: '7:00 صباحاً', category: 'pressure',
    sideEffects: ['تورم القدمين', 'صداع', 'إرهاق'],
    nameEn: 'Norvasc 10 mg', dosageEn: 'One tablet', notesEn: 'For Blood Pressure', frequencyLabelEn: '7:00 AM', sideEffectsEn: ['Swollen feet', 'Headache', 'Fatigue'],
    stock: 30, lowStockThreshold: 5
  },
  { 
    id: 'contorloc', name: 'Contorloc 40 mg', dosage: 'قرص واحد', timeSlot: 'morning-fasting', 
    notes: 'لحموضة المعدة', isCritical: false, frequencyLabel: '7:00 صباحاً', category: 'stomach',
    sideEffects: ['إسهال', 'ألم بطن'],
    nameEn: 'Contorloc 40 mg', dosageEn: 'One tablet', notesEn: 'For Stomach Acidity', frequencyLabelEn: '7:00 AM', sideEffectsEn: ['Diarrhea', 'Abdominal pain'],
    stock: 20, lowStockThreshold: 5
  },
  { 
    id: 'corvid', name: 'Corvid 6.25 mg', dosage: 'نصف قرص', timeSlot: 'morning-fasting', 
    notes: 'لضغط الدم والقلب', isCritical: false, frequencyLabel: '7:00 صباحاً', category: 'pressure',
    sideEffects: ['تباطؤ نبض القلب', 'دوخة عند الوقوف'],
    nameEn: 'Corvid 6.25 mg', dosageEn: 'Half tablet', notesEn: 'For BP and Heart', frequencyLabelEn: '7:00 AM', sideEffectsEn: ['Slow heart rate', 'Dizziness on standing'],
    stock: 60, lowStockThreshold: 10
  },
  { 
    id: 'aldomet-1', name: 'Aldomet 250 mg', dosage: 'قرصين', timeSlot: 'after-breakfast', 
    notes: 'الجرعة الأولى (كل 8 ساعات)', isCritical: false, frequencyLabel: '9:00 صباحاً', category: 'pressure',
    sideEffects: ['نعاس', 'ضعف عام', 'جفاف فم'],
    nameEn: 'Aldomet 250 mg', dosageEn: 'Two tablets', notesEn: 'First Dose (Every 8 hours)', frequencyLabelEn: '9:00 AM', sideEffectsEn: ['Drowsiness', 'Weakness', 'Dry mouth'],
    stock: 50, lowStockThreshold: 10
  },
  { 
    id: 'eliquis-1', name: 'Eliquis 2.5 mg', dosage: 'قرص واحد', timeSlot: 'after-breakfast', 
    notes: 'مميع للدم - خطر نزيف', isCritical: true, frequencyLabel: '9:00 صباحاً', category: 'blood-thinner',
    sideEffects: ['نزيف لثة', 'كدمات زرقاء', 'نزيف أنف'],
    nameEn: 'Eliquis 2.5 mg', dosageEn: 'One tablet', notesEn: 'Blood Thinner - Bleeding Risk', frequencyLabelEn: '9:00 AM', sideEffectsEn: ['Gum bleeding', 'Blue bruises', 'Nose bleed'],
    stock: 28, lowStockThreshold: 5
  },
  { 
    id: 'acetyl-1', name: 'Acetyl Cysteine', dosage: 'كيس واحد', timeSlot: 'after-breakfast', 
    notes: 'مذيب للبلغم', isCritical: false, frequencyLabel: '9:00 صباحاً', category: 'other',
    sideEffects: ['غثيان'],
    nameEn: 'Acetyl Cysteine', dosageEn: 'One sachet', notesEn: 'Mucolytic', frequencyLabelEn: '9:00 AM', sideEffectsEn: ['Nausea'],
    stock: 14, lowStockThreshold: 3
  },
  { 
    id: 'forxiga', name: 'Forxiga 10 mg', dosage: 'قرص واحد', timeSlot: 'before-lunch', 
    notes: 'للسكري - اشرب مياه كافية', isCritical: false, frequencyLabel: '2:00 ظهراً', category: 'diabetes',
    sideEffects: ['تبول متكرر', 'عطش شديد'],
    nameEn: 'Forxiga 10 mg', dosageEn: 'One tablet', notesEn: 'For Diabetes - Drink enough water', frequencyLabelEn: '2:00 PM', sideEffectsEn: ['Frequent urination', 'Excessive thirst'],
    stock: 28, lowStockThreshold: 5
  },
  { 
    id: 'eraloner', name: 'Eraloner 25 mg', dosage: 'قرص واحد', timeSlot: 'afternoon', 
    notes: 'مضاد للاكتئاب/القلق', isCritical: false, frequencyLabel: '5:00 عصراً', category: 'other',
    sideEffects: ['جفاف فم', 'نعاس', 'تعرق'],
    nameEn: 'Eraloner 25 mg', dosageEn: 'One tablet', notesEn: 'Antidepressant/Anxiety', frequencyLabelEn: '5:00 PM', sideEffectsEn: ['Dry mouth', 'Drowsiness', 'Sweating'],
    stock: 30, lowStockThreshold: 5
  },
  { 
    id: 'aldomet-2', name: 'Aldomet 250 mg', dosage: 'قرصين', timeSlot: 'afternoon', 
    notes: 'الجرعة الثانية (بعد 8 ساعات)', isCritical: false, frequencyLabel: '5:00 عصراً', category: 'pressure',
    nameEn: 'Aldomet 250 mg', dosageEn: 'Two tablets', notesEn: 'Second Dose (After 8 hours)', frequencyLabelEn: '5:00 PM',
    stock: 50, lowStockThreshold: 10
  },
  { 
    id: 'cardura', name: 'Cardura 4 mg', dosage: 'قرص واحد', timeSlot: '6pm', 
    notes: 'لضغط الدم', isCritical: false, frequencyLabel: '6:00 مساءً', category: 'pressure',
    sideEffects: ['دوخة', 'خفقان قلب'],
    nameEn: 'Cardura 4 mg', dosageEn: 'One tablet', notesEn: 'For Blood Pressure', frequencyLabelEn: '6:00 PM', sideEffectsEn: ['Dizziness', 'Heart palpitations'],
    stock: 20, lowStockThreshold: 5
  },
  { 
    id: 'plavix', name: 'Plavix 75 mg', dosage: 'قرص واحد', timeSlot: 'after-dinner', 
    notes: 'مميع للدم - خطر نزيف عالي', isCritical: true, frequencyLabel: '8:00 مساءً', category: 'blood-thinner',
    sideEffects: ['نزيف طويل من الجروح', 'كدمات'],
    nameEn: 'Plavix 75 mg', dosageEn: 'One tablet', notesEn: 'Blood Thinner - High Bleeding Risk', frequencyLabelEn: '8:00 PM', sideEffectsEn: ['Prolonged bleeding', 'Bruises'],
    stock: 28, lowStockThreshold: 5
  },
  { 
    id: 'lipitor', name: 'Lipitor 40 mg', dosage: 'قرص واحد', timeSlot: 'after-dinner', 
    notes: 'للكوليسترول', isCritical: false, frequencyLabel: '8:00 مساءً', category: 'other',
    sideEffects: ['ألم عضلات', 'تعب'],
    nameEn: 'Lipitor 40 mg', dosageEn: 'One tablet', notesEn: 'For Cholesterol', frequencyLabelEn: '8:00 PM', sideEffectsEn: ['Muscle pain', 'Fatigue'],
    stock: 30, lowStockThreshold: 5
  },
  { 
    id: 'spiriva', name: 'Spiriva 18 mcg', dosage: 'بخة واحدة', timeSlot: 'after-dinner', 
    notes: 'بخاخة استنشاق', isCritical: false, frequencyLabel: '8:00 مساءً', category: 'other',
    sideEffects: ['جفاف حلق'],
    nameEn: 'Spiriva 18 mcg', dosageEn: 'One puff', notesEn: 'Inhaler', frequencyLabelEn: '8:00 PM', sideEffectsEn: ['Dry throat']
  },
  { 
    id: 'eliquis-2', name: 'Eliquis 2.5 mg', dosage: 'قرص واحد', timeSlot: 'before-bed', 
    notes: 'الجرعة المسائية', isCritical: true, frequencyLabel: '10:00 مساءً', category: 'blood-thinner',
    nameEn: 'Eliquis 2.5 mg', dosageEn: 'One tablet', notesEn: 'Evening Dose', frequencyLabelEn: '10:00 PM'
  },
  { 
    id: 'aldomet-3', name: 'Aldomet 250 mg', dosage: 'قرصين', timeSlot: 'before-bed', 
    notes: 'الجرعة الثالثة والأخيرة', isCritical: false, frequencyLabel: '10:00 مساءً', category: 'pressure',
    nameEn: 'Aldomet 250 mg', dosageEn: 'Two tablets', notesEn: 'Third and Last Dose', frequencyLabelEn: '10:00 PM'
  },
  { 
    id: 'acetyl-2', name: 'Acetyl Cysteine', dosage: 'كيس واحد', timeSlot: 'before-bed', 
    notes: 'الجرعة المسائية', isCritical: false, frequencyLabel: '10:00 مساءً', category: 'other',
    nameEn: 'Acetyl Cysteine', dosageEn: 'One sachet', notesEn: 'Evening Dose', frequencyLabelEn: '10:00 PM'
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  'pressure': 'text-blue-600',
  'diabetes': 'text-green-600',
  'blood-thinner': 'text-red-600',
  'antibiotic': 'text-purple-600',
  'stomach': 'text-orange-600',
  'other': 'text-slate-600'
};

export const SLOT_HOURS: Record<TimeSlot, number> = {
  'morning-fasting': 7,
  'after-breakfast': 9,
  'before-lunch': 14,
  'after-lunch': 15,
  'afternoon': 17,
  '6pm': 18,
  'after-dinner': 20,
  'before-bed': 22,
};

export const TIME_SLOT_CONFIG: Record<TimeSlot, { label: string, icon: React.ReactElement, color: string }> = {
  'morning-fasting': { label: 'morningFasting', icon: <Sun className="w-5 h-5" />, color: 'bg-yellow-50 border-yellow-200' },
  'after-breakfast': { label: 'afterBreakfast', icon: <Coffee className="w-5 h-5" />, color: 'bg-orange-50 border-orange-200' },
  'before-lunch': { label: 'beforeLunch', icon: <Utensils className="w-5 h-5" />, color: 'bg-green-50 border-green-200' },
  'after-lunch': { label: 'afterLunch', icon: <Utensils className="w-5 h-5" />, color: 'bg-blue-50 border-blue-200' },
  'afternoon': { label: 'afternoon', icon: <CloudSun className="w-5 h-5" />, color: 'bg-indigo-50 border-indigo-200' },
  '6pm': { label: 'sixPm', icon: <Clock className="w-5 h-5" />, color: 'bg-purple-50 border-purple-200' },
  'after-dinner': { label: 'afterDinner', icon: <Moon className="w-5 h-5" />, color: 'bg-slate-50 border-slate-200' },
  'before-bed': { label: 'beforeBed', icon: <Bed className="w-5 h-5" />, color: 'bg-cyan-50 border-cyan-200' },
};

export const SYMPTOMS = [
  'symptomHeadache', 'symptomDizziness', 'symptomNausea', 'symptomFatigue', 'symptomShortnessOfBreath', 'symptomChestPain', 'symptomCough', 'symptomJointPain', 'symptomBlurredVision', 
  'symptomDiarrhea', 'symptomConstipation', 'symptomSwellingFeet', 'symptomGumBleeding', 'symptomBruises', 'symptomTremors', 'symptomLossOfBalance', 'symptomItching', 'symptomUrineColorChange'
];
