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
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PieChart, LineChart } from 'react-native-gifted-charts';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import {
  styles,
  TopBar,
  marketingUser,
  marketingUserInitials,
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
  fetchMarketingDashboard,
  fetchMarketingOcorrencias,
  fetchMarketingOcorrencia,
  createMarketingOcorrencia,
  createMarketingMensagem,
  createMarketingAnexo,
  updateMarketingOcorrencia,
  fetchRhColaboradores,
  fetchMarketingWaConversas,
  fetchMarketingWaMensagens,
  sendMarketingWaMensagem,
  createMarketingWaConversa,
  updateMarketingWaConversa,
  sincronizarMarketingWaConversas,
  marcarMarketingWaLido,
  fetchMarketingWaAgenda,
  fetchMarketingWaTags,
  fetchMarketingWaTemplates,
  enviarMarketingWaTemplate,
  fetchMarketingWaSugestoes,
  type MarketingWaSugestao,
  fetchMarketingWaRespostas,
  salvarMarketingWaResposta,
  excluirMarketingWaResposta,
  fetchMarketingWaAtendentes,
  fetchMarketingWaMidiaLimites,
  sendMarketingWaMidia,
  ApiError,
  fetchMarketingGmb,
  fetchMarketingGmbReviews,
  responderMarketingGmbReview,
  fetchMarketingLevaMaisMetricas,
  fetchMarketingLevaMaisLojas,
  fetchMarketingLevaMaisFrentistas,
  fetchMarketingLevaMaisStatus,
  fetchMarketingNotifRotinas,
  createMarketingNotifRotina,
  updateMarketingNotifRotina,
  deleteMarketingNotifRotina,
  executarMarketingNotifRotina,
  fetchMarketingNotifTemplates,
  createMarketingNotifTemplate,
  updateMarketingNotifTemplate,
  deleteMarketingNotifTemplate,
  type MarketingDashboardData,
  type MarketingOcorrenciaItem,
  type MarketingOcorrenciaFiltro,
  type MarketingOcorrenciaDetalhe,
  type MarketingOcorrenciaStatus,
  type MarketingOcorrenciaPrioridade,
  type MarketingWaConversaItem,
  type MarketingWaChatStatus,
  type MarketingWaContadores,
  type MarketingWaContatoInfo,
  type MarketingWaAgendaContato,
  type MarketingWaTemplate,
  type MarketingWaResposta,
  type MarketingWaMidiaTipo,
  type MarketingGmbData,
  type MarketingGmbReviewItem,
  type MarketingLevaMaisMetricas,
  type MarketingLevaMaisLoja,
  type MarketingLevaMaisFrentista,
  type MarketingLevaMaisStatus,
  type MarketingNotifRotinaItem,
  type MarketingNotifTemplateItem,
  type MarketingNotifPublicoTipo,
  type RhColaboradorRaw,
} from './api';

// --- Helpers genéricos (mesmo padrão do Administrativo.tsx/Gestao.tsx) ---

function formatBRL(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumeroBR(value: number | null | undefined, decimais = 0): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
}

function formatPercentBR(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

// Máscara incremental: "11999998888" -> "(11) 99999-8888". Aceita telefone
// fixo (10 dígitos) também: "(11) 9999-8888".
function formatTelefoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function showMktError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  return message || fallback;
}

// "2026-08-06" -> "06/08"
function formatDiaCurto(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const [, , month, day] = match;
  return `${day}/${month}`;
}

function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatHoraBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Divisor de data no estilo WhatsApp: "HOJE" / "ONTEM" / "29 DE AGOSTO DE 2026".
function formatDiaDivisorWA(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  const mesmoDia = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (mesmoDia(d, hoje)) return 'HOJE';
  if (mesmoDia(d, ontem)) return 'ONTEM';
  const meses = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
  ];
  return `${d.getDate()} DE ${meses[d.getMonth()]} DE ${d.getFullYear()}`;
}

// Extrai o texto de uma mensagem do WhatsApp. O contrato exato do nome do
// campo de texto nunca foi confirmado pela Lovable, então além das chaves
// mais prováveis, tenta achar QUALQUER outro campo de texto não-metadado no
// objeto — mostrar o dado bruto real é melhor do que esconder a mensagem
// atrás de um "—" que não diz nada de verdade sobre o que veio da API.
function extractMktWaTexto(raw: Record<string, unknown>): string {
  const known = pickMktField(raw, [
    'mensagem', 'texto', 'body', 'content', 'text', 'message', 'conteudo', 'caption', 'texto_mensagem', 'body_text', 'msg',
  ]);
  if (known) return known;
  const ignorarChaves = new Set([
    'id', 'created_at', 'timestamp', 'data', 'direcao', 'direction', 'tipo', 'type', 'phone', 'telefone', 'status', 'wa_id', 'message_id',
  ]);
  const candidato = Object.entries(raw).find(
    ([chave, valor]) => !ignorarChaves.has(chave) && typeof valor === 'string' && valor.trim().length > 0
  );
  return candidato ? String(candidato[1]) : '(mensagem sem texto — contrato do campo não confirmado)';
}

// Chave (AAAA-MM-DD local) usada só pra agrupar mensagens por dia antes de
// renderizar os divisores "HOJE"/"ONTEM"/data — não depende de fuso do texto.
function diaChaveWA(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Extrator defensivo pra campos cujo formato exato ainda não foi confirmado
// pela Lovable (ex.: mensagens do WhatsApp, série diária do Leva+) — nunca
// inventa valor, só tenta nomes de chave alternativos e mostra "—"/estado
// vazio honesto quando nenhum bate.
function pickMktField(item: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
  }
  return null;
}

