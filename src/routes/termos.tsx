import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Soraia Fernandes" },
      { name: "description", content: "Termos e condições de uso do site e da loja online Soraia Fernandes: pedidos, pagamentos, entregas e responsabilidades." },
      { property: "og:title", content: "Termos de Uso — Soraia Fernandes" },
      { property: "og:description", content: "Regras de uso, pedidos, pagamentos e entregas da Soraia Fernandes." },
      { property: "og:url", content: "https://www.soraiafernandes.com.br/termos" },
      { property: "og:type", content: "article" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://www.soraiafernandes.com.br/termos" }],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Termos de Uso"
      breadcrumbs={[
        { name: "Início", href: "/" },
        { name: "Termos de Uso", href: "/termos" },
      ]}
    >
      <p>Ao navegar ou comprar no site da Soraia Fernandes, você concorda com os termos abaixo. Recomendamos a leitura atenta antes de finalizar qualquer compra.</p>

      <h2>1. Condições de uso</h2>
      <p>O conteúdo do site (textos, imagens, marca e fotografias) é de propriedade da Soraia Fernandes e protegido por direitos autorais. É proibida a reprodução sem autorização prévia.</p>

      <h2>2. Informações sobre pedidos</h2>
      <p>Os pedidos só são considerados confirmados após a aprovação do pagamento. Reservamo-nos o direito de cancelar pedidos com suspeita de fraude ou erro de preço evidente, com reembolso integral.</p>

      <h2>3. Responsabilidades</h2>
      <ul>
        <li>O cliente é responsável por fornecer endereço e dados de contato corretos.</li>
        <li>A Soraia Fernandes é responsável por entregar produtos em conformidade com a descrição e em embalagem adequada.</li>
      </ul>

      <h2>4. Pagamentos</h2>
      <p>Aceitamos Pix, cartões de crédito (Visa, Mastercard, Elo, Amex, Hipercard) e demais meios disponibilizados pela Shopify Checkout, com ambiente seguro e criptografado.</p>

      <h2>5. Entregas</h2>
      <p>Os prazos de entrega são estimados conforme a região e a transportadora escolhida no checkout. Eventuais atrasos por parte das transportadoras estão fora do nosso controle, mas faremos o acompanhamento até a entrega final.</p>

      <h2>6. Cancelamentos</h2>
      <p>Pedidos podem ser cancelados antes do envio, mediante contato pelo WhatsApp. Após o envio, aplica-se a política de troca e devolução.</p>

      <h2>7. Limitação de responsabilidade</h2>
      <p>A Soraia Fernandes não se responsabiliza por danos indiretos, lucros cessantes ou prejuízos decorrentes do uso indevido dos produtos. Em qualquer hipótese, a responsabilidade limita-se ao valor pago no pedido.</p>

      <h2>8. Foro</h2>
      <p>Fica eleito o foro da Comarca de Joinville/SC para dirimir quaisquer controvérsias relativas a estes Termos.</p>
    </LegalPage>
  );
}
