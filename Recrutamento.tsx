import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  styles,
  TopBar,
  recrutamentoUser,
  recrutamentoUserInitials,
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
  ApiError,
  fetchRecrutamentoDashboard,
  type RecrutamentoDashboard,
  fetchRecrutamentoVagas,
  fetchRecrutamentoVaga,
  createRecrutamentoVaga,
  updateRecrutamentoVaga,
  deleteRecrutamentoVaga,
  type RecrutamentoVaga,
  fetchRecrutamentoCandidatos,
  fetchRecrutamentoCandidato,
  createRecrutamentoCandidato,
  updateRecrutamentoCandidato,
  deleteRecrutamentoCandidato,
  moverRecrutamentoCandidatoEtapa,
  fetchRecrutamentoSugestaoIa,
  type RecrutamentoCandidatoItem,
  type RecrutamentoCandidatoFiltro,
  type RecrutamentoCandidatoDetalhe,
  importarRecrutamentoCurriculo,
  fetchRecrutamentoImportacoes,
  reprocessarRecrutamentoImportacao,
  type RecrutamentoImportacao,
  fetchRecrutamentoPendencias,
  aprovarRecrutamentoPendencia,
  recusarRecrutamentoPendencia,
  cobrarRecrutamentoPendencia,
  type RecrutamentoPendencia,
  fetchRecrutamentoTriagemModelos,
  createRecrutamentoTriagemModelo,
  updateRecrutamentoTriagemModelo,
  deleteRecrutamentoTriagemModelo,
  vincularRecrutamentoTriagemVaga,
  type RecrutamentoTriagemModelo,
  fetchRecrutamentoAvaliacoes,
  createRecrutamentoAvaliacao,
  updateRecrutamentoAvaliacao,
  deleteRecrutamentoAvaliacao,
  type RecrutamentoAvaliacao,
  fetchRecrutamentoDocAdmissao,
  createRecrutamentoDocAdmissao,
  updateRecrutamentoDocAdmissao,
  deleteRecrutamentoDocAdmissao,
  type RecrutamentoDocAdmissao,
  fetchRecrutamentoAlertasIa,
  createRecrutamentoAlertaIa,
  updateRecrutamentoAlertaIa,
  deleteRecrutamentoAlertaIa,
  type RecrutamentoAlertaIa,
  fetchRecrutamentoTelegram,
  updateRecrutamentoTelegram,
  updateRecrutamentoTelegramDestino,
  deleteRecrutamentoTelegramDestino,
  enviarRecrutamentoTelegramTeste,
  type RecrutamentoTelegramConfig,
  fetchRecrutamentoWaConversas,
  fetchRecrutamentoWaMensagens,
  enviarRecrutamentoWaMensagem,
  criarRecrutamentoWaConversa,
  fetchRecrutamentoNotifRotinas,
  createRecrutamentoNotifRotina,
  updateRecrutamentoNotifRotina,
  deleteRecrutamentoNotifRotina,
  executarRecrutamentoNotifRotina,
  fetchRecrutamentoNotifTemplates,
  createRecrutamentoNotifTemplate,
  updateRecrutamentoNotifTemplate,
  deleteRecrutamentoNotifTemplate,
  type MarketingNotifRotinaItem,
  type MarketingNotifTemplateItem,
  type MarketingNotifPublicoTipo,
  type MarketingWaConversaItem,
  type MarketingWaMensagemItem,
} from './api';

// ============================================================
// Helpers locais (mesmo padrão do Marketing.tsx/Administrativo.tsx —
// cada módulo é auto-contido, só reaproveitando o genérico do App.tsx).
// ============================================================

function formatNumeroBR(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('pt-BR');
}

function formatBRL(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function showRsError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  return message || fallback;
}

