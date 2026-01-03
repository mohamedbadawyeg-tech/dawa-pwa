
import { GoogleGenAI, Type } from "@google/genai";
import { AppState, AIAnalysisResult } from "../types";

const getApiKey = () => {
  const key = process.env.API_KEY || localStorage.getItem('gemini_api_key');
  if (!key) throw new Error("API Key is missing. Please add it in Settings.");
  return key;
};

export const generateDailyHealthTip = async (state: AppState, language: string = 'ar'): Promise<string> => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const report = state.currentReport;
    
    const isEn = language === 'en';
    const patientName = state.patientName || (isEn ? "Sir/Madam" : "الحاج ممدوح");

    const prompt = isEn ? `
      You are a smart, friendly medical assistant, expert in dealing with the elderly. Patient: "${patientName}" (${state.patientAge} years).
      Condition: ${state.medicalHistorySummary}.
      Recent Vitals: BP ${report.systolicBP}/${report.diastolicBP}, Sugar ${report.bloodSugar}.
      
      Task: Write ONE medical or preventive tip (under 15 words) in friendly, respectful English.
      Golden Rule: Must start with "Mr./Mrs. ${patientName}, ..."
      Example: "Mr. Mamdouh, your BP is a bit high, avoid pickles at lunch and drink plenty of water."
    ` : `
      أنت مساعد طبي ذكي، ودود جداً، وخبير في التعامل مع كبار السن. المريض هو "${patientName}" (${state.patientAge} سنة).
      الحالة: ${state.medicalHistorySummary}.
      القياسات الأخيرة: ضغط ${report.systolicBP}/${report.diastolicBP}، سكر ${report.bloodSugar}.
      
      المطلوب: اكتب نصيحة طبية أو وقائية واحدة (أقل من 15 كلمة) باللهجة المصرية العامية الحنونة والمحترمة.
      القاعدة الذهبية: يجب أن يبدأ النص بعبارة "يا ${patientName}، ..." 
      مثال: "يا حاج ممدوح، الضغط عالي شوية النهاردة، بلاش مخلل مع الغدا واشرب مياه كتير."
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: { temperature: 0.7 }
    });
    return response.text?.trim() || (isEn ? `Mr. ${patientName}, have a great day.. Don't forget to drink water and take your meds.` : `يا ${patientName}، صباحك زي الفل.. متنساش تشرب مياه كتير وتاخد علاجك في ميعاده.`);
  } catch (e) {
    console.error("Gemini Tip Error:", e);
    return language === 'en' ? "Have a nice day.. Rest well and remember your medications." : "يومك جميل بإذن الله.. خذ قسطاً من الراحة ولا تنسى مواعيد الأدوية.";
  }
};

