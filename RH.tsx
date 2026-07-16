import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  styles,
  TopBar,
  ToggleSwitch,
  formatDateBR,
  rhUser,
  rhUserInitials,
  NotificationRoutineFormModal,
  TemplateFormModal,
  notificationAudienceOptions,
  notificationTriggerOptions,
  notificationChannelMeta,
} from './App';
import type {
  ScreenProps,
  NotificationRoutineItem,
  NotificationTemplateItem,
  NotificationChannels,
} from './App';
import {
  fetchRhColaboradores,
  fetchRhStats,
  fetchRhTurnover,
  fetchRhDashboardResumo,
  type RhColaboradorRaw,
  type RhStats,
  type RhTurnoverData,
  type RhDashboardResumo,
} from './api';

// ---------- Types ----------

type EmployeeStatus = 'ativo' | 'ferias' | 'afastado' | 'desligado';

export type Employee = {
  id: string;
  fullName: string;
  role: string;
  unit: string;
  setor: string;
  registration: string;
  codigoInterno: string;
  cpf: string;
  admissionLabel: string;
  status: EmployeeStatus;
  email: string;
  celular: string;
  salario: number;
  pendentesCount: number;
};

type TransferStatus = 'pendente' | 'aprovada' | 'efetivada';

type TransferItem = {
  id: string;
  employeeName: string;
  fromUnit: string;
  toUnit: string;
  status: TransferStatus;
  requestedAtLabel: string;
};

type AnnouncementCategory = 'RH' | 'SST' | 'DP';

type AnnouncementItem = {
  id: string;
  category: AnnouncementCategory;
  timeLabel: string;
  title: string;
  description: string;
  audienceLabel: string;
};

type TicketStatus = 'aberto' | 'em_andamento' | 'resolvido';

type RequestTicket = {
  id: string;
  code: string;
  title: string;
  requesterName: string;
  unit: string;
  timeLabel: string;
  status: TicketStatus;
};

type ImportRecordType = 'admissao' | 'desligamento';
type ImportRecordStatus = 'aplicado' | 'revisar' | 'erro';

type ImportRecord = {
  id: string;
  type: ImportRecordType;
  employeeName: string;
  timestampLabel: string;
  status: ImportRecordStatus;
};

type ImportedCsvFile = {
  name: string;
  uri: string;
  sizeLabel: string;
};

const colaboradoresCsvTemplate = `nome_completo,cpf,matricula,empresa_cnpj,empresa_nome,empresa,cargo,setor,posto_trabalho,email_pessoal,telefone,data_admissao,data_demissao,status,motivo_desligamento,salario_base,valor_rescisao_liquida
João da Silva,123.456.789-09,00123,12.345.678/0001-90,,Frentista,Operação,Posto Centro,joao@example.com,(11) 98888-7777,01/03/2024,,ativo,,"1800,00",
Maria Souza,987.654.321-00,00456,12.345.678/0001-90,,Frentista,Operação,Posto Centro,maria@example.com,(11) 97777-6666,15/06/2022,10/03/2026,desligado,sem justa causa,"1750,00","4500,00"`;

const colaboradoresCsvRules = [
  'nome_completo obrigatório. Empresa via empresa_cnpj (preferido) ou empresa_nome.',
  'Datas aceitam DD/MM/AAAA ou AAAA-MM-DD.',
  'status: ativo, afastado, férias, desligado.',
  'motivo_desligamento: pedido_demissao, sem_justa_causa, justa_causa, fim_contrato, experiencia, acordo, obito, rescicao_indireta, inadaptacao_aprendiz, aposentadoria.',
  'Status desligado exige data_demissao.',
  'Valores em reais aceitam 1750,00 ou 1750.00.',
];

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) {
    return 'Tamanho não informado';
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

// ---------- Mock data ----------
// KPIs, gráficos e rankings do Dashboard agora vêm de fetchRhDashboardResumo
// (real, calculado no af360-api). Os mocks antigos foram removidos.

const rhEmployees: Employee[] = [
  {
    id: 'emp-1',
    fullName: 'Adilson Bezerra do Nascimento',
    role: 'Frentista',
    unit: 'Auto Posto ML de Ana N.',
    setor: 'Funcionário',
    registration: '482000122',
    codigoInterno: 'AF000044',
    cpf: '000.000.000-00',
    admissionLabel: '05/11/2021',
    status: 'ativo',
    email: 'adilson.nascimento@rede.americanfuel.com.br',
    celular: '(21) 90000-0001',
    salario: 1621,
    pendentesCount: 2,
  },
  {
    id: 'emp-2',
    fullName: 'Adilson da Silva Tavares',
    role: 'Frentista',
    unit: 'Auto Posto Mem de Sá',
    setor: 'Funcionário',
    registration: '12403858428728',
    codigoInterno: 'AF000773',
    cpf: '038.584.287-28',
    admissionLabel: '19/08/2021',
    status: 'ativo',
    email: 'adilson.tavares@rede.americanfuel.com.br',
    celular: '(21) 97175-9759',
    salario: 1621,
    pendentesCount: 6,
  },
  {
    id: 'emp-3',
    fullName: 'Adriano Rodrigues Filho',
    role: 'Frentista',
    unit: 'Posto Marambaia',
    setor: 'Funcionário',
    registration: '17000145',
    codigoInterno: 'AF000369',
    cpf: '000.000.000-00',
    admissionLabel: '14/09/2023',
    status: 'ativo',
    email: 'adriano.filho@rede.americanfuel.com.br',
    celular: '(21) 90000-0003',
    salario: 1621,
    pendentesCount: 1,
  },
  {
    id: 'emp-4',
    fullName: 'Ailson José de Andrade',
    role: 'Gerente',
    unit: 'Posto Santa Clara',
    setor: 'Geral',
    registration: '440',
    codigoInterno: 'AF000142',
    cpf: '000.000.000-00',
    admissionLabel: '23/01/2019',
    status: 'ativo',
    email: 'ailson.andrade@rede.americanfuel.com.br',
    celular: '(21) 90000-0004',
    salario: 3200,
    pendentesCount: 0,
  },
  {
    id: 'emp-5',
    fullName: 'Alan dos Santos Sousa',
    role: 'Sub-gerente',
    unit: 'Posto Vianense',
    setor: 'Geral',
    registration: '621000144',
    codigoInterno: 'AF000303',
    cpf: '000.000.000-00',
    admissionLabel: '13/06/2023',
    status: 'ativo',
    email: 'alan.sousa@rede.americanfuel.com.br',
    celular: '(21) 90000-0005',
    salario: 2400,
    pendentesCount: 3,
  },
  {
    id: 'emp-6',
    fullName: 'Alan Duarte Rodrigues',
    role: 'Subgerente',
    unit: 'Posto Nota 1000 de Itab.',
    setor: 'Geral',
    registration: '555000190',
    codigoInterno: 'AF000236',
    cpf: '000.000.000-00',
    admissionLabel: '01/06/2024',
    status: 'ferias',
    email: 'alan.rodrigues@rede.americanfuel.com.br',
    celular: '(21) 90000-0006',
    salario: 2400,
    pendentesCount: 0,
  },
  {
    id: 'emp-7',
    fullName: 'Alan Gama da Silva',
    role: 'Frentista',
    unit: 'Daril Postos de Serviços',
    setor: 'Funcionário',
    registration: '114000119',
    codigoInterno: 'AF000835',
    cpf: '000.000.000-00',
    admissionLabel: '14/09/2023',
    status: 'afastado',
    email: 'alan.gama@rede.americanfuel.com.br',
    celular: '(21) 90000-0007',
    salario: 1621,
    pendentesCount: 1,
  },
];

const rhEmployeeStatusMeta: Record<EmployeeStatus, { label: string; color: string; tint: string }> = {
  ativo: { label: 'Ativo', color: '#18955A', tint: '#E3F5EA' },
  ferias: { label: 'Em férias', color: '#B07A1E', tint: '#FCEFDA' },
  afastado: { label: 'Afastado', color: '#9AA1B5', tint: '#F1F2F7' },
  desligado: { label: 'Desligado', color: '#E6213D', tint: '#FCE8EC' },
};

// ---------- RH real (rh_colaboradores via af360-api) ----------
// A tabela real tem ~87 colunas — só mapeamos as que a lista usa hoje.
// Qualquer status fora de ativo/ferias/afastado cai no balde "desligado",
// igual ao agrupamento visual do app (e do próprio site).

function mapStatusFromApi(raw: string | null | undefined): EmployeeStatus {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === 'ativo') return 'ativo';
  if (value === 'ferias' || value === 'férias') return 'ferias';
  if (value === 'afastado') return 'afastado';
  return 'desligado';
}

