import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  type FinanceiroFluxoCaixaData,
  type FinanceiroMovimentoItem,
  type FinanceiroConciliacaoResumo,
  type FinanceiroDreMes,
  type FinanceiroIaPredicaoItem,
  type FinanceiroProjecoesData,
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          style={[fnStyles.filterPill, selected === null ? fnStyles.filterPillActive : null]}
          onPress={() => onSelect(null)}
        >
          <Text style={[fnStyles.filterPillText, selected === null ? fnStyles.filterPillTextActive : null]}>
            Todos os postos
          </Text>
        </Pressable>
        {postos.map((posto) => {
          const value = posto.id;
          const isActive = selected === value;
          return (
            <Pressable
              key={posto.id}
              style={[fnStyles.filterPill, isActive ? fnStyles.filterPillActive : null]}
              onPress={() => onSelect(value)}
            >
              <Text style={[fnStyles.filterPillText, isActive ? fnStyles.filterPillTextActive : null]} numberOfLines={1}>
                {posto.nome}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
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
        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
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
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                    <Text style={fnStyles.kpiLabel}>Títulos no período</Text>
                    <Text style={fnStyles.kpiValue}>{detalhe.titulos}</Text>
                  </View>
                  <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                    <Text style={fnStyles.kpiLabel}>Total</Text>
                    <Text style={fnStyles.kpiValue}>{formatBRL(detalhe.valorTotal)}</Text>
                  </View>
                  <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                    <Text style={fnStyles.kpiLabel}>Em aberto</Text>
                    <Text style={fnStyles.kpiValue}>{formatBRL(detalhe.valorAberto ?? 0)}</Text>
                  </View>
                  <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                    <Text style={fnStyles.kpiLabel}>Último vencimento</Text>
                    <Text style={fnStyles.kpiValue}>{formatDateIsoBR(detalhe.ultimoVencimento) ?? '—'}</Text>
                  </View>
                </View>

                <Text style={fnStyles.listRowMeta}>CNPJ/CPF: {detalhe.cnpjCpf}</Text>
                {detalhe.fantasia ? <Text style={fnStyles.listRowMeta}>Fantasia: {detalhe.fantasia}</Text> : null}
                {detalhe.cidade ? <Text style={fnStyles.listRowMeta}>{detalhe.cidade}/{detalhe.uf}</Text> : null}

                <Text style={[fnStyles.listRowTitle, { marginTop: 14, marginBottom: 6 }]}>Por posto</Text>
                {(detalhe.porPosto ?? []).map((linha) => (
                  <View key={linha.posto} style={fnStyles.listRowSimple}>
                    <Text style={fnStyles.listRowMeta}>{linha.posto}</Text>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {financeiroFornecedorPeriodoOptions.map((opt) => {
              const isActive = meses === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[fnStyles.filterPill, isActive ? fnStyles.filterPillActive : null]}
                  onPress={() => setMeses(opt.value)}
                >
                  <Text style={[fnStyles.filterPillText, isActive ? fnStyles.filterPillTextActive : null]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
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

      <FinanceiroFornecedorDetalheModal
        fornecedorCodigo={selecionadoCodigo}
        meses={meses}
        onClose={() => setSelecionadoCodigo(null)}
      />
    </SafeAreaView>
  );
}

export function FinanceiroDashboardScreen({ navigation }: ScreenProps<'FinanceiroDashboard'>) {
  const [data, setData] = useState<FinanceiroDashboardData | null>(null);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroDashboard({ unidadeIds: postoSelecionado ? [postoSelecionado] : undefined })
      .then(setData)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar o dashboard.')))
      .finally(() => setIsLoading(false));
  }, [postoSelecionado]);

  const saldoHoje = (data?.receberHoje ?? 0) - (data?.pagarHoje ?? 0);
  const maxCurva = Math.max(1, ...(data?.curva.map((p) => Math.max(p.recebimentos, p.pagamentos)) ?? [1]));

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

        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : !data ? (
          <FinanceiroEmptyState message="Sem dados para o período." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                <Text style={fnStyles.kpiLabel}>A receber hoje</Text>
                <Text style={[fnStyles.kpiValue, { color: '#18955A' }]}>{formatBRL(data.receberHoje)}</Text>
              </View>
              <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                <Text style={fnStyles.kpiLabel}>A pagar hoje</Text>
                <Text style={[fnStyles.kpiValue, { color: '#E6213D' }]}>{formatBRL(data.pagarHoje)}</Text>
              </View>
              <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '100%' }]}>
                <Text style={fnStyles.kpiLabel}>Saldo projetado do dia</Text>
                <Text style={[fnStyles.kpiValue, { color: saldoHoje >= 0 ? '#18955A' : '#E6213D' }]}>{formatBRL(saldoHoje)}</Text>
              </View>
            </View>

            {data.curva.length > 0 ? (
              <View style={{ marginBottom: 20 }}>
                <Text style={fnStyles.sectionTitle}>Curva financeira</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120, paddingTop: 8 }}>
                  {data.curva.map((ponto, idx) => (
                    <View key={`${ponto.periodo}-${idx}`} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ width: '100%', flexDirection: 'row', gap: 2, alignItems: 'flex-end', height: 90 }}>
                        <View
                          style={{
                            flex: 1,
                            height: Math.max(4, (ponto.recebimentos / maxCurva) * 90),
                            backgroundColor: '#18955A',
                            borderRadius: 3,
                          }}
                        />
                        <View
                          style={{
                            flex: 1,
                            height: Math.max(4, (ponto.pagamentos / maxCurva) * 90),
                            backgroundColor: '#E6213D',
                            borderRadius: 3,
                          }}
                        />
                      </View>
                      <Text style={{ fontSize: 9, color: '#8891A6', marginTop: 4 }} numberOfLines={1}>
                        {ponto.periodo}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#18955A' }} />
                    <Text style={{ fontSize: 11, color: '#5E667D' }}>Recebimentos</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E6213D' }} />
                    <Text style={{ fontSize: 11, color: '#5E667D' }}>Pagamentos</Text>
                  </View>
                </View>
              </View>
            ) : null}

            <Text style={fnStyles.sectionTitle}>Pagamentos e recebimentos de hoje</Text>
            {data.pagamentosHoje.length === 0 ? (
              <FinanceiroEmptyState message="Nada previsto para hoje." />
            ) : (
              data.pagamentosHoje.map((item, idx) => (
                <View key={idx} style={fnStyles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={fnStyles.listRowTitle} numberOfLines={1}>
                      {item.descricao}
                    </Text>
                    <Text style={fnStyles.listRowMeta} numberOfLines={1}>
                      {item.contraparte}
                      {item.posto ? ` · ${item.posto}` : ''}
                    </Text>
                  </View>
                  <Text style={fnStyles.listRowValue}>{formatBRL(item.valor)}</Text>
                </View>
              ))
            )}

            <Text style={[fnStyles.sectionTitle, { marginTop: 16 }]}>Próximos 7 dias</Text>
            {data.pagamentos7d.length === 0 ? (
              <FinanceiroEmptyState message="Nada previsto para os próximos 7 dias." />
            ) : (
              data.pagamentos7d.map((item, idx) => (
                <View key={idx} style={fnStyles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={fnStyles.listRowTitle} numberOfLines={1}>
                      {item.descricao}
                    </Text>
                    <Text style={fnStyles.listRowMeta} numberOfLines={1}>
                      {item.contraparte}
                      {item.posto ? ` · ${item.posto}` : ''}
                      {item.vencimento ? ` · Vence ${formatDateIsoBR(item.vencimento) ?? ''}` : ''}
                    </Text>
                  </View>
                  <Text style={fnStyles.listRowValue}>{formatBRL(item.valor)}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {financeiroContasPeriodoOptions.map((opt) => {
              const isActive = periodo === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[fnStyles.filterPill, isActive ? fnStyles.filterPillActive : null]}
                  onPress={() => setPeriodo(opt.value)}
                >
                  <Text style={[fnStyles.filterPillText, isActive ? fnStyles.filterPillTextActive : null]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
        <FinanceiroSearchInput
          value={busca}
          onChangeText={setBusca}
          placeholder={tipo === 'pagar' ? 'Buscar fornecedor ou título...' : 'Buscar cliente ou título...'}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
            <Text style={fnStyles.kpiLabel}>{tipo === 'pagar' ? 'Total a pagar' : 'Total a receber'}</Text>
            <Text style={fnStyles.kpiValue}>{formatBRL(totalValor)}</Text>
          </View>
          <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
            <Text style={fnStyles.kpiLabel}>Em aberto</Text>
            <Text style={fnStyles.kpiValue}>{formatBRL(emAbertoValor)}</Text>
          </View>
          <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
            <Text style={[fnStyles.kpiLabel, { color: '#E6213D' }]}>Vencidos</Text>
            <Text style={[fnStyles.kpiValue, { color: vencidosValor > 0 ? '#E6213D' : '#0C1736' }]}>{formatBRL(vencidosValor)}</Text>
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
                    <Text style={fnStyles.listRowTitle} numberOfLines={1}>
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
                    <Text style={fnStyles.listRowValue}>{formatBRL(item.valor)}</Text>
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
  const [data, setData] = useState<FinanceiroFluxoCaixaData | null>(null);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'hoje' | 'mes' | 'ano'>('mes');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroFluxoCaixa({
      ...financeiroPeriodoParaDatas(periodo),
      unidadeIds: postoSelecionado ? [postoSelecionado] : undefined,
    })
      .then(setData)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar o fluxo de caixa.')))
      .finally(() => setIsLoading(false));
  }, [periodo, postoSelecionado]);

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['hoje', 'mes', 'ano'] as const).map((opt) => {
              const isActive = periodo === opt;
              const label = opt === 'hoje' ? 'Hoje' : opt === 'mes' ? 'Este mês' : 'Este ano';
              return (
                <Pressable
                  key={opt}
                  style={[fnStyles.filterPill, isActive ? fnStyles.filterPillActive : null]}
                  onPress={() => setPeriodo(opt)}
                >
                  <Text style={[fnStyles.filterPillText, isActive ? fnStyles.filterPillTextActive : null]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : !data ? (
          <FinanceiroEmptyState message="Sem dados para o período." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                <Text style={fnStyles.kpiLabel}>Entradas</Text>
                <Text style={[fnStyles.kpiValue, { color: '#18955A' }]}>{formatBRL(data.entradasPeriodo)}</Text>
              </View>
              <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                <Text style={fnStyles.kpiLabel}>Saídas</Text>
                <Text style={[fnStyles.kpiValue, { color: '#E6213D' }]}>{formatBRL(data.saidasPeriodo)}</Text>
              </View>
              <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                <Text style={fnStyles.kpiLabel}>Saldo do período</Text>
                <Text style={[fnStyles.kpiValue, { color: saldoPeriodo >= 0 ? '#18955A' : '#E6213D' }]}>{formatBRL(saldoPeriodo)}</Text>
              </View>
              <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                <Text style={fnStyles.kpiLabel}>Saldo acumulado</Text>
                <Text style={fnStyles.kpiValue}>{formatBRL(saldoFinal)}</Text>
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
    </SafeAreaView>
  );
}

const financeiroConciliacaoAbas: Array<{ label: string; value: 'pendentes' | 'com-sugestao' | 'conciliados' }> = [
  { label: 'Pendentes', value: 'pendentes' },
  { label: 'Com sugestão', value: 'com-sugestao' },
  { label: 'Conciliados', value: 'conciliados' },
];

export function FinanceiroConciliacaoScreen({ navigation }: ScreenProps<'FinanceiroConciliacao'>) {
  const [movimentos, setMovimentos] = useState<FinanceiroMovimentoItem[]>([]);
  const [resumo, setResumo] = useState<FinanceiroConciliacaoResumo | null>(null);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<'pendentes' | 'com-sugestao' | 'conciliados'>('com-sugestao');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actingCodigo, setActingCodigo] = useState<string | null>(null);

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroConciliacao({
      unidadeIds: postoSelecionado ? [postoSelecionado] : undefined,
      busca: busca.trim() || undefined,
    })
      .then((result) => {
        setMovimentos(result.movimentos);
        setResumo(result.resumo);
      })
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar a conciliação.')))
      .finally(() => setIsLoading(false));
  }, [postoSelecionado, busca]);

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

        {resumo ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '30%' }]}>
              <Text style={fnStyles.kpiLabel}>Pendentes</Text>
              <Text style={fnStyles.kpiValue}>{resumo.pendentes}</Text>
            </View>
            <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '30%' }]}>
              <Text style={fnStyles.kpiLabel}>Com sugestão</Text>
              <Text style={fnStyles.kpiValue}>{resumo.comSugestao}</Text>
            </View>
            <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '30%' }]}>
              <Text style={[fnStyles.kpiLabel, { color: '#18955A' }]}>Conciliados</Text>
              <Text style={[fnStyles.kpiValue, { color: '#18955A' }]}>{resumo.conciliados}</Text>
            </View>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {financeiroConciliacaoAbas.map((opt) => {
              const isActive = aba === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[fnStyles.filterPill, isActive ? fnStyles.filterPillActive : null]}
                  onPress={() => setAba(opt.value)}
                >
                  <Text style={[fnStyles.filterPillText, isActive ? fnStyles.filterPillTextActive : null]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />
        <FinanceiroSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar por descrição..." />

        <Text style={fnStyles.countLabel}>{movimentosFiltrados.length} movimento(s)</Text>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : movimentosFiltrados.length === 0 ? (
          <FinanceiroEmptyState message="Nenhum movimento encontrado nesta aba." />
        ) : (
          movimentosFiltrados.map((mov) => (
            <View key={mov.codigo} style={[fnStyles.listRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={fnStyles.listRowTitle} numberOfLines={1}>
                    {mov.descricao}
                  </Text>
                  <Text style={fnStyles.listRowMeta}>
                    {formatDateIsoBR(mov.data) ?? mov.data} · {mov.posto}
                  </Text>
                </View>
                <Text style={[fnStyles.listRowValue, { color: mov.tipo === 'credito' ? '#18955A' : '#E6213D' }]}>
                  {mov.tipo === 'debito' ? '-' : ''}
                  {formatBRL(Math.abs(mov.valor))}
                </Text>
              </View>

              {mov.sugestao ? (
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
                      <Text style={fnStyles.suggestionButtonText}>Confirmar vínculo</Text>
                    )}
                  </Pressable>
                </View>
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
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
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
            {String(mes).padStart(2, '0')}/{ano}
          </Text>
          <Pressable onPress={handleMesProximo} style={fnStyles.monthNavButton}>
            <Feather name="chevron-right" size={18} color="#5E667D" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {financeiroJanelaOptions.map((opt) => {
              const isActive = janela === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[fnStyles.filterPill, isActive ? fnStyles.filterPillActive : null]}
                  onPress={() => setJanela(opt.value)}
                >
                  <Text style={[fnStyles.filterPillText, isActive ? fnStyles.filterPillTextActive : null]}>{opt.label}</Text>
                </Pressable>
              );
            })}
            <Pressable
              style={[fnStyles.filterPill, apuracaoCaixa ? fnStyles.filterPillActive : null]}
              onPress={() => setApuracaoCaixa((v) => !v)}
            >
              <Text style={[fnStyles.filterPillText, apuracaoCaixa ? fnStyles.filterPillTextActive : null]}>
                Regime de caixa
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />

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

        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />

        <Pressable
          style={[fnStyles.filterPill, mostrarRespondidos ? fnStyles.filterPillActive : null, { alignSelf: 'flex-start', marginBottom: 12 }]}
          onPress={() => setMostrarRespondidos((v) => !v)}
        >
          <Text style={[fnStyles.filterPillText, mostrarRespondidos ? fnStyles.filterPillTextActive : null]}>
            {mostrarRespondidos ? 'Mostrando respondidos' : 'Mostrar respondidos'}
          </Text>
        </Pressable>

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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={fnStyles.listRowTitle} numberOfLines={1}>
                  {item.fornecedor_nome}
                </Text>
                <View style={[fnStyles.badge, { backgroundColor: '#EDE7FB' }]}>
                  <Text style={[fnStyles.badgeText, { color: '#5B3EBF' }]}>{Math.round(item.confianca * 100)}% confiança</Text>
                </View>
              </View>
              <Text style={fnStyles.listRowMeta}>{item.mensagem}</Text>
              <Text style={fnStyles.listRowMeta}>
                {item.posto} · {item.tipo} · Competência {item.competencia} · {item.periodicidade}
              </Text>
              {item.detalhe ? <Text style={fnStyles.listRowMeta}>{item.detalhe}</Text> : null}
              <Text style={[fnStyles.listRowValue, { marginTop: 6 }]}>{formatBRL(item.valor_esperado)}</Text>

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
    </SafeAreaView>
  );
}

export function FinanceiroProjecoesScreen({ navigation }: ScreenProps<'FinanceiroProjecoes'>) {
  const [data, setData] = useState<FinanceiroProjecoesData | null>(null);
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [horizonteMeses, setHorizonteMeses] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[3, 6, 12].map((n) => {
              const isActive = horizonteMeses === n;
              return (
                <Pressable
                  key={n}
                  style={[fnStyles.filterPill, isActive ? fnStyles.filterPillActive : null]}
                  onPress={() => setHorizonteMeses(n)}
                >
                  <Text style={[fnStyles.filterPillText, isActive ? fnStyles.filterPillTextActive : null]}>{n} meses</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : !data ? (
          <FinanceiroEmptyState message="Sem dados de projeção." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                <Text style={fnStyles.kpiLabel}>Saldo atual</Text>
                <Text style={fnStyles.kpiValue}>{formatBRL(data.saldoInicial)}</Text>
              </View>
              <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '45%' }]}>
                <Text style={fnStyles.kpiLabel}>Média mensal recebido</Text>
                <Text style={[fnStyles.kpiValue, { color: '#18955A' }]}>{formatBRL(data.mediaReceber)}</Text>
              </View>
              <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '100%' }]}>
                <Text style={fnStyles.kpiLabel}>Média mensal pago</Text>
                <Text style={[fnStyles.kpiValue, { color: '#E6213D' }]}>{formatBRL(data.mediaPagar)}</Text>
              </View>
            </View>

            {data.meses.map((mesItem) => (
              <View key={mesItem.mes} style={fnStyles.dreCard}>
                <Text style={fnStyles.sectionTitle}>{mesItem.label}</Text>
                {mesItem.alerta ? (
                  <View style={[fnStyles.badge, { alignSelf: 'flex-start', backgroundColor: '#FBE7E9', marginBottom: 8 }]}>
                    <Text style={[fnStyles.badgeText, { color: '#E6213D' }]}>{mesItem.alerta}</Text>
                  </View>
                ) : null}
                <View style={fnStyles.dreLine}>
                  <Text style={fnStyles.dreLineLabel}>A receber previsto</Text>
                  <Text style={[fnStyles.dreLineValue, { color: '#18955A' }]}>{formatBRL(mesItem.receberPrevisto)}</Text>
                </View>
                <View style={fnStyles.dreLine}>
                  <Text style={fnStyles.dreLineLabel}>A pagar previsto</Text>
                  <Text style={[fnStyles.dreLineValue, { color: '#E6213D' }]}>{formatBRL(mesItem.pagarPrevisto)}</Text>
                </View>
                <View style={fnStyles.dreLine}>
                  <Text style={fnStyles.dreLineLabel}>Resultado do mês</Text>
                  <Text style={[fnStyles.dreLineValue, { color: mesItem.resultado >= 0 ? '#18955A' : '#E6213D' }]}>
                    {formatBRL(mesItem.resultado)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '30%' }]}>
                    <Text style={fnStyles.kpiLabel}>Pessimista</Text>
                    <Text style={[fnStyles.kpiValue, { fontSize: 14, color: mesItem.saldoPessimista >= 0 ? '#0C1736' : '#E6213D' }]}>
                      {formatBRL(mesItem.saldoPessimista)}
                    </Text>
                  </View>
                  <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '30%' }]}>
                    <Text style={fnStyles.kpiLabel}>Base</Text>
                    <Text style={[fnStyles.kpiValue, { fontSize: 14 }]}>{formatBRL(mesItem.saldoBase)}</Text>
                  </View>
                  <View style={[fnStyles.kpiCard, { flexGrow: 1, minWidth: '30%' }]}>
                    <Text style={fnStyles.kpiLabel}>Otimista</Text>
                    <Text style={[fnStyles.kpiValue, { fontSize: 14, color: '#18955A' }]}>{formatBRL(mesItem.saldoOtimista)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {financeiroRelatorioTipos.map((opt) => {
              const isActive = tipo === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[fnStyles.filterPill, isActive ? fnStyles.filterPillActive : null]}
                  onPress={() => setTipo(opt.value)}
                >
                  <Text style={[fnStyles.filterPillText, isActive ? fnStyles.filterPillTextActive : null]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <FinanceiroPostoFilterRow postos={postos} selected={postoSelecionado} onSelect={setPostoSelecionado} />

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
  kpiLabel: {
    color: '#8A5A2B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
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
});