export const analyzeHealthStatus = async (state: AppState, language: string = 'ar'): Promise<AIAnalysisResult> => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const report = state.currentReport;
    const isEn = language === 'en';
    
    // Process previous reports (last 3 days)
    const sortedDates = Object.keys(state.dailyReports || {}).sort().reverse().slice(0, 3);
    const previousReportsSummary = sortedDates.map(date => {
        const dayData = state.dailyReports[date];
        const medsTakenCount = Object.values(dayData.takenMedications || {}).filter(v => v).length;
        const totalMeds = state.medications.length; 
        return isEn 
          ? `- Day ${date}: BP ${dayData.report.systolicBP || '?'} / ${dayData.report.diastolicBP || '?'}, Sugar ${dayData.report.bloodSugar || '?'}, Meds: ${medsTakenCount}/${totalMeds}`
          : `- يوم ${date}: ضغط ${dayData.report.systolicBP || '?'} / ${dayData.report.diastolicBP || '?'}, سكر ${dayData.report.bloodSugar || '?'}, أدوية تم أخذها: ${medsTakenCount}/${totalMeds}`;
    }).join('\n');

    // Process today's medication status
    const todayTakenCount = Object.values(state.takenMedications || {}).filter(v => v).length;
    const totalMedsCount = state.medications.length;
    const notTakenMeds = state.medications.filter(m => !state.takenMedications[m.id]).map(m => isEn ? (m.nameEn || m.name) : m.name).join(isEn ? ', ' : '، ');

    const prompt = isEn ? `Analyze health status for ${state.patientName} based on:
      1. Current Vitals: BP ${report.systolicBP}/${report.diastolicBP}, Sugar ${report.bloodSugar}, Oxygen ${report.oxygenLevel}%, HR ${report.heartRate}.
      2. Symptoms: ${report.symptoms.join(', ')}
      3. Medical History: ${state.medicalHistorySummary}
      4. Upcoming Procedures: ${state.upcomingProcedures || 'None'}
      5. Meds Today: Taken ${todayTakenCount} of ${totalMedsCount}.
         - Pending: ${notTakenMeds || 'None, all taken'}
      6. Daily Report Details:
         - Pain: ${report.painLevel}/10
         - Mood: ${report.mood || 'N/A'}
         - Sleep: ${report.sleepQuality || 'N/A'}
         - Appetite: ${report.appetite || 'N/A'}
         - Notes: ${report.notes || 'None'}
      7. Previous Days Summary:
      ${previousReportsSummary || 'No prior data'}
      
      Required Output (JSON):
      1. recommendations: 3-5 practical medical/preventive tips.
      2. warnings: Clear warnings if dangerous signs exist (high BP/Sugar) or deterioration.
      3. positivePoints: Positive health signs (stable oxygen, regular pulse, adherence).
      
      Keep tone professional but easy to understand.` : `قم بتحليل الحالة الصحية للحاج ممدوح بناءً على:
      1. القياسات الحالية (اليوم): ضغط ${report.systolicBP}/${report.diastolicBP}، سكر ${report.bloodSugar}، أكسجين ${report.oxygenLevel}%، نبض ${report.heartRate}.
      2. الأعراض الحالية: ${report.symptoms.join(', ')}
      3. التاريخ المرضي: ${state.medicalHistorySummary}
      4. الاجراءات الطبية القادمة: ${state.upcomingProcedures || 'لا يوجد'}
      5. حالة الأدوية اليوم: تم أخذ ${todayTakenCount} من ${totalMedsCount}.
         - أدوية لم يتم أخذها بعد: ${notTakenMeds || 'لا يوجد، تم أخذ جميع الأدوية'}
      6. تفاصيل التقرير اليومي الإضافية:
         - مستوى الألم: ${report.painLevel}/10
         - الحالة المزاجية: ${report.mood || 'غير مسجل'}
         - جودة النوم: ${report.sleepQuality || 'غير مسجل'}
         - الشهية: ${report.appetite || 'غير مسجل'}
         - ملاحظات إضافية: ${report.notes || 'لا يوجد'}
      7. ملخص الأيام السابقة (هام للتحليل التراكمي):
      ${previousReportsSummary || 'لا توجد بيانات سابقة'}
      
      المطلوب:
      1. 3-5 توصيات طبية أو وقائية عملية ومباشرة (مع مراعاة الاتجاهات في الأيام السابقة وحالة الأدوية).
      2. تحذيرات واضحة إذا كانت هناك مؤشرات خطرة (مثل ارتفاع الضغط أو السكر) أو تدهور مقارنة بالأيام السابقة أو إهمال في الأدوية.
      3. نقاط إيجابية في الحالة الصحية (مثل استقرار الأكسجين أو انتظام النبض أو الالتزام بالدواء).
      
      اجعل الأسلوب مهنياً ولكن سهلاً للفهم.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["recommendations", "warnings", "positivePoints"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text) as AIAnalysisResult;
  } catch (e: any) {
    console.error("Analysis Error:", e);
    if (e.message?.includes("API Key is missing")) {
        throw e; // Propagate specific error
    }
    if (e.message?.includes("404") || e.message?.includes("NOT_FOUND")) {
        const msg = language === 'en' 
          ? "Sorry, current AI key doesn't support this model. Please enable Generative Language API or get a new key from Google AI Studio."
          : "عذراً، مفتاح الذكاء الاصطناعي الحالي لا يدعم هذا الموديل. يرجى التأكد من تفعيل Generative Language API أو استخدام مفتاح جديد من Google AI Studio.";
        throw new Error(msg);
    }
    const msg = language === 'en' ? "Error communicating with AI expert: " : "حدث خطأ في التواصل مع خبير الذكاء الاصطناعي: ";
    throw new Error(msg + (e.message || e.toString()));
  }
};

export const getMedicationDetails = async (medName: string, patientProfile: string, language: string = 'ar'): Promise<{ sideEffects: string[], warnings: string[] }> => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const isEn = language === 'en';
    
    const prompt = isEn ? `
      You are an expert pharmacist. Patient: ${patientProfile}.
      Medication: ${medName}.
      Task:
      1. List 3-5 common side effects for this medication (in English).
      2. Very important warnings (e.g., food interactions, drug interactions, contraindications).
      
      Response must be JSON only:
      {
        "sideEffects": ["Effect 1", "Effect 2"],
        "warnings": ["Warning 1", "Warning 2"]
      }
    ` : `
      أنت صيدلي خبير. المريض: ${patientProfile}.
      الدواء: ${medName}.
      المطلوب:
      1. قائمة بأهم 3-5 آثار جانبية شائعة لهذا الدواء (بالعربية).
      2. تحذيرات هامة جداً عند تناوله (مثل التفاعلات مع الطعام أو أدوية أخرى، أو حالات يمنع فيها استخدامه).
      
      الرد يجب أن يكون JSON فقط بهذا الشكل:
      {
        "sideEffects": ["أثر 1", "أثر 2"],
        "warnings": ["تحذير 1", "تحذير 2"]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sideEffects: { type: Type.ARRAY, items: { type: Type.STRING } },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    return JSON.parse(response.text!) as { sideEffects: string[], warnings: string[] };
  } catch (e) {
    console.error("Med Info Error:", e);
    return language === 'en' 
      ? { sideEffects: ["No info available currently"], warnings: ["Please consult a doctor"] }
      : { sideEffects: ["لا توجد معلومات متاحة حالياً"], warnings: ["يرجى استشارة الطبيب"] };
  }
};

