import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  getCalendarWeeks,
  calendarMonthNames,
  rhUser,
  rhUserInitials,
  AuthIdentityContext,
  ColaboradorPerfilContext,
  buildColaboradorProfileSummary,
  getInitials,
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
  fetchRhAdmissoesDetalhe,
  fetchRhDemissoesDetalhe,
  fetchRhTransferenciasDetalhe,
  fetchRhFolhaDetalhe,
  fetchRhFeriasDetalhe,
  fetchRhExperienciaDetalhe,
  fetchRhUnidades,
  fetchRhCargos,
  fetchRhSetores,
  updateRhColaborador,
  createRhColaborador,
  fetchRhBeneficios,
  updateRhBeneficios,
  fetchRhHistoricoContratacoes,
  createRhHistoricoContratacao,
  fetchAdminUsuarios,
  ApiError,
  type RhColaboradorRaw,
  type AdminUsuarioItem,
  type RhStats,
  type RhUnidadeItem,
  type RhTurnoverData,
  type RhDashboardResumo,
  type RhAdmissoesDetalhe,
  type RhDemissoesDetalhe,
  type RhTransferenciasDetalhe,
  type RhFolhaDetalhe,
  type RhFeriasDetalhe,
  type RhExperienciaDetalhe,
  type RhBeneficiosColaborador,
  type RhHistoricoContratacaoItem,
  fetchRhComunicados,
  createRhComunicado,
  type RhComunicadoItem,
  fetchColaboradorContracheques,
  type ColaboradorContrachequeItem,
  fetchColaboradorReembolsos,
  createColaboradorReembolso,
  type ColaboradorReembolsoItem,
  fetchColaboradorFerias,
  createColaboradorFerias,
  type ColaboradorFeriasItem,
  fetchRhDependentes,
  type RhDependenteItem,
  fetchRhPromocoes,
  type RhSalarioHistoricoItem,
  fetchRhPremiacoes,
  type RhPremiacaoItem,
  fetchRhTransferenciasColaborador,
  type RhTransferenciaColaboradorItem,
  createRhDependente,
  createRhPromocao,
  createRhPremiacao,
  createRhTransferencia,
  fetchRhDocumentos,
  type RhDocumentoItem,
  createRhDocumento,
  fetchRhDocumentoUrl,
  deleteRhDocumento,
  fetchAdmissaoConformidade,
  updateAdmissaoPrazo,
  type AdmissaoConformidadeDetalhe,
  type AdmissaoConformidadeLinha,
  fetchAdminGrupos,
  type AdminGrupoItem,
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
  // Opcionais: só vêm preenchidos quando o colaborador vem da API real
  // (mapRhColaboradorToEmployee) — os registros mock (rhEmployees, usados só
  // como fallback antes do fetch real chegar) não têm esses campos.
  emailPessoal?: string;
  emailCorporativo?: string;
  enderecoCep?: string;
  enderecoLogradouro?: string;
  enderecoNumero?: string;
  enderecoComplemento?: string;
  enderecoBairro?: string;
  enderecoCidade?: string;
  enderecoEstado?: string;
  contatoEmergenciaNome?: string;
  contatoEmergenciaTelefone?: string;
  rg?: string;
  orgaoEmissorRg?: string;
  ufRg?: string;
  cnh?: string;
  ctps?: string;
  pisPasep?: string;
  dataNascimentoLabel?: string;
  sexo?: string;
  tipoSanguineo?: string;
  estadoCivil?: string;
  grauInstrucao?: string;
  nacionalidade?: string;
  naturalidade?: string;
  nomeMae?: string;
  nomePai?: string;
  telefoneFixo?: string;
  postoTrabalho?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: string;
  pixTipo?: string;
  pixChave?: string;
  tamanhoCamisa?: string;
  tamanhoCalca?: string;
  tamanhoCalcado?: string;
  demissaoLabel?: string;
  // Vínculo com o login do portal (rh_colaboradores.profile_id, liberado
  // pela Lovable em 03/08/2026). null/'' = sem login vinculado ainda.
  profileId?: string | null;
};

type TransferStatus = 'pendente' | 'aprovada' | 'efetivada';

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

// Normaliza um valor cru do banco (ex.: "masculino") pra bater com o label
// exibido no picker (ex.: "Masculino"), comparando sem acento/maiúscula. Se
// não reconhecer nenhuma opção, devolve a string crua capitalizada em vez de
// esconder o dado ou inventar um valor — mantém honesto mesmo pra enums que
// a gente não confirmou 100% com o Lovable ainda.
function normalizeToOption(raw: string | null | undefined, options: string[]): string {
  const value = (raw ?? '').trim();
  if (!value) return '';
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const target = normalize(value);
  const found = options.find((option) => normalize(option) === target);
  if (found) return found;
  return value.charAt(0).toUpperCase() + value.slice(1);
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

// Máscara progressiva de CPF (000.000.000-00) aplicada enquanto o usuário
// digita. Compartilhada entre EditarCadastroModal e DadosPessoaisModal.
function formatCpfInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 11);
  let result = digits;
  if (digits.length > 9) {
    result = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  } else if (digits.length > 6) {
    result = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  } else if (digits.length > 3) {
    result = `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  return result;
}

function mapRhColaboradorToEmployee(row: RhColaboradorRaw, empresaNomeById: Map<string, string>): Employee {
  const salarioRaw = row.salario_base;
  const salario = typeof salarioRaw === 'number' ? salarioRaw : Number(salarioRaw ?? 0) || 0;
  const empresaId = row.empresa_id as string | undefined;

  return {
    id: row.id,
    fullName: row.nome_completo ?? '(sem nome)',
    role: row.cargo ?? '—',
    unit: (empresaId && empresaNomeById.get(empresaId)) || row.posto_trabalho || '—',
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
    emailPessoal: row.email_pessoal ?? '',
    emailCorporativo: row.email_corporativo ?? '',
    enderecoCep: row.endereco_cep ?? '',
    enderecoLogradouro: row.endereco_logradouro ?? '',
    enderecoNumero: row.endereco_numero ?? '',
    enderecoComplemento: row.endereco_complemento ?? '',
    enderecoBairro: row.endereco_bairro ?? '',
    enderecoCidade: row.endereco_cidade ?? '',
    enderecoEstado: row.endereco_estado ?? '',
    contatoEmergenciaNome: row.contato_emergencia_nome ?? '',
    contatoEmergenciaTelefone: row.contato_emergencia_telefone ?? '',
    rg: row.rg ?? '',
    orgaoEmissorRg: row.orgao_rg ?? '',
    ufRg: row.uf_rg ?? '',
    cnh: row.carteira_habilitacao ?? '',
    ctps: row.carteira_trabalho ?? '',
    pisPasep: row.pis_pasep ?? '',
    dataNascimentoLabel: row.data_nascimento ? formatDateOnlyBR(row.data_nascimento) : '',
    sexo: normalizeToOption(row.sexo, rhSexoOptions),
    tipoSanguineo: normalizeToOption(row.tipo_sanguineo, rhTipoSanguineoOptions),
    estadoCivil: normalizeToOption(row.estado_civil, rhEstadoCivilOptions),
    grauInstrucao: normalizeToOption(row.grau_instrucao, rhGrauInstrucaoOptions),
    nacionalidade: normalizeToOption(row.nacionalidade, rhNacionalidadeOptions),
    naturalidade: row.naturalidade ?? '',
    nomeMae: row.nome_mae ?? '',
    nomePai: row.nome_pai ?? '',
    telefoneFixo: row.telefone ?? '',
    postoTrabalho: row.posto_trabalho ?? '',
    banco: row.banco ?? '',
    agencia: row.agencia ?? '',
    conta: row.conta ?? '',
    tipoConta: row.tipo_conta ?? '',
    pixTipo: row.pix_tipo ?? '',
    pixChave: row.pix ?? '',
    tamanhoCamisa: row.tamanho_camisa ?? '',
    tamanhoCalca: row.tamanho_calca ?? '',
    tamanhoCalcado: row.tamanho_calcado ?? '',
    demissaoLabel: row.data_demissao ? formatDateOnlyBR(row.data_demissao) : '',
    profileId: (row.profile_id as string | null | undefined) ?? null,
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

const rhSexoOptions: string[] = ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'];

const rhTipoSanguineoOptions: string[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const rhGrauInstrucaoOptions: string[] = [
  'Fundamental incompleto',
  'Fundamental completo',
  'Médio incompleto',
  'Médio completo',
  'Técnico',
  'Superior incompleto',
  'Superior completo',
  'Pós-graduação',
  'Mestrado',
  'Doutorado',
];

// Não confirmado por print do web — lista padrão razoável de estado civil.
const rhEstadoCivilOptions: string[] = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável'];

const rhNacionalidadeOptions: string[] = ['Brasileira', 'Estrangeira'];

// Enums reais do Postgres (rh_sexo, rh_estado_civil) confirmados pelo
// Lovable em 29/07/2026 — o valor exibido no app é em português com
// maiúscula/acento (rhSexoOptions/rhEstadoCivilOptions acima), mas a coluna
// grava um slug em snake_case. Best-effort: se o slug abaixo estiver errado
// pro enum real, o PATCH falha com 400 e a mensagem original do Postgres
// aparece no Alert (nunca falha silenciosamente).
const rhSexoLabelToEnum: Record<string, string> = {
  Masculino: 'masculino',
  Feminino: 'feminino',
  Outro: 'outro',
  'Prefiro não informar': 'prefiro_nao_informar',
};

const rhEstadoCivilLabelToEnum: Record<string, string> = {
  'Solteiro(a)': 'solteiro',
  'Casado(a)': 'casado',
  'Divorciado(a)': 'divorciado',
  'Viúvo(a)': 'viuvo',
  'União estável': 'uniao_estavel',
};

const rhDocumentTypeOptions: string[] = [
  'RG',
  'CPF',
  'CNH',
  'Título de eleitor',
  'Certidão de reservista',
  'Comprovante de residência',
  'ASO',
  'Contrato',
  'Outro',
];

const rhDesligamentoMotivos: string[] = [
  'Sem justa causa',
  'Justa causa',
  'Pedido de demissão',
  'Fim do contrato de experiência',
];

const rhPromocaoMotivos: string[] = ['Promoção', 'Reajuste salarial', 'Mérito', 'Equiparação'];

// Enum motivo de rh_salario_historico confirmado pela Lovable em 11/08/2026
// (admissao, dissidio, promocao, merito, equiparacao, reajuste, outro,
// enquadramento, correcao) — mapeando só as opções que a tela oferece.
const rhPromocaoMotivoLabelToEnum: Record<string, string> = {
  Promoção: 'promocao',
  'Reajuste salarial': 'reajuste',
  Mérito: 'merito',
  Equiparação: 'equiparacao',
};

const rhRateioOptions: string[] = ['Proporcional (dias)', 'Integral no mês', 'Próximo mês'];

// Enums de rh_transferencias confirmados pela Lovable em 11/08/2026.
const rhTransferMotivoLabelToEnum: Record<string, string> = {
  Realocação: 'realocacao',
  'Solicitação do colaborador': 'pedido_colaborador',
  'Necessidade operacional': 'necessidade_operacional',
  Outro: 'outro',
};
// rateio_folha só tem 3 valores (proporcional/origem_mes_todo/destino_mes_todo)
// pra 3 opções de tela — "Integral no mês" = fica tudo no destino,
// "Próximo mês" = mês corrente fica todo com a origem, muda a partir do
// próximo. Ajustar aqui se a Lovable confirmar semântica diferente.
const rhRateioLabelToEnum: Record<string, string> = {
  'Proporcional (dias)': 'proporcional',
  'Integral no mês': 'destino_mes_todo',
  'Próximo mês': 'origem_mes_todo',
};

// A tela de Transferências (RHTransferenciasScreen) agora busca dados reais
// via fetchRhTransferenciasDetalhe (rh_transferencias) — o mock antigo
// (lista fixa vazia) foi removido.

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

function buildLinePoints(
  values: number[],
  width: number,
  height: number,
  padding = 6,
  sharedMin?: number,
  sharedMax?: number
) {
  // sharedMin/sharedMax permitem normalizar MÚLTIPLAS séries na MESMA escala
  // (mesmo range de valor -> mesmo range de altura). Sem isso, cada série era
  // normalizada pelo próprio min/max (ver RHMultiLineChart abaixo) e uma série
  // sempre menor (ex.: Voluntário, que é só uma parte de Geral) podia aparecer
  // visualmente MAIOR que a outra, já que cada uma preenchia o gráfico inteiro
  // com sua própria variação — dando a entender o contrário do valor real.
  const max = sharedMax !== undefined ? sharedMax : Math.max(...values);
  const min = sharedMin !== undefined ? sharedMin : Math.min(...values);
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

      <View style={rhStyles.chartAxisLabelsRow}>
        {labels.map((label, index) => (
          <Text key={`${label}-${index}`} style={rhStyles.chartAxisLabelText} numberOfLines={1}>
            {label}
          </Text>
        ))}
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
  // Escala COMPARTILHADA entre todas as séries (ex.: Geral x Voluntário) —
  // sem isso cada linha era normalizada pelo próprio min/max e a comparação
  // visual de altura não refletia a comparação real de valor (ver comentário
  // em buildLinePoints).
  const allValues = series.flatMap((line) => line.values);
  const sharedMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const sharedMax = allValues.length > 0 ? Math.max(...allValues) : 1;
  const seriesPoints = series.map((line) => buildLinePoints(line.values, width, height, 6, sharedMin, sharedMax));

  // Ordem de desenho: a linha com o valor médio MAIOR é desenhada por último
  // (fica por cima). Antes a ordem era sempre a mesma em que a série chegava
  // no array (ex.: Geral sempre atrás de Voluntário), o que dava a entender
  // visualmente que a linha de trás (mais fina/coberta) era a menor, mesmo
  // quando na verdade ela tinha o valor maior — ex.: Geral é sempre ≥
  // Voluntário (voluntário é só uma parte do geral), mas ficava escondida
  // atrás da linha de Voluntário.
  const drawOrder = series
    .map((line, index) => ({
      index,
      avg: line.values.length > 0 ? line.values.reduce((sum, v) => sum + v, 0) / line.values.length : 0,
    }))
    .sort((a, b) => a.avg - b.avg);

  return (
    <View>
      <View style={rhStyles.chartTouchWrap}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {drawOrder.map(({ index }) => {
            const line = series[index];
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
// Turnover, Admissões e Demissões agora são reais (fetchRhTurnover/
// fetchRhAdmissoesDetalhe/fetchRhDemissoesDetalhe, calculados no af360-api
// a partir de rh_colaboradores + empresas) — os mocks antigos foram removidos.

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
  const [data, setData] = useState<RhAdmissoesDetalhe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedAdmissoesHistIndex, setSelectedAdmissoesHistIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchRhAdmissoesDetalhe({ granularity: filter.granularity, year: filter.year, month: filter.month })
      .then((result) => {
        if (isMounted) setData(result);
      })
      .catch((err) => {
        if (isMounted) setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar admissões.');
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
        <Text style={rhStyles.detailNoteText}>
          {isLoading ? 'Carregando admissões...' : errorMessage ?? 'Sem dados.'}
        </Text>
      </RHDetailModal>
    );
  }

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
  const [data, setData] = useState<RhDemissoesDetalhe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDemissoesHistIndex, setSelectedDemissoesHistIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchRhDemissoesDetalhe({ granularity: filter.granularity, year: filter.year, month: filter.month })
      .then((result) => {
        if (isMounted) setData(result);
      })
      .catch((err) => {
        if (isMounted) setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar demissões.');
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
        <Text style={rhStyles.detailNoteText}>
          {isLoading ? 'Carregando demissões...' : errorMessage ?? 'Sem dados.'}
        </Text>
      </RHDetailModal>
    );
  }

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
  const { identity } = useContext(AuthIdentityContext);
  const { perfil } = useContext(ColaboradorPerfilContext);
  const greetingFirstName = (perfil?.nome_completo || identity?.fullName || '').trim().split(' ')[0] || 'você';

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
          <Text style={rhStyles.heroGreeting}>Bom dia, {greetingFirstName}</Text>
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
              <Text style={rhStyles.statGridValue}>{resumo.engajamento.aderencia ?? '0%'}</Text>
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
  const { identity } = useContext(AuthIdentityContext);
  const { perfil, isLoading, errorMessage } = useContext(ColaboradorPerfilContext);
  const hasMultiplePanels = (identity?.availableRoles?.length ?? 0) > 1;
  const colaboradorId = identity?.colaboradorId ?? null;

  const displayName = perfil?.nome_completo || identity?.fullName || '—';
  const displayRoleAndUnit =
    [perfil?.cargo, perfil?.posto_trabalho].filter((part): part is string => Boolean(part)).join(' · ') ||
    'Recursos Humanos';
  const initials = getInitials(perfil?.nome_completo || identity?.fullName || 'RH');
  const rhProfileFields = buildColaboradorProfileSummary(perfil, identity);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={initials} variant="rh" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#1B6E3A', '#2A9D51']} style={styles.directorProfileHero}>
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

// ---------- Shared form pickers ----------

function RHSimplePickerModal({
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
  // inline=true: NÃO usa <Modal> nativo — renderiza como overlay absoluto por
  // cima do conteúdo (via prop `overlay` de RHSmallModal). Necessário quando
  // o picker é aberto de DENTRO de outro <Modal> já visível (ex.: Dados
  // Pessoais): dois <Modal> nativos empilhados podem fazer o segundo não
  // receber toque em alguns aparelhos (abre "atrás" do primeiro, então o
  // usuário vê que nada acontece ao tocar). Fora desse caso, mantém o
  // comportamento antigo (Modal nativo próprio).
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
  );

  if (inline) {
    return <View style={rhStyles.inlinePickerLayer}>{content}</View>;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

// Converte "dd/mm/aaaa" -> "aaaa-mm-dd" (formato date-only do Postgres) via
// regex direto, sem passar por Date (evita qualquer risco de fuso horário).
// Retorna null se vazio/inválido — quem chama decide se manda null (limpar
// campo) ou omite a chave do body.
function brDateLabelToIso(label: string | undefined | null): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((label ?? '').trim());
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

// Parseia "dd/mm/aaaa" -> Date. Retorna null se vazio/inválido.
function parseDateBR(label: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(label?.trim() ?? '');
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

// Calendário 100% JS/RN puro (sem lib nativa nova — o app roda via Expo Go).
// Reaproveita a lógica/estilos já usados pelo MiniCalendarModal em App.tsx
// (getCalendarWeeks/calendarMonthNames/styles.datePickerCard e afins).
function RHDatePickerModal({
  visible,
  title,
  value,
  onSelect,
  onClose,
  inline,
}: {
  visible: boolean;
  title: string;
  value: string;
  onSelect: (dateLabel: string) => void;
  onClose: () => void;
  // Ver comentário em RHSimplePickerModal — mesmo motivo.
  inline?: boolean;
}) {
  const today = new Date();
  const selectedDate = parseDateBR(value);
  const [viewYear, setViewYear] = useState((selectedDate ?? today).getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState((selectedDate ?? today).getMonth());

  useEffect(() => {
    if (visible) {
      const base = parseDateBR(value) ?? new Date();
      setViewYear(base.getFullYear());
      setViewMonthIndex(base.getMonth());
    }
  }, [visible, value]);

  // Só depois de TODOS os hooks (useState/useEffect acima) — nunca antes,
  // senão a ordem de hooks muda entre renders (inline+fechado pula os hooks,
  // inline+aberto não pula) e o React quebra com "Expected static flag was
  // missing" ao alternar visible.
  if (inline && !visible) {
    return null;
  }

  const weeks = getCalendarWeeks(viewYear, viewMonthIndex);
  const monthLabel = `${calendarMonthNames[viewMonthIndex]} ${viewYear}`;

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

  const content = (
      <Pressable style={styles.datePickerBackdrop} onPress={onClose}>
        <Pressable style={styles.datePickerCard} onPress={() => {}}>
          <Text style={styles.simpleListTitle}>{title}</Text>
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
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayLabel, index) => (
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
                  !!selectedDate &&
                  viewYear === selectedDate.getFullYear() &&
                  viewMonthIndex === selectedDate.getMonth() &&
                  day.dayNumber === selectedDate.getDate();

                return (
                  <Pressable
                    key={day.key}
                    style={styles.calendarDayCell}
                    disabled={!day.isCurrentMonth}
                    onPress={() => {
                      onSelect(formatDateBR(new Date(viewYear, viewMonthIndex, day.dayNumber)));
                      onClose();
                    }}
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
  );

  if (inline) {
    return <View style={rhStyles.inlinePickerLayer}>{content}</View>;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

function RHSelectField({
  label,
  value,
  placeholder = 'Selecione...',
  onPress,
  required,
  icon = 'chevron-down',
}: {
  label: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
  required?: boolean;
  icon?: keyof typeof Feather.glyphMap;
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
        <Feather name={icon} size={18} color="#7A8299" />
      </Pressable>
    </>
  );
}

function RHFilterPill({
  label,
  onPress,
  prefix,
  compact,
}: {
  label: string;
  onPress: () => void;
  // Mostra "Prefixo: valor" (ex.: "Unidade: Todas") em vez de só o valor —
  // usado quando vários pills ficam juntos e "Todas"/"Todos" sozinho não diz
  // a que filtro pertence.
  prefix?: string;
  // Pill mais enxuto (menos padding, fonte menor) — pra fileiras com 3+
  // filtros juntos, onde o tamanho padrão deixa muito espaçado/quebra linha.
  compact?: boolean;
}) {
  return (
    <Pressable style={[rhStyles.filterPill, compact ? rhStyles.filterPillCompact : null]} onPress={onPress}>
      <Text
        style={[rhStyles.filterPillText, compact ? rhStyles.filterPillTextCompact : null]}
        numberOfLines={1}
      >
        {prefix ? `${prefix}: ${label}` : label}
      </Text>
      <Feather name="chevron-down" size={compact ? 12 : 14} color="#5E667D" />
    </Pressable>
  );
}

// Campo de filtro "de formulário" (label em cima + caixa cheia com valor e
// seta) — pra grupos de 3+ filtros juntos, onde os pills um do lado do
// outro ficam apertados/soltos na tela. Usa a mesma largura toda (100%).
function RHFilterSelectField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={rhStyles.filterFieldBlock}>
      <Text style={rhStyles.filterFieldLabel}>{label}</Text>
      <Pressable style={rhStyles.filterFieldSelect} onPress={onPress}>
        <Text style={rhStyles.filterFieldSelectText} numberOfLines={1}>
          {value}
        </Text>
        <Feather name="chevron-down" size={16} color="#5E667D" />
      </Pressable>
    </View>
  );
}

// ---------- Colaboradores ----------

// Remove tudo que não for dígito e formata como 000.000.000-00, cortando em
// 11 dígitos. Usado no campo de CPF para impedir letras e manter a máscara
// enquanto o usuário digita.
function formatCpfMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 11);
  let result = part1;
  if (part2) result += `.${part2}`;
  if (part3) result += `.${part3}`;
  if (part4) result += `-${part4}`;
  return result;
}

// Traduz erros crus do backend (ex: "forbidden: master required", "Lovable
// API respondeu 404") pra mensagens que dá pra entender, em vez do texto
// técnico direto. Compartilhada por todos os formulários de RH que fazem
// PATCH em rh_colaboradores (Dados Pessoais, Contrato, Encargos, Benefícios,
// vínculo de login etc.) — antes era redeclarada dentro de um único
// componente e outros componentes que também precisavam dela (ex.: o modal
// de vincular login) quebravam em runtime com "showRhSaveError is not
// defined".
function showRhSaveError(err: unknown, fallback: string) {
  const raw = err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback;
  const normalized = raw.toLowerCase();

  if (normalized.includes('forbidden') && normalized.includes('master')) {
    Alert.alert(
      'Precisa de conta master',
      'Essa ação só pode ser feita por uma conta marcada como "master". A conta logada agora não tem esse selo.'
    );
    return;
  }

  if (normalized.includes('404')) {
    Alert.alert(
      'Ainda não disponível no servidor',
      'O servidor não reconheceu essa ação agora (erro 404) — provavelmente a atualização mais recente ainda não foi publicada. Tente de novo em alguns minutos; se continuar, avise quem cuida do backend.'
    );
    return;
  }

  Alert.alert('Não foi possível salvar', raw);
}

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
  cargoOptions,
  unidadeOptions,
  unidadesReais,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  cargoOptions: string[];
  unidadeOptions: string[];
  unidadesReais: RhUnidadeItem[];
}) {
  const [form, setForm] = useState<NovoColaboradorForm>(emptyNovoColaboradorForm);
  const [isCargoPickerOpen, setIsCargoPickerOpen] = useState(false);
  const [isUnidadePickerOpen, setIsUnidadePickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(emptyNovoColaboradorForm);
      setIsSaving(false);
    }
  }, [visible]);

  // POST real em rh_colaboradores — endpoint confirmado pelo Lovable em
  // 10/08/2026 (ver createRhColaborador em api.ts). Obrigatórios lá:
  // nome_completo e empresa_id (por isso "Unidade" é obrigatória no form —
  // é o campo que resolve pra empresa_id).
  const handleSubmit = () => {
    if (!form.fullName.trim() || !form.unit.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha ao menos o nome completo e a unidade.');
      return;
    }

    const empresa = unidadesReais.find((item) => item.nome === form.unit);
    if (!empresa) {
      Alert.alert('Unidade inválida', 'Selecione uma unidade da lista.');
      return;
    }

    setIsSaving(true);
    const cpfDigits = form.cpf.replace(/\D/g, '');
    const body: Record<string, unknown> = {
      nome_completo: form.fullName.trim(),
      empresa_id: empresa.id,
      cpf: cpfDigits || undefined,
      matricula: form.registration.trim() || undefined,
      cargo: form.role || undefined,
      data_admissao: brDateLabelToIso(form.admissionLabel) ?? undefined,
    };

    createRhColaborador(body)
      .then((result) => {
        if (!result.ok) {
          const existenteLabel = result.existente
            ? `${result.existente.nome_completo} (${result.existente.status})`
            : 'outro colaborador';
          Alert.alert(
            'CPF já cadastrado',
            `${result.message}\n\nColaborador existente: ${existenteLabel}. Procure pelo nome na lista em vez de cadastrar de novo.`
          );
          return;
        }
        const empresaNomeById = new Map(unidadesReais.map((item) => [item.id, item.nome]));
        onSave(mapRhColaboradorToEmployee(result.data, empresaNomeById));
      })
      .catch((err) => showRhSaveError(err, 'Não foi possível cadastrar o colaborador.'))
      .finally(() => setIsSaving(false));
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={[styles.requestModalHeader, { paddingTop: 4 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.requestModalTitle, { lineHeight: 26 }]}>Novo colaborador</Text>
                <Text style={rhStyles.modalSubtitle}>Cadastro rápido. Você pode completar os dados depois.</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                    onChangeText={(text) => setForm((current) => ({ ...current, cpf: formatCpfMask(text) }))}
                    placeholder="000.000.000-00"
                    placeholderTextColor="#A7AEC2"
                    keyboardType="number-pad"
                    maxLength={14}
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

              <RHSelectField
                label="Data de admissão"
                value={form.admissionLabel}
                placeholder="Selecione a data"
                onPress={() => setIsDatePickerOpen(true)}
                icon="calendar"
              />

              <Pressable
                style={[rhStyles.primaryButtonGreen, styles.spacingTop, isSaving ? { opacity: 0.6 } : null]}
                onPress={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Cadastrar</Text>
                )}
              </Pressable>
            </ScrollView>

            <RHSimplePickerModal
              visible={isCargoPickerOpen}
              title="Cargo"
              options={cargoOptions}
              selectedValue={form.role}
              onSelect={(value) => setForm((current) => ({ ...current, role: value }))}
              onClose={() => setIsCargoPickerOpen(false)}
              inline
            />
            <RHSimplePickerModal
              visible={isUnidadePickerOpen}
              title="Unidade"
              options={unidadeOptions}
              selectedValue={form.unit}
              onSelect={(value) => setForm((current) => ({ ...current, unit: value }))}
              onClose={() => setIsUnidadePickerOpen(false)}
              inline
            />
            <RHDatePickerModal
              visible={isDatePickerOpen}
              title="Data de admissão"
              value={form.admissionLabel}
              onSelect={(dateLabel) => setForm((current) => ({ ...current, admissionLabel: dateLabel }))}
              onClose={() => setIsDatePickerOpen(false)}
              inline
            />
          </View>
        </View>
      </Modal>
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
  const [unidadesReais, setUnidadesReais] = useState<RhUnidadeItem[]>([]);
  const [cargosReais, setCargosReais] = useState<{ id: string; nome: string }[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 7;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    Promise.all([fetchRhColaboradores(), fetchRhStats(), fetchRhUnidades(), fetchRhCargos()])
      .then(([rows, statsResult, unidadesResult, cargosResult]) => {
        if (!isMounted) return;
        const empresaNomeById = new Map<string, string>();
        unidadesResult.forEach((unidade) => {
          if (unidade.id && unidade.nome) empresaNomeById.set(unidade.id, unidade.nome);
        });
        // Alfabética (já vem assim do backend, order: nome_completo:asc), mas
        // desligados sempre por último — sort é estável, então dentro de
        // cada grupo (ativos+demais / desligados) a ordem alfabética original
        // é preservada.
        const employeesSorted = rows
          .map((row) => mapRhColaboradorToEmployee(row, empresaNomeById))
          .sort((a, b) => (a.status === 'desligado' ? 1 : 0) - (b.status === 'desligado' ? 1 : 0));
        setEmployees(employeesSorted);
        setStats(statsResult);
        setUnidadesReais(unidadesResult);
        setCargosReais(cargosResult);
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
    return [
      'Todas as unidades',
      ...unidadesReais.map((unidade) => unidade.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    ];
  }, [unidadesReais]);
  const unidadeOptions = useMemo(
    () => unidadesReais.map((unidade) => unidade.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [unidadesReais]
  );
  const cargoOptions = useMemo(
    () => cargosReais.map((cargo) => cargo.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [cargosReais]
  );

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
    if (!selectedImportFile) return;
    Alert.alert(
      'Importação ainda não disponível',
      'A importação em lote depende de um endpoint de escrita no Lovable que ainda não está liberado. Assim que estiver disponível, colaboradores com CPF já cadastrado serão atualizados e os novos serão inseridos — nada será substituído.'
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
        cargoOptions={cargoOptions}
        unidadeOptions={unidadeOptions}
        unidadesReais={unidadesReais}
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
  | 'desligamento'
  | 'acessoLogin';

// "Acesso ao Portal" (acessoLogin) foi removido do grid a pedido da Rayanne
// em 10/08/2026 — não existe no web, só no app. O componente que vincula/
// desvincula login (LinkLoginModal) e o QuickActionKey continuam existindo
// no código, só não têm mais um botão que os acione.
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
  overlay,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  // Conteúdo extra renderizado por CIMA do card (ex.: os pickers de
  // Sexo/Tipo sanguíneo/etc. do Dados Pessoais) — precisa estar DENTRO do
  // mesmo <Modal> nativo (não como outro <Modal> separado empilhado em
  // cima), senão em alguns aparelhos o segundo modal nativo não recebe toque
  // corretamente (abre "atrás" do primeiro). Ver RHSimplePickerModal/
  // RHDatePickerModal com inline=true.
  overlay?: ReactNode;
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
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          {overlay}
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

          <ScrollView style={rhStyles.importEmployeesScroll} showsVerticalScrollIndicator={false}>
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
          </ScrollView>

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

const rhGrauParentescoOptions: string[] = [
  'Filho',
  'Enteado',
  'Enteada',
  'Cônjuge',
  'Companheiro(a)',
  'Pai',
  'Mãe',
  'Avô',
  'Avó',
  'Menor sob guarda',
  'Irmão',
  'Irmã',
  'Neto',
  'Neta',
  'Outro',
];

// Enum grau_parentesco confirmado pela Lovable em 11/08/2026.
const rhGrauParentescoLabelToEnum: Record<string, string> = {
  Filho: 'filho',
  Enteado: 'enteado',
  Enteada: 'enteada',
  Cônjuge: 'conjuge',
  'Companheiro(a)': 'companheiro',
  Pai: 'pai',
  Mãe: 'mae',
  Avô: 'avo',
  Avó: 'ava',
  'Menor sob guarda': 'menor_guarda',
  Irmão: 'irmao',
  Irmã: 'irma',
  Neto: 'neto',
  Neta: 'neta',
  Outro: 'outro',
};

function mapRhDependenteToItem(raw: RhDependenteItem): RHDependentItem {
  return {
    id: raw.id,
    fullName: raw.nome ?? '',
    cpf: raw.cpf ?? '',
    birthDate: formatDateOnlyBR(raw.data_nascimento),
    kinship: raw.grau_parentesco ?? raw.parentesco ?? '',
    universityStudent: !!raw.estudante_universitario,
    disabled: !!raw.incapacitado,
    active: raw.ativo !== false,
    notes: raw.observacao ?? '',
  };
}

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

const rhTipoContratoOptions: string[] = ['CLT', 'PJ', 'Estagiário', 'Jovem Aprendiz', 'Temporário', 'Terceirizado'];

const rhMotivoDesligamentoOptions: string[] = [
  '—',
  'Pedido de demissão',
  'Dispensa sem justa causa',
  'Dispensa com justa causa',
  'Fim de contrato de experiência',
  'Fim de contrato por prazo',
  'Acordo entre as partes',
  'Aposentadoria',
  'Falecimento',
  'Outro',
];

const rhJornadaTipoOptions: string[] = [
  '— Não definido —',
  '44h semanais',
  '40h semanais',
  '36h semanais',
  '30h semanais',
  'Escala 12×36',
  'Escala personalizada',
];

const rhInsalubridadeOptions: string[] = ['Nenhum', 'Mínimo (10% SM)', 'Médio (20% SM)', 'Máximo (40% SM)'];

// Mesmo esquema de best-effort label -> slug do enum real (rh_tipo_contrato,
// rh_regime_jornada default '44h', rh_grau_insalubridade default 'nenhum') —
// ver comentário em rhSexoLabelToEnum acima.
const rhTipoContratoLabelToEnum: Record<string, string> = {
  CLT: 'clt',
  PJ: 'pj',
  Estagiário: 'estagiario',
  'Jovem Aprendiz': 'jovem_aprendiz',
  Temporário: 'temporario',
  Terceirizado: 'terceirizado',
};

const rhRegimeJornadaLabelToEnum: Record<string, string> = {
  '44h semanais': '44h',
  '40h semanais': '40h',
  '36h semanais': '36h',
  '30h semanais': '30h',
  'Escala 12×36': '12x36',
  'Escala personalizada': 'personalizada',
};

const rhGrauInsalubridadeLabelToEnum: Record<string, string> = {
  Nenhum: 'nenhum',
  'Mínimo (10% SM)': 'minimo',
  'Médio (20% SM)': 'medio',
  'Máximo (40% SM)': 'maximo',
};

const rhModeloJornadaOptions: string[] = [
  '— Sem modelo vinculado —',
  'Comercial 08h às 16h20',
  'Comercial 08h às 17h',
  'Comercial 08h às 17h45',
  'Escala 12×36 - 05h às 17h',
  'Escala 12×36 - 06h às 18h',
  'Escala 12×36 - 08h às 20h',
  'Escala 12×36 - 09h às 21h',
  'Escala 12×36 - 10h às 22h',
  'Escala 12×36 - 11h às 23h',
  'Escala 12×36 - 12h às 00h',
  'Escala 12×36 - 18h às 06h',
  'Horário por Escala',
  'Jovem Aprendiz - 13h às 17h',
  'Jovem Aprendiz - 4h',
  'Turno 06h às 14h',
];

// Máscara progressiva de moeda BRL (ex.: "1621" -> "1.621,00" enquanto digita
// os centavos da direita pra esquerda, igual a maioria dos apps bancários).
function formatCurrencyInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (!digits) return '';
  const cents = digits.padStart(3, '0');
  const intPart = cents.slice(0, -2).replace(/^0+(?=\d)/, '');
  const decimalPart = cents.slice(-2);
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withThousands},${decimalPart}`;
}

