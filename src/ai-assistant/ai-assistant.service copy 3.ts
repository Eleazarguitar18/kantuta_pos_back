import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { ReportesService } from 'src/reportes/services/reportes.service';

@Injectable()
export class AiAssistantService {
  private openai: OpenAI;
  private systemInstruction: string;
  private readonly logger = new Logger(AiAssistantService.name);

  // El modelo estable, rápido y sin bloques de "razonamiento" complejos
  private readonly MODELO_IA = 'llama-3.3-70b-versatile';

  constructor(
    private readonly reportesService: ReportesService,
  ) {
    this.openai = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    });

    const promptPath = path.join(
      process.cwd(),
      'src/ai-assistant/prompts/kantuta.promt.md',
    );
    this.systemInstruction = fs.readFileSync(promptPath, 'utf8');
  }

  /**
   * Procesa la consulta del usuario, clasifica su intención y extrae datos reales
   */
  async procesarConsulta(texto: string): Promise<string> {
    try {
      this.logger.log(`[IA-ASSISTANT] Solicitud entrante: "${texto}"`);

      // 1. CLASIFICACIÓN DE INTENCIÓN MULTI-REPORTE
      const clasificacion = await this.openai.chat.completions.create({
        model: this.MODELO_IA,
        messages: [
          {
            role: 'system',
            content: `Analiza el mensaje del usuario sobre el POS y responde ÚNICAMENTE con una de las siguientes palabras clave en mayúsculas:
            - DASHBOARD: Si pide métricas de hoy, qué se vendió hoy, recargas de hoy o el top de productos más vendidos.
            - RANGO: Si pide reportes o totales de ventas filtrados por fechas específicas, días pasados, meses enteros o rangos de tiempo.
            - INVENTARIO: Si consulta sobre el estado actual del inventario, stock, costos de almacén, precios totales o ganancia proyectada.
            - COMPRAS: Si pregunta por compras realizadas a proveedores, egresos por adquisiciones o cuánto se invirtió en stock.
            - OPERADOR: Si pide estadísticas de ventas por cajero, rendimiento de personal, o productividad de operadores.
            - RECHAZAR: Si es un saludo casual (hola, buenos días) o consultas ajenas a la administración del POS.
            
            No incluyas explicaciones ni puntuación. Ejemplo: COMPRAS`
          },
          { role: 'user', content: texto }
        ],
        temperature: 0.0,
      });

      const intencionLimpia = (clasificacion.choices[0].message.content || '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .trim();

      this.logger.log(`[IA-ASSISTANT] Intención determinada: "${intencionLimpia}"`);

      // Si es un saludo o no es del negocio, enviamos el menú interactivo de WhatsApp
      if (intencionLimpia.includes('RECHAZAR') || intencionLimpia === '') {
        return '🤖 *Kantuta AI*\n¡Hola! Estoy listo para asistirte con los reportes comerciales del sistema en tiempo real. Puedes preguntarme cosas como:\n\n' +
          '• *¿Cómo van las ventas de hoy?*\n' +
          '• *¿Cuánto vendimos del 1 al 15 de este mes?*\n' +
          '• *Resumen del costo total y ganancia del inventario.*\n' +
          '• *¿Qué compras o inversiones se hicieron la semana pasada?*\n' +
          '• *¿Qué operador ha facturado más en estos días?*';
      }

      // 2. EJECUCIÓN DIRECTA DE TUS MÉTODOS DE BASE DE DATOS
      let dataCruda: any = null;
      const anioActual = new Date().getFullYear();
      const { inicio, fin } = this.extraerFechas(texto);

      if (intencionLimpia.includes('DASHBOARD')) {
        dataCruda = await this.reportesService.getDashboardStats(anioActual);
      }
      else if (intencionLimpia.includes('RANGO')) {
        dataCruda = await this.reportesService.getVentasRangoData(inicio, fin, 'Asistente_IA');
      }
      else if (intencionLimpia.includes('INVENTARIO')) {
        dataCruda = await this.reportesService.getInventarioData('Asistente_IA');
      }
      else if (intencionLimpia.includes('COMPRAS')) {
        dataCruda = await this.reportesService.getComprasRangoData(inicio, fin, 'Asistente_IA');
      }
      else if (intencionLimpia.includes('OPERADOR')) {
        dataCruda = await this.reportesService.getProductividadOperadorData(inicio, fin);
      }

      // 3. ARMADO DE INFORME FINAL REDACTADO POR LA IA
      const respuestaFinal = await this.openai.chat.completions.create({
        model: this.MODELO_IA,
        messages: [
          { role: 'system', content: this.systemInstruction },
          {
            role: 'system',
            content: `DATOS REALES ASOCIADOS EXTRAÍDOS DEL SISTEMA:
            ${JSON.stringify(dataCruda)}
            
            Filtro de fechas aplicable si corresponde: Desde ${inicio} hasta ${fin}.
            
            PROHIBICIÓN ABSOLUTA DE SALUDOS:
            - NO saludes bajo ninguna circunstancia.
            - NO digas "¡Hola!", "Buenas tardes", "Soy Kantu", ni menciones tu nombre o el del sistema al inicio.
            - NO agregues introducciones ni cierres como "¿Necesitas algo más?".
            - Inicia la respuesta DIRECTAMENTE con el primer carácter del informe o la lista.
            
            Instrucciones de formato:
            - Responde al usuario empleando estrictamente los datos reales provistos.
            - Estructura tu respuesta en formato de lista legible para WhatsApp (viñetas "•" y palabras clave en *negrita*).
            - Sé breve, directo y conciso.`
          },
          { role: 'user', content: texto }
        ],
        temperature: 0.1, // Bajamos la temperatura a 0.1 para que sea aún más preciso y obediente
      });

      return respuestaFinal.choices[0].message.content?.trim() || 'Sin respuesta en la capa final.';

    } catch (error) {
      this.logger.error('Error crítico en el flujo del AiAssistant:', error);
      return '⚠️ *Kantuta AI:* Estoy experimentando dificultades técnicas para consultar los reportes en este momento. Por favor, intenta de nuevo.';
    }
  }

  /**
   * Extrae rangos de fechas (YYYY-MM-DD) del texto.
   * Si no encuentra fechas explícitas, por seguridad retorna el día de hoy.
   */
  private extraerFechas(texto: string): { inicio: string; fin: string } {
    const hoy = new Date();
    const formatoFecha = (d: Date) => d.toISOString().split('T')[0];
    const matches = texto.match(/\d{4}-\d{2}-\d{2}/g);

    if (matches && matches.length >= 2) {
      return { inicio: matches[0], fin: matches[1] };
    } else if (matches && matches.length === 1) {
      return { inicio: matches[0], fin: formatoFecha(hoy) };
    }
    return { inicio: formatoFecha(hoy), fin: formatoFecha(hoy) };
  }
}