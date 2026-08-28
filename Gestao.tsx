import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-gifted-charts';
import {
  styles,
  TopBar,
  gestaoUser,
  gestaoUserInitials,
  AuthIdentityContext,
  ToggleSwitch,
  NotificationRoutineFormModal,
  TemplateFormModal,
  notificationTriggerOptions,
  notificationChannelMeta,
  notificationAudienceOptions,
} from './App';
import type {
  ScreenProps,
  NotificationRoutineItem,
  NotificationTemplateItem,
  NotificationChannels,
  NotificationAudienceType,
} from './App';
import {
  fetchGestaoPostos,
  fetchGestaoDashboard,
  fetchGestaoVendas,
  fetchGestaoAbastecimentos,
  fetchGestaoMargem,
  fetchGestaoEncerrante,
  fetchGestaoNotifRotinas,
  createGestaoNotifRotina,
  updateGestaoNotifRotina,
  deleteGestaoNotifRotina,
  executarGestaoNotifRotina,
  fetchGestaoNotifTemplates,
  createGestaoNotifTemplate,
  updateGestaoNotifTemplate,
  deleteGestaoNotifTemplate,
  type GestaoPosto,
  type GestaoDashboardData,
  type GestaoVendasData,
  type GestaoAbastecimentoData,
  type GestaoMargemData,
  type GestaoEncerranteData,
  type GestaoNotifRotinaItem,
  type GestaoNotifTemplateItem,
  type GestaoNotifPublicoTipo,
} from './api';

// --- Helpers genéricos (mesmo padrão do Financeiro.tsx) ---

