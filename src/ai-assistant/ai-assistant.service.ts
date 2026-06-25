import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { ReportesService } from 'src/reportes/services/reportes.service';
// 1. IMPORTA AQUÍ TUS OTROS SERVICES SEGÚN VAYAS NECESITANDO
// import { ProveedoresService } from '../proveedores/proveedores.service'; 

@Injectable()
export class AiAssistantService {
  private openai: OpenAI;
  private systemInstruction: string;
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly MODELO_IA = 'llama-3.3-70b-versatile';

  constructor(
    private readonly reportesService: ReportesService,
    // 2. INYÉCTALOS EN EL CONSTRUCTOR
    // private readonly proveedoresService: ProveedoresService, 
  ) {
    this.openai = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1', // URL de tu pasarela Groq
      apiKey: process.env.GROQ_API_KEY,
    });

    const promptPath = path.join(process.cwd(), 'src/ai-assistant/prompts/kantuta.promt.md');
    this.systemInstruction = fs.readFileSync(promptPath, 'utf8');
  }

  async procesarConsulta(texto: string): Promise<string> {
    try {
      this.logger.log(`[IA-ASSISTANT] Solicitud: "${texto}"`);

      // ==========================================
      // PASO 1: AGREGAR LA NUEVA INTENCIÓN A LA IA
      // ==========================================
      const clasificacion = await this.openai.chat.completions.create({
        model: this.MODELO_IA,
        messages: [
          {
            role: 'system',
            content: `Analiza el mensaje del usuario y clasifícalo respondiendo ÚNICAMENTE con una de estas palabras clave:
            - DASHBOARD: Métricas de hoy, ventas del día, recargas del día o tops de productos.
            - RANGO: Reportes de ventas filtrados por fechas o meses pasados.
            - INVENTARIO: Costos de almacén, stock actual, stock bajo y ganancias proyectadas.
            - COMPRAS: Inversiones en proveedores o egresos por rango de fechas.
            - OPERADOR: Rendimiento y ventas por cajero/operador.
            - PROVEEDORES: Si pregunta por la lista de proveedores, quiénes están registrados o datos de contacto de los mismos.
            - RECHAZAR: Saludos, despedidas o temas totalmente ajenos al negocio.
            
            No uses puntos ni explicaciones. Solo la palabra limpia.`
          },
          { role: 'user', content: texto }
        ],
        temperature: 0.0,
      });

      const intencionLimpia = (clasificacion.choices[0].message.content || '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .trim();

      if (intencionLimpia.includes('RECHAZAR') || intencionLimpia === '') {
        return this.obtenerMenuPrincipal();
      }

      // ==========================================
      // PASO 2: ENRUTAMIENTO Y OBTENCIÓN DE DATA CRUDA
      // ==========================================
      let dataCruda: any = null;
      const anioActual = new Date().getFullYear();
      const { inicio, fin } = this.extraerFechas(texto);

      // Evaluamos la intención limpia determinada por la IA
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
      // ---> AQUÍ EJECUTAS EL MÉTODO DE TU OTRO SERVICIO <---
      else if (intencionLimpia.includes('PROVEEDORES')) {
        // Ejemplo ficticio: dataCruda = await this.proveedoresService.findAll();
        dataCruda = [
          { id: 1, empresa: 'Distribuidora Norte', contacto: 'Juan Pérez', telefono: '71234567', estado: 'Activo' },
          { id: 2, empresa: 'Almacenes Central', contacto: 'María Gomez', telefono: '76543210', estado: 'Activo' }
        ];
      }

      // ==========================================
      // PASO 3: REDACCIÓN FINAL (IGUAL DE ESTRICTA)
      // ==========================================
      const respuestaFinal = await this.openai.chat.completions.create({
        model: this.MODELO_IA,
        messages: [
          { role: 'system', content: this.systemInstruction },
          {
            role: 'system',
            content: `DATOS REALES EXTRAÍDOS DEL SISTEMA:
            ${JSON.stringify(dataCruda)}
            
            PROHIBICIÓN ABSOLUTA DE SALUDOS:
            - NO saludes bajo ninguna circunstancia.
            - NO digas "¡Hola!", "Buenas tardes", "Soy Kantu" ni menciones tu nombre al inicio.
            - Inicia la respuesta DIRECTAMENTE con el desglose de los datos.
            
            Instrucciones de formato:
            - Usa viñetas "•" y palabras clave en *negrita* para WhatsApp.`
          },
          { role: 'user', content: texto }
        ],
        temperature: 0.1,
      });

      return respuestaFinal.choices[0].message.content?.trim() || 'Sin datos disponibles.';

    } catch (error) {
      this.logger.error('Error crítico en el flujo del Asistente:', error);
      return '⚠️ *Kantu (Kantuta AI)*: Experimentando dificultades técnicas de consulta en este momento.';
    }
  }

  private obtenerMenuPrincipal(): string {
    return '🤖 *Kantuta AI*\n*¡Hola soy Kantu!* Estoy listo para asistirte con la administración del negocio en tiempo real. Puedes consultarme:\n\n' +
      '• *¿Cómo van las ventas de hoy?*\n' +
      '• *¿Qué proveedores tenemos registrados?*\n' +
      '• *Resumen del valor total del inventario.*\n' +
      '• *Rendimiento de ventas por operador.*';
  }

  private extraerFechas(texto: string): { inicio: string; fin: string } {
    const hoy = new Date();
    const formatoFecha = (d: Date) => d.toISOString().split('T')[0];
    const matches = texto.match(/\d{4}-\d{2}-\d{2}/g);
    if (matches && matches.length >= 2) return { inicio: matches[0], fin: matches[1] };
    if (matches && matches.length === 1) return { inicio: matches[0], fin: formatoFecha(hoy) };
    return { inicio: formatoFecha(hoy), fin: formatoFecha(hoy) };
  }
}