function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateIsoBR(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

// Extrator defensivo — o contrato devolve vários blocos como Record<string,
// unknown> (snapshot/periodo_atual/funil/etc.) sem nome de campo fechado por
// contrato de tipos, então em vez de assumir uma chave só, tenta várias.
function pickRsField(item: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return null;
}

function pickRsNumber(item: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

const rsMesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function useRsPeriodoNav() {
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

// ============================================================
// Primitivas de UI locais (RsXxx — mesmo papel que MktXxx no Marketing.tsx)
// ============================================================

function RsPageHeader({ icon, title, subtitle }: { icon: keyof typeof Feather.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={rsStyles.pageHeaderRow}>
      <View style={rsStyles.pageHeaderIconShell}>
        <Feather name={icon} size={20} color="#1F3A5F" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={rsStyles.pageHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={rsStyles.pageHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function RsEmptyState({ message }: { message: string }) {
  return (
    <View style={rsStyles.emptyCard}>
      <Text style={rsStyles.emptyText}>{message}</Text>
    </View>
  );
}

function RsSearchInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={rsStyles.searchRow}>
      <Feather name="search" size={15} color="#8A93A8" />
      <TextInput
        style={rsStyles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8A93A8"
      />
    </View>
  );
}

function RsModal({
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}>
        <Pressable style={rsStyles.modalBackdrop} onPress={onClose}>
          <Pressable style={[rsStyles.modalCard, { maxHeight: '86%' }]} onPress={() => {}}>
            <View style={rsStyles.modalHeader}>
              <Text style={rsStyles.modalTitle}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RsFormLabel({ children }: { children: React.ReactNode }) {
  return <Text style={rsStyles.formLabel}>{children}</Text>;
}

function RsTextInput(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor="#A7AEC2" {...props} style={[rsStyles.textInput, props.style]} />;
}

// Dropdown que flutua por cima do resto do conteúdo (mesmo padrão do
// MktFieldDropdown — evita empurrar layout e evita 2 <Modal> nativos abertos
// ao mesmo tempo, que não recebem toque de forma confiável).
function RsFieldDropdown<T extends string | null>({
  label,
  options,
  selectedValue,
  isOpen,
  onToggle,
  onSelect,
}: {
  label: string;
  options: Array<{ value: T; label: string; color?: string }>;
  selectedValue: T;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={{ position: 'relative', zIndex: isOpen ? 200 : 1 }}>
      <Pressable style={rsStyles.selectButton} onPress={onToggle}>
        <Text style={rsStyles.selectButtonText} numberOfLines={1}>
          {label}
        </Text>
        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#5E667D" />
      </Pressable>
      {isOpen ? (
        <View style={rsStyles.overlayDropdown}>
          <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
            {options.map((opt, idx) => {
              const isSelected = selectedValue === opt.value;
              return (
                <Pressable
                  key={`${opt.label}-${idx}`}
                  style={[rsStyles.overlayDropdownItem, isSelected ? { backgroundColor: opt.color ?? '#1F3A5F' } : null]}
                  onPress={() => onSelect(opt.value)}
                >
                  <Text style={[rsStyles.overlayDropdownItemText, isSelected ? { color: '#FFFFFF', fontWeight: '800' } : null]} numberOfLines={1}>
                    {opt.label}
                  </Text>
                  {isSelected ? <Feather name="check" size={14} color="#FFFFFF" style={{ marginLeft: 'auto' }} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function RsKpiCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <View style={[rsStyles.kpiCard, { borderLeftColor: '#1F3A5F' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name={icon} size={12} color="#1F3A5F" />
        <Text style={[rsStyles.kpiLabel, { color: '#1F3A5F' }]}>{label}</Text>
      </View>
      <Text style={rsStyles.kpiValue}>{value}</Text>
      {subtitle ? <Text style={rsStyles.kpiLabelUnidade}>{subtitle}</Text> : null}
    </View>
  );
}

function RsPeriodoFiltro({
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
  const periodoLabel = periodo === 'ano' ? String(refAno) : `${rsMesesNomes[refMes - 1]} / ${refAno}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <View style={rsStyles.periodoSegmentRow}>
        {(['mes', 'ano'] as const).map((opt) => {
          const isActive = periodo === opt;
          return (
            <Pressable
              key={opt}
              style={[rsStyles.periodoSegmentButton, isActive ? rsStyles.periodoSegmentButtonActive : null]}
              onPress={() => onChangePeriodo(opt)}
            >
              <Text style={[rsStyles.periodoSegmentText, isActive ? rsStyles.periodoSegmentTextActive : null]}>
                {opt === 'mes' ? 'Mês' : 'Ano'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={onAnterior} style={rsStyles.monthNavButton}>
        <Feather name="chevron-left" size={16} color="#5E667D" />
      </Pressable>
      <Text style={rsStyles.monthLabel} numberOfLines={1}>
        {periodoLabel}
      </Text>
      <Pressable onPress={onProximo} style={rsStyles.monthNavButton}>
        <Feather name="chevron-right" size={16} color="#5E667D" />
      </Pressable>
      <Pressable onPress={onReset} style={rsStyles.monthNavButton}>
        <Feather name="rotate-ccw" size={14} color="#5E667D" />
      </Pressable>
    </View>
  );
}

function RsBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[rsStyles.badge, { backgroundColor: bg }]}>
      <Text style={[rsStyles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ============================================================
// 1. Dashboard
// ============================================================

const FUNIL_COLORS = ['#1F3A5F', '#3D5A80', '#5E80A3', '#8FA9C4', '#B7C7DA', '#D9E2EC'];

export function RecrutamentoDashboardScreen({ navigation }: ScreenProps<'RecrutamentoDashboard'>) {
  const { periodo, setPeriodo, refMes, refAno, handleAnterior, handleProximo, handleReset } = useRsPeriodoNav();
  const [data, setData] = useState<RecrutamentoDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRecrutamentoDashboard({ mes: refMes, ano: refAno, modo: periodo })
      .then(setData)
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar o dashboard.')))
      .finally(() => setIsLoading(false));
  }, [periodo, refMes, refAno]);

  const snapshot = data?.snapshot ?? {};
  const funil = data?.funil ?? {};
  const funilEntries = Object.entries(funil).filter(([, v]) => typeof v === 'number' && v > 0) as Array<[string, number]>;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={recrutamentoUserInitials} variant="recrutamento" onAvatarPress={() => navigation.navigate('RecrutamentoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RsPageHeader icon="grid" title="Dashboard" subtitle="Vagas, candidatos e processo seletivo." />

        <RsPeriodoFiltro
          periodo={periodo}
          onChangePeriodo={setPeriodo}
          refMes={refMes}
          refAno={refAno}
          onAnterior={handleAnterior}
          onProximo={handleProximo}
          onReset={handleReset}
        />

        {isLoading ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <RsEmptyState message={errorMessage} />
        ) : !data ? (
          <RsEmptyState message="Sem dados disponíveis." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RsKpiCard icon="briefcase" label="VAGAS ABERTAS" value={formatNumeroBR(pickRsNumber(snapshot, ['vagas_abertas', 'vagasAbertas']))} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RsKpiCard icon="users" label="CANDIDATOS" value={formatNumeroBR(pickRsNumber(snapshot, ['total_candidatos', 'totalCandidatos', 'candidatos']))} subtitle="no período" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RsKpiCard icon="user-check" label="ADMITIDOS" value={formatNumeroBR(pickRsNumber(snapshot, ['admitidos', 'contratados']))} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RsKpiCard icon="clock" label="PENDÊNCIAS" value={formatNumeroBR(pickRsNumber(snapshot, ['pendencias', 'pendencias_abertas']))} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RsKpiCard
                  icon="trending-up"
                  label="TEMPO MÉDIO"
                  value={pickRsField(snapshot, ['tempo_medio_contratacao_dias', 'tempoMedioDias']) ? `${pickRsField(snapshot, ['tempo_medio_contratacao_dias', 'tempoMedioDias'])} dias` : '—'}
                  subtitle="até a admissão"
                />
              </View>
            </View>

            {funilEntries.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Funil de recrutamento</Text>
                <View style={{ marginTop: 6 }}>
                  {funilEntries.map(([etapa, total], idx) => (
                    <View key={etapa} style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={rsStyles.listRowMeta} numberOfLines={1}>
                          {etapa.replace(/_/g, ' ')}
                        </Text>
                        <Text style={rsStyles.listRowValue}>{formatNumeroBR(total)}</Text>
                      </View>
                      <View style={rsStyles.funilBarTrack}>
                        <View
                          style={[
                            rsStyles.funilBarFill,
                            {
                              width: `${Math.min(100, (total / Math.max(...funilEntries.map(([, v]) => v))) * 100)}%`,
                              backgroundColor: FUNIL_COLORS[idx % FUNIL_COLORS.length],
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {data.top_vagas.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Top vagas com mais candidatos</Text>
                {data.top_vagas.slice(0, 6).map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: idx < 5 ? 1 : 0, borderBottomColor: '#F1F2F6' }}>
                    <Text style={[rsStyles.listRowMeta, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
                      {pickRsField(item, ['titulo', 'nome', 'vaga']) ?? '—'}
                    </Text>
                    <Text style={rsStyles.listRowValue}>{formatNumeroBR(pickRsNumber(item, ['total', 'candidatos', 'total_candidatos']))}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {data.origem.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Candidatos por origem</Text>
                <View style={{ alignItems: 'center', marginVertical: 8 }}>
                  <PieChart
                    data={data.origem.map((item, idx) => ({
                      value: pickRsNumber(item, ['total', 'quantidade', 'count']),
                      color: FUNIL_COLORS[idx % FUNIL_COLORS.length],
                      text: pickRsField(item, ['origem', 'nome', 'label']) ?? '—',
                    }))}
                    donut
                    radius={70}
                    innerRadius={42}
                  />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 10 }}>
                    {data.origem.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[rsStyles.legendDot, { backgroundColor: FUNIL_COLORS[idx % FUNIL_COLORS.length] }]} />
                        <Text style={rsStyles.listRowMeta}>
                          {pickRsField(item, ['origem', 'nome', 'label']) ?? '—'} ({formatNumeroBR(pickRsNumber(item, ['total', 'quantidade', 'count']))})
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {data.top_cidades.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Top cidades</Text>
                {data.top_cidades.slice(0, 8).map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                    <Text style={rsStyles.listRowMeta}>{pickRsField(item, ['cidade', 'nome']) ?? '—'}</Text>
                    <Text style={rsStyles.listRowValue}>{formatNumeroBR(pickRsNumber(item, ['total', 'quantidade', 'count']))}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {data.distrib_genero.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Distribuição por gênero</Text>
                {data.distrib_genero.map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                    <Text style={rsStyles.listRowMeta}>{pickRsField(item, ['genero', 'nome', 'label']) ?? '—'}</Text>
                    <Text style={rsStyles.listRowValue}>{formatNumeroBR(pickRsNumber(item, ['total', 'quantidade', 'count']))}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// 2. Vagas
// ============================================================

const VAGA_STATUS_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: 'aberta', label: 'Aberta', color: '#18955A' },
  { value: 'pausada', label: 'Pausada', color: '#B7791F' },
  { value: 'encerrada', label: 'Encerrada', color: '#9AA3B5' },
  { value: 'rascunho', label: 'Rascunho', color: '#5E667D' },
];

function vagaStatusMeta(status: string) {
  return VAGA_STATUS_OPTIONS.find((o) => o.value === status) ?? { value: status, label: status, color: '#5E667D' };
}

export function RecrutamentoVagasScreen({ navigation }: ScreenProps<'RecrutamentoVagas'>) {
  const isFocused = useIsFocused();
  const [vagas, setVagas] = useState<RecrutamentoVaga[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null);
  const [isStatusFiltroOpen, setIsStatusFiltroOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecrutamentoVaga | null>(null);
  const [formTitulo, setFormTitulo] = useState('');
  const [formCidade, setFormCidade] = useState('');
  const [formUf, setFormUf] = useState('');
  const [formModalidade, setFormModalidade] = useState('');
  const [formSenioridade, setFormSenioridade] = useState('');
  const [formNumVagas, setFormNumVagas] = useState('1');
  const [formPublicadaLp, setFormPublicadaLp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRecrutamentoVagas({ q: busca || undefined, status: statusFiltro ?? undefined })
      .then(setVagas)
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar as vagas.')))
      .finally(() => setIsLoading(false));
  }, [busca, statusFiltro]);

  useEffect(() => {
    if (!isFocused) return;
    load();
  }, [load, isFocused]);

  const openCreate = () => {
    setEditing(null);
    setFormTitulo('');
    setFormCidade('');
    setFormUf('');
    setFormModalidade('');
    setFormSenioridade('');
    setFormNumVagas('1');
    setFormPublicadaLp(false);
    setIsFormOpen(true);
  };

  const openEdit = (vaga: RecrutamentoVaga) => {
    setEditing(vaga);
    setFormTitulo(vaga.titulo ?? '');
    setFormCidade(vaga.cidade ?? '');
    setFormUf(vaga.uf ?? '');
    setFormModalidade(vaga.modalidade ?? '');
    setFormSenioridade(vaga.senioridade ?? '');
    setFormNumVagas(String(vaga.num_vagas ?? 1));
    setFormPublicadaLp(!!vaga.publicada_lp);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formTitulo.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o título da vaga.');
      return;
    }
    const body = {
      titulo: formTitulo.trim(),
      cidade: formCidade.trim() || null,
      uf: formUf.trim() || null,
      modalidade: formModalidade.trim() || null,
      senioridade: formSenioridade.trim() || null,
      num_vagas: Number(formNumVagas) || 1,
      publicada_lp: formPublicadaLp,
    };
    setIsSaving(true);
    const request = editing ? updateRecrutamentoVaga(editing.id, body) : createRecrutamentoVaga(body);
    request
      .then(() => {
        setIsFormOpen(false);
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar a vaga.')))
      .finally(() => setIsSaving(false));
  };

  const handleAcao = (vaga: RecrutamentoVaga, acao: 'pausar' | 'reabrir' | 'encerrar') => {
    updateRecrutamentoVaga(vaga.id, {}, acao)
      .then(() => load())
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível atualizar a vaga.')));
  };

  const handleDelete = (vaga: RecrutamentoVaga) => {
    Alert.alert('Excluir vaga', `Tem certeza que deseja excluir "${vaga.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteRecrutamentoVaga(vaga.id)
            .then(() => load())
            .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir a vaga.')));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={recrutamentoUserInitials} variant="recrutamento" onAvatarPress={() => navigation.navigate('RecrutamentoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RsPageHeader icon="briefcase" title="Vagas" subtitle="Gestão de vagas abertas e encerradas." />

        <RsSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar vaga por título..." />

        <View style={{ marginTop: 10, marginBottom: 10 }}>
          <RsFieldDropdown
            label={statusFiltro ? vagaStatusMeta(statusFiltro).label : 'Todos os status'}
            options={[{ value: null, label: 'Todos os status' }, ...VAGA_STATUS_OPTIONS]}
            selectedValue={statusFiltro}
            isOpen={isStatusFiltroOpen}
            onToggle={() => setIsStatusFiltroOpen((o) => !o)}
            onSelect={(v) => {
              setStatusFiltro(v);
              setIsStatusFiltroOpen(false);
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={rsStyles.countLabel}>{isLoading ? 'Carregando...' : `${vagas.length} vaga(s)`}</Text>
          <Pressable style={rsStyles.primaryButton} onPress={openCreate}>
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={rsStyles.primaryButtonText}>Nova vaga</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <RsEmptyState message={errorMessage} />
        ) : vagas.length === 0 ? (
          <RsEmptyState message="Nenhuma vaga encontrada." />
        ) : (
          vagas.map((vaga) => {
            const statusMeta = vagaStatusMeta(vaga.status);
            return (
              <View key={vaga.id} style={rsStyles.dreCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => openEdit(vaga)}>
                    <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                      {vaga.titulo}
                    </Text>
                    <Text style={rsStyles.listRowMeta}>
                      {[vaga.cidade, vaga.uf].filter(Boolean).join(' / ') || 'Local não informado'} · {vaga.modalidade ?? '—'}
                    </Text>
                  </Pressable>
                  <RsBadge label={statusMeta.label} color={statusMeta.color} bg="#F1F2F6" />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  {vaga.senioridade ? <Text style={rsStyles.listRowMeta}>{vaga.senioridade}</Text> : null}
                  <Text style={rsStyles.listRowMeta}>{vaga.num_vagas ?? 1} vaga(s)</Text>
                  {vaga.publicada_lp ? <RsBadge label="Publicada na LP" color="#1F3A5F" bg="#E8EEF6" /> : null}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 10 }}>
                  {vaga.status === 'aberta' ? (
                    <Pressable onPress={() => handleAcao(vaga, 'pausar')} hitSlop={6}>
                      <Feather name="pause" size={15} color="#B7791F" />
                    </Pressable>
                  ) : vaga.status === 'pausada' ? (
                    <Pressable onPress={() => handleAcao(vaga, 'reabrir')} hitSlop={6}>
                      <Feather name="play" size={15} color="#18955A" />
                    </Pressable>
                  ) : null}
                  {vaga.status !== 'encerrada' ? (
                    <Pressable onPress={() => handleAcao(vaga, 'encerrar')} hitSlop={6}>
                      <Feather name="x-circle" size={15} color="#9AA3B5" />
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => openEdit(vaga)} hitSlop={6}>
                    <Feather name="edit-2" size={15} color="#3457D5" />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(vaga)} hitSlop={6}>
                    <Feather name="trash-2" size={15} color="#E6213D" />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <RsModal visible={isFormOpen} title={editing ? 'Editar vaga' : 'Nova vaga'} onClose={() => setIsFormOpen(false)}>
        <RsFormLabel>Título*</RsFormLabel>
        <RsTextInput value={formTitulo} onChangeText={setFormTitulo} placeholder="Ex.: Frentista" />
        <RsFormLabel>Cidade</RsFormLabel>
        <RsTextInput value={formCidade} onChangeText={setFormCidade} placeholder="Cidade" />
        <RsFormLabel>UF</RsFormLabel>
        <RsTextInput value={formUf} onChangeText={setFormUf} placeholder="UF" maxLength={2} autoCapitalize="characters" />
        <RsFormLabel>Modalidade</RsFormLabel>
        <RsTextInput value={formModalidade} onChangeText={setFormModalidade} placeholder="Presencial / Híbrido / Remoto" />
        <RsFormLabel>Senioridade</RsFormLabel>
        <RsTextInput value={formSenioridade} onChangeText={setFormSenioridade} placeholder="Júnior / Pleno / Sênior" />
        <RsFormLabel>Número de vagas</RsFormLabel>
        <RsTextInput value={formNumVagas} onChangeText={setFormNumVagas} placeholder="1" keyboardType="number-pad" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 20 }}>
          <Text style={rsStyles.formLabel}>Publicar na landing page</Text>
          <ToggleSwitch value={formPublicadaLp} onValueChange={() => setFormPublicadaLp((v) => !v)} />
        </View>
        <Pressable style={[rsStyles.primaryButton, { justifyContent: 'center', marginBottom: 16 }]} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={rsStyles.primaryButtonText}>Salvar</Text>}
        </Pressable>
      </RsModal>
    </SafeAreaView>
  );
}

// ============================================================
// 3. Candidatos (lista + detalhe)
// ============================================================

export function RecrutamentoCandidatosScreen({ navigation }: ScreenProps<'RecrutamentoCandidatos'>) {
  const isFocused = useIsFocused();
  const [candidatos, setCandidatos] = useState<RecrutamentoCandidatoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [alocadoFiltro, setAlocadoFiltro] = useState<'todos' | 'sim' | 'nao'>('todos');

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const filtro: RecrutamentoCandidatoFiltro = { q: busca || undefined };
    if (alocadoFiltro !== 'todos') filtro.alocado = alocadoFiltro === 'sim';
    fetchRecrutamentoCandidatos(filtro)
      .then(setCandidatos)
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar os candidatos.')))
      .finally(() => setIsLoading(false));
  }, [busca, alocadoFiltro]);

  useEffect(() => {
    if (!isFocused) return;
    load();
  }, [load, isFocused]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={recrutamentoUserInitials} variant="recrutamento" onAvatarPress={() => navigation.navigate('RecrutamentoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RsPageHeader icon="users" title="Candidatos" subtitle="Base de candidatos e etapas do processo." />

        <RsSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar por nome, e-mail ou telefone..." />

        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
          {(['todos', 'sim', 'nao'] as const).map((opt) => (
            <Pressable
              key={opt}
              style={[rsStyles.filterPill, alocadoFiltro === opt ? rsStyles.filterPillActive : null]}
              onPress={() => setAlocadoFiltro(opt)}
            >
              <Text style={[rsStyles.filterPillText, alocadoFiltro === opt ? rsStyles.filterPillTextActive : null]}>
                {opt === 'todos' ? 'Todos' : opt === 'sim' ? 'Alocados' : 'Não alocados'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={rsStyles.countLabel}>{isLoading ? 'Carregando...' : `${candidatos.length} candidato(s)`}</Text>

        {isLoading ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <RsEmptyState message={errorMessage} />
        ) : candidatos.length === 0 ? (
          <RsEmptyState message="Nenhum candidato encontrado." />
        ) : (
          candidatos.map((c) => (
            <Pressable key={c.id} style={rsStyles.dreCard} onPress={() => navigation.navigate('RecrutamentoCandidatoDetalhe', { id: c.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                    {c.nome}
                  </Text>
                  <Text style={rsStyles.listRowMeta}>{c.codigo} · {[c.cidade, c.uf].filter(Boolean).join('/') || '—'}</Text>
                </View>
                {c.alocado ? <RsBadge label="Alocado" color="#18955A" bg="#E2F4EA" /> : null}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
                {c.etapa ? <RsBadge label={c.etapa} color="#1F3A5F" bg="#E8EEF6" /> : null}
                <Text style={rsStyles.listRowMeta}>
                  Docs: {c.documentos?.aprovados ?? 0}/{c.documentos?.total ?? 0}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CANDIDATO_ETAPAS = ['triagem', 'entrevista', 'teste', 'aprovado', 'reprovado', 'admissao'];

export function RecrutamentoCandidatoDetalheScreen({ navigation, route }: ScreenProps<'RecrutamentoCandidatoDetalhe'>) {
  const { id } = route.params;
  const [detalhe, setDetalhe] = useState<RecrutamentoCandidatoDetalhe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEtapaOpen, setIsEtapaOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRecrutamentoCandidato(id)
      .then(setDetalhe)
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar o candidato.')))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMoverEtapa = (etapa: string) => {
    setIsEtapaOpen(false);
    setIsMoving(true);
    moverRecrutamentoCandidatoEtapa({ candidato_id: id, etapa })
      .then(() => load())
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível mover o candidato de etapa.')))
      .finally(() => setIsMoving(false));
  };

  const handleDelete = () => {
    if (!detalhe) return;
    Alert.alert('Excluir candidato', `Tem certeza que deseja excluir "${detalhe.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteRecrutamentoCandidato(id)
            .then(() => navigation.goBack())
            .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir o candidato.')));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <Pressable style={rsStyles.backRow} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color="#1F3A5F" />
          <Text style={rsStyles.backRowText}>Candidatos</Text>
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <RsEmptyState message={errorMessage} />
        ) : !detalhe ? (
          <RsEmptyState message="Candidato não encontrado." />
        ) : (
          <>
            <RsPageHeader icon="user" title={detalhe.nome} subtitle={detalhe.codigo} />

            <View style={rsStyles.chartCard}>
              <Text style={rsStyles.sectionTitle}>Dados de contato</Text>
              <Text style={rsStyles.listRowMeta}>E-mail: {detalhe.email ?? '—'}</Text>
              <Text style={rsStyles.listRowMeta}>WhatsApp: {detalhe.whatsapp ?? '—'}</Text>
              <Text style={rsStyles.listRowMeta}>
                Local: {[detalhe.bairro, detalhe.cidade, detalhe.uf].filter(Boolean).join(', ') || '—'}
              </Text>
              <Text style={rsStyles.listRowMeta}>Tipo de vaga: {detalhe.tipo_vaga ?? '—'}</Text>
            </View>

            <View style={rsStyles.chartCard}>
              <Text style={rsStyles.sectionTitle}>Etapa do processo</Text>
              <View style={{ marginTop: 6 }}>
                <RsFieldDropdown<string | null>
                  label={detalhe.etapa ?? 'Sem etapa definida'}
                  options={CANDIDATO_ETAPAS.map((e) => ({ value: e as string | null, label: e }))}
                  selectedValue={detalhe.etapa}
                  isOpen={isEtapaOpen}
                  onToggle={() => setIsEtapaOpen((o) => !o)}
                  onSelect={(v) => v && handleMoverEtapa(v)}
                />
              </View>
              {isMoving ? <ActivityIndicator color="#1F3A5F" style={{ marginTop: 8 }} /> : null}
            </View>

            <View style={rsStyles.chartCard}>
              <Text style={rsStyles.sectionTitle}>Documentos</Text>
              <Text style={rsStyles.listRowMeta}>
                {detalhe.documentos?.aprovados ?? 0} de {detalhe.documentos?.total ?? 0} aprovados
              </Text>
            </View>

            {detalhe.etapas && detalhe.etapas.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Histórico de etapas</Text>
                {detalhe.etapas.map((item, idx) => (
                  <Text key={idx} style={[rsStyles.listRowMeta, { marginTop: 4 }]}>
                    {pickRsField(item, ['etapa', 'nome']) ?? '—'} — {formatDateTimeBR(pickRsField(item, ['data', 'criado_em', 'data_hora']))}
                  </Text>
                ))}
              </View>
            ) : null}

            {detalhe.avaliacoes && detalhe.avaliacoes.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Avaliações</Text>
                {detalhe.avaliacoes.map((item, idx) => (
                  <Text key={idx} style={[rsStyles.listRowMeta, { marginTop: 4 }]}>
                    {pickRsField(item, ['nome', 'tipo']) ?? '—'}: {pickRsField(item, ['resultado', 'nota', 'status']) ?? '—'}
                  </Text>
                ))}
              </View>
            ) : null}

            <Pressable style={[rsStyles.dangerButton, { marginTop: 16 }]} onPress={handleDelete}>
              <Feather name="trash-2" size={15} color="#E6213D" />
              <Text style={rsStyles.dangerButtonText}>Excluir candidato</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// 4. Importar Currículo + Pendências
// ============================================================

export function RecrutamentoImportarCurriculoScreen({ navigation }: ScreenProps<'RecrutamentoImportarCurriculo'>) {
  const isFocused = useIsFocused();
  const [importacoes, setImportacoes] = useState<RecrutamentoImportacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRecrutamentoImportacoes()
      .then(setImportacoes)
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar as importações.')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    load();
  }, [load, isFocused]);

  const ACEITOS = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const TAMANHO_MAXIMO = 10 * 1024 * 1024;

  const handleImportar = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ACEITOS, copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if ((asset.size ?? 0) > TAMANHO_MAXIMO) {
        Alert.alert('Arquivo muito grande', 'O tamanho máximo é 10MB.');
        return;
      }
      setIsUploading(true);
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const resultado = await importarRecrutamentoCurriculo({ file_name: asset.name ?? 'curriculo.pdf', file_base64: base64 });
      Alert.alert(
        'Currículo importado',
        resultado.candidato_id ? 'Candidato criado/atualizado a partir do currículo.' : 'Currículo processado — confira os dados extraídos na listagem.'
      );
      load();
    } catch (err) {
      Alert.alert('Erro', showRsError(err, 'Não foi possível importar o currículo.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleReprocessar = (item: RecrutamentoImportacao) => {
    reprocessarRecrutamentoImportacao(item.id)
      .then(() => load())
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível reprocessar a importação.')));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={recrutamentoUserInitials} variant="recrutamento" onAvatarPress={() => navigation.navigate('RecrutamentoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RsPageHeader icon="upload" title="Importar Currículo" subtitle="Envie currículos em PDF ou Word para extração automática." />

        <Pressable style={[rsStyles.primaryButton, { justifyContent: 'center', marginBottom: 16 }]} onPress={handleImportar} disabled={isUploading}>
          {isUploading ? <ActivityIndicator color="#FFFFFF" /> : (
            <>
              <Feather name="upload" size={15} color="#FFFFFF" />
              <Text style={rsStyles.primaryButtonText}>Importar currículo</Text>
            </>
          )}
        </Pressable>

        <Text style={rsStyles.sectionTitle}>Importações recentes</Text>
        {isLoading ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <RsEmptyState message={errorMessage} />
        ) : importacoes.length === 0 ? (
          <RsEmptyState message="Nenhuma importação registrada ainda." />
        ) : (
          importacoes.map((item) => (
            <View key={item.id} style={rsStyles.dreCard}>
              <Text style={rsStyles.listRowTitle}>{item.nome_detectado ?? 'Nome não detectado'}</Text>
              <Text style={rsStyles.listRowMeta}>{item.email ?? '—'} · {item.telefone ?? '—'}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <RsBadge label={item.status} color="#1F3A5F" bg="#E8EEF6" />
                <Text style={rsStyles.listRowMeta}>{formatDateTimeBR(item.enviado_em)}</Text>
              </View>
              {item.status !== 'processado' ? (
                <Pressable style={[rsStyles.secondaryButton, { marginTop: 10 }]} onPress={() => handleReprocessar(item)}>
                  <Feather name="refresh-cw" size={13} color="#1F3A5F" />
                  <Text style={rsStyles.secondaryButtonText}>Reprocessar</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function RecrutamentoPendenciasScreen({ navigation }: ScreenProps<'RecrutamentoPendencias'>) {
  const isFocused = useIsFocused();
  const [pendencias, setPendencias] = useState<RecrutamentoPendencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRecrutamentoPendencias()
      .then(setPendencias)
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar as pendências.')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    load();
  }, [load, isFocused]);

  const handleAprovar = (item: RecrutamentoPendencia) => {
    aprovarRecrutamentoPendencia(item.id)
      .then(() => {
        Alert.alert('Aprovado', 'Documento de admissão aprovado.');
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível aprovar.')));
  };

  const handleRecusar = (item: RecrutamentoPendencia) => {
    Alert.prompt?.('Motivo da recusa', 'Descreva o motivo:', (motivo) => {
      recusarRecrutamentoPendencia(item.id, motivo || 'Não especificado')
        .then(() => load())
        .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível recusar.')));
    });
  };

  const handleCobrar = (item: RecrutamentoPendencia) => {
    cobrarRecrutamentoPendencia(item.id)
      .then(() => Alert.alert('Cobrança enviada', 'O candidato foi notificado.'))
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível enviar a cobrança.')));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={recrutamentoUserInitials} variant="recrutamento" onAvatarPress={() => navigation.navigate('RecrutamentoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RsPageHeader icon="clock" title="Pendências" subtitle="Documentos de admissão aguardando aprovação." />

        <Text style={rsStyles.countLabel}>{isLoading ? 'Carregando...' : `${pendencias.length} pendência(s)`}</Text>

        {isLoading ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <RsEmptyState message={errorMessage} />
        ) : pendencias.length === 0 ? (
          <RsEmptyState message="Nenhuma pendência no momento." />
        ) : (
          pendencias.map((item) => (
            <View key={item.id} style={rsStyles.dreCard}>
              <Text style={rsStyles.listRowTitle}>{item.candidato_nome ?? '—'}</Text>
              <Text style={rsStyles.listRowMeta}>{item.tipo ?? 'Documento de admissão'}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <RsBadge label={item.status} color="#B7791F" bg="#FCF4DE" />
                <Text style={rsStyles.listRowMeta}>{formatDateTimeBR(item.criado_em)}</Text>
              </View>
              {item.status === 'pendente' ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Pressable style={[rsStyles.secondaryButton, { flex: 1 }]} onPress={() => handleAprovar(item)}>
                    <Feather name="check" size={13} color="#18955A" />
                    <Text style={[rsStyles.secondaryButtonText, { color: '#18955A' }]}>Aprovar</Text>
                  </Pressable>
                  <Pressable style={[rsStyles.secondaryButton, { flex: 1 }]} onPress={() => handleRecusar(item)}>
                    <Feather name="x" size={13} color="#E6213D" />
                    <Text style={[rsStyles.secondaryButtonText, { color: '#E6213D' }]}>Recusar</Text>
                  </Pressable>
                  <Pressable style={[rsStyles.secondaryButton, { flex: 1 }]} onPress={() => handleCobrar(item)}>
                    <Feather name="bell" size={13} color="#1F3A5F" />
                    <Text style={rsStyles.secondaryButtonText}>Cobrar</Text>
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

// ============================================================
// 5. WhatsApp (versão enxuta — lista de conversas + chat de texto simples,
// reaproveitando o mesmo motor do Marketing com canal='rs' já aplicado no
// proxy backend; sem mídia/tags/atendentes/respostas rápidas por aqui).
// ============================================================

export function RecrutamentoWhatsAppScreen({ navigation }: ScreenProps<'RecrutamentoWhatsApp'>) {
  const isFocused = useIsFocused();
  const [conversas, setConversas] = useState<MarketingWaConversaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const [phoneAtivo, setPhoneAtivo] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MarketingWaMensagemItem[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [isNovaConversaOpen, setIsNovaConversaOpen] = useState(false);
  const [novoPhone, setNovoPhone] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoTexto, setNovoTexto] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRecrutamentoWaConversas({ q: busca || undefined })
      .then((res) => setConversas(res.itens))
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar as conversas.')))
      .finally(() => setIsLoading(false));
  }, [busca]);

  useEffect(() => {
    if (!isFocused) return;
    load();
  }, [load, isFocused]);

  const abrirChat = (phone: string) => {
    setPhoneAtivo(phone);
    setIsLoadingChat(true);
    fetchRecrutamentoWaMensagens(phone, { limit: 50 })
      .then((res) => setMensagens(res.mensagens))
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar as mensagens.')))
      .finally(() => setIsLoadingChat(false));
  };

  const handleEnviar = () => {
    if (!phoneAtivo || !novaMensagem.trim()) return;
    setIsSending(true);
    enviarRecrutamentoWaMensagem({ phone: phoneAtivo, texto: novaMensagem.trim() })
      .then(() => {
        setNovaMensagem('');
        return fetchRecrutamentoWaMensagens(phoneAtivo, { limit: 50 });
      })
      .then((res) => setMensagens(res.mensagens))
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível enviar a mensagem.')))
      .finally(() => setIsSending(false));
  };

  const handleCriarConversa = () => {
    if (!novoPhone.trim() || !novoTexto.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe o telefone e a mensagem inicial.');
      return;
    }
    criarRecrutamentoWaConversa({ phone: novoPhone.trim(), nome: novoNome.trim() || undefined, texto: novoTexto.trim() })
      .then(() => {
        setIsNovaConversaOpen(false);
        setNovoPhone('');
        setNovoNome('');
        setNovoTexto('');
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível criar a conversa.')));
  };

  if (phoneAtivo) {
    const conversa = conversas.find((c) => c.phone === phoneAtivo);
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.topBarContainer}>
          <Pressable style={rsStyles.backRow} onPress={() => setPhoneAtivo(null)}>
            <Feather name="chevron-left" size={20} color="#1F3A5F" />
            <Text style={rsStyles.backRowText}>{conversa?.display_name ?? phoneAtivo}</Text>
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
          {isLoadingChat ? (
            <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
          ) : mensagens.length === 0 ? (
            <RsEmptyState message="Sem mensagens ainda." />
          ) : (
            mensagens.map((raw, idx) => {
              const outbound = pickRsField(raw, ['direcao', 'direction']) === 'outbound';
              const texto = pickRsField(raw, ['mensagem', 'texto', 'body', 'content', 'text']) ?? '(sem texto)';
              return (
                <View key={idx} style={[rsStyles.waBubble, outbound ? rsStyles.waBubbleOut : rsStyles.waBubbleIn]}>
                  <Text style={rsStyles.waBubbleText}>{texto}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={rsStyles.composerRow}>
            <TextInput
              style={rsStyles.composerInput}
              value={novaMensagem}
              onChangeText={setNovaMensagem}
              placeholder="Digite uma mensagem..."
              placeholderTextColor="#A7AEC2"
              multiline
            />
            <Pressable style={rsStyles.composerSendBtn} onPress={handleEnviar} disabled={isSending}>
              {isSending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Feather name="send" size={16} color="#FFFFFF" />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={recrutamentoUserInitials} variant="recrutamento" onAvatarPress={() => navigation.navigate('RecrutamentoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RsPageHeader icon="message-circle" title="WhatsApp" subtitle="Conversas com candidatos (mesmo motor do Marketing, canal R&S)." />

        <RsSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar conversa..." />

        <Pressable style={[rsStyles.primaryButton, { marginTop: 10, marginBottom: 10, justifyContent: 'center' }]} onPress={() => setIsNovaConversaOpen(true)}>
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={rsStyles.primaryButtonText}>Nova conversa</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <RsEmptyState message={errorMessage} />
        ) : conversas.length === 0 ? (
          <RsEmptyState message="Nenhuma conversa encontrada." />
        ) : (
          conversas.map((conversa) => (
            <Pressable key={conversa.phone} style={rsStyles.dreCard} onPress={() => abrirChat(conversa.phone)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                  {conversa.display_name ?? conversa.phone}
                </Text>
                {conversa.nao_lidas > 0 ? <RsBadge label={String(conversa.nao_lidas)} color="#FFFFFF" bg="#1F3A5F" /> : null}
              </View>
              <Text style={rsStyles.listRowMeta} numberOfLines={1}>
                {conversa.ultima_mensagem ?? 'Sem mensagens'}
              </Text>
              <Text style={rsStyles.listRowMeta}>{formatDateTimeBR(conversa.ultima_mensagem_em)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <RsModal visible={isNovaConversaOpen} title="Nova conversa" onClose={() => setIsNovaConversaOpen(false)}>
        <RsFormLabel>Telefone*</RsFormLabel>
        <RsTextInput value={novoPhone} onChangeText={setNovoPhone} placeholder="(11) 99999-9999" keyboardType="phone-pad" />
        <RsFormLabel>Nome</RsFormLabel>
        <RsTextInput value={novoNome} onChangeText={setNovoNome} placeholder="Nome do candidato" />
        <RsFormLabel>Mensagem inicial*</RsFormLabel>
        <RsTextInput value={novoTexto} onChangeText={setNovoTexto} placeholder="Digite a mensagem..." multiline style={{ height: 90, textAlignVertical: 'top' }} />
        <Pressable style={[rsStyles.primaryButton, { justifyContent: 'center', marginTop: 12, marginBottom: 16 }]} onPress={handleCriarConversa}>
          <Text style={rsStyles.primaryButtonText}>Enviar</Text>
        </Pressable>
      </RsModal>
    </SafeAreaView>
  );
}

// ============================================================
// 6. Notificações (Rotinas + Templates) — infraestrutura compartilhada com
// Financeiro/Gestão/Administrativo/Marketing, aqui com modulo='recrutamento'.
// ============================================================

const RS_NOTIF_AUDIENCE_TO_DB: Record<NotificationAudienceType, MarketingNotifPublicoTipo> = {
  todos: 'todos',
  colaboradores: 'colaboradores',
  posto: 'postos',
  cargo: 'cargos',
};
const RS_NOTIF_AUDIENCE_FROM_DB: Record<MarketingNotifPublicoTipo, NotificationAudienceType> = {
  todos: 'todos',
  colaboradores: 'colaboradores',
  postos: 'posto',
  cargos: 'cargo',
};

function rsNotifTemplateToLocal(item: MarketingNotifTemplateItem): NotificationTemplateItem {
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

function rsNotifRoutineToLocal(item: MarketingNotifRotinaItem, realTemplates: MarketingNotifTemplateItem[]): NotificationRoutineItem {
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
    audienceType: RS_NOTIF_AUDIENCE_FROM_DB[item.publicoTipo] ?? 'todos',
    audienceCargos: item.publicoTipo === 'cargos' ? item.publicoIds : [],
    lastRunLabel: item.ultimaExecucao ? formatDateIsoBR(item.ultimaExecucao) ?? '—' : '—',
    enabled: item.isActive,
  };
}

function rsNotifRoutineToWriteBody(local: NotificationRoutineItem, realTemplates: MarketingNotifTemplateItem[]) {
  const matchedTemplate =
    local.template && local.template !== 'Mensagem customizada' ? realTemplates.find((t) => (t.nome || t.codigo) === local.template) : null;
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
    publico_tipo: RS_NOTIF_AUDIENCE_TO_DB[local.audienceType],
    publico_ids: local.audienceType === 'cargo' ? local.audienceCargos : [],
  };
}

function rsNotifTemplateToWriteBody(local: NotificationTemplateItem) {
  return {
    codigo: local.code,
    nome: local.title,
    titulo: local.messageTitle,
    mensagem: local.message,
    variaveis: local.variables,
  };
}

export function RecrutamentoNotificationsScreen({ navigation }: ScreenProps<'RecrutamentoNotifications'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;
  const isFocused = useIsFocused();

  const [activeTab, setActiveTab] = useState<'routines' | 'templates'>('routines');

  const [realRoutines, setRealRoutines] = useState<MarketingNotifRotinaItem[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [routinesError, setRoutinesError] = useState<string | null>(null);
  const [isRoutineFormOpen, setIsRoutineFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<NotificationRoutineItem | null>(null);

  const [realTemplates, setRealTemplates] = useState<MarketingNotifTemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateItem | null>(null);

  const loadTemplates = useCallback(() => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);
    fetchRecrutamentoNotifTemplates()
      .then((data) => setRealTemplates(data.templates))
      .catch((err) => setTemplatesError(showRsError(err, 'Não foi possível carregar os templates.')))
      .finally(() => setIsLoadingTemplates(false));
  }, []);

  const loadRoutines = useCallback(() => {
    setIsLoadingRoutines(true);
    setRoutinesError(null);
    fetchRecrutamentoNotifRotinas()
      .then((data) => setRealRoutines(data.rotinas))
      .catch((err) => setRoutinesError(showRsError(err, 'Não foi possível carregar as rotinas.')))
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

  const templates = useMemo(() => realTemplates.map(rsNotifTemplateToLocal), [realTemplates]);
  const routines = useMemo(() => realRoutines.map((item) => rsNotifRoutineToLocal(item, realTemplates)), [realRoutines, realTemplates]);

  const toggleRoutine = (id: string) => {
    const target = realRoutines.find((item) => item.id === id);
    if (!target) return;
    setRealRoutines((current) => current.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item)));
    updateRecrutamentoNotifRotina(id, { ativa: !target.isActive }, actorId).catch((err) => {
      Alert.alert('Erro', showRsError(err, 'Não foi possível atualizar a rotina.'));
      loadRoutines();
    });
  };

  const handleSaveRoutine = (routine: NotificationRoutineItem) => {
    const body = rsNotifRoutineToWriteBody(routine, realTemplates);
    const isExisting = realRoutines.some((item) => item.id === routine.id);
    const request = isExisting ? updateRecrutamentoNotifRotina(routine.id, body, actorId) : createRecrutamentoNotifRotina(body, actorId);
    request
      .then(() => {
        setIsRoutineFormOpen(false);
        loadRoutines();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar a rotina.')));
  };

  const handleRunRoutine = (routine: NotificationRoutineItem) => {
    executarRecrutamentoNotifRotina(routine.id, actorId)
      .then(() => {
        Alert.alert('Rotina executada', `"${routine.title}" foi executada agora.`);
        loadRoutines();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível executar a rotina.')));
  };

  const handleDeleteRoutine = (routine: NotificationRoutineItem) => {
    Alert.alert('Excluir rotina', `Tem certeza que deseja excluir "${routine.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteRecrutamentoNotifRotina(routine.id, actorId)
            .then(() => loadRoutines())
            .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir a rotina.')));
        },
      },
    ]);
  };

  const handleSaveTemplate = (template: NotificationTemplateItem) => {
    const body = rsNotifTemplateToWriteBody(template);
    const isExisting = realTemplates.some((item) => item.id === template.id);
    const request = isExisting ? updateRecrutamentoNotifTemplate(template.id, body, actorId) : createRecrutamentoNotifTemplate(body, actorId);
    request
      .then(() => {
        setIsTemplateFormOpen(false);
        loadTemplates();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar o template.')));
  };

  const handleDeleteTemplate = (template: NotificationTemplateItem) => {
    Alert.alert('Excluir template', `Tem certeza que deseja excluir "${template.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteRecrutamentoNotifTemplate(template.id, actorId)
            .then(() => loadTemplates())
            .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir o template.')));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={recrutamentoUserInitials} variant="recrutamento" onAvatarPress={() => navigation.navigate('RecrutamentoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RsPageHeader icon="bell" title="Notificações" subtitle="Envio de notificações via App, E-mail e WhatsApp." />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Pressable style={[rsStyles.filterPill, activeTab === 'routines' ? rsStyles.filterPillActive : null]} onPress={() => setActiveTab('routines')}>
            <Text style={[rsStyles.filterPillText, activeTab === 'routines' ? rsStyles.filterPillTextActive : null]}>Rotinas</Text>
          </Pressable>
          <Pressable style={[rsStyles.filterPill, activeTab === 'templates' ? rsStyles.filterPillActive : null]} onPress={() => setActiveTab('templates')}>
            <Text style={[rsStyles.filterPillText, activeTab === 'templates' ? rsStyles.filterPillTextActive : null]}>Templates</Text>
          </Pressable>
        </View>

        {activeTab === 'routines' ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={[rsStyles.countLabel, { flex: 1, minWidth: 0 }]}>
                {isLoadingRoutines ? 'Carregando...' : `${routines.length} rotina(s) cadastrada(s)`}
              </Text>
              <Pressable
                style={rsStyles.primaryButton}
                onPress={() => {
                  setEditingRoutine(null);
                  setIsRoutineFormOpen(true);
                }}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={rsStyles.primaryButtonText}>Nova rotina</Text>
              </Pressable>
            </View>

            {isLoadingRoutines ? (
              <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
            ) : routinesError ? (
              <RsEmptyState message={routinesError} />
            ) : routines.length === 0 ? (
              <RsEmptyState message="Nenhuma rotina cadastrada. Toque em Nova rotina." />
            ) : (
              routines.map((routine) => {
                const triggerMeta = notificationTriggerOptions.find((option) => option.value === routine.triggerKind) ?? notificationTriggerOptions[2];
                const channelLabels = (Object.keys(notificationChannelMeta) as Array<keyof NotificationChannels>)
                  .filter((key) => routine.channels[key])
                  .map((key) => notificationChannelMeta[key].label);
                const audienceLabel =
                  routine.audienceType === 'cargo'
                    ? `Por cargo (${routine.audienceCargos.length})`
                    : notificationAudienceOptions.find((option) => option.value === routine.audienceType)?.label ?? 'Todos os colaboradores';
                return (
                  <View key={routine.id} style={rsStyles.dreCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                        {routine.title}
                      </Text>
                      <ToggleSwitch value={routine.enabled} onValueChange={() => toggleRoutine(routine.id)} />
                    </View>
                    <Text style={rsStyles.listRowMeta}>{routine.messageTitle}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <RsBadge label={triggerMeta.label} color="#1F3A5F" bg="#E8EEF6" />
                      <Text style={rsStyles.listRowMeta} numberOfLines={1}>
                        {channelLabels.length > 0 ? channelLabels.join(', ') : 'Nenhum canal'}
                      </Text>
                      <Text style={rsStyles.listRowMeta}>{audienceLabel}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <Text style={rsStyles.listRowMeta}>
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
              <Text style={[rsStyles.countLabel, { flex: 1, minWidth: 0 }]}>{isLoadingTemplates ? 'Carregando...' : `${templates.length} template(s)`}</Text>
              <Pressable
                style={rsStyles.primaryButton}
                onPress={() => {
                  setEditingTemplate(null);
                  setIsTemplateFormOpen(true);
                }}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={rsStyles.primaryButtonText}>Novo template</Text>
              </Pressable>
            </View>

            {isLoadingTemplates ? (
              <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
            ) : templatesError ? (
              <RsEmptyState message={templatesError} />
            ) : templates.length === 0 ? (
              <RsEmptyState message="Nenhum template cadastrado ainda." />
            ) : (
              templates.map((template) => (
                <View key={template.id} style={rsStyles.dreCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {template.isSystemDefault ? <Feather name="star" size={14} color="#D79A22" /> : null}
                    <Text style={[rsStyles.listRowTitle, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
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
                  <Text style={rsStyles.listRowMeta}>{template.code}</Text>
                  <Text style={[rsStyles.listRowMeta, { marginTop: 4 }]}>{template.messageTitle}</Text>
                  <Text style={rsStyles.listRowMeta} numberOfLines={2}>
                    {template.message}
                  </Text>
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

// ============================================================
// 7. Configurações (6 abas)
// ============================================================

type RsConfigTab = 'triagem' | 'avaliacoes' | 'admissao' | 'wa' | 'alertasIa' | 'telegram';

const RS_CONFIG_TABS: Array<{ id: RsConfigTab; label: string }> = [
  { id: 'triagem', label: 'Triagem' },
  { id: 'avaliacoes', label: 'Provas e DISC' },
  { id: 'admissao', label: 'Admissão' },
  { id: 'wa', label: 'WhatsApp R&S' },
  { id: 'alertasIa', label: 'Alertas de IA' },
  { id: 'telegram', label: 'Telegram' },
];

function RsConfigTriagemTab() {
  const [modelos, setModelos] = useState<RecrutamentoTriagemModelo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecrutamentoTriagemModelo | null>(null);
  const [nome, setNome] = useState('');
  const [perguntasTexto, setPerguntasTexto] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    fetchRecrutamentoTriagemModelos()
      .then(setModelos)
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar os modelos.')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setNome('');
    setPerguntasTexto('');
    setIsFormOpen(true);
  };
  const openEdit = (m: RecrutamentoTriagemModelo) => {
    setEditing(m);
    setNome(m.nome);
    setPerguntasTexto(m.perguntas.join('\n'));
    setIsFormOpen(true);
  };
  const handleSave = () => {
    const perguntas = perguntasTexto.split('\n').map((p) => p.trim()).filter(Boolean);
    if (!nome.trim() || perguntas.length === 0) {
      Alert.alert('Campos obrigatórios', 'Informe o nome e ao menos uma pergunta.');
      return;
    }
    const request = editing ? updateRecrutamentoTriagemModelo(editing.id, { nome, perguntas }) : createRecrutamentoTriagemModelo({ nome, perguntas });
    request
      .then(() => {
        setIsFormOpen(false);
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar o modelo.')));
  };
  const handleDelete = (m: RecrutamentoTriagemModelo) => {
    Alert.alert('Excluir modelo', `Excluir "${m.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteRecrutamentoTriagemModelo(m.id).then(load).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir.'))) },
    ]);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={rsStyles.countLabel}>{isLoading ? 'Carregando...' : `${modelos.length} modelo(s)`}</Text>
        <Pressable style={rsStyles.primaryButton} onPress={openCreate}>
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={rsStyles.primaryButtonText}>Novo modelo</Text>
        </Pressable>
      </View>
      {isLoading ? (
        <ActivityIndicator color="#1F3A5F" />
      ) : modelos.length === 0 ? (
        <RsEmptyState message="Nenhum modelo de triagem cadastrado." />
      ) : (
        modelos.map((m) => (
          <View key={m.id} style={rsStyles.dreCard}>
            <Text style={rsStyles.listRowTitle}>{m.nome}</Text>
            <Text style={rsStyles.listRowMeta}>{m.perguntas.length} pergunta(s)</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 }}>
              <Pressable onPress={() => openEdit(m)} hitSlop={6}>
                <Feather name="edit-2" size={15} color="#3457D5" />
              </Pressable>
              <Pressable onPress={() => handleDelete(m)} hitSlop={6}>
                <Feather name="trash-2" size={15} color="#E6213D" />
              </Pressable>
            </View>
          </View>
        ))
      )}
      <RsModal visible={isFormOpen} title={editing ? 'Editar modelo' : 'Novo modelo de triagem'} onClose={() => setIsFormOpen(false)}>
        <RsFormLabel>Nome*</RsFormLabel>
        <RsTextInput value={nome} onChangeText={setNome} placeholder="Ex.: Triagem padrão" />
        <RsFormLabel>Perguntas* (uma por linha)</RsFormLabel>
        <RsTextInput value={perguntasTexto} onChangeText={setPerguntasTexto} multiline style={{ height: 140, textAlignVertical: 'top' }} placeholder={'Qual sua disponibilidade?\nVocê já trabalhou em posto de combustível?'} />
        <Pressable style={[rsStyles.primaryButton, { justifyContent: 'center', marginTop: 12, marginBottom: 16 }]} onPress={handleSave}>
          <Text style={rsStyles.primaryButtonText}>Salvar</Text>
        </Pressable>
      </RsModal>
    </View>
  );
}

function RsConfigAvaliacoesTab() {
  const [avaliacoes, setAvaliacoes] = useState<RecrutamentoAvaliacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecrutamentoAvaliacao | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [duracao, setDuracao] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    fetchRecrutamentoAvaliacoes()
      .then(setAvaliacoes)
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar as avaliações.')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setNome('');
    setTipo('');
    setDuracao('');
    setIsFormOpen(true);
  };
  const openEdit = (a: RecrutamentoAvaliacao) => {
    setEditing(a);
    setNome(a.nome);
    setTipo(a.tipo);
    setDuracao(a.duracao_min != null ? String(a.duracao_min) : '');
    setIsFormOpen(true);
  };
  const handleSave = () => {
    if (!nome.trim() || !tipo.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe nome e tipo (prova/disc).');
      return;
    }
    const body = { nome, tipo, duracao_min: duracao ? Number(duracao) : null };
    const request = editing ? updateRecrutamentoAvaliacao(editing.id, body) : createRecrutamentoAvaliacao(body);
    request
      .then(() => {
        setIsFormOpen(false);
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar a avaliação.')));
  };
  const handleDelete = (a: RecrutamentoAvaliacao) => {
    Alert.alert('Excluir avaliação', `Excluir "${a.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteRecrutamentoAvaliacao(a.id).then(load).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir.'))) },
    ]);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={rsStyles.countLabel}>{isLoading ? 'Carregando...' : `${avaliacoes.length} avaliação(ões)`}</Text>
        <Pressable style={rsStyles.primaryButton} onPress={openCreate}>
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={rsStyles.primaryButtonText}>Nova avaliação</Text>
        </Pressable>
      </View>
      {isLoading ? (
        <ActivityIndicator color="#1F3A5F" />
      ) : avaliacoes.length === 0 ? (
        <RsEmptyState message="Nenhuma avaliação cadastrada." />
      ) : (
        avaliacoes.map((a) => (
          <View key={a.id} style={rsStyles.dreCard}>
            <Text style={rsStyles.listRowTitle}>{a.nome}</Text>
            <Text style={rsStyles.listRowMeta}>{a.tipo}{a.duracao_min ? ` · ${a.duracao_min} min` : ''}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 }}>
              <Pressable onPress={() => openEdit(a)} hitSlop={6}>
                <Feather name="edit-2" size={15} color="#3457D5" />
              </Pressable>
              <Pressable onPress={() => handleDelete(a)} hitSlop={6}>
                <Feather name="trash-2" size={15} color="#E6213D" />
              </Pressable>
            </View>
          </View>
        ))
      )}
      <RsModal visible={isFormOpen} title={editing ? 'Editar avaliação' : 'Nova avaliação'} onClose={() => setIsFormOpen(false)}>
        <RsFormLabel>Nome*</RsFormLabel>
        <RsTextInput value={nome} onChangeText={setNome} placeholder="Ex.: Prova de conhecimentos" />
        <RsFormLabel>Tipo* (prova / disc)</RsFormLabel>
        <RsTextInput value={tipo} onChangeText={setTipo} placeholder="prova" />
        <RsFormLabel>Duração (min)</RsFormLabel>
        <RsTextInput value={duracao} onChangeText={setDuracao} placeholder="30" keyboardType="number-pad" />
        <Pressable style={[rsStyles.primaryButton, { justifyContent: 'center', marginTop: 12, marginBottom: 16 }]} onPress={handleSave}>
          <Text style={rsStyles.primaryButtonText}>Salvar</Text>
        </Pressable>
      </RsModal>
    </View>
  );
}

function RsConfigAdmissaoTab() {
  const [docs, setDocs] = useState<RecrutamentoDocAdmissao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecrutamentoDocAdmissao | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [obrigatorio, setObrigatorio] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    fetchRecrutamentoDocAdmissao()
      .then(setDocs)
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar os documentos.')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setNome('');
    setDescricao('');
    setObrigatorio(true);
    setIsFormOpen(true);
  };
  const openEdit = (d: RecrutamentoDocAdmissao) => {
    setEditing(d);
    setNome(d.nome);
    setDescricao(d.descricao ?? '');
    setObrigatorio(d.obrigatorio);
    setIsFormOpen(true);
  };
  const handleSave = () => {
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do documento.');
      return;
    }
    const body = { nome, descricao, obrigatorio };
    const request = editing ? updateRecrutamentoDocAdmissao(editing.id, body) : createRecrutamentoDocAdmissao(body);
    request
      .then(() => {
        setIsFormOpen(false);
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar.')));
  };
  const toggleAtivo = (d: RecrutamentoDocAdmissao) => {
    updateRecrutamentoDocAdmissao(d.id, { ativo: !d.ativo }).then(load).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível atualizar.')));
  };
  const handleDelete = (d: RecrutamentoDocAdmissao) => {
    Alert.alert('Excluir documento', `Excluir "${d.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteRecrutamentoDocAdmissao(d.id).then(load).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir.'))) },
    ]);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={rsStyles.countLabel}>{isLoading ? 'Carregando...' : `${docs.length} documento(s)`}</Text>
        <Pressable style={rsStyles.primaryButton} onPress={openCreate}>
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={rsStyles.primaryButtonText}>Novo documento</Text>
        </Pressable>
      </View>
      {isLoading ? (
        <ActivityIndicator color="#1F3A5F" />
      ) : docs.length === 0 ? (
        <RsEmptyState message="Nenhum documento cadastrado no catálogo de admissão." />
      ) : (
        docs.map((d) => (
          <View key={d.id} style={rsStyles.dreCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                {d.nome}
              </Text>
              <ToggleSwitch value={d.ativo} onValueChange={() => toggleAtivo(d)} />
            </View>
            {d.descricao ? <Text style={rsStyles.listRowMeta}>{d.descricao}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              {d.obrigatorio ? <RsBadge label="Obrigatório" color="#B7791F" bg="#FCF4DE" /> : <RsBadge label="Opcional" color="#5E667D" bg="#F1F2F6" />}
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Pressable onPress={() => openEdit(d)} hitSlop={6}>
                  <Feather name="edit-2" size={15} color="#3457D5" />
                </Pressable>
                <Pressable onPress={() => handleDelete(d)} hitSlop={6}>
                  <Feather name="trash-2" size={15} color="#E6213D" />
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}
      <RsModal visible={isFormOpen} title={editing ? 'Editar documento' : 'Novo documento'} onClose={() => setIsFormOpen(false)}>
        <RsFormLabel>Nome*</RsFormLabel>
        <RsTextInput value={nome} onChangeText={setNome} placeholder="Ex.: RG e CPF" />
        <RsFormLabel>Descrição</RsFormLabel>
        <RsTextInput value={descricao} onChangeText={setDescricao} placeholder="Detalhes do documento" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <Text style={rsStyles.formLabel}>Obrigatório</Text>
          <ToggleSwitch value={obrigatorio} onValueChange={() => setObrigatorio((v) => !v)} />
        </View>
        <Pressable style={[rsStyles.primaryButton, { justifyContent: 'center', marginTop: 16, marginBottom: 16 }]} onPress={handleSave}>
          <Text style={rsStyles.primaryButtonText}>Salvar</Text>
        </Pressable>
      </RsModal>
    </View>
  );
}

// "WhatsApp R&S": vincula um modelo de triagem a cada vaga aberta (a
// triagem automática via WhatsApp roda a partir desse vínculo).
function RsConfigWhatsAppTab() {
  const [vagas, setVagas] = useState<RecrutamentoVaga[]>([]);
  const [modelos, setModelos] = useState<RecrutamentoTriagemModelo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDropdownVagaId, setOpenDropdownVagaId] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    Promise.all([fetchRecrutamentoVagas({ status: 'aberta' }), fetchRecrutamentoTriagemModelos()])
      .then(([v, m]) => {
        setVagas(v);
        setModelos(m);
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar.')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleVincular = (vagaId: string, modeloId: string | null) => {
    setOpenDropdownVagaId(null);
    vincularRecrutamentoTriagemVaga(vagaId, modeloId)
      .then(() => load())
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível vincular o modelo.')));
  };

  return (
    <View>
      <Text style={[rsStyles.listRowMeta, { marginBottom: 12 }]}>
        Vincule um modelo de triagem por WhatsApp a cada vaga aberta — as perguntas serão enviadas automaticamente aos novos candidatos.
      </Text>
      {isLoading ? (
        <ActivityIndicator color="#1F3A5F" />
      ) : vagas.length === 0 ? (
        <RsEmptyState message="Nenhuma vaga aberta no momento." />
      ) : (
        vagas.map((vaga) => (
          <View key={vaga.id} style={[rsStyles.dreCard, { zIndex: openDropdownVagaId === vaga.id ? 100 : 1 }]}>
            <Text style={rsStyles.listRowTitle}>{vaga.titulo}</Text>
            <View style={{ marginTop: 8 }}>
              <RsFieldDropdown
                label={modelos.find((m) => m.id === (vaga as Record<string, unknown>).triagem_modelo_id)?.nome ?? 'Sem modelo vinculado'}
                options={[{ value: null, label: 'Sem modelo vinculado' }, ...modelos.map((m) => ({ value: m.id, label: m.nome }))]}
                selectedValue={((vaga as Record<string, unknown>).triagem_modelo_id as string | null) ?? null}
                isOpen={openDropdownVagaId === vaga.id}
                onToggle={() => setOpenDropdownVagaId((v) => (v === vaga.id ? null : vaga.id))}
                onSelect={(v) => handleVincular(vaga.id, v)}
              />
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function RsConfigAlertasIaTab() {
  const [alertas, setAlertas] = useState<RecrutamentoAlertaIa[]>([]);
  const [limiteAtivos, setLimiteAtivos] = useState(8);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    fetchRecrutamentoAlertasIa()
      .then((res) => {
        setAlertas(res.itens);
        setLimiteAtivos(res.limiteAtivos);
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar os alertas.')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ativosCount = alertas.filter((a) => a.ativo).length;

  const toggleAtivo = (a: RecrutamentoAlertaIa) => {
    if (!a.ativo && ativosCount >= limiteAtivos) {
      Alert.alert('Limite atingido', `Você pode ter no máximo ${limiteAtivos} alertas de IA ativos ao mesmo tempo.`);
      return;
    }
    updateRecrutamentoAlertaIa(a.id, { ativo: !a.ativo }).then(load).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível atualizar.')));
  };
  const handleCreate = () => {
    if (!nome.trim() || !descricao.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe nome e descrição do alerta.');
      return;
    }
    createRecrutamentoAlertaIa({ nome, descricao })
      .then(() => {
        setIsFormOpen(false);
        setNome('');
        setDescricao('');
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível criar o alerta.')));
  };
  const handleDelete = (a: RecrutamentoAlertaIa) => {
    Alert.alert('Excluir alerta', `Excluir "${a.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteRecrutamentoAlertaIa(a.id).then(load).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir.'))) },
    ]);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={rsStyles.countLabel}>
          {isLoading ? 'Carregando...' : `${ativosCount}/${limiteAtivos} ativos · ${alertas.length} cadastrado(s)`}
        </Text>
        <Pressable style={rsStyles.primaryButton} onPress={() => setIsFormOpen(true)}>
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={rsStyles.primaryButtonText}>Novo alerta</Text>
        </Pressable>
      </View>
      {isLoading ? (
        <ActivityIndicator color="#1F3A5F" />
      ) : alertas.length === 0 ? (
        <RsEmptyState message="Nenhum alerta de IA cadastrado." />
      ) : (
        alertas.map((a) => (
          <View key={a.id} style={rsStyles.dreCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                {a.nome}
              </Text>
              <ToggleSwitch value={a.ativo} onValueChange={() => toggleAtivo(a)} />
            </View>
            <Text style={rsStyles.listRowMeta}>{a.descricao}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <Pressable onPress={() => handleDelete(a)} hitSlop={6}>
                <Feather name="trash-2" size={15} color="#E6213D" />
              </Pressable>
            </View>
          </View>
        ))
      )}
      <RsModal visible={isFormOpen} title="Novo alerta de IA" onClose={() => setIsFormOpen(false)}>
        <RsFormLabel>Nome*</RsFormLabel>
        <RsTextInput value={nome} onChangeText={setNome} placeholder="Ex.: Currículo com experiência em varejo" />
        <RsFormLabel>Descrição*</RsFormLabel>
        <RsTextInput value={descricao} onChangeText={setDescricao} multiline style={{ height: 90, textAlignVertical: 'top' }} placeholder="O que a IA deve identificar no currículo" />
        <Pressable style={[rsStyles.primaryButton, { justifyContent: 'center', marginTop: 12, marginBottom: 16 }]} onPress={handleCreate}>
          <Text style={rsStyles.primaryButtonText}>Salvar</Text>
        </Pressable>
      </RsModal>
    </View>
  );
}

function RsConfigTelegramTab() {
  const [config, setConfig] = useState<RecrutamentoTelegramConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    fetchRecrutamentoTelegram()
      .then(setConfig)
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar a configuração do Telegram.')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = (patch: { ativo?: boolean; conversa_nova?: boolean; candidato_novo?: boolean }) => {
    updateRecrutamentoTelegram(patch).then(setConfig).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível atualizar.')));
  };
  const handleToggleDestino = (id: string, ativo: boolean) => {
    updateRecrutamentoTelegramDestino(id, { ativo: !ativo }).then(load).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível atualizar o destino.')));
  };
  const handleRemoverDestino = (id: string) => {
    Alert.alert('Remover destino', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deleteRecrutamentoTelegramDestino(id).then(load).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível remover.'))) },
    ]);
  };
  const handleTeste = () => {
    enviarRecrutamentoTelegramTeste()
      .then(() => Alert.alert('Enviado', 'Mensagem de teste enviada ao Telegram.'))
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível enviar o teste.')));
  };

  if (isLoading || !config) {
    return <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />;
  }

  return (
    <View>
      <View style={rsStyles.dreCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={rsStyles.listRowTitle}>Alertas ativos</Text>
          <ToggleSwitch value={config.ativo} onValueChange={() => handleUpdate({ ativo: !config.ativo })} />
        </View>
        {config.bot_username ? <Text style={rsStyles.listRowMeta}>Bot: @{config.bot_username}</Text> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <Text style={rsStyles.formLabel}>Nova conversa no WhatsApp</Text>
          <ToggleSwitch value={config.conversa_nova} onValueChange={() => handleUpdate({ conversa_nova: !config.conversa_nova })} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <Text style={rsStyles.formLabel}>Novo candidato</Text>
          <ToggleSwitch value={config.candidato_novo} onValueChange={() => handleUpdate({ candidato_novo: !config.candidato_novo })} />
        </View>
        <Pressable style={[rsStyles.secondaryButton, { marginTop: 12 }]} onPress={handleTeste}>
          <Feather name="send" size={13} color="#1F3A5F" />
          <Text style={rsStyles.secondaryButtonText}>Enviar teste</Text>
        </Pressable>
      </View>

      <Text style={[rsStyles.sectionTitle, { marginTop: 14 }]}>Destinos cadastrados</Text>
      {config.destinos.length === 0 ? (
        <RsEmptyState message="Nenhum destino cadastrado no Telegram." />
      ) : (
        config.destinos.map((d) => (
          <View key={d.id} style={rsStyles.dreCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                {d.nome}
              </Text>
              <ToggleSwitch value={d.ativo} onValueChange={() => handleToggleDestino(d.id, d.ativo)} />
            </View>
            {d.ultimo_aviso ? <Text style={rsStyles.listRowMeta}>Último aviso: {formatDateTimeBR(d.ultimo_aviso)}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <Pressable onPress={() => handleRemoverDestino(d.id)} hitSlop={6}>
                <Feather name="trash-2" size={15} color="#E6213D" />
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export function RecrutamentoConfiguracoesScreen({ navigation }: ScreenProps<'RecrutamentoConfiguracoes'>) {
  const [activeTab, setActiveTab] = useState<RsConfigTab>('triagem');

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={recrutamentoUserInitials} variant="recrutamento" onAvatarPress={() => navigation.navigate('RecrutamentoProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RsPageHeader icon="settings" title="Configurações" subtitle="Triagem, avaliações, admissão, WhatsApp e alertas." />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
          {RS_CONFIG_TABS.map((tab) => (
            <Pressable
              key={tab.id}
              style={[rsStyles.filterPill, activeTab === tab.id ? rsStyles.filterPillActive : null]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[rsStyles.filterPillText, activeTab === tab.id ? rsStyles.filterPillTextActive : null]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {activeTab === 'triagem' ? <RsConfigTriagemTab /> : null}
        {activeTab === 'avaliacoes' ? <RsConfigAvaliacoesTab /> : null}
        {activeTab === 'admissao' ? <RsConfigAdmissaoTab /> : null}
        {activeTab === 'wa' ? <RsConfigWhatsAppTab /> : null}
        {activeTab === 'alertasIa' ? <RsConfigAlertasIaTab /> : null}
        {activeTab === 'telegram' ? <RsConfigTelegramTab /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// 8. Perfil
// ============================================================

export function RecrutamentoProfileScreen({ navigation }: ScreenProps<'RecrutamentoProfile'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={recrutamentoUserInitials} variant="recrutamento" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RsPageHeader icon="user" title="Meu Perfil" subtitle={recrutamentoUser.accessLabel} />
        <View style={rsStyles.chartCard}>
          <View style={rsStyles.profileAvatar}>
            <Text style={rsStyles.profileAvatarText}>{recrutamentoUserInitials}</Text>
          </View>
          <Text style={rsStyles.profileName}>{recrutamentoUser.fullName}</Text>
          <Text style={rsStyles.profileRole}>{recrutamentoUser.roleAndUnit}</Text>
          <View style={rsStyles.profileFieldRow}>
            <Feather name="mail" size={14} color="#5E667D" />
            <Text style={rsStyles.profileFieldText}>{recrutamentoUser.email}</Text>
          </View>
          <View style={rsStyles.profileFieldRow}>
            <Feather name="phone" size={14} color="#5E667D" />
            <Text style={rsStyles.profileFieldText}>{recrutamentoUser.phone}</Text>
          </View>
        </View>
        <Pressable
          style={rsStyles.dangerButton}
          onPress={() => {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }}
        >
          <Feather name="log-out" size={15} color="#E6213D" />
          <Text style={rsStyles.dangerButtonText}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// Estilos locais
// ============================================================

const rsStyles = StyleSheet.create({
  pageHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  pageHeaderIconShell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#15203E' },
  pageHeaderSubtitle: { fontSize: 12, color: '#7C8397', marginTop: 2 },
  emptyCard: { backgroundColor: '#F8F9FC', borderRadius: 14, padding: 20, alignItems: 'center', marginTop: 10 },
  emptyText: { color: '#7C8397', fontSize: 13, textAlign: 'center' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F2F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#15203E' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,20,40,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#15203E' },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#5E667D', marginTop: 12, marginBottom: 6 },
  textInput: {
    backgroundColor: '#F1F2F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#15203E',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F2F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectButtonText: { fontSize: 14, color: '#15203E', flex: 1, minWidth: 0 },
  overlayDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 200,
  },
  overlayDropdownItem: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  overlayDropdownItemText: { fontSize: 14, color: '#15203E' },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  kpiLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#15203E', marginTop: 2 },
  kpiLabelUnidade: { fontSize: 10, color: '#8A93A8', marginTop: 2 },
  periodoSegmentRow: { flexDirection: 'row', backgroundColor: '#F1F2F6', borderRadius: 10, padding: 2 },
  periodoSegmentButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  periodoSegmentButtonActive: { backgroundColor: '#FFFFFF' },
  periodoSegmentText: { fontSize: 12, color: '#7C8397', fontWeight: '700' },
  periodoSegmentTextActive: { color: '#1F3A5F' },
  monthNavButton: { padding: 6 },
  monthLabel: { fontSize: 13, fontWeight: '700', color: '#15203E', flex: 1, textAlign: 'center' },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#15203E', marginBottom: 8 },
  listRowMeta: { fontSize: 12, color: '#7C8397' },
  listRowValue: { fontSize: 13, fontWeight: '800', color: '#15203E' },
  listRowTitle: { fontSize: 14, fontWeight: '800', color: '#15203E' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  funilBarTrack: { height: 8, borderRadius: 4, backgroundColor: '#F1F2F6', marginTop: 4, overflow: 'hidden' },
  funilBarFill: { height: 8, borderRadius: 4 },
  countLabel: { fontSize: 12, color: '#7C8397', fontWeight: '700' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F3A5F',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8EEF6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: { color: '#1F3A5F', fontSize: 12, fontWeight: '800' },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FCEAEA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dangerButtonText: { color: '#E6213D', fontSize: 13, fontWeight: '800' },
  dreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F2F6' },
  filterPillActive: { backgroundColor: '#1F3A5F' },
  filterPillText: { fontSize: 12, fontWeight: '700', color: '#5E667D' },
  filterPillTextActive: { color: '#FFFFFF' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  backRowText: { fontSize: 15, fontWeight: '800', color: '#1F3A5F' },
  waBubble: { maxWidth: '80%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  waBubbleIn: { backgroundColor: '#F1F2F6', alignSelf: 'flex-start' },
  waBubbleOut: { backgroundColor: '#E8EEF6', alignSelf: 'flex-end' },
  waBubbleText: { fontSize: 14, color: '#15203E' },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDEFF5',
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#F1F2F6',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#15203E',
    maxHeight: 100,
  },
  composerSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1F3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  profileAvatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  profileName: { fontSize: 16, fontWeight: '800', color: '#15203E', textAlign: 'center' },
  profileRole: { fontSize: 12, color: '#7C8397', textAlign: 'center', marginBottom: 12 },
  profileFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  profileFieldText: { fontSize: 13, color: '#15203E' },
});
