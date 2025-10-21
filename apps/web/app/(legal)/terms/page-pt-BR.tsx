import type { Metadata, NextPage } from "next";

import { siteDomain, siteName } from "@/lib/branding";
import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { ItemList, SectionHeader, SectionSubheader } from "../text";

const title = `Termos de Serviço | ${siteName}`;

export const metadata: Metadata = {
  title,
  description: `Leia os termos de serviço do ${siteName} para entender seus direitos e responsabilidades ao usar nossa plataforma de chat com IA.`,
  keywords: [
    "termos de serviço",
    "termos e condições",
    `termos do ${siteName}`,
    "acordo do usuário",
    "condições de uso",
  ],
  openGraph: {
    title,
    description: `Leia os termos de serviço do ${siteName} para entender seus direitos e responsabilidades.`,
    type: "website",
    url: "/terms",
  },
};

const TermsPagePtBR: NextPage = () => {
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
          Termos de Serviço
        </h1>
        <p className="text-muted-foreground italic">
          Última atualização: 21 de outubro de 2025
        </p>
      </header>

      <main className="[&>section>p]:mt-3">
        <section>
          <SectionHeader num={1}>
            Introdução e Aceitação dos Termos
          </SectionHeader>
          <p>
            Estes Termos de Uso (<strong>"Termos"</strong>) regem o seu acesso e
            uso do site e dos serviços do {nameFull} (coletivamente, o{" "}
            <strong>"Serviço"</strong>), operados pela{" "}
            <strong>AI Tech LLC</strong>, uma empresa de responsabilidade limitada
            da Flórida (<strong>"{nameFull}"</strong>, <strong>"nós"</strong>,{" "}
            <strong>"nosso"</strong> ou <strong>"nos"</strong>).
          </p>
          <p>
            Ao acessar ou utilizar o Serviço, você concorda em ficar vinculado a
            estes Termos e à nossa{" "}
            <Link href="/privacy" className="underline">
              Política de Privacidade
              <ArrowUpRightIcon className="inline size-3 mb-1 ml-1" />
            </Link>
            . Se você não concorda, não utilize o Serviço.
          </p>
          <p>
            O {nameFull} oferece uma interface para interagir com modelos de
            linguagem de terceiros (LLMs), como os fornecidos pela OpenAI,
            Anthropic, xAI e outros (cada um, um{" "}
            <strong>Provedor de Modelo</strong>). O {nameFull} não cria nem
            controla esses modelos. As respostas e demais resultados que você
            recebe por meio do Serviço (<strong>Resultados de Modelo</strong>) são
            gerados pelos Provedores de Modelo subjacentes e não pelo {nameFull}.
          </p>
          <p>
            Podemos atualizar estes Termos periodicamente, publicando uma versão
            revisada nesta página e atualizando a data de "última atualização".
            O uso contínuo do Serviço após quaisquer alterações significa que você
            aceita os Termos revisados.
          </p>
        </section>

        <section>
          <SectionHeader num={2}>Elegibilidade e Contas</SectionHeader>
          <p>
            Você deve ter pelo menos <strong>18 anos</strong> (ou a idade de
            maioridade legal em sua jurisdição) para utilizar o Serviço. Ao usar o{" "}
            {siteName}, você declara que atende a esse requisito.
          </p>
          <p>
            Você pode utilizar o Serviço <strong>sem criar uma conta</strong>, caso
            em que determinados recursos e limites de uso serão aplicados. Para
            acessar recursos adicionais ou limites mais altos, você pode criar uma
            conta fornecendo informações precisas e completas. Você é responsável
            por manter a confidencialidade das credenciais de sua conta e por toda
            atividade realizada nela.
          </p>
          <p>
            Se você criar uma conta em nome de uma organização, declara e garante
            que possui autoridade para vincular essa organização a estes Termos.
          </p>
          <p>
            Podemos suspender ou encerrar sua conta se acreditarmos que você
            violou estes Termos, fez uso indevido do Serviço ou forneceu
            informações falsas.
          </p>
        </section>

        <section>
          <SectionHeader num={3}>Uso do Serviço</SectionHeader>
          <p>
            O {siteName} permite que você interaja com modelos de linguagem de
            vários provedores por meio de uma interface unificada. Você só pode
            usar o Serviço para fins legais e de acordo com estes Termos.
          </p>
          <p>Aplicam-se diferentes níveis de uso conforme o status da sua conta:</p>
          <table className="w-full border-collapse border border-gray-300 my-4">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                  Tipo de usuário
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                  Limite diário de mensagens
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                  Acesso aos modelos
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                  Observações
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-semibold">
                  Usuários anônimos
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  Até <strong>20 mensagens por dia</strong>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  Apenas modelos públicos
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  Cada modelo consultado conta separadamente para o limite.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-semibold">
                  Usuários registrados (logados)
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  Até <strong>60 mensagens por dia</strong>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  Inclui modelos "incluídos"
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  Alguns modelos permanecem restritos a usuários pagos.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-semibold">
                  Usuários pagantes
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  Uso diário ilimitado (sujeito a{" "}
                  <strong>limites mensais justos</strong>)
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  Todos os modelos "incluídos" e "premium"
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  Limites específicos e preços podem variar conforme o plano.
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            Podemos alterar esses limites, adicionar novos planos ou introduzir
            restrições e recursos adicionais a qualquer momento. O uso contínuo do
            Serviço após tais mudanças constitui aceitação dessas alterações.
          </p>
          <p>
            A disponibilidade de modelos e recursos específicos, incluindo quais
            modelos são categorizados como "incluídos", "premium" ou "gratuitos",
            está descrita em nossa{" "}
            <Link href="/models" className="underline font-semibold">
              Página de Acesso a Modelos
              <ArrowUpRightIcon className="inline size-3 mb-1 ml-1" />
            </Link>
            . Essas informações são fornecidas para conveniência e podem mudar a
            qualquer momento, sem aviso prévio. Atualizações na disponibilidade de
            modelos ou nos níveis de acesso não constituem uma alteração destes
            Termos.
          </p>
        </section>

        <section>
          <SectionHeader num={4}>Política de Uso Aceitável</SectionHeader>
          <p>
            Você concorda em utilizar o {siteName} de forma responsável e apenas
            para fins legais. Você não pode:
          </p>
          <ItemList>
            <li>
              Utilizar o Serviço de qualquer forma que viole leis ou regulamentos
              aplicáveis.
            </li>
            <li>
              Usar, compartilhar ou gerar conteúdo que seja nocivo, enganoso,
              difamatório, assediante ou que infrinja direitos de terceiros.
            </li>
            <li>
              Tentar obter acesso não autorizado ao Serviço ou aos seus sistemas
              subjacentes.
            </li>
            <li>
              Interferir ou interromper o Serviço, inclusive por meios
              automatizados, como scraping ou envios em massa.
            </li>
            <li>
              Tentar contornar limites de uso, controles de acesso ou sistemas de
              cobrança.
            </li>
            <li>
              Utilizar o Serviço de forma que viole os termos ou políticas dos
              Provedores de Modelo acessíveis pelo {siteName}.
            </li>
            <li>
              Usar o Serviço de maneira que possa prejudicar o {siteName}, outros
              usuários ou qualquer Provedor de Modelo.
            </li>
          </ItemList>
          <p>
            Podemos suspender ou encerrar seu acesso se acreditarmos que você
            violou esta política.
          </p>
        </section>

        <section>
          <SectionHeader num={5}>Modelos e Conteúdos de Terceiros</SectionHeader>
          <p>
            O {siteName} conecta você a modelos de linguagem e outros serviços
            operados por <strong>provedores de modelos independentes</strong>,
            incluindo, sem limitação, OpenAI, Anthropic e xAI. O {siteName} não
            cria, controla ou revisa o conteúdo ou o comportamento desses modelos.
          </p>
          <p>
            Todas as respostas, textos ou outros materiais que você recebe por meio
            do Serviço (<strong>Resultados de Modelo</strong>) são gerados por
            esses provedores terceirizados.{" "}
            <strong>
              O {siteName} não garante que qualquer Resultado de Modelo seja
              preciso, confiável, seguro ou adequado a qualquer finalidade.
            </strong>{" "}
            Você não deve confiar nos Resultados de Modelo sem verificação
            independente.
          </p>
          <p>
            Cada provedor pode ter seus próprios termos de uso e políticas. Ao usar
            o {siteName}, você concorda em cumprir esses termos sempre que acessar
            seus modelos pela nossa plataforma. O {siteName} não é responsável por
            violações das políticas de um provedor ou por quaisquer consequências
            decorrentes do uso que você faz dos modelos deles.
          </p>
        </section>

        <section>
          <SectionHeader num={6}>Propriedade Intelectual</SectionHeader>

          <SectionSubheader>Materiais do Vibezone</SectionSubheader>
          <p>
            Todo o software, design, texto, imagens, logotipos e demais materiais
            que compõem o Serviço do {siteName} ({" "}
            <strong>Materiais Vibezone</strong>) pertencem ou são licenciados à{" "}
            <strong>AI Tech LLC</strong>. Exceto pelo direito limitado de usar o
            Serviço conforme permitido por estes Termos, nenhum direito é
            transferido a você. Você não pode copiar, modificar, distribuir ou criar
            obras derivadas dos Materiais Vibezone sem nossa autorização prévia por
            escrito.
          </p>

          <SectionSubheader>Seu Conteúdo</SectionSubheader>
          <p>
            Você mantém todos os direitos sobre os prompts, textos, uploads e
            demais materiais que enviar por meio do Serviço ({" "}
            <strong>Conteúdo do Usuário</strong>). Ao enviar Conteúdo do Usuário,
            você concede ao {siteName} uma licença limitada, não exclusiva e
            mundial para processar e transmitir esse conteúdo conforme necessário
            para operar o Serviço e entregar Resultados de Modelo a você.
          </p>

          <SectionSubheader>Resultados de Modelo</SectionSubheader>
          <p>
            As respostas e outros conteúdos gerados pelo Serviço ({" "}
            <strong>Resultados de Modelo</strong>) são produzidos por provedores de
            modelos terceirizados como OpenAI, Anthropic e xAI. Sujeito aos termos e
            políticas aplicáveis de cada provedor,{" "}
            <strong>
              você é o proprietário ou licenciado para utilizar os Resultados de
              Modelo
            </strong>{" "}
            na mesma medida em que seria se os tivesse obtido diretamente desse
            provedor. O {siteName} não reivindica propriedade sobre os Resultados de
            Modelo e se isenta de quaisquer garantias quanto à originalidade,
            precisão ou adequação a qualquer finalidade.
          </p>

          <SectionSubheader>Direitos de Terceiros</SectionSubheader>
          <p>
            Nada nestes Termos transfere quaisquer direitos de propriedade
            intelectual dos provedores de modelos ou de terceiros. Você é
            responsável por assegurar que o uso que faz de qualquer Resultado de
            Modelo esteja em conformidade com todas as leis e direitos de terceiros,
            incluindo leis de direitos autorais e privacidade.
          </p>
        </section>

        <section>
          <SectionHeader num={7}>Taxas e Pagamentos</SectionHeader>
          <p>
            O {siteName} pode oferecer planos de assinatura ou níveis de uso pagos
            ({" "}
            <strong>Planos Pagos</strong>) que proporcionam limites maiores de
            mensagens ou acesso a modelos e recursos adicionais. Os preços, limites e
            recursos disponíveis para cada plano serão descritos em nosso site ou
            dentro do Serviço.
          </p>
          <p>
            Todos os pagamentos são processados com segurança pela{" "}
            <strong>Stripe, Inc.</strong> ou suas afiliadas. Ao adquirir um Plano
            Pago, você autoriza o {siteName} e a Stripe a cobrarem o método de
            pagamento informado pelos valores, tributos e cobranças recorrentes (se
            houver). Você deve manter suas informações de pagamento atualizadas e
            corretas.
          </p>
          <p>
            As taxas são <strong>não reembolsáveis</strong>, exceto quando exigido
            por lei. Salvo indicação em contrário, as assinaturas são renovadas
            automaticamente ao final de cada período de cobrança, com o valor vigente
            à época, até que você cancele. Você pode cancelar a qualquer momento nas
            configurações da conta; o cancelamento passa a valer ao final do ciclo de
            cobrança em vigor.
          </p>
          <p>
            Podemos alterar nossos preços, estrutura de cobrança ou planos
            disponíveis a qualquer momento. Quaisquer mudanças serão aplicadas a
            novas assinaturas ou renovações após a data de vigência. Impostos (incluindo
            IVA ou tributos sobre vendas, quando aplicável) podem ser adicionados às
            cobranças com base no endereço de cobrança informado.
          </p>
          <p>
            O {siteName} não é responsável por erros, atrasos ou problemas de
            segurança causados por processadores de pagamento de terceiros. O uso que
            você faz dos serviços da Stripe também está sujeito aos{" "}
            <strong>termos e à política de privacidade da própria Stripe.</strong>
          </p>
        </section>

        <section>
          <SectionHeader num={8}>Encerramento e Suspensão</SectionHeader>
          <p>
            Você pode parar de usar o {siteName} a qualquer momento encerrando sua
            conta ou deixando de utilizar o Serviço.
          </p>
          <p>
            Podemos suspender ou encerrar seu acesso ao Serviço, com ou sem aviso,
            se acreditarmos que:
          </p>
          <ItemList>
            <li>você violou estes Termos ou a legislação aplicável;</li>
            <li>
              seu uso pode prejudicar o {siteName}, outros usuários ou um provedor
              de modelo; ou
            </li>
            <li>
              a continuidade do acesso deixou de ser comercial ou tecnicamente
              viável.
            </li>
          </ItemList>
          <p>
            Após o encerramento, seu direito de usar o Serviço terminará
            imediatamente, e poderemos excluir ou desabilitar o acesso à sua conta e
            aos dados associados. O {siteName} não é obrigado a manter ou fornecer
            acesso a quaisquer dados após o encerramento, exceto quando exigido por
            lei.
          </p>
        </section>

        <section>
          <SectionHeader num={9}>Isenção de Garantias</SectionHeader>
          <p>
            O Serviço e todos os Resultados de Modelo são fornecidos{" "}
            <strong>"no estado em que se encontram" e "conforme disponíveis"</strong>
            , sem garantias de qualquer tipo, expressas ou implícitas, incluindo
            garantias de precisão, confiabilidade, adequação a uma finalidade
            específica ou ausência de infrações.
          </p>
          <p>
            Você entende que o uso de IA generativa envolve riscos e incertezas
            inerentes, incluindo a possibilidade de que os Resultados de Modelo
            possam ser imprecisos, incompletos ou inadequados. Esse é o consenso
            geral do setor, e o {siteName} não pode garantir a qualidade ou a
            confiabilidade de qualquer conteúdo gerado.
          </p>
          <p>
            Para mais informações sobre as capacidades e limitações dos modelos
            individuais, recomendamos revisar a documentação e os avisos publicados
            pelos respectivos provedores (como OpenAI, Anthropic ou xAI).
          </p>
        </section>

        <section>
          <SectionHeader num={10}>Limitação de Responsabilidade</SectionHeader>
          <p>
            Na máxima medida permitida por lei,{" "}
            <strong>
              o {siteName} e suas afiliadas, diretores, funcionários e agentes
            </strong>{" "}
            não serão responsáveis por danos indiretos, incidentais, especiais,
            consequenciais ou punitivos, nem por perda de lucros, dados ou fundo de
            comércio, decorrentes do uso do Serviço ou de quaisquer Resultados de
            Modelo, mesmo que tenhamos sido alertados sobre a possibilidade de tais
            danos.
          </p>
          <p>
            Nossa responsabilidade total por todas as reivindicações relacionadas ao
            Serviço não excederá o maior valor entre{" "}
            <strong>
              (a) o montante pago por você ao {siteName} pelo acesso ao Serviço nos
              três (3) meses anteriores ao evento que deu origem à reivindicação, ou
              (b) cem dólares dos Estados Unidos (US$ 100)
            </strong>
            .
          </p>
          <p>
            Essas limitações se aplicam independentemente da teoria jurídica em que a
            reivindicação se baseia e mesmo que qualquer recurso deixe de cumprir sua
            finalidade essencial.
          </p>
        </section>

        <section>
          <SectionHeader num={11}>Indenização</SectionHeader>
          <p>
            Você concorda em <strong>defender, indenizar e isentar de
            responsabilidade</strong> o {siteName}, suas afiliadas, diretores,
            funcionários e agentes de quaisquer reivindicações, responsabilidades,
            danos, perdas e despesas (incluindo honorários advocatícios razoáveis)
            decorrentes de ou relacionados a:
          </p>
          <ItemList>
            <li>seu uso do Serviço ou de qualquer Resultado de Modelo;</li>
            <li>
              sua violação destes Termos ou de qualquer lei, regulamento ou direito
              de terceiros; ou
            </li>
            <li>
              qualquer disputa entre você e um terceiro resultante de sua conduta ou
              conteúdo.
            </li>
          </ItemList>
          <p>
            O {siteName} reserva-se o direito de assumir o controle exclusivo de
            qualquer questão sujeita à indenização por você, caso em que você
            concorda em cooperar conosco na apresentação das defesas cabíveis.
          </p>
        </section>

        <section>
          <SectionHeader num={12}>
            Resolução de Disputas e Lei Aplicável
          </SectionHeader>
          <p>
            Estes Termos e qualquer disputa ou reivindicação deles decorrente ou a
            eles relacionada serão regidos e interpretados de acordo com as leis do{" "}
            <strong>Estado de Delaware, Estados Unidos</strong>, sem considerar seus
            princípios de conflito de leis.
          </p>

          <SectionSubheader>Resolução Informal</SectionSubheader>
          <p>
            Antes de iniciar procedimentos formais, você concorda em tentar resolver
            qualquer disputa informalmente, entrando em contato conosco pelo email{" "}
            <a href={`mailto:${supportEmail}`} className="underline">
              {supportEmail}
            </a>
            . Tentaremos solucionar a disputa dentro de{" "}
            <strong>30 dias</strong> a partir do recebimento do seu email. Se não
            conseguirmos resolver nesse período, você ou o {siteName} poderão iniciar
            arbitragem conforme descrito abaixo.
          </p>

          <SectionSubheader>Arbitragem Vinculante</SectionSubheader>
          <p>
            Qualquer disputa, reivindicação ou controvérsia decorrente destes Termos
            ou do Serviço que não possa ser resolvida informalmente será resolvida
            <strong>exclusivamente por arbitragem vinculante</strong>, administrada
            pela{" "}
            <strong>American Arbitration Association (AAA)</strong> de acordo com as{" "}
            <strong>Regras de Arbitragem Comercial</strong> então vigentes. A
            arbitragem será conduzida em <strong>inglês</strong>, por um único árbitro,
            em <strong>Delaware, Estados Unidos</strong>, ou por videoconferência, se a
            participação presencial for impraticável. A decisão do árbitro será final
            e vinculante, e a sentença poderá ser registrada em qualquer tribunal com
            jurisdição competente.
          </p>

          <SectionSubheader>Renúncia a Ações Coletivas</SectionSubheader>
          <p>
            Você e o {siteName} concordam que todas as disputas serão conduzidas{" "}
            <strong>apenas de forma individual</strong>, e não em ações coletivas,
            consolidadas ou representativas. Você não pode participar como membro ou
            representante de classe em qualquer processo dessa natureza.
          </p>

          <SectionSubheader>Opção de Exclusão</SectionSubheader>
          <p>
            Se não desejar ficar vinculado às disposições de arbitragem e renúncia a
            ações coletivas, você pode optar pela exclusão enviando notificação
            escrita para{" "}
            <a href={`mailto:${supportEmail}`} className="underline">
              {supportEmail}
            </a>{" "}
            dentro de <strong>30 dias</strong> a partir da primeira aceitação destes
            Termos. Sua opção de exclusão não afetará outras disposições destes
            Termos.
          </p>
        </section>

        <section>
          <SectionHeader num={13}>
            Alterações, Contato e Políticas dos Provedores
          </SectionHeader>

          <SectionSubheader>Alterações a Estes Termos</SectionSubheader>
          <p>
            Podemos atualizar estes Termos periodicamente. Quando isso acontecer,
            publicaremos a versão revisada nesta página e atualizaremos a data de
            "última atualização". As alterações entram em vigor quando publicadas. O
            uso contínuo do Serviço após quaisquer mudanças significa que você aceita
            os Termos revisados.
          </p>

          <SectionSubheader>Contato</SectionSubheader>
          <p>
            Se tiver dúvidas sobre estes Termos ou sobre o Serviço, entre em contato
            conosco em:
          </p>
          <p className="mt-2">
            <strong>AI Tech LLC</strong>
            <br />
            Email:{" "}
            <a href={`mailto:${supportEmail}`} className="underline">
              {supportEmail}
            </a>
            <br />
            Website:{" "}
            <a
              href={`https://www.${siteDomain}`}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.{siteDomain}
            </a>
          </p>

          <SectionSubheader>Políticas dos Provedores</SectionSubheader>
          <p>
            O {siteName} conecta você a modelos operados por provedores terceiros. O
            uso que você faz desses modelos também está sujeito aos termos e
            políticas dos respectivos provedores.
          </p>
          <p>
            Tais políticas podem mudar independentemente do {siteName}. Você é
            responsável por revisá-las e cumpri-las sempre que utilizar os modelos
            correspondentes.
          </p>
        </section>
      </main>
    </article>
  );
};

export default TermsPagePtBR;
