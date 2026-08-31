import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';
import {
  styles,
  TopBar,
  administrativoUser,
  administrativoUserInitials,
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
  fetchAdministrativoDashboard,
  fetchRhUnidades,
  fetchAdministrativoLicencas,
  createAdministrativoLicenca,
  updateAdministrativoLicenca,
  deleteAdministrativoLicenca,
  fetchAdministrativoChamados,
  createAdministrativoChamado,
  updateAdministrativoChamadoStatus,
  fetchAdministrativoInsumos,
  fetchAdministrativoSolicitacoes,
  createAdministrativoSolicitacao,
  fetchAdministrativoFrota,
  updateAdministrativoVeiculo,
  createAdministrativoFrotaEvento,
  fetchAdministrativoFrotaEventos,
  fetchAdministrativoNotifRotinas,
  createAdministrativoNotifRotina,
  updateAdministrativoNotifRotina,
  deleteAdministrativoNotifRotina,
  executarAdministrativoNotifRotina,
  fetchAdministrativoNotifTemplates,
  createAdministrativoNotifTemplate,
  updateAdministrativoNotifTemplate,
  deleteAdministrativoNotifTemplate,
  type AdministrativoDashboardData,
  type AdministrativoLicencaItem,
  type AdministrativoChamadoItem,
  type AdministrativoChamadoStatus,
  type AdministrativoInsumoItem,
  type AdministrativoSolicitacaoItem,
  type AdministrativoVeiculoItem,
  type AdministrativoFrotaEventoItem,
  type AdministrativoFrotaEventoTipo,
  type AdministrativoNotifRotinaItem,
  type AdministrativoNotifTemplateItem,
  type AdministrativoNotifPublicoTipo,
  type RhUnidadeItem,
} from './api';

// --- Helpers genéricos (mesmo padrão do Gestao.tsx/Financeiro.tsx) ---

function formatBRL(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumeroBR(value: number | null | undefined, decimais = 0): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
}

function showAdmError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  return message || fallback;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const admMesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function admPeriodoDatas(periodo: 'mes' | 'ano', refMes: number, refAno: number): { dataInicial: string; dataFinal: string } {
  if (periodo === 'ano') {
    return { dataInicial: `${refAno}-01-01`, dataFinal: `${refAno}-12-31` };
  }
  const inicio = new Date(refAno, refMes - 1, 1);
  const fim = new Date(refAno, refMes, 0);
  return { dataInicial: toIsoDate(inicio), dataFinal: toIsoDate(fim) };
}

function useAdmPeriodoNav() {
  const now = new Date();
  const [periodo, setPeriodo] = useState<'mes' | 'ano'>('mes');
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
  const handleReset = () => {
    const today = new Date();
    setRefMes(today.getMonth() + 1);
    setRefAno(today.getFullYear());
  };

  return { periodo, setPeriodo, refMes, refAno, handleAnterior, handleProximo, handleReset };
}

