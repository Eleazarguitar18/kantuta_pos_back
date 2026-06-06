import { Injectable } from '@nestjs/common';
import OpenAI from 'openai'; // Librería instalada
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AiAssistantService {
  private openai: OpenAI;
  private systemInstruction: string;

  constructor() {
    // Configuración para Groq
    this.openai = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY, // Asegúrate de tener esto en tu .env
    });

    const promptPath = path.join(
      process.cwd(),
      'src/ai-assistant/prompts/kantuta.promt.md',
    );
    this.systemInstruction = fs.readFileSync(promptPath, 'utf8');
  }

  async procesarConsulta(texto: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        // Puedes cambiar este modelo por cualquiera de los disponibles en Groq
        model: 'groq/compound-mini',
        messages: [
          { role: 'system', content: this.systemInstruction },
          { role: 'user', content: texto },
        ],
      });

      return completion.choices[0].message.content || 'Sin respuesta';
    } catch (error) {
      console.error('Error con Groq:', error);
      return 'KANTUTA está teniendo problemas técnicos. Intenta de nuevo.';
    }
  }
}