// Inverso de formatCurrencyInput: "1.234,56" -> 1234.56 (number, pra mandar
// pro backend). String vazia/só zero -> 0.
function parseCurrencyBRToNumber(text: string): number {
  const normalized = text.replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

// Lista de horários de 30 em 30 minutos (00:00 a 23:30) pros seletores de
// Entrada/Saída/Almoço — pura JS/RN, sem lib de time-picker nativa nova.
const rhTimeOptions: string[] = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${minute}`;
});

function DadosPessoaisModal({
  visible,
  employee,
  onClose,
  cargoOptions,
  setorOptions,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
  cargoOptions: string[];
  setorOptions: string[];
}) {
  const [activeTab, setActiveTab] = useState<DadosPessoaisTab>('pessoais');
  const [dependents, setDependents] = useState<RHDependentItem[]>([]);
  const [isLoadingDependents, setIsLoadingDependents] = useState(false);
  const [dependentsError, setDependentsError] = useState<string | null>(null);
  const [isDependentFormOpen, setIsDependentFormOpen] = useState(false);
  const [dependentForm, setDependentForm] = useState(createEmptyDependentForm());
  const [isDataNascimentoPickerOpen, setIsDataNascimentoPickerOpen] = useState(false);
  const [isSexoPickerOpen, setIsSexoPickerOpen] = useState(false);
  const [isTipoSanguineoPickerOpen, setIsTipoSanguineoPickerOpen] = useState(false);
  const [isEstadoCivilPickerOpen, setIsEstadoCivilPickerOpen] = useState(false);
  const [isGrauInstrucaoPickerOpen, setIsGrauInstrucaoPickerOpen] = useState(false);
  const [isNacionalidadePickerOpen, setIsNacionalidadePickerOpen] = useState(false);
  const [isDependentBirthDatePickerOpen, setIsDependentBirthDatePickerOpen] = useState(false);
  const [isKinshipPickerOpen, setIsKinshipPickerOpen] = useState(false);
  const [isContractTypePickerOpen, setIsContractTypePickerOpen] = useState(false);
  const [isContractCargoPickerOpen, setIsContractCargoPickerOpen] = useState(false);
  const [isContractSetorPickerOpen, setIsContractSetorPickerOpen] = useState(false);
  const [isJornadaTipoPickerOpen, setIsJornadaTipoPickerOpen] = useState(false);
  const [isInsalubridadePickerOpen, setIsInsalubridadePickerOpen] = useState(false);
  const [isEntradaPickerOpen, setIsEntradaPickerOpen] = useState(false);
  const [isSaidaPickerOpen, setIsSaidaPickerOpen] = useState(false);
  const [isAlmocoInicioPickerOpen, setIsAlmocoInicioPickerOpen] = useState(false);
  const [isAlmocoFimPickerOpen, setIsAlmocoFimPickerOpen] = useState(false);
  const [isScheduleModelPickerOpen, setIsScheduleModelPickerOpen] = useState(false);
  const [isAddPassagemOpen, setIsAddPassagemOpen] = useState(false);
  const [isPassagemAdmissaoPickerOpen, setIsPassagemAdmissaoPickerOpen] = useState(false);
  const [isPassagemDemissaoPickerOpen, setIsPassagemDemissaoPickerOpen] = useState(false);
  const [isPassagemMotivoPickerOpen, setIsPassagemMotivoPickerOpen] = useState(false);
  const [passagemForm, setPassagemForm] = useState({
    cargo: '',
    dataAdmissao: '',
    dataDemissao: '',
    motivoDesligamento: '',
    valorRescisao: '',
    observacoes: '',
  });
  const [form, setForm] = useState({
    cpf: formatCpfInput(employee.cpf),
    rg: employee.rg ?? '',
    orgaoEmissor: employee.orgaoEmissorRg ?? '',
    ufRg: employee.ufRg ?? '',
    cnh: employee.cnh ?? '',
    ctps: employee.ctps ?? '',
    pisPasep: employee.pisPasep ?? '',
    dataNascimento: employee.dataNascimentoLabel ?? '',
    sexo: employee.sexo ?? '',
    tipoSanguineo: employee.tipoSanguineo ?? '',
    estadoCivil: employee.estadoCivil ?? '',
    grauInstrucao: employee.grauInstrucao ?? '',
    nacionalidade: employee.nacionalidade ?? '',
    naturalidade: employee.naturalidade ?? '',
    nomeMae: employee.nomeMae ?? '',
    nomePai: employee.nomePai ?? '',
    telefoneFixo: employee.telefoneFixo ?? '',
    celular: employee.celular,
    emailPessoal: employee.emailPessoal ?? '',
    emailCorporativo: employee.emailCorporativo ?? '',
    cep: employee.enderecoCep ?? '',
    logradouro: employee.enderecoLogradouro ?? '',
    numero: employee.enderecoNumero ?? '',
    complemento: employee.enderecoComplemento ?? '',
    bairro: employee.enderecoBairro ?? '',
    cidade: employee.enderecoCidade ?? '',
    uf: employee.enderecoEstado ?? '',
    contatoEmergenciaNome: employee.contatoEmergenciaNome ?? '',
    contatoEmergenciaTelefone: employee.contatoEmergenciaTelefone ?? '',
  });
  const [contractForm, setContractForm] = useState({
    contractType: 'CLT',
    admissionDate: employee.admissionLabel,
    experienceEndDate: '02/10/2021',
    role: employee.role.toUpperCase(),
    setor: employee.setor.toUpperCase(),
    scheduleType: '44h semanais',
    scheduleEntrada: '06:00',
    scheduleSaida: '18:00',
    scheduleAlmocoInicio: '12:00',
    scheduleAlmocoFim: '13:00',
    scheduleModel: 'Escala 12×36 - 06h às 18h',
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
  const [isSavingPessoais, setIsSavingPessoais] = useState(false);
  const [isSavingContrato, setIsSavingContrato] = useState(false);
  const [isSavingEncargos, setIsSavingEncargos] = useState(false);
  const [isSavingBeneficios, setIsSavingBeneficios] = useState(false);
  const [passagensAnteriores, setPassagensAnteriores] = useState<RhHistoricoContratacaoItem[]>([]);
  const [isLoadingPassagens, setIsLoadingPassagens] = useState(false);
  const [isSavingPassagem, setIsSavingPassagem] = useState(false);

  const loadPassagensAnteriores = () => {
    setIsLoadingPassagens(true);
    return fetchRhHistoricoContratacoes(employee.id)
      .then((items) => setPassagensAnteriores(items))
      .catch(() => {
        // Silencioso: sem passagens anteriores ainda (ou erro de leitura), a
        // lista fica vazia em vez de travar a aba.
        setPassagensAnteriores([]);
      })
      .finally(() => setIsLoadingPassagens(false));
  };

  useEffect(() => {
    if (!visible) return;
    loadPassagensAnteriores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, employee.id]);

  // Lê rh_dependentes de verdade (leitura via GET /:id/dependentes, adicionada
  // em 11/08/2026). Escrita ainda não confirmada pela Lovable — handleSaveDependent
  // avisa isso em vez de fingir que salvou.
  const loadDependentes = () => {
    setIsLoadingDependents(true);
    setDependentsError(null);
    return fetchRhDependentes(employee.id)
      .then((items) => setDependents(items.map(mapRhDependenteToItem)))
      .catch((err) => setDependentsError(err instanceof Error ? err.message : 'Erro ao carregar dependentes.'))
      .finally(() => setIsLoadingDependents(false));
  };

  useEffect(() => {
    if (!visible) return;
    loadDependentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, employee.id]);

  // Lê rh_beneficios_colaborador de verdade (VR/VA/seguro de vida/plano de
  // saúde/odontológico, 1:1 via colaborador_id) quando o modal abre — antes
  // a aba Benefícios só mostrava os defaults do form (nunca lia do banco).
  useEffect(() => {
    if (!visible) return;
    let isActive = true;
    fetchRhBeneficios(employee.id)
      .then((beneficios) => {
        if (!isActive || !beneficios) return;
        const toValorDia = (value: number | null) =>
          typeof value === 'number' ? value.toFixed(2).replace('.', ',') : '0,00';
        setContractForm((current) => ({
          ...current,
          vrEnabled: Boolean(beneficios.vr_ativo),
          vrDailyValue: toValorDia(beneficios.vr_valor_dia),
          vaEnabled: Boolean(beneficios.va_ativo),
          vaDailyValue: toValorDia(beneficios.va_valor_dia),
          lifeInsuranceEnabled: Boolean(beneficios.seguro_vida_ativo),
          lifeInsuranceCarrier: beneficios.seguro_vida_seguradora ?? '',
          lifeInsuranceCoverage: toValorDia(beneficios.seguro_vida_cobertura),
          lifeInsuranceDiscount: toValorDia(beneficios.seguro_vida_desconto_mensal),
          healthPlanEnabled: Boolean(beneficios.plano_saude_ativo),
          healthPlanOperator: beneficios.plano_saude_operadora ?? '',
          healthPlanName: beneficios.plano_saude_plano ?? '',
          healthPlanPrimaryDiscount: toValorDia(beneficios.plano_saude_desconto_titular),
          healthPlanDependentDiscount: toValorDia(beneficios.plano_saude_desconto_dependente),
          dentalPlanEnabled: Boolean(beneficios.plano_odonto_ativo),
          dentalPlanOperator: beneficios.plano_odonto_operadora ?? '',
          dentalPlanName: beneficios.plano_odonto_plano ?? '',
          dentalPlanPrimaryDiscount: toValorDia(beneficios.plano_odonto_desconto_titular),
          dentalPlanDependentDiscount: toValorDia(beneficios.plano_odonto_desconto_dependente),
        }));
      })
      .catch(() => {
        // Silencioso: sem benefícios cadastrados ainda (ou erro de leitura),
        // a aba fica nos defaults em vez de travar o modal.
      });
    return () => {
      isActive = false;
    };
  }, [visible, employee.id]);

  // Checklist real de completude do cadastro (aba Pendências), calculado a
  // partir dos dados de verdade (employee/form/contractForm) — nada mocado.
  // "Crítico" marca os 9 campos considerados essenciais para folha/compliance
  // (os 8 campos-base de Identificação + PIS/PASEP), espelhando a referência
  // do web.
  const checklistGroups = useMemo(() => {
    const isFilled = (value?: string | number | null) => {
      if (typeof value === 'number') return value > 0;
      return Boolean(value && String(value).trim().length > 0);
    };

    const groups = [
      {
        id: 'identificacao',
        title: 'Identificação',
        items: [
          { label: 'Nome completo', filled: isFilled(employee.fullName), critical: true },
          { label: 'CPF', filled: isFilled(form.cpf), critical: true },
          { label: 'RG', filled: isFilled(form.rg), critical: true },
          { label: 'Órgão emissor (RG)', filled: isFilled(form.orgaoEmissor), critical: true },
          { label: 'UF (RG)', filled: isFilled(form.ufRg), critical: true },
          { label: 'Data de nascimento', filled: isFilled(form.dataNascimento), critical: true },
          { label: 'Sexo', filled: isFilled(form.sexo), critical: true },
          { label: 'Estado civil', filled: isFilled(form.estadoCivil), critical: true },
          { label: 'Nome da mãe', filled: isFilled(form.nomeMae), critical: false },
          { label: 'Naturalidade', filled: isFilled(form.naturalidade), critical: false },
          { label: 'Nacionalidade', filled: isFilled(form.nacionalidade), critical: false },
        ],
      },
      {
        id: 'contato',
        title: 'Contato',
        items: [
          { label: 'Celular', filled: isFilled(form.celular), critical: false },
          { label: 'E-mail pessoal', filled: isFilled(form.emailPessoal), critical: false },
          { label: 'E-mail corporativo', filled: isFilled(form.emailCorporativo), critical: false },
          { label: 'Contato de emergência (nome)', filled: isFilled(form.contatoEmergenciaNome), critical: false },
          {
            label: 'Contato de emergência (telefone)',
            filled: isFilled(form.contatoEmergenciaTelefone),
            critical: false,
          },
        ],
      },
      {
        id: 'endereco',
        title: 'Endereço',
        items: [
          { label: 'CEP', filled: isFilled(form.cep), critical: false },
          { label: 'Logradouro', filled: isFilled(form.logradouro), critical: false },
          { label: 'Número', filled: isFilled(form.numero), critical: false },
          { label: 'Bairro', filled: isFilled(form.bairro), critical: false },
          { label: 'Cidade', filled: isFilled(form.cidade), critical: false },
          { label: 'Estado', filled: isFilled(form.uf), critical: false },
        ],
      },
      {
        id: 'documentos',
        title: 'Documentos',
        items: [
          { label: 'PIS/PASEP', filled: isFilled(form.pisPasep), critical: true },
          { label: 'Carteira de trabalho', filled: isFilled(form.ctps), critical: false },
          { label: 'Carteira de habilitação', filled: isFilled(form.cnh), critical: false },
        ],
      },
      {
        id: 'contrato',
        title: 'Contrato',
        items: [
          { label: 'Empresa', filled: isFilled(employee.unit), critical: false },
          { label: 'Cargo', filled: isFilled(contractForm.role), critical: false },
          { label: 'Setor', filled: isFilled(contractForm.setor), critical: false },
          { label: 'Posto de trabalho', filled: isFilled(employee.postoTrabalho), critical: false },
          { label: 'Data de admissão', filled: isFilled(contractForm.admissionDate), critical: false },
          { label: 'Tipo de contrato', filled: isFilled(contractForm.contractType), critical: false },
          { label: 'Regime de jornada', filled: isFilled(contractForm.scheduleType), critical: false },
          {
            label: 'Horário de trabalho',
            filled: isFilled(contractForm.scheduleEntrada) && isFilled(contractForm.scheduleSaida),
            critical: false,
          },
          { label: 'Salário base', filled: isFilled(contractForm.baseSalary), critical: false },
        ],
      },
      {
        id: 'bancario',
        title: 'Bancário / PIX',
        items: [
          { label: 'Banco', filled: isFilled(employee.banco), critical: false },
          { label: 'Agência', filled: isFilled(employee.agencia), critical: false },
          { label: 'Conta', filled: isFilled(employee.conta), critical: false },
          { label: 'Tipo de conta', filled: isFilled(employee.tipoConta), critical: false },
          { label: 'PIX (tipo)', filled: isFilled(employee.pixTipo), critical: false },
          { label: 'PIX (chave)', filled: isFilled(employee.pixChave), critical: false },
        ],
      },
      {
        id: 'uniforme',
        title: 'Uniforme',
        items: [
          { label: 'Tamanho da camisa', filled: isFilled(employee.tamanhoCamisa), critical: false },
          { label: 'Tamanho da calça', filled: isFilled(employee.tamanhoCalca), critical: false },
          { label: 'Tamanho do calçado', filled: isFilled(employee.tamanhoCalcado), critical: false },
        ],
      },
    ];

    return groups.map((group) => ({
      ...group,
      filledCount: group.items.filter((item) => item.filled).length,
      totalCount: group.items.length,
    }));
  }, [employee, form, contractForm]);

  const checklistTotals = useMemo(() => {
    const allItems = checklistGroups.flatMap((group) => group.items);
    const totalFields = allItems.length;
    const filledFields = allItems.filter((item) => item.filled).length;
    const criticalItems = allItems.filter((item) => item.critical);
    const criticalTotal = criticalItems.length;
    const criticalFilled = criticalItems.filter((item) => item.filled).length;
    const percent = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
    return { totalFields, filledFields, criticalTotal, criticalFilled, percent };
  }, [checklistGroups]);

  // Aba Histórico: mostra a passagem real do colaborador (dados reais de
  // employee — cargo, admissão, status), sem inventar movimentações que não
  // existem no banco. "Passagens anteriores" (vínculos antigos na rede) vêm
  // de rh_historico_contratacoes de verdade (fetchRhHistoricoContratacoes) e
  // o formulário "Adicionar passagem anterior" grava via
  // createRhHistoricoContratacao — ver handleSalvarPassagemAnterior.
  const currentPassageStatusLabel =
    employee.status === 'desligado'
      ? 'Desligado'
      : employee.status === 'afastado'
        ? 'Afastado'
        : employee.status === 'ferias'
          ? 'Férias'
          : 'Ativo';
  const currentPassagePeriodLabel = employee.demissaoLabel
    ? `${employee.admissionLabel} → ${employee.demissaoLabel}`
    : `${employee.admissionLabel} → presente`;

  useEffect(() => {
    if (visible) {
      setActiveTab('pessoais');
      setForm((current) => ({
        ...current,
        cpf: formatCpfInput(employee.cpf),
        celular: employee.celular,
        rg: employee.rg ?? '',
        orgaoEmissor: employee.orgaoEmissorRg ?? '',
        ufRg: employee.ufRg ?? '',
        cnh: employee.cnh ?? '',
        ctps: employee.ctps ?? '',
        pisPasep: employee.pisPasep ?? '',
        dataNascimento: employee.dataNascimentoLabel ?? '',
        sexo: employee.sexo ?? '',
        tipoSanguineo: employee.tipoSanguineo ?? '',
        estadoCivil: employee.estadoCivil ?? '',
        grauInstrucao: employee.grauInstrucao ?? '',
        nacionalidade: employee.nacionalidade ?? '',
        naturalidade: employee.naturalidade ?? '',
        nomeMae: employee.nomeMae ?? '',
        nomePai: employee.nomePai ?? '',
        telefoneFixo: employee.telefoneFixo ?? '',
        emailPessoal: employee.emailPessoal ?? '',
        emailCorporativo: employee.emailCorporativo ?? '',
        cep: employee.enderecoCep ?? '',
        logradouro: employee.enderecoLogradouro ?? '',
        numero: employee.enderecoNumero ?? '',
        complemento: employee.enderecoComplemento ?? '',
        bairro: employee.enderecoBairro ?? '',
        cidade: employee.enderecoCidade ?? '',
        uf: employee.enderecoEstado ?? '',
        contatoEmergenciaNome: employee.contatoEmergenciaNome ?? '',
        contatoEmergenciaTelefone: employee.contatoEmergenciaTelefone ?? '',
      }));
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
  // Campos monetários (Valor por dia, Cobertura, Desconto mensal, Desc.
  // titular/dependente) — aplica a mesma máscara de moeda do Salário base,
  // o texto exibido tem prefixo "R$ " mas o state guarda só o número.
  const updateCurrencyField = (key: keyof typeof contractForm) => (text: string) =>
    setContractForm((current) => ({
      ...current,
      [key]: formatCurrencyInput(text.replace(/^R\$\s?/, '')),
    }));

  const saveSimpleAlert = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  // PATCH real em rh_colaboradores (endpoint confirmado pelo Lovable em
  // 29/07/2026 — ver af360-api/src/routes/colaboradores.js). Campos com enum
  // real no Postgres (sexo, estado_civil) usam o mapa label -> slug acima;
  // se o mapeamento estiver errado pro enum de verdade, o Postgres rejeita
  // com 400 e a mensagem original aparece no Alert (nunca finge sucesso).
  // Datas: só manda a chave se o valor for uma data completa e válida — texto
  // parcial/incompleto não sobrescreve o que já está salvo.
  const handleSalvarPessoais = () => {
    setIsSavingPessoais(true);
    const body: Record<string, unknown> = {
      cpf: form.cpf || null,
      rg: form.rg || null,
      orgao_rg: form.orgaoEmissor || null,
      uf_rg: form.ufRg || null,
      carteira_habilitacao: form.cnh || null,
      carteira_trabalho: form.ctps || null,
      pis_pasep: form.pisPasep || null,
      data_nascimento: brDateLabelToIso(form.dataNascimento) ?? undefined,
      sexo: rhSexoLabelToEnum[form.sexo] ?? undefined,
      tipo_sanguineo: form.tipoSanguineo || null,
      estado_civil: rhEstadoCivilLabelToEnum[form.estadoCivil] ?? undefined,
      grau_instrucao: form.grauInstrucao || null,
      nacionalidade: form.nacionalidade || null,
      naturalidade: form.naturalidade || null,
      nome_mae: form.nomeMae || null,
      nome_pai: form.nomePai || null,
      telefone: form.telefoneFixo || null,
      celular: form.celular || null,
      email_pessoal: form.emailPessoal || null,
      email_corporativo: form.emailCorporativo || null,
      endereco_cep: form.cep || null,
      endereco_logradouro: form.logradouro || null,
      endereco_numero: form.numero || null,
      endereco_complemento: form.complemento || null,
      endereco_bairro: form.bairro || null,
      endereco_cidade: form.cidade || null,
      endereco_estado: form.uf || null,
      contato_emergencia_nome: form.contatoEmergenciaNome || null,
      contato_emergencia_telefone: form.contatoEmergenciaTelefone || null,
    };
    updateRhColaborador(employee.id, body)
      .then(() => Alert.alert('Salvo', 'Dados pessoais atualizados.'))
      .catch((err) => showRhSaveError(err, 'Não foi possível salvar os dados pessoais.'))
      .finally(() => setIsSavingPessoais(false));
  };

  const handleSalvarContrato = () => {
    setIsSavingContrato(true);
    const body: Record<string, unknown> = {
      tipo_contrato: rhTipoContratoLabelToEnum[contractForm.contractType] ?? undefined,
      cargo: contractForm.role || null,
      setor: contractForm.setor || null,
      data_admissao: brDateLabelToIso(contractForm.admissionDate) ?? undefined,
      regime_jornada: rhRegimeJornadaLabelToEnum[contractForm.scheduleType] ?? undefined,
    };
    updateRhColaborador(employee.id, body)
      .then(() => Alert.alert('Salvo', 'Dados contratuais atualizados.'))
      .catch((err) => showRhSaveError(err, 'Não foi possível salvar o contrato.'))
      .finally(() => setIsSavingContrato(false));
  };

  const handleSalvarEncargos = () => {
    setIsSavingEncargos(true);
    const body: Record<string, unknown> = {
      dependentes_irrf: Number(contractForm.irrfDependents.replace(/\D/g, '')) || 0,
      grau_insalubridade: rhGrauInsalubridadeLabelToEnum[contractForm.insalubrityLevel] ?? undefined,
    };
    updateRhColaborador(employee.id, body)
      .then(() => Alert.alert('Salvo', 'Encargos atualizados.'))
      .catch((err) => showRhSaveError(err, 'Não foi possível salvar os encargos.'))
      .finally(() => setIsSavingEncargos(false));
  };

  // PUT real em rh_beneficios_colaborador (1:1 via colaborador_id) — grava
  // VR/VA/seguro de vida/plano de saúde/odontológico de verdade. Valor por
  // dia (vr_valor_dia/va_valor_dia) é o que o web usa pra calcular o total
  // mensal; não escrevemos o campo "valor_vr_mensal" (cache separado em
  // rh_colaboradores) porque não há sincronia automática confirmada.
  const handleSalvarBeneficios = () => {
    setIsSavingBeneficios(true);
    const body: Record<string, unknown> = {
      vr_ativo: contractForm.vrEnabled,
      vr_valor_dia: parseCurrencyBRToNumber(contractForm.vrDailyValue),
      va_ativo: contractForm.vaEnabled,
      va_valor_dia: parseCurrencyBRToNumber(contractForm.vaDailyValue),
      seguro_vida_ativo: contractForm.lifeInsuranceEnabled,
      seguro_vida_seguradora: contractForm.lifeInsuranceCarrier || null,
      seguro_vida_cobertura: parseCurrencyBRToNumber(contractForm.lifeInsuranceCoverage),
      seguro_vida_desconto_mensal: parseCurrencyBRToNumber(contractForm.lifeInsuranceDiscount),
      plano_saude_ativo: contractForm.healthPlanEnabled,
      plano_saude_operadora: contractForm.healthPlanOperator || null,
      plano_saude_plano: contractForm.healthPlanName || null,
      plano_saude_desconto_titular: parseCurrencyBRToNumber(contractForm.healthPlanPrimaryDiscount),
      plano_saude_desconto_dependente: parseCurrencyBRToNumber(contractForm.healthPlanDependentDiscount),
      plano_odonto_ativo: contractForm.dentalPlanEnabled,
      plano_odonto_operadora: contractForm.dentalPlanOperator || null,
      plano_odonto_plano: contractForm.dentalPlanName || null,
      plano_odonto_desconto_titular: parseCurrencyBRToNumber(contractForm.dentalPlanPrimaryDiscount),
      plano_odonto_desconto_dependente: parseCurrencyBRToNumber(contractForm.dentalPlanDependentDiscount),
    };
    updateRhBeneficios(employee.id, body)
      .then(() => Alert.alert('Salvo', 'Benefícios atualizados.'))
      .catch((err) => showRhSaveError(err, 'Não foi possível salvar os benefícios.'))
      .finally(() => setIsSavingBeneficios(false));
  };

  // POST real em rh_historico_contratacoes (aba Histórico > "Adicionar
  // passagem anterior") — cpf é NOT NULL na tabela, então sempre manda o CPF
  // do colaborador atual junto com o vínculo antigo sendo registrado.
  const handleSalvarPassagemAnterior = () => {
    setIsSavingPassagem(true);
    const body: Record<string, unknown> = {
      colaborador_id: employee.id,
      cpf: employee.cpf,
      cargo: passagemForm.cargo || null,
      data_admissao: brDateLabelToIso(passagemForm.dataAdmissao) ?? undefined,
      data_demissao: brDateLabelToIso(passagemForm.dataDemissao) ?? undefined,
      motivo_desligamento: passagemForm.motivoDesligamento || null,
      valor_rescisao_liquida: passagemForm.valorRescisao ? parseCurrencyBRToNumber(passagemForm.valorRescisao) : null,
      observacoes: passagemForm.observacoes || null,
    };
    createRhHistoricoContratacao(body)
      .then(() => {
        setIsAddPassagemOpen(false);
        setPassagemForm({
          cargo: '',
          dataAdmissao: '',
          dataDemissao: '',
          motivoDesligamento: '',
          valorRescisao: '',
          observacoes: '',
        });
        loadPassagensAnteriores();
      })
      .catch((err) => showRhSaveError(err, 'Não foi possível salvar a passagem anterior.'))
      .finally(() => setIsSavingPassagem(false));
  };

  const [isSavingDependent, setIsSavingDependent] = useState(false);

  const handleSaveDependent = () => {
    if (!dependentForm.fullName.trim() || !dependentForm.birthDate.trim() || !dependentForm.kinship.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, data de nascimento e grau de parentesco.');
      return;
    }

    setIsSavingDependent(true);
    const body: Record<string, unknown> = {
      colaborador_id: employee.id,
      nome: dependentForm.fullName.trim(),
      grau_parentesco: rhGrauParentescoLabelToEnum[dependentForm.kinship] ?? undefined,
      data_nascimento: brDateLabelToIso(dependentForm.birthDate) ?? undefined,
      cpf: dependentForm.cpf.replace(/\D/g, '') || undefined,
      estudante_universitario: dependentForm.universityStudent,
      incapacitado: dependentForm.disabled,
      ativo: dependentForm.active,
      observacao: dependentForm.notes || undefined,
    };
    createRhDependente(body)
      .then(() => {
        setDependentForm(createEmptyDependentForm());
        setIsDependentFormOpen(false);
        loadDependentes();
      })
      .catch((err) => showRhSaveError(err, 'Não foi possível cadastrar o dependente.'))
      .finally(() => setIsSavingDependent(false));
  };

  const activeIrffDependents = dependents.filter((item) => item.active).length;

  return (
      <RHSmallModal
        visible={visible}
        title={`Dados Pessoais — ${employee.fullName}`}
        onClose={onClose}
        overlay={
          <>
            <RHDatePickerModal
              inline
              visible={isDataNascimentoPickerOpen}
              title="Data de nascimento"
              value={form.dataNascimento}
              onSelect={(dateLabel) => setForm((current) => ({ ...current, dataNascimento: dateLabel }))}
              onClose={() => setIsDataNascimentoPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isSexoPickerOpen}
              title="Sexo"
              options={rhSexoOptions}
              selectedValue={form.sexo}
              onSelect={(value) => setForm((current) => ({ ...current, sexo: value }))}
              onClose={() => setIsSexoPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isTipoSanguineoPickerOpen}
              title="Tipo sanguíneo"
              options={rhTipoSanguineoOptions}
              selectedValue={form.tipoSanguineo}
              onSelect={(value) => setForm((current) => ({ ...current, tipoSanguineo: value }))}
              onClose={() => setIsTipoSanguineoPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isEstadoCivilPickerOpen}
              title="Estado civil"
              options={rhEstadoCivilOptions}
              selectedValue={form.estadoCivil}
              onSelect={(value) => setForm((current) => ({ ...current, estadoCivil: value }))}
              onClose={() => setIsEstadoCivilPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isGrauInstrucaoPickerOpen}
              title="Grau de instrução"
              options={rhGrauInstrucaoOptions}
              selectedValue={form.grauInstrucao}
              onSelect={(value) => setForm((current) => ({ ...current, grauInstrucao: value }))}
              onClose={() => setIsGrauInstrucaoPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isNacionalidadePickerOpen}
              title="Nacionalidade"
              options={rhNacionalidadeOptions}
              selectedValue={form.nacionalidade}
              onSelect={(value) => setForm((current) => ({ ...current, nacionalidade: value }))}
              onClose={() => setIsNacionalidadePickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isContractTypePickerOpen}
              title="Tipo de contrato"
              options={rhTipoContratoOptions}
              selectedValue={contractForm.contractType}
              onSelect={(value) => setContractForm((current) => ({ ...current, contractType: value }))}
              onClose={() => setIsContractTypePickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isContractCargoPickerOpen}
              title="Cargo"
              options={cargoOptions}
              selectedValue={contractForm.role}
              onSelect={(value) => setContractForm((current) => ({ ...current, role: value }))}
              onClose={() => setIsContractCargoPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isContractSetorPickerOpen}
              title="Setor"
              options={setorOptions}
              selectedValue={contractForm.setor}
              onSelect={(value) => setContractForm((current) => ({ ...current, setor: value }))}
              onClose={() => setIsContractSetorPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isJornadaTipoPickerOpen}
              title="Jornada (tipo)"
              options={rhJornadaTipoOptions}
              selectedValue={contractForm.scheduleType}
              onSelect={(value) => setContractForm((current) => ({ ...current, scheduleType: value }))}
              onClose={() => setIsJornadaTipoPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isInsalubridadePickerOpen}
              title="Grau de insalubridade"
              options={rhInsalubridadeOptions}
              selectedValue={contractForm.insalubrityLevel}
              onSelect={(value) => setContractForm((current) => ({ ...current, insalubrityLevel: value }))}
              onClose={() => setIsInsalubridadePickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isEntradaPickerOpen}
              title="Entrada"
              options={rhTimeOptions}
              selectedValue={contractForm.scheduleEntrada}
              onSelect={(value) => setContractForm((current) => ({ ...current, scheduleEntrada: value }))}
              onClose={() => setIsEntradaPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isSaidaPickerOpen}
              title="Saída"
              options={rhTimeOptions}
              selectedValue={contractForm.scheduleSaida}
              onSelect={(value) => setContractForm((current) => ({ ...current, scheduleSaida: value }))}
              onClose={() => setIsSaidaPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isAlmocoInicioPickerOpen}
              title="Almoço — início"
              options={rhTimeOptions}
              selectedValue={contractForm.scheduleAlmocoInicio}
              onSelect={(value) => setContractForm((current) => ({ ...current, scheduleAlmocoInicio: value }))}
              onClose={() => setIsAlmocoInicioPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isAlmocoFimPickerOpen}
              title="Almoço — fim"
              options={rhTimeOptions}
              selectedValue={contractForm.scheduleAlmocoFim}
              onSelect={(value) => setContractForm((current) => ({ ...current, scheduleAlmocoFim: value }))}
              onClose={() => setIsAlmocoFimPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isScheduleModelPickerOpen}
              title="Modelo de jornada"
              options={rhModeloJornadaOptions}
              selectedValue={contractForm.scheduleModel}
              onSelect={(value) => setContractForm((current) => ({ ...current, scheduleModel: value }))}
              onClose={() => setIsScheduleModelPickerOpen(false)}
            />
          </>
        }
      >
      <View style={rhStyles.mobileDetailTabsShell}>
        <View style={rhStyles.mobileDetailTabsRow}>
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
                  size={12}
                  color={isActive ? '#1B6E3A' : '#6F768A'}
                />
                <Text
                  style={[rhStyles.mobileDetailTabText, isActive ? rhStyles.mobileDetailTabTextActive : null]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
                onChangeText={(text) => setForm((current) => ({ ...current, cpf: formatCpfInput(text) }))}
                placeholder="000.000.000-00"
                placeholderTextColor="#A7AEC2"
                keyboardType="number-pad"
                maxLength={14}
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
              <RHSelectField
                label="Data nascimento"
                value={form.dataNascimento}
                placeholder="Selecione a data"
                icon="calendar"
                onPress={() => setIsDataNascimentoPickerOpen(true)}
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <RHSelectField label="Sexo" value={form.sexo} onPress={() => setIsSexoPickerOpen(true)} />
            </View>
            <View style={rhStyles.formRowItem}>
              <RHSelectField
                label="Tipo sanguíneo"
                value={form.tipoSanguineo}
                onPress={() => setIsTipoSanguineoPickerOpen(true)}
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <RHSelectField
                label="Estado civil"
                value={form.estadoCivil}
                onPress={() => setIsEstadoCivilPickerOpen(true)}
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <RHSelectField
                label="Grau de instrução"
                value={form.grauInstrucao}
                onPress={() => setIsGrauInstrucaoPickerOpen(true)}
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <RHSelectField
                label="Nacionalidade"
                value={form.nacionalidade}
                onPress={() => setIsNacionalidadePickerOpen(true)}
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Naturalidade</Text>
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
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>E-mail pessoal</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.emailPessoal}
                onChangeText={updateField('emailPessoal')}
                placeholderTextColor="#A7AEC2"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>E-mail corporativo</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.emailCorporativo}
                onChangeText={updateField('emailCorporativo')}
                placeholderTextColor="#A7AEC2"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <Text style={[rhStyles.detailSectionHeading, styles.spacingTop]}>Residência</Text>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>CEP</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.cep}
                onChangeText={updateField('cep')}
                placeholder="00000-000"
                placeholderTextColor="#A7AEC2"
                keyboardType="number-pad"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Logradouro</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.logradouro}
                onChangeText={updateField('logradouro')}
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Número</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.numero}
                onChangeText={updateField('numero')}
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Complemento</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.complemento}
                onChangeText={updateField('complemento')}
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Bairro</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.bairro}
                onChangeText={updateField('bairro')}
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Cidade</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.cidade}
                onChangeText={updateField('cidade')}
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>UF</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.uf}
                onChangeText={updateField('uf')}
                placeholder="RJ"
                placeholderTextColor="#A7AEC2"
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
            <View style={rhStyles.formRowItem} />
          </View>

          <Text style={[rhStyles.detailSectionHeading, styles.spacingTop]}>Contato de emergência</Text>
          <View style={rhStyles.formRow}>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Nome do contato</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.contatoEmergenciaNome}
                onChangeText={updateField('contatoEmergenciaNome')}
                placeholder="Nome completo"
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={rhStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Telefone do contato</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.contatoEmergenciaTelefone}
                onChangeText={updateField('contatoEmergenciaTelefone')}
                placeholder="(00) 00000-0000"
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>

          <Pressable
            style={[rhStyles.primaryButtonGreen, styles.spacingTop, isSavingPessoais ? { opacity: 0.6 } : null]}
            disabled={isSavingPessoais}
            onPress={handleSalvarPessoais}
          >
            <Feather name="save" size={15} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{isSavingPessoais ? 'Salvando...' : 'Salvar dados'}</Text>
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

          {isLoadingDependents ? (
            <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
          ) : dependentsError ? (
            <View style={rhStyles.dependentEmptyCard}>
              <Text style={rhStyles.dependentEmptyText}>Não foi possível carregar: {dependentsError}</Text>
            </View>
          ) : dependents.length === 0 ? (
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
                <RHSelectField
                  label="Tipo de contrato"
                  value={contractForm.contractType}
                  onPress={() => setIsContractTypePickerOpen(true)}
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Data de admissão</Text>
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
                <Text style={[styles.requestFieldLabel, styles.spacingTop]} numberOfLines={1}>
                  Fim da experiência
                </Text>
                <TextInput
                  style={styles.processTextInput}
                  value={contractForm.experienceEndDate}
                  onChangeText={updateContractField('experienceEndDate')}
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Cargo"
                  value={contractForm.role}
                  onPress={() => setIsContractCargoPickerOpen(true)}
                />
              </View>
            </View>

            <View style={rhStyles.formRow}>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Setor"
                  value={contractForm.setor}
                  onPress={() => setIsContractSetorPickerOpen(true)}
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Jornada (tipo)"
                  value={contractForm.scheduleType}
                  onPress={() => setIsJornadaTipoPickerOpen(true)}
                />
              </View>
            </View>

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Horário</Text>
            <View style={rhStyles.formRow}>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Entrada"
                  icon="clock"
                  value={contractForm.scheduleEntrada}
                  onPress={() => setIsEntradaPickerOpen(true)}
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Saída"
                  icon="clock"
                  value={contractForm.scheduleSaida}
                  onPress={() => setIsSaidaPickerOpen(true)}
                />
              </View>
            </View>
            <View style={rhStyles.formRow}>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Almoço — início"
                  icon="clock"
                  value={contractForm.scheduleAlmocoInicio}
                  onPress={() => setIsAlmocoInicioPickerOpen(true)}
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Almoço — fim"
                  icon="clock"
                  value={contractForm.scheduleAlmocoFim}
                  onPress={() => setIsAlmocoFimPickerOpen(true)}
                />
              </View>
            </View>
            <Text style={rhStyles.scheduleResultText}>
              Resultado: {contractForm.scheduleEntrada} às {contractForm.scheduleAlmocoInicio} ·{' '}
              {contractForm.scheduleAlmocoFim} às {contractForm.scheduleSaida}
            </Text>

            <RHSelectField
              label="Modelo de jornada cadastrado (opcional)"
              value={contractForm.scheduleModel}
              onPress={() => setIsScheduleModelPickerOpen(true)}
            />

            <Pressable
              style={[rhStyles.detailSaveButton, isSavingContrato ? { opacity: 0.6 } : null]}
              disabled={isSavingContrato}
              onPress={handleSalvarContrato}
            >
              <Feather name="save" size={14} color="#FFFFFF" />
              <Text style={rhStyles.detailSaveButtonText}>{isSavingContrato ? 'Salvando...' : 'Salvar contrato'}</Text>
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
              value={`R$ ${contractForm.baseSalary}`}
              onChangeText={(text) =>
                setContractForm((current) => ({
                  ...current,
                  baseSalary: formatCurrencyInput(text.replace(/^R\$\s?/, '')),
                }))
              }
              placeholderTextColor="#A7AEC2"
              keyboardType="number-pad"
            />
          </View>

          <View style={rhStyles.formSectionCard}>
            <Text style={rhStyles.formSectionTitle}>Encargos & adicionais</Text>

            <View style={rhStyles.formRow}>
              <View style={rhStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Dependentes IRRF</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={contractForm.irrfDependents}
                  onChangeText={updateContractField('irrfDependents')}
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Insalubridade"
                  value={contractForm.insalubrityLevel}
                  onPress={() => setIsInsalubridadePickerOpen(true)}
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
              style={[rhStyles.detailSaveButton, isSavingEncargos ? { opacity: 0.6 } : null]}
              disabled={isSavingEncargos}
              onPress={handleSalvarEncargos}
            >
              <Feather name="save" size={14} color="#FFFFFF" />
              <Text style={rhStyles.detailSaveButtonText}>{isSavingEncargos ? 'Salvando...' : 'Salvar encargos'}</Text>
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
                value={`R$ ${contractForm.vrDailyValue}`}
                onChangeText={updateCurrencyField('vrDailyValue')}
                placeholderTextColor="#A7AEC2"
                keyboardType="number-pad"
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
                value={`R$ ${contractForm.vaDailyValue}`}
                onChangeText={updateCurrencyField('vaDailyValue')}
                placeholderTextColor="#A7AEC2"
                keyboardType="number-pad"
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
                    value={`R$ ${contractForm.lifeInsuranceCoverage}`}
                    onChangeText={updateCurrencyField('lifeInsuranceCoverage')}
                    placeholderTextColor="#A7AEC2"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <Text style={styles.requestFieldLabel}>Desconto mensal</Text>
              <TextInput
                style={styles.processTextInput}
                value={`R$ ${contractForm.lifeInsuranceDiscount}`}
                onChangeText={updateCurrencyField('lifeInsuranceDiscount')}
                placeholderTextColor="#A7AEC2"
                keyboardType="number-pad"
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
                    value={`R$ ${contractForm.healthPlanPrimaryDiscount}`}
                    onChangeText={updateCurrencyField('healthPlanPrimaryDiscount')}
                    placeholderTextColor="#A7AEC2"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Desc. por dependente</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={`R$ ${contractForm.healthPlanDependentDiscount}`}
                    onChangeText={updateCurrencyField('healthPlanDependentDiscount')}
                    placeholderTextColor="#A7AEC2"
                    keyboardType="number-pad"
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
                    value={`R$ ${contractForm.dentalPlanPrimaryDiscount}`}
                    onChangeText={updateCurrencyField('dentalPlanPrimaryDiscount')}
                    placeholderTextColor="#A7AEC2"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={styles.requestFieldLabel}>Desc. por dependente</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={`R$ ${contractForm.dentalPlanDependentDiscount}`}
                    onChangeText={updateCurrencyField('dentalPlanDependentDiscount')}
                    placeholderTextColor="#A7AEC2"
                    keyboardType="number-pad"
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
              style={[rhStyles.detailSaveButton, isSavingBeneficios ? { opacity: 0.6 } : null]}
              disabled={isSavingBeneficios}
              onPress={handleSalvarBeneficios}
            >
              <Feather name="save" size={14} color="#FFFFFF" />
              <Text style={rhStyles.detailSaveButtonText}>{isSavingBeneficios ? 'Salvando...' : 'Salvar benefícios'}</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {activeTab === 'pendencias' ? (
        <>
          <View style={[rhStyles.checklistProgressCard, styles.spacingTop]}>
            <View style={rhStyles.checklistProgressHeaderRow}>
              <Text style={rhStyles.checklistProgressTitle}>Cadastro completo</Text>
              <Text style={rhStyles.checklistProgressPercent}>{checklistTotals.percent}%</Text>
            </View>
            <Text style={rhStyles.checklistProgressSubtitle}>
              {checklistTotals.filledFields} de {checklistTotals.totalFields} campos preenchidos ·{' '}
              {checklistTotals.criticalFilled}/{checklistTotals.criticalTotal} críticos
            </Text>
            <View style={rhStyles.checklistProgressTrack}>
              <View
                style={[
                  rhStyles.checklistProgressFill,
                  {
                    width: `${checklistTotals.percent}%`,
                    backgroundColor:
                      checklistTotals.criticalFilled < checklistTotals.criticalTotal ? '#E6213D' : '#18955A',
                  },
                ]}
              />
            </View>
          </View>

          {checklistGroups.map((group) => {
            const isComplete = group.filledCount === group.totalCount;
            return (
              <View key={group.id} style={[rhStyles.checklistGroupCard, styles.spacingTop]}>
                <View style={rhStyles.checklistGroupHeaderRow}>
                  <Text style={rhStyles.checklistGroupTitle}>{group.title}</Text>
                  <View style={[rhStyles.checklistGroupBadge, isComplete && rhStyles.checklistGroupBadgeComplete]}>
                    <Text
                      style={[
                        rhStyles.checklistGroupBadgeText,
                        isComplete && rhStyles.checklistGroupBadgeCompleteText,
                      ]}
                    >
                      {isComplete ? 'Completo' : `${group.filledCount}/${group.totalCount}`}
                    </Text>
                  </View>
                </View>
                {group.items.map((item) => {
                  const isCriticalPending = item.critical && !item.filled;
                  return (
                    <View key={item.label} style={rhStyles.checklistRow}>
                      <Feather
                        name={item.filled ? 'check-circle' : isCriticalPending ? 'x-circle' : 'alert-circle'}
                        size={15}
                        color={item.filled ? '#18955A' : isCriticalPending ? '#D52B47' : '#B07A1E'}
                      />
                      <Text
                        style={[
                          rhStyles.checklistRowText,
                          !item.filled && rhStyles.checklistRowTextPending,
                          isCriticalPending && rhStyles.checklistRowTextCritical,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isCriticalPending ? (
                        <View style={rhStyles.checklistCriticalTag}>
                          <Text style={rhStyles.checklistCriticalTagText}>crítico</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </>
      ) : null}

      {activeTab === 'historico' ? (
        <>
          <View style={[rhStyles.passagensHeaderRow, styles.spacingTop]}>
            <View style={rhStyles.historyHeaderTextBlock}>
              <View style={rhStyles.historyHeaderTitleRow}>
                <Feather name="clock" size={15} color="#15203E" />
                <Text style={rhStyles.detailSectionHeading}>Linha do tempo na rede</Text>
              </View>
              <Text style={rhStyles.historyHeaderSubtitle}>Primeira passagem do colaborador na rede.</Text>
            </View>
            <Pressable style={rhStyles.addPassagemButton} onPress={() => setIsAddPassagemOpen(true)}>
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={rhStyles.addPassagemButtonText}>Adicionar passagem anterior</Text>
            </Pressable>
          </View>

          <View style={[rhStyles.kpiCard, rhStyles.kpiCardAccentGreen, styles.spacingTop]}>
            <View style={rhStyles.passagemTopRow}>
              <View style={rhStyles.passagemTag}>
                <Text style={rhStyles.passagemTagText}>
                  Passagem #1{employee.status !== 'desligado' ? ' — Atual' : ''}
                </Text>
              </View>
              <View
                style={[
                  rhStyles.passagemStatusTag,
                  employee.status === 'desligado' ? rhStyles.passagemStatusTagInactive : null,
                ]}
              >
                <Text
                  style={[
                    rhStyles.passagemStatusTagText,
                    employee.status === 'desligado' ? rhStyles.passagemStatusTagTextInactive : null,
                  ]}
                >
                  {currentPassageStatusLabel}
                </Text>
              </View>
            </View>
            <View style={[rhStyles.passagemInfoRow, styles.spacingTop]}>
              <Feather name="briefcase" size={13} color="#5E667D" />
              <Text style={rhStyles.passagemInfoText}>{employee.role.toUpperCase()}</Text>
            </View>
            <View style={rhStyles.passagemInfoRow}>
              <Feather name="calendar" size={13} color="#5E667D" />
              <Text style={rhStyles.passagemInfoText}>{currentPassagePeriodLabel}</Text>
            </View>
          </View>

          {isLoadingPassagens ? (
            <Text style={[rhStyles.historyEmptyNote, styles.spacingTop]}>Carregando passagens anteriores...</Text>
          ) : passagensAnteriores.length === 0 ? (
            <Text style={[rhStyles.historyEmptyNote, styles.spacingTop]}>Sem passagens anteriores registradas.</Text>
          ) : (
            passagensAnteriores.map((item, index) => (
              <View key={item.id} style={[rhStyles.kpiCard, styles.spacingTop]}>
                <View style={rhStyles.passagemTopRow}>
                  <View style={rhStyles.passagemTag}>
                    <Text style={rhStyles.passagemTagText}>
                      Passagem anterior #{passagensAnteriores.length - index}
                    </Text>
                  </View>
                </View>
                <View style={[rhStyles.passagemInfoRow, styles.spacingTop]}>
                  <Feather name="briefcase" size={13} color="#5E667D" />
                  <Text style={rhStyles.passagemInfoText}>{(item.cargo || '—').toUpperCase()}</Text>
                </View>
                <View style={rhStyles.passagemInfoRow}>
                  <Feather name="calendar" size={13} color="#5E667D" />
                  <Text style={rhStyles.passagemInfoText}>
                    {formatDateOnlyBR(item.data_admissao)} →{' '}
                    {item.data_demissao ? formatDateOnlyBR(item.data_demissao) : 'presente'}
                  </Text>
                </View>
                {item.motivo_desligamento ? (
                  <View style={rhStyles.passagemInfoRow}>
                    <Feather name="info" size={13} color="#5E667D" />
                    <Text style={rhStyles.passagemInfoText}>{item.motivo_desligamento}</Text>
                  </View>
                ) : null}
                {typeof item.valor_rescisao_liquida === 'number' ? (
                  <View style={rhStyles.passagemInfoRow}>
                    <Feather name="dollar-sign" size={13} color="#5E667D" />
                    <Text style={rhStyles.passagemInfoText}>
                      Rescisão líquida: R${' '}
                      {item.valor_rescisao_liquida.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                    onChangeText={(text) =>
                      setDependentForm((current) => ({ ...current, cpf: formatCpfMask(text) }))
                    }
                    placeholder="000.000.000-00"
                    placeholderTextColor="#A7AEC2"
                    keyboardType="number-pad"
                    maxLength={14}
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField
                    label="Data de nascimento"
                    required
                    value={dependentForm.birthDate}
                    placeholder="Selecione a data"
                    icon="calendar"
                    onPress={() => setIsDependentBirthDatePickerOpen(true)}
                  />
                </View>
              </View>

              <RHSelectField
                label="Grau de parentesco"
                required
                value={dependentForm.kinship}
                onPress={() => setIsKinshipPickerOpen(true)}
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

              <Pressable
                style={[rhStyles.detailSaveButton, styles.spacingTop, isSavingDependent ? { opacity: 0.6 } : null]}
                disabled={isSavingDependent}
                onPress={handleSaveDependent}
              >
                {isSavingDependent ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="save" size={14} color="#FFFFFF" />
                    <Text style={rhStyles.detailSaveButtonText}>Salvar</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>

            <RHDatePickerModal
              inline
              visible={isDependentBirthDatePickerOpen}
              title="Data de nascimento"
              value={dependentForm.birthDate}
              onSelect={(dateLabel) => setDependentForm((current) => ({ ...current, birthDate: dateLabel }))}
              onClose={() => setIsDependentBirthDatePickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isKinshipPickerOpen}
              title="Grau de parentesco"
              options={rhGrauParentescoOptions}
              selectedValue={dependentForm.kinship}
              onSelect={(value) => setDependentForm((current) => ({ ...current, kinship: value }))}
              onClose={() => setIsKinshipPickerOpen(false)}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={isAddPassagemOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsAddPassagemOpen(false)}
      >
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>Adicionar passagem anterior</Text>
              <Pressable
                onPress={() => {
                  setIsAddPassagemOpen(false);
                  setPassagemForm({
                    cargo: '',
                    dataAdmissao: '',
                    dataDemissao: '',
                    motivoDesligamento: '',
                    valorRescisao: '',
                    observacoes: '',
                  });
                }}
                hitSlop={8}
              >
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={rhStyles.warningBox}>
                <Text style={rhStyles.warningBoxNote}>
                  Use este formulário para registrar um vínculo anterior deste colaborador na rede. O vínculo
                  atual fica nos dados pessoais/contrato.
                </Text>
              </View>

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Cargo</Text>
              <TextInput
                style={styles.processTextInput}
                value={passagemForm.cargo}
                onChangeText={(text) => setPassagemForm((current) => ({ ...current, cargo: text }))}
                placeholder="Ex.: Frentista"
                placeholderTextColor="#A7AEC2"
              />

              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField
                    label="Data de admissão"
                    value={passagemForm.dataAdmissao}
                    placeholder="Selecione a data"
                    icon="calendar"
                    onPress={() => setIsPassagemAdmissaoPickerOpen(true)}
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField
                    label="Data de demissão"
                    value={passagemForm.dataDemissao}
                    placeholder="Selecione a data"
                    icon="calendar"
                    onPress={() => setIsPassagemDemissaoPickerOpen(true)}
                  />
                </View>
              </View>

              <RHSelectField
                label="Motivo do desligamento"
                value={passagemForm.motivoDesligamento || '—'}
                onPress={() => setIsPassagemMotivoPickerOpen(true)}
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Valor da rescisão líquida (R$)</Text>
              <TextInput
                style={styles.processTextInput}
                value={passagemForm.valorRescisao ? `R$ ${passagemForm.valorRescisao}` : ''}
                onChangeText={(text) =>
                  setPassagemForm((current) => ({
                    ...current,
                    valorRescisao: formatCurrencyInput(text.replace(/^R\$\s?/, '')),
                  }))
                }
                placeholder="0,00"
                placeholderTextColor="#A7AEC2"
                keyboardType="number-pad"
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Observações</Text>
              <TextInput
                style={[styles.processTextInput, styles.processDocumentationArea]}
                value={passagemForm.observacoes}
                onChangeText={(text) => setPassagemForm((current) => ({ ...current, observacoes: text }))}
                placeholderTextColor="#A7AEC2"
                multiline
                textAlignVertical="top"
              />

              <View style={[rhStyles.passagemFormButtonRow, styles.spacingTop]}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setIsAddPassagemOpen(false);
                    setPassagemForm({
                      cargo: '',
                      dataAdmissao: '',
                      dataDemissao: '',
                      motivoDesligamento: '',
                      valorRescisao: '',
                      observacoes: '',
                    });
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[rhStyles.detailSaveButton, { marginTop: 0 }, isSavingPassagem ? { opacity: 0.6 } : null]}
                  disabled={isSavingPassagem}
                  onPress={handleSalvarPassagemAnterior}
                >
                  <Feather name="save" size={14} color="#FFFFFF" />
                  <Text style={rhStyles.detailSaveButtonText}>{isSavingPassagem ? 'Salvando...' : 'Salvar'}</Text>
                </Pressable>
              </View>
            </ScrollView>

            <RHDatePickerModal
              inline
              visible={isPassagemAdmissaoPickerOpen}
              title="Data de admissão"
              value={passagemForm.dataAdmissao}
              onSelect={(dateLabel) => setPassagemForm((current) => ({ ...current, dataAdmissao: dateLabel }))}
              onClose={() => setIsPassagemAdmissaoPickerOpen(false)}
            />
            <RHDatePickerModal
              inline
              visible={isPassagemDemissaoPickerOpen}
              title="Data de demissão"
              value={passagemForm.dataDemissao}
              onSelect={(dateLabel) => setPassagemForm((current) => ({ ...current, dataDemissao: dateLabel }))}
              onClose={() => setIsPassagemDemissaoPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isPassagemMotivoPickerOpen}
              title="Motivo do desligamento"
              options={rhMotivoDesligamentoOptions}
              selectedValue={passagemForm.motivoDesligamento || '—'}
              onSelect={(value) =>
                setPassagemForm((current) => ({ ...current, motivoDesligamento: value === '—' ? '' : value }))
              }
              onClose={() => setIsPassagemMotivoPickerOpen(false)}
            />
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

// Agrupamento cliente-side de rh_documentos.tipo (texto livre) nas pastas
// da tela. "Outro"/tipos não mapeados caem em "outros".
const rhDocumentTipoToCategory: Record<string, string> = {
  RG: 'identificacao',
  CPF: 'identificacao',
  CNH: 'identificacao',
  'Título de eleitor': 'identificacao',
  'Certidão de reservista': 'identificacao',
  'Comprovante de residência': 'endereco',
  ASO: 'saude',
  Contrato: 'trabalho',
};

// Mimes aceitos pelo endpoint da Lovable (415 se mandar outro).
const rhDocumentoMimesAceitos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const rhDocumentoTamanhoMaximoBytes = 10 * 1024 * 1024;

function DocumentosModal({
  visible,
  employee,
  onClose,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
}) {
  const [documentos, setDocumentos] = useState<RhDocumentoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [observacaoDocumento, setObservacaoDocumento] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isTipoDocumentoPickerOpen, setIsTipoDocumentoPickerOpen] = useState(false);
  const [isDataValidadePickerOpen, setIsDataValidadePickerOpen] = useState(false);
  const [isDataEmissaoPickerOpen, setIsDataEmissaoPickerOpen] = useState(false);

  const reloadDocumentos = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    return fetchRhDocumentos(employee.id)
      .then(setDocumentos)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Erro ao carregar documentos.'))
      .finally(() => setIsLoading(false));
  }, [employee.id]);

  useEffect(() => {
    if (visible) {
      setSelectedCategory(null);
      setIsUploadFormOpen(false);
      setTipoDocumento('');
      setDataValidade('');
      setDataEmissao('');
      setObservacaoDocumento('');
      setSelectedFile(null);
      reloadDocumentos();
    }
  }, [visible, reloadDocumentos]);

  const activeCategory = rhDocumentCategories.find((category) => category.key === selectedCategory) ?? null;

  const documentosPorCategoria = useMemo(() => {
    const map = new Map<string, RhDocumentoItem[]>();
    documentos.forEach((doc) => {
      const categoria = rhDocumentTipoToCategory[doc.tipo] ?? 'outros';
      map.set(categoria, [...(map.get(categoria) ?? []), doc]);
    });
    return map;
  }, [documentos]);

  const hojeMs = Date.now();
  const totalVencidos = documentos.filter(
    (doc) => doc.data_validade && Date.parse(doc.data_validade) < hojeMs
  ).length;
  const documentosDaCategoria = selectedCategory ? documentosPorCategoria.get(selectedCategory) ?? [] : [];

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: rhDocumentoMimesAceitos,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? '';
      if (!rhDocumentoMimesAceitos.includes(mimeType)) {
        Alert.alert('Arquivo inválido', 'Envie um PDF, JPEG, PNG ou WEBP.');
        return;
      }
      if ((asset.size ?? 0) > rhDocumentoTamanhoMaximoBytes) {
        Alert.alert('Arquivo muito grande', 'O tamanho máximo por documento é 10MB.');
        return;
      }
      setSelectedFile({ uri: asset.uri, name: asset.name ?? 'documento', mimeType, size: asset.size ?? 0 });
    } catch {
      Alert.alert('Falha ao selecionar arquivo', 'Não foi possível abrir o seletor de arquivos agora.');
    }
  };

  const handleUploadSubmit = async () => {
    if (!tipoDocumento.trim()) {
      Alert.alert('Campo obrigatório', 'Selecione o tipo de documento.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Selecione um arquivo', 'Toque em "Toque para selecionar um arquivo" antes de enviar.');
      return;
    }
    setIsUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await createRhDocumento({
        colaborador_id: employee.id,
        tipo: tipoDocumento,
        nome_arquivo: selectedFile.name,
        arquivo_base64: base64,
        mime_type: selectedFile.mimeType,
        data_validade: brDateLabelToIso(dataValidade) ?? undefined,
        data_emissao: brDateLabelToIso(dataEmissao) ?? undefined,
        observacoes: observacaoDocumento || undefined,
      });
      setIsUploadFormOpen(false);
      setTipoDocumento('');
      setDataValidade('');
      setDataEmissao('');
      setObservacaoDocumento('');
      setSelectedFile(null);
      reloadDocumentos();
    } catch (err) {
      showRhSaveError(err, 'Não foi possível enviar o documento.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenDocumento = (doc: RhDocumentoItem) => {
    fetchRhDocumentoUrl(doc.id)
      .then(({ url }) => {
        if (url) Linking.openURL(url);
        else Alert.alert('Link indisponível', 'Não foi possível gerar o link de visualização agora.');
      })
      .catch((err) => showRhSaveError(err, 'Não foi possível abrir o documento.'));
  };

  const handleDeleteDocumento = (doc: RhDocumentoItem) => {
    Alert.alert('Excluir documento', `Excluir "${doc.nome_arquivo ?? doc.tipo}"? Essa ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteRhDocumento(doc.id)
            .then(() => reloadDocumentos())
            .catch((err) => showRhSaveError(err, 'Não foi possível excluir o documento.'));
        },
      },
    ]);
  };

  return (
    <>
      <RHSmallModal visible={visible} title={`Documentos — ${employee.fullName}`} onClose={onClose}>
        {!selectedCategory ? (
          <>
            <View style={rhStyles.docStatsRow}>
              <Text style={rhStyles.docStatsText}>{documentos.length} total · {totalVencidos} vencidos</Text>
              <Pressable
                style={rhStyles.primaryButtonGreenSmall}
                onPress={() => {
                  setSelectedCategory('outros');
                  setIsUploadFormOpen(true);
                }}
              >
                <Feather name="plus" size={13} color="#FFFFFF" />
                <Text style={rhStyles.primaryButtonSmallText}>Enviar</Text>
              </Pressable>
            </View>

            {isLoading ? (
              <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
            ) : loadError ? (
              <RHEmptyTabState message={`Não foi possível carregar: ${loadError}`} />
            ) : (
              <View style={rhStyles.docGrid}>
                {rhDocumentCategories.map((category) => {
                  const count = documentosPorCategoria.get(category.key)?.length ?? 0;
                  return (
                    <Pressable
                      key={category.key}
                      style={rhStyles.docCard}
                      onPress={() => setSelectedCategory(category.key)}
                    >
                      <View style={rhStyles.docCardTopRow}>
                        <View style={[styles.iconShell, styles.iconAccentGreen]}>
                          <Feather name={category.icon} size={15} color="#1B6E3A" />
                        </View>
                      </View>
                      <Text style={rhStyles.docCardTitle}>{category.label}</Text>
                      <Text style={rhStyles.docCardDescription} numberOfLines={2}>
                        {category.description}
                      </Text>
                      <Text style={rhStyles.docCardCount}>{count} documento(s)</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : isUploadFormOpen ? (
          <>
            <View style={rhStyles.docFolderHeaderTopRow}>
              <Pressable onPress={() => setIsUploadFormOpen(false)} hitSlop={8}>
                <Feather name="chevron-left" size={20} color="#5E667D" />
              </Pressable>
              <Text style={rhStyles.docFolderHeaderTitle}>Enviar documento</Text>
            </View>
            <Text style={rhStyles.docFolderHeaderSubtitle}>
              {activeCategory?.label} • {employee.fullName}
            </Text>

            <View style={styles.spacingTop}>
              <RHSelectField
                label="Tipo de documento"
                value={tipoDocumento}
                onPress={() => setIsTipoDocumentoPickerOpen(true)}
                required
              />
            </View>

            <View style={rhStyles.formRow}>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Data de validade"
                  value={dataValidade}
                  placeholder="Selecione a data"
                  icon="calendar"
                  onPress={() => setIsDataValidadePickerOpen(true)}
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Data de emissão"
                  value={dataEmissao}
                  placeholder="Selecione a data"
                  icon="calendar"
                  onPress={() => setIsDataEmissaoPickerOpen(true)}
                />
              </View>
            </View>

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Observação</Text>
            <TextInput
              style={[styles.processTextInput, styles.processDocumentationArea]}
              value={observacaoDocumento}
              onChangeText={setObservacaoDocumento}
              placeholder="Observações..."
              placeholderTextColor="#A7AEC2"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Pressable style={[rhStyles.uploadDropZone, styles.spacingTop]} onPress={handlePickFile}>
              <Feather name="upload-cloud" size={22} color="#7A8299" />
              <Text style={rhStyles.uploadDropZoneText}>
                {selectedFile ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})` : 'Toque para selecionar um arquivo'}
              </Text>
            </Pressable>

            <Pressable
              style={[rhStyles.primaryButtonGreen, styles.spacingTop, isUploading ? { opacity: 0.6 } : null]}
              disabled={isUploading}
              onPress={handleUploadSubmit}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="upload" size={15} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Enviar documento</Text>
                </>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <View style={rhStyles.docFolderHeaderTopRow}>
              <Pressable onPress={() => setSelectedCategory(null)} hitSlop={8}>
                <Feather name="chevron-left" size={20} color="#5E667D" />
              </Pressable>
              <View style={[styles.iconShell, styles.iconAccentGreen]}>
                <Feather name={activeCategory?.icon ?? 'folder'} size={15} color="#1B6E3A" />
              </View>
              <Text style={rhStyles.docFolderHeaderTitle}>{activeCategory?.label}</Text>
            </View>
            <Text style={rhStyles.docFolderHeaderSubtitle}>
              {documentosDaCategoria.length} arquivo(s) • {employee.fullName}
            </Text>

            <Pressable
              style={[rhStyles.primaryButtonGreenSmall, styles.spacingTop]}
              onPress={() => setIsUploadFormOpen(true)}
            >
              <Feather name="upload" size={13} color="#FFFFFF" />
              <Text style={rhStyles.primaryButtonSmallText}>Enviar documento</Text>
            </Pressable>

            <View style={styles.spacingTop}>
              {documentosDaCategoria.length === 0 ? (
                <RHEmptyTabState message="Nenhum documento nesta pasta." />
              ) : (
                documentosDaCategoria.map((doc) => (
                  <View key={doc.id} style={rhStyles.historyCard}>
                    <View style={rhStyles.docCardTopRow}>
                      <Text style={rhStyles.historyCardTitle}>{doc.nome_arquivo ?? doc.tipo}</Text>
                      {doc.data_validade && Date.parse(doc.data_validade) < hojeMs ? (
                        <View style={rhStyles.docPendingBadge}>
                          <Text style={rhStyles.docPendingBadgeText}>Vencido</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={rhStyles.historyCardMeta}>
                      {doc.tipo}
                      {doc.data_validade ? ` · validade ${formatDateOnlyBR(doc.data_validade)}` : ''}
                    </Text>
                    <View style={[rhStyles.docCardTopRow, styles.spacingTop]}>
                      <Pressable onPress={() => handleOpenDocumento(doc)}>
                        <Text style={[rhStyles.historyCardMeta, { color: '#3457D5', fontWeight: '600' }]}>
                          Ver/baixar
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => handleDeleteDocumento(doc)}>
                        <Text style={[rhStyles.historyCardMeta, { color: '#B3261E', fontWeight: '600' }]}>
                          Excluir
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </RHSmallModal>

      <RHSimplePickerModal
        visible={isTipoDocumentoPickerOpen}
        title="Tipo de documento"
        options={rhDocumentTypeOptions}
        selectedValue={tipoDocumento}
        onSelect={setTipoDocumento}
        onClose={() => setIsTipoDocumentoPickerOpen(false)}
      />
      <RHDatePickerModal
        visible={isDataValidadePickerOpen}
        title="Data de validade"
        value={dataValidade}
        onSelect={setDataValidade}
        onClose={() => setIsDataValidadePickerOpen(false)}
      />
      <RHDatePickerModal
        visible={isDataEmissaoPickerOpen}
        title="Data de emissão"
        value={dataEmissao}
        onSelect={setDataEmissao}
        onClose={() => setIsDataEmissaoPickerOpen(false)}
      />
    </>
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
  const [items, setItems] = useState<ColaboradorContrachequeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    fetchColaboradorContracheques(employee.id)
      .then((detalhe) => {
        if (!cancelled) setItems(detalhe.items);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Erro ao carregar contracheques.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, employee.id]);

  return (
    <RHSmallModal visible={visible} title={`Contracheques — ${employee.fullName}`} onClose={onClose}>
      {isLoading ? (
        <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
      ) : loadError ? (
        <RHEmptyTabState message={`Não foi possível carregar: ${loadError}`} />
      ) : items.length === 0 ? (
        <RHEmptyTabState message="Nenhum contracheque emitido ainda." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={rhStyles.historyCard}>
            <Text style={rhStyles.historyCardTitle}>{item.competenciaLabel}</Text>
            <Text style={rhStyles.historyCardMeta}>
              Líquido: {item.valorLiquido} · Bruto: {item.valorBruto} · Descontos: {item.valorDescontos}
            </Text>
          </View>
        ))
      )}
    </RHSmallModal>
  );
}

const rhReembolsoCategorias: string[] = ['Transporte', 'Alimentação', 'Hospedagem', 'Material', 'Outros'];

const rhReembolsoStatusMeta: Record<string, { label: string; color: string; tint: string }> = {
  rascunho: { label: 'Rascunho', color: '#5E667D', tint: '#EFF1F5' },
  enviado: { label: 'Enviado', color: '#B07A1E', tint: '#FCEFDA' },
  aprovado: { label: 'Aprovado', color: '#3457D5', tint: '#EDF1FF' },
  pago: { label: 'Pago', color: '#18955A', tint: '#E3F5EA' },
  recusado: { label: 'Recusado', color: '#B3261E', tint: '#FBEAEA' },
};

function RegistrarReembolsoFormModal({
  visible,
  onClose,
  onSaved,
  colaboradorId,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (item: ColaboradorReembolsoItem) => void;
  colaboradorId: string;
}) {
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState(rhReembolsoCategorias[0]);
  const [isCategoriaPickerOpen, setIsCategoriaPickerOpen] = useState(false);
  const [dataDespesaLabel, setDataDespesaLabel] = useState(formatDateBR(new Date()));
  const [isDataPickerOpen, setIsDataPickerOpen] = useState(false);
  const [valor, setValor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDescricao('');
      setCategoria(rhReembolsoCategorias[0]);
      setDataDespesaLabel(formatDateBR(new Date()));
      setValor('');
      setObservacoes('');
      setIsSaving(false);
    }
  }, [visible]);

  const handleSubmit = () => {
    const parsedValor = Number(valor.replace(/\./g, '').replace(',', '.'));
    if (!descricao.trim()) {
      Alert.alert('Campo obrigatório', 'Descreva a despesa.');
      return;
    }
    if (!parsedValor || parsedValor <= 0) {
      Alert.alert('Campo obrigatório', 'Informe o valor do reembolso.');
      return;
    }
    setIsSaving(true);
    createColaboradorReembolso({
      colaborador_id: colaboradorId,
      descricao: descricao.trim(),
      categoria,
      data_despesa: brDateLabelToIso(dataDespesaLabel) ?? undefined,
      valor: parsedValor,
      observacoes: observacoes.trim() || undefined,
    })
      .then((item) => {
        onSaved(item);
      })
      .catch((err) => showRhSaveError(err, 'Não foi possível registrar o reembolso.'))
      .finally(() => setIsSaving(false));
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>Registrar reembolso</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.requestFieldLabel}>Descrição *</Text>
              <TextInput
                style={styles.processTextInput}
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Ex.: Corrida de app até a filial"
                placeholderTextColor="#A7AEC2"
              />

              <RHSelectField
                label="Categoria"
                value={categoria}
                onPress={() => setIsCategoriaPickerOpen(true)}
              />

              <View style={rhStyles.formRow}>
                <View style={rhStyles.formRowItem}>
                  <RHSelectField
                    label="Data da despesa"
                    value={dataDespesaLabel}
                    icon="calendar"
                    onPress={() => setIsDataPickerOpen(true)}
                  />
                </View>
                <View style={rhStyles.formRowItem}>
                  <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Valor (R$) *</Text>
                  <TextInput
                    style={styles.processTextInput}
                    value={valor}
                    onChangeText={setValor}
                    placeholder="0,00"
                    placeholderTextColor="#A7AEC2"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Observações</Text>
              <TextInput
                style={[styles.processTextInput, styles.processDocumentationArea]}
                value={observacoes}
                onChangeText={setObservacoes}
                placeholderTextColor="#A7AEC2"
                multiline
                textAlignVertical="top"
              />

              <Pressable
                style={[rhStyles.primaryButtonGreen, styles.spacingTop, isSaving ? { opacity: 0.6 } : null]}
                disabled={isSaving}
                onPress={handleSubmit}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="save" size={15} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Salvar</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>

            <RHDatePickerModal
              inline
              visible={isDataPickerOpen}
              title="Data da despesa"
              value={dataDespesaLabel}
              onSelect={setDataDespesaLabel}
              onClose={() => setIsDataPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isCategoriaPickerOpen}
              title="Categoria"
              options={rhReembolsoCategorias}
              selectedValue={categoria}
              onSelect={setCategoria}
              onClose={() => setIsCategoriaPickerOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function ReembolsosEmployeeModal({
  visible,
  employee,
  onClose,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ColaboradorReembolsoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const reload = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    fetchColaboradorReembolsos(employee.id)
      .then(setItems)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Erro ao carregar reembolsos.'))
      .finally(() => setIsLoading(false));
  }, [employee.id]);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

  return (
    <>
      <RHSmallModal visible={visible} title={`Reembolsos — ${employee.fullName}`} onClose={onClose}>
        <Pressable style={rhStyles.primaryButtonGreenSmall} onPress={() => setIsFormOpen(true)}>
          <Feather name="plus" size={13} color="#FFFFFF" />
          <Text style={rhStyles.primaryButtonSmallText}>Registrar reembolso</Text>
        </Pressable>

        <Text style={[rhStyles.detailSectionHeading, styles.spacingTop]}>Histórico</Text>
        {isLoading ? (
          <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
        ) : loadError ? (
          <RHEmptyTabState message={`Não foi possível carregar: ${loadError}`} />
        ) : items.length === 0 ? (
          <RHEmptyTabState message="Nenhum reembolso registrado." />
        ) : (
          items.map((item) => {
            const statusMeta = rhReembolsoStatusMeta[item.status] ?? rhReembolsoStatusMeta.rascunho;
            return (
              <View key={item.id} style={rhStyles.historyCard}>
                <View style={rhStyles.docCardTopRow}>
                  <Text style={rhStyles.historyCardTitle}>{item.descricao}</Text>
                  <View style={[rhStyles.employeeStatusPill, { backgroundColor: statusMeta.tint }]}>
                    <Text style={[rhStyles.employeeStatusText, { color: statusMeta.color }]}>
                      {statusMeta.label}
                    </Text>
                  </View>
                </View>
                <Text style={rhStyles.historyCardMeta}>
                  R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  {item.categoria ? ` · ${item.categoria}` : ''}
                  {item.data_despesa ? ` · ${formatDateOnlyBR(item.data_despesa)}` : ''}
                </Text>
              </View>
            );
          })
        )}
      </RHSmallModal>

      <RegistrarReembolsoFormModal
        visible={isFormOpen}
        colaboradorId={employee.id}
        onClose={() => setIsFormOpen(false)}
        onSaved={() => {
          setIsFormOpen(false);
          reload();
        }}
      />
    </>
  );
}

const rhFeriasStatusMeta: Record<string, { label: string; color: string; tint: string }> = {
  programada: { label: 'Programada', color: '#B07A1E', tint: '#FCEFDA' },
  em_andamento: { label: 'Em andamento', color: '#3457D5', tint: '#EDF1FF' },
  concluida: { label: 'Concluída', color: '#18955A', tint: '#E3F5EA' },
  cancelada: { label: 'Cancelada', color: '#B3261E', tint: '#FBEAEA' },
};

function RegistrarFeriasFormModal({
  visible,
  onClose,
  onSaved,
  colaboradorId,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (item: ColaboradorFeriasItem) => void;
  colaboradorId: string;
}) {
  const [dataInicioLabel, setDataInicioLabel] = useState('');
  const [dataFimLabel, setDataFimLabel] = useState('');
  const [isInicioPickerOpen, setIsInicioPickerOpen] = useState(false);
  const [isFimPickerOpen, setIsFimPickerOpen] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDataInicioLabel('');
      setDataFimLabel('');
      setObservacoes('');
      setIsSaving(false);
    }
  }, [visible]);

  const handleSubmit = () => {
    const inicioIso = brDateLabelToIso(dataInicioLabel);
    const fimIso = brDateLabelToIso(dataFimLabel);
    if (!inicioIso || !fimIso) {
      Alert.alert('Campos obrigatórios', 'Informe a data de início e a data de fim.');
      return;
    }
    const dias = Math.round((Date.parse(fimIso) - Date.parse(inicioIso)) / (24 * 60 * 60 * 1000)) + 1;
    if (dias <= 0) {
      Alert.alert('Datas inválidas', 'A data de fim precisa ser depois da data de início.');
      return;
    }
    setIsSaving(true);
    createColaboradorFerias({
      colaborador_id: colaboradorId,
      data_inicio: inicioIso,
      data_fim: fimIso,
      dias_planejados: dias,
      observacoes: observacoes.trim() || undefined,
    })
      .then((item) => onSaved(item))
      .catch((err) => showRhSaveError(err, 'Não foi possível registrar as férias.'))
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle}>Nova solicitação de férias</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={rhStyles.formRow}>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Data de início"
                  required
                  value={dataInicioLabel}
                  placeholder="Selecione a data"
                  icon="calendar"
                  onPress={() => setIsInicioPickerOpen(true)}
                />
              </View>
              <View style={rhStyles.formRowItem}>
                <RHSelectField
                  label="Data de fim"
                  required
                  value={dataFimLabel}
                  placeholder="Selecione a data"
                  icon="calendar"
                  onPress={() => setIsFimPickerOpen(true)}
                />
              </View>
            </View>

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Observações</Text>
            <TextInput
              style={[styles.processTextInput, styles.processDocumentationArea]}
              value={observacoes}
              onChangeText={setObservacoes}
              placeholderTextColor="#A7AEC2"
              multiline
              textAlignVertical="top"
            />

            <Pressable
              style={[rhStyles.primaryButtonGreen, styles.spacingTop, isSaving ? { opacity: 0.6 } : null]}
              disabled={isSaving}
              onPress={handleSubmit}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="save" size={15} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Salvar</Text>
                </>
              )}
            </Pressable>
          </ScrollView>

          <RHDatePickerModal
            inline
            visible={isInicioPickerOpen}
            title="Data de início"
            value={dataInicioLabel}
            onSelect={setDataInicioLabel}
            onClose={() => setIsInicioPickerOpen(false)}
          />
          <RHDatePickerModal
            inline
            visible={isFimPickerOpen}
            title="Data de fim"
            value={dataFimLabel}
            onSelect={setDataFimLabel}
            onClose={() => setIsFimPickerOpen(false)}
          />
        </View>
      </View>
    </Modal>
  );
}

function FeriasEmployeeModal({
  visible,
  employee,
  onClose,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ColaboradorFeriasItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const reload = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    fetchColaboradorFerias(employee.id)
      .then(setItems)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Erro ao carregar férias.'))
      .finally(() => setIsLoading(false));
  }, [employee.id]);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

  return (
    <>
      <RHSmallModal visible={visible} title={`Férias — ${employee.fullName}`} onClose={onClose}>
        <Pressable style={rhStyles.primaryButtonGreenSmall} onPress={() => setIsFormOpen(true)}>
          <Feather name="plus" size={13} color="#FFFFFF" />
          <Text style={rhStyles.primaryButtonSmallText}>Nova solicitação</Text>
        </Pressable>

        <Text style={[rhStyles.detailSectionHeading, styles.spacingTop]}>Histórico</Text>
        {isLoading ? (
          <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
        ) : loadError ? (
          <RHEmptyTabState message={`Não foi possível carregar: ${loadError}`} />
        ) : items.length === 0 ? (
          <RHEmptyTabState message="Nenhuma férias registrada." />
        ) : (
          items.map((item) => {
            const statusMeta = rhFeriasStatusMeta[item.status] ?? rhFeriasStatusMeta.programada;
            return (
              <View key={item.id} style={rhStyles.historyCard}>
                <View style={rhStyles.docCardTopRow}>
                  <Text style={rhStyles.historyCardTitle}>
                    {formatDateOnlyBR(item.data_inicio)} → {formatDateOnlyBR(item.data_fim)}
                  </Text>
                  <View style={[rhStyles.employeeStatusPill, { backgroundColor: statusMeta.tint }]}>
                    <Text style={[rhStyles.employeeStatusText, { color: statusMeta.color }]}>
                      {statusMeta.label}
                    </Text>
                  </View>
                </View>
                {item.dias_planejados ? (
                  <Text style={rhStyles.historyCardMeta}>{item.dias_planejados} dia(s)</Text>
                ) : null}
              </View>
            );
          })
        )}
      </RHSmallModal>

      <RegistrarFeriasFormModal
        visible={isFormOpen}
        colaboradorId={employee.id}
        onClose={() => setIsFormOpen(false)}
        onSaved={() => {
          setIsFormOpen(false);
          reload();
        }}
      />
    </>
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
  cargoOptions,
}: {
  visible: boolean;
  salarioAtual: number;
  onClose: () => void;
  onSave: (record: PromotionRecord) => void;
  cargoOptions: string[];
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
        options={[manterCargoLabel, ...cargoOptions]}
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
  cargoOptions,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
  cargoOptions: string[];
}) {
  const [promotions, setPromotions] = useState<RhSalarioHistoricoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const currentSalario = promotions.length > 0 ? Number(promotions[0].salario_novo) || employee.salario : employee.salario;

  const reloadPromocoes = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    return fetchRhPromocoes(employee.id)
      .then(setPromotions)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Erro ao carregar promoções.'))
      .finally(() => setIsLoading(false));
  }, [employee.id]);

  useEffect(() => {
    if (visible) reloadPromocoes();
  }, [visible, reloadPromocoes]);

  const handleSave = (record: PromotionRecord) => {
    const body: Record<string, unknown> = {
      colaborador_id: employee.id,
      salario_novo: record.novoSalario,
      vigencia_inicio: brDateLabelToIso(record.vigenciaLabel) ?? undefined,
      percentual_reajuste: record.percentual ? Number(record.percentual.replace(',', '.')) : undefined,
      motivo: rhPromocaoMotivoLabelToEnum[record.motivo] ?? undefined,
      observacao: record.observacao || undefined,
    };
    createRhPromocao(body)
      .then(async () => {
        if (record.novoCargo) {
          await updateRhColaborador(employee.id, { cargo: record.novoCargo });
        }
      })
      .then(() => {
        setIsFormOpen(false);
        reloadPromocoes();
      })
      .catch((err) => showRhSaveError(err, 'Não foi possível registrar a promoção.'));
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

        {isLoading ? (
          <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
        ) : loadError ? (
          <RHEmptyTabState message={`Não foi possível carregar: ${loadError}`} />
        ) : promotions.length === 0 ? (
          <RHEmptyTabState message="Nenhum registro ainda." />
        ) : (
          promotions.map((record) => (
            <View key={record.id} style={rhStyles.historyCard}>
              <Text style={rhStyles.historyCardTitle}>{record.motivo ?? 'Reajuste'}</Text>
              <Text style={rhStyles.historyCardMeta}>
                Novo salário: R${' '}
                {(Number(record.salario_novo) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                {record.percentual_reajuste ? ` (${record.percentual_reajuste}%)` : ''}
              </Text>
              <Text style={rhStyles.historyCardMeta}>
                Vigência: {formatDateOnlyBR(record.vigencia_inicio)}
              </Text>
            </View>
          ))
        )}
      </RHSmallModal>

      <RegistrarPromocaoFormModal
        visible={isFormOpen}
        salarioAtual={currentSalario}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        cargoOptions={cargoOptions}
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
  const [premiacoes, setPremiacoes] = useState<RhPremiacaoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const totalPago = premiacoes
    .filter((item) => item.status === 'paga' || item.pago_em_folha)
    .reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
  const totalPendente = premiacoes
    .filter((item) => item.status && item.status !== 'paga' && !item.pago_em_folha)
    .reduce((sum, item) => sum + (Number(item.valor) || 0), 0);

  const reloadPremiacoes = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    return fetchRhPremiacoes(employee.id)
      .then(setPremiacoes)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Erro ao carregar premiações.'))
      .finally(() => setIsLoading(false));
  }, [employee.id]);

  useEffect(() => {
    if (visible) reloadPremiacoes();
  }, [visible, reloadPremiacoes]);

  const handleSave = (record: PremiacaoRecord) => {
    const body: Record<string, unknown> = {
      colaborador_id: employee.id,
      valor: record.valor,
      tipo: record.tipo,
      data_pagamento: brDateLabelToIso(record.dataLabel) ?? undefined,
      observacoes: record.observacao || undefined,
    };
    createRhPremiacao(body)
      .then(() => {
        setIsFormOpen(false);
        reloadPremiacoes();
      })
      .catch((err) => showRhSaveError(err, 'Não foi possível registrar a premiação.'));
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
            <Text style={[rhStyles.trainingStatValue, { color: '#B07A1E' }]}>
              R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
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
        {isLoading ? (
          <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
        ) : loadError ? (
          <RHEmptyTabState message={`Não foi possível carregar: ${loadError}`} />
        ) : premiacoes.length === 0 ? (
          <RHEmptyTabState message={`Nenhuma premiação em ${currentYear}.`} />
        ) : (
          premiacoes.map((record) => (
            <View key={record.id} style={rhStyles.historyCard}>
              <Text style={rhStyles.historyCardTitle}>{record.motivo ?? 'Premiação'}</Text>
              <Text style={rhStyles.historyCardMeta}>
                R$ {(Number(record.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ·{' '}
                {formatDateOnlyBR(record.data_pagamento ?? record.competencia)}
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
  cargoOptions,
  unidadeOptions,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
  onSave: (record: EmployeeTransferRecord) => void;
  cargoOptions: string[];
  unidadeOptions: string[];
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
        options={unidadeOptions.filter((unit) => unit !== employee.unit)}
        selectedValue={unidadeDestino}
        onSelect={setUnidadeDestino}
        onClose={() => setIsUnidadePickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isCargoPickerOpen}
        title="Novo cargo"
        options={cargoOptions}
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
  cargoOptions,
  unidadeOptions,
  unidadesReais,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
  cargoOptions: string[];
  unidadeOptions: string[];
  unidadesReais: RhUnidadeItem[];
}) {
  const [records, setRecords] = useState<RhTransferenciaColaboradorItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const reloadTransferencias = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    return fetchRhTransferenciasColaborador(employee.id)
      .then(setRecords)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Erro ao carregar transferências.'))
      .finally(() => setIsLoading(false));
  }, [employee.id]);

  useEffect(() => {
    if (visible) reloadTransferencias();
  }, [visible, reloadTransferencias]);

  const pendentes = records.filter((item) => item.status === 'pendente').length;
  const aprovadas = records.filter((item) => item.status === 'aprovada').length;
  const efetivadas = records.filter((item) => item.status === 'efetivada').length;

  const handleSave = (record: EmployeeTransferRecord) => {
    const empresaDestino = unidadesReais.find((item) => item.nome === record.toUnit);
    if (!empresaDestino) {
      Alert.alert('Unidade não encontrada', 'Não foi possível identificar a unidade de destino selecionada.');
      return;
    }
    const body: Record<string, unknown> = {
      colaborador_id: employee.id,
      empresa_destino_id: empresaDestino.id,
      data_vigencia: brDateLabelToIso(record.vigenciaLabel) ?? undefined,
      setor_destino: record.novoSetor || undefined,
      cargo_destino: record.novoCargo || undefined,
      salario_novo: record.novoSalario || undefined,
      motivo: rhTransferMotivoLabelToEnum[record.motivo] ?? undefined,
      rateio_folha: rhRateioLabelToEnum[record.rateio] ?? undefined,
      observacao: record.observacao || undefined,
      efetivar: record.status === 'aprovada',
    };
    createRhTransferencia(body)
      .then(() => {
        setIsFormOpen(false);
        reloadTransferencias();
      })
      .catch((err) => showRhSaveError(err, 'Não foi possível registrar a transferência.'));
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
          {isLoading ? (
            <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
          ) : loadError ? (
            <RHEmptyTabState message={`Não foi possível carregar: ${loadError}`} />
          ) : records.length === 0 ? (
            <RHEmptyTabState message="Nenhuma transferência registrada." />
          ) : (
            records.map((record) => {
              const statusMeta = rhTransferStatusMeta[(record.status as TransferStatus) ?? 'pendente'] ?? rhTransferStatusMeta.pendente;
              return (
                <View key={record.id} style={rhStyles.historyCard}>
                  <View style={rhStyles.docCardTopRow}>
                    <Text style={rhStyles.historyCardTitle}>{record.cargo_destino ?? 'Transferência'}</Text>
                    <View style={[rhStyles.employeeStatusPill, { backgroundColor: statusMeta.tint }]}>
                      <Text style={[rhStyles.employeeStatusText, { color: statusMeta.color }]}>
                        {statusMeta.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={rhStyles.historyCardMeta}>
                    {record.setor_destino ?? '—'} · R${' '}
                    {(Number(record.salario_novo) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={rhStyles.historyCardMeta}>
                    Vigência: {formatDateOnlyBR(record.data_vigencia)} · Motivo: {record.motivo ?? '—'}
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
        cargoOptions={cargoOptions}
        unidadeOptions={unidadeOptions}
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
    cpf: formatCpfInput(employee.cpf),
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
  cargoOptions,
  unidadeOptions,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
  onSave: (updated: Employee) => void;
  cargoOptions: string[];
  unidadeOptions: string[];
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                onChangeText={(text) => setForm((current) => ({ ...current, cpf: formatCpfInput(text) }))}
                placeholder="000.000.000-00"
                placeholderTextColor="#A7AEC2"
                keyboardType="number-pad"
                maxLength={14}
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

              <View style={[rhStyles.portalAccessCard, styles.spacingTop]}>
                <Text style={rhStyles.portalAccessTitle}>{form.email || 'E-mail corporativo não informado'}</Text>
                <Text style={rhStyles.portalAccessSubtitle}>
                  {employee.status === 'ativo'
                    ? 'Acesso ao portal ativo'
                    : 'Status do portal não disponível'}
                </Text>
                <Pressable
                  style={rhStyles.portalAccessButton}
                  onPress={() =>
                    Alert.alert(
                      'Reenviar boas-vindas ainda não disponível',
                      'Esta ação depende de um endpoint de e-mail/portal no Lovable que ainda não está liberado.'
                    )
                  }
                >
                  <Feather name="send" size={14} color="#29448D" />
                  <Text style={rhStyles.portalAccessButtonText}>Reenviar boas-vindas</Text>
                </Pressable>
              </View>

              <View style={[rhStyles.dangerCard, styles.spacingTop]}>
                <Text style={rhStyles.dangerCardTitle}>Inativar colaborador</Text>
                <Text style={rhStyles.dangerCardText}>
                  Bloqueia o e-mail corporativo e revoga o acesso ao portal imediatamente.
                </Text>
                <Pressable
                  style={rhStyles.dangerButton}
                  onPress={() =>
                    Alert.alert(
                      'Inativação ainda não disponível',
                      'Esta ação depende de um endpoint de e-mail/portal no Lovable que ainda não está liberado.'
                    )
                  }
                >
                  <Feather name="slash" size={14} color="#FFFFFF" />
                  <Text style={rhStyles.dangerButtonText}>Inativar colaborador</Text>
                </Pressable>
              </View>

              <Pressable style={[rhStyles.primaryButtonGreen, styles.spacingTop]} onPress={handleSubmit}>
                <Feather name="save" size={15} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Salvar</Text>
              </Pressable>
            </ScrollView>

            {/* Pickers renderizados DENTRO do mesmo <Modal> (inline=true, sem
                <Modal> próprio) — dois <Modal> nativos empilhados podiam
                fazer o segundo não receber toque em alguns aparelhos. */}
            <RHSimplePickerModal
              inline
              visible={isCargoPickerOpen}
              title="Cargo"
              options={cargoOptions}
              selectedValue={form.role}
              onSelect={(value) => setForm((current) => ({ ...current, role: value }))}
              onClose={() => setIsCargoPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isSetorPickerOpen}
              title="Setor"
              options={rhSetoresList}
              selectedValue={form.setor}
              onSelect={(value) => setForm((current) => ({ ...current, setor: value }))}
              onClose={() => setIsSetorPickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
              visible={isUnidadePickerOpen}
              title="Unidade"
              options={unidadeOptions}
              selectedValue={form.unit}
              onSelect={(value) => setForm((current) => ({ ...current, unit: value }))}
              onClose={() => setIsUnidadePickerOpen(false)}
            />
            <RHSimplePickerModal
              inline
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
          </View>
        </View>
      </Modal>
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

// Vincula/desvincula o colaborador a um login existente (rh_colaboradores.
// profile_id) — liberado pela Lovable em 03/08/2026, mesmo endpoint que já
// usamos pra Dados Pessoais (PATCH /api/rh/colaboradores/:id). Sem isso, o
// colaborador nunca vê dado real no app dele (fica "sem vínculo no RH").
function VincularLoginModal({
  visible,
  employee,
  onClose,
  onLinked,
}: {
  visible: boolean;
  employee: Employee;
  onClose: () => void;
  onLinked: (profileId: string | null) => void;
}) {
  const [usuarios, setUsuarios] = useState<AdminUsuarioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setIsLoading(true);
    setErrorMessage(null);
    fetchAdminUsuarios()
      .then((detalhe) => setUsuarios(detalhe.usuarios))
      .catch((err) => setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os logins.'))
      .finally(() => setIsLoading(false));
  }, [visible]);

  const filtered = usuarios.filter((usuario) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (usuario.fullName ?? '').toLowerCase().includes(term) || usuario.email.toLowerCase().includes(term);
  });

  const handleLink = (usuario: AdminUsuarioItem) => {
    setSavingId(usuario.id);
    updateRhColaborador(employee.id, { profile_id: usuario.id })
      .then(() => {
        Alert.alert('Vinculado', `Login de ${usuario.email} vinculado a este colaborador.`);
        onLinked(usuario.id);
        onClose();
      })
      .catch((err) => showRhSaveError(err, 'Não foi possível vincular este login.'))
      .finally(() => setSavingId(null));
  };

  const handleUnlink = () => {
    setSavingId('__unlink__');
    updateRhColaborador(employee.id, { profile_id: null })
      .then(() => {
        Alert.alert('Desvinculado', 'O login foi desvinculado deste colaborador.');
        onLinked(null);
        onClose();
      })
      .catch((err) => showRhSaveError(err, 'Não foi possível desvincular.'))
      .finally(() => setSavingId(null));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle}>Acesso ao Portal</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          {employee.profileId ? (
            <View style={[rhStyles.portalAccessCard, styles.spacingTop]}>
              <Text style={rhStyles.portalAccessTitle}>Login vinculado</Text>
              <Text style={rhStyles.portalAccessSubtitle}>
                Este colaborador já tem um login do portal vinculado (profile_id: {employee.profileId}).
              </Text>
              <Pressable style={rhStyles.dangerButton} onPress={handleUnlink} disabled={savingId === '__unlink__'}>
                <Feather name="link-2" size={14} color="#FFFFFF" />
                <Text style={rhStyles.dangerButtonText}>
                  {savingId === '__unlink__' ? 'Desvinculando...' : 'Desvincular'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>
              Sem login vinculado ainda — escolha um usuário do Admin &gt; Usuários para liberar o app deste
              colaborador.
            </Text>
          )}

          <TextInput
            style={[styles.processTextInput, styles.spacingTop]}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome ou e-mail..."
            placeholderTextColor="#A7AEC2"
            autoCapitalize="none"
          />

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <Text style={styles.conversaEmptyText}>Carregando usuários...</Text>
            ) : errorMessage ? (
              <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
            ) : filtered.length === 0 ? (
              <Text style={styles.conversaEmptyText}>Nenhum usuário encontrado.</Text>
            ) : (
              filtered.map((usuario) => (
                <Pressable
                  key={usuario.id}
                  style={styles.templateOptionRow}
                  onPress={() => handleLink(usuario)}
                  disabled={savingId === usuario.id}
                >
                  <View style={styles.templateOptionLeft}>
                    <Text style={styles.templateOptionText}>{usuario.fullName || usuario.email}</Text>
                    <Text style={rhStyles.employeeMetaRowText}>{usuario.email}</Text>
                  </View>
                  {savingId === usuario.id ? (
                    <Text style={rhStyles.employeeMetaRowText}>Vinculando...</Text>
                  ) : (
                    <Feather name="chevron-right" size={16} color="#B9C0D3" />
                  )}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  const [unidadesReais, setUnidadesReais] = useState<RhUnidadeItem[]>([]);
  const [cargosReais, setCargosReais] = useState<{ id: string; nome: string }[]>([]);
  const [setoresReais, setSetoresReais] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchRhUnidades(), fetchRhCargos(), fetchRhSetores()])
      .then(([unidadesResult, cargosResult, setoresResult]) => {
        if (!isMounted) return;
        setUnidadesReais(unidadesResult);
        setCargosReais(cargosResult);
        setSetoresReais(setoresResult);
      })
      .catch(() => {
        // Silencioso: os pickers de Cargo/Unidade/Setor caem para lista
        // vazia, sem travar o restante da tela de detalhe do colaborador.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const setorOptions = useMemo(
    () => setoresReais.map((setor) => setor.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [setoresReais]
  );
  const unidadeOptions = useMemo(
    () => unidadesReais.map((unidade) => unidade.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [unidadesReais]
  );
  const cargoOptions = useMemo(
    () => cargosReais.map((cargo) => cargo.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [cargosReais]
  );

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

  const handleLinkedProfile = (profileId: string | null) => {
    setEmployees((current) => current.map((item) => (item.id === employee.id ? { ...item, profileId } : item)));
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
        cargoOptions={cargoOptions}
        unidadeOptions={unidadeOptions}
      />

      <DadosPessoaisModal
        visible={activeQuickAction === 'dadosPessoais'}
        employee={employee}
        onClose={() => setActiveQuickAction(null)}
        cargoOptions={cargoOptions}
        setorOptions={setorOptions}
      />
      <VincularLoginModal
        visible={activeQuickAction === 'acessoLogin'}
        employee={employee}
        onClose={() => setActiveQuickAction(null)}
        onLinked={handleLinkedProfile}
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
      <FeriasEmployeeModal
        visible={activeQuickAction === 'ferias'}
        employee={employee}
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
        cargoOptions={cargoOptions}
      />
      <PremiacoesModal
        visible={activeQuickAction === 'premiacoes'}
        employee={employee}
        onClose={() => setActiveQuickAction(null)}
      />
      <ReembolsosEmployeeModal
        visible={activeQuickAction === 'reembolsos'}
        employee={employee}
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
        cargoOptions={cargoOptions}
        unidadeOptions={unidadeOptions}
        unidadesReais={unidadesReais}
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

// ---------- Pré-Contratados / Conformidade de Admissões ----------
// Fluxo de admissão (documentos do candidato → validação do RH →
// contabilidade → ASO → retorno da contabilidade → efetivação), tabela
// rs_admissoes + filhas. Endpoint unificado confirmado pela Lovable em
// 12/08/2026 (/api/public/internal/admissao-conformidade) — a mesma regra de
// derivação de etapa/atraso do site é usada do lado deles, então essa tela
// nunca diverge do painel web. "0 processo(s)" aparece de verdade quando
// rs_admissoes está vazia, não é mock.

const rhAdmissaoStatusMeta: Record<string, { label: string; color: string; tint: string }> = {
  documentos_pendentes: { label: 'Aguardando documentos', color: '#B07A1E', tint: '#FCEFDA' },
  em_validacao: { label: 'Em validação do RH', color: '#3457D5', tint: '#EDF1FF' },
  enviado_contabilidade: { label: 'Na contabilidade', color: '#3457D5', tint: '#EDF1FF' },
  retorno_contabilidade: { label: 'Retorno da contabilidade', color: '#B07A1E', tint: '#FCEFDA' },
  admitido: { label: 'Admitido', color: '#18955A', tint: '#E3F5EA' },
  cancelado: { label: 'Cancelado', color: '#B3261E', tint: '#FBEAEA' },
};

const rhAdmissaoStatusFilterOptions: Array<{ label: string; value?: string }> = [
  { label: 'Todos' },
  { label: 'Aguardando documentos', value: 'documentos_pendentes' },
  { label: 'Em validação do RH', value: 'em_validacao' },
  { label: 'Na contabilidade', value: 'enviado_contabilidade' },
  { label: 'Retorno da contabilidade', value: 'retorno_contabilidade' },
  { label: 'Admitido', value: 'admitido' },
  { label: 'Cancelado', value: 'cancelado' },
];

const rhAdmissaoEtapaIcons: Record<string, keyof typeof Feather.glyphMap> = {
  documentos_pendentes: 'file-text',
  em_validacao: 'user-check',
  enviado_contabilidade: 'briefcase',
  aso: 'activity',
  retorno_contabilidade: 'check-circle',
};

function EditarSlaModal({
  visible,
  prazo,
  onClose,
  onSaved,
}: {
  visible: boolean;
  prazo: AdmissaoConformidadeDetalhe['prazos'][number] | null;
  onClose: () => void;
  onSaved: (updated: AdmissaoConformidadeDetalhe['prazos'][number]) => void;
}) {
  const [dias, setDias] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && prazo) setDias(String(prazo.dias));
  }, [visible, prazo]);

  const handleSave = () => {
    if (!prazo) return;
    const parsed = parseInt(dias, 10);
    if (!parsed || parsed < 1) {
      Alert.alert('Valor inválido', 'Informe um número de dias maior que zero.');
      return;
    }
    setIsSaving(true);
    updateAdmissaoPrazo(prazo.id, parsed)
      .then((updated) => {
        onSaved(updated);
        onClose();
      })
      .catch((err) => showRhSaveError(err, 'Não foi possível atualizar o SLA.'))
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={[styles.requestModalCard, { maxWidth: 340 }]}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle}>SLA — {prazo?.rotulo}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>
          <Text style={styles.requestFieldLabel}>Dias</Text>
          <TextInput
            style={styles.processTextInput}
            value={dias}
            onChangeText={(text) => setDias(text.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="Ex.: 5"
            placeholderTextColor="#A7AEC2"
          />
          <Pressable
            style={[rhStyles.primaryButtonGreen, styles.spacingTop, isSaving ? { opacity: 0.6 } : null]}
            disabled={isSaving}
            onPress={handleSave}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="save" size={15} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Salvar</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function useAdmissaoConformidade(params: {
  inicio?: string;
  fim?: string;
  empresaId?: string;
  responsavelId?: string;
  etapa?: string;
  status?: string;
  busca?: string;
  incluirEncerradas?: 0 | 1;
}) {
  const [data, setData] = useState<AdmissaoConformidadeDetalhe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const paramsKey = JSON.stringify(params);

  const reload = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    return fetchAdmissaoConformidade(JSON.parse(paramsKey))
      .then(setData)
      .catch((err) => setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar.'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    const timer = setTimeout(reload, 250);
    return () => clearTimeout(timer);
  }, [reload]);

  return { data, isLoading, errorMessage, reload, setData };
}

export function RHPreContratadosScreen({ navigation }: ScreenProps<'RHPreContratados'>) {
  const [statusFilter, setStatusFilter] = useState(rhAdmissaoStatusFilterOptions[0].label);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const statusValue = rhAdmissaoStatusFilterOptions.find((item) => item.label === statusFilter)?.value;

  const { data, isLoading, errorMessage, reload } = useAdmissaoConformidade({
    status: statusValue,
    incluirEncerradas: 0,
  });

  const processos = data?.linhas ?? [];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={rhUserInitials} variant="rh" onAvatarPress={() => navigation.navigate('RHProfile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader
          icon="user-check"
          title="Pré-Contratados"
          subtitle="Admissões em andamento: documentos do candidato, validação, contabilidade e efetivação."
        />

        <View style={rhStyles.filterPillRow}>
          <RHFilterPill label={statusFilter} onPress={() => setIsStatusFilterOpen(true)} />
          <Pressable style={rhStyles.secondaryIconButton} onPress={reload}>
            <Feather name="refresh-cw" size={14} color="#15203E" />
            <Text style={rhStyles.secondaryIconButtonText}>Atualizar</Text>
          </Pressable>
        </View>

        <View style={rhStyles.sectionHeaderRow}>
          <View />
          <Text style={rhStyles.sectionHeaderMeta}>{processos.length} processo(s)</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
        ) : errorMessage ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>{errorMessage}</Text>
          </View>
        ) : processos.length === 0 ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Nenhum processo de admissão neste filtro.</Text>
          </View>
        ) : (
          processos.map((item) => {
            const statusMeta = rhAdmissaoStatusMeta[item.status] ?? rhAdmissaoStatusMeta.documentos_pendentes;
            return (
              <View key={item.id} style={rhStyles.historyCard}>
                <View style={rhStyles.docCardTopRow}>
                  <Text style={rhStyles.historyCardTitle} numberOfLines={1}>
                    {item.candidato}
                  </Text>
                  <View style={[rhStyles.employeeStatusPill, { backgroundColor: statusMeta.tint }]}>
                    <Text style={[rhStyles.employeeStatusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                  </View>
                </View>
                <Text style={rhStyles.historyCardMeta}>
                  {item.cargo ?? '—'} · {item.empresa ?? '—'}
                </Text>
                <Text style={rhStyles.historyCardMeta}>
                  Etapa: {item.etapa_rotulo} · {item.dias_na_etapa} dia(s){item.atrasada ? ' · atrasada' : ''}
                  {item.prazo_dias ? ` (SLA ${item.prazo_dias}d)` : ''}
                </Text>
                {item.docs_pendentes > 0 || item.solicitacoes_pendentes > 0 ? (
                  <Text style={[rhStyles.historyCardMeta, { color: '#B07A1E' }]}>
                    {item.docs_pendentes} doc(s) pendente(s) · {item.solicitacoes_pendentes} pendência(s)
                  </Text>
                ) : null}
                <Text style={rhStyles.historyCardMeta}>Responsável: {item.responsavel ?? '—'}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <RHSimplePickerModal
        visible={isStatusFilterOpen}
        title="Status do processo"
        options={rhAdmissaoStatusFilterOptions.map((item) => item.label)}
        selectedValue={statusFilter}
        onSelect={setStatusFilter}
        onClose={() => setIsStatusFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
function firstDayOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function RHConformidadeAdmissoesScreen({ navigation }: ScreenProps<'RHConformidadeAdmissoes'>) {
  const [deLabel, setDeLabel] = useState(formatDateBR(firstDayOfCurrentMonth()));
  const [ateLabel, setAteLabel] = useState(formatDateBR(new Date()));
  const [isDeModalOpen, setIsDeModalOpen] = useState(false);
  const [isAteModalOpen, setIsAteModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [unidadeFilter, setUnidadeFilter] = useState('Todas');
  const [responsavelFilter, setResponsavelFilter] = useState('Todos');
  const [etapaFilter, setEtapaFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState(rhAdmissaoStatusFilterOptions[0].label);
  const [isUnidadeFilterOpen, setIsUnidadeFilterOpen] = useState(false);
  const [isResponsavelFilterOpen, setIsResponsavelFilterOpen] = useState(false);
  const [isEtapaFilterOpen, setIsEtapaFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [unidadesReais, setUnidadesReais] = useState<RhUnidadeItem[]>([]);
  const [editingPrazo, setEditingPrazo] = useState<AdmissaoConformidadeDetalhe['prazos'][number] | null>(null);
  // Acumula responsável(nome->id) visto nas "linhas" pra poder filtrar por
  // responsavel_id (por_responsavel só devolve o nome, não o id).
  const [responsavelNameToId, setResponsavelNameToId] = useState<Record<string, string>>({});
  // Guarda a última lista de etapas (etapa+rótulo) vinda do backend num
  // estado à parte — precisa existir ANTES da chamada do hook de fetch (que
  // usa o valor do filtro de etapa como parâmetro), então não pode vir
  // direto de "data" (que só existe depois dessa mesma chamada).
  const [etapaOptionsState, setEtapaOptionsState] = useState<AdmissaoConformidadeDetalhe['por_etapa']>([]);

  useEffect(() => {
    let isMounted = true;
    fetchRhUnidades()
      .then((rows) => {
        if (isMounted) setUnidadesReais(rows);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const unidadeFilterOptions = useMemo(
    () => ['Todas', ...unidadesReais.map((unidade) => unidade.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'))],
    [unidadesReais]
  );
  const empresaId = unidadeFilter === 'Todas' ? undefined : unidadesReais.find((u) => u.nome === unidadeFilter)?.id;
  const statusValue = rhAdmissaoStatusFilterOptions.find((item) => item.label === statusFilter)?.value;
  const etapaLabelToValue = useMemo(() => {
    const map = new Map<string, string>();
    etapaOptionsState.forEach((item) => map.set(item.rotulo, item.etapa));
    return map;
  }, [etapaOptionsState]);
  const etapaValue = etapaFilter === 'Todas' ? undefined : etapaLabelToValue.get(etapaFilter);
  const responsavelId = responsavelFilter === 'Todos' ? undefined : responsavelNameToId[responsavelFilter];

  const { data, isLoading, errorMessage, reload, setData } = useAdmissaoConformidade({
    inicio: brDateLabelToIso(deLabel) ?? undefined,
    fim: brDateLabelToIso(ateLabel) ?? undefined,
    empresaId,
    responsavelId,
    etapa: etapaValue,
    status: statusValue,
    busca: search || undefined,
    incluirEncerradas: 1,
  });

  useEffect(() => {
    if (!data) return;
    setResponsavelNameToId((current) => {
      const next = { ...current };
      data.linhas.forEach((linha) => {
        if (linha.responsavel && linha.responsavel_id) next[linha.responsavel] = linha.responsavel_id;
      });
      return next;
    });
    if (data.por_etapa.length > 0) setEtapaOptionsState(data.por_etapa);
  }, [data]);

  const responsavelFilterOptions = useMemo(
    () => ['Todos', ...Object.keys(responsavelNameToId).sort((a, b) => a.localeCompare(b, 'pt-BR'))],
    [responsavelNameToId]
  );
  // O picker (RHSimplePickerModal) só mostra/seleciona strings simples, então
  // o filtro guarda o RÓTULO (rotulo) — igual usuária vê — e etapaLabelToValue
  // (acima) resolve de volta pro slug que o endpoint espera.
  const etapaFilterOptions = useMemo(
    () => ['Todas', ...etapaOptionsState.map((item) => item.rotulo)],
    [etapaOptionsState]
  );

  const kpis = data?.resumo ?? {
    iniciadas: 0,
    abertas: 0,
    atrasadas: 0,
    concluidas: 0,
    canceladas: 0,
    solicitacoes_pendentes: 0,
  };
  const porEtapa = data?.por_etapa ?? [];
  const porResponsavel = data?.por_responsavel ?? [];
  const admissoes = data?.linhas ?? [];

  const handleExport = (formato: 'CSV' | 'PDF') => {
    Alert.alert(
      'Ainda não disponível',
      `Exportar em ${formato} ainda não foi confirmado pela Lovable pra esse endpoint.`
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={rhUserInitials} variant="rh" onAvatarPress={() => navigation.navigate('RHProfile')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RHPageHeader
          icon="clipboard"
          title="Conformidade de Admissões"
          subtitle="Pendências, prazos e atrasos por etapa e responsável no fluxo de admissão."
        />

        <View style={styles.directorFilterRow}>
          <Pressable style={styles.directorFilterPill} onPress={() => setIsDeModalOpen(true)}>
            <Feather name="calendar" size={14} color="#5E667D" />
            <Text style={styles.directorFilterPillText}>{deLabel}</Text>
          </Pressable>
          <Text style={styles.directorFilterUntilText}>até</Text>
          <Pressable style={styles.directorFilterPill} onPress={() => setIsAteModalOpen(true)}>
            <Feather name="calendar" size={14} color="#5E667D" />
            <Text style={styles.directorFilterPillText}>{ateLabel}</Text>
          </Pressable>
        </View>

        <View style={rhStyles.filterPillRow}>
          <Pressable style={rhStyles.secondaryIconButton} onPress={reload}>
            <Feather name="refresh-cw" size={14} color="#15203E" />
            <Text style={rhStyles.secondaryIconButtonText}>{isLoading ? 'Atualizando...' : 'Atualizar'}</Text>
          </Pressable>
          <Pressable style={rhStyles.secondaryIconButton} onPress={() => handleExport('CSV')}>
            <Feather name="download" size={14} color="#15203E" />
            <Text style={rhStyles.secondaryIconButtonText}>CSV</Text>
          </Pressable>
          <Pressable style={rhStyles.secondaryIconButton} onPress={() => handleExport('PDF')}>
            <Feather name="file-text" size={14} color="#15203E" />
            <Text style={rhStyles.secondaryIconButtonText}>PDF</Text>
          </Pressable>
        </View>

        <View style={rhStyles.filterFieldsCard}>
          <Text style={rhStyles.filterFieldLabel}>Buscar</Text>
          <View style={rhStyles.searchRow}>
            <Feather name="search" size={16} color="#9AA1B5" />
            <TextInput
              style={rhStyles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Candidato, cargo, responsável..."
              placeholderTextColor="#A7AEC2"
            />
          </View>

          <RHFilterSelectField label="Unidade" value={unidadeFilter} onPress={() => setIsUnidadeFilterOpen(true)} />
          <RHFilterSelectField
            label="Responsável"
            value={responsavelFilter}
            onPress={() => setIsResponsavelFilterOpen(true)}
          />
          <RHFilterSelectField label="Etapa" value={etapaFilter} onPress={() => setIsEtapaFilterOpen(true)} />
          <RHFilterSelectField label="Status" value={statusFilter} onPress={() => setIsStatusFilterOpen(true)} />
        </View>

        {errorMessage ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={rhStyles.conformidadeKpiCard}>
          <View style={rhStyles.conformidadeKpiItem}>
            <Text style={rhStyles.conformidadeKpiValue}>{kpis.iniciadas}</Text>
            <Text style={rhStyles.conformidadeKpiLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              Iniciadas
            </Text>
          </View>
          <View style={rhStyles.conformidadeKpiDivider} />
          <View style={rhStyles.conformidadeKpiItem}>
            <Text style={rhStyles.conformidadeKpiValue}>{kpis.abertas}</Text>
            <Text style={rhStyles.conformidadeKpiLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              Em aberto
            </Text>
          </View>
          <View style={rhStyles.conformidadeKpiDivider} />
          <View style={rhStyles.conformidadeKpiItem}>
            <Text style={rhStyles.conformidadeKpiValue}>{kpis.atrasadas}</Text>
            <Text style={rhStyles.conformidadeKpiLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              Atrasadas
            </Text>
          </View>
          <View style={rhStyles.conformidadeKpiDivider} />
          <View style={rhStyles.conformidadeKpiItem}>
            <Text style={rhStyles.conformidadeKpiValue}>{kpis.concluidas}</Text>
            <Text style={rhStyles.conformidadeKpiLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              Concluídas
            </Text>
          </View>
          <View style={rhStyles.conformidadeKpiDivider} />
          <View style={rhStyles.conformidadeKpiItem}>
            <Text style={rhStyles.conformidadeKpiValue}>{kpis.solicitacoes_pendentes}</Text>
            <Text style={rhStyles.conformidadeKpiLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              Pendências
            </Text>
          </View>
        </View>

        <View style={rhStyles.sectionHeaderRow}>
          <Text style={rhStyles.sectionTitle}>POR ETAPA</Text>
        </View>
        {isLoading && porEtapa.length === 0 ? (
          <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
        ) : (
          porEtapa.map((item) => (
            <View key={item.etapa} style={[rhStyles.etapaCard, item.atrasadas > 0 ? rhStyles.etapaCardAlert : null]}>
              <View style={rhStyles.etapaCardHeader}>
                <Feather name={rhAdmissaoEtapaIcons[item.etapa] ?? 'folder'} size={13} color="#5E667D" />
                <Text style={rhStyles.etapaCardTitle} numberOfLines={1}>
                  {item.rotulo}
                </Text>
                <Pressable
                  style={rhStyles.etapaSlaPill}
                  onPress={() =>
                    setEditingPrazo(
                      data?.prazos.find((p) => p.etapa === item.etapa) ?? {
                        id: '',
                        etapa: item.etapa,
                        rotulo: item.rotulo,
                        dias: item.prazo_dias,
                        ordem: 0,
                      }
                    )
                  }
                >
                  <Text style={rhStyles.etapaSlaPillText}>SLA {item.prazo_dias}d</Text>
                  <Feather name="edit-2" size={10} color="#1B6E3A" />
                </Pressable>
              </View>

              <View style={rhStyles.etapaStatsRow}>
                <View style={rhStyles.etapaStatItem}>
                  <Text style={rhStyles.etapaStatValue}>{item.total}</Text>
                  <Text style={rhStyles.etapaStatLabel}>Em aberto</Text>
                </View>
                <View style={rhStyles.etapaStatDivider} />
                <View style={rhStyles.etapaStatItem}>
                  <Text style={[rhStyles.etapaStatValue, { color: '#B07A1E' }]}>{item.atrasadas}</Text>
                  <Text style={rhStyles.etapaStatLabel}>Atrasadas</Text>
                </View>
                <View style={rhStyles.etapaStatDivider} />
                <View style={rhStyles.etapaStatItem}>
                  <Text style={rhStyles.etapaStatValue}>{item.media_dias}</Text>
                  <Text style={rhStyles.etapaStatLabel}>Média (dias)</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={rhStyles.sectionHeaderRow}>
          <Text style={rhStyles.sectionTitle}>POR RESPONSÁVEL</Text>
        </View>
        {porResponsavel.length === 0 ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Nenhum responsável com pendência no período.</Text>
          </View>
        ) : (
          porResponsavel.map((item) => (
            <View key={item.responsavel} style={rhStyles.historyCard}>
              <Text style={rhStyles.historyCardTitle}>{item.responsavel}</Text>
              <Text style={rhStyles.historyCardMeta}>
                {item.total} total · {item.abertas} em aberto · {item.atrasadas} atrasada(s)
              </Text>
            </View>
          ))
        )}

        <View style={rhStyles.sectionHeaderRow}>
          <Text style={rhStyles.sectionTitle}>ADMISSÕES NO PERÍODO</Text>
          <Text style={rhStyles.sectionHeaderMeta}>{admissoes.length} registro(s)</Text>
        </View>
        {isLoading && admissoes.length === 0 ? (
          <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
        ) : admissoes.length === 0 ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Nenhuma admissão para os filtros selecionados.</Text>
          </View>
        ) : (
          admissoes.map((item) => {
            const statusMeta = rhAdmissaoStatusMeta[item.status] ?? rhAdmissaoStatusMeta.documentos_pendentes;
            return (
              <View key={item.id} style={rhStyles.historyCard}>
                <View style={rhStyles.docCardTopRow}>
                  <Text style={rhStyles.historyCardTitle} numberOfLines={1}>
                    {item.candidato}
                  </Text>
                  <View style={[rhStyles.employeeStatusPill, { backgroundColor: statusMeta.tint }]}>
                    <Text style={[rhStyles.employeeStatusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                  </View>
                </View>
                <Text style={rhStyles.historyCardMeta}>
                  {item.cargo ?? '—'} · {item.empresa ?? '—'}
                </Text>
                <Text style={rhStyles.historyCardMeta}>
                  Etapa: {item.etapa_rotulo} · {item.dias_na_etapa} dia(s){item.atrasada ? ' · atrasada' : ''}
                </Text>
                {item.docs_pendentes > 0 || item.solicitacoes_pendentes > 0 ? (
                  <Text style={[rhStyles.historyCardMeta, { color: '#B07A1E' }]}>
                    {item.docs_pendentes} doc(s) pendente(s) · {item.solicitacoes_pendentes} pendência(s)
                  </Text>
                ) : null}
                <Text style={rhStyles.historyCardMeta}>
                  Responsável: {item.responsavel ?? '—'} · Início: {formatDateOnlyBR(item.iniciada_em)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <RHDatePickerModal
        visible={isDeModalOpen}
        title="De"
        value={deLabel}
        onSelect={setDeLabel}
        onClose={() => setIsDeModalOpen(false)}
      />
      <RHDatePickerModal
        visible={isAteModalOpen}
        title="Até"
        value={ateLabel}
        onSelect={setAteLabel}
        onClose={() => setIsAteModalOpen(false)}
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
        visible={isResponsavelFilterOpen}
        title="Responsável"
        options={responsavelFilterOptions}
        selectedValue={responsavelFilter}
        onSelect={setResponsavelFilter}
        onClose={() => setIsResponsavelFilterOpen(false)}
      />
      <RHSimplePickerModal
        visible={isEtapaFilterOpen}
        title="Etapa"
        options={etapaFilterOptions}
        selectedValue={etapaFilter}
        onSelect={setEtapaFilter}
        onClose={() => setIsEtapaFilterOpen(false)}
      />
      <RHSimplePickerModal
        visible={isStatusFilterOpen}
        title="Status"
        options={rhAdmissaoStatusFilterOptions.map((item) => item.label)}
        selectedValue={statusFilter}
        onSelect={setStatusFilter}
        onClose={() => setIsStatusFilterOpen(false)}
      />

      <EditarSlaModal
        visible={!!editingPrazo}
        prazo={editingPrazo}
        onClose={() => setEditingPrazo(null)}
        onSaved={(updated) => {
          setData((current) =>
            current
              ? {
                  ...current,
                  prazos: current.prazos.map((p) => (p.etapa === updated.etapa ? updated : p)),
                  por_etapa: current.por_etapa.map((p) =>
                    p.etapa === updated.etapa ? { ...p, prazo_dias: updated.dias } : p
                  ),
                }
              : current
          );
        }}
      />
    </SafeAreaView>
  );
}

// ---------- Transferências ----------

export function RHTransferenciasScreen({ navigation }: ScreenProps<'RHTransferencias'>) {
  const [data, setData] = useState<RhTransferenciasDetalhe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchRhTransferenciasDetalhe()
      .then((result) => {
        if (isMounted) setData(result);
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar as transferências.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

        {!data ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>
              {isLoading ? 'Carregando transferências...' : errorMessage ?? 'Sem dados.'}
            </Text>
          </View>
        ) : (
          <>
            {data.statusSummary.length > 0 ? (
              <View style={rhStyles.tripleStatRow}>
                {data.statusSummary.map((status) => (
                  <View key={status.status ?? 'sem_status'} style={rhStyles.tripleStatCard}>
                    <Text style={[rhStyles.tripleStatValue, { color: status.color }]}>{status.count}</Text>
                    <Text style={rhStyles.tripleStatLabel}>{status.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {data.items.length === 0 ? (
              <View style={styles.processEmptyCard}>
                <Text style={styles.processEmptyText}>Nenhuma transferência registrada.</Text>
              </View>
            ) : (
              data.items.map((item) => (
                <View key={item.id} style={rhStyles.historyCard}>
                  <View style={rhStyles.docCardTopRow}>
                    <Text style={rhStyles.historyCardTitle} numberOfLines={2}>
                      {item.colaboradorNome}
                    </Text>
                    <View style={[rhStyles.employeeStatusPill, { backgroundColor: item.statusTint }]}>
                      <Text style={[rhStyles.employeeStatusText, { color: item.statusColor }]}>
                        {item.statusLabel}
                      </Text>
                    </View>
                  </View>
                  <Text style={rhStyles.historyCardMeta}>
                    {item.empresaOrigemNome || item.setorOrigem || 'Origem não informada'} →{' '}
                    {item.empresaDestinoNome || item.setorDestino || 'Destino não informado'}
                  </Text>
                  {item.cargoOrigem || item.cargoDestino ? (
                    <Text style={rhStyles.historyCardMeta}>
                      Cargo: {item.cargoOrigem ?? '—'} → {item.cargoDestino ?? '—'}
                    </Text>
                  ) : null}
                  {item.salarioAnterior || item.salarioNovo ? (
                    <Text style={rhStyles.historyCardMeta}>
                      Salário: {item.salarioAnterior ?? '—'} → {item.salarioNovo ?? '—'}
                    </Text>
                  ) : null}
                  <Text style={rhStyles.historyCardMeta}>
                    Vigência: {item.vigenciaLabel}
                    {item.motivo ? ` · Motivo: ${item.motivo}` : ''}
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

// ---------- Comunicados ----------

// rh_comunicados não tem coluna de categoria (RH/SST/DP era só do mock) —
// por isso o formulário e a lista abaixo não usam mais esse chip. "Enviar
// para" usa o enum real rh_comunicado_publico (todos|empresa|grupo|
// colaborador) — não existe "cargo específico" no schema hoje (só grupo ou
// colaborador avulso), então essa opção não está aqui; ver mensagem
// rascunhada pra Lovable se quiser pedir isso. Anexo continua por link (sem
// endpoint de upload de imagem confirmado pra comunicados ainda).
type AnnouncementFormValues = {
  titulo: string;
  conteudo: string;
  anexoUrl: string;
};

const emptyAnnouncementForm: AnnouncementFormValues = {
  titulo: '',
  conteudo: '',
  anexoUrl: '',
};

const rhComunicadoAudienciaOptions = ['Todos', 'Grupo específico', 'Colaborador específico'];

function comunicadoPublicoLabelRh(publico: string): string {
  if (publico === 'empresa') return 'Empresa';
  if (publico === 'grupo') return 'Grupo';
  if (publico === 'colaborador') return 'Um colaborador';
  return 'Todos';
}

function formatComunicadoDateRh(raw: string | null): string {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ColaboradorSearchPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (colaborador: RhColaboradorRaw) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RhColaboradorRaw[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      fetchRhColaboradores({ q: query.trim() })
        .then((rows) => setResults(rows.slice(0, 30)))
        .catch(() => setResults([]))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={[styles.requestModalCard, { maxHeight: '75%' }]}>
          <View style={styles.requestModalHeader}>
            <Text style={styles.requestModalTitle}>Selecionar colaborador</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <View style={rhStyles.searchRow}>
            <Feather name="search" size={16} color="#9AA1B5" />
            <TextInput
              style={rhStyles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Digite pelo menos 2 letras do nome..."
              placeholderTextColor="#A7AEC2"
              autoFocus
            />
          </View>

          {isSearching ? (
            <ActivityIndicator color="#1B6E3A" style={styles.spacingTop} />
          ) : (
            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {results.length === 0 ? (
                <RHEmptyTabState
                  message={query.trim().length < 2 ? 'Digite pra buscar.' : 'Nenhum colaborador encontrado.'}
                />
              ) : (
                results.map((colaborador) => (
                  <Pressable
                    key={colaborador.id}
                    style={styles.templateOptionRow}
                    onPress={() => {
                      onSelect(colaborador);
                      onClose();
                    }}
                  >
                    <Text style={rhStyles.historyCardTitle}>{colaborador.nome_completo}</Text>
                    <Text style={rhStyles.historyCardMeta}>{colaborador.cargo ?? '—'}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function AnnouncementFormModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { identity } = useContext(AuthIdentityContext);
  const [form, setForm] = useState<AnnouncementFormValues>(emptyAnnouncementForm);
  const [isSaving, setIsSaving] = useState(false);
  const [audiencia, setAudiencia] = useState(rhComunicadoAudienciaOptions[0]);
  const [isAudienciaPickerOpen, setIsAudienciaPickerOpen] = useState(false);
  const [grupos, setGrupos] = useState<AdminGrupoItem[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<AdminGrupoItem | null>(null);
  const [isGrupoPickerOpen, setIsGrupoPickerOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<RhColaboradorRaw | null>(null);
  const [isColaboradorPickerOpen, setIsColaboradorPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(emptyAnnouncementForm);
      setAudiencia(rhComunicadoAudienciaOptions[0]);
      setSelectedGrupo(null);
      setSelectedColaborador(null);
      fetchAdminGrupos()
        .then((result) => setGrupos(result.grupos))
        .catch(() => {});
    }
  }, [visible]);

  const handleClose = () => {
    setForm(emptyAnnouncementForm);
    onClose();
  };

  const handleSubmit = () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha o título e a descrição do comunicado.');
      return;
    }
    if (audiencia === 'Grupo específico' && !selectedGrupo) {
      Alert.alert('Selecione um grupo', 'Escolha pra qual grupo esse comunicado vai.');
      return;
    }
    if (audiencia === 'Colaborador específico' && !selectedColaborador) {
      Alert.alert('Selecione um colaborador', 'Escolha pra quem esse comunicado vai.');
      return;
    }

    const body: Parameters<typeof createRhComunicado>[0] = {
      titulo: form.titulo.trim(),
      conteudo: form.conteudo.trim(),
      publico: 'todos',
      anexo_url: form.anexoUrl.trim() || undefined,
    };
    if (audiencia === 'Grupo específico' && selectedGrupo) {
      body.publico = 'grupo';
      body.grupo_id = selectedGrupo.id;
    } else if (audiencia === 'Colaborador específico' && selectedColaborador) {
      body.publico = 'colaborador';
      body.colaborador_id = selectedColaborador.id;
    } else {
      body.empresa_id = identity?.empresaId ?? undefined;
    }

    setIsSaving(true);
    createRhComunicado(body, identity?.profileId)
      .then(() => {
        onCreated();
        handleClose();
      })
      .catch((err) => {
        Alert.alert('Não foi possível enviar', err instanceof Error ? err.message : 'Tente novamente.');
      })
      .finally(() => setIsSaving(false));
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>Novo comunicado</Text>
              <Pressable onPress={handleClose} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.requestFieldLabel}>Título *</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.titulo}
                onChangeText={(text) => setForm((current) => ({ ...current, titulo: text }))}
                placeholder="Ex.: Nova tabela de reajuste 2026"
                placeholderTextColor="#A7AEC2"
              />

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Descrição *</Text>
              <TextInput
                style={[styles.processTextInput, styles.processDocumentationArea]}
                value={form.conteudo}
                onChangeText={(text) => setForm((current) => ({ ...current, conteudo: text }))}
                placeholder="Detalhe o comunicado..."
                placeholderTextColor="#A7AEC2"
                multiline
                textAlignVertical="top"
              />

              <RHSelectField
                label="Enviar para"
                required
                value={audiencia}
                onPress={() => setIsAudienciaPickerOpen(true)}
              />
              {audiencia === 'Grupo específico' ? (
                <RHSelectField
                  label="Grupo"
                  required
                  value={selectedGrupo?.name ?? ''}
                  placeholder="Selecione o grupo"
                  onPress={() => setIsGrupoPickerOpen(true)}
                />
              ) : null}
              {audiencia === 'Colaborador específico' ? (
                <RHSelectField
                  label="Colaborador"
                  required
                  value={selectedColaborador?.nome_completo ?? ''}
                  placeholder="Buscar colaborador"
                  icon="search"
                  onPress={() => setIsColaboradorPickerOpen(true)}
                />
              ) : null}

              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Link da imagem/anexo (opcional)</Text>
              <TextInput
                style={styles.processTextInput}
                value={form.anexoUrl}
                onChangeText={(text) => setForm((current) => ({ ...current, anexoUrl: text }))}
                placeholder="https://..."
                placeholderTextColor="#A7AEC2"
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text style={rhStyles.announcementMeta}>
                Ainda não temos upload de imagem por aqui — cole o link de uma imagem ou PDF já hospedado em algum
                lugar (Drive, etc.). Já pedimos pra Lovable um endpoint de upload pra isso.
              </Text>

              <Pressable
                style={[rhStyles.primaryButtonGreen, styles.spacingTop, isSaving ? styles.primaryButtonDisabled : null]}
                onPress={handleSubmit}
                disabled={isSaving}
              >
                <Text style={styles.primaryButtonText}>{isSaving ? 'Enviando...' : 'Enviar comunicado'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <RHSimplePickerModal
        visible={isAudienciaPickerOpen}
        title="Enviar para"
        options={rhComunicadoAudienciaOptions}
        selectedValue={audiencia}
        onSelect={setAudiencia}
        onClose={() => setIsAudienciaPickerOpen(false)}
      />
      <RHSimplePickerModal
        visible={isGrupoPickerOpen}
        title="Grupo"
        options={grupos.map((g) => g.name)}
        selectedValue={selectedGrupo?.name ?? ''}
        onSelect={(name) => setSelectedGrupo(grupos.find((g) => g.name === name) ?? null)}
        onClose={() => setIsGrupoPickerOpen(false)}
      />
      <ColaboradorSearchPickerModal
        visible={isColaboradorPickerOpen}
        onClose={() => setIsColaboradorPickerOpen(false)}
        onSelect={setSelectedColaborador}
      />
    </>
  );
}

export function RHComunicadosScreen({ navigation }: ScreenProps<'RHComunicados'>) {
  const { identity } = useContext(AuthIdentityContext);
  const [comunicados, setComunicados] = useState<RhComunicadoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadComunicados = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchRhComunicados({ empresaId: identity?.empresaId ?? undefined })
      .then(setComunicados)
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os comunicados.');
      })
      .finally(() => setIsLoading(false));
  }, [identity?.empresaId]);

  useEffect(() => {
    loadComunicados();
  }, [loadComunicados]);

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

        {isLoading ? (
          <Text style={styles.conversaEmptyText}>Carregando comunicados...</Text>
        ) : errorMessage ? (
          <Text style={styles.conversaEmptyText}>{errorMessage}</Text>
        ) : comunicados.length === 0 ? (
          <Text style={styles.conversaEmptyText}>Nenhum comunicado enviado ainda.</Text>
        ) : (
          comunicados.map((item) => (
            <View key={item.id} style={rhStyles.announcementCard}>
              <View style={rhStyles.announcementTopRow}>
                <View style={[rhStyles.announcementBadge, { backgroundColor: '#E9EEFF' }]}>
                  <Text style={[rhStyles.announcementBadgeText, { color: '#3457D5' }]}>
                    {comunicadoPublicoLabelRh(item.publico)}
                  </Text>
                </View>
                <Text style={rhStyles.announcementTime}>{formatComunicadoDateRh(item.publicar_em)}</Text>
              </View>
              <Text style={rhStyles.announcementTitle}>{item.titulo}</Text>
              <Text style={rhStyles.announcementDesc}>{item.conteudo}</Text>
              {item.anexo_url ? (
                <Pressable onPress={() => Linking.openURL(item.anexo_url as string)}>
                  <Text style={[rhStyles.announcementMeta, { color: '#3457D5' }]}>Ver anexo</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <AnnouncementFormModal visible={isFormOpen} onClose={() => setIsFormOpen(false)} onCreated={loadComunicados} />
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
// Dados reais vêm de fetchRhFeriasDetalhe (rh_ferias + rh_colaboradores,
// calculados no af360-api) — o mock antigo foi removido.

export function RHFeriasScreen({ navigation }: ScreenProps<'RHFerias'>) {
  const [data, setData] = useState<RhFeriasDetalhe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchRhFeriasDetalhe()
      .then((result) => {
        if (isMounted) setData(result);
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar as férias.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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
            <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueGreen]}>
              {data ? data.stats.andamento : '—'}
            </Text>
            <Text style={rhStyles.tripleStatLabel}>Em andamento</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueBlue]}>
              {data ? data.stats.programadas : '—'}
            </Text>
            <Text style={rhStyles.tripleStatLabel}>Programadas</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={rhStyles.tripleStatValue}>{data ? data.stats.concluidas : '—'}</Text>
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

        {isLoading ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Carregando férias...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>{errorMessage}</Text>
          </View>
        ) : !data || data.itens.length === 0 ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Nenhuma férias lançada.</Text>
          </View>
        ) : (
          data.itens.map((item) => (
            <View key={item.id} style={rhStyles.announcementCard}>
              <View style={rhStyles.announcementTopRow}>
                <Text style={rhStyles.employeeName}>{item.nome}</Text>
                <View style={[rhStyles.employeeStatusPill, { backgroundColor: item.statusTint }]}>
                  <Text style={[rhStyles.employeeStatusText, { color: item.statusColor }]}>{item.statusLabel}</Text>
                </View>
              </View>
              <Text style={rhStyles.employeeRoleUnit}>
                {item.inicioLabel} a {item.fimLabel} · {item.dias !== null ? `${item.dias} dias` : '— dias'}
              </Text>
              <Text style={rhStyles.employeeMeta}>{item.unidade}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Período de Experiência ----------
// Não existe tabela própria: derivado de rh_colaboradores.vencimento_experiencia
// + status = 'ativo' (fetchRhExperienciaDetalhe, calculado no af360-api).
// O mock antigo foi removido.

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
  const [data, setData] = useState<RhExperienciaDetalhe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchRhExperienciaDetalhe()
      .then((result) => {
        if (isMounted) setData(result);
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar o período de experiência.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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
            <Text style={rhStyles.tripleStatValue}>{data ? data.stats.emExperiencia : '—'}</Text>
            <Text style={rhStyles.tripleStatLabel}>Em experiência</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, { color: '#E6213D' }]}>
              {data ? data.stats.vencem7d : '—'}
            </Text>
            <Text style={rhStyles.tripleStatLabel}>Vencem em 7d</Text>
          </View>
          <View style={rhStyles.tripleStatCard}>
            <Text style={[rhStyles.tripleStatValue, rhStyles.tripleStatValueGold]}>
              {data ? data.stats.vencem30d : '—'}
            </Text>
            <Text style={rhStyles.tripleStatLabel}>Vencem em 30d</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Carregando período de experiência...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>{errorMessage}</Text>
          </View>
        ) : !data || data.itens.length === 0 ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Nenhum colaborador em período de experiência.</Text>
          </View>
        ) : (
          data.itens.map((item) => {
            const tone = getExperienceTone(item.remainingDays);
            const elapsedPct =
              item.totalDays !== null ? ((item.totalDays - item.remainingDays) / item.totalDays) * 100 : 0;
            const remainingLabel = item.remainingDays < 0 ? 'Vencido' : `${item.remainingDays} dias`;

            return (
              <View key={item.id} style={rhStyles.experienceCard}>
                <View style={rhStyles.announcementTopRow}>
                  <Text style={rhStyles.employeeName}>{item.nome}</Text>
                  <View style={[rhStyles.employeeStatusPill, { backgroundColor: tone.pillTint }]}>
                    <Text style={[rhStyles.employeeStatusText, { color: tone.pillColor }]}>{remainingLabel}</Text>
                  </View>
                </View>
                <Text style={rhStyles.employeeRoleUnit}>
                  {item.cargo} · {item.unidade}
                </Text>
                <View style={rhStyles.experienceProgressRow}>
                  <Text style={rhStyles.experienceProgressLabel}>
                    {item.totalDays !== null ? `${item.totalDays} dias` : '— dias'}
                  </Text>
                  <View style={rhStyles.experienceProgressBarWrap}>
                    <RHProgressBar pct={elapsedPct} color={tone.barColor} />
                  </View>
                  <Text style={rhStyles.experienceProgressLabel}>Vence {item.dueLabel}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Folha de Pagamento ----------
// Competências (rh_folha_competencias) agora vêm de fetchRhFolhaDetalhe —
// cada item já traz status/cor calculados no af360-api (folhaStatusMeta),
// então não precisamos mais de um mapa estático de status aqui.

export function RHFolhaPagamentoScreen({ navigation }: ScreenProps<'RHFolhaPagamento'>) {
  const [data, setData] = useState<RhFolhaDetalhe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchRhFolhaDetalhe()
      .then((result) => {
        if (isMounted) setData(result);
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar a folha de pagamento.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

        {!data ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>
              {isLoading ? 'Carregando folha de pagamento...' : errorMessage ?? 'Sem dados.'}
            </Text>
          </View>
        ) : data.items.length === 0 ? (
          <View style={styles.processEmptyCard}>
            <Text style={styles.processEmptyText}>Nenhuma competência de folha cadastrada.</Text>
          </View>
        ) : (
          data.items.map((item) => (
            <View key={item.id} style={rhStyles.sectionCard}>
              <View style={rhStyles.announcementTopRow}>
                <Text style={rhStyles.employeeName}>{item.label}</Text>
                <View style={[rhStyles.employeeStatusPill, { backgroundColor: item.statusTint }]}>
                  <Text style={[rhStyles.employeeStatusText, { color: item.statusColor }]}>{item.statusLabel}</Text>
                </View>
              </View>
              <View style={rhStyles.payrollStatsRow}>
                <View style={rhStyles.payrollStatItem}>
                  <Text style={rhStyles.payrollStatLabel}>Bruto</Text>
                  <Text style={rhStyles.payrollStatValue}>{item.totalBruto ?? '—'}</Text>
                </View>
                <View style={rhStyles.payrollStatItem}>
                  <Text style={rhStyles.payrollStatLabel}>Líquido</Text>
                  <Text style={rhStyles.payrollStatValue}>{item.totalLiquido ?? '—'}</Text>
                </View>
                <View style={rhStyles.payrollStatItem}>
                  <Text style={rhStyles.payrollStatLabel}>FGTS</Text>
                  <Text style={rhStyles.payrollStatValue}>{item.totalFgts ?? '—'}</Text>
                </View>
              </View>
              <Text style={rhStyles.historyCardMeta}>
                {item.totalColaboradores != null ? `${item.totalColaboradores} colaborador(es)` : 'Colaboradores: —'}
                {item.dataPagamentoLabel
                  ? ` · Pago em ${item.dataPagamentoLabel}`
                  : item.dataPrevistaPagamentoLabel
                  ? ` · Previsão de pagamento: ${item.dataPrevistaPagamentoLabel}`
                  : ''}
              </Text>
              <Pressable
                style={rhStyles.outlineButton}
                onPress={() => Alert.alert(item.label, 'Detalhamento da folha em breve.')}
              >
                <Text style={rhStyles.outlineButtonText}>Abrir</Text>
              </Pressable>
            </View>
          ))
        )}
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
  // Fileira de KPI num card só (sem cor) — 5 itens com traço fino entre
  // eles, igual à lógica do "Por etapa", pra combinar visualmente.
  conformidadeKpiCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingVertical: 12,
    marginBottom: 14,
  },
  conformidadeKpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  conformidadeKpiDivider: {
    width: 1,
    backgroundColor: '#EEF0F5',
  },
  conformidadeKpiValue: {
    color: '#15203E',
    fontSize: 15,
    fontWeight: '800',
  },
  conformidadeKpiLabel: {
    marginTop: 2,
    color: '#9AA1B5',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
    width: '100%',
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
  // Variante menor pra fileiras com vários pills juntos (ex.: Conformidade
  // de Admissões) — mesmo visual, só mais enxuto pra caber mais por linha.
  filterPillCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  filterPillTextCompact: {
    fontSize: 11,
    maxWidth: 108,
  },
  // Card com filtros em formulário (label em cima + campo cheio) — usado
  // quando tem 3+ filtros juntos e pills lado a lado ficam apertados/soltos.
  filterFieldsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 14,
  },
  filterFieldBlock: {
    marginTop: 10,
    // "estreito" — o campo não estica até a borda do card, fica com uma
    // margem lateral pra parecer menor sem perder a legibilidade.
    marginHorizontal: 6,
  },
  filterFieldLabel: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  filterFieldSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DCE8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterFieldSelectText: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '600',
  },
  // Card "Por etapa" — ícone + título + pill de SLA em cima, 3 números com
  // divisor embaixo. Borda esquerda fica vermelha só quando tem atrasada.
  etapaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderLeftWidth: 4,
    borderLeftColor: '#E2E6F0',
    padding: 14,
    marginBottom: 12,
  },
  etapaCardAlert: {
    borderLeftColor: '#E6213D',
  },
  etapaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  etapaCardTitle: {
    flex: 1,
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  etapaSlaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F5EA',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  etapaSlaPillText: {
    color: '#18955A',
    fontSize: 9,
    fontWeight: '800',
  },
  etapaStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etapaStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  etapaStatValue: {
    color: '#15203E',
    fontSize: 17,
    fontWeight: '800',
  },
  etapaStatLabel: {
    marginTop: 2,
    color: '#9AA1B5',
    fontSize: 11,
  },
  etapaStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E6F0',
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
    maxHeight: '88%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  importEmployeesScroll: {
    flex: 1,
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
  scheduleResultText: {
    marginTop: 6,
    color: '#5E667D',
    fontSize: 12,
    fontWeight: '600',
  },
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
  mobileDetailTabsShell: {
    marginTop: 4,
    marginBottom: 6,
    width: '100%',
  },
  mobileDetailTabsScroll: {
    width: '100%',
  },
  mobileDetailTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mobileDetailTab: {
    minHeight: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#F7F8FB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  mobileDetailTabActive: {
    backgroundColor: '#E8F7EE',
    borderColor: '#1B6E3A',
  },
  mobileDetailTabText: {
    color: '#6F768A',
    fontSize: 11,
    fontWeight: '600',
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
  checklistProgressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 16,
  },
  checklistProgressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checklistProgressTitle: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  checklistProgressPercent: {
    color: '#3457D5',
    fontSize: 16,
    fontWeight: '800',
  },
  checklistProgressSubtitle: {
    marginTop: 4,
    color: '#5E667D',
    fontSize: 12,
  },
  checklistProgressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EEF1F8',
    overflow: 'hidden',
  },
  checklistProgressFill: {
    height: 8,
    borderRadius: 999,
  },
  checklistGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
  },
  checklistGroupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  checklistGroupTitle: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  checklistGroupBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#EEF1F8',
  },
  checklistGroupBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4C5470',
  },
  checklistGroupBadgeComplete: {
    backgroundColor: '#E3F5EA',
  },
  checklistGroupBadgeCompleteText: {
    color: '#18955A',
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  checklistRowText: {
    flex: 1,
    color: '#8A90A4',
    fontSize: 12.5,
    textDecorationLine: 'line-through',
  },
  checklistRowTextPending: {
    color: '#4C5470',
    fontWeight: '600',
    textDecorationLine: 'none',
  },
  checklistRowTextCritical: {
    color: '#B3202F',
    fontWeight: '700',
  },
  checklistCriticalTag: {
    borderRadius: 999,
    backgroundColor: '#FCE8EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  checklistCriticalTagText: {
    color: '#D52B47',
    fontSize: 9.5,
    fontWeight: '800',
  },
  passagensHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  historyHeaderTextBlock: {
    flex: 1,
    minWidth: 180,
  },
  historyHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyHeaderSubtitle: {
    marginTop: 2,
    color: '#7C8397',
    fontSize: 11.5,
  },
  addPassagemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E24C52',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  addPassagemButtonText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  passagemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passagemTag: {
    borderRadius: 999,
    backgroundColor: '#18955A',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  passagemTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  passagemStatusTag: {
    borderRadius: 999,
    backgroundColor: '#F2F4FA',
    borderWidth: 1,
    borderColor: '#DCE1EE',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  passagemStatusTagText: {
    color: '#4C5470',
    fontSize: 11,
    fontWeight: '700',
  },
  passagemStatusTagInactive: {
    backgroundColor: '#FCE8EC',
    borderColor: '#F3C4CE',
  },
  passagemStatusTagTextInactive: {
    color: '#D52B47',
  },
  passagemInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  passagemInfoText: {
    color: '#15203E',
    fontSize: 12.5,
    fontWeight: '700',
  },
  historyEmptyNote: {
    textAlign: 'center',
    color: '#9AA1B5',
    fontSize: 12,
  },
  passagemFormButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
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
  portalAccessCard: {
    backgroundColor: '#F5F7FB',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  portalAccessTitle: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  portalAccessSubtitle: {
    color: '#5E667D',
    fontSize: 12,
    marginBottom: 8,
  },
  portalAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7DCE8',
    backgroundColor: '#FFFFFF',
    minHeight: 42,
  },
  portalAccessButtonText: {
    color: '#29448D',
    fontSize: 13,
    fontWeight: '800',
  },
  dangerCard: {
    backgroundColor: '#FCE8EC',
    borderWidth: 1,
    borderColor: '#F3B7C4',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  dangerCardTitle: {
    color: '#8A1226',
    fontSize: 13,
    fontWeight: '800',
  },
  dangerCardText: {
    color: '#A3283E',
    fontSize: 12,
    marginBottom: 8,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#E6213D',
    minHeight: 42,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  docFolderHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  docFolderHeaderTitle: {
    flex: 1,
    color: '#15203E',
    fontSize: 15,
    fontWeight: '800',
  },
  docFolderHeaderSubtitle: {
    color: '#8B93A8',
    fontSize: 12,
    marginLeft: 30,
    marginBottom: 10,
  },
  uploadDropZone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C7CDDC',
    borderRadius: 14,
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8F9FC',
  },
  uploadDropZoneText: {
    color: '#7A8299',
    fontSize: 12,
    fontWeight: '600',
  },
});
