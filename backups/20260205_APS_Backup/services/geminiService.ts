
import { GoogleGenerativeAI } from "@google/generative-ai";

export const sendMessageToGemini = async (message: string, extraContext?: any): Promise<string> => {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

  if (!API_KEY || API_KEY.includes("PLACEHOLDER")) {
    return "API Key no configurada.";
  }

  const modelsToTry = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-2.0-flash-exp", "gemini-pro-latest"];

  for (const modelName of modelsToTry) {
    try {
      const response = await generateWithModel(modelName, message, extraContext);
      return response;
    } catch (error: any) {
      console.warn(`Model ${modelName} failed, trying next...`, error);
    }
  }

  try {
    console.warn("SDK failed, trying direct REST API...");
    const response = await generateWithFetch("gemini-2.0-flash", message, extraContext);
    return response;
  } catch (error: any) {
    console.warn("Direct REST API failed", error);
  }

  throw new Error("Error: No se pudo conectar con los modelos de IA.");
};

import { getAIContext } from './contextService';

// ... (existing code)

const generateWithModel = async (modelName: string, promptText: string, extraContext?: any): Promise<string> => {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    }
  });

  const contextData = await getAIContext();
  const simContext = extraContext ? `DATOS DE SIMULACIÓN ACTUAL (JSON): ${JSON.stringify(extraContext)}` : "";

  const systemPrompt = `
    Eres un Consultor Senior de Planificación Industrial (APS Expert). 
    Tu objetivo es analizar los resultados de la simulación y explicar los problemas de producción de forma cristalina para la gerencia.

    REGLAS DE ORO DE COMUNICACIÓN (ESTILO Y FORMATO):
    1. CONCISO Y DE IMPACTO: No uses rellenos innecesarios, pero asegúrate de explicar el "por qué". Busca un equilibrio entre brevedad e información valiosa.
    2. FORMATO PREMIUM: Usa Markdown de forma profesional (negritas, listas, iconos).
    3. ESTRUCTURA DE RESPUESTA:
       - **🚀 Causa Raíz**: Explica claramente el origen del problema (Suministros o Capacidad).
       - **📅 Cronología Crítica**: Detalla los hitos importantes con sus **fechas en negrita**.
       - **⚠️ Punto de Fricción**: Identifica específicamente la máquina o el insumo que detiene el flujo.
       - **💡 Plan de Acción**: Sugiere 2 o 3 opciones concretas y accionables.
    4. TONO: Consultor Senior, ejecutivo y directo.
    5. IDIOMA: Responde SIEMPRE en el mismo idioma que la consulta del usuario.

    CONTEXTO DE LA SIMULACIÓN:
    ${JSON.stringify(extraContext)}
  `;

  const prompt = `${systemPrompt}
  
  ${contextData}
  
  Consulta del usuario: ${promptText}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

const generateWithFetch = async (modelName: string, promptText: string, extraContext?: any): Promise<string> => {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

  const contextData = await getAIContext();
  const simContext = extraContext ? `DATOS DE SIMULACIÓN ACTUAL: ${JSON.stringify(extraContext)}` : "";

  const prompt = `Eres el Analista IA de Logic, Consultor APS Senior. 
  Analiza los datos de simulación y responde con un estilo conciso pero con suficiente contexto para la toma de decisiones. 
  Usa Markdown profesional, negritas para fechas y listas para la cronología.
  Responde siempre en el idioma de la consulta del usuario.
  ${contextData}
  ${simContext}
  
  Consulta: ${promptText}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
    })
  });

  if (!response.ok) throw new Error("REST API Error");
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";
};

