import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import * as QRCodeNode from 'qrcode';
import pino = require('pino');
import { Jimp } from 'jimp';
import * as fs from 'fs';
import * as path from 'path';
import { AiAssistantService } from 'src/ai-assistant/ai-assistant.service';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private sock: WASocket | null = null;
  private ultimoQr: string | null = null;

  async onModuleInit() {
    await this.conectarWhatsapp();
  }

  constructor(private readonly aiAssistantService: AiAssistantService) {}

  // 🛡️ HELPER ANTI-BANEO: Retardo aleatorio en milisegundos
  private delayAleatorio(minMs: number, maxMs: number): Promise<void> {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 🛡️ HELPER ANTI-BANEO: Simula presencia humana ('Escribiendo...') previa al envío
  private async simularComportamientoHumano(jid: string, texto?: string) {
    if (!this.sock) return;

    try {
      // 1. Pausa inicial corta (como si el humano abriera el chat o adjuntara el archivo)
      await this.delayAleatorio(1000, 2000);

      // 2. Transmisión de estado 'Escribiendo...' en WhatsApp
      await this.sock.sendPresenceUpdate('composing', jid);

      // 3. Cálculo de tiempo de tipeo proporcional al texto (o base para multimedia)
      const caracteres = texto ? texto.length : 20;
      const msPorCaracter = 50; // ~20 caracteres por segundo
      const tiempoCalculado = caracteres * msPorCaracter;

      // Mantener 'composing' entre 1.8s y máximo 4.5s
      const tiempoTipeo = Math.min(Math.max(tiempoCalculado, 1800), 4500);
      await this.delayAleatorio(tiempoTipeo, tiempoTipeo + 1000);

      // 4. Detener el estado de tipeo
      await this.sock.sendPresenceUpdate('paused', jid);
      await this.delayAleatorio(300, 800);
    } catch (e) {
      console.warn(`[Anti-Ban Warning] No se pudo enviar presencia a ${jid}`);
    }
  }

  private async conectarWhatsapp() {
    const folderName = process.env.AUTH_FOLDER_NAME || 'auth_info_baileys';
    const { state, saveCreds } = await useMultiFileAuthState(folderName);

    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1015901307] as [number, number, number],
      isLatest: false,
    }));

    console.log(`📡 [NestJS] Conectando con versión de WA Web: v${version.join('.')}`);

    this.sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }) as any,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
    });

    this.sock.ev.on('creds.update', async () => {
      await saveCreds();
    });

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.ultimoQr = qr;
        console.log('🔄 [NestJS] Nuevo código QR generado. Escanéalo en /whatsapp/connect/view');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`❌ Conexión cerrada (Status Code: ${statusCode}). ¿Reconectando?: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 500) {
          console.warn('⚠️ Sesión invalidad por Meta. Limpiando credenciales para forzar nuevo QR...');
          this.ultimoQr = null;
          const authPath = path.resolve(folderName);
          if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
          }
          setTimeout(() => this.conectarWhatsapp(), 3000);
        } else if (shouldReconnect) {
          setTimeout(() => this.conectarWhatsapp(), 5000);
        } else {
          this.ultimoQr = null;
        }
      }

      if (connection === 'open') {
        this.ultimoQr = null;
        console.log('✅ [NestJS] ¡Conexión con WhatsApp establecida con éxito!');
      }
    });

    // --- ESCUCHAR MENSAJES ENTRANTES CON IA ---
    this.sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;
      const msg = m.messages[0];

      if (!msg.message || msg.key.fromMe) return;

      const msgTimestamp = msg.messageTimestamp;
      const now = Math.floor(Date.now() / 1000);

      if (msgTimestamp && now - Number(msgTimestamp) > 60) {
        console.log(`[IA] Ignorando mensaje antiguo de ${msg.key.remoteJid}`);
        return;
      }

      const remoteJid = msg.key.remoteJid;
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text;

      if (remoteJid?.endsWith('@g.us')) {
        console.log(`[BLOCK] Mensaje de grupo ignorado: ${remoteJid}`);
        return;
      }

      if (texto && remoteJid) {
        console.log(`[IA] Recibiendo mensaje de ${remoteJid}: ${texto}`);
        
        // 1. Procesamiento con IA
        const respuesta = await this.aiAssistantService.procesarConsulta(texto);
        console.log(`[IA] Respondiendo a ${remoteJid}: ${respuesta}`);

        // 2. Responde simulando presencia anti-ban
        await this.enviarRespuestaIA(remoteJid, respuesta);
        console.log(`🤖 IA respondió a ${remoteJid}: Mensaje entregado con éxito.`);
      }
    });
  }

  // --- MÉTODOS DE ENVÍO PROTEGIDOS CON ANTI-BANEO ---

  async enviarRespuestaIA(jid: string, message: string) {
    if (!this.sock) {
      throw new ServiceUnavailableException('El cliente de WhatsApp no está inicializado.');
    }

    console.log(`🤖 [Anti-Ban] Enviando respuesta de IA a: ${jid}`);
    await this.simularComportamientoHumano(jid, message);
    return await this.sock.sendMessage(jid, { text: message });
  }

  async enviarEstadoEscribiendo(jid: string) {
    if (!this.sock) return;
    await this.sock.sendPresenceUpdate('composing', jid);
  }

  async obtenerQrHtml(): Promise<string | null> {
    if (!this.ultimoQr) return null;
    return await QRCodeNode.toDataURL(this.ultimoQr);
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async enviarMensajeHumanizado(jid: string, texto: string) {
    if (!this.sock) {
      throw new ServiceUnavailableException('El cliente de WhatsApp no está inicializado.');
    }
    await this.simularComportamientoHumano(jid, texto);
    return await this.sock.sendMessage(jid, { text: texto });
  }

  async enviarMensajeTexto(phone: string, message: string) {
    if (!this.sock) {
      throw new ServiceUnavailableException('El cliente de WhatsApp no está inicializado.');
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const jid = `${cleanPhone}@s.whatsapp.net`;

    // 🛡️ Protección anti-ban activada
    await this.simularComportamientoHumano(jid, message);
    return await this.sock.sendMessage(jid, { text: message });
  }

  async enviarImagen(phone: string, imageUrl: string, caption?: string) {
    if (!this.sock) {
      throw new ServiceUnavailableException('El cliente de WhatsApp no está inicializado.');
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const jid = `${cleanPhone}@s.whatsapp.net`;

    // 🛡️ Protección anti-ban activada
    await this.simularComportamientoHumano(jid, caption);
    return await this.sock.sendMessage(jid, {
      image: { url: imageUrl },
      caption: caption || undefined,
    });
  }

  async enviarImagenDesdeBuffer(
    phone: string,
    fileBuffer: Buffer,
    mimeType: string,
    caption?: string,
  ) {
    if (!this.sock) {
      throw new ServiceUnavailableException('El cliente de WhatsApp no está inicializado.');
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const jid = `${cleanPhone}@s.whatsapp.net`;

    let thumbnailBase64: string | undefined;

    try {
      const image = await Jimp.fromBuffer(fileBuffer);
      image.resize({ w: 200 });
      const thumbnailBuffer = await image.getBuffer('image/jpeg');
      thumbnailBase64 = Buffer.from(thumbnailBuffer).toString('base64');
    } catch (err) {
      console.error('No se pudo generar el thumbnail, se enviará sin previsualización:', err);
    }

    // 🛡️ Protección anti-ban activada
    await this.simularComportamientoHumano(jid, caption);

    return await this.sock.sendMessage(jid, {
      image: fileBuffer,
      mimetype: mimeType,
      caption: caption || undefined,
      jpegThumbnail: thumbnailBase64,
    });
  }

  async enviarDocumentoDesdeBuffer(
    phone: string,
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ) {
    if (!this.sock) {
      throw new ServiceUnavailableException('El cliente de WhatsApp no está inicializado.');
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const jid = `${cleanPhone}@s.whatsapp.net`;

    // 🛡️ Protección anti-ban activada (simula adjunción)
    await this.simularComportamientoHumano(jid, fileName);

    return await this.sock.sendMessage(jid, {
      document: fileBuffer,
      mimetype: mimeType,
      fileName: fileName,
    });
  }

  async enviarMensajeAGrupo(groupId: string, mensaje: string) {
    if (!this.sock) {
      throw new ServiceUnavailableException('El cliente de WhatsApp no está inicializado.');
    }

    const cleanGroupId = groupId.trim();

    try {
      console.log(`🚀 [v7] Enviando mensaje a grupo con anti-ban: ${cleanGroupId}`);
      // 🛡️ Protección anti-ban en grupos
      await this.simularComportamientoHumano(cleanGroupId, mensaje);
      return await this.sock.sendMessage(cleanGroupId, { text: mensaje });
    } catch (error: any) {
      console.error('Error crítico al enviar al grupo:', error);
      throw new InternalServerErrorException(
        `Error de protocolo Baileys v7: ${error.message}`,
      );
    }
  }

  async listarMisGrupos() {
    if (!this.sock) {
      throw new ServiceUnavailableException('El cliente de WhatsApp no está inicializado.');
    }

    try {
      const grupos = await this.sock.groupFetchAllParticipating();
      return Object.values(grupos).map((grupo: any) => ({
        id: grupo.id,
        nombre: grupo.subject,
      }));
    } catch (error) {
      console.error('Error al listar los grupos de WhatsApp:', error);
      throw new InternalServerErrorException('No se pudieron recuperar los grupos.');
    }
  }

  async obtenerParticipantesPorJid(jid: string) {
    if (!this.sock) {
      throw new ServiceUnavailableException('El cliente de WhatsApp no está inicializado.');
    }

    try {
      console.log(`🔍 Buscando participantes en el grupo: ${jid}`);
      const metadata = await this.sock.groupMetadata(jid);
      const participantes = metadata.participants.map((p: any) => ({
        id: p.id,
        nombre: p.notify,
        esAdmin: p.admin || false,
      }));

      console.log(`✅ Encontrados ${participantes.length} participantes.`);
      return participantes;
    } catch (error) {
      console.error('Error al obtener participantes:', error);
      throw new InternalServerErrorException(
        `No se pudo obtener la lista de participantes del grupo ${jid}.`,
      );
    }
  }
}