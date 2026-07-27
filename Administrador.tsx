// ============================================================================
// Administrador.tsx — Painel de Gestão da Plataforma (módulo "Administrador")
// ============================================================================
// ATENÇÃO — DADOS DE EXEMPLO / MOCK TEMPORÁRIO
// ----------------------------------------------------------------------------
// Combinado com a Rayanne: "pode fazer primeiro o front e depois fazemos o
// back dele". Todas as telas deste arquivo usam DADOS ESTÁTICOS DE EXEMPLO
// (números e textos tirados de mockups reais), pois os endpoints reais deste
// módulo AINDA NÃO EXISTEM.
//
// Isso é uma EXCEÇÃO DELIBERADA E COMBINADA à regra geral do projeto de nunca
// mockar dado — NÃO remova este comentário nem deixe isso parecer permanente.
// Quando o backend do Administrador for implementado, troque os consts
// `admin*Mock` abaixo por chamadas reais (padrão usado em RH.tsx com
// fetchRh*), e remova os comentários "MOCK" espalhados pelo arquivo.
// ============================================================================

import { useContext, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  styles,
  TopBar,
  ToggleSwitch,
  adminUser,
  adminUserInitials,
  AuthIdentityContext,
  NotificationRoutineFormModal,
  TemplateFormModal,
} from './App';
import type {
  ScreenProps,
  NotificationRoutineItem,
  NotificationTemplateItem,
} from './App';

// ---------- Cores compartilhadas ----------

const NAVY = '#1B2340';
const NAVY_LIGHT = '#2F3A5C';
const NAVY_BG = '#E7E9F2';
const GREEN = '#18955A';
const GREEN_BG = '#E3F5EA';
const RED = '#E6213D';
const RED_BG = '#FCE8EC';
const GOLD = '#B07A1E';
const GOLD_BG = '#FCEFDA';
const BLUE = '#3457D5';
const BLUE_BG = '#EDF1FF';
const PURPLE = '#7C3AED';
const PURPLE_BG = '#EEE5FC';
const GRAY = '#5E667D';
const GRAY_BG = '#F1F2F7';

type FeatherIconName = keyof typeof Feather.glyphMap;

// ---------- Header de página (equivalente ao RHPageHeader de RH.tsx) ----------

function AdminPageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: FeatherIconName;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.directorPageTitleRow}>
        <View style={[styles.iconShell, adminStyles.iconAccentNavy]}>
          <Feather name={icon} size={18} color={NAVY} />
        </View>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      {subtitle ? <Text style={[styles.pageSubtitle, adminStyles.pageHeaderSubtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

function AdminEmptyState({ message }: { message: string }) {
  return (
    <View style={styles.processEmptyCard}>
      <Text style={styles.processEmptyText}>{message}</Text>
    </View>
  );
}

function AdminSearchRow({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={adminStyles.searchRow}>
      <Feather name="search" size={16} color="#9AA1B5" />
      <TextInput
        style={adminStyles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A7AEC2"
      />
    </View>
  );
}

function getInitialsFromName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function AdminTagPill({ label }: { label: string }) {
  return (
    <View style={adminStyles.tagPill}>
      <Text style={adminStyles.tagPillText}>{label}</Text>
    </View>
  );
}

function AdminColorPill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={[adminStyles.tagPill, { backgroundColor: bg }]}>
      <Text style={[adminStyles.tagPillText, { color }]}>{label}</Text>
    </View>
  );
}

// ============================================================================
// 1. Dashboard
// ============================================================================
// MOCK: números tirados do mockup real enviado pela Rayanne (snapshot de
// banco/plataforma). Substituir por endpoints reais quando existirem.

type PlatformMetric = {
  id: string;
  icon: FeatherIconName;
  label: string;
  value: string;
  meta: string;
  accentColor?: string;
  accentBg?: string;
};

const adminPlatformMetricsMock: PlatformMetric[] = [
  { id: 'db-size', icon: 'database', label: 'Banco de dados', value: '1.1 GB', meta: 'Tamanho total' },
  { id: 'connections', icon: 'wifi', label: 'Conexões', value: '14/60', meta: '23% do limite' },
  { id: 'queries', icon: 'activity', label: 'Queries ativas', value: '2', meta: '10 ociosas · 13 aguard.' },
  {
    id: 'cache-hit',
    icon: 'check-circle',
    label: 'Cache hit ratio',
    value: '99.0%',
    meta: 'Bom',
    accentColor: GREEN,
    accentBg: GREEN_BG,
  },
  { id: 'tps', icon: 'zap', label: 'Transações/s', value: '0.6', meta: '3.470.368 commits' },
  { id: 'online', icon: 'users', label: 'Online agora', value: '0', meta: '0 na última hora' },
];

type BigTable = { id: string; name: string; sizeLabel: string; rowsLabel: string; sizeMb: number };

const adminBiggestTablesMock: BigTable[] = [
  { id: 't1', name: 'leg_pedido', sizeLabel: '227.3 MB', rowsLabel: '322.040 linhas', sizeMb: 227.3 },
  { id: 't2', name: 'leg_itemped', sizeLabel: '163.0 MB', rowsLabel: '256.053 linhas', sizeMb: 163.0 },
  { id: 't3', name: 'leg_abastecimentos', sizeLabel: '140.0 MB', rowsLabel: '276.693 linhas', sizeMb: 140.0 },
  { id: 't4', name: 'q_resumo_dia', sizeLabel: '85.2 MB', rowsLabel: '308.759 linhas', sizeMb: 85.2 },
  { id: 't5', name: 'q_estoque_mes', sizeLabel: '14.9 MB', rowsLabel: '77.819 linhas', sizeMb: 14.9 },
  { id: 't6', name: 'q_tanque_dia', sizeLabel: '7.7 MB', rowsLabel: '25.752 linhas', sizeMb: 7.7 },
  { id: 't7', name: 'q_compra_itens', sizeLabel: '4.5 MB', rowsLabel: '25.080 linhas', sizeMb: 4.5 },
  // Itens 8 e 9: não vieram no mockup — completados de forma plausível
  // (tamanho decrescente, nomenclatura seguindo o mesmo padrão das demais).
  { id: 't8', name: 'leg_vendas_resumo', sizeLabel: '3.1 MB', rowsLabel: '18.200 linhas', sizeMb: 3.1 },
  { id: 't9', name: 'notif_entregas', sizeLabel: '2.4 MB', rowsLabel: '12.400 linhas', sizeMb: 2.4 },
  { id: 't10', name: 'rh_colaboradores', sizeLabel: '2.0 MB', rowsLabel: '1.930 linhas', sizeMb: 2.0 },
];

type HealthPair = { id: string; label: string; value: string; alert?: boolean };

const adminDbHealthMock: HealthPair[] = [
  { id: 'h1', label: 'Idle in transaction', value: '0' },
  { id: 'h2', label: 'Deadlocks (acumulado)', value: '0' },
  { id: 'h3', label: 'Rollbacks', value: '247.157' },
  { id: 'h4', label: 'Arquivos temp', value: '41.817', alert: true },
  { id: 'h5', label: 'Bytes temp', value: '113.7 GB' },
  { id: 'h6', label: 'Profiles', value: '515' },
  { id: 'h7', label: 'Colaboradores', value: '1.930' },
  { id: 'h8', label: 'Notif. entregas', value: '0' },
  { id: 'h9', label: 'Audit log', value: '5' },
];

const adminSnapshotMock = [
  { id: 's1', value: '968', label: 'Colaboradores ativos', meta: '1930 no total' },
  { id: 's2', value: '482', label: 'Usuários ativos', meta: '515 cadastrados' },
  { id: 's3', value: '0%', label: 'Aderência (30 dias)', meta: '1 logaram em 30d' },
  { id: 's4', value: '489', label: 'Sem acesso', meta: 'Sem login' },
];

const adminMonthMock = [
  { id: 'm1', value: '0', label: 'Novos colaboradores' },
  { id: 'm2', value: '1', label: 'Logins no mês' },
  { id: 'm3', value: '0', label: 'Notificações enviadas' },
  { id: 'm4', value: '0', label: 'Solicitações RH' },
];

const adminNewEmployeesChartMock = [
  { label: 'Fev', value: 4 },
  { label: 'Mar', value: 5 },
  { label: 'Abr', value: 4 },
  { label: 'Mai', value: 5 },
  { label: 'Jun', value: 24 },
  { label: 'Jul', value: 1 },
];

const adminTopUnidadesMock = [
  { id: 'u1', name: 'Posto Monalisa', value: 43 },
  { id: 'u2', name: 'Petromasa Irajá', value: 39 },
  { id: 'u3', name: 'Posto de Abastecimento e Serviços V. M...', value: 36 },
  { id: 'u4', name: 'Centro Automotivo Central do Brasil', value: 30 },
  { id: 'u5', name: 'Auto Posto Mem de Sá Ltda', value: 30 },
];

export function AdminDashboardScreen({ navigation }: ScreenProps<'AdminDashboard'>) {
  const maxTableSize = Math.max(...adminBiggestTablesMock.map((item) => item.sizeMb));
  const maxMonthValue = Math.max(1, ...adminNewEmployeesChartMock.map((item) => item.value));
  const chartHeight = 90;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={adminStyles.heroCard}>
          <View style={adminStyles.liveBadge}>
            <View style={adminStyles.liveDot} />
            <Text style={adminStyles.liveBadgeText}>AO VIVO · atualiza a cada 10s</Text>
          </View>
          <Text style={adminStyles.heroTitle}>Dashboard</Text>
          <Text style={adminStyles.heroSubtitle}>Visão geral da plataforma · Julho / 2026</Text>
        </LinearGradient>

        <Text style={adminStyles.sectionLabel}>PERFORMANCE DA PLATAFORMA</Text>
        <View style={styles.grid}>
          {adminPlatformMetricsMock.map((metric) => (
            <View key={metric.id} style={styles.gridItem}>
              <View style={styles.dashboardCard}>
                <View
                  style={[
                    styles.iconShell,
                    { backgroundColor: metric.accentBg ?? NAVY_BG },
                  ]}
                >
                  <Feather name={metric.icon} size={18} color={metric.accentColor ?? NAVY} />
                </View>
                <Text style={styles.dashboardCardValue}>{metric.value}</Text>
                <Text style={styles.dashboardCardLabel}>{metric.label}</Text>
                <Text style={adminStyles.metricMeta}>{metric.meta}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={adminStyles.sectionCard}>
          <Text style={adminStyles.sectionTitle}>Maiores tabelas (top 10)</Text>
          {adminBiggestTablesMock.map((table, index) => (
            <View
              key={table.id}
              style={[adminStyles.tableRow, index === adminBiggestTablesMock.length - 1 ? { marginBottom: 0 } : null]}
            >
              <View style={adminStyles.tableRowHeader}>
                <Text style={adminStyles.tableRank}>{index + 1}</Text>
                <Text style={adminStyles.tableName} numberOfLines={1}>
                  {table.name}
                </Text>
                <Text style={adminStyles.tableMeta}>
                  {table.sizeLabel} · {table.rowsLabel}
                </Text>
              </View>
              <View style={adminStyles.tableProgressTrack}>
                <View
                  style={[
                    adminStyles.tableProgressFill,
                    { width: `${Math.max(3, (table.sizeMb / maxTableSize) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={adminStyles.sectionCard}>
          <Text style={adminStyles.sectionTitle}>Saúde do banco</Text>
          {adminDbHealthMock.map((item, index) => (
            <View
              key={item.id}
              style={[
                adminStyles.healthRow,
                index === adminDbHealthMock.length - 1 ? { borderBottomWidth: 0 } : null,
              ]}
            >
              <Text style={adminStyles.healthLabel}>{item.label}</Text>
              <Text style={[adminStyles.healthValue, item.alert ? adminStyles.healthValueAlert : null]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        <Text style={adminStyles.sectionLabel}>SNAPSHOT ATUAL</Text>
        <View style={styles.grid}>
          {adminSnapshotMock.map((item) => (
            <View key={item.id} style={styles.gridItem}>
              <View style={adminStyles.statCard}>
                <Text style={adminStyles.statCardValue}>{item.value}</Text>
                <Text style={adminStyles.statCardLabel}>{item.label}</Text>
                <Text style={adminStyles.metricMeta}>{item.meta}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={adminStyles.sectionLabel}>NO MÊS — JULHO / 2026</Text>
        <View style={styles.grid}>
          {adminMonthMock.map((item) => (
            <View key={item.id} style={styles.gridItem}>
              <View style={adminStyles.statCard}>
                <Text style={adminStyles.statCardValue}>{item.value}</Text>
                <Text style={adminStyles.statCardLabel}>{item.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={adminStyles.sectionCard}>
          <Text style={adminStyles.sectionTitle}>Novos colaboradores — últimos 6 meses</Text>
          <View style={adminStyles.monthBarChartRow}>
            {adminNewEmployeesChartMock.map((item) => (
              <View key={item.label} style={adminStyles.monthBarGroup}>
                <View
                  style={[
                    adminStyles.monthBar,
                    { height: Math.max(4, (item.value / maxMonthValue) * chartHeight) },
                  ]}
                />
                <Text style={adminStyles.monthBarLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[adminStyles.sectionCard, adminStyles.lastSectionCard]}>
          <Text style={adminStyles.sectionTitle}>Top unidades</Text>
          {adminTopUnidadesMock.map((item, index) => (
            <View key={item.id} style={adminStyles.rankRow}>
              <Text style={adminStyles.rankNumber}>{index + 1}</Text>
              <Text style={adminStyles.rankName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={adminStyles.rankValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 2. Perfil
// ============================================================================

export function AdminProfileScreen({ navigation }: ScreenProps<'AdminProfile'>) {
  const { identity } = useContext(AuthIdentityContext);
  const hasMultiplePanels = (identity?.availableRoles?.length ?? 0) > 1;

  // MOCK: base numérica ("56 postos · 1.930 colaboradores") tirada do mockup.
  const adminProfileFields = [
    { label: 'Perfil', value: 'Administrador' },
    { label: 'Acesso', value: 'Total (todos os módulos)' },
    { label: 'E-mail', value: adminUser.email },
    { label: 'Ambiente', value: 'AF 360 · v1.4.0' },
    { label: 'Base', value: '56 postos · 1.930 colaboradores' },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={adminUserInitials} variant="administrador" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.directorProfileHero}>
          <View style={styles.directorProfileBadge}>
            <Text style={styles.directorProfileBadgeText}>{adminUserInitials}</Text>
          </View>
          <View>
            <Text style={styles.directorProfileName}>Administrador</Text>
            <Text style={styles.directorProfileRole}>Acesso total · Painel de Gestão</Text>
          </View>
        </LinearGradient>

        <View style={styles.directorProfileCard}>
          {adminProfileFields.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.directorProfileRow,
                index < adminProfileFields.length - 1 ? styles.directorProfileRowBorder : null,
              ]}
            >
              <Text style={styles.directorProfileLabel}>{item.label}</Text>
              <Text style={styles.directorProfileValue}>{item.value}</Text>
            </View>
          ))}
        </View>

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

// ============================================================================
// 3. Usuários
// ============================================================================
// MOCK: lista de exemplo (7 usuários) tirada do mockup real.

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  unit: string;
  active: boolean;
};

const adminUsersMock: AdminUserRow[] = [
  { id: 'u1', name: 'Adilson Nascimento', email: 'adilson.nascimento@rede.americanfuel.com.br', role: 'Frentista', unit: 'Auto Posto ML de Ana Neri', active: true },
  { id: 'u2', name: 'Adriano Filho', email: 'adriano.filho@rede.americanfuel.com.br', role: 'Frentista', unit: 'Posto Marambaia', active: true },
  { id: 'u3', name: 'Adriano Izidoro', email: 'adriano.izidoro@rede.americanfuel.com.br', role: 'Subgerente', unit: 'Frosinone Posto de GNV', active: true },
  { id: 'u4', name: 'Ailson Andrade', email: 'ailson.andrade@rede.americanfuel.com.br', role: 'Gerente', unit: 'Posto Santa Clara', active: true },
  { id: 'u5', name: 'Ailson Martins', email: 'ailson.martins@rede.americanfuel.com.br', role: 'Subgerente', unit: 'Posto Girassol V. Alegre', active: true },
  { id: 'u6', name: 'Ailton Ferreira', email: 'ailton.ferreira@rede.americanfuel.com.br', role: 'Frentista', unit: 'Posto Geriba', active: true },
  { id: 'u7', name: 'Ailton Vieira', email: 'ailton.vieira@rede.americanfuel.com.br', role: 'Frentista', unit: 'Auto Posto S. Joaquim', active: true },
];

export function AdminUsuariosScreen({ navigation }: ScreenProps<'AdminUsuarios'>) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState(adminUsersMock);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.unit.toLowerCase().includes(query)
    );
  }, [users, search]);

  const toggleUser = (id: string) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, active: !user.active } : user)));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdminPageHeader icon="users" title="Usuários" subtitle="482 ativos" />

        <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar por nome, e-mail ou unidade..." />

        <View style={styles.directorNotifHeaderRow}>
          <Pressable
            style={adminStyles.filterPill}
            onPress={() => Alert.alert('Filtro', 'Filtros avançados em breve.')}
          >
            <Text style={adminStyles.filterPillText}>Ativos</Text>
            <Feather name="chevron-down" size={14} color="#5E667D" />
          </Pressable>
          <Pressable
            style={styles.directorNotifNewButton}
            onPress={() => Alert.alert('Novo usuário', 'Cadastro de usuário em breve.')}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.directorNotifNewButtonText}>Novo</Text>
          </Pressable>
        </View>

        {filtered.length === 0 ? (
          <AdminEmptyState message="Nenhum usuário encontrado." />
        ) : (
          filtered.map((user) => (
            <View key={user.id} style={adminStyles.listCard}>
              <View style={adminStyles.listAvatar}>
                <Text style={adminStyles.listAvatarText}>{getInitialsFromName(user.name)}</Text>
              </View>
              <View style={adminStyles.listInfo}>
                <Text style={adminStyles.listName} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={adminStyles.listEmail} numberOfLines={1}>
                  {user.email}
                </Text>
                <Text style={adminStyles.listMeta} numberOfLines={1}>
                  {user.role} · {user.unit}
                </Text>
              </View>
              <ToggleSwitch value={user.active} onValueChange={() => toggleUser(user.id)} />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 4. Perfil de Acesso (Cargos / Acesso por Usuário)
// ============================================================================
// MOCK: cargos e vínculos de acesso tirados do mockup real.

type AdminCargo = { id: string; name: string; group: string; modules: string[] };

const adminCargosMock: AdminCargo[] = [
  { id: 'c1', name: 'Analista', group: 'Corporativo', modules: ['Colaborador', 'RH'] },
  { id: 'c2', name: 'Auxiliar', group: 'Corporativo', modules: ['Colaborador'] },
  { id: 'c3', name: 'Caixa', group: 'Operacional', modules: ['Colaborador'] },
  {
    id: 'c4',
    name: 'Diretor',
    group: 'Corporativo',
    modules: ['Administrador', 'RH', 'R&S', 'Colaborador', 'Financeiro', 'Gestão', 'Administrativo', 'Diretoria'],
  },
  { id: 'c5', name: 'Frentista', group: 'Operacional', modules: ['Colaborador'] },
  { id: 'c6', name: 'Gerente', group: 'Corporativo', modules: ['Colaborador', 'Gestão', 'RH'] },
  { id: 'c7', name: 'Gerente de Posto', group: 'Operacional', modules: ['Colaborador', 'Gestão'] },
  { id: 'c8', name: 'Subgerente', group: 'Operacional', modules: ['Colaborador', 'Gestão'] },
  { id: 'c9', name: 'Supervisor', group: 'Corporativo', modules: ['Colaborador', 'Gestão'] },
];

const adminGroupColorMap: Record<string, { bg: string; color: string }> = {
  Administrativo: { bg: PURPLE_BG, color: PURPLE },
  Corporativo: { bg: NAVY_BG, color: NAVY },
  Diretoria: { bg: RED_BG, color: RED },
  Gestão: { bg: GOLD_BG, color: GOLD },
  Operacional: { bg: GREEN_BG, color: GREEN },
};

type AdminUserAccessRow = { id: string; name: string; role: string; moduleCount: number };

const adminUserAccessMock: AdminUserAccessRow[] = [
  { id: 'ua1', name: 'Adilson Nascimento', role: 'Frentista', moduleCount: 1 },
  { id: 'ua2', name: 'Adriano Filho', role: 'Frentista', moduleCount: 1 },
  { id: 'ua3', name: 'Adriano Izidoro', role: 'Subgerente', moduleCount: 1 },
  { id: 'ua4', name: 'Ailson Andrade', role: 'Gerente', moduleCount: 1 },
  { id: 'ua5', name: 'Ailson Martins', role: 'Subgerente', moduleCount: 1 },
  { id: 'ua6', name: 'Ailton Ferreira', role: 'Frentista', moduleCount: 1 },
  { id: 'ua7', name: 'Ailton Vieira', role: 'Frentista', moduleCount: 1 },
];

export function AdminPerfilAcessoScreen({ navigation }: ScreenProps<'AdminPerfilAcesso'>) {
  const [activeTab, setActiveTab] = useState<'cargos' | 'usuarios'>('cargos');
  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return adminUserAccessMock;
    return adminUserAccessMock.filter(
      (item) => item.name.toLowerCase().includes(query) || item.role.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdminPageHeader icon="shield" title="Perfil de Acesso" subtitle="Cargos e módulos por usuário" />

        <View style={styles.directorNotifTabsRow}>
          <Pressable
            style={[styles.directorNotifTab, activeTab === 'cargos' ? styles.directorNotifTabActive : null]}
            onPress={() => setActiveTab('cargos')}
          >
            <Text
              style={[styles.directorNotifTabText, activeTab === 'cargos' ? styles.directorNotifTabTextActive : null]}
            >
              Cargos
            </Text>
          </Pressable>
          <Pressable
            style={[styles.directorNotifTab, activeTab === 'usuarios' ? styles.directorNotifTabActive : null]}
            onPress={() => setActiveTab('usuarios')}
          >
            <Text
              style={[
                styles.directorNotifTabText,
                activeTab === 'usuarios' ? styles.directorNotifTabTextActive : null,
              ]}
            >
              Acesso por Usuário
            </Text>
          </Pressable>
        </View>

        {activeTab === 'cargos' ? (
          <>
            <View style={styles.directorNotifHeaderRow}>
              <Text style={styles.directorNotifCountLabel}>{adminCargosMock.length} cargos</Text>
              <Pressable
                style={styles.directorNotifNewButton}
                onPress={() => Alert.alert('Novo cargo', 'Cadastro de cargo em breve.')}
              >
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={styles.directorNotifNewButtonText}>Novo cargo</Text>
              </Pressable>
            </View>

            {adminCargosMock.map((cargo) => {
              const groupColors = adminGroupColorMap[cargo.group] ?? { bg: GRAY_BG, color: GRAY };
              return (
                <View key={cargo.id} style={adminStyles.roleCard}>
                  <View style={adminStyles.roleCardTopRow}>
                    <Text style={adminStyles.roleName}>{cargo.name}</Text>
                    <AdminColorPill label={cargo.group} bg={groupColors.bg} color={groupColors.color} />
                  </View>
                  <View style={adminStyles.roleModulesRow}>
                    {cargo.modules.map((module) => (
                      <AdminTagPill key={module} label={module} />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <>
            <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar por nome, e-mail ou cargo..." />

            {filteredUsers.length === 0 ? (
              <AdminEmptyState message="Nenhum usuário encontrado." />
            ) : (
              filteredUsers.map((item) => (
                <View key={item.id} style={adminStyles.listCard}>
                  <View style={adminStyles.listAvatar}>
                    <Text style={adminStyles.listAvatarText}>{getInitialsFromName(item.name)}</Text>
                  </View>
                  <View style={adminStyles.listInfo}>
                    <Text style={adminStyles.listName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={adminStyles.listMeta} numberOfLines={1}>
                      {item.role}
                    </Text>
                  </View>
                  <Text style={adminStyles.moduleCountText}>{item.moduleCount} módulos</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 5. Grupos
// ============================================================================

type AdminGrupo = { id: string; name: string; cargoCount: number };

const adminGruposMock: AdminGrupo[] = [
  { id: 'g1', name: 'Administrativo', cargoCount: 0 },
  { id: 'g2', name: 'Corporativo', cargoCount: 5 },
  { id: 'g3', name: 'Diretoria', cargoCount: 0 },
  { id: 'g4', name: 'Gestão', cargoCount: 0 },
  { id: 'g5', name: 'Operacional', cargoCount: 4 },
];

export function AdminGruposScreen({ navigation }: ScreenProps<'AdminGrupos'>) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return adminGruposMock;
    return adminGruposMock.filter((item) => item.name.toLowerCase().includes(query));
  }, [search]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdminPageHeader icon="user" title="Grupos" subtitle="5 grupos" />

        <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar por nome ou descrição..." />

        <View style={[styles.directorNotifHeaderRow, { justifyContent: 'flex-end' }]}>
          <Pressable
            style={styles.directorNotifNewButton}
            onPress={() => Alert.alert('Novo grupo', 'Cadastro de grupo em breve.')}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.directorNotifNewButtonText}>Novo</Text>
          </Pressable>
        </View>

        {filtered.length === 0 ? (
          <AdminEmptyState message="Nenhum grupo encontrado." />
        ) : (
          filtered.map((group) => {
            const colors = adminGroupColorMap[group.name] ?? { bg: GRAY_BG, color: GRAY };
            return (
              <View key={group.id} style={adminStyles.groupRow}>
                <View style={adminStyles.groupLeft}>
                  <AdminColorPill label={group.name} bg={colors.bg} color={colors.color} />
                  <Text style={adminStyles.groupDescription}>—</Text>
                </View>
                <Text style={adminStyles.groupCount}>{group.cargoCount} cargos</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 6. Unidades
// ============================================================================

type AdminUnidade = {
  id: string;
  name: string;
  cnpj: string;
  bandeira: string;
  city: string;
  active: boolean;
};

const adminUnidadesMock: AdminUnidade[] = [
  { id: 'un1', name: 'Auto Mecânica Juquinha Ltd', cnpj: '33.358.771/0001-04', bandeira: 'Vibra', city: 'Rio de Janeiro/RJ', active: true },
  { id: 'un2', name: 'Auto Posto BR 101 Norte Ltda', cnpj: '10.856.579/0001-42', bandeira: 'American Fuel', city: '—', active: true },
  { id: 'un3', name: 'Auto Posto Estrela do Oceano Ltda', cnpj: '08.638.802/0001-33', bandeira: 'Ipiranga', city: 'Rio de Janeiro/RJ', active: true },
  { id: 'un4', name: 'Auto Posto de Serviços Via Dutra 1', cnpj: '04.010.834/0001-39', bandeira: 'Ipiranga', city: 'Nova Iguaçu/RJ', active: true },
  { id: 'un5', name: 'Auto Posto de Serviços Vilar', cnpj: '32.305.732/0001-86', bandeira: 'Ipiranga', city: 'S. J. de Meriti/RJ', active: true },
  { id: 'un6', name: 'Posto Trabalho Itaguaí', cnpj: '24.314.862/0001-57', bandeira: 'Ipiranga', city: 'Itaguaí/RJ', active: true },
];

const adminBandeiraColorMap: Record<string, { bg: string; color: string }> = {
  Vibra: { bg: PURPLE_BG, color: PURPLE },
  'American Fuel': { bg: RED_BG, color: RED },
  Ipiranga: { bg: GOLD_BG, color: GOLD },
};

export function AdminUnidadesScreen({ navigation }: ScreenProps<'AdminUnidades'>) {
  const [search, setSearch] = useState('');
  const [unidades, setUnidades] = useState(adminUnidadesMock);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return unidades;
    return unidades.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.cnpj.toLowerCase().includes(query) ||
        item.bandeira.toLowerCase().includes(query)
    );
  }, [unidades, search]);

  const toggleUnidade = (id: string) => {
    setUnidades((current) => current.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdminPageHeader icon="home" title="Unidades" subtitle="58 unidades" />

        <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar por nome, CNPJ, bandeira..." />

        <View style={[styles.directorNotifHeaderRow, { justifyContent: 'flex-end' }]}>
          <Pressable
            style={styles.directorNotifNewButton}
            onPress={() => Alert.alert('Nova unidade', 'Cadastro de unidade em breve.')}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.directorNotifNewButtonText}>Nova</Text>
          </Pressable>
        </View>

        {filtered.length === 0 ? (
          <AdminEmptyState message="Nenhuma unidade encontrada." />
        ) : (
          filtered.map((unidade) => {
            const bandeiraColors = adminBandeiraColorMap[unidade.bandeira] ?? { bg: GRAY_BG, color: GRAY };
            return (
              <View key={unidade.id} style={adminStyles.unitCard}>
                <View style={adminStyles.unitInfo}>
                  <Text style={adminStyles.listName} numberOfLines={1}>
                    {unidade.name}
                  </Text>
                  <Text style={adminStyles.listMeta}>{unidade.cnpj}</Text>
                  <View style={adminStyles.roleModulesRow}>
                    <AdminColorPill label={unidade.bandeira} bg={bandeiraColors.bg} color={bandeiraColors.color} />
                    <AdminTagPill label="Posto" />
                  </View>
                </View>
                <View style={adminStyles.unitRight}>
                  <Text style={adminStyles.unitCity}>{unidade.city}</Text>
                  <ToggleSwitch value={unidade.active} onValueChange={() => toggleUnidade(unidade.id)} />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 7. Módulos
// ============================================================================

type AdminModulo = { id: string; name: string; slug: string; icon: FeatherIconName; active: boolean };

const adminModulosMock: AdminModulo[] = [
  { id: 'mod1', name: 'Administrador', slug: 'administrador', icon: 'shield', active: true },
  { id: 'mod2', name: 'RH', slug: 'rh', icon: 'users', active: true },
  { id: 'mod3', name: 'R&S', slug: 'recrutamento', icon: 'briefcase', active: true },
  { id: 'mod4', name: 'Colaborador', slug: 'colaborador', icon: 'user', active: true },
  { id: 'mod5', name: 'Financeiro', slug: 'financeiro', icon: 'dollar-sign', active: true },
  { id: 'mod6', name: 'Gestão', slug: 'gestao', icon: 'bar-chart-2', active: true },
  { id: 'mod7', name: 'Administrativo', slug: 'administrativo', icon: 'clipboard', active: true },
  { id: 'mod8', name: 'Diretoria', slug: 'diretoria', icon: 'trending-up', active: true },
  { id: 'mod9', name: 'Marketing & Fidelidade', slug: 'marketing', icon: 'gift', active: true },
];

export function AdminModulosScreen({ navigation }: ScreenProps<'AdminModulos'>) {
  const [modulos, setModulos] = useState(adminModulosMock);

  const toggleModulo = (id: string) => {
    setModulos((current) => current.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdminPageHeader icon="grid" title="Módulos" subtitle="9 módulos da plataforma" />

        {modulos.map((modulo) => (
          <View key={modulo.id} style={adminStyles.listCard}>
            <View style={[styles.iconShell, adminStyles.iconAccentNavy]}>
              <Feather name={modulo.icon} size={17} color={NAVY} />
            </View>
            <View style={adminStyles.listInfo}>
              <Text style={adminStyles.listName}>{modulo.name}</Text>
              <Text style={adminStyles.listMeta}>{modulo.slug}</Text>
            </View>
            <ToggleSwitch value={modulo.active} onValueChange={() => toggleModulo(modulo.id)} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 8. Integrações
// ============================================================================

type IntegrationTabKey = 'whatsapp' | 'ponto' | 'folha' | 'agentes' | 'business';

const adminIntegrationTabs: Array<{ key: IntegrationTabKey; label: string }> = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'ponto', label: 'Ponto' },
  { key: 'folha', label: 'Folha' },
  { key: 'agentes', label: 'Agentes IA' },
  // A 5ª aba veio cortada no mockup — assumida como "Business" (Business
  // Intelligence). Ajustar o nome/rota quando o back confirmar.
  { key: 'business', label: 'Business' },
];

export function AdminIntegracoesScreen({ navigation }: ScreenProps<'AdminIntegracoes'>) {
  const [activeTab, setActiveTab] = useState<IntegrationTabKey>('whatsapp');
  const [isTokenVisible, setIsTokenVisible] = useState(false);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdminPageHeader icon="link-2" title="Integrações" subtitle="Serviços conectados" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={adminStyles.tabScrollRow}>
          {adminIntegrationTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[adminStyles.tabPill, isActive ? adminStyles.tabPillActive : null]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[adminStyles.tabPillText, isActive ? adminStyles.tabPillTextActive : null]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === 'whatsapp' ? (
          <View style={adminStyles.sectionCard}>
            <View style={adminStyles.integrationHeaderRow}>
              <View style={adminStyles.integrationHeaderLeft}>
                <View style={[styles.iconShell, adminStyles.iconAccentNavy]}>
                  <Feather name="message-circle" size={17} color={NAVY} />
                </View>
                <View>
                  <Text style={adminStyles.sectionTitle}>WhatsApp</Text>
                  <Text style={adminStyles.integrationDescription}>
                    Integração com ZapResponder (API oficial) ou Meta Cloud.
                  </Text>
                </View>
              </View>
              <AdminColorPill label="Ativo" bg={GREEN_BG} color={GREEN} />
            </View>

            <Text style={adminStyles.fieldLabel}>PROVEDOR</Text>
            <Pressable
              style={adminStyles.selectField}
              onPress={() => Alert.alert('Provedor', 'Troca de provedor em breve.')}
            >
              <Text style={adminStyles.selectFieldText}>ZapResponder (API oficial)</Text>
              <Feather name="chevron-down" size={16} color="#7A8299" />
            </Pressable>

            <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>API URL</Text>
            <View style={adminStyles.staticField}>
              <Text style={adminStyles.staticFieldText} numberOfLines={1}>
                https://api.zapresponder.com.br/api
              </Text>
            </View>

            <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>API TOKEN</Text>
            <View style={adminStyles.staticField}>
              <Text style={adminStyles.staticFieldText}>
                {isTokenVisible ? '(token não exibido — apenas configurável no backend)' : '••••••••••••'}
              </Text>
              <Pressable onPress={() => setIsTokenVisible((current) => !current)} hitSlop={8}>
                <Feather name={isTokenVisible ? 'eye-off' : 'eye'} size={16} color="#7A8299" />
              </Pressable>
            </View>

            <View style={adminStyles.integrationActionsRow}>
              <Pressable
                style={adminStyles.primaryButtonGreen}
                onPress={() => Alert.alert('Salvo', 'Configuração salva (mock).')}
              >
                <Text style={adminStyles.primaryButtonGreenText}>Salvar</Text>
              </Pressable>
              <Pressable
                style={adminStyles.outlineButton}
                onPress={() => Alert.alert('Testar conexão', 'Teste de conexão em breve.')}
              >
                <Text style={adminStyles.outlineButtonText}>Testar conexão</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <AdminEmptyState message="Em breve. Esta integração ainda está em desenvolvimento." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 9. Convenções
// ============================================================================

const adminPrefixRows = [
  { module: 'Recrutamento', prefix: 'rs_' },
  { module: 'Financeiro', prefix: 'fin_' },
  { module: 'RH', prefix: 'rh_' },
  { module: 'Gestão', prefix: 'gst_' },
];

type AdminChangelogEntry = { id: string; date: string; title: string; tag: string; description: string };

const adminChangelogMock: AdminChangelogEntry[] = [
  {
    id: 'log-1',
    date: '2026-07-02',
    title: 'Diretoria: Fale com a Diretoria (chat interno)',
    tag: 'feature',
    description:
      'Novas tabelas dir_contatos, dir_mensagens e dir_read_cursors. Base para o chat interno com mesma UX do WhatsApp, sem integração externa por enquanto.',
  },
  {
    id: 'log-2',
    date: '2026-07-02',
    title: 'Meta + Google: inbox unificado e triagem',
    tag: 'feature',
    description:
      'wa_contatos e wa_mensagens ganham channel (whatsapp|instagram|messenger). mk_ocorrencias adiciona sentimento_ia e urgencia_ia.',
  },
  {
    id: 'log-3',
    date: '2026-05-13',
    title: 'Workflow + Folha completa',
    tag: 'feature',
    description:
      'Módulo Workflow (hierarquia + fluxos de aprovação) e Folha de Pagamento com rubricas e tabelas legais 2026.',
  },
];

export function AdminConvencoesScreen({ navigation }: ScreenProps<'AdminConvencoes'>) {
  const [activeTab, setActiveTab] = useState<'regras' | 'changelog'>('regras');

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdminPageHeader icon="book-open" title="Convenções" subtitle="Regras de banco de dados" />

        <View style={styles.directorNotifTabsRow}>
          <Pressable
            style={[styles.directorNotifTab, activeTab === 'regras' ? styles.directorNotifTabActive : null]}
            onPress={() => setActiveTab('regras')}
          >
            <Text
              style={[styles.directorNotifTabText, activeTab === 'regras' ? styles.directorNotifTabTextActive : null]}
            >
              Regras
            </Text>
          </Pressable>
          <Pressable
            style={[styles.directorNotifTab, activeTab === 'changelog' ? styles.directorNotifTabActive : null]}
            onPress={() => setActiveTab('changelog')}
          >
            <Text
              style={[
                styles.directorNotifTabText,
                activeTab === 'changelog' ? styles.directorNotifTabTextActive : null,
              ]}
            >
              Changelog
            </Text>
          </Pressable>
        </View>

        {activeTab === 'regras' ? (
          <View style={adminStyles.sectionCard}>
            <Text style={adminStyles.fileLabel}>database-conventions.md</Text>
            <Text style={adminStyles.sectionTitle}>Convenções de Banco — AF 360</Text>
            <Text style={adminStyles.integrationDescription}>
              Regras para criação e manutenção de tabelas. Toda migration deve seguir estas regras.
            </Text>

            <Text style={[adminStyles.subsectionTitle, adminStyles.fieldSpacing]}>1 · Idioma</Text>
            <Text style={adminStyles.integrationDescription}>
              Domínio de negócio → português (empresas, vagas, unidades). Infraestrutura → inglês (profiles, modules,
              roles, audit_log).
            </Text>

            <Text style={[adminStyles.subsectionTitle, adminStyles.fieldSpacing]}>2 · Prefixo por módulo</Text>
            {adminPrefixRows.map((row, index) => (
              <View
                key={row.module}
                style={[adminStyles.prefixRow, index === adminPrefixRows.length - 1 ? { borderBottomWidth: 0 } : null]}
              >
                <Text style={adminStyles.prefixModule}>{row.module}</Text>
                <Text style={adminStyles.prefixCode}>{row.prefix}</Text>
              </View>
            ))}
          </View>
        ) : (
          adminChangelogMock.map((entry, index) => (
            <View
              key={entry.id}
              style={[adminStyles.sectionCard, index === adminChangelogMock.length - 1 ? adminStyles.lastSectionCard : null]}
            >
              <View style={adminStyles.changelogHeaderRow}>
                <Text style={adminStyles.changelogDate}>{entry.date}</Text>
                <AdminColorPill label={entry.tag} bg={BLUE_BG} color={BLUE} />
              </View>
              <Text style={adminStyles.subsectionTitle}>{entry.title}</Text>
              <Text style={adminStyles.integrationDescription}>{entry.description}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 10. Configurações
// ============================================================================

export function AdminConfiguracoesScreen({ navigation }: ScreenProps<'AdminConfiguracoes'>) {
  const [domains, setDomains] = useState([
    { id: 'd1', domain: '@americanfuel.com.br', description: 'Domínio corporativo principal', active: true },
    { id: 'd2', domain: '@rede.americanfuel.com.br', description: 'Domínio da rede de postos', active: true },
  ]);

  const toggleDomain = (id: string) => {
    setDomains((current) => current.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdminPageHeader icon="settings" title="Configurações" subtitle="Domínios e tema visual" />

        <View style={adminStyles.sectionCard}>
          <Text style={adminStyles.sectionTitle}>Domínios permitidos</Text>
          <Text style={adminStyles.integrationDescription}>
            Somente e-mails desses domínios podem entrar na plataforma.
          </Text>

          {domains.map((item, index) => (
            <View
              key={item.id}
              style={[adminStyles.domainRow, index === domains.length - 1 ? { borderBottomWidth: 0 } : null]}
            >
              <View style={adminStyles.listInfo}>
                <Text style={adminStyles.listName}>{item.domain}</Text>
                <Text style={adminStyles.listMeta}>{item.description}</Text>
              </View>
              <ToggleSwitch value={item.active} onValueChange={() => toggleDomain(item.id)} />
            </View>
          ))}
        </View>

        <View style={[adminStyles.sectionCard, adminStyles.lastSectionCard]}>
          <Text style={adminStyles.sectionTitle}>Tema da tela de Início</Text>

          <View style={adminStyles.themeRow}>
            <View style={adminStyles.themeRowTop}>
              <Text style={adminStyles.subsectionTitle}>Copa do Mundo — Brasil 2026</Text>
              <AdminColorPill label="✓ Ativo" bg={GREEN_BG} color={GREEN} />
            </View>
            <Text style={adminStyles.listMeta}>Cores da Seleção Brasileira para a Copa.</Text>
            <View style={adminStyles.themeDotsRow}>
              <View style={[adminStyles.themeDot, { backgroundColor: '#0F8A3C' }]} />
              <View style={[adminStyles.themeDot, { backgroundColor: '#FFD100' }]} />
              <View style={[adminStyles.themeDot, { backgroundColor: NAVY }]} />
              <View style={[adminStyles.themeDot, { backgroundColor: '#F5EBD8' }]} />
            </View>
          </View>

          <View style={[adminStyles.themeRow, { borderBottomWidth: 0 }]}>
            <View style={adminStyles.themeRowTop}>
              <Text style={adminStyles.subsectionTitle}>Padrão AF</Text>
              <Pressable
                style={adminStyles.applyButton}
                onPress={() => Alert.alert('Tema', 'Tema "Padrão AF" aplicado (mock).')}
              >
                <Text style={adminStyles.applyButtonText}>Aplicar</Text>
              </Pressable>
            </View>
            <Text style={adminStyles.listMeta}>Identidade visual padrão (navy + vermelho).</Text>
            <View style={adminStyles.themeDotsRow}>
              <View style={[adminStyles.themeDot, { backgroundColor: NAVY }]} />
              <View style={[adminStyles.themeDot, { backgroundColor: RED }]} />
              <View style={[adminStyles.themeDot, { backgroundColor: '#F5EBD8' }]} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 11. Versões
// ============================================================================

const adminVersionStats = [
  { id: 'v1', label: 'Novo módulo', value: 5, color: GREEN, bg: GREEN_BG },
  { id: 'v2', label: 'Melhoria', value: 3, color: BLUE, bg: BLUE_BG },
  { id: 'v3', label: 'Correção', value: 1, color: GRAY, bg: GRAY_BG },
  { id: 'v4', label: 'Segurança', value: 2, color: GOLD, bg: GOLD_BG },
  { id: 'v5', label: 'Banco/RLS', value: 0, color: PURPLE, bg: PURPLE_BG },
];

const adminReleaseItems = [
  {
    id: 'ri1',
    tag: 'Novo módulo',
    title: 'Módulo Workflow — Hierarquia por Posto',
    description: 'Gestão de liderança por posto com atribuir/remover/transferir e timeline global.',
  },
  {
    id: 'ri2',
    tag: 'Novo módulo',
    title: 'Módulo Workflow — Fluxos de Aprovação',
    description:
      'Editor visual drag-and-drop de fluxos com nós de Início, Aprovação, Decisão, Notificação, Prazo e Fim.',
  },
  {
    id: 'ri3',
    tag: 'Novo módulo',
    title: 'Documentos do colaborador',
    description: 'Visualização em pastas com upload, validade colorida e contagem de pendentes.',
  },
  {
    id: 'ri4',
    tag: 'Novo módulo',
    title: 'Folha de Pagamento — MVP completo',
    description: 'Rubricas, tabelas legais 2026 (INSS, IRRF), cálculo CLT e assinatura digital.',
  },
  {
    id: 'ri5',
    tag: 'Melhoria',
    // Descrição cortada no mockup original — completada de forma plausível
    // com base no título ("Cadastro do colaborador — Dados ampliados").
    title: 'Cadastro do colaborador — Dados ampliados',
    description: 'Campos adicionais no cadastro do colaborador (dados bancários, contatos de emergência e anexos).',
  },
];

export function AdminVersoesScreen({ navigation }: ScreenProps<'AdminVersoes'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdminPageHeader icon="refresh-cw" title="Versões" subtitle="Histórico do AF360" />

        <View style={adminStyles.miniStatRow}>
          {adminVersionStats.map((item) => (
            <View key={item.id} style={[adminStyles.miniStatCard, { backgroundColor: item.bg }]}>
              <Text style={[adminStyles.miniStatValue, { color: item.color }]}>{item.value}</Text>
              <Text style={[adminStyles.miniStatLabel, { color: item.color }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={[adminStyles.sectionCard, adminStyles.lastSectionCard]}>
          <View style={adminStyles.releaseHeaderRow}>
            <Text style={adminStyles.subsectionTitle}>v1.4.0 · 13/05/2026</Text>
            <AdminColorPill label="DESTAQUE" bg={RED_BG} color={RED} />
          </View>
          <Text style={adminStyles.sectionTitle}>Workflow + Documentos + Folha completa</Text>

          {adminReleaseItems.map((item, index) => {
            const isNewModule = item.tag === 'Novo módulo';
            return (
              <View
                key={item.id}
                style={[adminStyles.releaseItem, index === adminReleaseItems.length - 1 ? { marginBottom: 0 } : null]}
              >
                <View style={adminStyles.releaseItemHeaderRow}>
                  <AdminColorPill
                    label={item.tag}
                    bg={isNewModule ? GREEN_BG : BLUE_BG}
                    color={isNewModule ? GREEN : BLUE}
                  />
                  <Text style={adminStyles.releaseItemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                <Text style={adminStyles.integrationDescription}>{item.description}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 12. Notificações (Rotinas / Templates)
// ============================================================================
// Reaproveita exatamente o padrão de RHNotificationsScreen (RH.tsx), inclusive
// o estado vazio — apenas com listas mock começando vazias para o Admin.

export function AdminNotificationsScreen({ navigation }: ScreenProps<'AdminNotifications'>) {
  const [activeTab, setActiveTab] = useState<'routines' | 'templates'>('routines');
  const [routines, setRoutines] = useState<NotificationRoutineItem[]>([]);
  const [isRoutineFormOpen, setIsRoutineFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<NotificationRoutineItem | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplateItem[]>([]);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateItem | null>(null);

  const openCreateRoutineModal = () => {
    setEditingRoutine(null);
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

  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
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
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdminPageHeader icon="bell" title="Notificações" subtitle="Rotinas e templates" />

        <View style={styles.directorNotifTabsRow}>
          <Pressable
            style={[styles.directorNotifTab, activeTab === 'routines' ? styles.directorNotifTabActive : null]}
            onPress={() => setActiveTab('routines')}
          >
            <Text
              style={[styles.directorNotifTabText, activeTab === 'routines' ? styles.directorNotifTabTextActive : null]}
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
                <Text style={styles.directorNotifNewButtonText}>Nova rotina</Text>
              </Pressable>
            </View>

            {routines.length === 0 ? (
              <AdminEmptyState message="Nenhuma rotina cadastrada. Clique em Nova rotina." />
            ) : (
              routines.map((routine) => (
                <View key={routine.id} style={styles.routineCard}>
                  <View style={styles.routineTopRow}>
                    <Text style={styles.routineTitle}>{routine.title}</Text>
                  </View>
                  <Text style={styles.routineSubtitle}>{routine.messageTitle}</Text>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <View style={styles.directorNotifHeaderRow}>
              <Text style={styles.directorNotifCountLabel}>{templates.length} template(s)</Text>
              <Pressable style={styles.directorNotifNewButton} onPress={openCreateTemplateModal}>
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={styles.directorNotifNewButtonText}>Novo</Text>
              </Pressable>
            </View>

            {templates.length === 0 ? (
              <AdminEmptyState message="Nenhum template cadastrado ainda." />
            ) : (
              templates.map((template) => (
                <View key={template.id} style={styles.templateCard}>
                  <Text style={styles.templateTitle}>{template.title}</Text>
                  <Text style={styles.templateDescription}>{template.messageTitle}</Text>
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

// ============================================================================
// 13. Logs
// ============================================================================

type AdminLog = { id: string; action: string; badges: string[]; when: string };

const adminLogsMock: AdminLog[] = [
  { id: 'log1', action: 'wa_webhook_unmapped_payload', badges: ['marketing_whatsapp', 'wa_mensagens'], when: '17/06/2026, 22:53' },
  { id: 'log2', action: 'wa_webhook_unmapped_payload', badges: ['marketing_whatsapp', 'wa_mensagens', '201.20.44.170'], when: '17/06/2026, 22:52' },
  { id: 'log3', action: 'migration', badges: ['rh', 'rh_folha'], when: '12/05/2026, 21:19' },
  { id: 'log4', action: 'function_update', badges: ['gestao', 'leg_produtos_cadastro_suspeito'], when: '08/05/2026, 10:42' },
  { id: 'log5', action: 'function_update', badges: ['gestao', 'leg_dashboard_margem'], when: '08/05/2026, 10:14' },
];

export function AdminLogsScreen({ navigation }: ScreenProps<'AdminLogs'>) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return adminLogsMock;
    return adminLogsMock.filter(
      (log) =>
        log.action.toLowerCase().includes(query) || log.badges.some((badge) => badge.toLowerCase().includes(query))
    );
  }, [search]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={adminUserInitials}
          variant="administrador"
          onAvatarPress={() => navigation.navigate('AdminProfile')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AdminPageHeader icon="file-text" title="Logs" subtitle="Auditoria · 5 registros" />

        <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar por ação, módulo, tabela..." />

        {filtered.length === 0 ? (
          <AdminEmptyState message="Nenhum registro encontrado." />
        ) : (
          filtered.map((log, index) => (
            <View key={log.id} style={[adminStyles.logCard, index === filtered.length - 1 ? { marginBottom: 0 } : null]}>
              <View style={adminStyles.logHeaderRow}>
                <Text style={adminStyles.logAction}>{log.action}</Text>
                <Text style={adminStyles.logWhen}>{log.when}</Text>
              </View>
              <View style={adminStyles.roleModulesRow}>
                {log.badges.map((badge) => (
                  <AdminTagPill key={badge} label={badge} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Local styles (equivalente ao rhStyles de RH.tsx) ----------

const adminStyles = StyleSheet.create({
  pageHeaderSubtitle: {
    marginTop: 2,
  },
  iconAccentNavy: {
    backgroundColor: NAVY_BG,
  },
  heroCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#3ED598',
  },
  liveBadgeText: {
    color: '#E7E9F5',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 4,
    color: '#C7CBE0',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#7C8397',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 10,
    marginTop: 4,
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
  sectionTitle: {
    color: '#15203E',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  subsectionTitle: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  fileLabel: {
    color: '#9AA1B5',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricMeta: {
    marginTop: 2,
    color: '#9AA1B5',
    fontSize: 11,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
  },
  statCardValue: {
    color: '#0C1736',
    fontSize: 20,
    fontWeight: '800',
  },
  statCardLabel: {
    marginTop: 4,
    color: '#4C5470',
    fontSize: 12,
    fontWeight: '600',
  },
  tableRow: {
    marginBottom: 12,
  },
  tableRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tableRank: {
    color: '#9AA1B5',
    fontSize: 12,
    fontWeight: '700',
    width: 16,
  },
  tableName: {
    flex: 1,
    color: '#15203E',
    fontSize: 13,
    fontWeight: '700',
  },
  tableMeta: {
    color: '#7C8397',
    fontSize: 11,
  },
  tableProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#F1F2F7',
    overflow: 'hidden',
  },
  tableProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: NAVY,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F7',
  },
  healthLabel: {
    color: '#4C5470',
    fontSize: 13,
  },
  healthValue: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  healthValueAlert: {
    color: RED,
  },
  monthBarChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    height: 110,
  },
  monthBarGroup: {
    alignItems: 'center',
    gap: 6,
  },
  monthBar: {
    width: 20,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: NAVY,
  },
  monthBarLabel: {
    color: '#9AA1B5',
    fontSize: 10,
    fontWeight: '600',
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
    color: BLUE,
    fontSize: 13,
    fontWeight: '700',
  },
  rankValue: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
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
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterPillText: {
    color: '#4C5470',
    fontSize: 12,
    fontWeight: '600',
  },
  listCard: {
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
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: NAVY_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listAvatarText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '800',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  listEmail: {
    marginTop: 2,
    color: '#C1440E',
    fontSize: 12,
    fontWeight: '600',
  },
  listMeta: {
    marginTop: 2,
    color: '#4C5470',
    fontSize: 12,
  },
  moduleCountText: {
    color: '#7C8397',
    fontSize: 12,
    fontWeight: '700',
  },
  tagPill: {
    backgroundColor: GRAY_BG,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagPillText: {
    color: GRAY,
    fontSize: 11,
    fontWeight: '700',
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 10,
  },
  roleCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  roleName: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  roleModulesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 10,
  },
  groupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  groupDescription: {
    color: '#9AA1B5',
    fontSize: 13,
  },
  groupCount: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '700',
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  unitInfo: {
    flex: 1,
  },
  unitRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  unitCity: {
    color: '#4C5470',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  tabScrollRow: {
    marginBottom: 14,
  },
  tabPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  tabPillActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  tabPillText: {
    color: '#4C5470',
    fontSize: 12,
    fontWeight: '700',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  integrationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  integrationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  integrationDescription: {
    marginTop: 2,
    color: '#6F768A',
    fontSize: 12,
    lineHeight: 17,
  },
  fieldLabel: {
    color: '#7C8397',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  fieldSpacing: {
    marginTop: 14,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectFieldText: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '600',
  },
  staticField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#DDE4F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  staticFieldText: {
    flex: 1,
    color: '#15203E',
    fontSize: 13,
    fontWeight: '600',
  },
  integrationActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  primaryButtonGreen: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonGreenText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  outlineButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '700',
  },
  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F7',
  },
  prefixModule: {
    color: '#4C5470',
    fontSize: 13,
    fontWeight: '600',
  },
  prefixCode: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '800',
  },
  changelogHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  changelogDate: {
    color: '#9AA1B5',
    fontSize: 12,
    fontWeight: '700',
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F7',
    gap: 10,
  },
  themeRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F7',
    gap: 6,
  },
  themeRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeDotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  themeDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  applyButton: {
    backgroundColor: GRAY_BG,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  applyButtonText: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '700',
  },
  miniStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  miniStatCard: {
    flexGrow: 1,
    minWidth: '18%',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  miniStatLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
  },
  releaseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  releaseItem: {
    marginTop: 14,
    marginBottom: 4,
  },
  releaseItemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  releaseItemTitle: {
    flex: 1,
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
    marginBottom: 10,
  },
  logHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 10,
  },
  logAction: {
    flex: 1,
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  logWhen: {
    color: '#9AA1B5',
    fontSize: 11,
    fontWeight: '600',
  },
});
