import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/trocas-e-devolucoes")({
  head: () => ({
    meta: [
      { title: "Trocas e Devoluções — Soraia Fernandes" },
      { name: "description", content: "Como solicitar troca ou devolução de peças compradas na Soraia Fernandes. Prazos, condições e atendimento pelo WhatsApp." },
      { property: "og:title", content: "Trocas e Devoluções — Soraia Fernandes" },
      { property: "og:description", content: "Política de trocas, devoluções e atendimento da Soraia Fernandes." },
      { property: "og:url", content: "https://www.soraiafernandes.com.br/trocas-e-devolucoes" },
      { property: "og:type", content: "article" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://www.soraiafernandes.com.br/trocas-e-devolucoes" }],
  }),
  component: TrocasPage,
});

function TrocasPage() {
  return (
    <LegalPage
      eyebrow="Atendimento"
      title="Política de Troca e Devolução"
      breadcrumbs={[
        { name: "Início", href: "/" },
        { name: "Trocas e Devoluções", href: "/trocas-e-devolucoes" },
      ]}
    >
      <p>Queremos que você fique 100% satisfeita(o) com sua compra na Soraia Fernandes. Confira abaixo as condições, prazos e o passo a passo para solicitar troca ou devolução.</p>

      <h2>1. Arrependimento (compra online) — 7 dias corridos</h2>
      <ul>
        <li>Direito garantido pelo <strong>art. 49 do Código de Defesa do Consumidor</strong>.</li>
        <li>Válido apenas para compras feitas pelo site (não se aplica a retiradas presenciais na loja, onde o cliente já viu a peça).</li>
        <li>Prazo contado a partir do <strong>recebimento</strong> do produto.</li>
        <li>A peça deve voltar <strong>sem uso</strong>, com etiqueta, embalagem original e nota fiscal.</li>
        <li>Frete de devolução por conta da <strong>Soraia Fernandes</strong> (conforme lei).</li>
        <li>Reembolso integral: PIX estorna em até <strong>5 dias úteis</strong>; cartão conforme prazo da operadora (1 a 2 faturas).</li>
      </ul>

      <h2>2. Troca por tamanho ou cor (sem defeito) — 15 dias</h2>
      <ul>
        <li>Cortesia da Soraia Fernandes (não é obrigação legal).</li>
        <li>Peça sem uso, com etiqueta e embalagem originais.</li>
        <li>Frete de devolução por conta do cliente; reenvio da nova peça por conta da Soraia Fernandes.</li>
        <li>Troca condicionada à disponibilidade em estoque. Se não houver, convertemos em <strong>vale-compra válido por 90 dias</strong>.</li>
      </ul>

      <h2>3. Defeito de fabricação — 30 dias</h2>
      <ul>
        <li>Prazo previsto no <strong>art. 26 do CDC</strong> (produto não durável).</li>
        <li>Cliente envia foto + descrição pelo WhatsApp; nossa equipe avalia em até <strong>2 dias úteis</strong>.</li>
        <li>Confirmado o defeito, o cliente escolhe: <strong>troca, conserto ou reembolso</strong>.</li>
        <li>Frete integralmente por conta da Soraia Fernandes.</li>
      </ul>

      <h2>4. Itens que não trocamos</h2>
      <ul>
        <li>Peças íntimas (bodies usados, calcinhas) por questões de higiene — somente em caso de defeito.</li>
        <li>Itens em promoção do tipo "queima de estoque", quando indicado no anúncio.</li>
        <li>Peças lavadas, usadas ou com cheiro de perfume/amaciante.</li>
      </ul>

      <h2>5. Como solicitar</h2>
      <ol>
        <li>Chame no WhatsApp <strong>(47) 98473-7077</strong> com o <strong>número do pedido</strong> e uma foto da peça.</li>
        <li>Prazo de resposta: <strong>1 dia útil</strong>.</li>
        <li>Após recebermos e conferirmos a peça, processamos a troca, o vale-compra ou o estorno.</li>
      </ol>
    </LegalPage>
  );
}
