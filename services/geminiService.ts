
import { GoogleGenAI, Type } from "@google/genai";
import { AppState, AIAnalysisResult } from "../types";

export const generateDailyHealthTip = async (state: AppState): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const report = state.currentReport;
  
  const prompt = `
    أنت مساعد طبي ذكي، ودود جداً، وخبير في التعامل مع كبار السن. المريض هو "الحاج ممدوح" (75 سنة).
    الحالة: سكري، ضغط، قصور شرايين، وتاريخ ارتشاح رئوي.
    القياسات الأخيرة: ضغط ${report.systolicBP}/${report.diastolicBP}، سكر ${report.bloodSugar}.
    التاريخ المرضي المرجعي: ${state.medicalHistorySummary}.
    
    المطلوب: اكتب نصيحة طبية أو وقائية واحدة (أقل من 15 كلمة) باللهجة المصرية العامية الحنونة والمحترمة.
    القاعدة الذهبية: يجب أن يبدأ النص بعبارة "يا حاج ممدوح، ..." 
    مثال: "يا حاج ممدوح، الضغط عالي شوية النهاردة، بلاش مخلل مع الغدا واشرب مياه كتير."
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { temperature: 0.8 }
    });
    return response.text?.trim() || "يا حاج ممدوح، صباحك زي الفل.. متنساش تشرب مياه كتير وتاخد علاجك في ميعاده.";
  } catch (e) {
    console.error("Gemini Tip Error:", e);
    return "يا حاج ممدوح، يومك جميل بإذن الله.. خذ قسطاً من الراحة ولا تنسى مواعيد الأدوية.";
  }
};

export const analyzeHealthStatus = async (state: AppState): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const report = state.currentReport;
  
  const prompt = `قم بتحليل الحالة الصحية للحاج ممدوح بناءً على:
    - القياسات: ضغط ${report.systolicBP}/${report.diastolicBP}، سكر ${report.bloodSugar}، أكسجين ${report.oxygenLevel}%، نبض ${report.heartRate}.
    - الأعراض: ${report.symptoms.join(', ')}
    - التاريخ المرضي: ${state.medicalHistorySummary}
    
    قدم تحليلاً دقيقاً يتضمن الملخص، التوصيات، والتحذيرات الهامة.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 15000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "recommendations", "warnings", "positivePoints"]
        }
      }
    });

    return JSON.parse(response.text || "{}") as AIAnalysisResult;
  } catch (e) {
    console.error("Analysis Error:", e);
    throw new Error("حدث خطأ في التواصل مع خبير الذكاء الاصطناعي.");
  }
};
