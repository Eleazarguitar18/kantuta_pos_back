export interface RubroControl {
  key: string;
  label: string;
}

export const FILA_CAJA = 4;

export const RUBROS_INGRESOS: RubroControl[] = [
  { key: 'ingreso.tarjetas', label: 'Tarjetas' },
  { key: 'ingreso.chips', label: 'Chips' },
  { key: 'ingreso.recuperacion_linea', label: 'Recuperacion de Linea' },
  { key: 'ingreso.recarga_entel', label: 'R.ENTEL' },
  { key: 'ingreso.recarga_viva', label: 'R. Viva' },
  { key: 'ingreso.recarga_tigo', label: 'R. TIGO' },
  { key: 'ingreso.cargadores', label: 'Cargadores' },
  { key: 'ingreso.memorias', label: 'Memorias' },
  { key: 'ingreso.usb', label: 'USB' },
  { key: 'ingreso.audifonos', label: 'AUDIFONOS' },
  { key: 'ingreso.material_escritorio', label: 'MATERIAL DE ESCRITORIO' },
  { key: 'ingreso.fotocopias', label: 'FOTOCOPIAS' },
  { key: 'ingreso.anillados', label: 'ANILLADOS' },
  { key: 'ingreso.carga_celulares', label: 'CARGA DE CELULARES' },
  { key: 'ingreso.impresiones', label: 'IMPRESIONES' },
  { key: 'ingreso.plataformas', label: 'PLATAFORMAS DIGITALES' },
  { key: 'ingreso.qr', label: 'QR' },
];

export const RUBROS_COMPRAS: RubroControl[] = [
  { key: 'compra.tarjetas_viva', label: 'Tarjetas VIVA' },
  { key: 'compra.tarjetas_entel', label: 'TARJETAS ENTEL' },
  { key: 'compra.tarjetas_tigo', label: 'TARJETAS TIGO' },
  { key: 'compra.recarga_tigo', label: 'Recargas Tigo' },
  { key: 'compra.recarga_viva', label: 'Recarga Viva' },
  { key: 'compra.recarga_entel', label: 'Recarga Entel' },
  { key: 'compra.chips', label: 'CHIPS TIGO-ENTEL' },
  { key: 'compra.tapas_anillados', label: 'TAPAS ANILLADOS' },
  { key: 'compra.toner_fotocopiadora', label: 'TONER FOTOCOPIADORA' },
  { key: 'compra.tinta_impresora', label: 'TINTA PARA IMPRESORA' },
  { key: 'compra.toner_bcp', label: 'TONER BCP' },
  { key: 'compra.hojas_fotocopias', label: 'HOJAS BON FOTOCOPIAS' },
  { key: 'compra.audifonos_cargadores', label: 'AUDIFONOS-CARGADORES' },
  { key: 'compra.libreria', label: 'LIBRERÍA' },
];

export const RUBROS_GASTOS: RubroControl[] = [
  { key: 'gasto.facturas', label: 'FACTURAS' },
  { key: 'gasto.servicios_contables', label: 'SERVICIOS CONTABLES' },
  { key: 'gasto.pasajes', label: 'PASAJES' },
  { key: 'gasto.interes_bcp_2', label: 'INTERES BCP 2' },
  { key: 'gasto.interes_bcp_1', label: 'INTERES BCP 1' },
  { key: 'gasto.carga_celulares', label: 'CARGA CELULARES' },
  { key: 'gasto.pasajes_bcp', label: 'PASAJES BCP' },
  { key: 'gasto.mantenimiento_fotocopiadora', label: 'MANTENIMIENTO DE FOTOCOPIADORA' },
  { key: 'gasto.billete_doble_serie', label: 'BILLETE DOBLE SERIE' },
  { key: 'gasto.material_escritorio', label: 'MATERIAL DE ESCRITORIO' },
  { key: 'gasto.deposito_juan_carlos', label: 'DEPOSITO PENDIENTE JUAN CARLOS' },
  { key: 'gasto.internet', label: 'INTERNET' },
  { key: 'gasto.refrigerio', label: 'REFRIGERIO' },
  { key: 'gasto.mantenimiento_local', label: 'MANTENIMIENTO DE LOCAL' },
  { key: 'gasto.recarga_celulares', label: 'RECARGA CELULARES' },
  { key: 'gasto.lavado_acera', label: 'LAVADO DE ACERA' },
  { key: 'gasto.falla_chips_entel', label: 'FALLA DE CHIPS ENTEL' },
  { key: 'gasto.alquiler', label: 'ALQUILER' },
  { key: 'gasto.servicio_luz', label: 'SERVICIO DE LUZ' },
  { key: 'gasto.agua', label: 'AGUA' },
  { key: 'gasto.navidena', label: 'GASTOS NAVIDEÑOS' },
  { key: 'gasto.impuestos', label: 'IMPUESTOS' },
  { key: 'gasto.retiro_sobrante', label: 'RETIRO SOBRANTE' },
  { key: 'gasto.sueldo', label: 'SUELDO' },
];

export const RUBROS_PAGO_PASIVOS: RubroControl[] = [
  { key: 'pasivo.servicio_luz', label: 'SERV DE LUZ POR PAGAR ENERO' },
  { key: 'pasivo.intereses', label: 'INTERESES POR PAGAR ENERO' },
  { key: 'pasivo.internet', label: 'INTERNET POR PAGAR ENERO' },
  { key: 'pasivo.impuestos', label: 'IMPUESTOS POR PAGAR' },
  { key: 'pasivo.otros_ingresos', label: 'OTROS INGRESOS POR PAGAR' },
];

export const RUBROS_OTROS_INGRESOS: RubroControl[] = [
  { key: 'otro.material_escritorio', label: 'MATERIAL DE ESCRITORIO' },
  { key: 'otro.verificacion_billetes', label: 'SERVICIO DE VERIFICACION DE BILLETES' },
  { key: 'otro.comision_bcp', label: 'COMISIONES POR BCP' },
  { key: 'otro.comision_tigo_money', label: 'COMISIONES TIGO MONEY' },
  { key: 'otro.intereses_bcp', label: 'INTERESES BCP' },
  { key: 'otro.otros', label: 'OTROS INGRESOS' },
  { key: 'otro.comision_chips_viva', label: 'COMISIONES CHIPS VIVA' },
  { key: 'otro.comision_chip_tigo', label: 'COMISIONES CHIP TIGO' },
  { key: 'otro.prestamo', label: 'PRESTAMO' },
  { key: 'otro.sobrantes', label: 'Sobrantes en Caja' },
];

export const ANCHOS_COLUMNAS_TURNO = [
  15.99, 13.1, 15.88, 14.32, 12.44, 12.44, 12.44, 13.88, 12.99, 11.32, 11.32,
  14.99, 12.32, 12.44,
];