// Colunas "date" do Supabase vêm como texto date-only (ex: "2021-11-05"),
// sem timezone. Nunca usar `new Date(iso)` direto aqui — em horários da
// noite no Brasil isso rola pro dia anterior por causa do UTC. Extraímos os
// números da própria string.
function formatDateOnlyBR(raw: string | null | undefined): string {
  if (!raw) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return raw;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function mapRhColaboradorToEmployee(row: RhColaboradorRaw): Employee {
  const salarioRaw = row.salario_base;
  const salario = typeof salarioRaw === 'number' ? salarioRaw : Number(salarioRaw ?? 0) || 0;

  return {
    id: row.id,
    fullName: row.nome_completo ?? '(sem nome)',
    role: row.cargo ?? '—',
    unit: row.posto_trabalho ?? '—',
    setor: row.setor ?? '—',
    registration: row.matricula ?? '',
    codigoInterno: row.codigo_interno ?? '',
    cpf: row.cpf ?? '',
    admissionLabel: formatDateOnlyBR(row.data_admissao),
    status: mapStatusFromApi(row.status),
    email: row.email_corporativo ?? row.email_pessoal ?? '',
    celular: row.celular ?? row.whatsapp ?? '',
    salario,
    pendentesCount: 0,
  };
}

function computeRhStatsBreakdown(stats: RhStats | null) {
  const total = stats?.total ?? 0;
  const byStatus = stats?.by_status ?? {};
  const ativos = byStatus['ativo'] ?? 0;
  const ferias = (byStatus['ferias'] ?? 0) + (byStatus['férias'] ?? 0);
  const afastados = byStatus['afastado'] ?? 0;
  const desligados = Math.max(0, total - ativos - ferias - afastados);
  return { quadro: total, ativos, afastados, ferias, desligados };
}

const rhUnidadesList: string[] = [
  'Auto Posto ML de Ana N.',
  'Auto Posto Mem de Sá',
  'Posto Marambaia',
  'Posto Santa Clara',
  'Posto Vianense',
  'Posto Nota 1000 de Itab.',
  'Daril Postos de Serviços',
  'Frosinone Posto de GNV',
  'Posto Boa Viagem',
  'Posto Girassol de Vista Alegre',
];

const rhCargosList: string[] = [
  'Frentista',
  'Frentista Caixa',
  'Atendente',
  'Sub-gerente',
  'Subgerente',
  'Gerente',
  'Jovem Aprendiz - Frentista',
];

const rhSetoresList: string[] = ['Geral', 'Funcionário', 'Funcionários', 'Departamento Geral', 'Único', 'Sem setor'];

const rhDesligamentoMotivos: string[] = [
  'Sem justa causa',
  'Justa causa',
  'Pedido de demissão',
  'Fim do contrato de experiência',
];

const rhPromocaoMotivos: string[] = ['Promoção', 'Reajuste salarial', 'Mérito', 'Equiparação'];

const rhRateioOptions: string[] = ['Proporcional (dias)', 'Integral no mês', 'Próximo mês'];

const rhTransfers: TransferItem[] = [];

const rhAnnouncementMeta: Record<AnnouncementCategory, { color: string; tint: string }> = {
  RH: { color: '#3457D5', tint: '#E9EEFF' },
  SST: { color: '#B07A1E', tint: '#FCEFDA' },
  DP: { color: '#8A4FD1', tint: '#F2EAFC' },
};

const rhAnnouncements: AnnouncementItem[] = [
  {
    id: 'ann-1',
    category: 'RH',
    timeLabel: 'há 2 dias',
    title: 'Nova tabela de reajuste 2026',
    description: 'Confira os percentuais por cargo aplicados na folha de julho.',
    audienceLabel: 'Enviado a 56 unidades',
  },
  {
    id: 'ann-2',
    category: 'SST',
    timeLabel: 'há 5 dias',
    title: 'Campanha de segurança no trabalho',
    description: 'Uso obrigatório de EPIs em todas as unidades. Ciência até 15/07.',
    audienceLabel: 'Enviado a 968 colaboradores',
  },
  {
    id: 'ann-3',
    category: 'RH',
    timeLabel: 'há 1 semana',
    title: 'Programa de indicação premiada',
    description: 'Indique e ganhe bônus por contratação efetivada.',
    audienceLabel: 'Enviado a Todos os postos',
  },
];

const rhTicketStatusMeta: Record<TicketStatus, { label: string; color: string; tint: string }> = {
  aberto: { label: 'Aberto', color: '#3457D5', tint: '#E9EEFF' },
  em_andamento: { label: 'Em andamento', color: '#B07A1E', tint: '#FCEFDA' },
  resolvido: { label: 'Resolvido', color: '#18955A', tint: '#E3F5EA' },
};

const rhTicketStatusOrder: TicketStatus[] = ['aberto', 'em_andamento', 'resolvido'];

const rhTickets: RequestTicket[] = [
  {
    id: 'sl-2041',
    code: '#SL-2041',
    title: 'Segunda via de holerite',
    requesterName: 'Carlos Dias',
    unit: 'Posto Geriba',
    timeLabel: 'há 2 h',
    status: 'aberto',
  },
  {
    id: 'sl-2038',
    code: '#SL-2038',
    title: 'Declaração de vínculo',
    requesterName: 'Ana Souza',
    unit: 'Posto Monalisa',
    timeLabel: 'ontem',
    status: 'em_andamento',
  },
  {
    id: 'sl-2035',
    code: '#SL-2035',
    title: 'Atualização de dados bancários',
    requesterName: 'Pedro Lima',
    unit: 'Petromasa Irajá',
    timeLabel: 'há 3 dias',
    status: 'resolvido',
  },
  {
    id: 'sl-2030',
    code: '#SL-2030',
    title: 'Dúvida sobre vale-transporte',
    requesterName: 'Marina Reis',
    unit: 'Posto SG',
    timeLabel: 'há 4 dias',
    status: 'resolvido',
  },
];

const rhImportStats = { naFila: 0, pRevisar: 1, aplicados: 44, comErro: 0 };

const rhImportStatusMeta: Record<ImportRecordStatus, { label: string; color: string; tint: string }> = {
  aplicado: { label: 'Aplicado', color: '#18955A', tint: '#E3F5EA' },
  revisar: { label: 'A revisar', color: '#B07A1E', tint: '#FCEFDA' },
  erro: { label: 'Erro', color: '#E6213D', tint: '#FCE8EC' },
};

const rhImportTypeMeta: Record<ImportRecordType, { label: string; color: string; tint: string }> = {
  admissao: { label: 'Admissão', color: '#18955A', tint: '#E3F5EA' },
  desligamento: { label: 'Desligamento', color: '#E6213D', tint: '#FCE8EC' },
};

const rhImportRecords: ImportRecord[] = [
  { id: 'imp-1', type: 'desligamento', employeeName: 'Gabriela Cristina da Silva', timestampLabel: '26/06/2026 15:26', status: 'aplicado' },
  { id: 'imp-2', type: 'desligamento', employeeName: 'João Henrique M. de Souza', timestampLabel: '26/06/2026 15:26', status: 'aplicado' },
  { id: 'imp-3', type: 'desligamento', employeeName: 'Marcelo Arnaldo de Sá', timestampLabel: '26/06/2026 15:23', status: 'aplicado' },
  { id: 'imp-4', type: 'desligamento', employeeName: 'Renan Ruel L. Figueiredo', timestampLabel: '26/06/2026 15:26', status: 'aplicado' },
  { id: 'imp-5', type: 'desligamento', employeeName: 'Alfredo Ramos Vasques', timestampLabel: '25/06/2026 09:14', status: 'aplicado' },
];

const rhNotificationRoutines: NotificationRoutineItem[] = [
  {
    id: 'birthday-routine',
    title: 'Aniversariantes do dia',
    messageTitle: 'Feliz aniversário! 🎉',
    template: 'Mensagem customizada',
    message: 'Parabéns, {{nome}}! A American Fuel deseja um ótimo dia.',
    triggerKind: 'recorrente',
    cronSchedule: '0 8 * * *',
    eventCode: '',
    channels: { app: true, email: false, whatsapp: true },
    audienceType: 'todos',
    audienceCargos: [],
    lastRunLabel: '06/07/2026',
    enabled: true,
  },
  {
    id: 'experience-end-routine',
    title: 'Aviso de fim de experiência',
    messageTitle: 'Período de experiência terminando',
    template: 'Mensagem customizada',
    message: 'O período de experiência de {{nome}} encerra em {{data}}.',
    triggerKind: 'evento',
    cronSchedule: '',
    eventCode: 'Enviado quando faltam 7 dias para o fim do contrato de experiência',
    channels: { app: true, email: true, whatsapp: false },
    audienceType: 'cargo',
    audienceCargos: ['GERENTE DE POSTO'],
    lastRunLabel: '—',
    enabled: true,
  },
  {
    id: 'pending-docs-routine',
    title: 'Documentos pendentes',
    messageTitle: 'Você tem documentos pendentes',
    template: 'Mensagem customizada',
    message: 'Ainda faltam documentos para concluir sua admissão. Envie pelo app.',
    triggerKind: 'recorrente',
    cronSchedule: '0 9 * * 1',
    eventCode: '',
    channels: { app: true, email: false, whatsapp: false },
    audienceType: 'colaboradores',
    audienceCargos: [],
    lastRunLabel: '29/06/2026',
    enabled: false,
  },
];

const rhNotificationTemplates: NotificationTemplateItem[] = [
  {
    id: 'rh-birthday',
    title: 'Aniversário',
    code: 'rh_aniversario',
    messageTitle: 'Feliz aniversário! 🎉',
    message: 'Parabéns, {{nome}}! A American Fuel deseja um ótimo dia.',
    variables: ['nome'],
    isSystemDefault: true,
  },
  {
    id: 'rh-experience',
    title: 'Fim de experiência',
    code: 'rh_fim_experiencia',
    messageTitle: 'Período de experiência terminando',
    message: 'O período de experiência de {{nome}} encerra em {{data}}.',
    variables: ['nome', 'data'],
    isSystemDefault: true,
  },
];

// ---------- Small shared UI helpers ----------

function RHPageHeader({ icon, title, subtitle }: { icon: keyof typeof Feather.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.directorPageTitleRow}>
        <View style={[styles.iconShell, styles.iconAccentGreen]}>
          <Feather name={icon} size={18} color="#1B6E3A" />
        </View>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      {subtitle ? <Text style={[styles.pageSubtitle, rhStyles.pageHeaderSubtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

function buildLinePoints(values: number[], width: number, height: number, padding = 6) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (values.length - 1 || 1);

  return values.map((value, index) => {
    const x = padding + stepX * index;
    const y = padding + (1 - (value - min) / range) * (height - padding * 2);
    return { x, y };
  });
}

function RHSparkline({
  values,
  color,
  fillColor,
  labels,
  valueLabel = 'Valor',
  formatValue,
  selectedIndex,
  onSelectIndex,
}: {
  values: number[];
  color: string;
  fillColor?: string;
  labels?: string[];
  valueLabel?: string;
  formatValue?: (value: number) => string;
  selectedIndex?: number | null;
  onSelectIndex?: (index: number) => void;
}) {
  const width = 300;
  const height = 90;
  const points = buildLinePoints(values, width, height);
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  const isInteractive = Boolean(labels && onSelectIndex);
  const selectedPoint =
    isInteractive && selectedIndex !== null && selectedIndex !== undefined ? points[selectedIndex] : null;

  return (
    <View>
      <View style={rhStyles.chartTouchWrap}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {fillColor ? <Path d={areaPath} fill={fillColor} stroke="none" /> : null}
          <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} />
          {selectedPoint ? (
            <>
              <Line
                x1={selectedPoint.x}
                y1={0}
                x2={selectedPoint.x}
                y2={height}
                stroke="#9AA1B5"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <Circle cx={selectedPoint.x} cy={selectedPoint.y} r={4} fill={color} stroke="#FFFFFF" strokeWidth={2} />
            </>
          ) : null}
        </Svg>
        {isInteractive ? (
          <View style={rhStyles.chartTouchOverlay} pointerEvents="box-none">
            {values.map((_, index) => (
              <Pressable key={index} style={rhStyles.chartTouchSegment} onPress={() => onSelectIndex?.(index)} />
            ))}
          </View>
        ) : null}
      </View>

      {isInteractive && selectedIndex !== null && selectedIndex !== undefined ? (
        <RHChartTooltipCard
          title={labels![selectedIndex]}
          lines={[
            {
              label: valueLabel,
              value: formatValue ? formatValue(values[selectedIndex]) : values[selectedIndex],
              color,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

function RHHeadcountChart({
  values,
  labels,
  selectedIndex,
  onSelectIndex,
}: {
  values: number[];
  labels: string[];
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
}) {
  const width = 300;
  const height = 90;
  const points = buildLinePoints(values, width, height);
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : null;

  return (
    <View>
      <View style={rhStyles.chartTouchWrap}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <Path d={areaPath} fill="#DCF3E4" stroke="none" />
          <Path d={linePath} fill="none" stroke="#1B6E3A" strokeWidth={2.5} />
          {selectedPoint ? (
            <>
              <Line
                x1={selectedPoint.x}
                y1={0}
                x2={selectedPoint.x}
                y2={height}
                stroke="#9AA1B5"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <Circle cx={selectedPoint.x} cy={selectedPoint.y} r={4} fill="#1B6E3A" stroke="#FFFFFF" strokeWidth={2} />
            </>
          ) : null}
        </Svg>
        <View style={rhStyles.chartTouchOverlay} pointerEvents="box-none">
          {values.map((_, index) => (
            <Pressable key={index} style={rhStyles.chartTouchSegment} onPress={() => onSelectIndex(index)} />
          ))}
        </View>
      </View>

      {selectedIndex !== null ? (
        <RHChartTooltipCard
          title={labels[selectedIndex]}
          lines={[{ label: 'Headcount', value: values[selectedIndex], color: '#18955A' }]}
        />
      ) : null}
    </View>
  );
}

function RHChartTooltipCard({
  title,
  lines,
}: {
  title: string;
  lines: Array<{ label: string; value: number | string; color: string }>;
}) {
  return (
    <View style={rhStyles.chartTooltipCard}>
      <Text style={rhStyles.chartTooltipTitle}>{title}</Text>
      {lines.map((line) => (
        <Text key={line.label} style={[rhStyles.chartTooltipLine, { color: line.color }]}>
          {line.label} : {line.value}
        </Text>
      ))}
    </View>
  );
}

function RHRankBarList({ items, color }: { items: Array<{ label: string; value: number }>; color: string }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <View>
      {items.map((item, index) => (
        <View key={item.label} style={rhStyles.rankBarRow}>
          <View style={rhStyles.rankBarTopRow}>
            <Text style={rhStyles.rankNumber}>{index + 1}</Text>
            <Text style={rhStyles.rankBarLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={rhStyles.rankBarValue}>{item.value}</Text>
          </View>
          <View style={rhStyles.rankBarTrack}>
            <View
              style={[
                rhStyles.rankBarFill,
                { width: `${Math.max(4, (item.value / maxValue) * 100)}%`, backgroundColor: color },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function RHMultiLineChart({
  series,
  labels,
  formatValue,
  selectedIndex,
  onSelectIndex,
}: {
  series: Array<{ values: number[]; color: string; label: string; formatValue?: (value: number) => string }>;
  labels?: string[];
  formatValue?: (value: number) => string;
  selectedIndex?: number | null;
  onSelectIndex?: (index: number) => void;
}) {
  const width = 300;
  const height = 90;
  const isInteractive = Boolean(labels && onSelectIndex);
  const seriesPoints = series.map((line) => buildLinePoints(line.values, width, height));

  return (
    <View>
      <View style={rhStyles.chartTouchWrap}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {series.map((line, index) => {
            const points = seriesPoints[index];
            const linePath = points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
            return (
              <Path key={`line-${index}`} d={linePath} fill="none" stroke={line.color} strokeWidth={2.5} />
            );
          })}
          {isInteractive && selectedIndex !== null && selectedIndex !== undefined ? (
            <>
              <Line
                x1={seriesPoints[0][selectedIndex].x}
                y1={0}
                x2={seriesPoints[0][selectedIndex].x}
                y2={height}
                stroke="#9AA1B5"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              {seriesPoints.map((points, index) => (
                <Circle
                  key={`marker-${index}`}
                  cx={points[selectedIndex].x}
                  cy={points[selectedIndex].y}
                  r={4}
                  fill={series[index].color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              ))}
            </>
          ) : null}
        </Svg>
        {isInteractive ? (
          <View style={rhStyles.chartTouchOverlay} pointerEvents="box-none">
            {series[0].values.map((_, index) => (
              <Pressable key={index} style={rhStyles.chartTouchSegment} onPress={() => onSelectIndex?.(index)} />
            ))}
          </View>
        ) : null}
      </View>

      {labels ? (
        <View style={rhStyles.chartAxisLabelsRow}>
          {labels.map((label, index) => (
            <Text key={`${label}-${index}`} style={rhStyles.chartAxisLabelText} numberOfLines={1}>
              {label}
            </Text>
          ))}
        </View>
      ) : null}

      {isInteractive && selectedIndex !== null && selectedIndex !== undefined ? (
        <RHChartTooltipCard
          title={labels![selectedIndex]}
          lines={series.map((line) => ({
            label: line.label,
            value: line.formatValue
              ? line.formatValue(line.values[selectedIndex])
              : formatValue
              ? formatValue(line.values[selectedIndex])
              : line.values[selectedIndex],
            color: line.color,
          }))}
        />
      ) : null}
    </View>
  );
}

function RHDonutChart({
  segments,
  size = 110,
}: {
  segments: Array<{ label: string; pct: number; color: string }>;
  size?: number;
}) {
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativePct = 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((segment, index) => {
        const dash = (segment.pct / 100) * circumference;
        const offset = circumference - (cumulativePct / 100) * circumference;
        cumulativePct += segment.pct;

        return (
          <Circle
            key={`${segment.label}-${index}`}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            rotation={-90}
            originX={size / 2}
            originY={size / 2}
          />
        );
      })}
    </Svg>
  );
}

const rhMonthNamesFull = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function useRHPeriodFilter() {
  const [granularity, setGranularity] = useState<'mes' | 'ano'>('mes');
  const [periodDate, setPeriodDate] = useState(() => new Date());

  const label =
    granularity === 'mes'
      ? `${rhMonthNamesFull[periodDate.getMonth()]} / ${periodDate.getFullYear()}`
      : `${periodDate.getFullYear()}`;

  const handlePrev = () => {
    setPeriodDate((current) => {
      const next = new Date(current);
      if (granularity === 'mes') {
        next.setMonth(next.getMonth() - 1);
      } else {
        next.setFullYear(next.getFullYear() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setPeriodDate((current) => {
      const next = new Date(current);
      if (granularity === 'mes') {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setFullYear(next.getFullYear() + 1);
      }
      return next;
    });
  };

  const handleReset = () => setPeriodDate(new Date());

  return {
    granularity,
    setGranularity,
    label,
    handlePrev,
    handleNext,
    handleReset,
    year: periodDate.getFullYear(),
    month: periodDate.getMonth() + 1,
  };
}

function RHPeriodFilterBar({
  granularity,
  onChangeGranularity,
  label,
  onPrev,
  onNext,
  onReset,
}: {
  granularity: 'mes' | 'ano';
  onChangeGranularity: (value: 'mes' | 'ano') => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
}) {
  return (
    <View style={rhStyles.periodFilterCard}>
      <View style={rhStyles.periodFilterTopRow}>
        <View style={rhStyles.periodToggleGroup}>
          <Pressable
            style={[rhStyles.periodToggleBtn, granularity === 'mes' ? rhStyles.periodToggleBtnActive : null]}
            onPress={() => onChangeGranularity('mes')}
          >
            <Text
              style={[rhStyles.periodToggleText, granularity === 'mes' ? rhStyles.periodToggleTextActive : null]}
            >
              Mês
            </Text>
          </Pressable>
          <Pressable
            style={[rhStyles.periodToggleBtn, granularity === 'ano' ? rhStyles.periodToggleBtnActive : null]}
            onPress={() => onChangeGranularity('ano')}
          >
            <Text
              style={[rhStyles.periodToggleText, granularity === 'ano' ? rhStyles.periodToggleTextActive : null]}
            >
              Ano
            </Text>
          </Pressable>
        </View>
        <Pressable style={rhStyles.periodResetBtn} onPress={onReset} hitSlop={8}>
          <Feather name="rotate-ccw" size={15} color="#5E667D" />
        </Pressable>
      </View>
      <View style={rhStyles.periodNavGroup}>
        <Pressable onPress={onPrev} hitSlop={8}>
          <Feather name="chevron-left" size={18} color="#5E667D" />
        </Pressable>
        <Text style={rhStyles.periodNavLabel}>{label}</Text>
        <Pressable onPress={onNext} hitSlop={8}>
          <Feather name="chevron-right" size={18} color="#5E667D" />
        </Pressable>
      </View>
    </View>
  );
}

function RHTwoSegmentBar({ segments }: { segments: Array<{ pct: number; color: string }> }) {
  return (
    <View style={rhStyles.genderBarTrack}>
      {segments.map((segment, index) => (
        <View key={index} style={[rhStyles.genderBarSegment, { flex: segment.pct, backgroundColor: segment.color }]} />
      ))}
    </View>
  );
}

function RHDetailModal({
  visible,
  icon,
  iconColor,
  title,
  periodFilter,
  onClose,
  children,
}: {
  visible: boolean;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  title: string;
  periodFilter: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen}>
          <StatusBar style="dark" />
          <View style={rhStyles.detailModalHeader}>
            <View style={rhStyles.detailModalTitleRow}>
              <View style={[styles.iconShell, styles.iconAccentGreen]}>
                <Feather name={icon} size={16} color={iconColor} />
              </View>
              <Text style={rhStyles.detailModalTitle}>{title}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {periodFilter}
            {children}
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function RHSectionHeading({ text }: { text: string }) {
  return <Text style={rhStyles.detailSectionHeading}>{text}</Text>;
}

function RHMiniTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<string[]>;
}) {
  return (
    <View style={rhStyles.miniTable}>
      <View style={rhStyles.miniTableHeaderRow}>
        {columns.map((column, index) => (
          <Text
            key={column}
            style={[rhStyles.miniTableHeaderText, index === 0 ? rhStyles.miniTableFirstCol : rhStyles.miniTableCol]}
          >
            {column}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={rhStyles.miniTableRow}>
          {row.map((cell, cellIndex) => (
            <Text
              key={cellIndex}
              style={[
                rhStyles.miniTableCellText,
                cellIndex === 0 ? rhStyles.miniTableFirstCol : rhStyles.miniTableCol,
              ]}
              numberOfLines={1}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function RHRankedListCard({
  rank,
  title,
  subtitle,
  value,
  valueColor,
  tag,
}: {
  rank: number;
  title: string;
  subtitle: string;
  value: string;
  valueColor: string;
  tag?: string;
}) {
  return (
    <View style={rhStyles.rankedListCard}>
      <Text style={rhStyles.rankNumber}>{rank}</Text>
      <View style={rhStyles.employeeInfo}>
        <Text style={rhStyles.employeeName} numberOfLines={1}>
          {title}
        </Text>
        <Text style={rhStyles.employeeRoleUnit} numberOfLines={1}>
          {subtitle}
        </Text>
        {tag ? <Text style={rhStyles.employeeMeta}>{tag}</Text> : null}
      </View>
      <Text style={[rhStyles.reportValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function RHCategoryBarList({
  title,
  items,
  barColor,
  emptyMessage = 'Sem dados.',
}: {
  title: string;
  items: Array<{ label: string; count: number; value: string }>;
  barColor: string;
  emptyMessage?: string;
}) {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <View style={rhStyles.categoryBarCard}>
      <Text style={rhStyles.categoryBarTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={rhStyles.categoryBarEmptyText}>{emptyMessage}</Text>
      ) : (
        items.map((item) => (
          <View key={item.label} style={rhStyles.categoryBarRow}>
            <View style={rhStyles.categoryBarTopRow}>
              <Text style={rhStyles.categoryBarLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={rhStyles.categoryBarValue}>
                {item.count} · {item.value}
              </Text>
            </View>
            <View style={rhStyles.categoryBarTrack}>
              <View
                style={[
                  rhStyles.categoryBarFill,
                  { width: `${Math.max(4, (item.count / maxCount) * 100)}%`, backgroundColor: barColor },
                ]}
              />
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ---------- Dashboard detail data ----------
// Turnover agora é real (fetchRhTurnover, calculado no af360-api a partir de
// rh_colaboradores + empresas.regiao) — os mocks antigos foram removidos.

const rhAdmissoesDetailMes = {
  total: 0,
  comSalarioInformado: 0,
  custoAdicional: 'R$ 0',
  salarioMedio: 'R$ 0',
  aindaAtivos: 0,
  jaDesligados: 0,
  aindaAtivosPct: 0,
  jaDesligadosPct: 0,
  maioresSalarios: [] as Array<{ nome: string; cargo: string; setor: string; admissao: string; salario: string }>,
  maioresSalariosVazio: 'Nenhuma admissão com salário lançado no período.',
  porCargo: [] as Array<{ label: string; count: number; value: string }>,
  porSetor: [] as Array<{ label: string; count: number; value: string }>,
  porEmpresa: [] as Array<{ label: string; count: number; value: string }>,
  historicoLabels: ['Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
  historicoAdmissoes: [40, 44, 57, 34, 15, 32, 50, 41, 35, 55, 44, 0],
  historicoCusto: [16000, 14000, 22000, 13000, 2000, 15000, 30000, 20000, 19000, 56000, 30000, 0],
};

const rhAdmissoesDetailAno = {
  total: 40,
  comSalarioInformado: 18,
  custoAdicional: 'R$ 29.367',
  salarioMedio: 'R$ 1.632',
  aindaAtivos: 17,
  jaDesligados: 23,
  aindaAtivosPct: 43,
  jaDesligadosPct: 57,
  maioresSalarios: [
    { nome: 'Rodrigo Moreira Lima', cargo: 'Sub Gerente de Posto', setor: 'Funcionario', admissao: '26/08', salario: 'R$ 2.088,49' },
    { nome: 'Fernanda Silva Soares', cargo: 'Subgerente', setor: 'Geral', admissao: '01/08', salario: 'R$ 2.067,40' },
    { nome: 'Eduardo Silva do Nascimento', cargo: 'Frentista', setor: 'Unico', admissao: '28/08', salario: 'R$ 1.668,17' },
    { nome: 'Ronald Caetano Souza Marques da Silva', cargo: 'Frentista', setor: 'Unico', admissao: '18/08', salario: 'R$ 1.668,17' },
    { nome: 'Humberto Oliveira de Paula', cargo: 'Frentista', setor: 'Funcionario', admissao: '01/08', salario: 'R$ 1.647,48' },
    { nome: 'Ericris Barreto Ferreira', cargo: 'Frentista', setor: 'Funcionarios', admissao: '22/08', salario: 'R$ 1.622,63' },
    { nome: 'Paulo Mauricio Francisco Protazio', cargo: 'Frentista', setor: 'Funcionário', admissao: '16/08', salario: 'R$ 1.621,00' },
    { nome: 'Cassio Heredia dos Santos da Silva', cargo: 'Frentista', setor: 'Geral', admissao: '08/08', salario: 'R$ 1.621,00' },
    { nome: 'Evaldo Jose Nunes', cargo: 'Frentista', setor: 'Geral', admissao: '04/08', salario: 'R$ 1.621,00' },
    { nome: 'Gabriel Freitas Silva', cargo: 'Frentista', setor: 'Geral', admissao: '08/08', salario: 'R$ 1.621,00' },
  ],
  maioresSalariosVazio: 'Nenhuma admissão com salário lançado no período.',
  porCargo: [
    { label: 'Sem cargo', count: 22, value: 'R$ 0' },
    { label: 'Frentista', count: 14, value: 'R$ 22.816' },
    { label: 'Atendente', count: 1, value: 'R$ 1.621' },
    { label: 'Jovem Aprendiz - Frentista', count: 1, value: 'R$ 774' },
    { label: 'Sub Gerente de Posto', count: 1, value: 'R$ 2.088' },
    { label: 'Subgerente', count: 1, value: 'R$ 2.067' },
  ],
  porSetor: [
    { label: 'Sem setor', count: 23, value: 'R$ 1.621' },
    { label: 'Geral', count: 8, value: 'R$ 12.567' },
    { label: 'Departamento Geral', count: 2, value: 'R$ 3.242' },
    { label: 'Funcionarios', count: 2, value: 'R$ 3.244' },
    { label: 'Funcionario', count: 2, value: 'R$ 3.736' },
    { label: 'Unico', count: 2, value: 'R$ 3.336' },
  ],
  porEmpresa: [
    { label: 'Auto Posto do Trabalho Sa...', count: 5, value: 'R$ 5.309' },
    { label: 'Frosinone Posto de GNV Ltda', count: 4, value: 'R$ 3.242' },
    { label: 'Posto Boa Viagem Ltda', count: 3, value: 'R$ 3.336' },
    { label: 'Chacrinha Posto de Serviç...', count: 3, value: 'R$ 2.088' },
    { label: 'Auto Posto do Trabalho Sao...', count: 3, value: 'R$ 774' },
    { label: 'Auto Posto Mem de Sá Ltda', count: 2, value: 'R$ 1.621' },
  ],
  historicoLabels: ['Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan'],
  historicoAdmissoes: [63, 62, 68, 49, 59, 67, 40, 42, 58, 34, 15, 36],
  historicoCusto: [46000, 45000, 50000, 36000, 43000, 49000, 29000, 31000, 42000, 25000, 11000, 26000],
};

const rhDemissoesDetailMes = {
  total: 0,
  comRescisaoLancada: 0,
  totalRescisoes: 'R$ 0',
  ticketMedio: 'R$ 0',
  tempoCasa: '0,0',
  voluntario: 0,
  voluntarioPct: 0,
  involuntario: 0,
  involuntarioPct: 0,
  maioresValores: [] as Array<{ nome: string; motivo: string; tempoCasa: string; demissao: string; valor: string }>,
  maioresValoresVazio: 'Nenhuma demissão com rescisão lançada no período.',
  motivos: [] as Array<{ label: string; count: number; pct: number; valor: string; color: string }>,
  motivosVazio: 'Sem desligamentos no período.',
  porCargo: [] as Array<{ label: string; count: number; value: string }>,
  porSetor: [] as Array<{ label: string; count: number; value: string }>,
  porEmpresa: [] as Array<{ label: string; count: number; value: string }>,
  historicoLabels: ['Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
  historicoDemissoes: [18, 20, 25, 22, 30, 28, 24, 20, 15, 10, 6, 0],
  historicoRescisoes: [40000, 42000, 50000, 45000, 60000, 55000, 48000, 40000, 30000, 20000, 10000, 0],
};

const rhDemissoesDetailAno = {
  total: 47,
  comRescisaoLancada: 39,
  totalRescisoes: 'R$ 114.244',
  ticketMedio: 'R$ 2.929',
  tempoCasa: '1,1',
  voluntario: 5,
  voluntarioPct: 11,
  involuntario: 42,
  involuntarioPct: 89,
  maioresValores: [
    { nome: 'Marcos Jonathan Santos Damasceno', motivo: 'Sem justa causa', tempoCasa: '2.5a', demissao: '13/08', valor: 'R$ 8.911,44' },
    { nome: 'Andre Guilherme Gomes Pinto', motivo: 'Sem justa causa', tempoCasa: '2.5a', demissao: '31/08', valor: 'R$ 7.730,33' },
    { nome: 'Carlos Moreira Reis', motivo: 'Sem justa causa', tempoCasa: '2.0a', demissao: '13/08', valor: 'R$ 7.570,66' },
    { nome: 'Anderson Gomes', motivo: 'Sem justa causa', tempoCasa: '4.6a', demissao: '11/08', valor: 'R$ 6.888,66' },
    { nome: 'Nata Lopes de Oliveira', motivo: 'Sem justa causa', tempoCasa: '2.2a', demissao: '31/08', valor: 'R$ 6.475,00' },
    { nome: 'Yuri de Souza Santana', motivo: 'Sem justa causa', tempoCasa: '2.3a', demissao: '18/08', valor: 'R$ 6.228,04' },
    { nome: 'Aldemir de Castro Moreira', motivo: 'Sem justa causa', tempoCasa: '4.9a', demissao: '01/08', valor: 'R$ 4.569,92' },
    { nome: 'Antonny Marcello Carvalho de Mello', motivo: 'Justa causa', tempoCasa: '1.1a', demissao: '20/08', valor: 'R$ 4.197,72' },
    { nome: 'Diego de Souza Adriao', motivo: 'Justa causa', tempoCasa: '5.1a', demissao: '22/08', valor: 'R$ 3.953,93' },
    { nome: 'Gabriel Luiz de Carvalho', motivo: 'Sem justa causa', tempoCasa: '1.9a', demissao: '30/08', valor: 'R$ 3.854,17' },
  ],
  maioresValoresVazio: 'Nenhuma demissão com rescisão lançada no período.',
  motivos: [
    { label: 'Sem justa causa', count: 21, pct: 44.7, valor: 'R$ 73.713', color: '#E6213D' },
    { label: 'Fim do contrato de experiência', count: 14, pct: 29.8, valor: 'R$ 22.898', color: '#D79A22' },
    { label: 'Justa causa', count: 7, pct: 14.9, valor: 'R$ 12.523', color: '#18955A' },
    { label: 'Pedido de demissão', count: 5, pct: 10.6, valor: 'R$ 5.111', color: '#3457D5' },
  ],
  motivosVazio: 'Sem desligamentos no período.',
  porCargo: [{ label: 'Sem cargo', count: 47, value: 'R$ 114.244' }],
  porSetor: [{ label: 'Sem setor', count: 47, value: 'R$ 114.244' }],
  porEmpresa: [
    { label: 'Auto Posto do Trabalho S...', count: 5, value: 'R$ 15.546' },
    { label: 'Posto Boa Viagem Ltda', count: 3, value: 'R$ 4.997' },
    { label: 'Mega Nova Iguaçu Posto De...', count: 3, value: 'R$ 3.791' },
    { label: 'Auto Posto do Trabalho S... (2)', count: 3, value: 'R$ 11.378' },
    { label: 'Posto Super Brasil Ltda', count: 3, value: 'R$ 4.128' },
    { label: 'Vicente Souza e Cia Ltda', count: 3, value: 'R$ 635' },
    { label: 'Nossa Senhora da Penha L...', count: 2, value: 'R$ 16.482' },
    { label: 'Auto Posto Manilha Mage L...', count: 2, value: 'R$ 7.775' },
  ],
  historicoLabels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  historicoDemissoes: [55, 58, 60, 50, 45, 40, 42, 47, 18, 20, 22, 25],
  historicoRescisoes: [110000, 113000, 115974, 100000, 90000, 85000, 95000, 114244, 40000, 42000, 45000, 50000],
};

function TurnoverDetailModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const filter = useRHPeriodFilter();
  const [data, setData] = useState<RhTurnoverData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTurnoverIndex, setSelectedTurnoverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchRhTurnover({ granularity: filter.granularity, year: filter.year, month: filter.month })
      .then((result) => {
        if (isMounted) setData(result);
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar o turnover.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [visible, filter.granularity, filter.year, filter.month]);

  if (!data) {
    return (
      <RHDetailModal
        visible={visible}
        icon="user"
        iconColor="#1B6E3A"
        title="Turnover — Detalhamento"
        onClose={onClose}
        periodFilter={
          <RHPeriodFilterBar
            granularity={filter.granularity}
            onChangeGranularity={filter.setGranularity}
            label={filter.label}
            onPrev={filter.handlePrev}
            onNext={filter.handleNext}
            onReset={filter.handleReset}
          />
        }
      >
        <Text style={rhStyles.detailNoteText}>
          {isLoading ? 'Carregando turnover...' : errorMessage ?? 'Sem dados.'}
        </Text>
      </RHDetailModal>
    );
  }

  return (
    <RHDetailModal
      visible={visible}
      icon="user"
      iconColor="#1B6E3A"
      title="Turnover — Detalhamento"
      onClose={onClose}
      periodFilter={
        <RHPeriodFilterBar
          granularity={filter.granularity}
          onChangeGranularity={filter.setGranularity}
          label={filter.label}
          onPrev={filter.handlePrev}
          onNext={filter.handleNext}
          onReset={filter.handleReset}
        />
      }
    >
      <RHSectionHeading text="1. Geral × Voluntário" />
      <View style={rhStyles.tripleStatRow}>
        <View style={rhStyles.tripleStatCard}>
          <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueGreen]}>{data.geralPct}</Text>
          <Text style={rhStyles.tripleStatLabel}>Geral</Text>
          <Text style={rhStyles.tripleStatCaption}>{data.geralMeta}</Text>
        </View>
        <View style={rhStyles.tripleStatCard}>
          <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueGold]}>{data.voluntarioPct}</Text>
          <Text style={rhStyles.tripleStatLabel}>Voluntário</Text>
          <Text style={rhStyles.tripleStatCaption}>{data.voluntarioMeta}</Text>
        </View>
        <View style={rhStyles.tripleStatCard}>
          <Text style={[rhStyles.tripleStatValue, { color: '#E6213D' }]}>{data.involuntarioPct}</Text>
          <Text style={rhStyles.tripleStatLabel}>Involuntário</Text>
          <Text style={rhStyles.tripleStatCaption}>{data.involuntarioMeta}</Text>
        </View>
      </View>

      {data.insight ? <Text style={rhStyles.detailNoteText}>{data.insight}</Text> : null}

      <RHSectionHeading text="2. Turnover por região" />
      <RHMiniTable
        columns={['Região', 'HC', 'Saídas', 'Taxa']}
        rows={data.regioes.map((item) => [item.nome, String(item.hc), String(item.saidas), item.taxa])}
      />

      <View style={rhStyles.highlightCard}>
        <Text style={[rhStyles.sectionBigValue, rhStyles.statGridValueGold]}>{data.ate90diasPct}</Text>
        <Text style={rhStyles.detailCaption}>{data.ate90diasMeta}</Text>
        <Text style={rhStyles.highlightDescription}>
          Indicador de qualidade da contratação. Taxas altas apontam falhas em recrutamento, integração,
          treinamento ou liderança direta. Meta saudável: {'<'} 15%.
        </Text>
      </View>

      <RHSectionHeading text="3. Motivos de desligamento" />
      {data.motivos && data.motivos.length > 0 ? (
        <View style={rhStyles.donutRow}>
          <RHDonutChart segments={data.motivos.map((item) => ({ label: item.label, pct: item.pct, color: item.color }))} />
          <View style={rhStyles.donutLegend}>
            {data.motivos.map((item) => (
              <View key={item.label} style={rhStyles.donutLegendRow}>
                <View style={[rhStyles.genderDot, { backgroundColor: item.color }]} />
                <View style={rhStyles.donutLegendTextBlock}>
                  <Text style={rhStyles.donutLegendLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={rhStyles.donutLegendMeta}>
                    {item.count} · {item.pct}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <RHEmptyTabState message={data.motivosVazio} />
      )}

      <RHSectionHeading text="4. Série histórica (12 meses)" />
      <View style={rhStyles.chartLegendRow}>
        <View style={rhStyles.chartLegendItem}>
          <View style={[rhStyles.chartLegendDot, { backgroundColor: '#18955A' }]} />
          <Text style={rhStyles.chartLegendText}>Geral</Text>
        </View>
        <View style={rhStyles.chartLegendItem}>
          <View style={[rhStyles.chartLegendDot, { backgroundColor: '#D79A22' }]} />
          <Text style={rhStyles.chartLegendText}>Voluntário</Text>
        </View>
      </View>
      <View style={rhStyles.lineChartWrap}>
        <RHMultiLineChart
          series={[
            { values: data.historicoGeral, color: '#18955A', label: 'Geral' },
            { values: data.historicoVoluntario, color: '#D79A22', label: 'Voluntário' },
          ]}
          labels={data.historicoLabels}
          formatValue={(value) => `${value}%`}
          selectedIndex={selectedTurnoverIndex}
          onSelectIndex={setSelectedTurnoverIndex}
        />
      </View>
    </RHDetailModal>
  );
}

function AdmissoesDetailModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const filter = useRHPeriodFilter();
  const data = filter.granularity === 'ano' ? rhAdmissoesDetailAno : rhAdmissoesDetailMes;
  const [selectedAdmissoesHistIndex, setSelectedAdmissoesHistIndex] = useState<number | null>(null);

  return (
    <RHDetailModal
      visible={visible}
      icon="user-plus"
      iconColor="#18955A"
      title="Admissões — Detalhamento"
      onClose={onClose}
      periodFilter={
        <RHPeriodFilterBar
          granularity={filter.granularity}
          onChangeGranularity={filter.setGranularity}
          label={filter.label}
          onPrev={filter.handlePrev}
          onNext={filter.handleNext}
          onReset={filter.handleReset}
        />
      }
    >
      <RHSectionHeading text="1. Resumo do período" />
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <View style={rhStyles.kpiCard}>
            <Text style={rhStyles.kpiLabel}>ADMISSÕES</Text>
            <Text style={[rhStyles.sectionBigValue, rhStyles.statGridValueGreen]}>{data.total}</Text>
            <Text style={rhStyles.kpiMeta}>{data.comSalarioInformado} com salário informado</Text>
          </View>
        </View>
        <View style={styles.gridItem}>
          <View style={rhStyles.kpiCard}>
            <Text style={rhStyles.kpiLabel}>CUSTO ADICIONAL (FOLHA)</Text>
            <Text style={[rhStyles.sectionBigValue, rhStyles.statGridValueGold]}>{data.custoAdicional}</Text>
            <Text style={rhStyles.kpiMeta}>Soma dos salários no mês</Text>
          </View>
        </View>
        <View style={styles.gridItem}>
          <View style={rhStyles.kpiCard}>
            <Text style={rhStyles.kpiLabel}>SALÁRIO MÉDIO</Text>
            <Text style={[rhStyles.sectionBigValue, rhStyles.tripleStatValueBlue]}>{data.salarioMedio}</Text>
            <Text style={rhStyles.kpiMeta}>Por admitido c/ salário</Text>
          </View>
        </View>
        <View style={styles.gridItem}>
          <View style={rhStyles.kpiCard}>
            <Text style={rhStyles.kpiLabel}>AINDA ATIVOS</Text>
            <Text style={[rhStyles.sectionBigValue, rhStyles.tripleStatValueBlue]}>{data.aindaAtivos}</Text>
            <Text style={rhStyles.kpiMeta}>{data.jaDesligados} já desligados</Text>
          </View>
        </View>
      </View>

      <RHSectionHeading text="2. Permanência dos admitidos" />
      <RHTwoSegmentBar
        segments={[
          { pct: data.aindaAtivosPct, color: '#18955A' },
          { pct: data.jaDesligadosPct, color: '#E6213D' },
        ]}
      />
      <View style={rhStyles.genderLegendRow}>
        <View style={[rhStyles.genderDot, { backgroundColor: '#18955A' }]} />
        <Text style={rhStyles.genderLabel}>Ainda ativos</Text>
        <Text style={rhStyles.genderValue}>
          {data.aindaAtivos} ({data.aindaAtivosPct}%)
        </Text>
      </View>
      <View style={rhStyles.genderLegendRow}>
        <View style={[rhStyles.genderDot, { backgroundColor: '#E6213D' }]} />
        <Text style={rhStyles.genderLabel}>Já desligados</Text>
        <Text style={rhStyles.genderValue}>
          {data.jaDesligados} ({data.jaDesligadosPct}%)
        </Text>
      </View>

      <RHSectionHeading text="3. Maiores salários de admissão" />
      {data.maioresSalarios.length > 0 ? (
        data.maioresSalarios.map((item, index) => (
          <RHRankedListCard
            key={item.nome}
            rank={index + 1}
            title={item.nome}
            subtitle={`${item.cargo} · ${item.setor}`}
            tag={`Admissão em ${item.admissao}`}
            value={item.salario}
            valueColor="#18955A"
          />
        ))
      ) : (
        <RHEmptyTabState message={data.maioresSalariosVazio} />
      )}

      <RHSectionHeading text="4. Onde estão entrando" />
      <RHCategoryBarList title="Por cargo" items={data.porCargo} barColor="#18955A" />
      <RHCategoryBarList title="Por setor" items={data.porSetor} barColor="#18955A" />
      <RHCategoryBarList title="Por empresa" items={data.porEmpresa} barColor="#18955A" />

      <RHSectionHeading text="5. Série histórica (12 meses)" />
      <View style={rhStyles.chartLegendRow}>
        <View style={rhStyles.chartLegendItem}>
          <View style={[rhStyles.chartLegendDot, { backgroundColor: '#18955A' }]} />
          <Text style={rhStyles.chartLegendText}>Admissões</Text>
        </View>
        <View style={rhStyles.chartLegendItem}>
          <View style={[rhStyles.chartLegendDot, { backgroundColor: '#D79A22' }]} />
          <Text style={rhStyles.chartLegendText}>Custo (R$)</Text>
        </View>
      </View>
      <View style={rhStyles.lineChartWrap}>
        <RHMultiLineChart
          series={[
            { values: data.historicoAdmissoes, color: '#18955A', label: 'Admissões' },
            {
              values: data.historicoCusto,
              color: '#D79A22',
              label: 'Custo (R$)',
              formatValue: (value) => `R$ ${value.toLocaleString('pt-BR')}`,
            },
          ]}
          labels={data.historicoLabels}
          selectedIndex={selectedAdmissoesHistIndex}
          onSelectIndex={setSelectedAdmissoesHistIndex}
        />
      </View>
    </RHDetailModal>
  );
}

function DemissoesDetailModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const filter = useRHPeriodFilter();
  const data = filter.granularity === 'ano' ? rhDemissoesDetailAno : rhDemissoesDetailMes;
  const [selectedDemissoesHistIndex, setSelectedDemissoesHistIndex] = useState<number | null>(null);

  return (
    <RHDetailModal
      visible={visible}
      icon="user-x"
      iconColor="#E6213D"
      title="Demissões — Detalhamento"
      onClose={onClose}
      periodFilter={
        <RHPeriodFilterBar
          granularity={filter.granularity}
          onChangeGranularity={filter.setGranularity}
          label={filter.label}
          onPrev={filter.handlePrev}
          onNext={filter.handleNext}
          onReset={filter.handleReset}
        />
      }
    >
      <RHSectionHeading text="1. Resumo do período" />
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <View style={rhStyles.kpiCard}>
            <Text style={rhStyles.kpiLabel}>DEMISSÕES</Text>
            <Text style={[rhStyles.sectionBigValue, { color: '#E6213D' }]}>{data.total}</Text>
            <Text style={rhStyles.kpiMeta}>{data.comRescisaoLancada} com rescisão lançada</Text>
          </View>
        </View>
        <View style={styles.gridItem}>
          <View style={rhStyles.kpiCard}>
            <Text style={rhStyles.kpiLabel}>TOTAL DE RESCISÕES</Text>
            <Text style={[rhStyles.sectionBigValue, rhStyles.statGridValueGold]}>{data.totalRescisoes}</Text>
            <Text style={rhStyles.kpiMeta}>Soma líquida paga</Text>
          </View>
        </View>
        <View style={styles.gridItem}>
          <View style={rhStyles.kpiCard}>
            <Text style={rhStyles.kpiLabel}>TICKET MÉDIO</Text>
            <Text style={[rhStyles.sectionBigValue, rhStyles.statGridValueGreen]}>{data.ticketMedio}</Text>
            <Text style={rhStyles.kpiMeta}>Por desligamento c/ valor</Text>
          </View>
        </View>
        <View style={styles.gridItem}>
          <View style={rhStyles.kpiCard}>
            <Text style={rhStyles.kpiLabel}>TEMPO DE CASA</Text>
            <Text style={[rhStyles.sectionBigValue, rhStyles.tripleStatValueBlue]}>{data.tempoCasa}</Text>
            <Text style={rhStyles.kpiMeta}>anos (média dos desligados)</Text>
          </View>
        </View>
      </View>

      <RHSectionHeading text="2. Voluntário × involuntário" />
      <RHTwoSegmentBar
        segments={[
          { pct: data.voluntarioPct, color: '#D79A22' },
          { pct: data.involuntarioPct, color: '#E6213D' },
        ]}
      />
      <View style={rhStyles.genderLegendRow}>
        <View style={[rhStyles.genderDot, { backgroundColor: '#D79A22' }]} />
        <Text style={rhStyles.genderLabel}>Voluntário</Text>
        <Text style={rhStyles.genderValue}>
          {data.voluntario} ({data.voluntarioPct}%)
        </Text>
      </View>
      <View style={rhStyles.genderLegendRow}>
        <View style={[rhStyles.genderDot, { backgroundColor: '#E6213D' }]} />
        <Text style={rhStyles.genderLabel}>Involuntário</Text>
        <Text style={rhStyles.genderValue}>
          {data.involuntario} ({data.involuntarioPct}%)
        </Text>
      </View>

      <RHSectionHeading text="3. Maiores valores de rescisão" />
      {data.maioresValores.length > 0 ? (
        data.maioresValores.map((item, index) => (
          <RHRankedListCard
            key={item.nome}
            rank={index + 1}
            title={item.nome}
            subtitle={item.motivo}
            tag={`${item.tempoCasa} de casa · Demissão em ${item.demissao}`}
            value={item.valor}
            valueColor="#E6213D"
          />
        ))
      ) : (
        <RHEmptyTabState message={data.maioresValoresVazio} />
      )}

      <RHSectionHeading text="4. Motivos de desligamento" />
      {data.motivos.length > 0 ? (
        <View style={rhStyles.donutRow}>
          <RHDonutChart segments={data.motivos.map((item) => ({ label: item.label, pct: item.pct, color: item.color }))} />
          <View style={rhStyles.donutLegend}>
            {data.motivos.map((item) => (
              <View key={item.label} style={rhStyles.donutLegendRow}>
                <View style={[rhStyles.genderDot, { backgroundColor: item.color }]} />
                <View style={rhStyles.donutLegendTextBlock}>
                  <Text style={rhStyles.donutLegendLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={rhStyles.donutLegendMeta}>
                    {item.count} · {item.pct}% · {item.valor}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <RHEmptyTabState message={data.motivosVazio} />
      )}

      <RHSectionHeading text="5. Onde estão saindo" />
      <RHCategoryBarList title="Por cargo" items={data.porCargo} barColor="#E6213D" />
      <RHCategoryBarList title="Por setor" items={data.porSetor} barColor="#E6213D" />
      <RHCategoryBarList title="Por empresa" items={data.porEmpresa} barColor="#E6213D" />

      <RHSectionHeading text="6. Série histórica (12 meses)" />
      <View style={rhStyles.chartLegendRow}>
        <View style={rhStyles.chartLegendItem}>
          <View style={[rhStyles.chartLegendDot, { backgroundColor: '#E6213D' }]} />
          <Text style={rhStyles.chartLegendText}>Demissões</Text>
        </View>
        <View style={rhStyles.chartLegendItem}>
          <View style={[rhStyles.chartLegendDot, { backgroundColor: '#D79A22' }]} />
          <Text style={rhStyles.chartLegendText}>Rescisões (R$)</Text>
        </View>
      </View>
      <View style={rhStyles.lineChartWrap}>
        <RHMultiLineChart
          series={[
            { values: data.historicoDemissoes, color: '#E6213D', label: 'Demissões' },
            {
              values: data.historicoRescisoes,
              color: '#D79A22',
              label: 'Rescisões (R$)',
              formatValue: (value) => `R$ ${value.toLocaleString('pt-BR')}`,
            },
          ]}
          labels={data.historicoLabels}
          selectedIndex={selectedDemissoesHistIndex}
          onSelectIndex={setSelectedDemissoesHistIndex}
        />
      </View>
    </RHDetailModal>
  );
}

// ---------- Dashboard ----------

export function RHDashboardScreen({ navigation }: ScreenProps<'RHDashboard'>) {
  const monthYearLabel = useMemo(() => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    const now = new Date();
    return `${monthNames[now.getMonth()]} / ${now.getFullYear()}`;
  }, []);

  const dashboardFilter = useRHPeriodFilter();
  const [isTurnoverModalOpen, setIsTurnoverModalOpen] = useState(false);
  const [isAdmissoesModalOpen, setIsAdmissoesModalOpen] = useState(false);
  const [isDemissoesModalOpen, setIsDemissoesModalOpen] = useState(false);
  const [selectedAdmDemIndex, setSelectedAdmDemIndex] = useState<number | null>(null);
  const [selectedHeadcountIndex, setSelectedHeadcountIndex] = useState<number | null>(null);
  const [resumo, setResumo] = useState<RhDashboardResumo | null>(null);
  const [isResumoLoading, setIsResumoLoading] = useState(true);
  const [resumoError, setResumoError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsResumoLoading(true);
    setResumoError(null);
    fetchRhDashboardResumo({
      granularity: dashboardFilter.granularity,
      year: dashboardFilter.year,
      month: dashboardFilter.month,
    })
      .then((result) => {
        if (isMounted) setResumo(result);
      })
      .catch((err) => {
        if (isMounted) {
          setResumoError(err instanceof Error ? err.message : 'Não foi possível carregar o dashboard.');
        }
      })
      .finally(() => {
        if (isMounted) setIsResumoLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [dashboardFilter.granularity, dashboardFilter.year, dashboardFilter.month]);

  const chartHeight = 90;
  const admissoesDemissoesChart = resumo?.admissoesDemissoesChart ?? [];
  const maxBarValue =
    admissoesDemissoesChart.length > 0
      ? Math.max(1, ...admissoesDemissoesChart.flatMap((item) => [item.adm, item.dem]))
      : 1;

  if (!resumo) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.topBarContainer}>
          <TopBar initials={rhUserInitials} variant="rh" onAvatarPress={() => navigation.navigate('RHProfile')} />
        </View>
        <View style={styles.processEmptyCard}>
          <Text style={styles.processEmptyText}>
            {isResumoLoading ? 'Carregando dashboard...' : resumoError ?? 'Sem dados.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#1B6E3A', '#2A9D51']} style={rhStyles.heroCard}>
          <Text style={rhStyles.heroGreeting}>Bom dia, {rhUser.fullName.split(' ')[0]}</Text>
          <Text style={rhStyles.heroTitle}>Dashboard de RH</Text>
          <Text style={rhStyles.heroSubtitle}>KPIs de pessoas · {monthYearLabel}</Text>
        </LinearGradient>

        <RHPeriodFilterBar
          granularity={dashboardFilter.granularity}
          onChangeGranularity={dashboardFilter.setGranularity}
          label={dashboardFilter.label}
          onPrev={dashboardFilter.handlePrev}
          onNext={dashboardFilter.handleNext}
          onReset={dashboardFilter.handleReset}
        />

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Pressable style={[rhStyles.kpiCard, rhStyles.kpiCardAccentGreen]} onPress={() => setIsTurnoverModalOpen(true)}>
              <Text style={rhStyles.kpiLabel}>TURNOVER</Text>
              <Text style={rhStyles.kpiValue}>{resumo.turnoverPct}</Text>
              <Text style={rhStyles.kpiMeta}>Clique para detalhar</Text>
            </Pressable>
          </View>
          <View style={styles.gridItem}>
            <View style={[rhStyles.kpiCard, rhStyles.kpiCardAccentGray]}>
              <Text style={rhStyles.kpiLabel}>MOVIMENTAÇÃO</Text>
              <Text style={rhStyles.kpiValue}>{resumo.movimentacaoPct}</Text>
              <Text style={rhStyles.kpiMeta}>(Adm. + Dem.) / 2</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <Pressable style={rhStyles.kpiCard} onPress={() => setIsAdmissoesModalOpen(true)}>
              <View style={rhStyles.kpiTopRow}>
                <Text style={rhStyles.kpiLabel}>ADMISSÕES</Text>
                <View style={[rhStyles.kpiPill, rhStyles.kpiPillDown]}>
                  <Text style={[rhStyles.kpiPillText, rhStyles.kpiPillTextDown]}>
                    {resumo.admissoesChangePct}
                  </Text>
                </View>
              </View>
              <Text style={rhStyles.kpiValue}>{resumo.admissoes}</Text>
              <Text style={rhStyles.kpiMeta}>No mês selecionado</Text>
            </Pressable>
          </View>
          <View style={styles.gridItem}>
            <Pressable style={rhStyles.kpiCard} onPress={() => setIsDemissoesModalOpen(true)}>
              <View style={rhStyles.kpiTopRow}>
                <Text style={rhStyles.kpiLabel}>DEMISSÕES</Text>
                <View style={[rhStyles.kpiPill, rhStyles.kpiPillUp]}>
                  <Text style={[rhStyles.kpiPillText, rhStyles.kpiPillTextUp]}>
                    {resumo.admissoesChangePct}
                  </Text>
                </View>
              </View>
              <Text style={rhStyles.kpiValue}>{resumo.demissoes}</Text>
              <Text style={rhStyles.kpiMeta}>Rescisões: {resumo.demissoesRescisao}</Text>
            </Pressable>
          </View>
        </View>

        <View style={rhStyles.sectionCard}>
          <Text style={rhStyles.sectionLabel}>FOLHA (ATIVOS)</Text>
          <Text style={rhStyles.sectionBigValue}>{resumo.folhaAtivos}</Text>
          <Text style={rhStyles.kpiMeta}>Soma dos salários base</Text>
        </View>

        <View style={rhStyles.sectionCard}>
          <Text style={rhStyles.sectionTitle}>Quadro atual</Text>
          <View style={rhStyles.statGridRow}>
            <View style={rhStyles.statGridItem}>
              <Text style={rhStyles.statGridValue}>{resumo.quadro.ativos}</Text>
              <Text style={rhStyles.statGridLabel}>Ativos</Text>
            </View>
            <View style={rhStyles.statGridItem}>
              <Text style={[rhStyles.statGridValue, rhStyles.statGridValueGold]}>{resumo.quadro.ferias}</Text>
              <Text style={rhStyles.statGridLabel}>Em férias</Text>
            </View>
            <View style={rhStyles.statGridItem}>
              <Text style={rhStyles.statGridValue}>{resumo.quadro.afastados}</Text>
              <Text style={rhStyles.statGridLabel}>Afastados</Text>
            </View>
            <View style={rhStyles.statGridItem}>
              <Text style={[rhStyles.statGridValue, rhStyles.statGridValueGreen]}>{resumo.quadro.novos90d}</Text>
              <Text style={rhStyles.statGridLabel}>Novos 90d</Text>
            </View>
          </View>
        </View>

        <View style={rhStyles.sectionCard}>
          <Text style={rhStyles.sectionTitle}>Engajamento & cultura</Text>
          <View style={rhStyles.statGridRow}>
            <View style={rhStyles.statGridItem}>
              <Text style={rhStyles.statGridValue}>{resumo.engajamento.aderencia ?? '—'}</Text>
              <Text style={rhStyles.statGridLabel}>Aderência</Text>
            </View>
            <View style={rhStyles.statGridItem}>
              <Text style={rhStyles.statGridValue}>{resumo.engajamento.cobertura}</Text>
              <Text style={rhStyles.statGridLabel}>Cobertura</Text>
            </View>
            <View style={rhStyles.statGridItem}>
              <Text style={rhStyles.statGridValue}>{resumo.engajamento.tempoCasa}</Text>
              <Text style={rhStyles.statGridLabel}>Tempo casa</Text>
            </View>
            <View style={rhStyles.statGridItem}>
              <Text style={rhStyles.statGridValue}>{resumo.engajamento.exp30d}</Text>
              <Text style={rhStyles.statGridLabel}>Exp. 30d</Text>
            </View>
          </View>
        </View>

        <View style={rhStyles.sectionCard}>
          <View style={rhStyles.chartHeaderRow}>
            <Text style={rhStyles.sectionTitle}>Admissões × Demissões</Text>
            <View style={rhStyles.chartLegendRow}>
              <View style={rhStyles.chartLegendItem}>
                <View style={[rhStyles.chartLegendDot, { backgroundColor: '#18955A' }]} />
                <Text style={rhStyles.chartLegendText}>Adm</Text>
              </View>
              <View style={rhStyles.chartLegendItem}>
                <View style={[rhStyles.chartLegendDot, { backgroundColor: '#E6213D' }]} />
                <Text style={rhStyles.chartLegendText}>Dem</Text>
              </View>
            </View>
          </View>

          <View style={rhStyles.barChartRow}>
            {admissoesDemissoesChart.map((item, index) => (
              <Pressable
                key={item.label}
                style={[rhStyles.barGroup, selectedAdmDemIndex === index ? rhStyles.barGroupSelected : null]}
                onPress={() => setSelectedAdmDemIndex(index)}
              >
                <View style={rhStyles.barsRow}>
                  <View
                    style={[
                      rhStyles.barAdm,
                      { height: Math.max(4, (item.adm / maxBarValue) * chartHeight) },
                    ]}
                  />
                  <View
                    style={[
                      rhStyles.barDem,
                      { height: Math.max(4, (item.dem / maxBarValue) * chartHeight) },
                    ]}
                  />
                </View>
                <Text style={rhStyles.barMonthLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          {selectedAdmDemIndex !== null ? (
            <RHChartTooltipCard
              title={admissoesDemissoesChart[selectedAdmDemIndex].label}
              lines={[
                { label: 'Admissões', value: admissoesDemissoesChart[selectedAdmDemIndex].adm, color: '#18955A' },
                { label: 'Demissões', value: admissoesDemissoesChart[selectedAdmDemIndex].dem, color: '#E6213D' },
              ]}
            />
          ) : null}
        </View>

        <View style={rhStyles.sectionCard}>
          <Text style={rhStyles.sectionTitle}>Evolução do headcount</Text>
          <Text style={rhStyles.kpiMeta}>Últimos 12 meses</Text>
          <View style={rhStyles.lineChartWrap}>
            <RHHeadcountChart
              values={resumo.headcountEvolution}
              labels={resumo.headcountMonths}
              selectedIndex={selectedHeadcountIndex}
              onSelectIndex={setSelectedHeadcountIndex}
            />
          </View>
        </View>

        <View style={rhStyles.sectionCard}>
          <View style={styles.directorPageTitleRow}>
            <View style={[styles.iconShell, styles.iconAccentGreen]}>
              <Feather name="briefcase" size={15} color="#1B6E3A" />
            </View>
            <Text style={rhStyles.sectionTitle}>Top setores (ativos)</Text>
          </View>
          <RHRankBarList items={resumo.topSetores} color="#18955A" />
        </View>

        <View style={rhStyles.sectionCard}>
          <Text style={rhStyles.sectionTitle}>Top unidades</Text>
          {resumo.topUnidades.map((item, index) => (
            <View key={item.name} style={rhStyles.rankRow}>
              <Text style={rhStyles.rankNumber}>{index + 1}</Text>
              <Text style={rhStyles.rankName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={rhStyles.rankValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={[rhStyles.sectionCard, rhStyles.lastSectionCard]}>
          <Text style={rhStyles.sectionTitle}>Distribuição por gênero</Text>
          <View style={rhStyles.genderBarTrack}>
            {resumo.genderDistribution.map((segment) => (
              <View
                key={segment.label}
                style={[
                  rhStyles.genderBarSegment,
                  { flex: segment.pct, backgroundColor: segment.color },
                ]}
              />
            ))}
          </View>
          {resumo.genderDistribution.map((segment) => (
            <View key={segment.label} style={rhStyles.genderLegendRow}>
              <View style={[rhStyles.genderDot, { backgroundColor: segment.color }]} />
              <Text style={rhStyles.genderLabel}>{segment.label}</Text>
              <Text style={rhStyles.genderValue}>
                {segment.pct}% · {segment.count}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <TurnoverDetailModal visible={isTurnoverModalOpen} onClose={() => setIsTurnoverModalOpen(false)} />
      <AdmissoesDetailModal visible={isAdmissoesModalOpen} onClose={() => setIsAdmissoesModalOpen(false)} />
      <DemissoesDetailModal visible={isDemissoesModalOpen} onClose={() => setIsDemissoesModalOpen(false)} />
    </SafeAreaView>
  );
}

// ---------- Profile ----------

export function RHProfileScreen({ navigation }: ScreenProps<'RHProfile'>) {
  const rhProfileFields = [
    { label: 'Cargo', value: rhUser.role },
    { label: 'Área', value: rhUser.area },
    { label: 'E-mail', value: rhUser.email },
    { label: 'Telefone', value: rhUser.phone },
    { label: 'Acesso', value: rhUser.accessLabel },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={rhUserInitials} variant="rh" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#1B6E3A', '#2A9D51']} style={styles.directorProfileHero}>
          <View style={styles.directorProfileBadge}>
            <Text style={styles.directorProfileBadgeText}>{rhUserInitials}</Text>
          </View>
          <View>
            <Text style={styles.directorProfileName}>{rhUser.fullName}</Text>
            <Text style={styles.directorProfileRole}>{rhUser.roleAndUnit}</Text>
          </View>
        </LinearGradient>

        <View style={styles.directorProfileCard}>
          {rhProfileFields.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.directorProfileRow,
                index < rhProfileFields.length - 1 ? styles.directorProfileRowBorder : null,
              ]}
            >
              <Text style={styles.directorProfileLabel}>{item.label}</Text>
              <Text style={styles.directorProfileValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.directorLogoutButton} onPress={() => navigation.replace('Login')}>
          <Text style={styles.directorLogoutButtonText}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Shared form pickers ----------

function RHSimplePickerModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.datePickerBackdrop} onPress={onClose}>
        <Pressable style={styles.simpleListCard} onPress={() => {}}>
          <Text style={styles.simpleListTitle}>{title}</Text>
          <ScrollView style={styles.simpleListScroll} showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const isSelected = option === selectedValue;
              return (
                <Pressable
                  key={option}
                  style={[styles.templateOptionRow, isSelected ? styles.templateOptionRowActive : null]}
                  onPress={() => {
                    onSelect(option);
                    onClose();
                  }}
                >
                  <View style={styles.templateOptionLeft}>
                    <Text
                      style={[styles.templateOptionText, isSelected ? styles.templateOptionTextActive : null]}
                    >
                      {option}
                    </Text>
                  </View>
                  {isSelected ? <Feather name="check" size={16} color="#FFFFFF" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RHSelectField({
  label,
  value,
  placeholder = 'Selecione...',
  onPress,
  required,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
  required?: boolean;
}) {
  return (
    <>
      <Text style={[styles.requestFieldLabel, styles.spacingTop]}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <Pressable style={styles.requestSelectBox} onPress={onPress}>
        <View style={styles.requestSelectLeft}>
          <Text style={[styles.requestSelectText, !value ? rhStyles.selectPlaceholder : null]}>
            {value || placeholder}
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color="#7A8299" />
      </Pressable>
    </>
  );
}

function RHFilterPill({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={rhStyles.filterPill} onPress={onPress}>
      <Text style={rhStyles.filterPillText} numberOfLines={1}>
        {label}
      </Text>
      <Feather name="chevron-down" size={14} color="#5E667D" />
    </Pressable>
  );
}

// ---------- Colaboradores ----------

type NovoColaboradorForm = {
  fullName: string;
  cpf: string;
  registration: string;
  role: string;
  unit: string;
  admissionLabel: string;
};

const emptyNovoColaboradorForm: NovoColaboradorForm = {
  fullName: '',
  cpf: '',
  registration: '',
  role: '',
  unit: '',
  admissionLabel: '',
};

function NovoColaboradorModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
}) {
  const [form, setForm] = useState<NovoColaboradorForm>(emptyNovoColaboradorForm);
  const [isCargoPickerOpen, setIsCargoPickerOpen] = useState(false);
  const [isUnidadePickerOpen, setIsUnidadePickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(emptyNovoColaboradorForm);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!form.fullName.trim() || !form.unit.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha ao menos o nome completo e a unidade.');
      return;
    }

    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      fullName: form.fullName.trim(),
      role: form.role || 'Não informado',
      unit: form.unit,
      setor: 'Sem setor',
      registration: form.registration || '—',
      codigoInterno: `AF${Math.floor(Math.random() * 900000 + 100000)}`,
      cpf: form.cpf || '000.000.000-00',
      admissionLabel: form.admissionLabel || formatDateBR(new Date()),
      status: 'ativo',
      email: '',
      celular: '',
      salario: 0,
      pendentesCount: 6,
    };

    onSave(newEmployee);
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <View>
                <Text style={styles.requestModalTitle}>Novo colaborador</Text>
                <Text style={rhStyles.modalSubtitle}>Cadastro rápido. Você pode completar os dados depois.</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.requestFieldLabel}>Nome completo *</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.fullName}
                onChangeText={(text) => setForm((current) => ({ ...current, fullName: text }))}
                placeholder="Nome completo"
                placeholderTextColor="#A7AEC2"
              />

              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>CPF</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={form.cpf}
                    onChangeText={(text) => setForm((current) => ({ ...current, cpf: text }))}
                    placeholder="000.000.000-00"
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Matrícula</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={form.registration}
                    onChangeText={(text) => setForm((current) => ({ ...current, registration: text }))}
                    placeholder="Matrícula"
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
              </View>

              <RHSelectField label="Cargo" value={form.role} onPress={() => setIsCargoPickerOpen(true)} />
              <RHSelectField
                label="Unidade"
                value={form.unit}
                onPress={() => setIsUnidadePickerOpen(true)}
                required
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Data de admissão</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.admissionLabel}
                onChangeText={(text) => setForm((current) => ({ ...current, admissionLabel: text }))}
                placeholder="dd/mm/aaaa"
                placeholderTextColor="#A7AEC2"
              />

              <Pressable style={[rhStyles.primaryButtonGreen, styles.spacingTop]} onPress={handleSubmit}>
                <Text style={styles.primaryButtonText}>Cadastrar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <RHSimplePickerModal
        visible={isCargoPickerOpen}
        title="Cargo"
        options={rhCargosList}
        selectedValue={form.role}
        onSelect={(value) => setForm((current) => ({ ...current, role: value }))}
        onClose={() => setIsCargoPickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isUnidadePickerOpen}
        title="Unidade"
        options={rhUnidadesList}
        selectedValue={form.unit}
        onSelect={(value) => setForm((current) => ({ ...current, unit: value }))}
        onClose={() => setIsUnidadePickerOpen(false)}
      />
    </>
  );
}

export function RHColaboradoresScreen({ navigation }: ScreenProps<'RHColaboradores'>) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<RhStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [unidadeFilter, setUnidadeFilter] = useState('Todas as unidades');
  const [statusFilter, setStatusFilter] = useState('Todos os status');
  const [isUnidadeFilterOpen, setIsUnidadeFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<ImportedCsvFile | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 7;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    Promise.all([fetchRhColaboradores(), fetchRhStats()])
      .then(([rows, statsResult]) => {
        if (!isMounted) return;
        setEmployees(rows.map(mapRhColaboradorToEmployee));
        setStats(statsResult);
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os colaboradores.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const statsBreakdown = useMemo(() => computeRhStatsBreakdown(stats), [stats]);

  const statusFilterOptions = ['Todos os status', 'Ativo', 'Em férias', 'Afastado', 'Desligado'];
  const unidadeFilterOptions = useMemo(() => {
    const unique = new Set<string>();
    employees.forEach((employee) => {
      if (employee.unit && employee.unit !== '—') unique.add(employee.unit);
    });
    return ['Todas as unidades', ...Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'))];
  }, [employees]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesQuery =
        !query ||
        employee.fullName.toLowerCase().includes(query) ||
        employee.registration.toLowerCase().includes(query) ||
        employee.cpf.toLowerCase().includes(query);
      const matchesUnidade = unidadeFilter === 'Todas as unidades' || employee.unit === unidadeFilter;
      const matchesStatus =
        statusFilter === 'Todos os status' ||
        rhEmployeeStatusMeta[employee.status].label === statusFilter;
      return matchesQuery && matchesUnidade && matchesStatus;
    });
  }, [employees, search, unidadeFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [search, unidadeFilter, statusFilter]);

  const pageItems = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage]
  );

  const handleSaveNewEmployee = (employee: Employee) => {
    setEmployees((current) => [employee, ...current]);
    setIsNovoModalOpen(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

      if (!baseDirectory) {
        Alert.alert('Template indisponível', 'Não foi possível gerar o template CSV neste dispositivo.');
        return;
      }

      const fileUri = `${baseDirectory}template-colaboradores.csv`;
      await FileSystem.writeAsStringAsync(fileUri, colaboradoresCsvTemplate, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Baixar template CSV',
          UTI: 'public.comma-separated-values-text',
        });
        return;
      }

      Alert.alert('Template gerado', `Arquivo salvo em:\n${fileUri}`);
    } catch {
      Alert.alert('Erro ao gerar template', 'Não foi possível gerar o template CSV agora.');
    }
  };

  const handlePickImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.name ?? 'arquivo.csv';
      const isCsv = fileName.toLowerCase().endsWith('.csv') || asset.mimeType?.includes('csv');

      if (!isCsv) {
        Alert.alert('Arquivo inválido', 'Selecione um arquivo CSV no formato do template.');
        return;
      }

      setSelectedImportFile({
        name: fileName,
        uri: asset.uri,
        sizeLabel: formatFileSize(asset.size),
      });
    } catch {
      Alert.alert('Falha ao selecionar arquivo', 'Não foi possível abrir o seletor de arquivos agora.');
    }
  };

  const handleValidateImport = () => {
    if (!selectedImportFile) {
      return;
    }

    Alert.alert(
      'Validação concluída',
      `${selectedImportFile.name} está no formato CSV esperado e pronto para conferência.`
    );
  };

  const handleImportEmployees = () => {
    if (!selectedImportFile) {
      return;
    }

    Alert.alert(
      'Importação iniciada',
      `${selectedImportFile.name} foi enviado para importação em lote de colaboradores.`
    );
    setIsImportModalOpen(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={rhStyles.statsPillRow}>
          <View style={rhStyles.statsPill}>
            <Text style={rhStyles.statsPillLabel}>Quadro</Text>
            <Text style={rhStyles.statsPillValue}>{statsBreakdown.quadro.toLocaleString('pt-BR')}</Text>
          </View>
          <View style={[rhStyles.statsPill, { backgroundColor: '#E3F5EA' }]}>
            <Text style={[rhStyles.statsPillLabel, { color: '#18955A' }]}>Ativos</Text>
            <Text style={[rhStyles.statsPillValue, { color: '#18955A' }]}>{statsBreakdown.ativos}</Text>
          </View>
          <View style={[rhStyles.statsPill, { backgroundColor: '#F1F2F7' }]}>
            <Text style={[rhStyles.statsPillLabel, { color: '#5E667D' }]}>Afastados</Text>
            <Text style={[rhStyles.statsPillValue, { color: '#5E667D' }]}>{statsBreakdown.afastados}</Text>
          </View>
          <View style={[rhStyles.statsPill, { backgroundColor: '#FCEFDA' }]}>
            <Text style={[rhStyles.statsPillLabel, { color: '#B07A1E' }]}>Férias</Text>
            <Text style={[rhStyles.statsPillValue, { color: '#B07A1E' }]}>{statsBreakdown.ferias}</Text>
          </View>
          <View style={[rhStyles.statsPill, { backgroundColor: '#FCE8EC' }]}>
            <Text style={[rhStyles.statsPillLabel, { color: '#E6213D' }]}>Desligados</Text>
            <Text style={[rhStyles.statsPillValue, { color: '#E6213D' }]}>{statsBreakdown.desligados}</Text>
          </View>
        </View>

        <View style={rhStyles.searchRow}>
          <Feather name="search" size={16} color="#9AA1B5" />
          <TextInput
            style={rhStyles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome, matrícula, CPF..."
            placeholderTextColor="#A7AEC2"
          />
        </View>

        <View style={rhStyles.filterPillRow}>
          <RHFilterPill label={unidadeFilter} onPress={() => setIsUnidadeFilterOpen(true)} />
          <RHFilterPill label={statusFilter} onPress={() => setIsStatusFilterOpen(true)} />
        </View>

        <View style={styles.directorNotifHeaderRow}>
          <Text style={styles.directorNotifCountLabel}>{filtered.length} resultados</Text>
          <View style={rhStyles.headerActionsRow}>
            <Pressable
              style={rhStyles.secondaryIconButton}
              onPress={() => setIsImportModalOpen(true)}
            >
              <Feather name="upload" size={15} color="#15203E" />
              <Text style={rhStyles.secondaryIconButtonText}>Importar</Text>
            </Pressable>
            <Pressable style={styles.directorNotifNewButton} onPress={() => setIsNovoModalOpen(true)}>
              <Feather name="plus" size={15} color="#FFFFFF" />
              <Text style={styles.directorNotifNewButtonText}>Novo</Text>
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Carregando colaboradores...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>{errorMessage}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Nenhum colaborador encontrado.</Text>
          </View>
        ) : (
          pageItems.map((employee) => {
            const statusMeta = rhEmployeeStatusMeta[employee.status];
            const initials = employee.fullName
              .split(' ')
              .slice(0, 2)
              .map((part) => part[0])
              .join('')
              .toUpperCase();

            return (
              <Pressable
                key={employee.id}
                style={rhStyles.employeeCard}
                onPress={() =>
                  navigation.navigate('RHColaboradorDetalhe', {
                    employeeId: employee.id,
                    employeeInicial: employee,
                  })
                }
              >
                <View style={rhStyles.employeeAvatar}>
                  <Text style={rhStyles.employeeAvatarText}>{initials}</Text>
                </View>
                <View style={rhStyles.employeeInfo}>
                  <Text style={rhStyles.employeeName} numberOfLines={1}>
                    {employee.fullName}
                  </Text>
                  <Text style={rhStyles.employeeRoleUnit} numberOfLines={1}>
                    {employee.role} · {employee.unit}
                  </Text>
                  <Text style={rhStyles.employeeMeta} numberOfLines={1}>
                    Matr. {employee.registration} · adm. {employee.admissionLabel}
                  </Text>
                </View>
                <View style={[rhStyles.employeeStatusPill, { backgroundColor: statusMeta.tint }]}>
                  <Text style={[rhStyles.employeeStatusText, { color: statusMeta.color }]}>
                    {statusMeta.label}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}

        {filtered.length > 0 ? (
          <View style={rhStyles.paginationRow}>
            <Pressable
              style={[rhStyles.paginationButton, currentPage <= 1 && rhStyles.paginationButtonDisabled]}
              disabled={currentPage <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Feather name="chevron-left" size={16} color="#3A415C" />
            </Pressable>
            <Text style={rhStyles.paginationText}>Pág. {currentPage} de {pageCount}</Text>
            <Pressable
              style={[rhStyles.paginationButton, currentPage >= pageCount && rhStyles.paginationButtonDisabled]}
              disabled={currentPage >= pageCount}
              onPress={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              <Feather name="chevron-right" size={16} color="#3A415C" />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <NovoColaboradorModal
        visible={isNovoModalOpen}
        onClose={() => setIsNovoModalOpen(false)}
        onSave={handleSaveNewEmployee}
      />
      <RHImportEmployeesModal
        visible={isImportModalOpen}
        selectedFile={selectedImportFile}
        onClose={() => setIsImportModalOpen(false)}
        onDownloadTemplate={handleDownloadTemplate}
        onPickFile={handlePickImportFile}
        onValidate={handleValidateImport}
        onImport={handleImportEmployees}
      />
      <RHSimplePickerModal
        visible={isUnidadeFilterOpen}
        title="Unidade"
        options={unidadeFilterOptions}
        selectedValue={unidadeFilter}
        onSelect={setUnidadeFilter}
        onClose={() => setIsUnidadeFilterOpen(false)}
      />
      <RHSimplePickerModal
        visible={isStatusFilterOpen}
        title="Status"
        options={statusFilterOptions}
        selectedValue={statusFilter}
        onSelect={setStatusFilter}
        onClose={() => setIsStatusFilterOpen(false)}
      />
    </SafeAreaView>
  );
}

// ---------- Colaborador Detalhe ----------

type QuickActionKey =
  | 'dadosPessoais'
  | 'documentos'
  | 'ponto'
  | 'afastamentos'
  | 'ferias'
  | 'contracheques'
  | 'promocoes'
  | 'premiacoes'
  | 'reembolsos'
  | 'integracao'
  | 'treinamentos'
  | 'transferencias'
  | 'desligamento';

const rhQuickActions: Array<{ key: QuickActionKey; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { key: 'dadosPessoais', label: 'Dados Pessoais', icon: 'check-circle' },
  { key: 'documentos', label: 'Documentos', icon: 'file-text' },
  { key: 'ponto', label: 'Ponto', icon: 'clock' },
  { key: 'afastamentos', label: 'Afastamentos', icon: 'shield' },
  { key: 'ferias', label: 'Férias', icon: 'sun' },
  { key: 'contracheques', label: 'Contracheques', icon: 'dollar-sign' },
  { key: 'promocoes', label: 'Promoções', icon: 'trending-up' },
  { key: 'premiacoes', label: 'Premiações', icon: 'award' },
  { key: 'reembolsos', label: 'Reembolsos', icon: 'credit-card' },
  { key: 'integracao', label: 'Integração', icon: 'clipboard' },
  { key: 'treinamentos', label: 'Treinamentos', icon: 'book-open' },
  { key: 'transferencias', label: 'Transferências', icon: 'repeat' },
  { key: 'desligamento', label: 'Desligamento', icon: 'log-out' },
];

function RHSmallModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle} numberOfLines={2}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EmBreveModal({
  visible,
  title,
  employeeName,
  onClose,
}: {
  visible: boolean;
  title: string;
  employeeName: string;
  onClose: () => void;
}) {
  return (
    <RHSmallModal visible={visible} title={`${title} — ${employeeName}`} onClose={onClose}>
      <Text style={rhStyles.emBreveText}>Em breve. Em desenvolvimento para {employeeName}.</Text>
    </RHSmallModal>
  );
}

function RHImportEmployeesModal({
  visible,
  selectedFile,
  onClose,
  onDownloadTemplate,
  onPickFile,
  onValidate,
  onImport,
}: {
  visible: boolean;
  selectedFile: ImportedCsvFile | null;
  onClose: () => void;
  onDownloadTemplate: () => void;
  onPickFile: () => void;
  onValidate: () => void;
  onImport: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={rhStyles.importEmployeesModalCard}>
          <View style={rhStyles.importEmployeesHeader}>
            <View style={rhStyles.importEmployeesHeaderTextBlock}>
              <Text style={rhStyles.importEmployeesTitle}>Importar colaboradores em lote</Text>
              <Text style={rhStyles.importEmployeesSubtitle}>
                Envie um CSV (UTF-8). Use o template abaixo. Colaboradores com CPF já cadastrado
                serão atualizados; novos serão inseridos.
              </Text>
            </View>

            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <View style={rhStyles.importEmployeesActionsRow}>
            <Pressable style={rhStyles.importEmployeesActionButton} onPress={onDownloadTemplate}>
              <Feather name="download" size={16} color="#15203E" />
              <Text style={rhStyles.importEmployeesActionButtonText}>Baixar template CSV</Text>
            </Pressable>

            <Pressable style={rhStyles.importEmployeesActionButton} onPress={onPickFile}>
              <Feather name="upload" size={16} color="#15203E" />
              <Text style={rhStyles.importEmployeesActionButtonText}>Selecionar arquivo</Text>
            </Pressable>
          </View>

          {selectedFile ? (
            <View style={rhStyles.importEmployeesSelectedFileCard}>
              <View style={rhStyles.importEmployeesSelectedFileLeft}>
                <View style={rhStyles.importEmployeesSelectedFileIcon}>
                  <Feather name="file-text" size={16} color="#E6213D" />
                </View>
                <View style={rhStyles.importEmployeesSelectedFileTextBlock}>
                  <Text style={rhStyles.importEmployeesSelectedFileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={rhStyles.importEmployeesSelectedFileMeta}>{selectedFile.sizeLabel}</Text>
                </View>
              </View>

              <Pressable style={rhStyles.importEmployeesChangeFileButton} onPress={onPickFile}>
                <Text style={rhStyles.importEmployeesChangeFileButtonText}>Trocar</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={rhStyles.importEmployeesRulesCard}>
            <View style={rhStyles.importEmployeesRulesHeader}>
              <Feather name="info" size={16} color="#4C5470" />
              <Text style={rhStyles.importEmployeesRulesTitle}>Regras</Text>
            </View>

            {colaboradoresCsvRules.map((rule) => (
              <View key={rule} style={rhStyles.importEmployeesRuleRow}>
                <Text style={rhStyles.importEmployeesRuleBullet}>•</Text>
                <Text style={rhStyles.importEmployeesRuleText}>{rule}</Text>
              </View>
            ))}
          </View>

          <View style={rhStyles.importEmployeesFooter}>
            <Pressable style={rhStyles.importEmployeesCloseButton} onPress={onClose}>
              <Text style={rhStyles.importEmployeesCloseButtonText}>Fechar</Text>
            </Pressable>

            <View style={rhStyles.importEmployeesFooterActions}>
              <Pressable
                style={[
                  rhStyles.importEmployeesGhostButton,
                  !selectedFile ? rhStyles.importEmployeesButtonDisabled : null,
                ]}
                onPress={onValidate}
                disabled={!selectedFile}
              >
                <Text
                  style={[
                    rhStyles.importEmployeesGhostButtonText,
                    !selectedFile ? rhStyles.importEmployeesGhostButtonTextDisabled : null,
                  ]}
                >
                  Validar (dry-run)
                </Text>
              </Pressable>

              <Pressable
                style={[
                  rhStyles.importEmployeesPrimaryButton,
                  !selectedFile ? rhStyles.importEmployeesButtonDisabled : null,
                ]}
                onPress={onImport}
                disabled={!selectedFile}
              >
                <Feather name="upload" size={15} color="#FFFFFF" />
                <Text style={rhStyles.importEmployeesPrimaryButtonText}>Importar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type DadosPessoaisTab = 'pessoais' | 'dependentes' | 'contrato' | 'pendencias' | 'historico';

const rhDadosPessoaisTabs: Array<{
  key: DadosPessoaisTab;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { key: 'pessoais', label: 'Pessoais', icon: 'user' },
  { key: 'dependentes', label: 'Dependentes', icon: 'users' },
  { key: 'contrato', label: 'Contrato & Benefícios', icon: 'briefcase' },
  { key: 'pendencias', label: 'Pendências', icon: 'clipboard' },
  { key: 'historico', label: 'Histórico', icon: 'rotate-ccw' },
];

type RHDependentItem = {
  id: string;
  fullName: string;
  cpf: string;
  birthDate: string;
  kinship: string;
  universityStudent: boolean;
  disabled: boolean;
  active: boolean;
  notes: string;
};

const createEmptyDependentForm = (): Omit<RHDependentItem, 'id'> => ({
  fullName: '',
  cpf: '',
  birthDate: '',
  kinship: 'Filho',
  universityStudent: false,
  disabled: false,
  active: true,
  notes: '',
});

function DadosPessoaisModal({
  visible,
  employee,
  onClose,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DadosPessoaisTab>('pessoais');
  const [dependents, setDependents] = useState<RHDependentItem[]>([]);
  const [isDependentFormOpen, setIsDependentFormOpen] = useState(false);
  const [dependentForm, setDependentForm] = useState(createEmptyDependentForm());
  const [form, setForm] = useState({
    cpf: employee.cpf,
    rg: '',
    orgaoEmissor: '',
    ufRg: '',
    cnh: '',
    ctps: '',
    pisPasep: '',
    dataNascimento: '',
    sexo: '',
    tipoSanguineo: '',
    estadoCivil: '',
    grauInstrucao: '',
    nacionalidade: '',
    naturalidade: '',
    nomeMae: '',
    nomePai: '',
    telefoneFixo: '',
    celular: employee.celular,
  });
  const [contractForm, setContractForm] = useState({
    contractType: 'CLT',
    admissionDate: employee.admissionLabel,
    experienceEndDate: '02/10/2021',
    role: employee.role.toUpperCase(),
    setor: employee.setor.toUpperCase(),
    scheduleType: '44h semanais',
    scheduleHours: '14:00 às 22:00',
    scheduleModel: 'Sem modelo vinculado',
    baseSalary: employee.salario.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    irrfDependents: '0',
    insalubrityLevel: 'Nenhum',
    hazardPayEnabled: false,
    transportationVoucherEnabled: true,
    vrEnabled: false,
    vrDailyValue: '0,00',
    vaEnabled: false,
    vaDailyValue: '0,00',
    lifeInsuranceEnabled: false,
    lifeInsuranceCarrier: '',
    lifeInsuranceCoverage: '0,00',
    lifeInsuranceDiscount: '0,00',
    healthPlanEnabled: false,
    healthPlanOperator: '',
    healthPlanName: '',
    healthPlanPrimaryDiscount: '0,00',
    healthPlanDependentDiscount: '0,00',
    dentalPlanEnabled: false,
    dentalPlanOperator: '',
    dentalPlanName: '',
    dentalPlanPrimaryDiscount: '0,00',
    dentalPlanDependentDiscount: '0,00',
  });

  const pendingItems = useMemo(
    () => [
      {
        id: 'pending-1',
        title: 'ASO periódico vencendo',
        subtitle: 'Atualize o exame ocupacional até 15/10/2026 para manter o prontuário em dia.',
        tag: 'Crítica',
        tagColor: '#E6213D',
        tagTint: '#FCE8EC',
      },
      {
        id: 'pending-2',
        title: 'Comprovante de residência pendente',
        subtitle: 'Documento ainda não anexado pelo colaborador no portal.',
        tag: 'Documento',
        tagColor: '#B07A1E',
        tagTint: '#FCEFDA',
      },
      {
        id: 'pending-3',
        title: 'Assinatura do termo de benefícios',
        subtitle: 'Aguardando aceite do colaborador para concluir o cadastro de pacote.',
        tag: 'Ação RH',
        tagColor: '#3457D5',
        tagTint: '#E9EEFF',
      },
    ],
    []
  );

  const historyItems = useMemo(
    () => [
      {
        id: 'history-1',
        title: 'Admissão concluída',
        subtitle: `Cadastro inicial confirmado em ${employee.admissionLabel}.`,
        meta: 'Movimentação • RH',
      },
      {
        id: 'history-2',
        title: 'Atualização cadastral',
        subtitle: 'Telefone celular e e-mail corporativo revisados pela liderança.',
        meta: 'Cadastro • há 24 dias',
      },
      {
        id: 'history-3',
        title: 'Pacote de benefícios revisado',
        subtitle: 'VR/VA recalculados conforme jornada atual.',
        meta: 'Benefícios • há 12 dias',
      },
      {
        id: 'history-4',
        title: 'Checklist documental conferido',
        subtitle: 'Pendências restantes: comprovante de residência e ASO periódico.',
        meta: 'Documentos • hoje',
      },
    ],
    [employee.admissionLabel]
  );

  useEffect(() => {
    if (visible) {
      setActiveTab('pessoais');
      setForm((current) => ({ ...current, cpf: employee.cpf, celular: employee.celular }));
      setContractForm((current) => ({
        ...current,
        admissionDate: employee.admissionLabel,
        role: employee.role.toUpperCase(),
        setor: employee.setor.toUpperCase(),
        baseSalary: employee.salario.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }));
    }
  }, [visible, employee]);

  const updateField = (key: keyof typeof form) => (text: string) =>
    setForm((current) => ({ ...current, [key]: text }));
  const updateContractField =
    (key: keyof typeof contractForm) =>
    (value: string | boolean) =>
      setContractForm((current) => ({ ...current, [key]: value }));

  const saveSimpleAlert = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  const handleSaveDependent = () => {
    if (!dependentForm.fullName.trim() || !dependentForm.birthDate.trim() || !dependentForm.kinship.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, data de nascimento e grau de parentesco.');
      return;
    }

    setDependents((current) => [
      {
        id: `dependent-${Date.now()}`,
        ...dependentForm,
      },
      ...current,
    ]);
    setDependentForm(createEmptyDependentForm());
    setIsDependentFormOpen(false);
  };

  const activeIrffDependents = dependents.filter((item) => item.active).length;

  return (
    <RHSmallModal visible={visible} title={`Dados Pessoais — ${employee.fullName}`} onClose={onClose}>
      <View style={rhStyles.mobileDetailTabsShell}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={rhStyles.mobileDetailTabsRow}
        >
          {rhDadosPessoaisTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[rhStyles.mobileDetailTab, isActive ? rhStyles.mobileDetailTabActive : null]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Feather
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#1B6E3A' : '#6F768A'}
                />
                <Text style={[rhStyles.mobileDetailTabText, isActive ? rhStyles.mobileDetailTabTextActive : null]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {activeTab === 'pessoais' ? (
        <>
          <Text style={[rhStyles.detailSectionHeading, styles.spacingTop]}>Dados Pessoais</Text>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>CPF</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.cpf}
                onChangeText={updateField('cpf')}
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>RG</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.rg}
                onChangeText={updateField('rg')}
                placeholder="00000000-0"
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Órgão emissor (RG)</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.orgaoEmissor}
                onChangeText={updateField('orgaoEmissor')}
                placeholder="DETRAN"
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>UF do RG</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.ufRg}
                onChangeText={updateField('ufRg')}
                placeholder="RJ"
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>CNH</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.cnh}
                onChangeText={updateField('cnh')}
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>CTPS</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.ctps}
                onChangeText={updateField('ctps')}
                placeholder="00000000/0000 - RJ"
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>PIS/PASEP</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.pisPasep}
                onChangeText={updateField('pisPasep')}
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Data nascimento</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.dataNascimento}
                onChangeText={updateField('dataNascimento')}
                placeholder="dd/mm/aaaa"
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Sexo</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.sexo}
                onChangeText={updateField('sexo')}
                placeholder="Masculino"
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Tipo sanguíneo</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.tipoSanguineo}
                onChangeText={updateField('tipoSanguineo')}
                placeholder="Selecione"
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Estado civil</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.estadoCivil}
                onChangeText={updateField('estadoCivil')}
                placeholder="Solteiro(a)"
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Grau de instrução</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.grauInstrucao}
                onChangeText={updateField('grauInstrucao')}
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Nacionalidade</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.nacionalidade}
                onChangeText={updateField('nacionalidade')}
                placeholder="Selecione"
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Naturalidade</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.naturalidade}
                onChangeText={updateField('naturalidade')}
                placeholder="Cidade de nascimento"
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Nome da mãe</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.nomeMae}
                onChangeText={updateField('nomeMae')}
                placeholder="Nome completo da mãe"
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Nome do pai</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.nomePai}
                onChangeText={updateField('nomePai')}
                placeholder="Nome completo do pai"
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Telefone fixo</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.telefoneFixo}
                onChangeText={updateField('telefoneFixo')}
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Celular</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.celular}
                onChangeText={updateField('celular')}
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>

          <Pressable style={[rhStyles.primaryButtonGreen, styles.spacingTop]} onPress={onClose}>
            <Feather name="save" size={15} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Salvar dados</Text>
          </Pressable>
        </>
      ) : null}

      {activeTab === 'dependentes' ? (
        <>
          <View style={[rhStyles.dependentsHeaderRow, styles.spacingTop]}>
            <View style={rhStyles.dependentEligiblePill}>
              <Text style={rhStyles.dependentEligiblePillText}>
                {activeIrffDependents} elegível(is) para IRRF
              </Text>
            </View>

            <Pressable
              style={rhStyles.dependentAddButton}
              onPress={() => setIsDependentFormOpen(true)}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={rhStyles.dependentAddButtonText}>Adicionar dependente</Text>
            </Pressable>
          </View>

          {dependents.length === 0 ? (
            <View style={rhStyles.dependentEmptyCard}>
              <Text style={rhStyles.dependentEmptyText}>Nenhum dependente cadastrado.</Text>
            </View>
          ) : (
            dependents.map((dependent) => (
              <View key={dependent.id} style={rhStyles.dependentCard}>
                <View style={rhStyles.dependentCardTopRow}>
                  <View>
                    <Text style={rhStyles.dependentCardName}>{dependent.fullName}</Text>
                    <Text style={rhStyles.dependentCardMeta}>
                      {dependent.kinship} • nasc. {dependent.birthDate}
                    </Text>
                  </View>

                  <View
                    style={[
                      rhStyles.dependentStatusPill,
                      dependent.active ? rhStyles.dependentStatusPillActive : rhStyles.dependentStatusPillInactive,
                    ]}
                  >
                    <Text
                      style={[
                        rhStyles.dependentStatusPillText,
                        dependent.active
                          ? rhStyles.dependentStatusPillTextActive
                          : rhStyles.dependentStatusPillTextInactive,
                      ]}
                    >
                      {dependent.active ? 'Ativo' : 'Inativo'}
                    </Text>
                  </View>
                </View>

                <View style={rhStyles.dependentInfoGrid}>
                  <Text style={rhStyles.dependentInfoText}>CPF: {dependent.cpf || 'Não informado'}</Text>
                  <Text style={rhStyles.dependentInfoText}>
                    Estudante: {dependent.universityStudent ? 'Sim' : 'Não'}
                  </Text>
                  <Text style={rhStyles.dependentInfoText}>
                    Incapacitado: {dependent.disabled ? 'Sim' : 'Não'}
                  </Text>
                </View>

                {dependent.notes ? <Text style={rhStyles.dependentNotes}>{dependent.notes}</Text> : null}
              </View>
            ))
          )}
        </>
      ) : null}

      {activeTab === 'contrato' ? (
        <>
          <View style={[rhStyles.formSectionCard, styles.spacingTop]}>
            <Text style={rhStyles.formSectionTitle}>Dados contratuais</Text>

            <View style={rhStyles.formRow}>
              <View style={rhStyles.formRowItem}>
                <Text style={styles.requestFieldLabel}>Tipo de contrato</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={contractForm.contractType}
                  onChangeText={updateContractField('contractType')}
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <Text style={styles.requestFieldLabel}>Data de admissão</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={contractForm.admissionDate}
                  onChangeText={updateContractField('admissionDate')}
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <View style={rhStyles.formRow}>
              <View style={rhStyles.formRowItem}>
                <Text style={styles.requestFieldLabel}>Vencimento da experiência</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={contractForm.experienceEndDate}
                  onChangeText={updateContractField('experienceEndDate')}
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <Text style={styles.requestFieldLabel}>Cargo</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={contractForm.role}
                  onChangeText={updateContractField('role')}
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <View style={rhStyles.formRow}>
              <View style={rhStyles.formRowItem}>
                <Text style={styles.requestFieldLabel}>Setor</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={contractForm.setor}
                  onChangeText={updateContractField('setor')}
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <Text style={styles.requestFieldLabel}>Jornada</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={contractForm.scheduleType}
                  onChangeText={updateContractField('scheduleType')}
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <Text style={styles.requestFieldLabel}>Horário</Text>
            <TextInput
              style={styles.processTextInput}
              value={contractForm.scheduleHours}
              onChangeText={updateContractField('scheduleHours')}
              placeholderTextColor="#A7AEC2"
            />

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Modelo de jornada</Text>
            <TextInput
              style={styles.processTextInput}
              value={contractForm.scheduleModel}
              onChangeText={updateContractField('scheduleModel')}
              placeholderTextColor="#A7AEC2"
            />

            <Pressable
              style={rhStyles.detailSaveButton}
              onPress={() => saveSimpleAlert('Contrato salvo', 'Os dados contratuais foram atualizados.')}
            >
              <Feather name="save" size={14} color="#FFFFFF" />
              <Text style={rhStyles.detailSaveButtonText}>Salvar contrato</Text>
            </Pressable>
          </View>

          <View style={rhStyles.formSectionCard}>
            <View style={rhStyles.sectionHeaderInline}>
              <Text style={rhStyles.formSectionTitle}>Remuneração</Text>
              <Text style={rhStyles.formSectionHint}>Para alterar o salário, use o atalho Promoções.</Text>
            </View>

            <Text style={styles.requestFieldLabel}>Salário base atual</Text>
            <TextInput
              style={styles.processTextInput}
              value={contractForm.baseSalary}
              onChangeText={updateContractField('baseSalary')}
              placeholderTextColor="#A7AEC2"
            />
          </View>

          <View style={rhStyles.formSectionCard}>
            <Text style={rhStyles.formSectionTitle}>Encargos & adicionais</Text>

            <View style={rhStyles.formRow}>
              <View style={rhStyles.formRowItem}>
                <Text style={styles.requestFieldLabel}>Dependentes IRRF</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={contractForm.irrfDependents}
                  onChangeText={updateContractField('irrfDependents')}
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <Text style={styles.requestFieldLabel}>Grau de insalubridade</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={contractForm.insalubrityLevel}
                  onChangeText={updateContractField('insalubrityLevel')}
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <View style={rhStyles.toggleFormCard}>
              <Text style={rhStyles.toggleFormLabel}>Periculosidade (+30%)</Text>
              <ToggleSwitch
                value={contractForm.hazardPayEnabled}
                onValueChange={() => updateContractField('hazardPayEnabled')(!contractForm.hazardPayEnabled)}
              />
            </View>

            <View style={rhStyles.toggleFormCard}>
              <Text style={rhStyles.toggleFormLabel}>Recebe Vale-Transporte</Text>
              <ToggleSwitch
                value={contractForm.transportationVoucherEnabled}
                onValueChange={() =>
                  updateContractField('transportationVoucherEnabled')(!contractForm.transportationVoucherEnabled)
                }
              />
            </View>

            <Pressable
              style={rhStyles.detailSaveButton}
              onPress={() => saveSimpleAlert('Encargos salvos', 'Os encargos e adicionais foram atualizados.')}
            >
              <Feather name="save" size={14} color="#FFFFFF" />
              <Text style={rhStyles.detailSaveButtonText}>Salvar encargos</Text>
            </Pressable>
          </View>

          <View style={rhStyles.formSectionCard}>
            <Text style={rhStyles.formSectionTitle}>Benefícios</Text>

            <View style={rhStyles.benefitEditorCard}>
              <View style={rhStyles.benefitEditorHeader}>
                <View style={rhStyles.benefitEditorTitleRow}>
                  <ToggleSwitch
                    value={contractForm.vrEnabled}
                    onValueChange={() => updateContractField('vrEnabled')(!contractForm.vrEnabled)}
                  />
                  <Text style={rhStyles.benefitEditorTitle}>Vale Refeição (VR)</Text>
                </View>
                <Text style={rhStyles.benefitEditorMeta}>Total estimado: R$ 0,00/mês (22 dias)</Text>
              </View>
              <Text style={styles.requestFieldLabel}>Valor por dia</Text>
              <TextInput
                style={styles.processTextInput}
                value={contractForm.vrDailyValue}
                onChangeText={updateContractField('vrDailyValue')}
                placeholderTextColor="#A7AEC2"
              />
            </View>

            <View style={rhStyles.benefitEditorCard}>
              <View style={rhStyles.benefitEditorHeader}>
                <View style={rhStyles.benefitEditorTitleRow}>
                  <ToggleSwitch
                    value={contractForm.vaEnabled}
                    onValueChange={() => updateContractField('vaEnabled')(!contractForm.vaEnabled)}
                  />
                  <Text style={rhStyles.benefitEditorTitle}>Vale Alimentação (VA)</Text>
                </View>
                <Text style={rhStyles.benefitEditorMeta}>Total estimado: R$ 0,00/mês (22 dias)</Text>
              </View>
              <Text style={styles.requestFieldLabel}>Valor por dia</Text>
              <TextInput
                style={styles.processTextInput}
                value={contractForm.vaDailyValue}
                onChangeText={updateContractField('vaDailyValue')}
                placeholderTextColor="#A7AEC2"
              />
            </View>

            <View style={rhStyles.benefitEditorCard}>
              <View style={rhStyles.benefitEditorTitleRow}>
                <ToggleSwitch
                  value={contractForm.lifeInsuranceEnabled}
                  onValueChange={() =>
                    updateContractField('lifeInsuranceEnabled')(!contractForm.lifeInsuranceEnabled)
                  }
                />
                <Text style={rhStyles.benefitEditorTitle}>Seguro de Vida</Text>
              </View>
              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Seguradora</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={contractForm.lifeInsuranceCarrier}
                    onChangeText={updateContractField('lifeInsuranceCarrier')}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Cobertura</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={contractForm.lifeInsuranceCoverage}
                    onChangeText={updateContractField('lifeInsuranceCoverage')}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
              </View>
              <Text style={styles.requestFieldLabel}>Desconto mensal</Text>
              <TextInput
                style={styles.processTextInput}
                value={contractForm.lifeInsuranceDiscount}
                onChangeText={updateContractField('lifeInsuranceDiscount')}
                placeholderTextColor="#A7AEC2"
              />
            </View>

            <View style={rhStyles.benefitEditorCard}>
              <View style={rhStyles.benefitEditorTitleRow}>
                <ToggleSwitch
                  value={contractForm.healthPlanEnabled}
                  onValueChange={() => updateContractField('healthPlanEnabled')(!contractForm.healthPlanEnabled)}
                />
                <Text style={rhStyles.benefitEditorTitle}>Plano de Saúde</Text>
              </View>
              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Operadora</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={contractForm.healthPlanOperator}
                    onChangeText={updateContractField('healthPlanOperator')}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Plano</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={contractForm.healthPlanName}
                    onChangeText={updateContractField('healthPlanName')}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
              </View>
              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Desc. titular</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={contractForm.healthPlanPrimaryDiscount}
                    onChangeText={updateContractField('healthPlanPrimaryDiscount')}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Desc. por dependente</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={contractForm.healthPlanDependentDiscount}
                    onChangeText={updateContractField('healthPlanDependentDiscount')}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
              </View>
            </View>

            <View style={rhStyles.benefitEditorCard}>
              <View style={rhStyles.benefitEditorTitleRow}>
                <ToggleSwitch
                  value={contractForm.dentalPlanEnabled}
                  onValueChange={() => updateContractField('dentalPlanEnabled')(!contractForm.dentalPlanEnabled)}
                />
                <Text style={rhStyles.benefitEditorTitle}>Plano Odontológico</Text>
              </View>
              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Operadora</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={contractForm.dentalPlanOperator}
                    onChangeText={updateContractField('dentalPlanOperator')}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Plano</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={contractForm.dentalPlanName}
                    onChangeText={updateContractField('dentalPlanName')}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
              </View>
              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Desc. titular</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={contractForm.dentalPlanPrimaryDiscount}
                    onChangeText={updateContractField('dentalPlanPrimaryDiscount')}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Desc. por dependente</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={contractForm.dentalPlanDependentDiscount}
                    onChangeText={updateContractField('dentalPlanDependentDiscount')}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
              </View>
            </View>

            <View style={rhStyles.benefitsSummaryCard}>
              <Text style={rhStyles.benefitsSummaryLabel}>Benefícios recebidos (VR+VA)</Text>
              <Text style={rhStyles.benefitsSummaryValue}>R$ 0,00</Text>
              <Text style={rhStyles.benefitsSummaryMuted}>Descontos benefícios</Text>
              <Text style={rhStyles.benefitsSummaryValueDanger}>R$ 0,00</Text>
            </View>

            <Pressable
              style={rhStyles.detailSaveButton}
              onPress={() => saveSimpleAlert('Benefícios salvos', 'O pacote de benefícios foi atualizado.')}
            >
              <Feather name="save" size={14} color="#FFFFFF" />
              <Text style={rhStyles.detailSaveButtonText}>Salvar benefícios</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {activeTab === 'pendencias' ? (
        <>
          <View style={[rhStyles.dependentsHeaderRow, styles.spacingTop]}>
            <View style={[rhStyles.dependentEligiblePill, { backgroundColor: '#FFF3D8' }]}>
              <Text style={[rhStyles.dependentEligiblePillText, { color: '#9A6A11' }]}>
                {pendingItems.length} pendência(s) em aberto
              </Text>
            </View>
            <View style={[rhStyles.dependentEligiblePill, { backgroundColor: '#FCE8EC' }]}>
              <Text style={[rhStyles.dependentEligiblePillText, { color: '#D52B47' }]}>1 crítica</Text>
            </View>
          </View>

          <View style={[rhStyles.warningBox, styles.spacingTop]}>
            <View style={rhStyles.warningBoxHeaderRow}>
              <Feather name="alert-triangle" size={15} color="#8A5A12" />
              <Text style={rhStyles.warningBoxTitle}>Itens que precisam de ação do RH</Text>
            </View>
            <Text style={rhStyles.warningBoxNote}>
              Regularize as pendências abaixo para evitar bloqueios em benefícios, medicina ocupacional e
              rotinas de folha.
            </Text>
          </View>

          {pendingItems.map((item) => (
            <View key={item.id} style={rhStyles.pendingItemCard}>
              <View style={rhStyles.pendingItemTopRow}>
                <View style={[rhStyles.pendingItemTag, { backgroundColor: item.tagTint }]}>
                  <Text style={[rhStyles.pendingItemTagText, { color: item.tagColor }]}>{item.tag}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#9AA1B5" />
              </View>
              <Text style={rhStyles.pendingItemTitle}>{item.title}</Text>
              <Text style={rhStyles.pendingItemSubtitle}>{item.subtitle}</Text>
            </View>
          ))}
        </>
      ) : null}

      {activeTab === 'historico' ? (
        <>
          <Text style={[rhStyles.detailSectionHeading, styles.spacingTop]}>Histórico do colaborador</Text>
          {historyItems.map((item, index) => (
            <View key={item.id} style={rhStyles.timelineRow}>
              <View style={rhStyles.timelineRail}>
                <View style={rhStyles.timelineDot} />
                {index < historyItems.length - 1 ? <View style={rhStyles.timelineLine} /> : null}
              </View>
              <View style={rhStyles.timelineCard}>
                <Text style={rhStyles.historyCardTitle}>{item.title}</Text>
                <Text style={rhStyles.historyCardMeta}>{item.meta}</Text>
                <Text style={rhStyles.timelineDescription}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <Modal visible={isDependentFormOpen} animationType="fade" transparent onRequestClose={() => setIsDependentFormOpen(false)}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>Novo dependente</Text>
              <Pressable
                onPress={() => {
                  setIsDependentFormOpen(false);
                  setDependentForm(createEmptyDependentForm());
                }}
                hitSlop={8}
              >
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.requestFieldLabel}>Nome completo *</Text>
              <TextInput
                style={styles.processTextInput}
                value={dependentForm.fullName}
                onChangeText={(text) => setDependentForm((current) => ({ ...current, fullName: text }))}
                placeholderTextColor="#A7AEC2"
              />

              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>CPF</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={dependentForm.cpf}
                    onChangeText={(text) => setDependentForm((current) => ({ ...current, cpf: text }))}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Data de nascimento *</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={dependentForm.birthDate}
                    onChangeText={(text) => setDependentForm((current) => ({ ...current, birthDate: text }))}
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
              </View>

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Grau de parentesco *</Text>
              <TextInput
                style={styles.processTextInput}
                value={dependentForm.kinship}
                onChangeText={(text) => setDependentForm((current) => ({ ...current, kinship: text }))}
                placeholderTextColor="#A7AEC2"
              />

              <View style={[rhStyles.toggleFormCard, styles.spacingTop]}>
                <Text style={rhStyles.toggleFormLabel}>Estudante universitário (até 24 anos)</Text>
                <ToggleSwitch
                  value={dependentForm.universityStudent}
                  onValueChange={() =>
                    setDependentForm((current) => ({
                      ...current,
                      universityStudent: !current.universityStudent,
                    }))
                  }
                />
              </View>

              <View style={rhStyles.toggleFormCard}>
                <Text style={rhStyles.toggleFormLabel}>Incapacitado físico ou mental</Text>
                <ToggleSwitch
                  value={dependentForm.disabled}
                  onValueChange={() =>
                    setDependentForm((current) => ({
                      ...current,
                      disabled: !current.disabled,
                    }))
                  }
                />
              </View>

              <View style={rhStyles.toggleFormCard}>
                <Text style={rhStyles.toggleFormLabel}>Ativo</Text>
                <ToggleSwitch
                  value={dependentForm.active}
                  onValueChange={() =>
                    setDependentForm((current) => ({
                      ...current,
                      active: !current.active,
                    }))
                  }
                />
              </View>

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Observação</Text>
              <TextInput
                style={[styles.processTextInput, styles.processDocumentationArea]}
                value={dependentForm.notes}
                onChangeText={(text) => setDependentForm((current) => ({ ...current, notes: text }))}
                placeholderTextColor="#A7AEC2"
                multiline
                textAlignVertical="top"
              />

              <Pressable style={[rhStyles.detailSaveButton, styles.spacingTop]} onPress={handleSaveDependent}>
                <Feather name="save" size={14} color="#FFFFFF" />
                <Text style={rhStyles.detailSaveButtonText}>Salvar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </RHSmallModal>
  );
}

const rhDocumentCategories: Array<{
  key: string;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  pendentes: number;
}> = [
  { key: 'identificacao', label: 'Identificação', description: 'RG, CPF, CNH, título, reservista', icon: 'user', pendentes: 2 },
  { key: 'trabalho', label: 'Trabalho', description: 'CTPS, contrato, aditivos e advertências', icon: 'file-text', pendentes: 2 },
  { key: 'saude', label: 'Saúde', description: 'ASOs admissional, periódico, demissional', icon: 'heart', pendentes: 1 },
  { key: 'endereco', label: 'Endereço', description: 'Comprovante de residência', icon: 'home', pendentes: 0 },
  { key: 'pessoal', label: 'Pessoal', description: 'Certidões, diplomas, foto 3x4', icon: 'book-open', pendentes: 1 },
  { key: 'outros', label: 'Outros', description: 'Demais documentos', icon: 'folder', pendentes: 0 },
];

function DocumentosModal({
  visible,
  employee,
  onClose,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
}) {
  const totalPendentes = rhDocumentCategories.reduce((sum, category) => sum + category.pendentes, 0);

  return (
    <RHSmallModal visible={visible} title={`Documentos — ${employee.fullName}`} onClose={onClose}>
      <View style={rhStyles.docStatsRow}>
        <Text style={rhStyles.docStatsText}>0 total · {totalPendentes} pendentes · 0 vencidos</Text>
        <Pressable
          style={rhStyles.primaryButtonGreenSmall}
          onPress={() => Alert.alert('Enviar documento', 'Upload de documentos em breve.')}
        >
          <Feather name="plus" size={13} color="#FFFFFF" />
          <Text style={rhStyles.primaryButtonSmallText}>Enviar</Text>
        </Pressable>
      </View>

      <View style={rhStyles.docGrid}>
        {rhDocumentCategories.map((category) => (
          <View key={category.key} style={rhStyles.docCard}>
            <View style={rhStyles.docCardTopRow}>
              <View style={[styles.iconShell, styles.iconAccentGreen]}>
                <Feather name={category.icon} size={15} color="#1B6E3A" />
              </View>
              {category.pendentes > 0 ? (
                <View style={rhStyles.docPendingBadge}>
                  <Text style={rhStyles.docPendingBadgeText}>{category.pendentes} pend.</Text>
                </View>
              ) : null}
            </View>
            <Text style={rhStyles.docCardTitle}>{category.label}</Text>
            <Text style={rhStyles.docCardDescription} numberOfLines={2}>
              {category.description}
            </Text>
            <Text style={rhStyles.docCardCount}>0 documentos</Text>
          </View>
        ))}
      </View>
    </RHSmallModal>
  );
}

function ContrachequesModal({
  visible,
  employee,
  onClose,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
}) {
  return (
    <RHSmallModal visible={visible} title={`Contracheques — ${employee.fullName}`} onClose={onClose}>
      <RHEmptyTabState message="Nenhum contracheque emitido ainda." />
    </RHSmallModal>
  );
}

function TreinamentosModal({
  visible,
  employee,
  onClose,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
}) {
  return (
    <RHSmallModal visible={visible} title={`Treinamentos — ${employee.fullName}`} onClose={onClose}>
      <View style={rhStyles.trainingStatsRow}>
        <View style={rhStyles.trainingStatItem}>
          <Feather name="book-open" size={16} color="#3457D5" />
          <Text style={rhStyles.trainingStatLabel}>Total</Text>
          <Text style={rhStyles.trainingStatValue}>0</Text>
        </View>
        <View style={rhStyles.trainingStatItem}>
          <Feather name="check-circle" size={16} color="#18955A" />
          <Text style={rhStyles.trainingStatLabel}>Concluídos</Text>
          <Text style={rhStyles.trainingStatValue}>0</Text>
        </View>
        <View style={rhStyles.trainingStatItem}>
          <Feather name="clock" size={16} color="#B07A1E" />
          <Text style={rhStyles.trainingStatLabel}>Em andamento</Text>
          <Text style={rhStyles.trainingStatValue}>0</Text>
        </View>
      </View>
      <View style={rhStyles.trainingStatsRow}>
        <View style={rhStyles.trainingStatItem}>
          <Feather name="clock" size={16} color="#9AA1B5" />
          <Text style={rhStyles.trainingStatLabel}>Tempo médio (min)</Text>
          <Text style={rhStyles.trainingStatValue}>0</Text>
        </View>
        <View style={rhStyles.trainingStatItem}>
          <Feather name="award" size={16} color="#8B5CF6" />
          <Text style={rhStyles.trainingStatLabel}>Nota média</Text>
          <Text style={rhStyles.trainingStatValue}>—</Text>
        </View>
      </View>
      <RHEmptyTabState message="Nenhum treinamento atribuído a este colaborador ainda." />
    </RHSmallModal>
  );
}

type PromotionRecord = {
  id: string;
  motivo: string;
  novoSalario: number;
  percentual: string;
  vigenciaLabel: string;
  novoCargo: string;
  observacao: string;
};

function RegistrarPromocaoFormModal({
  visible,
  salarioAtual,
  onClose,
  onSave,
}: {
  visible: boolean;
  salarioAtual: number;
  onClose: () => void;
  onSave: (record: PromotionRecord) => void;
}) {
  const [motivo, setMotivo] = useState(rhPromocaoMotivos[0]);
  const [novoSalario, setNovoSalario] = useState('');
  const [percentual, setPercentual] = useState('');
  const [vigenciaLabel, setVigenciaLabel] = useState(formatDateBR(new Date()));
  const [novoCargo, setNovoCargo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [isMotivoPickerOpen, setIsMotivoPickerOpen] = useState(false);
  const [isCargoPickerOpen, setIsCargoPickerOpen] = useState(false);
  const manterCargoLabel = '— Manter cargo atual —';

  useEffect(() => {
    if (visible) {
      setMotivo(rhPromocaoMotivos[0]);
      setNovoSalario('');
      setPercentual('');
      setVigenciaLabel(formatDateBR(new Date()));
      setNovoCargo('');
      setObservacao('');
    }
  }, [visible]);

  const handleSubmit = () => {
    const parsedSalario = Number(novoSalario.replace(',', '.'));
    if (!parsedSalario || parsedSalario <= 0) {
      Alert.alert('Campo obrigatório', 'Informe o novo salário.');
      return;
    }

    onSave({
      id: `promo-${Date.now()}`,
      motivo,
      novoSalario: parsedSalario,
      percentual,
      vigenciaLabel,
      novoCargo,
      observacao,
    });
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <View>
                <Text style={styles.requestModalTitle}>Registrar promoção / aumento</Text>
                <Text style={rhStyles.modalSubtitle}>Após salvar, este registro não pode ser editado.</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <RHSelectField label="Motivo" value={motivo} onPress={() => setIsMotivoPickerOpen(true)} required />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>
                Salário atual:{' '}
                <Text style={rhStyles.inlineBold}>
                  R$ {salarioAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </Text>

              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Novo salário (R$) *</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={novoSalario}
                    onChangeText={setNovoSalario}
                    placeholder="0,00"
                    placeholderTextColor="#A7AEC2"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Percentual (%)</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={percentual}
                    onChangeText={setPercentual}
                    placeholder="0,00"
                    placeholderTextColor="#A7AEC2"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Data de vigência *</Text>
              <TextInput
                style={styles.processTextInput}
                value={vigenciaLabel}
                onChangeText={setVigenciaLabel}
                placeholder="dd/mm/aaaa"
                placeholderTextColor="#A7AEC2"
              />

              <RHSelectField
                label="Mudança de cargo (opcional)"
                value={novoCargo}
                placeholder={manterCargoLabel}
                onPress={() => setIsCargoPickerOpen(true)}
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Observação</Text>
              <TextInput
                style={[styles.processTextInput, styles.processDocumentationArea]}
                value={observacao}
                onChangeText={setObservacao}
                placeholder="Observações..."
                placeholderTextColor="#A7AEC2"
                multiline
                textAlignVertical="top"
              />

              <Pressable style={[rhStyles.primaryButtonGreen, styles.spacingTop]} onPress={handleSubmit}>
                <Feather name="save" size={15} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Salvar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <RHSimplePickerModal
        visible={isMotivoPickerOpen}
        title="Motivo"
        options={rhPromocaoMotivos}
        selectedValue={motivo}
        onSelect={setMotivo}
        onClose={() => setIsMotivoPickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isCargoPickerOpen}
        title="Novo cargo"
        options={[manterCargoLabel, ...rhCargosList]}
        selectedValue={novoCargo || manterCargoLabel}
        onSelect={(value) => setNovoCargo(value === manterCargoLabel ? '' : value)}
        onClose={() => setIsCargoPickerOpen(false)}
      />
    </>
  );
}

function PromocoesModal({
  visible,
  employee,
  onClose,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
}) {
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const currentSalario = promotions.length > 0 ? promotions[0].novoSalario : employee.salario;

  const handleSave = (record: PromotionRecord) => {
    setPromotions((current) => [record, ...current]);
    setIsFormOpen(false);
  };

  return (
    <>
      <RHSmallModal visible={visible} title={`Promoções — ${employee.fullName}`} onClose={onClose}>
        <View style={rhStyles.salaryCard}>
          <View>
            <Text style={rhStyles.kpiLabel}>SALÁRIO ATUAL</Text>
            <Text style={rhStyles.salaryValue}>
              R$ {currentSalario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={rhStyles.employeeMeta}>Cargo: {employee.role}</Text>
          </View>
          <Pressable style={styles.directorNotifNewButton} onPress={() => setIsFormOpen(true)}>
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.directorNotifNewButtonText}>Registrar</Text>
          </Pressable>
        </View>

        <View style={rhStyles.historyHeaderRow}>
          <Text style={rhStyles.detailSectionHeading}>Histórico de promoções</Text>
          <View style={rhStyles.lockedBadge}>
            <Feather name="lock" size={11} color="#5E667D" />
            <Text style={rhStyles.lockedBadgeText}>Registros imutáveis</Text>
          </View>
        </View>

        {promotions.length === 0 ? (
          <RHEmptyTabState message="Nenhum registro ainda." />
        ) : (
          promotions.map((record) => (
            <View key={record.id} style={rhStyles.historyCard}>
              <Text style={rhStyles.historyCardTitle}>{record.motivo}</Text>
              <Text style={rhStyles.historyCardMeta}>
                Novo salário: R$ {record.novoSalario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                {record.percentual ? ` (${record.percentual}%)` : ''}
              </Text>
              {record.novoCargo ? (
                <Text style={rhStyles.historyCardMeta}>Novo cargo: {record.novoCargo}</Text>
              ) : null}
              <Text style={rhStyles.historyCardMeta}>Vigência: {record.vigenciaLabel}</Text>
            </View>
          ))
        )}
      </RHSmallModal>

      <RegistrarPromocaoFormModal
        visible={isFormOpen}
        salarioAtual={currentSalario}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}

type PremiacaoRecord = {
  id: string;
  tipo: string;
  valor: number;
  dataLabel: string;
  observacao: string;
};

const rhPremiacaoTipos: string[] = ['Meta batida', 'Campanha comercial', 'Indicação', 'Reconhecimento'];

function RegistrarPremiacaoFormModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (record: PremiacaoRecord) => void;
}) {
  const [tipo, setTipo] = useState(rhPremiacaoTipos[0]);
  const [valor, setValor] = useState('');
  const [dataLabel, setDataLabel] = useState(formatDateBR(new Date()));
  const [observacao, setObservacao] = useState('');
  const [isTipoPickerOpen, setIsTipoPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setTipo(rhPremiacaoTipos[0]);
      setValor('');
      setDataLabel(formatDateBR(new Date()));
      setObservacao('');
    }
  }, [visible]);

  const handleSubmit = () => {
    const parsedValor = Number(valor.replace(',', '.'));
    if (!parsedValor || parsedValor <= 0) {
      Alert.alert('Campo obrigatório', 'Informe o valor da premiação.');
      return;
    }
    onSave({ id: `premio-${Date.now()}`, tipo, valor: parsedValor, dataLabel, observacao });
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>Registrar premiação</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <RHSelectField
                label="Tipo de premiação"
                value={tipo}
                onPress={() => setIsTipoPickerOpen(true)}
                required
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Valor (R$) *</Text>
              <TextInput
                style={styles.processTextInput}
                value={valor}
                onChangeText={setValor}
                placeholder="0,00"
                placeholderTextColor="#A7AEC2"
                keyboardType="decimal-pad"
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Data *</Text>
              <TextInput
                style={styles.processTextInput}
                value={dataLabel}
                onChangeText={setDataLabel}
                placeholder="dd/mm/aaaa"
                placeholderTextColor="#A7AEC2"
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Observação</Text>
              <TextInput
                style={[styles.processTextInput, styles.processDocumentationArea]}
                value={observacao}
                onChangeText={setObservacao}
                placeholder="Observações..."
                placeholderTextColor="#A7AEC2"
                multiline
                textAlignVertical="top"
              />

              <Pressable style={[rhStyles.primaryButtonGreen, styles.spacingTop]} onPress={handleSubmit}>
                <Feather name="save" size={15} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Salvar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <RHSimplePickerModal
        visible={isTipoPickerOpen}
        title="Tipo de premiação"
        options={rhPremiacaoTipos}
        selectedValue={tipo}
        onSelect={setTipo}
        onClose={() => setIsTipoPickerOpen(false)}
      />
    </>
  );
}

function PremiacoesModal({
  visible,
  employee,
  onClose,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
}) {
  const [premiacoes, setPremiacoes] = useState<PremiacaoRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const totalPago = premiacoes.reduce((sum, item) => sum + item.valor, 0);

  const handleSave = (record: PremiacaoRecord) => {
    setPremiacoes((current) => [record, ...current]);
    setIsFormOpen(false);
  };

  return (
    <>
      <RHSmallModal visible={visible} title={`Premiações — ${employee.fullName}`} onClose={onClose}>
        <View style={rhStyles.formRow}>
          <View style={[rhStyles.trainingStatItem, { flex: 1 }]}>
            <Text style={rhStyles.trainingStatLabel}>TOTAL PAGO EM {currentYear}</Text>
            <Text style={[rhStyles.trainingStatValue, { color: '#18955A' }]}>
              R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[rhStyles.trainingStatItem, { flex: 1 }]}>
            <Text style={rhStyles.trainingStatLabel}>PENDENTE / APROVADO</Text>
            <Text style={[rhStyles.trainingStatValue, { color: '#B07A1E' }]}>R$ 0,00</Text>
          </View>
        </View>

        <View style={rhStyles.docStatsRow}>
          <Text style={rhStyles.docStatsText}>Lançamentos: {premiacoes.length}</Text>
          <Pressable style={rhStyles.primaryButtonGreenSmall} onPress={() => setIsFormOpen(true)}>
            <Feather name="plus" size={13} color="#FFFFFF" />
            <Text style={rhStyles.primaryButtonSmallText}>Registrar</Text>
          </Pressable>
        </View>

        <Text style={rhStyles.detailSectionHeading}>Histórico de premiações</Text>
        {premiacoes.length === 0 ? (
          <RHEmptyTabState message={`Nenhuma premiação em ${currentYear}.`} />
        ) : (
          premiacoes.map((record) => (
            <View key={record.id} style={rhStyles.historyCard}>
              <Text style={rhStyles.historyCardTitle}>{record.tipo}</Text>
              <Text style={rhStyles.historyCardMeta}>
                R$ {record.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · {record.dataLabel}
              </Text>
            </View>
          ))
        )}
      </RHSmallModal>

      <RegistrarPremiacaoFormModal visible={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSave} />
    </>
  );
}

type EmployeeTransferRecord = {
  id: string;
  toUnit: string;
  vigenciaLabel: string;
  novoCargo: string;
  novoSetor: string;
  novoSalario: number;
  motivo: string;
  rateio: string;
  observacao: string;
  status: TransferStatus;
};

const rhTransferMotivos: string[] = [
  'Realocação',
  'Solicitação do colaborador',
  'Necessidade operacional',
  'Outro',
];

const rhTransferStatusMeta: Record<TransferStatus, { label: string; color: string; tint: string }> = {
  pendente: { label: 'Pendente', color: '#B07A1E', tint: '#FCEFDA' },
  aprovada: { label: 'Aprovada', color: '#3457D5', tint: '#EDF1FF' },
  efetivada: { label: 'Efetivada', color: '#18955A', tint: '#E3F5EA' },
};

function NovaTransferenciaFormModal({
  visible,
  employee,
  onClose,
  onSave,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
  onSave: (record: EmployeeTransferRecord) => void;
}) {
  const [unidadeDestino, setUnidadeDestino] = useState('');
  const [vigenciaLabel, setVigenciaLabel] = useState(formatDateBR(new Date()));
  const [novoCargo, setNovoCargo] = useState(employee.role);
  const [novoSetor, setNovoSetor] = useState(employee.setor);
  const [novoSalario, setNovoSalario] = useState(String(employee.salario));
  const [motivo, setMotivo] = useState(rhTransferMotivos[0]);
  const [rateio, setRateio] = useState(rhRateioOptions[0]);
  const [observacao, setObservacao] = useState('');
  const [aprovarAgora, setAprovarAgora] = useState(true);

  const [isUnidadePickerOpen, setIsUnidadePickerOpen] = useState(false);
  const [isCargoPickerOpen, setIsCargoPickerOpen] = useState(false);
  const [isSetorPickerOpen, setIsSetorPickerOpen] = useState(false);
  const [isMotivoPickerOpen, setIsMotivoPickerOpen] = useState(false);
  const [isRateioPickerOpen, setIsRateioPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setUnidadeDestino('');
      setVigenciaLabel(formatDateBR(new Date()));
      setNovoCargo(employee.role);
      setNovoSetor(employee.setor);
      setNovoSalario(String(employee.salario));
      setMotivo(rhTransferMotivos[0]);
      setRateio(rhRateioOptions[0]);
      setObservacao('');
      setAprovarAgora(true);
    }
  }, [visible, employee]);

  const handleSubmit = () => {
    if (!unidadeDestino) {
      Alert.alert('Campo obrigatório', 'Selecione a unidade de destino.');
      return;
    }

    onSave({
      id: `transf-${Date.now()}`,
      toUnit: unidadeDestino,
      vigenciaLabel,
      novoCargo,
      novoSetor,
      novoSalario: Number(novoSalario.replace(',', '.')) || 0,
      motivo,
      rateio,
      observacao,
      status: aprovarAgora ? 'aprovada' : 'pendente',
    });
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle} numberOfLines={2}>
                Nova transferência — {employee.fullName}
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={rhStyles.infoBox}>
                <Text style={rhStyles.infoBoxLine}>
                  Unidade atual: <Text style={rhStyles.inlineBold}>{employee.unit}</Text>
                </Text>
                <Text style={rhStyles.infoBoxLine}>
                  Cargo: {employee.role} · Setor: {employee.setor} · Salário: R${' '}
                  {employee.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <RHSelectField
                label="Unidade de destino"
                value={unidadeDestino}
                onPress={() => setIsUnidadePickerOpen(true)}
                required
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Data de vigência *</Text>
              <TextInput
                style={styles.processTextInput}
                value={vigenciaLabel}
                onChangeText={setVigenciaLabel}
                placeholder="dd/mm/aaaa"
                placeholderTextColor="#A7AEC2"
              />

              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField label="Novo cargo" value={novoCargo} onPress={() => setIsCargoPickerOpen(true)} />
                </View>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField label="Novo setor" value={novoSetor} onPress={() => setIsSetorPickerOpen(true)} />
                </View>
              </View>

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Novo salário</Text>
              <TextInput
                style={styles.processTextInput}
                value={novoSalario}
                onChangeText={setNovoSalario}
                placeholder="0,00"
                placeholderTextColor="#A7AEC2"
                keyboardType="decimal-pad"
              />

              <RHSelectField label="Motivo" value={motivo} onPress={() => setIsMotivoPickerOpen(true)} />
              <RHSelectField
                label="Rateio na folha do mês da vigência"
                value={rateio}
                onPress={() => setIsRateioPickerOpen(true)}
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Observação</Text>
              <TextInput
                style={[styles.processTextInput, styles.processDocumentationArea]}
                value={observacao}
                onChangeText={setObservacao}
                placeholder="Observações..."
                placeholderTextColor="#A7AEC2"
                multiline
                textAlignVertical="top"
              />

              <Pressable
                style={[rhStyles.checkboxRow, styles.spacingTop]}
                onPress={() => setAprovarAgora((current) => !current)}
              >
                <Feather
                  name={aprovarAgora ? 'check-square' : 'square'}
                  size={18}
                  color={aprovarAgora ? '#18955A' : '#9AA1B5'}
                />
                <Text style={rhStyles.checkboxLabel}>Aprovar agora (na data de vigência será efetivada)</Text>
              </Pressable>

              <Pressable style={[rhStyles.primaryButtonGreen, styles.spacingTop]} onPress={handleSubmit}>
                <Feather name="save" size={15} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Registrar transferência</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <RHSimplePickerModal
        visible={isUnidadePickerOpen}
        title="Unidade de destino"
        options={rhUnidadesList.filter((unit) => unit !== employee.unit)}
        selectedValue={unidadeDestino}
        onSelect={setUnidadeDestino}
        onClose={() => setIsUnidadePickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isCargoPickerOpen}
        title="Novo cargo"
        options={rhCargosList}
        selectedValue={novoCargo}
        onSelect={setNovoCargo}
        onClose={() => setIsCargoPickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isSetorPickerOpen}
        title="Novo setor"
        options={rhSetoresList}
        selectedValue={novoSetor}
        onSelect={setNovoSetor}
        onClose={() => setIsSetorPickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isMotivoPickerOpen}
        title="Motivo"
        options={rhTransferMotivos}
        selectedValue={motivo}
        onSelect={setMotivo}
        onClose={() => setIsMotivoPickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isRateioPickerOpen}
        title="Rateio na folha"
        options={rhRateioOptions}
        selectedValue={rateio}
        onSelect={setRateio}
        onClose={() => setIsRateioPickerOpen(false)}
      />
    </>
  );
}

function TransferenciasEmployeeModal({
  visible,
  employee,
  onClose,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
}) {
  const [records, setRecords] = useState<EmployeeTransferRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const pendentes = records.filter((item) => item.status === 'pendente').length;
  const aprovadas = records.filter((item) => item.status === 'aprovada').length;
  const efetivadas = records.filter((item) => item.status === 'efetivada').length;

  const handleSave = (record: EmployeeTransferRecord) => {
    setRecords((current) => [record, ...current]);
    setIsFormOpen(false);
  };

  return (
    <>
      <RHSmallModal visible={visible} title={`Transferências — ${employee.fullName}`} onClose={onClose}>
        <View style={rhStyles.categoryRow}>
          <View style={rhStyles.categoryChip}>
            <Text style={rhStyles.categoryChipText}>{pendentes} pendente(s)</Text>
          </View>
          <View style={rhStyles.categoryChip}>
            <Text style={rhStyles.categoryChipText}>{aprovadas} aprovada(s)</Text>
          </View>
          <View style={rhStyles.categoryChip}>
            <Text style={rhStyles.categoryChipText}>{efetivadas} efetivada(s)</Text>
          </View>
        </View>

        <Pressable style={[rhStyles.primaryButtonGreen, styles.spacingTop]} onPress={() => setIsFormOpen(true)}>
          <Feather name="plus" size={15} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Nova transferência</Text>
        </Pressable>

        <View style={styles.spacingTop}>
          {records.length === 0 ? (
            <RHEmptyTabState message="Nenhuma transferência registrada." />
          ) : (
            records.map((record) => {
              const statusMeta = rhTransferStatusMeta[record.status];
              return (
                <View key={record.id} style={rhStyles.historyCard}>
                  <View style={rhStyles.docCardTopRow}>
                    <Text style={rhStyles.historyCardTitle}>
                      {employee.unit} → {record.toUnit}
                    </Text>
                    <View style={[rhStyles.employeeStatusPill, { backgroundColor: statusMeta.tint }]}>
                      <Text style={[rhStyles.employeeStatusText, { color: statusMeta.color }]}>
                        {statusMeta.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={rhStyles.historyCardMeta}>
                    {record.novoCargo} · {record.novoSetor} · R${' '}
                    {record.novoSalario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={rhStyles.historyCardMeta}>
                    Vigência: {record.vigenciaLabel} · Motivo: {record.motivo}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </RHSmallModal>

      <NovaTransferenciaFormModal
        visible={isFormOpen}
        employee={employee}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}

type EmployeeEditForm = {
  fullName: string;
  codigoInterno: string;
  registration: string;
  cpf: string;
  role: string;
  setor: string;
  email: string;
  celular: string;
  unit: string;
  status: EmployeeStatus;
};

function buildEditFormFromEmployee(employee: Employee): EmployeeEditForm {
  return {
    fullName: employee.fullName,
    codigoInterno: employee.codigoInterno,
    registration: employee.registration,
    cpf: employee.cpf,
    role: employee.role,
    setor: employee.setor,
    email: employee.email,
    celular: employee.celular,
    unit: employee.unit,
    status: employee.status,
  };
}

const rhEmployeeStatusOrder: EmployeeStatus[] = ['ativo', 'ferias', 'afastado', 'desligado'];

function EditarCadastroModal({
  visible,
  employee,
  onClose,
  onSave,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
  onSave: (updated: Employee) => void;
}) {
  const [form, setForm] = useState<EmployeeEditForm>(buildEditFormFromEmployee(employee));
  const [isCargoPickerOpen, setIsCargoPickerOpen] = useState(false);
  const [isSetorPickerOpen, setIsSetorPickerOpen] = useState(false);
  const [isUnidadePickerOpen, setIsUnidadePickerOpen] = useState(false);
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(buildEditFormFromEmployee(employee));
    }
  }, [visible, employee]);

  const handleSubmit = () => {
    if (!form.fullName.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome completo.');
      return;
    }

    onSave({ ...employee, ...form, fullName: form.fullName.trim() });
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>Editar colaborador</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.requestFieldLabel}>Nome completo</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.fullName}
                onChangeText={(text) => setForm((current) => ({ ...current, fullName: text }))}
                placeholderTextColor="#A7AEC2"
              />

              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Código interno</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={form.codigoInterno}
                    onChangeText={(text) => setForm((current) => ({ ...current, codigoInterno: text }))}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Matrícula</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={form.registration}
                    onChangeText={(text) => setForm((current) => ({ ...current, registration: text }))}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
              </View>

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>CPF</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.cpf}
                onChangeText={(text) => setForm((current) => ({ ...current, cpf: text }))}
                placeholderTextColor="#A7AEC2"
              />

              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField label="Cargo" value={form.role} onPress={() => setIsCargoPickerOpen(true)} />
                </View>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField label="Setor" value={form.setor} onPress={() => setIsSetorPickerOpen(true)} />
                </View>
              </View>

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>E-mail corporativo</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.email}
                onChangeText={(text) => setForm((current) => ({ ...current, email: text }))}
                placeholderTextColor="#A7AEC2"
                autoCapitalize="none"
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Celular</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.celular}
                onChangeText={(text) => setForm((current) => ({ ...current, celular: text }))}
                placeholderTextColor="#A7AEC2"
              />

              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField label="Unidade" value={form.unit} onPress={() => setIsUnidadePickerOpen(true)} />
                </View>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField
                    label="Status"
                    value={rhEmployeeStatusMeta[form.status].label}
                    onPress={() => setIsStatusPickerOpen(true)}
                  />
                </View>
              </View>

              <Pressable style={[rhStyles.primaryButtonGreen, styles.spacingTop]} onPress={handleSubmit}>
                <Feather name="save" size={15} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Salvar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <RHSimplePickerModal
        visible={isCargoPickerOpen}
        title="Cargo"
        options={rhCargosList}
        selectedValue={form.role}
        onSelect={(value) => setForm((current) => ({ ...current, role: value }))}
        onClose={() => setIsCargoPickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isSetorPickerOpen}
        title="Setor"
        options={rhSetoresList}
        selectedValue={form.setor}
        onSelect={(value) => setForm((current) => ({ ...current, setor: value }))}
        onClose={() => setIsSetorPickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isUnidadePickerOpen}
        title="Unidade"
        options={rhUnidadesList}
        selectedValue={form.unit}
        onSelect={(value) => setForm((current) => ({ ...current, unit: value }))}
        onClose={() => setIsUnidadePickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isStatusPickerOpen}
        title="Status"
        options={rhEmployeeStatusOrder.map((key) => rhEmployeeStatusMeta[key].label)}
        selectedValue={rhEmployeeStatusMeta[form.status].label}
        onSelect={(label) => {
          const found = rhEmployeeStatusOrder.find((key) => rhEmployeeStatusMeta[key].label === label);
          if (found) {
            setForm((current) => ({ ...current, status: found }));
          }
        }}
        onClose={() => setIsStatusPickerOpen(false)}
      />
    </>
  );
}

function DesligamentoModal({
  visible,
  employee,
  onClose,
  onSave,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
  onSave: (updated: Employee) => void;
}) {
  const [form, setForm] = useState<EmployeeEditForm>(buildEditFormFromEmployee(employee));
  const [dataDemissao, setDataDemissao] = useState('');
  const [valorRescisao, setValorRescisao] = useState('');
  const [motivoDesligamento, setMotivoDesligamento] = useState('');
  const [isCargoPickerOpen, setIsCargoPickerOpen] = useState(false);
  const [isSetorPickerOpen, setIsSetorPickerOpen] = useState(false);
  const [isUnidadePickerOpen, setIsUnidadePickerOpen] = useState(false);
  const [isMotivoPickerOpen, setIsMotivoPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(buildEditFormFromEmployee(employee));
      setDataDemissao('');
      setValorRescisao('');
      setMotivoDesligamento('');
    }
  }, [visible, employee]);

  const handleSubmit = () => {
    if (!dataDemissao.trim()) {
      Alert.alert('Campo obrigatório', 'Informe a data de demissão.');
      return;
    }

    onSave({
      ...employee,
      ...form,
      fullName: form.fullName.trim() || employee.fullName,
      status: 'desligado',
    });
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle} numberOfLines={2}>
                Desligamento — {employee.fullName}
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.requestFieldLabel}>Nome completo</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.fullName}
                onChangeText={(text) => setForm((current) => ({ ...current, fullName: text }))}
                placeholderTextColor="#A7AEC2"
              />

              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Código interno</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={form.codigoInterno}
                    onChangeText={(text) => setForm((current) => ({ ...current, codigoInterno: text }))}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Matrícula</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={form.registration}
                    onChangeText={(text) => setForm((current) => ({ ...current, registration: text }))}
                    placeholderTextColor="#A7AEC2"
                  />
                </View>
              </View>

              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField label="Cargo" value={form.role} onPress={() => setIsCargoPickerOpen(true)} />
                </View>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField label="Setor" value={form.setor} onPress={() => setIsSetorPickerOpen(true)} />
                </View>
              </View>

              <RHSelectField label="Unidade" value={form.unit} onPress={() => setIsUnidadePickerOpen(true)} />

              <View style={[rhStyles.warningBox, styles.spacingTop]}>
                <View style={rhStyles.warningBoxHeaderRow}>
                  <Feather name="alert-triangle" size={14} color="#B07A1E" />
                  <Text style={rhStyles.warningBoxTitle}>Fluxo de desligamento — preencha os dados da rescisão</Text>
                </View>

                <View style={rhStyles.formRow}>
                  <View style={rhStyles.formRowItem}>
                    <Text style={styles.requestFieldLabel}>Data de demissão *</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={dataDemissao}
                      onChangeText={setDataDemissao}
                      placeholder="dd/mm/aaaa"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                  <View style={rhStyles.formRowItem}>
                    <Text style={styles.requestFieldLabel}>Valor da rescisão (R$)</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={valorRescisao}
                      onChangeText={setValorRescisao}
                      placeholder="0,00"
                      placeholderTextColor="#A7AEC2"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <RHSelectField
                  label="Motivo do desligamento"
                  value={motivoDesligamento}
                  onPress={() => setIsMotivoPickerOpen(true)}
                />

                <Text style={rhStyles.warningBoxNote}>
                  O valor será registrado neste colaborador e somado nos indicadores de rescisões do Dashboard RH.
                </Text>
              </View>

              <Pressable style={[rhStyles.primaryButtonGreen, styles.spacingTop]} onPress={handleSubmit}>
                <Feather name="save" size={15} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Salvar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <RHSimplePickerModal
        visible={isCargoPickerOpen}
        title="Cargo"
        options={rhCargosList}
        selectedValue={form.role}
        onSelect={(value) => setForm((current) => ({ ...current, role: value }))}
        onClose={() => setIsCargoPickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isSetorPickerOpen}
        title="Setor"
        options={rhSetoresList}
        selectedValue={form.setor}
        onSelect={(value) => setForm((current) => ({ ...current, setor: value }))}
        onClose={() => setIsSetorPickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isUnidadePickerOpen}
        title="Unidade"
        options={rhUnidadesList}
        selectedValue={form.unit}
        onSelect={(value) => setForm((current) => ({ ...current, unit: value }))}
        onClose={() => setIsUnidadePickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isMotivoPickerOpen}
        title="Motivo do desligamento"
        options={rhDesligamentoMotivos}
        selectedValue={motivoDesligamento}
        onSelect={setMotivoDesligamento}
        onClose={() => setIsMotivoPickerOpen(false)}
      />
    </>
  );
}

export function RHColaboradorDetalheScreen({ navigation, route }: ScreenProps<'RHColaboradorDetalhe'>) {
  const { employeeId, employeeInicial } = route.params;
  // employeeInicial vem da lista real (RHColaboradoresScreen); colocamos ele
  // na frente do mock pra "find" abaixo achar o colaborador de verdade em vez
  // de sempre cair no employees[0] mockado (que não tem o id real da API).
  const [employees, setEmployees] = useState<Employee[]>(() =>
    employeeInicial ? [employeeInicial, ...rhEmployees] : rhEmployees
  );
  const employee = employees.find((item) => item.id === employeeId) ?? employees[0];
  const [activeQuickAction, setActiveQuickAction] = useState<QuickActionKey | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const statusMeta = rhEmployeeStatusMeta[employee.status];
  const initials = employee.fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const handleUpdateEmployee = (updated: Employee) => {
    setEmployees((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setIsEditModalOpen(false);
  };

  const handleSaveFromDesligamento = (updated: Employee) => {
    setEmployees((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setActiveQuickAction(null);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Pressable style={rhStyles.backRow} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={16} color="#5E667D" />
          <Text style={rhStyles.backRowText}>Colaboradores</Text>
        </Pressable>

        <LinearGradient colors={['#7A2048', '#1B2340']} style={rhStyles.employeeHeroBanner}>
          <View style={rhStyles.employeeHeroBadge}>
            <Feather name="check-circle" size={11} color="#FFFFFF" />
            <Text style={rhStyles.employeeHeroBadgeText}>OK</Text>
          </View>
        </LinearGradient>

        <View style={rhStyles.employeeProfileCard}>
          <View style={rhStyles.employeeProfileAvatarWrap}>
            <View style={rhStyles.employeeProfileAvatar}>
              <Text style={rhStyles.employeeProfileAvatarText}>{initials}</Text>
            </View>
          </View>

          <Text style={rhStyles.employeeProfileName}>{employee.fullName}</Text>
          <Text style={rhStyles.employeeProfileRole}>{employee.role}</Text>

          <View style={rhStyles.employeeProfileBadgeRow}>
            <View style={[rhStyles.employeeStatusPill, { backgroundColor: statusMeta.tint }]}>
              <Text style={[rhStyles.employeeStatusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
            <View style={rhStyles.filterPill}>
              <Text style={rhStyles.filterPillText}>Mat. {employee.registration}</Text>
            </View>
            {employee.pendentesCount > 0 ? (
              <View style={rhStyles.docPendingBadge}>
                <Text style={rhStyles.docPendingBadgeText}>{employee.pendentesCount} pendentes</Text>
              </View>
            ) : null}
          </View>

          <View style={rhStyles.employeeMetaRow}>
            <Feather name="briefcase" size={13} color="#9AA1B5" />
            <Text style={rhStyles.employeeMetaRowText}>{employee.unit}</Text>
          </View>
          <View style={rhStyles.employeeMetaRow}>
            <Feather name="calendar" size={13} color="#9AA1B5" />
            <Text style={rhStyles.employeeMetaRowText}>Desde {employee.admissionLabel}</Text>
          </View>
          {employee.email ? (
            <View style={rhStyles.employeeMetaRow}>
              <Feather name="mail" size={13} color="#9AA1B5" />
              <Text style={rhStyles.employeeMetaRowText} numberOfLines={1}>
                {employee.email}
              </Text>
            </View>
          ) : null}
          {employee.celular ? (
            <View style={rhStyles.employeeMetaRow}>
              <Feather name="phone" size={13} color="#9AA1B5" />
              <Text style={rhStyles.employeeMetaRowText}>{employee.celular}</Text>
            </View>
          ) : null}

          <Pressable
            style={[rhStyles.primaryButtonGreen, styles.spacingTop]}
            onPress={() => setIsEditModalOpen(true)}
          >
            <Feather name="edit-2" size={14} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Editar Cadastro</Text>
          </Pressable>
        </View>

        <Text style={[rhStyles.detailSectionHeading, styles.spacingTop]}>ACESSO RÁPIDO</Text>
        <View style={rhStyles.quickActionsGrid}>
          {rhQuickActions.map((action) => (
            <Pressable
              key={action.key}
              style={rhStyles.quickActionTile}
              onPress={() => setActiveQuickAction(action.key)}
            >
              <View style={[styles.iconShell, styles.iconAccentGreen]}>
                <Feather name={action.icon} size={16} color="#1B6E3A" />
              </View>
              <Text style={rhStyles.quickActionLabel} numberOfLines={2}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <EditarCadastroModal
        visible={isEditModalOpen}
        employee={employee}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateEmployee}
      />

      <DadosPessoaisModal
        visible={activeQuickAction === 'dadosPessoais'}
        employee={employee}
        onClose={() => setActiveQuickAction(null)}
      />
      <DocumentosModal
        visible={activeQuickAction === 'documentos'}
        employee={employee}
        onClose={() => setActiveQuickAction(null)}
      />
      <EmBreveModal
        visible={activeQuickAction === 'ponto'}
        title="Ponto"
        employeeName={employee.fullName}
        onClose={() => setActiveQuickAction(null)}
      />
      <EmBreveModal
        visible={activeQuickAction === 'afastamentos'}
        title="Afastamentos"
        employeeName={employee.fullName}
        onClose={() => setActiveQuickAction(null)}
      />
      <EmBreveModal
        visible={activeQuickAction === 'ferias'}
        title="Férias"
        employeeName={employee.fullName}
        onClose={() => setActiveQuickAction(null)}
      />
      <ContrachequesModal
        visible={activeQuickAction === 'contracheques'}
        employee={employee}
        onClose={() => setActiveQuickAction(null)}
      />
      <PromocoesModal
        visible={activeQuickAction === 'promocoes'}
        employee={employee}
        onClose={() => setActiveQuickAction(null)}
      />
      <PremiacoesModal
        visible={activeQuickAction === 'premiacoes'}
        employee={employee}
        onClose={() => setActiveQuickAction(null)}
      />
      <EmBreveModal
        visible={activeQuickAction === 'reembolsos'}
        title="Reembolsos"
        employeeName={employee.fullName}
        onClose={() => setActiveQuickAction(null)}
      />
      <EmBreveModal
        visible={activeQuickAction === 'integracao'}
        title="Integração"
        employeeName={employee.fullName}
        onClose={() => setActiveQuickAction(null)}
      />
      <TreinamentosModal
        visible={activeQuickAction === 'treinamentos'}
        employee={employee}
        onClose={() => setActiveQuickAction(null)}
      />
      <TransferenciasEmployeeModal
        visible={activeQuickAction === 'transferencias'}
        employee={employee}
        onClose={() => setActiveQuickAction(null)}
      />
      <DesligamentoModal
        visible={activeQuickAction === 'desligamento'}
        employee={employee}
        onClose={() => setActiveQuickAction(null)}
        onSave={handleSaveFromDesligamento}
      />
    </SafeAreaView>
  );
}

// ---------- Transferências ----------

export function RHTransferenciasScreen({ navigation }: ScreenProps<'RHTransferencias'>) {
  const pendentes = rhTransfers.filter((item) => item.status === 'pendente').length;
  const aprovadas = rhTransfers.filter((item) => item.status === 'aprovada').length;
  const efetivadas = rhTransfers.filter((item) => item.status === 'efetivada').length;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="repeat" title="Transferências" subtitle="Movimentação entre unidades" />

        <View style={rhStyles.tripleStatRow}>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueGold]}>{pendentes}</Text>
            <Text style={rhStyles.tripleStatLabel}>Pendentes</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueBlue]}>{aprovadas}</Text>
            <Text style={rhStyles.tripleStatLabel}>Aprovadas</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueGreen]}>{efetivadas}</Text>
            <Text style={rhStyles.tripleStatLabel}>Efetivadas</Text>
          </View>
        </View>

        {rhTransfers.length === 0 ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Nenhuma transferência registrada.</Text>
          </View>
        ) : (
          rhTransfers.map((item) => (
            <View key={item.id} style={rhStyles.employeeCard}>
              <View style={rhStyles.employeeInfo}>
                <Text style={rhStyles.employeeName}>{item.employeeName}</Text>
                <Text style={rhStyles.employeeRoleUnit}>
                  {item.fromUnit} → {item.toUnit}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Comunicados ----------

type AnnouncementFormValues = {
  category: AnnouncementCategory;
  title: string;
  description: string;
  audienceLabel: string;
};

const emptyAnnouncementForm: AnnouncementFormValues = {
  category: 'RH',
  title: '',
  description: '',
  audienceLabel: 'Todos os postos',
};

function AnnouncementFormModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (announcement: AnnouncementItem) => void;
}) {
  const [form, setForm] = useState<AnnouncementFormValues>(emptyAnnouncementForm);

  const categories: AnnouncementCategory[] = ['RH', 'SST', 'DP'];

  const handleClose = () => {
    setForm(emptyAnnouncementForm);
    onClose();
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha o título e a descrição do comunicado.');
      return;
    }

    onSave({
      id: `ann-${Date.now()}`,
      category: form.category,
      timeLabel: 'agora',
      title: form.title.trim(),
      description: form.description.trim(),
      audienceLabel: `Enviado a ${form.audienceLabel}`,
    });
    setForm(emptyAnnouncementForm);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle}>Novo comunicado</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.requestFieldLabel}>Categoria</Text>
            <View style={rhStyles.categoryRow}>
              {categories.map((category) => {
                const isSelected = form.category === category;
                return (
                  <Pressable
                    key={category}
                    style={[rhStyles.categoryChip, isSelected ? rhStyles.categoryChipActive : null]}
                    onPress={() => setForm((current) => ({ ...current, category }))}
                  >
                    <Text
                      style={[rhStyles.categoryChipText, isSelected ? rhStyles.categoryChipTextActive : null]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Título *</Text>
            <TextInput
              style={styles.processTextInput}
              value={form.title}
              onChangeText={(text) => setForm((current) => ({ ...current, title: text }))}
              placeholder="Ex.: Nova tabela de reajuste 2026"
              placeholderTextColor="#A7AEC2"
            />

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Descrição *</Text>
            <TextInput
              style={[styles.processTextInput, styles.processDocumentationArea]}
              value={form.description}
              onChangeText={(text) => setForm((current) => ({ ...current, description: text }))}
              placeholder="Detalhe o comunicado..."
              placeholderTextColor="#A7AEC2"
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Enviar para</Text>
            <TextInput
              style={styles.processTextInput}
              value={form.audienceLabel}
              onChangeText={(text) => setForm((current) => ({ ...current, audienceLabel: text }))}
              placeholder="Ex.: Todos os postos"
              placeholderTextColor="#A7AEC2"
            />

            <Pressable style={[rhStyles.primaryButtonGreen, styles.spacingTop]} onPress={handleSubmit}>
              <Text style={styles.primaryButtonText}>Enviar comunicado</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function RHComunicadosScreen({ navigation }: ScreenProps<'RHComunicados'>) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(rhAnnouncements);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSave = (announcement: AnnouncementItem) => {
    setAnnouncements((current) => [announcement, ...current]);
    setIsFormOpen(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="volume-2" title="Comunicados" subtitle="Avisos enviados ao time" />

        <Pressable style={rhStyles.primaryButtonGreen} onPress={() => setIsFormOpen(true)}>
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Novo comunicado</Text>
        </Pressable>

        {announcements.map((item) => {
          const meta = rhAnnouncementMeta[item.category];
          return (
            <View key={item.id} style={rhStyles.announcementCard}>
              <View style={rhStyles.announcementTopRow}>
                <View style={[rhStyles.announcementBadge, { backgroundColor: meta.tint }]}>
                  <Text style={[rhStyles.announcementBadgeText, { color: meta.color }]}>{item.category}</Text>
                </View>
                <Text style={rhStyles.announcementTime}>{item.timeLabel}</Text>
              </View>
              <Text style={rhStyles.announcementTitle}>{item.title}</Text>
              <Text style={rhStyles.announcementDesc}>{item.description}</Text>
              <Text style={rhStyles.announcementMeta}>{item.audienceLabel}</Text>
            </View>
          );
        })}
      </ScrollView>

      <AnnouncementFormModal visible={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSave} />
    </SafeAreaView>
  );
}

// ---------- Solicitações ----------

function TicketDetailModal({
  visible,
  ticket,
  onClose,
  onChangeStatus,
}: {
  visible: boolean;
  ticket: RequestTicket | null;
  onClose: () => void;
  onChangeStatus: (ticketId: string, status: TicketStatus) => void;
}) {
  if (!ticket) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle}>{ticket.code}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <Text style={rhStyles.ticketDetailTitle}>{ticket.title}</Text>
          <Text style={rhStyles.ticketDetailMeta}>
            {ticket.requesterName} · {ticket.unit} · {ticket.timeLabel}
          </Text>

          <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Status</Text>
          <View style={rhStyles.categoryRow}>
            {rhTicketStatusOrder.map((statusKey) => {
              const meta = rhTicketStatusMeta[statusKey];
              const isSelected = ticket.status === statusKey;
              return (
                <Pressable
                  key={statusKey}
                  style={[
                    rhStyles.categoryChip,
                    isSelected ? { backgroundColor: meta.color, borderColor: meta.color } : null,
                  ]}
                  onPress={() => onChangeStatus(ticket.id, statusKey)}
                >
                  <Text
                    style={[rhStyles.categoryChipText, isSelected ? rhStyles.categoryChipTextActive : null]}
                  >
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function RHSolicitacoesScreen({ navigation }: ScreenProps<'RHSolicitacoes'>) {
  const [tickets, setTickets] = useState<RequestTicket[]>(rhTickets);
  const [selectedTicket, setSelectedTicket] = useState<RequestTicket | null>(null);

  const handleChangeStatus = (ticketId: string, status: TicketStatus) => {
    setTickets((current) => current.map((item) => (item.id === ticketId ? { ...item, status } : item)));
    setSelectedTicket((current) => (current && current.id === ticketId ? { ...current, status } : current));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="message-circle" title="Solicitações" subtitle="Chamados de RH, DP e documentos" />

        {tickets.map((ticket) => {
          const meta = rhTicketStatusMeta[ticket.status];
          return (
            <Pressable key={ticket.id} style={rhStyles.ticketCard} onPress={() => setSelectedTicket(ticket)}>
              <View style={rhStyles.ticketTopRow}>
                <Text style={rhStyles.ticketCode}>{ticket.code}</Text>
                <View style={[rhStyles.ticketStatusPill, { backgroundColor: meta.tint }]}>
                  <Text style={[rhStyles.ticketStatusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={rhStyles.ticketTitle}>{ticket.title}</Text>
              <Text style={rhStyles.ticketMeta}>
                {ticket.requesterName} · {ticket.unit} · {ticket.timeLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <TicketDetailModal
        visible={Boolean(selectedTicket)}
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onChangeStatus={handleChangeStatus}
      />
    </SafeAreaView>
  );
}

// ---------- Importar PDF ----------

export function RHImportarPdfScreen({ navigation }: ScreenProps<'RHImportarPdf'>) {
  const [records, setRecords] = useState<ImportRecord[]>(rhImportRecords);

  const handleSelectPdfs = () => {
    Alert.alert(
      'Selecionar PDFs',
      'A importação por IA será conectada em breve. Nenhum arquivo foi processado agora.'
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="file-text" title="Importar PDF" subtitle="Admissões e desligamentos via IA" />

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={rhStyles.sectionBigValue}>{rhImportStats.naFila}</Text>
              <Text style={rhStyles.kpiMeta}>Na fila</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={[rhStyles.sectionBigValue, rhStyles.statGridValueGold]}>{rhImportStats.pRevisar}</Text>
              <Text style={rhStyles.kpiMeta}>P/ revisar</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={[rhStyles.sectionBigValue, rhStyles.statGridValueGreen]}>{rhImportStats.aplicados}</Text>
              <Text style={rhStyles.kpiMeta}>Aplicados</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={[rhStyles.sectionBigValue, { color: '#E6213D' }]}>{rhImportStats.comErro}</Text>
              <Text style={rhStyles.kpiMeta}>Com erro</Text>
            </View>
          </View>
        </View>

        <View style={rhStyles.importActionCard}>
          <View style={rhStyles.importActionIconShell}>
            <Feather name="star" size={22} color="#FFFFFF" />
          </View>
          <Text style={rhStyles.importActionTitle}>Importar lote de PDFs</Text>
          <Text style={rhStyles.importActionSubtitle}>
            A IA processa em fila (3 por vez) em segundo plano.
          </Text>
          <Pressable style={[rhStyles.primaryButtonGreen, rhStyles.importActionButton]} onPress={handleSelectPdfs}>
            <Feather name="upload" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Selecionar PDFs</Text>
          </Pressable>
        </View>

        <Text style={rhStyles.historyLabel}>HISTÓRICO ({records.length})</Text>
        {records.map((record) => {
          const typeMeta = rhImportTypeMeta[record.type];
          const statusMeta = rhImportStatusMeta[record.status];
          return (
            <View key={record.id} style={rhStyles.importRecordCard}>
              <View style={[rhStyles.importTypePill, { backgroundColor: typeMeta.tint }]}>
                <Text style={[rhStyles.importTypePillText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
              </View>
              <View style={rhStyles.importRecordInfo}>
                <Text style={rhStyles.importRecordName} numberOfLines={1}>
                  {record.employeeName}
                </Text>
                <Text style={rhStyles.importRecordTime}>{record.timestampLabel}</Text>
              </View>
              <View style={[rhStyles.importTypePill, { backgroundColor: statusMeta.tint }]}>
                <Text style={[rhStyles.importTypePillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Notificações ----------

export function RHNotificationsScreen({ navigation }: ScreenProps<'RHNotifications'>) {
  const [activeTab, setActiveTab] = useState<'routines' | 'templates'>('routines');
  const [routines, setRoutines] = useState<NotificationRoutineItem[]>(rhNotificationRoutines);
  const [isRoutineFormOpen, setIsRoutineFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<NotificationRoutineItem | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplateItem[]>(rhNotificationTemplates);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateItem | null>(null);

  const toggleRoutine = (id: string) => {
    setRoutines((current) =>
      current.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const openCreateRoutineModal = () => {
    setEditingRoutine(null);
    setIsRoutineFormOpen(true);
  };

  const openEditRoutineModal = (routine: NotificationRoutineItem) => {
    setEditingRoutine(routine);
    setIsRoutineFormOpen(true);
  };

  const handleSaveRoutine = (routine: NotificationRoutineItem) => {
    setRoutines((current) => {
      const exists = current.some((item) => item.id === routine.id);
      if (exists) {
        return current.map((item) => (item.id === routine.id ? routine : item));
      }
      return [routine, ...current];
    });
    setIsRoutineFormOpen(false);
  };

  const handleRunRoutine = (routine: NotificationRoutineItem) => {
    const todayLabel = formatDateBR(new Date());
    setRoutines((current) =>
      current.map((item) => (item.id === routine.id ? { ...item, lastRunLabel: todayLabel } : item))
    );
    Alert.alert('Rotina executada', `"${routine.title}" foi executada agora.`);
  };

  const handleDeleteRoutine = (routine: NotificationRoutineItem) => {
    Alert.alert('Excluir rotina', `Tem certeza que deseja excluir "${routine.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => setRoutines((current) => current.filter((item) => item.id !== routine.id)),
      },
    ]);
  };

  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
    setIsTemplateFormOpen(true);
  };

  const openEditTemplateModal = (template: NotificationTemplateItem) => {
    setEditingTemplate(template);
    setIsTemplateFormOpen(true);
  };

  const handleSaveTemplate = (template: NotificationTemplateItem) => {
    setTemplates((current) => {
      const exists = current.some((item) => item.id === template.id);
      if (exists) {
        return current.map((item) => (item.id === template.id ? template : item));
      }
      return [template, ...current];
    });
    setIsTemplateFormOpen(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="bell" title="Notificações" subtitle="App, e-mail e WhatsApp" />

        <View style={styles.directorNotifTabsRow}>
          <Pressable
            style={[styles.directorNotifTab, activeTab === 'routines' ? styles.directorNotifTabActive : null]}
            onPress={() => setActiveTab('routines')}
          >
            <Text
              style={[
                styles.directorNotifTabText,
                activeTab === 'routines' ? styles.directorNotifTabTextActive : null,
              ]}
            >
              Rotinas
            </Text>
          </Pressable>
          <Pressable
            style={[styles.directorNotifTab, activeTab === 'templates' ? styles.directorNotifTabActive : null]}
            onPress={() => setActiveTab('templates')}
          >
            <Text
              style={[
                styles.directorNotifTabText,
                activeTab === 'templates' ? styles.directorNotifTabTextActive : null,
              ]}
            >
              Templates
            </Text>
          </Pressable>
        </View>

        {activeTab === 'routines' ? (
          <>
            <View style={styles.directorNotifHeaderRow}>
              <Text style={styles.directorNotifCountLabel}>{routines.length} rotina(s) cadastrada(s)</Text>
              <Pressable style={styles.directorNotifNewButton} onPress={openCreateRoutineModal}>
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={styles.directorNotifNewButtonText}>Nova</Text>
              </Pressable>
            </View>

            {routines.map((routine) => {
              const triggerMeta =
                notificationTriggerOptions.find((option) => option.value === routine.triggerKind) ??
                notificationTriggerOptions[2];
              const triggerDetail =
                routine.triggerKind === 'recorrente'
                  ? routine.cronSchedule
                  : routine.triggerKind === 'evento'
                  ? routine.eventCode
                  : '';
              const channelLabels = (Object.keys(notificationChannelMeta) as Array<keyof NotificationChannels>)
                .filter((key) => routine.channels[key])
                .map((key) => notificationChannelMeta[key].label);
              const audienceLabel =
                routine.audienceType === 'cargo'
                  ? `Por cargo (${routine.audienceCargos.length})`
                  : notificationAudienceOptions.find((option) => option.value === routine.audienceType)
                      ?.label ?? 'Todos os colaboradores';

              return (
                <View key={routine.id} style={styles.routineCard}>
                  <View style={styles.routineTopRow}>
                    <Text style={styles.routineTitle}>{routine.title}</Text>
                    <ToggleSwitch value={routine.enabled} onValueChange={() => toggleRoutine(routine.id)} />
                  </View>
                  <Text style={styles.routineSubtitle}>{routine.messageTitle}</Text>
                  <View style={styles.routineTagsRow}>
                    <View
                      style={[
                        styles.routineTag,
                        routine.triggerKind === 'recorrente'
                          ? styles.routineTagRecurring
                          : styles.routineTagEvent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.routineTagText,
                          routine.triggerKind === 'recorrente'
                            ? styles.routineTagTextRecurring
                            : styles.routineTagTextEvent,
                        ]}
                      >
                        {triggerMeta.label}
                      </Text>
                    </View>
                    <View style={styles.routineChannelRow}>
                      <Feather name="message-circle" size={12} color="#7C8397" />
                      <Text style={styles.routineChannelText} numberOfLines={1}>
                        {channelLabels.length > 0 ? channelLabels.join(', ') : 'Nenhum canal'}
                      </Text>
                    </View>
                    <Text style={styles.routineAudience}>{audienceLabel}</Text>
                  </View>
                  {triggerDetail ? <Text style={styles.routineTriggerDetail}>{triggerDetail}</Text> : null}

                  <View style={styles.routineFooterRow}>
                    <View style={styles.routineLastRunRow}>
                      <Feather name="clock" size={12} color="#9AA1B5" />
                      <Text style={styles.routineLastRunText} numberOfLines={1}>
                        {routine.lastRunLabel === '—'
                          ? 'Nunca executada'
                          : `Última exec.: ${routine.lastRunLabel}`}
                      </Text>
                    </View>
                    <View style={styles.routineActionsRow}>
                      <Pressable
                        style={styles.routineActionButton}
                        onPress={() => handleRunRoutine(routine)}
                        hitSlop={6}
                      >
                        <Feather name="play" size={15} color="#18955A" />
                      </Pressable>
                      <Pressable
                        style={styles.routineActionButton}
                        onPress={() => openEditRoutineModal(routine)}
                        hitSlop={6}
                      >
                        <Feather name="edit-2" size={15} color="#3457D5" />
                      </Pressable>
                      <Pressable
                        style={styles.routineActionButton}
                        onPress={() => handleDeleteRoutine(routine)}
                        hitSlop={6}
                      >
                        <Feather name="trash-2" size={15} color="#E6213D" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <>
            <View style={styles.directorNotifHeaderRow}>
              <Text style={styles.directorNotifCountLabel}>
                {templates.length} template(s) · ⭐ padrão do sistema, demais customizados
              </Text>
              <Pressable style={styles.directorNotifNewButton} onPress={openCreateTemplateModal}>
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={styles.directorNotifNewButtonText}>Novo</Text>
              </Pressable>
            </View>

            {templates.map((template) => (
              <View key={template.id} style={styles.templateCard}>
                <View style={styles.templateTopRow}>
                  {template.isSystemDefault ? <Feather name="star" size={14} color="#D79A22" /> : null}
                  <Text style={styles.templateTitle}>{template.title}</Text>
                </View>
                <Text style={styles.templateCode}>{template.code}</Text>
                <Text style={styles.templateDescription}>{template.messageTitle}</Text>
                <Text style={styles.templateDescription} numberOfLines={2}>
                  {template.message}
                </Text>
                <View style={styles.templateTagsRow}>
                  {template.variables.map((variable) => (
                    <View key={variable} style={styles.templateTag}>
                      <Text style={styles.templateTagText}>{`{{${variable}}}`}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.templateFooterRow}>
                  <Pressable
                    style={styles.routineActionButton}
                    onPress={() => openEditTemplateModal(template)}
                    hitSlop={6}
                  >
                    <Feather name="edit-2" size={15} color="#3457D5" />
                  </Pressable>
                </View>
              </View>
            ))}
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

// ---------- Shared progress bar ----------

function RHProgressBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={rhStyles.progressTrack}>
      <View style={[rhStyles.progressFill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}

function getProgressTone(pct: number): string {
  if (pct >= 80) return '#18955A';
  if (pct >= 50) return '#B07A1E';
  return '#E6213D';
}

function RHEmptyTabState({ message }: { message: string }) {
  return (
    <View style={styles.processEmptyCard}>
      <Text style={styles.processEmptyText}>{message}</Text>
    </View>
  );
}

// ---------- Metas ----------

type GoalItem = { id: string; title: string; subtitle: string; progressPct: number };

const rhGoalStats = { noPrazo: 12, emRisco: 4, concluidas: 8 };

const rhGoals: GoalItem[] = [
  { id: 'goal-1', title: 'Reduzir turnover para 4%', subtitle: 'Rede · fechar o trimestre em 4,2%', progressPct: 82 },
  { id: 'goal-2', title: 'Preencher 56 lideranças de posto', subtitle: 'Rede · 0 de 56 atribuídas', progressPct: 12 },
  { id: 'goal-3', title: 'Adesão ao portal do colaborador', subtitle: 'Engajamento · meta 70% com login', progressPct: 49 },
  { id: 'goal-4', title: 'Treinamento NR obrigatório', subtitle: 'Compliance · 2 de 3 turmas concluídas', progressPct: 67 },
  { id: 'goal-5', title: 'Tempo médio de admissão < 5 dias', subtitle: 'DP · média atual 4,1 dias', progressPct: 95 },
];

export function RHMetasScreen({ navigation }: ScreenProps<'RHMetas'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="target" title="Metas" subtitle="Metas individuais e por posto" />

        <View style={rhStyles.tripleStatRow}>
          <View style={rhStyles.tripleStatCard}>
            <Text style={rhStyles.tripleStatValue}>{rhGoalStats.noPrazo}</Text>
            <Text style={rhStyles.tripleStatLabel}>No prazo</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, { color: '#E6213D' }]}>{rhGoalStats.emRisco}</Text>
            <Text style={rhStyles.tripleStatLabel}>Em risco</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueBlue]}>{rhGoalStats.concluidas}</Text>
            <Text style={rhStyles.tripleStatLabel}>Concluídas</Text>
          </View>
        </View>

        {rhGoals.map((goal) => {
          const tone = getProgressTone(goal.progressPct);
          return (
            <View key={goal.id} style={rhStyles.goalCard}>
              <View style={rhStyles.goalTopRow}>
                <Text style={rhStyles.goalTitle}>{goal.title}</Text>
                <Text style={[rhStyles.goalPct, { color: tone }]}>{goal.progressPct}%</Text>
              </View>
              <Text style={rhStyles.goalSubtitle}>{goal.subtitle}</Text>
              <RHProgressBar pct={goal.progressPct} color={tone} />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Ponto ----------

type PontoStatus = 'ok' | 'aberto' | 'atraso' | 'falta';
type PontoEntry = { id: string; name: string; times: string; status: PontoStatus };

const rhPontoStatusMeta: Record<PontoStatus, { label: string; color: string; tint: string }> = {
  ok: { label: 'OK', color: '#18955A', tint: '#E3F5EA' },
  aberto: { label: 'Aberto', color: '#3457D5', tint: '#E9EEFF' },
  atraso: { label: 'Atraso', color: '#B07A1E', tint: '#FCEFDA' },
  falta: { label: 'Falta', color: '#E6213D', tint: '#FCE8EC' },
};

const rhPontoStats = { presentesHoje: 912, totalAtivos: 968, inconsistencias: 14 };

const rhPontoEntries: PontoEntry[] = [
  { id: 'p-1', name: 'Adilson Bezerra', times: '08:00 · 12:02 · 13:00 · 17:31', status: 'ok' },
  { id: 'p-2', name: 'Ailson de Andrade', times: '08:03 · 12:00 · —', status: 'aberto' },
  { id: 'p-3', name: 'Alan Duarte', times: '07:58 · 12:10 · 13:05 · 17:20', status: 'ok' },
  { id: 'p-4', name: 'Adriano Filho', times: '08:40 · — · —', status: 'atraso' },
  { id: 'p-5', name: 'Alan Gama', times: '— · — · —', status: 'falta' },
];

export function RHPontoScreen({ navigation }: ScreenProps<'RHPonto'>) {
  const todayLabel = formatDateBR(new Date());

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="clock" title="Ponto" subtitle="Controle e fechamento de jornada" />

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={rhStyles.kpiLabel}>PRESENTES HOJE</Text>
              <Text style={[rhStyles.sectionBigValue, rhStyles.statGridValueGreen]}>
                {rhPontoStats.presentesHoje}
              </Text>
              <Text style={rhStyles.kpiMeta}>de {rhPontoStats.totalAtivos} ativos</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={rhStyles.kpiLabel}>INCONSISTÊNCIAS</Text>
              <Text style={[rhStyles.sectionBigValue, { color: '#E6213D' }]}>{rhPontoStats.inconsistencias}</Text>
              <Text style={rhStyles.kpiMeta}>marcações a tratar</Text>
            </View>
          </View>
        </View>

        <View style={rhStyles.sectionHeaderRow}>
          <Text style={rhStyles.sectionTitle}>Marcações de hoje</Text>
          <Text style={rhStyles.sectionHeaderMeta}>{todayLabel}</Text>
        </View>

        {rhPontoEntries.map((entry) => {
          const meta = rhPontoStatusMeta[entry.status];
          const initials = entry.name
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase();

          return (
            <View key={entry.id} style={rhStyles.employeeCard}>
              <View style={rhStyles.employeeAvatar}>
                <Text style={rhStyles.employeeAvatarText}>{initials}</Text>
              </View>
              <View style={rhStyles.employeeInfo}>
                <Text style={rhStyles.employeeName}>{entry.name}</Text>
                <Text style={rhStyles.employeeRoleUnit}>{entry.times}</Text>
              </View>
              <View style={[rhStyles.employeeStatusPill, { backgroundColor: meta.tint }]}>
                <Text style={[rhStyles.employeeStatusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
          );
        })}

        <Pressable
          style={rhStyles.outlineButton}
          onPress={() => Alert.alert('Fechar competência', 'O fechamento da competência do mês será conectado em breve.')}
        >
          <Text style={rhStyles.outlineButtonText}>Fechar competência do mês</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Férias ----------

type VacationStatus = 'andamento' | 'programada' | 'concluida';
type VacationItem = {
  id: string;
  name: string;
  unit: string;
  startLabel: string;
  endLabel: string;
  days: number;
  status: VacationStatus;
};

const rhVacationStatusMeta: Record<VacationStatus, { label: string; color: string; tint: string }> = {
  andamento: { label: 'Em andamento', color: '#18955A', tint: '#E3F5EA' },
  programada: { label: 'Programada', color: '#3457D5', tint: '#E9EEFF' },
  concluida: { label: 'Concluída', color: '#7C8397', tint: '#F1F2F7' },
};

const rhVacationStats = { andamento: 6, programadas: 23, concluidas: 88 };

const rhVacations: VacationItem[] = [
  { id: 'v-1', name: 'Carlos Dias', unit: 'Posto Geriba', startLabel: '01/07', endLabel: '30/07/2026', days: 30, status: 'andamento' },
  { id: 'v-2', name: 'Ana Souza', unit: 'Posto Monalisa', startLabel: '15/07', endLabel: '29/07/2026', days: 15, status: 'programada' },
  { id: 'v-3', name: 'Pedro Lima', unit: 'Petromasa Irajá', startLabel: '01/08', endLabel: '20/08/2026', days: 20, status: 'programada' },
  { id: 'v-4', name: 'Marina Reis', unit: 'Posto SG', startLabel: '10/06', endLabel: '09/07/2026', days: 30, status: 'concluida' },
];

export function RHFeriasScreen({ navigation }: ScreenProps<'RHFerias'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="sun" title="Férias" subtitle="Programação e concessão" />

        <View style={rhStyles.tripleStatRow}>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueGreen]}>{rhVacationStats.andamento}</Text>
            <Text style={rhStyles.tripleStatLabel}>Em andamento</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueBlue]}>{rhVacationStats.programadas}</Text>
            <Text style={rhStyles.tripleStatLabel}>Programadas</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={rhStyles.tripleStatValue}>{rhVacationStats.concluidas}</Text>
            <Text style={rhStyles.tripleStatLabel}>Concluídas</Text>
          </View>
        </View>

        <Pressable
          style={rhStyles.primaryButtonNavy}
          onPress={() => Alert.alert('Lançar férias', 'Cadastro de férias em breve.')}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Lançar férias</Text>
        </Pressable>

        {rhVacations.map((item) => {
          const meta = rhVacationStatusMeta[item.status];
          return (
            <View key={item.id} style={rhStyles.announcementCard}>
              <View style={rhStyles.announcementTopRow}>
                <Text style={rhStyles.employeeName}>{item.name}</Text>
                <View style={[rhStyles.employeeStatusPill, { backgroundColor: meta.tint }]}>
                  <Text style={[rhStyles.employeeStatusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={rhStyles.employeeRoleUnit}>
                {item.startLabel} a {item.endLabel} · {item.days} dias
              </Text>
              <Text style={rhStyles.employeeMeta}>{item.unit}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Período de Experiência ----------

type ExperienceItem = {
  id: string;
  name: string;
  roleUnit: string;
  totalDays: number;
  remainingDays: number;
  dueLabel: string;
};

const rhExperienceStats = { emExperiencia: 42, vencem7d: 7, vencem30d: 18 };

const rhExperienceItems: ExperienceItem[] = [
  { id: 'exp-1', name: 'Bruno Alves', roleUnit: 'Frentista · Posto Monalisa', totalDays: 45, remainingDays: 5, dueLabel: '08/07' },
  { id: 'exp-2', name: 'Camila Rocha', roleUnit: 'Atendente de Loja · Posto Geriba', totalDays: 90, remainingDays: 19, dueLabel: '22/07' },
  { id: 'exp-3', name: 'Diego Nunes', roleUnit: 'Frentista caixa · Posto Vianense', totalDays: 45, remainingDays: 30, dueLabel: '02/08' },
  { id: 'exp-4', name: 'Elaine Souza', roleUnit: 'Sub-gerente · Petromasa Irajá', totalDays: 90, remainingDays: 48, dueLabel: '20/08' },
];

function getExperienceTone(remainingDays: number) {
  if (remainingDays <= 7) {
    return { pillColor: '#E6213D', pillTint: '#FCE8EC', barColor: '#E6213D' };
  }
  if (remainingDays <= 30) {
    return { pillColor: '#B07A1E', pillTint: '#FCEFDA', barColor: '#B07A1E' };
  }
  return { pillColor: '#3457D5', pillTint: '#E9EEFF', barColor: '#18955A' };
}

export function RHExperienciaScreen({ navigation }: ScreenProps<'RHExperiencia'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="shield" title="Período de Experiência" subtitle="Contratos de 45 e 90 dias" />

        <View style={rhStyles.tripleStatRow}>
          <View style={rhStyles.tripleStatCard}>
            <Text style={rhStyles.tripleStatValue}>{rhExperienceStats.emExperiencia}</Text>
            <Text style={rhStyles.tripleStatLabel}>Em experiência</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, { color: '#E6213D' }]}>{rhExperienceStats.vencem7d}</Text>
            <Text style={rhStyles.tripleStatLabel}>Vencem em 7d</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueGold]}>{rhExperienceStats.vencem30d}</Text>
            <Text style={rhStyles.tripleStatLabel}>Vencem em 30d</Text>
          </View>
        </View>

        {rhExperienceItems.map((item) => {
          const tone = getExperienceTone(item.remainingDays);
          const elapsedPct = ((item.totalDays - item.remainingDays) / item.totalDays) * 100;

          return (
            <View key={item.id} style={rhStyles.experienceCard}>
              <View style={rhStyles.announcementTopRow}>
                <Text style={rhStyles.employeeName}>{item.name}</Text>
                <View style={[rhStyles.employeeStatusPill, { backgroundColor: tone.pillTint }]}>
                  <Text style={[rhStyles.employeeStatusText, { color: tone.pillColor }]}>
                    {item.remainingDays} dias
                  </Text>
                </View>
              </View>
              <Text style={rhStyles.employeeRoleUnit}>{item.roleUnit}</Text>
              <View style={rhStyles.experienceProgressRow}>
                <Text style={rhStyles.experienceProgressLabel}>{item.totalDays} dias</Text>
                <View style={rhStyles.experienceProgressBarWrap}>
                  <RHProgressBar pct={elapsedPct} color={tone.barColor} />
                </View>
                <Text style={rhStyles.experienceProgressLabel}>Vence {item.dueLabel}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Folha de Pagamento ----------

type PayrollStatus = 'aberta' | 'fechada';
type PayrollCompetency = {
  id: string;
  label: string;
  status: PayrollStatus;
  bruto: string;
  liquido: string;
  fgts: string;
};

const rhPayrollStatusMeta: Record<PayrollStatus, { label: string; color: string; tint: string }> = {
  aberta: { label: 'Aberta', color: '#3457D5', tint: '#E9EEFF' },
  fechada: { label: 'Fechada', color: '#18955A', tint: '#E3F5EA' },
};

const rhPayrollCompetencies: PayrollCompetency[] = [
  { id: 'pay-may', label: 'Maio / 2026', status: 'aberta', bruto: 'R$ 0,00', liquido: 'R$ 0,00', fgts: 'R$ 0,00' },
  { id: 'pay-apr', label: 'Abril / 2026', status: 'fechada', bruto: 'R$ 1.812.400', liquido: 'R$ 1.402.118', fgts: 'R$ 145.192' },
  { id: 'pay-mar', label: 'Março / 2026', status: 'fechada', bruto: 'R$ 1.798.230', liquido: 'R$ 1.390.552', fgts: 'R$ 143.858' },
];

export function RHFolhaPagamentoScreen({ navigation }: ScreenProps<'RHFolhaPagamento'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="credit-card" title="Folha de Pagamento" subtitle="Rubricas, INSS, IRRF, FGTS" />

        <Pressable
          style={styles.primaryButton}
          onPress={() => Alert.alert('Nova competência', 'A criação de competência será conectada em breve.')}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Nova competência</Text>
        </Pressable>
        <Text style={rhStyles.payrollHelperText}>
          Crie a competência do mês e calcule a folha. INSS/IRRF conforme tabela 2026.
        </Text>

        {rhPayrollCompetencies.map((item) => {
          const meta = rhPayrollStatusMeta[item.status];
          return (
            <View key={item.id} style={rhStyles.sectionCard}>
              <View style={rhStyles.announcementTopRow}>
                <Text style={rhStyles.employeeName}>{item.label}</Text>
                <View style={[rhStyles.employeeStatusPill, { backgroundColor: meta.tint }]}>
                  <Text style={[rhStyles.employeeStatusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <View style={rhStyles.payrollStatsRow}>
                <View style={rhStyles.payrollStatItem}>
                  <Text style={rhStyles.payrollStatLabel}>Bruto</Text>
                  <Text style={rhStyles.payrollStatValue}>{item.bruto}</Text>
                </View>
                <View style={rhStyles.payrollStatItem}>
                  <Text style={rhStyles.payrollStatLabel}>Líquido</Text>
                  <Text style={rhStyles.payrollStatValue}>{item.liquido}</Text>
                </View>
                <View style={rhStyles.payrollStatItem}>
                  <Text style={rhStyles.payrollStatLabel}>FGTS</Text>
                  <Text style={rhStyles.payrollStatValue}>{item.fgts}</Text>
                </View>
              </View>
              <Pressable
                style={rhStyles.outlineButton}
                onPress={() => Alert.alert(item.label, 'Detalhamento da folha em breve.')}
              >
                <Text style={rhStyles.outlineButtonText}>Abrir</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Recursos Operacionais ----------

type ResourceStatus = 'disponivel' | 'baixo' | 'ativo';
type ResourceTab = 'pedidos' | 'cobrancas' | 'estoque' | 'itens';
type OperationalResourceItem = { id: string; title: string; subtitle: string; status: ResourceStatus };

const rhResourceStatusMeta: Record<ResourceStatus, { label: string; color: string; tint: string }> = {
  disponivel: { label: 'Disponível', color: '#18955A', tint: '#E3F5EA' },
  baixo: { label: 'Baixo', color: '#B07A1E', tint: '#FCEFDA' },
  ativo: { label: 'Ativo', color: '#3457D5', tint: '#E9EEFF' },
};

const rhResourceItems: OperationalResourceItem[] = [
  { id: 'res-1', title: 'Camisa polo American Fuel', subtitle: 'Grade P-GG · 320 em estoque', status: 'disponivel' },
  { id: 'res-2', title: 'Botina de segurança', subtitle: 'Nº 38-44 · 45 em estoque', status: 'baixo' },
  { id: 'res-3', title: 'Jaqueta corta-vento', subtitle: 'Grade M-GG · 12 em estoque', status: 'baixo' },
  { id: 'res-4', title: 'Kit frentista (3 peças)', subtitle: 'Kit por cargo · padrão', status: 'ativo' },
];

const rhResourceTabs: Array<{ key: ResourceTab; label: string }> = [
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'cobrancas', label: 'Cobranças' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'itens', label: 'Itens & Grade' },
];

export function RHRecursosOperacionaisScreen({ navigation }: ScreenProps<'RHRecursosOperacionais'>) {
  const [activeTab, setActiveTab] = useState<ResourceTab>('pedidos');

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="tool" title="Recursos Operacionais" subtitle="Uniformes e EPIs" />

        <View style={rhStyles.categoryRow}>
          {rhResourceTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[rhStyles.categoryChip, isActive ? rhStyles.categoryChipActive : null]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[rhStyles.categoryChipText, isActive ? rhStyles.categoryChipTextActive : null]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.spacingTop}>
          {activeTab === 'pedidos' ? (
            rhResourceItems.map((item) => {
              const meta = rhResourceStatusMeta[item.status];
              return (
                <View key={item.id} style={rhStyles.resourceCard}>
                  <View style={rhStyles.resourceIconShell}>
                    <Feather name="package" size={18} color="#5E667D" />
                  </View>
                  <View style={rhStyles.employeeInfo}>
                    <Text style={rhStyles.employeeName}>{item.title}</Text>
                    <Text style={rhStyles.employeeRoleUnit}>{item.subtitle}</Text>
                  </View>
                  <View style={[rhStyles.employeeStatusPill, { backgroundColor: meta.tint }]}>
                    <Text style={[rhStyles.employeeStatusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <RHEmptyTabState message="Nenhum registro nesta aba ainda." />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Workflow ----------

type WorkflowUnit = { id: string; name: string; location: string };

const rhWorkflowStats = { postos: 56, comLideranca: 0, semLideranca: 56, lideresAtivos: 0 };

const rhWorkflowUnits: WorkflowUnit[] = [
  { id: 'wf-1', name: 'Auto Mecânica Juquinha Ltd', location: 'Rio de Janeiro / RJ' },
  { id: 'wf-2', name: 'Auto Posto BR 101 Norte Ltda', location: '—' },
  { id: 'wf-3', name: 'Auto Posto Estrela do Oceano', location: 'Rio de Janeiro / RJ' },
  { id: 'wf-4', name: 'Auto Posto Serviços Via Dutra 1', location: 'Nova Iguaçu / RJ' },
  { id: 'wf-5', name: 'Auto Posto do Trabalho São Cristóvão', location: 'Rio de Janeiro / RJ' },
];

export function RHWorkflowScreen({ navigation }: ScreenProps<'RHWorkflow'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="share-2" title="Workflow" subtitle="Hierarquia e aprovações" />

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={rhStyles.kpiLabel}>POSTOS</Text>
              <Text style={rhStyles.sectionBigValue}>{rhWorkflowStats.postos}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={rhStyles.kpiLabel}>COM LIDERANÇA</Text>
              <Text style={[rhStyles.sectionBigValue, rhStyles.statGridValueGreen]}>
                {rhWorkflowStats.comLideranca} / {rhWorkflowStats.postos}
              </Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={rhStyles.kpiLabel}>SEM LIDERANÇA</Text>
              <Text style={[rhStyles.sectionBigValue, { color: '#E6213D' }]}>{rhWorkflowStats.semLideranca}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={rhStyles.kpiLabel}>LÍDERES ATIVOS</Text>
              <Text style={[rhStyles.sectionBigValue, rhStyles.tripleStatValueBlue]}>
                {rhWorkflowStats.lideresAtivos}
              </Text>
            </View>
          </View>
        </View>

        {rhWorkflowUnits.map((unit) => (
          <View key={unit.id} style={rhStyles.workflowUnitCard}>
            <View style={rhStyles.employeeInfo}>
              <Text style={rhStyles.employeeName}>{unit.name}</Text>
              <Text style={rhStyles.employeeRoleUnit}>{unit.location}</Text>
              <Text style={rhStyles.workflowWarningText}>Sem liderança atribuída</Text>
            </View>
            <Pressable
              style={rhStyles.outlineButtonSmall}
              onPress={() => Alert.alert(unit.name, 'Atribuição de liderança em breve.')}
            >
              <Text style={rhStyles.outlineButtonSmallText}>Gerenciar</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Relatórios ----------

type ReportTag = 'recontratado' | 'reincidente';
type ReportItem = {
  id: string;
  name: string;
  tag: ReportTag;
  value: string;
  vinculos: number;
  firstAdmLabel: string;
  lastMovLabel: string;
};

const rhReportTagMeta: Record<ReportTag, { label: string; color: string; tint: string }> = {
  recontratado: { label: 'Recontratado', color: '#B07A1E', tint: '#FCEFDA' },
  reincidente: { label: 'Reincidente', color: '#E6213D', tint: '#FCE8EC' },
};

const rhReportStats = { total: 11, recontratados: 1, reincidentes: 10, custoRescisoes: 'R$ 55.793' };

const rhReportItems: ReportItem[] = [
  { id: 'rep-1', name: 'Matheus Martins Correia', tag: 'recontratado', value: 'R$ 313,46', vinculos: 2, firstAdmLabel: '02/09/2021', lastMovLabel: '25/06/2026' },
  { id: 'rep-2', name: 'Bruno Eduardo R. da Silva', tag: 'reincidente', value: 'R$ 10.332,91', vinculos: 2, firstAdmLabel: '13/06/2019', lastMovLabel: '05/06/2026' },
  { id: 'rep-3', name: 'Breno Carvalho da Silva', tag: 'reincidente', value: 'R$ 6.886,81', vinculos: 2, firstAdmLabel: '19/08/2022', lastMovLabel: '01/06/2026' },
  { id: 'rep-4', name: 'Gabriel Keller da Silva', tag: 'reincidente', value: 'R$ 725,59', vinculos: 2, firstAdmLabel: '05/10/2024', lastMovLabel: '17/05/2026' },
];

export function RHRelatoriosScreen({ navigation }: ScreenProps<'RHRelatorios'>) {
  const currentYear = new Date().getFullYear();

  const handleExport = (format: string) => {
    Alert.alert('Exportar', `Exportação em ${format} será conectada em breve.`);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader
          icon="bar-chart-2"
          title="Relatórios"
          subtitle={`Reincidência e recontratação · ${currentYear}`}
        />

        <View style={rhStyles.exportButtonsRow}>
          <Pressable style={rhStyles.exportButtonGreen} onPress={() => handleExport('Excel')}>
            <Feather name="file-text" size={15} color="#18955A" />
            <Text style={rhStyles.exportButtonTextGreen}>Excel</Text>
          </Pressable>
          <Pressable style={rhStyles.exportButtonRed} onPress={() => handleExport('PDF')}>
            <Feather name="file" size={15} color="#E6213D" />
            <Text style={rhStyles.exportButtonTextRed}>PDF</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={rhStyles.kpiLabel}>TOTAL NO PERÍODO</Text>
              <Text style={[rhStyles.sectionBigValue, rhStyles.statGridValueGreen]}>{rhReportStats.total}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={rhStyles.kpiLabel}>RECONTRATADOS</Text>
              <Text style={[rhStyles.sectionBigValue, rhStyles.statGridValueGold]}>
                {rhReportStats.recontratados}
              </Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={rhStyles.kpiLabel}>REINCIDENTES</Text>
              <Text style={[rhStyles.sectionBigValue, { color: '#E6213D' }]}>{rhReportStats.reincidentes}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={rhStyles.kpiCard}>
              <Text style={rhStyles.kpiLabel}>CUSTO DE RESCISÕES</Text>
              <Text style={rhStyles.sectionBigValue}>{rhReportStats.custoRescisoes}</Text>
            </View>
          </View>
        </View>

        {rhReportItems.map((item) => {
          const meta = rhReportTagMeta[item.tag];
          return (
            <View key={item.id} style={rhStyles.sectionCard}>
              <View style={rhStyles.announcementTopRow}>
                <View style={[rhStyles.employeeStatusPill, { backgroundColor: meta.tint }]}>
                  <Text style={[rhStyles.employeeStatusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={rhStyles.reportValue}>{item.value}</Text>
              </View>
              <Text style={rhStyles.employeeName}>{item.name}</Text>
              <Text style={rhStyles.employeeRoleUnit}>
                {item.vinculos} vínculos · 1ª adm. {item.firstAdmLabel} · últ. mov. {item.lastMovLabel}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Configurações ----------

type ConfigTab = 'cargos' | 'setores' | 'folha' | 'reajustes';
type ConfigRole = { id: string; name: string; active: boolean };

const rhConfigTabs: Array<{ key: ConfigTab; label: string }> = [
  { key: 'cargos', label: 'Cargos' },
  { key: 'setores', label: 'Setores' },
  { key: 'folha', label: 'Folha' },
  { key: 'reajustes', label: 'Reajustes' },
];

const rhConfigRoles: ConfigRole[] = [
  { id: 'role-1', name: 'Analista de Recursos Humanos', active: true },
  { id: 'role-2', name: 'Analista de RH', active: true },
  { id: 'role-3', name: 'Analista de TI', active: true },
  { id: 'role-4', name: 'Analista Financeiro I', active: true },
  { id: 'role-5', name: 'Aprendiz de Frentista', active: true },
  { id: 'role-6', name: 'Assist. Administrativo', active: true },
  { id: 'role-7', name: 'Assistente Financeiro', active: true },
  { id: 'role-8', name: 'Atendente', active: true },
  { id: 'role-9', name: 'Atendente de Loja', active: true },
  { id: 'role-10', name: 'Aux. Administrativo', active: true },
];

function RoleFormModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (role: ConfigRole) => void;
}) {
  const [name, setName] = useState('');

  const handleClose = () => {
    setName('');
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha o nome do cargo.');
      return;
    }
    onSave({ id: `role-${Date.now()}`, name: name.trim(), active: true });
    setName('');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle}>Novo cargo</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <Text style={styles.requestFieldLabel}>Nome do cargo *</Text>
          <TextInput
            style={styles.processTextInput}
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Analista de Folha"
            placeholderTextColor="#A7AEC2"
          />

          <Pressable style={[rhStyles.primaryButtonGreen, styles.spacingTop]} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>Salvar cargo</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function RHConfiguracoesScreen({ navigation }: ScreenProps<'RHConfiguracoes'>) {
  const [activeTab, setActiveTab] = useState<ConfigTab>('cargos');
  const [roles, setRoles] = useState<ConfigRole[]>(rhConfigRoles);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSaveRole = (role: ConfigRole) => {
    setRoles((current) => [role, ...current]);
    setIsFormOpen(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={rhUserInitials}
          variant="rh"
          onAvatarPress={() => navigation.navigate('RHProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader icon="settings" title="Configurações" subtitle="Cargos, setores, rubricas, tabelas" />

        <View style={rhStyles.categoryRow}>
          {rhConfigTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[rhStyles.categoryChip, isActive ? rhStyles.categoryChipActive : null]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[rhStyles.categoryChipText, isActive ? rhStyles.categoryChipTextActive : null]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'cargos' ? (
          <>
            <View style={[styles.directorNotifHeaderRow, styles.spacingTop]}>
              <Text style={styles.directorNotifCountLabel}>{roles.length} registros</Text>
              <Pressable style={styles.directorNotifNewButton} onPress={() => setIsFormOpen(true)}>
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={styles.directorNotifNewButtonText}>Novo cargo</Text>
              </Pressable>
            </View>

            {roles.map((role) => (
              <View key={role.id} style={rhStyles.configRoleCard}>
                <Text style={rhStyles.rankName}>{role.name}</Text>
                <View style={rhStyles.configRoleRight}>
                  <View style={[rhStyles.employeeStatusPill, { backgroundColor: '#E3F5EA' }]}>
                    <Text style={[rhStyles.employeeStatusText, { color: '#18955A' }]}>
                      {role.active ? 'Ativo' : 'Inativo'}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => Alert.alert(role.name, 'Edição de cargo em breve.')}
                  >
                    <Feather name="edit-2" size={15} color="#9AA1B5" />
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.spacingTop}>
            <RHEmptyTabState message="Nenhum registro nesta aba ainda." />
          </View>
        )}
      </ScrollView>

      <RoleFormModal visible={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveRole} />
    </SafeAreaView>
  );
}

// ---------- Local styles ----------

const rhStyles = StyleSheet.create({
  pageHeaderSubtitle: {
    marginTop: 2,
  },
  heroCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  heroGreeting: {
    color: '#DCF3E4',
    fontSize: 13,
    fontWeight: '600',
  },
  heroTitle: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 4,
    color: '#DCF3E4',
    fontSize: 12,
    fontWeight: '600',
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderLeftWidth: 4,
    borderLeftColor: '#E2E6F0',
    padding: 14,
  },
  kpiCardAccentGreen: {
    borderLeftColor: '#18955A',
  },
  kpiCardAccentGray: {
    borderLeftColor: '#9AA1B5',
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiLabel: {
    color: '#7C8397',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  kpiValue: {
    marginTop: 6,
    color: '#0C1736',
    fontSize: 20,
    fontWeight: '800',
  },
  kpiMeta: {
    marginTop: 2,
    color: '#9AA1B5',
    fontSize: 11,
  },
  kpiPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  kpiPillDown: {
    backgroundColor: '#FCE8EC',
  },
  kpiPillUp: {
    backgroundColor: '#E3F5EA',
  },
  kpiPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  kpiPillTextDown: {
    color: '#E6213D',
  },
  kpiPillTextUp: {
    color: '#18955A',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    marginBottom: 12,
  },
  lastSectionCard: {
    marginBottom: 4,
  },
  sectionLabel: {
    color: '#7C8397',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionBigValue: {
    marginTop: 6,
    color: '#0C1736',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#15203E',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  statGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statGridItem: {
    width: '25%',
    alignItems: 'center',
  },
  statGridValue: {
    color: '#0C1736',
    fontSize: 18,
    fontWeight: '800',
  },
  statGridValueGold: {
    color: '#B07A1E',
  },
  statGridValueGreen: {
    color: '#18955A',
  },
  statGridLabel: {
    marginTop: 2,
    color: '#9AA1B5',
    fontSize: 11,
    textAlign: 'center',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chartLegendRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartLegendText: {
    color: '#7C8397',
    fontSize: 11,
    fontWeight: '700',
  },
  barChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    height: 110,
  },
  barGroup: {
    alignItems: 'center',
    gap: 6,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 90,
  },
  barAdm: {
    width: 8,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#18955A',
  },
  barDem: {
    width: 8,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#E6213D',
  },
  barMonthLabel: {
    color: '#9AA1B5',
    fontSize: 10,
    fontWeight: '600',
  },
  lineChartWrap: {
    marginTop: 10,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F7',
    gap: 10,
  },
  rankNumber: {
    color: '#9AA1B5',
    fontSize: 12,
    fontWeight: '700',
    width: 16,
  },
  rankName: {
    flex: 1,
    color: '#3457D5',
    fontSize: 13,
    fontWeight: '700',
  },
  rankValue: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  genderBarTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#F1F2F7',
    marginBottom: 12,
  },
  genderBarSegment: {
    height: '100%',
  },
  genderLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  genderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  genderLabel: {
    flex: 1,
    color: '#4C5470',
    fontSize: 13,
    fontWeight: '600',
  },
  genderValue: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '700',
  },
  statsPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statsPill: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: '#F1F2F7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statsPillLabel: {
    color: '#5E667D',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsPillValue: {
    marginTop: 2,
    color: '#15203E',
    fontSize: 16,
    fontWeight: '800',
  },
  filterPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: '100%',
  },
  filterPillText: {
    color: '#4C5470',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 150,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F2F7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryIconButtonText: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '700',
  },
  importEmployeesModalCard: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
  },
  importEmployeesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  importEmployeesHeaderTextBlock: {
    flex: 1,
  },
  importEmployeesTitle: {
    color: '#15203E',
    fontSize: 16,
    fontWeight: '800',
  },
  importEmployeesSubtitle: {
    marginTop: 6,
    color: '#6F768A',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  importEmployeesActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  importEmployeesActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE1EC',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  importEmployeesActionButtonText: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '600',
  },
  importEmployeesSelectedFileCard: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    backgroundColor: '#F8FAFD',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  importEmployeesSelectedFileLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  importEmployeesSelectedFileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FCE8EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importEmployeesSelectedFileTextBlock: {
    flex: 1,
  },
  importEmployeesSelectedFileName: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '700',
  },
  importEmployeesSelectedFileMeta: {
    marginTop: 2,
    color: '#7C8397',
    fontSize: 12,
  },
  importEmployeesChangeFileButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE1EC',
  },
  importEmployeesChangeFileButtonText: {
    color: '#4C5470',
    fontSize: 12,
    fontWeight: '700',
  },
  importEmployeesRulesCard: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6DCE8',
    backgroundColor: '#F9FAFC',
    padding: 14,
  },
  importEmployeesRulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  importEmployeesRulesTitle: {
    color: '#3E465C',
    fontSize: 14,
    fontWeight: '700',
  },
  importEmployeesRuleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  importEmployeesRuleBullet: {
    color: '#5E667D',
    fontSize: 14,
    lineHeight: 18,
  },
  importEmployeesRuleText: {
    flex: 1,
    color: '#6F768A',
    fontSize: 12,
    lineHeight: 18,
  },
  importEmployeesFooter: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  importEmployeesCloseButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  importEmployeesCloseButtonText: {
    color: '#2E3447',
    fontSize: 14,
    fontWeight: '600',
  },
  importEmployeesFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  importEmployeesGhostButton: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#F1F3F7',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importEmployeesGhostButtonText: {
    color: '#6F768A',
    fontSize: 13,
    fontWeight: '700',
  },
  importEmployeesPrimaryButton: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#E799A2',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  importEmployeesPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  importEmployeesButtonDisabled: {
    opacity: 0.55,
  },
  importEmployeesGhostButtonTextDisabled: {
    color: '#A0A6B8',
  },
  modalSubtitle: {
    marginTop: 2,
    color: '#9AA1B5',
    fontSize: 11,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formRowItem: {
    flex: 1,
  },
  selectPlaceholder: {
    color: '#A7AEC2',
  },
  emBreveText: {
    color: '#5E667D',
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: 8,
  },
  docStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  docStatsText: {
    flex: 1,
    color: '#5E667D',
    fontSize: 12,
  },
  primaryButtonGreenSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18955A',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButtonSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  docGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  docCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 14,
    padding: 12,
  },
  docCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docPendingBadge: {
    backgroundColor: '#FCEFDA',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  docPendingBadgeText: {
    color: '#B07A1E',
    fontSize: 10,
    fontWeight: '800',
  },
  docCardTitle: {
    marginTop: 8,
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  docCardDescription: {
    marginTop: 2,
    color: '#8B93A8',
    fontSize: 10,
    lineHeight: 14,
  },
  docCardCount: {
    marginTop: 8,
    color: '#9AA1B5',
    fontSize: 11,
  },
  trainingStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  trainingStatItem: {
    flex: 1,
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  trainingStatLabel: {
    color: '#8B93A8',
    fontSize: 10,
  },
  trainingStatValue: {
    color: '#15203E',
    fontSize: 16,
    fontWeight: '800',
  },
  inlineBold: {
    fontWeight: '800',
    color: '#15203E',
  },
  salaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  salaryValue: {
    marginTop: 2,
    color: '#15203E',
    fontSize: 20,
    fontWeight: '800',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
    gap: 8,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F2F7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lockedBadgeText: {
    color: '#5E667D',
    fontSize: 10,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  historyCardTitle: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  historyCardMeta: {
    marginTop: 2,
    color: '#5E667D',
    fontSize: 11,
  },
  infoBox: {
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  infoBoxLine: {
    color: '#5E667D',
    fontSize: 12,
    marginBottom: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    flex: 1,
    color: '#4C5470',
    fontSize: 12,
  },
  warningBox: {
    backgroundColor: '#FCF6E8',
    borderWidth: 1,
    borderColor: '#F0D9A8',
    borderRadius: 14,
    padding: 12,
  },
  warningBoxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  warningBoxTitle: {
    flex: 1,
    color: '#8A5A12',
    fontSize: 12,
    fontWeight: '800',
  },
  warningBoxNote: {
    marginTop: 6,
    color: '#8A6A2E',
    fontSize: 11,
    lineHeight: 15,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  backRowText: {
    color: '#5E667D',
    fontSize: 13,
    fontWeight: '700',
  },
  employeeHeroBanner: {
    height: 70,
    borderRadius: 16,
    padding: 10,
    alignItems: 'flex-end',
  },
  employeeHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  employeeHeroBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  employeeProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
    marginTop: -30,
    marginBottom: 14,
  },
  employeeProfileAvatarWrap: {
    marginBottom: 8,
  },
  employeeProfileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#1B2340',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  employeeProfileAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  employeeProfileName: {
    color: '#15203E',
    fontSize: 17,
    fontWeight: '800',
  },
  employeeProfileRole: {
    marginTop: 2,
    color: '#5E667D',
    fontSize: 13,
  },
  employeeProfileBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  employeeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  employeeMetaRowText: {
    flex: 1,
    color: '#4C5470',
    fontSize: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionTile: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
  },
  quickActionLabel: {
    color: '#15203E',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#15203E',
    fontSize: 14,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#EDF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeAvatarText: {
    color: '#3457D5',
    fontSize: 13,
    fontWeight: '800',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  employeeRoleUnit: {
    marginTop: 2,
    color: '#4C5470',
    fontSize: 12,
  },
  employeeMeta: {
    marginTop: 2,
    color: '#9AA1B5',
    fontSize: 11,
  },
  employeeStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  employeeStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  paginationText: {
    color: '#9AA1B5',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F2F7',
  },
  paginationButtonDisabled: {
    opacity: 0.4,
  },
  tripleStatRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tripleStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tripleStatValue: {
    color: '#15203E',
    fontSize: 20,
    fontWeight: '800',
  },
  tripleStatValueGold: {
    color: '#B07A1E',
  },
  tripleStatValueBlue: {
    color: '#3457D5',
  },
  tripleStatValueGreen: {
    color: '#18955A',
  },
  tripleStatLabel: {
    marginTop: 4,
    color: '#9AA1B5',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  tripleStatCaption: {
    marginTop: 4,
    color: '#9AA1B5',
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  primaryButtonGreen: {
    marginTop: 0,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: '#1B6E3A',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: '#1B6E3A',
    borderColor: '#1B6E3A',
  },
  categoryChipText: {
    color: '#4C5470',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  mobileDetailTabsShell: {
    marginTop: 4,
    marginBottom: 6,
    marginHorizontal: -4,
  },
  mobileDetailTabsRow: {
    paddingHorizontal: 4,
    gap: 8,
  },
  mobileDetailTab: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileDetailTabActive: {
    backgroundColor: '#E8F7EE',
    borderColor: '#B4E3C8',
  },
  mobileDetailTabText: {
    color: '#4C5470',
    fontSize: 12,
    fontWeight: '700',
  },
  mobileDetailTabTextActive: {
    color: '#1B6E3A',
  },
  dependentsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  dependentEligiblePill: {
    borderRadius: 999,
    backgroundColor: '#E3F5EA',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dependentEligiblePillText: {
    color: '#18955A',
    fontSize: 11,
    fontWeight: '800',
  },
  dependentAddButton: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: '#E24C52',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dependentAddButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dependentEmptyCard: {
    marginTop: 12,
    minHeight: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dependentEmptyText: {
    color: '#7C8397',
    fontSize: 14,
    textAlign: 'center',
  },
  dependentCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
  },
  dependentCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  dependentCardName: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  dependentCardMeta: {
    marginTop: 4,
    color: '#7C8397',
    fontSize: 12,
  },
  dependentStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dependentStatusPillActive: {
    backgroundColor: '#E8F7EE',
  },
  dependentStatusPillInactive: {
    backgroundColor: '#F1F2F7',
  },
  dependentStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dependentStatusPillTextActive: {
    color: '#1E7E4D',
  },
  dependentStatusPillTextInactive: {
    color: '#5E667D',
  },
  dependentInfoGrid: {
    marginTop: 10,
    gap: 4,
  },
  dependentInfoText: {
    color: '#4C5470',
    fontSize: 12,
  },
  dependentNotes: {
    marginTop: 10,
    color: '#7C8397',
    fontSize: 12,
    lineHeight: 18,
  },
  formSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  formSectionTitle: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  sectionHeaderInline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  formSectionHint: {
    flex: 1,
    color: '#9AA1B5',
    fontSize: 11,
    textAlign: 'right',
  },
  detailSaveButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#E24C52',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  toggleFormCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  toggleFormLabel: {
    flex: 1,
    color: '#3E465C',
    fontSize: 13,
  },
  benefitEditorCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  benefitEditorHeader: {
    marginBottom: 8,
    gap: 6,
  },
  benefitEditorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitEditorTitle: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '700',
  },
  benefitEditorMeta: {
    color: '#7C8397',
    fontSize: 11,
  },
  benefitsSummaryCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FC',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  benefitsSummaryLabel: {
    color: '#7C8397',
    fontSize: 12,
    fontWeight: '600',
  },
  benefitsSummaryMuted: {
    color: '#7C8397',
    fontSize: 12,
  },
  benefitsSummaryValue: {
    color: '#18955A',
    fontSize: 14,
    fontWeight: '800',
  },
  benefitsSummaryValueDanger: {
    color: '#E24C52',
    fontSize: 14,
    fontWeight: '800',
  },
  pendingItemCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
  },
  pendingItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingItemTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pendingItemTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  pendingItemTitle: {
    marginTop: 10,
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  pendingItemSubtitle: {
    marginTop: 4,
    color: '#5E667D',
    fontSize: 12,
    lineHeight: 18,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 10,
  },
  timelineRail: {
    width: 18,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E24C52',
    marginTop: 8,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E6F0',
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
  },
  timelineDescription: {
    marginTop: 6,
    color: '#5E667D',
    fontSize: 12,
    lineHeight: 18,
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  announcementTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  announcementBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  announcementBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  announcementTime: {
    color: '#9AA1B5',
    fontSize: 11,
  },
  announcementTitle: {
    marginTop: 8,
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  announcementDesc: {
    marginTop: 4,
    color: '#4C5470',
    fontSize: 13,
  },
  announcementMeta: {
    marginTop: 8,
    color: '#9AA1B5',
    fontSize: 11,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketCode: {
    color: '#9AA1B5',
    fontSize: 12,
    fontWeight: '700',
  },
  ticketStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ticketStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  ticketTitle: {
    marginTop: 6,
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  ticketMeta: {
    marginTop: 4,
    color: '#7C8397',
    fontSize: 12,
  },
  ticketDetailTitle: {
    marginTop: 4,
    color: '#15203E',
    fontSize: 15,
    fontWeight: '800',
  },
  ticketDetailMeta: {
    marginTop: 4,
    color: '#7C8397',
    fontSize: 12,
  },
  importActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  importActionIconShell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1B6E3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  importActionTitle: {
    color: '#15203E',
    fontSize: 15,
    fontWeight: '800',
  },
  importActionSubtitle: {
    marginTop: 4,
    color: '#9AA1B5',
    fontSize: 12,
    textAlign: 'center',
  },
  importActionButton: {
    marginTop: 14,
    width: '100%',
    marginBottom: 0,
  },
  historyLabel: {
    color: '#7C8397',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  importRecordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  importTypePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  importTypePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  importRecordInfo: {
    flex: 1,
  },
  importRecordName: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '700',
  },
  importRecordTime: {
    marginTop: 2,
    color: '#9AA1B5',
    fontSize: 11,
  },
  comingSoonText: {
    marginTop: 8,
  },
  progressTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F1F2F7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeaderMeta: {
    color: '#9AA1B5',
    fontSize: 12,
    fontWeight: '600',
  },
  outlineButton: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7DCE8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: '#29448D',
    fontSize: 14,
    fontWeight: '800',
  },
  outlineButtonSmall: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7DCE8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  outlineButtonSmallText: {
    color: '#29448D',
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButtonNavy: {
    marginTop: 0,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: '#2F4EA8',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  goalTitle: {
    flex: 1,
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  goalPct: {
    fontSize: 15,
    fontWeight: '800',
  },
  goalSubtitle: {
    marginTop: 4,
    color: '#7C8397',
    fontSize: 12,
  },
  experienceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  experienceProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  experienceProgressLabel: {
    color: '#9AA1B5',
    fontSize: 11,
    fontWeight: '600',
  },
  experienceProgressBarWrap: {
    flex: 1,
  },
  payrollHelperText: {
    marginTop: 6,
    marginBottom: 16,
    color: '#9AA1B5',
    fontSize: 12,
  },
  payrollStatsRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 12,
  },
  payrollStatItem: {
    flex: 1,
  },
  payrollStatLabel: {
    color: '#9AA1B5',
    fontSize: 11,
    fontWeight: '600',
  },
  payrollStatValue: {
    marginTop: 2,
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  resourceIconShell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowUnitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  workflowWarningText: {
    marginTop: 4,
    color: '#E6213D',
    fontSize: 11,
    fontWeight: '700',
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  exportButtonGreen: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#B7E4C7',
    backgroundColor: '#E3F5EA',
    paddingVertical: 12,
  },
  exportButtonTextGreen: {
    color: '#18955A',
    fontSize: 13,
    fontWeight: '800',
  },
  exportButtonRed: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F5C2CC',
    backgroundColor: '#FCE8EC',
    paddingVertical: 12,
  },
  exportButtonTextRed: {
    color: '#E6213D',
    fontSize: 13,
    fontWeight: '800',
  },
  reportValue: {
    color: '#15203E',
    fontSize: 15,
    fontWeight: '800',
  },
  configRoleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 8,
  },
  configRoleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodFilterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    marginBottom: 16,
  },
  periodFilterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F2F7',
    borderRadius: 999,
    padding: 3,
  },
  periodToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  periodToggleBtnActive: {
    backgroundColor: '#15203E',
  },
  periodToggleText: {
    color: '#5E667D',
    fontSize: 12,
    fontWeight: '700',
  },
  periodToggleTextActive: {
    color: '#FFFFFF',
  },
  periodResetBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F2F7',
  },
  periodNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 10,
  },
  periodNavLabel: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E6F0',
  },
  detailModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  detailModalTitle: {
    flex: 1,
    color: '#15203E',
    fontSize: 16,
    fontWeight: '800',
  },
  detailSectionHeading: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 10,
  },
  detailCaption: {
    marginTop: 4,
    color: '#9AA1B5',
    fontSize: 11,
  },
  detailNoteText: {
    marginTop: 12,
    color: '#7C8397',
    fontSize: 12,
    lineHeight: 18,
  },
  detailNoteHighlight: {
    color: '#3457D5',
    fontWeight: '700',
  },
  highlightCard: {
    marginTop: 4,
    backgroundColor: '#FCF6E3',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1E1AE',
    padding: 14,
  },
  highlightDescription: {
    marginTop: 8,
    color: '#7C6A2E',
    fontSize: 12,
    lineHeight: 18,
  },
  miniTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    overflow: 'hidden',
  },
  miniTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F7F8FC',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  miniTableHeaderText: {
    color: '#7C8397',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  miniTableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F7',
  },
  miniTableCellText: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '600',
  },
  miniTableFirstCol: {
    flex: 2,
  },
  miniTableCol: {
    flex: 1,
    textAlign: 'right',
  },
  rankedListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  categoryBarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 10,
  },
  categoryBarTitle: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  categoryBarRow: {
    marginBottom: 10,
  },
  categoryBarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryBarLabel: {
    flex: 1,
    color: '#4C5470',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  categoryBarValue: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#F1F2F7',
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutLegend: {
    flex: 1,
    gap: 10,
  },
  donutLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  donutLegendTextBlock: {
    flex: 1,
  },
  donutLegendLabel: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '700',
  },
  donutLegendMeta: {
    marginTop: 2,
    color: '#9AA1B5',
    fontSize: 11,
  },
  barGroupSelected: {
    backgroundColor: '#F1F2F7',
    borderRadius: 10,
  },
  chartTouchWrap: {
    position: 'relative',
  },
  chartTouchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  chartTouchSegment: {
    flex: 1,
  },
  chartAxisLabelsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  chartAxisLabelText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 8,
    color: '#9AA1B5',
  },
  categoryBarEmptyText: {
    color: '#9AA1B5',
    fontSize: 12,
    marginTop: 2,
  },
  chartTooltipCard: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0C1736',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chartTooltipTitle: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  chartTooltipLine: {
    fontSize: 12,
    fontWeight: '700',
  },
  rankBarRow: {
    marginBottom: 12,
  },
  rankBarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rankBarLabel: {
    flex: 1,
    marginLeft: 8,
    color: '#3457D5',
    fontSize: 12,
    fontWeight: '700',
  },
  rankBarValue: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  rankBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#F1F2F7',
    overflow: 'hidden',
  },
  rankBarFill: {
    height: '100%',
    borderRadius: 999,
  },
});
