import type { Metadata } from "next";
import { listRestaurants } from "@/lib/repo/restaurants";
import { LegalLayout, ToComplete } from "@/components/site/LegalLayout";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site La Roma Pizza.",
  alternates: { canonical: "/mentions-legales" },
};

export const revalidate = 3600;

export default async function LegalPage() {
  const restaurants = await listRestaurants();

  return (
    <LegalLayout title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        Le présent site est édité par <ToComplete>[raison sociale]</ToComplete>, exploitant les
        pizzerias La Roma Pizza, <ToComplete>[forme juridique]</ToComplete> au capital
        de <ToComplete>[montant]</ToComplete>, dont le siège social est
        situé <ToComplete>[adresse du siège]</ToComplete>.
      </p>
      <ul>
        <li>SIRET : <ToComplete>[numéro SIRET]</ToComplete></li>
        <li>RCS : <ToComplete>[ville et numéro RCS]</ToComplete></li>
        <li>TVA intracommunautaire : <ToComplete>[numéro de TVA]</ToComplete></li>
        <li>Directeur de la publication : <ToComplete>[nom du responsable]</ToComplete></li>
        <li>Contact : <ToComplete>[adresse e-mail de contact]</ToComplete></li>
      </ul>

      <h2>Nos établissements</h2>
      <ul>
        {restaurants.map((r) => (
          <li key={r.id}>
            <strong>{r.name}</strong> — {r.street}, {r.postal_code} {r.city} — {r.phone}
          </li>
        ))}
      </ul>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par <ToComplete>[nom de l&apos;hébergeur]</ToComplete>,
        <ToComplete>[adresse de l&apos;hébergeur]</ToComplete>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des éléments de ce site — marque La Roma Pizza, logo, textes,
        photographies et présentation de la carte — est protégé par le droit de la
        propriété intellectuelle. Toute reproduction, même partielle, est interdite
        sans autorisation écrite préalable.
      </p>

      <h2>Commandes en ligne</h2>
      <p>
        Les commandes passées sur ce site sont réglées au moment du retrait ou de la
        livraison, en espèces, par carte bancaire ou par titres restaurant, selon les
        moyens acceptés par l&apos;établissement choisi. Les prix affichés sont exprimés
        en euros, toutes taxes comprises. Les photographies de produits sont non
        contractuelles.
      </p>
      <p>
        Un établissement peut refuser une commande, notamment en cas d&apos;affluence,
        de rupture d&apos;un produit ou d&apos;adresse située hors zone de livraison.
        Le cas échéant, vous en êtes informé par téléphone.
      </p>

      <h2>Allergènes</h2>
      <p>
        Les informations relatives aux allergènes sont indiquées sur les fiches produits
        lorsqu&apos;elles sont renseignées. Nos plats étant préparés dans une cuisine
        manipulant gluten, lait, œuf, poisson, crustacés et fruits à coque, la présence
        de traces ne peut être exclue. En cas d&apos;allergie, contactez directement
        l&apos;établissement avant de commander.
      </p>

      <h2>Médiation de la consommation</h2>
      <p>
        Conformément à l&apos;article L.612-1 du Code de la consommation, vous pouvez
        recourir gratuitement au médiateur de la consommation
        <ToComplete>[nom et coordonnées du médiateur]</ToComplete> en vue de la
        résolution amiable d&apos;un litige.
      </p>
    </LegalLayout>
  );
}
