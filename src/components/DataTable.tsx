/**
 * DataTable genérica de alto contraste (RNF-03).
 *
 * Renderiza cualquier tabla tabular a partir de una definición de columnas.
 * (Ver `StandingsTable` para la tabla de posiciones específica.)
 */

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fontSizes, radius, shadows } from '../theme/colors';

export interface DataColumn<T> {
  key: string;
  label: string;
  flex?: number;
  alignRight?: boolean;
  render: (row: T, index: number) => React.ReactNode;
  /** Personalización de la celda de datos. */
  cellStyle?: 'bold' | 'normal';
}

export interface DataTableProps<T> {
  columns: Array<DataColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  highlightRow?: (row: T) => boolean;
}

function DataTableInner<T>({
  columns,
  rows,
  rowKey,
  highlightRow,
}: DataTableProps<T>) {
  return (
    <View style={styles.table}>
      <LinearGradient
        colors={colors.gradientDark}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerRow}>
        {columns.map((col) => (
          <View
            key={col.key}
            style={[styles.headerCell, { flex: col.flex ?? 1 }, col.alignRight && styles.right]}>
            <Text style={styles.headerText}>{col.label}</Text>
          </View>
        ))}
      </LinearGradient>

      {rows.map((row, index) => {
        const highlighted = highlightRow?.(row);
        return (
          <View
            key={rowKey(row)}
            style={[
              styles.row,
              index % 2 === 1 && styles.rowAlt,
              highlighted && styles.rowHighlight,
            ]}>
            {columns.map((col) => (
              <View
                key={col.key}
                style={[styles.cell, { flex: col.flex ?? 1 }, col.alignRight && styles.right]}>
                <Text
                  style={[
                    styles.cellText,
                    col.cellStyle === 'bold' && styles.cellBold,
                  ]}
                  numberOfLines={1}>
                  {col.render(row, index)}
                </Text>
              </View>
            ))}
          </View>
        );
      })}

      {rows.length === 0 && (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>Sin datos registrados.</Text>
        </View>
      )}
    </View>
  );
}

export const DataTable = memo(DataTableInner) as typeof DataTableInner;

const styles = StyleSheet.create({
  table: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 4,
  },
  headerCell: {
    alignItems: 'flex-start',
  },
  headerText: {
    color: colors.headerText,
    fontSize: fontSizes.tableHeader,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowAlt: {
    backgroundColor: colors.rowAlt,
  },
  rowHighlight: {
    backgroundColor: colors.highlightBackground,
  },
  cell: {
    alignItems: 'flex-start',
    minWidth: 0,
  },
  right: {
    alignItems: 'flex-end',
  },
  cellText: {
    fontSize: fontSizes.tableCell,
    color: colors.textPrimary,
  },
  cellBold: {
    fontWeight: '800',
  },
  emptyRow: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSizes.tableCell,
  },
});