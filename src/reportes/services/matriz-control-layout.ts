export interface RubroControl {
  key: string;
  label: string;
}

export const FILA_CAJA = 4;

export const RUBROS_RECARGAS: RubroControl[] = [
  { key: 'ingreso.recarga_entel', label: 'R.ENTEL' },
  { key: 'ingreso.recarga_viva', label: 'R. VIVA' },
  { key: 'ingreso.recarga_tigo', label: 'R. TIGO' },
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
  { key: 'otro.comision_chips_viva', label: 'COMISIONES CHIPS VIVA' },
  { key: 'otro.comision_chip_tigo', label: 'COMISIONES CHIP TIGO' },
  { key: 'otro.prestamo', label: 'PRESTAMO' },
  { key: 'otro.sobrantes', label: 'Sobrantes en Caja' },
];

export const ANCHOS_COLUMNAS_TURNO = [
  15.99, 13.1, 15.88, 14.32, 12.44, 12.44, 12.44, 13.88, 12.99, 11.32, 11.32,
  14.99, 12.32, 12.44,
];
