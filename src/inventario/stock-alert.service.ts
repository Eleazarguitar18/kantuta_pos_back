import { Injectable, Logger } from '@nestjs/common';
import { WhatsappService } from 'src/whatsapp/whatsapp.service';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { Producto } from './entities/producto.entity';

/**
 * Servicio dedicado a evaluar y enviar alertas de stock bajo vía WhatsApp.
 *
 * Implementa un mecanismo de cooldown (por producto) para evitar spam:
 * si un producto ya fue alertado y su stock no se ha repuesto por encima
 * del mínimo, no se vuelve a notificar hasta que se restablezca el nivel.
 *
 * La lista de administradores a notificar se obtiene dinámicamente desde
 * la base de datos a través de NotificacionesService (activo=true, recibe_stock_bajo=true).
 */
@Injectable()
export class StockAlertService {
  private readonly logger = new Logger(StockAlertService.name);

  /**
   * Set de IDs de productos que ya fueron alertados en este ciclo.
   * Se limpia cuando el stock del producto supera nuevamente el mínimo.
   */
  private readonly productosAlertados = new Set<number>();

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /**
   * Evalúa si un producto está en stock bajo y, de ser así, envía
   * la alerta de WhatsApp a todos los administradores configurados en BD.
   * Incluye lógica anti-spam: solo alerta una vez por ciclo de stock bajo.
   *
   * @param producto Entidad Producto con stock_actual y stock_minimo actualizados.
   */
  async evaluarYAlertar(producto: Producto): Promise<void> {
    const estaEnStockBajo = producto.stock_actual <= producto.stock_minimo;

    if (!estaEnStockBajo) {
      // El stock se recuperó: limpiar el flag para permitir futuras alertas
      if (this.productosAlertados.has(producto.id)) {
        this.productosAlertados.delete(producto.id);
        this.logger.log(
          `✅ Stock repuesto: ${producto.nombre} (ID:${producto.id}). Alerta reseteada.`,
        );
      }
      return;
    }

    // Ya fue alertado en este ciclo de stock bajo → no enviar duplicado
    if (this.productosAlertados.has(producto.id)) {
      this.logger.debug(
        `[SKIP] Producto "${producto.nombre}" ya fue alertado. Stock bajo sin reponer.`,
      );
      return;
    }

    // Marcar como alertado y enviar notificaciones
    this.productosAlertados.add(producto.id);
    await this.enviarAlertas(producto);
  }

  // ---------------------------------------------------------------------------
  // Métodos privados
  // ---------------------------------------------------------------------------

  private buildMensaje(producto: Producto): string {
    const categoriaNombre = producto.categoria?.nombre ?? 'Sin categoría';
    const ahora = new Date().toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return (
      `⚠️ *ALERTA DE STOCK BAJO - KANTUTA POS* ⚠️\n\n` +
      `El siguiente producto ha alcanzado su límite mínimo de inventario:\n\n` +
      `📦 *Producto:* ${producto.nombre}\n` +
      `📊 *Stock Actual:* ${producto.stock_actual}\n` +
      `🔻 *Stock Mínimo:* ${producto.stock_minimo}\n` +
      `🏷️ *Categoría:* ${categoriaNombre}\n\n` +
      `Por favor, realizar el reabastecimiento a la brevedad.\n\n` +
      `_Reporte generado automáticamente a las ${ahora}_`
    );
  }

  private getRandomDelay(min = 8000, max = 15000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async enviarAlertas(producto: Producto): Promise<void> {
    // Consulta dinámica a la BD: contactos activos que reciben alertas de stock
    const contactos = await this.notificacionesService.findActivosStock();

    if (contactos.length === 0) {
      this.logger.warn(
        'No hay contactos activos configurados para recibir alertas de stock bajo.',
      );
      return;
    }

    const mensaje = this.buildMensaje(producto);

    this.logger.warn(
      `🔔 Enviando alerta de stock bajo secuencial para: "${producto.nombre}" ` +
        `(stock: ${producto.stock_actual} / mínimo: ${producto.stock_minimo}) ` +
        `→ ${contactos.length} contacto(s)`,
    );

    // Enviar de forma secuencial con pausas aleatorias (Jittering) para prevenir baneos de WhatsApp
    for (let index = 0; index < contactos.length; index++) {
      const contacto = contactos[index];
      const phone = `${contacto.codigo_pais}${contacto.telefono}`;
      try {
        const jid = `${phone}@s.whatsapp.net`;
        await this.whatsappService.enviarMensajeHumanizado(jid, mensaje);
        this.logger.log(`📲 Alerta enviada a ${contacto.nombre} (${phone})`);
      } catch (err) {
        this.logger.error(
          `❌ Error al enviar alerta de stock a ${contacto.nombre} (${phone}): ${err?.message}`,
        );
      }

      // Si hay más contactos por notificar, pausamos entre 8 y 15 segundos
      if (index < contactos.length - 1) {
        const espera = this.getRandomDelay(8000, 15000);
        this.logger.log(
          `⏳ Pausa anti-ráfaga/anti-ban: esperando ${(espera / 1000).toFixed(1)}s antes de notificar al siguiente contacto...`,
        );
        await this.delay(espera);
      }
    }
  }
}
