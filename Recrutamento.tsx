import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useIsFocused } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { LineChart } from 'react-native-gifted-charts';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
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
  type RecrutamentoVagaAplicacaoResumo,
  fetchRecrutamentoCandidatos,
  fetchRecrutamentoCandidato,
  createRecrutamentoCandidato,
  updateRecrutamentoCandidato,
  deleteRecrutamentoCandidato,
  moverRecrutamentoCandidatoEtapa,
  fetchRecrutamentoSugestaoIa,
  fetchRecrutamentoTriagemVagaRoteiro,
  type RecrutamentoTriagemVagaRoteiro,
  calcularRecrutamentoMatch,
  enviarRecrutamentoAvaliacao,
  gerarRecrutamentoLinkEtapa,
  anexarRecrutamentoCurriculo,
  fetchRecrutamentoConsultasPf,
  type RecrutamentoConsultaPf,
  consultarRecrutamentoPf,
  fetchRecrutamentoConsentimento,
  type RecrutamentoConsentimento,
  type RecrutamentoCandidatoItem,
  type RecrutamentoCandidatoFiltro,
  type RecrutamentoCandidatoDetalhe,
  type RecrutamentoCandidatoPerfil,
  importarRecrutamentoCurriculo,
  fetchRecrutamentoImportacoes,
  fetchRecrutamentoImportacao,
  type RecrutamentoImportacaoDetalhe,
  excluirRecrutamentoImportacao,
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
  updateRecrutamentoTriagemVagaRoteiro,
  type RecrutamentoTriagemModelo,
  fetchRecrutamentoAvaliacoes,
  createRecrutamentoAvaliacao,
  updateRecrutamentoAvaliacao,
  deleteRecrutamentoAvaliacao,
  type RecrutamentoAvaliacao,
  fetchRecrutamentoQuestoes,
  createRecrutamentoQuestao,
  updateRecrutamentoQuestao,
  deleteRecrutamentoQuestao,
  type RecrutamentoQuestao,
  fetchRecrutamentoDocAdmissao,
  createRecrutamentoDocAdmissao,
  updateRecrutamentoDocAdmissao,
  deleteRecrutamentoDocAdmissao,
  type RecrutamentoDocAdmissao,
  fetchRecrutamentoKitsAdmissao,
  saveRecrutamentoKitAdmissao,
  deleteRecrutamentoKitAdmissao,
  type RecrutamentoKitAdmissao,
  fetchAdminWaConfig,
  updateAdminWaConfig,
  testAdminWaConnection,
  rotateAdminWaWebhookSecret,
  syncAdminWaTemplates,
  testAdminWaTemplate,
  type AdminWaConfig,
  type AdminWaProvider,
  type AdminWaTemplateItem,
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
  patchRecrutamentoWaConversa,
  marcarRecrutamentoWaLido,
  enviarRecrutamentoWaMidia,
  type MarketingWaChatStatus,
  type MarketingWaMidiaTipo,
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
  type MarketingWaContadores,
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

// Precisa converter pro fuso local igual o formatDateTimeBR faz — antes essa
// função só recortava o "YYYY-MM-DD" cru da string (sempre em UTC nessa
// API), sem converter. Pra qualquer horário entre 00h-03h UTC isso mostra
// um dia ANTES do que devia (ex.: "2026-09-02T01:29" UTC é "01/09" no Brasil,
// não "02/09") — e ficava inconsistente até dentro do próprio app (a data
// "Cadastrado em" usava essa função errada enquanto "Analisado em" já
// convertia certo).
function formatDateIsoBR(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatHoraBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Divisor de data no estilo WhatsApp — mesmo padrão usado no Marketing.tsx
// (mesmo motor de conversas, canal='rs').
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
  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  return `${d.getDate()} DE ${meses[d.getMonth()]} DE ${d.getFullYear()}`;
}

function diaChaveWA(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Campos confirmados direto no endpoint (18/09/2026): "message" (texto),
// "direction" (inbound/outbound), "message_type" (text/audio/voice/image/
// video/template/system), "media_url" (link assinado) e "file_name".
function rsExtractWaTexto(raw: Record<string, unknown>): string {
  const known = pickRsField(raw, ['message', 'mensagem', 'texto', 'body', 'content', 'text']);
  if (known) return known;
  return '(mensagem sem texto)';
}

// Usa media_url/message_type reais em vez de adivinhar pela URL do texto
// (o campo "message" de uma mídia vem como "[audio]"/"[image]"/"[voice]",
// não a URL — o link de verdade está em media_url).
type RsWaMidiaDetectada = { tipo: 'imagem' | 'audio' | 'video' | 'documento'; url: string } | null;
function rsDetectarWaMidia(raw: Record<string, unknown>): RsWaMidiaDetectada {
  const mediaUrl = pickRsField(raw, ['media_url']);
  const tipoMsg = (pickRsField(raw, ['message_type']) ?? '').toLowerCase();
  if (mediaUrl) {
    if (tipoMsg === 'image' || tipoMsg === 'imagem' || tipoMsg === 'sticker') return { tipo: 'imagem', url: mediaUrl };
    if (tipoMsg === 'audio' || tipoMsg === 'voice' || tipoMsg === 'ptt') return { tipo: 'audio', url: mediaUrl };
    if (tipoMsg === 'video') return { tipo: 'video', url: mediaUrl };
    return { tipo: 'documento', url: mediaUrl };
  }
  // Reserva — texto que É a própria URL do arquivo, caso apareça algum dia
  // sem media_url preenchido.
  const url = rsExtractWaTexto(raw).trim();
  if (!/^https?:\/\/\S+$/i.test(url)) return null;
  const semQuery = url.split('?')[0].toLowerCase();
  if (/\.(jpe?g|png|gif|webp)$/.test(semQuery)) return { tipo: 'imagem', url };
  if (/\.(mp3|ogg|oga|m4a|aac|amr|wav|opus|webm)$/.test(semQuery)) return { tipo: 'audio', url };
  if (/\.(mp4|mov|3gp)$/.test(semQuery)) return { tipo: 'video', url };
  if (/\.(pdf|docx?|xlsx?|pptx?|txt)$/.test(semQuery)) return { tipo: 'documento', url };
  return null;
}

function RsWaAudioBubblePlayer({ url }: { url: string }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const duracao = status.duration && Number.isFinite(status.duration) ? status.duration : 0;
  const posicao = status.currentTime && Number.isFinite(status.currentTime) ? status.currentTime : 0;
  const formatar = (s: number) => {
    const total = Math.max(0, Math.floor(s));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };
  const handlePress = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (duracao > 0 && posicao >= duracao)) {
      player.seekTo(0);
    }
    player.play();
  };
  return (
    <Pressable style={rsStyles.waAudioBubbleRow} onPress={handlePress}>
      <View style={rsStyles.waAudioPlayBtn}>
        <Feather name={status.playing ? 'pause' : 'play'} size={16} color="#0C1736" />
      </View>
      <View style={rsStyles.waAudioTrack} />
      <Text style={rsStyles.waAudioTime}>{status.isLoaded ? formatar(duracao > 0 ? posicao : duracao) : '...'}</Text>
    </Pressable>
  );
}

