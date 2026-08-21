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
  type FinanceiroCentroCustoItem,
  type FinanceiroContaBancaria,
  type FinanceiroFornecedorItem,
  type FinanceiroPostoConfig,
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
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="grid"
      title="Dashboard"
      subtitle="Contas a receber, contas a pagar, saldo e projeções da rede."
      pendingMessage="Aguardando a Lovable confirmar a origem dos KPIs (contas a receber/pagar do dia, saldo) e dos gráficos de curva financeira e projeção, pra ligar este dashboard ao banco real."
    />
  );
}

export function FinanceiroContasAPagarScreen({ navigation }: ScreenProps<'FinanceiroContasAPagar'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="arrow-down-circle"
      title="Contas a Pagar"
      subtitle="Títulos a pagar por vencimento, fornecedor e centro de custo."
      pendingMessage="Aguardando a Lovable confirmar a tabela real de contas a pagar (nome e campos exatos: fornecedor, posto, centro de custo, status, valor, vencimento)."
    />
  );
}

export function FinanceiroContasAReceberScreen({ navigation }: ScreenProps<'FinanceiroContasAReceber'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="arrow-up-circle"
      title="Contas a Receber"
      subtitle="Recebíveis por vencimento, cliente e posto."
      pendingMessage="Aguardando a Lovable confirmar a tabela real de contas a receber (cliente, categoria, status, valor, vencimento)."
    />
  );
}

export function FinanceiroFluxoCaixaScreen({ navigation }: ScreenProps<'FinanceiroFluxoCaixa'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="file"
      title="Fluxo de Caixa"
      subtitle="Entradas, saídas e saldo diário consolidado da rede."
      pendingMessage="Aguardando a Lovable confirmar a tabela de movimentações bancárias e como o saldo atual por conta é calculado."
    />
  );
}

export function FinanceiroConciliacaoScreen({ navigation }: ScreenProps<'FinanceiroConciliacao'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="archive"
      title="Conciliação"
      subtitle="Conciliação bancária entre extratos e lançamentos do sistema."
      pendingMessage="Aguardando a Lovable confirmar a tabela de movimentos do extrato, como a 'sugestão' de vínculo é calculada e o endpoint de vincular manualmente."
    />
  );
}

export function FinanceiroBalanceteDreScreen({ navigation }: ScreenProps<'FinanceiroBalanceteDre'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="bar-chart-2"
      title="Balancete / DRE"
      subtitle="Entradas, saídas e resultado — mês a mês, por posto ou rede toda."
      pendingMessage="Aguardando a Lovable descrever o formato real do balancete/DRE (linhas, colunas, regime de caixa vs. competência)."
    />
  );
}

export function FinanceiroInteligenciaIAScreen({ navigation }: ScreenProps<'FinanceiroInteligenciaIA'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="zap"
      title="Inteligência IA"
      subtitle="Lançamentos previstos pela IA a partir do histórico de cada posto."
      pendingMessage="Aguardando a Lovable confirmar como as sugestões são geradas (job periódico ou RPC sob demanda) e os endpoints de confirmar/descartar uma sugestão."
    />
  );
}

export function FinanceiroProjecoesScreen({ navigation }: ScreenProps<'FinanceiroProjecoes'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="trending-up"
      title="Projeções"
      subtitle="Faturamento e pagamentos projetados para os próximos meses."
      pendingMessage="Aguardando a Lovable confirmar a view/RPC de projeção de caixa (parâmetros de posto e horizonte em meses)."
    />
  );
}

export function FinanceiroRelatoriosScreen({ navigation }: ScreenProps<'FinanceiroRelatorios'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="file-text"
      title="Relatórios"
      subtitle="Relatórios financeiros e exportações por período."
      pendingMessage="Aguardando a integração das telas de Contas a Pagar/Receber, Conciliação, Fornecedores e Centros de Custo pra gerar os 4 relatórios (Excel/PDF) a partir dos dados reais."
    />
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
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="settings"
      title="Configurações"
      subtitle="Parâmetros do módulo Financeiro e integrações."
      pendingMessage="Aguardando a Lovable confirmar se a chave de integração Quality e os postos vinculados são os mesmos já usados em RH/Diretoria ou uma configuração própria do Financeiro."
    />
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