function formatBRL(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatBRLValor(value: number | null | undefined): string {
  return formatBRL(value).replace(/R\$\s?/, '').trim();
}

function formatBRLCompact(value: number): string {
  const abs = Math.abs(value);
  const sinal = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sinal}${(abs / 1_000_000).toFixed(1)}mi`;
  if (abs >= 1_000) return `${sinal}${(abs / 1_000).toFixed(0)}mil`;
  return `${sinal}${abs.toFixed(0)}`;
}

function formatNumeroBR(value: number | null | undefined, decimais = 0): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const gestaoMesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function gestaoPeriodoDatas(
  periodo: 'dia' | 'mes' | 'ano',
  refMes: number,
  refAno: number
): { dataInicial: string; dataFinal: string } {
  if (periodo === 'dia') {
    const iso = toIsoDate(new Date());
    return { dataInicial: iso, dataFinal: iso };
  }
  if (periodo === 'ano') {
    return { dataInicial: `${refAno}-01-01`, dataFinal: `${refAno}-12-31` };
  }
  const inicio = new Date(refAno, refMes - 1, 1);
  const fim = new Date(refAno, refMes, 0);
  return { dataInicial: toIsoDate(inicio), dataFinal: toIsoDate(fim) };
}

function showGestaoError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  return message || fallback;
}

function GestaoPageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={gsStyles.pageHeaderRow}>
      <View style={gsStyles.pageHeaderIconShell}>
        <Feather name={icon} size={20} color="#7C3AED" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={gsStyles.pageHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={gsStyles.pageHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function GestaoEmptyState({ message }: { message: string }) {
  return (
    <View style={gsStyles.emptyCard}>
      <Text style={gsStyles.emptyText}>{message}</Text>
    </View>
  );
}

function GestaoPeriodoFiltro({
  periodo,
  onChangePeriodo,
  refMes,
  refAno,
  onAnterior,
  onProximo,
}: {
  periodo: 'dia' | 'mes' | 'ano';
  onChangePeriodo: (p: 'dia' | 'mes' | 'ano') => void;
  refMes: number;
  refAno: number;
  onAnterior: () => void;
  onProximo: () => void;
}) {
  const periodoLabel = periodo === 'ano' ? String(refAno) : periodo === 'dia' ? 'Hoje' : `${gestaoMesesNomes[refMes - 1]} / ${refAno}`;
  return (
    <>
      <View style={gsStyles.filterSegmentRow}>
        {(['dia', 'mes', 'ano'] as const).map((opt) => {
          const isActive = periodo === opt;
          const label = opt === 'dia' ? 'Dia' : opt === 'mes' ? 'Mês' : 'Ano';
          return (
            <Pressable
              key={opt}
              style={[gsStyles.filterSegmentButton, isActive ? gsStyles.filterSegmentButtonActive : null]}
              onPress={() => onChangePeriodo(opt)}
            >
              <Text style={[gsStyles.filterSegmentText, isActive ? gsStyles.filterSegmentTextActive : null]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {periodo !== 'dia' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
          <Pressable onPress={onAnterior} style={gsStyles.monthNavButton}>
            <Feather name="chevron-left" size={18} color="#5E667D" />
          </Pressable>
          <Text style={gsStyles.monthLabel}>{periodoLabel}</Text>
          <Pressable onPress={onProximo} style={gsStyles.monthNavButton}>
            <Feather name="chevron-right" size={18} color="#5E667D" />
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

function usePeriodoNav() {
  const now = new Date();
  const [periodo, setPeriodo] = useState<'dia' | 'mes' | 'ano'>('mes');
  const [refMes, setRefMes] = useState(now.getMonth() + 1);
  const [refAno, setRefAno] = useState(now.getFullYear());

  const handleAnterior = () => {
    if (periodo === 'ano') {
      setRefAno((a) => a - 1);
      return;
    }
    if (refMes === 1) {
      setRefMes(12);
      setRefAno((a) => a - 1);
    } else {
      setRefMes((m) => m - 1);
    }
  };
  const handleProximo = () => {
    if (periodo === 'ano') {
      setRefAno((a) => a + 1);
      return;
    }
    if (refMes === 12) {
      setRefMes(1);
      setRefAno((a) => a + 1);
    } else {
      setRefMes((m) => m + 1);
    }
  };

  return { periodo, setPeriodo, refMes, refAno, handleAnterior, handleProximo };
}

function GestaoFilterModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={gsStyles.modalBackdrop}>
        <View style={[gsStyles.modalCard, { maxHeight: '82%' }]}>
          <View style={gsStyles.modalHeader}>
            <Text style={gsStyles.modalTitle}>{title ?? 'Filtros'}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
          <Pressable style={gsStyles.filterModalApplyButton} onPress={onClose}>
            <Text style={gsStyles.filterModalApplyButtonText}>Aplicar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function GestaoFilterOptionRow({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={gsStyles.filterOptionRow} onPress={onPress}>
      <Text style={[gsStyles.filterOptionRowText, active ? gsStyles.filterOptionRowTextActive : null]} numberOfLines={1}>
        {label}
      </Text>
      {active ? <Feather name="check" size={16} color="#7C3AED" /> : null}
    </Pressable>
  );
}

function GestaoPostoFilterRow({
  postos,
  selected,
  onSelect,
}: {
  postos: GestaoPosto[];
  selected: string | null;
  onSelect: (idq: string | null) => void;
}) {
  return (
    <View>
      <GestaoFilterOptionRow label="Todos os postos" active={selected === null} onPress={() => onSelect(null)} />
      {postos.map((posto) => (
        <GestaoFilterOptionRow
          key={posto.idq}
          label={posto.nome}
          active={selected === posto.idq}
          onPress={() => onSelect(posto.idq)}
        />
      ))}
    </View>
  );
}

function usePostos() {
  const [postos, setPostos] = useState<GestaoPosto[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [postoModalOpen, setPostoModalOpen] = useState(false);

  useEffect(() => {
    fetchGestaoPostos()
      .then(setPostos)
      .catch(() => setPostos([]));
  }, []);

  const postoLabel = postoSelecionado ? postos.find((p) => p.idq === postoSelecionado)?.nome ?? 'Posto' : 'Todos os postos';

  return { postos, postoSelecionado, setPostoSelecionado, postoModalOpen, setPostoModalOpen, postoLabel };
}

function GestaoPostoSelectButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={gsStyles.postoSelectButton} onPress={onPress}>
      <Text style={gsStyles.postoSelectText} numberOfLines={1}>
        {label}
      </Text>
      <Feather name="chevron-down" size={16} color="#5E667D" />
    </Pressable>
  );
}

// --- 1. Dashboard ---

export function GestaoDashboardScreen({ navigation }: ScreenProps<'GestaoDashboard'>) {
  const { periodo, setPeriodo, refMes, refAno, handleAnterior, handleProximo } = usePeriodoNav();
  const { postos, postoSelecionado, setPostoSelecionado, postoModalOpen, setPostoModalOpen, postoLabel } = usePostos();
  const [data, setData] = useState<GestaoDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const { dataInicial, dataFinal } = gestaoPeriodoDatas(periodo, refMes, refAno);
    fetchGestaoDashboard({ dataInicial, dataFinal, postoIds: postoSelecionado ? [postoSelecionado] : undefined })
      .then(setData)
      .catch((err) => setErrorMessage(showGestaoError(err, 'Não foi possível carregar o dashboard.')))
      .finally(() => setIsLoading(false));
  }, [periodo, refMes, refAno, postoSelecionado]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={gestaoUserInitials} variant="gestao" onAvatarPress={() => navigation.navigate('GestaoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <GestaoPageHeader icon="grid" title="Dashboard" subtitle="Visão consolidada de vendas, abastecimento e margem da rede." />

        <GestaoPeriodoFiltro
          periodo={periodo}
          onChangePeriodo={setPeriodo}
          refMes={refMes}
          refAno={refAno}
          onAnterior={handleAnterior}
          onProximo={handleProximo}
        />
        <GestaoPostoSelectButton label={postoLabel} onPress={() => setPostoModalOpen(true)} />

        {isLoading ? (
          <ActivityIndicator color="#7C3AED" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <GestaoEmptyState message={errorMessage} />
        ) : !data ? (
          <GestaoEmptyState message="Sem dados para o período." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Faturamento total</Text>
                <Text style={gsStyles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatBRL(data.totais.faturamento_total)}
                </Text>
                <Text style={gsStyles.kpiLabelUnidade}>combustíveis · pista</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Litros vendidos</Text>
                <Text style={gsStyles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatNumeroBR(data.totais.litros_total)} L
                </Text>
                <Text style={gsStyles.kpiLabelUnidade}>gasolina + etanol + diesel</Text>
              </View>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>GNV vendido</Text>
                <Text style={gsStyles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatNumeroBR(data.totais.gnv_m3)} m³
                </Text>
                <Text style={gsStyles.kpiLabelUnidade}>{formatBRL(data.totais.gnv_faturamento)}</Text>
              </View>
            </View>

            <View style={gsStyles.chartCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Feather name="droplet" size={14} color="#7C3AED" />
                <Text style={gsStyles.sectionTitle}>Preço médio por combustível</Text>
              </View>
              {data.combustiveis.length === 0 ? (
                <GestaoEmptyState message="Sem vendas no período." />
              ) : (
                data.combustiveis.map((item, idx) => (
                  <View key={`${item.tipo}-${idx}`} style={gsStyles.combustivelRow}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={gsStyles.listRowTitle} numberOfLines={1}>
                        {item.tipo}
                      </Text>
                      {item.aditivado ? (
                        <View style={gsStyles.badge}>
                          <Text style={gsStyles.badgeText}>ADITIVADO</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                      <Text style={gsStyles.listRowMeta}>
                        {formatBRL(item.preco_venda)}/{item.unidade}{'  '}
                        {item.custo > 0 ? `custo ${formatBRL(item.custo)}` : 'custo indisponível'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                      <Text style={gsStyles.listRowMeta}>
                        {formatNumeroBR(item.quantidade)} {item.unidade}
                      </Text>
                      <Text style={gsStyles.listRowValue}>{formatBRL(item.faturamento)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={gsStyles.chartCard}>
              <Text style={gsStyles.sectionTitle}>Top frentistas — Gasolina aditivada</Text>
              {data.ranking_gasolina_aditivada.length === 0 ? (
                <GestaoEmptyState message="Sem vendas no período." />
              ) : (
                data.ranking_gasolina_aditivada.map((item, idx) => (
                  <View key={idx} style={gsStyles.rankingRow}>
                    <Text style={gsStyles.listRowTitle} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text style={gsStyles.listRowValue}>{formatBRL(item.faturamento)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={gsStyles.chartCard}>
              <Text style={gsStyles.sectionTitle}>Top frentistas — Lubrificantes</Text>
              {data.ranking_lubrificantes.length === 0 ? (
                <GestaoEmptyState message="Sem vendas no período." />
              ) : (
                data.ranking_lubrificantes.map((item, idx) => (
                  <View key={idx} style={gsStyles.rankingRow}>
                    <Text style={gsStyles.listRowTitle} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text style={gsStyles.listRowValue}>{formatBRL(item.faturamento)}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <GestaoFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <GestaoPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
      </GestaoFilterModal>
    </SafeAreaView>
  );
}

// --- 2 e 5. Vendas (Pista / Loja) — mesmo componente base, muda só "divisao" ---

function GestaoVendasBase({
  navigation,
  divisao,
  title,
  subtitle,
}: {
  navigation: { navigate: (screen: 'GestaoProfile') => void };
  divisao: 'PISTA' | 'LOJA';
  title: string;
  subtitle: string;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(220, windowWidth - 40 - 24 - 32);
  const chartPlotWidth = Math.max(160, chartWidth - 44);
  const { periodo, setPeriodo, refMes, refAno, handleAnterior, handleProximo } = usePeriodoNav();
  const { postos, postoSelecionado, setPostoSelecionado, postoModalOpen, setPostoModalOpen, postoLabel } = usePostos();
  const [data, setData] = useState<GestaoVendasData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pointerIdx, setPointerIdx] = useState<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const { dataInicial, dataFinal } = gestaoPeriodoDatas(periodo, refMes, refAno);
    fetchGestaoVendas({ dataInicial, dataFinal, postoIds: postoSelecionado ? [postoSelecionado] : undefined, divisao })
      .then(setData)
      .catch((err) => setErrorMessage(showGestaoError(err, 'Não foi possível carregar as vendas.')))
      .finally(() => setIsLoading(false));
  }, [periodo, refMes, refAno, postoSelecionado, divisao]);

  const ticketMedio = data && data.totais.total_cupons > 0 ? data.totais.total_faturamento / data.totais.total_cupons : 0;

  const barLayout = useMemo(() => {
    const n = Math.max(1, data?.por_dia.length ?? 1);
    const espacoDisponivel = Math.max(60, chartPlotWidth - 16);
    const espacoPorDia = espacoDisponivel / n;
    const barWidth = Math.max(4, Math.min(22, espacoPorDia * 0.55));
    return { barWidth };
  }, [data?.por_dia.length, chartPlotWidth]);

  const chartMax = useMemo(() => {
    const max = Math.max(0, ...(data?.por_dia.map((p) => p.faturamento) ?? []));
    return max > 0 ? max * 1.1 : 1;
  }, [data]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={gestaoUserInitials} variant="gestao" onAvatarPress={() => navigation.navigate('GestaoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <GestaoPageHeader icon="dollar-sign" title={title} subtitle={subtitle} />

        <GestaoPeriodoFiltro
          periodo={periodo}
          onChangePeriodo={setPeriodo}
          refMes={refMes}
          refAno={refAno}
          onAnterior={handleAnterior}
          onProximo={handleProximo}
        />
        <GestaoPostoSelectButton label={postoLabel} onPress={() => setPostoModalOpen(true)} />

        {isLoading ? (
          <ActivityIndicator color="#7C3AED" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <GestaoEmptyState message={errorMessage} />
        ) : !data ? (
          <GestaoEmptyState message="Sem dados para o período." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Faturamento</Text>
                <Text style={gsStyles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatBRLValor(data.totais.total_faturamento)}
                </Text>
              </View>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Ticket médio</Text>
                <Text style={gsStyles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatBRLValor(ticketMedio)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Postos com venda</Text>
                <Text style={gsStyles.kpiValue}>{data.por_posto.length}</Text>
              </View>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Cupons</Text>
                <Text style={gsStyles.kpiValue}>{formatNumeroBR(data.totais.total_cupons)}</Text>
              </View>
            </View>

            {data.por_dia.length > 0 ? (
              <View style={gsStyles.chartCard}>
                <Text style={gsStyles.sectionTitle}>Faturamento diário</Text>
                <BarChart
                  data={data.por_dia.map((p) => ({ value: p.faturamento, label: p.dia.slice(8, 10) }))}
                  width={chartPlotWidth}
                  height={140}
                  barWidth={barLayout.barWidth}
                  barBorderRadius={3}
                  frontColor="#7C3AED"
                  maxValue={chartMax}
                  yAxisLabelWidth={44}
                  yAxisTextStyle={{ color: '#8A93A8', fontSize: 9 }}
                  xAxisLabelTextStyle={{ color: '#5E667D', fontSize: 9, fontWeight: '600' }}
                  formatYLabel={(label: string) => formatBRLCompact(Number(label))}
                  noOfSections={4}
                  initialSpacing={8}
                  endSpacing={8}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor="#E2E6F0"
                  rulesColor="#EEF0F6"
                  pointerConfig={{
                    pointerStripHeight: 130,
                    pointerStripColor: '#C7CCD9',
                    pointerColor: '#7C3AED',
                    radius: 5,
                    activatePointersInstantlyOnTouch: true,
                    persistPointer: true,
                    pointerLabelComponent: (_items: unknown, _secondary: unknown, pointerIndex: number) => {
                      setTimeout(() => setPointerIdx(pointerIndex), 0);
                      return null;
                    },
                  }}
                />
                {pointerIdx !== null && data.por_dia[pointerIdx] ? (
                  <Text style={[gsStyles.chartTooltipLine, { marginTop: 8, textAlign: 'center', fontWeight: '400' }]}>
                    {data.por_dia[pointerIdx].dia} · {formatBRL(data.por_dia[pointerIdx].faturamento)} · {data.por_dia[pointerIdx].cupons} cupons
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={gsStyles.chartCard}>
              <Text style={gsStyles.sectionTitle}>Faturamento por grupo</Text>
              {data.por_grupo.length === 0 ? (
                <GestaoEmptyState message="Sem dados no período." />
              ) : (
                data.por_grupo.map((item, idx) => (
                  <View key={idx} style={gsStyles.rankingRow}>
                    <Text style={gsStyles.listRowTitle} numberOfLines={1}>
                      {item.grupo}
                    </Text>
                    <Text style={gsStyles.listRowValue}>{formatBRL(item.faturamento)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={gsStyles.chartCard}>
              <Text style={gsStyles.sectionTitle}>Top vendedores / frentistas</Text>
              {data.por_vendedor.length === 0 ? (
                <GestaoEmptyState message="Sem dados no período." />
              ) : (
                data.por_vendedor.map((item, idx) => (
                  <View key={idx} style={gsStyles.rankingRow}>
                    <Text style={gsStyles.listRowTitle} numberOfLines={1}>
                      {item.vendedor}
                    </Text>
                    <Text style={gsStyles.listRowValue}>{formatBRL(item.faturamento)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={gsStyles.chartCard}>
              <Text style={gsStyles.sectionTitle}>Por forma de pagamento</Text>
              {data.por_pagamento.length === 0 ? (
                <GestaoEmptyState message="Sem dados no período." />
              ) : (
                data.por_pagamento.map((item, idx) => (
                  <View key={idx} style={gsStyles.rankingRow}>
                    <Text style={gsStyles.listRowTitle} numberOfLines={1}>
                      {item.forma}
                    </Text>
                    <Text style={gsStyles.listRowMeta}>{item.qtde}x</Text>
                    <Text style={gsStyles.listRowValue}>{formatBRL(item.valor)}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={gsStyles.sectionTitle}>Por posto</Text>
            {data.por_posto.length === 0 ? (
              <GestaoEmptyState message="Sem dados no período." />
            ) : (
              data.por_posto.map((item) => (
                <View key={item.posto_id} style={gsStyles.dreCard}>
                  <Text style={gsStyles.listRowTitle} numberOfLines={1}>
                    {item.posto_nome}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={gsStyles.listRowMeta}>{item.cupons} cupons</Text>
                    <Text style={gsStyles.listRowValue}>{formatBRL(item.faturamento)}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <GestaoFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <GestaoPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
      </GestaoFilterModal>
    </SafeAreaView>
  );
}

export function GestaoVendasPistaScreen({ navigation }: ScreenProps<'GestaoVendasPista'>) {
  return (
    <GestaoVendasBase
      navigation={navigation}
      divisao="PISTA"
      title="Vendas — Pista"
      subtitle="Vendas de combustíveis por posto, período e produto."
    />
  );
}

export function GestaoVendasLojaScreen({ navigation }: ScreenProps<'GestaoVendasLoja'>) {
  return (
    <GestaoVendasBase
      navigation={navigation}
      divisao="LOJA"
      title="Vendas — Loja"
      subtitle="Vendas da loja de conveniência por período e categoria."
    />
  );
}

// --- 3. Abastecimento ---

export function GestaoAbastecimentoScreen({ navigation }: ScreenProps<'GestaoAbastecimento'>) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(220, windowWidth - 40 - 24 - 32);
  const chartPlotWidth = Math.max(160, chartWidth - 44);
  const { periodo, setPeriodo, refMes, refAno, handleAnterior, handleProximo } = usePeriodoNav();
  const { postos, postoSelecionado, setPostoSelecionado, postoModalOpen, setPostoModalOpen, postoLabel } = usePostos();
  const [data, setData] = useState<GestaoAbastecimentoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pointerIdx, setPointerIdx] = useState<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const { dataInicial, dataFinal } = gestaoPeriodoDatas(periodo, refMes, refAno);
    fetchGestaoAbastecimentos({ dataInicial, dataFinal, postoIds: postoSelecionado ? [postoSelecionado] : undefined })
      .then(setData)
      .catch((err) => setErrorMessage(showGestaoError(err, 'Não foi possível carregar os abastecimentos.')))
      .finally(() => setIsLoading(false));
  }, [periodo, refMes, refAno, postoSelecionado]);

  const precoMedioLitro = data && data.totais.total_litros > 0 ? data.totais.total_faturamento / data.totais.total_litros : 0;

  const barLayout = useMemo(() => {
    const n = Math.max(1, data?.por_dia.length ?? 1);
    const espacoDisponivel = Math.max(60, chartPlotWidth - 16);
    const espacoPorDia = espacoDisponivel / n;
    return { barWidth: Math.max(4, Math.min(22, espacoPorDia * 0.55)) };
  }, [data?.por_dia.length, chartPlotWidth]);

  const chartMax = useMemo(() => {
    const max = Math.max(0, ...(data?.por_dia.map((p) => p.litros) ?? []));
    return max > 0 ? max * 1.1 : 1;
  }, [data]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={gestaoUserInitials} variant="gestao" onAvatarPress={() => navigation.navigate('GestaoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <GestaoPageHeader icon="droplet" title="Abastecimentos" subtitle="Volume abastecido, ticket médio e composição por bomba." />

        <GestaoPeriodoFiltro
          periodo={periodo}
          onChangePeriodo={setPeriodo}
          refMes={refMes}
          refAno={refAno}
          onAnterior={handleAnterior}
          onProximo={handleProximo}
        />
        <GestaoPostoSelectButton label={postoLabel} onPress={() => setPostoModalOpen(true)} />

        {isLoading ? (
          <ActivityIndicator color="#7C3AED" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <GestaoEmptyState message={errorMessage} />
        ) : !data ? (
          <GestaoEmptyState message="Sem dados para o período." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Litros vendidos</Text>
                <Text style={gsStyles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatNumeroBR(data.totais.total_litros)} L
                </Text>
              </View>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Faturamento</Text>
                <Text style={gsStyles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatBRLValor(data.totais.total_faturamento)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Preço médio/litro</Text>
                <Text style={gsStyles.kpiValue}>{formatBRLValor(precoMedioLitro)}</Text>
              </View>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Postos</Text>
                <Text style={gsStyles.kpiValue}>{data.por_posto.length}</Text>
              </View>
            </View>

            {data.por_dia.length > 0 ? (
              <View style={gsStyles.chartCard}>
                <Text style={gsStyles.sectionTitle}>Volume diário (litros)</Text>
                <BarChart
                  data={data.por_dia.map((p) => ({ value: p.litros, label: p.dia.slice(8, 10) }))}
                  width={chartPlotWidth}
                  height={140}
                  barWidth={barLayout.barWidth}
                  barBorderRadius={3}
                  frontColor="#7C3AED"
                  maxValue={chartMax}
                  yAxisLabelWidth={44}
                  yAxisTextStyle={{ color: '#8A93A8', fontSize: 9 }}
                  xAxisLabelTextStyle={{ color: '#5E667D', fontSize: 9, fontWeight: '600' }}
                  formatYLabel={(label: string) => formatBRLCompact(Number(label))}
                  noOfSections={4}
                  initialSpacing={8}
                  endSpacing={8}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor="#E2E6F0"
                  rulesColor="#EEF0F6"
                  pointerConfig={{
                    pointerStripHeight: 130,
                    pointerStripColor: '#C7CCD9',
                    pointerColor: '#7C3AED',
                    radius: 5,
                    activatePointersInstantlyOnTouch: true,
                    persistPointer: true,
                    pointerLabelComponent: (_items: unknown, _secondary: unknown, pointerIndex: number) => {
                      setTimeout(() => setPointerIdx(pointerIndex), 0);
                      return null;
                    },
                  }}
                />
                {pointerIdx !== null && data.por_dia[pointerIdx] ? (
                  <Text style={[gsStyles.chartTooltipLine, { marginTop: 8, textAlign: 'center', fontWeight: '400' }]}>
                    {data.por_dia[pointerIdx].dia} · {formatNumeroBR(data.por_dia[pointerIdx].litros)} L · {formatBRL(data.por_dia[pointerIdx].faturamento)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={gsStyles.chartCard}>
              <Text style={gsStyles.sectionTitle}>Volume por combustível</Text>
              {data.por_combustivel.length === 0 ? (
                <GestaoEmptyState message="Sem dados no período." />
              ) : (
                data.por_combustivel.map((item, idx) => (
                  <View key={idx} style={gsStyles.rankingRow}>
                    <Text style={gsStyles.listRowTitle} numberOfLines={1}>
                      {item.produto}
                    </Text>
                    <Text style={gsStyles.listRowMeta}>{formatNumeroBR(item.litros)} L</Text>
                    <Text style={gsStyles.listRowValue}>{formatBRL(item.faturamento)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={gsStyles.chartCard}>
              <Text style={gsStyles.sectionTitle}>Volume por turno</Text>
              {data.por_turno.length === 0 ? (
                <GestaoEmptyState message="Sem dados no período." />
              ) : (
                data.por_turno.map((item, idx) => (
                  <View key={idx} style={gsStyles.rankingRow}>
                    <Text style={gsStyles.listRowTitle} numberOfLines={1}>
                      {String(item.turno)}
                    </Text>
                    <Text style={gsStyles.listRowValue}>{formatNumeroBR(Number(item.litros ?? 0))} L</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={gsStyles.sectionTitle}>Ranking por posto</Text>
            {data.por_posto.length === 0 ? (
              <GestaoEmptyState message="Sem dados no período." />
            ) : (
              data.por_posto.map((item) => (
                <View key={item.posto_id} style={gsStyles.dreCard}>
                  <Text style={gsStyles.listRowTitle} numberOfLines={1}>
                    {item.posto_nome}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={gsStyles.listRowMeta}>{formatNumeroBR(item.litros)} L</Text>
                    <Text style={gsStyles.listRowValue}>{formatBRL(item.faturamento)}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <GestaoFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <GestaoPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
      </GestaoFilterModal>
    </SafeAreaView>
  );
}

// --- 4. Encerrante — ainda bloqueado no backend deles. Nunca simular dados;
// mostra o aviso real. ---

export function GestaoEncerranteScreen({ navigation }: ScreenProps<'GestaoEncerrante'>) {
  const [data, setData] = useState<GestaoEncerranteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGestaoEncerrante()
      .then(setData)
      .catch(() => setData({ disponivel: false, mensagem: 'Não foi possível consultar a disponibilidade do Encerrante.' }))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={gestaoUserInitials} variant="gestao" onAvatarPress={() => navigation.navigate('GestaoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <GestaoPageHeader icon="shield" title="Encerrante" subtitle="Divergências de encerrante e alertas antifraude na pista." />

        {isLoading ? (
          <ActivityIndicator color="#7C3AED" style={{ marginTop: 20 }} />
        ) : data && !data.disponivel ? (
          <View style={gsStyles.avisoBanner}>
            <Feather name="alert-triangle" size={18} color="#8A6D1D" />
            <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
              <Text style={gsStyles.avisoBannerTitle}>Encerrante — em preparação</Text>
              <Text style={gsStyles.avisoBannerText}>
                {data.mensagem ??
                  'A análise de continuidade de encerrantes depende de uma coluna que ainda não está sendo capturada em todos os postos.'}
              </Text>
            </View>
          </View>
        ) : (
          <GestaoEmptyState message="Sem dados disponíveis." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- 6. Margem (Loja) ---

export function GestaoMargemLojaScreen({ navigation }: ScreenProps<'GestaoMargemLoja'>) {
  const { postos, postoSelecionado, setPostoSelecionado, postoModalOpen, setPostoModalOpen, postoLabel } = usePostos();
  const [margemMinInput, setMargemMinInput] = useState('30');
  const [somenteAtivos, setSomenteAtivos] = useState(true);
  const [data, setData] = useState<GestaoMargemData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const margemMin = Number(margemMinInput.replace(',', '.')) || 30;
    setIsLoading(true);
    setErrorMessage(null);
    fetchGestaoMargem({ postoIds: postoSelecionado ? [postoSelecionado] : undefined, margemMin })
      .then(setData)
      .catch((err) => setErrorMessage(showGestaoError(err, 'Não foi possível carregar a margem.')))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postoSelecionado, margemMinInput]);

  const ofensoresVisiveis = useMemo(() => {
    if (!data) return [];
    return somenteAtivos ? data.ofensores.filter((o) => o.ativo) : data.ofensores;
  }, [data, somenteAtivos]);

  const distribuicaoItens = data
    ? [
        { label: 'Prejuízo (<0%)', value: data.distribuicao.prejuizo, color: '#E6213D' },
        { label: '0-10%', value: data.distribuicao.ate_10, color: '#DD6B20' },
        { label: '10-20%', value: data.distribuicao.de_10_a_20, color: '#D79A22' },
        { label: '20-30%', value: data.distribuicao.de_20_a_30, color: '#B7A233' },
        { label: '30-50%', value: data.distribuicao.de_30_a_50, color: '#5FA85D' },
        { label: '>50%', value: data.distribuicao.acima_50, color: '#18955A' },
      ]
    : [];
  const distribuicaoMax = Math.max(1, ...distribuicaoItens.map((i) => i.value));

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={gestaoUserInitials} variant="gestao" onAvatarPress={() => navigation.navigate('GestaoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <GestaoPageHeader icon="percent" title="Margem — Loja" subtitle="Margem por produto, categoria e posto no período selecionado." />

        <GestaoPostoSelectButton label={postoLabel} onPress={() => setPostoModalOpen(true)} />

        <View style={gsStyles.dreCard}>
          <Text style={gsStyles.formLabel}>Margem mínima (%)</Text>
          <TextInput
            style={gsStyles.formInput}
            value={margemMinInput}
            onChangeText={setMargemMinInput}
            keyboardType="numeric"
            placeholder="30"
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <ToggleSwitch value={somenteAtivos} onValueChange={() => setSomenteAtivos((v) => !v)} />
            <Text style={gsStyles.listRowMeta}>Somente produtos ativos</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#7C3AED" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <GestaoEmptyState message={errorMessage} />
        ) : !data ? (
          <GestaoEmptyState message="Sem dados." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Produtos analisados</Text>
                <Text style={gsStyles.kpiValue}>{formatNumeroBR(data.totais.total_produtos)}</Text>
              </View>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Abaixo de {margemMinInput}%</Text>
                <Text style={gsStyles.kpiValue}>{formatNumeroBR(data.totais.produtos_ofensores)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Em prejuízo</Text>
                <Text style={[gsStyles.kpiValue, { color: '#E6213D' }]}>{formatNumeroBR(data.totais.produtos_prejuizo)}</Text>
              </View>
              <View style={[gsStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={gsStyles.kpiLabel}>Margem média</Text>
                <Text style={[gsStyles.kpiValue, { color: data.totais.margem_media >= 0 ? '#18955A' : '#E6213D' }]}>
                  {formatNumeroBR(data.totais.margem_media, 1)}%
                </Text>
              </View>
            </View>

            <View style={gsStyles.chartCard}>
              <Text style={gsStyles.sectionTitle}>Distribuição por faixa de margem</Text>
              {distribuicaoItens.map((item) => (
                <View key={item.label} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={gsStyles.listRowMeta}>{item.label}</Text>
                    <Text style={gsStyles.listRowMeta}>{formatNumeroBR(item.value)}</Text>
                  </View>
                  <View style={gsStyles.distribBarTrack}>
                    <View
                      style={[
                        gsStyles.distribBarFill,
                        { width: `${Math.max(2, (item.value / distribuicaoMax) * 100)}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            <Text style={gsStyles.sectionTitle}>
              Produtos com margem abaixo de {margemMinInput}% ({ofensoresVisiveis.length})
            </Text>
            {ofensoresVisiveis.length === 0 ? (
              <GestaoEmptyState message="Nenhum produto ofensor no filtro atual." />
            ) : (
              ofensoresVisiveis.map((item, idx) => (
                <View key={`${item.posto_id}-${item.codpro}-${idx}`} style={gsStyles.dreCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[gsStyles.listRowTitle, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
                      {item.nompro}
                    </Text>
                    {!item.ativo ? (
                      <View style={[gsStyles.badge, { backgroundColor: '#F1F3F8' }]}>
                        <Text style={[gsStyles.badgeText, { color: '#5E667D' }]}>INATIVO</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={gsStyles.listRowMeta}>
                    {item.posto_nome} · cód. {item.codpro}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                    <Text style={gsStyles.listRowMeta}>Custo {formatBRL(item.custo)}</Text>
                    <Text style={gsStyles.listRowMeta}>Venda {formatBRL(item.preco_venda)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                    <Text style={[gsStyles.listRowMeta, { color: item.lucro_un >= 0 ? '#18955A' : '#E6213D' }]}>
                      Lucro un. {formatBRL(item.lucro_un)}
                    </Text>
                    <Text style={[gsStyles.listRowValue, { color: item.margem_pct >= 0 ? '#18955A' : '#E6213D' }]}>
                      {formatNumeroBR(item.margem_pct, 1)}%
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <GestaoFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <GestaoPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
      </GestaoFilterModal>
    </SafeAreaView>
  );
}

// --- 7. Notificações (mesma infra genérica do Financeiro, modulo=gst) ---

const GESTAO_NOTIF_AUDIENCE_TO_DB: Record<NotificationAudienceType, GestaoNotifPublicoTipo> = {
  todos: 'todos',
  colaboradores: 'colaboradores',
  posto: 'postos',
  cargo: 'cargos',
};
const GESTAO_NOTIF_AUDIENCE_FROM_DB: Record<GestaoNotifPublicoTipo, NotificationAudienceType> = {
  todos: 'todos',
  colaboradores: 'colaboradores',
  postos: 'posto',
  cargos: 'cargo',
};

function formatDateIsoBR(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function gestaoNotifTemplateToLocal(item: GestaoNotifTemplateItem): NotificationTemplateItem {
  return {
    id: item.id,
    code: item.codigo ?? '',
    title: item.nome ?? '',
    messageTitle: item.titulo ?? '',
    message: item.mensagem ?? '',
    variables: item.variaveis,
    isSystemDefault: item.isPadrao,
  };
}

function gestaoNotifRoutineToLocal(item: GestaoNotifRotinaItem, realTemplates: GestaoNotifTemplateItem[]): NotificationRoutineItem {
  const linkedTemplate = item.templateId ? realTemplates.find((t) => t.id === item.templateId) : null;
  return {
    id: item.id,
    title: item.nome ?? '',
    messageTitle: item.titulo ?? '',
    template: linkedTemplate ? linkedTemplate.nome || linkedTemplate.codigo || '' : 'Mensagem customizada',
    message: item.mensagem ?? '',
    triggerKind: item.tipoGatilho,
    cronSchedule: item.cronExpressao ?? '',
    eventCode: item.eventoCodigo ?? '',
    channels: {
      app: item.canais.includes('app'),
      email: item.canais.includes('email'),
      whatsapp: item.canais.includes('whatsapp'),
    },
    audienceType: GESTAO_NOTIF_AUDIENCE_FROM_DB[item.publicoTipo] ?? 'todos',
    audienceCargos: item.publicoTipo === 'cargos' ? item.publicoIds : [],
    lastRunLabel: item.ultimaExecucao ? formatDateIsoBR(item.ultimaExecucao) ?? '—' : '—',
    enabled: item.isActive,
  };
}

function gestaoNotifRoutineToWriteBody(local: NotificationRoutineItem, realTemplates: GestaoNotifTemplateItem[]) {
  const matchedTemplate =
    local.template && local.template !== 'Mensagem customizada'
      ? realTemplates.find((t) => (t.nome || t.codigo) === local.template)
      : null;
  return {
    nome: local.title,
    titulo: local.messageTitle,
    mensagem: local.message,
    template_id: matchedTemplate ? matchedTemplate.id : null,
    ativa: local.enabled,
    tipo_gatilho: local.triggerKind,
    cron_expressao: local.triggerKind === 'recorrente' ? local.cronSchedule : null,
    evento_codigo: local.triggerKind === 'evento' ? local.eventCode : null,
    canais: (Object.keys(local.channels) as Array<keyof NotificationChannels>).filter((key) => local.channels[key]),
    publico_tipo: GESTAO_NOTIF_AUDIENCE_TO_DB[local.audienceType],
    publico_ids: local.audienceType === 'cargo' ? local.audienceCargos : [],
  };
}

function gestaoNotifTemplateToWriteBody(local: NotificationTemplateItem) {
  return {
    codigo: local.code,
    nome: local.title,
    titulo: local.messageTitle,
    mensagem: local.message,
    variaveis: local.variables,
  };
}

export function GestaoNotificationsScreen({ navigation }: ScreenProps<'GestaoNotifications'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;
  const isFocused = useIsFocused();

  const [activeTab, setActiveTab] = useState<'routines' | 'templates'>('routines');

  const [realRoutines, setRealRoutines] = useState<GestaoNotifRotinaItem[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [routinesError, setRoutinesError] = useState<string | null>(null);
  const [isRoutineFormOpen, setIsRoutineFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<NotificationRoutineItem | null>(null);

  const [realTemplates, setRealTemplates] = useState<GestaoNotifTemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateItem | null>(null);

  const loadTemplates = useCallback(() => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);
    fetchGestaoNotifTemplates()
      .then((data) => setRealTemplates(data.templates))
      .catch((err) => setTemplatesError(showGestaoError(err, 'Não foi possível carregar os templates.')))
      .finally(() => setIsLoadingTemplates(false));
  }, []);

  const loadRoutines = useCallback(() => {
    setIsLoadingRoutines(true);
    setRoutinesError(null);
    fetchGestaoNotifRotinas()
      .then((data) => setRealRoutines(data.rotinas))
      .catch((err) => setRoutinesError(showGestaoError(err, 'Não foi possível carregar as rotinas.')))
      .finally(() => setIsLoadingRoutines(false));
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    loadTemplates();
  }, [loadTemplates, isFocused]);

  useEffect(() => {
    if (!isFocused) return;
    loadRoutines();
  }, [loadRoutines, isFocused]);

  const templates = useMemo(() => realTemplates.map(gestaoNotifTemplateToLocal), [realTemplates]);
  const routines = useMemo(
    () => realRoutines.map((item) => gestaoNotifRoutineToLocal(item, realTemplates)),
    [realRoutines, realTemplates]
  );

  const toggleRoutine = (id: string) => {
    const target = realRoutines.find((item) => item.id === id);
    if (!target) return;
    setRealRoutines((current) => current.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item)));
    updateGestaoNotifRotina(id, { ativa: !target.isActive }, actorId).catch((err) => {
      Alert.alert('Erro', showGestaoError(err, 'Não foi possível atualizar a rotina.'));
      loadRoutines();
    });
  };

  const handleSaveRoutine = (routine: NotificationRoutineItem) => {
    const body = gestaoNotifRoutineToWriteBody(routine, realTemplates);
    const isExisting = realRoutines.some((item) => item.id === routine.id);
    const request = isExisting
      ? updateGestaoNotifRotina(routine.id, body, actorId)
      : createGestaoNotifRotina(body, actorId);
    request
      .then(() => {
        setIsRoutineFormOpen(false);
        loadRoutines();
      })
      .catch((err) => Alert.alert('Erro', showGestaoError(err, 'Não foi possível salvar a rotina.')));
  };

  const handleRunRoutine = (routine: NotificationRoutineItem) => {
    executarGestaoNotifRotina(routine.id, actorId)
      .then(() => {
        Alert.alert('Rotina executada', `"${routine.title}" foi executada agora.`);
        loadRoutines();
      })
      .catch((err) => Alert.alert('Erro', showGestaoError(err, 'Não foi possível executar a rotina.')));
  };

  const handleDeleteRoutine = (routine: NotificationRoutineItem) => {
    Alert.alert('Excluir rotina', `Tem certeza que deseja excluir "${routine.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteGestaoNotifRotina(routine.id, actorId)
            .then(() => loadRoutines())
            .catch((err) => Alert.alert('Erro', showGestaoError(err, 'Não foi possível excluir a rotina.')));
        },
      },
    ]);
  };

  const handleSaveTemplate = (template: NotificationTemplateItem) => {
    const body = gestaoNotifTemplateToWriteBody(template);
    const isExisting = realTemplates.some((item) => item.id === template.id);
    const request = isExisting
      ? updateGestaoNotifTemplate(template.id, body, actorId)
      : createGestaoNotifTemplate(body, actorId);
    request
      .then(() => {
        setIsTemplateFormOpen(false);
        loadTemplates();
      })
      .catch((err) => Alert.alert('Erro', showGestaoError(err, 'Não foi possível salvar o template.')));
  };

  const handleDeleteTemplate = (template: NotificationTemplateItem) => {
    Alert.alert('Excluir template', `Tem certeza que deseja excluir "${template.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteGestaoNotifTemplate(template.id, actorId)
            .then(() => loadTemplates())
            .catch((err) =>
              Alert.alert('Erro', showGestaoError(err, 'Não foi possível excluir o template (templates padrão do sistema não podem ser excluídos).'))
            );
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={gestaoUserInitials} variant="gestao" onAvatarPress={() => navigation.navigate('GestaoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <GestaoPageHeader icon="bell" title="Notificações" subtitle="Envio de notificações via App, E-mail e WhatsApp." />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Pressable
            style={[gsStyles.filterPill, activeTab === 'routines' ? gsStyles.filterPillActive : null]}
            onPress={() => setActiveTab('routines')}
          >
            <Text style={[gsStyles.filterPillText, activeTab === 'routines' ? gsStyles.filterPillTextActive : null]}>Rotinas</Text>
          </Pressable>
          <Pressable
            style={[gsStyles.filterPill, activeTab === 'templates' ? gsStyles.filterPillActive : null]}
            onPress={() => setActiveTab('templates')}
          >
            <Text style={[gsStyles.filterPillText, activeTab === 'templates' ? gsStyles.filterPillTextActive : null]}>Templates</Text>
          </Pressable>
        </View>

        {activeTab === 'routines' ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={[gsStyles.countLabel, { flex: 1, minWidth: 0 }]}>
                {isLoadingRoutines ? 'Carregando...' : `${routines.length} rotina(s) cadastrada(s)`}
              </Text>
              <Pressable
                style={[gsStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }]}
                onPress={() => {
                  setEditingRoutine(null);
                  setIsRoutineFormOpen(true);
                }}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={gsStyles.suggestionButtonText}>Nova rotina</Text>
              </Pressable>
            </View>

            {isLoadingRoutines ? (
              <ActivityIndicator color="#7C3AED" style={{ marginTop: 20 }} />
            ) : routinesError ? (
              <GestaoEmptyState message={routinesError} />
            ) : routines.length === 0 ? (
              <GestaoEmptyState message="Nenhuma rotina cadastrada. Clique em Nova rotina." />
            ) : (
              routines.map((routine) => {
                const triggerMeta =
                  notificationTriggerOptions.find((option) => option.value === routine.triggerKind) ?? notificationTriggerOptions[2];
                const triggerDetail =
                  routine.triggerKind === 'recorrente' ? routine.cronSchedule : routine.triggerKind === 'evento' ? routine.eventCode : '';
                const channelLabels = (Object.keys(notificationChannelMeta) as Array<keyof NotificationChannels>)
                  .filter((key) => routine.channels[key])
                  .map((key) => notificationChannelMeta[key].label);
                const audienceLabel =
                  routine.audienceType === 'cargo'
                    ? `Por cargo (${routine.audienceCargos.length})`
                    : notificationAudienceOptions.find((option) => option.value === routine.audienceType)?.label ?? 'Todos os colaboradores';

                return (
                  <View key={routine.id} style={gsStyles.dreCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={gsStyles.listRowTitle} numberOfLines={1}>
                        {routine.title}
                      </Text>
                      <ToggleSwitch value={routine.enabled} onValueChange={() => toggleRoutine(routine.id)} />
                    </View>
                    <Text style={gsStyles.listRowMeta}>{routine.messageTitle}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <View style={[gsStyles.badge, { backgroundColor: '#EDE7FB' }]}>
                        <Text style={[gsStyles.badgeText, { color: '#5B3EBF' }]}>{triggerMeta.label}</Text>
                      </View>
                      <Text style={gsStyles.listRowMeta} numberOfLines={1}>
                        {channelLabels.length > 0 ? channelLabels.join(', ') : 'Nenhum canal'}
                      </Text>
                      <Text style={gsStyles.listRowMeta}>{audienceLabel}</Text>
                    </View>
                    {triggerDetail ? <Text style={[gsStyles.listRowMeta, { marginTop: 4 }]}>{triggerDetail}</Text> : null}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <Text style={gsStyles.listRowMeta}>
                        {routine.lastRunLabel === '—' ? 'Nunca executada' : `Última exec.: ${routine.lastRunLabel}`}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 14 }}>
                        <Pressable onPress={() => handleRunRoutine(routine)} hitSlop={6}>
                          <Feather name="play" size={15} color="#18955A" />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setEditingRoutine(routine);
                            setIsRoutineFormOpen(true);
                          }}
                          hitSlop={6}
                        >
                          <Feather name="edit-2" size={15} color="#3457D5" />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteRoutine(routine)} hitSlop={6}>
                          <Feather name="trash-2" size={15} color="#E6213D" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={[gsStyles.countLabel, { flex: 1, minWidth: 0 }]}>
                {isLoadingTemplates
                  ? 'Carregando...'
                  : `${templates.length} template(s)${templates.length > 0 ? ' — ⭐ padrão do sistema, demais customizados' : ''}`}
              </Text>
              <Pressable
                style={[gsStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }]}
                onPress={() => {
                  setEditingTemplate(null);
                  setIsTemplateFormOpen(true);
                }}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={gsStyles.suggestionButtonText}>Novo template</Text>
              </Pressable>
            </View>

            {isLoadingTemplates ? (
              <ActivityIndicator color="#7C3AED" style={{ marginTop: 20 }} />
            ) : templatesError ? (
              <GestaoEmptyState message={templatesError} />
            ) : templates.length === 0 ? (
              <GestaoEmptyState message="Nenhum template cadastrado ainda." />
            ) : (
              templates.map((template) => (
                <View key={template.id} style={gsStyles.dreCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {template.isSystemDefault ? <Feather name="star" size={14} color="#D79A22" /> : null}
                    <Text style={[gsStyles.listRowTitle, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
                      {template.title}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 14 }}>
                      <Pressable
                        onPress={() => {
                          setEditingTemplate(template);
                          setIsTemplateFormOpen(true);
                        }}
                        hitSlop={6}
                      >
                        <Feather name="edit-2" size={15} color="#3457D5" />
                      </Pressable>
                      {!template.isSystemDefault ? (
                        <Pressable onPress={() => handleDeleteTemplate(template)} hitSlop={6}>
                          <Feather name="trash-2" size={15} color="#E6213D" />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <Text style={gsStyles.listRowMeta}>{template.code}</Text>
                  <Text style={[gsStyles.listRowMeta, { marginTop: 4 }]}>{template.messageTitle}</Text>
                  <Text style={gsStyles.listRowMeta} numberOfLines={2}>
                    {template.message}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {template.variables.map((variable) => (
                      <View key={variable} style={[gsStyles.badge, { backgroundColor: '#F1F3F8' }]}>
                        <Text style={[gsStyles.badgeText, { color: '#5E667D' }]}>{variable}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <NotificationRoutineFormModal
        visible={isRoutineFormOpen}
        initialRoutine={editingRoutine}
        templates={templates}
        onClose={() => setIsRoutineFormOpen(false)}
        onSave={handleSaveRoutine}
      />

      <TemplateFormModal
        visible={isTemplateFormOpen}
        initialTemplate={editingTemplate}
        onClose={() => setIsTemplateFormOpen(false)}
        onSave={handleSaveTemplate}
      />
    </SafeAreaView>
  );
}

// --- 8. Configurações — sem previsão de entrega no web ainda. ---

export function GestaoConfiguracoesScreen({ navigation }: ScreenProps<'GestaoConfiguracoes'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={gestaoUserInitials} variant="gestao" onAvatarPress={() => navigation.navigate('GestaoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <GestaoPageHeader icon="settings" title="Configurações" subtitle="Parâmetros do módulo Gestão e integrações." />
        <View style={gsStyles.comingSoonCard}>
          <View style={gsStyles.comingSoonIconShell}>
            <Feather name="tool" size={22} color="#7C3AED" />
          </View>
          <View style={gsStyles.comingSoonBadge}>
            <Text style={gsStyles.comingSoonBadgeText}>Em breve</Text>
          </View>
          <Text style={gsStyles.comingSoonTitle}>Configurações</Text>
          <Text style={gsStyles.comingSoonText}>
            Este menu ainda está em construção no painel web — quando ficar disponível lá, replicamos aqui no app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Perfil ---

export function GestaoProfileScreen({ navigation }: ScreenProps<'GestaoProfile'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={gestaoUserInitials} variant="gestao" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <GestaoPageHeader icon="user" title="Meu Perfil" subtitle={gestaoUser.accessLabel} />
        <View style={gsStyles.profileCard}>
          <View style={gsStyles.profileAvatarShell}>
            <Text style={gsStyles.profileAvatarText}>{gestaoUserInitials}</Text>
          </View>
          <Text style={gsStyles.profileName}>{gestaoUser.fullName}</Text>
          <Text style={gsStyles.profileRole}>{gestaoUser.roleAndUnit}</Text>

          <View style={gsStyles.profileFieldRow}>
            <Feather name="mail" size={14} color="#7C8397" />
            <Text style={gsStyles.profileFieldText}>{gestaoUser.email}</Text>
          </View>
          <View style={gsStyles.profileFieldRow}>
            <Feather name="phone" size={14} color="#7C8397" />
            <Text style={gsStyles.profileFieldText}>{gestaoUser.phone}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const gsStyles = StyleSheet.create({
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyText: {
    color: '#7C8397',
    fontSize: 13,
    textAlign: 'center',
  },
  filterSegmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  filterSegmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
  },
  filterSegmentButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterSegmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E667D',
  },
  filterSegmentTextActive: {
    color: '#FFFFFF',
  },
  postoSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  postoSelectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0C1736',
    flex: 1,
    marginRight: 8,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    marginBottom: 16,
  },
  chartTooltipLine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0C1736',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0C1736',
    marginBottom: 8,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0C1736',
    minWidth: 90,
    textAlign: 'center',
  },
  listRowMeta: {
    color: '#7C8397',
    fontSize: 12,
    marginTop: 2,
  },
  listRowTitle: {
    color: '#0C1736',
    fontSize: 14,
    fontWeight: '700',
  },
  listRowValue: {
    color: '#0C1736',
    fontSize: 14,
    fontWeight: '800',
  },
  rankingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  combustivelRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,23,54,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#0C1736',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  filterOptionRowText: {
    fontSize: 13,
    color: '#0C1736',
    flex: 1,
    marginRight: 8,
  },
  filterOptionRowTextActive: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  filterModalApplyButton: {
    marginTop: 18,
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  filterModalApplyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  kpiCard: {
    backgroundColor: '#F8F5FE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3D8FA',
    padding: 12,
  },
  kpiLabel: {
    color: '#5B3EBF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  kpiLabelUnidade: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#8891A6',
  },
  kpiValue: {
    marginTop: 4,
    color: '#0C1736',
    fontSize: 17,
    fontWeight: '800',
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  pageHeaderIconShell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3EEFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeaderTitle: {
    color: '#0C1736',
    fontSize: 20,
    fontWeight: '800',
  },
  pageHeaderSubtitle: {
    marginTop: 2,
    color: '#677089',
    fontSize: 12,
  },
  dreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F3EEFE',
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '700',
  },
  formLabel: {
    color: '#5E667D',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0C1736',
    backgroundColor: '#FFFFFF',
  },
  distribBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F1F2F6',
    overflow: 'hidden',
  },
  distribBarFill: {
    height: 10,
    borderRadius: 5,
  },
  avisoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF6E4',
    borderWidth: 1,
    borderColor: '#F3DEA3',
    borderRadius: 14,
    padding: 14,
  },
  avisoBannerTitle: {
    color: '#8A6D1D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  avisoBannerText: {
    color: '#8A6D1D',
    fontSize: 12,
    lineHeight: 18,
  },
  filterPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterPillText: {
    color: '#5E667D',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  countLabel: {
    color: '#677089',
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  suggestionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  comingSoonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 28,
    alignItems: 'center',
  },
  comingSoonIconShell: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3EEFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  comingSoonBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#F1F2F6',
    marginBottom: 10,
  },
  comingSoonBadgeText: {
    color: '#5E667D',
    fontSize: 11,
    fontWeight: '700',
  },
  comingSoonTitle: {
    color: '#0C1736',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  comingSoonText: {
    color: '#677089',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 20,
    alignItems: 'center',
  },
  profileAvatarShell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  profileName: {
    color: '#0C1736',
    fontSize: 17,
    fontWeight: '800',
  },
  profileRole: {
    marginTop: 2,
    color: '#677089',
    fontSize: 12,
    marginBottom: 14,
  },
  profileFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
  },
  profileFieldText: {
    color: '#3A415C',
    fontSize: 13,
  },
});
