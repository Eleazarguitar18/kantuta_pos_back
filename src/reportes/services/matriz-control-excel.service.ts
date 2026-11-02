import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { FiltroMatrizControlDto } from '../dto/filtro-matriz-control.dto';
import {
  MatrizControlData,
  MatrizControlFila,
  MatrizControlSeccion,
  MatrizControlService,
} from './matriz-control.service';
import { ANCHOS_COLUMNAS_TURNO } from './matriz-control-layout';

const FORMATO_CONTABLE = '_(* #,##0.00_);_(* (#,##0.00);_(* -??_);_(@_)';
const FORMATO_ENTERO = '_(* #,##0_);_(* (#,##0);_(* -??_);_(@_)';

const round2 = (value: number): number =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

interface FilaLayout {
  row: number;
  key: string;
  label: string;
  tipo: 'caja' | 'dato' | 'total' | 'saldo';
  fila: MatrizControlFila;
  seccion?: MatrizControlSeccionKeyLayout;
}

type MatrizControlSeccionKeyLayout =
  | 'ingresos'
  | 'compras'
  | 'gastos'
  | 'pago_pasivos'
  | 'otros_ingresos'
  | 'activos'
  | 'deudas_agentes';

interface SeccionLayout {
  key: MatrizControlSeccionKeyLayout;
  label: string;
  filas: FilaLayout[];
  total: FilaLayout;
}

interface LayoutMatriz {
  filas: FilaLayout[];
  secciones: SeccionLayout[];
  deudasAgentes: SeccionLayout | null;
  cajaRow: number;
  saldoRow: number;
}

const FILLS_TOTALES: Record<string, { argb: string; underline: boolean; qBold: boolean }> = {
  ingresos: { argb: 'FFFFFF00', underline: false, qBold: true },
  compras: { argb: 'FFFFFF99', underline: true, qBold: true },
  gastos: { argb: 'FFFFFF99', underline: true, qBold: false },
  pago_pasivos: { argb: 'FFFF99CC', underline: true, qBold: true },
  otros_ingresos: { argb: 'FFFFFF00', underline: true, qBold: true },
  activos: { argb: 'FFFFFF99', underline: false, qBold: true },
  deudas_agentes: { argb: 'FFFFF2CC', underline: false, qBold: true },
};

@Injectable()
export class MatrizControlExcelService {
  constructor(private readonly matrizControlService: MatrizControlService) {}