function pickMktNumber(item: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const mktMesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function mktPeriodoDatas(periodo: 'mes' | 'ano', refMes: number, refAno: number): { dataInicial: string; dataFinal: string } {
  if (periodo === 'ano') {
    return { dataInicial: `${refAno}-01-01`, dataFinal: `${refAno}-12-31` };
  }
  const inicio = new Date(refAno, refMes - 1, 1);
  const fim = new Date(refAno, refMes, 0);
  return { dataInicial: toIsoDate(inicio), dataFinal: toIsoDate(fim) };
}

function useMktPeriodoNav() {
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

function MktPeriodoFiltro({
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
  const periodoLabel = periodo === 'ano' ? String(refAno) : `${mktMesesNomes[refMes - 1]} / ${refAno}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <View style={mkStyles.periodoSegmentRow}>
        {(['mes', 'ano'] as const).map((opt) => {
          const isActive = periodo === opt;
          return (
            <Pressable
              key={opt}
              style={[mkStyles.periodoSegmentButton, isActive ? mkStyles.periodoSegmentButtonActive : null]}
              onPress={() => onChangePeriodo(opt)}
            >
              <Text style={[mkStyles.periodoSegmentText, isActive ? mkStyles.periodoSegmentTextActive : null]}>
                {opt === 'mes' ? 'Mês' : 'Ano'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={onAnterior} style={mkStyles.monthNavButton}>
        <Feather name="chevron-left" size={16} color="#5E667D" />
      </Pressable>
      <Text style={mkStyles.monthLabel} numberOfLines={1}>
        {periodoLabel}
      </Text>
      <Pressable onPress={onProximo} style={mkStyles.monthNavButton}>
        <Feather name="chevron-right" size={16} color="#5E667D" />
      </Pressable>
      <Pressable onPress={onReset} style={mkStyles.monthNavButton}>
        <Feather name="rotate-ccw" size={14} color="#5E667D" />
      </Pressable>
    </View>
  );
}

function MktPageHeader({ icon, title, subtitle }: { icon: keyof typeof Feather.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={mkStyles.pageHeaderRow}>
      <View style={mkStyles.pageHeaderIconShell}>
        <Feather name={icon} size={20} color="#C2255C" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={mkStyles.pageHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={mkStyles.pageHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function MktEmptyState({ message }: { message: string }) {
  return (
    <View style={mkStyles.emptyCard}>
      <Text style={mkStyles.emptyText}>{message}</Text>
    </View>
  );
}

function MktSearchInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={mkStyles.searchRow}>
      <Feather name="search" size={15} color="#8A93A8" />
      <TextInput
        style={mkStyles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8A93A8"
      />
    </View>
  );
}

function MktModal({
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
        <Pressable style={mkStyles.modalBackdrop} onPress={onClose}>
          <Pressable style={[mkStyles.modalCard, { maxHeight: '86%' }]} onPress={() => {}}>
            <View style={mkStyles.modalHeader}>
              <Text style={mkStyles.modalTitle}>{title}</Text>
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

// Sem <Modal> aninhado — usado dentro de formulários que já estão dentro de
// um MktModal (dois <Modal> nativos abertos ao mesmo tempo não recebem
// toque de forma confiável, lição aprendida no Administrativo).
function MktInlineSelect<T extends string | null>({
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
      <Pressable style={mkStyles.selectButton} onPress={() => setOpen((o) => !o)}>
        <Text style={mkStyles.selectButtonText} numberOfLines={1}>
          {label}
        </Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#5E667D" />
      </Pressable>
      {open ? (
        <View style={mkStyles.statusMenu}>
          {options.map((opt) => (
            <Pressable
              key={opt.label}
              style={mkStyles.statusMenuItem}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <Text style={[mkStyles.statusMenuItemText, selectedValue === opt.value ? { color: '#C2255C', fontWeight: '800' } : null]}>
                {opt.label}
              </Text>
              {selectedValue === opt.value ? <Feather name="check" size={14} color="#C2255C" style={{ marginLeft: 'auto' }} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MktFormLabel({ children }: { children: React.ReactNode }) {
  return <Text style={mkStyles.formLabel}>{children}</Text>;
}

// Dropdown que flutua POR CIMA do restante do conteúdo (igual ao <select>
// nativo do web), em vez de empurrar o layout pra baixo como o
// MktInlineSelect. Não usa <Modal> (evitando o bug de dois <Modal> nativos
// abertos ao mesmo tempo não responderem a toque) — é só um View absoluto
// com zIndex/elevation alto, renderizado como último filho do campo.
function MktFieldDropdown<T extends string | null>({
  label,
  options,
  selectedValue,
  isOpen,
  onToggle,
  onSelect,
  searchable,
}: {
  label: string;
  options: Array<{ value: T; label: string; color?: string }>;
  selectedValue: T;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
  searchable?: boolean;
}) {
  const [busca, setBusca] = useState('');
  const filtered = searchable && busca.trim() ? options.filter((o) => o.label.toLowerCase().includes(busca.trim().toLowerCase())) : options;
  // Corta a lista renderizada em vez de usar FlatList: uma VirtualizedList
  // (FlatList) aninhada dentro do ScrollView do modal quebra de verdade em
  // produção ("VirtualizedLists should never be nested inside plain
  // ScrollViews..."), então em vez de virtualizar, só limitamos quantos
  // Pressables são montados de uma vez — rápido de abrir mesmo com centenas
  // de opções (ex.: os 900+ colaboradores), e a busca estreita o restante.
  const LIMITE_RENDERIZADO = 60;
  const cortada = filtered.length > LIMITE_RENDERIZADO;
  const paraRenderizar = cortada ? filtered.slice(0, LIMITE_RENDERIZADO) : filtered;
  return (
    <View style={{ position: 'relative', zIndex: isOpen ? 200 : 1 }}>
      <Pressable style={mkStyles.selectButton} onPress={onToggle}>
        <Text style={mkStyles.selectButtonText} numberOfLines={1}>
          {label}
        </Text>
        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#5E667D" />
      </Pressable>
      {isOpen ? (
        <View style={mkStyles.overlayDropdown}>
          {searchable ? (
            <TextInput
              style={mkStyles.overlayDropdownSearch}
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar..."
              placeholderTextColor="#A7AEC2"
            />
          ) : null}
          <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
            {paraRenderizar.map((opt, idx) => {
              const isSelected = selectedValue === opt.value;
              return (
                <Pressable
                  key={`${opt.label}-${idx}`}
                  style={[mkStyles.overlayDropdownItem, isSelected ? { backgroundColor: opt.color ?? '#C2255C' } : null]}
                  onPress={() => {
                    onSelect(opt.value);
                    setBusca('');
                  }}
                >
                  <Text style={[mkStyles.overlayDropdownItemText, isSelected ? { color: '#FFFFFF', fontWeight: '800' } : null]} numberOfLines={1}>
                    {opt.label}
                  </Text>
                  {isSelected ? <Feather name="check" size={14} color="#FFFFFF" style={{ marginLeft: 'auto' }} /> : null}
                </Pressable>
              );
            })}
            {cortada ? (
              <Text style={[mkStyles.listRowMeta, { textAlign: 'center', paddingVertical: 8 }]}>
                Mostrando {LIMITE_RENDERIZADO} de {filtered.length} — digite pra refinar a busca.
              </Text>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function MktSelectButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={mkStyles.selectButton} onPress={onPress}>
      <Text style={mkStyles.selectButtonText} numberOfLines={1}>
        {label}
      </Text>
      <Feather name="chevron-down" size={16} color="#5E667D" />
    </Pressable>
  );
}

function MktSelectModal<T extends string | null>({
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
      <Pressable style={mkStyles.modalBackdrop} onPress={onClose}>
        <Pressable style={mkStyles.modalCard} onPress={() => {}}>
          <View style={mkStyles.modalHeader}>
            <Text style={mkStyles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <Pressable
                key={opt.label}
                style={mkStyles.filterOptionRow}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <Text
                  style={[mkStyles.filterOptionRowText, selectedValue === opt.value ? mkStyles.filterOptionRowTextActive : null]}
                >
                  {opt.label}
                </Text>
                {selectedValue === opt.value ? <Feather name="check" size={16} color="#C2255C" /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// --- 1. Dashboard ---

// Cards brancos com faixa colorida à esquerda (mesmo padrão do painel web),
// em vez de preencher o card inteiro com a cor.
function MktKpiCard({
  icon,
  color,
  label,
  value,
  subtitle,
}: {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <View style={[mkStyles.kpiCard, { borderLeftColor: color }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name={icon} size={12} color={color} />
        <Text style={[mkStyles.kpiLabel, { color }]}>{label}</Text>
      </View>
      <Text style={mkStyles.kpiValue}>{value}</Text>
      {subtitle ? <Text style={mkStyles.kpiLabelUnidade}>{subtitle}</Text> : null}
    </View>
  );
}

function MktDashboardListCard({
  title,
  icon,
  items,
  children,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  items: Array<Record<string, unknown>>;
  children: (item: Record<string, unknown>, idx: number) => React.ReactNode;
}) {
  return (
    <View style={[mkStyles.chartCard, { flex: 1, minWidth: 0 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Feather name={icon} size={13} color="#5E667D" />
        <Text style={[mkStyles.sectionTitle, { marginBottom: 0 }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {items.length === 0 ? (
        <Text style={mkStyles.listRowMeta}>Sem dados.</Text>
      ) : (
        items.map((item, idx) => <View key={idx}>{children(item, idx)}</View>)
      )}
    </View>
  );
}

const OCORRENCIA_STATUS_COLORS: Record<string, string> = {
  aberto: '#E0435B',
  em_atendimento: '#3E92CC',
  aguardando_cliente: '#E8A33D',
  resolvido: '#2FB170',
  cancelado: '#9AA3B5',
};

export function MarketingDashboardScreen({ navigation }: ScreenProps<'MarketingDashboard'>) {
  const { periodo, setPeriodo, refMes, refAno, handleAnterior, handleProximo, handleReset } = useMktPeriodoNav();
  const [data, setData] = useState<MarketingDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [waPointerIdx, setWaPointerIdx] = useState<number | null>(null);

  // Leva+ não faz parte do contrato do endpoint /dashboard (confirmado pela
  // Lovable só com ocorrências/whatsapp/google) — por isso é buscado à parte
  // aqui, no mesmo período, igual o painel web faz pra montar o card
  // "Fidelidade Leva+".
  const [levaMais, setLevaMais] = useState<MarketingLevaMaisMetricas | null>(null);
  const [isLoadingLevaMais, setIsLoadingLevaMais] = useState(true);
  const [levaMaisError, setLevaMaisError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const { dataInicial, dataFinal } = mktPeriodoDatas(periodo, refMes, refAno);
    fetchMarketingDashboard({ dataInicial, dataFinal })
      .then(setData)
      .catch((err) => setErrorMessage(showMktError(err, 'Não foi possível carregar o dashboard.')))
      .finally(() => setIsLoading(false));

    setIsLoadingLevaMais(true);
    setLevaMaisError(null);
    fetchMarketingLevaMaisMetricas({ startDate: dataInicial, endDate: dataFinal })
      .then(setLevaMais)
      .catch((err) => setLevaMaisError(showMktError(err, 'Não foi possível carregar o Leva+.')))
      .finally(() => setIsLoadingLevaMais(false));
  }, [periodo, refMes, refAno]);

  const ocorrenciasStatusPie = data
    ? [
        { status: 'aberto', label: 'Abertas', total: data.ocorrencias.abertas },
        { status: 'em_atendimento', label: 'Em atendimento', total: data.ocorrencias.em_atendimento },
        { status: 'aguardando_cliente', label: 'Aguardando cliente', total: data.ocorrencias.aguardando_cliente },
        { status: 'resolvido', label: 'Resolvidas', total: data.ocorrencias.resolvidas },
        { status: 'cancelado', label: 'Canceladas', total: data.ocorrencias.canceladas },
      ].filter((item) => item.total > 0)
    : [];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={marketingUserInitials} variant="marketing" onAvatarPress={() => navigation.navigate('MarketingProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MktPageHeader icon="grid" title="Dashboard" subtitle="Métricas de marketing e fidelidade." />

        <MktPeriodoFiltro
          periodo={periodo}
          onChangePeriodo={setPeriodo}
          refMes={refMes}
          refAno={refAno}
          onAnterior={handleAnterior}
          onProximo={handleProximo}
          onReset={handleReset}
        />

        {isLoading ? (
          <ActivityIndicator color="#C2255C" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <MktEmptyState message={errorMessage} />
        ) : !data ? (
          <MktEmptyState message="Sem dados disponíveis." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <MktKpiCard icon="mail" color="#C2255C" label="TOTAL" value={formatNumeroBR(data.ocorrencias.total)} subtitle="Ocorrências no mês selecionado" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <MktKpiCard icon="alert-circle" color="#C2255C" label="ABERTAS" value={formatNumeroBR(data.ocorrencias.abertas)} subtitle="Aguardando atendimento" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <MktKpiCard icon="clock" color="#C2255C" label="EM ATENDIMENTO" value={formatNumeroBR(data.ocorrencias.em_atendimento)} subtitle="Em andamento" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <MktKpiCard
                  icon="check-circle"
                  color="#C2255C"
                  label="RESOLVIDAS"
                  value={formatNumeroBR(data.ocorrencias.resolvidas)}
                  subtitle={`TMR: ${data.ocorrencias.tempo_medio_primeira_resposta_segundos != null ? `${Math.round(data.ocorrencias.tempo_medio_primeira_resposta_segundos / 60)} min` : '—'}`}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <MktKpiCard icon="alert-triangle" color="#C2255C" label="ATRASADAS SLA" value={formatNumeroBR(data.ocorrencias.atrasadas)} subtitle="No prazo" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <MktKpiCard
                  icon="message-circle"
                  color="#C2255C"
                  label="WHATSAPP"
                  value={formatNumeroBR(data.whatsapp.inbound)}
                  subtitle={`recebidas · ${formatNumeroBR(data.whatsapp.novos_contatos)} novos contatos no período`}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <MktKpiCard
                  icon="send"
                  color="#C2255C"
                  label="ENVIADAS"
                  value={formatNumeroBR(data.whatsapp.outbound)}
                  subtitle={`mensagens · ${formatNumeroBR(data.whatsapp.na_fila)} na fila`}
                />
              </View>
            </View>

            <View style={mkStyles.chartCard}>
              <Text style={mkStyles.sectionTitle}>Fidelidade Leva+</Text>
              {isLoadingLevaMais ? (
                <ActivityIndicator color="#C2255C" style={{ marginTop: 8 }} />
              ) : levaMaisError ? (
                <Text style={[mkStyles.listRowMeta, { color: '#C2263A' }]}>{levaMaisError}</Text>
              ) : !levaMais ? (
                <MktEmptyState message="Sem dados do Leva+ no período." />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 6 }}>
                  <View style={{ minWidth: '40%' }}>
                    <Text style={mkStyles.listRowMeta}>CLIENTES</Text>
                    <Text style={mkStyles.listRowValue}>{formatNumeroBR(levaMais.totals.totalRegisteredClients)}</Text>
                    <Text style={mkStyles.listRowMeta}>cadastrados</Text>
                  </View>
                  <View style={{ minWidth: '40%' }}>
                    <Text style={mkStyles.listRowMeta}>VENDAS</Text>
                    <Text style={mkStyles.listRowValue}>{formatBRL(levaMais.totals.totalRevenue)}</Text>
                    <Text style={mkStyles.listRowMeta}>no período</Text>
                  </View>
                  <View style={{ minWidth: '40%' }}>
                    <Text style={mkStyles.listRowMeta}>TICKET MÉDIO</Text>
                    <Text style={mkStyles.listRowValue}>{formatBRL(levaMais.totals.avgTicket)}</Text>
                  </View>
                  <View style={{ minWidth: '40%' }}>
                    <Text style={mkStyles.listRowMeta}>POSTOS ATIVOS</Text>
                    <Text style={mkStyles.listRowValue}>{formatNumeroBR(levaMais.byStore.filter((s) => s.transactionCount > 0).length)}</Text>
                    <Text style={mkStyles.listRowMeta}>com venda</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={mkStyles.chartCard}>
              <Text style={mkStyles.sectionTitle}>Google Meu Negócio</Text>
              {data.google.conectado ? (
                <>
                  <Text style={mkStyles.listRowMeta}>{data.google.postos} posto(s) conectado(s)</Text>
                  {data.google.status === 'aguardando_liberacao' ? (
                    <Text style={[mkStyles.listRowMeta, { marginTop: 4, color: '#8A6D1D' }]}>
                      Aguardando liberação da Business Profile API pelo Google.
                    </Text>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                      <Text style={mkStyles.listRowValue}>{data.google.nota_media != null ? data.google.nota_media.toFixed(1) : '—'} ★</Text>
                      <Text style={mkStyles.listRowMeta}>{formatNumeroBR(data.google.total_avaliacoes)} avaliações</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={mkStyles.listRowMeta}>Conta do Google ainda não conectada.</Text>
              )}
            </View>

            <View style={mkStyles.chartCard}>
              <Text style={mkStyles.sectionTitle}>Ocorrências por status</Text>
              {ocorrenciasStatusPie.length === 0 ? (
                <MktEmptyState message="Nenhuma ocorrência no período selecionado." />
              ) : (
                <View style={{ alignItems: 'center', marginVertical: 8 }}>
                  <PieChart
                    data={ocorrenciasStatusPie.map((item) => ({
                      value: item.total,
                      color: OCORRENCIA_STATUS_COLORS[item.status] ?? '#9AA3B5',
                      text: item.label,
                    }))}
                    donut
                    radius={78}
                    innerRadius={48}
                    focusOnPress
                    toggleFocusOnPress
                    centerLabelComponent={() => (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={mkStyles.pieCenterValue}>{formatNumeroBR(data.ocorrencias.total)}</Text>
                        <Text style={mkStyles.pieCenterLabel}>Total</Text>
                      </View>
                    )}
                  />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 10 }}>
                    {ocorrenciasStatusPie.map((item) => (
                      <View key={item.status} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[mkStyles.legendDot, { backgroundColor: OCORRENCIA_STATUS_COLORS[item.status] ?? '#9AA3B5' }]} />
                        <Text style={mkStyles.listRowMeta}>{item.label} ({formatNumeroBR(item.total)})</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {data.serie_diaria.length > 0 ? (
              <View style={mkStyles.chartCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={mkStyles.sectionTitle}>Volume de mensagens WhatsApp</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={[mkStyles.legendDot, { backgroundColor: '#C2255C' }]} />
                    <Text style={mkStyles.listRowMeta}>Mensagens</Text>
                  </View>
                </View>
                <Text style={[mkStyles.listRowMeta, { marginTop: -4, marginBottom: 10 }]}>Recebidas por dia, no período selecionado — toque para ver o valor.</Text>
                <LineChart
                  data={data.serie_diaria.map((p) => ({ value: p.inbound }))}
                  color="#C2255C"
                  thickness={2}
                  dataPointsColor="#C2255C"
                  dataPointsRadius={3}
                  height={120}
                  noOfSections={4}
                  xAxisLabelsHeight={0}
                  yAxisTextStyle={{ color: '#8891A6', fontSize: 9 }}
                  xAxisColor="#E2E6F0"
                  yAxisColor="#E2E6F0"
                  rulesColor="#F1F2F6"
                  rulesType="solid"
                  initialSpacing={8}
                  endSpacing={8}
                  pointerConfig={{
                    pointerStripHeight: 120,
                    pointerStripColor: '#E2E6F0',
                    pointerStripWidth: 2,
                    pointerColor: '#C2255C',
                    radius: 5,
                    activatePointersInstantlyOnTouch: true,
                    persistPointer: true,
                    pointerLabelComponent: (_items: unknown, _secondary: unknown, pointerIndex: number) => {
                      setTimeout(() => setWaPointerIdx(pointerIndex), 0);
                      return null;
                    },
                  }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <View style={[mkStyles.legendDot, { backgroundColor: '#C2255C' }]} />
                  <Text style={mkStyles.listRowMeta}>Mensagens · total no período: {formatNumeroBR(data.serie_diaria.reduce((sum, p) => sum + p.inbound, 0))}</Text>
                </View>
                {waPointerIdx !== null && data.serie_diaria[waPointerIdx] ? (
                  <View style={mkStyles.chartTooltip}>
                    <Text style={mkStyles.chartTooltipDate}>{formatDiaCurto(data.serie_diaria[waPointerIdx].data)}</Text>
                    <Text style={[mkStyles.chartTooltipLine, { color: '#C2255C' }]}>
                      Mensagens: {formatNumeroBR(data.serie_diaria[waPointerIdx].inbound)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <MktDashboardListCard title="Top atendentes (resolvidas)" icon="user-check" items={data.top_atendentes as Array<Record<string, unknown>>}>
                {(item) => (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text style={mkStyles.listRowMeta} numberOfLines={1}>
                      {pickMktField(item, ['nome', 'atendente_nome']) ?? '—'}
                    </Text>
                    <Text style={mkStyles.listRowValue}>{pickMktField(item, ['resolvidas', 'total']) ?? '0'}</Text>
                  </View>
                )}
              </MktDashboardListCard>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              <MktDashboardListCard title="Ocorrências por canal" icon="briefcase" items={data.por_canal as Array<Record<string, unknown>>}>
                {(item) => (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text style={mkStyles.listRowMeta} numberOfLines={1}>
                      {pickMktField(item, ['canal_label', 'canal']) ?? '—'}
                    </Text>
                    <Text style={mkStyles.listRowValue}>{pickMktField(item, ['total', 'quantidade']) ?? '0'}</Text>
                  </View>
                )}
              </MktDashboardListCard>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <MktDashboardListCard title="SLA por canal" icon="clock" items={data.sla_por_canal as Array<Record<string, unknown>>}>
                {(item) => (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text style={mkStyles.listRowMeta} numberOfLines={1}>
                      {pickMktField(item, ['canal_label', 'canal']) ?? '—'}
                    </Text>
                    <Text style={mkStyles.listRowValue}>{pickMktField(item, ['percentual', 'taxa']) ?? '—'}</Text>
                  </View>
                )}
              </MktDashboardListCard>
            </View>

            <Text style={mkStyles.sectionTitle}>Ocorrências recentes</Text>
            {data.ocorrencias_recentes.length === 0 ? (
              <MktEmptyState message="Nenhuma ocorrência registrada no período." />
            ) : (
              data.ocorrencias_recentes.map((raw, idx) => {
                const item = raw as Record<string, unknown>;
                const protocolo = pickMktField(item, ['protocolo']) ?? '—';
                const assunto = pickMktField(item, ['assunto', 'titulo']) ?? 'Sem assunto';
                const statusLabel = pickMktField(item, ['status_label', 'status']) ?? '—';
                return (
                  <View key={pickMktField(item, ['id']) ?? `oc-${idx}`} style={mkStyles.dreCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={mkStyles.listRowMeta}>{protocolo}</Text>
                      <View style={[mkStyles.badge, { backgroundColor: '#FBE4ED' }]}>
                        <Text style={[mkStyles.badgeText, { color: '#C2255C' }]}>{statusLabel}</Text>
                      </View>
                    </View>
                    <Text style={mkStyles.listRowTitle}>{assunto}</Text>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- 2. Ocorrências ---

const OCORRENCIA_STATUS_OPTIONS: Array<{ value: MarketingOcorrenciaStatus | null; label: string }> = [
  { value: null, label: 'Todos os status' },
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_atendimento', label: 'Em atendimento' },
  { value: 'aguardando_cliente', label: 'Aguardando cliente' },
  { value: 'resolvido', label: 'Resolvido' },
  { value: 'cancelado', label: 'Cancelado' },
];

const OCORRENCIA_STATUS_EDIT_OPTIONS: Array<{ value: MarketingOcorrenciaStatus; label: string }> = OCORRENCIA_STATUS_OPTIONS.filter(
  (opt): opt is { value: MarketingOcorrenciaStatus; label: string } => opt.value != null
);

const OCORRENCIA_CANAL_OPTIONS: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'Todos os canais' },
  { value: 'manual', label: 'Manual' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
];

// Opções de Canal ao CRIAR uma ocorrência manualmente — lista completa igual
// ao painel web (dropdown "Canal" da tela Nova ocorrência), maior que
// OCORRENCIA_CANAL_OPTIONS (que é só o filtro da listagem).
const OCORRENCIA_CANAL_CREATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'google', label: 'Google Meu Negócio' },
  { value: 'reclame_aqui', label: 'Reclame Aqui' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'fidelidade', label: 'Fidelidade' },
  { value: 'manual', label: 'Manual' },
  { value: 'email', label: 'E-mail' },
  { value: 'outro', label: 'Outro' },
];

const OCORRENCIA_PRIORIDADE_OPTIONS: Array<{ value: MarketingOcorrenciaPrioridade | null; label: string }> = [
  { value: null, label: 'Todas as prioridades' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

export function MarketingOcorrenciasScreen({ navigation }: ScreenProps<'MarketingOcorrencias'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;
  const isFocused = useIsFocused();

  const [items, setItems] = useState<MarketingOcorrenciaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<MarketingOcorrenciaStatus | null>(null);
  const [canal, setCanal] = useState<string | null>(null);
  const [prioridade, setPrioridade] = useState<MarketingOcorrenciaPrioridade | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [canalModalOpen, setCanalModalOpen] = useState(false);
  const [prioridadeModalOpen, setPrioridadeModalOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formAssunto, setFormAssunto] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formClienteNome, setFormClienteNome] = useState('');
  const [formClienteEmail, setFormClienteEmail] = useState('');
  const [formClienteTelefone, setFormClienteTelefone] = useState('');
  const [formPrioridade, setFormPrioridade] = useState<MarketingOcorrenciaPrioridade>('media');
  const [formCanal, setFormCanal] = useState<string>('manual');
  const [formResponsavelId, setFormResponsavelId] = useState<string | null>(null);
  const [formLink, setFormLink] = useState('');
  const [formOpenField, setFormOpenField] = useState<'canal' | 'prioridade' | 'responsavel' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<MarketingOcorrenciaDetalhe | null>(null);
  const [isLoadingDetalhe, setIsLoadingDetalhe] = useState(false);
  const [respostaTexto, setRespostaTexto] = useState('');
  const [respostaInterna, setRespostaInterna] = useState(false);
  const [isSendingResposta, setIsSendingResposta] = useState(false);
  const [justCopiedProtocolo, setJustCopiedProtocolo] = useState(false);
  const [openField, setOpenField] = useState<'status' | 'prioridade' | 'responsavel' | null>(null);
  const [responsaveis, setResponsaveis] = useState<Array<{ id: string; nome: string }>>([]);
  const [responsaveisError, setResponsaveisError] = useState<string | null>(null);
  const [isUploadingAnexo, setIsUploadingAnexo] = useState(false);

  const loadResponsaveis = useCallback(() => {
    setResponsaveisError(null);
    fetchRhColaboradores()
      .then((rows: RhColaboradorRaw[]) =>
        setResponsaveis(
          rows
            .filter((r) => r.nome_completo)
            .map((r) => ({ id: r.id, nome: r.nome_completo as string }))
            .sort((a, b) => a.nome.localeCompare(b.nome))
        )
      )
      .catch((err) => {
        setResponsaveis([]);
        setResponsaveisError(showMktError(err, 'Não foi possível carregar a lista de funcionários.'));
      });
  }, []);

  useEffect(() => {
    loadResponsaveis();
  }, [loadResponsaveis]);

  const filtro: MarketingOcorrenciaFiltro = useMemo(
    () => ({ q: busca || undefined, status: status ?? undefined, canal: canal ?? undefined, prioridade: prioridade ?? undefined }),
    [busca, status, canal, prioridade]
  );

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchMarketingOcorrencias(filtro)
      .then((res) => setItems(res.itens))
      .catch((err) => setErrorMessage(showMktError(err, 'Não foi possível carregar as ocorrências.')))
      .finally(() => setIsLoading(false));
  }, [filtro]);

  useEffect(() => {
    if (!isFocused) return;
    load();
  }, [load, isFocused]);

  const abrirDetalhe = (id: string) => {
    setDetalheId(id);
    setDetalhe(null);
    setRespostaTexto('');
    setRespostaInterna(false);
    setOpenField(null);
    setIsLoadingDetalhe(true);
    fetchMarketingOcorrencia(id)
      .then(setDetalhe)
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível carregar a ocorrência.')))
      .finally(() => setIsLoadingDetalhe(false));
  };

  const handleCopyProtocolo = () => {
    if (!detalhe) return;
    Clipboard.setStringAsync(detalhe.ocorrencia.protocolo)
      .then(() => {
        setJustCopiedProtocolo(true);
        setTimeout(() => setJustCopiedProtocolo(false), 1500);
      })
      .catch(() => Alert.alert('Não foi possível copiar', 'Tente novamente.'));
  };

  const ANEXO_MIMES_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const ANEXO_TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

  const handleAnexarArquivo = async () => {
    if (!detalheId) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ANEXO_MIMES_ACEITOS,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? '';
      if (!ANEXO_MIMES_ACEITOS.includes(mimeType)) {
        Alert.alert('Arquivo inválido', 'Envie uma imagem (JPG/PNG/WEBP) ou PDF.');
        return;
      }
      if ((asset.size ?? 0) > ANEXO_TAMANHO_MAXIMO_BYTES) {
        Alert.alert('Arquivo muito grande', 'O tamanho máximo é 10MB.');
        return;
      }
      setIsUploadingAnexo(true);
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      await createMarketingAnexo(detalheId, { nome_arquivo: asset.name ?? 'anexo', arquivo_base64: base64, mime_type: mimeType }, actorId);
      const atualizado = await fetchMarketingOcorrencia(detalheId);
      setDetalhe(atualizado);
    } catch (err) {
      Alert.alert('Erro', showMktError(err, 'Não foi possível enviar o anexo.'));
    } finally {
      setIsUploadingAnexo(false);
    }
  };

  const handleCriar = () => {
    if (!formAssunto.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o assunto da ocorrência.');
      return;
    }
    if (formClienteEmail.trim() && !isEmailValido(formClienteEmail)) {
      Alert.alert('E-mail inválido', 'Confira o e-mail do cliente (ex.: nome@dominio.com).');
      return;
    }
    setIsSaving(true);
    createMarketingOcorrencia(
      {
        assunto: formAssunto.trim(),
        descricao: formDescricao || undefined,
        cliente_nome: formClienteNome || undefined,
        cliente_email: formClienteEmail || undefined,
        cliente_telefone: formClienteTelefone || undefined,
        prioridade: formPrioridade,
        canal: formCanal,
        responsavel_id: formResponsavelId ?? undefined,
        link: formLink.trim() || undefined,
      },
      actorId
    )
      .then(() => {
        setIsFormOpen(false);
        setFormAssunto('');
        setFormDescricao('');
        setFormClienteNome('');
        setFormClienteEmail('');
        setFormClienteTelefone('');
        setFormPrioridade('media');
        setFormCanal('manual');
        setFormResponsavelId(null);
        setFormLink('');
        setFormOpenField(null);
        load();
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível criar a ocorrência.')))
      .finally(() => setIsSaving(false));
  };

  const handleEnviarResposta = () => {
    if (!detalheId || !respostaTexto.trim()) return;
    setIsSendingResposta(true);
    createMarketingMensagem(detalheId, { mensagem: respostaTexto.trim(), interna: respostaInterna }, actorId)
      .then(() => {
        setRespostaTexto('');
        setRespostaInterna(false);
        return fetchMarketingOcorrencia(detalheId).then(setDetalhe);
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível enviar a resposta.')))
      .finally(() => setIsSendingResposta(false));
  };

  const handleSalvarPainel = (patch: { status?: MarketingOcorrenciaStatus; prioridade?: MarketingOcorrenciaPrioridade; responsavel_id?: string }) => {
    if (!detalheId) return;
    setOpenField(null);
    updateMarketingOcorrencia(detalheId, patch, actorId)
      .then(() => fetchMarketingOcorrencia(detalheId).then(setDetalhe))
      .then(() => load())
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível salvar as alterações.')));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={marketingUserInitials} variant="marketing" onAvatarPress={() => navigation.navigate('MarketingProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MktPageHeader icon="inbox" title="Ocorrências" subtitle="Atendimento aos chamados abertos pelos clientes nas plataformas conectadas." />

        <MktSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar protocolo, cliente ou assunto..." />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <MktSelectButton
              label={OCORRENCIA_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'Todos os status'}
              onPress={() => setStatusModalOpen(true)}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <MktSelectButton
              label={OCORRENCIA_CANAL_OPTIONS.find((o) => o.value === canal)?.label ?? 'Todos os canais'}
              onPress={() => setCanalModalOpen(true)}
            />
          </View>
        </View>
        <MktSelectButton
          label={OCORRENCIA_PRIORIDADE_OPTIONS.find((o) => o.value === prioridade)?.label ?? 'Todas as prioridades'}
          onPress={() => setPrioridadeModalOpen(true)}
        />
        <View style={{ height: 12 }} />

        <Pressable
          style={[mkStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }]}
          onPress={() => {
            setFormOpenField(null);
            setIsFormOpen(true);
          }}
        >
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={mkStyles.suggestionButtonText}>Nova ocorrência</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color="#C2255C" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <MktEmptyState message={errorMessage} />
        ) : items.length === 0 ? (
          <MktEmptyState message="Nenhuma ocorrência encontrada." />
        ) : (
          items.map((item) => (
            <Pressable key={item.id} style={mkStyles.dreCard} onPress={() => abrirDetalhe(item.id)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={mkStyles.listRowMeta}>{item.protocolo}</Text>
                <View
                  style={[
                    mkStyles.badge,
                    item.prioridade === 'alta'
                      ? { backgroundColor: '#FBE4E7' }
                      : item.prioridade === 'media'
                      ? { backgroundColor: '#FEF3D6' }
                      : { backgroundColor: '#F1F2F6' },
                  ]}
                >
                  <Text
                    style={[
                      mkStyles.badgeText,
                      item.prioridade === 'alta' ? { color: '#C2263A' } : item.prioridade === 'media' ? { color: '#8A6D1D' } : { color: '#5E667D' },
                    ]}
                  >
                    {(item.prioridade_label ?? item.prioridade ?? '—').toString().toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={mkStyles.listRowTitle}>{item.assunto}</Text>
              <Text style={mkStyles.listRowMeta} numberOfLines={1}>
                {item.cliente_nome ?? 'Sem cliente identificado'} · {item.canal_label ?? item.canal}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <View style={[mkStyles.badge, { backgroundColor: '#F1F2F6' }]}>
                  <Text style={[mkStyles.badgeText, { color: '#5E667D' }]}>{item.status_label ?? item.status}</Text>
                </View>
                {item.sla?.label ? (
                  <Text style={[mkStyles.listRowMeta, item.sla.estourado ? { color: '#E6213D', fontWeight: '700' } : null]}>{item.sla.label}</Text>
                ) : null}
              </View>
              <Text style={[mkStyles.listRowMeta, { marginTop: 4 }]}>Aberto em: {formatDateTimeBR(item.created_at)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <MktSelectModal
        visible={statusModalOpen}
        title="Filtrar por status"
        options={OCORRENCIA_STATUS_OPTIONS}
        selectedValue={status}
        onSelect={setStatus}
        onClose={() => setStatusModalOpen(false)}
      />
      <MktSelectModal
        visible={canalModalOpen}
        title="Filtrar por canal"
        options={OCORRENCIA_CANAL_OPTIONS}
        selectedValue={canal}
        onSelect={setCanal}
        onClose={() => setCanalModalOpen(false)}
      />
      <MktSelectModal
        visible={prioridadeModalOpen}
        title="Filtrar por prioridade"
        options={OCORRENCIA_PRIORIDADE_OPTIONS}
        selectedValue={prioridade}
        onSelect={setPrioridade}
        onClose={() => setPrioridadeModalOpen(false)}
      />

      <MktModal
        visible={isFormOpen}
        title="Nova ocorrência"
        onClose={() => {
          setIsFormOpen(false);
          setFormOpenField(null);
        }}
      >
        <View style={{ zIndex: formOpenField === 'canal' ? 200 : 3 }}>
          <MktFormLabel>Canal</MktFormLabel>
          <MktFieldDropdown
            label={OCORRENCIA_CANAL_CREATE_OPTIONS.find((o) => o.value === formCanal)?.label ?? 'Manual'}
            options={OCORRENCIA_CANAL_CREATE_OPTIONS}
            selectedValue={formCanal}
            isOpen={formOpenField === 'canal'}
            onToggle={() => setFormOpenField((f) => (f === 'canal' ? null : 'canal'))}
            onSelect={setFormCanal}
          />
        </View>
        <View style={{ height: 12 }} />
        <View style={{ zIndex: formOpenField === 'prioridade' ? 200 : 2 }}>
          <MktFormLabel>Prioridade</MktFormLabel>
          <MktFieldDropdown
            label={OCORRENCIA_PRIORIDADE_OPTIONS.find((o) => o.value === formPrioridade)?.label ?? 'Média'}
            options={OCORRENCIA_PRIORIDADE_OPTIONS.filter((o) => o.value != null) as Array<{ value: MarketingOcorrenciaPrioridade; label: string }>}
            selectedValue={formPrioridade}
            isOpen={formOpenField === 'prioridade'}
            onToggle={() => setFormOpenField((f) => (f === 'prioridade' ? null : 'prioridade'))}
            onSelect={setFormPrioridade}
          />
        </View>
        <View style={{ height: 12 }} />
        <MktFormLabel>Cliente</MktFormLabel>
        <TextInput style={mkStyles.formInput} value={formClienteNome} onChangeText={setFormClienteNome} placeholder="Nome do cliente" placeholderTextColor="#A7AEC2" />
        <View style={{ height: 12 }} />
        <MktFormLabel>E-mail</MktFormLabel>
        <TextInput
          style={[mkStyles.formInput, formClienteEmail.trim() && !isEmailValido(formClienteEmail) ? { borderColor: '#E6213D' } : null]}
          value={formClienteEmail}
          onChangeText={setFormClienteEmail}
          placeholder="cliente@email.com"
          placeholderTextColor="#A7AEC2"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {formClienteEmail.trim() && !isEmailValido(formClienteEmail) ? (
          <Text style={[mkStyles.listRowMeta, { color: '#E6213D', marginTop: 4 }]}>E-mail inválido.</Text>
        ) : null}
        <View style={{ height: 12 }} />
        <MktFormLabel>Telefone</MktFormLabel>
        <TextInput
          style={mkStyles.formInput}
          value={formClienteTelefone}
          onChangeText={(text) => setFormClienteTelefone(formatTelefoneBR(text))}
          placeholder="(xx) 99999-9999"
          placeholderTextColor="#A7AEC2"
          keyboardType="phone-pad"
          maxLength={15}
        />
        <View style={{ height: 12 }} />
        <View style={{ zIndex: formOpenField === 'responsavel' ? 200 : 1 }}>
          <MktFormLabel>Responsável</MktFormLabel>
          <MktFieldDropdown
            label={responsaveis.find((r) => r.id === formResponsavelId)?.nome ?? 'Sem responsável'}
            options={[
              { value: null as string | null, label: 'Sem responsável' },
              ...responsaveis.map((r) => ({ value: r.id as string | null, label: r.nome })),
            ]}
            selectedValue={formResponsavelId}
            isOpen={formOpenField === 'responsavel'}
            onToggle={() => setFormOpenField((f) => (f === 'responsavel' ? null : 'responsavel'))}
            onSelect={setFormResponsavelId}
            searchable
          />
          {responsaveisError ? (
            <Pressable onPress={loadResponsaveis} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Feather name="alert-circle" size={13} color="#C2263A" />
              <Text style={[mkStyles.listRowMeta, { color: '#C2263A' }]}>{responsaveisError} Toque para tentar de novo.</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ height: 12 }} />
        <MktFormLabel>Assunto *</MktFormLabel>
        <TextInput style={mkStyles.formInput} value={formAssunto} onChangeText={setFormAssunto} placeholder="Ex.: Dúvida sobre cadastro" placeholderTextColor="#A7AEC2" />
        <View style={{ height: 12 }} />
        <MktFormLabel>Descrição</MktFormLabel>
        <TextInput
          style={[mkStyles.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
          value={formDescricao}
          onChangeText={setFormDescricao}
          placeholder="Detalhes do atendimento"
          placeholderTextColor="#A7AEC2"
          multiline
        />
        <View style={{ height: 12 }} />
        <MktFormLabel>Link da publicação/avaliação (opcional)</MktFormLabel>
        <TextInput
          style={mkStyles.formInput}
          value={formLink}
          onChangeText={setFormLink}
          placeholder="https://..."
          placeholderTextColor="#A7AEC2"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={{ height: 12 }} />
        <Pressable style={[mkStyles.filterModalApplyButton, isSaving ? { opacity: 0.6 } : null]} onPress={handleCriar} disabled={isSaving}>
          <Text style={mkStyles.filterModalApplyButtonText}>{isSaving ? 'Salvando...' : 'Criar protocolo'}</Text>
        </Pressable>
        {formOpenField ? <View style={{ height: 280 }} /> : null}
      </MktModal>

      <MktModal
        visible={detalheId != null}
        title=""
        onClose={() => {
          setDetalheId(null);
          setOpenField(null);
        }}
      >
        {isLoadingDetalhe ? (
          <ActivityIndicator color="#C2255C" style={{ marginTop: 12 }} />
        ) : !detalhe ? (
          <MktEmptyState message="Não foi possível carregar os detalhes." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <Text style={mkStyles.listRowTitle}>{detalhe.ocorrencia.protocolo}</Text>
              <Pressable onPress={handleCopyProtocolo} hitSlop={8}>
                <Feather name={justCopiedProtocolo ? 'check' : 'copy'} size={15} color={justCopiedProtocolo ? '#2FB170' : '#5E667D'} />
              </Pressable>
              <View style={[mkStyles.badge, { backgroundColor: '#F1F2F6' }]}>
                <Text style={[mkStyles.badgeText, { color: '#5E667D' }]}>{detalhe.ocorrencia.status_label ?? detalhe.ocorrencia.status}</Text>
              </View>
              <View
                style={[
                  mkStyles.badge,
                  detalhe.ocorrencia.prioridade === 'alta'
                    ? { backgroundColor: '#FBE4E7' }
                    : detalhe.ocorrencia.prioridade === 'media'
                    ? { backgroundColor: '#FEF3D6' }
                    : { backgroundColor: '#F1F2F6' },
                ]}
              >
                <Text
                  style={[
                    mkStyles.badgeText,
                    detalhe.ocorrencia.prioridade === 'alta'
                      ? { color: '#C2263A' }
                      : detalhe.ocorrencia.prioridade === 'media'
                      ? { color: '#8A6D1D' }
                      : { color: '#5E667D' },
                  ]}
                >
                  {detalhe.ocorrencia.prioridade_label ?? detalhe.ocorrencia.prioridade}
                </Text>
              </View>
              <View style={[mkStyles.badge, { backgroundColor: '#FBE4ED' }]}>
                <Text style={[mkStyles.badgeText, { color: '#C2255C' }]}>{detalhe.ocorrencia.canal_label ?? detalhe.ocorrencia.canal}</Text>
              </View>
            </View>

            <Text style={mkStyles.listRowTitle}>{detalhe.ocorrencia.assunto}</Text>
            {detalhe.ocorrencia.descricao ? <Text style={[mkStyles.listRowMeta, { marginTop: 4 }]}>{detalhe.ocorrencia.descricao}</Text> : null}

            <View style={{ marginTop: 14 }}>
              <Text style={mkStyles.sectionTitle}>Cliente</Text>
              <Text style={mkStyles.profileFieldText}>Nome: {detalhe.cliente.nome ?? '—'}</Text>
              <Text style={mkStyles.profileFieldText}>E-mail: {detalhe.cliente.email ?? '—'}</Text>
              <Text style={mkStyles.profileFieldText}>Telefone: {detalhe.cliente.telefone ? formatTelefoneBR(detalhe.cliente.telefone) : '—'}</Text>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={mkStyles.sectionTitle}>SLA</Text>
              <Text style={mkStyles.profileFieldText}>Aberto em: {formatDateTimeBR(detalhe.prazos.aberto_em)}</Text>
              <Text style={mkStyles.profileFieldText}>1ª resposta até: {formatDateTimeBR(detalhe.prazos.primeira_resposta_ate)}</Text>
              <Text style={mkStyles.profileFieldText}>Resolver até: {formatDateTimeBR(detalhe.prazos.resolver_ate)}</Text>
              <Text style={mkStyles.profileFieldText}>Respondida em: {formatDateTimeBR(detalhe.prazos.respondida_em)}</Text>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={mkStyles.sectionTitle}>Histórico</Text>
              {detalhe.mensagens.length === 0 ? (
                <MktEmptyState message="Nenhuma mensagem ainda." />
              ) : (
                detalhe.mensagens.map((msg, idx) => (
                  <View key={idx} style={[mkStyles.dreCard, msg.interna ? { backgroundColor: '#FFF8E5', borderColor: '#F0DFA0' } : null]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={mkStyles.listRowMeta}>{msg.autor_nome ?? msg.autor_tipo} · {formatDateTimeBR(msg.created_at)}</Text>
                      {msg.interna ? <Text style={[mkStyles.listRowMeta, { color: '#8A6D1D', fontWeight: '700' }]}>Nota interna</Text> : null}
                    </View>
                    <Text style={[mkStyles.profileFieldText, { marginTop: 4 }]}>{msg.mensagem}</Text>
                  </View>
                ))
              )}
            </View>

            <MktFormLabel>Escreva uma resposta...</MktFormLabel>
            <TextInput
              style={[mkStyles.formInput, { minHeight: 70, textAlignVertical: 'top' }]}
              value={respostaTexto}
              onChangeText={setRespostaTexto}
              placeholder="Escreva uma resposta..."
              placeholderTextColor="#A7AEC2"
              multiline
            />
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}
              onPress={() => setRespostaInterna((v) => !v)}
            >
              <Feather name={respostaInterna ? 'check-square' : 'square'} size={16} color="#5E667D" />
              <Text style={mkStyles.profileFieldText}>Nota interna (não visível ao cliente)</Text>
            </Pressable>
            <Pressable
              style={[mkStyles.filterModalApplyButton, isSendingResposta || !respostaTexto.trim() ? { opacity: 0.6 } : null]}
              onPress={handleEnviarResposta}
              disabled={isSendingResposta || !respostaTexto.trim()}
            >
              <Text style={mkStyles.filterModalApplyButtonText}>{isSendingResposta ? 'Enviando...' : 'Enviar'}</Text>
            </Pressable>

            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Feather name="paperclip" size={13} color="#5E667D" />
                <Text style={[mkStyles.sectionTitle, { marginBottom: 0 }]}>Evidências</Text>
              </View>
              <Pressable
                style={[mkStyles.smallButton, { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }, isUploadingAnexo ? { opacity: 0.6 } : null]}
                onPress={handleAnexarArquivo}
                disabled={isUploadingAnexo}
              >
                <Feather name="upload" size={13} color="#FFFFFF" />
                <Text style={mkStyles.smallButtonText}>{isUploadingAnexo ? 'Enviando...' : 'Anexar arquivo'}</Text>
              </Pressable>
              {detalhe.anexos.length === 0 ? (
                <Text style={[mkStyles.listRowMeta, { marginTop: 8 }]}>Nenhuma evidência anexada. Aceita imagens e PDFs (máx. 10MB).</Text>
              ) : (
                detalhe.anexos.map((anexo) => (
                  <View key={anexo.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <Feather name="file" size={13} color="#5E667D" />
                    <Text style={mkStyles.listRowMeta} numberOfLines={1}>{anexo.nome_arquivo}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={{ marginTop: 16, zIndex: 50 }}>
              <Text style={mkStyles.sectionTitle}>Atendimento</Text>
              <MktFormLabel>Status</MktFormLabel>
              <MktFieldDropdown
                label={OCORRENCIA_STATUS_EDIT_OPTIONS.find((o) => o.value === detalhe.ocorrencia.status)?.label ?? detalhe.ocorrencia.status}
                options={OCORRENCIA_STATUS_EDIT_OPTIONS}
                selectedValue={detalhe.ocorrencia.status}
                isOpen={openField === 'status'}
                onToggle={() => setOpenField((f) => (f === 'status' ? null : 'status'))}
                onSelect={(novoStatus) => handleSalvarPainel({ status: novoStatus })}
              />
              <View style={{ height: 10 }} />
              <MktFormLabel>Prioridade</MktFormLabel>
              <MktFieldDropdown
                label={OCORRENCIA_PRIORIDADE_OPTIONS.find((o) => o.value === detalhe.ocorrencia.prioridade)?.label ?? detalhe.ocorrencia.prioridade}
                options={OCORRENCIA_PRIORIDADE_OPTIONS.filter((o) => o.value != null) as Array<{ value: MarketingOcorrenciaPrioridade; label: string }>}
                selectedValue={detalhe.ocorrencia.prioridade}
                isOpen={openField === 'prioridade'}
                onToggle={() => setOpenField((f) => (f === 'prioridade' ? null : 'prioridade'))}
                onSelect={(novaPrioridade) => handleSalvarPainel({ prioridade: novaPrioridade })}
              />
              <View style={{ height: 10 }} />
              <MktFormLabel>Responsável</MktFormLabel>
              <MktFieldDropdown
                label={detalhe.ocorrencia.responsavel_nome ?? 'Sem responsável'}
                options={[
                  { value: null as string | null, label: 'Sem responsável' },
                  ...responsaveis.map((r) => ({ value: r.id as string | null, label: r.nome })),
                ]}
                selectedValue={responsaveis.find((r) => r.nome === detalhe.ocorrencia.responsavel_nome)?.id ?? null}
                isOpen={openField === 'responsavel'}
                onToggle={() => setOpenField((f) => (f === 'responsavel' ? null : 'responsavel'))}
                onSelect={(responsavelId) => handleSalvarPainel({ responsavel_id: responsavelId ?? undefined })}
                searchable
              />
              {responsaveisError ? (
                <Pressable onPress={loadResponsaveis} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Feather name="alert-circle" size={13} color="#C2263A" />
                  <Text style={[mkStyles.listRowMeta, { color: '#C2263A' }]}>{responsaveisError} Toque para tentar de novo.</Text>
                </Pressable>
              ) : null}
            </View>
            {openField ? <View style={{ height: 280 }} /> : null}
          </>
        )}
      </MktModal>
    </SafeAreaView>
  );
}

// --- 3. WhatsApp ---

// Picker de emoji simples (client-side, sem dependência de biblioteca nova).
const WA_EMOJIS = ['😀', '😂', '🙏', '👍', '❤️', '🎉', '😉', '😢', '🤝', '📅', '✅', '⚠️', '📌', '💰', '🚗'];

const WA_ABA_OPTIONS: Array<{ value: 'todos' | 'fila' | 'ativos' | 'finalizadas'; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'fila', label: 'Fila' },
  { value: 'ativos', label: 'Ativos' },
  { value: 'finalizadas', label: 'Final.' },
];

const WA_CHANNEL_OPTIONS: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'Todos' },
  { value: 'whatsapp', label: 'WA' },
  { value: 'instagram', label: 'IG' },
  { value: 'facebook', label: 'FB' },
];

export function MarketingWhatsAppScreen({ navigation }: ScreenProps<'MarketingWhatsApp'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;
  const isFocused = useIsFocused();

  const [aba, setAba] = useState<'todos' | 'fila' | 'ativos' | 'finalizadas'>('todos');
  const [channel, setChannel] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [tagFiltro, setTagFiltro] = useState<string | null>(null);
  const [conversas, setConversas] = useState<MarketingWaConversaItem[]>([]);
  const [contadores, setContadores] = useState<MarketingWaContadores>({
    fila: 0,
    em_atendimento: 0,
    finalizadas_hoje: 0,
    tma_hoje_segundos: null,
    abas: { todos: 0, fila: 0, ativos: 0, finalizadas: 0, grupos: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSincronizando, setIsSincronizando] = useState(false);

  const [tagsDisponiveis, setTagsDisponiveis] = useState<string[]>([]);
  useEffect(() => {
    fetchMarketingWaTags()
      .then(setTagsDisponiveis)
      .catch(() => setTagsDisponiveis([]));
  }, []);

  const [conversaAtiva, setConversaAtiva] = useState<MarketingWaConversaItem | null>(null);
  const [mensagens, setMensagens] = useState<Record<string, unknown>[]>([]);
  const [contatoInfo, setContatoInfo] = useState<MarketingWaContatoInfo>(null);
  const [isLoadingMensagens, setIsLoadingMensagens] = useState(false);
  const [textoEnvio, setTextoEnvio] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Sugestões de resposta contextual (chip acima do composer).
  const [sugestoes, setSugestoes] = useState<MarketingWaSugestao[]>([]);

  // Anexo/mídia (contrato confirmado 03/09/2026: wa-upload-midia + wa-enviar
  // com media_base64/media_mime, limites em wa-midia-limites).
  const [midiaLimites, setMidiaLimites] = useState<Partial<Record<MarketingWaMidiaTipo, { maxBytes: number; mimesAceitos: string[] }>>>({});
  const [isUploadingMidia, setIsUploadingMidia] = useState(false);
  useEffect(() => {
    fetchMarketingWaMidiaLimites()
      .then(setMidiaLimites)
      .catch(() => setMidiaLimites({}));
  }, []);

  // Gravação de nota de voz (expo-audio) — formato HIGH_QUALITY gera .m4a
  // (audio/mp4), que está na lista de mimes aceitos pra tipo "voice".
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioRecorderState = useAudioRecorderState(audioRecorder, 200);
  const [isEnviandoAudio, setIsEnviandoAudio] = useState(false);

  const handleIniciarGravacao = async () => {
    try {
      const permissao = await requestRecordingPermissionsAsync();
      if (!permissao.granted) {
        Alert.alert('Permissão necessária', 'Preciso de acesso ao microfone pra gravar uma nota de voz.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err) {
      Alert.alert('Erro', showMktError(err, 'Não foi possível iniciar a gravação.'));
    }
  };

  const handlePararEEnviarGravacao = async () => {
    if (!conversaAtiva) return;
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) return;
      const limite = midiaLimites.voice;
      const info = await FileSystem.getInfoAsync(uri);
      const tamanho = info.exists && 'size' in info ? info.size : 0;
      if (limite && tamanho > limite.maxBytes) {
        Alert.alert('Áudio muito grande', `O limite pra nota de voz é ${Math.round(limite.maxBytes / (1024 * 1024))}MB.`);
        return;
      }
      setIsEnviandoAudio(true);
      const media_base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      await sendMarketingWaMidia(
        { phone: conversaAtiva.phone, type: 'voice', media_base64, media_mime: 'audio/mp4', file_name: 'audio.m4a' },
        actorId
      );
      const { mensagens: msgs, contato } = await fetchMarketingWaMensagens(conversaAtiva.phone, { limit: 50 });
      setMensagens(msgs);
      setContatoInfo(contato);
    } catch (err) {
      const mensagemErro = err instanceof ApiError ? err.message : '';
      if (mensagemErro.includes('janela_24h_fechada')) {
        Alert.alert('Janela de 24h fechada', 'Envie um template aprovado antes de mandar áudio.', [
          { text: 'Escolher template', onPress: abrirTemplates },
          { text: 'Cancelar', style: 'cancel' },
        ]);
      } else if (mensagemErro.includes('contato_bloqueado')) {
        Alert.alert('Contato bloqueado', 'Desbloqueie o contato antes de enviar áudio.');
      } else {
        Alert.alert('Erro', showMktError(err, 'Não foi possível enviar o áudio.'));
      }
    } finally {
      setIsEnviandoAudio(false);
    }
  };

  // Fluxo de template (janela de 24h fechada).
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState<MarketingWaTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);

  // Respostas rápidas (gerenciamento + uso via "/" no composer).
  const [respostas, setRespostas] = useState<MarketingWaResposta[]>([]);
  const [isRespostasOpen, setIsRespostasOpen] = useState(false);
  const [isFormRespostaAberto, setIsFormRespostaAberto] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isQuickPickOpen, setIsQuickPickOpen] = useState(false);
  const [respostaAtalho, setRespostaAtalho] = useState('');
  const [respostaTexto, setRespostaTexto] = useState('');
  const [respostaEditandoId, setRespostaEditandoId] = useState<string | null>(null);
  const [isSalvandoResposta, setIsSalvandoResposta] = useState(false);

  const [respostasError, setRespostasError] = useState<string | null>(null);
  const loadRespostas = useCallback(() => {
    setRespostasError(null);
    fetchMarketingWaRespostas()
      .then(setRespostas)
      .catch((err) => {
        setRespostas([]);
        setRespostasError(showMktError(err, 'Não foi possível carregar as respostas rápidas.'));
      });
  }, []);
  useEffect(() => {
    loadRespostas();
  }, [loadRespostas]);

  const respostasSugeridas = useMemo(() => {
    if (!textoEnvio.startsWith('/')) return [];
    const termo = textoEnvio.slice(1).toLowerCase();
    return respostas.filter((r) => r.atalho.toLowerCase().includes(termo));
  }, [textoEnvio, respostas]);

  // Agenda de contatos (ícone ao lado de "Nova conversa").
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const [agendaBusca, setAgendaBusca] = useState('');
  const [agendaContatos, setAgendaContatos] = useState<MarketingWaAgendaContato[]>([]);
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);

  // Menu de três pontinhos (Finalizar/Silenciar/Bloquear).
  const [isMenuAberto, setIsMenuAberto] = useState(false);

  const [isNovaConversaOpen, setIsNovaConversaOpen] = useState(false);
  const [novoPhone, setNovoPhone] = useState('');
  const [novoNome, setNovoNome] = useState('');

  // Painel lateral "Atendimento" (abre ao tocar no nome/avatar da conversa).
  const [isAtendimentoOpen, setIsAtendimentoOpen] = useState(false);
  const [atendenteAberto, setAtendenteAberto] = useState(false);
  const [atendentes, setAtendentes] = useState<Array<{ id: string; nome: string }>>([]);
  const [atendentesError, setAtendentesError] = useState<string | null>(null);
  const [nomeExibicaoEdit, setNomeExibicaoEdit] = useState('');
  const [notasEdit, setNotasEdit] = useState('');
  const [tagsEdit, setTagsEdit] = useState<string[]>([]);
  const [novaTagTexto, setNovaTagTexto] = useState('');
  const [isSalvandoPainel, setIsSalvandoPainel] = useState(false);

  const handleAdicionarNovaTag = () => {
    const tag = novaTagTexto.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag) return;
    setTagsEdit((atual) => (atual.includes(tag) ? atual : [...atual, tag]));
    setTagsDisponiveis((atual) => (atual.includes(tag) ? atual : [...atual, tag]));
    setNovaTagTexto('');
  };

  // Atendente aqui NÃO é a mesma coisa que "Responsável" da tela de
  // Ocorrências (colaboradores do RH). Confirmado pela Lovable em
  // 03/09/2026: atendente = profiles com chat_atendente=true — hoje ninguém
  // tem essa flag ligada, então a lista real vem vazia (mesmo estado do
  // painel web), até alguém marcar "Atendente de chat" em Admin › Usuários.
  const loadAtendentes = useCallback(() => {
    setAtendentesError(null);
    fetchMarketingWaAtendentes()
      .then((rows) => setAtendentes(rows.map((r) => ({ id: r.id, nome: r.nome }))))
      .catch((err) => {
        setAtendentes([]);
        setAtendentesError(showMktError(err, 'Não foi possível carregar a lista de atendentes.'));
      });
  }, []);

  useEffect(() => {
    if (!isAtendimentoOpen) return;
    loadAtendentes();
  }, [isAtendimentoOpen, loadAtendentes]);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchMarketingWaConversas({ aba, channel: channel ?? undefined, q: busca || undefined, tag: tagFiltro ?? undefined })
      .then((res) => {
        setConversas(res.itens);
        setContadores(res.contadores);
      })
      .catch((err) => setErrorMessage(showMktError(err, 'Não foi possível carregar as conversas.')))
      .finally(() => setIsLoading(false));
  }, [aba, channel, busca, tagFiltro]);

  const handleSincronizar = () => {
    setIsSincronizando(true);
    sincronizarMarketingWaConversas(actorId)
      .then(() => load())
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível sincronizar as conversas.')))
      .finally(() => setIsSincronizando(false));
  };

  const abrirAgenda = () => {
    setAgendaBusca('');
    setIsAgendaOpen(true);
  };

  useEffect(() => {
    if (!isAgendaOpen) return;
    setIsLoadingAgenda(true);
    fetchMarketingWaAgenda(agendaBusca || undefined)
      .then(setAgendaContatos)
      .catch((err) => setAgendaError(showMktError(err, 'Não foi possível carregar a agenda de contatos.')))
      .finally(() => setIsLoadingAgenda(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaBusca, isAgendaOpen]);

  useEffect(() => {
    if (!isFocused) return;
    load();
  }, [load, isFocused]);

  const abrirConversa = (conversa: MarketingWaConversaItem) => {
    setConversaAtiva(conversa);
    setMensagens([]);
    setContatoInfo(null);
    setSugestoes([]);
    setIsAtendimentoOpen(false);
    setAtendenteAberto(false);
    setIsMenuAberto(false);
    setNomeExibicaoEdit(conversa.display_name ?? '');
    setNotasEdit(conversa.notas ?? '');
    setTagsEdit(conversa.tags ?? []);
    setIsLoadingMensagens(true);
    fetchMarketingWaMensagens(conversa.phone, { limit: 50 })
      .then(({ mensagens: msgs, contato }) => {
        setMensagens(msgs);
        setContatoInfo(contato);
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível carregar as mensagens.')))
      .finally(() => setIsLoadingMensagens(false));
    fetchMarketingWaSugestoes(conversa.phone)
      .then(setSugestoes)
      .catch(() => setSugestoes([]));
    // Marca como lida ao abrir — se falhar, não bloqueia a leitura da
    // conversa, só não zera o badge de não lidas na lista.
    if (conversa.nao_lidas > 0) {
      marcarMarketingWaLido(conversa.phone, actorId)
        .then(() => load())
        .catch(() => {});
    }
  };

  const handleSalvarAtendente = (atendenteId: string | null) => {
    if (!conversaAtiva) return;
    setAtendenteAberto(false);
    updateMarketingWaConversa(conversaAtiva.phone, { atendente_id: atendenteId ?? undefined }, actorId)
      .then((atualizada) => {
        setConversaAtiva(atualizada);
        load();
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível atualizar o atendente.')));
  };

  const handleSalvarPainelAtendimento = () => {
    if (!conversaAtiva) return;
    setIsSalvandoPainel(true);
    updateMarketingWaConversa(
      conversaAtiva.phone,
      { display_name: nomeExibicaoEdit.trim() || undefined, notas: notasEdit, tags: tagsEdit },
      actorId
    )
      .then((atualizada) => {
        setConversaAtiva(atualizada);
        load();
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível salvar as alterações.')))
      .finally(() => setIsSalvandoPainel(false));
  };

  const abrirTemplates = () => {
    setIsTemplatesOpen(true);
    setIsLoadingTemplates(true);
    setTemplatesError(null);
    fetchMarketingWaTemplates('geral')
      .then(setTemplates)
      .catch((err) => setTemplatesError(showMktError(err, 'Não foi possível carregar os templates.')))
      .finally(() => setIsLoadingTemplates(false));
  };

  const handleEnviarTemplate = (template: MarketingWaTemplate) => {
    if (!conversaAtiva) return;
    setIsSendingTemplate(true);
    enviarMarketingWaTemplate({ phone: conversaAtiva.phone, template_name: template.name, language: template.language ?? undefined }, actorId)
      .then(() => {
        setIsTemplatesOpen(false);
        return fetchMarketingWaMensagens(conversaAtiva.phone, { limit: 50 }).then(({ mensagens: msgs, contato }) => {
          setMensagens(msgs);
          setContatoInfo(contato);
        });
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível enviar o template.')))
      .finally(() => setIsSendingTemplate(false));
  };

  const handleEnviar = () => {
    if (!conversaAtiva || !textoEnvio.trim()) return;
    // Se um atalho de resposta rápida for selecionado ("/atalho"), o texto já
    // foi substituído pelo corpo da resposta antes de chegar aqui (ver
    // onSelect da lista de sugestões no composer).
    setIsSending(true);
    sendMarketingWaMensagem({ phone: conversaAtiva.phone, mensagem: textoEnvio.trim() }, actorId)
      .then(() => {
        setTextoEnvio('');
        return fetchMarketingWaMensagens(conversaAtiva.phone, { limit: 50 }).then(({ mensagens: msgs, contato }) => {
          setMensagens(msgs);
          setContatoInfo(contato);
        });
      })
      .catch((err) => {
        const mensagemErro = err instanceof ApiError ? err.message : '';
        if (mensagemErro.includes('janela_24h_fechada')) {
          Alert.alert(
            'Janela de 24h fechada',
            'Já se passaram mais de 24h desde a última mensagem do cliente. Envie um template aprovado pra retomar a conversa.',
            [{ text: 'Escolher template', onPress: abrirTemplates }, { text: 'Cancelar', style: 'cancel' }]
          );
        } else if (mensagemErro.includes('contato_bloqueado')) {
          Alert.alert('Contato bloqueado', 'Esse contato está bloqueado — desbloqueie no menu da conversa antes de enviar.');
        } else {
          Alert.alert('Erro', showMktError(err, 'Não foi possível enviar a mensagem.'));
        }
      })
      .finally(() => setIsSending(false));
  };

  function tipoMidiaPorMime(mime: string): MarketingWaMidiaTipo {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
  }

  const handleAnexarMidia = async () => {
    if (!conversaAtiva) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? 'application/octet-stream';
      const tipo = tipoMidiaPorMime(mime);
      const limite = midiaLimites[tipo];
      if (limite) {
        if (!limite.mimesAceitos.includes(mime)) {
          Alert.alert('Formato não aceito', `${mime} não é um formato aceito pra ${tipo}. Aceitos: ${limite.mimesAceitos.join(', ')}.`);
          return;
        }
        if ((asset.size ?? 0) > limite.maxBytes) {
          Alert.alert('Arquivo muito grande', `O limite pra ${tipo} é ${Math.round(limite.maxBytes / (1024 * 1024))}MB.`);
          return;
        }
      }
      setIsUploadingMidia(true);
      const media_base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      await sendMarketingWaMidia({ phone: conversaAtiva.phone, type: tipo, media_base64, media_mime: mime, file_name: asset.name }, actorId);
      const { mensagens: msgs, contato } = await fetchMarketingWaMensagens(conversaAtiva.phone, { limit: 50 });
      setMensagens(msgs);
      setContatoInfo(contato);
    } catch (err) {
      const mensagemErro = err instanceof ApiError ? err.message : '';
      if (mensagemErro.includes('janela_24h_fechada')) {
        Alert.alert('Janela de 24h fechada', 'Envie um template aprovado antes de mandar anexo.', [
          { text: 'Escolher template', onPress: abrirTemplates },
          { text: 'Cancelar', style: 'cancel' },
        ]);
      } else if (mensagemErro.includes('contato_bloqueado')) {
        Alert.alert('Contato bloqueado', 'Desbloqueie o contato antes de enviar anexo.');
      } else {
        Alert.alert('Erro', showMktError(err, 'Não foi possível enviar o anexo.'));
      }
    } finally {
      setIsUploadingMidia(false);
    }
  };

  const handleAssumirOuFinalizar = (chatStatus: MarketingWaChatStatus) => {
    if (!conversaAtiva) return;
    setIsMenuAberto(false);
    updateMarketingWaConversa(conversaAtiva.phone, { chat_status: chatStatus }, actorId)
      .then((atualizada) => {
        setConversaAtiva(atualizada);
        load();
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível atualizar a conversa.')));
  };

  const handleSilenciarOuBloquear = (campo: 'muted' | 'blocked', valor: boolean) => {
    if (!conversaAtiva) return;
    setIsMenuAberto(false);
    updateMarketingWaConversa(conversaAtiva.phone, { [campo]: valor }, actorId)
      .then((atualizada) => {
        setConversaAtiva(atualizada);
        load();
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, `Não foi possível ${valor ? '' : 'des'}${campo === 'muted' ? 'silenciar' : 'bloquear'} o contato.`)));
  };

  const handleSalvarResposta = () => {
    if (!respostaAtalho.trim() || !respostaTexto.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe o atalho e o texto da resposta rápida.');
      return;
    }
    setIsSalvandoResposta(true);
    salvarMarketingWaResposta({ id: respostaEditandoId ?? undefined, atalho: respostaAtalho.trim(), texto: respostaTexto.trim() }, actorId)
      .then(() => {
        setRespostaAtalho('');
        setRespostaTexto('');
        setRespostaEditandoId(null);
        setIsFormRespostaAberto(false);
        loadRespostas();
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível salvar a resposta rápida.')))
      .finally(() => setIsSalvandoResposta(false));
  };

  const handleExcluirResposta = (id: string) => {
    excluirMarketingWaResposta(id, actorId)
      .then(() => loadRespostas())
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível excluir a resposta rápida.')));
  };

  // Agrupa as mensagens por dia (chave AAAA-MM-DD) pra renderizar os
  // divisores "HOJE"/"ONTEM"/data igual ao WhatsApp real, na mesma ordem em
  // que a API devolveu (não reordena, só agrupa consecutivamente).
  const mensagensAgrupadas = useMemo(() => {
    const grupos: Array<{ dia: string; label: string; itens: Record<string, unknown>[] }> = [];
    for (const raw of mensagens) {
      const criadoEm = pickMktField(raw, ['created_at', 'timestamp', 'data']);
      const dia = diaChaveWA(criadoEm);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.dia === dia) {
        ultimo.itens.push(raw);
      } else {
        grupos.push({ dia, label: formatDiaDivisorWA(criadoEm), itens: [raw] });
      }
    }
    return grupos;
  }, [mensagens]);

  const handleNovaConversa = () => {
    if (!novoPhone.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o telefone.');
      return;
    }
    createMarketingWaConversa({ phone: novoPhone.trim(), display_name: novoNome || undefined }, actorId)
      .then(() => {
        setIsNovaConversaOpen(false);
        setNovoPhone('');
        setNovoNome('');
        load();
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível criar a conversa.')));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={marketingUserInitials} variant="marketing" onAvatarPress={() => navigation.navigate('MarketingProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MktPageHeader icon="message-circle" title="WhatsApp" subtitle="Fila de atendimento e conversas ativas." />

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          <View style={[mkStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
            <Text style={mkStyles.kpiLabel}>Na fila</Text>
            <Text style={mkStyles.kpiValue}>{formatNumeroBR(contadores.fila)}</Text>
          </View>
          <View style={[mkStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
            <Text style={mkStyles.kpiLabel}>Em atendimento</Text>
            <Text style={mkStyles.kpiValue}>{formatNumeroBR(contadores.em_atendimento)}</Text>
          </View>
          <View style={[mkStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
            <Text style={mkStyles.kpiLabel}>Finalizadas hoje</Text>
            <Text style={mkStyles.kpiValue}>{formatNumeroBR(contadores.finalizadas_hoje)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Pressable
            style={[mkStyles.suggestionButton, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
            onPress={() => setIsNovaConversaOpen(true)}
          >
            <Feather name="edit" size={14} color="#FFFFFF" />
            <Text style={mkStyles.suggestionButtonText}>Nova conversa</Text>
          </Pressable>
          <Pressable style={mkStyles.waIconButton} onPress={handleSincronizar} disabled={isSincronizando}>
            {isSincronizando ? <ActivityIndicator color="#5E667D" size="small" /> : <Feather name="refresh-cw" size={16} color="#5E667D" />}
          </Pressable>
          <Pressable style={[mkStyles.waIconButton, { backgroundColor: '#C2255C' }]} onPress={abrirAgenda}>
            <Feather name="book-open" size={16} color="#FFFFFF" />
          </Pressable>
        </View>

        <MktSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar por nome, telefone ou tag..." />

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
          {WA_ABA_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[mkStyles.waAbaPill, { flex: 1 }, aba === opt.value ? mkStyles.waAbaPillActive : null]}
              onPress={() => setAba(opt.value)}
            >
              <Text style={[mkStyles.waAbaPillText, aba === opt.value ? mkStyles.waAbaPillTextActive : null]} numberOfLines={1}>
                {opt.label} ({contadores.abas[opt.value]})
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
          {WA_CHANNEL_OPTIONS.map((opt) => (
            <Pressable
              key={opt.label}
              style={[mkStyles.waAbaPill, { flex: 1 }, channel === opt.value ? mkStyles.waAbaPillActive : null]}
              onPress={() => setChannel(opt.value)}
            >
              <Text style={[mkStyles.waAbaPillText, channel === opt.value ? mkStyles.waAbaPillTextActive : null]} numberOfLines={1}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {tagsDisponiveis.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <Pressable style={[mkStyles.filterChipSmall, !tagFiltro ? mkStyles.filterPillActive : null]} onPress={() => setTagFiltro(null)}>
              <Text style={[mkStyles.filterChipSmallText, !tagFiltro ? mkStyles.filterPillTextActive : null]}>Todas as tags</Text>
            </Pressable>
            {tagsDisponiveis.map((tag) => (
              <Pressable
                key={tag}
                style={[mkStyles.filterChipSmall, tagFiltro === tag ? mkStyles.filterPillActive : null]}
                onPress={() => setTagFiltro(tag)}
              >
                <Text style={[mkStyles.filterChipSmallText, tagFiltro === tag ? mkStyles.filterPillTextActive : null]}>#{tag}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color="#C2255C" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <MktEmptyState message={errorMessage} />
        ) : conversas.length === 0 ? (
          <MktEmptyState message="Nenhuma conversa encontrada." />
        ) : (
          conversas.map((conversa) => (
            <Pressable key={conversa.phone} style={mkStyles.dreCard} onPress={() => abrirConversa(conversa)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  {conversa.nao_assumido ? <View style={mkStyles.waDotLaranja} /> : null}
                  <Text style={mkStyles.listRowTitle} numberOfLines={1}>
                    {conversa.display_name ?? conversa.phone}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {conversa.nao_lidas > 0 ? (
                    <View style={mkStyles.waUnreadBadge}>
                      <Text style={mkStyles.waUnreadBadgeText}>{conversa.nao_lidas}</Text>
                    </View>
                  ) : null}
                  <View style={[mkStyles.badge, { backgroundColor: '#FBE4ED' }]}>
                    <Text style={[mkStyles.badgeText, { color: '#C2255C' }]}>{conversa.chat_status_label ?? conversa.chat_status}</Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {conversa.ultima_direcao === 'outbound' && conversa.ultima_mensagem_status ? (
                  <Feather
                    name={conversa.ultima_mensagem_status === 'read' ? 'check-circle' : conversa.ultima_mensagem_status === 'failed' ? 'alert-circle' : 'check'}
                    size={12}
                    color={conversa.ultima_mensagem_status === 'read' ? '#34B7F1' : conversa.ultima_mensagem_status === 'failed' ? '#E6213D' : '#9AA3B5'}
                  />
                ) : null}
                <Text style={mkStyles.listRowMeta} numberOfLines={1}>
                  {conversa.ultima_mensagem ?? 'Sem mensagens ainda'}
                </Text>
              </View>
              <Text style={mkStyles.listRowMeta}>{conversa.atendente_nome ?? 'Sem atendente'} · {conversa.channel}</Text>
              {conversa.tags.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {conversa.tags.map((tag) => (
                    <View key={tag} style={mkStyles.waTagChip}>
                      <Text style={mkStyles.waTagChipText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>

      <MktModal visible={isNovaConversaOpen} title="Nova conversa" onClose={() => setIsNovaConversaOpen(false)}>
        <MktFormLabel>Telefone *</MktFormLabel>
        <TextInput
          style={mkStyles.formInput}
          value={novoPhone}
          onChangeText={(text) => setNovoPhone(formatTelefoneBR(text))}
          placeholder="(xx) 99999-9999"
          placeholderTextColor="#A7AEC2"
          keyboardType="phone-pad"
          maxLength={15}
        />
        <View style={{ height: 12 }} />
        <MktFormLabel>Nome</MktFormLabel>
        <TextInput style={mkStyles.formInput} value={novoNome} onChangeText={setNovoNome} placeholder="Nome do contato" placeholderTextColor="#A7AEC2" />
        <Pressable style={mkStyles.filterModalApplyButton} onPress={handleNovaConversa}>
          <Text style={mkStyles.filterModalApplyButtonText}>Criar conversa</Text>
        </Pressable>
      </MktModal>

      <MktModal visible={isAgendaOpen} title="Agenda de contatos" onClose={() => setIsAgendaOpen(false)}>
        <MktSearchInput value={agendaBusca} onChangeText={setAgendaBusca} placeholder="Buscar contato..." />
        {isLoadingAgenda ? (
          <ActivityIndicator color="#C2255C" style={{ marginTop: 12 }} />
        ) : agendaError ? (
          <MktEmptyState message={agendaError} />
        ) : agendaContatos.length === 0 ? (
          <MktEmptyState message="Nenhum contato encontrado." />
        ) : (
          agendaContatos.map((contato) => (
            <Pressable
              key={contato.phone}
              style={({ pressed }) => [mkStyles.dreCard, pressed ? mkStyles.dreCardPressed : null]}
              onPress={() => {
                setIsAgendaOpen(false);
                abrirConversa({
                  phone: contato.phone,
                  display_name: contato.display_name,
                  chat_status: 'fila',
                  chat_status_label: null,
                  atendente_nome: null,
                  channel: contato.channel,
                  ultima_mensagem: null,
                  ultima_mensagem_em: null,
                  ultima_direcao: null,
                  tags: contato.tags,
                  nao_lidas: 0,
                  nao_assumido: false,
                  ultima_mensagem_status: null,
                  ultima_mensagem_tipo: null,
                  janela_24h_aberta: false,
                  janela_expira_em: null,
                  muted: false,
                  blocked: false,
                  notas: null,
                });
              }}
            >
              <Text style={mkStyles.listRowTitle}>{contato.display_name ?? contato.phone}</Text>
              <Text style={mkStyles.listRowMeta}>{formatTelefoneBR(contato.phone)} · {contato.channel}</Text>
            </Pressable>
          ))
        )}
      </MktModal>

      <Modal visible={conversaAtiva != null} animationType="slide" onRequestClose={() => setConversaAtiva(null)}>
        {/* SafeAreaProvider próprio: um <Modal> nativo abre uma nova janela e o
            SafeAreaProvider do App.tsx (raiz) não repassa os insets pra dentro
            dela — sem isso o cabeçalho fica embaixo do relógio/status bar do
            iOS. Recriando o provider aqui, os insets são medidos de novo pra
            essa janela do Modal. */}
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#ECE5DD' }}>
            <StatusBar style="light" />
            {conversaAtiva ? (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={mkStyles.waChatHeader}>
                <Pressable onPress={() => setConversaAtiva(null)} hitSlop={8}>
                  <Feather name="arrow-left" size={20} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}
                  onPress={() => setIsAtendimentoOpen(true)}
                >
                  <View style={mkStyles.waChatAvatar}>
                    <Text style={mkStyles.waChatAvatarText}>
                      {(conversaAtiva.display_name ?? conversaAtiva.phone).trim().slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={mkStyles.waChatHeaderName} numberOfLines={1}>
                      {conversaAtiva.display_name ?? formatTelefoneBR(conversaAtiva.phone)}
                    </Text>
                    <Text style={mkStyles.waChatHeaderMeta} numberOfLines={1}>
                      {formatTelefoneBR(conversaAtiva.phone)} · {conversaAtiva.chat_status_label ?? conversaAtiva.chat_status}
                    </Text>
                  </View>
                </Pressable>
                <Pressable style={mkStyles.waChatHeaderBtn} onPress={() => handleAssumirOuFinalizar('em_atendimento')}>
                  <Text style={mkStyles.waChatHeaderBtnText}>Assumir</Text>
                </Pressable>
                <Pressable style={{ padding: 4 }} onPress={() => setIsMenuAberto((v) => !v)} hitSlop={8}>
                  <Feather name="more-vertical" size={20} color="#FFFFFF" />
                </Pressable>
              </View>

              {isMenuAberto ? (
                <>
                  <Pressable style={mkStyles.waMenuBackdrop} onPress={() => setIsMenuAberto(false)} />
                  <View style={mkStyles.waMenuDropdown}>
                    <Pressable style={mkStyles.waMenuItem} onPress={() => handleAssumirOuFinalizar('finalizado')}>
                      <Feather name="check-circle" size={15} color="#3A415C" />
                      <Text style={mkStyles.waMenuItemText}>Finalizar conversa</Text>
                    </Pressable>
                    <Pressable style={mkStyles.waMenuItem} onPress={() => handleSilenciarOuBloquear('muted', !conversaAtiva.muted)}>
                      <Feather name="bell-off" size={15} color="#3A415C" />
                      <Text style={mkStyles.waMenuItemText}>{conversaAtiva.muted ? 'Dessilenciar' : 'Silenciar'}</Text>
                    </Pressable>
                    <Pressable style={mkStyles.waMenuItem} onPress={() => handleSilenciarOuBloquear('blocked', !conversaAtiva.blocked)}>
                      <Feather name="slash" size={15} color="#C2263A" />
                      <Text style={[mkStyles.waMenuItemText, { color: '#C2263A' }]}>{conversaAtiva.blocked ? 'Desbloquear contato' : 'Bloquear contato'}</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {contatoInfo && !contatoInfo.janela_24h_aberta ? (
                <View style={mkStyles.waJanelaAviso}>
                  <Text style={mkStyles.waJanelaAvisoText}>Janela 24h fechada. Para iniciar conversa, envie um template aprovado.</Text>
                  <Pressable style={mkStyles.waJanelaAvisoBtn} onPress={abrirTemplates}>
                    <Text style={mkStyles.waJanelaAvisoBtnText}>Escolher template</Text>
                  </Pressable>
                </View>
              ) : null}

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                {isLoadingMensagens ? (
                  <ActivityIndicator color="#C2255C" style={{ marginTop: 20 }} />
                ) : mensagens.length === 0 ? (
                  <MktEmptyState message="Nenhuma mensagem ainda." />
                ) : (
                  mensagensAgrupadas.map((grupo) => (
                    <View key={grupo.dia}>
                      <View style={mkStyles.waDateDivider}>
                        <Text style={mkStyles.waDateDividerText}>{grupo.label}</Text>
                      </View>
                      {grupo.itens.map((raw, idx) => {
                        const direcao = pickMktField(raw, ['direcao', 'direction', 'tipo']) ?? 'inbound';
                        const isSistema = direcao === 'sistema' || direcao === 'system';
                        const texto = extractMktWaTexto(raw);
                        const criadoEm = pickMktField(raw, ['created_at', 'timestamp', 'data']);
                        const isOutbound = direcao === 'outbound' || direcao === 'saida';
                        if (isSistema) {
                          return (
                            <View key={idx} style={mkStyles.waSystemMessage}>
                              <Text style={mkStyles.waSystemMessageText}>{texto}</Text>
                            </View>
                          );
                        }
                        return (
                          <View key={idx} style={[mkStyles.waBubbleRow, { justifyContent: isOutbound ? 'flex-end' : 'flex-start' }]}>
                            <View style={[mkStyles.waBubble, isOutbound ? mkStyles.waBubbleOut : mkStyles.waBubbleIn]}>
                              <Text style={mkStyles.waBubbleText}>{texto}</Text>
                              <Text style={mkStyles.waBubbleTime}>{formatHoraBR(criadoEm)}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))
                )}
              </ScrollView>

              {conversaAtiva.blocked ? (
                <View style={[mkStyles.waJanelaAviso, { backgroundColor: '#FBE4E7' }]}>
                  <Text style={[mkStyles.waJanelaAvisoText, { color: '#C2263A' }]}>Contato bloqueado — desbloqueie no menu (⋮) pra poder enviar mensagem.</Text>
                </View>
              ) : null}

              {/* As sugestões contextuais só aparecem se tocar no raio (⚡) —
                  antes ficavam sempre visíveis acima do composer. */}
              {isQuickPickOpen && sugestoes.length > 0 ? (
                <View style={{ paddingHorizontal: 12, paddingTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {sugestoes.map((sugestao) => (
                    <Pressable
                      key={sugestao.id}
                      style={mkStyles.waSugestaoChip}
                      onPress={() => {
                        setTextoEnvio(sugestao.texto);
                        setIsQuickPickOpen(false);
                      }}
                    >
                      <Text style={mkStyles.waSugestaoChipText} numberOfLines={1}>{sugestao.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {(respostasSugeridas.length > 0 || isQuickPickOpen) ? (
                <View style={mkStyles.waRespostasSugeridasBox}>
                  {(isQuickPickOpen ? respostas : respostasSugeridas).length === 0 ? (
                    <Text style={[mkStyles.listRowMeta, { padding: 10 }]}>Nenhuma resposta rápida cadastrada.</Text>
                  ) : (
                    (isQuickPickOpen ? respostas : respostasSugeridas).map((r) => (
                      <Pressable
                        key={r.id}
                        style={mkStyles.waRespostaSugeridaItem}
                        onPress={() => {
                          setTextoEnvio(r.texto);
                          setIsQuickPickOpen(false);
                        }}
                      >
                        <Text style={mkStyles.waRespostaSugeridaAtalho}>/{r.atalho}</Text>
                        <Text style={mkStyles.waRespostaSugeridaTexto} numberOfLines={1}>{r.texto}</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}

              {isEmojiPickerOpen ? (
                <View style={mkStyles.waEmojiRow}>
                  {WA_EMOJIS.map((emoji) => (
                    <Pressable key={emoji} onPress={() => setTextoEnvio((atual) => atual + emoji)} style={{ padding: 4 }}>
                      <Text style={{ fontSize: 22 }}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={mkStyles.waComposerBar}>
                <Pressable
                  style={mkStyles.waComposerIconBtn}
                  onPress={() => {
                    setIsEmojiPickerOpen((v) => !v);
                    setIsQuickPickOpen(false);
                  }}
                >
                  <Feather name="smile" size={19} color="#5E667D" />
                </Pressable>
                <Pressable
                  style={mkStyles.waComposerIconBtn}
                  onPress={() => {
                    setIsQuickPickOpen((v) => !v);
                    setIsEmojiPickerOpen(false);
                  }}
                >
                  <Feather name="zap" size={19} color="#5E667D" />
                </Pressable>
                <Pressable style={mkStyles.waComposerIconBtn} onPress={handleAnexarMidia} disabled={isUploadingMidia}>
                  {isUploadingMidia ? <ActivityIndicator size="small" color="#5E667D" /> : <Feather name="paperclip" size={19} color="#5E667D" />}
                </Pressable>
                <TextInput
                  style={mkStyles.waComposerInput}
                  value={textoEnvio}
                  onChangeText={setTextoEnvio}
                  placeholder="Digite uma mensagem ou / para respostas rápidas"
                  placeholderTextColor="#A7AEC2"
                  multiline
                  editable={!conversaAtiva.blocked}
                />
                {audioRecorderState.isRecording ? (
                  <Pressable
                    style={[mkStyles.waSendButton, { flexDirection: 'row', paddingHorizontal: 10, width: undefined, gap: 4 }]}
                    onPress={handlePararEEnviarGravacao}
                    disabled={isEnviandoAudio}
                  >
                    {isEnviandoAudio ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <View style={mkStyles.waRecDot} />
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                          {Math.floor(audioRecorderState.durationMillis / 1000)}s
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : textoEnvio.trim() ? (
                  <Pressable
                    style={[mkStyles.waSendButton, isSending || conversaAtiva.blocked ? { opacity: 0.6 } : null]}
                    onPress={handleEnviar}
                    disabled={isSending || conversaAtiva.blocked}
                  >
                    <Feather name="send" size={17} color="#FFFFFF" />
                  </Pressable>
                ) : (
                  <Pressable
                    style={[mkStyles.waSendButton, conversaAtiva.blocked ? { opacity: 0.6 } : null]}
                    onPress={handleIniciarGravacao}
                    disabled={conversaAtiva.blocked}
                  >
                    <Feather name="mic" size={18} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>

              {isAtendimentoOpen ? (
                <View style={mkStyles.waAtendimentoOverlay}>
                  <Pressable style={{ flex: 1 }} onPress={() => setIsAtendimentoOpen(false)} />
                  <View style={mkStyles.waAtendimentoPanel}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <Text style={mkStyles.sectionTitle}>Atendimento</Text>
                      <Pressable onPress={() => setIsAtendimentoOpen(false)} hitSlop={8}>
                        <Feather name="x" size={20} color="#677089" />
                      </Pressable>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={{ alignItems: 'center', marginBottom: 14 }}>
                      <View style={[mkStyles.waChatAvatar, { backgroundColor: '#FBE4ED', width: 56, height: 56, borderRadius: 28 }]}>
                        <Text style={[mkStyles.waChatAvatarText, { color: '#C2255C', fontSize: 18 }]}>
                          {(conversaAtiva.display_name ?? conversaAtiva.phone).trim().slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[mkStyles.listRowTitle, { marginTop: 8 }]}>{conversaAtiva.display_name ?? 'Sem nome de exibição'}</Text>
                      <Text style={mkStyles.listRowMeta}>{formatTelefoneBR(conversaAtiva.phone)}</Text>
                    </View>

                    <MktFormLabel>Nome de exibição</MktFormLabel>
                    <TextInput
                      style={mkStyles.formInput}
                      value={nomeExibicaoEdit}
                      onChangeText={setNomeExibicaoEdit}
                      placeholder="Nome do contato"
                      placeholderTextColor="#A7AEC2"
                    />

                    <View style={{ height: 14 }} />
                    <MktFormLabel>Atendente</MktFormLabel>
                    <MktFieldDropdown
                      label={atendentes.find((a) => a.nome === conversaAtiva.atendente_nome)?.nome ?? ''}
                      options={[
                        { value: null as string | null, label: 'Sem atendente' },
                        ...atendentes.map((a) => ({ value: a.id as string | null, label: a.nome })),
                      ]}
                      selectedValue={atendentes.find((a) => a.nome === conversaAtiva.atendente_nome)?.id ?? null}
                      isOpen={atendenteAberto}
                      onToggle={() => setAtendenteAberto((v) => !v)}
                      onSelect={handleSalvarAtendente}
                      searchable
                    />

                    <View style={{ marginTop: 18 }}>
                      <MktFormLabel>Etiquetas</MktFormLabel>
                      {tagsEdit.length === 0 ? (
                        <Text style={[mkStyles.listRowMeta, { marginTop: 4, fontStyle: 'italic' }]}>Nenhuma etiqueta</Text>
                      ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {tagsEdit.map((tag) => (
                            <View key={tag} style={[mkStyles.filterChipSmall, mkStyles.filterPillActive, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                              <Text style={[mkStyles.filterChipSmallText, mkStyles.filterPillTextActive]}>#{tag}</Text>
                              <Pressable onPress={() => setTagsEdit((atual) => atual.filter((t) => t !== tag))} hitSlop={6}>
                                <Feather name="x" size={11} color="#FFFFFF" />
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TextInput
                          style={[mkStyles.formInput, { flex: 1 }]}
                          value={novaTagTexto}
                          onChangeText={setNovaTagTexto}
                          placeholder="Nova etiqueta"
                          placeholderTextColor="#A7AEC2"
                          autoCapitalize="none"
                          onSubmitEditing={handleAdicionarNovaTag}
                        />
                        <Pressable style={mkStyles.waIconButton} onPress={handleAdicionarNovaTag}>
                          <Feather name="plus" size={18} color="#5E667D" />
                        </Pressable>
                      </View>
                      {tagsDisponiveis.filter((t) => !tagsEdit.includes(t)).length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {tagsDisponiveis
                            .filter((t) => !tagsEdit.includes(t))
                            .map((tag) => (
                              <Pressable key={tag} style={mkStyles.filterChipSmall} onPress={() => setTagsEdit((atual) => [...atual, tag])}>
                                <Text style={mkStyles.filterChipSmallText}>+ #{tag}</Text>
                              </Pressable>
                            ))}
                        </View>
                      ) : null}
                    </View>

                    <View style={{ marginTop: 14 }}>
                      <MktFormLabel>Notas internas</MktFormLabel>
                      <TextInput
                        style={[mkStyles.formInput, { minHeight: 70, textAlignVertical: 'top' }]}
                        value={notasEdit}
                        onChangeText={setNotasEdit}
                        placeholder="Observações sobre o contato (só você vê)..."
                        placeholderTextColor="#A7AEC2"
                        multiline
                      />
                    </View>

                    <Pressable
                      style={[mkStyles.filterModalApplyButton, { marginTop: 12 }, isSalvandoPainel ? { opacity: 0.6 } : null]}
                      onPress={handleSalvarPainelAtendimento}
                      disabled={isSalvandoPainel}
                    >
                      <Text style={mkStyles.filterModalApplyButtonText}>{isSalvandoPainel ? 'Salvando...' : 'Salvar'}</Text>
                    </Pressable>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}
                      onPress={() => setIsRespostasOpen(true)}
                    >
                      <MktFormLabel>Respostas rápidas</MktFormLabel>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={mkStyles.listRowMeta}>{respostas.length}</Text>
                        <Feather name="chevron-right" size={14} color="#677089" />
                      </View>
                    </Pressable>

                    {atendenteAberto ? <View style={{ height: 280 }} /> : null}
                    </ScrollView>
                  </View>
                </View>
              ) : null}

              {/* Renderizada como overlay dentro deste mesmo <Modal> do chat,
                  não como um segundo <Modal> nativo — dois Modals abertos ao
                  mesmo tempo no iOS deixam o toque lento/instável (mesma
                  lição do MktInlineSelect). */}
              {isRespostasOpen ? (
                <View style={mkStyles.waRespostasOverlay}>
                  <Pressable
                    style={mkStyles.modalBackdrop}
                    onPress={() => {
                      setIsRespostasOpen(false);
                      setIsFormRespostaAberto(false);
                      setRespostaEditandoId(null);
                      setRespostaAtalho('');
                      setRespostaTexto('');
                    }}
                  >
                    <Pressable style={[mkStyles.modalCard, { maxHeight: '86%' }]} onPress={() => {}}>
                      <View style={mkStyles.modalHeader}>
                        <Text style={mkStyles.modalTitle}>
                          {isFormRespostaAberto ? (respostaEditandoId ? 'Editar resposta' : 'Nova resposta') : 'Respostas rápidas'}
                        </Text>
                        <Pressable
                          onPress={() => {
                            if (isFormRespostaAberto) {
                              setIsFormRespostaAberto(false);
                              setRespostaEditandoId(null);
                              setRespostaAtalho('');
                              setRespostaTexto('');
                              return;
                            }
                            setIsRespostasOpen(false);
                          }}
                          hitSlop={8}
                        >
                          <Feather name={isFormRespostaAberto ? 'arrow-left' : 'x'} size={20} color="#677089" />
                        </Pressable>
                      </View>
                      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {isFormRespostaAberto ? null : (
                          <>
                            <Text style={mkStyles.listRowMeta}>Crie atalhos para mensagens frequentes. Use digitando /atalho no chat.</Text>
                            <View style={{ height: 10 }} />
                          </>
                        )}

                        {isFormRespostaAberto ? (
                          <>
                            <MktFormLabel>Atalho</MktFormLabel>
                            <TextInput
                              style={mkStyles.formInput}
                              value={respostaAtalho}
                              onChangeText={setRespostaAtalho}
                              placeholder="ex: saudacao"
                              placeholderTextColor="#A7AEC2"
                              autoCapitalize="none"
                            />
                            <Text style={[mkStyles.listRowMeta, { marginTop: 3 }]}>Apenas letras minúsculas, sem espaços. Será chamado por /atalho.</Text>
                            <View style={{ height: 10 }} />
                            <MktFormLabel>Texto</MktFormLabel>
                            <TextInput
                              style={[mkStyles.formInput, { minHeight: 70, textAlignVertical: 'top' }]}
                              value={respostaTexto}
                              onChangeText={setRespostaTexto}
                              placeholder="Texto da resposta rápida"
                              placeholderTextColor="#A7AEC2"
                              multiline
                            />
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                              <Pressable
                                style={[mkStyles.smallButton, { flex: 1, backgroundColor: '#F1F2F6' }]}
                                onPress={() => {
                                  setIsFormRespostaAberto(false);
                                  setRespostaEditandoId(null);
                                  setRespostaAtalho('');
                                  setRespostaTexto('');
                                }}
                              >
                                <Text style={[mkStyles.smallButtonText, { color: '#5E667D' }]}>Cancelar</Text>
                              </Pressable>
                              <Pressable
                                style={[mkStyles.filterModalApplyButton, { flex: 1 }, isSalvandoResposta ? { opacity: 0.6 } : null]}
                                onPress={handleSalvarResposta}
                                disabled={isSalvandoResposta}
                              >
                                <Text style={mkStyles.filterModalApplyButtonText}>{isSalvandoResposta ? 'Salvando...' : 'Salvar'}</Text>
                              </Pressable>
                            </View>
                            <View style={{ height: 16 }} />
                          </>
                        ) : (
                          <Pressable
                            style={[mkStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }]}
                            onPress={() => setIsFormRespostaAberto(true)}
                          >
                            <Feather name="plus" size={14} color="#FFFFFF" />
                            <Text style={mkStyles.suggestionButtonText}>Nova resposta</Text>
                          </Pressable>
                        )}

                        {isFormRespostaAberto ? null : respostasError ? (
                          <MktEmptyState message={respostasError} />
                        ) : respostas.length === 0 ? (
                          <MktEmptyState message="Nenhuma resposta rápida cadastrada." />
                        ) : (
                          respostas.map((r) => (
                            <View key={r.id} style={[mkStyles.dreCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={mkStyles.listRowTitle}>/{r.atalho}</Text>
                                <Text style={mkStyles.listRowMeta} numberOfLines={2}>{r.texto}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', gap: 14, marginLeft: 10 }}>
                                <Pressable
                                  onPress={() => {
                                    setRespostaEditandoId(r.id);
                                    setRespostaAtalho(r.atalho);
                                    setRespostaTexto(r.texto);
                                    setIsFormRespostaAberto(true);
                                  }}
                                  hitSlop={8}
                                >
                                  <Feather name="edit-2" size={15} color="#5E667D" />
                                </Pressable>
                                <Pressable onPress={() => handleExcluirResposta(r.id)} hitSlop={8}>
                                  <Feather name="trash-2" size={16} color="#C2263A" />
                                </Pressable>
                              </View>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </Pressable>
                  </Pressable>
                </View>
              ) : null}
            </KeyboardAvoidingView>
            ) : null}
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      <MktModal visible={isTemplatesOpen} title="Escolher template" onClose={() => setIsTemplatesOpen(false)}>
        {isLoadingTemplates ? (
          <ActivityIndicator color="#C2255C" style={{ marginTop: 12 }} />
        ) : templatesError ? (
          <MktEmptyState message={templatesError} />
        ) : templates.length === 0 ? (
          <MktEmptyState message="Nenhum template aprovado disponível." />
        ) : (
          templates.map((template) => (
            <Pressable
              key={template.name}
              style={[mkStyles.dreCard, isSendingTemplate ? { opacity: 0.6 } : null]}
              onPress={() => handleEnviarTemplate(template)}
              disabled={isSendingTemplate}
            >
              <Text style={mkStyles.listRowTitle}>{template.name}</Text>
              <Text style={mkStyles.listRowMeta}>{template.corpo}</Text>
              {template.variaveis.length > 0 ? (
                <Text style={[mkStyles.listRowMeta, { marginTop: 4 }]}>Variáveis: {template.variaveis.join(', ')}</Text>
              ) : null}
            </Pressable>
          ))
        )}
      </MktModal>

    </SafeAreaView>
  );
}

// --- 4. Google ---

const GMB_REVIEW_FILTER_OPTIONS: Array<{ value: 'todas' | 'sem_resposta' | 'baixas' | 'altas'; label: string }> = [
  { value: 'todas', label: 'Todas' },
  { value: 'sem_resposta', label: 'Sem resposta' },
  { value: 'baixas', label: '1-2★' },
  { value: 'altas', label: '4-5★' },
];

export function MarketingGoogleScreen({ navigation }: ScreenProps<'MarketingGoogle'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;
  const isFocused = useIsFocused();

  const [gmb, setGmb] = useState<MarketingGmbData | null>(null);
  const [isLoadingGmb, setIsLoadingGmb] = useState(true);
  const [gmbError, setGmbError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [reviewFiltro, setReviewFiltro] = useState<'todas' | 'sem_resposta' | 'baixas' | 'altas'>('todas');
  const [reviews, setReviews] = useState<MarketingGmbReviewItem[]>([]);
  const [reviewsStatus, setReviewsStatus] = useState<string>('desconectado');
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [respostaPorReview, setRespostaPorReview] = useState<Record<string, string>>({});
  const [enviandoReviewId, setEnviandoReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!isFocused) return;
    setIsLoadingGmb(true);
    setGmbError(null);
    fetchMarketingGmb()
      .then(setGmb)
      .catch((err) => setGmbError(showMktError(err, 'Não foi possível carregar a conta do Google.')))
      .finally(() => setIsLoadingGmb(false));
  }, [isFocused]);

  const loadReviews = useCallback(() => {
    setIsLoadingReviews(true);
    fetchMarketingGmbReviews({ locationId: locationId ?? undefined, filtro: reviewFiltro })
      .then((res) => {
        setReviews(res.itens);
        setReviewsStatus(res.status);
      })
      .catch(() => {
        setReviews([]);
        setReviewsStatus('desconectado');
      })
      .finally(() => setIsLoadingReviews(false));
  }, [locationId, reviewFiltro]);

  useEffect(() => {
    if (!isFocused) return;
    loadReviews();
  }, [loadReviews, isFocused]);

  const handleResponder = (reviewId: string) => {
    const texto = (respostaPorReview[reviewId] ?? '').trim();
    if (!texto) return;
    setEnviandoReviewId(reviewId);
    responderMarketingGmbReview({ reviewId, texto }, actorId)
      .then(() => {
        setRespostaPorReview((current) => ({ ...current, [reviewId]: '' }));
        loadReviews();
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível enviar a resposta.')))
      .finally(() => setEnviandoReviewId(null));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={marketingUserInitials} variant="marketing" onAvatarPress={() => navigation.navigate('MarketingProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MktPageHeader icon="star" title="Google" subtitle="Postos conectados e avaliações do Google Meu Negócio." />

        {isLoadingGmb ? (
          <ActivityIndicator color="#C2255C" style={{ marginTop: 20 }} />
        ) : gmbError ? (
          <MktEmptyState message={gmbError} />
        ) : !gmb || gmb.locations.length === 0 ? (
          <MktEmptyState message="Nenhum posto conectado ao Google Meu Negócio ainda." />
        ) : (
          <>
            {reviewsStatus === 'aguardando_liberacao' ? (
              <View style={mkStyles.chartCard}>
                <Text style={mkStyles.listRowMeta}>
                  Aguardando liberação da Business Profile API pelo Google. Postos e informações estão sincronizados; o feed de avaliações ativa automaticamente após a aprovação.
                </Text>
              </View>
            ) : null}

            <Text style={mkStyles.sectionTitle}>Postos ({gmb.locationsCount})</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              <Pressable
                style={[mkStyles.filterPill, locationId === null ? mkStyles.filterPillActive : null]}
                onPress={() => setLocationId(null)}
              >
                <Text style={[mkStyles.filterPillText, locationId === null ? mkStyles.filterPillTextActive : null]}>Todos os postos</Text>
              </Pressable>
            </View>
            {gmb.locations.map((loc) => (
              <Pressable key={loc.id} style={mkStyles.dreCard} onPress={() => setLocationId(loc.id)}>
                <Text style={mkStyles.listRowTitle} numberOfLines={1}>{loc.title}</Text>
                <Text style={mkStyles.listRowMeta}>
                  {loc.average_rating != null ? loc.average_rating.toFixed(1) : '—'} ★ ({formatNumeroBR(loc.total_reviews)}) · {formatNumeroBR(loc.unreplied)} sem resposta
                </Text>
              </Pressable>
            ))}

            <View style={{ height: 8 }} />
            <Text style={mkStyles.sectionTitle}>Avaliações</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {GMB_REVIEW_FILTER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[mkStyles.filterPill, reviewFiltro === opt.value ? mkStyles.filterPillActive : null]}
                  onPress={() => setReviewFiltro(opt.value)}
                >
                  <Text style={[mkStyles.filterPillText, reviewFiltro === opt.value ? mkStyles.filterPillTextActive : null]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            {isLoadingReviews ? (
              <ActivityIndicator color="#C2255C" />
            ) : reviewsStatus === 'aguardando_liberacao' ? (
              <MktEmptyState message="Feed disponível após liberação da API pelo Google." />
            ) : reviews.length === 0 ? (
              <MktEmptyState message="Nenhuma avaliação encontrada." />
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={mkStyles.dreCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={mkStyles.listRowTitle}>{review.reviewer_name ?? 'Anônimo'}</Text>
                    <Text style={mkStyles.listRowValue}>{'★'.repeat(Math.max(0, Math.min(5, review.star_rating)))}</Text>
                  </View>
                  {review.comment ? <Text style={[mkStyles.profileFieldText, { marginTop: 4 }]}>{review.comment}</Text> : null}
                  <Text style={[mkStyles.listRowMeta, { marginTop: 4 }]}>{formatDateTimeBR(review.created_at_google)}</Text>
                  {review.reply_comment ? (
                    <View style={{ marginTop: 8, backgroundColor: '#F1F2F6', borderRadius: 10, padding: 10 }}>
                      <Text style={mkStyles.listRowMeta}>Sua resposta</Text>
                      <Text style={mkStyles.profileFieldText}>{review.reply_comment}</Text>
                    </View>
                  ) : (
                    <>
                      <TextInput
                        style={[mkStyles.formInput, { marginTop: 8 }]}
                        value={respostaPorReview[review.id] ?? ''}
                        onChangeText={(text) => setRespostaPorReview((current) => ({ ...current, [review.id]: text }))}
                        placeholder="Responder avaliação..."
                        placeholderTextColor="#A7AEC2"
                      />
                      <Pressable
                        style={[mkStyles.smallButton, { marginTop: 8, alignSelf: 'flex-start' }]}
                        onPress={() => handleResponder(review.id)}
                        disabled={enviandoReviewId === review.id}
                      >
                        <Text style={mkStyles.smallButtonText}>{enviandoReviewId === review.id ? 'Enviando...' : 'Responder'}</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- 5. Leva+ ---

export function MarketingLevaMaisScreen({ navigation }: ScreenProps<'MarketingLevaMais'>) {
  const { periodo, setPeriodo, refMes, refAno, handleAnterior, handleProximo, handleReset } = useMktPeriodoNav();
  const [lojas, setLojas] = useState<MarketingLevaMaisLoja[]>([]);
  const [lojaSelecionada, setLojaSelecionada] = useState<string | null>(null);
  const [lojaModalOpen, setLojaModalOpen] = useState(false);
  const [metricas, setMetricas] = useState<MarketingLevaMaisMetricas | null>(null);
  const [frentistas, setFrentistas] = useState<MarketingLevaMaisFrentista[]>([]);
  const [statusGeral, setStatusGeral] = useState<Partial<MarketingLevaMaisStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketingLevaMaisLojas()
      .then(setLojas)
      .catch(() => setLojas([]));
    fetchMarketingLevaMaisFrentistas()
      .then(setFrentistas)
      .catch(() => setFrentistas([]));
    fetchMarketingLevaMaisStatus()
      .then(setStatusGeral)
      .catch(() => setStatusGeral({}));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const { dataInicial, dataFinal } = mktPeriodoDatas(periodo, refMes, refAno);
    fetchMarketingLevaMaisMetricas({ startDate: dataInicial, endDate: dataFinal, storeId: lojaSelecionada ?? undefined })
      .then(setMetricas)
      .catch((err) => setErrorMessage(showMktError(err, 'Não foi possível carregar as métricas do Leva+.')))
      .finally(() => setIsLoading(false));
  }, [periodo, refMes, refAno, lojaSelecionada]);

  const lojaLabel = lojaSelecionada ? lojas.find((l) => l.storeId === lojaSelecionada)?.storeName ?? 'Loja' : `Todas as Lojas (${lojas.length})`;
  const lojaOptions = useMemo(
    () => [{ value: null as string | null, label: `Todas as Lojas (${lojas.length})` }, ...lojas.map((l) => ({ value: l.storeId, label: l.storeName }))],
    [lojas]
  );

  const cashbackResgatado = metricas?.totals.totalPointsRedeemed ?? 0;
  const cashbackCirculando = Math.max(0, (metricas?.totals.totalPointsGenerated ?? 0) - cashbackResgatado);
  const cashbackTotal = cashbackResgatado + cashbackCirculando;

  const byDayComRevenue = (metricas?.byDay ?? []).filter((raw) => pickMktNumber(raw, ['revenue', 'faturamento', 'totalRevenue']) != null);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={marketingUserInitials} variant="marketing" onAvatarPress={() => navigation.navigate('MarketingProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MktPageHeader icon="heart" title="Leva+" subtitle="Performance da rede no programa de fidelidade Leva+." />

        <MktPeriodoFiltro
          periodo={periodo}
          onChangePeriodo={setPeriodo}
          refMes={refMes}
          refAno={refAno}
          onAnterior={handleAnterior}
          onProximo={handleProximo}
          onReset={handleReset}
        />
        <MktSelectButton label={lojaLabel} onPress={() => setLojaModalOpen(true)} />
        <View style={{ height: 12 }} />

        {isLoading ? (
          <ActivityIndicator color="#C2255C" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <MktEmptyState message={errorMessage} />
        ) : !metricas ? (
          <MktEmptyState message="Sem dados disponíveis." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <View style={[mkStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={mkStyles.kpiLabel}>Total de clientes</Text>
                <Text style={mkStyles.kpiValue}>{formatNumeroBR(metricas.totals.totalRegisteredClients)}</Text>
              </View>
              <View style={[mkStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={mkStyles.kpiLabel}>Taxa de conversão</Text>
                <Text style={mkStyles.kpiValue}>{formatPercentBR(metricas.totals.recurrenceRatePct)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <View style={[mkStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={mkStyles.kpiLabel}>Ticket médio</Text>
                <Text style={mkStyles.kpiValue}>{formatBRL(metricas.totals.avgTicket)}</Text>
              </View>
              <View style={[mkStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={mkStyles.kpiLabel}>Cashback ativo</Text>
                <Text style={mkStyles.kpiValue}>{formatBRL(cashbackCirculando)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={[mkStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={mkStyles.kpiLabel}>Novos clientes</Text>
                <Text style={mkStyles.kpiValue}>{formatNumeroBR(metricas.totals.newClientsInPeriod)}</Text>
              </View>
              <View style={[mkStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={mkStyles.kpiLabel}>Taxa de retorno</Text>
                <Text style={mkStyles.kpiValue}>{formatPercentBR(metricas.totals.returnRatePct)}</Text>
              </View>
            </View>

            {byDayComRevenue.length > 0 ? (
              <View style={mkStyles.chartCard}>
                <Text style={mkStyles.sectionTitle}>Evolução diária</Text>
                <Text style={[mkStyles.listRowMeta, { marginTop: -4, marginBottom: 10 }]}>Faturamento no período selecionado</Text>
                <LineChart
                  data={byDayComRevenue.map((raw) => ({ value: pickMktNumber(raw, ['revenue', 'faturamento', 'totalRevenue']) ?? 0 }))}
                  color="#7C3AED"
                  thickness={2}
                  curved
                  hideDataPoints
                  height={120}
                  noOfSections={3}
                  xAxisLabelsHeight={0}
                  yAxisTextStyle={{ color: '#8891A6', fontSize: 9 }}
                  xAxisColor="#E2E6F0"
                  yAxisColor="#E2E6F0"
                  rulesColor="#F1F2F6"
                  initialSpacing={8}
                  endSpacing={8}
                />
              </View>
            ) : null}

            <View style={mkStyles.chartCard}>
              <Text style={mkStyles.sectionTitle}>Distribuição de cashback</Text>
              {cashbackTotal <= 0 ? (
                <MktEmptyState message="Nenhum cashback emitido no período." />
              ) : (
                <View style={{ alignItems: 'center', marginVertical: 8 }}>
                  <PieChart
                    data={[
                      { value: cashbackCirculando, color: '#7C3AED', text: 'Em circulação' },
                      { value: cashbackResgatado, color: '#E8A33D', text: 'Resgatado' },
                    ]}
                    donut
                    radius={72}
                    innerRadius={44}
                    centerLabelComponent={() => (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={mkStyles.pieCenterValue}>{formatBRL(cashbackTotal)}</Text>
                        <Text style={mkStyles.pieCenterLabel}>Total</Text>
                      </View>
                    )}
                  />
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[mkStyles.legendDot, { backgroundColor: '#7C3AED' }]} />
                      <Text style={mkStyles.listRowMeta}>Em circulação · {formatBRL(cashbackCirculando)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[mkStyles.legendDot, { backgroundColor: '#E8A33D' }]} />
                      <Text style={mkStyles.listRowMeta}>Resgatado · {formatBRL(cashbackResgatado)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <Text style={mkStyles.sectionTitle}>Top lojas</Text>
            {metricas.byStore.length === 0 ? (
              <MktEmptyState message="Nenhuma loja com movimento no período." />
            ) : (
              metricas.byStore
                .slice()
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10)
                .map((loja, idx) => (
                  <View key={loja.storeId} style={mkStyles.rankingRow}>
                    <Text style={mkStyles.listRowMeta}>{idx + 1}. {loja.storeName}</Text>
                    <Text style={mkStyles.listRowValue}>{formatBRL(loja.revenue)}</Text>
                  </View>
                ))
            )}

            <View style={{ height: 8 }} />
            <Text style={mkStyles.sectionTitle}>Ranking de frentistas</Text>
            {frentistas.length === 0 ? (
              <MktEmptyState message="Nenhum frentista com movimento ainda." />
            ) : (
              frentistas.slice(0, 15).map((f, idx) => (
                <View key={idx} style={mkStyles.rankingRow}>
                  <Text style={mkStyles.listRowMeta}>{idx + 1}. {f.nome ?? '—'}</Text>
                  <Text style={mkStyles.listRowValue}>{formatBRL(f.cashbackGerado)}</Text>
                </View>
              ))
            )}

            <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }}>
              <View style={[mkStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={mkStyles.kpiLabel}>Lojas cadastradas</Text>
                <Text style={mkStyles.kpiValue}>{formatNumeroBR(statusGeral.lojasCadastradas ?? lojas.length)}</Text>
              </View>
              <View style={[mkStyles.kpiCard, { flex: 1, minWidth: 0 }]}>
                <Text style={mkStyles.kpiLabel}>Transações no período</Text>
                <Text style={mkStyles.kpiValue}>{formatNumeroBR(metricas.totals.transactionCount)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <MktSelectModal
        visible={lojaModalOpen}
        title="Selecionar loja"
        options={lojaOptions}
        selectedValue={lojaSelecionada}
        onSelect={setLojaSelecionada}
        onClose={() => setLojaModalOpen(false)}
      />
    </SafeAreaView>
  );
}

// --- 6. Notificações ---

const MARKETING_NOTIF_AUDIENCE_TO_DB: Record<NotificationAudienceType, MarketingNotifPublicoTipo> = {
  todos: 'todos',
  colaboradores: 'colaboradores',
  posto: 'postos',
  cargo: 'cargos',
};
const MARKETING_NOTIF_AUDIENCE_FROM_DB: Record<MarketingNotifPublicoTipo, NotificationAudienceType> = {
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

function marketingNotifTemplateToLocal(item: MarketingNotifTemplateItem): NotificationTemplateItem {
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

function marketingNotifRoutineToLocal(item: MarketingNotifRotinaItem, realTemplates: MarketingNotifTemplateItem[]): NotificationRoutineItem {
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
    audienceType: MARKETING_NOTIF_AUDIENCE_FROM_DB[item.publicoTipo] ?? 'todos',
    audienceCargos: item.publicoTipo === 'cargos' ? item.publicoIds : [],
    lastRunLabel: item.ultimaExecucao ? formatDateIsoBR(item.ultimaExecucao) ?? '—' : '—',
    enabled: item.isActive,
  };
}

function marketingNotifRoutineToWriteBody(local: NotificationRoutineItem, realTemplates: MarketingNotifTemplateItem[]) {
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
    publico_tipo: MARKETING_NOTIF_AUDIENCE_TO_DB[local.audienceType],
    publico_ids: local.audienceType === 'cargo' ? local.audienceCargos : [],
  };
}

function marketingNotifTemplateToWriteBody(local: NotificationTemplateItem) {
  return {
    codigo: local.code,
    nome: local.title,
    titulo: local.messageTitle,
    mensagem: local.message,
    variaveis: local.variables,
  };
}

export function MarketingNotificationsScreen({ navigation }: ScreenProps<'MarketingNotifications'>) {
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
    fetchMarketingNotifTemplates()
      .then((data) => setRealTemplates(data.templates))
      .catch((err) => setTemplatesError(showMktError(err, 'Não foi possível carregar os templates.')))
      .finally(() => setIsLoadingTemplates(false));
  }, []);

  const loadRoutines = useCallback(() => {
    setIsLoadingRoutines(true);
    setRoutinesError(null);
    fetchMarketingNotifRotinas()
      .then((data) => setRealRoutines(data.rotinas))
      .catch((err) => setRoutinesError(showMktError(err, 'Não foi possível carregar as rotinas.')))
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

  const templates = useMemo(() => realTemplates.map(marketingNotifTemplateToLocal), [realTemplates]);
  const routines = useMemo(
    () => realRoutines.map((item) => marketingNotifRoutineToLocal(item, realTemplates)),
    [realRoutines, realTemplates]
  );

  const toggleRoutine = (id: string) => {
    const target = realRoutines.find((item) => item.id === id);
    if (!target) return;
    setRealRoutines((current) => current.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item)));
    updateMarketingNotifRotina(id, { ativa: !target.isActive }, actorId).catch((err) => {
      Alert.alert('Erro', showMktError(err, 'Não foi possível atualizar a rotina.'));
      loadRoutines();
    });
  };

  const handleSaveRoutine = (routine: NotificationRoutineItem) => {
    const body = marketingNotifRoutineToWriteBody(routine, realTemplates);
    const isExisting = realRoutines.some((item) => item.id === routine.id);
    const request = isExisting ? updateMarketingNotifRotina(routine.id, body, actorId) : createMarketingNotifRotina(body, actorId);
    request
      .then(() => {
        setIsRoutineFormOpen(false);
        loadRoutines();
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível salvar a rotina.')));
  };

  const handleRunRoutine = (routine: NotificationRoutineItem) => {
    executarMarketingNotifRotina(routine.id, actorId)
      .then(() => {
        Alert.alert('Rotina executada', `"${routine.title}" foi executada agora.`);
        loadRoutines();
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível executar a rotina.')));
  };

  const handleDeleteRoutine = (routine: NotificationRoutineItem) => {
    Alert.alert('Excluir rotina', `Tem certeza que deseja excluir "${routine.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteMarketingNotifRotina(routine.id, actorId)
            .then(() => loadRoutines())
            .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível excluir a rotina.')));
        },
      },
    ]);
  };

  const handleSaveTemplate = (template: NotificationTemplateItem) => {
    const body = marketingNotifTemplateToWriteBody(template);
    const isExisting = realTemplates.some((item) => item.id === template.id);
    const request = isExisting ? updateMarketingNotifTemplate(template.id, body, actorId) : createMarketingNotifTemplate(body, actorId);
    request
      .then(() => {
        setIsTemplateFormOpen(false);
        loadTemplates();
      })
      .catch((err) => Alert.alert('Erro', showMktError(err, 'Não foi possível salvar o template.')));
  };

  const handleDeleteTemplate = (template: NotificationTemplateItem) => {
    Alert.alert('Excluir template', `Tem certeza que deseja excluir "${template.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteMarketingNotifTemplate(template.id, actorId)
            .then(() => loadTemplates())
            .catch((err) =>
              Alert.alert('Erro', showMktError(err, 'Não foi possível excluir o template (templates padrão do sistema não podem ser excluídos).'))
            );
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={marketingUserInitials} variant="marketing" onAvatarPress={() => navigation.navigate('MarketingProfile')} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MktPageHeader icon="bell" title="Notificações" subtitle="Envio de notificações via App, E-mail e WhatsApp." />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Pressable
            style={[mkStyles.filterPill, activeTab === 'routines' ? mkStyles.filterPillActive : null]}
            onPress={() => setActiveTab('routines')}
          >
            <Text style={[mkStyles.filterPillText, activeTab === 'routines' ? mkStyles.filterPillTextActive : null]}>Rotinas</Text>
          </Pressable>
          <Pressable
            style={[mkStyles.filterPill, activeTab === 'templates' ? mkStyles.filterPillActive : null]}
            onPress={() => setActiveTab('templates')}
          >
            <Text style={[mkStyles.filterPillText, activeTab === 'templates' ? mkStyles.filterPillTextActive : null]}>Templates</Text>
          </Pressable>
        </View>

        {activeTab === 'routines' ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={[mkStyles.countLabel, { flex: 1, minWidth: 0 }]}>
                {isLoadingRoutines ? 'Carregando...' : `${routines.length} rotina(s) cadastrada(s)`}
              </Text>
              <Pressable
                style={[mkStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }]}
                onPress={() => {
                  setEditingRoutine(null);
                  setIsRoutineFormOpen(true);
                }}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={mkStyles.suggestionButtonText}>Nova rotina</Text>
              </Pressable>
            </View>

            {isLoadingRoutines ? (
              <ActivityIndicator color="#C2255C" style={{ marginTop: 20 }} />
            ) : routinesError ? (
              <MktEmptyState message={routinesError} />
            ) : routines.length === 0 ? (
              <MktEmptyState message="Nenhuma rotina cadastrada. Clique em Nova rotina." />
            ) : (
              routines.map((routine) => {
                const triggerMeta = notificationTriggerOptions.find((option) => option.value === routine.triggerKind) ?? notificationTriggerOptions[2];
                const triggerDetail = routine.triggerKind === 'recorrente' ? routine.cronSchedule : routine.triggerKind === 'evento' ? routine.eventCode : '';
                const channelLabels = (Object.keys(notificationChannelMeta) as Array<keyof NotificationChannels>)
                  .filter((key) => routine.channels[key])
                  .map((key) => notificationChannelMeta[key].label);
                const audienceLabel =
                  routine.audienceType === 'cargo'
                    ? `Por cargo (${routine.audienceCargos.length})`
                    : notificationAudienceOptions.find((option) => option.value === routine.audienceType)?.label ?? 'Todos os colaboradores';

                return (
                  <View key={routine.id} style={mkStyles.dreCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={mkStyles.listRowTitle} numberOfLines={1}>
                        {routine.title}
                      </Text>
                      <ToggleSwitch value={routine.enabled} onValueChange={() => toggleRoutine(routine.id)} />
                    </View>
                    <Text style={mkStyles.listRowMeta}>{routine.messageTitle}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <View style={[mkStyles.badge, { backgroundColor: '#FBE4ED' }]}>
                        <Text style={[mkStyles.badgeText, { color: '#C2255C' }]}>{triggerMeta.label}</Text>
                      </View>
                      <Text style={mkStyles.listRowMeta} numberOfLines={1}>
                        {channelLabels.length > 0 ? channelLabels.join(', ') : 'Nenhum canal'}
                      </Text>
                      <Text style={mkStyles.listRowMeta}>{audienceLabel}</Text>
                    </View>
                    {triggerDetail ? <Text style={[mkStyles.listRowMeta, { marginTop: 4 }]}>{triggerDetail}</Text> : null}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <Text style={mkStyles.listRowMeta}>
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
              <Text style={[mkStyles.countLabel, { flex: 1, minWidth: 0 }]}>
                {isLoadingTemplates
                  ? 'Carregando...'
                  : `${templates.length} template(s)${templates.length > 0 ? ' — ⭐ padrão do sistema, demais customizados' : ''}`}
              </Text>
              <Pressable
                style={[mkStyles.suggestionButton, { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }]}
                onPress={() => {
                  setEditingTemplate(null);
                  setIsTemplateFormOpen(true);
                }}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={mkStyles.suggestionButtonText}>Novo template</Text>
              </Pressable>
            </View>

            {isLoadingTemplates ? (
              <ActivityIndicator color="#C2255C" style={{ marginTop: 20 }} />
            ) : templatesError ? (
              <MktEmptyState message={templatesError} />
            ) : templates.length === 0 ? (
              <MktEmptyState message="Nenhum template cadastrado ainda." />
            ) : (
              templates.map((template) => (
                <View key={template.id} style={mkStyles.dreCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {template.isSystemDefault ? <Feather name="star" size={14} color="#D79A22" /> : null}
                    <Text style={[mkStyles.listRowTitle, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
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
                  <Text style={mkStyles.listRowMeta}>{template.code}</Text>
                  <Text style={[mkStyles.listRowMeta, { marginTop: 4 }]}>{template.messageTitle}</Text>
                  <Text style={mkStyles.listRowMeta} numberOfLines={2}>
                    {template.message}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {template.variables.map((variable) => (
                      <View key={variable} style={[mkStyles.badge, { backgroundColor: '#F1F3F8' }]}>
                        <Text style={[mkStyles.badgeText, { color: '#5E667D' }]}>{variable}</Text>
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

// --- 7. Perfil ---

export function MarketingProfileScreen({ navigation }: ScreenProps<'MarketingProfile'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={marketingUserInitials} variant="marketing" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MktPageHeader icon="user" title="Meu Perfil" subtitle={marketingUser.accessLabel} />
        <View style={mkStyles.profileCard}>
          <View style={mkStyles.profileAvatarShell}>
            <Text style={mkStyles.profileAvatarText}>{marketingUserInitials}</Text>
          </View>
          <Text style={mkStyles.profileName}>{marketingUser.fullName}</Text>
          <Text style={mkStyles.profileRole}>{marketingUser.roleAndUnit}</Text>

          <View style={mkStyles.profileFieldRow}>
            <Feather name="mail" size={14} color="#7C8397" />
            <Text style={mkStyles.profileFieldText}>{marketingUser.email}</Text>
          </View>
          <View style={mkStyles.profileFieldRow}>
            <Feather name="phone" size={14} color="#7C8397" />
            <Text style={mkStyles.profileFieldText}>{marketingUser.phone}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const mkStyles = StyleSheet.create({
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
    fontSize: 18,
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
    color: '#C2255C',
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
  chartTooltip: {
    backgroundColor: '#F8F9FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 10,
    marginTop: 8,
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
    backgroundColor: '#C2255C',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderLeftWidth: 3,
    borderLeftColor: '#C2255C',
    padding: 12,
  },
  kpiLabel: {
    color: '#C2255C',
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
    backgroundColor: '#FBE4ED',
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
  dreCardPressed: {
    backgroundColor: '#FBE4ED',
    borderColor: '#F3B9CF',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FBE4ED',
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#C2255C',
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
    backgroundColor: '#C2255C',
    borderColor: '#C2255C',
  },
  filterPillText: {
    color: '#5E667D',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  waSugestaoChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3B9CF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  waSugestaoChipText: {
    color: '#C2255C',
    fontSize: 11.5,
    fontWeight: '700',
  },
  waRespostasSugeridasBox: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    maxHeight: 160,
    overflow: 'hidden',
  },
  waRespostaSugeridaItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  waRespostaSugeridaAtalho: {
    color: '#C2255C',
    fontSize: 11.5,
    fontWeight: '800',
  },
  waRespostaSugeridaTexto: {
    color: '#5E667D',
    fontSize: 11.5,
    marginTop: 2,
  },
  waMenuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 250,
  },
  waMenuDropdown: {
    position: 'absolute',
    top: 64,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 260,
  },
  waMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  waMenuItemText: {
    color: '#3A415C',
    fontSize: 13,
    fontWeight: '600',
  },
  waJanelaAviso: {
    backgroundColor: '#FFF3D6',
    borderBottomWidth: 1,
    borderBottomColor: '#F0DBA0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  waJanelaAvisoText: {
    color: '#8A6D1D',
    fontSize: 12,
    flex: 1,
    minWidth: 140,
  },
  waJanelaAvisoBtn: {
    backgroundColor: '#8A6D1D',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  waJanelaAvisoBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  waDotLaranja: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F5A623',
  },
  waUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  waUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  waTagChip: {
    backgroundColor: '#F1F2F6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  waTagChipText: {
    color: '#5E667D',
    fontSize: 10.5,
    fontWeight: '700',
  },
  waIconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipSmall: {
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  waAbaPill: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waAbaPillActive: {
    backgroundColor: '#C2255C',
    borderColor: '#C2255C',
  },
  waAbaPillText: {
    color: '#5E667D',
    fontSize: 11.5,
    fontWeight: '800',
  },
  waAbaPillTextActive: {
    color: '#FFFFFF',
  },
  filterChipSmallText: {
    color: '#5E667D',
    fontSize: 11.5,
    fontWeight: '700',
  },
  countLabel: {
    color: '#677089',
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#C2255C',
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
    backgroundColor: '#C2255C',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
  overlayDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingVertical: 4,
    shadowColor: '#0C1736',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 14,
    zIndex: 200,
  },
  overlayDropdownSearch: {
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0C1736',
  },
  overlayDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  overlayDropdownItemText: {
    fontSize: 13,
    color: '#0C1736',
    flex: 1,
    marginRight: 8,
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
    backgroundColor: '#C2255C',
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
  waChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#C2255C',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  waChatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waChatAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  waChatHeaderName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  waChatHeaderMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 1,
  },
  waChatHeaderBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  waChatHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  waDateDivider: {
    alignSelf: 'center',
    backgroundColor: '#E9E3DC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginVertical: 10,
  },
  waDateDividerText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
  },
  waSystemMessage: {
    alignSelf: 'center',
    backgroundColor: '#FFF3D6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginVertical: 6,
    maxWidth: '85%',
  },
  waSystemMessageText: {
    color: '#8A6D1D',
    fontSize: 11,
    textAlign: 'center',
  },
  waBubbleRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  waBubble: {
    maxWidth: '80%',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 6,
  },
  waBubbleIn: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
  },
  waBubbleOut: {
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 2,
  },
  waBubbleText: {
    color: '#0C1736',
    fontSize: 13.5,
    lineHeight: 18,
  },
  waBubbleTime: {
    color: '#8A8F99',
    fontSize: 10,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  waRecDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C2263A',
  },
  waComposerIconBtn: {
    padding: 8,
  },
  waEmojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F2F6',
  },
  waComposerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F1F2F6',
    borderTopWidth: 1,
    borderTopColor: '#E2E6F0',
  },
  waComposerInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0C1736',
    maxHeight: 100,
  },
  waAtendimentoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 300,
  },
  waAtendimentoPanel: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    height: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  waRespostasOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 400,
  },
  waSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C2255C',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
