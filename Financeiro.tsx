import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles, TopBar, financeiroUser, financeiroUserInitials } from './App';
import type { ScreenProps } from './App';

// ---------- Financeiro (Gestão de Caixa) ----------
// Perfil novo (21/08/2026). Ainda SEM integração real com o banco — mensagem
// detalhada enviada à Lovable perguntando pelas tabelas/campos reais de
// contas a pagar/receber, fluxo de caixa, conciliação, balancete/DRE,
// fornecedores, centros de custo, contas bancárias, IA de lançamentos
// previstos, projeções e relatórios (arquivo
// mensagem-lovable-financeiro.txt). Enquanto não vier a confirmação, cada
// tela mostra um estado honesto de "aguardando integração" — NUNCA número ou
// lista inventada. Assim que a Lovable confirmar cada recurso, essas telas
// são substituídas uma a uma pelo mesmo padrão usado em RH/Diretoria
// (lovable.js -> routes -> api.ts -> tela real).

function FinanceiroPageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={fnStyles.pageHeaderRow}>
      <View style={fnStyles.pageHeaderIconShell}>
        <Feather name={icon} size={20} color="#C05621" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={fnStyles.pageHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={fnStyles.pageHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function FinanceiroPendingState({ message }: { message: string }) {
  return (
    <View style={fnStyles.pendingCard}>
      <Feather name="clock" size={22} color="#C05621" />
      <Text style={fnStyles.pendingText}>{message}</Text>
    </View>
  );
}

function FinanceiroPlaceholderScreen({
  navigation,
  icon,
  title,
  subtitle,
  pendingMessage,
}: {
  navigation: { navigate: (route: 'FinanceiroProfile') => void };
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  pendingMessage: string;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar
          initials={financeiroUserInitials}
          variant="financeiro"
          onAvatarPress={() => navigation.navigate('FinanceiroProfile')}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader icon={icon} title={title} subtitle={subtitle} />
        <FinanceiroPendingState message={pendingMessage} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function FinanceiroDashboardScreen({ navigation }: ScreenProps<'FinanceiroDashboard'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="grid"
      title="Dashboard"
      subtitle="Contas a receber, contas a pagar, saldo e projeções da rede."
      pendingMessage="Aguardando a Lovable confirmar a origem dos KPIs (contas a receber/pagar do dia, saldo) e dos gráficos de curva financeira e projeção, pra ligar este dashboard ao banco real."
    />
  );
}

export function FinanceiroContasAPagarScreen({ navigation }: ScreenProps<'FinanceiroContasAPagar'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="arrow-down-circle"
      title="Contas a Pagar"
      subtitle="Títulos a pagar por vencimento, fornecedor e centro de custo."
      pendingMessage="Aguardando a Lovable confirmar a tabela real de contas a pagar (nome e campos exatos: fornecedor, posto, centro de custo, status, valor, vencimento)."
    />
  );
}

export function FinanceiroContasAReceberScreen({ navigation }: ScreenProps<'FinanceiroContasAReceber'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="arrow-up-circle"
      title="Contas a Receber"
      subtitle="Recebíveis por vencimento, cliente e posto."
      pendingMessage="Aguardando a Lovable confirmar a tabela real de contas a receber (cliente, categoria, status, valor, vencimento)."
    />
  );
}

export function FinanceiroFluxoCaixaScreen({ navigation }: ScreenProps<'FinanceiroFluxoCaixa'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="file"
      title="Fluxo de Caixa"
      subtitle="Entradas, saídas e saldo diário consolidado da rede."
      pendingMessage="Aguardando a Lovable confirmar a tabela de movimentações bancárias e como o saldo atual por conta é calculado."
    />
  );
}

export function FinanceiroConciliacaoScreen({ navigation }: ScreenProps<'FinanceiroConciliacao'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="archive"
      title="Conciliação"
      subtitle="Conciliação bancária entre extratos e lançamentos do sistema."
      pendingMessage="Aguardando a Lovable confirmar a tabela de movimentos do extrato, como a 'sugestão' de vínculo é calculada e o endpoint de vincular manualmente."
    />
  );
}

export function FinanceiroBalanceteDreScreen({ navigation }: ScreenProps<'FinanceiroBalanceteDre'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="bar-chart-2"
      title="Balancete / DRE"
      subtitle="Entradas, saídas e resultado — mês a mês, por posto ou rede toda."
      pendingMessage="Aguardando a Lovable descrever o formato real do balancete/DRE (linhas, colunas, regime de caixa vs. competência)."
    />
  );
}

