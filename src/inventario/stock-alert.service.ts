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
    return (
      `⚠️ *ALERTA DE STOCK BAJO - KANTUTA POS* ⚠️\n\n` +
      `El siguiente producto ha alcanzado su límite mínimo de inventario:\n\n` +
      `📦 *Producto:* ${producto.nombre}\n` +
      `📊 *Stock Actual:* ${producto.stock_actual}\n` +
      `🔻 *Stock Mínimo:* ${producto.stock_minimo}\n` +
      `🏷️ *Categoría:* ${categoriaNombre}\n\n` +
      `Por favor, realizar el reabastecimiento a la brevedad.`
    );
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
      `🔔 Enviando alerta de stock bajo para: "${producto.nombre}" ` +
        `(stock: ${producto.stock_actual} / mínimo: ${producto.stock_minimo}) ` +
        `→ ${contactos.length} contacto(s)`,
    );

    const envios = contactos.map(async (contacto) => {
      const phone = `${contacto.codigo_pais}${contacto.telefono}`;
      try {
        await this.whatsappService.enviarMensajeTexto(phone, mensaje);
        this.logger.log(`📲 Alerta enviada a ${contacto.nombre} (${phone})`);
      } catch (err) {
        this.logger.error(
          `❌ Error al enviar alerta de stock a ${contacto.nombre} (${phone}): ${err?.message}`,
        );
      }
    });

    // Enviamos en paralelo; los errores individuales no deben romper el flujo
    await Promise.allSettled(envios);
  }
}
