/**
 * StandingsTable
 *
 * Renderiza la tabla de posiciones (RF-06) priorizando la legibilidad de
 * datos tabulares (RNF-03): alto contraste, filas alternadas, resaltado de
 * equipo propio y de las posiciones de podio.
 */

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { StandingRow } from '../types';
import { colors, fontSizes, radius, shadows } from '../theme/colors';
import { useEntrance } from '../utils/animation';
import { Avatar } from './ui/Avatar';

export interface StandingsTableProps {
  rows: StandingRow[];
  /**
   * Equipos a resaltar (por ID), ej.: el equipo del usuario.
   */
  highlightTeamIds?: Iterable<string>;
  /**
   * Si es `true` oculta columnas secundarias (GF/GC) dejando DG y PTS.
   * Útil en pantallas muy angostas.
   */
  compact?: boolean;
  /**
   * Escudos por ID de equipo para mostrarlos en la columna EQUIPO.
   */
  logosByTeamId?: Record<string, string | null>;
}

/** Etiquetas del encabezado. El anillo se renderiza con `flexGrow`. */
const COLUMNS: Array<{ key: string; label: string; flex: number; alignRight?: boolean }> = [
  { key: 'pos', label: '#', flex: 0.5, alignRight: true },
  { key: 'team', label: 'EQUIPO', flex: 2.2 },
  { key: 'pj', label: 'PJ', flex: 0.9, alignRight: true },
  { key: 'g', label: 'G', flex: 0.8, alignRight: true },
  { key: 'e', label: 'E', flex: 0.8, alignRight: true },
  { key: 'p', label: 'P', flex: 0.8, alignRight: true },
  { key: 'gf', label: 'GF', flex: 1, alignRight: true },
  { key: 'gc', label: 'GC', flex: 1, alignRight: true },
  { key: 'dg', label: 'DG', flex: 1, alignRight: true },
  { key: 'pts', label: 'PTS', flex: 1.2, alignRight: true },
];

/** Medalla circular para posiciones de podio. */
function PositionBadge({ position }: { position: number }) {
  const style =
    position === 1
      ? styles.medalGold
      : position === 2
        ? styles.medalSilver
        : position === 3
          ? styles.medalBronze
          : null;

  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, style ? styles.badgeTextMedal : undefined]}>
        {position}
      </Text>
    </View>
  );
}

/** Fila con entrada animada escalonada. */
function StandingRow({
  row,
  index,
  columns,
  highlight,
  logosByTeamId,
}: {
  row: StandingRow;
  index: number;
  columns: typeof COLUMNS;
  highlight: boolean;
  logosByTeamId?: Record<string, string | null>;
}) {
  const rowAnim = useEntrance(index * 45, 14);

  const renderCell = (colKey: string) => {
    switch (colKey) {
      case 'pos':
        return <PositionBadge position={row.position} />;
      case 'team':
        return (
          <View style={styles.teamCell}>
            <Avatar
              uri={logosByTeamId?.[row.teamId]}
              label={row.teamName}
              size={24}
            />
            <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
              {row.teamName}
            </Text>
          </View>
        );
      case 'pj':
        return row.played;
      case 'g':
        return row.won;
      case 'e':
        return row.drawn;
      case 'p':
        return row.lost;
      case 'gf':
        return row.goalsFor;
      case 'gc':
        return row.goalsAgainst;
      case 'dg':
        return row.goalDifference;
      case 'pts':
        return row.points;
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.row,
        index % 2 === 1 && styles.rowAlt,
        highlight && styles.rowHighlight,
        rowAnim.style,
      ]}>
      {columns.map((col) => {
        const content = renderCell(col.key);
        const isPlain =
          typeof content === 'string' ||
          typeof content === 'number';
        return (
          <View
            key={col.key}
            style={[
              styles.cell,
              { flex: col.flex },
              col.alignRight && styles.right,
            ]}>
            {isPlain ? (
              <Text
                style={[
                  styles.cellText,
                  (col.key === 'dg' || col.key === 'pts') && styles.cellBold,
                ]}
                numberOfLines={1}>
                {content}
              </Text>
            ) : (
              content
            )}
          </View>
        );
      })}
    </View>
  );
}

function StandingsTableInner({
  rows,
  highlightTeamIds,
  compact,
  logosByTeamId,
}: StandingsTableProps) {
  const highlight = new Set(highlightTeamIds ?? []);

  const visibleColumns = COLUMNS.filter(
    (col) => !compact || (col.key !== 'gf' && col.key !== 'gc'),
  );

  return (
    <View style={styles.table}>
      {/* Encabezado con gradiente */}
      <LinearGradient
        colors={colors.gradientDark}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerRow}>
        {visibleColumns.map((col) => (
          <View
            key={col.key}
            style={[styles.headerCell, { flex: col.flex }, col.alignRight && styles.right]}>
            <Text style={styles.headerCellText}>{col.label}</Text>
          </View>
        ))}
      </LinearGradient>

      {/* Filas */}
      {rows.map((row, index) => {
        const isHighlighted = highlight.has(row.teamId);
        return (
          <StandingRow
            key={row.teamId}
            row={row}
            index={index}
            columns={visibleColumns}
            highlight={isHighlighted}
            logosByTeamId={logosByTeamId}
          />
        );
      })}

      {rows.length === 0 && (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>Sin partidos finalizados aún.</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Tabla de posiciones (memorizada para evitar renders innecesarios,
 * RNF-02: render < 2s).
 */
export const StandingsTable = memo(StandingsTableInner);

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
  headerCellText: {
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
  teamName: {
    flex: 1,
    fontSize: fontSizes.tableCell,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  teamCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: fontSizes.tableHeader,
    fontWeight: '800',
  },
  badgeTextMedal: {
    color: colors.ink,
  },
  medalGold: {
    backgroundColor: colors.medalGold,
  },
  medalSilver: {
    backgroundColor: colors.medalSilver,
  },
  medalBronze: {
    backgroundColor: colors.medalBronze,
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