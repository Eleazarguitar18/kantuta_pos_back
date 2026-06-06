import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiAssistantService {
  private ai: GoogleGenAI;
  // En tu AiAssistantService.ts
  private readonly systemInstruction = `
  Eres KANTU, el asistente oficial de KANTUTA POS. 
  Tu objetivo es ayudar a los usuarios a gestionar ventas, inventario y reportes.
  
  REGLAS ESTRICTAS:
  1. Si te preguntan algo que no sea sobre el sistema POS o gestión de negocios, responde amablemente que solo puedes hablar de temas relacionados con KANTUTA POS.
  2. Nunca inventes precios o datos de stock; si no tienes la información, dile al usuario que consulte directamente en el panel administrativo.
  3. Tu tono es profesional, amable y directo.
  4. Mantén tus respuestas cortas y útiles.
`;
  constructor() {
    // Inicializamos con la API Key que debes tener en tu .env
    this.ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  }

  async procesarConsulta(texto: string): Promise<string> {
    try {
      const interaction = await this.ai.interactions.create({
        model: 'gemini-3.5-flash',
        input: texto,
        system_instruction: this.systemInstruction,
      });
      if (!interaction.output_text) {
        return 'No se pudo obtener respuesta';
      }
      return interaction.output_text;
    } catch (error) {
      console.error('Error en AiAssistantService:', error);
      return 'Hubo un error al procesar tu solicitud.';
    }
  }
}
