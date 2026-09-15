import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Soraia Fernandes" },
      { name: "description", content: "Como a Soraia Fernandes coleta, usa e protege seus dados pessoais. Política de privacidade em conformidade com a LGPD." },
      { property: "og:title", content: "Política de Privacidade — Soraia Fernandes" },
      { property: "og:description", content: "Transparência sobre coleta de dados, cookies, Google Analytics, Meta Pixel, WhatsApp e newsletter." },
      { property: "og:url", content: "https://www.soraiafernandes.com.br/privacidade" },
      { property: "og:type", content: "article" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://www.soraiafernandes.com.br/privacidade" }],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Política de Privacidade"
      breadcrumbs={[
        { name: "Início", href: "/" },
        { name: "Política de Privacidade", href: "/privacidade" },
      ]}
    >
      <p>A Soraia Fernandes respeita a sua privacidade. Esta política descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).</p>

      <h2>1. Dados que coletamos</h2>
      <p>Coletamos apenas as informações necessárias para atender você:</p>
      <ul>
        <li>Nome, e-mail e telefone informados em formulários, newsletter e atendimento.</li>
        <li>Dados de pedido (endereço de entrega, itens comprados) processados pela Shopify.</li>
        <li>Dados de navegação (páginas visitadas, dispositivo, origem do tráfego).</li>
      </ul>

      <h2>2. Cookies</h2>
      <p>Utilizamos cookies próprios e de terceiros para manter sua sessão, lembrar preferências e medir o desempenho do site. Você pode desativar cookies nas configurações do seu navegador.</p>

      <h2>3. Google Analytics</h2>
      <p>Usamos o Google Analytics para entender, de forma agregada e anônima, como nossos visitantes navegam. Nenhum dado pessoal identificável é compartilhado com o Google para fins de publicidade sem o seu consentimento.</p>

      <h2>4. Meta Pixel (Facebook / Instagram)</h2>
      <p>O Meta Pixel é utilizado para mensurar a eficácia das nossas campanhas e exibir anúncios relevantes nas plataformas da Meta. Você pode gerenciar suas preferências de anúncios diretamente em sua conta Facebook ou Instagram.</p>

      <h2>5. WhatsApp</h2>
      <p>Quando você inicia uma conversa pelo WhatsApp, suas mensagens são processadas pela Meta conforme a política do WhatsApp Business. Usamos seu contato apenas para responder dúvidas, enviar pedidos e atendimento pós-venda.</p>

      <h2>6. Newsletter</h2>
      <p>Ao se cadastrar, você autoriza o envio de comunicações sobre lançamentos e novidades. Você pode cancelar a inscrição a qualquer momento pelo link presente em cada e-mail.</p>

      <h2>7. Seus direitos</h2>
      <p>Conforme a LGPD, você tem direito a:</p>
      <ul>
        <li>Confirmar a existência de tratamento dos seus dados;</li>
        <li>Acessar, corrigir ou atualizar seus dados;</li>
        <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Revogar o consentimento a qualquer momento.</li>
      </ul>

      <h2>8. Contato para solicitações</h2>
      <p>Para exercer seus direitos ou esclarecer dúvidas sobre esta política, fale com a gente pelo WhatsApp ou pelo botão de atendimento ao final desta página.</p>
    </LegalPage>
  );
}