export function FinanceiroFornecedoresScreen({ navigation }: ScreenProps<'FinanceiroFornecedores'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="briefcase"
      title="Fornecedores"
      subtitle="Cadastro de fornecedores, condições e dados de pagamento."
      pendingMessage="Aguardando a Lovable confirmar a tabela de fornecedores e como ela se relaciona com as contas a pagar."
    />
  );
}

export function FinanceiroCentrosCustoScreen({ navigation }: ScreenProps<'FinanceiroCentrosCusto'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="layers"
      title="Centros de Custo"
      subtitle="Estrutura de centros de custo e rateio por unidade."
      pendingMessage="Aguardando a Lovable confirmar a tabela de centros de custo (somente leitura, cadastro fica no sistema Quality)."
    />
  );
}

export function FinanceiroContasBancariasScreen({ navigation }: ScreenProps<'FinanceiroContasBancarias'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="credit-card"
      title="Contas Bancárias"
      subtitle="Contas bancárias das unidades e saldos de referência."
      pendingMessage="Aguardando a Lovable confirmar a tabela de contas bancárias e o significado exato da coluna OFX."
    />
  );
}

export function FinanceiroInteligenciaIAScreen({ navigation }: ScreenProps<'FinanceiroInteligenciaIA'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="zap"
      title="Inteligência IA"
      subtitle="Lançamentos previstos pela IA a partir do histórico de cada posto."
      pendingMessage="Aguardando a Lovable confirmar como as sugestões são geradas (job periódico ou RPC sob demanda) e os endpoints de confirmar/descartar uma sugestão."
    />
  );
}

export function FinanceiroProjecoesScreen({ navigation }: ScreenProps<'FinanceiroProjecoes'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="trending-up"
      title="Projeções"
      subtitle="Faturamento e pagamentos projetados para os próximos meses."
      pendingMessage="Aguardando a Lovable confirmar a view/RPC de projeção de caixa (parâmetros de posto e horizonte em meses)."
    />
  );
}

export function FinanceiroRelatoriosScreen({ navigation }: ScreenProps<'FinanceiroRelatorios'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="file-text"
      title="Relatórios"
      subtitle="Relatórios financeiros e exportações por período."
      pendingMessage="Aguardando a integração das telas de Contas a Pagar/Receber, Conciliação, Fornecedores e Centros de Custo pra gerar os 4 relatórios (Excel/PDF) a partir dos dados reais."
    />
  );
}

export function FinanceiroNotificationsScreen({ navigation }: ScreenProps<'FinanceiroNotifications'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="bell"
      title="Notificações"
      subtitle="Envio de notificações via App, E-mail e WhatsApp."
      pendingMessage="Aguardando a Lovable confirmar se as rotinas/templates de notificação do módulo Financeiro usam o mesmo endpoint já usado por RH/Diretoria (só filtrando por módulo) ou uma tabela própria."
    />
  );
}

export function FinanceiroConfiguracoesScreen({ navigation }: ScreenProps<'FinanceiroConfiguracoes'>) {
  return (
    <FinanceiroPlaceholderScreen
      navigation={navigation}
      icon="settings"
      title="Configurações"
      subtitle="Parâmetros do módulo Financeiro e integrações."
      pendingMessage="Aguardando a Lovable confirmar se a chave de integração Quality e os postos vinculados são os mesmos já usados em RH/Diretoria ou uma configuração própria do Financeiro."
    />
  );
}

export function FinanceiroProfileScreen({ navigation }: ScreenProps<'FinanceiroProfile'>) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarContainer}>
        <TopBar initials={financeiroUserInitials} variant="financeiro" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FinanceiroPageHeader icon="user" title="Meu Perfil" subtitle={financeiroUser.accessLabel} />
        <View style={fnStyles.profileCard}>
          <View style={fnStyles.profileAvatarShell}>
            <Text style={fnStyles.profileAvatarText}>{financeiroUserInitials}</Text>
          </View>
          <Text style={fnStyles.profileName}>{financeiroUser.fullName}</Text>
          <Text style={fnStyles.profileRole}>{financeiroUser.roleAndUnit}</Text>

          <View style={fnStyles.profileFieldRow}>
            <Feather name="mail" size={14} color="#7C8397" />
            <Text style={fnStyles.profileFieldText}>{financeiroUser.email}</Text>
          </View>
          <View style={fnStyles.profileFieldRow}>
            <Feather name="phone" size={14} color="#7C8397" />
            <Text style={fnStyles.profileFieldText}>{financeiroUser.phone}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const fnStyles = StyleSheet.create({
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
    backgroundColor: '#FCEDE1',
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
  pendingCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3DEC6',
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  pendingText: {
    color: '#8A5A2B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
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
    backgroundColor: '#C05621',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
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
