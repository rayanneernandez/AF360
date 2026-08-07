import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useEventListener } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as ScreenCapture from 'expo-screen-capture';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import {
  NavigationContainer,
  createNavigationContainerRef,
  useIsFocused,
} from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import {
  Alert,
  AppState,
  Image,
  ImageBackground,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RHDashboardScreen,
  RHProfileScreen,
  RHColaboradoresScreen,
  RHColaboradorDetalheScreen,
  RHPreContratadosScreen,
  RHConformidadeAdmissoesScreen,
  RHTransferenciasScreen,
  RHComunicadosScreen,
  RHSolicitacoesScreen,
  RHImportarPdfScreen,
  RHNotificationsScreen,
  RHMetasScreen,
  RHPontoScreen,
  RHFeriasScreen,
  RHExperienciaScreen,
  RHFolhaPagamentoScreen,
  RHRecursosOperacionaisScreen,
  RHWorkflowScreen,
  RHRelatoriosScreen,
  RHConfiguracoesScreen,
} from './RH';
import {
  AdminDashboardScreen,
  AdminProfileScreen,
  AdminUsuariosScreen,
  AdminPerfilAcessoScreen,
  AdminGruposScreen,
  AdminUnidadesScreen,
  AdminModulosScreen,
  AdminIntegracoesScreen,
  AdminConvencoesScreen,
  AdminConfiguracoesScreen,
  AdminVersoesScreen,
  AdminNotificationsScreen,
  AdminLogsScreen,
  DirectorNotificationsPanelScreen,
} from './Administrador';
import {
  fetchConversas,
  fetchMensagens,
  updateConversa,
  login,
  fetchColaboradorHome,
  fetchColaboradorComunicados,
  fetchColaboradorSolicitacoes,
  fetchColaboradorMetas,
  fetchColaboradorTreinamentos,
  fetchColaboradorBeneficios,
  fetchColaboradorNotificacoes,
  fetchColaboradorContracheques,
  fetchRhColaboradorDetalhe,
  type RhColaboradorRaw,
  fetchColaboradorReembolsos,
  createColaboradorReembolso,
  type ColaboradorReembolsoItem,
  createColaboradorSolicitacao,
  fetchRhUniformesEntregas,
  fetchRhUniformesPedidos,
  fetchRhUniformesItens,
  criarPedidoUniforme,
  aprovarPedidoUniforme,
  recusarPedidoUniforme,
  type RhUniformeEntrega,
  type RhUniformePedido,
  type RhUniformeItemCatalogo,
  ApiError,
  type ConversaResumo,
  type ConversaMensagem,
  type ConversaChatStatus,
  type ConversaMetadata,
  type AuthIdentity,
  type ColaboradorHomeData,
  type ColaboradorComunicadoItem,
  type ColaboradorSolicitacaoItem,
  type ColaboradorMetaItem,
  type ColaboradorTreinamentoItem,
  type ColaboradorBeneficioItem,
  type ColaboradorNotificacaoItem,
  type ColaboradorContrachequeItem,
  type AdminTemaItem,
  fetchAdminTemas,
  updateAdminTema,
  fetchRhCalendarioEventos,
  type RhCalendarioEvento,
  fetchRhTreinamentoAulas,
  fetchRhTreinamentoQuestoes,
  fetchRhTreinamentoDetalhe,
  type RhTreinamentoAula,
  type RhTreinamentoQuestao,
  type RhTreinamentoCatalogo,
  submeterProvaTreinamento,
  updateRhTreinamentoInscricao,
  fetchRhTreinamentoInscricoes,
  marcarComunicadoLido,
  fetchDiretoriaPainel,
  type DiretoriaPainelRecurso,
  fetchDiretoriaProcessos,
  fetchDiretoriaProcessoDetalhe,
  createDiretoriaProcesso,
  updateDiretoriaProcesso,
  deleteDiretoriaProcesso,
  type DiretoriaProcessoRow,
  type DiretoriaProcessoEtapaRow,
  type DiretoriaProcessoStatus,
  type DiretoriaProcessoWriteBody,
} from './api';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  SelectPanel: undefined;
  DeviceAuth: undefined;
  TwoFactorVerification: undefined;
  Dashboard: undefined;
  Trainings: undefined;
  TrainingDetail: { courseId: string };
  TrainingExam: { courseId: string };
  TrainingExamResult: { courseId: string };
  Calendar: undefined;
  Goals: undefined;
  Benefits: undefined;
  Uniforms: undefined;
  Reimbursement: undefined;
  Payslips: undefined;
  Approvals: undefined;
  Notifications: undefined;
  Requests: undefined;
  Communications: undefined;
  Profile: undefined;
  ProfileSection: { sectionId: ProfileSectionId };
  SecuritySettings: undefined;
  DirectorDashboard: undefined;
  DirectorProfile: undefined;
  Sales: undefined;
  Margin: undefined;
  Stock: undefined;
  GnvMetrics: undefined;
  ProcessMap: undefined;
  DirectorNotifications: undefined;
  DirectorConversas: undefined;
  DirectorConversaDetalhe: { telefone: string; conversaInicial?: import('./api').ConversaResumo };
  RHDashboard: undefined;
  RHProfile: undefined;
  RHColaboradores: undefined;
  RHColaboradorDetalhe: { employeeId: string; employeeInicial?: import('./RH').Employee };
  RHPreContratados: undefined;
  RHConformidadeAdmissoes: undefined;
  RHTransferencias: undefined;
  RHComunicados: undefined;
  RHSolicitacoes: undefined;
  RHImportarPdf: undefined;
  RHNotifications: undefined;
  RHMetas: undefined;
  RHPonto: undefined;
  RHFerias: undefined;
  RHExperiencia: undefined;
  RHFolhaPagamento: undefined;
  RHRecursosOperacionais: undefined;
  RHWorkflow: undefined;
  RHRelatorios: undefined;
  RHConfiguracoes: undefined;
  AdminDashboard: undefined;
  AdminProfile: undefined;
  AdminUsuarios: undefined;
  AdminPerfilAcesso: undefined;
  AdminGrupos: undefined;
  AdminUnidades: undefined;
  AdminModulos: undefined;
  AdminIntegracoes: undefined;
  AdminConvencoes: undefined;
  AdminConfiguracoes: undefined;
  AdminVersoes: undefined;
  AdminNotifications: undefined;
  AdminLogs: undefined;
};

export type ScreenProps<RouteName extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  RouteName
>;

type DashboardCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tintColor: string;
  label: string;
  value: string;
  caption?: string | null;
};

type CalendarEvent = {
  id: string;
  day: number;
  monthShort: string;
  title: string;
  time: string;
  tag: string;
  tagColor: string;
  tagTint: string;
  dateTint: string;
  dateColor: string;
};

type CalendarMonthItem = {
  id: string;
  title: string;
  monthLabel: string;
  year: number;
  monthIndex: number;
  events: CalendarEvent[];
};

type BrazilHolidayApiItem = {
  date: string;
  name: string;
  type?: string;
};

type ReimbursementItem = {
  id: string;
  title: string;
  date: string;
  amount: string;
  status: string;
  statusColor: string;
  statusTint: string;
};

type RequestTicketItem = {
  id: string;
  ticketNumber: string;
  title: string;
  openedDate: string;
  department: string;
  status: string;
  statusColor: string;
  statusTint: string;
};

type RequestCategoryOption = {
  id: string;
  label: string;
  color: string;
  emoji?: string;
};

type UniformItem = {
  id: string;
  title: string;
  subtitle: string;
};

type ApprovalItem = {
  id: string;
  name: string;
  initials: string;
  description: string;
  tagLabel: string;
  tagColor: string;
  tagTint: string;
};

type TrainingLessonProgress = {
  watchedSeconds: number;
  completed: boolean;
};

type TrainingExamAttempt = {
  scorePercent: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
  minimumScore: number;
  reason: 'submitted' | 'timeout';
};

type TrainingCourseProgress = {
  lessons: Record<string, TrainingLessonProgress>;
  examAttempt?: TrainingExamAttempt;
};

type ProfileField = {
  label: string;
  value: string;
};

type ProfileSectionId = 'personal' | 'professional' | 'address' | 'documents' | 'banking';

type ProfileSection = {
  id: ProfileSectionId;
  label: string;
  fields: ProfileField[];
  cardNote?: string;
  footerNote?: string;
};

type SideMenuRoute =
  | 'Dashboard'
  | 'Trainings'
  | 'Calendar'
  | 'Goals'
  | 'Benefits'
  | 'Uniforms'
  | 'Reimbursement'
  | 'Communications'
  | 'Payslips'
  | 'Approvals'
  | 'Notifications'
  | 'Requests'
  | 'Profile';

export type UserRole = 'colaborador' | 'diretoria' | 'rh' | 'administrador';

type DirectorSideMenuRoute =
  | 'DirectorDashboard'
  | 'Sales'
  | 'Margin'
  | 'Stock'
  | 'GnvMetrics'
  | 'ProcessMap'
  | 'DirectorNotifications'
  | 'DirectorConversas'
  | 'DirectorProfile';

export type RHSideMenuRoute =
  | 'RHDashboard'
  | 'RHColaboradores'
  | 'RHPreContratados'
  | 'RHConformidadeAdmissoes'
  | 'RHTransferencias'
  | 'RHComunicados'
  | 'RHSolicitacoes'
  | 'RHImportarPdf'
  | 'RHNotifications'
  | 'RHMetas'
  | 'RHPonto'
  | 'RHFerias'
  | 'RHExperiencia'
  | 'RHFolhaPagamento'
  | 'RHRecursosOperacionais'
  | 'RHWorkflow'
  | 'RHRelatorios'
  | 'RHConfiguracoes'
  | 'RHProfile';

// "Administrador" é o painel de gestão da plataforma (Usuários, Perfil de
// Acesso, Grupos, Módulos, Integrações, etc.) — diferente da Diretoria, que é
// o painel de negócio (vendas/margem/estoque). Alguém pode ser só uma coisa,
// só a outra, ou as duas (o app já suporta múltiplos painéis por login desde
// o seletor "Entrar como...").
export type AdminSideMenuRoute =
  | 'AdminDashboard'
  | 'AdminUsuarios'
  | 'AdminPerfilAcesso'
  | 'AdminGrupos'
  | 'AdminUnidades'
  | 'AdminModulos'
  | 'AdminIntegracoes'
  | 'AdminConvencoes'
  | 'AdminConfiguracoes'
  | 'AdminVersoes'
  | 'AdminNotifications'
  | 'AdminLogs'
  | 'AdminProfile';

type SummaryCardItem = {
  id: string;
  label: string;
  value: string;
  meta?: string;
  marginValue: number;
};

type FuelSalesItem = {
  id: string;
  label: string;
  accentColor: string;
  value: string;
  volumeLabel: string;
  marginValue: number;
};

type MarginOffenderStation = {
  id: string;
  rank: number;
  name: string;
  pulledBy: string;
  percentLabel: string;
  deltaLabel: string;
  severity: 'critical' | 'warning';
};

type MarginOffenderCategory = {
  id: string;
  title: string;
  networkAverageLabel: string;
  stations: MarginOffenderStation[];
  offendersCount: number;
  impactLabel: string;
};

type StoreOffenderItem = {
  id: string;
  title: string;
  networkAverageLabel: string;
  stationName: string;
  percentLabel: string;
  deltaLabel: string;
};

type UnrecognizedCostItem = {
  id: string;
  stationName: string;
  severityLabel: string;
  productLabel: string;
  dateLabel: string;
  costLabel: string;
  referencePriceLabel: string;
  marginLabel: string;
  targetLabel: string;
};

type StockTankItem = {
  id: string;
  title: string;
  status: 'ok' | 'warning' | 'attention' | 'critical';
  statusLabel: string;
  subtitle: string;
  valueLabel: string;
  progress: number;
};

type StationTankItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  status: 'ok' | 'warning' | 'critical';
  statusLabel: string;
  valueLabel: string;
  capacityLabel: string;
  progress: number;
  levelLabel: string;
  autonomyLabel: string;
  averageConsumptionLabel: string;
  lastReadingLabel: string;
};

type GnvRiskStation = {
  id: string;
  name: string;
  volumeLabel: string;
  billingLabel: string;
  percentLabel: string;
};

type LowStockCategory = 'Loja Pista' | 'Conveniência';

type LowStockProductItem = {
  id: string;
  station: string;
  product: string;
  category: LowStockCategory;
  balanceLabel: string;
  last7DaysLabel: string;
  dailyConsumptionLabel: string;
  dailyRevenueLabel: string;
  coverageLabel: string;
  status: 'critical' | 'warning';
  statusLabel: string;
};

type ProcessStepItem = {
  id: string;
  title: string;
  description: string;
  owner: string;
  deadlineDays: string;
};

type ProcessFlowNodeType = 'inicio' | 'processo' | 'decisao' | 'fim';

type ProcessFlowNode = {
  id: string;
  type: ProcessFlowNodeType;
  label: string;
};

type ProcessMapItem = {
  id: string;
  title: string;
  description: string;
  status: DiretoriaProcessoStatus;
  statusLabel: string;
  department: string;
  linkedModule: string;
  owner: string;
  version: string;
  tags: string[];
  updatedAtLabel: string;
  steps: ProcessStepItem[];
  documentation: string;
  flow: ProcessFlowNode[];
};

export type NotificationChannels = {
  app: boolean;
  email: boolean;
  whatsapp: boolean;
};

export type NotificationAudienceType = 'todos' | 'colaboradores' | 'posto' | 'cargo';

export type NotificationTriggerKind = 'recorrente' | 'evento' | 'manual';

export type NotificationRoutineItem = {
  id: string;
  title: string;
  messageTitle: string;
  template: string;
  message: string;
  triggerKind: NotificationTriggerKind;
  cronSchedule: string;
  eventCode: string;
  channels: NotificationChannels;
  audienceType: NotificationAudienceType;
  audienceCargos: string[];
  lastRunLabel: string;
  enabled: boolean;
};

export type NotificationTemplateItem = {
  id: string;
  title: string;
  code: string;
  messageTitle: string;
  message: string;
  variables: string[];
  isSystemDefault: boolean;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function getNavigationRouteName(): keyof RootStackParamList | undefined {
  return navigationRef.getCurrentRoute()?.name as keyof RootStackParamList | undefined;
}

const MenuContext = createContext<{
  openMenu: () => void;
  closeMenu: () => void;
}>({
  openMenu: () => {},
  closeMenu: () => {},
});

const calendarYear = new Date().getFullYear();
export const calendarMonthNames = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const calendarMonthShortNames = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
];
const calendarEventsByMonth: Record<number, Omit<CalendarEvent, 'monthShort'>[]> = {
  5: [
    {
      id: 'e1',
      day: 2,
      title: 'Reunião de equipe',
      time: '09:00',
      tag: 'Reunião',
      tagColor: '#5E6DB4',
      tagTint: '#E9EEFF',
      dateTint: '#EEF1F8',
      dateColor: '#23408F',
    },
    {
      id: 'e2',
      day: 10,
      title: 'Treinamento NR-20 (Inflamáveis)',
      time: '14:00',
      tag: 'Treino',
      tagColor: '#B5841A',
      tagTint: '#FCF3DA',
      dateTint: '#F4F5F8',
      dateColor: '#15203E',
    },
    {
      id: 'e3',
      day: 19,
      title: 'Feriado — Corpus Christi',
      time: 'Dia todo',
      tag: 'Feriado',
      tagColor: '#E6213D',
      tagTint: '#FBE7EB',
      dateTint: '#FCE8EC',
      dateColor: '#E0002A',
    },
    {
      id: 'e4',
      day: 23,
      title: 'Aniversário · Carla Mendes',
      time: 'Equipe',
      tag: 'Pessoas',
      tagColor: '#2D9E6A',
      tagTint: '#E4F5EE',
      dateTint: '#F4F5F8',
      dateColor: '#15203E',
    },
    {
      id: 'e5',
      day: 28,
      title: 'Avaliação de desempenho',
      time: '10:30',
      tag: 'RH',
      tagColor: '#5E6DB4',
      tagTint: '#E9EEFF',
      dateTint: '#F4F5F8',
      dateColor: '#15203E',
    },
  ],
  6: [
    {
      id: 'e6',
      day: 2,
      title: 'Kickoff do semestre',
      time: '09:30',
      tag: 'Reunião',
      tagColor: '#5E6DB4',
      tagTint: '#E9EEFF',
      dateTint: '#EEF1F8',
      dateColor: '#23408F',
    },
  ],
};
const calendarMonths: CalendarMonthItem[] = Array.from({ length: 12 }, (_, monthIndex) => ({
  id: `${calendarYear}-${String(monthIndex + 1).padStart(2, '0')}`,
  title: `${calendarMonthNames[monthIndex].toLowerCase()} de ${calendarYear}`,
  monthLabel: `${calendarMonthNames[monthIndex]} · ${calendarYear}`,
  year: calendarYear,
  monthIndex,
  events: (calendarEventsByMonth[monthIndex] ?? []).map((event) => ({
    ...event,
    monthShort: calendarMonthShortNames[monthIndex],
  })),
}));
const holidayEventTheme = {
  tag: 'Feriado',
  tagColor: '#E6213D',
  tagTint: '#FBE7EB',
  dateTint: '#FCE8EC',
  dateColor: '#E0002A',
};
const reimbursements: ReimbursementItem[] = [
  {
    id: 'rb-1',
    title: 'Combustível - visita técnica',
    date: '12/05/2026',
    amount: 'R$ 142,90',
    status: 'Aprovado',
    statusColor: '#2B9862',
    statusTint: '#E2F4EA',
  },
  {
    id: 'rb-2',
    title: 'Estacionamento',
    date: '08/05/2026',
    amount: 'R$ 38,00',
    status: 'Em análise',
    statusColor: '#B5841A',
    statusTint: '#FCF3DA',
  },
  {
    id: 'rb-3',
    title: 'Curso externo',
    date: '02/05/2026',
    amount: 'R$ 320,00',
    status: 'Pendente',
    statusColor: '#5E6DB4',
    statusTint: '#E9EEFF',
  },
  {
    id: 'rb-4',
    title: 'Refeição em viagem',
    date: '28/04/2026',
    amount: 'R$ 76,50',
    status: 'Reprovado',
    statusColor: '#E0002A',
    statusTint: '#FCE8EC',
  },
];
const requestCategoryOptions: RequestCategoryOption[] = [
  { id: 'medical-certificate', label: 'Atestado médico', color: '#F2994A' },
  { id: 'benefits', label: 'Benefícios', color: '#E6449A' },
  { id: 'documents', label: 'Documentos', color: '#8B5CF6' },
  { id: 'payslip-questions', label: 'Dúvidas no contra-cheque', color: '#2D9E6A' },
  { id: 'vacation', label: 'Férias', color: '#5E6DB4', emoji: '☀️' },
  { id: 'others', label: 'Outros', color: '#8992A8' },
];

// Cada categoria da UI mapeia pra (setor, assunto) reais de rh_solicitacoes
// (enums confirmados pela Lovable em 03/08/2026).
const REQUEST_CATEGORY_TO_SOLICITACAO: Record<string, { setor: 'rh' | 'dp' | 'documentos' | 'outros'; assunto: string }> = {
  'medical-certificate': { setor: 'rh', assunto: 'rh_atestado' },
  benefits: { setor: 'rh', assunto: 'rh_beneficios' },
  documents: { setor: 'documentos', assunto: 'doc_outros' },
  'payslip-questions': { setor: 'dp', assunto: 'dp_holerite' },
  vacation: { setor: 'rh', assunto: 'rh_ferias' },
  others: { setor: 'outros', assunto: 'out_duvida' },
};
const uniforms: UniformItem[] = [
  { id: 'uniform-1', title: 'Camisa polo American Fuel', subtitle: 'Tam. M · 2 unidades' },
  { id: 'uniform-2', title: 'Calça operacional', subtitle: 'Tam. 42 · 2 unidades' },
  { id: 'uniform-3', title: 'Jaqueta corta-vento', subtitle: 'Tam. M · 1 unidade' },
  { id: 'uniform-4', title: 'Botina de segurança', subtitle: 'Tam. 41 · 1 unidade' },
];
const approvals: ApprovalItem[] = [
  {
    id: 'approval-1',
    name: 'Ana Souza',
    initials: 'AS',
    description: 'Férias · 15 dias a partir de 01/07',
    tagLabel: 'Férias',
    tagColor: '#6F76BE',
    tagTint: '#E8EAFA',
  },
  {
    id: 'approval-2',
    name: 'Carlos Dias',
    initials: 'CD',
    description: 'Reembolso de combustível · R$ 89,00',
    tagLabel: 'Reembolso',
    tagColor: '#A97700',
    tagTint: '#FCF3DA',
  },
  {
    id: 'approval-3',
    name: 'Marina Reis',
    initials: 'MR',
    description: 'Troca de turno · 14/06',
    tagLabel: 'Turno',
    tagColor: '#6F7890',
    tagTint: '#EEF0F5',
  },
  {
    id: 'approval-4',
    name: 'Pedro Lima',
    initials: 'PL',
    description: 'Folga · 02/06',
    tagLabel: 'Folga',
    tagColor: '#6F7890',
    tagTint: '#EEF0F5',
  },
];

const UniformReceiptContext = createContext<{
  receivedUniformIds: Record<string, boolean>;
  markUniformAsReceived: (uniformId: string) => void;
}>({
  receivedUniformIds: {},
  markUniformAsReceived: () => {},
});

const PayslipAcknowledgementContext = createContext<{
  acknowledgedPayslipIds: Record<string, boolean>;
  acknowledgePayslip: (payslipId: string) => void;
}>({
  acknowledgedPayslipIds: {},
  acknowledgePayslip: () => {},
});

const NotificationsReadContext = createContext<{
  readNotificationIds: Record<string, boolean>;
  markNotificationAsRead: (notificationId: string) => void;
}>({
  readNotificationIds: {},
  markNotificationAsRead: () => {},
});

// Fonte real (notif_inbox, via GET /notificacoes) usada só pra alimentar o
// indicador de "tem notificação não lida" no sininho do TopBar em todas as
// telas do colaborador — cada tela que precisa da lista completa (ex.:
// NotificationsScreen) faz sua própria busca; aqui é só o sinal leve pro
// badge global.
const ColaboradorNotificationsContext = createContext<{
  items: ColaboradorNotificacaoItem[];
}>({
  items: [],
});

// Registro real do colaborador logado (rh_colaboradores, via
// GET /api/rh/colaboradores/:id) — busca única, feita aqui no topo e
// compartilhada por qualquer tela/menu que precise do nome/cargo/unidade
// reais (SideMenu, Dashboard, Meu Perfil), em vez de cada tela refazer a
// mesma chamada. Fica null quando identity.colaboradorId é null (usuário sem
// vínculo no RH) — nesse caso as telas mostram o estado vazio, nunca dado
// fabricado.
const ColaboradorPerfilContext = createContext<{
  perfil: RhColaboradorRaw | null;
  isLoading: boolean;
  errorMessage: string | null;
}>({
  perfil: null,
  isLoading: false,
  errorMessage: null,
});

const SecurityPreferencesContext = createContext<{
  isTwoFactorEnabled: boolean;
  isBiometricLoginEnabled: boolean;
  setIsTwoFactorEnabled: (value: boolean) => void;
  setIsBiometricLoginEnabled: (value: boolean) => void;
}>({
  isTwoFactorEnabled: true,
  isBiometricLoginEnabled: false,
  setIsTwoFactorEnabled: () => {},
  setIsBiometricLoginEnabled: () => {},
});

const TrainingProgressContext = createContext<{
  courseProgress: Record<string, TrainingCourseProgress>;
  updateLessonWatchTime: (courseId: string, lessonId: string, watchedSeconds: number, durationSeconds: number) => void;
  saveExamAttempt: (courseId: string, attempt: TrainingExamAttempt) => void;
  resetExamAttempt: (courseId: string) => void;
}>({
  courseProgress: {},
  updateLessonWatchTime: () => {},
  saveExamAttempt: () => {},
  resetExamAttempt: () => {},
});

export const UserRoleContext = createContext<{
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
}>({
  activeRole: 'colaborador',
  setActiveRole: () => {},
});

// Identidade real retornada pelo POST /api/auth/login (Supabase Auth por trás
// da af360-api). Fica em memória apenas (sem @react-native-async-storage/async-storage
// instalado no projeto ainda) — ou seja, a sessão se perde ao fechar o app.
// Se/quando o pacote for adicionado ao package.json, dá pra persistir e
// restaurar isso no boot (ex.: dentro de um useEffect no App()).
export const AuthIdentityContext = createContext<{
  identity: AuthIdentity | null;
  setIdentity: (identity: AuthIdentity | null) => void;
}>({
  identity: null,
  setIdentity: () => {},
});

// Tema visual do painel Administrador (Admin > Configurações > "Tema da
// tela de Início"). Vem de verdade da tabela adm_temas (slug, nome,
// descricao, cores jsonb {primary,accent,bg,secondary?}, ativo, is_protected
// — confirmada pela Lovable em 30/07/2026, endpoint admin-temas só com
// GET/PATCH). "primaryLight" não existe no banco — é calculado aqui
// clareando "primary", só pro degradê do hero card.
//
// Só a cor "navy"/primary (ícones de destaque, cabeçalhos, aba ativa) segue
// o tema — as cores semânticas (verde=ativo, vermelho=inativo/excluir,
// azul/dourado de status) continuam fixas, porque mudam de sentido
// dependendo do skin.
export function lightenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export type AdminThemePreset = {
  slug: string;
  nome: string;
  descricao: string;
  primary: string;
  primaryLight: string;
  primaryBg: string;
  previewColors: string[];
  isProtected: boolean;
};

// Usado só enquanto adm_temas ainda não carregou, ou se a chamada falhar —
// mantém o visual atual (navy) em vez de deixar a tela sem cor.
export const ADMIN_THEME_FALLBACK: AdminThemePreset = {
  slug: 'padrao',
  nome: 'Padrão AF',
  descricao: 'Identidade visual padrão.',
  primary: '#1B2340',
  primaryLight: '#2F3A5C',
  primaryBg: '#E7E9F2',
  previewColors: ['#1B2340', '#E6213D', '#F5EBD8'],
  isProtected: true,
};

function temaToPreset(tema: AdminTemaItem): AdminThemePreset {
  const primary = tema.cores.primary || ADMIN_THEME_FALLBACK.primary;
  return {
    slug: tema.slug,
    nome: tema.nome || tema.slug,
    descricao: tema.descricao || '',
    primary,
    primaryLight: lightenHex(primary, 0.35),
    primaryBg: tema.cores.bg || lightenHex(primary, 0.9),
    previewColors: [tema.cores.primary, tema.cores.accent, tema.cores.secondary, tema.cores.bg].filter(
      (color): color is string => Boolean(color)
    ),
    isProtected: tema.isProtected,
  };
}

export const AdminThemeContext = createContext<{
  theme: AdminThemePreset;
  temas: AdminThemePreset[];
  isLoading: boolean;
  applyTheme: (slug: string) => void;
}>({
  theme: ADMIN_THEME_FALLBACK,
  temas: [ADMIN_THEME_FALLBACK],
  isLoading: false,
  applyTheme: () => {},
});

const currentUser = {
  fullName: 'Bruno Lima',
  role: 'Frentista Líder',
  roleAndUnit: 'Frentista Líder · Unidade Paulista',
  unit: 'Posto Av. Paulista',
  employeeId: '10428',
  admissionDate: '12/03/2022',
  email: 'bruno.lima@americanfuel.com.br',
  phone: '(11) 98472-1130',
};

const profileSections: ProfileSection[] = [
  {
    id: 'personal',
    label: 'Pessoal',
    fields: [
      { label: 'Nome completo', value: currentUser.fullName },
      { label: 'Nome social', value: '—' },
      { label: 'CPF', value: '—' },
      { label: 'RG', value: '—' },
      { label: 'Nascimento', value: '—' },
      { label: 'Estado civil', value: '—' },
      { label: 'Sexo', value: '—' },
      { label: 'Telefone', value: currentUser.phone },
      { label: 'WhatsApp', value: '—' },
      { label: 'E-mail', value: currentUser.email },
      { label: 'E-mail pessoal', value: '—' },
    ],
    footerNote: 'Para alterar dados cadastrais, abra um chamado para o RH.',
  },
  {
    id: 'professional',
    label: 'Profissional',
    fields: [
      { label: 'Matrícula', value: currentUser.employeeId },
      { label: 'Cargo', value: currentUser.role },
      { label: 'Setor', value: '—' },
      { label: 'Posto de trabalho', value: currentUser.unit },
      { label: 'Tipo de contrato', value: '—' },
      { label: 'Admissão', value: currentUser.admissionDate },
      { label: 'Status', value: 'Ativo' },
    ],
    footerNote: 'Para alterar dados cadastrais, abra um chamado para o RH.',
  },
  {
    id: 'address',
    label: 'Endereço',
    fields: [
      { label: 'CEP', value: '—' },
      { label: 'Logradouro', value: '—' },
      { label: 'Número', value: '—' },
      { label: 'Complemento', value: '—' },
      { label: 'Bairro', value: '—' },
      { label: 'Cidade', value: '—' },
      { label: 'UF', value: '—' },
    ],
    footerNote: 'Para alterar dados cadastrais, abra um chamado para o RH.',
  },
  {
    id: 'documents',
    label: 'Documentos',
    fields: [
      { label: 'Nome da mãe', value: '—' },
      { label: 'Nome do pai', value: '—' },
      { label: 'Nacionalidade', value: '—' },
      { label: 'Naturalidade', value: '—' },
    ],
    cardNote:
      'Documentos digitalizados (RG, CPF, CTPS, comprovantes) podem ser enviados pelo menu Solicitações -> Envio de Documentos.',
    footerNote: 'Para alterar dados cadastrais, abra um chamado para o RH.',
  },
  {
    id: 'banking',
    label: 'Bancário',
    fields: [
      { label: 'Banco', value: '—' },
      { label: 'Agência', value: '—' },
      { label: 'Conta', value: '—' },
      { label: 'Chave PIX', value: '—' },
    ],
    footerNote: 'Para alterar dados cadastrais, abra um chamado para o RH.',
  },
];

const currentUserInitials = getInitials(currentUser.fullName);
const currentUserFirstName = getFirstName(currentUser.fullName);
const profileFooterNote = 'Para alterar dados cadastrais, abra um chamado para o RH.';
const profileSummaryFields: ProfileField[] = [
  { label: 'Matrícula', value: currentUser.employeeId },
  { label: 'Cargo', value: currentUser.role },
  { label: 'Unidade', value: currentUser.unit },
  { label: 'Admissão', value: currentUser.admissionDate },
  { label: 'E-mail', value: currentUser.email },
  { label: 'Telefone', value: currentUser.phone },
];
const profileMenuItems: Array<{
  id: ProfileSectionId | 'security' | 'logout';
  label: string;
  icon: keyof typeof Feather.glyphMap;
  accent?: boolean;
}> = [
  { id: 'personal', label: 'Dados pessoais', icon: 'file-text' },
  { id: 'professional', label: 'Dados profissionais', icon: 'briefcase' },
  { id: 'address', label: 'Endereço', icon: 'map-pin' },
  { id: 'documents', label: 'Documentos', icon: 'folder' },
  { id: 'banking', label: 'Dados bancários', icon: 'credit-card' },
  { id: 'security', label: 'Segurança e senha', icon: 'lock' },
  { id: 'logout', label: 'Sair da conta', icon: 'log-out', accent: true },
];
const sideMenuSections: Array<{
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: keyof typeof Feather.glyphMap;
    route?: SideMenuRoute;
  }>;
}> = [
  {
    title: 'INÍCIO',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'home', route: 'Dashboard' }],
  },
  {
    title: 'MINHA JORNADA',
    items: [
      { id: 'communications', label: 'Comunicados', icon: 'send', route: 'Communications' },
      { id: 'calendar', label: 'Calendário', icon: 'calendar', route: 'Calendar' },
      { id: 'goals', label: 'Metas', icon: 'target', route: 'Goals' },
      { id: 'trainings', label: 'Treinamentos', icon: 'award', route: 'Trainings' },
    ],
  },
  {
    title: 'REMUNERAÇÃO',
    items: [
      { id: 'payslips', label: 'Contra Cheques', icon: 'home', route: 'Payslips' },
      { id: 'reimbursement', label: 'Reembolso', icon: 'file-text', route: 'Reimbursement' },
      { id: 'benefits', label: 'Meus Benefícios', icon: 'gift', route: 'Benefits' },
      { id: 'uniforms', label: 'Meus Uniformes', icon: 'shopping-bag', route: 'Uniforms' },
    ],
  },
  {
    title: 'LIDERANÇA',
    items: [{ id: 'approvals', label: 'Aprovações da Equipe', icon: 'check-square', route: 'Approvals' }],
  },
  {
    title: 'ATENDIMENTO',
    items: [
      { id: 'notifications', label: 'Notificações', icon: 'bell', route: 'Notifications' },
      { id: 'requests', label: 'Minhas Solicitações', icon: 'briefcase', route: 'Requests' },
      { id: 'profile', label: 'Meu Perfil', icon: 'user', route: 'Profile' },
    ],
  },
];

const directorUser = {
  fullName: 'Bruno Lyra',
  role: 'Diretor',
  roleAndUnit: 'Diretor · American Fuel',
  area: 'Diretoria',
  email: 'bruno.lyra@americanfuel.com.br',
  phone: '(11) 99120-4455',
  accessLabel: 'Painéis de gestão',
};

export const directorUserInitials = getInitials(directorUser.fullName);
const directorUserFirstName = getFirstName(directorUser.fullName);

const directorSideMenuSections: Array<{
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: keyof typeof Feather.glyphMap;
    route?: DirectorSideMenuRoute;
  }>;
}> = [
  {
    title: 'INÍCIO',
    items: [{ id: 'director-dashboard', label: 'Visão da rede', icon: 'home', route: 'DirectorDashboard' }],
  },
  {
    title: 'PAINÉIS DE GESTÃO',
    items: [
      { id: 'sales', label: 'Vendas', icon: 'trending-up', route: 'Sales' },
      { id: 'margin', label: 'Margem', icon: 'percent', route: 'Margin' },
      { id: 'stock', label: 'Estoques', icon: 'box', route: 'Stock' },
      { id: 'gnv-metrics', label: 'Métricas GNV', icon: 'zap', route: 'GnvMetrics' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { id: 'process-map', label: 'Mapa de Processos', icon: 'git-branch', route: 'ProcessMap' },
      { id: 'director-notifications', label: 'Notificações', icon: 'bell', route: 'DirectorNotifications' },
    ],
  },
  {
    title: 'COMUNICAÇÃO',
    items: [
      { id: 'director-conversas', label: 'Fale com a Diretoria', icon: 'message-circle', route: 'DirectorConversas' },
    ],
  },
  {
    title: 'CONTA',
    items: [{ id: 'director-profile', label: 'Meu Perfil', icon: 'user', route: 'DirectorProfile' }],
  },
];

export const rhUser = {
  fullName: 'Marina Costa',
  role: 'Analista de RH',
  roleAndUnit: 'Analista de RH · American Fuel',
  area: 'Recursos Humanos',
  email: 'marina.costa@americanfuel.com.br',
  phone: '(11) 99120-7788',
  accessLabel: 'Gestão de pessoas',
};

// Placeholder até o painel Admin ser conectado ao login real (identity do
// AuthIdentityContext) — front primeiro, back depois, combinado com a
// Rayanne. Trocar por identity.fullName/email quando vier o backend.
export const adminUser = {
  fullName: 'Administrador',
  role: 'Administrador',
  roleAndUnit: 'Administrador · American Fuel',
  area: 'Painel de Gestão',
  email: 'admin@americanfuel.com.br',
  phone: '(11) 99120-0000',
  accessLabel: 'Acesso total',
};

// "AD" fixo (não via getInitials) pra bater com o mock — "Administrador" é
// uma palavra só e getInitials() daria só "A".
export const adminUserInitials = 'AD';

export const rhUserInitials = getInitials(rhUser.fullName);
export const rhUserFirstName = getFirstName(rhUser.fullName);

export const rhSideMenuSections: Array<{
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: keyof typeof Feather.glyphMap;
    route?: RHSideMenuRoute;
  }>;
}> = [
  {
    title: 'VISÃO GERAL',
    items: [{ id: 'rh-dashboard', label: 'Dashboard', icon: 'grid', route: 'RHDashboard' }],
  },
  {
    title: 'PESSOAS',
    items: [
      { id: 'rh-colaboradores', label: 'Colaboradores', icon: 'users', route: 'RHColaboradores' },
      { id: 'rh-pre-contratados', label: 'Pré-Contratados', icon: 'user-check', route: 'RHPreContratados' },
      {
        id: 'rh-conformidade-admissoes',
        label: 'Conformidade de Admissões',
        icon: 'clipboard',
        route: 'RHConformidadeAdmissoes',
      },
      { id: 'rh-transferencias', label: 'Transferências', icon: 'repeat', route: 'RHTransferencias' },
      { id: 'rh-comunicados', label: 'Comunicados', icon: 'volume-2', route: 'RHComunicados' },
      { id: 'rh-solicitacoes', label: 'Solicitações', icon: 'message-circle', route: 'RHSolicitacoes' },
      { id: 'rh-importar-pdf', label: 'Importar PDF', icon: 'file-text', route: 'RHImportarPdf' },
      { id: 'rh-notifications', label: 'Notificações', icon: 'bell', route: 'RHNotifications' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { id: 'rh-metas', label: 'Metas', icon: 'target', route: 'RHMetas' },
      { id: 'rh-ponto', label: 'Ponto', icon: 'clock', route: 'RHPonto' },
      { id: 'rh-ferias', label: 'Férias', icon: 'sun', route: 'RHFerias' },
      { id: 'rh-experiencia', label: 'Período de Experiência', icon: 'shield', route: 'RHExperiencia' },
      { id: 'rh-folha', label: 'Folha de Pagamento', icon: 'credit-card', route: 'RHFolhaPagamento' },
      { id: 'rh-recursos', label: 'Recursos Operacionais', icon: 'tool', route: 'RHRecursosOperacionais' },
      { id: 'rh-workflow', label: 'Workflow', icon: 'git-pull-request', route: 'RHWorkflow' },
      { id: 'rh-relatorios', label: 'Relatórios', icon: 'bar-chart-2', route: 'RHRelatorios' },
      { id: 'rh-configuracoes', label: 'Configurações', icon: 'settings', route: 'RHConfiguracoes' },
    ],
  },
];

export const adminSideMenuSections: Array<{
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: keyof typeof Feather.glyphMap;
    route?: AdminSideMenuRoute;
  }>;
}> = [
  {
    title: 'VISÃO GERAL',
    items: [{ id: 'admin-dashboard', label: 'Dashboard', icon: 'grid', route: 'AdminDashboard' }],
  },
  {
    title: 'ACESSO',
    items: [
      { id: 'admin-usuarios', label: 'Usuários', icon: 'users', route: 'AdminUsuarios' },
      { id: 'admin-perfil-acesso', label: 'Perfil de Acesso', icon: 'shield', route: 'AdminPerfilAcesso' },
      { id: 'admin-grupos', label: 'Grupos', icon: 'user', route: 'AdminGrupos' },
      { id: 'admin-unidades', label: 'Unidades', icon: 'home', route: 'AdminUnidades' },
      { id: 'admin-modulos', label: 'Módulos', icon: 'grid', route: 'AdminModulos' },
    ],
  },
  {
    title: 'PLATAFORMA',
    items: [
      { id: 'admin-integracoes', label: 'Integrações', icon: 'link-2', route: 'AdminIntegracoes' },
      { id: 'admin-convencoes', label: 'Convenções', icon: 'book-open', route: 'AdminConvencoes' },
      { id: 'admin-configuracoes', label: 'Configurações', icon: 'settings', route: 'AdminConfiguracoes' },
      { id: 'admin-versoes', label: 'Versões', icon: 'refresh-cw', route: 'AdminVersoes' },
      { id: 'admin-notifications', label: 'Notificações', icon: 'bell', route: 'AdminNotifications' },
      { id: 'admin-logs', label: 'Logs', icon: 'file-text', route: 'AdminLogs' },
    ],
  },
];

const MARGIN_WARNING_THRESHOLD = 17.5;

function getMarginTone(marginValue: number) {
  const isBelowTarget = marginValue < MARGIN_WARNING_THRESHOLD;
  const label = `Margem ${marginValue.toFixed(1).replace('.', ',')}%`;

  return {
    label,
    color: isBelowTarget ? '#B7791F' : '#18955A',
    tint: isBelowTarget ? '#FCF4DE' : '#E2F4EA',
  };
}

const salesSummaryItems: SummaryCardItem[] = [
  {
    id: 'total',
    label: 'Faturamento TOTAL',
    value: 'R$ 2.531.027,14',
    marginValue: 19.4,
  },
  {
    id: 'fuels',
    label: 'Combustíveis líquidos',
    value: 'R$ 1.665.483,18',
    meta: 'Volume: 266.126 L',
    marginValue: 17.6,
  },
  {
    id: 'gnv',
    label: 'GNV',
    value: 'R$ 820.149,59',
    meta: 'Volume: 192.354 m³',
    marginValue: 20.9,
  },
  {
    id: 'store-track',
    label: 'Loja pista',
    value: 'R$ 18.464,34',
    marginValue: 56.1,
  },
  {
    id: 'store-convenience',
    label: 'Loja conveniência',
    value: 'R$ 26.930,03',
    marginValue: 52.7,
  },
];

const fuelSalesItems: FuelSalesItem[] = [
  {
    id: 'gasoline',
    label: 'GASOLINA',
    accentColor: '#E6213D',
    value: 'R$ 1.055.111,20',
    volumeLabel: 'Volume: 159.508 L · Mix: 73,2% comum · 26,8% aditivado',
    marginValue: 17.4,
  },
  {
    id: 'ethanol',
    label: 'ETANOL',
    accentColor: '#18955A',
    value: 'R$ 317.876,12',
    volumeLabel: 'Volume: 64.854 L · Mix: 73,2% comum · 26,8% aditivado',
    marginValue: 22.8,
  },
  {
    id: 'diesel',
    label: 'DIESEL',
    accentColor: '#3457D5',
    value: 'R$ 292.495,86',
    volumeLabel: 'Volume: 41.764 L · Mix: 45,3% comum · 54,7% aditivado',
    marginValue: 12.9,
  },
];

const directorStationOptions = [
  'Todos os postos',
  'Posto Av. Paulista',
  'Posto Boa Viagem',
  'Petromasa Copacabana',
  'Petromasa Irajá',
  'Posto de Gasolina Jana',
  'Mega Nova Iguaçu',
];

const salesUpdatedAtLabel = 'Atualizado em 02/07/2026, 09:06';

const marginOffenderCategories: MarginOffenderCategory[] = [
  {
    id: 'gasoline',
    title: 'GASOLINA',
    networkAverageLabel: 'Média rede: 17,4%',
    offendersCount: 37,
    impactLabel: 'Impacto: R$ 8.868,12',
    stations: [
      {
        id: 'ceprano-autoveturte',
        rank: 1,
        name: 'Ceprano Autoveturte',
        pulledBy: 'Puxado por: Gasolina (10,9%)',
        percentLabel: '10,9%',
        deltaLabel: '-6,5 pp',
        severity: 'critical',
      },
      {
        id: 'petromasa-copacabana',
        rank: 2,
        name: 'Petromasa Copacabana',
        pulledBy: 'Puxado por: Gasolina (12,1%)',
        percentLabel: '12,1%',
        deltaLabel: '-5,3 pp',
        severity: 'critical',
      },
      {
        id: 'petromasa-iraja',
        rank: 3,
        name: 'Petromasa Irajá',
        pulledBy: 'Puxado por: Gasolina (12,2%)',
        percentLabel: '12,2%',
        deltaLabel: '-5,2 pp',
        severity: 'warning',
      },
    ],
  },
  {
    id: 'ethanol',
    title: 'ETANOL',
    networkAverageLabel: 'Média rede: 22,8%',
    offendersCount: 34,
    impactLabel: 'Impacto: R$ 3.348,21',
    stations: [
      {
        id: 'posto-gasolina-jana',
        rank: 1,
        name: 'Posto de Gasolina Jana',
        pulledBy: 'Puxado por: Etanol (19,5%)',
        percentLabel: '19,5%',
        deltaLabel: '-3,4 pp',
        severity: 'warning',
      },
      {
        id: 'mega-nova-iguacu',
        rank: 2,
        name: 'Mega Nova Iguaçu',
        pulledBy: 'Puxado por: Etanol (19,8%)',
        percentLabel: '19,8%',
        deltaLabel: '-3,0 pp',
        severity: 'warning',
      },
      {
        id: 'posto-gasolina-sg',
        rank: 3,
        name: 'Posto de Gasolina SG',
        pulledBy: 'Puxado por: Etanol (19,9%)',
        percentLabel: '19,9%',
        deltaLabel: '-2,9 pp',
        severity: 'warning',
      },
    ],
  },
  {
    id: 'diesel',
    title: 'DIESEL',
    networkAverageLabel: 'Média rede: 12,9%',
    offendersCount: 28,
    impactLabel: 'Impacto: R$ 2.517,77',
    stations: [
      {
        id: 'ceprano-autoveturte-diesel',
        rank: 1,
        name: 'Ceprano Autoveturte',
        pulledBy: 'Puxado por: Diesel (7,9%)',
        percentLabel: '7,9%',
        deltaLabel: '-5,0 pp',
        severity: 'critical',
      },
      {
        id: 'posto-americano',
        rank: 2,
        name: 'Posto Americano',
        pulledBy: 'Puxado por: Diesel aditivado (8,0%)',
        percentLabel: '8,0%',
        deltaLabel: '-4,9 pp',
        severity: 'critical',
      },
    ],
  },
  {
    id: 'gnv',
    title: 'GNV',
    networkAverageLabel: 'Média rede: 20,9%',
    offendersCount: 5,
    impactLabel: 'Impacto: R$ 3.480,66',
    stations: [
      {
        id: 'auto-mecanica-rj',
        rank: 1,
        name: 'Auto Mecânica RJ',
        pulledBy: 'Puxado por: GNV',
        percentLabel: '11,7%',
        deltaLabel: '-9,2 pp',
        severity: 'critical',
      },
      {
        id: 'posto-sao-sebastiao',
        rank: 2,
        name: 'Posto São Sebastião',
        pulledBy: 'Puxado por: GNV',
        percentLabel: '12,8%',
        deltaLabel: '-8,2 pp',
        severity: 'critical',
      },
      {
        id: 'auto-posto-duque',
        rank: 3,
        name: 'Auto Posto Duque',
        pulledBy: 'Puxado por: GNV',
        percentLabel: '16,9%',
        deltaLabel: '-4,1 pp',
        severity: 'warning',
      },
    ],
  },
];

const storeOffenders: StoreOffenderItem[] = [
  {
    id: 'store-track',
    title: 'Loja pista',
    networkAverageLabel: 'Média 56,1%',
    stationName: 'Posto de Gasolina Jana',
    percentLabel: '37,2%',
    deltaLabel: '-18,9 pp',
  },
  {
    id: 'store-convenience',
    title: 'Loja conveniência',
    networkAverageLabel: 'Média 52,7%',
    stationName: 'Posto Chacrinha',
    percentLabel: '25,3%',
    deltaLabel: '-27,4 pp',
  },
];

const unrecognizedCosts: UnrecognizedCostItem[] = [
  {
    id: 'boa-viagem',
    stationName: 'Posto Boa Viagem',
    severityLabel: 'Crítico',
    productLabel: 'IPIMAX PRO GASOL PREMIUM ADIT · Gasolina aditivada',
    dateLabel: '21/05/2026',
    costLabel: 'R$ 6,7619',
    referencePriceLabel: 'R$ 7,0683',
    marginLabel: '4,3%',
    targetLabel: '9,0%',
  },
];

const lowStockSummary = {
  totalCount: 1133,
  revenueAtRiskLabel: 'R$ 28.866,40',
  topCategoriesLabel: 'Conveniência (1054) · Loja Pista (79)',
};

const lowStockProducts: LowStockProductItem[] = [
  {
    id: 'cig-sc-rothmans',
    station: 'Posto de Abastecimento e Serviços V. Marques LTDA.',
    product: 'CIG SC ROTHMANS LONDON GLOBAL BLUE BOX 1890',
    category: 'Conveniência',
    balanceLabel: '2 UN',
    last7DaysLabel: '193 UN',
    dailyConsumptionLabel: '32,1',
    dailyRevenueLabel: 'R$ 256,86',
    coverageLabel: '0,1 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'pao-de-queijo',
    station: 'Auto Posto de Abastecimento Estrela do Oceano LTDA',
    product: 'PAO DE QUEIJO COQUETEL 15G',
    category: 'Conveniência',
    balanceLabel: '0 UN',
    last7DaysLabel: '66 UN',
    dailyConsumptionLabel: '22,0',
    dailyRevenueLabel: 'R$ 26,40',
    coverageLabel: '0,0 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'bisc-piraque-presuntinho',
    station: 'Posto Servicentro Carneiro LTDA',
    product: 'BISC PIRAQUE PRESUNTINHO',
    category: 'Conveniência',
    balanceLabel: '0 UN',
    last7DaysLabel: '2 UN',
    dailyConsumptionLabel: '2,0',
    dailyRevenueLabel: 'R$ 16,00',
    coverageLabel: '0,0 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'toddynho',
    station: 'Posto Servicentro Carneiro LTDA',
    product: 'TODDYNHO',
    category: 'Conveniência',
    balanceLabel: '0 UN',
    last7DaysLabel: '1 UN',
    dailyConsumptionLabel: '1,0',
    dailyRevenueLabel: 'R$ 5,20',
    coverageLabel: '0,0 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'piraque-maizena',
    station: 'Posto Servicentro Carneiro LTDA',
    product: 'PIRAQUE MAIZENA',
    category: 'Conveniência',
    balanceLabel: '1 UN',
    last7DaysLabel: '1 UN',
    dailyConsumptionLabel: '1,0',
    dailyRevenueLabel: 'R$ 6,80',
    coverageLabel: '1,0 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'coca-cola',
    station: 'Posto Servicentro Carneiro LTDA',
    product: 'COCA COLA 1,5 L',
    category: 'Conveniência',
    balanceLabel: '7 UN',
    last7DaysLabel: '5 UN',
    dailyConsumptionLabel: '1,3',
    dailyRevenueLabel: 'R$ 17,50',
    coverageLabel: '5,6 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'monster',
    station: 'Posto Servicentro Carneiro LTDA',
    product: 'ENERGÉTICO MONSTER 473 ML',
    category: 'Conveniência',
    balanceLabel: '17 UN',
    last7DaysLabel: '3 UN',
    dailyConsumptionLabel: '3,0',
    dailyRevenueLabel: 'R$ 54,00',
    coverageLabel: '5,7 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'batata-ruffles',
    station: 'Posto Servicentro Carneiro LTDA',
    product: 'BATATA RUFFLES SABORES 33G',
    category: 'Conveniência',
    balanceLabel: '6 UN',
    last7DaysLabel: '2 UN',
    dailyConsumptionLabel: '1,0',
    dailyRevenueLabel: 'R$ 7,50',
    coverageLabel: '6,0 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'agua-mineral',
    station: 'Posto Servicentro Carneiro LTDA',
    product: 'ÁGUA MINERAL 500ML',
    category: 'Conveniência',
    balanceLabel: '3 UN',
    last7DaysLabel: '4 UN',
    dailyConsumptionLabel: '0,6',
    dailyRevenueLabel: 'R$ 6,00',
    coverageLabel: '5,0 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'salgadinho-cheetos',
    station: 'Posto de Gasolina Jana',
    product: 'SALGADINHO CHEETOS 45G',
    category: 'Conveniência',
    balanceLabel: '0 UN',
    last7DaysLabel: '9 UN',
    dailyConsumptionLabel: '1,3',
    dailyRevenueLabel: 'R$ 22,50',
    coverageLabel: '0,0 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'chocolate-kitkat',
    station: 'Posto de Gasolina Jana',
    product: 'CHOCOLATE KIT KAT 41,5G',
    category: 'Conveniência',
    balanceLabel: '2 UN',
    last7DaysLabel: '12 UN',
    dailyConsumptionLabel: '1,7',
    dailyRevenueLabel: 'R$ 12,80',
    coverageLabel: '1,2 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'cafe-expresso',
    station: 'Mega Nova Iguaçu',
    product: 'CAFÉ EXPRESSO COPO 50ML',
    category: 'Conveniência',
    balanceLabel: '5 UN',
    last7DaysLabel: '30 UN',
    dailyConsumptionLabel: '4,3',
    dailyRevenueLabel: 'R$ 21,50',
    coverageLabel: '1,2 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'cigarro-marlboro',
    station: 'Mega Nova Iguaçu',
    product: 'CIG MARLBORO RED BOX',
    category: 'Conveniência',
    balanceLabel: '1 UN',
    last7DaysLabel: '18 UN',
    dailyConsumptionLabel: '2,6',
    dailyRevenueLabel: 'R$ 28,00',
    coverageLabel: '0,4 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'sorvete-picole',
    station: 'Petromasa Copacabana',
    product: 'PICOLÉ CHOCOLATE 65G',
    category: 'Conveniência',
    balanceLabel: '4 UN',
    last7DaysLabel: '10 UN',
    dailyConsumptionLabel: '1,4',
    dailyRevenueLabel: 'R$ 14,00',
    coverageLabel: '2,8 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'refrigerante-guarana',
    station: 'Petromasa Copacabana',
    product: 'GUARANÁ ANTARCTICA 2L',
    category: 'Conveniência',
    balanceLabel: '6 UN',
    last7DaysLabel: '7 UN',
    dailyConsumptionLabel: '1,0',
    dailyRevenueLabel: 'R$ 16,80',
    coverageLabel: '6,0 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'bala-halls',
    station: 'Petromasa Irajá',
    product: 'BALA HALLS MENTHOL',
    category: 'Conveniência',
    balanceLabel: '0 UN',
    last7DaysLabel: '15 UN',
    dailyConsumptionLabel: '2,1',
    dailyRevenueLabel: 'R$ 9,00',
    coverageLabel: '0,0 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'pilha-aa',
    station: 'Petromasa Irajá',
    product: 'PILHA ALCALINA AA PAR',
    category: 'Conveniência',
    balanceLabel: '2 UN',
    last7DaysLabel: '3 UN',
    dailyConsumptionLabel: '0,4',
    dailyRevenueLabel: 'R$ 15,80',
    coverageLabel: '4,7 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'oculos-sol',
    station: 'Auto Mecânica RJ',
    product: 'ÓCULOS DE SOL PROMOCIONAL',
    category: 'Conveniência',
    balanceLabel: '1 UN',
    last7DaysLabel: '2 UN',
    dailyConsumptionLabel: '0,3',
    dailyRevenueLabel: 'R$ 25,00',
    coverageLabel: '3,6 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'carregador-usb',
    station: 'Auto Mecânica RJ',
    product: 'CARREGADOR VEICULAR USB',
    category: 'Conveniência',
    balanceLabel: '0 UN',
    last7DaysLabel: '4 UN',
    dailyConsumptionLabel: '0,6',
    dailyRevenueLabel: 'R$ 32,00',
    coverageLabel: '0,0 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'sanduiche-natural',
    station: 'Posto São Sebastião',
    product: 'SANDUÍCHE NATURAL FRANGO',
    category: 'Conveniência',
    balanceLabel: '3 UN',
    last7DaysLabel: '8 UN',
    dailyConsumptionLabel: '1,1',
    dailyRevenueLabel: 'R$ 27,00',
    coverageLabel: '2,7 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'iogurte-danone',
    station: 'Posto São Sebastião',
    product: 'IOGURTE DANONE MORANGO',
    category: 'Conveniência',
    balanceLabel: '0 UN',
    last7DaysLabel: '6 UN',
    dailyConsumptionLabel: '0,9',
    dailyRevenueLabel: 'R$ 11,40',
    coverageLabel: '0,0 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'amendoim-japones',
    station: 'Auto Posto Duque',
    product: 'AMENDOIM JAPONÊS 150G',
    category: 'Conveniência',
    balanceLabel: '5 UN',
    last7DaysLabel: '5 UN',
    dailyConsumptionLabel: '0,7',
    dailyRevenueLabel: 'R$ 13,50',
    coverageLabel: '7,1 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'isqueiro-bic',
    station: 'Auto Posto Duque',
    product: 'ISQUEIRO BIC',
    category: 'Conveniência',
    balanceLabel: '1 UN',
    last7DaysLabel: '9 UN',
    dailyConsumptionLabel: '1,3',
    dailyRevenueLabel: 'R$ 8,90',
    coverageLabel: '0,8 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'oleo-motor',
    station: 'Posto Av. Paulista',
    product: 'ÓLEO DE MOTOR 5W30 1L',
    category: 'Loja Pista',
    balanceLabel: '1 UN',
    last7DaysLabel: '6 UN',
    dailyConsumptionLabel: '0,9',
    dailyRevenueLabel: 'R$ 45,00',
    coverageLabel: '1,1 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'aditivo-radiador',
    station: 'Posto Av. Paulista',
    product: 'ADITIVO DE RADIADOR 1L',
    category: 'Loja Pista',
    balanceLabel: '0 UN',
    last7DaysLabel: '3 UN',
    dailyConsumptionLabel: '0,4',
    dailyRevenueLabel: 'R$ 18,00',
    coverageLabel: '0,0 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'palheta-limpador',
    station: 'Posto Boa Viagem',
    product: 'PALHETA LIMPADOR DE PARA-BRISA',
    category: 'Loja Pista',
    balanceLabel: '2 UN',
    last7DaysLabel: '4 UN',
    dailyConsumptionLabel: '0,6',
    dailyRevenueLabel: 'R$ 24,00',
    coverageLabel: '3,3 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'agua-radiador',
    station: 'Posto Boa Viagem',
    product: 'ÁGUA PARA RADIADOR 1L',
    category: 'Loja Pista',
    balanceLabel: '0 UN',
    last7DaysLabel: '5 UN',
    dailyConsumptionLabel: '0,7',
    dailyRevenueLabel: 'R$ 9,50',
    coverageLabel: '0,0 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'fusivel-kit',
    station: 'Posto de Gasolina Jana',
    product: 'KIT FUSÍVEIS AUTOMOTIVOS',
    category: 'Loja Pista',
    balanceLabel: '1 UN',
    last7DaysLabel: '2 UN',
    dailyConsumptionLabel: '0,3',
    dailyRevenueLabel: 'R$ 19,00',
    coverageLabel: '3,3 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'flanela-limpeza',
    station: 'Mega Nova Iguaçu',
    product: 'FLANELA DE LIMPEZA AUTOMOTIVA',
    category: 'Loja Pista',
    balanceLabel: '3 UN',
    last7DaysLabel: '3 UN',
    dailyConsumptionLabel: '0,4',
    dailyRevenueLabel: 'R$ 7,50',
    coverageLabel: '7,5 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
  {
    id: 'ar-condicionado-spray',
    station: 'Petromasa Copacabana',
    product: 'SPRAY HIGIENIZADOR AR-CONDICIONADO',
    category: 'Loja Pista',
    balanceLabel: '0 UN',
    last7DaysLabel: '2 UN',
    dailyConsumptionLabel: '0,3',
    dailyRevenueLabel: 'R$ 22,00',
    coverageLabel: '0,0 d',
    status: 'critical',
    statusLabel: 'Crítico',
  },
  {
    id: 'calibrador-pneu',
    station: 'Petromasa Irajá',
    product: 'CALIBRADOR DE PNEU DIGITAL',
    category: 'Loja Pista',
    balanceLabel: '1 UN',
    last7DaysLabel: '1 UN',
    dailyConsumptionLabel: '0,1',
    dailyRevenueLabel: 'R$ 35,00',
    coverageLabel: '10,0 d',
    status: 'warning',
    statusLabel: 'Atenção',
  },
];

const stockUpdatedAtLabel = 'Última coleta de tanques: 02/07/2026, 09:05:00';

const gnvTotalFaturado = 'R$ 820.149';
const gnvVolumeLabel = '192.354 m³';
const gnvMarginLabel = 'Margem 20,9%';
const gnvDescontoLabel = '0,0%';
const gnvOutOfRangeLabel = '46 postos fora de 35-45%';
const gnvReportMonthLabel = '46 postos · Jul/2026';
const gnvRiskCount = 46;
const gnvAttentionCount = 0;
const gnvIdealCount = 0;

const gnvRiskStations: GnvRiskStation[] = [
  {
    id: 'daril-servicos',
    name: 'Posto Daril Serviços',
    volumeLabel: 'vol 1.061,10 m³',
    billingLabel: 'fat R$ 4.551,87',
    percentLabel: '0,0%',
  },
  {
    id: 'gasolina-jana',
    name: 'Posto de Gasolina Jana',
    volumeLabel: 'vol 4.482,71 m³',
    billingLabel: 'fat R$ 19.044,88',
    percentLabel: '0,0%',
  },
  {
    id: 'sg',
    name: 'Posto SG',
    volumeLabel: 'vol 6.086,49 m³',
    billingLabel: 'fat R$ 26.108,97',
    percentLabel: '0,0%',
  },
  {
    id: 'monsenhor-escriva',
    name: 'Posto S Monsenhor Escriva',
    volumeLabel: 'vol 3.300,82 m³',
    billingLabel: 'fat R$ 14.159,71',
    percentLabel: '0,0%',
  },
  {
    id: 'tiradentes',
    name: 'Posto Tiradentes',
    volumeLabel: 'vol 142,93 m³',
    billingLabel: 'fat R$ 613,11',
    percentLabel: '0,0%',
  },
  {
    id: 'sao-cristovao',
    name: 'Posto do Trabalho São Cristóvão',
    volumeLabel: 'vol 3.125,93 m³',
    billingLabel: 'fat R$ 12.992,13',
    percentLabel: '0,0%',
  },
  {
    id: 'frosinone-gnv',
    name: 'Posto Frosinone GNV',
    volumeLabel: 'vol 5.667,41 m³',
    billingLabel: 'fat R$ 23.467,26',
    percentLabel: '0,0%',
  },
];

const processDepartmentOptions = [
  '— Não definida —',
  'Comercial',
  'Operações',
  'Financeiro',
  'Manutenção',
  'RH',
  'TI',
];

const processModuleOptions = [
  '— Nenhum —',
  'Vendas',
  'Margem',
  'Estoques',
  'Métricas GNV',
  'Notificações',
];

const processStatusOptions: Array<{ value: ProcessMapItem['status']; label: string }> = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'em_revisao', label: 'Em revisão' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'descontinuado', label: 'Descontinuado' },
];

const processFlowNodeTypeMeta: Record<ProcessFlowNodeType, { label: string; color: string; tint: string }> = {
  inicio: { label: 'Início', color: '#18955A', tint: '#E4F5EE' },
  processo: { label: 'Processo', color: '#3457D5', tint: '#EDF1FF' },
  decisao: { label: 'Decisão', color: '#B7791F', tint: '#FCF4DE' },
  fim: { label: 'Fim', color: '#E6213D', tint: '#FCE8EC' },
};

export const notificationCargoOptions = [
  'ANALISTA DE RECURSOS HUMANOS',
  'ANALISTA DE RH',
  'APRENDIZ DE FRENTISTA',
  'ASSIST ADMINISTRATIVO',
  'ASSISTENTE ADMINIST.',
  'ASSISTENTE ADMINISTRATIVO',
  'ATENDENTE DE LOJA',
  'FRENTISTA',
  'FRENTISTA LÍDER',
  'GERENTE DE POSTO',
  'SUPERVISOR DE PISTA',
];

export const notificationAudienceOptions: Array<{ value: NotificationAudienceType; label: string }> = [
  { value: 'todos', label: 'Todos os colaboradores' },
  { value: 'colaboradores', label: 'Colaboradores' },
  { value: 'posto', label: 'Por posto' },
  { value: 'cargo', label: 'Por cargo' },
];

export const notificationCronPresets: Array<{ label: string; value: string }> = [
  { label: 'Todo dia às 08h', value: '0 8 * * *' },
  { label: 'Todo dia às 09h', value: '0 9 * * *' },
  { label: 'Todo dia às 18h', value: '0 18 * * *' },
  { label: 'Toda segunda às 09h', value: '0 9 * * 1' },
  { label: 'Dia 1 do mês às 09h', value: '0 9 1 * *' },
  { label: 'Dia 25 do mês às 09h', value: '0 9 25 * *' },
];

export const notificationTriggerOptions: Array<{
  value: NotificationTriggerKind;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { value: 'recorrente', label: 'Recorrente', description: 'Dispara em horários programados (cron)', icon: 'clock' },
  { value: 'evento', label: 'Por evento', description: 'Dispara quando algo acontece no sistema', icon: 'zap' },
  { value: 'manual', label: 'Manual', description: 'Você decide quando disparar', icon: 'mouse-pointer' },
];

const notificationRoutines: NotificationRoutineItem[] = [
  {
    id: 'sangria-alert',
    title: 'Envio de Alerta — Sangria',
    messageTitle: 'Alerta de sangria',
    template: 'Mensagem customizada',
    message: 'Alerta: sangria acumulada de {{valor}} no posto {{posto}}.',
    triggerKind: 'evento',
    cronSchedule: '',
    eventCode: 'Enviado a partir de acúmulo de R$ 200,00',
    channels: { app: false, email: false, whatsapp: true },
    audienceType: 'cargo',
    audienceCargos: ['GERENTE DE POSTO', 'SUPERVISOR DE PISTA', 'FRENTISTA LÍDER', 'ASSISTENTE ADMINISTRATIVO'],
    lastRunLabel: '—',
    enabled: true,
  },
  {
    id: 'pump-stopped-alert',
    title: 'Envio de Alerta — Bomba parada',
    messageTitle: 'Alerta de bomba parada',
    template: 'Mensagem customizada',
    message: 'Alerta: bomba {{bomba}} parada há mais de {{tempo}}.',
    triggerKind: 'evento',
    cronSchedule: '',
    eventCode: 'Bomba parada a partir de 1 h',
    channels: { app: false, email: false, whatsapp: true },
    audienceType: 'cargo',
    audienceCargos: ['GERENTE DE POSTO', 'SUPERVISOR DE PISTA', 'FRENTISTA LÍDER'],
    lastRunLabel: '—',
    enabled: true,
  },
  {
    id: 'network-ranking',
    title: 'Ranking geral dos postos',
    messageTitle: 'Ranking geral dos postos',
    template: 'Mensagem customizada',
    message: 'Ranking geral da rede — confira o desempenho de hoje.',
    triggerKind: 'recorrente',
    cronSchedule: '0 8 * * *',
    eventCode: '',
    channels: { app: false, email: false, whatsapp: true },
    audienceType: 'cargo',
    audienceCargos: ['GERENTE DE POSTO'],
    lastRunLabel: '—',
    enabled: true,
  },
  {
    id: 'stations-ranking',
    title: 'Ranking dos postos',
    messageTitle: 'Ranking dos postos',
    template: 'Mensagem customizada',
    message: 'Ranking dos postos — confira a posição do seu posto.',
    triggerKind: 'recorrente',
    cronSchedule: '0 8 * * *',
    eventCode: '',
    channels: { app: false, email: false, whatsapp: true },
    audienceType: 'cargo',
    audienceCargos: ['GERENTE DE POSTO'],
    lastRunLabel: '—',
    enabled: true,
  },
  {
    id: 'sales-ranking',
    title: 'Ranking de vendas',
    messageTitle: 'Rankings de Vendas',
    template: 'Mensagem customizada',
    message: 'Ranking de vendas dos frentistas — confira sua posição.',
    triggerKind: 'recorrente',
    cronSchedule: '0 8 * * *',
    eventCode: '',
    channels: { app: false, email: false, whatsapp: true },
    audienceType: 'cargo',
    audienceCargos: ['FRENTISTA LÍDER'],
    lastRunLabel: '—',
    enabled: true,
  },
  {
    id: 'daily-sales-report',
    title: 'Relatório diário de vendas',
    messageTitle: 'Relatório diário de vendas',
    template: 'Mensagem customizada',
    message: 'Relatório diário de vendas consolidado da rede.',
    triggerKind: 'recorrente',
    cronSchedule: '0 7 * * *',
    eventCode: '',
    channels: { app: false, email: false, whatsapp: true },
    audienceType: 'cargo',
    audienceCargos: ['GERENTE DE POSTO'],
    lastRunLabel: '—',
    enabled: true,
  },
  {
    id: 'unrecognized-cost-alert',
    title: 'Alerta de custo não reconhecido',
    messageTitle: 'Custo crítico sem reconhecimento',
    template: 'Mensagem customizada',
    message: 'Alerta: custo crítico sem reconhecimento há mais de 24h.',
    triggerKind: 'evento',
    cronSchedule: '',
    eventCode: 'Enviado quando um custo crítico fica sem reconhecimento',
    channels: { app: false, email: false, whatsapp: true },
    audienceType: 'cargo',
    audienceCargos: ['GERENTE DE POSTO', 'ANALISTA DE RH'],
    lastRunLabel: '—',
    enabled: true,
  },
];

const notificationTemplates: NotificationTemplateItem[] = [
  {
    id: 'daily-flash',
    title: 'Flash diário',
    code: 'dir_flash_diario',
    messageTitle: 'Flash diário {{data}}',
    message: 'Resumo executivo de {{data}}: faturamento {{faturamento}}, margem {{margem}}%.',
    variables: ['data', 'faturamento', 'margem'],
    isSystemDefault: true,
  },
  {
    id: 'critical-margin',
    title: 'Margem crítica',
    code: 'dir_margem_critica',
    messageTitle: 'Margem abaixo do esperado',
    message: 'A categoria {{categoria}} está com margem de {{margem}}%, abaixo do mínimo de {{minimo}}%.',
    variables: ['categoria', 'margem', 'minimo'],
    isSystemDefault: true,
  },
];

const notificationTemplateOptions = [
  'Mensagem customizada',
  ...notificationTemplates.map((template) => template.title),
];

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<keyof RootStackParamList | undefined>('Splash');
  const [receivedUniformIds, setReceivedUniformIds] = useState<Record<string, boolean>>({});
  const [acknowledgedPayslipIds, setAcknowledgedPayslipIds] = useState<Record<string, boolean>>({});
  const [readNotificationIds, setReadNotificationIds] = useState<Record<string, boolean>>({});
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(true);
  const [isBiometricLoginEnabled, setIsBiometricLoginEnabled] = useState(false);
  const [courseProgress, setCourseProgress] = useState<Record<string, TrainingCourseProgress>>({});

  // Precisam ser estáveis entre renders (useCallback) porque telas como
  // TrainingExamScreen usam essas funções em dependência de useEffect —
  // se a referência mudasse a cada render (como era antes, com funções
  // inline direto no value do Provider), o efeito reexecutava a cada
  // render, chamava setCourseProgress de novo, o App re-renderizava, gerava
  // uma função nova de novo... loop infinito ("Maximum update depth
  // exceeded"). É exatamente o bug reportado na tela de prova do treinamento.
  const updateLessonWatchTime = useCallback(
    (courseId: string, lessonId: string, watchedSeconds: number, durationSeconds: number) => {
      setCourseProgress((current) => {
        const currentCourse = current[courseId] ?? { lessons: {} };
        const currentLesson = currentCourse.lessons[lessonId];
        const nextWatchedSeconds = Math.max(currentLesson?.watchedSeconds ?? 0, watchedSeconds);

        return {
          ...current,
          [courseId]: {
            ...currentCourse,
            lessons: {
              ...currentCourse.lessons,
              [lessonId]: {
                watchedSeconds: Math.min(nextWatchedSeconds, durationSeconds),
                completed: nextWatchedSeconds >= durationSeconds,
              },
            },
          },
        };
      });
    },
    []
  );

  const saveExamAttempt = useCallback((courseId: string, attempt: TrainingExamAttempt) => {
    setCourseProgress((current) => ({
      ...current,
      [courseId]: {
        ...(current[courseId] ?? { lessons: {} }),
        examAttempt: attempt,
      },
    }));
  }, []);

  const resetExamAttempt = useCallback((courseId: string) => {
    setCourseProgress((current) => ({
      ...current,
      [courseId]: {
        ...(current[courseId] ?? { lessons: {} }),
        examAttempt: undefined,
      },
    }));
  }, []);

  const trainingProgressContextValue = useMemo(
    () => ({
      courseProgress,
      updateLessonWatchTime,
      saveExamAttempt,
      resetExamAttempt,
    }),
    [courseProgress, updateLessonWatchTime, saveExamAttempt, resetExamAttempt]
  );

  const [activeRole, setActiveRole] = useState<UserRole>('colaborador');
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);

  const [adminTemas, setAdminTemas] = useState<AdminTemaItem[]>([]);
  const [isLoadingAdminTemas, setIsLoadingAdminTemas] = useState(true);

  useEffect(() => {
    let isActive = true;
    fetchAdminTemas()
      .then((data) => {
        if (isActive) setAdminTemas(data);
      })
      .catch(() => {
        // Sem tema real ainda (endpoint pode não estar publicado no domínio
        // de produção) — o fallback (ADMIN_THEME_FALLBACK) garante que o app
        // continua com a cor navy atual em vez de quebrar.
        if (isActive) setAdminTemas([]);
      })
      .finally(() => {
        if (isActive) setIsLoadingAdminTemas(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const adminThemePresets = useMemo(
    () => (adminTemas.length > 0 ? adminTemas.map(temaToPreset) : [ADMIN_THEME_FALLBACK]),
    [adminTemas]
  );
  const adminTheme = useMemo(() => {
    const activeTema = adminTemas.find((tema) => tema.isActive);
    return activeTema ? temaToPreset(activeTema) : adminThemePresets[0];
  }, [adminTemas, adminThemePresets]);

  const applyAdminTheme = useCallback(
    (slug: string) => {
      setAdminTemas((current) => current.map((tema) => ({ ...tema, isActive: tema.slug === slug })));
      updateAdminTema(slug, { ativo: true }, identity?.profileId).catch(() => {
        // Reverte o otimismo se a escrita falhar de verdade — refaz a busca
        // pra refletir o estado real do banco.
        fetchAdminTemas()
          .then(setAdminTemas)
          .catch(() => {});
      });
    },
    [identity?.profileId]
  );

  const [colaboradorNotifications, setColaboradorNotifications] = useState<ColaboradorNotificacaoItem[]>([]);

  // Busca leve, só pra alimentar o badge de "não lida" no sininho do TopBar
  // (mesma fonte real usada pela tela de Notificações, que faz sua própria
  // busca completa quando aberta).
  useEffect(() => {
    const colaboradorId = identity?.colaboradorId ?? null;
    if (!colaboradorId) {
      setColaboradorNotifications([]);
      return;
    }

    let isActive = true;
    fetchColaboradorNotificacoes(colaboradorId)
      .then((data) => {
        if (isActive) setColaboradorNotifications(data.items);
      })
      .catch(() => {
        if (isActive) setColaboradorNotifications([]);
      });

    return () => {
      isActive = false;
    };
  }, [identity?.colaboradorId]);

  const [colaboradorPerfil, setColaboradorPerfil] = useState<RhColaboradorRaw | null>(null);
  const [isLoadingColaboradorPerfil, setIsLoadingColaboradorPerfil] = useState(false);
  const [colaboradorPerfilError, setColaboradorPerfilError] = useState<string | null>(null);

  useEffect(() => {
    const colaboradorId = identity?.colaboradorId ?? null;
    if (!colaboradorId) {
      setColaboradorPerfil(null);
      setColaboradorPerfilError(null);
      return;
    }

    let isActive = true;
    setIsLoadingColaboradorPerfil(true);
    setColaboradorPerfilError(null);

    fetchRhColaboradorDetalhe(colaboradorId)
      .then((data) => {
        if (isActive) setColaboradorPerfil(data);
      })
      .catch((err) => {
        if (isActive) {
          setColaboradorPerfil(null);
          setColaboradorPerfilError(
            err instanceof Error ? err.message : 'Não foi possível carregar seus dados cadastrais.'
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingColaboradorPerfil(false);
      });

    return () => {
      isActive = false;
    };
  }, [identity?.colaboradorId]);

  return (
    <SafeAreaProvider>
      <AuthIdentityContext.Provider value={{ identity, setIdentity }}>
      <ColaboradorPerfilContext.Provider
        value={{ perfil: colaboradorPerfil, isLoading: isLoadingColaboradorPerfil, errorMessage: colaboradorPerfilError }}
      >
      <AdminThemeContext.Provider
        value={{ theme: adminTheme, temas: adminThemePresets, isLoading: isLoadingAdminTemas, applyTheme: applyAdminTheme }}
      >
      <ColaboradorNotificationsContext.Provider value={{ items: colaboradorNotifications }}>
      <UserRoleContext.Provider value={{ activeRole, setActiveRole }}>
      <UniformReceiptContext.Provider
        value={{
          receivedUniformIds,
          markUniformAsReceived: (uniformId) =>
            setReceivedUniformIds((current) => (current[uniformId] ? current : { ...current, [uniformId]: true })),
        }}
      >
        <PayslipAcknowledgementContext.Provider
          value={{
            acknowledgedPayslipIds,
            acknowledgePayslip: (payslipId) =>
              setAcknowledgedPayslipIds((current) =>
                current[payslipId] ? current : { ...current, [payslipId]: true }
              ),
          }}
        >
        <NotificationsReadContext.Provider
          value={{
            readNotificationIds,
            markNotificationAsRead: (notificationId) =>
              setReadNotificationIds((current) =>
                current[notificationId] ? current : { ...current, [notificationId]: true }
              ),
          }}
        >
        <SecurityPreferencesContext.Provider
          value={{
            isTwoFactorEnabled,
            isBiometricLoginEnabled,
            setIsTwoFactorEnabled,
            setIsBiometricLoginEnabled,
          }}
        >
          <TrainingProgressContext.Provider value={trainingProgressContextValue}>
            <MenuContext.Provider
              value={{
                openMenu: () => setIsMenuOpen(true),
                closeMenu: () => setIsMenuOpen(false),
              }}
            >
              <NavigationContainer
                ref={navigationRef}
                onReady={() => {
                  setCurrentRoute(getNavigationRouteName());
                }}
                onStateChange={() => {
                  setCurrentRoute(getNavigationRouteName());
                }}
              >
                <View style={styles.appShell}>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Splash" component={SplashScreen} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    <Stack.Screen name="SelectPanel" component={SelectPanelScreen} />
                    <Stack.Screen name="DeviceAuth" component={DeviceAuthScreen} />
                    <Stack.Screen name="TwoFactorVerification" component={TwoFactorVerificationScreen} />
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
                    <Stack.Screen name="Trainings" component={TrainingsScreen} />
                    <Stack.Screen name="TrainingDetail" component={TrainingDetailScreen} />
                    <Stack.Screen name="TrainingExam" component={TrainingExamScreen} />
                    <Stack.Screen name="TrainingExamResult" component={TrainingExamResultScreen} />
                    <Stack.Screen name="Calendar" component={CalendarScreen} />
                    <Stack.Screen name="Goals" component={GoalsScreen} />
                    <Stack.Screen name="Benefits" component={BenefitsScreen} />
                    <Stack.Screen name="Uniforms" component={UniformsScreen} />
                    <Stack.Screen name="Reimbursement" component={ReimbursementScreen} />
                    <Stack.Screen name="Payslips" component={PayslipsScreen} />
                    <Stack.Screen name="Approvals" component={ApprovalsScreen} />
                    <Stack.Screen name="Notifications" component={NotificationsScreen} />
                    <Stack.Screen name="Requests" component={RequestsScreen} />
                    <Stack.Screen name="Communications" component={CommunicationsScreen} />
                    <Stack.Screen name="Profile" component={ProfileScreen} />
                    <Stack.Screen name="ProfileSection" component={ProfileSectionScreen} />
                    <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
                    <Stack.Screen name="DirectorDashboard" component={DirectorDashboardScreen} />
                    <Stack.Screen name="DirectorProfile" component={DirectorProfileScreen} />
                    <Stack.Screen name="Sales" component={SalesScreen} />
                    <Stack.Screen name="Margin" component={MarginScreen} />
                    <Stack.Screen name="Stock" component={StockScreen} />
                    <Stack.Screen name="GnvMetrics" component={GnvMetricsScreen} />
                    <Stack.Screen name="ProcessMap" component={ProcessMapScreen} />
                    <Stack.Screen name="DirectorNotifications" component={DirectorNotificationsScreen} />
                    <Stack.Screen name="DirectorConversas" component={DirectorConversasScreen} />
                    <Stack.Screen name="DirectorConversaDetalhe" component={DirectorConversaDetalheScreen} />
                    <Stack.Screen name="RHDashboard" component={RHDashboardScreen} />
                    <Stack.Screen name="RHProfile" component={RHProfileScreen} />
                    <Stack.Screen name="RHColaboradores" component={RHColaboradoresScreen} />
                    <Stack.Screen name="RHColaboradorDetalhe" component={RHColaboradorDetalheScreen} />
                    <Stack.Screen name="RHPreContratados" component={RHPreContratadosScreen} />
                    <Stack.Screen name="RHConformidadeAdmissoes" component={RHConformidadeAdmissoesScreen} />
                    <Stack.Screen name="RHTransferencias" component={RHTransferenciasScreen} />
                    <Stack.Screen name="RHComunicados" component={RHComunicadosScreen} />
                    <Stack.Screen name="RHSolicitacoes" component={RHSolicitacoesScreen} />
                    <Stack.Screen name="RHImportarPdf" component={RHImportarPdfScreen} />
                    <Stack.Screen name="RHNotifications" component={RHNotificationsScreen} />
                    <Stack.Screen name="RHMetas" component={RHMetasScreen} />
                    <Stack.Screen name="RHPonto" component={RHPontoScreen} />
                    <Stack.Screen name="RHFerias" component={RHFeriasScreen} />
                    <Stack.Screen name="RHExperiencia" component={RHExperienciaScreen} />
                    <Stack.Screen name="RHFolhaPagamento" component={RHFolhaPagamentoScreen} />
                    <Stack.Screen name="RHRecursosOperacionais" component={RHRecursosOperacionaisScreen} />
                    <Stack.Screen name="RHWorkflow" component={RHWorkflowScreen} />
                    <Stack.Screen name="RHRelatorios" component={RHRelatoriosScreen} />
                    <Stack.Screen name="RHConfiguracoes" component={RHConfiguracoesScreen} />
                    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
                    <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
                    <Stack.Screen name="AdminUsuarios" component={AdminUsuariosScreen} />
                    <Stack.Screen name="AdminPerfilAcesso" component={AdminPerfilAcessoScreen} />
                    <Stack.Screen name="AdminGrupos" component={AdminGruposScreen} />
                    <Stack.Screen name="AdminUnidades" component={AdminUnidadesScreen} />
                    <Stack.Screen name="AdminModulos" component={AdminModulosScreen} />
                    <Stack.Screen name="AdminIntegracoes" component={AdminIntegracoesScreen} />
                    <Stack.Screen name="AdminConvencoes" component={AdminConvencoesScreen} />
                    <Stack.Screen name="AdminConfiguracoes" component={AdminConfiguracoesScreen} />
                    <Stack.Screen name="AdminVersoes" component={AdminVersoesScreen} />
                    <Stack.Screen name="AdminNotifications" component={AdminNotificationsScreen} />
                    <Stack.Screen name="AdminLogs" component={AdminLogsScreen} />
                  </Stack.Navigator>

                  {isMenuOpen ? (
                    <SideMenuOverlay
                      initials={
                        activeRole === 'diretoria'
                          ? directorUserInitials
                          : activeRole === 'rh'
                          ? rhUserInitials
                          : activeRole === 'administrador'
                          ? adminUserInitials
                          : currentUserInitials
                      }
                      currentRoute={currentRoute}
                      variant={activeRole}
                      onClose={() => setIsMenuOpen(false)}
                    />
                  ) : null}
                </View>
              </NavigationContainer>
            </MenuContext.Provider>
          </TrainingProgressContext.Provider>
        </SecurityPreferencesContext.Provider>
        </NotificationsReadContext.Provider>
        </PayslipAcknowledgementContext.Provider>
      </UniformReceiptContext.Provider>
      </UserRoleContext.Provider>
      </ColaboradorNotificationsContext.Provider>
      </AdminThemeContext.Provider>
      </ColaboradorPerfilContext.Provider>
      </AuthIdentityContext.Provider>
    </SafeAreaProvider>
  );
}

function SplashScreen({ navigation }: ScreenProps<'Splash'>) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 1800);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient colors={['#253F91', '#4C3A95', '#E0002A']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <StatusBar style="light" />
        <Image
          source={require('./assets/logo-branca.png')}
          style={styles.splashWatermarkLogo}
          resizeMode="contain"
        />
        <View style={styles.splashContent}>
          <Image
            source={require('./assets/logo-vertical.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
          <Text style={styles.splashTitle}>AMERICAN FUEL</Text>
          <Text style={styles.splashSubtitle}>Abastece a jornada do motorista</Text>
        </View>
        <View style={styles.splashFooter}>
          <View style={styles.loadingTrack}>
            <View style={styles.loadingFill} />
          </View>
          <Text style={styles.loadingText}>CARREGANDO</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Compartilhado entre LoginScreen (quando só existe 1 painel disponível) e
// SelectPanelScreen (depois que a pessoa escolhe qual painel abrir) — mantém
// o mesmo fluxo de biometria/2FA que já existia, só que agora o "papel"
// (activeRole) pode vir de uma escolha explícita em vez de sempre automático.
function proceedAfterRoleChosen(
  role: UserRole,
  // Tipado solto (route name "any") de propósito: esta função é chamada a
  // partir de mais de uma tela (Login, SelectPanel), cada uma com seu
  // próprio `navigation` tipado pro nome de rota específico dela — o tipo
  // exato de NativeStackNavigationProp não é substituível entre rotas
  // diferentes (invariante no parâmetro de rota), então travar num nome só
  // (ex: 'Login') quebra as outras chamadas.
  navigation: NativeStackNavigationProp<RootStackParamList, any>,
  setActiveRole: (role: UserRole) => void,
  isBiometricLoginEnabled: boolean,
  isTwoFactorEnabled: boolean
) {
  setActiveRole(role);

  if (isBiometricLoginEnabled) {
    navigation.replace('DeviceAuth');
    return;
  }

  if (isTwoFactorEnabled) {
    navigation.replace('TwoFactorVerification');
    return;
  }

  navigation.replace(
    role === 'diretoria'
      ? 'DirectorDashboard'
      : role === 'rh'
      ? 'RHDashboard'
      : role === 'administrador'
      ? 'AdminDashboard'
      : 'Dashboard'
  );
}

function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const [keepConnected, setKeepConnected] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isTwoFactorEnabled, isBiometricLoginEnabled } = useContext(SecurityPreferencesContext);
  const { setActiveRole } = useContext(UserRoleContext);
  const { setIdentity } = useContext(AuthIdentityContext);
  const { width: windowWidth } = useWindowDimensions();
  const bannerHeight = windowWidth * (1214 / 1920);

  const handleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const identity = await login(email.trim(), password);
      // availableRoles é a lista real de painéis que essa conta pode abrir
      // (pode ter mais de 1 — ex: RH + Colaborador, quando a pessoa também
      // tem ficha de colaborador vinculada). Fallback pro campo antigo
      // 'role' só por segurança, caso o backend não mande o array por algum
      // motivo (não deveria acontecer, mas evita quebrar o login à toa).
      const availableRoles = identity.availableRoles ?? [identity.role];

      // Nenhum painel disponível (ex.: login criado mas sem módulo nenhum
      // liberado e sem ficha de colaborador vinculada) — não dá pra fabricar
      // acesso, então avisamos em vez de deixar uma tela quebrada/vazia.
      if (availableRoles.length === 0) {
        Alert.alert(
          'Sem acesso liberado',
          'Seu acesso ainda não foi liberado para nenhum painel. Procure o RH.'
        );
        return;
      }

      setIdentity(identity);

      if (availableRoles.length > 1) {
        navigation.replace('SelectPanel');
        return;
      }

      proceedAfterRoleChosen(availableRoles[0], navigation, setActiveRole, isBiometricLoginEnabled, isTwoFactorEnabled);
    } catch (err) {
      // Mensagem amigável fixa por tipo de erro — nunca mostra o texto cru
      // que vem do backend/Supabase (tipo "Invalid login credentials"), que
      // confunde o usuário. 'invalid_credentials' é sempre "senha errada" pro
      // usuário, mesmo que a causa real seja e-mail inexistente — não damos
      // essa pista por segurança (evita confirmar quais e-mails existem).
      let title = 'Não foi possível entrar';
      let message = 'Tente novamente em instantes.';

      if (err instanceof ApiError) {
        if (err.code === 'invalid_credentials') {
          title = 'E-mail ou senha incorretos';
          message = 'Confira os dados e tente novamente.';
        } else if (err.code === 'missing_credentials') {
          title = 'Preencha os campos';
          message = 'Informe e-mail e senha para entrar.';
        } else if (err.code === 'network_error') {
          title = 'Sem conexão';
          message = 'Não foi possível conectar. Verifique sua internet.';
        } else if (err.code === 'auth_not_configured') {
          title = 'Login indisponível no momento';
          message = 'Fale com o suporte — o serviço de login ainda está sendo configurado.';
        }
      }

      Alert.alert(title, message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <StatusBar style="light" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.flex}>
          <ImageBackground
            source={require('./assets/banner.png')}
            style={[styles.loginHeroBanner, { height: bannerHeight }]}
            resizeMode="cover"
          />

          <View style={styles.loginCard}>
            <FieldLabel label="Matrícula ou e-mail" />
            <InputRow
              icon={<Feather name="user" size={18} color="#99A0BA" />}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="email@americanfuel.com.br"
            />

            <FieldLabel label="Senha" style={styles.spacingTop} />
            <InputRow
              icon={<Feather name="lock" size={18} color="#99A0BA" />}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="****"
            />

            <View style={styles.loginOptions}>
              <Pressable style={styles.keepConnectedRow} onPress={() => setKeepConnected((value) => !value)}>
                <View style={[styles.checkbox, keepConnected && styles.checkboxChecked]}>
                  {keepConnected ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                </View>
                <Text style={styles.keepConnectedText}>Manter conectado</Text>
              </Pressable>

              <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotPassword}>Esqueci a senha</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>{isSubmitting ? 'Entrando...' : 'Entrar'}</Text>
              {isSubmitting ? null : <Feather name="arrow-right" size={18} color="#FFFFFF" />}
            </Pressable>
          </View>

          <View style={styles.loginFooter}>
            <Text style={styles.loginFooterText}>American Fuel - V1.0</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const PANEL_OPTION_META: Record<
  UserRole,
  { label: string; subtitle: string; icon: keyof typeof Feather.glyphMap; color: string; tint: string }
> = {
  // Cores batem com o gradiente/tema já usado dentro de cada painel (hero da
  // tela de Perfil de cada um), só pra dar consistência visual na hora de
  // escolher qual abrir.
  diretoria: {
    label: 'Diretoria',
    subtitle: 'Painéis de negócio (vendas, margem, estoque)',
    icon: 'trending-up',
    color: '#2F4EA8',
    tint: '#EAEFFB',
  },
  rh: {
    label: 'RH',
    subtitle: 'Painel de recursos humanos',
    icon: 'users',
    color: '#1B6E3A',
    tint: '#E7F5EC',
  },
  colaborador: {
    label: 'Colaborador',
    subtitle: 'Seus dados pessoais',
    icon: 'user',
    color: '#A11054',
    tint: '#FBEAF1',
  },
  administrador: {
    label: 'Administrador',
    subtitle: 'Gestão da plataforma (usuários, acessos, sistema)',
    icon: 'shield',
    color: '#1B2340',
    tint: '#E7E9F2',
  },
};

// Aparece só quando o login tem mais de 1 painel disponível (ex.: alguém com
// módulo RH que também tem ficha de colaborador vinculada) — mesma ideia da
// tela "Mestre -> /admin; 1 módulo -> direto; 2+ -> escolher" que já existe
// no painel web, só que pro app mobile.
function SelectPanelScreen({ navigation }: ScreenProps<'SelectPanel'>) {
  const { identity } = useContext(AuthIdentityContext);
  const { setActiveRole } = useContext(UserRoleContext);
  const { isBiometricLoginEnabled, isTwoFactorEnabled } = useContext(SecurityPreferencesContext);
  const insets = useSafeAreaInsets();
  const roles = identity?.availableRoles ?? [];

  const handleSelect = (role: UserRole) => {
    proceedAfterRoleChosen(role, navigation, setActiveRole, isBiometricLoginEnabled, isTwoFactorEnabled);
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#253F91', '#4C3A95']}
        style={[styles.selectPanelHero, { paddingTop: 24 + insets.top }]}
      >
        <View style={styles.selectPanelHeroIconShell}>
          <Feather name="grid" size={22} color="#FFFFFF" />
        </View>
        <Text style={styles.selectPanelHeroTitle}>Entrar como...</Text>
        <Text style={styles.selectPanelHeroSubtitle}>
          Sua conta tem acesso a mais de um painel. Escolha qual quer abrir.
        </Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.selectPanelList}>
        {roles.map((role) => {
          const meta = PANEL_OPTION_META[role];
          return (
            <Pressable
              key={role}
              style={({ pressed }) => [styles.selectPanelCard, pressed && styles.selectPanelCardPressed]}
              onPress={() => handleSelect(role)}
            >
              <View style={[styles.selectPanelIconShell, { backgroundColor: meta.tint }]}>
                <Feather name={meta.icon} size={22} color={meta.color} />
              </View>
              <View style={styles.selectPanelBody}>
                <Text style={styles.selectPanelTitle}>{meta.label}</Text>
                <Text style={styles.selectPanelSubtitle}>{meta.subtitle}</Text>
              </View>
              <View style={[styles.selectPanelChevronShell, { backgroundColor: meta.tint }]}>
                <Feather name="chevron-right" size={16} color={meta.color} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function ForgotPasswordScreen({ navigation }: ScreenProps<'ForgotPassword'>) {
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isLinkSent, setIsLinkSent] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSendLink = () => {
    setIsLinkSent(true);
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#284494', '#4A3A95']}
        style={[styles.forgotPasswordHero, { paddingTop: 14 + insets.top }]}
      >
        <Image
          source={require('./assets/logo-branca.png')}
          style={styles.heroWatermarkLogo}
          resizeMode="contain"
        />

        <Pressable style={styles.forgotPasswordBackRow} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={18} color="#FFFFFF" />
          <Text style={styles.forgotPasswordBackText}>Voltar ao login</Text>
        </Pressable>

        <View style={styles.forgotPasswordLockBadge}>
          <Feather name="lock" size={22} color="#FFFFFF" />
        </View>

        <Text style={styles.loginTitle}>Recuperar senha</Text>
        <Text style={styles.loginSubtitle}>
          Enviaremos um link de redefinição para o seu e-mail corporativo.
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.loginCard}
        contentContainerStyle={styles.forgotPasswordCardContent}
        showsVerticalScrollIndicator={false}
      >
        <FieldLabel label="Matrícula ou e-mail corporativo" />
        <InputRow
          icon={<Feather name="mail" size={18} color="#99A0BA" />}
          value={recoveryEmail}
          onChangeText={setRecoveryEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email@americanfuel.com.br"
        />

        <View style={styles.forgotPasswordInfoBox}>
          <Feather name="info" size={16} color="#29448D" />
          <Text style={styles.forgotPasswordInfoText}>
            Por segurança, o link só é enviado para o e-mail cadastrado no RH. Se você não tem acesso a
            ele, procure seu gestor.
          </Text>
        </View>

        {isLinkSent ? (
          <View style={styles.forgotPasswordSuccessBox}>
            <Feather name="check-circle" size={16} color="#18955A" />
            <Text style={styles.forgotPasswordSuccessText}>
              Link enviado! Verifique a caixa de entrada do seu e-mail corporativo.
            </Text>
          </View>
        ) : null}

        <Pressable style={styles.primaryButton} onPress={handleSendLink}>
          <Text style={styles.primaryButtonText}>
            {isLinkSent ? 'Reenviar link de redefinição' : 'Enviar link de redefinição'}
          </Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </Pressable>

        <Pressable style={[styles.secondaryButton, styles.forgotPasswordCancelButton]} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.loginFooter}>
        <Text style={styles.forgotPasswordHelpText}>Precisa de ajuda? Fale com o RH · ramal 4020</Text>
      </View>
    </SafeAreaView>
  );
}

function DeviceAuthScreen({ navigation }: ScreenProps<'DeviceAuth'>) {
  const { isTwoFactorEnabled } = useContext(SecurityPreferencesContext);
  const { activeRole } = useContext(UserRoleContext);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const proceedAfterDeviceAuth = () => {
    if (isTwoFactorEnabled) {
      navigation.replace('TwoFactorVerification');
      return;
    }

    navigation.replace(
      activeRole === 'diretoria'
        ? 'DirectorDashboard'
        : activeRole === 'rh'
        ? 'RHDashboard'
        : activeRole === 'administrador'
        ? 'AdminDashboard'
        : 'Dashboard'
    );
  };

  const handleAuthenticate = () => {
    setIsAuthenticating(true);

    setTimeout(() => {
      proceedAfterDeviceAuth();
    }, 900);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.deviceAuthContainer}>
        <View style={styles.deviceAuthIconShell}>
          <MaterialCommunityIcons name="fingerprint" size={40} color="#29448D" />
        </View>

        <Text style={styles.deviceAuthTitle}>Confirme sua identidade</Text>
        <Text style={styles.deviceAuthSubtitle}>
          Use a biometria (Face ID / digital) ou a senha deste aparelho para continuar o acesso.
        </Text>

        <Pressable
          style={[styles.primaryButton, styles.deviceAuthButton]}
          onPress={handleAuthenticate}
          disabled={isAuthenticating}
        >
          <Text style={styles.primaryButtonText}>
            {isAuthenticating ? 'Autenticando...' : 'Autenticar'}
          </Text>
        </Pressable>

        <Pressable style={styles.deviceAuthCancelButton} onPress={() => navigation.replace('Login')}>
          <Text style={styles.deviceAuthCancelText}>Cancelar e voltar ao login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function TwoFactorVerificationScreen({ navigation }: ScreenProps<'TwoFactorVerification'>) {
  const { activeRole } = useContext(UserRoleContext);
  const dashboardRoute =
    activeRole === 'diretoria'
      ? 'DirectorDashboard'
      : activeRole === 'rh'
      ? 'RHDashboard'
      : activeRole === 'administrador'
      ? 'AdminDashboard'
      : 'Dashboard';
  const verificationEmail =
    activeRole === 'diretoria'
      ? directorUser.email
      : activeRole === 'rh'
      ? rhUser.email
      : activeRole === 'administrador'
      ? adminUser.email
      : currentUser.email;
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [autoFilled, setAutoFilled] = useState(false);
  const codeInputRefs = useRef<Array<TextInput | null>>([]);

  const isCodeComplete = digits.every((digit) => digit.length === 1);

  useEffect(() => {
    const notificationTimer = setTimeout(() => {
      setDigits(Array.from({ length: 6 }, () => String(Math.floor(Math.random() * 10))));
      setAutoFilled(true);
    }, 1800);

    return () => clearTimeout(notificationTimer);
  }, []);

  useEffect(() => {
    if (!autoFilled) {
      return;
    }

    const redirectTimer = setTimeout(() => {
      navigation.replace(dashboardRoute);
    }, 900);

    return () => clearTimeout(redirectTimer);
  }, [autoFilled, navigation, dashboardRoute]);

  const handleChangeDigit = (text: string, index: number) => {
    const sanitized = text.replace(/[^0-9]/g, '').slice(-1);

    setDigits((current) => {
      const next = [...current];
      next[index] = sanitized;
      return next;
    });

    if (sanitized && index < digits.length - 1) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendCode = () => {
    setDigits(['', '', '', '', '', '']);
    setAutoFilled(false);
    codeInputRefs.current[0]?.focus();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.twoFactorHeader}>
          <View style={styles.twoFactorIconShell}>
            <Feather name="mail" size={24} color="#29448D" />
          </View>
          <Text style={styles.twoFactorTitle}>Verificação em duas etapas</Text>
          <Text style={styles.twoFactorSubtitle}>
            Enviamos um código de 6 dígitos para{'\n'}
            {verificationEmail}
          </Text>
        </View>

        <View style={styles.twoFactorCodeRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={`code-digit-${index}`}
              ref={(inputRef) => {
                codeInputRefs.current[index] = inputRef;
              }}
              style={[styles.twoFactorCodeBox, digit ? styles.twoFactorCodeBoxFilled : null]}
              value={digit}
              onChangeText={(text) => handleChangeDigit(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
            />
          ))}
        </View>

        <View style={styles.twoFactorStatusRow}>
          {autoFilled ? (
            <>
              <Feather name="check-circle" size={14} color="#18955A" />
              <Text style={styles.twoFactorStatusTextSuccess}>
                Código preenchido automaticamente pela notificação
              </Text>
            </>
          ) : (
            <Text style={styles.twoFactorStatusText}>Aguardando o código chegar no seu e-mail...</Text>
          )}
        </View>

        <Pressable
          style={[styles.primaryButton, !isCodeComplete ? styles.trainingDisabledButton : null]}
          disabled={!isCodeComplete}
          onPress={() => navigation.replace(dashboardRoute)}
        >
          <Text style={styles.primaryButtonText}>Confirmar código</Text>
        </Pressable>

        <Pressable style={styles.twoFactorResendButton} onPress={handleResendCode}>
          <Text style={styles.twoFactorResendText}>Não recebeu? Reenviar código</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardScreen({ navigation }: ScreenProps<'Dashboard'>) {
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  // Nome real de quem logou (profiles.full_name, via login) — nunca o mock
  // "Bruno Lima". Se o login ainda não resolveu nome nenhum, mostra a
  // saudação sem nome em vez de inventar um.
  const greetingFirstName = identity?.fullName ? getFirstName(identity.fullName) : null;
  const [homeData, setHomeData] = useState<ColaboradorHomeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [proximoEvento, setProximoEvento] = useState<RhCalendarioEvento | null | undefined>(undefined);

  useEffect(() => {
    if (!colaboradorId) {
      // Sem identidade real (ainda não logou) ou perfil sem colaborador
      // vinculado no RH — não dá pra buscar nem fabricar dado, então mostramos
      // estado vazio honesto abaixo em vez de chamar a API com um id inválido.
      setHomeData(null);
      setErrorMessage(null);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchColaboradorHome(colaboradorId)
      .then((data) => {
        if (isActive) setHomeData(data);
      })
      .catch((err) => {
        if (isActive) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar seu painel.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [colaboradorId]);

  // rh_calendario_eventos (endpoint liberado pela Lovable em 03/08/2026) — o
  // card "Próximos eventos" mostra o próprio próximo evento (data + título),
  // igual ao card do web, em vez de uma contagem.
  useEffect(() => {
    if (!colaboradorId) {
      setProximoEvento(null);
      return;
    }

    let isActive = true;
    fetchRhCalendarioEventos({ colaboradorId, de: new Date().toISOString(), incluirGlobais: true, limit: 1 })
      .then((eventos) => {
        if (isActive) setProximoEvento(eventos[0] ?? null);
      })
      .catch(() => {
        if (isActive) setProximoEvento(null);
      });

    return () => {
      isActive = false;
    };
  }, [colaboradorId]);

  const homeCards: DashboardCardProps[] = [
    {
      icon: 'megaphone-outline',
      iconColor: '#F03A51',
      tintColor: '#FCE8EC',
      label: 'Comunicados',
      value: homeData ? String(homeData.comunicadosNaoLidos) : '—',
    },
    {
      icon: 'calendar-outline',
      iconColor: '#5F6DB3',
      tintColor: '#EDF1FF',
      label: 'Próximos eventos',
      value:
        proximoEvento === undefined
          ? '—'
          : proximoEvento === null
          ? '—'
          : formatDiaMesBR(proximoEvento.inicio_em),
      caption: proximoEvento?.titulo ?? null,
    },
    {
      icon: 'briefcase-outline',
      iconColor: '#B18316',
      tintColor: '#FCF4DE',
      label: 'Chamados em aberto',
      value: homeData ? String(homeData.chamadosAbertos) : '—',
    },
    {
      icon: 'school-outline',
      iconColor: '#2D9E6A',
      tintColor: '#E4F5EE',
      label: 'Treinamentos',
      value: homeData ? String(homeData.treinamentosPendentes) : '—',
    },
  ];

  const comunicadosRecentes = homeData?.comunicadosRecentes ?? [];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <LinearGradient colors={['#3554AC', '#5C4AA5']} style={styles.panelHero}>
          <Image
            source={require('./assets/logo-branca.png')}
            style={styles.panelWatermarkLogo}
            resizeMode="contain"
          />
          <Text style={styles.panelGreeting}>{greetingFirstName ? `Bom dia, ${greetingFirstName}` : 'Bom dia'}</Text>
          <Text style={styles.panelTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.92}>
            Colaborador
          </Text>
          <Text style={styles.panelDescription} numberOfLines={2}>
            Aqui você acompanha tudo da empresa relacionado a você.
          </Text>
        </LinearGradient>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar os dados do seu
            painel.
          </Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : null}

        <View style={styles.grid}>
          {homeCards.map((card) => (
            <View key={card.label} style={styles.gridItem}>
              <DashboardCard {...card} />
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoCardTop}>
            <View style={styles.infoCardTitleRow}>
              <View style={[styles.iconShell, { backgroundColor: '#E7F7EF' }]}>
                <MaterialCommunityIcons name="cash-multiple" size={22} color="#299463" />
              </View>
              <Text style={styles.infoCardTitle}>Último contracheque</Text>
            </View>
            <Pressable style={styles.smallActionButton} onPress={() => navigation.navigate('Payslips')}>
              <Text style={styles.smallActionButtonText}>Ver</Text>
            </Pressable>
          </View>

          {homeData?.ultimoContracheque ? (
            <>
              <Text style={styles.infoCardMeta}>{homeData.ultimoContracheque.competenciaLabel} · líquido</Text>
              <Text style={styles.infoCardValue}>{homeData.ultimoContracheque.valorLiquido}</Text>
            </>
          ) : (
            <Text style={styles.infoCardMeta}>
              {isLoading ? 'Carregando...' : 'Nenhum contracheque lançado ainda.'}
            </Text>
          )}
        </View>

        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <View style={styles.listTitleRow}>
              <View style={[styles.iconShell, { backgroundColor: '#FCE8EC' }]}>
                <Ionicons name="megaphone-outline" size={19} color="#E6213D" />
              </View>
              <Text style={styles.listTitle}>Comunicados recentes</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('Communications')}>
              <Text style={styles.listAction}>Ver todos</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <Text style={styles.recentMeta}>Carregando comunicados...</Text>
          ) : comunicadosRecentes.length === 0 ? (
            <Text style={styles.recentMeta}>Nenhum comunicado recente.</Text>
          ) : (
            comunicadosRecentes.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.recentItem,
                  index < comunicadosRecentes.length - 1 ? styles.recentItemBorder : null,
                ]}
              >
                <View style={[styles.recentDot, { backgroundColor: '#E0002A' }]} />
                <View style={styles.recentTextBlock}>
                  <Text style={styles.recentTitle}>{item.titulo}</Text>
                  <Text style={styles.recentMeta}>{item.tempoLabel}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const TRAINING_STATUS_LABELS: Record<ColaboradorTreinamentoItem['status'], string> = {
  concluido: 'Concluído',
  em_andamento: 'Em andamento',
  nao_iniciado: 'Não iniciado',
};

// A lista abaixo (cards) reflete status/progresso reais de
// rh_treinamento_inscricoes + rh_treinamentos (via GET /treinamentos). O
// conteúdo do curso (aulas, vídeo, prova) também é real agora — ver
// TrainingDetailScreen/TrainingExamScreen mais abaixo, que buscam
// rh_treinamento_aulas/questoes/inscricoes e persistem a prova via
// rh_treinamento_respostas/prova (endpoint confirmado pela Lovable em
// 03/08/2026).
function TrainingsScreen({ navigation }: ScreenProps<'Trainings'>) {
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const [items, setItems] = useState<ColaboradorTreinamentoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!colaboradorId) {
      setItems([]);
      setErrorMessage(null);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchColaboradorTreinamentos(colaboradorId)
      .then((data) => {
        if (isActive) setItems(data.items);
      })
      .catch((err) => {
        if (isActive) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar seus treinamentos.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [colaboradorId]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Treinamentos</Text>
          <Text style={styles.pageSubtitle}>Cursos obrigatórios e desenvolvimento</Text>
        </View>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar seus treinamentos.
          </Text>
        ) : isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando treinamentos...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhum treinamento atribuído a você ainda.</Text>
        ) : (
          items.map((course) => (
            <Pressable
              key={course.id}
              style={styles.trainingCourseCard}
              onPress={() => navigation.navigate('TrainingDetail', { courseId: course.id })}
            >
              <View style={[styles.trainingCourseBadge, { backgroundColor: '#FCE8EC' }]}>
                <Feather name="award" size={20} color="#E0002A" />
              </View>

              <View style={styles.trainingCourseBody}>
                <View style={styles.trainingCourseHeader}>
                  <View style={styles.trainingCourseHeaderText}>
                    <Text style={styles.trainingCourseTitle}>{course.titulo}</Text>
                    <Text style={styles.trainingCourseSubtitle}>
                      {course.obrigatorio ? 'Treinamento obrigatório' : 'Treinamento opcional'}
                    </Text>
                  </View>
                  {course.categoria ? (
                    <View style={[styles.trainingTag, { backgroundColor: '#FCE8EC' }]}>
                      <Text style={[styles.trainingTagText, { color: '#E0002A' }]}>{course.categoria}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.trainingCourseMeta}>{course.duracaoLabel}</Text>

                <View style={styles.trainingProgressRow}>
                  <View style={styles.trainingProgressTrack}>
                    <View
                      style={[
                        styles.trainingProgressFill,
                        { width: `${course.progressoPct ?? 0}%`, backgroundColor: '#E0002A' },
                      ]}
                    />
                  </View>
                  <Text style={styles.trainingProgressValue}>
                    {course.progressoPct !== null ? `${course.progressoPct}%` : '—'}
                  </Text>
                </View>

                <View style={styles.trainingCourseFooter}>
                  <Text style={styles.trainingCourseFooterText}>{TRAINING_STATUS_LABELS[course.status]}</Text>
                  <Text style={styles.trainingCourseAction}>Abrir</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function useScreenCaptureProtection() {
  ScreenCapture.usePreventScreenCapture();

  useEffect(() => {
    ScreenCapture.enableAppSwitcherProtectionAsync().catch(() => {});

    return () => {
      ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, []);

  const handleScreenshotDetected = useCallback(() => {
    Alert.alert(
      'Print não permitido',
      'Este conteúdo de treinamento é protegido e não pode ser capturado em print.'
    );
  }, []);

  ScreenCapture.useScreenshotListener(handleScreenshotDetected);
}

function TrainingDetailScreen({ navigation, route }: ScreenProps<'TrainingDetail'>) {
  useScreenCaptureProtection();
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const { courseProgress, updateLessonWatchTime } = useContext(TrainingProgressContext);
  const courseId = route.params.courseId;

  const [treinamento, setTreinamento] = useState<RhTreinamentoCatalogo | null>(null);
  const [aulas, setAulas] = useState<RhTreinamentoAula[]>([]);
  const [questoesCount, setQuestoesCount] = useState<number>(0);
  const [inscricaoId, setInscricaoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const hasMarkedStartedRef = useRef(false);

  useEffect(() => {
    if (!colaboradorId) {
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    const labelCall = <T,>(label: string, promise: Promise<T>): Promise<T> =>
      promise.catch((err) => {
        const base = err instanceof Error ? err.message : String(err);
        throw new Error(`[${label} · treinamentoId=${courseId}] ${base}`);
      });

    Promise.all([
      labelCall('treinamento', fetchRhTreinamentoDetalhe(courseId)),
      labelCall('aulas', fetchRhTreinamentoAulas(courseId)),
      labelCall('questoes', fetchRhTreinamentoQuestoes(courseId)),
      labelCall('inscricoes', fetchRhTreinamentoInscricoes({ colaboradorId, treinamentoId: courseId })),
    ])
      .then(([treinamentoData, aulasData, questoesData, inscricoesData]) => {
        if (!isActive) return;
        setTreinamento(treinamentoData);
        setAulas([...aulasData].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
        setQuestoesCount(questoesData.length);
        const inscricao = inscricoesData[0] as { id?: string } | undefined;
        setInscricaoId((inscricao?.id as string | undefined) ?? null);
      })
      .catch((err) => {
        if (isActive) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar o treinamento.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [courseId, colaboradorId]);

  // Quando não há aulas cadastradas em rh_treinamento_aulas, mas o próprio
  // treinamento tem um video_url direto, tratamos ele como a aula única —
  // é literalmente o conteúdo que existe, não é invenção.
  const effectiveLessons: RhTreinamentoAula[] = useMemo(() => {
    if (aulas.length > 0) return aulas;
    if (treinamento?.video_url) {
      return [
        {
          id: `treinamento-${courseId}`,
          treinamento_id: courseId,
          ordem: 1,
          titulo: treinamento.titulo,
          descricao: treinamento.subtitulo ?? null,
          duracao_min: treinamento.carga_horaria_min ?? null,
          video_url: treinamento.video_url,
          video_storage_path: null,
        },
      ];
    }
    return [];
  }, [aulas, treinamento, courseId]);

  const lessonIds = useMemo(() => effectiveLessons.map((lesson) => lesson.id), [effectiveLessons]);
  const progress = courseProgress[courseId];
  const summary = getRealLessonProgressSummary(lessonIds, progress);
  const currentLessonId = getCurrentRealLessonId(lessonIds, progress);
  const unlockedLessonIds = getUnlockedRealLessonIds(lessonIds, progress);

  useEffect(() => {
    if (lessonIds.length === 0) return;
    if (!selectedLessonId || !lessonIds.includes(selectedLessonId)) {
      setSelectedLessonId(currentLessonId ?? lessonIds[0]);
    }
  }, [currentLessonId, lessonIds, selectedLessonId]);

  const selectedLesson =
    effectiveLessons.find((lesson) => lesson.id === selectedLessonId) ??
    effectiveLessons.find((lesson) => lesson.id === currentLessonId) ??
    effectiveLessons[0] ??
    null;
  const selectedLessonProgress = (selectedLesson && progress?.lessons[selectedLesson.id]) ?? {
    watchedSeconds: 0,
    completed: false,
  };
  const selectedLessonDurationSeconds = (selectedLesson?.duracao_min ?? 0) * 60;
  const isSelectedLessonCurrent = selectedLesson?.id === currentLessonId;
  const latestAttempt = progress?.examAttempt;
  const minimumScore = treinamento?.prova_min_acerto ?? 70;
  const examDurationSeconds = (treinamento?.prova_tempo_limite_min ?? 0) * 60;

  const player = useVideoPlayer(selectedLesson?.video_url ?? null, (p) => {
    p.timeUpdateEventInterval = 2;
  });

  useEffect(() => {
    if (selectedLesson?.video_url) {
      player.replace(selectedLesson.video_url);
    }
  }, [selectedLesson?.video_url, player]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        player.pause();
      }
    });

    return () => subscription.remove();
  }, [player]);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!selectedLesson || !isSelectedLessonCurrent || selectedLessonProgress.completed) return;

    const duration = player.duration || selectedLessonDurationSeconds || 0;
    if (duration > 0) {
      updateLessonWatchTime(courseId, selectedLesson.id, Math.floor(currentTime), duration);
    }

    // Registra que o colaborador começou o treinamento — PATCH real em
    // rh_treinamento_inscricoes, uma vez por sessão nesta tela. Não fabrica
    // progresso por aula (o backend não guarda isso granularmente), só
    // marca que ele engajou com o conteúdo.
    if (inscricaoId && !hasMarkedStartedRef.current) {
      hasMarkedStartedRef.current = true;
      updateRhTreinamentoInscricao(
        inscricaoId,
        { status: 'em_andamento', iniciado_em: new Date().toISOString() },
        identity?.profileId
      ).catch(() => {});
    }
  });

  useEventListener(player, 'playToEnd', () => {
    if (!selectedLesson) return;
    const duration = player.duration || selectedLessonDurationSeconds || 0;
    if (duration > 0) {
      updateLessonWatchTime(courseId, selectedLesson.id, duration, duration);
    }
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.profileBackRow} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={18} color="#29448D" />
          <Text style={styles.profileBackText}>Treinamentos</Text>
        </Pressable>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar seus treinamentos.
          </Text>
        ) : isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando treinamento...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : !inscricaoId ? (
          <Text style={styles.conversaEmptyText}>
            Você ainda não está inscrito neste treinamento. Fale com o RH.
          </Text>
        ) : (
          <>
            <View style={styles.trainingPlayerCard}>
              <View style={styles.trainingCourseTopBlock}>
                <View style={styles.trainingCourseTopHeader}>
                  {treinamento?.categoria ? (
                    <View style={[styles.trainingTag, { backgroundColor: '#EEF0F6' }]}>
                      <Text style={[styles.trainingTagText, { color: '#5C6580' }]}>{treinamento.categoria}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.trainingCourseTopProgress}>
                    {summary.completedLessons}/{effectiveLessons.length} concluídas
                  </Text>
                </View>

                <Text style={styles.trainingCourseTopTitle}>{treinamento?.titulo ?? 'Treinamento'}</Text>
                {treinamento?.subtitulo ? (
                  <Text style={styles.trainingCourseTopSubtitle}>{treinamento.subtitulo}</Text>
                ) : null}
              </View>

              {selectedLesson ? (
                <>
                  <View style={styles.trainingPlayerHeader}>
                    <View style={styles.trainingPlayerHeaderText}>
                      <Text style={styles.trainingPlayerLabel}>AULA ATUAL</Text>
                      <Text style={styles.trainingPlayerTitle}>{selectedLesson.titulo}</Text>
                    </View>
                  </View>

                  <View style={styles.trainingVideoPlayer}>
                    {selectedLesson.video_url ? (
                      <VideoView
                        player={player}
                        style={{ width: '100%', height: '100%' }}
                        nativeControls
                        allowsFullscreen
                        allowsPictureInPicture
                        contentFit="contain"
                      />
                    ) : (
                      <View style={styles.trainingVideoMockCenter}>
                        <Text style={styles.trainingVideoMockSubtitle}>
                          Nenhum vídeo cadastrado para esta aula.
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.trainingProgressRow}>
                    <View style={styles.trainingProgressTrack}>
                      <View
                        style={[
                          styles.trainingProgressFill,
                          {
                            width: `${Math.min(100, Math.round((selectedLessonProgress.watchedSeconds / (selectedLessonDurationSeconds || player.duration || 1)) * 100))}%`,
                            backgroundColor: '#E0002A',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.trainingProgressValue}>
                      {selectedLessonProgress.completed ? 'Concluída' : 'Em andamento'}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.conversaEmptyText}>
                  Nenhum conteúdo de aula cadastrado para este treinamento ainda.
                </Text>
              )}
            </View>

            {effectiveLessons.length > 0 ? (
              <View style={styles.trainingLessonsCard}>
                <Text style={styles.trainingSectionTitle}>Aulas</Text>

                {effectiveLessons.map((lesson, index) => {
                  const lessonProgress = progress?.lessons[lesson.id] ?? { watchedSeconds: 0, completed: false };
                  const lessonDurationSeconds = (lesson.duracao_min ?? 0) * 60;
                  const lessonPercent = lessonDurationSeconds
                    ? Math.min(100, Math.round((lessonProgress.watchedSeconds / lessonDurationSeconds) * 100))
                    : 0;
                  const isUnlocked = unlockedLessonIds.includes(lesson.id);
                  const isCurrent = lesson.id === currentLessonId;
                  const statusLabel = lessonProgress.completed
                    ? 'Concluída'
                    : isCurrent
                      ? lessonPercent > 0
                        ? 'Em andamento'
                        : 'Assistir'
                      : isUnlocked
                        ? 'Assistir'
                        : 'Bloqueada';

                  return (
                    <Pressable
                      key={lesson.id}
                      style={[
                        styles.trainingLessonRow,
                        index < effectiveLessons.length - 1 ? styles.trainingLessonBorder : null,
                        selectedLesson?.id === lesson.id ? styles.trainingLessonRowActive : null,
                      ]}
                      onPress={() => {
                        if (!isUnlocked) return;
                        setSelectedLessonId(lesson.id);
                      }}
                      disabled={!isUnlocked}
                    >
                      <View style={styles.trainingLessonLeft}>
                        <View
                          style={[
                            styles.trainingLessonIcon,
                            lessonProgress.completed
                              ? styles.trainingLessonIconDone
                              : isCurrent
                                ? styles.trainingLessonIconCurrent
                                : styles.trainingLessonIconDefault,
                          ]}
                        >
                          <Feather
                            name={lessonProgress.completed ? 'check' : !isUnlocked ? 'lock' : 'play'}
                            size={14}
                            color={lessonProgress.completed || isCurrent ? '#FFFFFF' : '#6D7690'}
                          />
                        </View>

                        <View style={styles.trainingLessonTextBlock}>
                          <Text style={styles.trainingLessonTitle}>{lesson.titulo}</Text>
                          <Text style={styles.trainingLessonSubtitle}>
                            {lesson.descricao ? `${lesson.descricao} · ` : ''}
                            {lesson.duracao_min ? `${lesson.duracao_min} min` : '—'}
                          </Text>
                          <Text
                            style={[
                              styles.trainingLessonStatus,
                              lessonProgress.completed ? styles.trainingLessonStatusDone : null,
                            ]}
                          >
                            {statusLabel}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.trainingLessonPercent}>{lessonPercent}%</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.trainingExamCard}>
              <View style={styles.trainingExamHeader}>
                <View>
                  <Text style={styles.trainingSectionTitle}>Prova final</Text>
                  <Text style={styles.trainingExamSubtitle}>
                    {questoesCount} questões · mínimo {minimumScore}% para aprovação
                  </Text>
                </View>
                {latestAttempt ? (
                  <View
                    style={[
                      styles.trainingTag,
                      { backgroundColor: latestAttempt.passed ? '#E4F5EE' : '#FCE8EC' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.trainingTagText,
                        { color: latestAttempt.passed ? '#18955A' : '#E0002A' },
                      ]}
                    >
                      {latestAttempt.passed ? 'Aprovado' : 'Não aprovado'}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.trainingExamMeta}>
                {examDurationSeconds > 0 ? `Tempo limite: ${formatSeconds(examDurationSeconds)}` : 'Sem tempo limite definido'}
              </Text>

              <Pressable
                style={[
                  styles.primaryButton,
                  !summary.allLessonsCompleted || questoesCount === 0 ? styles.trainingDisabledButton : null,
                ]}
                onPress={() => navigation.navigate('TrainingExam', { courseId })}
                disabled={!summary.allLessonsCompleted || questoesCount === 0}
              >
                <Text style={styles.primaryButtonText}>{latestAttempt ? 'Refazer prova' : 'Iniciar prova'}</Text>
              </Pressable>

              {questoesCount === 0 ? (
                <Text style={styles.trainingPausedHint}>Este treinamento ainda não tem perguntas cadastradas.</Text>
              ) : !summary.allLessonsCompleted ? (
                <Text style={styles.trainingPausedHint}>A prova libera somente após assistir todas as aulas.</Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TrainingExamScreen({ navigation, route }: ScreenProps<'TrainingExam'>) {
  useScreenCaptureProtection();
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const { saveExamAttempt } = useContext(TrainingProgressContext);
  const isFocused = useIsFocused();
  const courseId = route.params.courseId;

  const [treinamento, setTreinamento] = useState<RhTreinamentoCatalogo | null>(null);
  const [questoes, setQuestoes] = useState<RhTreinamentoQuestao[]>([]);
  const [inscricaoId, setInscricaoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [hasFinished, setHasFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLeftExamRef = useRef(false);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    if (!colaboradorId) {
      setErrorMessage('Seu acesso ainda não está vinculado a um colaborador no RH.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const labelExamCall = <T,>(label: string, promise: Promise<T>): Promise<T> =>
      promise.catch((err) => {
        const base = err instanceof Error ? err.message : String(err);
        throw new Error(`[${label} · treinamentoId=${courseId}] ${base}`);
      });

    Promise.all([
      labelExamCall('treinamento', fetchRhTreinamentoDetalhe(courseId)),
      labelExamCall('questoes', fetchRhTreinamentoQuestoes(courseId, false)),
      labelExamCall('inscricoes', fetchRhTreinamentoInscricoes({ colaboradorId, treinamentoId: courseId })),
    ])
      .then(([treinamentoData, questoesData, inscricoesData]) => {
        setTreinamento(treinamentoData);
        setQuestoes([...questoesData].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
        const inscricao = inscricoesData[0] as { id?: string } | undefined;
        setInscricaoId((inscricao?.id as string | undefined) ?? null);
        const limiteMin = treinamentoData?.prova_tempo_limite_min;
        setRemainingSeconds(limiteMin ? limiteMin * 60 : null);
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar a prova.');
      })
      .finally(() => setIsLoading(false));
  }, [courseId, colaboradorId]);

  const currentQuestion = questoes[currentQuestionIndex] ?? null;

  const finalizeExam = useCallback(
    (reason: 'submitted' | 'timeout') => {
      if (hasFinished || !inscricaoId || questoes.length === 0) return;
      setHasFinished(true);
      setIsSubmitting(true);

      const tempoGastoMin = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60000));

      submeterProvaTreinamento(
        {
          inscricao_id: inscricaoId,
          respostas: questoes.map((questao) => ({
            questao_id: questao.id,
            resposta: answers[questao.id] ?? '',
          })),
          tempo_gasto_min: tempoGastoMin,
        },
        identity?.profileId
      )
        .then(({ resultado }) => {
          const attempt: TrainingExamAttempt = {
            scorePercent: resultado.nota,
            correctAnswers: resultado.acertos,
            totalQuestions: resultado.total,
            passed: resultado.aprovado,
            minimumScore: resultado.prova_min_acerto,
            reason,
          };
          saveExamAttempt(courseId, attempt);
          navigation.replace('TrainingExamResult', { courseId });
        })
        .catch((err) => {
          setHasFinished(false);
          Alert.alert('Não foi possível enviar a prova', err instanceof Error ? err.message : 'Tente novamente.');
        })
        .finally(() => setIsSubmitting(false));
    },
    [hasFinished, inscricaoId, questoes, answers, identity?.profileId, saveExamAttempt, courseId, navigation]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  const isExamOnScreen = isFocused && appState === 'active';

  useEffect(() => {
    if (hasFinished || remainingSeconds === null) {
      return;
    }

    if (!isExamOnScreen) {
      hasLeftExamRef.current = true;
      return;
    }

    if (hasLeftExamRef.current) {
      hasLeftExamRef.current = false;
      Alert.alert(
        'Não saia da tela',
        'O cronômetro da prova foi pausado porque você saiu da tela. Evite sair durante a avaliação.'
      );
    }

    const interval = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current === null) return current;
        const nextRemainingSeconds = Math.max(0, current - 1);

        if (nextRemainingSeconds === 0) {
          finalizeExam('timeout');
        }

        return nextRemainingSeconds;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [finalizeExam, hasFinished, isExamOnScreen, remainingSeconds]);

  const progressBlock = questoes.length > 0 ? (
    <View style={styles.trainingExamProgressBlock}>
      <Text style={styles.trainingExamProgressLabel}>
        Questão {currentQuestionIndex + 1} de {questoes.length}
      </Text>
      <View style={styles.trainingProgressTrack}>
        <View
          style={[
            styles.trainingProgressFill,
            {
              width: `${((currentQuestionIndex + 1) / questoes.length) * 100}%`,
              backgroundColor: '#29448D',
            },
          ]}
        />
      </View>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.profileBackRow} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={18} color="#29448D" />
          <Text style={styles.profileBackText}>{treinamento?.titulo ?? 'Treinamentos'}</Text>
        </Pressable>

        {isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando prova...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : !inscricaoId ? (
          <Text style={styles.conversaEmptyText}>
            Você ainda não está inscrito neste treinamento. Fale com o RH.
          </Text>
        ) : questoes.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Este treinamento ainda não tem perguntas cadastradas.</Text>
        ) : (
          <>
            {remainingSeconds !== null ? (
              <View style={styles.trainingExamTimerCard}>
                <View>
                  <Text style={styles.trainingExamTimerLabel}>Tempo restante</Text>
                  <Text style={styles.trainingExamTimerValue}>{formatSeconds(remainingSeconds)}</Text>
                </View>
                {progressBlock}
              </View>
            ) : (
              progressBlock
            )}

            {currentQuestion ? (
              <View style={styles.trainingQuestionCard}>
                <Text style={styles.trainingQuestionTitle}>{currentQuestion.enunciado}</Text>

                {currentQuestion.alternativas.map((alternativa) => {
                  const isSelected = answers[currentQuestion.id] === alternativa.chave;

                  return (
                    <Pressable
                      key={`${currentQuestion.id}-${alternativa.chave}`}
                      style={[styles.trainingOptionCard, isSelected ? styles.trainingOptionCardSelected : null]}
                      onPress={() =>
                        setAnswers((current) => ({ ...current, [currentQuestion.id]: alternativa.chave }))
                      }
                    >
                      <View style={[styles.trainingOptionDot, isSelected ? styles.trainingOptionDotSelected : null]} />
                      <Text style={[styles.trainingOptionText, isSelected ? styles.trainingOptionTextSelected : null]}>
                        {alternativa.texto}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.trainingExamButtons}>
              <Pressable
                style={[styles.secondaryButton, currentQuestionIndex === 0 ? styles.trainingDisabledButton : null]}
                onPress={() => setCurrentQuestionIndex((value) => Math.max(0, value - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <Text style={styles.secondaryButtonText}>Anterior</Text>
              </Pressable>

              {currentQuestionIndex < questoes.length - 1 ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => setCurrentQuestionIndex((value) => Math.min(questoes.length - 1, value + 1))}
                >
                  <Text style={styles.primaryButtonText}>Próxima</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.primaryButton, isSubmitting ? styles.primaryButtonDisabled : null]}
                  onPress={() => finalizeExam('submitted')}
                  disabled={isSubmitting}
                >
                  <Text style={styles.primaryButtonText}>{isSubmitting ? 'Enviando...' : 'Finalizar prova'}</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TrainingExamResultScreen({ navigation, route }: ScreenProps<'TrainingExamResult'>) {
  const { courseProgress } = useContext(TrainingProgressContext);
  const courseId = route.params.courseId;
  const attempt = courseProgress[courseId]?.examAttempt;

  if (!attempt) {
    return null;
  }

  const isFailed = !attempt.passed;
  const accentColor = isFailed ? '#E0002A' : '#18955A';
  const badgeTint = isFailed ? '#FCE8EC' : '#E4F5EE';
  const badgeLabel = isFailed ? 'Não aprovado' : 'Aprovado';
  const headline = isFailed ? 'Quase lá' : 'Parabéns';
  const description =
    attempt.reason === 'timeout'
      ? 'O tempo da prova terminou antes da conclusão. Revise o conteúdo e tente novamente.'
      : isFailed
        ? `Você não atingiu a nota mínima de ${attempt.minimumScore}%. Revise o conteúdo e tente novamente.`
        : 'Você concluiu a avaliação com sucesso e já pode seguir com o treinamento.';

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <View style={styles.trainingResultContainer}>
        <View style={styles.trainingResultRing}>
          <View style={[styles.trainingResultRingDot, { backgroundColor: accentColor }]} />
          <View style={styles.trainingResultRingInner}>
            <Text style={styles.trainingResultPercent}>{attempt.scorePercent}%</Text>
            <Text style={styles.trainingResultScore}>
              {attempt.correctAnswers}/{attempt.totalQuestions} certas
            </Text>
          </View>
        </View>

        <View style={[styles.trainingResultBadge, { backgroundColor: badgeTint }]}>
          <Feather name={isFailed ? 'x' : 'check'} size={14} color={accentColor} />
          <Text style={[styles.trainingResultBadgeText, { color: accentColor }]}>{badgeLabel}</Text>
        </View>

        <Text style={styles.trainingResultTitle}>{headline}</Text>
        <Text style={styles.trainingResultDescription}>{description}</Text>

        {attempt.reason === 'timeout' ? (
          <Text style={styles.trainingResultTimeoutLabel}>Tempo esgotado</Text>
        ) : null}

        <View style={styles.trainingResultButtons}>
          <Pressable style={styles.primaryButton} onPress={() => navigation.replace('TrainingExam', { courseId })}>
            <Text style={styles.primaryButtonText}>{isFailed ? 'Refazer prova' : 'Fazer novamente'}</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => navigation.replace('TrainingDetail', { courseId })}>
            <Text style={styles.secondaryButtonText}>Voltar ao curso</Text>
          </Pressable>

          <Pressable style={styles.trainingResultLink} onPress={() => navigation.navigate('Trainings')}>
            <Text style={styles.trainingResultLinkText}>Todos os treinamentos</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function CalendarScreen({ navigation }: ScreenProps<'Calendar'>) {
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const today = new Date();
  const [currentMonthIndex, setCurrentMonthIndex] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState<'list' | 'month'>('month');
  const [holidayEventsByMonth, setHolidayEventsByMonth] = useState<Record<number, CalendarEvent[]>>(
    {}
  );
  const [realEventsByMonth, setRealEventsByMonth] = useState<Record<number, CalendarEvent[]>>({});
  const currentMonth = calendarMonths[currentMonthIndex];
  const mergedEvents = useMemo(
    () =>
      mergeCalendarEvents(
        holidayEventsByMonth[currentMonth.monthIndex] ?? [],
        realEventsByMonth[currentMonth.monthIndex] ?? []
      ),
    [currentMonth, holidayEventsByMonth, realEventsByMonth]
  );
  const calendarWeeks = getCalendarWeeks(currentMonth.year, currentMonth.monthIndex);
  const selectedDay =
    currentMonth.year === today.getFullYear() && currentMonth.monthIndex === today.getMonth()
      ? today.getDate()
      : undefined;
  const eventDotsByDay = mergedEvents.reduce<Record<number, string[]>>((acc, event) => {
    if (!acc[event.day]) {
      acc[event.day] = [];
    }

    if (!acc[event.day].includes(event.tagColor)) {
      acc[event.day].push(event.tagColor);
    }

    return acc;
  }, {});

  useEffect(() => {
    let isMounted = true;

    async function loadHolidays() {
      try {
        const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${calendarYear}`);

        if (!response.ok) {
          throw new Error('Falha ao carregar feriados');
        }

        const holidays = (await response.json()) as BrazilHolidayApiItem[];

        if (isMounted) {
          setHolidayEventsByMonth(buildHolidayEvents(holidays));
        }
      } catch {
        if (isMounted) {
          setHolidayEventsByMonth({});
        }
      }
    }

    loadHolidays();

    return () => {
      isMounted = false;
    };
  }, []);

  // rh_calendario_eventos (real, endpoint liberado pela Lovable em
  // 03/08/2026) — busca o ano inteiro do colaborador logado + eventos
  // globais da empresa, uma vez, e distribui por mês pro merge com feriados.
  useEffect(() => {
    if (!colaboradorId) {
      setRealEventsByMonth({});
      return;
    }

    let isMounted = true;

    fetchRhCalendarioEventos({
      colaboradorId,
      de: `${calendarYear}-01-01`,
      ate: `${calendarYear}-12-31`,
      incluirGlobais: true,
      limit: 500,
    })
      .then((eventos) => {
        if (isMounted) setRealEventsByMonth(buildRealCalendarEvents(eventos));
      })
      .catch(() => {
        if (isMounted) setRealEventsByMonth({});
      });

    return () => {
      isMounted = false;
    };
  }, [colaboradorId]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarHeaderRow}>
          <View style={styles.calendarHeaderText}>
            <Text style={styles.pageTitle}>Calendário</Text>
            <Text style={styles.pageSubtitle}>{currentMonth.monthLabel}</Text>
          </View>

          <View style={styles.calendarHeaderControls}>
            <Pressable
              style={styles.calendarViewButton}
              onPress={() => setViewMode((value) => (value === 'list' ? 'month' : 'list'))}
            >
              <Feather
                name={viewMode === 'list' ? 'grid' : 'list'}
                size={16}
                color="#5C6580"
              />
              <Text style={styles.calendarViewButtonText}>
                {viewMode === 'list' ? 'Ver mes' : 'Ver lista'}
              </Text>
            </Pressable>

            <View style={styles.calendarArrowGroup}>
              <Pressable
                style={[
                  styles.calendarArrowButton,
                  currentMonthIndex === 0 ? styles.calendarArrowButtonDisabled : null,
                ]}
                onPress={() => setCurrentMonthIndex((value) => Math.max(0, value - 1))}
                disabled={currentMonthIndex === 0}
              >
                <Feather
                  name="chevron-left"
                  size={18}
                  color={currentMonthIndex === 0 ? '#C8CEDD' : '#7A829A'}
                />
              </Pressable>

              <Pressable
                style={[
                  styles.calendarArrowButton,
                  currentMonthIndex === calendarMonths.length - 1
                    ? styles.calendarArrowButtonDisabled
                    : null,
                ]}
                onPress={() =>
                  setCurrentMonthIndex((value) => Math.min(calendarMonths.length - 1, value + 1))
                }
                disabled={currentMonthIndex === calendarMonths.length - 1}
              >
                <Feather
                  name="chevron-right"
                  size={18}
                  color={
                    currentMonthIndex === calendarMonths.length - 1 ? '#C8CEDD' : '#7A829A'
                  }
                />
              </Pressable>
            </View>
          </View>
        </View>

        {viewMode === 'list' ? (
          <>
            <Text style={styles.calendarSectionTitle}>PRÓXIMOS EVENTOS</Text>

            {mergedEvents.length ? (
              mergedEvents.map((event) => (
                <View key={event.id} style={styles.calendarEventCard}>
                  <View style={[styles.calendarDateBadge, { backgroundColor: event.dateTint }]}>
                    <Text style={[styles.calendarDateDay, { color: event.dateColor }]}>
                      {String(event.day).padStart(2, '0')}
                    </Text>
                    <Text style={[styles.calendarDateMonth, { color: event.dateColor }]}>
                      {event.monthShort}
                    </Text>
                  </View>

                  <View style={styles.calendarEventContent}>
                    <Text style={styles.calendarEventTitle}>{event.title}</Text>
                    <View style={styles.calendarEventMetaRow}>
                      <Text style={styles.calendarEventTime}>{event.time}</Text>
                      <View style={[styles.calendarEventTag, { backgroundColor: event.tagTint }]}>
                        <Text style={[styles.calendarEventTagText, { color: event.tagColor }]}>
                          {event.tag}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.calendarEmptyCard}>
                <Text style={styles.calendarEmptyText}>Nenhum evento programado para este mes.</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.calendarMonthPanel}>
            <Text style={styles.calendarMonthTitle}>{currentMonth.title}</Text>

            <View style={styles.calendarWeekDaysRow}>
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayLabel, index) => (
                <Text key={`${dayLabel}-${index}`} style={styles.calendarWeekDayLabel}>
                  {dayLabel}
                </Text>
              ))}
            </View>

            {calendarWeeks.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.calendarWeekRow}>
                {week.map((day) => {
                  const isSelected =
                    day.isCurrentMonth && selectedDay !== undefined && day.dayNumber === selectedDay;
                  const dayDots = day.isCurrentMonth ? eventDotsByDay[day.dayNumber] ?? [] : [];

                  return (
                    <View key={day.key} style={styles.calendarDayCell}>
                      <View style={styles.calendarDayContent}>
                        <View
                          style={[
                            styles.calendarDayCircle,
                            isSelected ? styles.calendarDayCircleSelected : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.calendarDayText,
                              !day.isCurrentMonth ? styles.calendarDayTextMuted : null,
                              isSelected ? styles.calendarDayTextSelected : null,
                            ]}
                          >
                            {day.dayNumber}
                          </Text>
                        </View>

                        <View style={styles.calendarDayDotsRow}>
                          {dayDots.slice(0, 3).map((dotColor, dotIndex) => (
                            <View
                              key={`${day.key}-dot-${dotIndex}`}
                              style={[styles.calendarDayDot, { backgroundColor: dotColor }]}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

            <View style={styles.calendarMonthEvents}>
              <Text style={styles.calendarMonthEventsTitle}>Eventos do mes</Text>

              {mergedEvents.map((event) => (
                <View key={`month-${event.id}`} style={styles.calendarMonthEventRow}>
                  <View style={[styles.calendarMonthEventDot, { backgroundColor: event.tagColor }]} />
                  <Text style={styles.calendarMonthEventText}>
                    {String(event.day).padStart(2, '0')} {event.monthShort} · {event.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalsScreen({ navigation }: ScreenProps<'Goals'>) {
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const [items, setItems] = useState<ColaboradorMetaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!colaboradorId) {
      setItems([]);
      setErrorMessage(null);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchColaboradorMetas(colaboradorId)
      .then((data) => {
        if (isActive) setItems(data.items);
      })
      .catch((err) => {
        if (isActive) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar suas metas.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [colaboradorId]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Metas</Text>
          <Text style={styles.pageSubtitle}>Metas atribuídas a você</Text>
        </View>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar suas metas.
          </Text>
        ) : isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando metas...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhuma meta cadastrada para você ainda.</Text>
        ) : (
          items.map((goal) => (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>{goal.titulo}</Text>
                <Text style={[styles.goalPercent, { color: goal.color }]}>
                  {goal.progressoPct !== null ? `${goal.progressoPct}%` : '—'}
                </Text>
              </View>

              <Text style={styles.goalSubtitle}>{goal.subtitulo}</Text>

              <View style={styles.goalTrack}>
                <View
                  style={[styles.goalFill, { width: `${goal.progressoPct ?? 0}%`, backgroundColor: goal.color }]}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Ícones/cores fixos por slug (estilo, não dado) — os slugs vêm do backend
// (GET /beneficios) e correspondem 1:1 às colunas *_ativo de
// rh_beneficios_colaborador.
const BENEFIT_VISUAL: Record<string, { icon: keyof typeof Feather.glyphMap; iconColor: string; tintColor: string }> = {
  vr: { icon: 'gift', iconColor: '#2D9E6A', tintColor: '#E4F5EE' },
  va: { icon: 'gift', iconColor: '#5E6DB4', tintColor: '#E9EEFF' },
  seguro_vida: { icon: 'shield', iconColor: '#8B5CF6', tintColor: '#EFE9FE' },
  plano_saude: { icon: 'heart', iconColor: '#E6213D', tintColor: '#FCE8EC' },
  plano_odonto: { icon: 'heart', iconColor: '#B5841A', tintColor: '#FCF3DA' },
};
const BENEFIT_VISUAL_FALLBACK = { icon: 'gift' as const, iconColor: '#5E667D', tintColor: '#EEF0F5' };

function BenefitsScreen({ navigation }: ScreenProps<'Benefits'>) {
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const [items, setItems] = useState<ColaboradorBeneficioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!colaboradorId) {
      setItems([]);
      setErrorMessage(null);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchColaboradorBeneficios(colaboradorId)
      .then((data) => {
        if (isActive) setItems(data.items);
      })
      .catch((err) => {
        if (isActive) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar seus benefícios.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [colaboradorId]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Meus Benefícios</Text>
          <Text style={styles.pageSubtitle}>Pacote ativo</Text>
        </View>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar seus benefícios.
          </Text>
        ) : isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando benefícios...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhum benefício ativo cadastrado para você.</Text>
        ) : (
          <View style={styles.benefitGrid}>
            {items.map((item) => {
              const visual = BENEFIT_VISUAL[item.id] ?? BENEFIT_VISUAL_FALLBACK;

              return (
                <View key={item.id} style={styles.benefitGridItem}>
                  <View style={styles.benefitCard}>
                    <View style={[styles.iconShell, { backgroundColor: visual.tintColor }]}>
                      <Feather name={visual.icon} size={18} color={visual.iconColor} />
                    </View>
                    <Text style={styles.benefitTitle}>{item.titulo}</Text>
                    <Text style={styles.benefitSubtitle}>
                      {item.valor ? `${item.subtitulo} · ${item.valor}` : item.subtitulo}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// rh_op_pedidos.status — endpoint rh-uniformes confirmado pela Lovable em
// 03/08/2026.
const UNIFORME_PEDIDO_STATUS_META: Record<string, { label: string; color: string; tint: string }> = {
  pendente_ciencia: { label: 'Pendente de ciência', color: '#5E6DB4', tint: '#E9EEFF' },
  em_aprovacao: { label: 'Em aprovação', color: '#B5841A', tint: '#FCF3DA' },
  aguardando_gerente: { label: 'Aguardando gerente', color: '#B5841A', tint: '#FCF3DA' },
  aguardando_gestao: { label: 'Aguardando gestão', color: '#B5841A', tint: '#FCF3DA' },
  aprovado: { label: 'Aprovado', color: '#2B9862', tint: '#E2F4EA' },
  pendente_entrega: { label: 'Aguardando entrega', color: '#2B9862', tint: '#E2F4EA' },
  entregue: { label: 'Entregue', color: '#2B9862', tint: '#E2F4EA' },
  recusado: { label: 'Recusado', color: '#C23B4B', tint: '#FBE3E7' },
  cancelado: { label: 'Cancelado', color: '#8992A8', tint: '#EDEFF4' },
};

function NewUniformePedidoModal({
  visible,
  colaboradorId,
  itens,
  onClose,
  onCreated,
}: {
  visible: boolean;
  colaboradorId: string;
  itens: RhUniformeItemCatalogo[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tipo, setTipo] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [tamanho, setTamanho] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTipo('');
      setJustificativa('');
      setSelectedItemId(null);
      setTamanho('');
      setQuantidade('1');
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!tipo.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o tipo do pedido (ex.: reposição, dano, novo colaborador).');
      return;
    }
    if (!selectedItemId) {
      Alert.alert('Campo obrigatório', 'Escolha o item.');
      return;
    }
    const quantidadeNum = Number(quantidade.replace(/\D/g, '')) || 1;

    setIsSaving(true);
    criarPedidoUniforme({
      colaborador_id: colaboradorId,
      tipo: tipo.trim(),
      justificativa: justificativa.trim() || undefined,
      itens: [{ item_id: selectedItemId, tamanho: tamanho.trim(), quantidade: quantidadeNum }],
    })
      .then(() => {
        onCreated();
        onClose();
      })
      .catch((err) => {
        Alert.alert('Não foi possível enviar', err instanceof Error ? err.message : 'Tente novamente.');
      })
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle}>Solicitar uniforme/EPI</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.requestFieldLabel}>Item</Text>
            {itens.length === 0 ? (
              <Text style={styles.conversaEmptyText}>Nenhum item disponível no catálogo ainda.</Text>
            ) : (
              itens.map((item) => {
                const isSelected = item.id === selectedItemId;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.requestSelectBox, isSelected ? styles.requestCategoryOptionSelected : null]}
                    onPress={() => setSelectedItemId(item.id)}
                  >
                    <Text style={styles.requestSelectText}>{item.nome}</Text>
                    {isSelected ? <Feather name="check" size={16} color="#2B9862" /> : null}
                  </Pressable>
                );
              })
            )}

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Tamanho</Text>
            <TextInput
              style={styles.processTextInput}
              value={tamanho}
              onChangeText={setTamanho}
              placeholder="Ex.: M, 42..."
              placeholderTextColor="#A7AEC2"
            />

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Quantidade</Text>
            <TextInput
              style={styles.processTextInput}
              value={quantidade}
              onChangeText={setQuantidade}
              keyboardType="number-pad"
              placeholderTextColor="#A7AEC2"
            />

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Tipo do pedido</Text>
            <TextInput
              style={styles.processTextInput}
              value={tipo}
              onChangeText={setTipo}
              placeholder="Ex.: reposição, dano, novo colaborador..."
              placeholderTextColor="#A7AEC2"
            />

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Justificativa (opcional)</Text>
            <TextInput
              style={styles.requestDescriptionInput}
              value={justificativa}
              onChangeText={setJustificativa}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#A7AEC2"
            />

            <Pressable
              style={[styles.primaryButton, styles.spacingTop, isSaving ? styles.primaryButtonDisabled : null]}
              onPress={handleSubmit}
              disabled={isSaving}
            >
              <Text style={styles.primaryButtonText}>{isSaving ? 'Enviando...' : 'Enviar pedido'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function UniformsScreen({ navigation }: ScreenProps<'Uniforms'>) {
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const [entregas, setEntregas] = useState<RhUniformeEntrega[]>([]);
  const [pedidos, setPedidos] = useState<RhUniformePedido[]>([]);
  const [itensCatalogo, setItensCatalogo] = useState<RhUniformeItemCatalogo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNewPedidoModalOpen, setIsNewPedidoModalOpen] = useState(false);

  const loadUniformes = useCallback(() => {
    if (!colaboradorId) {
      setEntregas([]);
      setPedidos([]);
      setErrorMessage(null);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    Promise.all([
      fetchRhUniformesEntregas(colaboradorId),
      fetchRhUniformesPedidos({ colaboradorId }),
      fetchRhUniformesItens(),
    ])
      .then(([entregasData, pedidosData, itensData]) => {
        setEntregas(entregasData);
        setPedidos(pedidosData);
        setItensCatalogo(itensData);
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar seus uniformes.');
      })
      .finally(() => setIsLoading(false));
  }, [colaboradorId]);

  useEffect(() => {
    loadUniformes();
  }, [loadUniformes]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Meus Uniformes</Text>
        </View>

        {colaboradorId ? (
          <Pressable
            style={[styles.requestsOpenButton, styles.spacingTop]}
            onPress={() => setIsNewPedidoModalOpen(true)}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.requestsOpenButtonText}>Solicitar uniforme/EPI</Text>
          </Pressable>
        ) : null}

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar seus uniformes.
          </Text>
        ) : isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : (
          <>
            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>ITENS ENTREGUES</Text>
            {entregas.length === 0 ? (
              <Text style={styles.conversaEmptyText}>Nenhum item entregue ainda.</Text>
            ) : (
              entregas.map((item) => (
                <View key={item.id} style={styles.uniformCard}>
                  <View style={styles.uniformLeft}>
                    <View style={[styles.iconShell, styles.iconAccentGray]}>
                      <Feather name="shopping-bag" size={18} color="#5E667D" />
                    </View>
                    <View style={styles.uniformTextBlock}>
                      <Text style={styles.uniformTitle}>Tam. {item.tamanho ?? '—'}</Text>
                      <Text style={styles.uniformSubtitle}>
                        {item.quantidade} unidade{item.quantidade > 1 ? 's' : ''} · entregue em{' '}
                        {formatDateOnlyBR(item.entregue_em)}
                      </Text>
                    </View>
                  </View>
                  <Feather name="check-circle" size={18} color="#2B9862" />
                </View>
              ))
            )}

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>MEUS PEDIDOS</Text>
            {pedidos.length === 0 ? (
              <Text style={styles.conversaEmptyText}>Nenhum pedido registrado ainda.</Text>
            ) : (
              pedidos.map((pedido) => {
                const meta = UNIFORME_PEDIDO_STATUS_META[pedido.status] ?? {
                  label: pedido.status,
                  color: '#5E6DB4',
                  tint: '#E9EEFF',
                };
                return (
                  <View key={pedido.id} style={styles.requestCard}>
                    <View style={styles.requestTopRow}>
                      <Text style={styles.requestTicketNumber}>{pedido.tipo ?? 'Pedido'}</Text>
                      <View style={[styles.statusPill, { backgroundColor: meta.tint }]}>
                        <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    {pedido.justificativa ? (
                      <Text style={styles.requestMeta}>{pedido.justificativa}</Text>
                    ) : null}
                    {pedido.motivo_recusa ? (
                      <Text style={[styles.requestMeta, { color: '#C23B4B' }]}>
                        Motivo da recusa: {pedido.motivo_recusa}
                      </Text>
                    ) : null}
                    {pedido.status === 'recusado' || pedido.status === 'cancelado' ? null : (
                      <View style={styles.uniformRecebidoRow}>
                        <Feather
                          name={pedido.status === 'entregue' ? 'check-circle' : 'circle'}
                          size={14}
                          color={pedido.status === 'entregue' ? '#2B9862' : '#A7AEC2'}
                        />
                        <Text
                          style={[
                            styles.uniformRecebidoText,
                            pedido.status === 'entregue' ? { color: '#2B9862' } : null,
                          ]}
                        >
                          {pedido.status === 'entregue' ? 'Recebido' : 'Ainda não recebido'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {colaboradorId ? (
        <NewUniformePedidoModal
          visible={isNewPedidoModalOpen}
          colaboradorId={colaboradorId}
          itens={itensCatalogo}
          onClose={() => setIsNewPedidoModalOpen(false)}
          onCreated={loadUniformes}
        />
      ) : null}
    </SafeAreaView>
  );
}

// rh_reembolsos — endpoint confirmado pela Lovable em 03/08/2026. Enum de
// status: rascunho | enviado | aprovado | pago | recusado.
const REEMBOLSO_STATUS_META: Record<string, { label: string; color: string; tint: string }> = {
  rascunho: { label: 'Rascunho', color: '#5E6DB4', tint: '#E9EEFF' },
  enviado: { label: 'Em análise', color: '#B5841A', tint: '#FCF3DA' },
  aprovado: { label: 'Aprovado', color: '#2B9862', tint: '#E2F4EA' },
  pago: { label: 'Pago', color: '#2B9862', tint: '#E2F4EA' },
  recusado: { label: 'Recusado', color: '#C23B4B', tint: '#FBE3E7' },
};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Máscara progressiva de moeda (mesmo padrão usado no RH: dígitos entram da
// direita pra esquerda nos centavos).
function formatCurrencyInputApp(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (!digits) return '';
  const cents = digits.padStart(3, '0');
  const intPart = cents.slice(0, -2).replace(/^0+(?=\d)/, '');
  const decimalPart = cents.slice(-2);
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withThousands},${decimalPart}`;
}

function parseCurrencyInputApp(text: string): number {
  const normalized = text.replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function brDateLabelToIsoApp(label: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(label.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

// Formulário de nova despesa — inline (sempre visível no topo da tela),
// mesmo layout usado no site: card de formulário primeiro, lista embaixo.
function NewReimbursementForm({
  colaboradorId,
  onCreated,
}: {
  colaboradorId: string;
  onCreated: () => void;
}) {
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [dataDespesa, setDataDespesa] = useState('');
  const [valorInput, setValorInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = () => {
    if (!descricao.trim()) {
      Alert.alert('Campo obrigatório', 'Descreva a despesa.');
      return;
    }
    const valor = parseCurrencyInputApp(valorInput);
    if (!valor) {
      Alert.alert('Valor inválido', 'Informe o valor da despesa.');
      return;
    }
    setIsSaving(true);
    createColaboradorReembolso({
      colaborador_id: colaboradorId,
      descricao: descricao.trim(),
      categoria: categoria.trim() || undefined,
      data_despesa: brDateLabelToIsoApp(dataDespesa) ?? undefined,
      valor,
    })
      .then(() => {
        setDescricao('');
        setCategoria('');
        setDataDespesa('');
        setValorInput('');
        onCreated();
      })
      .catch((err) => {
        Alert.alert('Não foi possível enviar', err instanceof Error ? err.message : 'Tente novamente.');
      })
      .finally(() => setIsSaving(false));
  };

  return (
    <View style={[styles.reimbursementCard, styles.spacingTop]}>
      <Text style={styles.requestModalTitle}>Nova solicitação</Text>

      <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Descrição</Text>
      <TextInput
        style={styles.processTextInput}
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Ex.: Combustível - visita técnica"
        placeholderTextColor="#A7AEC2"
      />

      <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Categoria (opcional)</Text>
      <TextInput
        style={styles.processTextInput}
        value={categoria}
        onChangeText={setCategoria}
        placeholder="Ex.: Transporte, Alimentação..."
        placeholderTextColor="#A7AEC2"
      />

      <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Data da despesa</Text>
      <TextInput
        style={styles.processTextInput}
        value={dataDespesa}
        onChangeText={setDataDespesa}
        placeholder="dd/mm/aaaa"
        placeholderTextColor="#A7AEC2"
        keyboardType="number-pad"
      />

      <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Valor</Text>
      <TextInput
        style={styles.processTextInput}
        value={valorInput}
        onChangeText={(text) => setValorInput(formatCurrencyInputApp(text))}
        placeholder="0,00"
        placeholderTextColor="#A7AEC2"
        keyboardType="number-pad"
      />

      <Pressable
        style={[styles.primaryButton, styles.spacingTop, isSaving ? styles.primaryButtonDisabled : null]}
        onPress={handleSubmit}
        disabled={isSaving}
      >
        <Text style={styles.primaryButtonText}>{isSaving ? 'Enviando...' : 'Enviar'}</Text>
      </Pressable>
    </View>
  );
}

function ReimbursementScreen({ navigation }: ScreenProps<'Reimbursement'>) {
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const [items, setItems] = useState<ColaboradorReembolsoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadReembolsos = useCallback(() => {
    if (!colaboradorId) {
      setItems([]);
      setErrorMessage(null);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    fetchColaboradorReembolsos(colaboradorId)
      .then(setItems)
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar seus reembolsos.');
      })
      .finally(() => setIsLoading(false));
  }, [colaboradorId]);

  useEffect(() => {
    loadReembolsos();
  }, [loadReembolsos]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Reembolso</Text>
          <Text style={styles.pageSubtitle}>Solicitações de despesas</Text>
        </View>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar seus reembolsos.
          </Text>
        ) : (
          <NewReimbursementForm colaboradorId={colaboradorId} onCreated={loadReembolsos} />
        )}

        {colaboradorId ? (
          <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Minhas solicitações</Text>
        ) : null}

        {!colaboradorId ? null : isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando reembolsos...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhuma despesa lançada ainda.</Text>
        ) : (
          items.map((item) => {
            const meta = REEMBOLSO_STATUS_META[item.status] ?? {
              label: item.status,
              color: '#5E6DB4',
              tint: '#E9EEFF',
            };
            return (
              <View key={item.id} style={styles.reimbursementCard}>
                <View style={styles.reimbursementTopRow}>
                  <Text style={styles.reimbursementTitle}>{item.descricao}</Text>
                  <Text style={styles.reimbursementAmount}>{formatBRL(item.valor)}</Text>
                </View>

                <View style={styles.reimbursementBottomRow}>
                  <Text style={styles.reimbursementDate}>{formatDateOnlyBR(item.data_despesa)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: meta.tint }]}>
                    <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Não existe tabela de rubricas/linhas ligada a rh_contracheques (isso existe
// só para rh_folha/rh_folha_lancamentos, tabela diferente e ainda não
// confirmada como fonte usada aqui) — por isso o preview do holerite abaixo
// não mostra composição linha a linha (nada de "Salário base", "INSS", etc.
// inventados). Mostramos só os 3 valores agregados que temos de verdade
// (bruto/descontos/líquido) e um botão "Ver PDF" quando o RH anexou o
// arquivo original.
function PayslipsScreen({ navigation }: ScreenProps<'Payslips'>) {
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const { acknowledgedPayslipIds, acknowledgePayslip } = useContext(PayslipAcknowledgementContext);

  const [items, setItems] = useState<ColaboradorContrachequeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<ColaboradorContrachequeItem | null>(null);

  useEffect(() => {
    if (!colaboradorId) {
      setItems([]);
      setErrorMessage(null);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchColaboradorContracheques(colaboradorId)
      .then((data) => {
        if (isActive) setItems(data.items);
      })
      .catch((err) => {
        if (isActive) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar seus contracheques.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [colaboradorId]);

  const openPayslipPreview = (item: ColaboradorContrachequeItem) => setSelectedPayslip(item);
  const closePayslipPreview = () => setSelectedPayslip(null);

  const openPayslipFile = (arquivoUrl: string | null) => {
    if (arquivoUrl) {
      Linking.openURL(arquivoUrl);
    } else {
      Alert.alert('PDF indisponível', 'O RH ainda não anexou o arquivo deste contracheque.');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Contra Cheques</Text>
          <Text style={styles.pageSubtitle}>Histórico de holerites</Text>
        </View>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar seus contracheques.
          </Text>
        ) : isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando contracheques...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhum contracheque lançado ainda.</Text>
        ) : (
          items.map((item, index) => {
            const isAcknowledged = Boolean(acknowledgedPayslipIds[item.id]);
            const hasFile = Boolean(item.arquivoUrl);

            return (
              <View key={item.id} style={[styles.payrollCard, index === 0 ? styles.payrollCardFirst : null]}>
                <View style={styles.payrollTopRow}>
                  <View style={[styles.iconShell, index === 0 ? styles.iconAccentRed : styles.iconAccentGray]}>
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color={index === 0 ? '#E6213D' : '#66708C'}
                    />
                  </View>
                  <View style={styles.payrollTextBlock}>
                    <Text style={styles.payrollTitle}>{item.competenciaLabel}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: hasFile ? '#E2F4EA' : '#EEF0F5' },
                    ]}
                  >
                    <Text style={[styles.statusPillText, { color: hasFile ? '#2B9862' : '#5E667D' }]}>
                      {hasFile ? 'PDF disponível' : 'Sem PDF'}
                    </Text>
                  </View>
                </View>

                <View style={styles.payrollActionsColumn}>
                  <View style={styles.payrollIconButtonsRow}>
                    <Pressable style={styles.payrollIconButton} onPress={() => openPayslipPreview(item)}>
                      <Feather name="eye" size={16} color="#4F5873" />
                      <Text style={styles.payrollIconButtonText}>Visualizar</Text>
                    </Pressable>

                    <Pressable style={styles.payrollIconButton} onPress={() => openPayslipFile(item.arquivoUrl)}>
                      <Feather name="download" size={16} color="#4F5873" />
                      <Text style={styles.payrollIconButtonText}>Baixar</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={[
                      styles.payrollAwareButton,
                      styles.payrollAwareButtonFullWidth,
                      isAcknowledged ? styles.payrollAwareButtonChecked : styles.payrollAwareButtonPending,
                    ]}
                    onPress={() => acknowledgePayslip(item.id)}
                    disabled={isAcknowledged}
                  >
                    <Feather name="check-circle" size={16} color={isAcknowledged ? '#1D9B5A' : '#FFFFFF'} />
                    <Text
                      style={[
                        styles.payrollAwareButtonText,
                        isAcknowledged ? styles.payrollAwareButtonTextChecked : styles.payrollAwareButtonTextPending,
                      ]}
                    >
                      Ciente
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={selectedPayslip !== null}
        animationType="fade"
        transparent
        onRequestClose={closePayslipPreview}
      >
        <View style={styles.payslipModalBackdrop}>
          <View style={styles.payslipModalCard}>
            <View style={styles.payslipModalHeader}>
              <View style={styles.payslipModalHeaderTextBlock}>
                <Text style={styles.payslipModalTitle}>
                  {selectedPayslip ? `Contracheque - ${selectedPayslip.competenciaLabel}` : ''}
                </Text>
                <Text style={styles.payslipModalSubtitle}>Valores agregados lançados pelo RH</Text>
              </View>

              <Pressable style={styles.payslipModalCloseButton} onPress={closePayslipPreview}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <View style={styles.payslipPreviewShell}>
              <ScrollView
                style={styles.payslipPreviewBody}
                contentContainerStyle={styles.payslipPreviewBodyContent}
                showsVerticalScrollIndicator={false}
              >
                {selectedPayslip ? (
                  <View style={styles.payslipPreviewPaper}>
                    <View style={styles.payslipSummaryRow}>
                      <Text style={styles.payslipSummaryLabel}>Bruto</Text>
                      <Text style={styles.payslipSummaryValue}>{selectedPayslip.valorBruto}</Text>
                    </View>
                    <View style={styles.payslipSummaryRow}>
                      <Text style={styles.payslipSummaryLabel}>Descontos</Text>
                      <Text style={styles.payslipSummaryValue}>{selectedPayslip.valorDescontos}</Text>
                    </View>
                    <View style={styles.payslipSummaryRow}>
                      <Text style={styles.payslipSummaryLabel}>Líquido a receber</Text>
                      <Text style={styles.payslipSummaryValue}>{selectedPayslip.valorLiquido}</Text>
                    </View>

                    <Text style={styles.payslipModalSubtitle}>
                      Detalhamento linha a linha não disponível — apenas os valores agregados acima.
                    </Text>

                    {selectedPayslip.arquivoUrl ? (
                      <Pressable
                        style={styles.primaryButton}
                        onPress={() => openPayslipFile(selectedPayslip.arquivoUrl)}
                      >
                        <Text style={styles.primaryButtonText}>Ver PDF</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.payslipModalSubtitle}>O RH ainda não anexou o PDF deste contracheque.</Text>
                    )}
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Pedidos de uniforme/EPI pendentes de aprovação (rh_op_pedidos — endpoint
// confirmado pela Lovable em 03/08/2026). Hoje buscamos por status
// (pendente_ciencia/em_aprovacao/aguardando_gerente/aguardando_gestao) em
// toda a rede — o endpoint ainda não filtra por "quem sou eu como
// aprovador" (isso depende de gestor_direto_id/gestor_geral_id em
// rh_colaboradores), então esta tela mostra os pendentes reais, mas ainda
// não restritos só ao time de quem está logado.
const APROVACAO_PEDIDO_STATUS_PENDENTE = 'pendente_ciencia,em_aprovacao,aguardando_gerente,aguardando_gestao';

function RecusarPedidoModal({
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
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle}>Recusar pedido</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>
          <Text style={styles.requestFieldLabel}>Motivo da recusa</Text>
          <TextInput
            style={styles.requestDescriptionInput}
            value={motivo}
            onChangeText={setMotivo}
            multiline
            textAlignVertical="top"
            placeholder="Explique por que este pedido está sendo recusado..."
            placeholderTextColor="#A7AEC2"
          />
          <Pressable
            style={[styles.approvalRejectButton, styles.spacingTop]}
            onPress={() => {
              if (!motivo.trim()) {
                Alert.alert('Campo obrigatório', 'Informe o motivo da recusa.');
                return;
              }
              onConfirm(motivo.trim());
            }}
          >
            <Text style={styles.approvalRejectButtonText}>Confirmar recusa</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ApprovalsScreen({ navigation }: ScreenProps<'Approvals'>) {
  const { identity } = useContext(AuthIdentityContext);
  const [pedidos, setPedidos] = useState<RhUniformePedido[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const loadPedidos = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRhUniformesPedidos({ status: APROVACAO_PEDIDO_STATUS_PENDENTE })
      .then(setPedidos)
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar as aprovações.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  const handleApprove = (pedido: RhUniformePedido) => {
    setProcessingId(pedido.id);
    aprovarPedidoUniforme(pedido.id, identity?.profileId)
      .then(() => loadPedidos())
      .catch((err) => Alert.alert('Não foi possível aprovar', err instanceof Error ? err.message : 'Tente novamente.'))
      .finally(() => setProcessingId(null));
  };

  const handleReject = (motivo: string) => {
    if (!rejectingId) return;
    setProcessingId(rejectingId);
    recusarPedidoUniforme(rejectingId, motivo, identity?.profileId)
      .then(() => {
        setRejectingId(null);
        loadPedidos();
      })
      .catch((err) => Alert.alert('Não foi possível recusar', err instanceof Error ? err.message : 'Tente novamente.'))
      .finally(() => setProcessingId(null));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Aprovações da Equipe</Text>
          <Text style={styles.approvalsPendingSubtitle}>{pedidos.length} pendentes</Text>
        </View>

        {isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando aprovações...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : pedidos.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhum pedido de uniforme/EPI pendente de aprovação.</Text>
        ) : (
          pedidos.map((item) => (
            <View key={item.id} style={styles.approvalCard}>
              <View style={styles.approvalTopRow}>
                <View style={styles.approvalTextBlock}>
                  <Text style={styles.approvalName}>{item.tipo ?? 'Pedido de uniforme/EPI'}</Text>
                  <Text style={styles.approvalDescription}>{item.justificativa || 'Sem justificativa informada.'}</Text>
                </View>

                <View style={[styles.approvalTag, { backgroundColor: '#E9EEFF' }]}>
                  <Text style={[styles.approvalTagText, { color: '#5E6DB4' }]}>
                    {UNIFORME_PEDIDO_STATUS_META[item.status]?.label ?? item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.approvalActionsRow}>
                <Pressable
                  style={styles.approvalApproveButton}
                  onPress={() => handleApprove(item)}
                  disabled={processingId === item.id}
                >
                  <Text style={styles.approvalApproveButtonText}>
                    {processingId === item.id ? 'Aprovando...' : 'Aprovar'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.approvalRejectButton}
                  onPress={() => setRejectingId(item.id)}
                  disabled={processingId === item.id}
                >
                  <Text style={styles.approvalRejectButtonText}>Recusar</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <RecusarPedidoModal
        visible={rejectingId !== null}
        onClose={() => setRejectingId(null)}
        onConfirm={handleReject}
      />
    </SafeAreaView>
  );
}

function NotificationsScreen({ navigation }: ScreenProps<'Notifications'>) {
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const { readNotificationIds, markNotificationAsRead } = useContext(NotificationsReadContext);

  const [items, setItems] = useState<ColaboradorNotificacaoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!colaboradorId) {
      setItems([]);
      setErrorMessage(null);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchColaboradorNotificacoes(colaboradorId)
      .then((data) => {
        if (isActive) setItems(data.items);
      })
      .catch((err) => {
        if (isActive) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar suas notificações.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [colaboradorId]);

  // A versão mockada usava um campo `target` pra navegar direto pra
  // Payslips/TrainingDetail/etc. ao tocar na notificação. notif_inbox só
  // guarda `modulo` (texto livre) — não dá pra reconstruir com certeza qual
  // tela/entidade a notificação se refere a partir disso sozinho, então aqui
  // o toque só mostra o conteúdo completo (título + mensagem) num Alert, sem
  // tentar adivinhar a rota certa.
  const handleNotificationPress = (item: ColaboradorNotificacaoItem) => {
    markNotificationAsRead(item.id);
    Alert.alert(item.titulo, item.mensagem);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Notificações</Text>
          <Text style={styles.pageSubtitle}>Atualizações recentes</Text>
        </View>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar suas notificações.
          </Text>
        ) : isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando notificações...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhuma notificação por aqui.</Text>
        ) : (
          <View style={styles.notificationsCard}>
            {items.map((item, index) => {
              const showUnreadDot = item.unread && !readNotificationIds[item.id];

              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.notificationRow,
                    index < items.length - 1 ? styles.notificationRowBorder : null,
                  ]}
                  onPress={() => handleNotificationPress(item)}
                >
                  <View style={[styles.iconShell, { backgroundColor: '#E9EEFF' }]}>
                    <Feather name="bell" size={18} color="#5E6DB4" />
                  </View>

                  <View style={styles.notificationTextBlock}>
                    <Text style={styles.notificationTitle}>{item.titulo}</Text>
                    <Text style={styles.notificationTime}>
                      {item.modulo ? item.modulo.charAt(0).toUpperCase() + item.modulo.slice(1) : 'Notificação'}
                    </Text>
                  </View>

                  {showUnreadDot ? <View style={styles.notificationUnreadDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Lista real de solicitações (GET /solicitacoes). O formulário de "Abrir nova
// solicitação" abaixo não tem endpoint de criação real ainda (fora do escopo
// desta tarefa) — o ticket criado por ele só existe localmente nesta sessão
// do app (prepended na lista em memória) e não é persistido no banco.
function RequestsScreen({ navigation }: ScreenProps<'Requests'>) {
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;

  const [tickets, setTickets] = useState<RequestTicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextTicketNumber, setNextTicketNumber] = useState(1043);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    requestCategoryOptions[requestCategoryOptions.length - 1].id
  );
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCategory =
    requestCategoryOptions.find((option) => option.id === selectedCategoryId) ??
    requestCategoryOptions[requestCategoryOptions.length - 1];

  const loadSolicitacoes = useCallback(() => {
    if (!colaboradorId) {
      setTickets([]);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    fetchColaboradorSolicitacoes(colaboradorId)
      .then((data) => {
        setTickets(
          data.items.map((item) => ({
            id: item.id,
            ticketNumber: item.protocolo ? `#${item.protocolo}` : `#${item.id}`,
            title: item.titulo,
            openedDate: item.openedDateLabel,
            department: item.department,
            status: item.status.label,
            statusColor: item.status.color,
            statusTint: item.status.tint,
          }))
        );
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar suas solicitações.');
      })
      .finally(() => setIsLoading(false));
  }, [colaboradorId]);

  useEffect(() => {
    loadSolicitacoes();
  }, [loadSolicitacoes]);

  const openModal = () => {
    setSelectedCategoryId(requestCategoryOptions[requestCategoryOptions.length - 1].id);
    setIsCategoryPickerOpen(false);
    setDescription('');
    setAttachments([]);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handlePickAttachments = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permissão necessária',
        'Permita o acesso às suas fotos para anexar arquivos à solicitação.'
      );
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!pickerResult.canceled) {
      setAttachments((current) => [...current, ...pickerResult.assets]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmitRequest = () => {
    if (!colaboradorId) return;
    if (!description.trim()) {
      Alert.alert('Campo obrigatório', 'Descreva sua solicitação.');
      return;
    }

    const mapping = REQUEST_CATEGORY_TO_SOLICITACAO[selectedCategory.id] ?? {
      setor: 'outros' as const,
      assunto: 'out_duvida',
    };

    setIsSubmitting(true);
    createColaboradorSolicitacao({
      colaborador_id: colaboradorId,
      setor: mapping.setor,
      assunto: mapping.assunto,
      titulo: selectedCategory.label,
      mensagem: description.trim(),
    })
      .then(() => {
        if (attachments.length > 0) {
          // Upload de anexo ainda não está ligado (não existe endpoint de
          // storage confirmado) — a solicitação em si foi criada de verdade,
          // só os anexos não acompanham por enquanto.
          Alert.alert(
            'Solicitação enviada',
            'As fotos selecionadas ainda não podem ser anexadas automaticamente — envie-as num chamado à parte, se necessário.'
          );
        }
        closeModal();
        loadSolicitacoes();
      })
      .catch((err) => {
        Alert.alert('Não foi possível enviar', err instanceof Error ? err.message : 'Tente novamente.');
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.requestsHeaderRow}>
          <View>
            <Text style={styles.pageTitle}>Minhas Solicitações</Text>
            <Text style={styles.pageSubtitle}>Chamados e pedidos</Text>
          </View>

          <Pressable style={styles.requestsOpenButton} onPress={openModal}>
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.requestsOpenButtonText}>Abrir</Text>
          </Pressable>
        </View>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar suas solicitações.
          </Text>
        ) : isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando solicitações...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : tickets.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhuma solicitação encontrada.</Text>
        ) : (
          tickets.map((ticket) => (
            <View key={ticket.id} style={styles.requestCard}>
              <View style={styles.requestTopRow}>
                <Text style={styles.requestTicketNumber}>{ticket.ticketNumber}</Text>
                <View style={[styles.statusPill, { backgroundColor: ticket.statusTint }]}>
                  <Text style={[styles.statusPillText, { color: ticket.statusColor }]}>{ticket.status}</Text>
                </View>
              </View>

              <Text style={styles.requestTitle}>{ticket.title}</Text>
              <Text style={styles.requestMeta}>
                Aberto em {ticket.openedDate} · {ticket.department}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={isModalOpen} animationType="fade" transparent onRequestClose={closeModal}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.requestModalHeader}>
                <Text style={styles.requestModalTitle}>Nova Solicitação ao RH</Text>
                <Pressable onPress={closeModal} hitSlop={8}>
                  <Feather name="x" size={20} color="#677089" />
                </Pressable>
              </View>

              <View style={styles.requestFieldBlock}>
                <Text style={styles.requestFieldLabel}>Tipo de Solicitação *</Text>

                <Pressable
                  style={styles.requestSelectBox}
                  onPress={() => setIsCategoryPickerOpen((value) => !value)}
                >
                  <View style={styles.requestSelectLeft}>
                    <View style={[styles.requestCategoryDot, { backgroundColor: selectedCategory.color }]} />
                    <Text style={styles.requestSelectText}>{selectedCategory.label}</Text>
                  </View>
                  <Feather
                    name={isCategoryPickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#7A8299"
                  />
                </Pressable>

                {isCategoryPickerOpen ? (
                  <View style={styles.requestCategoryDropdown}>
                    {requestCategoryOptions.map((option) => {
                      const isSelected = option.id === selectedCategoryId;

                      return (
                        <Pressable
                          key={option.id}
                          style={[
                            styles.requestCategoryOption,
                            isSelected ? styles.requestCategoryOptionSelected : null,
                          ]}
                          onPress={() => {
                            setSelectedCategoryId(option.id);
                            setIsCategoryPickerOpen(false);
                          }}
                        >
                          <View style={styles.requestCategoryOptionCheck}>
                            {isSelected ? <Feather name="check" size={15} color="#2B9862" /> : null}
                          </View>
                          <View style={[styles.requestCategoryDot, { backgroundColor: option.color }]} />
                          <Text
                            style={[
                              styles.requestCategoryOptionText,
                              isSelected ? styles.requestCategoryOptionTextSelected : null,
                            ]}
                          >
                            {option.label}
                          </Text>
                          {option.emoji ? (
                            <Text style={styles.requestCategoryOptionEmoji}>{option.emoji}</Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <TextInput
                style={styles.requestDescriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Descreva sua solicitação..."
                placeholderTextColor="#A7AEC2"
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.requestFieldLabel}>Anexos (fotos)</Text>
              <View style={styles.requestAttachmentsSection}>
                <Pressable style={styles.requestUploadBox} onPress={handlePickAttachments}>
                  <Feather name="upload" size={16} color="#7A8299" />
                  <Text style={styles.requestUploadText}>
                    {attachments.length > 0
                      ? `${attachments.length} foto${attachments.length > 1 ? 's' : ''} selecionada${attachments.length > 1 ? 's' : ''} · adicionar mais`
                      : 'Clique para escolher fotos da galeria'}
                  </Text>
                </Pressable>

                {attachments.length > 0 ? (
                  <View style={styles.requestAttachmentsRow}>
                    {attachments.map((asset, index) => (
                      <View key={`${asset.assetId ?? asset.uri}-${index}`} style={styles.requestAttachmentThumb}>
                        <Image source={{ uri: asset.uri }} style={styles.requestAttachmentImage} />
                        <Pressable
                          style={styles.requestAttachmentRemove}
                          onPress={() => handleRemoveAttachment(index)}
                          hitSlop={6}
                        >
                          <Feather name="x" size={12} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              <Pressable
                style={[styles.requestSubmitButton, isSubmitting ? { opacity: 0.6 } : null]}
                onPress={handleSubmitRequest}
                disabled={isSubmitting}
              >
                <Text style={styles.requestSubmitButtonText}>
                  {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Não existe um campo real de "área/departamento" em rh_comunicados (só o
// enum `publico` — todos/empresa/grupo/colaborador) — a tag mostrada abaixo
// reflete esse público-alvo real em vez de uma categoria fabricada.
function comunicadoPublicoLabel(publico: string | null): string {
  const key = (publico ?? '').trim().toLowerCase();
  if (key === 'todos') return 'Todos';
  if (key === 'empresa') return 'Empresa';
  if (key === 'colaborador') return 'Você';
  if (key === 'grupo') return 'Grupo';
  return 'Comunicado';
}

function CommunicationsScreen({ navigation }: ScreenProps<'Communications'>) {
  const { identity } = useContext(AuthIdentityContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const [items, setItems] = useState<ColaboradorComunicadoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!colaboradorId) {
      setItems([]);
      setErrorMessage(null);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchColaboradorComunicados(colaboradorId)
      .then((data) => {
        if (isActive) setItems(data.items);
        // Marca como lido (rh_comunicado_leituras) os itens que ainda
        // estavam sem leitura — é o que faz o contador "Comunicados" do
        // Dashboard parar de contar algo que a pessoa já viu aqui. Envio em
        // segundo plano; se falhar, não bloqueia a tela (só o contador do
        // Dashboard continua igual até uma próxima tentativa).
        data.items
          .filter((item) => !item.lido)
          .forEach((item) => {
            marcarComunicadoLido(item.id, colaboradorId).catch(() => {});
          });
      })
      .catch((err) => {
        if (isActive) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os comunicados.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [colaboradorId]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Comunicados</Text>
          <Text style={styles.pageSubtitle}>Avisos e novidades da empresa</Text>
        </View>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar seus comunicados.
          </Text>
        ) : isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando comunicados...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhum comunicado disponível no momento.</Text>
        ) : (
          items.map((item) => {
            // Ícone/cores fixos (estilo) — variam só pelo status lido/não
            // lido, que é o único sinal real disponível pra diferenciar
            // itens aqui (não existe categoria/ícone por comunicado no
            // schema).
            const accent = item.lido ? '#7B8299' : '#E6213D';
            const tint = item.lido ? '#F0F1F6' : '#FCE8EC';

            return (
              <View key={item.id} style={styles.communicationCard}>
                <View style={styles.communicationTop}>
                  <View style={[styles.iconShell, { backgroundColor: tint }]}>
                    <Feather name="send" size={18} color={accent} />
                  </View>
                  <View style={styles.communicationMetaRow}>
                    <View style={[styles.tag, { backgroundColor: tint }]}>
                      <Text style={[styles.tagText, { color: accent }]}>{comunicadoPublicoLabel(item.publico)}</Text>
                    </View>
                    <Text style={styles.communicationTime}>{item.tempoLabel}</Text>
                    {!item.lido ? <View style={styles.alertDot} /> : null}
                  </View>
                </View>

                <Text style={styles.communicationTitle}>{item.titulo}</Text>
                <Text style={styles.communicationDescription}>{item.conteudo}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Dado real do colaborador logado (rh_colaboradores, via ColaboradorPerfilContext)
// — nunca mais o mock "Bruno Lima". '—' representa coluna real vazia no
// banco, não dado fabricado. Compartilhado por ProfileScreen/ProfileSectionScreen.
function profileFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function formatDateOnlyBR(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return raw;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function formatDiaMesBR(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return '—';
  const [, , month, day] = match;
  return `${day}/${month}`;
}

function buildColaboradorProfileSummary(row: RhColaboradorRaw | null): ProfileField[] {
  const f = profileFieldValue;
  return [
    { label: 'Matrícula', value: f(row?.matricula) },
    { label: 'Cargo', value: f(row?.cargo) },
    { label: 'Unidade', value: f(row?.posto_trabalho) },
    { label: 'Admissão', value: formatDateOnlyBR(row?.data_admissao) },
    { label: 'E-mail', value: f(row?.email_corporativo ?? row?.email_pessoal) },
    { label: 'Telefone', value: f(row?.telefone ?? row?.celular) },
  ];
}

function buildColaboradorProfileSections(
  row: RhColaboradorRaw | null,
  identity: AuthIdentity | null
): ProfileSection[] {
  const f = profileFieldValue;
  const footerNote = 'Para alterar dados cadastrais, abra um chamado para o RH.';
  return [
    {
      id: 'personal',
      label: 'Pessoal',
      fields: [
        { label: 'Nome completo', value: f(row?.nome_completo ?? identity?.fullName) },
        { label: 'Nome social', value: f(row?.['nome_social']) },
        { label: 'CPF', value: f(row?.cpf) },
        { label: 'RG', value: f(row?.rg) },
        { label: 'Nascimento', value: formatDateOnlyBR(row?.data_nascimento) },
        { label: 'Estado civil', value: f(row?.estado_civil) },
        { label: 'Sexo', value: f(row?.sexo) },
        { label: 'Telefone', value: f(row?.telefone ?? row?.celular) },
        { label: 'WhatsApp', value: f(row?.whatsapp) },
        { label: 'E-mail', value: f(row?.email_corporativo ?? identity?.email ?? row?.email_pessoal) },
        { label: 'E-mail pessoal', value: f(row?.email_pessoal) },
      ],
      footerNote,
    },
    {
      id: 'professional',
      label: 'Profissional',
      fields: [
        { label: 'Matrícula', value: f(row?.matricula) },
        { label: 'Cargo', value: f(row?.cargo) },
        { label: 'Setor', value: f(row?.setor) },
        { label: 'Posto de trabalho', value: f(row?.posto_trabalho) },
        { label: 'Tipo de contrato', value: f(row?.['tipo_contrato']) },
        { label: 'Admissão', value: formatDateOnlyBR(row?.data_admissao) },
        { label: 'Status', value: f(row?.status) },
      ],
      footerNote,
    },
    {
      id: 'address',
      label: 'Endereço',
      fields: [
        { label: 'CEP', value: f(row?.endereco_cep) },
        { label: 'Logradouro', value: f(row?.endereco_logradouro) },
        { label: 'Número', value: f(row?.endereco_numero) },
        { label: 'Complemento', value: f(row?.endereco_complemento) },
        { label: 'Bairro', value: f(row?.endereco_bairro) },
        { label: 'Cidade', value: f(row?.endereco_cidade) },
        { label: 'UF', value: f(row?.endereco_estado) },
      ],
      footerNote,
    },
    {
      id: 'documents',
      label: 'Documentos',
      fields: [
        { label: 'Nome da mãe', value: f(row?.nome_mae) },
        { label: 'Nome do pai', value: f(row?.nome_pai) },
        { label: 'Nacionalidade', value: f(row?.nacionalidade) },
        { label: 'Naturalidade', value: f(row?.naturalidade) },
      ],
      cardNote:
        'Documentos digitalizados (RG, CPF, CTPS, comprovantes) podem ser enviados pelo menu Solicitações -> Envio de Documentos.',
      footerNote,
    },
    {
      id: 'banking',
      label: 'Bancário',
      fields: [
        { label: 'Banco', value: f(row?.banco) },
        { label: 'Agência', value: f(row?.agencia) },
        { label: 'Conta', value: f(row?.conta) },
        { label: 'Chave PIX', value: f(row?.pix) },
      ],
      footerNote,
    },
  ];
}

function ProfileScreen({ navigation }: ScreenProps<'Profile'>) {
  const { identity } = useContext(AuthIdentityContext);
  const { perfil, isLoading, errorMessage } = useContext(ColaboradorPerfilContext);
  const hasMultiplePanels = (identity?.availableRoles?.length ?? 0) > 1;
  const colaboradorId = identity?.colaboradorId ?? null;

  const displayName = perfil?.nome_completo || identity?.fullName || '—';
  const displayRoleAndUnit =
    [perfil?.cargo, perfil?.posto_trabalho].filter((part): part is string => Boolean(part)).join(' · ') || '—';
  const initials = getInitials(perfil?.nome_completo || identity?.fullName || 'Colaborador');
  const summaryFields = buildColaboradorProfileSummary(perfil);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={initials} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <LinearGradient colors={['#E0002A', '#A11054']} style={styles.profileSummaryHero}>
          <View style={styles.profileSummaryWaveOne} />
          <View style={styles.profileSummaryWaveTwo} />
          <View style={styles.profileSummaryBadge}>
            <Text style={styles.profileSummaryBadgeText}>{initials}</Text>
          </View>
          <View style={styles.profileSummaryTextBlock}>
            <Text style={styles.profileSummaryName}>{displayName}</Text>
            <Text style={styles.profileSummaryRole}>{displayRoleAndUnit}</Text>
          </View>
        </LinearGradient>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar seu perfil
            completo.
          </Text>
        ) : isLoading && !perfil ? (
          <Text style={styles.conversaEmptyText}>Carregando seu perfil...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : (
          <View style={styles.profileSummaryCard}>
            {summaryFields.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.profileFieldRow,
                  index < summaryFields.length - 1 ? styles.profileFieldBorder : null,
                ]}
              >
                <Text style={styles.profileFieldLabel}>{item.label}</Text>
                <Text style={styles.profileFieldValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.profileMenuCard}>
          {profileMenuItems.map((item, index) => (
            <Pressable
              key={item.id}
              style={[styles.profileMenuRow, index < profileMenuItems.length - 1 ? styles.profileMenuBorder : null]}
              onPress={() => {
                if (item.id === 'logout') {
                  navigation.replace('Login');
                  return;
                }

                if (item.id === 'security') {
                  navigation.navigate('SecuritySettings');
                  return;
                }

                navigation.navigate('ProfileSection', { sectionId: item.id });
              }}
            >
              <View style={styles.profileMenuLeft}>
                <Feather name={item.icon} size={18} color={item.accent ? '#E0002A' : '#202944'} />
                <Text style={[styles.profileMenuLabel, item.accent ? styles.profileMenuAccent : null]}>
                  {item.label}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#B9C0D3" />
            </Pressable>
          ))}
        </View>

        {hasMultiplePanels ? (
          <Pressable style={styles.switchPanelButton} onPress={() => navigation.replace('SelectPanel')}>
            <Feather name="repeat" size={16} color="#29448D" />
            <Text style={styles.switchPanelButtonText}>Voltar para o Início</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.profileLogoutButton} onPress={() => navigation.replace('Login')}>
          <Text style={styles.profileLogoutButtonText}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileSectionScreen({ navigation, route }: ScreenProps<'ProfileSection'>) {
  const { identity } = useContext(AuthIdentityContext);
  const { perfil, isLoading, errorMessage } = useContext(ColaboradorPerfilContext);
  const colaboradorId = identity?.colaboradorId ?? null;
  const sections = buildColaboradorProfileSections(perfil, identity);
  const selectedSection = sections.find((section) => section.id === route.params.sectionId);

  if (!selectedSection) {
    return null;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={getInitials(perfil?.nome_completo || identity?.fullName || 'Colaborador')}
          onAvatarPress={() => navigation.navigate('Profile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <Pressable style={styles.profileBackRow} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={18} color="#29448D" />
          <Text style={styles.profileBackText}>Meu Perfil</Text>
        </Pressable>

        <View style={styles.profileDetailHeader}>
          <Text style={styles.profileDetailTitle}>{selectedSection.label}</Text>
          <Text style={styles.profileDetailSubtitle}>Suas informações cadastrais</Text>
        </View>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar estes dados.
          </Text>
        ) : isLoading && !perfil ? (
          <Text style={styles.conversaEmptyText}>Carregando...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : (
          <View style={styles.profileCard}>
            {selectedSection.fields.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.profileDetailRow,
                  index < selectedSection.fields.length - 1 ? styles.profileFieldBorder : null,
                ]}
              >
                <Text style={styles.profileDetailLabel}>{item.label}</Text>
                <Text style={styles.profileDetailValue}>{item.value}</Text>
              </View>
            ))}

            {selectedSection.cardNote ? (
              <Text style={styles.profileCardNote}>{selectedSection.cardNote}</Text>
            ) : null}
          </View>
        )}

        <Text style={styles.profileFooterNote}>{selectedSection.footerNote ?? profileFooterNote}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniCalendarModal({
  visible,
  initialDate,
  onSelect,
  onClose,
}: {
  visible: boolean;
  initialDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState(initialDate.getMonth());

  useEffect(() => {
    if (visible) {
      setViewYear(initialDate.getFullYear());
      setViewMonthIndex(initialDate.getMonth());
    }
  }, [visible, initialDate]);

  const weeks = getCalendarWeeks(viewYear, viewMonthIndex);
  const monthLabel = `${calendarMonthNames[viewMonthIndex]} de ${viewYear}`;

  const goToPreviousMonth = () => {
    if (viewMonthIndex === 0) {
      setViewMonthIndex(11);
      setViewYear((year) => year - 1);
    } else {
      setViewMonthIndex((month) => month - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonthIndex === 11) {
      setViewMonthIndex(0);
      setViewYear((year) => year + 1);
    } else {
      setViewMonthIndex((month) => month + 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.datePickerBackdrop} onPress={onClose}>
        <Pressable style={styles.datePickerCard} onPress={() => {}}>
          <View style={styles.datePickerHeaderRow}>
            <Pressable onPress={goToPreviousMonth} hitSlop={8}>
              <Feather name="chevron-left" size={20} color="#5C6580" />
            </Pressable>
            <Text style={styles.datePickerMonthLabel}>{monthLabel}</Text>
            <Pressable onPress={goToNextMonth} hitSlop={8}>
              <Feather name="chevron-right" size={20} color="#5C6580" />
            </Pressable>
          </View>

          <View style={styles.calendarWeekDaysRow}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayLabel, index) => (
              <Text key={`${dayLabel}-${index}`} style={styles.calendarWeekDayLabel}>
                {dayLabel}
              </Text>
            ))}
          </View>

          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.calendarWeekRow}>
              {week.map((day) => {
                const isSelected =
                  day.isCurrentMonth &&
                  viewYear === initialDate.getFullYear() &&
                  viewMonthIndex === initialDate.getMonth() &&
                  day.dayNumber === initialDate.getDate();

                return (
                  <Pressable
                    key={day.key}
                    style={styles.calendarDayCell}
                    disabled={!day.isCurrentMonth}
                    onPress={() => onSelect(new Date(viewYear, viewMonthIndex, day.dayNumber))}
                  >
                    <View style={styles.calendarDayContent}>
                      <View
                        style={[
                          styles.calendarDayCircle,
                          isSelected ? styles.calendarDayCircleSelected : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            !day.isCurrentMonth ? styles.calendarDayTextMuted : null,
                            isSelected ? styles.calendarDayTextSelected : null,
                          ]}
                        >
                          {day.dayNumber}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SimpleListModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  inline,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  // inline=true: não abre <Modal> nativo próprio — renderiza como overlay
  // absoluto por cima do conteúdo (ver styles.inlinePickerLayer). Necessário
  // quando o picker é aberto de DENTRO de outro <Modal> já visível.
  inline?: boolean;
}) {
  if (inline && !visible) {
    return null;
  }

  const content = (
    <Pressable style={styles.datePickerBackdrop} onPress={onClose}>
      <Pressable style={styles.simpleListCard} onPress={() => {}}>
        <Text style={styles.simpleListTitle}>{title}</Text>
        <ScrollView style={styles.simpleListScroll} showsVerticalScrollIndicator={false}>
          {options.map((option) => {
            const isSelected = option === selectedValue;

            return (
              <Pressable
                key={option}
                style={styles.simpleListOptionRow}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.simpleListOptionText,
                    isSelected ? styles.simpleListOptionTextActive : null,
                  ]}
                >
                  {option}
                </Text>
                {isSelected ? <Feather name="check" size={16} color="#E6213D" /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Pressable>
    </Pressable>
  );

  if (inline) {
    return <View style={styles.inlinePickerLayer}>{content}</View>;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

function TemplatePickerModal({
  visible,
  templates,
  selectedValue,
  onSelect,
  onClose,
  inline,
}: {
  visible: boolean;
  templates: NotificationTemplateItem[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  // inline=true: ver comentário em SimpleListModal — usado quando aberto de
  // dentro de outro <Modal> já visível (NotificationRoutineFormModal).
  inline?: boolean;
}) {
  if (inline && !visible) {
    return null;
  }

  const options: Array<{ label: string; icon: keyof typeof Feather.glyphMap; iconColor: string }> = [
    { label: 'Mensagem customizada', icon: 'edit-3', iconColor: '#E6213D' },
    ...templates.map((template) => ({
      label: template.title,
      icon: 'star' as const,
      iconColor: '#D79A22',
    })),
  ];

  const content = (
    <Pressable style={styles.datePickerBackdrop} onPress={onClose}>
      <Pressable style={styles.simpleListCard} onPress={() => {}}>
        <Text style={styles.simpleListTitle}>Template</Text>
        <ScrollView style={styles.simpleListScroll} showsVerticalScrollIndicator={false}>
          {options.map((option) => {
            const isSelected = option.label === selectedValue;

            return (
              <Pressable
                key={option.label}
                style={[styles.templateOptionRow, isSelected ? styles.templateOptionRowActive : null]}
                onPress={() => {
                  onSelect(option.label);
                  onClose();
                }}
              >
                <View style={styles.templateOptionLeft}>
                  <Feather name={option.icon} size={15} color={isSelected ? '#FFFFFF' : option.iconColor} />
                  <Text
                    style={[
                      styles.templateOptionText,
                      isSelected ? styles.templateOptionTextActive : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                {isSelected ? <Feather name="check" size={16} color="#FFFFFF" /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Pressable>
    </Pressable>
  );

  if (inline) {
    return <View style={styles.inlinePickerLayer}>{content}</View>;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

function StationMultiSelectModal({
  visible,
  allLabel,
  options,
  selectedStations,
  onToggleStation,
  onSelectAll,
  onClose,
}: {
  visible: boolean;
  allLabel: string;
  options: string[];
  selectedStations: string[];
  onToggleStation: (station: string) => void;
  onSelectAll: () => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const isAllSelected = selectedStations.length === 0;
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.datePickerBackdrop} onPress={onClose}>
        <Pressable style={styles.simpleListCard} onPress={() => {}}>
          <View style={styles.stationMultiSelectHeaderRow}>
            <Text style={styles.simpleListTitle}>Selecionar postos</Text>
            {selectedStations.length > 0 ? (
              <Pressable onPress={onSelectAll} hitSlop={8}>
                <Text style={styles.stationMultiSelectClearText}>Limpar filtro</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.stationMultiSelectSearchRow}>
            <Feather name="search" size={14} color="#9AA1B5" />
            <TextInput
              style={styles.stationMultiSelectSearchInput}
              placeholder="Buscar posto..."
              placeholderTextColor="#9AA1B5"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <Pressable
            style={[
              styles.stationMultiSelectAllButton,
              isAllSelected ? styles.stationMultiSelectAllButtonActive : null,
            ]}
            onPress={onSelectAll}
          >
            <Text
              style={[
                styles.stationMultiSelectAllButtonText,
                isAllSelected ? styles.stationMultiSelectAllButtonTextActive : null,
              ]}
            >
              {allLabel}
            </Text>
            {isAllSelected ? <Feather name="check" size={16} color="#FFFFFF" /> : null}
          </Pressable>

          <ScrollView style={styles.simpleListScroll} showsVerticalScrollIndicator={false}>
            {filteredOptions.length === 0 ? (
              <Text style={styles.stationMultiSelectEmptyText}>Nenhum posto encontrado.</Text>
            ) : null}
            {filteredOptions.map((option) => {
              const isSelected = selectedStations.includes(option);

              return (
                <Pressable
                  key={option}
                  style={styles.simpleListOptionRow}
                  onPress={() => onToggleStation(option)}
                >
                  <Text
                    style={[
                      styles.simpleListOptionText,
                      isSelected ? styles.simpleListOptionTextActive : null,
                    ]}
                  >
                    {option}
                  </Text>
                  <View style={[styles.checkbox, isSelected ? styles.checkboxChecked : null]}>
                    {isSelected ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ToggleSwitch({ value, onValueChange }: { value: boolean; onValueChange: () => void }) {
  return (
    <Pressable
      style={[styles.toggleTrack, value ? styles.toggleTrackOn : null]}
      onPress={onValueChange}
      hitSlop={6}
    >
      <View style={[styles.toggleKnob, value ? styles.toggleKnobOn : null]} />
    </Pressable>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisible,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <View style={styles.passwordFieldBlock}>
      <Text style={styles.passwordFieldLabel}>{label}</Text>
      <View style={styles.passwordFieldRow}>
        <TextInput
          style={styles.passwordFieldInput}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholderTextColor="#A7AEC2"
        />
        <Pressable onPress={onToggleVisible} hitSlop={8}>
          <Feather name={visible ? 'eye-off' : 'eye'} size={18} color="#8992A8" />
        </Pressable>
      </View>
    </View>
  );
}

function SecuritySettingsScreen({ navigation }: ScreenProps<'SecuritySettings'>) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { isTwoFactorEnabled, isBiometricLoginEnabled, setIsTwoFactorEnabled, setIsBiometricLoginEnabled } =
    useContext(SecurityPreferencesContext);

  const handleSavePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={currentUserInitials} onAvatarPress={() => navigation.navigate('Profile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.profileBackRow} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={18} color="#29448D" />
          <Text style={styles.profileBackText}>Meu Perfil</Text>
        </Pressable>

        <View style={styles.profileDetailHeader}>
          <Text style={styles.profileDetailTitle}>Segurança e senha</Text>
          <Text style={styles.profileDetailSubtitle}>Proteja o acesso à sua conta</Text>
        </View>

        <Text style={styles.calendarSectionTitle}>ALTERAR SENHA</Text>
        <View style={styles.securityCard}>
          <PasswordField
            label="Senha atual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            visible={showCurrentPassword}
            onToggleVisible={() => setShowCurrentPassword((value) => !value)}
          />
          <PasswordField
            label="Nova senha"
            value={newPassword}
            onChangeText={setNewPassword}
            visible={showNewPassword}
            onToggleVisible={() => setShowNewPassword((value) => !value)}
          />
          <PasswordField
            label="Confirmar nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            visible={showConfirmPassword}
            onToggleVisible={() => setShowConfirmPassword((value) => !value)}
          />

          <Pressable style={styles.primaryButton} onPress={handleSavePassword}>
            <Text style={styles.primaryButtonText}>Salvar nova senha</Text>
          </Pressable>
        </View>

        <Text style={styles.calendarSectionTitle}>PROTEÇÃO EXTRA</Text>
        <View style={styles.securityCard}>
          <View style={[styles.securityToggleRow, styles.securityToggleRowBorder]}>
            <View style={styles.securityToggleTextBlock}>
              <Text style={styles.securityToggleTitle}>Autenticação em 2 fatores</Text>
              <Text style={styles.securityToggleSubtitle}>Código enviado para o seu e-mail cadastrado</Text>
            </View>
            <ToggleSwitch
              value={isTwoFactorEnabled}
              onValueChange={() => setIsTwoFactorEnabled(!isTwoFactorEnabled)}
            />
          </View>

          <View style={styles.securityToggleRow}>
            <View style={styles.securityToggleTextBlock}>
              <Text style={styles.securityToggleTitle}>Login por biometria</Text>
              <Text style={styles.securityToggleSubtitle}>Face ID, digital ou senha deste aparelho</Text>
            </View>
            <ToggleSwitch
              value={isBiometricLoginEnabled}
              onValueChange={() => setIsBiometricLoginEnabled(!isBiometricLoginEnabled)}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DirectorDashboardScreen({ navigation }: ScreenProps<'DirectorDashboard'>) {
  const managementPanels: Array<{
    id: string;
    route: DirectorSideMenuRoute;
    icon: keyof typeof Feather.glyphMap;
    iconColor: string;
    tintColor: string;
    label: string;
    subtitle: string;
  }> = [
    {
      id: 'sales',
      route: 'Sales',
      icon: 'trending-up',
      iconColor: '#E6213D',
      tintColor: '#FCE8EC',
      label: 'Vendas',
      subtitle: 'Flash diário da rede',
    },
    {
      id: 'margin',
      route: 'Margin',
      icon: 'percent',
      iconColor: '#3457D5',
      tintColor: '#EDF1FF',
      label: 'Margem',
      subtitle: 'Ofensores e custos',
    },
    {
      id: 'stock',
      route: 'Stock',
      icon: 'box',
      iconColor: '#18955A',
      tintColor: '#E4F5EE',
      label: 'Estoques',
      subtitle: 'Tanques e autonomia',
    },
    {
      id: 'gnv-metrics',
      route: 'GnvMetrics',
      icon: 'zap',
      iconColor: '#B7791F',
      tintColor: '#FCF4DE',
      label: 'Métricas GNV',
      subtitle: 'Desconto e volume',
    },
    {
      id: 'process-map',
      route: 'ProcessMap',
      icon: 'git-branch',
      iconColor: '#6F76BE',
      tintColor: '#E8EAFA',
      label: 'Mapa de Processos',
      subtitle: 'Fluxos e responsáveis',
    },
    {
      id: 'director-notifications',
      route: 'DirectorNotifications',
      icon: 'bell',
      iconColor: '#A11054',
      tintColor: '#FBE7EB',
      label: 'Notificações',
      subtitle: 'Rotinas e templates',
    },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={directorUserInitials}
          variant="diretoria"
          onAvatarPress={() => navigation.navigate('DirectorProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#7A1230', '#B21B3E']} style={styles.directorHero}>
          <Image
            source={require('./assets/logo-branca.png')}
            style={styles.panelWatermarkLogo}
            resizeMode="contain"
          />
          <Text style={styles.directorHeroGreeting}>Bom dia, {directorUserFirstName}</Text>
          <Text style={styles.directorHeroTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
            Visão da rede
          </Text>
          <Text style={styles.directorHeroSubtitle}>Rede completa · 56 postos · Flash de 01/07/2026</Text>
        </LinearGradient>

        <View style={styles.directorTotalCard}>
          <Text style={styles.directorTotalLabel}>Faturamento total · hoje</Text>
          <Text style={styles.directorTotalValue}>R$ 2.531.027</Text>
          <View style={styles.directorTotalMetaRow}>
            <View style={styles.directorTotalMetaBadge}>
              <Feather name="arrow-up-right" size={13} color="#18955A" />
              <Text style={styles.directorTotalMetaBadgeText}>Margem 19,4%</Text>
            </View>
            <Text style={styles.directorTotalMetaNote}>vs. meta 18%</Text>
          </View>
        </View>

        <View style={styles.directorSplitRow}>
          <View style={styles.directorSplitCard}>
            <Text style={styles.directorSplitLabel}>Combustíveis líq.</Text>
            <Text style={styles.directorSplitValue}>R$ 1,66 mi</Text>
            <Text style={styles.directorSplitMeta}>266.126 L · 17,6%</Text>
          </View>
          <View style={styles.directorSplitCard}>
            <Text style={styles.directorSplitLabel}>GNV</Text>
            <Text style={styles.directorSplitValue}>R$ 820 mil</Text>
            <Text style={styles.directorSplitMeta}>192.354 m³ · 20,9%</Text>
          </View>
        </View>

        <Pressable style={styles.directorAlertBanner} onPress={() => navigation.navigate('Margin')}>
          <Feather name="alert-triangle" size={18} color="#E6213D" />
          <View style={styles.directorAlertTextBlock}>
            <Text style={styles.directorAlertTitle}>1 alerta de custo crítico</Text>
            <Text style={styles.directorAlertSubtitle}>Posto Boa Viagem · gasolina aditivada</Text>
          </View>
          <View style={styles.directorAlertButton}>
            <Text style={styles.directorAlertButtonText}>Ver</Text>
          </View>
        </Pressable>

        <Text style={styles.directorSectionTitle}>PAINÉIS DE GESTÃO</Text>

        <View style={styles.grid}>
          {managementPanels.map((panel) => (
            <View key={panel.id} style={styles.gridItem}>
              <Pressable style={styles.directorPanelCard} onPress={() => navigation.navigate(panel.route)}>
                <View style={[styles.iconShell, { backgroundColor: panel.tintColor }]}>
                  <Feather name={panel.icon} size={18} color={panel.iconColor} />
                </View>
                <Text style={styles.directorPanelLabel}>{panel.label}</Text>
                <Text style={styles.directorPanelSubtitle}>{panel.subtitle}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DirectorProfileScreen({ navigation }: ScreenProps<'DirectorProfile'>) {
  const { identity } = useContext(AuthIdentityContext);
  const { perfil, isLoading, errorMessage } = useContext(ColaboradorPerfilContext);
  const hasMultiplePanels = (identity?.availableRoles?.length ?? 0) > 1;
  const colaboradorId = identity?.colaboradorId ?? null;

  const displayName = perfil?.nome_completo || identity?.fullName || '—';
  const displayRoleAndUnit =
    [perfil?.cargo, perfil?.posto_trabalho].filter((part): part is string => Boolean(part)).join(' · ') || '—';
  const initials = getInitials(perfil?.nome_completo || identity?.fullName || 'Diretoria');
  const directorProfileFields = buildColaboradorProfileSummary(perfil);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={initials} variant="diretoria" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#2F4EA8', '#4C439E']} style={styles.directorProfileHero}>
          <View style={styles.directorProfileBadge}>
            <Text style={styles.directorProfileBadgeText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.directorProfileName}>{displayName}</Text>
            <Text style={styles.directorProfileRole}>{displayRoleAndUnit}</Text>
          </View>
        </LinearGradient>

        {!colaboradorId ? (
          <Text style={styles.conversaEmptyText}>
            Seu acesso ainda não está vinculado a um colaborador no RH. Procure o RH para liberar seu perfil
            completo.
          </Text>
        ) : isLoading && !perfil ? (
          <Text style={styles.conversaEmptyText}>Carregando seu perfil...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : (
          <View style={styles.directorProfileCard}>
            {directorProfileFields.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.directorProfileRow,
                  index < directorProfileFields.length - 1 ? styles.directorProfileRowBorder : null,
                ]}
              >
                <Text style={styles.directorProfileLabel}>{item.label}</Text>
                <Text style={styles.directorProfileValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {hasMultiplePanels ? (
          <Pressable style={styles.switchPanelButton} onPress={() => navigation.replace('SelectPanel')}>
            <Feather name="repeat" size={16} color="#29448D" />
            <Text style={styles.switchPanelButtonText}>Voltar para o Início</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.directorLogoutButton} onPress={() => navigation.replace('Login')}>
          <Text style={styles.directorLogoutButtonText}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SalesScreen({ navigation }: ScreenProps<'Sales'>) {
  // Igual ao painel web: por padrão mostra o mês corrente inteiro (não só o
  // dia de hoje), já que o dia isolado costuma vir sem venda lançada ainda.
  const defaultFlashRange = useMemo(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: firstDayOfMonth, end: lastDayOfMonth };
  }, []);
  const [startDate, setStartDate] = useState(defaultFlashRange.start);
  const [endDate, setEndDate] = useState(defaultFlashRange.end);
  const [openPicker, setOpenPicker] = useState<'start' | 'end' | null>(null);

  const postos = useDiretoriaPostos();
  const stationOptions = useMemo(() => ['Todos os postos', ...postos.map((p) => p.nome)], [postos]);
  const [selectedStation, setSelectedStation] = useState('Todos os postos');
  const [isStationPickerOpen, setIsStationPickerOpen] = useState(false);
  const selectedPostoId = useMemo(
    () => postos.find((p) => p.nome === selectedStation)?.id,
    [postos, selectedStation]
  );

  const filtros = useMemo(
    () => ({ de: toApiDateOnly(startDate), ate: toApiDateOnly(endDate), posto: selectedPostoId }),
    [startDate, endDate, selectedPostoId]
  );
  // Confirmado pela Lovable em 05/08/2026: os 5 cards de faturamento/margem
  // por segmento vêm do recurso=rede (não do resumo — resumo só tem kpis
  // agregados gerais: faturamento, faturamento_pdv, faturamento_desconto_gnv,
  // litros, m3, postos_com_venda). Shape de rede: dados.total.{faturamento,
  // custo,margem_pct} e dados.segmentos.{COMB_LIQ,GNV,PISTA,LOJA}.{faturamento,
  // volume,custo,margem_pct}; dados.combustiveisLiquidos.{GASOLINA,ETANOL,
  // DIESEL} já vem agrupado (comum+aditivado somados), então não precisamos
  // mais agrupar isso no cliente.
  const { dados: rede, isLoading, errorMessage } = useDiretoriaPainelRecurso('rede', filtros);

  const isSingleDay = formatDateBR(startDate) === formatDateBR(endDate);
  const flashRangeLabel = isSingleDay
    ? formatDateBR(startDate)
    : `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`;

  const handleSelectDate = (date: Date) => {
    if (openPicker === 'start') {
      setStartDate(date);
      if (date > endDate) {
        setEndDate(date);
      }
    } else if (openPicker === 'end') {
      setEndDate(date);
      if (date < startDate) {
        setStartDate(date);
      }
    }
  };

  const redeTotal = rede?.total ?? null;
  const segmentos = rede?.segmentos ?? null;
  const combustiveisLiquidos = rede?.combustiveisLiquidos ?? null;

  const segmento = (chave: string) => (segmentos ? (segmentos as Record<string, unknown>)[chave] : null);

  const summaryCards = useMemo(() => {
    if (!redeTotal && !segmentos) return [];
    const items: Array<{ id: string; label: string; value: number | null; meta?: string | null; marginPct: number | null }> = [
      {
        id: 'total',
        label: 'Faturamento TOTAL',
        value: pickNum(redeTotal, ['faturamento']),
        marginPct: pickNum(redeTotal, ['margem_pct']),
      },
      {
        id: 'fuels',
        label: 'Combustíveis líquidos',
        value: pickNum(segmento('COMB_LIQ'), ['faturamento']),
        meta:
          pickNum(segmento('COMB_LIQ'), ['volume']) !== null
            ? `Volume: ${fmtNumOrDash(pickNum(segmento('COMB_LIQ'), ['volume']), ' L')}`
            : null,
        marginPct: pickNum(segmento('COMB_LIQ'), ['margem_pct']),
      },
      {
        id: 'gnv',
        label: 'GNV',
        value: pickNum(segmento('GNV'), ['faturamento']),
        meta:
          pickNum(segmento('GNV'), ['volume']) !== null
            ? `Volume: ${fmtNumOrDash(pickNum(segmento('GNV'), ['volume']), ' m³')}`
            : null,
        marginPct: pickNum(segmento('GNV'), ['margem_pct']),
      },
      {
        id: 'store-track',
        label: 'Loja pista',
        value: pickNum(segmento('PISTA'), ['faturamento']),
        marginPct: pickNum(segmento('PISTA'), ['margem_pct']),
      },
      {
        id: 'store-convenience',
        label: 'Loja conveniência',
        value: pickNum(segmento('LOJA'), ['faturamento']),
        marginPct: pickNum(segmento('LOJA'), ['margem_pct']),
      },
    ];
    return items;
  }, [redeTotal, segmentos]);

  // dados.combustiveisLiquidos já vem agrupado por tipo (Gasolina/Etanol/
  // Diesel, comum+aditivado somados) — igual à leitura do painel web.
  const groupedFuelBreakdown = useMemo(() => {
    if (!combustiveisLiquidos) return [];
    const categorias = ['GASOLINA', 'ETANOL', 'DIESEL'] as const;
    return categorias
      .map((categoria) => {
        const seg = (combustiveisLiquidos as Record<string, unknown>)[categoria];
        const faturamento = pickNum(seg, ['faturamento']);
        if (seg === undefined || seg === null || faturamento === null) return null;
        return {
          produto: categoria,
          faturamento,
          volumeLitros: pickNum(seg, ['volume']),
          margemPct: pickNum(seg, ['margem_pct']),
        };
      })
      .filter((item): item is { produto: string; faturamento: number; volumeLitros: number | null; margemPct: number | null } => item !== null);
  }, [combustiveisLiquidos]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={directorUserInitials}
          variant="diretoria"
          onAvatarPress={() => navigation.navigate('DirectorProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <View style={styles.directorPageTitleRow}>
            <View style={[styles.iconShell, styles.iconAccentRed]}>
              <Feather name="trending-up" size={18} color="#E6213D" />
            </View>
            <Text style={styles.pageTitle}>Vendas</Text>
          </View>
        </View>

        <Text style={styles.directorFlashTitle}>Flash de Vendas</Text>
        <Text style={styles.directorFlashSubtitle}>
          {flashRangeLabel} · {selectedStation === 'Todos os postos' ? `Rede completa (${postos.length} postos)` : selectedStation}
        </Text>

        <View style={styles.directorFilterRow}>
          <Pressable style={styles.directorFilterPill} onPress={() => setOpenPicker('start')}>
            <Feather name="calendar" size={14} color="#5E667D" />
            <Text style={styles.directorFilterPillText}>{formatDateBR(startDate)}</Text>
          </Pressable>
          <Text style={styles.directorFilterUntilText}>até</Text>
          <Pressable style={styles.directorFilterPill} onPress={() => setOpenPicker('end')}>
            <Feather name="calendar" size={14} color="#5E667D" />
            <Text style={styles.directorFilterPillText}>{formatDateBR(endDate)}</Text>
          </Pressable>
        </View>

        <View style={styles.directorFilterRow}>
          <Pressable style={styles.directorFilterPill} onPress={() => setIsStationPickerOpen(true)}>
            <Text style={styles.directorFilterPillText}>{selectedStation}</Text>
            <Feather name="chevron-down" size={14} color="#5E667D" />
          </Pressable>
        </View>

        <Text style={styles.directorSectionTitle}>RESUMO DA REDE</Text>
        {isLoading && !rede ? (
          <Text style={styles.conversaEmptyText}>Carregando vendas...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : summaryCards.every((item) => item.value === null) ? (
          <Text style={styles.conversaEmptyText}>Sem dados de vendas no período selecionado.</Text>
        ) : (
          summaryCards.map((item) => {
            const tone = item.marginPct !== null ? getMarginTone(item.marginPct) : null;

            return (
              <View key={item.id} style={styles.directorSummaryCard}>
                <View style={styles.directorSummaryLeft}>
                  <Text style={styles.directorSummaryLabel}>{item.label}</Text>
                  <Text style={styles.directorSummaryValue}>{fmtBRLOrDash(item.value)}</Text>
                  {item.meta ? <Text style={styles.directorSummaryMeta}>{item.meta}</Text> : null}
                </View>
                {tone ? (
                  <View style={[styles.directorSummaryPill, { backgroundColor: tone.tint }]}>
                    <Text style={[styles.directorSummaryPillText, { color: tone.color }]}>{tone.label}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        <Text style={styles.directorSectionTitle}>COMBUSTÍVEIS LÍQUIDOS</Text>
        {groupedFuelBreakdown.length === 0 ? (
          !isLoading ? <Text style={styles.conversaEmptyText}>Sem detalhe por combustível no período.</Text> : null
        ) : (
          groupedFuelBreakdown.map((item) => {
            const tone = item.margemPct !== null ? getMarginTone(item.margemPct) : null;
            const accentColor =
              item.produto === 'GASOLINA' ? '#E6213D' : item.produto === 'ETANOL' ? '#18955A' : '#3457D5';

            return (
              <View key={item.produto} style={[styles.fuelCard, { borderLeftColor: accentColor }]}>
                <Text style={[styles.fuelCardLabel, { color: accentColor }]}>{item.produto}</Text>
                <Text style={styles.fuelCardValue}>{fmtBRLOrDash(item.faturamento)}</Text>
                <Text style={styles.fuelCardMeta}>Volume: {fmtNumOrDash(item.volumeLitros, ' L')}</Text>
                {tone ? <Text style={[styles.fuelCardMargin, { color: tone.color }]}>{tone.label}</Text> : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <MiniCalendarModal
        visible={openPicker !== null}
        initialDate={openPicker === 'end' ? endDate : startDate}
        onSelect={handleSelectDate}
        onClose={() => setOpenPicker(null)}
      />

      <SimpleListModal
        visible={isStationPickerOpen}
        title="Selecionar posto"
        options={stationOptions}
        selectedValue={selectedStation}
        onSelect={setSelectedStation}
        onClose={() => setIsStationPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const MARGIN_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function MarginScreen({ navigation }: ScreenProps<'Margin'>) {
  const postos = useDiretoriaPostos();
  const stationOptions = useMemo(() => ['Todos os Postos', ...postos.map((p) => p.nome)], [postos]);
  const [selectedStation, setSelectedStation] = useState('Todos os Postos');
  const [isStationPickerOpen, setIsStationPickerOpen] = useState(false);
  const selectedPostoId = useMemo(
    () => postos.find((p) => p.nome === selectedStation)?.id,
    [postos, selectedStation]
  );

  // Igual ao filtro do painel web: alterna Mês/Ano e navega com < / > a
  // partir de um mês/ano-âncora (default: hoje).
  const [viewMode, setViewMode] = useState<'mes' | 'ano'>('mes');
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const handlePrevPeriod = () => {
    setAnchorDate((current) =>
      viewMode === 'mes'
        ? new Date(current.getFullYear(), current.getMonth() - 1, 1)
        : new Date(current.getFullYear() - 1, current.getMonth(), 1)
    );
  };
  const handleNextPeriod = () => {
    setAnchorDate((current) =>
      viewMode === 'mes'
        ? new Date(current.getFullYear(), current.getMonth() + 1, 1)
        : new Date(current.getFullYear() + 1, current.getMonth(), 1)
    );
  };
  const handleResetPeriod = () => setAnchorDate(new Date());

  const periodLabel =
    viewMode === 'mes'
      ? `${MARGIN_MONTH_NAMES[anchorDate.getMonth()]} / ${anchorDate.getFullYear()}`
      : `${anchorDate.getFullYear()}`;

  const filtros = useMemo(() => {
    const de =
      viewMode === 'mes'
        ? new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
        : new Date(anchorDate.getFullYear(), 0, 1);
    const ate =
      viewMode === 'mes'
        ? new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0)
        : new Date(anchorDate.getFullYear(), 11, 31);
    return { de: toApiDateOnly(de), ate: toApiDateOnly(ate), posto: selectedPostoId };
  }, [viewMode, anchorDate, selectedPostoId]);

  const { dados: margem, periodo, isLoading, errorMessage } = useDiretoriaPainelRecurso('margem', filtros);

  // Shape real de recurso=margem confirmado pela Lovable em 05/08/2026: não
  // existe categorias_combustivel/categorias_loja — são "blocos" separados:
  // combLiquidosBlocos[] + gnvBlocos[] (um por categoria: GASOLINA/ETANOL/
  // DIESEL/GNV), e lojaPistaBloco/lojaConvBloco (objetos únicos, mesmo shape
  // de bloco). Cada bloco: { chave, rede_pct, rede_rs_unit, unidade,
  // volume_rede, fat_total_rede, impacto_total, ofensores_count,
  // ofensores_top5: [{ posto_nome, margem_posto_pct, desvio_pp, impacto_rs,
  // faturamento, volume, severidade, puxado_por? }] } — já ordenado por
  // desvio_pp. alertasCusto[] não é filtrado por período (é por data de
  // entrada de compra). divisoes[] e resumoOfensores alimentam os cards de
  // resumo do topo.
  const combLiquidosBlocos = pickArr(margem, ['combLiquidosBlocos']);
  const gnvBlocos = pickArr(margem, ['gnvBlocos']);
  const categoriasCombustivel = [...combLiquidosBlocos, ...gnvBlocos];
  const lojaPistaBloco = (margem as any)?.lojaPistaBloco ?? null;
  const lojaConvBloco = (margem as any)?.lojaConvBloco ?? null;
  const categoriasLoja = [lojaPistaBloco, lojaConvBloco].filter(Boolean);
  const alertasCusto = pickArr(margem, ['alertasCusto']);
  const divisoes = pickArr(margem, ['divisoes']);
  const resumoOfensores = (margem as any)?.resumoOfensores ?? null;
  const margemRsLitroCombustivel = pickNum(margem, ['margemRsLitroCombustivel']);

  const findDivisao = (keyword: string) =>
    divisoes.find((item: any) => (pickStr(item, ['divisao', 'label']) ?? '').toUpperCase().includes(keyword));
  const divisaoCombustivel = findDivisao('COMB');
  const divisaoPista = findDivisao('PISTA');
  const divisaoLoja = findDivisao('LOJA') ?? findDivisao('CONVEN');

  const pctDeltaLabel = (deltaPp: number | null) => (deltaPp === null ? '—' : `${deltaPp > 0 ? '+' : ''}${fmtPercentOrDash(deltaPp)}pp`);

  const topCards: Array<{ id: string; label: string; value: string; badge?: string | null; meta?: string | null }> = [
    {
      id: 'margem-combustiveis-litro',
      label: 'Margem combustíveis (R$/L)',
      value: fmtBRLOrDash(margemRsLitroCombustivel),
      meta:
        divisaoCombustivel && pickNum(divisaoCombustivel, ['margem_pct']) !== null
          ? `${fmtPercentOrDash(pickNum(divisaoCombustivel, ['margem_pct']))} sobre a venda`
          : null,
    },
    {
      // No painel web esse card mostra o mesmo valor do "Margem combustíveis
      // (R$/L)" — só acrescenta a variação/meta ao lado.
      id: 'combustiveis-litro',
      label: 'Combustíveis (R$/L)',
      value: fmtBRLOrDash(margemRsLitroCombustivel),
      badge: divisaoCombustivel ? pctDeltaLabel(pickNum(divisaoCombustivel, ['delta_pp'])) : null,
      meta: divisaoCombustivel
        ? `${fmtPercentOrDash(pickNum(divisaoCombustivel, ['margem_pct']))} · ${fmtBRLOrDash(pickNum(divisaoCombustivel, ['faturamento']))} · ${pctDeltaLabel(pickNum(divisaoCombustivel, ['delta_pp']))}`
        : null,
    },
    {
      id: 'loja-pista-margem',
      label: 'Loja pista',
      value: fmtPercentOrDash(pickNum(lojaPistaBloco, ['rede_pct'])),
      badge: divisaoPista ? pctDeltaLabel(pickNum(divisaoPista, ['delta_pp'])) : null,
      meta: `${fmtBRLOrDash(pickNum(lojaPistaBloco, ['fat_total_rede']))} · ${pctDeltaLabel(pickNum(divisaoPista, ['delta_pp']))}`,
    },
    {
      id: 'loja-conveniencia-margem',
      label: 'Loja conveniência',
      value: fmtPercentOrDash(pickNum(lojaConvBloco, ['rede_pct'])),
      badge: divisaoLoja ? pctDeltaLabel(pickNum(divisaoLoja, ['delta_pp'])) : null,
      meta: `${fmtBRLOrDash(pickNum(lojaConvBloco, ['fat_total_rede']))} · ${pctDeltaLabel(pickNum(divisaoLoja, ['delta_pp']))}`,
    },
  ];

  const totalOfensoresCombustivel = categoriasCombustivel.reduce(
    (sum, bloco) => sum + (pickNum(bloco, ['ofensores_count']) ?? 0),
    0
  );
  const totalOfensoresLoja = categoriasLoja.reduce((sum, bloco) => sum + (pickNum(bloco, ['ofensores_count']) ?? 0), 0);
  const statCards: Array<{ id: string; label: string; value: string; meta?: string | null }> = [
    {
      id: 'postos-ofensores',
      label: 'Postos ofensores',
      value: fmtNumOrDash(pickNum(resumoOfensores, ['postos_unicos'])),
      meta: 'Ocorrência(s) posto × categoria',
    },
    {
      id: 'postos-criticos',
      label: 'Postos críticos',
      value: fmtNumOrDash(pickNum(resumoOfensores, ['postos_criticos'])),
      meta: 'Desvio maior que 3pp da média da rede',
    },
    {
      id: 'ofensores-por-area',
      label: 'Ofensores por área',
      value: `${totalOfensoresCombustivel} comb. / ${totalOfensoresLoja} loja`,
      meta: 'Postos distintos em cada área',
    },
    {
      id: 'perda-estimada',
      label: 'Perda estimada no período',
      value: fmtBRLOrDash(pickNum(resumoOfensores, ['impacto_total'])),
      meta:
        totalOfensoresCombustivel + totalOfensoresLoja === 0
          ? 'Sem ofensores no período'
          : pickStr(resumoOfensores, ['pior_posto'])
          ? `Pior posto: ${pickStr(resumoOfensores, ['pior_posto'])}`
          : null,
    },
  ];

  const renderBlocoCard = (bloco: any) => {
    const titulo = pickStr(bloco, ['chave']) ?? '—';
    const mediaRede = pickNum(bloco, ['rede_pct']);
    const mediaRedeRsUnit = pickNum(bloco, ['rede_rs_unit']);
    const unidade = pickStr(bloco, ['unidade']);
    const impacto = pickNum(bloco, ['impacto_total']);
    const ofensoresCount = pickNum(bloco, ['ofensores_count']) ?? 0;
    const ofensoresTop5 = pickArr(bloco, ['ofensores_top5']);
    const criticosCount = ofensoresTop5.filter((station: any) => pickStr(station, ['severidade']) === 'critico').length;

    return (
      <View key={titulo} style={styles.marginCategoryCard}>
        <View style={styles.marginCategoryHeader}>
          <Text style={styles.marginCategoryTitle}>{titulo.toUpperCase()}</Text>
          <Text style={styles.marginCategoryAverage}>
            Média rede: {mediaRedeRsUnit !== null && unidade ? `${fmtBRLOrDash(mediaRedeRsUnit)}/${unidade} · ` : ''}
            {fmtPercentOrDash(mediaRede)}
          </Text>
        </View>

        {ofensoresCount > 0 ? (
          <View style={styles.marginCategoryFooter}>
            <Text style={styles.marginCategoryFooterOffenders}>{ofensoresCount} ofensores</Text>
            {criticosCount > 0 ? (
              <Text style={[styles.marginCategoryFooterOffenders, { color: '#E6213D' }]}>
                {criticosCount} crítico{criticosCount === 1 ? '' : 's'}
              </Text>
            ) : null}
          </View>
        ) : null}

        {ofensoresCount === 0 ? (
          <Text style={styles.conversaEmptyText}>Todos os postos estão acima da média da rede.</Text>
        ) : (
          ofensoresTop5.map((station: any, stationIndex: number) => {
            const severidade = pickStr(station, ['severidade']);
            const percentual = pickNum(station, ['margem_posto_pct']);
            const delta = pickNum(station, ['desvio_pp']);
            const margemRsUnit = pickNum(station, ['margem_rs_unit']);
            const desvioRsUnit = pickNum(station, ['desvio_rs_unit']);
            const impactoPosto = pickNum(station, ['impacto_rs']);
            const puxadoPor = pickArr(station, ['puxado_por'])
              .map((entry: any) => pickStr(entry, ['label']))
              .filter((label): label is string => !!label)
              .join(', ');

            return (
              <View key={pickStr(station, ['posto_id']) ?? stationIndex} style={styles.marginStationRow}>
                <Text style={styles.marginRank}>#{stationIndex + 1}</Text>
                <View style={styles.marginStationTextBlock}>
                  <Text style={styles.marginStationName}>{pickStr(station, ['posto_nome']) ?? '—'}</Text>
                  {margemRsUnit !== null && unidade ? (
                    <Text style={styles.marginStationPulledBy}>
                      {fmtBRLOrDash(margemRsUnit)}/{unidade}
                      {desvioRsUnit !== null ? ` · ${desvioRsUnit > 0 ? '+' : ''}${fmtBRLOrDash(desvioRsUnit)}/${unidade}` : ''}
                    </Text>
                  ) : null}
                  {puxadoPor ? <Text style={styles.marginStationPulledBy}>{puxadoPor}</Text> : null}
                  {impactoPosto !== null ? (
                    <Text style={styles.marginStationPulledBy}>Perda: {fmtBRLOrDash(impactoPosto)}</Text>
                  ) : null}
                </View>
                <View style={styles.marginStationRight}>
                  <View style={styles.marginStationPercentRow}>
                    <View
                      style={[
                        styles.marginStationDot,
                        { backgroundColor: severidade === 'critico' ? '#E6213D' : '#D79A22' },
                      ]}
                    />
                    <Text style={styles.marginStationPercent}>{fmtPercentOrDash(percentual)}</Text>
                  </View>
                  <Text style={styles.marginStationDelta}>{pctDeltaLabel(delta)}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.marginCategoryFooter}>
          <Text style={styles.marginCategoryFooterOffenders}>
            {ofensoresCount} ofensor{ofensoresCount === 1 ? '' : 'es'}
            {ofensoresCount > ofensoresTop5.length ? ` (top ${ofensoresTop5.length} exibidos)` : ''}
          </Text>
          <Text style={styles.marginCategoryFooterImpact}>Impacto: {fmtBRLOrDash(impacto)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={directorUserInitials}
          variant="diretoria"
          onAvatarPress={() => navigation.navigate('DirectorProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.directorPageHeaderRow}>
          <View style={styles.directorPageTitleRow}>
            <View style={[styles.iconShell, { backgroundColor: '#EDF1FF' }]}>
              <Feather name="percent" size={18} color="#3457D5" />
            </View>
            <Text style={styles.pageTitle}>Margem</Text>
          </View>
          {alertasCusto.length > 0 ? (
            <View style={styles.marginAlertPill}>
              <Feather name="bell" size={13} color="#FFFFFF" />
              <Text style={styles.marginAlertPillText}>
                {alertasCusto.length} alerta{alertasCusto.length === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.pageSubtitle}>
          Postos ofensores · Toda a rede ({postos.length} postos)
        </Text>

        <View style={[styles.directorFilterRow, { marginBottom: 8 }]}>
          <View style={[styles.lowStockTabsRow, { flex: 0, marginTop: 0, width: 108 }]}>
            {(['mes', 'ano'] as const).map((mode) => (
              <Pressable
                key={mode}
                style={[styles.lowStockTab, viewMode === mode ? styles.lowStockTabActive : null]}
                onPress={() => setViewMode(mode)}
              >
                <Text style={[styles.lowStockTabText, viewMode === mode ? styles.lowStockTabTextActive : null]}>
                  {mode === 'mes' ? 'Mês' : 'Ano'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.directorFilterPill, { flex: 1, justifyContent: 'space-between' }]}>
            <Pressable onPress={handlePrevPeriod}>
              <Feather name="chevron-left" size={16} color="#5E667D" />
            </Pressable>
            <Pressable onPress={handleResetPeriod} style={styles.marginPeriodLabelWrap}>
              <Text style={styles.directorFilterPillText} numberOfLines={1}>
                {periodLabel}
              </Text>
            </Pressable>
            <Pressable onPress={handleNextPeriod}>
              <Feather name="chevron-right" size={16} color="#5E667D" />
            </Pressable>
          </View>
        </View>

        <View style={styles.directorFilterRow}>
          <Pressable
            style={[styles.directorFilterPill, { flex: 1, justifyContent: 'space-between' }]}
            onPress={() => setIsStationPickerOpen(true)}
          >
            <Text style={styles.directorFilterPillText}>{selectedStation}</Text>
            <Feather name="chevron-down" size={14} color="#5E667D" />
          </Pressable>
        </View>

        {isLoading && !margem ? (
          <Text style={styles.conversaEmptyText}>Carregando margem...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : (
          <>
            <Text style={styles.directorSectionTitle}>RESUMO</Text>
            {topCards.map((card) => (
              <View key={card.id} style={styles.directorSummaryCard}>
                <View style={styles.directorSummaryLeft}>
                  <Text style={styles.directorSummaryLabel}>{card.label.toUpperCase()}</Text>
                  <Text style={styles.directorSummaryValue}>{card.value}</Text>
                  {card.meta ? <Text style={styles.directorSummaryMeta}>{card.meta}</Text> : null}
                </View>
                {card.badge ? (
                  <View
                    style={[
                      styles.directorSummaryPill,
                      { backgroundColor: card.badge.startsWith('-') ? '#FCE8EC' : '#E2F4EA' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.directorSummaryPillText,
                        { color: card.badge.startsWith('-') ? '#E6213D' : '#18955A' },
                      ]}
                    >
                      {card.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}

            {statCards.map((card) => (
              <View key={card.id} style={styles.directorSummaryCard}>
                <View style={styles.directorSummaryLeft}>
                  <Text style={styles.directorSummaryLabel}>{card.label.toUpperCase()}</Text>
                  <Text style={styles.directorSummaryValue}>{card.value}</Text>
                  {card.meta ? <Text style={styles.directorSummaryMeta}>{card.meta}</Text> : null}
                </View>
              </View>
            ))}

            {totalOfensoresCombustivel > 0 ? (
              <>
                <Text style={[styles.directorSectionTitle, styles.spacingTop]}>
                  COMBUSTÍVEIS — POSTOS OFENSORES
                </Text>
                {categoriasCombustivel.map(renderBlocoCard)}
              </>
            ) : null}

            <Text style={[styles.directorSectionTitle, styles.spacingTop]}>LOJAS — POSTOS OFENSORES</Text>
            {categoriasLoja.length === 0 ? (
              <Text style={styles.conversaEmptyText}>Sem ofensores de loja no período.</Text>
            ) : (
              categoriasLoja.map(renderBlocoCard)
            )}

            <Text style={styles.directorSectionTitle}>Custos que ofendem a margem</Text>
            <Text style={styles.unrecognizedSectionSubtitle}>
              {alertasCusto.length} não reconhecido{alertasCusto.length === 1 ? '' : 's'} · não filtrado pelo
              período (é por data de entrada de compra)
            </Text>

            {alertasCusto.length === 0 ? (
              <Text style={styles.conversaEmptyText}>Nenhum custo não reconhecido no período.</Text>
            ) : (
              alertasCusto.map((item, index) => {
                const status = pickStr(item, ['status']) ?? '';
                const isCritico = status === 'CRITICO';
                const statusLabel = status === 'CRITICO' ? 'Crítico' : status === 'ATENCAO' ? 'Atenção' : status === 'OK' ? 'OK' : status || '—';
                const dataEntrada = pickStr(item, ['data_entrada']);
                const reconhecido = (item as any)?.reconhecido === true;
                const reconhecidoPor = pickStr(item, ['reconhecido_por']);

                return (
                  <View key={pickStr(item, ['id']) ?? index} style={styles.unrecognizedCard}>
                    <Text style={styles.unrecognizedStationName}>{pickStr(item, ['posto_nome']) ?? '—'}</Text>
                    <Text style={styles.unrecognizedProductLabel}>
                      {pickStr(item, ['produto_nome']) ?? '—'} ·{' '}
                      {dataEntrada ? formatDateBR(new Date(dataEntrada + 'T00:00:00')) : '—'}
                    </Text>
                    <View style={styles.unrecognizedStatsRow}>
                      <View style={styles.unrecognizedStatBlock}>
                        <Text style={styles.unrecognizedStatLabel}>Custo</Text>
                        <Text style={styles.unrecognizedStatValue}>
                          {fmtBRLOrDash(pickNum(item, ['preco_custo_novo']))}
                        </Text>
                      </View>
                      <View style={styles.unrecognizedStatBlock}>
                        <Text style={styles.unrecognizedStatLabel}>Preço Ref</Text>
                        <Text style={styles.unrecognizedStatValue}>
                          {fmtBRLOrDash(pickNum(item, ['preco_venda_ref']))}
                        </Text>
                      </View>
                      <View style={styles.unrecognizedStatBlock}>
                        <Text style={styles.unrecognizedStatLabel}>Margem</Text>
                        <Text style={[styles.unrecognizedStatValue, styles.unrecognizedStatValueDanger]}>
                          {fmtPercentOrDash(pickNum(item, ['margem_resultante']))}
                        </Text>
                      </View>
                      <View style={styles.unrecognizedStatBlock}>
                        <Text style={styles.unrecognizedStatLabel}>Meta</Text>
                        <Text style={styles.unrecognizedStatValue}>
                          {fmtPercentOrDash(pickNum(item, ['margem_meta']))}
                        </Text>
                      </View>
                      <View style={styles.unrecognizedStatBlock}>
                        <Text style={styles.unrecognizedStatLabel}>Status</Text>
                        <View style={styles.unrecognizedStatusRow}>
                          <View
                            style={[
                              styles.unrecognizedStatusDot,
                              { backgroundColor: isCritico ? '#E6213D' : '#B7791F' },
                            ]}
                          />
                          <Text style={[styles.unrecognizedStatValue, styles.unrecognizedStatValueDanger]}>
                            {statusLabel}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {reconhecido ? (
                      <Text style={styles.conversaEmptyText}>
                        Reconhecido{reconhecidoPor ? ` por ${reconhecidoPor}` : ''}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <SimpleListModal
        visible={isStationPickerOpen}
        title="Selecionar posto"
        options={stationOptions}
        selectedValue={selectedStation}
        onSelect={setSelectedStation}
        onClose={() => setIsStationPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function StockScreen({ navigation }: ScreenProps<'Stock'>) {
  const statusColors: Record<
    StockTankItem['status'],
    { border: string; tint: string; text: string; fill: string }
  > = {
    ok: { border: '#18955A', tint: '#E4F5EE', text: '#18955A', fill: '#2FAE72' },
    warning: { border: '#D79A22', tint: '#FCF4DE', text: '#B7791F', fill: '#E0AC3C' },
    attention: { border: '#D97E22', tint: '#FCEEDE', text: '#B7631F', fill: '#E08C3C' },
    critical: { border: '#E6213D', tint: '#FCE8EC', text: '#E6213D', fill: '#E6213D' },
  };

  const [activeCategoryTab, setActiveCategoryTab] = useState<'Tudo' | LowStockCategory>('Tudo');
  const [showItemsWithoutTurnover, setShowItemsWithoutTurnover] = useState(false);
  const [dismissedProductIds, setDismissedProductIds] = useState<Record<string, boolean>>({});
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [isStationPickerOpen, setIsStationPickerOpen] = useState(false);
  const hasStationFilter = selectedStations.length > 0;

  const postos = useDiretoriaPostos();
  const stockStationOptions = useMemo(() => ['Toda a rede', ...postos.map((p) => p.nome)], [postos]);

  const [stockViewMode, setStockViewMode] = useState<'mes' | 'ano'>('mes');
  const [stockAnchorDate, setStockAnchorDate] = useState(() => new Date());

  const handleStockPrevPeriod = () => {
    setStockAnchorDate((current) =>
      stockViewMode === 'mes'
        ? new Date(current.getFullYear(), current.getMonth() - 1, 1)
        : new Date(current.getFullYear() - 1, current.getMonth(), 1)
    );
  };
  const handleStockNextPeriod = () => {
    setStockAnchorDate((current) =>
      stockViewMode === 'mes'
        ? new Date(current.getFullYear(), current.getMonth() + 1, 1)
        : new Date(current.getFullYear() + 1, current.getMonth(), 1)
    );
  };
  const handleStockResetPeriod = () => setStockAnchorDate(new Date());

  const stockPeriodLabel =
    stockViewMode === 'mes'
      ? `${MARGIN_MONTH_NAMES[stockAnchorDate.getMonth()]} / ${stockAnchorDate.getFullYear()}`
      : `${stockAnchorDate.getFullYear()}`;

  const estoquesFiltros = useMemo(() => {
    const de =
      stockViewMode === 'mes'
        ? new Date(stockAnchorDate.getFullYear(), stockAnchorDate.getMonth(), 1)
        : new Date(stockAnchorDate.getFullYear(), 0, 1);
    const ate =
      stockViewMode === 'mes'
        ? new Date(stockAnchorDate.getFullYear(), stockAnchorDate.getMonth() + 1, 0)
        : new Date(stockAnchorDate.getFullYear(), 11, 31);
    return { de: toApiDateOnly(de), ate: toApiDateOnly(ate) };
  }, [stockViewMode, stockAnchorDate]);
  const {
    dados: estoques,
    isLoading: isLoadingEstoques,
    errorMessage: estoquesError,
  } = useDiretoriaPainelRecurso('estoques', estoquesFiltros);
  // Confirmado pela Lovable em 07/08/2026: cards de produto (um por
  // combustível) vêm em dados.produtosTanque[], e os 4 cards de resumo do
  // topo em dados.resumo — substituindo os nomes adivinhados antes
  // (tanquesTodos/tanquesAlerta/tanques/familias) que nunca bateram.
  const produtosTanque = pickArr(estoques, ['produtosTanque']);
  const estoquesResumo = (estoques as any)?.resumo ?? null;
  const [expandedTankIds, setExpandedTankIds] = useState<Record<string, boolean>>({});

  // status real: "green" = OK, "yellow" = Monitorar, "orange" = Atenção,
  // "red" = Crítico (confirmado nas telas de Loja/Pista pela Lovable —
  // aplicamos a mesma escala de 4 níveis aos tanques de combustível).
  const mapEstoqueStatus = (raw: string | null): StockTankItem['status'] => {
    const value = (raw ?? '').toLowerCase();
    if (value === 'red' || value.includes('crit')) return 'critical';
    if (value === 'orange' || value.includes('aten')) return 'attention';
    if (value === 'yellow' || value.includes('monitor')) return 'warning';
    return 'ok';
  };
  const estoqueStatusLabel: Record<StockTankItem['status'], string> = {
    ok: 'OK',
    warning: 'Monitorar',
    attention: 'Atenção',
    critical: 'Crítico',
  };

  // --- Produtos de Loja e Pista (ProdutoLinha, confirmado pela Lovable em
  // 04/08/2026 — mesmo recurso=estoques, campo "produtos"). Regra de
  // "zerados com giro ativo" dela: saldo_estimado <= 0 && volume_7d > 0;
  // volume_7d === 0 é "sem giro" e só aparece com o toggle ligado. ---
  const produtosLojaRaw: any[] = pickArr(estoques, ['produtos']);

  const mapProdutoStatus = (raw: string | null): { status: 'critical' | 'warning'; label: string } => {
    const value = (raw ?? '').toLowerCase();
    if (value === 'red') return { status: 'critical', label: 'Crítico' };
    if (value === 'orange') return { status: 'warning', label: 'Atenção' };
    if (value === 'yellow') return { status: 'warning', label: 'Monitorar' };
    return { status: 'warning', label: 'OK' };
  };

  const zerosFiltrados = useMemo(() => {
    return produtosLojaRaw.filter((item) => {
      const saldo = pickNum(item, ['saldo_estimado']) ?? 0;
      const volume7d = pickNum(item, ['volume_7d']) ?? 0;
      if (saldo > 0) return false;
      return showItemsWithoutTurnover || volume7d > 0;
    });
  }, [produtosLojaRaw, showItemsWithoutTurnover]);

  const lowStockProductsReal: LowStockProductItem[] = useMemo(() => {
    return zerosFiltrados.map((item, index) => {
      const unidade = pickStr(item, ['unidade_venda']) ?? '';
      const saldo = pickNum(item, ['saldo_estimado']) ?? 0;
      const volume7d = pickNum(item, ['volume_7d']) ?? 0;
      const consumoMedio = pickNum(item, ['consumo_medio_dia']);
      const receitaPerdida = pickNum(item, ['receita_perdida_dia']);
      const coberturaDias = pickNum(item, ['cobertura_dias']);
      const { status, label: statusLabel } = mapProdutoStatus(pickStr(item, ['status']));
      const empresaCodigo = pickNum(item, ['empresa_codigo']);
      const produtoCodigo = pickNum(item, ['produto_codigo']);

      return {
        id: `${empresaCodigo ?? 'e'}-${produtoCodigo ?? 'p'}-${index}`,
        station: pickStr(item, ['posto_nome']) ?? '—',
        product: pickStr(item, ['produto_nome']) ?? '—',
        category: pickStr(item, ['categoria']) === 'loja_conv' ? 'Conveniência' : 'Loja Pista',
        balanceLabel: `${saldo.toLocaleString('pt-BR')} ${unidade}`.trim(),
        last7DaysLabel: `${volume7d.toLocaleString('pt-BR')} ${unidade}`.trim(),
        dailyConsumptionLabel:
          consumoMedio === null ? '—' : consumoMedio.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
        dailyRevenueLabel: fmtBRLOrDash(receitaPerdida),
        coverageLabel:
          coberturaDias === null ? 'Sem giro' : `${coberturaDias.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} d`,
        status,
        statusLabel,
      };
    });
  }, [zerosFiltrados]);

  const lowStockSummaryReal = useMemo(() => {
    const porCategoria = new Map<string, number>();
    let revenueAtRisk = 0;
    zerosFiltrados.forEach((item) => {
      const categoria = pickStr(item, ['categoria']) === 'loja_conv' ? 'Conveniência' : 'Loja Pista';
      porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + 1);
      revenueAtRisk += pickNum(item, ['receita_perdida_dia']) ?? 0;
    });
    const topCategoriesLabel =
      Array.from(porCategoria.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => `${label} (${count})`)
        .join(' · ') || '—';
    return {
      totalCount: zerosFiltrados.length,
      revenueAtRiskLabel: formatBRL(revenueAtRisk),
      topCategoriesLabel,
    };
  }, [zerosFiltrados]);

  const stationFilterLabel =
    selectedStations.length === 0
      ? stockStationOptions[0]
      : selectedStations.length === 1
      ? selectedStations[0]
      : `${selectedStations.length} postos`;
  const [lowStockPage, setLowStockPage] = useState(1);
  const LOW_STOCK_PAGE_SIZE = 20;

  const visibleLowStockItems = lowStockProductsReal.filter((item) => {
    if (dismissedProductIds[item.id]) {
      return false;
    }

    if (hasStationFilter && !selectedStations.includes(item.station)) {
      return false;
    }

    return activeCategoryTab === 'Tudo' || item.category === activeCategoryTab;
  });

  const lowStockTotalPages = Math.max(
    1,
    Math.ceil(visibleLowStockItems.length / LOW_STOCK_PAGE_SIZE)
  );
  const lowStockCurrentPage = Math.min(lowStockPage, lowStockTotalPages);
  const pagedLowStockItems = visibleLowStockItems.slice(
    (lowStockCurrentPage - 1) * LOW_STOCK_PAGE_SIZE,
    lowStockCurrentPage * LOW_STOCK_PAGE_SIZE
  );

  const goToPreviousLowStockPage = () => {
    setLowStockPage((current) => Math.max(1, current - 1));
  };

  const goToNextLowStockPage = () => {
    setLowStockPage((current) => Math.min(lowStockTotalPages, current + 1));
  };

  const handleSelectCategoryTab = (tab: 'Tudo' | LowStockCategory) => {
    setActiveCategoryTab(tab);
    setLowStockPage(1);
  };

  const handleToggleStation = (station: string) => {
    setSelectedStations((current) =>
      current.includes(station) ? current.filter((item) => item !== station) : [...current, station]
    );
    setLowStockPage(1);
  };

  const handleSelectAllStations = () => {
    setSelectedStations([]);
    setLowStockPage(1);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={directorUserInitials}
          variant="diretoria"
          onAvatarPress={() => navigation.navigate('DirectorProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <View style={styles.directorPageTitleRow}>
            <View style={[styles.iconShell, { backgroundColor: '#E4F5EE' }]}>
              <Feather name="box" size={18} color="#18955A" />
            </View>
            <Text style={styles.pageTitle}>Estoques</Text>
          </View>
        </View>

        <View style={[styles.directorFilterRow, { marginBottom: 8 }]}>
          <View style={[styles.lowStockTabsRow, { flex: 0, marginTop: 0, width: 108 }]}>
            {(['mes', 'ano'] as const).map((mode) => (
              <Pressable
                key={mode}
                style={[styles.lowStockTab, stockViewMode === mode ? styles.lowStockTabActive : null]}
                onPress={() => setStockViewMode(mode)}
              >
                <Text
                  style={[styles.lowStockTabText, stockViewMode === mode ? styles.lowStockTabTextActive : null]}
                >
                  {mode === 'mes' ? 'Mês' : 'Ano'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.directorFilterPill, { flex: 1, justifyContent: 'space-between' }]}>
            <Pressable onPress={handleStockPrevPeriod}>
              <Feather name="chevron-left" size={16} color="#5E667D" />
            </Pressable>
            <Pressable onPress={handleStockResetPeriod} style={styles.marginPeriodLabelWrap}>
              <Text style={styles.directorFilterPillText} numberOfLines={1}>
                {stockPeriodLabel}
              </Text>
            </Pressable>
            <Pressable onPress={handleStockNextPeriod}>
              <Feather name="chevron-right" size={16} color="#5E667D" />
            </Pressable>
          </View>
        </View>

        <View style={styles.directorFilterRow}>
          <Pressable
            style={[styles.directorFilterPill, { flex: 1, justifyContent: 'space-between' }]}
            onPress={() => setIsStationPickerOpen(true)}
          >
            <Text style={styles.directorFilterPillText}>{stationFilterLabel}</Text>
            <Feather name="chevron-down" size={14} color="#5E667D" />
          </Pressable>
        </View>

        {estoquesResumo ? (
          <>
            <Text style={styles.directorSectionTitle}>RESUMO</Text>
            <View style={styles.stockSummaryGrid}>
              <View style={styles.stockSummaryCard}>
                <Text style={styles.directorSummaryLabel}>TANQUES CRÍTICOS</Text>
                <Text style={styles.directorSummaryValue}>
                  {fmtNumOrDash(pickNum(estoquesResumo, ['tanques_criticos']))}
                </Text>
                <Text style={styles.directorSummaryMeta}>
                  de {fmtNumOrDash(pickNum(estoquesResumo, ['tanques_monitorados']))} monitorados
                </Text>
              </View>
              <View style={styles.stockSummaryCard}>
                <Text style={styles.directorSummaryLabel}>AUTONOMIA MÉDIA</Text>
                <Text style={styles.directorSummaryValue}>
                  {fmtAutonomiaHoras(pickNum(estoquesResumo, ['autonomia_media_horas']))}
                </Text>
                <Text style={styles.directorSummaryMeta}>Média ponderada de tanques ativos</Text>
              </View>
              <View style={styles.stockSummaryCard}>
                <Text style={styles.directorSummaryLabel}>PRODUTOS ZERADOS</Text>
                <Text style={styles.directorSummaryValue}>
                  {fmtNumOrDash(pickNum(estoquesResumo, ['produtos_zerados_com_giro']))}
                </Text>
                <Text style={styles.directorSummaryMeta}>Com giro nos últimos 7 dias</Text>
              </View>
              <View style={styles.stockSummaryCard}>
                <Text style={styles.directorSummaryLabel}>RECEITA/DIA EM RISCO</Text>
                <Text style={styles.directorSummaryValue}>
                  {fmtBRLOrDash(pickNum(estoquesResumo, ['receita_risco_dia']))}
                </Text>
                <Text style={styles.directorSummaryMeta}>Perda estimada por ruptura</Text>
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.stockSectionHeaderRow}>
          <Feather name="droplet" size={15} color="#E6213D" />
          <Text style={styles.stockSectionTitle}>Tanques de combustível</Text>
        </View>

        {isLoadingEstoques && !estoques ? (
          <Text style={styles.conversaEmptyText}>Carregando estoques...</Text>
        ) : estoquesError ? (
          <Text style={styles.conversaEmptyText}>{estoquesError}</Text>
        ) : produtosTanque.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Sem dados de estoque no período.</Text>
        ) : (
          produtosTanque.map((item: any, index: number) => {
            const statusKey = mapEstoqueStatus(pickStr(item, ['status']));
            const colors = statusColors[statusKey];
            const unidade = pickStr(item, ['unidade']) ?? 'L';
            const volumeAtual = pickNum(item, ['estoque_total']);
            const capacidade = pickNum(item, ['capacidade_total']);
            const nivelPct = pickNum(item, ['nivel_pct']);
            const progress = nivelPct !== null ? nivelPct / 100 : volumeAtual !== null && capacidade ? volumeAtual / capacidade : 0;
            const qtdTanques = pickNum(item, ['tanques_count']);
            const qtdPostos = pickNum(item, ['postos_count']);
            const autonomiaHoras = pickNum(item, ['autonomia_horas']);
            const consumoMedioDia = pickNum(item, ['consumo_medio_dia']);
            const mediaRedeAutonomia = pickNum(item, ['media_rede_autonomia_horas']);
            // status_label vem pronto da API — sempre confiar nele; só cai no
            // fallback calculado se por algum motivo vier ausente.
            const statusLabel = pickStr(item, ['status_label']) ?? estoqueStatusLabel[statusKey];
            const titulo = pickStr(item, ['produto_nome']) ?? `Produto ${index + 1}`;
            const postosCriticos = pickArr(item, ['postos_criticos']);
            // Chave única por card: familia se repete entre vários produtos
            // (ex.: GASOLINA cobre ADITIVADA/COMUM/GRID/PODIUM/...), causando
            // "two children with the same key" — produto_nome é único.
            const itemId = titulo;
            const isExpanded = Boolean(expandedTankIds[itemId]);
            // sem_dados_hoje = true: sem leitura recente, autonomia/consumo
            // não são confiáveis (podem vir com valores absurdos) — mostrar
            // "—" e o aviso, igual ao painel web.
            const semDadosHoje = Boolean((item as any)?.sem_dados_hoje);

            return (
              <View key={itemId} style={[styles.stockCard, { borderLeftColor: colors.border }]}>
                <View style={styles.stockCardTopRow}>
                  <Text style={styles.stockCardTitle}>{titulo}</Text>
                  <View style={[styles.stockStatusPill, { backgroundColor: colors.tint }]}>
                    <Text style={[styles.stockStatusPillText, { color: colors.text }]}>{statusLabel}</Text>
                  </View>
                </View>
                <Text style={styles.stockCardSubtitle}>
                  {qtdTanques !== null ? `${qtdTanques} tanque${qtdTanques === 1 ? '' : 's'}` : '—'}
                  {qtdPostos !== null ? ` · ${qtdPostos} posto${qtdPostos === 1 ? '' : 's'}` : ''}
                </Text>
                <Text style={styles.stockCardValue}>
                  {fmtNumOrDash(volumeAtual, ` ${unidade}`)}
                  {capacidade !== null ? ` / ${fmtNumOrDash(capacidade, ` ${unidade}`)}` : ''}
                  {nivelPct !== null ? ` (${fmtPercentOrDash(nivelPct)})` : ''}
                </Text>
                <View style={styles.stockProgressTrack}>
                  <View
                    style={[
                      styles.stockProgressFill,
                      { width: `${Math.min(100, Math.max(0, progress * 100))}%`, backgroundColor: colors.fill },
                    ]}
                  />
                </View>
                <View style={styles.stockConsumptionRow}>
                  <Text style={styles.stockConsumptionLabel}>Autonomia</Text>
                  <Text style={styles.stockConsumptionValue}>
                    {semDadosHoje ? '—' : fmtAutonomiaHoras(autonomiaHoras)}
                  </Text>
                </View>
                <View style={styles.stockConsumptionRow}>
                  <Text style={styles.stockConsumptionLabel}>Consumo médio/dia</Text>
                  <Text style={styles.stockConsumptionValue}>
                    {semDadosHoje ? '—' : fmtNumOrDash(consumoMedioDia, ` ${unidade}`)}
                  </Text>
                </View>

                {semDadosHoje ? (
                  <View style={styles.stockSnapshotBadge}>
                    <Text style={styles.stockSnapshotBadgeText}>snapshot anterior</Text>
                  </View>
                ) : null}

                {postosCriticos.length > 0 ? (
                  <>
                    <Pressable
                      style={styles.stockToggleRow}
                      onPress={() =>
                        setExpandedTankIds((current) => ({ ...current, [itemId]: !current[itemId] }))
                      }
                    >
                      <Text style={styles.stockToggleRowText}>
                        {titulo.toUpperCase()} — {postosCriticos.length} posto{postosCriticos.length === 1 ? '' : 's'} mais crítico
                        {postosCriticos.length === 1 ? '' : 's'}
                      </Text>
                      <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={15} color="#3457D5" />
                    </Pressable>

                    {isExpanded ? (
                      <View style={styles.stockCriticalTable}>
                        <Text style={styles.stockCriticalTableMeta}>
                          Média da rede: {fmtAutonomiaHoras(mediaRedeAutonomia)}
                        </Text>
                        {postosCriticos.map((posto: any, postoIndex: number) => {
                          const postoStatusKey = mapEstoqueStatus(pickStr(posto, ['status']));
                          const postoColors = statusColors[postoStatusKey];
                          const postoStatusLabel = pickStr(posto, ['status_label']) ?? estoqueStatusLabel[postoStatusKey];
                          const desvioHoras = pickNum(posto, ['desvio_horas']);

                          return (
                            <View
                              key={pickStr(posto, ['posto_id']) ?? postoIndex}
                              style={styles.stockCriticalRow}
                            >
                              <Text style={styles.stockCriticalRank}>#{postoIndex + 1}</Text>
                              <View style={styles.stockCriticalTextBlock}>
                                <Text style={styles.stockCriticalName}>
                                  {pickStr(posto, ['posto_nome']) ?? '—'}
                                </Text>
                                <Text style={styles.stockCriticalMeta}>
                                  {fmtNumOrDash(pickNum(posto, ['estoque']), ` ${unidade}`)} /{' '}
                                  {fmtNumOrDash(pickNum(posto, ['capacidade']), ` ${unidade}`)} ·{' '}
                                  {fmtPercentOrDash(pickNum(posto, ['nivel_pct']))}
                                </Text>
                              </View>
                              <View style={styles.stockCriticalRight}>
                                <View style={styles.stockCriticalStatusRow}>
                                  <View
                                    style={[styles.marginStationDot, { backgroundColor: postoColors.border }]}
                                  />
                                  <Text style={[styles.stockCriticalStatusText, { color: postoColors.text }]}>
                                    {postoStatusLabel}
                                  </Text>
                                </View>
                                <Text style={styles.stockCriticalAutonomy}>
                                  {fmtAutonomiaHoras(pickNum(posto, ['autonomia_horas']))}
                                </Text>
                                <Text style={styles.stockCriticalDelta}>
                                  {desvioHoras === null
                                    ? '—'
                                    : `${desvioHoras > 0 ? '+' : ''}${fmtAutonomiaHoras(Math.abs(desvioHoras))}`}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            );
          })
        )}

        <View style={styles.stockSectionHeaderRow}>
          <Feather name="box" size={15} color="#E6213D" />
          <Text style={styles.stockSectionTitle}>Produtos de Loja e Pista</Text>
        </View>

        <View style={styles.lowStockFilterCard}>
          <Text style={styles.lowStockFilterTitle}>Produtos zerados com giro ativo</Text>

          <View style={styles.lowStockTabsRow}>
            {(['Tudo', 'Loja Pista', 'Conveniência'] as const).map((tab) => (
              <Pressable
                key={tab}
                style={[styles.lowStockTab, activeCategoryTab === tab ? styles.lowStockTabActive : null]}
                onPress={() => handleSelectCategoryTab(tab)}
              >
                <Text
                  style={[
                    styles.lowStockTabText,
                    activeCategoryTab === tab ? styles.lowStockTabTextActive : null,
                  ]}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.lowStockCheckboxRow}
            onPress={() => setShowItemsWithoutTurnover((value) => !value)}
          >
            <View style={[styles.checkbox, showItemsWithoutTurnover && styles.checkboxChecked]}>
              {showItemsWithoutTurnover ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.lowStockCheckboxLabel}>Exibir itens sem giro</Text>
          </Pressable>

          <Text style={styles.lowStockSummaryText}>
            {lowStockSummaryReal.totalCount} produtos zerados{showItemsWithoutTurnover ? '' : ' com giro ativo'} · Receita
            diária em risco: <Text style={styles.lowStockSummaryDanger}>{lowStockSummaryReal.revenueAtRiskLabel}</Text>
          </Text>
          <Text style={styles.lowStockTopCategoriesText}>
            Top categorias: {lowStockSummaryReal.topCategoriesLabel}
          </Text>
        </View>

        <View style={styles.lowStockListCard}>
          {visibleLowStockItems.length === 0 ? (
            <Text style={styles.lowStockEmptyText}>
              {`Nenhum produto zerado encontrado${
                hasStationFilter
                  ? selectedStations.length === 1
                    ? ` para ${selectedStations[0]}`
                    : ' para os postos selecionados'
                  : ''
              }.`}
            </Text>
          ) : null}

          {pagedLowStockItems.map((item, index) => {
            const isExpanded = Boolean(expandedProductIds[item.id]);

            const handleDismiss = () => {
              Alert.alert(
                'Excluir alerta',
                'Tem certeza que deseja excluir este alerta?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () =>
                      setDismissedProductIds((current) => ({ ...current, [item.id]: true })),
                  },
                ]
              );
            };

            const toggleExpanded = () => {
              setExpandedProductIds((current) => ({ ...current, [item.id]: !current[item.id] }));
            };

            return (
              <View
                key={item.id}
                style={[
                  styles.lowStockRow,
                  index < pagedLowStockItems.length - 1 ? styles.lowStockRowBorder : null,
                ]}
              >
                <View style={styles.lowStockRowTopLine}>
                  <View style={styles.lowStockRowTitleBlock}>
                    <Text style={styles.lowStockProductName}>{item.station}</Text>
                    <Text style={styles.lowStockStationName}>{item.product}</Text>
                    <View style={styles.lowStockCategoryPill}>
                      <Text style={styles.lowStockCategoryPillText}>{item.category}</Text>
                    </View>
                  </View>

                  <Pressable onPress={handleDismiss} hitSlop={10} style={styles.lowStockDismissButton}>
                    <Feather name="x" size={16} color="#9AA1B5" />
                  </Pressable>
                </View>

                <View style={styles.lowStockCompactStatsRow}>
                  <View style={styles.lowStockCompactStatBlock}>
                    <Text style={styles.unrecognizedStatLabel}>Saldo</Text>
                    <Text style={styles.unrecognizedStatValue}>{item.balanceLabel}</Text>
                  </View>
                  <View style={styles.lowStockCompactStatBlock}>
                    <Text style={styles.unrecognizedStatLabel}>U7D</Text>
                    <Text style={styles.unrecognizedStatValue}>{item.last7DaysLabel}</Text>
                  </View>
                  <View style={styles.lowStockCompactStatBlock}>
                    <Text style={styles.unrecognizedStatLabel}>Consumo/dia</Text>
                    <Text style={styles.unrecognizedStatValue}>{item.dailyConsumptionLabel}</Text>
                  </View>
                </View>

                {isExpanded ? (
                  <View style={[styles.lowStockCompactStatsRow, styles.lowStockExpandedStatsRow]}>
                    <View style={styles.lowStockCompactStatBlock}>
                      <Text style={styles.unrecognizedStatLabel}>Receita/dia</Text>
                      <Text style={styles.unrecognizedStatValue}>{item.dailyRevenueLabel}</Text>
                    </View>
                    <View style={styles.lowStockCompactStatBlock}>
                      <Text style={styles.unrecognizedStatLabel}>Cobertura</Text>
                      <Text style={[styles.unrecognizedStatValue, styles.unrecognizedStatValueDanger]}>
                        {item.coverageLabel}
                      </Text>
                    </View>
                    <View style={styles.lowStockCompactStatBlock}>
                      <Text style={styles.unrecognizedStatLabel}>Status</Text>
                      <View style={styles.unrecognizedStatusRow}>
                        <View
                          style={[
                            styles.unrecognizedStatusDot,
                            { backgroundColor: item.status === 'critical' ? '#E6213D' : '#B7791F' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.unrecognizedStatValue,
                            item.status === 'critical'
                              ? styles.unrecognizedStatValueDanger
                              : styles.lowStockStatusWarningText,
                          ]}
                        >
                          {item.statusLabel}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                <Pressable style={styles.lowStockToggleButton} onPress={toggleExpanded} hitSlop={6}>
                  <Text style={styles.lowStockToggleButtonText}>
                    {isExpanded ? 'Ver menos detalhes' : 'Ver mais detalhes'}
                  </Text>
                  <Feather
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color="#3457D5"
                  />
                </Pressable>
              </View>
            );
          })}
        </View>

        {lowStockTotalPages > 1 ? (
          <View style={styles.lowStockPaginationRow}>
            <Pressable
              style={[
                styles.lowStockPageButton,
                lowStockCurrentPage === 1 ? styles.lowStockPageButtonDisabled : null,
              ]}
              onPress={goToPreviousLowStockPage}
              disabled={lowStockCurrentPage === 1}
            >
              <Feather
                name="chevron-left"
                size={16}
                color={lowStockCurrentPage === 1 ? '#C8CEDD' : '#3A415C'}
              />
              <Text
                style={[
                  styles.lowStockPageButtonText,
                  lowStockCurrentPage === 1 ? styles.lowStockPageButtonTextDisabled : null,
                ]}
              >
                Anterior
              </Text>
            </Pressable>

            <Text style={styles.lowStockPageIndicator}>
              Página {lowStockCurrentPage} de {lowStockTotalPages}
            </Text>

            <Pressable
              style={[
                styles.lowStockPageButton,
                lowStockCurrentPage === lowStockTotalPages ? styles.lowStockPageButtonDisabled : null,
              ]}
              onPress={goToNextLowStockPage}
              disabled={lowStockCurrentPage === lowStockTotalPages}
            >
              <Text
                style={[
                  styles.lowStockPageButtonText,
                  lowStockCurrentPage === lowStockTotalPages
                    ? styles.lowStockPageButtonTextDisabled
                    : null,
                ]}
              >
                Próxima
              </Text>
              <Feather
                name="chevron-right"
                size={16}
                color={lowStockCurrentPage === lowStockTotalPages ? '#C8CEDD' : '#3A415C'}
              />
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.directorUpdatedAt}>Período: {stockPeriodLabel}</Text>
      </ScrollView>

      <StationMultiSelectModal
        visible={isStationPickerOpen}
        allLabel={stockStationOptions[0]}
        options={stockStationOptions.slice(1)}
        selectedStations={selectedStations}
        onToggleStation={handleToggleStation}
        onSelectAll={handleSelectAllStations}
        onClose={() => setIsStationPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function GnvMetricsScreen({ navigation }: ScreenProps<'GnvMetrics'>) {
  const postos = useDiretoriaPostos();
  const stationOptions = useMemo(() => ['Todos os Postos', ...postos.map((p) => p.nome)], [postos]);
  const [selectedStation, setSelectedStation] = useState('Todos os Postos');
  const [isStationPickerOpen, setIsStationPickerOpen] = useState(false);
  const selectedPostoId = useMemo(
    () => postos.find((p) => p.nome === selectedStation)?.id,
    [postos, selectedStation]
  );

  const [gnvViewMode, setGnvViewMode] = useState<'mes' | 'ano'>('mes');
  const [gnvAnchorDate, setGnvAnchorDate] = useState(() => new Date());

  const handleGnvPrevPeriod = () => {
    setGnvAnchorDate((current) =>
      gnvViewMode === 'mes'
        ? new Date(current.getFullYear(), current.getMonth() - 1, 1)
        : new Date(current.getFullYear() - 1, current.getMonth(), 1)
    );
  };
  const handleGnvNextPeriod = () => {
    setGnvAnchorDate((current) =>
      gnvViewMode === 'mes'
        ? new Date(current.getFullYear(), current.getMonth() + 1, 1)
        : new Date(current.getFullYear() + 1, current.getMonth(), 1)
    );
  };
  const handleGnvResetPeriod = () => setGnvAnchorDate(new Date());

  const gnvPeriodLabel =
    gnvViewMode === 'mes'
      ? `${MARGIN_MONTH_NAMES[gnvAnchorDate.getMonth()]} / ${gnvAnchorDate.getFullYear()}`
      : `${gnvAnchorDate.getFullYear()}`;

  const filtros = useMemo(() => {
    const de =
      gnvViewMode === 'mes'
        ? new Date(gnvAnchorDate.getFullYear(), gnvAnchorDate.getMonth(), 1)
        : new Date(gnvAnchorDate.getFullYear(), 0, 1);
    const ate =
      gnvViewMode === 'mes'
        ? new Date(gnvAnchorDate.getFullYear(), gnvAnchorDate.getMonth() + 1, 0)
        : new Date(gnvAnchorDate.getFullYear(), 11, 31);
    return { de: toApiDateOnly(de), ate: toApiDateOnly(ate), posto: selectedPostoId };
  }, [gnvViewMode, gnvAnchorDate, selectedPostoId]);
  const { dados: gnv, isLoading, errorMessage, refresh: refreshGnv } = useDiretoriaPainelRecurso('gnv', filtros);

  const handleOpenApelidos = () => {
    Alert.alert(
      'Apelidos dos postos',
      'A edição de apelidos de postos ainda não está disponível no app — em breve.'
    );
  };

  // Confirmado pela Lovable em 05/08/2026 — shape real do recurso=gnv:
  // dados.resumo.{total_faturado_gnv,faturamento_desconto_gnv,faturamento_pdv,
  // pct_desconto_gnv,volume_total_m3,economia_icms,margem_pct} e dados.postos
  // é a lista COMPLETA (os 44), já ordenada por pct_desconto_gnv desc, com
  // {posto_id,posto_nome,volume_desconto_gnv,volume_fiscal,volume_total,
  // faturamento_desconto_gnv,faturamento_pdv,faturamento_total,pct_desconto_gnv}.
  const resumo = gnv?.resumo ?? gnv ?? null;
  const gnvPostosTodos = pickArr(gnv, ['postos']);

  // Confirmado pela Lovable em 05/08/2026: cada posto já vem com faixa_status
  // ("ideal"|"atencao"|"risco") pré-calculado, respeitando faixa_tipo
  // (padrao/alternativo/customizado) e overrides por posto — não precisamos
  // mais aplicar o threshold 35-45% no cliente.
  const postosRisco = gnvPostosTodos.filter((station: any) => pickStr(station, ['faixa_status']) === 'risco');
  const postosAtencao = gnvPostosTodos.filter((station: any) => pickStr(station, ['faixa_status']) === 'atencao');
  const postosIdeal = gnvPostosTodos.filter((station: any) => pickStr(station, ['faixa_status']) === 'ideal');
  const podeClassificarFaixa = postosRisco.length + postosAtencao.length + postosIdeal.length > 0;

  const totalFaturado = pickNum(resumo, ['total_faturado_gnv']);
  const faturamentoDesconto = pickNum(resumo, ['faturamento_desconto_gnv']);
  const percentualDesconto = pickNum(resumo, ['pct_desconto_gnv']);
  const volumeM3 = pickNum(resumo, ['volume_total_m3']);
  const economiaIcms = pickNum(resumo, ['economia_icms']);
  // "X posto(s) fora de 35-45%" no painel web é uma contagem literal (faixa
  // padrão fixa), diferente da classificação Risco/Atenção/Ideal (que
  // respeita a faixa alternativa de cada posto) — por isso é calculada aqui
  // direto sobre pct_desconto_gnv, sem depender de faixa_status.
  const postosForaDaFaixaPadrao = gnvPostosTodos.filter((station: any) => {
    const pct = pickNum(station, ['pct_desconto_gnv']);
    return pct !== null && (pct < 35 || pct > 45);
  }).length;
  const economiaIcmsPct =
    economiaIcms !== null && faturamentoDesconto ? (economiaIcms / faturamentoDesconto) * 100 : null;

  // dados.evolucao[] — chart diário do painel web ("Evolução Diária — %
  // Desconto GNV"). Nomes de campo ainda não confirmados pela Lovable;
  // tentando os candidatos mais óbvios e caindo em vazio (sem inventar
  // pontos) se nada bater.
  const evolucaoDiaria = pickArr(gnv, ['evolucao']);
  const evolucaoPontos = evolucaoDiaria
    .map((ponto: any) => {
      const dataStr = pickStr(ponto, ['data', 'dia', 'date']);
      const pct = pickNum(ponto, ['pct_desconto_gnv', 'percentual', 'pct', 'valor']);
      return dataStr && pct !== null ? { data: dataStr, pct } : null;
    })
    .filter((item): item is { data: string; pct: number } => item !== null);

  const periodoLabel = gnvPeriodLabel;

  const renderPostoRow = (station: any, index: number) => {
    const volume = pickNum(station, ['volume_total']);
    const faturamento = pickNum(station, ['faturamento_total']);
    const percentual = pickNum(station, ['pct_desconto_gnv']);
    const faixaMin = pickNum(station, ['faixa_min']);
    const faixaMax = pickNum(station, ['faixa_max']);

    return (
      <View key={pickStr(station, ['posto_id']) ?? index} style={styles.gnvRiskRow}>
        <View style={styles.gnvRiskTextBlock}>
          <Text style={styles.gnvRiskName}>{pickStr(station, ['posto_nome']) ?? '—'}</Text>
          <Text style={styles.gnvRiskMeta}>
            {fmtNumOrDash(volume, ' m³')} · {fmtBRLOrDash(faturamento)}
            {faixaMin !== null && faixaMax !== null ? ` · meta ${faixaMin}-${faixaMax}%` : ''}
          </Text>
        </View>
        <Text style={styles.gnvRiskPercent}>{fmtPercentOrDash(percentual)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={directorUserInitials}
          variant="diretoria"
          onAvatarPress={() => navigation.navigate('DirectorProfile')}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshGnv} tintColor="#E6213D" />
        }
      >
        <View style={styles.pageHeader}>
          <View style={styles.directorPageTitleRow}>
            <View style={[styles.iconShell, styles.iconAccentRed]}>
              <Feather name="zap" size={18} color="#E6213D" />
            </View>
            <Text style={styles.pageTitle}>Métricas GNV</Text>
          </View>
          <Text style={styles.pageSubtitle}>Indicadores operacionais e comerciais do GNV.</Text>
        </View>

        <View style={[styles.directorFilterRow, { marginBottom: 8 }]}>
          <View style={[styles.lowStockTabsRow, { flex: 0, marginTop: 0, width: 108 }]}>
            {(['mes', 'ano'] as const).map((mode) => (
              <Pressable
                key={mode}
                style={[styles.lowStockTab, gnvViewMode === mode ? styles.lowStockTabActive : null]}
                onPress={() => setGnvViewMode(mode)}
              >
                <Text style={[styles.lowStockTabText, gnvViewMode === mode ? styles.lowStockTabTextActive : null]}>
                  {mode === 'mes' ? 'Mês' : 'Ano'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.directorFilterPill, { flex: 1, justifyContent: 'space-between' }]}>
            <Pressable onPress={handleGnvPrevPeriod}>
              <Feather name="chevron-left" size={16} color="#5E667D" />
            </Pressable>
            <Pressable onPress={handleGnvResetPeriod} style={styles.marginPeriodLabelWrap}>
              <Text style={styles.directorFilterPillText} numberOfLines={1}>
                {gnvPeriodLabel}
              </Text>
            </Pressable>
            <Pressable onPress={handleGnvNextPeriod}>
              <Feather name="chevron-right" size={16} color="#5E667D" />
            </Pressable>
          </View>
        </View>

        <View style={styles.directorFilterRow}>
          <Pressable
            style={[styles.directorFilterPill, { flex: 1, justifyContent: 'space-between' }]}
            onPress={() => setIsStationPickerOpen(true)}
          >
            <Text style={styles.directorFilterPillText}>{selectedStation}</Text>
            <Feather name="chevron-down" size={14} color="#5E667D" />
          </Pressable>
          <Pressable style={styles.directorFilterPill} onPress={handleOpenApelidos}>
            <Feather name="tag" size={14} color="#5E667D" />
            <Text style={styles.directorFilterPillText}>Apelidos</Text>
          </Pressable>
        </View>

        {isLoading && !gnv ? (
          <Text style={styles.conversaEmptyText}>Carregando métricas GNV...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : (
          <>
            <View style={styles.stockSummaryGrid}>
              <View style={[styles.stockSummaryCard, { borderLeftWidth: 3, borderLeftColor: '#18955A' }]}>
                <Text style={[styles.gnvStatLabel, { color: '#18955A' }]}>TOTAL FATURADO GNV</Text>
                <Text style={styles.gnvStatValue}>{fmtBRLOrDash(totalFaturado)}</Text>
                <Text style={styles.gnvStatMeta}>Volume: {fmtNumOrDash(volumeM3, ' m³')}</Text>
              </View>
              <View style={[styles.stockSummaryCard, { borderLeftWidth: 3, borderLeftColor: '#3457D5' }]}>
                <Text style={[styles.gnvStatLabel, { color: '#3457D5' }]}>VOLUME TOTAL</Text>
                <Text style={styles.gnvStatValue}>{fmtNumOrDash(volumeM3, ' m³')}</Text>
                <Text style={styles.gnvStatMeta}>Vendido no período</Text>
              </View>
              <View style={[styles.stockSummaryCard, { borderLeftWidth: 3, borderLeftColor: '#B7791F' }]}>
                <Text style={[styles.gnvStatLabel, { color: '#B7791F' }]}>ECONOMIA ICMS</Text>
                <Text style={styles.gnvStatValue}>{fmtBRLOrDash(economiaIcms)}</Text>
                <Text style={styles.gnvStatMeta}>
                  {fmtPercentOrDash(economiaIcmsPct)} × faturamento com desconto
                </Text>
              </View>
              <View style={[styles.stockSummaryCard, { borderLeftWidth: 3, borderLeftColor: '#E6213D' }]}>
                <Text style={[styles.gnvStatLabel, { color: '#E6213D' }]}>% DESCONTO GNV</Text>
                <Text style={[styles.gnvStatValue, { color: '#E6213D' }]}>{fmtPercentOrDash(percentualDesconto)}</Text>
                <Text style={styles.gnvStatMeta}>
                  {postosForaDaFaixaPadrao} posto{postosForaDaFaixaPadrao === 1 ? '' : 's'} fora de 35-45%
                </Text>
              </View>
            </View>

            {evolucaoPontos.length > 1 ? (
              <View style={styles.gnvChartCard}>
                <Text style={styles.gnvChartTitle}>Evolução Diária — % Desconto GNV</Text>
                <Text style={styles.gnvChartSubtitle}>
                  linha do % com referência à meta (35-45%)
                </Text>
                <GnvEvolutionChart pontos={evolucaoPontos} />
              </View>
            ) : null}

            <View style={styles.gnvReportCard}>
              <View style={styles.gnvReportHeaderRow}>
                <Text style={styles.gnvReportTitle}>Relatório GNV</Text>
                <Text style={styles.gnvReportMeta}>{periodoLabel}</Text>
              </View>

              <View style={styles.gnvReportStatsRow}>
                <View style={styles.gnvReportStatBlock}>
                  <View style={styles.gnvReportStatTopRow}>
                    <View style={[styles.gnvReportStatDot, { backgroundColor: '#E6213D' }]} />
                    <Text style={styles.gnvReportStatLabel}>Risco</Text>
                  </View>
                  <Text style={[styles.gnvReportStatValue, { color: '#E6213D' }]}>
                    {podeClassificarFaixa ? postosRisco.length : '—'}
                  </Text>
                </View>
                <View style={styles.gnvReportStatBlock}>
                  <View style={styles.gnvReportStatTopRow}>
                    <View style={[styles.gnvReportStatDot, { backgroundColor: '#B7791F' }]} />
                    <Text style={styles.gnvReportStatLabel}>Atenção</Text>
                  </View>
                  <Text style={[styles.gnvReportStatValue, { color: '#B7791F' }]}>
                    {podeClassificarFaixa ? postosAtencao.length : '—'}
                  </Text>
                </View>
                <View style={styles.gnvReportStatBlock}>
                  <View style={styles.gnvReportStatTopRow}>
                    <View style={[styles.gnvReportStatDot, { backgroundColor: '#18955A' }]} />
                    <Text style={styles.gnvReportStatLabel}>Ideal</Text>
                  </View>
                  <Text style={[styles.gnvReportStatValue, { color: '#18955A' }]}>
                    {podeClassificarFaixa ? postosIdeal.length : '—'}
                  </Text>
                </View>
              </View>
              {!podeClassificarFaixa && gnvPostosTodos.length > 0 ? (
                <Text style={styles.conversaEmptyText}>
                  {gnvPostosTodos.length} posto{gnvPostosTodos.length === 1 ? '' : 's'} com GNV no período, mas ainda
                  não foi possível classificar por faixa de desconto.
                </Text>
              ) : null}
            </View>

            {!podeClassificarFaixa ? (
              <>
                <Text style={styles.directorSectionTitle}>POSTOS COM GNV</Text>
                <Text style={styles.conversaEmptyText}>Sem classificação por faixa de desconto disponível.</Text>
              </>
            ) : (
              <>
                <Text style={styles.directorSectionTitle}>RISCO · {postosRisco.length}</Text>
                {postosRisco.length === 0 ? (
                  <Text style={styles.conversaEmptyText}>Nenhum posto em risco no período.</Text>
                ) : (
                  postosRisco.map(renderPostoRow)
                )}

                <Text style={styles.directorSectionTitle}>ATENÇÃO · {postosAtencao.length}</Text>
                {postosAtencao.length === 0 ? (
                  <Text style={styles.conversaEmptyText}>Nenhum posto em atenção no período.</Text>
                ) : (
                  postosAtencao.map(renderPostoRow)
                )}

                <Text style={styles.directorSectionTitle}>IDEAL · {postosIdeal.length}</Text>
                {postosIdeal.length === 0 ? (
                  <Text style={styles.conversaEmptyText}>Nenhum posto na faixa ideal no período.</Text>
                ) : (
                  postosIdeal.map(renderPostoRow)
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <SimpleListModal
        visible={isStationPickerOpen}
        title="Selecionar posto"
        options={stationOptions}
        selectedValue={selectedStation}
        onSelect={setSelectedStation}
        onClose={() => setIsStationPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

// Line chart simples (sem libs de gráfico) pra "Evolução Diária — % Desconto
// GNV": eixo X = dias do período, eixo Y = 0-60% com linhas de referência em
// 35% e 45% (faixa padrão). Usa react-native-svg, já presente no projeto.
function GnvEvolutionChart({ pontos }: { pontos: { data: string; pct: number }[] }) {
  const [containerWidth, setContainerWidth] = useState(320);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const width = containerWidth;
  const height = 160;
  const paddingLeft = 34;
  const paddingBottom = 20;
  const paddingTop = 10;
  const chartWidth = width - paddingLeft - 8;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxY = 60;

  const xFor = (index: number) =>
    paddingLeft + (pontos.length <= 1 ? 0 : (index / (pontos.length - 1)) * chartWidth);
  const yFor = (pct: number) => paddingTop + chartHeight - (Math.min(pct, maxY) / maxY) * chartHeight;

  const linePath = pontos
    .map((ponto, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(ponto.pct)}`)
    .join(' ');

  const dayLabel = (iso: string) => {
    const parts = iso.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso;
  };

  const selected = selectedIndex !== null ? pontos[selectedIndex] : null;
  const tooltipWidth = 168;
  const tooltipLeft =
    selected !== null
      ? Math.min(Math.max(xFor(selectedIndex!) - tooltipWidth / 2, 0), Math.max(width - tooltipWidth, 0))
      : 0;

  return (
    <View
      style={{ width: '100%' }}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 15, 30, 45, 60].map((tick) => (
          <Line
            key={tick}
            x1={paddingLeft}
            x2={width - 8}
            y1={yFor(tick)}
            y2={yFor(tick)}
            stroke={tick === 35 || tick === 45 ? '#E6213D' : '#E2E6F0'}
            strokeDasharray={tick === 35 || tick === 45 ? '4,4' : undefined}
            strokeWidth={1}
          />
        ))}
        {[0, 15, 30, 45, 60].map((tick) => (
          <SvgText key={`label-${tick}`} x={4} y={yFor(tick) + 4} fontSize={9} fill="#8992A8">
            {tick}%
          </SvgText>
        ))}
        <Path d={linePath} stroke="#3457D5" strokeWidth={2} fill="none" />
        {selected !== null ? (
          <Line
            x1={xFor(selectedIndex!)}
            x2={xFor(selectedIndex!)}
            y1={paddingTop}
            y2={height - paddingBottom}
            stroke="#3457D5"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        ) : null}
        {pontos.map((ponto, index) => (
          <Circle
            key={ponto.data}
            cx={xFor(index)}
            cy={yFor(ponto.pct)}
            r={selectedIndex === index ? 5 : 3}
            fill={selectedIndex === index ? '#15203E' : '#3457D5'}
          />
        ))}
        {pontos
          .filter((_, index) => index === 0 || index === pontos.length - 1 || index % Math.ceil(pontos.length / 6) === 0)
          .map((ponto) => (
            <SvgText
              key={`x-${ponto.data}`}
              x={xFor(pontos.indexOf(ponto))}
              y={height - 4}
              fontSize={9}
              fill="#8992A8"
              textAnchor="middle"
            >
              {dayLabel(ponto.data)}
            </SvgText>
          ))}
      </Svg>

      {pontos.map((ponto, index) => (
        <Pressable
          key={`hit-${ponto.data}`}
          hitSlop={4}
          style={{
            position: 'absolute',
            left: xFor(index) - 12,
            top: yFor(ponto.pct) - 12,
            width: 24,
            height: 24,
          }}
          onPress={() => setSelectedIndex((current) => (current === index ? null : index))}
        />
      ))}

      {selected !== null ? (
        <View
          pointerEvents="none"
          style={[
            styles.gnvChartTooltip,
            { left: tooltipLeft, top: Math.max(yFor(selected.pct) - 54, 0), width: tooltipWidth },
          ]}
        >
          <Text style={styles.gnvChartTooltipTitle}>Dia {dayLabel(selected.data)}</Text>
          <Text style={styles.gnvChartTooltipValue}>
            % Desconto GNV: <Text style={styles.gnvChartTooltipValueNumber}>{fmtPercentOrDash(selected.pct)}</Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type ProcessFormValues = {
  title: string;
  description: string;
  department: string;
  linkedModule: string;
  owner: string;
  status: ProcessMapItem['status'];
  version: string;
  tags: string[];
  steps: ProcessStepItem[];
  documentation: string;
  flow: ProcessFlowNode[];
};

const emptyProcessForm: ProcessFormValues = {
  title: '',
  description: '',
  department: processDepartmentOptions[0],
  linkedModule: processModuleOptions[0],
  owner: '',
  status: 'rascunho',
  version: '1',
  tags: [],
  steps: [],
  documentation: '',
  flow: [],
};

function ProcessFormModal({
  visible,
  initialProcess,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialProcess: ProcessMapItem | null;
  onClose: () => void;
  onSave: (process: ProcessMapItem) => void | Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<'geral' | 'etapas' | 'documentacao' | 'fluxograma'>('geral');
  const [form, setForm] = useState<ProcessFormValues>(emptyProcessForm);
  const [newTagText, setNewTagText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDepartmentPickerOpen, setIsDepartmentPickerOpen] = useState(false);
  const [isModulePickerOpen, setIsModulePickerOpen] = useState(false);
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (initialProcess) {
      setForm({
        title: initialProcess.title,
        description: initialProcess.description,
        department: initialProcess.department,
        linkedModule: initialProcess.linkedModule,
        owner: initialProcess.owner,
        status: initialProcess.status,
        version: initialProcess.version,
        tags: initialProcess.tags,
        steps: initialProcess.steps,
        documentation: initialProcess.documentation,
        flow: initialProcess.flow,
      });
    } else {
      setForm(emptyProcessForm);
    }

    setActiveTab('geral');
    setNewTagText('');
  }, [visible, initialProcess]);

  const statusLabel =
    processStatusOptions.find((option) => option.value === form.status)?.label ?? 'Rascunho';

  const handleAddTag = () => {
    const trimmed = newTagText.trim();

    if (!trimmed || form.tags.includes(trimmed)) {
      setNewTagText('');
      return;
    }

    setForm((current) => ({ ...current, tags: [...current.tags, trimmed] }));
    setNewTagText('');
  };

  const handleRemoveTag = (tag: string) => {
    setForm((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }));
  };

  const handleAddStep = () => {
    setForm((current) => ({
      ...current,
      steps: [
        ...current.steps,
        {
          id: `step-${Date.now()}`,
          title: '',
          description: '',
          owner: '',
          deadlineDays: '',
        },
      ],
    }));
  };

  const handleRemoveStep = (id: string) => {
    setForm((current) => ({ ...current, steps: current.steps.filter((step) => step.id !== id) }));
  };

  const handleUpdateStep = (id: string, patch: Partial<ProcessStepItem>) => {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    }));
  };

  const handleMoveStep = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= current.steps.length) {
        return current;
      }

      const steps = [...current.steps];
      const [moved] = steps.splice(index, 1);
      steps.splice(nextIndex, 0, moved);

      return { ...current, steps };
    });
  };

  const handleAddFlowNode = (type: ProcessFlowNodeType) => {
    setForm((current) => ({
      ...current,
      flow: [
        ...current.flow,
        { id: `flow-${Date.now()}`, type, label: processFlowNodeTypeMeta[type].label },
      ],
    }));
  };

  const handleRemoveFlowNode = (id: string) => {
    setForm((current) => ({ ...current, flow: current.flow.filter((node) => node.id !== id) }));
  };

  const handleRenameFlowNode = (id: string, label: string) => {
    setForm((current) => ({
      ...current,
      flow: current.flow.map((node) => (node.id === id ? { ...node, label } : node)),
    }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      Alert.alert('Nome obrigatório', 'Informe o nome do processo antes de salvar.');
      setActiveTab('geral');
      return;
    }

    const statusMeta = processStatusOptions.find((option) => option.value === form.status);

    const process: ProcessMapItem = {
      id: initialProcess?.id ?? `process-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      statusLabel: statusMeta?.label ?? 'Rascunho',
      department: form.department,
      linkedModule: form.linkedModule,
      owner: form.owner,
      version: form.version.trim() || '1',
      tags: form.tags,
      updatedAtLabel: formatDateBR(new Date()),
      steps: form.steps,
      documentation: form.documentation,
      flow: form.flow,
    };

    setIsSubmitting(true);
    try {
      await onSave(process);
    } finally {
      setIsSubmitting(false);
    }
    return;

    onSave(process);
  };

  const tabs: Array<{ id: typeof activeTab; label: string; icon: keyof typeof Feather.glyphMap }> = [
    { id: 'geral', label: 'Geral', icon: 'settings' },
    { id: 'etapas', label: `Etapas (${form.steps.length})`, icon: 'list' },
    { id: 'documentacao', label: 'Documentação', icon: 'file-text' },
    { id: 'fluxograma', label: 'Fluxograma', icon: 'git-branch' },
  ];

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>
                {initialProcess ? 'Editar processo' : 'Novo processo'}
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <View style={styles.processTabsRow}>
              {tabs.map((tab) => {
                const isActive = tab.id === activeTab;

                return (
                  <Pressable
                    key={tab.id}
                    style={[styles.processTab, isActive ? styles.processTabActive : null]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Feather name={tab.icon} size={13} color={isActive ? '#E6213D' : '#5E667D'} />
                    <Text
                      style={[styles.processTabText, isActive ? styles.processTabTextActive : null]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {activeTab === 'geral' ? (
                <View>
                  <Text style={styles.requestFieldLabel}>Nome *</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={form.title}
                    onChangeText={(text) => setForm((current) => ({ ...current, title: text }))}
                    placeholder="Ex: Admissão de colaborador"
                    placeholderTextColor="#A7AEC2"
                  />

                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Descrição</Text>
                  <TextInput
                    style={[styles.processTextInput, styles.processTextArea]}
                    value={form.description}
                    onChangeText={(text) => setForm((current) => ({ ...current, description: text }))}
                    placeholder="O que esse processo faz, quando se aplica, objetivo..."
                    placeholderTextColor="#A7AEC2"
                    multiline
                    textAlignVertical="top"
                  />

                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Área / Departamento</Text>
                  <Pressable style={styles.requestSelectBox} onPress={() => setIsDepartmentPickerOpen(true)}>
                    <Text style={styles.requestSelectText}>{form.department}</Text>
                    <Feather name="chevron-down" size={18} color="#7A8299" />
                  </Pressable>

                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Módulo vinculado</Text>
                  <Pressable style={styles.requestSelectBox} onPress={() => setIsModulePickerOpen(true)}>
                    <Text style={styles.requestSelectText}>{form.linkedModule}</Text>
                    <Feather name="chevron-down" size={18} color="#7A8299" />
                  </Pressable>

                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Responsável</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={form.owner}
                    onChangeText={(text) => setForm((current) => ({ ...current, owner: text }))}
                    placeholder="Nome do responsável"
                    placeholderTextColor="#A7AEC2"
                  />

                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Status</Text>
                  <Pressable style={styles.requestSelectBox} onPress={() => setIsStatusPickerOpen(true)}>
                    <Text style={styles.requestSelectText}>{statusLabel}</Text>
                    <Feather name="chevron-down" size={18} color="#7A8299" />
                  </Pressable>

                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Versão</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={form.version}
                    onChangeText={(text) => setForm((current) => ({ ...current, version: text }))}
                    placeholder="1"
                    placeholderTextColor="#A7AEC2"
                  />

                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Tags</Text>
                  <View style={styles.processTagInputRow}>
                    <TextInput
                      style={[styles.processTextInput, styles.processTagInput]}
                      value={newTagText}
                      onChangeText={setNewTagText}
                      placeholder="Digite uma tag e Enter..."
                      placeholderTextColor="#A7AEC2"
                      onSubmitEditing={handleAddTag}
                    />
                    <Pressable style={styles.processTagAddButton} onPress={handleAddTag}>
                      <Text style={styles.processTagAddButtonText}>Adicionar</Text>
                    </Pressable>
                  </View>

                  {form.tags.length > 0 ? (
                    <View style={styles.processTagsWrapRow}>
                      {form.tags.map((tag) => (
                        <View key={tag} style={styles.processTagChip}>
                          <Text style={styles.processTagChipText}>{tag}</Text>
                          <Pressable onPress={() => handleRemoveTag(tag)} hitSlop={6}>
                            <Feather name="x" size={12} color="#5E667D" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {activeTab === 'etapas' ? (
                <View>
                  <Pressable style={styles.processAddStepButton} onPress={handleAddStep}>
                    <Feather name="plus" size={14} color="#3A415C" />
                    <Text style={styles.processAddStepButtonText}>Adicionar etapa</Text>
                  </Pressable>

                  {form.steps.length === 0 ? (
                    <Text style={styles.processEmptyText}>Nenhuma etapa cadastrada.</Text>
                  ) : (
                    form.steps.map((step, index) => (
                      <View key={step.id} style={styles.processStepCard}>
                        <View style={styles.processStepCardTopRow}>
                          <MaterialCommunityIcons name="drag-vertical" size={18} color="#C4CADA" />
                          <Text style={styles.processStepNumberText}>#{index + 1}</Text>
                          <TextInput
                            style={[styles.processTextInput, styles.processStepTitleInput]}
                            value={step.title}
                            onChangeText={(text) => handleUpdateStep(step.id, { title: text })}
                            placeholder="Título da etapa"
                            placeholderTextColor="#A7AEC2"
                          />
                          <Pressable
                            onPress={() => handleMoveStep(index, -1)}
                            disabled={index === 0}
                            hitSlop={6}
                          >
                            <Feather
                              name="arrow-up"
                              size={16}
                              color={index === 0 ? '#D8DCE6' : '#5E667D'}
                            />
                          </Pressable>
                          <Pressable
                            onPress={() => handleMoveStep(index, 1)}
                            disabled={index === form.steps.length - 1}
                            hitSlop={6}
                          >
                            <Feather
                              name="arrow-down"
                              size={16}
                              color={index === form.steps.length - 1 ? '#D8DCE6' : '#5E667D'}
                            />
                          </Pressable>
                          <Pressable onPress={() => handleRemoveStep(step.id)} hitSlop={6}>
                            <Feather name="trash-2" size={16} color="#E6213D" />
                          </Pressable>
                        </View>

                        <TextInput
                          style={[styles.processTextInput, styles.processStepDescriptionInput]}
                          value={step.description}
                          onChangeText={(text) => handleUpdateStep(step.id, { description: text })}
                          placeholder="O que acontece nesta etapa?"
                          placeholderTextColor="#A7AEC2"
                          multiline
                          textAlignVertical="top"
                        />

                        <View style={styles.processStepCardBottomRow}>
                          <TextInput
                            style={[styles.processTextInput, styles.processStepOwnerBox]}
                            value={step.owner}
                            onChangeText={(text) => handleUpdateStep(step.id, { owner: text })}
                            placeholder="Responsável"
                            placeholderTextColor="#A7AEC2"
                          />
                          <TextInput
                            style={[styles.processTextInput, styles.processStepDeadlineInput]}
                            value={step.deadlineDays}
                            onChangeText={(text) =>
                              handleUpdateStep(step.id, { deadlineDays: text.replace(/[^0-9]/g, '') })
                            }
                            placeholder="Prazo (dias)"
                            placeholderTextColor="#A7AEC2"
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>
                    ))
                  )}
                </View>
              ) : null}

              {activeTab === 'documentacao' ? (
                <View>
                  <Text style={styles.requestFieldLabel}>Documentação (POP / SOP — aceita markdown)</Text>
                  <TextInput
                    style={[styles.processTextInput, styles.processDocumentationArea]}
                    value={form.documentation}
                    onChangeText={(text) => setForm((current) => ({ ...current, documentation: text }))}
                    placeholder={
                      '# Procedimento Operacional Padrão\n\n## Objetivo\n...\n\n## Pré-requisitos\n...\n\n## Passo a passo\n1. ...\n2. ...\n\n## Observações\n...'
                    }
                    placeholderTextColor="#A7AEC2"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              ) : null}

              {activeTab === 'fluxograma' ? (
                <View>
                  <Text style={styles.requestFieldLabel}>Adicionar bloco</Text>
                  <View style={styles.processFlowAddGrid}>
                    {(Object.keys(processFlowNodeTypeMeta) as ProcessFlowNodeType[]).map((type) => {
                      const meta = processFlowNodeTypeMeta[type];

                      return (
                        <Pressable
                          key={type}
                          style={[styles.processFlowAddButton, { backgroundColor: meta.color }]}
                          onPress={() => handleAddFlowNode(type)}
                        >
                          <Feather name="plus" size={14} color="#FFFFFF" />
                          <Text style={styles.processFlowAddButtonText}>{meta.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {form.flow.length === 0 ? (
                    <Text style={styles.processEmptyText}>Nenhum bloco adicionado.</Text>
                  ) : (
                    <View style={styles.processFlowList}>
                      {form.flow.map((node, index) => {
                        const meta = processFlowNodeTypeMeta[node.type];

                        return (
                          <View key={node.id}>
                            <View
                              style={[
                                styles.processFlowNodeRow,
                                { borderLeftColor: meta.color, backgroundColor: meta.tint },
                              ]}
                            >
                              <View style={styles.processFlowNodeTextBlock}>
                                <Text style={[styles.processFlowNodeType, { color: meta.color }]}>
                                  {meta.label}
                                </Text>
                                <TextInput
                                  style={styles.processFlowNodeLabelInput}
                                  value={node.label}
                                  onChangeText={(text) => handleRenameFlowNode(node.id, text)}
                                />
                              </View>
                              <Pressable onPress={() => handleRemoveFlowNode(node.id)} hitSlop={8}>
                                <Feather name="x" size={16} color="#9AA1B5" />
                              </Pressable>
                            </View>
                            {index < form.flow.length - 1 ? (
                              <View style={styles.processFlowConnector}>
                                <Feather name="arrow-down" size={14} color="#B9C0D3" />
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : null}

              <View style={styles.processFooterActionsRow}>
                <Pressable style={styles.unrecognizedActionButton} onPress={onClose} disabled={isSubmitting}>
                  <Text style={styles.unrecognizedActionButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.unrecognizedActionButton,
                    styles.processSubmitButton,
                    isSubmitting ? { opacity: 0.6 } : null,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.unrecognizedActionButtonText, styles.processSubmitButtonText]}>
                    {isSubmitting ? 'Salvando...' : initialProcess ? 'Salvar alterações' : 'Criar processo'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <SimpleListModal
        visible={isDepartmentPickerOpen}
        title="Área / Departamento"
        options={processDepartmentOptions}
        selectedValue={form.department}
        onSelect={(value) => setForm((current) => ({ ...current, department: value }))}
        onClose={() => setIsDepartmentPickerOpen(false)}
      />
      <SimpleListModal
        visible={isModulePickerOpen}
        title="Módulo vinculado"
        options={processModuleOptions}
        selectedValue={form.linkedModule}
        onSelect={(value) => setForm((current) => ({ ...current, linkedModule: value }))}
        onClose={() => setIsModulePickerOpen(false)}
      />
      <SimpleListModal
        visible={isStatusPickerOpen}
        title="Status"
        options={processStatusOptions.map((option) => option.label)}
        selectedValue={statusLabel}
        onSelect={(label) => {
          const match = processStatusOptions.find((option) => option.label === label);

          if (match) {
            setForm((current) => ({ ...current, status: match.value }));
          }
        }}
        onClose={() => setIsStatusPickerOpen(false)}
      />
    </>
  );
}

const PROCESS_ALL_AREAS_LABEL = 'Todas as áreas';
const PROCESS_ALL_STATUS_LABEL = 'Todos os status';
const PROCESS_ALL_OWNERS_LABEL = 'Todos os responsáveis';

const PROCESS_STATUS_LABELS: Record<DiretoriaProcessoRow['status'], string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  em_revisao: 'Em revisão',
  descontinuado: 'Descontinuado',
};

const PROCESS_STATUS_TONES: Record<DiretoriaProcessoRow['status'], { tint: string; text: string }> = {
  rascunho: { tint: '#F1F2F7', text: '#5E667D' },
  ativo: { tint: '#E2F4EA', text: '#18955A' },
  em_revisao: { tint: '#FCF4DE', text: '#B7791F' },
  descontinuado: { tint: '#FCE8EC', text: '#E6213D' },
};

// Diretoria só lê o Mapa de Processos pelo app — criar/editar continua sendo
// feito pelo site (RLS de escrita é só master), confirmado pela Lovable em
// 04/08/2026.
function ProcessDetailModal({
  visible,
  processoId,
  onClose,
}: {
  visible: boolean;
  processoId: string | null;
  onClose: () => void;
}) {
  const { identity } = useContext(AuthIdentityContext);
  const [processo, setProcesso] = useState<DiretoriaProcessoRow | null>(null);
  const [etapas, setEtapas] = useState<DiretoriaProcessoEtapaRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !processoId) {
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchDiretoriaProcessoDetalhe(processoId, identity?.profileId)
      .then((data) => {
        if (!isActive) return;
        setProcesso(data.processo);
        setEtapas(data.etapas);
      })
      .catch((err) => {
        if (isActive) {
          setProcesso(null);
          setEtapas([]);
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar o processo.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [visible, processoId, identity?.profileId]);

  const tone = processo ? PROCESS_STATUS_TONES[processo.status] : null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle} numberOfLines={1}>
              {processo?.nome ?? 'Processo'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <Text style={styles.conversaEmptyText}>Carregando processo...</Text>
            ) : errorMessage ? (
              <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
            ) : !processo ? (
              <Text style={styles.conversaEmptyText}>Processo não encontrado.</Text>
            ) : (
              <>
                {tone ? (
                  <View
                    style={[
                      styles.processStatusPill,
                      { backgroundColor: tone.tint, alignSelf: 'flex-start', marginBottom: 12 },
                    ]}
                  >
                    <Text style={[styles.processStatusPillText, { color: tone.text }]}>
                      {PROCESS_STATUS_LABELS[processo.status]}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.processDescription}>{processo.descricao || 'Sem descrição.'}</Text>

                <View style={styles.processFooterRow}>
                  <View style={styles.processFooterLeft}>
                    <Feather name="folder" size={13} color="#3457D5" />
                    <Text style={styles.processDepartment}>
                      {processo.departamento ?? processo.area ?? '—'}
                    </Text>
                    <Text style={styles.processOwner}>{processo.responsavel_nome ?? '—'}</Text>
                  </View>
                  <Text style={styles.processUpdatedAt}>v{processo.versao ?? '1'}</Text>
                </View>

                {processo.documentacao ? (
                  <>
                    <Text style={[styles.directorSectionTitle, styles.spacingTop]}>DOCUMENTAÇÃO</Text>
                    <Text style={styles.processDescription}>{processo.documentacao}</Text>
                  </>
                ) : null}

                <Text style={[styles.directorSectionTitle, styles.spacingTop]}>ETAPAS · {etapas.length}</Text>
                {etapas.length === 0 ? (
                  <Text style={styles.conversaEmptyText}>Nenhuma etapa cadastrada.</Text>
                ) : (
                  etapas.map((etapa, index) => (
                    <View key={etapa.id} style={styles.processCard}>
                      <View style={styles.processTopRow}>
                        <Text style={styles.processTitle}>
                          {etapa.ordem ?? index + 1}. {etapa.titulo}
                        </Text>
                      </View>
                      {etapa.descricao ? <Text style={styles.processDescription}>{etapa.descricao}</Text> : null}
                      <View style={styles.processFooterRow}>
                        <Text style={styles.processOwner}>{etapa.responsavel_nome ?? 'Sem responsável'}</Text>
                        <Text style={styles.processUpdatedAt}>
                          {etapa.prazo_dias !== null && etapa.prazo_dias !== undefined
                            ? `Prazo: ${etapa.prazo_dias} dia${etapa.prazo_dias === 1 ? '' : 's'}`
                            : ''}
                        </Text>
                      </View>
                    </View>
                  ))
                )}

                <Text style={[styles.conversaEmptyText, styles.spacingTop]}>
                  Para criar ou editar processos, use o painel da Diretoria no site.
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ProcessMapScreen({ navigation }: ScreenProps<'ProcessMap'>) {
  const { identity } = useContext(AuthIdentityContext);
  const [processosRaw, setProcessosRaw] = useState<DiretoriaProcessoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState(PROCESS_ALL_AREAS_LABEL);
  const [statusFilter, setStatusFilter] = useState(PROCESS_ALL_STATUS_LABEL);
  const [ownerFilter, setOwnerFilter] = useState(PROCESS_ALL_OWNERS_LABEL);
  const [isAreaFilterOpen, setIsAreaFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isOwnerFilterOpen, setIsOwnerFilterOpen] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadProcessos = useCallback(() => {
    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchDiretoriaProcessos({}, identity?.profileId)
      .then((data) => {
        if (isActive) setProcessosRaw(data.processos);
      })
      .catch((err) => {
        if (isActive) {
          setProcessosRaw([]);
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os processos.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [identity?.profileId]);

  const handleSaveNewProcess = async (process: ProcessMapItem) => {
    const body: DiretoriaProcessoWriteBody = {
      nome: process.title,
      descricao: process.description || undefined,
      departamento: process.department === processDepartmentOptions[0] ? undefined : process.department,
      modulo_vinculado: process.linkedModule === processModuleOptions[0] ? undefined : process.linkedModule,
      // responsavel_id precisa ser o uuid de um profile (FK), mas o app hoje só
      // coleta o nome do responsável em texto livre — por isso não é enviado
      // ainda. O texto digitado no campo "Responsável" não é salvo no backend
      // até existir um seletor de perfis reais no app.
      status: process.status,
      versao: Number(process.version) || 1,
      tags: process.tags,
      documentacao: process.documentation || undefined,
      etapas: process.steps
        .filter((step) => step.title.trim().length > 0)
        .map((step, index) => ({
          ordem: index + 1,
          titulo: step.title.trim(),
          descricao: step.description || undefined,
          responsavel_id: null,
          prazo_dias: step.deadlineDays ? Number(step.deadlineDays) || null : null,
        })),
      blocos: process.flow.map((node) => ({ tipo: node.type, rotulo: node.label })),
    };

    try {
      await createDiretoriaProcesso(body, identity?.profileId);
      setIsCreateModalOpen(false);
      loadProcessos();
      Alert.alert(
        'Processo criado',
        'O processo foi salvo. O responsável digitado ainda não é persistido — assim que houver um seletor de perfis reais, isso será ligado.'
      );
    } catch (err) {
      Alert.alert(
        'Não foi possível criar o processo',
        err instanceof Error ? err.message : 'Tente novamente em instantes.'
      );
    }
  };

  useEffect(() => {
    const cleanup = loadProcessos();
    return cleanup;
  }, [loadProcessos]);

  const processes = useMemo(
    () =>
      processosRaw.map((item) => ({
        id: item.id,
        title: item.nome,
        description: item.descricao ?? '',
        department: item.departamento ?? item.area ?? 'Sem área',
        owner: item.responsavel_nome ?? 'Sem responsável',
        status: item.status,
        statusLabel: PROCESS_STATUS_LABELS[item.status] ?? item.status,
        tags: item.tags ?? [],
        updatedAtLabel: item.updated_at ? formatDateBR(new Date(item.updated_at)) : '—',
      })),
    [processosRaw]
  );

  const areaFilterOptions = [
    PROCESS_ALL_AREAS_LABEL,
    ...Array.from(new Set(processes.map((item) => item.department))),
  ];
  const statusFilterOptions = [
    PROCESS_ALL_STATUS_LABEL,
    ...Array.from(new Set(processes.map((item) => item.statusLabel))),
  ];
  const ownerFilterOptions = [
    PROCESS_ALL_OWNERS_LABEL,
    ...Array.from(new Set(processes.map((item) => item.owner))),
  ];

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProcesses = processes.filter((item) => {
    if (normalizedSearch) {
      const matchesSearch = [item.title, item.description, ...item.tags].some((field) =>
        field.toLowerCase().includes(normalizedSearch)
      );

      if (!matchesSearch) {
        return false;
      }
    }

    if (areaFilter !== PROCESS_ALL_AREAS_LABEL && item.department !== areaFilter) {
      return false;
    }

    if (statusFilter !== PROCESS_ALL_STATUS_LABEL && item.statusLabel !== statusFilter) {
      return false;
    }

    if (ownerFilter !== PROCESS_ALL_OWNERS_LABEL && item.owner !== ownerFilter) {
      return false;
    }

    return true;
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={directorUserInitials}
          variant="diretoria"
          onAvatarPress={() => navigation.navigate('DirectorProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.directorPageHeaderRow}>
          <View style={[styles.directorPageTitleRow, styles.processPageTitleRow]}>
            <View style={[styles.iconShell, styles.iconAccentRed]}>
              <Feather name="git-branch" size={18} color="#E6213D" />
            </View>
            <Text style={styles.pageTitle} numberOfLines={1}>
              Mapa de Processos
            </Text>
          </View>
          <Pressable style={styles.processNewButton} onPress={() => setIsCreateModalOpen(true)}>
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.processNewButtonText}>Novo processo</Text>
          </Pressable>
        </View>
        <Text style={styles.pageSubtitle}>
          Cadastre fluxos, etapas e documentação dos processos da empresa.
        </Text>

        <View style={styles.processSearchRow}>
          <Feather name="search" size={16} color="#99A0BA" />
          <TextInput
            style={styles.processSearchInput}
            placeholder="Buscar por nome, descrição, tag..."
            placeholderTextColor="#99A0BA"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <View style={styles.processFilterWrapRow}>
          <Pressable style={styles.directorFilterPill} onPress={() => setIsAreaFilterOpen(true)}>
            <Text style={styles.directorFilterPillText} numberOfLines={1}>
              {areaFilter}
            </Text>
            <Feather name="chevron-down" size={14} color="#5E667D" />
          </Pressable>
          <Pressable style={styles.directorFilterPill} onPress={() => setIsStatusFilterOpen(true)}>
            <Text style={styles.directorFilterPillText} numberOfLines={1}>
              {statusFilter}
            </Text>
            <Feather name="chevron-down" size={14} color="#5E667D" />
          </Pressable>
          <Pressable style={styles.directorFilterPill} onPress={() => setIsOwnerFilterOpen(true)}>
            <Text style={styles.directorFilterPillText} numberOfLines={1}>
              {ownerFilter}
            </Text>
            <Feather name="chevron-down" size={14} color="#5E667D" />
          </Pressable>
        </View>

        {isLoading && processes.length === 0 ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Carregando processos...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>{errorMessage}</Text>
          </View>
        ) : filteredProcesses.length === 0 ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Nenhum processo cadastrado.</Text>
          </View>
        ) : (
          filteredProcesses.map((item) => {
            const colors = PROCESS_STATUS_TONES[item.status];

            return (
              <Pressable key={item.id} style={styles.processCard} onPress={() => setSelectedProcessId(item.id)}>
                <View style={styles.processTopRow}>
                  <Text style={styles.processTitle}>{item.title}</Text>
                  <View style={[styles.processStatusPill, { backgroundColor: colors.tint }]}>
                    <Text style={[styles.processStatusPillText, { color: colors.text }]}>
                      {item.statusLabel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.processDescription}>{item.description || 'Sem descrição.'}</Text>
                <View style={styles.processFooterRow}>
                  <View style={styles.processFooterLeft}>
                    <Feather name="folder" size={13} color="#3457D5" />
                    <Text style={styles.processDepartment}>{item.department}</Text>
                    <Text style={styles.processOwner}>{item.owner}</Text>
                  </View>
                </View>
                <View style={styles.processFooterRow}>
                  <Text style={styles.processUpdatedAt}>Atualizado em {item.updatedAtLabel}</Text>
                  <Feather name="chevron-right" size={16} color="#B9C0D3" />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <ProcessDetailModal
        visible={selectedProcessId !== null}
        processoId={selectedProcessId}
        onClose={() => setSelectedProcessId(null)}
      />

      <ProcessFormModal
        visible={isCreateModalOpen}
        initialProcess={null}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveNewProcess}
      />

      <SimpleListModal
        visible={isAreaFilterOpen}
        title="Área"
        options={areaFilterOptions}
        selectedValue={areaFilter}
        onSelect={setAreaFilter}
        onClose={() => setIsAreaFilterOpen(false)}
      />
      <SimpleListModal
        visible={isStatusFilterOpen}
        title="Status"
        options={statusFilterOptions}
        selectedValue={statusFilter}
        onSelect={setStatusFilter}
        onClose={() => setIsStatusFilterOpen(false)}
      />
      <SimpleListModal
        visible={isOwnerFilterOpen}
        title="Responsável"
        options={ownerFilterOptions}
        selectedValue={ownerFilter}
        onSelect={setOwnerFilter}
        onClose={() => setIsOwnerFilterOpen(false)}
      />
    </SafeAreaView>
  );
}

type RoutineFormValues = {
  title: string;
  template: string;
  messageTitle: string;
  message: string;
  enabled: boolean;
  triggerKind: NotificationTriggerKind;
  cronSchedule: string;
  eventCode: string;
  channels: NotificationChannels;
  audienceType: NotificationAudienceType;
  audienceCargos: string[];
};

const emptyRoutineForm: RoutineFormValues = {
  title: '',
  template: notificationTemplateOptions[0],
  messageTitle: '',
  message: '',
  enabled: true,
  triggerKind: 'manual',
  cronSchedule: '',
  eventCode: '',
  channels: { app: true, email: false, whatsapp: false },
  audienceType: 'todos',
  audienceCargos: [],
};

export const notificationChannelMeta: Record<
  keyof NotificationChannels,
  { label: string; icon: keyof typeof Feather.glyphMap }
> = {
  app: { label: 'App', icon: 'smartphone' },
  email: { label: 'E-mail', icon: 'mail' },
  whatsapp: { label: 'WhatsApp', icon: 'message-circle' },
};

type TemplateFormValues = {
  code: string;
  title: string;
  messageTitle: string;
  message: string;
  variablesText: string;
};

const emptyTemplateForm: TemplateFormValues = {
  code: '',
  title: '',
  messageTitle: '',
  message: '',
  variablesText: '',
};

export function NotificationRoutineFormModal({
  visible,
  initialRoutine,
  templates,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialRoutine: NotificationRoutineItem | null;
  templates: NotificationTemplateItem[];
  onClose: () => void;
  onSave: (routine: NotificationRoutineItem) => void;
}) {
  const [form, setForm] = useState<RoutineFormValues>(emptyRoutineForm);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isAudiencePickerOpen, setIsAudiencePickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (initialRoutine) {
      setForm({
        title: initialRoutine.title,
        template: initialRoutine.template,
        messageTitle: initialRoutine.messageTitle,
        message: initialRoutine.message,
        enabled: initialRoutine.enabled,
        triggerKind: initialRoutine.triggerKind,
        cronSchedule: initialRoutine.cronSchedule,
        eventCode: initialRoutine.eventCode,
        channels: initialRoutine.channels,
        audienceType: initialRoutine.audienceType,
        audienceCargos: initialRoutine.audienceCargos,
      });
    } else {
      setForm(emptyRoutineForm);
    }

    setIsTemplatePickerOpen(false);
    setIsAudiencePickerOpen(false);
  }, [visible, initialRoutine]);

  const audienceLabel =
    notificationAudienceOptions.find((option) => option.value === form.audienceType)?.label ??
    'Todos os colaboradores';

  const handleToggleChannel = (key: keyof NotificationChannels) => {
    setForm((current) => ({
      ...current,
      channels: { ...current.channels, [key]: !current.channels[key] },
    }));
  };

  const handleToggleCargo = (cargo: string) => {
    setForm((current) => ({
      ...current,
      audienceCargos: current.audienceCargos.includes(cargo)
        ? current.audienceCargos.filter((item) => item !== cargo)
        : [...current.audienceCargos, cargo],
    }));
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.messageTitle.trim() || !form.message.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, título e mensagem da rotina.');
      return;
    }

    if (!form.channels.app && !form.channels.email && !form.channels.whatsapp) {
      Alert.alert('Canal obrigatório', 'Selecione ao menos um canal de envio.');
      return;
    }

    const routine: NotificationRoutineItem = {
      id: initialRoutine?.id ?? `routine-${Date.now()}`,
      title: form.title.trim(),
      messageTitle: form.messageTitle.trim(),
      template: form.template,
      message: form.message,
      triggerKind: form.triggerKind,
      cronSchedule: form.cronSchedule,
      eventCode: form.eventCode,
      channels: form.channels,
      audienceType: form.audienceType,
      audienceCargos: form.audienceCargos,
      lastRunLabel: initialRoutine?.lastRunLabel ?? '—',
      enabled: form.enabled,
    };

    onSave(routine);
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>
                {initialRoutine ? 'Editar rotina' : 'Nova rotina de notificação'}
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.requestFieldLabel}>Nome da rotina *</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.title}
                onChangeText={(text) => setForm((current) => ({ ...current, title: text }))}
                placeholder="Ex.: Lembrete diário de fechamento"
                placeholderTextColor="#A7AEC2"
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Template</Text>
              <Pressable style={styles.requestSelectBox} onPress={() => setIsTemplatePickerOpen(true)}>
                <View style={styles.requestSelectLeft}>
                  <Feather name="edit-3" size={14} color="#E6213D" />
                  <Text style={styles.requestSelectText}>{form.template}</Text>
                </View>
                <Feather name="chevron-down" size={18} color="#7A8299" />
              </Pressable>

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Título da mensagem *</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.messageTitle}
                onChangeText={(text) => setForm((current) => ({ ...current, messageTitle: text }))}
                placeholder="Ex.: Alerta de sangria"
                placeholderTextColor="#A7AEC2"
              />

              <Pressable
                style={styles.routineActiveRow}
                onPress={() => setForm((current) => ({ ...current, enabled: !current.enabled }))}
              >
                <View style={styles.routineActiveLeft}>
                  <Feather name="power" size={14} color={form.enabled ? '#18955A' : '#9AA1B5'} />
                  <Text style={styles.routineActiveLabel}>Rotina ativa</Text>
                </View>
                <ToggleSwitch
                  value={form.enabled}
                  onValueChange={() => setForm((current) => ({ ...current, enabled: !current.enabled }))}
                />
              </Pressable>

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>
                Mensagem * (use {'{{variavel}}'} para substituir no envio)
              </Text>
              <TextInput
                style={[styles.processTextInput, styles.processDocumentationArea]}
                value={form.message}
                onChangeText={(text) => setForm((current) => ({ ...current, message: text }))}
                placeholder="Digite a mensagem..."
                placeholderTextColor="#A7AEC2"
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Gatilho *</Text>
              <View style={styles.routineTriggerList}>
                {notificationTriggerOptions.map((option) => {
                  const isSelected = form.triggerKind === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.routineTriggerOption, isSelected ? styles.routineTriggerOptionActive : null]}
                      onPress={() => setForm((current) => ({ ...current, triggerKind: option.value }))}
                    >
                      <View
                        style={[
                          styles.routineTriggerIconShell,
                          isSelected ? styles.routineTriggerIconShellActive : null,
                        ]}
                      >
                        <Feather name={option.icon} size={16} color={isSelected ? '#E6213D' : '#5E667D'} />
                      </View>
                      <View style={styles.routineTriggerTextBlock}>
                        <Text
                          style={[
                            styles.routineTriggerLabel,
                            isSelected ? styles.routineTriggerLabelActive : null,
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text style={styles.routineTriggerDescription}>{option.description}</Text>
                      </View>
                      {isSelected ? <Feather name="check-circle" size={18} color="#E6213D" /> : null}
                    </Pressable>
                  );
                })}
              </View>

              {form.triggerKind === 'recorrente' ? (
                <>
                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Expressão cron</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={form.cronSchedule}
                    onChangeText={(text) => setForm((current) => ({ ...current, cronSchedule: text }))}
                    placeholder="0 9 * * 1"
                    placeholderTextColor="#A7AEC2"
                  />
                  <View style={styles.cronPresetRow}>
                    {notificationCronPresets.map((preset) => {
                      const isSelected = form.cronSchedule === preset.value;
                      return (
                        <Pressable
                          key={preset.value}
                          style={[styles.cronPresetChip, isSelected ? { borderColor: '#E6213D' } : null]}
                          onPress={() => setForm((current) => ({ ...current, cronSchedule: preset.value }))}
                        >
                          <Text
                            style={[styles.cronPresetChipText, isSelected ? { color: '#E6213D' } : null]}
                          >
                            {preset.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {form.triggerKind === 'evento' ? (
                <>
                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Código do evento</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={form.eventCode}
                    onChangeText={(text) => setForm((current) => ({ ...current, eventCode: text }))}
                    placeholder="Ex.: Enviado a partir de acúmulo de R$ 200,00"
                    placeholderTextColor="#A7AEC2"
                  />
                  <Text style={styles.routineHelperText}>
                    A rotina será disparada automaticamente quando esse evento ocorrer no sistema.
                  </Text>
                </>
              ) : null}

              {form.triggerKind === 'manual' ? (
                <Text style={[styles.routineHelperText, styles.spacingTop]}>
                  Disparada apenas quando você clicar em Executar agora.
                </Text>
              ) : null}

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Canais de envio *</Text>
              <View style={styles.routineChannelsRow}>
                {(Object.keys(notificationChannelMeta) as Array<keyof NotificationChannels>).map((key) => {
                  const meta = notificationChannelMeta[key];
                  const isOn = form.channels[key];

                  return (
                    <Pressable
                      key={key}
                      style={[styles.routineChannelBox, isOn ? styles.routineChannelBoxActive : null]}
                      onPress={() => handleToggleChannel(key)}
                    >
                      <Feather name={meta.icon} size={16} color={isOn ? '#18955A' : '#5E667D'} />
                      <Text
                        style={[
                          styles.routineChannelBoxText,
                          isOn ? styles.routineChannelBoxTextActive : null,
                        ]}
                        numberOfLines={1}
                      >
                        {meta.label}
                      </Text>
                      <ToggleSwitch value={isOn} onValueChange={() => handleToggleChannel(key)} />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Público</Text>
              <Pressable style={styles.requestSelectBox} onPress={() => setIsAudiencePickerOpen(true)}>
                <Text style={styles.requestSelectText}>{audienceLabel}</Text>
                <Feather name="chevron-down" size={18} color="#7A8299" />
              </Pressable>

              {form.audienceType === 'cargo' ? (
                <View style={styles.routineCargoListCard}>
                  <ScrollView style={styles.routineCargoScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {notificationCargoOptions.map((cargo) => {
                      const isSelected = form.audienceCargos.includes(cargo);

                      return (
                        <View key={cargo} style={styles.routineCargoRow}>
                          <Text style={styles.routineCargoLabel} numberOfLines={1}>
                            {cargo}
                          </Text>
                          <ToggleSwitch value={isSelected} onValueChange={() => handleToggleCargo(cargo)} />
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              <Pressable style={[styles.primaryButton, styles.routineSubmitButton]} onPress={handleSubmit}>
                <Text style={styles.primaryButtonText}>Salvar rotina</Text>
              </Pressable>
            </ScrollView>

            <TemplatePickerModal
              visible={isTemplatePickerOpen}
              templates={templates}
              selectedValue={form.template}
              onSelect={(value) => setForm((current) => ({ ...current, template: value }))}
              onClose={() => setIsTemplatePickerOpen(false)}
              inline
            />
            <SimpleListModal
              visible={isAudiencePickerOpen}
              title="Público"
              options={notificationAudienceOptions.map((option) => option.label)}
              selectedValue={audienceLabel}
              onSelect={(label) => {
                const match = notificationAudienceOptions.find((option) => option.label === label);

                if (match) {
                  setForm((current) => ({ ...current, audienceType: match.value }));
                }
              }}
              onClose={() => setIsAudiencePickerOpen(false)}
              inline
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export function TemplateFormModal({
  visible,
  initialTemplate,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialTemplate: NotificationTemplateItem | null;
  onClose: () => void;
  onSave: (template: NotificationTemplateItem) => void;
}) {
  const [form, setForm] = useState<TemplateFormValues>(emptyTemplateForm);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (initialTemplate) {
      setForm({
        code: initialTemplate.code,
        title: initialTemplate.title,
        messageTitle: initialTemplate.messageTitle,
        message: initialTemplate.message,
        variablesText: initialTemplate.variables.join(', '),
      });
    } else {
      setForm(emptyTemplateForm);
    }
  }, [visible, initialTemplate]);

  const handleSubmit = () => {
    if (!form.code.trim() || !form.title.trim() || !form.messageTitle.trim() || !form.message.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha código, nome, título e mensagem do template.');
      return;
    }

    const variables = form.variablesText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const template: NotificationTemplateItem = {
      id: initialTemplate?.id ?? `template-${Date.now()}`,
      code: form.code.trim(),
      title: form.title.trim() || form.code.trim(),
      messageTitle: form.messageTitle.trim(),
      message: form.message,
      variables,
      isSystemDefault: initialTemplate?.isSystemDefault ?? false,
    };

    onSave(template);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle}>
              {initialTemplate ? 'Editar template' : 'Novo template'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestFieldLabel}>Código *</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.code}
                  onChangeText={(text) => setForm((current) => ({ ...current, code: text }))}
                  placeholder="meu_template"
                  placeholderTextColor="#A7AEC2"
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestFieldLabel}>Nome *</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.title}
                  onChangeText={(text) => setForm((current) => ({ ...current, title: text }))}
                  placeholder="Ex.: Flash diário"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Título da mensagem *</Text>
            <TextInput
              style={styles.processTextInput}
              value={form.messageTitle}
              onChangeText={(text) => setForm((current) => ({ ...current, messageTitle: text }))}
              placeholder="Ex.: Flash diário {{data}}"
              placeholderTextColor="#A7AEC2"
            />

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>
              Mensagem * (use {'{{variavel}}'} para substituir no envio)
            </Text>
            <TextInput
              style={[styles.processTextInput, styles.processDocumentationArea]}
              value={form.message}
              onChangeText={(text) => setForm((current) => ({ ...current, message: text }))}
              placeholder="Ex.: Resumo executivo de {{data}}: faturamento {{faturamento}}."
              placeholderTextColor="#A7AEC2"
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Variáveis disponíveis (separadas por vírgula)</Text>
            <TextInput
              style={styles.processTextInput}
              value={form.variablesText}
              onChangeText={(text) => setForm((current) => ({ ...current, variablesText: text }))}
              placeholder="nome, cargo, posto, data"
              placeholderTextColor="#A7AEC2"
              autoCapitalize="none"
            />

            <Pressable style={[styles.primaryButton, styles.routineSubmitButton]} onPress={handleSubmit}>
              <Text style={styles.primaryButtonText}>Salvar template</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DirectorNotificationsScreen({ navigation }: ScreenProps<'DirectorNotifications'>) {
  return <DirectorNotificationsPanelScreen navigation={navigation} />;
}

// --- Fale com a Diretoria (conversas de WhatsApp) ---
// Status/tags/notas agora são reais (dir_contatos no Supabase do Lovable),
// persistidos via updateConversa() — não é mais um controle só local.

function getEffectiveConversaStatus(conversa: ConversaResumo): ConversaChatStatus {
  return conversa.chat_status ?? (conversa.pendentes > 0 ? 'fila' : 'ativo');
}

const conversaStatusMeta: Record<ConversaChatStatus, { label: string; color: string; tint: string }> = {
  fila: { label: 'Fila', color: '#B7791F', tint: '#FCF4DE' },
  ativo: { label: 'Ativo', color: '#18955A', tint: '#E2F4EA' },
  finalizado: { label: 'Finalizada', color: '#5B6472', tint: '#EEF0F4' },
};

const AVATAR_PALETTE = ['#E6213D', '#3457D5', '#18955A', '#B7791F', '#7B4FE0', '#0E8AA3'];

function getAvatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000000;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getConversaInitials(nome: string | null, telefone: string) {
  const base = nome && nome.trim().length > 0 ? nome.trim() : telefone;
  const parts = base.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatConversaListTime(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (sameDay) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return formatDateBR(date);
}

function formatConversaBubbleTime(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const LONG_MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function formatConversaLongDate(iso: string) {
  const date = new Date(iso);
  return `${date.getDate()} de ${LONG_MONTHS_PT[date.getMonth()]} de ${date.getFullYear()}`;
}

function getConversaMessagePreview(conversa: ConversaResumo) {
  if (conversa.texto && conversa.texto.trim().length > 0) return conversa.texto;
  if (conversa.tipo_mensagem === 'audio') return '🎤 Mensagem de áudio';
  if (conversa.tipo_mensagem === 'image') return '📷 Imagem';
  if (conversa.tipo_mensagem === 'document') return '📄 Documento';
  return conversa.tipo_mensagem;
}

function DirectorConversasScreen({ navigation }: ScreenProps<'DirectorConversas'>) {
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todos' | ConversaChatStatus>('todos');
  const [isNovaConversaOpen, setIsNovaConversaOpen] = useState(false);

  const loadConversas = useCallback(async (query?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchConversas(query);
      setConversas(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar as conversas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversas();
  }, [loadConversas]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadConversas(searchText.trim() || undefined);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const stats = useMemo(() => {
    let naFila = 0;
    let emAtendimento = 0;
    let finalizadas = 0;
    conversas.forEach((conversa) => {
      const status = getEffectiveConversaStatus(conversa);
      if (status === 'fila') naFila += 1;
      else if (status === 'ativo') emAtendimento += 1;
      else finalizadas += 1;
    });
    return { naFila, emAtendimento, finalizadas, total: conversas.length };
  }, [conversas]);

  const filteredConversas = useMemo(() => {
    if (activeFilter === 'todos') return conversas;
    return conversas.filter((conversa) => getEffectiveConversaStatus(conversa) === activeFilter);
  }, [conversas, activeFilter]);

  const filterTabs: Array<{ id: 'todos' | ConversaChatStatus; label: string; count: number }> = [
    { id: 'todos', label: 'Todos', count: stats.total },
    { id: 'fila', label: 'Fila', count: stats.naFila },
    { id: 'ativo', label: 'Ativos', count: stats.emAtendimento },
    { id: 'finalizado', label: 'Final.', count: stats.finalizadas },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={directorUserInitials}
          variant="diretoria"
          onAvatarPress={() => navigation.navigate('DirectorProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.directorPageHeaderRow}>
          <View style={styles.directorPageTitleRow}>
            <View style={[styles.iconShell, { backgroundColor: '#FCE4E8' }]}>
              <Feather name="message-circle" size={18} color="#E0002A" />
            </View>
            <Text style={styles.pageTitle}>Fale com a Diretoria</Text>
          </View>
        </View>
        <Text style={styles.pageSubtitle}>Canal direto com clientes e postos</Text>

        <View style={styles.conversaStatsGrid}>
          <View style={styles.conversaStatCard}>
            <Text style={styles.conversaStatLabel}>Na fila</Text>
            <Text style={[styles.conversaStatValue, { color: '#B7791F' }]}>{stats.naFila}</Text>
          </View>
          <View style={styles.conversaStatCard}>
            <Text style={styles.conversaStatLabel}>Em atend.</Text>
            <Text style={[styles.conversaStatValue, { color: '#3457D5' }]}>{stats.emAtendimento}</Text>
          </View>
          <View style={styles.conversaStatCard}>
            <Text style={styles.conversaStatLabel}>Finalizadas</Text>
            <Text style={[styles.conversaStatValue, { color: '#18955A' }]}>{stats.finalizadas}</Text>
          </View>
          <View style={styles.conversaStatCard}>
            <Text style={styles.conversaStatLabel}>Total</Text>
            <Text style={[styles.conversaStatValue, { color: '#7B4FE0' }]}>{stats.total}</Text>
          </View>
        </View>

        <Pressable style={styles.novaConversaButton} onPress={() => setIsNovaConversaOpen(true)}>
          <Feather name="phone" size={16} color="#FFFFFF" />
          <Text style={styles.novaConversaButtonText}>Nova conversa</Text>
        </Pressable>

        <View style={styles.conversaSearchRow}>
          <Feather name="search" size={16} color="#8A8F9C" />
          <TextInput
            style={styles.conversaSearchInput}
            placeholder="Buscar por nome, telefone ou tag..."
            placeholderTextColor="#8A8F9C"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <View style={styles.conversaFilterRow}>
          {filterTabs.map((tab) => (
            <Pressable
              key={tab.id}
              style={[styles.conversaFilterTab, activeFilter === tab.id && styles.conversaFilterTabActive]}
              onPress={() => setActiveFilter(tab.id)}
            >
              <Text
                style={[
                  styles.conversaFilterTabText,
                  activeFilter === tab.id && styles.conversaFilterTabTextActive,
                ]}
              >
                {tab.label} ({tab.count})
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando conversas...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : filteredConversas.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhuma conversa encontrada.</Text>
        ) : (
          filteredConversas.map((conversa) => {
            const status = getEffectiveConversaStatus(conversa);
            const statusMeta = conversaStatusMeta[status];
            const initials = getConversaInitials(conversa.nome_contato, conversa.telefone);
            const avatarColor = getAvatarColor(conversa.telefone);

            return (
              <Pressable
                key={conversa.telefone}
                style={styles.conversaListItem}
                onPress={() =>
                  navigation.navigate('DirectorConversaDetalhe', {
                    telefone: conversa.telefone,
                    conversaInicial: conversa,
                  })
                }
              >
                <View style={[styles.conversaAvatar, { backgroundColor: `${avatarColor}22` }]}>
                  <Text style={[styles.conversaAvatarText, { color: avatarColor }]}>{initials}</Text>
                </View>
                <View style={styles.conversaListItemBody}>
                  <View style={styles.conversaListItemTopRow}>
                    <Text style={styles.conversaListItemName} numberOfLines={1}>
                      {conversa.nome_contato || conversa.telefone}
                    </Text>
                    <Text style={styles.conversaListItemTime}>{formatConversaListTime(conversa.criado_em)}</Text>
                  </View>
                  <Text style={styles.conversaListItemPreview} numberOfLines={1}>
                    {getConversaMessagePreview(conversa)}
                  </Text>
                  <View style={styles.conversaListItemBottomRow}>
                    <View style={[styles.conversaStatusPill, { backgroundColor: statusMeta.tint }]}>
                      <Text style={[styles.conversaStatusPillText, { color: statusMeta.color }]}>
                        {statusMeta.label}
                      </Text>
                    </View>
                  </View>
                </View>
                {conversa.pendentes > 0 ? (
                  <View style={styles.conversaUnreadBadge}>
                    <Text style={styles.conversaUnreadBadgeText}>
                      {conversa.pendentes > 9 ? '9+' : conversa.pendentes}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <NovaConversaModal visible={isNovaConversaOpen} onClose={() => setIsNovaConversaOpen(false)} />
    </SafeAreaView>
  );
}

function NovaConversaModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  const handleStart = () => {
    Alert.alert(
      'Envio ainda não conectado',
      'A lista e o histórico já vêm do WhatsApp real. Iniciar uma conversa nova a partir do app ainda depende da integração de envio (Z-API) — assim que estiver liberado, esse botão já vai funcionar de verdade.'
    );
    setPhone('');
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle}>Iniciar nova conversa</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={20} color="#313951" />
            </Pressable>
          </View>
          <Text style={styles.conversaModalSubtitle}>Informe o número e nome do contato para abrir uma nova conversa.</Text>

          <Text style={styles.requestFieldLabel}>Número</Text>
          <TextInput
            style={styles.processTextInput}
            placeholder="(21) 9 9999-9999"
            placeholderTextColor="#8A8F9C"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.requestFieldLabel}>Nome (opcional)</Text>
          <TextInput
            style={styles.processTextInput}
            placeholder="Nome do contato"
            placeholderTextColor="#8A8F9C"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.conversaModalButtonRow}>
            <Pressable style={styles.conversaModalCancelButton} onPress={onClose}>
              <Text style={styles.conversaModalCancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.conversaModalStartButton, !phone && styles.conversaModalStartButtonDisabled]}
              disabled={!phone}
              onPress={handleStart}
            >
              <Text style={styles.conversaModalStartButtonText}>Iniciar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DirectorConversaDetalheScreen({ navigation, route }: ScreenProps<'DirectorConversaDetalhe'>) {
  const { telefone, conversaInicial } = route.params;
  const [mensagens, setMensagens] = useState<ConversaMensagem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [isAcoesOpen, setIsAcoesOpen] = useState(false);
  const [conversaInfo, setConversaInfo] = useState<ConversaResumo | null>(conversaInicial ?? null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchMensagens(telefone)
      .then((data) => {
        if (isMounted) setMensagens(data);
      })
      .catch((err) => {
        if (isMounted) setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar a conversa.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [telefone]);

  const nomeContato =
    conversaInfo?.nome_contato || mensagens.find((m) => m.nome_contato)?.nome_contato || telefone;
  const initials = getConversaInitials(nomeContato, telefone);
  const avatarColor = getAvatarColor(telefone);
  const effectiveStatus: ConversaChatStatus = conversaInfo
    ? getEffectiveConversaStatus(conversaInfo)
    : mensagens[mensagens.length - 1]?.direcao === 'in'
    ? 'fila'
    : 'ativo';
  const statusMeta = conversaStatusMeta[effectiveStatus];

  const handleConversaUpdate = useCallback((patch: Partial<ConversaResumo>) => {
    setConversaInfo((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const handleSend = () => {
    if (!draft.trim()) return;
    const optimistic: ConversaMensagem = {
      id: Date.now(),
      mensagem_id_zapi: null,
      telefone,
      nome_contato: nomeContato,
      direcao: 'out',
      tipo_mensagem: 'text',
      texto: draft.trim(),
      audio_url: null,
      criado_em: new Date().toISOString(),
      metadata: null,
    };
    setMensagens((current) => [...current, optimistic]);
    setDraft('');
  };

  let lastDateLabel = '';

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={directorUserInitials}
          variant="diretoria"
          onAvatarPress={() => navigation.navigate('DirectorProfile')}
        />
      </View>
      <View style={styles.conversaDetalheHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.conversaBackButton}>
          <Feather name="arrow-left" size={20} color="#313951" />
        </Pressable>
        <View style={[styles.conversaAvatar, { backgroundColor: `${avatarColor}22` }]}>
          <Text style={[styles.conversaAvatarText, { color: avatarColor }]}>{initials}</Text>
        </View>
        <View style={styles.conversaDetalheHeaderBody}>
          <Text style={styles.conversaDetalheHeaderName} numberOfLines={1}>
            {nomeContato}
          </Text>
          <View style={[styles.conversaStatusPill, { backgroundColor: statusMeta.tint, alignSelf: 'flex-start' }]}>
            <Text style={[styles.conversaStatusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>
        <Pressable style={styles.conversaMenuButton} onPress={() => setIsAcoesOpen(true)}>
          <Feather name="more-vertical" size={20} color="#313951" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.conversaThreadScroll}
        contentContainerStyle={styles.conversaThreadContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando mensagens...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : mensagens.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhuma mensagem ainda.</Text>
        ) : (
          mensagens.map((mensagem) => {
            const dateLabel = formatConversaLongDate(mensagem.criado_em);
            const showDateSeparator = dateLabel !== lastDateLabel;
            lastDateLabel = dateLabel;
            const isOut = mensagem.direcao === 'out';
            const bodyText =
              mensagem.texto ||
              (mensagem.tipo_mensagem === 'audio' ? '🎤 Mensagem de áudio' : mensagem.tipo_mensagem);

            return (
              <View key={mensagem.id}>
                {showDateSeparator ? (
                  <View style={styles.conversaDateSeparator}>
                    <Text style={styles.conversaDateSeparatorText}>{dateLabel}</Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.conversaBubble,
                    isOut ? styles.conversaBubbleOut : styles.conversaBubbleIn,
                  ]}
                >
                  <Text style={[styles.conversaBubbleText, isOut && styles.conversaBubbleTextOut]}>
                    {bodyText}
                  </Text>
                  <View style={styles.conversaBubbleFooter}>
                    <Text
                      style={[styles.conversaBubbleTime, isOut && styles.conversaBubbleTimeOut]}
                    >
                      {formatConversaBubbleTime(mensagem.criado_em)}
                    </Text>
                    {isOut ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.conversaInputBar}>
        <TextInput
          style={styles.conversaInput}
          placeholder="Digite uma mensagem..."
          placeholderTextColor="#8A8F9C"
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable style={styles.conversaSendButton} onPress={handleSend} disabled={!draft.trim()}>
          <Feather name="send" size={16} color="#FFFFFF" />
        </Pressable>
      </View>

      <ConversaAcoesModal
        visible={isAcoesOpen}
        telefone={telefone}
        nomeContato={nomeContato}
        conversaInfo={conversaInfo}
        onUpdate={handleConversaUpdate}
        onClose={() => setIsAcoesOpen(false)}
      />
    </SafeAreaView>
  );
}

function ConversaAcoesModal({
  visible,
  telefone,
  nomeContato,
  conversaInfo,
  onUpdate,
  onClose,
}: {
  visible: boolean;
  telefone: string;
  nomeContato: string;
  conversaInfo: ConversaResumo | null;
  onUpdate: (patch: Partial<ConversaResumo>) => void;
  onClose: () => void;
}) {
  const [novaTag, setNovaTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const initials = getConversaInitials(nomeContato, telefone);

  const tags = conversaInfo?.metadata?.tags ?? [];
  const notas = conversaInfo?.metadata?.notas ?? '';
  // muted/blocked reais existem em dir_contatos, mas o PATCH atual só aceita
  // chat_status/metadata — até pedirmos ao Lovable para expor esses campos no
  // PATCH, guardamos silenciar/bloquear como flags dentro de metadata.
  const isSilenciada = Boolean(conversaInfo?.metadata?.muted);

  const salvarMetadata = async (patchMetadata: ConversaMetadata) => {
    const novaMetadata: ConversaMetadata = { ...(conversaInfo?.metadata ?? {}), ...patchMetadata };
    setIsSaving(true);
    try {
      await updateConversa(telefone, { metadata: novaMetadata });
      onUpdate({ metadata: novaMetadata });
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    const tag = novaTag.trim();
    if (!tag || tags.includes(tag)) {
      setNovaTag('');
      return;
    }
    setNovaTag('');
    salvarMetadata({ tags: [...tags, tag] });
  };

  const handleRemoveTag = (tag: string) => {
    salvarMetadata({ tags: tags.filter((t) => t !== tag) });
  };

  const handleAction = async (status: ConversaChatStatus) => {
    setIsSaving(true);
    try {
      await updateConversa(telefone, { chat_status: status });
      onUpdate({ chat_status: status });
      onClose();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível atualizar a conversa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSilenciar = () => {
    salvarMetadata({ muted: !isSilenciada });
  };

  const handleBloquear = () => {
    Alert.alert('Bloquear contato', `Tem certeza que deseja bloquear ${nomeContato}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear',
        style: 'destructive',
        onPress: () => {
          salvarMetadata({ blocked: true });
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.requestModalBackdrop} onPress={onClose}>
        <Pressable style={styles.conversaAcoesCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.conversaAcoesHeader}>
            <View style={[styles.conversaAvatar, styles.conversaAcoesAvatar]}>
              <Text style={styles.conversaAvatarText}>{initials}</Text>
            </View>
            <Text style={styles.conversaAcoesContactName} numberOfLines={1}>
              {nomeContato}
            </Text>
            <Text style={styles.conversaAcoesContactSub} numberOfLines={1}>
              {telefone}
            </Text>
          </View>

          <Text style={styles.conversaAcoesSectionLabel}>TAGS</Text>
          <View style={styles.conversaTagInputRow}>
            <TextInput
              style={styles.conversaTagInput}
              placeholder="Nova tag..."
              placeholderTextColor="#8A8F9C"
              value={novaTag}
              onChangeText={setNovaTag}
              onSubmitEditing={handleAddTag}
              editable={!isSaving}
            />
            <Pressable style={styles.conversaTagAddButton} onPress={handleAddTag} disabled={isSaving}>
              <Feather name="plus" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
          {tags.length > 0 ? (
            <View style={styles.conversaTagChipRow}>
              {tags.map((tag) => (
                <Pressable key={tag} style={styles.conversaTagChip} onPress={() => handleRemoveTag(tag)}>
                  <Text style={styles.conversaTagChipText}>{tag}</Text>
                  <Feather name="x" size={12} color="#5B6472" />
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={[styles.conversaAcoesSectionLabel, styles.spacingTop]}>NOTAS</Text>
          <TextInput
            style={styles.conversaNotasInput}
            placeholder="Adicione uma nota..."
            placeholderTextColor="#8A8F9C"
            value={notas}
            onChangeText={(text) => salvarMetadata({ notas: text })}
            editable={!isSaving}
            multiline
          />

          <View style={styles.conversaAcoesDivider} />

          <Pressable style={styles.conversaAcaoRow} onPress={() => handleAction('fila')} disabled={isSaving}>
            <Feather name="corner-up-left" size={16} color="#3A415C" />
            <Text style={styles.conversaAcaoRowText}>Devolver para fila</Text>
          </Pressable>
          <Pressable style={styles.conversaAcaoRow} onPress={() => handleAction('finalizado')} disabled={isSaving}>
            <Feather name="check" size={16} color="#3A415C" />
            <Text style={styles.conversaAcaoRowText}>Finalizar conversa</Text>
          </Pressable>
          <Pressable style={styles.conversaAcaoRow} onPress={handleToggleSilenciar} disabled={isSaving}>
            <Feather name={isSilenciada ? 'bell' : 'bell-off'} size={16} color="#3A415C" />
            <Text style={styles.conversaAcaoRowText}>{isSilenciada ? 'Reativar notificações' : 'Silenciar'}</Text>
          </Pressable>
          <Pressable style={styles.conversaAcaoRow} onPress={handleBloquear} disabled={isSaving}>
            <Feather name="slash" size={16} color="#E0002A" />
            <Text style={[styles.conversaAcaoRowText, styles.conversaAcaoRowTextDanger]}>Bloquear</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SideMenuOverlay({
  initials,
  currentRoute,
  onClose,
  variant = 'colaborador',
}: {
  initials: string;
  currentRoute?: keyof RootStackParamList;
  onClose: () => void;
  variant?: UserRole;
}) {
  const isDirector = variant === 'diretoria';
  const isRH = variant === 'rh';
  const isAdmin = variant === 'administrador';
  const { identity } = useContext(AuthIdentityContext);
  const { perfil: colaboradorPerfil, isLoading: isLoadingColaboradorPerfil } = useContext(ColaboradorPerfilContext);
  const hasMultiplePanels = (identity?.availableRoles?.length ?? 0) > 1;
  const sections = isDirector
    ? directorSideMenuSections
    : isRH
    ? rhSideMenuSections
    : isAdmin
    ? adminSideMenuSections
    : sideMenuSections;
  // Colaborador: nome/cargo reais (rh_colaboradores, via ColaboradorPerfilContext) —
  // nunca o mock "Bruno Lima". Sem vínculo no RH, avisa em vez de fabricar cargo.
  const headerName = isDirector
    ? directorUser.fullName
    : isRH
    ? rhUser.fullName
    : isAdmin
    ? adminUser.fullName
    : colaboradorPerfil?.nome_completo || identity?.fullName || '—';
  const headerRole = isDirector
    ? directorUser.role
    : isRH
    ? rhUser.role
    : isAdmin
    ? adminUser.role
    : (colaboradorPerfil?.cargo as string | undefined) ||
      (isLoadingColaboradorPerfil ? 'Carregando…' : identity?.colaboradorId ? '—' : 'Sem vínculo no RH');
  const headerGradientColors: [string, string] = isDirector
    ? ['#7A1230', '#B21B3E']
    : isRH
    ? ['#1B6E3A', '#2A9D51']
    : isAdmin
    ? ['#1B2340', '#2F3A5C']
    : ['#2F4EA8', '#4C439E'];
  const insets = useSafeAreaInsets();

  const handleItemPress = (route?: SideMenuRoute | DirectorSideMenuRoute | RHSideMenuRoute | AdminSideMenuRoute) => {
    onClose();

    if (route && navigationRef.isReady()) {
      navigationRef.navigate(route as never);
    }
  };

  return (
    <View style={styles.sideMenuOverlay}>
      <Pressable style={styles.sideMenuBackdrop} onPress={onClose} />

      <SafeAreaView edges={['bottom']} style={styles.sideMenuPanel}>
        <LinearGradient
          colors={headerGradientColors}
          style={[styles.sideMenuHeader, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.sideMenuUserRow}>
            <View style={styles.sideMenuUserBadge}>
              <Text style={styles.sideMenuUserBadgeText}>{initials}</Text>
            </View>

            <View style={styles.sideMenuUserText}>
              <Text style={styles.sideMenuUserName}>{headerName}</Text>
              <Text style={styles.sideMenuUserRole}>{headerRole}</Text>
            </View>

            <Pressable style={styles.sideMenuCloseButton} onPress={onClose}>
              <Feather name="x" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sideMenuContent}>
          {sections.map((section) => (
            <View key={section.title} style={styles.sideMenuSection}>
              <Text style={styles.sideMenuSectionTitle}>{section.title}</Text>

              {section.items.map((item) => {
                const isActive =
                  item.route === currentRoute ||
                  (item.route === 'Profile' && currentRoute === 'ProfileSection');

                return (
                  <Pressable
                    key={item.id}
                    style={[styles.sideMenuItem, isActive ? styles.sideMenuItemActive : null]}
                    onPress={() => handleItemPress(item.route)}
                  >
                    <Feather
                      name={item.icon}
                      size={18}
                      color={isActive ? '#E0002A' : '#2B3147'}
                    />
                    <Text
                      style={[styles.sideMenuItemText, isActive ? styles.sideMenuItemTextActive : null]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.sideMenuFooter}>
            {hasMultiplePanels ? (
              <Pressable
                style={styles.sideMenuItem}
                onPress={() => {
                  onClose();
                  if (navigationRef.isReady()) {
                    navigationRef.navigate('SelectPanel' as never);
                  }
                }}
              >
                <Feather name="repeat" size={18} color="#2B3147" />
                <Text style={styles.sideMenuItemText}>Voltar para o Início</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.sideMenuItem}
              onPress={() => {
                onClose();
                if (navigationRef.isReady()) {
                  navigationRef.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                }
              }}
            >
              <Feather name="log-out" size={18} color="#E0002A" />
              <Text style={styles.sideMenuLogoutText}>Sair da conta</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function TopBar({
  initials,
  onAvatarPress,
  variant = 'colaborador',
  onColor = false,
}: {
  initials: string;
  onAvatarPress?: () => void;
  variant?: UserRole;
  onColor?: boolean;
}) {
  const { openMenu } = useContext(MenuContext);
  const { readNotificationIds } = useContext(NotificationsReadContext);
  const { items: colaboradorNotificationItems } = useContext(ColaboradorNotificationsContext);
  const isDirector = variant === 'diretoria';
  const isRH = variant === 'rh';
  const isAdmin = variant === 'administrador';
  const hasUnreadNotifications = colaboradorNotificationItems.some(
    (item) => item.unread && !readNotificationIds[item.id]
  );

  const openNotifications = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Notifications');
    }
  };

  return (
    <View style={styles.topBar}>
      <Pressable style={styles.menuButton} onPress={openMenu}>
        <Feather name="menu" size={20} color="#313951" />
      </Pressable>

      {isDirector ? (
        <DirectorBrandLogo light={onColor} />
      ) : isRH ? (
        <RHBrandLogo />
      ) : isAdmin ? (
        <AdminBrandLogo />
      ) : (
        <BrandLogo compact theme={onColor ? 'light' : 'dark'} />
      )}

      <View style={styles.topBarRight}>
        {isDirector || isRH || isAdmin ? null : (
          <Pressable style={styles.notificationBellButton} onPress={openNotifications}>
            <Feather name="bell" size={17} color="#313951" />
            {hasUnreadNotifications ? <View style={styles.notificationBellDot} /> : null}
          </Pressable>
        )}

        <Pressable
          style={[styles.avatar, isRH ? styles.avatarRH : null, isAdmin ? styles.avatarAdmin : null]}
          onPress={onAvatarPress}
          disabled={!onAvatarPress}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DirectorBrandLogo({ light = false }: { light?: boolean }) {
  return (
    <View style={styles.directorBrandRow}>
      <Image source={require('./assets/logo.png')} style={styles.directorBrandIcon} resizeMode="contain" />
      <View>
        <Text style={[styles.directorBrandTitle, light ? styles.directorBrandTitleLight : null]}>
          Diretoria
        </Text>
        <Text style={[styles.directorBrandSubtitle, light ? styles.directorBrandSubtitleLight : null]}>
          PAINÉIS
        </Text>
      </View>
    </View>
  );
}

function RHBrandLogo() {
  return (
    <View style={styles.directorBrandRow}>
      <View style={styles.rhBrandIconShell}>
        <Feather name="users" size={16} color="#FFFFFF" />
      </View>
      <View>
        <Text style={styles.rhBrandTitle}>RH</Text>
        <Text style={styles.rhBrandSubtitle}>RECURSOS HUMANOS</Text>
      </View>
    </View>
  );
}

function AdminBrandLogo() {
  return (
    <View style={styles.directorBrandRow}>
      <View style={styles.adminBrandIconShell}>
        <Feather name="shield" size={16} color="#FFFFFF" />
      </View>
      <View>
        <Text style={styles.adminBrandTitle}>Administrador</Text>
        <Text style={styles.adminBrandSubtitle}>PAINEL DE GESTÃO</Text>
      </View>
    </View>
  );
}

function BrandLogo({
  compact,
  theme = 'light',
}: {
  compact: boolean;
  theme?: 'light' | 'dark';
}) {
  const titleStyle = useMemo(
    () => [
      styles.brandTitle,
      compact ? styles.brandTitleCompact : styles.brandTitleFull,
      theme === 'dark' ? styles.brandTitleDark : styles.brandTitleLight,
    ],
    [compact, theme]
  );

  if (compact) {
    return (
      <View style={styles.topLogoRow}>
        <Image
          source={require('./assets/logo.png')}
          style={styles.topLogoIcon}
          resizeMode="contain"
        />
        <Text style={titleStyle}>AMERICAN FUEL</Text>
      </View>
    );
  }

  return (
    <View style={styles.brandRow}>
      <View style={[styles.brandMark, compact ? styles.brandMarkCompact : styles.brandMarkExpanded]}>
        <View style={styles.brandMarkRedPrimary} />
        <View style={styles.brandMarkRedSecondary} />
        <View style={styles.brandMarkWhite} />
      </View>
      <Text style={titleStyle}>AMERICAN FUEL</Text>
    </View>
  );
}

function FieldLabel({ label, style }: { label: string; style?: object }) {
  return <Text style={[styles.fieldLabel, style]}>{label}</Text>;
}

function InputRow({
  icon,
  value,
  onChangeText,
  rightIcon,
  secureTextEntry,
  ...inputProps
}: {
  icon: React.ReactNode;
  value: string;
  onChangeText: (text: string) => void;
  rightIcon?: React.ReactNode;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  placeholder?: string;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = Boolean(secureTextEntry);

  return (
    <View style={styles.inputRow}>
      <View style={styles.inputIcon}>{icon}</View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#A7AEC2"
        secureTextEntry={isPasswordField ? !isPasswordVisible : undefined}
        {...inputProps}
      />
      {isPasswordField ? (
        <Pressable
          style={styles.inputRightIcon}
          onPress={() => setIsPasswordVisible((current) => !current)}
          hitSlop={8}
        >
          <Feather name={isPasswordVisible ? 'eye-off' : 'eye'} size={18} color="#99A0BA" />
        </Pressable>
      ) : rightIcon ? (
        <View style={styles.inputRightIcon}>{rightIcon}</View>
      ) : null}
    </View>
  );
}

function DashboardCard({ icon, iconColor, tintColor, label, value, caption }: DashboardCardProps) {
  return (
    <View style={styles.dashboardCard}>
      <View style={[styles.iconShell, { backgroundColor: tintColor }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.dashboardCardValue}>{value}</Text>
      <Text style={styles.dashboardCardLabel}>{label}</Text>
      {caption ? (
        <Text style={styles.dashboardCardCaption} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Versões genéricas (operam em cima de uma lista de ids de aula reais —
// rh_treinamento_aulas — em vez do TrainingCourse mock que existia antes).
function getRealLessonProgressSummary(lessonIds: string[], progress?: TrainingCourseProgress) {
  const completedLessons = lessonIds.filter((id) => progress?.lessons[id]?.completed).length;
  const percent = lessonIds.length ? Math.round((completedLessons / lessonIds.length) * 100) : 0;

  return {
    completedLessons,
    percent,
    allLessonsCompleted: lessonIds.length > 0 && completedLessons === lessonIds.length,
  };
}

function getCurrentRealLessonId(lessonIds: string[], progress?: TrainingCourseProgress) {
  return lessonIds.find((id) => !progress?.lessons[id]?.completed) ?? lessonIds[lessonIds.length - 1];
}

function getUnlockedRealLessonIds(lessonIds: string[], progress?: TrainingCourseProgress) {
  const unlockedIds = new Set<string>();
  const currentLessonId = getCurrentRealLessonId(lessonIds, progress);

  lessonIds.forEach((id) => {
    if (progress?.lessons[id]?.completed || id === currentLessonId) {
      unlockedIds.add(id);
    }
  });

  return Array.from(unlockedIds);
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase() ?? '')
    .join('');
}

function getFirstName(fullName: string) {
  return fullName.split(' ').filter(Boolean)[0] ?? fullName;
}

export function formatDateBR(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// YYYY-MM-DD em horário local (não usar toISOString() aqui — ele converte pra
// UTC e pode voltar/avançar um dia dependendo do fuso do aparelho). Usado nos
// filtros de período que o backend espera como de=/ate=.
function toApiDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Painéis de período (Vendas/Margem/Estoques/GNV) que não recebem de/ate
// explícitos caem no default do backend, que é o dia de hoje isolado — quase
// sempre sem venda lançada ainda, diferente do painel web (que abre com o
// mês corrente inteiro, ex.: 01/08 a 31/08). Usar isso como filtro padrão
// nesses recursos evita a tela abrir "zerada" só por causa do período.
function getCurrentMonthRange(): { de: string; ate: string } {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { de: toApiDateOnly(firstDayOfMonth), ate: toApiDateOnly(lastDayOfMonth) };
}

// --- Helpers de leitura defensiva do painel da Diretoria ---
// A Lovable descreveu o shape do DTO em texto (não mandou o JSON exato campo
// a campo), então em vez de travar num nome de campo que pode estar errado,
// tento algumas variações plausíveis e caio pra "sem dado" (não pra um valor
// fabricado) quando nenhuma bate. Ajustar aqui é o lugar certo depois de ver
// o retorno real do endpoint publicado.
function pickNum(obj: unknown, keys: string[]): number | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}
function pickStr(obj: unknown, keys: string[]): string | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === 'string' && value) return value;
  }
  return null;
}
function pickArr(obj: unknown, keys: string[]): any[] {
  if (!obj || typeof obj !== 'object') return [];
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}
function fmtBRLOrDash(value: number | null): string {
  return value === null ? '—' : formatBRL(value);
}
function fmtPercentOrDash(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1).replace('.', ',')}%`;
}
function fmtNumOrDash(value: number | null, suffix = ''): string {
  return value === null ? '—' : `${value.toLocaleString('pt-BR')}${suffix}`;
}
// Converte horas (float) em "Xd Yh", igual ao painel web (autonomia de tanques).
function fmtAutonomiaHoras(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const totalHoras = Math.max(0, value);
  const dias = Math.floor(totalHoras / 24);
  const horas = Math.round(totalHoras % 24);
  if (dias === 0) return `${horas}h`;
  return `${dias}d ${horas}h`;
}

type DiretoriaPosto = { id: string; nome: string };

// Lista real de postos (recurso=postos) — substitui as listas fixas usadas
// antes nos seletores de posto de Vendas/Estoques.
function useDiretoriaPostos() {
  const { identity } = useContext(AuthIdentityContext);
  const [postos, setPostos] = useState<DiretoriaPosto[]>([]);

  useEffect(() => {
    let isActive = true;
    fetchDiretoriaPainel<any>('postos', {}, identity?.profileId)
      .then((response) => {
        if (!isActive) return;
        const data = response?.dados;
        const list: any[] = Array.isArray(data) ? data : pickArr(data, ['postos', 'data']);
        const mapped = list
          .map((item) => ({
            id: String(item?.id ?? item?.idq ?? item?.posto_id ?? item?.codigo ?? ''),
            nome: String(item?.nome ?? item?.name ?? item?.posto ?? ''),
          }))
          .filter((item) => item.id && item.nome);
        setPostos(mapped);
      })
      .catch(() => {
        if (isActive) setPostos([]);
      });
    return () => {
      isActive = false;
    };
  }, [identity?.profileId]);

  return postos;
}

// Hook genérico pra buscar um recurso do painel da Diretoria com filtro de
// período/posto — usado por Vendas/Margem/Estoques/GNV.
function useDiretoriaPainelRecurso(
  recurso: DiretoriaPainelRecurso,
  filtros: { de?: string; ate?: string; posto?: string }
) {
  const { identity } = useContext(AuthIdentityContext);
  // Refaz a busca sempre que a tela volta a ficar em foco (ex.: usuária sai
  // pra outra aba da Diretoria e volta) — sem isso a tela ficava com os
  // últimos dados carregados, parecendo "atrasada" em relação ao site (que
  // recarrega a cada visita). Também expõe refresh() pra puxar de novo sob
  // demanda (pull-to-refresh).
  const isFocused = useIsFocused();
  const [dados, setDados] = useState<any>(null);
  const [periodo, setPeriodo] = useState<{ de?: string; ate?: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isFocused) return;
    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchDiretoriaPainel<any>(recurso, filtros, identity?.profileId)
      .then((response) => {
        if (isActive) {
          setDados(response?.dados ?? null);
          setPeriodo({ de: response?.de, ate: response?.ate });
        }
      })
      .catch((err) => {
        if (isActive) {
          setDados(null);
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os dados.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurso, filtros.de, filtros.ate, filtros.posto, identity?.profileId, isFocused, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);

  return { dados, periodo, isLoading, errorMessage, refresh };
}

export function getCalendarWeeks(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const startDayOfWeek = firstDay.getDay();
  const startDate = new Date(year, monthIndex, 1 - startDayOfWeek);

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + weekIndex * 7 + dayIndex);

      return {
        key: `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`,
        dayNumber: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === monthIndex,
      };
    })
  );
}

function mergeCalendarEvents(...eventLists: CalendarEvent[][]) {
  const mergedMap = new Map<string, CalendarEvent>();

  eventLists.flat().forEach((event) => {
    mergedMap.set(`${event.day}-${event.title}`, event);
  });

  return Array.from(mergedMap.values()).sort((left, right) => left.day - right.day);
}

// rh_calendario_eventos (real, endpoint liberado pela Lovable em 03/08/2026)
// convertido pro formato local CalendarEvent — mesma cor/estilo usados pra
// eventos do mock, agrupado por mês pra reaproveitar o merge com feriados.
const CALENDARIO_TIPO_META: Record<string, { tag: string; tagColor: string; tagTint: string; dateColor: string; dateTint: string }> = {
  feriado: { tag: 'Feriado', tagColor: '#C23B4B', tagTint: '#FBE3E7', dateColor: '#C23B4B', dateTint: '#FBE3E7' },
  folga: { tag: 'Folga', tagColor: '#2B9862', tagTint: '#E2F4EA', dateColor: '#2B9862', dateTint: '#E2F4EA' },
  escala: { tag: 'Escala', tagColor: '#5E6DB4', tagTint: '#E9EEFF', dateColor: '#5E6DB4', dateTint: '#E9EEFF' },
  treinamento: { tag: 'Treinamento', tagColor: '#2D9E6A', tagTint: '#E4F5EE', dateColor: '#2D9E6A', dateTint: '#E4F5EE' },
  reuniao: { tag: 'Reunião', tagColor: '#B18316', tagTint: '#FCF4DE', dateColor: '#B18316', dateTint: '#FCF4DE' },
  evento: { tag: 'Evento', tagColor: '#5F6DB3', tagTint: '#EDF1FF', dateColor: '#5F6DB3', dateTint: '#EDF1FF' },
  outros: { tag: 'Outros', tagColor: '#7C8397', tagTint: '#EEF0F6', dateColor: '#7C8397', dateTint: '#EEF0F6' },
};

const CALENDARIO_MONTH_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

function buildRealCalendarEvents(eventos: RhCalendarioEvento[]) {
  return eventos.reduce<Record<number, CalendarEvent[]>>((acc, evento) => {
    const inicio = new Date(evento.inicio_em);
    if (Number.isNaN(inicio.getTime())) return acc;

    const monthIndex = inicio.getMonth();
    const meta = CALENDARIO_TIPO_META[evento.tipo] ?? CALENDARIO_TIPO_META.outros;

    if (!acc[monthIndex]) acc[monthIndex] = [];

    acc[monthIndex].push({
      id: `rh-${evento.id}`,
      day: inicio.getDate(),
      monthShort: CALENDARIO_MONTH_SHORT[monthIndex],
      title: evento.titulo,
      time: evento.dia_inteiro
        ? 'Dia inteiro'
        : inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tag: meta.tag,
      tagColor: meta.tagColor,
      tagTint: meta.tagTint,
      dateTint: meta.dateTint,
      dateColor: meta.dateColor,
    });

    return acc;
  }, {});
}

function buildHolidayEvents(holidays: BrazilHolidayApiItem[]) {
  return holidays.reduce<Record<number, CalendarEvent[]>>((acc, holiday, index) => {
    const [year, month, day] = holiday.date.split('-').map(Number);
    const monthIndex = month - 1;

    if (!acc[monthIndex]) {
      acc[monthIndex] = [];
    }

    acc[monthIndex].push({
      id: `holiday-${year}-${month}-${day}-${index}`,
      day,
      monthShort: calendarMonthShortNames[monthIndex],
      title: holiday.name,
      time: 'Dia todo',
      ...holidayEventTheme,
    });

    return acc;
  }, {});
}

export const styles = StyleSheet.create({
  appShell: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  topBarContainer: {
    paddingHorizontal: 20,
    backgroundColor: '#F5F6FA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    position: 'relative',
    marginRight: 10,
  },
  brandMarkCompact: {
    width: 22,
    height: 34,
  },
  brandMarkExpanded: {
    width: 28,
    height: 42,
  },
  brandMarkRedPrimary: {
    position: 'absolute',
    left: 1,
    top: 0,
    width: 13,
    height: '100%',
    backgroundColor: '#F3062C',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    transform: [{ rotate: '14deg' }],
  },
  brandMarkRedSecondary: {
    position: 'absolute',
    left: 11,
    top: 6,
    width: 10,
    height: '78%',
    backgroundColor: '#D70428',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    transform: [{ rotate: '11deg' }],
  },
  brandMarkWhite: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 9,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 4,
    transform: [{ rotate: '-8deg' }],
  },
  brandTitle: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  brandTitleLight: {
    color: '#FFFFFF',
  },
  brandTitleDark: {
    color: '#23408F',
  },
  brandTitleCompact: {
    fontSize: 11,
    lineHeight: 12,
  },
  topLogo: {
    width: 132,
    height: 26,
  },
  topLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topLogoIcon: {
    width: 22,
    height: 34,
    marginRight: 8,
  },
  brandTitleFull: {
    fontSize: 17,
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  splashLogo: {
    width: 120,
    height: 88,
  },
  splashTitle: {
    marginTop: 18,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
  },
  splashSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    fontWeight: '600',
  },
  splashFooter: {
    alignItems: 'center',
    paddingBottom: 48,
  },
  loadingTrack: {
    width: 136,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  loadingFill: {
    width: 58,
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  splashWatermarkLogo: {
    position: 'absolute',
    right: -60,
    bottom: -50,
    width: 280,
    height: 280,
    opacity: 0.14,
    transform: [{ rotate: '-8deg' }],
  },
  loginHero: {
    paddingTop: 14,
    paddingBottom: 24,
    paddingHorizontal: 28,
    minHeight: 212,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  loginHeroBanner: {
    height: 212,
    overflow: 'hidden',
    backgroundColor: '#2B2464',
  },
  loginHeroBannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  forgotPasswordHero: {
    paddingTop: 14,
    paddingBottom: 26,
    paddingHorizontal: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  forgotPasswordBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  forgotPasswordBackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },
  forgotPasswordLockBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  forgotPasswordCardContent: {
    paddingBottom: 24,
  },
  forgotPasswordInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EDF2FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E1FB',
    padding: 14,
    marginTop: 16,
  },
  forgotPasswordInfoText: {
    flex: 1,
    color: '#3A4568',
    fontSize: 13,
    lineHeight: 19,
  },
  forgotPasswordSuccessBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E8F7EE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B4E3C8',
    padding: 14,
    marginTop: 16,
  },
  forgotPasswordSuccessText: {
    flex: 1,
    color: '#1E7E4D',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  forgotPasswordCancelButton: {
    marginTop: 12,
  },
  forgotPasswordHelpText: {
    color: '#C4899A',
    fontSize: 13,
    textAlign: 'center',
  },
  heroWatermarkLogo: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 220,
    height: 220,
    opacity: 0.16,
    transform: [{ rotate: '-8deg' }],
  },
  loginLogo: {
    width: 96,
    height: 52,
  },
  loginTitle: {
    marginTop: 14,
    maxWidth: '86%',
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
  },
  loginSubtitle: {
    marginTop: 6,
    maxWidth: '82%',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  loginCard: {
    flex: 1,
    marginTop: -2,
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  fieldLabel: {
    color: '#222B45',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  spacingTop: {
    marginTop: 20,
  },
  inputRow: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#111B37',
    fontSize: 16,
  },
  inputRightIcon: {
    marginLeft: 10,
  },
  loginOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  keepConnectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.4,
    borderColor: '#D2D7E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#E0002A',
    borderColor: '#E0002A',
  },
  keepConnectedText: {
    color: '#2A3150',
    fontSize: 15,
  },
  forgotPassword: {
    color: '#F3062C',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 22,
    minHeight: 58,
    borderRadius: 999,
    backgroundColor: '#EF002E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#EF002E',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EBEEF5',
  },
  orDividerText: {
    marginHorizontal: 16,
    color: '#A0A7BB',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    minHeight: 56,
    borderWidth: 1.2,
    borderColor: '#DCE1ED',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#2E468F',
    fontSize: 16,
    fontWeight: '800',
  },
  loginFooter: {
    paddingHorizontal: 24,
    paddingBottom: 22,
    alignItems: 'center',
  },
  loginFooterText: {
    color: '#9AA1B5',
    fontSize: 13,
  },
  deviceAuthContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  deviceAuthIconShell: {
    width: 84,
    height: 84,
    borderRadius: 999,
    backgroundColor: '#E9EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  deviceAuthTitle: {
    color: '#0C1736',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  deviceAuthSubtitle: {
    marginTop: 8,
    color: '#6E768D',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  deviceAuthButton: {
    marginTop: 32,
    alignSelf: 'stretch',
  },
  deviceAuthCancelButton: {
    marginTop: 18,
  },
  deviceAuthCancelText: {
    color: '#7C8397',
    fontSize: 14,
    fontWeight: '700',
  },
  twoFactorHeader: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 28,
  },
  twoFactorIconShell: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: '#E9EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  twoFactorTitle: {
    color: '#0C1736',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  twoFactorSubtitle: {
    marginTop: 8,
    color: '#6E768D',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  twoFactorCodeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 18,
  },
  twoFactorCodeBox: {
    width: 44,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: '#E2E6F0',
    backgroundColor: '#F7F8FB',
    color: '#15203E',
    fontSize: 20,
    fontWeight: '800',
  },
  twoFactorCodeBoxFilled: {
    borderColor: '#29448D',
    backgroundColor: '#EEF1FF',
  },
  twoFactorStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 28,
    minHeight: 18,
  },
  twoFactorStatusText: {
    color: '#8992A8',
    fontSize: 13,
  },
  twoFactorStatusTextSuccess: {
    color: '#18955A',
    fontSize: 13,
    fontWeight: '700',
  },
  twoFactorResendButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  twoFactorResendText: {
    color: '#29448D',
    fontSize: 14,
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 12,
  },
  sideMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  sideMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 24, 39, 0.34)',
  },
  sideMenuPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '79%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 8, height: 0 },
    elevation: 14,
  },
  sideMenuHeader: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 20,
  },
  sideMenuUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideMenuUserBadge: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sideMenuUserBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sideMenuUserText: {
    flex: 1,
    paddingRight: 8,
  },
  sideMenuUserName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sideMenuUserRole: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
  },
  sideMenuCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideMenuContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  sideMenuSection: {
    marginBottom: 18,
  },
  sideMenuSectionTitle: {
    marginBottom: 10,
    color: '#B1A9BF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  sideMenuItem: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  sideMenuItemActive: {
    backgroundColor: '#FBE8EC',
  },
  sideMenuItemText: {
    color: '#202944',
    fontSize: 16,
  },
  sideMenuItemTextActive: {
    color: '#E0002A',
    fontWeight: '700',
  },
  sideMenuFooter: {
    borderTopWidth: 1,
    borderTopColor: '#EDF0F6',
    paddingTop: 14,
    marginTop: 6,
  },
  sideMenuLogoutText: {
    color: '#E0002A',
    fontSize: 16,
    fontWeight: '700',
  },
  menuButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E4EE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationBellButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E4EE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  notificationBellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E6213D',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#F3062C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  avatarRH: {
    backgroundColor: '#1B6E3A',
  },
  avatarAdmin: {
    backgroundColor: '#1B2340',
  },
  rhBrandIconShell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1B6E3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rhBrandTitle: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  rhBrandSubtitle: {
    color: '#7C8397',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  adminBrandIconShell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1B2340',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBrandTitle: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  adminBrandSubtitle: {
    color: '#7C8397',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  panelHero: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 126,
    overflow: 'hidden',
  },
  panelWatermarkLogo: {
    position: 'absolute',
    right: -30,
    bottom: -30,
    width: 170,
    height: 170,
    opacity: 0.16,
    transform: [{ rotate: '-8deg' }],
  },
  panelGreeting: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontWeight: '600',
  },
  panelTitle: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
  },
  panelDescription: {
    marginTop: 4,
    maxWidth: '72%',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    marginHorizontal: -6,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  dashboardCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    minHeight: 118,
  },
  iconShell: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardCardValue: {
    marginTop: 10,
    color: '#131B36',
    fontSize: 18,
    fontWeight: '800',
  },
  dashboardCardLabel: {
    marginTop: 6,
    color: '#697187',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  dashboardCardCaption: {
    marginTop: 2,
    color: '#B18316',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    marginBottom: 12,
  },
  infoCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoCardTitle: {
    color: '#222B45',
    fontSize: 15,
    fontWeight: '800',
  },
  infoCardMeta: {
    marginTop: 12,
    color: '#7A829A',
    fontSize: 14,
  },
  infoCardValue: {
    marginTop: 4,
    color: '#0F1733',
    fontSize: 26,
    fontWeight: '800',
  },
  smallActionButton: {
    backgroundColor: '#EF002E',
    minWidth: 58,
    minHeight: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  smallActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listTitle: {
    color: '#222B45',
    fontSize: 14,
    fontWeight: '800',
  },
  listAction: {
    color: '#EF002E',
    fontSize: 13,
    fontWeight: '800',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  recentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  recentDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 8,
    marginRight: 12,
  },
  recentTextBlock: {
    flex: 1,
  },
  recentTitle: {
    color: '#1C233D',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  recentMeta: {
    marginTop: 2,
    color: '#7D849A',
    fontSize: 11,
  },
  pageHeader: {
    marginTop: 2,
    marginBottom: 12,
  },
  pageTitle: {
    color: '#0C1736',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  pageSubtitle: {
    marginTop: 2,
    color: '#7C8397',
    fontSize: 12,
  },
  uniformNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF6E9',
    borderWidth: 1,
    borderColor: '#F3DDB3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  uniformNoticeIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  uniformNoticeText: {
    flex: 1,
    color: '#8A5A16',
    fontSize: 13,
    lineHeight: 18,
  },
  uniformNoticeTextBold: {
    fontWeight: '700',
  },
  trainingCourseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 14,
  },
  trainingCourseBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingCourseBody: {
    flex: 1,
  },
  trainingCourseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  trainingCourseHeaderText: {
    flex: 1,
  },
  trainingCourseTitle: {
    color: '#10203F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  trainingCourseSubtitle: {
    marginTop: 3,
    color: '#677089',
    fontSize: 12,
    lineHeight: 16,
  },
  trainingTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  trainingTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  trainingCourseMeta: {
    marginTop: 8,
    color: '#3E4B6D',
    fontSize: 12,
    fontWeight: '700',
  },
  trainingCourseSummary: {
    marginTop: 6,
    color: '#75809A',
    fontSize: 12,
    lineHeight: 18,
  },
  trainingProgressRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trainingProgressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E7EAF1',
    overflow: 'hidden',
  },
  trainingProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  trainingProgressValue: {
    minWidth: 48,
    color: '#243252',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    flexShrink: 0,
  },
  trainingCourseFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainingCourseFooterText: {
    color: '#7C8397',
    fontSize: 12,
  },
  trainingCourseAction: {
    color: '#E0002A',
    fontSize: 12,
    fontWeight: '800',
  },
  trainingCourseTopBlock: {
    marginBottom: 16,
  },
  trainingCourseTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  trainingCourseTopProgress: {
    flexShrink: 1,
    color: '#E0002A',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  trainingCourseTopTitle: {
    marginTop: 10,
    color: '#10203F',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  trainingCourseTopSubtitle: {
    marginTop: 4,
    color: '#6F7890',
    fontSize: 13,
    lineHeight: 18,
  },
  trainingHero: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  trainingHeroGlow: {
    position: 'absolute',
    right: -10,
    top: -18,
    width: 118,
    height: 180,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderTopLeftRadius: 120,
    borderBottomLeftRadius: 120,
    transform: [{ rotate: '16deg' }],
  },
  trainingHeroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  trainingHeroSubtitle: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 17,
    maxWidth: '78%',
  },
  trainingHeroStats: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trainingHeroStat: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  trainingHeroDivider: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  trainingPlayerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    marginBottom: 12,
  },
  trainingPlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  trainingPlayerHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  trainingPlayerLabel: {
    color: '#98A0B6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  trainingPlayerTitle: {
    marginTop: 5,
    color: '#10203F',
    fontSize: 16,
    fontWeight: '800',
  },
  trainingPlayerTimePill: {
    borderRadius: 999,
    backgroundColor: '#F1F4FB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  trainingPlayerTimeText: {
    color: '#29448D',
    fontSize: 11,
    fontWeight: '800',
  },
  trainingExpandButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  trainingVideoMock: {
    height: 190,
    borderRadius: 20,
    backgroundColor: '#1E2B4E',
    marginTop: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingVideoPlayer: {
    height: 190,
    borderRadius: 20,
    backgroundColor: '#000000',
    marginTop: 14,
    overflow: 'hidden',
  },
  trainingVideoMockCenter: {
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  trainingVideoPlayButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#E0002A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  trainingVideoMockTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  trainingVideoMockSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  trainingPlayerActions: {
    marginTop: 12,
  },
  trainingCompletedButton: {
    marginTop: 0,
    minHeight: 58,
    borderRadius: 999,
    backgroundColor: '#18955A',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#18955A',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  trainingCompletedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  trainingPausedHint: {
    marginTop: 10,
    color: '#7A8299',
    fontSize: 12,
    lineHeight: 16,
  },
  trainingLessonsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  trainingSectionTitle: {
    color: '#10203F',
    fontSize: 16,
    fontWeight: '800',
  },
  trainingLessonRow: {
    minHeight: 76,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  trainingLessonRowActive: {
    backgroundColor: '#FAFBFE',
  },
  trainingLessonBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  trainingLessonLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainingLessonIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingLessonIconDone: {
    backgroundColor: '#18955A',
  },
  trainingLessonIconCurrent: {
    backgroundColor: '#E0002A',
  },
  trainingLessonIconDefault: {
    backgroundColor: '#F2F4F9',
  },
  trainingLessonTextBlock: {
    flex: 1,
  },
  trainingLessonTitle: {
    color: '#15203E',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  trainingLessonSubtitle: {
    marginTop: 3,
    color: '#798198',
    fontSize: 12,
    lineHeight: 16,
  },
  trainingLessonStatus: {
    marginTop: 4,
    color: '#E0002A',
    fontSize: 11,
    fontWeight: '800',
  },
  trainingLessonStatusDone: {
    color: '#18955A',
  },
  trainingLessonPercent: {
    color: '#798198',
    fontSize: 12,
    fontWeight: '700',
  },
  trainingVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 30,
  },
  trainingVideoOverlaySafeArea: {
    flex: 1,
  },
  trainingVideoOverlayTapArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  trainingVideoOverlayTopControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 2,
  },
  trainingVideoOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainingVideoOverlayButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingVideoOverlayMeta: {
    flex: 1,
  },
  trainingVideoOverlayLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  trainingVideoOverlayTitle: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  trainingVideoOverlayTimePill: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 130,
  },
  trainingVideoOverlayTimeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  trainingVideoOverlayPlayer: {
    flex: 1,
    backgroundColor: '#1E2B4E',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trainingVideoOverlayCenter: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    pointerEvents: 'none',
  },
  trainingVideoOverlayBottomControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  trainingVideoOverlayPercent: {
    color: '#FFFFFF',
  },
  trainingExamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    marginBottom: 12,
  },
  trainingExamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  trainingExamSubtitle: {
    marginTop: 4,
    color: '#798198',
    fontSize: 12,
    lineHeight: 16,
  },
  trainingExamMeta: {
    marginTop: 10,
    marginBottom: 14,
    color: '#29448D',
    fontSize: 12,
    fontWeight: '700',
  },
  trainingDisabledButton: {
    opacity: 0.55,
  },
  trainingExamTimerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  trainingExamTimerLabel: {
    color: '#7C8397',
    fontSize: 12,
  },
  trainingExamTimerValue: {
    marginTop: 2,
    color: '#E0002A',
    fontSize: 28,
    fontWeight: '800',
  },
  trainingExamProgressBlock: {
    gap: 8,
  },
  trainingExamProgressLabel: {
    color: '#243252',
    fontSize: 12,
    fontWeight: '700',
  },
  trainingQuestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    marginBottom: 12,
  },
  trainingQuestionTitle: {
    color: '#10203F',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  trainingOptionCard: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  trainingOptionCardSelected: {
    borderColor: '#E0002A',
    backgroundColor: '#FFF5F7',
  },
  trainingOptionDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#C6CDDD',
    backgroundColor: '#FFFFFF',
  },
  trainingOptionDotSelected: {
    borderColor: '#E0002A',
    backgroundColor: '#E0002A',
  },
  trainingOptionText: {
    flex: 1,
    color: '#243252',
    fontSize: 13,
    lineHeight: 18,
  },
  trainingOptionTextSelected: {
    fontWeight: '700',
  },
  trainingExamButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  trainingResultContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trainingResultRing: {
    width: 152,
    height: 152,
    borderRadius: 999,
    borderWidth: 10,
    borderColor: '#EFEFF4',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 22,
  },
  trainingResultRingDot: {
    position: 'absolute',
    top: -5,
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  trainingResultRingInner: {
    alignItems: 'center',
  },
  trainingResultPercent: {
    color: '#0E214C',
    fontSize: 28,
    fontWeight: '800',
  },
  trainingResultScore: {
    marginTop: 4,
    color: '#78819A',
    fontSize: 12,
    fontWeight: '700',
  },
  trainingResultBadge: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  trainingResultBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  trainingResultTitle: {
    marginTop: 18,
    color: '#0E214C',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  trainingResultDescription: {
    marginTop: 8,
    color: '#707A96',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  trainingResultTimeoutLabel: {
    marginTop: 12,
    color: '#E0002A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  trainingResultButtons: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  trainingResultLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  trainingResultLinkText: {
    color: '#6E768D',
    fontSize: 15,
    fontWeight: '700',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 12,
    gap: 12,
  },
  calendarHeaderText: {
    flex: 1,
  },
  calendarHeaderControls: {
    alignItems: 'flex-end',
    gap: 8,
  },
  calendarViewButton: {
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E4EE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarViewButtonText: {
    color: '#5C6580',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarArrowGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  calendarArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E4EE',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarArrowButtonDisabled: {
    opacity: 0.7,
  },
  calendarSectionTitle: {
    color: '#9AA1B5',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  calendarEventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 18,
  },
  calendarEmptyText: {
    color: '#7C8397',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  calendarDateBadge: {
    width: 48,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  calendarDateDay: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  calendarDateMonth: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
  },
  calendarEventContent: {
    flex: 1,
  },
  calendarEventTitle: {
    color: '#15203E',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  calendarEventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  calendarEventTime: {
    color: '#6E768D',
    fontSize: 12,
  },
  calendarEventTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  calendarEventTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  calendarMonthPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    marginTop: 4,
  },
  calendarMonthTitle: {
    color: '#15203E',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'lowercase',
    marginBottom: 18,
  },
  calendarWeekDaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarWeekDayLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#5C6580',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarDayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayContent: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  calendarDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCircleSelected: {
    backgroundColor: '#C98FDD',
  },
  calendarDayText: {
    color: '#15203E',
    fontSize: 14,
  },
  calendarDayTextMuted: {
    color: '#B0B6C5',
  },
  calendarDayTextSelected: {
    color: '#1F1733',
    fontWeight: '700',
  },
  calendarDayDotsRow: {
    minHeight: 10,
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  calendarDayDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  calendarMonthEvents: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F6',
  },
  calendarMonthEventsTitle: {
    color: '#8A91A6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  calendarMonthEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarMonthEventDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  calendarMonthEventText: {
    flex: 1,
    color: '#33405F',
    fontSize: 12,
    lineHeight: 17,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalTitle: {
    flex: 1,
    color: '#15203E',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  goalPercent: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
  },
  goalSubtitle: {
    marginTop: 4,
    color: '#6F7890',
    fontSize: 12,
    lineHeight: 16,
  },
  goalTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E7EAF1',
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 999,
  },
  benefitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  benefitGridItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  benefitCard: {
    minHeight: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
  },
  benefitTitle: {
    marginTop: 12,
    color: '#15203E',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  benefitSubtitle: {
    marginTop: 3,
    color: '#6F7890',
    fontSize: 12,
    lineHeight: 16,
  },
  uniformCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  uniformLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uniformTextBlock: {
    flex: 1,
  },
  uniformTitle: {
    color: '#15203E',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  uniformSubtitle: {
    marginTop: 3,
    color: '#6F7890',
    fontSize: 12,
    lineHeight: 16,
  },
  uniformCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C7CDDB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uniformCheckboxChecked: {
    borderColor: '#18955A',
    backgroundColor: '#18955A',
  },
  uniformRecebidoRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uniformRecebidoText: {
    color: '#7C8397',
    fontSize: 12,
    fontWeight: '600',
  },
  reimbursementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  reimbursementTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  reimbursementTitle: {
    flex: 1,
    color: '#15203E',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  reimbursementAmount: {
    color: '#15203E',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
  },
  reimbursementBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reimbursementDate: {
    color: '#7C8397',
    fontSize: 12,
    lineHeight: 16,
  },
  payrollCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF0F6',
    padding: 16,
    marginBottom: 14,
    flexDirection: 'column',
    gap: 16,
    shadowColor: '#1B2340',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  payrollCardFirst: {
    marginTop: 2,
  },
  payrollTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  payrollTextBlock: {
    flex: 1,
  },
  payrollActionsColumn: {
    flexDirection: 'column',
    gap: 10,
  },
  payrollIconButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  payrollIconButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#F4F5FA',
  },
  payrollIconButtonText: {
    color: '#4F5873',
    fontSize: 13,
    fontWeight: '700',
  },
  payrollAwareButton: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  payrollAwareButtonFullWidth: {
    alignSelf: 'stretch',
  },
  payrollAwareButtonPending: {
    backgroundColor: '#23A365',
    shadowColor: '#23A365',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  payrollAwareButtonChecked: {
    backgroundColor: '#E8F7EE',
    borderColor: '#B4E3C8',
  },
  payrollAwareButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  payrollAwareButtonTextPending: {
    color: '#FFFFFF',
  },
  payrollAwareButtonTextChecked: {
    color: '#1E7E4D',
  },
  payrollTitle: {
    color: '#15203E',
    fontSize: 16,
    fontWeight: '800',
  },
  statusPill: {
    minWidth: 56,
    flexShrink: 0,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  iconAccentRed: {
    backgroundColor: '#FCE8EC',
  },
  iconAccentGray: {
    backgroundColor: '#F1F2F7',
  },
  iconAccentGreen: {
    backgroundColor: '#E3F5EA',
  },
  approvalsPendingSubtitle: {
    marginTop: 2,
    color: '#3457D5',
    fontSize: 12,
    fontWeight: '700',
  },
  approvalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF0F6',
    padding: 16,
    marginBottom: 14,
    flexDirection: 'column',
    gap: 14,
    shadowColor: '#1B2340',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  approvalTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  approvalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#E9EBF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalAvatarText: {
    color: '#4C5470',
    fontSize: 13,
    fontWeight: '800',
  },
  approvalTextBlock: {
    flex: 1,
  },
  approvalName: {
    color: '#15203E',
    fontSize: 15,
    fontWeight: '800',
  },
  approvalDescription: {
    marginTop: 2,
    color: '#7C8397',
    fontSize: 13,
  },
  approvalTag: {
    flexShrink: 0,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  approvalTagText: {
    fontSize: 12,
    fontWeight: '800',
  },
  approvalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  approvalApproveButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EF002E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF002E',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  approvalApproveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  approvalRejectButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalRejectButtonText: {
    color: '#3A415C',
    fontSize: 14,
    fontWeight: '800',
  },
  approvalDecisionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 40,
    borderRadius: 14,
  },
  approvalDecisionBadgeApproved: {
    backgroundColor: '#E8F7EE',
  },
  approvalDecisionBadgeRejected: {
    backgroundColor: '#FBE9EC',
  },
  approvalDecisionBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  notificationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF0F6',
    paddingHorizontal: 14,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  notificationRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  notificationTextBlock: {
    flex: 1,
  },
  notificationTitle: {
    color: '#15203E',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  notificationTime: {
    marginTop: 3,
    color: '#8992A8',
    fontSize: 12,
  },
  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E6213D',
    flexShrink: 0,
  },
  requestsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 16,
  },
  requestsOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF002E',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#EF002E',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  requestsOpenButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF0F6',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1B2340',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  requestTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  requestTicketNumber: {
    color: '#9AA1B5',
    fontSize: 12,
    fontWeight: '700',
  },
  requestTitle: {
    color: '#15203E',
    fontSize: 16,
    fontWeight: '800',
  },
  requestMeta: {
    marginTop: 4,
    color: '#7C8397',
    fontSize: 13,
  },
  requestModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 18, 34, 0.48)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  requestModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    maxHeight: '88%',
  },
  requestModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  requestModalTitle: {
    flex: 1,
    color: '#15203E',
    fontSize: 20,
    fontWeight: '800',
  },
  requestFieldBlock: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 16,
  },
  requestFieldLabel: {
    color: '#2A3150',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  requestSelectBox: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  requestSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestCategoryDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  requestSelectText: {
    color: '#15203E',
    fontSize: 15,
  },
  requestCategoryDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: '#F7F8FB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingVertical: 6,
    shadowColor: '#1B2340',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  requestCategoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  requestCategoryOptionSelected: {
    backgroundColor: '#E8F7EE',
  },
  requestCategoryOptionCheck: {
    width: 16,
  },
  requestCategoryOptionText: {
    flex: 1,
    color: '#2A3150',
    fontSize: 15,
  },
  requestCategoryOptionTextSelected: {
    color: '#1E7E4D',
    fontWeight: '700',
  },
  requestCategoryOptionEmoji: {
    fontSize: 14,
  },
  requestDescriptionInput: {
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    color: '#15203E',
    fontSize: 15,
    padding: 14,
    marginBottom: 16,
  },
  requestAttachmentsSection: {
    marginBottom: 20,
  },
  requestUploadBox: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: '#D2D7E5',
    backgroundColor: '#FAFBFD',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  requestAttachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  requestAttachmentThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'visible',
  },
  requestAttachmentImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#EEF0F6',
  },
  requestAttachmentRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#C81E3A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  requestUploadText: {
    flexShrink: 1,
    color: '#7A8299',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  requestSubmitButton: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: '#EF002E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF002E',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  requestSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  payslipModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 18, 34, 0.48)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  payslipModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  payslipModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    flexShrink: 0,
  },
  payslipModalHeaderTextBlock: {
    flex: 1,
  },
  payslipModalTitle: {
    color: '#15203E',
    fontSize: 22,
    fontWeight: '800',
  },
  payslipModalSubtitle: {
    marginTop: 4,
    color: '#7C8397',
    fontSize: 13,
    lineHeight: 18,
  },
  payslipModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  payslipPreviewShell: {
    flex: 1,
    minHeight: 0,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D6E3',
    backgroundColor: '#1C212F',
  },
  payslipPreviewToolbar: {
    minHeight: 52,
    flexShrink: 0,
    backgroundColor: '#333845',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    gap: 12,
  },
  payslipPreviewToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  payslipPreviewToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  payslipPreviewToolbarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  payslipZoomButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  payslipPreviewBody: {
    flex: 1,
    backgroundColor: '#2B313F',
  },
  payslipPreviewBodyContent: {
    padding: 16,
  },
  payslipPreviewPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
  },
  payslipPaperCompany: {
    color: '#161616',
    fontSize: 13,
    fontWeight: '700',
  },
  payslipPaperPeriod: {
    marginTop: 4,
    color: '#161616',
    fontSize: 12,
    fontWeight: '600',
  },
  payslipPaperEmployee: {
    marginTop: 8,
    color: '#161616',
    fontSize: 12,
    fontWeight: '700',
  },
  payslipTableHeader: {
    marginTop: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#C9CDD7',
    flexDirection: 'row',
    alignItems: 'center',
  },
  payslipTableHeaderText: {
    color: '#161616',
    fontSize: 10,
    fontWeight: '700',
  },
  payslipTableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F7',
  },
  payslipTableCell: {
    color: '#1B2233',
    fontSize: 10,
    lineHeight: 14,
  },
  payslipCodeColumn: {
    width: 36,
  },
  payslipDescriptionColumn: {
    flex: 1,
    paddingRight: 8,
  },
  payslipReferenceColumn: {
    width: 64,
    textAlign: 'right',
  },
  payslipValueColumn: {
    width: 76,
    textAlign: 'right',
  },
  payslipSummaryRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#C9CDD7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  payslipSummaryLabel: {
    color: '#161616',
    fontSize: 12,
    fontWeight: '700',
  },
  payslipSummaryValue: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  communicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  communicationTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communicationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  communicationTime: {
    color: '#9BA2B7',
    fontSize: 11,
    fontWeight: '600',
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#EF002E',
  },
  communicationTitle: {
    marginTop: 10,
    color: '#1A223D',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  communicationDescription: {
    marginTop: 6,
    color: '#6E768D',
    fontSize: 12,
    lineHeight: 18,
  },
  profileSummaryHero: {
    marginTop: 2,
    marginBottom: 14,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileSummaryWaveOne: {
    position: 'absolute',
    right: 18,
    top: -24,
    width: 78,
    height: 168,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderTopLeftRadius: 90,
    borderBottomLeftRadius: 90,
    transform: [{ rotate: '18deg' }],
  },
  profileSummaryWaveTwo: {
    position: 'absolute',
    right: 42,
    top: -6,
    width: 30,
    height: 144,
    backgroundColor: 'rgba(85,0,45,0.18)',
    borderTopLeftRadius: 40,
    borderBottomLeftRadius: 40,
    transform: [{ rotate: '18deg' }],
  },
  profileSummaryBadge: {
    width: 58,
    height: 58,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileSummaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  profileSummaryTextBlock: {
    flex: 1,
  },
  profileSummaryName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  profileSummaryRole: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  profileSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  profileMenuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  profileMenuRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileMenuBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  profileMenuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  profileMenuLabel: {
    color: '#202944',
    fontSize: 16,
    fontWeight: '700',
  },
  profileMenuAccent: {
    color: '#E0002A',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  profileFieldRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  profileFieldBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  profileFieldLabel: {
    color: '#7A8299',
    fontSize: 14,
    flex: 1,
  },
  profileFieldValue: {
    color: '#202944',
    fontSize: 14,
    flex: 1.2,
    textAlign: 'right',
  },
  profileBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: 8,
  },
  profileBackText: {
    color: '#29448D',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  profileDetailHeader: {
    marginBottom: 12,
  },
  profileDetailTitle: {
    color: '#081938',
    fontSize: 22,
    fontWeight: '800',
  },
  profileDetailSubtitle: {
    marginTop: 2,
    color: '#6E768D',
    fontSize: 14,
  },
  profileDetailRow: {
    paddingVertical: 14,
  },
  profileDetailLabel: {
    color: '#A0A7BB',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '700',
  },
  profileDetailValue: {
    color: '#111B37',
    fontSize: 15,
    lineHeight: 21,
  },
  profileCardNote: {
    marginTop: 18,
    marginBottom: 18,
    color: '#5D6882',
    fontSize: 13,
    lineHeight: 20,
  },
  profileFooterNote: {
    color: '#5D6882',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  profileLogoutButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1.4,
    borderColor: '#F04E66',
    backgroundColor: '#FFF4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLogoutButtonText: {
    color: '#E0002A',
    fontSize: 17,
    fontWeight: '800',
  },
  securityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    marginBottom: 20,
    gap: 16,
  },
  passwordFieldBlock: {
    gap: 8,
  },
  passwordFieldLabel: {
    color: '#2A3150',
    fontSize: 13,
    fontWeight: '700',
  },
  passwordFieldRow: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#F7F8FB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  passwordFieldInput: {
    flex: 1,
    color: '#15203E',
    fontSize: 15,
    paddingVertical: 12,
  },
  toggleTrack: {
    width: 46,
    height: 27,
    borderRadius: 999,
    backgroundColor: '#E2E6F0',
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: '#E0002A',
  },
  toggleKnob: {
    width: 21,
    height: 21,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  securityToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 16,
  },
  securityToggleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  securityToggleTextBlock: {
    flex: 1,
  },
  securityToggleTitle: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '700',
  },
  securityToggleSubtitle: {
    marginTop: 2,
    color: '#7C8397',
    fontSize: 12,
  },
  directorBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directorBrandIconShell: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#E6213D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directorBrandIcon: {
    width: 24,
    height: 34,
  },
  directorBrandTitle: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  directorBrandSubtitle: {
    color: '#9AA1B5',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    lineHeight: 12,
  },
  directorBrandTitleLight: {
    color: '#FFFFFF',
  },
  directorBrandSubtitleLight: {
    color: 'rgba(255,255,255,0.72)',
  },
  heroTopBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  directorSectionTitle: {
    color: '#B71C3D',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 10,
  },
  directorHero: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    overflow: 'hidden',
  },
  directorHeroWaveOne: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  directorHeroWaveTwo: {
    position: 'absolute',
    right: -10,
    bottom: -60,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  directorHeroGreeting: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  directorHeroTitle: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
  },
  directorHeroSubtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  directorTotalCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
  },
  directorTotalLabel: {
    color: '#7C8397',
    fontSize: 12,
    fontWeight: '700',
  },
  directorTotalValue: {
    marginTop: 4,
    color: '#0C1736',
    fontSize: 26,
    fontWeight: '800',
  },
  directorTotalMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directorTotalMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  directorTotalMetaBadgeText: {
    color: '#18955A',
    fontSize: 13,
    fontWeight: '800',
  },
  directorTotalMetaNote: {
    color: '#9AA1B5',
    fontSize: 12,
  },
  directorSplitRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  directorSplitCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
  },
  directorSplitLabel: {
    color: '#7C8397',
    fontSize: 12,
    fontWeight: '700',
  },
  directorSplitValue: {
    marginTop: 4,
    color: '#0C1736',
    fontSize: 18,
    fontWeight: '800',
  },
  directorSplitMeta: {
    marginTop: 4,
    color: '#18955A',
    fontSize: 12,
    fontWeight: '700',
  },
  directorAlertBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FBE7EB',
    borderRadius: 18,
    padding: 14,
  },
  directorAlertTextBlock: {
    flex: 1,
  },
  directorAlertTitle: {
    color: '#B71C3D',
    fontSize: 14,
    fontWeight: '800',
  },
  directorAlertSubtitle: {
    marginTop: 2,
    color: '#8C4650',
    fontSize: 12,
  },
  directorAlertButton: {
    backgroundColor: '#E6213D',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  directorAlertButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  directorPanelCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    minHeight: 118,
  },
  directorPanelLabel: {
    marginTop: 10,
    color: '#15203E',
    fontSize: 15,
    fontWeight: '800',
  },
  directorPanelSubtitle: {
    marginTop: 2,
    color: '#8992A8',
    fontSize: 12,
  },
  directorProfileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  directorProfileBadge: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directorProfileBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  directorProfileName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  directorProfileRole: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  directorProfileCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 16,
  },
  directorProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  directorProfileRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  directorProfileLabel: {
    color: '#A9714F',
    fontSize: 13,
    fontWeight: '700',
  },
  directorProfileValue: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  directorLogoutButton: {
    marginTop: 20,
    backgroundColor: '#FCE8EC',
    borderWidth: 1,
    borderColor: '#F3C0C9',
    borderRadius: 999,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directorLogoutButtonText: {
    color: '#E6213D',
    fontSize: 15,
    fontWeight: '800',
  },
  switchPanelButton: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#EEF1FB',
    borderWidth: 1,
    borderColor: '#D6DCF2',
    borderRadius: 999,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchPanelButtonText: {
    color: '#29448D',
    fontSize: 15,
    fontWeight: '800',
  },
  selectPanelHero: {
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  selectPanelHeroIconShell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  selectPanelHeroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  selectPanelHeroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
  },
  selectPanelList: {
    padding: 20,
    gap: 14,
  },
  selectPanelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#1B2340',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  selectPanelCardPressed: {
    opacity: 0.85,
  },
  selectPanelIconShell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectPanelBody: {
    flex: 1,
  },
  selectPanelTitle: {
    color: '#202944',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  selectPanelSubtitle: {
    color: '#767E96',
    fontSize: 13,
    lineHeight: 18,
  },
  selectPanelChevronShell: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directorPageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  directorPageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  directorFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  directorFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F2F7',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  directorFilterPillText: {
    color: '#4C5470',
    fontSize: 13,
    fontWeight: '700',
  },
  directorFlashTitle: {
    color: '#15203E',
    fontSize: 16,
    fontWeight: '800',
  },
  directorFlashSubtitle: {
    marginTop: 2,
    color: '#7C8397',
    fontSize: 12,
  },
  directorSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 10,
  },
  directorSummaryLeft: {
    flex: 1,
  },
  directorSummaryLabel: {
    color: '#7C8397',
    fontSize: 12,
    fontWeight: '700',
  },
  directorSummaryValue: {
    marginTop: 4,
    color: '#0C1736',
    fontSize: 18,
    fontWeight: '800',
  },
  directorSummaryMeta: {
    marginTop: 2,
    color: '#8992A8',
    fontSize: 12,
  },
  directorSummaryPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  directorSummaryPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  fuelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
  },
  fuelCardLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  fuelCardValue: {
    marginTop: 4,
    color: '#0C1736',
    fontSize: 18,
    fontWeight: '800',
  },
  fuelCardMeta: {
    marginTop: 4,
    color: '#8992A8',
    fontSize: 12,
  },
  fuelCardMargin: {
    marginTop: 4,
    color: '#18955A',
    fontSize: 12,
    fontWeight: '800',
  },
  directorUpdatedAt: {
    marginTop: 6,
    textAlign: 'right',
    color: '#9AA1B5',
    fontSize: 11,
  },
  marginAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6213D',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  marginAlertPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  marginPeriodLabelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  marginCategoryCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
  },
  marginCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  marginCategoryTitle: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  marginCategoryAverage: {
    color: '#3457D5',
    fontSize: 12,
    fontWeight: '700',
  },
  marginStationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F7',
  },
  marginRank: {
    width: 22,
    color: '#9AA1B5',
    fontSize: 12,
    fontWeight: '700',
  },
  marginStationTextBlock: {
    flex: 1,
  },
  marginStationName: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  marginStationPulledBy: {
    marginTop: 2,
    color: '#8992A8',
    fontSize: 11,
  },
  marginStationRight: {
    alignItems: 'flex-end',
  },
  marginStationPercentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  marginStationDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  marginStationPercent: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  marginStationDelta: {
    marginTop: 2,
    color: '#E6213D',
    fontSize: 11,
    fontWeight: '700',
  },
  marginCategoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F7',
  },
  marginCategoryFooterOffenders: {
    color: '#8992A8',
    fontSize: 12,
  },
  marginCategoryFooterImpact: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '800',
  },
  unrecognizedSectionSubtitle: {
    marginTop: -6,
    marginBottom: 10,
    color: '#8992A8',
    fontSize: 12,
  },
  unrecognizedActionsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    marginBottom: 14,
  },
  unrecognizedActionButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D8DCE6',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  unrecognizedActionButtonText: {
    flexShrink: 1,
    color: '#3A415C',
    fontSize: 12,
    fontWeight: '700',
  },
  unrecognizedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
  },
  unrecognizedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unrecognizedStationName: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  unrecognizedSeverityPill: {
    backgroundColor: '#FCE8EC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  unrecognizedSeverityPillText: {
    color: '#E6213D',
    fontSize: 11,
    fontWeight: '800',
  },
  unrecognizedProductLabel: {
    marginTop: 6,
    color: '#7C8397',
    fontSize: 12,
  },
  unrecognizedStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F7',
  },
  unrecognizedStatBlock: {
    width: '33%',
    alignItems: 'flex-start',
  },
  unrecognizedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  unrecognizedStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  unrecognizedStatLabel: {
    color: '#9AA1B5',
    fontSize: 11,
    fontWeight: '700',
  },
  unrecognizedStatValue: {
    marginTop: 3,
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  unrecognizedStatValueDanger: {
    color: '#E6213D',
  },
  unrecognizedButton: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8DCE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unrecognizedButtonText: {
    color: '#3A415C',
    fontSize: 14,
    fontWeight: '800',
  },
  stockSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  stockSectionTitle: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  stockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
  },
  stockCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockCardTitle: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  stockStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stockStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stockCardSubtitle: {
    marginTop: 4,
    color: '#8992A8',
    fontSize: 12,
  },
  stockCardValue: {
    marginTop: 6,
    color: '#0C1736',
    fontSize: 15,
    fontWeight: '800',
  },
  stockProgressTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EEF0F6',
    overflow: 'hidden',
  },
  stockProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  stockConsumptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stockConsumptionLabel: {
    color: '#7C8397',
    fontSize: 12,
  },
  stockConsumptionValue: {
    color: '#9AA1B5',
    fontSize: 12,
    fontWeight: '700',
  },
  stockSnapshotBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FCF4DE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  stockSnapshotBadgeText: {
    color: '#B7791F',
    fontSize: 10,
    fontWeight: '800',
  },
  stockSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  stockSummaryCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
  },
  stockToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F6',
  },
  stockToggleRowText: {
    flex: 1,
    color: '#3457D5',
    fontSize: 11,
    fontWeight: '800',
    marginRight: 8,
  },
  stockCriticalTable: {
    marginTop: 8,
  },
  stockCriticalTableMeta: {
    color: '#8992A8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  stockCriticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F3F8',
    gap: 8,
  },
  stockCriticalRank: {
    color: '#9AA1B5',
    fontSize: 11,
    fontWeight: '800',
    width: 22,
  },
  stockCriticalTextBlock: {
    flex: 1,
  },
  stockCriticalName: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '700',
  },
  stockCriticalMeta: {
    color: '#8992A8',
    fontSize: 11,
    marginTop: 2,
  },
  stockCriticalRight: {
    alignItems: 'flex-end',
  },
  stockCriticalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockCriticalStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stockCriticalAutonomy: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  stockCriticalDelta: {
    color: '#E6213D',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  stationTankSectionTitle: {
    marginTop: 6,
    marginBottom: 10,
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  stationTankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
  },
  stationTankTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  stationTankNameBlock: {
    flex: 1,
  },
  stationTankName: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  stationTankCategory: {
    marginTop: 2,
    color: '#9AA1B5',
    fontSize: 11,
    fontWeight: '700',
  },
  stationTankCapacityLabel: {
    marginTop: 2,
    color: '#8992A8',
    fontSize: 12,
  },
  stationTankStatsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  stationTankStatBlock: {
    flex: 1,
    alignItems: 'flex-start',
  },
  stationTankStatBlockRight: {
    alignItems: 'flex-end',
  },
  stationTankStatValue: {
    marginTop: 3,
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  gnvStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  gnvStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
  },
  gnvStatLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gnvStatValue: {
    marginTop: 6,
    color: '#0C1736',
    fontSize: 18,
    fontWeight: '800',
  },
  gnvStatMeta: {
    marginTop: 4,
    color: '#8992A8',
    fontSize: 11,
  },
  gnvStatMetaStrong: {
    color: '#18955A',
    fontWeight: '800',
  },
  gnvChartCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
  },
  gnvChartTitle: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  gnvChartSubtitle: {
    marginTop: 2,
    color: '#9AA1B5',
    fontSize: 11,
  },
  gnvChartTooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#0C1736',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  gnvChartTooltipTitle: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '800',
  },
  gnvChartTooltipValue: {
    marginTop: 2,
    color: '#5E667D',
    fontSize: 11,
  },
  gnvChartTooltipValueNumber: {
    color: '#3457D5',
    fontWeight: '800',
  },
  gnvChartArea: {
    marginTop: 18,
    height: 90,
    justifyContent: 'space-between',
  },
  gnvChartLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gnvChartAxisLabel: {
    width: 30,
    color: '#B9C0D3',
    fontSize: 10,
  },
  gnvChartDashedLine: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: '#D8DCE6',
  },
  gnvChartBaseline: {
    height: 1,
    backgroundColor: '#EEF0F6',
  },
  gnvChartDot: {
    position: 'absolute',
    left: 34,
    bottom: 0,
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#3457D5',
  },
  gnvChartDateLabel: {
    marginTop: 6,
    marginLeft: 30,
    color: '#9AA1B5',
    fontSize: 11,
  },
  gnvReportCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
  },
  gnvReportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gnvReportTitle: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  gnvReportMeta: {
    color: '#9AA1B5',
    fontSize: 12,
  },
  gnvReportStatsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  gnvReportStatBlock: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderRadius: 14,
    paddingVertical: 12,
  },
  gnvReportStatTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  gnvReportStatDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  gnvReportStatLabel: {
    color: '#7C8397',
    fontSize: 12,
    fontWeight: '700',
  },
  gnvReportStatValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
  },
  gnvRiskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    marginBottom: 8,
  },
  gnvRiskTextBlock: {
    flex: 1,
  },
  gnvRiskName: {
    color: '#3457D5',
    fontSize: 13,
    fontWeight: '800',
  },
  gnvRiskMeta: {
    marginTop: 2,
    color: '#8992A8',
    fontSize: 11,
  },
  gnvRiskPercent: {
    color: '#E6213D',
    fontSize: 13,
    fontWeight: '800',
  },
  processNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6213D',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  processNewButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  processSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F2F7',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 14,
    marginBottom: 14,
  },
  processSearchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#15203E',
    fontSize: 14,
  },
  processCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  processTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  processTitle: {
    flex: 1,
    marginRight: 8,
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  processStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  processStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  processDescription: {
    marginTop: 6,
    color: '#7C8397',
    fontSize: 12,
  },
  processFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F7',
  },
  processFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  processDepartment: {
    color: '#3457D5',
    fontSize: 12,
    fontWeight: '700',
  },
  processOwner: {
    color: '#9AA1B5',
    fontSize: 12,
  },
  processSteps: {
    color: '#9AA1B5',
    fontSize: 12,
  },
  processPageTitleRow: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  processUpdatedAt: {
    color: '#9AA1B5',
    fontSize: 11,
  },
  processFilterWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  processEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingVertical: 28,
    alignItems: 'center',
  },
  processEmptyText: {
    color: '#9AA1B5',
    fontSize: 13,
    textAlign: 'center',
  },
  processTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  processTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F1F2F7',
  },
  processTabActive: {
    backgroundColor: '#FCE8EC',
  },
  processTabText: {
    color: '#5E667D',
    fontSize: 12,
    fontWeight: '700',
  },
  processTabTextActive: {
    color: '#E6213D',
  },
  processTextInput: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#15203E',
    fontSize: 14,
  },
  processTextArea: {
    minHeight: 90,
  },
  processDocumentationArea: {
    minHeight: 180,
  },
  processTagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processTagInput: {
    flex: 1,
  },
  processTagAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E6213D',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  processTagAddButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  processTagsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  processTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F2F7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  processTagChipText: {
    color: '#3A415C',
    fontSize: 12,
    fontWeight: '700',
  },
  processStepsListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    marginTop: 12,
  },
  processStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  processStepRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  processStepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#FCE8EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processStepNumberText: {
    color: '#E6213D',
    fontSize: 12,
    fontWeight: '800',
  },
  processStepTitle: {
    flex: 1,
    color: '#15203E',
    fontSize: 14,
    fontWeight: '600',
  },
  processAddStepButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D8DCE6',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  processAddStepButtonText: {
    color: '#3A415C',
    fontSize: 13,
    fontWeight: '700',
  },
  processStepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    marginBottom: 12,
  },
  processStepCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  processStepTitleInput: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 8,
  },
  processStepDescriptionInput: {
    minHeight: 60,
    fontSize: 13,
    marginBottom: 10,
  },
  processStepCardBottomRow: {
    flexDirection: 'row',
    gap: 8,
  },
  processStepOwnerBox: {
    flex: 1,
    minHeight: 44,
  },
  processStepDeadlineInput: {
    width: 110,
    minHeight: 44,
    paddingVertical: 10,
  },
  processFlowAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  processFlowAddButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  processFlowAddButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  processFlowList: {
    marginTop: 10,
  },
  processFlowNodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  processFlowNodeTextBlock: {
    flex: 1,
  },
  processFlowNodeType: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  processFlowNodeLabelInput: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  processFlowConnector: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  processFooterActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 4,
  },
  processSubmitButton: {
    backgroundColor: '#E6213D',
    borderColor: '#E6213D',
  },
  processSubmitButtonText: {
    color: '#FFFFFF',
  },
  directorNotifTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F2F7',
    borderRadius: 999,
    padding: 4,
    marginTop: 16,
    marginBottom: 16,
  },
  directorNotifTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
  },
  directorNotifTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#1B2340',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  directorNotifTabText: {
    color: '#8992A8',
    fontSize: 13,
    fontWeight: '700',
  },
  directorNotifTabTextActive: {
    color: '#15203E',
  },
  directorNotifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  directorNotifCountLabel: {
    flex: 1,
    color: '#E6213D',
    fontSize: 13,
    fontWeight: '700',
  },
  directorNotifNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
    backgroundColor: '#E6213D',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  directorNotifNewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  routineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  routineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineTitle: {
    flex: 1,
    marginRight: 8,
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  routineSubtitle: {
    marginTop: 4,
    color: '#7C8397',
    fontSize: 12,
  },
  routineTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    rowGap: 6,
    marginTop: 12,
  },
  routineTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  routineTagEvent: {
    backgroundColor: '#FCE8EC',
  },
  routineTagRecurring: {
    backgroundColor: '#EDF1FF',
  },
  routineTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  routineTagTextEvent: {
    color: '#E6213D',
  },
  routineTagTextRecurring: {
    color: '#3457D5',
  },
  routineChannelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routineChannelText: {
    color: '#7C8397',
    fontSize: 12,
  },
  routineAudience: {
    marginLeft: 'auto',
    color: '#9AA1B5',
    fontSize: 12,
  },
  routineTriggerDetail: {
    marginTop: 6,
    color: '#9AA1B5',
    fontSize: 11,
  },
  routineFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F7',
  },
  routineLastRunRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  routineLastRunText: {
    color: '#9AA1B5',
    fontSize: 11,
    flexShrink: 1,
  },
  routineActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  routineActionButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F8FB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  routineActiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routineActiveLabel: {
    color: '#3A415C',
    fontSize: 14,
    fontWeight: '700',
  },
  routineHelperText: {
    marginTop: 8,
    color: '#7C8397',
    fontSize: 12,
    lineHeight: 17,
  },
  cronPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  cronPresetChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cronPresetChipText: {
    color: '#4C5470',
    fontSize: 11.5,
    fontWeight: '600',
  },
  routineTriggerList: {
    marginTop: 10,
    gap: 8,
  },
  routineTriggerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 14,
    padding: 12,
  },
  routineTriggerOptionActive: {
    borderColor: '#E6213D',
    backgroundColor: '#FCF4F4',
  },
  routineTriggerIconShell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineTriggerIconShellActive: {
    backgroundColor: '#FCE8EC',
  },
  routineTriggerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  routineTriggerLabel: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  routineTriggerLabelActive: {
    color: '#E6213D',
  },
  routineTriggerDescription: {
    marginTop: 2,
    color: '#7C8397',
    fontSize: 11,
  },
  routineChannelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  routineChannelBox: {
    width: '31%',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  routineChannelBoxActive: {
    borderColor: '#18955A',
    backgroundColor: '#E8F7EE',
  },
  routineChannelBoxText: {
    color: '#5E667D',
    fontSize: 11,
    fontWeight: '700',
  },
  routineChannelBoxTextActive: {
    color: '#18955A',
  },
  routineCargoListCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  routineCargoScroll: {
    maxHeight: 220,
  },
  routineCargoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F7',
  },
  routineCargoLabel: {
    flex: 1,
    color: '#3A415C',
    fontSize: 13,
    fontWeight: '600',
  },
  routineSubmitButton: {
    marginBottom: 4,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  templateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateTitle: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  templateCode: {
    marginTop: 4,
    color: '#9AA1B5',
    fontSize: 12,
  },
  templateDescription: {
    marginTop: 4,
    color: '#4C5470',
    fontSize: 13,
  },
  templateTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  templateTag: {
    backgroundColor: '#EDF1FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  templateTagText: {
    color: '#3457D5',
    fontSize: 11,
    fontWeight: '700',
  },
  templateFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  directorFilterUntilText: {
    color: '#7C8397',
    fontSize: 13,
    fontWeight: '600',
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 18, 34, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  datePickerCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
  },
  datePickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  datePickerMonthLabel: {
    color: '#15203E',
    fontSize: 15,
    fontWeight: '800',
  },
  simpleListCard: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
  },
  // inline=true: usado por SimpleListModal/TemplatePickerModal quando abertos
  // de DENTRO de outro <Modal> já visível (ex.: NotificationRoutineFormModal)
  // — dois <Modal> nativos empilhados podem não repassar toque em alguns
  // aparelhos (mesmo bug já corrigido em RH.tsx/Administrador.tsx).
  inlinePickerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
    borderRadius: 24,
    overflow: 'hidden',
  },
  simpleListTitle: {
    color: '#15203E',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  simpleListScroll: {
    maxHeight: 320,
  },
  simpleListOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  simpleListOptionText: {
    color: '#3A415C',
    fontSize: 14,
    fontWeight: '600',
  },
  simpleListOptionTextActive: {
    color: '#E6213D',
    fontWeight: '800',
  },
  templateOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 6,
  },
  templateOptionRowActive: {
    backgroundColor: '#E6213D',
  },
  templateOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  templateOptionText: {
    color: '#3A415C',
    fontSize: 14,
    fontWeight: '700',
  },
  templateOptionTextActive: {
    color: '#FFFFFF',
  },
  stationMultiSelectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stationMultiSelectClearText: {
    color: '#E6213D',
    fontSize: 12,
    fontWeight: '700',
  },
  stationMultiSelectSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  stationMultiSelectSearchInput: {
    flex: 1,
    color: '#15203E',
    fontSize: 13,
    padding: 0,
  },
  stationMultiSelectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FCE8EC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  stationMultiSelectAllButtonActive: {
    backgroundColor: '#E6213D',
  },
  stationMultiSelectAllButtonText: {
    color: '#E6213D',
    fontSize: 14,
    fontWeight: '800',
  },
  stationMultiSelectAllButtonTextActive: {
    color: '#FFFFFF',
  },
  stationMultiSelectEmptyText: {
    color: '#9AA1B5',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  lowStockFilterCard: {
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
  },
  lowStockFilterTitle: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  lowStockTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F2F7',
    borderRadius: 999,
    padding: 4,
    marginTop: 10,
  },
  lowStockTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 999,
  },
  lowStockTabActive: {
    backgroundColor: '#E6213D',
  },
  lowStockTabText: {
    color: '#5E667D',
    fontSize: 12,
    fontWeight: '700',
  },
  lowStockTabTextActive: {
    color: '#FFFFFF',
  },
  lowStockCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  lowStockCheckboxLabel: {
    color: '#4C5470',
    fontSize: 13,
  },
  lowStockSummaryText: {
    marginTop: 12,
    color: '#4C5470',
    fontSize: 12,
    lineHeight: 17,
  },
  lowStockSummaryDanger: {
    color: '#E6213D',
    fontWeight: '800',
  },
  lowStockTopCategoriesText: {
    marginTop: 4,
    color: '#9AA1B5',
    fontSize: 12,
  },
  lowStockListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  lowStockRow: {
    paddingVertical: 12,
  },
  lowStockRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  lowStockRowTopLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  lowStockRowTitleBlock: {
    flex: 1,
  },
  lowStockRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  lowStockDismissButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lowStockToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F4F5F9',
  },
  lowStockToggleButtonText: {
    color: '#3457D5',
    fontSize: 12,
    fontWeight: '700',
  },
  lowStockProductName: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  lowStockStationName: {
    marginTop: 3,
    color: '#7C8397',
    fontSize: 12,
  },
  lowStockCategoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F2F7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  lowStockCategoryPillText: {
    color: '#4C5470',
    fontSize: 11,
    fontWeight: '700',
  },
  lowStockCompactStatsRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F4F5F9',
  },
  lowStockCompactStatBlock: {
    flex: 1,
    alignItems: 'flex-start',
  },
  lowStockExpandedStatsRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopColor: '#F4F5F9',
  },
  lowStockStatusWarningText: {
    color: '#B7791F',
  },
  lowStockEmptyText: {
    paddingVertical: 20,
    textAlign: 'center',
    color: '#9AA1B5',
    fontSize: 13,
  },
  lowStockPaginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  lowStockPageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lowStockPageButtonDisabled: {
    opacity: 0.5,
  },
  lowStockPageButtonText: {
    color: '#3A415C',
    fontSize: 13,
    fontWeight: '700',
  },
  lowStockPageButtonTextDisabled: {
    color: '#C8CEDD',
  },
  lowStockPageIndicator: {
    color: '#7C8397',
    fontSize: 12,
    fontWeight: '600',
  },

  // --- Fale com a Diretoria ---
  conversaStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 2,
  },
  conversaStatCard: {
    flexGrow: 1,
    minWidth: '22%',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  conversaStatValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2130',
  },
  conversaStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A8F9C',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  novaConversaButton: {
    marginTop: 16,
    backgroundColor: '#E0002A',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  novaConversaButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  conversaSearchRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  conversaSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1B2130',
  },
  conversaFilterRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  conversaFilterTab: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },
  conversaFilterTabActive: {
    backgroundColor: '#E0002A',
    borderColor: '#E0002A',
  },
  conversaFilterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B6472',
  },
  conversaFilterTabTextActive: {
    color: '#FFFFFF',
  },
  conversaEmptyText: {
    marginTop: 24,
    textAlign: 'center',
    color: '#9AA1B5',
    fontSize: 13,
  },
  conversaListItem: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    padding: 12,
    gap: 10,
  },
  conversaAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversaAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  conversaListItemBody: {
    flex: 1,
    gap: 3,
  },
  conversaListItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversaListItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2130',
    marginRight: 8,
  },
  conversaListItemTime: {
    fontSize: 11,
    color: '#9AA1B5',
  },
  conversaListItemPreview: {
    fontSize: 12,
    color: '#6B7280',
  },
  conversaListItemBottomRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  conversaStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  conversaStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  conversaUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0002A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  conversaUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  conversaModalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  conversaModalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  conversaModalCancelButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F4F5F9',
  },
  conversaModalCancelButtonText: {
    color: '#3A415C',
    fontWeight: '700',
    fontSize: 13,
  },
  conversaModalStartButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#E0002A',
  },
  conversaModalStartButtonDisabled: {
    opacity: 0.5,
  },
  conversaModalStartButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  conversaDetalheHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  conversaBackButton: {
    padding: 4,
  },
  conversaDetalheHeaderBody: {
    flex: 1,
    gap: 4,
  },
  conversaDetalheHeaderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B2130',
  },
  conversaMenuButton: {
    padding: 6,
  },
  conversaThreadScroll: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  conversaThreadContent: {
    padding: 16,
    paddingBottom: 24,
  },
  conversaDateSeparator: {
    alignSelf: 'center',
    backgroundColor: '#E9EBF1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginVertical: 10,
  },
  conversaDateSeparatorText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  conversaBubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  conversaBubbleIn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  conversaBubbleOut: {
    alignSelf: 'flex-end',
    backgroundColor: '#E0002A',
    borderBottomRightRadius: 4,
  },
  conversaBubbleText: {
    fontSize: 13,
    color: '#1B2130',
    lineHeight: 18,
  },
  conversaBubbleTextOut: {
    color: '#FFFFFF',
  },
  conversaBubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  conversaBubbleTime: {
    fontSize: 10,
    color: '#9AA1B5',
  },
  conversaBubbleTimeOut: {
    color: 'rgba(255,255,255,0.8)',
  },
  conversaInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
  },
  conversaInput: {
    flex: 1,
    backgroundColor: '#F4F5F9',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1B2130',
    maxHeight: 100,
  },
  conversaSendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0002A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversaAcoesCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  conversaAcoesHeader: {
    alignItems: 'center',
    marginBottom: 14,
    gap: 4,
  },
  conversaAcoesAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F4F5F9',
    marginBottom: 6,
  },
  conversaAcoesContactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B2130',
  },
  conversaAcoesContactSub: {
    fontSize: 12,
    color: '#9AA1B5',
  },
  conversaAcoesSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8F9C',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  conversaTagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  conversaTagInput: {
    flex: 1,
    backgroundColor: '#F4F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#1B2130',
  },
  conversaTagAddButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0002A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversaTagChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  conversaTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F4F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  conversaTagChipText: {
    fontSize: 12,
    color: '#3A415C',
    fontWeight: '600',
  },
  conversaNotasInput: {
    backgroundColor: '#F4F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1B2130',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  conversaAcoesDivider: {
    height: 1,
    backgroundColor: '#EEF0F4',
    marginVertical: 14,
  },
  conversaAcaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  conversaAcaoRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A415C',
  },
  conversaAcaoRowTextDanger: {
    color: '#E0002A',
  },
});
