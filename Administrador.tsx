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
import {
  ActivityIndicator,
  Alert,
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
  NotificationRoutineFormModal,
  TemplateFormModal,
  notificationTriggerOptions,
  notificationChannelMeta,
  notificationAudienceOptions,
  formatDateBR,
  getCalendarWeeks,
  calendarMonthNames,
} from './App';
import type {
  ScreenProps,
  AdminThemePreset,
  NotificationRoutineItem,
  NotificationTemplateItem,
  NotificationChannels,
  NotificationAudienceType,
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
  fetchAdminContabilidadeResponsaveis,
  createAdminContabilidadeResponsavel,
  updateAdminContabilidadeResponsavel,
  deleteAdminContabilidadeResponsavel,
  liberarAcessoAdminContabilidadeResponsavel,
  fetchRhColaboradores,
  fetchAdminDominios,
  createAdminDominio,
  updateAdminDominio,
  deleteAdminDominio,
  fetchAdminCargoDominio,
  createAdminCargoDominio,
  updateAdminCargoDominio,
  deleteAdminCargoDominio,
  fetchAdminVersoes,
  fetchAdminNotifRotinas,
  createAdminNotifRotina,
  updateAdminNotifRotina,
  deleteAdminNotifRotina,
  executarAdminNotifRotina,
  fetchAdminNotifTemplates,
  createAdminNotifTemplate,
  updateAdminNotifTemplate,
  fetchAdminLogs,
  fetchAdminWaConfig,
  updateAdminWaConfig,
  testAdminWaConnection,
  rotateAdminWaWebhookSecret,
  syncAdminWaTemplates,
  testAdminWaTemplate,
  fetchAdminGmb,
  vincularAdminGmbLocation,
  sincronizarAdminGmb,
  desconectarAdminGmb,
  fetchAdminBuscaPfStatus,
  testAdminBuscaPfConexao,
  executarAdminBuscaPfConsulta,
  fetchAdminBuscaPfHistorico,
  fetchAdminBuscaPfUso,
  fetchAdminDashboardPerformance,
  fetchAdminDashboardKpis,
  ApiError,
  type AdminDashboardPerformance,
  type AdminDashboardKpis,
  type AdminDominioItem,
  type AdminCargoDominioItem,
  type AdminCargoDominioProvider,
  type AdminVersoesResponse,
  type AdminVersaoTipoKey,
  type AdminNotifRotinaItem,
  type AdminNotifRotinaWriteBody,
  type AdminNotifTemplateItem,
  type AdminNotifTemplateWriteBody,
  type AdminNotifPublicoTipo,
  type AdminLogItem,
  type AdminWaConfig,
  type AdminWaConfigWriteBody,
  type AdminWaTemplateItem,
  type AdminWaProvider,
  type AdminGmbData,
  type AdminGmbLocation,
  type AdminBuscaPfProvider,
  type AdminBuscaPfStatus,
  type AdminBuscaPfHistoricoItem,
  type AdminBuscaPfUso,
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
  type AdminContabilidadeResponsavelItem,
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
// Dados 100% reais desde 03/08/2026: adm_plataforma_performance_internal()
// (Performance da plataforma, Maiores tabelas e Saúde do banco — app faz
// polling a cada 10s, igual ao site) e adm_dashboard_kpis_internal(mes,ano)
// (Snapshot atual, No mês, gráfico de 6 meses e Top unidades — navegação por
// mês/ano). As duas RPCs foram expostas pelo Lovable no proxy interno
// (/api/public/internal/dashboard-performance e /dashboard-kpis), mesmo
// padrão x-internal-secret + x-actor-id dos demais módulos. Ressalvas
// confirmadas por eles: a série de 6 meses é sempre relativa a hoje (ignora o
// mês/ano selecionado) e Top unidades vem fixo em 5 (métrica: nº de
// colaboradores ativos por unidade).

export function AdminDashboardScreen({ navigation }: ScreenProps<'AdminDashboard'>) {
  const { theme } = useContext(AdminThemeContext);
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;

  const [perf, setPerf] = useState<AdminDashboardPerformance | null>(null);
  const [isLoadingPerf, setIsLoadingPerf] = useState(true);
  const [perfError, setPerfError] = useState<string | null>(null);

  const [kpis, setKpis] = useState<AdminDashboardKpis | null>(null);
  const [isLoadingKpis, setIsLoadingKpis] = useState(true);
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [selectedMes, setSelectedMes] = useState<number | null>(null);
  const [selectedAno, setSelectedAno] = useState<number | null>(null);
  const [selectedChartMonth, setSelectedChartMonth] = useState<string | null>(null);

  // Performance: carrega na entrada e faz polling a cada 10s (igual ao site
  // — badge "AO VIVO · atualiza a cada 10s").
  useEffect(() => {
    let isActive = true;

    async function loadPerf() {
      try {
        const data = await fetchAdminDashboardPerformance(actorId);
        if (isActive) {
          setPerf(data);
          setPerfError(null);
        }
      } catch (err) {
        if (isActive) {
          setPerfError(err instanceof Error ? err.message : 'Não foi possível carregar as métricas da plataforma.');
        }
      } finally {
        if (isActive) setIsLoadingPerf(false);
      }
    }

    loadPerf();
    const intervalId = setInterval(loadPerf, 10000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [actorId]);

  // KPIs: carrega o mês atual na entrada; setas ◀ ▶ reenviam mes/ano.
  const loadKpis = useCallback(
    (mes?: number, ano?: number) => {
      setIsLoadingKpis(true);
      setKpisError(null);
      fetchAdminDashboardKpis({ mes, ano, actorId })
        .then((data) => {
          setKpis(data);
          setSelectedMes(data.periodo?.mes ?? null);
          setSelectedAno(data.periodo?.ano ?? null);
          setSelectedChartMonth(null);
        })
        .catch((err) => {
          setKpisError(err instanceof Error ? err.message : 'Não foi possível carregar os indicadores do mês.');
        })
        .finally(() => {
          setIsLoadingKpis(false);
        });
    },
    [actorId]
  );

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  function handlePrevMonth() {
    if (selectedMes == null || selectedAno == null) return;
    let mes = selectedMes - 1;
    let ano = selectedAno;
    if (mes < 1) {
      mes = 12;
      ano -= 1;
    }
    loadKpis(mes, ano);
  }

  function handleNextMonth() {
    if (selectedMes == null || selectedAno == null) return;
    let mes = selectedMes + 1;
    let ano = selectedAno;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
    loadKpis(mes, ano);
  }

  const monthNavDisabled = selectedMes == null || selectedAno == null || isLoadingKpis;
  const monthLabel = admMonthLabel(selectedMes, selectedAno);

  const conexoesPercent =
    perf && perf.db.max_connections > 0 ? (perf.conexoes.total / perf.db.max_connections) * 100 : null;
  const tps =
    perf && perf.cache.segundos_desde_reset > 0
      ? (perf.cache.commits + perf.cache.rollbacks) / perf.cache.segundos_desde_reset
      : null;
  const cacheHitOk = perf ? perf.cache.hit_ratio >= 90 : false;

  const maxTableSize = perf?.top_tabelas?.length ? Math.max(...perf.top_tabelas.map((t) => t.bytes)) : 1;
  const maxMonthValue = kpis?.serie_novos_colaboradores?.length
    ? Math.max(1, ...kpis.serie_novos_colaboradores.map((s) => s.novos))
    : 1;
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
          <Text style={adminStyles.heroSubtitle}>Visão geral da plataforma · {monthLabel}</Text>
        </LinearGradient>

        <View style={adminStyles.monthNavRow}>
          <Pressable
            style={[adminStyles.paginationArrowButton, monthNavDisabled ? adminStyles.paginationArrowDisabled : null]}
            disabled={monthNavDisabled}
            onPress={handlePrevMonth}
          >
            <Feather name="chevron-left" size={16} color={monthNavDisabled ? '#C7CCDA' : '#4C5470'} />
          </Pressable>
          <Text style={adminStyles.monthNavLabel}>{monthLabel.toUpperCase()}</Text>
          <Pressable
            style={[adminStyles.paginationArrowButton, monthNavDisabled ? adminStyles.paginationArrowDisabled : null]}
            disabled={monthNavDisabled}
            onPress={handleNextMonth}
          >
            <Feather name="chevron-right" size={16} color={monthNavDisabled ? '#C7CCDA' : '#4C5470'} />
          </Pressable>
        </View>

        {isLoadingPerf && !perf ? (
          <AdminEmptyState message="Carregando métricas da plataforma..." />
        ) : perfError && !perf ? (
          <AdminEmptyState message={perfError} />
        ) : perf ? (
          <>
            <Text style={adminStyles.sectionLabel}>PERFORMANCE DA PLATAFORMA</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <View style={styles.dashboardCard}>
                  <View style={[styles.iconShell, { backgroundColor: theme.primaryBg }]}>
                    <Feather name="database" size={18} color={theme.primary} />
                  </View>
                  <Text style={styles.dashboardCardValue}>{admFormatBytes(perf.db.bytes)}</Text>
                  <Text style={styles.dashboardCardLabel}>Banco de dados</Text>
                  <Text style={adminStyles.metricMeta}>Tamanho total</Text>
                </View>
              </View>
              <View style={styles.gridItem}>
                <View style={styles.dashboardCard}>
                  <View style={[styles.iconShell, { backgroundColor: theme.primaryBg }]}>
                    <Feather name="wifi" size={18} color={theme.primary} />
                  </View>
                  <Text style={styles.dashboardCardValue}>
                    {perf.conexoes.total}/{perf.db.max_connections}
                  </Text>
                  <Text style={styles.dashboardCardLabel}>Conexões</Text>
                  <Text style={adminStyles.metricMeta}>{admFormatPercent(conexoesPercent, 0)} do limite</Text>
                </View>
              </View>
              <View style={styles.gridItem}>
                <View style={styles.dashboardCard}>
                  <View style={[styles.iconShell, { backgroundColor: theme.primaryBg }]}>
                    <Feather name="activity" size={18} color={theme.primary} />
                  </View>
                  <Text style={styles.dashboardCardValue}>{admFormatInt(perf.conexoes.ativas)}</Text>
                  <Text style={styles.dashboardCardLabel}>Queries ativas</Text>
                  <Text style={adminStyles.metricMeta}>
                    {admFormatInt(perf.conexoes.ociosas)} ociosas · {admFormatInt(perf.conexoes.aguardando)} aguard.
                  </Text>
                </View>
              </View>
              <View style={styles.gridItem}>
                <View style={styles.dashboardCard}>
                  <View
                    style={[styles.iconShell, { backgroundColor: cacheHitOk ? GREEN_BG : theme.primaryBg }]}
                  >
                    <Feather name="check-circle" size={18} color={cacheHitOk ? GREEN : theme.primary} />
                  </View>
                  <Text style={styles.dashboardCardValue}>{admFormatPercent(perf.cache.hit_ratio, 1)}</Text>
                  <Text style={styles.dashboardCardLabel}>Cache hit ratio</Text>
                  <Text style={adminStyles.metricMeta}>{cacheHitOk ? 'Bom' : 'Atenção'}</Text>
                </View>
              </View>
              <View style={styles.gridItem}>
                <View style={styles.dashboardCard}>
                  <View style={[styles.iconShell, { backgroundColor: theme.primaryBg }]}>
                    <Feather name="zap" size={18} color={theme.primary} />
                  </View>
                  <Text style={styles.dashboardCardValue}>{tps != null ? tps.toFixed(1) : '—'}</Text>
                  <Text style={styles.dashboardCardLabel}>Transações/s</Text>
                  <Text style={adminStyles.metricMeta}>{admFormatInt(perf.cache.commits)} commits</Text>
                </View>
              </View>
              <View style={styles.gridItem}>
                <View style={styles.dashboardCard}>
                  <View style={[styles.iconShell, { backgroundColor: theme.primaryBg }]}>
                    <Feather name="users" size={18} color={theme.primary} />
                  </View>
                  <Text style={styles.dashboardCardValue}>{admFormatInt(perf.sessoes.online_5min)}</Text>
                  <Text style={styles.dashboardCardLabel}>Online agora</Text>
                  <Text style={adminStyles.metricMeta}>{admFormatInt(perf.sessoes.online_1h)} na última hora</Text>
                </View>
              </View>
            </View>

            <View style={adminStyles.sectionCard}>
              <Text style={adminStyles.sectionTitle}>Maiores tabelas (top 10)</Text>
              {perf.top_tabelas.length === 0 ? (
                <AdminEmptyState message="Nenhuma tabela retornada." />
              ) : (
                perf.top_tabelas.map((table, index) => (
                  <View
                    key={table.tabela}
                    style={[
                      adminStyles.tableRow,
                      index === perf.top_tabelas.length - 1 ? { marginBottom: 0 } : null,
                    ]}
                  >
                    <View style={adminStyles.tableRowHeader}>
                      <Text style={adminStyles.tableRank}>{index + 1}</Text>
                      <Text style={adminStyles.tableName} numberOfLines={1}>
                        {table.tabela}
                      </Text>
                      <Text style={adminStyles.tableMeta}>
                        {admFormatBytes(table.bytes)} · {admFormatInt(table.linhas)} linhas
                      </Text>
                    </View>
                    <View style={adminStyles.tableProgressTrack}>
                      <View
                        style={[
                          adminStyles.tableProgressFill,
                          { width: `${Math.max(3, (table.bytes / maxTableSize) * 100)}%`, backgroundColor: theme.primary },
                        ]}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={adminStyles.sectionCard}>
              <Text style={adminStyles.sectionTitle}>Saúde do banco</Text>
              {[
                { id: 'h1', label: 'Idle in transaction', value: admFormatInt(perf.conexoes.idle_tx) },
                { id: 'h2', label: 'Deadlocks (acumulado)', value: admFormatInt(perf.cache.deadlocks) },
                { id: 'h3', label: 'Rollbacks', value: admFormatInt(perf.cache.rollbacks) },
                {
                  id: 'h4',
                  label: 'Arquivos temp',
                  value: admFormatInt(perf.cache.temp_files),
                  alert: perf.cache.temp_files > 0,
                },
                { id: 'h5', label: 'Bytes temp', value: admFormatBytes(perf.cache.temp_bytes) },
                { id: 'h6', label: 'Profiles', value: admFormatInt(perf.volumes.profiles) },
                { id: 'h7', label: 'Colaboradores', value: admFormatInt(perf.volumes.colaboradores) },
                { id: 'h8', label: 'Notif. entregas', value: admFormatInt(perf.volumes.notificacoes) },
                { id: 'h9', label: 'Audit log', value: admFormatInt(perf.volumes.audit_log) },
              ].map((item, index, arr) => (
                <View
                  key={item.id}
                  style={[adminStyles.healthRow, index === arr.length - 1 ? { borderBottomWidth: 0 } : null]}
                >
                  <Text style={adminStyles.healthLabel}>{item.label}</Text>
                  <Text style={[adminStyles.healthValue, item.alert ? adminStyles.healthValueAlert : null]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {isLoadingKpis && !kpis ? (
          <AdminEmptyState message="Carregando indicadores do mês..." />
        ) : kpisError && !kpis ? (
          <AdminEmptyState message={kpisError} />
        ) : kpis ? (
          <>
            <Text style={adminStyles.sectionLabel}>SNAPSHOT ATUAL</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <View style={adminStyles.statCard}>
                  <Text style={adminStyles.statCardValue}>{admFormatInt(kpis.snapshot.colaboradores_ativos)}</Text>
                  <Text style={adminStyles.statCardLabel}>Colaboradores ativos</Text>
                  <Text style={adminStyles.metricMeta}>
                    {admFormatInt(kpis.snapshot.colaboradores_total)} no total
                  </Text>
                </View>
              </View>
              <View style={styles.gridItem}>
                <View style={adminStyles.statCard}>
                  <Text style={adminStyles.statCardValue}>{admFormatInt(kpis.snapshot.usuarios_ativos)}</Text>
                  <Text style={adminStyles.statCardLabel}>Usuários ativos</Text>
                  <Text style={adminStyles.metricMeta}>{admFormatInt(kpis.snapshot.usuarios_total)} cadastrados</Text>
                </View>
              </View>
              <View style={styles.gridItem}>
                <View style={adminStyles.statCard}>
                  <Text style={adminStyles.statCardValue}>
                    {admFormatPercent(
                      kpis.snapshot.usuarios_ativos > 0
                        ? (kpis.snapshot.logaram_30d / kpis.snapshot.usuarios_ativos) * 100
                        : 0,
                      0
                    )}
                  </Text>
                  <Text style={adminStyles.statCardLabel}>Aderência (30 dias)</Text>
                  <Text style={adminStyles.metricMeta}>
                    {admFormatInt(kpis.snapshot.logaram_30d)} logaram em 30d
                  </Text>
                </View>
              </View>
              <View style={styles.gridItem}>
                <View style={adminStyles.statCard}>
                  <Text style={adminStyles.statCardValue}>
                    {admFormatInt(kpis.snapshot.colaboradores_sem_login)}
                  </Text>
                  <Text style={adminStyles.statCardLabel}>Sem acesso</Text>
                  <Text style={adminStyles.metricMeta}>Sem login</Text>
                </View>
              </View>
            </View>

            <Text style={adminStyles.sectionLabel}>NO MÊS — {monthLabel.toUpperCase()}</Text>
            <View style={styles.grid}>
              {[
                { id: 'm1', value: kpis.mes.novos_colaboradores, label: 'Novos colaboradores' },
                { id: 'm2', value: kpis.mes.logins_no_mes, label: 'Logins no mês' },
                { id: 'm3', value: kpis.mes.notificacoes, label: 'Notificações enviadas' },
                { id: 'm4', value: kpis.mes.solicitacoes, label: 'Solicitações RH' },
              ].map((item) => (
                <View key={item.id} style={styles.gridItem}>
                  <View style={adminStyles.statCard}>
                    <Text style={adminStyles.statCardValue}>{admFormatInt(item.value)}</Text>
                    <Text style={adminStyles.statCardLabel}>{item.label}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={adminStyles.sectionCard}>
              <Text style={adminStyles.sectionTitle}>Novos colaboradores — últimos 6 meses</Text>
              {kpis.serie_novos_colaboradores.length === 0 ? (
                <AdminEmptyState message="Sem dados no período." />
              ) : (
                <View style={adminStyles.monthBarChartRow}>
                  {kpis.serie_novos_colaboradores.map((item) => (
                    <Pressable
                      key={item.mes}
                      style={adminStyles.monthBarGroup}
                      onPress={() =>
                        setSelectedChartMonth((current) => (current === item.mes ? null : item.mes))
                      }
                    >
                      {selectedChartMonth === item.mes ? (
                        <View style={adminStyles.monthBarTooltip}>
                          <Text style={adminStyles.monthBarTooltipMonth}>{item.mes}</Text>
                          <Text style={adminStyles.monthBarTooltipValue}>
                            novos : <Text style={adminStyles.monthBarTooltipValueNumber}>{admFormatInt(item.novos)}</Text>
                          </Text>
                        </View>
                      ) : null}
                      <View
                        style={[
                          adminStyles.monthBar,
                          { height: Math.max(4, (item.novos / maxMonthValue) * chartHeight), backgroundColor: theme.primary },
                        ]}
                      />
                      <Text style={adminStyles.monthBarLabel}>{admShortMonthFromKey(item.mes)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={[adminStyles.sectionCard, adminStyles.lastSectionCard]}>
              <Text style={adminStyles.sectionTitle}>Top unidades</Text>
              {kpis.top_unidades.length === 0 ? (
                <AdminEmptyState message="Nenhuma unidade retornada." />
              ) : (
                kpis.top_unidades.map((item, index) => (
                  <View key={item.unidade} style={adminStyles.rankRow}>
                    <Text style={adminStyles.rankNumber}>{index + 1}</Text>
                    <Text style={adminStyles.rankName} numberOfLines={1}>
                      {item.unidade}
                    </Text>
                    <Text style={adminStyles.rankValue}>{admFormatInt(item.qtd)}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
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
  const [statusFiltro, setStatusFiltro] = useState<'Ativos' | 'Inativos' | 'Todos'>('Ativos');
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);

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
    return usuarios.filter((user) => {
      if (statusFiltro === 'Ativos' && !user.isActive) return false;
      if (statusFiltro === 'Inativos' && user.isActive) return false;
      if (!query) return true;
      return (
        (user.fullName ?? '').toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.cargo ?? '').toLowerCase().includes(query) ||
        (user.unidade ?? '').toLowerCase().includes(query)
      );
    });
  }, [usuarios, search, statusFiltro]);

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
          <Pressable style={adminStyles.filterPill} onPress={() => setIsStatusPickerOpen(true)}>
            <Text style={adminStyles.filterPillText}>{statusFiltro}</Text>
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

      <AdminSimplePickerModal
        visible={isStatusPickerOpen}
        title="Filtrar por status"
        options={['Ativos', 'Inativos', 'Todos']}
        selectedValue={statusFiltro}
        onSelect={(value) => setStatusFiltro(value as 'Ativos' | 'Inativos' | 'Todos')}
        onClose={() => setIsStatusPickerOpen(false)}
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
  const [respContabilidade, setRespContabilidade] = useState<AdminContabilidadeItem | null>(null);

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
    <>
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
                      <Pressable hitSlop={8} style={{ padding: 4 }} onPress={() => setRespContabilidade(item)}>
                        <Feather name="users" size={16} color="#4C5470" />
                      </Pressable>
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

    <AdminContabilidadeResponsaveisModal
      visible={respContabilidade !== null}
      contabilidade={respContabilidade}
      actorId={actorId}
      onClose={() => setRespContabilidade(null)}
    />
    </>
  );
}

// ---------- Modal "Responsáveis" de uma Contabilidade (tabela
// contabilidade_responsaveis, confirmada pela Lovable em 04/08/2026) ----------

type AdminContabilidadeResponsavelFormValues = {
  nome: string;
  email: string;
  telefone: string;
  ativo: boolean;
};

function emptyAdminContabilidadeResponsavelForm(): AdminContabilidadeResponsavelFormValues {
  return { nome: '', email: '', telefone: '', ativo: true };
}

function AdminContabilidadeResponsaveisModal({
  visible,
  contabilidade,
  actorId,
  onClose,
}: {
  visible: boolean;
  contabilidade: AdminContabilidadeItem | null;
  actorId?: string | null;
  onClose: () => void;
}) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [responsaveis, setResponsaveis] = useState<AdminContabilidadeResponsavelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<AdminContabilidadeResponsavelFormValues>(emptyAdminContabilidadeResponsavelForm());
  const [beingEdited, setBeingEdited] = useState<AdminContabilidadeResponsavelItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [liberandoId, setLiberandoId] = useState<string | null>(null);

  const load = () => {
    if (!contabilidade) return Promise.resolve();
    setIsLoading(true);
    setErrorMessage(null);
    return fetchAdminContabilidadeResponsaveis({ contabilidadeId: contabilidade.id, actorId })
      .then((data) => setResponsaveis(data.responsaveis))
      .catch((err) =>
        setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os responsáveis.')
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (visible && contabilidade) {
      setView('list');
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, contabilidade?.id]);

  const handleSubmit = () => {
    if (!contabilidade) return;
    if (!form.nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do responsável.');
      return;
    }
    if (!form.email.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o e-mail do responsável.');
      return;
    }
    const body = {
      contabilidade_id: contabilidade.id,
      nome: form.nome.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim() || null,
      ativo: form.ativo,
    };

    setIsSaving(true);
    const request =
      formMode === 'create'
        ? createAdminContabilidadeResponsavel(body, actorId)
        : updateAdminContabilidadeResponsavel(beingEdited!.id, body, actorId);

    request
      .then(() => {
        setView('list');
        load();
      })
      .catch((err) =>
        showAdminApiError(
          err,
          formMode === 'create' ? 'Não foi possível criar o responsável.' : 'Não foi possível salvar o responsável.'
        )
      )
      .finally(() => setIsSaving(false));
  };

  const handleExcluir = (item: AdminContabilidadeResponsavelItem) => {
    Alert.alert('Excluir responsável', `Tem certeza que quer excluir "${item.nome ?? item.email}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAdminContabilidadeResponsavel(item.id, actorId)
            .then(() => load())
            .catch((err) => showAdminApiError(err, 'Não foi possível excluir o responsável.'));
        },
      },
    ]);
  };

  const handleLiberarAcesso = (item: AdminContabilidadeResponsavelItem) => {
    Alert.alert(
      item.acesso === 'liberado' ? 'Redefinir acesso' : 'Liberar acesso',
      `Isso cria/redefine a senha de acesso de "${item.nome ?? item.email}" ao Portal do Contador com uma senha inicial (o contador será obrigado a trocar no primeiro acesso). Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            setLiberandoId(item.id);
            liberarAcessoAdminContabilidadeResponsavel(item.id, actorId)
              .then((resultado) => {
                Alert.alert(
                  'Acesso liberado',
                  `E-mail: ${resultado.email ?? item.email}\nSenha inicial: ${resultado.senha ?? '—'}\n\nPasse essas credenciais para o responsável. Ele será obrigado a trocar a senha no primeiro acesso.`
                );
                load();
              })
              .catch((err) => showAdminApiError(err, 'Não foi possível liberar o acesso.'))
              .finally(() => setLiberandoId(null));
          },
        },
      ]
    );
  };

  const displayName = contabilidade ? contabilidade.nomeFantasia || contabilidade.razaoSocial || '(sem nome)' : '';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          {view === 'list' ? (
            <>
              <View style={styles.requestModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestModalTitle}>Responsáveis — {displayName}</Text>
                  <Text style={adminStyles.detailSubEmail}>
                    Cada responsável acessa o Portal do Contador com o e-mail cadastrado aqui.
                  </Text>
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
                    setForm(emptyAdminContabilidadeResponsavelForm());
                    setView('form');
                  }}
                >
                  <Feather name="plus" size={15} color="#FFFFFF" />
                  <Text style={styles.directorNotifNewButtonText}>Novo responsável</Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {isLoading ? (
                  <AdminEmptyState message="Carregando responsáveis..." />
                ) : errorMessage ? (
                  <AdminEmptyState message={errorMessage} />
                ) : responsaveis.length === 0 ? (
                  <AdminEmptyState message="Nenhum responsável cadastrado." />
                ) : (
                  responsaveis.map((item) => (
                    <View key={item.id} style={adminStyles.contabRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={adminStyles.listName} numberOfLines={1}>
                          {item.nome || '(sem nome)'}
                          {!item.ativo ? ' · inativo' : ''}
                        </Text>
                        <Text style={adminStyles.listMeta} numberOfLines={1}>
                          {item.email || 'sem e-mail'}
                          {item.telefone ? ` • ${item.telefone}` : ''}
                          {' • Último acesso: '}
                          {formatAdminLogDateTime(item.ultimoAcessoEm)}
                        </Text>
                      </View>
                      <View
                        style={[
                          adminStyles.detailBadgeBase,
                          { backgroundColor: item.acesso === 'liberado' ? GREEN_BG : GRAY_BG, marginRight: 6 },
                        ]}
                      >
                        <Text
                          style={[adminStyles.detailBadgeText, { color: item.acesso === 'liberado' ? GREEN : GRAY }]}
                        >
                          {item.acesso === 'liberado' ? 'Liberado' : 'Sem acesso'}
                        </Text>
                      </View>
                      <Pressable
                        hitSlop={8}
                        style={{ padding: 4, opacity: liberandoId === item.id ? 0.5 : 1 }}
                        disabled={liberandoId === item.id}
                        onPress={() => handleLiberarAcesso(item)}
                      >
                        <Feather name="key" size={16} color="#4C5470" />
                      </Pressable>
                      <Pressable
                        hitSlop={8}
                        style={{ padding: 4 }}
                        onPress={() => {
                          setFormMode('edit');
                          setBeingEdited(item);
                          setForm({
                            nome: item.nome ?? '',
                            email: item.email ?? '',
                            telefone: item.telefone ?? '',
                            ativo: item.ativo,
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
                    {formMode === 'create' ? 'Novo responsável' : `Editar — ${beingEdited?.nome ?? ''}`}
                  </Text>
                  <Text style={adminStyles.detailSubEmail}>Responsáveis — {displayName}</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Feather name="x" size={20} color="#677089" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={adminStyles.formRow}>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Nome</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.nome}
                      onChangeText={(text) => setForm((current) => ({ ...current, nome: text }))}
                      placeholder="Nome do responsável"
                      placeholderTextColor="#A7AEC2"
                    />
                  </View>
                  <View style={adminStyles.formRowItem}>
                    <Text style={[styles.requestFieldLabel, styles.spacingTop]}>E-mail</Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={form.email}
                      onChangeText={(text) => setForm((current) => ({ ...current, email: text }))}
                      placeholder="email@exemplo.com"
                      placeholderTextColor="#A7AEC2"
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Telefone</Text>
                <TextInput
                  style={styles.processTextInput}
                  value={form.telefone}
                  onChangeText={(text) => setForm((current) => ({ ...current, telefone: text }))}
                  placeholder="Opcional"
                  placeholderTextColor="#A7AEC2"
                />

                <View style={[adminStyles.cargoModuleToggleRow, styles.spacingTop]}>
                  <Text style={adminStyles.cargoModuleToggleLabel}>Ativo</Text>
                  <ToggleSwitch
                    value={form.ativo}
                    onValueChange={() => setForm((current) => ({ ...current, ativo: !current.ativo }))}
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
// WhatsApp (sub-abas Conexão/Webhook/Templates Meta) conectado à tabela real
// wa_config (singleton) — confirmado pela Lovable em 30/07/2026, ver rota
// dedicada em admin.js (não passa pela allowlist genérica: guarda token e
// segredo em claro). Janela 24h é só texto informativo (sem banco). Os
// outros 8 provedores (Google, Ponto, Folha, Agentes IA, Busca PF, Jurídico,
// WebPosto, Leva+) a Lovable confirmou que Google/Busca PF/Jurídico/Leva+
// também já têm backend real, mas sem endpoint/schema detalhado ainda —
// seguem "Em breve" até uma próxima rodada; Ponto/Folha/Agentes IA/WebPosto
// são "em breve" de fato, dos dois lados.

type AdminIntegrationProviderKey =
  | 'whatsapp'
  | 'google'
  | 'ponto'
  | 'folha'
  | 'agentes'
  | 'buscapf'
  | 'juridico'
  | 'webposto'
  | 'levamais';

const ADMIN_INTEGRATION_PROVIDERS: Array<{
  key: AdminIntegrationProviderKey;
  label: string;
  icon: FeatherIconName;
  color: string;
}> = [
  { key: 'whatsapp', label: 'WhatsApp', icon: 'message-circle', color: GREEN },
  { key: 'google', label: 'Google', icon: 'star', color: GOLD },
  { key: 'ponto', label: 'Ponto', icon: 'clock', color: GRAY },
  { key: 'folha', label: 'Folha', icon: 'file-text', color: GRAY },
  { key: 'agentes', label: 'Agentes IA', icon: 'cpu', color: BLUE },
  { key: 'buscapf', label: 'Busca PF', icon: 'search', color: BLUE },
  { key: 'juridico', label: 'Jurídico', icon: 'briefcase', color: NAVY },
  { key: 'webposto', label: 'WebPosto', icon: 'video', color: RED },
  { key: 'levamais', label: 'Leva+', icon: 'gift', color: GOLD },
];

type AdminWaSubTabKey = 'conexao' | 'webhook' | 'templates' | 'janela';

const ADMIN_WA_SUBTABS: Array<{ key: AdminWaSubTabKey; label: string }> = [
  { key: 'conexao', label: 'Conexão' },
  { key: 'webhook', label: 'Webhook' },
  { key: 'templates', label: 'Templates Meta' },
  { key: 'janela', label: 'Janela 24h' },
];

const ADMIN_WA_PROVIDER_LABELS: Record<AdminWaProvider, string> = {
  zapresponder: 'ZapResponder (API oficial)',
  meta_cloud: 'Meta Cloud API (direto)',
};

const ADMIN_WA_TEMPLATE_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  APPROVED: { bg: GREEN_BG, color: GREEN },
  PENDING: { bg: GOLD_BG, color: GOLD },
  REJECTED: { bg: RED_BG, color: RED },
};

function adminWaTemplateStatusStyle(status: string | null): { bg: string; color: string } {
  if (!status) return { bg: GRAY_BG, color: GRAY };
  return ADMIN_WA_TEMPLATE_STATUS_STYLE[status.toUpperCase()] ?? { bg: GRAY_BG, color: GRAY };
}

// components (jsonb) segue o formato de componentes de template da Meta:
// [{ type: 'BODY', text: '...' }, { type: 'HEADER', ... }, ...]. Mostra o
// texto do componente BODY como preview; "—" se não conseguir extrair.
function adminWaTemplatePreview(components: unknown): string {
  if (!Array.isArray(components)) return '—';
  for (const item of components) {
    if (item && typeof item === 'object' && 'type' in item && 'text' in item) {
      const type = (item as { type?: unknown }).type;
      const text = (item as { text?: unknown }).text;
      if (typeof type === 'string' && type.toUpperCase() === 'BODY' && typeof text === 'string' && text.trim()) {
        return text;
      }
    }
  }
  return '—';
}

function copyToClipboard(text: string, onDone: () => void) {
  Clipboard.setStringAsync(text)
    .then(onDone)
    .catch(() => Alert.alert('Não foi possível copiar', 'Tente novamente.'));
}

// ---------- Máscaras de formatação (CPF/CNPJ/data) reaproveitadas pelos
// formulários de consulta (Busca PF, Jurídico) — só formatação visual
// enquanto o usuário digita, sem validação de dígito verificador.
type AdminFieldMask = 'cpf' | 'cnpj' | 'date';

function admOnlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function admFormatCpf(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

function admFormatCnpj(digits: string): string {
  const d = digits.slice(0, 14);
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
}

function admFormatDate(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

function admApplyFieldMask(mask: AdminFieldMask | undefined, rawValue: string): string {
  if (!mask) return rawValue;
  const digits = admOnlyDigits(rawValue);
  if (mask === 'cpf') return admFormatCpf(digits);
  if (mask === 'cnpj') return admFormatCnpj(digits);
  return admFormatDate(digits);
}

function admFieldMaskMaxLength(mask: AdminFieldMask | undefined): number | undefined {
  if (mask === 'cpf') return 14; // 000.000.000-00
  if (mask === 'cnpj') return 18; // 00.000.000/0000-00
  if (mask === 'date') return 10; // DD/MM/AAAA
  return undefined;
}

function admFormatBRL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

// ---------- Dashboard: helpers de formatação (dados reais via
// adm_plataforma_performance_internal/adm_dashboard_kpis_internal,
// confirmados pelo Lovable em 03/08/2026) ----------

function admFormatInt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const isNegative = value < 0;
  const digits = String(Math.round(Math.abs(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-${digits}` : digits;
}

function admFormatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Math.abs(bytes);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function admFormatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

const ADMIN_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const ADMIN_MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function admMonthLabel(mes: number | null | undefined, ano: number | null | undefined): string {
  if (!mes || !ano) return '—';
  const name = ADMIN_MONTH_NAMES[(mes - 1 + 12) % 12] ?? '';
  return `${name} / ${ano}`;
}

// serie_novos_colaboradores vem como "2026-03" (sempre relativa a hoje,
// ignora o mês selecionado — confirmado pelo Lovable).
function admShortMonthFromKey(key: string): string {
  const mesPart = key.split('-')[1];
  const m = mesPart ? parseInt(mesPart, 10) : NaN;
  if (Number.isNaN(m)) return key;
  return ADMIN_MONTH_SHORT[(m - 1 + 12) % 12] ?? key;
}

// ---------- Busca PF (Infosimples/Fonte Data) — estrutura da tela igual ao
// web (screenshots de 30/07/2026). Backend real confirmado pela Lovable em
// 30/07/2026: endpoint único /api/public/internal/busca-pf (recurso=status/
// historico/uso, acao=testar/consultar). Sem tabela de credenciais — os
// tokens são secrets do backend deles (INFOSIMPLES_TOKEN/FONTEDATA_API_KEY).
// Os nomes de campo (key) dos serviços abaixo já são os parâmetros reais
// esperados pela API (birthdate, nome, nome_mae, etc).

type AdminBuscaPfSubProvider = 'infosimples' | 'fontedata';

// Tipos genéricos reaproveitados também pelo Jurídico (Datajud) — mesma forma
// de campo/serviço/consulta, só muda o conteúdo.
type AdminIntegrationServiceField = {
  key: string;
  label: string;
  required?: boolean;
  mask?: AdminFieldMask;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
};

type AdminIntegrationService = {
  code: string;
  title: string;
  description: string;
  fields: AdminIntegrationServiceField[];
  defaultExpanded?: boolean;
  extraActionLabel?: string;
};

// Nomes de campo (chave) já batem com os parâmetros REAIS da API, confirmados
// pela Lovable em 30/07/2026 — a chave de cada campo é enviada direto como
// parâmetro na hora de "Executar consulta" (ver handleExecuteBuscaPf).
const ADMIN_BUSCAPF_INFOSIMPLES_SERVICES: AdminIntegrationService[] = [
  {
    code: 'receita-federal/cpf',
    title: 'Receita Federal — CPF',
    description: 'Consulta dados cadastrais e situação fiscal do CPF na Receita Federal.',
    fields: [
      { key: 'cpf', label: 'CPF', required: true, mask: 'cpf', placeholder: '000.000.000-00' },
      { key: 'birthdate', label: 'Data de nascimento', required: true, mask: 'date', placeholder: 'DD/MM/AAAA' },
    ],
  },
  {
    code: 'antecedentes-criminais/pf/emit',
    title: 'Antecedentes Criminais — Polícia Federal',
    description: 'Emite a Certidão de Antecedentes Criminais na Polícia Federal.',
    fields: [
      { key: 'nome', label: 'Nome completo', required: true, placeholder: 'Nome conforme RG' },
      { key: 'birthdate', label: 'Data de nascimento', required: true, mask: 'date', placeholder: 'DD/MM/AAAA' },
      { key: 'cpf', label: 'CPF (opcional)', mask: 'cpf', placeholder: '000.000.000-00' },
      { key: 'nome_mae', label: 'Nome da mãe (opcional)' },
      { key: 'nome_pai', label: 'Nome do pai (opcional)' },
      { key: 'uf_nascimento', label: 'UF de nascimento (opcional)', placeholder: 'Ex: SP' },
    ],
  },
  {
    code: 'tribunal/trf2/certidao',
    title: 'TRF2 — Certidão Negativa Cível e Criminal',
    description: 'Emite certidão no TRF2 (RJ e ES). Informar CPF ou CNPJ.',
    fields: [
      {
        key: 'tipo_certidao',
        label: 'Tipo de certidão',
        required: true,
        options: ['Cível', 'Eleitoral', 'Criminal'],
      },
      { key: 'cpf', label: 'CPF (PF)', mask: 'cpf', placeholder: '000.000.000-00' },
      { key: 'birthdate', label: 'Data de nascimento (PF)', mask: 'date', placeholder: 'DD/MM/AAAA' },
      { key: 'cnpj', label: 'CNPJ (PJ)', mask: 'cnpj', placeholder: '00.000.000/0000-00' },
    ],
  },
  {
    code: 'cnis/pre-inscricao',
    title: 'CNIS — Pré-inscrição (PIS/NIT/NIS)',
    description: 'Consulta a inscrição (PIS/NIT/NIS) de uma pessoa física no CNIS.',
    fields: [
      { key: 'cpf', label: 'CPF', required: true, mask: 'cpf', placeholder: '000.000.000-00' },
      { key: 'nome', label: 'Nome completo', required: true },
      { key: 'birthdate', label: 'Data de nascimento', required: true, mask: 'date', placeholder: 'DD/MM/AAAA' },
      { key: 'nome_mae', label: 'Nome da mãe', required: true },
    ],
  },
];

// "tipo_certidao" é o único campo de opções que a API espera como código
// numérico em string, não o texto da label.
const ADMIN_TRF2_TIPO_CERTIDAO_CODES: Record<string, string> = {
  Cível: '1',
  Eleitoral: '2',
  Criminal: '3',
};

// Fonte Data — só CPF, 3 serviços (confirmados pela Lovable em 30/07/2026).
const ADMIN_BUSCAPF_FONTEDATA_SERVICES: AdminIntegrationService[] = [
  {
    code: 'dados-cadastrais-basicos',
    title: 'Dados Cadastrais Básicos (CPF)',
    description: 'Nome completo, CPF, data de nascimento e filiação cruzando fontes oficiais. Custo: R$ 0,22/consulta.',
    fields: [{ key: 'cpf', label: 'CPF', required: true, mask: 'cpf', placeholder: '000.000.000-00' }],
  },
  {
    code: 'cadastro-rf-pf',
    title: 'Cadastro Pessoal com Receita Federal',
    description:
      'Combina dados cadastrais de CPF com situação na Receita Federal (regular, suspensa, cancelada etc). Retorna nome, nascimento, endereço, status RF e óbito em uma única chamada.',
    fields: [{ key: 'cpf', label: 'CPF', required: true, mask: 'cpf', placeholder: '000.000.000-00' }],
  },
  {
    code: 'ccd-pf',
    title: 'Certidão Conjunta de Débitos — PF',
    description:
      'Comprova a inexistência de pendências financeiras, civis ou criminais em âmbitos federal, estadual e municipal. Custo: R$ 0,54/consulta.',
    fields: [{ key: 'cpf', label: 'CPF', required: true, mask: 'cpf', placeholder: '000.000.000-00' }],
  },
];

// ---------- Jurídico (Datajud CNJ + Infosimples — TJRJ) — estrutura igual ao
// web (screenshots de 30/07/2026). Datajud é a API pública/gratuita do CNJ
// (não exige credencial secreta — a APIKey é embutida e pública); os 3
// serviços abaixo têm os campos reais do web, mas os botões (Executar
// consulta, Testar conexão, Histórico, Tabela de classes, Documentação)
// mostram aviso honesto até existir a rota proxy no af360-api. Infosimples —
// TJRJ ainda não tem nenhum screenshot/detalhe — fica como placeholder leve.

type AdminJuridicoSubProvider = 'datajud' | 'infosimples_tjrj';

const ADMIN_DATAJUD_TRIBUNAL_OPTIONS = ['TJRJ — Rio de Janeiro', 'TRT 1ª (RJ)'];

const ADMIN_JURIDICO_DATAJUD_SERVICES: AdminIntegrationService[] = [
  {
    code: 'processo-por-numero',
    title: 'Processo por número (CNJ)',
    description:
      'Localiza um processo específico em um tribunal pelo número do CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO). Retorna classe, assuntos, órgão julgador, dataAjuizamento e movimentos.',
    defaultExpanded: true,
    fields: [
      { key: 'tribunal', label: 'Tribunal', required: true, options: ADMIN_DATAJUD_TRIBUNAL_OPTIONS, defaultValue: 'TJRJ — Rio de Janeiro' },
      { key: 'numeroProcesso', label: 'Número do processo (CNJ)', required: true, placeholder: '0000000-00.0000.0.00.0000' },
    ],
  },
  {
    code: 'processos-por-classe',
    title: 'Processos por classe processual',
    description:
      'Lista processos de uma classe específica em um tribunal (ex.: classe 1116 = Procedimento Comum Cível). Útil para mapear volume e amostragem.',
    defaultExpanded: true,
    extraActionLabel: 'Tabela de classes (CNJ)',
    fields: [
      { key: 'tribunal', label: 'Tribunal', required: true, options: ADMIN_DATAJUD_TRIBUNAL_OPTIONS, defaultValue: 'TRT 1ª (RJ)' },
      { key: 'codigoClasse', label: 'Código da classe', required: true, placeholder: 'Ex.: 1116' },
      { key: 'limite', label: 'Limite de resultados', placeholder: '10', defaultValue: '10' },
    ],
  },
  {
    code: 'ultimos-do-orgao-julgador',
    title: 'Últimos processos de um órgão julgador',
    description: 'Lista os processos mais recentes de uma vara/órgão (código do órgão julgador). Útil para acompanhar atividade.',
    defaultExpanded: true,
    fields: [
      { key: 'tribunal', label: 'Tribunal', required: true, options: ADMIN_DATAJUD_TRIBUNAL_OPTIONS, defaultValue: 'TRT 1ª (RJ)' },
      { key: 'codigoOrgaoJulgador', label: 'Código do órgão julgador', required: true, placeholder: 'Ex.: 13597' },
      { key: 'limite', label: 'Limite de resultados', placeholder: '10', defaultValue: '10' },
    ],
  },
];

// ---------- Componente compartilhado (Busca PF + Jurídico): card de serviço
// expansível com formulário local (sem persistência real ainda) e botão(ões)
// de ação honestos. ----------
function AdminIntegrationServiceCard({
  service,
  expanded,
  onToggleExpand,
  values,
  onChangeField,
  onExecute,
  onExtraAction,
  isExecuting,
  result,
}: {
  service: AdminIntegrationService;
  expanded: boolean;
  onToggleExpand: () => void;
  values: Record<string, string>;
  onChangeField: (fieldKey: string, value: string) => void;
  onExecute: () => void;
  onExtraAction?: () => void;
  isExecuting?: boolean;
  result?: { ok: boolean; message: string };
}) {
  return (
    <View style={[adminStyles.sectionCard, adminStyles.fieldSpacing]}>
      <Pressable style={adminStyles.serviceCardHeaderRow} onPress={onToggleExpand} hitSlop={4}>
        <Feather name={expanded ? 'chevron-down' : 'chevron-right'} size={16} color="#677089" style={{ marginTop: 3 }} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={adminStyles.sectionTitle}>{service.title}</Text>
          <Text style={adminStyles.integrationDescription}>{service.description}</Text>
          <Text style={adminStyles.serviceCardCode}>{service.code}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={adminStyles.fieldSpacing}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {service.fields.map((field) => {
              const currentValue = values[field.key] ?? field.defaultValue ?? '';
              return (
                <View key={field.key} style={{ minWidth: 160, flexGrow: 1 }}>
                  <Text style={adminStyles.fieldLabel}>
                    {field.label}
                    {field.required ? <Text style={{ color: '#D93A3A' }}> *</Text> : null}
                  </Text>
                  {field.options ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {field.options.map((opt) => {
                        const selected = (currentValue || field.options?.[0]) === opt;
                        return (
                          <Pressable
                            key={opt}
                            onPress={() => onChangeField(field.key, opt)}
                            style={[adminStyles.subProviderPill, selected ? adminStyles.subProviderPillActive : null]}
                          >
                            <Text style={[adminStyles.subProviderPillText, selected ? adminStyles.subProviderPillTextActive : null]}>
                              {opt}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <TextInput
                      style={[styles.processTextInput, { marginTop: 6 }]}
                      value={currentValue}
                      onChangeText={(text) => onChangeField(field.key, admApplyFieldMask(field.mask, text))}
                      placeholder={field.placeholder}
                      placeholderTextColor="#A7AEC2"
                      keyboardType={field.mask ? 'numeric' : 'default'}
                      maxLength={admFieldMaskMaxLength(field.mask)}
                    />
                  )}
                </View>
              );
            })}
          </View>

          <View style={adminStyles.pillButtonRow}>
            <Pressable
              style={[adminStyles.pillButtonPrimary, isExecuting ? { opacity: 0.6 } : null]}
              onPress={onExecute}
              disabled={isExecuting}
            >
              <Feather name="play" size={13} color="#FFFFFF" />
              <Text style={adminStyles.primaryButtonGreenText}>
                {isExecuting ? 'Consultando...' : 'Executar consulta'}
              </Text>
            </Pressable>
            {service.extraActionLabel && onExtraAction ? (
              <Pressable style={adminStyles.pillButtonOutline} onPress={onExtraAction}>
                <Text style={adminStyles.outlineButtonText}>{service.extraActionLabel}</Text>
              </Pressable>
            ) : null}
          </View>

          {result ? (
            <View
              style={[
                adminStyles.integrationInfoBox,
                adminStyles.fieldSpacing,
                { backgroundColor: result.ok ? '#E7F5EC' : '#FBEAEA' },
              ]}
            >
              <Feather name={result.ok ? 'check-circle' : 'alert-triangle'} size={15} color={result.ok ? GREEN : '#C0392B'} />
              <Text style={[adminStyles.integrationInfoText, { color: result.ok ? '#1E5B36' : '#8A2E24' }]}>
                {result.message}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ---------- Painel de um provedor da Busca PF (Infosimples ou Fonte Data) —
// credenciais + serviços + uso, tudo com dado real (endpoint /busca-pf
// confirmado pela Lovable em 30/07/2026). Um componente só, reaproveitado
// pelos dois provedores pra não duplicar a mesma estrutura duas vezes. ----------
function AdminBuscaPfProviderPanel({
  provedor,
  services,
  status,
  isLoadingStatus,
  statusError,
  isTesting,
  onTestConnection,
  expandedServices,
  onToggleExpand,
  fieldValues,
  onChangeField,
  onExecute,
  executingServiceCode,
  results,
  onOpenHistorico,
  uso,
  isLoadingUso,
  usoError,
  onRefreshUso,
}: {
  provedor: AdminBuscaPfProvider;
  services: AdminIntegrationService[];
  status: AdminBuscaPfStatus | null;
  isLoadingStatus: boolean;
  statusError: string | null;
  isTesting: boolean;
  onTestConnection: () => void;
  expandedServices: Record<string, boolean>;
  onToggleExpand: (serviceCode: string, defaultExpanded: boolean) => void;
  fieldValues: Record<string, string>;
  onChangeField: (serviceCode: string, fieldKey: string, value: string) => void;
  onExecute: (service: AdminIntegrationService) => void;
  executingServiceCode: string | null;
  results: Record<string, { ok: boolean; message: string }>;
  onOpenHistorico: () => void;
  uso: AdminBuscaPfUso | undefined;
  isLoadingUso: boolean | undefined;
  usoError: string | undefined;
  onRefreshUso: () => void;
}) {
  const providerStatus = status?.credenciais?.[provedor];
  const porServicoEntries = Object.entries(uso?.porServico ?? {});

  return (
    <>
      <View style={[adminStyles.sectionCard, adminStyles.fieldSpacing]}>
        <Text style={adminStyles.sectionTitle}>Credenciais</Text>

        {isLoadingStatus ? (
          <ActivityIndicator color={NAVY} style={adminStyles.fieldSpacing} />
        ) : statusError ? (
          <View style={adminStyles.fieldSpacing}>
            <AdminEmptyState message={statusError} />
          </View>
        ) : (
          <>
            <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>
              TOKEN {provedor === 'infosimples' ? 'INFOSIMPLES' : 'FONTE DATA'}
            </Text>
            <View style={adminStyles.staticField}>
              <Text style={adminStyles.staticFieldText} numberOfLines={1}>
                {providerStatus?.tokenMascarado ?? 'Guardado como secret no backend (não é exibido).'}
              </Text>
              <AdminColorPill
                label={providerStatus?.configurado ? 'Configurado' : 'Não configurado'}
                bg={providerStatus?.configurado ? '#E7F5EC' : '#FBEAEA'}
                color={providerStatus?.configurado ? '#1E8A4C' : '#C0392B'}
              />
            </View>

            <View style={adminStyles.pillButtonRow}>
              <Pressable
                style={[adminStyles.pillButtonOutline, isTesting ? { opacity: 0.6 } : null]}
                onPress={onTestConnection}
                disabled={isTesting}
              >
                <Feather name="check-circle" size={14} color="#15203E" />
                <Text style={adminStyles.outlineButtonText}>{isTesting ? 'Testando...' : 'Testar conexão'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <View style={adminStyles.headerRowWrap}>
        <View style={adminStyles.headerRowTitleWrap}>
          <Text style={adminStyles.sectionTitle}>Consultas disponíveis</Text>
          <AdminColorPill label={`${services.length} serviços`} bg={BLUE_BG} color={BLUE} />
        </View>
        <Pressable style={adminStyles.pillButtonOutline} onPress={onOpenHistorico}>
          <Feather name="clock" size={14} color="#15203E" />
          <Text style={adminStyles.outlineButtonText}>Histórico</Text>
        </Pressable>
      </View>

      {services.map((service) => (
        <AdminIntegrationServiceCard
          key={service.code}
          service={service}
          expanded={expandedServices[service.code] ?? service.defaultExpanded ?? false}
          onToggleExpand={() => onToggleExpand(service.code, service.defaultExpanded ?? false)}
          values={Object.fromEntries(
            Object.entries(fieldValues)
              .filter(([k]) => k.startsWith(`${service.code}::`))
              .map(([k, v]) => [k.slice(service.code.length + 2), v])
          )}
          onChangeField={(fieldKey, value) => onChangeField(service.code, fieldKey, value)}
          onExecute={() => onExecute(service)}
          isExecuting={executingServiceCode === service.code}
          result={results[service.code]}
        />
      ))}

      <View style={[adminStyles.sectionCard, adminStyles.fieldSpacing]}>
        <View style={adminStyles.headerRowWrap}>
          <View style={adminStyles.headerRowTitleWrap}>
            <Text style={adminStyles.sectionTitle}>Uso e custo mensal</Text>
          </View>
          <Pressable
            style={[adminStyles.pillButtonOutline, isLoadingUso ? { opacity: 0.6 } : null]}
            onPress={onRefreshUso}
            disabled={!!isLoadingUso}
          >
            <Feather name="refresh-cw" size={14} color="#15203E" />
            <Text style={adminStyles.outlineButtonText}>{isLoadingUso ? 'Atualizando...' : 'Atualizar'}</Text>
          </Pressable>
        </View>

        {isLoadingUso && !uso ? (
          <ActivityIndicator color={NAVY} />
        ) : usoError ? (
          <AdminEmptyState message={usoError} />
        ) : uso ? (
          <>
            <View style={adminStyles.staticField}>
              <Text style={adminStyles.staticFieldText}>Consultas no período</Text>
              <Text style={adminStyles.gmbLinkText}>{uso.total ?? 0}</Text>
            </View>
            <View style={[adminStyles.staticField, adminStyles.fieldSpacing]}>
              <Text style={adminStyles.staticFieldText}>
                {uso.custoTotalComFranquia != null ? 'Custo total (com franquia)' : 'Custo total'}
              </Text>
              <Text style={adminStyles.gmbLinkText}>
                {admFormatBRL(uso.custoTotalComFranquia ?? uso.custoTotal)}
              </Text>
            </View>
            {uso.balanceRemaining != null ? (
              <View style={[adminStyles.staticField, adminStyles.fieldSpacing]}>
                <Text style={adminStyles.staticFieldText}>Saldo restante</Text>
                <Text style={adminStyles.gmbLinkText}>{admFormatBRL(uso.balanceRemaining)}</Text>
              </View>
            ) : null}
            {porServicoEntries.length > 0 ? (
              <View style={adminStyles.fieldSpacing}>
                <Text style={adminStyles.fieldLabel}>POR SERVIÇO</Text>
                {porServicoEntries.map(([svc, info]) => (
                  <View key={svc} style={[adminStyles.staticField, { marginTop: 6 }]}>
                    <Text style={adminStyles.staticFieldText} numberOfLines={1}>
                      {svc}
                    </Text>
                    <Text style={adminStyles.gmbLinkText}>
                      {info.count ?? 0} · {admFormatBRL(info.custo)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <AdminEmptyState message="Nenhuma consulta registrada neste período." />
        )}
      </View>
    </>
  );
}

export function AdminIntegracoesScreen({ navigation }: ScreenProps<'AdminIntegracoes'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;

  const [activeProvider, setActiveProvider] = useState<AdminIntegrationProviderKey>('whatsapp');
  const [activeWaSubTab, setActiveWaSubTab] = useState<AdminWaSubTabKey>('conexao');

  const [waConfig, setWaConfig] = useState<AdminWaConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Conexão — formulário local, inicializado a partir de waConfig ao carregar.
  const [providerForm, setProviderForm] = useState<AdminWaProvider>('zapresponder');
  const [enabledForm, setEnabledForm] = useState(true);
  const [apiUrlForm, setApiUrlForm] = useState('');
  const [departmentIdForm, setDepartmentIdForm] = useState('');
  // Campo único "API Token" (mesma nomenclatura do web) — pré-preenchido com
  // o valor mascarado que o backend manda; só vira um valor novo de verdade
  // se a pessoa realmente editar (apiTokenEdited). O backend NUNCA devolve o
  // token completo (confirmado testando reveal=1 em produção em 30/07/2026 —
  // só webhook_secret/webhook_url são revelados), então não tem como
  // pré-preencher com o valor real.
  const [apiTokenField, setApiTokenField] = useState('');
  const [apiTokenEdited, setApiTokenEdited] = useState(false);
  const [metaBusinessIdForm, setMetaBusinessIdForm] = useState('');
  const [metaPhoneNumberIdForm, setMetaPhoneNumberIdForm] = useState('');
  const [metaAccessTokenField, setMetaAccessTokenField] = useState('');
  const [metaAccessTokenEdited, setMetaAccessTokenEdited] = useState(false);
  const [isProviderPickerOpen, setIsProviderPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Webhook + tokens completos — revelados juntos numa única chamada (exige
  // actorId master) e mantidos em memória; o "olho" só mascara/desmascara
  // localmente o que já foi revelado.
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [revealedUrl, setRevealedUrl] = useState<string | null>(null);
  const [revealedApiToken, setRevealedApiToken] = useState<string | null>(null);
  const [revealedMetaAccessToken, setRevealedMetaAccessToken] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [isApiTokenVisible, setIsApiTokenVisible] = useState(false);
  const [isMetaTokenVisible, setIsMetaTokenVisible] = useState(false);
  const [justCopiedUrl, setJustCopiedUrl] = useState(false);
  const [justCopiedSecret, setJustCopiedSecret] = useState(false);
  const [justCopiedApiToken, setJustCopiedApiToken] = useState(false);
  const [justCopiedMetaToken, setJustCopiedMetaToken] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Templates Meta
  const [diagnosticoTelefone, setDiagnosticoTelefone] = useState('');
  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);
  const [testingTemplateKey, setTestingTemplateKey] = useState<string | null>(null);

  // Busca PF (Infosimples/Fonte Data) — sem persistência real ainda; guarda
  // os valores dos formulários dos serviços localmente enquanto a Lovable
  // não confirma os endpoints de execução/histórico/uso.
  const [activeBuscaPfSubProvider, setActiveBuscaPfSubProvider] = useState<AdminBuscaPfSubProvider>('infosimples');
  const [expandedBuscaPfServices, setExpandedBuscaPfServices] = useState<Record<string, boolean>>({});
  const [buscaPfFieldValues, setBuscaPfFieldValues] = useState<Record<string, string>>({});

  // Jurídico (Datajud CNJ + Infosimples — TJRJ) — mesma lógica.
  const [activeJuridicoSubProvider, setActiveJuridicoSubProvider] = useState<AdminJuridicoSubProvider>('datajud');
  const [expandedJuridicoServices, setExpandedJuridicoServices] = useState<Record<string, boolean>>({});
  const [juridicoFieldValues, setJuridicoFieldValues] = useState<Record<string, string>>({});

  // Google Meu Negócio (gmb_config/gmb_locations) — schema e endpoints
  // confirmados pela Lovable em 30/07/2026. Carrega só quando a aba é
  // aberta (lazy), igual ao padrão do reveal do WhatsApp.
  const [gmbData, setGmbData] = useState<AdminGmbData | null>(null);
  const [isLoadingGmb, setIsLoadingGmb] = useState(false);
  const [gmbError, setGmbError] = useState<string | null>(null);
  const [isSyncingGmb, setIsSyncingGmb] = useState(false);
  const [isDisconnectingGmb, setIsDisconnectingGmb] = useState(false);
  const [linkingLocation, setLinkingLocation] = useState<AdminGmbLocation | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkOptions, setLinkOptions] = useState<AdminUnidadeItem[]>([]);
  const [isLinkSearching, setIsLinkSearching] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);

  const loadGmb = useCallback(() => {
    setIsLoadingGmb(true);
    setGmbError(null);
    fetchAdminGmb({ limit: 200, actorId })
      .then(setGmbData)
      .catch((err) => setGmbError(err instanceof Error ? err.message : 'Não foi possível carregar o Google Meu Negócio.'))
      .finally(() => setIsLoadingGmb(false));
  }, [actorId]);

  useEffect(() => {
    if (activeProvider === 'google' && !gmbData && !isLoadingGmb && !gmbError) {
      loadGmb();
    }
  }, [activeProvider, gmbData, isLoadingGmb, gmbError, loadGmb]);

  const handleSyncGmb = useCallback(() => {
    setIsSyncingGmb(true);
    sincronizarAdminGmb(actorId)
      .then(() => loadGmb())
      .catch((err) => Alert.alert('Erro ao sincronizar', err instanceof Error ? err.message : 'Tente novamente.'))
      .finally(() => setIsSyncingGmb(false));
  }, [actorId, loadGmb]);

  const handleDisconnectGmb = useCallback(() => {
    Alert.alert(
      'Desconectar Google Meu Negócio?',
      'Isso remove a conexão com a conta Google. É possível reconectar depois.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: () => {
            setIsDisconnectingGmb(true);
            desconectarAdminGmb(actorId)
              .then(() => loadGmb())
              .catch((err) => Alert.alert('Erro ao desconectar', err instanceof Error ? err.message : 'Tente novamente.'))
              .finally(() => setIsDisconnectingGmb(false));
          },
        },
      ]
    );
  }, [actorId, loadGmb]);

  const openGmbLinkModal = useCallback((location: AdminGmbLocation) => {
    setLinkingLocation(location);
    setLinkSearch('');
    setLinkOptions([]);
  }, []);

  useEffect(() => {
    if (!linkingLocation) return;
    setIsLinkSearching(true);
    const handle = setTimeout(() => {
      fetchAdminUnidades(linkSearch || undefined)
        .then((res) => setLinkOptions(res.unidades.slice(0, 30)))
        .catch(() => setLinkOptions([]))
        .finally(() => setIsLinkSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [linkingLocation, linkSearch]);

  const handleSelectGmbLink = useCallback(
    (empresaId: string | null) => {
      if (!linkingLocation) return;
      setIsSavingLink(true);
      vincularAdminGmbLocation({ locationId: linkingLocation.id, empresaId }, actorId)
        .then(() => {
          setLinkingLocation(null);
          loadGmb();
        })
        .catch((err) => Alert.alert('Erro ao vincular', err instanceof Error ? err.message : 'Tente novamente.'))
        .finally(() => setIsSavingLink(false));
    },
    [linkingLocation, actorId, loadGmb]
  );

  // Busca PF (Infosimples + Fonte Data) — endpoint /busca-pf confirmado pela
  // Lovable em 30/07/2026. Sem tabela de credenciais (tokens são secrets do
  // backend deles) — status só diz configurado/não.
  const [buscaPfStatus, setBuscaPfStatus] = useState<AdminBuscaPfStatus | null>(null);
  const [isLoadingBuscaPfStatus, setIsLoadingBuscaPfStatus] = useState(false);
  const [buscaPfStatusError, setBuscaPfStatusError] = useState<string | null>(null);
  const [testingBuscaPfProvider, setTestingBuscaPfProvider] = useState<AdminBuscaPfProvider | null>(null);
  const [executingBuscaPfServiceCode, setExecutingBuscaPfServiceCode] = useState<string | null>(null);
  const [buscaPfResults, setBuscaPfResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [buscaPfHistoricoProvider, setBuscaPfHistoricoProvider] = useState<AdminBuscaPfProvider | null>(null);
  const [buscaPfHistoricoRows, setBuscaPfHistoricoRows] = useState<AdminBuscaPfHistoricoItem[] | null>(null);
  const [isLoadingBuscaPfHistorico, setIsLoadingBuscaPfHistorico] = useState(false);
  const [buscaPfHistoricoError, setBuscaPfHistoricoError] = useState<string | null>(null);
  const [buscaPfUso, setBuscaPfUso] = useState<Partial<Record<AdminBuscaPfProvider, AdminBuscaPfUso>>>({});
  const [isLoadingBuscaPfUso, setIsLoadingBuscaPfUso] = useState<Partial<Record<AdminBuscaPfProvider, boolean>>>({});
  const [buscaPfUsoError, setBuscaPfUsoError] = useState<Partial<Record<AdminBuscaPfProvider, string | undefined>>>({});

  const loadBuscaPfStatus = useCallback(() => {
    setIsLoadingBuscaPfStatus(true);
    setBuscaPfStatusError(null);
    fetchAdminBuscaPfStatus(actorId)
      .then(setBuscaPfStatus)
      .catch((err) => setBuscaPfStatusError(err instanceof Error ? err.message : 'Não foi possível carregar o status.'))
      .finally(() => setIsLoadingBuscaPfStatus(false));
  }, [actorId]);

  useEffect(() => {
    if (activeProvider === 'buscapf' && !buscaPfStatus && !isLoadingBuscaPfStatus && !buscaPfStatusError) {
      loadBuscaPfStatus();
    }
  }, [activeProvider, buscaPfStatus, isLoadingBuscaPfStatus, buscaPfStatusError, loadBuscaPfStatus]);

  const loadBuscaPfUso = useCallback(
    (provedor: AdminBuscaPfProvider) => {
      setIsLoadingBuscaPfUso((prev) => ({ ...prev, [provedor]: true }));
      setBuscaPfUsoError((prev) => ({ ...prev, [provedor]: undefined }));
      fetchAdminBuscaPfUso({ provedor, months: 1, actorId })
        .then((data) => setBuscaPfUso((prev) => ({ ...prev, [provedor]: data })))
        .catch((err) =>
          setBuscaPfUsoError((prev) => ({
            ...prev,
            [provedor]: err instanceof Error ? err.message : 'Não foi possível carregar o uso.',
          }))
        )
        .finally(() => setIsLoadingBuscaPfUso((prev) => ({ ...prev, [provedor]: false })));
    },
    [actorId]
  );

  useEffect(() => {
    if (activeProvider !== 'buscapf') return;
    const provedor = activeBuscaPfSubProvider;
    if (!buscaPfUso[provedor] && !isLoadingBuscaPfUso[provedor] && !buscaPfUsoError[provedor]) {
      loadBuscaPfUso(provedor);
    }
  }, [activeProvider, activeBuscaPfSubProvider, buscaPfUso, isLoadingBuscaPfUso, buscaPfUsoError, loadBuscaPfUso]);

  const handleTestBuscaPf = useCallback(
    (provedor: AdminBuscaPfProvider) => {
      setTestingBuscaPfProvider(provedor);
      testAdminBuscaPfConexao(provedor, actorId)
        .then((result) => {
          const parts: string[] = [];
          const r = result as Record<string, unknown>;
          if (typeof r.configurado !== 'undefined') {
            parts.push(r.configurado ? 'Token configurado.' : 'Token não configurado.');
          }
          if (typeof r.status !== 'undefined') parts.push(`Status: ${String(r.status)}`);
          if (typeof r.balance_remaining !== 'undefined') parts.push(`Saldo restante: ${String(r.balance_remaining)}`);
          Alert.alert('Conexão testada', parts.length ? parts.join('\n') : 'OK.');
        })
        .catch((err) => Alert.alert('Erro ao testar conexão', err instanceof Error ? err.message : 'Tente novamente.'))
        .finally(() => setTestingBuscaPfProvider(null));
    },
    [actorId]
  );

  const handleExecuteBuscaPf = useCallback(
    (provedor: AdminBuscaPfProvider, service: AdminIntegrationService, values: Record<string, string>) => {
      const params: Record<string, string> = {};
      service.fields.forEach((field) => {
        const raw = values[field.key];
        if (!raw) return;
        params[field.key] = field.key === 'tipo_certidao' ? ADMIN_TRF2_TIPO_CERTIDAO_CODES[raw] ?? raw : raw;
      });
      const missing = service.fields.filter((f) => f.required && !params[f.key]);
      if (missing.length > 0) {
        Alert.alert('Preencha os campos obrigatórios', missing.map((f) => f.label).join(', '));
        return;
      }
      setExecutingBuscaPfServiceCode(service.code);
      executarAdminBuscaPfConsulta({ provedor, service: service.code, params }, actorId)
        .then((res) => {
          const resultado = (res.resultado ?? {}) as Record<string, unknown>;
          const message = String(resultado.code_message ?? resultado.message ?? 'Consulta realizada com sucesso.');
          setBuscaPfResults((prev) => ({ ...prev, [service.code]: { ok: true, message } }));
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'Tente novamente.';
          setBuscaPfResults((prev) => ({ ...prev, [service.code]: { ok: false, message } }));
        })
        .finally(() => setExecutingBuscaPfServiceCode(null));
    },
    [actorId]
  );

  const openBuscaPfHistorico = useCallback(
    (provedor: AdminBuscaPfProvider) => {
      setBuscaPfHistoricoProvider(provedor);
      setBuscaPfHistoricoRows(null);
      setIsLoadingBuscaPfHistorico(true);
      setBuscaPfHistoricoError(null);
      fetchAdminBuscaPfHistorico({ provedor, limit: 20, actorId })
        .then((res) => setBuscaPfHistoricoRows(res.rows))
        .catch((err) =>
          setBuscaPfHistoricoError(err instanceof Error ? err.message : 'Não foi possível carregar o histórico.')
        )
        .finally(() => setIsLoadingBuscaPfHistorico(false));
    },
    [actorId]
  );

  const applyConfig = useCallback((config: AdminWaConfig) => {
    setWaConfig(config);
    setProviderForm(config.provider ?? 'zapresponder');
    setEnabledForm(config.enabled);
    setApiUrlForm(config.apiUrl ?? '');
    setDepartmentIdForm(config.departmentId ?? '');
    setApiTokenField(config.apiTokenMasked ?? '');
    setApiTokenEdited(false);
    setMetaBusinessIdForm(config.metaBusinessId ?? '');
    setMetaPhoneNumberIdForm(config.metaPhoneNumberId ?? '');
    setMetaAccessTokenField(config.metaAccessTokenMasked ?? '');
    setMetaAccessTokenEdited(false);
    // Config mudou (recarregou ou acabou de salvar) — qualquer valor
    // revelado antes fica obsoleto.
    setRevealedSecret(null);
    setRevealedUrl(null);
    setRevealedApiToken(null);
    setRevealedMetaAccessToken(null);
    setRevealError(null);
    setIsSecretVisible(false);
    setIsApiTokenVisible(false);
    setIsMetaTokenVisible(false);
  }, []);

  const loadConfig = useCallback(() => {
    setIsLoadingConfig(true);
    setConfigError(null);
    fetchAdminWaConfig({ actorId })
      .then(applyConfig)
      .catch((err) => setConfigError(err instanceof Error ? err.message : 'Não foi possível carregar a integração.'))
      .finally(() => setIsLoadingConfig(false));
  }, [actorId, applyConfig]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  type AdminWaRevealed = {
    secret: string | null;
    url: string | null;
    apiToken: string | null;
    metaAccessToken: string | null;
  };

  const ensureRevealed = useCallback(async (): Promise<AdminWaRevealed | null> => {
    if (revealedSecret && revealedUrl) {
      return { secret: revealedSecret, url: revealedUrl, apiToken: revealedApiToken, metaAccessToken: revealedMetaAccessToken };
    }
    setIsRevealing(true);
    setRevealError(null);
    try {
      const data = await fetchAdminWaConfig({ reveal: true, actorId });
      if (!data.webhookSecret || !data.webhookUrl) {
        setRevealError('O backend não retornou o segredo completo.');
        return null;
      }
      setRevealedSecret(data.webhookSecret);
      setRevealedUrl(data.webhookUrl);
      setRevealedApiToken(data.apiToken ?? null);
      setRevealedMetaAccessToken(data.metaAccessToken ?? null);
      return {
        secret: data.webhookSecret,
        url: data.webhookUrl,
        apiToken: data.apiToken ?? null,
        metaAccessToken: data.metaAccessToken ?? null,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível revelar (só usuários master podem ver).';
      setRevealError(message);
      return null;
    } finally {
      setIsRevealing(false);
    }
  }, [actorId, revealedSecret, revealedUrl, revealedApiToken, revealedMetaAccessToken]);

  const handleToggleApiTokenVisible = () => {
    if (isApiTokenVisible) {
      setIsApiTokenVisible(false);
      if (!apiTokenEdited) setApiTokenField(waConfig?.apiTokenMasked ?? '');
      return;
    }
    ensureRevealed().then((revealed) => {
      if (revealed?.apiToken) {
        setApiTokenField(revealed.apiToken);
        setIsApiTokenVisible(true);
      } else if (revealError) {
        Alert.alert('Não foi possível revelar', revealError);
      }
    });
  };

  const handleToggleMetaTokenVisible = () => {
    if (isMetaTokenVisible) {
      setIsMetaTokenVisible(false);
      if (!metaAccessTokenEdited) setMetaAccessTokenField(waConfig?.metaAccessTokenMasked ?? '');
      return;
    }
    ensureRevealed().then((revealed) => {
      if (revealed?.metaAccessToken) {
        setMetaAccessTokenField(revealed.metaAccessToken);
        setIsMetaTokenVisible(true);
      } else if (revealError) {
        Alert.alert('Não foi possível revelar', revealError);
      }
    });
  };

  const handleCopyApiToken = () => {
    if (apiTokenEdited) {
      copyToClipboard(apiTokenField, () => flashCopied(setJustCopiedApiToken));
      return;
    }
    ensureRevealed().then((revealed) => {
      if (revealed?.apiToken) {
        copyToClipboard(revealed.apiToken, () => flashCopied(setJustCopiedApiToken));
      } else if (revealError) {
        Alert.alert('Não foi possível copiar', revealError);
      }
    });
  };

  const handleCopyMetaToken = () => {
    if (metaAccessTokenEdited) {
      copyToClipboard(metaAccessTokenField, () => flashCopied(setJustCopiedMetaToken));
      return;
    }
    ensureRevealed().then((revealed) => {
      if (revealed?.metaAccessToken) {
        copyToClipboard(revealed.metaAccessToken, () => flashCopied(setJustCopiedMetaToken));
      } else if (revealError) {
        Alert.alert('Não foi possível copiar', revealError);
      }
    });
  };

  useEffect(() => {
    if (activeWaSubTab === 'webhook' && !revealedSecret && !isRevealing && !revealError) {
      ensureRevealed();
    }
  }, [activeWaSubTab, revealedSecret, isRevealing, revealError, ensureRevealed]);

  const flashCopied = (setFlag: (value: boolean) => void) => {
    setFlag(true);
    setTimeout(() => setFlag(false), 1800);
  };

  const handleToggleSecretVisible = () => setIsSecretVisible((current) => !current);

  const handleCopyWebhookUrl = () => {
    if (revealedUrl) copyToClipboard(revealedUrl, () => flashCopied(setJustCopiedUrl));
  };

  const handleCopyWebhookSecret = () => {
    if (revealedSecret) copyToClipboard(revealedSecret, () => flashCopied(setJustCopiedSecret));
  };

  const handleSaveConfig = () => {
    setIsSaving(true);
    const body: AdminWaConfigWriteBody = { provider: providerForm, enabled: enabledForm };
    if (providerForm === 'zapresponder') {
      body.api_url = apiUrlForm.trim();
      body.department_id = departmentIdForm.trim();
      // Só manda api_token se a pessoa de fato editou o campo — caso
      // contrário o texto ali é só o valor mascarado que veio do backend
      // (ex: "eyJ••••pdc"), e mandar isso de volta apagaria o token real.
      if (apiTokenEdited && apiTokenField.trim()) body.api_token = apiTokenField.trim();
    } else {
      body.meta_business_id = metaBusinessIdForm.trim();
      body.meta_phone_number_id = metaPhoneNumberIdForm.trim();
      if (metaAccessTokenEdited && metaAccessTokenField.trim()) body.meta_access_token = metaAccessTokenField.trim();
    }
    updateAdminWaConfig(body, actorId)
      .then((result) => {
        applyConfig(result);
        Alert.alert('Salvo', 'Configuração atualizada.');
      })
      .catch((err) => showAdminApiError(err, 'Não foi possível salvar a configuração.'))
      .finally(() => setIsSaving(false));
  };

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    testAdminWaConnection(actorId)
      .then((result) => {
        const message = typeof result?.message === 'string' ? result.message : 'Conexão realizada com sucesso.';
        Alert.alert('Testar conexão', message);
      })
      .catch((err) => showAdminApiError(err, 'Não foi possível testar a conexão.'))
      .finally(() => setIsTestingConnection(false));
  };

  const handleRotateSecret = () => {
    Alert.alert(
      'Gerar novo segredo',
      'Isso invalida a URL de webhook atual — será preciso atualizar no ZapResponder de novo. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar',
          style: 'destructive',
          onPress: () => {
            setIsRotating(true);
            rotateAdminWaWebhookSecret(actorId)
              .then((result) => {
                setRevealedSecret(result.webhookSecret ?? null);
                setRevealedUrl(result.webhookUrl ?? null);
                setRevealError(null);
                setIsSecretVisible(true);
                Alert.alert('Segredo gerado', 'Atualize a URL no ZapResponder com o novo segredo abaixo.');
              })
              .catch((err) => showAdminApiError(err, 'Não foi possível gerar um novo segredo.'))
              .finally(() => setIsRotating(false));
          },
        },
      ]
    );
  };

  const handleSyncTemplates = () => {
    setIsSyncingTemplates(true);
    syncAdminWaTemplates(actorId)
      .then((result) => {
        setWaConfig((current) =>
          current ? { ...current, templates: result.templates, templatesError: result.templatesError ?? null } : current
        );
        if (result.templatesError) {
          Alert.alert('Sincronizado com aviso', result.templatesError);
        } else {
          Alert.alert('Sincronizado', `${result.templates.length} template(s) atualizados.`);
        }
      })
      .catch((err) => showAdminApiError(err, 'Não foi possível sincronizar os templates.'))
      .finally(() => setIsSyncingTemplates(false));
  };

  const handleTestTemplate = (template: AdminWaTemplateItem) => {
    if (!diagnosticoTelefone.trim()) {
      Alert.alert('Informe o telefone', 'Digite um telefone de diagnóstico acima primeiro.');
      return;
    }
    if (!template.templateName) return;
    const key = template.id ?? template.templateName;
    setTestingTemplateKey(key);
    testAdminWaTemplate(
      { phone: diagnosticoTelefone.trim(), templateName: template.templateName, language: template.language ?? undefined },
      actorId
    )
      .then(() => Alert.alert('Teste enviado', `Mensagem de teste enviada para ${diagnosticoTelefone}.`))
      .catch((err) => showAdminApiError(err, 'Não foi possível enviar o teste.'))
      .finally(() => setTestingTemplateKey(null));
  };

  const activeProviderMeta = ADMIN_INTEGRATION_PROVIDERS.find((p) => p.key === activeProvider)!;
  const templates = waConfig?.templates ?? [];

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

        <View style={adminStyles.waProviderTabBarWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ADMIN_INTEGRATION_PROVIDERS.map((provider) => {
              const isActive = activeProvider === provider.key;
              return (
                <Pressable
                  key={provider.key}
                  style={[adminStyles.waProviderTabItem, isActive ? { borderBottomColor: provider.color } : null]}
                  onPress={() => setActiveProvider(provider.key)}
                >
                  <Feather name={provider.icon} size={14} color={provider.color} />
                  <Text
                    style={[
                      adminStyles.waProviderTabText,
                      isActive ? [adminStyles.waProviderTabTextActive, { color: provider.color }] : null,
                    ]}
                  >
                    {provider.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={adminStyles.waFadeEdge} pointerEvents="none">
            <LinearGradient
              colors={['rgba(245,246,250,0)', '#F5F6FA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
            <Feather name="chevron-right" size={14} color="#9AA1B5" style={adminStyles.waFadeChevron} />
          </View>
        </View>
        <View style={adminStyles.waProviderTabDivider} />

        {activeProvider === 'whatsapp' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              {ADMIN_WA_SUBTABS.map((tab) => {
                const isActive = activeWaSubTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    style={[adminStyles.waSubTabItem, isActive ? { borderBottomColor: GREEN } : null]}
                    onPress={() => setActiveWaSubTab(tab.key)}
                  >
                    <Text style={[adminStyles.waSubTabText, isActive ? adminStyles.waSubTabTextActive : null]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={adminStyles.waProviderTabDivider} />

            {isLoadingConfig ? (
              <AdminEmptyState message="Carregando integração..." />
            ) : configError ? (
              <AdminEmptyState message={configError} />
            ) : (
              <>
                {activeWaSubTab === 'conexao' ? (
                  <View style={adminStyles.sectionCard}>
                    <View style={adminStyles.integrationHeaderRow}>
                      <View style={adminStyles.integrationHeaderLeft}>
                        <View style={[styles.iconShell, { backgroundColor: GREEN_BG }]}>
                          <Feather name="message-circle" size={17} color={GREEN} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={adminStyles.sectionTitle}>WhatsApp</Text>
                          <Text style={adminStyles.integrationDescription}>
                            Integração com ZapResponder (API oficial) ou Meta Cloud.
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={adminStyles.integrationStatusRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={adminStyles.subsectionTitle}>Status da integração</Text>
                        <Text style={adminStyles.integrationDescription}>
                          Quando desligado, nenhum envio é processado.
                        </Text>
                      </View>
                      <AdminColorPill
                        label={enabledForm ? 'Ativo' : 'Inativo'}
                        bg={enabledForm ? GREEN_BG : GRAY_BG}
                        color={enabledForm ? GREEN : GRAY}
                      />
                      <ToggleSwitch value={enabledForm} onValueChange={() => setEnabledForm((c) => !c)} />
                    </View>

                    <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>PROVEDOR</Text>
                    <Pressable style={adminStyles.selectField} onPress={() => setIsProviderPickerOpen(true)}>
                      <Text style={adminStyles.selectFieldText}>{ADMIN_WA_PROVIDER_LABELS[providerForm]}</Text>
                      <Feather name="chevron-down" size={16} color="#7A8299" />
                    </Pressable>

                    {providerForm === 'zapresponder' ? (
                      <>
                        <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>API URL</Text>
                        <TextInput
                          style={styles.processTextInput}
                          value={apiUrlForm}
                          onChangeText={setApiUrlForm}
                          placeholder="https://api.zapresponder.com.br/api"
                          placeholderTextColor="#A7AEC2"
                          autoCapitalize="none"
                        />

                        <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>DEPARTMENT ID</Text>
                        <TextInput
                          style={styles.processTextInput}
                          value={departmentIdForm}
                          onChangeText={setDepartmentIdForm}
                          placeholder="Department ID do ZapResponder"
                          placeholderTextColor="#A7AEC2"
                          autoCapitalize="none"
                        />

                        <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>API TOKEN</Text>
                        <View style={adminStyles.tokenFieldRow}>
                          <TextInput
                            style={[styles.processTextInput, { flex: 1 }]}
                            value={apiTokenField}
                            onChangeText={(text) => {
                              setApiTokenField(text);
                              setApiTokenEdited(true);
                              setIsApiTokenVisible(false);
                            }}
                            placeholder={waConfig?.hasApiToken ? undefined : 'Nenhum token configurado ainda'}
                            placeholderTextColor="#A7AEC2"
                            autoCapitalize="none"
                          />
                          {waConfig?.hasApiToken && !apiTokenEdited ? (
                            <Pressable onPress={handleToggleApiTokenVisible} hitSlop={8} style={adminStyles.tokenEyeButton}>
                              <Feather name={isApiTokenVisible ? 'eye-off' : 'eye'} size={16} color="#7A8299" />
                            </Pressable>
                          ) : null}
                          {waConfig?.hasApiToken ? (
                            <Pressable onPress={handleCopyApiToken} hitSlop={8} style={adminStyles.tokenEyeButton}>
                              <Feather
                                name={justCopiedApiToken ? 'check' : 'copy'}
                                size={16}
                                color={justCopiedApiToken ? GREEN : '#7A8299'}
                              />
                            </Pressable>
                          ) : null}
                        </View>
                        <Text style={adminStyles.integrationHint}>
                          Gere em app.zapresponder.com.br → Integrações → API. Toque no olho para ver o token
                          completo (só usuários master) — edite o campo só se quiser trocar por um novo.
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>META BUSINESS ID</Text>
                        <TextInput
                          style={styles.processTextInput}
                          value={metaBusinessIdForm}
                          onChangeText={setMetaBusinessIdForm}
                          placeholder="ID da conta Meta Business"
                          placeholderTextColor="#A7AEC2"
                          autoCapitalize="none"
                        />

                        <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>PHONE NUMBER ID</Text>
                        <TextInput
                          style={styles.processTextInput}
                          value={metaPhoneNumberIdForm}
                          onChangeText={setMetaPhoneNumberIdForm}
                          placeholder="ID do número do WhatsApp Business"
                          placeholderTextColor="#A7AEC2"
                          autoCapitalize="none"
                        />

                        <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>ACCESS TOKEN</Text>
                        <View style={adminStyles.tokenFieldRow}>
                          <TextInput
                            style={[styles.processTextInput, { flex: 1 }]}
                            value={metaAccessTokenField}
                            onChangeText={(text) => {
                              setMetaAccessTokenField(text);
                              setMetaAccessTokenEdited(true);
                              setIsMetaTokenVisible(false);
                            }}
                            placeholder={waConfig?.hasMetaAccessToken ? undefined : 'Nenhum token configurado ainda'}
                            placeholderTextColor="#A7AEC2"
                            autoCapitalize="none"
                          />
                          {waConfig?.hasMetaAccessToken && !metaAccessTokenEdited ? (
                            <Pressable onPress={handleToggleMetaTokenVisible} hitSlop={8} style={adminStyles.tokenEyeButton}>
                              <Feather name={isMetaTokenVisible ? 'eye-off' : 'eye'} size={16} color="#7A8299" />
                            </Pressable>
                          ) : null}
                          {waConfig?.hasMetaAccessToken ? (
                            <Pressable onPress={handleCopyMetaToken} hitSlop={8} style={adminStyles.tokenEyeButton}>
                              <Feather
                                name={justCopiedMetaToken ? 'check' : 'copy'}
                                size={16}
                                color={justCopiedMetaToken ? GREEN : '#7A8299'}
                              />
                            </Pressable>
                          ) : null}
                        </View>
                        <Text style={adminStyles.integrationHint}>
                          Toque no olho para ver o token completo (só usuários master) — edite o campo só se quiser
                          trocar por um novo.
                        </Text>
                      </>
                    )}

                    <View style={adminStyles.integrationActionsRow}>
                      <Pressable
                        style={[adminStyles.primaryButtonGreen, isSaving ? { opacity: 0.6 } : null]}
                        onPress={handleSaveConfig}
                        disabled={isSaving}
                      >
                        <Text style={adminStyles.primaryButtonGreenText}>{isSaving ? 'Salvando...' : 'Salvar'}</Text>
                      </Pressable>
                      <Pressable
                        style={[adminStyles.outlineButton, isTestingConnection ? { opacity: 0.6 } : null]}
                        onPress={handleTestConnection}
                        disabled={isTestingConnection}
                      >
                        <Text style={adminStyles.outlineButtonText}>
                          {isTestingConnection ? 'Testando...' : 'Testar conexão'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {activeWaSubTab === 'webhook' ? (
                  <View style={adminStyles.sectionCard}>
                    <Text style={adminStyles.fieldLabel}>URL DO WEBHOOK (COM SEGREDO EMBUTIDO)</Text>
                    <Text style={adminStyles.integrationDescription}>
                      Cole esta URL completa no painel ZapResponder em Integrações → Webhook. O segredo vai como
                      query string ?secret=... porque o ZapResponder não permite configurar header customizado.
                    </Text>

                    {isRevealing ? (
                      <AdminEmptyState message="Revelando segredo..." />
                    ) : revealError ? (
                      <AdminEmptyState message={revealError} />
                    ) : (
                      <>
                        <View style={[adminStyles.staticField, adminStyles.fieldSpacing]}>
                          <Text style={adminStyles.staticFieldText} numberOfLines={1}>
                            {revealedUrl ?? '—'}
                          </Text>
                          <Pressable onPress={handleCopyWebhookUrl} hitSlop={8}>
                            <Feather
                              name={justCopiedUrl ? 'check' : 'copy'}
                              size={16}
                              color={justCopiedUrl ? GREEN : '#7A8299'}
                            />
                          </Pressable>
                        </View>

                        <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>SEGREDO DO WEBHOOK</Text>
                        <Text style={adminStyles.integrationDescription}>
                          Já vai embutido na URL acima — você não precisa colar em lugar nenhum separado.
                        </Text>
                        <View style={[adminStyles.staticField, adminStyles.fieldSpacing]}>
                          <Text style={adminStyles.staticFieldText} numberOfLines={1}>
                            {isSecretVisible ? revealedSecret ?? '—' : '•'.repeat(40)}
                          </Text>
                          <View style={adminStyles.staticFieldIcons}>
                            <Pressable onPress={handleToggleSecretVisible} hitSlop={8}>
                              <Feather name={isSecretVisible ? 'eye-off' : 'eye'} size={16} color="#7A8299" />
                            </Pressable>
                            <Pressable onPress={handleCopyWebhookSecret} hitSlop={8}>
                              <Feather
                                name={justCopiedSecret ? 'check' : 'copy'}
                                size={16}
                                color={justCopiedSecret ? GREEN : '#7A8299'}
                              />
                            </Pressable>
                          </View>
                        </View>

                        <Pressable
                          style={[
                            adminStyles.primaryButtonGreen,
                            adminStyles.fieldSpacing,
                            { flexDirection: 'row', gap: 6 },
                            isRotating ? { opacity: 0.6 } : null,
                          ]}
                          onPress={handleRotateSecret}
                          disabled={isRotating}
                        >
                          <Feather name="refresh-cw" size={14} color="#FFFFFF" />
                          <Text style={adminStyles.primaryButtonGreenText}>
                            {isRotating ? 'Gerando...' : 'Gerar / Rotacionar'}
                          </Text>
                        </Pressable>
                      </>
                    )}

                    <View style={[adminStyles.integrationInfoBox, adminStyles.fieldSpacing]}>
                      <Feather name="info" size={15} color={BLUE} />
                      <Text style={adminStyles.integrationInfoText}>
                        Instruções no ZapResponder{'\n'}
                        1. Acesse Integrações → Webhook{'\n'}
                        2. Cole a URL completa acima (já com ?secret=...){'\n'}
                        3. Eventos: mensagens recebidas + status de entrega{'\n'}
                        4. Salvar — pronto, sem header customizado.
                      </Text>
                    </View>
                  </View>
                ) : null}

                {activeWaSubTab === 'templates' ? (
                  <View style={adminStyles.sectionCard}>
                    <View style={styles.directorNotifHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={adminStyles.sectionTitle}>Templates aprovados</Text>
                        <Text style={adminStyles.integrationDescription}>
                          Necessários para iniciar conversa fora da janela de 24h.
                        </Text>
                      </View>
                      <Pressable
                        style={[
                          adminStyles.primaryButtonGreen,
                          { flexDirection: 'row', gap: 6, paddingHorizontal: 14 },
                          isSyncingTemplates ? { opacity: 0.6 } : null,
                        ]}
                        onPress={handleSyncTemplates}
                        disabled={isSyncingTemplates}
                      >
                        <Feather name="refresh-cw" size={13} color="#FFFFFF" />
                        <Text style={adminStyles.primaryButtonGreenText}>
                          {isSyncingTemplates ? 'Sincronizando...' : 'Sincronizar agora'}
                        </Text>
                      </Pressable>
                    </View>

                    <View style={adminStyles.integrationInfoBox}>
                      <Feather name="clock" size={15} color={BLUE} />
                      <Text style={adminStyles.integrationInfoText}>
                        Sincronização automática 1x por dia (madrugada). Última:{' '}
                        {formatAdminLogDateTime(
                          templates.reduce<string | null>(
                            (latest, t) => (t.lastSyncedAt && (!latest || t.lastSyncedAt > latest) ? t.lastSyncedAt : latest),
                            null
                          )
                        )}
                        . Para puxar um template recém-aprovado agora, use o botão acima.
                      </Text>
                    </View>

                    <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>
                      TELEFONE PARA DIAGNÓSTICO DE ENVIO
                    </Text>
                    <TextInput
                      style={styles.processTextInput}
                      value={diagnosticoTelefone}
                      onChangeText={setDiagnosticoTelefone}
                      placeholder="DDD + número do WhatsApp"
                      placeholderTextColor="#A7AEC2"
                      keyboardType="phone-pad"
                    />
                    <Text style={adminStyles.integrationHint}>
                      Use em um template aprovado abaixo para descobrir qual formato o ZapResponder aceita.
                    </Text>

                    {waConfig?.templatesError ? (
                      <View style={adminStyles.fieldSpacing}>
                        <AdminEmptyState message={waConfig.templatesError} />
                      </View>
                    ) : templates.length === 0 ? (
                      <View style={adminStyles.fieldSpacing}>
                        <AdminEmptyState message="Nenhum template sincronizado ainda. Toque em Sincronizar agora." />
                      </View>
                    ) : (
                      templates.map((template, index) => {
                        const statusStyle = adminWaTemplateStatusStyle(template.status);
                        const key = template.id ?? template.templateName ?? String(index);
                        return (
                          <View
                            key={key}
                            style={[adminStyles.templateCard, adminStyles.fieldSpacing, index === 0 ? null : { marginTop: 10 }]}
                          >
                            <View style={adminStyles.templateCardHeaderRow}>
                              <Text style={adminStyles.templateCardName}>{template.templateName ?? '—'}</Text>
                              {template.language ? <AdminTagPill label={template.language} /> : null}
                              {template.category ? <AdminTagPill label={template.category} /> : null}
                            </View>
                            <Text style={adminStyles.templateCardBody}>{adminWaTemplatePreview(template.components)}</Text>
                            <View style={adminStyles.templateCardFooterRow}>
                              <Pressable
                                style={adminStyles.templateTestButton}
                                onPress={() => handleTestTemplate(template)}
                                disabled={testingTemplateKey === key}
                              >
                                <Text style={adminStyles.templateTestButtonText}>
                                  {testingTemplateKey === key ? 'Enviando...' : 'Testar'}
                                </Text>
                              </Pressable>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <AdminColorPill
                                  label={template.status ?? '—'}
                                  bg={statusStyle.bg}
                                  color={statusStyle.color}
                                />
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                ) : null}

                {activeWaSubTab === 'janela' ? (
                  <View style={adminStyles.sectionCard}>
                    <Text style={adminStyles.sectionTitle}>Como funciona a janela de 24 horas</Text>
                    <Text style={adminStyles.integrationDescription}>
                      A política oficial da Meta permite enviar mensagens livres (texto, mídia) apenas dentro de 24h
                      após a última mensagem recebida do contato. Fora dessa janela, é obrigatório usar um template
                      aprovado.
                    </Text>
                    <View style={adminStyles.fieldSpacing}>
                      <Text style={adminStyles.integrationBullet}>
                        • O sistema bloqueia automaticamente envios livres com janela fechada e oferece a lista de
                        templates aprovados.
                      </Text>
                      <Text style={adminStyles.integrationBullet}>
                        • Cada nova mensagem do contato reinicia a contagem de 24h.
                      </Text>
                      <Text style={adminStyles.integrationBullet}>
                        • Templates não consomem janela e podem ser enviados a qualquer momento.
                      </Text>
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : activeProvider === 'google' ? (
          <>
            <View style={adminStyles.sectionCard}>
              <View style={adminStyles.integrationHeaderRow}>
                <View style={adminStyles.integrationHeaderLeft}>
                  <View style={[styles.iconShell, { backgroundColor: GOLD_BG }]}>
                    <Feather name="star" size={17} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={adminStyles.sectionTitle}>Google Meu Negócio</Text>
                    <Text style={adminStyles.integrationDescription} numberOfLines={1}>
                      {gmbData?.status.conectado
                        ? `Conectado — ${gmbData.status.accountName ?? 'conta Google'}`
                        : 'Conta e sincronização de postos.'}
                    </Text>
                  </View>
                </View>
                {gmbData ? (
                  <AdminColorPill
                    label={gmbData.status.conectado ? 'Conectado' : 'Desconectado'}
                    bg={gmbData.status.conectado ? '#E7F5EC' : '#F4F1E8'}
                    color={gmbData.status.conectado ? '#1E8A4C' : '#8A6D1E'}
                  />
                ) : null}
              </View>

              {isLoadingGmb ? (
                <ActivityIndicator color={NAVY} style={adminStyles.fieldSpacing} />
              ) : gmbError ? (
                <View style={adminStyles.fieldSpacing}>
                  <AdminEmptyState message={gmbError} />
                </View>
              ) : (
                <>
                  <View style={adminStyles.pillButtonRow}>
                    <Pressable
                      style={[adminStyles.pillButtonOutline, isSyncingGmb ? { opacity: 0.6 } : null]}
                      onPress={handleSyncGmb}
                      disabled={isSyncingGmb}
                    >
                      <Feather name="refresh-cw" size={14} color="#15203E" />
                      <Text style={adminStyles.outlineButtonText}>{isSyncingGmb ? 'Sincronizando...' : 'Sincronizar'}</Text>
                    </Pressable>
                    <Pressable
                      style={[adminStyles.pillButtonOutline, isDisconnectingGmb ? { opacity: 0.6 } : null]}
                      onPress={handleDisconnectGmb}
                      disabled={isDisconnectingGmb}
                    >
                      <Feather name="x-circle" size={14} color="#15203E" />
                      <Text style={adminStyles.outlineButtonText}>{isDisconnectingGmb ? 'Desconectando...' : 'Desconectar'}</Text>
                    </Pressable>
                  </View>

                  {gmbData?.status.lastSyncAt ? (
                    <Text style={[adminStyles.integrationHint, adminStyles.fieldSpacing]}>
                      Última sincronização: {formatAdminLogDateTime(gmbData.status.lastSyncAt)}
                    </Text>
                  ) : null}

                  {gmbData?.status.lastSyncError ? (
                    <View style={[adminStyles.integrationInfoBox, adminStyles.fieldSpacing, { backgroundColor: '#FBEAEA' }]}>
                      <Feather name="alert-triangle" size={15} color="#C0392B" />
                      <Text style={[adminStyles.integrationInfoText, { color: '#8A2E24' }]}>{gmbData.status.lastSyncError}</Text>
                    </View>
                  ) : null}

                  {gmbData && !gmbData.status.reviewsApiOk ? (
                    <View style={[adminStyles.integrationInfoBox, adminStyles.fieldSpacing, { backgroundColor: GOLD_BG }]}>
                      <Feather name="alert-triangle" size={15} color={GOLD} />
                      <Text style={[adminStyles.integrationInfoText, { color: '#7A5A12' }]}>
                        {gmbData.status.aviso ??
                          'Aguardando aprovação da Business Profile API. Locations sincronizam normalmente. Feed de reviews ativa após aprovação do Google.'}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>

            <View style={[adminStyles.sectionCard, adminStyles.fieldSpacing]}>
              <View style={adminStyles.headerRowWrap}>
                <View style={adminStyles.headerRowTitleWrap}>
                  <Text style={adminStyles.sectionTitle}>Postos</Text>
                  {gmbData ? <AdminColorPill label={`${gmbData.locationsCount}`} bg={BLUE_BG} color={BLUE} /> : null}
                </View>
              </View>

              {isLoadingGmb ? null : gmbError ? null : gmbData && gmbData.locations.length > 0 ? (
                <>
                  <View style={adminStyles.gmbTableHeaderRow}>
                    <Text style={[adminStyles.gmbTableHeaderCell, { flex: 2 }]}>NOME NO GOOGLE</Text>
                    <Text style={[adminStyles.gmbTableHeaderCell, { width: 48, textAlign: 'center' }]}>NOTA</Text>
                    <Text style={[adminStyles.gmbTableHeaderCell, { width: 64, textAlign: 'center' }]}>REVIEWS</Text>
                    <Text style={[adminStyles.gmbTableHeaderCell, { flex: 1.4 }]}>VINCULAR A EMPRESA AF</Text>
                  </View>
                  {gmbData.locations.map((loc) => (
                    <View key={loc.id} style={adminStyles.gmbTableRow}>
                      <Text style={[adminStyles.gmbTableCell, { flex: 2 }]} numberOfLines={2}>
                        {loc.title ?? loc.googleLocationName ?? '—'}
                      </Text>
                      <Text style={[adminStyles.gmbTableCell, { width: 48, textAlign: 'center' }]}>
                        {loc.averageRating != null ? loc.averageRating.toFixed(1) : '—'}
                      </Text>
                      <Text style={[adminStyles.gmbTableCell, { width: 64, textAlign: 'center' }]}>{loc.totalReviews ?? 0}</Text>
                      <Pressable style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => openGmbLinkModal(loc)}>
                        {loc.empresaId ? <Feather name="check-circle" size={13} color={GREEN} /> : null}
                        <Text style={adminStyles.gmbLinkText} numberOfLines={1}>
                          {loc.empresaId ? 'Vinculado' : 'Vincular'}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </>
              ) : (
                <AdminEmptyState message="Nenhum posto sincronizado ainda. Toque em Sincronizar acima." />
              )}
            </View>
          </>
        ) : activeProvider === 'buscapf' ? (
          <>
            <View style={adminStyles.sectionCard}>
              <View style={adminStyles.integrationHeaderRow}>
                <View style={adminStyles.integrationHeaderLeft}>
                  <View style={[styles.iconShell, { backgroundColor: BLUE_BG }]}>
                    <Feather name="search" size={17} color={BLUE} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={adminStyles.sectionTitle}>Busca PF</Text>
                    <Text style={adminStyles.integrationDescription} numberOfLines={1}>
                      Consultas de dados públicos de pessoa física via provedores externos.
                    </Text>
                  </View>
                </View>
                <AdminColorPill label="2 provedores" bg={BLUE_BG} color={BLUE} />
              </View>

              <View style={[adminStyles.subProviderPillRow, adminStyles.fieldSpacing]}>
                <Pressable
                  style={[
                    adminStyles.subProviderPill,
                    activeBuscaPfSubProvider === 'infosimples' ? adminStyles.subProviderPillActive : null,
                  ]}
                  onPress={() => setActiveBuscaPfSubProvider('infosimples')}
                >
                  <Feather name="search" size={13} color={activeBuscaPfSubProvider === 'infosimples' ? '#FFFFFF' : '#4C5470'} />
                  <Text
                    style={[
                      adminStyles.subProviderPillText,
                      activeBuscaPfSubProvider === 'infosimples' ? adminStyles.subProviderPillTextActive : null,
                    ]}
                  >
                    Infosimples
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    adminStyles.subProviderPill,
                    activeBuscaPfSubProvider === 'fontedata' ? adminStyles.subProviderPillActive : null,
                  ]}
                  onPress={() => setActiveBuscaPfSubProvider('fontedata')}
                >
                  <Feather name="database" size={13} color={activeBuscaPfSubProvider === 'fontedata' ? '#FFFFFF' : '#4C5470'} />
                  <Text
                    style={[
                      adminStyles.subProviderPillText,
                      activeBuscaPfSubProvider === 'fontedata' ? adminStyles.subProviderPillTextActive : null,
                    ]}
                  >
                    Fonte Data
                  </Text>
                </Pressable>
              </View>
            </View>

            <AdminBuscaPfProviderPanel
              provedor={activeBuscaPfSubProvider}
              services={
                activeBuscaPfSubProvider === 'infosimples'
                  ? ADMIN_BUSCAPF_INFOSIMPLES_SERVICES
                  : ADMIN_BUSCAPF_FONTEDATA_SERVICES
              }
              status={buscaPfStatus}
              isLoadingStatus={isLoadingBuscaPfStatus}
              statusError={buscaPfStatusError}
              isTesting={testingBuscaPfProvider === activeBuscaPfSubProvider}
              onTestConnection={() => handleTestBuscaPf(activeBuscaPfSubProvider)}
              expandedServices={expandedBuscaPfServices}
              onToggleExpand={(serviceCode, defaultExpanded) =>
                setExpandedBuscaPfServices((prev) => ({
                  ...prev,
                  [serviceCode]: !(prev[serviceCode] ?? defaultExpanded),
                }))
              }
              fieldValues={buscaPfFieldValues}
              onChangeField={(serviceCode, fieldKey, value) =>
                setBuscaPfFieldValues((prev) => ({ ...prev, [`${serviceCode}::${fieldKey}`]: value }))
              }
              onExecute={(service) => {
                const values = Object.fromEntries(
                  Object.entries(buscaPfFieldValues)
                    .filter(([k]) => k.startsWith(`${service.code}::`))
                    .map(([k, v]) => [k.slice(service.code.length + 2), v])
                );
                handleExecuteBuscaPf(activeBuscaPfSubProvider, service, values);
              }}
              executingServiceCode={executingBuscaPfServiceCode}
              results={buscaPfResults}
              onOpenHistorico={() => openBuscaPfHistorico(activeBuscaPfSubProvider)}
              uso={buscaPfUso[activeBuscaPfSubProvider]}
              isLoadingUso={isLoadingBuscaPfUso[activeBuscaPfSubProvider]}
              usoError={buscaPfUsoError[activeBuscaPfSubProvider]}
              onRefreshUso={() => loadBuscaPfUso(activeBuscaPfSubProvider)}
            />
          </>
        ) : activeProvider === 'juridico' ? (
          <>
            <View style={adminStyles.sectionCard}>
              <View style={adminStyles.integrationHeaderRow}>
                <View style={adminStyles.integrationHeaderLeft}>
                  <View style={[styles.iconShell, { backgroundColor: '#E7E9F2' }]}>
                    <Feather name="briefcase" size={17} color={NAVY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={adminStyles.sectionTitle}>Jurídico</Text>
                    <Text style={adminStyles.integrationDescription} numberOfLines={1}>
                      Consultas processuais e certidões via APIs públicas e provedores externos.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[adminStyles.subProviderPillRow, adminStyles.fieldSpacing]}>
                <Pressable
                  style={[
                    adminStyles.subProviderPill,
                    activeJuridicoSubProvider === 'datajud' ? adminStyles.subProviderPillActive : null,
                  ]}
                  onPress={() => setActiveJuridicoSubProvider('datajud')}
                >
                  <Feather name="briefcase" size={13} color={activeJuridicoSubProvider === 'datajud' ? '#FFFFFF' : '#4C5470'} />
                  <Text
                    style={[
                      adminStyles.subProviderPillText,
                      activeJuridicoSubProvider === 'datajud' ? adminStyles.subProviderPillTextActive : null,
                    ]}
                  >
                    Datajud (CNJ)
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    adminStyles.subProviderPill,
                    activeJuridicoSubProvider === 'infosimples_tjrj' ? adminStyles.subProviderPillActive : null,
                  ]}
                  onPress={() => setActiveJuridicoSubProvider('infosimples_tjrj')}
                >
                  <Feather
                    name="search"
                    size={13}
                    color={activeJuridicoSubProvider === 'infosimples_tjrj' ? '#FFFFFF' : '#4C5470'}
                  />
                  <Text
                    style={[
                      adminStyles.subProviderPillText,
                      activeJuridicoSubProvider === 'infosimples_tjrj' ? adminStyles.subProviderPillTextActive : null,
                    ]}
                  >
                    Infosimples — TJRJ
                  </Text>
                </Pressable>
              </View>
            </View>

            {activeJuridicoSubProvider === 'datajud' ? (
              <>
                <View style={[adminStyles.sectionCard, adminStyles.fieldSpacing]}>
                  <View style={adminStyles.integrationHeaderRow}>
                    <Text style={[adminStyles.sectionTitle, { flex: 1 }]}>Datajud — CNJ</Text>
                    <AdminColorPill label="API pública" bg="#EFE7FB" color="#6A3FBF" />
                    <AdminColorPill label="Gratuita" bg="#E7F5EC" color="#1E8A4C" />
                  </View>
                  <Text style={adminStyles.integrationDescription}>
                    Base Nacional de Dados do Poder Judiciário (CNJ). Consultas a processos judiciais públicos por
                    tribunal — número do processo, classe processual, órgão julgador. A API pública não retorna
                    CPF/CNPJ das partes (LGPD).
                  </Text>

                  <Text style={[adminStyles.sectionTitle, adminStyles.fieldSpacing, { fontSize: 14 }]}>Credenciais</Text>

                  <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>APIKEY (PÚBLICA DO CNJ)</Text>
                  <View style={adminStyles.staticField}>
                    <Text style={adminStyles.staticFieldText}>Não exige credencial secreta</Text>
                    <AdminColorPill label="Embutida" bg="#E7F5EC" color="#1E8A4C" />
                  </View>

                  <Text style={[adminStyles.fieldLabel, adminStyles.fieldSpacing]}>ENDPOINT BASE</Text>
                  <View style={adminStyles.staticField}>
                    <Text style={adminStyles.staticFieldText} numberOfLines={1}>
                      api-publica.datajud.cnj.jus.br
                    </Text>
                  </View>

                  <View style={adminStyles.pillButtonRow}>
                    <Pressable
                      style={adminStyles.pillButtonPrimary}
                      onPress={() =>
                        Alert.alert(
                          'Ainda não disponível',
                          'Preciso criar a rota proxy no af360-api para a API pública do Datajud antes de ligar este botão.'
                        )
                      }
                    >
                      <Feather name="check-circle" size={14} color="#FFFFFF" />
                      <Text style={adminStyles.primaryButtonGreenText}>Testar conexão (TST)</Text>
                    </Pressable>
                    <Pressable
                      style={adminStyles.pillButtonOutline}
                      onPress={() =>
                        Alert.alert('Ainda não disponível', 'Vou abrir a documentação do Datajud direto no app numa próxima rodada.')
                      }
                    >
                      <Text style={adminStyles.outlineButtonText}>Documentação Datajud</Text>
                    </Pressable>
                    <Pressable
                      style={adminStyles.pillButtonOutline}
                      onPress={() =>
                        Alert.alert('Ainda não disponível', 'Vou abrir o termo de uso do Datajud direto no app numa próxima rodada.')
                      }
                    >
                      <Text style={adminStyles.outlineButtonText}>Termo de uso</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={adminStyles.headerRowWrap}>
                  <View style={adminStyles.headerRowTitleWrap}>
                    <Text style={adminStyles.sectionTitle}>Consultas disponíveis</Text>
                    <AdminColorPill label="3 serviços" bg={BLUE_BG} color={BLUE} />
                  </View>
                  <Pressable
                    style={adminStyles.pillButtonOutline}
                    onPress={() =>
                      Alert.alert(
                        'Ainda não disponível',
                        'Vou registrar o histórico de consultas do Datajud quando a rota proxy existir.'
                      )
                    }
                  >
                    <Feather name="clock" size={14} color="#15203E" />
                    <Text style={adminStyles.outlineButtonText}>Histórico</Text>
                  </Pressable>
                </View>

                <View style={[adminStyles.integrationInfoBox, { backgroundColor: GOLD_BG }]}>
                  <Feather name="alert-triangle" size={15} color={GOLD} />
                  <Text style={[adminStyles.integrationInfoText, { color: '#7A5A12' }]}>
                    Sobre a busca por CNPJ: a API pública do CNJ não expõe documentos das partes (CPF/CNPJ) por LGPD.
                    Os campos disponíveis são{' '}
                    <Text style={adminStyles.serviceCardCode}>numeroProcesso</Text>,{' '}
                    <Text style={adminStyles.serviceCardCode}>classe</Text>,{' '}
                    <Text style={adminStyles.serviceCardCode}>assuntos</Text>,{' '}
                    <Text style={adminStyles.serviceCardCode}>orgaoJulgador</Text>,{' '}
                    <Text style={adminStyles.serviceCardCode}>dataAjuizamento</Text> e{' '}
                    <Text style={adminStyles.serviceCardCode}>movimentos</Text>. Para cruzar com os CNPJs da Rede AF,
                    use os números de processos já conhecidos (ex.: ações trabalhistas listadas em processos
                    internos).
                  </Text>
                </View>

                {ADMIN_JURIDICO_DATAJUD_SERVICES.map((service) => (
                  <AdminIntegrationServiceCard
                    key={service.code}
                    service={service}
                    expanded={expandedJuridicoServices[service.code] ?? service.defaultExpanded ?? false}
                    onToggleExpand={() =>
                      setExpandedJuridicoServices((prev) => ({
                        ...prev,
                        [service.code]: !(prev[service.code] ?? service.defaultExpanded ?? false),
                      }))
                    }
                    values={Object.fromEntries(
                      Object.entries(juridicoFieldValues)
                        .filter(([k]) => k.startsWith(`${service.code}::`))
                        .map(([k, v]) => [k.slice(service.code.length + 2), v])
                    )}
                    onChangeField={(fieldKey, value) =>
                      setJuridicoFieldValues((prev) => ({ ...prev, [`${service.code}::${fieldKey}`]: value }))
                    }
                    onExecute={() =>
                      Alert.alert(
                        'Ainda não disponível',
                        'Preciso criar a rota proxy no af360-api para a API pública do Datajud antes de ligar este botão.'
                      )
                    }
                    onExtraAction={() =>
                      Alert.alert('Ainda não disponível', 'Vou abrir a tabela de classes processuais do CNJ direto no app numa próxima rodada.')
                    }
                  />
                ))}

                <View style={[adminStyles.sectionCard, adminStyles.fieldSpacing]}>
                  <View style={adminStyles.headerRowWrap}>
                    <View style={adminStyles.headerRowTitleWrap}>
                      <Text style={adminStyles.sectionTitle}>Uso mensal</Text>
                    </View>
                    <Pressable
                      style={adminStyles.pillButtonOutline}
                      onPress={() =>
                        Alert.alert('Ainda não disponível', 'Vou registrar o uso mensal do Datajud quando a rota proxy existir.')
                      }
                    >
                      <Feather name="refresh-cw" size={14} color="#15203E" />
                      <Text style={adminStyles.outlineButtonText}>Atualizar</Text>
                    </Pressable>
                  </View>
                  <AdminEmptyState message="Nenhuma consulta registrada ainda. A API do Datajud é gratuita; aqui registramos o volume por tribunal/serviço para acompanhamento interno." />
                </View>
              </>
            ) : (
              <View style={adminStyles.sectionCard}>
                <Text style={adminStyles.sectionTitle}>Infosimples — TJRJ</Text>
                <AdminEmptyState message="Ainda sem referência de tela para este sub-provedor — vou montar quando tiver o mesmo nível de detalhe do Datajud." />
              </View>
            )}
          </>
        ) : (
          <AdminEmptyState message={`Em breve. A integração ${activeProviderMeta.label} ainda está em desenvolvimento.`} />
        )}
      </ScrollView>

      <AdminSimplePickerModal
        visible={isProviderPickerOpen}
        title="Provedor"
        options={Object.values(ADMIN_WA_PROVIDER_LABELS)}
        selectedValue={ADMIN_WA_PROVIDER_LABELS[providerForm]}
        onSelect={(label) => {
          const entry = (Object.entries(ADMIN_WA_PROVIDER_LABELS) as Array<[AdminWaProvider, string]>).find(
            ([, value]) => value === label
          );
          if (entry) setProviderForm(entry[0]);
          setIsProviderPickerOpen(false);
        }}
        onClose={() => setIsProviderPickerOpen(false)}
      />

      <Modal
        visible={!!linkingLocation}
        animationType="fade"
        transparent
        onRequestClose={() => setLinkingLocation(null)}
      >
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestModalTitle}>Vincular a empresa AF</Text>
                <Text style={adminStyles.detailSubEmail} numberOfLines={1}>
                  {linkingLocation?.title ?? linkingLocation?.googleLocationName ?? '—'}
                </Text>
              </View>
              <Pressable onPress={() => setLinkingLocation(null)} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <TextInput
              style={[styles.processTextInput, { marginTop: 12 }]}
              value={linkSearch}
              onChangeText={setLinkSearch}
              placeholder="Buscar unidade por nome..."
              placeholderTextColor="#A7AEC2"
            />

            <ScrollView style={{ maxHeight: 320, marginTop: 10 }}>
              {linkingLocation?.empresaId ? (
                <Pressable
                  style={styles.templateOptionRow}
                  onPress={() => handleSelectGmbLink(null)}
                  disabled={isSavingLink}
                >
                  <Text style={[styles.templateOptionText, { color: '#C0392B' }]}>Desvincular</Text>
                </Pressable>
              ) : null}
              {isLinkSearching ? (
                <ActivityIndicator color={NAVY} style={{ marginTop: 12 }} />
              ) : linkOptions.length === 0 ? (
                <AdminEmptyState message="Nenhuma unidade encontrada." />
              ) : (
                linkOptions.map((unidade) => (
                  <Pressable
                    key={unidade.id}
                    style={styles.templateOptionRow}
                    onPress={() => handleSelectGmbLink(unidade.id)}
                    disabled={isSavingLink}
                  >
                    <Text style={styles.templateOptionText}>
                      {unidade.nomeFantasia ?? unidade.razaoSocial ?? unidade.id}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!buscaPfHistoricoProvider}
        animationType="fade"
        transparent
        onRequestClose={() => setBuscaPfHistoricoProvider(null)}
      >
        <View style={styles.requestModalBackdrop}>
          <View style={styles.requestModalCard}>
            <View style={styles.requestModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestModalTitle}>Histórico</Text>
                <Text style={adminStyles.detailSubEmail}>
                  {buscaPfHistoricoProvider === 'infosimples' ? 'Infosimples' : 'Fonte Data'}
                </Text>
              </View>
              <Pressable onPress={() => setBuscaPfHistoricoProvider(null)} hitSlop={8}>
                <Feather name="x" size={20} color="#677089" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 400, marginTop: 12 }}>
              {isLoadingBuscaPfHistorico ? (
                <ActivityIndicator color={NAVY} style={{ marginTop: 12 }} />
              ) : buscaPfHistoricoError ? (
                <AdminEmptyState message={buscaPfHistoricoError} />
              ) : !buscaPfHistoricoRows || buscaPfHistoricoRows.length === 0 ? (
                <AdminEmptyState message="Nenhuma consulta registrada ainda." />
              ) : (
                buscaPfHistoricoRows.map((row) => (
                  <View key={row.id} style={[adminStyles.staticField, { marginBottom: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={adminStyles.staticFieldText} numberOfLines={1}>
                        {row.service ?? '—'} {row.nome ? `— ${row.nome}` : row.cpf ? `— ${row.cpf}` : ''}
                      </Text>
                      <Text style={adminStyles.integrationHint}>
                        {formatAdminLogDateTime(row.createdAt)}
                        {row.costBrl != null ? ` · ${admFormatBRL(row.costBrl)}` : ''}
                      </Text>
                    </View>
                    <AdminColorPill
                      label={row.responseCode != null ? String(row.responseCode) : '—'}
                      bg={row.responseCode === 200 ? '#E7F5EC' : '#F4F1E8'}
                      color={row.responseCode === 200 ? '#1E8A4C' : '#8A6D1E'}
                    />
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

// ---------- Modal "Visualizar cargo x domínio" ----------

function AdminCargoDominioDetailModal({
  visible,
  item,
  providerLabels,
  onClose,
  onEdit,
}: {
  visible: boolean;
  item: AdminCargoDominioItem | null;
  providerLabels: Record<AdminCargoDominioProvider, string>;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!item) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle}>{item.cargo}</Text>
              <Text style={adminStyles.detailSubEmail}>Domínio de e-mail por cargo</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={adminStyles.detailGridRow}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>DOMÍNIO</Text>
                <Text style={adminStyles.detailFieldValue}>{item.dominio}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>PROVEDOR</Text>
                <Text style={adminStyles.detailFieldValue}>
                  {item.provider ? providerLabels[item.provider] : '—'}
                </Text>
              </View>
            </View>

            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>ATIVO</Text>
                <View style={[adminStyles.detailBadgeBase, { backgroundColor: item.isActive ? GREEN_BG : RED_BG }]}>
                  <Feather
                    name={item.isActive ? 'check-circle' : 'x-circle'}
                    size={11}
                    color={item.isActive ? GREEN : RED}
                  />
                  <Text style={[adminStyles.detailBadgeText, { color: item.isActive ? GREEN : RED }]}>
                    {item.isActive ? 'Sim' : 'Não'}
                  </Text>
                </View>
              </View>
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

// ---------- Modal "Editar cargo x domínio" ----------

function AdminCargoDominioEditModal({
  visible,
  item,
  providerLabels,
  isSaving,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  item: AdminCargoDominioItem | null;
  providerLabels: Record<AdminCargoDominioProvider, string>;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: { cargo: string; dominio: string; provider: AdminCargoDominioProvider; ativo: boolean }) => void;
}) {
  const [cargo, setCargo] = useState('');
  const [dominio, setDominio] = useState('');
  const [provider, setProvider] = useState<AdminCargoDominioProvider>('migadu');
  const [ativo, setAtivo] = useState(true);
  const [isProviderPickerOpen, setIsProviderPickerOpen] = useState(false);

  useEffect(() => {
    if (visible && item) {
      setCargo(item.cargo ?? '');
      setDominio(item.dominio ?? '');
      setProvider(item.provider ?? 'migadu');
      setAtivo(item.isActive);
    }
  }, [visible, item]);

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle}>Editar — {item.cargo}</Text>
              <Text style={adminStyles.detailSubEmail}>Domínio de e-mail por cargo</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.requestFieldLabel}>Cargo</Text>
            <TextInput style={styles.processTextInput} value={cargo} onChangeText={setCargo} placeholder="Ex: Frentista" placeholderTextColor="#A7AEC2" />

            <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Domínio</Text>
            <TextInput
              style={styles.processTextInput}
              value={dominio}
              onChangeText={setDominio}
              placeholder="rede.americanfuel.com.br"
              placeholderTextColor="#A7AEC2"
              autoCapitalize="none"
            />

            <View style={styles.spacingTop}>
              <AdminSelectField label="Provedor" value={providerLabels[provider]} onPress={() => setIsProviderPickerOpen(true)} />
            </View>

            <View style={[adminStyles.themeRowTop, styles.spacingTop]}>
              <Text style={adminStyles.subsectionTitle}>Ativo</Text>
              <ToggleSwitch value={ativo} onValueChange={() => setAtivo((current) => !current)} />
            </View>
          </ScrollView>

          <View style={[adminStyles.detailFooterRow, styles.spacingTop]}>
            <Pressable style={adminStyles.ghostButton} onPress={onClose}>
              <Text style={adminStyles.ghostButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[adminStyles.primaryActionButton, isSaving ? { opacity: 0.6 } : null]}
              disabled={isSaving}
              onPress={() => onSubmit({ cargo: cargo.trim(), dominio: dominio.trim(), provider, ativo })}
            >
              <Text style={adminStyles.primaryActionButtonText}>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</Text>
            </Pressable>
          </View>

          <AdminSimplePickerModal
            visible={isProviderPickerOpen}
            title="Provedor"
            options={Object.values(providerLabels)}
            selectedValue={providerLabels[provider]}
            onSelect={(label) => {
              const found = (Object.entries(providerLabels) as Array<[AdminCargoDominioProvider, string]>).find(
                ([, value]) => value === label
              );
              if (found) setProvider(found[0]);
            }}
            onClose={() => setIsProviderPickerOpen(false)}
          />
        </View>
      </View>
    </Modal>
  );
}

const ADMIN_CARGO_DOMINIO_PROVIDER_LABELS: Record<AdminCargoDominioProvider, string> = {
  migadu: 'Migadu (operacional)',
  google: 'Google (administrativo)',
};

export function AdminConfiguracoesScreen({ navigation }: ScreenProps<'AdminConfiguracoes'>) {
  const { identity } = useContext(AuthIdentityContext);
  const { theme, temas, applyTheme } = useContext(AdminThemeContext);
  const actorId = identity?.profileId;

  // ---------- Domínios permitidos (adm_dominios_permitidos) ----------
  const [dominios, setDominios] = useState<AdminDominioItem[]>([]);
  const [isLoadingDominios, setIsLoadingDominios] = useState(true);
  const [dominioErro, setDominioErro] = useState<string | null>(null);
  const [novoDominio, setNovoDominio] = useState('');
  const [novaDescricaoDominio, setNovaDescricaoDominio] = useState('');
  const [isSavingDominio, setIsSavingDominio] = useState(false);

  const loadDominios = useCallback(() => {
    setIsLoadingDominios(true);
    setDominioErro(null);
    fetchAdminDominios()
      .then((data) => setDominios(data.dominios))
      .catch((err) => setDominioErro(err instanceof Error ? err.message : 'Não foi possível carregar os domínios.'))
      .finally(() => setIsLoadingDominios(false));
  }, []);

  useEffect(() => {
    loadDominios();
  }, [loadDominios]);

  const handleAddDominio = () => {
    if (!novoDominio.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o domínio (ex: empresa.com.br).');
      return;
    }
    setIsSavingDominio(true);
    createAdminDominio({ dominio: novoDominio.trim(), descricao: novaDescricaoDominio.trim() || null }, actorId)
      .then(() => {
        setNovoDominio('');
        setNovaDescricaoDominio('');
        loadDominios();
      })
      .catch((err) => showAdminApiError(err, 'Não foi possível adicionar o domínio.'))
      .finally(() => setIsSavingDominio(false));
  };

  const handleToggleDominio = (item: AdminDominioItem) => {
    updateAdminDominio(item.id, { ativo: !item.isActive }, actorId)
      .then(() => loadDominios())
      .catch((err) => showAdminApiError(err, 'Não foi possível atualizar o domínio.'));
  };

  const handleDeleteDominio = (item: AdminDominioItem) => {
    Alert.alert('Excluir domínio', `Remover "${item.dominio}" da lista de domínios permitidos?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAdminDominio(item.id, actorId)
            .then(() => loadDominios())
            .catch((err) => showAdminApiError(err, 'Não foi possível excluir o domínio.'));
        },
      },
    ]);
  };

  // ---------- Domínio de e-mail por cargo (rh_cargo_dominio) ----------
  const [cargoDominios, setCargoDominios] = useState<AdminCargoDominioItem[]>([]);
  const [isLoadingCargoDominios, setIsLoadingCargoDominios] = useState(true);
  const [cargoDominioErro, setCargoDominioErro] = useState<string | null>(null);
  const [cargoSearch, setCargoSearch] = useState('');
  const [novoCargo, setNovoCargo] = useState('');
  const [novoCargoDominio, setNovoCargoDominio] = useState('');
  const [novoCargoProvider, setNovoCargoProvider] = useState<AdminCargoDominioProvider>('migadu');
  const [isNovoCargoPickerOpen, setIsNovoCargoPickerOpen] = useState(false);
  const [isSavingCargoDominio, setIsSavingCargoDominio] = useState(false);
  const [cargoDominioActionsFor, setCargoDominioActionsFor] = useState<AdminCargoDominioItem | null>(null);
  const [cargoDominioDetail, setCargoDominioDetail] = useState<AdminCargoDominioItem | null>(null);
  const [cargoDominioEditTarget, setCargoDominioEditTarget] = useState<AdminCargoDominioItem | null>(null);
  const [isSavingCargoDominioEdit, setIsSavingCargoDominioEdit] = useState(false);

  const loadCargoDominios = useCallback(() => {
    setIsLoadingCargoDominios(true);
    setCargoDominioErro(null);
    fetchAdminCargoDominio()
      .then((data) => setCargoDominios(data.itens))
      .catch((err) =>
        setCargoDominioErro(err instanceof Error ? err.message : 'Não foi possível carregar os cargos.')
      )
      .finally(() => setIsLoadingCargoDominios(false));
  }, []);

  useEffect(() => {
    loadCargoDominios();
  }, [loadCargoDominios]);

  const filteredCargoDominios = useMemo(() => {
    const query = cargoSearch.trim().toLowerCase();
    if (!query) return cargoDominios;
    return cargoDominios.filter(
      (item) =>
        (item.cargo ?? '').toLowerCase().includes(query) || (item.dominio ?? '').toLowerCase().includes(query)
    );
  }, [cargoDominios, cargoSearch]);

  const migaduCount = cargoDominios.filter((item) => item.provider === 'migadu').length;
  const googleCount = cargoDominios.filter((item) => item.provider === 'google').length;

  const handleAddCargoDominio = () => {
    if (!novoCargo.trim() || !novoCargoDominio.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe o cargo e o domínio.');
      return;
    }
    setIsSavingCargoDominio(true);
    createAdminCargoDominio(
      { cargo: novoCargo.trim(), dominio: novoCargoDominio.trim(), provider: novoCargoProvider },
      actorId
    )
      .then(() => {
        setNovoCargo('');
        setNovoCargoDominio('');
        setNovoCargoProvider('migadu');
        loadCargoDominios();
      })
      .catch((err) => showAdminApiError(err, 'Não foi possível adicionar o cargo.'))
      .finally(() => setIsSavingCargoDominio(false));
  };

  const handleSubmitCargoDominioEdit = (values: {
    cargo: string;
    dominio: string;
    provider: AdminCargoDominioProvider;
    ativo: boolean;
  }) => {
    const target = cargoDominioEditTarget;
    if (!target) return;
    if (!values.cargo || !values.dominio) {
      Alert.alert('Campos obrigatórios', 'Informe o cargo e o domínio.');
      return;
    }
    setIsSavingCargoDominioEdit(true);
    updateAdminCargoDominio(target.id, values, actorId)
      .then(() => {
        setCargoDominioEditTarget(null);
        loadCargoDominios();
      })
      .catch((err) => showAdminApiError(err, 'Não foi possível salvar as alterações.'))
      .finally(() => setIsSavingCargoDominioEdit(false));
  };

  const handleToggleCargoDominio = (item: AdminCargoDominioItem) => {
    updateAdminCargoDominio(item.id, { ativo: !item.isActive }, actorId)
      .then(() => loadCargoDominios())
      .catch((err) => showAdminApiError(err, 'Não foi possível atualizar o cargo.'));
  };

  const handleDeleteCargoDominio = (item: AdminCargoDominioItem) => {
    Alert.alert('Excluir mapeamento', `Remover o domínio de e-mail do cargo "${item.cargo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAdminCargoDominio(item.id, actorId)
            .then(() => loadCargoDominios())
            .catch((err) => showAdminApiError(err, 'Não foi possível excluir o cargo.'));
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
        <AdminPageHeader icon="settings" title="Configurações" subtitle="Domínios e tema visual" />

        <View style={adminStyles.sectionCard}>
          <Text style={adminStyles.sectionTitle}>Domínios permitidos para login</Text>
          <Text style={adminStyles.integrationDescription}>
            Somente e-mails desses domínios podem entrar na plataforma. A trava é aplicada no servidor — qualquer
            outro e-mail é rejeitado.
          </Text>

          <View style={adminStyles.formRow}>
            <View style={adminStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Domínio</Text>
              <TextInput
                style={styles.processTextInput}
                value={novoDominio}
                onChangeText={setNovoDominio}
                placeholder="ex: empresa.com.br"
                placeholderTextColor="#A7AEC2"
                autoCapitalize="none"
              />
            </View>
            <View style={adminStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Descrição (opcional)</Text>
              <TextInput
                style={styles.processTextInput}
                value={novaDescricaoDominio}
                onChangeText={setNovaDescricaoDominio}
                placeholder="Ex: domínio da rede de postos"
                placeholderTextColor="#A7AEC2"
              />
            </View>
          </View>
          <Pressable
            style={[styles.directorNotifNewButton, { alignSelf: 'flex-end', marginTop: 10 }]}
            onPress={handleAddDominio}
            disabled={isSavingDominio}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.directorNotifNewButtonText}>{isSavingDominio ? 'Adicionando...' : 'Adicionar'}</Text>
          </Pressable>

          {isLoadingDominios ? (
            <AdminEmptyState message="Carregando domínios..." />
          ) : dominioErro ? (
            <AdminEmptyState message={dominioErro} />
          ) : dominios.length === 0 ? (
            <AdminEmptyState message="Nenhum domínio cadastrado." />
          ) : (
            dominios.map((item, index) => (
              <View
                key={item.id}
                style={[adminStyles.domainRow, index === dominios.length - 1 ? { borderBottomWidth: 0 } : null]}
              >
                <View style={adminStyles.listInfo}>
                  <Text style={adminStyles.listName}>{item.dominio}</Text>
                  <Text style={adminStyles.listMeta}>{item.descricao || '—'}</Text>
                </View>
                <ToggleSwitch value={item.isActive} onValueChange={() => handleToggleDominio(item)} />
                <Pressable hitSlop={8} style={{ padding: 4, marginLeft: 6 }} onPress={() => handleDeleteDominio(item)}>
                  <Feather name="trash-2" size={16} color={RED} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={adminStyles.sectionCard}>
          <Text style={adminStyles.sectionTitle}>Domínio de e-mail por cargo</Text>
          <Text style={adminStyles.integrationDescription}>
            Define qual domínio e provedor serão usados quando o RH ativar o acesso ao portal do colaborador. Cargos
            operacionais de posto usam Migadu (rede.americanfuel.com.br); cargos administrativos e de liderança usam
            Google Workspace (americanfuel.com.br). Cargo não cadastrado aqui = ativação bloqueada — nunca há domínio
            padrão silencioso.
          </Text>

          <View style={adminStyles.roleModulesRow}>
            <AdminColorPill label={`Migadu: ${migaduCount}`} bg={BLUE_BG} color={BLUE} />
            <AdminColorPill label={`Google: ${googleCount}`} bg={GOLD_BG} color={GOLD} />
          </View>

          <View style={[adminStyles.formRow, styles.spacingTop]}>
            <View style={adminStyles.formRowItem}>
              <Text style={[styles.requestFieldLabel, styles.spacingTop]}>Cargo</Text>
              <TextInput
                style={styles.processTextInput}
                value={novoCargo}
                onChangeText={setNovoCargo}
                placeholder="Ex: Frentista"
                placeholderTextColor="#A7AEC2"
              />
            </View>
            <View style={adminStyles.formRowItem}>
              <AdminSelectField
                label="Provedor"
                value={ADMIN_CARGO_DOMINIO_PROVIDER_LABELS[novoCargoProvider]}
                onPress={() => setIsNovoCargoPickerOpen(true)}
              />
            </View>
          </View>
          <View style={adminStyles.formRow}>
            <View style={adminStyles.formRowItem}>
              <Text style={styles.requestFieldLabel}>Domínio</Text>
              <TextInput
                style={styles.processTextInput}
                value={novoCargoDominio}
                onChangeText={setNovoCargoDominio}
                placeholder="rede.americanfuel.com.br"
                placeholderTextColor="#A7AEC2"
                autoCapitalize="none"
              />
            </View>
            <View style={[adminStyles.formRowItem, { justifyContent: 'flex-end' }]}>
              <Pressable
                style={styles.directorNotifNewButton}
                onPress={handleAddCargoDominio}
                disabled={isSavingCargoDominio}
              >
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={styles.directorNotifNewButtonText}>
                  {isSavingCargoDominio ? 'Adicionando...' : 'Adicionar'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.spacingTop}>
            <AdminSearchRow value={cargoSearch} onChangeText={setCargoSearch} placeholder="Buscar cargo ou domínio..." />
          </View>

          {isLoadingCargoDominios ? (
            <AdminEmptyState message="Carregando cargos..." />
          ) : cargoDominioErro ? (
            <AdminEmptyState message={cargoDominioErro} />
          ) : filteredCargoDominios.length === 0 ? (
            <AdminEmptyState message="Nenhum cargo cadastrado." />
          ) : (
            filteredCargoDominios.map((item, index) => (
              <View
                key={item.id}
                style={[
                  adminStyles.contabRow,
                  index === filteredCargoDominios.length - 1 ? { borderBottomWidth: 0 } : null,
                ]}
              >
                <View style={adminStyles.listInfo}>
                  <Text style={adminStyles.listName} numberOfLines={1}>
                    {item.cargo}
                  </Text>
                  <Text style={adminStyles.listMeta} numberOfLines={1}>
                    {item.dominio}
                  </Text>
                </View>
                <AdminColorPill
                  label={item.provider ? ADMIN_CARGO_DOMINIO_PROVIDER_LABELS[item.provider].split(' ')[0] : '—'}
                  bg={item.provider === 'google' ? GOLD_BG : BLUE_BG}
                  color={item.provider === 'google' ? GOLD : BLUE}
                />
                <ToggleSwitch value={item.isActive} onValueChange={() => handleToggleCargoDominio(item)} />
                <Pressable hitSlop={10} style={{ padding: 4, marginLeft: 2 }} onPress={() => setCargoDominioActionsFor(item)}>
                  <Feather name="more-vertical" size={18} color="#9AA1B5" />
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={[adminStyles.sectionCard, adminStyles.lastSectionCard]}>
          <Text style={adminStyles.sectionTitle}>Tema da tela de Início</Text>
          <Text style={adminStyles.integrationDescription}>
            Skins reversíveis aplicadas ao painel Administrador. Troca instantânea para todos que abrirem o app.
          </Text>

          {temas.map((preset, index) => {
            const isActive = preset.slug === theme.slug;
            return (
              <View
                key={preset.slug}
                style={[adminStyles.themeRow, index === temas.length - 1 ? { borderBottomWidth: 0 } : null]}
              >
                <View style={adminStyles.themeRowTop}>
                  <Text style={adminStyles.subsectionTitle}>{preset.nome}</Text>
                  {isActive ? (
                    <AdminColorPill label="✓ Ativo" bg={GREEN_BG} color={GREEN} />
                  ) : (
                    <Pressable style={adminStyles.applyButton} onPress={() => applyTheme(preset.slug)}>
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
        </View>
      </ScrollView>

      <AdminSimplePickerModal
        visible={isNovoCargoPickerOpen}
        title="Provedor"
        options={Object.values(ADMIN_CARGO_DOMINIO_PROVIDER_LABELS)}
        selectedValue={ADMIN_CARGO_DOMINIO_PROVIDER_LABELS[novoCargoProvider]}
        onSelect={(label) => {
          const found = (Object.entries(ADMIN_CARGO_DOMINIO_PROVIDER_LABELS) as Array<
            [AdminCargoDominioProvider, string]
          >).find(([, value]) => value === label);
          if (found) setNovoCargoProvider(found[0]);
        }}
        onClose={() => setIsNovoCargoPickerOpen(false)}
      />
      <AdminGenericActionsMenu
        visible={cargoDominioActionsFor !== null}
        title={cargoDominioActionsFor?.cargo ?? ''}
        onClose={() => setCargoDominioActionsFor(null)}
        actions={[
          {
            key: 'visualizar',
            icon: 'eye',
            label: 'Visualizar',
            onPress: () => {
              setCargoDominioDetail(cargoDominioActionsFor);
              setCargoDominioActionsFor(null);
            },
          },
          {
            key: 'editar',
            icon: 'edit-2',
            label: 'Editar',
            onPress: () => {
              const item = cargoDominioActionsFor;
              setCargoDominioActionsFor(null);
              if (item) setCargoDominioEditTarget(item);
            },
          },
          {
            key: 'excluir',
            icon: 'trash-2',
            label: 'Excluir',
            danger: true,
            onPress: () => {
              const item = cargoDominioActionsFor;
              setCargoDominioActionsFor(null);
              if (item) handleDeleteCargoDominio(item);
            },
          },
        ]}
      />
      <AdminCargoDominioDetailModal
        visible={cargoDominioDetail !== null}
        item={cargoDominioDetail}
        providerLabels={ADMIN_CARGO_DOMINIO_PROVIDER_LABELS}
        onClose={() => setCargoDominioDetail(null)}
        onEdit={() => {
          const item = cargoDominioDetail;
          setCargoDominioDetail(null);
          if (item) setCargoDominioEditTarget(item);
        }}
      />
      <AdminCargoDominioEditModal
        visible={cargoDominioEditTarget !== null}
        item={cargoDominioEditTarget}
        providerLabels={ADMIN_CARGO_DOMINIO_PROVIDER_LABELS}
        isSaving={isSavingCargoDominioEdit}
        onClose={() => setCargoDominioEditTarget(null)}
        onSubmit={handleSubmitCargoDominioEdit}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// 11. Versões
// ============================================================================

const ADMIN_VERSAO_TIPO_STYLE: Record<AdminVersaoTipoKey, { color: string; bg: string; icon: FeatherIconName }> = {
  novo: { color: GREEN, bg: GREEN_BG, icon: 'package' },
  melhoria: { color: BLUE, bg: BLUE_BG, icon: 'tool' },
  correcao: { color: GRAY, bg: GRAY_BG, icon: 'alert-circle' },
  seguranca: { color: GOLD, bg: GOLD_BG, icon: 'shield' },
  schema: { color: PURPLE, bg: PURPLE_BG, icon: 'database' },
};
const ADMIN_VERSAO_TIPO_FALLBACK: { color: string; bg: string; icon: FeatherIconName } = {
  color: GRAY,
  bg: GRAY_BG,
  icon: 'circle',
};

export function AdminVersoesScreen({ navigation }: ScreenProps<'AdminVersoes'>) {
  const [versoesData, setVersoesData] = useState<AdminVersoesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<AdminVersaoTipoKey | 'todos'>('todos');
  const [isFilterPickerOpen, setIsFilterPickerOpen] = useState(false);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchAdminVersoes()
      .then((data) => {
        if (isActive) setVersoesData(data);
      })
      .catch((err) => {
        if (isActive) setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar as versões.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const tipos = versoesData?.tipos ?? [];
  const filterOptions = ['Todos', ...tipos.map((tipo) => tipo.label ?? tipo.key)];
  const selectedFilterLabel =
    tipoFiltro === 'todos' ? 'Todos' : tipos.find((tipo) => tipo.key === tipoFiltro)?.label ?? 'Todos';

  const filteredVersoes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const versoes = versoesData?.versoes ?? [];
    return versoes
      .map((versao) => {
        const versionMatchesQuery =
          !query ||
          (versao.rotulo ?? '').toLowerCase().includes(query) ||
          (versao.versao ?? '').toLowerCase().includes(query);
        const itens = versao.itens.filter((item) => {
          if (tipoFiltro !== 'todos' && item.tipo !== tipoFiltro) return false;
          if (!query || versionMatchesQuery) return true;
          return (
            (item.titulo ?? '').toLowerCase().includes(query) || (item.descricao ?? '').toLowerCase().includes(query)
          );
        });
        return { ...versao, itens };
      })
      .filter((versao) => versao.itens.length > 0);
  }, [versoesData, search, tipoFiltro]);

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

        <Text style={[adminStyles.integrationDescription, { marginBottom: 12 }]}>
          Histórico de novos módulos, melhorias, correções e ajustes de segurança aplicados ao AF 360. As mudanças de
          schema também ficam registradas em <Text style={adminStyles.mdInlineCode}>docs/database-changelog.md</Text>.
        </Text>

        {isLoading ? (
          <AdminEmptyState message="Carregando versões..." />
        ) : errorMessage ? (
          <AdminEmptyState message={errorMessage} />
        ) : (
          <>
            <View style={adminStyles.miniStatRow}>
              {tipos.map((tipo) => {
                const tipoStyle = ADMIN_VERSAO_TIPO_STYLE[tipo.key] ?? ADMIN_VERSAO_TIPO_FALLBACK;
                return (
                  <View key={tipo.key} style={[adminStyles.miniStatCard, { backgroundColor: tipoStyle.bg }]}>
                    <Text style={[adminStyles.miniStatValue, { color: tipoStyle.color }]}>
                      {versoesData?.totais[tipo.key] ?? 0}
                    </Text>
                    <Text style={[adminStyles.miniStatLabel, { color: tipoStyle.color }]} numberOfLines={2}>
                      {tipo.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <View style={[adminStyles.searchRow, { flex: 1, marginBottom: 0 }]}>
                <Feather name="search" size={16} color="#9AA1B5" />
                <TextInput
                  style={adminStyles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar nas versões..."
                  placeholderTextColor="#A7AEC2"
                />
              </View>
              <Pressable style={adminStyles.filterPill} onPress={() => setIsFilterPickerOpen(true)}>
                <Feather name="filter" size={13} color="#4C5470" />
                <Text style={adminStyles.filterPillText} numberOfLines={1}>
                  Filtrar: {selectedFilterLabel}
                </Text>
              </Pressable>
            </View>

            {filteredVersoes.length === 0 ? (
              <AdminEmptyState message="Nenhuma versão encontrada." />
            ) : (
              filteredVersoes.map((versao, vIndex) => (
                <View
                  key={versao.versao ?? vIndex}
                  style={[
                    adminStyles.sectionCard,
                    styles.spacingTop,
                    vIndex === filteredVersoes.length - 1 ? adminStyles.lastSectionCard : null,
                  ]}
                >
                  <View style={adminStyles.releaseHeaderRow}>
                    <Text style={adminStyles.subsectionTitle}>
                      {versao.versao} · {formatAdminDate(versao.data)}
                    </Text>
                    {versao.destaque ? <AdminColorPill label="DESTAQUE" bg={RED_BG} color={RED} /> : null}
                  </View>
                  <Text style={adminStyles.sectionTitle}>{versao.rotulo}</Text>

                  {versao.itens.map((item, index) => {
                    const tipoStyle = item.tipo
                      ? ADMIN_VERSAO_TIPO_STYLE[item.tipo] ?? ADMIN_VERSAO_TIPO_FALLBACK
                      : ADMIN_VERSAO_TIPO_FALLBACK;
                    const tipoLabel = tipos.find((tipo) => tipo.key === item.tipo)?.label ?? item.tipo ?? '—';
                    return (
                      <View
                        key={`${versao.versao}-${index}`}
                        style={[adminStyles.releaseItem, index === versao.itens.length - 1 ? { marginBottom: 0 } : null]}
                      >
                        <View style={adminStyles.releaseItemHeaderRow}>
                          <View style={[styles.iconShell, { width: 30, height: 30, backgroundColor: tipoStyle.bg }]}>
                            <Feather name={tipoStyle.icon} size={14} color={tipoStyle.color} />
                          </View>
                          <Text style={adminStyles.releaseItemTitle} numberOfLines={2}>
                            {item.titulo}
                          </Text>
                          <AdminColorPill label={tipoLabel} bg={tipoStyle.bg} color={tipoStyle.color} />
                        </View>
                        {item.descricao ? (
                          <Text style={adminStyles.integrationDescription}>{item.descricao}</Text>
                        ) : null}
                        {item.detalhes.length > 0 ? (
                          <View style={{ marginTop: 6 }}>
                            {item.detalhes.map((detalhe, dIndex) => (
                              <View key={dIndex} style={adminStyles.mdBulletRow}>
                                <Text style={adminStyles.mdBulletDot}>•</Text>
                                <Text style={adminStyles.mdBulletText}>{detalhe}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <AdminSimplePickerModal
        visible={isFilterPickerOpen}
        title="Filtrar por categoria"
        options={filterOptions}
        selectedValue={selectedFilterLabel}
        onSelect={(label) => {
          if (label === 'Todos') {
            setTipoFiltro('todos');
            return;
          }
          const found = tipos.find((tipo) => (tipo.label ?? tipo.key) === label);
          setTipoFiltro(found ? found.key : 'todos');
        }}
        onClose={() => setIsFilterPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// 12. Notificações (Rotinas / Templates)
// ============================================================================
// Conectado ao backend real confirmado pela Lovable em 30/07/2026: rotinas
// moram numa tabela por módulo (<modulo>_notificacoes) e templates numa
// tabela única (notif_templates, filtrada por coluna modulo).
//
// modulo='admin' confirmado pela Lovable como o painel Administrador (existe
// também 'adm' = módulo Administrativo, área de negócio separada e distinta
// desta tela — não confundir). admin_notificacoes está vazia hoje, sem dado
// legado a migrar.
const ADMIN_NOTIF_MODULO = 'admin';

const ADMIN_NOTIF_AUDIENCE_TO_DB: Record<NotificationAudienceType, AdminNotifPublicoTipo> = {
  todos: 'todos',
  colaboradores: 'colaboradores',
  posto: 'postos',
  cargo: 'cargos',
};
const ADMIN_NOTIF_AUDIENCE_FROM_DB: Record<AdminNotifPublicoTipo, NotificationAudienceType> = {
  todos: 'todos',
  colaboradores: 'colaboradores',
  postos: 'posto',
  cargos: 'cargo',
};

function adminNotifTemplateToLocal(item: AdminNotifTemplateItem): NotificationTemplateItem {
  return {
    id: item.id,
    title: item.nome || item.codigo || '',
    code: item.codigo ?? '',
    messageTitle: item.titulo ?? '',
    message: item.mensagem ?? '',
    variables: item.variaveis,
    isSystemDefault: item.isPadrao,
  };
}

function adminNotifRoutineToLocal(
  item: AdminNotifRotinaItem,
  realTemplates: AdminNotifTemplateItem[]
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
    audienceType: ADMIN_NOTIF_AUDIENCE_FROM_DB[item.publicoTipo] ?? 'todos',
    audienceCargos: item.publicoTipo === 'cargos' ? item.publicoIds : [],
    lastRunLabel: item.ultimaExecucao ? formatAdminDate(item.ultimaExecucao) : '—',
    enabled: item.isActive,
  };
}

function adminNotifRoutineToWriteBody(
  local: NotificationRoutineItem,
  realTemplates: AdminNotifTemplateItem[]
): AdminNotifRotinaWriteBody {
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
    publico_tipo: ADMIN_NOTIF_AUDIENCE_TO_DB[local.audienceType],
    publico_ids: local.audienceType === 'cargo' ? local.audienceCargos : [],
  };
}

function adminNotifTemplateToWriteBody(local: NotificationTemplateItem): AdminNotifTemplateWriteBody {
  return {
    modulo: ADMIN_NOTIF_MODULO,
    codigo: local.code,
    nome: local.title,
    titulo: local.messageTitle,
    mensagem: local.message,
    variaveis: local.variables,
  };
}

export function AdminNotificationsScreen({ navigation }: ScreenProps<'AdminNotifications'>) {
  const { identity } = useContext(AuthIdentityContext);
  const actorId = identity?.profileId;

  const [activeTab, setActiveTab] = useState<'routines' | 'templates'>('routines');

  const [realRoutines, setRealRoutines] = useState<AdminNotifRotinaItem[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [routinesError, setRoutinesError] = useState<string | null>(null);
  const [isRoutineFormOpen, setIsRoutineFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<NotificationRoutineItem | null>(null);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);

  const [realTemplates, setRealTemplates] = useState<AdminNotifTemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateItem | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const loadTemplates = useCallback(() => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);
    fetchAdminNotifTemplates({ modulo: ADMIN_NOTIF_MODULO })
      .then((data) => setRealTemplates(data.templates))
      .catch((err) =>
        setTemplatesError(err instanceof Error ? err.message : 'Não foi possível carregar os templates.')
      )
      .finally(() => setIsLoadingTemplates(false));
  }, []);

  const loadRoutines = useCallback(() => {
    setIsLoadingRoutines(true);
    setRoutinesError(null);
    fetchAdminNotifRotinas(ADMIN_NOTIF_MODULO)
      .then((data) => setRealRoutines(data.rotinas))
      .catch((err) => setRoutinesError(err instanceof Error ? err.message : 'Não foi possível carregar as rotinas.'))
      .finally(() => setIsLoadingRoutines(false));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  const templates = useMemo(() => realTemplates.map(adminNotifTemplateToLocal), [realTemplates]);
  const routines = useMemo(
    () => realRoutines.map((item) => adminNotifRoutineToLocal(item, realTemplates)),
    [realRoutines, realTemplates]
  );

  const toggleRoutine = (id: string) => {
    const target = realRoutines.find((item) => item.id === id);
    if (!target) return;
    setRealRoutines((current) =>
      current.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item))
    );
    updateAdminNotifRotina(ADMIN_NOTIF_MODULO, id, { ativa: !target.isActive }, actorId).catch((err) => {
      showAdminApiError(err, 'Não foi possível atualizar a rotina.');
      loadRoutines();
    });
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
    const body = adminNotifRoutineToWriteBody(routine, realTemplates);
    const isExisting = realRoutines.some((item) => item.id === routine.id);
    setIsSavingRoutine(true);
    const request = isExisting
      ? updateAdminNotifRotina(ADMIN_NOTIF_MODULO, routine.id, body, actorId)
      : createAdminNotifRotina(ADMIN_NOTIF_MODULO, body, actorId);
    request
      .then(() => {
        setIsRoutineFormOpen(false);
        loadRoutines();
      })
      .catch((err) => showAdminApiError(err, 'Não foi possível salvar a rotina.'))
      .finally(() => setIsSavingRoutine(false));
  };

  const handleRunRoutine = (routine: NotificationRoutineItem) => {
    executarAdminNotifRotina(ADMIN_NOTIF_MODULO, routine.id, actorId)
      .then(() => {
        Alert.alert('Rotina executada', `"${routine.title}" foi executada agora.`);
        loadRoutines();
      })
      .catch((err) => showAdminApiError(err, 'Não foi possível executar a rotina.'));
  };

  const handleDeleteRoutine = (routine: NotificationRoutineItem) => {
    Alert.alert('Excluir rotina', `Tem certeza que deseja excluir "${routine.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAdminNotifRotina(ADMIN_NOTIF_MODULO, routine.id, actorId)
            .then(() => loadRoutines())
            .catch((err) => showAdminApiError(err, 'Não foi possível excluir a rotina.'));
        },
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
    const body = adminNotifTemplateToWriteBody(template);
    const isExisting = realTemplates.some((item) => item.id === template.id);
    setIsSavingTemplate(true);
    const request = isExisting
      ? updateAdminNotifTemplate(template.id, body, actorId)
      : createAdminNotifTemplate(body, actorId);
    request
      .then(() => {
        setIsTemplateFormOpen(false);
        loadTemplates();
      })
      .catch((err) => showAdminApiError(err, 'Não foi possível salvar o template.'))
      .finally(() => setIsSavingTemplate(false));
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
              <Text style={styles.directorNotifCountLabel}>
                {isLoadingRoutines ? 'Carregando...' : `${routines.length} rotina(s) cadastrada(s)`}
              </Text>
              <Pressable style={styles.directorNotifNewButton} onPress={openCreateRoutineModal}>
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={styles.directorNotifNewButtonText}>Nova rotina</Text>
              </Pressable>
            </View>

            {isLoadingRoutines ? (
              <AdminEmptyState message="Carregando rotinas..." />
            ) : routinesError ? (
              <AdminEmptyState message={routinesError} />
            ) : routines.length === 0 ? (
              <AdminEmptyState message="Nenhuma rotina cadastrada. Clique em Nova rotina." />
            ) : (
              routines.map((routine) => {
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
                    : notificationAudienceOptions.find((option) => option.value === routine.audienceType)?.label ??
                      'Todos os colaboradores';

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
                          routine.triggerKind === 'recorrente' ? styles.routineTagRecurring : styles.routineTagEvent,
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
                          {routine.lastRunLabel === '—' ? 'Nunca executada' : `Última exec.: ${routine.lastRunLabel}`}
                        </Text>
                      </View>
                      <View style={styles.routineActionsRow}>
                        <Pressable style={styles.routineActionButton} onPress={() => handleRunRoutine(routine)} hitSlop={6}>
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
              })
            )}
          </>
        ) : (
          <>
            <View style={styles.directorNotifHeaderRow}>
              <Text style={styles.directorNotifCountLabel}>
                {isLoadingTemplates
                  ? 'Carregando...'
                  : `${templates.length} template(s)${
                      templates.length > 0 ? ' — ⭐ padrão do sistema, demais customizados' : ''
                    }`}
              </Text>
              <Pressable style={styles.directorNotifNewButton} onPress={openCreateTemplateModal}>
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={styles.directorNotifNewButtonText}>Novo template</Text>
              </Pressable>
            </View>

            {isLoadingTemplates ? (
              <AdminEmptyState message="Carregando templates..." />
            ) : templatesError ? (
              <AdminEmptyState message={templatesError} />
            ) : templates.length === 0 ? (
              <AdminEmptyState message="Nenhum template cadastrado ainda." />
            ) : (
              templates.map((template) => (
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
                        <Text style={styles.templateTagText}>{variable}</Text>
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
// Conectado à tabela real audit_log (liberada pelo Lovable em 30/07/2026 —
// imutável, só leitura). Busca livre é feita no app sobre os registros já
// carregados, igual ao combinado com eles.

function formatAdminLogDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

function formatAdminLogJson(data: unknown): string {
  if (data === null || data === undefined) return '—';
  try {
    const text = JSON.stringify(data, null, 2);
    return text && text !== '{}' && text !== 'null' ? text : '—';
  } catch {
    return '—';
  }
}

function AdminLogDetailModal({
  visible,
  log,
  onClose,
}: {
  visible: boolean;
  log: AdminLogItem | null;
  onClose: () => void;
}) {
  if (!log) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.requestModalBackdrop}>
        <View style={styles.requestModalCard}>
          <View style={styles.requestModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.requestModalTitle} numberOfLines={1}>
                Log • {log.action ?? '—'}
              </Text>
              <Text style={adminStyles.detailSubEmail}>{formatAdminDate(log.createdAt)}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="#677089" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={adminStyles.detailGridRow}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>AÇÃO</Text>
                <Text style={adminStyles.detailFieldValue}>{log.action ?? '—'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>DATA</Text>
                <Text style={adminStyles.detailFieldValue}>{formatAdminDate(log.createdAt)}</Text>
              </View>
            </View>

            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>MÓDULO</Text>
                <Text style={adminStyles.detailFieldValue}>{log.moduleSlug ?? '—'}</Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>TABELA</Text>
                <Text style={adminStyles.detailFieldValue}>{log.tableName ?? '—'}</Text>
              </View>
            </View>

            <View style={[adminStyles.detailGridRow, styles.spacingTop]}>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>USUÁRIO (ID)</Text>
                <Text style={adminStyles.detailFieldValue} numberOfLines={1}>
                  {log.userId ?? '—'}
                </Text>
              </View>
              <View style={adminStyles.detailGridItem}>
                <Text style={adminStyles.detailFieldLabel}>IP</Text>
                <Text style={adminStyles.detailFieldValue}>{log.ipAddress ?? '—'}</Text>
              </View>
            </View>

            <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>REGISTRO (ID)</Text>
            <Text style={adminStyles.detailFieldValue} numberOfLines={1}>
              {log.recordId ?? '—'}
            </Text>

            <Text style={[adminStyles.detailFieldLabel, styles.spacingTop]}>DADOS ANTERIORES</Text>
            <View style={adminStyles.mdCodeBlock}>
              <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <Text style={adminStyles.mdCodeBlockText}>{formatAdminLogJson(log.oldData)}</Text>
              </ScrollView>
            </View>

            <Text style={adminStyles.detailFieldLabel}>DADOS NOVOS</Text>
            <View style={adminStyles.mdCodeBlock}>
              <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <Text style={adminStyles.mdCodeBlockText}>{formatAdminLogJson(log.newData)}</Text>
              </ScrollView>
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

export function AdminLogsScreen({ navigation }: ScreenProps<'AdminLogs'>) {
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AdminLogItem | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);
    fetchAdminLogs()
      .then((data) => {
        if (isActive) setLogs(data.logs);
      })
      .catch((err) => {
        if (isActive) setErrorMessage(err instanceof Error ? err.message : 'Não foi possível carregar os logs.');
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
    if (!query) return logs;
    return logs.filter(
      (log) =>
        (log.action ?? '').toLowerCase().includes(query) ||
        (log.moduleSlug ?? '').toLowerCase().includes(query) ||
        (log.tableName ?? '').toLowerCase().includes(query)
    );
  }, [logs, search]);

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
          icon="file-text"
          title="Logs"
          subtitle={isLoading ? 'Carregando...' : `Auditoria · ${logs.length} registro(s)`}
        />

        <AdminSearchRow value={search} onChangeText={setSearch} placeholder="Buscar por ação, módulo, tabela..." />

        {isLoading ? (
          <AdminEmptyState message="Carregando logs..." />
        ) : errorMessage ? (
          <AdminEmptyState message={errorMessage} />
        ) : filtered.length === 0 ? (
          <AdminEmptyState message="Nenhum registro encontrado." />
        ) : (
          filtered.map((log, index) => (
            <Pressable
              key={log.id}
              style={[adminStyles.logCard, index === filtered.length - 1 ? { marginBottom: 0 } : null]}
              onPress={() => setSelectedLog(log)}
            >
              <View style={adminStyles.logHeaderRow}>
                <Text style={adminStyles.logAction} numberOfLines={1}>
                  {log.action}
                </Text>
                <Text style={adminStyles.logWhen}>{formatAdminLogDateTime(log.createdAt)}</Text>
              </View>
              <View style={adminStyles.roleModulesRow}>
                {log.moduleSlug ? <AdminTagPill label={log.moduleSlug} /> : null}
                {log.tableName ? <AdminTagPill label={log.tableName} /> : null}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <AdminLogDetailModal visible={selectedLog !== null} log={selectedLog} onClose={() => setSelectedLog(null)} />
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
    position: 'relative',
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
  monthBarTooltip: {
    position: 'absolute',
    bottom: 104,
    left: '50%',
    transform: [{ translateX: -55 }],
    width: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E4E7F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  monthBarTooltipMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 2,
  },
  monthBarTooltipValue: {
    fontSize: 11,
    color: '#5E667D',
  },
  monthBarTooltipValueNumber: {
    fontWeight: '700',
    color: BLUE,
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
  waProviderTabBarWrap: {
    position: 'relative',
  },
  waProviderTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
    marginRight: 22,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  waProviderTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6F768A',
  },
  waProviderTabTextActive: {
    fontWeight: '800',
  },
  waProviderTabDivider: {
    height: 1,
    backgroundColor: '#E2E6F0',
    marginTop: -1,
    marginBottom: 14,
  },
  waFadeEdge: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 10,
    width: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  waFadeChevron: {
    position: 'absolute',
    right: 0,
  },
  waSubTabItem: {
    paddingBottom: 10,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  waSubTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6F768A',
  },
  waSubTabTextActive: {
    color: GREEN,
    fontWeight: '800',
  },
  integrationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  integrationHint: {
    marginTop: 6,
    color: '#9AA1B5',
    fontSize: 11,
  },
  integrationInfoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: BLUE_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  integrationInfoText: {
    flex: 1,
    color: '#3A4160',
    fontSize: 12,
    lineHeight: 18,
  },
  integrationBullet: {
    color: '#4C5470',
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 6,
  },
  staticFieldIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gmbTableHeaderRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E6F0',
  },
  gmbTableHeaderCell: {
    color: '#9AA1B5',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  gmbTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F7',
  },
  gmbTableCell: {
    color: '#3A4160',
    fontSize: 12.5,
  },
  gmbLinkText: {
    color: BLUE,
    fontSize: 12.5,
    fontWeight: '700',
  },
  tokenEyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6F0',
    padding: 14,
  },
  templateCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  templateCardName: {
    color: '#15203E',
    fontSize: 14,
    fontWeight: '800',
  },
  templateCardBody: {
    color: '#4C5470',
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 12,
  },
  templateCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateTestButton: {
    borderWidth: 1,
    borderColor: '#DDE4F0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  templateTestButtonText: {
    color: '#15203E',
    fontSize: 12,
    fontWeight: '700',
  },
  subProviderPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  subProviderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  subProviderPillActive: {
    backgroundColor: '#15203E',
    borderColor: '#15203E',
  },
  subProviderPillText: {
    color: '#4C5470',
    fontSize: 12.5,
    fontWeight: '700',
  },
  subProviderPillTextActive: {
    color: '#FFFFFF',
  },
  serviceCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  serviceCardCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#9AA1B5',
    fontSize: 11,
    marginTop: 4,
  },
  // Cabeçalho de seção com título (+ pill opcional) à esquerda e um botão de
  // ação à direita, ambos permitidos a quebrar linha em telas estreitas —
  // substitui o padrão antigo (título flex:1 ao lado de outlineButton/
  // primaryButtonGreen, que também tem flex:1 e "disputa" largura com o
  // título, causando sobreposição em telas de celular).
  headerRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 14,
  },
  monthNavLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    letterSpacing: 0.4,
  },
  headerRowTitleWrap: {
    flex: 1,
    flexBasis: 180,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  // Botões de ação que NÃO devem dividir a linha em partes iguais (ao
  // contrário de primaryButtonGreen/outlineButton, que têm flex:1) — usados
  // em linhas com 1 a 3 botões de tamanhos bem diferentes (ex.: "Testar
  // conexão" + "Documentação Infosimples"). A linha quebra normalmente
  // quando não cabe tudo.
  pillButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  pillButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexGrow: 0,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#DDE4F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pillButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    gap: 6,
    marginBottom: 14,
  },
  miniStatCard: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  miniStatLabel: {
    marginTop: 2,
    fontSize: 8.5,
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