export const generateReminderMessage = async (medName: string, patientName: string, language: string = 'ar'): Promise<string> => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const isEn = language === 'en';
    
    const prompt = isEn ? `
      Patient: ${patientName} (Elderly).
      Condition: Forgot medication ${medName}.
      Task: ONE short friendly voice reminder sentence (in English) encouraging them to take it now.
      Example: "Mr. Mamdouh, you forgot your BP meds, please take them for your health."
      Max 15 words.
    ` : `
      المريض: ${patientName} (كبير في السن، مصري).
      الحالة: نسي دواء ${medName}.
      المطلوب: جملة تذكير صوتية واحدة (باللهجة المصرية الودودة جداً) تشجعه على أخذ الدواء الآن لأجل صحته.
      مثال: "يا حاج ممدوح، معلش نسيت دواء الضغط، ياريت تاخده عشان صحتك تهمنا."
      لا تزيد عن 15 كلمة.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Use faster model for TTS text
      contents: prompt,
      config: { temperature: 0.7 }
    });

    return response.text?.trim() || (isEn ? `Mr. ${patientName}, please don't forget your ${medName}.` : `يا ${patientName}، من فضلك لا تنسى دواء ${medName}.`);
  } catch (e) {
    return language === 'en' ? `Mr. ${patientName}, it's time for ${medName}.` : `يا ${patientName}، حان موعد دواء ${medName}.`;
  }
};