function AdmPeriodoFiltro({
  periodo,
  onChangePeriodo,
  refMes,
  refAno,
  onAnterior,
  onProximo,
  onReset,
}: {
  periodo: 'mes' | 'ano';
  onChangePeriodo: (p: 'mes' | 'ano') => void;
  refMes: number;
  refAno: number;
  onAnterior: () => void;
  onProximo: () => void;
  onReset: () => void;
}) {
  const periodoLabel = periodo === 'ano' ? String(refAno) : `${admMesesNomes[refMes - 1]} / ${refAno}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <View style={adStyles.periodoSegmentRow}>
        {(['mes', 'ano'] as const).map((opt) => {
          const isActive = periodo === opt;
          return (
            <Pressable
              key={opt}
              style={[adStyles.periodoSegmentButton, isActive ? adStyles.periodoSegmentButtonActive : null]}
              onPress={() => onChangePeriodo(opt)}
            >
              <Text style={[adStyles.periodoSegmentText, isActive ? adStyles.periodoSegmentTextActive : null]}>
                {opt === 'mes' ? 'Mês' : 'Ano'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={onAnterior} style={adStyles.monthNavButton}>
        <Feather name="chevron-left" size={16} color="#5E667D" />
      </Pressable>
      <Text style={adStyles.monthLabel} numberOfLines={1}>
        {periodoLabel}
      </Text>
      <Pressable onPress={onProximo} style={adStyles.monthNavButton}>
        <Feather name="chevron-right" size={16} color="#5E667D" />
      </Pressable>
      <Pressable onPress={onReset} style={adStyles.monthNavButton}>
        <Feather name="rotate-ccw" size={14} color="#5E667D" />
      </Pressable>
    </View>
  );
}

// Postos pro seletor "Rede toda" — reaproveita fetchRhUnidades (tabela
// `empresas` no Supabase do Lovable), o mesmo id (`empresas.id`) que o
// contrato do Administrativo usa em `postoIds`.
function useAdmPostos() {
  const [postos, setPostos] = useState<RhUnidadeItem[]>([]);
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [postoModalOpen, setPostoModalOpen] = useState(false);

  useEffect(() => {
    fetchRhUnidades()
      .then(setPostos)
      .catch(() => setPostos([]));
  }, []);

  const postoLabel = postoSelecionado ? postos.find((p) => p.id === postoSelecionado)?.nome ?? 'Posto' : 'Rede toda';
  const postoOptions = useMemo(
    () => [{ value: null as string | null, label: 'Rede toda' }, ...postos.map((p) => ({ value: p.id, label: p.nome }))],
    [postos]
  );

  return { postos, postoSelecionado, setPostoSelecionado, postoModalOpen, setPostoModalOpen, postoLabel, postoOptions };
}

function AdmPageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={adStyles.pageHeaderRow}>
      <View style={adStyles.pageHeaderIconShell}>
        <Feather name={icon} size={20} color="#0F8B8D" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={adStyles.pageHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={adStyles.pageHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function AdmEmptyState({ message }: { message: string }) {
  return (
    <View style={adStyles.emptyCard}>
      <Text style={adStyles.emptyText}>{message}</Text>
    </View>
  );
}

function AdmSearchInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={adStyles.searchRow}>
      <Feather name="search" size={15} color="#8A93A8" />
      <TextInput
        style={adStyles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8A93A8"
      />
    </View>
  );
}

function AdmModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={adStyles.modalBackdrop} onPress={onClose}>
        <Pressable style={[adStyles.modalCard, { maxHeight: '86%' }]} onPress={() => {}}>
          <View style={adStyles.modalHeader}>
            <Text style={adStyles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Mesma ideia do AdmSelectModal, mas sem abrir um <Modal> aninhado — usado
// dentro de formulários que já estão dentro de um AdmModal (dois <Modal>
// nativos abertos ao mesmo tempo não recebem toque de forma confiável).
function AdmInlineSelect<T extends string | null>({
  label,
  options,
  selectedValue,
  onSelect,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  selectedValue: T;
  onSelect: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable style={adStyles.selectButton} onPress={() => setOpen((o) => !o)}>
        <Text style={adStyles.selectButtonText} numberOfLines={1}>
          {label}
        </Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5E667D" />
      </Pressable>
      {open ? (
        <View style={adStyles.statusMenu}>
          {options.map((opt) => (
            <Pressable
              key={opt.label}
              style={adStyles.statusMenuItem}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <Text style={[adStyles.statusMenuItemText, selectedValue === opt.value ? { color: '#0F8B8D', fontWeight: '800' } : null]}>
                {opt.label}
              </Text>
              {selectedValue === opt.value ? <Feather name="check" size={14} color="#0F8B8D" style={{ marginLeft: 'auto' }} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function AdmFormLabel({ children }: { children: React.ReactNode }) {
  return <Text style={adStyles.formLabel}>{children}</Text>;
}

// --- Dropdown de seleção única (status/prioridade/categoria), mesmo padrão
// visual do "Todos os status ▾" do painel web: um botão que abre uma lista
// com check na opção selecionada; escolher já fecha o modal. ---

function AdmSelectButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={adStyles.selectButton} onPress={onPress}>
      <Text style={adStyles.selectButtonText} numberOfLines={1}>
        {label}
      </Text>
      <Feather name="chevron-down" size={16} color="#5E667D" />
    </Pressable>
  );
}

function AdmSelectModal<T extends string | null>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Array<{ value: T; label: string }>;
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={adStyles.modalBackdrop} onPress={onClose}>
        <Pressable style={[adStyles.modalCard, { maxHeight: '70%' }]} onPress={() => {}}>
          <View style={adStyles.modalHeader}>
            <Text style={adStyles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <Pressable
                key={opt.label}
                style={adStyles.filterOptionRow}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <Text
                  style={[adStyles.filterOptionRowText, selectedValue === opt.value ? adStyles.filterOptionRowTextActive : null]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
                {selectedValue === opt.value ? <Feather name="check" size={16} color="#0F8B8D" /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// --- 1. Dashboard ---

const CHAMADO_STATUS_COLORS: Record<string, string> = {
  aberto: '#E0435B',
  em_andamento: '#3E92CC',
  aguardando_peca: '#E8A33D',
  concluido: '#2FB170',
  cancelado: '#9AA3B5',
};

function pickInsumoField(item: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return null;
}

export function AdministrativoDashboardScreen({ navigation }: ScreenProps<'AdministrativoDashboard'>) {
  const { periodo, setPeriodo, refMes, refAno, handleAnterior, handleProximo, handleReset } = useAdmPeriodoNav();
  const { postoSelecionado, setPostoSelecionado, postoModalOpen, setPostoModalOpen, postoLabel, postoOptions } = useAdmPostos();
  const [data, setData] = useState<AdministrativoDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedStatusIdx, setSelectedStatusIdx] = useState<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const { dataInicial, dataFinal } = admPeriodoDatas(periodo, refMes, refAno);
    fetchAdministrativoDashboard({ dataInicial, dataFinal, postoIds: postoSelecionado ? [postoSelecionado] : undefined })
      .then(setData)
      .catch((err) => setErrorMessage(showAdmError(err, 'Não foi possível carregar o dashboard.')))
      .finally(() => setIsLoading(false));
  }, [periodo, refMes, refAno, postoSelecionado]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={administrativoUserInitials}
          variant="administrativo"
          onAvatarPress={() => navigation.navigate('AdministrativoProfile')}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdmPageHeader icon="grid" title="Dashboard" subtitle="Visão consolidada de alvarás, manutenções, almoxarifado e frota." />

        <AdmPeriodoFiltro
          periodo={periodo}
          onChangePeriodo={setPeriodo}
          refMes={refMes}
          refAno={refAno}
          onAnterior={handleAnterior}
          onProximo={handleProximo}
          onReset={handleReset}
        />
        <AdmSelectButton label={postoLabel} onPress={() => setPostoModalOpen(true)} />
        <View style={{ height: 12 }} />

        {isLoading ? (
          <ActivityIndicator color="#0F8B8D" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <AdmEmptyState message={errorMessage} />
        ) : !data ? (
          <AdmEmptyState message="Sem dados disponíveis." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
              <View style={[adStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={adStyles.kpiLabel}>Alvarás a vencer (30 dias)</Text>
                <Text style={adStyles.kpiValue}>{formatNumeroBR(data.kpis.alvaras_a_vencer)}</Text>
                <Text style={adStyles.kpiLabelUnidade}>{formatNumeroBR(data.kpis.alvaras_vencidos)} já vencido(s)</Text>
              </View>
              <View style={[adStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={adStyles.kpiLabel}>Chamados abertos</Text>
                <Text style={adStyles.kpiValue}>{formatNumeroBR(data.kpis.chamados_abertos)}</Text>
                <Text style={adStyles.kpiLabelUnidade}>de {formatNumeroBR(data.kpis.chamados_total)} chamados registrados</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={[adStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={adStyles.kpiLabel}>Estoque crítico</Text>
                <Text style={adStyles.kpiValue}>{formatNumeroBR(data.kpis.insumos_criticos)}</Text>
                <Text style={adStyles.kpiLabelUnidade}>de {formatNumeroBR(data.kpis.insumos_total)} itens no almoxarifado</Text>
              </View>
              <View style={[adStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={adStyles.kpiLabel}>Veículos em oficina</Text>
                <Text style={adStyles.kpiValue}>{formatNumeroBR(data.kpis.veiculos_oficina)}</Text>
                <Text style={adStyles.kpiLabelUnidade}>de {formatNumeroBR(data.kpis.veiculos_total)} veículos da frota</Text>
              </View>
            </View>

            <View style={adStyles.chartCard}>
              <Text style={adStyles.sectionTitle}>Status dos chamados de manutenção</Text>
              <Text style={[adStyles.listRowMeta, { marginTop: -4, marginBottom: 10 }]}>Distribuição dos chamados por situação</Text>
              {data.chamados_por_status.length === 0 || data.chamados_por_status.every((s) => s.total === 0) ? (
                <AdmEmptyState message="Nenhum chamado registrado." />
              ) : (
                <>
                  <View style={{ alignItems: 'center', marginVertical: 8 }}>
                    <PieChart
                      data={data.chamados_por_status.map((item) => ({
                        value: item.total,
                        color: CHAMADO_STATUS_COLORS[item.status] ?? '#9AA3B5',
                        text: item.label,
                      }))}
                      donut
                      radius={78}
                      innerRadius={48}
                      focusOnPress
                      toggleFocusOnPress
                      onPress={(_item: unknown, index: number) => setSelectedStatusIdx((current) => (current === index ? null : index))}
                      centerLabelComponent={() => {
                        const selected = selectedStatusIdx != null ? data.chamados_por_status[selectedStatusIdx] : null;
                        if (selected) {
                          return (
                            <View style={{ alignItems: 'center', maxWidth: 90 }}>
                              <Text style={adStyles.pieCenterValue}>{formatNumeroBR(selected.total)}</Text>
                              <Text style={adStyles.pieCenterLabel} numberOfLines={2}>
                                {selected.label}
                              </Text>
                            </View>
                          );
                        }
                        const total = data.chamados_por_status.reduce((sum, item) => sum + item.total, 0);
                        return (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={adStyles.pieCenterValue}>{formatNumeroBR(total)}</Text>
                            <Text style={adStyles.pieCenterLabel}>Total</Text>
                          </View>
                        );
                      }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 4 }}>
                    {data.chamados_por_status.map((item, idx) => (
                      <Pressable
                        key={item.status}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        onPress={() => setSelectedStatusIdx((current) => (current === idx ? null : idx))}
                      >
                        <View
                          style={[adStyles.legendDot, { backgroundColor: CHAMADO_STATUS_COLORS[item.status] ?? '#9AA3B5' }]}
                        />
                        <Text style={[adStyles.listRowMeta, selectedStatusIdx === idx ? { color: '#0C1736', fontWeight: '800' } : null]}>
                          {item.label} ({formatNumeroBR(item.total)})
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </View>

            <Text style={adStyles.sectionTitle}>Licenças próximas do vencimento</Text>
            {data.licencas_criticas.length === 0 ? (
              <AdmEmptyState message="Nenhuma licença próxima do vencimento." />
            ) : (
              data.licencas_criticas.map((item) => (
                <View key={item.id} style={adStyles.dreCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[adStyles.listRowTitle, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
                      {item.documento}
                    </Text>
                    <View
                      style={[
                        adStyles.badge,
                        item.status === 'vencido'
                          ? { backgroundColor: '#FBE4E7' }
                          : item.status === 'proximo'
                          ? { backgroundColor: '#FEF3D6' }
                          : { backgroundColor: '#E3F4F4' },
                      ]}
                    >
                      <Text
                        style={[
                          adStyles.badgeText,
                          item.status === 'vencido'
                            ? { color: '#C2263A' }
                            : item.status === 'proximo'
                            ? { color: '#8A6D1D' }
                            : { color: '#0F8B8D' },
                        ]}
                      >
                        {item.status_label}
                      </Text>
                    </View>
                  </View>
                  <Text style={adStyles.listRowMeta}>{item.posto_nome ?? 'Rede toda'}</Text>
                  <Text style={adStyles.listRowMeta}>Vencimento: {item.vencimento}</Text>
                </View>
              ))
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={adStyles.sectionTitle}>Últimos pedidos de insumos pendentes</Text>
                <Text style={[adStyles.listRowMeta, { marginTop: -6 }]}>Solicitações em aberto no período selecionado</Text>
              </View>
              <Text style={adStyles.countBadgeNumber}>{data.solicitacoes_pendentes.length}</Text>
            </View>
            {data.solicitacoes_pendentes.length === 0 ? (
              <AdmEmptyState message="Nenhum pedido pendente no período." />
            ) : (
              data.solicitacoes_pendentes.map((rawItem, idx) => {
                const item = rawItem as Record<string, unknown>;
                const insumoNome = pickInsumoField(item, ['insumo_nome', 'nome', 'item_nome', 'insumo']) ?? 'Insumo';
                const postoNome = pickInsumoField(item, ['posto_nome', 'posto']) ?? 'Rede toda';
                const quantidade = pickInsumoField(item, ['quantidade', 'qtde', 'qtd']);
                const observacao = pickInsumoField(item, ['observacao']);
                return (
                  <View key={pickInsumoField(item, ['id']) ?? idx} style={adStyles.dreCard}>
                    <Text style={adStyles.listRowTitle} numberOfLines={1}>
                      {insumoNome}
                    </Text>
                    <Text style={adStyles.listRowMeta}>
                      {postoNome}
                      {quantidade ? ` · ${quantidade}` : ''}
                    </Text>
                    {observacao ? (
                      <Text style={[adStyles.listRowMeta, { marginTop: 2 }]} numberOfLines={2}>
                        {observacao}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <AdmSelectModal
        visible={postoModalOpen}
        title="Posto"
        options={postoOptions}
        selectedValue={postoSelecionado}
        onSelect={setPostoSelecionado}
        onClose={() => setPostoModalOpen(false)}
      />
    </SafeAreaView>
  );
}

// --- 2. Alvarás e Licenças ---

const LICENCA_STATUS_OPTIONS: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'Todos os status' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'proximo', label: 'Próximos (30 dias)' },
  { value: 'regular', label: 'Regulares' },
];

export function AdministrativoLicencasScreen({ navigation }: ScreenProps<'AdministrativoLicencas'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [items, setItems] = useState<AdministrativoLicencaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDocumento, setFormDocumento] = useState('');
  const [formNumero, setFormNumero] = useState('');
  const [formOrgao, setFormOrgao] = useState('');
  const [formVencimento, setFormVencimento] = useState('');
  const [formObservacao, setFormObservacao] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchAdministrativoLicencas({ busca: busca || undefined, status: statusFiltro ?? undefined })
      .then(setItems)
      .catch((err) => setErrorMessage(showAdmError(err, 'Não foi possível carregar as licenças.')))
      .finally(() => setIsLoading(false));
  }, [busca, statusFiltro]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setFormDocumento('');
    setFormNumero('');
    setFormOrgao('');
    setFormVencimento('');
    setFormObservacao('');
  };

  const handleSalvar = () => {
    if (!formDocumento.trim() || !formOrgao.trim() || !formVencimento.trim()) {
      Alert.alert('Campos obrigatórios', 'Documento, órgão e vencimento são obrigatórios.');
      return;
    }
    setIsSaving(true);
    createAdministrativoLicenca(
      {
        documento: formDocumento.trim(),
        orgao: formOrgao.trim(),
        vencimento: formVencimento.trim(),
        numero: formNumero.trim() || undefined,
        observacao: formObservacao.trim() || undefined,
      },
      actorId
    )
      .then(() => {
        setIsFormOpen(false);
        resetForm();
        load();
      })
      .catch((err) => Alert.alert('Erro', showAdmError(err, 'Não foi possível salvar a licença.')))
      .finally(() => setIsSaving(false));
  };

  const handleExcluir = (item: AdministrativoLicencaItem) => {
    Alert.alert('Excluir licença', `Tem certeza que deseja excluir "${item.documento}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAdministrativoLicenca(item.id, actorId)
            .then(() => load())
            .catch((err) => Alert.alert('Erro', showAdmError(err, 'Não foi possível excluir a licença.')));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={administrativoUserInitials}
          variant="administrativo"
          onAvatarPress={() => navigation.navigate('AdministrativoProfile')}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdmPageHeader icon="file-text" title="Alvarás e Licenças" subtitle="Documentos regulatórios da rede e seus vencimentos." />

        <AdmSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar por documento, órgão ou posto" />

        <AdmSelectButton
          label={LICENCA_STATUS_OPTIONS.find((o) => o.value === statusFiltro)?.label ?? 'Todos os status'}
          onPress={() => setStatusModalOpen(true)}
        />

        <Pressable
          style={[adStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 12 }]}
          onPress={() => {
            resetForm();
            setIsFormOpen(true);
          }}
        >
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={adStyles.suggestionButtonText}>Nova licença</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color="#0F8B8D" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <AdmEmptyState message={errorMessage} />
        ) : items.length === 0 ? (
          <AdmEmptyState message="Nenhuma licença encontrada." />
        ) : (
          items.map((item) => (
            <View key={item.id} style={adStyles.dreCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[adStyles.listRowTitle, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
                  {item.documento} {item.numero ? `· nº ${item.numero}` : ''}
                </Text>
                <Pressable onPress={() => handleExcluir(item)} hitSlop={6}>
                  <Feather name="trash-2" size={15} color="#E6213D" />
                </Pressable>
              </View>
              <Text style={adStyles.listRowMeta}>
                {item.posto_nome ?? 'Rede toda'} · {item.orgao}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, alignItems: 'center', gap: 8 }}>
                <Text style={[adStyles.listRowMeta, { flex: 1, minWidth: 0 }]} numberOfLines={2}>
                  Vencimento: {item.vencimento}
                  {item.status === 'vencido' && item.dias_atraso != null
                    ? ` · ${item.dias_atraso} dia(s) em atraso`
                    : item.dias_restantes != null
                    ? ` · faltam ${item.dias_restantes} dia(s)`
                    : ''}
                </Text>
                <View
                  style={[
                    adStyles.badge,
                    { flexShrink: 0 },
                    item.status === 'vencido'
                      ? { backgroundColor: '#FBE4E7' }
                      : item.status === 'proximo'
                      ? { backgroundColor: '#FEF3D6' }
                      : { backgroundColor: '#E3F4F4' },
                  ]}
                >
                  <Text
                    style={[
                      adStyles.badgeText,
                      item.status === 'vencido'
                        ? { color: '#C2263A' }
                        : item.status === 'proximo'
                        ? { color: '#8A6D1D' }
                        : { color: '#0F8B8D' },
                    ]}
                  >
                    {item.status_label}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <AdmModal visible={isFormOpen} title="Nova licença" onClose={() => setIsFormOpen(false)}>
        <AdmFormLabel>Documento *</AdmFormLabel>
        <TextInput style={adStyles.formInput} value={formDocumento} onChangeText={setFormDocumento} placeholder="Licença Ambiental" />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Número</AdmFormLabel>
        <TextInput style={adStyles.formInput} value={formNumero} onChangeText={setFormNumero} placeholder="LO-2024-7712" />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Órgão *</AdmFormLabel>
        <TextInput style={adStyles.formInput} value={formOrgao} onChangeText={setFormOrgao} placeholder="INEA, ANP, Bombeiros..." />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Vencimento (AAAA-MM-DD) *</AdmFormLabel>
        <TextInput style={adStyles.formInput} value={formVencimento} onChangeText={setFormVencimento} placeholder="2026-12-31" />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Observação</AdmFormLabel>
        <TextInput style={adStyles.formInput} value={formObservacao} onChangeText={setFormObservacao} placeholder="Opcional" multiline />
        <Pressable
          style={[adStyles.filterModalApplyButton, { marginTop: 18, opacity: isSaving ? 0.6 : 1 }]}
          onPress={handleSalvar}
          disabled={isSaving}
        >
          <Text style={adStyles.filterModalApplyButtonText}>{isSaving ? 'Salvando...' : 'Salvar'}</Text>
        </Pressable>
      </AdmModal>

      <AdmSelectModal
        visible={statusModalOpen}
        title="Status"
        options={LICENCA_STATUS_OPTIONS}
        selectedValue={statusFiltro}
        onSelect={setStatusFiltro}
        onClose={() => setStatusModalOpen(false)}
      />
    </SafeAreaView>
  );
}

// --- 3. Manutenções (Chamados) ---

const CHAMADO_STATUS_OPTIONS: Array<{ value: AdministrativoChamadoStatus; label: string }> = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'aguardando_peca', label: 'Aguardando peça' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

function chamadoStatusLabel(status: AdministrativoChamadoStatus): string {
  return CHAMADO_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

const CHAMADO_STATUS_FILTRO_OPTIONS: Array<{ value: AdministrativoChamadoStatus | null; label: string }> = [
  { value: null, label: 'Todos os status' },
  ...CHAMADO_STATUS_OPTIONS,
];
const CHAMADO_PRIORIDADE_OPTIONS: Array<{ value: 'alta' | 'media' | 'baixa' | null; label: string }> = [
  { value: null, label: 'Toda prioridade' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

export function AdministrativoChamadosScreen({ navigation }: ScreenProps<'AdministrativoChamados'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<AdministrativoChamadoStatus | null>(null);
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<'alta' | 'media' | 'baixa' | null>(null);
  const [statusFiltroModalOpen, setStatusFiltroModalOpen] = useState(false);
  const [prioridadeModalOpen, setPrioridadeModalOpen] = useState(false);
  const [items, setItems] = useState<AdministrativoChamadoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formLocal, setFormLocal] = useState('');
  const [formResponsavel, setFormResponsavel] = useState('');
  const [formPrioridade, setFormPrioridade] = useState<'alta' | 'media' | 'baixa'>('media');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMenuOpenId, setStatusMenuOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchAdministrativoChamados({
      busca: busca || undefined,
      status: statusFiltro ?? undefined,
      prioridade: prioridadeFiltro ?? undefined,
    })
      .then(setItems)
      .catch((err) => setErrorMessage(showAdmError(err, 'Não foi possível carregar os chamados.')))
      .finally(() => setIsLoading(false));
  }, [busca, statusFiltro, prioridadeFiltro]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAbrirChamado = () => {
    if (!formTitulo.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o título do chamado.');
      return;
    }
    setIsSaving(true);
    createAdministrativoChamado(
      {
        titulo: formTitulo.trim(),
        descricao: formDescricao.trim() || undefined,
        local: formLocal.trim() || undefined,
        prioridade: formPrioridade,
        responsavel: formResponsavel.trim() || undefined,
      },
      actorId
    )
      .then(() => {
        setIsFormOpen(false);
        setFormTitulo('');
        setFormDescricao('');
        setFormLocal('');
        setFormResponsavel('');
        setFormPrioridade('media');
        load();
      })
      .catch((err) => Alert.alert('Erro', showAdmError(err, 'Não foi possível abrir o chamado.')))
      .finally(() => setIsSaving(false));
  };

  const handleMudarStatus = (item: AdministrativoChamadoItem, status: AdministrativoChamadoStatus) => {
    setStatusMenuOpenId(null);
    updateAdministrativoChamadoStatus(item.id, status, actorId)
      .then(() => load())
      .catch((err) => Alert.alert('Erro', showAdmError(err, 'Não foi possível atualizar o status.')));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={administrativoUserInitials}
          variant="administrativo"
          onAvatarPress={() => navigation.navigate('AdministrativoProfile')}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdmPageHeader icon="tool" title="Manutenções" subtitle="Chamados de manutenção abertos pela rede." />

        <AdmSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar por protocolo, problema ou posto" />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <AdmSelectButton
              label={CHAMADO_STATUS_FILTRO_OPTIONS.find((o) => o.value === statusFiltro)?.label ?? 'Todos os status'}
              onPress={() => setStatusFiltroModalOpen(true)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AdmSelectButton
              label={CHAMADO_PRIORIDADE_OPTIONS.find((o) => o.value === prioridadeFiltro)?.label ?? 'Toda prioridade'}
              onPress={() => setPrioridadeModalOpen(true)}
            />
          </View>
        </View>

        <Pressable
          style={[adStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }]}
          onPress={() => setIsFormOpen(true)}
        >
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={adStyles.suggestionButtonText}>Abrir chamado</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color="#0F8B8D" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <AdmEmptyState message={errorMessage} />
        ) : items.length === 0 ? (
          <AdmEmptyState message="Nenhum chamado encontrado." />
        ) : (
          items.map((item, idx) => {
            const raw = item as unknown as Record<string, unknown>;
            const protocolo = pickInsumoField(raw, ['protocolo', 'numero_protocolo', 'codigo', 'numero']) ?? '—';
            const titulo =
              pickInsumoField(raw, ['titulo', 'problema', 'assunto', 'titulo_problema', 'descricao_problema']) ??
              'Chamado sem título';
            const prioridade = pickInsumoField(raw, ['prioridade', 'nivel_prioridade', 'importancia']);
            const postoNome = pickInsumoField(raw, ['posto_nome', 'posto']);
            const local = pickInsumoField(raw, ['local', 'detalhe', 'local_detalhe']);
            const descricao = pickInsumoField(raw, ['descricao', 'descricao_problema']);
            const itemKey = pickInsumoField(raw, ['id']) ?? `chamado-${idx}`;
            return (
            <View key={itemKey} style={adStyles.dreCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={adStyles.listRowMeta}>{protocolo}</Text>
                <View
                  style={[
                    adStyles.badge,
                    prioridade === 'alta'
                      ? { backgroundColor: '#FBE4E7' }
                      : prioridade === 'media'
                      ? { backgroundColor: '#FEF3D6' }
                      : { backgroundColor: '#F1F2F6' },
                  ]}
                >
                  <Text
                    style={[
                      adStyles.badgeText,
                      prioridade === 'alta'
                        ? { color: '#C2263A' }
                        : prioridade === 'media'
                        ? { color: '#8A6D1D' }
                        : { color: '#5E667D' },
                    ]}
                  >
                    {(prioridade ?? '—').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={adStyles.listRowTitle}>{titulo}</Text>
              <Text style={adStyles.listRowMeta} numberOfLines={2}>
                {[postoNome, local, descricao].filter(Boolean).join(' · ') || '—'}
              </Text>

              <Pressable
                style={[adStyles.statusDropdown, { marginTop: 10 }]}
                onPress={() => setStatusMenuOpenId(statusMenuOpenId === itemKey ? null : itemKey)}
              >
                <Text style={adStyles.statusDropdownText}>{chamadoStatusLabel(item.status)}</Text>
                <Feather name="chevron-down" size={14} color="#5E667D" />
              </Pressable>
              {statusMenuOpenId === itemKey ? (
                <View style={adStyles.statusMenu}>
                  {CHAMADO_STATUS_OPTIONS.map((opt) => (
                    <Pressable key={opt.value} style={adStyles.statusMenuItem} onPress={() => handleMudarStatus(item, opt.value)}>
                      <Text style={[adStyles.statusMenuItemText, opt.value === item.status ? { color: '#0F8B8D', fontWeight: '800' } : null]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
            );
          })
        )}
      </ScrollView>

      <AdmModal visible={isFormOpen} title="Abrir chamado" onClose={() => setIsFormOpen(false)}>
        <AdmFormLabel>Título *</AdmFormLabel>
        <TextInput
          style={adStyles.formInput}
          value={formTitulo}
          onChangeText={setFormTitulo}
          placeholder="Bomba 3 travando no bico de gasolina"
        />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Local / detalhe</AdmFormLabel>
        <TextInput style={adStyles.formInput} value={formLocal} onChangeText={setFormLocal} placeholder="Pista · Bomba 3" />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Descrição</AdmFormLabel>
        <TextInput style={adStyles.formInput} value={formDescricao} onChangeText={setFormDescricao} placeholder="Detalhes do problema" multiline />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Responsável</AdmFormLabel>
        <TextInput style={adStyles.formInput} value={formResponsavel} onChangeText={setFormResponsavel} placeholder="Opcional" />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Prioridade</AdmFormLabel>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['alta', 'media', 'baixa'] as const).map((p) => (
            <Pressable
              key={p}
              style={[adStyles.filterPill, formPrioridade === p ? adStyles.filterPillActive : null]}
              onPress={() => setFormPrioridade(p)}
            >
              <Text style={[adStyles.filterPillText, formPrioridade === p ? adStyles.filterPillTextActive : null]}>
                {p === 'alta' ? 'Alta' : p === 'media' ? 'Média' : 'Baixa'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[adStyles.filterModalApplyButton, { marginTop: 18, opacity: isSaving ? 0.6 : 1 }]}
          onPress={handleAbrirChamado}
          disabled={isSaving}
        >
          <Text style={adStyles.filterModalApplyButtonText}>{isSaving ? 'Enviando...' : 'Abrir chamado'}</Text>
        </Pressable>
      </AdmModal>

      <AdmSelectModal
        visible={statusFiltroModalOpen}
        title="Status"
        options={CHAMADO_STATUS_FILTRO_OPTIONS}
        selectedValue={statusFiltro}
        onSelect={setStatusFiltro}
        onClose={() => setStatusFiltroModalOpen(false)}
      />
      <AdmSelectModal
        visible={prioridadeModalOpen}
        title="Prioridade"
        options={CHAMADO_PRIORIDADE_OPTIONS}
        selectedValue={prioridadeFiltro}
        onSelect={setPrioridadeFiltro}
        onClose={() => setPrioridadeModalOpen(false)}
      />
    </SafeAreaView>
  );
}

// --- 4. Almoxarifado ---

const INSUMO_CATEGORIA_TODAS = { value: null as string | null, label: 'Todas as categorias' };

export function AdministrativoInsumosScreen({ navigation }: ScreenProps<'AdministrativoInsumos'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [items, setItems] = useState<AdministrativoInsumoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSolicitarModalOpen, setIsSolicitarModalOpen] = useState(false);
  const [solicitarInsumoId, setSolicitarInsumoId] = useState<string | null>(null);
  const [insumoPickerModalOpen, setInsumoPickerModalOpen] = useState(false);
  const [quantidadeInput, setQuantidadeInput] = useState('1');
  const [observacaoInput, setObservacaoInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchAdministrativoInsumos({ busca: busca || undefined, categoria: categoriaFiltro ?? undefined })
      .then(setItems)
      .catch((err) => setErrorMessage(showAdmError(err, 'Não foi possível carregar o almoxarifado.')))
      .finally(() => setIsLoading(false));
  }, [busca, categoriaFiltro]);

  useEffect(() => {
    load();
  }, [load]);

  // Lista completa (sem filtro) pro dropdown de categorias e pro seletor de
  // insumo do modal "Solicitar Suprimento" — senão, filtrar a lista visível
  // faria essas opções encolherem junto.
  const [allItems, setAllItems] = useState<AdministrativoInsumoItem[]>([]);
  useEffect(() => {
    fetchAdministrativoInsumos({})
      .then(setAllItems)
      .catch(() => setAllItems([]));
  }, []);

  const allCategorias = useMemo(() => Array.from(new Set(allItems.map((i) => i.categoria))).sort(), [allItems]);
  const categoriaOptions = useMemo(
    () => [INSUMO_CATEGORIA_TODAS, ...allCategorias.map((cat) => ({ value: cat, label: cat }))],
    [allCategorias]
  );
  const insumoOptions = useMemo(() => allItems.map((i) => ({ value: i.id as string | null, label: i.nome })), [allItems]);
  const insumoSelecionado = allItems.find((i) => i.id === solicitarInsumoId) ?? null;

  const handleAbrirSolicitar = () => {
    setSolicitarInsumoId(null);
    setQuantidadeInput('1');
    setObservacaoInput('');
    setIsSolicitarModalOpen(true);
  };

  const handleSolicitar = () => {
    if (!solicitarInsumoId) {
      Alert.alert('Selecione um item', 'Escolha o insumo que deseja solicitar.');
      return;
    }
    const quantidade = Number(quantidadeInput.replace(',', '.')) || 0;
    if (quantidade <= 0) {
      Alert.alert('Quantidade inválida', 'Informe uma quantidade maior que zero.');
      return;
    }
    setIsSaving(true);
    createAdministrativoSolicitacao(
      { insumo_id: solicitarInsumoId, quantidade, observacao: observacaoInput.trim() || undefined },
      actorId
    )
      .then(() => {
        setIsSolicitarModalOpen(false);
        Alert.alert('Solicitação enviada', `Pedido de suprimento para "${insumoSelecionado?.nome ?? 'item'}" registrado.`);
      })
      .catch((err) => Alert.alert('Erro', showAdmError(err, 'Não foi possível registrar a solicitação.')))
      .finally(() => setIsSaving(false));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={administrativoUserInitials}
          variant="administrativo"
          onAvatarPress={() => navigation.navigate('AdministrativoProfile')}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdmPageHeader icon="package" title="Almoxarifado" subtitle="Estoque de insumos (copa, limpeza, peças, escritório)." />

        <AdmSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar item" />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <AdmSelectButton
              label={categoriaOptions.find((o) => o.value === categoriaFiltro)?.label ?? 'Todas as categorias'}
              onPress={() => setCategoriaModalOpen(true)}
            />
          </View>
          <Pressable
            style={[adStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            onPress={handleAbrirSolicitar}
          >
            <Feather name="send" size={14} color="#FFFFFF" />
            <Text style={adStyles.suggestionButtonText}>Solicitar Suprimento</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#0F8B8D" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <AdmEmptyState message={errorMessage} />
        ) : items.length === 0 ? (
          <AdmEmptyState message="Nenhum item encontrado." />
        ) : (
          items.map((item) => (
            <View key={item.id} style={adStyles.dreCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[adStyles.listRowTitle, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
                  {item.nome}
                </Text>
                <View
                  style={[
                    adStyles.badge,
                    item.status === 'zerado'
                      ? { backgroundColor: '#FBE4E7' }
                      : item.status === 'atencao'
                      ? { backgroundColor: '#FEF3D6' }
                      : { backgroundColor: '#E3F4F4' },
                  ]}
                >
                  <Text
                    style={[
                      adStyles.badgeText,
                      item.status === 'zerado'
                        ? { color: '#C2263A' }
                        : item.status === 'atencao'
                        ? { color: '#8A6D1D' }
                        : { color: '#0F8B8D' },
                    ]}
                  >
                    {item.status === 'zerado' ? 'ZERADO' : item.status === 'atencao' ? 'ATENÇÃO' : 'NORMAL'}
                  </Text>
                </View>
              </View>
              <Text style={adStyles.listRowMeta}>{item.categoria}</Text>
              <Text style={[adStyles.listRowMeta, { marginTop: 6 }]}>
                {formatNumeroBR(item.quantidade)} {item.unidade}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <AdmModal visible={isSolicitarModalOpen} title="Solicitar Suprimento" onClose={() => setIsSolicitarModalOpen(false)}>
        <AdmFormLabel>Item *</AdmFormLabel>
        <AdmSelectButton label={insumoSelecionado?.nome ?? 'Selecione um item'} onPress={() => setInsumoPickerModalOpen(true)} />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Quantidade</AdmFormLabel>
        <TextInput style={adStyles.formInput} value={quantidadeInput} onChangeText={setQuantidadeInput} keyboardType="numeric" />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Observação</AdmFormLabel>
        <TextInput style={adStyles.formInput} value={observacaoInput} onChangeText={setObservacaoInput} placeholder="Opcional" multiline />
        <Pressable
          style={[adStyles.filterModalApplyButton, { marginTop: 18, opacity: isSaving ? 0.6 : 1 }]}
          onPress={handleSolicitar}
          disabled={isSaving}
        >
          <Text style={adStyles.filterModalApplyButtonText}>{isSaving ? 'Enviando...' : 'Solicitar'}</Text>
        </Pressable>
      </AdmModal>

      <AdmSelectModal
        visible={insumoPickerModalOpen}
        title="Selecione o item"
        options={insumoOptions}
        selectedValue={solicitarInsumoId}
        onSelect={setSolicitarInsumoId}
        onClose={() => setInsumoPickerModalOpen(false)}
      />

      <AdmSelectModal
        visible={categoriaModalOpen}
        title="Categoria"
        options={categoriaOptions}
        selectedValue={categoriaFiltro}
        onSelect={setCategoriaFiltro}
        onClose={() => setCategoriaModalOpen(false)}
      />
    </SafeAreaView>
  );
}

// --- 5. Frota ---

const FROTA_TIPO_REGISTRO_OPTIONS: Array<{ value: AdministrativoFrotaEventoTipo; label: string }> = [
  { value: 'saida', label: 'Saída' },
  { value: 'retorno', label: 'Retorno' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'abastecimento', label: 'Abastecimento' },
  { value: 'sinistro', label: 'Sinistro' },
];

const FROTA_STATUS_APOS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'oficina', label: 'Em Oficina' },
];

export function AdministrativoFrotaScreen({ navigation }: ScreenProps<'AdministrativoFrota'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;
  const [busca, setBusca] = useState('');
  const [items, setItems] = useState<AdministrativoVeiculoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ id: string; x: number; y: number } | null>(null);
  const [eventoVeiculo, setEventoVeiculo] = useState<AdministrativoVeiculoItem | null>(null);
  const [eventoTipo, setEventoTipo] = useState<AdministrativoFrotaEventoTipo>('manutencao');
  const [statusAposInput, setStatusAposInput] = useState('oficina');
  const [kmInput, setKmInput] = useState('');
  const [custoInput, setCustoInput] = useState('');
  const [observacaoInput, setObservacaoInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [historicoVeiculo, setHistoricoVeiculo] = useState<AdministrativoVeiculoItem | null>(null);
  const [historico, setHistorico] = useState<AdministrativoFrotaEventoItem[]>([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchAdministrativoFrota({ busca: busca || undefined })
      .then(setItems)
      .catch((err) => setErrorMessage(showAdmError(err, 'Não foi possível carregar a frota.')))
      .finally(() => setIsLoading(false));
  }, [busca]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAbrirEvento = (item: AdministrativoVeiculoItem) => {
    setMenuAnchor(null);
    setEventoVeiculo(item);
    setEventoTipo('manutencao');
    setStatusAposInput(item.status === 'oficina' ? 'oficina' : 'ativo');
    setKmInput(item.km ? String(item.km) : '');
    setCustoInput('');
    setObservacaoInput('');
  };

  const handleAbrirHistorico = (item: AdministrativoVeiculoItem) => {
    setMenuAnchor(null);
    setHistoricoVeiculo(item);
    setIsLoadingHistorico(true);
    fetchAdministrativoFrotaEventos(item.id)
      .then(setHistorico)
      .catch(() => setHistorico([]))
      .finally(() => setIsLoadingHistorico(false));
  };

  const handleSalvarEvento = () => {
    if (!eventoVeiculo) return;
    const km = kmInput.trim() ? Number(kmInput.replace(',', '.')) : undefined;
    const custo = custoInput.trim() ? Number(custoInput.replace(',', '.')) : undefined;
    setIsSaving(true);
    createAdministrativoFrotaEvento(
      { veiculo_id: eventoVeiculo.id, tipo: eventoTipo, km, custo, observacao: observacaoInput.trim() || undefined },
      actorId
    )
      .then(() => updateAdministrativoVeiculo(eventoVeiculo.id, { status: statusAposInput }, actorId).catch(() => null))
      .then(() => {
        setEventoVeiculo(null);
        load();
      })
      .catch((err) => Alert.alert('Erro', showAdmError(err, 'Não foi possível registrar o evento.')))
      .finally(() => setIsSaving(false));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={administrativoUserInitials}
          variant="administrativo"
          onAvatarPress={() => navigation.navigate('AdministrativoProfile')}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdmPageHeader icon="truck" title="Frota" subtitle="Veículos da rede, quilometragem e status." />

        <AdmSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar por veículo ou placa" />

        {isLoading ? (
          <ActivityIndicator color="#0F8B8D" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <AdmEmptyState message={errorMessage} />
        ) : items.length === 0 ? (
          <AdmEmptyState message="Nenhum veículo encontrado." />
        ) : (
          items.map((item) => (
            <View key={item.id} style={adStyles.dreCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[adStyles.listRowTitle, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
                  {item.veiculo || item.modelo || 'Veículo'} {item.ano ? `(${item.ano})` : ''}
                </Text>
                <Pressable
                  onPress={(e) => {
                    const { pageX, pageY } = e.nativeEvent;
                    setMenuAnchor({ id: item.id, x: pageX, y: pageY });
                  }}
                  hitSlop={8}
                >
                  <Feather name="more-vertical" size={16} color="#5E667D" />
                </Pressable>
              </View>
              <Text style={adStyles.listRowMeta}>
                Placa {item.placa} · {item.posto_nome ?? 'Escritório / Rede'}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={adStyles.listRowMeta}>{formatNumeroBR(item.km)} km</Text>
                <View style={[adStyles.badge, item.status === 'oficina' ? { backgroundColor: '#FEF3D6' } : { backgroundColor: '#E3F4F4' }]}>
                  <Text style={[adStyles.badgeText, item.status === 'oficina' ? { color: '#8A6D1D' } : { color: '#0F8B8D' }]}>
                    {item.status === 'oficina' ? 'EM OFICINA' : 'ATIVO'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={menuAnchor !== null} transparent animationType="fade" onRequestClose={() => setMenuAnchor(null)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenuAnchor(null)}>
          {menuAnchor
            ? (() => {
                const menuItem = items.find((entry) => entry.id === menuAnchor.id);
                if (!menuItem) return null;
                return (
                  <Pressable style={[adStyles.rowActionsMenu, { top: menuAnchor.y + 8, right: 16 }]} onPress={() => {}}>
                    <Pressable style={adStyles.rowActionsMenuItem} onPress={() => handleAbrirHistorico(menuItem)}>
                      <Feather name="clock" size={15} color="#5E667D" />
                      <Text style={adStyles.rowActionsMenuItemText}>Ver histórico</Text>
                    </Pressable>
                    <Pressable style={adStyles.rowActionsMenuItem} onPress={() => handleAbrirEvento(menuItem)}>
                      <Feather name="tool" size={15} color="#5E667D" />
                      <Text style={adStyles.rowActionsMenuItemText}>Registrar saída/manutenção</Text>
                    </Pressable>
                  </Pressable>
                );
              })()
            : null}
        </Pressable>
      </Modal>

      <AdmModal
        visible={!!eventoVeiculo}
        title={`Registrar saída / manutenção${eventoVeiculo ? ` — ${eventoVeiculo.placa}` : ''}`}
        onClose={() => setEventoVeiculo(null)}
      >
        <AdmFormLabel>Tipo do registro</AdmFormLabel>
        <AdmInlineSelect
          label={FROTA_TIPO_REGISTRO_OPTIONS.find((o) => o.value === eventoTipo)?.label ?? 'Manutenção'}
          options={FROTA_TIPO_REGISTRO_OPTIONS}
          selectedValue={eventoTipo}
          onSelect={setEventoTipo}
        />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Quilometragem atual</AdmFormLabel>
        <TextInput style={adStyles.formInput} value={kmInput} onChangeText={setKmInput} keyboardType="numeric" placeholder="Opcional" />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Custo (R$)</AdmFormLabel>
        <View style={adStyles.currencyInputRow}>
          <Text style={adStyles.currencyPrefix}>R$</Text>
          <TextInput
            style={adStyles.currencyInput}
            value={custoInput}
            onChangeText={setCustoInput}
            keyboardType="numeric"
            placeholder="0,00"
          />
        </View>
        <View style={{ height: 10 }} />
        <AdmFormLabel>Status do veículo após o registro</AdmFormLabel>
        <AdmInlineSelect
          label={FROTA_STATUS_APOS_OPTIONS.find((o) => o.value === statusAposInput)?.label ?? 'Ativo'}
          options={FROTA_STATUS_APOS_OPTIONS}
          selectedValue={statusAposInput}
          onSelect={setStatusAposInput}
        />
        <View style={{ height: 10 }} />
        <AdmFormLabel>Descrição</AdmFormLabel>
        <TextInput
          style={adStyles.formInput}
          value={observacaoInput}
          onChangeText={setObservacaoInput}
          placeholder="Ex.: revisão de suspensão na oficina X"
          multiline
        />
        <Pressable
          style={[adStyles.filterModalApplyButton, { marginTop: 18, opacity: isSaving ? 0.6 : 1 }]}
          onPress={handleSalvarEvento}
          disabled={isSaving}
        >
          <Text style={adStyles.filterModalApplyButtonText}>{isSaving ? 'Salvando...' : 'Salvar registro'}</Text>
        </Pressable>
      </AdmModal>

      <AdmModal
        visible={!!historicoVeiculo}
        title={`Histórico: ${historicoVeiculo?.veiculo || historicoVeiculo?.modelo || ''}`}
        onClose={() => setHistoricoVeiculo(null)}
      >
        {isLoadingHistorico ? (
          <ActivityIndicator color="#0F8B8D" style={{ marginTop: 20 }} />
        ) : historico.length === 0 ? (
          <AdmEmptyState message="Nenhum evento registrado." />
        ) : (
          historico.map((ev) => (
            <View key={ev.id} style={adStyles.rankingRow}>
              <Text style={adStyles.listRowTitle}>{FROTA_TIPO_REGISTRO_OPTIONS.find((o) => o.value === ev.tipo)?.label ?? ev.tipo}</Text>
              <Text style={adStyles.listRowMeta}>{ev.km != null ? `${formatNumeroBR(ev.km)} km` : ''}</Text>
            </View>
          ))
        )}
      </AdmModal>
    </SafeAreaView>
  );
}

// --- 6. Notificações (mesma infra genérica do Financeiro/Gestão, modulo=adm) ---

const ADMINISTRATIVO_NOTIF_AUDIENCE_TO_DB: Record<NotificationAudienceType, AdministrativoNotifPublicoTipo> = {
  todos: 'todos',
  colaboradores: 'colaboradores',
  posto: 'postos',
  cargo: 'cargos',
};
const ADMINISTRATIVO_NOTIF_AUDIENCE_FROM_DB: Record<AdministrativoNotifPublicoTipo, NotificationAudienceType> = {
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

function administrativoNotifTemplateToLocal(item: AdministrativoNotifTemplateItem): NotificationTemplateItem {
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

function administrativoNotifRoutineToLocal(
  item: AdministrativoNotifRotinaItem,
  realTemplates: AdministrativoNotifTemplateItem[]
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
    audienceType: ADMINISTRATIVO_NOTIF_AUDIENCE_FROM_DB[item.publicoTipo] ?? 'todos',
    audienceCargos: item.publicoTipo === 'cargos' ? item.publicoIds : [],
    lastRunLabel: item.ultimaExecucao ? formatDateIsoBR(item.ultimaExecucao) ?? '—' : '—',
    enabled: item.isActive,
  };
}

function administrativoNotifRoutineToWriteBody(local: NotificationRoutineItem, realTemplates: AdministrativoNotifTemplateItem[]) {
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
    publico_tipo: ADMINISTRATIVO_NOTIF_AUDIENCE_TO_DB[local.audienceType],
    publico_ids: local.audienceType === 'cargo' ? local.audienceCargos : [],
  };
}

function administrativoNotifTemplateToWriteBody(local: NotificationTemplateItem) {
  return {
    codigo: local.code,
    nome: local.title,
    titulo: local.messageTitle,
    mensagem: local.message,
    variaveis: local.variables,
  };
}

export function AdministrativoNotificationsScreen({ navigation }: ScreenProps<'AdministrativoNotifications'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;
  const isFocused = useIsFocused();

  const [activeTab, setActiveTab] = useState<'routines' | 'templates'>('routines');

  const [realRoutines, setRealRoutines] = useState<AdministrativoNotifRotinaItem[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [routinesError, setRoutinesError] = useState<string | null>(null);
  const [isRoutineFormOpen, setIsRoutineFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<NotificationRoutineItem | null>(null);

  const [realTemplates, setRealTemplates] = useState<AdministrativoNotifTemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateItem | null>(null);

  const loadTemplates = useCallback(() => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);
    fetchAdministrativoNotifTemplates()
      .then((data) => setRealTemplates(data.templates))
      .catch((err) => setTemplatesError(showAdmError(err, 'Não foi possível carregar os templates.')))
      .finally(() => setIsLoadingTemplates(false));
  }, []);

  const loadRoutines = useCallback(() => {
    setIsLoadingRoutines(true);
    setRoutinesError(null);
    fetchAdministrativoNotifRotinas()
      .then((data) => setRealRoutines(data.rotinas))
      .catch((err) => setRoutinesError(showAdmError(err, 'Não foi possível carregar as rotinas.')))
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

  const templates = useMemo(() => realTemplates.map(administrativoNotifTemplateToLocal), [realTemplates]);
  const routines = useMemo(
    () => realRoutines.map((item) => administrativoNotifRoutineToLocal(item, realTemplates)),
    [realRoutines, realTemplates]
  );

  const toggleRoutine = (id: string) => {
    const target = realRoutines.find((item) => item.id === id);
    if (!target) return;
    setRealRoutines((current) => current.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item)));
    updateAdministrativoNotifRotina(id, { ativa: !target.isActive }, actorId).catch((err) => {
      Alert.alert('Erro', showAdmError(err, 'Não foi possível atualizar a rotina.'));
      loadRoutines();
    });
  };

  const handleSaveRoutine = (routine: NotificationRoutineItem) => {
    const body = administrativoNotifRoutineToWriteBody(routine, realTemplates);
    const isExisting = realRoutines.some((item) => item.id === routine.id);
    const request = isExisting
      ? updateAdministrativoNotifRotina(routine.id, body, actorId)
      : createAdministrativoNotifRotina(body, actorId);
    request
      .then(() => {
        setIsRoutineFormOpen(false);
        loadRoutines();
      })
      .catch((err) => Alert.alert('Erro', showAdmError(err, 'Não foi possível salvar a rotina.')));
  };

  const handleRunRoutine = (routine: NotificationRoutineItem) => {
    executarAdministrativoNotifRotina(routine.id, actorId)
      .then(() => {
        Alert.alert('Rotina executada', `"${routine.title}" foi executada agora.`);
        loadRoutines();
      })
      .catch((err) => Alert.alert('Erro', showAdmError(err, 'Não foi possível executar a rotina.')));
  };

  const handleDeleteRoutine = (routine: NotificationRoutineItem) => {
    Alert.alert('Excluir rotina', `Tem certeza que deseja excluir "${routine.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAdministrativoNotifRotina(routine.id, actorId)
            .then(() => loadRoutines())
            .catch((err) => Alert.alert('Erro', showAdmError(err, 'Não foi possível excluir a rotina.')));
        },
      },
    ]);
  };

  const handleSaveTemplate = (template: NotificationTemplateItem) => {
    const body = administrativoNotifTemplateToWriteBody(template);
    const isExisting = realTemplates.some((item) => item.id === template.id);
    const request = isExisting
      ? updateAdministrativoNotifTemplate(template.id, body, actorId)
      : createAdministrativoNotifTemplate(body, actorId);
    request
      .then(() => {
        setIsTemplateFormOpen(false);
        loadTemplates();
      })
      .catch((err) => Alert.alert('Erro', showAdmError(err, 'Não foi possível salvar o template.')));
  };

  const handleDeleteTemplate = (template: NotificationTemplateItem) => {
    Alert.alert('Excluir template', `Tem certeza que deseja excluir "${template.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAdministrativoNotifTemplate(template.id, actorId)
            .then(() => loadTemplates())
            .catch((err) =>
              Alert.alert('Erro', showAdmError(err, 'Não foi possível excluir o template (templates padrão do sistema não podem ser excluídos).'))
            );
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={administrativoUserInitials}
          variant="administrativo"
          onAvatarPress={() => navigation.navigate('AdministrativoProfile')}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdmPageHeader icon="bell" title="Notificações" subtitle="Envio de notificações via App, E-mail e WhatsApp." />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Pressable
            style={[adStyles.filterPill, activeTab === 'routines' ? adStyles.filterPillActive : null]}
            onPress={() => setActiveTab('routines')}
          >
            <Text style={[adStyles.filterPillText, activeTab === 'routines' ? adStyles.filterPillTextActive : null]}>Rotinas</Text>
          </Pressable>
          <Pressable
            style={[adStyles.filterPill, activeTab === 'templates' ? adStyles.filterPillActive : null]}
            onPress={() => setActiveTab('templates')}
          >
            <Text style={[adStyles.filterPillText, activeTab === 'templates' ? adStyles.filterPillTextActive : null]}>Templates</Text>
          </Pressable>
        </View>

        {activeTab === 'routines' ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={[adStyles.countLabel, { flex: 1, minWidth: 0 }]}>
                {isLoadingRoutines ? 'Carregando...' : `${routines.length} rotina(s) cadastrada(s)`}
              </Text>
              <Pressable
                style={[adStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }]}
                onPress={() => {
                  setEditingRoutine(null);
                  setIsRoutineFormOpen(true);
                }}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={adStyles.suggestionButtonText}>Nova rotina</Text>
              </Pressable>
            </View>

            {isLoadingRoutines ? (
              <ActivityIndicator color="#0F8B8D" style={{ marginTop: 20 }} />
            ) : routinesError ? (
              <AdmEmptyState message={routinesError} />
            ) : routines.length === 0 ? (
              <AdmEmptyState message="Nenhuma rotina cadastrada. Clique em Nova rotina." />
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
                  <View key={routine.id} style={adStyles.dreCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={adStyles.listRowTitle} numberOfLines={1}>
                        {routine.title}
                      </Text>
                      <ToggleSwitch value={routine.enabled} onValueChange={() => toggleRoutine(routine.id)} />
                    </View>
                    <Text style={adStyles.listRowMeta}>{routine.messageTitle}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <View style={[adStyles.badge, { backgroundColor: '#E3F4F4' }]}>
                        <Text style={[adStyles.badgeText, { color: '#0F8B8D' }]}>{triggerMeta.label}</Text>
                      </View>
                      <Text style={adStyles.listRowMeta} numberOfLines={1}>
                        {channelLabels.length > 0 ? channelLabels.join(', ') : 'Nenhum canal'}
                      </Text>
                      <Text style={adStyles.listRowMeta}>{audienceLabel}</Text>
                    </View>
                    {triggerDetail ? <Text style={[adStyles.listRowMeta, { marginTop: 4 }]}>{triggerDetail}</Text> : null}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <Text style={adStyles.listRowMeta}>
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
              <Text style={[adStyles.countLabel, { flex: 1, minWidth: 0 }]}>
                {isLoadingTemplates
                  ? 'Carregando...'
                  : `${templates.length} template(s)${templates.length > 0 ? ' — ⭐ padrão do sistema, demais customizados' : ''}`}
              </Text>
              <Pressable
                style={[adStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }]}
                onPress={() => {
                  setEditingTemplate(null);
                  setIsTemplateFormOpen(true);
                }}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={adStyles.suggestionButtonText}>Novo template</Text>
              </Pressable>
            </View>

            {isLoadingTemplates ? (
              <ActivityIndicator color="#0F8B8D" style={{ marginTop: 20 }} />
            ) : templatesError ? (
              <AdmEmptyState message={templatesError} />
            ) : templates.length === 0 ? (
              <AdmEmptyState message="Nenhum template cadastrado ainda." />
            ) : (
              templates.map((template) => (
                <View key={template.id} style={adStyles.dreCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {template.isSystemDefault ? <Feather name="star" size={14} color="#D79A22" /> : null}
                    <Text style={[adStyles.listRowTitle, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
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
                  <Text style={adStyles.listRowMeta}>{template.code}</Text>
                  <Text style={[adStyles.listRowMeta, { marginTop: 4 }]}>{template.messageTitle}</Text>
                  <Text style={adStyles.listRowMeta} numberOfLines={2}>
                    {template.message}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {template.variables.map((variable) => (
                      <View key={variable} style={[adStyles.badge, { backgroundColor: '#F1F3F8' }]}>
                        <Text style={[adStyles.badgeText, { color: '#5E667D' }]}>{variable}</Text>
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

// --- Perfil ---

export function AdministrativoProfileScreen({ navigation }: ScreenProps<'AdministrativoProfile'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={administrativoUserInitials} variant="administrativo" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdmPageHeader icon="user" title="Meu Perfil" subtitle={administrativoUser.accessLabel} />
        <View style={adStyles.profileCard}>
          <View style={adStyles.profileAvatarShell}>
            <Text style={adStyles.profileAvatarText}>{administrativoUserInitials}</Text>
          </View>
          <Text style={adStyles.profileName}>{administrativoUser.fullName}</Text>
          <Text style={adStyles.profileRole}>{administrativoUser.roleAndUnit}</Text>

          <View style={adStyles.profileFieldRow}>
            <Feather name="mail" size={14} color="#7C8397" />
            <Text style={adStyles.profileFieldText}>{administrativoUser.email}</Text>
          </View>
          <View style={adStyles.profileFieldRow}>
            <Feather name="phone" size={14} color="#7C8397" />
            <Text style={adStyles.profileFieldText}>{administrativoUser.phone}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const adStyles = StyleSheet.create({
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
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0C1736',
  },
  periodoSegmentRow: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  periodoSegmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodoSegmentButtonActive: {
    backgroundColor: '#0C1736',
  },
  periodoSegmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E667D',
  },
  periodoSegmentTextActive: {
    color: '#FFFFFF',
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
    fontSize: 13,
    fontWeight: '800',
    color: '#0C1736',
    flexShrink: 1,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0C1736',
    flex: 1,
    marginRight: 8,
  },
  pieCenterValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0C1736',
  },
  pieCenterLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: '#7C8397',
    textAlign: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  countBadgeNumber: {
    color: '#0C1736',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  rowActionsMenu: {
    position: 'absolute',
    minWidth: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#0C1736',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  rowActionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowActionsMenuItemText: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '600',
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5E667D',
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    fontSize: 14,
    color: '#0C1736',
    paddingVertical: 10,
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
    color: '#0F8B8D',
    fontWeight: '800',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0C1736',
    marginBottom: 8,
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
  filterModalApplyButton: {
    marginTop: 18,
    backgroundColor: '#0F8B8D',
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
    backgroundColor: '#EAF7F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CDEAEA',
    padding: 12,
  },
  kpiLabel: {
    color: '#0F6E70',
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
    backgroundColor: '#E3F4F4',
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
    backgroundColor: '#E3F4F4',
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#0F8B8D',
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
  filterPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: '#0F8B8D',
    borderColor: '#0F8B8D',
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
    backgroundColor: '#0F8B8D',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  suggestionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  smallButton: {
    backgroundColor: '#0F8B8D',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statusDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0C1736',
  },
  statusMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  statusMenuItemText: {
    fontSize: 12,
    color: '#0C1736',
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
    backgroundColor: '#0F8B8D',
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
