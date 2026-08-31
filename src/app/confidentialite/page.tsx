import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, ToComplete } from "@/components/site/LegalLayout";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment La Roma Pizza traite vos données personnelles lors d'une commande en ligne.",
  alternates: { canonical: "/confidentialite" },
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <p>
        Nous ne collectons que ce qui est nécessaire pour préparer et vous remettre
        votre commande. Pas de compte à créer, pas de profilage publicitaire, aucune
        revente de données.
      </p>

      <h2>Données collectées</h2>
      <p>Lorsque vous passez commande, nous enregistrons :</p>
      <ul>
        <li>vos prénom et nom, pour identifier la commande au comptoir ;</li>
        <li>votre numéro de téléphone, pour vous joindre en cas de besoin ;</li>
        <li>votre adresse de livraison, uniquement si vous choisissez la livraison ;</li>
        <li>le contenu de votre commande, l&apos;horaire choisi et vos éventuelles instructions ;</li>
        <li>votre adresse e-mail, si vous choisissez de la renseigner — elle reste facultative.</li>
      </ul>
      <p>
        Aucune donnée bancaire n&apos;est demandée ni stockée : le paiement se fait sur
        place ou à la livraison.
      </p>

      <h2>Finalités et base légale</h2>
      <p>
        Ces données servent exclusivement à l&apos;exécution de votre commande
        (article 6.1.b du RGPD) et au respect de nos obligations comptables
        (article 6.1.c). Elles ne sont utilisées à aucune fin de prospection sans
        votre accord explicite.
      </p>

      <h2>Durée de conservation</h2>
      <ul>
        <li>Commandes et coordonnées associées : conservées le temps nécessaire au suivi, puis archivées selon les obligations comptables en vigueur.</li>
        <li>Journal technique anti-spam : quelques minutes seulement.</li>
      </ul>

      <h2>Destinataires</h2>
      <p>
        Vos données sont accessibles au personnel de l&apos;établissement où vous avez
        commandé, ainsi qu&apos;à la direction de La Roma Pizza. Elles sont hébergées
        chez <ToComplete>[nom de l&apos;hébergeur]</ToComplete>, au sein de l&apos;Union
        européenne. Elles ne sont transmises à aucun tiers à des fins commerciales.
      </p>

      <h2>Stockage sur votre appareil</h2>
      <p>
        Pour que votre panier ne disparaisse pas d&apos;une page à l&apos;autre, nous
        l&apos;enregistrons dans le stockage local de votre navigateur, avec
        l&apos;établissement choisi et, si vous avez déjà commandé, vos coordonnées
        pour vous éviter de les ressaisir. Ces informations restent sur votre appareil
        et ne nous sont transmises qu&apos;au moment où vous validez la commande.
        Vider les données du site les supprime.
      </p>
      <p>
        Le site n&apos;utilise ni cookie publicitaire, ni traceur de mesure d&apos;audience
        tiers. Aucun bandeau de consentement n&apos;est donc nécessaire.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
        de limitation et d&apos;opposition sur vos données. Pour l&apos;exercer, écrivez
        à <ToComplete>[adresse e-mail de contact]</ToComplete> ou adressez-vous
        directement à votre établissement. Vous pouvez également introduire une
        réclamation auprès de la CNIL (
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline">cnil.fr</a>).
      </p>

      <p className="pt-4">
        <Link href="/mentions-legales" className="font-semibold text-rosso-600 underline">
          Consulter les mentions légales
        </Link>
      </p>
    </LegalLayout>
  );
}
