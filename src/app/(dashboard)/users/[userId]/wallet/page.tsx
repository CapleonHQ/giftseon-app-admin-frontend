import WalletPageClient from '@/components/Dashboard/WalletPageClient'

export const metadata = { title: 'User Wallet' }

interface Props {
  params: Promise<{ userId: string }>
}

export default async function WalletPage({ params }: Props) {
  const { userId } = await params
  return <WalletPageClient userId={userId} />
}
