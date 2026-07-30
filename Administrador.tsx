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

import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import adminConvencoesContent from './adminConvencoesContent.json';
import {
  styles,
  TopBar,
  ToggleSwitch,
  adminUser,
  adminUserInitials,
  AuthIdentityContext,
  AdminThemeContext,
  ADMIN_THEME_PRESETS,
  NotificationRoutineFormModal,
  TemplateFormModal,
  formatDateBR,
  getCalendarWeeks,
  calendarMonthNames,
} from './App';
import type {
  ScreenProps,
  AdminThemePreset,
  NotificationRoutineItem,
  NotificationTemplateItem,
} from './App';
import {
  fetchAdminUsuarios,
  createAdminUsuario,
  resetAdminUsuarioSenha,
  toggleAdminUsuarioAtivo,
  updateAdminUsuario,
  deleteAdminUsuario,
  fetchAdminCargos,
  createAdminCargo,
  updateAdminCargo,
  deleteAdminCargo,
  putAdminCargoPermissoes,
  fetchAdminModulos,
  updateAdminModulo,
  fetchAdminModuleFeatures,
  fetchAdminGrupos,
  createAdminGrupo,
  updateAdminGrupo,
  deleteAdminGrupo,
  fetchAdminAcessoPorUsuario,
  addAdminUsuarioModulo,
  removeAdminUsuarioModulo,
  resetAdminUsuarioModulos,
  putAdminUsuarioPermissoes,
  fetchRhUnidades,
  fetchAdminUnidades,
  createAdminUnidade,
  updateAdminUnidade,
  deleteAdminUnidade,
  venderAdminUnidade,
  fetchAdminContabilidades,
  createAdminContabilidade,
  updateAdminContabilidade,
  deleteAdminContabilidade,
  fetchRhColaboradores,
  ApiError,
  type AdminUsuarioItem,
  type AdminCargoItem,
  type AdminGrupoItem,
  type AdminAcessoUsuarioItem,
  type AdminModuleItem,
  type AdminModuleFeatureItem,
  type AdminFeaturePermission,
  type AdminUnidadeItem,
  type AdminUnidadeBandeira,
  type AdminUnidadeTipo,
  type AdminUnidadeServicos,
  type AdminContabilidadeItem,
  type RhUnidadeItem,
  type RhColaboradorRaw,
} from './api';

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
  const { theme } = useContext(AdminThemeContext);
  return (
    <View style={styles.pageHeader}>
      <View style={styles.directorPageTitleRow}>
        <View style={[styles.iconShell, adminStyles.iconAccentNavy, { backgroundColor: theme.primaryBg }]}>
          <Feather name={icon} size={18} color={theme.primary} />
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

// Formata profiles.created_at (ISO) -> "DD/MM/AAAA". Sem dado real, mostra
// "—" em vez de inventar uma data.
function formatAdminDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

// ---------- Select + picker reutilizáveis (Cargo/Unidade nos formulários de
// usuário) — mesmo padrão de RH.tsx (RHSelectField/RHSimplePickerModal), mas
// local a este arquivo pra não criar acoplamento entre os dois módulos.

function AdminSelectField({
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
          <Text style={[styles.requestSelectText, !value ? adminStyles.selectPlaceholder : null]}>
            {value || placeholder}
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color="#7A8299" />
      </Pressable>
    </>
  );
}

// inline=true: renderiza como overlay absoluto dentro do próprio <Modal> pai
// em vez de abrir um <Modal> nativo próprio — evita o bug de modal-em-modal
// (dois <Modal> nativos empilhados podem não repassar toque em alguns
// aparelhos) já visto e corrigido em RH.tsx.
function AdminSimplePickerModal({
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
  if (!visible) return null;

  return (
    <View style={adminStyles.inlinePickerLayer}>
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
                    <Text style={[styles.templateOptionText, isSelected ? styles.templateOptionTextActive : null]}>
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
    </View>
  );
}

// ---------- Modal de detalhes do usuário (Usuários > tocar na linha) ----------

function AdminUserDetailModal({
  visible,
  user,
  onClose,
  onEdit,
}: {
  visible: boolean;
  user: AdminUsuarioItem | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!user) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle} numberOfLines={1}>
                {(user.fullName || '(sem nome)').toUpperCase()}
              </Text>
              <Text style={adminStyles.detailSubEmail} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={adminStyles.detailGridRow}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>NOME COMPLETO</Text>
                <Text style={adminStyles.detailFieldValue}>{user.fullName || '—'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>E-MAIL</Text>
                <Text style={adminStyles.detailFieldValue} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            </View>

            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>CARGO</Text>
                <Text style={adminStyles.detailFieldValue}>{user.cargo || 'Sem cargo'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>UNIDADE</Text>
                <Text style={adminStyles.detailFieldValue}>{user.unidade || '—'}</Text>
              </View>
            </View>

            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>MASTER</Text>
                <View style={[adminStyles.detailBadgeBase, adminStyles.detailBadgeNeutral]}>
                  <Feather name={user.isMaster ? 'check-circle' : 'slash'} size={11} color={GRAY} />
                  <Text style={[adminStyles.detailBadgeText, { color: GRAY }]}>{user.isMaster ? 'Sim' : 'Não'}</Text>
                </View>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>ATIVO</Text>
                <View
                  style={[
                    adminStyles.detailBadgeBase,
                    { backgroundColor: user.isActive ? GREEN_BG : RED_BG },
                  ]}
                >
                  <Feather
                    name={user.isActive ? 'check-circle' : 'x-circle'}
                    size={11}
                    color={user.isActive ? GREEN : RED}
                  />
                  <Text style={[adminStyles.detailBadgeText, { color: user.isActive ? GREEN : RED }]}>
                    {user.isActive ? 'Sim' : 'Não'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>CRIADO EM</Text>
            <Text style={adminStyles.detailFieldValue}>{formatAdminDate(user.createdAt)}</Text>
          </ScrollView>

          <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
            <Pressable style={[styles.secondaryButton, adminStyles.secondaryButtonCompact]} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Fechar</Text>
            </Pressable>
            <Pressable style={adminStyles.primaryActionButton} onPress={onEdit}>
              <Feather name="edit-2" size={14} color="#FFFFFF" />
              <Text style={adminStyles.primaryActionButtonText}>Editar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Menu de ações por linha (Visualizar/Editar/Redefinir senha/
// Inativar/Excluir) ----------

function AdminActionsMenuModal({
  visible,
  user,
  onClose,
  onVisualizar,
  onEditar,
  onRedefinirSenha,
  onToggleAtivo,
  onExcluir,
}: {
  visible: boolean;
  user: AdminUsuarioItem | null;
  onClose: () => void;
  onVisualizar: () => void;
  onEditar: () => void;
  onRedefinirSenha: () => void;
  onToggleAtivo: () => void;
  onExcluir: () => void;
}) {
  if (!user) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.requestModalBackdrop} onPress={onClose}>
        <Pressable style={adminStyles.actionsMenuCard} onPress={() => {}}>
          <Text style={adminStyles.actionsMenuTitle} numberOfLines={1}>
            {user.fullName || user.email}
          </Text>
          <Pressable style={adminStyles.actionsMenuRow} onPress={onVisualizar}>
            <Feather name="eye" size={16} color="#4C5470" />
            <Text style={adminStyles.actionsMenuRowText}>Visualizar</Text>
          </Pressable>
          <Pressable style={adminStyles.actionsMenuRow} onPress={onEditar}>
            <Feather name="edit-2" size={16} color="#4C5470" />
            <Text style={adminStyles.actionsMenuRowText}>Editar</Text>
          </Pressable>
          <Pressable style={adminStyles.actionsMenuRow} onPress={onRedefinirSenha}>
            <Feather name="key" size={16} color="#4C5470" />
            <Text style={adminStyles.actionsMenuRowText}>Redefinir senha</Text>
          </Pressable>
          <Pressable style={adminStyles.actionsMenuRow} onPress={onToggleAtivo}>
            <Feather name={user.isActive ? 'slash' : 'check-circle'} size={16} color="#4C5470" />
            <Text style={adminStyles.actionsMenuRowText}>
              {user.isActive ? 'Inativar acesso' : 'Ativar acesso'}
            </Text>
          </Pressable>
          <Pressable
            style={[adminStyles.actionsMenuRow, adminStyles.actionsMenuRowLast]}
            onPress={onExcluir}
          >
            <Feather name="trash-2" size={16} color={RED} />
            <Text style={[adminStyles.actionsMenuRowText, { color: RED }]}>Excluir</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------- Modal "Redefinir senha" ----------

function AdminResetSenhaModal({
  visible,
  userLabel,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  userLabel: string;
  onClose: () => void;
  onConfirm: (password: string) => void;
}) {
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (visible) setPassword('');
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle}>Redefinir senha</Text>
              <Text style={adminStyles.detailSubEmail} numberOfLines={1}>
                {userLabel}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <Text style={styles.requestFieldLabel}>Nova senha</Text>
          <TextInput
            style={styles.processTextInput}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#A7AEC2"
            secureTextEntry
            autoFocus
          />

          <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
            <Pressable style={[styles.secondaryButton, adminStyles.secondaryButtonCompact]} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={adminStyles.primaryActionButton}
              onPress={() => {
                if (password.trim().length < 6) {
                  Alert.alert('Senha muito curta', 'Digite ao menos 6 caracteres.');
                  return;
                }
                onConfirm(password.trim());
              }}
            >
              <Feather name="key" size={14} color="#FFFFFF" />
              <Text style={adminStyles.primaryActionButtonText}>Redefinir</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type AdminUserFormValues = {
  fullName: string;
  email: string;
  password: string;
  cargo: string;
  unidade: string;
  chatAtendente: boolean;
  isMaster: boolean;
};

function emptyAdminUserForm(): AdminUserFormValues {
  return { fullName: '', email: '', password: '', cargo: '', unidade: '', chatAtendente: false, isMaster: false };
}

// ---------- Modal "Novo Usuário" / "Editar usuário" ----------
// Cargo e Unidade puxam de verdade do banco (fetchAdminCargos / fetchRhUnidades
// — os mesmos endpoints já usados em Perfil de Acesso e no módulo RH). Criar/
// Salvar gravam de verdade via createAdminUsuario/updateAdminUsuario (ver
// AdminUsuariosScreen), que resolvem o nome do cargo/unidade escolhido pro
// role_id/empresa_id reais antes de mandar pro backend.
function AdminUserFormModal({
  visible,
  mode,
  initialValues,
  cargoOptions,
  unidadeOptions,
  isSaving,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  initialValues: AdminUserFormValues;
  cargoOptions: string[];
  unidadeOptions: string[];
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: AdminUserFormValues) => void;
}) {
  const [form, setForm] = useState<AdminUserFormValues>(initialValues);
  const [isCargoPickerOpen, setIsCargoPickerOpen] = useState(false);
  const [isUnidadePickerOpen, setIsUnidadePickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(initialValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValues.fullName, initialValues.email]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle}>{mode === 'create' ? 'Novo Usuário' : 'Editar usuário'}</Text>
              {mode === 'create' ? (
                <Text style={adminStyles.detailSubEmail}>O e-mail deve terminar com @americanfuel.com.br.</Text>
              ) : null}
            </View>
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

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>E-mail</Text>
            <TextInput
              style={styles.processTextInput}
              value={form.email}
              onChangeText={(text) => setForm((current) => ({ ...current, email: text }))}
              placeholder="usuario@americanfuel.com.br"
              placeholderTextColor="#A7AEC2"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={mode === 'create'}
            />

            {mode === 'create' ? (
              <>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Senha inicial</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.password}
                  onChangeText={(text) => setForm((current) => ({ ...current, password: text }))}
                  placeholderTextColor="#A7AEC2"
                  secureTextEntry
                />
              </>
            ) : null}

            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <AdminSelectField
                  label="Cargo"
                  value={form.cargo}
                  onPress={() => setIsCargoPickerOpen(true)}
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <AdminSelectField
                  label="Unidade"
                  value={form.unidade}
                  onPress={() => setIsUnidadePickerOpen(true)}
                />
              </View>
            </View>

            <View style={[adminStyles.checkboxCard, styles.spacingTop]}>
              <View style={{ flex: 1 }}>
                <Text style={adminStyles.checkboxCardLabel}>Atendente do chat</Text>
                <Text style={adminStyles.checkboxCardHint}>Quando marcado, aparece na lista de atendentes do WhatsApp.</Text>
              </View>
              <ToggleSwitch
                value={form.chatAtendente}
                onValueChange={() => setForm((current) => ({ ...current, chatAtendente: !current.chatAtendente }))}
              />
            </View>

            <View style={adminStyles.checkboxCard}>
              <Text style={adminStyles.checkboxCardLabel}>Conceder acesso master</Text>
              <ToggleSwitch
                value={form.isMaster}
                onValueChange={() => setForm((current) => ({ ...current, isMaster: !current.isMaster }))}
              />
            </View>

            <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
              <Pressable style={[styles.secondaryButton, adminStyles.secondaryButtonCompact]} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[adminStyles.primaryActionButton, isSaving ? { opacity: 0.6 } : null]}
                disabled={isSaving}
                onPress={() => onSubmit(form)}
              >
                <Feather name="save" size={14} color="#FFFFFF" />
                <Text style={adminStyles.primaryActionButtonText}>
                  {isSaving ? 'Salvando...' : mode === 'create' ? 'Criar' : 'Salvar'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <AdminSimplePickerModal
            visible={isCargoPickerOpen}
            title="Cargo"
            options={cargoOptions}
            selectedValue={form.cargo}
            onSelect={(value) => setForm((current) => ({ ...current, cargo: value }))}
            onClose={() => setIsCargoPickerOpen(false)}
          />
          <AdminSimplePickerModal
            visible={isUnidadePickerOpen}
            title="Unidade"
            options={unidadeOptions}
            selectedValue={form.unidade}
            onSelect={(value) => setForm((current) => ({ ...current, unidade: value }))}
            onClose={() => setIsUnidadePickerOpen(false)}
          />
        </View>
      </View>
    </Modal>
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
  const { theme } = useContext(AdminThemeContext);
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
        <LinearGradient colors={[theme.primary, theme.primaryLight]} style={adminStyles.heroCard}>
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
                    { backgroundColor: metric.accentBg ?? theme.primaryBg },
                  ]}
                >
                  <Feather name={metric.icon} size={18} color={metric.accentColor ?? theme.primary} />
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
                    { width: `${Math.max(3, (table.sizeMb / maxTableSize) * 100)}%`, backgroundColor: theme.primary },
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
                    { height: Math.max(4, (item.value / maxMonthValue) * chartHeight), backgroundColor: theme.primary },
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
  const { theme } = useContext(AdminThemeContext);
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
        <LinearGradient colors={[theme.primary, theme.primaryLight]} style={styles.directorProfileHero}>
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
// Dados reais via GET /api/admin/usuarios (profiles + roles + rh_colaboradores
// -> empresas). Ver af360-api/src/routes/admin.js. Sem dado mockado: enquanto
// carrega mostramos "Carregando...", se a API falhar mostramos a mensagem de
// erro, e lista vazia (ou busca sem resultado) mostra estado vazio honesto.

export function AdminUsuariosScreen({ navigation }: ScreenProps<'AdminUsuarios'>) {
  const { identity } = useContext(AuthIdentityContext);
  const { theme } = useContext(AdminThemeContext);
  const actorId = identity?.profileId;

  const [search, setSearch] = useState('');
  const [usuarios, setUsuarios] = useState<AdminUsuarioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [cargosReais, setCargosReais] = useState<AdminCargoItem[]>([]);
  const [unidadesReais, setUnidadesReais] = useState<RhUnidadeItem[]>([]);

  const [selectedUser, setSelectedUser] = useState<AdminUsuarioItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [actionsMenuUser, setActionsMenuUser] = useState<AdminUsuarioItem | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formInitialValues, setFormInitialValues] = useState<AdminUserFormValues>(emptyAdminUserForm());
  const [editingUser, setEditingUser] = useState<AdminUsuarioItem | null>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [resetSenhaUser, setResetSenhaUser] = useState<AdminUsuarioItem | null>(null);

  const loadUsuarios = () => {
    setIsLoading(true);
    setErrorMessage(null);
    return fetchAdminUsuarios()
      .then((data) => {
        setUsuarios(data.usuarios);
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os usuários.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchAdminUsuarios()
      .then((data) => {
        if (isActive) setUsuarios(data.usuarios);
      })
      .catch((err) => {
        if (isActive) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os usuários.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    Promise.all([fetchAdminCargos(), fetchRhUnidades()])
      .then(([cargosData, unidadesData]) => {
        if (!isActive) return;
        setCargosReais(cargosData.cargos);
        setUnidadesReais(unidadesData);
      })
      .catch(() => {
        // Silencioso: os pickers de Cargo/Unidade caem pra lista vazia, sem
        // travar o restante da tela.
      });
    return () => {
      isActive = false;
    };
  }, []);

  const cargoOptions = useMemo(
    () => cargosReais.map((cargo) => cargo.name).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [cargosReais]
  );
  const unidadeOptions = useMemo(
    () => unidadesReais.map((unidade) => unidade.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [unidadesReais]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return usuarios;
    return usuarios.filter(
      (user) =>
        (user.fullName ?? '').toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.cargo ?? '').toLowerCase().includes(query) ||
        (user.unidade ?? '').toLowerCase().includes(query)
    );
  }, [usuarios, search]);

  const ativosCount = usuarios.filter((u) => u.isActive).length;

  const showApiError = showAdminApiError;

  const openDetail = (user: AdminUsuarioItem) => {
    setActionsMenuUser(null);
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const openEdit = (user: AdminUsuarioItem) => {
    setActionsMenuUser(null);
    setIsDetailModalOpen(false);
    setFormMode('edit');
    setEditingUser(user);
    setFormInitialValues({
      fullName: user.fullName ?? '',
      email: user.email,
      password: '',
      cargo: user.cargo ?? '',
      unidade: user.unidade ?? '',
      chatAtendente: user.chatAtendente,
      isMaster: user.isMaster,
    });
    setIsFormModalOpen(true);
  };

  const openCreate = () => {
    setFormMode('create');
    setEditingUser(null);
    setFormInitialValues(emptyAdminUserForm());
    setIsFormModalOpen(true);
  };

  const handleExcluir = (user: AdminUsuarioItem) => {
    setActionsMenuUser(null);
    Alert.alert(
      'Excluir usuário',
      `Tem certeza que quer excluir ${user.fullName || user.email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteAdminUsuario(user.id, actorId)
              .then(() => loadUsuarios())
              .catch((err) => showApiError(err, 'Não foi possível excluir o usuário.'));
          },
        },
      ]
    );
  };

  const handleToggleAtivo = (user: AdminUsuarioItem) => {
    toggleAdminUsuarioAtivo(user.id, !user.isActive, actorId)
      .then(() => loadUsuarios())
      .catch((err) => showApiError(err, 'Não foi possível alterar o status do usuário.'));
  };

  const handleRedefinirSenha = (password: string) => {
    if (!resetSenhaUser) return;
    resetAdminUsuarioSenha(resetSenhaUser.id, password, actorId)
      .then(() => {
        setResetSenhaUser(null);
        Alert.alert('Senha redefinida', 'A nova senha já está valendo.');
      })
      .catch((err) => showApiError(err, 'Não foi possível redefinir a senha.'));
  };

  const handleFormSubmit = (values: AdminUserFormValues) => {
    const cargoId = cargosReais.find((cargo) => cargo.name === values.cargo)?.id ?? null;
    const unidadeId = unidadesReais.find((unidade) => unidade.nome === values.unidade)?.id ?? null;

    setIsSavingForm(true);
    const request =
      formMode === 'create'
        ? createAdminUsuario(
            {
              email: values.email.trim(),
              full_name: values.fullName.trim(),
              password: values.password,
              is_master: values.isMaster,
              empresa_id: unidadeId,
              role_id: cargoId,
              chat_atendente: values.chatAtendente,
            },
            actorId
          )
        : updateAdminUsuario(
            editingUser!.id,
            {
              full_name: values.fullName.trim(),
              empresa_id: unidadeId,
              role_id: cargoId,
              chat_atendente: values.chatAtendente,
              is_master: values.isMaster,
            },
            actorId
          );

    request
      .then(() => {
        setIsFormModalOpen(false);
        loadUsuarios();
      })
      .catch((err) => showApiError(err, formMode === 'create' ? 'Não foi possível criar o usuário.' : 'Não foi possível salvar o usuário.'))
      .finally(() => setIsSavingForm(false));
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
        <AdminPageHeader
          icon="users"
          title="Usuários"
          subtitle={isLoading ? 'Carregando...' : `${ativosCount} ativos`}
        />

        <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar por nome, e-mail ou unidade..." />

        <View style={styles.directorNotifHeaderRow}>
          <Pressable
            style={adminStyles.filterPill}
            onPress={() => Alert.alert('Filtro', 'Filtros avançados em breve.')}
          >
            <Text style={adminStyles.filterPillText}>Ativos</Text>
            <Feather name="chevron-down" size={14} color="#5E667D" />
          </Pressable>
          <Pressable style={styles.directorNotifNewButton} onPress={openCreate}>
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.directorNotifNewButtonText}>Novo</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <AdminEmptyState message="Carregando usuários..." />
        ) : errorMessage ? (
          <AdminEmptyState message={errorMessage} />
        ) : filtered.length === 0 ? (
          <AdminEmptyState message="Nenhum usuário encontrado." />
        ) : (
          filtered.map((user) => (
            <Pressable key={user.id} style={adminStyles.listCard} onPress={() => openDetail(user)}>
              <View style={[adminStyles.listAvatar, { backgroundColor: theme.primaryBg }]}>
                <Text style={[adminStyles.listAvatarText, { color: theme.primary }]}>
                  {getInitialsFromName(user.fullName ?? user.email)}
                </Text>
              </View>
              <View style={adminStyles.listInfo}>
                <View style={adminStyles.listNameRow}>
                  <View style={[adminStyles.statusDot, { backgroundColor: user.isActive ? GREEN : RED }]} />
                  <Text style={[adminStyles.listName, adminStyles.listNameText]} numberOfLines={1}>
                    {user.fullName || '(sem nome)'}
                  </Text>
                </View>
                <Text style={adminStyles.listEmail} numberOfLines={1}>
                  {user.email}
                </Text>
                <Text style={adminStyles.listMeta} numberOfLines={1}>
                  {user.cargo || 'Sem cargo'} · {user.unidade || '—'}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setActionsMenuUser(user)}>
                <Feather name="more-vertical" size={18} color="#9AA1B5" />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>

      <AdminUserDetailModal
        visible={isDetailModalOpen}
        user={selectedUser}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={() => selectedUser && openEdit(selectedUser)}
      />

      <AdminActionsMenuModal
        visible={actionsMenuUser !== null}
        user={actionsMenuUser}
        onClose={() => setActionsMenuUser(null)}
        onVisualizar={() => actionsMenuUser && openDetail(actionsMenuUser)}
        onEditar={() => actionsMenuUser && openEdit(actionsMenuUser)}
        onRedefinirSenha={() => {
          const user = actionsMenuUser;
          setActionsMenuUser(null);
          if (user) setResetSenhaUser(user);
        }}
        onToggleAtivo={() => {
          const user = actionsMenuUser;
          setActionsMenuUser(null);
          if (user) handleToggleAtivo(user);
        }}
        onExcluir={() => actionsMenuUser && handleExcluir(actionsMenuUser)}
      />

      <AdminUserFormModal
        visible={isFormModalOpen}
        mode={formMode}
        initialValues={formInitialValues}
        cargoOptions={cargoOptions}
        unidadeOptions={unidadeOptions}
        isSaving={isSavingForm}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <AdminResetSenhaModal
        visible={resetSenhaUser !== null}
        userLabel={resetSenhaUser?.fullName || resetSenhaUser?.email || ''}
        onClose={() => setResetSenhaUser(null)}
        onConfirm={handleRedefinirSenha}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// 4. Perfil de Acesso (Cargos / Acesso por Usuário)
// ============================================================================
// Dados reais via GET /api/admin/cargos (aba "Cargos") e
// GET /api/admin/acesso-por-usuario (aba "Acesso por Usuário"), ambos em cima
// de roles/profiles/user_modules — ver af360-api/src/routes/admin.js.

// group_type cru (capitalizado) que já vimos aparecer no schema/mockup — se o
// Lovable devolver um group_type que não bate com nenhuma chave aqui, o
// AdminColorPill cai no fallback cinza (GRAY_BG/GRAY) em vez de quebrar.
// Corporativo usava NAVY/NAVY_BG, mas essa dupla é tão dessaturada que fica
// visualmente idêntica à tag cinza neutra dos módulos — trocado por
// BLUE/BLUE_BG (mais vivo e fácil de distinguir à primeira vista).
const adminGroupColorMap: Record<string, { bg: string; color: string }> = {
  Administrativo: { bg: PURPLE_BG, color: PURPLE },
  Corporativo: { bg: BLUE_BG, color: BLUE },
  Diretoria: { bg: RED_BG, color: RED },
  Gestão: { bg: GOLD_BG, color: GOLD },
  Operacional: { bg: GREEN_BG, color: GREEN },
};

// Lista canônica dos 9 módulos reconhecidos pelo backend (mesmos labels de
// MODULE_LABELS em af360-api/src/routes/admin.js) — usada pra montar a tela
// "Acesso de X" com um toggle por módulo, na ordem em que aparecem no web.
const adminCanonicalModules: string[] = [
  'Administrador',
  'RH',
  'R&S',
  'Colaborador',
  'Financeiro',
  'Gestão',
  'Administrativo',
  'Diretoria',
  'Marketing & Fidelidade',
];

// Slug real (tabela modules/roles.default_modules) por trás de cada label
// canônico acima — espelha MODULE_LABELS em af360-api/src/routes/admin.js,
// só que invertido (label -> slug em vez de slug -> label).
const adminModuleSlugByLabel: Record<string, string> = {
  Administrador: 'administrador',
  RH: 'rh',
  'R&S': 'recrutamento',
  Colaborador: 'colaborador',
  Financeiro: 'financeiro',
  Gestão: 'gestao',
  Administrativo: 'administrativo',
  Diretoria: 'diretoria',
  'Marketing & Fidelidade': 'marketing',
};

// Resolve as funcionalidades reais (module_features) de um módulo, a partir
// do label canônico exibido no app — usado tanto na grade de permissões de
// Cargo (role_permissions) quanto na de Acesso por Usuário (user_permissions).
function getFeaturesForModuleLabel(
  moduleLabel: string,
  modules: AdminModuleItem[],
  moduleFeatures: AdminModuleFeatureItem[]
): AdminModuleFeatureItem[] {
  const slug = adminModuleSlugByLabel[moduleLabel];
  const mod = modules.find((m) => m.slug === slug);
  if (!mod) return [];
  return moduleFeatures.filter((f) => f.module_id === mod.id && f.is_active !== false);
}

const ADMIN_DIACRITICS_REGEX = new RegExp('[̀-ͯ]', 'g');

function slugifyAdminName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(ADMIN_DIACRITICS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Traduz erros crus do backend/Lovable pra mensagens que a pessoa realmente
// entende, em vez de mostrar o texto técnico direto (ex: "forbidden: master
// required" ou "Lovable API respondeu 404"). Reaproveitado por qualquer tela
// do Administrador que chama uma API de escrita.
function describeAdminApiError(err: unknown, fallback: string): { title: string; message: string } {
  const raw = err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback;
  const normalized = raw.toLowerCase();

  if (normalized.includes('forbidden') && normalized.includes('master')) {
    return {
      title: 'Precisa de conta master',
      message:
        'Essa ação só pode ser feita por uma conta marcada como "master". A conta que está logada agora não tem esse selo — entre com uma conta master, ou peça pra alguém habilitar o selo master pra essa conta.',
    };
  }

  if (normalized.includes('404')) {
    return {
      title: 'Ainda não disponível no servidor',
      message:
        'O servidor não reconheceu essa ação agora (erro 404) — provavelmente a atualização mais recente ainda não foi publicada. Tente de novo em alguns minutos; se continuar, avise quem cuida do backend.',
    };
  }

  return { title: 'Não foi possível concluir', message: raw };
}

function showAdminApiError(err: unknown, fallback: string) {
  const { title, message } = describeAdminApiError(err, fallback);
  Alert.alert(title, message);
}

// ---------- Menu de ações genérico (reaproveitado por Cargos e Acesso por
// Usuário — cada tela passa sua própria lista de ações) ----------

type AdminMenuAction = {
  key: string;
  icon: FeatherIconName;
  label: string;
  danger?: boolean;
  onPress: () => void;
};

function AdminGenericActionsMenu({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  actions: AdminMenuAction[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.requestModalBackdrop} onPress={onClose}>
        <Pressable style={adminStyles.actionsMenuCard} onPress={() => {}}>
          <Text style={adminStyles.actionsMenuTitle} numberOfLines={1}>
            {title}
          </Text>
          {actions.map((action, index) => (
            <Pressable
              key={action.key}
              style={[
                adminStyles.actionsMenuRow,
                index === actions.length - 1 ? adminStyles.actionsMenuRowLast : null,
              ]}
              onPress={action.onPress}
            >
              <Feather name={action.icon} size={16} color={action.danger ? RED : '#4C5470'} />
              <Text style={[adminStyles.actionsMenuRowText, action.danger ? { color: RED } : null]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------- Modal "Visualizar cargo" (aba Cargos) ----------

function AdminCargoDetailModal({
  visible,
  cargo,
  onClose,
  onEdit,
}: {
  visible: boolean;
  cargo: AdminCargoItem | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!cargo) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle}>{cargo.name}</Text>
              <Text style={adminStyles.detailSubEmail}>Cargo • {(cargo.group || 'não informado').toLowerCase()}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={adminStyles.detailGridRow}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>NOME</Text>
                <Text style={adminStyles.detailFieldValue}>{cargo.name}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>SLUG</Text>
                <Text style={adminStyles.detailFieldValue}>{cargo.slug}</Text>
              </View>
            </View>

            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>GRUPO</Text>
                <Text style={adminStyles.detailFieldValue}>{(cargo.group || '—').toLowerCase()}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>ATIVO</Text>
                <View
                  style={[adminStyles.detailBadgeBase, { backgroundColor: cargo.isActive ? GREEN_BG : RED_BG }]}
                >
                  <Feather
                    name={cargo.isActive ? 'check-circle' : 'x-circle'}
                    size={11}
                    color={cargo.isActive ? GREEN : RED}
                  />
                  <Text style={[adminStyles.detailBadgeText, { color: cargo.isActive ? GREEN : RED }]}>
                    {cargo.isActive ? 'Sim' : 'Não'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>MÓDULOS PADRÃO</Text>
            <View style={[adminStyles.roleModulesRow, { marginTop: 6 }]}>
              {cargo.moduleLabels.length === 0 ? (
                <Text style={adminStyles.listMeta}>Sem módulos vinculados.</Text>
              ) : (
                cargo.moduleLabels.map((module) => <AdminTagPill key={module} label={module} />)
              )}
            </View>
          </ScrollView>

          <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
            <Pressable style={[styles.secondaryButton, adminStyles.secondaryButtonCompact]} onPress={onEdit}>
              <Feather name="edit-2" size={13} color="#2E468F" />
              <Text style={styles.secondaryButtonText}>Editar</Text>
            </Pressable>
            <Pressable style={adminStyles.ghostButton} onPress={onClose}>
              <Text style={adminStyles.ghostButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Modal "Acesso de X" (aba Acesso por Usuário) ----------
// Header com avatar + nome + cargo (igual ao web), depois "Acesso de
// {primeiro nome}" e a lista dos 9 módulos canônicos — ligado/desligado vem
// de dado real (role.default_modules ∪ user_modules, já calculado no
// af360-api como usuario.moduleLabels), e o toggle grava de verdade via
// addAdminUsuarioModulo/removeAdminUsuarioModulo (user_modules). Módulos com
// module_features cadastradas expandem em "FUNCIONALIDADES (X/Y)" com um
// toggle por função — essa grade é per-user (user_permissions, sempre começa
// vazia até ser salva pelo menos uma vez, sem herdar do cargo — combinado
// confirmado pelo Lovable) e "Salvar Alterações" grava via
// putAdminUsuarioPermissoes. "Resetar para padrão do cargo" chama
// resetAdminUsuarioModulos (remove módulos extras e limpa user_permissions).
function AdminAcessoUsuarioModal({
  visible,
  usuario,
  modules,
  moduleFeatures,
  actorId,
  onClose,
  onChanged,
}: {
  visible: boolean;
  usuario: AdminAcessoUsuarioItem | null;
  modules: AdminModuleItem[];
  moduleFeatures: AdminModuleFeatureItem[];
  actorId?: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { theme } = useContext(AdminThemeContext);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [functionState, setFunctionState] = useState<Record<string, boolean>>({});
  const [moduleOnState, setModuleOnState] = useState<Record<string, boolean>>({});
  const [isSavingPerms, setIsSavingPerms] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (visible && usuario) {
      setExpandedModule(null);
      setFunctionState({});
      const initialModuleState: Record<string, boolean> = {};
      adminCanonicalModules.forEach((label) => {
        initialModuleState[label] = usuario.moduleLabels.includes(label);
      });
      setModuleOnState(initialModuleState);
    }
  }, [visible, usuario?.id]);

  if (!usuario) return null;

  const showApiError = showAdminApiError;

  const firstName = (usuario.fullName || usuario.email).split(' ')[0];

  const handleToggleModule = (moduleLabel: string) => {
    const slug = adminModuleSlugByLabel[moduleLabel];
    const mod = modules.find((m) => m.slug === slug);
    const turningOn = !moduleOnState[moduleLabel];

    setModuleOnState((current) => ({ ...current, [moduleLabel]: turningOn }));
    // Já abre a grade de funcionalidades na hora (sem precisar clicar em
    // FUNCIONALIDADES de novo) quando o módulo tem funcionalidades cadastradas.
    if (turningOn && getFeaturesForModuleLabel(moduleLabel, modules, moduleFeatures).length > 0) {
      setExpandedModule(moduleLabel);
    }

    const request = turningOn
      ? addAdminUsuarioModulo(usuario.id, mod ? { moduleId: mod.id } : { moduleSlug: slug }, actorId)
      : mod
      ? removeAdminUsuarioModulo(usuario.id, mod.id, actorId)
      : Promise.resolve();

    request
      .then(() => onChanged())
      .catch((err) => {
        setModuleOnState((current) => ({ ...current, [moduleLabel]: !turningOn }));
        showApiError(err, 'Não foi possível alterar o acesso ao módulo.');
      });
  };

  const handleSalvarPermissoes = () => {
    const payload: AdminFeaturePermission[] = [];
    adminCanonicalModules.forEach((moduleLabel) => {
      if (!moduleOnState[moduleLabel]) return;
      getFeaturesForModuleLabel(moduleLabel, modules, moduleFeatures).forEach((feature) => {
        const can_read = Boolean(functionState[`${feature.id}:LER`]);
        const can_write = Boolean(functionState[`${feature.id}:ESCR.`]);
        const can_edit = Boolean(functionState[`${feature.id}:EDIT.`]);
        const can_delete = Boolean(functionState[`${feature.id}:EXCL.`]);
        if (can_read || can_write || can_edit || can_delete) {
          payload.push({ feature_id: feature.id, can_read, can_write, can_edit, can_delete });
        }
      });
    });

    setIsSavingPerms(true);
    putAdminUsuarioPermissoes(usuario.id, payload, actorId)
      .then(() => {
        Alert.alert('Salvo', 'Permissões atualizadas.');
        onChanged();
      })
      .catch((err) => showApiError(err, 'Não foi possível salvar as permissões.'))
      .finally(() => setIsSavingPerms(false));
  };

  const handleResetar = () => {
    Alert.alert('Resetar para padrão do cargo', 'Isso remove os módulos extras e as permissões avulsas deste usuário. Confirmar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Resetar',
        style: 'destructive',
        onPress: () => {
          setIsResetting(true);
          resetAdminUsuarioModulos(usuario.id, actorId)
            .then(() => {
              onChanged();
              onClose();
            })
            .catch((err) => showApiError(err, 'Não foi possível resetar para o padrão do cargo.'))
            .finally(() => setIsResetting(false));
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={adminStyles.acessoCloseRow}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <View style={adminStyles.acessoUserHeaderRow}>
            <View style={[adminStyles.listAvatar, { backgroundColor: theme.primaryBg }]}>
              <Text style={[adminStyles.listAvatarText, { color: theme.primary }]}>
                {getInitialsFromName(usuario.fullName ?? usuario.email)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={adminStyles.listName} numberOfLines={1}>
                {usuario.fullName || usuario.email}
              </Text>
              <Text style={adminStyles.listMeta} numberOfLines={1}>
                {usuario.cargo || 'Sem cargo'}
              </Text>
            </View>
          </View>

          <View style={adminStyles.acessoDivider} />
          <Text style={adminStyles.cargoFormSectionTitle}>Acesso de {firstName}</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.spacingTop}>
            {adminCanonicalModules.map((moduleLabel) => {
              const isOn = Boolean(moduleOnState[moduleLabel]);
              const features = getFeaturesForModuleLabel(moduleLabel, modules, moduleFeatures);
              const isExpanded = expandedModule === moduleLabel;
              const onCount = features.filter(
                (feature) =>
                  functionState[`${feature.id}:LER`] ||
                  functionState[`${feature.id}:ESCR.`] ||
                  functionState[`${feature.id}:EDIT.`] ||
                  functionState[`${feature.id}:EXCL.`]
              ).length;

              return (
                <View key={moduleLabel}>
                  <View style={adminStyles.checkboxCard}>
                    <Text style={adminStyles.checkboxCardLabel}>{moduleLabel}</Text>
                    <ToggleSwitch value={isOn} onValueChange={() => handleToggleModule(moduleLabel)} />
                  </View>

                  {isOn && features.length > 0 ? (
                    <Pressable
                      style={adminStyles.funcHeaderRow}
                      onPress={() => setExpandedModule(isExpanded ? null : moduleLabel)}
                    >
                      <Text style={adminStyles.funcHeaderLabel}>
                        FUNCIONALIDADES ({onCount}/{features.length})
                      </Text>
                      <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9AA1B5" />
                    </Pressable>
                  ) : null}

                  {isOn && features.length === 0 ? (
                    <View style={adminStyles.cargoPermTableWrap}>
                      <Text style={adminStyles.cargoPermNote}>
                        Permissões granulares ainda não mapeadas para este módulo.
                      </Text>
                    </View>
                  ) : null}

                  {isOn && features.length > 0 && isExpanded ? (
                    <View style={adminStyles.cargoPermTableWrap}>
                      <View style={adminStyles.cargoPermHeaderRow}>
                        <View style={adminStyles.cargoPermFunctionCell}>
                          <Text style={adminStyles.cargoPermHeaderLabel}>FUNÇÃO</Text>
                        </View>
                        {adminPermColumns.map((col) => (
                          <View key={col} style={adminStyles.cargoPermCheckboxCell}>
                            <Text style={adminStyles.cargoPermHeaderLabel}>{col}</Text>
                          </View>
                        ))}
                      </View>
                      {features.map((feature) => (
                        <View key={feature.id} style={adminStyles.cargoPermRow}>
                          <View style={adminStyles.cargoPermFunctionCell}>
                            <Text style={adminStyles.cargoPermFunctionText}>{feature.name}</Text>
                          </View>
                          {adminPermColumns.map((col) => {
                            const key = `${feature.id}:${col}`;
                            return (
                              <AdminPermCheckbox
                                key={col}
                                active={Boolean(functionState[key])}
                                onPress={() =>
                                  setFunctionState((current) => ({ ...current, [key]: !current[key] }))
                                }
                              />
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          <Pressable
            style={[adminStyles.primaryActionButton, adminStyles.stackedButton, styles.spacingTop, isSavingPerms ? { opacity: 0.6 } : null]}
            disabled={isSavingPerms}
            onPress={handleSalvarPermissoes}
          >
            <Feather name="save" size={14} color="#FFFFFF" />
            <Text style={adminStyles.primaryActionButtonText}>{isSavingPerms ? 'Salvando...' : 'Salvar Alterações'}</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, adminStyles.stackedButton, adminStyles.stackedButtonSecondary, isResetting ? { opacity: 0.6 } : null]}
            disabled={isResetting}
            onPress={handleResetar}
          >
            <Feather name="rotate-ccw" size={13} color="#4C5470" />
            <Text style={styles.secondaryButtonText}>{isResetting ? 'Resetando...' : 'Resetar para padrão do cargo'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Permissões granulares por função (Cargos > Editar, Acesso por
// Usuário) ----------
// As funcionalidades por módulo vêm de verdade da tabela module_features
// (fetchAdminModuleFeatures) — ver getFeaturesForModuleLabel. Se um
// módulo/menu ainda não tem linha cadastrada em module_features do lado do
// Lovable, a grade mostra uma nota honesta em vez de inventar uma lista.
const adminPermColumns = ['LER', 'ESCR.', 'EDIT.', 'EXCL.'];

function AdminPermCheckbox({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable style={adminStyles.cargoPermCheckboxCell} onPress={onPress} hitSlop={6}>
      <View style={[adminStyles.cargoPermCheckbox, active ? adminStyles.cargoPermCheckboxActive : null]}>
        {active ? <Feather name="check" size={11} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}

// Picker de Grupo com bolinha colorida por opção (igual o dropdown do web) —
// sempre overlay absoluto (nunca <Modal> próprio), então pode ser aninhado
// com segurança dentro do modal de Novo Cargo/Editar Cargo.
function AdminGroupPickerModal({
  visible,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  if (!visible) return null;
  const options = Object.keys(adminGroupColorMap);

  return (
    <View style={adminStyles.inlinePickerLayer}>
      <Pressable style={styles.datePickerBackdrop} onPress={onClose}>
        <Pressable style={styles.simpleListCard} onPress={() => {}}>
          <Text style={styles.simpleListTitle}>Grupo</Text>
          <ScrollView style={styles.simpleListScroll} showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const isSelected = option === selectedValue;
              const colors = adminGroupColorMap[option];
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
                    <View style={[adminStyles.groupDot, { backgroundColor: colors.color }]} />
                    <Text style={[styles.templateOptionText, isSelected ? styles.templateOptionTextActive : null]}>
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
    </View>
  );
}

type AdminCargoFormValues = {
  name: string;
  group: string;
  moduleLabels: string[];
};

function emptyAdminCargoForm(): AdminCargoFormValues {
  return { name: '', group: 'Operacional', moduleLabels: [] };
}

// ---------- Modal "Novo Cargo" / "Editar — {cargo}" ----------
// Nome/Grupo/Módulos ligados refletem dado real quando em modo "edit"
// (cargo.moduleLabels vem do banco). A grade de permissões por
// funcionalidade (LER/ESCR./EDIT./EXCL.) usa module_features de verdade
// (fetchAdminModuleFeatures) — se um módulo/menu ainda não tem linha em
// module_features do lado do Lovable, mostra uma nota honesta em vez de
// inventar funcionalidades. Criar/Salvar gravam de verdade via
// createAdminCargo/updateAdminCargo + putAdminCargoPermissoes (ver
// AdminPerfilAcessoScreen).
function AdminCargoFormModal({
  visible,
  mode,
  initialValues,
  modules,
  moduleFeatures,
  isSaving,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  initialValues: AdminCargoFormValues;
  modules: AdminModuleItem[];
  moduleFeatures: AdminModuleFeatureItem[];
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: AdminCargoFormValues, permissions: AdminFeaturePermission[]) => void;
}) {
  const [form, setForm] = useState<AdminCargoFormValues>(initialValues);
  const [isGroupPickerOpen, setIsGroupPickerOpen] = useState(false);
  const [permState, setPermState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (visible) {
      setForm(initialValues);
      setPermState({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValues.name]);

  const toggleModule = (moduleLabel: string) => {
    setForm((current) => ({
      ...current,
      moduleLabels: current.moduleLabels.includes(moduleLabel)
        ? current.moduleLabels.filter((m) => m !== moduleLabel)
        : [...current.moduleLabels, moduleLabel],
    }));
  };

  const togglePerm = (key: string) => {
    setPermState((current) => ({ ...current, [key]: !current[key] }));
  };

  const featuresForModule = (moduleLabel: string): AdminModuleFeatureItem[] =>
    getFeaturesForModuleLabel(moduleLabel, modules, moduleFeatures);

  const buildPermissionsPayload = (): AdminFeaturePermission[] => {
    const payload: AdminFeaturePermission[] = [];
    form.moduleLabels.forEach((moduleLabel) => {
      featuresForModule(moduleLabel).forEach((feature) => {
        const can_read = Boolean(permState[`${feature.id}:LER`]);
        const can_write = Boolean(permState[`${feature.id}:ESCR.`]);
        const can_edit = Boolean(permState[`${feature.id}:EDIT.`]);
        const can_delete = Boolean(permState[`${feature.id}:EXCL.`]);
        if (can_read || can_write || can_edit || can_delete) {
          payload.push({ feature_id: feature.id, can_read, can_write, can_edit, can_delete });
        }
      });
    });
    return payload;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle}>
                {mode === 'create' ? 'Novo Cargo' : `Editar — ${initialValues.name}`}
              </Text>
              <Text style={adminStyles.detailSubEmail}>
                Defina nome, grupo, módulos e permissões padrão aplicados a novos usuários deste cargo.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Nome do cargo</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.name}
                  onChangeText={(text) => setForm((current) => ({ ...current, name: text }))}
                  placeholder="Ex: Gerente de RH"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <AdminSelectField label="Grupo" value={form.group} onPress={() => setIsGroupPickerOpen(true)} />
              </View>
            </View>

            <Text style={[adminStyles.cargoFormSectionTitle, styles.spacingTop]}>Módulos e Permissões</Text>
            <Text style={adminStyles.cargoFormSectionHint}>
              Ative o módulo e defina as permissões granulares por funcionalidade.
            </Text>

            {adminCanonicalModules.map((moduleLabel) => {
              const isOn = form.moduleLabels.includes(moduleLabel);
              const features = featuresForModule(moduleLabel);
              return (
                <View key={moduleLabel}>
                  <View style={adminStyles.cargoModuleToggleRow}>
                    <Text style={adminStyles.cargoModuleToggleLabel}>{moduleLabel}</Text>
                    <ToggleSwitch value={isOn} onValueChange={() => toggleModule(moduleLabel)} />
                  </View>

                  {isOn && features.length > 0 ? (
                    <View style={adminStyles.cargoPermTableWrap}>
                      <View style={adminStyles.cargoPermHeaderRow}>
                        <View style={adminStyles.cargoPermFunctionCell}>
                          <Text style={adminStyles.cargoPermHeaderLabel}>FUNÇÃO</Text>
                        </View>
                        {adminPermColumns.map((col) => (
                          <View key={col} style={adminStyles.cargoPermCheckboxCell}>
                            <Text style={adminStyles.cargoPermHeaderLabel}>{col}</Text>
                          </View>
                        ))}
                      </View>
                      {features.map((feature) => (
                        <View key={feature.id} style={adminStyles.cargoPermRow}>
                          <View style={adminStyles.cargoPermFunctionCell}>
                            <Text style={adminStyles.cargoPermFunctionText}>{feature.name}</Text>
                          </View>
                          {adminPermColumns.map((col) => {
                            const key = `${feature.id}:${col}`;
                            return (
                              <AdminPermCheckbox key={col} active={Boolean(permState[key])} onPress={() => togglePerm(key)} />
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  ) : isOn ? (
                    <View style={adminStyles.cargoPermTableWrap}>
                      <Text style={adminStyles.cargoPermNote}>
                        Permissões granulares ainda não mapeadas para este módulo.
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
              <Pressable style={adminStyles.ghostButton} onPress={onClose}>
                <Text style={adminStyles.ghostButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[adminStyles.primaryActionButton, isSaving ? { opacity: 0.6 } : null]}
                disabled={isSaving}
                onPress={() => onSubmit(form, buildPermissionsPayload())}
              >
                <Text style={adminStyles.primaryActionButtonText}>
                  {isSaving ? 'Salvando...' : mode === 'create' ? 'Criar Cargo' : 'Salvar Alterações'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <AdminGroupPickerModal
            visible={isGroupPickerOpen}
            selectedValue={form.group}
            onSelect={(value) => setForm((current) => ({ ...current, group: value }))}
            onClose={() => setIsGroupPickerOpen(false)}
          />
        </View>
      </View>
    </Modal>
  );
}

const ADMIN_ACESSO_PAGE_SIZE = 10;

export function AdminPerfilAcessoScreen({ navigation }: ScreenProps<'AdminPerfilAcesso'>) {
  const { identity } = useContext(AuthIdentityContext);
  const { theme } = useContext(AdminThemeContext);
  const actorId = identity?.profileId;

  const [activeTab, setActiveTab] = useState<'cargos' | 'usuarios'>('cargos');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [cargos, setCargos] = useState<AdminCargoItem[]>([]);
  const [isLoadingCargos, setIsLoadingCargos] = useState(true);
  const [cargosErrorMessage, setCargosErrorMessage] = useState<string | null>(null);
  const [cargoActionsFor, setCargoActionsFor] = useState<AdminCargoItem | null>(null);
  const [cargoDetail, setCargoDetail] = useState<AdminCargoItem | null>(null);
  const [isCargoFormOpen, setIsCargoFormOpen] = useState(false);
  const [cargoFormMode, setCargoFormMode] = useState<'create' | 'edit'>('create');
  const [cargoFormInitial, setCargoFormInitial] = useState<AdminCargoFormValues>(emptyAdminCargoForm());
  const [cargoBeingEdited, setCargoBeingEdited] = useState<AdminCargoItem | null>(null);
  const [isSavingCargo, setIsSavingCargo] = useState(false);

  const [modulos, setModulos] = useState<AdminModuleItem[]>([]);
  const [moduleFeatures, setModuleFeatures] = useState<AdminModuleFeatureItem[]>([]);

  const [usuariosAcesso, setUsuariosAcesso] = useState<AdminAcessoUsuarioItem[]>([]);
  const [isLoadingUsuarios, setIsLoadingUsuarios] = useState(true);
  const [usuariosErrorMessage, setUsuariosErrorMessage] = useState<string | null>(null);
  const [acessoActionsFor, setAcessoActionsFor] = useState<AdminAcessoUsuarioItem | null>(null);
  const [acessoDetail, setAcessoDetail] = useState<AdminAcessoUsuarioItem | null>(null);

  const loadCargos = () => {
    setIsLoadingCargos(true);
    setCargosErrorMessage(null);
    return fetchAdminCargos()
      .then((data) => {
        setCargos(data.cargos);
      })
      .catch((err) => {
        setCargosErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os cargos.');
      })
      .finally(() => {
        setIsLoadingCargos(false);
      });
  };

  useEffect(() => {
    let isActive = true;
    setIsLoadingCargos(true);
    setCargosErrorMessage(null);

    fetchAdminCargos()
      .then((data) => {
        if (isActive) setCargos(data.cargos);
      })
      .catch((err) => {
        if (isActive) {
          setCargosErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os cargos.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingCargos(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    Promise.all([fetchAdminModulos(), fetchAdminModuleFeatures()])
      .then(([modulosData, featuresData]) => {
        if (!isActive) return;
        setModulos(modulosData);
        setModuleFeatures(featuresData);
      })
      .catch(() => {
        // Silencioso: sem módulos/features reais, a grade de permissões cai
        // na nota honesta "ainda não mapeadas", sem travar a tela.
      });
    return () => {
      isActive = false;
    };
  }, []);

  const loadUsuariosAcesso = () => {
    setIsLoadingUsuarios(true);
    setUsuariosErrorMessage(null);
    return fetchAdminAcessoPorUsuario()
      .then((data) => {
        setUsuariosAcesso(data.usuarios);
      })
      .catch((err) => {
        setUsuariosErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar o acesso por usuário.');
      })
      .finally(() => {
        setIsLoadingUsuarios(false);
      });
  };

  useEffect(() => {
    let isActive = true;
    setIsLoadingUsuarios(true);
    setUsuariosErrorMessage(null);

    fetchAdminAcessoPorUsuario()
      .then((data) => {
        if (isActive) setUsuariosAcesso(data.usuarios);
      })
      .catch((err) => {
        if (isActive) {
          setUsuariosErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar o acesso por usuário.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingUsuarios(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return usuariosAcesso;
    return usuariosAcesso.filter(
      (item) =>
        (item.fullName ?? '').toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        (item.cargo ?? '').toLowerCase().includes(query)
    );
  }, [usuariosAcesso, search]);

  useEffect(() => {
    setPage(0);
  }, [search, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ADMIN_ACESSO_PAGE_SIZE));
  const pageStart = page * ADMIN_ACESSO_PAGE_SIZE;
  const pagedUsers = filteredUsers.slice(pageStart, pageStart + ADMIN_ACESSO_PAGE_SIZE);
  const pageRangeLabel =
    filteredUsers.length === 0
      ? '0 de 0'
      : `${pageStart + 1}-${Math.min(pageStart + ADMIN_ACESSO_PAGE_SIZE, filteredUsers.length)} de ${filteredUsers.length}`;

  const showApiError = showAdminApiError;

  const handleCargoSubmit = (values: AdminCargoFormValues, permissions: AdminFeaturePermission[]) => {
    const defaultModules = values.moduleLabels.map((label) => adminModuleSlugByLabel[label]).filter(Boolean);

    setIsSavingCargo(true);
    const request =
      cargoFormMode === 'create'
        ? createAdminCargo(
            {
              name: values.name.trim(),
              slug: slugifyAdminName(values.name),
              group_type: values.group,
              default_modules: defaultModules,
              is_active: true,
            },
            actorId
          )
        : updateAdminCargo(
            cargoBeingEdited!.id,
            {
              name: values.name.trim(),
              group_type: values.group,
              default_modules: defaultModules,
            },
            actorId
          );

    request
      .then((cargo: any) => {
        const cargoId = cargoFormMode === 'create' ? cargo?.id : cargoBeingEdited!.id;
        if (cargoId && permissions.length > 0) {
          return putAdminCargoPermissoes(cargoId, permissions, actorId);
        }
        return undefined;
      })
      .then(() => {
        setIsCargoFormOpen(false);
        loadCargos();
      })
      .catch((err) =>
        showApiError(err, cargoFormMode === 'create' ? 'Não foi possível criar o cargo.' : 'Não foi possível salvar o cargo.')
      )
      .finally(() => setIsSavingCargo(false));
  };

  const handleExcluirCargo = (cargo: AdminCargoItem) => {
    Alert.alert('Excluir cargo', `Tem certeza que quer excluir "${cargo.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAdminCargo(cargo.id, actorId)
            .then(() => loadCargos())
            .catch((err) => showApiError(err, 'Não foi possível excluir o cargo.'));
        },
      },
    ]);
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
              <Text style={styles.directorNotifCountLabel}>
                {isLoadingCargos ? 'Carregando...' : `${cargos.length} cargos`}
              </Text>
              <Pressable
                style={styles.directorNotifNewButton}
                onPress={() => {
                  setCargoFormMode('create');
                  setCargoBeingEdited(null);
                  setCargoFormInitial(emptyAdminCargoForm());
                  setIsCargoFormOpen(true);
                }}
              >
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={styles.directorNotifNewButtonText}>Novo cargo</Text>
              </Pressable>
            </View>

            {isLoadingCargos ? (
              <AdminEmptyState message="Carregando cargos..." />
            ) : cargosErrorMessage ? (
              <AdminEmptyState message={cargosErrorMessage} />
            ) : cargos.length === 0 ? (
              <AdminEmptyState message="Nenhum cargo encontrado." />
            ) : (
              cargos.map((cargo) => {
                const groupColors = (cargo.group && adminGroupColorMap[cargo.group]) || { bg: GRAY_BG, color: GRAY };
                return (
                  <Pressable key={cargo.id} style={adminStyles.roleCard} onPress={() => setCargoDetail(cargo)}>
                    <View style={adminStyles.roleCardTopRow}>
                      <Text style={adminStyles.roleName}>{cargo.name}</Text>
                      <View style={adminStyles.roleCardTopRowRight}>
                        <AdminColorPill
                          label={cargo.group || 'Não informado'}
                          bg={groupColors.bg}
                          color={groupColors.color}
                        />
                        <Pressable hitSlop={10} onPress={() => setCargoActionsFor(cargo)}>
                          <Feather name="more-vertical" size={18} color="#9AA1B5" />
                        </Pressable>
                      </View>
                    </View>
                    <View style={adminStyles.roleModulesRow}>
                      {cargo.moduleLabels.length === 0 ? (
                        <Text style={adminStyles.listMeta}>Sem módulos vinculados.</Text>
                      ) : (
                        cargo.moduleLabels.map((module) => <AdminTagPill key={module} label={module} />)
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
          </>
        ) : (
          <>
            <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar por nome, e-mail ou cargo..." />

            {isLoadingUsuarios ? (
              <AdminEmptyState message="Carregando usuários..." />
            ) : usuariosErrorMessage ? (
              <AdminEmptyState message={usuariosErrorMessage} />
            ) : filteredUsers.length === 0 ? (
              <AdminEmptyState message="Nenhum usuário encontrado." />
            ) : (
              <>
                {pagedUsers.map((item) => (
                  <Pressable key={item.id} style={adminStyles.listCard} onPress={() => setAcessoDetail(item)}>
                    <View style={[adminStyles.listAvatar, { backgroundColor: theme.primaryBg }]}>
                      <Text style={[adminStyles.listAvatarText, { color: theme.primary }]}>
                        {getInitialsFromName(item.fullName ?? item.email)}
                      </Text>
                    </View>
                    <View style={adminStyles.listInfo}>
                      <Text style={adminStyles.listName} numberOfLines={1}>
                        {item.fullName || '(sem nome)'}
                      </Text>
                      <Text style={adminStyles.listEmail} numberOfLines={1}>
                        {item.email}
                      </Text>
                      <Text style={adminStyles.listMeta} numberOfLines={1}>
                        {item.cargo || 'Sem cargo'} · {item.moduleCount} módulo{item.moduleCount === 1 ? '' : 's'}{' '}
                        ativo{item.moduleCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Pressable hitSlop={10} onPress={() => setAcessoActionsFor(item)}>
                      <Feather name="more-vertical" size={18} color="#9AA1B5" />
                    </Pressable>
                  </Pressable>
                ))}

                <View style={adminStyles.paginationRow}>
                  <Text style={adminStyles.paginationLabel}>{pageRangeLabel}</Text>
                  <View style={adminStyles.paginationArrows}>
                    <Pressable
                      style={[adminStyles.paginationArrowButton, page === 0 ? adminStyles.paginationArrowDisabled : null]}
                      disabled={page === 0}
                      onPress={() => setPage((current) => Math.max(0, current - 1))}
                    >
                      <Feather name="chevron-left" size={16} color={page === 0 ? '#C7CCDA' : '#4C5470'} />
                    </Pressable>
                    <Pressable
                      style={[
                        adminStyles.paginationArrowButton,
                        page >= totalPages - 1 ? adminStyles.paginationArrowDisabled : null,
                      ]}
                      disabled={page >= totalPages - 1}
                      onPress={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                    >
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={page >= totalPages - 1 ? '#C7CCDA' : '#4C5470'}
                      />
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <AdminGenericActionsMenu
        visible={cargoActionsFor !== null}
        title={cargoActionsFor?.name ?? ''}
        onClose={() => setCargoActionsFor(null)}
        actions={[
          {
            key: 'visualizar',
            icon: 'eye',
            label: 'Visualizar',
            onPress: () => {
              setCargoDetail(cargoActionsFor);
              setCargoActionsFor(null);
            },
          },
          {
            key: 'editar',
            icon: 'edit-2',
            label: 'Editar',
            onPress: () => {
              const cargo = cargoActionsFor;
              setCargoActionsFor(null);
              if (!cargo) return;
              setCargoFormMode('edit');
              setCargoBeingEdited(cargo);
              setCargoFormInitial({ name: cargo.name, group: cargo.group || 'Operacional', moduleLabels: cargo.moduleLabels });
              setIsCargoFormOpen(true);
            },
          },
          {
            key: 'excluir',
            icon: 'trash-2',
            label: 'Excluir',
            danger: true,
            onPress: () => {
              const cargo = cargoActionsFor;
              setCargoActionsFor(null);
              if (!cargo) return;
              handleExcluirCargo(cargo);
            },
          },
        ]}
      />
      <AdminCargoDetailModal
        visible={cargoDetail !== null}
        cargo={cargoDetail}
        onClose={() => setCargoDetail(null)}
        onEdit={() => {
          const cargo = cargoDetail;
          if (!cargo) return;
          setCargoDetail(null);
          setCargoFormMode('edit');
          setCargoBeingEdited(cargo);
          setCargoFormInitial({
            name: cargo.name,
            group: cargo.group || 'Operacional',
            moduleLabels: cargo.moduleLabels,
          });
          setIsCargoFormOpen(true);
        }}
      />
      <AdminCargoFormModal
        visible={isCargoFormOpen}
        mode={cargoFormMode}
        initialValues={cargoFormInitial}
        modules={modulos}
        moduleFeatures={moduleFeatures}
        isSaving={isSavingCargo}
        onClose={() => setIsCargoFormOpen(false)}
        onSubmit={handleCargoSubmit}
      />

      <AdminGenericActionsMenu
        visible={acessoActionsFor !== null}
        title={acessoActionsFor?.fullName ?? acessoActionsFor?.email ?? ''}
        onClose={() => setAcessoActionsFor(null)}
        actions={[
          {
            key: 'visualizar',
            icon: 'eye',
            label: 'Visualizar',
            onPress: () => {
              setAcessoDetail(acessoActionsFor);
              setAcessoActionsFor(null);
            },
          },
          {
            key: 'editar',
            icon: 'edit-2',
            label: 'Editar',
            onPress: () => {
              setAcessoDetail(acessoActionsFor);
              setAcessoActionsFor(null);
            },
          },
        ]}
      />
      <AdminAcessoUsuarioModal
        visible={acessoDetail !== null}
        usuario={acessoDetail}
        modules={modulos}
        moduleFeatures={moduleFeatures}
        actorId={actorId}
        onClose={() => setAcessoDetail(null)}
        onChanged={loadUsuariosAcesso}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// 5. Grupos
// ============================================================================

// Dados reais via GET/POST/PATCH/DELETE /api/admin/grupos — tabela própria
// public.grupos (id, nome, slug, descricao, cor, is_active), confirmada pelo
// Lovable em 29/07/2026. roles.group_type = grupos.slug (cargosCount já vem
// pronto do endpoint deles). Lista, detalhe e formulário batem de verdade no
// banco, no mesmo padrão de Cargos.

const ADMIN_GROUP_COLOR_SWATCHES = [
  '#7C3AED',
  '#3457D5',
  '#E6213D',
  '#B07A1E',
  '#18955A',
  '#5E667D',
  '#EC4899',
  '#0EA5E9',
];

type AdminGrupoFormValues = {
  name: string;
  description: string;
  color: string;
  isActive: boolean;
};

function emptyAdminGrupoForm(): AdminGrupoFormValues {
  return { name: '', description: '', color: ADMIN_GROUP_COLOR_SWATCHES[0], isActive: true };
}

// ---------- Modal "Visualizar grupo" ----------

function AdminGrupoDetailModal({
  visible,
  grupo,
  onClose,
  onEdit,
}: {
  visible: boolean;
  grupo: AdminGrupoItem | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!grupo) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle}>{grupo.name}</Text>
              <Text style={adminStyles.detailSubEmail}>Grupo • {grupo.slug}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={adminStyles.detailGridRow}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>NOME</Text>
                <Text style={adminStyles.detailFieldValue}>{grupo.name}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>SLUG</Text>
                <Text style={adminStyles.detailFieldValue}>{grupo.slug}</Text>
              </View>
            </View>

            <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>DESCRIÇÃO</Text>
            <Text style={adminStyles.detailFieldValue}>{grupo.description || '—'}</Text>

            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>COR</Text>
                <View style={adminStyles.groupLeft}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: grupo.color }} />
                  <Text style={adminStyles.detailFieldValue}>{grupo.color}</Text>
                </View>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>CARGOS VINCULADOS</Text>
                <Text style={adminStyles.detailFieldValue}>{grupo.cargosCount}</Text>
              </View>
            </View>

            <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>ATIVO</Text>
            <View
              style={[
                adminStyles.detailBadgeBase,
                { backgroundColor: grupo.isActive ? GREEN_BG : RED_BG, marginTop: 4 },
              ]}
            >
              <Feather
                name={grupo.isActive ? 'check-circle' : 'x-circle'}
                size={11}
                color={grupo.isActive ? GREEN : RED}
              />
              <Text style={[adminStyles.detailBadgeText, { color: grupo.isActive ? GREEN : RED }]}>
                {grupo.isActive ? 'Sim' : 'Não'}
              </Text>
            </View>
          </ScrollView>

          <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
            <Pressable style={[styles.secondaryButton, adminStyles.secondaryButtonCompact]} onPress={onEdit}>
              <Feather name="edit-2" size={13} color="#2E468F" />
              <Text style={styles.secondaryButtonText}>Editar</Text>
            </Pressable>
            <Pressable style={adminStyles.ghostButton} onPress={onClose}>
              <Text style={adminStyles.ghostButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Modal "Novo Grupo" / "Editar — {grupo}" ----------

function AdminGrupoFormModal({
  visible,
  mode,
  initialValues,
  isSaving,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  initialValues: AdminGrupoFormValues;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: AdminGrupoFormValues) => void;
}) {
  const [form, setForm] = useState<AdminGrupoFormValues>(initialValues);

  useEffect(() => {
    if (visible) setForm(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValues.name]);

  const isValid = form.name.trim().length > 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle}>
                {mode === 'create' ? 'Novo Grupo' : `Editar — ${initialValues.name}`}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Nome *</Text>
            <TextInput
              style={styles.processTextInput}
              value={form.name}
              onChangeText={(text) => setForm((current) => ({ ...current, name: text }))}
              placeholder="Ex: Comercial"
              placeholderTextColor="#A7AEC2"
            />

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Descrição</Text>
            <TextInput
              style={[styles.processTextInput, styles.processDocumentationArea]}
              value={form.description}
              onChangeText={(text) => setForm((current) => ({ ...current, description: text }))}
              placeholder="Opcional"
              placeholderTextColor="#A7AEC2"
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Cor</Text>
            <View style={adminStyles.colorSwatchRow}>
              {ADMIN_GROUP_COLOR_SWATCHES.map((swatch) => (
                <Pressable
                  key={swatch}
                  style={[
                    adminStyles.colorSwatch,
                    { backgroundColor: swatch },
                    form.color === swatch ? adminStyles.colorSwatchActive : null,
                  ]}
                  onPress={() => setForm((current) => ({ ...current, color: swatch }))}
                >
                  {form.color === swatch ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
            <Pressable style={adminStyles.ghostButton} onPress={onClose}>
              <Text style={adminStyles.ghostButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.secondaryButton,
                adminStyles.secondaryButtonCompact,
                !isValid || isSaving ? { opacity: 0.6 } : null,
              ]}
              disabled={!isValid || isSaving}
              onPress={() => onSubmit(form)}
            >
              <Feather name="save" size={13} color="#2E468F" />
              <Text style={styles.secondaryButtonText}>
                {isSaving ? 'Salvando...' : mode === 'create' ? 'Criar Grupo' : 'Salvar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const ADMIN_GRUPOS_PAGE_SIZE = 10;

export function AdminGruposScreen({ navigation }: ScreenProps<'AdminGrupos'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [grupos, setGrupos] = useState<AdminGrupoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [groupActionsFor, setGroupActionsFor] = useState<AdminGrupoItem | null>(null);
  const [groupDetail, setGroupDetail] = useState<AdminGrupoItem | null>(null);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [groupFormMode, setGroupFormMode] = useState<'create' | 'edit'>('create');
  const [groupFormInitial, setGroupFormInitial] = useState<AdminGrupoFormValues>(emptyAdminGrupoForm());
  const [groupBeingEdited, setGroupBeingEdited] = useState<AdminGrupoItem | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const showApiError = showAdminApiError;

  const loadGrupos = () => {
    setIsLoading(true);
    setErrorMessage(null);
    return fetchAdminGrupos()
      .then((data) => setGrupos(data.grupos))
      .catch((err) => setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os grupos.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchAdminGrupos()
      .then((data) => {
        if (isActive) setGrupos(data.grupos);
      })
      .catch((err) => {
        if (isActive) {
          setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os grupos.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return grupos;
    return grupos.filter(
      (item) => item.name.toLowerCase().includes(query) || (item.description ?? '').toLowerCase().includes(query)
    );
  }, [grupos, search]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_GRUPOS_PAGE_SIZE));
  const pageStart = page * ADMIN_GRUPOS_PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + ADMIN_GRUPOS_PAGE_SIZE);
  const pageRangeLabel =
    filtered.length === 0
      ? '0 de 0'
      : `${pageStart + 1}-${Math.min(pageStart + ADMIN_GRUPOS_PAGE_SIZE, filtered.length)} de ${filtered.length}`;

  const handleGroupSubmit = (values: AdminGrupoFormValues) => {
    setIsSavingGroup(true);
    const request =
      groupFormMode === 'create'
        ? createAdminGrupo(
            {
              nome: values.name.trim(),
              descricao: values.description.trim() || null,
              cor: values.color,
              is_active: values.isActive,
            },
            actorId
          )
        : updateAdminGrupo(
            groupBeingEdited!.id,
            {
              nome: values.name.trim(),
              descricao: values.description.trim() || null,
              cor: values.color,
              is_active: values.isActive,
            },
            actorId
          );

    request
      .then(() => {
        setIsGroupFormOpen(false);
        loadGrupos();
      })
      .catch((err) =>
        showApiError(
          err,
          groupFormMode === 'create' ? 'Não foi possível criar o grupo.' : 'Não foi possível salvar o grupo.'
        )
      )
      .finally(() => setIsSavingGroup(false));
  };

  const handleExcluirGrupo = (grupo: AdminGrupoItem) => {
    Alert.alert('Excluir grupo', `Tem certeza que quer excluir "${grupo.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAdminGrupo(grupo.id, actorId)
            .then(() => loadGrupos())
            .catch((err) => {
              if (err instanceof ApiError && err.status === 409) {
                Alert.alert(
                  'Não é possível excluir',
                  `O grupo "${grupo.name}" ainda tem cargos vinculados. Mova ou remova esses cargos antes de excluir.`
                );
                return;
              }
              showApiError(err, 'Não foi possível excluir o grupo.');
            });
        },
      },
    ]);
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
        <AdminPageHeader icon="user" title="Grupos" subtitle={isLoading ? 'Carregando...' : `${grupos.length} grupos`} />

        <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar por nome ou descrição..." />

        <View style={[styles.directorNotifHeaderRow, { justifyContent: 'flex-end' }]}>
          <Pressable
            style={styles.directorNotifNewButton}
            onPress={() => {
              setGroupFormMode('create');
              setGroupBeingEdited(null);
              setGroupFormInitial(emptyAdminGrupoForm());
              setIsGroupFormOpen(true);
            }}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.directorNotifNewButtonText}>Novo</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <AdminEmptyState message="Carregando grupos..." />
        ) : errorMessage ? (
          <AdminEmptyState message={errorMessage} />
        ) : filtered.length === 0 ? (
          <AdminEmptyState message="Nenhum grupo encontrado." />
        ) : (
          <>
            {paged.map((grupo) => (
              <Pressable key={grupo.id} style={adminStyles.groupRow} onPress={() => setGroupDetail(grupo)}>
                <View style={adminStyles.groupLeft}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: grupo.color }} />
                  <View style={{ flex: 1 }}>
                    <Text style={adminStyles.roleName}>{grupo.name}</Text>
                    <Text style={adminStyles.groupDescription} numberOfLines={1}>
                      {grupo.description || 'Sem descrição.'}
                    </Text>
                  </View>
                </View>
                <View style={adminStyles.roleCardTopRowRight}>
                  <Text style={adminStyles.groupCount}>
                    {grupo.cargosCount} cargo{grupo.cargosCount === 1 ? '' : 's'}
                  </Text>
                  <Pressable hitSlop={10} onPress={() => setGroupActionsFor(grupo)}>
                    <Feather name="more-vertical" size={18} color="#9AA1B5" />
                  </Pressable>
                </View>
              </Pressable>
            ))}

            <View style={adminStyles.paginationRow}>
              <Text style={adminStyles.paginationLabel}>{pageRangeLabel}</Text>
              <View style={adminStyles.paginationArrows}>
                <Pressable
                  style={[adminStyles.paginationArrowButton, page === 0 ? adminStyles.paginationArrowDisabled : null]}
                  disabled={page === 0}
                  onPress={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <Feather name="chevron-left" size={16} color={page === 0 ? '#C7CCDA' : '#4C5470'} />
                </Pressable>
                <Pressable
                  style={[
                    adminStyles.paginationArrowButton,
                    page >= totalPages - 1 ? adminStyles.paginationArrowDisabled : null,
                  ]}
                  disabled={page >= totalPages - 1}
                  onPress={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                >
                  <Feather name="chevron-right" size={16} color={page >= totalPages - 1 ? '#C7CCDA' : '#4C5470'} />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <AdminGenericActionsMenu
        visible={groupActionsFor !== null}
        title={groupActionsFor?.name ?? ''}
        onClose={() => setGroupActionsFor(null)}
        actions={[
          {
            key: 'visualizar',
            icon: 'eye',
            label: 'Visualizar',
            onPress: () => {
              setGroupDetail(groupActionsFor);
              setGroupActionsFor(null);
            },
          },
          {
            key: 'editar',
            icon: 'edit-2',
            label: 'Editar',
            onPress: () => {
              const grupo = groupActionsFor;
              setGroupActionsFor(null);
              if (!grupo) return;
              setGroupFormMode('edit');
              setGroupBeingEdited(grupo);
              setGroupFormInitial({
                name: grupo.name,
                description: grupo.description ?? '',
                color: grupo.color,
                isActive: grupo.isActive,
              });
              setIsGroupFormOpen(true);
            },
          },
          {
            key: 'excluir',
            icon: 'trash-2',
            label: 'Excluir',
            danger: true,
            onPress: () => {
              const grupo = groupActionsFor;
              setGroupActionsFor(null);
              if (!grupo) return;
              handleExcluirGrupo(grupo);
            },
          },
        ]}
      />

      <AdminGrupoDetailModal
        visible={groupDetail !== null}
        grupo={groupDetail}
        onClose={() => setGroupDetail(null)}
        onEdit={() => {
          const grupo = groupDetail;
          if (!grupo) return;
          setGroupDetail(null);
          setGroupFormMode('edit');
          setGroupBeingEdited(grupo);
          setGroupFormInitial({
            name: grupo.name,
            description: grupo.description ?? '',
            color: grupo.color,
            isActive: grupo.isActive,
          });
          setIsGroupFormOpen(true);
        }}
      />

      <AdminGrupoFormModal
        visible={isGroupFormOpen}
        mode={groupFormMode}
        initialValues={groupFormInitial}
        isSaving={isSavingGroup}
        onClose={() => setIsGroupFormOpen(false)}
        onSubmit={handleGroupSubmit}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// 6. Unidades
// ============================================================================

// Dados reais via GET/POST/PATCH/DELETE /api/admin/unidades — tabela própria
// public.empresas (schema completo confirmado pelo Lovable em 29/07/2026:
// cnpj, bandeira, tipo, cidade/estado, is_active, idq, nome_fantasia/apelido/
// razao_social, endereço, vendida/data_venda/comprador/venda_observacao).
// "Vender unidade" usa a ação única POST /api/admin/unidades/:id/vender.

const adminBandeiraColorMap: Record<string, { bg: string; color: string }> = {
  Vibra: { bg: PURPLE_BG, color: PURPLE },
  'American Fuel': { bg: RED_BG, color: RED },
  Ipiranga: { bg: GOLD_BG, color: GOLD },
  Shell: { bg: GOLD_BG, color: GOLD },
};

const ADMIN_UNIDADE_BANDEIRAS: AdminUnidadeBandeira[] = ['American Fuel', 'Ipiranga', 'Shell', 'Vibra'];
const ADMIN_UNIDADE_TIPOS: AdminUnidadeTipo[] = ['Matriz', 'Posto', 'Loja', 'Escritório'];

function adminTodayBrLabel(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${now.getFullYear()}`;
}

function adminBrDateToIso(label: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(label.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

// Inverso de adminBrDateToIso — "aaaa-mm-dd" (ou com horário/timestamp junto)
// -> "dd/mm/aaaa" via regex direto, sem passar por Date (evita fuso horário).
function adminIsoDateToBrLabel(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec((iso ?? '').trim());
  if (!match) return '';
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function adminUnidadeDisplayName(unidade: AdminUnidadeItem): string {
  return unidade.nomeFantasia || unidade.razaoSocial || '(sem nome)';
}

function adminParseDateBR(label: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(label?.trim() ?? '');
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

// Calendário 100% JS/RN puro, mesmo padrão do RHDatePickerModal (RH.tsx) —
// reaproveita a lógica/estilos do MiniCalendarModal em App.tsx
// (getCalendarWeeks/calendarMonthNames/styles.datePickerCard e afins).
// Sempre inline (overlay absoluto dentro do modal pai), nunca <Modal> próprio
// — evita o bug de modal-em-modal já visto e corrigido em RH.tsx.
function AdminDatePickerModal({
  visible,
  title,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  value: string;
  onSelect: (dateLabel: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const selectedDate = adminParseDateBR(value);
  const [viewYear, setViewYear] = useState((selectedDate ?? today).getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState((selectedDate ?? today).getMonth());

  useEffect(() => {
    if (visible) {
      const base = adminParseDateBR(value) ?? new Date();
      setViewYear(base.getFullYear());
      setViewMonthIndex(base.getMonth());
    }
  }, [visible, value]);

  if (!visible) return null;

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

  return (
    <View style={adminStyles.inlinePickerLayer}>
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
                      <View style={[styles.calendarDayCircle, isSelected ? styles.calendarDayCircleSelected : null]}>
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
    </View>
  );
}

// ---------- Modal "Visualizar unidade" ----------

// Título de seção com linha divisória fina acima — mesmo padrão visual do
// web (Identificação / Códigos & Bandeira / Localização / Contato / Datas /
// Serviços do Posto).
function AdminDetailSectionTitle({ label, first }: { label: string; first?: boolean }) {
  return (
    <View style={[adminStyles.detailSectionTitleRow, first ? { borderTopWidth: 0, marginTop: 0 } : null]}>
      <Text style={adminStyles.detailSectionTitleText}>{label}</Text>
    </View>
  );
}

function AdminDetailBoolBadge({ value }: { value: boolean }) {
  return (
    <View style={[adminStyles.detailBadgeBase, { backgroundColor: value ? GREEN_BG : RED_BG }]}>
      <Feather name={value ? 'check-circle' : 'x-circle'} size={11} color={value ? GREEN : RED} />
      <Text style={[adminStyles.detailBadgeText, { color: value ? GREEN : RED }]}>{value ? 'Sim' : 'Não'}</Text>
    </View>
  );
}

function AdminUnidadeDetailModal({
  visible,
  unidade,
  contabilidades,
  onClose,
  onEdit,
}: {
  visible: boolean;
  unidade: AdminUnidadeItem | null;
  contabilidades: AdminContabilidadeItem[];
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!unidade) return null;
  const bandeiraColors = (unidade.bandeira && adminBandeiraColorMap[unidade.bandeira]) || { bg: GRAY_BG, color: GRAY };
  const contabilidade = unidade.contabilidadeId ? contabilidades.find((c) => c.id === unidade.contabilidadeId) : null;
  const servicos = unidade.servicos ?? {};

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle}>{adminUnidadeDisplayName(unidade)}</Text>
              <Text style={adminStyles.detailSubEmail}>{unidade.razaoSocial || adminUnidadeDisplayName(unidade)}</Text>
              <View style={[adminStyles.roleModulesRow, { marginTop: 6, alignItems: 'center' }]}>
                {unidade.bandeira ? (
                  <AdminColorPill label={unidade.bandeira} bg={bandeiraColors.bg} color={bandeiraColors.color} />
                ) : null}
                <AdminTagPill label={unidade.tipo || 'Posto'} />
                <AdminDetailBoolBadge value={unidade.isActive} />
              </View>
              <Text style={[adminStyles.detailSubEmail, styles.spacingTop]}>
                CNPJ: {unidade.cnpj || 'não informado'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <AdminDetailSectionTitle label="Identificação" first />
            <Text style={adminStyles.detailFieldLabel}>RAZÃO SOCIAL</Text>
            <Text style={adminStyles.detailFieldValue}>{unidade.razaoSocial || '—'}</Text>

            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>NOME FANTASIA</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.nomeFantasia || '—'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>APELIDO</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.apelido || '—'}</Text>
              </View>
            </View>

            <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>CNPJ</Text>
            <Text style={adminStyles.detailFieldValue}>{unidade.cnpj || '—'}</Text>

            <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>PROPRIETÁRIO</Text>
            <Text style={adminStyles.detailFieldValue}>{unidade.proprietario || '—'}</Text>

            <AdminDetailSectionTitle label="Códigos & Bandeira" />
            <View style={adminStyles.detailGridRow}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>BANDEIRA</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.bandeira || '—'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>TIPO</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.tipo || '—'}</Text>
              </View>
            </View>
            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>IDQ</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.idq || '—'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>CD REDE</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.cdRede || '—'}</Text>
              </View>
            </View>
            <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>IPIRANGA HABILITADO</Text>
            <AdminDetailBoolBadge value={unidade.ipirangaHabilitado} />

            <AdminDetailSectionTitle label="Localização" />
            <Text style={adminStyles.detailFieldLabel}>ENDEREÇO</Text>
            <Text style={adminStyles.detailFieldValue}>{unidade.enderecoTexto || '—'}</Text>
            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>BAIRRO</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.bairro || '—'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>CEP</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.cep || '—'}</Text>
              </View>
            </View>
            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>CIDADE</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.cidade || '—'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>UF</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.estado || '—'}</Text>
              </View>
            </View>

            <AdminDetailSectionTitle label="Contato" />
            <View style={adminStyles.detailGridRow}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>E-MAIL</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.email || '—'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>TELEFONE</Text>
                <Text style={adminStyles.detailFieldValue}>{unidade.telefone || '—'}</Text>
              </View>
            </View>
            <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>CONTABILIDADE</Text>
            <Text style={adminStyles.detailFieldValue}>
              {contabilidade ? adminContabilidadeDisplayName(contabilidade) : '—'}
            </Text>

            <AdminDetailSectionTitle label="Datas" />
            <View style={adminStyles.detailGridRow}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>DATA DE CADASTRO</Text>
                <Text style={adminStyles.detailFieldValue}>{adminIsoDateToBrLabel(unidade.dataCadastro) || '—'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>PRIMEIRA VENDA</Text>
                <Text style={adminStyles.detailFieldValue}>
                  {adminIsoDateToBrLabel(unidade.dataPrimeiraVenda) || '—'}
                </Text>
              </View>
            </View>

            <AdminDetailSectionTitle label="Serviços do Posto" />
            <View style={adminStyles.detailGridRow}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>HORÁRIO</Text>
                <Text style={adminStyles.detailFieldValue}>{servicos.horario_funcionamento || '—'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>CONVENIÊNCIA</Text>
                <AdminDetailBoolBadge value={Boolean(servicos.conveniencia)} />
              </View>
            </View>
            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>TROCA DE ÓLEO</Text>
                <AdminDetailBoolBadge value={Boolean(servicos.troca_oleo)} />
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>GELADEIRA</Text>
                <AdminDetailBoolBadge value={Boolean(servicos.geladeira)} />
              </View>
            </View>
            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>LAVA-JATO</Text>
                <AdminDetailBoolBadge value={Boolean(servicos.lava_jato)} />
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>ESTACIONAMENTO</Text>
                <AdminDetailBoolBadge value={Boolean(servicos.estacionamento)} />
              </View>
            </View>
            {servicos.geladeira && servicos.geladeira_tipo ? (
              <>
                <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>TIPO DA GELADEIRA</Text>
                <Text style={adminStyles.detailFieldValue}>
                  {servicos.geladeira_tipo === 'pista' ? 'Pista' : 'Gelo'}
                </Text>
              </>
            ) : null}

            <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>COLABORADORES ATIVOS</Text>
            <Text style={adminStyles.detailFieldValue}>{unidade.colaboradoresAtivos}</Text>

            {unidade.vendida ? (
              <>
                <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>VENDA</Text>
                <Text style={adminStyles.detailFieldValue}>
                  {adminIsoDateToBrLabel(unidade.dataVenda) || formatAdminDate(unidade.dataVenda)}
                  {unidade.comprador ? ` • ${unidade.comprador}` : ''}
                </Text>
                {unidade.vendaObservacao ? (
                  <Text style={adminStyles.groupDescription}>{unidade.vendaObservacao}</Text>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
            <Pressable style={[styles.secondaryButton, adminStyles.secondaryButtonCompact]} onPress={onEdit}>
              <Feather name="edit-2" size={13} color="#2E468F" />
              <Text style={styles.secondaryButtonText}>Editar</Text>
            </Pressable>
            <Pressable style={adminStyles.ghostButton} onPress={onClose}>
              <Text style={adminStyles.ghostButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Modal "Contabilidades" (lista + form no mesmo modal, alterna
// view interna com "← Voltar" em vez de empilhar um <Modal> dentro do outro —
// mesmo padrão de <Modal> único trocando de conteúdo já usado nesse arquivo,
// evita o bug de modal-em-modal). Tabela própria public.contabilidades,
// confirmada pelo Lovable em 29/07/2026 (empresas.contabilidade_id). ----------

type AdminContabilidadeFormValues = {
  razaoSocial: string;
  nomeFantasia: string;
  apelido: string;
  cnpj: string;
  responsavel: string;
  email: string;
  telefone: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  observacoes: string;
  isActive: boolean;
};

function emptyAdminContabilidadeForm(): AdminContabilidadeFormValues {
  return {
    razaoSocial: '',
    nomeFantasia: '',
    apelido: '',
    cnpj: '',
    responsavel: '',
    email: '',
    telefone: '',
    rua: '',
    numero: '',
    bairro: '',
    cep: '',
    cidade: '',
    estado: '',
    observacoes: '',
    isActive: true,
  };
}

function adminContabilidadeDisplayName(item: AdminContabilidadeItem): string {
  return item.nomeFantasia || item.razaoSocial || '(sem nome)';
}

function AdminContabilidadesModal({
  visible,
  actorId,
  onClose,
  onChanged,
}: {
  visible: boolean;
  actorId?: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [search, setSearch] = useState('');
  const [contabilidades, setContabilidades] = useState<AdminContabilidadeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<AdminContabilidadeFormValues>(emptyAdminContabilidadeForm());
  const [beingEdited, setBeingEdited] = useState<AdminContabilidadeItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    setErrorMessage(null);
    return fetchAdminContabilidades()
      .then((data) => setContabilidades(data.contabilidades))
      .catch((err) =>
        setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar as contabilidades.')
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (visible) {
      setView('list');
      setSearch('');
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contabilidades;
    return contabilidades.filter(
      (item) =>
        adminContabilidadeDisplayName(item).toLowerCase().includes(query) ||
        (item.cnpj ?? '').toLowerCase().includes(query) ||
        (item.responsavel ?? '').toLowerCase().includes(query)
    );
  }, [contabilidades, search]);

  const handleSubmit = () => {
    if (!form.razaoSocial.trim()) {
      Alert.alert('Campo obrigatório', 'Informe a razão social.');
      return;
    }
    const body = {
      razao_social: form.razaoSocial.trim(),
      nome_fantasia: form.nomeFantasia.trim() || null,
      apelido: form.apelido.trim() || null,
      cnpj: form.cnpj.trim() || null,
      responsavel: form.responsavel.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      rua: form.rua.trim() || null,
      numero: form.numero.trim() || null,
      bairro: form.bairro.trim() || null,
      cep: form.cep.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.trim() || null,
      observacoes: form.observacoes.trim() || null,
      is_active: form.isActive,
    };

    setIsSaving(true);
    const request =
      formMode === 'create' ? createAdminContabilidade(body, actorId) : updateAdminContabilidade(beingEdited!.id, body, actorId);

    request
      .then(() => {
        setView('list');
        load();
        onChanged();
      })
      .catch((err) =>
        showAdminApiError(
          err,
          formMode === 'create' ? 'Não foi possível criar a contabilidade.' : 'Não foi possível salvar a contabilidade.'
        )
      )
      .finally(() => setIsSaving(false));
  };

  const handleExcluir = (item: AdminContabilidadeItem) => {
    Alert.alert('Excluir contabilidade', `Tem certeza que quer excluir "${adminContabilidadeDisplayName(item)}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAdminContabilidade(item.id, actorId)
            .then(() => {
              load();
              onChanged();
            })
            .catch((err) => {
              if (err instanceof ApiError && err.status === 409) {
                Alert.alert(
                  'Não é possível excluir',
                  'Essa contabilidade ainda está vinculada a alguma unidade. Desvincule antes de excluir.'
                );
                return;
              }
              showAdminApiError(err, 'Não foi possível excluir a contabilidade.');
            });
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          {view === 'list' ? (
            <>
              <View style={styles.requestModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestModalTitle}>Contabilidades</Text>
                  <Text style={adminStyles.detailSubEmail}>Cadastre os escritórios contábeis que atendem as unidades da rede.</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Feather name="x" size={20} color="#677089" />
                </Pressable>
              </View>

              <View style={[styles.directorNotifHeaderRow, { justifyContent: 'flex-end' }]}>
                <Pressable
                  style={styles.directorNotifNewButton}
                  onPress={() => {
                    setFormMode('create');
                    setBeingEdited(null);
                    setForm(emptyAdminContabilidadeForm());
                    setView('form');
                  }}
                >
                  <Feather name="plus" size={15} color="#FFFFFF" />
                  <Text style={styles.directorNotifNewButtonText}>Nova Contabilidade</Text>
                </Pressable>
              </View>

              <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar por nome, CNPJ, responsável..." />

              <ScrollView showsVerticalScrollIndicator={false}>
                {isLoading ? (
                  <AdminEmptyState message="Carregando contabilidades..." />
                ) : errorMessage ? (
                  <AdminEmptyState message={errorMessage} />
                ) : filtered.length === 0 ? (
                  <AdminEmptyState message="Nenhuma contabilidade cadastrada." />
                ) : (
                  filtered.map((item) => (
                    <View key={item.id} style={adminStyles.contabRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={adminStyles.listName} numberOfLines={1}>
                          {adminContabilidadeDisplayName(item)}
                        </Text>
                        <Text style={adminStyles.listMeta} numberOfLines={1}>
                          {item.cnpj || 'CNPJ não informado'}
                          {item.responsavel ? ` • ${item.responsavel}` : ''}
                          {item.cidade ? ` • ${item.cidade}${item.estado ? `/${item.estado}` : ''}` : ''}
                        </Text>
                      </View>
                      <View
                        style={[
                          adminStyles.detailBadgeBase,
                          { backgroundColor: item.isActive ? GREEN_BG : RED_BG, marginRight: 6 },
                        ]}
                      >
                        <Text style={[adminStyles.detailBadgeText, { color: item.isActive ? GREEN : RED }]}>
                          {item.isActive ? 'Ativa' : 'Inativa'}
                        </Text>
                      </View>
                      <Pressable
                        hitSlop={8}
                        style={{ padding: 4 }}
                        onPress={() => {
                          setFormMode('edit');
                          setBeingEdited(item);
                          setForm({
                            razaoSocial: item.razaoSocial ?? '',
                            nomeFantasia: item.nomeFantasia ?? '',
                            apelido: item.apelido ?? '',
                            cnpj: item.cnpj ?? '',
                            responsavel: item.responsavel ?? '',
                            email: item.email ?? '',
                            telefone: item.telefone ?? '',
                            rua: item.rua ?? '',
                            numero: item.numero ?? '',
                            bairro: item.bairro ?? '',
                            cep: item.cep ?? '',
                            cidade: item.cidade ?? '',
                            estado: item.estado ?? '',
                            observacoes: item.observacoes ?? '',
                            isActive: item.isActive,
                          });
                          setView('form');
                        }}
                      >
                        <Feather name="edit-2" size={16} color="#4C5470" />
                      </Pressable>
                      <Pressable hitSlop={8} style={{ padding: 4 }} onPress={() => handleExcluir(item)}>
                        <Feather name="trash-2" size={16} color={RED} />
                      </Pressable>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
                <Pressable style={adminStyles.ghostButton} onPress={onClose}>
                  <Text style={adminStyles.ghostButtonText}>Fechar</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.requestModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestModalTitle}>
                    {formMode === 'create' ? 'Nova Contabilidade' : `Editar — ${beingEdited ? adminContabilidadeDisplayName(beingEdited) : ''}`}
                  </Text>
                  <Text style={adminStyles.detailSubEmail}>Preencha os dados do escritório contábil.</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Feather name="x" size={20} color="#677089" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Razão Social *</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.razaoSocial}
                  onChangeText={(text) => setForm((current) => ({ ...current, razaoSocial: text }))}
                  placeholder="Razão social"
                  placeholderTextColor="#A7AEC2"
                />

                <View style={adminStyles.formRow}>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Nome Fantasia</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.nomeFantasia}
                      onChangeText={(text) => setForm((current) => ({ ...current, nomeFantasia: text }))}
                      placeholder="Opcional"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Apelido</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.apelido}
                      onChangeText={(text) => setForm((current) => ({ ...current, apelido: text }))}
                      placeholder="Ex: Contab. Silva"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                </View>

                <View style={adminStyles.formRow}>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>CNPJ</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.cnpj}
                      onChangeText={(text) => setForm((current) => ({ ...current, cnpj: text }))}
                      placeholder="00.000.000/0001-00"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]} numberOfLines={1}>
                      Responsável
                    </Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.responsavel}
                      onChangeText={(text) => setForm((current) => ({ ...current, responsavel: text }))}
                      placeholder="Contador"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                </View>

                <View style={adminStyles.formRow}>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>E-mail</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.email}
                      onChangeText={(text) => setForm((current) => ({ ...current, email: text }))}
                      placeholder="Opcional"
                      placeholderTextColor="#A7AEC2"
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Telefone</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.telefone}
                      onChangeText={(text) => setForm((current) => ({ ...current, telefone: text }))}
                      placeholder="Opcional"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                </View>

                <View style={adminStyles.formRow}>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Rua</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.rua}
                      onChangeText={(text) => setForm((current) => ({ ...current, rua: text }))}
                      placeholder="Opcional"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Número</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.numero}
                      onChangeText={(text) => setForm((current) => ({ ...current, numero: text }))}
                      placeholder="Opcional"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                </View>

                <View style={adminStyles.formRow}>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Bairro</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.bairro}
                      onChangeText={(text) => setForm((current) => ({ ...current, bairro: text }))}
                      placeholder="Opcional"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>CEP</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.cep}
                      onChangeText={(text) => setForm((current) => ({ ...current, cep: text }))}
                      placeholder="Opcional"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                </View>

                <View style={adminStyles.formRow}>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Cidade</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.cidade}
                      onChangeText={(text) => setForm((current) => ({ ...current, cidade: text }))}
                      placeholder="Opcional"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>UF</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.estado}
                      onChangeText={(text) => setForm((current) => ({ ...current, estado: text.toUpperCase().slice(0, 2) }))}
                      placeholder="RJ"
                      placeholderTextColor="#A7AEC2"
                      autoCapitalize="characters"
                      maxLength={2}
                    />
                  </View>
                </View>

                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Observações</Text>
                <TextInput
                  style={[styles.processTextInput, { minHeight: 64 }]}
                  value={form.observacoes}
                  onChangeText={(text) => setForm((current) => ({ ...current, observacoes: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                  multiline
                  textAlignVertical="top"
                />

                <View style={[adminStyles.cargoModuleToggleRow, styles.spacingTop]}>
                  <Text style={adminStyles.cargoModuleToggleLabel}>Ativa</Text>
                  <ToggleSwitch
                    value={form.isActive}
                    onValueChange={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
                  />
                </View>
              </ScrollView>

              <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
                <Pressable
                  style={[adminStyles.ghostButton, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                  onPress={() => setView('list')}
                >
                  <Feather name="arrow-left" size={13} color="#5E667D" />
                  <Text style={adminStyles.ghostButtonText}>Voltar</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, adminStyles.secondaryButtonCompact, isSaving ? { opacity: 0.6 } : null]}
                  disabled={isSaving}
                  onPress={handleSubmit}
                >
                  <Feather name="save" size={13} color="#2E468F" />
                  <Text style={styles.secondaryButtonText}>{isSaving ? 'Salvando...' : 'Salvar'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------- Modal "Nova Unidade" / "Editar — {unidade}" ----------

type AdminUnidadeFormValues = {
  nomeFantasia: string;
  apelido: string;
  razaoSocial: string;
  cnpj: string;
  bandeira: AdminUnidadeBandeira | '';
  tipo: AdminUnidadeTipo;
  proprietario: string;
  idq: string;
  cdRede: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  enderecoTexto: string;
  ipirangaHabilitado: boolean;
  isActive: boolean;
  email: string;
  telefone: string;
  dataCadastro: string;
  dataPrimeiraVenda: string;
  contabilidadeId: string | null;
  horarioFuncionamento: string;
  conveniencia: boolean;
  trocaOleo: boolean;
  lavaJato: boolean;
  estacionamento: boolean;
  geladeira: boolean;
  geladeiraTipo: 'pista' | 'gelo' | '';
};

function emptyAdminUnidadeForm(): AdminUnidadeFormValues {
  return {
    nomeFantasia: '',
    apelido: '',
    razaoSocial: '',
    cnpj: '',
    bandeira: '',
    tipo: 'Posto',
    proprietario: '',
    idq: '',
    cdRede: '',
    rua: '',
    numero: '',
    bairro: '',
    cep: '',
    cidade: '',
    estado: '',
    enderecoTexto: '',
    ipirangaHabilitado: false,
    isActive: true,
    email: '',
    telefone: '',
    dataCadastro: '',
    dataPrimeiraVenda: '',
    contabilidadeId: null,
    horarioFuncionamento: '',
    conveniencia: false,
    trocaOleo: false,
    lavaJato: false,
    estacionamento: false,
    geladeira: false,
    geladeiraTipo: '',
  };
}

function AdminUnidadeFormModal({
  visible,
  mode,
  initialValues,
  contabilidades,
  isSaving,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  initialValues: AdminUnidadeFormValues;
  contabilidades: AdminContabilidadeItem[];
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: AdminUnidadeFormValues) => void;
}) {
  const [form, setForm] = useState<AdminUnidadeFormValues>(initialValues);
  const [isBandeiraPickerOpen, setIsBandeiraPickerOpen] = useState(false);
  const [isTipoPickerOpen, setIsTipoPickerOpen] = useState(false);
  const [isContabilidadePickerOpen, setIsContabilidadePickerOpen] = useState(false);
  const [isGeladeiraTipoPickerOpen, setIsGeladeiraTipoPickerOpen] = useState(false);
  const [isDataCadastroPickerOpen, setIsDataCadastroPickerOpen] = useState(false);
  const [isDataPrimeiraVendaPickerOpen, setIsDataPrimeiraVendaPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) setForm(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValues.razaoSocial]);

  const isValid = form.razaoSocial.trim().length > 0 && form.cnpj.trim().length > 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle}>
                {mode === 'create' ? 'Nova Unidade' : `Editar — ${initialValues.razaoSocial}`}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Razão social *</Text>
            <TextInput
              style={styles.processTextInput}
              value={form.razaoSocial}
              onChangeText={(text) => setForm((current) => ({ ...current, razaoSocial: text }))}
              placeholder="Ex: Auto Posto Exemplo Ltda"
              placeholderTextColor="#A7AEC2"
            />

            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Nome fantasia</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.nomeFantasia}
                  onChangeText={(text) => setForm((current) => ({ ...current, nomeFantasia: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Apelido</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.apelido}
                  onChangeText={(text) => setForm((current) => ({ ...current, apelido: text }))}
                  placeholder="Curto, p/ identificar"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>CNPJ *</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.cnpj}
                  onChangeText={(text) => setForm((current) => ({ ...current, cnpj: text }))}
                  placeholder="00.000.000/0001-00"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <AdminSelectField label="Tipo" value={form.tipo} onPress={() => setIsTipoPickerOpen(true)} />
              </View>
            </View>

            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <AdminSelectField
                  label="Bandeira"
                  value={form.bandeira}
                  placeholder="Sem bandeira"
                  onPress={() => setIsBandeiraPickerOpen(true)}
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Proprietário</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.proprietario}
                  onChangeText={(text) => setForm((current) => ({ ...current, proprietario: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>IDQ</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.idq}
                  onChangeText={(text) => setForm((current) => ({ ...current, idq: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>CD Rede</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.cdRede}
                  onChangeText={(text) => setForm((current) => ({ ...current, cdRede: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Rua</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.rua}
                  onChangeText={(text) => setForm((current) => ({ ...current, rua: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Número</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.numero}
                  onChangeText={(text) => setForm((current) => ({ ...current, numero: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Bairro</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.bairro}
                  onChangeText={(text) => setForm((current) => ({ ...current, bairro: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>CEP</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.cep}
                  onChangeText={(text) => setForm((current) => ({ ...current, cep: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Cidade</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.cidade}
                  onChangeText={(text) => setForm((current) => ({ ...current, cidade: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>UF</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.estado}
                  onChangeText={(text) => setForm((current) => ({ ...current, estado: text.toUpperCase().slice(0, 2) }))}
                  placeholder="RJ"
                  placeholderTextColor="#A7AEC2"
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>
            </View>

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Endereço (texto livre)</Text>
            <TextInput
              style={styles.processTextInput}
              value={form.enderecoTexto}
              onChangeText={(text) => setForm((current) => ({ ...current, enderecoTexto: text }))}
              placeholder="Opcional"
              placeholderTextColor="#A7AEC2"
            />

            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>E-mail</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.email}
                  onChangeText={(text) => setForm((current) => ({ ...current, email: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Telefone</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.telefone}
                  onChangeText={(text) => setForm((current) => ({ ...current, telefone: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <AdminSelectField
                  label="Data Cadastro"
                  value={form.dataCadastro}
                  placeholder="dd/mm/aaaa"
                  onPress={() => setIsDataCadastroPickerOpen(true)}
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <AdminSelectField
                  label="Primeira Venda"
                  value={form.dataPrimeiraVenda}
                  placeholder="dd/mm/aaaa"
                  onPress={() => setIsDataPrimeiraVendaPickerOpen(true)}
                />
              </View>
            </View>

            <AdminSelectField
              label="Contabilidade"
              value={
                form.contabilidadeId
                  ? adminContabilidadeDisplayName(contabilidades.find((c) => c.id === form.contabilidadeId) ?? ({} as AdminContabilidadeItem))
                  : ''
              }
              placeholder="Sem contabilidade"
              onPress={() => setIsContabilidadePickerOpen(true)}
            />

            <View style={[adminStyles.cargoModuleToggleRow, styles.spacingTop]}>
              <Text style={adminStyles.cargoModuleToggleLabel}>Ipiranga habilitado</Text>
              <ToggleSwitch
                value={form.ipirangaHabilitado}
                onValueChange={() => setForm((current) => ({ ...current, ipirangaHabilitado: !current.ipirangaHabilitado }))}
              />
            </View>

            <View style={adminStyles.cargoModuleToggleRow}>
              <Text style={adminStyles.cargoModuleToggleLabel}>Unidade ativa</Text>
              <ToggleSwitch
                value={form.isActive}
                onValueChange={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
              />
            </View>

            <Text style={[adminStyles.cargoFormSectionTitle, styles.spacingTop]}>Serviços do posto</Text>
            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Horário de funcionamento</Text>
            <TextInput
              style={styles.processTextInput}
              value={form.horarioFuncionamento}
              onChangeText={(text) => setForm((current) => ({ ...current, horarioFuncionamento: text }))}
              placeholder="Ex: 24 Horas, 06h às 22h..."
              placeholderTextColor="#A7AEC2"
            />

            <View style={[adminStyles.cargoModuleToggleRow, styles.spacingTop]}>
              <Text style={adminStyles.cargoModuleToggleLabel}>Conveniência</Text>
              <ToggleSwitch
                value={form.conveniencia}
                onValueChange={() => setForm((current) => ({ ...current, conveniencia: !current.conveniencia }))}
              />
            </View>
            <View style={adminStyles.cargoModuleToggleRow}>
              <Text style={adminStyles.cargoModuleToggleLabel}>Troca de Óleo</Text>
              <ToggleSwitch
                value={form.trocaOleo}
                onValueChange={() => setForm((current) => ({ ...current, trocaOleo: !current.trocaOleo }))}
              />
            </View>
            <View style={adminStyles.cargoModuleToggleRow}>
              <Text style={adminStyles.cargoModuleToggleLabel}>Lava-Jato</Text>
              <ToggleSwitch
                value={form.lavaJato}
                onValueChange={() => setForm((current) => ({ ...current, lavaJato: !current.lavaJato }))}
              />
            </View>
            <View style={adminStyles.cargoModuleToggleRow}>
              <Text style={adminStyles.cargoModuleToggleLabel}>Estacionamento</Text>
              <ToggleSwitch
                value={form.estacionamento}
                onValueChange={() => setForm((current) => ({ ...current, estacionamento: !current.estacionamento }))}
              />
            </View>
            <View style={adminStyles.cargoModuleToggleRow}>
              <Text style={adminStyles.cargoModuleToggleLabel}>Geladeira</Text>
              <ToggleSwitch
                value={form.geladeira}
                onValueChange={() =>
                  setForm((current) => ({
                    ...current,
                    geladeira: !current.geladeira,
                    geladeiraTipo: !current.geladeira ? current.geladeiraTipo : '',
                  }))
                }
              />
            </View>
            {form.geladeira ? (
              <AdminSelectField
                label="Tipo da geladeira"
                value={form.geladeiraTipo === 'pista' ? 'Pista' : form.geladeiraTipo === 'gelo' ? 'Gelo' : ''}
                placeholder="Selecione..."
                onPress={() => setIsGeladeiraTipoPickerOpen(true)}
              />
            ) : null}
          </ScrollView>

          <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
            <Pressable style={adminStyles.ghostButton} onPress={onClose}>
              <Text style={adminStyles.ghostButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.secondaryButton,
                adminStyles.secondaryButtonCompact,
                !isValid || isSaving ? { opacity: 0.6 } : null,
              ]}
              disabled={!isValid || isSaving}
              onPress={() => onSubmit(form)}
            >
              <Feather name="save" size={13} color="#2E468F" />
              <Text style={styles.secondaryButtonText}>
                {isSaving ? 'Salvando...' : mode === 'create' ? 'Criar Unidade' : 'Salvar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <AdminSimplePickerModal
        visible={isBandeiraPickerOpen}
        title="Bandeira"
        options={ADMIN_UNIDADE_BANDEIRAS}
        selectedValue={form.bandeira}
        onSelect={(value) => setForm((current) => ({ ...current, bandeira: value as AdminUnidadeBandeira }))}
        onClose={() => setIsBandeiraPickerOpen(false)}
      />
      <AdminSimplePickerModal
        visible={isTipoPickerOpen}
        title="Tipo"
        options={ADMIN_UNIDADE_TIPOS}
        selectedValue={form.tipo}
        onSelect={(value) => setForm((current) => ({ ...current, tipo: value as AdminUnidadeTipo }))}
        onClose={() => setIsTipoPickerOpen(false)}
      />
      <AdminSimplePickerModal
        visible={isContabilidadePickerOpen}
        title="Contabilidade"
        options={contabilidades.map((c) => adminContabilidadeDisplayName(c))}
        selectedValue={
          form.contabilidadeId
            ? adminContabilidadeDisplayName(contabilidades.find((c) => c.id === form.contabilidadeId) ?? ({} as AdminContabilidadeItem))
            : ''
        }
        onSelect={(label) => {
          const alvo = contabilidades.find((c) => adminContabilidadeDisplayName(c) === label);
          setForm((current) => ({ ...current, contabilidadeId: alvo ? alvo.id : null }));
        }}
        onClose={() => setIsContabilidadePickerOpen(false)}
      />
      <AdminSimplePickerModal
        visible={isGeladeiraTipoPickerOpen}
        title="Tipo da geladeira"
        options={['Pista', 'Gelo']}
        selectedValue={form.geladeiraTipo === 'pista' ? 'Pista' : form.geladeiraTipo === 'gelo' ? 'Gelo' : ''}
        onSelect={(label) =>
          setForm((current) => ({ ...current, geladeiraTipo: label === 'Pista' ? 'pista' : 'gelo' }))
        }
        onClose={() => setIsGeladeiraTipoPickerOpen(false)}
      />
      <AdminDatePickerModal
        visible={isDataCadastroPickerOpen}
        title="Data Cadastro"
        value={form.dataCadastro}
        onSelect={(label) => setForm((current) => ({ ...current, dataCadastro: label }))}
        onClose={() => setIsDataCadastroPickerOpen(false)}
      />
      <AdminDatePickerModal
        visible={isDataPrimeiraVendaPickerOpen}
        title="Primeira Venda"
        value={form.dataPrimeiraVenda}
        onSelect={(label) => setForm((current) => ({ ...current, dataPrimeiraVenda: label }))}
        onClose={() => setIsDataPrimeiraVendaPickerOpen(false)}
      />
    </Modal>
  );
}

// ---------- Modal "Vender unidade" ----------
// Puxa os colaboradores ATIVOS de verdade (fetchRhColaboradores com
// empresaId/status=ativo) e manda tudo numa chamada só pro endpoint
// admin-vender-unidade confirmado pelo Lovable: quem for marcado
// "Transferir?" precisa de uma unidade de destino selecionada; quem não for
// marcado é desligado por venda automaticamente do lado deles.
function AdminVenderUnidadeModal({
  visible,
  unidade,
  unidadesDestino,
  actorId,
  onClose,
  onSold,
}: {
  visible: boolean;
  unidade: AdminUnidadeItem | null;
  unidadesDestino: AdminUnidadeItem[];
  actorId?: string | null;
  onClose: () => void;
  onSold: () => void;
}) {
  const [dataVenda, setDataVenda] = useState(adminTodayBrLabel());
  const [comprador, setComprador] = useState('');
  const [observacao, setObservacao] = useState('');
  const [colaboradores, setColaboradores] = useState<RhColaboradorRaw[]>([]);
  const [isLoadingColabs, setIsLoadingColabs] = useState(false);
  const [colabsError, setColabsError] = useState<string | null>(null);
  const [transferMap, setTransferMap] = useState<Record<string, boolean>>({});
  const [destinoMap, setDestinoMap] = useState<Record<string, string>>({});
  const [destinoPickerFor, setDestinoPickerFor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataVendaPickerOpen, setIsDataVendaPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible || !unidade) return;
    setDataVenda(adminTodayBrLabel());
    setComprador('');
    setObservacao('');
    setTransferMap({});
    setDestinoMap({});
    setIsLoadingColabs(true);
    setColabsError(null);

    fetchRhColaboradores({ status: 'ativo', empresaId: unidade.id })
      .then((data) => setColaboradores(data))
      .catch((err) =>
        setColabsError(err instanceof Error ? err.message : 'Não foi possível carregar os colaboradores da unidade.')
      )
      .finally(() => setIsLoadingColabs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, unidade?.id]);

  if (!unidade) return null;

  const transferCount = Object.values(transferMap).filter(Boolean).length;
  const desligarCount = colaboradores.length - transferCount;

  const handleSubmit = () => {
    const isoData = adminBrDateToIso(dataVenda);
    if (!isoData) {
      Alert.alert('Data inválida', 'Informe a data da venda no formato dd/mm/aaaa.');
      return;
    }
    const transferindo = colaboradores.filter((c) => transferMap[c.id]);
    const semDestino = transferindo.find((c) => !destinoMap[c.id]);
    if (semDestino) {
      Alert.alert('Falta destino', `Selecione a unidade de destino para "${semDestino.nome_completo}".`);
      return;
    }

    setIsSubmitting(true);
    venderAdminUnidade(
      unidade.id,
      {
        data_venda: isoData,
        comprador: comprador.trim() || null,
        observacao: observacao.trim() || null,
        transferencias: transferindo.map((c) => ({ colaborador_id: c.id, empresa_destino_id: destinoMap[c.id] })),
      },
      actorId
    )
      .then((resultado) => {
        onClose();
        onSold();
        const avisoFalhas =
          resultado.falhas && resultado.falhas.length > 0
            ? `\n\nAtenção: ${resultado.falhas.length} bloqueio(s) de e-mail pendente(s) para reprocessar.`
            : '';
        Alert.alert(
          'Unidade vendida',
          `${adminUnidadeDisplayName(unidade)} foi marcada como vendida.\n\nTransferidos: ${resultado.transferidos}\nDesligados: ${resultado.desligados}${avisoFalhas}`
        );
      })
      .catch((err) => showAdminApiError(err, 'Não foi possível concluir a venda da unidade.'))
      .finally(() => setIsSubmitting(false));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle}>Vender unidade</Text>
              <Text style={adminStyles.detailSubEmail} numberOfLines={1}>
                {adminUnidadeDisplayName(unidade)}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={adminStyles.groupDescription}>
              Registre a data da venda e decida, para cada colaborador ativo, se ele será transferido para outra
              unidade ou desligado por venda do estabelecimento (sem rescisão manual).
            </Text>

            <View style={adminStyles.formRow}>
              <View style={adminStyles.formRowItem}>
                <AdminSelectField
                  label="Data da venda"
                  required
                  value={dataVenda}
                  placeholder="dd/mm/aaaa"
                  onPress={() => setIsDataVendaPickerOpen(true)}
                />
              </View>
              <View style={adminStyles.formRowItem}>
                <Text style={[styles.requestFieldLabel, styles.spacingTop]} numberOfLines={1}>
                  Comprador (opcional)
                </Text>
                <TextInput
                  style={styles.processTextInput}
                  value={comprador}
                  onChangeText={setComprador}
                  placeholder="Nome / razão social"
                  placeholderTextColor="#A7AEC2"
                />
              </View>
            </View>

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Observação</Text>
            <TextInput
              style={[styles.processTextInput, { minHeight: 64 }]}
              value={observacao}
              onChangeText={setObservacao}
              placeholder="Opcional"
              placeholderTextColor="#A7AEC2"
              multiline
              textAlignVertical="top"
            />

            <Text style={[adminStyles.cargoFormSectionTitle, styles.spacingTop]}>
              Colaboradores ativos ({colaboradores.length})
            </Text>
            <View style={[adminStyles.roleModulesRow, { marginTop: 6 }]}>
              <AdminColorPill label={`Transferir: ${transferCount}`} bg={BLUE_BG} color={BLUE} />
              <AdminColorPill label={`Desligar: ${desligarCount}`} bg={GOLD_BG} color={GOLD} />
            </View>

            {isLoadingColabs ? (
              <AdminEmptyState message="Carregando colaboradores..." />
            ) : colabsError ? (
              <AdminEmptyState message={colabsError} />
            ) : colaboradores.length === 0 ? (
              <AdminEmptyState message="Nenhum colaborador ativo nessa unidade." />
            ) : (
              colaboradores.map((colaborador) => {
                const isTransferindo = Boolean(transferMap[colaborador.id]);
                const destinoId = destinoMap[colaborador.id];
                const destinoNome = destinoId
                  ? adminUnidadeDisplayName(unidadesDestino.find((u) => u.id === destinoId)!)
                  : '';
                return (
                  <View key={colaborador.id} style={adminStyles.venderColabRow}>
                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        setTransferMap((current) => ({ ...current, [colaborador.id]: !current[colaborador.id] }))
                      }
                    >
                      <View style={[adminStyles.cargoPermCheckbox, isTransferindo ? adminStyles.cargoPermCheckboxActive : null]}>
                        {isTransferindo ? <Feather name="check" size={11} color="#FFFFFF" /> : null}
                      </View>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={adminStyles.listName} numberOfLines={1}>
                        {colaborador.nome_completo || '(sem nome)'}
                      </Text>
                      <Text style={adminStyles.listMeta} numberOfLines={1}>
                        {colaborador.cargo || 'Sem cargo'}
                        {colaborador.matricula ? ` • Mat. ${colaborador.matricula}` : ''}
                      </Text>
                    </View>
                    {isTransferindo ? (
                      <Pressable
                        style={adminStyles.venderDestinoButton}
                        onPress={() => setDestinoPickerFor(colaborador.id)}
                      >
                        <Text style={adminStyles.venderDestinoButtonText} numberOfLines={1}>
                          {destinoNome || 'Selecione a unidade destino...'}
                        </Text>
                        <Feather name="chevron-down" size={14} color="#7A8299" />
                      </Pressable>
                    ) : (
                      <Text style={adminStyles.venderDesligadoLabel}>Desligado por venda</Text>
                    )}
                  </View>
                );
              })
            )}
            <View style={adminStyles.venderWarningBox}>
              <Feather name="alert-triangle" size={14} color={GOLD} />
              <Text style={adminStyles.venderWarningText}>
                Ao confirmar: a unidade é marcada como vendida e inativa; transferências são registradas como
                efetivadas na data da venda; e os demais colaboradores ficam desligados por venda do estabelecimento
                (sem rescisão), com data de demissão igual à data da venda.
              </Text>
            </View>
          </ScrollView>

          <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
            <Pressable style={adminStyles.ghostButton} onPress={onClose}>
              <Text style={adminStyles.ghostButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.secondaryButton,
                adminStyles.secondaryButtonCompact,
                { backgroundColor: RED_BG },
                isSubmitting ? { opacity: 0.6 } : null,
              ]}
              disabled={isSubmitting}
              onPress={handleSubmit}
            >
              <Feather name="dollar-sign" size={13} color={RED} />
              <Text style={[styles.secondaryButtonText, { color: RED }]}>
                {isSubmitting ? 'Processando...' : 'Vender unidade'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <AdminSimplePickerModal
        visible={destinoPickerFor !== null}
        title="Unidade de destino"
        options={unidadesDestino.map((u) => adminUnidadeDisplayName(u))}
        selectedValue={destinoPickerFor ? adminUnidadeDisplayName(unidadesDestino.find((u) => u.id === destinoMap[destinoPickerFor]) ?? ({} as AdminUnidadeItem)) : ''}
        onSelect={(label) => {
          const alvo = unidadesDestino.find((u) => adminUnidadeDisplayName(u) === label);
          if (destinoPickerFor && alvo) {
            setDestinoMap((current) => ({ ...current, [destinoPickerFor]: alvo.id }));
          }
        }}
        onClose={() => setDestinoPickerFor(null)}
      />
      <AdminDatePickerModal
        visible={isDataVendaPickerOpen}
        title="Data da venda"
        value={dataVenda}
        onSelect={setDataVenda}
        onClose={() => setIsDataVendaPickerOpen(false)}
      />
    </Modal>
  );
}

const ADMIN_UNIDADES_PAGE_SIZE = 10;

export function AdminUnidadesScreen({ navigation }: ScreenProps<'AdminUnidades'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [unidades, setUnidades] = useState<AdminUnidadeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [unitActionsFor, setUnitActionsFor] = useState<AdminUnidadeItem | null>(null);
  const [unitDetail, setUnitDetail] = useState<AdminUnidadeItem | null>(null);
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [unitFormMode, setUnitFormMode] = useState<'create' | 'edit'>('create');
  const [unitFormInitial, setUnitFormInitial] = useState<AdminUnidadeFormValues>(emptyAdminUnidadeForm());
  const [unitBeingEdited, setUnitBeingEdited] = useState<AdminUnidadeItem | null>(null);
  const [isSavingUnit, setIsSavingUnit] = useState(false);
  const [venderFor, setVenderFor] = useState<AdminUnidadeItem | null>(null);
  const [isContabilidadesOpen, setIsContabilidadesOpen] = useState(false);
  const [contabilidades, setContabilidades] = useState<AdminContabilidadeItem[]>([]);

  const showApiError = showAdminApiError;

  const loadContabilidades = () => {
    fetchAdminContabilidades()
      .then((data) => setContabilidades(data.contabilidades))
      .catch(() => {
        // Silencioso: sem contabilidades carregadas, o seletor no form de
        // unidade só fica vazio (opção "Sem contabilidade" continua
        // funcionando), sem travar a tela.
      });
  };

  useEffect(() => {
    loadContabilidades();
  }, []);

  const loadUnidades = () => {
    setIsLoading(true);
    setErrorMessage(null);
    return fetchAdminUnidades()
      .then((data) => setUnidades(data.unidades))
      .catch((err) => setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar as unidades.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchAdminUnidades()
      .then((data) => {
        if (isActive) setUnidades(data.unidades);
      })
      .catch((err) => {
        if (isActive) setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar as unidades.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return unidades;
    return unidades.filter(
      (item) =>
        (item.nomeFantasia ?? '').toLowerCase().includes(query) ||
        (item.razaoSocial ?? '').toLowerCase().includes(query) ||
        (item.cnpj ?? '').toLowerCase().includes(query) ||
        (item.idq ?? '').toLowerCase().includes(query) ||
        (item.bandeira ?? '').toLowerCase().includes(query) ||
        (item.cidade ?? '').toLowerCase().includes(query)
    );
  }, [unidades, search]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_UNIDADES_PAGE_SIZE));
  const pageStart = page * ADMIN_UNIDADES_PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + ADMIN_UNIDADES_PAGE_SIZE);
  const pageRangeLabel =
    filtered.length === 0
      ? '0 de 0'
      : `${pageStart + 1}-${Math.min(pageStart + ADMIN_UNIDADES_PAGE_SIZE, filtered.length)} de ${filtered.length}`;

  const handleUnidadeSubmit = (values: AdminUnidadeFormValues) => {
    const body = {
      nome_fantasia: values.nomeFantasia.trim() || null,
      apelido: values.apelido.trim() || null,
      razao_social: values.razaoSocial.trim(),
      cnpj: values.cnpj.trim(),
      bandeira: values.bandeira || undefined,
      tipo: values.tipo,
      proprietario: values.proprietario.trim() || null,
      idq: values.idq.trim() || null,
      cd_rede: values.cdRede.trim() || null,
      rua: values.rua.trim() || null,
      numero: values.numero.trim() || null,
      bairro: values.bairro.trim() || null,
      cep: values.cep.trim() || null,
      cidade: values.cidade.trim() || null,
      estado: values.estado.trim() || null,
      endereco_texto: values.enderecoTexto.trim() || null,
      ipiranga_habilitado: values.ipirangaHabilitado,
      is_active: values.isActive,
      email: values.email.trim() || null,
      telefone: values.telefone.trim() || null,
      data_cadastro: adminBrDateToIso(values.dataCadastro),
      data_primeira_venda: adminBrDateToIso(values.dataPrimeiraVenda),
      contabilidade_id: values.contabilidadeId,
      servicos: {
        horario_funcionamento: values.horarioFuncionamento.trim() || null,
        conveniencia: values.conveniencia,
        troca_oleo: values.trocaOleo,
        lava_jato: values.lavaJato,
        estacionamento: values.estacionamento,
        geladeira: values.geladeira,
        geladeira_tipo: values.geladeira && values.geladeiraTipo ? values.geladeiraTipo : null,
      },
    };

    setIsSavingUnit(true);
    const request =
      unitFormMode === 'create' ? createAdminUnidade(body, actorId) : updateAdminUnidade(unitBeingEdited!.id, body, actorId);

    request
      .then(() => {
        setIsUnitFormOpen(false);
        loadUnidades();
      })
      .catch((err) =>
        showApiError(
          err,
          unitFormMode === 'create' ? 'Não foi possível criar a unidade.' : 'Não foi possível salvar a unidade.'
        )
      )
      .finally(() => setIsSavingUnit(false));
  };

  const handleExcluirUnidade = (unidade: AdminUnidadeItem) => {
    Alert.alert('Excluir unidade', `Tem certeza que quer excluir "${adminUnidadeDisplayName(unidade)}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAdminUnidade(unidade.id, actorId)
            .then(() => loadUnidades())
            .catch((err) => {
              if (err instanceof ApiError && err.status === 409) {
                Alert.alert(
                  'Não é possível excluir',
                  'Essa unidade ainda tem colaborador(es) vinculado(s). Use "Vender unidade" pra transferir/desligar antes de excluir.'
                );
                return;
              }
              showApiError(err, 'Não foi possível excluir a unidade.');
            });
        },
      },
    ]);
  };

  const openEditForm = (unidade: AdminUnidadeItem) => {
    setUnitFormMode('edit');
    setUnitBeingEdited(unidade);
    setUnitFormInitial({
      nomeFantasia: unidade.nomeFantasia ?? '',
      apelido: unidade.apelido ?? '',
      razaoSocial: unidade.razaoSocial ?? '',
      cnpj: unidade.cnpj ?? '',
      bandeira: unidade.bandeira ?? '',
      tipo: unidade.tipo ?? 'Posto',
      proprietario: unidade.proprietario ?? '',
      idq: unidade.idq ?? '',
      cdRede: unidade.cdRede ?? '',
      rua: unidade.rua ?? '',
      numero: unidade.numero ?? '',
      bairro: unidade.bairro ?? '',
      cep: unidade.cep ?? '',
      cidade: unidade.cidade ?? '',
      estado: unidade.estado ?? '',
      enderecoTexto: unidade.enderecoTexto ?? '',
      ipirangaHabilitado: unidade.ipirangaHabilitado,
      isActive: unidade.isActive,
      email: unidade.email ?? '',
      telefone: unidade.telefone ?? '',
      dataCadastro: adminIsoDateToBrLabel(unidade.dataCadastro),
      dataPrimeiraVenda: adminIsoDateToBrLabel(unidade.dataPrimeiraVenda),
      contabilidadeId: unidade.contabilidadeId,
      horarioFuncionamento: unidade.servicos?.horario_funcionamento ?? '',
      conveniencia: Boolean(unidade.servicos?.conveniencia),
      trocaOleo: Boolean(unidade.servicos?.troca_oleo),
      lavaJato: Boolean(unidade.servicos?.lava_jato),
      estacionamento: Boolean(unidade.servicos?.estacionamento),
      geladeira: Boolean(unidade.servicos?.geladeira),
      geladeiraTipo: unidade.servicos?.geladeira_tipo ?? '',
    });
    setIsUnitFormOpen(true);
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
        <AdminPageHeader
          icon="home"
          title="Unidades"
          subtitle={isLoading ? 'Carregando...' : `${unidades.length} unidades`}
        />

        <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar por nome, CNPJ, IDQ, bandeira..." />

        <View style={[styles.directorNotifHeaderRow, { justifyContent: 'flex-end', gap: 8 }]}>
          <Pressable
            style={adminStyles.gearButton}
            onPress={() => setIsContabilidadesOpen(true)}
            hitSlop={6}
          >
            <Feather name="settings" size={16} color="#4C5470" />
          </Pressable>
          <Pressable
            style={styles.directorNotifNewButton}
            onPress={() => {
              setUnitFormMode('create');
              setUnitBeingEdited(null);
              setUnitFormInitial(emptyAdminUnidadeForm());
              setIsUnitFormOpen(true);
            }}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.directorNotifNewButtonText}>Nova Unidade</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <AdminEmptyState message="Carregando unidades..." />
        ) : errorMessage ? (
          <AdminEmptyState message={errorMessage} />
        ) : filtered.length === 0 ? (
          <AdminEmptyState message="Nenhuma unidade encontrada." />
        ) : (
          <>
            {paged.map((unidade) => {
              const bandeiraColors = (unidade.bandeira && adminBandeiraColorMap[unidade.bandeira]) || {
                bg: GRAY_BG,
                color: GRAY,
              };
              return (
                <Pressable key={unidade.id} style={adminStyles.unitCard} onPress={() => setUnitDetail(unidade)}>
                  <View style={adminStyles.unitInfo}>
                    <Text style={adminStyles.listName} numberOfLines={1}>
                      {adminUnidadeDisplayName(unidade)}
                    </Text>
                    <Text style={adminStyles.listMeta}>{unidade.cnpj || 'CNPJ não informado'}</Text>
                    <View style={adminStyles.roleModulesRow}>
                      {unidade.bandeira ? (
                        <AdminColorPill label={unidade.bandeira} bg={bandeiraColors.bg} color={bandeiraColors.color} />
                      ) : null}
                      <AdminTagPill label={unidade.tipo || 'Posto'} />
                    </View>
                  </View>
                  <View style={adminStyles.unitRight}>
                    <Text style={adminStyles.unitCity}>
                      {unidade.cidade ? `${unidade.cidade}${unidade.estado ? `/${unidade.estado}` : ''}` : '—'}
                    </Text>
                    <View
                      style={[
                        adminStyles.detailBadgeBase,
                        { backgroundColor: unidade.vendida ? GRAY_BG : unidade.isActive ? GREEN_BG : RED_BG },
                      ]}
                    >
                      <Text
                        style={[
                          adminStyles.detailBadgeText,
                          { color: unidade.vendida ? GRAY : unidade.isActive ? GREEN : RED },
                        ]}
                      >
                        {unidade.vendida ? 'Vendida' : unidade.isActive ? 'Ativa' : 'Inativa'}
                      </Text>
                    </View>
                    <Pressable hitSlop={10} onPress={() => setUnitActionsFor(unidade)}>
                      <Feather name="more-vertical" size={18} color="#9AA1B5" />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}

            <View style={adminStyles.paginationRow}>
              <Text style={adminStyles.paginationLabel}>{pageRangeLabel}</Text>
              <View style={adminStyles.paginationArrows}>
                <Pressable
                  style={[adminStyles.paginationArrowButton, page === 0 ? adminStyles.paginationArrowDisabled : null]}
                  disabled={page === 0}
                  onPress={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <Feather name="chevron-left" size={16} color={page === 0 ? '#C7CCDA' : '#4C5470'} />
                </Pressable>
                <Pressable
                  style={[
                    adminStyles.paginationArrowButton,
                    page >= totalPages - 1 ? adminStyles.paginationArrowDisabled : null,
                  ]}
                  disabled={page >= totalPages - 1}
                  onPress={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                >
                  <Feather name="chevron-right" size={16} color={page >= totalPages - 1 ? '#C7CCDA' : '#4C5470'} />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <AdminGenericActionsMenu
        visible={unitActionsFor !== null}
        title={unitActionsFor ? adminUnidadeDisplayName(unitActionsFor) : ''}
        onClose={() => setUnitActionsFor(null)}
        actions={[
          {
            key: 'visualizar',
            icon: 'eye',
            label: 'Visualizar',
            onPress: () => {
              setUnitDetail(unitActionsFor);
              setUnitActionsFor(null);
            },
          },
          {
            key: 'editar',
            icon: 'edit-2',
            label: 'Editar',
            onPress: () => {
              const unidade = unitActionsFor;
              setUnitActionsFor(null);
              if (!unidade) return;
              openEditForm(unidade);
            },
          },
          {
            key: 'vender',
            icon: 'dollar-sign',
            label: 'Vender unidade',
            onPress: () => {
              const unidade = unitActionsFor;
              setUnitActionsFor(null);
              if (!unidade) return;
              if (unidade.vendida) {
                Alert.alert('Unidade já vendida', 'Essa unidade já foi marcada como vendida anteriormente.');
                return;
              }
              setVenderFor(unidade);
            },
          },
          {
            key: 'excluir',
            icon: 'trash-2',
            label: 'Excluir',
            danger: true,
            onPress: () => {
              const unidade = unitActionsFor;
              setUnitActionsFor(null);
              if (!unidade) return;
              handleExcluirUnidade(unidade);
            },
          },
        ]}
      />

      <AdminUnidadeDetailModal
        visible={unitDetail !== null}
        unidade={unitDetail}
        contabilidades={contabilidades}
        onClose={() => setUnitDetail(null)}
        onEdit={() => {
          const unidade = unitDetail;
          if (!unidade) return;
          setUnitDetail(null);
          openEditForm(unidade);
        }}
      />

      <AdminUnidadeFormModal
        visible={isUnitFormOpen}
        mode={unitFormMode}
        initialValues={unitFormInitial}
        contabilidades={contabilidades}
        isSaving={isSavingUnit}
        onClose={() => setIsUnitFormOpen(false)}
        onSubmit={handleUnidadeSubmit}
      />

      <AdminVenderUnidadeModal
        visible={venderFor !== null}
        unidade={venderFor}
        unidadesDestino={unidades.filter((u) => u.id !== venderFor?.id && u.isActive && !u.vendida)}
        actorId={actorId}
        onClose={() => setVenderFor(null)}
        onSold={loadUnidades}
      />

      <AdminContabilidadesModal
        visible={isContabilidadesOpen}
        actorId={actorId}
        onClose={() => setIsContabilidadesOpen(false)}
        onChanged={loadContabilidades}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// 7. Módulos
// ============================================================================

// Dados reais via GET /api/admin/modulos — tabela própria "modules" (já
// liberada na allowlist do Lovable), com name/slug/icon/description/color/
// order_index/is_active. O ícone vem como nome do Lucide (usado no web) —
// mapeamos pro equivalente mais próximo do Feather (só estética, não afeta
// nenhum dado real). Sem endpoint de escrita confirmado pra is_active, então
// o status é mostrado como selo real (Ativo/Inativo), não como toggle
// editável — não fabricamos uma ação que não grava em lugar nenhum.
const ADMIN_MODULE_ICON_MAP: Record<string, FeatherIconName> = {
  Settings: 'settings',
  Users: 'users',
  UserPlus: 'user-plus',
  User: 'user',
  DollarSign: 'dollar-sign',
  BarChart2: 'bar-chart-2',
  Briefcase: 'briefcase',
  Crown: 'award',
  Megaphone: 'volume-2',
};

const ADMIN_MODULOS_PAGE_SIZE = 10;

// ---------- Modal "Detalhe do módulo" ----------
// Abre ao tocar no card — no celular a descrição às vezes corta na lista,
// então aqui mostra o texto completo, junto com o resto dos dados reais.
function AdminModuloDetailModal({
  visible,
  modulo,
  onClose,
  onToggleAtivo,
  isToggling,
}: {
  visible: boolean;
  modulo: AdminModuleItem | null;
  onClose: () => void;
  onToggleAtivo: (modulo: AdminModuleItem) => void;
  isToggling: boolean;
}) {
  const { theme } = useContext(AdminThemeContext);
  if (!modulo) return null;
  const icon = (modulo.icon && ADMIN_MODULE_ICON_MAP[modulo.icon]) || 'grid';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconShell, adminStyles.iconAccentNavy, { backgroundColor: theme.primaryBg }]}>
                <Feather name={icon} size={17} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestModalTitle}>{modulo.name || '(sem nome)'}</Text>
                <Text style={adminStyles.detailSubEmail}>{modulo.slug || '—'}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={adminStyles.detailFieldLabel}>DESCRIÇÃO</Text>
            <Text style={adminStyles.detailFieldValue}>{modulo.description || 'Sem descrição cadastrada.'}</Text>

            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>COR</Text>
                <View style={adminStyles.groupLeft}>
                  {modulo.color ? (
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: modulo.color }} />
                  ) : null}
                  <Text style={adminStyles.detailFieldValue}>{modulo.color || '—'}</Text>
                </View>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>ORDEM</Text>
                <Text style={adminStyles.detailFieldValue}>{modulo.order_index ?? '—'}</Text>
              </View>
            </View>

            <View style={[styles.spacingTop, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={adminStyles.detailFieldLabel}>ATIVO</Text>
              <ToggleSwitch
                value={modulo.is_active}
                onValueChange={() => {
                  if (isToggling) return;
                  onToggleAtivo(modulo);
                }}
              />
            </View>
          </ScrollView>

          <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
            <Pressable style={adminStyles.ghostButton} onPress={onClose}>
              <Text style={adminStyles.ghostButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AdminModulosScreen({ navigation }: ScreenProps<'AdminModulos'>) {
  const { identity } = useContext(AuthIdentityContext);
  const { theme } = useContext(AdminThemeContext);
  const actorId = identity?.profileId;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [modulos, setModulos] = useState<AdminModuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [moduloDetail, setModuloDetail] = useState<AdminModuleItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleModuloAtivo = useCallback(
    (modulo: AdminModuleItem) => {
      const nextValue = !modulo.is_active;
      setTogglingId(modulo.id);
      updateAdminModulo(modulo.id, { is_active: nextValue }, actorId)
        .then((updated) => {
          setModulos((current) => current.map((item) => (item.id === modulo.id ? { ...item, ...updated } : item)));
          setModuloDetail((current) => (current && current.id === modulo.id ? { ...current, ...updated } : current));
        })
        .catch((err) => {
          Alert.alert(
            'Não foi possível atualizar',
            err instanceof Error ? err.message : 'Falha ao alterar o status do módulo.'
          );
        })
        .finally(() => setTogglingId(null));
    },
    [actorId]
  );

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    fetchAdminModulos()
      .then((data) => {
        if (isActive) {
          setModulos([...data].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
        }
      })
      .catch((err) => {
        if (isActive) setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os módulos.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return modulos;
    return modulos.filter(
      (item) =>
        (item.name ?? '').toLowerCase().includes(query) ||
        (item.slug ?? '').toLowerCase().includes(query) ||
        (item.description ?? '').toLowerCase().includes(query)
    );
  }, [modulos, search]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_MODULOS_PAGE_SIZE));
  const pageStart = page * ADMIN_MODULOS_PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + ADMIN_MODULOS_PAGE_SIZE);
  const pageRangeLabel =
    filtered.length === 0
      ? '0 de 0'
      : `${pageStart + 1}-${Math.min(pageStart + ADMIN_MODULOS_PAGE_SIZE, filtered.length)} de ${filtered.length}`;

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
        <AdminPageHeader
          icon="grid"
          title="Módulos"
          subtitle={isLoading ? 'Carregando...' : `${modulos.length} módulos`}
        />

        <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar módulo..." />

        {isLoading ? (
          <AdminEmptyState message="Carregando módulos..." />
        ) : errorMessage ? (
          <AdminEmptyState message={errorMessage} />
        ) : filtered.length === 0 ? (
          <AdminEmptyState message="Nenhum módulo encontrado." />
        ) : (
          <>
            {paged.map((modulo) => {
              const icon = (modulo.icon && ADMIN_MODULE_ICON_MAP[modulo.icon]) || 'grid';
              return (
                <Pressable key={modulo.id} style={adminStyles.listCard} onPress={() => setModuloDetail(modulo)}>
                  <View style={[styles.iconShell, adminStyles.iconAccentNavy, { backgroundColor: theme.primaryBg }]}>
                    <Feather name={icon} size={17} color={theme.primary} />
                  </View>
                  <View style={adminStyles.listInfo}>
                    <Text style={adminStyles.listName}>{modulo.name || '(sem nome)'}</Text>
                    <Text style={adminStyles.listMeta}>{modulo.slug || '—'}</Text>
                    {modulo.description ? (
                      <Text style={adminStyles.listMeta} numberOfLines={1}>
                        {modulo.description}
                      </Text>
                    ) : null}
                  </View>
                  <ToggleSwitch
                    value={modulo.is_active}
                    onValueChange={() => {
                      if (togglingId) return;
                      handleToggleModuloAtivo(modulo);
                    }}
                  />
                </Pressable>
              );
            })}

            <View style={adminStyles.paginationRow}>
              <Text style={adminStyles.paginationLabel}>{pageRangeLabel}</Text>
              <View style={adminStyles.paginationArrows}>
                <Pressable
                  style={[adminStyles.paginationArrowButton, page === 0 ? adminStyles.paginationArrowDisabled : null]}
                  disabled={page === 0}
                  onPress={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <Feather name="chevron-left" size={16} color={page === 0 ? '#C7CCDA' : '#4C5470'} />
                </Pressable>
                <Pressable
                  style={[
                    adminStyles.paginationArrowButton,
                    page >= totalPages - 1 ? adminStyles.paginationArrowDisabled : null,
                  ]}
                  disabled={page >= totalPages - 1}
                  onPress={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                >
                  <Feather name="chevron-right" size={16} color={page >= totalPages - 1 ? '#C7CCDA' : '#4C5470'} />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <AdminModuloDetailModal
        visible={moduloDetail !== null}
        modulo={moduloDetail}
        onClose={() => setModuloDetail(null)}
        onToggleAtivo={handleToggleModuloAtivo}
        isToggling={togglingId !== null}
      />
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
  const { theme } = useContext(AdminThemeContext);
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
                style={[
                  adminStyles.tabPill,
                  isActive ? [adminStyles.tabPillActive, { backgroundColor: theme.primary, borderColor: theme.primary }] : null,
                ]}
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
                <View style={[styles.iconShell, adminStyles.iconAccentNavy, { backgroundColor: theme.primaryBg }]}>
                  <Feather name="message-circle" size={17} color={theme.primary} />
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

// Conteúdo real (não mockado) dos dois arquivos de documentação do banco,
// espelhando o painel web /admin › Convenções. Ver adminConvencoesContent.json
// (gerado a partir do texto fornecido pelo time — database-conventions.md e
// database-changelog.md).
const adminConvencoes = adminConvencoesContent as { regras: string; changelog: string };

// Renderer leve de markdown (só o subconjunto usado nesses dois documentos):
// # / ## título, **negrito**, `código inline`, blocos ``` ```, listas "- ",
// checklist "☐ " e divisor "---". Sem libs externas.
function renderInlineMd(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(<Text key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex, match.index)}</Text>);
    }
    if (match[1] !== undefined) {
      nodes.push(
        <Text key={`${keyPrefix}-b${i++}`} style={{ fontWeight: '800' }}>
          {match[1]}
        </Text>
      );
    } else if (match[2] !== undefined) {
      nodes.push(
        <Text key={`${keyPrefix}-c${i++}`} style={adminStyles.mdInlineCode}>
          {match[2]}
        </Text>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(<Text key={`${keyPrefix}-tend`}>{text.slice(lastIndex)}</Text>);
  }
  return nodes;
}

function AdminMarkdownBlock({ text }: { text: string }) {
  const { theme } = useContext(AdminThemeContext);
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '```') {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== '```') {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // pula o ``` de fechamento
      blocks.push(
        <View key={`k${key++}`} style={adminStyles.mdCodeBlock}>
          <Text style={adminStyles.mdCodeBlockText}>{codeLines.join('\n')}</Text>
        </View>
      );
      continue;
    }

    if (trimmed === '---') {
      blocks.push(<View key={`k${key++}`} style={adminStyles.mdDivider} />);
      i += 1;
      continue;
    }

    if (trimmed === '') {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push(
        <Text key={`k${key++}`} style={[adminStyles.mdH2, { color: theme.primary }]}>
          {trimmed.slice(3)}
        </Text>
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push(
        <Text key={`k${key++}`} style={[adminStyles.mdH1, { color: theme.primary }]}>
          {trimmed.slice(2)}
        </Text>
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith('☐ ')) {
      const content = trimmed.slice(2);
      blocks.push(
        <View key={`k${key++}`} style={adminStyles.mdChecklistRow}>
          <View style={adminStyles.mdChecklistBox} />
          <Text style={adminStyles.mdChecklistText}>{renderInlineMd(content, `k${key}`)}</Text>
        </View>
      );
      i += 1;
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const indent = line.match(/^\s*/)?.[0].length ?? 0;
      const content = line.replace(/^\s*-\s+/, '');
      blocks.push(
        <View
          key={`k${key++}`}
          style={[adminStyles.mdBulletRow, indent >= 2 ? adminStyles.mdBulletRowIndent : null]}
        >
          <Text style={adminStyles.mdBulletDot}>•</Text>
          <Text style={adminStyles.mdBulletText}>{renderInlineMd(content, `k${key}`)}</Text>
        </View>
      );
      i += 1;
      continue;
    }

    blocks.push(
      <Text key={`k${key++}`} style={adminStyles.mdParagraph}>
        {renderInlineMd(trimmed, `k${key}`)}
      </Text>
    );
    i += 1;
  }

  return <>{blocks}</>;
}

export function AdminConvencoesScreen({ navigation }: ScreenProps<'AdminConvencoes'>) {
  const [activeTab, setActiveTab] = useState<'regras' | 'changelog'>('regras');
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = () => {
    const content = activeTab === 'regras' ? adminConvencoes.regras : adminConvencoes.changelog;
    Clipboard.setStringAsync(content)
      .then(() => {
        setJustCopied(true);
        setTimeout(() => setJustCopied(false), 1800);
      })
      .catch(() => Alert.alert('Não foi possível copiar', 'Tente novamente.'));
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
        <AdminPageHeader icon="book-open" title="Convenções" subtitle="Convenções de Banco" />

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

        <View style={adminStyles.sectionCard}>
          <View style={adminStyles.mdFileLabelRow}>
            <View style={[adminStyles.groupLeft, { flex: 1 }]}>
              <Feather name="file-text" size={13} color="#7A8299" />
              <Text style={adminStyles.fileLabel}>
                {activeTab === 'regras' ? 'database-conventions.md' : 'database-changelog.md'}
              </Text>
            </View>
            <Pressable style={adminStyles.mdCopyButton} onPress={handleCopy} hitSlop={6}>
              <Feather name={justCopied ? 'check' : 'copy'} size={13} color={justCopied ? GREEN : '#4C5470'} />
              <Text style={[adminStyles.mdCopyButtonText, justCopied ? { color: GREEN } : null]}>
                {justCopied ? 'Copiado' : 'Copiar'}
              </Text>
            </Pressable>
          </View>
          <AdminMarkdownBlock text={activeTab === 'regras' ? adminConvencoes.regras : adminConvencoes.changelog} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 10. Configurações
// ============================================================================

export function AdminConfiguracoesScreen({ navigation }: ScreenProps<'AdminConfiguracoes'>) {
  const { theme, setThemeSlug } = useContext(AdminThemeContext);

  // MOCK: leitura/escrita real de adm_dominios_permitidos ainda depende da
  // Lovable liberar a tabela na allowlist + criar o endpoint de escrita (ver
  // mensagem-lovable-configuracoes.txt). Até isso ser confirmado, esses
  // toggles não gravam em lugar nenhum — é só ilustrativo, como o resto das
  // telas deste arquivo marcadas como MOCK.
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
          <Text style={adminStyles.integrationDescription}>
            Skins reversíveis aplicadas ao painel Administrador. Troca instantânea para todos que abrirem o app.
          </Text>

          {ADMIN_THEME_PRESETS.map((preset, index) => {
            const isActive = preset.slug === theme.slug;
            return (
              <View
                key={preset.slug}
                style={[adminStyles.themeRow, index === ADMIN_THEME_PRESETS.length - 1 ? { borderBottomWidth: 0 } : null]}
              >
                <View style={adminStyles.themeRowTop}>
                  <Text style={adminStyles.subsectionTitle}>{preset.nome}</Text>
                  {isActive ? (
                    <AdminColorPill label="✓ Ativo" bg={GREEN_BG} color={GREEN} />
                  ) : (
                    <Pressable style={adminStyles.applyButton} onPress={() => setThemeSlug(preset.slug)}>
                      <Text style={adminStyles.applyButtonText}>Aplicar</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={adminStyles.listMeta}>{preset.descricao}</Text>
                <View style={adminStyles.themeDotsRow}>
                  {preset.previewColors.map((color, dotIndex) => (
                    <View key={`${preset.slug}-${dotIndex}`} style={[adminStyles.themeDot, { backgroundColor: color }]} />
                  ))}
                </View>
              </View>
            );
          })}

          <Text style={[adminStyles.listMeta, { marginTop: 10 }]}>
            Por enquanto a troca fica só neste app (a tabela adm_temas ainda não tem endpoint de escrita confirmado
            pela Lovable) — ao reabrir o app volta pro tema padrão.
          </Text>
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
    flex: 1,
    marginRight: 8,
  },
  roleCardTopRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  selectPlaceholder: {
    color: '#A7AEC2',
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formRowItem: {
    flex: 1,
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
  listTrailing: {
    alignItems: 'center',
    gap: 10,
  },
  listNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listNameText: {
    flexShrink: 1,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  detailSubEmail: {
    marginTop: 2,
    color: '#7C8397',
    fontSize: 11.5,
  },
  detailSectionTitleRow: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F6',
    marginBottom: 8,
  },
  detailSectionTitleText: {
    color: '#15203E',
    fontSize: 12.5,
    fontWeight: '800',
  },
  detailGridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailGridItem: {
    flex: 1,
  },
  detailFieldLabel: {
    color: '#9AA1B5',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  detailFieldValue: {
    marginTop: 4,
    color: '#15203E',
    fontSize: 13.5,
    fontWeight: '600',
  },
  detailBadgeBase: {
    marginTop: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailBadgeNeutral: {
    backgroundColor: '#F1F2F7',
  },
  detailBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  detailFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  secondaryButtonCompact: {
    minHeight: 40,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignSelf: 'auto',
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E6213D',
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 40,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
  checkboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  checkboxCardLabel: {
    color: '#15203E',
    fontSize: 12.5,
    fontWeight: '700',
  },
  checkboxCardHint: {
    marginTop: 2,
    color: '#7C8397',
    fontSize: 11,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingVertical: 6,
  },
  paginationLabel: {
    color: '#7C8397',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paginationArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationArrowDisabled: {
    backgroundColor: '#F8F9FC',
    borderColor: '#EEF1F8',
  },
  acessoCloseRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  acessoUserHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -8,
  },
  acessoDivider: {
    height: 1,
    backgroundColor: '#EEF1F8',
    marginTop: 14,
    marginBottom: 12,
  },
  funcHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  funcHeaderLabel: {
    color: '#9AA1B5',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  funcListWrap: {
    marginBottom: 6,
  },
  funcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  funcRowText: {
    flex: 1,
    color: '#3A415C',
    fontSize: 12.5,
    fontWeight: '600',
  },
  stackedButton: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
  },
  stackedButtonSecondary: {
    marginTop: 8,
  },
  ghostButton: {
    minHeight: 40,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    color: '#5E667D',
    fontSize: 12,
    fontWeight: '700',
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cargoFormSectionTitle: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '800',
  },
  cargoFormSectionHint: {
    marginTop: 2,
    color: '#7C8397',
    fontSize: 11.5,
  },
  cargoModuleToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  cargoModuleToggleLabel: {
    color: '#15203E',
    fontSize: 13,
    fontWeight: '700',
  },
  cargoPermTableWrap: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E6F0',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  cargoPermHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F8',
  },
  cargoPermHeaderLabel: {
    color: '#9AA1B5',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cargoPermRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6FA',
  },
  cargoPermFunctionCell: {
    flex: 2.4,
    paddingRight: 6,
  },
  cargoPermFunctionText: {
    color: '#3A415C',
    fontSize: 11.5,
    fontWeight: '600',
  },
  cargoPermCheckboxCell: {
    flex: 1,
    alignItems: 'center',
  },
  cargoPermCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.4,
    borderColor: '#B9C0D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargoPermCheckboxActive: {
    borderColor: BLUE,
    backgroundColor: BLUE,
  },
  cargoPermNote: {
    marginTop: -4,
    marginBottom: 10,
    color: '#9AA1B5',
    fontSize: 11,
    fontStyle: 'italic',
  },
  colorSwatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: '#15203E',
  },
  venderColabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F6',
  },
  venderDestinoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 150,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7DCE8',
    backgroundColor: '#FAFBFD',
  },
  venderDestinoButtonText: {
    flex: 1,
    color: '#2E3A59',
    fontSize: 11.5,
    fontWeight: '600',
  },
  venderDesligadoLabel: {
    color: '#9AA1B5',
    fontSize: 11.5,
    fontStyle: 'italic',
    maxWidth: 120,
    textAlign: 'right',
  },
  gearButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7DCE8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F6',
  },
  venderWarningBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FCEFDA',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  venderWarningText: {
    flex: 1,
    color: '#7A5A17',
    fontSize: 11.5,
    lineHeight: 16,
  },
  mdH1: {
    color: NAVY,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 6,
  },
  mdH2: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 6,
  },
  mdParagraph: {
    color: '#2A3150',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  mdBulletRow: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingLeft: 2,
  },
  mdBulletRowIndent: {
    paddingLeft: 16,
  },
  mdBulletDot: {
    color: '#7A8299',
    fontSize: 13,
    lineHeight: 19,
    marginRight: 6,
  },
  mdBulletText: {
    flex: 1,
    color: '#2A3150',
    fontSize: 13,
    lineHeight: 19,
  },
  mdChecklistRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  mdChecklistBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#B7BECF',
    marginTop: 2,
  },
  mdChecklistText: {
    flex: 1,
    color: '#2A3150',
    fontSize: 13,
    lineHeight: 19,
  },
  mdInlineCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#C7254E',
    backgroundColor: '#F9F2F4',
    fontSize: 12.5,
  },
  mdCodeBlock: {
    backgroundColor: '#1E2333',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  mdCodeBlockText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#E4E7F0',
    fontSize: 12,
    lineHeight: 18,
  },
  mdDivider: {
    height: 1,
    backgroundColor: '#E2E6F0',
    marginVertical: 16,
  },
  mdFileLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  mdCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    backgroundColor: '#FFFFFF',
  },
  mdCopyButtonText: {
    color: '#4C5470',
    fontSize: 12,
    fontWeight: '700',
  },
});
