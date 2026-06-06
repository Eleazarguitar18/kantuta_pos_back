// import { Injectable, OnModuleInit } from '@nestjs/common';
// import { GoogleGenerativeAI } from '@google/generative-ai'; // La librería correcta
// import * as fs from 'fs';
// import * as path from 'path';

// @Injectable()
// export class AiAssistantService implements OnModuleInit {
//   private model: any;

//   onModuleInit() {
//     // Ajusta esta ruta a donde realmente está tu archivo
//     const promptPath = path.join(
//       process.cwd(),
//       'src/ai-assistant/prompts/kantuta.promt.txt',
//     );
//     const systemInstruction = fs.readFileSync(promptPath, 'utf8');

//     // Inicializamos con la librería oficial
//     const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

//     // Configuramos el modelo con la instrucción del sistema
//     this.model = genAI.getGenerativeModel({
//       model: 'gemini-1.5-flash-8b',
//       //   systemInstruction: systemInstruction,
//     });
//   }

//   async procesarConsulta(texto: string): Promise<string> {
//     try {
//       const result = await this.model.generateContent(texto);
//       const response = await result.response;
//       return response.text();
//     } catch (error) {
//       console.error('Error en Gemini:', error);
//       return 'KANTUTA no pudo procesar tu mensaje. Intenta de nuevo.';
//     }
//   }
// }
