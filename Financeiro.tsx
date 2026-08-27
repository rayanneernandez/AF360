import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-gifted-charts';
import {
  styles,
  TopBar,
  financeiroUser,
  financeiroUserInitials,
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
  fetchFinanceiroCentrosCusto,
  fetchFinanceiroContasBancarias,
  fetchFinanceiroFornecedores,
  fetchFinanceiroFornecedorDetalhe,
  fetchFinanceiroConfig,
  fetchFinanceiroContas,
  fetchFinanceiroDashboard,
  fetchFinanceiroFluxoCaixa,
  fetchFinanceiroConciliacao,
  conciliarFinanceiroMovimento,
  desvincularFinanceiroMovimento,
  fetchFinanceiroTitulosConciliar,
  fetchFinanceiroBalancete,
  fetchFinanceiroIaPredicoes,
  responderFinanceiroIaPredicao,
  reanalisarFinanceiroIa,
  fetchFinanceiroProjecoes,
  fetchFinanceiroRelatorio,
  salvarFinanceiroConfigChave,
  testarFinanceiroConexaoQuality,
  criarFinanceiroConfigPosto,
  atualizarFinanceiroConfigPosto,
  excluirFinanceiroConfigPosto,
  fetchFinanceiroNotifRotinas,
  createFinanceiroNotifRotina,
  updateFinanceiroNotifRotina,
  deleteFinanceiroNotifRotina,
  executarFinanceiroNotifRotina,
  fetchFinanceiroNotifTemplates,
  createFinanceiroNotifTemplate,
  updateFinanceiroNotifTemplate,
  deleteFinanceiroNotifTemplate,
  type FinanceiroCentroCustoItem,
  type FinanceiroContaBancaria,
  type FinanceiroFornecedorItem,
  type FinanceiroPostoConfig,
  type FinanceiroContaItem,
  type FinanceiroDashboardData,
  type FinanceiroPagamentoResumo,
  type FinanceiroFluxoCaixaData,
  type FinanceiroMovimentoItem,
  type FinanceiroConciliacaoResumo,
  type FinanceiroDreMes,
  type FinanceiroIaPredicaoItem,
  type FinanceiroProjecoesData,
  type FinanceiroProjecaoMes,
  type FinanceiroConfigData,
  type FinanceiroNotifRotinaItem,
  type FinanceiroNotifTemplateItem,
  type FinanceiroNotifGatilho,
  type FinanceiroNotifCanal,
  type FinanceiroNotifPublicoTipo,
} from './api';

// ---------- Financeiro (Gestão de Caixa) ----------
// Perfil novo (21/08/2026). Ainda SEM integração real com o banco — mensagem
// detalhada enviada à Lovable perguntando pelas tabelas/campos reais de
// contas a pagar/receber, fluxo de caixa, conciliação, balancete/DRE,
// fornecedores, centros de custo, contas bancárias, IA de lançamentos
// previstos, projeções e relatórios (arquivo
// mensagem-lovable-financeiro.txt). Enquanto não vier a confirmação, cada
// tela mostra um estado honesto de "aguardando integração" — NUNCA número ou
// lista inventada. Assim que a Lovable confirmar cada recurso, essas telas
// são substituídas uma a uma pelo mesmo padrão usado em RH/Diretoria
// (lovable.js -> routes -> api.ts -> tela real).

function FinanceiroPageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={fnStyles.pageHeaderRow}>
      <View style={fnStyles.pageHeaderIconShell}>
        <Feather name={icon} size={20} color="#C05621" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={fnStyles.pageHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={fnStyles.pageHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function FinanceiroPendingState({ message }: { message: string }) {
  return (
    <View style={fnStyles.pendingCard}>
      <Feather name="clock" size={22} color="#C05621" />
      <Text style={fnStyles.pendingText}>{message}</Text>
    </View>
  );
}

function FinanceiroPlaceholderScreen({
  navigation,
  icon,
  title,
  subtitle,
  pendingMessage,
}: {
  navigation: { navigate: (route: 'FinanceiroProfile') => void };
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  pendingMessage: string;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={financeiroUserInitials}
          variant="financeiro"
          onAvatarPress={() => navigation.navigate('FinanceiroProfile')}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader icon={icon} title={title} subtitle={subtitle} />
        <FinanceiroPendingState message={pendingMessage} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Helpers compartilhados pelas telas já integradas ----------

function formatBRL(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateIsoBR(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Converte os pills de período (Hoje/Próximos 7 dias/Mês/Este ano etc.) pro
// contrato real confirmado pela Lovable em 21/08/2026: dataInicial/dataFinal
// (YYYY-MM-DD). Sem seleção = mês corrente até hoje (default do backend).
function financeiroMesesAtras(meses: number): { dataInicial: string; dataFinal: string } {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - meses, hoje.getDate());
  return { dataInicial: toIsoDate(inicio), dataFinal: toIsoDate(hoje) };
}

function financeiroPeriodoParaDatas(periodo: 'hoje' | '7dias' | 'mes' | 'ano'): { dataInicial: string; dataFinal: string } {
  const hoje = new Date();
  if (periodo === 'hoje') {
    const iso = toIsoDate(hoje);
    return { dataInicial: iso, dataFinal: iso };
  }
  if (periodo === '7dias') {
    const fim = new Date(hoje);
    fim.setDate(fim.getDate() + 7);
    return { dataInicial: toIsoDate(hoje), dataFinal: toIsoDate(fim) };
  }
  if (periodo === 'ano') {
    return { dataInicial: `${hoje.getFullYear()}-01-01`, dataFinal: `${hoje.getFullYear()}-12-31` };
  }
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return { dataInicial: toIsoDate(inicioMes), dataFinal: toIsoDate(fimMes) };
}

// Rótulo compacto pro eixo Y dos gráficos (evita números longos tipo
// "-22.155.656,68" espremidos na lateral do gráfico).
// Mesmo valor de formatBRL, mas sem o prefixo "R$" — usado nos 3 cards do topo do
// Dashboard, onde o "R$" vai junto do rótulo (ex.: "A receber hoje (R$)") pra sobrar
// mais espaço/fonte maior pro número em si.
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

const financeiroMesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Dia/Mês/Ano com navegação de período (como no web) — usado no Dashboard.
function financeiroDashboardPeriodoDatas(
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

function showFinanceiroError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  // eslint-disable-next-line no-alert -- mesmo padrão de showRhSaveError (RH.tsx): Alert.alert já é usado direto nas telas que chamam isso.
  return message || fallback;
}

function FinanceiroEmptyState({ message }: { message: string }) {
  return (
    <View style={fnStyles.emptyCard}>
      <Text style={fnStyles.emptyText}>{message}</Text>
    </View>
  );
}

function FinanceiroChartLegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: '#5E667D' }}>{label}</Text>
    </View>
  );
}

// Card com cabeçalho (ícone + título + total) e lista rolável por dentro —
// mesmo formato de duas caixas separadas do web (Pagamentos para hoje /
// Pagamentos nos próximos 7 dias), só que empilhadas no app.
function FinanceiroDashboardListCard({
  icon,
  title,
  emptyMessage,
  items,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  emptyMessage: string;
  items: FinanceiroPagamentoResumo[];
}) {
  const total = items.reduce((acc, item) => acc + item.valor, 0);
  return (
    <View style={fnStyles.dashboardListCard}>
      <View style={fnStyles.dashboardListCardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name={icon} size={16} color="#C05621" />
          <Text style={fnStyles.dashboardListCardTitle}>{title}</Text>
        </View>
        <Text style={fnStyles.dashboardListCardTotal} numberOfLines={1}>
          {formatBRL(total)}
        </Text>
      </View>
      <View style={fnStyles.dashboardListCardDivider} />
      {items.length === 0 ? (
        <FinanceiroEmptyState message={emptyMessage} />
      ) : (
        <ScrollView style={fnStyles.dashboardListCardBody} nestedScrollEnabled showsVerticalScrollIndicator>
          {items.map((item, idx) => (
            <View key={idx} style={fnStyles.dashboardListCardRow}>
              <View style={{ flex: 1 }}>
                <Text style={fnStyles.dashboardListCardRowTitle} numberOfLines={1}>
                  {item.descricao}
                </Text>
                <Text style={fnStyles.listRowMeta} numberOfLines={1}>
                  {item.contraparte}
                  {item.posto ? ` · ${item.posto}` : ''}
                  {item.vencimento ? ` · Vence ${formatDateIsoBR(item.vencimento) ?? ''}` : ''}
                </Text>
              </View>
              <Text style={fnStyles.dashboardListCardRowValue}>{formatBRL(item.valor)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Filtro de posto por pills (a lista de postos vem de fin_dre_chaves via
// fetchFinanceiroConfig — não é rh_unidades). "Todos os postos" sempre
// disponível mesmo sem nenhum posto configurado ainda.
// unidadeIds usa o `id` (uuid) do posto — confirmado pela Lovable em
// 21/08/2026 — NÃO é o empresaCodigo (esse só aparece pra exibição).
function FinanceiroPostoFilterRow({
  postos,
  selected,
  onSelect,
}: {
  postos: FinanceiroPostoConfig[];
  selected: string | null;
  onSelect: (unidadeId: string | null) => void;
}) {
  return (
    <View>
      <FinanceiroFilterOptionRow label="Todos os postos" active={selected === null} onPress={() => onSelect(null)} />
      {postos.map((posto) => (
        <FinanceiroFilterOptionRow
          key={posto.id}
          label={posto.nome}
          active={selected === posto.id}
          onPress={() => onSelect(posto.id)}
        />
      ))}
    </View>
  );
}

// ---------- Filtros em modal ----------
// Antes os filtros (posto, período, aba, etc.) ficavam em pílulas lado a
// lado no topo de cada tela — poluído e feio em telas com vários filtros.
// Agora cada tela mostra um único botão "Filtros" que abre um modal com
// as opções empilhadas verticalmente.

function FinanceiroFilterOptionRow({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={fnStyles.filterOptionRow} onPress={onPress}>
      <Text style={[fnStyles.filterOptionRowText, active ? fnStyles.filterOptionRowTextActive : null]} numberOfLines={1}>
        {label}
      </Text>
      {active ? <Feather name="check" size={16} color="#C05621" /> : null}
    </Pressable>
  );
}

function FinanceiroFilterSectionTitle({ label }: { label: string }) {
  return <Text style={fnStyles.filterModalSectionTitle}>{label}</Text>;
}

function FinanceiroFilterTriggerButton({ onPress, activeCount }: { onPress: () => void; activeCount?: number }) {
  return (
    <Pressable style={fnStyles.filterTriggerButton} onPress={onPress}>
      <Feather name="sliders" size={14} color="#5E667D" />
      <Text style={fnStyles.filterTriggerText}>Filtros</Text>
      {activeCount ? (
        <View style={fnStyles.filterTriggerBadge}>
          <Text style={fnStyles.filterTriggerBadgeText}>{activeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function FinanceiroFilterModal({
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
      <View style={fnStyles.modalBackdrop}>
        <View style={[fnStyles.modalCard, { maxHeight: '82%' }]}>
          <View style={fnStyles.modalHeader}>
            <Text style={fnStyles.modalTitle}>{title ?? 'Filtros'}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
          <Pressable style={fnStyles.filterModalApplyButton} onPress={onClose}>
            <Text style={fnStyles.filterModalApplyButtonText}>Aplicar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function FinanceiroSearchInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  return (
    <View style={fnStyles.searchRow}>
      <Feather name="search" size={16} color="#9AA1B5" />
      <TextInput
        style={fnStyles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A7AEC2"
      />
    </View>
  );
}

// ---------- Centros de Custo ----------

export function FinanceiroCentrosCustoScreen({ navigation }: ScreenProps<'FinanceiroCentrosCusto'>) {
  const [itens, setItens] = useState<FinanceiroCentroCustoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroCentrosCusto()
      .then(setItens)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar os centros de custo.')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtrados = itens.filter(
    (item) =>
      !busca.trim() ||
      item.descricao.toLowerCase().includes(busca.trim().toLowerCase()) ||
      item.centroCustoCodigo.toLowerCase().includes(busca.trim().toLowerCase())
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader icon="layers" title="Centros de Custo" subtitle="Estrutura de centros de custo e rateio por unidade." />
        <FinanceiroSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar centro de custo..." />
        <Text style={fnStyles.countLabel}>{filtrados.length} centro(s) de custo</Text>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : filtrados.length === 0 ? (
          <FinanceiroEmptyState message="Nenhum centro de custo encontrado." />
        ) : (
          filtrados.map((item) => (
            <View key={item.centroCustoCodigo} style={fnStyles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={fnStyles.listRowTitle}>{item.descricao}</Text>
                <Text style={fnStyles.listRowMeta}>Código {item.centroCustoCodigo}</Text>
              </View>
              <View style={fnStyles.badge}>
                <Text style={fnStyles.badgeText}>{item.tipo}</Text>
              </View>
            </View>
          ))
        )}

        <Text style={fnStyles.footerNote}>Cadastro somente leitura — novos centros de custo devem ser criados no sistema Quality.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Contas Bancárias ----------

export function FinanceiroContasBancariasScreen({ navigation }: ScreenProps<'FinanceiroContasBancarias'>) {
  const [itens, setItens] = useState<FinanceiroContaBancaria[]>([]);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [postoModalOpen, setPostoModalOpen] = useState(false);
  const postoLabel = postoSelecionado ? postos.find((p) => p.id === postoSelecionado)?.nome ?? 'Posto' : 'Todos os postos';

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroContasBancarias({
      unidadeIds: postoSelecionado ? [postoSelecionado] : undefined,
      busca: busca.trim() || undefined,
    })
      .then(setItens)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar as contas bancárias.')))
      .finally(() => setIsLoading(false));
  }, [postoSelecionado, busca]);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  const saldoTotal = itens.reduce((acc, item) => acc + (item.ativo ? item.saldoAtual : 0), 0);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader icon="credit-card" title="Contas Bancárias" subtitle="Contas bancárias das unidades e saldos de referência." />
        <Pressable style={[fnStyles.postoSelectButton, { marginBottom: 10 }]} onPress={() => setPostoModalOpen(true)}>
          <Text style={fnStyles.postoSelectText} numberOfLines={1}>
            {postoLabel}
          </Text>
          <Feather name="chevron-down" size={16} color="#5E667D" />
        </Pressable>
        <FinanceiroSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar conta..." />
        <View style={fnStyles.countRow}>
          <Text style={fnStyles.countLabel}>{itens.length} conta(s)</Text>
          <Text style={[fnStyles.countLabel, { color: saldoTotal < 0 ? '#E6213D' : '#18955A' }]}>
            Saldo total (ativas): {formatBRL(saldoTotal)}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : itens.length === 0 ? (
          <FinanceiroEmptyState message="Nenhuma conta bancária encontrada." />
        ) : (
          itens.map((item) => (
            <View key={`${item.contaCodigo}-${item.empresaCodigo}`} style={fnStyles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={fnStyles.listRowTitle}>{item.descricao}</Text>
                <Text style={fnStyles.listRowMeta}>
                  {item.posto} · Código {item.contaCodigo}
                  {item.usaOfx ? ' · OFX' : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[fnStyles.listRowValue, { color: item.saldoAtual < 0 ? '#E6213D' : '#18955A' }]}>
                  {formatBRL(item.saldoAtual)}
                </Text>
                <View style={[fnStyles.badge, { backgroundColor: item.ativo ? '#E3F5EA' : '#F1F2F6', marginTop: 4 }]}>
                  <Text style={[fnStyles.badgeText, { color: item.ativo ? '#18955A' : '#5E667D' }]}>
                    {item.ativo ? 'Ativa' : 'Inativa'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <FinanceiroFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <FinanceiroPostoFilterRow
          postos={postos}
          selected={postoSelecionado}
          onSelect={(id) => {
            setPostoSelecionado(id);
            setPostoModalOpen(false);
          }}
        />
      </FinanceiroFilterModal>
    </SafeAreaView>
  );
}

// ---------- Fornecedores ----------

const financeiroFornecedorPeriodoOptions = [
  { label: 'Últimos 3 meses', value: 3 },
  { label: 'Últimos 6 meses', value: 6 },
  { label: 'Últimos 12 meses', value: 12 },
];

function FinanceiroFornecedorDetalheModal({
  fornecedorCodigo,
  meses,
  onClose,
}: {
  fornecedorCodigo: string | null;
  meses: number;
  onClose: () => void;
}) {
  const [detalhe, setDetalhe] = useState<FinanceiroFornecedorItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!fornecedorCodigo) return;
    setIsLoading(true);
    setDetalhe(null);
    fetchFinanceiroFornecedorDetalhe(fornecedorCodigo, financeiroMesesAtras(meses))
      .then(setDetalhe)
      .catch(() => setDetalhe(null))
      .finally(() => setIsLoading(false));
  }, [fornecedorCodigo, meses]);

  return (
    <Modal visible={fornecedorCodigo !== null} animationType="fade" transparent onRequestClose={onClose}>
      <View style={fnStyles.modalBackdrop}>
        <View style={[fnStyles.modalCard, { maxHeight: '85%' }]}>
          <View style={fnStyles.modalHeader}>
            <Text style={fnStyles.modalTitle} numberOfLines={1}>
              {detalhe?.razao ?? 'Fornecedor'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading || !detalhe ? (
              <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
            ) : (
              <>
                <View style={{ gap: 8, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                      <Text style={fnStyles.kpiLabel}>Títulos no período</Text>
                      <Text style={fnStyles.kpiValue}>{detalhe.titulos}</Text>
                    </View>
                    <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                      <Text style={fnStyles.kpiLabel}>Total</Text>
                      <Text style={fnStyles.kpiValue}>{formatBRL(detalhe.valorTotal)}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                      <Text style={fnStyles.kpiLabel}>Em aberto</Text>
                      <Text style={fnStyles.kpiValue}>{formatBRL(detalhe.valorAberto ?? 0)}</Text>
                    </View>
                    <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                      <Text style={fnStyles.kpiLabel}>Último vencimento</Text>
                      <Text style={fnStyles.kpiValue}>{formatDateIsoBR(detalhe.ultimoVencimento) ?? '—'}</Text>
                    </View>
                  </View>
                </View>

                <Text style={fnStyles.listRowMeta}>CNPJ/CPF: {detalhe.cnpjCpf}</Text>
                {detalhe.fantasia ? <Text style={fnStyles.listRowMeta}>Fantasia: {detalhe.fantasia}</Text> : null}
                {detalhe.cidade ? <Text style={fnStyles.listRowMeta}>{detalhe.cidade}/{detalhe.uf}</Text> : null}

                <Text style={[fnStyles.listRowTitle, { marginTop: 14, marginBottom: 6 }]}>Por posto</Text>
                {(detalhe.porPosto ?? []).map((linha) => (
                  <View key={linha.posto} style={[fnStyles.listRowSimple, { flexDirection: 'column', alignItems: 'stretch' }]}>
                    <Text style={[fnStyles.listRowTitle, { fontSize: 13, fontWeight: '400' }]}>{linha.posto}</Text>
                    <Text style={fnStyles.listRowMeta}>
                      {linha.titulos} título(s) · {formatBRL(linha.valor)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function FinanceiroFornecedoresScreen({ navigation }: ScreenProps<'FinanceiroFornecedores'>) {
  const [itens, setItens] = useState<FinanceiroFornecedorItem[]>([]);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [meses, setMeses] = useState(3);
  const [selecionadoCodigo, setSelecionadoCodigo] = useState<string | null>(null);
  const [periodoModalOpen, setPeriodoModalOpen] = useState(false);
  const [postoModalOpen, setPostoModalOpen] = useState(false);

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroFornecedores({
      ...financeiroMesesAtras(meses),
      unidadeIds: postoSelecionado ? [postoSelecionado] : undefined,
      busca: busca.trim() || undefined,
    })
      .then(setItens)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar os fornecedores.')))
      .finally(() => setIsLoading(false));
  }, [meses, postoSelecionado, busca]);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader icon="briefcase" title="Fornecedores" subtitle="Cadastro de fornecedores, condições e dados de pagamento." />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <Pressable style={[fnStyles.postoSelectButton, { flex: 1 }]} onPress={() => setPeriodoModalOpen(true)}>
            <Text style={fnStyles.postoSelectText} numberOfLines={1}>
              {financeiroFornecedorPeriodoOptions.find((o) => o.value === meses)?.label ?? 'Período'}
            </Text>
            <Feather name="chevron-down" size={14} color="#5E667D" />
          </Pressable>
          <Pressable style={[fnStyles.postoSelectButton, { flex: 1 }]} onPress={() => setPostoModalOpen(true)}>
            <Text style={fnStyles.postoSelectText} numberOfLines={1}>
              {postoSelecionado ? postos.find((p) => p.id === postoSelecionado)?.nome ?? 'Posto' : 'Todos os postos'}
            </Text>
            <Feather name="chevron-down" size={14} color="#5E667D" />
          </Pressable>
        </View>
        <FinanceiroSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar fornecedor, CNPJ..." />
        <Text style={fnStyles.countLabel}>{itens.length} fornecedor(es)</Text>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : itens.length === 0 ? (
          <FinanceiroEmptyState message="Nenhum fornecedor encontrado." />
        ) : (
          itens.map((item) => (
            <Pressable
              key={item.fornecedorCodigo}
              style={fnStyles.listRow}
              onPress={() => setSelecionadoCodigo(item.fornecedorCodigo)}
            >
              <View style={{ flex: 1 }}>
                <Text style={fnStyles.listRowTitle} numberOfLines={1}>
                  {item.razao}
                </Text>
                <Text style={fnStyles.listRowMeta}>
                  {item.cnpjCpf} · {item.cidade ?? '—'}/{item.uf ?? '—'}
                </Text>
                <Text style={fnStyles.listRowMeta}>
                  {item.postos.length} posto(s) · {item.titulos} título(s)
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={fnStyles.listRowValue}>{formatBRL(item.valorTotal)}</Text>
                <Feather name="chevron-right" size={16} color="#9AA1B5" style={{ marginTop: 6 }} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <FinanceiroFilterModal visible={periodoModalOpen} title="Período" onClose={() => setPeriodoModalOpen(false)}>
        {financeiroFornecedorPeriodoOptions.map((opt) => (
          <FinanceiroFilterOptionRow
            key={opt.value}
            label={opt.label}
            active={meses === opt.value}
            onPress={() => {
              setMeses(opt.value);
              setPeriodoModalOpen(false);
            }}
          />
        ))}
      </FinanceiroFilterModal>

      <FinanceiroFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <FinanceiroPostoFilterRow
          postos={postos}
          selected={postoSelecionado}
          onSelect={(id) => {
            setPostoSelecionado(id);
            setPostoModalOpen(false);
          }}
        />
      </FinanceiroFilterModal>

      <FinanceiroFornecedorDetalheModal
        fornecedorCodigo={selecionadoCodigo}
        meses={meses}
        onClose={() => setSelecionadoCodigo(null)}
      />
    </SafeAreaView>
  );
}

export function FinanceiroDashboardScreen({ navigation }: ScreenProps<'FinanceiroDashboard'>) {
  const now = new Date();
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(220, windowWidth - 40 - 24 - 32);
  // A biblioteca soma o "yAxisLabelWidth" (a coluna de números da esquerda) por
  // cima da "width" que a gente passa — então o desenho ficava mais largo que o
  // card e o último ponto/bolinha vazava pela borda direita. Descontamos aqui.
  const chartPlotWidth = Math.max(160, chartWidth - 44);
  const [data, setData] = useState<FinanceiroDashboardData | null>(null);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'dia' | 'mes' | 'ano'>('mes');
  const [refMes, setRefMes] = useState(now.getMonth() + 1);
  const [refAno, setRefAno] = useState(now.getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [postoModalOpen, setPostoModalOpen] = useState(false);
  const [curvaPointerIdx, setCurvaPointerIdx] = useState<number | null>(null);
  const [projPointerIdx, setProjPointerIdx] = useState<number | null>(null);
  // Projeção do dashboard tem horizonte próprio (6 meses, como no web), independente
  // do filtro Dia/Mês/Ano acima — por isso usa o mesmo recurso "projecoes" já usado
  // na tela de Projeções, em vez do campo "projecao" do dashboard (que segue a janela
  // de data do filtro e por isso só trazia 1-2 meses quando o filtro era "Mês").
  const [projecaoMeses, setProjecaoMeses] = useState<FinanceiroProjecaoMes[]>([]);
  const [isLoadingProjecao, setIsLoadingProjecao] = useState(false);

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const { dataInicial, dataFinal } = financeiroDashboardPeriodoDatas(periodo, refMes, refAno);
    fetchFinanceiroDashboard({ dataInicial, dataFinal, unidadeIds: postoSelecionado ? [postoSelecionado] : undefined })
      .then(setData)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar o dashboard.')))
      .finally(() => setIsLoading(false));
  }, [periodo, refMes, refAno, postoSelecionado]);

  useEffect(() => {
    setIsLoadingProjecao(true);
    fetchFinanceiroProjecoes({ unidadeIds: postoSelecionado ? [postoSelecionado] : undefined, horizonteMeses: 6 })
      .then((result) => setProjecaoMeses(result.meses))
      .catch(() => setProjecaoMeses([]))
      .finally(() => setIsLoadingProjecao(false));
  }, [postoSelecionado]);

  const handlePeriodoAnterior = () => {
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
  const handlePeriodoProximo = () => {
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

  const periodoLabel = periodo === 'ano' ? String(refAno) : periodo === 'dia' ? 'Hoje' : `${financeiroMesesNomes[refMes - 1]} / ${refAno}`;
  const postoLabel = postoSelecionado ? postos.find((p) => p.id === postoSelecionado)?.nome ?? 'Posto' : 'Todos os postos';

  const saldoHoje = (data?.receberHoje ?? 0) - (data?.pagarHoje ?? 0);

  // Os 3 números precisam ter sempre o MESMO tamanho — em vez de cada um encolher
  // sozinho (o que deixava "A receber hoje" maior que os outros dois, que são
  // valores mais compridos), calculamos 1 tamanho de fonte único a partir do maior
  // dos 3 textos e aplicamos igual nos 3 cards.
  const kpiValorReceber = formatBRLValor(data?.receberHoje ?? 0);
  const kpiValorPagar = formatBRLValor(data?.pagarHoje ?? 0);
  const kpiValorSaldo = formatBRLValor(saldoHoje);
  const kpiMaiorTamanho = Math.max(kpiValorReceber.length, kpiValorPagar.length, kpiValorSaldo.length);
  const kpiFontSize = kpiMaiorTamanho <= 9 ? 18 : kpiMaiorTamanho <= 11 ? 16 : kpiMaiorTamanho <= 13 ? 15 : 13;

  // A biblioteca de gráfico calcula a escala do eixo Y usando só a 1ª série (data),
  // ignorando data2/data3 — por isso Pagamentos/Saldo (que têm valores bem maiores
  // que Recebimentos) estouravam pra fora da área do gráfico. Calculamos aqui o
  // máximo/mínimo considerando as 3 séries juntas.
  // Quando existe um mínimo bem negativo (Saldo acumulado caindo forte), a biblioteca
  // soma uma altura extra proporcional pra caber a parte negativa, o que deixava o
  // gráfico gigantesco. Usamos yAxisOffset pra deslocar tudo pra cima do zero — o
  // gráfico some com a "área negativa" mas o eixo continua mostrando o valor real.
  const curvaRange = useMemo(() => {
    const valores = (data?.curva ?? []).flatMap((p) => [p.recebimentos, p.pagamentos, p.saldo]);
    const max = Math.max(0, ...valores);
    const min = Math.min(0, ...valores);
    const maxComFolga = max > 0 ? max * 1.1 : 1;
    const offset = min < 0 ? min * 1.1 : 0;
    return { max: maxComFolga - offset, offset };
  }, [data]);

  // A biblioteca reserva pra cada rótulo do eixo X só a largura entre 2 pontos —
  // com muitos dias no período essa largura é menor que 1 caractere, então a data
  // vinha sempre cortada (girada ou não). Em vez de usar o rótulo nativo, escondemos
  // ele e desenhamos nós mesmos uma linha de datas abaixo do gráfico, espaçadas
  // uniformemente (largura livre, sem essa limitação).
  const curvaAxisLabels = useMemo(() => {
    const pontos = data?.curva ?? [];
    if (pontos.length === 0) return [];
    const quantidade = Math.min(6, pontos.length);
    const indices = Array.from({ length: quantidade }, (_, i) =>
      Math.round((i * (pontos.length - 1)) / Math.max(1, quantidade - 1))
    );
    const indicesUnicos = Array.from(new Set(indices));
    return indicesUnicos.map((idx) => pontos[idx].periodo);
  }, [data]);

  const projRange = useMemo(() => {
    const valores = projecaoMeses.flatMap((p) => [p.receberPrevisto, p.pagarPrevisto]);
    const max = Math.max(0, ...valores);
    const min = Math.min(0, ...valores);
    const maxComFolga = max > 0 ? max * 1.1 : 1;
    const offset = min < 0 ? min * 1.1 : 0;
    return { max: maxComFolga - offset, offset };
  }, [projecaoMeses]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader
          icon="grid"
          title="Dashboard"
          subtitle="Contas a receber, contas a pagar, saldo e projeções da rede."
        />

        <View style={fnStyles.filterSegmentRow}>
          {(['dia', 'mes', 'ano'] as const).map((opt) => {
            const isActive = periodo === opt;
            const label = opt === 'dia' ? 'Dia' : opt === 'mes' ? 'Mês' : 'Ano';
            return (
              <Pressable
                key={opt}
                style={[fnStyles.filterSegmentButton, isActive ? fnStyles.filterSegmentButtonActive : null]}
                onPress={() => setPeriodo(opt)}
              >
                <Text style={[fnStyles.filterSegmentText, isActive ? fnStyles.filterSegmentTextActive : null]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {periodo !== 'dia' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
            <Pressable onPress={handlePeriodoAnterior} style={fnStyles.monthNavButton}>
              <Feather name="chevron-left" size={18} color="#5E667D" />
            </Pressable>
            <Text style={fnStyles.monthLabel}>{periodoLabel}</Text>
            <Pressable onPress={handlePeriodoProximo} style={fnStyles.monthNavButton}>
              <Feather name="chevron-right" size={18} color="#5E667D" />
            </Pressable>
          </View>
        ) : null}

        <Pressable style={fnStyles.postoSelectButton} onPress={() => setPostoModalOpen(true)}>
          <Text style={fnStyles.postoSelectText} numberOfLines={1}>
            {postoLabel}
          </Text>
          <Feather name="chevron-down" size={16} color="#5E667D" />
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : !data ? (
          <FinanceiroEmptyState message="Sem dados para o período." />
        ) : (
          <>
            {/* marginHorizontal negativo "cancela" o respiro lateral da tela (20px de
                cada lado), pra esses 3 cards ficarem um pouco mais largos e o texto
                "(R$)" caber sem cortar. */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, marginHorizontal: -10 }}>
              <View
                style={[
                  fnStyles.kpiCard,
                  { flex: 1, minWidth: 0, paddingHorizontal: 8, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0', borderLeftWidth: 3, borderLeftColor: '#7C5CFC' },
                ]}
              >
                <Text style={[fnStyles.kpiLabel, { fontSize: 9 }]}>
                  A receber hoje <Text style={fnStyles.kpiLabelUnidade}>(R$)</Text>
                </Text>
                <Text
                  style={[fnStyles.kpiValue, { color: '#18955A', fontSize: kpiFontSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {kpiValorReceber}
                </Text>
              </View>
              <View
                style={[
                  fnStyles.kpiCard,
                  { flex: 1, minWidth: 0, paddingHorizontal: 8, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0', borderLeftWidth: 3, borderLeftColor: '#E6213D' },
                ]}
              >
                <Text style={[fnStyles.kpiLabel, { fontSize: 9 }]}>
                  A pagar hoje <Text style={fnStyles.kpiLabelUnidade}>(R$)</Text>
                </Text>
                <Text
                  style={[fnStyles.kpiValue, { color: '#E6213D', fontSize: kpiFontSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {kpiValorPagar}
                </Text>
              </View>
              <View
                style={[
                  fnStyles.kpiCard,
                  { flex: 1, minWidth: 0, paddingHorizontal: 8, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0', borderLeftWidth: 3, borderLeftColor: '#2F6FED' },
                ]}
              >
                <Text style={[fnStyles.kpiLabel, { fontSize: 9 }]}>
                  Saldo <Text style={fnStyles.kpiLabelUnidade}>(R$)</Text>
                </Text>
                <Text
                  style={[fnStyles.kpiValue, { color: saldoHoje >= 0 ? '#18955A' : '#E6213D', fontSize: kpiFontSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {kpiValorSaldo}
                </Text>
              </View>
            </View>

            {data.curva.length > 0 ? (
              <View style={fnStyles.chartCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="trending-up" size={14} color="#C05621" />
                  <Text style={fnStyles.sectionTitle}>Curva financeira</Text>
                </View>
                <Text style={fnStyles.chartSubtitle}>Recebimentos, pagamentos e saldo no período — toque no gráfico para ver os valores.</Text>

                <LineChart
                  data={data.curva.map((p) => ({ value: p.recebimentos }))}
                  data2={data.curva.map((p) => ({ value: p.pagamentos }))}
                  data3={data.curva.map((p) => ({ value: p.saldo }))}
                  color1="#18955A"
                  color2="#E6213D"
                  color3="#C05621"
                  thickness1={1.5}
                  thickness2={1.5}
                  thickness3={2}
                  hideDataPoints1
                  hideDataPoints2
                  dataPointsRadius3={3}
                  dataPointsColor3="#C05621"
                  maxValue={curvaRange.max}
                  yAxisOffset={curvaRange.offset}
                  curved
                  width={chartPlotWidth}
                  adjustToWidth
                  initialSpacing={8}
                  endSpacing={8}
                  height={140}
                  noOfSections={4}
                  xAxisLabelsHeight={0}
                  yAxisLabelWidth={44}
                  yAxisTextStyle={{ color: '#8891A6', fontSize: 9 }}
                  xAxisColor="#E2E6F0"
                  yAxisColor="#E2E6F0"
                  rulesColor="#F1F2F6"
                  formatYLabel={(label: string) => formatBRLCompact(Number(label))}
                  pointerConfig={{
                    pointerStripHeight: 140,
                    pointerStripColor: '#E2E6F0',
                    pointerStripWidth: 2,
                    pointerColor: '#C05621',
                    radius: 5,
                    activatePointersInstantlyOnTouch: true,
                    persistPointer: true,
                    pointerLabelComponent: (_items: unknown, _secondary: unknown, pointerIndex: number) => {
                      // Não renderiza balão flutuante (fica cortado pelo container do gráfico).
                      // Só atualiza o painel fixo abaixo do gráfico.
                      setTimeout(() => setCurvaPointerIdx(pointerIndex), 0);
                      return null;
                    },
                  }}
                />
                {curvaAxisLabels.length > 0 ? (
                  // paddingLeft cobre a coluna de valores do eixo Y (yAxisLabelWidth) + o
                  // initialSpacing do gráfico, pra "02/08" cair embaixo do 1º ponto real,
                  // não embaixo dos números do eixo Y. O último rótulo fica alinhado à
                  // direita (em vez de "vazar" pro lado de fora do card).
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 44 + 8, paddingRight: 16, marginTop: 4 }}>
                    {curvaAxisLabels.map((label, idx) => (
                      <Text
                        key={idx}
                        style={[
                          fnStyles.chartAxisLabel,
                          idx === 0 ? { textAlign: 'left' } : idx === curvaAxisLabels.length - 1 ? { textAlign: 'right' } : { textAlign: 'center' },
                        ]}
                      >
                        {label}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                  <FinanceiroChartLegendDot color="#18955A" label="Recebimentos" />
                  <FinanceiroChartLegendDot color="#E6213D" label="Pagamentos" />
                  <FinanceiroChartLegendDot color="#C05621" label="Saldo" />
                </View>
                {curvaPointerIdx !== null && data.curva[curvaPointerIdx] ? (
                  <View style={fnStyles.chartTooltip}>
                    <Text style={fnStyles.chartTooltipDate}>{data.curva[curvaPointerIdx].periodo}</Text>
                    <Text style={[fnStyles.chartTooltipLine, { color: '#18955A' }]}>
                      Recebimentos: {formatBRL(data.curva[curvaPointerIdx].recebimentos)}
                    </Text>
                    <Text style={[fnStyles.chartTooltipLine, { color: '#E6213D' }]}>
                      Pagamentos: {formatBRL(data.curva[curvaPointerIdx].pagamentos)}
                    </Text>
                    <Text style={[fnStyles.chartTooltipLine, { color: '#C05621' }]}>
                      Saldo: {formatBRL(data.curva[curvaPointerIdx].saldo)}
                    </Text>
                  </View>
                ) : (
                  <Text style={fnStyles.chartSubtitle}>Toque em um ponto da linha para ver os valores aqui.</Text>
                )}
              </View>
            ) : null}

            {isLoadingProjecao && projecaoMeses.length === 0 ? (
              <View style={fnStyles.chartCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="activity" size={14} color="#C05621" />
                  <Text style={fnStyles.sectionTitle}>Projeção</Text>
                </View>
                <ActivityIndicator color="#C05621" style={{ marginVertical: 24 }} />
              </View>
            ) : projecaoMeses.length > 0 ? (
              <View style={fnStyles.chartCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="activity" size={14} color="#C05621" />
                  <Text style={fnStyles.sectionTitle}>Projeção</Text>
                </View>
                <Text style={fnStyles.chartSubtitle}>Previsão de recebimentos e pagamentos nos próximos 6 meses.</Text>

                <LineChart
                  data={projecaoMeses.map((p) => ({ value: p.receberPrevisto, label: p.label }))}
                  data2={projecaoMeses.map((p) => ({ value: p.pagarPrevisto }))}
                  color1="#2F6FED"
                  color2="#E6213D"
                  thickness1={2}
                  thickness2={2}
                  maxValue={projRange.max}
                  yAxisOffset={projRange.offset}
                  curved
                  width={chartPlotWidth}
                  adjustToWidth
                  initialSpacing={8}
                  endSpacing={8}
                  height={140}
                  noOfSections={4}
                  xAxisLabelsHeight={20}
                  yAxisTextStyle={{ color: '#8891A6', fontSize: 9 }}
                  xAxisLabelTextStyle={{ color: '#5E667D', fontSize: 9, fontWeight: '600' }}
                  xAxisColor="#E2E6F0"
                  yAxisColor="#E2E6F0"
                  rulesColor="#F1F2F6"
                  formatYLabel={(label: string) => formatBRLCompact(Number(label))}
                  pointerConfig={{
                    pointerStripHeight: 140,
                    pointerStripColor: '#E2E6F0',
                    pointerStripWidth: 2,
                    pointerColor: '#2F6FED',
                    radius: 5,
                    activatePointersInstantlyOnTouch: true,
                    persistPointer: true,
                    pointerLabelComponent: (_items: unknown, _secondary: unknown, pointerIndex: number) => {
                      // Painel fixo abaixo do gráfico em vez de balão flutuante (evita corte).
                      setTimeout(() => setProjPointerIdx(pointerIndex), 0);
                      return null;
                    },
                  }}
                />
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                  <FinanceiroChartLegendDot color="#2F6FED" label="A receber" />
                  <FinanceiroChartLegendDot color="#E6213D" label="A pagar" />
                </View>
                {projPointerIdx !== null && projecaoMeses[projPointerIdx] ? (
                  <View style={fnStyles.chartTooltip}>
                    <Text style={fnStyles.chartTooltipDate}>{projecaoMeses[projPointerIdx].label}</Text>
                    <Text style={[fnStyles.chartTooltipLine, { color: '#2F6FED' }]}>
                      A receber: {formatBRL(projecaoMeses[projPointerIdx].receberPrevisto)}
                    </Text>
                    <Text style={[fnStyles.chartTooltipLine, { color: '#E6213D' }]}>
                      A pagar: {formatBRL(projecaoMeses[projPointerIdx].pagarPrevisto)}
                    </Text>
                  </View>
                ) : (
                  <Text style={fnStyles.chartSubtitle}>Toque em um ponto da linha para ver os valores aqui.</Text>
                )}
              </View>
            ) : null}

            <FinanceiroDashboardListCard
              icon="calendar"
              title="Pagamentos para hoje"
              emptyMessage="Nada previsto para hoje."
              items={data.pagamentosHoje}
            />

            <FinanceiroDashboardListCard
              icon="clock"
              title="Pagamentos nos próximos 7 dias"
              emptyMessage="Nada previsto para os próximos 7 dias."
              items={data.pagamentos7d}
            />
          </>
        )}
      </ScrollView>

      <FinanceiroFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
      </FinanceiroFilterModal>
    </SafeAreaView>
  );
}

const financeiroContasStatusMeta: Record<string, { label: string; bg: string; color: string }> = {
  aberto: { label: 'Em aberto', bg: '#FCF4DE', color: '#B7791F' },
  pago: { label: 'Pago', bg: '#E3F5EA', color: '#18955A' },
  vencido: { label: 'Vencido', bg: '#FBE7E9', color: '#E6213D' },
};

const financeiroContasPeriodoOptions: Array<{ label: string; value: 'hoje' | '7dias' | 'mes' }> = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Próximos 7 dias', value: '7dias' },
  { label: 'Mês', value: 'mes' },
];

function FinanceiroContasScreenBase({
  navigation,
  tipo,
}: {
  navigation: { navigate: (route: 'FinanceiroProfile') => void };
  tipo: 'pagar' | 'receber';
}) {
  const [itens, setItens] = useState<FinanceiroContaItem[]>([]);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ultimoCodigo, setUltimoCodigo] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | 'mes'>('7dias');
  const [postoModalOpen, setPostoModalOpen] = useState(false);
  const postoLabel = postoSelecionado ? postos.find((p) => p.id === postoSelecionado)?.nome ?? 'Posto' : 'Todos os postos';

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroContas({
      tipo,
      ...financeiroPeriodoParaDatas(periodo),
      unidadeIds: postoSelecionado ? [postoSelecionado] : undefined,
      busca: busca.trim() || undefined,
    })
      .then((result) => {
        setItens(result.data);
        setUltimoCodigo(result.ultimoCodigo);
      })
      .catch((err) =>
        setErrorMessage(showFinanceiroError(err, `Não foi possível carregar as contas a ${tipo === 'pagar' ? 'pagar' : 'receber'}.`))
      )
      .finally(() => setIsLoading(false));
  }, [tipo, periodo, postoSelecionado, busca]);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  const handleLoadMore = () => {
    if (!ultimoCodigo || isLoadingMore) return;
    setIsLoadingMore(true);
    fetchFinanceiroContas({
      tipo,
      ...financeiroPeriodoParaDatas(periodo),
      unidadeIds: postoSelecionado ? [postoSelecionado] : undefined,
      busca: busca.trim() || undefined,
      ultimoCodigo,
    })
      .then((result) => {
        setItens((current) => [...current, ...result.data]);
        setUltimoCodigo(result.ultimoCodigo);
      })
      .catch((err) => showFinanceiroError(err, 'Não foi possível carregar mais itens.'))
      .finally(() => setIsLoadingMore(false));
  };

  const totalValor = itens.reduce((acc, item) => acc + item.valor, 0);
  const emAbertoValor = itens.filter((i) => i.status === 'aberto').reduce((acc, item) => acc + item.valor, 0);
  const vencidosValor = itens.filter((i) => i.status === 'vencido').reduce((acc, item) => acc + item.valor, 0);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader
          icon={tipo === 'pagar' ? 'arrow-down-circle' : 'arrow-up-circle'}
          title={tipo === 'pagar' ? 'Contas a Pagar' : 'Contas a Receber'}
          subtitle={
            tipo === 'pagar'
              ? 'Títulos a pagar por vencimento, fornecedor e centro de custo.'
              : 'Recebíveis por vencimento, cliente e posto.'
          }
        />

        <View style={fnStyles.filterSegmentRow}>
          {financeiroContasPeriodoOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[fnStyles.filterSegmentButton, periodo === opt.value ? fnStyles.filterSegmentButtonActive : null]}
              onPress={() => setPeriodo(opt.value)}
            >
              <Text style={[fnStyles.filterSegmentText, periodo === opt.value ? fnStyles.filterSegmentTextActive : null]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[fnStyles.postoSelectButton, { marginBottom: 10 }]} onPress={() => setPostoModalOpen(true)}>
          <Text style={fnStyles.postoSelectText} numberOfLines={1}>
            {postoLabel}
          </Text>
          <Feather name="chevron-down" size={16} color="#5E667D" />
        </Pressable>

        <FinanceiroSearchInput
          value={busca}
          onChangeText={setBusca}
          placeholder={tipo === 'pagar' ? 'Buscar fornecedor ou título...' : 'Buscar cliente ou título...'}
        />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0, paddingHorizontal: 8 }]}>
            <Text style={fnStyles.kpiLabel} numberOfLines={1}>
              {tipo === 'pagar' ? 'Total a pagar' : 'Total a receber'}
            </Text>
            <Text style={[fnStyles.kpiValue, { fontSize: 13 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {formatBRL(totalValor)}
            </Text>
          </View>
          <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0, paddingHorizontal: 8 }]}>
            <Text style={fnStyles.kpiLabel} numberOfLines={1}>
              Em aberto
            </Text>
            <Text style={[fnStyles.kpiValue, { fontSize: 13 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {formatBRL(emAbertoValor)}
            </Text>
          </View>
          <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0, paddingHorizontal: 8 }]}>
            <Text style={[fnStyles.kpiLabel, { color: '#E6213D' }]} numberOfLines={1}>
              Vencidos
            </Text>
            <Text
              style={[fnStyles.kpiValue, { color: vencidosValor > 0 ? '#E6213D' : '#0C1736', fontSize: 13 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {formatBRL(vencidosValor)}
            </Text>
          </View>
        </View>

        <Text style={fnStyles.countLabel}>{itens.length} título(s)</Text>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : itens.length === 0 ? (
          <FinanceiroEmptyState message="Nenhum título encontrado com os filtros atuais." />
        ) : (
          <>
            {itens.map((item) => {
              const statusMeta = financeiroContasStatusMeta[item.status] ?? financeiroContasStatusMeta.aberto;
              return (
                <View key={item.id} style={fnStyles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[fnStyles.listRowTitle, { fontWeight: '400' }]} numberOfLines={1}>
                      {item.descricao}
                    </Text>
                    <Text style={fnStyles.listRowMeta} numberOfLines={1}>
                      {item.contraparte} · {item.posto}
                    </Text>
                    <Text style={fnStyles.listRowMeta}>
                      Vence {formatDateIsoBR(item.vencimento) ?? '—'}
                      {item.categoria ? ` · ${item.categoria}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[fnStyles.listRowValue, { fontWeight: '400' }]}>{formatBRL(item.valor)}</Text>
                    <View style={[fnStyles.badge, { backgroundColor: statusMeta.bg, marginTop: 4 }]}>
                      <Text style={[fnStyles.badgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            {ultimoCodigo ? (
              <Pressable style={fnStyles.loadMoreButton} onPress={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? (
                  <ActivityIndicator color="#C05621" />
                ) : (
                  <Text style={fnStyles.loadMoreText}>Carregar mais</Text>
                )}
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>

      <FinanceiroFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
      </FinanceiroFilterModal>
    </SafeAreaView>
  );
}

export function FinanceiroContasAPagarScreen({ navigation }: ScreenProps<'FinanceiroContasAPagar'>) {
  return <FinanceiroContasScreenBase navigation={navigation} tipo="pagar" />;
}

export function FinanceiroContasAReceberScreen({ navigation }: ScreenProps<'FinanceiroContasAReceber'>) {
  return <FinanceiroContasScreenBase navigation={navigation} tipo="receber" />;
}

export function FinanceiroFluxoCaixaScreen({ navigation }: ScreenProps<'FinanceiroFluxoCaixa'>) {
  const now = new Date();
  const [data, setData] = useState<FinanceiroFluxoCaixaData | null>(null);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'dia' | 'mes' | 'ano'>('mes');
  const [refMes, setRefMes] = useState(now.getMonth() + 1);
  const [refAno, setRefAno] = useState(now.getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [postoModalOpen, setPostoModalOpen] = useState(false);

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const { dataInicial, dataFinal } = financeiroDashboardPeriodoDatas(periodo, refMes, refAno);
    fetchFinanceiroFluxoCaixa({
      dataInicial,
      dataFinal,
      unidadeIds: postoSelecionado ? [postoSelecionado] : undefined,
    })
      .then(setData)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar o fluxo de caixa.')))
      .finally(() => setIsLoading(false));
  }, [periodo, refMes, refAno, postoSelecionado]);

  const handlePeriodoAnterior = () => {
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
  const handlePeriodoProximo = () => {
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

  const periodoLabel = periodo === 'ano' ? String(refAno) : periodo === 'dia' ? 'Hoje' : `${financeiroMesesNomes[refMes - 1]} / ${refAno}`;
  const postoLabel = postoSelecionado ? postos.find((p) => p.id === postoSelecionado)?.nome ?? 'Posto' : 'Todos os postos';

  const saldoPeriodo = (data?.entradasPeriodo ?? 0) - (data?.saidasPeriodo ?? 0);
  const saldoFinal = data?.extrato.length ? data.extrato[data.extrato.length - 1].saldoAcumulado : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader
          icon="file"
          title="Fluxo de Caixa"
          subtitle="Entradas, saídas e saldo diário consolidado da rede."
        />

        <View style={fnStyles.filterSegmentRow}>
          {(['dia', 'mes', 'ano'] as const).map((opt) => {
            const isActive = periodo === opt;
            const label = opt === 'dia' ? 'Dia' : opt === 'mes' ? 'Mês' : 'Ano';
            return (
              <Pressable
                key={opt}
                style={[fnStyles.filterSegmentButton, isActive ? fnStyles.filterSegmentButtonActive : null]}
                onPress={() => setPeriodo(opt)}
              >
                <Text style={[fnStyles.filterSegmentText, isActive ? fnStyles.filterSegmentTextActive : null]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {periodo !== 'dia' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
            <Pressable onPress={handlePeriodoAnterior} style={fnStyles.monthNavButton}>
              <Feather name="chevron-left" size={18} color="#5E667D" />
            </Pressable>
            <Text style={fnStyles.monthLabel}>{periodoLabel}</Text>
            <Pressable onPress={handlePeriodoProximo} style={fnStyles.monthNavButton}>
              <Feather name="chevron-right" size={18} color="#5E667D" />
            </Pressable>
          </View>
        ) : null}

        <Pressable style={[fnStyles.postoSelectButton, { marginBottom: 12 }]} onPress={() => setPostoModalOpen(true)}>
          <Text style={fnStyles.postoSelectText} numberOfLines={1}>
            {postoLabel}
          </Text>
          <Feather name="chevron-down" size={16} color="#5E667D" />
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : !data ? (
          <FinanceiroEmptyState message="Sem dados para o período." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0' }]}>
                <Text style={fnStyles.kpiLabel} numberOfLines={1}>
                  Entradas
                </Text>
                <Text style={[fnStyles.kpiValue, { color: '#18955A', fontSize: 15 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatBRL(data.entradasPeriodo)}
                </Text>
              </View>
              <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0' }]}>
                <Text style={fnStyles.kpiLabel} numberOfLines={1}>
                  Saídas
                </Text>
                <Text style={[fnStyles.kpiValue, { color: '#E6213D', fontSize: 15 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatBRL(data.saidasPeriodo)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0' }]}>
                <Text style={fnStyles.kpiLabel} numberOfLines={1}>
                  Saldo do período
                </Text>
                <Text
                  style={[fnStyles.kpiValue, { color: saldoPeriodo >= 0 ? '#18955A' : '#E6213D', fontSize: 15 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {formatBRL(saldoPeriodo)}
                </Text>
              </View>
              <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0' }]}>
                <Text style={fnStyles.kpiLabel} numberOfLines={1}>
                  Saldo acumulado
                </Text>
                <Text style={[fnStyles.kpiValue, { fontSize: 15 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatBRL(saldoFinal)}
                </Text>
              </View>
            </View>

            <Text style={fnStyles.sectionTitle}>Contas bancárias</Text>
            {data.contas.length === 0 ? (
              <FinanceiroEmptyState message="Nenhuma conta bancária cadastrada." />
            ) : (
              data.contas.map((conta) => (
                <View key={conta.contaCodigo} style={fnStyles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={fnStyles.listRowTitle} numberOfLines={1}>
                      {conta.descricao}
                    </Text>
                    <Text style={fnStyles.listRowMeta}>{conta.posto}</Text>
                  </View>
                  <Text style={fnStyles.listRowValue}>{formatBRL(conta.saldoAtual)}</Text>
                </View>
              ))
            )}

            <Text style={[fnStyles.sectionTitle, { marginTop: 16 }]}>Extrato diário</Text>
            {data.extrato.length === 0 ? (
              <FinanceiroEmptyState message="Nenhuma movimentação no período." />
            ) : (
              data.extrato.map((dia, idx) => (
                <View key={idx} style={fnStyles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={fnStyles.listRowTitle}>{formatDateIsoBR(dia.data) ?? dia.data}</Text>
                    <Text style={fnStyles.listRowMeta}>
                      Entradas {formatBRL(dia.entradas)} · Saídas {formatBRL(dia.saidas)}
                    </Text>
                  </View>
                  <Text style={[fnStyles.listRowValue, { color: dia.saldoAcumulado >= 0 ? '#18955A' : '#E6213D' }]}>
                    {formatBRL(dia.saldoAcumulado)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <FinanceiroFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
      </FinanceiroFilterModal>
    </SafeAreaView>
  );
}

export function FinanceiroConciliacaoScreen({ navigation }: ScreenProps<'FinanceiroConciliacao'>) {
  const now = new Date();
  const [movimentos, setMovimentos] = useState<FinanceiroMovimentoItem[]>([]);
  const [resumo, setResumo] = useState<FinanceiroConciliacaoResumo | null>(null);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'dia' | 'mes' | 'ano'>('mes');
  const [refMes, setRefMes] = useState(now.getMonth() + 1);
  const [refAno, setRefAno] = useState(now.getFullYear());
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<'pendentes' | 'com-sugestao' | 'conciliados'>('com-sugestao');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actingCodigo, setActingCodigo] = useState<string | null>(null);
  const [postoModalOpen, setPostoModalOpen] = useState(false);
  // Renderizar milhares de linhas de uma vez (ScrollView + .map, sem virtualização)
  // deixava a troca de aba bem lenta — mostramos só um pedaço por vez.
  const [visibleCount, setVisibleCount] = useState(50);
  // Vincular manualmente: título escolhido à mão (quando não há sugestão automática).
  const [vincularMov, setVincularMov] = useState<FinanceiroMovimentoItem | null>(null);
  const [vincularTitulos, setVincularTitulos] = useState<FinanceiroContaItem[]>([]);
  const [vincularBusca, setVincularBusca] = useState('');
  const [isLoadingVincular, setIsLoadingVincular] = useState(false);

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const { dataInicial, dataFinal } = financeiroDashboardPeriodoDatas(periodo, refMes, refAno);
    fetchFinanceiroConciliacao({
      dataInicial,
      dataFinal,
      unidadeIds: postoSelecionado ? [postoSelecionado] : undefined,
      busca: busca.trim() || undefined,
    })
      .then((result) => {
        setMovimentos(result.movimentos);
        setResumo(result.resumo);
      })
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar a conciliação.')))
      .finally(() => setIsLoading(false));
  }, [periodo, refMes, refAno, postoSelecionado, busca]);

  const handlePeriodoAnterior = () => {
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
  const handlePeriodoProximo = () => {
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

  const periodoLabel = periodo === 'ano' ? String(refAno) : periodo === 'dia' ? 'Hoje' : `${financeiroMesesNomes[refMes - 1]} / ${refAno}`;
  const postoLabel = postoSelecionado ? postos.find((p) => p.id === postoSelecionado)?.nome ?? 'Posto' : 'Todos os postos';

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  // Servidor retorna todos os movimentos; a aba (pendentes/com-sugestão/
  // conciliados) é um filtro puramente client-side sobre os mesmos dados
  // reais — a Lovable não expõe "aba" como parâmetro do endpoint.
  const movimentosFiltrados = useMemo(() => {
    if (aba === 'com-sugestao') return movimentos.filter((m) => m.sugestao);
    if (aba === 'conciliados') return movimentos.filter((m) => m.conciliacao);
    return movimentos.filter((m) => !m.sugestao && !m.conciliacao);
  }, [movimentos, aba]);

  const handleConfirmarSugestao = (movimento: FinanceiroMovimentoItem) => {
    if (!movimento.sugestao) return;
    setActingCodigo(movimento.codigo);
    conciliarFinanceiroMovimento({
      empresa_codigo: movimento.empresaCodigo,
      conta_codigo: movimento.contaCodigo,
      movimento_codigo: movimento.codigo,
      movimento_data: movimento.data,
      movimento_valor: movimento.valor,
      movimento_descricao: movimento.descricao,
      titulo_tipo: movimento.sugestao.tituloTipo,
      titulo_codigo: movimento.sugestao.tituloCodigo,
      titulo_vencimento: movimento.sugestao.tituloVencimento,
      titulo_valor: movimento.sugestao.tituloValor,
      titulo_descricao: movimento.sugestao.tituloDescricao,
      titulo_contraparte: movimento.sugestao.tituloContraparte,
      origem: 'automatica',
    })
      .then(load)
      .catch((err) => showFinanceiroError(err, 'Não foi possível confirmar o vínculo.'))
      .finally(() => setActingCodigo(null));
  };

  const handleDesvincular = (movimento: FinanceiroMovimentoItem) => {
    setActingCodigo(movimento.codigo);
    desvincularFinanceiroMovimento(movimento.codigo)
      .then(load)
      .catch((err) => showFinanceiroError(err, 'Não foi possível desvincular.'))
      .finally(() => setActingCodigo(null));
  };

  // Mostrar só um pedaço da lista de cada vez (renderizar milhares de linhas
  // de uma vez com ScrollView + .map travava a troca de aba).
  useEffect(() => {
    setVisibleCount(50);
  }, [aba, busca, periodo, refMes, refAno, postoSelecionado]);

  useEffect(() => {
    if (!vincularMov) return;
    setIsLoadingVincular(true);
    fetchFinanceiroTitulosConciliar({
      tipo: vincularMov.tipo === 'credito' ? 'receber' : 'pagar',
      busca: vincularBusca.trim() || undefined,
    })
      .then(setVincularTitulos)
      .catch(() => setVincularTitulos([]))
      .finally(() => setIsLoadingVincular(false));
  }, [vincularMov, vincularBusca]);

  const handleAbrirVincularManual = (movimento: FinanceiroMovimentoItem) => {
    setVincularBusca('');
    setVincularTitulos([]);
    setVincularMov(movimento);
  };

  const handleVincularManual = (titulo: FinanceiroContaItem) => {
    if (!vincularMov) return;
    setActingCodigo(vincularMov.codigo);
    conciliarFinanceiroMovimento({
      empresa_codigo: vincularMov.empresaCodigo,
      conta_codigo: vincularMov.contaCodigo,
      movimento_codigo: vincularMov.codigo,
      movimento_data: vincularMov.data,
      movimento_valor: vincularMov.valor,
      movimento_descricao: vincularMov.descricao,
      titulo_tipo: vincularMov.tipo === 'credito' ? 'receber' : 'pagar',
      titulo_codigo: titulo.codigo,
      titulo_vencimento: titulo.vencimento,
      titulo_valor: titulo.valor,
      titulo_descricao: titulo.descricao,
      titulo_contraparte: titulo.contraparte,
      origem: 'manual',
    })
      .then(() => {
        setVincularMov(null);
        load();
      })
      .catch((err) => showFinanceiroError(err, 'Não foi possível vincular manualmente.'))
      .finally(() => setActingCodigo(null));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader
          icon="archive"
          title="Conciliação"
          subtitle="Conciliação bancária entre extratos e lançamentos do sistema."
        />

        <View style={fnStyles.filterSegmentRow}>
          {(['dia', 'mes', 'ano'] as const).map((opt) => {
            const isActive = periodo === opt;
            const label = opt === 'dia' ? 'Dia' : opt === 'mes' ? 'Mês' : 'Ano';
            return (
              <Pressable
                key={opt}
                style={[fnStyles.filterSegmentButton, isActive ? fnStyles.filterSegmentButtonActive : null]}
                onPress={() => setPeriodo(opt)}
              >
                <Text style={[fnStyles.filterSegmentText, isActive ? fnStyles.filterSegmentTextActive : null]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {periodo !== 'dia' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
            <Pressable onPress={handlePeriodoAnterior} style={fnStyles.monthNavButton}>
              <Feather name="chevron-left" size={18} color="#5E667D" />
            </Pressable>
            <Text style={fnStyles.monthLabel}>{periodoLabel}</Text>
            <Pressable onPress={handlePeriodoProximo} style={fnStyles.monthNavButton}>
              <Feather name="chevron-right" size={18} color="#5E667D" />
            </Pressable>
          </View>
        ) : null}

        <Pressable style={[fnStyles.postoSelectButton, { marginBottom: 10 }]} onPress={() => setPostoModalOpen(true)}>
          <Text style={fnStyles.postoSelectText} numberOfLines={1}>
            {postoLabel}
          </Text>
          <Feather name="chevron-down" size={16} color="#5E667D" />
        </Pressable>

        <FinanceiroSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar por descrição..." />

        {resumo ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 }}>
            <Pressable
              style={[
                fnStyles.kpiCard,
                { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0' },
                aba === 'conciliados' ? fnStyles.kpiCardActive : null,
              ]}
              onPress={() => setAba('conciliados')}
            >
              <Text style={[fnStyles.kpiLabel, { color: '#18955A' }]} numberOfLines={1}>
                Conciliados
              </Text>
              <Text style={[fnStyles.kpiValue, { color: '#18955A', fontSize: 15 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {resumo.conciliados}
              </Text>
            </Pressable>
            <Pressable
              style={[
                fnStyles.kpiCard,
                { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0' },
                aba === 'pendentes' ? fnStyles.kpiCardActive : null,
              ]}
              onPress={() => setAba('pendentes')}
            >
              <Text style={fnStyles.kpiLabel} numberOfLines={1}>
                Pendentes
              </Text>
              <Text style={[fnStyles.kpiValue, { fontSize: 15 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {resumo.pendentes}
              </Text>
            </Pressable>
            <Pressable
              style={[
                fnStyles.kpiCard,
                { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0' },
                aba === 'com-sugestao' ? fnStyles.kpiCardActive : null,
              ]}
              onPress={() => setAba('com-sugestao')}
            >
              <Text style={fnStyles.kpiLabel} numberOfLines={1}>
                Com sugestão
              </Text>
              <Text style={[fnStyles.kpiValue, { fontSize: 15 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {resumo.comSugestao}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {(['pendentes', 'com-sugestao', 'conciliados'] as const).map((opt) => (
            <Pressable
              key={opt}
              style={[fnStyles.filterPill, aba === opt ? fnStyles.filterPillActive : null]}
              onPress={() => setAba(opt)}
            >
              <Text style={[fnStyles.filterPillText, aba === opt ? fnStyles.filterPillTextActive : null]}>
                {opt === 'pendentes' ? 'Pendentes' : opt === 'com-sugestao' ? 'Com sugestão' : 'Conciliados'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={fnStyles.countLabel}>{movimentosFiltrados.length} movimento(s)</Text>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : movimentosFiltrados.length === 0 ? (
          <FinanceiroEmptyState message="Nenhum movimento encontrado nesta aba." />
        ) : (
          movimentosFiltrados.slice(0, visibleCount).map((mov) => (
            <View key={mov.codigo} style={[fnStyles.listRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[fnStyles.listRowTitle, { fontWeight: '400' }]} numberOfLines={1}>
                    {mov.descricao}
                  </Text>
                  <Text style={fnStyles.listRowMeta}>
                    {formatDateIsoBR(mov.data) ?? mov.data} · {mov.posto}
                  </Text>
                </View>
                <Text style={[fnStyles.listRowValue, { color: mov.tipo === 'credito' ? '#18955A' : '#E6213D', fontWeight: '400' }]}>
                  {mov.tipo === 'debito' ? '-' : ''}
                  {formatBRL(Math.abs(mov.valor))}
                </Text>
              </View>

              {mov.sugestao ? (
                <>
                  <View style={fnStyles.suggestionBox}>
                    <Text style={fnStyles.suggestionText}>
                      Sugestão: {mov.sugestao.tituloContraparte} · {mov.sugestao.tituloDescricao} ·{' '}
                      {formatBRL(mov.sugestao.tituloValor)} · vence {formatDateIsoBR(mov.sugestao.tituloVencimento) ?? ''}
                    </Text>
                    <Pressable
                      style={fnStyles.suggestionButton}
                      onPress={() => handleConfirmarSugestao(mov)}
                      disabled={actingCodigo === mov.codigo}
                    >
                      {actingCodigo === mov.codigo ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={fnStyles.suggestionButtonText}>Conciliar</Text>
                      )}
                    </Pressable>
                  </View>
                  <Pressable style={fnStyles.linkManualButton} onPress={() => handleAbrirVincularManual(mov)}>
                    <Feather name="link" size={13} color="#5E667D" />
                    <Text style={fnStyles.linkManualButtonText}>Vincular manualmente</Text>
                  </Pressable>
                </>
              ) : mov.conciliacao ? (
                <View style={fnStyles.suggestionBox}>
                  <Text style={fnStyles.suggestionText}>
                    Vinculado a {mov.conciliacao.tituloContraparte} · {mov.conciliacao.tituloDescricao} ·{' '}
                    {formatBRL(mov.conciliacao.tituloValor)}
                  </Text>
                  <Pressable
                    style={[fnStyles.suggestionButton, { backgroundColor: '#E6213D' }]}
                    onPress={() => handleDesvincular(mov)}
                    disabled={actingCodigo === mov.codigo}
                  >
                    {actingCodigo === mov.codigo ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={fnStyles.suggestionButtonText}>Desvincular</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Pressable style={fnStyles.linkManualButton} onPress={() => handleAbrirVincularManual(mov)}>
                  <Feather name="link" size={13} color="#5E667D" />
                  <Text style={fnStyles.linkManualButtonText}>Vincular manualmente</Text>
                </Pressable>
              )}
            </View>
          ))
        )}
        {!isLoading && movimentosFiltrados.length > visibleCount ? (
          <Pressable style={fnStyles.loadMoreButton} onPress={() => setVisibleCount((c) => c + 50)}>
            <Text style={fnStyles.loadMoreText}>Carregar mais</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <FinanceiroFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
      </FinanceiroFilterModal>

      <FinanceiroFilterModal
        visible={vincularMov !== null}
        title="Vincular manualmente"
        onClose={() => setVincularMov(null)}
      >
        <FinanceiroSearchInput value={vincularBusca} onChangeText={setVincularBusca} placeholder="Buscar título..." />
        {isLoadingVincular ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 16 }} />
        ) : vincularTitulos.length === 0 ? (
          <FinanceiroEmptyState message="Nenhum título em aberto encontrado." />
        ) : (
          vincularTitulos.map((titulo) => (
            <View key={titulo.id} style={fnStyles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={[fnStyles.listRowTitle, { fontWeight: '400' }]} numberOfLines={1}>
                  {titulo.descricao}
                </Text>
                <Text style={fnStyles.listRowMeta} numberOfLines={1}>
                  {titulo.contraparte} · vence {formatDateIsoBR(titulo.vencimento) ?? '—'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[fnStyles.listRowValue, { fontWeight: '400' }]}>{formatBRL(titulo.valor)}</Text>
                <Pressable
                  style={[fnStyles.suggestionButton, { marginTop: 6 }]}
                  onPress={() => handleVincularManual(titulo)}
                  disabled={actingCodigo === vincularMov?.codigo}
                >
                  {actingCodigo === vincularMov?.codigo ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={fnStyles.suggestionButtonText}>Vincular</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ))
        )}
      </FinanceiroFilterModal>
    </SafeAreaView>
  );
}

const financeiroJanelaOptions: Array<{ label: string; value: 'mes' | '3meses' | '6meses' | '12meses' }> = [
  { label: 'Mês', value: 'mes' },
  { label: '3 meses', value: '3meses' },
  { label: '6 meses', value: '6meses' },
  { label: '12 meses', value: '12meses' },
];

export function FinanceiroBalanceteDreScreen({ navigation }: ScreenProps<'FinanceiroBalanceteDre'>) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [janela, setJanela] = useState<'mes' | '3meses' | '6meses' | '12meses'>('6meses');
  const [apuracaoCaixa, setApuracaoCaixa] = useState(false);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [meses, setMeses] = useState<FinanceiroDreMes[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [postoModalOpen, setPostoModalOpen] = useState(false);
  const postoLabel = postoSelecionado ? postos.find((p) => p.id === postoSelecionado)?.nome ?? 'Posto' : 'Todos os postos';

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const janelaMesesCount = janela === 'mes' ? 1 : janela === '3meses' ? 3 : janela === '6meses' ? 6 : 12;
    const mesIni = Math.max(1, mes - janelaMesesCount + 1);
    fetchFinanceiroBalancete({
      ano,
      mesIni,
      mesFim: mes,
      apuracaoCaixa,
      unidadeIds: postoSelecionado ? [postoSelecionado] : undefined,
    })
      .then(setMeses)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar o balancete/DRE.')))
      .finally(() => setIsLoading(false));
  }, [mes, ano, janela, postoSelecionado, apuracaoCaixa]);

  const handleMesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  };
  const handleMesProximo = () => {
    if (mes === 12) {
      setMes(1);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader
          icon="bar-chart-2"
          title="Balancete / DRE"
          subtitle="Entradas, saídas e resultado — mês a mês, por posto ou rede toda."
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
          <Pressable onPress={handleMesAnterior} style={fnStyles.monthNavButton}>
            <Feather name="chevron-left" size={18} color="#5E667D" />
          </Pressable>
          <Text style={fnStyles.monthLabel}>
            {financeiroMesesNomes[mes - 1]} / {ano}
          </Text>
          <Pressable onPress={handleMesProximo} style={fnStyles.monthNavButton}>
            <Feather name="chevron-right" size={18} color="#5E667D" />
          </Pressable>
        </View>

        <View style={fnStyles.filterSegmentRow}>
          {financeiroJanelaOptions.map((opt) => {
            const isActive = janela === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[fnStyles.filterSegmentButton, isActive ? fnStyles.filterSegmentButtonActive : null]}
                onPress={() => setJanela(opt.value)}
              >
                <Text style={[fnStyles.filterSegmentText, isActive ? fnStyles.filterSegmentTextActive : null]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={[fnStyles.postoSelectButton, { marginBottom: 10 }]} onPress={() => setPostoModalOpen(true)}>
          <Text style={fnStyles.postoSelectText} numberOfLines={1}>
            {postoLabel}
          </Text>
          <Feather name="chevron-down" size={16} color="#5E667D" />
        </Pressable>

        <View style={[fnStyles.filterOptionRow, { marginBottom: 12 }]}>
          <Text style={fnStyles.filterOptionRowText}>Regime de caixa</Text>
          <ToggleSwitch value={apuracaoCaixa} onValueChange={() => setApuracaoCaixa((v) => !v)} />
        </View>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : meses.length === 0 ? (
          <FinanceiroEmptyState message="Sem dados para o período selecionado." />
        ) : (
          meses.map((item) => (
            <View key={item.periodo} style={fnStyles.dreCard}>
              <Text style={fnStyles.sectionTitle}>{item.label}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                  <Text style={fnStyles.kpiLabel}>Receita líquida</Text>
                  <Text style={fnStyles.kpiValue}>{formatBRL(item.receitaLiquida)}</Text>
                </View>
                <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                  <Text style={fnStyles.kpiLabel}>Despesas</Text>
                  <Text style={fnStyles.kpiValue}>{formatBRL(item.despesas)}</Text>
                </View>
                <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                  <Text style={fnStyles.kpiLabel}>Resultado</Text>
                  <Text style={[fnStyles.kpiValue, { color: item.resultado >= 0 ? '#18955A' : '#E6213D' }]}>
                    {formatBRL(item.resultado)}
                  </Text>
                </View>
                <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                  <Text style={fnStyles.kpiLabel}>Margem</Text>
                  <Text style={[fnStyles.kpiValue, { color: item.margem >= 0 ? '#18955A' : '#E6213D' }]}>
                    {item.margem.toFixed(1)}%
                  </Text>
                </View>
              </View>

              {item.gruposVenda.length > 0 ? (
                <>
                  <Text style={fnStyles.dreSubTitle}>Vendas por grupo</Text>
                  {item.gruposVenda.map((grupo, idx) => (
                    <View key={idx} style={fnStyles.dreLine}>
                      <Text style={fnStyles.dreLineLabel} numberOfLines={1}>
                        {grupo.grupo}
                      </Text>
                      <Text style={fnStyles.dreLineValue}>{formatBRL(grupo.venda)}</Text>
                    </View>
                  ))}
                </>
              ) : null}

              {item.despesasPorConta.length > 0 ? (
                <>
                  <Text style={[fnStyles.dreSubTitle, { marginTop: 8 }]}>Despesas por conta</Text>
                  {item.despesasPorConta.map((conta, idx) => (
                    <View key={idx} style={fnStyles.dreLine}>
                      <Text style={fnStyles.dreLineLabel} numberOfLines={1}>
                        {conta.conta}
                      </Text>
                      <Text style={[fnStyles.dreLineValue, { color: '#E6213D' }]}>{formatBRL(conta.valor)}</Text>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <FinanceiroFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
      </FinanceiroFilterModal>
    </SafeAreaView>
  );
}

export function FinanceiroInteligenciaIAScreen({ navigation }: ScreenProps<'FinanceiroInteligenciaIA'>) {
  const [itens, setItens] = useState<FinanceiroIaPredicaoItem[]>([]);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [mostrarRespondidos, setMostrarRespondidos] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReanalisando, setIsReanalisando] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [postoModalOpen, setPostoModalOpen] = useState(false);
  const postoLabel = postoSelecionado ? postos.find((p) => p.id === postoSelecionado)?.nome ?? 'Posto' : 'Todos os postos';

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroIaPredicoes({
      unidadeIds: postoSelecionado ? [postoSelecionado] : undefined,
      incluirRespondidos: mostrarRespondidos,
    })
      .then(setItens)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar as previsões da IA.')))
      .finally(() => setIsLoading(false));
  }, [postoSelecionado, mostrarRespondidos]);

  useEffect(load, [load]);

  const handleResponder = (item: FinanceiroIaPredicaoItem, resposta: 'sim' | 'nao') => {
    setActingId(item.id);
    responderFinanceiroIaPredicao({ predicao_id: item.id, resposta })
      .then(load)
      .catch((err) => showFinanceiroError(err, 'Não foi possível registrar a resposta.'))
      .finally(() => setActingId(null));
  };

  const handleReanalisar = () => {
    setIsReanalisando(true);
    reanalisarFinanceiroIa()
      .then(load)
      .catch((err) => showFinanceiroError(err, 'Não foi possível reanalisar agora.'))
      .finally(() => setIsReanalisando(false));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader
          icon="zap"
          title="Inteligência IA"
          subtitle="Lançamentos previstos pela IA a partir do histórico de cada posto."
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Pressable style={[fnStyles.postoSelectButton, { flex: 1 }]} onPress={() => setPostoModalOpen(true)}>
            <Text style={fnStyles.postoSelectText} numberOfLines={1}>
              {postoLabel}
            </Text>
            <Feather name="chevron-down" size={16} color="#5E667D" />
          </Pressable>
          <Pressable style={fnStyles.reanalisarButton} onPress={handleReanalisar} disabled={isReanalisando}>
            {isReanalisando ? (
              <ActivityIndicator color="#C05621" size="small" />
            ) : (
              <>
                <Feather name="refresh-cw" size={14} color="#C05621" />
                <Text style={fnStyles.reanalisarButtonText}>Reanalisar agora</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={[fnStyles.filterOptionRow, { marginBottom: 10 }]}>
          <Text style={fnStyles.filterOptionRowText}>Mostrar respondidos</Text>
          <ToggleSwitch value={mostrarRespondidos} onValueChange={() => setMostrarRespondidos((v) => !v)} />
        </View>

        <Text style={fnStyles.countLabel}>{itens.length} previsão(ões)</Text>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : itens.length === 0 ? (
          <FinanceiroEmptyState message="Nenhuma previsão da IA no momento." />
        ) : (
          itens.map((item) => (
            <View key={item.id} style={fnStyles.dreCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={fnStyles.listRowTitle} numberOfLines={1}>
                    {item.fornecedor_nome || '—'}
                  </Text>
                  <Text style={fnStyles.listRowMeta} numberOfLines={1}>
                    Posto {item.posto}
                  </Text>
                </View>
                <Text style={[fnStyles.listRowValue, { fontSize: 16 }]}>{formatBRL(item.valor_esperado)}</Text>
              </View>
              <Text style={[fnStyles.listRowMeta, { marginBottom: 4 }]}>{item.mensagem}</Text>
              <Text style={fnStyles.listRowMeta}>
                {item.posto} · {item.tipo} · Competência {item.competencia} · {item.periodicidade}
              </Text>
              <Text style={fnStyles.listRowMeta}>
                {item.detalhe ? `${item.detalhe} · ` : ''}
                confiança {Math.round(item.confianca * 100)}%
              </Text>

              {item.status === 'pendente' ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Pressable
                    style={[fnStyles.suggestionButton, { flex: 1, alignItems: 'center' }]}
                    onPress={() => handleResponder(item, 'sim')}
                    disabled={actingId === item.id}
                  >
                    {actingId === item.id ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={fnStyles.suggestionButtonText}>Verificado/Lançado</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={[fnStyles.suggestionButton, { flex: 1, alignItems: 'center', backgroundColor: '#E6213D' }]}
                    onPress={() => handleResponder(item, 'nao')}
                    disabled={actingId === item.id}
                  >
                    <Text style={fnStyles.suggestionButtonText}>Não/Incorreto</Text>
                  </Pressable>
                </View>
              ) : (
                <View
                  style={[
                    fnStyles.badge,
                    { alignSelf: 'flex-start', marginTop: 8, backgroundColor: item.status === 'confirmado' ? '#E3F5EA' : '#FBE7E9' },
                  ]}
                >
                  <Text style={[fnStyles.badgeText, { color: item.status === 'confirmado' ? '#18955A' : '#E6213D' }]}>
                    {item.status === 'confirmado' ? 'Confirmado' : item.status === 'rejeitado' ? 'Rejeitado' : 'Suprimido'}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <FinanceiroFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <FinanceiroPostoFilterRow
          postos={postos}
          selected={postoSelecionado}
          onSelect={(id) => {
            setPostoSelecionado(id);
            setPostoModalOpen(false);
          }}
        />
      </FinanceiroFilterModal>
    </SafeAreaView>
  );
}

const financeiroProjecaoHorizonteOptions = [
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
];

export function FinanceiroProjecoesScreen({ navigation }: ScreenProps<'FinanceiroProjecoes'>) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(220, windowWidth - 40 - 24 - 32);
  const chartPlotWidth = Math.max(160, chartWidth - 44);
  const [data, setData] = useState<FinanceiroProjecoesData | null>(null);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [horizonteMeses, setHorizonteMeses] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [postoModalOpen, setPostoModalOpen] = useState(false);
  const [projPointerIdx, setProjPointerIdx] = useState<number | null>(null);
  const postoLabel = postoSelecionado ? postos.find((p) => p.id === postoSelecionado)?.nome ?? 'Posto' : 'Todos os postos';

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroProjecoes({ unidadeIds: postoSelecionado ? [postoSelecionado] : undefined, horizonteMeses })
      .then(setData)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar as projeções.')))
      .finally(() => setIsLoading(false));
  }, [postoSelecionado, horizonteMeses]);

  // Mesma lógica de escala/offset usada no gráfico "Curva financeira" do
  // Dashboard — aqui só existe 1 série (saldoBase), mas o saldo pode ficar
  // bem negativo, então precisamos do yAxisOffset pra não gerar um gráfico
  // gigante (ver comentário detalhado lá no Dashboard).
  const saldoRange = useMemo(() => {
    const valores = (data?.meses ?? []).map((m) => m.saldoBase);
    const max = Math.max(0, ...valores);
    const min = Math.min(0, ...valores);
    const maxComFolga = max > 0 ? max * 1.1 : 1;
    const offset = min < 0 ? min * 1.1 : 0;
    return { max: maxComFolga - offset, offset };
  }, [data]);

  const resultadoProjetado = useMemo(() => {
    if (!data || data.meses.length === 0) return 0;
    return data.meses[data.meses.length - 1].saldoBase - data.saldoInicial;
  }, [data]);

  const saldoFimHorizonte = data && data.meses.length > 0 ? data.meses[data.meses.length - 1].saldoBase : 0;

  // Primeiro mês em que o saldo projetado (cenário base) vira negativo —
  // mesmo aviso que aparece no web.
  const mesNegativo = useMemo(() => data?.meses.find((m) => m.saldoBase < 0) ?? null, [data]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader
          icon="trending-up"
          title="Projeções"
          subtitle="Faturamento e pagamentos projetados para os próximos meses."
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Pressable style={[fnStyles.postoSelectButton, { flex: 1 }]} onPress={() => setPostoModalOpen(true)}>
            <Text style={fnStyles.postoSelectText} numberOfLines={1}>
              {postoLabel}
            </Text>
            <Feather name="chevron-down" size={16} color="#5E667D" />
          </Pressable>
        </View>

        <View style={[fnStyles.filterSegmentRow, { marginBottom: 12 }]}>
          {financeiroProjecaoHorizonteOptions.map((opt) => {
            const isActive = horizonteMeses === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[fnStyles.filterSegmentButton, isActive ? fnStyles.filterSegmentButtonActive : null]}
                onPress={() => setHorizonteMeses(opt.value)}
              >
                <Text style={[fnStyles.filterSegmentText, isActive ? fnStyles.filterSegmentTextActive : null]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : !data ? (
          <FinanceiroEmptyState message="Sem dados de projeção." />
        ) : (
          <>
            <View style={{ gap: 8, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0' }]}>
                  <Text style={fnStyles.kpiLabel}>Saldo bancário atual</Text>
                  <Text style={[fnStyles.kpiValue, { fontSize: 15 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {formatBRL(data.saldoInicial)}
                  </Text>
                </View>
                <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0' }]}>
                  <Text style={fnStyles.kpiLabel}>Resultado projetado</Text>
                  <Text
                    style={[fnStyles.kpiValue, { fontSize: 15, color: resultadoProjetado >= 0 ? '#18955A' : '#E6213D' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {formatBRL(resultadoProjetado)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0' }]}>
                  <Text style={fnStyles.kpiLabel}>Saldo ao fim do horizonte</Text>
                  <Text
                    style={[fnStyles.kpiValue, { fontSize: 15, color: saldoFimHorizonte >= 0 ? '#0C1736' : '#E6213D' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {formatBRL(saldoFimHorizonte)}
                  </Text>
                </View>
                <View style={[fnStyles.kpiCard, { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: '#E2E6F0' }]}>
                  <Text style={fnStyles.kpiLabel}>Média histórica ({horizonteMeses}M)</Text>
                  <Text style={[fnStyles.kpiValue, { fontSize: 15 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {formatBRL(data.mediaReceber)}
                  </Text>
                  <Text style={[fnStyles.kpiLabelUnidade, { marginTop: 2 }]} numberOfLines={1}>
                    Pagamentos: {formatBRLValor(data.mediaPagar)}
                  </Text>
                </View>
              </View>
            </View>

            {mesNegativo ? (
              <View style={fnStyles.projAlertBanner}>
                <Feather name="alert-triangle" size={16} color="#B3172F" />
                <Text style={fnStyles.projAlertText}>
                  Saldo projetado fica negativo em {mesNegativo.label} ({formatBRL(mesNegativo.saldoBase)}).
                </Text>
              </View>
            ) : null}

            <View style={fnStyles.dreCard}>
              <Text style={fnStyles.sectionTitle}>Curva de caixa projetada</Text>
              <LineChart
                data={data.meses.map((m) => ({ value: m.saldoBase }))}
                width={chartPlotWidth}
                height={160}
                thickness={2.5}
                color="#E0603D"
                areaChart
                startFillColor="#E0603D"
                endFillColor="#E0603D"
                startOpacity={0.25}
                endOpacity={0.02}
                yAxisLabelWidth={44}
                yAxisTextStyle={{ color: '#8A93A8', fontSize: 9 }}
                noOfSections={4}
                maxValue={saldoRange.max}
                yAxisOffset={saldoRange.offset}
                xAxisLabelsHeight={0}
                hideRules
                hideDataPoints={false}
                dataPointsColor="#E0603D"
                dataPointsRadius={3}
                initialSpacing={8}
                endSpacing={8}
                pointerConfig={{
                  pointerStripHeight: 140,
                  pointerStripColor: '#C7CCD9',
                  pointerColor: '#E0603D',
                  radius: 5,
                  pointerLabelComponent: (items: Array<{ value: number }>, pointerIndex: number) => {
                    setTimeout(() => setProjPointerIdx(pointerIndex), 0);
                    return null;
                  },
                }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 44 + 8, paddingRight: 8, marginTop: 4 }}>
                {data.meses.map((m, idx) => (
                  <Text
                    key={m.mes}
                    style={[
                      fnStyles.chartAxisLabel,
                      idx === 0 ? { textAlign: 'left' } : idx === data.meses.length - 1 ? { textAlign: 'right' } : { textAlign: 'center' },
                    ]}
                  >
                    {m.label}
                  </Text>
                ))}
              </View>
              <Text style={[fnStyles.listRowMeta, { marginTop: 8, textAlign: 'center' }]}>
                {projPointerIdx !== null && data.meses[projPointerIdx]
                  ? `${data.meses[projPointerIdx].label} · Saldo projetado: ${formatBRL(data.meses[projPointerIdx].saldoBase)}`
                  : 'Toque em um ponto da linha para ver o saldo projetado daquele mês.'}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={fnStyles.projTableCard}>
              <View>
                <View style={fnStyles.projTableHeaderRow}>
                  <Text style={[fnStyles.projTableHeaderCell, { width: 70 }]}>Mês</Text>
                  <Text style={[fnStyles.projTableHeaderCell, { width: 110, textAlign: 'right' }]}>A receber{'\n'}(lançado)</Text>
                  <Text style={[fnStyles.projTableHeaderCell, { width: 100, textAlign: 'right' }]}>+ média</Text>
                  <Text style={[fnStyles.projTableHeaderCell, { width: 110, textAlign: 'right' }]}>A pagar{'\n'}(lançado)</Text>
                  <Text style={[fnStyles.projTableHeaderCell, { width: 100, textAlign: 'right' }]}>+ média</Text>
                  <Text style={[fnStyles.projTableHeaderCell, { width: 120, textAlign: 'right' }]}>Resultado</Text>
                  <Text style={[fnStyles.projTableHeaderCell, { width: 140, textAlign: 'right' }]}>Saldo{'\n'}projetado</Text>
                </View>
                {data.meses.map((m) => (
                  <View key={m.mes} style={fnStyles.projTableRow}>
                    <Text style={[fnStyles.projTableCell, { width: 70 }]}>{m.label}</Text>
                    <Text style={[fnStyles.projTableCell, { width: 110, textAlign: 'right', color: '#18955A' }]}>
                      {formatBRL(m.receberPrevisto)}
                    </Text>
                    <Text style={[fnStyles.projTableCell, { width: 100, textAlign: 'right', color: '#8A93A8', fontWeight: '400' }]}>
                      {formatBRL(m.receberMedia)}
                    </Text>
                    <Text style={[fnStyles.projTableCell, { width: 110, textAlign: 'right', color: '#E6213D' }]}>
                      {formatBRL(m.pagarPrevisto)}
                    </Text>
                    <Text style={[fnStyles.projTableCell, { width: 100, textAlign: 'right', color: '#8A93A8', fontWeight: '400' }]}>
                      {formatBRL(m.pagarMedia)}
                    </Text>
                    <Text
                      style={[
                        fnStyles.projTableCell,
                        { width: 120, textAlign: 'right', color: m.resultado >= 0 ? '#18955A' : '#E6213D' },
                      ]}
                    >
                      {formatBRL(m.resultado)}
                    </Text>
                    <Text
                      style={[
                        fnStyles.projTableCell,
                        { width: 140, textAlign: 'right', color: m.saldoBase >= 0 ? '#0C1736' : '#E6213D' },
                      ]}
                    >
                      {formatBRL(m.saldoBase)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        )}
      </ScrollView>

      <FinanceiroFilterModal visible={postoModalOpen} title="Posto" onClose={() => setPostoModalOpen(false)}>
        <FinanceiroPostoFilterRow
          postos={postos}
          selected={postoSelecionado}
          onSelect={(id) => {
            setPostoSelecionado(id);
            setPostoModalOpen(false);
          }}
        />
      </FinanceiroFilterModal>
    </SafeAreaView>
  );
}

const financeiroRelatorioTipos: Array<{ label: string; value: 'contas' | 'conciliacoes' | 'fornecedores' | 'centros_custo' }> = [
  { label: 'Contas', value: 'contas' },
  { label: 'Conciliações', value: 'conciliacoes' },
  { label: 'Fornecedores', value: 'fornecedores' },
  { label: 'Centros de custo', value: 'centros_custo' },
];

export function FinanceiroRelatoriosScreen({ navigation }: ScreenProps<'FinanceiroRelatorios'>) {
  const [tipo, setTipo] = useState<'contas' | 'conciliacoes' | 'fornecedores' | 'centros_custo'>('contas');
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [itens, setItens] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroRelatorio<Record<string, unknown>>({
      tipo,
      unidadeIds: postoSelecionado ? [postoSelecionado] : undefined,
    })
      .then(setItens)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível gerar o relatório.')))
      .finally(() => setIsLoading(false));
  }, [tipo, postoSelecionado]);

  const renderLinha = (item: Record<string, unknown>, idx: number) => {
    if (tipo === 'fornecedores') {
      return (
        <View key={idx} style={fnStyles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={fnStyles.listRowTitle} numberOfLines={1}>
              {String(item.razao ?? item.fantasia ?? '—')}
            </Text>
            <Text style={fnStyles.listRowMeta}>{String(item.cnpjCpf ?? '')}</Text>
          </View>
        </View>
      );
    }
    if (tipo === 'centros_custo') {
      return (
        <View key={idx} style={fnStyles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={fnStyles.listRowTitle} numberOfLines={1}>
              {String(item.descricao ?? '—')}
            </Text>
            <Text style={fnStyles.listRowMeta}>{String(item.tipo ?? '')}</Text>
          </View>
        </View>
      );
    }
    if (tipo === 'contas') {
      return (
        <View key={idx} style={fnStyles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={fnStyles.listRowTitle} numberOfLines={1}>
              {String(item.descricao ?? '—')}
            </Text>
            <Text style={fnStyles.listRowMeta}>
              {String(item.contraparte ?? '')} · {String(item.status ?? '')}
            </Text>
          </View>
          <Text style={fnStyles.listRowValue}>{formatBRL(Number(item.valor ?? 0))}</Text>
        </View>
      );
    }
    return (
      <View key={idx} style={fnStyles.listRow}>
        <View style={{ flex: 1 }}>
          <Text style={fnStyles.listRowTitle} numberOfLines={1}>
            {String(item.movimentoDescricao ?? item.tituloDescricao ?? '—')}
          </Text>
          <Text style={fnStyles.listRowMeta}>{String(item.tituloContraparte ?? '')}</Text>
        </View>
        <Text style={fnStyles.listRowValue}>{formatBRL(Number(item.movimentoValor ?? item.tituloValor ?? 0))}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader
          icon="file-text"
          title="Relatórios"
          subtitle="Relatórios financeiros e exportações por período."
        />

        <FinanceiroFilterTriggerButton onPress={() => setFiltersOpen(true)} activeCount={postoSelecionado ? 1 : 0} />
        <Text style={fnStyles.countLabel}>Tipo: {financeiroRelatorioTipos.find((o) => o.value === tipo)?.label}</Text>

        <View style={fnStyles.suggestionBox}>
          <Text style={fnStyles.suggestionText}>
            Esta tela mostra os dados reais do relatório selecionado. A exportação em Excel/PDF ainda depende de um endpoint de
            geração de arquivo que a Lovable ainda não confirmou — assim que confirmado, o botão de exportar é ativado aqui.
          </Text>
        </View>

        <Text style={fnStyles.countLabel}>{itens.length} registro(s)</Text>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : itens.length === 0 ? (
          <FinanceiroEmptyState message="Nenhum registro encontrado." />
        ) : (
          itens.map((item, idx) => renderLinha(item, idx))
        )}
      </ScrollView>

      <FinanceiroFilterModal visible={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <FinanceiroFilterSectionTitle label="Tipo de relatório" />
        {financeiroRelatorioTipos.map((opt) => (
          <FinanceiroFilterOptionRow
            key={opt.value}
            label={opt.label}
            active={tipo === opt.value}
            onPress={() => setTipo(opt.value)}
          />
        ))}
        <FinanceiroFilterSectionTitle label="Posto" />
        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
      </FinanceiroFilterModal>
    </SafeAreaView>
  );
}

// publico_tipo no banco é plural (todos|colaboradores|postos|cargos); a UI
// compartilhada (NotificationRoutineFormModal) usa singular (posto|cargo) —
// mesma conversão usada pelo Administrador/Diretoria.
const FINANCEIRO_NOTIF_AUDIENCE_TO_DB: Record<NotificationAudienceType, FinanceiroNotifPublicoTipo> = {
  todos: 'todos',
  colaboradores: 'colaboradores',
  posto: 'postos',
  cargo: 'cargos',
};
const FINANCEIRO_NOTIF_AUDIENCE_FROM_DB: Record<FinanceiroNotifPublicoTipo, NotificationAudienceType> = {
  todos: 'todos',
  colaboradores: 'colaboradores',
  postos: 'posto',
  cargos: 'cargo',
};

function financeiroNotifTemplateToLocal(item: FinanceiroNotifTemplateItem): NotificationTemplateItem {
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

function financeiroNotifRoutineToLocal(
  item: FinanceiroNotifRotinaItem,
  realTemplates: FinanceiroNotifTemplateItem[]
): NotificationRoutineItem {
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
    audienceType: FINANCEIRO_NOTIF_AUDIENCE_FROM_DB[item.publicoTipo] ?? 'todos',
    audienceCargos: item.publicoTipo === 'cargos' ? item.publicoIds : [],
    lastRunLabel: item.ultimaExecucao ? formatDateIsoBR(item.ultimaExecucao) ?? '—' : '—',
    enabled: item.isActive,
  };
}

function financeiroNotifRoutineToWriteBody(
  local: NotificationRoutineItem,
  realTemplates: FinanceiroNotifTemplateItem[]
) {
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
    publico_tipo: FINANCEIRO_NOTIF_AUDIENCE_TO_DB[local.audienceType],
    publico_ids: local.audienceType === 'cargo' ? local.audienceCargos : [],
  };
}

function financeiroNotifTemplateToWriteBody(local: NotificationTemplateItem) {
  return {
    codigo: local.code,
    nome: local.title,
    titulo: local.messageTitle,
    mensagem: local.message,
    variaveis: local.variables,
  };
}

export function FinanceiroNotificationsScreen({ navigation }: ScreenProps<'FinanceiroNotifications'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;
  const isFocused = useIsFocused();

  const [activeTab, setActiveTab] = useState<'routines' | 'templates'>('routines');

  const [realRoutines, setRealRoutines] = useState<FinanceiroNotifRotinaItem[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [routinesError, setRoutinesError] = useState<string | null>(null);
  const [isRoutineFormOpen, setIsRoutineFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<NotificationRoutineItem | null>(null);

  const [realTemplates, setRealTemplates] = useState<FinanceiroNotifTemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateItem | null>(null);

  const loadTemplates = useCallback(() => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);
    fetchFinanceiroNotifTemplates()
      .then((data) => setRealTemplates(data.templates))
      .catch((err) => setTemplatesError(showFinanceiroError(err, 'Não foi possível carregar os templates.')))
      .finally(() => setIsLoadingTemplates(false));
  }, []);

  const loadRoutines = useCallback(() => {
    setIsLoadingRoutines(true);
    setRoutinesError(null);
    fetchFinanceiroNotifRotinas()
      .then((data) => setRealRoutines(data.rotinas))
      .catch((err) => setRoutinesError(showFinanceiroError(err, 'Não foi possível carregar as rotinas.')))
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

  const templates = useMemo(() => realTemplates.map(financeiroNotifTemplateToLocal), [realTemplates]);
  const routines = useMemo(
    () => realRoutines.map((item) => financeiroNotifRoutineToLocal(item, realTemplates)),
    [realRoutines, realTemplates]
  );

  const toggleRoutine = (id: string) => {
    const target = realRoutines.find((item) => item.id === id);
    if (!target) return;
    setRealRoutines((current) => current.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item)));
    updateFinanceiroNotifRotina(id, { ativa: !target.isActive }, actorId).catch((err) => {
      Alert.alert('Erro', showFinanceiroError(err, 'Não foi possível atualizar a rotina.'));
      loadRoutines();
    });
  };

  const handleSaveRoutine = (routine: NotificationRoutineItem) => {
    const body = financeiroNotifRoutineToWriteBody(routine, realTemplates);
    const isExisting = realRoutines.some((item) => item.id === routine.id);
    const request = isExisting
      ? updateFinanceiroNotifRotina(routine.id, body, actorId)
      : createFinanceiroNotifRotina(body, actorId);
    request
      .then(() => {
        setIsRoutineFormOpen(false);
        loadRoutines();
      })
      .catch((err) => Alert.alert('Erro', showFinanceiroError(err, 'Não foi possível salvar a rotina.')));
  };

  const handleRunRoutine = (routine: NotificationRoutineItem) => {
    executarFinanceiroNotifRotina(routine.id, actorId)
      .then(() => {
        Alert.alert('Rotina executada', `"${routine.title}" foi executada agora.`);
        loadRoutines();
      })
      .catch((err) => Alert.alert('Erro', showFinanceiroError(err, 'Não foi possível executar a rotina.')));
  };

  const handleDeleteRoutine = (routine: NotificationRoutineItem) => {
    Alert.alert('Excluir rotina', `Tem certeza que deseja excluir "${routine.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteFinanceiroNotifRotina(routine.id, actorId)
            .then(() => loadRoutines())
            .catch((err) => Alert.alert('Erro', showFinanceiroError(err, 'Não foi possível excluir a rotina.')));
        },
      },
    ]);
  };

  const handleSaveTemplate = (template: NotificationTemplateItem) => {
    const body = financeiroNotifTemplateToWriteBody(template);
    const isExisting = realTemplates.some((item) => item.id === template.id);
    const request = isExisting
      ? updateFinanceiroNotifTemplate(template.id, body, actorId)
      : createFinanceiroNotifTemplate(body, actorId);
    request
      .then(() => {
        setIsTemplateFormOpen(false);
        loadTemplates();
      })
      .catch((err) => Alert.alert('Erro', showFinanceiroError(err, 'Não foi possível salvar o template.')));
  };

  const handleDeleteTemplate = (template: NotificationTemplateItem) => {
    Alert.alert('Excluir template', `Tem certeza que deseja excluir "${template.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteFinanceiroNotifTemplate(template.id, actorId)
            .then(() => loadTemplates())
            .catch((err) => Alert.alert('Erro', showFinanceiroError(err, 'Não foi possível excluir o template (templates padrão do sistema não podem ser excluídos).')));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader icon="bell" title="Notificações" subtitle="Envio de notificações via App, E-mail e WhatsApp." />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Pressable
            style={[fnStyles.filterPill, activeTab === 'routines' ? fnStyles.filterPillActive : null]}
            onPress={() => setActiveTab('routines')}
          >
            <Text style={[fnStyles.filterPillText, activeTab === 'routines' ? fnStyles.filterPillTextActive : null]}>
              Rotinas
            </Text>
          </Pressable>
          <Pressable
            style={[fnStyles.filterPill, activeTab === 'templates' ? fnStyles.filterPillActive : null]}
            onPress={() => setActiveTab('templates')}
          >
            <Text style={[fnStyles.filterPillText, activeTab === 'templates' ? fnStyles.filterPillTextActive : null]}>
              Templates
            </Text>
          </Pressable>
        </View>

        {activeTab === 'routines' ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={fnStyles.countLabel}>
                {isLoadingRoutines ? 'Carregando...' : `${routines.length} rotina(s) cadastrada(s)`}
              </Text>
              <Pressable
                style={[fnStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                onPress={() => {
                  setEditingRoutine(null);
                  setIsRoutineFormOpen(true);
                }}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={fnStyles.suggestionButtonText}>Nova rotina</Text>
              </Pressable>
            </View>

            {isLoadingRoutines ? (
              <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
            ) : routinesError ? (
              <FinanceiroEmptyState message={routinesError} />
            ) : routines.length === 0 ? (
              <FinanceiroEmptyState message="Nenhuma rotina cadastrada. Clique em Nova rotina." />
            ) : (
              routines.map((routine) => {
                const triggerMeta =
                  notificationTriggerOptions.find((option) => option.value === routine.triggerKind) ??
                  notificationTriggerOptions[2];
                const triggerDetail =
                  routine.triggerKind === 'recorrente' ? routine.cronSchedule : routine.triggerKind === 'evento' ? routine.eventCode : '';
                const channelLabels = (Object.keys(notificationChannelMeta) as Array<keyof NotificationChannels>)
                  .filter((key) => routine.channels[key])
                  .map((key) => notificationChannelMeta[key].label);
                const audienceLabel =
                  routine.audienceType === 'cargo'
                    ? `Por cargo (${routine.audienceCargos.length})`
                    : notificationAudienceOptions.find((option) => option.value === routine.audienceType)?.label ??
                      'Todos os colaboradores';

                return (
                  <View key={routine.id} style={fnStyles.dreCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={fnStyles.listRowTitle} numberOfLines={1}>
                        {routine.title}
                      </Text>
                      <ToggleSwitch value={routine.enabled} onValueChange={() => toggleRoutine(routine.id)} />
                    </View>
                    <Text style={fnStyles.listRowMeta}>{routine.messageTitle}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <View style={[fnStyles.badge, { backgroundColor: '#EDE7FB' }]}>
                        <Text style={[fnStyles.badgeText, { color: '#5B3EBF' }]}>{triggerMeta.label}</Text>
                      </View>
                      <Text style={fnStyles.listRowMeta} numberOfLines={1}>
                        {channelLabels.length > 0 ? channelLabels.join(', ') : 'Nenhum canal'}
                      </Text>
                      <Text style={fnStyles.listRowMeta}>{audienceLabel}</Text>
                    </View>
                    {triggerDetail ? <Text style={[fnStyles.listRowMeta, { marginTop: 4 }]}>{triggerDetail}</Text> : null}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <Text style={fnStyles.listRowMeta}>
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={fnStyles.countLabel}>
                {isLoadingTemplates
                  ? 'Carregando...'
                  : `${templates.length} template(s)${templates.length > 0 ? ' — ⭐ padrão do sistema, demais customizados' : ''}`}
              </Text>
              <Pressable
                style={[fnStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                onPress={() => {
                  setEditingTemplate(null);
                  setIsTemplateFormOpen(true);
                }}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={fnStyles.suggestionButtonText}>Novo template</Text>
              </Pressable>
            </View>

            {isLoadingTemplates ? (
              <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
            ) : templatesError ? (
              <FinanceiroEmptyState message={templatesError} />
            ) : templates.length === 0 ? (
              <FinanceiroEmptyState message="Nenhum template cadastrado ainda." />
            ) : (
              templates.map((template) => (
                <View key={template.id} style={fnStyles.dreCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {template.isSystemDefault ? <Feather name="star" size={14} color="#D79A22" /> : null}
                    <Text style={fnStyles.listRowTitle} numberOfLines={1}>
                      {template.title}
                    </Text>
                  </View>
                  <Text style={fnStyles.listRowMeta}>{template.code}</Text>
                  <Text style={[fnStyles.listRowMeta, { marginTop: 4 }]}>{template.messageTitle}</Text>
                  <Text style={fnStyles.listRowMeta} numberOfLines={2}>
                    {template.message}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {template.variables.map((variable) => (
                      <View key={variable} style={[fnStyles.badge, { backgroundColor: '#F1F3F8' }]}>
                        <Text style={[fnStyles.badgeText, { color: '#5E667D' }]}>{variable}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
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

function FinanceiroPostoFormModal({
  visible,
  posto,
  onClose,
  onSaved,
}: {
  visible: boolean;
  posto: FinanceiroPostoConfig | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState('');
  const [empresaCodigo, setEmpresaCodigo] = useState('');
  const [idq, setIdq] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setNome(posto?.nome ?? '');
      setEmpresaCodigo(posto ? String(posto.empresaCodigo ?? '') : '');
      setIdq(posto?.idq ?? '');
      setAtivo(posto?.ativo ?? true);
    }
  }, [visible, posto]);

  const handleSalvar = () => {
    if (!nome.trim()) {
      showFinanceiroError(new Error('Nome obrigatório'), 'Informe o nome do posto.');
      return;
    }
    setIsSaving(true);
    const codigoNum = empresaCodigo.trim() ? Number(empresaCodigo.trim()) : null;
    const body = { nome: nome.trim(), empresaCodigo: codigoNum, idq: idq.trim() || undefined, ativo };
    const promise = posto
      ? atualizarFinanceiroConfigPosto(posto.id, body)
      : criarFinanceiroConfigPosto(body as { nome: string; empresaCodigo: number | null; idq?: string; ativo?: boolean });
    promise
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((err) => showFinanceiroError(err, 'Não foi possível salvar o posto.'))
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={fnStyles.modalOverlay}>
        <View style={fnStyles.modalCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={fnStyles.sectionTitle}>{posto ? 'Editar posto' : 'Novo posto'}</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={20} color="#5E667D" />
            </Pressable>
          </View>

          <Text style={fnStyles.formLabel}>Nome do posto</Text>
          <TextInput style={fnStyles.formInput} value={nome} onChangeText={setNome} placeholder="Nome do posto" />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={fnStyles.formLabel}>Código da empresa</Text>
              <TextInput
                style={fnStyles.formInput}
                value={empresaCodigo}
                onChangeText={setEmpresaCodigo}
                placeholder="Ex: 1234"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fnStyles.formLabel}>IDQ (opcional)</Text>
              <TextInput style={fnStyles.formInput} value={idq} onChangeText={setIdq} placeholder="IDQ" />
            </View>
          </View>

          <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }} onPress={() => setAtivo((v) => !v)}>
            <Feather name={ativo ? 'check-square' : 'square'} size={18} color={ativo ? '#18955A' : '#8891A6'} />
            <Text style={{ fontSize: 13, color: '#0C1736' }}>Posto ativo nas consultas</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Pressable style={[fnStyles.modalButtonSecondary, { flex: 1 }]} onPress={onClose} disabled={isSaving}>
              <Text style={fnStyles.modalButtonSecondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[fnStyles.suggestionButton, { flex: 1, alignItems: 'center' }]} onPress={handleSalvar} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={fnStyles.suggestionButtonText}>Salvar</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function FinanceiroConfiguracoesScreen({ navigation }: ScreenProps<'FinanceiroConfiguracoes'>) {
  const [config, setConfig] = useState<FinanceiroConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [novaChave, setNovaChave] = useState('');
  const [isSalvandoChave, setIsSalvandoChave] = useState(false);
  const [isTestando, setIsTestando] = useState(false);
  const [testeResultado, setTesteResultado] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [postoEmEdicao, setPostoEmEdicao] = useState<FinanceiroPostoConfig | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroConfig()
      .then(setConfig)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar as configurações.')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(load, [load]);

  const handleSalvarChave = () => {
    if (novaChave.trim().length < 8) {
      showFinanceiroError(new Error('Chave curta'), 'A chave precisa ter pelo menos 8 caracteres.');
      return;
    }
    setIsSalvandoChave(true);
    salvarFinanceiroConfigChave(novaChave.trim())
      .then(() => {
        setNovaChave('');
        load();
      })
      .catch((err) => showFinanceiroError(err, 'Não foi possível salvar a chave.'))
      .finally(() => setIsSalvandoChave(false));
  };

  const handleTestarConexao = () => {
    setIsTestando(true);
    setTesteResultado(null);
    testarFinanceiroConexaoQuality()
      .then((result) => setTesteResultado(result))
      .catch((err) => setTesteResultado({ ok: false, mensagem: showFinanceiroError(err, 'Falha ao testar a conexão.') }))
      .finally(() => setIsTestando(false));
  };

  const handleExcluirPosto = (posto: FinanceiroPostoConfig) => {
    setExcluindoId(posto.id);
    excluirFinanceiroConfigPosto(posto.id)
      .then(load)
      .catch((err) => showFinanceiroError(err, 'Não foi possível excluir o posto.'))
      .finally(() => setExcluindoId(null));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" onAvatarPress={() => navigation.navigate('FinanceiroProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader
          icon="settings"
          title="Configurações"
          subtitle="Postos e integração com a API Quality."
        />

        {isLoading && !config ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage && !config ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : (
          <>
            <View style={fnStyles.dreCard}>
              <Text style={fnStyles.sectionTitle}>Integração Quality</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <View style={[fnStyles.badge, { backgroundColor: config?.chaveDefinida ? '#E3F5EA' : '#FBE7E9' }]}>
                  <Text style={[fnStyles.badgeText, { color: config?.chaveDefinida ? '#18955A' : '#E6213D' }]}>
                    {config?.chaveDefinida ? 'Chave configurada' : 'Sem chave'}
                  </Text>
                </View>
                {config?.chaveMascarada ? <Text style={fnStyles.listRowMeta}>{config.chaveMascarada}</Text> : null}
                <Pressable style={fnStyles.testarButton} onPress={handleTestarConexao} disabled={isTestando}>
                  {isTestando ? (
                    <ActivityIndicator color="#C05621" size="small" />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={12} color="#C05621" />
                      <Text style={fnStyles.reanalisarButtonText}>Testar conexão</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {testeResultado ? (
                <View
                  style={[
                    fnStyles.suggestionBox,
                    { backgroundColor: testeResultado.ok ? '#E3F5EA' : '#FBE7E9', marginBottom: 10 },
                  ]}
                >
                  <Text style={[fnStyles.suggestionText, { color: testeResultado.ok ? '#18955A' : '#E6213D' }]}>
                    {testeResultado.mensagem}
                  </Text>
                </View>
              ) : null}

              <Text style={fnStyles.formLabel}>Nova chave de integração</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[fnStyles.formInput, { flex: 1 }]}
                  value={novaChave}
                  onChangeText={setNovaChave}
                  placeholder="Cole aqui a chave fornecida pela Quality"
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Pressable
                  style={[fnStyles.suggestionButton, { alignItems: 'center', justifyContent: 'center' }]}
                  onPress={handleSalvarChave}
                  disabled={isSalvandoChave}
                >
                  {isSalvandoChave ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={fnStyles.suggestionButtonText}>Salvar chave</Text>
                  )}
                </Pressable>
              </View>
              <Text style={[fnStyles.listRowMeta, { marginTop: 6 }]}>
                A chave é global e atende toda a rede — o que separa cada unidade é o código de empresa cadastrado abaixo.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={fnStyles.sectionTitle}>Postos vinculados</Text>
              <Pressable
                style={[fnStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                onPress={() => {
                  setPostoEmEdicao(null);
                  setModalVisible(true);
                }}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={fnStyles.suggestionButtonText}>Novo posto</Text>
              </Pressable>
            </View>

            {!config || config.postos.length === 0 ? (
              <FinanceiroEmptyState message="Nenhum posto configurado ainda." />
            ) : (
              config.postos.map((posto) => (
                <View key={posto.id} style={fnStyles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={fnStyles.listRowTitle} numberOfLines={1}>
                      {posto.nome}
                    </Text>
                    <Text style={fnStyles.listRowMeta}>
                      Empresa {posto.empresaCodigo}
                      {posto.idq ? ` · IDQ ${posto.idq}` : ''}
                    </Text>
                    <Text style={fnStyles.listRowMeta}>{posto.temChave ? 'Herda a chave global' : 'Sem chave de integração'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={[fnStyles.badge, { backgroundColor: posto.ativo ? '#E3F5EA' : '#FBE7E9' }]}>
                      <Text style={[fnStyles.badgeText, { color: posto.ativo ? '#18955A' : '#E6213D' }]}>
                        {posto.ativo ? 'Ativo' : 'Inativo'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Pressable
                        onPress={() => {
                          setPostoEmEdicao(posto);
                          setModalVisible(true);
                        }}
                      >
                        <Feather name="edit-2" size={16} color="#5E667D" />
                      </Pressable>
                      <Pressable onPress={() => handleExcluirPosto(posto)} disabled={excluindoId === posto.id}>
                        {excluindoId === posto.id ? (
                          <ActivityIndicator size="small" color="#E6213D" />
                        ) : (
                          <Feather name="trash-2" size={16} color="#E6213D" />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <FinanceiroPostoFormModal
        visible={modalVisible}
        posto={postoEmEdicao}
        onClose={() => setModalVisible(false)}
        onSaved={load}
      />
    </SafeAreaView>
  );
}

export function FinanceiroProfileScreen({ navigation }: ScreenProps<'FinanceiroProfile'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader icon="user" title="Meu Perfil" subtitle={financeiroUser.accessLabel} />
        <View style={fnStyles.profileCard}>
          <View style={fnStyles.profileAvatarShell}>
            <Text style={fnStyles.profileAvatarText}>{financeiroUserInitials}</Text>
          </View>
          <Text style={fnStyles.profileName}>{financeiroUser.fullName}</Text>
          <Text style={fnStyles.profileRole}>{financeiroUser.roleAndUnit}</Text>

          <View style={fnStyles.profileFieldRow}>
            <Feather name="mail" size={14} color="#7C8397" />
            <Text style={fnStyles.profileFieldText}>{financeiroUser.email}</Text>
          </View>
          <View style={fnStyles.profileFieldRow}>
            <Feather name="phone" size={14} color="#7C8397" />
            <Text style={fnStyles.profileFieldText}>{financeiroUser.phone}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const fnStyles = StyleSheet.create({
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0C1736',
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
    backgroundColor: '#C05621',
    borderColor: '#C05621',
  },
  filterPillText: {
    color: '#5E667D',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#C05621',
    borderColor: '#C05621',
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
  chartSubtitle: {
    fontSize: 11,
    color: '#8891A6',
    marginTop: -4,
    marginBottom: 8,
  },
  chartTooltip: {
    backgroundColor: '#F8F9FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 10,
    marginBottom: 8,
  },
  chartTooltipDate: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0C1736',
    marginBottom: 4,
  },
  chartTooltipLine: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  chartAxisLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5E667D',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    marginBottom: 16,
  },
  dashboardListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    marginBottom: 14,
  },
  dashboardListCardHeader: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 8,
  },
  dashboardListCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0C1736',
  },
  dashboardListCardTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0C1736',
    alignSelf: 'flex-end',
  },
  dashboardListCardDivider: {
    height: 1,
    backgroundColor: '#F1F2F6',
    marginBottom: 6,
  },
  dashboardListCardBody: {
    maxHeight: 260,
  },
  dashboardListCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  dashboardListCardRowTitle: {
    color: '#0C1736',
    fontSize: 14,
    fontWeight: '400',
  },
  dashboardListCardRowValue: {
    color: '#0C1736',
    fontSize: 14,
    fontWeight: '400',
  },
  filterTriggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  filterTriggerText: {
    color: '#0C1736',
    fontSize: 13,
    fontWeight: '700',
  },
  filterTriggerBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C05621',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterTriggerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  filterModalSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8891A6',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 16,
    marginBottom: 4,
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
    color: '#C05621',
    fontWeight: '800',
  },
  filterModalApplyButton: {
    marginTop: 18,
    backgroundColor: '#C05621',
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
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  countLabel: {
    color: '#677089',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 16,
  },
  loadMoreText: {
    color: '#C05621',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0C1736',
    marginBottom: 8,
  },
  suggestionBox: {
    marginTop: 10,
    backgroundColor: '#FCF4DE',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: '#5E4A0E',
  },
  suggestionButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#C05621',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  suggestionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  linkManualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
  },
  linkManualButtonText: {
    color: '#5E667D',
    fontSize: 12,
    fontWeight: '700',
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
  dreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 14,
  },
  dreSubTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#677089',
    marginBottom: 6,
  },
  dreLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F8',
  },
  dreLineLabel: {
    fontSize: 12,
    color: '#0C1736',
    flex: 1,
    marginRight: 8,
  },
  dreLineValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0C1736',
  },
  reanalisarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C05621',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  reanalisarButtonText: {
    color: '#C05621',
    fontSize: 12,
    fontWeight: '700',
  },
  testarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C05621',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 'auto',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#677089',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0C1736',
    backgroundColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12,23,54,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalButtonSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingVertical: 12,
  },
  modalButtonSecondaryText: {
    color: '#5E667D',
    fontSize: 13,
    fontWeight: '700',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  listRowSimple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
  },
  listRowTitle: {
    color: '#0C1736',
    fontSize: 14,
    fontWeight: '700',
  },
  listRowMeta: {
    color: '#7C8397',
    fontSize: 12,
    marginTop: 2,
  },
  listRowValue: {
    color: '#0C1736',
    fontSize: 14,
    fontWeight: '800',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FCEDE1',
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#C05621',
    fontSize: 11,
    fontWeight: '700',
  },
  footerNote: {
    marginTop: 10,
    color: '#9AA1B5',
    fontSize: 11,
    textAlign: 'center',
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
  kpiCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3DEC6',
    padding: 12,
  },
  kpiCardActive: {
    borderColor: '#C05621',
    borderWidth: 2,
  },
  kpiLabel: {
    color: '#8A5A2B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  kpiLabelUnidade: {
    fontSize: 7,
    fontWeight: '600',
    color: '#B7BECC',
    letterSpacing: 0,
  },
  kpiValue: {
    marginTop: 4,
    color: '#0C1736',
    fontSize: 16,
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
    backgroundColor: '#FCEDE1',
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
  pendingCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3DEC6',
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  pendingText: {
    color: '#8A5A2B',
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
    backgroundColor: '#C05621',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
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
  projAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FBE7E9',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  projAlertText: {
    flex: 1,
    color: '#B3172F',
    fontSize: 12,
    fontWeight: '600',
  },
  projTableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingVertical: 4,
    marginBottom: 16,
  },
  projTableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E6F0',
    paddingBottom: 8,
    paddingTop: 8,
  },
  projTableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
    paddingVertical: 10,
  },
  projTableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#677089',
    paddingHorizontal: 10,
  },
  projTableCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0C1736',
    paddingHorizontal: 10,
  },
});
