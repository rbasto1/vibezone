import type { Metadata, NextPage } from "next";

import type { ProviderPrivacyInfo } from "@/generated/providers-privacy";
import { providersPrivacy } from "@/generated/providers-privacy";
import { siteDomain, siteName } from "@/lib/branding";
import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { ItemList, SectionHeader, SectionSubheader } from "../text";

const title = `Política de Privacidade | ${siteName}`;

export const metadata: Metadata = {
  title,
  description: `Saiba como o ${siteName} protege sua privacidade e trata seus dados. Nossa política explica as práticas de coleta, uso e proteção de informações.`,
  keywords: [
    "política de privacidade",
    "proteção de dados",
    `privacidade ${siteName}`,
    "dados do usuário",
    "termos de privacidade",
  ],
  openGraph: {
    title,
    description: `Saiba como o ${siteName} protege sua privacidade e trata seus dados.`,
    type: "website",
    url: "/privacy",
  },
};

const PrivacyPagePtBR: NextPage = () => {
  const nameFull =
    siteDomain === "multipla.ia.br" ? "Multipla.ia.br" : "Vibezone.ai";
  const supportEmail =
    siteDomain === "multipla.ia.br"
      ? "support@multipla.ia.br"
      : "support@vibezone.ai";

  return (
    <article className="mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Política de Privacidade
        </h1>
        <p className="text-muted-foreground italic">
          Última atualização: 24 de setembro de 2025
        </p>
      </header>

      <main className="[&>section>p]:mt-3">
        <section>
          <SectionSubheader>Resumo</SectionSubheader>
          <p>Em poucas palavras:</p>
          <ItemList>
            <li>
              Mantemos um registro dos seus chats para que você possa revisitá-los no seu histórico.
            </li>
            <li>
              Nós <strong>não</strong> usamos seus chats para treinar modelos de IA.
            </li>
            <li>
              Os provedores de modelos com os quais nos conectamos (como OpenAI, Anthropic, Google) podem usar as conversas para o próprio treinamento, a menos que você opte por sair diretamente com eles.
            </li>
            <li>
              Exibimos avisos em nosso Serviço quando isso pode acontecer, mas eles são fornecidos apenas como melhor esforço. Para obter informações oficiais, consulte a política de privacidade e os termos de uso do provedor (veja a seção <ProviderPoliciesLink /> abaixo).
            </li>
            <li>
              Podemos usar metadados agregados e não identificáveis (como uso do modelo, tempo de resposta ou avaliações) para melhorar o Serviço e sugerir modelos mais adequados às suas necessidades.
            </li>
            <li>Não vendemos suas informações pessoais.</li>
          </ItemList>
        </section>

        <section>
          <SectionHeader num={null}>Introdução</SectionHeader>
          <p>
            {nameFull} ("{siteName}", "nós", "nosso" ou "nos") valoriza sua confiança e leva sua privacidade a sério. Esta Política de Privacidade explica como tratamos as informações pessoais coletadas quando você usa nosso site, aplicativos e serviços (conjuntamente, o "Serviço"). Ela também descreve as escolhas disponíveis a você em relação aos seus dados.
          </p>
          <p>Esta Política de Privacidade se aplica sempre que você:</p>
          <ItemList>
            <li>
              Visita nosso site em https://www.{siteDomain} e quaisquer páginas relacionadas que apontem para esta Política de Privacidade (o "Site");
            </li>
            <li>
              Usa ou interage com o Serviço, inclusive por meio de aplicativos integrados ou plataformas de terceiros que façam referência a esta Política de Privacidade.
            </li>
          </ItemList>
          <p>
            Ao acessar ou usar nosso Site ou Serviço, você concorda com esta Política de Privacidade e com nossos
            {" "}
            <Link href="/terms" className="underline">
              Termos de Serviço
              <ArrowUpRightIcon className="inline size-3 mb-1 ml-1" />
            </Link>
            . Se você não concorda, não deve usar o Site ou o Serviço. Leia ambos os documentos com atenção antes de prosseguir.
          </p>
          <p>
            Podemos atualizar esta Política de Privacidade periodicamente. Quando fizermos alterações, revisaremos a data de "Última atualização" no topo da página e publicaremos a versão revisada em nosso Site. Se as mudanças forem significativas e afetarem como tratamos os dados de usuários registrados, notificaremos você com antecedência (por exemplo, por e-mail). Seu uso contínuo do Site ou do Serviço após a entrada em vigor das alterações significa que você aceita a política atualizada.
          </p>
          <p>
            Podemos também fornecer avisos adicionais dentro do Serviço para explicar com mais detalhes como dados específicos são coletados, usados ou compartilhados. Esses avisos complementam esta Política de Privacidade e dão a você mais controle sobre suas informações.
          </p>
        </section>

        <section>
          <SectionHeader num={1}>Informações que Coletamos</SectionHeader>
          <p>
            Coletamos diferentes tipos de informações quando você usa {nameFull} ("Serviço"), algumas das quais podem ser consideradas dados pessoais pela legislação aplicável.
          </p>
          <SectionSubheader>Informações que Você Fornece</SectionSubheader>
          <ItemList>
            <li>
              <strong>Informações de Conta</strong>: quando você se registra, coletamos seu endereço de e-mail (via login por link ou login com Google). Se você usar o login com Google, podemos receber também seu nome e foto de perfil.
            </li>
            <li>
              <strong>Informações de Perfil</strong>: você pode optar por fornecer informações adicionais no seu perfil, como nome, cidade, idade ou gênero.
            </li>
            <li>
              <strong>Chats</strong>: armazenamos o conteúdo dos seus chats (entradas e saídas) para usuários logados, para que você possa ver seu histórico. Não usamos seus chats para treinar modelos de IA. Observe, porém, que os provedores terceirizados dos modelos podem usar os chats para treinamento; consulte <ProviderPoliciesLink />.
            </li>
            <li>
              <strong>Preferências</strong>: registramos os modelos que você usa, adiciona aos favoritos e se você "gosta" ou "não gosta" das respostas.
            </li>
            <li>
              <strong>Comunicações</strong>: se você entrar em contato conosco por e-mail ou pelo Serviço, podemos armazenar cópias dessa correspondência.
            </li>
          </ItemList>

          <SectionSubheader>Informações Coletadas Automaticamente</SectionSubheader>
          <p>
            Quando você usa o Serviço, podemos coletar automaticamente informações técnicas, como:
          </p>
          <ItemList>
            <li>
              Endereço IP, tipo de navegador, sistema operacional e informações sobre o dispositivo.
            </li>
            <li>
              Dados de uso, como quais modelos você utiliza, quanto tempo as respostas levam e relatórios de erros.
            </li>
            <li>
              Cookies ou tecnologias semelhantes que ajudam a mantê-lo conectado e a preservar a segurança da sessão. Nós <strong>não</strong> usamos cookies para publicidade ou rastreamento comportamental.
            </li>
          </ItemList>

          <SectionSubheader>Análises</SectionSubheader>
          <p>
            Podemos usar serviços de análise de terceiros (por exemplo, Google Analytics ou PostHog) para entender como o Serviço é utilizado e melhorar o desempenho. Esses serviços podem coletar informações como quais páginas você visita, como interage com o Site e identificadores básicos do dispositivo. Para mais detalhes, consulte as políticas de privacidade desses provedores.
          </p>
        </section>

        <section>
          <SectionHeader num={2}>Cookies e Tecnologias de Rastreamento</SectionHeader>
          <p>
            Como a maioria dos serviços online, {siteName} utiliza cookies e tecnologias semelhantes para operar e aprimorar nosso Serviço.
          </p>

          <SectionSubheader>Como Usamos Cookies</SectionSubheader>
          <p>Utilizamos cookies e tecnologias relacionadas para:</p>
          <ItemList>
            <li>
              <strong>Cookies essenciais</strong>: necessários para que o Site e o Serviço funcionem corretamente, como manter sua sessão ativa e garantir a segurança da conta.
            </li>
            <li>
              <strong>Cookies de preferência</strong>: para lembrar suas configurações ou detalhes de perfil que você decidir compartilhar (por exemplo, preferências de exibição).
            </li>
            <li>
              <strong>Cookies de análise</strong>: para entender como o Serviço é usado, diagnosticar problemas técnicos e melhorar o desempenho.
            </li>
          </ItemList>
          <p>Não usamos cookies para publicidade direcionada.</p>

          <SectionSubheader>Suas Escolhas</SectionSubheader>
          <ItemList>
            <li>
              <strong>Configurações do navegador</strong>: a maioria dos navegadores permite recusar ou excluir cookies. Se você fizer isso, algumas partes do Serviço podem não funcionar corretamente.
            </li>
            <li>
              <strong>Do Not Track / Global Privacy Control</strong>: {siteName} respeita os sinais padrão do navegador quando exigido por lei.
            </li>
            <li>
              <strong>Consentimento</strong>: ao usar {siteName}, você concorda com o uso de cookies conforme descrito aqui. Você pode retirar ou modificar seu consentimento a qualquer momento nas configurações do navegador.
            </li>
          </ItemList>
          <p>
            Para mais informações sobre cookies e como gerenciá-los, visite{" "}
            <a
              href="https://www.allaboutcookies.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.allaboutcookies.org
            </a>
            .
          </p>
        </section>

        <section>
          <SectionHeader num={3}>Como Usamos Suas Informações</SectionHeader>
          <p>
            Utilizamos as informações coletadas para fornecer e melhorar o Serviço, incluindo:
          </p>
          <ItemList>
            <li>
              <strong>Operação do Serviço</strong>: para oferecer acesso à interface de chat, manter sua conta e armazenar seu histórico de conversas.
            </li>
            <li>
              <strong>Comunicações</strong>: para enviar mensagens relacionadas à conta, como links de login, confirmações, avisos de segurança ou atualizações sobre mudanças no Serviço ou em nossas políticas.
            </li>
            <li>
              <strong>Melhoria e personalização</strong>: para analisar padrões de uso, coletar feedback e aprimorar a qualidade e o desempenho do Serviço. Por exemplo, podemos usar metadados agregados para sugerir modelos adequados a casos de uso específicos.
            </li>
            <li>
              <strong>Segurança e prevenção de abuso</strong>: para detectar, prevenir e tratar fraudes, abusos ou acessos não autorizados.
            </li>
            <li>
              <strong>Conformidade legal</strong>: para cumprir obrigações legais e fazer valer nossos Termos de Serviço.
            </li>
            <li>
              <strong>Outras finalidades informadas</strong>: qualquer outra finalidade indicada no momento da coleta ou com o seu consentimento.
            </li>
          </ItemList>

          <SectionSubheader>Dados Agregados e Desidentificados</SectionSubheader>
          <p>
            Podemos processar informações de forma agregada ou desidentificada (que não o identifiquem pessoalmente) para entender tendências gerais, medir desempenho e melhorar o Serviço. Podemos compartilhar esses insights agregados publicamente ou com parceiros, mas nunca de maneira que revele sua identidade individual.
          </p>
        </section>

        <section>
          <SectionHeader num={4}>Como Compartilhamos Suas Informações</SectionHeader>
          <p>
            Não vendemos suas informações pessoais. Podemos compartilhar seus dados apenas nas seguintes circunstâncias:
          </p>
          <ItemList>
            <li>
              <strong>Prestadores de serviço</strong>: contamos com fornecedores terceirizados confiáveis para operar o Serviço (por exemplo, hospedagem, autenticação, análises ou envio de e-mails). Esses provedores só podem processar seus dados em nosso nome e sob obrigações estritas de confidencialidade.
            </li>
            <li>
              <strong>Provedores de modelos</strong>: quando você envia uma mensagem pelo {siteName}, suas entradas são transmitidas ao provedor de modelo escolhido (como OpenAI ou Anthropic). Esses provedores tratam seus dados conforme as próprias políticas de privacidade (veja <ProviderPoliciesLink />).
            </li>
            <li>
              <strong>Obrigações legais</strong>: podemos divulgar informações se exigido por lei, regulamento, processo legal ou solicitação governamental, ou se acreditarmos ser necessário para proteger os direitos, a propriedade ou a segurança do {siteName}, de nossos usuários ou do público.
            </li>
            <li>
              <strong>Transações comerciais</strong>: se o {siteName} estiver envolvido em fusão, aquisição ou venda de ativos, seus dados pessoais poderão ser transferidos como parte dessa transação.
            </li>
            <li>
              <strong>Com o seu consentimento</strong>: em qualquer outra situação, compartilharemos suas informações apenas com o seu consentimento explícito.
            </li>
          </ItemList>
        </section>

        <section>
          <SectionHeader num={5}>Seus Direitos e Escolhas</SectionHeader>

          <SectionSubheader>Acesso, Atualização e Exclusão</SectionSubheader>
          <p>
            Você pode revisar e atualizar as informações no seu perfil a qualquer momento, fazendo login no Serviço. Se quiser excluir sua conta (incluindo seu histórico de chats), solicite pelo e-mail
            {" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Após confirmada, a exclusão não pode ser revertida, embora possamos reter informações limitadas quando exigido por lei ou por legítimos interesses (como segurança, prevenção a fraudes ou conformidade).
          </p>

          <SectionSubheader>Direitos sob Leis Aplicáveis</SectionSubheader>
          <p>
            Dependendo de onde você reside, pode ter direitos adicionais sobre seus dados pessoais, incluindo:
          </p>
          <ItemList>
            <li>
              <strong>Direito de saber</strong>: solicitar detalhes sobre as categorias de dados pessoais que coletamos e como são usados.
            </li>
            <li>
              <strong>Direito de acesso e portabilidade</strong>: solicitar uma cópia dos seus dados pessoais, em formato portátil quando tecnicamente viável.
            </li>
            <li>
              <strong>Direito de retificação</strong>: solicitar a correção de informações imprecisas.
            </li>
            <li>
              <strong>Direito de exclusão</strong>: solicitar que excluamos seus dados pessoais, sujeito a exceções legais.
            </li>
            <li>
              <strong>Direito de objeção ou restrição</strong>: contestar determinados tipos de processamento ou pedir que limitemos o uso das suas informações.
            </li>
            <li>
              <strong>Direito de retirar consentimento</strong>: quando o processamento se basear em consentimento, você pode retirá-lo a qualquer momento (sem afetar o processamento já realizado).
            </li>
            <li>
              <strong>Direito de não sofrer discriminação</strong>: se você exercer seus direitos de privacidade sob leis como a CCPA/CPRA.
            </li>
          </ItemList>

          <SectionSubheader>Como Exercitar Seus Direitos</SectionSubheader>
          <p>
            Para exercer seus direitos, entre em contato pelo e-mail
            {" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Podemos precisar verificar sua identidade antes de atender ao pedido. Quando permitido por lei, você também pode autorizar um agente a fazer solicitações em seu nome.
          </p>

          <SectionSubheader>Comunicações de Marketing</SectionSubheader>
          <p>
            Atualmente não enviamos e-mails promocionais ou de marketing. Se isso mudar no futuro, ofereceremos opções claras para você optar por não receber essas comunicações.
          </p>

          <SectionSubheader>Não Venda de Dados Pessoais</SectionSubheader>
          <p>
            Não "vendemos" seus dados pessoais conforme definido pelas leis aplicáveis, nem os compartilhamos para publicidade com base em contexto cruzado.
          </p>
        </section>

        <section>
          <SectionHeader num={6}>Segurança dos Dados</SectionHeader>
          <p>
            Utilizamos medidas técnicas, organizacionais e administrativas adequadas para proteger seus dados pessoais contra perda acidental e contra acesso, uso, alteração ou divulgação não autorizados. Todos os dados pessoais que você nos fornece são armazenados em servidores seguros protegidos por firewalls.
          </p>
          <p>
            A segurança da sua conta também depende de você. Se usar login com Google, a segurança é gerenciada pela própria Google. Se entrar por link enviado por e-mail, mantenha sua conta de e-mail protegida, pois o acesso a ela pode permitir o acesso à sua conta do {siteName}.
          </p>
          <p>
            Nenhum método de transmissão pela internet ou armazenamento eletrônico é totalmente seguro. Embora adotemos medidas para proteger seus dados pessoais, não podemos garantir segurança absoluta. Qualquer transmissão de dados é por sua conta e risco.
          </p>
        </section>

        <section>
          <SectionHeader num={7}>Serviços de Terceiros</SectionHeader>
          <p>
            Nosso Serviço integra plataformas e serviços de terceiros, como provedores de modelos (por exemplo, OpenAI, Anthropic), provedores de análise e provedores de autenticação. Esses terceiros podem coletar e processar dados pessoais de acordo com as próprias práticas de privacidade.
          </p>
          <p>
            Esta Política de Privacidade se aplica apenas aos dados coletados pelo {siteName}. Quando você sai do nosso Site ou interage com um serviço de terceiros, os termos e a política de privacidade deles passam a valer. Recomendamos revisar essas políticas (consulte <ProviderPoliciesLink /> para os provedores de modelos).
          </p>
        </section>

        <section>
          <SectionHeader num={8}>Retenção de Dados</SectionHeader>
          <p>
            Mantemos seus dados pessoais enquanto sua conta estiver ativa ou conforme necessário para fornecer o Serviço. Se você solicitar a exclusão da conta, excluiremos seus chats e dados pessoais, sujeito a requisitos legais ou regulatórios para reter certas informações (por exemplo, para cumprir a lei, resolver disputas ou fazer cumprir nossos acordos).
          </p>
          <p>
            Quando os dados não forem mais necessários, tomaremos medidas razoáveis para excluí-los ou anonimizá-los.
          </p>
        </section>

        <section>
          <SectionHeader num={9}>Privacidade de Crianças e Elegibilidade</SectionHeader>
          <p>
            Nosso Serviço não é direcionado a crianças menores de 13 anos e não coletamos, conscientemente, dados pessoais de menores de 13. Se você tiver menos de 13 anos, não poderá usar o {siteName} nem nos fornecer dados pessoais.
          </p>
          <p>
            Se soubermos que coletamos dados de uma criança menor de 13 anos sem consentimento verificável dos pais, removeremos essas informações o mais rápido possível.
          </p>
          <p>Você só pode usar o Serviço se:</p>
          <ItemList>
            <li>
              Tiver pelo menos 13 anos (ou a idade mínima exigida em seu país para consentir com o tratamento de dados); e
            </li>
            <li>
              Se tiver menos de 18 anos, contar com a autorização de um responsável legal.
            </li>
          </ItemList>
          <p>
            Ao usar o {siteName}, você declara e garante que atende a esses requisitos. Se descobrirmos que alguém não atende a esses critérios, poderemos encerrar ou suspender o acesso ao Serviço.
          </p>
        </section>

        <section>
          <SectionHeader num={10}>Transferências Internacionais de Dados</SectionHeader>
          <p>
            O {siteName} opera globalmente e pode transferir suas informações para países diferentes do seu, inclusive para os Estados Unidos. Quando transferimos dados, tomamos medidas para garantir que as proteções adequadas estejam em vigor, como cláusulas contratuais padrão ou outras salvaguardas reconhecidas pela legislação aplicável.
          </p>
        </section>

        <section>
          <SectionHeader num={11}>Legislação Aplicável</SectionHeader>
          <p>
            Esta Política de Privacidade e qualquer disputa ou reivindicação relacionada a ela serão regidas e interpretadas de acordo com as leis do <strong>Estado de Delaware, Estados Unidos</strong>, independentemente de conflitos de princípios legais.
          </p>
        </section>

        <section>
          <SectionHeader num={12}>
            Divulgação Adicional para UE/EEE e Leis Estaduais dos EUA
          </SectionHeader>
          <p>
            Determinadas leis de privacidade, incluindo o RGPD (para usuários no Espaço Econômico Europeu e Reino Unido) e leis estaduais dos Estados Unidos (como a Lei de Privacidade do Consumidor da Califórnia, ou "CCPA"), exigem divulgações adicionais:
          </p>
          <p>
            <strong>Categorias de informações coletadas</strong>: coletamos identificadores (como nome, e-mail e endereço IP), dados de conta/perfil que você optar por fornecer, histórico de chats, dados de uso e informações técnicas sobre seu dispositivo e navegador.
          </p>
          <p>
            <strong>Finalidades de uso</strong>: utilizamos esses dados para operar e fornecer o Serviço (contrato), manter a segurança e prevenir abusos (interesse legítimo e obrigação legal), melhorar o Serviço (interesse legítimo) e nos comunicar com você (consentimento ou contrato, conforme o contexto).
          </p>
          <p>
            <strong>Compartilhamento de informações</strong>: compartilhamos dados apenas com prestadores de serviço que processam informações em nosso nome, provedores de modelos (veja <ProviderPoliciesLink />) ou quando exigido por lei. Não vendemos dados pessoais.
          </p>
          <p>
            Para mais detalhes, consulte as seções acima sobre{" "}
            <a href="#1" className="underline">
              Informações que Coletamos
            </a>
            ,{" "}
            <a href="#3" className="underline">
              Como Usamos Suas Informações
            </a>
            {" "}e{" "}
            <a href="#4" className="underline">
              Como Compartilhamos Suas Informações
            </a>
            .
          </p>
        </section>

        <hr className="my-8" />

        <section id="provider-policies">
          <SectionHeader num={null}>
            Apêndice: Políticas dos Provedores de LLM
          </SectionHeader>
          <p>
            O {siteName} conecta você a modelos de linguagem de grande porte ("LLMs") operados por provedores terceirizados. Esses provedores podem processar suas entradas e saídas conforme as próprias práticas de privacidade e termos de uso, o que pode incluir o uso de dados para treinamento de modelos ou outras finalidades.
          </p>
          <p>
            Fazemos o possível para destacar quando isso pode acontecer, mas, em última análise, você é responsável por revisar e compreender as políticas de privacidade e termos de uso de cada provedor. Os avisos do {siteName} são fornecidos apenas para conveniência e não devem ser considerados declarações oficiais das políticas de um provedor.
          </p>
          <p>
            A seguir estão os links para as políticas de privacidade e termos de uso dos provedores disponíveis por meio do nosso Serviço:
          </p>
          <ItemList>
            {providersPrivacy.map((provider) => (
              <ProviderPolicyItem key={provider.id} provider={provider} />
            ))}
          </ItemList>
        </section>
      </main>
    </article>
  );
};

export default PrivacyPagePtBR;

function ProviderPolicyItem({
  provider: { name, privacyPolicyUrl },
}: {
  provider: ProviderPrivacyInfo;
}) {
  return (
    <li>
      {name}
      {": "}
      {privacyPolicyUrl ? (
        <a
          className="underline"
          href={privacyPolicyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {privacyPolicyUrl}
        </a>
      ) : (
        "Em breve"
      )}
    </li>
  );
}

function ProviderPoliciesLink() {
  return (
    <a href="#provider-policies" className="underline">
      Políticas dos Provedores
    </a>
  );
}
