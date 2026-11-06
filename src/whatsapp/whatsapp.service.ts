import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleDestroy,
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

type WhatsappEstado =
  | 'desconectado'
  | 'conectando'
  | 'esperando_qr'
  | 'conectado'
  | 'cerrando'
  | 'error';

export interface WhatsappStatus {
  success: boolean;
  estado: WhatsappEstado;
  conectado: boolean;
  qrBase64: string | null;
  qrActualizadoEn: string | null;
  telefono: string | null;
  nombre: string | null;
  mensaje: string;
  intentosReconexion: number;
  ultimoError: string | null;
  conectadoEn: string | null;
}

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private sock: WASocket | null = null;
  private ultimoQr: string | null = null;
  private ultimoQrAt: number | null = null;
  private estado: WhatsappEstado = 'desconectado';
  private ultimoError: string | null = null;
  private conectadoEn: number | null = null;
  private telefonoConectado: string | null = null;
  private nombreConectado: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private generacion = 0;
  private operacionEnCurso: Promise<unknown> | null = null;
  private readonly authFolder: string;

  constructor(private readonly aiAssistantService: AiAssistantService) {
    this.authFolder = path.resolve(
      process.cwd(),
      process.env.AUTH_FOLDER_NAME || 'auth_info_baileys',
    );
  }

  async onModuleInit() {
    this.validarCarpetaAuth();
    await this.conectarWhatsapp();
  }

  async onModuleDestroy() {
    this.cancelarReconexion();
    await this.cerrarSocketSilenciosamente();
  }

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

  private validarCarpetaAuth() {
    try {
      if (!fs.existsSync(this.authFolder)) return;

      const info = fs.statSync(this.authFolder);
      if (!info.isDirectory()) {
        fs.rmSync(this.authFolder, { recursive: true, force: true });
        return;
      }

      const credsPath = path.join(this.authFolder, 'creds.json');
      if (!fs.existsSync(credsPath)) {
        console.warn(
          `[WhatsApp] La carpeta ${this.authFolder} no tiene creds.json. Se limpiará para iniciar una sesión nueva.`,
        );
        fs.rmSync(this.authFolder, { recursive: true, force: true });
        return;
      }

      JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    } catch (error: any) {
      console.warn(
        `[WhatsApp] Sesión inválida detectada en ${this.authFolder}. Se eliminará para generar un QR nuevo: ${error?.message || error}`,
      );
      fs.rmSync(this.authFolder, { recursive: true, force: true });
    }
  }

  private async conectarWhatsapp(): Promise<void> {
    if (
      this.estado === 'cerrando' ||
      this.estado === 'conectando' ||
      this.estado === 'conectado' ||
      this.sock
    ) {
      return;
    }

    this.cancelarReconexion();
    this.estado = 'conectando';
    this.ultimoError = null;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

      const { version } = await fetchLatestBaileysVersion().catch(() => ({
        version: [2, 3000, 1015901307] as [number, number, number],
        isLatest: false,
      }));

      console.log(`📡 [NestJS] Conectando con versión de WA Web: v${version.join('.')}`);

      const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }) as any,
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
      });

      this.sock = sock;
      const generacion = ++this.generacion;
      const esSocketActual = () =>
        this.sock === sock && this.generacion === generacion;

      sock.ev.on('creds.update', async () => {
        if (!esSocketActual()) return;
        try {
          await saveCreds();
        } catch (error: any) {
          console.error(
            `[WhatsApp] No se pudieron guardar las credenciales: ${error?.message || error}`,
          );
        }
      });

      sock.ev.on('connection.update', (update) => {
        if (!esSocketActual()) return;
        void this.procesarConexion(sock, update);
      });

      // --- ESCUCHAR MENSAJES ENTRANTES CON IA ---
      sock.ev.on('messages.upsert', async (m) => {
        if (!esSocketActual() || m.type !== 'notify') return;
        const msg = m.messages[0];

        if (!msg.message || msg.key.fromMe) return;

        const msgTimestamp = msg.messageTimestamp;
        const now = Math.floor(Date.now() / 1000);

        if (msgTimestamp && now - Number(msgTimestamp) > 60) {
          console.log(`[IA] Ignorando mensaje antiguo de ${msg.key.remoteJid}`);
          return;
        }

        const remoteJid = msg.key.remoteJid;
        const texto =
          msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (remoteJid?.endsWith('@g.us')) {
          console.log(`[BLOCK] Mensaje de grupo ignorado: ${remoteJid}`);
          return;
        }

        if (texto && remoteJid) {
          console.log(`[IA] Recibiendo mensaje de ${remoteJid}: ${texto}`);

          try {
            const respuesta = await this.aiAssistantService.procesarConsulta(texto);
            console.log(`[IA] Respondiendo a ${remoteJid}: ${respuesta}`);
            await this.enviarRespuestaIA(remoteJid, respuesta);
            console.log(`🤖 IA respondió a ${remoteJid}: Mensaje entregado con éxito.`);
          } catch (error: any) {
            console.error(
              `[IA] No se pudo responder a ${remoteJid}: ${error?.message || error}`,
            );
          }
        }
      });
    } catch (error: any) {
      this.sock = null;
      this.estado = 'error';
      this.ultimoError = `No se pudo iniciar WhatsApp: ${error?.message || error}`;
      console.error(`[WhatsApp] ${this.ultimoError}`);
      this.programarReconexion(this.calcularDelayReconexion());
    }
  }

  private async procesarConexion(sock: WASocket, update: any): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.estado = 'esperando_qr';
      this.ultimoQr = qr;
      this.ultimoQrAt = Date.now();
      this.ultimoError = null;
      this.telefonoConectado = null;
      this.nombreConectado = null;
      console.log('🔄 [NestJS] Nuevo código QR generado. Escanéalo en /whatsapp/connect/view');
      return;
    }

    if (connection === 'open') {
      this.estado = 'conectado';
      this.ultimoQr = null;
      this.ultimoQrAt = null;
      this.ultimoError = null;
      this.reconnectAttempts = 0;
      this.conectadoEn = Date.now();
      this.telefonoConectado = sock.user?.id?.split(':')[0] ?? null;
      this.nombreConectado = sock.user?.name ?? null;
      console.log('✅ [NestJS] ¡Conexión con WhatsApp establecida con éxito!');
      return;
    }

    if (connection !== 'close') return;

    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
    const code = Number(statusCode);

    if (this.sock === sock) this.sock = null;
    this.ultimoQr = null;
    this.ultimoQrAt = null;

    if (this.estado === 'cerrando') return;

    console.log(
      `❌ Conexión cerrada (Status Code: ${statusCode ?? 'N/A'}). Estado: ${this.estado}`,
    );

    if (code === DisconnectReason.connectionReplaced) {
      this.estado = 'error';
      this.ultimoError =
        'Otra instancia del backend está usando la misma sesión de WhatsApp. Detén la otra instancia y vuelve a intentar.';
      console.warn(`[WhatsApp] ${this.ultimoError}`);
      return;
    }

    if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
      console.warn(
        '[WhatsApp] La sesión fue cerrada o es inválida. Se eliminarán las credenciales y se generará un QR nuevo.',
      );
      await this.limpiarCarpetaAuth();
      this.reconnectAttempts = 0;
      this.estado = 'desconectado';
      this.ultimoError = 'La sesión anterior ya no es válida. Escanea el nuevo código QR.';
      this.programarReconexion(1500);
      return;
    }

    if (code === DisconnectReason.forbidden || code === DisconnectReason.multideviceMismatch) {
      this.estado = 'error';
      this.ultimoError = `WhatsApp rechazó la conexión (código ${code}). Limpia la sesión y vuelve a escanear el QR.`;
      console.warn(`[WhatsApp] ${this.ultimoError}`);
      return;
    }

    if (code === DisconnectReason.restartRequired) {
      this.estado = 'desconectado';
      this.programarReconexion(1500);
      return;
    }

    this.estado = 'desconectado';
    this.ultimoError = `Conexión perdida (código ${statusCode ?? 'desconocido'}). Reintentando...`;
    this.programarReconexion(this.calcularDelayReconexion());
  }

  private programarReconexion(delayMs: number) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.conectarWhatsapp();
    }, delayMs);
  }

  private cancelarReconexion() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private calcularDelayReconexion(): number {
    const base = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts += 1;
    return base + Math.floor(Math.random() * 500);
  }

  private async conBloqueo<T>(fn: () => Promise<T>): Promise<T> {
    while (this.operacionEnCurso) {
      await this.operacionEnCurso.catch(() => undefined);
    }

    const operacion = fn();
    this.operacionEnCurso = operacion;
    try {
      return await operacion;
    } finally {
      this.operacionEnCurso = null;
    }
  }

  private async conTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Tiempo de espera agotado')),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private removerListeners(sock: WASocket) {
    sock.ev.removeAllListeners('connection.update');
    sock.ev.removeAllListeners('creds.update');
    sock.ev.removeAllListeners('messages.upsert');
  }

  private async cerrarSocketSilenciosamente(): Promise<void> {
    const sock = this.sock;
    this.sock = null;
    this.generacion += 1;

    if (!sock) return;

    this.removerListeners(sock);
    try {
      sock.end(undefined);
    } catch (error: any) {
      console.warn(`[WhatsApp] No se pudo cerrar el socket: ${error?.message || error}`);
    }
    await this.delay(250);
  }

  private async limpiarCarpetaAuth(): Promise<void> {
    for (let intento = 0; intento < 2; intento += 1) {
      try {
        fs.rmSync(this.authFolder, { recursive: true, force: true });
        return;
      } catch (error: any) {
        if (intento === 1) {
          console.error(
            `[WhatsApp] No se pudo limpiar ${this.authFolder}: ${error?.message || error}`,
          );
          throw error;
        }
        await this.delay(250);
      }
    }
  }

  private resetEstado() {
    this.estado = 'desconectado';
    this.ultimoQr = null;
    this.ultimoQrAt = null;
    this.ultimoError = null;
    this.conectadoEn = null;
    this.telefonoConectado = null;
    this.nombreConectado = null;
    this.reconnectAttempts = 0;
  }

  async cerrarSesionWhatsapp(): Promise<WhatsappStatus> {
    return this.conBloqueo(async () => {
      this.cancelarReconexion();
      this.estado = 'cerrando';
      this.ultimoQr = null;
      this.ultimoQrAt = null;

      const sock = this.sock;
      this.sock = null;
      this.generacion += 1;

      if (sock) {
        this.removerListeners(sock);
        try {
          await this.conTimeout(
            sock.logout('Cierre de sesión solicitado desde el panel'),
            10000,
          );
        } catch (error: any) {
          console.warn(
            `[WhatsApp] No se pudo desvincular el dispositivo: ${error?.message || error}`,
          );
          try {
            sock.end(undefined);
          } catch {
            // El socket ya estaba cerrado.
          }
        }
      }

      await this.delay(250);
      await this.limpiarYReconectar();

      return this.obtenerEstado();
    });
  }

  async reiniciarSesionWhatsapp(): Promise<WhatsappStatus> {
    return this.conBloqueo(async () => {
      this.cancelarReconexion();
      this.estado = 'cerrando';
      this.ultimoQr = null;
      this.ultimoQrAt = null;

      const sock = this.sock;
      this.sock = null;
      this.generacion += 1;

      if (sock) {
        this.removerListeners(sock);
        try {
          sock.end(undefined);
        } catch {
          // El socket ya estaba cerrado.
        }
      }

      await this.delay(250);
      await this.limpiarYReconectar();

      return this.obtenerEstado();
    });
  }

  private async limpiarYReconectar(): Promise<void> {
    try {
      await this.limpiarCarpetaAuth();
    } catch (error: any) {
      this.resetEstado();
      this.estado = 'error';
      this.ultimoError = `No se pudo limpiar la carpeta de autenticación: ${error?.message || error}`;
      throw new InternalServerErrorException(this.ultimoError);
    }

    this.resetEstado();
    void this.conectarWhatsapp();
  }

  async obtenerEstado(): Promise<WhatsappStatus> {
    return {
      success: true,
      estado: this.estado,
      conectado: this.estado === 'conectado',
      qrBase64: this.ultimoQr ? await this.obtenerQrHtml() : null,
      qrActualizadoEn: this.ultimoQrAt
        ? new Date(this.ultimoQrAt).toISOString()
        : null,
      telefono: this.telefonoConectado,
      nombre: this.nombreConectado,
      mensaje: this.mensajeEstado(),
      intentosReconexion: this.reconnectAttempts,
      ultimoError: this.ultimoError,
      conectadoEn: this.conectadoEn
        ? new Date(this.conectadoEn).toISOString()
        : null,
    };
  }

  private mensajeEstado(): string {
    switch (this.estado) {
      case 'conectado':
        return this.nombreConectado
          ? `WhatsApp conectado como ${this.nombreConectado}.`
          : 'WhatsApp conectado correctamente.';
      case 'esperando_qr':
        return 'Escanea el código QR desde WhatsApp para vincular el dispositivo.';
      case 'conectando':
        return 'Conectando con WhatsApp...';
      case 'cerrando':
        return 'Cerrando la sesión de WhatsApp...';
      case 'error':
        return this.ultimoError || 'WhatsApp no está disponible en este momento.';
      default:
        return 'WhatsApp desconectado. Generando un nuevo código QR...';
    }
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