function RsWaMensagemMidia({ midia }: { midia: NonNullable<RsWaMidiaDetectada> }) {
  if (midia.tipo === 'imagem') {
    return (
      <Pressable onPress={() => Linking.openURL(midia.url)}>
        <Image source={{ uri: midia.url }} style={rsStyles.waImagemBubble} resizeMode="cover" />
      </Pressable>
    );
  }
  if (midia.tipo === 'audio') {
    return <RsWaAudioBubblePlayer url={midia.url} />;
  }
  return (
    <Pressable style={rsStyles.waDocBubbleRow} onPress={() => Linking.openURL(midia.url)}>
      <Feather name={midia.tipo === 'video' ? 'play-circle' : 'file-text'} size={18} color="#5E667D" />
      <Text style={rsStyles.waDocBubbleText} numberOfLines={1}>
        {midia.url.split('/').pop() ?? midia.url}
      </Text>
    </Pressable>
  );
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

// Toggle menor que o ToggleSwitch padrão do app (usado nas telas de Alertas
// de IA e Alertas/Telegram) — o ToggleSwitch de App.tsx é compartilhado por
// dezenas de telas, então em vez de alterá-lo criamos uma versão local só
// pra essas duas telas.
function RsSmallToggle({ value, onValueChange }: { value: boolean; onValueChange: () => void }) {
  return (
    <Pressable style={[rsStyles.smallToggleTrack, value ? rsStyles.smallToggleTrackOn : null]} onPress={onValueChange} hitSlop={6}>
      <View style={[rsStyles.smallToggleKnob, value ? rsStyles.smallToggleKnobOn : null]} />
    </Pressable>
  );
}

// Confirmação de ação destrutiva com botões próprios — Alert.alert com
// vários botões não é confiável no react-native-web (o app é testado no
// navegador): às vezes nenhum diálogo aparece, mas o botão de ação acaba
// disparando de qualquer jeito, sem dar chance de cancelar. Isso substitui
// o Alert.alert(título, msg, [Cancelar, Excluir]) nesses casos.
function RsConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  destructive = true,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={rsStyles.actionsMenuBackdrop} onPress={onCancel}>
        <Pressable style={rsStyles.candModalCard} onPress={() => {}}>
          <Text style={rsStyles.candModalTitle}>{title}</Text>
          <Text style={[rsStyles.listRowMeta, { marginTop: 8 }]}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Pressable style={[rsStyles.secondaryButton, { flex: 1, justifyContent: 'center' }]} onPress={onCancel}>
              <Text style={rsStyles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[destructive ? rsStyles.dangerButton : rsStyles.primaryButton, { flex: 1, justifyContent: 'center' }]}
              onPress={onConfirm}
            >
              <Text style={destructive ? rsStyles.dangerButtonText : rsStyles.primaryButtonText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================
// 1. Dashboard
// ============================================================

const FUNIL_COLORS = ['#1F3A5F', '#3D5A80', '#5E80A3', '#8FA9C4', '#B7C7DA', '#D9E2EC'];

const RS_SEXO_LABEL: Record<string, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  nao_informado: 'Não informado',
};

const RS_SEXO_COLOR: Record<string, string> = {
  feminino: '#EC4899',
  masculino: '#3B82F6',
  nao_informado: '#9AA3B5',
};

// Linha de ranking reaproveitada por "Top vagas", "Origem" e "Top cidades" —
// número, rótulo, valor e uma barrinha proporcional ao maior item da lista
// (mesmo padrão visual do painel web, sem gráfico de pizza/roda).
function RsRankedListRow({
  rank,
  label,
  value,
  maxValue,
  color,
}: {
  rank: number;
  label: string;
  value: number;
  maxValue: number;
  color?: string;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <Text style={rsStyles.rankNumber}>{rank}</Text>
          <Text style={[rsStyles.listRowMeta, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text style={rsStyles.listRowValue}>{formatNumeroBR(value)}</Text>
      </View>
      <View style={rsStyles.funilBarTrack}>
        <View
          style={[
            rsStyles.funilBarFill,
            { width: `${Math.min(100, (value / maxValue) * 100)}%`, backgroundColor: color ?? '#1F3A5F' },
          ]}
        />
      </View>
    </View>
  );
}

const RS_MES_CURTO: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function rsMesCurtoLabel(mesIso: string): string {
  const [, mm] = mesIso.split('-');
  return RS_MES_CURTO[mm] ?? mesIso;
}

function RsChartCardTitle({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: '#E8EEF6', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={13} color="#1F3A5F" />
      </View>
      <Text style={rsStyles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function RecrutamentoDashboardScreen({ navigation }: ScreenProps<'RecrutamentoDashboard'>) {
  const { periodo, setPeriodo, refMes, refAno, handleAnterior, handleProximo, handleReset } = useRsPeriodoNav();
  const [data, setData] = useState<RecrutamentoDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedFunilStage, setSelectedFunilStage] = useState<string | null>(null);
  const [selectedAcumuladoMes, setSelectedAcumuladoMes] = useState<string | null>(null);
  const [selectedMovimentoMes, setSelectedMovimentoMes] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRecrutamentoDashboard({ mes: refMes, ano: refAno, modo: periodo })
      .then(setData)
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar o dashboard.')))
      .finally(() => setIsLoading(false));
  }, [periodo, refMes, refAno]);

  const snapshot = data?.snapshot;
  const periodoAtual = data?.periodo_atual;
  const funil = data?.funil ?? [];
  const serie = data?.serie ?? [];

  // Conversão = contratações / total de aplicações (histórico) — não vem
  // pronta do endpoint, é a mesma conta que o card "Performance & IA" do
  // painel web mostra (ex.: 1/26 = 3,8%).
  const conversaoPct =
    snapshot && snapshot.aplicacoes_total > 0
      ? ((snapshot.contratacoes_total / snapshot.aplicacoes_total) * 100).toFixed(1).replace('.', ',')
      : '0,0';

  // "Entrada acumulada de candidatos" — soma corrida de serie[].candidatos
  // mês a mês (o endpoint manda só o valor de cada mês, não o acumulado).
  const serieAcumulada = serie.reduce<Array<{ mes: string; acumulado: number }>>((acc, item, idx) => {
    const anterior = idx > 0 ? acc[idx - 1].acumulado : 0;
    acc.push({ mes: item.mes, acumulado: anterior + (item.candidatos ?? 0) });
    return acc;
  }, []);
  const maxAcumulado = Math.max(1, ...serieAcumulada.map((s) => s.acumulado));
  const maxSerieValor = Math.max(1, ...serie.flatMap((s) => [s.candidatos, s.aplicacoes, s.contratacoes]));
  const maxFunil = Math.max(1, ...funil.map((f) => f.qtd));

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
        ) : !data || !snapshot || !periodoAtual ? (
          <RsEmptyState message="Sem dados disponíveis." />
        ) : (
          <>
            {/* KPIs do período selecionado (mês/ano navegado acima) */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RsKpiCard icon="briefcase" label="VAGAS ABERTAS" value={formatNumeroBR(snapshot.vagas_abertas)} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RsKpiCard icon="users" label="NOVOS CANDIDATOS" value={formatNumeroBR(periodoAtual.novos_candidatos)} subtitle="no mês selecionado" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RsKpiCard icon="file-text" label="APLICAÇÕES" value={formatNumeroBR(periodoAtual.novas_aplicacoes)} subtitle={`${formatNumeroBR(snapshot.aplicacoes_ativas)} ativas no total`} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RsKpiCard icon="user-check" label="CONTRATAÇÕES" value={formatNumeroBR(periodoAtual.contratacoes)} subtitle={`${formatNumeroBR(snapshot.contratacoes_total)} no histórico`} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <RsKpiCard
                  icon="cpu"
                  label="SCORE IA MÉDIO"
                  value={periodoAtual.score_ia_medio != null ? `${Math.round(periodoAtual.score_ia_medio)}%` : '—'}
                  subtitle="match das aplicações"
                />
              </View>
            </View>

            {/* Pipeline de candidatos (totais históricos, não só do período) */}
            <View style={rsStyles.chartCard}>
              <Text style={rsStyles.sectionTitle}>Pipeline de candidatos</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                <View style={{ minWidth: '45%' }}>
                  <Text style={rsStyles.listRowMeta}>TOTAL</Text>
                  <Text style={rsStyles.kpiValue}>{formatNumeroBR(snapshot.candidatos_total)}</Text>
                </View>
                <View style={{ minWidth: '45%' }}>
                  <Text style={rsStyles.listRowMeta}>APLICAÇÕES</Text>
                  <Text style={rsStyles.kpiValue}>{formatNumeroBR(snapshot.aplicacoes_total)}</Text>
                  <Text style={rsStyles.kpiLabelUnidade}>{formatNumeroBR(snapshot.aplicacoes_ativas)} ativas</Text>
                </View>
                <View style={{ minWidth: '45%' }}>
                  <Text style={rsStyles.listRowMeta}>CONTRATADOS</Text>
                  <Text style={rsStyles.kpiValue}>{formatNumeroBR(snapshot.contratacoes_total)}</Text>
                </View>
                <View style={{ minWidth: '45%' }}>
                  <Text style={rsStyles.listRowMeta}>VAGAS</Text>
                  <Text style={rsStyles.kpiValue}>{formatNumeroBR(snapshot.vagas_abertas)}</Text>
                  <Text style={rsStyles.kpiLabelUnidade}>{formatNumeroBR(snapshot.vagas_encerradas)} encerradas</Text>
                </View>
              </View>
            </View>

            {/* Performance & IA */}
            <View style={rsStyles.chartCard}>
              <Text style={rsStyles.sectionTitle}>Performance & IA</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                <View style={{ minWidth: '45%' }}>
                  <Text style={rsStyles.listRowMeta}>TEMPO P/ CONTRATAR</Text>
                  <Text style={rsStyles.kpiValue}>
                    {periodoAtual.tempo_medio_contratacao_dias != null ? `${periodoAtual.tempo_medio_contratacao_dias}d` : '—'}
                  </Text>
                  <Text style={rsStyles.kpiLabelUnidade}>média no período</Text>
                </View>
                <View style={{ minWidth: '45%' }}>
                  <Text style={rsStyles.listRowMeta}>CONVERSÃO</Text>
                  <Text style={rsStyles.kpiValue}>{conversaoPct}%</Text>
                  <Text style={rsStyles.kpiLabelUnidade}>contratados / aplicações</Text>
                </View>
                <View style={{ minWidth: '45%' }}>
                  <Text style={rsStyles.listRowMeta}>NOVAS VAGAS</Text>
                  <Text style={rsStyles.kpiValue}>{formatNumeroBR(periodoAtual.novas_vagas)}</Text>
                  <Text style={rsStyles.kpiLabelUnidade}>no mês selecionado</Text>
                </View>
                <View style={{ minWidth: '45%' }}>
                  <Text style={rsStyles.listRowMeta}>SCORE IA</Text>
                  <Text style={rsStyles.kpiValue}>{periodoAtual.score_ia_medio != null ? `${Math.round(periodoAtual.score_ia_medio)}%` : '—'}</Text>
                  <Text style={rsStyles.kpiLabelUnidade}>match médio</Text>
                </View>
              </View>
            </View>

            {funil.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Funil — Aplicações por estágio</Text>
                {/* Tentei usar o BarChart da lib aqui, mas ele renderizou os
                    rótulos desalinhados das barras (bug visual da lib nesse
                    modo horizontal) — voltei pra barras próprias, que são
                    confiáveis, e adicionei o toque abrindo um balão com o
                    valor (equivalente ao hover do painel web). */}
                <View style={{ marginTop: 10 }}>
                  {funil.map((item, idx) => {
                    const isSelected = selectedFunilStage === item.estagio;
                    return (
                      <Pressable
                        key={item.estagio}
                        style={{ marginBottom: 10 }}
                        onPress={() => setSelectedFunilStage((current) => (current === item.estagio ? null : item.estagio))}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={rsStyles.listRowMeta} numberOfLines={1}>
                            {item.estagio.charAt(0).toUpperCase() + item.estagio.slice(1)}
                          </Text>
                          {isSelected ? (
                            <View style={rsStyles.chartTooltip}>
                              <Text style={rsStyles.chartTooltipText}>{formatNumeroBR(item.qtd)}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={rsStyles.funilBarTrack}>
                          <View
                            style={[
                              rsStyles.funilBarFill,
                              {
                                width: `${Math.min(100, (item.qtd / maxFunil) * 100)}%`,
                                backgroundColor: FUNIL_COLORS[idx % FUNIL_COLORS.length],
                              },
                            ]}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[rsStyles.kpiLabelUnidade, { marginTop: 4 }]}>Toque numa etapa pra ver o valor.</Text>
              </View>
            ) : null}

            {serie.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={rsStyles.sectionTitle}>Movimento de R&S</Text>
                  {selectedMovimentoMes ? (
                    <View style={rsStyles.chartTooltip}>
                      <Text style={rsStyles.chartTooltipText}>
                        {(() => {
                          const item = serie.find((s) => s.mes === selectedMovimentoMes);
                          if (!item) return '';
                          return `${rsMesCurtoLabel(item.mes)}: ${formatNumeroBR(item.candidatos)} cand. · ${formatNumeroBR(item.aplicacoes)} apl. · ${formatNumeroBR(item.contratacoes)} contr.`;
                        })()}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={rsStyles.kpiLabelUnidade}>Últimos {serie.length} meses</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12, height: 110 }}>
                  {serie.map((item) => (
                    <Pressable
                      key={item.mes}
                      style={{ flex: 1, alignItems: 'center', gap: 3 }}
                      onPress={() => setSelectedMovimentoMes((current) => (current === item.mes ? null : item.mes))}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 80 }}>
                        <View style={{ width: 6, height: Math.max(2, (item.candidatos / maxSerieValor) * 80), backgroundColor: '#1F3A5F', borderRadius: 2 }} />
                        <View style={{ width: 6, height: Math.max(2, (item.aplicacoes / maxSerieValor) * 80), backgroundColor: '#8B5CF6', borderRadius: 2 }} />
                        <View style={{ width: 6, height: Math.max(2, (item.contratacoes / maxSerieValor) * 80), backgroundColor: '#18955A', borderRadius: 2 }} />
                      </View>
                      <Text style={rsStyles.kpiLabelUnidade}>{rsMesCurtoLabel(item.mes)}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 14, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={[rsStyles.legendDot, { backgroundColor: '#1F3A5F' }]} />
                    <Text style={rsStyles.listRowMeta}>Candidatos</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={[rsStyles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={rsStyles.listRowMeta}>Aplicações</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={[rsStyles.legendDot, { backgroundColor: '#18955A' }]} />
                    <Text style={rsStyles.listRowMeta}>Contratações</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {serieAcumulada.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={rsStyles.sectionTitle}>Entrada acumulada de candidatos</Text>
                  {selectedAcumuladoMes ? (
                    <View style={rsStyles.chartTooltip}>
                      <Text style={rsStyles.chartTooltipText}>
                        {rsMesCurtoLabel(selectedAcumuladoMes)}:{' '}
                        {formatNumeroBR(serieAcumulada.find((s) => s.mes === selectedAcumuladoMes)?.acumulado)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ marginTop: 14, marginLeft: -8 }}>
                  <LineChart
                    data={serieAcumulada.map((item) => ({ value: item.acumulado, label: rsMesCurtoLabel(item.mes) }))}
                    curved
                    areaChart
                    color="#1F3A5F"
                    thickness={2}
                    startFillColor="#1F3A5F"
                    endFillColor="#FFFFFF"
                    startOpacity={0.3}
                    endOpacity={0.05}
                    dataPointsColor="#1F3A5F"
                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor="#E2E6F0"
                    rulesType="solid"
                    rulesColor="#F1F2F6"
                    height={180}
                    noOfSections={4}
                    initialSpacing={10}
                    endSpacing={10}
                    adjustToWidth
                  />
                  {/* Camada de toque própria por cima do gráfico — o
                      pointerConfig da lib só mostra o valor enquanto segura
                      o dedo (arrasta); aqui um toque simples liga, outro
                      toque no mesmo mês desliga. */}
                  <View style={{ flexDirection: 'row', position: 'absolute', top: 0, left: 8, right: 0, height: 180 }}>
                    {serieAcumulada.map((item) => (
                      <Pressable
                        key={item.mes}
                        style={{ flex: 1 }}
                        onPress={() =>
                          setSelectedAcumuladoMes((current) => (current === item.mes ? null : item.mes))
                        }
                      />
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {data.top_vagas.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <RsChartCardTitle icon="briefcase" title="Top vagas com mais candidatos" />
                <View style={{ marginTop: 8 }}>
                  {(() => {
                    const max = Math.max(1, ...data.top_vagas.map((i) => i.qtd));
                    return data.top_vagas.slice(0, 6).map((item, idx) => (
                      <RsRankedListRow key={idx} rank={idx + 1} label={item.titulo} value={item.qtd} maxValue={max} />
                    ));
                  })()}
                </View>
              </View>
            ) : null}

            {data.origem.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <RsChartCardTitle icon="filter" title="Origem dos candidatos" />
                <View style={{ marginTop: 8 }}>
                  {(() => {
                    const max = Math.max(1, ...data.origem.map((i) => i.qtd));
                    return data.origem.map((item, idx) => (
                      <RsRankedListRow key={idx} rank={idx + 1} label={item.origem} value={item.qtd} maxValue={max} />
                    ));
                  })()}
                </View>
              </View>
            ) : null}

            {data.top_cidades.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <RsChartCardTitle icon="map-pin" title="Top cidades" />
                <View style={{ marginTop: 8 }}>
                  {(() => {
                    const max = Math.max(1, ...data.top_cidades.map((i) => i.qtd));
                    return data.top_cidades.slice(0, 8).map((item, idx) => (
                      <RsRankedListRow key={idx} rank={idx + 1} label={item.cidade} value={item.qtd} maxValue={max} />
                    ));
                  })()}
                </View>
              </View>
            ) : null}

            {data.distrib_genero.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <RsChartCardTitle icon="users" title="Gênero" />
                {(() => {
                  const totalGenero = data.distrib_genero.reduce((sum, item) => sum + item.qtd, 0) || 1;
                  return (
                    <>
                      <View style={rsStyles.generoBarTrack}>
                        {data.distrib_genero.map((item) => (
                          <View
                            key={item.sexo}
                            style={{
                              flex: item.qtd || 0.0001,
                              backgroundColor: RS_SEXO_COLOR[item.sexo] ?? '#9AA3B5',
                            }}
                          />
                        ))}
                      </View>
                      <View style={{ marginTop: 10 }}>
                        {data.distrib_genero.map((item) => (
                          <View key={item.sexo} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={[rsStyles.legendDot, { backgroundColor: RS_SEXO_COLOR[item.sexo] ?? '#9AA3B5' }]} />
                              <Text style={rsStyles.listRowMeta}>{RS_SEXO_LABEL[item.sexo] ?? item.sexo}</Text>
                            </View>
                            <Text style={rsStyles.listRowValue}>
                              {Math.round((item.qtd / totalGenero) * 100)}% · {formatNumeroBR(item.qtd)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  );
                })()}
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

// Menu "..." por vaga — mesmas 5 ações do dropdown do painel web (Abrir
// vaga, Editar, Adicionar candidatos, Copiar link da LP, Excluir), mais
// pausar/reabrir/encerrar (que já existiam como ícones soltos na linha).
function RsVagaActionsMenuModal({
  vaga,
  onClose,
  onAbrir,
  onEditar,
  onAdicionarCandidatos,
  onCopiarLink,
  onPausarReabrir,
  onEncerrar,
  onExcluir,
}: {
  vaga: RecrutamentoVaga | null;
  onClose: () => void;
  onAbrir: () => void;
  onEditar: () => void;
  onAdicionarCandidatos: () => void;
  onCopiarLink: () => void;
  onPausarReabrir: () => void;
  onEncerrar: () => void;
  onExcluir: () => void;
}) {
  if (!vaga) return null;

  return (
    <Modal visible={vaga !== null} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={rsStyles.actionsMenuBackdrop} onPress={onClose}>
        <Pressable style={rsStyles.actionsMenuCard} onPress={() => {}}>
          <Text style={rsStyles.actionsMenuTitle} numberOfLines={1}>
            {vaga.titulo}
          </Text>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onAbrir}>
            <Feather name="eye" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Abrir vaga</Text>
          </Pressable>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onEditar}>
            <Feather name="edit-2" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Editar</Text>
          </Pressable>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onAdicionarCandidatos}>
            <Feather name="user-plus" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Adicionar candidatos</Text>
          </Pressable>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onCopiarLink}>
            <Feather name="link" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Copiar link da LP</Text>
          </Pressable>
          {vaga.status === 'aberta' || vaga.status === 'pausada' ? (
            <Pressable style={rsStyles.actionsMenuRow} onPress={onPausarReabrir}>
              <Feather name={vaga.status === 'aberta' ? 'pause' : 'play'} size={16} color="#3D4560" />
              <Text style={rsStyles.actionsMenuRowText}>{vaga.status === 'aberta' ? 'Pausar' : 'Reabrir'}</Text>
            </Pressable>
          ) : null}
          {vaga.status !== 'encerrada' ? (
            <Pressable style={rsStyles.actionsMenuRow} onPress={onEncerrar}>
              <Feather name="x-circle" size={16} color="#3D4560" />
              <Text style={rsStyles.actionsMenuRowText}>Encerrar</Text>
            </Pressable>
          ) : null}
          <Pressable style={[rsStyles.actionsMenuRow, rsStyles.actionsMenuRowLast]} onPress={onExcluir}>
            <Feather name="trash-2" size={16} color="#E6213D" />
            <Text style={[rsStyles.actionsMenuRowText, { color: '#E6213D' }]}>Excluir</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
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
  const [actionsMenuVaga, setActionsMenuVaga] = useState<RecrutamentoVaga | null>(null);

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
    setFormUf(vaga.estado ?? '');
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
      estado: formUf.trim() || null,
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

  // Toggle "Na LP" igual a coluna do painel web — mantém publicada_lp e
  // na_lp em sincronia pra não depender de qual dos dois campos a leitura
  // usa (os dois vieram com o mesmo valor no endpoint real).
  const handleToggleNaLp = (vaga: RecrutamentoVaga) => {
    const novoValor = !(vaga.na_lp ?? vaga.publicada_lp);
    setVagas((prev) => prev.map((v) => (v.id === vaga.id ? { ...v, na_lp: novoValor, publicada_lp: novoValor } : v)));
    updateRecrutamentoVaga(vaga.id, { na_lp: novoValor, publicada_lp: novoValor }).catch((err) => {
      setVagas((prev) => prev.map((v) => (v.id === vaga.id ? { ...v, na_lp: vaga.na_lp, publicada_lp: vaga.publicada_lp } : v)));
      Alert.alert('Erro', showRsError(err, 'Não foi possível atualizar a publicação na LP.'));
    });
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

  // A resposta da vaga não traz nenhum campo de link/slug pra landing page
  // pública (conferido direto no endpoint) — preciso confirmar com a
  // Lovable qual é a URL base antes de poder copiar de verdade.
  const handleCopiarLinkLp = () => {
    Alert.alert(
      'Link ainda não disponível',
      'A API não retorna nenhum campo de link/slug da página pública dessa vaga ainda — preciso confirmar com a Lovable qual é a URL base da landing page antes de habilitar isso.'
    );
  };

  // Idem — não há endpoint/fluxo de "adicionar candidato manualmente a uma
  // vaga" mapeado no app ainda; preciso confirmar com a Lovable os campos
  // esperados (nome, telefone, currículo?) antes de construir a tela.
  const handleAdicionarCandidatos = () => {
    Alert.alert(
      'Em breve',
      'Ainda preciso confirmar com a Lovable quais campos esse fluxo espera (nome, telefone, currículo?) antes de construir essa tela.'
    );
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

        <View style={{ marginTop: 10, marginBottom: 10, zIndex: isStatusFiltroOpen ? 200 : 1 }}>
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
            const naLp = vaga.na_lp ?? vaga.publicada_lp;
            return (
              <View key={vaga.id} style={rsStyles.dreCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Pressable
                    style={{ flex: 1, minWidth: 0, marginRight: 10 }}
                    onPress={() => navigation.navigate('RecrutamentoVagaDetalhe', { id: vaga.id })}
                  >
                    <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                      {vaga.titulo}
                    </Text>
                    <Text style={rsStyles.listRowMeta}>
                      {[vaga.cidade, vaga.estado].filter(Boolean).join(' / ') || 'Local não informado'} · {vaga.modalidade ?? '—'}
                    </Text>
                    {/* Fica logo abaixo do local (antes tinha virado uma linha
                        separada lá embaixo do card inteiro, deixando um vão
                        vazio). */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, alignItems: 'center' }}>
                      {vaga.senioridade ? <Text style={rsStyles.listRowMeta}>{vaga.senioridade}</Text> : null}
                      <Text style={rsStyles.listRowMeta}>{vaga.num_vagas ?? 1} vaga(s)</Text>
                      <Text style={rsStyles.listRowMeta}>· {formatNumeroBR(vaga.total_candidatos ?? 0)} candidato(s)</Text>
                    </View>
                  </Pressable>
                  {/* Coluna à direita: status em cima, toggle "Na LP" (menor)
                      e o "..." lado a lado por baixo — antes eram 3 linhas
                      empilhadas, o que sobrava altura e afastava o texto de
                      baixo do local. */}
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <RsBadge label={statusMeta.label} color={statusMeta.color} bg="#F1F2F6" />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ transform: [{ scale: 0.72 }] }}>
                        <ToggleSwitch value={!!naLp} onValueChange={() => handleToggleNaLp(vaga)} />
                      </View>
                      <Pressable style={rsStyles.rowMenuButton} onPress={() => setActionsMenuVaga(vaga)} hitSlop={8}>
                        <Feather name="more-vertical" size={18} color="#5E667D" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <RsVagaActionsMenuModal
        vaga={actionsMenuVaga}
        onClose={() => setActionsMenuVaga(null)}
        onAbrir={() => {
          const vaga = actionsMenuVaga;
          setActionsMenuVaga(null);
          if (vaga) navigation.navigate('RecrutamentoVagaDetalhe', { id: vaga.id });
        }}
        onEditar={() => {
          const vaga = actionsMenuVaga;
          setActionsMenuVaga(null);
          if (vaga) openEdit(vaga);
        }}
        onAdicionarCandidatos={() => {
          setActionsMenuVaga(null);
          handleAdicionarCandidatos();
        }}
        onCopiarLink={() => {
          setActionsMenuVaga(null);
          handleCopiarLinkLp();
        }}
        onPausarReabrir={() => {
          const vaga = actionsMenuVaga;
          setActionsMenuVaga(null);
          if (vaga) handleAcao(vaga, vaga.status === 'aberta' ? 'pausar' : 'reabrir');
        }}
        onEncerrar={() => {
          const vaga = actionsMenuVaga;
          setActionsMenuVaga(null);
          if (vaga) handleAcao(vaga, 'encerrar');
        }}
        onExcluir={() => {
          const vaga = actionsMenuVaga;
          setActionsMenuVaga(null);
          if (vaga) handleDelete(vaga);
        }}
      />

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
// 2b. Vaga — Detalhe (3 abas: Visão Geral / Candidatos·Triagem / Funil,
// igual ao painel web)
// ============================================================

const RS_ESTAGIO_META: Record<string, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  novo: { label: 'Novo', color: '#3B82F6', icon: 'user-plus' },
  triagem: { label: 'Triagem', color: '#F59E0B', icon: 'list' },
  entrevista: { label: 'Entrevista', color: '#8B5CF6', icon: 'message-circle' },
  aprovado: { label: 'Aprovado', color: '#10B981', icon: 'award' },
  contratado: { label: 'Contratado', color: '#14B8A6', icon: 'user-check' },
  reprovado: { label: 'Reprovado', color: '#EF4444', icon: 'x-circle' },
};
function rsEstagioMeta(estagio: string | null | undefined) {
  const key = (estagio ?? '').toLowerCase();
  return RS_ESTAGIO_META[key] ?? { label: estagio || '—', color: '#5E667D', icon: 'circle' as const };
}

// Fluxo linear do funil — "reprovado" fica de fora (é estatística à parte no
// topo, igual ao painel web).
const RS_FUNIL_FLOW = ['novo', 'triagem', 'entrevista', 'aprovado', 'contratado'];

// Lista completa igual ao formulário do painel web (print de 17/09/2026).
// Só os 6 marcados como "confirmado" abaixo tiveram o código validado numa
// vaga real (vt, va, seguro_vida, day_off_aniv, plr, aux_combustivel — todos
// vieram exatamente assim no endpoint). Os outros 8 nunca apareceram
// preenchidos em nenhuma vaga real até agora — o código de cada um aqui é
// um "melhor palpite" (slug do nome) que ainda precisa ser confirmado com a
// Lovable antes de confiar que grava certo.
const RS_BENEFICIO_OPTIONS: Array<{ code: string; label: string; confirmado: boolean }> = [
  { code: 'vt', label: 'Vale-transporte', confirmado: true },
  { code: 'vr', label: 'Vale-refeição', confirmado: false },
  { code: 'va', label: 'Vale-alimentação', confirmado: true },
  { code: 'refeicao_local', label: 'Refeição no local', confirmado: false },
  { code: 'plano_saude', label: 'Plano de saúde', confirmado: false },
  { code: 'plano_odontologico', label: 'Plano odontológico', confirmado: false },
  { code: 'seguro_vida', label: 'Seguro de vida', confirmado: true },
  { code: 'plr', label: 'PLR / Bonificação', confirmado: true },
  { code: 'cesta_basica', label: 'Cesta básica', confirmado: false },
  { code: 'aux_combustivel', label: 'Auxílio combustível', confirmado: true },
  { code: 'aux_creche', label: 'Auxílio creche', confirmado: false },
  { code: 'gympass', label: 'Gympass / Wellness', confirmado: false },
  { code: 'day_off_aniv', label: 'Day off no aniversário', confirmado: true },
  { code: 'convenio_farmacia', label: 'Convênio farmácia', confirmado: false },
];
const RS_BENEFICIO_LABEL: Record<string, string> = Object.fromEntries(RS_BENEFICIO_OPTIONS.map((o) => [o.code, o.label]));
function rsBeneficioLabel(codigo: string): string {
  return RS_BENEFICIO_LABEL[codigo] ?? codigo.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

// Máscara progressiva de moeda (mesmo padrão do RH/App.tsx) — dígitos
// entram da direita pra esquerda nos centavos.
function rsMaskMoeda(digits: string): string {
  if (!digits) return '';
  const cents = digits.padStart(3, '0');
  const intPart = cents.slice(0, -2).replace(/^0+(?=\d)/, '');
  const decimalPart = cents.slice(-2);
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${withThousands},${decimalPart}`;
}
// Máscara progressiva de data (dd/mm/aaaa) usada nos filtros de "Cadastrado
// de/até" — guarda só os dígitos, igual ao padrão de moeda acima.
function rsMaskDataBR(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
// Máscara progressiva de telefone: (XX) XXXXX-XXXX (celular, 11 dígitos) ou
// (XX) XXXX-XXXX (fixo, 10 dígitos) — mesmo padrão dos outros rsMask*.
function rsMaskTelefone(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (d.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}
function rsDataBRParaIso(digits: string): string | undefined {
  if (digits.length !== 8) return undefined;
  const dia = digits.slice(0, 2);
  const mes = digits.slice(2, 4);
  const ano = digits.slice(4, 8);
  return `${ano}-${mes}-${dia}`;
}

function rsParseFaixaSalarialDigits(value: string | null | undefined): { min: string; max: string } {
  if (!value) return { min: '', max: '' };
  const matches = value.match(/[\d]+(?:[.,]\d+)?/g) ?? [];
  const toDigits = (s: string) => {
    const [intPart, decPart] = s.replace(/\./g, '').split(',');
    return `${intPart ?? ''}${(decPart ?? '00').padEnd(2, '0').slice(0, 2)}`.replace(/^0+(?=\d)/, '');
  };
  return { min: matches[0] ? toDigits(matches[0]) : '', max: matches[1] ? toDigits(matches[1]) : '' };
}

const RS_MODALIDADE_OPTIONS = ['presencial', 'hibrido', 'remoto'];
const RS_SENIORIDADE_OPTIONS = ['junior', 'pleno', 'senior'];
function rsCapitalize(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

// Modal rápido de candidato dentro da aba Candidatos/Triagem — mesmo
// conteúdo do popup do painel web (Estágio, Match, Calculado em, Status
// WhatsApp, Análise da IA, Observações, Adicionada em). "Observações" e
// "Análise da IA" só vêm no fetch completo do candidato (perfil.aplicacoes),
// não no resumo embutido no fetch da vaga — por isso busca de novo ao abrir.
// "Calculado em" e "Status WhatsApp" NÃO têm nenhum campo equivalente em
// nenhum endpoint conferido até agora (nem no candidato, nem na aplicação —
// não existe endpoint de "calcular match" nem coluna de data pra isso) —
// por isso ficam sempre "—", igual aparece no painel web pra essa vaga.
// Precisa confirmar com a Lovable antes de exibir algo real aqui.
function RsCandidatoAplicacaoModal({
  resumo,
  vagaId,
  vagaTitulo,
  onClose,
}: {
  resumo: RecrutamentoVagaAplicacaoResumo | null;
  vagaId: string;
  vagaTitulo: string;
  onClose: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [detalhe, setDetalhe] = useState<{
    estagio: string | null;
    match_score: number | null;
    match_analise: string | null;
    observacoes: string | null;
    created_at: string | null;
  } | null>(null);

  useEffect(() => {
    if (!resumo) {
      setDetalhe(null);
      return;
    }
    setIsLoading(true);
    setDetalhe(null);
    fetchRecrutamentoCandidato(resumo.candidato.id)
      .then((raw) => {
        const rawObj = raw as unknown as Record<string, unknown>;
        const perfil = (rawObj.perfil as Record<string, unknown>) ?? rawObj;
        const aplicacoes = (perfil.aplicacoes as Array<Record<string, unknown>>) ?? [];
        const aplicacao = aplicacoes.find((a) => (a.vaga as Record<string, unknown> | undefined)?.id === vagaId) ?? null;
        setDetalhe({
          estagio: (aplicacao?.estagio as string) ?? resumo.estagio,
          match_score: (aplicacao?.match_score as number) ?? resumo.match_score,
          match_analise: (aplicacao?.match_analise as string) ?? null,
          observacoes: (aplicacao?.observacoes as string) ?? null,
          created_at: (aplicacao?.created_at as string) ?? null,
        });
      })
      .catch(() => setDetalhe(null))
      .finally(() => setIsLoading(false));
  }, [resumo, vagaId]);

  if (!resumo) return null;
  const estagioMeta = rsEstagioMeta(detalhe?.estagio ?? resumo.estagio);

  return (
    <Modal visible={resumo !== null} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={rsStyles.actionsMenuBackdrop} onPress={onClose}>
        <Pressable style={rsStyles.candModalCard} onPress={() => {}}>
          <Text style={rsStyles.candModalTitle} numberOfLines={1}>
            {resumo.candidato.nome_completo}
          </Text>
          <Text style={rsStyles.candModalSubtitle} numberOfLines={1}>
            Vaga: {vagaTitulo}
          </Text>
          {isLoading ? (
            <ActivityIndicator color="#1F3A5F" style={{ marginVertical: 20 }} />
          ) : (
            <View style={rsStyles.candModalFieldRow}>
              <View style={rsStyles.candModalField}>
                <Text style={rsStyles.candModalFieldLabel}>ESTÁGIO</Text>
                <RsBadge label={estagioMeta.label} color={estagioMeta.color} bg="#F1F2F6" />
              </View>
              <View style={rsStyles.candModalField}>
                <Text style={rsStyles.candModalFieldLabel}>MATCH</Text>
                <Text style={rsStyles.candModalFieldValue}>{detalhe?.match_score != null ? `${detalhe.match_score}%` : '—'}</Text>
              </View>
              <View style={rsStyles.candModalField}>
                <Text style={rsStyles.candModalFieldLabel}>CALCULADO EM</Text>
                <Text style={rsStyles.candModalFieldValue}>—</Text>
              </View>
              <View style={rsStyles.candModalField}>
                <Text style={rsStyles.candModalFieldLabel}>STATUS WHATSAPP</Text>
                <Text style={rsStyles.candModalFieldValue}>—</Text>
              </View>
              <View style={{ width: '100%' }}>
                <Text style={rsStyles.candModalFieldLabel}>ANÁLISE DA IA</Text>
                <Text style={rsStyles.candModalFieldValue}>{detalhe?.match_analise ?? '—'}</Text>
              </View>
              <View style={{ width: '100%' }}>
                <Text style={rsStyles.candModalFieldLabel}>OBSERVAÇÕES</Text>
                <Text style={rsStyles.candModalFieldValue}>{detalhe?.observacoes ?? '—'}</Text>
              </View>
              <View style={rsStyles.candModalField}>
                <Text style={rsStyles.candModalFieldLabel}>ADICIONADA EM</Text>
                <Text style={rsStyles.candModalFieldValue}>{formatDateIsoBR(detalhe?.created_at) ?? '—'}</Text>
              </View>
            </View>
          )}
          <Pressable style={rsStyles.candModalCloseButton} onPress={onClose}>
            <Text style={rsStyles.candModalCloseText}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Menu "..." de cada candidato na aba Candidatos/Triagem — mesmas 6 ações do
// dropdown do painel web, todas ligadas a endpoints reais: "Calcular match"
// chama a sugestão por IA da própria vaga (recalcula o score de todo mundo
// nela, não só do candidato clicado — é o único endpoint de match que
// existe); "Enviar prova/DISC" manda uma mensagem real pelo WhatsApp
// convidando o candidato (não existe endpoint de "aplicar teste", então usa
// o canal disponível); "Contratar" move pra estágio "Contratado" (mover
// etapa real) — só o "iniciar admissão" (criar os documentos) não tem
// endpoint próprio ainda.
function RsCandidatoRowActionsMenuModal({
  aplicacao,
  onClose,
  onVisualizar,
  onCalcularMatch,
  onEnviarProva,
  onContratar,
  onConvidarWhatsapp,
  onExcluir,
}: {
  aplicacao: RecrutamentoVagaAplicacaoResumo | null;
  onClose: () => void;
  onVisualizar: () => void;
  onCalcularMatch: () => void;
  onEnviarProva: () => void;
  onContratar: () => void;
  onConvidarWhatsapp: () => void;
  onExcluir: () => void;
}) {
  if (!aplicacao) return null;
  return (
    <Modal visible={aplicacao !== null} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={rsStyles.actionsMenuBackdrop} onPress={onClose}>
        <Pressable style={rsStyles.actionsMenuCard} onPress={() => {}}>
          <Text style={rsStyles.actionsMenuTitle} numberOfLines={1}>
            {aplicacao.candidato.nome_completo}
          </Text>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onVisualizar}>
            <Feather name="eye" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Visualizar</Text>
          </Pressable>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onCalcularMatch}>
            <Feather name="zap" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Calcular match</Text>
          </Pressable>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onEnviarProva}>
            <Feather name="clipboard" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Enviar prova / DISC</Text>
          </Pressable>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onContratar}>
            <Feather name="user-check" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Contratar / iniciar admissão</Text>
          </Pressable>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onConvidarWhatsapp}>
            <Feather name="message-circle" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Convidar via WhatsApp</Text>
          </Pressable>
          <Pressable style={[rsStyles.actionsMenuRow, rsStyles.actionsMenuRowLast]} onPress={onExcluir}>
            <Feather name="trash-2" size={16} color="#E6213D" />
            <Text style={[rsStyles.actionsMenuRowText, { color: '#E6213D' }]}>Excluir</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Item de pergunta usado só no editor local do roteiro de triagem — "opcoes"
// fica como texto solto (uma opção por linha) até o momento de salvar, onde
// vira array.
type RsTriagemPerguntaForm = { texto: string; opcoes: string };

// Modal "Roteiro da Triagem" — igual ao do painel web (mensagem de
// boas-vindas, lista de perguntas com opções de resposta, mensagem de
// encerramento, e opção de salvar também como template reutilizável).
function RsTriagemRoteiroModal({
  visible,
  abertura,
  setAbertura,
  encerramento,
  setEncerramento,
  perguntas,
  setPerguntas,
  salvarComoTemplate,
  setSalvarComoTemplate,
  isSaving,
  onCancel,
  onSave,
}: {
  visible: boolean;
  abertura: string;
  setAbertura: (v: string) => void;
  encerramento: string;
  setEncerramento: (v: string) => void;
  perguntas: RsTriagemPerguntaForm[];
  setPerguntas: (v: RsTriagemPerguntaForm[]) => void;
  salvarComoTemplate: boolean;
  setSalvarComoTemplate: (v: boolean) => void;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const updatePergunta = (idx: number, patch: Partial<RsTriagemPerguntaForm>) => {
    setPerguntas(perguntas.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };
  const removePergunta = (idx: number) => {
    setPerguntas(perguntas.filter((_, i) => i !== idx));
  };

  return (
    <RsModal visible={visible} title="Roteiro da Triagem" onClose={onCancel}>
      <Text style={[rsStyles.listRowMeta, { marginBottom: 12 }]}>
        Mensagens enviadas pelo assistente no WhatsApp. Perguntas com opções são numeradas automaticamente.
      </Text>
      <RsFormLabel>Mensagem de boas-vindas (opcional)</RsFormLabel>
      <RsTextInput value={abertura} onChangeText={setAbertura} placeholder="Ex.: Olá! Vamos começar sua triagem..." multiline />

      {perguntas.map((p, idx) => (
        <View key={idx} style={rsStyles.chartCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={rsStyles.sectionTitle}>Pergunta {idx + 1}</Text>
            {perguntas.length > 1 ? (
              <Pressable onPress={() => removePergunta(idx)} hitSlop={8}>
                <Feather name="trash-2" size={16} color="#E6213D" />
              </Pressable>
            ) : null}
          </View>
          <RsTextInput
            value={p.texto}
            onChangeText={(texto) => updatePergunta(idx, { texto })}
            placeholder="Ex.: Conte brevemente sua experiência com..."
            multiline
          />
          <RsFormLabel>Opções de resposta (uma por linha — deixe vazio para resposta livre)</RsFormLabel>
          <RsTextInput
            value={p.opcoes}
            onChangeText={(opcoes) => updatePergunta(idx, { opcoes })}
            placeholder={'Sim\nNão'}
            multiline
          />
        </View>
      ))}

      <Pressable
        style={[rsStyles.secondaryButton, { justifyContent: 'center', marginBottom: 16 }]}
        onPress={() => setPerguntas([...perguntas, { texto: '', opcoes: '' }])}
      >
        <Feather name="plus" size={14} color="#1F3A5F" />
        <Text style={rsStyles.secondaryButtonText}>Adicionar pergunta</Text>
      </Pressable>

      <RsFormLabel>Mensagem de encerramento (opcional)</RsFormLabel>
      <RsTextInput value={encerramento} onChangeText={setEncerramento} placeholder="Ex.: Obrigado por responder!" multiline />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 20 }}>
        <View style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <Text style={rsStyles.formLabel}>Salvar também como template reutilizável</Text>
          <Text style={rsStyles.listRowMeta}>Fica disponível para outras vagas iguais.</Text>
        </View>
        <ToggleSwitch value={salvarComoTemplate} onValueChange={() => setSalvarComoTemplate(!salvarComoTemplate)} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <Pressable style={[rsStyles.secondaryButton, { flex: 1, justifyContent: 'center' }]} onPress={onCancel}>
          <Text style={rsStyles.secondaryButtonText}>Cancelar</Text>
        </Pressable>
        <Pressable style={[rsStyles.primaryButton, { flex: 1, justifyContent: 'center' }]} onPress={onSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={rsStyles.primaryButtonText}>Salvar roteiro</Text>}
        </Pressable>
      </View>
    </RsModal>
  );
}

export function RecrutamentoVagaDetalheScreen({ navigation, route }: ScreenProps<'RecrutamentoVagaDetalhe'>) {
  const { id } = route.params;
  const [vaga, setVaga] = useState<RecrutamentoVaga | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'candidatos' | 'funil'>('geral');
  const [buscaCandidato, setBuscaCandidato] = useState('');
  const [selectedAplicacao, setSelectedAplicacao] = useState<RecrutamentoVagaAplicacaoResumo | null>(null);
  const [candidatoMenuAplicacao, setCandidatoMenuAplicacao] = useState<RecrutamentoVagaAplicacaoResumo | null>(null);

  const [triagemRoteiro, setTriagemRoteiro] = useState<RecrutamentoTriagemVagaRoteiro | null>(null);
  const [isLoadingRoteiro, setIsLoadingRoteiro] = useState(false);
  const [isTriagemModalOpen, setIsTriagemModalOpen] = useState(false);
  const [isIniciarWaModalOpen, setIsIniciarWaModalOpen] = useState(false);
  const [isGerandoLinkTriagem, setIsGerandoLinkTriagem] = useState(false);
  const [triagemAbertura, setTriagemAbertura] = useState('');
  const [triagemEncerramento, setTriagemEncerramento] = useState('');
  const [triagemPerguntas, setTriagemPerguntas] = useState<RsTriagemPerguntaForm[]>([{ texto: '', opcoes: '' }]);
  const [triagemComoTemplate, setTriagemComoTemplate] = useState(false);
  const [isSavingTriagem, setIsSavingTriagem] = useState(false);

  const [isAddCandidatosOpen, setIsAddCandidatosOpen] = useState(false);
  const [addBusca, setAddBusca] = useState('');
  const [addTipoVaga, setAddTipoVaga] = useState('');
  const [isAddTipoVagaOpen, setIsAddTipoVagaOpen] = useState(false);
  const [addCidade, setAddCidade] = useState('');
  const [addBairro, setAddBairro] = useState('');
  const [addUf, setAddUf] = useState('');
  const [addEstagioInicial, setAddEstagioInicial] = useState('novo');
  const [isAddEstagioOpen, setIsAddEstagioOpen] = useState(false);
  const [addObservacao, setAddObservacao] = useState('');
  const [addPool, setAddPool] = useState<RecrutamentoCandidatoItem[]>([]);
  const [isLoadingAddPool, setIsLoadingAddPool] = useState(false);
  const [addSelecionados, setAddSelecionados] = useState<string[]>([]);
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editStep, setEditStep] = useState<1 | 2 | 3 | 4>(1);
  const [formTitulo, setFormTitulo] = useState('');
  const [formCidade, setFormCidade] = useState('');
  const [formUf, setFormUf] = useState('');
  const [formModalidade, setFormModalidade] = useState('');
  const [isFormModalidadeOpen, setIsFormModalidadeOpen] = useState(false);
  const [formSenioridade, setFormSenioridade] = useState('');
  const [isFormSenioridadeOpen, setIsFormSenioridadeOpen] = useState(false);
  const [formNumVagas, setFormNumVagas] = useState('1');
  const [formDescricao, setFormDescricao] = useState('');
  const [formRequisitos, setFormRequisitos] = useState('');
  // Guarda só os dígitos digitados (padrão de máscara progressiva de
  // centavos, mesmo usado no RH) — o texto em reais é derivado na hora de
  // exibir e de montar a string final salva em faixa_salarial.
  const [formFaixaMinDigits, setFormFaixaMinDigits] = useState('');
  const [formFaixaMaxDigits, setFormFaixaMaxDigits] = useState('');
  const [formBeneficios, setFormBeneficios] = useState<string[]>([]);
  const [formBeneficiosOutros, setFormBeneficiosOutros] = useState('');
  const [formExibirEmpresa, setFormExibirEmpresa] = useState(false);
  const [formExibirSalario, setFormExibirSalario] = useState(false);
  const [formStatus, setFormStatus] = useState('aberta');
  const [isFormStatusOpen, setIsFormStatusOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback((silent = false) => {
    if (!silent) setIsLoading(true);
    setErrorMessage(null);
    fetchRecrutamentoVaga(id)
      .then(setVaga)
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar a vaga.')))
      .finally(() => setIsLoading(false));
  }, [id]);

  const loadRoteiro = useCallback(() => {
    setIsLoadingRoteiro(true);
    fetchRecrutamentoTriagemVagaRoteiro(id)
      .then(setTriagemRoteiro)
      .catch(() => setTriagemRoteiro(null))
      .finally(() => setIsLoadingRoteiro(false));
  }, [id]);

  const isFocused = useIsFocused();
  useEffect(() => {
    load();
    loadRoteiro();
  }, [load, loadRoteiro]);
  // Recarrega toda vez que volta pra essa tela — cobre dados que mudaram por
  // fora do app (ex.: automação no n8n atualizando estágio/match direto no
  // banco), sem esperar o usuário sair e voltar a abrir a vaga de novo.
  useEffect(() => {
    if (isFocused) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const openEdit = () => {
    if (!vaga) return;
    setEditStep(1);
    setFormTitulo(vaga.titulo ?? '');
    setFormCidade(vaga.cidade ?? '');
    setFormUf(vaga.estado ?? '');
    setFormModalidade(vaga.modalidade ?? '');
    setFormSenioridade(vaga.senioridade ?? '');
    setFormNumVagas(String(vaga.num_vagas ?? 1));
    setFormDescricao(vaga.descricao ?? '');
    setFormRequisitos(vaga.requisitos ?? '');
    const faixaDigits = rsParseFaixaSalarialDigits(vaga.faixa_salarial);
    setFormFaixaMinDigits(faixaDigits.min);
    setFormFaixaMaxDigits(faixaDigits.max);
    setFormBeneficios(Array.isArray(vaga.beneficios) ? vaga.beneficios : []);
    setFormBeneficiosOutros(vaga.beneficios_outros ?? '');
    setFormExibirEmpresa(!!vaga.exibir_empresa);
    setFormExibirSalario(!!vaga.exibir_salario);
    setFormStatus(vaga.status ?? 'aberta');
    setIsEditOpen(true);
  };

  const toggleFormBeneficio = (code: string) => {
    setFormBeneficios((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  // Deixa clicar direto em "Etapa 2/3/4" no cabeçalho (antes só dava pra
  // avançar pelo botão) e fecha qualquer dropdown aberto — um dropdown
  // aberto (Modalidade/Senioridade/Status) fica por cima do botão
  // Avançar/Voltar e engole o toque, dando a impressão de que não avança.
  const goToEditStep = (step: 1 | 2 | 3 | 4) => {
    if (step > editStep && editStep === 1 && !formTitulo.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o título da vaga.');
      return;
    }
    setIsFormModalidadeOpen(false);
    setIsFormSenioridadeOpen(false);
    setIsFormStatusOpen(false);
    setEditStep(step);
  };

  const handleSave = () => {
    if (!vaga || !formTitulo.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o título da vaga.');
      setEditStep(1);
      return;
    }
    const faixaMinLabel = formFaixaMinDigits ? rsMaskMoeda(formFaixaMinDigits) : '';
    const faixaMaxLabel = formFaixaMaxDigits ? rsMaskMoeda(formFaixaMaxDigits) : '';
    const faixaSalarial = faixaMinLabel && faixaMaxLabel ? `${faixaMinLabel} – ${faixaMaxLabel}` : faixaMinLabel || faixaMaxLabel || null;
    setIsSaving(true);
    updateRecrutamentoVaga(vaga.id, {
      titulo: formTitulo.trim(),
      cidade: formCidade.trim() || null,
      estado: formUf.trim() || null,
      modalidade: formModalidade.trim() || null,
      senioridade: formSenioridade.trim() || null,
      num_vagas: Number(formNumVagas) || 1,
      descricao: formDescricao.trim() || null,
      requisitos: formRequisitos.trim() || null,
      faixa_salarial: faixaSalarial,
      beneficios: formBeneficios,
      beneficios_outros: formBeneficiosOutros.trim() || null,
      exibir_empresa: formExibirEmpresa,
      exibir_salario: formExibirSalario,
      status: formStatus,
    })
      .then(() => {
        setIsEditOpen(false);
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar a vaga.')))
      .finally(() => setIsSaving(false));
  };

  const idsJaNaVaga = useMemo(() => new Set((vaga?.aplicacoes ?? []).map((a) => a.candidato.id)), [vaga]);

  // Carrega o "pool" completo de candidatos uma vez só ao abrir o modal —
  // todos os filtros (busca/tipo de vaga/bairro/cidade/UF) são aplicados em
  // cima dele no cliente, incluindo o dropdown de "Tipo de vaga" (derivado
  // das profissões reais que existem, em vez de uma lista inventada).
  const loadAddPool = useCallback(() => {
    setIsLoadingAddPool(true);
    fetchRecrutamentoCandidatos({})
      .then(setAddPool)
      .catch(() => setAddPool([]))
      .finally(() => setIsLoadingAddPool(false));
  }, []);

  const openAddCandidatos = () => {
    setAddBusca('');
    setAddTipoVaga('');
    setAddCidade('');
    setAddBairro('');
    setAddUf('');
    setAddEstagioInicial('novo');
    setAddObservacao('');
    setAddSelecionados([]);
    setIsAddCandidatosOpen(true);
  };

  useEffect(() => {
    if (isAddCandidatosOpen) loadAddPool();
  }, [isAddCandidatosOpen, loadAddPool]);

  const addTipoVagaOptions = useMemo(() => {
    const set = new Set<string>();
    addPool.forEach((c) => {
      if (c.profissao) set.add(c.profissao);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [addPool]);

  const addElegiveis = useMemo(() => {
    const termo = addBusca.trim().toLowerCase();
    const cidadeTermo = addCidade.trim().toLowerCase();
    const bairroTermo = addBairro.trim().toLowerCase();
    const ufTermo = addUf.trim().toLowerCase();
    return addPool.filter((c) => {
      if (idsJaNaVaga.has(c.id)) return false;
      if (termo && !c.nome_completo.toLowerCase().includes(termo) && !(c.profissao ?? '').toLowerCase().includes(termo)) return false;
      if (addTipoVaga && c.profissao !== addTipoVaga) return false;
      if (cidadeTermo && !(c.cidade ?? '').toLowerCase().includes(cidadeTermo)) return false;
      if (bairroTermo && !(c.bairro ?? '').toLowerCase().includes(bairroTermo)) return false;
      if (ufTermo && (c.estado ?? '').toLowerCase() !== ufTermo) return false;
      return true;
    });
  }, [addPool, addBusca, addTipoVaga, addCidade, addBairro, addUf, idsJaNaVaga]);

  const toggleAddSelecionado = (candidatoId: string) => {
    setAddSelecionados((prev) => (prev.includes(candidatoId) ? prev.filter((id) => id !== candidatoId) : [...prev, candidatoId]));
  };

  // Não existe endpoint dedicado de "vincular candidato à vaga" — reaproveita
  // o mover-etapa (candidato_id + vaga_id + etapa), que é o único endpoint
  // real que relaciona os dois. Ainda não testei em produção se ele CRIA a
  // candidatura quando ela não existe ou só atualiza uma já existente —
  // precisa confirmar com a Lovable se o resultado não for o esperado.
  const handleConfirmarAddCandidatos = () => {
    if (!vaga || addSelecionados.length === 0) return;
    setIsSavingAdd(true);
    Promise.all(
      addSelecionados.map((candidatoId) =>
        moverRecrutamentoCandidatoEtapa({ candidato_id: candidatoId, vaga_id: vaga.id, etapa: addEstagioInicial })
      )
    )
      .then(() => {
        setIsAddCandidatosOpen(false);
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível adicionar os candidatos à vaga.')))
      .finally(() => setIsSavingAdd(false));
  };

  // Pré-preenche do roteiro real (recurso=triagem-vaga, confirmado e
  // testado pela Lovable em 18/09/2026) — os campos são exatamente
  // texto/opcoes[], igual eu já mandava no PATCH.
  const openTriagemModal = () => {
    if (!vaga) return;
    const perguntas: RsTriagemPerguntaForm[] = (triagemRoteiro?.perguntas ?? [])
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((p) => ({ texto: p.texto, opcoes: p.opcoes.join('\n') }));
    setTriagemAbertura(triagemRoteiro?.triagem_msg_abertura ?? '');
    setTriagemEncerramento(triagemRoteiro?.triagem_msg_encerramento ?? '');
    setTriagemPerguntas(perguntas.length > 0 ? perguntas : [{ texto: '', opcoes: '' }]);
    setTriagemComoTemplate(false);
    setIsTriagemModalOpen(true);
  };

  // Sem critério real pra saber qual modelo é "o padrão do posto" (nenhum
  // campo indica isso) — carrega o primeiro modelo já salvo em Configurações
  // como ponto de partida editável, em vez de inventar um "padrão".
  const handleUsarFluxoPadrao = () => {
    fetchRecrutamentoTriagemModelos()
      .then((modelos) => {
        if (modelos.length === 0) {
          Alert.alert(
            'Nenhum modelo cadastrado',
            'Ainda não existe nenhum modelo de triagem salvo em Configurações. Use "Criar perguntas" para montar um roteiro do zero.'
          );
          return;
        }
        const modelo = modelos[0];
        setTriagemAbertura('');
        setTriagemEncerramento('');
        setTriagemPerguntas(modelo.perguntas.length > 0 ? modelo.perguntas.map((texto) => ({ texto, opcoes: '' })) : [{ texto: '', opcoes: '' }]);
        setTriagemComoTemplate(false);
        setIsTriagemModalOpen(true);
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar os modelos de triagem.')));
  };

  const handleToggleAutomacaoTriagem = () => {
    if (!vaga || !triagemRoteiro) return;
    const novoValor = !triagemRoteiro.triagem_wa_ativa;
    setTriagemRoteiro({ ...triagemRoteiro, triagem_wa_ativa: novoValor });
    updateRecrutamentoTriagemVagaRoteiro(vaga.id, {
      triagem_perguntas: triagemRoteiro.perguntas.map((p) => ({ texto: p.texto, opcoes: p.opcoes })),
      triagem_msg_abertura: triagemRoteiro.triagem_msg_abertura,
      triagem_msg_encerramento: triagemRoteiro.triagem_msg_encerramento,
      triagem_wa_ativa: novoValor,
    })
      .then(() => loadRoteiro())
      .catch((err) => {
        setTriagemRoteiro(triagemRoteiro);
        Alert.alert('Erro', showRsError(err, 'Não foi possível atualizar a automação.'));
      });
  };

  const handleIniciarNoWhatsApp = (c: RecrutamentoVagaAplicacaoResumo['candidato']) => {
    if (!vaga) return;
    setIsIniciarWaModalOpen(false);
    if (!c.whatsapp) {
      Alert.alert('Sem WhatsApp', 'Este candidato não tem número de WhatsApp cadastrado.');
      return;
    }
    setIsGerandoLinkTriagem(true);
    gerarRecrutamentoLinkEtapa({ etapa: 'perguntas', candidato_id: c.id, vaga_id: vaga.id })
      .then((res) => {
        const numero = c.whatsapp!.replace(/\D/g, '');
        Linking.openURL(`https://wa.me/${numero}?text=${encodeURIComponent(res.link)}`);
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível gerar o link da triagem.')))
      .finally(() => setIsGerandoLinkTriagem(false));
  };

  const handleSaveTriagem = () => {
    if (!vaga) return;
    const perguntasBody = triagemPerguntas
      .filter((p) => p.texto.trim())
      .map((p) => ({
        texto: p.texto.trim(),
        opcoes: p.opcoes
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      }));
    setIsSavingTriagem(true);
    updateRecrutamentoTriagemVagaRoteiro(vaga.id, {
      triagem_perguntas: perguntasBody,
      triagem_msg_abertura: triagemAbertura.trim() || null,
      triagem_msg_encerramento: triagemEncerramento.trim() || null,
      triagem_wa_ativa: perguntasBody.length > 0,
    })
      .then(() => {
        if (triagemComoTemplate && perguntasBody.length > 0) {
          return createRecrutamentoTriagemModelo({
            nome: `${vaga.titulo} — roteiro`,
            perguntas: perguntasBody.map((p) => p.texto),
          });
        }
        return null;
      })
      .then(() => {
        setIsTriagemModalOpen(false);
        loadRoteiro();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar o roteiro de triagem.')))
      .finally(() => setIsSavingTriagem(false));
  };

  // Não existe endpoint de "calcular match de 1 candidato" — o único
  // endpoint de match que existe é a sugestão por IA da vaga inteira
  // (/sugestao-ia), que recalcula o score de todos os candidatos dela.
  // Reaproveito ele aqui: é real, mas atualiza a vaga toda, não só quem foi
  // clicado.
  // Endpoint real por candidato confirmado e testado pela Lovable
  // (18/09/2026) — usa direto o id da aplicação (candidato nesta vaga).
  const handleCalcularMatch = (a: RecrutamentoVagaAplicacaoResumo) => {
    calcularRecrutamentoMatch({ aplicacao_id: a.id })
      .then((res) => {
        load();
        Alert.alert('Match calculado', `Score: ${res.match_score}\n\n${res.match_analise}`);
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível calcular o match.')));
  };

  // Endpoint real confirmado pela Lovable (18/09/2026) — usa a primeira
  // avaliação/DISC já cadastrada em Configurações > Provas e DISC (não há
  // um jeito de saber qual é "a certa" se houver mais de uma cadastrada).
  const handleEnviarProva = (a: RecrutamentoVagaAplicacaoResumo) => {
    fetchRecrutamentoAvaliacoes()
      .then((avaliacoes) => {
        if (avaliacoes.length === 0) {
          Alert.alert('Nenhuma avaliação cadastrada', 'Cadastre uma prova/DISC em Configurações > Provas e DISC antes de enviar.');
          return;
        }
        return enviarRecrutamentoAvaliacao({
          avaliacao_id: avaliacoes[0].id,
          candidato_ids: [a.candidato.id],
          vaga_id: vaga?.id,
        }).then((res) => {
          Alert.alert('Enviado', `Avaliação enviada. Expira em ${formatDateTimeBR(res.expira_em)}.`);
        });
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível enviar a avaliação.')));
  };

  const handleContratar = (a: RecrutamentoVagaAplicacaoResumo) => {
    Alert.alert('Contratar candidato', `Mover "${a.candidato.nome_completo}" para o estágio "Contratado"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Contratar',
        onPress: () => {
          moverRecrutamentoCandidatoEtapa({ candidato_id: a.candidato.id, vaga_id: vaga?.id, etapa: 'contratado' })
            .then(() => load())
            .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível mover o candidato de etapa.')));
        },
      },
    ]);
  };

  const handleConvidarWhatsapp = (a: RecrutamentoVagaAplicacaoResumo) => {
    if (!a.candidato.whatsapp) {
      Alert.alert('Sem WhatsApp', 'Esse candidato não tem número de WhatsApp cadastrado.');
      return;
    }
    Alert.alert('Convidar via WhatsApp', `Enviar convite da vaga "${vaga?.titulo}" para ${a.candidato.nome_completo}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar',
        onPress: () => {
          criarRecrutamentoWaConversa({
            phone: a.candidato.whatsapp as string,
            nome: a.candidato.nome_completo,
            texto: `Olá ${a.candidato.nome_completo}! Você foi convidado(a) para a vaga "${vaga?.titulo}". Podemos conversar?`,
          }).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível enviar o convite pelo WhatsApp.')));
        },
      },
    ]);
  };

  const handleExcluirCandidato = (a: RecrutamentoVagaAplicacaoResumo) => {
    Alert.alert(
      'Excluir candidato',
      `Isso exclui "${a.candidato.nome_completo}" do cadastro geral de candidatos (não só desta vaga). Confirma?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteRecrutamentoCandidato(a.candidato.id)
              .then(() => load())
              .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir o candidato.')));
          },
        },
      ]
    );
  };

  const aplicacoes = vaga?.aplicacoes ?? [];
  const candidatosFiltrados = useMemo(() => {
    const termo = buscaCandidato.trim().toLowerCase();
    if (!termo) return aplicacoes;
    return aplicacoes.filter((a) => a.candidato.nome_completo.toLowerCase().includes(termo));
  }, [aplicacoes, buscaCandidato]);

  const funilContagem = useMemo(() => {
    const contagem: Record<string, number> = {};
    aplicacoes.forEach((a) => {
      const key = (a.estagio ?? '').toLowerCase() || 'novo';
      contagem[key] = (contagem[key] ?? 0) + 1;
    });
    return contagem;
  }, [aplicacoes]);

  const totalAplicacoes = aplicacoes.length;
  const contratados = funilContagem.contratado ?? 0;
  const reprovados = funilContagem.reprovado ?? 0;
  const conversaoPct = totalAplicacoes > 0 ? Math.round((contratados / totalAplicacoes) * 100) : 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <ActivityIndicator color="#1F3A5F" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (errorMessage || !vaga) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.topBarContainer}>
          <Pressable style={rsStyles.backRow} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={20} color="#1F3A5F" />
            <Text style={rsStyles.backRowText}>Vagas</Text>
          </Pressable>
        </View>
        <RsEmptyState message={errorMessage ?? 'Vaga não encontrada.'} />
      </SafeAreaView>
    );
  }

  const statusMeta = vagaStatusMeta(vaga.status);
  const empresaNome = vaga.empresa?.razao_social ?? vaga.empresa?.nome_fantasia ?? vaga.empresa_nome ?? '—';
  const publicada = !!(vaga.na_lp ?? vaga.publicada_lp);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <Pressable style={rsStyles.backRow} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color="#1F3A5F" />
          <Text style={rsStyles.backRowText}>Vagas</Text>
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <RsPageHeader icon="briefcase" title={vaga.titulo} subtitle={empresaNome} />
          <Pressable style={rsStyles.rowMenuButton} onPress={openEdit} hitSlop={8}>
            <Feather name="edit-2" size={16} color="#1F3A5F" />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <RsBadge label={statusMeta.label} color={statusMeta.color} bg="#F1F2F6" />
          {vaga.modalidade ? <RsBadge label={vaga.modalidade} color="#3D4560" bg="#F1F2F6" /> : null}
          {vaga.senioridade ? <RsBadge label={vaga.senioridade} color="#3D4560" bg="#F1F2F6" /> : null}
          <RsBadge label={`${vaga.num_vagas ?? 1} vaga(s)`} color="#3D4560" bg="#F1F2F6" />
          {publicada ? <RsBadge label="Publicada no site" color="#1F3A5F" bg="#E8EEF6" /> : null}
        </View>

        <View style={rsStyles.vagaTabsRow}>
          {(
            [
              { key: 'geral', label: 'Visão Geral' },
              { key: 'candidatos', label: 'Candidatos / Triagem' },
              { key: 'funil', label: 'Funil' },
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab.key}
              style={[rsStyles.vagaTabButton, activeTab === tab.key ? rsStyles.vagaTabButtonActive : null]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[rsStyles.vagaTabText, activeTab === tab.key ? rsStyles.vagaTabTextActive : null]} numberOfLines={1} adjustsFontSizeToFit>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'geral' ? (
          <>
            <View style={[rsStyles.chartCard, { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }]}>
              <View style={rsStyles.vagaStatCell}>
                <Text style={rsStyles.vagaStatLabel}>CANDIDATOS</Text>
                <Text style={rsStyles.vagaStatValue}>{formatNumeroBR(vaga.total_candidatos ?? totalAplicacoes)}</Text>
              </View>
              <View style={rsStyles.vagaStatCell}>
                <Text style={rsStyles.vagaStatLabel}>LOCAL</Text>
                <Text style={rsStyles.vagaStatValue}>{[vaga.cidade, vaga.estado].filter(Boolean).join('/') || '—'}</Text>
              </View>
              <View style={rsStyles.vagaStatCell}>
                <Text style={rsStyles.vagaStatLabel}>FAIXA SALARIAL</Text>
                <Text style={rsStyles.vagaStatValue}>{vaga.faixa_salarial || '—'}</Text>
              </View>
              <View style={rsStyles.vagaStatCell}>
                <Text style={rsStyles.vagaStatLabel}>CRIADA EM</Text>
                <Text style={rsStyles.vagaStatValue}>{formatDateIsoBR(vaga.created_at) ?? '—'}</Text>
              </View>
            </View>

            <View style={rsStyles.chartCard}>
              <Text style={rsStyles.sectionTitle}>Detalhes</Text>
              <View style={rsStyles.vagaDetailRow}>
                <Text style={rsStyles.vagaDetailLabel}>Empresa</Text>
                <Text style={rsStyles.vagaDetailValue}>{empresaNome}</Text>
              </View>
              <View style={rsStyles.vagaDetailRow}>
                <Text style={rsStyles.vagaDetailLabel}>Cidade/UF</Text>
                <Text style={rsStyles.vagaDetailValue}>{[vaga.cidade, vaga.estado].filter(Boolean).join('/') || '—'}</Text>
              </View>
              <View style={rsStyles.vagaDetailRow}>
                <Text style={rsStyles.vagaDetailLabel}>Modalidade</Text>
                <Text style={rsStyles.vagaDetailValue}>{vaga.modalidade ?? '—'}</Text>
              </View>
              <View style={rsStyles.vagaDetailRow}>
                <Text style={rsStyles.vagaDetailLabel}>Senioridade</Text>
                <Text style={rsStyles.vagaDetailValue}>{vaga.senioridade ?? '—'}</Text>
              </View>
              <View style={rsStyles.vagaDetailRow}>
                <Text style={rsStyles.vagaDetailLabel}>Nº de vagas</Text>
                <Text style={rsStyles.vagaDetailValue}>{vaga.num_vagas ?? 1}</Text>
              </View>
              <View style={rsStyles.vagaDetailRow}>
                <Text style={rsStyles.vagaDetailLabel}>Faixa salarial</Text>
                <Text style={rsStyles.vagaDetailValue}>{vaga.faixa_salarial || '—'}</Text>
              </View>
            </View>

            <View style={rsStyles.chartCard}>
              <Text style={rsStyles.sectionTitle}>Publicação</Text>
              <View style={rsStyles.vagaDetailRow}>
                <Text style={rsStyles.vagaDetailLabel}>Publicada no site</Text>
                <Text style={rsStyles.vagaDetailValue}>{publicada ? 'Sim' : 'Não'}</Text>
              </View>
              <View style={rsStyles.vagaDetailRow}>
                <Text style={rsStyles.vagaDetailLabel}>Publicada em</Text>
                <Text style={rsStyles.vagaDetailValue}>{formatDateIsoBR(vaga.publicada_lp_em) ?? '—'}</Text>
              </View>
              <View style={rsStyles.vagaDetailRow}>
                <Text style={rsStyles.vagaDetailLabel}>Exibir empresa</Text>
                <Text style={rsStyles.vagaDetailValue}>{vaga.exibir_empresa ? 'Sim' : 'Não'}</Text>
              </View>
              <View style={rsStyles.vagaDetailRow}>
                <Text style={rsStyles.vagaDetailLabel}>Exibir salário</Text>
                <Text style={rsStyles.vagaDetailValue}>{vaga.exibir_salario ? 'Sim' : 'Não'}</Text>
              </View>
              <View style={rsStyles.vagaDetailRow}>
                <Text style={rsStyles.vagaDetailLabel}>Criada em</Text>
                <Text style={rsStyles.vagaDetailValue}>{formatDateIsoBR(vaga.created_at) ?? '—'}</Text>
              </View>
            </View>

            {vaga.descricao ? (
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Descrição</Text>
                <Text style={rsStyles.listRowMeta}>{vaga.descricao}</Text>
              </View>
            ) : null}

            {vaga.requisitos ? (
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Requisitos</Text>
                <Text style={rsStyles.listRowMeta}>{vaga.requisitos}</Text>
              </View>
            ) : null}

            {vaga.beneficios && vaga.beneficios.length > 0 ? (
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Benefícios</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {vaga.beneficios.map((codigo) => (
                    <View key={codigo} style={rsStyles.beneficioChip}>
                      <Text style={rsStyles.beneficioChipText}>{rsBeneficioLabel(codigo)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {activeTab === 'candidatos' ? (
          <>
            <View style={rsStyles.chartCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                  <Text style={rsStyles.sectionTitle}>Perguntas da Triagem</Text>
                  <Text style={rsStyles.listRowMeta}>
                    Crie o roteiro que o assistente virtual envia por WhatsApp. As perguntas ficam vinculadas a esta vaga.
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  <Pressable style={[rsStyles.primaryButton, { paddingHorizontal: 12 }]} onPress={openTriagemModal}>
                    <Feather name={triagemRoteiro && triagemRoteiro.total_perguntas > 0 ? 'edit-2' : 'plus'} size={13} color="#FFFFFF" />
                    <Text style={rsStyles.primaryButtonText}>{triagemRoteiro && triagemRoteiro.total_perguntas > 0 ? 'Editar roteiro' : 'Criar perguntas'}</Text>
                  </Pressable>
                  {triagemRoteiro && triagemRoteiro.total_perguntas > 0 ? (
                    <Pressable style={[rsStyles.secondaryButton, { paddingHorizontal: 12 }]} onPress={() => setIsIniciarWaModalOpen(true)} disabled={isGerandoLinkTriagem}>
                      <Feather name="send" size={13} color="#1F3A5F" />
                      <Text style={rsStyles.secondaryButtonText}>{isGerandoLinkTriagem ? 'Gerando...' : 'Iniciar no WhatsApp'}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              {!triagemRoteiro || triagemRoteiro.total_perguntas === 0 ? (
                <Pressable style={[rsStyles.secondaryButton, { marginTop: 10, alignSelf: 'flex-start' }]} onPress={handleUsarFluxoPadrao}>
                  <Feather name="zap" size={13} color="#1F3A5F" />
                  <Text style={rsStyles.secondaryButtonText}>Usar fluxo padrão do posto</Text>
                </Pressable>
              ) : null}

              {isLoadingRoteiro ? (
                <ActivityIndicator color="#1F3A5F" style={{ marginTop: 12 }} />
              ) : !triagemRoteiro || triagemRoteiro.total_perguntas === 0 ? (
                <Text style={[rsStyles.listRowMeta, { marginTop: 10 }]}>Nenhum roteiro criado ainda para esta vaga.</Text>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={rsStyles.countLabel}>{triagemRoteiro.total_perguntas} pergunta(s) no roteiro desta vaga</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={rsStyles.listRowMeta}>Automação ativa</Text>
                      <ToggleSwitch value={triagemRoteiro.triagem_wa_ativa} onValueChange={handleToggleAutomacaoTriagem} />
                    </View>
                  </View>

                  {triagemRoteiro.triagem_msg_abertura ? (
                    <View style={rsStyles.roteiroMsgBubble}>
                      <Text style={rsStyles.roteiroMsgLabel}>BOAS-VINDAS</Text>
                      <Text style={rsStyles.roteiroMsgText}>{triagemRoteiro.triagem_msg_abertura}</Text>
                    </View>
                  ) : null}

                  {triagemRoteiro.perguntas
                    .slice()
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((p) => (
                      <View key={p.ordem} style={rsStyles.roteiroQuestionCard}>
                        <Text style={rsStyles.roteiroQuestionText}>
                          {p.ordem}. {p.texto}
                        </Text>
                        {p.opcoes.map((op, idx) => (
                          <Text key={idx} style={rsStyles.roteiroOptionText}>
                            {idx + 1}. {op}
                          </Text>
                        ))}
                      </View>
                    ))}

                  {triagemRoteiro.triagem_msg_encerramento ? (
                    <View style={rsStyles.roteiroMsgBubble}>
                      <Text style={rsStyles.roteiroMsgLabel}>ENCERRAMENTO</Text>
                      <Text style={rsStyles.roteiroMsgText}>{triagemRoteiro.triagem_msg_encerramento}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <RsSearchInput value={buscaCandidato} onChangeText={setBuscaCandidato} placeholder="Buscar por nome, profissão, cidade..." />
              </View>
              <Pressable style={[rsStyles.primaryButton, { paddingHorizontal: 12 }]} onPress={openAddCandidatos}>
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={rsStyles.primaryButtonText}>Adicionar</Text>
              </Pressable>
            </View>
            <Text style={[rsStyles.countLabel, { marginTop: 10, marginBottom: 10 }]}>{candidatosFiltrados.length} candidato(s)</Text>
            {candidatosFiltrados.length === 0 ? (
              <RsEmptyState message="Nenhum candidato vinculado a essa vaga ainda." />
            ) : (
              candidatosFiltrados.map((a) => {
                const meta = rsEstagioMeta(a.estagio);
                return (
                  <View key={a.id} style={rsStyles.dreCard}>
                    <Pressable onPress={() => setSelectedAplicacao(a)}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                            {a.candidato.nome_completo}
                          </Text>
                          <Text style={rsStyles.listRowMeta}>
                            {a.candidato.codigo ?? '—'} · {[a.candidato.cidade, a.candidato.estado].filter(Boolean).join('/') || '—'}
                          </Text>
                        </View>
                        <RsBadge label={meta.label} color={meta.color} bg="#F1F2F6" />
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
                        <Text style={rsStyles.listRowMeta}>Match: {a.match_score != null ? `${a.match_score}%` : '—'}</Text>
                        {a.candidato.whatsapp ? <Text style={rsStyles.listRowMeta}>· {a.candidato.whatsapp}</Text> : null}
                      </View>
                    </Pressable>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                      <Pressable style={rsStyles.rowMenuButton} onPress={() => setCandidatoMenuAplicacao(a)} hitSlop={8}>
                        <Feather name="more-vertical" size={18} color="#5E667D" />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : null}

        {activeTab === 'funil' ? (
          <>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={rsStyles.funilStatCard}>
                <Text style={rsStyles.funilStatLabel}>CANDIDATOS</Text>
                <Text style={rsStyles.funilStatValue}>{formatNumeroBR(totalAplicacoes)}</Text>
              </View>
              <View style={rsStyles.funilStatCard}>
                <Text style={rsStyles.funilStatLabel}>CONTRATADOS</Text>
                <Text style={rsStyles.funilStatValue}>{formatNumeroBR(contratados)}</Text>
                <Text style={rsStyles.funilStatSub}>{conversaoPct}% conversão</Text>
              </View>
              <View style={rsStyles.funilStatCard}>
                <Text style={rsStyles.funilStatLabel}>REPROVADOS</Text>
                <Text style={rsStyles.funilStatValue}>{formatNumeroBR(reprovados)}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {RS_FUNIL_FLOW.map((key) => {
                const meta = RS_ESTAGIO_META[key];
                const qtd = funilContagem[key] ?? 0;
                const pct = totalAplicacoes > 0 ? Math.round((qtd / totalAplicacoes) * 100) : 0;
                return (
                  <View key={key} style={[rsStyles.funilFlowCard, { backgroundColor: `${meta.color}1A` }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Feather name={meta.icon} size={12} color={meta.color} />
                      <Text style={[rsStyles.funilFlowLabel, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <Text style={rsStyles.funilFlowValue}>{qtd}</Text>
                    <Text style={rsStyles.funilFlowPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {RS_FUNIL_FLOW.filter((key) => (funilContagem[key] ?? 0) > 0).map((key) => {
                const meta = RS_ESTAGIO_META[key];
                const qtd = funilContagem[key] ?? 0;
                const pct = totalAplicacoes > 0 ? Math.round((qtd / totalAplicacoes) * 100) : 0;
                const nomes = aplicacoes.filter((a) => ((a.estagio ?? 'novo').toLowerCase() || 'novo') === key);
                return (
                  <View
                    key={key}
                    style={[rsStyles.funilStageCard, { flexBasis: '47%', flexGrow: 1, backgroundColor: `${meta.color}14`, borderLeftWidth: 3, borderLeftColor: meta.color }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name={meta.icon} size={13} color={meta.color} />
                      <Text style={[rsStyles.funilStageTitle, { color: meta.color }]}>
                        {meta.label} · {qtd}
                      </Text>
                    </View>
                    <Text style={rsStyles.funilStageSub}>{pct}% do total</Text>
                    <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator>
                      {nomes.map((a) => (
                        <Text key={a.id} style={rsStyles.funilStageName} numberOfLines={1}>
                          {a.candidato.nome_completo}
                        </Text>
                      ))}
                    </ScrollView>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      <RsModal visible={isAddCandidatosOpen} title="Adicionar candidatos à vaga" onClose={() => setIsAddCandidatosOpen(false)}>
        <Text style={[rsStyles.listRowMeta, { marginBottom: 10 }]}>{vaga.titulo}</Text>
        <RsFormLabel>Buscar</RsFormLabel>
        <RsTextInput value={addBusca} onChangeText={setAddBusca} placeholder="Nome, profissão..." />
        {/* zIndex sobe quando um dos 2 dropdowns está aberto — sem isso as
            opções renderizam POR BAIXO do que vem depois (Bairro/Cidade,
            Observação, lista de candidatos), porque essa linha é irmã
            deles no mesmo nível de empilhamento. */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, zIndex: isAddTipoVagaOpen || isAddEstagioOpen ? 200 : 1 }}>
          <View style={{ flex: 1 }}>
            <RsFormLabel>Tipo de vaga</RsFormLabel>
            <RsFieldDropdown
              label={addTipoVaga || 'Qualquer'}
              options={[{ value: null as string | null, label: 'Qualquer' }, ...addTipoVagaOptions.map((t) => ({ value: t as string | null, label: t }))]}
              selectedValue={addTipoVaga || null}
              isOpen={isAddTipoVagaOpen}
              onToggle={() => setIsAddTipoVagaOpen((o) => !o)}
              onSelect={(v) => {
                setAddTipoVaga(v ?? '');
                setIsAddTipoVagaOpen(false);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <RsFormLabel>Estágio inicial</RsFormLabel>
            <RsFieldDropdown
              label={rsEstagioMeta(addEstagioInicial).label}
              options={Object.keys(RS_ESTAGIO_META).map((k) => ({ value: k, label: RS_ESTAGIO_META[k].label }))}
              selectedValue={addEstagioInicial}
              isOpen={isAddEstagioOpen}
              onToggle={() => setIsAddEstagioOpen((o) => !o)}
              onSelect={(v) => {
                setAddEstagioInicial(v ?? 'novo');
                setIsAddEstagioOpen(false);
              }}
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <RsFormLabel>Bairro</RsFormLabel>
            <RsTextInput value={addBairro} onChangeText={setAddBairro} placeholder="Bairro" />
          </View>
          <View style={{ flex: 1 }}>
            <RsFormLabel>Cidade</RsFormLabel>
            <RsTextInput value={addCidade} onChangeText={setAddCidade} placeholder="Cidade" />
          </View>
          <View style={{ width: 70 }}>
            <RsFormLabel>UF</RsFormLabel>
            <RsTextInput value={addUf} onChangeText={setAddUf} placeholder="UF" maxLength={2} autoCapitalize="characters" />
          </View>
        </View>

        <RsFormLabel>Observação (opcional)</RsFormLabel>
        <RsTextInput value={addObservacao} onChangeText={setAddObservacao} placeholder="Observação interna" multiline />

        <Text style={[rsStyles.countLabel, { marginTop: 12, marginBottom: 8 }]}>
          {isLoadingAddPool ? 'Carregando...' : `${addElegiveis.length} candidato(s) elegível(is)`}
        </Text>
        <View style={{ maxHeight: 320 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {addElegiveis.map((c) => {
              const selecionado = addSelecionados.includes(c.id);
              const analisado = !!c.ia_analise;
              return (
                <Pressable
                  key={c.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F2F6' }}
                  onPress={() => toggleAddSelecionado(c.id)}
                >
                  <Feather name={selecionado ? 'check-square' : 'square'} size={18} color={selecionado ? '#1F3A5F' : '#9AA1B5'} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                      {c.nome_completo}
                    </Text>
                    <Text style={rsStyles.listRowMeta} numberOfLines={1}>
                      {c.profissao ?? '—'} · {[c.cidade, c.estado].filter(Boolean).join('/') || '—'}
                    </Text>
                  </View>
                  {analisado ? <RsBadge label="analisado" color="#1F3A5F" bg="#E8EEF6" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 }}>
          <Pressable style={[rsStyles.secondaryButton, { flex: 1, justifyContent: 'center' }]} onPress={() => setIsAddCandidatosOpen(false)}>
            <Text style={rsStyles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[rsStyles.primaryButton, { flex: 1, justifyContent: 'center' }]}
            onPress={handleConfirmarAddCandidatos}
            disabled={isSavingAdd || addSelecionados.length === 0}
          >
            {isSavingAdd ? <ActivityIndicator color="#FFFFFF" /> : <Text style={rsStyles.primaryButtonText}>Adicionar à vaga ({addSelecionados.length})</Text>}
          </Pressable>
        </View>
      </RsModal>

      <RsCandidatoAplicacaoModal
        resumo={selectedAplicacao}
        vagaId={vaga.id}
        vagaTitulo={vaga.titulo}
        onClose={() => setSelectedAplicacao(null)}
      />

      <RsCandidatoRowActionsMenuModal
        aplicacao={candidatoMenuAplicacao}
        onClose={() => setCandidatoMenuAplicacao(null)}
        onVisualizar={() => {
          const a = candidatoMenuAplicacao;
          setCandidatoMenuAplicacao(null);
          if (a) setSelectedAplicacao(a);
        }}
        onCalcularMatch={() => {
          const a = candidatoMenuAplicacao;
          setCandidatoMenuAplicacao(null);
          if (a) handleCalcularMatch(a);
        }}
        onEnviarProva={() => {
          const a = candidatoMenuAplicacao;
          setCandidatoMenuAplicacao(null);
          if (a) handleEnviarProva(a);
        }}
        onContratar={() => {
          const a = candidatoMenuAplicacao;
          setCandidatoMenuAplicacao(null);
          if (a) handleContratar(a);
        }}
        onConvidarWhatsapp={() => {
          const a = candidatoMenuAplicacao;
          setCandidatoMenuAplicacao(null);
          if (a) handleConvidarWhatsapp(a);
        }}
        onExcluir={() => {
          const a = candidatoMenuAplicacao;
          setCandidatoMenuAplicacao(null);
          if (a) handleExcluirCandidato(a);
        }}
      />

      <RsTriagemRoteiroModal
        visible={isTriagemModalOpen}
        abertura={triagemAbertura}
        setAbertura={setTriagemAbertura}
        encerramento={triagemEncerramento}
        setEncerramento={setTriagemEncerramento}
        perguntas={triagemPerguntas}
        setPerguntas={setTriagemPerguntas}
        salvarComoTemplate={triagemComoTemplate}
        setSalvarComoTemplate={setTriagemComoTemplate}
        isSaving={isSavingTriagem}
        onCancel={() => setIsTriagemModalOpen(false)}
        onSave={handleSaveTriagem}
      />

      <RsModal visible={isIniciarWaModalOpen} title="Iniciar no WhatsApp" onClose={() => setIsIniciarWaModalOpen(false)}>
        <Text style={[rsStyles.listRowMeta, { marginBottom: 12 }]}>Escolha o candidato para enviar o roteiro de triagem por WhatsApp.</Text>
        {(vaga?.aplicacoes ?? []).length === 0 ? (
          <RsEmptyState message="Nenhum candidato aplicado nesta vaga ainda." />
        ) : (
          (vaga?.aplicacoes ?? []).map((a) => (
            <Pressable key={a.id} style={rsStyles.dreCard} onPress={() => handleIniciarNoWhatsApp(a.candidato)}>
              <Text style={rsStyles.listRowTitle}>{a.candidato.nome_completo}</Text>
              <Text style={rsStyles.listRowMeta}>{a.candidato.whatsapp || 'Sem WhatsApp cadastrado'}</Text>
            </Pressable>
          ))
        )}
        <View style={{ height: 16 }} />
      </RsModal>

      <RsModal visible={isEditOpen} title="Editar Vaga" onClose={() => setIsEditOpen(false)}>
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {(
            [
              { step: 1 as const, label: 'Dados básicos' },
              { step: 2 as const, label: 'Detalhes' },
              { step: 3 as const, label: 'Benefícios' },
              { step: 4 as const, label: 'Publicação' },
            ]
          ).map((item) => {
            const active = editStep === item.step;
            return (
              <Pressable
                key={item.step}
                style={{ flex: 1, borderBottomWidth: 2, borderBottomColor: active ? '#E6213D' : '#E2E6F0', paddingBottom: 8, alignItems: 'center' }}
                onPress={() => goToEditStep(item.step)}
              >
                <Text style={{ fontSize: 10, color: active ? '#E6213D' : '#9AA1B5', fontWeight: '700' }}>Etapa {item.step}</Text>
                <Text
                  style={{ fontSize: 11, color: active ? '#E6213D' : '#9AA1B5', fontWeight: '800', marginTop: 2 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {editStep === 1 ? (
          <>
            <RsFormLabel>Empresa</RsFormLabel>
            <View style={[rsStyles.textInput, { justifyContent: 'center' }]}>
              <Text style={{ fontSize: 14, color: '#7C8397' }} numberOfLines={1}>
                {vaga.empresa?.razao_social ?? vaga.empresa?.nome_fantasia ?? vaga.empresa_nome ?? '—'}
              </Text>
            </View>
            <RsFormLabel>Título*</RsFormLabel>
            <RsTextInput value={formTitulo} onChangeText={setFormTitulo} placeholder="Ex.: Frentista" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Cidade</RsFormLabel>
                <RsTextInput value={formCidade} onChangeText={setFormCidade} placeholder="Cidade" />
              </View>
              <View style={{ width: 80 }}>
                <RsFormLabel>UF</RsFormLabel>
                <RsTextInput value={formUf} onChangeText={setFormUf} placeholder="UF" maxLength={2} autoCapitalize="characters" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, zIndex: isFormModalidadeOpen || isFormSenioridadeOpen ? 200 : 1 }}>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Modalidade</RsFormLabel>
                <RsFieldDropdown
                  label={formModalidade ? rsCapitalize(formModalidade) : 'Selecionar'}
                  options={RS_MODALIDADE_OPTIONS.map((v) => ({ value: v as string | null, label: rsCapitalize(v) }))}
                  selectedValue={formModalidade || null}
                  isOpen={isFormModalidadeOpen}
                  onToggle={() => setIsFormModalidadeOpen((o) => !o)}
                  onSelect={(v) => {
                    setFormModalidade(v ?? '');
                    setIsFormModalidadeOpen(false);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Senioridade</RsFormLabel>
                <RsFieldDropdown
                  label={formSenioridade ? rsCapitalize(formSenioridade) : 'Selecionar'}
                  options={RS_SENIORIDADE_OPTIONS.map((v) => ({ value: v as string | null, label: rsCapitalize(v) }))}
                  selectedValue={formSenioridade || null}
                  isOpen={isFormSenioridadeOpen}
                  onToggle={() => setIsFormSenioridadeOpen((o) => !o)}
                  onSelect={(v) => {
                    setFormSenioridade(v ?? '');
                    setIsFormSenioridadeOpen(false);
                  }}
                />
              </View>
            </View>
          </>
        ) : null}

        {editStep === 2 ? (
          <>
            <RsFormLabel>Descrição</RsFormLabel>
            <RsTextInput
              value={formDescricao}
              onChangeText={setFormDescricao}
              placeholder="Descrição da vaga"
              multiline
              style={{ minHeight: 90, textAlignVertical: 'top' }}
            />
            <RsFormLabel>Requisitos</RsFormLabel>
            <RsTextInput
              value={formRequisitos}
              onChangeText={setFormRequisitos}
              placeholder="Perfil desejado"
              multiline
              style={{ minHeight: 90, textAlignVertical: 'top' }}
            />
            <RsFormLabel>Faixa salarial</RsFormLabel>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={rsStyles.faixaSalarialSubLabel}>De</Text>
                <RsTextInput
                  value={rsMaskMoeda(formFaixaMinDigits)}
                  onChangeText={(t) => setFormFaixaMinDigits(t.replace(/\D/g, ''))}
                  placeholder="R$ 0,00"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={rsStyles.faixaSalarialSubLabel}>Até</Text>
                <RsTextInput
                  value={rsMaskMoeda(formFaixaMaxDigits)}
                  onChangeText={(t) => setFormFaixaMaxDigits(t.replace(/\D/g, ''))}
                  placeholder="R$ 0,00"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <RsFormLabel>Nº de vagas</RsFormLabel>
            <RsTextInput value={formNumVagas} onChangeText={setFormNumVagas} placeholder="1" keyboardType="number-pad" />
          </>
        ) : null}

        {editStep === 3 ? (
          <>
            <RsFormLabel>Benefícios</RsFormLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {RS_BENEFICIO_OPTIONS.map((opt) => {
                const checked = formBeneficios.includes(opt.code);
                return (
                  <Pressable
                    key={opt.code}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '46%' }}
                    onPress={() => toggleFormBeneficio(opt.code)}
                  >
                    <Feather name={checked ? 'check-square' : 'square'} size={16} color={checked ? '#1F3A5F' : '#9AA1B5'} />
                    <Text style={{ fontSize: 12.5, color: '#15203E', flexShrink: 1 }}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <RsFormLabel>Outros benefícios</RsFormLabel>
            <RsTextInput
              value={formBeneficiosOutros}
              onChangeText={setFormBeneficiosOutros}
              placeholder="Ex.: estacionamento, uniforme, participação em eventos..."
              multiline
            />
          </>
        ) : null}

        {editStep === 4 ? (
          <>
            <Text style={rsStyles.sectionTitle}>Exibição na divulgação</Text>
            <Text style={[rsStyles.listRowMeta, { marginBottom: 8 }]}>Controle o que aparece na vaga publicada (LP e link público).</Text>
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}
              onPress={() => setFormExibirEmpresa((v) => !v)}
            >
              <Feather name={formExibirEmpresa ? 'check-square' : 'square'} size={16} color={formExibirEmpresa ? '#1F3A5F' : '#9AA1B5'} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#15203E' }}>Exibir o estabelecimento (empresa)</Text>
                <Text style={rsStyles.listRowMeta}>Se desmarcado, a vaga não mostra a empresa.</Text>
              </View>
            </Pressable>
            <Pressable style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 }} onPress={() => setFormExibirSalario((v) => !v)}>
              <Feather name={formExibirSalario ? 'check-square' : 'square'} size={16} color={formExibirSalario ? '#1F3A5F' : '#9AA1B5'} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#15203E' }}>Exibir o valor do salário</Text>
                <Text style={rsStyles.listRowMeta}>Se desmarcado, a faixa salarial fica oculta.</Text>
              </View>
            </Pressable>

            <RsFormLabel>Status</RsFormLabel>
            <View style={{ zIndex: isFormStatusOpen ? 200 : 1 }}>
              <RsFieldDropdown
                label={vagaStatusMeta(formStatus).label}
                options={VAGA_STATUS_OPTIONS.map((o) => ({ value: o.value as string | null, label: o.label }))}
                selectedValue={formStatus}
                isOpen={isFormStatusOpen}
                onToggle={() => setIsFormStatusOpen((o) => !o)}
                onSelect={(v) => {
                  setFormStatus(v ?? 'aberta');
                  setIsFormStatusOpen(false);
                }}
              />
            </View>
            <Text style={[rsStyles.listRowMeta, { marginTop: 6, marginBottom: 14 }]}>Deixe em "aberta" para permitir a publicação na LP.</Text>

            <View style={[rsStyles.chartCard, { marginBottom: 14 }]}>
              <Text style={rsStyles.sectionTitle}>Revisão</Text>
              <Text style={rsStyles.listRowMeta}>Título: {formTitulo || '—'}</Text>
              <Text style={rsStyles.listRowMeta}>
                Empresa: {vaga.empresa?.razao_social ?? vaga.empresa?.nome_fantasia ?? vaga.empresa_nome ?? '—'}
              </Text>
              <Text style={rsStyles.listRowMeta}>Local: {[formCidade, formUf].filter(Boolean).join('/') || '—'}</Text>
              <Text style={rsStyles.listRowMeta}>Benefícios: {formBeneficios.length} selecionado(s)</Text>
            </View>
          </>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 16 }}>
          {editStep > 1 ? (
            <Pressable
              style={[rsStyles.secondaryButton, { flex: 1, justifyContent: 'center' }]}
              onPress={() => goToEditStep((editStep - 1) as 1 | 2 | 3 | 4)}
            >
              <Text style={rsStyles.secondaryButtonText}>Voltar</Text>
            </Pressable>
          ) : null}
          {editStep < 4 ? (
            <Pressable
              style={[rsStyles.primaryButton, { flex: 1, justifyContent: 'center' }]}
              onPress={() => goToEditStep((editStep + 1) as 1 | 2 | 3 | 4)}
            >
              <Text style={rsStyles.primaryButtonText}>Avançar</Text>
            </Pressable>
          ) : (
            <Pressable style={[rsStyles.primaryButton, { flex: 1, justifyContent: 'center' }]} onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={rsStyles.primaryButtonText}>Salvar vaga</Text>}
            </Pressable>
          )}
        </View>
      </RsModal>
    </SafeAreaView>
  );
}

// ============================================================
// 3. Candidatos (lista + detalhe)
// ============================================================

// Menu "..." de cada linha da lista — mesmas 4 ações do dropdown do painel
// web (Visualizar, Editar, Gerar link por etapa, Excluir). "Gerar link por
// etapa" não tem nenhum endpoint no backend ainda (só existe geração de link
// pra pendência de documento, que é outra coisa) — fica como aviso honesto.
function RsCandidatoRowMenuModal({
  candidato,
  onClose,
  onVisualizar,
  onEditar,
  onGerarLink,
  onExcluir,
}: {
  candidato: RecrutamentoCandidatoItem | null;
  onClose: () => void;
  onVisualizar: () => void;
  onEditar: () => void;
  onGerarLink: () => void;
  onExcluir: () => void;
}) {
  if (!candidato) return null;
  return (
    <Modal visible={candidato !== null} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={rsStyles.actionsMenuBackdrop} onPress={onClose}>
        <Pressable style={rsStyles.actionsMenuCard} onPress={() => {}}>
          <Text style={rsStyles.actionsMenuTitle} numberOfLines={1}>
            {candidato.nome_completo}
          </Text>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onVisualizar}>
            <Feather name="eye" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Visualizar</Text>
          </Pressable>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onEditar}>
            <Feather name="edit-2" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Editar</Text>
          </Pressable>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onGerarLink}>
            <Feather name="link" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Gerar link por etapa</Text>
          </Pressable>
          <Pressable style={[rsStyles.actionsMenuRow, rsStyles.actionsMenuRowLast]} onPress={onExcluir}>
            <Feather name="trash-2" size={16} color="#E6213D" />
            <Text style={[rsStyles.actionsMenuRowText, { color: '#E6213D' }]}>Excluir</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Escolha da etapa pra gerar o link — endpoint real confirmado pela
// Lovable (18/09/2026), cada etapa gera um link diferente.
const RS_LINK_ETAPA_OPCOES: Array<{
  value: 'cadastro' | 'perguntas' | 'disc' | 'admissao';
  label: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}> = [
  { value: 'cadastro', label: 'Cadastro inicial', subtitle: 'Formulário completo do Trabalhe Conosco', icon: 'user-plus', color: '#3B82F6' },
  { value: 'perguntas', label: 'Perguntas da vaga', subtitle: 'Triagem específica configurada na vaga', icon: 'message-circle', color: '#8B5CF6' },
  { value: 'disc', label: 'Prova / DISC', subtitle: 'Avaliação de conhecimento ou perfil comportamental', icon: 'headphones', color: '#F59E0B' },
  { value: 'admissao', label: 'Admissão', subtitle: 'Dados e documentos para contratação', icon: 'file-text', color: '#18955A' },
];
function RsLinkEtapaMenuModal({
  candidato,
  onClose,
  onSelect,
}: {
  candidato: RecrutamentoCandidatoItem | null;
  onClose: () => void;
  onSelect: (etapa: 'cadastro' | 'perguntas' | 'disc' | 'admissao') => void;
}) {
  return (
    <RsModal visible={!!candidato} title="Gerar link por etapa" onClose={onClose}>
      {candidato ? (
        <>
          <Text style={[rsStyles.listRowMeta, { marginBottom: 14 }]}>
            Escolha qual etapa do processo você quer enviar para <Text style={{ fontWeight: '800', color: '#15203E' }}>{candidato.nome_completo}</Text>.
          </Text>
          {RS_LINK_ETAPA_OPCOES.map((opt) => (
            <Pressable key={opt.value} style={[rsStyles.dreCard, { flexDirection: 'row', alignItems: 'center', gap: 12 }]} onPress={() => onSelect(opt.value)}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${opt.color}1A`, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={opt.icon} size={17} color={opt.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={rsStyles.listRowTitle}>{opt.label}</Text>
                <Text style={rsStyles.listRowMeta}>{opt.subtitle}</Text>
              </View>
            </Pressable>
          ))}
          <View style={{ height: 16 }} />
        </>
      ) : null}
    </RsModal>
  );
}

type RsCandidatoFormState = {
  nome_completo: string;
  profissao: string;
  email: string;
  whatsapp: string;
  telefone: string;
  cpf: string;
  genero: string;
  cidade: string;
  estado: string;
  bairro: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  disponibilidade: string;
  pretensao_salarial: string;
  linkedin: string;
  habilidades: string[];
  resumo: string;
  origem: string;
};

const RS_CANDIDATO_FORM_VAZIO: RsCandidatoFormState = {
  nome_completo: '',
  profissao: '',
  email: '',
  whatsapp: '',
  telefone: '',
  cpf: '',
  genero: '',
  cidade: '',
  estado: '',
  bairro: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  disponibilidade: '',
  pretensao_salarial: '',
  linkedin: '',
  habilidades: [],
  resumo: '',
  origem: '',
};

// Mesmos valores reais confirmados no dashboard (RS_SEXO_LABEL/RS_SEXO_COLOR,
// vindos de distrib_genero) — usa o mesmo enum aqui pra não inventar valor
// novo que o backend não reconheça.
const RS_GENERO_OPCOES: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'Selecione' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'nao_informado', label: 'Prefiro não informar' },
];

// Form único de criar/editar candidato — usado tanto pelo "+ Novo" da lista
// quanto pelo "Editar" do menu "...". Ao editar, quem chama já buscou o
// perfil completo (fetchRecrutamentoCandidato) antes de abrir, pra não
// arriscar mandar campo de endereço vazio por cima de um valor real que só
// não veio na listagem resumida.
function RsCandidatoFormModal({
  visible,
  initial,
  isSaving,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: RsCandidatoFormState;
  isSaving: boolean;
  onClose: () => void;
  onSave: (form: RsCandidatoFormState) => void;
}) {
  const [form, setForm] = useState<RsCandidatoFormState>(initial);

  useEffect(() => {
    if (visible) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initial]);

  const [isGeneroOpen, setIsGeneroOpen] = useState(false);
  const [novaHabilidade, setNovaHabilidade] = useState('');

  const set = <K extends keyof RsCandidatoFormState>(key: K) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const addHabilidade = () => {
    const valor = novaHabilidade.trim();
    if (!valor) return;
    setForm((prev) => (prev.habilidades.includes(valor) ? prev : { ...prev, habilidades: [...prev.habilidades, valor] }));
    setNovaHabilidade('');
  };
  const removeHabilidade = (valor: string) => {
    setForm((prev) => ({ ...prev, habilidades: prev.habilidades.filter((h) => h !== valor) }));
  };

  return (
    <RsModal visible={visible} title={initial.nome_completo ? 'Editar candidato' : 'Novo candidato'} onClose={onClose}>
      <Text style={[rsStyles.sectionTitle, { marginTop: 4 }]}>Dados pessoais</Text>
      <RsFormLabel>Nome completo*</RsFormLabel>
      <RsTextInput value={form.nome_completo} onChangeText={set('nome_completo')} placeholder="Nome completo" />
      <View style={{ flexDirection: 'row', gap: 10, zIndex: isGeneroOpen ? 200 : 1 }}>
        <View style={{ flex: 1 }}>
          <RsFormLabel>CPF</RsFormLabel>
          <RsTextInput value={form.cpf} onChangeText={set('cpf')} placeholder="000.000.000-00" />
        </View>
        <View style={{ flex: 1 }}>
          <RsFormLabel>Gênero</RsFormLabel>
          <RsFieldDropdown
            label={RS_GENERO_OPCOES.find((o) => o.value === (form.genero || null))?.label ?? 'Selecione'}
            options={RS_GENERO_OPCOES}
            selectedValue={form.genero || null}
            isOpen={isGeneroOpen}
            onToggle={() => setIsGeneroOpen((o) => !o)}
            onSelect={(v) => {
              setForm((prev) => ({ ...prev, genero: v ?? '' }));
              setIsGeneroOpen(false);
            }}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <RsFormLabel>WhatsApp</RsFormLabel>
          <RsTextInput value={form.whatsapp} onChangeText={set('whatsapp')} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <RsFormLabel>Telefone</RsFormLabel>
          <RsTextInput value={form.telefone} onChangeText={set('telefone')} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
        </View>
      </View>
      <RsFormLabel>E-mail</RsFormLabel>
      <RsTextInput value={form.email} onChangeText={set('email')} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />

      <Text style={[rsStyles.sectionTitle, { marginTop: 14 }]}>Endereço</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <RsFormLabel>Bairro</RsFormLabel>
          <RsTextInput value={form.bairro} onChangeText={set('bairro')} placeholder="Bairro" />
        </View>
        <View style={{ flex: 1 }}>
          <RsFormLabel>Cidade</RsFormLabel>
          <RsTextInput value={form.cidade} onChangeText={set('cidade')} placeholder="Cidade" />
        </View>
        <View style={{ width: 70 }}>
          <RsFormLabel>UF</RsFormLabel>
          <RsTextInput value={form.estado} onChangeText={set('estado')} placeholder="UF" maxLength={2} autoCapitalize="characters" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <RsFormLabel>Logradouro</RsFormLabel>
          <RsTextInput value={form.logradouro} onChangeText={set('logradouro')} placeholder="Rua / avenida" />
        </View>
        <View style={{ width: 90 }}>
          <RsFormLabel>Número</RsFormLabel>
          <RsTextInput value={form.numero} onChangeText={set('numero')} placeholder="Nº" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <RsFormLabel>Complemento</RsFormLabel>
          <RsTextInput value={form.complemento} onChangeText={set('complemento')} placeholder="Complemento" />
        </View>
        <View style={{ width: 120 }}>
          <RsFormLabel>CEP</RsFormLabel>
          <RsTextInput value={form.cep} onChangeText={set('cep')} placeholder="00000-000" />
        </View>
      </View>

      <Text style={[rsStyles.sectionTitle, { marginTop: 14 }]}>Mais sobre o candidato</Text>
      <RsFormLabel>Profissão / tipo de vaga</RsFormLabel>
      <RsTextInput value={form.profissao} onChangeText={set('profissao')} placeholder="Ex.: Frentista" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <RsFormLabel>Disponibilidade</RsFormLabel>
          <RsTextInput value={form.disponibilidade} onChangeText={set('disponibilidade')} placeholder="Ex.: imediata" />
        </View>
        <View style={{ flex: 1 }}>
          <RsFormLabel>Pretensão salarial</RsFormLabel>
          <RsTextInput value={form.pretensao_salarial} onChangeText={set('pretensao_salarial')} placeholder="R$ 0,00" />
        </View>
      </View>
      <RsFormLabel>LinkedIn</RsFormLabel>
      <RsTextInput value={form.linkedin} onChangeText={set('linkedin')} placeholder="https://linkedin.com/in/..." autoCapitalize="none" />

      <RsFormLabel>Habilidades</RsFormLabel>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <RsTextInput
          value={novaHabilidade}
          onChangeText={setNovaHabilidade}
          placeholder="Digite e toque em + para adicionar"
          style={{ flex: 1 }}
          onSubmitEditing={addHabilidade}
          returnKeyType="done"
        />
        <Pressable style={{ padding: 8 }} onPress={addHabilidade}>
          <Feather name="plus-circle" size={22} color="#1F3A5F" />
        </Pressable>
      </View>
      {form.habilidades.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {form.habilidades.map((h) => (
            <Pressable
              key={h}
              onPress={() => removeHabilidade(h)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF1F8', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F3A5F' }}>{h}</Text>
              <Feather name="x" size={12} color="#5E667D" />
            </Pressable>
          ))}
        </View>
      ) : null}

      <RsFormLabel>Resumo</RsFormLabel>
      <RsTextInput
        value={form.resumo}
        onChangeText={(v) => setForm((prev) => ({ ...prev, resumo: v.slice(0, 500) }))}
        placeholder="Breve resumo sobre o candidato"
        multiline
        numberOfLines={4}
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />
      <Text style={{ fontSize: 11, color: '#8992A8', marginTop: 2, textAlign: 'right' }}>{form.resumo.length}/500</Text>

      <RsFormLabel>Origem</RsFormLabel>
      <RsTextInput value={form.origem} onChangeText={set('origem')} placeholder="Ex.: whatsapp, indicação..." />

      {/* Referência profissional (nome/telefone) — o painel web mostra esse
          bloco, mas nenhum endpoint confirmado ainda devolve/aceita esses
          campos pro candidato (perguntado à Lovable). Fica de fora até a
          confirmação, pra não mandar campo que pode ser ignorado ou dar erro. */}

      <Pressable
        style={[rsStyles.primaryButton, { justifyContent: 'center', marginTop: 16, marginBottom: 16 }]}
        onPress={() => onSave(form)}
        disabled={isSaving}
      >
        {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={rsStyles.primaryButtonText}>Salvar</Text>}
      </Pressable>
    </RsModal>
  );
}

// "Sugestão IA" — pede pra escolher a vaga (a IA sugere candidatos PRA uma
// vaga específica, não em geral) e mostra o resultado real do endpoint.
function RsSugestaoIaModal({ visible, onClose, navigation }: { visible: boolean; onClose: () => void; navigation: ScreenProps<'RecrutamentoCandidatos'>['navigation'] }) {
  const [vagas, setVagas] = useState<RecrutamentoVaga[]>([]);
  const [isLoadingVagas, setIsLoadingVagas] = useState(false);
  const [vagaId, setVagaId] = useState<string | null>(null);
  const [isVagaOpen, setIsVagaOpen] = useState(false);
  const [isLoadingSugestao, setIsLoadingSugestao] = useState(false);
  const [sugestoes, setSugestoes] = useState<RecrutamentoCandidatoItem[] | null>(null);

  useEffect(() => {
    if (!visible) return;
    setVagaId(null);
    setSugestoes(null);
    setIsLoadingVagas(true);
    fetchRecrutamentoVagas({ status: 'aberta' })
      .then(setVagas)
      .catch(() => setVagas([]))
      .finally(() => setIsLoadingVagas(false));
  }, [visible]);

  const handleBuscar = () => {
    if (!vagaId) return;
    setIsLoadingSugestao(true);
    fetchRecrutamentoSugestaoIa(vagaId)
      .then(setSugestoes)
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível buscar a sugestão da IA.')))
      .finally(() => setIsLoadingSugestao(false));
  };

  return (
    <RsModal visible={visible} title="Sugestão IA" onClose={onClose}>
      <RsFormLabel>Vaga</RsFormLabel>
      {isLoadingVagas ? (
        <ActivityIndicator color="#1F3A5F" style={{ marginVertical: 10 }} />
      ) : (
        // minHeight fixo — esse modal é bottom-sheet e some conteúdo (só o
        // campo + botão antes de buscar), então sem isso o card fica baixo
        // na tela e a lista do dropdown abre quase fora da tela, cortada.
        <View style={{ zIndex: isVagaOpen ? 200 : 1, minHeight: isVagaOpen ? 270 : 0 }}>
          <RsFieldDropdown
            label={vagaId ? vagas.find((v) => v.id === vagaId)?.titulo ?? 'Selecionar vaga' : 'Selecionar vaga'}
            options={vagas.map((v) => ({ value: v.id as string | null, label: v.titulo }))}
            selectedValue={vagaId}
            isOpen={isVagaOpen}
            onToggle={() => setIsVagaOpen((o) => !o)}
            onSelect={(v) => {
              setVagaId(v);
              setIsVagaOpen(false);
            }}
          />
        </View>
      )}
      <Pressable style={[rsStyles.primaryButton, { justifyContent: 'center', marginTop: 12, marginBottom: 12 }]} onPress={handleBuscar} disabled={!vagaId || isLoadingSugestao}>
        {isLoadingSugestao ? <ActivityIndicator color="#FFFFFF" /> : <Text style={rsStyles.primaryButtonText}>Buscar sugestão</Text>}
      </Pressable>

      {sugestoes ? (
        sugestoes.length === 0 ? (
          <RsEmptyState message="Nenhum candidato sugerido pela IA pra essa vaga." />
        ) : (
          <View style={{ marginBottom: 16 }}>
            <Text style={[rsStyles.countLabel, { marginBottom: 8 }]}>{sugestoes.length} candidato(s) sugerido(s)</Text>
            {sugestoes.map((c) => (
              <Pressable
                key={c.id}
                style={rsStyles.dreCard}
                onPress={() => {
                  onClose();
                  navigation.navigate('RecrutamentoCandidatoDetalhe', { id: c.id });
                }}
              >
                <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                  {c.nome_completo}
                </Text>
                <Text style={rsStyles.listRowMeta}>
                  {c.profissao ?? '—'} · {[c.cidade, c.estado].filter(Boolean).join('/') || '—'}
                </Text>
              </Pressable>
            ))}
          </View>
        )
      ) : null}
    </RsModal>
  );
}

export function RecrutamentoCandidatosScreen({ navigation }: ScreenProps<'RecrutamentoCandidatos'>) {
  const isFocused = useIsFocused();
  const [candidatos, setCandidatos] = useState<RecrutamentoCandidatoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [isFiltrosOpen, setIsFiltrosOpen] = useState(false);
  const [openFiltroDropdown, setOpenFiltroDropdown] = useState<string | null>(null);
  const [filtroProfissao, setFiltroProfissao] = useState('');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroBairro, setFiltroBairro] = useState('');
  const [filtroUf, setFiltroUf] = useState('');
  const [filtroDisponibilidade, setFiltroDisponibilidade] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('');
  const [filtroCurriculo, setFiltroCurriculo] = useState<'' | 'sim' | 'nao'>('');
  const [filtroIa, setFiltroIa] = useState<'' | 'sim' | 'nao'>('');
  const [filtroSalarioMinDigits, setFiltroSalarioMinDigits] = useState('');
  const [filtroSalarioMaxDigits, setFiltroSalarioMaxDigits] = useState('');
  const [filtroCadastradoDeDigits, setFiltroCadastradoDeDigits] = useState('');
  const [filtroCadastradoAteDigits, setFiltroCadastradoAteDigits] = useState('');
  const [alocadoFiltro, setAlocadoFiltro] = useState<'todos' | 'sim' | 'nao'>('todos');
  const [menuCandidato, setMenuCandidato] = useState<RecrutamentoCandidatoItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<RsCandidatoFormState>(RS_CANDIDATO_FORM_VAZIO);
  const [editingCandidatoId, setEditingCandidatoId] = useState<string | null>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [isSugestaoOpen, setIsSugestaoOpen] = useState(false);
  const [linkEtapaCandidato, setLinkEtapaCandidato] = useState<RecrutamentoCandidatoItem | null>(null);
  const [isNovoMenuOpen, setIsNovoMenuOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isAlocarVagaOpen, setIsAlocarVagaOpen] = useState(false);
  const [alocarVagas, setAlocarVagas] = useState<RecrutamentoVaga[]>([]);
  const [isLoadingAlocarVagas, setIsLoadingAlocarVagas] = useState(false);
  const [isEnviarProvaOpen, setIsEnviarProvaOpen] = useState(false);
  const [enviarProvaAvaliacoes, setEnviarProvaAvaliacoes] = useState<RecrutamentoAvaliacao[]>([]);
  const [isLoadingEnviarProva, setIsLoadingEnviarProva] = useState(false);

  // Pool sem filtro nenhum, buscado 1x — só serve pra montar as opções reais
  // dos dropdowns "Tipo de vaga"/"UF"/"Disponibilidade"/"Origem" (valores que
  // realmente existem na base, em vez de uma lista inventada por mim).
  const [filtroPool, setFiltroPool] = useState<RecrutamentoCandidatoItem[]>([]);
  useEffect(() => {
    fetchRecrutamentoCandidatos({}).then(setFiltroPool).catch(() => setFiltroPool([]));
  }, []);
  const distinctPoolValues = useCallback(
    (key: 'profissao' | 'estado' | 'disponibilidade' | 'origem') => {
      const set = new Set<string>();
      filtroPool.forEach((c) => {
        const v = c[key] as string | null | undefined;
        if (v) set.add(v);
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
    [filtroPool]
  );

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    const filtro: RecrutamentoCandidatoFiltro = {
      q: busca || undefined,
      profissao: filtroProfissao || undefined,
      cidade: filtroCidade || undefined,
      bairro: filtroBairro || undefined,
      uf: filtroUf || undefined,
      disponibilidade: filtroDisponibilidade || undefined,
      origem: filtroOrigem || undefined,
      dataDe: rsDataBRParaIso(filtroCadastradoDeDigits),
      dataAte: rsDataBRParaIso(filtroCadastradoAteDigits),
    };
    if (alocadoFiltro !== 'todos') filtro.alocado = alocadoFiltro === 'sim';
    fetchRecrutamentoCandidatos(filtro)
      .then(setCandidatos)
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar os candidatos.')))
      .finally(() => setIsLoading(false));
  }, [
    busca,
    filtroProfissao,
    filtroCidade,
    filtroBairro,
    filtroUf,
    filtroDisponibilidade,
    filtroOrigem,
    filtroCadastradoDeDigits,
    filtroCadastradoAteDigits,
    alocadoFiltro,
  ]);

  // "Currículo"/"Análise IA" (presença de arquivo/análise) e salário
  // mínimo/máximo não têm parâmetro de servidor confirmado — filtra em cima
  // do que já veio, e também garante a ordem alfabética pedida.
  const candidatosFiltrados = useMemo(() => {
    let lista = candidatos;
    if (filtroCurriculo === 'sim') lista = lista.filter((c) => !!c.curriculo_url);
    if (filtroCurriculo === 'nao') lista = lista.filter((c) => !c.curriculo_url);
    if (filtroIa === 'sim') lista = lista.filter((c) => !!c.ia_analise);
    if (filtroIa === 'nao') lista = lista.filter((c) => !c.ia_analise);
    const min = filtroSalarioMinDigits ? Number(filtroSalarioMinDigits) : null;
    const max = filtroSalarioMaxDigits ? Number(filtroSalarioMaxDigits) : null;
    if (min != null || max != null) {
      lista = lista.filter((c) => {
        const raw = (c.pretensao_salarial ?? '').replace(/\D/g, '');
        if (!raw) return false;
        const valor = Number(raw);
        if (min != null && valor < min) return false;
        if (max != null && valor > max) return false;
        return true;
      });
    }
    return [...lista].sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'));
  }, [candidatos, filtroCurriculo, filtroIa, filtroSalarioMinDigits, filtroSalarioMaxDigits]);

  useEffect(() => {
    if (!isFocused) return;
    load();
  }, [load, isFocused]);

  const toggleSelecionado = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  };
  const handleSelecionarTodosFiltro = () => {
    setSelectedIds(candidatosFiltrados.map((c) => c.id));
  };
  const handleLimparSelecao = () => setSelectedIds([]);

  const handleConsultarCpfBulk = () => {
    if (selectedIds.length === 0) return;
    Alert.alert('Consultar CPF/antecedentes', `Consultar ${selectedIds.length} candidato(s) selecionado(s)?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Consultar',
        onPress: () => {
          setIsBulkProcessing(true);
          Promise.allSettled(selectedIds.map((id) => consultarRecrutamentoPf({ candidato_id: id })))
            .then((results) => {
              const falhas = results.filter((r) => r.status === 'rejected').length;
              Alert.alert(
                'Consulta enviada',
                falhas > 0 ? `${selectedIds.length - falhas} de ${selectedIds.length} consultados com sucesso.` : `${selectedIds.length} candidato(s) consultado(s).`
              );
              setSelectedIds([]);
            })
            .finally(() => setIsBulkProcessing(false));
        },
      },
    ]);
  };

  const openAlocarVaga = () => {
    if (selectedIds.length === 0) return;
    setIsAlocarVagaOpen(true);
    setIsLoadingAlocarVagas(true);
    fetchRecrutamentoVagas({ status: 'aberta' })
      .then(setAlocarVagas)
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar as vagas.')))
      .finally(() => setIsLoadingAlocarVagas(false));
  };
  const handleAlocarVaga = (vagaId: string) => {
    setIsAlocarVagaOpen(false);
    setIsBulkProcessing(true);
    Promise.allSettled(selectedIds.map((id) => moverRecrutamentoCandidatoEtapa({ candidato_id: id, vaga_id: vagaId, etapa: 'novo' })))
      .then((results) => {
        const falhas = results.filter((r) => r.status === 'rejected').length;
        Alert.alert(
          'Alocação concluída',
          falhas > 0 ? `${selectedIds.length - falhas} de ${selectedIds.length} alocados com sucesso.` : `${selectedIds.length} candidato(s) alocado(s) na vaga.`
        );
        setSelectedIds([]);
        load();
      })
      .finally(() => setIsBulkProcessing(false));
  };

  const openEnviarProvaBulk = () => {
    if (selectedIds.length === 0) return;
    setIsEnviarProvaOpen(true);
    setIsLoadingEnviarProva(true);
    fetchRecrutamentoAvaliacoes()
      .then(setEnviarProvaAvaliacoes)
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar as avaliações.')))
      .finally(() => setIsLoadingEnviarProva(false));
  };
  const handleEnviarProvaBulk = (avaliacaoId: string) => {
    setIsEnviarProvaOpen(false);
    setIsBulkProcessing(true);
    enviarRecrutamentoAvaliacao({ avaliacao_id: avaliacaoId, candidato_ids: selectedIds })
      .then((res) => {
        Alert.alert('Enviado', `Avaliação enviada para ${res.envios.length} candidato(s).`);
        setSelectedIds([]);
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível enviar a avaliação.')))
      .finally(() => setIsBulkProcessing(false));
  };

  const openNovo = () => {
    setIsNovoMenuOpen(false);
    setEditingCandidatoId(null);
    setFormInitial(RS_CANDIDATO_FORM_VAZIO);
    setIsFormOpen(true);
  };

  // "Pré-cadastro via link" (gerar link público pra o próprio candidato se
  // cadastrar) aparece no painel web, mas nenhum endpoint de geração desse
  // link específico foi confirmado ainda pela Lovable — o "Gerar link por
  // etapa" existente é só pra candidato JÁ cadastrado, não serve pra criar
  // um novo do zero. Fica como aviso honesto até confirmarem o contrato.
  const openPreCadastroLink = () => {
    setIsNovoMenuOpen(false);
    Alert.alert(
      'Ainda não disponível',
      'A geração de link de pré-cadastro (pra o próprio candidato preencher os dados) depende de um endpoint que ainda não foi confirmado com a Lovable. Por enquanto, use "Cadastro completo".'
    );
  };

  // Busca o perfil completo antes de abrir o form de edição — a linha da
  // lista só traz um resumo (sem endereço completo), e usar só esse resumo
  // apagaria campos reais (cep/logradouro/número/complemento) que não vêm
  // nessa listagem.
  const openEditar = (c: RecrutamentoCandidatoItem) => {
    fetchRecrutamentoCandidato(c.id)
      .then(({ perfil }) => {
        setFormInitial({
          nome_completo: perfil.nome_completo ?? '',
          profissao: perfil.profissao ?? '',
          email: perfil.email ?? '',
          whatsapp: perfil.whatsapp ?? '',
          telefone: perfil.telefone ?? '',
          cpf: perfil.cpf ?? '',
          genero: perfil.genero ?? '',
          cidade: perfil.cidade ?? '',
          estado: perfil.estado ?? '',
          bairro: perfil.bairro ?? '',
          cep: perfil.cep ?? '',
          logradouro: perfil.logradouro ?? '',
          numero: perfil.numero ?? '',
          complemento: perfil.complemento ?? '',
          disponibilidade: perfil.disponibilidade ?? '',
          pretensao_salarial: perfil.pretensao_salarial ?? '',
          linkedin: perfil.linkedin ?? '',
          habilidades: perfil.habilidades ?? [],
          resumo: perfil.resumo ?? '',
          origem: perfil.origem ?? '',
        });
        setEditingCandidatoId(c.id);
        setIsFormOpen(true);
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar o candidato.')));
  };

  const handleSaveForm = (form: RsCandidatoFormState) => {
    if (!form.nome_completo.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome completo.');
      return;
    }
    setIsSavingForm(true);
    const body: Record<string, unknown> = {
      nome_completo: form.nome_completo.trim(),
      profissao: form.profissao.trim() || null,
      email: form.email.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      telefone: form.telefone.trim() || null,
      cpf: form.cpf.trim() || null,
      genero: form.genero.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.trim() || null,
      bairro: form.bairro.trim() || null,
      cep: form.cep.trim() || null,
      logradouro: form.logradouro.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      disponibilidade: form.disponibilidade.trim() || null,
      pretensao_salarial: form.pretensao_salarial.trim() || null,
      linkedin: form.linkedin.trim() || null,
      habilidades: form.habilidades,
      resumo: form.resumo.trim() || null,
      origem: form.origem.trim() || null,
    };
    const request = editingCandidatoId ? updateRecrutamentoCandidato(editingCandidatoId, body) : createRecrutamentoCandidato(body);
    request
      .then(() => {
        setIsFormOpen(false);
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar o candidato.')))
      .finally(() => setIsSavingForm(false));
  };

  const abrirLinkEtapa = (c: RecrutamentoCandidatoItem) => {
    setLinkEtapaCandidato(c);
  };

  const handleGerarLinkEtapa = (etapa: 'cadastro' | 'perguntas' | 'disc' | 'admissao') => {
    const c = linkEtapaCandidato;
    setLinkEtapaCandidato(null);
    if (!c) return;
    gerarRecrutamentoLinkEtapa({ etapa, candidato_id: c.id })
      .then((res) => {
        Alert.alert('Link gerado', res.link);
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível gerar o link.')));
  };

  const handleDelete = (c: RecrutamentoCandidatoItem) => {
    Alert.alert('Excluir candidato', `Tem certeza que deseja excluir "${c.nome_completo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteRecrutamentoCandidato(c.id)
            .then(() => load())
            .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir o candidato.')));
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
        <RsPageHeader icon="users" title="Candidatos" subtitle="Base de candidatos e etapas do processo." />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, position: 'relative', zIndex: isNovoMenuOpen ? 200 : 1 }}>
          <View style={{ flex: 1 }}>
            <Pressable style={[rsStyles.primaryButton, { justifyContent: 'center' }]} onPress={() => setIsNovoMenuOpen((o) => !o)}>
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={rsStyles.primaryButtonText}>Novo</Text>
              <Feather name={isNovoMenuOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#FFFFFF" />
            </Pressable>
            {isNovoMenuOpen ? (
              <View style={rsStyles.overlayDropdown}>
                <Pressable style={[rsStyles.overlayDropdownItem, { flexDirection: 'row', alignItems: 'center', gap: 10 }]} onPress={openNovo}>
                  <Feather name="user-plus" size={16} color="#1F3A5F" />
                  <View style={{ flex: 1 }}>
                    <Text style={rsStyles.overlayDropdownItemText}>Cadastro completo</Text>
                    <Text style={{ fontSize: 11, color: '#8992A8' }}>Preencher todos os dados agora</Text>
                  </View>
                </Pressable>
                <Pressable style={[rsStyles.overlayDropdownItem, { flexDirection: 'row', alignItems: 'center', gap: 10 }]} onPress={openPreCadastroLink}>
                  <Feather name="link" size={16} color="#1F3A5F" />
                  <View style={{ flex: 1 }}>
                    <Text style={rsStyles.overlayDropdownItemText}>Pré-cadastro via link</Text>
                    <Text style={{ fontSize: 11, color: '#8992A8' }}>Gerar link p/ candidato completar</Text>
                  </View>
                </Pressable>
              </View>
            ) : null}
          </View>
          <Pressable style={[rsStyles.secondaryButton, { flex: 1, justifyContent: 'center' }]} onPress={() => setIsSugestaoOpen(true)}>
            <Feather name="zap" size={14} color="#1F3A5F" />
            <Text style={rsStyles.secondaryButtonText}>Sugestão IA</Text>
          </Pressable>
        </View>

        <Pressable style={[rsStyles.secondaryButton, { alignSelf: 'flex-start', marginBottom: 10 }]} onPress={() => setIsFiltrosOpen((o) => !o)}>
          <Feather name={isFiltrosOpen ? 'chevron-up' : 'sliders'} size={13} color="#1F3A5F" />
          <Text style={rsStyles.secondaryButtonText}>Filtros avançados</Text>
        </Pressable>

        {isFiltrosOpen ? (
          <View style={[rsStyles.chartCard, { marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', gap: 10, zIndex: openFiltroDropdown === 'profissao' ? 200 : 1 }}>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Tipo de vaga</RsFormLabel>
                <RsFieldDropdown
                  label={filtroProfissao || 'Qualquer'}
                  options={[{ value: null as string | null, label: 'Qualquer' }, ...distinctPoolValues('profissao').map((v) => ({ value: v as string | null, label: v }))]}
                  selectedValue={filtroProfissao || null}
                  isOpen={openFiltroDropdown === 'profissao'}
                  onToggle={() => setOpenFiltroDropdown((cur) => (cur === 'profissao' ? null : 'profissao'))}
                  onSelect={(v) => {
                    setFiltroProfissao(v ?? '');
                    setOpenFiltroDropdown(null);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Bairro</RsFormLabel>
                <RsTextInput value={filtroBairro} onChangeText={setFiltroBairro} placeholder="Bairro" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, zIndex: openFiltroDropdown === 'uf' ? 200 : 1 }}>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Cidade</RsFormLabel>
                <RsTextInput value={filtroCidade} onChangeText={setFiltroCidade} placeholder="Cidade" />
              </View>
              <View style={{ flex: 1 }}>
                <RsFormLabel>UF</RsFormLabel>
                <RsFieldDropdown
                  label={filtroUf || 'Qualquer'}
                  options={[{ value: null as string | null, label: 'Qualquer' }, ...distinctPoolValues('estado').map((v) => ({ value: v as string | null, label: v }))]}
                  selectedValue={filtroUf || null}
                  isOpen={openFiltroDropdown === 'uf'}
                  onToggle={() => setOpenFiltroDropdown((cur) => (cur === 'uf' ? null : 'uf'))}
                  onSelect={(v) => {
                    setFiltroUf(v ?? '');
                    setOpenFiltroDropdown(null);
                  }}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, zIndex: openFiltroDropdown === 'disponibilidade' || openFiltroDropdown === 'origem' ? 200 : 1 }}>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Disponibilidade</RsFormLabel>
                <RsFieldDropdown
                  label={filtroDisponibilidade || 'Qualquer'}
                  options={[{ value: null as string | null, label: 'Qualquer' }, ...distinctPoolValues('disponibilidade').map((v) => ({ value: v as string | null, label: v }))]}
                  selectedValue={filtroDisponibilidade || null}
                  isOpen={openFiltroDropdown === 'disponibilidade'}
                  onToggle={() => setOpenFiltroDropdown((cur) => (cur === 'disponibilidade' ? null : 'disponibilidade'))}
                  onSelect={(v) => {
                    setFiltroDisponibilidade(v ?? '');
                    setOpenFiltroDropdown(null);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Origem</RsFormLabel>
                <RsFieldDropdown
                  label={filtroOrigem || 'Qualquer'}
                  options={[{ value: null as string | null, label: 'Qualquer' }, ...distinctPoolValues('origem').map((v) => ({ value: v as string | null, label: v }))]}
                  selectedValue={filtroOrigem || null}
                  isOpen={openFiltroDropdown === 'origem'}
                  onToggle={() => setOpenFiltroDropdown((cur) => (cur === 'origem' ? null : 'origem'))}
                  onSelect={(v) => {
                    setFiltroOrigem(v ?? '');
                    setOpenFiltroDropdown(null);
                  }}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, zIndex: openFiltroDropdown === 'curriculo' || openFiltroDropdown === 'ia' ? 200 : 1 }}>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Currículo</RsFormLabel>
                <RsFieldDropdown
                  label={filtroCurriculo === 'sim' ? 'Anexado' : filtroCurriculo === 'nao' ? 'Não anexado' : 'Qualquer'}
                  options={[
                    { value: '' as '' | 'sim' | 'nao', label: 'Qualquer' },
                    { value: 'sim', label: 'Anexado' },
                    { value: 'nao', label: 'Não anexado' },
                  ]}
                  selectedValue={filtroCurriculo}
                  isOpen={openFiltroDropdown === 'curriculo'}
                  onToggle={() => setOpenFiltroDropdown((cur) => (cur === 'curriculo' ? null : 'curriculo'))}
                  onSelect={(v) => {
                    setFiltroCurriculo(v);
                    setOpenFiltroDropdown(null);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Análise IA</RsFormLabel>
                <RsFieldDropdown
                  label={filtroIa === 'sim' ? 'Analisado' : filtroIa === 'nao' ? 'Pendente' : 'Qualquer'}
                  options={[
                    { value: '' as '' | 'sim' | 'nao', label: 'Qualquer' },
                    { value: 'sim', label: 'Analisado' },
                    { value: 'nao', label: 'Pendente' },
                  ]}
                  selectedValue={filtroIa}
                  isOpen={openFiltroDropdown === 'ia'}
                  onToggle={() => setOpenFiltroDropdown((cur) => (cur === 'ia' ? null : 'ia'))}
                  onSelect={(v) => {
                    setFiltroIa(v);
                    setOpenFiltroDropdown(null);
                  }}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Salário mínimo (R$)</RsFormLabel>
                <RsTextInput
                  value={rsMaskMoeda(filtroSalarioMinDigits)}
                  onChangeText={(t) => setFiltroSalarioMinDigits(t.replace(/\D/g, ''))}
                  placeholder="R$ 0,00"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Salário máximo (R$)</RsFormLabel>
                <RsTextInput
                  value={rsMaskMoeda(filtroSalarioMaxDigits)}
                  onChangeText={(t) => setFiltroSalarioMaxDigits(t.replace(/\D/g, ''))}
                  placeholder="R$ 0,00"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Cadastrado de</RsFormLabel>
                <RsTextInput
                  value={rsMaskDataBR(filtroCadastradoDeDigits)}
                  onChangeText={(t) => setFiltroCadastradoDeDigits(t.replace(/\D/g, ''))}
                  placeholder="dd/mm/aaaa"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Cadastrado até</RsFormLabel>
                <RsTextInput
                  value={rsMaskDataBR(filtroCadastradoAteDigits)}
                  onChangeText={(t) => setFiltroCadastradoAteDigits(t.replace(/\D/g, ''))}
                  placeholder="dd/mm/aaaa"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <RsFormLabel>Já alocado em vaga?</RsFormLabel>
            <View style={{ zIndex: openFiltroDropdown === 'alocado' ? 200 : 1 }}>
              <RsFieldDropdown
                label={alocadoFiltro === 'sim' ? 'Sim' : alocadoFiltro === 'nao' ? 'Não' : 'Qualquer'}
                options={[
                  { value: 'todos' as 'todos' | 'sim' | 'nao', label: 'Qualquer' },
                  { value: 'sim', label: 'Sim' },
                  { value: 'nao', label: 'Não' },
                ]}
                selectedValue={alocadoFiltro}
                isOpen={openFiltroDropdown === 'alocado'}
                onToggle={() => setOpenFiltroDropdown((cur) => (cur === 'alocado' ? null : 'alocado'))}
                onSelect={(v) => {
                  setAlocadoFiltro(v);
                  setOpenFiltroDropdown(null);
                }}
              />
            </View>
          </View>
        ) : null}

        <RsSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar por código, nome, e-mail, telefone..." />

        {selectedIds.length > 0 ? (
          <View style={{ backgroundColor: '#FCEAEA', borderRadius: 12, padding: 12, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={[rsStyles.listRowMeta, { fontWeight: '700', color: '#15203E' }]}>
                {selectedIds.length} candidato(s) selecionado(s)
              </Text>
              {selectedIds.length < candidatosFiltrados.length ? (
                <Pressable onPress={handleSelecionarTodosFiltro}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#E6213D' }}>
                    Selecionar todos os {candidatosFiltrados.length} do filtro
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              <Pressable style={rsStyles.secondaryButton} onPress={handleLimparSelecao} disabled={isBulkProcessing}>
                <Feather name="x" size={13} color="#1F3A5F" />
                <Text style={rsStyles.secondaryButtonText}>Limpar</Text>
              </Pressable>
              <Pressable style={rsStyles.secondaryButton} onPress={handleConsultarCpfBulk} disabled={isBulkProcessing}>
                <Feather name="search" size={13} color="#1F3A5F" />
                <Text style={rsStyles.secondaryButtonText}>Consultar CPF/antecedentes</Text>
              </Pressable>
              <Pressable style={rsStyles.secondaryButton} onPress={openEnviarProvaBulk} disabled={isBulkProcessing}>
                <Feather name="file-text" size={13} color="#1F3A5F" />
                <Text style={rsStyles.secondaryButtonText}>Enviar prova / DISC</Text>
              </Pressable>
              <Pressable style={[rsStyles.primaryButton, { backgroundColor: '#E6213D' }]} onPress={openAlocarVaga} disabled={isBulkProcessing}>
                <Feather name="briefcase" size={13} color="#FFFFFF" />
                <Text style={rsStyles.primaryButtonText}>Alocar em vaga</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <Text style={[rsStyles.countLabel, { marginTop: 10, marginBottom: 10 }]}>
          {isLoading ? 'Carregando...' : `${candidatosFiltrados.length} candidato(s)`}
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <RsEmptyState message={errorMessage} />
        ) : candidatosFiltrados.length === 0 ? (
          <RsEmptyState message="Nenhum candidato encontrado." />
        ) : (
          candidatosFiltrados.map((c) => (
            <View key={c.id} style={[rsStyles.dreCard, selectedIds.includes(c.id) ? { borderWidth: 1, borderColor: '#E6213D', backgroundColor: '#FEF5F5' } : null]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Pressable onPress={() => toggleSelecionado(c.id)} hitSlop={8} style={{ marginRight: 10, marginTop: 2 }}>
                  <Feather name={selectedIds.includes(c.id) ? 'check-square' : 'square'} size={18} color={selectedIds.includes(c.id) ? '#E6213D' : '#A7AEC2'} />
                </Pressable>
                <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => navigation.navigate('RecrutamentoCandidatoDetalhe', { id: c.id })}>
                  <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                    {c.nome_completo}
                  </Text>
                  <Text style={rsStyles.listRowMeta}>
                    {c.codigo} · {c.profissao ?? 'Tipo de vaga não informado'}
                  </Text>
                  <Text style={[rsStyles.listRowMeta, { marginTop: 6 }]} numberOfLines={1}>
                    {c.email ?? '—'} · {c.whatsapp ?? '—'}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <Text style={rsStyles.listRowMeta}>{[c.bairro, c.cidade, c.estado].filter(Boolean).join(' / ') || 'Local não informado'}</Text>
                    {c.etapa ? <RsBadge label={c.etapa} color="#1F3A5F" bg="#E8EEF6" /> : null}
                  </View>
                </Pressable>
                {/* "..." no canto superior direito, junto do "Alocado" — antes
                    ficava numa linha própria lá no fim do card. */}
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  {c.alocado ? <RsBadge label="Alocado" color="#18955A" bg="#E2F4EA" /> : null}
                  <Pressable style={rsStyles.rowMenuButton} onPress={() => setMenuCandidato(c)} hitSlop={8}>
                    <Feather name="more-vertical" size={18} color="#5E667D" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <RsCandidatoRowMenuModal
        candidato={menuCandidato}
        onClose={() => setMenuCandidato(null)}
        onVisualizar={() => {
          const c = menuCandidato;
          setMenuCandidato(null);
          if (c) navigation.navigate('RecrutamentoCandidatoDetalhe', { id: c.id });
        }}
        onEditar={() => {
          const c = menuCandidato;
          setMenuCandidato(null);
          if (c) openEditar(c);
        }}
        onGerarLink={() => {
          const c = menuCandidato;
          setMenuCandidato(null);
          if (c) abrirLinkEtapa(c);
        }}
        onExcluir={() => {
          const c = menuCandidato;
          setMenuCandidato(null);
          if (c) handleDelete(c);
        }}
      />

      <RsLinkEtapaMenuModal candidato={linkEtapaCandidato} onClose={() => setLinkEtapaCandidato(null)} onSelect={handleGerarLinkEtapa} />

      <RsCandidatoFormModal
        visible={isFormOpen}
        initial={formInitial}
        isSaving={isSavingForm}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveForm}
      />

      <RsSugestaoIaModal visible={isSugestaoOpen} onClose={() => setIsSugestaoOpen(false)} navigation={navigation} />

      <RsModal visible={isAlocarVagaOpen} title="Alocar em vaga" onClose={() => setIsAlocarVagaOpen(false)}>
        <Text style={[rsStyles.listRowMeta, { marginBottom: 12 }]}>
          Escolha a vaga para alocar os {selectedIds.length} candidato(s) selecionado(s).
        </Text>
        {isLoadingAlocarVagas ? (
          <ActivityIndicator color="#1F3A5F" />
        ) : alocarVagas.length === 0 ? (
          <RsEmptyState message="Nenhuma vaga aberta no momento." />
        ) : (
          alocarVagas.map((v) => (
            <Pressable key={v.id} style={rsStyles.dreCard} onPress={() => handleAlocarVaga(v.id)}>
              <Text style={rsStyles.listRowTitle}>{v.titulo}</Text>
              <Text style={rsStyles.listRowMeta}>{[v.cidade, v.estado].filter(Boolean).join('/')}</Text>
            </Pressable>
          ))
        )}
        <View style={{ height: 16 }} />
      </RsModal>

      <RsModal visible={isEnviarProvaOpen} title="Enviar prova / DISC" onClose={() => setIsEnviarProvaOpen(false)}>
        <Text style={[rsStyles.listRowMeta, { marginBottom: 12 }]}>
          Escolha a avaliação para enviar aos {selectedIds.length} candidato(s) selecionado(s).
        </Text>
        {isLoadingEnviarProva ? (
          <ActivityIndicator color="#1F3A5F" />
        ) : enviarProvaAvaliacoes.length === 0 ? (
          <RsEmptyState message="Nenhuma avaliação cadastrada. Crie uma em Configurações > Provas e DISC." />
        ) : (
          enviarProvaAvaliacoes.map((a) => (
            <Pressable key={a.id} style={rsStyles.dreCard} onPress={() => handleEnviarProvaBulk(a.id)}>
              <Text style={rsStyles.listRowTitle}>{a.nome}</Text>
              <Text style={rsStyles.listRowMeta}>{a.tipo}{a.duracao_min ? ` · ${a.duracao_min} min` : ''}</Text>
            </Pressable>
          ))
        )}
        <View style={{ height: 16 }} />
      </RsModal>
    </SafeAreaView>
  );
}

// Estágios usados nas candidaturas reais (aplicacoes[].estagio) — mesmos do
// funil da vaga.
const CANDIDATO_ETAPAS = ['novo', 'triagem', 'entrevista', 'aprovado', 'contratado', 'reprovado'];

// "Já trabalhou na American Fuel" — não existe nenhum campo booleano pra
// isso; é um sinal calculado em cima do histórico extraído pela IA
// (perfil.ia_analise.empresas), procurando o nome da empresa. Não é um
// chute de dado, é uma dedução honesta de um campo real que já existe.
function rsJaTrabalhouNaAmericanFuel(perfil: RecrutamentoCandidatoPerfil): boolean {
  const empresas = perfil.ia_analise?.empresas ?? [];
  return empresas.some((e) => (e.empresa ?? '').toLowerCase().includes('american fuel'));
}

function RsCandidatoDetalheTabAnaliseIa({ perfil }: { perfil: RecrutamentoCandidatoPerfil }) {
  const ia = perfil.ia_analise;
  if (!ia) {
    return <RsEmptyState message="Esse candidato ainda não foi analisado pela IA." />;
  }
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={rsStyles.listRowMeta}>
          Analisado em {formatDateTimeBR(perfil.ia_analisado_em)} · {perfil.ia_modelo ?? '—'}
        </Text>
      </View>
      {ia.resumo ? (
        <View style={rsStyles.chartCard}>
          <Text style={rsStyles.sectionTitle}>Resumo do perfil</Text>
          <Text style={rsStyles.listRowMeta}>{ia.resumo}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {ia.pros && ia.pros.length > 0 ? (
          <View style={[rsStyles.chartCard, { flex: 1, backgroundColor: '#E7F5EC' }]}>
            <Text style={[rsStyles.sectionTitle, { color: '#18955A' }]}>Prós</Text>
            {ia.pros.map((p, idx) => (
              <Text key={idx} style={[rsStyles.listRowMeta, { marginTop: 4 }]}>
                • {p}
              </Text>
            ))}
          </View>
        ) : null}
        {ia.contras && ia.contras.length > 0 ? (
          <View style={[rsStyles.chartCard, { flex: 1, backgroundColor: '#FBEAEA' }]}>
            <Text style={[rsStyles.sectionTitle, { color: '#C23B3B' }]}>Contras</Text>
            {ia.contras.map((p, idx) => (
              <Text key={idx} style={[rsStyles.listRowMeta, { marginTop: 4 }]}>
                • {p}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      {ia.empresas && ia.empresas.length > 0 ? (
        <View style={rsStyles.chartCard}>
          <Text style={rsStyles.sectionTitle}>Histórico (extraído pela IA)</Text>
          {ia.empresas.map((e, idx) => (
            <Text key={idx} style={[rsStyles.listRowMeta, { marginTop: idx > 0 ? 6 : 0 }]}>
              {e.empresa ?? '—'} — {e.cargo ?? '—'} ({e.inicio ?? '—'} – {e.fim ?? '—'}
              {e.local ? ` · ${e.local}` : ''})
            </Text>
          ))}
        </View>
      ) : null}
      {ia.habilidades_destaque && ia.habilidades_destaque.length > 0 ? (
        <View style={rsStyles.chartCard}>
          <Text style={rsStyles.sectionTitle}>Habilidades em destaque</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ia.habilidades_destaque.map((h, idx) => (
              <View key={idx} style={rsStyles.beneficioChip}>
                <Text style={rsStyles.beneficioChipText}>{h}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {ia.coerencia_localidades ? (
        <View style={rsStyles.chartCard}>
          <Text style={rsStyles.sectionTitle}>Coerência geográfica</Text>
          <Text style={rsStyles.listRowMeta}>{ia.coerencia_localidades}</Text>
        </View>
      ) : null}
      {ia.alertas && ia.alertas.length > 0 ? (
        <View style={[rsStyles.chartCard, { backgroundColor: '#FCF4DE' }]}>
          <Text style={[rsStyles.sectionTitle, { color: '#B7791F' }]}>Alertas</Text>
          {ia.alertas.map((a, idx) => (
            <Text key={idx} style={[rsStyles.listRowMeta, { marginTop: 4 }]}>
              • {a}
            </Text>
          ))}
        </View>
      ) : null}
      {typeof ia.faixa_experiencia_anos === 'number' ? (
        <Text style={[rsStyles.listRowMeta, { marginTop: 4 }]}>Experiência total estimada: {ia.faixa_experiencia_anos} ano(s)</Text>
      ) : null}
    </View>
  );
}

function RsCandidatoDetalheTabExperiencia({ perfil }: { perfil: RecrutamentoCandidatoPerfil }) {
  const experiencias = perfil.experiencias ?? [];
  return (
    <View>
      {perfil.resumo ? (
        <View style={rsStyles.chartCard}>
          <Text style={rsStyles.sectionTitle}>Resumo informado pelo candidato</Text>
          <Text style={rsStyles.listRowMeta}>{perfil.resumo}</Text>
        </View>
      ) : null}
      {experiencias.length === 0 ? (
        <RsEmptyState message="Nenhuma experiência cadastrada." />
      ) : (
        experiencias.map((exp) => (
          <View key={exp.id} style={rsStyles.dreCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                  {exp.cargo ?? '—'} · {exp.empresa ?? '—'}
                </Text>
                <Text style={rsStyles.listRowMeta}>
                  {formatDateIsoBR(exp.inicio) ?? exp.inicio ?? '—'} — {exp.emprego_atual ? 'Atual' : formatDateIsoBR(exp.fim) ?? exp.fim ?? '—'}
                </Text>
              </View>
              {exp.emprego_atual ? <RsBadge label="Atual" color="#18955A" bg="#E2F4EA" /> : null}
            </View>
            {exp.atividades ? <Text style={[rsStyles.listRowMeta, { marginTop: 6 }]}>{exp.atividades}</Text> : null}
          </View>
        ))
      )}
    </View>
  );
}

export function RecrutamentoCandidatoDetalheScreen({ navigation, route }: ScreenProps<'RecrutamentoCandidatoDetalhe'>) {
  const { id } = route.params;
  const [detalhe, setDetalhe] = useState<RecrutamentoCandidatoDetalhe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ia' | 'experiencia' | 'curriculo' | 'avaliacoes' | 'consulta' | 'consentimento'>('ia');
  const [openEtapaAplicacaoId, setOpenEtapaAplicacaoId] = useState<string | null>(null);
  const [movingAplicacaoId, setMovingAplicacaoId] = useState<string | null>(null);
  const [isUploadingCurriculo, setIsUploadingCurriculo] = useState(false);
  const [consentimento, setConsentimento] = useState<RecrutamentoConsentimento | null>(null);
  const [consultasPf, setConsultasPf] = useState<RecrutamentoConsultaPf[]>([]);
  const [isLoadingConsultas, setIsLoadingConsultas] = useState(false);
  const [isConsultandoPf, setIsConsultandoPf] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRecrutamentoCandidato(id)
      .then(setDetalhe)
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar o candidato.')))
      .finally(() => setIsLoading(false));
  }, [id]);

  const loadConsentimento = useCallback(() => {
    fetchRecrutamentoConsentimento(id)
      .then(setConsentimento)
      .catch(() => setConsentimento(null));
  }, [id]);

  const loadConsultasPf = useCallback(() => {
    setIsLoadingConsultas(true);
    fetchRecrutamentoConsultasPf(id)
      .then((res) => setConsultasPf(res.itens))
      .catch(() => setConsultasPf([]))
      .finally(() => setIsLoadingConsultas(false));
  }, [id]);

  useEffect(() => {
    load();
    loadConsentimento();
    loadConsultasPf();
  }, [load, loadConsentimento, loadConsultasPf]);

  const handleMoverEtapa = (aplicacaoId: string, vagaId: string, etapa: string) => {
    setOpenEtapaAplicacaoId(null);
    setMovingAplicacaoId(aplicacaoId);
    moverRecrutamentoCandidatoEtapa({ candidato_id: id, vaga_id: vagaId, etapa })
      .then(() => load())
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível mover o candidato de etapa.')))
      .finally(() => setMovingAplicacaoId(null));
  };

  const handleDelete = () => {
    if (!detalhe) return;
    Alert.alert('Excluir candidato', `Tem certeza que deseja excluir "${detalhe.perfil.nome_completo}"?`, [
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

  const RS_CURRICULO_ACEITOS = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const RS_CURRICULO_TAMANHO_MAX = 5 * 1024 * 1024;

  // Endpoint real confirmado e testado pela Lovable em 18/09/2026 — anexa
  // o arquivo direto no candidato_id indicado, sem depender da IA
  // reidentificar quem é.
  const handleAnexarCurriculo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: RS_CURRICULO_ACEITOS, copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if ((asset.size ?? 0) > RS_CURRICULO_TAMANHO_MAX) {
        Alert.alert('Arquivo muito grande', 'O tamanho máximo é 5MB.');
        return;
      }
      setIsUploadingCurriculo(true);
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      await anexarRecrutamentoCurriculo({ candidato_id: id, file_name: asset.name ?? 'curriculo.pdf', file_base64: base64, analisar: true });
      load();
      Alert.alert('Currículo anexado', 'O currículo foi vinculado a este candidato.');
    } catch (err) {
      Alert.alert('Erro', showRsError(err, 'Não foi possível anexar o currículo.'));
    } finally {
      setIsUploadingCurriculo(false);
    }
  };

  const handleAtualizarConsulta = () => {
    loadConsultasPf();
  };

  const handleConsultarAgora = () => {
    setIsConsultandoPf(true);
    consultarRecrutamentoPf({ candidato_id: id })
      .then(() => loadConsultasPf())
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível consultar os dados pessoais.')))
      .finally(() => setIsConsultandoPf(false));
  };

  // Não existe endpoint de comprovante em PDF — a Lovable confirmou que o
  // botão "Baixar comprovante" também está desativado no próprio painel
  // web ainda ("em breve"), então não é algo que eu tenha deixado faltando.
  const handleBaixarComprovante = () => {
    Alert.alert('Em breve', 'O comprovante em PDF ainda não está disponível — o mesmo botão está desativado no painel web também.');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <ActivityIndicator color="#1F3A5F" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (errorMessage || !detalhe) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.topBarContainer}>
          <Pressable style={rsStyles.backRow} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={20} color="#1F3A5F" />
            <Text style={rsStyles.backRowText}>Candidatos</Text>
          </Pressable>
        </View>
        <RsEmptyState message={errorMessage ?? 'Candidato não encontrado.'} />
      </SafeAreaView>
    );
  }

  const { perfil } = detalhe;
  const iniciais = perfil.nome_completo
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const jaTrabalhouAf = rsJaTrabalhouNaAmericanFuel(perfil);
  const aplicacoes = perfil.aplicacoes ?? [];

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <View style={rsStyles.candAvatarCircle}>
            <Text style={rsStyles.candAvatarText}>{iniciais || '?'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={rsStyles.listRowTitle} numberOfLines={1}>
              {perfil.nome_completo}
            </Text>
            <Text style={rsStyles.listRowMeta} numberOfLines={1}>
              {perfil.codigo} · {perfil.profissao ?? '—'} · {[perfil.cidade, perfil.estado].filter(Boolean).join('/') || '—'}
            </Text>
            <Text style={rsStyles.listRowMeta}>Cadastrado em {formatDateIsoBR(perfil.created_at) ?? '—'}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {jaTrabalhouAf ? <RsBadge label="Já trabalhei na American Fuel" color="#1F3A5F" bg="#E8EEF6" /> : null}
          {perfil.cpf ? <RsBadge label="CPF" color="#3D4560" bg="#F1F2F6" /> : null}
        </View>

        <View style={rsStyles.chartCard}>
          <Text style={rsStyles.sectionTitle}>Contato</Text>
          <Text style={rsStyles.listRowMeta}>Telefone: {perfil.telefone ?? '—'}</Text>
          <Text style={rsStyles.listRowMeta}>WhatsApp: {perfil.whatsapp ?? '—'}</Text>
          <Text style={rsStyles.listRowMeta}>E-mail: {perfil.email ?? '—'}</Text>
          <Text style={rsStyles.listRowMeta}>CPF: {perfil.cpf ?? '—'}</Text>
          <Text style={rsStyles.listRowMeta}>Gênero: {perfil.genero ?? '—'}</Text>
        </View>

        <View style={rsStyles.chartCard}>
          <Text style={rsStyles.sectionTitle}>Profissional</Text>
          <Text style={rsStyles.listRowMeta}>Pretensão: {perfil.pretensao_salarial ?? '—'}</Text>
          <Text style={rsStyles.listRowMeta}>Disponibilidade: {perfil.disponibilidade ?? '—'}</Text>
        </View>

        <View style={rsStyles.chartCard}>
          <Text style={rsStyles.sectionTitle}>Endereço</Text>
          <Text style={rsStyles.listRowMeta}>
            {[perfil.logradouro, perfil.numero].filter(Boolean).join(', ') || '—'}
            {perfil.complemento ? ` · ${perfil.complemento}` : ''}
          </Text>
          <Text style={rsStyles.listRowMeta}>{[perfil.bairro, perfil.cidade, perfil.estado].filter(Boolean).join(' — ') || '—'}</Text>
          <Text style={rsStyles.listRowMeta}>CEP: {perfil.cep ?? '—'}</Text>
        </View>

        {perfil.habilidades && perfil.habilidades.length > 0 ? (
          <View style={rsStyles.chartCard}>
            <Text style={rsStyles.sectionTitle}>Habilidades informadas</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {perfil.habilidades.map((h, idx) => (
                <View key={idx} style={rsStyles.beneficioChip}>
                  <Text style={rsStyles.beneficioChipText}>{h}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {aplicacoes.length > 0 ? (
          <View style={rsStyles.chartCard}>
            <Text style={rsStyles.sectionTitle}>Candidaturas</Text>
            {aplicacoes.map((a) => {
              const meta = rsEstagioMeta(a.estagio);
              return (
                <View key={a.id} style={{ marginBottom: 10 }}>
                  <Text style={rsStyles.listRowMeta} numberOfLines={1}>
                    {a.vaga?.titulo ?? 'Vaga removida'}
                  </Text>
                  <View style={{ zIndex: openEtapaAplicacaoId === a.id ? 200 : 1, marginTop: 4 }}>
                    <RsFieldDropdown<string | null>
                      label={meta.label}
                      options={CANDIDATO_ETAPAS.map((e) => ({ value: e as string | null, label: rsEstagioMeta(e).label }))}
                      selectedValue={a.estagio}
                      isOpen={openEtapaAplicacaoId === a.id}
                      onToggle={() => setOpenEtapaAplicacaoId((cur) => (cur === a.id ? null : a.id))}
                      onSelect={(v) => v && a.vaga && handleMoverEtapa(a.id, a.vaga.id, v)}
                    />
                  </View>
                  {movingAplicacaoId === a.id ? <ActivityIndicator color="#1F3A5F" style={{ marginTop: 6 }} /> : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={rsStyles.vagaTabsRow}>
          {(
            [
              { key: 'ia' as const, label: 'Análise IA' },
              { key: 'experiencia' as const, label: 'Experiência' },
              { key: 'curriculo' as const, label: 'Currículo' },
              { key: 'avaliacoes' as const, label: 'Avaliações' },
              { key: 'consulta' as const, label: 'Consulta' },
              { key: 'consentimento' as const, label: 'Consentimento' },
            ]
          ).map((tab) => (
            <Pressable
              key={tab.key}
              style={[rsStyles.vagaTabButton, activeTab === tab.key ? rsStyles.vagaTabButtonActive : null]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[rsStyles.vagaTabText, activeTab === tab.key ? rsStyles.vagaTabTextActive : null]} numberOfLines={1} adjustsFontSizeToFit>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'ia' ? <RsCandidatoDetalheTabAnaliseIa perfil={perfil} /> : null}
        {activeTab === 'experiencia' ? <RsCandidatoDetalheTabExperiencia perfil={perfil} /> : null}

        {activeTab === 'curriculo' ? (
          <View style={rsStyles.chartCard}>
            {perfil.curriculo_url ? (
              <>
                <Text style={rsStyles.sectionTitle}>Currículo anexado</Text>
                <Pressable style={[rsStyles.secondaryButton, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={() => Linking.openURL(perfil.curriculo_url as string)}>
                  <Feather name="file-text" size={14} color="#1F3A5F" />
                  <Text style={rsStyles.secondaryButtonText}>Abrir currículo</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={rsStyles.listRowMeta}>Sem currículo anexado.</Text>
              </>
            )}
            <Pressable
              style={[rsStyles.primaryButton, { justifyContent: 'center', marginTop: 12 }]}
              onPress={handleAnexarCurriculo}
              disabled={isUploadingCurriculo}
            >
              {isUploadingCurriculo ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="paperclip" size={14} color="#FFFFFF" />
                  <Text style={rsStyles.primaryButtonText}>Anexar currículo (PDF, DOC, DOCX — até 5MB)</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        {activeTab === 'avaliacoes' ? (
          detalhe.avaliacoes.length === 0 ? (
            <RsEmptyState message="Nenhuma avaliação enviada para este candidato ainda." />
          ) : (
            detalhe.avaliacoes.map((item, idx) => (
              <View key={idx} style={rsStyles.dreCard}>
                <Text style={rsStyles.listRowTitle}>{pickRsField(item, ['nome', 'tipo']) ?? '—'}</Text>
                <Text style={rsStyles.listRowMeta}>{pickRsField(item, ['resultado', 'nota', 'status']) ?? '—'}</Text>
              </View>
            ))
          )
        ) : null}

        {/* "Consulta" (antecedentes/CPF) e "Consentimento" (termo LGPD): o
            layout já é o mesmo do painel web, mas nenhum endpoint conferido
            até agora (17/09/2026) devolve esse dado real pro app — os tipos
            (perfil.consultas/perfil.consentimento) já existem em api.ts
            prontos pra funcionar assim que a Lovable ligar o campo certo,
            sem precisar mexer na tela. Até lá, mostra o estado vazio
            honesto (que é inclusive o mesmo estado que o próprio painel web
            mostra pra quem nunca foi consultado). */}
        {activeTab === 'consulta' ? (
          <View style={rsStyles.chartCard}>
            <Text style={rsStyles.sectionTitle}>Consulta de dados pessoais</Text>
            <Text style={[rsStyles.listRowMeta, { marginTop: 4 }]}>
              Busca os dados cadastrais pelo CPF (preenche filiação e data de nascimento no cadastro) e, em seguida, emite a
              certidão de antecedentes criminais da Polícia Federal.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Pressable style={[rsStyles.secondaryButton, { flex: 1, justifyContent: 'center' }]} onPress={handleAtualizarConsulta} disabled={isLoadingConsultas}>
                <Feather name="refresh-cw" size={13} color="#1F3A5F" />
                <Text style={rsStyles.secondaryButtonText}>Atualizar</Text>
              </Pressable>
              <Pressable
                style={[rsStyles.primaryButton, { flex: 1, justifyContent: 'center' }]}
                onPress={handleConsultarAgora}
                disabled={isConsultandoPf}
              >
                {isConsultandoPf ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="search" size={13} color="#FFFFFF" />
                    <Text style={rsStyles.primaryButtonText}>Consultar agora</Text>
                  </>
                )}
              </Pressable>
            </View>

            {isLoadingConsultas ? (
              <ActivityIndicator color="#1F3A5F" style={{ marginTop: 14 }} />
            ) : consultasPf.length === 0 ? (
              <View style={[rsStyles.emptyCard, { marginTop: 14 }]}>
                <Feather name="user" size={20} color="#9AA1B5" />
                <Text style={rsStyles.emptyText}>Nenhuma consulta realizada para este candidato.</Text>
              </View>
            ) : (
              consultasPf.map((c) => {
                const dadosCadastrais = c.resposta?.data as Record<string, unknown> | undefined;
                return (
                  <View key={c.id} style={[rsStyles.dreCard, { marginTop: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={rsStyles.listRowTitle}>
                        {c.tipo === 'antecedentes' ? 'Antecedentes criminais — PF' : 'Dados cadastrais (CPF)'}
                      </Text>
                      <RsBadge label={c.sucesso ? 'Sucesso' : 'Falhou'} color={c.sucesso ? '#18955A' : '#E6213D'} bg={c.sucesso ? '#E2F4EA' : '#FBEAEA'} />
                    </View>
                    <Text style={rsStyles.listRowMeta}>{formatDateTimeBR(c.created_at)}</Text>
                    {c.mensagem ? <Text style={[rsStyles.listRowMeta, { marginTop: 4 }]}>{c.mensagem}</Text> : null}
                    {dadosCadastrais ? (
                      <View style={{ marginTop: 6 }}>
                        {Object.entries(dadosCadastrais)
                          .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
                          .map(([k, v]) => (
                            <Text key={k} style={[rsStyles.listRowMeta, { marginTop: 2 }]}>
                              {k}: {String(v)}
                            </Text>
                          ))}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {activeTab === 'consentimento' ? (
          consentimento?.tem_consentimento && consentimento.consentimento ? (
            <View>
              <View style={[rsStyles.chartCard, { backgroundColor: '#E7F5EC' }]}>
                <Text style={[rsStyles.sectionTitle, { color: '#18955A' }]}>Termo aceito pelo candidato</Text>
                <Text style={rsStyles.listRowMeta}>
                  Aceito em {formatDateTimeBR(consentimento.consentimento.data_hora)} · Versão {consentimento.consentimento.termo_versao}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[rsStyles.chartCard, { flex: 1 }]}>
                  <Text style={rsStyles.sectionTitle}>IP de origem</Text>
                  <Text style={rsStyles.listRowMeta}>{consentimento.consentimento.ip ?? '—'}</Text>
                </View>
                <View style={[rsStyles.chartCard, { flex: 1 }]}>
                  <Text style={rsStyles.sectionTitle}>User-agent</Text>
                  <Text style={rsStyles.listRowMeta} numberOfLines={3}>
                    {consentimento.consentimento.user_agent ?? '—'}
                  </Text>
                </View>
              </View>
              <View style={rsStyles.chartCard}>
                <Text style={rsStyles.sectionTitle}>Texto integral do termo aceito</Text>
                <ScrollView style={{ maxHeight: 220, marginTop: 8 }} nestedScrollEnabled showsVerticalScrollIndicator>
                  <Text style={rsStyles.listRowMeta}>{consentimento.consentimento.termo_texto}</Text>
                </ScrollView>
              </View>
              <Pressable style={[rsStyles.secondaryButton, { alignSelf: 'flex-start' }]} onPress={handleBaixarComprovante}>
                <Feather name="download" size={13} color="#1F3A5F" />
                <Text style={rsStyles.secondaryButtonText}>Baixar comprovante (PDF)</Text>
              </Pressable>
            </View>
          ) : (
            <RsEmptyState message="Nenhum termo de consentimento (LGPD) registrado para este candidato ainda." />
          )
        ) : null}

        <Pressable style={[rsStyles.dangerButton, { marginTop: 16 }]} onPress={handleDelete}>
          <Feather name="trash-2" size={15} color="#E6213D" />
          <Text style={rsStyles.dangerButtonText}>Excluir candidato</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// 4. Importar Currículo + Pendências
// ============================================================

// Menu "..." de cada importação — mesmas 3 ações do dropdown do painel web.
// "Reanalisar com IA" reaproveita o endpoint real de reprocessar. "Excluir"
// e o detalhe completo ("Visualizar") já usam o recurso=importacao real
// (confirmado pela Lovable), mas o deploy delas falhou ("build
// unsuccessful") e o recurso ainda não responde em produção — os dois já
// estão prontos pra funcionar assim que elas refizerem o deploy.
function RsImportacaoMenuModal({
  item,
  onClose,
  onVisualizar,
  onReanalisar,
  onExcluir,
}: {
  item: RecrutamentoImportacao | null;
  onClose: () => void;
  onVisualizar: () => void;
  onReanalisar: () => void;
  onExcluir: () => void;
}) {
  if (!item) return null;
  return (
    <Modal visible={item !== null} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={rsStyles.actionsMenuBackdrop} onPress={onClose}>
        <Pressable style={rsStyles.actionsMenuCard} onPress={() => {}}>
          <Text style={rsStyles.actionsMenuTitle} numberOfLines={1}>
            {item.nome_completo ?? 'Importação'}
          </Text>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onVisualizar}>
            <Feather name="eye" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Visualizar</Text>
          </Pressable>
          <Pressable style={rsStyles.actionsMenuRow} onPress={onReanalisar}>
            <Feather name="refresh-cw" size={16} color="#3D4560" />
            <Text style={rsStyles.actionsMenuRowText}>Reanalisar com IA</Text>
          </Pressable>
          <Pressable style={[rsStyles.actionsMenuRow, rsStyles.actionsMenuRowLast]} onPress={onExcluir}>
            <Feather name="trash-2" size={16} color="#E6213D" />
            <Text style={[rsStyles.actionsMenuRowText, { color: '#E6213D' }]}>Excluir</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Busca o detalhe real (recurso=importacao&id=) ao abrir — endpoint
// confirmado pela Lovable, mas o deploy delas deu "build unsuccessful" e
// ainda não responde em produção (17-18/09/2026). Enquanto isso mostra um
// aviso amigável em vez de erro, e volta a funcionar sozinho assim que elas
// refizerem o deploy, sem precisar mexer em mais nada aqui.
function RsImportacaoDetalheModal({ item, onClose }: { item: RecrutamentoImportacao | null; onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [detalhe, setDetalhe] = useState<RecrutamentoImportacaoDetalhe | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!item) {
      setDetalhe(null);
      setErro(false);
      return;
    }
    setIsLoading(true);
    setErro(false);
    fetchRecrutamentoImportacao(item.id)
      .then(setDetalhe)
      .catch(() => setErro(true))
      .finally(() => setIsLoading(false));
  }, [item]);

  if (!item) return null;
  return (
    <Modal visible={item !== null} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={rsStyles.actionsMenuBackdrop} onPress={onClose}>
        <Pressable style={rsStyles.candModalCard} onPress={() => {}}>
          <Text style={rsStyles.candModalTitle} numberOfLines={1}>
            {item.nome_completo ?? 'Nome não detectado'}
          </Text>
          <Text style={rsStyles.candModalSubtitle}>Status: {detalhe?.status ?? item.status}</Text>
          {isLoading ? (
            <ActivityIndicator color="#1F3A5F" style={{ marginVertical: 20 }} />
          ) : (
            <View style={rsStyles.candModalFieldRow}>
              <View style={rsStyles.candModalField}>
                <Text style={rsStyles.candModalFieldLabel}>E-MAIL</Text>
                <Text style={rsStyles.candModalFieldValue}>{item.email ?? '—'}</Text>
              </View>
              <View style={rsStyles.candModalField}>
                <Text style={rsStyles.candModalFieldLabel}>TELEFONE</Text>
                <Text style={rsStyles.candModalFieldValue}>{item.telefone ?? '—'}</Text>
              </View>
              <View style={{ width: '100%' }}>
                <Text style={rsStyles.candModalFieldLabel}>ARQUIVO</Text>
                {detalhe?.arquivo_url ? (
                  <Pressable onPress={() => Linking.openURL(detalhe.arquivo_url as string)}>
                    <Text style={[rsStyles.candModalFieldValue, { color: '#1F3A5F' }]}>Abrir arquivo</Text>
                  </Pressable>
                ) : (
                  <Text style={rsStyles.candModalFieldValue}>{(item.arquivo as string) ?? item.storage_caminho ?? '—'}</Text>
                )}
              </View>
              <View style={{ width: '100%' }}>
                <Text style={rsStyles.candModalFieldLabel}>RESUMO EXTRAÍDO</Text>
                <Text style={rsStyles.candModalFieldValue}>
                  {erro ? 'Ainda não disponível — a Lovable confirmou esse endpoint, mas o deploy delas falhou.' : detalhe?.texto_extraido ?? '—'}
                </Text>
              </View>
              <View style={{ width: '100%' }}>
                <Text style={rsStyles.candModalFieldLabel}>JSON DE EXTRAÇÃO</Text>
                {detalhe?.extracao_json ? (
                  <ScrollView style={{ maxHeight: 160, marginTop: 4 }} nestedScrollEnabled showsVerticalScrollIndicator>
                    <Text style={[rsStyles.candModalFieldValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                      {JSON.stringify(detalhe.extracao_json, null, 2)}
                    </Text>
                  </ScrollView>
                ) : (
                  <Text style={rsStyles.candModalFieldValue}>
                    {erro ? 'Ainda não disponível — a Lovable confirmou esse endpoint, mas o deploy delas falhou.' : '—'}
                  </Text>
                )}
              </View>
              <View style={rsStyles.candModalField}>
                <Text style={rsStyles.candModalFieldLabel}>IMPORTADO EM</Text>
                <Text style={rsStyles.candModalFieldValue}>{formatDateIsoBR(item.created_at) ?? '—'}</Text>
              </View>
            </View>
          )}
          <Pressable style={rsStyles.candModalCloseButton} onPress={onClose}>
            <Text style={rsStyles.candModalCloseText}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function RecrutamentoImportarCurriculoScreen({ navigation }: ScreenProps<'RecrutamentoImportarCurriculo'>) {
  const isFocused = useIsFocused();
  const [importacoes, setImportacoes] = useState<RecrutamentoImportacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [menuImportacao, setMenuImportacao] = useState<RecrutamentoImportacao | null>(null);
  const [detalheImportacao, setDetalheImportacao] = useState<RecrutamentoImportacao | null>(null);
  const [confirmExcluirImportacao, setConfirmExcluirImportacao] = useState<RecrutamentoImportacao | null>(null);

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

  const importacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return importacoes;
    return importacoes.filter(
      (item) =>
        (item.nome_completo ?? '').toLowerCase().includes(termo) ||
        (item.email ?? '').toLowerCase().includes(termo) ||
        item.status.toLowerCase().includes(termo)
    );
  }, [importacoes, busca]);

  const ACEITOS = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const TAMANHO_MAXIMO = 10 * 1024 * 1024;

  // Testado de ponta a ponta direto na API de produção (18/09/2026): o
  // envio funciona certinho com o base64 puro (sem prefixo "data:...").
  const handleImportar = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ACEITOS, copyToCacheDirectory: true, multiple: true });
      if (result.canceled || !result.assets?.length) return;
      const grandeDemais = result.assets.filter((a) => (a.size ?? 0) > TAMANHO_MAXIMO);
      if (grandeDemais.length > 0) {
        Alert.alert('Arquivo muito grande', `O tamanho máximo é 10MB (${grandeDemais.map((a) => a.name).join(', ')}).`);
        return;
      }
      setIsUploading(true);
      let sucesso = 0;
      for (const asset of result.assets) {
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
          await importarRecrutamentoCurriculo({ file_name: asset.name ?? 'curriculo.pdf', file_base64: base64 });
          sucesso += 1;
        } catch {
          // segue pros próximos arquivos e reporta o total no final
        }
      }
      Alert.alert(
        sucesso === result.assets.length ? 'Currículos importados' : 'Importação parcial',
        `${sucesso} de ${result.assets.length} arquivo(s) processado(s) com sucesso.`
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

  // Endpoint confirmado pela Lovable, mas o deploy delas deu "build
  // unsuccessful" e ainda não responde em produção (17-18/09/2026).
  const handleConfirmarExcluirImportacao = () => {
    const item = confirmExcluirImportacao;
    setConfirmExcluirImportacao(null);
    if (!item) return;
    excluirRecrutamentoImportacao(item.id)
      .then(() => load())
      .catch(() =>
        Alert.alert(
          'Ainda não disponível',
          'A Lovable confirmou esse endpoint, mas o deploy delas falhou ("build unsuccessful") — ainda não responde em produção.'
        )
      );
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
              <Text style={rsStyles.primaryButtonText}>Enviar currículos</Text>
            </>
          )}
        </Pressable>

        <RsSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar por nome, e-mail, status..." />

        <Text style={[rsStyles.countLabel, { marginTop: 10, marginBottom: 10 }]}>
          {isLoading ? 'Carregando...' : `${importacoesFiltradas.length} importação(ões)`}
        </Text>
        {isLoading ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <RsEmptyState message={errorMessage} />
        ) : importacoesFiltradas.length === 0 ? (
          <RsEmptyState message="Nenhuma importação ainda. Envie um currículo para começar." />
        ) : (
          importacoesFiltradas.map((item) => (
            <View key={item.id} style={rsStyles.dreCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => setDetalheImportacao(item)}>
                  <Text style={rsStyles.listRowTitle}>{item.nome_completo ?? 'Nome não detectado'}</Text>
                  <Text style={rsStyles.listRowMeta}>{item.email ?? '—'} · {item.telefone ?? '—'}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <RsBadge label={item.status} color="#1F3A5F" bg="#E8EEF6" />
                    <Text style={rsStyles.listRowMeta}>{formatDateTimeBR(item.created_at)}</Text>
                  </View>
                </Pressable>
                <Pressable style={rsStyles.rowMenuButton} onPress={() => setMenuImportacao(item)} hitSlop={8}>
                  <Feather name="more-vertical" size={18} color="#5E667D" />
                </Pressable>
              </View>
            </View>
          ))
        )}

        <RsImportacaoMenuModal
          item={menuImportacao}
          onClose={() => setMenuImportacao(null)}
          onVisualizar={() => {
            const item = menuImportacao;
            setMenuImportacao(null);
            if (item) setDetalheImportacao(item);
          }}
          onReanalisar={() => {
            const item = menuImportacao;
            setMenuImportacao(null);
            if (item) handleReprocessar(item);
          }}
          onExcluir={() => {
            const item = menuImportacao;
            setMenuImportacao(null);
            if (item) setConfirmExcluirImportacao(item);
          }}
        />
        <RsImportacaoDetalheModal item={detalheImportacao} onClose={() => setDetalheImportacao(null)} />
        <RsConfirmModal
          visible={confirmExcluirImportacao !== null}
          title="Excluir importação"
          message={`Excluir "${confirmExcluirImportacao?.nome_completo ?? 'este registro'}" e o arquivo do armazenamento?`}
          confirmLabel="Excluir"
          onCancel={() => setConfirmExcluirImportacao(null)}
          onConfirm={handleConfirmarExcluirImportacao}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// Valores reais confirmados via erro de enum do Postgres (rs_solicitacao_status,
// 18/09/2026) — mandar qualquer outra coisa (ex.: "em_aberto", "aberta")
// quebra a query. "Pendente" é o que o painel web chama de "Em aberto".
const RS_PENDENCIA_STATUS_OPTIONS: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'Todas' },
  { value: 'pendente', label: 'Em aberto' },
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'atendida', label: 'Atendida' },
  { value: 'recusada', label: 'Recusada' },
  { value: 'cancelada', label: 'Cancelada' },
];
const RS_PENDENCIA_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pendente: { label: 'Em aberto', color: '#B7791F', bg: '#FCF4DE' },
  aprovada: { label: 'Aprovada', color: '#18955A', bg: '#E2F4EA' },
  atendida: { label: 'Atendida', color: '#18955A', bg: '#E2F4EA' },
  recusada: { label: 'Recusada', color: '#E6213D', bg: '#FBEAEA' },
  cancelada: { label: 'Cancelada', color: '#5E667D', bg: '#F1F2F6' },
};
function rsPendenciaStatusMeta(status: string) {
  return RS_PENDENCIA_STATUS_META[status] ?? { label: status, color: '#5E667D', bg: '#F1F2F6' };
}

// Modal simples de motivo — Alert.prompt só existe no iOS (no Android e no
// web, que é como o app é testado, `Alert.prompt?.()` nunca chama o
// callback, então "Recusar" não fazia nada).
function RsMotivoRecusaModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState('');
  useEffect(() => {
    if (visible) setMotivo('');
  }, [visible]);
  return (
    <RsModal visible={visible} title="Motivo da recusa" onClose={onClose}>
      <RsFormLabel>Descreva o motivo</RsFormLabel>
      <RsTextInput value={motivo} onChangeText={setMotivo} placeholder="Ex.: Documento ilegível" multiline />
      <Pressable
        style={[rsStyles.dangerButton, { justifyContent: 'center', marginTop: 14, marginBottom: 16 }]}
        onPress={() => onConfirm(motivo.trim() || 'Não especificado')}
      >
        <Text style={rsStyles.dangerButtonText}>Recusar</Text>
      </Pressable>
    </RsModal>
  );
}

export function RecrutamentoPendenciasScreen({ navigation }: ScreenProps<'RecrutamentoPendencias'>) {
  const isFocused = useIsFocused();
  const [pendencias, setPendencias] = useState<RecrutamentoPendencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<string | null>('pendente');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [validadeDias, setValidadeDias] = useState('7');
  const [recusandoItem, setRecusandoItem] = useState<RecrutamentoPendencia | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRecrutamentoPendencias(statusFiltro ?? undefined)
      .then(setPendencias)
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar as pendências.')))
      .finally(() => setIsLoading(false));
  }, [statusFiltro]);

  useEffect(() => {
    if (!isFocused) return;
    load();
  }, [load, isFocused]);

  const handleAprovar = (item: RecrutamentoPendencia) => {
    const dias = Number(validadeDias) || 7;
    aprovarRecrutamentoPendencia(item.id, dias)
      .then((res) => {
        const link = (res as { link?: string })?.link;
        Alert.alert('Aprovado', link ? `Link gerado:\n\n${link}` : 'Documento aprovado. Veja o link na lista abaixo.');
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível aprovar.')));
  };

  const handleConfirmarRecusa = (motivo: string) => {
    const item = recusandoItem;
    setRecusandoItem(null);
    if (!item) return;
    recusarRecrutamentoPendencia(item.id, motivo)
      .then(() => load())
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível recusar.')));
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

        <View style={[rsStyles.chartCard, { zIndex: isStatusOpen ? 200 : 1 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
              <Text style={rsStyles.sectionTitle}>Pendências de Documentos</Text>
              <Text style={rsStyles.listRowMeta}>
                Pedidos da contabilidade e do RH. Aprove para gerar o link do candidato e faça a cobrança.
              </Text>
            </View>
            <Pressable style={rsStyles.rowMenuButton} onPress={load} hitSlop={8}>
              <Feather name="refresh-cw" size={16} color="#1F3A5F" />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1, zIndex: isStatusOpen ? 200 : 1 }}>
              <RsFormLabel>Status</RsFormLabel>
              <RsFieldDropdown
                label={RS_PENDENCIA_STATUS_OPTIONS.find((o) => o.value === statusFiltro)?.label ?? 'Todas'}
                options={RS_PENDENCIA_STATUS_OPTIONS}
                selectedValue={statusFiltro}
                isOpen={isStatusOpen}
                onToggle={() => setIsStatusOpen((o) => !o)}
                onSelect={(v) => {
                  setStatusFiltro(v);
                  setIsStatusOpen(false);
                }}
              />
            </View>
            <View style={{ width: 140 }}>
              <RsFormLabel>Validade do link (dias)</RsFormLabel>
              <RsTextInput value={validadeDias} onChangeText={setValidadeDias} placeholder="7" keyboardType="number-pad" />
            </View>
          </View>
        </View>

        <Text style={rsStyles.countLabel}>{isLoading ? 'Carregando...' : `${pendencias.length} pendência(s)`}</Text>

        {isLoading ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <RsEmptyState message={errorMessage} />
        ) : pendencias.length === 0 ? (
          <RsEmptyState message="Nenhuma pendência neste filtro." />
        ) : (
          pendencias.map((item) => {
            const statusMeta = rsPendenciaStatusMeta(item.status);
            const origemLabel = item.origem === 'contabilidade' ? 'Contabilidade' : item.origem === 'rh' ? 'RH' : item.origem;
            return (
              <View key={item.id} style={rsStyles.dreCard}>
                <Text style={rsStyles.listRowTitle}>{item.candidato_nome ?? item.admissao?.candidato?.nome_completo ?? '—'}</Text>
                <Text style={rsStyles.listRowMeta}>{item.descricao ?? 'Documento de admissão'}</Text>
                <Text style={rsStyles.listRowMeta}>
                  {[item.empresa_nome ?? item.admissao?.empresa?.razao_social, item.admissao?.cargo].filter(Boolean).join(' · ') || '—'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 6 }}>
                  <RsBadge label={statusMeta.label} color={statusMeta.color} bg={statusMeta.bg} />
                  {origemLabel ? <RsBadge label={origemLabel} color="#3D4560" bg="#F1F2F6" /> : null}
                  {item.cobrancas ? <Text style={rsStyles.listRowMeta}>{item.cobrancas} cobrança(s)</Text> : null}
                </View>
                <Text style={[rsStyles.listRowMeta, { marginTop: 4 }]}>{formatDateTimeBR(item.created_at)}</Text>
                {item.status === 'recusada' && item.recusa_motivo ? (
                  <Text style={[rsStyles.listRowMeta, { marginTop: 4, color: '#E6213D' }]}>Motivo: {item.recusa_motivo}</Text>
                ) : null}
                {item.link ? (
                  <Pressable onPress={() => Linking.openURL(item.link as string)}>
                    <Text style={[rsStyles.listRowMeta, { marginTop: 4, color: '#1F3A5F' }]} numberOfLines={1}>
                      Link: {item.link}
                    </Text>
                  </Pressable>
                ) : null}
                {item.status === 'pendente' ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <Pressable style={[rsStyles.secondaryButton, { flex: 1 }]} onPress={() => handleAprovar(item)}>
                      <Feather name="check" size={13} color="#18955A" />
                      <Text style={[rsStyles.secondaryButtonText, { color: '#18955A' }]}>Aprovar</Text>
                    </Pressable>
                    <Pressable style={[rsStyles.secondaryButton, { flex: 1 }]} onPress={() => setRecusandoItem(item)}>
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
            );
          })
        )}
      </ScrollView>

      <RsMotivoRecusaModal visible={recusandoItem !== null} onClose={() => setRecusandoItem(null)} onConfirm={handleConfirmarRecusa} />
    </SafeAreaView>
  );
}

// ============================================================
// 5. WhatsApp (versão enxuta — lista de conversas + chat de texto simples,
// reaproveitando o mesmo motor do Marketing com canal='rs' já aplicado no
// proxy backend; sem mídia/tags/atendentes/respostas rápidas por aqui).
// ============================================================

const RS_WA_ABA_OPTIONS: Array<{ value: 'todos' | 'fila' | 'ativos' | 'finalizadas'; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'fila', label: 'Fila' },
  { value: 'ativos', label: 'Ativos' },
  { value: 'finalizadas', label: 'Final.' },
];

// Agrupa mensagens por dia (divisores HOJE/ONTEM/data), igual ao Marketing.tsx.
function rsAgruparMensagensPorDia(mensagens: MarketingWaMensagemItem[]) {
  const grupos: Array<{ dia: string; label: string; itens: MarketingWaMensagemItem[] }> = [];
  mensagens.forEach((msg) => {
    const criadoEm = pickRsField(msg, ['created_at', 'timestamp', 'data']);
    const dia = diaChaveWA(criadoEm);
    let grupo = grupos.find((g) => g.dia === dia);
    if (!grupo) {
      grupo = { dia, label: formatDiaDivisorWA(criadoEm), itens: [] };
      grupos.push(grupo);
    }
    grupo.itens.push(msg);
  });
  return grupos;
}

export function RecrutamentoWhatsAppScreen({ navigation }: ScreenProps<'RecrutamentoWhatsApp'>) {
  const isFocused = useIsFocused();
  const [conversas, setConversas] = useState<MarketingWaConversaItem[]>([]);
  const [contadores, setContadores] = useState<MarketingWaContadores | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<'todos' | 'fila' | 'ativos' | 'finalizadas'>('todos');
  const [canal, setCanal] = useState<'todos' | 'whatsapp' | 'instagram' | 'facebook'>('todos');

  const [phoneAtivo, setPhoneAtivo] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MarketingWaMensagemItem[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMenuAberto, setIsMenuAberto] = useState(false);
  const [isUploadingMidia, setIsUploadingMidia] = useState(false);
  const [isEnviandoAudio, setIsEnviandoAudio] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioRecorderState = useAudioRecorderState(audioRecorder, 200);
  const [isAtendimentoOpen, setIsAtendimentoOpen] = useState(false);
  const [nomeExibicaoEdit, setNomeExibicaoEdit] = useState('');
  const [notasEdit, setNotasEdit] = useState('');
  const [tagsEdit, setTagsEdit] = useState<string[]>([]);
  const [novaTagTexto, setNovaTagTexto] = useState('');
  const [isSalvandoAtendimento, setIsSalvandoAtendimento] = useState(false);

  const [isNovaConversaOpen, setIsNovaConversaOpen] = useState(false);
  const [novoPhone, setNovoPhone] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoTexto, setNovoTexto] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRecrutamentoWaConversas({ q: busca || undefined, aba })
      .then((res) => {
        // Mesma regra do Marketing.tsx: "Todos" ali não é "todo mundo que já
        // conversou alguma vez" (isso incluiria as finalizadas antigas) —
        // é fila + ativos. O contador que a API devolve em "abas.todos" soma
        // TUDO (57), por isso o app mostrava um número diferente do painel.
        let itens = res.itens;
        const contadores = { ...res.contadores, abas: { ...res.contadores.abas } };
        contadores.abas.todos = contadores.abas.fila + contadores.abas.ativos;
        if (aba === 'todos') {
          itens = itens.filter((item) => item.chat_status !== 'finalizado' && item.chat_status !== 'finalizada');
        }
        setConversas(itens);
        setContadores(contadores);
      })
      .catch((err) => setErrorMessage(showRsError(err, 'Não foi possível carregar as conversas.')))
      .finally(() => setIsLoading(false));
  }, [busca, aba]);

  useEffect(() => {
    if (!isFocused) return;
    load();
  }, [load, isFocused]);

  const abrirChat = (conversa: MarketingWaConversaItem) => {
    setPhoneAtivo(conversa.phone);
    setIsLoadingChat(true);
    fetchRecrutamentoWaMensagens(conversa.phone, { limit: 50 })
      .then((res) => setMensagens(res.mensagens))
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar as mensagens.')))
      .finally(() => setIsLoadingChat(false));
    // Marca como lida ao abrir — zera o pontinho e o badge de não lidas na
    // lista, igual ao Marketing.tsx (mesmo motor de WhatsApp).
    if ((conversa.nao_lidas ?? 0) > 0 || conversa.nao_assumido) {
      setConversas((current) =>
        current.map((c) => (c.phone === conversa.phone ? { ...c, nao_lidas: 0, nao_assumido: false } : c))
      );
      marcarRecrutamentoWaLido(conversa.phone).catch(() => {});
    }
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

  function rsTipoMidiaPorMime(mime: string): MarketingWaMidiaTipo {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
  }

  // Endpoint real confirmado (mesmo /wa-enviar de texto, só com os campos de
  // mídia) — testado no Marketing, que usa exatamente o mesmo mecanismo.
  const handleAnexarMidia = async () => {
    if (!phoneAtivo) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? 'application/octet-stream';
      setIsUploadingMidia(true);
      const media_base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      await enviarRecrutamentoWaMidia({ phone: phoneAtivo, type: rsTipoMidiaPorMime(mime), media_base64, media_mime: mime, file_name: asset.name });
      const res = await fetchRecrutamentoWaMensagens(phoneAtivo, { limit: 50 });
      setMensagens(res.mensagens);
    } catch (err) {
      Alert.alert('Erro', showRsError(err, 'Não foi possível enviar o anexo.'));
    } finally {
      setIsUploadingMidia(false);
    }
  };

  // Gravação de nota de voz (expo-audio) — mesmo padrão do Marketing.tsx
  // (formato HIGH_QUALITY gera .m4a / audio/mp4).
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
      Alert.alert('Erro', showRsError(err, 'Não foi possível iniciar a gravação.'));
    }
  };

  const handlePararEEnviarGravacao = async () => {
    if (!phoneAtivo) return;
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) return;
      setIsEnviandoAudio(true);
      const media_base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      await enviarRecrutamentoWaMidia({ phone: phoneAtivo, type: 'voice', media_base64, media_mime: 'audio/mp4', file_name: 'audio.m4a' });
      const res = await fetchRecrutamentoWaMensagens(phoneAtivo, { limit: 50 });
      setMensagens(res.mensagens);
    } catch (err) {
      Alert.alert('Erro', showRsError(err, 'Não foi possível enviar a nota de voz.'));
    } finally {
      setIsEnviandoAudio(false);
    }
  };

  // Painel "Atendimento" (versão reduzida — sem "Atendente"/"Respostas
  // rápidas": não achei endpoint de lista de atendentes nem de respostas
  // salvas específico do R&S, só o de nome/etiquetas/notas que já existe).
  const abrirAtendimento = () => {
    const conversa = conversas.find((c) => c.phone === phoneAtivo);
    setNomeExibicaoEdit(conversa?.display_name ?? '');
    setNotasEdit(conversa?.notas ?? '');
    setTagsEdit(conversa?.tags ?? []);
    setIsAtendimentoOpen(true);
  };

  const handleAdicionarTag = () => {
    const tag = novaTagTexto.trim().replace(/^#/, '');
    if (!tag || tagsEdit.includes(tag)) return;
    setTagsEdit((atual) => [...atual, tag]);
    setNovaTagTexto('');
  };

  const handleSalvarAtendimento = () => {
    if (!phoneAtivo) return;
    setIsSalvandoAtendimento(true);
    patchRecrutamentoWaConversa(phoneAtivo, { display_name: nomeExibicaoEdit.trim() || undefined, notas: notasEdit, tags: tagsEdit })
      .then(() => {
        setIsAtendimentoOpen(false);
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar.')))
      .finally(() => setIsSalvandoAtendimento(false));
  };

  const conversasFiltradas = useMemo(() => {
    if (canal === 'todos') return conversas;
    return conversas.filter((c) => c.channel === canal);
  }, [conversas, canal]);

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

  // "Assumir"/"Finalizar"/"Silenciar"/"Bloquear" — mesma rota que já existia
  // no backend (encaminha pro PATCH real do Marketing, só que pelo canal do
  // R&S), só faltava a função no app pra chamar.
  const handleAssumirOuFinalizar = (phone: string, chatStatus: MarketingWaChatStatus) => {
    setIsMenuAberto(false);
    patchRecrutamentoWaConversa(phone, { chat_status: chatStatus })
      .then(() => load())
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível atualizar a conversa.')));
  };

  const handleSilenciarOuBloquear = (phone: string, campo: 'muted' | 'blocked', valor: boolean) => {
    setIsMenuAberto(false);
    patchRecrutamentoWaConversa(phone, { [campo]: valor })
      .then(() => load())
      .catch((err) => Alert.alert('Erro', showRsError(err, `Não foi possível ${campo === 'muted' ? 'silenciar' : 'bloquear'} o contato.`)));
  };

  if (phoneAtivo) {
    const conversa = conversas.find((c) => c.phone === phoneAtivo);
    const grupos = rsAgruparMensagensPorDia(mensagens);
    const iniciaisChat = (conversa?.display_name ?? phoneAtivo).trim().slice(0, 2).toUpperCase();
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ECE5DD' }}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={rsStyles.waChatHeader}>
            <Pressable onPress={() => setPhoneAtivo(null)} hitSlop={8}>
              <Feather name="arrow-left" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }} onPress={abrirAtendimento}>
              <View style={rsStyles.waChatAvatar}>
                <Text style={rsStyles.waChatAvatarText}>{iniciaisChat}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={rsStyles.waChatHeaderName} numberOfLines={1}>
                  {conversa?.display_name ?? phoneAtivo}
                </Text>
                <Text style={rsStyles.waChatHeaderMeta} numberOfLines={1}>
                  {phoneAtivo} · {conversa?.chat_status_label ?? conversa?.chat_status ?? '—'}
                </Text>
              </View>
            </Pressable>
            {conversa && conversa.chat_status !== 'em_atendimento' ? (
              <Pressable style={rsStyles.waChatHeaderBtn} onPress={() => handleAssumirOuFinalizar(phoneAtivo, 'em_atendimento')}>
                <Text style={rsStyles.waChatHeaderBtnText}>Assumir</Text>
              </Pressable>
            ) : null}
            <Pressable style={{ padding: 4 }} onPress={() => setIsMenuAberto((v) => !v)} hitSlop={8}>
              <Feather name="more-vertical" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {isMenuAberto ? (
            <>
              <Pressable style={rsStyles.waMenuBackdrop} onPress={() => setIsMenuAberto(false)} />
              <View style={rsStyles.waMenuDropdown}>
                <Pressable style={rsStyles.waMenuItem} onPress={() => handleAssumirOuFinalizar(phoneAtivo, 'finalizado')}>
                  <Feather name="check-circle" size={15} color="#3A415C" />
                  <Text style={rsStyles.waMenuItemText}>Finalizar conversa</Text>
                </Pressable>
                <Pressable style={rsStyles.waMenuItem} onPress={() => handleSilenciarOuBloquear(phoneAtivo, 'muted', !conversa?.muted)}>
                  <Feather name="bell-off" size={15} color="#3A415C" />
                  <Text style={rsStyles.waMenuItemText}>{conversa?.muted ? 'Dessilenciar' : 'Silenciar'}</Text>
                </Pressable>
                <Pressable style={rsStyles.waMenuItem} onPress={() => handleSilenciarOuBloquear(phoneAtivo, 'blocked', !conversa?.blocked)}>
                  <Feather name="slash" size={15} color="#C2263A" />
                  <Text style={[rsStyles.waMenuItemText, { color: '#C2263A' }]}>{conversa?.blocked ? 'Desbloquear contato' : 'Bloquear contato'}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
            {isLoadingChat ? (
              <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
            ) : mensagens.length === 0 ? (
              <RsEmptyState message="Sem mensagens ainda." />
            ) : (
              grupos.map((grupo) => (
                <View key={grupo.dia}>
                  <View style={rsStyles.waDateDivider}>
                    <Text style={rsStyles.waDateDividerText}>{grupo.label}</Text>
                  </View>
                  {grupo.itens.map((raw, idx) => {
                    const direcao = pickRsField(raw, ['direction', 'direcao', 'tipo']) ?? 'inbound';
                    const tipoMsg = pickRsField(raw, ['message_type']);
                    const isSistema = tipoMsg === 'system' || direcao === 'sistema' || direcao === 'system';
                    const texto = rsExtractWaTexto(raw);
                    const criadoEm = pickRsField(raw, ['created_at', 'timestamp', 'data']);
                    const isOutbound = direcao === 'outbound' || direcao === 'saida';
                    if (isSistema) {
                      return (
                        <View key={idx} style={rsStyles.waSystemMessage}>
                          <Text style={rsStyles.waSystemMessageText}>{texto}</Text>
                        </View>
                      );
                    }
                    const midia = rsDetectarWaMidia(raw);
                    return (
                      <View key={idx} style={[rsStyles.waBubbleRow, { justifyContent: isOutbound ? 'flex-end' : 'flex-start' }]}>
                        <View style={[rsStyles.waBubble, isOutbound ? rsStyles.waBubbleOut : rsStyles.waBubbleIn, midia?.tipo === 'imagem' ? { padding: 4 } : null]}>
                          {midia ? <RsWaMensagemMidia midia={midia} /> : <Text style={rsStyles.waBubbleText}>{texto}</Text>}
                          <Text style={[rsStyles.waBubbleTime, midia?.tipo === 'imagem' ? { paddingHorizontal: 6, paddingBottom: 2 } : null]}>
                            {formatHoraBR(criadoEm)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>
          <View style={rsStyles.composerRow}>
            <Pressable style={rsStyles.waComposerIconBtn} onPress={handleAnexarMidia} disabled={isUploadingMidia}>
              {isUploadingMidia ? <ActivityIndicator size="small" color="#5E667D" /> : <Feather name="paperclip" size={19} color="#5E667D" />}
            </Pressable>
            <TextInput
              style={rsStyles.composerInput}
              value={novaMensagem}
              onChangeText={setNovaMensagem}
              placeholder="Digite uma mensagem..."
              placeholderTextColor="#A7AEC2"
              multiline
            />
            {audioRecorderState.isRecording ? (
              <Pressable style={[rsStyles.composerSendBtn, { flexDirection: 'row', width: undefined, paddingHorizontal: 10, gap: 4 }]} onPress={handlePararEEnviarGravacao} disabled={isEnviandoAudio}>
                {isEnviandoAudio ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E6213D' }} />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{Math.floor(audioRecorderState.durationMillis / 1000)}s</Text>
                  </>
                )}
              </Pressable>
            ) : novaMensagem.trim() ? (
              <Pressable style={rsStyles.composerSendBtn} onPress={handleEnviar} disabled={isSending}>
                {isSending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Feather name="send" size={16} color="#FFFFFF" />}
              </Pressable>
            ) : (
              <Pressable style={rsStyles.composerSendBtn} onPress={handleIniciarGravacao}>
                <Feather name="mic" size={16} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

          {isAtendimentoOpen ? (
            <View style={rsStyles.waAtendimentoOverlay}>
              <Pressable style={{ flex: 1 }} onPress={() => setIsAtendimentoOpen(false)} />
              <View style={rsStyles.waAtendimentoPanel}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Text style={rsStyles.sectionTitle}>Atendimento</Text>
                  <Pressable onPress={() => setIsAtendimentoOpen(false)} hitSlop={8}>
                    <Feather name="x" size={20} color="#677089" />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={{ alignItems: 'center', marginBottom: 14 }}>
                    <View style={[rsStyles.waChatAvatar, { backgroundColor: '#E8EEF6', width: 56, height: 56, borderRadius: 28 }]}>
                      <Text style={[rsStyles.waChatAvatarText, { color: '#1F3A5F', fontSize: 18 }]}>{iniciaisChat}</Text>
                    </View>
                    <Text style={[rsStyles.listRowTitle, { marginTop: 8 }]}>{conversa?.display_name ?? 'Sem nome de exibição'}</Text>
                    <Text style={rsStyles.listRowMeta}>{phoneAtivo}</Text>
                  </View>

                  <RsFormLabel>Nome de exibição</RsFormLabel>
                  <RsTextInput value={nomeExibicaoEdit} onChangeText={setNomeExibicaoEdit} placeholder="Nome do contato" />

                  <View style={{ marginTop: 14 }}>
                    <RsFormLabel>Etiquetas</RsFormLabel>
                    {tagsEdit.length === 0 ? (
                      <Text style={[rsStyles.listRowMeta, { fontStyle: 'italic' }]}>Nenhuma etiqueta</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {tagsEdit.map((tag) => (
                          <View key={tag} style={[rsStyles.filterPill, rsStyles.filterPillActive, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                            <Text style={[rsStyles.filterPillText, rsStyles.filterPillTextActive]}>#{tag}</Text>
                            <Pressable onPress={() => setTagsEdit((atual) => atual.filter((t) => t !== tag))} hitSlop={6}>
                              <Feather name="x" size={11} color="#FFFFFF" />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <View style={{ flex: 1 }}>
                        <RsTextInput value={novaTagTexto} onChangeText={setNovaTagTexto} placeholder="Nova etiqueta" autoCapitalize="none" onSubmitEditing={handleAdicionarTag} />
                      </View>
                      <Pressable style={rsStyles.waIconButton} onPress={handleAdicionarTag}>
                        <Feather name="plus" size={18} color="#5E667D" />
                      </Pressable>
                    </View>
                  </View>

                  <View style={{ marginTop: 14 }}>
                    <RsFormLabel>Notas internas</RsFormLabel>
                    <RsTextInput
                      value={notasEdit}
                      onChangeText={setNotasEdit}
                      placeholder="Observações sobre o contato (só você vê)..."
                      multiline
                      style={{ minHeight: 70, textAlignVertical: 'top' }}
                    />
                  </View>

                  <Pressable style={[rsStyles.primaryButton, { justifyContent: 'center', marginTop: 16, marginBottom: 16 }]} onPress={handleSalvarAtendimento} disabled={isSalvandoAtendimento}>
                    {isSalvandoAtendimento ? <ActivityIndicator color="#FFFFFF" /> : <Text style={rsStyles.primaryButtonText}>Salvar</Text>}
                  </Pressable>
                </ScrollView>
              </View>
            </View>
          ) : null}
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
        <RsPageHeader icon="message-circle" title="WhatsApp" subtitle="Fila de atendimento e conversas ativas." />

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          <View style={[rsStyles.kpiCard, { borderLeftColor: '#1F3A5F', flex: 1, minWidth: 0 }]}>
            <Text style={[rsStyles.kpiLabel, { color: '#1F3A5F' }]}>NA FILA</Text>
            <Text style={rsStyles.kpiValue}>{formatNumeroBR(contadores?.fila ?? 0)}</Text>
          </View>
          <View style={[rsStyles.kpiCard, { borderLeftColor: '#1F3A5F', flex: 1, minWidth: 0 }]}>
            <Text style={[rsStyles.kpiLabel, { color: '#1F3A5F' }]}>EM ATENDIMENTO</Text>
            <Text style={rsStyles.kpiValue}>{formatNumeroBR(contadores?.em_atendimento ?? 0)}</Text>
          </View>
          <View style={[rsStyles.kpiCard, { borderLeftColor: '#1F3A5F', flex: 1, minWidth: 0 }]}>
            <Text style={[rsStyles.kpiLabel, { color: '#1F3A5F' }]}>FINALIZADAS HOJE</Text>
            <Text style={rsStyles.kpiValue}>{formatNumeroBR(contadores?.finalizadas_hoje ?? 0)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Pressable
            style={[rsStyles.primaryButton, { flex: 1, justifyContent: 'center' }]}
            onPress={() => setIsNovaConversaOpen(true)}
          >
            <Feather name="edit" size={14} color="#FFFFFF" />
            <Text style={rsStyles.primaryButtonText}>Nova conversa</Text>
          </Pressable>
          <Pressable style={rsStyles.waIconButton} onPress={load}>
            <Feather name="refresh-cw" size={16} color="#5E667D" />
          </Pressable>
        </View>

        <RsSearchInput value={busca} onChangeText={setBusca} placeholder="Buscar por nome, telefone ou tag..." />

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 8 }}>
          {RS_WA_ABA_OPTIONS.map((opt) => (
            <Pressable key={opt.value} style={[rsStyles.waAbaPill, { flex: 1 }, aba === opt.value ? rsStyles.waAbaPillActive : null]} onPress={() => setAba(opt.value)}>
              <Text style={[rsStyles.waAbaPillText, aba === opt.value ? rsStyles.waAbaPillTextActive : null]} numberOfLines={1}>
                {opt.label} ({contadores?.abas[opt.value] ?? 0})
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          {(
            [
              { value: 'todos' as const, label: 'Todos' },
              { value: 'whatsapp' as const, label: 'WA' },
              { value: 'instagram' as const, label: 'IG' },
              { value: 'facebook' as const, label: 'FB' },
            ]
          ).map((opt) => (
            <Pressable
              key={opt.value}
              style={[rsStyles.waAbaPill, { flex: 1 }, canal === opt.value ? rsStyles.waAbaPillActiveCinza : null]}
              onPress={() => setCanal(opt.value)}
            >
              <Text style={[rsStyles.waAbaPillText, canal === opt.value ? rsStyles.waAbaPillTextActive : null]} numberOfLines={1}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginTop: 20 }} />
        ) : errorMessage ? (
          <RsEmptyState message={errorMessage} />
        ) : conversasFiltradas.length === 0 ? (
          <RsEmptyState message="Nenhuma conversa encontrada." />
        ) : (
          conversasFiltradas.map((conversa) => (
            <Pressable key={conversa.phone} style={rsStyles.dreCard} onPress={() => abrirChat(conversa)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  {conversa.nao_assumido ? <View style={rsStyles.waDotLaranja} /> : null}
                  <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                    {conversa.display_name ?? conversa.phone}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={rsStyles.listRowMeta}>{formatDateTimeBR(conversa.ultima_mensagem_em)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {(conversa.nao_lidas ?? 0) > 0 ? (
                      <View style={rsStyles.waUnreadBadge}>
                        <Text style={rsStyles.waUnreadBadgeText}>{conversa.nao_lidas}</Text>
                      </View>
                    ) : null}
                    <View style={[rsStyles.badge, { backgroundColor: '#E8EEF6' }]}>
                      <Text style={[rsStyles.badgeText, { color: '#1F3A5F' }]}>{conversa.chat_status_label ?? conversa.chat_status}</Text>
                    </View>
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
                <Text style={rsStyles.listRowMeta} numberOfLines={1}>
                  {conversa.ultima_mensagem ?? 'Sem mensagens ainda'}
                </Text>
              </View>
              <Text style={rsStyles.listRowMeta}>
                {conversa.atendente_nome ?? 'Sem atendente'} · {conversa.channel}
              </Text>
              {conversa.tags.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {conversa.tags.map((tag) => (
                    <View key={tag} style={rsStyles.waTagChip}>
                      <Text style={rsStyles.waTagChipText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
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

        <View style={rsStyles.vagaTabsRow}>
          <Pressable style={[rsStyles.vagaTabButton, activeTab === 'routines' ? rsStyles.vagaTabButtonActive : null]} onPress={() => setActiveTab('routines')}>
            <Text style={[rsStyles.vagaTabText, activeTab === 'routines' ? rsStyles.vagaTabTextActive : null]}>Rotinas</Text>
          </Pressable>
          <Pressable style={[rsStyles.vagaTabButton, activeTab === 'templates' ? rsStyles.vagaTabButtonActive : null]} onPress={() => setActiveTab('templates')}>
            <Text style={[rsStyles.vagaTabText, activeTab === 'templates' ? rsStyles.vagaTabTextActive : null]}>Templates</Text>
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

const RS_CONFIG_TABS: Array<{ id: RsConfigTab; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { id: 'triagem', label: 'Modelos de Triagem', icon: 'clipboard' },
  { id: 'avaliacoes', label: 'Provas e DISC', icon: 'file-text' },
  { id: 'admissao', label: 'Admissão', icon: 'check-square' },
  { id: 'wa', label: 'WhatsApp R&S', icon: 'message-circle' },
  { id: 'alertasIa', label: 'Alertas de IA', icon: 'sliders' },
  { id: 'telegram', label: 'Alertas', icon: 'bell' },
];

function RsConfigTriagemTab() {
  const [modelos, setModelos] = useState<RecrutamentoTriagemModelo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecrutamentoTriagemModelo | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [perguntas, setPerguntas] = useState<string[]>(['']);

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
    setDescricao('');
    setPerguntas(['']);
    setIsFormOpen(true);
  };
  const openEdit = (m: RecrutamentoTriagemModelo) => {
    setEditing(m);
    setNome(m.nome);
    setDescricao(m.descricao ?? '');
    setPerguntas(m.perguntas.length > 0 ? m.perguntas : ['']);
    setIsFormOpen(true);
  };
  const handleAddPergunta = () => setPerguntas((current) => [...current, '']);
  const handleChangePergunta = (index: number, value: string) => {
    setPerguntas((current) => current.map((p, i) => (i === index ? value : p)));
  };
  const handleRemovePergunta = (index: number) => {
    setPerguntas((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  };
  const handleSave = () => {
    const perguntasFinal = perguntas.map((p) => p.trim()).filter(Boolean);
    if (!nome.trim() || perguntasFinal.length === 0) {
      Alert.alert('Campos obrigatórios', 'Informe o nome e ao menos uma pergunta.');
      return;
    }
    const body = { nome, descricao: descricao || null, perguntas: perguntasFinal };
    const request = editing ? updateRecrutamentoTriagemModelo(editing.id, body) : createRecrutamentoTriagemModelo(body);
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
      <View style={rsStyles.chartCard}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={rsStyles.configSectionIconShell}>
            <Feather name="clipboard" size={17} color="#1F3A5F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rsStyles.configSectionTitle}>Modelos de Triagem (WhatsApp)</Text>
            <Text style={rsStyles.configSectionSubtitle}>
              Crie conjuntos de perguntas para enviar ao candidato por WhatsApp antes da entrevista. Os modelos ficam disponíveis para vincular em qualquer vaga.
            </Text>
          </View>
          <Pressable style={rsStyles.primaryButton} onPress={openCreate}>
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={rsStyles.primaryButtonText}>Novo modelo</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#1F3A5F" />
      ) : modelos.length === 0 ? (
        <View style={[rsStyles.chartCard, { alignItems: 'center' }]}>
          <View style={rsStyles.configEmptyIconShell}>
            <Feather name="message-circle" size={22} color="#1F3A5F" />
          </View>
          <Text style={rsStyles.configEmptyTitle}>Nenhum modelo cadastrado.</Text>
          <Text style={rsStyles.configEmptySubtitle}>Comece criando um conjunto de perguntas reutilizável.</Text>
          <Pressable style={[rsStyles.primaryButton, { marginTop: 14 }]} onPress={openCreate}>
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={rsStyles.primaryButtonText}>Criar primeiro modelo</Text>
          </Pressable>

          <View style={rsStyles.configEmptyDivider} />

          <View style={{ width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Feather name="zap" size={13} color="#B9770E" />
              <Text style={rsStyles.configExamplesLabel}>EXEMPLOS</Text>
            </View>
            {[
              'Qual sua disponibilidade de início?',
              'Qual sua pretensão salarial?',
              'Por que se interessou por esta vaga?',
              'Conte brevemente sua experiência na área.',
              'Você tem disponibilidade para o modelo presencial/híbrido?',
            ].map((exemplo) => (
              <Text key={exemplo} style={rsStyles.configExampleItem}>{'•'} {exemplo}</Text>
            ))}
          </View>
        </View>
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
      <RsModal visible={isFormOpen} title={editing ? 'Editar modelo de triagem' : 'Novo modelo de triagem'} onClose={() => setIsFormOpen(false)}>
        <RsFormLabel>Nome *</RsFormLabel>
        <RsTextInput value={nome} onChangeText={setNome} placeholder="Ex.: Triagem padrão Frentista" />
        <RsFormLabel>Descrição (opcional)</RsFormLabel>
        <RsTextInput value={descricao} onChangeText={setDescricao} multiline style={{ height: 70, textAlignVertical: 'top' }} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <RsFormLabel>Perguntas</RsFormLabel>
          <Pressable style={rsStyles.secondaryButton} onPress={handleAddPergunta}>
            <Feather name="plus" size={13} color="#1F3A5F" />
            <Text style={rsStyles.secondaryButtonText}>Adicionar</Text>
          </Pressable>
        </View>
        <Text style={[rsStyles.listRowMeta, { marginBottom: 8 }]}>Recomendado: 5 a 7 perguntas. Evite sim/não — peça contexto.</Text>
        {perguntas.map((pergunta, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A93A8', width: 16 }}>{index + 1}</Text>
            <RsTextInput
              value={pergunta}
              onChangeText={(text) => handleChangePergunta(index, text)}
              placeholder={`Pergunta ${index + 1}`}
              style={{ flex: 1 }}
            />
            <Pressable onPress={() => handleRemovePergunta(index)} hitSlop={6} disabled={perguntas.length <= 1}>
              <Feather name="x" size={16} color={perguntas.length > 1 ? '#E6213D' : '#C7CBD8'} />
            </Pressable>
          </View>
        ))}

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14, marginBottom: 16 }}>
          <Pressable style={rsStyles.secondaryButton} onPress={() => setIsFormOpen(false)}>
            <Text style={rsStyles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
          <Pressable style={rsStyles.primaryButton} onPress={handleSave}>
            <Text style={rsStyles.primaryButtonText}>{editing ? 'Salvar' : 'Criar modelo'}</Text>
          </Pressable>
        </View>
      </RsModal>
    </View>
  );
}

const RS_AVALIACAO_TIPO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'conhecimento', label: 'Prova de conhecimento' },
  { value: 'disc', label: 'DISC' },
];

function RsConfigAvaliacoesTab() {
  const [avaliacoes, setAvaliacoes] = useState<RecrutamentoAvaliacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecrutamentoAvaliacao | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('conhecimento');
  const [isTipoOpen, setIsTipoOpen] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [duracao, setDuracao] = useState('');
  const [notaCorte, setNotaCorte] = useState('');
  const [validadeDias, setValidadeDias] = useState('');
  const [ativa, setAtiva] = useState(true);

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
    setTipo('conhecimento');
    setDescricao('');
    setInstrucoes('');
    setDuracao('');
    setNotaCorte('');
    setValidadeDias('');
    setAtiva(true);
    setIsFormOpen(true);
  };
  const openEdit = (a: RecrutamentoAvaliacao) => {
    setEditing(a);
    setNome(a.nome);
    setTipo(a.tipo || 'conhecimento');
    setDescricao(a.descricao ?? '');
    setInstrucoes((a.instrucoes as string | undefined) ?? '');
    setDuracao(a.duracao_min != null ? String(a.duracao_min) : '');
    setNotaCorte((a.nota_corte as number | string | undefined) != null ? String(a.nota_corte) : '');
    setValidadeDias(a.validade_dias != null ? String(a.validade_dias) : '');
    setAtiva((a.ativa as boolean | undefined) ?? true);
    setIsFormOpen(true);
  };
  const handleSave = () => {
    if (!nome.trim() || !tipo.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe o título e o tipo.');
      return;
    }
    const body = {
      nome,
      tipo,
      descricao: descricao || null,
      instrucoes: instrucoes || null,
      duracao_min: duracao ? Number(duracao) : null,
      nota_corte: notaCorte ? Number(notaCorte) : null,
      validade_dias: validadeDias ? Number(validadeDias) : null,
      ativa,
    };
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

  type RsDiscGrupo = { id?: string; nome: string; d: string; i: string; s: string; c: string };
  const [questoesAvaliacao, setQuestoesAvaliacao] = useState<RecrutamentoAvaliacao | null>(null);
  const [grupos, setGrupos] = useState<RsDiscGrupo[]>([]);
  const [removedGrupoIds, setRemovedGrupoIds] = useState<string[]>([]);
  const [isLoadingGrupos, setIsLoadingGrupos] = useState(false);
  const [isSavingGrupos, setIsSavingGrupos] = useState(false);

  const questaoToGrupo = (q: RecrutamentoQuestao): RsDiscGrupo => {
    const opcoes = q.opcoes ?? [];
    const find = (fator: string) => opcoes.find((o) => o.fator === fator)?.texto ?? '';
    return { id: q.id, nome: q.enunciado, d: find('D'), i: find('I'), s: find('S'), c: find('C') };
  };
  const grupoToBody = (g: RsDiscGrupo, avaliacaoId: string, ordem: number) => ({
    avaliacao_id: avaliacaoId,
    tipo: 'disc',
    enunciado: g.nome,
    ordem,
    opcoes: [
      { id: 'a', fator: 'D', texto: g.d },
      { id: 'b', fator: 'I', texto: g.i },
      { id: 'c', fator: 'S', texto: g.s },
      { id: 'd', fator: 'C', texto: g.c },
    ],
  });

  const openQuestoes = (a: RecrutamentoAvaliacao) => {
    setQuestoesAvaliacao(a);
    setRemovedGrupoIds([]);
    setIsLoadingGrupos(true);
    fetchRecrutamentoQuestoes(a.id)
      .then((qs) => setGrupos(qs.length > 0 ? qs.map(questaoToGrupo) : [{ nome: 'Grupo 1', d: '', i: '', s: '', c: '' }]))
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar as questões.')))
      .finally(() => setIsLoadingGrupos(false));
  };
  const handleAddGrupo = () => setGrupos((current) => [...current, { nome: `Grupo ${current.length + 1}`, d: '', i: '', s: '', c: '' }]);
  const handleChangeGrupo = (index: number, field: 'nome' | 'd' | 'i' | 's' | 'c', value: string) => {
    setGrupos((current) => current.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  };
  const handleRemoveGrupo = (index: number) => {
    setGrupos((current) => {
      const removed = current[index];
      if (removed?.id) setRemovedGrupoIds((ids) => [...ids, removed.id as string]);
      return current.filter((_, i) => i !== index);
    });
  };
  const handleSaveQuestoes = () => {
    if (!questoesAvaliacao) return;
    setIsSavingGrupos(true);
    const avaliacaoId = questoesAvaliacao.id;
    Promise.all([
      ...removedGrupoIds.map((id) => deleteRecrutamentoQuestao(id)),
      ...grupos.map((g, idx) => {
        const body = grupoToBody(g, avaliacaoId, idx + 1);
        return g.id ? updateRecrutamentoQuestao(g.id, body) : createRecrutamentoQuestao(body);
      }),
    ])
      .then(() => {
        setQuestoesAvaliacao(null);
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar as questões.')))
      .finally(() => setIsSavingGrupos(false));
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <Text style={[rsStyles.listRowMeta, { flex: 1, lineHeight: 17 }]}>
          Crie provas de conhecimento (objetivas com gabarito e dissertativas corrigidas por IA) e mantenha o teste DISC. Depois envie por WhatsApp em Candidatos ou na Triagem.
        </Text>
        <Pressable style={rsStyles.primaryButton} onPress={openCreate}>
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={rsStyles.primaryButtonText}>Nova avaliação</Text>
        </Pressable>
      </View>
      <Text style={[rsStyles.countLabel, { marginBottom: 10 }]}>{isLoading ? 'Carregando...' : `${avaliacoes.length} avaliação(ões)`}</Text>
      {isLoading ? (
        <ActivityIndicator color="#1F3A5F" />
      ) : avaliacoes.length === 0 ? (
        <RsEmptyState message="Nenhuma avaliação cadastrada." />
      ) : (
        avaliacoes.map((a) => (
          <View key={a.id} style={rsStyles.dreCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[rsStyles.configEmptyIconShell, { width: 34, height: 34, borderRadius: 17, marginBottom: 0, backgroundColor: a.tipo === 'disc' ? '#F1E9FB' : '#E8EEF6' }]}>
                <Feather name={a.tipo === 'disc' ? 'users' : 'file-text'} size={15} color={a.tipo === 'disc' ? '#7C3AED' : '#1F3A5F'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={rsStyles.listRowTitle}>{a.nome}</Text>
                <Text style={[rsStyles.listRowMeta, { color: a.tipo === 'disc' ? '#7C3AED' : '#3457D5' }]}>
                  {RS_AVALIACAO_TIPO_OPTIONS.find((o) => o.value === a.tipo)?.label ?? a.tipo}
                  {a.duracao_min ? ` · ${a.duracao_min} min` : ''}
                  {a.validade_dias ? ` · link vale ${a.validade_dias}d` : ''}
                </Text>
              </View>
            </View>
            {a.descricao ? <Text style={[rsStyles.listRowMeta, { marginTop: 6 }]}>{a.descricao}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => openQuestoes(a)}>
                <Feather name="list" size={14} color="#5E667D" />
                <Text style={[rsStyles.listRowMeta, { fontWeight: '700', color: '#5E667D' }]}>Questões</Text>
              </Pressable>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => openEdit(a)} hitSlop={6}>
                <Feather name="edit-2" size={14} color="#3457D5" />
                <Text style={[rsStyles.listRowMeta, { fontWeight: '700', color: '#3457D5' }]}>Editar</Text>
              </Pressable>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} onPress={() => handleDelete(a)} hitSlop={6}>
                <Feather name="trash-2" size={14} color="#E6213D" />
                <Text style={[rsStyles.listRowMeta, { fontWeight: '700', color: '#E6213D' }]}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      <RsModal visible={isFormOpen} title={editing ? 'Editar avaliação' : 'Nova avaliação'} onClose={() => setIsFormOpen(false)}>
        <RsFormLabel>Título *</RsFormLabel>
        <RsTextInput value={nome} onChangeText={setNome} placeholder="Ex.: Prova de conhecimentos" />

        <View style={{ marginTop: 12, zIndex: isTipoOpen ? 200 : 1, position: 'relative' }}>
          <RsFormLabel>Tipo</RsFormLabel>
          <RsFieldDropdown
            label={RS_AVALIACAO_TIPO_OPTIONS.find((o) => o.value === tipo)?.label ?? 'Selecione'}
            options={RS_AVALIACAO_TIPO_OPTIONS}
            selectedValue={tipo}
            isOpen={isTipoOpen}
            onToggle={() => setIsTipoOpen((v) => !v)}
            onSelect={(v) => {
              setTipo(v as string);
              setIsTipoOpen(false);
            }}
          />
        </View>

        <RsFormLabel>Descrição</RsFormLabel>
        <RsTextInput value={descricao} onChangeText={setDescricao} multiline style={{ height: 80, textAlignVertical: 'top' }} placeholder="Ex.: Teste DISC padrão de 20 grupos..." />

        <RsFormLabel>Instruções ao candidato</RsFormLabel>
        <RsTextInput value={instrucoes} onChangeText={setInstrucoes} multiline style={{ height: 80, textAlignVertical: 'top' }} placeholder="Ex.: Responda com sinceridade, não há resposta certa ou errada." />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <RsFormLabel>Tempo (min)</RsFormLabel>
            <RsTextInput value={duracao} onChangeText={setDuracao} placeholder="30" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <RsFormLabel>Nota corte (%)</RsFormLabel>
            <RsTextInput value={notaCorte} onChangeText={setNotaCorte} placeholder="60" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <RsFormLabel>Validade (dias)</RsFormLabel>
            <RsTextInput value={validadeDias} onChangeText={setValidadeDias} placeholder="7" keyboardType="number-pad" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <ToggleSwitch value={ativa} onValueChange={() => setAtiva((v) => !v)} />
          <Text style={rsStyles.formLabel}>Ativa (disponível para envio)</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18, marginBottom: 16 }}>
          <Pressable style={rsStyles.secondaryButton} onPress={() => setIsFormOpen(false)}>
            <Text style={rsStyles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
          <Pressable style={rsStyles.primaryButton} onPress={handleSave}>
            <Text style={rsStyles.primaryButtonText}>Salvar</Text>
          </Pressable>
        </View>
      </RsModal>

      <RsModal
        visible={!!questoesAvaliacao}
        title={`Questões — ${questoesAvaliacao?.nome ?? ''}`}
        onClose={() => setQuestoesAvaliacao(null)}
      >
        {isLoadingGrupos ? <ActivityIndicator color="#1F3A5F" style={{ marginVertical: 20 }} /> : null}
        {!isLoadingGrupos && grupos.map((grupo, index) => (
          <View key={index} style={[rsStyles.dreCard, { marginTop: index === 0 ? 0 : 4 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[rsStyles.listRowMeta, { fontWeight: '800', color: '#3457D5' }]}>{index + 1}. Grupo DISC</Text>
              <Pressable onPress={() => handleRemoveGrupo(index)} hitSlop={6}>
                <Feather name="trash-2" size={15} color="#E6213D" />
              </Pressable>
            </View>
            <RsTextInput value={grupo.nome} onChangeText={(v) => handleChangeGrupo(index, 'nome', v)} placeholder={`Grupo ${index + 1}`} style={{ marginBottom: 8 }} />
            {(['d', 'i', 's', 'c'] as const).map((letra) => (
              <View key={letra} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#3457D5', width: 14 }}>{letra.toUpperCase()}</Text>
                <RsTextInput
                  value={grupo[letra]}
                  onChangeText={(v) => handleChangeGrupo(index, letra, v)}
                  placeholder={letra === 'd' ? 'Ex.: Decidido' : letra === 'i' ? 'Ex.: Animado' : letra === 's' ? 'Ex.: Paciente' : 'Ex.: Cuidadoso'}
                  style={{ flex: 1 }}
                />
              </View>
            ))}
          </View>
        ))}

        <Pressable style={[rsStyles.secondaryButton, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={handleAddGrupo}>
          <Feather name="plus" size={13} color="#1F3A5F" />
          <Text style={rsStyles.secondaryButtonText}>Adicionar grupo</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14, marginBottom: 16 }}>
          <Pressable style={rsStyles.secondaryButton} onPress={() => setQuestoesAvaliacao(null)}>
            <Text style={rsStyles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
          <Pressable style={rsStyles.primaryButton} onPress={handleSaveQuestoes} disabled={isSavingGrupos}>
            <Text style={rsStyles.primaryButtonText}>{isSavingGrupos ? 'Salvando...' : 'Salvar'}</Text>
          </Pressable>
        </View>
      </RsModal>
    </View>
  );
}

const RS_KIT_TIPO_CONTRATO_OPTIONS = ['CLT', 'PJ', 'ESTAGIO', 'JOVEM_APRENDIZ', 'TEMPORARIO', 'TERCEIRIZADO'];

function RsConfigAdmissaoTab() {
  const [docs, setDocs] = useState<RecrutamentoDocAdmissao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecrutamentoDocAdmissao | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [obrigatorio, setObrigatorio] = useState(true);
  const [aceitaVariosArquivos, setAceitaVariosArquivos] = useState(false);
  const [ativoForm, setAtivoForm] = useState(true);
  const [ordem, setOrdem] = useState('');

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
    setAceitaVariosArquivos(false);
    setAtivoForm(true);
    setOrdem('');
    setIsFormOpen(true);
  };
  const openEdit = (d: RecrutamentoDocAdmissao) => {
    setEditing(d);
    setNome(d.nome);
    setDescricao(d.descricao ?? '');
    setObrigatorio(d.obrigatorio);
    setAceitaVariosArquivos(d.aceita_varios_arquivos ?? false);
    setAtivoForm(d.ativo);
    setOrdem(d.ordem != null ? String(d.ordem) : '');
    setIsFormOpen(true);
  };
  const handleSave = () => {
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do documento.');
      return;
    }
    const body = {
      nome,
      descricao,
      obrigatorio,
      aceita_varios_arquivos: aceitaVariosArquivos,
      ativo: ativoForm,
      ordem: ordem ? Number(ordem) : undefined,
    };
    const request = editing ? updateRecrutamentoDocAdmissao(editing.id, body) : createRecrutamentoDocAdmissao(body);
    request
      .then(() => {
        setIsFormOpen(false);
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar.')));
  };
  const handleDelete = (d: RecrutamentoDocAdmissao) => {
    Alert.alert('Excluir documento', `Excluir "${d.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteRecrutamentoDocAdmissao(d.id).then(load).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir.'))) },
    ]);
  };

  const [kits, setKits] = useState<RecrutamentoKitAdmissao[]>([]);
  const [isLoadingKits, setIsLoadingKits] = useState(true);
  const [isKitFormOpen, setIsKitFormOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<RecrutamentoKitAdmissao | null>(null);
  const [kitNome, setKitNome] = useState('');
  const [kitCargo, setKitCargo] = useState('');
  const [kitTipoContrato, setKitTipoContrato] = useState('CLT');
  const [isKitTipoOpen, setIsKitTipoOpen] = useState(false);
  const [kitDocIds, setKitDocIds] = useState<string[]>([]);

  const loadKits = useCallback(() => {
    setIsLoadingKits(true);
    fetchRecrutamentoKitsAdmissao()
      .then(setKits)
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar os kits.')))
      .finally(() => setIsLoadingKits(false));
  }, []);

  useEffect(() => {
    loadKits();
  }, [loadKits]);

  const openCreateKit = () => {
    setEditingKit(null);
    setKitNome('');
    setKitCargo('');
    setKitTipoContrato('CLT');
    setKitDocIds([]);
    setIsKitFormOpen(true);
  };
  const openEditKit = (k: RecrutamentoKitAdmissao) => {
    setEditingKit(k);
    setKitNome(k.nome);
    setKitCargo(k.cargo ?? '');
    setKitTipoContrato(k.tipo_contrato ?? 'CLT');
    setKitDocIds(k.doc_tipo_ids ?? []);
    setIsKitFormOpen(true);
  };
  const toggleKitDoc = (docId: string) => {
    setKitDocIds((current) => (current.includes(docId) ? current.filter((id) => id !== docId) : [...current, docId]));
  };
  const handleSaveKit = () => {
    if (!kitNome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do kit.');
      return;
    }
    saveRecrutamentoKitAdmissao({
      id: editingKit?.id,
      nome: kitNome,
      cargo: kitCargo || undefined,
      tipo_contrato: kitTipoContrato || undefined,
      doc_tipo_ids: kitDocIds,
    })
      .then(() => {
        setIsKitFormOpen(false);
        loadKits();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar o kit.')));
  };
  const handleDeleteKit = (k: RecrutamentoKitAdmissao) => {
    Alert.alert('Excluir kit', `Excluir "${k.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteRecrutamentoKitAdmissao(k.id).then(loadKits).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir.'))) },
    ]);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="folder" size={15} color="#1F3A5F" />
          <Text style={rsStyles.sectionTitle}>Catálogo de documentos</Text>
        </View>
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
            <Text style={[rsStyles.listRowTitle, { fontWeight: '600' }]} numberOfLines={1}>
              {d.nome}
            </Text>
            {d.descricao ? <Text style={rsStyles.listRowMeta}>{d.descricao}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {d.obrigatorio ? <RsBadge label="Obrigatório" color="#B7791F" bg="#FCF4DE" /> : <RsBadge label="Opcional" color="#5E667D" bg="#F1F2F6" />}
                {!d.ativo ? <RsBadge label="Inativo" color="#E6213D" bg="#FCEAEA" /> : null}
              </View>
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

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="package" size={15} color="#1F3A5F" />
          <Text style={rsStyles.sectionTitle}>Kits de admissão</Text>
        </View>
        <Pressable style={rsStyles.primaryButton} onPress={openCreateKit}>
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={rsStyles.primaryButtonText}>Novo kit</Text>
        </Pressable>
      </View>
      {isLoadingKits ? (
        <ActivityIndicator color="#1F3A5F" />
      ) : kits.length === 0 ? (
        <RsEmptyState message="Nenhum kit de admissão cadastrado." />
      ) : (
        kits.map((k) => (
          <View key={k.id} style={rsStyles.dreCard}>
            <Text style={[rsStyles.listRowTitle, { fontWeight: '600' }]} numberOfLines={1}>{k.nome}</Text>
            <Text style={rsStyles.listRowMeta}>
              {(k.doc_tipo_ids ?? []).length} documento(s){k.tipo_contrato ? ` · ${k.tipo_contrato.toUpperCase()}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 14, marginTop: 8 }}>
              <Pressable onPress={() => openEditKit(k)} hitSlop={6}>
                <Feather name="edit-2" size={15} color="#3457D5" />
              </Pressable>
              <Pressable onPress={() => handleDeleteKit(k)} hitSlop={6}>
                <Feather name="trash-2" size={15} color="#E6213D" />
              </Pressable>
            </View>
          </View>
        ))
      )}

      <RsModal visible={isFormOpen} title={editing ? 'Editar documento' : 'Novo documento'} onClose={() => setIsFormOpen(false)}>
        <RsFormLabel>Nome *</RsFormLabel>
        <RsTextInput value={nome} onChangeText={setNome} placeholder="Ex.: RG ou CNH" />
        <RsFormLabel>Descrição / orientação ao candidato</RsFormLabel>
        <RsTextInput value={descricao} onChangeText={setDescricao} placeholder="Ex.: Documento de identidade com foto (frente e verso)" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 14 }}>
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setObrigatorio((v) => !v)}>
            <Feather name={obrigatorio ? 'check-square' : 'square'} size={17} color={obrigatorio ? '#1F3A5F' : '#A7AEC2'} />
            <Text style={rsStyles.formLabel}>Obrigatório</Text>
          </Pressable>
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setAceitaVariosArquivos((v) => !v)}>
            <Feather name={aceitaVariosArquivos ? 'check-square' : 'square'} size={17} color={aceitaVariosArquivos ? '#1F3A5F' : '#A7AEC2'} />
            <Text style={rsStyles.formLabel}>Aceita vários arquivos</Text>
          </Pressable>
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setAtivoForm((v) => !v)}>
            <Feather name={ativoForm ? 'check-square' : 'square'} size={17} color={ativoForm ? '#1F3A5F' : '#A7AEC2'} />
            <Text style={rsStyles.formLabel}>Ativo</Text>
          </Pressable>
        </View>

        <RsFormLabel>Ordem</RsFormLabel>
        <RsTextInput value={ordem} onChangeText={setOrdem} placeholder="10" keyboardType="number-pad" style={{ width: 100 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16, marginBottom: 16 }}>
          <Pressable style={rsStyles.secondaryButton} onPress={() => setIsFormOpen(false)}>
            <Text style={rsStyles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
          <Pressable style={rsStyles.primaryButton} onPress={handleSave}>
            <Text style={rsStyles.primaryButtonText}>Salvar</Text>
          </Pressable>
        </View>
      </RsModal>

      <RsModal visible={isKitFormOpen} title={editingKit ? 'Editar kit' : 'Novo kit de admissão'} onClose={() => setIsKitFormOpen(false)}>
        <RsFormLabel>Nome *</RsFormLabel>
        <RsTextInput value={kitNome} onChangeText={setKitNome} placeholder="Ex.: Admissão CLT (padrão)" />
        <RsFormLabel>Cargo (opcional)</RsFormLabel>
        <RsTextInput value={kitCargo} onChangeText={setKitCargo} placeholder="Ex.: Frentista" />
        <View style={{ marginTop: 12, zIndex: isKitTipoOpen ? 200 : 1, position: 'relative' }}>
          <RsFormLabel>Tipo de contrato</RsFormLabel>
          <RsFieldDropdown
            label={kitTipoContrato}
            options={RS_KIT_TIPO_CONTRATO_OPTIONS.map((v) => ({ value: v, label: v }))}
            selectedValue={kitTipoContrato}
            isOpen={isKitTipoOpen}
            onToggle={() => setIsKitTipoOpen((v) => !v)}
            onSelect={(v) => {
              setKitTipoContrato(v as string);
              setIsKitTipoOpen(false);
            }}
          />
        </View>

        <RsFormLabel>Documentos do kit</RsFormLabel>
        {docs.map((d) => {
          const checked = kitDocIds.includes(d.id);
          return (
            <Pressable key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }} onPress={() => toggleKitDoc(d.id)}>
              <Feather name={checked ? 'check-square' : 'square'} size={17} color={checked ? '#1F3A5F' : '#A7AEC2'} />
              <Text style={rsStyles.formLabel}>{d.nome}</Text>
            </Pressable>
          );
        })}

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16, marginBottom: 16 }}>
          <Pressable style={rsStyles.secondaryButton} onPress={() => setIsKitFormOpen(false)}>
            <Text style={rsStyles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
          <Pressable style={rsStyles.primaryButton} onPress={handleSaveKit}>
            <Text style={rsStyles.primaryButtonText}>Salvar</Text>
          </Pressable>
        </View>
      </RsModal>
    </View>
  );
}

// "WhatsApp R&S": vincula um modelo de triagem a cada vaga aberta (a
// triagem automática via WhatsApp roda a partir desse vínculo).
type RsWaSubTab = 'conexao' | 'webhook' | 'templatesMeta' | 'janela24h';
const RS_WA_SUBTABS: Array<{ id: RsWaSubTab; label: string }> = [
  { id: 'conexao', label: 'Conexão' },
  { id: 'webhook', label: 'Webhook' },
  { id: 'templatesMeta', label: 'Templates Meta' },
  { id: 'janela24h', label: 'Janela 24h' },
];

const RS_WA_PROVIDER_LABEL: Record<AdminWaProvider, string> = {
  zapresponder: 'ZapResponder (API oficial)',
  meta_cloud: 'Meta Cloud API (direto)',
};

const RS_WA_CANAL = 'rs';
// Base confirmada pelo próprio painel web — montamos a URL no app porque a
// API devolve webhookUrl=null quando o segredo ainda não foi gerado (mas o
// painel mostra a URL base mesmo assim).
const RS_WA_WEBHOOK_BASE = 'https://americanfuel.com.br/api/public/wa/webhook';

function RsConfigWhatsAppTab() {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;

  const [activeSubTab, setActiveSubTab] = useState<RsWaSubTab>('conexao');
  const [waConfig, setWaConfig] = useState<AdminWaConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  const [providerForm, setProviderForm] = useState<AdminWaProvider>('zapresponder');
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [enabledForm, setEnabledForm] = useState(true);
  const [apiUrlForm, setApiUrlForm] = useState('');
  const [departmentIdForm, setDepartmentIdForm] = useState('');
  const [apiTokenField, setApiTokenField] = useState('');
  const [apiTokenEdited, setApiTokenEdited] = useState(false);
  const [isApiTokenVisible, setIsApiTokenVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [numeroExibidoForm, setNumeroExibidoForm] = useState('');
  const [apelidoCanalForm, setApelidoCanalForm] = useState('');

  const [isRotating, setIsRotating] = useState(false);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [revealedUrl, setRevealedUrl] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [revealedApiToken, setRevealedApiToken] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [justCopiedUrl, setJustCopiedUrl] = useState(false);
  const [justCopiedSecret, setJustCopiedSecret] = useState(false);

  const [diagnosticoTelefone, setDiagnosticoTelefone] = useState('');
  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);
  const [testingTemplateName, setTestingTemplateName] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AdminWaTemplateItem | null>(null);

  const applyConfig = useCallback((config: AdminWaConfig) => {
    setWaConfig(config);
    setProviderForm(config.provider ?? 'zapresponder');
    setEnabledForm(config.enabled);
    setApiUrlForm(config.apiUrl ?? '');
    setDepartmentIdForm(config.departmentId ?? '');
    setNumeroExibidoForm(config.numeroExibicao ?? '');
    setApelidoCanalForm(config.rotulo ?? '');
    setApiTokenField('');
    setApiTokenEdited(false);
  }, []);

  const load = useCallback(() => {
    setIsLoadingConfig(true);
    fetchAdminWaConfig({ actorId, canal: RS_WA_CANAL })
      .then(applyConfig)
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível carregar a conexão do WhatsApp.')))
      .finally(() => setIsLoadingConfig(false));
  }, [actorId, applyConfig]);

  useEffect(() => {
    load();
  }, [load]);

  const [hasRevealed, setHasRevealed] = useState(false);

  const ensureRevealed = useCallback(async (): Promise<{ url: string | null; secret: string | null; apiToken: string | null } | null> => {
    if (hasRevealed) {
      return { url: revealedUrl, secret: revealedSecret, apiToken: revealedApiToken };
    }
    setIsRevealing(true);
    setRevealError(null);
    try {
      const data = await fetchAdminWaConfig({ reveal: true, actorId, canal: RS_WA_CANAL });
      // webhookSecret/webhookUrl nulos é um estado válido (segredo ainda não
      // gerado para este canal) — não é erro, confirmado pela Lovable.
      setRevealedUrl(data.webhookUrl ?? null);
      setRevealedSecret(data.webhookSecret ?? null);
      setRevealedApiToken(data.apiToken ?? null);
      setHasRevealed(true);
      return { url: data.webhookUrl ?? null, secret: data.webhookSecret ?? null, apiToken: data.apiToken ?? null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível revelar (só usuários master podem ver).';
      setRevealError(message);
      return null;
    } finally {
      setIsRevealing(false);
    }
  }, [actorId, hasRevealed, revealedUrl, revealedSecret, revealedApiToken]);

  useEffect(() => {
    if (activeSubTab === 'webhook' && !hasRevealed && !isRevealing && !revealError) {
      ensureRevealed();
    }
  }, [activeSubTab, hasRevealed, isRevealing, revealError, ensureRevealed]);

  const handleToggleApiTokenVisible = () => {
    if (isApiTokenVisible) {
      setIsApiTokenVisible(false);
      return;
    }
    ensureRevealed().then((revealed) => {
      if (revealed?.apiToken) {
        setApiTokenField(revealed.apiToken);
        setIsApiTokenVisible(true);
      } else {
        Alert.alert('Não foi possível revelar', revealError ?? 'Só usuários master podem ver o token completo.');
      }
    });
  };
  const handleCopy = (text: string | null, onDone: () => void) => {
    if (!text) return;
    Clipboard.setStringAsync(text).then(onDone).catch(() => Alert.alert('Não foi possível copiar', 'Tente novamente.'));
  };

  const handleSaveConexao = () => {
    setIsSaving(true);
    const body: Parameters<typeof updateAdminWaConfig>[0] = {
      provider: providerForm,
      enabled: enabledForm,
      api_url: apiUrlForm,
      department_id: departmentIdForm,
      numero_exibicao: numeroExibidoForm,
      rotulo: apelidoCanalForm,
    };
    if (apiTokenEdited && apiTokenField) body.api_token = apiTokenField;
    updateAdminWaConfig(body, actorId, RS_WA_CANAL)
      .then((config) => {
        applyConfig(config);
        Alert.alert('Salvo', 'Conexão do WhatsApp atualizada.');
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar.')))
      .finally(() => setIsSaving(false));
  };
  const handleTestar = () => {
    setIsTesting(true);
    testAdminWaConnection(actorId, RS_WA_CANAL)
      .then(() => Alert.alert('Conexão OK', 'A conexão com o WhatsApp respondeu com sucesso.'))
      .catch((err) => Alert.alert('Falha na conexão', showRsError(err, 'Não foi possível conectar.')))
      .finally(() => setIsTesting(false));
  };
  const handleRotacionarSecret = () => {
    Alert.alert('Rotacionar segredo do webhook', 'Isso invalida a URL de webhook atual — será preciso atualizar no ZapResponder de novo. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rotacionar',
        style: 'destructive',
        onPress: () => {
          setIsRotating(true);
          rotateAdminWaWebhookSecret(actorId, RS_WA_CANAL)
            .then((res) => {
              setRevealedUrl(res.webhookUrl ?? null);
              setRevealedSecret(res.webhookSecret ?? null);
              setHasRevealed(true);
              Alert.alert('Segredo gerado', 'Atualize a URL no ZapResponder com o novo segredo.');
            })
            .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível rotacionar o segredo.')))
            .finally(() => setIsRotating(false));
        },
      },
    ]);
  };
  const handleSincronizarTemplates = () => {
    setIsSyncingTemplates(true);
    syncAdminWaTemplates(actorId, RS_WA_CANAL)
      .then((res) => setWaConfig((current) => (current ? { ...current, templates: res.templates } : current)))
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível sincronizar.')))
      .finally(() => setIsSyncingTemplates(false));
  };
  const handleTestarTemplate = (templateName: string, language: string | null) => {
    if (!diagnosticoTelefone.trim()) {
      Alert.alert('Informe o telefone', 'Preencha o telefone para diagnóstico de envio antes de testar.');
      return;
    }
    setTestingTemplateName(templateName);
    testAdminWaTemplate({ phone: diagnosticoTelefone.replace(/\D/g, ''), templateName, language: language ?? undefined }, actorId, RS_WA_CANAL)
      .then(() => Alert.alert('Enviado', `Template "${templateName}" enviado para teste.`))
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível testar o template.')))
      .finally(() => setTestingTemplateName(null));
  };

  const displayWebhookUrl =
    revealedUrl ?? `${RS_WA_WEBHOOK_BASE}?${revealedSecret ? `secret=${revealedSecret}&` : ''}canal=${RS_WA_CANAL}`;

  return (
    <View>
      <View style={rsStyles.chartCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[rsStyles.configSectionIconShell, { backgroundColor: '#E4F6EC' }]}>
            <Feather name="message-circle" size={17} color="#1E8E5A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rsStyles.configSectionTitle}>WhatsApp – Recrutamento</Text>
            <Text style={rsStyles.configSectionSubtitle}>Número e integração ZapResponder exclusivos do módulo de R&S.</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E6F0', marginTop: 14, marginBottom: 14 }}>
          {RS_WA_SUBTABS.map((tab) => {
            const active = activeSubTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[rsStyles.configTabItem, { flex: undefined, paddingHorizontal: 10 }, active ? rsStyles.configTabItemActive : null]}
                onPress={() => setActiveSubTab(tab.id)}
              >
                <Text style={[rsStyles.configTabItemText, active ? rsStyles.configTabItemTextActive : null]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {isLoadingConfig ? (
          <ActivityIndicator color="#1F3A5F" style={{ marginVertical: 20 }} />
        ) : activeSubTab === 'janela24h' ? (
          <View>
            <Text style={[rsStyles.sectionTitle, { marginBottom: 8 }]}>Como funciona a janela de 24 horas</Text>
            <Text style={[rsStyles.listRowMeta, { marginBottom: 10, lineHeight: 18 }]}>
              A política oficial da Meta permite enviar mensagens livres (texto, mídia) apenas dentro de 24h após a última mensagem recebida do contato. Fora dessa janela, é obrigatório usar um template aprovado.
            </Text>
            {[
              'O sistema bloqueia automaticamente envios livres com janela fechada e oferece a lista de templates aprovados.',
              'Cada nova mensagem do contato reinicia a contagem de 24h.',
              'Templates não consomem janela e podem ser enviados a qualquer momento.',
            ].map((item) => (
              <Text key={item} style={[rsStyles.listRowMeta, { marginBottom: 6, lineHeight: 17 }]}>{'•'} {item}</Text>
            ))}
          </View>
        ) : activeSubTab === 'conexao' ? (
          <View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Número exibido</RsFormLabel>
                <RsTextInput value={numeroExibidoForm} onChangeText={setNumeroExibidoForm} placeholder="21 92368-1143" />
              </View>
              <View style={{ flex: 1 }}>
                <RsFormLabel>Apelido do canal</RsFormLabel>
                <RsTextInput value={apelidoCanalForm} onChangeText={setApelidoCanalForm} placeholder="Rh" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <View>
                <Text style={rsStyles.sectionTitle}>Status de integração</Text>
                <Text style={rsStyles.listRowMeta}>Quando desligado, nenhum envio é processado.</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <RsBadge label={enabledForm ? 'Ativo' : 'Inativo'} color={enabledForm ? '#1E8E5A' : '#5E667D'} bg={enabledForm ? '#E4F6EC' : '#F1F2F6'} />
                <ToggleSwitch value={enabledForm} onValueChange={() => setEnabledForm((v) => !v)} />
              </View>
            </View>

            <View style={{ marginTop: 14, zIndex: isProviderOpen ? 200 : 1, position: 'relative' }}>
              <RsFormLabel>Provedor</RsFormLabel>
              <RsFieldDropdown
                label={RS_WA_PROVIDER_LABEL[providerForm]}
                options={[
                  { value: 'zapresponder' as AdminWaProvider, label: RS_WA_PROVIDER_LABEL.zapresponder },
                  { value: 'meta_cloud' as AdminWaProvider, label: RS_WA_PROVIDER_LABEL.meta_cloud },
                ]}
                selectedValue={providerForm}
                isOpen={isProviderOpen}
                onToggle={() => setIsProviderOpen((v) => !v)}
                onSelect={(v) => {
                  setProviderForm(v as AdminWaProvider);
                  setIsProviderOpen(false);
                }}
              />
            </View>

            <RsFormLabel>API URL</RsFormLabel>
            <RsTextInput value={apiUrlForm} onChangeText={setApiUrlForm} placeholder="https://api.zapresponder.com.br/api" autoCapitalize="none" />

            <RsFormLabel>Department ID</RsFormLabel>
            <RsTextInput value={departmentIdForm} onChangeText={setDepartmentIdForm} placeholder="Department ID do ZapResponder" autoCapitalize="none" />

            <RsFormLabel>API Token</RsFormLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RsTextInput
                value={apiTokenEdited || isApiTokenVisible ? apiTokenField : waConfig?.apiTokenMasked ?? ''}
                onChangeText={(v) => {
                  setApiTokenField(v);
                  setApiTokenEdited(true);
                  setIsApiTokenVisible(false);
                }}
                placeholder={waConfig?.hasApiToken ? '••••••••••••' : 'Cole o token aqui'}
                autoCapitalize="none"
                style={{ flex: 1 }}
              />
              <Pressable onPress={handleToggleApiTokenVisible} hitSlop={8} disabled={isRevealing}>
                <Feather name={isApiTokenVisible ? 'eye-off' : 'eye'} size={17} color="#5E667D" />
              </Pressable>
            </View>
            <Text style={[rsStyles.listRowMeta, { marginTop: 4 }]}>
              Gere em app.zapresponder.com.br → Integrações → API. Toque no olho para ver o token completo (só usuários master) — edite o campo só se quiser trocar por um novo.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 4 }}>
              <Pressable style={rsStyles.primaryButton} onPress={handleSaveConexao} disabled={isSaving}>
                <Text style={rsStyles.primaryButtonText}>{isSaving ? 'Salvando...' : 'Salvar'}</Text>
              </Pressable>
              <Pressable style={rsStyles.secondaryButton} onPress={handleTestar} disabled={isTesting}>
                <Text style={rsStyles.secondaryButtonText}>{isTesting ? 'Testando...' : 'Testar conexão'}</Text>
              </Pressable>
            </View>
          </View>
        ) : activeSubTab === 'webhook' ? (
          <View>
            <Text style={[rsStyles.sectionTitle, { marginBottom: 4 }]}>URL do webhook (com segredo embutido)</Text>
            <Text style={[rsStyles.listRowMeta, { marginBottom: 12, lineHeight: 18 }]}>
              Cole esta URL completa no painel ZapResponder em Integrações → Webhook. O segredo vai como query string ?secret=... porque o ZapResponder não permite configurar header customizado.
            </Text>

            {isRevealing ? (
              <ActivityIndicator color="#1F3A5F" style={{ marginVertical: 12 }} />
            ) : revealError ? (
              <RsEmptyState message={revealError} />
            ) : (
              <>
                {!revealedSecret ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Feather name="alert-triangle" size={13} color="#B7791F" />
                    <Text style={[rsStyles.listRowMeta, { color: '#B7791F', fontWeight: '700' }]}>Gere o segredo abaixo antes de copiar a URL.</Text>
                  </View>
                ) : null}
                <View style={[rsStyles.textInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <Text style={{ fontSize: 13, color: '#15203E', flex: 1 }} numberOfLines={1}>{displayWebhookUrl}</Text>
                  <Pressable onPress={() => handleCopy(displayWebhookUrl, () => { setJustCopiedUrl(true); setTimeout(() => setJustCopiedUrl(false), 1500); })} hitSlop={8}>
                    <Feather name={justCopiedUrl ? 'check' : 'copy'} size={16} color={justCopiedUrl ? '#1E8E5A' : '#5E667D'} />
                  </Pressable>
                </View>

                <Text style={[rsStyles.sectionTitle, { marginTop: 14, marginBottom: 4 }]}>Segredo do webhook</Text>
                <Text style={[rsStyles.listRowMeta, { marginBottom: 8 }]}>
                  Já vai embutido na URL acima — você não precisa colar em lugar nenhum separado.
                </Text>
                <View style={[rsStyles.textInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <Text style={{ fontSize: 13, color: '#15203E', flex: 1 }} numberOfLines={1}>
                    {isSecretVisible ? revealedSecret ?? '— ainda não gerado —' : '•'.repeat(24)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable onPress={() => setIsSecretVisible((v) => !v)} hitSlop={8}>
                      <Feather name={isSecretVisible ? 'eye-off' : 'eye'} size={16} color="#5E667D" />
                    </Pressable>
                    <Pressable onPress={() => handleCopy(revealedSecret, () => { setJustCopiedSecret(true); setTimeout(() => setJustCopiedSecret(false), 1500); })} hitSlop={8}>
                      <Feather name={justCopiedSecret ? 'check' : 'copy'} size={16} color={justCopiedSecret ? '#1E8E5A' : '#5E667D'} />
                    </Pressable>
                  </View>
                </View>

                <Pressable style={[rsStyles.primaryButton, { alignSelf: 'flex-start', marginTop: 14 }]} onPress={handleRotacionarSecret} disabled={isRotating}>
                  <Feather name="refresh-cw" size={13} color="#FFFFFF" />
                  <Text style={rsStyles.primaryButtonText}>{isRotating ? 'Gerando...' : 'Gerar / Rotacionar'}</Text>
                </Pressable>
              </>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#E8EEF6', borderRadius: 10, padding: 12, marginTop: 16 }}>
              <Feather name="info" size={15} color="#1F3A5F" />
              <Text style={[rsStyles.listRowMeta, { flex: 1, lineHeight: 18 }]}>
                Instruções no ZapResponder{'\n'}
                1. Acesse Integrações → Webhook{'\n'}
                2. Cole a URL completa acima (já com ?secret=...){'\n'}
                3. Eventos: mensagens recebidas + status de entrega{'\n'}
                4. Salvar — pronto, sem header customizado.
              </Text>
            </View>
          </View>
        ) : (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={rsStyles.sectionTitle}>Templates aprovados</Text>
                <Text style={rsStyles.listRowMeta}>Necessários para iniciar conversa fora da janela 24h.</Text>
              </View>
              <Pressable style={[rsStyles.secondaryButton, { paddingHorizontal: 9, paddingVertical: 6, gap: 4 }]} onPress={handleSincronizarTemplates} disabled={isSyncingTemplates}>
                <Feather name="refresh-cw" size={11} color="#1F3A5F" />
                <Text style={[rsStyles.secondaryButtonText, { fontSize: 11 }]}>{isSyncingTemplates ? 'Sincronizando...' : 'Sincronizar agora'}</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#E8EEF6', borderRadius: 10, padding: 12, marginTop: 10, marginBottom: 4 }}>
              <Feather name="clock" size={15} color="#1F3A5F" />
              <Text style={[rsStyles.listRowMeta, { flex: 1, lineHeight: 18 }]}>
                Sincronização automática 1x por dia (madrugada). Última:{' '}
                {formatDateTimeBR(
                  (waConfig?.templates ?? []).reduce<string | null>(
                    (latest, t) => (t.lastSyncedAt && (!latest || t.lastSyncedAt > latest) ? t.lastSyncedAt : latest),
                    null
                  )
                )}
                . Para puxar um template recém-aprovado agora, use o botão acima.
              </Text>
            </View>

            <RsFormLabel>Telefone para diagnóstico de envio</RsFormLabel>
            <RsTextInput
              value={diagnosticoTelefone}
              onChangeText={(v) => setDiagnosticoTelefone(rsMaskTelefone(v.replace(/\D/g, '')))}
              placeholder="(21) 92368-1143"
              keyboardType="phone-pad"
            />

            {(waConfig?.templates ?? []).length === 0 ? (
              <RsEmptyState message="Nenhum template sincronizado ainda." />
            ) : (
              (waConfig?.templates ?? []).map((t, idx) => (
                <View key={t.templateName ?? idx} style={[rsStyles.dreCard, { marginTop: idx === 0 ? 16 : 0 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={rsStyles.listRowTitle} numberOfLines={1}>{t.templateName}</Text>
                    <RsBadge label={t.status ?? '—'} color="#B7791F" bg="#FBE8CC" />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    {t.language ? <RsBadge label={t.language} color="#5E667D" bg="#F1F2F6" /> : null}
                    {t.category ? <RsBadge label={t.category} color="#5E667D" bg="#F1F2F6" /> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <Pressable
                      style={rsStyles.secondaryButton}
                      onPress={() => handleTestarTemplate(t.templateName ?? '', t.language)}
                      disabled={testingTemplateName === t.templateName}
                    >
                      <Text style={rsStyles.secondaryButtonText}>{testingTemplateName === t.templateName ? 'Testando...' : 'Testar'}</Text>
                    </Pressable>
                    <Pressable onPress={() => setSelectedTemplate(t)} hitSlop={8} style={{ marginLeft: 'auto' }}>
                      <Feather name="chevron-right" size={18} color="#8A93A8" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      <RsModal visible={!!selectedTemplate} title={selectedTemplate?.templateName ?? ''} onClose={() => setSelectedTemplate(null)}>
        {selectedTemplate ? (
          <View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              {selectedTemplate.language ? <RsBadge label={selectedTemplate.language} color="#5E667D" bg="#F1F2F6" /> : null}
              {selectedTemplate.category ? <RsBadge label={selectedTemplate.category} color="#5E667D" bg="#F1F2F6" /> : null}
              {selectedTemplate.status ? <RsBadge label={selectedTemplate.status} color="#B7791F" bg="#FBE8CC" /> : null}
            </View>
            <Text style={[rsStyles.listRowMeta, { marginBottom: 14 }]}>
              Sincronizado em {formatDateTimeBR(selectedTemplate.lastSyncedAt)}
            </Text>

            {(() => {
              const components = Array.isArray(selectedTemplate.components) ? (selectedTemplate.components as Array<Record<string, unknown>>) : [];
              const body = components.find((c) => c.type === 'BODY');
              const footer = components.find((c) => c.type === 'FOOTER');
              const buttonsComp = components.find((c) => c.type === 'BUTTONS');
              const bodyText = typeof body?.text === 'string' ? body.text : null;
              const footerText = typeof footer?.text === 'string' ? footer.text : null;
              const buttons = Array.isArray(buttonsComp?.buttons) ? (buttonsComp.buttons as Array<Record<string, unknown>>) : [];
              const variaveis = bodyText ? Array.from(new Set(bodyText.match(/\{\{\d+\}\}/g) ?? [])) : [];

              return (
                <>
                  {bodyText ? (
                    <>
                      <RsFormLabel>Corpo</RsFormLabel>
                      <View style={{ backgroundColor: '#E7F5EC', borderRadius: 10, padding: 12 }}>
                        <Text style={{ fontSize: 13, color: '#15203E', lineHeight: 19 }}>{bodyText}</Text>
                      </View>
                    </>
                  ) : null}

                  {footerText ? (
                    <>
                      <RsFormLabel>Rodapé</RsFormLabel>
                      <View style={rsStyles.dreCard}>
                        <Text style={{ fontSize: 13, color: '#15203E' }}>{footerText}</Text>
                      </View>
                    </>
                  ) : null}

                  {buttons.length > 0 ? (
                    <>
                      <RsFormLabel>Botões</RsFormLabel>
                      <View style={{ backgroundColor: '#FCF4DE', borderRadius: 10, padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {buttons.map((b, idx) => (
                          <RsBadge
                            key={idx}
                            label={`${b.text as string}${b.type ? ` · ${b.type}` : ''}`}
                            color="#B7791F"
                            bg="#FFFFFF"
                          />
                        ))}
                      </View>
                    </>
                  ) : null}

                  {variaveis.length > 0 ? (
                    <>
                      <RsFormLabel>Variáveis dinâmicas</RsFormLabel>
                      <View style={{ backgroundColor: '#FCF4DE', borderRadius: 10, padding: 12 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                          {variaveis.map((v) => (
                            <RsBadge key={v} label={v} color="#B7791F" bg="#FFFFFF" />
                          ))}
                        </View>
                        <Text style={[rsStyles.listRowMeta]}>Estes valores precisam ser preenchidos no momento do envio.</Text>
                      </View>
                    </>
                  ) : null}

                  {!bodyText && !footerText && buttons.length === 0 ? (
                    <RsEmptyState message="Sem detalhes de componentes para este template." />
                  ) : null}
                </>
              );
            })()}

            <View style={{ height: 16 }} />
          </View>
        ) : null}
      </RsModal>
    </View>
  );
}

function RsConfigAlertasIaTab() {
  const [alertas, setAlertas] = useState<RecrutamentoAlertaIa[]>([]);
  const [limiteAtivos, setLimiteAtivos] = useState(8);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecrutamentoAlertaIa | null>(null);
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
  const openCreate = () => {
    setEditing(null);
    setNome('');
    setDescricao('');
    setIsFormOpen(true);
  };
  const openEdit = (a: RecrutamentoAlertaIa) => {
    setEditing(a);
    setNome(a.titulo);
    setDescricao(a.instrucao);
    setIsFormOpen(true);
  };
  const handleSave = () => {
    if (!nome.trim() || !descricao.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe nome e descrição do alerta.');
      return;
    }
    const request = editing
      ? updateRecrutamentoAlertaIa(editing.id, { titulo: nome, instrucao: descricao })
      : createRecrutamentoAlertaIa({ titulo: nome, instrucao: descricao });
    request
      .then(() => {
        setIsFormOpen(false);
        load();
      })
      .catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível salvar o alerta.')));
  };
  const handleDelete = (a: RecrutamentoAlertaIa) => {
    Alert.alert('Excluir alerta', `Excluir "${a.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteRecrutamentoAlertaIa(a.id).then(load).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível excluir.'))) },
    ]);
  };

  return (
    <View>
      <View style={[rsStyles.chartCard, { backgroundColor: '#FDF6EC', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }]}>
        <View style={[rsStyles.configSectionIconShell, { backgroundColor: '#FBE8CC' }]}>
          <Feather name="zap" size={17} color="#B7791F" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={rsStyles.configSectionTitle}>Alertas de IA para análise de currículo</Text>
          <Text style={rsStyles.configSectionSubtitle}>
            Prompts adicionais aplicados em toda análise de candidato (no upload do currículo e na reanálise). A IA usa essas instruções para gerar alertas customizados no resultado.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <RsBadge label={`${ativosCount}/${limiteAtivos} ativos`} color="#B7791F" bg="#FBE8CC" />
            <Pressable style={rsStyles.primaryButton} onPress={openCreate}>
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={rsStyles.primaryButtonText}>Novo alerta</Text>
            </Pressable>
          </View>
        </View>
      </View>
      {isLoading ? (
        <ActivityIndicator color="#1F3A5F" />
      ) : alertas.length === 0 ? (
        <RsEmptyState message="Nenhum alerta de IA cadastrado." />
      ) : (
        alertas.map((a) => (
          <View key={a.id} style={rsStyles.dreCard}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Feather name="alert-triangle" size={15} color="#E6213D" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                  {a.titulo}
                </Text>
                <Text style={rsStyles.listRowMeta}>{a.instrucao}</Text>
              </View>
              <RsSmallToggle value={a.ativo} onValueChange={() => toggleAtivo(a)} />
            </View>
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
      <RsModal visible={isFormOpen} title={editing ? 'Editar alerta de IA' : 'Novo alerta de IA'} onClose={() => setIsFormOpen(false)}>
        <RsFormLabel>Nome*</RsFormLabel>
        <RsTextInput value={nome} onChangeText={setNome} placeholder="Ex.: Currículo com experiência em varejo" />
        <RsFormLabel>Descrição*</RsFormLabel>
        <RsTextInput value={descricao} onChangeText={setDescricao} multiline style={{ height: 90, textAlignVertical: 'top' }} placeholder="O que a IA deve identificar no currículo" />
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12, marginBottom: 16 }}>
          <Pressable style={rsStyles.secondaryButton} onPress={() => setIsFormOpen(false)}>
            <Text style={rsStyles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
          <Pressable style={rsStyles.primaryButton} onPress={handleSave}>
            <Text style={rsStyles.primaryButtonText}>Salvar</Text>
          </Pressable>
        </View>
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

  const handleUpdate = (patch: { ativo?: boolean; avisar_conversa_nova?: boolean; avisar_candidato_novo?: boolean }) => {
    // O PATCH devolve só os campos alterados (sem "destinos"), então recarrega
    // o config inteiro em vez de substituir o estado com a resposta crua —
    // fazer isso causava um crash (config.destinos.filter em undefined).
    updateRecrutamentoTelegram(patch).then(load).catch((err) => Alert.alert('Erro', showRsError(err, 'Não foi possível atualizar.')));
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

  const destinosAtivos = config.destinos.filter((d) => d.ativo).length;

  return (
    <View>
      <View style={rsStyles.chartCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Feather name="bell" size={15} color="#1F3A5F" />
            <Text style={rsStyles.sectionTitle}>Avisos no Telegram</Text>
            {config.chatTitulo ? <RsBadge label={config.chatTitulo} color="#1F3A5F" bg="#E8EEF6" /> : null}
            <RsBadge label={config.ativo ? 'Ativo' : 'Inativo'} color={config.ativo ? '#1E8E5A' : '#5E667D'} bg={config.ativo ? '#E4F6EC' : '#F1F2F6'} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={rsStyles.formLabel}>Ligar</Text>
            <RsSmallToggle value={config.ativo} onValueChange={() => handleUpdate({ ativo: !config.ativo })} />
          </View>
        </View>
        <Text style={[rsStyles.listRowMeta, { marginTop: 6 }]}>
          Só notificação — nada de conversa por aqui. Os alertas vão para todos os destinatários ativos da lista abaixo.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FC', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text style={rsStyles.formLabel}>Conversa nova no WhatsApp</Text>
            <RsSmallToggle value={config.conversa_nova} onValueChange={() => handleUpdate({ avisar_conversa_nova: !config.conversa_nova })} />
          </View>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FC', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text style={rsStyles.formLabel}>Cadastro novo de candidato</Text>
            <RsSmallToggle value={config.candidato_novo} onValueChange={() => handleUpdate({ avisar_candidato_novo: !config.candidato_novo })} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <Pressable style={rsStyles.secondaryButton} onPress={handleTeste}>
            <Feather name="send" size={13} color="#1F3A5F" />
            <Text style={rsStyles.secondaryButtonText}>Enviar teste</Text>
          </Pressable>
          {config.ultimoEnvioAt ? <Text style={rsStyles.listRowMeta}>Último aviso: {formatDateTimeBR(config.ultimoEnvioAt)}</Text> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="users" size={15} color="#1F3A5F" />
          <Text style={rsStyles.sectionTitle}>Quem recebe os avisos</Text>
          <RsBadge label={`${destinosAtivos} ativo(s) de ${config.destinos.length}`} color="#1F3A5F" bg="#E8EEF6" />
        </View>
        <Pressable
          style={rsStyles.secondaryButton}
          onPress={() => Alert.alert('Em breve', 'A busca de novos contatos do Telegram ainda depende de um endpoint a confirmar com a Lovable.')}
        >
          <Feather name="refresh-cw" size={13} color="#1F3A5F" />
          <Text style={rsStyles.secondaryButtonText}>Buscar novos</Text>
        </Pressable>
      </View>
      <Text style={[rsStyles.listRowMeta, { marginBottom: 10 }]}>
        Para entrar na lista, a pessoa abre o bot no Telegram e envia /start. Depois clique em "Buscar novos" e ative quem deve receber.
      </Text>
      {config.destinos.length === 0 ? (
        <RsEmptyState message="Nenhum destino cadastrado no Telegram." />
      ) : (
        config.destinos.map((d) => (
          <View key={d.id} style={rsStyles.dreCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={rsStyles.listRowTitle} numberOfLines={1}>
                {d.titulo || d.chat_id || 'Destinatário'}
              </Text>
              <RsSmallToggle value={d.ativo} onValueChange={() => handleToggleDestino(d.id, d.ativo)} />
            </View>
            <Text style={rsStyles.listRowMeta}>
              {d.tipo === 'group' ? 'Grupo' : 'Conversa privada'}
              {d.ultimo_envio_at ? ` · último aviso ${formatDateTimeBR(d.ultimo_envio_at)}` : ''}
            </Text>
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

        <View style={rsStyles.configTabsRow}>
          {RS_CONFIG_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[rsStyles.configTabItem, active ? rsStyles.configTabItemActive : null]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Feather name={tab.icon} size={13} color={active ? '#1F3A5F' : '#8A93A8'} />
                <Text style={[rsStyles.configTabItemText, active ? rsStyles.configTabItemTextActive : null]} numberOfLines={2}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
  rowMenuButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  actionsMenuCard: {
    width: '84%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  actionsMenuTitle: {
    color: '#9AA1B5',
    fontSize: 11.5,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionsMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F7',
  },
  actionsMenuRowText: {
    color: '#15203E',
    fontSize: 13.5,
    fontWeight: '600',
  },
  actionsMenuRowLast: {
    borderBottomWidth: 0,
  },
  vagaNaLpLabel: { fontSize: 10, fontWeight: '800', color: '#7C8397' },
  // Abas Visão Geral / Candidatos·Triagem / Funil da tela de detalhe da vaga.
  vagaTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F2F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  vagaTabButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  vagaTabButtonActive: { backgroundColor: '#FFFFFF', elevation: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  vagaTabText: { fontSize: 12, fontWeight: '700', color: '#7C8397' },
  vagaTabTextActive: { color: '#1F3A5F' },
  vagaStatCell: { flex: 1, minWidth: '45%' },
  vagaStatLabel: { fontSize: 10, fontWeight: '800', color: '#9AA1B5', letterSpacing: 0.3 },
  vagaStatValue: { fontSize: 14, fontWeight: '800', color: '#15203E', marginTop: 3 },
  vagaDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F1F2F6' },
  vagaDetailLabel: { fontSize: 12, color: '#9AA1B5' },
  vagaDetailValue: { fontSize: 12, fontWeight: '700', color: '#15203E', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  beneficioChip: { backgroundColor: '#F1F2F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  beneficioChipText: { fontSize: 12, fontWeight: '700', color: '#3D4560' },
  funilStatCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  funilStatLabel: { fontSize: 10, fontWeight: '800', color: '#9AA1B5', letterSpacing: 0.3 },
  funilStatValue: { fontSize: 18, fontWeight: '800', color: '#15203E', marginTop: 2 },
  funilStatSub: { fontSize: 11, color: '#7C8397', marginTop: 2 },
  funilFlowCard: { flex: 1, minWidth: 96, borderRadius: 12, padding: 10 },
  funilFlowValue: { fontSize: 18, fontWeight: '800', color: '#15203E' },
  funilFlowLabel: { fontSize: 10, fontWeight: '800', color: '#3D4560', marginTop: 4 },
  funilFlowPct: { fontSize: 10, color: '#5E667D', marginTop: 2 },
  funilStageCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  funilStageTitle: { fontSize: 12, fontWeight: '800', color: '#15203E' },
  funilStageSub: { fontSize: 11, color: '#7C8397', marginTop: 1, marginBottom: 6 },
  funilStageName: { fontSize: 12.5, color: '#3D4560', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#F5F6FA' },
  candModalCard: { width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18 },
  candModalTitle: { fontSize: 15, fontWeight: '800', color: '#15203E' },
  candModalSubtitle: { fontSize: 12, color: '#7C8397', marginTop: 2, marginBottom: 10 },
  candModalFieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 6 },
  candModalField: { minWidth: '42%' },
  candModalFieldLabel: { fontSize: 10, fontWeight: '800', color: '#9AA1B5', letterSpacing: 0.3 },
  candModalFieldValue: { fontSize: 13, fontWeight: '700', color: '#15203E', marginTop: 3 },
  candModalCloseButton: { marginTop: 18, alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8 },
  candModalCloseText: { fontSize: 13, fontWeight: '700', color: '#1F3A5F' },
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
  // Backdrop CENTRALIZADO — usado pelo menu de "..." da vaga e pelo modal
  // rápido de candidato, que no painel web aparecem no meio da tela (não
  // como bottom sheet, que é o padrão do modalBackdrop acima).
  actionsMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,20,40,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#15203E' },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#5E667D', marginTop: 12, marginBottom: 6 },
  faixaSalarialSubLabel: { fontSize: 11, fontWeight: '700', color: '#9AA1B5', marginBottom: 4 },
  roteiroMsgBubble: { backgroundColor: '#E7F5EC', borderRadius: 12, padding: 12, marginBottom: 10 },
  roteiroMsgLabel: { fontSize: 10, fontWeight: '800', color: '#18955A', marginBottom: 4, letterSpacing: 0.3 },
  roteiroMsgText: { fontSize: 13, color: '#15203E', lineHeight: 18 },
  roteiroQuestionCard: { borderWidth: 1, borderColor: '#E2E6F0', borderRadius: 12, padding: 12, marginBottom: 10 },
  roteiroQuestionText: { fontSize: 13, color: '#15203E', lineHeight: 18 },
  roteiroOptionText: { fontSize: 12.5, color: '#3D4560', marginTop: 4, marginLeft: 6 },
  candAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1F3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  candAvatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
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
    flex: 1,
    minHeight: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
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
  rankNumber: {
    color: '#9AA3B5',
    fontSize: 12,
    fontWeight: '800',
    width: 14,
  },
  generoBarTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 8,
  },
  funilBarTrack: { height: 8, borderRadius: 4, backgroundColor: '#F1F2F6', marginTop: 4, overflow: 'hidden' },
  funilBarFill: { height: 8, borderRadius: 4 },
  chartTooltip: {
    backgroundColor: '#15203E',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  chartTooltipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
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
  configTabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E6F0', marginBottom: 14 },
  configTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
    paddingHorizontal: 3,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  configTabItemActive: { borderBottomColor: '#1F3A5F' },
  configTabItemText: { fontSize: 10, fontWeight: '700', color: '#8A93A8', textAlign: 'center', lineHeight: 12.5 },
  configTabItemTextActive: { color: '#1F3A5F', fontWeight: '800' },
  configSectionIconShell: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF1F8', alignItems: 'center', justifyContent: 'center' },
  configSectionTitle: { fontSize: 14, fontWeight: '800', color: '#15203E' },
  configSectionSubtitle: { fontSize: 12, color: '#7C8397', marginTop: 3, lineHeight: 17 },
  configEmptyIconShell: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#EEF1F8', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  configEmptyTitle: { fontSize: 14, fontWeight: '800', color: '#15203E' },
  configEmptySubtitle: { fontSize: 12, color: '#7C8397', marginTop: 4, textAlign: 'center' },
  configEmptyDivider: { height: 1, backgroundColor: '#EEF0F5', width: '100%', marginVertical: 16 },
  configExamplesLabel: { fontSize: 12, fontWeight: '800', color: '#B9770E' },
  configExampleItem: { fontSize: 12.5, color: '#5E667D', marginBottom: 6, lineHeight: 17 },
  smallToggleTrack: { width: 34, height: 20, borderRadius: 999, backgroundColor: '#E2E6F0', padding: 2, justifyContent: 'center' },
  smallToggleTrackOn: { backgroundColor: '#E0002A' },
  smallToggleKnob: { width: 16, height: 16, borderRadius: 999, backgroundColor: '#FFFFFF', alignSelf: 'flex-start' },
  smallToggleKnobOn: { alignSelf: 'flex-end' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  backRowText: { fontSize: 15, fontWeight: '800', color: '#1F3A5F' },
  waBubbleRow: { flexDirection: 'row', marginBottom: 6 },
  waBubble: { maxWidth: '80%', borderRadius: 10, paddingHorizontal: 10, paddingTop: 7, paddingBottom: 6 },
  waBubbleIn: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 2 },
  waBubbleOut: { backgroundColor: '#DCF8C6', borderTopRightRadius: 2 },
  waBubbleText: { color: '#0C1736', fontSize: 13.5, lineHeight: 18 },
  waBubbleTime: { color: '#8A8F99', fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  waDateDivider: { alignSelf: 'center', backgroundColor: '#E9E3DC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginVertical: 10 },
  waDateDividerText: { color: '#6B7280', fontSize: 11, fontWeight: '700' },
  waSystemMessage: { alignSelf: 'center', backgroundColor: '#FFF3D6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginVertical: 6, maxWidth: '85%' },
  waSystemMessageText: { color: '#8A6D1D', fontSize: 11, textAlign: 'center' },
  waAudioBubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 160, paddingVertical: 2 },
  waAudioPlayBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(12,23,54,0.08)', alignItems: 'center', justifyContent: 'center' },
  waAudioTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(12,23,54,0.15)' },
  waAudioTime: { color: '#5E667D', fontSize: 11, fontWeight: '700' },
  waImagemBubble: { width: 220, height: 220, borderRadius: 8, backgroundColor: '#E2E6F0' },
  waDocBubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 220 },
  waDocBubbleText: { color: '#0C1736', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  // Estrutura igual ao Marketing.tsx (mesmo motor de conversas) — só a cor
  // de destaque troca (azul do R&S em vez do rosa do Marketing).
  waIconButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#E2E6F0', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  waAbaPill: { borderRadius: 12, borderWidth: 1, borderColor: '#E2E6F0', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  waAbaPillActive: { backgroundColor: '#1F3A5F', borderColor: '#1F3A5F' },
  waAbaPillActiveCinza: { backgroundColor: '#5E667D', borderColor: '#5E667D' },
  waAbaPillText: { color: '#5E667D', fontSize: 11.5, fontWeight: '800' },
  waAbaPillTextActive: { color: '#FFFFFF' },
  waDotLaranja: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F5A623' },
  waUnreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  waUnreadBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  waTagChip: { backgroundColor: '#F1F2F6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  waTagChipText: { color: '#5E667D', fontSize: 10.5, fontWeight: '700' },
  waChatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#1F3A5F' },
  waChatAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  waChatAvatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  waChatHeaderName: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  waChatHeaderMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
  waChatHeaderBtn: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  waChatHeaderBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  waMenuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 },
  waMenuDropdown: { position: 'absolute', top: 54, right: 12, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 6, minWidth: 200, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, zIndex: 100 },
  waMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  waMenuItemText: { fontSize: 13, fontWeight: '600', color: '#3A415C' },
  waComposerIconBtn: { padding: 8 },
  waAtendimentoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', zIndex: 300 },
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