  async generarExcel(dto: FiltroMatrizControlDto): Promise<Buffer> {
    const data = await this.matrizControlService.obtenerMatriz(dto);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kantuta POS';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('CONTROL DIARIO');
    this.construirHoja(ws, data);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  private construirHoja(
    ws: ExcelJS.Worksheet,
    data: MatrizControlData,
  ): void {
    const n = data.columnas.length;
    const ajustesCol = 2 + n;
    const totalCol = ajustesCol + 1;
    const totalCols = totalCol;

    ws.properties.defaultRowHeight = 14.4;
    ws.views = [
      {
        state: 'frozen',
        xSplit: 1,
        ySplit: 0,
        topLeftCell: 'B1',
        zoomScale: 115,
        zoomScaleNormal: 115,
      },
    ];
    ws.pageSetup.orientation = 'portrait';
    ws.pageSetup.paperSize = 1 as ExcelJS.PaperSize;
    ws.pageSetup.fitToPage = false;
    ws.pageSetup.margins = {
      left: 0,
      right: 0,
      top: 0.196527777777778,
      bottom: 0.196527777777778,
      header: 0.511811023622047,
      footer: 0.511811023622047,
    };

    ws.columns = [
      { key: 'concepto', width: 44.55 },
      ...Array.from({ length: n }, (_, index) => ({
        key: `turno_${index}`,
        width: ANCHOS_COLUMNAS_TURNO[index] ?? 12.44,
      })),
      { key: 'ajustes', width: 9.88 },
      { key: 'total', width: 11.99 },
    ];

    const title = ws.getCell(1, 1);
    title.value = 'CONTROL DIARIO';
    title.font = { name: 'Calibri', size: 11, bold: true };

    const periodo = ws.getCell(2, 1);
    periodo.value = data.periodo.titulo;
    periodo.font = { name: 'Calibri', size: 11, bold: true };

    data.columnas.forEach((columna, index) => {
      const cell = ws.getCell(2, 2 + index);
      cell.value = columna.etiqueta_operador;
      cell.font = { name: 'Calibri', size: 11, bold: true };

      if (!columna.vacia) {
        const horario = columna.hora_apertura
          ? `${columna.hora_apertura}${columna.hora_cierre ? ` - ${columna.hora_cierre}` : ' - actual'}`
          : '';
        const detalle = [columna.operador, columna.caja, horario]
          .filter(Boolean)
          .join('\n');
        if (detalle) {
          cell.note = { texts: [{ text: detalle }] };
        }
      }
    });

    for (let col = 1; col <= totalCols; col++) {
      const cell = ws.getCell(3, col);
      cell.font = { name: 'Arial', size: 11, bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: col === 2 || col === ajustesCol ? 'FFFF9900' : 'FFFFCC99',
        },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    data.columnas.forEach((columna, index) => {
      const cell = ws.getCell(3, 2 + index);
      cell.value = columna.dia;
      cell.numFmt = FORMATO_ENTERO;
    });

    ws.getCell(3, ajustesCol).value = 'AJUSTES';
    ws.getCell(3, totalCol).value = 'TOTAL';

    const layout = this.construirLayout(data);
    const saldoLetter = ws.getColumn(layout.saldoRow).letter;
    const ajustesLetter = ws.getColumn(ajustesCol).letter;
    const totalLetter = ws.getColumn(totalCol).letter;
    const ultimaColumnaDatos = n > 0 ? ws.getColumn(1 + n).letter : null;

    const caja = ws.getCell(layout.cajaRow, 1);
    caja.value = data.caja.label || 'Caja /Flujo';
    caja.font = { name: 'Calibri', size: 11 };
    caja.numFmt = FORMATO_CONTABLE;

    let columnaAnteriorReal: number | null = null;

    data.columnas.forEach((columna, index) => {
      const col = 2 + index;
      const cell = ws.getCell(layout.cajaRow, col);
      cell.numFmt = FORMATO_CONTABLE;

      if (columna.vacia) {
        cell.value = null;
        return;
      }

      if (columnaAnteriorReal === null) {
        cell.value = round2(Number(columna.caja_inicial_real || 0));
      } else {
        const anterior = ws.getColumn(columnaAnteriorReal).letter;
        cell.value = {
          formula: `${anterior}${layout.saldoRow}`,
          result: round2(Number(columna.caja_inicial || 0)),
        };
      }

      columnaAnteriorReal = col;
    });

    layout.filas.forEach((filaLayout) => {
      const { row, fila } = filaLayout;
      const etiqueta = ws.getCell(row, 1);
      etiqueta.value = fila.label;
      etiqueta.numFmt = FORMATO_CONTABLE;

      data.columnas.forEach((columna, index) => {
        const col = 2 + index;
        const cell = ws.getCell(row, col);

        if (columna.vacia) {
          cell.value = null;
          return;
        }

        const letter = ws.getColumn(col).letter;
        const valor = round2(Number(fila.valores[index] || 0));

        if (filaLayout.tipo === 'saldo') {
          cell.value = {
            formula: this.formulaSaldo(letter, layout),
            result: valor,
          };
          return;
        }

        if (filaLayout.tipo === 'caja') {
          return;
        }

        if (filaLayout.tipo === 'total' && filaLayout.seccion) {
          const seccion = layout.secciones.find(
            (item) => item.key === filaLayout.seccion,
          );
          const primera = seccion?.filas[0]?.row;
          const ultima = seccion?.total.row ? seccion.total.row - 1 : undefined;
          cell.value =
            primera && ultima && ultima >= primera
              ? {
                  formula: `SUM(${letter}${primera}:${letter}${ultima})`,
                  result: valor,
                }
              : valor === 0
                ? null
                : valor;
          return;
        }

        cell.value = valor === 0 ? null : valor;
      });

      if (filaLayout.tipo === 'saldo' || filaLayout.tipo === 'caja') {
        ws.getCell(row, ajustesCol).value = null;
        ws.getCell(row, totalCol).value = null;
        return;
      }

      if (filaLayout.seccion === 'deudas_agentes') {
        ws.getCell(row, ajustesCol).value = null;
        ws.getCell(row, totalCol).value = round2(Number(fila.total || 0));
        return;
      }

      if (filaLayout.tipo === 'total') {
        const seccion = layout.secciones.find(
          (item) => item.key === filaLayout.seccion,
        );
        const primera = seccion?.filas[0]?.row;
        const ultima = seccion?.total.row ? seccion.total.row - 1 : undefined;

        ws.getCell(row, ajustesCol).value =
          primera && ultima && ultima >= primera
            ? {
                formula: `SUM(${ajustesLetter}${primera}:${ajustesLetter}${ultima})`,
                result: round2(fila.ajuste),
              }
            : round2(fila.ajuste) || null;

        ws.getCell(row, totalCol).value =
          n > 0
            ? {
                formula: `SUM(B${row}:${ultimaColumnaDatos}${row})+${ajustesLetter}${row}`,
                result: round2(Number(fila.total || 0)),
              }
            : round2(Number(fila.total || 0));
        return;
      }

      if (fila.total !== null && fila.total !== undefined) {
        ws.getCell(row, ajustesCol).value =
          round2(fila.ajuste) === 0 ? null : round2(fila.ajuste);
        ws.getCell(row, totalCol).value =
          n > 0
            ? {
                formula: `SUM(B${row}:${ultimaColumnaDatos}${row})+${ajustesLetter}${row}`,
                result: round2(Number(fila.total || 0)),
              }
            : round2(Number(fila.total || 0));
      } else {
        ws.getCell(row, ajustesCol).value =
          round2(fila.ajuste) === 0 ? null : round2(fila.ajuste);
        ws.getCell(row, totalCol).value = null;
      }
    });

    this.aplicarEstilos(ws, data, layout, totalCols, ajustesCol, totalCol);
  }

  private construirLayout(data: MatrizControlData): LayoutMatriz {
    const filas: FilaLayout[] = [];
    const secciones: SeccionLayout[] = [];
    const cajaRow = 4;
    let row = cajaRow + 1;

    const seccionesVisibles = data.secciones.filter(
      (seccion) => seccion.filas.length > 0,
    );

    for (const seccion of seccionesVisibles) {
      const filasSeccion: FilaLayout[] = [];
      for (const fila of seccion.filas) {
        const item: FilaLayout = {
          row,
          key: fila.key,
          label: fila.label,
          tipo: 'dato',
          fila,
          seccion: seccion.key,
        };
        filas.push(item);
        filasSeccion.push(item);
        row += 1;
      }

      const total: FilaLayout = {
        row,
        key: seccion.total.key,
        label: seccion.total.label,
        tipo: 'total',
        fila: seccion.total,
        seccion: seccion.key,
      };
      filas.push(total);
      filasSeccion.push(total);
      secciones.push({
        key: seccion.key,
        label: seccion.label,
        filas: filasSeccion,
        total,
      });
      row += 1;
    }

    let deudasAgentes: SeccionLayout | null = null;
    if (data.deudas_agentes && data.deudas_agentes.filas.length > 0) {
      const filasDeudas: FilaLayout[] = [];
      for (const fila of data.deudas_agentes.filas) {
        const item: FilaLayout = {
          row,
          key: fila.key,
          label: fila.label,
          tipo: 'dato',
          fila,
          seccion: 'deudas_agentes',
        };
        filas.push(item);
        filasDeudas.push(item);
        row += 1;
      }
      const total: FilaLayout = {
        row,
        key: data.deudas_agentes.total.key,
        label: data.deudas_agentes.total.label,
        tipo: 'total',
        fila: data.deudas_agentes.total,
        seccion: 'deudas_agentes',
      };
      filas.push(total);
      filasDeudas.push(total);
      deudasAgentes = {
        key: 'deudas_agentes',
        label: data.deudas_agentes.label,
        filas: filasDeudas,
        total,
      };
      row += 1;
    }

    const saldoRow = row;
    filas.push({
      row: saldoRow,
      key: data.saldo.key,
      label: data.saldo.label,
      tipo: 'saldo',
      fila: data.saldo,
    });

    return {
      filas,
      secciones,
      deudasAgentes,
      cajaRow,
      saldoRow,
    };
  }

  private formulaSaldo(letter: string, layout: LayoutMatriz): string {
    const totalPorSeccion = new Map<string, number>();
    layout.secciones.forEach((seccion) => {
      totalPorSeccion.set(seccion.key, seccion.total.row);
    });

    const sumandos: string[] = [];
    const ingresos = totalPorSeccion.get('ingresos');
    const compras = totalPorSeccion.get('compras');
    const gastos = totalPorSeccion.get('gastos');
    const activos = totalPorSeccion.get('activos');
    const pasivos = totalPorSeccion.get('pago_pasivos');
    const otros = totalPorSeccion.get('otros_ingresos');

    sumandos.push(`${letter}${layout.cajaRow}`);
    if (ingresos) sumandos.push(`+${letter}${ingresos}`);
    if (compras) sumandos.push(`-${letter}${compras}`);
    if (gastos) sumandos.push(`-${letter}${gastos}`);
    if (activos) sumandos.push(`-${letter}${activos}`);
    if (pasivos) sumandos.push(`-${letter}${pasivos}`);
    if (otros) sumandos.push(`+${letter}${otros}`);

    return sumandos.length > 0 ? `SUM(${sumandos.join('')})` : '0';
  }

  private aplicarEstilos(
    ws: ExcelJS.Worksheet,
    data: MatrizControlData,
    layout: LayoutMatriz,
    totalCols: number,
    ajustesCol: number,
    totalCol: number,
  ): void {
    for (let row = 1; row <= layout.saldoRow; row++) {
      const label = String(ws.getCell(row, 1).value || '');
      const altura =
        row === 2 ? 28.8 : label.length > 38 ? 18.75 : 14.4;
      ws.getRow(row).height = altura;
    }

    for (let row = 1; row <= layout.saldoRow; row++) {
      for (let col = 1; col <= totalCols; col++) {
        const cell = ws.getCell(row, col);
        if (row === 3 && col >= 2 && col <= 1 + data.columnas.length) {
          cell.numFmt = FORMATO_ENTERO;
        } else {
          cell.numFmt = FORMATO_CONTABLE;
        }
      }
    }

    for (let row = 1; row <= layout.saldoRow; row++) {
      for (let col = 1; col <= totalCols; col++) {
        const cell = ws.getCell(row, col);
        if (row >= 4) cell.font = { name: 'Calibri', size: 11 };
      }
    }

    for (let col = 1; col <= totalCols; col++) {
      ws.getCell(2, col).font = { name: 'Calibri', size: 11, bold: true };
      ws.getCell(3, col).font = {
        name: 'Arial',
        size: 11,
        bold: true,
        underline: 'single',
      };
    }

    layout.secciones.forEach((seccion) => {
      const estilo = FILLS_TOTALES[seccion.key];
      if (estilo) {
        this.aplicarFilaTotal(
          ws,
          seccion.total.row,
          totalCols,
          totalCol,
          estilo.argb,
          true,
          estilo.underline,
          estilo.qBold,
        );
      }
    });

    if (layout.deudasAgentes) {
      this.aplicarFilaTotal(
        ws,
        layout.deudasAgentes.total.row,
        totalCols,
        totalCol,
        FILLS_TOTALES.deudas_agentes.argb,
        true,
        FILLS_TOTALES.deudas_agentes.underline,
        FILLS_TOTALES.deudas_agentes.qBold,
      );
    }

    this.aplicarFilaTotal(
      ws,
      layout.saldoRow,
      totalCols,
      totalCol,
      'FFCCFFCC',
      false,
      true,
      false,
    );

    ws.getCell(layout.cajaRow, 1).font = { name: 'Calibri', size: 11 };
    ws.getCell(layout.saldoRow, 1).font = {
      name: 'Arial',
      size: 11,
      bold: false,
      underline: 'single',
    };

    const borde = {
      top: { style: 'thin' as const, color: { argb: 'FF000000' } },
      left: { style: 'thin' as const, color: { argb: 'FF000000' } },
      bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
      right: { style: 'thin' as const, color: { argb: 'FF000000' } },
    };

    const inicioActivos =
      layout.secciones.find((seccion) => seccion.key === 'activos')?.filas[0]
        ?.row ?? null;

    if (inicioActivos !== null) {
      for (let row = inicioActivos; row <= layout.saldoRow; row++) {
        ws.getCell(row, 1).border = borde;
        ws.getCell(row, totalCol).border = borde;
      }
    }

    for (const fila of layout.filas) {
      if (fila.tipo === 'dato' && fila.seccion === 'activos') {
        ws.getCell(fila.row, ajustesCol).numFmt = FORMATO_CONTABLE;
      }
    }

    ws.getCell(3, ajustesCol).font = {
      name: 'Arial',
      size: 11,
      bold: true,
      underline: 'single',
    };
    ws.getCell(3, totalCol).font = {
      name: 'Arial',
      size: 11,
      bold: true,
      underline: 'single',
    };

    for (let col = 1; col <= totalCols; col++) {
      const cell = ws.getCell(3, col);
      if (col === 2 || col === ajustesCol) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF9900' },
        };
      }
    }
  }

  private aplicarFilaTotal(
    ws: ExcelJS.Worksheet,
    row: number,
    totalCols: number,
    totalCol: number,
    argb: string,
    aBold: boolean,
    aUnderline: boolean,
    qBold: boolean,
  ): void {
    for (let col = 1; col <= totalCols; col++) {
      const cell = ws.getCell(row, col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb },
      };

      if (col === 1) {
        cell.font = {
          name: 'Arial',
          size: 11,
          bold: aBold,
          underline: aUnderline ? 'single' : undefined,
        };
      } else {
        cell.font = {
          name: 'Calibri',
          size: 11,
          bold: col === totalCol && qBold,
        };
      }
    }
  }
}
