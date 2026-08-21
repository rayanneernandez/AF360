import { useCallback, useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles, TopBar, financeiroUser, financeiroUserInitials } from './App';
import type { ScreenProps } from './App';
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
function FinanceiroPostoFilterRow({
  postos,
  selected,
  onSelect,
}: {
  postos: FinanceiroPostoConfig[];
  selected: string | null;
  onSelect: (empresaCodigo: string | null) => void;
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
          const value = String(posto.empresa_codigo);
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
    fetchFinanceiroContasBancarias({ posto: postoSelecionado ?? undefined, busca: busca.trim() || undefined })
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
  { label: 'Últimos 3 meses', value: '3m' },
  { label: 'Últimos 6 meses', value: '6m' },
  { label: 'Últimos 12 meses', value: '12m' },
];

function FinanceiroFornecedorDetalheModal({
  fornecedorCodigo,
  periodo,
  onClose,
}: {
  fornecedorCodigo: string | null;
  periodo: string;
  onClose: () => void;
}) {
  const [detalhe, setDetalhe] = useState<FinanceiroFornecedorItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!fornecedorCodigo) return;
    setIsLoading(true);
    setDetalhe(null);
    fetchFinanceiroFornecedorDetalhe(fornecedorCodigo, { periodo })
      .then(setDetalhe)
      .catch(() => setDetalhe(null))
      .finally(() => setIsLoading(false));
  }, [fornecedorCodigo, periodo]);

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
  const [periodo, setPeriodo] = useState('3m');
  const [selecionadoCodigo, setSelecionadoCodigo] = useState<string | null>(null);

  useEffect(() => {
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch(() => setPostos([]));
  }, []);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroFornecedores({ periodo, posto: postoSelecionado ?? undefined, busca: busca.trim() || undefined })
      .then(setItens)
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar os fornecedores.')))
      .finally(() => setIsLoading(false));
  }, [periodo, postoSelecionado, busca]);

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
        periodo={periodo}
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
    fetchFinanceiroDashboard({ posto: postoSelecionado ?? undefined })
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
    fetchFinanceiroContas({ tipo, periodo, posto: postoSelecionado ?? undefined, busca: busca.trim() || undefined })
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
    fetchFinanceiroContas({ tipo, periodo, posto: postoSelecionado ?? undefined, busca: busca.trim() || undefined, ultimoCodigo })
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
  const [periodo, setPeriodo] = useState<'dia' | 'mes' | 'ano'>('mes');
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
    fetchFinanceiroFluxoCaixa({ periodo, posto: postoSelecionado ?? undefined })
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
            {(['dia', 'mes', 'ano'] as const).map((opt) => {
              const isActive = periodo === opt;
              const label = opt === 'dia' ? 'Hoje' : opt === 'mes' ? 'Este mês' : 'Este ano';
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
    fetchFinanceiroConciliacao({ aba, posto: postoSelecionado ?? undefined, busca: busca.trim() || undefined })
      .then((result) => {
        setMovimentos(result.movimentos);
        setResumo(result.resumo);
      })
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar a conciliação.')))
      .finally(() => setIsLoading(false));
  }, [aba, postoSelecionado, busca]);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

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

        <Text style={fnStyles.countLabel}>{movimentos.length} movimento(s)</Text>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : movimentos.length === 0 ? (
          <FinanceiroEmptyState message="Nenhum movimento encontrado nesta aba." />
        ) : (
          movimentos.map((mov) => (
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
    fetchFinanceiroBalancete({ mes, ano, janela, posto: postoSelecionado ?? undefined, apuracaoCaixa })
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
    fetchFinanceiroIaPredicoes({ posto: postoSelecionado ?? undefined, mostrarRespondidos })
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
    fetchFinanceiroProjecoes({ posto: postoSelecionado ?? undefined, horizonteMeses })
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
    fetchFinanceiroRelatorio<Record<string, unknown>>({ tipo, posto: postoSelecionado ?? undefined })
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

export function FinanceiroNotificationsScreen({ navigation }: ScreenProps<'FinanceiroNotifications'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="bell"
      title="Notificações"
      subtitle="Envio de notificações via App, E-mail e WhatsApp."
      pendingMessage="Aguardando a Lovable confirmar se as rotinas/templates de notificação do módulo Financeiro usam o mesmo endpoint já usado por RH/Diretoria (só filtrando por módulo) ou uma tabela própria."
    />
  );
}

export function FinanceiroConfiguracoesScreen({ navigation }: ScreenProps<'FinanceiroConfiguracoes'>) {
  const [postos, setPostos] = useState<FinanceiroPostoConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchFinanceiroConfig()
      .then((result) => setPostos(result.postos))
      .catch((err) => setErrorMessage(showFinanceiroError(err, 'Não foi possível carregar as configurações.')))
      .finally(() => setIsLoading(false));
  }, []);

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

        <View style={fnStyles.suggestionBox}>
          <Text style={fnStyles.suggestionText}>
            A lista de postos e a chave de integração abaixo já vem do banco real (fin_dre_chaves). Editar ou cadastrar um
            posto aqui ainda depende de a Lovable confirmar o formato exato de escrita — assim que confirmado, os botões de
            editar/adicionar são ativados.
          </Text>
        </View>

        <Text style={fnStyles.countLabel}>{postos.length} posto(s) configurado(s)</Text>

        {isLoading ? (
          <ActivityIndicator color="#C05621" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <FinanceiroEmptyState message={errorMessage} />
        ) : postos.length === 0 ? (
          <FinanceiroEmptyState message="Nenhum posto configurado ainda." />
        ) : (
          postos.map((posto) => (
            <View key={posto.id} style={fnStyles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={fnStyles.listRowTitle} numberOfLines={1}>
                  {posto.nome}
                </Text>
                <Text style={fnStyles.listRowMeta}>
                  Empresa {posto.empresa_codigo}
                  {posto.idq ? ` · IDQ ${posto.idq}` : ''}
                </Text>
                <Text style={fnStyles.listRowMeta}>
                  {posto.chave ? 'Chave de integração configurada' : 'Sem chave de integração'}
                </Text>
              </View>
              <View style={[fnStyles.badge, { backgroundColor: posto.ativo ? '#E3F5EA' : '#FBE7E9' }]}>
                <Text style={[fnStyles.badgeText, { color: posto.ativo ? '#18955A' : '#E6213D' }]}>
                  {posto.ativo ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
