import DonationStatusCard from "@/components/DonationStatusCard";

export default async function DonateSuccessPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tx_ref?: string; status_token?: string }>;
}) {
  const { locale } = await params;
  const { tx_ref, status_token } = await searchParams;

  return <DonationStatusCard locale={locale} txRef={tx_ref ?? null} statusToken={status_token ?? null} />;
}
